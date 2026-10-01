import { GRAVITY } from '../dispersion';
import type { FrontPoint } from './BreakingFront';
import { blendOverturn, overturnAt, type Overturn } from './heldOverturn';
import { LANDMARK, PROFILE_POINTS, type BarrelCase, type ProfileLibrary } from './ProfileLibrary';
import { LOFT, collapseFade } from './sweptLoft';

/** One front point's barrel as the loft draws it at its clock (the Padang Padang spec, Part B, PR 5: the crash). */
export interface CrashSlice {
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
  /** The held frame's overturn, blended and scaled: the jet's and void's cross-sections (m²), the void's length (m) and axis (forward, down); W = g·collapse²/2, m. */
  jetArea: number;
  voidArea: number;
  voidLength: number;
  axisX: number;
  axisY: number;
  voidHeight: number;
}

export function createCrashSlice(): CrashSlice {
  return {
    rayX: 0, rayZ: 1, width: 0, endWeight: 0, scale: 0, touchdown: 0, clear: 0, collapse: 0, anchorX: 0, anchorZ: 0, fade: 1, weight: 0,
    tipX: 0, tipY: 0, tipZ: 0, crestX: 0, crestY: 0, crestZ: 0, landX: 0, landY: 0, landZ: 0, reachBack: 0, reachFront: 0,
    jetArea: 0, voidArea: 0, voidLength: 0, axisX: 1, axisY: 0, voidHeight: 0,
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

/** How a slice is read: at the point's own clock, or another (`tau`, s); with the throw's anchor held (`throwAnchor`). */
export interface SliceClock {
  tau?: number;
  throwAnchor?: boolean;
}

const LAST = PROFILE_POINTS - 1;
/** How far ahead of the tip the face is searched for its point nearest the tip, h0 (metrics.py's 2.0). */
const FACE_REACH = 2;
/** The drawn crest's speed is read over this many library frames before the clear one. */
const CREST_FRAMES = 10;

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
 * - the ray from the front's tangent over ±2 m, run on past its ends;
 * - the end weight, the profile at the clock (the touchdown frame from touchdown on: the drawing keeps it), and PR 4's
 *   fade over the tube's collapse;
 * - the anchor: on the solver's crest before the throw, at the throw point after it (soft-capped), handed back from
 *   0.8 of the open time.
 * Where the lip lands (the advisor, 2026-10-01): on the drawn frame's face, at its point nearest the tip, `metrics.py`'s
 * closing of the void, whose gap closing is the runs' touchdown. In the runs the face rises to meet the jet, so the tip
 * carried on at its own velocity to a still face would land 0.3–1 m too far. The jet and void are the cases' held
 * frames' (`overturnAt`), blended as the frames are. Only + − × ÷, √ and floor, for online determinism.
 */
export class CrashCurve {
  private readonly profile = new Float32Array(2 * PROFILE_POINTS);
  private readonly earlier = new Float32Array(2 * PROFILE_POINTS);
  private readonly overturns = new Map<BarrelCase, Overturn>();
  private readonly ahead = { x: 0, z: 0 };
  private readonly behind = { x: 0, z: 0 };

  constructor(private readonly library: ProfileLibrary, private readonly slope: number) {
    for (const c of library.cases) {
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
    into: CrashSlice, clock: SliceClock = {},
  ): CrashSlice {
    const p = points[k];
    const tau = clock.tau ?? p.tau;
    const first = points[start].sigma;
    const last = points[end - 1].sigma;
    // The ray: the front's shoreward normal, from its tangent over ±2 m.
    this.positionAt(points, start, end, p.sigma + 2, this.ahead);
    this.positionAt(points, start, end, p.sigma - 2, this.behind);
    let tx = this.ahead.x - this.behind.x;
    let tz = this.ahead.z - this.behind.z;
    const t = Math.sqrt(tx * tx + tz * tz);
    if (t > 1e-9) {
      tx /= t;
      tz /= t;
    } else {
      tx = 1;
      tz = 0;
    }
    const nx = -tz;
    const nz = tx;
    into.rayX = nx;
    into.rayZ = nz;
    into.width = ((k > start ? p.sigma - points[k - 1].sigma : 0) + (k + 1 < end ? points[k + 1].sigma - p.sigma : 0)) / 2;
    const d = Math.min(p.sigma - first, last - p.sigma);
    const r = Math.min(1, d / LOFT.endBlend);
    into.endWeight = d <= 0 ? 0 : r * r * (3 - 2 * r);
    // The drawn frame: the touchdown frame from touchdown on (PR 4), faded over the tube's collapse.
    const query = { slope: this.slope, footHeight: p.footHeight, footDepth: p.footDepth };
    const times = this.library.profileTimes(query);
    const profile = this.profile;
    const lookup = this.library.profileAt({ ...query, seconds: Math.min(tau, times.touchdownSeconds) }, profile);
    const touchdown = lookup.touchdownSeconds;
    into.scale = lookup.scale;
    into.touchdown = touchdown;
    into.clear = lookup.clearSeconds;
    into.collapse = lookup.collapseSeconds;
    into.fade = collapseFade(tau, touchdown, lookup.collapseSeconds);
    into.weight = into.endWeight * into.fade;
    // The anchor, as the loft places it.
    const crest = profile[2 * LANDMARK.crest];
    const crestX = p.x - crest * nx;
    const crestZ = p.z - crest * nz;
    let ax = crestX;
    let az = crestZ;
    if (tau >= 0 && p.throwZ !== null) {
      const ox = crest * nx;
      const oz = p.throwZ + crest * nz - p.z;
      const raw = Math.sqrt(ox * ox + oz * oz);
      let throwX = p.x;
      let throwZ = p.throwZ;
      if (raw > LOFT.offsetKnee) {
        const beyond = (raw - LOFT.offsetKnee) / LOFT.offsetReach;
        const scale = (LOFT.offsetKnee + (LOFT.offsetReach * beyond) / (1 + beyond)) / raw;
        throwX = crestX + scale * ox;
        throwZ = crestZ + scale * oz;
      }
      const handover = LOFT.handoverStart * touchdown;
      const u = clock.throwAnchor || tau <= handover ? 0 : Math.min(1, (tau - handover) / LOFT.handover);
      ax = throwX + u * (crestX - throwX);
      az = throwZ + u * (crestZ - throwZ);
    }
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
    into.landY = place(landAlong, landAbove, landPin, 'y', into.endWeight);
    into.landZ = place(landAlong, landAbove, landPin, 'z');
    // The lifted band's reach.
    let back = Infinity;
    let front = -Infinity;
    for (let i = LOFT.pinned; i <= LAST - LOFT.pinned; i += 1) {
      const x = profile[2 * i];
      if (x < back) back = x;
      if (x > front) front = x;
    }
    into.reachBack = back;
    into.reachFront = front;
    // The held overturn, blended as the frames are, scaled by h0.
    const blend = this.library.caseBlend(query);
    const o = blendOverturn(this.overturnOf(blend.lower), this.overturnOf(blend.upper), blend.weight);
    const s = blend.scale;
    into.jetArea = o.jetArea * s * s;
    into.voidArea = o.voidArea * s * s;
    into.voidLength = o.voidLength * s;
    into.axisX = o.axisX;
    into.axisY = o.axisY;
    into.voidHeight = (GRAVITY * into.collapse * into.collapse) / 2;
    return into;
  }

  /** A point's touchdown and collapse times, s, without building its profile. */
  times(point: FrontPoint): { touchdownSeconds: number; collapseSeconds: number } {
    return this.library.profileTimes({ slope: this.slope, footHeight: point.footHeight, footDepth: point.footDepth });
  }

  /** The held frame's tip velocity along the ray and up (m/s), and the drawn crest's speed over the CREST_FRAMES frames before it (m/s). */
  jetMotion(point: FrontPoint, into: JetMotion): JetMotion {
    const query = { slope: this.slope, footHeight: point.footHeight, footDepth: point.footDepth };
    const times = this.library.profileTimes(query);
    const held = this.library.profileAt({ ...query, seconds: times.clearSeconds }, this.profile);
    into.tipAlong = held.tipAlong;
    into.tipUp = held.tipUp;
    const span = CREST_FRAMES * times.frameSeconds;
    this.library.profileAt({ ...query, seconds: times.clearSeconds - span }, this.earlier);
    into.crestSpeed = span > 0 ? (this.profile[2 * LANDMARK.crest] - this.earlier[2 * LANDMARK.crest]) / span : 0;
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

  /** The front's crest position at σ: linear between its points, run on along the end segments past them (as the loft's). */
  private positionAt(points: readonly FrontPoint[], start: number, end: number, sigma: number, into: { x: number; z: number }): void {
    const runOn = (from: FrontPoint, to: FrontPoint, beyond: number) => {
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length > 1e-9) {
        into.x += (beyond * dx) / length;
        into.z += (beyond * dz) / length;
      }
    };
    if (sigma <= points[start].sigma) {
      into.x = points[start].x;
      into.z = points[start].z;
      runOn(points[start + 1], points[start], points[start].sigma - sigma);
      return;
    }
    if (sigma >= points[end - 1].sigma) {
      into.x = points[end - 1].x;
      into.z = points[end - 1].z;
      runOn(points[end - 2], points[end - 1], sigma - points[end - 1].sigma);
      return;
    }
    let k = start;
    while (k + 2 < end && points[k + 1].sigma < sigma) k += 1;
    const s0 = points[k].sigma;
    const s1 = points[k + 1].sigma;
    const t = s1 - s0 > 1e-12 ? (sigma - s0) / (s1 - s0) : 0;
    into.x = points[k].x + t * (points[k + 1].x - points[k].x);
    into.z = points[k].z + t * (points[k + 1].z - points[k].z);
  }
}
