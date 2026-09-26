import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RIDER_SNAPSHOT } from '../../wave/SurfZoneRunner';
import { BONES, REQUIRED_BONES } from './humanoidBones';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState, readRiderSnapshot } from './riderVisualState';
import { createTestHumanoid } from './testHumanoid';

describe('rider visual state', () => {
  it('decodes the snapshot’s seven points, phase and heading, and the board’s pose', () => {
    const rider = new Float64Array(RIDER_SNAPSHOT.length);
    for (let i = 0; i < 21; i += 1) rider[i] = i;
    rider[RIDER_SNAPSHOT.phase] = 3;
    rider[RIDER_SNAPSHOT.heading] = 0.4;
    const board = [1, 2, 3, 0, 0, 0.6, 0.8, 1];
    const state = readRiderSnapshot(rider, board, createRiderVisualState());
    expect(state.points[POINT.head].toArray()).toEqual([6, 7, 8]);
    expect(state.points[POINT.rightFoot].toArray()).toEqual([18, 19, 20]);
    expect(state.phase).toBe('standing');
    expect(state.heading).toBe(0.4);
    expect(state.boardPosition.toArray()).toEqual([1, 2, 3]);
    expect(state.boardQuaternion.toArray()).toEqual([0, 0, 0.6, 0.8]);
  });

  it('puts a standing regular rider’s left foot forward on the deck, and a goofy rider’s right', () => {
    const regular = posturePoints('standing', 'regular', new Vector3(), new Quaternion(), createRiderVisualState());
    expect(regular.points[POINT.leftFoot].z).toBeGreaterThan(regular.points[POINT.rightFoot].z);
    expect(regular.points[POINT.leftFoot].y).toBeLessThan(0.1);
    expect(regular.points[POINT.head].y).toBeGreaterThan(1.2);
    const goofy = posturePoints('standing', 'goofy', new Vector3(), new Quaternion(), createRiderVisualState());
    expect(goofy.points[POINT.rightFoot].z).toBeGreaterThan(goofy.points[POINT.leftFoot].z);
  });

  it('carries the posture with the board’s pose', () => {
    const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
    const at = new Vector3(10, 0.2, -30);
    const level = posturePoints('prone', 'regular', new Vector3(), new Quaternion(), createRiderVisualState());
    const moved = posturePoints('prone', 'regular', at, turn, createRiderVisualState());
    const expected = level.points[POINT.head].clone().applyQuaternion(turn).add(at);
    expect(moved.points[POINT.head].distanceTo(expected)).toBeLessThan(1e-9);
  });

  it('builds a test skeleton with every bone the rig needs', () => {
    const { bones } = createTestHumanoid();
    for (const name of REQUIRED_BONES) expect(bones.has(name), name).toBe(true);
    expect(bones.get(BONES.hips)!.getWorldPosition(new Vector3()).y).toBeCloseTo(0.95, 9);
  });
});
