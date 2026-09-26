import { exactWaveNumber } from '../wave/dispersion';
import type { SurfWater, WaterSample } from './SurfWater';

export interface SwellOptions {
  /** Wave height crest to trough, m. */
  height?: number;
  period?: number;
  /** Direction of travel, rad from +z toward +x. */
  direction?: number;
  depth?: number;
}

/**
 * One linear (Airy) wave train over a flat bed, for controlled body tests that
 * need moving water: elevation, slope and the orbital flow at the sampled
 * height (Wheeler-stretched into the crest). `advance` moves it on in time.
 */
export class SwellWater implements SurfWater {
  time = 0;
  private readonly amplitude: number;
  private readonly omega: number;
  private readonly kx: number;
  private readonly kz: number;
  private readonly k: number;
  private readonly depth: number;

  constructor(options: SwellOptions = {}) {
    this.amplitude = (options.height ?? 0.5) / 2;
    this.omega = (2 * Math.PI) / (options.period ?? 8);
    this.depth = options.depth ?? 20;
    this.k = exactWaveNumber(this.omega, this.depth);
    const direction = options.direction ?? 0;
    this.kx = this.k * Math.sin(direction);
    this.kz = this.k * Math.cos(direction);
  }

  advance(dt: number): void {
    this.time += dt;
  }

  surfaceAt(x: number, z: number): number {
    return this.amplitude * Math.cos(this.kx * x + this.kz * z - this.omega * this.time);
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const phase = this.kx * x + this.kz * z - this.omega * this.time;
    const a = this.amplitude;
    const surface = a * Math.cos(phase);
    const slopeX = -a * this.kx * Math.sin(phase);
    const slopeZ = -a * this.kz * Math.sin(phase);
    const norm = Math.hypot(slopeX, 1, slopeZ);
    const d = this.depth;
    // Wheeler stretching: the column from bed to surface maps onto the still one.
    const clamped = Math.min(y, surface);
    const stretched = ((clamped + d) * d) / (d + surface) - d;
    const kd = this.k * d;
    const level = this.k * (stretched + d);
    const horizontal = (a * this.omega * Math.cosh(level)) / Math.sinh(kd);
    const vertical = (a * this.omega * Math.sinh(level)) / Math.sinh(kd);
    const along = Math.cos(phase);
    Object.assign(out, {
      surfaceY: surface, stillDepth: d, waterDepth: d + surface, bedY: -d, wet: true, outsideDomain: false,
      slopeX, slopeZ, normalX: -slopeX / norm, normalY: 1 / norm, normalZ: -slopeZ / norm,
      flowX: (horizontal * along * this.kx) / this.k, flowY: vertical * Math.sin(phase), flowZ: (horizontal * along * this.kz) / this.k,
      regime: 'profile', breaking: 0,
    });
    return out;
  }

  addReaction(): void {}
}
