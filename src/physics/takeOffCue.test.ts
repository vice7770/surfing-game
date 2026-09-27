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
    expect(inTakeOffWindow({ ...CAUGHT, crestSpeed: 2, speedShoreward: 3, speedOverGround: 3 })).toBe(true);
  });
});
