import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** What the render source needs from a physical surf zone (a `SurfZoneSimulation`). */
export interface RenderableSurfZone {
  readonly windowXMin: number;
  readonly seaTime: number;
  renderGrid(spacing: number): SurfaceGrid;
  writeUniformSurface(data: Float32Array, grid: SurfaceGrid, carve?: boolean): void;
  /** The flying tubes as a `tubeTable` (G9), for a renderer that cuts them itself; returns how many. */
  writeTubes?(into: Float32Array): number;
  /** The width of the columns the tubes are thrown in, m. */
  readonly tubeColumnWidth?: number;
  /** G9: the aeration, (void fraction, plume depth) per render node. */
  writeUniformAeration?(data: Float32Array, grid: SurfaceGrid): void;
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
  /** Its bodies ride a Catmull-Rom surface over these nodes (`PhysicalSurfWater`), so the Rich water draws that (G8). */
  readonly cubic = true;

  /** G9: the flying tubes, when the surf zone offers them, so the Rich water can cut them itself. */
  readonly writeTubes?: (into: Float32Array) => number;
  readonly tubeColumnWidth?: number;
  /** G9: the air breaking drove in, when the surf zone offers it. */
  readonly writeAeration?: (data: Float32Array) => void;

  constructor(private readonly simulation: RenderableSurfZone, spacing = 1) {
    this.grid = simulation.renderGrid(spacing);
    if (simulation.writeTubes) {
      this.writeTubes = (into) => simulation.writeTubes!(into);
      this.tubeColumnWidth = simulation.tubeColumnWidth;
    }
    if (simulation.writeUniformAeration) {
      this.writeAeration = (data) => {
        this.grid.xMin = simulation.windowXMin;
        simulation.writeUniformAeration!(data, this.grid);
      };
    }
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

  write(data: Float32Array, carve = true): void {
    this.grid.xMin = this.simulation.windowXMin;
    this.simulation.writeUniformSurface(data, this.grid, carve);
  }

  writeFlow(data: Float32Array): void {
    this.grid.xMin = this.simulation.windowXMin;
    this.simulation.writeUniformFlow(data, this.grid);
  }
}
