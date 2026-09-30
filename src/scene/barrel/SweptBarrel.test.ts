import { describe, expect, it } from 'vitest';
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
