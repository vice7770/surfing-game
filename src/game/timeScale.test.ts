import { describe, expect, it } from 'vitest';
import { TIME_SCALE_MAX, TIME_SCALE_MIN, simulatedSeconds } from './timeScale';

describe('simulatedSeconds', () => {
  it('slows simulated time uniformly', () => {
    expect(simulatedSeconds(0.1, 0.5)).toBeCloseTo(0.05, 12);
    expect(simulatedSeconds(0.1, 1)).toBeCloseTo(0.1, 12);
  });

  it('clamps the scale to the Wave Lab range and ignores bad input', () => {
    expect(simulatedSeconds(1, 0.1)).toBeCloseTo(TIME_SCALE_MIN, 12);
    expect(simulatedSeconds(1, 3)).toBeCloseTo(TIME_SCALE_MAX, 12);
    expect(simulatedSeconds(1, Number.NaN)).toBeCloseTo(TIME_SCALE_MAX, 12);
    expect(simulatedSeconds(-0.2, 0.5)).toBe(0);
  });
});
