import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_WAVE_SETTINGS, InteractiveWaterField, type WaveSettings } from '../wave/WaveModel';
import { WaterSurface, sampleSurfaceBed, sampleSurfaceHeight, sampleSurfaceNormal } from './WaterSurface';
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
  }, 60_000);

  it('uploads the legacy bed and follows it when the grid scrolls', () => {
    const wave = new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 0.4, sustained: true });
    const surface = new WaterSurface(new LegacySurfaceSource(wave));
    const check = () => {
      for (let iz = 0; iz < wave.nz; iz += 9) {
        for (let ix = 0; ix < wave.nx; ix += 5) {
          const x = wave.xMin + ix * wave.spacing;
          const z = wave.zMin + iz * wave.spacing;
          expect(surface.bedData[iz * wave.nx + ix]).toBeCloseTo(-wave.depthAt(x, z), 6);
          expect(sampleSurfaceBed(surface.bedData, surface.grid, x + 0.3, z + 0.4)).toBeCloseTo(-wave.depthAt(x + 0.3, z + 0.4), 2);
        }
      }
    };
    check();
    const zMin = wave.zMin;
    for (let frame = 0; frame < 900 && wave.zMin === zMin; frame += 1) {
      wave.step(1 / 60);
      surface.update();
    }
    expect(wave.zMin).not.toBe(zMin);
    check();
  });

  it('uploads the physical bed under every node, 5 cm above the tucked-in dry surface, and follows the window', () => {
    const wave = new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS });
    const surface = new WaterSurface(new LegacySurfaceSource(wave));
    const simulation = new SurfZoneSimulation({
      spot: 'reef', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 0, spreading: 12, tide: 0,
      componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
    });
    surface.setSource(new PhysicalSurfaceSource(simulation, 2));
    surface.update();
    const check = () => {
      let dry = 0;
      let wet = 0;
      for (let k = 0; k < surface.bedData.length; k += 1) {
        const depth = surface.surfaceData[k * 2] - surface.bedData[k];
        if (depth < 0) {
          expect(depth).toBeCloseTo(-0.05, 5);
          dry += 1;
        } else {
          expect(depth).toBeGreaterThan(0.009);
          wet += 1;
        }
      }
      expect(dry).toBeGreaterThan(0);
      expect(wet).toBeGreaterThan(0);
    };
    check();
    const x = surface.grid.xMin + 4;
    expect(sampleSurfaceBed(surface.bedData, surface.grid, x, -200)).toBeCloseTo(simulation.bedAt(x, -200), 1);
    simulation.solver.shiftAlongShore(3);
    surface.update();
    check();
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

  it('patches every shader chunk it replaces and shades with water optics', () => {
    const surface = new WaterSurface(new LegacySurfaceSource(new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS })));
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    surface.mesh.material.onBeforeCompile(shader as never, undefined as never);
    for (const chunk of ['beginnormal_vertex', 'begin_vertex']) expect(shader.vertexShader).not.toContain(`#include <${chunk}>`);
    expect(shader.fragmentShader).not.toContain('#include <color_fragment>');
    expect(shader.fragmentShader).toContain('waterChopSlope( vWaterWorld.xz');
    expect(shader.vertexShader).toContain('vWaterDepth = max( 0.0, waterHeight - waterBedAt( waterXZ ) )');
    // The bed seen through the water is lit by the caustic map where the refracted view ray meets it.
    expect(shader.fragmentShader).toContain('waterBodyReflectanceLit( vWaterDepth');
    expect(shader.fragmentShader).toContain('causticLightAt( waterBedXZ )');
    expect(shader.fragmentShader).toContain('waterCrestThickness( vWaterWorld');
    expect(shader.vertexShader).toContain('vWaterFlow = waterFlowAt( waterXZ )');
    expect(shader.fragmentShader).toContain('waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, ');
    expect(Object.keys(shader.uniforms)).toEqual(expect.arrayContaining(['waterFlow', 'waterFoamTile', 'waterFoamPattern']));
    expect(shader.fragmentShader).toContain('mix( vWaterFoam, waterFoamCover(');
    expect(Object.keys(shader.uniforms)).toEqual(expect.arrayContaining(['waterBed', 'waterAttenuation', 'waterSunDirection', 'waterSunRadiance']));
    expect(surface.mesh.material.ior).toBeCloseTo(1.333, 6);
    expect(surface.mesh.material.clearcoat).toBe(0);
  });

  it('uploads the physical current for the foam pattern and keeps the legacy one still', () => {
    const wave = new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS });
    const surface = new WaterSurface(new LegacySurfaceSource(wave));
    expect(surface.flowData.every((value) => value === 0)).toBe(true);
    // The legacy foam is a tint strength, not a covered fraction, so it keeps the soft tint.
    expect(surface.foamPattern).toBe(0);
    const simulation = new SurfZoneSimulation({
      spot: 'beach', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 10, spreading: 12, tide: 0,
      componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
    });
    const source = new PhysicalSurfaceSource(simulation, 2);
    surface.setSource(source);
    for (let frame = 0; frame < 20; frame += 1) simulation.step(1 / 30);
    surface.update();
    const expected = new Float32Array(surface.flowData.length);
    simulation.writeUniformFlow(expected, source.grid);
    expect(Array.from(surface.flowData)).toEqual(Array.from(expected));
    expect(surface.foamPattern).toBe(1);
    expect(surface.flowData.some((value) => Math.abs(value) > 0.05)).toBe(true);
    // The Simple foam setting keeps the soft tint even on water with a current.
    surface.setFoamDetail(false);
    expect(surface.foamPattern).toBe(0);
    surface.update();
    expect(surface.foamPattern).toBe(0);
    surface.setFoamDetail(true);
    expect(surface.foamPattern).toBe(1);
  });
});
