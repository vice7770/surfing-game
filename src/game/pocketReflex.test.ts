import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../physics/waveFrame';
import { POCKET_DISTANCE, POCKET_TRIM, pocketTrim, schoolPocketReflex, showsPocketReflex, withPocketReflex } from './pocketReflex';

const FRAME: WaveFrame = {
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 3, crestSpeed: 5, faceHeight: 1.2, faceFraction: 0.5,
  crestBreaking: 0, curlDistance: POCKET_DISTANCE, curlSide: 0, speedOverGround: 6, speedShoreward: 1, speedAlongCrest: 6, requiredSpeed: 6,
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

  // Traced on the reference wave (riding-the-wave Task 7): held back on a board already slowing below planing, the
  // tail sank (the nose 30–60° up) and the rider fell. The reflex sits back only while the board planes.
  it('sits back only while the board planes', () => {
    expect(pocketTrim({ ...at(20), speedOverGround: 6 })).toBe(-POCKET_TRIM);
    expect(pocketTrim({ ...at(20), speedOverGround: 4 })).toBeCloseTo(-POCKET_TRIM / 2, 9);
    expect(pocketTrim({ ...at(20), speedOverGround: 2.5 })).toBe(0);
    expect(pocketTrim({ ...at(0), speedOverGround: 2.5 })).toBeGreaterThan(0);
  });

  // Re-catching (traced on the reference wave): run out onto the flat ahead of the crest, the reflex sat back to wait
  // for the curl, the board slowed below planing and sank before the wave came. Sitting back waits on the face only.
  it('sits back only on the face, never out on the flat ahead of it', () => {
    expect(pocketTrim({ ...at(20), faceFraction: 0.05, aheadOfCrest: 9 })).toBe(0);
    expect(pocketTrim({ ...at(20), faceFraction: 0.4, aheadOfCrest: 4 })).toBe(-POCKET_TRIM);
    expect(pocketTrim({ ...at(0), faceFraction: 0.05, aheadOfCrest: 9 })).toBeGreaterThan(0);
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

  // Traced on the reference wave: sat back through a crouched full-steer bottom turn at 10 m/s, the board wobbled in
  // yaw and threw the rider (on flat water too). The reflex holds a line; in a hard turn the weight is the turn's.
  it('leaves the weight alone in a hard turn', () => {
    const far = at(20);
    expect(withPocketReflex({ ...ride, steer: 1 }, far, 'standing').trim).toBe(0);
    expect(withPocketReflex({ ...ride, steer: -0.6 }, far, 'standing').trim).toBe(0);
    expect(withPocketReflex({ ...ride, steer: 0.4 }, far, 'standing').trim).toBe(-POCKET_TRIM);
  });

  it('is on in Practice by default, always, or never', () => {
    expect(showsPocketReflex('practice', 'practice')).toBe(true);
    expect(showsPocketReflex('practice', 'medium')).toBe(false);
    expect(showsPocketReflex('always', 'big')).toBe(true);
    expect(showsPocketReflex('never', 'practice')).toBe(false);
  });

  // Surf School (spec L2): a lesson teaches the weight the reflex would take; Free Practice rides the Practice swell.
  it('is off in every lesson, and in Free Practice follows its setting on the Practice swell', () => {
    for (const setting of ['practice', 'always', 'never'] as const) expect(schoolPocketReflex(setting, false)).toBe(false);
    expect(schoolPocketReflex('practice', true)).toBe(true);
    expect(schoolPocketReflex('always', true)).toBe(true);
    expect(schoolPocketReflex('never', true)).toBe(false);
  });
});
