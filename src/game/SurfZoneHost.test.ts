import { describe, expect, it } from 'vitest';
import { sampleSurfaceBed, sampleSurfaceHeight } from '../scene/WaterSurface';
import { SurfZoneRunner } from '../wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { carveAt, TUBE_STRIDE } from '../wave/tubeTable';
import { BoussinesqSolver } from '../wave/BoussinesqSolver';
import { encodeSurfZoneState } from '../wave/surfZoneState';
import { LocalSurfZone, SnapshotSurfZone, type SurfZoneHost } from './SurfZoneHost';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from './PhysicalMode';
import { PhysicalSurfaceSource } from '../scene/PhysicalSurfaceSource';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE } from '../wave/SpillingRoller';

const config: SurfZoneConfig = {
  spot: 'beach', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 10, spreading: 12, tide: 0,
  componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('LocalSurfZone', () => {
  // L2: every lesson attempt starts from the same recorded sea.
  // The recording is 32-bit (as the handover's), so restores match each other exactly, not the run it came from.
  it('restores a running sea in place, and the same water follows every time', async () => {
    const host = new LocalSurfZone(config);
    await host.ready;
    host.advance(30);
    const recorded = encodeSurfZoneState(host.runner.simulation.exportState());
    host.restore(recorded.slice());
    host.advance(240);
    const first = Array.from(host.snapshot.surface);
    host.advance(120);
    host.restore(recorded.slice());
    host.advance(240);
    expect(Array.from(host.snapshot.surface)).toEqual(first);
  });

  it('measures the surf afresh after a restore (wave sizes)', async () => {
    const host = new LocalSurfZone(config);
    await host.ready;
    const recorded = encodeSurfZoneState(host.runner.simulation.exportState());
    const { surf, solver } = host.runner.simulation;
    for (let k = 1; k <= 4; k += 1) surf.add({ time: solver.time + 9 * k, x: 0, z: -80, face: 1.5 });
    host.restore(recorded.slice());
    expect(host.runner.simulation.surf.waves()).toHaveLength(0);
    host.advance(1);
    expect(host.snapshot.status.surf).toBeUndefined();
  });

  it('asks the device to upload the breaking state again after a sea is taken over', async () => {
    const host = new LocalSurfZone(config);
    await host.ready;
    const { solver } = host.runner.simulation;
    if (!(solver instanceof BoussinesqSolver)) throw new Error('expected stage 2');
    const before = solver.deviceLayout().version;
    host.restore(encodeSurfZoneState(host.runner.simulation.exportState()));
    expect(solver.deviceLayout().version).toBe(before + 1);
  });

  it('keeps the practice Reef’s water steady while its tubes collapse (G9)', () => {
    // The water sheet's sea: collapsing a void while its jet still poured landed the rest of the pour on the crest,
    // and the crest's water ran away within 1.5 s. Its spin-up is most of the cost: minutes under a loaded full suite.
    const settings = { ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' as const, source: 'practice' as const, compute: 'cpu' as const };
    const swell = swellFor(settings);
    const host = new LocalSurfZone({
      spot: 'reef', seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? settings.directionDegrees, spreading: swell.spreading, bandwidth: swell.bandwidth,
      tide: settings.tide, windSpeed: settings.windSpeed, stage: settings.stage, compute: 'cpu',
    });
    const { solver, lip } = host.runner.simulation;
    let tubes = 0;
    let fastest = 0;
    // Run until a set's tubes have formed and had 2 s (120 steps) to collapse, wherever the sea's timing puts them.
    let collapsing = 0;
    for (let step = 0; step < 900 && fastest < 15 && collapsing < 120; step += 1) {
      host.advance(1);
      tubes = Math.max(tubes, lip.tubeCount);
      if (tubes > 10) collapsing += 1;
      for (let i = 0; i < solver.h.length; i += 1) {
        if (solver.h[i] > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i]);
      }
    }
    expect(tubes).toBeGreaterThan(10);
    expect(fastest).toBeLessThan(10);
  }, 300_000);

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
    expect({ ...host.snapshot.status, stepMs: 0, pipelineMs: undefined }).toEqual({ ...runner.status(), stepMs: 0, pipelineMs: undefined });
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

describe('SnapshotSurfZone at a swept spot (Padang Padang, Part B, PR 3)', () => {
  it('draws the water uncarved and hands the water no tubes, where the swept barrel draws the tube', () => {
    const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 4, nz: 4 };
    const surface = new Float32Array(32).map((_, k) => k);
    const host = { init: { grid, dx: 1 }, snapshot: { surface, tubes: new Float32Array(2 * TUBE_STRIDE), tubeCount: 1 } } as unknown as SurfZoneHost;
    const swept = new SnapshotSurfZone(host, { sweptBarrel: true });
    const data = new Float32Array(32);
    swept.writeUniformSurface(data, grid, true);
    expect(Array.from(data)).toEqual(Array.from(surface));
    expect(swept.writeTubes(new Float32Array(2 * TUBE_STRIDE))).toBe(0);
    expect(new SnapshotSurfZone(host).writeTubes(new Float32Array(2 * TUBE_STRIDE))).toBe(1);
  });
});

// The Canyon roller lens (S3, Task 4): the roller's table travels in the snapshot for both looks to draw the band.
describe('the roller lens in the snapshot', () => {
  it('carries the Canyon\'s roller table to the page, where the water\'s source offers it with its columns', async () => {
    const host = new LocalSurfZone({ ...config, spot: 'canyon' });
    await host.ready;
    const roller = host.runner.simulation.roller!;
    const { nx, dx, xCenters } = host.runner.simulation.solver;
    // A lens written into the table, as the roller's update would.
    roller.table[(nx + 5) * ROLLER_STRIDE + ROLLER_FIELD.scale] = 0.75;
    roller.table[(nx + 5) * ROLLER_STRIDE + ROLLER_FIELD.crest] = -60.25;
    host.refresh();
    const { snapshot } = host;
    expect(snapshot.roller).toHaveLength(ROLLER_SLOTS * nx * ROLLER_STRIDE);
    expect(snapshot.rollerCount).toBe(nx);
    expect(Array.from(snapshot.roller)).toEqual(Array.from(roller.table, (value) => Math.fround(value)));
    const surface = new SnapshotSurfZone(host);
    const source = new PhysicalSurfaceSource(surface, host.init.grid.spacing);
    expect(source.rollerColumns).toBe(nx);
    expect(source.rollerColumn0).toBeCloseTo(xCenters[0], 9);
    expect(source.rollerColumnWidth).toBe(dx);
    const into = new Float32Array(ROLLER_SLOTS * nx * ROLLER_STRIDE);
    expect(source.writeRoller!(into)).toBe(nx);
    expect(into[(nx + 5) * ROLLER_STRIDE + ROLLER_FIELD.scale]).toBe(0.75);
    expect(into[(nx + 5) * ROLLER_STRIDE + ROLLER_FIELD.crest]).toBe(-60.25);
  });

  it('offers no roller where the sea has none', async () => {
    const host = new LocalSurfZone(config);
    await host.ready;
    expect(host.snapshot.roller).toHaveLength(0);
    expect(host.snapshot.rollerCount).toBe(0);
    const source = new PhysicalSurfaceSource(new SnapshotSurfZone(host), host.init.grid.spacing);
    expect(source.writeRoller).toBeUndefined();
    expect(source.rollerColumns).toBeUndefined();
  });
});
