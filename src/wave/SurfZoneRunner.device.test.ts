import { describe, expect, it, vi } from 'vitest';
import { surfZoneConfigFor } from '../game/PhysicalMode';
import { physicalSettingsFor } from '../game/SurfConditions';
import { SurfZoneRunner } from './SurfZoneRunner';
import type { SolverDevice, SolverDeviceTraffic, SurfZoneConfig } from './SurfZoneSimulation';
import { emptyTransfer } from './gpu/GpuBoussinesq';

const config: SurfZoneConfig = {
  spot: 'point', stage: 2, seed: 3, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0,
  alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 0, componentCount: 4,
};

/** A device that steps the solver on the CPU and reports a step's traffic, whole water every third step. */
function cpuDevice(runner: SurfZoneRunner) {
  const configured: SolverDeviceTraffic[] = [];
  let steps = 0;
  const transfer = emptyTransfer();
  const device: SolverDevice = {
    async step(dt) {
      runner.simulation.solver.step(dt);
      steps += 1;
      Object.assign(transfer, emptyTransfer(), { uploadBytes: 1000 * steps, fullWater: steps % 3 === 0 ? 1 : 0, layouts: steps === 1 ? 1 : 0 });
    },
    dispose() {},
    transfer,
    configure: (options) => { configured.push({ ...options }); },
  };
  return { device, configured };
}

// barrel-gpu (2026-11-06): the switches reach the device; the DEVICE row's reasons and counts come from the runner.
describe('the surf zone runner\'s device (barrel-gpu)', () => {
  it('hands the device its traffic options from the config, the old paths with the switches', async () => {
    for (const [overrides, expected] of [
      [{}, { water: 'runs', plunge: 'cells' }],
      [{ deviceWater: 'old', devicePlunge: 'old' }, { water: 'span', plunge: 'whole' }],
    ] as const) {
      const runner = SurfZoneRunner.forWorker({ ...config, ...overrides }, {}, 'warm');
      const { device, configured } = cpuDevice(runner);
      expect(await runner.useDevice(async () => device)).toBe(true);
      expect(configured).toEqual([expected]);
      expect(runner.status().deviceNote).toBeUndefined();
    }
  });

  it('says why the water stays on the CPU, and counts the last second\'s whole uploads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const none = SurfZoneRunner.forWorker(config, {}, 'warm');
      expect(await none.useDevice(async () => undefined)).toBe(false);
      expect(none.status()).toMatchObject({ compute: 'cpu', deviceNote: 'no WebGPU device' });
      const failed = SurfZoneRunner.forWorker(config, {}, 'warm');
      expect(await failed.useDevice(async () => { throw new Error('lost'); })).toBe(false);
      expect(failed.status().deviceNote).toBe('the WebGPU device failed');
      // Not asked for a device at all: no reason given.
      expect(SurfZoneRunner.forWorker(config, {}, 'warm').status().deviceNote).toBeUndefined();
    } finally {
      warn.mockRestore();
    }
    const runner = SurfZoneRunner.forWorker(config, {}, 'warm');
    const { device } = cpuDevice(runner);
    await runner.useDevice(async () => device);
    await runner.advanceAsync(1);
    expect(runner.status().pipelineMs).toMatchObject({ deviceFullWater: 0, deviceLayouts: 1, deviceUploadMean: 1000 });
    for (let k = 0; k < 62; k += 1) await runner.advanceAsync(1);
    // 63 steps: the window holds the last 60 (steps 4–63), whole water on every third.
    expect(runner.status().pipelineMs).toMatchObject({ deviceFullWater: 20, deviceLayouts: 0, deviceUploadMean: 1000 * 33.5 });
  });
});

// barrel-gpu (2026-11-06): the straight Barrel's periodic sea goes to the device unless `?barrelGpu=off` keeps it on the CPU.
describe('the straight Barrel\'s device (barrel-gpu)', () => {
  const barrel = (): SurfZoneConfig => {
    const settings = physicalSettingsFor('pool', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'auto' });
    return surfZoneConfigFor(settings, 8761, true);
  };

  it('asks for a device at the periodic Barrel, and keeps the CPU with barrelGpu off, saying why', async () => {
    const on = SurfZoneRunner.forWorker(barrel(), {}, 'warm');
    expect(on.simulation.solver.periodicAlongShore).toBe(true);
    const asked = vi.fn(async () => cpuDevice(on).device);
    expect(await on.useDevice(asked)).toBe(true);
    expect(asked).toHaveBeenCalledOnce();
    expect(on.status().compute).toBe('gpu');
    const off = SurfZoneRunner.forWorker({ ...barrel(), barrelGpu: 'off' }, {}, 'warm');
    const refused = vi.fn(async () => cpuDevice(off).device);
    expect(await off.useDevice(refused)).toBe(false);
    expect(refused).not.toHaveBeenCalled();
    expect(off.status()).toMatchObject({ compute: 'cpu', deviceNote: 'periodic along shore, kept on the CPU (?barrelGpu=off)' });
  }, 60_000);
});
