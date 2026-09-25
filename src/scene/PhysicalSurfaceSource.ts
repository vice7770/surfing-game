import type { SurfZoneSimulation } from '../wave/SurfZoneSimulation';
import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** The physical surf zone resampled onto a uniform render grid that follows the sliding window. */
export class PhysicalSurfaceSource implements SurfaceSource {
  readonly grid: SurfaceGrid;

  constructor(private readonly simulation: SurfZoneSimulation, spacing = 1) {
    this.grid = simulation.renderGrid(spacing);
  }

  get waveHeight(): number {
    return this.simulation.config.significantHeight;
  }

  write(data: Float32Array): void {
    this.grid.xMin = this.simulation.windowXMin;
    this.simulation.writeUniformSurface(data, this.grid);
  }
}
