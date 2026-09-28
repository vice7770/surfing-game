import { Quaternion, Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { drawnStance, stanceState } from '../../dev/ridingPoses';
import { PosedBody } from './posedBody';
import { BONES } from './humanoidBones';
import { HumanoidRig, RIG_DETAIL } from './HumanoidRig';
import { posturePoints } from './posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from './riderVisualState';
import { StanceGauge, type StanceAngles } from './stanceGauge';
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
  it('holds trim\'s arms lower and softer, toward the map\'s middle (SurfDeeper: quiet, over their rails)', () => {
    const state = stanceState('trim', 'regular', at, createRiderVisualState()).state;
    const physics = angles(state, 0).read;
    const shaped = angles(state, 1).read;
    for (const key of ['leadArm', 'trailArm'] as const) {
      expect(Math.abs(shaped[key] - 40), key).toBeLessThan(Math.abs(physics[key] - 40));
      expect(shaped[key], key).toBeGreaterThanOrEqual(20);
      expect(shaped[key], key).toBeLessThanOrEqual(60);
    }
    for (const key of ['leadElbow', 'trailElbow'] as const) expect(shaped[key], key).toBeLessThan(170);
  });

  it('puts the upper arm at the stance\'s elevation, the soft elbow below the wrist\'s line', () => {
    const { read } = angles(stanceState('trim', 'regular', at, createRiderVisualState()).state, 1);
    for (const key of ['leadArm', 'trailArm'] as const) expect(Math.abs(read[key] - RIG_DETAIL.arms.elevationTall), key).toBeLessThan(6);
  });

  it('swings the trailing arm up in the snap (the Bali camp: swung around)', () => {
    const { bones } = createTestHumanoid();
    const gauge = new StanceGauge(bones);
    const body = new PosedBody(bones);
    const { state } = drawnStance('snap-frontside', 'regular', at, (step) => body.update(step));
    expect(gauge.measure(state, 'regular').trailArm).toBeGreaterThan(60);
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
