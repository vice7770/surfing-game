import { describe, expect, it } from 'vitest';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField, type WaveSettings } from '../wave/WaveModel';
import { WaterSurface, sampleSurfaceHeight, sampleSurfaceNormal } from './WaterSurface';
import { LegacySurfaceSource } from './LegacySurfaceSource';
import { PhysicalSurfaceSource } from './PhysicalSurfaceSource';
import { SurfZoneSimulation } from '../wave/SurfZoneSimulation';

function advancedSurface(settings: Partial<WaveSettings> = {}, steps = 240) {
  const wave = new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 0.4, ...settings });
  const surface = new WaterSurface(new LegacySurfaceSource(wave));
  for (let i = 0; i < steps; i += 1) {
    wave.step(1 / 60);
    surface.update();
  }
  return { wave, surface };
}

function forEachProbe(wave: InteractiveWaterField, visit: (x: number, z: number) => void): void {
  // Spans the whole grid, its last row/column, and points outside it.
  for (let z = wave.zMin - 1.3; z < wave.zMin + 81.5; z += 0.53) {
    for (let x = wave.xMin - 1.1; x < -wave.xMin + 1.2; x += 0.37) visit(x, z);
  }
}

/** The pre-G1 per-vertex foam rule, kept as the oracle for moving it onto grid nodes. */
class LegacyFoam {
  readonly memory: Float32Array;
  private lastTime = 0;
  private lastZMin: number;

  constructor(private readonly wave: InteractiveWaterField) {
    this.memory = new Float32Array(wave.nx * wave.nz);
    this.lastZMin = wave.zMin;
  }

  update(): void {
    const wave = this.wave;
    if (wave.zMin !== this.lastZMin) {
      const cells = Math.round((wave.zMin - this.lastZMin) / wave.spacing) * wave.nx;
      this.memory.copyWithin(0, cells);
      this.memory.fill(0, this.memory.length - cells);
      this.lastZMin = wave.zMin;
    }
    const crestZ = wave.crestZ();
    const decay = Math.exp(-Math.max(0, wave.time - this.lastTime) / 2.2);
    this.lastTime = wave.time;
    for (let iz = 0; iz < wave.nz; iz += 1) {
      for (let ix = 0; ix < wave.nx; ix += 1) {
        const i = iz * wave.nx + ix;
        const x = wave.xMin + ix * wave.spacing;
        const z = wave.zMin + iz * wave.spacing;
        const slope = wave.slopeMagnitude(x, z);
        const crestDistance = (z - wave.crestZAt(x, crestZ)) / 1.15;
        const active = Math.max(
          Math.max(0, Math.min(0.12, (slope - 0.12) * 0.5)),
          wave.breakingAt(x, z, slope, crestZ) * Math.exp(-0.5 * crestDistance * crestDistance) * 0.88,
        );
        this.memory[i] = Math.max(active, this.memory[i] * decay);
      }
    }
  }

  foamAt(i: number): number {
    const wave = this.wave;
    const ix = i % wave.nx;
    const iz = Math.floor(i / wave.nx);
    const x = wave.xMin + ix * wave.spacing;
    const z = wave.zMin + iz * wave.spacing;
    const slope = wave.slopeMagnitude(x, z);
    const crestDistance = (z - wave.crestZAt(x)) / 1.15;
    const active = Math.max(
      Math.max(0, Math.min(0.12, (slope - 0.12) * 0.5)),
      wave.breakingAt(x, z, slope) * Math.exp(-0.5 * crestDistance * crestDistance) * 0.88,
    );
    return Math.max(active, this.memory[i] * 0.65);
  }
}

describe('WaterSurface GPU displacement data', () => {
  it('reproduces the height the board samples at any point', () => {
    const { wave, surface } = advancedSurface();
    let probes = 0;
    forEachProbe(wave, (x, z) => {
      expect(sampleSurfaceHeight(surface.surfaceData, surface.grid, x, z)).toBe(wave.heightAt(x, z));
      probes += 1;
    });
    expect(probes).toBeGreaterThan(20000);
  });

  it('shades with the surface normal the board samples', () => {
    const { wave, surface } = advancedSurface();
    forEachProbe(wave, (x, z) => {
      const rendered = sampleSurfaceNormal(surface.surfaceData, surface.grid, x, z);
      const physical = wave.sample(x, z).normal;
      expect(rendered.x).toBeCloseTo(physical.x, 12);
      expect(rendered.y).toBeCloseTo(physical.y, 12);
      expect(rendered.z).toBeCloseTo(physical.z, 12);
    });
  });

  it('keeps height agreement after the sustained grid scrolls', () => {
    const { wave, surface } = advancedSurface({ sustained: true }, 900);
    expect(wave.zMin).toBeGreaterThan(-32);
    forEachProbe(wave, (x, z) => {
      expect(sampleSurfaceHeight(surface.surfaceData, surface.grid, x, z)).toBe(wave.heightAt(x, z));
    });
  });

  it('keeps the previous foam memory on every grid node while the grid scrolls', () => {
    const wave = new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 0.4, sustained: true });
    const surface = new WaterSurface(new LegacySurfaceSource(wave));
    const oracle = new LegacyFoam(wave);
    oracle.update();
    let foamyNodes = 0;
    for (let frame = 0; frame < 900; frame += 1) {
      wave.step(1 / 60);
      surface.update();
      oracle.update();
      if (frame % 150 !== 149) continue;
      for (let i = 0; i < wave.nx * wave.nz; i += 1) {
        const expected = oracle.foamAt(i);
        expect(surface.surfaceData[i * 2 + 1]).toBeCloseTo(expected, 6);
        if (expected > 0.2) foamyNodes += 1;
      }
    }
    expect(wave.zMin).toBeGreaterThan(-32);
    expect(foamyNodes).toBeGreaterThan(0);
  });

  it('rebuilds its mesh and texture for a differently sized physical source', () => {
    const wave = new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS });
    const surface = new WaterSurface(new LegacySurfaceSource(wave));
    const simulation = new SurfZoneSimulation({
      spot: 'beach', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 0, spreading: 12, tide: 0,
      componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
    });
    surface.setSource(new PhysicalSurfaceSource(simulation, 2));
    surface.update();
    expect(surface.grid.nx).toBe(21);
    expect(surface.surfaceData.length).toBe(surface.grid.nx * surface.grid.nz * 2);
    expect(surface.mesh.geometry.getAttribute('position').count).toBe(surface.grid.nx * surface.grid.nz);
    expect(surface.mesh.position.x).toBeCloseTo(surface.grid.xMin + 20, 9);
    simulation.solver.shiftAlongShore(3);
    surface.update();
    expect(surface.grid.xMin).toBeCloseTo(-20 + 6, 9);
  });
});
