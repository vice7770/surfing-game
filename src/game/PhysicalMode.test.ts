import { describe, expect, it, vi } from 'vitest';
import { Scene } from 'three';
import { WaterSurface } from '../scene/WaterSurface';
import { LegacySurfaceSource } from '../scene/LegacySurfaceSource';
import { SPOT_OPTICS } from '../scene/waterOptics';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from '../wave/WaveModel';
import { stormSwell } from '../wave/StormSwell';
import { DEFAULT_PHYSICAL_SETTINGS, PhysicalMode, chopForWind, formatPhysicalReadout, spreadingFor, swellFor } from './PhysicalMode';
import type { LocalSurfZone } from './SurfZoneHost';

const quick = { alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 8 };

describe('PhysicalMode', () => {
  it('maps the spread slider from groundswell to windswell spreading', () => {
    expect(spreadingFor(0)).toBeCloseTo(24, 12);
    expect(spreadingFor(1)).toBeCloseTo(4, 12);
    expect(spreadingFor(0.5)).toBeCloseTo(Math.sqrt(24 * 4), 9);
    expect(spreadingFor(3)).toBeCloseTo(4, 12);
  });

  it('takes buoy values directly and derives them from a storm in storm mode', () => {
    const buoy = swellFor(DEFAULT_PHYSICAL_SETTINGS);
    expect(buoy).toEqual({
      significantHeight: DEFAULT_PHYSICAL_SETTINGS.significantHeight,
      peakPeriod: DEFAULT_PHYSICAL_SETTINGS.peakPeriod,
      spreading: spreadingFor(DEFAULT_PHYSICAL_SETTINGS.spread),
    });
    const settings = { ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm' as const, stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 4000 };
    const storm = stormSwell({ windSpeed: 18, fetchKm: 600, durationHours: 36, distanceKm: 4000 });
    const derived = swellFor(settings);
    expect(derived.storm).toEqual(storm);
    expect(derived.significantHeight).toBeCloseTo(storm.significantHeight, 12);
    expect(derived.peakPeriod).toBeCloseTo(storm.peakPeriod, 12);
    expect(derived.spreading).toBe(storm.spreading);
    expect(derived.bandwidth).toBe(storm.bandwidth);
  });

  it('keeps a derived storm swell inside what the tank can carry', () => {
    const near = swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm', stormWindSpeed: 28, stormFetchKm: 2000, stormDurationHours: 96, stormDistanceKm: 200 });
    expect(near.storm!.significantHeight).toBeGreaterThan(3);
    expect(near.significantHeight).toBe(3);
    expect(near.peakPeriod).toBe(18);
  });

  it('roughens the chop more under onshore than offshore wind', () => {
    expect(chopForWind(12)).toBeGreaterThan(chopForWind(-12));
    expect(chopForWind(-12)).toBeGreaterThan(chopForWind(0));
    expect(chopForWind(0)).toBeGreaterThan(0);
  });

  it('shows the physical sea on the shared water surface and frames its break', async () => {
    const scene = new Scene();
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    const mode = new PhysicalMode(scene);
    const waterOptics = vi.spyOn(water, 'setOptics');
    const farOptics = vi.spyOn(mode.farField, 'setOptics');
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' }, 5, water, quick)).toBe(true);
    const local = mode.host as LocalSurfZone;
    const simulation = local.runner.simulation;
    expect(waterOptics).toHaveBeenCalledWith(SPOT_OPTICS.reef);
    expect(farOptics).toHaveBeenCalledWith(SPOT_OPTICS.reef);
    water.update();
    expect(water.grid.nz).toBe(local.init.grid.nz);
    expect(mode.seabed.mesh.visible).toBe(true);
    expect(scene.children).toContain(mode.seabed.mesh);
    expect(scene.children).toContain(mode.farField.mesh);
    expect(mode.farField.mesh.visible).toBe(true);
    expect(scene.children).toContain(mode.lipPoints.mesh);
    expect(mode.lipPoints.mesh.visible).toBe(true);
    expect(scene.children).toContain(mode.bubbles.mesh);
    expect(mode.farField.textureSize.width).toBe(simulation.sea.components.length + 1);
    expect(mode.focus).toEqual(simulation.breakPoint());
    mode.advance(1);
    mode.update(1 / 60);
    // The front view, elevated on the beach side of the rider.
    expect(mode.camera.camera.position.y).toBeGreaterThan(mode.board.position.y + 2);
    expect(mode.camera.camera.position.z).toBeGreaterThan(mode.board.position.z);
    expect(mode.farField.temporalPhases[0]).toBeCloseTo((simulation.sea.components[0].omega * simulation.seaTime) % (2 * Math.PI), 4);
    const crest = simulation.solver.cellIndex(0, -60);
    simulation.lip.launch(crest, { x: 0, z: 5 }, 3, 0.5);
    mode.advance(1);
    mode.update(1 / 60);
    expect(mode.lipPoints.mesh.geometry.drawRange.count).toBe(simulation.lip.activeCount());
    expect(mode.lipPoints.mesh.geometry.drawRange.count).toBeGreaterThan(0);
    simulation.foam.source.fill(0);
    simulation.foam.source[crest] = 40;
    local.runner.bubbles.update(simulation, 1 / 60);
    local.refresh();
    mode.update(1 / 30);
    expect(mode.bubbles.mesh.geometry.drawRange.count).toBeGreaterThan(0);
    const board = local.runner.board!;
    expect(scene.children).toContain(mode.board);
    expect(mode.board.visible).toBe(true);
    expect(mode.board.position.toArray()).toEqual(board.position.toArray());
    expect(mode.board.quaternion.toArray()).toEqual(board.orientation.toArray());
    // The rider lies prone on the board, drawn from the snapshot, and the ride camera follows.
    expect(scene.children).toContain(mode.surfer.group);
    expect(mode.surfer.group.visible).toBe(true);
    // Facing the rider from the beach the screen's right is the board's left; from behind, its right.
    mode.camera.camera.updateMatrixWorld();
    expect(mode.screenSteer(1)).toBe(1);
    mode.camera.setView('behind');
    mode.update(1 / 60);
    mode.camera.camera.updateMatrixWorld();
    expect(mode.screenSteer(1)).toBe(-1);
    mode.camera.setView('front');
    mode.update(1 / 60);
    expect(mode.homeView).toBe('front');
    expect(mode.nextView()).toBe('behind');
    expect(mode.nextView()).toBe('side');
    expect(mode.nextView()).toBe('overview');
    expect(mode.nextView()).toBe('front');
    expect(mode.readout().find((row) => row.label === 'RIDER')?.value).toMatch(/^PRONE · \d+\.\d m\/s/);
    mode.advance(1, { paddle: false, popUp: true, steer: 0 });
    expect(local.runner.session!.rider.phase).toBe('push');
    mode.retry();
    mode.advance(1);
    expect(local.runner.session!.rider.phase).toBe('prone');
    expect(local.runner.status().ride!.resets).toBe(1);
    mode.setVisible(false);
    expect(mode.board.visible).toBe(false);
    expect(mode.surfer.group.visible).toBe(false);
    expect(mode.lipPoints.mesh.visible).toBe(false);
    expect(mode.bubbles.mesh.visible).toBe(false);
    expect(mode.seabed.mesh.visible).toBe(false);
    expect(mode.farField.mesh.visible).toBe(false);
    mode.stop();
    expect(mode.ready).toBe(false);
  });

  it('lets only the latest of overlapping starts take over', async () => {
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    const mode = new PhysicalMode(new Scene());
    const first = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick);
    const second = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' }, 1, water, quick);
    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(mode.config?.spot).toBe('point');
    const third = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' }, 1, water, quick);
    mode.cancel();
    expect(await third).toBe(false);
    expect(mode.config?.spot).toBe('point');
  });

  it('describes the running sea, solver cost and next set in the Wave Lab readout', async () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'canyon', significantHeight: 1.8, peakPeriod: 12 }, 2, water, quick);
    const rows = mode.readout();
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('SPOT')).toBe('CANYON');
    expect(value('SWELL')).toMatch(/^Hs 1\.8 m · Tp 12\.0 s · 10°$/);
    expect(value('SOLVER')).toMatch(/cells · \d+\.\d ms\/step$/);
    expect(value('NEXT SET')).toBe('in 25 s');
    expect(value('BREAKER')).toMatch(/^ξ \d+\.\d\d · (SPILLING|PLUNGING|SURGING)$/);
    expect(value('PEEL')).toBe('waiting for a break');
    expect(value('WIND')).toBe('calm');
    expect(value('BREAKING')).toMatch(/^\d+ % of the surf zone$/);
    expect(value('STORM')).toBeUndefined();
    expect(value('LIP')).toBe('no lip yet');
    expect(formatPhysicalReadout(mode.config!, mode.host!.snapshot.status)).toEqual(rows);
  });

  it('builds the sea from a storm and reports it', async () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm', stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 4000 }, 2, water, quick);
    const storm = stormSwell({ windSpeed: 18, fetchKm: 600, durationHours: 36, distanceKm: 4000 });
    expect(mode.storm).toEqual(storm);
    expect(mode.config!.significantHeight).toBeCloseTo(storm.significantHeight, 12);
    expect(mode.config!.bandwidth).toBe(storm.bandwidth);
    const rows = mode.readout();
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('SWELL')).toMatch(/^Hs 1\.4 m · Tp 13\.5 s · 10°$/);
    expect(value('STORM')).toBe('Hs 7.1 m · Tp 13.5 s · fetch-limited · arrives after 4.4 days');
    expect(value('SPREAD')).toBe('s 75 · band ±14 %');
  });
});
