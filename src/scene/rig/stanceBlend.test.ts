import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { stanceState } from '../../dev/ridingPoses';
import { createRiderVisualState } from './riderVisualState';
import { stanceBlend } from './stanceBlend';

const at = new Vector3(0, 0.03, 0);
const blend = (id: string, side: 'regular' | 'goofy' = 'regular') => stanceBlend(stanceState(id, side, at, createRiderVisualState()).state);

describe('the stance blend', () => {
  it('reads how deep the crouch is: standing tall, the drop, Compress', () => {
    for (const side of ['regular', 'goofy'] as const) {
      const [trim, drop, compress] = ['trim', 'drop', 'compress-frontside'].map((id) => blend(id, side).depth);
      expect(trim).toBeLessThan(0.15);
      expect(drop).toBeGreaterThan(trim + 0.2);
      expect(compress).toBeGreaterThan(drop);
      expect(compress).toBeGreaterThan(0.7);
    }
  });

  it('reads the turn toward the toes\' rail as positive, toward the heels negative, either stance', () => {
    for (const side of ['regular', 'goofy'] as const) {
      expect(blend('compress-frontside', side).turn, side).toBeGreaterThan(0.3);
      expect(blend('compress-backside', side).turn, side).toBeLessThan(-0.3);
      expect(Math.abs(blend('trim', side).turn), side).toBeLessThan(0.1);
      expect(blend('trim', side).stance).toBe(side);
    }
  });

  it('reads the weight going back: none in trim, most in the snap', () => {
    expect(blend('trim').back).toBeLessThan(0.05);
    expect(blend('snap-frontside').back).toBeGreaterThan(0.5);
  });
});
