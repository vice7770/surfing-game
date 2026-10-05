/**
 * Crest-angle report: do a spot's crests stay parallel to the beach through a session? Runs one surf zone on the
 * CPU from the session's own start (the set run, as Surf builds it) and, every time a crest passes a watched line,
 * follows that crest along shore and fits a straight line z(x) to it. The crest's angle is that line's, degrees:
 * 0 runs parallel to the beach; positive rises shoreward toward +x. Two lines are watched: the fine zone's first
 * rows (what the tank's edge sends in, refracted) and a line seaward of the take-off (what a rider sees coming).
 *
 *   npm run report:crest-angle
 *   npm run report:crest-angle -- --spot beach --swell medium --seconds 300
 *   npm run report:crest-angle -- --spot canyon --spreading 150 --direction 0 --json /tmp/canyon.json
 *
 * `--swell practice|small|medium|big`, `--seed`, `--seconds` (600), `--spreading` and `--direction` (override the
 * swell's), `--components` (64, the GPU tier's; 24 is the CPU tier's), `--offset` (30 m seaward of the take-off),
 * `--quiet` (no per-crest lines), `--json <file>` (the crests and summary).
 */
import { writeFileSync } from 'node:fs';
import { GPU_TIER_COMPONENTS, swellFor } from '../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../src/game/SurfConditions';
import type { SpotName } from '../src/wave/Bathymetry';
import { SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

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

const settings = physicalSettingsFor(spot, { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
const swell = swellFor(settings);
const config: SurfZoneConfig = {
  spot, seed,
  significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
  directionDegrees: numberOption('direction') ?? swell.directionDegrees ?? settings.directionDegrees,
  spreading: numberOption('spreading') ?? swell.spreading,
  bandwidth: swell.bandwidth,
  tide: settings.tide, windSpeed: settings.windSpeed, stage: 2, compute: 'cpu',
  ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
  componentCount: numberOption('components') ?? GPU_TIER_COMPONENTS,
};

interface Crest { line: string; t: number; angle: number; residual: number; coverage: number; height: number }

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
  const mx = points.reduce((sum, p) => sum + p.x, 0) / n;
  const mz = points.reduce((sum, p) => sum + p.z, 0) / n;
  let sxx = 0;
  let sxz = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxz += (p.x - mx) * (p.z - mz);
  }
  const slope = sxz / sxx;
  const residual = Math.sqrt(points.reduce((sum, p) => sum + (p.z - (mz + slope * (p.x - mx))) ** 2, 0) / n);
  return { line, t: simulation.seaTime, angle: (Math.atan(slope) * 180) / Math.PI, residual, coverage, height: start.eta - still };
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
        + `straightness ${crest.residual.toFixed(2)} m  coverage ${(100 * crest.coverage).toFixed(0)}%  η ${crest.height.toFixed(2)} m`);
    }
  }
}

const watches = [new Watch('edge', simulation.tank.fineFrom + 5), new Watch('take-off', takeOff.z - offset)];
console.log(`Crest angles: ${spot}, ${swellSize} (Hs ${config.significantHeight} m, Tp ${config.peakPeriod} s, ${config.directionDegrees}°, s ${config.spreading.toFixed(0)}), `
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
  firstAbs: number; laterAbs: number; straightness: number; bins: { from: number; meanAbs: number; crests: number }[];
}
const summaries: Summary[] = watches.map(({ name, short }) => {
  const mine = crests.filter((crest) => crest.line === name);
  const angles = mine.map((crest) => crest.angle);
  const abs = angles.map(Math.abs);
  const bins: Summary['bins'] = [];
  for (let from = 0; from < seconds; from += 100) {
    const binned = mine.filter((crest) => crest.t - start >= from && crest.t - start < from + 100).map((crest) => Math.abs(crest.angle));
    bins.push({ from, meanAbs: mean(binned), crests: binned.length });
  }
  return {
    line: name, crests: mine.length, short, meanAngle: mean(angles), meanAbs: mean(abs), maxAbs: abs.length ? Math.max(...abs) : Number.NaN,
    std: std(angles), firstAbs: mean(abs.slice(0, FIRST_WAVES)), laterAbs: mean(abs.slice(FIRST_WAVES)),
    straightness: mean(mine.map((crest) => crest.residual)), bins,
  };
});
const f = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
console.log(`\n${((Date.now() - started) / 1000).toFixed(0)} s elapsed.`);
console.log('| Line | Crests (short) | Mean angle ° | Mean \\|angle\\| ° | Max \\|angle\\| ° | Std ° | First 3 \\|angle\\| ° | Later \\|angle\\| ° | Straightness m | \\|angle\\| per 100 s ° |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const s of summaries) {
  console.log(`| ${s.line} | ${s.crests} (${s.short}) | ${f(s.meanAngle)} | ${f(s.meanAbs)} | ${f(s.maxAbs)} | ${f(s.std)} | ${f(s.firstAbs)} | ${f(s.laterAbs)} | ${f(s.straightness, 2)} | ${s.bins.map((b) => f(b.meanAbs)).join(' · ')} |`);
}
const json = option('json');
if (json) {
  writeFileSync(json, JSON.stringify({ spot, swell: swellSize, seed, seconds, config: { ...config }, takeOff, summaries, crests }, null, 1));
  console.log(`Wrote ${json}.`);
}
