import { describe, expect, it } from 'vitest';
import { AxisRamp, RAMP_TIME } from './InputAxes';

describe('AxisRamp', () => {
  it('reaches a held key in 0.2 s, lets go at the same rate, and reverses in 0.4 s', () => {
    expect(RAMP_TIME).toBe(0.2);
    const ramp = new AxisRamp();
    expect(ramp.update(1, 0.1)).toBeCloseTo(0.5, 9);
    expect(ramp.update(1, 0.1)).toBeCloseTo(1, 9);
    expect(ramp.update(1, 0.1)).toBe(1);
    expect(ramp.update(0, 0.1)).toBeCloseTo(0.5, 9);
    expect(ramp.update(0, 0.1)).toBeCloseTo(0, 9);
    ramp.update(1, 0.2);
    expect(ramp.update(-1, 0.2)).toBeCloseTo(0, 9);
    expect(ramp.update(-1, 0.2)).toBeCloseTo(-1, 9);
    expect(ramp.value).toBeCloseTo(-1, 9);
  });

  it('starts over from rest', () => {
    const ramp = new AxisRamp();
    ramp.update(1, 0.2);
    ramp.reset();
    expect(ramp.value).toBe(0);
    expect(ramp.update(1, 0.05)).toBeCloseTo(0.25, 9);
  });
});
