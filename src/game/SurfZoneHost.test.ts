import { describe, expect, it } from 'vitest';
import { sampleSurfaceBed, sampleSurfaceHeight } from '../scene/WaterSurface';
import { SurfZoneRunner } from '../wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { LocalSurfZone } from './SurfZoneHost';

const config: SurfZoneConfig = {
  spot: 'beach', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 10, spreading: 12, tide: 0,
  componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('LocalSurfZone', () => {
  it('is ready at once and snapshots the same surf zone a runner steps', async () => {
    const host = new LocalSurfZone(config);
    await host.ready;
    const runner = new SurfZoneRunner(config);
    expect(host.init.grid).toEqual(runner.grid);
    expect(Array.from(host.init.bed)).toEqual(Array.from(runner.bed));
    expect(host.init.focus).toEqual(runner.focus);
    host.advance(45);
    runner.advance(45);
    const buffers = runner.createBuffers();
    runner.fill(buffers);
    expect(Array.from(host.snapshot.surface)).toEqual(Array.from(buffers.surface));
    expect(Array.from(host.snapshot.flow)).toEqual(Array.from(buffers.flow));
    // Everything but the wall-clock step time is deterministic.
    expect({ ...host.snapshot.status, stepMs: 0 }).toEqual({ ...runner.status(), stepMs: 0 });
  });

  it('samples the rendered surface and bed for the camera', async () => {
    const host = new LocalSurfZone(config);
    await host.ready;
    host.advance(10);
    const { grid, bed } = host.init;
    for (const [x, z] of [[0.3, -60.2], [5.1, -140], [-7, -3.4]]) {
      expect(host.heightAt(x, z)).toBe(sampleSurfaceHeight(host.snapshot.surface, grid, x, z));
      expect(host.bedAt(x, z)).toBe(sampleSurfaceBed(bed, grid, x, z));
    }
    expect(host.heightAt(0, -60)).toBeCloseTo(host.runner.simulation.heightAt(0, -60), 4);
  });
});
