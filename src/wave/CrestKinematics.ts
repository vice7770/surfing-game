import type { ShallowWaterSolver } from './ShallowWaterSolver';

/**
 * A jet leaves the crest at this multiple of the crest's own speed. The
 * kinematic breaking criterion: a crest overturns once its water catches up
 * with the crest (Barthelemy et al. 2018 put the onset at 0.85 of it).
 * Provisional until checked against measured jet speeds.
 */
export const JET_SPEED_RATIO = 1;
/** Crests over thinner water are shore swash, not waves, m. */
const WET = 0.05;
/** How far ahead of the crest to look for its front face, m. */
const FACE_REACH = 10;
/** A flatter face does not show the crest's motion. */
const MIN_FACE_SLOPE = 0.005;

/**
 * How a breaking crest goes, from the local Iribarren number under it (Battjes
 * 1974): a plunging jet for 0.4 ≤ ξ ≤ 2, a spilling roller below, and above
 * it a surging wave that throws nothing.
 */
export function breakerForm(localIribarren: number): 'jet' | 'roller' | 'none' {
  if (localIribarren < 0.4) return 'roller';
  return localIribarren <= 2 ? 'jet' : 'none';
}

export interface CrestMotion {
  /** The crest's speed, m/s. */
  speed: number;
  /** Which way it travels (unit, horizontal). */
  direction: { x: number; z: number };
}

/**
 * The motion of the crest at `crest`, from the surface's own motion on its
 * front face (plan P7). A form travelling at c satisfies η_t = c |∇η| where
 * the surface falls ahead of it, so c = η_t / |∇η| at the steepest point of
 * the face within FACE_REACH shoreward, and it travels down that gradient.
 * The depth-averaged water cannot give the crest's speed: at a breaking crest
 * it moves at about half of it. Undefined without a rising, sloping face.
 */
export function crestMotion(solver: ShallowWaterSolver, crest: number): CrestMotion | undefined {
  const { nx, nz, zCenters, dx, h } = solver;
  const rise = solver.surfaceRiseRate;
  const column = crest % nx;
  const crestRow = Math.floor(crest / nx);
  const eta = (i: number) => h[i] + solver.bed[i];
  let best: CrestMotion | undefined;
  let steepest = MIN_FACE_SLOPE;
  for (let row = crestRow + 1; row < nz - 1 && zCenters[row] - zCenters[crestRow] <= FACE_REACH; row += 1) {
    const cell = row * nx + column;
    if (!(h[cell] > WET) || !(rise[cell] > 0)) continue;
    const slopeZ = (eta(cell + nx) - eta(cell - nx)) / (zCenters[row + 1] - zCenters[row - 1]);
    const slopeX = column > 0 && column < nx - 1 ? (eta(cell + 1) - eta(cell - 1)) / (2 * dx) : 0;
    const slope = Math.hypot(slopeX, slopeZ);
    if (!(slopeZ < 0) || slope <= steepest) continue;
    steepest = slope;
    best = { speed: rise[cell] / slope, direction: { x: -slopeX / slope, z: -slopeZ / slope } };
  }
  return best;
}

/** The crest's speed at `crest`, m/s (`crestMotion`). */
export function crestSpeedAt(solver: ShallowWaterSolver, crest: number): number | undefined {
  return crestMotion(solver, crest)?.speed;
}
