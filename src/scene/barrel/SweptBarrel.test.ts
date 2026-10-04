import { describe, expect, it, vi } from 'vitest';
import { DataTexture, ShaderLib, type BufferAttribute } from 'three';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { toyCase, tubeCase } from '../../wave/barrel/toyCase';
import { PhysicalMode } from '../../game/PhysicalMode';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { SweptBarrel } from './SweptBarrel';

/** Flat water at 0 m over a grid holding the front and its 28 m toy profiles. */
const grid = { xMin: -5, zMin: -110, spacing: 1, nx: 40, nz: 50 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
/** A straight front along +x at z = −100, thrown at z −100.2, τ 0.1 s. */
function straightFront(n: number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = 0.1; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7; out[o + FRONT_FIELD.throwZ] = -100.2;
  }
  return out;
}
const library = () => new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);

describe('the swept barrel at a spot', () => {
  it('preserves the same seam bytes and shader coordinates when the water is coarsened to 2 m', async () => {
    const surfaces = [1, 2].map((spacing) => new WaterSurface({
      ...source, grid: { ...grid, spacing, nx: 40 / spacing + 1, nz: 50 / spacing + 1 },
    }));
    const barrels = surfaces.map((water) => new SweptBarrel(water, async () => library()));
    const front = straightFront(21);
    for (const barrel of barrels) barrel.setSpot('padang');
    await Promise.all(barrels.map((barrel) => barrel.ready));
    const geometry = surfaces[1].mesh.geometry;
    const heightTexture = surfaces[1].materialUniforms.waterSurface.value;
    for (const barrel of barrels) barrel.draw(front, 21, 0);
    const masks = surfaces.map((water) => water.materialUniforms.waterBarrelMask.value as DataTexture);
    expect(Array.from(masks[0].image.data as Uint8Array)).toEqual(Array.from(masks[1].image.data as Uint8Array));
    expect(masks[1].image.width).toBe(41);
    expect(masks[1].image.height).toBe(51);
    expect(surfaces[1].mesh.geometry).toBe(geometry);
    expect(surfaces[1].materialUniforms.waterSurface.value).toBe(heightTexture);
    expect(surfaces[1].surfaceData.length).toBe(2 * 21 * 26);
    const waterShader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    const barrelShader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    surfaces[1].mesh.material.onBeforeCompile(waterShader as never, undefined as never);
    barrels[1].mesh.mesh.material.onBeforeCompile(barrelShader as never, undefined as never);
    for (const shader of [waterShader, barrelShader]) {
      expect(shader.fragmentShader).toContain('( xz - waterBarrelGrid.xy ) / waterBarrelGrid.z');
      expect(shader.fragmentShader).toContain('( g + 0.5 ) / waterBarrelGridSize');
      expect(shader.uniforms).toMatchObject({
        waterBarrelGrid: surfaces[1].materialUniforms.waterBarrelGrid,
        waterBarrelGridSize: surfaces[1].materialUniforms.waterBarrelGridSize,
      });
    }
    for (const barrel of barrels) barrel.dispose();
    for (const water of surfaces) water.dispose();
  });

  it('reuses a held snapshot loft and rebuilds diagnostic views, water looks and new same-time data', async () => {
    const snapshot = { ...source, grid: { ...grid }, revision: {}, cubic: true };
    const water = new WaterSurface(snapshot);
    const barrel = new SweptBarrel(water, async () => library());
    barrel.setSpot('padang');
    await barrel.ready;
    const front = straightFront(21);
    const update = vi.spyOn(barrel.mesh, 'update');
    const mask = vi.spyOn(water, 'setBarrelMask');
    barrel.draw(front, 21, 0, snapshot.revision);
    const vertices = barrel.mesh.mesh.geometry.getAttribute('position') as BufferAttribute;
    const version = vertices.version;
    for (let frame = 0; frame < 120; frame += 1) {
      water.update();
      barrel.draw(front, 21, 0, snapshot.revision);
    }
    expect(update).toHaveBeenCalledTimes(1);
    expect(mask).toHaveBeenCalledTimes(1);
    expect(vertices.version).toBe(version);
    for (const change of [
      () => { barrel.mesh.sheetShown = false; },
      () => { barrel.mesh.facesOut = false; },
      () => barrel.mesh.setView('region'),
      () => water.setLook('rich'),
      () => { snapshot.revision = {}; },
    ]) {
      const calls = update.mock.calls.length;
      change();
      water.update();
      barrel.draw(front, 21, 0, snapshot.revision);
      expect(update).toHaveBeenCalledTimes(calls + 1);
    }
    const calls = update.mock.calls.length;
    barrel.draw(front, 21, 0.1, snapshot.revision);
    barrel.draw(front, 0, 0.1, snapshot.revision);
    expect(update).toHaveBeenCalledTimes(calls + 2);
    expect(barrel.mesh.mesh.visible).toBe(false);
    barrel.dispose();
    water.dispose();
  });

  it('rebuilds unversioned callers that mutate front records in place without changing the water', async () => {
    const water = new WaterSurface(source);
    const barrel = new SweptBarrel(water, async () => library());
    barrel.setSpot('padang');
    await barrel.ready;
    const front = straightFront(21);
    barrel.draw(front, 21, 0);
    const positions = barrel.mesh.mesh.geometry.getAttribute('position') as BufferAttribute;
    const before = Array.from(positions.array);
    const version = positions.version;
    for (let point = 0; point < 21; point += 1) front[point * FRONT_STRIDE + FRONT_FIELD.x] += 1;
    barrel.draw(front, 21, 0);
    expect(positions.version).toBe(version + 1);
    expect(Array.from(positions.array)).not.toEqual(before);
    barrel.dispose();
    water.dispose();
  });

  it('rebuilds the roof and water mask when the drawing hold changes on the same snapshot', async () => {
    const water = new WaterSurface(source);
    const barrel = new SweptBarrel(water, async () => library());
    barrel.setHoldClearDrawing(false);
    barrel.setSpot('padang');
    await barrel.ready;
    const front = straightFront(21), revision = {};
    for (let k = 0; k < 21; k++) front[k * FRONT_STRIDE + FRONT_FIELD.tau] = 0.35;
    const update = vi.spyOn(barrel.mesh, 'update');
    const mask = vi.spyOn(water, 'setBarrelMask');
    barrel.draw(front, 21, 0, revision);
    const baseline = barrel.lastLoft!.positions.slice(0, 3 * barrel.lastLoft!.vertexCount);
    const baselineMask = ((water.materialUniforms.waterBarrelMask.value as DataTexture).image.data as Uint8Array).slice();
    barrel.setHoldClearDrawing(true);
    barrel.draw(front, 21, 0, revision);
    const held = barrel.lastLoft!.positions.slice(0, 3 * barrel.lastLoft!.vertexCount);
    expect(held).not.toEqual(baseline);
    expect(update).toHaveBeenCalledTimes(2);
    expect(mask).toHaveBeenCalledTimes(2);
    barrel.setHoldClearDrawing(true);
    barrel.draw(front, 21, 0, revision);
    expect(update).toHaveBeenCalledTimes(2);
    expect(mask).toHaveBeenCalledTimes(2);
    barrel.setSpot(undefined);
    barrel.setSpot('padang'); // cached library path retains the selected drawing hold
    barrel.draw(front, 21, 0, revision);
    expect(barrel.lastLoft!.positions.subarray(0, held.length)).toEqual(held);
    barrel.setHoldClearDrawing(false);
    barrel.draw(front, 21, 0, revision);
    expect(barrel.lastLoft!.positions.subarray(0, baseline.length)).toEqual(baseline);
    expect((water.materialUniforms.waterBarrelMask.value as DataTexture).image.data).toEqual(baselineMask);
    barrel.dispose(); water.dispose();
  });

  it('uses the selected drawing hold when an asynchronous library load finishes', async () => {
    const water = new WaterSurface(source);
    let resolve!: (loaded: ProfileLibrary) => void;
    const barrel = new SweptBarrel(water, () => new Promise((r) => { resolve = r; }));
    barrel.setHoldClearDrawing(false);
    barrel.setSpot('padang');
    barrel.setHoldClearDrawing(true);
    resolve(library());
    await barrel.ready;
    const front = straightFront(21);
    for (let k = 0; k < 21; k++) front[k * FRONT_STRIDE + FRONT_FIELD.tau] = 0.35;
    barrel.draw(front, 21, 0);
    const loadedHeld = barrel.lastLoft!.positions.slice(0, 3 * barrel.lastLoft!.vertexCount);
    barrel.setHoldClearDrawing(false);
    barrel.draw(front, 21, 0);
    expect(barrel.lastLoft!.positions.subarray(0, loadedHeld.length)).not.toEqual(loadedHeld);
    barrel.setHoldClearDrawing(true);
    barrel.draw(front, 21, 0);
    expect(barrel.lastLoft!.positions.subarray(0, loadedHeld.length)).toEqual(loadedHeld);
    barrel.dispose(); water.dispose();
  });

  it('draws the clear roof by default on the first loaded snapshot', async () => {
    const water = new WaterSurface(source);
    const barrel = new SweptBarrel(water, async () => library());
    barrel.setSpot('padang'); await barrel.ready;
    const front = straightFront(21), revision = {};
    for (let k = 0; k < 21; k++) front[k * FRONT_STRIDE + FRONT_FIELD.tau] = 0.35;
    barrel.draw(front, 21, 0, revision);
    const held = barrel.lastLoft!.positions.slice(0, 3 * barrel.lastLoft!.vertexCount);
    expect(barrel.holdsClearDrawing).toBe(true);
    barrel.setHoldClearDrawing(false); barrel.draw(front, 21, 0, revision);
    expect(barrel.lastLoft!.positions.subarray(0, held.length)).not.toEqual(held);
    barrel.setHoldClearDrawing(true); barrel.draw(front, 21, 0, revision);
    expect(barrel.lastLoft!.positions.subarray(0, held.length)).toEqual(held);
    barrel.dispose(); water.dispose();
  });

  it('draws nothing and masks nothing until its library has loaded, or with no front', async () => {
    const water = new WaterSurface(source);
    let resolve!: (loaded: ProfileLibrary) => void;
    const barrel = new SweptBarrel(water, () => new Promise((r) => { resolve = r; }));
    barrel.setSpot('padang');
    barrel.draw(straightFront(21), 21, 0);
    expect(water.barrelMaskActive).toBe(false);
    expect(barrel.mesh.mesh.visible).toBe(false);
    resolve(library());
    await barrel.ready;
    barrel.draw(straightFront(21), 0, 0);
    expect(water.barrelMaskActive).toBe(false);
  });

  it('lofts a front over the drawn water, masks its footprint and shows the mesh', async () => {
    const water = new WaterSurface(source);
    const barrel = new SweptBarrel(water, async () => library());
    barrel.setSpot('padang');
    await barrel.ready;
    barrel.draw(straightFront(21), 21, 0);
    expect(water.barrelMaskActive).toBe(true);
    expect(barrel.mesh.mesh.visible).toBe(true);
    expect(barrel.lastLoft!.vertexCount).toBeGreaterThan(0);
  });

  // Review Focus 4: every other spot keeps its water's program and pixels exactly.
  it('stays off at a spot without the swept barrel, its water’s program untouched', async () => {
    const water = new WaterSurface(source);
    const key = water.mesh.material.customProgramCacheKey();
    const barrel = new SweptBarrel(water, async () => library());
    barrel.setSpot('reef');
    barrel.draw(straightFront(21), 21, 0);
    expect(water.barrelMaskActive).toBe(false);
    expect(barrel.mesh.mesh.visible).toBe(false);
    expect(water.mesh.material.customProgramCacheKey()).toBe(key);
  });
});

describe('held screen coverage state', () => {
  it('refreshes stencil marking on a cached draw without rebuilding geometry or uploading attributes', async () => {
    const water = new WaterSurface(source), barrel = new SweptBarrel(water, async () => library());
    barrel.setSpot('padang'); await barrel.ready;
    const front = straightFront(21), revision = {};
    barrel.draw(front, 21, 0, revision);
    expect(water.barrelMaskActive).toBe(true);
    const position = barrel.mesh.mesh.geometry.getAttribute('position') as BufferAttribute, version = position.version;
    const update = vi.spyOn(barrel.mesh, 'update');
    water.setBarrelScreenFallback(true);
    barrel.draw(front, 21, 0, revision);
    expect(barrel.mesh.mesh.material.stencilWrite).toBe(true);
    expect(update).not.toHaveBeenCalled(); expect(position.version).toBe(version);
    water.setBarrelScreenFallback(false); barrel.draw(front, 21, 0, revision);
    expect(barrel.mesh.mesh.material.stencilWrite).toBe(false);
    expect(update).not.toHaveBeenCalled(); expect(position.version).toBe(version);
    barrel.setSpot(undefined);
    expect(water.barrelFallback!.visible).toBe(false);
    expect(barrel.mesh.mesh.material.stencilWrite).toBe(false);
    barrel.dispose(); water.dispose();
  });
});


/**
 * Renderer lifecycle authority, not a natural breaking-front replay: this writer owns all 21 controls throughout
 * the sequence. They cannot disappear or retarget. Authored tau advances at 1/60 s; each publication is followed
 * by a cached display repeat. The real PhysicalMode.drawBarrel method consumes the minimal host facade.
 */
function lifecycleDraw(water: WaterSurface, barrel: SweptBarrel) {
  const surface = { ...source, cubic: true, bedRevision: 1, revision: {}, write: (out: Float32Array) => out.fill(0),
    writeBed: (out: Float32Array) => out.fill(-7) };
  water.setSource(surface);
  water.setLook('rich');
  const front = straightFront(21);
  const host = { snapshot: { front, frontCount: 21, status: {} } };
  const mode = { host: host as typeof host | undefined, sweptBarrel: barrel, config: { tide: 0 }, swept: true, shown: true };
  const draw = () => { water.update(); PhysicalMode.prototype.drawBarrel.call(mode as unknown as PhysicalMode); };
  const publish = (tau: number) => {
    for (let k = 0; k < 21; k++) {
      const o = k * FRONT_STRIDE;
      front[o + FRONT_FIELD.tau] = tau;
      front[o + FRONT_FIELD.z] = -100 + 1.5 * (tau - 0.1);
      front[o + FRONT_FIELD.pace] = 1.5;
    }
    host.snapshot.status = { seaTime: 164 + tau };
    surface.revision = host.snapshot.status;
    surface.time = 164 + tau;
    draw();
  };
  return { surface, front, host, mode, draw, publish };
}

describe('actual drawBarrel late-water protocol lifecycle with preserved controls', () => {
  it('keeps the same interior geometry through authored touchdown, then clears both repairs on full collapse before source removal', async () => {
    const profiles = new ProfileLibrary([tubeCase(0.3)]);
    const times = profiles.profileTimes({ slope: 0.05, footHeight: 2.1, footDepth: 7 });
    expect(times.touchdownSeconds).toBeGreaterThan(0.1);
    expect(times.collapseSeconds).toBeGreaterThan(0);
    const steps = Math.ceil(60 * (times.touchdownSeconds + times.collapseSeconds + 0.05 - 0.1));
    expect(steps).toBeLessThan(600); // hard synthetic geometry bound, never widened after execution
    const water = new WaterSurface(source), barrel = new SweptBarrel(water, async () => profiles);
    barrel.setSpot('padang'); await barrel.ready;
    const fixture = lifecycleDraw(water, barrel);
    water.setBarrelScreenFallback(true);
    expect(water.barrelFallback).toBeUndefined(); // no active mask yet
    let open = 0, post = 0, retired = false;
    let repair: typeof water.barrelFallback;
    for (let step = 0; step <= steps; step++) {
      fixture.publish(0.1 + step / 60);
      expect(fixture.host.snapshot.frontCount).toBe(21);
      for (let k = 0; k < 21; k++) {
        expect(fixture.front[k * FRONT_STRIDE + FRONT_FIELD.front]).toBe(1);
        expect(fixture.front[k * FRONT_STRIDE + FRONT_FIELD.x]).toBe(k + 0.5);
        expect(fixture.front[k * FRONT_STRIDE + FRONT_FIELD.sigma]).toBe(k);
      }
      const loft = barrel.lastLoft!;
      const positions = barrel.mesh.mesh.geometry.getAttribute('position') as BufferAttribute;
      const positionVersion = positions.version;
      const maskTexture = water.materialUniforms.waterBarrelMask.value as DataTexture;
      const maskVersion = maskTexture.version;
      if (loft.indexCount > 0) {
        expect(retired).toBe(false);
        let selected = -1;
        for (let s = 0; s + 1 < loft.sliceCount; s++) {
          if (loft.sliceFront[s] === 1 && loft.sliceFront[s + 1] === 1 && loft.sliceJoined[s] === 1
            && loft.sliceSigma[s] <= 10 && loft.sliceSigma[s + 1] >= 10) { selected = s; break; }
        }
        expect(selected).toBeGreaterThanOrEqual(0); // fixed sigma, no nearest replacement
        expect(loft.sliceOverturned[selected]).toBe(1);
        expect(loft.sliceWeight[selected]).toBeGreaterThan(0);
        if (loft.slicePhase[selected] === 1) open++;
        if (loft.slicePhase[selected] === 2) post++;
        expect(water.barrelMaskActive).toBe(true);
        expect(barrel.mesh.mesh.visible).toBe(true);
        expect(barrel.mesh.mesh.material.stencilWrite).toBe(true);
        expect(water.barrelFallback!.visible).toBe(true);
        expect(water.barrelPatchFallback!.visible).toBe(true);
        repair ??= water.barrelFallback;
        expect(water.barrelFallback).toBe(repair);
      } else {
        retired = true;
        expect(open).toBeGreaterThan(0);
        expect(post).toBeGreaterThan(5);
        expect(water.barrelMaskActive).toBe(false);
        expect(barrel.mesh.mesh.visible).toBe(false);
        expect(barrel.mesh.mesh.geometry.drawRange.count).toBe(0);
        expect(barrel.mesh.mesh.material.stencilWrite).toBe(false);
        expect(water.mesh.material.stencilWrite).toBe(false);
        expect(water.barrelFallback!.visible).toBe(false);
        expect(water.barrelPatchFallback!.visible).toBe(false);
      }
      fixture.draw(); // actual cached branch, not a manually manufactured sync/provenance call
      expect(positions.version).toBe(positionVersion);
      expect(maskTexture.version).toBe(maskVersion);
    }
    expect(retired).toBe(true);
    fixture.host.snapshot.frontCount = 0;
    fixture.host.snapshot.status = {}; fixture.surface.revision = fixture.host.snapshot.status;
    fixture.draw();
    expect(water.barrelMaskActive).toBe(false);
    expect(water.barrelFallback!.visible).toBe(false);
    barrel.dispose(); water.dispose();
  });

  it('updates cached capability and real hidden/swept/host controls without stale repair or allocations on reactivation', async () => {
    const water = new WaterSurface(source), barrel = new SweptBarrel(water, async () => new ProfileLibrary([tubeCase(0.3)]));
    barrel.setSpot('padang'); await barrel.ready;
    const fixture = lifecycleDraw(water, barrel);
    fixture.publish(0.1);
    const positions = barrel.mesh.mesh.geometry.getAttribute('position') as BufferAttribute;
    const version = positions.version;
    const update = vi.spyOn(barrel.mesh, 'update');
    water.setBarrelScreenFallback(true);
    const repair = water.barrelFallback!, patch = water.barrelPatchFallback!;
    water.mesh.material.envMapIntensity = 0.73;
    fixture.draw(); // the actual main pipeline updates water before its cached drawBarrel call
    expect(repair.material.envMapIntensity).toBe(0.73);
    expect(barrel.mesh.mesh.material.stencilWrite).toBe(true);
    expect(positions.version).toBe(version);
    expect(update).not.toHaveBeenCalled();
    water.setBarrelScreenFallback(false); fixture.draw();
    expect(repair.visible).toBe(false); expect(patch.visible).toBe(false);
    expect(water.mesh.material.stencilWrite).toBe(false); expect(barrel.mesh.mesh.material.stencilWrite).toBe(false);
    expect(update).not.toHaveBeenCalled();
    water.setBarrelScreenFallback(true); fixture.draw();
    expect(water.barrelFallback).toBe(repair); expect(repair.visible).toBe(true);
    for (const flag of ['shown', 'swept'] as const) {
      fixture.mode[flag] = false; fixture.draw();
      expect(water.barrelMaskActive).toBe(false); expect(repair.visible).toBe(false); expect(patch.visible).toBe(false);
      expect(barrel.mesh.mesh.material.stencilWrite).toBe(false);
      fixture.mode[flag] = true; fixture.draw();
      expect(water.barrelMaskActive).toBe(true); expect(repair.visible).toBe(true);
    }
    fixture.mode.host = undefined; fixture.draw();
    expect(water.barrelMaskActive).toBe(false); expect(repair.visible).toBe(false);
    fixture.mode.host = fixture.host; fixture.draw();
    expect(water.barrelFallback).toBe(repair); expect(repair.visible).toBe(true);
    barrel.setSpot(undefined);
    expect(water.barrelMaskActive).toBe(false); expect(repair.visible).toBe(false); expect(patch.visible).toBe(false);
    expect(barrel.mesh.mesh.material.stencilWrite).toBe(false);
    barrel.dispose(); water.dispose();
  });
});
