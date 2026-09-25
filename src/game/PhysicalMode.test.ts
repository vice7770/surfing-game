import { describe, expect, it } from 'vitest';
import { Scene } from 'three';
import { WaterSurface } from '../scene/WaterSurface';
import { LegacySurfaceSource } from '../scene/LegacySurfaceSource';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField } from '../wave/WaveModel';
import { DEFAULT_PHYSICAL_SETTINGS, PhysicalMode, formatPhysicalReadout, spreadingFor } from './PhysicalMode';

const quick = { alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 8 };

describe('PhysicalMode', () => {
  it('maps the spread slider from groundswell to windswell spreading', () => {
    expect(spreadingFor(0)).toBeCloseTo(24, 12);
    expect(spreadingFor(1)).toBeCloseTo(4, 12);
    expect(spreadingFor(0.5)).toBeCloseTo(Math.sqrt(24 * 4), 9);
    expect(spreadingFor(3)).toBeCloseTo(4, 12);
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
  });
});
