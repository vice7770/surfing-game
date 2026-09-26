import { describe, expect, it } from 'vitest';
import { defaultSettings } from './Settings';
import { BenchmarkRecorder, PRESETS, choosePreset, needsDetection, resolveGraphics, withAdvanced, withPreset } from './Graphics';

const steady = (ms: number, n = 360) => Array.from({ length: n }, () => ms);

describe('graphics', () => {
  it('starts the settings on Auto with the Medium values', () => {
    expect(defaultSettings().graphics).toEqual({ preset: 'auto', ...PRESETS.medium });
  });

  it('picks High on a GPU tier that keeps the frame rate, Medium on the CPU', () => {
    expect(choosePreset({ frameIntervals: steady(16.7), stepMs: steady(4.6, 50), gpuCompute: true }))
      .toEqual({ preset: 'high', water: 'accurate', lowPerformance: false });
    expect(choosePreset({ frameIntervals: steady(16.7), stepMs: steady(12, 50), gpuCompute: false }).preset).toBe('medium');
  });

  it('drops to Low, and warns, when many frames are late', () => {
    const intervals = [...steady(16.7, 200), ...steady(40, 160)];
    expect(choosePreset({ frameIntervals: intervals, stepMs: steady(5, 50), gpuCompute: true }))
      .toMatchObject({ preset: 'low', lowPerformance: true });
  });

  it('runs the fast water when stage 2 steps cannot keep real time', () => {
    expect(choosePreset({ frameIntervals: steady(16.7), stepMs: steady(19, 50), gpuCompute: false }).water).toBe('fast');
  });

  it('ignores the gaps of a hidden tab', () => {
    const recorder = new BenchmarkRecorder();
    for (let i = 0; i < 20; i += 1) recorder.add(1000, 5, true);
    expect(recorder.done).toBe(false);
    for (let i = 0; i < 400; i += 1) recorder.add(16.7, 5, true);
    expect(recorder.done).toBe(true);
    expect(recorder.result().preset).toBe('high');
  });

  it('resolves pixel ratio, frame interval, water and the still backdrop', () => {
    const low = resolveGraphics(withPreset(defaultSettings().graphics, 'low'), undefined, 2);
    expect(low).toMatchObject({ pixelRatio: 0.75, frameInterval: 0, stage: 2, compute: 'auto', caustics: false, stillBackdrop: true });
    const fast = resolveGraphics({ ...defaultSettings().graphics, frameLimit: 30, waterSimulation: 'auto' },
      { preset: 'medium', water: 'fast', lowPerformance: false, adapter: 'x' }, 3);
    expect(fast).toMatchObject({ frameInterval: 1000 / 30, stage: 1, compute: 'cpu', stillBackdrop: false });
    expect(resolveGraphics(withPreset(defaultSettings().graphics, 'ultra'), undefined, 3).pixelRatio).toBeCloseTo(1.75 * 1.25, 9);
  });

  it('turns the preset to Custom when an advanced value changes, and back when a preset is chosen', () => {
    const custom = withAdvanced(withPreset(defaultSettings().graphics, 'high'), { caustics: false });
    expect(custom.preset).toBe('custom');
    expect(withPreset(custom, 'medium')).toEqual({ preset: 'medium', ...PRESETS.medium });
  });

  it('detects again when there is no detection or the graphics card changed', () => {
    const auto = defaultSettings().graphics;
    const seen = { preset: 'high' as const, water: 'accurate' as const, lowPerformance: false, adapter: 'Apple M2' };
    expect(needsDetection(auto, undefined, 'Apple M2')).toBe(true);
    expect(needsDetection(auto, seen, 'Apple M2')).toBe(false);
    expect(needsDetection(auto, seen, 'Intel UHD 620')).toBe(true);
    expect(needsDetection(withPreset(auto, 'low'), undefined, 'x')).toBe(false);
  });
});
