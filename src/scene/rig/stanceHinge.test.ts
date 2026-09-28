import { Quaternion, Vector3, type Bone } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { stanceState } from '../../dev/ridingPoses';
import { BONES, type Side } from './humanoidBones';
import { HumanoidRig, RIG_DETAIL } from './HumanoidRig';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from './riderVisualState';
import { StanceGauge } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

const at = new Vector3(0, 0.03, 0);
const SIDES: readonly Side[] = ['left', 'right'];
const saved = { ...RIG_DETAIL.hipAngle };
afterEach(() => Object.assign(RIG_DETAIL.hipAngle, saved));

/** The body's centre of mass from its joints (Winter 2009's segment shares), in the world. */
function centreOfMass(bones: Map<string, Bone>): Vector3 {
  const at = (name: string) => bones.get(name)!.getWorldPosition(new Vector3());
  const mid = (a: string, b: string) => at(a).add(at(b)).multiplyScalar(0.5);
  const parts: [number, Vector3][] = [
    [0.081, at(BONES.head)],
    [0.355, mid(BONES.spine[0], BONES.neck)],
    [0.142, mid(BONES.upLeg.left, BONES.upLeg.right)],
  ];
  for (const side of SIDES) {
    parts.push([0.028, mid(BONES.arm[side], BONES.foreArm[side])], [0.022, mid(BONES.foreArm[side], BONES.hand[side])]);
    parts.push([0.1, mid(BONES.upLeg[side], BONES.leg[side])], [0.0465, mid(BONES.leg[side], BONES.foot[side])], [0.0145, at(BONES.foot[side])]);
  }
  const total = parts.reduce((sum, [share]) => sum + share, 0);
  return parts.reduce((sum, [share, point]) => sum.addScaledVector(point, share / total), new Vector3());
}

/** The test humanoid posed by the rig at `state`, and its gauge. */
function posed(state: RiderVisualState) {
  const { root, bones } = createTestHumanoid();
  const gauge = new StanceGauge(bones);
  new HumanoidRig(bones).solve(state);
  root.updateMatrixWorld(true);
  return { bones, angles: gauge.measure(state, 'regular') };
}

const without = () => Object.assign(RIG_DETAIL.hipAngle, { tall: 180, deep: 180 });

describe('the trunk hinged at the hips (the stance poses, step 3)', () => {
  it('folds Compress\'s hips to the thesis\'s 90° or less', () => {
    const { angles } = posed(stanceState('compress-frontside', 'regular', at, createRiderVisualState()).state);
    expect((angles.hipFront + angles.hipRear) / 2).toBeLessThanOrEqual(90);
    expect((angles.hipFront + angles.hipRear) / 2).toBeGreaterThanOrEqual(60);
  });

  it('bends trim forward over the toes, hips back', () => {
    const state = stanceState('trim', 'regular', at, createRiderVisualState()).state;
    const hinged = posed(state).angles;
    without();
    const upright = posed(state).angles;
    expect(hinged.trunkFlexion).toBeGreaterThan(upright.trunkFlexion + 8);
    expect((hinged.hipFront + hinged.hipRear) / 2).toBeLessThan((upright.hipFront + upright.hipRear) / 2 - 8);
  });

  it('keeps the centre of mass where the upright body has it, within 2 cm', () => {
    // The hinge alone: Part B's bend toward a reaching hand moves the centre of mass of its own, in both.
    const bend = RIG_DETAIL.reachBend;
    RIG_DETAIL.reachBend = 0;
    try {
      for (const id of ['trim', 'drop', 'compress-frontside', 'compress-backside']) {
        const state = stanceState(id, 'regular', at, createRiderVisualState()).state;
        const hinged = centreOfMass(posed(state).bones);
        without();
        const upright = centreOfMass(posed(state).bones);
        Object.assign(RIG_DETAIL.hipAngle, saved);
        expect(Math.hypot(hinged.x - upright.x, hinged.z - upright.z), id).toBeLessThan(0.02);
      }
    } finally {
      RIG_DETAIL.reachBend = bend;
    }
  });

  it('turning backside, leans no further over the toes than Hobgood\'s cue allows', () => {
    const state = stanceState('compress-backside', 'regular', at, createRiderVisualState()).state;
    // The middle of the map's ±20° (Hobgood): upright on the deck, give or take the spine's spread.
    expect(posed(state).angles.trunkFlexion).toBeLessThanOrEqual(5);
  });

  it('leaves the feet where they were and a reaching hand on its point', () => {
    // The hinge alone: the heel lifts with the knees the hinge moves (the ankle's reach), in both runs held flat.
    const reach = RIG_DETAIL.maxDorsiflexion;
    RIG_DETAIL.maxDorsiflexion = 90;
    const state = stanceState('compress-frontside', 'regular', at, createRiderVisualState()).state;
    const { bones } = posed(state);
    without();
    const plain = posed(state).bones;
    Object.assign(RIG_DETAIL.hipAngle, saved);
    RIG_DETAIL.maxDorsiflexion = reach;
    for (const side of SIDES) {
      const ankle = (all: Map<string, Bone>) => all.get(BONES.foot[side])!.getWorldPosition(new Vector3());
      expect(ankle(bones).distanceTo(ankle(plain)), side).toBeLessThan(0.005);
    }
    // The inside hand at the water: the lower of the two, on its point.
    const lower = state.points[POINT.leftHand].y < state.points[POINT.rightHand].y ? 'left' : 'right';
    const wrist = bones.get(BONES.hand[lower])!.getWorldPosition(new Vector3());
    expect(wrist.distanceTo(state.points[lower === 'left' ? POINT.leftHand : POINT.rightHand])).toBeLessThan(0.01);
  });

  it('lets a leg standing tall straighten past the old 152° cap, never locked', () => {
    // de Sousa 2022's final phase: the knees to 150° or more. The rig stopped a leg at 152°, its reach 0.97 of its
    // length; extending 0.3 s after Compress the physics' pelvis is still rising (148°: the physics' timing, step 6).
    const { angles } = posed(stanceState('trim-back', 'regular', at, createRiderVisualState()).state);
    expect(Math.max(angles.kneeFront, angles.kneeRear)).toBeGreaterThan(153);
    for (const id of ['trim', 'trim-back', 'extension-frontside', 'extension-backside']) {
      const read = posed(stanceState(id, 'regular', at, createRiderVisualState()).state).angles;
      expect(Math.max(read.kneeFront, read.kneeRear), id).toBeLessThanOrEqual(165);
    }
  });

  it('bends the trunk no faster than a brisk trunk bend, whatever the physics does in a step', () => {
    // Standing tall, then at once crouched for the drop, 1/60 s later: the hinge swings at most hingeRate × dt. (Not
    // Compress: its bend toward the hand at the water makes up whatever the hinge leaves.)
    const { bones } = createTestHumanoid();
    const gauge = new StanceGauge(bones);
    const rig = new HumanoidRig(bones);
    const tall = stanceState('trim', 'regular', at, createRiderVisualState()).state;
    tall.clock = 1;
    rig.solve(tall);
    const before = gauge.measure(tall, 'regular').trunkFlexion;
    const deep = stanceState('drop', 'regular', at, createRiderVisualState()).state;
    deep.clock = 1 + 1 / 60;
    rig.solve(deep);
    const reset = createTestHumanoid();
    const gauge2 = new StanceGauge(reset.bones);
    new HumanoidRig(reset.bones).solve(deep);
    const fresh = gauge2.measure(deep, 'regular').trunkFlexion;
    const limited = gauge.measure(deep, 'regular').trunkFlexion;
    // Fresh (no frame before), the full hinge; a frame after standing tall, a step of it.
    expect(fresh - before).toBeGreaterThan(15);
    expect(limited - before).toBeLessThan(fresh - before - 10);
    // After a reset, the next solve is fresh.
    rig.reset();
    rig.solve(deep);
    expect(gauge.measure(deep, 'regular').trunkFlexion).toBeCloseTo(fresh, 3);
  });

  it('leaves the body lying and pushing as it was', () => {
    for (const phase of ['prone', 'push'] as const) {
      const state = () => posturePoints(phase, 'regular', at, new Quaternion(), createRiderVisualState());
      const hinged = centreOfMass(posed(state()).bones);
      without();
      const plain = centreOfMass(posed(state()).bones);
      Object.assign(RIG_DETAIL.hipAngle, saved);
      expect(hinged.distanceTo(plain), phase).toBeLessThan(1e-9);
    }
  });
});
