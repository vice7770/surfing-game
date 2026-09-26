import { Bone, Vector3 } from 'three';
import { BONES, MIDDLE_FINGER } from './humanoidBones';

type Spec = [name: string, parent: string | null, position: [number, number, number]];

/**
 * A symmetric T-pose skeleton with MPFB's Mixamo bone names, facing +z with
 * its left at +x, about 1.72 m tall: a stand-in for the committed surfers in
 * rig tests. Positions are world metres, scaled by `scale`.
 */
export function createTestHumanoid(scale = 1): { root: Bone; bones: Map<string, Bone> } {
  const specs: Spec[] = [
    [BONES.hips, null, [0, 0.95, 0]],
    [BONES.spine[0], BONES.hips, [0, 1.05, 0]],
    [BONES.spine[1], BONES.spine[0], [0, 1.17, 0]],
    [BONES.spine[2], BONES.spine[1], [0, 1.3, 0]],
    [BONES.neck, BONES.spine[2], [0, 1.45, 0]],
    [BONES.head, BONES.neck, [0, 1.55, 0]],
  ];
  for (const [side, x] of [['left', 1], ['right', -1]] as const) {
    specs.push(
      [BONES.shoulder[side], BONES.spine[2], [x * 0.04, 1.4, 0]],
      [BONES.arm[side], BONES.shoulder[side], [x * 0.18, 1.4, 0]],
      [BONES.foreArm[side], BONES.arm[side], [x * 0.46, 1.4, 0]],
      [BONES.hand[side], BONES.foreArm[side], [x * 0.72, 1.4, 0]],
      [BONES.fingers[side][MIDDLE_FINGER][0], BONES.hand[side], [x * 0.81, 1.4, 0]],
      [BONES.upLeg[side], BONES.hips, [x * 0.09, 0.9, 0]],
      [BONES.leg[side], BONES.upLeg[side], [x * 0.09, 0.5, 0]],
      [BONES.foot[side], BONES.leg[side], [x * 0.09, 0.08, 0]],
      [BONES.toe[side], BONES.foot[side], [x * 0.09, 0.02, 0.14]],
    );
  }
  const bones = new Map<string, Bone>();
  const world = new Map<string, Vector3>();
  let root: Bone | undefined;
  for (const [name, parent, position] of specs) {
    const bone = new Bone();
    bone.name = name;
    const p = new Vector3(...position).multiplyScalar(scale);
    world.set(name, p);
    if (parent) {
      bone.position.copy(p).sub(world.get(parent)!);
      bones.get(parent)!.add(bone);
    } else {
      bone.position.copy(p);
      root = bone;
    }
    bones.set(name, bone);
  }
  root!.updateMatrixWorld(true);
  return { root: root!, bones };
}
