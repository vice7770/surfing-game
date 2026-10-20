import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STANCE_RECIPES, drawnRecipe } from '../../dev/ridingPoses';
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
