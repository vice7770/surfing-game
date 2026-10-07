import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** What the render source needs from a physical surf zone (a `SurfZoneSimulation`). */
export interface RenderableSurfZone {
  readonly windowXMin: number;
  readonly seaTime: number;
  /** Changes when a new snapshot is published, including a refresh at the same sea time. */
  readonly revision?: unknown;
  renderGrid(spacing: number): SurfaceGrid;
  writeUniformSurface(data: Float32Array, grid: SurfaceGrid, carve?: boolean): void;
  /** The flying tubes as a `tubeTable` (G9), for a renderer that cuts them itself; returns how many. */
  writeTubes?(into: Float32Array): number;
  /** The width of the columns the tubes are thrown in, m. */
  readonly tubeColumnWidth?: number;
  /** G9: the aeration, (void fraction, plume depth) per render node. */
  writeUniformAeration?(data: Float32Array, grid: SurfaceGrid): void;
  /**
   * S3: the roller lenses' table (`ROLLER_FIELD`, slot-major, 2 × columns × 8) at a spilling spot; returns its columns.
   * `rollerColumns` is 0 where the sea has no roller; the first column's centre x and the columns' width, m.
   */
  writeRoller?(into: Float32Array): number;
  readonly rollerColumns?: number;
  readonly rollerColumn0?: number;
  readonly rollerColumnWidth?: number;
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
  /** S3: the roller lenses' table, when the surf zone has a roller, for both looks to draw the band. */
  readonly writeRoller?: (into: Float32Array) => number;
  readonly rollerColumns?: number;
  private readonly rollerSource?: RenderableSurfZone;

  constructor(private readonly simulation: RenderableSurfZone, spacing = 1) {
    this.grid = simulation.renderGrid(spacing);
    if (simulation.writeTubes) {
      this.writeTubes = (into) => simulation.writeTubes!(into);
      this.tubeColumnWidth = simulation.tubeColumnWidth;
    }
    if (simulation.writeRoller && (simulation.rollerColumns ?? 0) > 0) {
      this.writeRoller = (into) => simulation.writeRoller!(into);
      this.rollerColumns = simulation.rollerColumns;
      this.rollerSource = simulation;
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

  /** S3: the roller table's first column's centre x and the columns' width, m; absent without a roller. */
  get rollerColumn0(): number | undefined {
    return this.rollerSource?.rollerColumn0;
  }

  get rollerColumnWidth(): number | undefined {
    return this.rollerSource?.rollerColumnWidth;
  }

  get revision(): unknown {
    return this.simulation.revision;
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
