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
}

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

/** A per-column array as JSON numbers, NaN as null (as `LipState` and `FrontState` carry theirs). */
export type ColumnValues = (number | null)[];

/** One wave as data (the roller plan's §5: the sea handover). */
export interface SpillingWaveState {
  id: number;
  onset: number;
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
  /** Waves started so far. */
  started = 0;
  /** The breaker celerity of the latest update, m/s: how far a wave's band has run since its onset. */
  private celerity = 0;

  constructor(private readonly grid: SpillingGrid, options: Partial<SpillingFrontOptions> = {}) {
    this.options = { ...SPILLING_FRONT_DEFAULTS, ...options };
  }

  /** Along-shore speed cap for a breaker celerity c_b, m/s: c_b / sin α. */
  speedCap(breakerCelerity: number): number {
    return breakerCelerity / seriesSine((this.options.peelAngleDegrees * Math.PI) / 180);
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
  observeOnset(column: number, time: number, z: number): void {
    const x = this.grid.xCenters[column];
    const { joinReach } = this.options;
    for (let k = this.waves.length - 1; k >= 0; k -= 1) {
      const wave = this.waves[k];
      if (!Number.isNaN(wave.joinedAt[column])) continue;
      const low = Math.min(wave.backX, wave.tipX) - joinReach;
      const high = Math.max(wave.backX, wave.tipX) + joinReach;
      if (x < low || x > high) continue;
      if (!this.onCrest(wave, column, time, z)) continue;
      wave.joinedAt[column] = time;
      wave.joinedZ[column] = z;
      wave.lastJoin = time;
      if (this.ahead(x, wave.tipX)) wave.tipX = x;
      if (this.ahead(wave.backX, x)) wave.backX = x;
      return;
    }
    // One crest breaking again further along, or spreading back, breaks where an older wave's crest has since run: it
    // keeps that crest's start for the upcoast gate. The next crest, a wavelength behind, does not: it starts its own.
    let crestX = x;
    for (let k = this.waves.length - 1; k >= 0; k -= 1) {
      const older = this.waves[k];
      const run = this.celerity * (time - older.onset);
      const { bandWidth } = this.options;
      if (z < older.startZ + run - bandWidth || z > older.startZ + CREST_SPEED_SPAN * run + bandWidth) continue;
      crestX = older.crestX;
      break;
    }
    const nx = this.grid.nx;
    const wave: SpillingWave = {
      id: this.started, onset: time, startX: x, startZ: z, crestX, frontX: x, tipX: x, backX: x,
      reached: new Float64Array(nx).fill(Number.NaN), joinedAt: new Float64Array(nx).fill(Number.NaN),
      joinedZ: new Float64Array(nx).fill(Number.NaN), lastJoin: time, crest: new Float64Array(nx).fill(Number.NaN),
      seen: new Float64Array(nx).fill(Number.NaN), seenAt: new Float64Array(nx).fill(Number.NaN),
    };
    wave.joinedAt[column] = time;
    wave.joinedZ[column] = z;
    wave.reached[column] = time;
    this.waves.push(wave);
    this.started += 1;
    if (this.waves.length > this.options.maxWaves) this.waves.shift();
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

  /** Whether along-shore position `a` lies ahead of `b` in the peel's direction. */
  private ahead(a: number, b: number): boolean {
    return this.options.direction * (a - b) > 0;
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
   */
  update(time: number, dt: number, breakerCelerity: number, strength: ArrayLike<number>, out: Float64Array, felt?: Float64Array): void {
    const { grid, options } = this;
    const { nx, nz, xCenters, zCenters } = grid;
    const { direction } = options;
    const cap = this.speedCap(breakerCelerity);
    this.celerity = breakerCelerity;
    while (this.waves.length > 0 && time - this.waves[0].onset > options.lifetime) this.waves.shift();
    // The upcoast gate counts from the most upcoast crest start among the live waves: a break further along a crest
    // that no older crest's run holds keeps the gate where its crest first broke, and leaves the arm behind it alone.
    let gateFrom = Infinity;
    for (const wave of this.waves) gateFrom = Math.min(gateFrom, direction * wave.crestX);
    for (const wave of this.waves) {
      const room = direction * (wave.tipX - wave.frontX);
      if (room > 0) wave.frontX += direction * Math.min(room, cap * Math.max(0, dt));
      for (let column = 0; column < nx; column += 1) {
        if (!Number.isNaN(wave.reached[column])) continue;
        const x = xCenters[column];
        // Upcoast of the crests' first onset beyond the margin: never reached, so the whitewater there stays withheld.
        if (gateFrom - direction * x > options.upcoastMargin) continue;
        // Behind the front (and upstream of the peak within the margin, which the solver may break on its own): reached now.
        if (!this.ahead(x, wave.frontX)) wave.reached[column] = time;
      }
    }
    const waves = this.waves;
    const count = waves.length;
    for (const wave of waves) wave.crest.fill(Number.NaN);
    this.gated = 0;
    this.ramped = 0;
    for (let iz = 0; iz < nz; iz += 1) {
      const z = zCenters[iz];
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const b = strength[i];
        if (!(b > 0)) {
          out[i] = 0;
          if (felt) felt[i] = 0;
          continue;
        }
        let owner = -1;
        let latest = -Infinity;
        for (let k = 0; k < count; k += 1) {
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
        if (Number.isNaN(reached)) {
          out[i] = 0;
          if (felt) felt[i] = 0;
          this.gated += 1;
          continue;
        }
        if (felt) felt[i] = b;
        const local = time - Math.max(reached, latest);
        if (local >= options.rampSeconds) {
          out[i] = b;
          continue;
        }
        const grown = Math.max(0, local) / options.rampSeconds;
        const width = options.lineWidth + options.growth * Math.max(0, local);
        out[i] = z - wave.crest[ix] > width ? 0 : b * (options.lineShare + (1 - options.lineShare) * grown);
        this.ramped += 1;
      }
    }
  }

  /**
   * No waves, numbered from 0 again: a sea taken over without the front's state starts it afresh (the roller lens's
   * plan, §5: a donor without it leaves a fresh front, whose waves come back with the next onsets).
   */
  reset(): void {
    this.waves.length = 0;
    this.started = 0;
    this.celerity = 0;
    this.gated = 0;
    this.ramped = 0;
  }

  /** The front as data, exact: a front built on the same grid and given it with `importState` steps on as this one does. */
  exportState(): SpillingFrontState {
    return {
      started: this.started,
      celerity: this.celerity,
      waves: this.waves.map((wave) => ({
        id: wave.id, onset: wave.onset, startX: wave.startX, startZ: wave.startZ, crestX: wave.crestX, frontX: wave.frontX,
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
    this.celerity = state.celerity;
    for (const wave of state.waves) {
      this.waves.push({
        id: wave.id, onset: wave.onset, startX: wave.startX, startZ: wave.startZ, crestX: wave.crestX, frontX: wave.frontX,
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
