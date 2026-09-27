import { Vector3 } from 'three';
import { eddyVelocity } from './eddies';
import type { BodyWaterField, BodyWaterSample } from './DetachedSurfer';
import { createWaterSample, type SurfWater } from './SurfWater';

/**
 * The detached surfer's water contract answered through the one `SurfWater`
 * seam, so the surfer and the board sample the same water (surfer plan S0).
 * With a clock, the turbulence's eddies join the flow (the wipeout spec, Part
 * B): each of the swimmer's seven points feels its own, where a board and a
 * rider, spanning several, would average them out.
 */
export class SurfWaterBodyField implements BodyWaterField {
  private readonly sample = createWaterSample();
  private readonly eddy = new Vector3();

  constructor(private readonly water: SurfWater, private readonly clock?: () => number) {}

  sampleAt(position: Readonly<Vector3>, out: BodyWaterSample): void {
    const sample = this.water.sampleAt(position.x, position.y, position.z, this.sample);
    out.surfaceY = sample.surfaceY;
    out.bedY = sample.bedY;
    out.flow.set(sample.flowX, sample.flowY, sample.flowZ);
    const k = sample.turbulence ?? 0;
    if (this.clock && k > 0 && sample.wet && !sample.outsideDomain) {
      out.flow.add(eddyVelocity(position.x, position.y, position.z, this.clock(), k, this.eddy));
    }
    out.wet = sample.wet;
    out.outsideDomain = sample.outsideDomain;
    out.breaking = sample.breaking;
    out.voidFraction = sample.voidFraction ?? 0;
    out.flowModel = sample.outsideDomain ? 'outside' : sample.wet ? 'reconstructed' : 'dry';
  }
}
