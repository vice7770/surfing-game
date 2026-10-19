/**
 * The lab-straight probe (2026-10-21): scripts/crest-angle-report.ts at 4b2366e5, with the sea built exactly as the game
 * builds it (surfZoneConfigFor, the GPU tier's 64 components, on the CPU), for Surf or for the Wave Lab's buoy, and the
 * bend's p90 added. Its crest rules, lines and table are the report's.
 *
 *   npx rolldown docs/research/lab-straight-2026-10-21/crest-lab.ts -o dist/scripts/crest-lab.mjs --format esm --platform node
 *   node dist/scripts/crest-lab.mjs --spot canyon --mode surf --swell big --seconds 300 --quiet
 *   node dist/scripts/crest-lab.mjs --spot canyon --mode lab --hs 2.4 --period 14 --spread 0.5 --direction 10 --seconds 300 --quiet
 *
 * `--raw` sets ?labRawSea=1 (the lab's raw spread and direction); `--force-hs` replaces the run's height (the old caps:
 * 3 m at the Canyon, 4 m elsewhere).
 */
import { writeFileSync } from 'node:fs';
import { DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, surfZoneConfigFor, swellFor, type PhysicalSettings } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import type { SpotName } from '../../../src/wave/Bathymetry';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const numberOption = (name: string): number | undefined => (option(name) === undefined ? undefined : Number(option(name)));
const spot = (option('spot') ?? 'canyon') as SpotName;
const swellSize = (option('swell') ?? 'medium') as SwellSize;
const seed = Number(option('seed') ?? 1);
const seconds = Number(option('seconds') ?? 600);
const offset = Number(option('offset') ?? 30);
const quiet = process.argv.includes('--quiet');
applyCanyonShape(option('canyon'));

/** The worker's step, s. */
const STEP = 1 / 30;
/** Crests are followed no closer than this to the window's open along-shore edges, m. */
const EDGE_MARGIN = 20;
/** From one column to the next, a crest is looked for within this many metres of where it was. */
const TRACK_REACH = 3;
/** A crest counts at the reference column when it stands this many Hs above the still level. */
const CREST_SHARE = 0.2;
/** A crest followed along shore ends where it falls below this share of its height at the reference column. */
const LOST_SHARE = 0.35;
/** A crest followed over less than this share of the watched width gives no angle. */
const MIN_COVERAGE = 0.5;
/** Waves counted as the session's opening set run. */
const FIRST_WAVES = 3;
/** A crest's half shorter than this along shore, m, gives no angle of its own. */
const MIN_HALF_SPAN = 20;

// Scratch (lab-straight): the sea exactly as the game builds it (surfZoneConfigFor), for Surf (`--mode surf --swell big`)
// or the Wave Lab's buoy (`--mode lab --hs 2.4 --period 14 --spread 0.5 --direction 10`, `--raw` for ?labRawSea=1,
// `--force-hs` for the run's old cap). Rows from crest-angle-report.ts; adds the bend's p90.
const mode = option('mode') ?? 'surf';
if (process.argv.includes('--raw')) (globalThis as unknown as { location: { search: string } }).location = { search: '?labRawSea=1' };
const settings: PhysicalSettings = mode === 'lab'
  ? { ...DEFAULT_PHYSICAL_SETTINGS, spot, source: 'buoy', significantHeight: Number(option('hs')), peakPeriod: Number(option('period')),
    spread: Number(option('spread')), directionDegrees: Number(option('direction') ?? 10), stage: 2, compute: 'cpu', lab: true }
  : physicalSettingsFor(spot, { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
void swellFor;
const config: SurfZoneConfig = {
  ...surfZoneConfigFor(settings, seed, true), compute: 'cpu',
  ...(numberOption('force-hs') !== undefined ? { significantHeight: numberOption('force-hs')! } : {}),
};

/**
 * A crest's fit. `left` and `right` are its −x and +x halves' own angles, degrees (NaN for a half under MIN_HALF_SPAN);
 * the bend is right − left.
 */
interface Crest { line: string; t: number; angle: number; residual: number; coverage: number; height: number; left: number; right: number }

const started = Date.now();
const simulation = new SurfZoneSimulation(config);
const { solver } = simulation;
const takeOff = simulation.breakPoint();
const columnAt = (x: number) => Math.min(solver.nx - 1, Math.max(0, Math.round((x - solver.xCenters[0]) / solver.dx)));
const firstColumn = columnAt(simulation.windowXMin + EDGE_MARGIN);
const lastColumn = columnAt(simulation.windowXMin + solver.nx * solver.dx - EDGE_MARGIN);
const referenceColumn = columnAt(Math.min(solver.xCenters[lastColumn], Math.max(solver.xCenters[firstColumn], takeOff.x)));
const rowAt = (z: number) => {
  let best = 0;
  for (let row = 1; row < solver.nz; row += 1) if (Math.abs(solver.zCenters[row] - z) < Math.abs(solver.zCenters[best] - z)) best = row;
  return best;
};
const still = config.tide;
const surface = (row: number, column: number) => {
  const i = row * solver.nx + column;
  return solver.h[i] > 0.01 ? solver.surfaceAt(i) : Number.NEGATIVE_INFINITY;
};

/** The crest's z in a column: the highest surface within `reach` m of `near`, refined by a parabola through its rows. */
function crestIn(column: number, near: number, reach: number): { z: number; eta: number } | undefined {
  let best = -1;
  let bestEta = Number.NEGATIVE_INFINITY;
  for (let row = 1; row < solver.nz - 1; row += 1) {
    if (Math.abs(solver.zCenters[row] - near) > reach) continue;
    const eta = surface(row, column);
    if (eta > bestEta) {
      best = row;
      bestEta = eta;
    }
  }
  if (best < 0 || !Number.isFinite(bestEta)) return undefined;
  const a = surface(best - 1, column);
  const c = surface(best + 1, column);
  if (!Number.isFinite(a) || !Number.isFinite(c)) return { z: solver.zCenters[best], eta: bestEta };
  const denominator = a - 2 * bestEta + c;
  const shift = denominator < 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / denominator)) : 0;
  const spacing = shift >= 0 ? solver.zCenters[best + 1] - solver.zCenters[best] : solver.zCenters[best] - solver.zCenters[best - 1];
  return { z: solver.zCenters[best] + shift * spacing, eta: bestEta };
}

/** Follow a crest from the reference column toward both edges, then fit z = a + b x; 'short' when it ends too soon. */
function fitCrest(line: string, z: number): Crest | 'short' | undefined {
  const start = crestIn(referenceColumn, z, 4);
  if (!start) return undefined;
  const points: { x: number; z: number }[] = [{ x: solver.xCenters[referenceColumn], z: start.z }];
  for (const step of [-1, 1]) {
    let near = start.z;
    for (let column = referenceColumn + step; column >= firstColumn && column <= lastColumn; column += step) {
      const crest = crestIn(column, near, TRACK_REACH);
      if (!crest || crest.eta - still < LOST_SHARE * (start.eta - still)) break;
      points.push({ x: solver.xCenters[column], z: crest.z });
      near = crest.z;
    }
  }
  const coverage = (points.length - 1) / (lastColumn - firstColumn);
  if (coverage < MIN_COVERAGE) return 'short';
  const n = points.length;
  const { slope, mx, mz } = lineFit(points);
  const residual = Math.sqrt(points.reduce((sum, p) => sum + (p.z - (mz + slope * (p.x - mx))) ** 2, 0) / n);
  // The halves: the points sorted along shore, split at the middle one (which both share).
  points.sort((a, b) => a.x - b.x);
  const middle = Math.floor(n / 2);
  const halfAngle = (half: { x: number; z: number }[]) => (half[half.length - 1].x - half[0].x < MIN_HALF_SPAN
    ? Number.NaN
    : (Math.atan(lineFit(half).slope) * 180) / Math.PI);
  return {
    line, t: simulation.seaTime, angle: (Math.atan(slope) * 180) / Math.PI, residual, coverage, height: start.eta - still,
    left: halfAngle(points.slice(0, middle + 1)), right: halfAngle(points.slice(middle)),
  };
}

/** The least-squares line z = mz + slope (x − mx) through the points. */
function lineFit(points: readonly { x: number; z: number }[]): { slope: number; mx: number; mz: number } {
  const n = points.length;
  const mx = points.reduce((sum, p) => sum + p.x, 0) / n;
  const mz = points.reduce((sum, p) => sum + p.z, 0) / n;
  let sxx = 0;
  let sxz = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxz += (p.x - mx) * (p.z - mz);
  }
  return { slope: sxz / sxx, mx, mz };
}

/** A watched line: a crest passes when the reference column's surface there peaks in time above the crest share. */
class Watch {
  readonly row: number;
  private readonly history: number[] = [];
  private lastCrest = Number.NEGATIVE_INFINITY;
  /** Crests that passed the reference column but were followed over less than MIN_COVERAGE of the watched width. */
  short = 0;
  constructor(readonly name: string, readonly z: number) {
    this.row = rowAt(z);
  }

  sample(crests: Crest[]): void {
    this.history.push(surface(this.row, referenceColumn));
    if (this.history.length > 3) this.history.shift();
    if (this.history.length < 3) return;
    const [a, b, c] = this.history;
    const t = simulation.seaTime;
    if (!(b > a && b >= c && b - still > CREST_SHARE * config.significantHeight)) return;
    if (t - this.lastCrest < 0.4 * config.peakPeriod) return;
    this.lastCrest = t;
    const crest = fitCrest(this.name, solver.zCenters[this.row]);
    if (crest === 'short') this.short += 1;
    if (!crest || crest === 'short') return;
    crests.push(crest);
    if (!quiet) {
      console.log(`  ${crest.line.padEnd(8)} t ${crest.t.toFixed(1).padStart(6)} s  angle ${crest.angle.toFixed(1).padStart(6)}°  `
        + `straightness ${crest.residual.toFixed(2)} m  coverage ${(100 * crest.coverage).toFixed(0)}%  η ${crest.height.toFixed(2)} m  `
        + `halves ${crest.left.toFixed(1)}° / ${crest.right.toFixed(1)}°`);
    }
  }
}

const watches = [new Watch('edge', simulation.tank.fineFrom + 5), new Watch('take-off', takeOff.z - offset)];
console.log(`Crest angles: ${spot}, ${mode === 'lab' ? `lab${process.argv.includes('--raw') ? ' raw' : ''} spread ${option('spread')}` : swellSize} (Hs ${config.significantHeight} m, Tp ${config.peakPeriod} s, ${config.directionDegrees}°, s ${config.spreading.toFixed(0)}), `
  + `seed ${seed}, ${config.componentCount} components, ${seconds} s. Take-off (${takeOff.x.toFixed(0)}, ${takeOff.z.toFixed(0)}); `
  + `lines z = ${watches.map((w) => solver.zCenters[w.row].toFixed(0)).join(', ')}; crests followed over x ${solver.xCenters[firstColumn].toFixed(0)}…${solver.xCenters[lastColumn].toFixed(0)}.`);

const crests: Crest[] = [];
const start = simulation.seaTime;
const steps = Math.round(seconds / STEP);
for (let step = 0; step < steps; step += 1) {
  simulation.step(STEP);
  for (const watch of watches) watch.sample(crests);
}

const mean = (values: number[]) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : Number.NaN);
const std = (values: number[]) => Math.sqrt(mean(values.map((v) => (v - mean(values)) ** 2)));
interface Summary {
  line: string; crests: number; short: number; meanAngle: number; meanAbs: number; maxAbs: number; std: number;
  firstAbs: number; laterAbs: number; straightness: number;
  /** Over the crests whose halves both gave an angle: how many, and their bend's mean and largest |right − left|, degrees. */
  halved: number; meanBend: number; maxBend: number;
  /** Each 100 s: the crests' mean |angle| and mean angle (signed), degrees. */
  bins: { from: number; meanAbs: number; mean: number; crests: number }[];
}
const p90s: number[] = [];
const summaries: Summary[] = watches.map(({ name, short }) => {
  const mine = crests.filter((crest) => crest.line === name);
  const angles = mine.map((crest) => crest.angle);
  const abs = angles.map(Math.abs);
  const bins: Summary['bins'] = [];
  for (let from = 0; from < seconds; from += 100) {
    const binned = mine.filter((crest) => crest.t - start >= from && crest.t - start < from + 100).map((crest) => crest.angle);
    bins.push({ from, meanAbs: mean(binned.map(Math.abs)), mean: mean(binned), crests: binned.length });
  }
  const bends = mine.map((crest) => Math.abs(crest.right - crest.left)).filter(Number.isFinite);
  p90s.push(bends.length ? [...bends].sort((a, b) => a - b)[Math.min(bends.length - 1, Math.floor(0.9 * bends.length))] : Number.NaN);
  return {
    line: name, crests: mine.length, short, meanAngle: mean(angles), meanAbs: mean(abs), maxAbs: abs.length ? Math.max(...abs) : Number.NaN,
    std: std(angles), firstAbs: mean(abs.slice(0, FIRST_WAVES)), laterAbs: mean(abs.slice(FIRST_WAVES)),
    straightness: mean(mine.map((crest) => crest.residual)),
    halved: bends.length, meanBend: mean(bends), maxBend: bends.length ? Math.max(...bends) : Number.NaN, bins,
  };
});
const f = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
console.log(`\n${((Date.now() - started) / 1000).toFixed(0)} s elapsed. Bend p90 by line: ${summaries.map((s, i) => `${s.line} ${p90s[i].toFixed(1)}°`).join(', ')}. dx ${config.dx ?? 'default'}`);
console.log('| Line | Crests (short) | Mean angle ° | Mean \\|angle\\| ° | Max \\|angle\\| ° | Std ° | First 3 \\|angle\\| ° | Later \\|angle\\| ° | Straightness m | \\|angle\\| per 100 s ° '
  + '| Bend mean / max \\|right − left\\| ° (crests) | Mean angle per 100 s ° |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const s of summaries) {
  console.log(`| ${s.line} | ${s.crests} (${s.short}) | ${f(s.meanAngle)} | ${f(s.meanAbs)} | ${f(s.maxAbs)} | ${f(s.std)} | ${f(s.firstAbs)} | ${f(s.laterAbs)} | ${f(s.straightness, 2)} | ${s.bins.map((b) => f(b.meanAbs)).join(' · ')} `
    + `| ${f(s.meanBend)} / ${f(s.maxBend)} (${s.halved}) | ${s.bins.map((b) => f(b.mean)).join(' · ')} |`);
}
const json = option('json');
if (json) {
  writeFileSync(json, JSON.stringify({ spot, swell: swellSize, seed, seconds, config: { ...config }, takeOff, summaries, crests }, null, 1));
  console.log(`Wrote ${json}.`);
}
