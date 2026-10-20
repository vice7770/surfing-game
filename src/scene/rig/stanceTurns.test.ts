import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe, type StanceRecipe } from '../../dev/ridingPoses';
import { BONES } from './humanoidBones';
import { PosedBody } from './posedBody';
import { StanceGauge, type StanceAngles } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

/**
 * A stance as the game draws it, on the test humanoid, read `later` s past the
 * map's moment: the motion filter draws the turn's cues (the yaw rate, the
 * weight, the gaze) 0.1–0.25 s behind the physics (the animation-realism plan's
 * §4 and its accepted risk; phase 2's anticipation cascade leads the head).
 */
function drawn(id: string, side: 'regular' | 'goofy', later = 0): StanceAngles {
  const { bones } = createTestHumanoid();
  const gauge = new StanceGauge(bones);
  const body = new PosedBody(bones);
  const recipe = STANCE_RECIPES[id];
  const { state } = drawnRecipe({ ...recipe, seconds: recipe.seconds + later }, side, new Vector3(0, 0.03, 0), (step) => body.update(step));
  return gauge.measure(state, side);
}

describe('the chest and the head in turns (the stance poses, step 3; all low confidence)', () => {
  it('turns the chest toward the tail in the backside snap, toward the nose frontside', () => {
    for (const side of ['regular', 'goofy'] as const) {
      // Hobgood: the shoulders opened into the backside snap; the Bali camp: the shoulders led through the rotation.
      expect(drawn('snap-backside', side, 0.1).chestTwist, side).toBeLessThanOrEqual(-20);
      const front = drawn('snap-frontside', side, 0.1).chestTwist;
      expect(front, side).toBeGreaterThanOrEqual(20);
      expect(front, side).toBeLessThanOrEqual(90);
    }
  });

  it('turns the head toward the lip in the frontside bottom turn, within 70° of the toes', () => {
    // de Sousa 2022: the head toward the lip in the fundamental phase.
    for (const side of ['regular', 'goofy'] as const) {
      const { headYaw } = drawn('compress-frontside', side, 0.3);
      expect(headYaw, side).toBeLessThanOrEqual(70);
      expect(headYaw, side).toBeGreaterThanOrEqual(10);
    }
  });
});

/** A film recipe's drawn bones on the test humanoid, frame by frame: the head's, the chest's and the hips' facing in the world, rad. */
function turnFilm(recipe: StanceRecipe, side: 'regular' | 'goofy') {
  const { bones } = createTestHumanoid();
  const body = new PosedBody(bones);
  const rest = {
    head: bones.get(BONES.head)!.getWorldQuaternion(new Quaternion()),
    chest: bones.get(BONES.spine[2])!.getWorldQuaternion(new Quaternion()),
    hips: bones.get(BONES.hips)!.getWorldQuaternion(new Quaternion()),
  };
  const yaw = (part: keyof typeof rest, name: string) => {
    const facing = new Vector3(0, 0, 1).applyQuaternion(bones.get(name)!.getWorldQuaternion(new Quaternion()).multiply(rest[part].clone().invert()));
    return Math.atan2(facing.x, facing.z);
  };
  const rows: { time: number; head: number; chest: number; hips: number }[] = [];
  drawnRecipe(recipe, side, new Vector3(0, 0.03, 0), (state) => {
    body.update(state);
    if (state.phase !== 'standing') return;
    rows.push({ time: state.clock, head: yaw('head', BONES.head), chest: yaw('chest', BONES.spine[2]), hips: yaw('hips', BONES.hips) });
  });
  return rows;
}

/** When a part's world turn rate peaks within the turn (from `from` s to `to`), s: its facing unwrapped, its rate over ±0.1 s. */
function peakAt(rows: ReturnType<typeof turnFilm>, part: 'head' | 'chest' | 'hips', from: number, to: number): number {
  const unwrapped = [rows[0][part]];
  for (let i = 1; i < rows.length; i += 1) unwrapped.push(unwrapped[i - 1] + Math.atan2(Math.sin(rows[i][part] - rows[i - 1][part]), Math.cos(rows[i][part] - rows[i - 1][part])));
  const way = Math.sign(unwrapped[unwrapped.length - 1] - unwrapped[0]) || 1;
  let best = -Infinity;
  let at = Number.NaN;
  for (let i = 6; i < rows.length - 6; i += 1) {
    if (rows[i].time < from || rows[i].time > to) continue;
    const rate = (way * (unwrapped[i + 6] - unwrapped[i - 6])) / (rows[i + 6].time - rows[i - 6].time);
    if (rate > best) {
      best = rate;
      at = rows[i].time;
    }
  }
  return at;
}

const CUTBACKS: Record<'frontside' | 'backside', StanceRecipe> = {
  frontside: { ...STANCE_RECIPES['cutback-frontside'], controls: [{ at: 0, crouch: 0.5 }, { at: 0.4, steer: -1, trim: -0.7 }, { at: 1.8, steer: 0, trim: 0, crouch: 0.3 }], seconds: 2.4 },
  backside: { ...STANCE_RECIPES['cutback-backside'], controls: [{ at: 0, crouch: 0.5 }, { at: 0.4, steer: 1, trim: -0.7 }, { at: 1.8, steer: 0, trim: 0, crouch: 0.3 }], seconds: 2.4 },
};

// The animation-realism plan's phase 2: the anticipation cascade (WSL flow: turns unwind head → shoulders → hips →
// board; the owner's reel, step 4: the head is the steering wheel). The plan's motion test: in the cutback the head's
// turn peaks 0.1–0.35 s before the chest's, and the chest's before the hips'.
describe('the turn led by the head (the animation-realism plan, phase 2)', () => {
  it.each(['frontside', 'backside'] as const)('turns the head first, then the chest, then the hips, in a %s cutback', (kind) => {
    for (const side of ['regular', 'goofy'] as const) {
      const rows = turnFilm(CUTBACKS[kind], side);
      const [head, chest, hips] = (['head', 'chest', 'hips'] as const).map((part) => peakAt(rows, part, 0.5, 2.0));
      // Read to the frame (1/60 s).
      expect(chest - head, `${side}: the head before the chest`).toBeGreaterThanOrEqual(0.1 - 1e-6);
      expect(chest - head, `${side}: the head before the chest`).toBeLessThanOrEqual(0.35);
      expect(hips - chest, `${side}: the chest before the hips`).toBeGreaterThan(0);
    }
  }, 120_000);

  it('points the leading arm at the turn\'s target in the frontside bottom turn: about level along the look, the arm long', () => {
    // The plan's bottom turn: the lead arm 60–110° from the trunk's down, the elbow 150–180° (de Sousa 2022; Gudauskas);
    // it drew 122°, raised rather than aimed, before phase 1, and hung at the knee after it.
    for (const side of ['regular', 'goofy'] as const) {
      const read = drawn('compress-frontside', side, 0.2);
      expect(read.leadArm, side).toBeGreaterThanOrEqual(60);
      expect(read.leadArm, side).toBeLessThanOrEqual(110);
      expect(read.leadElbow, side).toBeGreaterThanOrEqual(140);
    }
  });

  it.each(['top-turn-frontside', 'top-turn-backside', 'snap-frontside', 'cutback-frontside'])('keeps the arms at chest height or below, close in, in %s', (id) => {
    // The plan's top turn: the arms 30–70°; the owner's reel, step 7: at the top, drop the leading hand. They drew
    // 95–136° (the airplane) before phase 2.
    for (const side of ['regular', 'goofy'] as const) {
      const read = drawn(id, side);
      expect(read.leadArm, `${side} lead`).toBeLessThanOrEqual(75);
      expect(read.trailArm, `${side} trail`).toBeLessThanOrEqual(75);
    }
  });

  it('turns the chest back to the pocket in the top turn, frontside past the nose, backside toward the tail', () => {
    // The plan: frontside the chest 70–110° (Bali Surfing Camp), backside −60° to −20° (Hobgood); low confidence.
    for (const side of ['regular', 'goofy'] as const) {
      const front = drawn('top-turn-frontside', side);
      expect(front.chestTwist, side).toBeGreaterThanOrEqual(70);
      expect(front.chestTwist, side).toBeLessThanOrEqual(110);
      expect(front.headYaw, side).toBeGreaterThan(front.chestTwist);
      expect(drawn('top-turn-backside', side).chestTwist, side).toBeLessThanOrEqual(-20);
    }
  });
});

// The plan's tube (decision 12): frontside the grab-rail, backside the pig-dog; read in the deep tuck under a test curl.
describe('the tube (the animation-realism plan, phase 2; decision 12)', () => {
  it('drops the rear knee to the deck in both, and grabs the toes\' rail by the front foot backside', () => {
    for (const side of ['regular', 'goofy'] as const) {
      for (const id of ['tube-frontside', 'tube-backside']) {
        const read = drawn(id, side);
        // Flexed 120–150° (included 30–60°), the knee within 0.15 m of the deck (eos.surf).
        expect(read.kneeRear, `${id} ${side}`).toBeLessThanOrEqual(60);
        expect(read.rearKneeDeck, `${id} ${side}`).toBeLessThanOrEqual(0.15);
      }
      const pig = drawn('tube-backside', side);
      expect(pig.trailToeRail, side).toBeLessThanOrEqual(0.1);
      expect(pig.trailFromFront, side).toBeLessThanOrEqual(0.25);
    }
  });
});
