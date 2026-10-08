/**
 * Side-feed height report: does a spot's sea hold its height at the window's sides through a session, and does it stay
 * the same sea? The failure the side feed was added for (the wave-sizes spec, 2026-09-27): open side edges let a
 * directionally spread sea's energy drift out and nothing comes in from the neighbouring coast, so the sea near the
 * sides, and in time further in, lost up to a third of its height. Wave-only: one surf zone on the CPU from the
 * session's start, no rider.
 *
 * Per `--bin` s (100):
 * - on lines across shore from the offshore zone's inner edge to the take-off, the significant height
 *   Hm0 = 4 √(mean variance of η) and the mean level over each region's columns: each side's outer `--strip` m (the
 *   feed's strips, 30 m), the next `--strip` m in, and the middle `--middle` m;
 * - the mean water level in bands across shore (the offshore zone, the approach to the fine grid, the shelf seaward
 *   of the take-off line, the surf), over the strips, the middle and the whole window, averaged over the bin (every
 *   10 steps); and the water's volume, its mean over the bin and at its end, against the start's;
 * - the breaking onsets (the simulation's, as the peel tracker gets them): how many, and where along and across shore;
 *   and where the outermost breaking cell sits in the strips and the middle;
 * - the peel meter's estimate each second (where its fit is 0.8 or more);
 * - the crests passing the take-off line (30 m seaward of the take-off), followed along shore and fitted as the
 *   crest-angle report does, at each column's highest row and at the centroid of its top fifth: their bends, and the
 *   crests whose halves lean opposite ways past 10° and past the Beach reference's 11.6°;
 * - the bin's mean current (Σ q / Σ h per cell): the strongest where the bin's mean depth is over 0.5 m, and its mean speed
 *   by band over the strips, the middle and the whole window (a circulation growing over a session shows here);
 * - the session's health: the fastest water (|q|/h where h > 5 cm, every 10 steps), the Froude caps (all, and in water
 *   over 5 cm deep).
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
/** `--side-feed` / `--no-side-feed`: the run's `SurfZoneConfig.sideFeed`; neither, the spot's default (`SIDE_FEED_SPOTS`). */
const feed = process.argv.includes('--no-side-feed') ? 'off' : process.argv.includes('--side-feed') ? 'on' : 'default';

const STEP = 1 / 30;
/** The fastest water and the mean levels are sampled every this many steps. */
const SAMPLE_EVERY = 10;
/** As the crest-angle report: a crest counts at 0.2 Hs, is followed within 3 m a column, ends below 35 % of its height. */
const CREST_SHARE = 0.2;
const TRACK_REACH = 3;
const LOST_SHARE = 0.35;
const MIN_COVERAGE = 0.5;
const EDGE_MARGIN = 20;
const MIN_HALF_SPAN = 20;
const CENTROID_SHARE = 0.2;
const CENTROID_REACH = 30;
/** The Beach reference's 90th percentile of |half| on the take-off line (docs/research/crest-angle-2026-10-05.md). */
const REFERENCE_HALF = 11.6;

const settings = physicalSettingsFor(spot, { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
const swell = swellFor(settings);
const config: SurfZoneConfig = {
  spot, seed,
  significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
  directionDegrees: swell.directionDegrees ?? settings.directionDegrees, spreading: swell.spreading, bandwidth: swell.bandwidth,
  tide: settings.tide, windSpeed: settings.windSpeed, stage: 2, compute: 'cpu',
  ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
  componentCount: Number(option('components') ?? GPU_TIER_COMPONENTS),
  ...(feed === 'default' ? {} : { sideFeed: feed === 'on' }),
};

const started = Date.now();
const simulation = new SurfZoneSimulation(config);
const { solver, tank } = simulation;
// As the simulation decides it: the config's say, else SIDE_FEED_SPOTS.
const fed = config.sideFeed ?? SIDE_FEED_SPOTS.includes(spot);
const takeOff = simulation.breakPoint();
const still = config.tide;
const rowAt = (z: number) => {
  let best = 0;
  for (let row = 1; row < solver.nz; row += 1) if (Math.abs(solver.zCenters[row] - z) < Math.abs(solver.zCenters[best] - z)) best = row;
  return best;
};
const columnAt = (x: number) => Math.min(solver.nx - 1, Math.max(0, Math.round((x - solver.xCenters[0]) / solver.dx)));
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
const regionOf = new Int8Array(solver.nx).fill(-1);
for (let column = 0; column < solver.nx; column += 1) {
  const x = solver.xCenters[column];
  const r = x < xMin + strip ? 0 : x < xMin + 2 * strip ? 1 : Math.abs(x - 0.5 * (xMin + xMax)) <= middle / 2 ? 2
    : x >= xMax - strip ? 4 : x >= xMax - 2 * strip ? 3 : -1;
  if (r >= 0) regions[r].columns.push(column);
  regionOf[column] = r;
}
/** Bands across shore for the mean level: the offshore zone, the approach, the shelf seaward of the take-off line, the surf. */
const bands = [
  { name: 'zone', from: -Infinity, to: tank.zoneInner },
  { name: 'approach', from: tank.zoneInner, to: tank.fineFrom },
  { name: 'shelf', from: tank.fineFrom, to: takeOff.z - 30 },
  { name: 'surf', from: takeOff.z - 30, to: Infinity },
];
const bandOf = Int8Array.from(solver.zCenters, (z) => bands.findIndex((b) => z >= b.from && z < b.to));
const cellArea = (row: number) => solver.dx * solver.dz[row];

// Running sums over the current bin.
const sum = new Float64Array(rows.length * solver.nx);
const square = new Float64Array(rows.length * solver.nx);
const wet = new Float64Array(rows.length * solver.nx);
let samples = 0;
/** Per band × (strips, middle, all): Σ η·area and Σ area over the bin's samples, for an area-weighted mean level. */
const levelSum = new Float64Array(bands.length * 3);
const levelArea = new Float64Array(bands.length * 3);
let volumeSum = 0;
let volumeSamples = 0;
/** Per cell, Σ qx, Σ qz and Σ h over the bin's samples: the bin's mean current, ū = Σ q / Σ h. */
const qxSum = new Float64Array(solver.nx * solver.nz);
const qzSum = new Float64Array(solver.nx * solver.nz);
const hSum = new Float64Array(solver.nx * solver.nz);
/** The bin's onsets, and the outermost break's z per region (strips, middle) summed over the bin's samples. */
interface Onset { t: number; x: number; z: number }
let onsets: Onset[] = [];
const allOnsets: Onset[] = [];
const breakSum = new Float64Array(3);
const breakCount = new Float64Array(3);
const peelSamples: { angle: number; direction: number; speed: number }[] = [];
let peelClock = 0;

// Every onset the simulation marks, as the peel tracker gets it.
const markOnset = simulation.peel.markOnset.bind(simulation.peel);
simulation.peel.markOnset = (column: number, time: number, z = 0) => {
  const onset = { t: simulation.seaTime, x: solver.xCenters[column], z };
  onsets.push(onset);
  allOnsets.push(onset);
  markOnset(column, time, z);
};

// The take-off line's crests (as the crest-angle report follows them).
const crestRow = rowAt(takeOff.z - 30);
const firstColumn = columnAt(xMin + EDGE_MARGIN);
const lastColumn = columnAt(xMax - EDGE_MARGIN);
const referenceColumn = columnAt(Math.min(solver.xCenters[lastColumn], Math.max(solver.xCenters[firstColumn], takeOff.x)));
const surface = (row: number, column: number) => {
  const i = row * solver.nx + column;
  return solver.h[i] > 0.01 ? solver.surfaceAt(i) : Number.NEGATIVE_INFINITY;
};
function crestIn(column: number, near: number, reach: number, centroid: boolean): { z: number; eta: number } | undefined {
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
  if (centroid && bestEta - still > 0) {
    const floor = bestEta - CENTROID_SHARE * (bestEta - still);
    let total = 0;
    let weighted = 0;
    for (const step of [-1, 1]) {
      for (let row = step < 0 ? best : best + 1; row >= 1 && row < solver.nz - 1; row += step) {
        if (Math.abs(solver.zCenters[row] - solver.zCenters[best]) > CENTROID_REACH) break;
        const eta = surface(row, column);
        if (!(eta > floor)) break;
        total += (eta - floor) * solver.dz[row];
        weighted += (eta - floor) * solver.dz[row] * solver.zCenters[row];
      }
    }
    if (total > 0) return { z: weighted / total, eta: bestEta };
  }
  const a = surface(best - 1, column);
  const c = surface(best + 1, column);
  if (!Number.isFinite(a) || !Number.isFinite(c)) return { z: solver.zCenters[best], eta: bestEta };
  const denominator = a - 2 * bestEta + c;
  const shift = denominator < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denominator)) : 0;
  const spacing = shift >= 0 ? solver.zCenters[best + 1] - solver.zCenters[best] : solver.zCenters[best] - solver.zCenters[best - 1];
  return { z: solver.zCenters[best] + shift * spacing, eta: bestEta };
}
const slopeOf = (points: { x: number; z: number }[]) => {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const mz = points.reduce((s, p) => s + p.z, 0) / n;
  let sxx = 0;
  let sxz = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxz += (p.x - mx) * (p.z - mz);
  }
  return { slope: sxz / sxx, mx, mz };
};
interface Crest { t: number; mode: 'max' | 'centroid'; angle: number; left: number; right: number; residual: number; coverage: number; height: number }
function fitCrest(centroid: boolean): Crest | undefined {
  const start = crestIn(referenceColumn, solver.zCenters[crestRow], 4, centroid);
  if (!start) return undefined;
  const points = [{ x: solver.xCenters[referenceColumn], z: start.z }];
  for (const step of [-1, 1]) {
    let near = start.z;
    for (let column = referenceColumn + step; column >= firstColumn && column <= lastColumn; column += step) {
      const crest = crestIn(column, near, TRACK_REACH, centroid);
      if (!crest || crest.eta - still < LOST_SHARE * (start.eta - still)) break;
      points.push({ x: solver.xCenters[column], z: crest.z });
      near = crest.z;
    }
  }
  const coverage = (points.length - 1) / (lastColumn - firstColumn);
  if (coverage < MIN_COVERAGE) return undefined;
  const { slope, mx, mz } = slopeOf(points);
  const residual = Math.sqrt(points.reduce((s, p) => s + (p.z - (mz + slope * (p.x - mx))) ** 2, 0) / points.length);
  points.sort((a, b) => a.x - b.x);
  const half = Math.floor(points.length / 2);
  const halfAngle = (part: { x: number; z: number }[]) => (part[part.length - 1].x - part[0].x < MIN_HALF_SPAN ? Number.NaN : (Math.atan(slopeOf(part).slope) * 180) / Math.PI);
  return {
    t: simulation.seaTime, mode: centroid ? 'centroid' : 'max', angle: (Math.atan(slope) * 180) / Math.PI,
    left: halfAngle(points.slice(0, half + 1)), right: halfAngle(points.slice(half)), residual, coverage, height: start.eta - still,
  };
}
const crestHistory: number[] = [];
let lastCrest = Number.NEGATIVE_INFINITY;
let binCrests: Crest[] = [];
const allCrests: Crest[] = [];

interface Bin {
  from: number;
  /** Per line, per region: Hm0 and the mean level, m. */
  hm0: { z: number; depth: number[]; regions: Record<string, number>; level: Record<string, number> }[];
  /** Per band: the bin's mean level, m, over the strips, the middle and the whole window. */
  levels: { band: string; strips: number; middle: number; all: number }[];
  volume: number; volumeMean: number;
  /** The bin's mean current: the strongest anywhere (where h > 0.5 m on average) and where, and its mean speed per band over the strips, the middle and all. */
  current: { strongest: number; at: [number, number]; along: number; bands: { band: string; strips: number; middle: number; all: number }[] };
  onsets: { count: number; xP10: number; xMedian: number; xP90: number; zP10: number; zMedian: number; zP90: number; byRegion: Record<string, number> };
  outerBreak: { strips: number; middle: number };
  peel: { estimates: number; medianAngle: number; plusShare: number; medianSpeed: number };
  crests: Record<'max' | 'centroid', { crests: number; bendP90: number; straightness: number; twoWays10: number; twoWaysReference: number }>;
  fastest: number; fastestAt: [number, number]; froudeCaps: number; froudeCapsInWater: number; finite: boolean;
}
const bins: Bin[] = [];
let fastest = 0;
let fastestAt: [number, number] = [Number.NaN, Number.NaN];
const boussinesq = solver instanceof BoussinesqSolver ? solver : undefined;
let capsBefore = boussinesq?.froudeCaps ?? 0;
let capsInWaterBefore = boussinesq?.froudeCapsInWater ?? 0;
const volume0 = solver.totalVolume();
const depthAt = (row: number, column: number) => solver.h[row * solver.nx + column] - (solver.surfaceAt(row * solver.nx + column) - config.tide);
let finite = true;
const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const twoWays = (c: Crest, limit: number) => Math.sign(c.left) !== Math.sign(c.right) && Math.abs(c.left) >= limit && Math.abs(c.right) >= limit;

function closeBin(from: number): void {
  const hm0 = rows.map((row, r) => {
    const values: Record<string, number> = {};
    const level: Record<string, number> = {};
    for (const region of regions) {
      let variance = 0;
      let mean = 0;
      let counted = 0;
      for (const column of region.columns) {
        const k = r * solver.nx + column;
        if (wet[k] < samples) continue;
        const m = sum[k] / samples;
        variance += square[k] / samples - m * m;
        mean += m;
        counted += 1;
      }
      values[region.name] = counted ? 4 * Math.sqrt(Math.max(0, variance / counted)) : Number.NaN;
      level[region.name] = counted ? mean / counted : Number.NaN;
    }
    const depths = regions.map((region) => Math.round(depthAt(row, region.columns[Math.floor(region.columns.length / 2)]) * 10) / 10);
    return { z: Math.round(solver.zCenters[row]), depth: depths, regions: values, level };
  });
  const levels = bands.map((band, b) => ({
    band: band.name,
    strips: levelSum[b * 3] / levelArea[b * 3], middle: levelSum[b * 3 + 1] / levelArea[b * 3 + 1], all: levelSum[b * 3 + 2] / levelArea[b * 3 + 2],
  }));
  const regionCounts: Record<string, number> = { 'left strip': 0, 'left inner': 0, middle: 0, 'right inner': 0, 'right strip': 0, other: 0 };
  for (const onset of onsets) {
    const r = regionOf[columnAt(onset.x)];
    regionCounts[r >= 0 ? regions[r].name : 'other'] += 1;
  }
  const crestStats = (mode: 'max' | 'centroid') => {
    const mine = binCrests.filter((c) => c.mode === mode);
    const halved = mine.filter((c) => Number.isFinite(c.left) && Number.isFinite(c.right));
    return {
      crests: mine.length, bendP90: quantile(halved.map((c) => Math.abs(c.right - c.left)), 0.9),
      straightness: mine.length ? mine.reduce((s, c) => s + c.residual, 0) / mine.length : Number.NaN,
      twoWays10: halved.filter((c) => twoWays(c, 10)).length, twoWaysReference: halved.filter((c) => twoWays(c, REFERENCE_HALF)).length,
    };
  };
  let strongest = 0;
  let strongestAt: [number, number] = [Number.NaN, Number.NaN];
  let strongestAlong = 0;
  const speedSum = new Float64Array(bands.length * 3);
  const speedCount = new Float64Array(bands.length * 3);
  for (let row = 0; row < solver.nz; row += 1) {
    for (let column = 0; column < solver.nx; column += 1) {
      const i = row * solver.nx + column;
      if (!(hSum[i] > 0.5 * volumeSamples)) continue;
      const ux = qxSum[i] / hSum[i];
      const uz = qzSum[i] / hSum[i];
      const speed = Math.hypot(ux, uz);
      if (speed > strongest) {
        strongest = speed;
        strongestAt = [solver.xCenters[column], solver.zCenters[row]];
        strongestAlong = ux;
      }
      const band = bandOf[row];
      if (band < 0) continue;
      const r = regionOf[column];
      const which = r === 0 || r === 4 ? 0 : r === 2 ? 1 : -1;
      if (which >= 0) {
        speedSum[band * 3 + which] += speed;
        speedCount[band * 3 + which] += 1;
      }
      speedSum[band * 3 + 2] += speed;
      speedCount[band * 3 + 2] += 1;
    }
  }
  const current = {
    strongest, at: strongestAt, along: strongestAlong,
    bands: bands.map((band, b) => ({
      band: band.name, strips: speedSum[b * 3] / speedCount[b * 3], middle: speedSum[b * 3 + 1] / speedCount[b * 3 + 1], all: speedSum[b * 3 + 2] / speedCount[b * 3 + 2],
    })),
  };
  qxSum.fill(0);
  qzSum.fill(0);
  hSum.fill(0);
  const caps = boussinesq?.froudeCaps ?? 0;
  const capsInWater = boussinesq?.froudeCapsInWater ?? 0;
  bins.push({
    from, hm0, levels, volume: solver.totalVolume(), volumeMean: volumeSum / volumeSamples, current,
    onsets: {
      count: onsets.length,
      xP10: quantile(onsets.map((o) => o.x), 0.1), xMedian: quantile(onsets.map((o) => o.x), 0.5), xP90: quantile(onsets.map((o) => o.x), 0.9),
      zP10: quantile(onsets.map((o) => o.z), 0.1), zMedian: quantile(onsets.map((o) => o.z), 0.5), zP90: quantile(onsets.map((o) => o.z), 0.9),
      byRegion: regionCounts,
    },
    outerBreak: { strips: breakSum[0] / breakCount[0], middle: breakSum[1] / breakCount[1] },
    peel: {
      estimates: peelSamples.length, medianAngle: quantile(peelSamples.map((p) => p.angle), 0.5),
      plusShare: peelSamples.length ? peelSamples.filter((p) => p.direction > 0).length / peelSamples.length : Number.NaN,
      medianSpeed: quantile(peelSamples.map((p) => p.speed), 0.5),
    },
    crests: { max: crestStats('max'), centroid: crestStats('centroid') },
    fastest, fastestAt, froudeCaps: caps - capsBefore, froudeCapsInWater: capsInWater - capsInWaterBefore, finite,
  });
  capsBefore = caps;
  capsInWaterBefore = capsInWater;
  const last = bins[bins.length - 1];
  const surf = last.levels[last.levels.length - 1];
  console.log(`${String(from).padStart(5)} s: ${last.hm0.map((line) => `z ${line.z} sides ${(0.5 * (line.regions['left strip'] + line.regions['right strip'])).toFixed(2)} middle ${line.regions.middle.toFixed(2)}`).join('; ')}; `
    + `volume ${(last.volume - volume0).toFixed(0)} m³ at the end, ${(last.volumeMean - volume0).toFixed(0)} m³ over the bin; levels ${last.levels.map((l) => `${l.band} ${(1000 * l.all).toFixed(0)} mm`).join(', ')} (surf strips ${(1000 * surf.strips).toFixed(0)} / middle ${(1000 * surf.middle).toFixed(0)} mm); `
    + `mean current strongest ${last.current.strongest.toFixed(2)} m/s at (${last.current.at[0].toFixed(0)}, ${last.current.at[1].toFixed(0)}), surf mean ${last.current.bands[3].all.toFixed(2)} m/s; `
    + `onsets ${last.onsets.count} (x ${last.onsets.xP10.toFixed(0)}…${last.onsets.xP90.toFixed(0)}); peel ${last.peel.medianAngle.toFixed(0)}° (${last.peel.estimates}); `
    + `take-off crests ${last.crests.max.crests}, two ways ${last.crests.max.twoWays10} (centroid ${last.crests.centroid.twoWays10}); fastest ${last.fastest.toFixed(2)} m/s, caps ${last.froudeCaps} (${last.froudeCapsInWater}), finite ${last.finite}; `
    + `${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
  fastest = 0;
  fastestAt = [Number.NaN, Number.NaN];
  sum.fill(0);
  square.fill(0);
  wet.fill(0);
  samples = 0;
  levelSum.fill(0);
  levelArea.fill(0);
  volumeSum = 0;
  volumeSamples = 0;
  onsets = [];
  breakSum.fill(0);
  breakCount.fill(0);
  peelSamples.length = 0;
  binCrests = [];
}

console.log(`Side-feed heights: ${spot}, ${swellSize} (Hs ${config.significantHeight} m, Tp ${config.peakPeriod} s, ${config.directionDegrees}°, s ${config.spreading}), seed ${seed}, `
  + `${config.componentCount} components, ${seconds} s; side feed ${fed ? 'on' : 'off'}. Window x ${xMin.toFixed(0)}…${xMax.toFixed(0)}; zone inner z ${tank.zoneInner.toFixed(0)}, `
  + `fine from z ${tank.fineFrom.toFixed(0)}, take-off (${takeOff.x.toFixed(0)}, ${takeOff.z.toFixed(0)}); lines z = ${rows.map((row) => solver.zCenters[row].toFixed(0)).join(', ')}; `
  + `crests on z ${solver.zCenters[crestRow].toFixed(0)}.`);
const steps = Math.round(seconds / STEP);
const perBin = Math.round(bin / STEP);
for (let step = 0; step < steps; step += 1) {
  simulation.step(STEP);
  rows.forEach((row, r) => {
    for (let column = 0; column < solver.nx; column += 1) {
      const i = row * solver.nx + column;
      if (!(solver.h[i] > 0.01)) continue;
      const eta = solver.surfaceAt(i) - still;
      const k = r * solver.nx + column;
      sum[k] += eta;
      square[k] += eta * eta;
      wet[k] += 1;
    }
  });
  samples += 1;
  // The take-off line's crests: the reference column's surface peaking in time above the crest share.
  crestHistory.push(surface(crestRow, referenceColumn));
  if (crestHistory.length > 3) crestHistory.shift();
  if (crestHistory.length === 3) {
    const [a, b, c] = crestHistory;
    if (b > a && b >= c && b - still > CREST_SHARE * config.significantHeight && simulation.seaTime - lastCrest >= 0.4 * config.peakPeriod) {
      lastCrest = simulation.seaTime;
      for (const centroid of [false, true]) {
        const crest = fitCrest(centroid);
        if (crest) {
          binCrests.push(crest);
          allCrests.push(crest);
        }
      }
    }
  }
  peelClock += STEP;
  if (peelClock >= 1) {
    peelClock = 0;
    const peel = simulation.peelEstimate();
    if (peel && peel.fit >= 0.8) peelSamples.push({ angle: peel.angleDegrees, direction: peel.direction, speed: peel.peelSpeed });
  }
  if (step % SAMPLE_EVERY === 0) {
    for (let column = 0; column < solver.nx; column += 1) {
      const r = regionOf[column];
      const which = r === 0 || r === 4 ? 0 : r === 2 ? 1 : -1;
      if (which < 0) continue;
      const z = simulation.outerBreakZ(column);
      if (Number.isFinite(z)) {
        breakSum[which] += z;
        breakCount[which] += 1;
      }
    }
    let volume = 0;
    for (let row = 0; row < solver.nz; row += 1) {
      const band = bandOf[row];
      const area = cellArea(row);
      for (let column = 0; column < solver.nx; column += 1) {
        const i = row * solver.nx + column;
        const h = solver.h[i];
        if (!Number.isFinite(h)) {
          finite = false;
          continue;
        }
        volume += h * area;
        qxSum[i] += solver.qx[i];
        qzSum[i] += solver.qz[i];
        hSum[i] += h;
        if (h > 0.01 && band >= 0) {
          const eta = solver.surfaceAt(i) - still;
          const r = regionOf[column];
          const which = r === 0 || r === 4 ? 0 : r === 2 ? 1 : -1;
          if (which >= 0) {
            levelSum[band * 3 + which] += eta * area;
            levelArea[band * 3 + which] += area;
          }
          levelSum[band * 3 + 2] += eta * area;
          levelArea[band * 3 + 2] += area;
        }
        if (!(h > 0.05)) continue;
        const speed = Math.hypot(solver.qx[i], solver.qz[i]) / h;
        if (!Number.isFinite(speed)) finite = false;
        else if (speed > fastest) {
          fastest = speed;
          fastestAt = [solver.xCenters[column], solver.zCenters[row]];
        }
      }
    }
    volumeSum += volume;
    volumeSamples += 1;
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
    console.log(`| ${b.from} | ${regions.map((region) => f(v[region.name])).join(' | ')} | ${f((0.5 * (v['left strip'] + v['right strip'])) / v.middle)} |`);
  }
}
console.log(`\nThe water per ${bin} s: its volume against the start's (at the bin's end, and averaged over it; m³), and the mean level by band (mm, the whole window):`);
console.log(`| From s | Volume at the end | Volume over the bin | ${bands.map((b) => b.name).join(' | ')} |`);
console.log(`|---|---|---|${bands.map(() => '---').join('|')}|`);
for (const b of bins) console.log(`| ${b.from} | ${f(b.volume - volume0, 0)} | ${f(b.volumeMean - volume0, 0)} | ${b.levels.map((l) => f(1000 * l.all, 0)).join(' | ')} |`);
console.log(`\nBreaking and crests per ${bin} s:`);
console.log('| From s | Onsets | Onset x p10 / median / p90 | Onset z p10 / median / p90 | Outer break z strips / middle | Peel median ° (estimates, +x share) | Take-off crests | Two ways ±10° max / centroid | Bend p90 ° max / centroid |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const b of bins) {
  console.log(`| ${b.from} | ${b.onsets.count} | ${f(b.onsets.xP10, 0)} / ${f(b.onsets.xMedian, 0)} / ${f(b.onsets.xP90, 0)} | ${f(b.onsets.zP10, 0)} / ${f(b.onsets.zMedian, 0)} / ${f(b.onsets.zP90, 0)} `
    + `| ${f(b.outerBreak.strips, 0)} / ${f(b.outerBreak.middle, 0)} | ${f(b.peel.medianAngle, 0)} (${b.peel.estimates}, ${f(b.peel.plusShare)}) | ${b.crests.max.crests} `
    + `| ${b.crests.max.twoWays10} / ${b.crests.centroid.twoWays10} | ${f(b.crests.max.bendP90, 0)} / ${f(b.crests.centroid.bendP90, 0)} |`);
}
console.log(`\nThe mean current per ${bin} s (m/s): the strongest where the bin's mean depth is over 0.5 m, its along-shore part and where; the mean speed by band (strips / middle / all):`);
console.log(`| From s | Strongest (along) | At x, z | ${bands.map((b) => b.name).join(' | ')} |`);
console.log(`|---|---|---|${bands.map(() => '---').join('|')}|`);
for (const b of bins) {
  console.log(`| ${b.from} | ${f(b.current.strongest)} (${f(b.current.along)}) | ${f(b.current.at[0], 0)}, ${f(b.current.at[1], 0)} | ${b.current.bands.map((c) => `${f(c.strips)} / ${f(c.middle)} / ${f(c.all)}`).join(' | ')} |`);
}
console.log(`\nHealth per ${bin} s:`);
console.log('| From s | Fastest water m/s (where) | Froude caps (in water) | Finite |');
console.log('|---|---|---|---|');
for (const b of bins) console.log(`| ${b.from} | ${f(b.fastest)} (${f(b.fastestAt[0], 0)}, ${f(b.fastestAt[1], 0)}) | ${b.froudeCaps} (${b.froudeCapsInWater}) | ${b.finite} |`);
const json = option('json');
if (json) {
  writeFileSync(json, JSON.stringify({
    spot, swell: swellSize, seed, seconds, bin, strip, middle, sideFeed: fed, config: { ...config }, tank, takeOff, bands,
    crestLineZ: solver.zCenters[crestRow],
    regions: regions.map((region) => ({ name: region.name, x: [solver.xCenters[region.columns[0]], solver.xCenters[region.columns[region.columns.length - 1]]] })),
    volume0, bins, onsets: allOnsets, crests: allCrests,
  }, null, 1));
  console.log(`Wrote ${json}.`);
}
