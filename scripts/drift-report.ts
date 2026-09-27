/**
 * Drift report (spec N1, the drift gate): how far two players' copies of one
 * room's sea drift apart. Every player builds the same stage 2 surf zone from
 * the room's seed and clock, but their water is never bit-identical: GPUs
 * round differently, each player's own board pushes on their own water, and a
 * late joiner starts from a fresh warm start instead of the sea's history.
 * Each copy below differs from the reference in one of those ways, and the
 * report compares where and when each wave starts breaking at the take-off.
 *
 *   npm run report:drift
 *   npm run report:drift -- --seconds 60 --join-at 20 --out /tmp/drift.md   (a quick check)
 */
import { writeFileSync } from 'node:fs';
import { Autopilot } from '../src/dev/Autopilot';
import type { SurfConditions } from '../src/game/SurfConditions';
import { roomSurfZoneConfig } from '../src/net/roomSea';
import type { SpotName } from '../src/wave/Bathymetry';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../src/wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import type { RideInput } from '../src/physics/RideSession';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const seconds = Number(option('seconds') ?? 240);
const joinAt = Number(option('join-at') ?? 90);
const seed = Number(option('seed') ?? 7);
const spot = (option('spot') ?? 'canyon') as SpotName;
const output = option('out') ?? 'docs/research/drift-report.md';
const conditions: SurfConditions = { swell: (option('swell') ?? 'medium') as SurfConditions['swell'], tide: 'mid', wind: 'calm', time: 'midday' };

/** Breaking this strong marks a breaking cell (the breaking model's own "breaking here"). */
const BREAKING = 0.3;
/** The take-off band searched for the breaking edge: m seaward and shoreward of the break line. */
const BAND = { seaward: 40, shoreward: 30 };
/** Columns watched: the take-off's, and this far either side, m. */
const COLUMN_OFFSETS = [-20, 0, 20];
/** A breaking edge that jumps this far seaward is a new wave starting to break, m. */
const NEW_BREAK_JUMP = 3;
/** A column quiet this long before breaking again counts a new onset, s. */
const QUIET = 0.5;
/** Onsets further apart than this are different waves, s. */
const MATCH_WINDOW = 2;
/** The gate (spec N1): every wave breaks within these of the reference. */
const PASS = { dt: 0.2, dz: 1 };

interface Onset { t: number; z: number; column: number }

/** One copy of the sea, and the breaking onsets it recorded at the take-off columns. */
class Copy {
  readonly runner: SurfZoneRunner;
  readonly onsets: Onset[] = [];
  private readonly columns: number[];
  private readonly rows: number[];
  private readonly lastEdge: number[];
  private readonly lastBreaking: number[];
  private autopilot?: Autopilot;
  private input: RideInput = { paddle: false, popUp: false, steer: 0 };
  private retry = false;
  private peelDirection = 0;
  private peelClock = Infinity;

  constructor(readonly name: string, config: SurfZoneConfig, readonly options: { rider?: boolean; round?: boolean; from?: number } = {}) {
    this.runner = new SurfZoneRunner(config, { rider: options.rider });
    const { solver } = this.runner.simulation;
    const { focus } = this.runner;
    this.columns = COLUMN_OFFSETS.map((offset) => nearest(solver.xCenters, focus.x + offset));
    this.rows = [];
    for (let row = 0; row < solver.nz; row += 1) {
      const z = solver.zCenters[row];
      if (z >= focus.z - BAND.seaward && z <= focus.z + BAND.shoreward) this.rows.push(row);
    }
    this.lastEdge = this.columns.map(() => Number.NaN);
    this.lastBreaking = this.columns.map(() => -Infinity);
    if (options.rider) this.autopilot = new Autopilot({ rise: 0.25 * config.significantHeight });
  }

  get seaTime(): number {
    return this.runner.simulation.seaTime;
  }

  step(): void {
    const { runner } = this;
    runner.advance(1, { ...this.input, retry: this.retry });
    this.retry = false;
    if (this.options.round) roundToFloat32(runner);
    if (this.autopilot) this.drive();
    this.record();
  }

  /** The autopilot paddles, catches and rides as a player would, pushing on this copy's water. */
  private drive(): void {
    const { runner, autopilot } = this;
    const session = runner.session;
    const wave = runner.waveFrame;
    if (!autopilot || !session || !wave) return;
    this.peelClock += SURF_ZONE_STEP;
    if (this.peelClock >= 1) {
      this.peelClock = 0;
      this.peelDirection = runner.simulation.peelEstimate()?.direction ?? 0;
    }
    const { board } = session;
    const ride = {
      phase: session.phase, speed: Math.hypot(board.velocity.x, board.velocity.z), boardSpeed: board.velocity.length(),
      cue: session.rider.popUpCue, popUp: { ...session.rider.popUpReport }, separation: session.separation, resets: 0, wave,
      balance: session.phase === 'fallen' ? 0 : session.rider.balanceReserve,
    };
    let crest = -Infinity;
    for (let back = 2; back <= 14; back += 2) crest = Math.max(crest, runner.water.surfaceAt(board.position.x, board.position.z - back));
    this.input = autopilot.next({
      ride, peelDirection: this.peelDirection, board: { x: board.position.x, z: board.position.z, heading: session.heading },
      focusZ: runner.focus.z, crestBehind: crest - runner.config.tide,
    }, SURF_ZONE_STEP);
    if (autopilot.state === 'done') {
      autopilot.reset();
      this.input = { paddle: false, popUp: false, steer: 0 };
      this.retry = true;
    }
  }

  /** Each column's breaking edge (its most seaward breaking cell in the band), and the onsets of new breaks. */
  private record(): void {
    const { solver, breaking } = this.runner.simulation;
    const t = this.seaTime;
    this.columns.forEach((column, c) => {
      let edge = Number.NaN;
      for (const row of this.rows) {
        if (breaking.strength[row * solver.nx + column] > BREAKING) {
          edge = solver.zCenters[row];
          break;
        }
      }
      const previous = this.lastEdge[c];
      if (Number.isFinite(edge)) {
        const fresh = !Number.isFinite(previous) && t - this.lastBreaking[c] > QUIET;
        const jump = Number.isFinite(previous) && edge < previous - NEW_BREAK_JUMP;
        if (fresh || jump) this.onsets.push({ t, z: edge, column: c });
        this.lastBreaking[c] = t;
      }
      this.lastEdge[c] = edge;
    });
  }
}

function nearest(values: ArrayLike<number>, target: number): number {
  let best = 0;
  for (let i = 1; i < values.length; i += 1) if (Math.abs(values[i] - target) < Math.abs(values[best] - target)) best = i;
  return best;
}

/** The GPU tier steps in 32-bit floats: round the solver's state as a GPU's would be. */
function roundToFloat32(runner: SurfZoneRunner): void {
  const { solver } = runner.simulation;
  for (const field of [solver.h, solver.qx, solver.qz]) {
    for (let i = 0; i < field.length; i += 1) field[i] = Math.fround(field[i]);
  }
}

/** RMS surface difference over the fine surf zone, as a fraction of Hs. */
function surfaceDifference(a: Copy, b: Copy, significantHeight: number): number {
  const sa = a.runner.simulation.solver;
  const sb = b.runner.simulation.solver;
  let sum = 0;
  let count = 0;
  for (let row = 0; row < sa.nz; row += 1) {
    if (sa.zCenters[row] < -150) continue;
    for (let column = 0; column < sa.nx; column += 1) {
      const i = row * sa.nx + column;
      if (sa.h[i] <= 0.01 || sb.h[i] <= 0.01) continue;
      const d = sa.surfaceAt(i) - sb.surfaceAt(i);
      sum += d * d;
      count += 1;
    }
  }
  return count ? Math.sqrt(sum / count) / significantHeight : Number.NaN;
}

interface Comparison { name: string; matched: number; missing: number; extra: number; dts: number[]; dzs: number[]; pass: boolean }

function compare(reference: Copy, other: Copy, from: number): Comparison {
  const mine = reference.onsets.filter((onset) => onset.t >= from);
  const theirs = other.onsets.filter((onset) => onset.t >= from);
  const used = new Set<Onset>();
  const dts: number[] = [];
  const dzs: number[] = [];
  let missing = 0;
  for (const onset of mine) {
    let best: Onset | undefined;
    for (const candidate of theirs) {
      if (candidate.column !== onset.column || used.has(candidate)) continue;
      if (Math.abs(candidate.t - onset.t) > MATCH_WINDOW) continue;
      if (!best || Math.abs(candidate.t - onset.t) < Math.abs(best.t - onset.t)) best = candidate;
    }
    if (!best) {
      missing += 1;
      continue;
    }
    used.add(best);
    dts.push(Math.abs(best.t - onset.t));
    dzs.push(Math.abs(best.z - onset.z));
  }
  const extra = theirs.length - used.size;
  const pass = missing === 0 && extra === 0 && dts.every((dt) => dt <= PASS.dt) && dzs.every((dz) => dz <= PASS.dz);
  return { name: other.name, matched: dts.length, missing, extra, dts, dzs, pass };
}

const median = (values: number[]) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const max = (values: number[]) => (values.length ? Math.max(...values) : Number.NaN);
const fixed = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

const room = { spot, conditions, seed };
const base = roomSurfZoneConfig(room, 0, 'cpu');
const started = Date.now();
console.log(`Drift report: ${spot}, ${conditions.swell}, seed ${seed}, ${seconds} s of sea, joiners at ${joinAt} s.`);
const copies = [
  new Copy('reference', base),
  new Copy('32-bit state (GPU-like)', base, { round: true }),
  new Copy('a paddler pushing on the water', base, { rider: true }),
];
const joiners: Copy[] = [];
const differences = new Map<string, { t: number; rms: number }[]>();
const reference = copies[0];
const pending = [
  { name: 'joined late, default spin-up', config: { ...base, startSeaTime: joinAt } },
  { name: 'joined late, 6-period spin-up', config: { ...base, startSeaTime: joinAt, spinUpPeriods: 6 } },
];
let nextSample = 0;
let nextLog = 0;
while (reference.seaTime < seconds - 1e-6) {
  for (const copy of copies) copy.step();
  for (const joiner of joiners) joiner.step();
  if (pending.length && reference.seaTime >= joinAt - 1e-6) {
    for (const join of pending.splice(0)) {
      const joiner = new Copy(join.name, join.config, { from: joinAt });
      if (Math.abs(joiner.seaTime - reference.seaTime) > 1e-6) throw new Error(`${join.name} joined at ${joiner.seaTime}, not ${reference.seaTime}`);
      joiners.push(joiner);
    }
  }
  if (reference.seaTime >= nextSample - 1e-6) {
    for (const other of [...copies.slice(1), ...joiners]) {
      const series = differences.get(other.name) ?? [];
      series.push({ t: reference.seaTime, rms: surfaceDifference(reference, other, base.significantHeight) });
      differences.set(other.name, series);
    }
    nextSample += 10;
  }
  if (reference.seaTime >= nextLog - 1e-6) {
    console.log(`  sea ${reference.seaTime.toFixed(0)} s · ${((Date.now() - started) / 1000).toFixed(0)} s elapsed · onsets ${reference.onsets.length}`);
    nextLog += 30;
  }
}

const comparisons = [
  ...copies.slice(1).map((copy) => compare(reference, copy, 0)),
  ...joiners.map((joiner) => compare(reference, joiner, joinAt)),
];
const passAll = comparisons.every((comparison) => comparison.pass);
const lines = [
  '# Drift report (N1 drift gate)',
  '',
  `Generated by \`npm run report:drift\` on ${new Date().toISOString().slice(0, 10)}: the ${spot} room sea (${conditions.swell} swell, mid tide, calm, seed ${seed}, stage 2 on the CPU, ${base.componentCount} components), ${seconds} s of sea; late joiners built at ${joinAt} s. Took ${((Date.now() - started) / 60000).toFixed(1)} min.`,
  '',
  `Each copy differs from the reference in one way. Breaking onsets are counted on three columns (the take-off's x = ${fixed(reference.runner.focus.x, 0)} m and ±20 m), where the most seaward cell with breaking strength over ${BREAKING} within ${BAND.seaward} m seaward and ${BAND.shoreward} m shoreward of the break line (z = ${fixed(reference.runner.focus.z, 0)} m) first appears or jumps ${NEW_BREAK_JUMP} m seaward. The reference recorded ${reference.onsets.length} onsets. **Pass line** (spec N1): every onset matched within ${MATCH_WINDOW} s, and within ${PASS.dt} s and ${PASS.dz} m.`,
  '',
  '| Copy | Onsets matched | Missing / extra | Median \\|Δt\\| s | Max \\|Δt\\| s | Median \\|Δz\\| m | Max \\|Δz\\| m | Gate |',
  '|---|---|---|---|---|---|---|---|',
  ...comparisons.map((c) => `| ${c.name} | ${c.matched} | ${c.missing} / ${c.extra} | ${fixed(median(c.dts))} | ${fixed(max(c.dts))} | ${fixed(median(c.dzs))} | ${fixed(max(c.dzs))} | ${c.pass ? 'pass' : '**fail**'} |`),
  '',
  `**Overall: ${passAll ? 'pass' : 'fail'}.**`,
  '',
  '## Surface difference',
  '',
  'RMS surface difference from the reference over the fine surf zone (z ≥ −150 m), as a fraction of Hs, every 10 s of sea.',
  '',
  `| Sea time s | ${[...differences.keys()].join(' | ')} |`,
  `|---|${[...differences.keys()].map(() => '---').join('|')}|`,
];
const times = [...new Set([...differences.values()].flatMap((series) => series.map((sample) => Math.round(sample.t))))].sort((a, b) => a - b);
for (const t of times) {
  lines.push(`| ${t} | ${[...differences.values()].map((series) => fixed(series.find((sample) => Math.round(sample.t) === t)?.rms ?? Number.NaN, 4)).join(' | ')} |`);
}
lines.push(
  '',
  '## Caveats',
  '',
  '- The GPU tier computes in 32-bit floats throughout; here only the state is rounded after each step, a smaller but continuous difference. Chaotic growth, not the size of the first difference, decides the drift.',
  '- A paddler\'s push is one board; a crowded room carries up to 50, and online each player also applies everyone else\'s pushes.',
  '',
);
writeFileSync(output, lines.join('\n'));
console.log(lines.slice(6, 7 + comparisons.length + 2).join('\n'));
console.log(`Wrote ${output}.`);
