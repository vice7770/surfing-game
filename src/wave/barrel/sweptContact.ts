import { LANDMARK, type ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';

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
}

export function createContactHit(): ContactHit {
  return {
    inWater: false, surfaceY: Number.NaN, normalX: 0, normalY: 1, normalZ: 0, floorY: Number.NaN, waterFloorY: Number.NaN,
    ceilingY: Number.NaN, ceilingTopY: Number.NaN, lipShare: 0, lipVX: 0, lipVY: 0, lipVZ: 0, lipWeight: 0, tangentX: 1, tangentZ: 0,
    life: Number.NaN,
  };
}

const S = LOFT_SAMPLES;
/** Quads a strip has: one fewer than a slice's samples. */
const Q = S - 1;
const E = LOFT.extensionSamples;
/** How far a point exactly on a slice's ray is moved into its strip, m: far above rounding at 100 m, far below a cell. */
const NUDGE = 1e-9;

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
 *   The buckets keep the quads in order, so the answers are exactly the full scan's.
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
  private readonly loft: SweptLoft;
  private readonly bucket: number;
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
  /** Per bucket, where its quads start in `bucketQuads` (the next bucket's start ends it); the quads' columns, in order. */
  private bucketStart = new Int32Array(1);
  private bucketQuads = new Uint8Array(0);
  private bucketFill = new Int32Array(0);
  /** One strip's crossings, sorted up: y, the triangle's vertices, and the barycentric weights. */
  private readonly ys = new Float64Array(CONTACT.crossings);
  private readonly at = new Int32Array(3 * CONTACT.crossings);
  private readonly weights = new Float64Array(3 * CONTACT.crossings);
  private count = 0;
  /** The found strip's sides of the point: off its first ray (≥ 0) and its second (< 0); and its place in its cell. */
  private sideA = 0;
  private sideB = 0;
  private found = 0;

  constructor(library: ProfileLibrary, slope: number, options: ContactOptions = {}) {
    this.loft = new SweptLoft(library, slope, { contact: true });
    this.bucket = options.bucket ?? CONTACT.bucket;
  }

  /** Loft the fronts over the water (`heightAt`, uncarved) and index the strips for this step's queries. */
  update(records: Float32Array, count: number, stillLevel: number, heightAt: (x: number, z: number) => number): void {
    const loft = this.loft.build(records, count, stillLevel, heightAt);
    this.last = loft;
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
      this.boxes = new Int32Array(4 * slices);
    }
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (let s = 0; s < sliceCount; s += 1) {
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
    this.bucketQuadsAlong(loft);
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
    this.stats.hits += 1;
    return true;
  }

  /** The lowest crossing at (x, z): the face; NaN where the loft is not. */
  floorAt(x: number, z: number): number {
    return this.strip(x, z) < 0 ? Number.NaN : this.ys[0];
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
      if ((x - p[3 * a]) * loft.sliceRayZ[s] - (z - p[3 * a + 2]) * loft.sliceRayX[s] < 0) continue;
      if ((x - p[3 * b]) * loft.sliceRayZ[s + 1] - (z - p[3 * b + 2]) * loft.sliceRayX[s + 1] >= 0) continue;
      const q = (x - p[3 * a]) * loft.sliceRayX[s] + (z - p[3 * a + 2]) * loft.sliceRayZ[s];
      const bucket = Math.floor((q - this.stripLow[s]) / this.bucket);
      if (!(bucket >= 0 && bucket < this.stripBuckets[s])) continue;
      const first = this.stripFirst[s] + bucket;
      for (let e = this.bucketStart[first]; e < this.bucketStart[first + 1]; e += 1) {
        const j = this.bucketQuads[e];
        if (q < this.quadLow[s * Q + j] || q > this.quadHigh[s * Q + j]) continue;
        const v00 = a + j;
        const v10 = v00 + S;
        if (this.meets(p, v00, v10, v00 + 1, x, z) || this.meets(p, v00 + 1, v10, v10 + 1, x, z)) return true;
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
    // Only the quads whose range along the ray holds q can be crossed: its bucket's (floor keeps a range's order, so a
    // quad holding q is always in q's bucket).
    const b = Math.floor((q - this.stripLow[s]) / this.bucket);
    if (!(b >= 0 && b < this.stripBuckets[s])) return 0;
    const k = this.stripFirst[s] + b;
    const end = this.bucketStart[k + 1];
    this.stats.quads += end - this.bucketStart[k];
    const base = s * Q;
    for (let e = this.bucketStart[k]; e < end; e += 1) {
      const j = this.bucketQuads[e];
      // Along slice s's ray, the quad's projection spans its vertices' (a linear map keeps a point inside them).
      if (q < this.quadLow[base + j] || q > this.quadHigh[base + j]) continue;
      const v00 = o + j;
      const v10 = v00 + S;
      // The drawn quad's two triangles, as the loft winds them.
      this.triangle(p, v00, v10, v00 + 1, x, z);
      this.triangle(p, v00 + 1, v10, v10 + 1, x, z);
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
   * Each strip's quads by their range along its ray (the advisor, 2026-09-30): the strip's range in `bucket`-wide
   * buckets from its least, each quad in every bucket its range touches, in column order (counting sort).
   */
  private bucketQuadsAlong(loft: LoftResult): void {
    const { own, prior, quadLow, quadHigh, bucket } = this;
    let buckets = 0;
    let entries = 0;
    for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
      if (loft.sliceJoined[s] !== 1) continue;
      const o = s * S;
      const base = s * Q;
      let low = Infinity;
      let high = -Infinity;
      for (let j = 0; j < Q; j += 1) {
        const v00 = o + j;
        const v10 = v00 + S;
        const lo = Math.min(own[v00], own[v00 + 1], prior[v10], prior[v10 + 1]);
        const hi = Math.max(own[v00], own[v00 + 1], prior[v10], prior[v10 + 1]);
        quadLow[base + j] = lo;
        quadHigh[base + j] = hi;
        low = Math.min(low, lo);
        high = Math.max(high, hi);
      }
      const n = Math.floor((high - low) / bucket) + 1;
      this.stripLow[s] = low;
      this.stripBuckets[s] = n;
      this.stripFirst[s] = buckets;
      if (this.bucketStart.length < buckets + n + 1) {
        const grown = new Int32Array(2 * (buckets + n + 1));
        grown.set(this.bucketStart.subarray(0, buckets + 1));
        this.bucketStart = grown;
      }
      const start = this.bucketStart;
      start.fill(0, buckets + 1, buckets + n + 1);
      start[buckets] = entries;
      for (let j = 0; j < Q; j += 1) {
        const from = Math.floor((quadLow[base + j] - low) / bucket);
        const to = Math.floor((quadHigh[base + j] - low) / bucket);
        for (let k = from; k <= to; k += 1) start[buckets + k + 1] += 1;
      }
      for (let k = 0; k < n; k += 1) start[buckets + k + 1] += start[buckets + k];
      const total = start[buckets + n];
      if (this.bucketQuads.length < total) {
        const grown = new Uint8Array(2 * total);
        grown.set(this.bucketQuads.subarray(0, entries));
        this.bucketQuads = grown;
      }
      if (this.bucketFill.length < n) this.bucketFill = new Int32Array(2 * n);
      const fill = this.bucketFill;
      fill.set(start.subarray(buckets, buckets + n));
      for (let j = 0; j < Q; j += 1) {
        const from = Math.floor((quadLow[base + j] - low) / bucket);
        const to = Math.floor((quadHigh[base + j] - low) / bucket);
        for (let k = from; k <= to; k += 1) this.bucketQuads[fill[k]++] = j;
      }
      buckets += n;
      entries = total;
    }
  }
}
