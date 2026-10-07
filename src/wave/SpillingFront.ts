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
  crestMargin: 6,
  bandWidth: 20,
  maxWaves: 8,
  lifetime: 45,
  /**
   * 6 m, provisional: the front's own join reach. At the Canyon the arm's end puts each break contour's most seaward
   * point up to 5.6 m upcoast of its peak at the measured break depths, and before the gate half its crests' foam reached
   * no further than 6 m upcoast of their first onset (`scripts/canyon-haze-report.ts`, Medium, 3 seeds × 14 periods).
   */
  upcoastMargin: 6,
};

/** The grid the front works on: the solver's cell centres (row-major, iz * nx + ix; z grows toward the beach). */
export interface SpillingGrid {
  readonly nx: number;
  readonly nz: number;
  readonly xCenters: ArrayLike<number>;
  readonly zCenters: ArrayLike<number>;
}

/** One wave's front along its crest. */
export interface SpillingWave {
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
}

export class SpillingFront {
  readonly options: SpillingFrontOptions;
  readonly waves: SpillingWave[] = [];
  /** Cells withheld ahead of a front at the last update, and cells thinned by the onset ramp. */
  gated = 0;
  ramped = 0;
  /** Waves started so far. */
  started = 0;
  private readonly crestZ: Float64Array;
  /** The breaker celerity of the latest update, m/s: how far a wave's band has run since its onset. */
  private celerity = 0;

  constructor(private readonly grid: SpillingGrid, options: Partial<SpillingFrontOptions> = {}) {
    this.options = { ...SPILLING_FRONT_DEFAULTS, ...options };
    this.crestZ = new Float64Array(grid.nx * this.options.maxWaves);
  }

  /** Along-shore speed cap for a breaker celerity c_b, m/s: c_b / sin α. */
  speedCap(breakerCelerity: number): number {
    return breakerCelerity / Math.sin((this.options.peelAngleDegrees * Math.PI) / 180);
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
      onset: time, startX: x, startZ: z, crestX, frontX: x, tipX: x, backX: x,
      reached: new Float64Array(nx).fill(Number.NaN), joinedAt: new Float64Array(nx).fill(Number.NaN),
      joinedZ: new Float64Array(nx).fill(Number.NaN), lastJoin: time,
    };
    wave.joinedAt[column] = time;
    wave.joinedZ[column] = z;
    wave.reached[column] = time;
    this.waves.push(wave);
    this.started += 1;
    if (this.waves.length > this.options.maxWaves) this.waves.shift();
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
   */
  update(time: number, dt: number, breakerCelerity: number, strength: ArrayLike<number>, out: Float64Array): void {
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
    const crestZ = this.crestZ;
    crestZ.fill(Number.NaN, 0, nx * options.maxWaves);
    this.gated = 0;
    this.ramped = 0;
    for (let iz = 0; iz < nz; iz += 1) {
      const z = zCenters[iz];
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const b = strength[i];
        if (!(b > 0)) {
          out[i] = 0;
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
          continue;
        }
        const wave = waves[owner];
        const reached = wave.reached[ix];
        if (Number.isNaN(reached)) {
          out[i] = 0;
          this.gated += 1;
          continue;
        }
        // Rows run seaward to shoreward, so the first owned cell met in a column is the wave's crest there.
        const slot = owner * nx + ix;
        if (Number.isNaN(crestZ[slot])) crestZ[slot] = z;
        const local = time - Math.max(reached, latest);
        if (local >= options.rampSeconds) {
          out[i] = b;
          continue;
        }
        const grown = Math.max(0, local) / options.rampSeconds;
        const width = options.lineWidth + options.growth * Math.max(0, local);
        out[i] = z - crestZ[slot] > width ? 0 : b * (options.lineShare + (1 - options.lineShare) * grown);
        this.ramped += 1;
      }
    }
  }

  /** A one-line state for reports. */
  describe(): string {
    return this.waves.map((wave) => `[${wave.startX.toFixed(0)}→${wave.frontX.toFixed(0)}/${wave.tipX.toFixed(0)}]`).join(' ');
  }
}
