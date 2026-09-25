import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from './WaveModel';

describe('InteractiveWaterField', () => {
  it('repeats water evolution for the same seed, settings, and fixed steps', () => {
    const first = new InteractiveWaterField(42, { ...DEFAULT_WAVE_SETTINGS });
    const second = new InteractiveWaterField(42, { ...DEFAULT_WAVE_SETTINGS });
    for (let frame = 0; frame < 120; frame += 1) {
      first.step(1 / 60);
      second.step(1 / 60);
    }
    expect(first.sample(1.25, -4).height).toBe(second.sample(1.25, -4).height);
    expect(first.sample(1.25, -4).normal.toArray()).toEqual(second.sample(1.25, -4).normal.toArray());
    expect(first.sample(1.25, -4).velocity.toArray()).toEqual(second.sample(1.25, -4).velocity.toArray());
  });

  it('propagates initialized wave energy in its configured direction', () => {
    const wave = new InteractiveWaterField(9, { ...DEFAULT_WAVE_SETTINGS, speed: 2.5 });
    const initial = wave.crestZ();
    for (let frame = 0; frame < 60; frame += 1) wave.step(1 / 60);
    expect(wave.crestZ()).toBeGreaterThan(initial + 1);
    expect(wave.crestZ()).toBeLessThan(initial + 5);
  });

  it('produces a different initialized surface shape for a different seed', () => {
    const first = new InteractiveWaterField(21, { ...DEFAULT_WAVE_SETTINGS });
    const next = new InteractiveWaterField(22, { ...DEFAULT_WAVE_SETTINGS });
    expect(first.sample(3, -15).height).not.toBe(next.sample(3, -15).height);
  });

  it('keeps height, slopes, normals, and surface velocity finite during evolution', () => {
    const wave = new InteractiveWaterField(123, { height: 2.4, period: 12, speed: 5 });
    for (let frame = 0; frame < 360; frame += 1) wave.step(1 / 60);
    const sample = wave.sample(5.5, 8);
    expect(Number.isFinite(sample.height)).toBe(true);
    expect(Number.isFinite(sample.slopeX)).toBe(true);
    expect(Number.isFinite(sample.slopeZ)).toBe(true);
    expect(sample.normal.toArray().every(Number.isFinite)).toBe(true);
    expect(sample.velocity.toArray().every(Number.isFinite)).toBe(true);
    expect(Math.abs(sample.height)).toBeLessThan(6);
  });

  it('reset restores exactly the initial incoming wave state', () => {
    const wave = new InteractiveWaterField(2, { ...DEFAULT_WAVE_SETTINGS });
    const initial = wave.sample(0, -18);
    for (let frame = 0; frame < 90; frame += 1) wave.step(1 / 60);
    wave.reset();
    expect(wave.time).toBe(0);
    expect(wave.sample(0, -18).height).toBe(initial.height);
    expect(wave.sample(0, -18).velocity.toArray()).toEqual(initial.velocity.toArray());
  });

  it('applies the hull reaction opposite to the force on the board', () => {
    const wave = new InteractiveWaterField(8, { height: 0, period: 8, speed: 0 });
    const before = wave.sample(0, 0).velocity.z;
    wave.applyBoardReaction(0, 0, new Vector3(0, 0, 80), 1 / 60);
    expect(wave.sample(0, 0).velocity.z).toBeLessThan(before);
  });
});
