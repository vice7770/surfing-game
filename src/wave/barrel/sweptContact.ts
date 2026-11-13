import { LANDMARK, type ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
import type { TubeFace } from './faceAnchor';
import type { OwnedPlainSurface, PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { createTubeApproachObservation, resetTubeRouteObservation, routeForStrip, validTubeApproachRequest,
  type TubeApproachCue, type TubeApproachRequest, type TubeApproachObservation, type TubeCapProjectionObservation,
  type TubeRouteObservation, type TubeRouteAttemptObservation } from './tubeApproach';
export type { TubeApproachCue, TubeApproachRequest, TubeApproachObservation } from './tubeApproach';

/** Scalar records are reused: no per-rejected-candidate diagnostic object or unbounded history. */
function writeCapObservation(target: TubeCapProjectionObservation | undefined, frontId: number, strip: number,
  fraction: number, sigma: number, x: number, z: number, distanceSquared: number, preferred: boolean): TubeCapProjectionObservation {
  if (!target) return { frontId, strip, fraction, sigma, x, z, distanceSquared, preferred };
  target.frontId = frontId; target.strip = strip; target.fraction = fraction; target.sigma = sigma;
  target.x = x; target.z = z; target.distanceSquared = distanceSquared; target.preferred = preferred;
  return target;
}

function writeAttemptObservation(target: TubeRouteAttemptObservation | undefined, route: TubeRouteObservation,
  cap: TubeCapProjectionObservation): TubeRouteAttemptObservation {
  if (!target) return { ...route, cap: { ...cap } };
  resetTubeRouteObservation(target);
  Object.assign(target, route);
  Object.assign(target.cap, cap);
  return target;
}

/** The physical water needs answers, not mutable contact geometry. */
export type SweptSurfaceQueries = Pick<SweptContact, 'query' | 'floorAt' | 'approachNear'>;
/** Internal ordinary-worker owner; neither object publishes a raw contact or loft. */
export interface OrdinaryContactOwner {
  readonly queries: SweptSurfaceQueries;
  updateFromPlainSurface(records: Float32Array, count: number, stillLevel: number, water: PhysicalSurfWater): void;
}
const ORDINARY_QUERY_NORMALS = Symbol('ordinary query normals');
/** The worker's face-ruling contact (`SweptContact.forFaceWorker`): its rows' heights and normals found on demand. */
const FACE_QUERY_ROWS = Symbol('face query rows');
/** C2 step 3's contact (`SweptContact.forLoft`): over a loft built elsewhere (`LibraryLoft`), no library of its own. */
const PROVIDED_LOFT = Symbol('provided loft');

/**
 * The contact's constants (the Padang Padang spec, Part B, PR 4):
 * - `cell`, m: the strips' index grid [inferred];
 * - `closing`: a tube is closing from this share of its open time (the advisor's ruling 5: its own constant, provisional);
 * - `crossings`: the most a vertical line meets in one strip (a tube has three; folds add two each) [inferred];
 * - `bucket`, m: each strip's quads are bucketed by their range along its ray this finely, so a vertical line tests only
 *   its bucket's, two or three a layer, not the strip's 133 (the advisor, 2026-09-30: about 0.5 m) [inferred].
 */
export const CONTACT = { cell: 2, closing: 0.8, crossings: 16, bucket: 0.5 } as const;

export interface ContactOptions {
  /** The quads' bucket along the ray, m (`CONTACT.bucket`); Infinity scans every quad of a strip. */
  bucket?: number;
  /** The step 3 ruling's tube (`LoftOptions.face`): the contact's loft is built as the drawing's. */
  face?: TubeFace;
}

export type TubeState = 'open' | 'closing' | 'closed';

/** A tube's state from its life, τ over touchdown (the advisor's ruling 5); none before the throw (NaN). */
export function tubeState(life: number): TubeState | undefined {
  if (!(life >= 0)) return undefined;
  return life < CONTACT.closing ? 'open' : life < 1 ? 'closing' : 'closed';
}

/** What the swept surface says at a point (NaN where a field does not apply). */
export interface ContactHit {
  /** The point lies in the swept surface's water: an odd number of crossings above it. */
  inWater: boolean;
  /** The surface the point answers to: the nearest crossing above in water, below in air; and its normal (out of the water). */
  surfaceY: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  /** The lowest crossing: the face (the water's `surfaceAt`). */
  floorY: number;
  /** In water over air (the curl's water): the curl's underside below the point. */
  waterFloorY: number;
  /** In air under the curl: the curl's underside and top above the point. */
  ceilingY: number;
  ceilingTopY: number;
  /** In the curl's water: its top's place from the crest landmark (0) to the lip tip (1), and the lip's velocity, m/s. */
  lipShare: number;
  lipVX: number;
  lipVY: number;
  lipVZ: number;
  /**
   * The slices' weight on the water at the point, 0–1 (their ends and their collapse): the lip's velocity weighs in by
   * it, as its shape does (the advisor, 2026-09-30).
   */
  lipWeight: number;
  /** The front's tangent at the point (x, z): the solver's flow along it is kept. */
  tangentX: number;
  tangentZ: number;
  /** τ over touchdown where the tube has thrown (NaN before). */
  life: number;
  /**
   * Step 7's wall water (`LoftResult.wall`, `TubeFace.wallFlow`), in the swept surface's water (NaN otherwise, and without
   * it): the surface's own velocity at its crossing above the point, along the ray and up, m/s; the anchor's and the crest's
   * heights, m; the drawn crest's speed C, m/s; B at the crest; and the slices' weight there.
   */
  wallAlong: number;
  wallUp: number;
  wallLow: number;
  wallTop: number;
  wallSpeed: number;
  wallB: number;
  wallWeight: number;
  /**
   * The step 7 follow-up's nearest surface (`TubeFace.contact`; the advisor's 2026-11-05 ruling §1), in the case's water
   * with no water floor (the wall), NaN otherwise and without it. The crossing above answers as before (`surfaceY`, the
   * normal, `wallAlong`, `wallUp`); beside it, the first crossing of a horizontal cast shoreward along the ray from the point,
   * within `NEAREST.reach`: its depth along its own normal (m), that normal, its surface's velocity along the ray and up
   * (m/s), and where it is (x, z, m). `verticalDepth` is the crossing above's depth along its normal, d_v |n_y| (m), and
   * `aheadWeight` the face ahead's share, 0–1 (0: none, or the crossing above nearer by `NEAREST.blend`; 1: the face ahead
   * nearer by it; smoothstep between). `normalDepth` is the two blended by it, m.
   */
  normalDepth: number;
  verticalDepth: number;
  aheadWeight: number;
  aheadDepth: number;
  aheadNormalX: number;
  aheadNormalY: number;
  aheadNormalZ: number;
  aheadAlong: number;
  aheadUp: number;
  aheadX: number;
  aheadZ: number;
  /**
   * Ruling 5's seam blend (`TubeFace.seam`, `WallWater.seam`; absent without it): the case's share α at the crossing above
   * the point, 0 where its surface is the solver's (NaN out of its water), and at the face ahead (`aheadAlong`'s place).
   */
  seam?: number;
  aheadSeam?: number;
  /**
   * Ruling 21's dug foot (`TubeFace.dug`, `WallWater.dug`; absent without it): the case's share α at the lowest crossing
   * of the point's vertical line (`floorY`), over 0 where that floor is the case's own front also under the solver's sea.
   */
  dug?: number;
}

export function createContactHit(): ContactHit {
  return {
    inWater: false, surfaceY: Number.NaN, normalX: 0, normalY: 1, normalZ: 0, floorY: Number.NaN, waterFloorY: Number.NaN,
    ceilingY: Number.NaN, ceilingTopY: Number.NaN, lipShare: 0, lipVX: 0, lipVY: 0, lipVZ: 0, lipWeight: 0, tangentX: 1, tangentZ: 0,
    life: Number.NaN, wallAlong: Number.NaN, wallUp: Number.NaN, wallLow: Number.NaN, wallTop: Number.NaN, wallSpeed: Number.NaN,
    wallB: Number.NaN, wallWeight: 0, normalDepth: Number.NaN, verticalDepth: Number.NaN, aheadWeight: 0, aheadDepth: Number.NaN,
    aheadNormalX: 0, aheadNormalY: 1, aheadNormalZ: 0, aheadAlong: Number.NaN, aheadUp: Number.NaN, aheadX: Number.NaN, aheadZ: Number.NaN,
  };
}

/**
 * The nearest surface's constants (`TubeFace.contact`; the advisor's 2026-11-05 ruling §1): the horizontal cast's reach
 * shoreward along the ray, m (1), and the band over which the crossing above and the face ahead are blended by their depths
 * along their own normals, m (within 0.05 m of each other), so the force on a body does not flip between them. *(Built so)*
 * the face ahead also fades out over the cast's last `fade` m (0.1), so its answer never steps where it leaves the reach.
 */
export const NEAREST = { reach: 1, blend: 0.05, fade: 0.1 } as const;

const S = LOFT_SAMPLES;
/** Quads a strip has: one fewer than a slice's samples. */
const Q = S - 1;
const E = LOFT.extensionSamples;
/** How far a point exactly on a slice's ray is moved into its strip, m: far above rounding at 100 m, far below a cell. */
const NUDGE = 1e-9;
/**
 * How far each quad's range along its ray is widened, m: the ranges are stored as 32-bit floats (about 4 µm apart at
 * 40 m), so a point on a quad's edge may round outside it; the triangle tests decide exactly within it.
 */
const SLACK = 1e-4;

/**
 * The swept barrel's contact (the Padang Padang spec, Part B, PR 4; the advisor's rulings, 2026-09-30): the loft the
 * page draws, built again in the worker from the same front records in contact mode, and a point's water or air by
 * the parity of the lofted triangles a vertical line crosses above it.
 * - **Closing** (ruling 2): each slice's curve is closed down to the seabed past its pinned ends, by vertical walls a
 *   vertical line never crosses, so the crossings alone decide. They are half-open: at or below the point counts as
 *   below, and a point on an edge two triangles share counts in exactly one (on a fold, in both or neither).
 * - **Layers:** in water, the surface is the nearest crossing above (the curl's top in its water, the face under it)
 *   and a crossing below is the curl's underside; in air, the surface is the nearest below and the two above are the
 *   curl's underside and top.
 * - **The lip's flow** (ruling 1): in the curl's water, from the crest landmark (0) to the tip (1) by where its top is,
 *   weighed by the slices' weight as their shape is (`lipWeight`).
 * - **Overlapping fronts** (the advisor, 2026-09-30): the loft drops a later front's strips over an earlier front's,
 *   as the drawing does; where any still overlap, the first front's strip answers, counted in `stats.overlaps`.
 * - **Cost** (the advisor, 2026-09-30): the strips are indexed by a grid, and each strip's quads bucketed by their range
 *   along its ray, so a vertical line tests only its bucket's quads; a point outside every front's footprint tests none.
 *   Queried strips build their buckets on demand. The buckets keep the quads in order, so the answers are exactly
 *   the full scan's; every update captures the projections and discards all prepared buckets.
 * Only + − × ÷ and √. It keeps nothing between steps but the loft.
 */
export class SweptContact {
  /**
   * Queries, those the loft answered, and columns it could not close (air under every crossing: the water answered);
   * the quads the queries tested; and answered queries another front's strip also held (the loft drops a later front's
   * strips over an earlier's, so this is the backstop's count: the first front answers).
   */
  readonly stats = { queries: 0, hits: 0, anomalies: 0, quads: 0, overlaps: 0 };
  last: LoftResult | undefined;
  private readonly loft: Pick<SweptLoft, 'build'>;
  private readonly prepareRow?: (row: number) => void;
  private readonly prepareNormal?: (vertex: number) => void;
  private readonly bucket: number;
  /** Provider mode, not descriptive loft diagnostics, controls C water-closure contact ownership. */
  private readonly boundedC: boolean;
  private geometryStep = 0;
  /** Per vertex, its along-ray coordinate on its own slice's ray, and (a joined slice's next) on the previous slice's. */
  private own = new Float32Array(0);
  private prior = new Float32Array(0);
  /** The strips (joined slices s → s + 1) by grid cell: counting-sorted slice indices. */
  private cellStart = new Int32Array(1);
  private cellStrips = new Int32Array(0);
  private cellFill = new Int32Array(0);
  /** Per strip, its xz box in grid cells (x0, x1, z0, z1). */
  private boxes = new Int32Array(0);
  private x0 = 0;
  private z0 = 0;
  private nx = 0;
  private nz = 0;
  /** Per quad (strip s's column j at s × Q + j), its range along the strip's ray: the least and greatest of its corners. */
  private quadLow = new Float32Array(0);
  private quadHigh = new Float32Array(0);
  /** Per strip (by its first slice), where its buckets start along its ray, how many it has, and its first bucket. */
  private stripLow = new Float32Array(0);
  private stripBuckets = new Int32Array(0);
  private stripFirst = new Int32Array(0);
  /** Which strips have been bucketed this update, and the end of their shared storage. */
  private stripReady = new Uint8Array(0);
  /** Per joined strip, its first actual loft triangle index; contact consumes the drawing's construction. */
  private stripIndex = new Int32Array(0);
  private nextBucket = 0;
  private nextEntry = 0;
  /** Per bucket, where its quads start in `bucketQuads` (the next bucket's start ends it); the quads' columns, in order. */
  private bucketStart = new Int32Array(1);
  private bucketQuads = new Uint8Array(0);
  private bucketFill = new Int32Array(0);
  /** One strip's quads' first and last buckets, while it is bucketed. */
  private readonly quadFrom = new Int32Array(Q);
  private readonly quadTo = new Int32Array(Q);
  /** One strip's crossings, sorted up: y, the triangle's vertices, and the barycentric weights. */
  private readonly ys = new Float64Array(CONTACT.crossings);
  private readonly at = new Int32Array(3 * CONTACT.crossings);
  private readonly weights = new Float64Array(3 * CONTACT.crossings);
  private count = 0;
  /** The found strip's sides of the point: off its first ray (≥ 0) and its second (< 0); and its place in its cell. */
  private sideA = 0;
  private sideB = 0;
  private found = 0;
  /** `TubeFace.contact`: the nearest surface in the wall (a horizontal cast ahead beside the crossing above). */
  private readonly nearest: boolean;
  /** Its rows' heights and normals are found as its queries need them (`forFaceWorker`, `forOrdinaryWorker`). */
  readonly rowsOnDemand: boolean;

  constructor(
    library: ProfileLibrary | undefined, slope: number, options: ContactOptions = {}, internal?: typeof ORDINARY_QUERY_NORMALS | typeof FACE_QUERY_ROWS | typeof PROVIDED_LOFT,
    provided?: Pick<SweptLoft, 'build'>,
  ) {
    if (internal === PROVIDED_LOFT) this.loft = provided!;
    else if (!library) throw new Error('SweptContact: no library');
    else if (internal === ORDINARY_QUERY_NORMALS || internal === FACE_QUERY_ROWS) {
      const queryLoft = SweptLoft.forContactQueries(library, slope, internal === FACE_QUERY_ROWS ? options.face : undefined);
      this.loft = queryLoft;
      this.prepareRow = queryLoft.prepareRow;
      this.prepareNormal = queryLoft.prepareNormal;
    } else this.loft = new SweptLoft(library, slope, { contact: true, ...(options.face ? { face: options.face } : {}) });
    this.bucket = options.bucket ?? CONTACT.bucket;
    this.boundedC = library?.options.geometry === 'bounded-C';
    this.nearest = options.face?.contact === true;
    this.rowsOnDemand = internal === ORDINARY_QUERY_NORMALS || internal === FACE_QUERY_ROWS;
  }

  /**
   * The worker's contact under the face ruling (the pool's straight Barrel; pool-barrel-perf, 2026-11-06): the same loft,
   * crossings, normals and answers as `new SweptContact(library, slope, { face })`, but each row's heights (with the
   * floor's rule) and each vertex's normal are found when a query first needs them, as Padang's ordinary worker contact
   * finds them (`forOrdinaryWorker`), from the same `heightAt`. Every query of a step comes before its water changes again
   * (the bodies push only discharge; the next update starts a new generation), so the heights read later are the same.
   * Its `last` loft carries those rows only once queried (the rest stand at the previous build's, `sliceTipY` NaN): the
   * game reads it only through the queries. Its `heightAt` must answer the same through the generation: the runner gives
   * it the water's heights through a cache of their own (`PhysicalSurfWater.createCachedPlainSurface`), emptied at each
   * update, as some queries come outside any cache scope. `?contactRows=old` builds every row at the update, as before.
   */
  static forFaceWorker(library: ProfileLibrary, slope: number, face: TubeFace): SweptContact {
    return new SweptContact(library, slope, { face }, FACE_QUERY_ROWS);
  }

  /**
   * C2 step 3 (`?wave=library`): the contact over the library zone's overturn, a loft built elsewhere each step
   * (`LibraryLoft`) that `build` hands over; `update`'s records and heights are not read. The same crossings and answers.
   */
  static forLoft(build: () => LoftResult): SweptContact {
    return new SweptContact(undefined, 0, {}, PROVIDED_LOFT, { build });
  }

  /** Internal worker construction, never a posted option or public lazy-output mode. */
  static forOrdinaryWorker(library: ProfileLibrary, slope: number): OrdinaryContactOwner {
    const contact = new SweptContact(library, slope, {}, ORDINARY_QUERY_NORMALS);
    const queries = Object.freeze({
      query: contact.query.bind(contact),
      floorAt: contact.floorAt.bind(contact),
      approachNear: contact.approachNear.bind(contact),
    });
    let owned: OwnedPlainSurface | undefined;
    let source: PhysicalSurfWater | undefined;
    return Object.freeze({
      queries,
      updateFromPlainSurface(records: Float32Array, count: number, stillLevel: number, water: PhysicalSurfWater): void {
        if (count === 0) {
          contact.update(records, count, stillLevel, () => stillLevel);
          return;
        }
        if (source !== water) { source = water; owned = water.createOwnedPlainSurface(); }
        // Full h/bed/x copies and owned node-cache invalidation are part of each live preparation's work.
        owned!.capture();
        contact.update(records, count, stillLevel, owned!.heightAt);
      },
    });
  }

  /** Loft the fronts over the water (`heightAt`, uncarved) and index the strips for this step's queries. */
  update(records: Float32Array, count: number, stillLevel: number, heightAt: (x: number, z: number) => number,
    bedAt?: (x: number, z: number) => number): void {
    const loft = this.loft.build(records, count, stillLevel, heightAt, bedAt);
    this.last = loft;
    this.geometryStep += 1;
    const { positions: p, sliceCount } = loft;
    if (this.own.length !== p.length / 3) {
      const slices = p.length / 3 / S;
      this.own = new Float32Array(p.length / 3);
      this.prior = new Float32Array(p.length / 3);
      this.quadLow = new Float32Array(slices * Q);
      this.quadHigh = new Float32Array(slices * Q);
      this.stripLow = new Float32Array(slices);
      this.stripBuckets = new Int32Array(slices);
      this.stripFirst = new Int32Array(slices);
      this.stripReady = new Uint8Array(slices);
      this.stripIndex = new Int32Array(slices);
      this.boxes = new Int32Array(4 * slices);
    }
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    let index = 0;
    for (let s = 0; s < sliceCount; s += 1) {
      this.stripIndex[s] = index;
      if (loft.sliceJoined[s] === 1) index += 6 * Q;
      const o = s * S;
      const rx = loft.sliceRayX[s];
      const rz = loft.sliceRayZ[s];
      const joined = s > 0 && loft.sliceJoined[s - 1] === 1;
      for (let j = 0; j < S; j += 1) {
        const v = o + j;
        this.own[v] = (p[3 * v] - p[3 * o]) * rx + (p[3 * v + 2] - p[3 * o + 2]) * rz;
        if (joined) {
          const q = o - S;
          this.prior[v] = (p[3 * v] - p[3 * q]) * loft.sliceRayX[s - 1] + (p[3 * v + 2] - p[3 * q + 2]) * loft.sliceRayZ[s - 1];
        }
        minX = Math.min(minX, p[3 * v]);
        maxX = Math.max(maxX, p[3 * v]);
        minZ = Math.min(minZ, p[3 * v + 2]);
        maxZ = Math.max(maxZ, p[3 * v + 2]);
      }
    }
    this.index(loft, minX, minZ, maxX, maxZ);
    this.stripReady.fill(0);
    this.nextBucket = 0;
    this.nextEntry = 0;
  }

  /** The swept surface at (x, y, z) into `hit`; false where the loft is not (the water answers as before). */
  query(x: number, y: number, z: number, hit: ContactHit): boolean {
    this.stats.queries += 1;
    const strip = this.strip(x, z);
    if (strip < 0) return false;
    const loft = this.last!;
    if (this.heldByAnother(loft, strip, x, z)) this.stats.overlaps += 1;
    const n = this.count;
    const { ys } = this;
    let above = 0;
    for (let k = 0; k < n; k += 1) if (ys[k] > y) above += 1;
    const below = n - above;
    hit.inWater = (above & 1) === 1;
    hit.floorY = ys[0];
    const marks = loft.wall?.dug;
    if (marks) {
      // Ruling 21 (`TubeFace.dug`): the dug share at the lowest crossing, by its triangle's weights.
      let dug = 0;
      for (let m = 0; m < 3; m += 1) dug += this.weights[m] * marks[this.at[m]];
      hit.dug = dug;
    }
    hit.waterFloorY = Number.NaN;
    hit.ceilingY = Number.NaN;
    hit.ceilingTopY = Number.NaN;
    hit.lipShare = 0;
    hit.lipVX = 0;
    hit.lipVY = 0;
    hit.lipVZ = 0;
    hit.lipWeight = 0;
    let surface: number;
    if (hit.inWater) {
      surface = below;
      if (below > 0) hit.waterFloorY = ys[below - 1];
    } else {
      if (below === 0) {
        // Air under every crossing: the strip is not closed here (a fold at its edge); the water answers.
        this.stats.anomalies += 1;
        return false;
      }
      surface = below - 1;
      if (above >= 2) {
        hit.ceilingY = ys[below];
        hit.ceilingTopY = ys[below + 1];
      }
    }
    hit.surfaceY = ys[surface];
    this.normalAt(loft, surface, hit);
    // How far the point lies from the strip's first ray toward its second, 0–1.
    const { sideA, sideB } = this;
    const f = sideA - sideB > 0 ? sideA / (sideA - sideB) : 0;
    const next = strip + 1;
    const rayX = loft.sliceRayX[strip] + f * (loft.sliceRayX[next] - loft.sliceRayX[strip]);
    const rayZ = loft.sliceRayZ[strip] + f * (loft.sliceRayZ[next] - loft.sliceRayZ[strip]);
    const length = Math.sqrt(rayX * rayX + rayZ * rayZ);
    hit.tangentX = rayZ / length;
    hit.tangentZ = -rayX / length;
    const la = loft.sliceLife[strip];
    const lb = loft.sliceLife[next];
    hit.life = la === la ? (lb === lb ? la + f * (lb - la) : la) : lb;
    if (hit.inWater && below > 0) {
      const index = this.profileIndex(surface) - E;
      hit.lipShare = Math.min(1, Math.max(0, (index - LANDMARK.crest) / (LANDMARK.lip - LANDMARK.crest)));
      const along = loft.sliceTipAlong[strip] + f * (loft.sliceTipAlong[next] - loft.sliceTipAlong[strip]);
      hit.lipVX = (along * rayX) / length + (loft.sliceAnchorVX[strip] + f * (loft.sliceAnchorVX[next] - loft.sliceAnchorVX[strip]));
      hit.lipVZ = (along * rayZ) / length + (loft.sliceAnchorVZ[strip] + f * (loft.sliceAnchorVZ[next] - loft.sliceAnchorVZ[strip]));
      hit.lipVY = loft.sliceTipUp[strip] + f * (loft.sliceTipUp[next] - loft.sliceTipUp[strip]);
      hit.lipWeight = loft.sliceWeight[strip] + f * (loft.sliceWeight[next] - loft.sliceWeight[strip]);
    }
    const { wall } = loft;
    if (wall && hit.inWater) {
      // The wall water: the surface's own velocity at its crossing above, by its triangle's weights; the rest across the strip.
      let along = 0;
      let up = 0;
      for (let m = 0; m < 3; m += 1) {
        const v = this.at[3 * surface + m];
        const w = this.weights[3 * surface + m];
        along += w * wall.along[v];
        up += w * wall.up[v];
      }
      hit.wallAlong = along;
      hit.wallUp = up;
      if (wall.seam) {
        let seam = 0;
        for (let m = 0; m < 3; m += 1) seam += this.weights[3 * surface + m] * wall.seam[this.at[3 * surface + m]];
        hit.seam = seam;
      }
      hit.wallLow = wall.low[strip] + f * (wall.low[next] - wall.low[strip]);
      hit.wallTop = wall.top[strip] + f * (wall.top[next] - wall.top[strip]);
      hit.wallSpeed = wall.speed[strip] + f * (wall.speed[next] - wall.speed[strip]);
      hit.wallB = wall.b[strip] + f * (wall.b[next] - wall.b[strip]);
      hit.wallWeight = loft.sliceWeight[strip] + f * (loft.sliceWeight[next] - loft.sliceWeight[strip]);
    } else {
      hit.wallSpeed = Number.NaN;
      hit.wallWeight = 0;
      if (wall?.seam) hit.seam = Number.NaN;
    }
    hit.normalDepth = Number.NaN;
    hit.verticalDepth = Number.NaN;
    hit.aheadWeight = 0;
    if (this.nearest && hit.inWater && below === 0) this.nearestSurface(loft, strip, x, y, z, rayX / length, rayZ / length, hit);
    this.stats.hits += 1;
    return true;
  }

  /**
   * The step 7 follow-up's nearest surface (`TubeFace.contact`; the advisor's 2026-11-05 ruling §1) at a point in the wall
   * (in the case's water, no water floor), `hit` holding the crossing above (crossing 0): a body there takes the surface
   * nearest it along its own normal, not the one its vertical line meets. Each strip is a 2D profile in the ray–vertical
   * plane, so a horizontal cast shoreward along the ray (rx, rz) at the point's height, within `NEAREST.reach`, through the
   * strip's buckets, finds the face just ahead; of it and the crossing above, the nearer by depth along its own normal
   * answers (d_h |n_a| against d_v |n_y|), blended within `NEAREST.blend` (smoothstep). Only + − × ÷ and √.
   */
  private nearestSurface(loft: LoftResult, strip: number, x: number, y: number, z: number, rx: number, rz: number, hit: ContactHit): void {
    hit.verticalDepth = (hit.surfaceY - y) * Math.abs(hit.normalY);
    hit.normalDepth = hit.verticalDepth;
    hit.aheadDepth = Number.NaN;
    const p = loft.positions;
    const o = strip * S;
    // Along slice s's ray, as the vertical crossings (`crossings`) bucket it.
    const q = (x - p[3 * o]) * loft.sliceRayX[strip] + (z - p[3 * o + 2]) * loft.sliceRayZ[strip];
    const reach = NEAREST.reach;
    const from = Math.max(0, Math.floor((q - this.stripLow[strip]) / this.bucket));
    const to = Math.min(this.stripBuckets[strip] - 1, Math.floor((q + reach - this.stripLow[strip]) / this.bucket));
    let best: number = reach;
    let found = -1;
    let bu = 0;
    let bv = 0;
    const base = strip * Q;
    const indices = loft.indices;
    for (let b = from; b <= to; b += 1) {
      const k = this.stripFirst[strip] + b;
      for (let e = this.bucketStart[k]; e < this.bucketStart[k + 1]; e += 1) {
        const j = this.bucketQuads[e];
        if (this.quadHigh[base + j] < q || this.quadLow[base + j] > q + reach) continue;
        const t = this.stripIndex[strip] + 6 * j;
        for (let m = 0; m < 6; m += 3) {
          const a = indices[t + m];
          const bb = indices[t + m + 1];
          const c = indices[t + m + 2];
          // Möller–Trumbore along (rx, 0, rz) from (x, y, z): E1 = B − A, E2 = C − A, P = D × E2.
          const e1x = p[3 * bb] - p[3 * a];
          const e1y = p[3 * bb + 1] - p[3 * a + 1];
          const e1z = p[3 * bb + 2] - p[3 * a + 2];
          const e2x = p[3 * c] - p[3 * a];
          const e2y = p[3 * c + 1] - p[3 * a + 1];
          const e2z = p[3 * c + 2] - p[3 * a + 2];
          const px = -rz * e2y;
          const py = rz * e2x - rx * e2z;
          const pz = rx * e2y;
          const det = e1x * px + e1y * py + e1z * pz;
          if (det === 0) continue;
          const tx = x - p[3 * a];
          const ty = y - p[3 * a + 1];
          const tz = z - p[3 * a + 2];
          const u = (tx * px + ty * py + tz * pz) / det;
          if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y;
          const qy = tz * e1x - tx * e1z;
          const qz = tx * e1y - ty * e1x;
          const v = (rx * qx + rz * qz) / det;
          if (v < 0 || u + v > 1) continue;
          const along = (e2x * qx + e2y * qy + e2z * qz) / det;
          if (!(along > 0) || !(along < best)) continue;
          best = along;
          found = t + m;
          bu = u;
          bv = v;
        }
      }
    }
    if (found < 0) return;
    const a = indices[found];
    const b = indices[found + 1];
    const c = indices[found + 2];
    const wa = 1 - bu - bv;
    this.prepareNormal?.(a);
    this.prepareNormal?.(b);
    this.prepareNormal?.(c);
    const n = loft.normals;
    let nx = wa * n[3 * a] + bu * n[3 * b] + bv * n[3 * c];
    let ny = wa * n[3 * a + 1] + bu * n[3 * b + 1] + bv * n[3 * c + 1];
    let nz = wa * n[3 * a + 2] + bu * n[3 * b + 2] + bv * n[3 * c + 2];
    const size = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (!(size > 1e-12)) return;
    nx /= size;
    ny /= size;
    nz /= size;
    hit.aheadNormalX = nx;
    hit.aheadNormalY = ny;
    hit.aheadNormalZ = nz;
    hit.aheadDepth = best * Math.abs(nx * rx + nz * rz);
    hit.aheadX = x + best * rx;
    hit.aheadZ = z + best * rz;
    const { wall } = loft;
    hit.aheadAlong = wall ? wa * wall.along[a] + bu * wall.along[b] + bv * wall.along[c] : Number.NaN;
    hit.aheadUp = wall ? wa * wall.up[a] + bu * wall.up[b] + bv * wall.up[c] : Number.NaN;
    if (wall?.seam) hit.aheadSeam = wa * wall.seam[a] + bu * wall.seam[b] + bv * wall.seam[c];
    // The face ahead's share: 1 where it is nearer by the blend, 0 where the crossing above is, smoothstep between.
    const share = Math.min(1, Math.max(0, 0.5 + (hit.verticalDepth - hit.aheadDepth) / (2 * NEAREST.blend)));
    const near = Math.min(1, (reach - best) / NEAREST.fade);
    hit.aheadWeight = share * share * (3 - 2 * share) * near * near * (3 - 2 * near);
    hit.normalDepth = hit.verticalDepth + hit.aheadWeight * (hit.aheadDepth - hit.verticalDepth);
  }

  /** The lowest crossing at (x, z): the face; NaN where the loft is not. */
  floorAt(x: number, z: number): number {
    return this.strip(x, z) < 0 ? Number.NaN : this.ys[0];
  }

  /**
   * Answers-only ordinary guide: the nearest geometrically reachable mature mouth, preserving a preferred front
   * while one remains usable. The private loft never escapes; returned points/scalars belong to this generation.
   * Calling this is opt-in. Physics queries and their normal/bucket preparation are unchanged.
   */
  approachNear(request: TubeApproachRequest, observation?: TubeApproachObservation): TubeApproachCue | undefined {
    const loft = this.last;
    if (observation) Object.assign(observation, createTubeApproachObservation(request, this.geometryStep));
    // Any tube shape (the cases' own frames since 2026-10-22, or the `?tubeShape=c` A/B): the mouth is the lip landmark.
    if (!loft || !validTubeApproachRequest(request)) {
      if (observation) observation.outcome = !loft ? 'no-contact-loft' : 'invalid-request';
      return undefined;
    }
    const p = loft.positions, candidates: { strip: number; fraction: number; distance: number; preferred: boolean;
      capX?: number; capZ?: number; capSigma?: number; capFrontId?: number }[] = [];
    const reachSquared = (request.reach ?? 15) ** 2;
    for (let strip = 0; strip + 1 < loft.sliceCount; strip++) {
      if (loft.sliceJoined[strip] !== 1 || loft.sliceFront[strip] !== loft.sliceFront[strip + 1]
        || loft.slicePhase[strip] !== 1 || loft.slicePhase[strip + 1] !== 1
        || !(loft.sliceWeight[strip] > 0 && loft.sliceWeight[strip + 1] > 0)) continue;
      if (observation) observation.eligibleMaturePairs++;
      const a = 3 * (strip * S + E + LANDMARK.lip), b = a + 3 * S;
      const dx = p[b] - p[a], dz = p[b + 2] - p[a + 2], span = dx * dx + dz * dz;
      if (!(span > 0)) continue;
      if (observation) observation.nondegenerateMatureCapSegments++;
      const fraction = Math.max(0, Math.min(1, ((request.x - p[a]) * dx + (request.z - p[a + 2]) * dz) / span));
      const capX = p[a] + fraction * dx, capZ = p[a + 2] + fraction * dz;
      const distance = (capX - request.x) ** 2 + (capZ - request.z) ** 2;
      if (observation && distance < (observation.nearestEligibleCap?.distanceSquared ?? Infinity)) {
        observation.nearestEligibleCap = writeCapObservation(observation.nearestEligibleCap, loft.sliceFront[strip], strip, fraction,
          loft.sliceSigma[strip] + fraction * (loft.sliceSigma[strip + 1] - loft.sliceSigma[strip]), capX, capZ, distance,
          loft.sliceFront[strip] === request.preferredFront);
      }
      if (distance <= reachSquared) {
        const candidate: typeof candidates[number] = { strip, fraction, distance, preferred: loft.sliceFront[strip] === request.preferredFront };
        if (observation) {
          candidate.capX = capX; candidate.capZ = capZ; candidate.capFrontId = loft.sliceFront[strip];
          candidate.capSigma = loft.sliceSigma[strip] + fraction * (loft.sliceSigma[strip + 1] - loft.sliceSigma[strip]);
        }
        candidates.push(candidate);
      }
    }
    if (observation) observation.candidatesInReach = candidates.length;
    if (candidates.length === 0) {
      if (observation) observation.outcome = observation.nondegenerateMatureCapSegments === 0
        ? 'no-eligible-mature-cap-segment' : 'no-eligible-mature-cap-segment-in-reach';
      return undefined;
    }
    candidates.sort((a, b) => Number(b.preferred) - Number(a.preferred) || a.distance - b.distance || a.strip - b.strip);
    // One actual-index selection serves all nearby candidates. This bound contains every candidate's translated
    // finite envelope in any ray frame, plus the supplied current world body. XZ needs no deferred Y preparation.
    let extent = Math.hypot(request.halfWidth, request.halfDepth);
    for (const body of request.body) extent = Math.max(extent, Math.hypot(body.x - request.x, body.z - request.z) + body.radius);
    const radius = (request.reach ?? 15) + 3 * extent + 0.55;
    const xMin = request.x - radius, xMax = request.x + radius, zMin = request.z - radius, zMax = request.z + radius;
    const triangleOffsets: number[] = [];
    for (let i = 0; i + 2 < loft.indexCount; i += 3) {
      const a = loft.indices[i], b = loft.indices[i + 1], c = loft.indices[i + 2];
      if (Math.max(a, b, c) >= loft.vertexCount) {
        if (observation) observation.outcome = 'invalid-indexed-geometry';
        return undefined;
      }
      if (Math.max(p[3 * a], p[3 * b], p[3 * c]) < xMin || Math.min(p[3 * a], p[3 * b], p[3 * c]) > xMax
        || Math.max(p[3 * a + 2], p[3 * b + 2], p[3 * c + 2]) < zMin || Math.min(p[3 * a + 2], p[3 * b + 2], p[3 * c + 2]) > zMax) continue;
      triangleOffsets.push(i);
    }
    const endpoints = new Set<number>();
    const routeObservation: TubeRouteObservation | undefined = observation ? { columnCalls: 0, clearRouteCalls: 0 } : undefined;
    let capObservation: TubeCapProjectionObservation | undefined;
    if (observation) observation.outcome = 'all-existing-route-attempts-rejected';
    for (const candidate of candidates) {
      // Adjacent mature strips can project to exactly the same stored cap row. Their run, ray and route coincide;
      // other stations, even very close ones, remain distinct and are never hidden by coarse spatial deduplication.
      const endpoint = candidate.fraction === 0 ? candidate.strip : candidate.fraction === 1 ? candidate.strip + 1 : undefined;
      if (endpoint !== undefined) {
        if (endpoints.has(endpoint)) {
          if (observation) observation.endpointDuplicatesSkipped++;
          continue;
        }
        endpoints.add(endpoint);
      }
      if (observation) {
        observation.routesAttempted++;
        capObservation = writeCapObservation(capObservation, candidate.capFrontId!, candidate.strip, candidate.fraction,
          candidate.capSigma!, candidate.capX!, candidate.capZ!, candidate.distance, candidate.preferred);
      }
      const cue = routeForStrip(loft, candidate.strip, candidate.fraction, request, this.geometryStep, this.prepareRow, triangleOffsets, routeObservation);
      if (observation) {
        observation.columnCalls += routeObservation!.columnCalls; observation.clearRouteCalls += routeObservation!.clearRouteCalls;
        if (!observation.firstAttempt) observation.firstAttempt = writeAttemptObservation(undefined, routeObservation!, capObservation!);
        if (!cue) {
          const rejection = routeObservation!.rejection;
          if (rejection) observation.rejectionCounts[rejection] = (observation.rejectionCounts[rejection] ?? 0) + 1;
          if (candidate.distance < (observation.nearestRejectedAttempt?.cap.distanceSquared ?? Infinity))
            observation.nearestRejectedAttempt = writeAttemptObservation(observation.nearestRejectedAttempt, routeObservation!, capObservation!);
        }
      }
      if (cue) {
        if (observation) {
          observation.outcome = 'accepted';
          observation.accepted = { cap: { ...capObservation! }, bodyFitsMouth: cue.bodyFitsMouth, bodyInCavity: cue.bodyInCavity,
            mouthDistanceSquared: (cue.mouth.x - request.x) ** 2 + (cue.mouth.z - request.z) ** 2 };
        }
        return cue;
      }
    }
    return undefined;
  }

  /**
   * The strip (joined slices s → s + 1) whose rays bracket (x, z) half-open (on ray s, off ray s + 1) and that a
   * vertical line there crosses, its crossings sorted up in `ys`; −1 if none. The first front's strip wins.
   */
  private strip(x: number, z: number): number {
    const loft = this.last;
    if (!loft || this.nx === 0) return -1;
    const cx = Math.floor((x - this.x0) / CONTACT.cell);
    const cz = Math.floor((z - this.z0) / CONTACT.cell);
    if (cx < 0 || cz < 0 || cx >= this.nx || cz >= this.nz) return -1;
    const cell = cz * this.nx + cx;
    const p = loft.positions;
    for (let k = this.cellStart[cell]; k < this.cellStart[cell + 1]; k += 1) {
      const s = this.cellStrips[k];
      const a = s * S;
      const b = a + S;
      const sideA = (x - p[3 * a]) * loft.sliceRayZ[s] - (z - p[3 * a + 2]) * loft.sliceRayX[s];
      if (sideA < 0) continue;
      const sideB = (x - p[3 * b]) * loft.sliceRayZ[s + 1] - (z - p[3 * b + 2]) * loft.sliceRayX[s + 1];
      if (sideB >= 0) continue;
      // A C closure's exact zero-weight ray is ordinary water. Test before the triangle tie nudge;
      // positive interiors of a ghost-to-live strip still use their actual indexed crossings.
      const fraction = sideA - sideB > 0 ? sideA / (sideA - sideB) : 0;
      if (this.boundedC && !(loft.sliceWeight[s] + fraction * (loft.sliceWeight[s + 1] - loft.sliceWeight[s]) > 0)) continue;
      // On ray s itself, the strip owns the point, but its edges along the ray are shared with the strip before, whose
      // triangles' ties may take them: step a nanometre into the strip, along its tangent, so its own triangles do.
      const nudge = sideA === 0 ? NUDGE : 0;
      if (this.crossings(loft, s, x + nudge * loft.sliceRayZ[s], z - nudge * loft.sliceRayX[s]) > 0) {
        this.sideA = sideA;
        this.sideB = sideB;
        this.found = k;
        return s;
      }
    }
    return -1;
  }

  /** Whether a strip of another front later in the found strip's cell also holds (x, z): fronts overlapping there. */
  private heldByAnother(loft: LoftResult, strip: number, x: number, z: number): boolean {
    const cell = Math.floor((z - this.z0) / CONTACT.cell) * this.nx + Math.floor((x - this.x0) / CONTACT.cell);
    const p = loft.positions;
    for (let k = this.found + 1; k < this.cellStart[cell + 1]; k += 1) {
      const s = this.cellStrips[k];
      if (loft.sliceFront[s] === loft.sliceFront[strip]) continue;
      const a = s * S;
      const b = a + S;
      const sideA = (x - p[3 * a]) * loft.sliceRayZ[s] - (z - p[3 * a + 2]) * loft.sliceRayX[s];
      if (sideA < 0) continue;
      const sideB = (x - p[3 * b]) * loft.sliceRayZ[s + 1] - (z - p[3 * b + 2]) * loft.sliceRayX[s + 1];
      if (sideB >= 0) continue;
      const fraction = sideA - sideB > 0 ? sideA / (sideA - sideB) : 0;
      if (this.boundedC && !(loft.sliceWeight[s] + fraction * (loft.sliceWeight[s + 1] - loft.sliceWeight[s]) > 0)) continue;
      const q = (x - p[3 * a]) * loft.sliceRayX[s] + (z - p[3 * a + 2]) * loft.sliceRayZ[s];
      this.ensureBucket(s);
      const bucket = Math.floor((q - this.stripLow[s]) / this.bucket);
      if (!(bucket >= 0 && bucket < this.stripBuckets[s])) continue;
      const first = this.stripFirst[s] + bucket;
      for (let e = this.bucketStart[first]; e < this.bucketStart[first + 1]; e += 1) {
        const j = this.bucketQuads[e];
        if (q < this.quadLow[s * Q + j] || q > this.quadHigh[s * Q + j]) continue;
        const t = this.stripIndex[s] + 6 * j, indices = loft.indices;
        if (this.meets(p, indices[t], indices[t + 1], indices[t + 2], x, z)
          || this.meets(p, indices[t + 3], indices[t + 4], indices[t + 5], x, z)) return true;
      }
    }
    return false;
  }

  /** Whether the vertical line at (x, z) meets triangle (a, b, c), by `triangle`'s rules, recording nothing. */
  private meets(p: Float32Array, a: number, b: number, c: number, x: number, z: number): boolean {
    const area = this.edge(p, a, b, p[3 * c], p[3 * c + 2]);
    if (area === 0) return false;
    const sign = area > 0 ? 1 : -1;
    return this.inside(this.edge(p, b, c, x, z), b, c, sign) && this.inside(this.edge(p, c, a, x, z), c, a, sign)
      && this.inside(this.edge(p, a, b, x, z), a, b, sign);
  }

  /** The strip's crossings with the vertical line at (x, z), sorted up; how many. */
  private crossings(loft: LoftResult, s: number, x: number, z: number): number {
    const p = loft.positions;
    const o = s * S;
    const q = (x - p[3 * o]) * loft.sliceRayX[s] + (z - p[3 * o + 2]) * loft.sliceRayZ[s];
    this.count = 0;
    this.ensureBucket(s);
    // Only the quads whose range along the ray holds q can be crossed: its bucket's (floor keeps a range's order, so a
    // quad holding q is always in q's bucket).
    const b = Math.floor((q - this.stripLow[s]) / this.bucket);
    if (!(b >= 0 && b < this.stripBuckets[s])) return 0;
    // XZ-only misses and holding tests need no height. Every triangle below can read these two final Y rows.
    this.prepareRow?.(s);
    this.prepareRow?.(s + 1);
    const k = this.stripFirst[s] + b;
    const end = this.bucketStart[k + 1];
    this.stats.quads += end - this.bucketStart[k];
    const base = s * Q;
    for (let e = this.bucketStart[k]; e < end; e += 1) {
      const j = this.bucketQuads[e];
      // Along slice s's ray, the quad's projection spans its vertices' (a linear map keeps a point inside them), widened
      // past their rounding (SLACK).
      if (q < this.quadLow[base + j] || q > this.quadHigh[base + j]) continue;
      const t = this.stripIndex[s] + 6 * j, indices = loft.indices;
      this.triangle(p, indices[t], indices[t + 1], indices[t + 2], x, z);
      this.triangle(p, indices[t + 3], indices[t + 4], indices[t + 5], x, z);
    }
    // Insertion sort, keeping each crossing's triangle and weights with its y.
    const { ys, at, weights } = this;
    for (let i = 1; i < this.count; i += 1) {
      for (let k = i; k > 0 && ys[k - 1] > ys[k]; k -= 1) {
        const y = ys[k];
        ys[k] = ys[k - 1];
        ys[k - 1] = y;
        for (let m = 0; m < 3; m += 1) {
          const t = at[3 * k + m];
          at[3 * k + m] = at[3 * k - 3 + m];
          at[3 * k - 3 + m] = t;
          const w = weights[3 * k + m];
          weights[3 * k + m] = weights[3 * k - 3 + m];
          weights[3 * k - 3 + m] = w;
        }
      }
    }
    return this.count;
  }

  /**
   * Whether the vertical line at (x, z) meets triangle (a, b, c), by edge functions computed with each edge's lower
   * vertex first, so neighbours see exactly opposite values; a zero counts for the triangle whose winding runs the
   * edge from its lower vertex when its area is positive (from its higher when negative), so an edge two neighbours
   * share counts once, and a fold's both or neither.
   */
  private triangle(p: Float32Array, a: number, b: number, c: number, x: number, z: number): void {
    const area = this.edge(p, a, b, p[3 * c], p[3 * c + 2]);
    if (area === 0 || this.count >= CONTACT.crossings) return;
    const sign = area > 0 ? 1 : -1;
    const wa = this.edge(p, b, c, x, z);
    if (!this.inside(wa, b, c, sign)) return;
    const wb = this.edge(p, c, a, x, z);
    if (!this.inside(wb, c, a, sign)) return;
    const wc = this.edge(p, a, b, x, z);
    if (!this.inside(wc, a, b, sign)) return;
    const k = this.count;
    this.ys[k] = (wa * p[3 * a + 1] + wb * p[3 * b + 1] + wc * p[3 * c + 1]) / area;
    this.at[3 * k] = a;
    this.at[3 * k + 1] = b;
    this.at[3 * k + 2] = c;
    this.weights[3 * k] = wa / area;
    this.weights[3 * k + 1] = wb / area;
    this.weights[3 * k + 2] = wc / area;
    this.count += 1;
  }

  /** (v − u) × (point − u) in xz, computed from the lower-numbered vertex so (u, v) and (v, u) differ only in sign. */
  private edge(p: Float32Array, u: number, v: number, x: number, z: number): number {
    const lo = u < v ? u : v;
    const hi = u < v ? v : u;
    const value = (p[3 * hi] - p[3 * lo]) * (z - p[3 * lo + 2]) - (p[3 * hi + 2] - p[3 * lo + 2]) * (x - p[3 * lo]);
    return u < v ? value : -value;
  }

  private inside(value: number, u: number, v: number, sign: number): boolean {
    return value * sign > 0 || (value === 0 && (sign > 0) === (u < v));
  }

  /** The crossing's normal: the loft's vertex normals by its weights, normalised. */
  private normalAt(loft: LoftResult, k: number, hit: ContactHit): void {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let m = 0; m < 3; m += 1) {
      const v = this.at[3 * k + m];
      const w = this.weights[3 * k + m];
      this.prepareNormal?.(v);
      nx += w * loft.normals[3 * v];
      ny += w * loft.normals[3 * v + 1];
      nz += w * loft.normals[3 * v + 2];
    }
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    hit.normalX = length > 1e-12 ? nx / length : 0;
    hit.normalY = length > 1e-12 ? ny / length : 1;
    hit.normalZ = length > 1e-12 ? nz / length : 0;
  }

  /** The crossing's place along the loft's samples (its vertices' column indices by its weights). */
  private profileIndex(k: number): number {
    let index = 0;
    for (let m = 0; m < 3; m += 1) index += this.weights[3 * k + m] * (this.at[3 * k + m] % S);
    return index;
  }

  /** Bucket each strip into the grid cells its xz box touches (counting sort). */
  private index(loft: LoftResult, minX: number, minZ: number, maxX: number, maxZ: number): void {
    let strips = 0;
    for (let s = 0; s + 1 < loft.sliceCount; s += 1) if (loft.sliceJoined[s] === 1) strips += 1;
    if (strips === 0) {
      this.nx = 0;
      return;
    }
    this.x0 = minX;
    this.z0 = minZ;
    this.nx = Math.floor((maxX - minX) / CONTACT.cell) + 1;
    this.nz = Math.floor((maxZ - minZ) / CONTACT.cell) + 1;
    const cells = this.nx * this.nz;
    if (this.cellStart.length < cells + 1) {
      this.cellStart = new Int32Array(cells + 1);
      this.cellFill = new Int32Array(cells);
    }
    this.cellStart.fill(0, 0, cells + 1);
    const p = loft.positions;
    const { boxes } = this;
    for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
      if (loft.sliceJoined[s] !== 1) continue;
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (let v = s * S; v < (s + 2) * S; v += 1) {
        x0 = Math.min(x0, p[3 * v]);
        x1 = Math.max(x1, p[3 * v]);
        z0 = Math.min(z0, p[3 * v + 2]);
        z1 = Math.max(z1, p[3 * v + 2]);
      }
      boxes[4 * s] = Math.floor((x0 - this.x0) / CONTACT.cell);
      boxes[4 * s + 1] = Math.floor((x1 - this.x0) / CONTACT.cell);
      boxes[4 * s + 2] = Math.floor((z0 - this.z0) / CONTACT.cell);
      boxes[4 * s + 3] = Math.floor((z1 - this.z0) / CONTACT.cell);
      for (let cz = boxes[4 * s + 2]; cz <= boxes[4 * s + 3]; cz += 1) {
        for (let cx = boxes[4 * s]; cx <= boxes[4 * s + 1]; cx += 1) this.cellStart[cz * this.nx + cx + 1] += 1;
      }
    }
    for (let k = 0; k < cells; k += 1) this.cellStart[k + 1] += this.cellStart[k];
    if (this.cellStrips.length < this.cellStart[cells]) this.cellStrips = new Int32Array(this.cellStart[cells]);
    const fill = this.cellFill;
    fill.set(this.cellStart.subarray(0, cells));
    for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
      if (loft.sliceJoined[s] !== 1) continue;
      for (let cz = boxes[4 * s + 2]; cz <= boxes[4 * s + 3]; cz += 1) {
        for (let cx = boxes[4 * s]; cx <= boxes[4 * s + 1]; cx += 1) this.cellStrips[fill[cz * this.nx + cx]++] = s;
      }
    }
  }

  /**
   * A strip's quads by their captured range along its ray (the advisor, 2026-09-30): the strip's range in `bucket`-wide
   * buckets from its least, each quad in every bucket its range touches, in column order (counting sort). Only the
   * projections captured by update are read, retaining the eager ranges even if the public loft is later mutated.
   */
  private ensureBucket(s: number): void {
    if (this.stripReady[s] === 1) return;
    const { own, prior, quadLow, quadHigh, bucket, quadFrom, quadTo } = this;
    const buckets = this.nextBucket;
    const entries = this.nextEntry;
    const o = s * S;
    const base = s * Q;
    let low = Infinity;
    let high = -Infinity;
    for (let j = 0; j < Q; j += 1) {
      const v00 = o + j;
      const v10 = v00 + S;
      const a = own[v00];
      const b = own[v00 + 1];
      const c = prior[v10];
      const d = prior[v10 + 1];
      let lo = a < b ? a : b;
      let hi = a < b ? b : a;
      if (c < lo) lo = c;
      if (c > hi) hi = c;
      if (d < lo) lo = d;
      if (d > hi) hi = d;
      lo -= SLACK;
      hi += SLACK;
      quadLow[base + j] = lo;
      quadHigh[base + j] = hi;
      if (lo < low) low = lo;
      if (hi > high) high = hi;
    }
    // Each quad's buckets, from the ranges as stored (the queries compare against those).
    const lowStored = Math.fround(low);
    let n = 1;
    for (let j = 0; j < Q; j += 1) {
      const from = Math.floor((quadLow[base + j] - lowStored) / bucket);
      const to = Math.floor((quadHigh[base + j] - lowStored) / bucket);
      quadFrom[j] = from;
      quadTo[j] = to;
      if (to + 1 > n) n = to + 1;
    }
    this.stripLow[s] = lowStored;
    this.stripBuckets[s] = n;
    this.stripFirst[s] = buckets;
    if (this.bucketStart.length < buckets + n + 1) {
      const grown = new Int32Array(2 * (buckets + n + 1));
      for (let k = 0; k <= buckets; k += 1) grown[k] = this.bucketStart[k];
      this.bucketStart = grown;
    }
    const start = this.bucketStart;
    for (let k = buckets + 1; k <= buckets + n; k += 1) start[k] = 0;
    start[buckets] = entries;
    for (let j = 0; j < Q; j += 1) for (let k = quadFrom[j]; k <= quadTo[j]; k += 1) start[buckets + k + 1] += 1;
    for (let k = 0; k < n; k += 1) start[buckets + k + 1] += start[buckets + k];
    const total = start[buckets + n];
    if (this.bucketQuads.length < total) {
      const grown = new Uint8Array(2 * total);
      for (let k = 0; k < entries; k += 1) grown[k] = this.bucketQuads[k];
      this.bucketQuads = grown;
    }
    if (this.bucketFill.length < n) this.bucketFill = new Int32Array(2 * n);
    const fill = this.bucketFill;
    for (let k = 0; k < n; k += 1) fill[k] = start[buckets + k];
    const quads = this.bucketQuads;
    for (let j = 0; j < Q; j += 1) for (let k = quadFrom[j]; k <= quadTo[j]; k += 1) quads[fill[k]++] = j;
    this.nextBucket = buckets + n;
    this.nextEntry = total;
    this.stripReady[s] = 1;
  }
}
