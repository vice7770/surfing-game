import { describe, expect, it } from 'vitest';
import { dampedMode, turnMeasures } from './carveMetrics';

const STEP = 1 / 60;

/** e^(−ζωt) sin(ω_d t) sampled at STEP for `seconds`. */
function ringing(frequency: number, damping: number, seconds: number): number[] {
  const omega = 2 * Math.PI * frequency / Math.sqrt(1 - damping * damping);
  const damped = 2 * Math.PI * frequency;
  return Array.from({ length: Math.round(seconds / STEP) }, (_, i) => Math.exp(-damping * omega * i * STEP) * Math.sin(damped * i * STEP));
}

describe('dampedMode', () => {
  it('reads the frequency and damping of a ringing trace', () => {
    for (const [frequency, damping] of [[3, 0.1], [1, 0.3]]) {
      const mode = dampedMode(ringing(frequency, damping, 4), STEP)!;
      expect(Math.abs(mode.frequency - frequency) / frequency).toBeLessThan(0.03);
      expect(Math.abs(mode.damping - damping)).toBeLessThan(0.03);
    }
  });

  it('reads a growing oscillation as negative damping', () => {
    expect(dampedMode(ringing(2, -0.05, 3), STEP)!.damping).toBeLessThan(0);
  });

  it('needs two peaks', () => {
    expect(dampedMode(ringing(0.2, 0.1, 2), STEP)).toBeUndefined();
  });
});

describe('turnMeasures', () => {
  it('reads a turn from its headings', () => {
    const headings = Array.from({ length: 61 }, (_, i) => Math.min(1, i * STEP) * 1.745 + 3.1);
    const turn = turnMeasures(headings, STEP, 60);
    expect(turn.yaw).toBeCloseTo(1.745, 2);
    expect(turn.peakRate).toBeCloseTo(1.745, 2);
    expect(Math.abs(turn.timeTo! - 0.6)).toBeLessThanOrEqual(STEP + 1e-9);
  });
});
