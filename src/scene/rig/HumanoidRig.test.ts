import { Quaternion, Vector3, type Bone } from 'three';
import { describe, expect, it } from 'vitest';
import { BONES, type Side } from './humanoidBones';
import { HumanoidRig } from './HumanoidRig';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState } from './riderVisualState';
import { createTestHumanoid } from './testHumanoid';

const SIDES: readonly Side[] = ['left', 'right'];
const footPoint = (side: Side) => (side === 'left' ? POINT.leftFoot : POINT.rightFoot);
const handPoint = (side: Side) => (side === 'left' ? POINT.leftHand : POINT.rightHand);
const worldOf = (bones: Map<string, Bone>, name: string) => bones.get(name)!.getWorldPosition(new Vector3());
function boneLengths(bones: Map<string, Bone>): Map<string, number> {
  const lengths = new Map<string, number>();
  for (const bone of bones.values()) if (bone.parent) lengths.set(bone.name, worldOf(bones, bone.name).distanceTo(bone.parent.getWorldPosition(new Vector3())));
  return lengths;
}

describe('humanoid rig', () => {
  const board = new Vector3(3, 0.1, -40);
  const level = new Quaternion();

  it('refuses a skeleton missing a bone it needs', () => {
    const { bones } = createTestHumanoid();
    bones.delete(BONES.leg.left);
    expect(() => new HumanoidRig(bones)).toThrow(/mixamorigLeftLeg/);
  });

  it('stands on the deck: feet on their points, knees toward the toe side, elbows down, no bone stretched', () => {
    const { bones } = createTestHumanoid();
    const before = boneLengths(bones);
    const rig = new HumanoidRig(bones);
    const state = posturePoints('standing', 'regular', board, level, createRiderVisualState());
    rig.solve(state);
    expect(rig.facing.x).toBeLessThan(-0.5); // regular faces the board's right (−x) rail
    for (const side of SIDES) {
      const foot = state.points[footPoint(side)];
      const ankle = rig.joints.ankle[side];
      expect(Math.abs(ankle.y - foot.y - rig.soleHeight)).toBeLessThan(0.005);
      expect(Math.hypot(ankle.x - foot.x, ankle.z - foot.z)).toBeCloseTo(rig.heelToMidfoot, 3);
      const legMiddle = rig.joints.hip[side].clone().lerp(ankle, 0.5);
      expect(rig.joints.knee[side].clone().sub(legMiddle).dot(rig.facing)).toBeGreaterThan(0.01);
      const armMiddle = rig.joints.shoulder[side].clone().lerp(rig.joints.wrist[side], 0.5);
      expect(rig.joints.elbow[side].y).toBeLessThanOrEqual(armMiddle.y + 1e-9);
      // The toes rest on the deck too: the foot keeps its rest pitch.
      expect(worldOf(bones, BONES.toe[side]).y - foot.y).toBeCloseTo(0.02, 3);
    }
    for (const [name, length] of boneLengths(bones)) expect(length, name).toBeCloseTo(before.get(name)!, 9);
  });

  it('matches the drawn joints to the skeleton’s bones', () => {
    const { bones } = createTestHumanoid();
    const rig = new HumanoidRig(bones);
    rig.solve(posturePoints('standing', 'regular', board, level, createRiderVisualState()));
    for (const side of SIDES) {
      expect(worldOf(bones, BONES.leg[side]).distanceTo(rig.joints.knee[side])).toBeLessThan(1e-9);
      expect(worldOf(bones, BONES.foot[side]).distanceTo(rig.joints.ankle[side])).toBeLessThan(1e-9);
      expect(worldOf(bones, BONES.foreArm[side]).distanceTo(rig.joints.elbow[side])).toBeLessThan(1e-9);
      expect(worldOf(bones, BONES.hand[side]).distanceTo(rig.joints.wrist[side])).toBeLessThan(1e-9);
    }
  });

  it('mirrors goofy against regular across the stringer', () => {
    const regular = createTestHumanoid();
    const goofy = createTestHumanoid();
    new HumanoidRig(regular.bones).solve(posturePoints('standing', 'regular', new Vector3(), level, createRiderVisualState()));
    new HumanoidRig(goofy.bones).solve(posturePoints('standing', 'goofy', new Vector3(), level, createRiderVisualState()));
    for (const [left, right] of [[BONES.foot.left, BONES.foot.right], [BONES.leg.left, BONES.leg.right], [BONES.hand.left, BONES.hand.right], [BONES.toe.left, BONES.toe.right]] as const) {
      for (const [a, b] of [[left, right], [right, left]] as const) {
        const p = worldOf(regular.bones, a);
        const q = worldOf(goofy.bones, b);
        expect(p.x).toBeCloseTo(-q.x, 6);
        expect(p.y).toBeCloseTo(q.y, 6);
        expect(p.z).toBeCloseTo(q.z, 6);
      }
    }
  });

  it('keeps the feet on the deck when the legs are too short for the pelvis point', () => {
    const { bones } = createTestHumanoid(0.9);
    const rig = new HumanoidRig(bones);
    const state = posturePoints('standing', 'regular', new Vector3(), level, createRiderVisualState());
    state.points[POINT.pelvis].y += 0.25;
    state.points[POINT.torso].y += 0.25;
    state.points[POINT.head].y += 0.25;
    rig.solve(state);
    for (const side of SIDES) {
      const foot = state.points[footPoint(side)];
      expect(Math.abs(rig.joints.ankle[side].y - foot.y - rig.soleHeight)).toBeLessThan(0.005);
    }
  });

  it('paddles prone: chest down, hands on their points, knees toward the deck', () => {
    const { bones } = createTestHumanoid();
    const rig = new HumanoidRig(bones);
    const state = posturePoints('prone', 'regular', board, level, createRiderVisualState());
    rig.solve(state);
    expect(rig.facing.y).toBeLessThan(-0.9);
    for (const side of SIDES) {
      const hand = state.points[handPoint(side)];
      expect(rig.joints.shoulder[side].distanceTo(hand)).toBeLessThan(rig.armLength * 0.98);
      expect(rig.joints.wrist[side].distanceTo(hand)).toBeLessThan(1e-6);
      // The knee bends off the hip–ankle line only toward the deck (lying legs are nearly straight).
      const hip = rig.joints.hip[side];
      const line = rig.joints.ankle[side].clone().sub(hip).normalize();
      const offset = rig.joints.knee[side].clone().sub(hip);
      offset.addScaledVector(line, -offset.dot(line));
      expect(offset.y).toBeLessThanOrEqual(1e-6);
    }
  });

  it('reaches a fallen limb through its centre point', () => {
    const { bones } = createTestHumanoid();
    const rig = new HumanoidRig(bones);
    const state = posturePoints('prone', 'regular', board, level, createRiderVisualState());
    state.phase = 'fallen';
    rig.solve(state);
    for (const side of SIDES) {
      const centre = state.points[handPoint(side)];
      const shoulder = rig.joints.shoulder[side];
      const reach = rig.joints.wrist[side].clone().sub(shoulder);
      const toCentre = centre.clone().sub(shoulder).normalize();
      expect(reach.clone().normalize().dot(toCentre)).toBeGreaterThan(0.999);
      expect(reach.length()).toBeCloseTo(0.92 * rig.armLength, 6);
    }
  });

  it('stays finite for a fallen body lying exactly along its heading', () => {
    const { bones } = createTestHumanoid();
    const rig = new HumanoidRig(bones);
    const state = createRiderVisualState();
    state.phase = 'fallen';
    state.heading = 0;
    const along = [[0, 0, 0], [0, 0, 0.3], [0, 0, 0.6], [0.3, 0, 0.3], [-0.3, 0, 0.3], [0.1, 0, -0.4], [-0.1, 0, -0.4]];
    along.forEach(([x, y, z], i) => state.points[i].set(x, y, z));
    rig.solve(state);
    for (const bone of bones.values()) {
      const { x, y, z, w } = bone.quaternion;
      expect(Number.isFinite(x + y + z + w), bone.name).toBe(true);
    }
  });
});
