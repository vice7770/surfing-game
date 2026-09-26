import { Vector3 } from 'three';
import type { PopUpReport, RiderSeparation } from '../physics/AttachedRider';
import { BoardBody } from '../physics/BoardBody';
import { PhysicalSurfWater } from '../physics/PhysicalSurfWater';
import { RideSession, type RideInput } from '../physics/RideSession';
import type { PeelEstimate } from './Breaking';
import { BoussinesqSolver } from './BoussinesqSolver';
import { BubbleCloud } from './BubbleCloud';
import { SPRAY_STRIDE, SprayCloud } from './SprayCloud';
import { SurfZoneSimulation, type RenderGrid, type SolverDevice, type SurfZoneConfig } from './SurfZoneSimulation';
import type { BreakerType } from './SwellReadout';

export { surfZoneSea } from './SurfZoneSimulation';

/** Fixed simulation step, s: the game's physics rate. */
export const SURF_ZONE_STEP = 1 / 60;
/** A snapshot's lip parcel: x, y, z, world column, index along its strip, the strip's launch time and the parcel's age (plan P7). */
export const LIP_STRIDE = 7;
/** Most lip parcels and bubbles a snapshot carries. */
const PARCEL_CAPACITY = 4096;
/** A riderless board waits this far seaward of the break line, m. */
const LINEUP_OFFSET = 25;
/**
 * The rider starts, and relaunches, this far seaward of the break line, m. In
 * the catch reports riders stood almost only from 4–8 m outside; from 25 m out
 * the waves pass before a paddler can reach the peak.
 */
const RIDE_LINEUP_OFFSET = 6;

export interface SurfZoneRunnerOptions {
  /** Carry a riderless board on the water (P4c). */
  board?: boolean;
  /** Carry a board with a rider the player controls (P4d). */
  rider?: boolean;
}

/** The player's request for a batch of steps: the ride's input, and a quick retry. */
export interface RideRequest extends RideInput {
  retry: boolean;
}

/** The rider's phases in snapshot order, `fallen` once in the water. */
export const RIDER_PHASES = ['prone', 'push', 'landing', 'standing', 'recover', 'fallen'] as const;
/** Layout of a snapshot's rider array: seven drawn points (x, y, z each), then phase, cue, presence and heading. */
export const RIDER_SNAPSHOT = { points: 0, phase: 21, cue: 22, present: 23, heading: 24, length: 25 } as const;

const IDLE: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };

/** The Wave Lab readout's values, as plain data that can cross the worker boundary. */
export interface SurfZoneStatus {
  seaTime: number;
  timeToSet: number;
  /** Wall-clock time of the latest step, water and board, ms. */
  stepMs: number;
  /** Where the water steps: on the GPU (plan P6) or the CPU. */
  compute: 'gpu' | 'cpu';
  cells: number;
  breakPoint: { x: number; z: number };
  /** Still depth at the break point, including tide, m. */
  breakDepth: number;
  breaker: { value: number; type: BreakerType };
  breakingFraction: number;
  peel?: PeelEstimate;
  lipLaunches: number;
  lipVolume: number;
  /** Breaks that threw a plunging jet, and that spilled as a roller (plan P7). */
  lipJets: number;
  lipRollers: number;
  lipAirborne: number;
  /** Spray and mist particles in the air. */
  spray: number;
  onsetScale: number;
  /** The riderless board: its speed, m/s, and how often it left the water's domain and was put back in the lineup. */
  board?: { speed: number; resets: number };
  /** The ride: the rider's phase, board speed, pop-up cue and latest pop-up, why it last fell, and how often it restarted. */
  ride?: {
    phase: (typeof RIDER_PHASES)[number]; speed: number; cue: boolean; popUp: PopUpReport; separation?: RiderSeparation; resets: number;
    /** The rider's balance reserve, 0–1 (0 once fallen). */
    balance: number;
  };
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
  /** Spray and mist: x, y, z, size and opacity per particle (`SPRAY_STRIDE`). */
  spray: Float32Array;
  sprayCount: number;
  board: Float64Array;
  rider: Float64Array;
}

/**
 * Steps a physical surf zone and its bubbles at a fixed rate and fills
 * snapshots for the renderer (plan §3.2, P4a). Pure and deterministic: it
 * runs unchanged in the Web Worker and, for tests and fallback, in the page.
 */
export class SurfZoneRunner {
  readonly simulation: SurfZoneSimulation;
  readonly bubbles: BubbleCloud;
  readonly spray: SprayCloud;
  /** Uniform render grid over the window and the whole tank. */
  readonly grid: RenderGrid;
  /** Bed elevation per render node (fixed until the window slides). */
  readonly bed: Float32Array;
  /** Where the break line crosses x = 0: the camera's focus. */
  readonly focus: { x: number; z: number };
  /** The board, riderless or ridden, sampling the water through the `SurfWater` seam. */
  readonly board?: BoardBody;
  /** The board, its rider and the rider's fall body, when the player rides. */
  readonly session?: RideSession;
  private rideResets = 0;
  private readonly point = new Vector3();
  readonly water: PhysicalSurfWater;
  private readonly breaker: SurfZoneStatus['breaker'];
  private readonly breakDepth: number;
  private readonly lineup: Vector3;
  private readonly rideLineup: Vector3;
  private boardResets = 0;
  private boardMs = 0;

  constructor(readonly config: SurfZoneConfig, options: SurfZoneRunnerOptions = {}, renderSpacing = 1) {
    this.simulation = new SurfZoneSimulation(config);
    this.bubbles = new BubbleCloud(config.seed, PARCEL_CAPACITY);
    this.spray = new SprayCloud(config.seed, PARCEL_CAPACITY);
    this.grid = this.simulation.renderGrid(renderSpacing);
    this.bed = new Float32Array(this.grid.nx * this.grid.nz);
    this.simulation.writeUniformBed(this.bed, this.grid);
    this.focus = this.simulation.breakPoint();
    this.breaker = this.simulation.iribarren();
    this.breakDepth = this.simulation.spot.depthAt(this.focus.x, this.focus.z) + config.tide;
    this.water = PhysicalSurfWater.forSimulation(this.simulation);
    this.lineup = new Vector3(this.focus.x, 0, this.focus.z - LINEUP_OFFSET);
    this.rideLineup = new Vector3(this.focus.x, 0, this.focus.z - RIDE_LINEUP_OFFSET);
    if (options.rider) {
      this.session = new RideSession();
      this.board = this.session.board;
      this.launchRide();
    } else if (options.board) {
      this.board = new BoardBody();
      this.launchBoard();
    }
  }

  /** What the spray reads from the surf zone each step. */
  private get sprayScene() {
    const { simulation } = this;
    return { solver: simulation.solver, foam: simulation.foam, lipImpacts: simulation.lipImpacts, windSpeed: this.config.windSpeed ?? 0 };
  }

  get windowXMin(): number {
    return this.simulation.windowXMin;
  }

  /**
   * Each step, in order: the water and its lip advance; the board samples that
   * water, integrates and hands its reactions back; lip parcels that swept
   * through the rider or the fallen surfer strike it; the bubbles follow the
   * water. A snapshot (`fill`) shows the state after the last step.
   */
  advance(steps: number, input: RideRequest = IDLE): void {
    for (let step = 0; step < steps; step += 1) {
      this.simulation.step(SURF_ZONE_STEP);
      this.afterWater(step, input);
    }
  }

  /** `advance` with the water stepped on the simulation's device, when it has one (plan P6). */
  async advanceAsync(steps: number, input: RideRequest = IDLE): Promise<void> {
    for (let step = 0; step < steps; step += 1) {
      await this.simulation.stepAsync(SURF_ZONE_STEP);
      this.afterWater(step, input);
    }
  }

  /** Step stage 2 water on a device from `create` (the GPU); false when it offers none and the CPU keeps stepping. */
  async useDevice(create: (solver: BoussinesqSolver) => Promise<SolverDevice | undefined>): Promise<boolean> {
    const { solver } = this.simulation;
    if (!(solver instanceof BoussinesqSolver)) return false;
    try {
      this.simulation.device = await create(solver);
    } catch (error) {
      console.warn('No surf zone device; stepping on the CPU.', error);
    }
    return this.simulation.device !== undefined;
  }

  /** The board, rider and particles after the water's step `step` of a batch. */
  private afterWater(step: number, input: RideRequest): void {
    const { board, session } = this;
    if (session) {
      // A press (pop-up, retry) counts once per batch; held controls apply to every step.
      const request = step === 0 ? input : { ...input, popUp: false, retry: false };
      if (request.retry) {
        this.rideResets += 1;
        this.launchRide();
      }
      const start = performance.now();
      session.step(SURF_ZONE_STEP, this.water, request);
      session.strike(this.simulation.lip);
      this.boardMs = performance.now() - start;
      const lost = session.board.outsideDomain || (session.surfer.active && session.surfer.outsideDomain)
        || !Number.isFinite(session.board.position.x + session.board.position.y + session.board.position.z);
      if (lost) {
        this.rideResets += 1;
        this.launchRide();
      }
    } else if (board) {
      const start = performance.now();
      board.step(SURF_ZONE_STEP, this.water);
      this.boardMs = performance.now() - start;
      if (board.outsideDomain || !Number.isFinite(board.position.x + board.position.y + board.position.z)) {
        this.boardResets += 1;
        this.launchBoard();
      }
    }
    this.bubbles.update(this.simulation, SURF_ZONE_STEP);
    this.spray.update(this.sprayScene, SURF_ZONE_STEP);
  }

  /** Board and rider back in the lineup: prone, nose to the beach. */
  private launchRide(): void {
    this.session?.reset(this.rideLineup, 0, this.water);
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
      lip: new Float32Array(PARCEL_CAPACITY * LIP_STRIDE),
      lipCount: 0,
      bubbles: new Float32Array(PARCEL_CAPACITY * 3),
      bubbleCount: 0,
      spray: new Float32Array(PARCEL_CAPACITY * SPRAY_STRIDE),
      sprayCount: 0,
      board: new Float64Array(8),
      rider: new Float64Array(RIDER_SNAPSHOT.length),
    };
  }

  fill(buffers: SurfZoneBuffers): void {
    const { simulation, grid } = this;
    grid.xMin = simulation.windowXMin;
    simulation.writeUniformSurface(buffers.surface, grid);
    simulation.writeUniformFlow(buffers.flow, grid);
    let parcels = 0;
    simulation.lip.forEachActiveParcel((parcel) => {
      if (parcels >= PARCEL_CAPACITY) return;
      const o = parcels * LIP_STRIDE;
      buffers.lip[o] = parcel.x;
      buffers.lip[o + 1] = parcel.y;
      buffers.lip[o + 2] = parcel.z;
      buffers.lip[o + 3] = parcel.column;
      buffers.lip[o + 4] = parcel.index;
      buffers.lip[o + 5] = parcel.launchTime;
      buffers.lip[o + 6] = parcel.age;
      parcels += 1;
    });
    buffers.lipCount = parcels;
    buffers.bubbleCount = Math.min(PARCEL_CAPACITY, this.bubbles.count);
    buffers.bubbles.set(this.bubbles.positions.subarray(0, buffers.bubbleCount * 3));
    buffers.sprayCount = Math.min(PARCEL_CAPACITY, this.spray.count);
    buffers.spray.set(this.spray.particles.subarray(0, buffers.sprayCount * SPRAY_STRIDE));
    const { board } = this;
    buffers.board.fill(0);
    if (board) {
      board.position.toArray(buffers.board, 0);
      board.orientation.toArray(buffers.board, 3);
      buffers.board[7] = 1;
    }
    const { session } = this;
    buffers.rider.fill(0);
    if (session) {
      for (let i = 0; i < 7; i += 1) session.renderPoint(i, this.point).toArray(buffers.rider, RIDER_SNAPSHOT.points + i * 3);
      buffers.rider[RIDER_SNAPSHOT.phase] = RIDER_PHASES.indexOf(session.phase);
      buffers.rider[RIDER_SNAPSHOT.cue] = session.rider.popUpCue ? 1 : 0;
      buffers.rider[RIDER_SNAPSHOT.present] = 1;
      buffers.rider[RIDER_SNAPSHOT.heading] = session.heading;
    }
  }

  status(): SurfZoneStatus {
    const { simulation } = this;
    return {
      seaTime: simulation.seaTime,
      timeToSet: simulation.timeToSet,
      stepMs: simulation.lastStepMs + this.boardMs,
      compute: simulation.device ? 'gpu' : 'cpu',
      cells: simulation.solver.nx * simulation.solver.nz,
      breakPoint: { ...this.focus },
      breakDepth: this.breakDepth,
      breaker: { ...this.breaker },
      breakingFraction: simulation.breakingFraction(),
      peel: simulation.peelEstimate(),
      lipLaunches: simulation.lipLaunches,
      lipVolume: simulation.lipVolume,
      lipJets: simulation.lipJets,
      lipRollers: simulation.lipRollers,
      lipAirborne: simulation.lip.airborneVolume(),
      spray: this.spray.count,
      onsetScale: simulation.breaking.onsetScale,
      board: this.board && !this.session ? { speed: this.board.velocity.length(), resets: this.boardResets } : undefined,
      ride: this.session ? {
        phase: this.session.phase,
        speed: this.session.board.velocity.length(),
        cue: this.session.rider.popUpCue,
        popUp: { ...this.session.rider.popUpReport },
        separation: this.session.separation,
        resets: this.rideResets,
        balance: this.session.phase === 'fallen' ? 0 : this.session.rider.balanceReserve,
      } : undefined,
    };
  }
}
