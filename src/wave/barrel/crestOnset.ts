import { crestMotion } from '../CrestKinematics';
import type { ShallowWaterSolver } from '../ShallowWaterSolver';
import { GRAVITY } from '../dispersion';

/**
 * When a crest's slices open (the Padang Padang spec, 13.3; the advisor, 2026-09-30): at the solver's own Kennedy
 * onset, whose threshold is calibrated so model breaking starts where flume waves broke (Kennedy et al. 2000), and
 * whose age since PR #76 rides behind the face, so a breaking crest carries it along the front. A crest joins its
 * front when its segment's strength passes `join` (the level every breaking readout uses), and its clock starts
 * when its age began. B = U/C is not the trigger: with the depth-averaged ū, Padang Padang's breaking crests read
 * 0.1–0.5, no different from calm ones (a probe, 2026-09-30), since q ≈ cη makes U/C ≈ η/(h + η); Derakhti's 0.85
 * and 1.0, and Bacigaluppi's 0.75, are for the surface velocity. It is kept as a diagnostic, above a crest-speed floor.
 */
export const ONSET = { join: 0.3 } as const;

/** Crests over thinner water are shore swash, not waves, m (as CrestKinematics). */
const WET = 0.05;
/** How far shoreward of a crest its face is read, m (as CrestKinematics' FACE_REACH). */
const FACE_REACH = 10;
/** A crest slower than this share of √(gh) is not a travelling form, so its U/C is noise (the advisor, provisional). */
const MIN_CREST_FROUDE = 0.5;

export interface CrestSample {
  column: number;
  row: number;
  x: number;
  z: number;
  /** The crest's height above still water, m. */
  eta: number;
  /** The Kennedy breaking strength over the crest's segment (the crest to FACE_REACH shoreward): its largest. */
  strength: number;
  /** Seconds since breaking began for the segment's oldest breaking water: its age. */
  age: number;
  /** U/C, the depth-averaged water's speed along the crest's travel over the crest's (a diagnostic); NaN unmeasured. */
  b: number;
  /** The crest's speed, m/s (0 unmeasured). */
  speed: number;
}

/** The solver's breaking, per cell: `BreakingModel`'s strength and age. */
export interface BreakingField {
  readonly strength: ArrayLike<number>;
  readonly age: ArrayLike<number>;
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
  let count = 0;
  for (let ix = 0; ix < nx; ix += 1) {
    for (let iz = Math.max(1, fromRow); iz < nz - 1; iz += 1) {
      const i = iz * nx + ix;
      if (!(h[i] > WET)) continue;
      const eta = h[i] + bed[i];
      if (!(eta - restLevel > minHeight) || !(eta > h[i - nx] + bed[i - nx]) || !(eta > h[i + nx] + bed[i + nx])) continue;
      let strength = 0;
      let age = 0;
      for (let row = iz; row < nz && zCenters[row] - zCenters[iz] <= FACE_REACH; row += 1) {
        const cell = row * nx + ix;
        if (!(h[cell] > WET) || !(breaking.strength[cell] > 0)) continue;
        strength = Math.max(strength, breaking.strength[cell]);
        age = Math.max(age, breaking.age[cell]);
      }
      const found = crestMotion(solver, i);
      const motion = found && found.speed >= MIN_CREST_FROUDE * Math.sqrt(GRAVITY * h[i]) ? found : undefined;
      const sample = (out[count] ??= { column: 0, row: 0, x: 0, z: 0, eta: 0, strength: 0, age: 0, b: NaN, speed: 0 });
      sample.column = ix;
      sample.row = iz;
      sample.x = xCenters[ix];
      sample.z = zCenters[iz];
      sample.eta = eta - restLevel;
      sample.strength = strength;
      sample.age = age;
      sample.b = motion ? (qx[i] * motion.direction.x + qz[i] * motion.direction.z) / h[i] / motion.speed : NaN;
      sample.speed = motion ? motion.speed : 0;
      count += 1;
    }
  }
  return count;
}
