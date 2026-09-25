import type { SurfWater, WaterSample } from './SurfWater';

export interface PlaneOptions {
  /** Surface y = level + slopeX x + slopeZ z. */
  level?: number;
  slopeX?: number;
  slopeZ?: number;
  flow?: { x: number; y: number; z: number };
  /** Water depth under the surface; 0 makes dry ground at `level`. */
  depth?: number;
  inside?: (x: number, z: number) => boolean;
}

/**
 * An analytic sheet of water for controlled body tests: hydrostatic pressure
 * under a plane surface, a uniform current, and a record of the reactions it
 * receives.
 */
export class PlaneWater implements SurfWater {
  readonly reaction = { x: 0, y: 0, z: 0 };
  reactions = 0;
  constructor(private readonly o: PlaneOptions = {}) {}

  surfaceAt(x: number, z: number): number {
    return (this.o.level ?? 0) + (this.o.slopeX ?? 0) * x + (this.o.slopeZ ?? 0) * z;
  }

  sampleAt(x: number, _y: number, z: number, out: WaterSample): WaterSample {
    const depth = this.o.depth ?? 3;
    const inside = this.o.inside ? this.o.inside(x, z) : true;
    const flow = this.o.flow ?? { x: 0, y: 0, z: 0 };
    const surface = this.surfaceAt(x, z);
    const slopeX = this.o.slopeX ?? 0;
    const slopeZ = this.o.slopeZ ?? 0;
    const norm = Math.hypot(slopeX, 1, slopeZ);
    Object.assign(out, {
      surfaceY: depth > 0 ? surface : surface - 0.05, stillDepth: depth, waterDepth: depth, bedY: inside ? surface - depth : -Infinity,
      wet: inside && depth > 0.01, outsideDomain: !inside, slopeX, slopeZ, normalX: -slopeX / norm, normalY: 1 / norm, normalZ: -slopeZ / norm,
      flowX: flow.x, flowY: flow.y, flowZ: flow.z, regime: inside ? (depth > 0.01 ? 'profile' : 'dry') : 'outside', breaking: 0,
    });
    return out;
  }

  addReaction(_x: number, _z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    this.reaction.x += impulseX;
    this.reaction.y += impulseY;
    this.reaction.z += impulseZ;
    this.reactions += 1;
  }
}
