import { smoothstep } from './Bathymetry';
import type { SeaState } from './SeaState';
import { relaxationRamp, type RelaxationZone, type ShallowWaterSolver, type WaterTarget } from './ShallowWaterSolver';
import { transformedSea } from './warmStart';

/**
 * The side feed (the wave-sizes spec): the window's open side edges let a
 * directionally spread sea's energy drift out, and nothing entered from the
 * neighbouring coast, so a 160 m window lost up to a third of its wave height
 * within 150 m. The outer `width` m of each side now relax toward the incoming
 * sea, shoaled and refracted over the column's bed as the warm start fills it,
 * from the offshore zone's inner edge while the shoaled Hs stays under
 * `breakingShare` of the depth (outside the surf zone), fading over `fade` m.
 */
export const SIDE_FEED = { width: 30, breakingShare: 0.45, fade: 40 };
/** The warm start's depth-limited cap on the fed sea (McCowan γ). */
const GAMMA = 0.78;

export class SideFeed implements RelaxationZone {
  readonly weights: Float64Array;
  /** Sea time at solver time 0, s (a handed-over sea takes the donor's, as the offshore zone does). */
  timeOffset: number;
  private readonly referenceZ: number;
  private readonly count: number;
  private readonly omega: Float64Array;
  /** Per solver cell, its slot in the coefficient arrays, or −1 outside the strips. */
  private readonly slot: Int32Array;
  /** Per slot and component: A cos Φ₀, A sin Φ₀, and the flux speeds across and along shore. */
  private cosine = new Float64Array(0);
  private sine = new Float64Array(0);
  private speedX = new Float64Array(0);
  private speedZ = new Float64Array(0);
  /** cos ωt and sin ωt of each component at the cached sea time. */
  private readonly timeCos: Float64Array;
  private readonly timeSin: Float64Array;
  private cachedSeaTime = Number.NaN;

  constructor(private readonly solver: ShallowWaterSolver, readonly sea: SeaState, options: { referenceZ: number; timeOffset: number }) {
    this.referenceZ = options.referenceZ;
    this.timeOffset = options.timeOffset;
    this.count = sea.components.length;
    this.omega = Float64Array.from(sea.components, (component) => component.omega);
    this.timeCos = new Float64Array(this.count);
    this.timeSin = new Float64Array(this.count);
    this.weights = new Float64Array(solver.nx * solver.nz);
    this.slot = new Int32Array(solver.nx * solver.nz);
    this.build();
  }

  /** The window slid along shore: the strips stay at its edges, over the bed now under them. */
  afterShift(): void {
    this.build();
  }

  target(_x: number, _z: number, t: number, out: WaterTarget, index: number): void {
    const slot = index >= 0 ? this.slot[index] : -1;
    if (slot < 0) {
      out.eta = 0;
      out.qx = 0;
      out.qz = 0;
      return;
    }
    const seaTime = t + this.timeOffset;
    if (seaTime !== this.cachedSeaTime) {
      for (let c = 0; c < this.count; c += 1) {
        this.timeCos[c] = Math.cos(this.omega[c] * seaTime);
        this.timeSin[c] = Math.sin(this.omega[c] * seaTime);
      }
      this.cachedSeaTime = seaTime;
    }
    // cos(Φ₀ − ωt) = cos Φ₀ cos ωt + sin Φ₀ sin ωt.
    let eta = 0;
    let qx = 0;
    let qz = 0;
    const base = slot * this.count;
    for (let c = 0; c < this.count; c += 1) {
      const value = this.cosine[base + c] * this.timeCos[c] + this.sine[base + c] * this.timeSin[c];
      eta += value;
      qx += this.speedX[base + c] * value;
      qz += this.speedZ[base + c] * value;
    }
    out.eta = eta;
    out.qx = qx;
    out.qz = qz;
  }

  private build(): void {
    const { solver, count } = this;
    const { nx, dx } = solver;
    this.weights.fill(0);
    this.slot.fill(-1);
    const cosine: number[] = [];
    const sine: number[] = [];
    const speedX: number[] = [];
    const speedZ: number[] = [];
    let slots = 0;
    for (let ix = 0; ix < nx; ix += 1) {
      const fromEdge = Math.min(ix + 0.5, nx - ix - 0.5) * dx;
      if (fromEdge >= SIDE_FEED.width) continue;
      const ramp = relaxationRamp(1 - fromEdge / SIDE_FEED.width);
      // Where this column's shoaled sea first reaches the breaking share: the feed ends there.
      const rows: { iz: number; scale: number; amplitude: Float64Array; phase: Float64Array; speedX: Float64Array; speedZ: Float64Array }[] = [];
      let end = Infinity;
      transformedSea(solver, this.sea, this.referenceZ, ix, GAMMA, (iz, row) => {
        const z = solver.zCenters[iz];
        if (z <= this.referenceZ || end < Infinity) return;
        if (!(row.depth > 0) || row.hs >= SIDE_FEED.breakingShare * row.depth) {
          end = z;
          return;
        }
        rows.push({
          iz, scale: row.scale, amplitude: row.amplitude.slice(), phase: row.phase.slice(), speedX: row.speedX.slice(), speedZ: row.speedZ.slice(),
        });
      });
      for (const row of rows) {
        const z = solver.zCenters[row.iz];
        const fade = end === Infinity ? 1 : smoothstep(end, end - SIDE_FEED.fade, z);
        const weight = ramp * fade;
        if (!(weight > 0)) continue;
        const i = row.iz * nx + ix;
        this.weights[i] = weight;
        this.slot[i] = slots;
        slots += 1;
        for (let c = 0; c < count; c += 1) {
          const amplitude = row.scale * row.amplitude[c];
          cosine.push(amplitude * Math.cos(row.phase[c]));
          sine.push(amplitude * Math.sin(row.phase[c]));
          speedX.push(row.speedX[c]);
          speedZ.push(row.speedZ[c]);
        }
      }
    }
    this.cosine = Float64Array.from(cosine);
    this.sine = Float64Array.from(sine);
    this.speedX = Float64Array.from(speedX);
    this.speedZ = Float64Array.from(speedZ);
  }
}
