import { appendFileSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { crestMotion } from '../CrestKinematics';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import type { CrestTrack, FrontOptions, FrontPoint } from '../barrel/BreakingFront';
import { columnCrests, type CrestSample } from '../barrel/crestOnset';
import { FRONT_CAPACITY, FRONT_STRIDE, writeFrontRecords } from '../barrel/frontRecords';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { LANDMARK } from '../barrel/ProfileLibrary';
import { onsetTiming } from '../barrel/sliceClock';
import { BARREL_SLOPE, LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from '../barrel/sweptLoft';
import { PADANG_FRONT, SurfZoneSimulation, barrelFrontFrom, edgeHeight } from '../SurfZoneSimulation';
import { sampleSurfaceHeight } from '../../scene/WaterSurface';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';
import { formatFastFronts, logPoints, type FastFront, type FastPoint, type PointLog } from './fastFrontDump';

const quantiles = (values: number[], digits = 2) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits)).join(' / ') + ` (max ${sorted.at(-1)!.toFixed(digits)}, n ${sorted.length})`;
};
const fixed = (value: number | null | undefined, digits = 2) => (value === null || value === undefined || !Number.isFinite(value) ? '·' : value.toFixed(digits));
const tally = <K extends string>(counts: Partial<Record<K, number>>, key: K, n = 1) => { counts[key] = (counts[key] ?? 0) + n; };
const listed = (counts: Partial<Record<string, number>>) => Object.entries(counts).sort((p, q) => (q[1] ?? 0) - (p[1] ?? 0)).map(([k, n]) => `${k} ${n}`).join(', ') || '—';

/** A slice weight this high stands the profile up off the water: a tongue as drawn (the padangCurl probe's). */
const STANDING = 0.5;
/** Two tongues, or two fronts' facing ends, this close (m) read as neighbours in a clip (the padangCurl probe's). */
const NEIGHBOUR = 12;
/** Crests in columns this many apart link into one crest line (a wave) within this much z per column, m. */
const LINE_SKIP = 3;
const LINE_REACH = 3;
/**
 * The coordinator's candidate link by clock compatibility, s/m: two fronts' facing ends whose joins differ by at most this
 * much per metre between them (2 × the 0.083 s/m the fronts' own joins peel at on the old base), within the jump reach.
 */
const CLOCK_LINK = 2 * 0.083;
/** A front's onsets are fitted over this much σ next to its end, m. */
const END_FIT = 5;
/** The front's own reaches (BreakingFront): a point matched within 3 m on a 1 m grid, a track within 10 m; held 0.5 s. */
const MATCH = 3;
const TRACK = 10;
const HOLD = 0.5;
/** A crest dropped this long ago can still be the one a new crest in its column restarts, s; it may have come this fast, m/s. */
const RESTART_MEMORY = 2;
const RESTART_PACE = 6;

/**
 * One column's crest as this probe follows it: its own copy of the front's tracking (nearest within 10 m, 3 m once on
 * a front; dropped 0.5 s unseen), sized as the front sizes a track (its height when first seen at most h0 deep, if then
 * within a metre of h0), and never dropped for crossing its throw depth unbroken, so a gap's crest keeps its history.
 */
interface ColumnCrest {
  column: number;
  z: number;
  seen: number;
  born: number;
  /** Whether it has been seen at most h0 deep (where the front first follows it), and its height then if within the foot band. */
  shallow: boolean;
  footHeight: number | null;
  refHeight: number | null;
  depth: number;
  /** When it crossed its join depth (by its height over the band), s; when the solver first broke its segment, and how deep it was then. */
  crossedJoin: number | null;
  firstBreak: number | null;
  firstBreakDepth: number | null;
  /** It reached its throw depth with its segment never broken: the front drops such a track as unbroken. */
  passedUnbroken: boolean;
  /** When a front point first stood on it, s. */
  onFront: number | null;
  /**
   * A sized crest in its column it restarted: one still seen when this one was first seen within 10 m (the face's maximum
   * jumped ahead, `jump`), or one dropped unseen in the last 2 s (`lost`); null when there was none.
   */
  predecessor: ColumnCrest | null;
  restart: 'jump' | 'lost' | null;
  /** With the jump rule: how often it continued as a crest ahead of the one nearest it, the last time, and whether it crossed its join depth in that step. */
  jumps: number;
  jumpedAt: number | null;
  joinAtJump: boolean;
}

interface Front {
  id: number;
  points: FrontPoint[];
  firstColumn: number;
  lastColumn: number;
  wave: number;
}

/**
 * A gap column's state: a front point held unseen (`flicker`) or a one-point front; a crest the front still follows,
 * sized, toward its join (`waiting-…`: the band, the join depth, the solver's break); a sized crest that crossed its
 * throw depth unbroken (dropped as `unbroken`); a crest whose sized track the front lost, restarted unsized after the
 * face's maximum jumped ahead in its column (`restarted-jump`; `restarted-point` when the crest it left was a front
 * point's, which the jump rule does not follow) or after it went unseen (`restarted-lost`), or one this
 * probe still follows sized where the front's track is gone or unsized (`front-lost`); a crest never sized (first seen
 * past the foot band); or no crest on the wave's line in that column.
 */
type Category = 'flicker' | 'single' | 'waiting-band' | 'waiting-join' | 'waiting-break' | 'unbroken' | 'restarted-point' | 'restarted-jump' | 'restarted-lost' | 'front-lost' | 'never-sized' | 'none';
const PRIORITY: readonly Category[] = ['restarted-point', 'restarted-jump', 'restarted-lost', 'front-lost', 'unbroken', 'never-sized', 'waiting-band', 'waiting-join', 'waiting-break', 'flicker', 'single', 'none'];
type Adjacent = 'split' | 'reach' | 'other';

interface PairLife {
  a: number;
  b: number;
  first: number;
  last: number;
  frames: number;
  gapColumns: number[];
  gapMetres: number[];
  categories: Partial<Record<Category, number>>;
  adjacent: Partial<Record<Adjacent, number>>;
  /** The facing ends at the first frame. */
  opening: string;
  /** Whether either facing end's crest restarted (re-sized after a jump or loss). */
  endRestarted: boolean;
  /** The first frame's s/m across the facing ends, and its two sides' fits carried to the gap's middle, s. */
  rate: number;
  fitGap: number;
  /** The first frame's gap over the facing ends' larger crest height now (η), larger foot height and larger wave height (crest over trough). */
  overHeight: number;
  overFoot: number;
  overWave: number;
  /**
   * Pair-frames where the coordinator's clock link would join the two fronts (facing ends within the jump reach, their
   * joins within CLOCK_LINK s/m of their distance), and where the gap was one column (and of those, linkable).
   */
  linkFrames: number;
  oneColumnFrames: number;
  oneColumnLinkFrames: number;
  crests: Map<number, ColumnCrest>;
  aEnd: number;
  bEnd: number;
  /** The facing ends' mean join at the first frame, s: the gap crests' times are logged from it. */
  meanJoin: number;
  /** How it ended: the two ends on one front (merged), on two fronts no longer end to end (apart), or an end gone. */
  ended: string;
  /** For a merged pair: whether its two ends' own link is past the front's old rules (beyond the 3-row reach or across a gap), so the clock link made it. */
  byClock: boolean;
}

/** Union–find over the step's crest samples: crest lines, each a wave. */
function crestLines(samples: readonly CrestSample[], count: number): Int32Array {
  const parent = new Int32Array(count);
  for (let k = 0; k < count; k += 1) parent[k] = k;
  const find = (k: number): number => {
    while (parent[k] !== k) {
      parent[k] = parent[parent[k]];
      k = parent[k];
    }
    return k;
  };
  const byColumn = new Map<number, number[]>();
  for (let k = 0; k < count; k += 1) {
    const list = byColumn.get(samples[k].column);
    if (list) list.push(k);
    else byColumn.set(samples[k].column, [k]);
  }
  for (let k = 0; k < count; k += 1) {
    const s = samples[k];
    for (let back = 1; back <= LINE_SKIP; back += 1) {
      let best = -1;
      for (const j of byColumn.get(s.column - back) ?? []) {
        if (Math.abs(samples[j].z - s.z) < LINE_REACH * back && (best < 0 || Math.abs(samples[j].z - s.z) < Math.abs(samples[best].z - s.z))) best = j;
      }
      if (best >= 0) {
        parent[find(k)] = find(best);
        break;
      }
    }
  }
  const out = new Int32Array(count);
  for (let k = 0; k < count; k += 1) out[k] = find(k);
  return out;
}

/** The least-squares slope of t on s and its r², from paired values. */
function fit(s: readonly number[], t: readonly number[]): { slope: number; r2: number; at: (x: number) => number } {
  const n = s.length;
  const ms = s.reduce((a, b) => a + b, 0) / n;
  const mt = t.reduce((a, b) => a + b, 0) / n;
  let sss = 0;
  let sst = 0;
  let stt = 0;
  for (let k = 0; k < n; k += 1) {
    sss += (s[k] - ms) ** 2;
    sst += (s[k] - ms) * (t[k] - mt);
    stt += (t[k] - mt) ** 2;
  }
  const slope = sss > 1e-9 ? sst / sss : 0;
  return { slope, r2: sss > 1e-9 && stt > 1e-12 ? (sst * sst) / (sss * stt) : 0, at: (x: number) => mt + slope * (x - ms) };
}

/** The crest landmark's world (x, z) of a slice. */
function crestOf(loft: LoftResult, slice: number): [number, number] {
  const v = slice * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest;
  return [loft.positions[3 * v], loft.positions[3 * v + 2]];
}

interface Tongue {
  front: number;
  first: number;
  last: number;
}

/** Maximal runs of joined slices of one front all standing (weight ≥ STANDING): the padangCurl probe's tongues. */
function tongues(loft: LoftResult): Tongue[] {
  const out: Tongue[] = [];
  let open: Tongue | undefined;
  for (let s = 0; s < loft.sliceCount; s += 1) {
    const standing = loft.sliceWeight[s] >= STANDING;
    const continues = open !== undefined && loft.sliceFront[s] === open.front && loft.sliceJoined[s - 1] === 1;
    if (open && (!standing || !continues)) {
      out.push(open);
      open = undefined;
    }
    if (!standing) continue;
    open ??= { front: loft.sliceFront[s], first: s, last: s };
    open.last = s;
  }
  if (open) out.push(open);
  return out;
}

/** Nearest crest-to-crest distance between two tongues, m, split across the first's ray and along it. */
function separation(loft: LoftResult, a: Tongue, b: Tongue): { distance: number; across: number; along: number } {
  let best = { distance: Infinity, across: 0, along: 0 };
  for (let i = a.first; i <= a.last; i += 1) {
    const [ax, az] = crestOf(loft, i);
    for (let j = b.first; j <= b.last; j += 1) {
      const [bx, bz] = crestOf(loft, j);
      const dx = bx - ax;
      const dz = bz - az;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < best.distance) {
        const across = dx * loft.sliceRayX[i] + dz * loft.sliceRayZ[i];
        best = { distance, across: Math.abs(across), along: Math.sqrt(Math.max(0, distance * distance - across * across)) };
      }
    }
  }
  return best;
}

/**
 * Padang Padang's split fronts (the padangCurl finding: one breaking crest drawn as two fronts end to end, about 5 m
 * apart). Each step it links the solver's crests column to column into crest lines (waves, whatever breaks), puts each
 * front on its wave, and for each pair of fronts end to end on one wave logs the gap along the crest, the facing ends'
 * joins, throws and clocks, the two sides' onset fits carried into the gap, and what the gap's columns hold (`Category`).
 * Facing ends in neighbouring columns were refused a link: by the 1 s/m split rule, or by the link's reach in z. It
 * follows every column's crest itself, so a gap's crests say whether and when the solver broke them, against their
 * throw depth, and whether their sized track was lost to a jump of the face's maximum. It also logs the before/after
 * yardsticks: fronts per wave, end-to-end pairs, the drawn curl's tongues (as padangCurl) and the peel along the fronts
 * and the waves. Its own crests follow a sized crest's jumps as the front does (`FrontOptions.jumpReach`). Opt-in
 * (PROBE=1); SECONDS, SWELL, SEED, LOG; FRONT_FROM ('fine' or 'zone': the config's `barrelFrontFrom`) and JUMPS=off
 * (`barrelFront: {}`, no jump rule) for the earlier bases' fronts.
 *
 * LINK=1 runs the front with the clock link on (`FrontOptions.clockLink`, the advisor, 2026-10-03: facing ends within
 * 10 m and one-column gaps linked when their joins agree within 0.166 s/m, the 1 s/m split left alone); the pairs it
 * reports are then those it left apart, and the 'true splits linked' line says whether any pair the 1 s/m rule splits
 * ended on one front. FASTDUMP=<file> writes every front whose throws peel at 20 m/s or more as tab-separated rows, a
 * point's join and throw side by side (time, x, z, η, still depth d, the crest's bearing), rewritten at each summary.
 * Point LOG and FASTDUMP outside the repository.
 */
describe.runIf(process.env.PROBE)('Padang Padang front gap probe', () => {
  it('logs why one crest is split into fronts end to end', () => {
    const log = process.env.LOG ?? 'padang-front-gap.txt';
    writeFileSync(log, '');
    const library = libraryFromBytes(readBarrelCases());
    const swellName = (process.env.SWELL ?? 'small') as keyof typeof PADANG_SWELLS;
    const swell = PADANG_SWELLS[swellName];
    const seed = Number(process.env.SEED ?? 3);
    const linkOn = Boolean(process.env.LINK) && process.env.LINK !== '0' && process.env.LINK !== 'off';
    const frontRules: FrontOptions | undefined = process.env.JUMPS === 'off' || linkOn
      ? { ...(process.env.JUMPS === 'off' ? {} : PADANG_FRONT), ...(linkOn ? { clockLink: true } : {}) }
      : undefined;
    const simulation = new SurfZoneSimulation({
      spot: 'padang', seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24,
      alongShore: PADANG.alongShore, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
      ...(process.env.FRONT_FROM ? { barrelFrontFrom: process.env.FRONT_FROM as 'fine' | 'zone' } : {}),
      ...(frontRules ? { barrelFront: frontRules } : {}),
    });
    const { solver } = simulation;
    const front = simulation.front!;
    const jumpReach = (simulation.config.barrelFront ?? PADANG_FRONT).jumpReach;
    const timing = onsetTiming(PADANG.baseDepth + simulation.config.tide, simulation.config.peakPeriod, true);
    const minHeight = 0.25 * edgeHeight(simulation.config, simulation.tank.edgeDepth);
    const fromRow = solver.rowBelow(barrelFrontFrom(simulation.config, simulation.tank));
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const loft = new SweptLoft(library, BARREL_SLOPE.padang!);
    const samples: CrestSample[] = [];
    appendFileSync(log, `Padang Padang ${swellName} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), seed ${seed}, 1 m cells; crests from z ${solver.zCenters[fromRow].toFixed(0)} over ${minHeight.toFixed(2)} m, jumps followed ${jumpReach === undefined ? 'no' : `${jumpReach} m`}; clock link ${linkOn ? 'ON' : 'off'}; waves: crests linked column to column within ${LINE_REACH} m a column, up to ${LINE_SKIP} columns; tongues: joined slices of one front at weight ≥ ${STANDING}; neighbours within ${NEIGHBOUR} m\n`);
    const seconds = Number(process.env.SECONDS ?? 150);
    const throwOf = (c: ColumnCrest) => (c.footHeight === null ? NaN : Math.min(timing.joinDepth(c.refHeight ?? c.footHeight), timing.throwDepth(c.footHeight)));
    // This probe's own crests, and those dropped lately (a new crest may restart one).
    let crests: ColumnCrest[] = [];
    let dropped: ColumnCrest[] = [];
    let previousPoints: FrontPoint[] = [];
    const restarts: Partial<Record<'jump' | 'lost', number>> = {};
    // Yardsticks over the run.
    let frames = 0;
    const frontsPerWave: number[] = [];
    let pairFrames = 0;
    let pairFramesNear = 0;
    const pairGaps: number[] = [];
    const pairGapColumns: number[] = [];
    const behindPairs: number[] = [];
    let framesWithTongue = 0;
    let framesSplitTongues = 0;
    let tongueSameFront = 0;
    const tongueEndToEnd: number[] = [];
    const tongueBehind: number[] = [];
    const frontPeel: number[] = [];
    const frontPeelX: number[] = [];
    const frontSlowness: number[] = [];
    const wavePeelX: number[] = [];
    const lips: number[] = [];
    let drawnFronts = 0;
    let wavesWithFronts = 0;
    // Pairs: open ones by key, and the gap columns' states and the adjacent ends' causes over every pair-frame.
    const open = new Map<string, PairLife>();
    const closed: PairLife[] = [];
    const categoryFrames: Partial<Record<Category, number>> = {};
    const adjacentFrames: Partial<Record<Adjacent, number>> = {};
    // Pair-frames on which the clock link would join the facing ends, by their gap's columns: with the link on, the 0s and 1s are
    // what it left (the ends it could not take), and the wider gaps are what a wider bridge would add.
    const linkableByColumns: Partial<Record<string, number>> = {};
    let wallMs = 0;
    let cpuMs = 0;
    const loads: number[] = [];
    // Each point's first throw, as padangPeak reads the peel (x against the throw along each front, by its front then),
    // with whether its crest jumped before it joined, whether it joined in a jump's step, and the solver's own first break.
    const throwsById = new Map<number, { x: number; thrown: number; joined: number; front: number; jumped: boolean; joinAtJump: boolean; firstBreak: number | null }>();
    // With FASTDUMP: each point's join and throw, to dump the fast fronts' (fastFrontDump.ts).
    const fastDump = process.env.FASTDUMP;
    const pointLogs = new Map<number, PointLog>();
    // Neighbouring points (columns side by side, within 10 m in z): linked now or not, and what a link by clock
    // compatibility would do (the coordinator's candidate: |Δjoin| within 2 × 0.083 s/m of their distance, |Δz| within
    // the jump reach): as an extra link beyond the 3-row reach (A), or as the whole test (B).
    const LINK_SLOPE = 2 * 0.083;
    const linkCounts = { pairs: 0, linked: 0, linkedRefusedB: 0, unlinkedA: 0, unlinkedB: 0, unlinkedSplitA: 0, unlinkedReach: 0, unlinkedReachA: 0 };
    const linkedRates: number[] = [];

    const closePair = (life: PairLife, points: readonly FrontPoint[]) => {
      const byId = new Map(points.map((p) => [p.id, p]));
      const a = byId.get(life.aEnd);
      const b = byId.get(life.bEnd);
      life.ended = a && b ? (a.front === b.front ? 'merged' : 'apart') : !a && !b ? 'both ends gone' : 'one end gone';
      // Merged by the front's old rules if its two ends are in neighbouring columns within the 3-row reach and under the 1 s/m split.
      if (life.ended === 'merged' && a && b) {
        const distance = Math.hypot(b.x - a.x, b.z - a.z);
        life.byClock = !(Math.abs(b.column - a.column) === 1 && Math.abs(b.z - a.z) < MATCH && Math.abs(b.joined - a.joined) <= distance);
      }
      closed.push(life);
      const gapCrests = [...life.crests.entries()].sort((p, q) => p[0] - q[0]).map(([column, c]) => {
        const joinDepth = c.refHeight === null ? NaN : timing.joinDepth(c.refHeight);
        const restart = c.restart ? `, restarted (${c.restart}) from one sized ${fixed(c.predecessor!.footHeight)} m` : '';
        return `c${column}[foot ${fixed(c.footHeight)} ref ${fixed(c.refHeight)}${restart}; join ${fixed(joinDepth)} m${c.crossedJoin === null ? '' : ` @${fixed(c.crossedJoin - life.meanJoin)}`}, throw ${fixed(throwOf(c))} m${c.passedUnbroken ? ' passed unbroken' : ''}; broke ${c.firstBreak === null ? 'never' : `@${fixed(c.firstBreak - life.meanJoin)} at ${fixed(c.firstBreakDepth)} m`}; on a front ${c.onFront === null ? 'never' : `@${fixed(c.onFront - life.meanJoin)}`}]`;
      });
      appendFileSync(log, `pair f${life.a}|f${life.b} ${fixed(life.first, 2)}–${fixed(life.last, 2)} s (${life.frames} frames), gap ${Math.min(...life.gapColumns)}–${Math.max(...life.gapColumns)} columns, ${fixed(Math.min(...life.gapMetres))}–${fixed(Math.max(...life.gapMetres))} m; ended ${life.ended}; ${classOf(life)}\n  ${life.opening}\n  gap columns by frame: ${listed(life.categories)}${Object.keys(life.adjacent).length ? `; adjacent ends: ${listed(life.adjacent)}` : ''}\n  gap crests (s from the facing ends' mean join): ${gapCrests.join(' ') || '—'}\n`);
    };
    /** A pair's cause: adjacent ends refused a link (by the split rule or the reach), else the gap's worst column state. */
    const classOf = (life: PairLife): string => {
      if (life.gapColumns.every((n) => n === 0)) {
        const top = (Object.entries(life.adjacent) as [Adjacent, number][]).sort((p, q) => q[1] - p[1])[0];
        return `adjacent-${top?.[0] ?? 'other'}`;
      }
      return PRIORITY.find((c) => (life.categories[c] ?? 0) > 0) ?? 'none';
    };

    /** The yardsticks and the pairs' causes so far (pairs still open are left out until they close). */
    const summarise = (label: string) => {
      const share = (n: number, of: number) => `${n} (${of ? ((100 * n) / of).toFixed(0) : '-'} %)`;
      const histogram = (values: number[], bins: number[]) => bins.map((b, k) => {
        const next = bins[k + 1];
        const n = values.filter((v) => v >= b && (next === undefined || v < next)).length;
        return `${next === undefined ? `${b}+` : next - b === 1 ? `${b}` : `${b}–${next - 1}`}: ${n}`;
      }).join(', ');
      const byClass: Partial<Record<string, number>> = {};
      const byClassFrames: Partial<Record<string, number>> = {};
      const byClassNear: Partial<Record<string, number>> = {};
      for (const life of closed) {
        tally(byClass, classOf(life));
        tally(byClassFrames, classOf(life), life.frames);
        if (Math.min(...life.gapMetres) <= NEIGHBOUR) tally(byClassNear, classOf(life));
      }
      const restartedPairs = closed.filter((life) => (life.categories['restarted-point'] ?? 0) + (life.categories['restarted-jump'] ?? 0) + (life.categories['restarted-lost'] ?? 0) + (life.categories['front-lost'] ?? 0) > 0 || life.endRestarted);
      const splitPairs = closed.filter((life) => classOf(life) === 'adjacent-split');
      const uniqueGapCrests = [...new Set(closed.flatMap((life) => [...life.crests.values()]))];
      const neverBroke = uniqueGapCrests.filter((c) => c.firstBreak === null).length;
      const brokeBeforeThrow = uniqueGapCrests.filter((c) => c.firstBreak !== null && c.firstBreakDepth! > throwOf(c)).length;
      const brokeAfterThrow = uniqueGapCrests.filter((c) => c.firstBreak !== null && !(c.firstBreakDepth! > throwOf(c))).length;
      const lifeSeconds = closed.map((life) => life.last - life.first + 1 / 30);
      const perClass = (describe: (lives: PairLife[]) => string) => {
        const groups = new Map<string, PairLife[]>();
        for (const life of closed) groups.set(classOf(life), [...(groups.get(classOf(life)) ?? []), life]);
        return [...groups.entries()].sort((p, q) => q[1].length - p[1].length).map(([k, ls]) => `${k} ${describe(ls)}`).join('; ') || '—';
      };
      // The peel along each front by its throws (padangPeak's: 5 throws or more over 10 m or more), with the joins' and the
      // solver's own first breaks' peels on the same points, the share whose crest jumped, and the share joined in a jump.
      const byFrontThrows = new Map<number, typeof throwsById extends Map<number, infer T> ? T[] : never>();
      for (const t of throwsById.values()) byFrontThrows.set(t.front, [...(byFrontThrows.get(t.front) ?? []), t]);
      const peelOf = (xs: number[], ts: number[]) => {
        const f = fit(ts, xs);
        return Math.abs(f.slope);
      };
      const frontPeels: { front: number; n: number; span: number; throwPeel: number; joinPeel: number; breakPeel: number; jumped: number; joinAtJump: number }[] = [];
      for (const [id, list] of byFrontThrows) {
        const xs = list.map((t) => t.x);
        if (list.length < 5 || Math.max(...xs) - Math.min(...xs) < 10) continue;
        const broken = list.filter((t) => t.firstBreak !== null);
        frontPeels.push({
          front: id, n: list.length, span: Math.max(...xs) - Math.min(...xs),
          throwPeel: peelOf(xs, list.map((t) => t.thrown)), joinPeel: peelOf(xs, list.map((t) => t.joined)),
          breakPeel: broken.length >= 5 ? peelOf(broken.map((t) => t.x), broken.map((t) => t.firstBreak!)) : NaN,
          jumped: list.filter((t) => t.jumped).length / list.length, joinAtJump: list.filter((t) => t.joinAtJump).length / list.length,
        });
      }
      const fast = frontPeels.filter((f) => f.throwPeel >= 20);
      const slow = frontPeels.filter((f) => f.throwPeel < 20);
      const allThrows = [...throwsById.values()];
      if (fastDump) {
        // Each fast front's points with a join and a throw on record; a failure here is logged, never the run's end.
        try {
          const dumped: FastFront[] = fast.map((f) => {
            const points: FastPoint[] = [];
            for (const [id, t] of throwsById) {
              const entry = pointLogs.get(id);
              if (t.front === f.front && entry?.thrown) points.push({ id, column: entry.column, join: entry.join, throw: entry.thrown, joinDepth: entry.joinDepth, throwDepth: entry.throwDepth });
            }
            return { front: f.front, throws: f.n, span: f.span, throwPeel: f.throwPeel, joinPeel: f.joinPeel, breakPeel: f.breakPeel, points };
          });
          writeFileSync(fastDump, formatFastFronts(dumped, `padangFrontGap ${swellName} seed ${seed}, ${label}, clock link ${linkOn ? 'ON' : 'off'}, ${frames} frames`));
        } catch (error) {
          appendFileSync(log, `FASTDUMP failed: ${String(error)}\n`);
        }
      }
      const quantile = (values: number[], q: number) => {
        const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
        return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : NaN;
      };
      // The true splits (adjacent facing ends the 1 s/m rule refuses) that ended on one front, and of them those only the clock link's reach or bridge could have made.
      const splitLinked = splitPairs.filter((life) => life.ended === 'merged');
      const splitLinkedByClock = splitLinked.filter((life) => life.byClock);
      const splitShare = splitPairs.length ? (100 * splitLinked.length) / splitPairs.length : 0;
      const nearPairs = closed.filter((life) => Math.min(...life.gapMetres) <= NEIGHBOUR);
      appendFileSync(log, [
        '',
        `summary: ${label}`,
        `frames ${frames}; wall ${(wallMs / frames).toFixed(0)} ms and CPU ${(cpuMs / frames).toFixed(0)} ms a step; load ${quantiles(loads, 1)}`,
        `drawn fronts a frame ${(drawnFronts / frames).toFixed(2)}, waves with a drawn front a frame ${(wavesWithFronts / frames).toFixed(2)}; fronts a wave: mean ${(frontsPerWave.reduce((a, b) => a + b, 0) / Math.max(1, frontsPerWave.length)).toFixed(2)}, ${histogram(frontsPerWave, [1, 2, 3, 4])}`,
        `end-to-end pairs (fronts on one wave): ${pairFrames} pair-frames, ${pairFramesNear} with facing ends within ${NEIGHBOUR} m; gap ${quantiles(pairGaps)} m; gap columns ${histogram(pairGapColumns, [0, 1, 2, 3, 6, 12])}`,
        `fronts on two waves within ${NEIGHBOUR} m (one behind the other): ${behindPairs.length} pair-frames, ${quantiles(behindPairs)} m`,
        `pairs: ${closed.length} (${nearPairs.length} ever within ${NEIGHBOUR} m), lasting ${quantiles(lifeSeconds)} s; ended: ${['merged', 'apart', 'one end gone', 'both ends gone'].map((e) => `${e} ${closed.filter((l) => l.ended === e).length}`).join(', ')}`,
        `pairs by cause (adjacent ends: refused by the split rule or the reach; else the gap's worst column state): ${listed(byClass)}; within ${NEIGHBOUR} m: ${listed(byClassNear)}; pair-frames: ${listed(byClassFrames)}`,
        `the clock link (facing ends within ${jumpReach ?? TRACK} m, |Δjoin| ≤ ${CLOCK_LINK.toFixed(3)} s/m × d), pairs linked at some frame / pairs, pair-frames linked / pair-frames, by class: ${perClass((ls) => `${ls.filter((l) => l.linkFrames > 0).length}/${ls.length} pairs, ${ls.reduce((n, l) => n + l.linkFrames, 0)}/${ls.reduce((n, l) => n + l.frames, 0)} frames`)}`,
        `one-column gaps (pair-frames; with the clock link passing), by class: ${perClass((ls) => `${ls.reduce((n, l) => n + l.oneColumnFrames, 0)} (${ls.reduce((n, l) => n + l.oneColumnLinkFrames, 0)}) in ${ls.filter((l) => l.oneColumnFrames > 0).length} pairs`)}`,
        `restarted (a gap crest or a facing end's crest restarted after a jump or a loss): ${restartedPairs.length} pairs, ${restartedPairs.reduce((s, l) => s + l.frames, 0)} pair-frames; split by the 1 s/m rule (adjacent ends): ${splitPairs.length} pairs, ${splitPairs.reduce((s, l) => s + l.frames, 0)} pair-frames, at ${quantiles(splitPairs.map((l) => Math.abs(l.rate)))} s/m, the sides' fits ${quantiles(splitPairs.map((l) => Math.abs(l.fitGap)))} s apart at the gap`,
        `gap columns by pair-frame: ${listed(categoryFrames)}; adjacent pair-frames: ${listed(adjacentFrames)}`,
        `pairs within ${NEIGHBOUR} m, their first gap over the facing ends' larger wave height H (crest over trough) ${quantiles(nearPairs.map((l) => l.overWave).filter((v) => Number.isFinite(v)))}, over their larger crest height η ${quantiles(nearPairs.map((l) => l.overHeight))}, over their larger foot height ${quantiles(nearPairs.map((l) => l.overFoot))}; |Δjoin|/gap ${quantiles(nearPairs.map((l) => Math.abs(l.rate)), 3)} s/m, the sides' fits ${quantiles(nearPairs.map((l) => Math.abs(l.fitGap)))} s apart at the gap`,
        `the gaps' crests (${uniqueGapCrests.length}): never broke ${share(neverBroke, uniqueGapCrests.length)}, broke before their throw depth ${share(brokeBeforeThrow, uniqueGapCrests.length)}, at or past it or unsized ${share(brokeAfterThrow, uniqueGapCrests.length)}; on a front at some point ${share(uniqueGapCrests.filter((c) => c.onFront !== null).length, uniqueGapCrests.length)}; restarted ${listed(Object.fromEntries(['jump', 'lost'].map((r) => [r, uniqueGapCrests.filter((c) => c.restart === r).length])))}`,
        `all restarted crests left unsized: ${listed(restarts)}`,
        `tongues: frames with one ${framesWithTongue}, with two on two fronts within ${NEIGHBOUR} m ${framesSplitTongues}; neighbouring tongues on one front ${tongueSameFront}, on two fronts ${tongueEndToEnd.length + tongueBehind.length}: end to end ${quantiles(tongueEndToEnd)} m apart, one behind the other ${quantiles(tongueBehind)} m apart`,
        `peel (fronts of 10+ points, r² ≥ 0.5, sampled each second): along σ ${quantiles(frontPeel)} m/s, along x ${quantiles(frontPeelX)} m/s; |dt/dσ| ${quantiles(frontSlowness, 3)} s/m; lips along σ ${quantiles(lips)} m/s; whole waves along x ${quantiles(wavePeelX)} m/s`,
        `front counters: joins ${front.joins}, splits ${front.splits}, unbroken ${front.unbroken}, lost ${front.lost}, unsized ${front.unsized}, jumps ${front.jumps} (within 1.5 H ${front.waveJumps}); pauses ${simulation.frontPauses}; clock links ${front.clockLinks} (neighbouring columns), bridges ${front.bridges} (one empty column), counted a step as splits are`,
        `clock-compatible pair-frames (facing ends within ${jumpReach ?? TRACK} m, |Δjoin| ≤ ${CLOCK_LINK.toFixed(3)} s/m × gap) still apart, by gap columns: ${listed(linkableByColumns)} (${linkOn ? 'link ON: gaps of 0 and 1 columns are what it left, wider ones what a wider bridge would add' : 'link off: all of them'})`,
        `true splits linked (adjacent ends the 1 s/m rule refuses, pairs that ended on one front): ${splitLinked.length} of ${splitPairs.length} (${splitShare.toFixed(1)} %), ${splitLinkedByClock.length} of them past the old rules' reach or across a gap${splitShare > 1 ? ' — OVER 1 %: stop and ask the advisor' : ''}`,
        `peel by throws along x (padangPeak's: fronts of 5+ throws over 10+ m): ${frontPeels.length} fronts, ${quantiles(frontPeels.map((f) => f.throwPeel))} m/s; the same points' joins ${quantiles(frontPeels.map((f) => f.joinPeel))} m/s, the solver's own first breaks ${quantiles(frontPeels.map((f) => f.breakPeel).filter((v) => Number.isFinite(v)))} m/s`,
        `throws ${allThrows.length}: their crest jumped before joining ${share(allThrows.filter((t) => t.jumped).length, allThrows.length)}, joined in a jump's step ${share(allThrows.filter((t) => t.joinAtJump).length, allThrows.length)}`,
        `fronts peeling at 20 m/s or more by their throws: ${fast.length} (${fast.reduce((s, f) => s + f.n, 0)} throws): jumped ${quantiles(fast.map((f) => f.jumped))}, joined in a jump ${quantiles(fast.map((f) => f.joinAtJump))}; slower fronts ${slow.length}: jumped ${quantiles(slow.map((f) => f.jumped))}, joined in a jump ${quantiles(slow.map((f) => f.joinAtJump))}`,
        ...fast.map((f) => `  fast f${f.front}: ${f.n} throws over ${f.span.toFixed(0)} m, by throws ${f.throwPeel.toFixed(1)} m/s, by joins ${f.joinPeel.toFixed(1)} m/s, by the solver's first breaks ${fixed(f.breakPeel, 1)} m/s; jumped ${(100 * f.jumped).toFixed(0)} %, joined in a jump ${(100 * f.joinAtJump).toFixed(0)} %`),
        `neighbouring points within ${jumpReach ?? TRACK} m in z: ${linkCounts.pairs} pair-steps, linked ${linkCounts.linked} (|Δjoin|/d ${quantiles(linkedRates, 3)} s/m; ${linkCounts.linkedRefusedB} over ${LINK_SLOPE.toFixed(3)} s/m, which (B) would split); unlinked ${linkCounts.pairs - linkCounts.linked}: (A) the reach widened for clock-compatible ends would link ${linkCounts.unlinkedA} (of them over 1 s/m: ${linkCounts.unlinkedSplitA}), (B) the clock alone ${linkCounts.unlinkedB}; unlinked beyond the 3-row reach ${linkCounts.unlinkedReach}, of which (A) links ${linkCounts.unlinkedReachA}`,
        `headline, clock link ${linkOn ? 'ON' : 'off'}, ${swellName}, seed ${seed}, ${label}: fronts a wave ${(frontsPerWave.reduce((a, b) => a + b, 0) / Math.max(1, frontsPerWave.length)).toFixed(2)}; drawn fronts a frame ${(drawnFronts / frames).toFixed(2)}; pairs ${closed.length} (${listed(byClass)}); true splits linked ${splitLinked.length} of ${splitPairs.length}; throws ${allThrows.length}; peel by throws median ${quantile(frontPeels.map((f) => f.throwPeel), 0.5).toFixed(1)} / 90 % ${quantile(frontPeels.map((f) => f.throwPeel), 0.9).toFixed(1)} m/s over ${frontPeels.length} fronts; fast fronts (20 m/s or more) ${fast.length}`,
      ].join('\n') + '\n');
    };

    for (let frame = 0; frame < seconds * 30; frame += 1) {
      const wall = performance.now();
      const cpu = process.cpuUsage();
      simulation.step(1 / 30);
      const used = process.cpuUsage(cpu);
      wallMs += performance.now() - wall;
      cpuMs += (used.user + used.system) / 1000;
      const time = solver.time;
      frames += 1;
      const state = front.exportState();
      const points = state.points;
      const held = state.held;
      const tracks: CrestTrack[] = state.tracks;
      const count = columnCrests(solver, simulation.breaking, fromRow, minHeight, samples);
      const wave = crestLines(samples, count);

      // This probe's crests: each sample matched to its column's nearest (3 m once on a front, 10 m before), else new.
      const crestsOf = new Map<number, ColumnCrest[]>();
      for (const c of crests) crestsOf.set(c.column, [...(crestsOf.get(c.column) ?? []), c]);
      const droppedOf = new Map<number, ColumnCrest[]>();
      for (const c of dropped) droppedOf.set(c.column, [...(droppedOf.get(c.column) ?? []), c]);
      const claimed = new Set<ColumnCrest>();
      const crestOfSample: ColumnCrest[] = [];
      const fresh: ColumnCrest[] = [];
      const onPoint = new Set(points.map((p) => `${p.column}:${p.z}`));
      // With the jump rule, as the front: each sized crest not on a front continues as the furthest crest in its column
      // from a match reach behind it to the jump reach ahead, not beside a front point, claimed before the rest match.
      const leading = new Map<number, ColumnCrest>();
      if (jumpReach !== undefined) {
        const previousOf = new Map<number, FrontPoint[]>();
        for (const p of previousPoints) previousOf.set(p.column, [...(previousOf.get(p.column) ?? []), p]);
        let start = 0;
        while (start < count) {
          const column = samples[start].column;
          let end = start;
          while (end < count && samples[end].column === column) end += 1;
          const near = previousOf.get(column) ?? [];
          for (const c of crestsOf.get(column) ?? []) {
            if (c.footHeight === null || c.onFront !== null) continue;
            let furthest = -1;
            let nearest = -1;
            for (let k = start; k < end; k += 1) {
              const ahead = samples[k].z - c.z;
              if (ahead < -MATCH || ahead > jumpReach || leading.has(k)) continue;
              if (near.some((p) => Math.abs(p.z - samples[k].z) < MATCH)) continue;
              if (furthest < 0 || samples[k].z > samples[furthest].z) furthest = k;
              if (nearest < 0 || Math.abs(ahead) < Math.abs(samples[nearest].z - c.z)) nearest = k;
            }
            if (furthest < 0) continue;
            if (furthest !== nearest) {
              c.jumps += 1;
              c.jumpedAt = time;
            }
            leading.set(furthest, c);
            claimed.add(c);
          }
          start = end;
        }
      }
      for (let k = 0; k < count; k += 1) {
        const s = samples[k];
        let best = leading.get(k);
        for (const c of best ? [] : crestsOf.get(s.column) ?? []) {
          const reach = c.onFront === null ? TRACK : MATCH;
          if (claimed.has(c) || !(Math.abs(c.z - s.z) < reach)) continue;
          if (!best || Math.abs(c.z - s.z) < Math.abs(best.z - s.z)) best = c;
        }
        let c = best;
        if (!c) {
          // A new crest: a restart if a sized crest in its column is still seen within 10 m, or was dropped lately.
          let predecessor: ColumnCrest | null = null;
          let restart: 'jump' | 'lost' | null = null;
          for (const other of crestsOf.get(s.column) ?? []) {
            if (other.footHeight === null || !(Math.abs(other.z - s.z) < TRACK)) continue;
            if (!predecessor || Math.abs(other.z - s.z) < Math.abs(predecessor.z - s.z)) predecessor = other;
          }
          if (predecessor) restart = 'jump';
          else {
            for (const other of droppedOf.get(s.column) ?? []) {
              if (other.footHeight === null || !(Math.abs(other.z - s.z) < TRACK + RESTART_PACE * (time - other.seen))) continue;
              if (!predecessor || other.seen > predecessor.seen) predecessor = other;
            }
            if (predecessor) restart = 'lost';
          }
          c = {
            column: s.column, z: s.z, seen: time, born: time, shallow: false, footHeight: null, refHeight: null, depth: s.depth,
            crossedJoin: null, firstBreak: null, firstBreakDepth: null, passedUnbroken: false, onFront: null, predecessor, restart,
            jumps: 0, jumpedAt: null, joinAtJump: false,
          };
          fresh.push(c);
        }
        claimed.add(c);
        c.z = s.z;
        c.seen = time;
        if (!c.shallow && s.depth <= timing.h0) {
          // Where the front first follows a crest: sized if within a metre of the foot (BreakingFront's FOOT_BAND).
          c.shallow = true;
          c.footHeight = s.depth >= timing.h0 - 1 ? s.eta : null;
          if (c.restart && c.footHeight === null) tally(restarts, c.restart);
        }
        const [deeper, shallower] = timing.band;
        if (c.footHeight !== null && s.depth <= deeper && s.depth >= shallower) c.refHeight = Math.max(c.refHeight ?? s.eta, s.eta);
        if (c.refHeight !== null && c.crossedJoin === null && s.depth <= timing.joinDepth(c.refHeight)) {
          c.crossedJoin = time;
          c.joinAtJump = c.jumpedAt === time;
        }
        if (c.firstBreak === null && s.strength > 0) {
          c.firstBreak = time;
          c.firstBreakDepth = s.depth;
        }
        if (c.footHeight !== null && c.firstBreak === null && s.depth <= throwOf(c)) c.passedUnbroken = true;
        if (c.onFront === null && onPoint.has(`${s.column}:${s.z}`)) c.onFront = time;
        c.depth = s.depth;
        crestOfSample[k] = c;
      }
      const kept: ColumnCrest[] = [];
      for (const c of crests) {
        if (claimed.has(c)) kept.push(c);
        else if (time - c.seen <= HOLD) kept.push(c);
        else dropped.push(c);
      }
      crests = [...kept, ...fresh];
      dropped = dropped.filter((c) => time - c.seen <= RESTART_MEMORY);

      // Each front on its wave: the crest line through its points' samples.
      const sampleAt = new Map<string, number>();
      for (let k = 0; k < count; k += 1) sampleAt.set(`${samples[k].column}:${samples[k].z}`, k);
      const fronts: Front[] = [];
      for (const p of points) {
        const last = fronts.at(-1);
        if (last && last.id === p.front) {
          last.points.push(p);
          last.firstColumn = Math.min(last.firstColumn, p.column);
          last.lastColumn = Math.max(last.lastColumn, p.column);
        } else {
          const k = sampleAt.get(`${p.column}:${p.z}`);
          fronts.push({ id: p.front, points: [p], firstColumn: p.column, lastColumn: p.column, wave: k === undefined ? -1 - fronts.length : wave[k] });
        }
      }
      const drawn = fronts.filter((f) => f.points.length >= 2 && f.points.at(-1)!.sigma - f.points[0].sigma > 1e-6);
      drawnFronts += drawn.length;
      const byWave = new Map<number, Front[]>();
      for (const f of drawn) byWave.set(f.wave, [...(byWave.get(f.wave) ?? []), f]);
      wavesWithFronts += byWave.size;
      for (const list of byWave.values()) frontsPerWave.push(list.length);

      // Fronts one behind the other: on two waves, within NEIGHBOUR m.
      for (let i = 0; i < drawn.length; i += 1) {
        for (let j = i + 1; j < drawn.length; j += 1) {
          if (drawn[i].wave === drawn[j].wave) continue;
          let nearest = Infinity;
          for (const p of drawn[i].points) for (const q of drawn[j].points) nearest = Math.min(nearest, Math.hypot(p.x - q.x, p.z - q.z));
          if (nearest <= NEIGHBOUR) behindPairs.push(nearest);
        }
      }

      // Fronts end to end on one wave.
      const seenPairs = new Set<string>();
      const heldOf = new Map<number, FrontPoint[]>();
      for (const p of held) heldOf.set(p.column, [...(heldOf.get(p.column) ?? []), p]);
      const tracksOf = new Map<number, CrestTrack[]>();
      for (const t of tracks) tracksOf.set(t.column, [...(tracksOf.get(t.column) ?? []), t]);
      const singlesOf = new Map<number, FrontPoint[]>();
      for (const f of fronts) if (!drawn.includes(f)) for (const p of f.points) singlesOf.set(p.column, [...(singlesOf.get(p.column) ?? []), p]);
      for (const [waveId, list] of byWave) {
        if (waveId < 0) continue;
        list.sort((p, q) => p.firstColumn - q.firstColumn);
        const lineSamples = new Map<number, number>();
        for (let k = 0; k < count; k += 1) if (wave[k] === waveId) lineSamples.set(samples[k].column, k);
        for (let n = 0; n + 1 < list.length; n += 1) {
          const A = list[n];
          const B = list[n + 1];
          if (A.lastColumn >= B.firstColumn) continue;
          const aEnd = A.points.reduce((best, p) => (p.column > best.column ? p : best));
          const bEnd = B.points.reduce((best, p) => (p.column < best.column ? p : best));
          const gap = Math.hypot(bEnd.x - aEnd.x, bEnd.z - aEnd.z);
          pairFrames += 1;
          if (gap <= NEIGHBOUR) pairFramesNear += 1;
          pairGaps.push(gap);
          const columns = B.firstColumn - A.lastColumn - 1;
          pairGapColumns.push(columns);
          const key = `${A.id}|${B.id}`;
          seenPairs.add(key);
          let life = open.get(key);
          if (!life) {
            // The two sides' onsets near their facing ends, fitted on σ and carried to the gap's middle.
            const aNear = A.points.filter((p) => p.sigma >= aEnd.sigma - END_FIT);
            const bNear = B.points.filter((p) => p.sigma <= bEnd.sigma + END_FIT);
            const aFit = fit(aNear.map((p) => p.sigma), aNear.map((p) => p.joined));
            const bFit = fit(bNear.map((p) => p.sigma), bNear.map((p) => p.joined));
            const aMid = aNear.length >= 2 ? aFit.at(aEnd.sigma + gap / 2) : aEnd.joined;
            const bMid = bNear.length >= 2 ? bFit.at(bEnd.sigma - gap / 2) : bEnd.joined;
            const endCrest = (p: FrontPoint) => {
              const k = sampleAt.get(`${p.column}:${p.z}`);
              return k === undefined ? undefined : crestOfSample[k];
            };
            const aCrest = endCrest(aEnd);
            const bCrest = endCrest(bEnd);
            const waveOf = (p: FrontPoint) => {
              const k = sampleAt.get(`${p.column}:${p.z}`);
              return k === undefined ? NaN : samples[k].wave;
            };
            const end = (label: string, p: FrontPoint, c: ColumnCrest | undefined) =>
              `${label} c${p.column} (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) joined ${p.joined.toFixed(2)} at ${p.depth.toFixed(2)} m, broke ${p.broke.toFixed(2)}, thrown ${fixed(p.thrown)}, τ ${p.tau.toFixed(2)}, crest ${p.crestDepth.toFixed(2)} m deep, η ${p.height.toFixed(2)} m, H ${fixed(waveOf(p))} m, foot ${p.footHeight.toFixed(2)} m${c?.restart ? `, its crest restarted (${c.restart})` : ''}`;
            life = {
              a: A.id, b: B.id, first: time, last: time, frames: 0, gapColumns: [], gapMetres: [], categories: {}, adjacent: {},
              opening: `${end('A', aEnd, aCrest)} (${A.points.length} pts, onsets ${fixed(aFit.slope, 3)} s/m) | ${end('B', bEnd, bCrest)} (${B.points.length} pts, onsets ${fixed(bFit.slope, 3)} s/m) | Δjoin ${(bEnd.joined - aEnd.joined).toFixed(2)} s over ${gap.toFixed(2)} m (${((bEnd.joined - aEnd.joined) / gap).toFixed(3)} s/m), fits at the gap's middle ${aMid.toFixed(2)} | ${bMid.toFixed(2)} (Δ ${(bMid - aMid).toFixed(2)} s), Δτ ${(bEnd.tau - aEnd.tau).toFixed(2)} s`,
              endRestarted: Boolean(aCrest?.restart || bCrest?.restart), rate: (bEnd.joined - aEnd.joined) / gap, fitGap: bMid - aMid,
              overHeight: gap / Math.max(aEnd.height, bEnd.height), overFoot: gap / Math.max(aEnd.footHeight, bEnd.footHeight),
              overWave: gap / Math.max(waveOf(aEnd), waveOf(bEnd)),
              crests: new Map(), aEnd: aEnd.id, bEnd: bEnd.id, meanJoin: (aEnd.joined + bEnd.joined) / 2, ended: '', byClock: false,
              linkFrames: 0, oneColumnFrames: 0, oneColumnLinkFrames: 0,
            };
            open.set(key, life);
          }
          life.last = time;
          life.frames += 1;
          life.gapColumns.push(columns);
          life.gapMetres.push(gap);
          // The clock link on the facing ends, and the one-column gaps a bridge would close.
          const linkable = gap <= (jumpReach ?? TRACK) && Math.abs(bEnd.joined - aEnd.joined) <= CLOCK_LINK * gap;
          if (linkable) {
            life.linkFrames += 1;
            tally(linkableByColumns, columns >= 6 ? '6+' : columns >= 3 ? '3–5' : String(columns));
          }
          if (columns === 1) {
            life.oneColumnFrames += 1;
            if (linkable) life.oneColumnLinkFrames += 1;
          }
          life.aEnd = aEnd.id;
          life.bEnd = bEnd.id;
          if (columns === 0) {
            const reason: Adjacent = Math.abs(bEnd.z - aEnd.z) >= MATCH ? 'reach' : Math.abs(bEnd.joined - aEnd.joined) > gap ? 'split' : 'other';
            tally(life.adjacent, reason);
            tally(adjacentFrames, reason);
          }
          for (let column = A.lastColumn + 1; column < B.firstColumn; column += 1) {
            const k = lineSamples.get(column);
            const zHere = k !== undefined ? samples[k].z : aEnd.z + ((column - aEnd.column) / (bEnd.column - aEnd.column)) * (bEnd.z - aEnd.z);
            let category: Category;
            if ((heldOf.get(column) ?? []).some((p) => Math.abs(p.z - zHere) < MATCH)) category = 'flicker';
            else if ((singlesOf.get(column) ?? []).some((p) => Math.abs(p.z - zHere) < MATCH)) category = 'single';
            else if (k === undefined) category = 'none';
            else {
              const c = crestOfSample[k];
              const track = (tracksOf.get(column) ?? []).find((t) => Math.abs(t.z - zHere) < MATCH);
              if (track && track.footHeight !== null) category = track.refHeight === null ? 'waiting-band' : track.crossed === null ? 'waiting-join' : 'waiting-break';
              else if (c.footHeight !== null) category = c.passedUnbroken ? 'unbroken' : 'front-lost';
              else if (c.restart) category = c.restart === 'lost' ? 'restarted-lost' : c.predecessor?.onFront !== null ? 'restarted-point' : 'restarted-jump';
              else category = 'never-sized';
              if (!life.crests.has(column)) life.crests.set(column, c);
            }
            tally(life.categories, category);
            tally(categoryFrames, category);
          }
        }
      }
      for (const [key, life] of open) {
        if (seenPairs.has(key)) continue;
        closePair(life, points);
        open.delete(key);
      }

      // The drawn curl's tongues, as padangCurl counts them (none without a front).
      const recordCount = writeFrontRecords(points, records);
      if (recordCount > 0) {
        grid.xMin = simulation.windowXMin;
        simulation.writeUniformSurface(surface, grid, false);
      }
      const result = loft.build(records, recordCount, 0, (x, z) => sampleSurfaceHeight(surface, grid, x, z));
      const list = tongues(result);
      if (list.length) framesWithTongue += 1;
      let split = false;
      for (let a = 0; a < list.length; a += 1) {
        for (let b = a + 1; b < list.length; b += 1) {
          const gap = separation(result, list[a], list[b]);
          if (gap.distance > NEIGHBOUR) continue;
          if (list[a].front === list[b].front) tongueSameFront += 1;
          else {
            split = true;
            if (gap.across > gap.along) tongueBehind.push(gap.across);
            else tongueEndToEnd.push(gap.along);
          }
        }
      }
      if (split) framesSplitTongues += 1;

      // The peel along each front with 10 points or more, and along each wave's fronts together, once a second.
      if (frame % 30 === 29) {
        loads.push(loadavg()[0]);
        for (const f of drawn) {
          if (f.points.length < 10) continue;
          const onSigma = fit(f.points.map((p) => p.sigma), f.points.map((p) => p.joined));
          const onX = fit(f.points.map((p) => p.x), f.points.map((p) => p.joined));
          frontSlowness.push(Math.abs(onSigma.slope));
          if (onSigma.r2 >= 0.5) frontPeel.push(1 / Math.abs(onSigma.slope));
          if (onX.r2 >= 0.5) frontPeelX.push(1 / Math.abs(onX.slope));
          const thrown = f.points.filter((p) => p.thrown !== null);
          if (thrown.length >= 10) {
            const onThrow = fit(thrown.map((p) => p.sigma), thrown.map((p) => p.thrown!));
            if (onThrow.r2 >= 0.5) lips.push(1 / Math.abs(onThrow.slope));
          }
        }
        for (const [waveId, fs] of byWave) {
          if (waveId < 0) continue;
          const all = fs.flatMap((f) => f.points);
          if (all.length < 10) continue;
          const onX = fit(all.map((p) => p.x), all.map((p) => p.joined));
          if (onX.r2 >= 0.5) wavePeelX.push(1 / Math.abs(onX.slope));
        }
        const fpw = [...byWave.values()].map((fs) => fs.length);
        appendFileSync(log, `t ${time.toFixed(0)} s | ${points.length} points on ${fronts.length} fronts (${drawn.length} drawn) over ${byWave.size} waves: fronts a wave ${fpw.join(',') || '—'} | held ${held.length}, tracks ${tracks.length} | joins ${front.joins}, splits ${front.splits}, unbroken ${front.unbroken}, lost ${front.lost}, unsized ${front.unsized}, pauses ${simulation.frontPauses}; restarted unsized ${listed(restarts)} | tongues ${list.length} | wall ${(wallMs / frames).toFixed(0)} ms, CPU ${(cpuMs / frames).toFixed(0)} ms a step, load ${loadavg()[0].toFixed(1)}\n`);
      }
      previousPoints = [...points, ...held];
      if (frame % 900 === 899 && frame + 1 < seconds * 30) summarise(`after ${((frame + 1) / 30).toFixed(0)} s`);
      // With FASTDUMP, each point's join (the step it first stands) and throw (the step it first has one): its crest's height and depth,
      // its direction of travel from the solver's face (crestMotion, if it reads a travelling form) and its front's line there.
      if (fastDump) {
        logPoints(pointLogs, points, (p) => {
          const k = sampleAt.get(`${p.column}:${p.z}`);
          const motion = k === undefined ? undefined : crestMotion(solver, samples[k].row * solver.nx + samples[k].column);
          return motion ? (Math.atan2(motion.direction.x, motion.direction.z) * 180) / Math.PI : null;
        });
      }
      // Each point's first throw, with its crest's history.
      for (const p of points) {
        if (p.thrown === null || throwsById.has(p.id)) continue;
        const k = sampleAt.get(`${p.column}:${p.z}`);
        const c = k === undefined ? undefined : crestOfSample[k];
        throwsById.set(p.id, { x: p.x, thrown: p.thrown, joined: p.joined, front: p.front, jumped: (c?.jumps ?? 0) > 0, joinAtJump: c?.joinAtJump ?? false, firstBreak: c?.firstBreak ?? null });
      }
      // Neighbouring points and the link candidates.
      const order = new Map(points.map((p, n) => [p, n]));
      const pointsByColumn = new Map<number, FrontPoint[]>();
      for (const p of points) pointsByColumn.set(p.column, [...(pointsByColumn.get(p.column) ?? []), p]);
      for (const q of points) {
        for (const p of pointsByColumn.get(q.column - 1) ?? []) {
          const dz = Math.abs(q.z - p.z);
          if (dz > (jumpReach ?? TRACK)) continue;
          const d = Math.hypot(q.x - p.x, q.z - p.z);
          const rate = Math.abs(q.joined - p.joined) / d;
          const linked = p.front === q.front && Math.abs(order.get(p)! - order.get(q)!) === 1;
          const a = (dz < MATCH && rate <= 1) || rate <= LINK_SLOPE;
          const b = rate <= LINK_SLOPE;
          linkCounts.pairs += 1;
          if (linked) {
            linkCounts.linked += 1;
            linkedRates.push(rate);
            if (!b) linkCounts.linkedRefusedB += 1;
          } else {
            if (a) linkCounts.unlinkedA += 1;
            if (b) linkCounts.unlinkedB += 1;
            if (a && rate > 1) linkCounts.unlinkedSplitA += 1;
            if (dz >= MATCH) {
              linkCounts.unlinkedReach += 1;
              if (a) linkCounts.unlinkedReachA += 1;
            }
          }
        }
      }
    }
    for (const life of open.values()) closePair(life, front.points);

    summarise('the whole run');
  }, 14_400_000);
});
