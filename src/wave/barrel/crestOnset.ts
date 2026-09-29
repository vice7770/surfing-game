import { crestMotion } from '../CrestKinematics';
import type { ShallowWaterSolver } from '../ShallowWaterSolver';

/**
 * When a crest's slices open (the Padang Padang spec, 13.3): B = U/C, the water's speed along the crest's travel over
 * the crest's own, forms the face at about 0.85 and throws the lip at 1.0 (Derakhti et al. 2020). Depth-averaged
 * equations read U low, and there the throw sits near 0.75 (Bacigaluppi et al. 2019), so both thresholds are scaled
 * by `depthAveraged`. That scale is provisional until the library's own runs give U/C at their vertical face.
 */
export const ONSET = { face: 0.85, throw: 1.0, depthAveraged: 0.75 } as const;

/** Crests over thinner water are shore swash, not waves, m (as CrestKinematics). */
const WET = 0.05;

export interface CrestSample {
  column: number;
  row: number;
  x: number;
  z: number;
  /** The crest's height above still water, m. */
  eta: number;
  /** U/C: the depth-averaged water's speed along the crest's travel over the crest's speed. */
  b: number;
  /** The crest's speed, m/s, and which way it travels (unit, horizontal). */
  speed: number;
  dirX: number;
  dirZ: number;
}

/**
 * Every crest in every column from `fromRow` shoreward: strict local maxima of the surface along the column, higher
 * than `minHeight` above still water, whose motion `crestMotion` can read. Written into `out` (reused, grown as
 * needed); the count is returned. Columns go in order, rows seaward first.
 */
export function columnCrests(solver: ShallowWaterSolver, fromRow: number, minHeight: number, out: CrestSample[]): number {
  const { nx, nz, h, bed, qx, qz, xCenters, zCenters, restLevel } = solver;
  let count = 0;
  for (let ix = 0; ix < nx; ix += 1) {
    for (let iz = Math.max(1, fromRow); iz < nz - 1; iz += 1) {
      const i = iz * nx + ix;
      if (!(h[i] > WET)) continue;
      const eta = h[i] + bed[i];
      if (!(eta - restLevel > minHeight) || !(eta > h[i - nx] + bed[i - nx]) || !(eta > h[i + nx] + bed[i + nx])) continue;
      const motion = crestMotion(solver, i);
      if (!motion) continue;
      const along = (qx[i] * motion.direction.x + qz[i] * motion.direction.z) / h[i];
      const sample = (out[count] ??= { column: 0, row: 0, x: 0, z: 0, eta: 0, b: 0, speed: 0, dirX: 0, dirZ: 0 });
      sample.column = ix;
      sample.row = iz;
      sample.x = xCenters[ix];
      sample.z = zCenters[iz];
      sample.eta = eta - restLevel;
      sample.b = along / motion.speed;
      sample.speed = motion.speed;
      sample.dirX = motion.direction.x;
      sample.dirZ = motion.direction.z;
      count += 1;
    }
  }
  return count;
}
