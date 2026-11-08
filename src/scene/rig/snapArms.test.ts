import { Vector3 } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import type { StanceName } from '../../physics/riderPosture';
import { RIG_SWITCHES } from './HumanoidRig';
import { PosedBody } from './posedBody';
import { StanceGauge } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

// Snap's arms (snap-carve, 2026-11-08; `RIG_DETAIL.snapArms`): drawn only, from the drawn state. The owner's reference
// (Surf Analytica, "JJF and one perfect full rail carve"): the shoulders lead, the leading arm points into the turn and the
// trailing arm swings up and back; low in the loaded turn the inside hand reaches for the water.
const DEG = 180 / Math.PI;
const SNAP_AT = 0.3;
const base = STANCE_RECIPES.trim;
/** Snap with a full steer on flat water at 8 m/s, from 0.3 s. */
const snap = (steer: number): StanceRecipe => ({ ...base, steady: false, controls: [{ at: SNAP_AT, snap: 1, steer }], seconds: 1.3 });
const compress: StanceRecipe = { ...base, steady: false, controls: [{ at: SNAP_AT, compress: 1, crouch: 0.6, steer: -1 }], seconds: 1.3 };

interface Read { yawRate: number; leadTurn: number; leadElbow: number; trailArm: number; trailBack: number; trailElbow: number; inside: number; insideOut: number; wrists: number[] }

/** The drawn body `after` s into the move: the arms about their shoulders, against the board's nose. */
function drawn(recipe: StanceRecipe, stance: StanceName, after: number, arms?: 'old'): Read {
  RIG_SWITCHES.snapArms = arms;
  const { bones } = createTestHumanoid();
  const body = new PosedBody(bones);
  const gauge = new StanceGauge(bones);
  let read: Read | undefined;
  drawnRecipe(recipe, stance, new Vector3(0, 0.03, 0), (state) => {
    body.update(state);
    if (state.phase !== 'standing' || Math.abs(state.clock - SNAP_AT - after) > 1e-6) return;
    const m = gauge.measure(state, stance);
    const j = gauge.joints();
    const front = stance === 'regular' ? 'left' : 'right';
    const rear = front === 'left' ? 'right' : 'left';
    const nose = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0).normalize();
    const lead = j.wrist[front].clone().sub(j.shoulder[front]).setY(0);
    const trail = j.wrist[rear].clone().sub(j.shoulder[rear]);
    // The inside hand (`RIG_DETAIL.snapArms`): on the low rail, frontside the trailing arm's, backside the leading arm's;
    // its height over the board's centre and how far it is out toward the low rail from the stringer.
    const across = new Vector3(1, 0, 0).applyQuaternion(state.boardQuaternion);
    const low = across.y < 0 ? 1 : -1;
    const inside = low === (stance === 'regular' ? -1 : 1) ? rear : front;
    const wrist = j.wrist[inside].clone().sub(state.boardPosition);
    // The lead hand's heading off the nose, + the way the board turns (the yaw rate's sign).
    const off = Math.atan2(new Vector3().crossVectors(nose, lead).y, nose.dot(lead)) * DEG;
    read = {
      yawRate: state.yawRate, leadTurn: Math.sign(state.yawRate) * off, leadElbow: m.leadElbow, trailArm: m.trailArm,
      trailBack: trail.dot(nose), trailElbow: m.trailElbow, inside: wrist.y, insideOut: low * wrist.dot(across.setY(0).normalize()),
      wrists: [j.wrist.left.x, j.wrist.left.y, j.wrist.left.z, j.wrist.right.x, j.wrist.right.y, j.wrist.right.z],
    };
  });
  RIG_SWITCHES.snapArms = undefined;
  return read!;
}

afterEach(() => { RIG_SWITCHES.snapArms = undefined; });

describe('Snap\'s arms follow the turn (snap-carve)', () => {
  it.each(['regular', 'goofy'] as const)('%s: the leading arm into the turn, the trailing arm up and back', (stance) => {
    for (const steer of [-1, 1]) {
      // 0.6 s in: the shoulders wound (45°), the weight on the tail, the board coming round at 50°/s.
      const now = drawn(snap(steer), stance, 0.6);
      const old = drawn(snap(steer), stance, 0.6, 'old');
      expect(Math.abs(now.yawRate), `${stance} ${steer}`).toBeGreaterThan(0.5);
      // The leading hand points into the turn, further than before (measured 17–33° off the nose against 0–15°).
      expect(now.leadTurn, `${stance} ${steer}`).toBeGreaterThan(15);
      expect(now.leadTurn, `${stance} ${steer}`).toBeGreaterThan(old.leadTurn + 10);
      // The trailing arm swung up (the plan's top turn: at chest height or below; measured 58–59° from the trunk's down
      // against 20–37°) and back, its hand behind its shoulder toward the tail.
      expect(now.trailArm, `${stance} ${steer}`).toBeGreaterThan(45);
      expect(now.trailArm, `${stance} ${steer}`).toBeLessThan(70);
      expect(now.trailArm, `${stance} ${steer}`).toBeGreaterThan(old.trailArm + 15);
      expect(now.trailBack, `${stance} ${steer}`).toBeLessThan(-0.15);
      // Soft elbows, within the joint's range.
      for (const elbow of [now.leadElbow, now.trailElbow]) {
        expect(elbow, `${stance} ${steer}`).toBeGreaterThan(90);
        expect(elbow, `${stance} ${steer}`).toBeLessThan(170);
      }
    }
  });

  it.each(['regular', 'goofy'] as const)('%s: low in the loaded turn, the inside hand reaches for the water', (stance) => {
    for (const steer of [-1, 1]) {
      // 0.9 s in: the legs loaded (depth 0.8), the board on its rail and not climbing (flat water).
      const now = drawn(snap(steer), stance, 0.9);
      const old = drawn(snap(steer), stance, 0.9, 'old');
      // The inside wrist 0.13–0.23 m lower than before (measured 0.16–0.36 m over the board's centre, against 0.29–0.59 with
      // the physics' hand held out from the shoulder), 0.19–0.40 m out from the stringer, by the low rail.
      expect(now.inside, `${stance} ${steer}`).toBeLessThan(old.inside - 0.1);
      expect(now.insideOut, `${stance} ${steer}`).toBeGreaterThan(0.1);
      expect(now.insideOut, `${stance} ${steer}`).toBeLessThan(0.6);
    }
  });

  it('draws every other stance as before: Compress\'s arms are the same with `snapArms: \'old\'`', () => {
    for (const after of [0.3, 0.6, 0.9]) expect(drawn(compress, 'regular', after).wrists).toEqual(drawn(compress, 'regular', after, 'old').wrists);
  });
});
