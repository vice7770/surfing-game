import { describe, expect, it, vi } from 'vitest';
import { DataTexture, ShaderLib, type BufferAttribute } from 'three';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { toyCase } from '../../wave/barrel/toyCase';
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
