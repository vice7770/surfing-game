import { GRAVITY } from '../dispersion';
import { LANDMARK, PROFILE_POINTS, type ProfileLibrary, type ProfileQuery } from './ProfileLibrary';
import { CLOCK } from './sliceClock';
import { TUBE_FORM_EARLY, TUBE_SEAM, type TubeSeam } from './tubeSeam';

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
/**
 * Ruling 3's read of the solver's trough (`TubeFace.track`, `FaceAnchor.solverCrossing`'s `halfWave`): up to `back` reads
 * further behind for a crest at the window's start, a read every `coarse` m past the fine window (in the wave's frame, from
 * the crest), and the trough read again every `FACE_ANCHOR.step` m within ±`refine` m of a coarse one, the whole gap to its
 * neighbours (the advisor: "1 m beyond 3 H, 0.25 m near the minimum").
 */
export const TROUGH = { back: 12, coarse: 1, refine: 1, box: 0.5 } as const;
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
  /**
   * The step 7 follow-up (the water-physics advisor's 2026-11-05 ruling, docs/research/pool-tube-wall-2026-11-04/
   * advisor-ruling-2.md), each piece with its own switch, all on by default:
   * - `contact` (`?tubeContact=old`: off; with `union`): a body in the case's wall water takes its water from the nearest
   *   surface along its own normal, the crossing above or the face just ahead along the ray (`SweptContact.query`'s
   *   horizontal cast), its immersion the distance along that normal, its kinematic normal speed faded out 0.3–0.6 m deep,
   *   and the wall's water under the solver's surface too where the case's surface stands over it (§1);
   * - `cap` (`?tubeCap=old`: off; with `continuity`): the anchor's continuity cap at 0.45 C (`ANCHOR_CONTINUITY.crestWide`)
   *   rather than 0.3 C (§3);
   * - `merge` (`?tubeMerge=old`: off; with `anchor`): a crest joining by distance beside a front's end joins that front,
   *   and the loft never drops an open strip at weight ≥ 0.5, two thrown strips keeping the earlier-thrown (§5);
   * - `guard` (opt-in, `?tubeGuard=on`; with `contour`): the retire guard scaled to the case's open time, a thrown point's
   *   flag cleared when the solver breaks its crest, and the jet of a point retired unbroken returned to its crest (§4). Off
   *   by default (the coordinator, 2026-11-05): it raised the meter 8.1 % at a38 1.5 m, past the owner's ±5 % of main.
   */
  contact: boolean;
  cap: boolean;
  merge: boolean;
  guard: boolean;
  /**
   * The step 7 follow-up's ruling 3 (the water-physics advisor's 2026-11-05 ruling on the five open questions,
   * docs/research/pool-tube-contact-2026-11-05/advisor-ruling-3.md), each piece with its own switch (the inertia and no
   * retire on by default; the smooth wall, the buoyancy and the drop rule opt-in: measured, they made bars worse or did not
   * help, docs/research/pool-tube-track-2026-11-05/README.md):
   * - `track` (opt-in, `?tubeTrack=on`; with `continuity`): a smooth wall. Off by default: it smooths the wall water (its
   *   step a body meets p50 0.08–0.15 against 0.34–0.75 m/s) and W (jitter 0.028 against 0.12 m), but doubles bar 2a on
   *   all four (0.60–0.77 against 0.29–0.52 m) and overruns a38 1.5 m's boards just down the line (2b 50 % against 15 %).
   *   On, the solver's crossing is read against its real trough, the lowest water within half a wavelength ahead of its
   *   crest and the case's reach (`FaceAnchor.troughCrossing`); W is tracked by an α–β filter (`trackAnchor`,
   *   `ANCHOR_TRACK`) with the cap kept as its gate; the wall water's speed is the tracker's rate, its surface's own normal
   *   speed (`SweptLoft.normalSpeed`); and it blends into the solver's flow across the solver's surface (`WALL_WATER`) (§1, §3);
   * - `inertia` (`?tubeInertia=old`: off; with `wallFlow`): in the case's wall water only, the water's own acceleration on
   *   the hull's added mass (`BoardBody`, `WATER_INERTIA`; Maxey & Riley 1983, Auton, Hunt & Prud'homme 1988) (§2);
   * - `retire` (`?tubeRetire=old`: off; with `contour`): a contour-thrown point is never retired for being unbroken (§4);
   *   `?tubeThrow=break` keeps that retire, and the opt-in guard keeps its own;
   * - `buoy` (opt-in, `?tubeBuoy=on`; with `wallFlow`): in the wall water, past the slope clamp, the buoyancy along the true
   *   normal at the clamp's size, not a fixed 60° up the face (§1, rank 5). Off by default: measured, no help (2a, 2b, flips
   *   within a run's spread at both case lists, docs/research/pool-tube-track-2026-11-05/README.md);
   * - `drop` (opt-in, `?tubeDrop=on`; with `anchor`): where two fronts' strips overlap the lighter gives way, whatever its
   *   phase or front; on a tie the first front's stays (§5). Off by default: measured, it raised the holes (pool 1.5 m, 12
   *   periods: 0.013 → 0.022 a build, visible 24 → 38).
   */
  track: boolean;
  inertia: boolean;
  retire: boolean;
  buoy: boolean;
  drop: boolean;
  /**
   * Ruling 4's rank 1 (the water-physics advisor's advisor-ruling-4.md, docs/research/pool-tube-track-2026-11-05; notes in
   * docs/research/form-clock-2026-11-11/README.md), with `distance`: the C1 formation clock. The clock advances by a rate
   * that follows −D/C_p critically damped, within 0.5–1.5 × real time, changing by at most 1 a second
   * (`OnsetTiming.distance.c1`, `FORM_CLOCK`); D is read from the crest's place within its cell (`CrestSample.sub`); and
   * the wall water reads that same rate, set a step ahead (`FrontPoint.formRate`). `FORM_CLOCK_DEFAULT` says whether it is
   * on by default; `?formClock=old` is always step 7's clock, exactly, and `?formClock=c1` always this one. Absent: off.
   */
  formClock?: boolean;
  /**
   * Ruling 5's seam blend (the water-physics advisor's advisor-ruling-5.md §4, docs/research/tube-seam-2026-11-11), with
   * `union` and `wallFlow`: one weight α = α_h · α_τ for the case's drawn loft, its collided surface and its water's flow
   * (`TUBE_SEAM`, tubeSeam.ts). A floor vertex stands S(δ / b) · α_τ of its height δ over the solver's surface (in place of
   * the clamp max(case, solver)); the wall water's share is that same weight, so it has none where the case's surface is
   * the solver's (in place of the source flag); and the crest water's share of the crest's speed goes 0.85 → 1 over 0.2 s
   * after the throw (in place of the step). The lip's vertices from the crest to the throat of an overturned slice (air
   * under them) keep the plain union, by α_τ alone. Opt-in (`?tubeSeam=blend`, with `?seamTau=on,full` and `?seamBand=m`);
   * absent: off, the build exactly as before. Ruling 17's early course (`?tubeForm=early`, with `crestLine`): `seam.depth`
   * is `TUBE_FORM_EARLY`, so α_τ runs from −2.3 to −0.7 √(h0/g) before the throw at each slice (`seamCourseWeight`);
   * the case, its frames, the clock, the throw and the crash are untouched. A `?seamTau` given with it wins.
   */
  seam?: TubeSeam;
  /**
   * Ruling 6's streamline wall water (the water-physics advisor's advisor-ruling-6.md §4,
   * docs/research/wall-body-2026-11-11), with `seam`: the wall water's flow is the surface's streamline in the wave's
   * frame, its speed from the height under the crest (`streamWallFlow`), and the wave speed it reads is the wave's own
   * advance (not the drawn crest's rate). It replaces the two noisy inputs ruling 6 measured: the case surface's speed
   * differenced between frames, and the anchor's rate. Opt-in (`?wallBody=stream` with `?tubeSeam=blend`); absent: off,
   * the build exactly as before.
   */
  stream?: true;
  /**
   * Ruling 7's step 1 (the water-physics advisor's ruling 7, docs/research/surface-rise-2026-11-11/ruling-7; notes in
   * docs/research/crest-line-2026-11-11/README.md), with `distance`: before its throw a front point stands where its crest
   * stands within its cell, not on the cell's centre (`FrontOptions.crestLine`), so the crest line the slices, rays,
   * anchors and clocks are laid along doesn't hop a row at a time. Opt-in: 'sub' (`?crestLine=sub`), the top of the
   * parabola through the crest's cell and its neighbours; 'top' (`?crestLine=top`), the centre of the crest's top
   * quarter (`CrestSample.top`), which doesn't leap where a broad crest's highest cell changes. Absent: off, the build
   * exactly as before.
   */
  crestLine?: 'sub' | 'top';
}

/**
 * Whether ruling 4's C1 formation clock is on where no switch says (`TubeFace.formClock`): on only if every one of its
 * bars passed (docs/research/form-clock-2026-11-11/README.md).
 */
export const FORM_CLOCK_DEFAULT: boolean = false;

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
  /** 'old', step 6's formation; 'early' (ruling 17, opt-in), the seam's course by depth (`TubeFace.seam`), with `tubeSeam` and `crestLine`. */
  tubeForm?: 'old' | 'early';
  tubeThrow?: 'break';
  wallFlow?: 'old';
  /** The step 7 follow-up's (`TubeFace.contact`, `.cap`, `.merge`, `.guard`). */
  tubeContact?: 'old';
  tubeCap?: 'old';
  tubeMerge?: 'old';
  /** Opt-in: 'on' turns the guard on (`TubeFace.guard`); absent, or anything else, it is off. */
  tubeGuard?: 'on';
  /** Ruling 3's (`TubeFace.track`, `.inertia`, `.retire`, `.buoy`, `.drop`); the smooth wall opt-in, as the last two. */
  tubeTrack?: 'on';
  tubeInertia?: 'old';
  tubeRetire?: 'old';
  /** Opt-in: 'on' turns each on (`TubeFace.buoy`, `.drop`); absent, or anything else, it is off (they measured no help). */
  tubeBuoy?: 'on';
  tubeDrop?: 'on';
  /** Ruling 4's rank 1 (`TubeFace.formClock`): 'old', step 7's clock; 'c1', the C1 clock; absent, `FORM_CLOCK_DEFAULT`. */
  formClock?: 'old' | 'c1';
  /** Ruling 5's seam blend (`TubeFace.seam`), opt-in: 'blend' turns it on; absent, or anything else, it is off. */
  tubeSeam?: 'blend';
  /** With `tubeSeam`: the τ course's start and end, s (`TUBE_SEAM.tau` absent), and the height band, m (`TUBE_SEAM.band`). */
  seamTau?: readonly [number, number];
  seamBand?: number;
  /** Ruling 6's streamline wall water (`TubeFace.stream`), opt-in and with `tubeSeam` alone: 'stream' turns it on. */
  wallBody?: 'stream';
  /** Ruling 7's step 1 (`TubeFace.crestLine`), opt-in: 'sub' or 'top' turns it on; absent, or anything else, it is off. */
  crestLine?: 'sub' | 'top';
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
  const continuity = !piece && switches.tubeAnchor !== 'old' && switches.sweptCrash !== false;
  const contour = distance && switches.tubeThrow !== 'break';
  const wallFlow = !piece && union && switches.wallFlow !== 'old';
  const crestLine = distance && (switches.crestLine === 'sub' || switches.crestLine === 'top') ? switches.crestLine : undefined;
  // Ruling 17's early course: read only with the seam blend and the crest line; a `seamTau` given with it wins.
  const early = switches.tubeForm === 'early' && crestLine !== undefined && !switches.seamTau;
  return {
    anchor: !piece, union, lag,
    clockRate: !piece && switches.tubeClock !== 'old' ? THROWN_RATE.face : THROWN_RATE.old, thrownEnds: !piece,
    continuity, distance, contour,
    wallFlow,
    contact: !piece && union && switches.tubeContact !== 'old',
    cap: continuity && switches.tubeCap !== 'old',
    merge: !piece && switches.tubeMerge !== 'old',
    guard: contour && switches.tubeGuard === 'on',
    track: continuity && switches.tubeTrack === 'on',
    inertia: wallFlow && switches.tubeInertia !== 'old',
    retire: contour && switches.tubeRetire !== 'old',
    buoy: wallFlow && switches.tubeBuoy === 'on',
    drop: !piece && switches.tubeDrop === 'on',
    formClock: distance && (switches.formClock === 'c1' || (FORM_CLOCK_DEFAULT && switches.formClock !== 'old')),
    ...(wallFlow && switches.tubeSeam === 'blend' ? { seam: { tau: switches.seamTau ?? TUBE_SEAM.tau, band: switches.seamBand ?? TUBE_SEAM.band, ...(early ? { depth: TUBE_FORM_EARLY } : {}) } } : {}),
    ...(wallFlow && switches.tubeSeam === 'blend' && switches.wallBody === 'stream' ? { stream: true as const } : {}),
    ...(crestLine ? { crestLine } : {}),
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
 * - `crestWide`: the cap's share under the step 7 follow-up (`TubeFace.cap`; the advisor's 2026-11-05 ruling §3): the case's
 *   crest runs at 0.64 / 1.24–1.35 / 1.37 of the wave's advance (p5 / p50 / p95), so 0.3 C (a ceiling of about 1.35 C at
 *   6–8 m/s) shaped the wall on about 65 % of steps; at 0.45 C the ceiling is about 1.5 C and the floor about 0.5 C, outside
 *   the case's p5–p95, so the cap catches only jumps. `?tubeCap=old`: `crest`.
 * Only + − × ÷, for online determinism.
 */
export const ANCHOR_CONTINUITY = { crest: 0.3, crestWide: 0.45, slack: 0.3, hold: 0.5, ease: 0.3, blend: [0.45, 0.55] } as const;

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
  anchorLast?: 'kept' | 'capped' | 'held' | 'stood' | 'eased' | 'crest' | 'free' | 'gated' | 'reacquired';
}

/**
 * Counts of `continueAnchor`'s and `trackAnchor`'s outcomes (a probe's; none in the game): `gated`, a reading outside the
 * tracker's gate held as a miss; `reacquired`, one taken after the gate had held for `ANCHOR_CONTINUITY.hold`.
 */
export const anchorCounts = { kept: 0, capped: 0, held: 0, stood: 0, eased: 0, crest: 0, gated: 0, reacquired: 0 };

/**
 * A point's shift this step from its smoothed shift `smoothed` (m; NaN with none in reach) at `time` (s), the point at
 * (x, z) on its ray (rayX, rayZ), its crest's speed along the ray `celerity` (m/s): see `ANCHOR_CONTINUITY`. NaN while it
 * has never had a face anchor (the crest anchor). `capped` false keeps the smoothed shift as it is (the case's crest's speed
 * alone is tracked: `?tubeAnchor=old` with the wall's flow on). `crestShare`: the cap's share of C (`ANCHOR_CONTINUITY.crest`, or
 * `.crestWide` under `TubeFace.cap`). `runOn` (`TubeFace.cap`): past the hold a miss runs on at C rather than standing with the
 * point.
 */
export function continueAnchor(
  track: AnchorTrack, smoothed: number, time: number, celerity: number, x: number, z: number, rayX: number, rayZ: number, capped = true,
  crestShare: number = ANCHOR_CONTINUITY.crest, runOn = false,
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
  const { slack, hold, ease } = ANCHOR_CONTINUITY;
  const crest = crestShare;
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
    } else if (runOn) {
      // Then (the step 7 follow-up, `TubeFace.cap`) it runs on with the wave's own advance C along the ray: in the wave's
      // frame, as the cap holds it. Standing with the point, the drawn crest stepped with the point's 1–2 m row steps (its
      // crest cell's centre, once its pace has ended): the follow-up's traced 0.6–1.9 m single steps, all after a miss.
      track.anchorShift = previous + celerity * dt - moved;
      track.anchorRate = celerity;
      track.anchorLast = 'stood';
      anchorCounts.stood += 1;
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
 * Ruling 3's tracker (`TubeFace.track`; the water-physics advisor's advisor-ruling-3.md §3). The anchor, the solver's lower
 * face matched to the case's, moves smoothly (3.9–4.4 m/s at 1.5 m; shoaling on the 1:9.5 face alone changes that by about
 * (g/2)/9.5 ≈ 0.5 m/s², inferred), but is read with noise. So it is tracked by an α–β filter, the steady-state Kalman filter of
 * a constant-velocity target under white acceleration (Kalata 1983): its gains from the tracking index λ = σ_w T²/σ_v,
 * α = −(λ² + 8λ − (λ + 4)√(λ² + 8λ))/8, β = (λ² + 4λ − λ√(λ² + 8λ))/4, T the step.
 * - `sigmaW`, m/s²: the anchor's acceleration noise, 0.3–1 (the advisor, provisional);
 * - `sigmaV`, m: the read's noise along the ray on a face of slope `steep` or steeper, as measured after the read's fix
 *   (docs/research/pool-tube-track-2026-11-05/README.md); *(built so)* on a gentler face it grows as `steep`/slope, as the
 *   crossing of a level moves by the level's error over the slope (measured: per-step read noise p90 0.04 m at slopes over
 *   0.15, 0.11 m under, with tails to 0.6 m), so a read on a flat or collapsed face moves the track little.
 * W, the case's crest's place, is tracked whole, its reading the smoothed anchor (the solver's crossing matched to the case's,
 * smoothed along σ) plus the point's own case's crest over its crossing. *(Built so, tried)* Tracking the anchor alone and
 * adding the case part as it is left the case's own frame-to-frame steps in W (its crest over its crossing moves up to
 * 0.19 m a step at p99 as the wave forms, τ < −0.5 s): W's jitter p99 0.092 m against 0.031 m tracked whole (pool 1.5 m,
 * 3 periods); a 3-step mean of the case part, 0.045 m.
 * The cap is kept as the gate (`ANCHOR_CONTINUITY.crestWide`): W's rate stays within (0.45 C + slack) of the wave's own
 * advance C, and a reading that would move W further than that from C Δt in a step is held as a miss (W runs on at its
 * tracked rate). Once the gate has let nothing in for `ANCHOR_CONTINUITY.hold`, the readings are taken again, W moving toward
 * them at most at the cap's rate, until one is let in: the track never locks out. Only + − × ÷ and √.
 */
export const ANCHOR_TRACK = { sigmaW: 0.3, sigmaV: 0.014, steep: 0.2 } as const;

/**
 * Ruling 3's read of the solver's trough (`FaceAnchor.shift`): the sea's peak period T, s, and its still depth at (x, z), m;
 * the window reaches √(g d) T/2 ahead of the solver's crest, d the still depth under that crest.
 */
export interface TroughWave {
  period: number;
  depthAt: (x: number, z: number) => number;
}

/** The α–β gains for a step `dt`, s (`ANCHOR_TRACK`), into `out` [α, β]. */
export function trackGains(dt: number, out: Float64Array, sigmaW: number = ANCHOR_TRACK.sigmaW, sigmaV: number = ANCHOR_TRACK.sigmaV): Float64Array {
  const lambda = (sigmaW * dt * dt) / sigmaV;
  const root = Math.sqrt(lambda * lambda + 8 * lambda);
  out[0] = -(lambda * lambda + 8 * lambda - (lambda + 4) * root) / 8;
  out[1] = (lambda * lambda + 4 * lambda - lambda * root) / 4;
  return out;
}
const gains = new Float64Array(2);

/** The read's noise σ_v (m) on a face of `slope` (`ANCHOR_TRACK`): `sigmaV` on a steep face, growing as it flattens. */
export function readNoise(slope: number): number {
  const { sigmaV, steep } = ANCHOR_TRACK;
  return slope >= steep ? sigmaV : sigmaV * (steep / Math.max(0.1 * steep, slope === slope ? slope : 0));
}

/**
 * A point's shift this step under the tracker (`ANCHOR_TRACK`), as `continueAnchor`'s arguments: `smoothed`, the reading of
 * its case's crest's place along its ray from the point (m; NaN with none in reach). NaN while it has never had a face anchor
 * (the crest anchor), eased from it as before; then W tracked, its rate (`AnchorTrack.anchorRate`) the tracker's estimate,
 * which the wall water's speed takes (`CrashCurve.prepareAnchors`). A miss runs W on at its tracked rate. `crestShare`: the
 * gate's share of C; `sigmaV`: this read's noise (`readNoise`).
 */
export function trackAnchor(
  track: AnchorTrack, smoothed: number, time: number, celerity: number, x: number, z: number, rayX: number, rayZ: number,
  crestShare: number = ANCHOR_CONTINUITY.crestWide, sigmaV: number = ANCHOR_TRACK.sigmaV,
): number {
  const previous = track.anchorShift;
  const dt = track.anchorTime === undefined ? 0 : time - track.anchorTime;
  const moved = track.anchorX === undefined ? 0 : (x - track.anchorX) * rayX + (z - track.anchorZ!) * rayZ;
  track.anchorTime = time;
  track.anchorX = x;
  track.anchorZ = z;
  track.anchorTarget = smoothed;
  const { slack, hold, ease } = ANCHOR_CONTINUITY;
  const keep = (shift: number, rate: number, outcome: NonNullable<AnchorTrack['anchorLast']>): number => {
    track.anchorShift = shift;
    track.anchorRate = rate;
    track.anchorLast = outcome;
    anchorCounts[outcome as keyof typeof anchorCounts] += 1;
    return shift;
  };
  if (!(smoothed === smoothed)) {
    if (previous === undefined) {
      track.anchorNone = true;
      track.anchorLast = 'crest';
      anchorCounts.crest += 1;
      return Number.NaN;
    }
    // A miss: W runs on at its tracked rate.
    return keep(previous + track.anchorRate! * dt - moved, track.anchorRate!, 'held');
  }
  if (previous === undefined && track.anchorNone) track.anchorEase = time;
  if (track.anchorEase !== undefined && time - track.anchorEase < ease) {
    // From the crest anchor (a shift of 0) to the face anchor, as before; the placement's correction, not the wave's
    // motion, so the rate is the wave's own advance.
    const u = (time - track.anchorEase) / ease;
    track.anchorGood = time;
    return keep(u * u * (3 - 2 * u) * smoothed, celerity, 'eased');
  }
  if (previous === undefined || !(dt > 0)) {
    // Faced from its first step (or asked twice at one time): it starts there, at the wave's advance.
    track.anchorGood = time;
    return keep(previous === undefined ? smoothed : previous - moved, previous === undefined ? celerity : track.anchorRate!, 'kept');
  }
  // The cap's band about the wave's own advance, m/s: W's rate, and its change in a step, stay within it.
  const bound = crestShare * celerity + slack;
  const rate = Math.min(celerity + bound, Math.max(celerity - bound, track.anchorRate ?? celerity));
  // The reading's change of W since the last estimate, in the world along the ray, and its residual on the prediction.
  const residual = moved + smoothed - previous - rate * dt;
  trackGains(dt, gains, ANCHOR_TRACK.sigmaW, sigmaV);
  let change = rate * dt + gains[0] * residual;
  const outside = Math.abs(change - celerity * dt) > bound * dt;
  // `anchorGood`: the last reading the gate let in.
  if (outside && time - track.anchorGood! <= hold) return keep(previous + rate * dt - moved, rate, 'gated');
  if (outside) change = celerity * dt + Math.min(bound * dt, Math.max(-bound * dt, change - celerity * dt));
  else track.anchorGood = time;
  const next = Math.min(celerity + bound, Math.max(celerity - bound, rate + (gains[1] * residual) / dt));
  return keep(previous + change - moved, next, outside ? 'reacquired' : 'kept');
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
  /** Ruling 3's read (`troughCrossing`): each read's place along the ray, m, and the refine's reads about a coarse trough. */
  private alongs = new Float64Array(64);
  private lows = new Float64Array(64);
  private readonly near = new Float64Array(2 * Math.round(TROUGH.refine / FACE_ANCHOR.step) + 1);
  /** The solver's face's slope at the last `troughCrossing`'s crossing (NaN without one): how well that read is placed. */
  slope = Number.NaN;
  /** The last `caseFace`'s shape's height, crest over trough, m, and how far its profile reaches ahead of its crest, m. */
  private height = 0;
  private reach = Infinity;
  /**
   * Shifts asked, and those with no clean crossing on the solver's face or the case's (the crest anchor stands). Under the
   * tracker's read (`solverCrossing`'s `halfWave`; diagnostics, a probe's): the solver's reads taken, those whose trough was
   * the window's last read, and the case's shapes whose trough was its profile's last point.
   */
  readonly stats = { shifts: 0, solverMisses: 0, caseMisses: 0, reads: 0, troughAtEnd: 0, caseTroughAtEnd: 0 };

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
    if (this.profile[2 * LAST + 1] === trough) this.stats.caseTroughAtEnd += 1;
    this.height = this.profile[2 * LANDMARK.crest + 1] - trough;
    this.reach = this.profile[2 * LAST] - this.profile[2 * LANDMARK.crest];
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
  solverCrossing(
    x: number, z: number, nx: number, nz: number, height: number, heightAt: (x: number, z: number) => number, wave?: TroughWave, caseReach = Infinity,
  ): number {
    if (wave !== undefined) return this.troughCrossing(x, z, nx, nz, height, heightAt, wave, caseReach);
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
   * Ruling 3's read (`TubeFace.track`; the advisor's advisor-ruling-3.md §3.1), `solverCrossing` with `wave`: the
   * solver's trough is the lowest water within half a wavelength ahead of its crest, √(g d) T/2, the meter's own measure
   * (`SurfZoneSimulation.measureBreak`), not the read window's last read (98.8 % of the reads before: the 0.3 H level rode
   * on the window's end, which moved through the wave between the point's 1 m row steps and jumped at each). In the wave's
   * frame, from the solver's crest:
   * - the crest: the highest of the `step` m reads from `behind` m behind the point to `reach` H ahead (read on behind while
   *   the water still rises there, up to `TROUGH.back` reads), refined by the parabola through it and its neighbours;
   * - the trough: past those, a read every `TROUGH.coarse` m to the crest's place plus `halfWave`, and one exactly there (so
   *   the window's end moves with the crest, not the point); the lowest, if it is a coarse read, read again every `step` m
   *   within ±`TROUGH.refine` m of it, and refined by the parabola (the end read as it is).
   * The crossing at `fraction` of the crest over the trough is searched from the crest to the trough. Only + − × ÷ and √.
   */
  private troughCrossing(
    x: number, z: number, nx: number, nz: number, height: number, heightAt: (x: number, z: number) => number, wave: TroughWave, caseReach: number,
  ): number {
    const { step, behind, reach, fraction } = FACE_ANCHOR;
    const { back, coarse: spacing, refine } = TROUGH;
    const fine = Math.floor((behind + reach * height) / step) + 1;
    // Half a wavelength at most: at the point's still depth or the deepest a crest stands over before it (a wall's bed).
    const most = 0.5 * wave.period * Math.sqrt(GRAVITY * Math.max(0, wave.depthAt(x - behind * nx, z - behind * nz), wave.depthAt(x, z)));
    const size = back + fine + Math.ceil(Math.max(0, most) / spacing) + 4;
    if (this.reads.length < size || this.alongs.length < size) {
      this.reads = new Float64Array(2 * size);
      this.alongs = new Float64Array(2 * size);
      this.lows = new Float64Array(2 * size);
    }
    const { reads, alongs } = this;
    let first: number = back;
    let n: number = back;
    for (let k = 0; k < fine; k += 1) {
      const along = -behind + k * step;
      alongs[n] = along;
      reads[n] = heightAt(x + along * nx, z + along * nz);
      n += 1;
    }
    const fineLast = n - 1;
    let crest = first;
    for (let k = first + 1; k < n; k += 1) if (reads[k] > reads[crest]) crest = k;
    // At the window's start: the crest lies further behind (a paced point runs ahead of the solver's crest).
    while (crest === first && first > 0) {
      const along = alongs[first] - step;
      const value = heightAt(x + along * nx, z + along * nz);
      first -= 1;
      alongs[first] = along;
      reads[first] = value;
      if (value > reads[crest]) crest = first;
      else break;
    }
    let top = reads[crest];
    let crestAlong = alongs[crest];
    if (crest > first && crest < fineLast) {
      const a = reads[crest - 1];
      const b = reads[crest];
      const c = reads[crest + 1];
      const curve = a - 2 * b + c;
      if (curve < 0) {
        top = b - ((a - c) * (a - c)) / (8 * curve);
        crestAlong += (0.5 * (a - c) * step) / curve;
      }
    }
    // The window's end in the wave's frame: the crest's place plus half a wavelength at the still depth there, or as far as
    // the case's own profile reaches ahead of its crest, whichever is nearer: the case's trough is its profile's lowest
    // point (on its last on 23–29 % of reads), and the two heights the 0.3 crossings are matched at must be measured alike
    // (*built so*: against the solver's trough at half a wavelength alone, the case's own lower face stood off the solver's
    // by p95 0.44–0.49 H_s, max 2 H_s, against main's 0.03 / 0.16, pool 1.5 m, 3 periods).
    const end = crestAlong + Math.min(caseReach, most, 0.5 * wave.period * Math.sqrt(GRAVITY * Math.max(0, wave.depthAt(x + crestAlong * nx, z + crestAlong * nz))));
    const fineEnd = alongs[fineLast];
    let endRead = -1;
    if (end > fineEnd) {
      // In the wave's frame: every `spacing` m from the crest's place, past the fine window (not on the point's lattice,
      // which steps 1 m with the point's rows and moved the refine's reach with it).
      for (let m = Math.floor((fineEnd - crestAlong) / spacing) + 1; crestAlong + m * spacing < end; m += 1) {
        const along = crestAlong + m * spacing;
        alongs[n] = along;
        reads[n] = heightAt(x + along * nx, z + along * nz);
        n += 1;
      }
      alongs[n] = end;
      reads[n] = heightAt(x + end * nx, z + end * nz);
      endRead = n;
      n += 1;
    }
    // The trough on the surface averaged over ±`TROUGH.box` m (the wave's own trough, not a jet's landing or splash in it:
    // over 1 m, a crater 0.2 m deep moved the lowest read by up to 0.2 m in a step, measured), coarse then refined.
    const box = TROUGH.box;
    const lowAt = (along: number) => (heightAt(x + (along - box) * nx, z + (along - box) * nz) + heightAt(x + along * nx, z + along * nz)
      + heightAt(x + (along + box) * nx, z + (along + box) * nz)) / 3;
    let reads0 = n - first;
    let low = -1;
    let lowValue = Infinity;
    const lows = this.lows;
    for (let k = crest + 1; k < n; k += 1) {
      if (alongs[k] > end) break;
      const value = lowAt(alongs[k]);
      lows[k] = value;
      reads0 += 2;
      if (value < lowValue) {
        low = k;
        lowValue = value;
      }
    }
    if (low < 0) {
      this.stats.reads += reads0;
      return Number.NaN;
    }
    let bottom = lowValue;
    if (low === endRead) this.stats.troughAtEnd += 1;
    else {
      // Read again every `step` m about it, over the gap to its neighbours, and refine by the parabola.
      const centre = alongs[low];
      const span = Math.round((low <= fineLast ? step : refine) / step);
      const near = this.near;
      let best = span;
      for (let j = 0; j <= 2 * span; j += 1) {
        near[j] = j === span ? lowValue : lowAt(centre + (j - span) * step);
        if (near[j] < near[best]) best = j;
      }
      reads0 += 6 * span;
      bottom = near[best];
      if (best > 0 && best < 2 * span) {
        const a = near[best - 1];
        const c = near[best + 1];
        const curve = a - 2 * bottom + c;
        if (curve > 0) bottom -= ((a - c) * (a - c)) / (8 * curve);
      }
    }
    this.stats.reads += reads0;
    const span = top - bottom;
    this.slope = Number.NaN;
    if (!(span > 0.1 * height)) return Number.NaN;
    const level = bottom + fraction * span;
    for (let k = crest; k < low; k += 1) {
      if (reads[k] >= level && reads[k + 1] < level) {
        const run = alongs[k + 1] - alongs[k];
        this.slope = (reads[k] - reads[k + 1]) / run;
        return alongs[k] + ((reads[k] - level) / (reads[k] - reads[k + 1])) * run;
      }
    }
    return Number.NaN;
  }

  /**
   * A point's shift, m: where its case's crest stands along its ray (nx, nz) from the point (x, z), its case's lower face
   * crossing sitting on the solver's (`heightAt`); NaN where either has no clean crossing (the crest anchor stands: 0).
   * `face` is scratch, left holding `caseFace`'s. `wave` (ruling 3's tracker): the solver's trough read within half a
   * wavelength ahead of its crest (`troughCrossing`); absent, within the window as before.
   */
  shift(
    footHeight: number, footDepth: number, tau: number, hold: ProfileQuery['hold'], x: number, z: number, nx: number, nz: number,
    heightAt: (x: number, z: number) => number, face: Float64Array, wave?: TroughWave,
  ): number {
    this.stats.shifts += 1;
    this.caseFace(footHeight, footDepth, tau, hold, face);
    if (!(face[0] === face[0])) {
      this.stats.caseMisses += 1;
      return Number.NaN;
    }
    // The case's height sets the solver's search: its crest over its trough.
    const solver = this.solverCrossing(x, z, nx, nz, Math.max(0.2, this.height), heightAt, wave, this.reach);
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
