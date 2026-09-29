import { Quaternion, Vector3, type Bone } from 'three';
import { describe, expect, it } from 'vitest';
import { BodyInertia, INERTIA_TURN } from './bodyInertia';
import { BONES } from './humanoidBones';
import { HumanoidRig } from './HumanoidRig';
import { posturePoints } from './posturePoints';
import { createRiderVisualState, type RiderVisualState } from './riderVisualState';
import { createTestHumanoid } from './testHumanoid';

const STEP = 1 / 60;

/** A rig and its inertia on the test humanoid, and the bones it drives. */
function body() {
  const { bones } = createTestHumanoid();
  const rig = new HumanoidRig(bones);
  const inertia = new BodyInertia(bones);
  const hips = bones.get(BONES.hips)!;
  const driven = [...bones.values()].filter((bone) => !bone.name.includes('Hand') || bone.name.endsWith('Hand'));
  const draw = (state: RiderVisualState) => {
    rig.solve(state);
    inertia.apply(state);
    hips.updateMatrixWorld(true);
  };
  const rotations = () => driven.map((bone) => bone.getWorldQuaternion(new Quaternion()));
  return { bones, hips, draw, rotations };
}

const posture = (phase: 'standing' | 'prone', at = new Vector3(), clock = 0, heading = 0) => {
  const state = posturePoints(phase, 'regular', at, new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading), createRiderVisualState());
  state.clock = clock;
  return state;
};

const fastest = (before: Quaternion[], after: Quaternion[], dt: number) =>
  Math.max(...after.map((q, i) => 2 * Math.acos(Math.min(1, Math.abs(q.dot(before[i]))))), 0) / dt;

describe('the body inertia', () => {
  it('carries a switch as an offset that decays, no bone turning faster than a limb', () => {
    const { draw, rotations } = body();
    let clock = 0;
    for (let i = 0; i < 10; i += 1) draw(posture('standing', new Vector3(), (clock += STEP)));
    let before = rotations();
    let most = 0;
    // Standing to lying in one frame: the whole body turns over (about 3 rad), most of it within 0.5 s at no more
    // than a limb's turn, the critically damped tail within 1° by 1.5 s.
    for (let i = 0; i < 90; i += 1) {
      draw(posture('prone', new Vector3(), (clock += STEP)));
      const now = rotations();
      most = Math.max(most, fastest(before, now, STEP));
      before = now;
    }
    expect(most).toBeLessThan(1.5 * INERTIA_TURN);
    // Settled on the new pose.
    const { draw: plain, rotations: goal } = body();
    plain(posture('prone', new Vector3(), 2));
    const settled = goal();
    rotations().forEach((q, i) => expect(2 * Math.acos(Math.min(1, Math.abs(q.dot(settled[i]))))).toBeLessThan(0.02));
  });

  it('leaves a smooth motion as the rig draws it', () => {
    const { draw, rotations, hips } = body();
    const { bones: plainBones } = createTestHumanoid();
    const rig = new HumanoidRig(plainBones);
    const plainHips = plainBones.get(BONES.hips)!;
    const goal = () => [...plainBones.values()].filter((bone) => !bone.name.includes('Hand') || bone.name.endsWith('Hand')).map((bone) => bone.getWorldQuaternion(new Quaternion()));
    for (let i = 0; i < 90; i += 1) {
      // The board turns steadily at 1 rad/s and glides along at 6 m/s.
      const state = () => posture('standing', new Vector3(0, 0, i * 0.1), i * STEP, i * STEP);
      draw(state());
      rig.solve(state());
      plainHips.updateMatrixWorld(true);
      const [drawn, expected] = [rotations(), goal()];
      drawn.forEach((q, j) => expect(2 * Math.acos(Math.min(1, Math.abs(q.dot(expected[j]))))).toBeLessThan(1e-4));
      expect(hips.getWorldPosition(new Vector3()).distanceTo(plainHips.getWorldPosition(new Vector3()))).toBeLessThan(1e-6);
    }
  });

  it('draws a teleport at once', () => {
    const { draw, hips } = body();
    for (let i = 0; i < 10; i += 1) draw(posture('standing', new Vector3(), i * STEP));
    draw(posture('standing', new Vector3(20, 0, 0), 10 * STEP));
    expect(hips.getWorldPosition(new Vector3()).x).toBeGreaterThan(19);
  });

  it('keeps the body on a board that jumps a little: a retry nearby, an online surfer corrected', () => {
    for (const { phase, speed, jump } of [{ phase: 'prone', speed: 1.5, jump: -1.5 }, { phase: 'standing', speed: 8, jump: 0.3 }] as const) {
      const { draw, rotations, hips } = body();
      const { bones: plainBones } = createTestHumanoid();
      const rig = new HumanoidRig(plainBones);
      const plainHips = plainBones.get(BONES.hips)!;
      const goal = () => [...plainBones.values()].filter((bone) => !bone.name.includes('Hand') || bone.name.endsWith('Hand')).map((bone) => bone.getWorldQuaternion(new Quaternion()));
      let z = 0;
      let clock = 0;
      // The plain rig rides the same run: the rig keeps state over its clock (step 3's hinge, step 4's breath).
      for (let i = 0; i < 60; i += 1) {
        const state = () => posture(phase, new Vector3(0, 0, z + speed * STEP), clock + STEP);
        draw(state());
        rig.solve(state());
        z += speed * STEP;
        clock += STEP;
      }
      z += jump;
      for (let i = 0; i < 30; i += 1) {
        const state = () => posture(phase, new Vector3(0, 0, z), clock);
        z += speed * STEP;
        clock += STEP;
        draw(state());
        rig.solve(state());
        plainHips.updateMatrixWorld(true);
        const [drawn, expected] = [rotations(), goal()];
        drawn.forEach((q, j) => expect(2 * Math.acos(Math.min(1, Math.abs(q.dot(expected[j]))))).toBeLessThan(1e-3));
        expect(hips.getWorldPosition(new Vector3()).distanceTo(plainHips.getWorldPosition(new Vector3())), `${phase}, frame ${i}`).toBeLessThan(0.01);
      }
    }
  });

  it('starts over where a switch would carry the body across the sea (a retry from the water)', () => {
    const { draw, hips } = body();
    const { bones: plainBones } = createTestHumanoid();
    const rig = new HumanoidRig(plainBones);
    const plainHips = plainBones.get(BONES.hips)!;
    let clock = 0;
    for (let i = 0; i < 10; i += 1) {
      const swimming = posture('standing', new Vector3(), (clock += STEP));
      swimming.phase = 'fallen';
      draw(swimming);
    }
    // R: back on the board 2 m away, lying down.
    const back = () => posture('prone', new Vector3(2, 0, 0), clock + STEP);
    draw(back());
    rig.solve(back());
    plainHips.updateMatrixWorld(true);
    expect(hips.getWorldPosition(new Vector3()).distanceTo(plainHips.getWorldPosition(new Vector3()))).toBeLessThan(0.01);
  });

  it('holds while the clock stands still', () => {
    const { draw, rotations } = body();
    let clock = 0;
    for (let i = 0; i < 10; i += 1) draw(posture('standing', new Vector3(), (clock += STEP)));
    draw(posture('prone', new Vector3(), (clock += STEP)));
    const held = rotations();
    for (let i = 0; i < 5; i += 1) draw(posture('prone', new Vector3(), clock));
    rotations().forEach((q, i) => expect(2 * Math.acos(Math.min(1, Math.abs(q.dot(held[i]))))).toBeLessThan(1e-6));
  });

  it('leaves the fingers as the rig curls them, never blended', () => {
    const { bones, draw } = body();
    const plain = createTestHumanoid();
    const rig = new HumanoidRig(plain.bones);
    const fingers = (all: Map<string, Bone>) => [...all.values()].filter((bone) => bone.name.includes('Hand') && !bone.name.endsWith('Hand'));
    for (const state of [posture('standing', new Vector3(), STEP), posture('prone', new Vector3(), 2 * STEP)]) {
      state.stroking = state.phase === 'prone' ? 1 : 0;
      draw(state);
      rig.solve(state);
    }
    const expected = fingers(plain.bones);
    expect(expected.length).toBeGreaterThan(0);
    fingers(bones).forEach((bone, i) => expect(bone.quaternion.angleTo(expected[i].quaternion)).toBeLessThan(1e-9));
  });
});
