import { readFileSync } from 'node:fs';
import { Quaternion, Vector3, type Bone } from 'three';
import { afterEach, describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import { readGlbSkeleton } from './glbSkeleton';
import { BONES } from './humanoidBones';
import { HumanoidRig, RIG_DETAIL } from './HumanoidRig';
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

  // The movement-flow spec's compressed turn pulls the body into its lean (COMPRESS_PULL). Held 1.3 s on flat water,
  // the trunk reached 99° from the vertical while the pull leant the body in past what the feet could catch; with the
  // pull eased short of the rail's bite (PULL_LOOKAHEAD), 75°.
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

/** Pearson's correlation of two series of the same length. */
function correlation(a: readonly number[], b: readonly number[]): number {
  const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const [am, bm] = [mean(a), mean(b)];
  let covariance = 0;
  let av = 0;
  let bv = 0;
  a.forEach((value, i) => {
    covariance += (value - am) * (b[i] - bm);
    av += (value - am) ** 2;
    bv += (b[i] - bm) ** 2;
  });
  return covariance / Math.sqrt(av * bv);
}

describe('the arms swing with the body (step 4; Pontzer et al. 2009)', () => {
  const saved = RIG_DETAIL.swing.share;
  afterEach(() => { RIG_DETAIL.swing.share = saved; });
  const pump: StanceRecipe = {
    ...STANCE_RECIPES['pump-compression'],
    controls: [{ at: 0.4, crouch: 1 }, { at: 0.8, crouch: 0 }, { at: 1.2, crouch: 1 }, { at: 1.6, crouch: 0 }, { at: 2.0, crouch: 1 }, { at: 2.4, crouch: 0 }],
    seconds: 2.8,
  };
  /** Each free hand's height about its shoulder and the shoulder's rising speed, and the hands' places, through `recipe`. */
  const hands = (recipe: StanceRecipe, side: 'regular' | 'goofy', from: number) => {
    const offsets: number[] = [];
    const rises: number[] = [];
    const places: Vector3[] = [];
    const last = new Map<string, { at: Vector3; clock: number }>();
    follow(recipe, side, ({ state, bones }) => {
      for (const hand of ['left', 'right'] as const) {
        const shoulder = world(bones, BONES.arm[hand]);
        const before = last.get(hand);
        if (before && state.clock >= from && state.clock > before.clock) {
          offsets.push(world(bones, BONES.hand[hand]).y - shoulder.y);
          rises.push((shoulder.y - before.at.y) / (state.clock - before.clock));
          places.push(world(bones, BONES.hand[hand]));
        }
        last.set(hand, { at: shoulder, clock: state.clock });
      }
    });
    return { offsets, rises, places };
  };

  it('trails the free hands below their shoulders as the body rises in a pump, and above as it drops', () => {
    for (const side of ['regular', 'goofy'] as const) {
      const { offsets, rises } = hands(pump, side, 0.6);
      expect(correlation(offsets, rises), side).toBeLessThan(-0.5);
    }
  }, 240_000);

  it('swings them a few centimetres, and lets them settle riding straight', () => {
    for (const side of ['regular', 'goofy'] as const) {
      const swung = hands(pump, side, 0.6).places;
      RIG_DETAIL.swing.share = 0;
      const held = hands(pump, side, 0.6).places;
      RIG_DETAIL.swing.share = saved;
      const rms = Math.sqrt(swung.reduce((sum, place, i) => sum + place.distanceToSquared(held[i]), 0) / swung.length);
      expect(rms, side).toBeGreaterThan(0.02);
      expect(rms, side).toBeLessThan(0.15);
    }
    const straight: StanceRecipe = { ...STANCE_RECIPES.trim, seconds: 2 };
    const settled = hands(straight, 'regular', 1.9).places;
    RIG_DETAIL.swing.share = 0;
    const still = hands(straight, 'regular', 1.9).places;
    settled.forEach((place, i) => expect(place.distanceTo(still[i])).toBeLessThan(0.01));
  }, 240_000);

  // While Compress's pull leant the body in past what the feet could catch (the movement-flow spec), the compressed
  // bottom turn's lower hand never dropped a reach's fade below the hips, so no frame held it to its point; with the
  // pull eased short of the rail's bite (PULL_LOOKAHEAD) and within a real bottom turn's pull (TURN_PULL_LIMIT), 27
  // frames do on either side.
  it('never moves a hand in the water or the face off where the rig holds it', () => {
    for (const id of ['compress-frontside', 'hand-in-face']) {
      for (const side of ['regular', 'goofy'] as const) {
        /**
         * The lower hand's place as the rig solves it (the smoothing layer blends a handover's speed as it always has),
         * in each frame where the rig holds it to its point: past the reach's fade below the hips (step 3).
         */
        const anchored = () => {
          const places: Vector3[] = [];
          follow({ ...STANCE_RECIPES[id], seconds: STANCE_RECIPES[id].seconds + 0.5 }, side, ({ state, plain }) => {
            const lower = state.points[POINT.leftHand].y < state.points[POINT.rightHand].y ? 'left' : 'right';
            const point = state.points[lower === 'left' ? POINT.leftHand : POINT.rightHand];
            if (world(plain, BONES.hips).y - point.y >= RIG_DETAIL.reachFade) places.push(world(plain, BONES.hand[lower]));
          });
          return places;
        };
        const swung = anchored();
        RIG_DETAIL.swing.share = 0;
        const held = anchored();
        RIG_DETAIL.swing.share = saved;
        expect(swung.length, `${id} ${side}: frames with the hand on its point`).toBeGreaterThan(10);
        expect(swung.length, `${id} ${side}`).toBe(held.length);
        swung.forEach((place, i) => expect(place.distanceTo(held[i]), `${id} ${side}`).toBeLessThan(0.01));
      }
    }
  }, 240_000);
});

describe('breathing leaves the stance as step 3 drew it (step 4)', () => {
  const savedBreath = RIG_DETAIL.breath.share;
  afterEach(() => { RIG_DETAIL.breath.share = savedBreath; });

  it('reads trim and Compress the same on average over a whole breath', () => {
    for (const id of ['trim', 'compress-frontside']) {
      /** The gauge's readings at each 1/60 s over one breath at rest (16 a minute), the state held still. */
      const readings = () => {
        const drawn = skeleton();
        const gauge = new StanceGauge(drawn.bones);
        const rig = new HumanoidRig(drawn.bones);
        const { state } = drawnRecipe(STANCE_RECIPES[id], 'regular', at, () => {});
        const sums = new Map<string, number>();
        const count = Math.round((60 / 16) * 60);
        for (let i = 0; i < count; i += 1) {
          state.clock = 10 + i / 60;
          rig.solve(state);
          drawn.root.updateMatrixWorld(true);
          const angles = gauge.measure(state, 'regular') as unknown as Record<string, number>;
          for (const [key, value] of Object.entries(angles)) if (Number.isFinite(value)) sums.set(key, (sums.get(key) ?? 0) + value / count);
        }
        return sums;
      };
      const breathing = readings();
      RIG_DETAIL.breath.share = 0;
      const still = readings();
      RIG_DETAIL.breath.share = savedBreath;
      for (const [key, value] of breathing) expect(Math.abs(value - still.get(key)!), `${id} ${key}`).toBeLessThan(0.5);
    }
  }, 240_000);
});

