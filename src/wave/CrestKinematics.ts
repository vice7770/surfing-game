import { waveNumber } from './dispersion';
import type { ShallowWaterSolver } from './ShallowWaterSolver';

/**
 * Surface water speed over the depth-averaged speed at most this: the linear
 * profile's ratio kh·coth(kh) grows without bound in deep water, where the
 * depth-averaged speed says little about the crest. Provisional.
 */
export const MAX_SURFACE_FACTOR = 3;
/**
 * A crest breaks once its surface water moves at this share of the crest's own
 * speed: Barthelemy et al. (2018), "On a unified breaking onset threshold for
 * gravity waves", J. Fluid Mech. Provisional until checked against the paper.
 */
export const BREAKING_ONSET_RATIO = 0.85;
/** Crests over thinner water are shore swash, not waves, m. */
const WET = 0.05;
/** How far, in rows, a tracked crest may move between updates. */
const REACH = 3;
/** Smoothing time of the measured crest speed, s. */
const SMOOTHING = 0.2;
/** Below this the crest is not moving and its ratio says nothing, m/s. */
const SLOWEST_CREST = 0.2;

/** Surface water speed over the depth-averaged speed in a linear wave, kh·coth(kh). */
export function surfaceSpeedFactor(kh: number): number {
  if (!(kh > 1e-4)) return 1;
  return Math.min(MAX_SURFACE_FACTOR, kh / Math.tanh(kh));
}

/**
 * How a breaking crest goes, from the local Iribarren number under it (Battjes
 * 1974): a plunging jet for 0.4 ≤ ξ ≤ 2, a spilling roller below, and above
 * it a surging wave that throws nothing.
 */
export function breakerForm(localIribarren: number): 'jet' | 'roller' | 'none' {
  if (localIribarren < 0.4) return 'roller';
  return localIribarren <= 2 ? 'jet' : 'none';
}

/**
 * Surface water speed at a solver cell, m/s: the depth-averaged speed times the
 * linear profile's surface factor, with k from angular frequency `omega` at the
 * cell's still depth.
 */
export function surfaceSpeedAt(solver: ShallowWaterSolver, cell: number, omega: number): number {
  const depth = solver.h[cell];
  if (!(depth > WET)) return 0;
  const still = Math.max(WET, solver.restLevel - solver.bed[cell]);
  const mean = Math.hypot(solver.qx[cell], solver.qz[cell]) / depth;
  return mean * surfaceSpeedFactor(waveNumber(omega, still) * still);
}

/** Which way the water at a cell moves: the flow's direction when it runs shoreward, else straight shoreward. */
export function flowDirection(solver: ShallowWaterSolver, cell: number): { x: number; z: number } {
  const qx = solver.qx[cell];
  const qz = solver.qz[cell];
  const flow = Math.hypot(qx, qz);
  return flow > 0 && qz > 0 ? { x: qx / flow, z: qz / flow } : { x: 0, z: 1 };
}

export interface CrestState {
  /** The solver cell under the crest. */
  cell: number;
  /** Crest speed across shore, m/s, measured from its motion. */
  speed: number;
  /** Surface water speed at the crest, m/s, from the linear profile. */
  surfaceSpeed: number;
  /** surfaceSpeed / speed: breaking starts near BREAKING_ONSET_RATIO. */
  ratio: number;
  /** Which way the crest water moves (unit, horizontal). */
  direction: { x: number; z: number };
}

/**
 * Follows one crest per along-shore column and measures its kinematics
 * (plan P7 task 1). A crest is first the highest surface over water from
 * `firstRow` shoreward; then the local maximum nearest where its speed
 * predicts it, within REACH rows. Positions are sub-cell (the vertex of a
 * parabola through the peak and its neighbours), so the speed does not step
 * with the grid.
 */
export class CrestTracker {
  private readonly position: Float64Array;
  private readonly speed: Float64Array;
  private readonly samples: Uint8Array;
  private readonly row: Int32Array;
  private readonly states: (CrestState | undefined)[];
  readonly omega: number;

  constructor(private readonly solver: ShallowWaterSolver, peakPeriod: number, private readonly firstRow = 0) {
    const { nx } = solver;
    this.position = new Float64Array(nx);
    this.speed = new Float64Array(nx);
    this.samples = new Uint8Array(nx);
    this.row = new Int32Array(nx).fill(-1);
    this.states = new Array(nx).fill(undefined);
    this.omega = (2 * Math.PI) / peakPeriod;
  }

  crest(column: number): CrestState | undefined {
    return this.states[column];
  }

  /** Stop following the column's crest (it broke); the next update finds a new one. */
  release(column: number): void {
    this.row[column] = -1;
    this.samples[column] = 0;
    this.states[column] = undefined;
  }

  update(dt: number): void {
    const { solver } = this;
    for (let column = 0; column < solver.nx; column += 1) {
      const previous = this.row[column];
      const row = previous < 0 ? this.highest(column) : this.follow(column, previous, dt);
      if (row < 0) {
        this.release(column);
        continue;
      }
      const z = this.peak(column, row);
      if (previous >= 0 && this.samples[column] < 255) {
        const moved = (z - this.position[column]) / dt;
        const blend = Math.min(1, dt / SMOOTHING);
        this.speed[column] = this.samples[column] === 0 ? moved : this.speed[column] + (moved - this.speed[column]) * blend;
        this.samples[column] += 1;
      }
      this.row[column] = row;
      this.position[column] = z;
      this.states[column] = this.samples[column] > 0 ? this.state(column, row) : undefined;
    }
  }

  private surface(cell: number): number {
    return this.solver.h[cell] + this.solver.bed[cell];
  }

  private wet(cell: number): boolean {
    return this.solver.h[cell] > WET;
  }

  /** The row of the highest wet surface in the column from `firstRow` on, or −1. */
  private highest(column: number): number {
    const { nx, nz } = this.solver;
    let best = -1;
    let top = -Infinity;
    for (let iz = Math.max(1, this.firstRow); iz < nz - 1; iz += 1) {
      const cell = iz * nx + column;
      if (!this.wet(cell)) continue;
      const eta = this.surface(cell);
      if (eta > top) {
        top = eta;
        best = iz;
      }
    }
    return best;
  }

  /** The local maximum nearest the predicted position, within REACH rows, or −1. */
  private follow(column: number, previous: number, dt: number): number {
    const { nx, nz, zCenters } = this.solver;
    const predicted = this.position[column] + this.speed[column] * dt;
    let best = -1;
    let nearest = Infinity;
    for (let iz = Math.max(1, previous - REACH); iz <= Math.min(nz - 2, previous + REACH); iz += 1) {
      const cell = iz * nx + column;
      if (!this.wet(cell)) continue;
      const eta = this.surface(cell);
      if (eta < this.surface(cell - nx) || eta < this.surface(cell + nx)) continue;
      const distance = Math.abs(zCenters[iz] - predicted);
      if (distance < nearest) {
        nearest = distance;
        best = iz;
      }
    }
    return best;
  }

  /** The crest's z: the vertex of the parabola through the peak row and its neighbours. */
  private peak(column: number, row: number): number {
    const { nx, zCenters } = this.solver;
    const cell = row * nx + column;
    const z0 = zCenters[row - 1];
    const z1 = zCenters[row];
    const z2 = zCenters[row + 1];
    const e0 = this.surface(cell - nx);
    const e1 = this.surface(cell);
    const e2 = this.surface(cell + nx);
    const denominator = (z0 - z1) * (z0 - z2) * (z1 - z2);
    const a = (z2 * (e1 - e0) + z1 * (e0 - e2) + z0 * (e2 - e1)) / denominator;
    const b = (z2 * z2 * (e0 - e1) + z1 * z1 * (e2 - e0) + z0 * z0 * (e1 - e2)) / denominator;
    if (!(a < 0)) return z1;
    return Math.min(z2, Math.max(z0, -b / (2 * a)));
  }

  private state(column: number, row: number): CrestState {
    const { solver } = this;
    const cell = row * solver.nx + column;
    const surfaceSpeed = surfaceSpeedAt(solver, cell, this.omega);
    const speed = this.speed[column];
    return {
      cell,
      speed,
      surfaceSpeed,
      ratio: speed > SLOWEST_CREST ? surfaceSpeed / speed : 0,
      direction: flowDirection(solver, cell),
    };
  }
}
