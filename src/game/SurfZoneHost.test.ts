import { describe, expect, it } from 'vitest';
import { sampleSurfaceBed, sampleSurfaceHeight } from '../scene/WaterSurface';
import { SurfZoneRunner } from '../wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { carveAt, TUBE_STRIDE } from '../wave/tubeTable';
import { LocalSurfZone, SnapshotSurfZone } from './SurfZoneHost';

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

  it('carves the page\'s heights exactly as the worker does, from the raw heights and tubes it is sent', async () => {
    // Plunging point waves (as the simulation's own lip test): a tube flies about a second, so look every 0.1 s.
    const host = new LocalSurfZone({ ...config, spot: 'point', dx: 1, fineSpacing: 1, peakPeriod: 14, directionDegrees: 20, spreading: 24 });
    await host.ready;
    const open = () => {
      const { tubes, tubeCount } = host.snapshot;
      let best = -1;
      for (let k = 0; k < tubeCount; k += 1) if (best < 0 || tubes[k * TUBE_STRIDE + 5] > tubes[best * TUBE_STRIDE + 5]) best = k;
      return best >= 0 && tubes[best * TUBE_STRIDE + 5] >= 0.6 ? best : -1;
    };
    const grid = { ...host.runner.grid };
    const page = new SnapshotSurfZone(host);
    const carved = new Float32Array(host.snapshot.surface.length);
    const raw = new Float32Array(host.snapshot.surface.length);
    const expected = new Float32Array(host.snapshot.surface.length);
    // An open tube that cuts the render grid: one can also fly between its nodes.
    const carving = () => {
      if (open() < 0) return false;
      page.writeUniformSurface(carved, grid);
      page.writeUniformSurface(raw, grid, false);
      return carved.some((height, k) => height !== raw[k]);
    };
    for (let tenth = 0; tenth < 400 && !carving(); tenth += 1) host.advance(3);
    const tube = open();
    expect(tube).toBeGreaterThanOrEqual(0);
    host.runner.simulation.writeUniformSurface(expected, grid);
    // The tube table crosses as 32-bit floats, as every snapshot buffer does: the page agrees with the worker to well under a millimetre.
    let largest = 0;
    let changed = 0;
    for (let k = 0; k < carved.length; k += 1) {
      largest = Math.max(largest, Math.abs(carved[k] - expected[k]));
      if (raw[k] !== carved[k]) changed += 1;
    }
    expect(largest).toBeLessThan(1e-4);
    expect(changed).toBeGreaterThan(0);
    // The page's sampler carves too: inside the first tube, below the raw surface.
    const t = host.snapshot.tubes;
    const o = tube * TUBE_STRIDE;
    const [x, z] = [t[o] + t[o + 3] * 0.3, t[o + 1] + t[o + 4] * 0.3];
    const rawHeight = sampleSurfaceHeight(host.snapshot.surface, host.init.grid, x, z);
    expect(host.heightAt(x, z)).toBe(carveAt(t, host.snapshot.tubeCount, host.init.dx, x, z, rawHeight));
    expect(host.heightAt(x, z)).toBeLessThan(rawHeight);
  });
});
