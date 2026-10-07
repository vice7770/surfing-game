import type { SurfWater, WaterSample } from '../SurfWater';

/**
 * Another water under a tube's curl, for tests: while `over()` holds, every point above its surface reports `covered`,
 * as the swept contact does in the tube's air before touchdown. The curl stands high overhead: no ceiling is sampled,
 * so nothing touches it and the water's forces are the inner water's.
 */
export class CoveredWater implements SurfWater {
  constructor(private readonly inner: SurfWater, private readonly over: () => boolean = () => true) {}

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    this.inner.sampleAt(x, y, z, out);
    out.covered = this.over() && y > out.surfaceY ? true : undefined;
    return out;
  }

  surfaceAt(x: number, z: number): number {
    return this.inner.surfaceAt(x, z);
  }

  addReaction(x: number, z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    this.inner.addReaction(x, z, impulseX, impulseY, impulseZ);
  }
}
