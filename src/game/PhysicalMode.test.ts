import { describe, expect, it, vi } from 'vitest';
import { Scene } from 'three';
import { WaterSurface } from '../scene/WaterSurface';
import { LegacySurfaceSource } from '../scene/LegacySurfaceSource';
import { SPOT_OPTICS } from '../scene/waterOptics';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from '../wave/WaveModel';
import { stormSwell } from '../wave/StormSwell';
import { DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, PRACTICE_SWELL, PhysicalMode, chopForWind, formatPhysicalReadout, spreadingFor, swellFor } from './PhysicalMode';
import { LocalSurfZone, type SurfZoneHost } from './SurfZoneHost';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';

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

  it('practises on a steady groundswell whatever the buoy and storm say', () => {
    const practice = swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice', significantHeight: 0.5, peakPeriod: 7, spread: 1 });
    expect(practice).toEqual(PRACTICE_SWELL);
    expect(practice.bandwidth).toBeLessThan(0.1);
    expect(practice.spreading).toBeGreaterThan(spreadingFor(0));
    expect(practice.directionDegrees).toBeDefined();
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
    expect(scene.children).toContain(mode.lipSheet.mesh);
    expect(mode.lipSheet.mesh.visible).toBe(true);
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
    simulation.lip.launch(crest, { x: 0, z: 5 }, simulation.solver.surfaceAt(crest) + 3, 0.5);
    // Once the strip has left the crest, the drawn sheet covers it.
    for (let step = 0; step < 18; step += 1) {
      mode.advance(1);
      mode.update(1 / 60);
    }
    expect(mode.lipSheet.mesh.geometry.index!.count).toBeGreaterThan(0);
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
    expect(mode.lipSheet.mesh.visible).toBe(false);
    expect(mode.bubbles.mesh.visible).toBe(false);
    expect(mode.seabed.mesh.visible).toBe(false);
    expect(mode.farField.mesh.visible).toBe(false);
    mode.stop();
    expect(mode.ready).toBe(false);
  });

  it('frames a riderless sea from its idle view, and a ride from the default view', async () => {
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    const mode = new PhysicalMode(new Scene());
    mode.idleView = 'cinematic';
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick, (config) => new LocalSurfZone(config, {}))).toBe(true);
    expect(mode.homeView).toBe('cinematic');
    expect(mode.camera.view).toBe('cinematic');
    mode.defaultView = 'side';
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick)).toBe(true);
    expect(mode.homeView).toBe('side');
  });

  it('lets go of a superseded surf zone at once, without waiting for its spin-up', async () => {
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    const mode = new PhysicalMode(new Scene());
    const dispose = vi.fn();
    const neverReady = (config: SurfZoneConfig) => ({ config, ready: new Promise<void>(() => {}), dispose }) as unknown as SurfZoneHost;
    const stuck = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick, neverReady);
    const next = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' }, 1, water, quick);
    expect(await stuck).toBe(false);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(await next).toBe(true);
    const cancelled = mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' }, 1, water, quick, neverReady);
    mode.cancel();
    expect(await cancelled).toBe(false);
    expect(dispose).toHaveBeenCalledTimes(2);
    expect(mode.config?.spot).toBe('point');
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

  it('shows the rider against the crest in the readout', async () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' }, 2, water, quick);
    const status = mode.host!.snapshot.status;
    const wave = {
      valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 4.2, crestSpeed: 5.1, faceHeight: 1.2, faceFraction: 0.55, crestBreaking: 0,
      speedOverGround: 6, speedShoreward: 3, speedAlongCrest: 5, requiredSpeed: 7.2,
    };
    const ride = { phase: 'standing' as const, speed: 6, boardSpeed: 6.2, cue: false, popUp: { outcome: 'none' as const, duration: 0, landingPeak: 0, frontShare: 0 }, resets: 0, balance: 1, wave };
    const value = (rows: { label: string; value: string }[], label: string) => rows.find((row) => row.label === label)?.value;
    const rows = formatPhysicalReadout(mode.config!, { ...status, ride });
    expect(value(rows, 'CREST')).toBe('c 5.1 m/s · need 7.2 m/s');
    expect(value(rows, 'FACE')).toBe('4.2 m ahead · 55 % up');
    const closeOut = formatPhysicalReadout(mode.config!, { ...status, ride: { ...ride, wave: { ...wave, requiredSpeed: Infinity } } });
    expect(value(closeOut, 'CREST')).toBe('c 5.1 m/s · close-out');
    const behind = formatPhysicalReadout(mode.config!, { ...status, ride: { ...ride, wave: { ...wave, aheadOfCrest: -2 } } });
    expect(value(behind, 'FACE')).toBe('2.0 m behind the crest');
    const flat = formatPhysicalReadout(mode.config!, { ...status, ride: { ...ride, wave: { ...wave, valid: false } } });
    expect(value(flat, 'CREST')).toBe('no wave face here');
    expect(value(flat, 'FACE')).toBeUndefined();
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

  it('builds the GPU tier\'s richer sea only when a GPU answers and the water may use it', async () => {
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    const { componentCount: _count, ...coarse } = quick;
    const asked: string[] = [];
    const probe = (answer: boolean) => async () => {
      asked.push(String(answer));
      return answer;
    };
    const mode = new PhysicalMode(new Scene());
    await mode.start(DEFAULT_PHYSICAL_SETTINGS, 2, water, { ...coarse, spinUpPeriods: 0.2 }, undefined, probe(true));
    expect(mode.config!.componentCount).toBe(GPU_TIER_COMPONENTS);
    expect(mode.readout().find((row) => row.label === 'SOLVER')?.value).toContain(`${GPU_TIER_COMPONENTS} components`);
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, compute: 'cpu' }, 2, water, { ...coarse, spinUpPeriods: 0.2 }, undefined, probe(true));
    expect(mode.config!.componentCount).toBeUndefined();
    await mode.start(DEFAULT_PHYSICAL_SETTINGS, 2, water, { ...coarse, spinUpPeriods: 0.2 }, undefined, probe(false));
    expect(mode.config!.componentCount).toBeUndefined();
    expect(asked).toEqual(['true', 'false']);
    mode.stop();
  });

  it('runs practice on the same solver with only the incoming swell changed', async () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    const natural = { ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' as const, directionDegrees: -30 };
    await mode.start({ ...natural, source: 'practice' }, 2, water, quick);
    const practice = mode.config!;
    expect(practice).toMatchObject({
      spot: 'point', stage: 2, tide: natural.tide, windSpeed: natural.windSpeed,
      significantHeight: PRACTICE_SWELL.significantHeight, peakPeriod: PRACTICE_SWELL.peakPeriod,
      spreading: PRACTICE_SWELL.spreading, bandwidth: PRACTICE_SWELL.bandwidth, directionDegrees: PRACTICE_SWELL.directionDegrees,
    });
    const rows = mode.readout();
    expect(rows.find((row) => row.label === 'SWELL')?.value).toMatch(/practice/);
    mode.stop();
  });
});
