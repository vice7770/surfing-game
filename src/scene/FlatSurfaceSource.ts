import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** A still sea on a tiny grid: what the water mesh holds before any surf zone runs (it stays hidden until one does). */
export class FlatSurfaceSource implements SurfaceSource {
  readonly grid: SurfaceGrid = { xMin: -1, zMin: -1, spacing: 1, nx: 3, nz: 3 };
  readonly time = 0;
  readonly bedRevision = 0;

  write(data: Float32Array): void {
    data.fill(0);
  }

  writeBed(data: Float32Array): void {
    data.fill(-5);
  }
}
