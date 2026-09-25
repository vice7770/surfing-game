import { Vector3 } from 'three';
import { BoardBody } from '../physics/BoardBody';
import { PhysicalSurfWater } from '../physics/PhysicalSurfWater';
import type { PeelEstimate } from './Breaking';
import { BubbleCloud } from './BubbleCloud';
import { SurfZoneSimulation, type RenderGrid, type SurfZoneConfig } from './SurfZoneSimulation';
import type { BreakerType } from './SwellReadout';

export { surfZoneSea } from './SurfZoneSimulation';

/** Fixed simulation step, s: the game's physics rate. */
export const SURF_ZONE_STEP = 1 / 60;
/** Most lip parcels and bubbles a snapshot carries. */
const PARCEL_CAPACITY = 4096;
/** A riderless board waits this far seaward of the break line, m. */
const LINEUP_OFFSET = 25;

export interface SurfZoneRunnerOptions {
  /** Carry a riderless board on the water (P4c). */
  board?: boolean;
}

/** The Wave Lab readout's values, as plain data that can cross the worker boundary. */
export interface SurfZoneStatus {
  seaTime: number;
  timeToSet: number;
  /** Wall-clock time of the latest step, water and board, ms. */
  stepMs: number;
  cells: number;
  breakPoint: { x: number; z: number };
  /** Still depth at the break point, including tide, m. */
  breakDepth: number;
  breaker: { value: number; type: BreakerType };
  breakingFraction: number;
  peel?: PeelEstimate;
  lipLaunches: number;
  lipVolume: number;
  lipAirborne: number;
  onsetScale: number;
  /** The riderless board: its speed, m/s, and how often it left the water's domain and was put back in the lineup. */
  board?: { speed: number; resets: number };
}

/**
 * Arrays a snapshot fills: the render grid's (height, foam) and (u, w), packed
 * lip and bubble positions, and the board's pose (position, quaternion x y z w,
 * then 1 when there is a board).
 */
export interface SurfZoneBuffers {
  surface: Float32Array;
  flow: Float32Array;
  lip: Float32Array;
  lipCount: number;
  bubbles: Float32Array;
  bubbleCount: number;
  board: Float64Array;
}

/**
 * Steps a physical surf zone and its bubbles at a fixed rate and fills
 * snapshots for the renderer (plan §3.2, P4a). Pure and deterministic: it
 * runs unchanged in the Web Worker and, for tests and fallback, in the page.
 */
export class SurfZoneRunner {
  readonly simulation: SurfZoneSimulation;
  readonly bubbles: BubbleCloud;
  /** Uniform render grid over the window and the whole tank. */
  readonly grid: RenderGrid;
  /** Bed elevation per render node (fixed until the window slides). */
  readonly bed: Float32Array;
  /** Where the break line crosses x = 0: the camera's focus. */
  readonly focus: { x: number; z: number };
  /** The riderless board, sampling the water through the `SurfWater` seam. */
  readonly board?: BoardBody;
  readonly water: PhysicalSurfWater;
  private readonly breaker: SurfZoneStatus['breaker'];
  private readonly breakDepth: number;
  private readonly lineup: Vector3;
  private boardResets = 0;
  private boardMs = 0;

  constructor(readonly config: SurfZoneConfig, options: SurfZoneRunnerOptions = {}, renderSpacing = 1) {
    this.simulation = new SurfZoneSimulation(config);
    this.bubbles = new BubbleCloud(config.seed, PARCEL_CAPACITY);
    this.grid = this.simulation.renderGrid(renderSpacing);
    this.bed = new Float32Array(this.grid.nx * this.grid.nz);
    this.simulation.writeUniformBed(this.bed, this.grid);
    this.focus = this.simulation.breakPoint();
    this.breaker = this.simulation.iribarren();
    this.breakDepth = this.simulation.spot.depthAt(this.focus.x, this.focus.z) + config.tide;
    this.water = PhysicalSurfWater.forSimulation(this.simulation);
    this.lineup = new Vector3(this.focus.x, 0, this.focus.z - LINEUP_OFFSET);
    if (options.board) {
      this.board = new BoardBody();
      this.launchBoard();
    }
  }

  get windowXMin(): number {
    return this.simulation.windowXMin;
  }

  /**
   * Each step, in order: the water advances; the board samples that water,
   * integrates and hands its reactions back; the bubbles follow the water. A
   * snapshot (`fill`) shows the state after the last step.
   */
  advance(steps: number): void {
    const { board } = this;
    for (let step = 0; step < steps; step += 1) {
      this.simulation.step(SURF_ZONE_STEP);
      if (board) {
        const start = performance.now();
        board.step(SURF_ZONE_STEP, this.water);
        this.boardMs = performance.now() - start;
        if (board.outsideDomain || !Number.isFinite(board.position.x + board.position.y + board.position.z)) {
          this.boardResets += 1;
          this.launchBoard();
        }
      }
      this.bubbles.update(this.simulation, SURF_ZONE_STEP);
    }
  }

  /** Float the board level in the lineup, nose to the beach, at rest on the surface. */
  private launchBoard(): void {
    const { board, lineup } = this;
    if (!board) return;
    const surface = this.water.surfaceAt(lineup.x, lineup.z);
    board.place(new Vector3(lineup.x, surface + board.shape.centerOfMass.y - 0.01, lineup.z));
  }

  createBuffers(): SurfZoneBuffers {
    const nodes = this.grid.nx * this.grid.nz;
    return {
      surface: new Float32Array(nodes * 2),
      flow: new Float32Array(nodes * 2),
      lip: new Float32Array(PARCEL_CAPACITY * 3),
      lipCount: 0,
      bubbles: new Float32Array(PARCEL_CAPACITY * 3),
      bubbleCount: 0,
      board: new Float64Array(8),
    };
  }

  fill(buffers: SurfZoneBuffers): void {
    const { simulation, grid } = this;
    grid.xMin = simulation.windowXMin;
    simulation.writeUniformSurface(buffers.surface, grid);
    simulation.writeUniformFlow(buffers.flow, grid);
    let parcels = 0;
    simulation.lip.forEachActive((x, y, z) => {
      if (parcels >= PARCEL_CAPACITY) return;
      buffers.lip[parcels * 3] = x;
      buffers.lip[parcels * 3 + 1] = y;
      buffers.lip[parcels * 3 + 2] = z;
      parcels += 1;
    });
    buffers.lipCount = parcels;
    buffers.bubbleCount = Math.min(PARCEL_CAPACITY, this.bubbles.count);
    buffers.bubbles.set(this.bubbles.positions.subarray(0, buffers.bubbleCount * 3));
    const { board } = this;
    buffers.board.fill(0);
    if (board) {
      board.position.toArray(buffers.board, 0);
      board.orientation.toArray(buffers.board, 3);
      buffers.board[7] = 1;
    }
  }

  status(): SurfZoneStatus {
    const { simulation } = this;
    return {
      seaTime: simulation.seaTime,
      timeToSet: simulation.timeToSet,
      stepMs: simulation.lastStepMs + this.boardMs,
      cells: simulation.solver.nx * simulation.solver.nz,
      breakPoint: { ...this.focus },
      breakDepth: this.breakDepth,
      breaker: { ...this.breaker },
      breakingFraction: simulation.breakingFraction(),
      peel: simulation.peelEstimate(),
      lipLaunches: simulation.lipLaunches,
      lipVolume: simulation.lipVolume,
      lipAirborne: simulation.lip.airborneVolume(),
      onsetScale: simulation.breaking.onsetScale,
      board: this.board ? { speed: this.board.velocity.length(), resets: this.boardResets } : undefined,
    };
  }
}
