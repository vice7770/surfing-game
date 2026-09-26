import { Matrix4, Quaternion, Vector3, type Object3D } from 'three';

const a = new Vector3();
const h = new Vector3();
const c = new Vector3();
const A = new Vector3();
const H = new Vector3();
const C = new Vector3();
const local = new Matrix4();
const world = new Matrix4();
const target = new Quaternion();
const parentWorld = new Quaternion();

/** A right-handed orthonormal frame: `axis`, then `hint` made perpendicular to it (any perpendicular if it is parallel). */
function frame(axis: Vector3, hint: Vector3, outA: Vector3, outH: Vector3, outC: Vector3, out: Matrix4): Matrix4 {
  outA.copy(axis).normalize();
  outH.copy(hint).addScaledVector(outA, -hint.dot(outA));
  if (outH.lengthSq() < 1e-12) {
    const x = Math.abs(outA.x);
    const y = Math.abs(outA.y);
    const z = Math.abs(outA.z);
    outH.set(x <= y && x <= z ? 1 : 0, y < x && y <= z ? 1 : 0, z < x && z < y ? 1 : 0);
    outH.addScaledVector(outA, -outH.dot(outA));
  }
  outH.normalize();
  outC.crossVectors(outA, outH);
  return out.makeBasis(outA, outH, outC);
}

/**
 * Turns `bone` so its local `axisLocal` points along `direction` in the world
 * and its local `hintLocal` turns as near `hintDirection` as the axis allows,
 * stores that as the bone's quaternion under its parent (whose world matrix
 * must be current), and updates the bone's subtree.
 */
export function orientBone(bone: Object3D, axisLocal: Vector3, hintLocal: Vector3, direction: Vector3, hintDirection: Vector3): void {
  frame(axisLocal, hintLocal, a, h, c, local);
  frame(direction, hintDirection, A, H, C, world);
  target.setFromRotationMatrix(world.multiply(local.transpose()));
  if (bone.parent) bone.parent.getWorldQuaternion(parentWorld);
  else parentWorld.identity();
  bone.quaternion.copy(parentWorld.invert().multiply(target)).normalize();
  bone.updateMatrixWorld(true);
}
