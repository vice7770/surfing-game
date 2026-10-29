/**
 * The spilling front (the canyon spilling prototype, docs/research/canyon-spilling-2026-10-05): at a spilling spot the
 * whitewater follows a front that runs along each wave's crest the way the wave peels, never faster than a chosen
 * peel speed, and never ahead of where the solver breaks. Ahead of it the crest's whitewater is withheld, so the
 * shoulder stays clean and the peel steady from wave to wave; behind it the foam starts as a thin line at the crest
 * and grows down the face as the local break ages.
 *
 * It reads the solver's breaking strength and the onsets the simulation measures, and writes only the whitewater
 * strength the foam, the aeration and the roar are fed (`SurfZoneSimulation.whitewaterStrength`): the solver's
 * breaking, its dissipation and the rider's water are untouched. Like the swept barrel's gate (`SweptCrash.gate`),
 * it only ever lowers the whitewater.
 *
 * For the roller lens (S3, `SpillingRoller`) it also gives each wave's crest per column (`crestAt`) and the breaking
 * the rider feels (`update`'s `felt`: the solver's behind each front and where no wave owns a cell, none ahead).
 * Its decision paths use only + − × ÷ and min/max (the roller's online rule, R3 §3.4): its sine is a series.
 */

import { frayRow, frayToes, type PeelEnd } from './drawnEdges';

export interface SpillingFrontOptions {
  /** Which way the break peels along shore: +1 toward +x (left to right seen from the beach), −1 toward −x. */
  direction: 1 | -1;
  /** The visible peel angle α the front may not exceed in speed: it runs at most c_b / sin α along shore, degrees. */
  peelAngleDegrees: number;
  /** Seconds over which a column's foam grows from a thin line at the crest to the full band down the face. */
  rampSeconds: number;
  /** The thin line's width down the face at onset, m, and how fast it grows down the face, m/s. */
  lineWidth: number;
  growth: number;
  /** The strength share the thin line starts at (it ramps to 1 over rampSeconds). */
  lineShare: number;
  /** Onsets within this along-shore distance of a wave's broken extent join that wave, m. */
  joinReach: number;
  /**
   * ...and only within this distance across shore of that wave's crest beside them, m: one crest breaking on along the
   * peel, not the next crest in (or out), a wavelength away. One wave id then keeps one crest, so the roller's crests
   * and normals are per wave by construction.
   */
  crestReach: number;
  /**
   * A wave's breaking in a column: from `crestMargin` m seaward of where it started breaking there to `bandWidth` m
   * shoreward of where its crest has since run at the breaker celerity. Older waves' bores lie a wavelength inshore.
   */
  crestMargin: number;
  bandWidth: number;
  /** Waves tracked at once; the oldest is dropped (its cells pass ungated as if long broken). */
  maxWaves: number;
  /** A wave is dropped this many seconds after its first onset. */
  lifetime: number;
  /**
   * The upcoast gate (the owner, 2026-10-07: hold the upcoast haze back): upcoast (against the peel) of the most
   * upcoast crest start among the live waves (`SpillingWave.crestX`: where each crest first broke), beyond this many
   * metres, the waves' whitewater is withheld for good. The solver's break can spread along the crest both ways from
   * the peak (the breaking age's sideways spread); the foam shows it only within the margin. Infinity: no gate.
   */
  upcoastMargin: number;
  /**
   * Whether the drawn whitewater's runs fray at their ends along the crest and at their toe (the foam look, item 4a:
   * `drawnEdges.ts`), so a straight crest's white is no rectangle; look only, the felt and the front's whitewater never
   * read it. Off by default; the Canyon's front turns it on (`SPILLING_FRONT`).
   */
  drawnEdges: boolean;
  /**
   * More groups of waves beside the front's own (group 0, which peels `direction`; canyon-beach-look, 2026-10-28): each
   * group's onsets start and join only its own waves, which peel its way, under its own visible peel cap and upcoast gate,
   * and keep at most `maxWaves` (group k is `groups[k - 1]`). The Canyon's beach peaks: an A-frame's arms, one group each.
   */
  groups?: readonly SpillingGroup[];
}

/** A group of the front's waves (`SpillingFrontOptions.groups`): which way it peels, its visible peel cap and gate. */
export interface SpillingGroup {
  readonly direction: 1 | -1;
  readonly peelAngleDegrees: number;
  readonly upcoastMargin: number;
  /** Seconds after its first onset each of its waves is dropped (`SpillingFrontOptions.lifetime` for the front's own). */
  readonly lifetime: number;
  /** Where its waves' look reaches along shore, m (the curl's shoulder clears no further): its arm. Absent: everywhere. */
  readonly span?: { readonly from: number; readonly to: number };
}

/** Group k > 0's wave ids start at k times this, so group 0's (the front's own) stay as they were without groups. */
export const GROUP_IDS = 1_000_000;

/**
 * How much faster than the breaker celerity a crest may have run since its first onset, for a later break to count as
 * the same crest's: the Canyon's crests run at about 6.3 m/s on its shelf (H ≥ 1.2 m, measured), 1.35 times its c_b of
 * 4.65 m/s at Medium. Slower crests (about 4 m/s over its terrace) fall within `bandWidth` behind for some 30 s.
 */
const CREST_SPEED_SPAN = 1.5;

/** Defaults for the Canyon: a 55° visible peel (the owner's 50–60°), foam grown down the face over 1.5 s. */
export const SPILLING_FRONT_DEFAULTS: SpillingFrontOptions = {
  direction: 1,
  peelAngleDegrees: 55,
  rampSeconds: 1.5,
  lineWidth: 1.5,
  growth: 5,
  lineShare: 0.35,
  joinReach: 6,
  /**
   * 10 m, provisional: about a lens length (the Canyon's run 4–8 m across shore). At the Canyon (Medium, seed 1, 120 s)
   * an onset joining its own crest lies a median 1 m from that crest in the nearest column (90 % within 3 m); the 61 of
   * 1092 that joined across a crest lay 24–130 m away, and 4 lay between 10 and 20 m.
   */
  crestReach: 10,
  crestMargin: 6,
  bandWidth: 20,
  /**
   * 24, provisional: enough to keep each wave its 45 s. With one crest per wave the Canyon starts about one wave every
   * 2 s (Medium, seed 1: 65 in the first 98 s after the spin-up), so 8 dropped each after about 20 s, and an inshore
   * crest's lenses could no longer be seeded; with 24, at most 20 were tracked at once.
   */
  maxWaves: 24,
  lifetime: 45,
  /**
   * 6 m, provisional: the front's own join reach. At the Canyon the arm's end puts each break contour's most seaward
   * point up to 5.6 m upcoast of its peak at the measured break depths, and before the gate half its crests' foam reached
   * no further than 6 m upcoast of their first onset (`scripts/canyon-haze-report.ts`, Medium, 3 seeds × 14 periods).
   */
  upcoastMargin: 6,
  drawnEdges: false,
};

/** Terms of `seriesSine`'s Taylor series: on [−π/2, π/2] the first one left out is below 1e-20. */
const SINE_TERMS = 12;

/**
 * sin x from its Taylor series, with + − × ÷ and floor only: engines may approximate `Math.sin` differently
 * (ECMA-262), and the front's speed cap decides which columns its front reaches (the roller's online rule, R3 §3.4).
 * x is folded into [−π/2, π/2] first.
 */
export function seriesSine(x: number): number {
  const turn = 2 * Math.PI;
  let a = x - turn * Math.floor((x + Math.PI) / turn);
  if (a > Math.PI / 2) a = Math.PI - a;
  else if (a < -Math.PI / 2) a = -Math.PI - a;
  const square = a * a;
  let term = a;
  let sum = a;
  for (let n = 1; n <= SINE_TERMS; n += 1) {
    term = (-term * square) / ((2 * n) * (2 * n + 1));
    sum += term;
  }
  return sum;
}

/** The grid the front works on: the solver's cell centres (row-major, iz * nx + ix; z grows toward the beach). */
export interface SpillingGrid {
  readonly nx: number;
  readonly nz: number;
  readonly xCenters: ArrayLike<number>;
  readonly zCenters: ArrayLike<number>;
}

/** One wave's front along its crest. */
export interface SpillingWave {
  /** The wave's number: how many waves the front had started before it (its roller's slot is id mod 2). */
  readonly id: number;
  /** Solver time of the wave's first onset, s. */
  readonly onset: number;
  /** Its group (`SpillingFrontOptions.groups`; 0: the front's own) and which way it peels along shore. */
  readonly group: number;
  readonly direction: 1 | -1;
  /** Along-shore position of its first onset (the peak), m, and where across shore it started breaking there, z. */
  readonly startX: number;
  readonly startZ: number;
  /**
   * Where its crest first broke along shore, m: its own start, or, when it started inside a live older wave's band (one
   * crest breaking again further along, or spreading back), that wave's crest start. The upcoast gate counts from here.
   */
  readonly crestX: number;
  /** Where the visible front is along shore, m. */
  frontX: number;
  /** How far along the peel the solver has broken this wave, m (the front never passes it). */
  tipX: number;
  /** The upstream end of the solver's break for this wave, m. */
  backX: number;
  /** When the front reached each column (NaN until it does), s. */
  readonly reached: Float64Array;
  /** When each column had its onset in this wave (NaN: not yet), s, and where across shore it started breaking, z. */
  readonly joinedAt: Float64Array;
  readonly joinedZ: Float64Array;
  /** Last time an onset joined this wave, s. */
  lastJoin: number;
  /**
   * Its crest per column at the last update, z (NaN: none): the most seaward breaking cell it owned there on its own
   * crest (`SpillingFront.ownCrest`). Its band can hold a younger crest seaward; that one is not its crest.
   */
  readonly crest: Float64Array;
  /** Where its crest was last recorded in each column, z, and when, s (NaN: never). */
  readonly seen: Float64Array;
  readonly seenAt: Float64Array;
}

/**
 * The drawn whitewater's look (the Canyon spilling lip, `SpillingCurl`): the share of a wave's whitewater drawn in
 * `column`, `age` s after its front reached it (or its onset joined there, whichever came later), at z. Look only: the
 * whitewater the foam's air and the roar are fed, and the breaking the rider feels, never read it.
 */
export interface SpillingDrawnLook {
  /** From this age on, s, all of it is drawn. */
  readonly span: number;
  share(column: number, age: number, z: number): number;
}

/** A per-column array as JSON numbers, NaN as null (as `LipState` and `FrontState` carry theirs). */
export type ColumnValues = (number | null)[];

/** One wave as data (the roller plan's §5: the sea handover). */
export interface SpillingWaveState {
  id: number;
  onset: number;
  /** Absent from donors before canyon-beach-look: the front's own group, its direction. */
  group?: number;
  direction?: 1 | -1;
  startX: number;
  startZ: number;
  crestX: number;
  frontX: number;
  tipX: number;
  backX: number;
  lastJoin: number;
  reached: ColumnValues;
  joinedAt: ColumnValues;
  joinedZ: ColumnValues;
  crest: ColumnValues;
  seen: ColumnValues;
  seenAt: ColumnValues;
}

/**
 * The front as data: the waves started so far, the breaker celerity of its last update (the next onsets' joins read it,
 * before the next update), and its waves, crests included (the same).
 */
export interface SpillingFrontState {
  started: number;
  /** Waves started so far in each further group (`SpillingFrontOptions.groups`); absent: none. */
  groupStarted?: number[];
  celerity: number;
  waves: SpillingWaveState[];
}

const toValues = (values: Float64Array): ColumnValues => Array.from(values, (value) => (value === value ? value : null));
function fromValues(values: ColumnValues, out: Float64Array): Float64Array {
  if (values.length !== out.length) throw new Error(`A spilling front from another tank (${values.length} columns, not ${out.length})`);
  for (let i = 0; i < out.length; i += 1) out[i] = values[i] ?? Number.NaN;
  return out;
}

export class SpillingFront {
  readonly options: SpillingFrontOptions;
  readonly waves: SpillingWave[] = [];
  /** Cells withheld ahead of a front at the last update, and cells thinned by the onset ramp. */
  gated = 0;
  ramped = 0;
  /** Waves started so far (the front's own group), and in each further group. */
  started = 0;
  private readonly groupStarted: number[];
  /** The breaker celerity of the latest update, m/s: how far a wave's band has run since its onset. */
  private celerity = 0;
  /** For the drawn whitewater: each column's most seaward crest any live wave last had there, z (NaN: none). */
  private seaward?: Float64Array;
  /** For the drawn edges: the rows that drew white at the last update, in order. */
  private drawnRows?: Int32Array;
  /**
   * For the drawn edges with a look (the lip): the row's cells' ages, s since their wave's front reached them (NaN: no
   * wave's), so each run's peel-side end, where the lip lands, frays only as far as its fingers while young.
   */
  private peel?: { direction: 1 | -1; age: Float64Array; young: number; directions?: Int8Array };
  /** Each group's upcoast gate at the last update (`update`'s scratch). */
  private gates?: Float64Array;
  /** Per column, how many live waves have joined there and which (`update`'s owner search; nx × at least the waves). */
  private joinedCount?: Int32Array;
  private joinedWaves?: Int32Array;

  constructor(private readonly grid: SpillingGrid, options: Partial<SpillingFrontOptions> = {}) {
    this.options = { ...SPILLING_FRONT_DEFAULTS, ...options };
    this.groupStarted = (this.options.groups ?? []).map(() => 0);
  }

  /** Along-shore speed cap for a breaker celerity c_b, m/s: c_b / sin α (a group's own α for its waves). */
  speedCap(breakerCelerity: number, group = 0): number {
    const angle = group > 0 ? this.groupOf(group).peelAngleDegrees : this.options.peelAngleDegrees;
    return breakerCelerity / seriesSine((angle * Math.PI) / 180);
  }

  /** A group's peel: the front's own for 0, else `groups[group - 1]`. */
  groupOf(group: number): SpillingGroup {
    const { options } = this;
    return group > 0 ? options.groups![group - 1]
      : { direction: options.direction, peelAngleDegrees: options.peelAngleDegrees, upcoastMargin: options.upcoastMargin, lifetime: options.lifetime };
  }

  /**
   * Where wave `wave` (its index in `waves`) broke first across shore in `column` at the last update: the most seaward
   * breaking cell it owns there, whether or not its front has reached the column, z; NaN if it owns none. Valid until
   * the next `observeOnset` or `update`, which may renumber the waves.
   */
  crestAt(wave: number, column: number): number {
    if (!(wave >= 0 && wave < this.waves.length && column >= 0 && column < this.grid.nx)) return Number.NaN;
    return this.waves[wave].crest[column];
  }

  /**
   * A new wave started breaking in `column` at `time`, its outermost breaking cell at `z` (the simulation's onset: that
   * cell jumped seaward). It joins the wave whose broken extent it touches, if that wave has not broken there yet;
   * otherwise it starts a wave of its own, the front at its peak.
   */
  observeOnset(column: number, time: number, z: number, group = 0): void {
    const x = this.grid.xCenters[column];
    const { joinReach } = this.options;
    const { direction } = this.groupOf(group);
    for (let k = this.waves.length - 1; k >= 0; k -= 1) {
      const wave = this.waves[k];
      if (wave.group !== group) continue;
      if (!Number.isNaN(wave.joinedAt[column])) continue;
      const low = Math.min(wave.backX, wave.tipX) - joinReach;
      const high = Math.max(wave.backX, wave.tipX) + joinReach;
      if (x < low || x > high) continue;
      if (!this.onCrest(wave, column, time, z)) continue;
      wave.joinedAt[column] = time;
      wave.joinedZ[column] = z;
      wave.lastJoin = time;
      if (this.ahead(x, wave.tipX, direction)) wave.tipX = x;
      if (this.ahead(wave.backX, x, direction)) wave.backX = x;
      return;
    }
    // One crest breaking again further along, or spreading back, breaks where an older wave's crest has since run: it
    // keeps that crest's start for the upcoast gate. The next crest, a wavelength behind, does not: it starts its own.
    let crestX = x;
    for (let k = this.waves.length - 1; k >= 0; k -= 1) {
      const older = this.waves[k];
      if (older.group !== group) continue;
      const run = this.celerity * (time - older.onset);
      const { bandWidth } = this.options;
      if (z < older.startZ + run - bandWidth || z > older.startZ + CREST_SPEED_SPAN * run + bandWidth) continue;
      crestX = older.crestX;
      break;
    }
    const nx = this.grid.nx;
    const wave: SpillingWave = {
      id: group > 0 ? group * GROUP_IDS + this.groupStarted[group - 1] : this.started, onset: time, group, direction,
      startX: x, startZ: z, crestX, frontX: x, tipX: x, backX: x,
      reached: new Float64Array(nx).fill(Number.NaN), joinedAt: new Float64Array(nx).fill(Number.NaN),
      joinedZ: new Float64Array(nx).fill(Number.NaN), lastJoin: time, crest: new Float64Array(nx).fill(Number.NaN),
      seen: new Float64Array(nx).fill(Number.NaN), seenAt: new Float64Array(nx).fill(Number.NaN),
    };
    wave.joinedAt[column] = time;
    wave.joinedZ[column] = z;
    wave.reached[column] = time;
    this.waves.push(wave);
    if (group > 0) this.groupStarted[group - 1] += 1;
    else this.started += 1;
    // Each group keeps at most maxWaves: its oldest goes.
    let count = 0;
    for (const other of this.waves) if (other.group === group) count += 1;
    if (count > this.options.maxWaves) this.waves.splice(this.waves.findIndex((other) => other.group === group), 1);
  }

  /**
   * Whether an onset at z in `column` lies on `wave`'s crest: within crestReach of its crest in the nearest column it
   * has one (at the last update), or, nearer, of where it started breaking in a column it joined, run on since then at
   * the breaker celerity (up to CREST_SPEED_SPAN times it).
   */
  private onCrest(wave: SpillingWave, column: number, time: number, z: number): boolean {
    const { nx } = this.grid;
    const reach = this.options.crestReach;
    for (let d = 1; d < nx; d += 1) {
      for (let side = -1; side <= 1; side += 2) {
        const c = column + side * d;
        if (c < 0 || c >= nx) continue;
        const crest = wave.crest[c];
        if (crest === crest) return Math.max(z - crest, crest - z) <= reach;
        const joined = wave.joinedAt[c];
        if (!(joined <= time)) continue;
        const run = this.celerity * (time - joined);
        const start = wave.joinedZ[c];
        return z >= start + run - reach && z <= start + CREST_SPEED_SPAN * run + reach;
      }
    }
    return true;
  }

  /**
   * Whether a breaking cell at z that `wave` owns in column ix lies on its own crest: from crestReach seaward of where
   * its crest was last recorded there (or, never recorded, where it started breaking there) to as far shoreward as it
   * can have run since, at up to CREST_SPEED_SPAN times the breaker celerity, and crestReach beyond. A crest never runs
   * back out to sea, but slows inshore; a younger crest lies a wavelength seaward.
   */
  private ownCrest(wave: SpillingWave, ix: number, time: number, z: number): boolean {
    const reach = this.options.crestReach;
    const seen = wave.seen[ix];
    const from = seen === seen ? seen : wave.joinedZ[ix];
    const since = time - (seen === seen ? wave.seenAt[ix] : wave.joinedAt[ix]);
    return z >= from - reach && z <= from + CREST_SPEED_SPAN * this.celerity * since + reach;
  }

  /** Whether along-shore position `a` lies ahead of `b` in a peel's direction. */
  private ahead(a: number, b: number, direction: 1 | -1): boolean {
    return direction * (a - b) > 0;
  }

  /**
   * Advance the fronts by `dt` at no more than `speedCap(breakerCelerity)` toward their solver tips, then write the
   * whitewater: the solver's `strength` behind each front (thinned to a line at the crest while young), 0 ahead of it,
   * and 0 upcoast of the live crests' first onset beyond `upcoastMargin`.
   * A breaking cell belongs to the newest wave that started breaking in its column whose band holds it: from
   * crestMargin seaward of where it started there to bandWidth shoreward of where its crest has since run at the
   * breaker celerity. Cells no wave's band holds (older bores) keep the solver's strength.
   *
   * `felt` (the roller lens, S3, Q1): the breaking the rider feels, the solver's behind each front and in cells no
   * wave owns, 0 ahead of the fronts, with no ramp. Each wave's crest per column (`crestAt`) is recorded whether or not
   * its front has reached the column.
   *
   * `drawn` with `look` (the Canyon spilling lip): the whitewater drawn, `out` times the look's share in each owned cell
   * younger than its span, `out` everywhere else, except a stray: a cell more than crestReach seaward of its owner's
   * crest there (or, owned by none, of every live wave's), the next crest breaking weakly before its onset joins it to a
   * wave of its own (B ≤ 0.3, or less than 5 m out), which an older wave's band holds meanwhile. It is drawn once its
   * own wave's front has reached it and its curl has landed. Written beside `out` and `felt`, which it never changes.
   * With `drawnEdges`, each row's run of it then frays at its ends along the crest and each column's at its toe; with a
   * look too, a run's peel-side end, where the lip lands, frays only as far as the lip's fingers while its white is young
   * (`DRAWN_EDGES.peelCut`).
   */
  update(time: number, dt: number, breakerCelerity: number, strength: ArrayLike<number>, out: Float64Array, felt?: Float64Array,
    drawn?: Float64Array, look?: SpillingDrawnLook): void {
    const { grid, options } = this;
    const { nx, nz, xCenters, zCenters } = grid;
    const { direction } = options;
    this.celerity = breakerCelerity;
    while (this.waves.length > 0 && time - this.waves[0].onset > options.lifetime) this.waves.shift();
    // A group's own lifetime drops its waves sooner (an A-frame's arm has broken and gone in well under the reef's 45 s).
    if (options.groups?.length) {
      for (let k = this.waves.length - 1; k >= 0; k -= 1) {
        const wave = this.waves[k];
        if (wave.group > 0 && time - wave.onset > options.groups[wave.group - 1].lifetime) this.waves.splice(k, 1);
      }
    }
    // The upcoast gate counts from the most upcoast crest start among a group's live waves: a break further along a crest
    // that no older crest's run holds keeps the gate where its crest first broke, and leaves the arm behind it alone.
    const groups = 1 + (options.groups?.length ?? 0);
    const gateFrom = (this.gates ??= new Float64Array(groups)).fill(Infinity);
    for (const wave of this.waves) gateFrom[wave.group] = Math.min(gateFrom[wave.group], wave.direction * wave.crestX);
    for (const wave of this.waves) {
      const { group, direction: way } = wave;
      const { upcoastMargin } = group > 0 ? this.groupOf(group) : options;
      const cap = this.speedCap(breakerCelerity, group);
      const room = way * (wave.tipX - wave.frontX);
      if (room > 0) wave.frontX += way * Math.min(room, cap * Math.max(0, dt));
      for (let column = 0; column < nx; column += 1) {
        if (!Number.isNaN(wave.reached[column])) continue;
        const x = xCenters[column];
        // Upcoast of the crests' first onset beyond the margin: never reached, so the whitewater there stays withheld.
        if (gateFrom[group] - way * x > upcoastMargin) continue;
        // Behind the front (and upstream of the peak within the margin, which the solver may break on its own): reached now.
        if (!this.ahead(x, wave.frontX, way)) wave.reached[column] = time;
      }
    }
    const waves = this.waves;
    const count = waves.length;
    let seaward: Float64Array | undefined;
    if (drawn) {
      seaward = this.seaward ??= new Float64Array(nx);
      seaward.fill(Number.NaN);
      for (const wave of waves) {
        for (let ix = 0; ix < nx; ix += 1) {
          const seen = wave.seen[ix];
          if (seen === seen && !(seaward[ix] <= seen)) seaward[ix] = seen;
        }
      }
    }
    for (const wave of waves) wave.crest.fill(Number.NaN);
    // Per column, the waves that have joined there, in order (canyon-perf, 2026-10-29): a wave with no onset in a column
    // (its join NaN) can never own a cell of it, so each breaking cell asks only these, in the same order, and picks the
    // same owner as asking every wave would.
    const joinedCount = (this.joinedCount ??= new Int32Array(nx));
    const joinedWaves = (this.joinedWaves = this.joinedWaves && this.joinedWaves.length >= nx * count ? this.joinedWaves : new Int32Array(nx * Math.max(count, 8)));
    const stride = joinedWaves.length / nx;
    joinedCount.fill(0);
    for (let k = 0; k < count; k += 1) {
      const joinedAt = waves[k].joinedAt;
      for (let ix = 0; ix < nx; ix += 1) {
        const joined = joinedAt[ix];
        if (joined === joined) joinedWaves[ix * stride + joinedCount[ix]++] = k;
      }
    }
    this.gated = 0;
    this.ramped = 0;
    const fray = drawn !== undefined && options.drawnEdges;
    const dx = nx > 1 ? xCenters[1] - xCenters[0] : 1;
    const drawnRows = fray ? (this.drawnRows ??= new Int32Array(nz)) : undefined;
    let drawnRowCount = 0;
    let peel: PeelEnd | undefined;
    let ages: Float64Array | undefined;
    let ways: Int8Array | undefined;
    if (fray && look) {
      const end = (this.peel ??= { direction, age: new Float64Array(nx), young: 0, ...(options.groups?.length ? { directions: new Int8Array(nx) } : {}) });
      end.direction = direction;
      end.young = look.span;
      peel = end;
      ages = end.age;
      // With groups, each cell's peel side is its owner's (an A-frame's arms peel apart).
      ways = end.directions;
    }
    for (let iz = 0; iz < nz; iz += 1) {
      // With the drawn edges: whether this row draws any white, its run then frayed at its ends.
      let rowDraws = false;
      const z = zCenters[iz];
      // Water not breaking has none to show, feel or draw: cleared in a run (the M1 CPU study, 2026-10-19); every
      // breaking cell below writes all three.
      out.fill(0, iz * nx, (iz + 1) * nx);
      felt?.fill(0, iz * nx, (iz + 1) * nx);
      drawn?.fill(0, iz * nx, (iz + 1) * nx);
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const b = strength[i];
        if (!(b > 0)) continue;
        let owner = -1;
        let latest = -Infinity;
        for (let m = ix * stride, last = m + joinedCount[ix]; m < last; m += 1) {
          const k = joinedWaves[m];
          const joined = waves[k].joinedAt[ix];
          if (!(joined > latest)) continue;
          const start = waves[k].joinedZ[ix];
          if (z < start - options.crestMargin || z > start + breakerCelerity * (time - joined) + options.bandWidth) continue;
          latest = joined;
          owner = k;
        }
        if (owner < 0) {
          out[i] = b;
          if (felt) felt[i] = b;
          if (ages) ages[ix] = Number.NaN;
          if (ways) ways[ix] = direction;
          if (drawn) {
            drawn[i] = z < seaward![ix] - options.crestReach ? 0 : b;
            if (drawn[i] > 0) rowDraws = true;
          }
          continue;
        }
        // Rows run seaward to shoreward, so the first owned cell met in a column on its own crest is the wave's crest
        // there, gated or not.
        const wave = waves[owner];
        if (Number.isNaN(wave.crest[ix]) && this.ownCrest(wave, ix, time, z)) {
          wave.crest[ix] = z;
          wave.seen[ix] = z;
          wave.seenAt[ix] = time;
        }
        const reached = wave.reached[ix];
        const own = wave.seen[ix];
        const stray = drawn !== undefined && z < (own === own ? own : wave.joinedZ[ix]) - options.crestReach;
        if (Number.isNaN(reached)) {
          out[i] = 0;
          if (felt) felt[i] = 0;
          if (drawn) drawn[i] = 0;
          this.gated += 1;
          continue;
        }
        if (felt) felt[i] = b;
        const local = time - Math.max(reached, latest);
        if (ages) ages[ix] = local;
        if (ways) ways[ix] = wave.direction;
        if (local >= options.rampSeconds) {
          out[i] = b;
          if (drawn) {
            drawn[i] = stray ? 0 : look && local < look.span ? b * look.share(ix, local, z) : b;
            if (drawn[i] > 0) rowDraws = true;
          }
          continue;
        }
        const grown = Math.max(0, local) / options.rampSeconds;
        const width = options.lineWidth + options.growth * Math.max(0, local);
        out[i] = z - wave.crest[ix] > width ? 0 : b * (options.lineShare + (1 - options.lineShare) * grown);
        if (drawn) {
          drawn[i] = stray ? 0 : look && local < look.span && out[i] > 0 ? out[i] * look.share(ix, local, z) : out[i];
          if (drawn[i] > 0) rowDraws = true;
        }
        this.ramped += 1;
      }
      if (rowDraws && drawnRows) {
        frayRow(drawn!, iz * nx, nx, xCenters, dx, z, time, peel);
        drawnRows[drawnRowCount++] = iz;
      }
    }
    if (drawnRows && drawnRowCount > 0) frayToes(drawn!, nx, drawnRows, drawnRowCount, xCenters, zCenters, time);
  }

  /**
   * No waves, numbered from 0 again: a sea taken over without the front's state starts it afresh (the roller lens's
   * plan, §5: a donor without it leaves a fresh front, whose waves come back with the next onsets).
   */
  reset(): void {
    this.waves.length = 0;
    this.started = 0;
    this.groupStarted.fill(0);
    this.celerity = 0;
    this.gated = 0;
    this.ramped = 0;
  }

  /** The front as data, exact: a front built on the same grid and given it with `importState` steps on as this one does. */
  exportState(): SpillingFrontState {
    return {
      started: this.started,
      ...(this.groupStarted.length ? { groupStarted: [...this.groupStarted] } : {}),
      celerity: this.celerity,
      waves: this.waves.map((wave) => ({
        id: wave.id, onset: wave.onset, ...(wave.group > 0 ? { group: wave.group, direction: wave.direction } : {}), startX: wave.startX, startZ: wave.startZ, crestX: wave.crestX, frontX: wave.frontX,
        tipX: wave.tipX, backX: wave.backX, lastJoin: wave.lastJoin,
        reached: toValues(wave.reached), joinedAt: toValues(wave.joinedAt), joinedZ: toValues(wave.joinedZ), crest: toValues(wave.crest),
        seen: toValues(wave.seen), seenAt: toValues(wave.seenAt),
      })),
    };
  }

  /** Takes over another front (`exportState`), built on the same grid with the same options. */
  importState(state: SpillingFrontState): void {
    const { nx } = this.grid;
    this.reset();
    this.started = state.started;
    state.groupStarted?.forEach((count, k) => { if (k < this.groupStarted.length) this.groupStarted[k] = count; });
    this.celerity = state.celerity;
    for (const wave of state.waves) {
      const group = wave.group ?? 0;
      this.waves.push({
        id: wave.id, onset: wave.onset, group, direction: wave.direction ?? this.groupOf(group).direction, startX: wave.startX, startZ: wave.startZ, crestX: wave.crestX, frontX: wave.frontX,
        tipX: wave.tipX, backX: wave.backX, lastJoin: wave.lastJoin,
        reached: fromValues(wave.reached, new Float64Array(nx)), joinedAt: fromValues(wave.joinedAt, new Float64Array(nx)),
        joinedZ: fromValues(wave.joinedZ, new Float64Array(nx)), crest: fromValues(wave.crest, new Float64Array(nx)),
        seen: fromValues(wave.seen, new Float64Array(nx)), seenAt: fromValues(wave.seenAt, new Float64Array(nx)),
      });
    }
  }

  /** A one-line state for reports. */
  describe(): string {
    return this.waves.map((wave) => `[${wave.startX.toFixed(0)}→${wave.frontX.toFixed(0)}/${wave.tipX.toFixed(0)}]`).join(' ');
  }
}
