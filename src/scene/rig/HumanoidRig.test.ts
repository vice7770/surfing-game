import { Quaternion, Vector3, type Bone } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from '../../physics/AttachedRider';
import { BoardBody } from '../../physics/BoardBody';
import { PlaneWater } from '../../physics/PlaneWater';
import { BONES, type Side } from './humanoidBones';
import { HumanoidRig } from './HumanoidRig';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState } from './riderVisualState';
import { RiderMotion } from './riderMotion';
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

/** The drawn state of a real rider, settled 1.5 s at 7 m/s on flat water with the given crouch and Compress. */
function riderState(crouch: number, compress: number, stance: 'regular' | 'goofy' = 'regular') {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 7));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance });
  board.attach(rider);
  const water = new PlaneWater();
  rider.crouch = crouch;
  rider.compress = compress;
  for (let i = 0; i < 90; i += 1) board.step(1 / 60, water);
  const state = createRiderVisualState();
  for (let i = 0; i < 7; i += 1) rider.renderPoint(i, board, state.points[i]);
  state.phase = 'standing';
  state.heading = 0;
  state.boardPosition.copy(board.position);
  state.boardQuaternion.copy(board.orientation);
  return state;
}

const kneeAngle = (rig: HumanoidRig, side: Side) =>
  (rig.joints.hip[side].clone().sub(rig.joints.knee[side]).angleTo(rig.joints.ankle[side].clone().sub(rig.joints.knee[side])) * 180) / Math.PI;

// Part B, de Sousa 2022: knees at 150° or more extended, 90–110° crouched on the drop, 90° or less compressed. The
// physics' crouch lowers the pelvis; the rig maps its standing height to the model's extended legs. Planing at 7 m/s
// the board rides about 12° nose-up, the front foot 12 cm above the rear, so the front knee always bends more: the
// knees are judged by their mean, and standing by the straighter one too (before: 98°/136°, 65°/94°, 44°/81°).
describe('knees from the physics', () => {
  it.each([
    ['standing', 0, 0, 120, 160],
    ['crouched', 0.6, 0, 90, 115],
    ['compressed', 0.6, 1, 0, 90],
  ])('bends the knees %s', (label, crouch, compress, least, most) => {
    const { bones } = createTestHumanoid();
    const before = boneLengths(bones);
    const rig = new HumanoidRig(bones);
    rig.solve(riderState(crouch as number, compress as number));
    const knees = SIDES.map((side) => kneeAngle(rig, side));
    const mean = (knees[0] + knees[1]) / 2;
    expect(mean).toBeGreaterThanOrEqual(least as number);
    expect(mean).toBeLessThanOrEqual(most as number);
    if (label === 'standing') expect(Math.max(...knees)).toBeGreaterThanOrEqual(150);
    for (const [name, length] of boneLengths(bones)) expect(length, name).toBeCloseTo(before.get(name)!, 9);
  });
});

/** The head bone's facing after a solve: its bind forward (+z) carried by its turn from rest. */
function headFacing(bones: Map<string, Bone>, rest: Quaternion): Vector3 {
  const now = bones.get(BONES.head)!.getWorldQuaternion(new Quaternion());
  return new Vector3(0, 0, 1).applyQuaternion(now.multiply(rest.clone().invert()));
}
const yawOf = (v: Vector3) => (Math.atan2(v.x, v.z) * 180) / Math.PI;
const pitchOf = (v: Vector3) => (Math.asin(Math.max(-1, Math.min(1, v.y / v.length()))) * 180) / Math.PI;

// Part B: the head looks where the board goes, into the turn by the look-ahead, down the face on the drop and up it
// climbing (the reference: the head toward the lip in the bottom turn). Standing only.
describe('the head', () => {
  const board = new Vector3(3, 0.1, -40);
  const level = new Quaternion();
  const look = (stance: 'regular' | 'goofy', motion: { yawRate?: number; climb?: number; phase?: 'standing' | 'prone' | 'landing' } = {}) => {
    const { bones } = createTestHumanoid();
    const rest = bones.get(BONES.head)!.getWorldQuaternion(new Quaternion());
    const rig = new HumanoidRig(bones);
    const state = posturePoints(motion.phase ?? 'standing', stance, board, level, createRiderVisualState());
    Object.assign(state, { yawRate: motion.yawRate ?? 0, climb: motion.climb ?? 0, speed: 7 });
    state.travel.set(0, 0, 1);
    rig.solve(state);
    return headFacing(bones, rest);
  };

  it('looks along the travel going straight', () => {
    for (const stance of ['regular', 'goofy'] as const) expect(Math.abs(yawOf(look(stance)))).toBeLessThan(20);
  });

  // Regular faces −x: turning that way is frontside, where the head leads freely; backside the neck holds it.
  it('leads into the turn, mirrored for Goofy', () => {
    const straight = yawOf(look('regular'));
    expect(straight - yawOf(look('regular', { yawRate: -2 }))).toBeGreaterThan(30);
    expect(yawOf(look('regular', { yawRate: 2 })) - straight).toBeGreaterThan(5);
    const goofy = yawOf(look('goofy'));
    expect(yawOf(look('goofy', { yawRate: 2 })) - goofy).toBeGreaterThan(30);
  });

  it('looks down the face on the drop, and up it climbing', () => {
    expect(pitchOf(look('regular', { climb: -3 })) - pitchOf(look('regular'))).toBeLessThan(-10);
    expect(pitchOf(look('regular', { climb: 3 })) - pitchOf(look('regular'))).toBeGreaterThan(10);
  });

  // Review Focus 4.
  it('keeps the lying and landing heads as they were', () => {
    for (const phase of ['prone', 'landing'] as const) {
      const still = look('regular', { phase });
      const moving = look('regular', { phase, yawRate: 2, climb: -3 });
      expect(still.distanceTo(moving)).toBeLessThan(1e-9);
    }
  });
});

// Part B: the trunk turns into the turn, the shoulders leading the hips (the reference's trunk rotation; the
// riding-the-wave spec's torso and shoulders turning into turns). Standing only.
describe('the trunk', () => {
  const board = new Vector3(3, 0.1, -40);
  const level = new Quaternion();
  const twisted = (stance: 'regular' | 'goofy', yawRate: number) => {
    const { bones } = createTestHumanoid();
    const before = boneLengths(bones);
    const rig = new HumanoidRig(bones);
    const state = posturePoints('standing', stance, board, level, createRiderVisualState());
    Object.assign(state, { yawRate, speed: 7 });
    rig.solve(state);
    for (const [name, length] of boneLengths(bones)) expect(length, name).toBeCloseTo(before.get(name)!, 9);
    for (const side of SIDES) {
      const foot = state.points[footPoint(side)];
      expect(Math.hypot(rig.joints.ankle[side].x - foot.x, rig.joints.ankle[side].z - foot.z)).toBeCloseTo(rig.heelToMidfoot, 3);
    }
    const hips = rig.joints.hip.left.clone().sub(rig.joints.hip.right);
    return { chest: yawOf(rig.facing), hips: yawOf(hips) };
  };

  it.each(['regular', 'goofy'] as const)('turns the chest into the turn and the hips less, %s', (stance) => {
    const turn = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;
    const straight = twisted(stance, 0);
    const left = twisted(stance, 2);
    const right = twisted(stance, -2);
    expect(turn(straight.chest, left.chest)).toBeGreaterThan(20);
    expect(turn(right.chest, straight.chest)).toBeGreaterThan(20);
    const hipsTurn = turn(straight.hips, left.hips);
    expect(hipsTurn).toBeGreaterThan(0);
    expect(hipsTurn).toBeLessThan(turn(straight.chest, left.chest));
  });
});

// Part B: in a turn the leading arm (the front foot's side) points where the head looks; a hand reaching down to the
// water (E's, or Compress's inside hand) is reached, the spine bending toward it (de Sousa 2022: the leading arm to the
// lip; the inside hand to the water).
describe('the arms', () => {
  const board = new Vector3(3, 0.1, -40);
  const level = new Quaternion();
  const solved = (stance: 'regular' | 'goofy', yawRate: number, move?: (state: ReturnType<typeof createRiderVisualState>, rig: HumanoidRig) => void) => {
    const { bones } = createTestHumanoid();
    const before = boneLengths(bones);
    const rig = new HumanoidRig(bones);
    const state = posturePoints('standing', stance, board, level, createRiderVisualState());
    Object.assign(state, { yawRate, speed: 7 });
    rig.solve(state);
    if (move) {
      move(state, rig);
      rig.solve(state);
    }
    for (const [name, length] of boneLengths(bones)) expect(length, name).toBeCloseTo(before.get(name)!, 9);
    return { rig, state };
  };
  const aim = (rig: HumanoidRig, side: Side, toward: Vector3) =>
    (rig.joints.wrist[side].clone().sub(rig.joints.shoulder[side]).angleTo(toward) * 180) / Math.PI;

  it.each([['regular', -2, 'left'], ['goofy', 2, 'right']] as const)('points the leading arm where the head looks, %s', (stance, yawRate, lead) => {
    const { rig } = solved(stance, yawRate);
    expect(aim(rig, lead, rig.look)).toBeLessThan(25);
  });

  it('keeps the physics’ hands going straight, and the rear hand in a turn', () => {
    const straight = solved('regular', 0);
    for (const side of SIDES) expect(aim(straight.rig, side, straight.state.points[handPoint(side)].clone().sub(straight.rig.joints.shoulder[side]))).toBeLessThan(3);
    const turning = solved('regular', -2);
    expect(aim(turning.rig, 'right', turning.state.points[POINT.rightHand].clone().sub(turning.rig.joints.shoulder.right))).toBeLessThan(3);
  });

  it('bends toward a hand reaching down past the arm’s length, and reaches it', () => {
    let target = new Vector3();
    const { rig } = solved('regular', 0, (state, first) => {
      const shoulder = first.joints.shoulder.right;
      const tail = new Vector3().subVectors(state.points[POINT.rightFoot], state.points[POINT.leftFoot]).setY(0).normalize();
      target = shoulder.clone().addScaledVector(tail.multiplyScalar(0.6).add(new Vector3(0, -0.8, 0)).normalize(), first.armLength + 0.15);
      state.points[POINT.rightHand].copy(target);
    });
    expect(rig.joints.wrist.right.distanceTo(target)).toBeLessThan(0.05);
  });
});

// The final review: every pop-up snapped the drawn body at its switches (the hips 11.6 cm at push → landing, the head
// 15° at landing → standing, and turning the chest and the leading arm too). The body eases in instead.
describe('the stand-up', () => {
  const popUp = (yawRate?: number) => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0));
    const rider = new AttachedRider(board.shape, { phase: 'prone' });
    board.attach(rider);
    const water = new PlaneWater();
    const tow = () => {
      board.velocity.z = 6;
      rider.velocity.z = 6;
    };
    for (let i = 0; i < 180; i += 1) {
      tow();
      board.step(1 / 60, water);
    }
    rider.popUp();
    const motion = new RiderMotion();
    const { bones } = createTestHumanoid();
    const headRest = bones.get(BONES.head)!.getWorldQuaternion(new Quaternion());
    const rig = new HumanoidRig(bones);
    const state = createRiderVisualState();
    let previous: { phase: string; hips: Vector3; head: Vector3; chest: Vector3; wrist: Vector3 } | undefined;
    const worst = { hips: 0, head: 0, chest: 0, wrist: 0 };
    const phases = new Set<string>();
    for (let i = 0; i < 150; i += 1) {
      tow();
      board.step(1 / 60, water);
      for (let p = 0; p < 7; p += 1) rider.renderPoint(p, board, state.points[p]);
      state.phase = rider.attached ? rider.phase : 'fallen';
      state.heading = 0;
      state.boardPosition.copy(board.position);
      state.boardQuaternion.copy(board.orientation);
      motion.update(state, (180 + i) / 60);
      if (yawRate !== undefined && state.phase === 'standing') state.yawRate = yawRate;
      rig.solve(state);
      phases.add(state.phase);
      const now = {
        phase: state.phase,
        hips: bones.get(BONES.hips)!.getWorldPosition(new Vector3()).sub(board.position),
        head: headFacing(bones, headRest),
        chest: rig.facing.clone(),
        wrist: rig.joints.wrist.left.clone().sub(board.position),
      };
      if (previous && previous.phase !== now.phase) {
        worst.hips = Math.max(worst.hips, now.hips.distanceTo(previous.hips));
        // The lying → upright switch at push → landing is G7's own (its body frame turns); this branch's cues start standing.
        if (now.phase === 'standing') {
          worst.head = Math.max(worst.head, (now.head.angleTo(previous.head) * 180) / Math.PI);
          worst.chest = Math.max(worst.chest, (now.chest.angleTo(previous.chest) * 180) / Math.PI);
          worst.wrist = Math.max(worst.wrist, now.wrist.distanceTo(previous.wrist));
        }
      }
      previous = now;
    }
    expect([...phases]).toEqual(expect.arrayContaining(['push', 'landing', 'standing']));
    return worst;
  };

  it('eases the body into standing, with no snap at its switches', () => {
    const straight = popUp();
    expect(straight.hips).toBeLessThan(0.03);
    expect(straight.head).toBeLessThan(5);
    const turning = popUp(-2);
    expect(turning.head).toBeLessThan(5);
    expect(turning.chest).toBeLessThan(6);
    expect(turning.wrist).toBeLessThan(0.05);
  });
});
