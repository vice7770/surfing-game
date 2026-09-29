import { readFileSync } from 'node:fs';
import { Quaternion, Vector3, type Bone } from 'three';
import { describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import { readGlbSkeleton } from './glbSkeleton';
import { BONES } from './humanoidBones';
import { HumanoidRig } from './HumanoidRig';
import { PosedBody } from './posedBody';
import { POINT, type RiderVisualState } from './riderVisualState';
import { StanceGauge, type StanceAngles } from './stanceGauge';

/**
 * The stance poses followed through a motion on surfer2, as the game draws them
 * (the final review of step 3: its tests read one instant per stance).
 */
const bytes = readFileSync('public/assets/surfers/surfer2.glb');
const skeleton = () => readGlbSkeleton(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const at = new Vector3(0, 0.03, 0);

interface Frame { state: RiderVisualState; angles: StanceAngles; bones: Map<string, Bone>; plain: Map<string, Bone> }

/** Draws `recipe` step by step through the smoothing layer, with the rig alone beside it, calling `each` every step. */
function follow(recipe: StanceRecipe, side: 'regular' | 'goofy', each: (frame: Frame) => void): void {
  const drawn = skeleton();
  const plain = skeleton();
  const gauge = new StanceGauge(drawn.bones);
  const body = new PosedBody(drawn.bones);
  const rig = new HumanoidRig(plain.bones);
  drawnRecipe(recipe, side, at, (state) => {
    body.update(state);
    rig.solve(state);
    drawn.root.updateMatrixWorld(true);
    plain.root.updateMatrixWorld(true);
    each({ state, angles: gauge.measure(state, side), bones: drawn.bones, plain: plain.bones });
  });
}
const world = (bones: Map<string, Bone>, name: string) => bones.get(name)!.getWorldPosition(new Vector3());

describe('the stance poses through a motion (step 3\'s final review)', () => {
  it('keeps the legs soft and the balls of the feet on the deck through a top turn and a snap', () => {
    const rest = skeleton();
    const ballHeight = world(rest.bones, BONES.toe.left).y;
    for (const id of ['top-turn-frontside', 'snap-frontside']) {
      for (const side of ['regular', 'goofy'] as const) {
        follow(STANCE_RECIPES[id], side, ({ state, angles, bones }) => {
          if (state.clock < 0.5) return;
          const where = `${id}, ${side}, ${state.clock.toFixed(2)} s`;
          expect(Math.max(angles.kneeFront, angles.kneeRear), where).toBeLessThan(166);
          const deckUp = new Vector3(0, 1, 0).applyQuaternion(state.boardQuaternion);
          for (const [bone, point] of [[BONES.toe.left, POINT.leftFoot], [BONES.toe.right, POINT.rightFoot]] as const) {
            expect(world(bones, bone).sub(state.points[point]).dot(deckUp), `${where}: ${bone}`).toBeLessThan(ballHeight + 0.012);
          }
        });
      }
    }
  }, 240_000);

  it('holds the trunk within 75° of the vertical in a long bottom turn (the head never below the hips)', () => {
    // Compress held 1.3 s (the map reads it at 0.4 s).
    const held: StanceRecipe = { ...STANCE_RECIPES['compress-frontside'], seconds: 2 };
    for (const side of ['regular', 'goofy'] as const) {
      follow(held, side, ({ state, angles }) => {
        if (state.clock < 0.7) return;
        expect(angles.trunkTilt, `${side}, ${state.clock.toFixed(2)} s`).toBeLessThanOrEqual(76);
      });
    }
  }, 240_000);

  it('keeps the drawn feet with the rig\'s through a pump (no leg eased off its foot)', () => {
    const pump: StanceRecipe = {
      ...STANCE_RECIPES['pump-compression'],
      controls: [{ at: 0.4, crouch: 1 }, { at: 0.8, crouch: 0 }, { at: 1.2, crouch: 1 }, { at: 1.6, crouch: 0 }, { at: 2.0, crouch: 1 }, { at: 2.4, crouch: 0 }],
      seconds: 2.8,
    };
    for (const side of ['regular', 'goofy'] as const) {
      follow(pump, side, ({ state, bones, plain }) => {
        if (state.clock < 0.4) return;
        for (const foot of [BONES.foot.left, BONES.foot.right]) {
          expect(world(bones, foot).distanceTo(world(plain, foot)), `${side}, ${state.clock.toFixed(2)} s: ${foot}`).toBeLessThan(0.02);
        }
      });
    }
  }, 240_000);

  it('reaches the leading arm out in the snap, and never spins a hand', () => {
    for (const side of ['regular', 'goofy'] as const) {
      let reach = 0;
      follow(STANCE_RECIPES['snap-frontside'], side, ({ state, bones }) => {
        if (state.clock < 0.85) return;
        const lead = side === 'regular' ? 'left' : 'right';
        const arm = world(bones, BONES.arm[lead]).distanceTo(world(bones, BONES.foreArm[lead])) + world(bones, BONES.foreArm[lead]).distanceTo(world(bones, BONES.hand[lead]));
        reach = world(bones, BONES.hand[lead]).distanceTo(world(bones, BONES.arm[lead])) / arm;
      });
      expect(reach, side).toBeGreaterThan(0.8);
    }
    // A weave with the weight back: the hand turns no faster than a wrist can.
    const weave: StanceRecipe = {
      ...STANCE_RECIPES.trim,
      controls: [{ at: 0.3, trim: -1, steer: 1 }, { at: 1.1, steer: -1 }, { at: 1.9, steer: 1 }],
      seconds: 2.6,
    };
    for (const side of ['regular', 'goofy'] as const) {
      const last = new Map<string, Quaternion>();
      let fastest = 0;
      follow(weave, side, ({ state, bones }) => {
        for (const hand of [BONES.hand.left, BONES.hand.right]) {
          const now = bones.get(hand)!.getWorldQuaternion(new Quaternion());
          const before = last.get(hand);
          if (before && state.clock > 0.4) fastest = Math.max(fastest, (2 * Math.acos(Math.min(1, Math.abs(now.dot(before))))) * 60);
          last.set(hand, now);
        }
      });
      expect(fastest, side).toBeLessThan(20);
    }
  }, 240_000);
});
