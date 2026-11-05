import { GRAVITY } from '../dispersion';
import type { FrontPoint } from './BreakingFront';
import { CrestRayPlan, minimumCrestRaySpacing } from './crestRays';
import { ANCHOR_CONTINUITY, continueAnchor, FaceAnchor, readNoise, smoothPlaces, smoothShifts, trackAnchor, type TroughWave, type TubeFace } from './faceAnchor';
import { blendOverturn, overturnAt, type Overturn } from './heldOverturn';
import { LANDMARK, PROFILE_POINTS, type BarrelCase, type ProfileLibrary } from './ProfileLibrary';
import { pathPace } from './sliceClock';
import { LOFT, collapseFade, endBlendLength, endWeight } from './sweptLoft';

/**
 * Ruling 3's smooth wall (`TubeFace.track`): the clock's rate the wall water's shape moves at is smoothed over this long, s
 * (an exponential mean; *built so*, provisional): `CrashCurve.prepareAnchors`.
 */
export const WALL_CLOCK = 0.2;

/** One front point's barrel as the loft draws it at its clock (the Padang Padang spec, Part B, PR 5: the crash). */
export interface CrashSlice {
  /** True when current void and prospective water budget come from the shared analytic provider. */
  analytic: boolean;
  /** The front's shoreward normal (x, z), the point's share of its front's length, m, and the loft's end weight there. */
  rayX: number;
  rayZ: number;
  width: number;
  endWeight: number;
  /** h0 (m), τ at touchdown and at the clear frame (s), and the tube's collapse after touchdown, √(2W/g) (PR 4's), s. */
  scale: number;
  touchdown: number;
  clear: number;
  collapse: number;
  /** The profile's origin in the world (the loft's anchor); the fade after touchdown, and the weight lifting the profile off the water (end × fade). */
  anchorX: number;
  anchorZ: number;
  fade: number;
  weight: number;
  /**
   * The drawn lip tip and crest, and where the lip lands, m: the drawn frame's face at its point nearest the tip, at the
   * touchdown frame's own height (the fade dissolves the drawing; it doesn't move the landing).
   */
  tipX: number;
  tipY: number;
  tipZ: number;
  crestX: number;
  crestY: number;
  crestZ: number;
  landX: number;
  landY: number;
  landZ: number;
  /** The lifted band's reach along the ray from the anchor, m: the drawn curl's footprint (the whitewater gate). */
  reachBack: number;
  reachFront: number;
  /** The drawn slice's whole reach along the ray, its extensions included, m: the loft judges overlapping fronts on it. */
  footBack: number;
  footFront: number;
  /** The held frame's overturn, blended and scaled: the jet's and void's cross-sections (m²), the void's length (m) and axis (forward, down); W = g·collapse²/2, m. */
  jetArea: number;
  /** Water reserved once at throw from an explicit prospective impact query; never current trapped air. */
  prospectiveJetArea: number;
  voidArea: number;
  voidLength: number;
  axisX: number;
  axisY: number;
  voidHeight: number;
}

export function createCrashSlice(): CrashSlice {
  return {
    analytic: false,
    rayX: 0, rayZ: 1, width: 0, endWeight: 0, scale: 0, touchdown: 0, clear: 0, collapse: 0, anchorX: 0, anchorZ: 0, fade: 1, weight: 0,
    tipX: 0, tipY: 0, tipZ: 0, crestX: 0, crestY: 0, crestZ: 0, landX: 0, landY: 0, landZ: 0, reachBack: 0, reachFront: 0, footBack: 0, footFront: 0,
    jetArea: 0, prospectiveJetArea: 0, voidArea: 0, voidLength: 0, axisX: 1, axisY: 0, voidHeight: 0,
  };
}

/** The held frame's jet as it flies (the advisor's PR 4 rulings: the held frame's velocity through the collapse). */
export interface JetMotion {
  /** The lip tip's velocity along the ray and up, m/s. */
  tipAlong: number;
  tipUp: number;
  /** The drawn crest's speed along the ray, m/s. */
  crestSpeed: number;
}

/**
 * How a slice is read: at the point's own clock, or another (`tau`, s), with the point's own z or another (`z`, m: the
 * foresight reads its paced z at its τ).
 */
export interface SliceClock {
  tau?: number;
  z?: number;
  /** Under the face ruling, the point's smoothed shift (`prepareShifts`), m; absent or NaN: the crest anchor. */
  shift?: number;
}

const LAST = PROFILE_POINTS - 1;
/** How far ahead of the tip the face is searched for its point nearest the tip, h0 (metrics.py's 2.0). */
const FACE_REACH = 2;
/** The drawn crest's speed is read over this many library frames before the clear one. */
const CREST_FRAMES = 10;

/** Current metric underside above its actual analytic floor, without a free-fall-duration surrogate. */
function currentVoidHeight(profile: Float32Array): number {
  let highest = 0;
  for (let i = LANDMARK.lip; i <= LANDMARK.throat; i += 1) {
    const x = profile[2 * i], y = profile[2 * i + 1];
    let floor = -Infinity;
    for (let j = LANDMARK.throat; j < LANDMARK.toe; j += 1) {
      const x0 = profile[2 * j], x1 = profile[2 * j + 2];
      if (x0 === x1 || (x0 - x) * (x1 - x) > 0) continue;
      const under = profile[2 * j + 1] + (x - x0) / (x1 - x0) * (profile[2 * j + 3] - profile[2 * j + 1]);
      if (under < y) floor = Math.max(floor, under);
    }
    if (Number.isFinite(floor)) highest = Math.max(highest, y - floor);
  }
  return highest;
}

/** How much a profile sample is pinned onto the water (the loft's seam, `LOFT.pinned`). */
function pinOf(i: number): number {
  if (i < LOFT.pinned) return (LOFT.pinned - i) / LOFT.pinned;
  if (i > LAST - LOFT.pinned) return (i - (LAST - LOFT.pinned)) / LOFT.pinned;
  return 0;
}

/**
 * The swept barrel at one front point, as the loft draws it (the Padang Padang spec, Part B, 13.6: the crash curve along
 * the landing line). It mirrors `SweptLoft.loftFront` in drawing mode at the point's own σ, and the crash test holds them
 * together, so keep them in step:
 * - the shared front ray plan from its tangent over ±2 m, stabilized over the whole authored reach;
 * - the end weight, the profile at the clock (the touchdown frame from touchdown on: the drawing keeps it), and PR 4's
 *   fade over the tube's collapse;
 * - the anchor: the crest point K = S − c n, so the profile's crest landmark sits on the point's crest, before the
 *   throw and from it alike (the advisor, 2026-10-03: u = 1 from the throw).
 * Where the lip lands (the advisor, 2026-10-01): on the drawn frame's face, at its point nearest the tip, `metrics.py`'s
 * closing of the void, whose gap closing is the runs' touchdown. In the runs the face rises to meet the jet, so the tip
 * carried on at its own velocity to a still face would land 0.3–1 m too far. The jet and void are the cases' held
 * frames' (`overturnAt`), blended as the frames are. Only + − × ÷, √ and floor, for online determinism.
 */
export class CrashCurve {
  private readonly profile = new Float32Array(2 * PROFILE_POINTS);
  private readonly earlier = new Float32Array(2 * PROFILE_POINTS);
  private readonly impact = new Float32Array(2 * PROFILE_POINTS);
  private readonly overturns = new Map<BarrelCase, Overturn>();
  private readonly normal = { x: 0, z: 0 };
  private readonly raySample = new Float64Array(2);
  private readonly directRays: CrestRayPlan;
  /** The last run's ends and their blends (`endBlendLength`), kept while the same run is sliced point by point. */
  private endA?: FrontPoint;
  private endB?: FrontPoint;
  private endTauA = Number.NaN;
  private endTauB = Number.NaN;
  private readonly ends = new Float64Array(2);
  private readonly endProfile = new Float32Array(2 * PROFILE_POINTS);

  /** The step 3 ruling's tube (`TubeFace`): the face anchor's arithmetic and the thrown ends' blend, as the loft's. */
  private readonly face?: TubeFace;
  private readonly faceAnchor?: FaceAnchor;
  private faceRaw = new Float64Array(0);
  private faceSigma = new Float64Array(0);
  /** Per point of a run, its case's crest over its crossing at the contact's hold, m, its place and its ray (`prepareAnchors`). */
  private faceCase = new Float64Array(0);
  private faceX = new Float64Array(0);
  private faceZ = new Float64Array(0);
  private faceRayX = new Float64Array(0);
  private faceRayZ = new Float64Array(0);
  /** Ruling 3's tracker: per point of a run, the solver's face's slope at its read's crossing, then smoothed along σ. */
  private faceSlope = new Float64Array(0);
  private readonly faceScratch = new Float64Array(3);
  private readonly faceRay = { x: 0, z: 0 };

  constructor(private readonly library: ProfileLibrary, private readonly slope: number, face?: TubeFace) {
    if (face && library.options.geometry !== 'bounded-C') {
      this.face = face;
      if (face.anchor) this.faceAnchor = new FaceAnchor(library, slope, face.continuity);
    }
    this.directRays = new CrestRayPlan(library, slope, LOFT.extension, minimumCrestRaySpacing(LOFT.extension, LOFT.spacing));
    for (const c of library.options.geometry === 'bounded-C' ? [] : library.cases) {
      const held = library.heldFrameOf(c);
      this.overturns.set(c, overturnAt(c.frames, Math.floor((held.tau - c.tauStart) / c.tauStep + 0.5)));
    }
  }

  /**
   * Front point k (its front's points are [start, end), at least two) at its clock, as the loft draws it, into `into`;
   * `heightAt` is the water under a vertex resting on it.
   */
  slice(
    points: readonly FrontPoint[], start: number, end: number, k: number, stillLevel: number, heightAt: (x: number, z: number) => number,
    into: CrashSlice, clock: SliceClock = {}, rays?: CrestRayPlan,
  ): CrashSlice {
    const p = points[k];
    const tau = clock.tau ?? p.tau;
    const first = points[start].sigma;
    const last = points[end - 1].sigma;
    const { x: nx, z: nz } = this.ray(points, start, end, k, this.normal, rays);
    into.rayX = nx;
    into.rayZ = nz;
    if (this.library.options.geometry === 'bounded-C') {
      // Constant-X cross-sections extrude over projected X width, not arc length. This is the existing local
      // slice quadrature; varying cross-sections/end fades are not an exact whole-mesh volume integral.
      into.width = ((k > start ? p.x - points[k - 1].x : 0) + (k + 1 < end ? points[k + 1].x - p.x : 0)) / 2;
    } else {
      into.width = ((k > start ? p.sigma - points[k - 1].sigma : 0) + (k + 1 < end ? points[k + 1].sigma - p.sigma : 0)) / 2;
    }
    // The loft's end weight (`endWeight`): 1 m at an end that has thrown, at least its height H at a young one.
    const ends = this.endsOf(points, start, end);
    into.endWeight = endWeight(p.sigma, first, last, ends[0], ends[1]);
    // The drawn frame: the touchdown frame from touchdown on (PR 4), faded over the tube's collapse.
    const query = { slope: this.slope, footHeight: p.footHeight, footDepth: p.footDepth };
    const profile = this.profile;
    const lookup = this.library.profileAt({ ...query, seconds: tau, hold: 'drawing' }, profile);
    into.analytic = lookup.analytic !== undefined;
    const touchdown = lookup.touchdownSeconds;
    into.scale = lookup.scale;
    into.touchdown = touchdown;
    into.clear = lookup.clearSeconds;
    into.collapse = lookup.collapseSeconds;
    into.fade = collapseFade(tau, touchdown, lookup.collapseSeconds);
    into.weight = into.endWeight * into.fade;
    // The anchor, as the loft places it: the crest point K = S − c n, at the point's z or the one asked; under the face
    // ruling at the point's shift, K = S + (δ − c) n (`prepareShifts`).
    const z = clock.z ?? p.z;
    const crest = profile[2 * LANDMARK.crest];
    const shift = this.faceAnchor ? clock.shift ?? Number.NaN : Number.NaN;
    const along0 = shift === shift ? shift - crest : -crest;
    const ax = p.x + along0 * nx;
    const az = z + along0 * nz;
    into.anchorX = ax;
    into.anchorZ = az;
    // The drawn tip and crest (lifted by the drawing's weight); the landing at the touchdown frame's own height (lifted by
    // the end weight alone: the fade dissolves the drawing into the water, it doesn't move where the lip came down).
    const place = (along: number, above: number, pin: number, axis: 'x' | 'y' | 'z', weight = into.weight) => {
      const px = ax + along * nx;
      const pz = az + along * nz;
      if (axis === 'x') return px;
      if (axis === 'z') return pz;
      const e = weight * (1 - pin);
      if (e === 1) return stillLevel + above;
      const h = heightAt(px, pz);
      return e === 0 ? h : h + e * (stillLevel + above - h);
    };
    const tipAlong = profile[2 * LANDMARK.lip];
    const tipAbove = profile[2 * LANDMARK.lip + 1];
    into.tipX = place(tipAlong, tipAbove, 0, 'x');
    into.tipY = place(tipAlong, tipAbove, 0, 'y');
    into.tipZ = place(tipAlong, tipAbove, 0, 'z');
    const crestAbove = profile[2 * LANDMARK.crest + 1];
    into.crestX = place(crest, crestAbove, 0, 'x');
    into.crestY = place(crest, crestAbove, 0, 'y');
    into.crestZ = place(crest, crestAbove, 0, 'z');
    // Where the lip lands: the face's point nearest the tip, from the throat on, within FACE_REACH h0 ahead.
    const reach = tipAlong + FACE_REACH * lookup.scale;
    let nearest = Infinity;
    let landAlong = tipAlong;
    let landAbove = tipAbove;
    let landPin = 0;
    for (let i = LANDMARK.throat; i < LAST; i += 1) {
      const x0 = profile[2 * i];
      const y0 = profile[2 * i + 1];
      if (!(x0 < reach)) continue;
      const ex = profile[2 * i + 2] - x0;
      const ey = profile[2 * i + 3] - y0;
      const length = ex * ex + ey * ey;
      const s = length > 0 ? Math.min(1, Math.max(0, ((tipAlong - x0) * ex + (tipAbove - y0) * ey) / length)) : 0;
      const qx = x0 + s * ex;
      const qy = y0 + s * ey;
      const gap = (tipAlong - qx) * (tipAlong - qx) + (tipAbove - qy) * (tipAbove - qy);
      if (gap < nearest) {
        nearest = gap;
        landAlong = qx;
        landAbove = qy;
        landPin = pinOf(i) + s * (pinOf(i + 1) - pinOf(i));
      }
    }
    into.landX = place(landAlong, landAbove, landPin, 'x');
    into.landY = place(landAlong, landAbove, landPin, 'y', into.analytic ? into.weight : into.endWeight);
    into.landZ = place(landAlong, landAbove, landPin, 'z');
    // The lifted band's reach (the whitewater gate), and the drawn slice's own with its extensions (overlapping fronts).
    let back = Infinity;
    let front = -Infinity;
    for (let i = LOFT.pinned; i <= LAST - LOFT.pinned; i += 1) {
      const x = profile[2 * i];
      if (x < back) back = x;
      if (x > front) front = x;
    }
    into.reachBack = back;
    into.reachFront = front;
    into.footBack = profile[0] - LOFT.extension;
    into.footFront = profile[2 * LAST] + LOFT.extension;
    if (lookup.analytic) {
      // The launch reserves water from the provider's prospective impact contour. Atmospheric air at launch is not
      // this forecast: current void uses the same end/fade/live-water projection as the actual drawn core.
      this.library.profileAt({ ...query, seconds: touchdown, hold: 'drawing' }, this.impact);
      into.prospectiveJetArea = overturnAt(this.impact, 0).jetArea;
      for (let i = 0; i < PROFILE_POINTS; i += 1) {
        const paired = i === 104 && profile[2 * LANDMARK.lip + 1] === profile[2 * i + 1]
          && profile[2 * LANDMARK.lip] >= profile[2 * 103] && profile[2 * LANDMARK.lip] <= profile[2 * 105];
        const along = paired ? profile[2 * LANDMARK.lip] : profile[2 * i];
        this.earlier[2 * i] = along;
        this.earlier[2 * i + 1] = place(along, profile[2 * i + 1], pinOf(i), 'y');
      }
      const current = lookup.analytic.sheetExists && into.weight > 0 ? overturnAt(this.earlier, 0) :
        { jetArea: 0, voidArea: 0, voidLength: 0, axisX: 1, axisY: 0 };
      into.jetArea = current.jetArea;
      into.voidArea = current.voidArea;
      into.voidLength = current.voidLength;
      into.axisX = current.axisX;
      into.axisY = current.axisY;
      into.voidHeight = current.voidArea > 0 ? currentVoidHeight(this.earlier) : 0;
      return into;
    }
    // Legacy raw mode retains its held overturn, blended as the frames are, scaled by h0.
    const blend = this.library.caseBlend(query);
    const o = blendOverturn(this.overturnOf(blend.lower), this.overturnOf(blend.upper), blend.weight);
    const s = blend.scale;
    into.jetArea = o.jetArea * s * s;
    into.prospectiveJetArea = into.jetArea;
    into.voidArea = o.voidArea * s * s;
    into.voidLength = o.voidLength * s;
    into.axisX = o.axisX;
    into.axisY = o.axisY;
    into.voidHeight = (GRAVITY * into.collapse * into.collapse) / 2;
    return into;
  }

  /** Run [start, end)'s two ends' blends, m, as the loft lays them (`endBlendLength`). */
  private endsOf(points: readonly FrontPoint[], start: number, end: number): Float64Array {
    const a = points[start];
    const b = points[end - 1];
    if (a !== this.endA || b !== this.endB || a.tau !== this.endTauA || b.tau !== this.endTauB) {
      this.endA = a;
      this.endB = b;
      this.endTauA = a.tau;
      this.endTauB = b.tau;
      this.ends[0] = endBlendLength(this.library, this.slope, a.footHeight, a.footDepth, a.tau, this.endProfile, this.face?.thrownEnds);
      this.ends[1] = endBlendLength(this.library, this.slope, b.footHeight, b.footDepth, b.tau, this.endProfile, this.face?.thrownEnds);
    }
    return this.ends;
  }

  /**
   * Explicitly prepare the whole front after its positions and arc length have been finalized. The plan copies
   * transport-precision controls, so later point mutations cannot change an already prepared scope. `into` lets
   * SweptCrash reuse storage while preparing afresh at each coordinate-finalization stage.
   */
  prepareRays(points: readonly FrontPoint[], start: number, end: number, into?: CrestRayPlan): CrestRayPlan {
    const plan = into ?? new CrestRayPlan(this.library, this.slope, LOFT.extension, minimumCrestRaySpacing(LOFT.extension, LOFT.spacing));
    plan.prepare(points, start, end);
    return plan;
  }

  /**
   * Front point k's shared drawing/contact/crash ray. An explicit plan belongs to the caller's prepared scope;
   * without it, always prepare from the current values, rather than caching a mutable points-array identity.
   */
  ray(
    points: readonly FrontPoint[], start: number, end: number, k: number, into: { x: number; z: number }, rays?: CrestRayPlan,
  ): { x: number; z: number } {
    const plan = rays ?? this.prepareRays(points, start, end, this.directRays);
    // The page reads a Float32 record's sigma. Use that same query coordinate while retaining Float64 physical
    // positions, profiles, clocks and material scalars everywhere else in this class.
    plan.rayAt(Math.fround(points[k].sigma), this.raySample);
    into.x = this.raySample[0];
    into.z = this.raySample[1];
    return into;
  }

  /**
   * Under the face ruling, the run's points' shifts (`FaceAnchor.shift`, the drawing's hold, each on its own ray), smoothed
   * along σ as the loft's (`smoothShifts`), into `out[start, end)`; NaN everywhere without the face anchor.
   */
  prepareShifts(points: readonly FrontPoint[], start: number, end: number, heightAt: (x: number, z: number) => number, rays: CrestRayPlan | undefined, out: Float64Array): void {
    if (!this.faceAnchor) {
      out.fill(Number.NaN, start, end);
      return;
    }
    const n = end - start;
    if (this.faceRaw.length < n) {
      this.faceRaw = new Float64Array(2 * n);
      this.faceSigma = new Float64Array(2 * n);
    }
    for (let k = start; k < end; k += 1) {
      const p = points[k];
      const ray = this.ray(points, start, end, k, this.faceRay, rays);
      this.faceSigma[k - start] = p.sigma;
      this.faceRaw[k - start] = this.faceAnchor.shift(p.footHeight, p.footDepth, p.tau, 'drawing', p.x, p.z, ray.x, ray.z, heightAt, this.faceScratch);
    }
    smoothShifts(this.faceSigma, this.faceRaw, n, this.faceRaw.subarray(n, 2 * n));
    for (let k = 0; k < n; k += 1) out[start + k] = this.faceRaw[n + k];
  }

  /**
   * Step 7 (the advisor's 2026-11-04 ruling; `TubeFace.continuity`, `.wallFlow`): the run's points' anchors kept step to
   * step. Each point's raw shift under the contact's hold (the shape the drawing, clear-roof hold, and the contact draw),
   * smoothed along σ as before, then kept by `continueAnchor` (with `continuity`: capped, held on a miss, never back to
   * the crest anchor; without, as smoothed, its rate alone tracked) on the point (`FrontPoint.anchorShift`, the records'
   * `anchor`). Into `out[start, end)` each point's shift for the crash's own slices, under the drawing's hold: the kept
   * shift moved by its case's crest-over-crossing at that hold against the contact's (or, without `continuity`, the
   * drawing's own smoothed shifts, as `prepareShifts`). And for the wall's water, each point's drawn crest's speed along its
   * ray (its crest's pace and its shift's rate) and its clock's rate since its last step (`wallSpeed`, `tauRate`). `wave`:
   * the sea's period and still depth, for ruling 3's read of the solver's trough (`TubeFace.track`).
   */
  prepareAnchors(
    points: FrontPoint[], start: number, end: number, heightAt: (x: number, z: number) => number, rays: CrestRayPlan | undefined,
    time: number, out: Float64Array, wave?: TroughWave,
  ): void {
    const anchor = this.faceAnchor!;
    const continuity = this.face!.continuity;
    // The step 7 follow-up's cap (`TubeFace.cap`): 0.45 C rather than 0.3 C.
    const crestShare = this.face!.cap ? ANCHOR_CONTINUITY.crestWide : ANCHOR_CONTINUITY.crest;
    // Ruling 3's tracker (`TubeFace.track`): the solver's trough within half a wavelength ahead, W tracked, its rate the wall's.
    const track = this.face!.track;
    if (!continuity) this.prepareShifts(points, start, end, heightAt, rays, out);
    const n = end - start;
    if (this.faceRaw.length < 2 * n) {
      this.faceRaw = new Float64Array(4 * n);
      this.faceSigma = new Float64Array(2 * n);
    }
    if (track && this.faceSlope.length < 2 * n) this.faceSlope = new Float64Array(4 * n);
    if (this.faceCase.length < n) {
      this.faceCase = new Float64Array(2 * n);
      this.faceX = new Float64Array(2 * n);
      this.faceZ = new Float64Array(2 * n);
      this.faceRayX = new Float64Array(2 * n);
      this.faceRayZ = new Float64Array(2 * n);
    }
    for (let k = start; k < end; k += 1) {
      const p = points[k];
      const ray = this.ray(points, start, end, k, this.faceRay, rays);
      const i = k - start;
      this.faceSigma[i] = p.sigma;
      this.faceX[i] = p.x;
      this.faceZ[i] = p.z;
      this.faceRayX[i] = ray.x;
      this.faceRayZ[i] = ray.z;
      this.faceRaw[i] = anchor.shift(p.footHeight, p.footDepth, p.tau, 'contact', p.x, p.z, ray.x, ray.z, heightAt, this.faceScratch, track ? wave : undefined);
      // The case's crest over its crossing at the contact's hold (NaN without a crossing).
      this.faceCase[i] = this.faceScratch[1] - this.faceScratch[0];
      if (track) this.faceSlope[i] = this.faceRaw[i] === this.faceRaw[i] ? anchor.slope : Number.NaN;
    }
    const kept = this.faceRaw.subarray(n, 2 * n);
    if (track) {
      // Ruling 3's tracker: the anchors' places (the solver's crossing matched to the case's: each raw shift less its case's
      // crest over its crossing) smoothed along σ as the shifts were, each point's own case part added back for W's reading
      // (`trackAnchor`), and the read's slope there for its noise (`readNoise`).
      for (let i = 0; i < n; i += 1) this.faceRaw[i] -= this.faceCase[i];
      smoothPlaces(this.faceSigma, this.faceX, this.faceZ, this.faceRaw, this.faceRayX, this.faceRayZ, n, kept);
      smoothShifts(this.faceSigma, this.faceSlope, n, this.faceSlope.subarray(n, 2 * n));
    } else if (continuity) {
      // With continuity, the places the shifts put the case's crest are smoothed (`smoothPlaces`), as before without.
      smoothPlaces(this.faceSigma, this.faceX, this.faceZ, this.faceRaw, this.faceRayX, this.faceRayZ, n, kept);
    } else smoothShifts(this.faceSigma, this.faceRaw, n, kept);
    for (let k = start; k < end; k += 1) {
      const p = points[k];
      const i = k - start;
      // The wave's advance along the point's ray: its crest's pace along its column, projected on the ray.
      const celerity = pathPace(p.crestSpeed, p.crestDepth, p.height, p.dirZ) * Math.max(0, this.faceRayZ[i]);
      const dt = p.anchorTime === undefined ? 0 : time - p.anchorTime;
      const tauRate = p.anchorTau !== undefined && dt > 0 ? (p.tau - p.anchorTau) / dt : 1;
      // Ruling 3 (`TubeFace.track`; *built so*): the wall water's shape moves at the clock's rate smoothed over
      // `WALL_CLOCK` s. Before the throw the clock follows −D/C_p within 0.5–1.5× real time and sits on either bound on 5 %
      // of steps each (pool 1.5 m), so its rate step to step swung the case's surface's own speed by half of itself: over
      // 12 m/s on 0.6 % of the wall's vertices at the lip, and the wall water 12 m/s a step at p99.
      p.tauRate = track && p.tauRate !== undefined && dt > 0 ? p.tauRate + (tauRate - p.tauRate) * Math.min(1, dt / WALL_CLOCK) : tauRate;
      p.anchorTau = p.tau;
      const shift = track
        ? trackAnchor(p, kept[i] + this.faceCase[i], time, celerity, p.x, p.z, this.faceRayX[i], this.faceRayZ[i], crestShare, readNoise(this.faceSlope[n + i]))
        : continueAnchor(p, kept[i], time, celerity, p.x, p.z, this.faceRayX[i], this.faceRayZ[i], continuity, crestShare, this.face!.cap);
      // The drawn crest's speed along its ray (its case's crest's place, W = S·n + δ, step to step), and the ray. Under the
      // tracker (ruling 3, §1) its rate is the tracker's estimate (`trackAnchor`), not W's change in one step, which carried
      // the read's noise into the wall water: 0.12 m a step of jitter is a 7.2 m/s change in that rate.
      p.wallSpeed = p.anchorRate ?? celerity;
      p.anchorRayX = this.faceRayX[i];
      p.anchorRayZ = this.faceRayZ[i];
      if (!continuity) continue;
      if (!(shift === shift)) {
        out[k] = Number.NaN;
        continue;
      }
      // The crash's own slices under the drawing's hold: the case's crest over its crossing there, against the contact's.
      const contact = this.faceCase[k - start];
      anchor.caseFace(p.footHeight, p.footDepth, p.tau, 'drawing', this.faceScratch);
      const drawing = this.faceScratch[1] - this.faceScratch[0];
      out[k] = contact === contact && drawing === drawing ? shift - contact + drawing : shift;
    }
  }

  /** A point's touchdown and collapse times, s, without building its profile. */
  times(point: FrontPoint): { touchdownSeconds: number; collapseSeconds: number } {
    return this.library.profileTimes({ slope: this.slope, footHeight: point.footHeight, footDepth: point.footDepth });
  }

  /**
   * The held lip's velocity along the ray and up (m/s): each blended case's at its own held frame, as the contact holds it
   * after touchdown (the advisor's PR 4 rulings: the held frame's velocity through the collapse). And the drawn crest's
   * speed along the ray (m/s), over the CREST_FRAMES frames before touchdown.
   */
  jetMotion(point: FrontPoint, into: JetMotion): JetMotion {
    const query = { slope: this.slope, footHeight: point.footHeight, footDepth: point.footDepth };
    const times = this.library.profileTimes(query);
    const held = this.library.profileAt({ ...query, seconds: times.touchdownSeconds + times.frameSeconds, hold: 'contact' }, this.earlier);
    const fluidScale = held.analytic ? held.analytic.lengthScale / held.analytic.timeScale : 1;
    into.tipAlong = held.analytic ? held.analytic.fluidAlong * fluidScale : held.tipAlong;
    into.tipUp = held.analytic ? held.analytic.fluidUp * fluidScale : held.tipUp;
    const span = CREST_FRAMES * times.frameSeconds;
    this.library.profileAt({ ...query, seconds: times.touchdownSeconds - times.frameSeconds }, this.profile);
    const late = this.profile[2 * LANDMARK.crest];
    this.library.profileAt({ ...query, seconds: times.touchdownSeconds - times.frameSeconds - span }, this.earlier);
    into.crestSpeed = span > 0 ? (late - this.earlier[2 * LANDMARK.crest]) / span : 0;
    return into;
  }

  private overturnOf(c: BarrelCase): Overturn {
    let o = this.overturns.get(c);
    if (!o) {
      const held = this.library.heldFrameOf(c);
      o = overturnAt(c.frames, Math.floor((held.tau - c.tauStart) / c.tauStep + 0.5));
      this.overturns.set(c, o);
    }
    return o;
  }

}
