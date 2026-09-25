import type { InteractiveWaterField } from '../wave/WaveModel';

/**
 * How the flow at a sampled depth was obtained:
 * - `surface`: the field's surface velocity, whatever the depth (legacy);
 * - `profile`: the linear-theory vertical profile of the depth-averaged flow (§1.10);
 * - `bore`: depth-averaged flow under breaking water, where the linear profile does not hold;
 * - `shallow`: depth-averaged flow where kh is too small to shape a profile;
 * - `dry` or `outside`: no water at the point, or no simulation there.
 */
export type FlowRegime = 'surface' | 'profile' | 'bore' | 'shallow' | 'dry' | 'outside';

/** The water at one world point, in SI units with x along shore, z toward the beach and y up. */
export interface WaterSample {
  surfaceY: number;
  /** Still-water depth over the bed, m (0 on land). */
  stillDepth: number;
  /** Depth of the water column at the point, m. */
  waterDepth: number;
  /** Height of the seabed, m (−∞ outside the domain). */
  bedY: number;
  wet: boolean;
  /** The point lies beyond the simulated water; the values are then only a flat-sea stand-in. */
  outsideDomain: boolean;
  slopeX: number;
  slopeZ: number;
  normalX: number;
  normalY: number;
  normalZ: number;
  /** Water velocity at the sampled depth, m/s. A physical vertical component is a reconstruction, not solver state. */
  flowX: number;
  flowY: number;
  flowZ: number;
  regime: FlowRegime;
  /** Breaking strength B in [0, 1]. */
  breaking: number;
}

export function createWaterSample(): WaterSample {
  return {
    surfaceY: 0, stillDepth: 0, waterDepth: 0, bedY: -Infinity, wet: false, outsideDomain: false, slopeX: 0, slopeZ: 0,
    normalX: 0, normalY: 1, normalZ: 0, flowX: 0, flowY: 0, flowZ: 0, regime: 'outside', breaking: 0,
  };
}

/**
 * The one water-sampling interface for the board and the rider (board plan B0,
 * wave plan P4b): the renderer and every body sample the same field through
 * it, in world coordinates. A sample and the force applied from it belong to
 * the same fixed step.
 */
export interface SurfWater {
  /** The water at (x, z), with the flow at height `y` (clamped into the water column). */
  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample;
  surfaceAt(x: number, z: number): number;
  /**
   * Hand the water the reaction to impulse J, N·s, that it exerted on a body at
   * (x, z) this step: the water takes −J. A depth-averaged field can only take
   * the horizontal part; how an adapter treats the vertical part is its own.
   */
  addReaction(x: number, z: number, impulseX: number, impulseY: number, impulseZ: number): void;
}

/**
 * The legacy `InteractiveWaterField` through the seam, returning exactly what
 * its `sample()` does: surface velocity whatever the depth, and a flat-sea zero
 * outside the grid, now reported as `outsideDomain`.
 */
export class LegacySurfWater implements SurfWater {
  constructor(readonly wave: InteractiveWaterField) {}

  sampleAt(x: number, _y: number, z: number, out: WaterSample): WaterSample {
    const { wave } = this;
    const sample = wave.sample(x, z);
    const gx = (x - wave.xMin) / wave.spacing;
    const gz = (z - wave.zMin) / wave.spacing;
    out.surfaceY = sample.height;
    out.stillDepth = wave.depthAt(x, z);
    out.waterDepth = out.stillDepth + sample.height;
    out.bedY = -out.stillDepth;
    out.wet = true;
    out.outsideDomain = gx < 0 || gz < 0 || gx >= wave.nx - 1 || gz >= wave.nz - 1;
    out.slopeX = sample.slopeX;
    out.slopeZ = sample.slopeZ;
    out.normalX = sample.normal.x;
    out.normalY = sample.normal.y;
    out.normalZ = sample.normal.z;
    out.flowX = sample.velocity.x;
    out.flowY = sample.velocity.y;
    out.flowZ = sample.velocity.z;
    out.regime = 'surface';
    out.breaking = sample.breaking;
    return out;
  }

  surfaceAt(x: number, z: number): number {
    return this.wave.heightAt(x, z);
  }

  addReaction(x: number, z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    this.wave.applyBoardImpulse(x, z, impulseX, impulseY, impulseZ);
  }
}
