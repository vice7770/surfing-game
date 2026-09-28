import type { ShallowWaterSolver } from './ShallowWaterSolver';

/** Crests over thinner water are shore swash, not waves, m. */
const WET = 0.05;
/** How far ahead of the crest to look for its front face, m. */
const FACE_REACH = 10;
/** A flatter face does not show the crest's motion. */
const MIN_FACE_SLOPE = 0.005;

/**
 * How a breaking crest goes, from the local Iribarren number under it (Battjes
 * 1974): a plunging jet for 0.4 ≤ ξ ≤ 2, a spilling roller below, and above
 * it a surging wave that throws nothing. Surging needs the slope to run up to
 * the still-water line; over a submerged crest (a reef ledge levelling off
 * under water) the wave cannot surge and plunges instead (Yao et al. 2013;
 * Blenkinsopp & Chaplin 2008). The lip of such a reef break takes its shape
 * from `reefOverturn` (Mead & Black 2001; the Teahupo'o Reef, Part B); this
 * flag keeps the readout's breaker type in step with it.
 */
export function breakerForm(localIribarren: number, overSubmergedCrest = false): 'jet' | 'roller' | 'none' {
  if (localIribarren < 0.4) return 'roller';
  return localIribarren <= 2 || overSubmergedCrest ? 'jet' : 'none';
}

/** Still water this thin is the shoreline, m. */
const SHORELINE = 0.01;

/**
 * Whether the slope under a break ends in a submerged crest: where the local
 * slope, carried on as a plane, would reach the still-water line (stillDepth /
 * slope ahead), the bed is still under water. A plane beach face reaches it; a
 * reef ledge has levelled off below it. `depthAhead(d)` is the still depth d m
 * shoreward of the break.
 */
export function submergedCrest(depthAhead: (ahead: number) => number, stillDepth: number, slope: number): boolean {
  if (!(slope > 0) || !(stillDepth > 0)) return false;
  return depthAhead(stillDepth / slope) > SHORELINE;
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

/** The crest's height above the lowest water within `reach` m shoreward of it along its column, m. */
export function waveHeightAt(solver: ShallowWaterSolver, crest: number, reach: number): number {
  const { nx, nz, zCenters, h, bed } = solver;
  const column = crest % nx;
  const crestRow = Math.floor(crest / nx);
  let trough = h[crest] + bed[crest];
  for (let row = crestRow + 1; row < nz && zCenters[row] - zCenters[crestRow] <= reach; row += 1) {
    const cell = row * nx + column;
    if (h[cell] > WET) trough = Math.min(trough, h[cell] + bed[cell]);
  }
  return h[crest] + bed[crest] - trough;
}
