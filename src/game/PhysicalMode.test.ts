import { describe, expect, it } from 'vitest';
import { Scene } from 'three';
import { WaterSurface } from '../scene/WaterSurface';
import { LegacySurfaceSource } from '../scene/LegacySurfaceSource';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from '../wave/WaveModel';
import { stormSwell } from '../wave/StormSwell';
import { DEFAULT_PHYSICAL_SETTINGS, PhysicalMode, chopForWind, formatPhysicalReadout, spreadingFor, swellFor } from './PhysicalMode';

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

  it('shows the physical sea on the shared water surface and frames its break', () => {
    const scene = new Scene();
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    const mode = new PhysicalMode(scene);
    mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' }, 5, water, quick);
    water.update();
    expect(water.grid.nz).toBe(mode.simulation.renderGrid(1).nz);
    expect(mode.seabed.mesh.visible).toBe(true);
    expect(scene.children).toContain(mode.seabed.mesh);
    expect(scene.children).toContain(mode.farField.mesh);
    expect(mode.farField.mesh.visible).toBe(true);
    expect(mode.farField.textureSize.width).toBe(mode.simulation.sea.components.length + 1);
    expect(mode.focus).toEqual(mode.simulation.breakPoint());
    mode.step(1 / 60);
    mode.update(1 / 60);
    expect(mode.camera.camera.position.y).toBeGreaterThan(10);
    expect(mode.farField.temporalPhases[0]).toBeCloseTo((mode.simulation.sea.components[0].omega * mode.simulation.seaTime) % (2 * Math.PI), 4);
    mode.setVisible(false);
    expect(mode.seabed.mesh.visible).toBe(false);
    expect(mode.farField.mesh.visible).toBe(false);
  });

  it('describes the running sea, solver cost and next set in the Wave Lab readout', () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'canyon', significantHeight: 1.8, peakPeriod: 12 }, 2, water, quick);
    const rows = formatPhysicalReadout(mode.simulation);
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
  });

  it('builds the sea from a storm and reports it', () => {
    const mode = new PhysicalMode(new Scene());
    const water = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS })));
    mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'storm', stormWindSpeed: 18, stormFetchKm: 600, stormDurationHours: 36, stormDistanceKm: 4000 }, 2, water, quick);
    const storm = stormSwell({ windSpeed: 18, fetchKm: 600, durationHours: 36, distanceKm: 4000 });
    expect(mode.storm).toEqual(storm);
    expect(mode.simulation.config.significantHeight).toBeCloseTo(storm.significantHeight, 12);
    expect(mode.simulation.config.bandwidth).toBe(storm.bandwidth);
    const rows = formatPhysicalReadout(mode.simulation, mode.storm);
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('SWELL')).toMatch(/^Hs 1\.4 m · Tp 13\.5 s · 10°$/);
    expect(value('STORM')).toBe('Hs 7.1 m · Tp 13.5 s · fetch-limited · arrives after 4.4 days');
    expect(value('SPREAD')).toBe('s 75 · band ±14 %');
  });
});
