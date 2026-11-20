import { LANDMARK, PROFILE_POINTS } from '../barrel/ProfileLibrary';
import { SHEET, THROAT, sheetAcross, throatViews } from '../barrel/lipSheet';
import { LOFT, LOFT_SAMPLES, type LoftResult } from '../barrel/sweptLoft';

/**
 * C2 step 3: the overturn's loft (the plan's "hybrid surface", ruling 28 point 3) as the swept barrel's `LoftResult`, so
 * the barrel's mesh draws it (`SweptBarrelMesh`, the seam mask) and its contact feels it (`SweptContact.forLoft`), from
 * the very curves the render nodes take their heights from (`ZoneSurface`).
 *
 * Each slice's 128 points stand on its blended curve where the curve lifts off the nodes, and on the nodes' own surface
 * elsewhere (`heightAt`, the water as drawn on the page and as felt in the worker): its lift λ is the slice's course
 * (`LIFT.on`° to `LIFT.full`°, steepest segment) times the place along its lane, 1 over the overturn's span widened by
 * `LIFT.margin` and eased to 0 over `LIFT.ramp` m beyond. Where λ is 0 the vertex lies on the drawn water, and the seam
 * mask covers the lifted part and `LIFT.band` m more, so the two surfaces only ever meet where they are one: no edge, by
 * construction. A run of lifted slices ends on a neighbour with no lift, so it ends on the water too.
 */
export const LIFT = {
  /** The steepest segment's angle where a slice starts lifting off the nodes, and where it has, °. */
  on: 35,
  full: 50,
  /** Steeper than this (or folded) the nodes take a bridge under the curve, ° (1 m nodes cannot hold it). */
  bridge: 50,
  /** The bridge runs out to where the curve is gentler than this, °, at most `reach` m each side. */
  gentle: 30,
  reach: 2,
  /** The lifted span's margin past the steep part, m (the nodes' cubic reaches 2 m), and its ease to the water, m. */
  margin: 2,
  ramp: 1,
  /**
   * The seam mask stays whole `pad` m past the lift's ease (step 3b, ruling 32 point 6: two nodes of the mask's grid, as
   * its texture reaches a node past the triangles that set it), then fades over `band` m, so wherever either mask is
   * partial the loft lies on the water.
   */
  pad: 2,
  band: 1,
  /**
   * Step 3b (ruling 32, point 4): along the crest a run's lift tapers to 0 over this many metres from each of its ends and
   * from any lane in it with no lift (as the old loft's `endBlend` does; a few metres, not one lane; provisional).
   */
  taper: 3,
  /**
   * A thrown tube's collapse, s (the old loft's √(2W/g) scale, provisional): the lip's foam draws over it, and from step
   * 3b (ruling 32, point 7) the loft lets go of the tube over it after touchdown; the bore is then the nodes'.
   */
  collapse: 0.6,
} as const;

/**
 * One slice's curve record (`ZoneSurface.curves`): its lane and its run (`wave`), its lift and span, its seam mask (1 on a
 * lifted slice and its lanes' neighbours, 0 on the pads past them), its clock, its lane's ray, its points (s, y).
 */
export const CURVE = {
  lane: 0, wave: 1, lift: 2, from: 3, to: 4, tau: 5, touchdown: 6, h0: 7, tipAlong: 8, tipUp: 9, overturned: 10,
  baseX: 11, baseZ: 12, rayX: 13, rayZ: 14, sigma: 15, mask: 16, points: 20,
} as const;
export const CURVE_STRIDE = CURVE.points + 2 * PROFILE_POINTS;

const S = LOFT_SAMPLES;
const E = LOFT.extensionSamples;
const EXTENSION_STEP = LOFT.extension / E;
const smoothstep = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** An empty `LoftResult` with room for `slices` slices. */
export function createLoftResult(slices: number): LoftResult {
  const v = slices * S;
  const f32 = (n: number) => new Float32Array(n);
  return {
    positions: f32(3 * v), normals: f32(3 * v), mask: f32(v), lift: f32(v), sheet: f32(v), sheetWeight: f32(v), sheetBack: f32(v),
    throat: f32(4 * v), indices: new Uint32Array(6 * (S - 1) * slices), vertexCount: 0, indexCount: 0, sliceCount: 0,
    sliceFront: new Int32Array(slices), sliceSigma: f32(slices), sliceTau: f32(slices), slicePhase: new Uint8Array(slices),
    sliceLife: f32(slices), sliceCollapse: f32(slices), sliceFade: f32(slices), sliceTipGap: f32(slices), tipGap: 0,
    sliceRestHold: f32(slices), sliceRestEnd: f32(slices), sliceRestClimb: f32(slices), sliceToeClimb: f32(slices), restSamples: 0,
    clamps: 0, clampedLookups: 0, sliceJoined: new Uint8Array(slices), overlaps: 0, overlapsOpen: 0, overlapOpenWeight: 0,
    overlapsOpenHeavy: 0, openDrops: [], overlapsKept: 0, refineLevels: 0, rayCorrections: 0, rayMaxBlend: 0, rayMinAdvance: 0,
    dugCapped: 0, rayInvalidIntervals: 0, sliceRayX: f32(slices), sliceRayZ: f32(slices), sliceWeight: f32(slices),
    sliceOverturned: new Uint8Array(slices), sliceTipAlong: f32(slices), sliceTipUp: f32(slices), sliceTipTransportAlong: f32(slices),
    sliceTipTransportUp: f32(slices), sliceAnchorVX: f32(slices), sliceAnchorVZ: f32(slices), sliceFormed: f32(slices),
    sliceTipX: f32(slices), sliceTipY: f32(slices), sliceTipZ: f32(slices), sliceMouth: f32(slices), sliceStretch: f32(slices),
    sliceAfter: f32(slices), sliceShift: f32(slices), shiftMisses: 0,
  };
}

/** The lift along a slice's lane at s m: 1 over [from, to], eased to 0 over `LIFT.ramp` beyond. */
export function liftAlong(s: number, from: number, to: number): number {
  if (s >= from && s <= to) return 1;
  const off = s < from ? from - s : s - to;
  return 1 - smoothstep(off / LIFT.ramp);
}

/** The seam mask along a slice's lane at s m: 1 over the lift, its ease and the pad, fading over `LIFT.band` beyond. */
export function maskAlong(s: number, from: number, to: number): number {
  const reach = LIFT.ramp + LIFT.pad;
  const off = s < from - reach ? from - reach - s : s > to + reach ? s - to - reach : 0;
  return 1 - smoothstep(off / LIFT.band);
}

/**
 * A pad record's source (`LibraryLoft.build`): the nearest record of its run (`CURVE.wave`) within `PAD_SOURCE` lanes
 * that lifts; −1 with none. The zone writes a run's records in lane order, so they lie next to it.
 */
function padSource(curves: Float32Array, count: number, c: number): number {
  const o = c * CURVE_STRIDE;
  const wave = curves[o + CURVE.wave];
  const lane = curves[o + CURVE.lane];
  let best = -1;
  let gap = Infinity;
  for (let d = 1; d <= 2 * PAD_SOURCE; d += 1) {
    for (const k of [c - d, c + d]) {
      if (k < 0 || k >= count) continue;
      const r = k * CURVE_STRIDE;
      if (curves[r + CURVE.wave] !== wave || !(curves[r + CURVE.lift] > 0)) continue;
      const g = Math.abs(curves[r + CURVE.lane] - lane);
      if (g <= PAD_SOURCE && g < gap) { gap = g; best = k; }
    }
  }
  return best;
}

/** How far a pad looks for its run's lifted lane, lanes (the zone's `PAD_LANES`). */
const PAD_SOURCE = 3;

/** Builds the overturn's loft from the zone's curves over the water at `heightAt`; `drawing` adds the lip's sheet and the throat. */
export class LibraryLoft {
  readonly result: LoftResult;
  private readonly profile = new Float32Array(2 * PROFILE_POINTS);
  private readonly across = new Float32Array(PROFILE_POINTS);
  private readonly back = new Float32Array(PROFILE_POINTS);
  private readonly inside = new Float32Array(4 * PROFILE_POINTS);

  constructor(readonly capacity = Math.floor(LOFT.budget / S), readonly drawing = false) {
    this.result = createLoftResult(capacity);
  }

  /**
   * The loft over the water at `heightAt`; `keep`, when given, builds only the records it keeps (by their offset in
   * `curves`: the worker's contact keeps those near its bodies), a cut run ending there as a run's end does.
   */
  build(curves: Float32Array, count: number, heightAt: (x: number, z: number) => number, keep?: (offset: number) => boolean): LoftResult {
    const r = this.result;
    r.sliceCount = 0;
    r.vertexCount = 0;
    r.indexCount = 0;
    let previous = -1;
    for (let c = 0; c < count && r.sliceCount < this.capacity; c += 1) {
      const o = c * CURVE_STRIDE;
      if (keep && !keep(o)) continue;
      const slice = r.sliceCount;
      const bx = curves[o + CURVE.baseX];
      const bz = curves[o + CURVE.baseZ];
      const rx = curves[o + CURVE.rayX];
      const rz = curves[o + CURVE.rayZ];
      const lift = curves[o + CURVE.lift];
      const from = curves[o + CURVE.from];
      const to = curves[o + CURVE.to];
      const tau = curves[o + CURVE.tau];
      const touchdown = curves[o + CURVE.touchdown];
      const p = o + CURVE.points;
      // The lip as a sheet and the tube's inside (the drawing only), on the curve itself in its lane's plane, m.
      let formed = 0;
      let lipThickness = 0;
      if (this.drawing && lift > 0) {
        const crest = curves[p + 2 * LANDMARK.crest];
        for (let i = 0; i < PROFILE_POINTS; i += 1) {
          this.profile[2 * i] = curves[p + 2 * i] - crest;
          this.profile[2 * i + 1] = curves[p + 2 * i + 1];
        }
        this.across.fill(0);
        this.back.fill(0);
        formed = sheetAcross(this.profile, curves[o + CURVE.h0], this.across, this.back);
        if (formed > 0) {
          throatViews(this.profile, this.inside);
          for (let i = THROAT.thicknessFrom; i <= THROAT.thicknessTo; i += 1) lipThickness += this.across[i];
          lipThickness /= THROAT.thicknessTo - THROAT.thicknessFrom + 1;
        }
      }
      // Step 3b: a pad (no lift) takes its places along its lane from its run's nearest lifted lane, across the rays, so
      // its quads to that lane stay square: its own points stand at its own clock, metres apart along the lane from the
      // lifted neighbour's where the two stand in other phases, and flat triangles between them leave the water.
      const source = lift > 0 ? -1 : padSource(curves, count, c);
      const q = source < 0 ? p : source * CURVE_STRIDE + CURVE.points;
      const qo = source < 0 ? o : source * CURVE_STRIDE;
      const qbx = curves[qo + CURVE.baseX], qbz = curves[qo + CURVE.baseZ], qrx = curves[qo + CURVE.rayX], qrz = curves[qo + CURVE.rayZ];
      for (let j = 0; j < S; j += 1) {
        const i = j - E;
        const own = i < 0 ? curves[q] + i * EXTENSION_STEP : i >= PROFILE_POINTS ? curves[q + 2 * (PROFILE_POINTS - 1)] + (i - PROFILE_POINTS + 1) * EXTENSION_STEP : curves[q + 2 * i];
        const s = source < 0 ? own : (qbx + own * qrx - bx) * rx + (qbz + own * qrz - bz) * rz;
        const x = bx + s * rx;
        const z = bz + s * rz;
        const water = heightAt(x, z);
        const e = i < 0 || i >= PROFILE_POINTS ? 0 : lift * liftAlong(s, from, to);
        const y = i < 0 || i >= PROFILE_POINTS ? water : e * curves[p + 2 * i + 1] + (1 - e) * water;
        const v = slice * S + j;
        r.positions[3 * v] = x;
        r.positions[3 * v + 1] = y;
        r.positions[3 * v + 2] = z;
        r.lift[v] = e;
        r.mask[v] = curves[o + CURVE.mask] > 0 ? maskAlong(s, from, to) : 0;
        let sheet = 0;
        let sheetBack = 0;
        let sheetShare = 0;
        let sky = 1;
        let underLip = 0;
        let inner = 0;
        if (formed > 0 && i > LANDMARK.crest && i < LANDMARK.throat) {
          sheet = this.across[i];
          sheetBack = this.back[i];
          sheetShare = formed * Math.min(1, Math.min(i - LANDMARK.crest, LANDMARK.throat - i) / (SHEET.ramp + 1));
        }
        if (formed > 0 && i >= 0 && i < PROFILE_POINTS) {
          sky = this.inside[4 * i];
          underLip = this.inside[4 * i + 1];
          inner = formed * this.inside[4 * i + 2];
        }
        r.sheet[v] = sheet;
        r.sheetWeight[v] = sheetShare * e;
        r.sheetBack[v] = sheetBack;
        r.throat[4 * v] = sky;
        r.throat[4 * v + 1] = underLip;
        r.throat[4 * v + 2] = lipThickness;
        r.throat[4 * v + 3] = inner * e;
      }
      r.sliceFront[slice] = curves[o + CURVE.wave];
      r.sliceSigma[slice] = curves[o + CURVE.sigma];
      r.sliceTau[slice] = tau;
      r.slicePhase[slice] = tau < 0 ? 0 : tau <= touchdown ? 1 : 2;
      r.sliceLife[slice] = tau >= 0 && touchdown > 0 ? tau / touchdown : Number.NaN;
      r.sliceCollapse[slice] = LIFT.collapse;
      r.sliceFade[slice] = 1;
      r.sliceAfter[slice] = tau - touchdown;
      r.sliceStretch[slice] = 1;
      r.sliceRayX[slice] = rx;
      r.sliceRayZ[slice] = rz;
      r.sliceWeight[slice] = lift;
      r.sliceOverturned[slice] = curves[o + CURVE.overturned] > 0 ? 1 : 0;
      r.sliceTipAlong[slice] = curves[o + CURVE.tipAlong];
      r.sliceTipUp[slice] = curves[o + CURVE.tipUp];
      r.sliceTipTransportAlong[slice] = curves[o + CURVE.tipAlong];
      r.sliceTipTransportUp[slice] = curves[o + CURVE.tipUp];
      r.sliceAnchorVX[slice] = 0;
      r.sliceAnchorVZ[slice] = 0;
      r.sliceFormed[slice] = formed;
      const tip = 3 * (slice * S + E + LANDMARK.lip);
      r.sliceTipX[slice] = r.positions[tip];
      r.sliceTipY[slice] = r.positions[tip + 1];
      r.sliceTipZ[slice] = r.positions[tip + 2];
      r.sliceJoined[slice] = 0;
      if (slice > 0 && previous === c - 1) {
        const q = previous * CURVE_STRIDE;
        if (curves[q + CURVE.wave] === curves[o + CURVE.wave] && curves[o + CURVE.lane] - curves[q + CURVE.lane] === 1) r.sliceJoined[slice - 1] = 1;
      }
      previous = c;
      r.sliceCount += 1;
    }
    r.vertexCount = r.sliceCount * S;
    // Runs of joined slices: their normals, their tubes' mouths, their triangles.
    let first = 0;
    for (let s = 0; s < r.sliceCount; s += 1) {
      if (s + 1 < r.sliceCount && r.sliceJoined[s] === 1) continue;
      this.normals(first, s);
      let open = r.sliceSigma[first];
      for (let k = first; k <= s; k += 1) {
        if (!(r.sliceFormed[k] > 0)) open = r.sliceSigma[k];
        r.sliceMouth[k] = r.sliceFormed[k] > 0 ? r.sliceSigma[k] - open : 0;
      }
      open = r.sliceSigma[s];
      for (let k = s; k >= first; k -= 1) {
        if (!(r.sliceFormed[k] > 0)) open = r.sliceSigma[k];
        if (r.sliceFormed[k] > 0) r.sliceMouth[k] = Math.min(r.sliceMouth[k], open - r.sliceSigma[k]);
      }
      first = s + 1;
    }
    for (let s = 0; s + 1 < r.sliceCount; s += 1) {
      if (r.sliceJoined[s] !== 1) continue;
      for (let j = 0; j < S - 1; j += 1) {
        const v00 = s * S + j;
        const v10 = v00 + S;
        const i = r.indexCount;
        r.indices[i] = v00;
        r.indices[i + 1] = v10;
        r.indices[i + 2] = v00 + 1;
        r.indices[i + 3] = v00 + 1;
        r.indices[i + 4] = v10;
        r.indices[i + 5] = v10 + 1;
        r.indexCount += 6;
      }
    }
    return r;
  }

  /** A run's vertex normals: the curve's tangent across the next slice's direction (SweptLoft's rule). */
  private normals(firstSlice: number, lastSlice: number): void {
    const { positions: p, normals } = this.result;
    for (let s = firstSlice; s <= lastSlice; s += 1) {
      const sBack = Math.max(firstSlice, s - 1);
      const sAhead = Math.min(lastSlice, s + 1);
      for (let j = 0; j < S; j += 1) {
        const a0 = 3 * (s * S + Math.max(0, j - 1));
        const a1 = 3 * (s * S + Math.min(S - 1, j + 1));
        let b0 = 3 * (sBack * S + j);
        let b1 = 3 * (sAhead * S + j);
        // A lone slice: across its own lane's tangent.
        const lone = sBack === sAhead;
        const ax = p[a1] - p[a0];
        const ay = p[a1 + 1] - p[a0 + 1];
        const az = p[a1 + 2] - p[a0 + 2];
        let bx = p[b1] - p[b0];
        let by = p[b1 + 1] - p[b0 + 1];
        let bz = p[b1 + 2] - p[b0 + 2];
        if (lone) {
          b0 = 0;
          b1 = 0;
          bx = this.result.sliceRayZ[s];
          by = 0;
          bz = -this.result.sliceRayX[s];
        }
        let cx = ay * bz - az * by;
        let cy = az * bx - ax * bz;
        let cz = ax * by - ay * bx;
        const length = Math.sqrt(cx * cx + cy * cy + cz * cz);
        if (length > 1e-12) {
          cx /= length;
          cy /= length;
          cz /= length;
        } else {
          cx = 0;
          cy = 1;
          cz = 0;
        }
        const o = 3 * (s * S + j);
        normals[o] = cx;
        normals[o + 1] = cy;
        normals[o + 2] = cz;
      }
    }
  }
}
