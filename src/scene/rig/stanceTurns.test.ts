import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { drawnStance } from '../../dev/ridingPoses';
import { PosedBody } from './posedBody';
import { StanceGauge, type StanceAngles } from './stanceGauge';
import { createTestHumanoid } from './testHumanoid';

/** A stance as the game draws it, on the test humanoid. */
function drawn(id: string, side: 'regular' | 'goofy'): StanceAngles {
  const { bones } = createTestHumanoid();
  const gauge = new StanceGauge(bones);
  const body = new PosedBody(bones);
  const { state } = drawnStance(id, side, new Vector3(0, 0.03, 0), (step) => body.update(step));
  return gauge.measure(state, side);
}

describe('the chest and the head in turns (the stance poses, step 3; all low confidence)', () => {
  it('turns the chest toward the tail in the backside snap, toward the nose frontside', () => {
    for (const side of ['regular', 'goofy'] as const) {
      // Hobgood: the shoulders opened into the backside snap; the Bali camp: the shoulders led through the rotation.
      expect(drawn('snap-backside', side).chestTwist, side).toBeLessThanOrEqual(-20);
      const front = drawn('snap-frontside', side).chestTwist;
      expect(front, side).toBeGreaterThanOrEqual(20);
      expect(front, side).toBeLessThanOrEqual(90);
    }
  });

  it('turns the head toward the lip in the frontside bottom turn, within 70° of the toes', () => {
    // de Sousa 2022: the head toward the lip in the fundamental phase.
    for (const side of ['regular', 'goofy'] as const) {
      const { headYaw } = drawn('compress-frontside', side);
      expect(headYaw, side).toBeLessThanOrEqual(70);
      expect(headYaw, side).toBeGreaterThanOrEqual(10);
    }
  });
});
