import { describe, expect, it } from 'vitest';
import { inTakeOffWindow } from './takeOffCue';
import type { WaveFrame } from './waveFrame';

/** Traced on the reference wave: the moment the wave had caught a paddler, high on the face and just ahead of the crest. */
const CAUGHT: WaveFrame = {
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 2.7, crestSpeed: 6.5, faceHeight: 1.8, faceFraction: 0.8,
  crestBreaking: 0, curlDistance: Infinity, curlSide: 0, speedOverGround: 5.2, speedShoreward: 5.2, speedAlongCrest: 0, requiredSpeed: Infinity,
};

describe('the take-off window (Kimura and Kakinuma 2015)', () => {
  it('opens when the board keeps pace with the crest high on the face, just ahead of it', () => {
    expect(inTakeOffWindow(CAUGHT)).toBe(true);
  });

  it('stays shut while the board is too slow, low on the face, far ahead, behind the crest, or on no wave', () => {
    expect(inTakeOffWindow({ ...CAUGHT, speedShoreward: 4 })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, faceFraction: 0.3 })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, aheadOfCrest: 6 })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, aheadOfCrest: -0.5 })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, valid: false })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, crestSpeed: 0 })).toBe(false);
  });

  // Traced: re-seeding on a new crest, the gauge's crest speed read near 0 for a moment, and the window opened on a
  // paddler at 1.8–2.5 m/s at the crest, who stood behind it. Caught means faster than paddling: small waves run ~3 m/s.
  it('never opens on a paddler, however slow the crest reads', () => {
    expect(inTakeOffWindow({ ...CAUGHT, crestSpeed: 0.5, speedShoreward: 1.8, speedOverGround: 1.8 })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, crestSpeed: 2, speedShoreward: 2.5, speedOverGround: 2.5 })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, crestSpeed: 3, speedShoreward: 3, speedOverGround: 3 })).toBe(true);
    // Traced: four of fourteen pop-ups began while the crest read 0–2.5 m/s, at 3.4–3.8 m/s, and all fell in the pop-up.
    expect(inTakeOffWindow({ ...CAUGHT, crestSpeed: 2.47, speedShoreward: 3.82, speedOverGround: 3.82 })).toBe(false);
  });

  // Traced: pop-ups begun within 2 m of the crest, in the lip, mostly failed or were kicked out; from 2–4 m they stood.
  it('opens clear of the lip', () => {
    expect(inTakeOffWindow({ ...CAUGHT, aheadOfCrest: 1.5, faceFraction: 0.95 })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, aheadOfCrest: 2.3 })).toBe(true);
  });

  // The movement-flow spec: the window scales with the face. On the Wave Pool's 1.15 m faces a caught board rides
  // 0.7–1.5 m ahead of a 4 m/s crest; the 1.8 m reference faces keep their 2–4 m.
  it('scales with the face: closer to the crest on a small wave', () => {
    const pool = { ...CAUGHT, faceHeight: 1.15, crestSpeed: 4, speedShoreward: 3.4, speedOverGround: 3.4 };
    expect(inTakeOffWindow({ ...pool, aheadOfCrest: 1.4 })).toBe(true);
    expect(inTakeOffWindow({ ...pool, aheadOfCrest: 1.1 })).toBe(false);
    expect(inTakeOffWindow({ ...pool, aheadOfCrest: 2.9 })).toBe(false);
    expect(inTakeOffWindow({ ...CAUGHT, aheadOfCrest: 3.9 })).toBe(true);
    // A big face keeps the traced 2–4 m, which the bigger spots' catches were tuned with.
    expect(inTakeOffWindow({ ...CAUGHT, faceHeight: 4, aheadOfCrest: 3 })).toBe(true);
    expect(inTakeOffWindow({ ...CAUGHT, faceHeight: 4, aheadOfCrest: 5 })).toBe(false);
  });
});
