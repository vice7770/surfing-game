import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';
import { seededRandom } from '../wave/random';

/** What the bubbles need from a surf zone: its grid and water, and where bores are making foam. */
export interface BubbleScene {
  readonly solver: {
    readonly nx: number;
    readonly xCenters: ArrayLike<number>;
    readonly zCenters: ArrayLike<number>;
    readonly dx: number;
    readonly dz: ArrayLike<number>;
    readonly h: ArrayLike<number>;
    readonly qx: ArrayLike<number>;
    readonly qz: ArrayLike<number>;
    readonly bed: ArrayLike<number>;
    cellIndex(x: number, z: number): number;
  };
  readonly foam: { readonly source: ArrayLike<number> };
}

/** Rise speed of millimetre bubbles, near their terminal velocity (Clift, Grace & Weber 1978), m/s. */
export const BUBBLE_RISE_SPEED = 0.25;
/** Bubbles entrained per unit of foam made on one square metre: a rendering density that keeps a set's bores near 2,000 bubbles. */
const BUBBLES_PER_FOAM = 1.5;
/** Entrainment depth below the surface, m: the plume under a surf-zone bore. */
const DEPTH = { min: 0.3, max: 1.2 };
const LIFETIME = 3;
const WET = 0.05;

/**
 * Bubbles under breaking bores (plan §2.4, §2.7): pooled points entrained
 * where the foam field's bore source is active, carried by the local current,
 * rising to the surface. Visual only; seen in the underwater view.
 */
export class BubblePoints {
  readonly mesh: Points<BufferGeometry, PointsMaterial>;
  private readonly positions: BufferAttribute;
  private readonly x: Float64Array;
  private readonly y: Float64Array;
  private readonly z: Float64Array;
  private readonly age: Float64Array;
  private count = 0;
  private readonly random: () => number;

  constructor(seed: number, readonly capacity = 4096) {
    this.random = seededRandom(seed, 0xb0bb1e);
    this.x = new Float64Array(capacity);
    this.y = new Float64Array(capacity);
    this.z = new Float64Array(capacity);
    this.age = new Float64Array(capacity);
    const geometry = new BufferGeometry();
    this.positions = new BufferAttribute(new Float32Array(capacity * 3), 3);
    geometry.setAttribute('position', this.positions);
    geometry.setDrawRange(0, 0);
    this.mesh = new Points(geometry, new PointsMaterial({
      color: '#f2fbff', size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    this.mesh.frustumCulled = false;
  }

  update(scene: BubbleScene, dt: number): void {
    if (!(dt > 0)) return;
    const { solver, foam } = scene;
    // Rise and drift; bubbles that reach the surface or grow old are gone (swap-remove keeps the pool packed).
    for (let k = 0; k < this.count; k += 1) {
      const cell = solver.cellIndex(this.x[k], this.z[k]);
      const depth = solver.h[cell];
      if (depth > WET) {
        this.x[k] += (solver.qx[cell] / depth) * dt;
        this.z[k] += (solver.qz[cell] / depth) * dt;
      }
      this.y[k] += BUBBLE_RISE_SPEED * dt;
      this.age[k] += dt;
      if (depth <= WET || this.y[k] >= depth + solver.bed[cell] - 0.02 || this.age[k] > LIFETIME) {
        this.count -= 1;
        this.x[k] = this.x[this.count];
        this.y[k] = this.y[this.count];
        this.z[k] = this.z[this.count];
        this.age[k] = this.age[this.count];
        k -= 1;
      }
    }
    const { nx, xCenters, zCenters, dx, dz, h, bed } = solver;
    const source = foam.source;
    // Start the scan at a random cell, so a full pool is shared along and across the surf zone.
    const start = Math.floor(this.random() * source.length);
    for (let n = 0; n < source.length && this.count < this.capacity; n += 1) {
      const i = (start + n) % source.length;
      if (!(source[i] > 0) || h[i] <= DEPTH.min + WET) continue;
      const row = Math.floor(i / nx);
      const expected = source[i] * dt * dx * dz[row] * BUBBLES_PER_FOAM;
      let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
      const surface = h[i] + bed[i];
      for (; spawns > 0 && this.count < this.capacity; spawns -= 1) {
        const k = this.count;
        this.x[k] = xCenters[i - row * nx] + (this.random() - 0.5) * dx;
        this.z[k] = zCenters[row] + (this.random() - 0.5) * dz[row];
        this.y[k] = surface - Math.min(h[i] - WET, DEPTH.min + this.random() * (DEPTH.max - DEPTH.min));
        this.age[k] = 0;
        this.count += 1;
      }
    }
    for (let k = 0; k < this.count; k += 1) this.positions.setXYZ(k, this.x[k], this.y[k], this.z[k]);
    this.positions.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, this.count);
  }

  clear(): void {
    this.count = 0;
    this.mesh.geometry.setDrawRange(0, 0);
  }
}
