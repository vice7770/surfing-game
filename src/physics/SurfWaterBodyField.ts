import type { Vector3 } from 'three';
import type { BodyWaterField, BodyWaterSample } from './DetachedSurfer';
import { createWaterSample, type SurfWater } from './SurfWater';

/**
 * The detached surfer's water contract answered through the one `SurfWater`
 * seam, so the surfer and the board sample the same water (surfer plan S0).
 */
export class SurfWaterBodyField implements BodyWaterField {
  private readonly sample = createWaterSample();

  constructor(private readonly water: SurfWater) {}

  sampleAt(position: Readonly<Vector3>, out: BodyWaterSample): void {
    const sample = this.water.sampleAt(position.x, position.y, position.z, this.sample);
    out.surfaceY = sample.surfaceY;
    out.bedY = sample.bedY;
    out.flow.set(sample.flowX, sample.flowY, sample.flowZ);
    out.wet = sample.wet;
    out.outsideDomain = sample.outsideDomain;
    out.breaking = sample.breaking;
    out.flowModel = sample.outsideDomain ? 'outside' : sample.wet ? 'reconstructed' : 'dry';
  }
}
