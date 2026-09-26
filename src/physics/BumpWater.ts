import type { SurfWater, WaterSample } from './SurfWater';

export interface BumpOptions {
  /** The mean surface's slope along z (negative falls toward +z). */
  slopeZ: number;
  /** Height of the bumps above and below the mean surface, m. */
  amplitude: number;
  /** Distance between bump crests along z, m. */
  wavelength: number;
  /** Water depth under the surface, m. */
  depth?: number;
}

/**
 * A still, bumpy slope for controlled body tests (P9 pumping): the surface
 * y = slopeZ z + amplitude cos(2π z / wavelength), with no flow. A board riding
 * down it follows a curved path, so the load on its rider's feet rises in the
 * hollows and falls over the bumps, as on a wave face in S-turns.
 */
export class BumpWater implements SurfWater {
  private readonly k: number;

  constructor(private readonly o: BumpOptions) {
    this.k = (2 * Math.PI) / o.wavelength;
  }

  surfaceAt(_x: number, z: number): number {
    return this.o.slopeZ * z + this.o.amplitude * Math.cos(this.k * z);
  }

  sampleAt(x: number, _y: number, z: number, out: WaterSample): WaterSample {
    const depth = this.o.depth ?? 3;
    const surface = this.surfaceAt(x, z);
    const slopeZ = this.o.slopeZ - this.o.amplitude * this.k * Math.sin(this.k * z);
    const norm = Math.hypot(slopeZ, 1);
    Object.assign(out, {
      surfaceY: surface, stillDepth: depth, waterDepth: depth, bedY: surface - depth,
      wet: true, outsideDomain: false, slopeX: 0, slopeZ, normalX: 0, normalY: 1 / norm, normalZ: -slopeZ / norm,
      flowX: 0, flowY: 0, flowZ: 0, regime: 'profile', breaking: 0,
    });
    return out;
  }

  addReaction(): void {}
}
