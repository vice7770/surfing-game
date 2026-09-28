import { describe, expect, it, vi } from 'vitest';
import { Quaternion, Scene, Vector3 } from 'three';
import { WaterSurface } from '../scene/WaterSurface';
import { FlatSurfaceSource } from '../scene/FlatSurfaceSource';
import { SPOT_OPTICS } from '../scene/waterOptics';
import { stormSwell } from '../wave/StormSwell';
import { DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, PRACTICE_SWELL, PhysicalMode, REEF_PRACTICE_SWELL, TANK_SWELL_LIMITS, chopForWind, formatPhysicalReadout, spreadingFor, swellFor, swellHeightLimit } from './PhysicalMode';
import { LocalSurfZone, type SurfZoneHost } from './SurfZoneHost';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';

const quick = { alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 8 };

describe('PhysicalMode', () => {
  it('lets buoys and storms reach 4 m, and the Canyon 3 m as before (wave sizes)', () => {
    expect(TANK_SWELL_LIMITS.height.max).toBe(4);
    expect(swellHeightLimit('point')).toBe(4);
    // The Reef's 30 m edge (the Teahupo'o Reef) carries the 4 m cap.
    expect(swellHeightLimit('reef')).toBe(4);
    expect(swellHeightLimit('canyon')).toBe(3);
    const storm = { ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm' as const, stormWindSpeed: 30, stormFetchKm: 2000, stormDurationHours: 96, stormDistanceKm: 0 };
    expect(swellFor({ ...storm, spot: 'point' }).significantHeight).toBe(4);
    expect(swellFor({ ...storm, spot: 'canyon' }).significantHeight).toBe(3);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy', spot: 'canyon', significantHeight: 3.8 }).significantHeight).toBe(3);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy', spot: 'point', significantHeight: 3.8 }).significantHeight).toBe(3.8);
  });

  it('gives Practice\'s groundswell at the tank\'s edge and a buoy\'s in deep water (wave sizes)', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    const configs: SurfZoneConfig[] = [];
    const capture = (config: SurfZoneConfig) => {
      configs.push(config);
      return { config, ready: new Promise<void>(() => {}), dispose: () => {} } as unknown as SurfZoneHost;
    };
    void mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' }, 1, water, quick, capture);
    void mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'buoy' }, 1, water, quick, capture);
    await Promise.resolve();
    mode.cancel();
    expect(configs[0].heightAt).toBe('edge');
    expect(configs[1].heightAt ?? 'deep').toBe('deep');
  });

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
    expect(near.storm!.significantHeight).toBeGreaterThan(4);
    expect(near.significantHeight).toBe(4);
    expect(near.peakPeriod).toBe(18);
  });

  it('practises on a steady groundswell whatever the buoy and storm say', () => {
    const practice = swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice', significantHeight: 0.5, peakPeriod: 7, spread: 1 });
    expect(practice).toEqual(PRACTICE_SWELL);
    expect(practice.bandwidth).toBeLessThan(0.1);
    expect(practice.spreading).toBeGreaterThan(spreadingFor(0));
    expect(practice.directionDegrees).toBeDefined();
  });

  it('practises the Reef on its own groundswell and every other spot on the shared one', () => {
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef', source: 'practice' })).toEqual(REEF_PRACTICE_SWELL);
    expect(swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'canyon', source: 'practice' })).toEqual(PRACTICE_SWELL);
    expect(REEF_PRACTICE_SWELL.bandwidth).toBeLessThan(0.1);
    expect(REEF_PRACTICE_SWELL.directionDegrees).toBe(20);
  });

  it('roughens the chop more under onshore than offshore wind', () => {
    expect(chopForWind(12)).toBeGreaterThan(chopForWind(-12));
    expect(chopForWind(-12)).toBeGreaterThan(chopForWind(0));
    expect(chopForWind(0)).toBeGreaterThan(0);
  });

  it('builds the Reef on stage 2 even when the water tier or a dev asks for stage 1', async () => {
    const scene = new Scene();
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(scene);
    const built: SurfZoneConfig[] = [];
    const gpuTier = vi.fn(async () => false);
    const factory = (config: SurfZoneConfig): SurfZoneHost => {
      built.push(config);
      return new LocalSurfZone(config);
    };
    // The Fast tier's water: stage 1 on the CPU.
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef', stage: 1, compute: 'cpu' }, 5, water, quick, factory, gpuTier)).toBe(true);
    expect(built[0].stage).toBe(2);
    expect(built[0].compute).toBe('auto');
    expect(gpuTier).toHaveBeenCalled();
    mode.stop();
  }, 60_000);

  it('shows the physical sea on the shared water surface and frames its break', async () => {
    const scene = new Scene();
    const water = new WaterSurface(new FlatSurfaceSource());
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
    // A crest standing above the still level: a jet is made of that water.
    const { solver } = simulation;
    for (const index of [crest - solver.nx, crest, crest + solver.nx]) solver.h[index] = solver.restLevel - solver.bed[index] + 1;
    simulation.lip.launch(crest, { x: 0, z: 5 }, solver.surfaceAt(crest) + 3, 0.5);
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
    // To the last bits: drawing goes through a normalisation that can round the orientation by an ulp.
    mode.board.quaternion.toArray().forEach((value, n) => expect(value).toBeCloseTo(board.orientation.toArray()[n], 12));
    // The rider lies prone on the board, drawn from the snapshot, and the ride camera follows.
    expect(scene.children).toContain(mode.surfer.group);
    expect(mode.surfer.group.visible).toBe(true);
    // Facing the rider from the beach the screen's right is the board's left; from behind, its right.
    mode.camera.camera.updateMatrixWorld();
    expect(mode.screenSteer(1)).toBe(1);
    expect(mode.screenSteer(0)).toBe(0);
    mode.camera.setView('behind');
    mode.update(1 / 60);
    mode.camera.camera.updateMatrixWorld();
    expect(mode.screenSteer(1)).toBe(-1);
    // Held, a key keeps the way it steered when pressed, even once the board has turned past side-on to the
    // camera: re-read each frame, a hard turn flipped the mapping mid-turn and the key turned the board back.
    const facing = mode.board.quaternion.clone();
    mode.board.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
    expect(mode.screenSteer(1)).toBe(-1);
    expect(mode.screenSteer(0.4)).toBe(-0.4);
    // A new press, or the other key, reads the board as it now faces.
    expect(mode.screenSteer(0)).toBe(0);
    expect(mode.screenSteer(1)).toBe(1);
    expect(mode.screenSteer(-1)).toBe(-1);
    mode.board.quaternion.copy(facing);
    mode.screenSteer(0);
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

  it('gives the sea it starts the water look for its spray, and the running sea every change (G9: Classic keeps its spray)', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    mode.setSprayLook('classic');
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick, (config) => new LocalSurfZone(config, {}))).toBe(true);
    const host = mode.host as LocalSurfZone;
    expect(host.runner.spray.look).toBe('classic');
    mode.setSprayLook('rich');
    expect(host.runner.spray.look).toBe('rich');
  });

  it('frames a riderless sea from its idle view, and a ride from the default view', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
    const mode = new PhysicalMode(new Scene());
    mode.idleView = 'cinematic';
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick, (config) => new LocalSurfZone(config, {}))).toBe(true);
    expect(mode.homeView).toBe('cinematic');
    expect(mode.camera.view).toBe('cinematic');
    mode.defaultView = 'side';
    expect(await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'beach' }, 1, water, quick)).toBe(true);
    expect(mode.homeView).toBe('side');
  });

  it('rides as the chosen surfer: the body loaded once, dressed, and the board in its design', () => {
    const mode = new PhysicalMode(new Scene());
    const load = vi.spyOn(mode.surfer, 'load').mockResolvedValue();
    const dress = vi.spyOn(mode.surfer, 'dress');
    mode.setSurfer({ body: 'surfer3', outfit: 'vest', color: 'coral', board: 'midnight' });
    expect(load).toHaveBeenCalledWith('surfer3');
    expect(dress).toHaveBeenLastCalledWith('vestShorts', { accent: expect.objectContaining({ r: expect.any(Number) }) });
    const colours = () => {
      const found: string[] = [];
      mode.board.traverse((object) => {
        type Coloured = { color?: { getHexString(): string } };
        const materials = ([] as Coloured[]).concat((object as unknown as { material?: Coloured | Coloured[] }).material ?? []);
        for (const material of materials) if (material.color) found.push(`#${material.color.getHexString()}`);
      });
      return found;
    };
    expect(colours()).toContain('#2c3a50');
    mode.setSurfer({ body: 'surfer3', outfit: 'fullsuit', color: 'teal', board: 'classic' });
    expect(load).toHaveBeenCalledTimes(1);
    expect(colours()).not.toContain('#2c3a50');
  });

  it('lets go of a superseded surf zone at once, without waiting for its spin-up', async () => {
    const water = new WaterSurface(new FlatSurfaceSource());
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
    const water = new WaterSurface(new FlatSurfaceSource());
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
    const water = new WaterSurface(new FlatSurfaceSource());
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
    const water = new WaterSurface(new FlatSurfaceSource());
    await mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'point' }, 2, water, quick);
    const status = mode.host!.snapshot.status;
    const wave = {
      valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 4.2, crestSpeed: 5.1, faceHeight: 1.2, faceFraction: 0.55, crestBreaking: 0,
      curlDistance: Infinity, curlSide: 0, speedOverGround: 6, speedShoreward: 3, speedAlongCrest: 5, requiredSpeed: 7.2,
    };
    const ride = { phase: 'standing' as const, speed: 6, boardSpeed: 6.2, cue: false, popUp: { outcome: 'none' as const, duration: 0, landingPeak: 0, frontShare: 0 }, resets: 0, balance: 1, wave,
      leash: { snapped: false, tension: 0, distance: 0, reeling: false }, duck: 0, boardInReach: false, knock: 0, breath: 1, rescues: 0 };
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
    const water = new WaterSurface(new FlatSurfaceSource());
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
    const water = new WaterSurface(new FlatSurfaceSource());
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
    const water = new WaterSurface(new FlatSurfaceSource());
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
