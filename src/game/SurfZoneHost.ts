import type { RenderableSurfZone } from '../scene/PhysicalSurfaceSource';
import { sampleSurfaceBed, sampleSurfaceHeight, type SurfaceGrid } from '../scene/WaterSurface';
import { SurfZoneRunner, type SurfZoneBuffers, type SurfZoneRunnerOptions, type SurfZoneStatus } from '../wave/SurfZoneRunner';
import type { RenderGrid, SurfZoneConfig } from '../wave/SurfZoneSimulation';

/** What a surf zone fixes when it starts: its render grid, bed, break focus, window and solver column width. */
export interface SurfZoneInit {
  grid: RenderGrid;
  bed: Float32Array;
  focus: { x: number; z: number };
  windowXMin: number;
  dx: number;
}

/** One rendered moment of a surf zone. */
export interface SurfZoneSnapshot extends SurfZoneBuffers {
  status: SurfZoneStatus;
}

/**
 * The main thread's only view of a running physical surf zone (plan §3.2, P4a).
 * It renders the latest snapshot and asks for fixed steps; whoever implements it
 * (the page, or a Web Worker) owns the physics.
 */
export interface SurfZoneHost {
  readonly config: SurfZoneConfig;
  /** Resolves once the surf zone has spun up and `init` and `snapshot` exist. */
  readonly ready: Promise<void>;
  readonly init: SurfZoneInit;
  readonly snapshot: SurfZoneSnapshot;
  /** Request `steps` fixed physics steps (`SURF_ZONE_STEP` each). */
  advance(steps: number): void;
  /** Rendered water surface at (x, z), m: the same lookup the water shader uses. */
  heightAt(x: number, z: number): number;
  bedAt(x: number, z: number): number;
  dispose(): void;
}

/** Shared by hosts: surface and bed lookups on the snapshot's render data. */
export abstract class SnapshotSampler {
  abstract readonly init: SurfZoneInit;
  abstract readonly snapshot: SurfZoneSnapshot;

  heightAt(x: number, z: number): number {
    return sampleSurfaceHeight(this.snapshot.surface, this.init.grid, x, z);
  }

  bedAt(x: number, z: number): number {
    return sampleSurfaceBed(this.init.bed, this.init.grid, x, z);
  }
}

/** Runs the surf zone in the page: used by tests, and where Web Workers are unavailable. */
export class LocalSurfZone extends SnapshotSampler implements SurfZoneHost {
  readonly ready = Promise.resolve();
  readonly runner: SurfZoneRunner;
  readonly init: SurfZoneInit;
  readonly snapshot: SurfZoneSnapshot;

  constructor(readonly config: SurfZoneConfig, options: SurfZoneRunnerOptions = {}) {
    super();
    this.runner = new SurfZoneRunner(config, options);
    this.init = {
      grid: { ...this.runner.grid }, bed: this.runner.bed, focus: this.runner.focus,
      windowXMin: this.runner.windowXMin, dx: this.runner.simulation.solver.dx,
    };
    this.snapshot = { ...this.runner.createBuffers(), status: this.runner.status() };
    this.refresh();
  }

  advance(steps: number): void {
    if (steps <= 0) return;
    this.runner.advance(steps);
    this.refresh();
  }

  dispose(): void {}

  /** Snapshot the runner again (tests use it after changing the simulation directly). */
  refresh(): void {
    this.runner.fill(this.snapshot);
    this.snapshot.status = this.runner.status();
  }
}

/** A host's snapshots in the shape `PhysicalSurfaceSource` resamples: copies of the render data. */
export class SnapshotSurfZone implements RenderableSurfZone {
  constructor(private readonly host: SurfZoneHost) {}

  get windowXMin(): number {
    return this.host.init.windowXMin;
  }

  get seaTime(): number {
    return this.host.snapshot.status.seaTime;
  }

  renderGrid(spacing: number): SurfaceGrid {
    if (spacing !== this.host.init.grid.spacing) throw new RangeError(`The surf zone renders at ${this.host.init.grid.spacing} m, not ${spacing} m`);
    return { ...this.host.init.grid };
  }

  writeUniformSurface(data: Float32Array): void {
    data.set(this.host.snapshot.surface);
  }

  writeUniformBed(data: Float32Array): void {
    data.set(this.host.init.bed);
  }

  writeUniformFlow(data: Float32Array): void {
    data.set(this.host.snapshot.flow);
  }
}
