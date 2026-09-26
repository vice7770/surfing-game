import { Bone, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { orientBone } from './orientBone';

describe('orientBone', () => {
  it('points the local axis along the direction and turns the hint toward its target, under a turned parent', () => {
    const parent = new Bone();
    parent.quaternion.setFromAxisAngle(new Vector3(1, 0, 0), 0.7);
    const bone = new Bone();
    bone.position.set(0, 0.3, 0);
    parent.add(bone);
    parent.updateMatrixWorld(true);
    const axis = new Vector3(0, 1, 0);
    const hint = new Vector3(0, 0, 1);
    const direction = new Vector3(1, 1, 0).normalize();
    const hintTarget = new Vector3(0, 0.3, 1);
    orientBone(bone, axis, hint, direction, hintTarget);
    const world = bone.getWorldQuaternion(new Quaternion());
    expect(axis.clone().applyQuaternion(world).distanceTo(direction)).toBeLessThan(1e-9);
    const hintWorld = hint.clone().applyQuaternion(world);
    const wanted = hintTarget.clone().addScaledVector(direction, -hintTarget.dot(direction)).normalize();
    expect(hintWorld.distanceTo(wanted)).toBeLessThan(1e-9);
  });

  it('updates the bone’s children with it', () => {
    const bone = new Bone();
    const child = new Bone();
    child.position.set(0, 1, 0);
    bone.add(child);
    bone.updateMatrixWorld(true);
    orientBone(bone, new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(0, 0, 1));
    expect(child.getWorldPosition(new Vector3()).distanceTo(new Vector3(1, 0, 0))).toBeLessThan(1e-9);
  });

  it('keeps a unit rotation when the hint lies along the direction', () => {
    const bone = new Bone();
    bone.updateMatrixWorld(true);
    orientBone(bone, new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, 1), new Vector3(0, 0, 1));
    expect(Math.abs(bone.quaternion.length() - 1)).toBeLessThan(1e-9);
    expect(new Vector3(0, 1, 0).applyQuaternion(bone.quaternion).distanceTo(new Vector3(0, 0, 1))).toBeLessThan(1e-9);
  });
});
