import { describe, expect, it } from 'vitest';
import { SURF_ZONE_STEP } from '../../wave/SurfZoneRunner';
import { LabClock } from './labClock';

describe('LabClock', () => {
  it('runs at the slow-motion scale', () => {
    const clock = new LabClock();
    clock.setScale(0.25);
    expect(clock.advance(0.1)).toBeCloseTo(0.025, 9);
  });

  it('steps slower and faster through the presets, clamped at the ends', () => {
    const clock = new LabClock();
    clock.slower();
    expect(clock.scale).toBe(0.5);
    clock.slower();
    clock.slower();
    clock.slower();
    expect(clock.scale).toBe(0.1);
    clock.faster();
    expect(clock.scale).toBe(0.25);
  });

  it('step only while paused, one physics step each', () => {
    const clock = new LabClock();
    clock.step();
    expect(clock.advance(0.1)).toBeCloseTo(0.1, 9);
    clock.togglePause();
    expect(clock.advance(0.1)).toBe(0);
    clock.step();
    clock.step();
    expect(clock.advance(0.1)).toBeCloseTo(2 * SURF_ZONE_STEP, 12);
    expect(clock.advance(0.1)).toBe(0);
  });

  it('never runs time backward or on bad frames', () => {
    const clock = new LabClock();
    expect(clock.advance(-1)).toBe(0);
    expect(clock.advance(Number.NaN)).toBe(0);
  });
});
