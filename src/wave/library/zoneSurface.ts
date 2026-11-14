import { boreAir, boreShape, boreWhite } from './boreFoam';
import { LANE, type LaneField, type SeaLevel } from './Handover';
import { CURVE, CURVE_STRIDE, LIFT } from './libraryLoft';
import { SLICE_LIFE, type FieldSlice, type SliceField } from './SliceField';
import { WAVE_LANDMARK, WAVE_POINTS } from './caseFormat';
import { FLOW_VALUES } from './WaveLibrary';

/**
 * C2 step 3 (docs/research/wave-strategy-alternatives/c2-plan.md §1, "A hybrid surface"; ruling 28 point 3): the
 * library's wave as the sea's own render nodes draw and feel it, and the curves its overturn's loft is built from.
 *
 * **The blend, in the crest's own frame** (the plan): while a slice comes in (and goes), its curve is
 * y(ξ) = (1 − a) y_sea(ξ) + a y_case(ξ), ξ from each one's own crest, the crest at (1 − a) x_sea + a x_case, a its
 * share (`SLICE_LIFE`), so the sea's crest (6.8 m/s) and the case's (6.0) never show as two. The case stands on its
 * slice's mean level.
 *
 * **The hybrid surface.** Where the blended curve is single-valued and not too steep for 1 m nodes (the wall, the trough,
 * the bore's top), its height is written into the render nodes: lane by lane on the lanes' stations, then onto each
 * node from the two lanes either side of it, linear across them. A node takes (1 − A) η_sea + B, A the lanes' weight
 * there (their frames' ends and the field's ends fade it, `EDGE`), B their weighted heights: outside every slice the
 * sea's own node exactly. The sea's mesh, light and foam draw it and `PhysicalSurfWater` feels the same nodes.
 * Where the curve overturns or stands steeper than `LIFT.bridge` (the lip and the tube), the nodes take a smooth
 * bridge under it (hidden), and the loft (`libraryLoft`) draws and is felt from the same curve, lifted off the nodes
 * from `LIFT.on`° (`CURVE`).
 *
 * The sea's drawn foam is held off a slice's water until its touchdown (`FOAM_HOLD`), and from its touchdown the
 * library's own bore foam comes in exactly as that hold goes out, so the two never add up to more than the slice's own
 * share (C2 step 5b, `boreFoam.ts`).
 */
export const EDGE = {
  /** A slice's frame fades into the sea over this much of its back and its front, m (smoothstep: height and slope continuous). */
  band: 3,
} as const;

/** The sea's drawn foam is held off a slice's water until its touchdown, and comes back over this long after it, s. */
export const FOAM_HOLD = 0.5;

/** Slices on neighbouring lanes are one run of the loft when they handed over within this share of a period. */
export const RUN_GAP = 0.25;

/**
 * A lifted run of the loft goes on this many lanes past its last lifted one, unlifted (on the water): all but the last
 * keep the seam mask whole, the last fades it, so where the mask is partial the loft lies on the water (`LIFT.pad`'s
 * rule across). Step 3b (ruling 32, point 6): two whole lanes before the fading one (step 3 had one); the mask's texture
 * reaches a node (1 m) past the triangles that set it, and the lanes are 0.5–1 m apart.
 */
export const PAD_LANES = 3;

/** The sea's crest is looked for where it was, carried on at this pace, m/s (a crest's on the pool's face). */
const SEA_CREST_PACE = 6;

/**
 * C2 step 4 (c2-step4.md): the water's speed from the library.
 * - `reach`: a sample is matched to the slice's curve only within this much of it along the lane, m (the overturn spans
 *   about 2 m; past this the slice's own frame weight is 0 anyway).
 * - `cap`: the material acceleration is capped at this size, m/s² (`BoardBody`'s `WATER_INERTIA.cap`, 5 g): one bad
 *   frame pair in a case must not throw a rider.
 */
export const FLOW = { reach: 4, cap: 5 * 9.81 } as const;

/** What `ZoneSurface.flowAt` writes: the library's own flow (x, y, z) and its material acceleration (x, y, z), m/s and m/s². */
export const FLOW_OUT = 6;

const smoothstep = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/** One shown slice this step: its composite's offset, its course to the loft's lift, its run and its lane's span. */
interface Picked {
  slice: FieldSlice;
  at: number;
  /** Its share of the surface this step (`SLICE_LIFE`'s blend, in and out), 0–1: the weight its water takes too. */
  share: number;
  /** Where its water stands in `flows` (−1 without velocity), and its two stored depths, m. */
  flow: number;
  depth0: number;
  depth1: number;
  /** The steepest segment, °, and whether the curve folds over. */
  steepest: number;
  overturned: boolean;
  /** Its tube's collapse after touchdown, 0–1 (`LIFT.collapse`): the loft lets go of it, the nodes bridge it. */
  collapse: number;
  /** Its raw lift (course × the field's end × the collapse's), its run, its taper along the run, and the loft's lift. */
  raw: number;
  chain: number;
  taper: number;
  lift: number;
  /** The bridge's weight in the nodes (`ZoneSurface.lane`): the lift, and 1 once the tube has collapsed. */
  bridge: number;
  /** The lifted span along its lane, m (from the lane's pass). */
  from: number;
  to: number;
}

/** The render grid the nodes are on (the snapshot's): its first node, spacing and counts. */
export interface NodeGrid { xMin: number; zMin: number; spacing: number; nx: number; nz: number }

export class ZoneSurface {
  /** Per lane × station: Σ w H, Σ w, and the foam hold, this step. */
  private readonly laneWH: Float64Array;
  private readonly laneW: Float64Array;
  private readonly laneF: Float64Array;
  /** C2 step 5b, per lane × station: Σ w × the bore's cover, Σ w × its void fraction, and Σ w where its foam is live. */
  private readonly laneC: Float64Array;
  private readonly laneA: Float64Array;
  private readonly laneCW: Float64Array;
  /** Per lane, the stations written this step (lo > hi: none). */
  private readonly laneLo: Int32Array;
  private readonly laneHi: Int32Array;
  /** The footprint's nodes and, per node, its lanes (k and k + 1), the share of k + 1, and its places along both. */
  private readonly nodes: Int32Array;
  private readonly nodeLane: Int32Array;
  private readonly nodeShare: Float64Array;
  private readonly nodeS0: Float64Array;
  private readonly nodeS1: Float64Array;
  /** Per render node: the lanes' weight A, their weighted height B, and the foam hold F (written in the footprint only). */
  readonly weight: Float64Array;
  readonly height: Float64Array;
  readonly hold: Float64Array;
  /** C2 step 5b, per render node: the bore's foam cover, its void fraction, and the weight those two came with. */
  readonly cover: Float64Array;
  readonly air: Float64Array;
  readonly aired: Float64Array;
  /** Footprint nodes written this step (their A, B, F are live; the rest are 0). */
  private readonly written: Int32Array;
  private writtenCount = 0;
  /** The overturn's curves this step (`CURVE`), for the contact here and the page's drawing. */
  readonly curves: Float32Array;
  curveCount = 0;
  /** Scratch: one slice's case curve and composite, and the sea along its lane. */
  private readonly caseCurve = new Float32Array(2 * WAVE_POINTS);
  private readonly crestOut = new Float64Array(2);
  private readonly sea: Float64Array;
  /** Per live slice this step, its composite (lane order kept), and what its loft needs. */
  private composites: Float64Array;
  private readonly picked: Picked[] = [];
  /**
   * C2 step 4: per shown slice, its water along its curve: per point and stored depth, (u along the ray, v up) m/s and
   * the material (Du/Dt, Dv/Dt) m/s². Empty where the cases hold no velocity (step 3's files).
   */
  private flows: Float64Array;
  private readonly flowScratch: Float64Array;
  private readonly motion = new Float64Array(2 * WAVE_POINTS);
  private readonly sliceDepths = new Float64Array(8);
  readonly depthCount: number;
  private readonly flowStride: number;
  /** Per lane, its first shown slice this step, and the next one on the same lane (a list over `picked`'s indices). */
  private readonly laneFirst: Int32Array;
  private laneNext: Int32Array;
  /** Slices whose water has been filled this step, and this step's time (the lazy fill). */
  private flowCount = 0;
  private time = Number.NaN;
  /** Scratch for one slice's stations: how often reached, whether steep, and the heights. */
  private hits = new Uint8Array(256);
  private steep = new Uint8Array(256);
  private heights = new Float64Array(256);
  private lows = new Float64Array(256);
  /** A step's diagnostics (the bars' probe reads them). */
  readonly stats = { slices: 0, shown: 0, lofted: 0, bridged: 0, nodes: 0, seaMissed: 0, steepest: 0 };

  constructor(readonly field: SliceField, readonly lanes: LaneField, readonly grid: NodeGrid, capacity = 300) {
    const n = lanes.count * lanes.stations;
    this.laneWH = new Float64Array(n);
    this.laneW = new Float64Array(n);
    this.laneF = new Float64Array(n);
    this.laneC = new Float64Array(n);
    this.laneA = new Float64Array(n);
    this.laneCW = new Float64Array(n);
    this.laneLo = new Int32Array(lanes.count).fill(1);
    this.laneHi = new Int32Array(lanes.count).fill(0);
    this.sea = new Float64Array(lanes.stations);
    this.composites = new Float64Array(2 * WAVE_POINTS * 64);
    this.depthCount = field.library.depthCount;
    this.flowStride = WAVE_POINTS * this.depthCount * FLOW_VALUES;
    this.flows = new Float64Array(this.flowStride * 64);
    this.flowScratch = new Float64Array(this.flowStride);
    this.laneFirst = new Int32Array(lanes.count).fill(-1);
    this.laneNext = new Int32Array(64).fill(-1);
    this.curves = new Float32Array(capacity * CURVE_STRIDE);
    const size = grid.nx * grid.nz;
    this.weight = new Float64Array(size);
    this.height = new Float64Array(size);
    this.hold = new Float64Array(size);
    this.cover = new Float64Array(size);
    this.air = new Float64Array(size);
    this.aired = new Float64Array(size);
    // The footprint: every node between the first and last lane, within their stations' reach.
    const found: number[] = [];
    const lane: number[] = [];
    const share: number[] = [];
    const s0: number[] = [];
    const s1: number[] = [];
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    const length = (lanes.stations - 1) * LANE.step;
    for (let k = 0; k < lanes.count; k += 1) {
      for (const s of [0, length]) {
        const x = lanes.baseX[k] + s * lanes.rayX[k];
        const z = lanes.baseZ[k] + s * lanes.rayZ[k];
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
      }
    }
    const side = (k: number, x: number, z: number) => (x - lanes.baseX[k]) * lanes.rayZ[k] - (z - lanes.baseZ[k]) * lanes.rayX[k];
    const i0 = Math.max(0, Math.floor((x0 - grid.xMin) / grid.spacing));
    const i1 = Math.min(grid.nx - 1, Math.ceil((x1 - grid.xMin) / grid.spacing));
    const j0 = Math.max(0, Math.floor((z0 - grid.zMin) / grid.spacing));
    const j1 = Math.min(grid.nz - 1, Math.ceil((z1 - grid.zMin) / grid.spacing));
    for (let j = j0; j <= j1 && lanes.count > 1; j += 1) {
      const z = grid.zMin + j * grid.spacing;
      for (let i = i0; i <= i1; i += 1) {
        const x = grid.xMin + i * grid.spacing;
        if (side(0, x, z) < 0 || side(lanes.count - 1, x, z) >= 0) continue;
        // The bracketing lanes: side ≥ 0 of k, < 0 of k + 1 (the fan never crosses in the zone).
        let lo = 0;
        let hi = lanes.count - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (side(mid, x, z) >= 0) lo = mid;
          else hi = mid;
        }
        const a = side(lo, x, z);
        const b = side(lo + 1, x, z);
        const sa = (x - lanes.baseX[lo]) * lanes.rayX[lo] + (z - lanes.baseZ[lo]) * lanes.rayZ[lo];
        const sb = (x - lanes.baseX[lo + 1]) * lanes.rayX[lo + 1] + (z - lanes.baseZ[lo + 1]) * lanes.rayZ[lo + 1];
        if (sa < 0 && sb < 0) continue;
        if (sa > length && sb > length) continue;
        found.push(j * grid.nx + i);
        lane.push(lo);
        share.push(a - b > 0 ? a / (a - b) : 0);
        s0.push(sa);
        s1.push(sb);
      }
    }
    // By lane pair, then along the lane: a step walks only the nodes within its pair's live stations.
    const order = found.map((_, n) => n).sort((a, b) => lane[a] - lane[b] || s0[a] - s0[b]);
    this.nodes = Int32Array.from(order, (n) => found[n]);
    this.nodeLane = Int32Array.from(order, (n) => lane[n]);
    this.nodeShare = Float64Array.from(order, (n) => share[n]);
    this.nodeS0 = Float64Array.from(order, (n) => s0[n]);
    this.nodeS1 = Float64Array.from(order, (n) => s1[n]);
    this.pairStart = new Int32Array(lanes.count + 1);
    for (const n of order) this.pairStart[lane[n] + 1] += 1;
    for (let k = 0; k < lanes.count; k += 1) this.pairStart[k + 1] += this.pairStart[k];
    // The most a node's place along lane k + 1 differs from its place along lane k, per pair (their bases differ).
    this.pairShift = new Float64Array(lanes.count);
    for (let n = 0; n < order.length; n += 1) {
      const k = this.nodeLane[n];
      this.pairShift[k] = Math.max(this.pairShift[k], Math.abs(this.nodeS1[n] - this.nodeS0[n]));
    }
    this.written = new Int32Array(found.length);
  }

  /** Per lane pair (k, k + 1), its first node in the footprint's order; and how far apart its two places along may be, m. */
  private readonly pairStart: Int32Array;
  private readonly pairShift: Float64Array;

  /** The footprint's node count (a diagnostic). */
  get footprint(): number {
    return this.nodes.length;
  }

  /** A render node's height: the sea's there, `sea`, and the library's over it. */
  at(node: number, sea: number): number {
    const a = this.weight[node];
    return a > 0 ? (1 - a) * sea + this.height[node] : sea;
  }

  /**
   * Every node written this step: its weight A, weighted height B, foam hold F, and (C2 step 5b) the bore's foam —
   * its weight, its weighted cover and its weighted void fraction.
   */
  forEachWritten(visit: (node: number, weight: number, height: number, hold: number, aired: number, cover: number, air: number) => void): void {
    for (let n = 0; n < this.writtenCount; n += 1) {
      const node = this.written[n];
      visit(node, this.weight[node], this.height[node], this.hold[node], this.aired[node], this.cover[node], this.air[node]);
    }
  }

  /** The lanes' weight A at (x, z), bilinear over the nodes (0 off the zone): how much of the surface there is the library's. */
  weightAt(x: number, z: number): number {
    const { grid } = this;
    const gx = (x - grid.xMin) / grid.spacing;
    const gz = (z - grid.zMin) / grid.spacing;
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    if (i < 0 || j < 0 || i + 1 >= grid.nx || j + 1 >= grid.nz) return 0;
    const tx = gx - i;
    const tz = gz - j;
    const o = j * grid.nx + i;
    const w = this.weight;
    return (w[o] * (1 - tx) + w[o + 1] * tx) * (1 - tz) + (w[o + grid.nx] * (1 - tx) + w[o + grid.nx + 1] * tx) * tz;
  }

  /** The render node at (x, z) (the grid's own places; −1 off it). */
  nodeAt(x: number, z: number): number {
    const { grid } = this;
    const i = Math.round((x - grid.xMin) / grid.spacing);
    const j = Math.round((z - grid.zMin) / grid.spacing);
    if (i < 0 || j < 0 || i >= grid.nx || j >= grid.nz) return -1;
    return j * grid.nx + i;
  }

  /** The library's surface at `time` s over the sea (`sea`, η over still water at a point): lanes, nodes and curves. */
  update(time: number, sea: SeaLevel): void {
    const { lanes, field } = this;
    const st = lanes.stations;
    // Clear last step's lanes and nodes.
    for (let k = 0; k < lanes.count; k += 1) {
      if (this.laneLo[k] <= this.laneHi[k]) {
        const o = k * st;
        this.laneWH.fill(0, o + this.laneLo[k], o + this.laneHi[k] + 1);
        this.laneW.fill(0, o + this.laneLo[k], o + this.laneHi[k] + 1);
        this.laneF.fill(0, o + this.laneLo[k], o + this.laneHi[k] + 1);
        this.laneC.fill(0, o + this.laneLo[k], o + this.laneHi[k] + 1);
        this.laneA.fill(0, o + this.laneLo[k], o + this.laneHi[k] + 1);
        this.laneCW.fill(0, o + this.laneLo[k], o + this.laneHi[k] + 1);
      }
      this.laneLo[k] = 1;
      this.laneHi[k] = 0;
    }
    for (let n = 0; n < this.writtenCount; n += 1) {
      const node = this.written[n];
      this.weight[node] = 0;
      this.height[node] = 0;
      this.hold[node] = 0;
      this.cover[node] = 0;
      this.air[node] = 0;
      this.aired[node] = 0;
    }
    this.writtenCount = 0;
    this.picked.length = 0;
    this.flowCount = 0;
    this.time = time;
    const stats = this.stats;
    stats.slices = 0; stats.shown = 0; stats.lofted = 0; stats.bridged = 0; stats.nodes = 0; stats.seaMissed = 0; stats.steepest = 0;
    let index = 0;
    for (const slice of field.slices()) {
      stats.slices += 1;
      if (time < slice.blendFrom) continue;
      const a = smoothstep((time - slice.blendFrom) / SLICE_LIFE.blend) * (1 - smoothstep((time - slice.goFrom) / SLICE_LIFE.blend));
      if (2 * WAVE_POINTS * (index + 1) > this.composites.length) {
        const grown = new Float64Array(2 * this.composites.length);
        grown.set(this.composites);
        this.composites = grown;
      }
      const at = 2 * WAVE_POINTS * index;
      this.composite(slice, time, a, sea, at);
      const shape = this.shape(at);
      if (!shape) continue;
      // Step 3b (ruling 32, point 7): the loft lifts the tube only, to its touchdown and over its collapse after.
      const collapse = smoothstep((time - slice.throwAt - slice.touchdown) / LIFT.collapse);
      const raw = smoothstep((shape.steepest - LIFT.on) / (LIFT.full - LIFT.on)) * slice.end * (1 - collapse);
      // C2 step 4: its water waits until something reads it (`fill`): −1 no velocity at all, −2 not filled yet.
      this.picked.push({
        slice, at, share: a, flow: this.depthCount > 0 ? -2 : -1, depth0: 0, depth1: 0,
        ...shape, collapse, raw, chain: 0, taper: 0, lift: 0, bridge: 0, from: 0, to: 0,
      });
      index += 1;
    }
    // The lanes' lists over this step's shown slices (`flowAt`'s lookup).
    this.laneFirst.fill(-1);
    if (this.laneNext.length < this.picked.length) this.laneNext = new Int32Array(2 * this.picked.length);
    for (let i = this.picked.length - 1; i >= 0; i -= 1) {
      const k = this.picked[i].slice.lane;
      this.laneNext[i] = this.laneFirst[k];
      this.laneFirst[k] = i;
    }
    this.chainRuns();
    for (const p of this.picked) {
      const span = this.lane(p.slice, time, p.at, p.bridge);
      p.from = span.from;
      p.to = span.to;
      stats.shown += 1;
      if (p.lift > 0) stats.lofted += 1;
    }
    this.writeNodes();
    this.writeCurves(time);
  }

  /** A slice's composite's steepest segment, °, and whether it folds over; nothing where it spans too few stations. */
  private shape(at: number): { steepest: number; overturned: boolean } | undefined {
    const c = this.composites;
    const back = c[at];
    const front = c[at + 2 * (WAVE_POINTS - 1)];
    if (!(front > back)) return undefined;
    const j0 = Math.max(0, Math.ceil(back / LANE.step));
    const j1 = Math.min(this.lanes.stations - 1, Math.floor(front / LANE.step));
    if (j1 - j0 < 4) return undefined;
    let steepest = 0;
    let overturned = false;
    for (let i = 0; i + 1 < WAVE_POINTS; i += 1) {
      const run = c[at + 2 * i + 2] - c[at + 2 * i];
      const rise = Math.abs(c[at + 2 * i + 3] - c[at + 2 * i + 1]);
      const folded = run < -1e-4;
      if (folded) overturned = true;
      if (!(folded || Math.sqrt(run * run + rise * rise) > 0.02)) continue;
      const angle = folded ? 90 : run > 1e-6 ? (Math.atan(rise / run) * 180) / Math.PI : rise > 1e-4 ? 90 : 0;
      if (angle > steepest) steepest = angle;
    }
    if (steepest > this.stats.steepest) this.stats.steepest = steepest;
    return { steepest, overturned };
  }

  /**
   * The loft's runs and each slice's lift. Slices are chained lane to lane by their hand-over times (the next lane's
   * nearest within `RUN_GAP` of a period), and a chain is one run of the loft. Step 3b (ruling 32, point 4): along a run
   * the lift tapers to 0 over `LIFT.taper` m of crest from each lane with no raw lift and from the run's two ends (the old
   * loft's `endBlend`), not over one lane. Point 3: the nodes take the bridge under the curve by the same lift, and
   * wholly once the tube has collapsed (the bore's small folds bridged, drawn and felt by the nodes).
   */
  private chainRuns(): void {
    const picked = this.picked;
    const n = picked.length;
    const period = this.field.period;
    const { sigma } = this.lanes;
    const order = picked.map((_, i) => i).sort((a, b) => picked[a].slice.lane - picked[b].slice.lane || picked[a].slice.tH - picked[b].slice.tH);
    const linked = new Uint8Array(n);
    const byLane = new Map<number, number[]>();
    let chains = 0;
    for (const i of order) {
      const p = picked[i].slice;
      let best = -1;
      let gap = RUN_GAP * period;
      for (const q of byLane.get(p.lane - 1) ?? []) {
        if (linked[q]) continue;
        const d = Math.abs(picked[q].slice.tH - p.tH);
        if (d < gap) { gap = d; best = q; }
      }
      if (best >= 0) {
        picked[i].chain = picked[best].chain;
        linked[best] = 1;
      } else picked[i].chain = chains++;
      const list = byLane.get(p.lane) ?? [];
      list.push(i);
      byLane.set(p.lane, list);
    }
    order.sort((a, b) => picked[a].chain - picked[b].chain || picked[a].slice.lane - picked[b].slice.lane);
    for (let a = 0; a < order.length;) {
      let b = a;
      while (b + 1 < order.length && picked[order[b + 1]].chain === picked[order[a]].chain) b += 1;
      // The run's bounds: its pads' lanes at each end (`PAD_LANES` of its own lanes stay on the water, so it always ends on
      // its pads), and every lane in it with no raw lift.
      const before = sigma[picked[order[Math.min(b, a + PAD_LANES - 1)]].slice.lane];
      const after = sigma[picked[order[Math.max(a, b - PAD_LANES + 1)]].slice.lane];
      for (let m = a; m <= b; m += 1) {
        const p = picked[order[m]];
        if (!(p.raw > 0)) { p.taper = 0; continue; }
        const at = sigma[p.slice.lane];
        let d = Math.min(at - before, after - at);
        for (let q = m - 1; q >= a && at - sigma[picked[order[q]].slice.lane] < d; q -= 1) if (!(picked[order[q]].raw > 0)) { d = at - sigma[picked[order[q]].slice.lane]; break; }
        for (let q = m + 1; q <= b && sigma[picked[order[q]].slice.lane] - at < d; q += 1) if (!(picked[order[q]].raw > 0)) { d = sigma[picked[order[q]].slice.lane] - at; break; }
        p.taper = smoothstep(d / LIFT.taper);
      }
      a = b + 1;
    }
    for (const p of picked) {
      p.lift = p.raw * p.taper;
      p.bridge = p.lift + p.collapse * (1 - p.lift);
    }
  }

  /** One slice's blended curve at `time` s into `composites` from `at`: (s along its lane, y over still water) per point. */
  private composite(slice: FieldSlice, time: number, a: number, seaAt: SeaLevel, at: number): void {
    const { lanes } = this;
    const k = slice.lane;
    const library = this.field.library;
    library.surfaceAt(slice.slice, time, this.caseCurve, this.crestOut);
    const curve = this.caseCurve;
    const out = this.composites;
    const caseCrest = slice.s + curve[2 * WAVE_LANDMARK.crest];
    if (a >= 1) {
      for (let i = 0; i < WAVE_POINTS; i += 1) {
        out[at + 2 * i] = slice.s + curve[2 * i];
        out[at + 2 * i + 1] = slice.mean + curve[2 * i + 1];
      }
      slice.seaS = Number.NaN;
    } else {
      // The sea's crest along the lane: the top nearest where it was (or the case's crest), within reach.
      const bx = lanes.baseX[k];
      const bz = lanes.baseZ[k];
      const rx = lanes.rayX[k];
      const rz = lanes.rayZ[k];
      // Where it was, carried on at a crest's pace (about 6 m/s here); the case's crest the first time.
      const want = slice.seaS === slice.seaS ? slice.seaS + (time - slice.seaT) * SEA_CREST_PACE : caseCrest;
      const seaCrest = this.seaCrest(k, want, seaAt);
      const sc = seaCrest === seaCrest ? seaCrest : caseCrest;
      if (!(seaCrest === seaCrest)) this.stats.seaMissed += 1;
      slice.seaS = sc;
      slice.seaT = time;
      const X = (1 - a) * sc + a * caseCrest;
      const shiftCase = X - caseCrest;
      const shiftSea = X - sc;
      for (let i = 0; i < WAVE_POINTS; i += 1) {
        const s = slice.s + curve[2 * i] + shiftCase;
        const back = s - shiftSea;
        const v = seaAt(bx + back * rx, bz + back * rz);
        const seaY = v === v ? v : slice.mean;
        out[at + 2 * i] = s;
        out[at + 2 * i + 1] = a * (slice.mean + curve[2 * i + 1]) + (1 - a) * seaY;
      }
    }
    // The lip tip's speed along the lane and up (the contact's lip water), over this step.
    const tipS = out[at + 2 * WAVE_LANDMARK.lip];
    const tipY = out[at + 2 * WAVE_LANDMARK.lip + 1];
    if (slice.tipT === slice.tipT && time > slice.tipT) {
      const span = time - slice.tipT;
      const along = (tipS - slice.tipS) / span;
      const up = (tipY - slice.tipY) / span;
      slice.tipAlong = 0.5 * slice.tipAlong + 0.5 * along;
      slice.tipUp = 0.5 * slice.tipUp + 0.5 * up;
    }
    slice.tipS = tipS;
    slice.tipY = tipY;
    slice.tipT = time;
  }

  /**
   * C2 step 4: one slice's water along its curve into `flows` from `flow`: the library's velocity at the two stored
   * depths, and its **material** acceleration there.
   *
   * The library gives, per point, the water's (u, v), the change of those at the fixed point index, and the point's own
   * motion (`WaveLibrary.flowProfileAt`). A stored point is a share of the curve's arc, so it is not a water particle:
   * Du/Dt = du_i/dt + (q·∇)u, with q = the water's velocity less the point's own. The only gradients the library has
   * are along the curve (the neighbouring points, at the same depth) and across it (the two depths), so q is split into
   * its tangential and normal parts and each takes its own gradient. At the surface the normal part is small by the
   * kinematic condition, so the tangential term carries it. Capped at `FLOW.cap`.
   */
  private fillFlow(picked: Picked): void {
    const library = this.field.library;
    const nd = this.depthCount;
    // Only the slices something reads are filled, and each one once a step: a step shows over a hundred slices, and a
    // rider's samples reach a handful of lanes.
    const flow = this.flowStride * this.flowCount;
    this.flowCount += 1;
    if (flow + this.flowStride > this.flows.length) {
      const grown = new Float64Array(Math.max(2 * this.flows.length, flow + this.flowStride));
      grown.set(this.flows);
      this.flows = grown;
    }
    const at = picked.at;
    library.flowProfileAt(picked.slice.slice, this.time, this.flowScratch, this.motion);
    library.depthsOf(picked.slice.slice, this.sliceDepths);
    picked.flow = flow;
    picked.depth0 = this.sliceDepths[0];
    picked.depth1 = this.sliceDepths[Math.min(1, nd - 1)];
    const c = this.composites;
    const f = this.flowScratch;
    const m = this.motion;
    const out = this.flows;
    const dz = nd > 1 ? this.sliceDepths[1] - this.sliceDepths[0] : 0;
    for (let i = 0; i < WAVE_POINTS; i += 1) {
      const a = i > 0 ? i - 1 : 0;
      const b = i + 1 < WAVE_POINTS ? i + 1 : WAVE_POINTS - 1;
      const ex = c[at + 2 * b] - c[at + 2 * a];
      const ey = c[at + 2 * b + 1] - c[at + 2 * a + 1];
      const len = Math.sqrt(ex * ex + ey * ey);
      const tx = len > 1e-9 ? ex / len : 1;
      const ty = len > 1e-9 ? ey / len : 0;
      // The normal, turned up (the water is under it).
      let nxv = -ty;
      let nyv = tx;
      if (nyv < 0) { nxv = -nxv; nyv = -nyv; }
      const mx = m[2 * i];
      const my = m[2 * i + 1];
      // Across the curve, from the two depths (the shallower less the deeper, over their gap): ∂/∂y.
      const shallow = i * nd * FLOW_VALUES;
      const deep = nd > 1 ? shallow + FLOW_VALUES : shallow;
      const dudy = dz > 1e-9 ? (f[shallow] - f[deep]) / dz : 0;
      const dvdy = dz > 1e-9 ? (f[shallow + 1] - f[deep + 1]) / dz : 0;
      for (let j = 0; j < nd; j += 1) {
        const o = (i * nd + j) * FLOW_VALUES;
        const u = f[o];
        const v = f[o + 1];
        const ua = f[(a * nd + j) * FLOW_VALUES];
        const ub = f[(b * nd + j) * FLOW_VALUES];
        const va = f[(a * nd + j) * FLOW_VALUES + 1];
        const vb = f[(b * nd + j) * FLOW_VALUES + 1];
        const dudl = len > 1e-9 ? (ub - ua) / len : 0;
        const dvdl = len > 1e-9 ? (vb - va) / len : 0;
        const qx = u - mx;
        const qy = v - my;
        const qt = qx * tx + qy * ty;
        const qn = qx * nxv + qy * nyv;
        let ax = f[o + 2] + qt * dudl + qn * dudy * nyv;
        let ay = f[o + 3] + qt * dvdl + qn * dvdy * nyv;
        const size = Math.sqrt(ax * ax + ay * ay);
        if (size > FLOW.cap) {
          ax *= FLOW.cap / size;
          ay *= FLOW.cap / size;
        }
        out[flow + o] = u;
        out[flow + o + 1] = v;
        out[flow + o + 2] = ax;
        out[flow + o + 3] = ay;
      }
    }
  }

  /**
   * C2 step 4: the library's own water at (x, y, z): its flow (0, 1, 2) and material acceleration (3, 4, 5) in world
   * axes into `out`, m/s and m/s². Returns the share of the water there that is the library's, 0 to 1 (0: none, and
   * `out` untouched).
   *
   * The share is the one the surface took: each slice's frame weight along its lane (`EDGE`, its lane's end weight)
   * times its blend share, summed over the slices on a lane and capped at 1 as the lane's heights are, then across the
   * lane pair by the same weights the nodes use. So a board crossing the hand-over feels the sea's flow give way to the
   * library's exactly as the surface gives way (`PhysicalSurfWater` blends with the sea).
   *
   * On a lane, the point is matched to the slice's own curve: **the nearest place on the curve to the point itself**,
   * which is the surface the body is on, overturned or not (the swept contact's own rule for a body's surface). Its
   * depth is the distance from the point to that place along the curve's normal, and the water is read between the two
   * stored depths and held past them.
   */
  flowAt(x: number, y: number, z: number, out: Float64Array): number {
    if (this.depthCount === 0 || this.picked.length === 0) return 0;
    const { lanes } = this;
    const found = this.locateLanes(x, z);
    if (!found) return 0;
    let share = 0;
    for (let d = 0; d < 6; d += 1) out[d] = 0;
    for (let side = 0; side < 2; side += 1) {
      const k = found.lane + side;
      const across = side === 0 ? 1 - found.share : found.share;
      if (!(across > 0) || k >= lanes.count) continue;
      const s = side === 0 ? found.s0 : found.s1;
      const rx = lanes.rayX[k];
      const rz = lanes.rayZ[k];
      const lane = this.laneFlow;
      lane.fill(0);
      let laneShare = 0;
      for (let p = this.laneFirst[k]; p >= 0; p = this.laneNext[p]) {
        const picked = this.picked[p];
        if (picked.flow === -1 || !(picked.share > 0)) continue;
        const at = picked.at;
        const back = this.composites[at];
        const front = this.composites[at + 2 * (WAVE_POINTS - 1)];
        const frame = picked.slice.end * smoothstep((s - back) / EDGE.band) * smoothstep((front - s) / EDGE.band);
        const w = frame * picked.share;
        if (!(w > 0)) continue;
        if (picked.flow === -2) this.fillFlow(picked);
        if (!this.onCurve(picked, s, y)) continue;
        laneShare += w;
        lane[0] += w * this.curveFlow[0] * rx;
        lane[1] += w * this.curveFlow[1];
        lane[2] += w * this.curveFlow[0] * rz;
        lane[3] += w * this.curveFlow[2] * rx;
        lane[4] += w * this.curveFlow[3];
        lane[5] += w * this.curveFlow[2] * rz;
      }
      if (!(laneShare > 0)) continue;
      // Two waves' frames meet at most at their ends: past a weight of 1 they share it, as the lane's heights do.
      const keep = Math.min(1, laneShare) / laneShare;
      for (let d = 0; d < 6; d += 1) out[d] += across * keep * lane[d];
      share += across * Math.min(1, laneShare);
    }
    if (!(share > 1e-9)) return 0;
    for (let d = 0; d < 6; d += 1) out[d] /= share;
    return Math.min(1, share);
  }

  /** `flowAt`'s scratch: the water at the matched place on one curve, (u along the ray, v up, Du/Dt along, Dv/Dt up). */
  private readonly curveFlow = new Float64Array(4);
  /** `flowAt`'s scratch: one lane's weighted sum (flow and acceleration, world axes). */
  private readonly laneFlow = new Float64Array(6);

  /**
   * The place on a slice's curve nearest the point (`s`, `y`), and its water at the point's depth under that place,
   * into `curveFlow`; false where the curve does not reach the point (`FLOW.reach`).
   */
  private onCurve(picked: Picked, s: number, y: number): boolean {
    const c = this.composites;
    const at = picked.at;
    let bestD2 = Infinity;
    let bestI = -1;
    let bestU = 0;
    for (let i = 0; i + 1 < WAVE_POINTS; i += 1) {
      const ax = c[at + 2 * i];
      const bx = c[at + 2 * i + 2];
      if ((ax < s - FLOW.reach && bx < s - FLOW.reach) || (ax > s + FLOW.reach && bx > s + FLOW.reach)) continue;
      const ay = c[at + 2 * i + 1];
      const by = c[at + 2 * i + 3];
      const ex = bx - ax;
      const ey = by - ay;
      const len2 = ex * ex + ey * ey;
      const u = len2 > 1e-12 ? Math.min(1, Math.max(0, ((s - ax) * ex + (y - ay) * ey) / len2)) : 0;
      const gx = ax + u * ex - s;
      const gy = ay + u * ey - y;
      const d2 = gx * gx + gy * gy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestI = i;
        bestU = u;
      }
    }
    if (bestI < 0) return false;
    const ax = c[at + 2 * bestI];
    const ay = c[at + 2 * bestI + 1];
    const ex = c[at + 2 * bestI + 2] - ax;
    const ey = c[at + 2 * bestI + 3] - ay;
    const len = Math.sqrt(ex * ex + ey * ey);
    let nxv = len > 1e-9 ? -ey / len : 0;
    let nyv = len > 1e-9 ? ex / len : 1;
    if (nyv < 0) { nxv = -nxv; nyv = -nyv; }
    // The depth under that place, along the curve's normal.
    const px = ax + bestU * ex;
    const py = ay + bestU * ey;
    const depth = Math.max(0, (px - s) * nxv + (py - y) * nyv);
    const nd = this.depthCount;
    const zs = nd > 1 && picked.depth1 > picked.depth0 ? Math.min(1, Math.max(0, (depth - picked.depth0) / (picked.depth1 - picked.depth0))) : 0;
    const flows = this.flows;
    const o = picked.flow;
    const a0 = (bestI * nd) * FLOW_VALUES;
    const b0 = ((bestI + 1) * nd) * FLOW_VALUES;
    const step = nd > 1 ? FLOW_VALUES : 0;
    for (let d = 0; d < FLOW_VALUES; d += 1) {
      const a = flows[o + a0 + d] + zs * (flows[o + a0 + step + d] - flows[o + a0 + d]);
      const b = flows[o + b0 + d] + zs * (flows[o + b0 + step + d] - flows[o + b0 + d]);
      this.curveFlow[d] = a + bestU * (b - a);
    }
    return true;
  }

  /** The lane pair at (x, z) (the footprint's rule): lane k, the share of k + 1, and the places along both. */
  private locateLanes(x: number, z: number): { lane: number; share: number; s0: number; s1: number } | undefined {
    const { lanes } = this;
    if (lanes.count < 2) return undefined;
    const side = (k: number) => (x - lanes.baseX[k]) * lanes.rayZ[k] - (z - lanes.baseZ[k]) * lanes.rayX[k];
    if (side(0) < 0 || side(lanes.count - 1) >= 0) return undefined;
    let lo = 0;
    let hi = lanes.count - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (side(mid) >= 0) lo = mid;
      else hi = mid;
    }
    const a = side(lo);
    const b = side(lo + 1);
    const s0 = (x - lanes.baseX[lo]) * lanes.rayX[lo] + (z - lanes.baseZ[lo]) * lanes.rayZ[lo];
    const s1 = (x - lanes.baseX[lo + 1]) * lanes.rayX[lo + 1] + (z - lanes.baseZ[lo + 1]) * lanes.rayZ[lo + 1];
    return { lane: lo, share: a - b > 0 ? a / (a - b) : 0, s0, s1 };
  }

  /** The sea's crest along lane k nearest `want` (m along it), within ±10 m, a top over ±1 m and 0.1 m over its trough ahead. */
  private seaCrest(k: number, want: number, seaAt: SeaLevel): number {
    const { lanes } = this;
    const step = 2 * LANE.step;
    const from = Math.max(0, want - 10);
    const to = Math.min((lanes.stations - 1) * LANE.step, want + 10 + 15);
    const n = Math.floor((to - from) / step) + 1;
    const eta = this.sea;
    for (let j = 0; j < n; j += 1) {
      const s = from + j * step;
      eta[j] = seaAt(lanes.baseX[k] + s * lanes.rayX[k], lanes.baseZ[k] + s * lanes.rayZ[k]);
    }
    let best = Number.NaN;
    let gap = Infinity;
    const top = Math.round(1 / step);
    const trough = Math.round(15 / step);
    for (let j = top; j + top < n; j += 1) {
      const v = eta[j];
      const s = from + j * step;
      if (!(v === v) || Math.abs(s - want) > 10) continue;
      let isTop = eta[j - 1] < v;
      for (let m = j - top; isTop && m <= j + top; m += 1) if (!(eta[m] <= v)) isTop = false;
      if (!isTop) continue;
      let low = Infinity;
      for (let m = j + 1; m < Math.min(n, j + trough); m += 1) if (eta[m] < low) low = eta[m];
      if (!(v - low >= 0.1)) continue;
      const a = eta[j - 1];
      const b = eta[j + 1];
      const den = a - 2 * v + b;
      const place = s + (den < 0 ? Math.min(0.5, Math.max(-0.5, (0.5 * (a - b)) / den)) : 0) * step;
      if (Math.abs(place - want) < gap) { gap = Math.abs(place - want); best = place; }
    }
    return best;
  }

  /**
   * One slice's composite onto its lane's stations: its single-valued heights (a bridge under every fold and every run
   * steeper than `LIFT.bridge`), its weight, its foam hold. Returns what its loft needs (the lift's course and its span
   * along the lane), or nothing.
   */
  private lane(slice: FieldSlice, time: number, at: number, bridgeWeight: number): { from: number; to: number } {
    const { lanes } = this;
    const k = slice.lane;
    const c = this.composites;
    const st = lanes.stations;
    const ds = LANE.step;
    const back = c[at];
    const front = c[at + 2 * (WAVE_POINTS - 1)];
    const j0 = Math.max(0, Math.ceil(back / ds));
    const j1 = Math.min(st - 1, Math.floor(front / ds));
    const count = j1 - j0 + 1;
    if (this.hits.length < count) {
      this.hits = new Uint8Array(2 * count);
      this.steep = new Uint8Array(2 * count);
      this.heights = new Float64Array(2 * count);
      this.lows = new Float64Array(2 * count);
    }
    const hits = this.hits;
    const steep = this.steep;
    const hs = this.heights;
    const lows = this.lows;
    hits.fill(0, 0, count);
    steep.fill(0, 0, count);
    lows.fill(Infinity, 0, count);
    // Steepness and folds, segment by segment; each monotone segment's height on its stations (a station reached
    // twice is under a fold).
    const tanOn = Math.tan((LIFT.on * Math.PI) / 180);
    const tanBridge = Math.tan((LIFT.bridge * Math.PI) / 180);
    let liftFrom = Infinity;
    let liftTo = -Infinity;
    for (let i = 0; i + 1 < WAVE_POINTS; i += 1) {
      const s0 = c[at + 2 * i];
      const s1 = c[at + 2 * i + 2];
      const y0 = c[at + 2 * i + 1];
      const y1 = c[at + 2 * i + 3];
      const run = s1 - s0;
      const rise = Math.abs(y1 - y0);
      const folded = run < -1e-4;
      const long = Math.sqrt(run * run + rise * rise) > 0.02;
      const slope = folded ? Infinity : run > 1e-6 ? rise / run : rise > 1e-4 ? Infinity : 0;
      const lo = Math.min(s0, s1);
      const hi = Math.max(s0, s1);
      // The curve's lowest crossing over each station (folded segments too): the nodes' own curve where the lift is small.
      if (hi - lo > 1e-9) {
        for (let j = Math.max(j0, Math.ceil(lo / ds)); j <= Math.min(j1, Math.floor(hi / ds)); j += 1) {
          const y = y0 + ((j * ds - s0) / (s1 - s0)) * (y1 - y0);
          if (y < lows[j - j0]) lows[j - j0] = y;
        }
      }
      if ((long || folded) && slope > tanOn) {
        liftFrom = Math.min(liftFrom, lo);
        liftTo = Math.max(liftTo, hi);
      }
      if ((long || folded) && slope > tanBridge) {
        for (let j = Math.max(j0, Math.floor(lo / ds)); j <= Math.min(j1, Math.ceil(hi / ds)); j += 1) steep[j - j0] = 1;
      }
      if (!(run > 0)) continue;
      const a = Math.max(j0, Math.ceil(s0 / ds));
      const b = Math.min(j1, Math.ceil(s1 / ds) - 1);
      for (let j = a; j <= b; j += 1) {
        const x = j * ds;
        hs[j - j0] = y0 + ((x - s0) / run) * (y1 - y0);
        if (hits[j - j0] < 2) hits[j - j0] += 1;
      }
    }
    // The bridges: every run of stations under a fold, unreached, or steep, widened to gentler ground (`LIFT.gentle`,
    // at most `LIFT.reach` m each side), a cubic Hermite from the heights and slopes at its two ends. At a frame's end
    // the run holds the end's height.
    const gentle = Math.tan((LIFT.gentle * Math.PI) / 180);
    const most = Math.round(LIFT.reach / ds);
    const bad = (j: number) => hits[j - j0] !== 1 || steep[j - j0] === 1;
    let bridged = false;
    for (let j = j0; j <= j1; j += 1) {
      if (!bad(j)) continue;
      let ra = j;
      let rb = j;
      while (rb + 1 <= j1 && bad(rb + 1)) rb += 1;
      let ja = ra - 1;
      let jb = rb + 1;
      for (let m = 0; m < most && ja - 1 >= j0 && !bad(ja - 1) && Math.abs(hs[ja - j0] - hs[ja - 1 - j0]) / ds > gentle; m += 1) ja -= 1;
      for (let m = 0; m < most && jb + 1 <= j1 && !bad(jb + 1) && Math.abs(hs[jb + 1 - j0] - hs[jb - j0]) / ds > gentle; m += 1) jb += 1;
      if (ja < j0 && jb > j1) {
        for (let q = j0; q <= j1; q += 1) hs[q - j0] = slice.mean;
      } else if (ja < j0) {
        for (let q = j0; q < jb; q += 1) hs[q - j0] = hs[jb - j0];
      } else if (jb > j1) {
        for (let q = ja + 1; q <= j1; q += 1) hs[q - j0] = hs[ja - j0];
      } else {
        const ya = hs[ja - j0];
        const yb = hs[jb - j0];
        const ma = ja - 1 >= j0 && !bad(ja - 1) ? Math.min(tanBridge, Math.max(-tanBridge, (hs[ja - j0] - hs[ja - 1 - j0]) / ds)) : 0;
        const mb = jb + 1 <= j1 && !bad(jb + 1) ? Math.min(tanBridge, Math.max(-tanBridge, (hs[jb + 1 - j0] - hs[jb - j0]) / ds)) : 0;
        const L = (jb - ja) * ds;
        for (let q = ja + 1; q < jb; q += 1) {
          const u = (q - ja) / (jb - ja);
          const u2 = u * u;
          const u3 = u2 * u;
          hs[q - j0] = (2 * u3 - 3 * u2 + 1) * ya + (u3 - 2 * u2 + u) * L * ma + (-2 * u3 + 3 * u2) * yb + (u3 - u2) * L * mb;
        }
      }
      bridged = true;
      liftFrom = Math.min(liftFrom, Math.max(j0, ja) * ds);
      liftTo = Math.max(liftTo, Math.min(j1, jb) * ds);
      j = rb;
    }
    if (bridged) {
      this.stats.bridged += 1;
      // Step 3b (ruling 32, point 3): the bridge comes in by its weight (the loft's lift, then the collapse), so a slice
      // with a small lift keeps its nodes on its own curve (its lowest crossing), and the loft over them with it.
      if (bridgeWeight < 1) {
        for (let j = j0; j <= j1; j += 1) {
          const low = lows[j - j0];
          if (low < Infinity) hs[j - j0] = bridgeWeight * hs[j - j0] + (1 - bridgeWeight) * low;
        }
      }
    }
    // Weight: the frame's ends and the field's ends; the foam's hold until the touchdown.
    const o = k * st;
    const touchdownAt = slice.throwAt + slice.touchdown;
    const released = smoothstep((time - touchdownAt) / FOAM_HOLD);
    const holdT = smoothstep((time - slice.blendFrom) / SLICE_LIFE.blend) * (1 - released);
    // C2 step 5b: the bore's own foam comes in exactly as the sea's hold goes out (`released`), so the two never add up
    // to more than the slice's share. Its cover is Koepke's ageing from the slice's own touchdown; its stretch is the
    // slice's own crest to its own toe (`boreFoam.ts`).
    const white = released > 0 ? released * boreWhite(time - touchdownAt) : 0;
    const air = released > 0 ? boreAir(time - touchdownAt) : 0;
    const pileFrom = c[at + 2 * WAVE_LANDMARK.crest];
    const pileTo = c[at + 2 * WAVE_LANDMARK.toe];
    for (let j = j0; j <= j1; j += 1) {
      const x = j * ds;
      const w = slice.end * smoothstep((x - back) / EDGE.band) * smoothstep((front - x) / EDGE.band);
      if (!(w > 0)) continue;
      let sum = this.laneW[o + j] + w;
      let wh = this.laneWH[o + j] + w * hs[j - j0];
      // Two waves' frames on one lane meet at most at their ends: past a weight of 1 they share it.
      if (sum > 1) {
        wh /= sum;
        sum = 1;
      }
      this.laneWH[o + j] = wh;
      this.laneW[o + j] = sum;
      this.laneF[o + j] = Math.max(this.laneF[o + j], w * holdT);
      if (!(white > 0)) continue;
      const shape = boreShape(x, pileFrom, pileTo);
      if (!(shape > 0)) continue;
      const cw = w * shape * released;
      let cwSum = this.laneCW[o + j] + cw;
      let cover = this.laneC[o + j] + w * shape * white;
      let void_ = this.laneA[o + j] + cw * air;
      if (cwSum > 1) {
        cover /= cwSum;
        void_ /= cwSum;
        cwSum = 1;
      }
      this.laneC[o + j] = cover;
      this.laneA[o + j] = void_;
      this.laneCW[o + j] = cwSum;
    }
    if (this.laneLo[k] > this.laneHi[k]) {
      this.laneLo[k] = j0;
      this.laneHi[k] = j1;
    } else {
      this.laneLo[k] = Math.min(this.laneLo[k], j0);
      this.laneHi[k] = Math.max(this.laneHi[k], j1);
    }
    if (!(liftTo >= liftFrom)) return { from: 0, to: 0 };
    return { from: liftFrom - LIFT.margin, to: liftTo + LIFT.margin };
  }

  /** Each footprint node from its two lanes: A, B and the foam hold. */
  private writeNodes(): void {
    const { lanes } = this;
    const st = lanes.stations;
    const ds = LANE.step;
    const top = (st - 1) * ds;
    const read = (k: number, s: number, values: Float64Array): number => {
      if (!(s >= 0 && s <= top)) return 0;
      const g = s / ds;
      const j = Math.min(st - 2, Math.floor(g));
      const u = g - j;
      if (j + 1 < this.laneLo[k] || j > this.laneHi[k]) return 0;
      const o = k * st;
      return values[o + j] + u * (values[o + j + 1] - values[o + j]);
    };
    const written = this.written;
    let count = 0;
    for (let k = 0; k + 1 < lanes.count; k += 1) {
      const live0 = this.laneLo[k] <= this.laneHi[k];
      const live1 = this.laneLo[k + 1] <= this.laneHi[k + 1];
      if (!live0 && !live1) continue;
      // The pair's live stretch along lane k (lane k + 1's, shifted by at most the pair's own offset), a station's margin.
      let lo = Infinity;
      let hi = -Infinity;
      if (live0) { lo = (this.laneLo[k] - 1) * ds; hi = (this.laneHi[k] + 1) * ds; }
      if (live1) {
        lo = Math.min(lo, (this.laneLo[k + 1] - 1) * ds - this.pairShift[k]);
        hi = Math.max(hi, (this.laneHi[k + 1] + 1) * ds + this.pairShift[k]);
      }
      const first = this.pairStart[k];
      const last = this.pairStart[k + 1];
      let a = first;
      let b = last;
      while (a < b) {
        const m = (a + b) >> 1;
        if (this.nodeS0[m] < lo) a = m + 1;
        else b = m;
      }
      for (let n = a; n < last && this.nodeS0[n] <= hi; n += 1) {
        const f = this.nodeShare[n];
        const s0 = this.nodeS0[n];
        const s1 = this.nodeS1[n];
        const w = (1 - f) * (live0 ? read(k, s0, this.laneW) : 0) + f * (live1 ? read(k + 1, s1, this.laneW) : 0);
        if (!(w > 0)) continue;
        const node = this.nodes[n];
        this.weight[node] = Math.min(1, w);
        this.height[node] = (1 - f) * (live0 ? read(k, s0, this.laneWH) : 0) + f * (live1 ? read(k + 1, s1, this.laneWH) : 0);
        this.hold[node] = Math.min(1, (1 - f) * (live0 ? read(k, s0, this.laneF) : 0) + f * (live1 ? read(k + 1, s1, this.laneF) : 0));
        const aired = (1 - f) * (live0 ? read(k, s0, this.laneCW) : 0) + f * (live1 ? read(k + 1, s1, this.laneCW) : 0);
        if (aired > 0) {
          this.aired[node] = Math.min(1, aired);
          this.cover[node] = Math.min(1, (1 - f) * (live0 ? read(k, s0, this.laneC) : 0) + f * (live1 ? read(k + 1, s1, this.laneC) : 0));
          this.air[node] = Math.min(1, (1 - f) * (live0 ? read(k, s0, this.laneA) : 0) + f * (live1 ? read(k + 1, s1, this.laneA) : 0));
        }
        written[count++] = node;
      }
    }
    this.writtenCount = count;
    this.stats.nodes = count;
  }

  /**
   * The loft's curves (`CURVE`): every slice that lifts off the nodes, and its neighbours on the lanes either side (lift
   * 0, so a run of lifted slices ends on the nodes). Slices are chained lane to lane by their hand-over times (the next
   * lane's nearest within `RUN_GAP` of a period), and a chain is one run of the loft (`CURVE.wave`).
   */
  private writeCurves(time: number): void {
    const picked = this.picked;
    const n = picked.length;
    const order = picked.map((_, i) => i);
    const chain = picked.map((p) => p.chain);
    // Each run's lifted lanes and their spans: a lifted slice's neighbours (the pads) take the span of the lifted ones beside.
    const lifted = new Map<string, { from: number; to: number }>();
    for (let i = 0; i < n; i += 1) if (picked[i].lift > 0) lifted.set(`${chain[i]}:${picked[i].slice.lane}`, { from: picked[i].from, to: picked[i].to });
    const capacity = this.curves.length / CURVE_STRIDE;
    let count = 0;
    order.sort((a, b) => chain[a] - chain[b] || picked[a].slice.lane - picked[b].slice.lane);
    for (const i of order) {
      const p = picked[i];
      const { slice } = p;
      // Lifted, a lane beside a lifted one (the seam mask still whole), or two beside (its mask's fade): `PAD_LANES`.
      let span: { from: number; to: number } | undefined = p.lift > 0 ? { from: p.from, to: p.to } : undefined;
      let reach = p.lift > 0 ? 0 : Infinity;
      for (let d = 1; d <= PAD_LANES && !span; d += 1) {
        for (const k of [slice.lane - d, slice.lane + d]) {
          const near = lifted.get(`${chain[i]}:${k}`);
          if (near) {
            span = span ? { from: Math.min(span.from, near.from), to: Math.max(span.to, near.to) } : { ...near };
            reach = d;
          }
        }
      }
      if (!span || count >= capacity) continue;
      const o = count * CURVE_STRIDE;
      const out = this.curves;
      const tau = time - slice.throwAt;
      out[o + CURVE.lane] = slice.lane;
      out[o + CURVE.wave] = chain[i];
      out[o + CURVE.lift] = p.lift;
      out[o + CURVE.mask] = reach < PAD_LANES ? 1 : 0;
      out[o + CURVE.from] = span.from;
      out[o + CURVE.to] = span.to;
      out[o + CURVE.tau] = tau;
      out[o + CURVE.touchdown] = slice.touchdown;
      out[o + CURVE.h0] = slice.slice.h0;
      out[o + CURVE.tipAlong] = slice.tipAlong;
      out[o + CURVE.tipUp] = slice.tipUp;
      out[o + CURVE.overturned] = p.overturned ? 1 : 0;
      out[o + CURVE.baseX] = this.lanes.baseX[slice.lane];
      out[o + CURVE.baseZ] = this.lanes.baseZ[slice.lane];
      out[o + CURVE.rayX] = this.lanes.rayX[slice.lane];
      out[o + CURVE.rayZ] = this.lanes.rayZ[slice.lane];
      out[o + CURVE.sigma] = this.lanes.sigma[slice.lane];
      const c = this.composites;
      for (let j = 0; j < 2 * WAVE_POINTS; j += 1) out[o + CURVE.points + j] = c[p.at + j];
      count += 1;
    }
    this.curveCount = count;
    this.stats.lofted = count;
  }

  /**
   * The probes' view of this step's shown slices: each one's slice, composite (s, y per point), lift, share and, with
   * the velocity, its water along the curve (`fillFlow`'s layout) and the two depths it stands at, m.
   */
  shown(): Array<{ slice: FieldSlice; curve: Float64Array; lift: number; share: number; flow?: Float64Array; depths?: [number, number] }> {
    for (const p of this.picked) if (p.flow === -2) this.fillFlow(p);
    return this.picked.map((p) => ({
      slice: p.slice, curve: this.composites.subarray(p.at, p.at + 2 * WAVE_POINTS), lift: p.lift, share: p.share,
      ...(p.flow >= 0 ? { flow: this.flows.subarray(p.flow, p.flow + this.flowStride), depths: [p.depth0, p.depth1] as [number, number] } : {}),
    }));
  }

  /** Lane k's library surface at s m along it this step: its weight and weighted height there (a probe's). */
  laneAt(k: number, s: number): { weight: number; height: number } {
    const st = this.lanes.stations;
    const g = s / LANE.step;
    if (!(g >= 0 && g <= st - 1) || this.laneLo[k] > this.laneHi[k]) return { weight: 0, height: 0 };
    const j = Math.min(st - 2, Math.floor(g));
    const u = g - j;
    const o = k * st;
    const w = this.laneW[o + j] + u * (this.laneW[o + j + 1] - this.laneW[o + j]);
    const wh = this.laneWH[o + j] + u * (this.laneWH[o + j + 1] - this.laneWH[o + j]);
    return { weight: w, height: wh };
  }
}
