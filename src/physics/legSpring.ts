import type { Vector3 } from 'three';

type Vec3Like = { x: number; y: number; z: number };

/**
 * The standing rider's legs as one spring and damper between the stance and
 * the centre of mass (spec P9, the flexible rider): stiff along the leg, softer
 * across it, where the ankles and hips give. All values are design parameters
 * that start from the survey's studies (docs/research/surf-gameplay-research.md §8).
 */
export interface LegSpec {
  /** N/m along the leg: 22 kN/m, 2.75 Hz for 73 kg (Matsumoto & Griffin 1998, legs bent; provisional). */
  axialStiffness: number;
  /**
   * N/m across it at the centre of mass: ankle and hip, 3 kN/m (provisional).
   * The ankle's own ≈ 600 N·m/rad (Loram & Lakie 2002) over a 0.85 m leg is
   * 0.83 kN/m, just below the toppling stiffness mg/L ≈ 0.84 kN/m, so muscle
   * co-contraction is assumed on top; slow active balance does the rest.
   */
  tangentialStiffness: number;
  /** Damping ratios along and across (0.2–0.5 in the survey; 0.35 and 0.5, provisional). */
  axialDamping: number;
  tangentialDamping: number;
}

export const RIDER_LEG: LegSpec = { axialStiffness: 22_000, tangentialStiffness: 3_000, axialDamping: 0.35, tangentialDamping: 0.5 };

/**
 * K = k_a n nᵀ + k_t (I − n nᵀ), and C likewise with c = 2ζ√(k m), as 3 × 3
 * row-major tensors, for the unit leg axis n and the rider's mass m.
 */
export function legTensors(spec: LegSpec, axis: Vec3Like, mass: number, stiffness: Float64Array, damping: Float64Array): void {
  const n = [axis.x, axis.y, axis.z];
  const axialDamping = 2 * spec.axialDamping * Math.sqrt(spec.axialStiffness * mass);
  const tangentialDamping = 2 * spec.tangentialDamping * Math.sqrt(spec.tangentialStiffness * mass);
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const along = n[i] * n[j];
      const across = (i === j ? 1 : 0) - along;
      stiffness[i * 3 + j] = spec.axialStiffness * along + spec.tangentialStiffness * across;
      damping[i * 3 + j] = axialDamping * along + tangentialDamping * across;
    }
  }
}

/** Scratch for `addLeg`, which runs every substep (single-threaded, not re-entrant). */
const SCRATCH_B = new Float64Array(9);
const SCRATCH_J = new Float64Array(27);
const SCRATCH_BJ = new Float64Array(27);

/**
 * Add the leg's implicit share, (h C + h² K) Jᵀ J, to the 9 × 9 system over the
 * board's velocity and spin and the rider's velocity (v, ω, u). J = [−I, [a]×, I]
 * maps them to the rider's velocity relative to the board point at its centre of
 * mass, u − (v + ω × a), with a the arm from the board's centre of mass to the
 * rider's. Both tensors are symmetric, so the block is symmetric and positive
 * semi-definite: the coupled solve stays well posed however the geometry turns.
 */
export function addLeg(system: Float64Array, stiffness: Float64Array, damping: Float64Array, arm: Vec3Like, h: number): void {
  // B = h C + h² K.
  const b = SCRATCH_B;
  for (let k = 0; k < 9; k += 1) b[k] = h * damping[k] + h * h * stiffness[k];
  // J, 3 × 9: −I over v, [a]× over ω, I over u.
  const j = SCRATCH_J.fill(0);
  for (let i = 0; i < 3; i += 1) {
    j[i * 9 + i] = -1;
    j[i * 9 + 6 + i] = 1;
  }
  j[0 * 9 + 4] = -arm.z;
  j[0 * 9 + 5] = arm.y;
  j[1 * 9 + 3] = arm.z;
  j[1 * 9 + 5] = -arm.x;
  j[2 * 9 + 3] = -arm.y;
  j[2 * 9 + 4] = arm.x;
  // B J, 3 × 9.
  const bj = SCRATCH_BJ;
  for (let i = 0; i < 3; i += 1) {
    for (let c = 0; c < 9; c += 1) bj[i * 9 + c] = b[i * 3] * j[c] + b[i * 3 + 1] * j[9 + c] + b[i * 3 + 2] * j[18 + c];
  }
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) system[r * 9 + c] += j[r] * bj[c] + j[9 + r] * bj[9 + c] + j[18 + r] * bj[18 + c];
  }
}

/**
 * The leg's force on the rider, −K s − C w, from its stretch s (centre of mass
 * minus rest point) and the relative velocity w = u − v − ω × a. The board takes
 * the opposite force along the same line through the rider's centre of mass.
 */
export function legForce(stiffness: Float64Array, damping: Float64Array, stretch: Vec3Like, relativeVelocity: Vec3Like, out: Vector3): Vector3 {
  const s = [stretch.x, stretch.y, stretch.z];
  const w = [relativeVelocity.x, relativeVelocity.y, relativeVelocity.z];
  const f = [0, 0, 0];
  for (let i = 0; i < 3; i += 1) {
    for (let k = 0; k < 3; k += 1) f[i] -= stiffness[i * 3 + k] * s[k] + damping[i * 3 + k] * w[k];
  }
  return out.set(f[0], f[1], f[2]);
}

/** Solve the n × n system A x = b in place by Gaussian elimination with partial pivoting; x overwrites b and A is destroyed. */
export function solveLinear(a: Float64Array, b: Float64Array, n: number): void {
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(a[row * n + col]) > Math.abs(a[pivot * n + col])) pivot = row;
    if (pivot !== col) {
      for (let k = 0; k < n; k += 1) {
        const t = a[col * n + k];
        a[col * n + k] = a[pivot * n + k];
        a[pivot * n + k] = t;
      }
      const t = b[col];
      b[col] = b[pivot];
      b[pivot] = t;
    }
    const diagonal = a[col * n + col];
    for (let row = col + 1; row < n; row += 1) {
      const factor = a[row * n + col] / diagonal;
      if (factor === 0) continue;
      for (let k = col; k < n; k += 1) a[row * n + k] -= factor * a[col * n + k];
      b[row] -= factor * b[col];
    }
  }
  for (let row = n - 1; row >= 0; row -= 1) {
    let value = b[row];
    for (let k = row + 1; k < n; k += 1) value -= a[row * n + k] * b[k];
    b[row] = value / a[row * n + row];
  }
}
