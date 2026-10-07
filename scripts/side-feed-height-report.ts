/**
 * Side-feed height report: does a spot's sea hold its height at the window's sides through a session? The failure the
 * side feed was added for (the wave-sizes spec, 2026-09-27): open side edges let a directionally spread sea's energy
 * drift out and nothing comes in from the neighbouring coast, so the sea near the sides, and in time further in, lost
 * up to a third of its height. Wave-only: one surf zone on the CPU from the session's start, no rider.
 *
 * Every 100 s, on lines across shore from the offshore zone's inner edge to the take-off, the significant height
 * Hm0 = 4 √(mean variance of η) over each region's columns: each side's outer `--strip` m (the feed's strips, 30 m), the
 * next `--strip` m in, and the middle `--middle` m; and the session's health: the fastest water (|q|/h where h > 5 cm,
 * sampled every 10 steps), the Froude caps (all, and in water over 5 cm deep), and the water's volume.
 *
 *   rolldown scripts/side-feed-height-report.ts -o dist/scripts/side-feed-height-report.mjs --format esm --platform node \
 *     && node dist/scripts/side-feed-height-report.mjs --spot padang --swell medium --seconds 1200 [--no-side-feed] --json out.json
 */
import { writeFileSync } from 'node:fs';
import { GPU_TIER_COMPONENTS, swellFor } from '../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../src/game/SurfConditions';
import type { SpotName } from '../src/wave/Bathymetry';
import { BoussinesqSolver } from '../src/wave/BoussinesqSolver';
import { SIDE_FEED_SPOTS, SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const spot = (option('spot') ?? 'padang') as SpotName;
const swellSize = (option('swell') ?? 'medium') as SwellSize;
const seed = Number(option('seed') ?? 1);
const seconds = Number(option('seconds') ?? 1200);
const bin = Number(option('bin') ?? 100);
const strip = Number(option('strip') ?? 30);
const middle = Number(option('middle') ?? 60);
const feed = process.argv.includes('--no-side-feed') ? 'off' : process.argv.includes('--side-feed') ? 'on' : 'default';
if (feed === 'off') (SIDE_FEED_SPOTS as SpotName[]).splice(0);
if (feed === 'on' && !SIDE_FEED_SPOTS.includes(spot)) (SIDE_FEED_SPOTS as SpotName[]).push(spot);

const STEP = 1 / 30;
/** The fastest water is sampled every this many steps. */
const SPEED_EVERY = 10;
const settings = physicalSettingsFor(spot, { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
const swell = swellFor(settings);
const config: SurfZoneConfig = {
  spot, seed,
  significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
  directionDegrees: swell.directionDegrees ?? settings.directionDegrees, spreading: swell.spreading, bandwidth: swell.bandwidth,
  tide: settings.tide, windSpeed: settings.windSpeed, stage: 2, compute: 'cpu',
  ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
  componentCount: Number(option('components') ?? GPU_TIER_COMPONENTS),
};

const started = Date.now();
const simulation = new SurfZoneSimulation(config);
const { solver, tank } = simulation;
// As the simulation decides it (its constructor feeds the sides of the spots in SIDE_FEED_SPOTS).
const fed = SIDE_FEED_SPOTS.includes(spot);
const takeOff = simulation.breakPoint();
const rowAt = (z: number) => {
  let best = 0;
  for (let row = 1; row < solver.nz; row += 1) if (Math.abs(solver.zCenters[row] - z) < Math.abs(solver.zCenters[best] - z)) best = row;
  return best;
};
const requested = option('lines')?.split(',').map(Number);
const lineZs = requested ?? [tank.zoneInner + 30, tank.zoneInner + 150, tank.zoneInner + 300, tank.zoneInner + 450, tank.fineFrom + 5, takeOff.z - 30, takeOff.z]
  .filter((z) => z < takeOff.z + 1);
const rows = [...new Set(lineZs.map(rowAt))].sort((a, b) => a - b);
const xMin = solver.xCenters[0] - solver.dx / 2;
const xMax = solver.xCenters[solver.nx - 1] + solver.dx / 2;
/** Each region's columns. */
const regions: { name: string; columns: number[] }[] = [
  { name: 'left strip', columns: [] }, { name: 'left inner', columns: [] }, { name: 'middle', columns: [] },
  { name: 'right inner', columns: [] }, { name: 'right strip', columns: [] },
];
for (let column = 0; column < solver.nx; column += 1) {
  const x = solver.xCenters[column];
  if (x < xMin + strip) regions[0].columns.push(column);
  else if (x < xMin + 2 * strip) regions[1].columns.push(column);
  else if (Math.abs(x - 0.5 * (xMin + xMax)) <= middle / 2) regions[2].columns.push(column);
  else if (x >= xMax - strip) regions[4].columns.push(column);
  else if (x >= xMax - 2 * strip) regions[3].columns.push(column);
}

// Running sums of η and η² per watched row and column, over the current bin.
const sum = new Float64Array(rows.length * solver.nx);
const square = new Float64Array(rows.length * solver.nx);
const wet = new Float64Array(rows.length * solver.nx);
let samples = 0;
interface Bin {
  from: number;
  /** Per line, per region: Hm0, m. */
  hm0: { z: number; depth: number[]; regions: Record<string, number> }[];
  fastest: number; fastestAt: [number, number]; froudeCaps: number; froudeCapsInWater: number; volume: number; finite: boolean;
}
const bins: Bin[] = [];
let fastest = 0;
let fastestAt: [number, number] = [Number.NaN, Number.NaN];
const boussinesq = solver instanceof BoussinesqSolver ? solver : undefined;
let capsBefore = boussinesq?.froudeCaps ?? 0;
let capsInWaterBefore = boussinesq?.froudeCapsInWater ?? 0;
const volume0 = solver.totalVolume();
const area = (xMax - xMin) * (solver.zCenters[solver.nz - 1] - solver.zCenters[0]);
const depthAt = (row: number, column: number) => solver.h[row * solver.nx + column] - (solver.surfaceAt(row * solver.nx + column) - config.tide);
let finite = true;

function closeBin(from: number): void {
  const hm0 = rows.map((row, r) => {
    const values: Record<string, number> = {};
    for (const region of regions) {
      let variance = 0;
      let counted = 0;
      for (const column of region.columns) {
        const k = r * solver.nx + column;
        if (wet[k] < samples) continue;
        const m = sum[k] / samples;
        variance += square[k] / samples - m * m;
        counted += 1;
      }
      values[region.name] = counted ? 4 * Math.sqrt(Math.max(0, variance / counted)) : Number.NaN;
    }
    const depths = regions.map((region) => {
      const column = region.columns[Math.floor(region.columns.length / 2)];
      return Math.round(depthAt(row, column) * 10) / 10;
    });
    return { z: Math.round(solver.zCenters[row]), depth: depths, regions: values };
  });
  const caps = boussinesq?.froudeCaps ?? 0;
  const capsInWater = boussinesq?.froudeCapsInWater ?? 0;
  bins.push({
    from, hm0, fastest, fastestAt, froudeCaps: caps - capsBefore, froudeCapsInWater: capsInWater - capsInWaterBefore,
    volume: solver.totalVolume(), finite,
  });
  capsBefore = caps;
  capsInWaterBefore = capsInWater;
  const last = bins[bins.length - 1];
  console.log(`${String(from).padStart(5)} s: ${last.hm0.map((line) => `z ${line.z} sides ${(0.5 * (line.regions['left strip'] + line.regions['right strip'])).toFixed(2)} middle ${line.regions.middle.toFixed(2)}`).join('; ')}; `
    + `fastest ${last.fastest.toFixed(2)} m/s, caps ${last.froudeCaps} (${last.froudeCapsInWater}), volume ${(last.volume - volume0).toFixed(0)} m³, finite ${last.finite}; ${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
  fastest = 0;
  fastestAt = [Number.NaN, Number.NaN];
  sum.fill(0);
  square.fill(0);
  wet.fill(0);
  samples = 0;
}

console.log(`Side-feed heights: ${spot}, ${swellSize} (Hs ${config.significantHeight} m, Tp ${config.peakPeriod} s, ${config.directionDegrees}°, s ${config.spreading}), seed ${seed}, `
  + `${config.componentCount} components, ${seconds} s; side feed ${fed ? 'on' : 'off'}. Window x ${xMin.toFixed(0)}…${xMax.toFixed(0)}; zone inner z ${tank.zoneInner.toFixed(0)}, `
  + `fine from z ${tank.fineFrom.toFixed(0)}, take-off (${takeOff.x.toFixed(0)}, ${takeOff.z.toFixed(0)}); lines z = ${rows.map((row) => solver.zCenters[row].toFixed(0)).join(', ')}.`);
const steps = Math.round(seconds / STEP);
const perBin = Math.round(bin / STEP);
for (let step = 0; step < steps; step += 1) {
  simulation.step(STEP);
  rows.forEach((row, r) => {
    for (let column = 0; column < solver.nx; column += 1) {
      const i = row * solver.nx + column;
      if (!(solver.h[i] > 0.01)) continue;
      const eta = solver.surfaceAt(i) - config.tide;
      const k = r * solver.nx + column;
      sum[k] += eta;
      square[k] += eta * eta;
      wet[k] += 1;
    }
  });
  samples += 1;
  if (step % SPEED_EVERY === 0) {
    for (let i = 0; i < solver.h.length; i += 1) {
      const h = solver.h[i];
      if (!Number.isFinite(h)) {
        finite = false;
        continue;
      }
      if (!(h > 0.05)) continue;
      const speed = Math.hypot(solver.qx[i], solver.qz[i]) / h;
      if (!Number.isFinite(speed)) finite = false;
      else if (speed > fastest) {
        fastest = speed;
        fastestAt = [solver.xCenters[i % solver.nx], solver.zCenters[Math.floor(i / solver.nx)]];
      }
    }
  }
  if ((step + 1) % perBin === 0) closeBin(((step + 1) / perBin - 1) * bin);
}

const f = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
console.log(`\n${((Date.now() - started) / 1000).toFixed(0)} s elapsed.`);
for (const [r, row] of rows.entries()) {
  console.log(`\nLine z ${solver.zCenters[row].toFixed(0)} (depths ${bins[0]?.hm0[r].depth.join(' / ')} m): Hm0, m, per ${bin} s`);
  console.log(`| From s | ${regions.map((region) => region.name).join(' | ')} | Strips / middle |`);
  console.log(`|---|${regions.map(() => '---').join('|')}|---|`);
  for (const b of bins) {
    const v = b.hm0[r].regions;
    const sides = 0.5 * (v['left strip'] + v['right strip']);
    console.log(`| ${b.from} | ${regions.map((region) => f(v[region.name])).join(' | ')} | ${f(sides / v.middle)} |`);
  }
}
console.log(`\nHealth per ${bin} s:`);
console.log('| From s | Fastest water m/s (where) | Froude caps (in water) | Volume change m³ (mean level, mm) | Finite |');
console.log('|---|---|---|---|---|');
for (const b of bins) {
  console.log(`| ${b.from} | ${f(b.fastest)} (${f(b.fastestAt[0], 0)}, ${f(b.fastestAt[1], 0)}) | ${b.froudeCaps} (${b.froudeCapsInWater}) | ${f(b.volume - volume0, 0)} (${f((1000 * (b.volume - volume0)) / area, 1)}) | ${b.finite} |`);
}
const json = option('json');
if (json) {
  writeFileSync(json, JSON.stringify({
    spot, swell: swellSize, seed, seconds, bin, strip, middle, sideFeed: fed, config: { ...config }, tank, takeOff,
    regions: regions.map((region) => ({ name: region.name, x: [solver.xCenters[region.columns[0]], solver.xCenters[region.columns[region.columns.length - 1]]] })),
    volume0, bins,
  }, null, 1));
  console.log(`Wrote ${json}.`);
}
