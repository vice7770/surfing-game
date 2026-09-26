import { Vector3 } from 'three';

const reach = new Vector3();
const bend = new Vector3();

/**
 * A two-bone chain (hip–knee–ankle, shoulder–elbow–wrist) solved in closed
 * form: the end goes to the target, or as far toward it as the chain reaches,
 * and the middle joint bends toward `pole` (a direction). Both lengths are kept
 * exactly. Returns whether the target was reached.
 */
export function solveTwoBone(root: Vector3, upper: number, lower: number, target: Vector3, pole: Vector3, outMid: Vector3, outEnd: Vector3): boolean {
  reach.subVectors(target, root);
  let distance = reach.length();
  if (distance > 1e-9) reach.divideScalar(distance);
  else reach.set(0, -1, 0);
  const longest = (upper + lower) * (1 - 1e-6);
  const shortest = Math.abs(upper - lower) + 1e-6;
  const reached = distance <= longest && distance >= shortest;
  distance = Math.min(longest, Math.max(shortest, distance));
  bend.copy(pole).addScaledVector(reach, -pole.dot(reach));
  if (bend.lengthSq() < 1e-12) {
    // The pole lies along the reach: bend toward the world axis least aligned with it.
    const x = Math.abs(reach.x);
    const y = Math.abs(reach.y);
    const z = Math.abs(reach.z);
    bend.set(x <= y && x <= z ? 1 : 0, y < x && y <= z ? 1 : 0, z < x && z < y ? 1 : 0);
    bend.addScaledVector(reach, -bend.dot(reach));
  }
  bend.normalize();
  const cosine = (upper * upper + distance * distance - lower * lower) / (2 * upper * distance);
  const sine = Math.sqrt(Math.max(0, 1 - cosine * cosine));
  outMid.copy(root).addScaledVector(reach, upper * cosine).addScaledVector(bend, upper * sine);
  outEnd.copy(root).addScaledVector(reach, distance);
  return reached;
}
