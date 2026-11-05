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
  /**
   * Step 7, Q1 (the water-physics advisor's 2026-11-04 ruling, docs/research/pool-tube-wall-2026-11-04/advisor-ruling.md
   * §1.4: the wall's continuity, formation and flow), each piece with its own switch, all on by default:
   * - `continuity` (`?tubeAnchor=old`: off; with `anchor`): each front point's shift is kept step to step in the
   *   simulation (`continueAnchor`), its change capped, held on a miss, never back to the crest anchor once faced, and
   *   the case's crossing's life-0.5 extrapolation blended in over life 0.45–0.55; the loft reads it from the records;
   * - `distance` (`?tubeForm=old`: off; with `lag`): a point joins, and its clock runs before its throw, by its crest's
   *   distance to its throw contour (τ = −D/C_p from the case's earliest frame, at 0.5–1.5× real time), and its slice's
   *   weight ramps over the case's first 0.3 s of τ;
   * - `contour` (`?tubeThrow=break`: off; with `distance`): its lip throws when its clock reaches 0, at the contour,
   *   without waiting for the solver's break (the retire guard kept); off: the later of the contour and the break;
   * - `wallFlow` (`?wallFlow=old`: off; with `anchor` and `union`): the case's water above the solver's surface (the
   *   wall, with no air under it) flows as a wave face does: normal to the case's surface at that surface's own speed,
   *   along the ray ramping from the solver's flow at the anchor's height to B·C at the crest (Derakhti et al. 2020).
   */
  continuity: boolean;
  distance: boolean;
  contour: boolean;
  wallFlow: boolean;
}

/** The thrown clock's catch-up before the ruling, × real time (`advanceClocks`), and after it. */
export const THROWN_RATE = { old: 2, face: 1.25 } as const;

/** The step 3 switches a config carries (`SurfZoneConfig`): see `TubeFace`. */
export interface TubeFaceSwitches {
  tubeFace?: 'old';
  tubeFrom?: 'piece';
  tubeLag?: 0;
  tubeClock?: 'old';
  /** Step 7, Q1's (`TubeFace.continuity`, `.distance`, `.contour`, `.wallFlow`). */
  tubeAnchor?: 'old';
  /**
   * The crash's switch (`SurfZoneConfig.sweptCrash`, `?poolCrash=off`): the anchor's continuity is kept by the crash
   * (`CrashCurve.prepareAnchors`), so without it the anchor is computed afresh each build, as step 6's.
   */
  sweptCrash?: boolean;
  tubeForm?: 'old';
  tubeThrow?: 'break';
  wallFlow?: 'old';
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
  const lag = !piece && switches.tubeLag !== 0;
  const distance = lag && switches.tubeForm !== 'old';
  return {
    anchor: !piece, union, lag,
    clockRate: !piece && switches.tubeClock !== 'old' ? THROWN_RATE.face : THROWN_RATE.old, thrownEnds: !piece,
    continuity: !piece && switches.tubeAnchor !== 'old' && switches.sweptCrash !== false, distance,
    contour: distance && switches.tubeThrow !== 'break',
    wallFlow: !piece && union && switches.wallFlow !== 'old',
  };
}

/**
 * The anchor's continuity (step 7, Q1's first piece; the advisor's 2026-11-04 ruling §1.4.1), per front point, step to step,
 * in the wave's frame: the case's crest's place along the point's ray, W = S·n + δ, against the wave's own advance C Δt.
 * - `crest`, `slack`: W's change is held within (`crest` C + `slack`) Δt of C Δt a step, C the wave's advance along the
 *   point's ray (its crest's pace along its column, projected on the ray: `pathPace` n_z): 0.3 C is the case's own crest
 *   outrunning its lower face (step 3), and the slack 0.005 m a 1/60 s step (0.3 m/s),
 *   about 0.03 m a step at C ≈ 5 m/s. *(Built so)* In the wave's frame rather than on δ alone: a front's point is its
 *   crest cell's centre, so it moves along its column in the solver's 1 m row steps while the wave moves on; a cap on δ
 *   relative to it would fight those steps and move the wall with them;
 * - `hold`, s: on a miss (no point within the smoothing's reach has a clean crossing) W runs on at its last rate for up
 *   to this long, then the shift stands with the point; a point never goes back to the crest anchor once it has had a face
 *   anchor;
 * - `ease`, s: a point that stood on the crest anchor before its first face anchor eases from it to the face anchor over
 *   this long (smoothstep), uncapped meanwhile;
 * - `blend`: the case's crossing's extrapolation from life 0.5 (`FACE_ANCHOR.extrapolate`) blended in over these shares of
 *   touchdown (smoothstep) rather than switched on at once.
 * Only + − × ÷, for online determinism.
 */
export const ANCHOR_CONTINUITY = { crest: 0.3, slack: 0.3, hold: 0.5, ease: 0.3, blend: [0.45, 0.55] } as const;

/** A front point's anchor track (`continueAnchor`; `FrontPoint`'s, travelling with it). */
export interface AnchorTrack {
  /** Its shift as last kept, m (absent: it has never had a face anchor), and its case's crest's speed along its ray, m/s. */
  anchorShift?: number;
  anchorRate?: number;
  /** When it was last kept, and when it last had a clean (smoothed) shift, s. */
  anchorTime?: number;
  anchorGood?: number;
  /** Where the point was when last kept (x, z), m. */
  anchorX?: number;
  anchorZ?: number;
  /** When its ease from the crest anchor began, s (a point that stood on the crest anchor first). */
  anchorEase?: number;
  /** It has stood on the crest anchor (no face anchor yet). */
  anchorNone?: true;
  /**
   * Diagnostics (a probe's; nothing reads them in the game): the smoothed shift it was last given, m (NaN: none in reach),
   * and what `continueAnchor` did with it.
   */
  anchorTarget?: number;
  anchorLast?: 'kept' | 'capped' | 'held' | 'stood' | 'eased' | 'crest' | 'free';
}

/** Counts of `continueAnchor`'s outcomes (a probe's; none in the game). */
export const anchorCounts = { kept: 0, capped: 0, held: 0, stood: 0, eased: 0, crest: 0 };

/**
 * A point's shift this step from its smoothed shift `smoothed` (m; NaN with none in reach) at `time` (s), the point at
 * (x, z) on its ray (rayX, rayZ), its crest's speed along the ray `celerity` (m/s): see `ANCHOR_CONTINUITY`. NaN while it
 * has never had a face anchor (the crest anchor). `capped` false keeps the smoothed shift as it is (the case's crest's speed
 * alone is tracked: `?tubeAnchor=old` with the wall's flow on).
 */
export function continueAnchor(
  track: AnchorTrack, smoothed: number, time: number, celerity: number, x: number, z: number, rayX: number, rayZ: number, capped = true,
): number {
  const previous = track.anchorShift;
  const dt = track.anchorTime === undefined ? 0 : time - track.anchorTime;
  // How far the point moved along its ray since it was last kept.
  const moved = track.anchorX === undefined ? 0 : (x - track.anchorX) * rayX + (z - track.anchorZ!) * rayZ;
  track.anchorTime = time;
  track.anchorX = x;
  track.anchorZ = z;
  const valid = previous !== undefined && previous === previous;
  track.anchorTarget = smoothed;
  if (!capped) {
    track.anchorLast = 'free';
    track.anchorRate = smoothed === smoothed && valid && dt > 0 ? (moved + smoothed - previous!) / dt : celerity;
    track.anchorShift = smoothed;
    return smoothed;
  }
  const { crest, slack, hold, ease } = ANCHOR_CONTINUITY;
  if (!(smoothed === smoothed)) {
    if (previous === undefined) {
      track.anchorNone = true;
      track.anchorLast = 'crest';
      anchorCounts.crest += 1;
      return Number.NaN;
    }
    if (time - track.anchorGood! <= hold) {
      // A miss: the case's crest runs on along the ray at its last rate.
      track.anchorShift = previous + track.anchorRate! * dt - moved;
      track.anchorLast = 'held';
      anchorCounts.held += 1;
    } else {
      // Then it stands with the point.
      track.anchorRate = dt > 0 ? moved / dt : track.anchorRate;
      track.anchorLast = 'stood';
      anchorCounts.stood += 1;
    }
    return track.anchorShift!;
  }
  track.anchorGood = time;
  let shift: number;
  if (previous === undefined && track.anchorNone) track.anchorEase = time;
  const easing = track.anchorEase !== undefined && time - track.anchorEase < ease;
  if (easing) {
    // From the crest anchor (a shift of 0) to the face anchor, uncapped.
    const u = (time - track.anchorEase!) / ease;
    shift = u * u * (3 - 2 * u) * smoothed;
    track.anchorLast = 'eased';
    anchorCounts.eased += 1;
  } else if (previous === undefined) {
    // Faced from its first step: it starts there.
    shift = smoothed;
    track.anchorLast = 'kept';
    anchorCounts.kept += 1;
  } else {
    // In the wave's frame: the target's change along the ray against the wave's own advance, within the cap.
    const advance = celerity * dt;
    const cap = (crest * celerity + slack) * dt;
    const target = moved + smoothed - previous;
    const change = advance + Math.min(cap, Math.max(-cap, target - advance));
    shift = previous + change - moved;
    track.anchorLast = change !== target ? 'capped' : 'kept';
    if (change !== target) anchorCounts.capped += 1;
    else anchorCounts.kept += 1;
  }
  track.anchorRate = previous !== undefined && dt > 0 ? (moved + shift - previous) / dt : celerity;
  track.anchorShift = shift;
  return shift;
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

  /**
   * `blend`: the crossing's extrapolation from life 0.5 blended in over `ANCHOR_CONTINUITY.blend` (step 7's continuity),
   * not switched on at once.
   */
  constructor(private readonly library: ProfileLibrary, slope: number, private readonly blend = false) {
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
    if (this.blend) return this.blendedFace(shape, frozen, touchdown, times.frameSeconds, out);
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
   * `caseFace`'s crossing and speed under `blend` (the profile at `shape` already in `this.profile`): the instantaneous
   * crossing and its motion over ±4 frames before life `ANCHOR_CONTINUITY.blend[0]`, the extrapolation's line from
   * `blend[1]` on, and between them the two blended by a smoothstep, so the crossing never steps.
   */
  private blendedFace(shape: number, frozen: boolean, touchdown: number, frameSeconds: number, out: Float64Array): Float64Array {
    const [early, late] = FACE_ANCHOR.extrapolate;
    const [from, to] = ANCHOR_CONTINUITY.blend;
    let line = Number.NaN;
    let lineSpeed = Number.NaN;
    if (touchdown > 0 && shape >= from * touchdown) {
      const a = this.crossingAt(early * touchdown);
      const b = this.crossingAt(late * touchdown);
      lineSpeed = (b - a) / ((late - early) * touchdown);
      line = b + lineSpeed * (shape - late * touchdown);
      if (shape >= to * touchdown) {
        out[0] = line;
        out[2] = frozen ? 0 : lineSpeed;
        return out;
      }
    }
    // `crossingAt` reloads the profile: the instantaneous crossing first, from the shape's own frame.
    this.query.seconds = shape;
    this.query.hold = undefined;
    this.library.profileAt(this.query, this.profile);
    const own = caseCrossing(this.profile, shape < 0 ? LANDMARK.crest : LANDMARK.throat);
    const at = own === own || shape < 0 ? own : caseCrossing(this.profile, LANDMARK.crest);
    let speed = 0;
    if (!frozen) {
      const window = 4 * frameSeconds;
      const ahead = this.crossingAt(shape + window);
      const behind = this.crossingAt(shape - window);
      speed = ahead === ahead && behind === behind ? (ahead - behind) / (2 * window) : 0;
    }
    if (!(line === line)) {
      out[0] = at;
      out[2] = speed;
      return out;
    }
    const u = (shape - from * touchdown) / ((to - from) * touchdown);
    const b = u * u * (3 - 2 * u);
    out[0] = at === at ? at + b * (line - at) : line;
    out[2] = frozen ? 0 : speed + b * (lineSpeed - speed);
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

/**
 * Step 7's continuity: the shifts smoothed along σ as `smoothShifts`, but of the places they put the case's crest along
 * point k's ray (`rayX`, `rayZ` per point), not of their distances from each point: neighbour j's counts as
 * (S_j − S_k)·n_k + δ_j. A front's points are their crest cells' centres, stepping along their columns in the solver's
 * 1 m rows; a neighbour's step moves its own shift by the step but not the place its case's crest stands, so this keeps
 * the steps out of point k's smoothed shift. Returns how many stay NaN.
 */
export function smoothPlaces(
  sigma: ArrayLike<number>, x: ArrayLike<number>, z: ArrayLike<number>, raw: ArrayLike<number>, rayX: ArrayLike<number>,
  rayZ: ArrayLike<number>, n: number, out: Float64Array,
): number {
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
      total += w * ((x[j] - x[k]) * rayX[k] + (z[j] - z[k]) * rayZ[k] + raw[j]);
      weights += w;
    }
    out[k] = weights > 0 ? total / weights : Number.NaN;
    if (!(out[k] === out[k])) misses += 1;
  }
  return misses;
}
