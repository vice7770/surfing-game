import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import { POCKET_DISTANCE, POCKET_TRIM, pocketTrim, showsPocketReflex, withPocketReflex } from './pocketReflex';

const FRAME: WaveFrame = {
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 3, crestSpeed: 5, faceHeight: 1.2, faceFraction: 0.5,
  crestBreaking: 0, curlDistance: POCKET_DISTANCE, speedOverGround: 6, speedShoreward: 1, speedAlongCrest: 6, requiredSpeed: 6,
};
const at = (curlDistance: number, valid = true) => ({ ...FRAME, curlDistance, valid });
const ride = { paddle: false, popUp: false, steer: 0.4, trim: 0, crouch: 0.3 };

// The riding-the-wave spec, decision 5: with no weight held, the rider trims to stay a few metres ahead of the curl.
describe('pocket reflex', () => {
  it('sits back when far from the curl, forward when on it, and still at its distance', () => {
    expect(pocketTrim(at(POCKET_DISTANCE))).toBeCloseTo(0, 9);
    expect(pocketTrim(at(20))).toBe(-POCKET_TRIM);
    expect(pocketTrim(at(0))).toBeGreaterThan(0);
    expect(pocketTrim(at(POCKET_DISTANCE + 2))).toBeLessThan(0);
  });

  it('does nothing with no curl or no wave', () => {
    expect(pocketTrim(at(Infinity))).toBe(0);
    expect(pocketTrim(at(3, false))).toBe(0);
  });

  it('sets only the weight, only standing, and never over a held W/S', () => {
    const far = at(20);
    expect(withPocketReflex(ride, far, 'standing')).toEqual({ ...ride, trim: -POCKET_TRIM });
    expect(withPocketReflex({ ...ride, trim: 0.5 }, far, 'standing').trim).toBe(0.5);
    for (const phase of ['prone', 'push', 'landing', 'recover', 'fallen'] as const) expect(withPocketReflex(ride, far, phase)).toBe(ride);
    expect(withPocketReflex(ride, undefined, 'standing')).toBe(ride);
  });

  it('is on in Practice by default, always, or never', () => {
    expect(showsPocketReflex('practice', 'practice')).toBe(true);
    expect(showsPocketReflex('practice', 'medium')).toBe(false);
    expect(showsPocketReflex('always', 'big')).toBe(true);
    expect(showsPocketReflex('never', 'practice')).toBe(false);
  });
});
