import { LOFT_SAMPLES, type LoftResult } from '../../wave/barrel/sweptLoft';

interface Strip {
  front: number;
  minX: number; maxX: number; minZ: number; maxZ: number;
  ranges: [number, number][];
}

/**
 * Water/air in the actual drawn loft, independent of contact flow. The renderer owns the mutable loft and must
 * prepare with a new stamp immediately after rebuilding it, before querying. Display repeats reuse the preparation
 * and the latest camera answer; no historical geometry or mutable query result escapes this helper.
 */
export class BarrelWater {
  private loft?: LoftResult;
  private stamp: unknown;
  private prepared = false;
  private strips: Strip[] = [];
  private readonly crossings: number[] = [];
  private previous?: { x: number; y: number; z: number; margin: number; result: boolean | undefined };
  /**
   * The strips in typed arrays (pool-barrel-perf, 2026-11-06), the same strips, boxes and triangle ranges in the same
   * order as `Strip`'s, without an object, a map entry or an array per strip and range: each strip's front and box (min x,
   * max x, min z, max z), its ranges as a list (first triangle index, end, next range; −1 ends it), and each slice's strip.
   */
  private stripCount = 0;
  private stripFront = new Int32Array(0);
  private stripBox = new Float64Array(0);
  private stripHead = new Int32Array(0);
  private stripTail = new Int32Array(0);
  private sliceStrip = new Int32Array(0);
  private rangeFirst = new Int32Array(0);
  private rangeEnd = new Int32Array(0);
  private rangeNext = new Int32Array(0);

  /** `mode` 'old': the strips as objects, as before pool-barrel-perf (the `?cameraWater=old` dev switch); the same answers. */
  constructor(private readonly mode: 'fast' | 'old' = 'fast') {}

  prepare(loft: LoftResult | undefined, stamp: unknown): void {
    if (this.prepared && this.loft === loft && Object.is(this.stamp, stamp)) return;
    this.prepared = true;
    this.loft = loft;
    this.stamp = stamp;
    this.previous = undefined;
    this.strips = [];
    this.stripCount = 0;
    if (!loft || loft.indexCount === 0) return;
    if (this.mode === 'fast') {
      this.prepareFast(loft);
      return;
    }
    const bySlice = new Map<number, Strip>();
    const p = loft.positions;
    for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
      if (loft.sliceJoined[s] !== 1) continue;
      const strip: Strip = { front: loft.sliceFront[s], minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, ranges: [] };
      for (let v = s * LOFT_SAMPLES; v < (s + 2) * LOFT_SAMPLES; v += 1) {
        strip.minX = Math.min(strip.minX, p[3 * v]); strip.maxX = Math.max(strip.maxX, p[3 * v]);
        strip.minZ = Math.min(strip.minZ, p[3 * v + 2]); strip.maxZ = Math.max(strip.maxZ, p[3 * v + 2]);
      }
      bySlice.set(s, strip);
      this.strips.push(strip);
    }
    // Retain ranges into the actual active index prefix, rather than reconstructing every possible profile quad.
    for (let i = 0; i + 2 < loft.indexCount; i += 3) {
      const a = loft.indices[i], b = loft.indices[i + 1], c = loft.indices[i + 2];
      if (a >= loft.vertexCount || b >= loft.vertexCount || c >= loft.vertexCount) continue;
      const first = Math.floor(Math.min(a, b, c) / LOFT_SAMPLES);
      const last = Math.floor(Math.max(a, b, c) / LOFT_SAMPLES);
      const strip = bySlice.get(first);
      if (!strip || last !== first + 1) continue;
      const prior = strip.ranges[strip.ranges.length - 1];
      if (prior && prior[1] === i) prior[1] = i + 3;
      else strip.ranges.push([i, i + 3]);
    }
  }

  /** `prepare`'s strips into the typed arrays: the same boxes (the same min and max of the same floats) and ranges. */
  private prepareFast(loft: LoftResult): void {
    const p = loft.positions;
    const slices = loft.sliceCount;
    if (this.sliceStrip.length < slices) {
      const size = Math.max(slices, 2 * this.sliceStrip.length);
      this.sliceStrip = new Int32Array(size);
      this.stripFront = new Int32Array(size);
      this.stripBox = new Float64Array(4 * size);
      this.stripHead = new Int32Array(size);
      this.stripTail = new Int32Array(size);
    }
    let strips = 0;
    for (let s = 0; s < slices; s += 1) {
      this.sliceStrip[s] = -1;
      if (s + 1 >= slices || loft.sliceJoined[s] !== 1) continue;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let v = s * LOFT_SAMPLES; v < (s + 2) * LOFT_SAMPLES; v += 1) {
        minX = Math.min(minX, p[3 * v]); maxX = Math.max(maxX, p[3 * v]);
        minZ = Math.min(minZ, p[3 * v + 2]); maxZ = Math.max(maxZ, p[3 * v + 2]);
      }
      const box = 4 * strips;
      this.stripBox[box] = minX; this.stripBox[box + 1] = maxX; this.stripBox[box + 2] = minZ; this.stripBox[box + 3] = maxZ;
      this.stripFront[strips] = loft.sliceFront[s];
      this.stripHead[strips] = -1;
      this.stripTail[strips] = -1;
      this.sliceStrip[s] = strips;
      strips += 1;
    }
    this.stripCount = strips;
    let ranges = 0;
    for (let i = 0; i + 2 < loft.indexCount; i += 3) {
      const a = loft.indices[i], b = loft.indices[i + 1], c = loft.indices[i + 2];
      if (a >= loft.vertexCount || b >= loft.vertexCount || c >= loft.vertexCount) continue;
      const first = Math.floor(Math.min(a, b, c) / LOFT_SAMPLES);
      const last = Math.floor(Math.max(a, b, c) / LOFT_SAMPLES);
      const strip = this.sliceStrip[first];
      if (strip < 0 || last !== first + 1) continue;
      const tail = this.stripTail[strip];
      if (tail >= 0 && this.rangeEnd[tail] === i) {
        this.rangeEnd[tail] = i + 3;
        continue;
      }
      if (ranges >= this.rangeFirst.length) {
        const size = Math.max(64, 2 * this.rangeFirst.length);
        const grow = (old: Int32Array) => { const next = new Int32Array(size); next.set(old); return next; };
        this.rangeFirst = grow(this.rangeFirst);
        this.rangeEnd = grow(this.rangeEnd);
        this.rangeNext = grow(this.rangeNext);
      }
      this.rangeFirst[ranges] = i;
      this.rangeEnd[ranges] = i + 3;
      this.rangeNext[ranges] = -1;
      if (tail >= 0) this.rangeNext[tail] = ranges;
      else this.stripHead[strip] = ranges;
      this.stripTail[strip] = ranges;
      ranges += 1;
    }
  }

  /** Undefined means the ordinary height field must answer: outside the drawn footprint or an unclosed column. */
  query(x: number, y: number, z: number, margin = 0): boolean | undefined {
    const previous = this.previous;
    if (previous && Object.is(previous.x, x) && Object.is(previous.y, y) && Object.is(previous.z, z) && Object.is(previous.margin, margin)) {
      return previous.result;
    }
    const result = this.classify(x, y, z, margin);
    this.previous = { x, y, z, margin, result };
    return result;
  }

  private classify(x: number, y: number, z: number, margin: number): boolean | undefined {
    const loft = this.loft;
    if (!loft || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(margin)) return undefined;
    const p = loft.positions;
    const ys = this.crossings;
    ys.length = 0;
    let front: number | undefined;
    if (this.mode === 'fast') {
      for (let k = 0; k < this.stripCount; k += 1) {
        const stripFront = this.stripFront[k];
        if (front !== undefined && stripFront !== front) break;
        const box = 4 * k;
        if (x < this.stripBox[box] || x > this.stripBox[box + 1] || z < this.stripBox[box + 2] || z > this.stripBox[box + 3]) continue;
        const before = ys.length;
        for (let r = this.stripHead[k]; r >= 0; r = this.rangeNext[r]) {
          for (let i = this.rangeFirst[r]; i < this.rangeEnd[r]; i += 3) {
            const crossing = this.triangle(p, loft.indices[i], loft.indices[i + 1], loft.indices[i + 2], x, z);
            if (crossing !== undefined) ys.push(crossing);
          }
        }
        if (ys.length > before && front === undefined) front = stripFront;
      }
    }
    for (const strip of this.strips) {
      if (front !== undefined && strip.front !== front) break;
      if (x < strip.minX || x > strip.maxX || z < strip.minZ || z > strip.maxZ) continue;
      const before = ys.length;
      for (const [first, last] of strip.ranges) {
        for (let i = first; i < last; i += 3) {
          const crossing = this.triangle(p, loft.indices[i], loft.indices[i + 1], loft.indices[i + 2], x, z);
          if (crossing !== undefined) ys.push(crossing);
        }
      }
      if (ys.length > before && front === undefined) front = strip.front;
    }
    // A closed column reaches water below its lowest crossing. Even parity there means a missing floor or a fold.
    if (ys.length === 0 || (ys.length & 1) === 0 || !ys.every(Number.isFinite)) return undefined;
    ys.sort((a, b) => a - b);
    let above = 0;
    for (const crossing of ys) if (crossing > y) above += 1;
    if ((above & 1) === 0) return false;
    // First determine water membership. Moving an air query upward by the margin could otherwise put it in the roof.
    return ys[ys.length - above] - y > margin;
  }

  /** Same half-open shared-edge rule as sweptContact; a fold's coincident crossings count in both or neither. */
  private triangle(p: Float32Array, a: number, b: number, c: number, x: number, z: number): number | undefined {
    const area = this.edge(p, a, b, p[3 * c], p[3 * c + 2]);
    if (area === 0) return undefined;
    const sign = area > 0 ? 1 : -1;
    const wa = this.edge(p, b, c, x, z);
    if (!this.inside(wa, b, c, sign)) return undefined;
    const wb = this.edge(p, c, a, x, z);
    if (!this.inside(wb, c, a, sign)) return undefined;
    const wc = this.edge(p, a, b, x, z);
    if (!this.inside(wc, a, b, sign)) return undefined;
    return (wa * p[3 * a + 1] + wb * p[3 * b + 1] + wc * p[3 * c + 1]) / area;
  }

  private edge(p: Float32Array, u: number, v: number, x: number, z: number): number {
    const lo = Math.min(u, v), hi = Math.max(u, v);
    const value = (p[3 * hi] - p[3 * lo]) * (z - p[3 * lo + 2]) - (p[3 * hi + 2] - p[3 * lo + 2]) * (x - p[3 * lo]);
    return u < v ? value : -value;
  }

  private inside(value: number, u: number, v: number, sign: number): boolean {
    return value * sign > 0 || (value === 0 && (sign > 0) === (u < v));
  }
}
