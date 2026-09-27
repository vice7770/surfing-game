/**
 * Size report (the wave-sizes spec): runs each spot's surf zone over the size grid and the practice
 * groundswell, measures the breaking faces (H1/3, H1/10) and where the sets break, and sets them beside
 * Komar & Gaughan and Caldwell & Aucan. Each spot writes docs/research/sizes/<spot>.json, then the
 * Markdown is rebuilt from every spot's file, so spots can run in parallel processes.
 *
 *   npm run report:sizes -- --spots reef
 *   npm run report:sizes -- --spots beach --gates        (Part B: gate against docs/research/sizes/baseline/)
 *   npm run report:sizes -- --spots point --heights 3 --periods 14 --seconds 120
 *   npm run report:sizes -- --spots beach --heights 3,4 --tag big --no-practice   (one of several processes per spot)
 *   npm run report:sizes -- --summary                                            (rebuild the report and fits only)
 *
 * A process writes docs/research/sizes/<spot>[-<tag>].json; the report and the fits read every file.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { DEFAULT_PHYSICAL_SETTINGS, PRACTICE_SWELL, spreadingFor } from '../src/game/PhysicalMode';
import type { SpotName } from '../src/wave/Bathymetry';
import { SurfMeter, TAKE_OFF_BAND, type BreakingWave } from '../src/wave/SurfMeter';
import { SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { SIZE_BAND_WIDTH, SIZE_EDGE_MARGIN, SIZE_GRID, SIZE_SEA_SECONDS, sizeGates, sizeMarkdown, summariseRun, type SizeRun } from '../src/wave/sizeReport';
import { fitForecast } from '../src/wave/surfForecast';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const list = (name: string, fallback: readonly number[]) => option(name)?.split(',').map(Number) ?? [...fallback];
/** `--summary` runs nothing: it rebuilds the report and prints the fits from the files there. */
const spots = (process.argv.includes('--summary') ? [] : option('spots')?.split(',') ?? ['beach', 'point', 'reef', 'canyon']) as SpotName[];
const heights = list('heights', SIZE_GRID.heights);
const periods = list('periods', SIZE_GRID.periods);
const seconds = Number(option('seconds') ?? SIZE_SEA_SECONDS);
const gating = process.argv.includes('--gates');
const withPractice = !process.argv.includes('--no-practice');
const tag = option('tag');
const directory = 'docs/research/sizes';
/** The worker's step, s. */
const STEP = 1 / 30;

function measure(config: SurfZoneConfig, source: SizeRun['source'], heightAt: SizeRun['heightAt']): SizeRun {
  const simulation = new SurfZoneSimulation(config);
  const { solver } = simulation;
  const xMin = simulation.windowXMin + SIZE_EDGE_MARGIN;
  const xMax = simulation.windowXMin + solver.nx * solver.dx - SIZE_EDGE_MARGIN;
  const bands: { xMin: number; xMax: number }[] = [];
  for (let x = xMin; x + SIZE_BAND_WIDTH <= xMax + 1e-9; x += SIZE_BAND_WIDTH) bands.push({ xMin: x, xMax: x + SIZE_BAND_WIDTH });
  const takeOff = simulation.breakPoint();
  const faces = new SurfMeter(bands, config.peakPeriod, Infinity);
  const atTakeOff = new SurfMeter([{ xMin: takeOff.x - TAKE_OFF_BAND, xMax: takeOff.x + TAKE_OFF_BAND }], config.peakPeriod, Infinity);
  simulation.onBreak = (wave: BreakingWave) => {
    faces.add(wave);
    atTakeOff.add(wave);
  };
  let stepMs = 0;
  const steps = Math.round(seconds / STEP);
  for (let step = 0; step < steps; step += 1) {
    simulation.step(STEP);
    stepMs += simulation.lastStepMs;
  }
  return summariseRun({
    spot: config.spot, source, significantHeight: config.significantHeight, period: config.peakPeriod, heightAt,
    takeOffZ: takeOff.z, stepMs: stepMs / steps, cells: solver.nx * solver.nz,
  }, faces.waves(), atTakeOff.waves());
}

const settings = DEFAULT_PHYSICAL_SETTINGS;
const base = (spot: SpotName): Omit<SurfZoneConfig, 'significantHeight' | 'peakPeriod'> => ({
  spot, seed: 1, directionDegrees: settings.directionDegrees, spreading: spreadingFor(settings.spread), tide: 0, windSpeed: 0,
});
mkdirSync(`${directory}/baseline`, { recursive: true });
for (const spot of spots) {
  const started = Date.now();
  const runs: SizeRun[] = [];
  // Today's tank takes every swell at its edge (Part A); Part B gives the buoy's height in deep water.
  if (withPractice) runs.push(measure({ ...base(spot), ...PRACTICE_SWELL }, 'practice', 'edge'));
  for (const significantHeight of heights) {
    for (const peakPeriod of periods) {
      runs.push(measure({ ...base(spot), significantHeight, peakPeriod }, 'buoy', 'edge'));
      console.log(`${spot} Hs ${significantHeight} Tp ${peakPeriod}: H1/3 ${runs.at(-1)!.typical.toFixed(2)} m (${((Date.now() - started) / 60000).toFixed(1)} min)`);
    }
  }
  writeFileSync(`${directory}/${spot}${tag ? `-${tag}` : ''}.json`, `${JSON.stringify(runs, null, 1)}\n`);
}
const read = (folder: string): SizeRun[] => (existsSync(folder) ? readdirSync(folder).filter((name) => name.endsWith('.json'))
  .flatMap((name) => JSON.parse(readFileSync(`${folder}/${name}`, 'utf8')) as SizeRun[]) : []);
const all = read(directory);
for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
  const runs = all.filter((run) => run.spot === spot);
  // The forecast is fitted to the take-off's surf, which the game's readout measures.
  const atTakeOff = (run: SizeRun) => ({ ...run, typical: run.takeOffTypical ?? Number.NaN, sets: run.takeOffSets ?? Number.NaN });
  const buoys = runs.filter((run) => run.source === 'buoy' && run.takeOffTypical !== undefined).map(atTakeOff);
  const practice = runs.find((run) => run.source === 'practice' && run.takeOffTypical !== undefined);
  if (!buoys.length) continue;
  const fit = fitForecast(buoys);
  console.log(`${spot}: { a: ${fit.a.toFixed(4)}, sets: ${fit.sets.toFixed(3)} }${practice ? `; practice { typical: ${practice.takeOffTypical!.toFixed(2)}, sets: ${practice.takeOffSets!.toFixed(2)} }` : ''} (${buoys.length} runs at the take-off)`);
}
const gates = gating ? sizeGates(all, read(`${directory}/baseline`)) : undefined;
writeFileSync('docs/research/size-report.md', sizeMarkdown(all, gates, `npm run report:sizes -- ${process.argv.slice(2).join(' ')}`));
if (gates?.some((gate) => !gate.pass)) {
  console.log(`${gates.filter((gate) => !gate.pass).length} gate(s) fail`);
  process.exitCode = 1;
}
