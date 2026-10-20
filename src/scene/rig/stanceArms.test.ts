import { readFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { CROUCHED_TRIM, STANCE_RECIPES, drawnRecipe, drawnStance, stanceState } from '../../dev/ridingPoses';
import { readGlbSkeleton } from './glbSkeleton';
import { PosedBody } from './posedBody';
import { BONES } from './humanoidBones';
import { HumanoidRig, RIG_DETAIL } from './HumanoidRig';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from './riderVisualState';
import { StanceGauge, measureHands, type StanceAngles } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

const at = new Vector3(0, 0.03, 0);
const saved = RIG_DETAIL.arms.share;
afterEach(() => { RIG_DETAIL.arms.share = saved; });

/** The stance's angles on the test humanoid, the free arms shaped (`share` 1) or as the physics holds them (0). */
function angles(state: RiderVisualState, share: number): { read: StanceAngles; bones: Map<string, import('three').Bone> } {
  RIG_DETAIL.arms.share = share;
  const { root, bones } = createTestHumanoid();
  const gauge = new StanceGauge(bones);
  new HumanoidRig(bones).solve(state);
  root.updateMatrixWorld(true);
  return { read: gauge.measure(state, 'regular'), bones };
}

describe('the free arms (the stance poses, step 3)', () => {
  // The owner's reference (2026-10-22): the arms hang relaxed and close in, framing the knees; never spread.
  it.each(['trim-frontside', 'trim-backside'])('hangs %s\'s free arms relaxed and low, in front, within the plan\'s elevations', (id) => {
    for (const side of ['regular', 'goofy'] as const) {
      const { bones } = createTestHumanoid();
      const gauge = new StanceGauge(bones);
      const body = new PosedBody(bones);
      const { state } = drawnStance(id, side, at, (step) => body.update(step));
      const read = gauge.measure(state, side);
      const hands = measureHands(gauge.joints(), state, side);
      // The plan's trim (WSL flow; Rapture): the front arm 20–50° from the trunk's down, the back arm 10–35°.
      expect(read.leadArm, `${side} lead`).toBeGreaterThanOrEqual(20);
      expect(read.leadArm, `${side} lead`).toBeLessThanOrEqual(50);
      expect(read.trailArm, `${side} trail`).toBeGreaterThanOrEqual(10);
      expect(read.trailArm, `${side} trail`).toBeLessThanOrEqual(35);
      // Soft elbows, never locked; the hands in front of the knees and close in.
      for (const elbow of [read.leadElbow, read.trailElbow]) expect(elbow, side).toBeLessThan(162);
      expect(hands.inFront, side).toBeGreaterThan(-0.02);
      expect(hands.out, side).toBeLessThan(1.25 * hands.shoulders);
    }
  });

  it('swings the trailing arm up in the snap (the Bali camp: swung around)', () => {
    // From the relaxed arm at the side (trim's 10–35°), well up: phase 2 sets the snap's own arms (`snapSwing` 60°).
    const trail = (id: string) => {
      const { bones } = createTestHumanoid();
      const gauge = new StanceGauge(bones);
      const body = new PosedBody(bones);
      const { state } = drawnStance(id, 'regular', at, (step) => body.update(step));
      return gauge.measure(state, 'regular').trailArm;
    };
    expect(trail('snap-frontside')).toBeGreaterThan(trail('trim') + 30);
  });

  it('bends the drop\'s leading elbow into Kerr\'s 140–170°', () => {
    const state = stanceState('drop', 'regular', at, createRiderVisualState()).state;
    const { leadElbow } = angles(state, 1).read;
    expect(leadElbow).toBeGreaterThanOrEqual(140);
    expect(leadElbow).toBeLessThanOrEqual(170);
  });

  it('leaves a hand the physics puts in the water on its point', () => {
    const state = stanceState('compress-frontside', 'regular', at, createRiderVisualState()).state;
    const { bones } = angles(state, 1);
    const lower = state.points[POINT.leftHand].y < state.points[POINT.rightHand].y ? 'left' : 'right';
    const wrist = bones.get(BONES.hand[lower])!.getWorldPosition(new Vector3());
    expect(wrist.distanceTo(state.points[lower === 'left' ? POINT.leftHand : POINT.rightHand])).toBeLessThan(0.01);
  });

  it('leaves the arms lying and pushing as the physics holds them', () => {
    for (const phase of ['prone', 'push'] as const) {
      const state = () => posturePoints(phase, 'regular', at, new Quaternion(), createRiderVisualState());
      const shaped = angles(state(), 1).bones;
      const physics = angles(state(), 0).bones;
      for (const side of ['left', 'right'] as const) {
        const wrist = (all: Map<string, import('three').Bone>) => all.get(BONES.hand[side])!.getWorldPosition(new Vector3());
        expect(wrist(shaped).distanceTo(wrist(physics)), `${phase} ${side}`).toBeLessThan(1e-9);
      }
    }
  });
});

describe('the free arms losing balance (step 5)', () => {
  it('raises and straightens a free arm as the physics spreads its hands, and leaves it at ease', () => {
    const at = stanceState('trim', 'regular', new Vector3(0, 0.03, 0), createRiderVisualState()).state;
    const ease = angles(at, 1).read;
    // The physics' hands with no margin left: ARM_SPREAD + ARM_ALARM, from the ease's ARM_SPREAD.
    const alarmed = stanceState('trim', 'regular', new Vector3(0, 0.03, 0), createRiderVisualState()).state;
    for (const hand of [POINT.leftHand, POINT.rightHand]) {
      const torso = alarmed.points[POINT.torso];
      alarmed.points[hand].sub(torso).multiplyScalar(2.5 / 1.7).add(torso);
    }
    const out = angles(alarmed, 1).read;
    for (const [arm, elbow] of [['leadArm', 'leadElbow'], ['trailArm', 'trailElbow']] as const) {
      expect(out[arm], arm).toBeGreaterThan(ease[arm] + 25);
      expect(out[arm], arm).toBeLessThan(100);
      expect(out[elbow], elbow).toBeGreaterThan(ease[elbow] + 10);
    }
  });
});


describe('the arms framing the knees (the owner\'s reference photo, 2026-10-22)', () => {
  // Crouched trim and the drop: each hand within about 0.15 m of its knee's height, the front hand ahead of the front
  // knee along the line, the back hand beside the back knee, neither out past the shoulders' width (the shoulder
  // joints' spread and the shoulder's own breadth outside them, 1.25 of it). Every surfer, Regular and Goofy.
  it.each([['crouched trim', CROUCHED_TRIM], ['the drop', STANCE_RECIPES.drop]] as const)('frames the knees in %s, on all four surfers', (_name, recipe) => {
    for (const surfer of ['surfer1', 'surfer2', 'surfer3', 'surfer4']) {
      const bytes = readFileSync(`public/assets/surfers/${surfer}.glb`);
      for (const side of ['regular', 'goofy'] as const) {
        const { bones } = readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
        const gauge = new StanceGauge(bones);
        const body = new PosedBody(bones);
        const { state, reached } = drawnRecipe(recipe, side, at, (step) => body.update(step));
        expect(reached, `${surfer} ${side}`).toBe(true);
        const hands = measureHands(gauge.joints(), state, side);
        const where = `${surfer} ${side}`;
        expect(Math.abs(hands.frontAboveKnee), `${where}: front hand to its knee's height`).toBeLessThanOrEqual(0.15);
        expect(Math.abs(hands.rearAboveKnee), `${where}: back hand to its knee's height`).toBeLessThanOrEqual(0.15);
        expect(hands.frontAhead, `${where}: front hand ahead of the front knee`).toBeGreaterThan(0);
        expect(Math.abs(hands.rearAlong), `${where}: back hand beside the back knee`).toBeLessThan(0.12);
        expect(hands.inFront, `${where}: in front of the knees`).toBeGreaterThan(-0.02);
        expect(hands.out, `${where}: within the shoulders' width`).toBeLessThan(1.25 * hands.shoulders);
      }
    }
  }, 120_000);
});
