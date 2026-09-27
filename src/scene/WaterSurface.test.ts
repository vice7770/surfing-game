import { ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { WaterSurface, sampleSurfaceBed } from './WaterSurface';
import { FlatSurfaceSource } from './FlatSurfaceSource';
import { PhysicalSurfaceSource } from './PhysicalSurfaceSource';
import { SurfZoneSimulation } from '../wave/SurfZoneSimulation';

describe('WaterSurface GPU displacement data', () => {
  it('uploads the physical bed under every node, 5 cm above the tucked-in dry surface, and follows the window', () => {
    const surface = new WaterSurface(new FlatSurfaceSource());
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
    const surface = new WaterSurface(new FlatSurfaceSource());
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
    const surface = new WaterSurface(new FlatSurfaceSource());
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

  it('uploads the physical current for the foam pattern and keeps a still sea at rest', () => {
    const surface = new WaterSurface(new FlatSurfaceSource());
    expect(surface.flowData.every((value) => value === 0)).toBe(true);
    // A source with no current keeps the soft tint.
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
