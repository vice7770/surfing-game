import { GRAVITY } from './dispersion';
import { seededRandom } from './random';

/** A lip parcel falling back into the water: where, how much, and how fast. */
export interface LipImpact {
  x: number;
  z: number;
  volume: number;
  vx: number;
  vy: number;
  vz: number;
}

/** What the spray needs from a surf zone: its grid and water, bore foam, the latest lip impacts and the wind. */
export interface SprayScene {
  readonly solver: {
    readonly nx: number;
    readonly nz: number;
    readonly xCenters: ArrayLike<number>;
    readonly zCenters: ArrayLike<number>;
    readonly dx: number;
    readonly dz: ArrayLike<number>;
    readonly h: ArrayLike<number>;
    readonly qx: ArrayLike<number>;
    readonly qz: ArrayLike<number>;
    readonly bed: ArrayLike<number>;
    readonly restLevel: number;
    cellIndex(x: number, z: number): number;
  };
  readonly foam: { readonly source: ArrayLike<number> };
  readonly lipImpacts: readonly LipImpact[];
  /** Local wind at crest height, m/s: positive onshore (+z). */
  readonly windSpeed: number;
}

/**
 * Terminal fall speeds, m/s: millimetre spray drops fall at 3–7 m/s (Gunn &
 * Kinzer 1949); spume and mist, tenths of a millimetre, at 0.3–0.6 m/s and so
 * ride the wind. The drag is quadratic in the speed relative to the air.
 */
const SPRAY_FALL = { min: 3, max: 7 };
const MIST_FALL = { min: 0.3, max: 0.6 };
const SPRAY_LIFE = 3;
const MIST_LIFE = 4;
/**
 * Rendering densities (drawn particles, each a cluster of drops): per joule of
 * lip impact energy, per unit of bore foam made on a square metre, and per
 * square metre of crest per (m/s of wind over the feathering onset)² each second.
 */
const SPRAY_PER_JOULE = 0.05;
const SPRAY_PER_FOAM = 0.6;
const FEATHER_RATE = 0.05;
/** Offshore wind this fast starts blowing spray off steep crests, m/s; the crest must face it this steeply and stand this high over the depth. */
const FEATHER_ONSET = 4;
const FEATHER_SLOPE = 0.25;
const FEATHER_HEIGHT = 0.3;
/** A splash-up leaves at this share of the lip's impact speed, upward, and keeps this share of its horizontal speed. */
const SPLASH_UP = { min: 0.3, max: 0.8 };
const SPLASH_FORWARD = { min: 0.2, max: 0.6 };
const WET = 0.05;
const WATER_DENSITY = 1025;
/** Floats per particle in `particles`: x, y, z, size (m), opacity. */
export const SPRAY_STRIDE = 5;

type Kind = 0 | 1;
const SPRAY: Kind = 0;
const MIST: Kind = 1;

/**
 * Spray and mist (plan §2.6, G6): pooled particles marking where the water's
 * kinetic energy converts, launched from lip impacts (splash-up with the
 * parcel's own momentum), from bore faces, and blown off steep crests by
 * offshore wind. They fly ballistically with quadratic air drag toward the
 * wind, and end when they fall back through the surface or their time is up.
 * Visual only, with no rendering dependency, so it runs in the worker beside
 * the water; `SprayPoints` draws it.
 */
export class SprayCloud {
  /** Per live particle: x, y, z, size, opacity (`SPRAY_STRIDE`), packed at the front. */
  readonly particles: Float32Array;
  count = 0;
  private readonly x: Float64Array;
  private readonly y: Float64Array;
  private readonly z: Float64Array;
  private readonly vx: Float64Array;
  private readonly vy: Float64Array;
  private readonly vz: Float64Array;
  private readonly age: Float64Array;
  private readonly life: Float64Array;
  /** g / v_t², 1/m: the quadratic drag giving each particle its terminal speed. */
  private readonly drag: Float64Array;
  private readonly size: Float64Array;
  private readonly kind: Uint8Array;
  private readonly random: () => number;

  constructor(seed: number, readonly capacity = 4096) {
    this.random = seededRandom(seed, 0x5b1a54);
    const make = () => new Float64Array(capacity);
    this.x = make(); this.y = make(); this.z = make();
    this.vx = make(); this.vy = make(); this.vz = make();
    this.age = make(); this.life = make(); this.drag = make(); this.size = make();
    this.kind = new Uint8Array(capacity);
    this.particles = new Float32Array(capacity * SPRAY_STRIDE);
  }

  update(scene: SprayScene, dt: number): void {
    if (!(dt > 0)) return;
    this.fly(scene, dt);
    for (const impact of scene.lipImpacts) this.splash(scene, impact);
    this.boreSpray(scene, dt);
    this.feather(scene, dt);
    this.pack();
  }

  clear(): void {
    this.count = 0;
  }

  private fly(scene: SprayScene, dt: number): void {
    const { solver, windSpeed } = scene;
    for (let k = 0; k < this.count; k += 1) {
      // Quadratic drag toward the wind (implicit in the drag's size, so light mist cannot overshoot it).
      const rx = this.vx[k];
      const ry = this.vy[k];
      const rz = this.vz[k] - windSpeed;
      const speed = Math.hypot(rx, ry, rz);
      const damping = 1 / (1 + dt * this.drag[k] * speed);
      this.vx[k] = rx * damping;
      this.vy[k] = ry * damping - GRAVITY * dt;
      this.vz[k] = rz * damping + windSpeed;
      this.x[k] += this.vx[k] * dt;
      this.y[k] += this.vy[k] * dt;
      this.z[k] += this.vz[k] * dt;
      this.age[k] += dt;
      const cell = solver.cellIndex(this.x[k], this.z[k]);
      const surface = solver.h[cell] + solver.bed[cell];
      const landed = this.vy[k] < 0 && this.y[k] <= surface;
      if (landed || this.age[k] > this.life[k]) this.remove(k--);
    }
  }

  /** Splash-up where a lip parcel lands: drops launched up and on with its momentum, in proportion to its kinetic energy. */
  private splash(scene: SprayScene, impact: LipImpact): void {
    const speed = Math.hypot(impact.vx, impact.vy, impact.vz);
    const energy = 0.5 * WATER_DENSITY * impact.volume * speed * speed;
    const expected = energy * SPRAY_PER_JOULE;
    let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
    const cell = scene.solver.cellIndex(impact.x, impact.z);
    const surface = scene.solver.h[cell] + scene.solver.bed[cell];
    for (; spawns > 0 && this.count < this.capacity; spawns -= 1) {
      const up = speed * this.between(SPLASH_UP);
      const forward = this.between(SPLASH_FORWARD);
      const spread = 1.5;
      const mist = this.random() < 0.2;
      this.spawn(
        mist ? MIST : SPRAY,
        impact.x + (this.random() - 0.5) * 0.8, surface + 0.05, impact.z + (this.random() - 0.5) * 0.8,
        impact.vx * forward + (this.random() - 0.5) * spread, up, impact.vz * forward + (this.random() - 0.5) * spread,
      );
    }
  }

  /** Drops thrown up at bore faces, where the foam field sees bores dissipate. */
  private boreSpray(scene: SprayScene, dt: number): void {
    const { solver, foam } = scene;
    const { nx, xCenters, zCenters, dx, dz, h, bed, qx, qz } = solver;
    const source = foam.source;
    const start = Math.floor(this.random() * source.length);
    for (let n = 0; n < source.length && this.count < this.capacity; n += 1) {
      const i = (start + n) % source.length;
      if (!(source[i] > 0) || h[i] <= WET) continue;
      const row = Math.floor(i / nx);
      const expected = source[i] * dt * dx * dz[row] * SPRAY_PER_FOAM;
      let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
      const surface = h[i] + bed[i];
      const u = qx[i] / h[i];
      const w = qz[i] / h[i];
      const lift = Math.sqrt(GRAVITY * h[i]) * 0.4;
      for (; spawns > 0 && this.count < this.capacity; spawns -= 1) {
        this.spawn(
          this.random() < 0.3 ? MIST : SPRAY,
          xCenters[i - row * nx] + (this.random() - 0.5) * dx, surface + 0.05, zCenters[row] + (this.random() - 0.5) * dz[row],
          u + (this.random() - 0.5), lift * (0.4 + 0.6 * this.random()), w + (this.random() - 0.5),
        );
      }
    }
  }

  /**
   * Offshore wind blowing spray back off steep crests (plan §1.8, Q23): where
   * the wind blows against a face standing high over the depth, a mist streams
   * off its top seaward, more of it the harder the wind blows.
   */
  private feather(scene: SprayScene, dt: number): void {
    const { solver, windSpeed } = scene;
    const excess = -windSpeed - FEATHER_ONSET;
    if (!(windSpeed < 0) || !(excess > 0)) return;
    const { nx, nz, xCenters, zCenters, dx, dz, h, bed, restLevel } = solver;
    for (let row = 1; row < nz - 1 && this.count < this.capacity; row += 1) {
      const gap = zCenters[row + 1] - zCenters[row - 1];
      for (let column = 0; column < nx && this.count < this.capacity; column += 1) {
        const i = row * nx + column;
        const depth = h[i];
        const still = restLevel - bed[i];
        if (depth <= WET || !(still > WET)) continue;
        const crest = depth + bed[i] - restLevel;
        if (crest < FEATHER_HEIGHT * still) continue;
        // The wind blows toward −z (offshore); the shoreward face of a crest rises toward it.
        const slope = (h[i - nx] + bed[i - nx] - (h[i + nx] + bed[i + nx])) / gap;
        if (slope < FEATHER_SLOPE) continue;
        const expected = FEATHER_RATE * excess * excess * dx * dz[row] * dt;
        let spawns = Math.floor(expected) + (this.random() < expected - Math.floor(expected) ? 1 : 0);
        for (; spawns > 0 && this.count < this.capacity; spawns -= 1) {
          this.spawn(
            MIST, xCenters[column] + (this.random() - 0.5) * dx, depth + bed[i] + 0.1, zCenters[row],
            (this.random() - 0.5) * 0.5, 0.5 + this.random(), windSpeed * (0.3 + 0.4 * this.random()),
          );
        }
      }
    }
  }

  private spawn(kind: Kind, x: number, y: number, z: number, vx: number, vy: number, vz: number): void {
    const k = this.count;
    this.x[k] = x;
    this.y[k] = y;
    this.z[k] = z;
    this.vx[k] = vx;
    this.vy[k] = vy;
    this.vz[k] = vz;
    this.age[k] = 0;
    this.kind[k] = kind;
    const fall = kind === SPRAY ? this.between(SPRAY_FALL) : this.between(MIST_FALL);
    this.drag[k] = GRAVITY / (fall * fall);
    this.life[k] = (kind === SPRAY ? SPRAY_LIFE : MIST_LIFE) * (0.6 + 0.4 * this.random());
    this.size[k] = kind === SPRAY ? 0.06 + 0.08 * this.random() : 0.35 + 0.45 * this.random();
    this.count += 1;
  }

  private remove(k: number): void {
    this.count -= 1;
    const last = this.count;
    this.x[k] = this.x[last];
    this.y[k] = this.y[last];
    this.z[k] = this.z[last];
    this.vx[k] = this.vx[last];
    this.vy[k] = this.vy[last];
    this.vz[k] = this.vz[last];
    this.age[k] = this.age[last];
    this.life[k] = this.life[last];
    this.drag[k] = this.drag[last];
    this.size[k] = this.size[last];
    this.kind[k] = this.kind[last];
  }

  private pack(): void {
    for (let k = 0; k < this.count; k += 1) {
      const o = k * SPRAY_STRIDE;
      const t = this.age[k] / this.life[k];
      const mist = this.kind[k] === MIST;
      this.particles[o] = this.x[k];
      this.particles[o + 1] = this.y[k];
      this.particles[o + 2] = this.z[k];
      this.particles[o + 3] = this.size[k] * (mist ? 1 + t : 1);
      this.particles[o + 4] = (mist ? 0.25 : 0.8) * (1 - t * t);
    }
  }

  private between(range: { min: number; max: number }): number {
    return range.min + (range.max - range.min) * this.random();
  }
}
