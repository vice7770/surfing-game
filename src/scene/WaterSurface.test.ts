import { DataTexture, ShaderLib } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { WaterSurface, sampleSurfaceBed } from './WaterSurface';
import { FlatSurfaceSource } from './FlatSurfaceSource';
import { PhysicalSurfaceSource } from './PhysicalSurfaceSource';
import { SurfZoneSimulation } from '../wave/SurfZoneSimulation';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE } from '../wave/SpillingRoller';
import type { SurfaceSource } from './WaterSurface';

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
    const source = new PhysicalSurfaceSource(simulation, 2);
    surface.setSource(source);
    surface.update();
    const check = () => {
      // The surf zone's own heights; the drawn ones differ only on the waterline's two rings (shoreline.ts).
      const raw = new Float32Array(surface.surfaceData.length);
      source.write(raw);
      const { nx, nz } = surface.grid;
      const nearWater = (k: number) => {
        const c = k % nx;
        const r = (k - c) / nx;
        for (let dr = -2; dr <= 2; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            const j = (r + dr) * nx + c + dc;
            if (r + dr >= 0 && r + dr < nz && c + dc >= 0 && c + dc < nx && raw[2 * j] > surface.bedData[j]) return true;
          }
        }
        return false;
      };
      let dry = 0;
      let wet = 0;
      let rings = 0;
      for (let k = 0; k < surface.bedData.length; k += 1) {
        const depth = raw[k * 2] - surface.bedData[k];
        const drawn = surface.surfaceData[k * 2] - surface.bedData[k];
        if (depth < 0) {
          expect(depth).toBeCloseTo(-0.05, 5);
          dry += 1;
          if (drawn !== depth) {
            expect(nearWater(k)).toBe(true);
            expect(drawn).toBeLessThanOrEqual(0.01 + 1e-6);
            rings += 1;
          }
        } else {
          expect(depth).toBeGreaterThan(0.009);
          expect(drawn).toBe(depth);
          wet += 1;
        }
      }
      expect(dry).toBeGreaterThan(0);
      expect(wet).toBeGreaterThan(0);
      expect(rings).toBeGreaterThan(0);
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

function fallbackCompiled(material: import('three').MeshPhysicalMaterial) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
  material.onBeforeCompile(shader as unknown as import('three').WebGLProgramParametersWithUniforms, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader, uniforms: shader.uniforms };
}

function fallbackSource(cubic = true) {
  return { grid: { xMin: -2, zMin: -4, spacing: 2, nx: 5, nz: 6 }, time: 0, bedRevision: 0, cubic,
    write: (out: Float32Array) => out.fill(0), writeBed: (out: Float32Array) => out.fill(-2) };
}

describe('late barrel water fallback', () => {
  it('retains the original Classic/Rich normal shaders and depth; repairs only their rejected mask fragments', async () => {
    const { WATER_BARREL_DISCARD, WATER_BARREL_FALLBACK_DISCARD } = await import('./barrel/barrelMaskGlsl');
    const water = new WaterSurface(fallbackSource());
    water.setBarrelEnabled(true);
    const originals = new Map<string, ReturnType<typeof fallbackCompiled>>();
    for (const look of ['classic', 'rich'] as const) {
      water.setLook(look);
      originals.set(look, fallbackCompiled(water.mesh.material));
    }
    const key = water.mesh.material.customProgramCacheKey();
    water.setBarrelScreenFallback(true);
    water.setBarrelMask(new Uint8Array(water.barrelMaskGrid.nx * water.barrelMaskGrid.nz).fill(255));
    const repair = water.barrelFallback!;
    expect(repair.renderOrder).toBeGreaterThan(water.mesh.renderOrder);
    expect(water.mesh.material.customProgramCacheKey()).toBe(key);
    for (const look of ['classic', 'rich'] as const) {
      water.setLook(look);
      const normal = fallbackCompiled(water.mesh.material), late = fallbackCompiled(repair.material);
      expect(normal.vertex).toBe(originals.get(look)!.vertex);
      expect(normal.fragment).toBe(originals.get(look)!.fragment);
      expect(late.vertex).toBe(normal.vertex);
      expect(late.fragment.replace(WATER_BARREL_FALLBACK_DISCARD, WATER_BARREL_DISCARD)).toBe(normal.fragment);
      expect(late.uniforms).toEqual(normal.uniforms);
      for (const property of ['side', 'colorWrite', 'depthTest', 'depthWrite', 'depthFunc', 'polygonOffset', 'transparent', 'blending'] as const) {
        expect(repair.material[property]).toBe(water.mesh.material[property]);
      }
      // The Rich dense patch is also repaired, with its ORIGINAL patch/skirt and wet/dry clipping intact.
      expect(water.barrelPatchFallback!.visible).toBe(look === 'rich');
    }
    water.setBarrelScreenFallback(false);
    expect(water.mesh.material.stencilWrite).toBe(false);
    expect(repair.visible).toBe(false);
    water.dispose();
  });

  it('does not allocate repair objects or consume random calls for unsupported, inactive or unswept use', () => {
    // Warm the shared procedural textures before observing inactive lifecycle calls.
    const warm = new WaterSurface(fallbackSource()); warm.dispose();
    const random = vi.spyOn(Math, 'random');
    const water = new WaterSurface(fallbackSource());
    const constructedCalls = random.mock.calls.length;
    expect(water.barrelFallback).toBeUndefined();
    expect(water.barrelPatchFallback).toBeUndefined();
    water.setBarrelScreenFallback(true); // ordinary spot
    water.setBarrelMask(null);
    water.setBarrelEnabled(true); // no active mask
    water.update();
    expect(random.mock.calls.length).toBe(constructedCalls);
    expect(water.barrelFallback).toBeUndefined();
    water.setBarrelScreenFallback(false); // unsupported legacy renderer, even with an active mask
    const mask = new Uint8Array(water.barrelMaskGrid.nx * water.barrelMaskGrid.nz).fill(128);
    water.setBarrelMask(mask);
    expect(random.mock.calls.length).toBe(constructedCalls);
    expect(water.mesh.material.stencilWrite).toBe(false);
    water.setBarrelScreenFallback(true);
    const first = water.barrelFallback;
    expect(first).toBeDefined();
    const activeCalls = random.mock.calls.length;
    expect(activeCalls).toBeGreaterThan(constructedCalls);
    water.setBarrelMask(mask);
    water.setBarrelMask(null);
    water.setBarrelMask(mask);
    water.update();
    expect(water.barrelFallback).toBe(first);
    expect(random.mock.calls.length).toBe(activeCalls);
    random.mockRestore();
    water.dispose();
  });

  it('keeps original fragment/depth success marking and never marks on depth failure or changes normal order', async () => {
    const { AlwaysStencilFunc, EqualStencilFunc, KeepStencilOp, ReplaceStencilOp } = await import('three');
    const water = new WaterSurface(fallbackSource());
    const normalOrder = water.mesh.renderOrder, patchOrder = water.patch.renderOrder;
    water.setBarrelScreenFallback(true);
    water.setBarrelEnabled(true);
    water.setBarrelMask(new Uint8Array(water.barrelMaskGrid.nx * water.barrelMaskGrid.nz).fill(255));
    expect(water.mesh.renderOrder).toBe(normalOrder);
    expect(water.patch.renderOrder).toBe(patchOrder);
    expect(water.mesh.material).toMatchObject({ stencilWrite: true, stencilRef: 1, stencilFunc: AlwaysStencilFunc,
      stencilWriteMask: 1, stencilFail: KeepStencilOp, stencilZFail: KeepStencilOp, stencilZPass: ReplaceStencilOp,
      colorWrite: true, depthWrite: true });
    expect(water.barrelFallback!.material).toMatchObject({ stencilWrite: true, stencilRef: 0, stencilFunc: EqualStencilFunc,
      stencilFuncMask: 1, stencilWriteMask: 0, stencilFail: KeepStencilOp, stencilZFail: KeepStencilOp, stencilZPass: KeepStencilOp,
      colorWrite: true, depthWrite: true });
    water.setBarrelMask(null);
    expect(water.mesh.material.stencilWrite).toBe(false);
    expect(water.barrelFallback!.visible).toBe(false);
    water.dispose();
  });

  it('shares original coarse/patch transforms and follows mask, geometry, look and mutable sky lighting', async () => {
    const { Texture } = await import('three');
    const source = fallbackSource();
    const water = new WaterSurface(source);
    water.setLook('rich');
    water.setBarrelEnabled(true);
    water.setBarrelScreenFallback(true);
    water.setBarrelMask(new Uint8Array(water.barrelMaskGrid.nx * water.barrelMaskGrid.nz).fill(255));
    const coarse = water.barrelFallback!, patch = water.barrelPatchFallback!;
    expect(coarse.parent).toBe(water.mesh);
    expect(patch.parent).toBe(water.patch);
    expect(coarse.geometry).not.toBe(water.mesh.geometry);
    expect(coarse.geometry.attributes).toBe(water.mesh.geometry.attributes);
    expect(coarse.geometry.index).toBe(water.mesh.geometry.index);
    expect(coarse.geometry.drawRange).toEqual(water.mesh.geometry.drawRange);
    expect(patch.geometry).toBe(water.patch.geometry);
    expect(patch.material).toBe(coarse.material);
    water.mesh.position.set(2, 3, 4); water.mesh.rotation.set(.2, .3, .4);
    water.patch.position.set(7, 0, 9); water.patch.scale.set(2, 1, 3);
    water.mesh.updateMatrixWorld(true);
    expect(coarse.matrixWorld.toArray()).toEqual(water.mesh.matrixWorld.toArray());
    expect(patch.matrixWorld.toArray()).toEqual(water.patch.matrixWorld.toArray());
    const sky = new Texture();
    water.mesh.material.envMap = sky;
    water.mesh.material.envMapIntensity = .73;
    water.mesh.material.envMapRotation.set(.1, .2, .3);
    water.syncBarrelFallback();
    expect(coarse.material.envMap).toBe(sky);
    expect(coarse.material.envMapIntensity).toBe(.73);
    expect(coarse.material.envMapRotation.toArray()).toEqual(water.mesh.material.envMapRotation.toArray());
    const version = coarse.material.version;
    water.setVertexNormals(true); water.syncBarrelFallback();
    expect(coarse.material.version).toBeGreaterThan(version);
    expect(fallbackCompiled(coarse.material).vertex).toBe(fallbackCompiled(water.mesh.material).vertex);
    source.grid.xMin += 1;
    water.update();
    expect(water.barrelMaskActive).toBe(false);
    expect(coarse.visible).toBe(false);
    const geometry = water.mesh.geometry;
    water.setSource({ ...fallbackSource(), grid: { ...source.grid, nx: 7 } });
    expect(water.mesh.geometry).not.toBe(geometry);
    expect(coarse.geometry).not.toBe(water.mesh.geometry);
    expect(coarse.geometry.attributes).toBe(water.mesh.geometry.attributes);
    expect(coarse.geometry.index).toBe(water.mesh.geometry.index);
    expect(coarse.geometry.drawRange).toEqual(water.mesh.geometry.drawRange);
    expect(patch.geometry).toBe(water.patch.geometry);
    water.setBarrelEnabled(false);
    expect(water.materialUniforms.waterBarrelScreenFallback.value).toBe(0);
    expect(coarse.visible).toBe(false);
    water.dispose(); sky.dispose();
  });

  it('disposes only one repair material and the two original geometries once each', () => {
    const water = new WaterSurface(fallbackSource());
    water.setBarrelEnabled(true); water.setBarrelScreenFallback(true);
    water.setBarrelMask(new Uint8Array(water.barrelMaskGrid.nx * water.barrelMaskGrid.nz).fill(255));
    const repair = water.barrelFallback!, patch = water.barrelPatchFallback!;
    const coarseDispose = vi.spyOn(water.mesh.geometry, 'dispose'), patchDispose = vi.spyOn(water.patch.geometry, 'dispose');
    const repairDispose = vi.spyOn(repair.material, 'dispose'), normalDispose = vi.spyOn(water.mesh.material, 'dispose');
    water.dispose();
    expect(coarseDispose).toHaveBeenCalledTimes(1); expect(patchDispose).toHaveBeenCalledTimes(1);
    expect(repairDispose).toHaveBeenCalledTimes(1); expect(normalDispose).toHaveBeenCalledTimes(1);
    expect(repair.parent).toBeNull(); expect(patch.parent).toBeNull();
    expect(water.barrelFallback).toBeUndefined();
  });
});

describe('the roller lens\'s table on the GPU (S3, Task 4)', () => {
  const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
  const columns = 5;
  function rollerSource(cubic: boolean) {
    const table = new Float32Array(ROLLER_SLOTS * columns * ROLLER_STRIDE);
    const lens = (slot: number, column: number, crest: number, length: number, roughness: number) => {
      const o = (slot * columns + column) * ROLLER_STRIDE;
      table[o + ROLLER_FIELD.crest] = crest;
      table[o + ROLLER_FIELD.length] = length;
      table[o + ROLLER_FIELD.scale] = 0.5;
      table[o + ROLLER_FIELD.roughness] = roughness;
    };
    lens(0, 1, -40, 10, 0.2);
    lens(1, 3, -20, 6, 0.1);
    let revision = 0;
    const source: SurfaceSource & { table: Float32Array; bump(): void } = {
      grid, time: 0, bedRevision: 0, cubic, table,
      get revision() { return revision; },
      bump() { revision += 1; },
      write: () => {}, writeBed: () => {},
      rollerColumns: columns, rollerColumn0: -1.5, rollerColumnWidth: 2,
      writeRoller: vi.fn((into: Float32Array) => { into.set(table); return columns; }),
    };
    return source;
  }

  for (const look of ['classic', 'rich'] as const) {
    it(`uploads the table as is in ${look}: one row per slot, two RGBA texels per column, and the rows the band reaches`, () => {
      const source = rollerSource(look === 'rich');
      const water = new WaterSurface(source);
      water.setLook(look);
      water.update();
      expect(water.drawnLook).toBe(look);
      const uniforms = water.materialUniforms;
      const texture = uniforms.waterRoller.value as DataTexture;
      expect(texture.image.width).toBe(2 * columns);
      expect(texture.image.height).toBe(ROLLER_SLOTS);
      expect(Array.from(texture.image.data as Float32Array)).toEqual(Array.from(source.table));
      expect(uniforms.waterRollerColumns.value).toBe(columns);
      expect(uniforms.waterRollerColumn0.value).toBe(-1.5);
      expect(uniforms.waterRollerColumnWidth.value).toBe(2);
      // From the rear lens's rear taper (−40 − 0.3·10) to the front lens's toe and four of its wander's spreads.
      const extent = uniforms.waterRollerExtent.value as { x: number; y: number };
      expect(extent.x).toBeCloseTo(-43, 6);
      expect(extent.y).toBeCloseTo(-20 + 6 + 4 * 1.5 * 0.1, 6);
      // Each new snapshot uploads it again.
      source.table[(columns + 3) * ROLLER_STRIDE + ROLLER_FIELD.crest] = -18;
      source.bump();
      const version = texture.version;
      water.update();
      expect(texture.version).toBeGreaterThan(version);
      expect((texture.image.data as Float32Array)[(columns + 3) * ROLLER_STRIDE + ROLLER_FIELD.crest]).toBe(-18);
    });
  }

  it('leaves every row at once with no lens, and has no roller for a source without one', () => {
    const source = rollerSource(false);
    source.table.fill(0);
    const water = new WaterSurface(source);
    water.update();
    const extent = water.materialUniforms.waterRollerExtent.value as { x: number; y: number };
    expect(extent.x).toBeGreaterThan(extent.y);
    const plain = new WaterSurface({ grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} });
    plain.update();
    expect(plain.materialUniforms.waterRollerColumns.value).toBe(0);
    expect(plain.mesh.material.customProgramCacheKey()).not.toContain('roller');
    water.setSource({ grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} });
    water.update();
    expect(water.materialUniforms.waterRollerColumns.value).toBe(0);
    expect(water.mesh.material.customProgramCacheKey()).not.toContain('roller');
  });

  it('draws the Canyon\'s own roller through its physical source, and no roller at the Reef', () => {
    const small = {
      seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 0, spreading: 12, tide: 0,
      componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
    };
    const canyon = new SurfZoneSimulation({ ...small, spot: 'canyon' });
    const water = new WaterSurface(new PhysicalSurfaceSource(canyon, 2));
    water.update();
    expect(water.mesh.material.customProgramCacheKey()).toContain('-roller');
    expect(water.materialUniforms.waterRollerColumns.value).toBe(canyon.solver.nx);
    expect(water.materialUniforms.waterRollerColumn0.value).toBeCloseTo(canyon.solver.xCenters[0], 9);
    water.setSource(new PhysicalSurfaceSource(new SurfZoneSimulation({ ...small, spot: 'reef' }), 2));
    water.update();
    expect(water.mesh.material.customProgramCacheKey()).not.toContain('roller');
  });
});
