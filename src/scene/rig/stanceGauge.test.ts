import { readFileSync } from 'node:fs';
import { Quaternion, Vector3, type Bone, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { StanceName } from '../../physics/riderPosture';
import { readGlbSkeleton } from './glbSkeleton';
import { BONES } from './humanoidBones';
import { StanceGauge, measureJoints } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

const UP = new Vector3(0, 1, 0);
const board = { boardPosition: new Vector3(), boardQuaternion: new Quaternion() };

/**
 * The test humanoid standing across a level board at the origin: Regular faces
 * the board's −x rail with its left side (the front foot) toward the nose (+z);
 * Goofy faces +x with its right side toward the nose.
 */
function standing(stance: StanceName) {
  const { root, bones } = createTestHumanoid();
  const gauge = new StanceGauge(bones);
  root.quaternion.setFromAxisAngle(UP, stance === 'regular' ? -Math.PI / 2 : Math.PI / 2);
  root.updateMatrixWorld(true);
  const turn = (name: string, axis: Vector3, degrees: number) => {
    bones.get(name)!.quaternion.premultiply(new Quaternion().setFromAxisAngle(axis, (degrees * Math.PI) / 180));
    root.updateMatrixWorld(true);
  };
  return { root, bones, gauge, turn, measure: () => gauge.measure(board, stance) };
}

describe('the stance gauge', () => {
  it('reads a body standing straight, arms out, across the board', () => {
    const { measure } = standing('regular');
    const angles = measure();
    for (const key of ['kneeFront', 'kneeRear', 'hipFront', 'hipRear', 'leadElbow', 'trailElbow'] as const) expect(angles[key], key).toBeCloseTo(180, 3);
    for (const key of ['ankleFront', 'ankleRear', 'trunkFlexion', 'trunkPitch', 'trunkTilt', 'lean', 'chestTwist', 'hipTwist', 'headYaw', 'headPitch'] as const) expect(angles[key], key).toBeCloseTo(0, 3);
    expect(angles.leadArm).toBeCloseTo(90, 3);
    expect(angles.trailArm).toBeCloseTo(90, 3);
    // The test humanoid's ankles are 0.18 m apart, its hips between them.
    expect(angles.stanceWidth).toBeCloseTo(0.18, 6);
    expect(angles.weight).toBeCloseTo(0.5, 6);
    expect(angles.lowHand).toBeCloseTo(1.4, 6);
  });

  it('reads each joint as it is turned, in the body’s own terms', () => {
    // The bones' axes are the body's at rest: +x its left, +z its facing. Each turn on a body of its own.
    const turned = (name: string, axis: Vector3, degrees: number) => {
      const body = standing('regular');
      body.turn(name, axis, degrees);
      return body.measure();
    };
    // The left leg is Regular's front: its knee bent to a right angle, its thigh still under the hips.
    const knee = turned(BONES.leg.left, new Vector3(1, 0, 0), 90);
    expect(knee.kneeFront).toBeCloseTo(90, 3);
    expect(knee.kneeRear).toBeCloseTo(180, 3);
    // The trunk bent 30° over the toes, and the hips' angle closing with it.
    const trunk = turned(BONES.spine[0], new Vector3(1, 0, 0), 30);
    expect(trunk.trunkFlexion).toBeCloseTo(30, 3);
    expect(trunk.hipFront).toBeCloseTo(150, 3);
    // The head turned 45° toward the nose (the body's left), and tipped 20° down.
    expect(turned(BONES.head, UP, 45).headYaw).toBeCloseTo(45, 3);
    expect(turned(BONES.head, new Vector3(1, 0, 0), 20).headPitch).toBeCloseTo(20, 3);
    // The lead (left) arm hanging; the trailing elbow bent 60°.
    expect(turned(BONES.arm.left, new Vector3(0, 0, 1), -90).leadArm).toBeCloseTo(0, 3);
    expect(turned(BONES.foreArm.right, UP, 60).trailElbow).toBeCloseTo(120, 3);
    // The front shin tipped 20° from the deck's normal: the ankle's flexion with the foot flat.
    expect(turned(BONES.leg.left, new Vector3(1, 0, 0), -20).ankleFront).toBeCloseTo(20, 3);
  });

  it('mirrors for Goofy: the right side leads', () => {
    const { measure, turn } = standing('goofy');
    turn(BONES.leg.right, new Vector3(1, 0, 0), 90);
    turn(BONES.head, UP, -45);
    turn(BONES.arm.right, new Vector3(0, 0, 1), 90);
    const angles = measure();
    expect(angles.kneeFront).toBeCloseTo(90, 3);
    expect(angles.kneeRear).toBeCloseTo(180, 3);
    expect(angles.headYaw).toBeCloseTo(45, 3);
    expect(angles.leadArm).toBeCloseTo(0, 3);
    expect(angles.trailArm).toBeCloseTo(90, 3);
  });

  it('reads the weight, the lean and the twist against the board', () => {
    const { gauge, turn } = standing('regular');
    // The chest opened 20° toward the nose.
    turn(BONES.spine[1], UP, 20);
    const joints = gauge.joints();
    let angles = measureJoints(joints, board, 'regular');
    expect(angles.chestTwist).toBeCloseTo(20, 3);
    expect(angles.hipTwist).toBeCloseTo(0, 3);
    // The hips over the front ankle (toward the nose).
    joints.hips.z = joints.ankle.left.z;
    expect(measureJoints(joints, board, 'regular').weight).toBeCloseTo(1, 6);
    // The board rolled 30° onto its toe rail, the body upright on it: the body leans 30° toward the toes.
    const rolled = { boardPosition: new Vector3(), boardQuaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (30 * Math.PI) / 180) };
    const onRail = standing('regular');
    onRail.root.quaternion.premultiply(rolled.boardQuaternion);
    onRail.root.updateMatrixWorld(true);
    angles = onRail.gauge.measure(rolled, 'regular');
    expect(angles.lean).toBeCloseTo(30, 3);
    // Upright on the rolled deck, the trunk tilts 30° from the world's vertical (what a picture shows).
    expect(angles.trunkFlexion).toBeCloseTo(0, 3);
    expect(angles.trunkTilt).toBeCloseTo(30, 3);
  });

  it('stays finite at a straight joint and a hanging arm', () => {
    const { measure, turn } = standing('regular');
    turn(BONES.arm.left, new Vector3(0, 0, 1), -90);
    for (const value of Object.values(measure())) expect(Number.isFinite(value)).toBe(true);
  });

  it('reads a surfer’s skeleton at rest as straight legs facing the toes', () => {
    const bytes = readFileSync('public/assets/surfers/surfer3.glb');
    const { root, bones } = readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const gauge = new StanceGauge(bones as Map<string, Bone>);
    (root as Object3D).quaternion.setFromAxisAngle(UP, -Math.PI / 2);
    root.updateMatrixWorld(true);
    const angles = gauge.measure(board, 'regular');
    expect(angles.kneeFront).toBeGreaterThan(170);
    expect(angles.kneeRear).toBeGreaterThan(170);
    expect(Math.abs(angles.chestTwist)).toBeLessThan(5);
    expect(Math.abs(angles.hipTwist)).toBeLessThan(5);
    expect(Math.abs(angles.headYaw)).toBeLessThan(5);
  });
});
