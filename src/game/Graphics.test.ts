import { describe, expect, it } from 'vitest';
import { defaultSettings, type Detection, type GraphicsSettings } from './Settings';
import {
  AutoBenchmark, BENCHMARK_SECONDS, BenchmarkRecorder, MIN_SEA_RATE, PRESETS, RIDE_WORKER_FACTOR, STEP_BUDGET_MS, SURFER_DETAIL, choosePreset, highHolds,
  needsDetection, ownSurferDetail, resolveGraphics, withAdvanced, withPreset,
} from './Graphics';

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

  it('matches Medium particles to Medium graphics and keeps High detail at High and Ultra', () => {
    expect(PRESETS.low.particles).toBe('low');
    expect(PRESETS.medium.particles).toBe('medium');
    for (const preset of ['high', 'ultra'] as const) expect(PRESETS[preset].particles).toBe('high');
    expect(resolveGraphics({ preset: 'low', ...PRESETS.low }, undefined, 2).particles).toBe('low');
    expect(resolveGraphics(withAdvanced(defaultSettings().graphics, { particles: 'medium' }), undefined, 2).particles).toBe('medium');
  });

  // G8: the water look by preset.
  it('puts Low on the Classic water and the others on Rich', () => {
    expect(PRESETS.low.waterLook).toBe('classic');
    for (const preset of ['medium', 'high', 'ultra'] as const) expect(PRESETS[preset].waterLook).toBe('rich');
    expect(resolveGraphics({ preset: 'low', ...PRESETS.low }, undefined, 2).waterLook).toBe('classic');
    expect(resolveGraphics({ preset: 'high', ...PRESETS.high }, undefined, 2).waterLook).toBe('rich');
  });

  // The riding-body plan, step 1: the player's own surfer is always the full body (on Medium the camera's 11 m drew the
  // low-poly one); online surfers keep the preset's distance.
  it('draws your own surfer with the full body at every preset, at the preset\'s textures', () => {
    for (const preset of ['low', 'medium', 'high', 'ultra'] as const) {
      const resolved = resolveGraphics({ preset, ...PRESETS[preset] }, undefined, 2);
      expect(ownSurferDetail(resolved)).toEqual({ lodDistance: Infinity, textureCap: SURFER_DETAIL[preset].textureCap });
      expect(resolved.surferLodDistance).toBe(SURFER_DETAIL[preset].surferLodDistance);
    }
  });

  // The M1 readback study (2026-10-17): the menu's frames alone rated an M1 Air High, where it drew 14 fps with its sea
  // at a fifth of real time. Auto now also watches the menu's sea, and tries High's own drawing before choosing it.
  describe('with the menu sea in view', () => {
    const frames = { frameIntervals: steady(16.7), stepMs: steady(9, 300) };
    const sea = (workerMs: number, seaRate = 1) => ({ workerMs: steady(workerMs, 300), seaRate });

    it('keeps the frame verdict when the sea keeps real time with room for a ride', () => {
      expect(choosePreset({ ...frames, gpuCompute: true, ...sea(6) })).toEqual({ preset: 'high', water: 'accurate', lowPerformance: false });
      expect(choosePreset({ ...frames, gpuCompute: false, ...sea(6) }).preset).toBe('medium');
      // An M1's menu sea on a calm machine (13.7 ms a step) leaves just room for a ride's (×1.2 = 16.4 ms).
      expect(RIDE_WORKER_FACTOR * 13.7).toBeLessThanOrEqual(STEP_BUDGET_MS);
      expect(choosePreset({ ...frames, gpuCompute: true, ...sea(13.7) }).preset).toBe('high');
    });

    it('drops to Low when the menu sea falls behind real time', () => {
      expect(choosePreset({ ...frames, gpuCompute: true, ...sea(6, MIN_SEA_RATE - 0.01) }).preset).toBe('low');
      expect(choosePreset({ ...frames, gpuCompute: true, ...sea(6, MIN_SEA_RATE) }).preset).toBe('high');
    });

    it("drops to Low when a ride's step would overrun the 1/60 s budget", () => {
      // The same M1 under load: 23.2 ms a menu step, a ride's about 28 ms.
      expect(choosePreset({ ...frames, gpuCompute: true, ...sea(23.2, 1) })).toEqual({ preset: 'low', water: 'accurate', lowPerformance: false });
      expect(choosePreset({ ...frames, gpuCompute: true, ...sea(14.5, 1) }).preset).toBe('low');
    });

    it('judges only stage 2 seas: a stage 1 verdict goes by the frames', () => {
      const verdict = choosePreset({ frameIntervals: steady(16.7), stepMs: steady(19, 50), gpuCompute: false, ...sea(30, 0.5) });
      expect(verdict).toEqual({ preset: 'medium', water: 'fast', lowPerformance: false });
    });

    it("tries High against Medium's refresh: late frames or a slowed sea keep Medium", () => {
      const medium = 16.7;
      expect(highHolds({ frameIntervals: steady(16.7), stepMs: [], gpuCompute: true, ...sea(9) }, medium)).toBe(true);
      // A steady 14 fps is on time against itself, not against the display.
      expect(highHolds({ frameIntervals: steady(72), stepMs: [], gpuCompute: true, ...sea(9) }, medium)).toBe(false);
      // High's drawing taking the GPU from the water: the sea at 0.56× real time (an M1, the synthetic drawing).
      expect(highHolds({ frameIntervals: steady(16.7), stepMs: [], gpuCompute: true, ...sea(9, 0.56) }, medium)).toBe(false);
      expect(highHolds({ frameIntervals: steady(16.7), stepMs: [], gpuCompute: true, ...sea(15) }, medium)).toBe(false);
      expect(highHolds({ frameIntervals: [], stepMs: [], gpuCompute: true }, medium)).toBe(false);
    });

    it("measures the sea's real-time rate and the worker time of fresh steps only", () => {
      const recorder = new BenchmarkRecorder();
      let seaTime = 10;
      for (let frame = 0; frame < 200; frame += 1) {
        // The sea advances 3 steps every 4 frames (0.75× real time); repeated snapshots carry no new worker time.
        const fresh = frame % 4 !== 3;
        if (fresh) seaTime += 1 / 60;
        recorder.add(1000 / 60, 9, true, { seaTime, workerMs: fresh ? 22 : 999 });
      }
      expect(recorder.seaRate).toBeCloseTo(0.75, 2);
      expect(recorder.sawSea).toBe(true);
      expect(recorder.refresh).toBeCloseTo(1000 / 60, 9);
      expect(recorder.sample().workerMs).toEqual(steady(22, 149)); // The first frame only starts the clock.
      expect(recorder.result().preset).toBe('low');
    });

    it('restarts its sea clock after a gap, and ignores a jump to another sea', () => {
      const recorder = new BenchmarkRecorder();
      recorder.add(16, 9, true, { seaTime: 5 });
      recorder.add(16, 9, true, { seaTime: 5.016 });
      recorder.add(1000, 9, true, { seaTime: 6 });
      recorder.add(16, 9, true, { seaTime: 40 });
      recorder.add(16, 9, true, { seaTime: 40.016 });
      expect(recorder.seaRate).toBeCloseTo(1, 6);
      expect(new BenchmarkRecorder().sawSea).toBe(false);
    });
  });

  describe('the Auto benchmark', () => {
    const run = (benchmark: AutoBenchmark, frame: number, sea?: { workerMs: number; rate: number }) => {
      let step;
      let seaTime = 0;
      for (let i = 0; i < BENCHMARK_SECONDS * 60 + 2 && !step; i += 1) {
        seaTime += sea ? sea.rate * (frame / 1000) : 0;
        step = benchmark.add(frame, 9, true, sea && { seaTime, workerMs: sea.workerMs });
      }
      return step;
    };

    it('tries High after Medium held, and chooses it once High has held too', () => {
      const benchmark = new AutoBenchmark();
      expect(run(benchmark, 16.7, { workerMs: 8, rate: 1 })).toEqual({ tryHigh: { preset: 'high', water: 'accurate', lowPerformance: false } });
      expect(benchmark.trying).toBe(true);
      expect(run(benchmark, 16.7, { workerMs: 9, rate: 1 })).toEqual({ verdict: { preset: 'high', water: 'accurate', lowPerformance: false } });
      expect(benchmark.trying).toBe(false);
    });

    it("keeps Medium when High's trial fails or the menu is left during it", () => {
      const slow = new AutoBenchmark();
      run(slow, 16.7, { workerMs: 8, rate: 1 });
      expect(run(slow, 72, { workerMs: 9, rate: 0.23 })).toEqual({ verdict: { preset: 'medium', water: 'accurate', lowPerformance: false } });
      const left = new AutoBenchmark();
      run(left, 16.7, { workerMs: 8, rate: 1 });
      expect(left.abandon()).toEqual({ preset: 'medium', water: 'accurate', lowPerformance: false });
      expect(left.trying).toBe(false);
      expect(new AutoBenchmark().abandon()).toBeUndefined();
    });

    it('gives Low, CPU and sea-less verdicts at once, without a trial', () => {
      expect(run(new AutoBenchmark(), 16.7, { workerMs: 23, rate: 0.72 })).toEqual({ verdict: { preset: 'low', water: 'accurate', lowPerformance: false } });
      expect(run(new AutoBenchmark(), 16.7)).toEqual({ verdict: { preset: 'high', water: 'accurate', lowPerformance: false } });
    });
  });
});
