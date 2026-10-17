import { describe, expect, it } from 'vitest';
import { defaultSettings, type Detection, type GraphicsSettings } from './Settings';
import { BenchmarkRecorder, PRESETS, SURFER_DETAIL, choosePreset, needsDetection, ownSurferDetail, resolveGraphics, withAdvanced, withGlowOverride, withPreset } from './Graphics';

const steady = (ms: number, n = 360) => Array.from({ length: n }, () => ms);

describe('graphics', () => {
  it('starts the settings on Auto with the Medium values', () => {
    expect(defaultSettings().graphics).toEqual({ preset: 'auto', ...PRESETS.medium, glow: false });
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
    expect(low).toMatchObject({ pixelRatio: 0.75, frameInterval: 1000 / 60, stage: 2, compute: 'auto', caustics: false, stillBackdrop: true });
    const fast = resolveGraphics({ ...defaultSettings().graphics, frameLimit: 30, waterSimulation: 'auto' },
      { preset: 'medium', water: 'fast', lowPerformance: false, adapter: 'x' }, 3);
    expect(fast).toMatchObject({ frameInterval: 1000 / 30, stage: 1, compute: 'cpu', stillBackdrop: false });
    expect(resolveGraphics(withPreset(defaultSettings().graphics, 'ultra'), undefined, 3).pixelRatio).toBeCloseTo(1.75 * 1.25, 9);
  });

  it("lets each preset pick the surfer's shadow, level of detail and texture size (G7 Part B)", () => {
    const at = (preset: GraphicsSettings['preset'], detected?: Detection) => {
      const { shadows, surferLodDistance, textureCap } = resolveGraphics({ ...defaultSettings().graphics, preset }, detected, 1);
      return { shadows, surferLodDistance, textureCap };
    };
    expect(at('low')).toEqual({ shadows: 'blob', surferLodDistance: 0, textureCap: 512 });
    expect(at('medium')).toEqual({ shadows: 'rider', surferLodDistance: 8, textureCap: 1024 });
    expect(at('high')).toEqual({ shadows: 'surfaces', surferLodDistance: 12, textureCap: 2048 });
    expect(at('ultra')).toEqual({ shadows: 'soft', surferLodDistance: 20, textureCap: 2048 });
    const detected: Detection = { preset: 'high', water: 'accurate', lowPerformance: false, adapter: 'test' };
    expect(at('auto', detected)).toEqual(at('high'));
    expect(at('custom', detected)).toEqual(at('high'));
    expect(at('custom')).toEqual(at('medium'));
  });

  it('turns the preset to Custom when an advanced value changes, and back when a preset is chosen', () => {
    const custom = withAdvanced(withPreset(defaultSettings().graphics, 'high'), { caustics: false });
    expect(custom.preset).toBe('custom');
    expect(withPreset(custom, 'medium')).toEqual({ preset: 'medium', ...PRESETS.medium, glow: false });
  });

  it('detects again when there is no detection or the graphics card changed', () => {
    const auto = defaultSettings().graphics;
    const seen = { preset: 'high' as const, water: 'accurate' as const, lowPerformance: false, adapter: 'Apple M2' };
    expect(needsDetection(auto, undefined, 'Apple M2')).toBe(true);
    expect(needsDetection(auto, seen, 'Apple M2')).toBe(false);
    expect(needsDetection(auto, seen, 'Intel UHD 620')).toBe(true);
    expect(needsDetection(withPreset(auto, 'low'), undefined, 'x')).toBe(false);
  });

  it('matches Medium particles to Medium graphics and keeps High detail at High and Ultra', () => {
    expect(PRESETS.low.particles).toBe('low');
    expect(PRESETS.medium.particles).toBe('medium');
    for (const preset of ['high', 'ultra'] as const) expect(PRESETS[preset].particles).toBe('high');
    expect(resolveGraphics({ preset: 'low', ...PRESETS.low, glow: false }, undefined, 2).particles).toBe('low');
    expect(resolveGraphics(withAdvanced(defaultSettings().graphics, { particles: 'medium' }), undefined, 2).particles).toBe('medium');
  });

  // G8: the water look by preset.
  it('puts Low on the Classic water and the others on Rich', () => {
    expect(PRESETS.low.waterLook).toBe('classic');
    for (const preset of ['medium', 'high', 'ultra'] as const) expect(PRESETS[preset].waterLook).toBe('rich');
    expect(resolveGraphics({ preset: 'low', ...PRESETS.low, glow: false }, undefined, 2).waterLook).toBe('classic');
    expect(resolveGraphics({ preset: 'high', ...PRESETS.high, glow: false }, undefined, 2).waterLook).toBe('rich');
  });

  // The riding-body plan, step 1: the player's own surfer is always the full body (on Medium the camera's 11 m drew the
  // low-poly one); online surfers keep the preset's distance.
  it('draws your own surfer with the full body at every preset, at the preset\'s textures', () => {
    for (const preset of ['low', 'medium', 'high', 'ultra'] as const) {
      const resolved = resolveGraphics({ preset, ...PRESETS[preset], glow: false }, undefined, 2);
      expect(ownSurferDetail(resolved)).toEqual({ lodDistance: Infinity, textureCap: SURFER_DETAIL[preset].textureCap });
      expect(resolved.surferLodDistance).toBe(SURFER_DETAIL[preset].surferLodDistance);
    }
  });

  // The web-ocean plan, item 6: the glow and colour grade, an A/B on the Rich look.
  it('keeps the glow off by default, out of every preset, and on Rich water only', () => {
    expect(defaultSettings().graphics.glow).toBe(false);
    for (const preset of ['low', 'medium', 'high', 'ultra'] as const) expect(PRESETS[preset]).not.toHaveProperty('glow');
    const on = { ...defaultSettings().graphics, glow: true };
    // Choosing a preset keeps it (and does not make it Custom); Auto too.
    expect(withPreset(on, 'high')).toMatchObject({ preset: 'high', glow: true });
    expect(withPreset(on, 'auto', { preset: 'low', water: 'fast', lowPerformance: true, adapter: 'x' })).toMatchObject({ preset: 'auto', glow: true });
    expect(resolveGraphics(withPreset(on, 'medium'), undefined, 2).glow).toBe(true);
    expect(resolveGraphics(withPreset(on, 'ultra'), undefined, 2).glow).toBe(true);
    // Low draws the Classic water: the glow never runs there, nor on Classic by hand.
    expect(resolveGraphics(withPreset(on, 'low'), undefined, 2).glow).toBe(false);
    expect(resolveGraphics(withAdvanced(on, { waterLook: 'classic' }), undefined, 2).glow).toBe(false);
    expect(resolveGraphics(defaultSettings().graphics, undefined, 2).glow).toBe(false);
  });

  it('turns the glow on or off from the URL for an A/B, still on Rich only', () => {
    const rich = resolveGraphics(defaultSettings().graphics, undefined, 2);
    const glowing = resolveGraphics({ ...defaultSettings().graphics, glow: true }, undefined, 2);
    const classic = resolveGraphics(withPreset(defaultSettings().graphics, 'low'), undefined, 2);
    expect(withGlowOverride(rich, '1').glow).toBe(true);
    expect(withGlowOverride(glowing, '0').glow).toBe(false);
    expect(withGlowOverride(classic, '1').glow).toBe(false);
    expect(withGlowOverride(glowing, null)).toBe(glowing);
    expect(withGlowOverride(rich, 'yes')).toBe(rich);
  });
});
