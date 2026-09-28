import { readFileSync } from 'node:fs';
import { Quaternion, Vector3, type Bone } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { stanceState } from '../../dev/ridingPoses';
import { readGlbSkeleton } from './glbSkeleton';
import { BONES } from './humanoidBones';
import { HumanoidRig, RIG_DETAIL } from './HumanoidRig';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from './riderVisualState';
import { StanceGauge } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

const at = new Vector3(0, 0.03, 0);
const saved = { arms: RIG_DETAIL.arms.share, clavicle: RIG_DETAIL.clavicle.share };
afterEach(() => {
  RIG_DETAIL.arms.share = saved.arms;
  RIG_DETAIL.clavicle.share = saved.clavicle;
});

function solve(state: RiderVisualState) {
  const { root, bones } = createTestHumanoid();
  const gauge = new StanceGauge(bones);
  const rig = new HumanoidRig(bones);
  rig.solve(state);
  root.updateMatrixWorld(true);
  return { bones, rig, gauge };
}
const world = (bones: Map<string, Bone>, name: string) => bones.get(name)!.getWorldPosition(new Vector3());

describe('the clavicles and the toes (the stance poses, step 3)', () => {
  it('lifts a clavicle with its arm raised out to 90°, by about a third of the arm above 30°, none hanging', () => {
    // The physics' hands as they are (no stance shape): the left one straight out from the shoulder, the right hanging.
    RIG_DETAIL.arms.share = 0;
    // The hands' targets from the shoulders as the rig places them with the clavicles still.
    RIG_DETAIL.clavicle.share = 0;
    const state = posturePoints('standing', 'regular', at, new Quaternion(), createRiderVisualState());
    const probe = solve(state);
    const shoulder = world(probe.bones, BONES.arm.left);
    const trunkUp = world(probe.bones, BONES.neck).sub(world(probe.bones, BONES.hips)).normalize();
    const out = shoulder.clone().sub(world(probe.bones, BONES.spine[2])).projectOnPlane(trunkUp).normalize();
    state.points[POINT.leftHand].copy(shoulder).addScaledVector(out, 0.6);
    state.points[POINT.rightHand].copy(world(probe.bones, BONES.arm.right)).addScaledVector(trunkUp, -0.6);
    const lift = (share: number) => {
      RIG_DETAIL.clavicle.share = share;
      const { bones } = solve(state);
      const clavicle = (side: 'left' | 'right') => world(bones, BONES.arm[side]).sub(world(bones, BONES.shoulder[side])).normalize();
      return { left: clavicle('left'), right: clavicle('right') };
    };
    const driven = lift(1);
    const still = lift(0);
    const degrees = (a: Vector3, b: Vector3) => (a.angleTo(b) * 180) / Math.PI;
    expect(degrees(driven.left, still.left)).toBeGreaterThanOrEqual(15);
    expect(degrees(driven.left, still.left)).toBeLessThanOrEqual(25);
    expect(degrees(driven.right, still.right)).toBeLessThan(3);
  });

  it('carries a free hand with its clavicle: the elbow keeps its soft bend', () => {
    const state = stanceState('trim', 'regular', at, createRiderVisualState()).state;
    const elbow = (share: number) => {
      RIG_DETAIL.clavicle.share = share;
      const probe = solve(state);
      return probe.gauge.measure(state, 'regular');
    };
    const driven = elbow(1);
    const still = elbow(0);
    expect(Math.abs(driven.leadElbow - still.leadElbow)).toBeLessThan(3);
    expect(Math.abs(driven.trailElbow - still.trailElbow)).toBeLessThan(3);
  });

  it('lifts the heel past the ankle’s weight-bearing reach, the ball and the toes on the deck', () => {
    // The hand in the face on surfer1: its front ankle closes to 44° with the heel down.
    const bytes = readFileSync('public/assets/surfers/surfer1.glb');
    const glb = () => readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const state = stanceState('hand-in-face', 'regular', at, createRiderVisualState()).state;
    const pose = () => {
      const { root, bones } = glb();
      const gauge = new StanceGauge(bones);
      new HumanoidRig(bones).solve(state);
      root.updateMatrixWorld(true);
      return { bones, angles: gauge.measure(state, 'regular') };
    };
    const reach = RIG_DETAIL.maxDorsiflexion;
    RIG_DETAIL.maxDorsiflexion = 90;
    const flat = pose().angles;
    RIG_DETAIL.maxDorsiflexion = reach;
    const { bones, angles } = pose();
    expect(Math.max(flat.ankleFront, flat.ankleRear)).toBeGreaterThan(42);
    expect(Math.max(angles.ankleFront, angles.ankleRear)).toBeLessThanOrEqual(42);
    const deckUp = new Vector3(0, 1, 0).applyQuaternion(state.boardQuaternion);
    for (const side of ['left', 'right'] as const) {
      const foot = state.points[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
      // The ball stays on the deck: no higher above the foot's point than a flat foot's.
      expect(world(bones, BONES.toe[side]).sub(foot).dot(deckUp), side).toBeLessThan(0.05);
    }
  });

  it('keeps the heel down within the ankle’s reach: trim is as it was', () => {
    const state = stanceState('trim', 'regular', at, createRiderVisualState()).state;
    const lifted = solve(state);
    const reach = RIG_DETAIL.maxDorsiflexion;
    RIG_DETAIL.maxDorsiflexion = 90;
    const flat = solve(state);
    RIG_DETAIL.maxDorsiflexion = reach;
    for (const side of ['left', 'right'] as const) {
      expect(world(lifted.bones, BONES.foot[side]).distanceTo(world(flat.bones, BONES.foot[side])), side).toBeLessThan(1e-6);
    }
  });
});
