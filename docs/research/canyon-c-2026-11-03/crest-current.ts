/**
 * canyon-c (2026-11-03; `--bed half` and `--join zone` since 2026-11-04, `?canyonRamp=half` and `?canyonJoin=zone`):
 * scripts/crest-angle-report.ts for version C, with the ruling's bar 7 (the current) and the take-off's
 * waves over a long session. Its crests and health are summarised over the first `--summary` s (600, canyon-b's), the
 * currents and the take-off's Hs over every 100 s to `--seconds` (1800). The station groups are version C's: the open
 * water +x of the bank, the bank (its tip's fade to the join), the flipped bowl, the channel.
 *
 * **The current** (bar 7): the mean flow, the time-mean flux over the time-mean depth per cell (sampled every 0.5 s),
 * averaged over each region's wet cells, every 100 s: along the bank (its face and top, 20 m seaward of its edge to 40 m
 * inside it, x −22…140), over its inside (x 31…140, 15 m inside the edge to the beach face's toe), over the bowl (its
 * crest ± 30 m) and in the channel (x −180…−75, z −230…−80). Along the bank: the component toward the bowl along the
 * bank's line (−x and shoreward at 45°). Komar's bound (Coastal Wiki) is about 1.9 m/s at Medium; the advisor inferred
 * 0.5–1.5 m/s.
 * **The take-off's waves**: Hs = 4 σ_η over each 100 s at the start's take-off (x 75) and, for the sea's own groupiness,
 * at the same x 20 m inside the relaxation zone; their ratio's drift.
 *
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
 * `--quiet` (no per-crest lines), `--json <file>` (the crests and summary), `--canyon key=value,...` (reshape the Canyon, as
 * the canyon peel report's sweep), `--bed old` (the Canyon's layout before canyon-b, `?canyonBed=old`), `--waves barrel` (the Wave
 * Pool's Barrel floor and sizes, with `--spot pool`).
 *
 * Each crest's two halves along shore (split at its middle point) are also fitted on their own: their angles' difference,
 * the bend, shows a crest that runs two ways at once (an A-frame, or a crest turned by one side of the bed).
 *
 * Inshore of the take-off too (canyon-layout, 2026-10-22: the water-physics advisor found the old bar watched only lines
 * seaward of the arm, where the Canyon's V had not formed yet, and never the edge band's mirror):
 * - three more watched lines, `in-25`, `in-50` and `in-75`, a quarter, half and three quarters of the way from the
 *   take-off to the waterline (over the arm, its top and the lagoon, at the Canyon);
 * - **the crest lines**, every second (the advisor's `crests.ts`): every crest in the fine zone (local maxima of η along
 *   z per column, above 0.25 Hs, linked column to column within 3 m) and its local angle (least squares over ±10 m) at
 *   stations every 15 m along shore and 12 m inside each open side edge, with the crest's z there. Summarised by band
 *   across shore (relative to the take-off: `seaward` more than 30 m seaward of it, `take-off` the 30 m seaward of it,
 *   `inside` to halfway to the waterline, `inner` the rest) and by station group (the open water either side of the
 *   Canyon's arm and over it; the whole window elsewhere): p50 and p90 of |angle|. The **edge chevron**: past each open
 *   side the edge band draws the tank's water mirrored, so a crest leaning a° at the edge station is drawn as a chevron
 *   2a° from straight. **Two-sided**: a crest whose mean angles over the window's outer thirds lean opposite ways, each
 *   past `TWO_SIDED` (crest-angle-compare.ts recounts against the Beach's spread);
 * - **the session's health**: the fastest water (|q|/h where h > 5 cm, every 10 steps), the Froude caps and the volume.
 */
import { writeFileSync } from 'node:fs';
import { GPU_TIER_COMPONENTS, swellFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import type { SpotName } from '../../../src/wave/Bathymetry';
import { canyonBankEdge, canyonBankEdgeZ, canyonBankJoin, canyonBankOn, canyonBars, canyonBreakLineZ, canyonReefSpan, canyonShape } from '../../../src/wave/Bathymetry';
import { BoussinesqSolver } from '../../../src/wave/BoussinesqSolver';
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
const seconds = Number(option('seconds') ?? 1800);
const summaryAt = Number(option('summary') ?? 600);
const offset = Number(option('offset') ?? 30);
const quiet = process.argv.includes('--quiet');
const bed = option('bed') === 'old' || option('bed') === 'b' || option('bed') === 'half' ? option('bed') as 'old' | 'b' | 'half' : undefined;
// `--join zone`: version C's bank's join by its take-off zone (`?canyonJoin=zone`, the head at ca567450), not by the bed.
const joinRule = option('join') === 'zone' ? 'zone' as const : undefined;
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
/** The crest lines: a crest point stands this many Hs above still water; points link column to column within this many m. */
const LINE_CREST_SHARE = 0.25;
const LINE_LINK = 3;
/** A crest line spans at least this many columns; its local angle is fitted over ± this many m, from at least that many points. */
const LINE_MIN_COLUMNS = 15;
const LINE_HALF_SPAN = 10;
/** Stations every this many m along shore, and the edge stations this far inside each open side edge, m. */
const STATION_STEP = 15;
const EDGE_STATION = 12;
/** A crest leaning more than this, degrees, either way over both outer thirds of the window runs two ways at once (provisional). */
const TWO_SIDED = 5;

// `--waves barrel`: the Wave Pool's Barrel floor and sizes (pool-barrel, 2026-11-01: `--swell small` 1.5 m, `--swell big` 1.8 m).
const poolWaves = spot === 'pool' && option('waves') === 'barrel' ? 'barrel' as const : undefined;
const settings = physicalSettingsFor(spot, { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday', ...(poolWaves ? { waves: poolWaves } : {}) }, { stage: 2, compute: 'cpu' });
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
  ...(bed ? { canyonBed: bed } : {}),
  ...(joinRule ? { canyonJoin: joinRule } : {}),
  ...(poolWaves ? { poolWaves } : {}),
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

const watches = [
  new Watch('edge', simulation.tank.fineFrom + 5), new Watch('take-off', takeOff.z - offset),
  ...[25, 50, 75].map((share) => new Watch(`in-${share}`, takeOff.z * (1 - share / 100))),
];

// The crest lines (see the header): stations along shore, their groups, and the bands across shore.
const windowMin = simulation.windowXMin;
const windowMax = windowMin + solver.nx * solver.dx;
const stations: number[] = [windowMin + EDGE_STATION];
for (let x = Math.ceil((windowMin + EDGE_STATION + 5) / STATION_STEP) * STATION_STEP; x <= windowMax - EDGE_STATION - 5; x += STATION_STEP) stations.push(x);
stations.push(windowMax - EDGE_STATION);
/** The Canyon's arm's footprint (its upcoast end to its taper) ± 10 m; other spots have none. */
const shape = spot === 'canyon' ? canyonShape(bed ?? 'reef') : undefined;
// The reef's footprint (version B's bowl's, canyon-b) ± 10 m.
const footprint = shape ? { from: canyonReefSpan(shape).from - 10, to: canyonReefSpan(shape).to + 10 } : undefined;
// With its beach peaks (canyon-beach-break), each bar's arms apart: its −x arm, its +x arm, the reef ('arm'), the rest open.
const bars = shape ? canyonBars(shape) : [];
const join = shape ? canyonBankJoin(shape).x : 0;
const groupOf = (x: number) => {
  if (!footprint) return 'window';
  // Version C (canyon-c): the bank, the flipped bowl, the channel, the open water past the bank's tip.
  if (canyonBankOn(shape!)) return x > bars[0].x + bars[0].plusTaper ? 'open +x' : x > join ? 'bank' : x >= canyonReefSpan(shape!).from - 2 ? 'bowl' : 'channel';
  for (const [k, bar] of bars.entries()) {
    const u = x - bar.x;
    if (u < 0 ? -u <= bar.reach + shape!.barTaper : u <= bar.plusReach + bar.plusTaper) return `${k === 0 ? 'peak −x' : 'peak +x'} ${u < 0 ? 'right arm' : 'left arm'}`;
  }
  if (bars.length && x >= footprint.from && x <= footprint.to) return 'arm';
  return bars.length ? 'open' : x < footprint.from ? 'open −x' : x > footprint.to ? 'open +x' : 'arm';
};
const stationGroups = stations.map(groupOf);
const BANDS = ['seaward', 'take-off', 'inside', 'inner'] as const;
const bandOf = (z: number) => (z < takeOff.z - 30 ? 'seaward' : z < takeOff.z ? 'take-off' : z < takeOff.z / 2 ? 'inside' : 'inner');
const outerThird = (windowMax - windowMin) / 6;
const fineRow = rowAt(simulation.tank.fineFrom + 10);
interface CrestLine { t: number; angles: number[]; zs: number[]; xFrom: number; xTo: number }
const crestLines: CrestLine[] = [];
const lineSurface = (row: number, column: number) => {
  const i = row * solver.nx + column;
  return solver.h[i] > 0.02 ? solver.surfaceAt(i) - still : Number.NaN;
};
/** Every crest line in the fine zone now: local maxima of η along z per column, linked column to column. */
function crestLinesNow(): { x: number; z: number }[][] {
  const lines: { x: number; z: number }[][] = [];
  let open: { line: { x: number; z: number }[]; z: number }[] = [];
  for (let column = 2; column < solver.nx - 2; column += 1) {
    const points: number[] = [];
    for (let row = fineRow + 2; row < solver.nz - 2; row += 1) {
      const e = lineSurface(row, column);
      if (!(e > LINE_CREST_SHARE * config.significantHeight)) continue;
      const a = lineSurface(row - 1, column), c = lineSurface(row + 1, column);
      if (!(e >= a && e > c && e >= lineSurface(row - 2, column) && e > lineSurface(row + 2, column))) continue;
      const d = a - 2 * e + c;
      const shift = d < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / d)) : 0;
      points.push(solver.zCenters[row] + shift * (solver.zCenters[row + 1] - solver.zCenters[row]));
    }
    const x = solver.xCenters[column];
    const next: typeof open = [];
    const used = new Set<number>();
    for (const o of open) {
      let best = -1;
      let bestD = LINE_LINK + 0.01;
      points.forEach((z, k) => { const d = Math.abs(z - o.z); if (!used.has(k) && d < bestD) { best = k; bestD = d; } });
      if (best >= 0) { used.add(best); o.line.push({ x, z: points[best] }); next.push({ line: o.line, z: points[best] }); }
    }
    points.forEach((z, k) => { if (!used.has(k)) { const line = [{ x, z }]; lines.push(line); next.push({ line, z }); } });
    open = next;
  }
  return lines.filter((line) => line.length >= LINE_MIN_COLUMNS);
}
/** A crest line's local angle at x, degrees (least squares over ±LINE_HALF_SPAN m), and its z there. */
function localAngle(line: { x: number; z: number }[], x: number): { angle: number; z: number } {
  const near = line.filter((p) => Math.abs(p.x - x) <= LINE_HALF_SPAN);
  if (near.length < LINE_HALF_SPAN) return { angle: Number.NaN, z: Number.NaN };
  const { slope, mz } = lineFit(near);
  const at = near.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best));
  return { angle: (Math.atan(slope) * 180) / Math.PI, z: Math.abs(at.x - x) < 0.6 ? at.z : mz };
}

// The session's health (as the size report's `--stability`).
const boussinesq = solver instanceof BoussinesqSolver ? solver : undefined;
const caps0 = boussinesq?.froudeCaps ?? 0;
const capsInWater0 = boussinesq?.froudeCapsInWater ?? 0;
const volume0 = solver.totalVolume();
let fastest = 0;
let finite = true;
console.log(`Crest angles: ${spot}, ${swellSize} (Hs ${config.significantHeight} m, Tp ${config.peakPeriod} s, ${config.directionDegrees}°, s ${config.spreading.toFixed(0)}), `
  + `seed ${seed}, ${config.componentCount} components, ${seconds} s. Take-off (${takeOff.x.toFixed(0)}, ${takeOff.z.toFixed(0)}); `
  + `lines z = ${watches.map((w) => solver.zCenters[w.row].toFixed(0)).join(', ')}; crests followed over x ${solver.xCenters[firstColumn].toFixed(0)}…${solver.xCenters[lastColumn].toFixed(0)}.`);

// The currents (bar 7): per cell, the sums of the fluxes and the depth over each 100 s window, sampled every 0.5 s.
const WINDOW = Number(option('window') ?? 100);
const SAMPLE_STEPS = 15;
const cells = solver.h.length;
const sumQx = new Float64Array(cells);
const sumQz = new Float64Array(cells);
const sumH = new Float64Array(cells);
let samples = 0;
const c = shape!;
const edgeZ = (x: number) => canyonBankEdgeZ(x, c);
const regionOf = (x: number, z: number): string | undefined => {
  if (x >= join && x <= 140 && z >= edgeZ(x) - 20 && z <= edgeZ(x) + 40) return 'bank';
  if (x >= 31 && x <= 140 && z > edgeZ(x) + 15 && z < -Math.max(c.bankInside, canyonBankEdge(x, c) + c.bankInsideOver) / c.shoreSlope - 5) return 'inside';
  const bowl = canyonReefSpan(c);
  if (x >= bowl.from && x < join && Math.abs(z - canyonBreakLineZ(x, c)) <= 30) return 'bowl';
  if (x >= -180 && x <= -75 && z >= -230 && z <= -80) return 'channel';
  return undefined;
};
const regionCells = new Map<string, number[]>();
for (let row = 0; row < solver.nz; row += 1) {
  for (let column = 0; column < solver.nx; column += 1) {
    const region = regionOf(solver.xCenters[column], solver.zCenters[row]);
    if (region) (regionCells.get(region) ?? regionCells.set(region, []).get(region)!).push(row * solver.nx + column);
  }
}
const ALONG_BANK = [-Math.SQRT1_2, Math.SQRT1_2];
interface CurrentWindow { from: number; regions: Record<string, { u: number; w: number; speed: number; alongBank: number; p90: number }>; hs: number; hsZone: number }
const currents: CurrentWindow[] = [];
const takeOffColumn = columnAt(takeOff.x);
const takeOffRow = rowAt(takeOff.z);
const zoneRow = rowAt(simulation.tank.zoneInner + 20);
let etaTake: number[] = [];
let etaZone: number[] = [];
const std = (values: number[]) => { const m = values.reduce((a, b) => a + b, 0) / values.length; return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length); };
function closeWindow(from: number): void {
  const regions: CurrentWindow['regions'] = {};
  for (const [name, list] of regionCells) {
    let u = 0; let w = 0; let speed = 0; let along = 0; let n = 0;
    const speeds: number[] = [];
    for (const i of list) {
      const h = sumH[i] / samples;
      if (!(h > 0.05)) continue;
      const cu = sumQx[i] / samples / h;
      const cw = sumQz[i] / samples / h;
      u += cu; w += cw; speed += Math.hypot(cu, cw); along += cu * ALONG_BANK[0] + cw * ALONG_BANK[1]; n += 1;
      speeds.push(Math.hypot(cu, cw));
    }
    speeds.sort((a, b) => a - b);
    regions[name] = { u: u / n, w: w / n, speed: speed / n, alongBank: along / n, p90: speeds[Math.floor(0.9 * speeds.length)] ?? Number.NaN };
  }
  currents.push({ from, regions, hs: 4 * std(etaTake), hsZone: 4 * std(etaZone) });
  sumQx.fill(0); sumQz.fill(0); sumH.fill(0); samples = 0; etaTake = []; etaZone = [];
}
let summaryHealth: { fastest: number; finite: boolean; caps: number; capsInWater: number; volumeDrift: number } | undefined;

const crests: Crest[] = [];
const start = simulation.seaTime;
const steps = Math.round(seconds / STEP);
const perSecond = Math.round(1 / STEP);
for (let step = 0; step < steps; step += 1) {
  simulation.step(STEP);
  const now = simulation.seaTime - start;
  if (now <= summaryAt) for (const watch of watches) watch.sample(crests);
  if ((step + 1) % SAMPLE_STEPS === 0) {
    for (let i = 0; i < cells; i += 1) { sumQx[i] += solver.qx[i]; sumQz[i] += solver.qz[i]; sumH[i] += solver.h[i]; }
    samples += 1;
    etaTake.push(solver.surfaceAt(takeOffRow * solver.nx + takeOffColumn) - still);
    etaZone.push(solver.surfaceAt(zoneRow * solver.nx + takeOffColumn) - still);
  }
  if ((step + 1) % Math.round(WINDOW / STEP) === 0) {
    closeWindow(Math.round(now) - WINDOW);
    const last = currents.at(-1)!;
    console.log(`  ${last.from}–${last.from + WINDOW} s: ${Object.entries(last.regions).map(([name, r]) => `${name} u ${r.u.toFixed(2)} w ${r.w.toFixed(2)} |v| ${r.speed.toFixed(2)} (p90 ${r.p90.toFixed(2)})${name === 'bank' || name === 'inside' ? ` along ${r.alongBank.toFixed(2)}` : ''}`).join('; ')} m/s; `
      + `Hs take-off ${last.hs.toFixed(2)} m, zone ${last.hsZone.toFixed(2)} m (${(last.hs / last.hsZone).toFixed(3)}); ${((Date.now() - started) / 1000).toFixed(0)} s wall`);
  }
  if (summaryHealth === undefined && now >= summaryAt) {
    summaryHealth = { fastest, finite, caps: (boussinesq?.froudeCaps ?? 0) - caps0, capsInWater: (boussinesq?.froudeCapsInWater ?? 0) - capsInWater0, volumeDrift: solver.totalVolume() / volume0 - 1 };
  }
  if (step % 10 === 0) {
    for (let i = 0; i < solver.h.length; i += 1) {
      const h = solver.h[i];
      if (!Number.isFinite(h)) finite = false;
      if (h > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / h);
    }
  }
  if ((step + 1) % perSecond === 0 && now <= summaryAt) {
    for (const line of crestLinesNow()) {
      const local = stations.map((x) => localAngle(line, x));
      if (local.every((l) => !Number.isFinite(l.angle))) continue;
      crestLines.push({
        t: simulation.seaTime, angles: local.map((l) => Math.round(l.angle * 100) / 100), zs: local.map((l) => Math.round(l.z * 10) / 10),
        xFrom: line[0].x, xTo: line[line.length - 1].x,
      });
    }
  }
}
const health = {
  fastest, finite, caps: (boussinesq?.froudeCaps ?? 0) - caps0, capsInWater: (boussinesq?.froudeCapsInWater ?? 0) - capsInWater0,
  volumeDrift: solver.totalVolume() / volume0 - 1,
};

const mean = (values: number[]) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : Number.NaN);
interface Summary {
  line: string; crests: number; short: number; meanAngle: number; meanAbs: number; maxAbs: number; std: number;
  firstAbs: number; laterAbs: number; straightness: number;
  /** Over the crests whose halves both gave an angle: how many, and their bend's mean and largest |right − left|, degrees. */
  halved: number; meanBend: number; maxBend: number;
  /** Each 100 s: the crests' mean |angle| and mean angle (signed), degrees. */
  bins: { from: number; meanAbs: number; mean: number; crests: number }[];
}
const summaries: Summary[] = watches.map(({ name, short }) => {
  const mine = crests.filter((crest) => crest.line === name);
  const angles = mine.map((crest) => crest.angle);
  const abs = angles.map(Math.abs);
  const bins: Summary['bins'] = [];
  for (let from = 0; from < summaryAt; from += 100) {
    const binned = mine.filter((crest) => crest.t - start >= from && crest.t - start < from + 100).map((crest) => crest.angle);
    bins.push({ from, meanAbs: mean(binned.map(Math.abs)), mean: mean(binned), crests: binned.length });
  }
  const bends = mine.map((crest) => Math.abs(crest.right - crest.left)).filter(Number.isFinite);
  return {
    line: name, crests: mine.length, short, meanAngle: mean(angles), meanAbs: mean(abs), maxAbs: abs.length ? Math.max(...abs) : Number.NaN,
    std: std(angles), firstAbs: mean(abs.slice(0, FIRST_WAVES)), laterAbs: mean(abs.slice(FIRST_WAVES)),
    straightness: mean(mine.map((crest) => crest.residual)),
    halved: bends.length, meanBend: mean(bends), maxBend: bends.length ? Math.max(...bends) : Number.NaN, bins,
  };
});
const f = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
console.log(`\n${((Date.now() - started) / 1000).toFixed(0)} s elapsed.`);
console.log('| Line | Crests (short) | Mean angle ° | Mean \\|angle\\| ° | Max \\|angle\\| ° | Std ° | First 3 \\|angle\\| ° | Later \\|angle\\| ° | Straightness m | \\|angle\\| per 100 s ° '
  + '| Bend mean / max \\|right − left\\| ° (crests) | Mean angle per 100 s ° |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const s of summaries) {
  console.log(`| ${s.line} | ${s.crests} (${s.short}) | ${f(s.meanAngle)} | ${f(s.meanAbs)} | ${f(s.maxAbs)} | ${f(s.std)} | ${f(s.firstAbs)} | ${f(s.laterAbs)} | ${f(s.straightness, 2)} | ${s.bins.map((b) => f(b.meanAbs)).join(' · ')} `
    + `| ${f(s.meanBend)} / ${f(s.maxBend)} (${s.halved}) | ${s.bins.map((b) => f(b.mean)).join(' · ')} |`);
}

// The crest lines by band and station group, the edge chevrons and the crests running two ways at once.
const quantile = (values: number[], q: number) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : Number.NaN;
};
const groups = [...new Set(stationGroups)];
console.log(`\nCrest lines every second: ${crestLines.length} over the first ${summaryAt} s; stations ${stations.map((x) => x.toFixed(0)).join(', ')} `
  + `(${groups.map((g) => `${g}: ${stations.filter((_, i) => stationGroups[i] === g).map((x) => x.toFixed(0)).join(' ')}`).join('; ')}). |angle| p50 / p90 °:`);
console.log(`| Band | ${groups.join(' | ')} | Edge chevron −x / +x (2 \\|angle\\| at x ${stations[0].toFixed(0)} / ${stations[stations.length - 1].toFixed(0)}) `
  + `| Signed median, outer thirds −x / +x (a V: − / +) | Two-sided (outer thirds past ±${TWO_SIDED}°) |`);
console.log(`|---|${groups.map(() => '---').join('|')}|---|---|---|`);
const bandOf2 = (line: CrestLine, i: number) => (Number.isFinite(line.zs[i]) ? bandOf(line.zs[i]) : undefined);
// (Each station's angle counts in the band of the crest's z there.)
for (const band of BANDS) {
  const cell = (g: string) => {
    const values = crestLines.flatMap((line) => stations.map((_, i) => (stationGroups[i] === g && bandOf2(line, i) === band ? Math.abs(line.angles[i]) : Number.NaN)));
    return `${f(quantile(values, 0.5))} / ${f(quantile(values, 0.9))} (${values.filter(Number.isFinite).length})`;
  };
  const edge = (i: number) => crestLines.map((line) => (bandOf2(line, i) === band ? 2 * Math.abs(line.angles[i]) : Number.NaN));
  const last = stations.length - 1;
  // A crest's lean over each outer third of the window; the crest's band is its mean z's over its stations.
  const lean = (line: CrestLine, side: -1 | 1) => {
    const values = stations.flatMap((x, i) => (side * x > outerThird ? [line.angles[i]] : [])).filter(Number.isFinite);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : Number.NaN;
  };
  const meanZ = (line: CrestLine) => { const zs = line.zs.filter(Number.isFinite); return zs.reduce((a, b) => a + b, 0) / zs.length; };
  const inBand = crestLines.filter((line) => bandOf(meanZ(line)) === band && Number.isFinite(lean(line, -1)) && Number.isFinite(lean(line, 1)));
  const twoSided = inBand.filter((line) => Math.sign(lean(line, -1)) !== Math.sign(lean(line, 1)) && Math.abs(lean(line, -1)) > TWO_SIDED && Math.abs(lean(line, 1)) > TWO_SIDED);
  const signed = (side: -1 | 1) => quantile(crestLines.flatMap((line) => stations.map((x, i) => (side * x > outerThird && bandOf2(line, i) === band ? line.angles[i] : Number.NaN))), 0.5);
  console.log(`| ${band} | ${groups.map(cell).join(' | ')} | ${f(quantile(edge(0), 0.5))} / ${f(quantile(edge(0), 0.9))} · ${f(quantile(edge(last), 0.5))} / ${f(quantile(edge(last), 0.9))} `
    + `| ${f(signed(-1))} / ${f(signed(1))} | ${twoSided.length} of ${inBand.length} |`);
}
if (summaryHealth) console.log(`\nHealth over the first ${summaryAt} s: fastest water ${summaryHealth.fastest.toFixed(2)} m/s; Froude caps ${summaryHealth.caps} (${summaryHealth.capsInWater} in water); volume ${(100 * summaryHealth.volumeDrift).toFixed(2)} %; finite ${summaryHealth.finite}.`);
console.log(`\nThe current, every ${WINDOW} s (mean flow per cell, averaged over each region's wet cells, m/s):`);
for (const w of currents) {
  console.log(`| ${w.from}–${w.from + WINDOW} s | ${Object.entries(w.regions).map(([name, r]) => `${name}: u ${r.u.toFixed(2)}, w ${r.w.toFixed(2)}, |v| ${r.speed.toFixed(2)} (p90 ${r.p90.toFixed(2)})${name === 'bank' || name === 'inside' ? `, along the bank ${r.alongBank.toFixed(2)}` : ''}`).join(' | ')} | Hs ${w.hs.toFixed(2)} / ${w.hsZone.toFixed(2)} = ${(w.hs / w.hsZone).toFixed(3)} |`);
}
console.log(`\nHealth over ${seconds} s: fastest water ${health.fastest.toFixed(2)} m/s; Froude caps ${health.caps} (${health.capsInWater} in water); volume ${(100 * health.volumeDrift).toFixed(2)} %; finite ${health.finite}.`);

const json = option('json');
if (json) {
  writeFileSync(json, JSON.stringify({
    spot, swell: swellSize, seed, seconds, config: { ...config }, takeOff, summaries, crests,
    lines: { stations, groups: stationGroups, outerThird, bands: { takeOffZ: takeOff.z }, records: crestLines }, health, summaryHealth, currents,
  }));
  console.log(`Wrote ${json}.`);
}
