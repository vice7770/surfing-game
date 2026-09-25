import { GRAVITY } from './dispersion';
import type { ShallowWaterSolver } from './ShallowWaterSolver';

/** Launch-speed spread across the parcels of one throw; the mean is 1, so the throw carries its nominal momentum. */
const PARCEL_SPEEDS = [0.8, 0.8 + 0.4 / 3, 0.8 + 0.8 / 3, 1.2];
/** Largest share of a source cell's water one throw may take. */
const SOURCE_SHARE = 0.2;
/** Parcels still airborne after this long land where they are, s. */
const MAX_FLIGHT = 3;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * Overturn area A/H² against U/C (positive onshore), through the Surf Ranch
 * values of Feddersen et al. (2023): ≈ 0.2 at U/C = 0.75 and ≈ 0.4 for offshore
 * U/C < −0.4, clamped to that range.
 */
export function overturnArea(windOverCelerity: number): number {
  return clamp(0.2 + (0.2 * (0.75 - windOverCelerity)) / 1.15, 0.2, 0.4);
}

/**
 * Tube width-to-length ratio W/L. The ξ_b mapping is the plan's modeling choice
 * (Q12): almond (1:3) at ξ = 0.4 to round (1:1) at ξ = 2.0, after passyworld's
 * tube ratios. Wind tilts it by −0.18 per unit U/C, the slope of Feddersen et
 * al. (2023): W/L ≈ 0.48 offshore to ≈ 0.25 at U/C = 0.75.
 */
export function tubeWidthRatio(iribarren: number, windOverCelerity: number): number {
  const plunge = clamp((iribarren - 0.4) / 1.6, 0, 1);
  return clamp(1 / 3 + (2 / 3) * plunge - 0.18 * windOverCelerity, 0.2, 1);
}

export interface LipConditions {
  /** Local breaker-point Iribarren number ξ_b. */
  iribarren: number;
  /** Breaker height H_b, m. */
  breakerHeight: number;
  /** Local wind over the breaker celerity, positive onshore. */
  windOverCelerity: number;
  /** Crest length the throw covers, m. */
  width: number;
}

export interface LipThrow {
  /** Water thrown, m³: the overturn area times the crest length. */
  volume: number;
  /** Level launch speed that lands the lip one tube length L = H·(L/W) ahead, m/s. */
  speed: number;
  widthRatio: number;
}

/** A lip only leaves plunging breakers, 0.4 ≤ ξ_b ≤ 2.0 (plan §1.9, Q12). */
export function lipThrow(conditions: LipConditions): LipThrow | undefined {
  const { iribarren, breakerHeight, windOverCelerity, width } = conditions;
  if (!(iribarren >= 0.4 && iribarren <= 2) || !(breakerHeight > 0)) return undefined;
  const widthRatio = tubeWidthRatio(iribarren, windOverCelerity);
  return {
    volume: overturnArea(windOverCelerity) * breakerHeight * breakerHeight * width,
    speed: Math.sqrt((GRAVITY * breakerHeight) / 2) / widthRatio,
    widthRatio,
  };
}

/**
 * Mass-conserving plunging lip for the physical surf zone (plan §1.9, Q12).
 * A throw takes water from the crest cell and its across-shore neighbours (at
 * most a fifth of each), keeping their velocity, and launches it as ballistic
 * parcels. A parcel that falls back through the surface returns its volume and
 * horizontal momentum to the cell it lands in, which drives the splash-up and
 * the secondary bore; its vertical momentum is lost to turbulence. The parcels
 * are a coarse sample of the jet: one throw is four parcels.
 */
export class PlungingLip {
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  readonly volume: Float64Array;
  /** Landings since the lip was created. */
  landings = 0;
  private readonly vx: Float64Array;
  private readonly vy: Float64Array;
  private readonly vz: Float64Array;
  private readonly age: Float64Array;
  private readonly active: Uint8Array;
  private readonly free: number[] = [];

  constructor(private readonly solver: ShallowWaterSolver, readonly capacity = 4096) {
    this.x = new Float64Array(capacity);
    this.y = new Float64Array(capacity);
    this.z = new Float64Array(capacity);
    this.volume = new Float64Array(capacity);
    this.vx = new Float64Array(capacity);
    this.vy = new Float64Array(capacity);
    this.vz = new Float64Array(capacity);
    this.age = new Float64Array(capacity);
    this.active = new Uint8Array(capacity);
    for (let index = capacity - 1; index >= 0; index -= 1) this.free.push(index);
  }

  /**
   * Throw up to `volume` m³ from `cell` at `height` (m above datum) with
   * horizontal `velocity` (m/s). Returns the volume actually thrown: 0 when the
   * parcel pool is full or the crest is dry.
   */
  launch(cell: number, velocity: { x: number; z: number }, height: number, volume: number): number {
    if (this.free.length < PARCEL_SPEEDS.length || !(volume > 0)) return 0;
    const { solver } = this;
    const { nx, h, qx, qz, dx, dz } = solver;
    const row = Math.floor(cell / nx);
    const sources: number[] = [];
    let available = 0;
    for (const index of [cell - nx, cell, cell + nx]) {
      if (index < 0 || index >= h.length) continue;
      sources.push(index);
      available += SOURCE_SHARE * h[index] * dx * dz[Math.floor(index / nx)];
    }
    if (!(available > 0)) return 0;
    const thrown = Math.min(volume, available);
    const share = thrown / available;
    for (const index of sources) {
      const depth = h[index];
      if (!(depth > 0)) continue;
      const removed = share * SOURCE_SHARE * depth;
      qx[index] -= (qx[index] / depth) * removed;
      qz[index] -= (qz[index] / depth) * removed;
      h[index] = depth - removed;
    }
    const x = solver.xCenters[cell - row * nx];
    const z = solver.zCenters[row];
    for (const speed of PARCEL_SPEEDS) {
      const parcel = this.free.pop()!;
      this.active[parcel] = 1;
      this.x[parcel] = x;
      this.y[parcel] = height;
      this.z[parcel] = z;
      this.vx[parcel] = speed * velocity.x;
      this.vy[parcel] = 0;
      this.vz[parcel] = speed * velocity.z;
      this.volume[parcel] = thrown / PARCEL_SPEEDS.length;
      this.age[parcel] = 0;
    }
    return thrown;
  }

  /** Fly the parcels under gravity and land those that fall through the surface. */
  step(dt: number): void {
    if (!(dt > 0)) return;
    const { solver } = this;
    for (let parcel = 0; parcel < this.capacity; parcel += 1) {
      if (!this.active[parcel]) continue;
      this.vy[parcel] -= GRAVITY * dt;
      this.x[parcel] += this.vx[parcel] * dt;
      this.y[parcel] += this.vy[parcel] * dt;
      this.z[parcel] += this.vz[parcel] * dt;
      this.age[parcel] += dt;
      const surface = solver.sampleCentered(solver.h, this.x[parcel], this.z[parcel]) + solver.sampleCentered(solver.bed, this.x[parcel], this.z[parcel]);
      if ((this.vy[parcel] < 0 && this.y[parcel] <= surface) || this.age[parcel] > MAX_FLIGHT) this.land(parcel);
    }
  }

  airborneVolume(): number {
    let total = 0;
    for (let parcel = 0; parcel < this.capacity; parcel += 1) if (this.active[parcel]) total += this.volume[parcel];
    return total;
  }

  activeCount(): number {
    return this.capacity - this.free.length;
  }

  forEachActive(visit: (x: number, y: number, z: number, volume: number) => void): void {
    for (let parcel = 0; parcel < this.capacity; parcel += 1) {
      if (this.active[parcel]) visit(this.x[parcel], this.y[parcel], this.z[parcel], this.volume[parcel]);
    }
  }

  private land(parcel: number): void {
    const { solver } = this;
    const cell = solver.cellIndex(this.x[parcel], this.z[parcel]);
    const area = solver.dx * solver.dz[Math.floor(cell / solver.nx)];
    const depth = this.volume[parcel] / area;
    solver.h[cell] += depth;
    solver.qx[cell] += depth * this.vx[parcel];
    solver.qz[cell] += depth * this.vz[parcel];
    this.active[parcel] = 0;
    this.free.push(parcel);
    this.landings += 1;
  }
}
