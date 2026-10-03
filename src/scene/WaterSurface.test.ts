import { DataTexture, ShaderLib } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { WaterSurface, sampleSurfaceBed } from './WaterSurface';
import { FlatSurfaceSource } from './FlatSurfaceSource';
import { PhysicalSurfaceSource } from './PhysicalSurfaceSource';
import { SurfZoneSimulation } from '../wave/SurfZoneSimulation';

describe('WaterSurface GPU displacement data', () => {
  it('keeps a 1 m barrel seam grid independent of coarse water textures and follows its world window', () => {
    const source = {
      grid: { xMin: -20, zMin: -60, spacing: 2, nx: 21, nz: 31 }, revision: {}, time: 0, bedRevision: 0,
      write: (into: Float32Array) => into.fill(0), writeBed: (into: Float32Array) => into.fill(-2),
    };
    const water = new WaterSurface(source);
    const uniforms = water.materialUniforms;
    const geometry = water.mesh.geometry;
    const surfaceData = water.surfaceData;
    const textures = ['waterSurface', 'waterBed', 'waterFlow', 'waterAeration']
      .map((name) => uniforms[name].value as DataTexture);
    const versions = textures.map((texture) => texture.version);
    const maskTexture = uniforms.waterBarrelMask.value as DataTexture;
    expect(water.barrelMaskGrid).toEqual({ xMin: -20, zMin: -60, spacing: 1, nx: 41, nz: 61 });
    expect(maskTexture.image.width).toBe(41);
    expect(maskTexture.image.height).toBe(61);
    const mask = new Uint8Array(41 * 61).fill(128);
    water.setBarrelMask(mask);
    expect(Array.from(maskTexture.image.data as Uint8Array)).toEqual(Array.from(mask));
    expect(water.barrelMaskActive).toBe(true);

    source.grid.xMin += 4;
    source.grid.zMin += 3;
    expect(water.barrelMaskGrid).toEqual({ xMin: -16, zMin: -57, spacing: 1, nx: 41, nz: 61 });
    expect(uniforms.waterBarrelMask.value).toBe(maskTexture);
    expect(water.barrelMaskActive).toBe(false);
    expect(uniforms.waterBarrelGrid.value).toMatchObject({ x: -16, y: -57, z: 1 });
    expect(water.mesh.geometry).toBe(geometry);
    expect(water.surfaceData).toBe(surfaceData);
    expect(textures.map((texture) => texture.version)).toEqual(versions);
    for (const [i, name] of ['waterSurface', 'waterBed', 'waterFlow', 'waterAeration'].entries()) {
      expect(uniforms[name].value).toBe(textures[i]);
    }
    water.dispose();
  });

  it('preserves the original mask grid at 1 m or finer and rounds up a coarse noninteger extent', () => {
    for (const spacing of [0.1, 0.5, 1, 1.5]) {
      const grid = { xMin: -2, zMin: 3, spacing, nx: 4, nz: 6 };
      const water = new WaterSurface({ grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} });
      expect(water.barrelMaskGrid).toEqual(spacing <= 1 ? grid
        : { xMin: -2, zMin: 3, spacing: 1, nx: 6, nz: 9 });
      water.dispose();
    }
  });

  it('keeps held snapshot textures and reloads same-time revisions, looks, windows and replacement sources', () => {
    let height = 1;
    const source = {
      grid: { xMin: 0, zMin: 0, spacing: 1, nx: 3, nz: 3 }, revision: {}, time: 0, bedRevision: 0, cubic: true,
      write: vi.fn((into: Float32Array) => into.fill(height)),
      writeBed: vi.fn((into: Float32Array) => into.fill(-2)),
      writeFlow: vi.fn((into: Float32Array) => into.fill(height)),
      writeAeration: vi.fn((into: Float32Array) => into.fill(0.1)),
      writeTubes: vi.fn(() => 0),
    };
    const water = new WaterSurface(source);
    water.setLook('rich');
    water.update();
    water.update(); // The original alternate-frame flow cadence catches up with the look change.
    const textures = ['waterSurface', 'waterFlow', 'waterAeration', 'waterTubeMap', 'waterTubeColumns']
      .map((name) => water.materialUniforms[name].value as DataTexture);
    const versions = textures.map((texture) => texture.version);
    const revision = water.surfaceRevision;
    source.write.mockClear();
    source.writeFlow.mockClear();
    source.writeAeration.mockClear();
    source.writeTubes.mockClear();
    for (let frame = 0; frame < 120; frame += 1) water.update();
    for (const write of [source.write, source.writeFlow, source.writeAeration, source.writeTubes]) expect(write).not.toHaveBeenCalled();
    expect(textures.map((texture) => texture.version)).toEqual(versions);
    expect(water.surfaceRevision).toBe(revision);

    // A restore or manual refresh may publish different data at exactly the same sea time.
    height = 2;
    source.revision = {};
    water.update();
    expect(source.write).toHaveBeenCalledTimes(1);
    expect(water.surfaceData[0]).toBe(2);
    water.setLook('classic');
    water.update();
    expect(source.write).toHaveBeenCalledTimes(2);
    source.grid.xMin = 3;
    source.bedRevision += 1;
    water.update();
    expect(source.write).toHaveBeenCalledTimes(3);
    expect(source.writeBed).toHaveBeenCalledTimes(2);
    expect(water.mesh.position.x).toBe(4);
    water.setSource({ ...source });
    water.update();
    expect(source.write).toHaveBeenCalledTimes(4);
    water.dispose();
  });

  it('preserves alternate-display-frame flow updates and reads unversioned mutable sources every time', () => {
    let current = 1;
    const source = {
      grid: { xMin: 0, zMin: 0, spacing: 1, nx: 3, nz: 3 }, revision: {}, time: 0, bedRevision: 0,
      write: vi.fn((into: Float32Array) => into.fill(0)), writeBed: (into: Float32Array) => into.fill(-2),
      writeFlow: vi.fn((into: Float32Array) => into.fill(current)),
    };
    const water = new WaterSurface(source);
    current = 2;
    source.revision = {};
    water.update();
    expect(water.flowData[0]).toBe(1);
    expect(source.writeFlow).toHaveBeenCalledTimes(1);
    water.update();
    expect(water.flowData[0]).toBe(2);
    expect(source.writeFlow).toHaveBeenCalledTimes(2);
    for (let frame = 0; frame < 120; frame += 1) water.update();
    expect(source.writeFlow).toHaveBeenCalledTimes(2);
    water.setSource({ ...source, revision: undefined });
    source.write.mockClear();
    for (let frame = 0; frame < 120; frame += 1) water.update();
    expect(source.write).toHaveBeenCalledTimes(120);
    water.dispose();
  });

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
