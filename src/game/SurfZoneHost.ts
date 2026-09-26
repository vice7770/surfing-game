import type { RenderableSurfZone } from '../scene/PhysicalSurfaceSource';
import { sampleSurfaceBed, sampleSurfaceHeight, type SurfaceGrid } from '../scene/WaterSurface';
import { SurfZoneRunner, type RideRequest, type SurfZoneBuffers, type SurfZoneRunnerOptions, type SurfZoneStatus } from '../wave/SurfZoneRunner';
import type { RenderGrid, SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { compress, decodeSurfZoneState, encodeSurfZoneState } from '../wave/surfZoneState';
import { TUBE_STRIDE, carveAt, carveGrid } from '../wave/tubeTable';

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
  /** Request `steps` fixed physics steps (`SURF_ZONE_STEP` each), with the player's input for a ridden board. */
  advance(steps: number, input?: RideRequest, reactions?: ArrayLike<number>): void;
  /** Steps asked for that no snapshot shows yet (online pacing counts them, spec N1). */
  readonly outstandingSteps: number;
  /** This sea for a player joining late (spec N1): encoded, and compressed where the platform can. */
  exportState(): Promise<{ bytes: Uint8Array; deflated: boolean }>;
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
    const { snapshot } = this;
    return carveAt(snapshot.tubes, snapshot.tubeCount, this.init.dx, x, z, sampleSurfaceHeight(snapshot.surface, this.init.grid, x, z));
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

  /** `sea`: an encoded sea handed over by another player (spec N1). */
  constructor(readonly config: SurfZoneConfig, options: SurfZoneRunnerOptions = {}, sea?: Uint8Array) {
    super();
    this.runner = new SurfZoneRunner(config, options);
    if (sea) this.runner.simulation.importState(decodeSurfZoneState(sea));
    this.init = {
      grid: { ...this.runner.grid }, bed: this.runner.bed, focus: this.runner.focus,
      windowXMin: this.runner.windowXMin, dx: this.runner.simulation.solver.dx,
    };
    this.snapshot = { ...this.runner.createBuffers(), status: this.runner.status() };
    this.refresh();
  }

  private pendingPress = { popUp: false, retry: false };
  /** Other boards' pushes waiting for the next step (spec N1). */
  private pendingReactions: number[] = [];
  readonly outstandingSteps = 0;

  advance(steps: number, input?: RideRequest, reactions?: ArrayLike<number>): void {
    if (input) {
      this.pendingPress.popUp ||= input.popUp;
      this.pendingPress.retry ||= input.retry;
    }
    if (reactions) for (let i = 0; i < reactions.length; i += 1) this.pendingReactions.push(reactions[i]);
    if (steps <= 0) return;
    this.runner.advance(steps, input ? { ...input, ...this.pendingPress } : undefined, this.pendingReactions);
    this.pendingReactions = [];
    this.pendingPress = { popUp: false, retry: false };
    this.refresh();
  }

  exportState(): Promise<{ bytes: Uint8Array; deflated: boolean }> {
    return compress(encodeSurfZoneState(this.runner.simulation.exportState()));
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

  /** The snapshot's heights, carved by its tubes as the physics carves them unless `carve` is false (the Rich water cuts them itself, G9). */
  writeUniformSurface(data: Float32Array, grid: SurfaceGrid, carve = true): void {
    const { snapshot, init } = this.host;
    data.set(snapshot.surface);
    if (carve) carveGrid(data, grid, snapshot.tubes, snapshot.tubeCount, init.dx);
  }

  writeTubes(into: Float32Array): number {
    const { tubes, tubeCount } = this.host.snapshot;
    const count = Math.min(tubeCount, Math.floor(into.length / TUBE_STRIDE));
    into.set(tubes.subarray(0, count * TUBE_STRIDE));
    return count;
  }

  get tubeColumnWidth(): number {
    return this.host.init.dx;
  }

  writeUniformBed(data: Float32Array): void {
    data.set(this.host.init.bed);
  }

  writeUniformFlow(data: Float32Array): void {
    data.set(this.host.snapshot.flow);
  }
}
