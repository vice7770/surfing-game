import { LANDMARK, PROFILE_POINTS, type ProfileLibrary, type ProfileQuery } from './ProfileLibrary';
import { CLOCK } from './sliceClock';

/**
 * The face anchor (the surfable-tube plan's step 4; the water-physics advisor's step 3 ruling, 2026-11-03,
 * docs/research/pool-tube-face-2026-11-03/advisor-ruling.md). The game's solver smears a plunging wave's steep front
 * into a slope centred on it, so its crest is the rounded, lagging top; the case and the solver agree on the lower face.
 * So each case stands where its lower face meets the solver's, not where its crest meets the solver's crest:
 * - `fraction`: the face crossing both are matched at, of each one's height over its trough (0.3; 0.2–0.4 keeps the
 *   match within ±0.1 m before the throw);
 * - `step`, `behind`, `reach`: the solver's surface is read every `step` m along the ray, from `behind` m behind the
 *   point to `reach` of the case's height H ahead; its trough is the lowest read, its crest the highest before it;
 * - `extrapolate`: from this share of touchdown (0.5) the case's crossing runs on at its mean speed over
 *   [`extrapolate[0]`, `extrapolate[1]`] of touchdown: the lower face moves steadily (3.9–4.4 m/s at 1.5 m), but the
 *   crossing jumps 0.2–1 m as the jet nears the face;
 * - `smoothing`, m: the shift is smoothed along σ with the slice clock's biweight (2 m standard deviation).
 * All provisional (the advisor). Only + − × ÷ and √, for online determinism.
 */
export const FACE_ANCHOR = { fraction: 0.3, step: 0.25, behind: 1, reach: 3, extrapolate: [0.3, 0.5], smoothing: CLOCK.smoothing } as const;
/** The biweight's radius, m: a 2 m standard deviation (`CLOCK.smoothing`), as the slice clock's. */
const RADIUS = FACE_ANCHOR.smoothing * Math.sqrt(7);
const LAST = PROFILE_POINTS - 1;

/**
 * What a swept spot's tube does under the advisor's step 3 ruling (`tubeFaceOf`; the pool's `BarrelSpot.faceAnchor`):
 * - `anchor`: the face anchor in place of the crest anchor (`?tubeFrom=piece` turns it off, with `lag`, `clockRate` and
 *   `thrownEnds`: the fitted piece as it was);
 * - `union`: the support is never below the solver's surface: the loft's floor vertices are raised to it and the water
 *   is the union of the solver's and the loft's (`?tubeFace=old` turns it off);
 * - `lag`: slices start at the case's earliest frame, a join `lead` m deeper than the throw (`?tubeLag=0`: at the white,
 *   zero lag);
 * - `clockRate`: the fastest a thrown slice's clock catches up, × real time (1.25; `?tubeClock=old`: 2, as before);
 * - `thrownEnds`: a thrown front end blends over at least its height H (it carries a 0.8–1.0 m wall), not 1 m.
 */
export interface TubeFace {
  anchor: boolean;
  union: boolean;
  lag: boolean;
  clockRate: number;
  thrownEnds: boolean;
}

/** The thrown clock's catch-up before the ruling, × real time (`advanceClocks`), and after it. */
export const THROWN_RATE = { old: 2, face: 1.25 } as const;

/** The step 3 switches a config carries (`SurfZoneConfig`): see `TubeFace`. */
export interface TubeFaceSwitches {
  tubeFace?: 'old';
  tubeFrom?: 'piece';
  tubeLag?: 0;
  tubeClock?: 'old';
}

/**
 * A spot's tube under the step 3 ruling, from its `faceAnchor` flag and the config's switches; undefined where none of it
 * applies (every spot but the pool's straight Barrel, and the pool with `?tubeFace=old&tubeFrom=piece`): the build is then
 * exactly as before.
 */
export function tubeFaceOf(faceAnchor: boolean | undefined, switches: TubeFaceSwitches): TubeFace | undefined {
  if (!faceAnchor) return undefined;
  const piece = switches.tubeFrom === 'piece';
  const union = switches.tubeFace !== 'old';
  if (piece && !union) return undefined;
  return {
    anchor: !piece, union, lag: !piece && switches.tubeLag !== 0,
    clockRate: !piece && switches.tubeClock !== 'old' ? THROWN_RATE.face : THROWN_RATE.old, thrownEnds: !piece,
  };
}

/**
 * The case's lowest face crossing at `fraction` of its height over its trough, m along its profile (`profile`, m): searched
 * forward from `from` (the crest before the throw, the throat after it) on the profile's own points, its trough the lowest
 * point from there on; NaN without a crossing.
 */
export function caseCrossing(profile: ArrayLike<number>, from: number, fraction: number = FACE_ANCHOR.fraction): number {
  let trough = Infinity;
  for (let i = from; i <= LAST; i += 1) if (profile[2 * i + 1] < trough) trough = profile[2 * i + 1];
  const height = profile[2 * LANDMARK.crest + 1] - trough;
  if (!(height > 0)) return Number.NaN;
  const level = trough + fraction * height;
  for (let i = from; i < LAST; i += 1) {
    const y0 = profile[2 * i + 1];
    const y1 = profile[2 * i + 3];
    if (y0 >= level && y1 < level) return profile[2 * i] + ((y0 - level) / (y0 - y1)) * (profile[2 * i + 2] - profile[2 * i]);
  }
  return Number.NaN;
}

/**
 * The face anchor's arithmetic for one library (the loft's and the crash's): a point's shift, where its case's crest
 * stands along its ray from the point once the case's lower face sits on the solver's, and the case's crossing's motion.
 */
export class FaceAnchor {
  private readonly profile = new Float32Array(2 * PROFILE_POINTS);
  private readonly query: ProfileQuery;
  private reads = new Float64Array(64);
  /** The last `caseFace`'s shape's height, crest over trough, m. */
  private height = 0;
  /** Shifts asked, and those with no clean crossing on the solver's face or the case's (the crest anchor stands). */
  readonly stats = { shifts: 0, solverMisses: 0, caseMisses: 0 };

  constructor(private readonly library: ProfileLibrary, slope: number) {
    this.query = { slope, footHeight: 0, footDepth: 0, seconds: 0 };
  }

  /**
   * The clock the profile's shape is at, s: a `contact` hold freezes each case at its clear frame, and both holds keep
   * the touchdown frame after touchdown (`ProfileLibrary.caseTimes`; for a blend, its clear time).
   */
  private shapeSeconds(tau: number, hold: ProfileQuery['hold'], touchdown: number, clear: number): number {
    if (hold === undefined) return tau;
    const shown = Math.min(tau, touchdown);
    return hold === 'contact' ? Math.min(shown, clear) : shown;
  }

  /** The case's crossing at shape clock `seconds` (s), m along its profile, from its frames; NaN without one. */
  private crossingAt(seconds: number): number {
    this.query.seconds = seconds;
    this.query.hold = undefined;
    this.library.profileAt(this.query, this.profile);
    const at = caseCrossing(this.profile, seconds < 0 ? LANDMARK.crest : LANDMARK.throat);
    return at === at || seconds < 0 ? at : caseCrossing(this.profile, LANDMARK.crest);
  }

  /**
   * The case's crossing (m along its profile) and its crest's (m) at clock `tau` (s) under `hold`, and the crossing's
   * speed along the profile, m per second of the clock: from `FACE_ANCHOR.extrapolate[1]` of touchdown on, run on at its
   * mean speed over the window before; a frozen shape's is 0. Into `out` (crossing, crest, speed); the crossing NaN
   * without one.
   */
  caseFace(footHeight: number, footDepth: number, tau: number, hold: ProfileQuery['hold'], out: Float64Array): Float64Array {
    const query = this.query;
    query.footHeight = footHeight;
    query.footDepth = footDepth;
    const times = this.library.profileTimes(query);
    const touchdown = times.touchdownSeconds;
    const shape = this.shapeSeconds(tau, hold, touchdown, times.clearSeconds);
    const [early, late] = FACE_ANCHOR.extrapolate;
    query.seconds = shape;
    query.hold = undefined;
    this.library.profileAt(query, this.profile);
    out[1] = this.profile[2 * LANDMARK.crest];
    let trough = Infinity;
    for (let i = LANDMARK.crest; i <= LAST; i += 1) if (this.profile[2 * i + 1] < trough) trough = this.profile[2 * i + 1];
    this.height = this.profile[2 * LANDMARK.crest + 1] - trough;
    const frozen = shape !== tau;
    if (shape >= late * touchdown && touchdown > 0) {
      const a = this.crossingAt(early * touchdown);
      const b = this.crossingAt(late * touchdown);
      const speed = (b - a) / ((late - early) * touchdown);
      out[0] = b + speed * (shape - late * touchdown);
      out[2] = frozen ? 0 : speed;
      return out;
    }
    const at = caseCrossing(this.profile, shape < 0 ? LANDMARK.crest : LANDMARK.throat);
    out[0] = at === at || shape < 0 ? at : caseCrossing(this.profile, LANDMARK.crest);
    if (frozen) {
      out[2] = 0;
      return out;
    }
    // The crossing's motion over ±4 frames, as the loft's landmarks' (`landmarkVelocity`).
    const window = 4 * times.frameSeconds;
    const ahead = this.crossingAt(shape + window);
    const behind = this.crossingAt(shape - window);
    out[2] = ahead === ahead && behind === behind ? (ahead - behind) / (2 * window) : 0;
    return out;
  }

  /**
   * The solver's face crossing at `fraction` of its height along the ray (nx, nz) from the point (x, z), m from the point;
   * NaN without a clean one. `height` (m) sets how far ahead its trough is looked for.
   */
  solverCrossing(x: number, z: number, nx: number, nz: number, height: number, heightAt: (x: number, z: number) => number): number {
    const { step, behind, reach, fraction } = FACE_ANCHOR;
    const count = Math.floor((behind + reach * height) / step) + 1;
    if (this.reads.length < count) this.reads = new Float64Array(2 * count);
    const reads = this.reads;
    let low = 0;
    for (let k = 0; k < count; k += 1) {
      const along = -behind + k * step;
      reads[k] = heightAt(x + along * nx, z + along * nz);
      if (reads[k] < reads[low]) low = k;
    }
    let high = 0;
    for (let k = 1; k <= low; k += 1) if (reads[k] > reads[high]) high = k;
    // The extremes' levels refined by the parabola through each and its neighbours, so the level moves smoothly as the
    // sea does rather than in steps as the extreme passes from one read to the next.
    const extreme = (k: number) => {
      if (k <= 0 || k >= count - 1) return reads[k];
      const a = reads[k - 1];
      const b = reads[k];
      const c = reads[k + 1];
      const curve = a - 2 * b + c;
      return curve !== 0 ? b - ((a - c) * (a - c)) / (8 * curve) : b;
    };
    const top = extreme(high);
    const bottom = extreme(low);
    const span = top - bottom;
    if (!(span > 0.1 * height)) return Number.NaN;
    const level = bottom + fraction * span;
    for (let k = high; k < low; k += 1) {
      if (reads[k] >= level && reads[k + 1] < level) return -behind + (k + (reads[k] - level) / (reads[k] - reads[k + 1])) * step;
    }
    return Number.NaN;
  }

  /**
   * A point's shift, m: where its case's crest stands along its ray (nx, nz) from the point (x, z), its case's lower face
   * crossing sitting on the solver's (`heightAt`); NaN where either has no clean crossing (the crest anchor stands: 0).
   * `face` is scratch, left holding `caseFace`'s.
   */
  shift(
    footHeight: number, footDepth: number, tau: number, hold: ProfileQuery['hold'], x: number, z: number, nx: number, nz: number,
    heightAt: (x: number, z: number) => number, face: Float64Array,
  ): number {
    this.stats.shifts += 1;
    this.caseFace(footHeight, footDepth, tau, hold, face);
    if (!(face[0] === face[0])) {
      this.stats.caseMisses += 1;
      return Number.NaN;
    }
    // The case's height sets the solver's search: its crest over its trough.
    const solver = this.solverCrossing(x, z, nx, nz, Math.max(0.2, this.height), heightAt);
    if (!(solver === solver)) {
      this.stats.solverMisses += 1;
      return Number.NaN;
    }
    return solver - face[0] + face[1];
  }
}

/**
 * The shifts smoothed along σ with the biweight (1 − u²)² over `RADIUS` (the clock's 2 m standard deviation), weighed over
 * the points with one: a point with none, and no neighbour with one, keeps NaN. `sigma[k]`, `raw[k]` for k in [0, n).
 * Returns how many stay NaN.
 */
export function smoothShifts(sigma: ArrayLike<number>, raw: ArrayLike<number>, n: number, out: Float64Array): number {
  let misses = 0;
  let from = 0;
  for (let k = 0; k < n; k += 1) {
    while (from < n && sigma[k] - sigma[from] >= RADIUS) from += 1;
    let total = 0;
    let weights = 0;
    for (let j = from; j < n && sigma[j] - sigma[k] < RADIUS; j += 1) {
      if (!(raw[j] === raw[j])) continue;
      const u = (sigma[j] - sigma[k]) / RADIUS;
      const w = (1 - u * u) * (1 - u * u);
      total += w * raw[j];
      weights += w;
    }
    out[k] = weights > 0 ? total / weights : Number.NaN;
    if (!(out[k] === out[k])) misses += 1;
  }
  return misses;
}
