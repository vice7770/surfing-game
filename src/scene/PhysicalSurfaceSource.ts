import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** What the render source needs from a physical surf zone (a `SurfZoneSimulation`). */
export interface RenderableSurfZone {
  readonly windowXMin: number;
  readonly seaTime: number;
  renderGrid(spacing: number): SurfaceGrid;
  writeUniformSurface(data: Float32Array, grid: SurfaceGrid): void;
  writeUniformBed(data: Float32Array, grid: SurfaceGrid): void;
  writeUniformFlow(data: Float32Array, grid: SurfaceGrid): void;
}

/**
 * The physical surf zone resampled onto a uniform render grid that follows the
 * sliding window. Its foam is the surf zone's foam field, which carries the
 * whitewater's history on the solver grid (plan §2.4).
 */
export class PhysicalSurfaceSource implements SurfaceSource {
  readonly grid: SurfaceGrid;

  constructor(private readonly simulation: RenderableSurfZone, spacing = 1) {
    this.grid = simulation.renderGrid(spacing);
  }

  get time(): number {
    return this.simulation.seaTime;
  }

  /** The seabed is fixed, so it only changes when the window slides. */
  get bedRevision(): number {
    return this.simulation.windowXMin;
  }

  writeBed(data: Float32Array): void {
    this.grid.xMin = this.simulation.windowXMin;
    this.simulation.writeUniformBed(data, this.grid);
  }

  write(data: Float32Array): void {
    this.grid.xMin = this.simulation.windowXMin;
    this.simulation.writeUniformSurface(data, this.grid);
  }

  writeFlow(data: Float32Array): void {
    this.grid.xMin = this.simulation.windowXMin;
    this.simulation.writeUniformFlow(data, this.grid);
  }
}
