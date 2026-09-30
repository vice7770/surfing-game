import { crestMotion } from '../CrestKinematics';
import type { ShallowWaterSolver } from '../ShallowWaterSolver';
import { GRAVITY } from '../dispersion';

/**
 * Each column's crests for the swept barrel's front (the Padang Padang spec, 13.3). The front joins a crest by where it
 * is (BreakingFront: its breaking depth, from its height at the wedge's foot), not by how its surface moves: once a
 * neighbour breaks, the solver's eddy viscosity damps a column's rise, and its breaking age is the event's (the
 * advisor and three probes, 2026-09-30). The segment's breaking strength gates the join; its fresh rise (Kennedy's
 * test, η_t over √(g d)) and B = U/C are diagnostics. B is no trigger: with the depth-averaged ū, Padang Padang's
 * breaking crests read 0.1–0.5, no different from calm ones, since q ≈ cη makes U/C ≈ η/(h + η); Derakhti's 0.85 and
 * 1.0, and Bacigaluppi's 0.75, are for the surface velocity.
 */

/** Crests over thinner water are shore swash, not waves, m (as CrestKinematics). */
const WET = 0.05;
/** How far shoreward of a crest its face is read, m (as CrestKinematics' FACE_REACH). */
const FACE_REACH = 10;
/** A crest slower than this share of √(gh) is not a travelling form, so its U/C is noise (the advisor, provisional). */
const MIN_CREST_FROUDE = 0.5;
/** The shallowest still depth the rise is scaled by, m (the solver's breaking floor). */
const RISE_DEPTH = 0.05;

export interface CrestSample {
  column: number;
  row: number;
  x: number;
  z: number;
  /** The crest's height above still water, m. */
  eta: number;
  /** The Kennedy breaking strength over the crest's segment (the crest to FACE_REACH shoreward): its largest. */
  strength: number;
  /** The segment's steepest rise, η_t over √(g d) with d the still depth: its largest (Kennedy's fresh test, a diagnostic). */
  rise: number;
  /** The still depth under the crest, m. */
  depth: number;
  /** U/C, the depth-averaged water's speed along the crest's travel over the crest's (a diagnostic); NaN unmeasured. */
  b: number;
  /** The crest's speed, m/s (0 unmeasured). */
  speed: number;
}

/** The solver's breaking strength per cell (`BreakingModel`'s). */
export interface BreakingField {
  readonly strength: ArrayLike<number>;
}

/**
 * Every crest in every column from `fromRow` shoreward: strict local maxima of the surface along the column, higher
 * than `minHeight` above still water, with their segment's breaking. Written into `out` (reused, grown as needed); the
 * count is returned. Columns go in order, rows seaward first.
 */
export function columnCrests(
  solver: ShallowWaterSolver, breaking: BreakingField, fromRow: number, minHeight: number, out: CrestSample[],
): number {
  const { nx, nz, h, bed, qx, qz, xCenters, zCenters, restLevel } = solver;
  const rate = solver.surfaceRiseRate;
  let count = 0;
  for (let ix = 0; ix < nx; ix += 1) {
    for (let iz = Math.max(1, fromRow); iz < nz - 1; iz += 1) {
      const i = iz * nx + ix;
      if (!(h[i] > WET)) continue;
      const eta = h[i] + bed[i];
      if (!(eta - restLevel > minHeight) || !(eta > h[i - nx] + bed[i - nx]) || !(eta > h[i + nx] + bed[i + nx])) continue;
      let strength = 0;
      let rise = 0;
      for (let row = iz; row < nz && zCenters[row] - zCenters[iz] <= FACE_REACH; row += 1) {
        const cell = row * nx + ix;
        if (!(h[cell] > WET)) continue;
        if (breaking.strength[cell] > strength) strength = breaking.strength[cell];
        const fresh = rate[cell] / Math.sqrt(GRAVITY * Math.max(RISE_DEPTH, restLevel - bed[cell]));
        if (fresh > rise) rise = fresh;
      }
      const found = crestMotion(solver, i);
      const motion = found && found.speed >= MIN_CREST_FROUDE * Math.sqrt(GRAVITY * h[i]) ? found : undefined;
      const sample = (out[count] ??= { column: 0, row: 0, x: 0, z: 0, eta: 0, strength: 0, rise: 0, depth: 0, b: NaN, speed: 0 });
      sample.column = ix;
      sample.row = iz;
      sample.x = xCenters[ix];
      sample.z = zCenters[iz];
      sample.eta = eta - restLevel;
      sample.strength = strength;
      sample.rise = rise;
      sample.depth = restLevel - bed[i];
      sample.b = motion ? (qx[i] * motion.direction.x + qz[i] * motion.direction.z) / h[i] / motion.speed : NaN;
      sample.speed = motion ? motion.speed : 0;
      count += 1;
    }
  }
  return count;
}
