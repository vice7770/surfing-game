import { describe, expect, it } from 'vitest';
import type { BufferAttribute, DataTexture } from 'three';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { LANDMARK, ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, type LoftResult } from '../../wave/barrel/sweptLoft';
import { toyCase } from '../../wave/barrel/toyCase';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { BROKEN_CREST, BrokenCrests, brokenWeight } from './brokenCrest';
import { SweptBarrel } from './SweptBarrel';
import { SweptBarrelMesh } from './SweptBarrelMesh';

/** A loft of `phases.length` slices, each a full profile, its crest landmark at (x, 0, −100). */
function slices(xs: readonly number[], phases: readonly number[], front = 1): LoftResult {
  const count = xs.length;
  const vertices = count * LOFT_SAMPLES;
  const positions = new Float32Array(3 * vertices);
  for (let s = 0; s < count; s += 1) {
    for (let j = 0; j < LOFT_SAMPLES; j += 1) {
      const v = 3 * (s * LOFT_SAMPLES + j);
      positions[v] = xs[s];
      positions[v + 2] = -100 + 0.1 * (j - LOFT.extensionSamples - LANDMARK.crest);
    }
  }
  const lift = new Float32Array(vertices);
  for (let v = 0; v < vertices; v += 1) lift[v] = (v % LOFT_SAMPLES) / (LOFT_SAMPLES - 1);
  return {
    positions, normals: new Float32Array(3 * vertices), lift, mask: new Float32Array(vertices).fill(1),
    sheet: new Float32Array(vertices), sheetWeight: new Float32Array(vertices), sheetBack: new Float32Array(vertices),
    throat: new Float32Array(4 * vertices), indices: new Uint32Array([0, 1, LOFT_SAMPLES]), vertexCount: vertices, indexCount: 3, sliceCount: count,
    sliceFront: new Int32Array(count).fill(front), slicePhase: Uint8Array.from(phases),
  } as unknown as LoftResult;
}

describe('the broken crest: where a drawn curl keeps the solver’s foam (option (a))', () => {
  it('keeps none of it on a crest at the lace a crest rides through, all of it on whitewater, smoothly between', () => {
    expect(brokenWeight(0)).toBe(0);
    expect(brokenWeight(BROKEN_CREST.clean)).toBe(0);
    expect(brokenWeight(0.5)).toBe(0);
    expect(brokenWeight(BROKEN_CREST.white)).toBe(1);
    expect(brokenWeight(1)).toBe(1);
    const middle = brokenWeight((BROKEN_CREST.clean + BROKEN_CREST.white) / 2);
    expect(middle).toBeCloseTo(0.5, 6);
    for (let foam = 0; foam < 1; foam += 0.05) expect(brokenWeight(foam + 0.05)).toBeGreaterThanOrEqual(brokenWeight(foam));
  });

  it('reads each slice’s crest before its touchdown, keeps its whitest reading, and holds it through its collapse', () => {
    const broken = new BrokenCrests();
    const foam = new Map<number, number>([[3, 0.9], [7, 0.2]]);
    const at = (x: number, z: number) => {
      expect(z).toBeCloseTo(-100, 5);
      return foam.get(Math.round(x)) ?? 0;
    };
    // Open (phase 1): the crest as it is now, white on the broken crest at x 3, none on the clean one at x 7.
    expect(Array.from(broken.update(slices([3, 7], [1, 1]), at).subarray(0, 2))).toEqual([1, 0]);
    // The old foam under the broken crest's curl fades while it is open: the curl stays white.
    foam.set(3, 0.4);
    expect(Array.from(broken.update(slices([3, 7], [0, 1]), at).subarray(0, 2))).toEqual([1, 0]);
    // After touchdown the crash's foam reaches the clean crest and the broken one fades: each keeps what it read.
    foam.set(3, 0.3).set(7, 1);
    expect(Array.from(broken.update(slices([3, 7], [2, 2]), at).subarray(0, 2))).toEqual([1, 0]);
    expect(Array.from(broken.update(slices([3.2, 6.9], [2, 2]), at).subarray(0, 2))).toEqual([1, 0]);
    // A slice first seen past its touchdown (another front, or a place no slice held) reads its crest as it is.
    expect(Array.from(broken.update(slices([3, 7, 12], [2, 2, 2], 4), at).subarray(0, 3))).toEqual([0, 1, 0]);
    // Places not drawn are forgotten: front 1's readings went with the last update.
    expect(Array.from(broken.update(slices([3, 7], [2, 2]), at).subarray(0, 2))).toEqual([0, 1]);
    broken.clear();
    foam.set(3, 0.9).set(7, 0.2);
    expect(Array.from(broken.update(slices([3, 7], [2, 2]), at).subarray(0, 2))).toEqual([1, 0]);
  });

  it('weighs only the foam: the mesh’s lift less the kept share, the loft’s own lift untouched; none kept is the lift exactly', () => {
    const loft = slices([3, 7], [1, 1]);
    const original = loft.lift.slice();
    const mesh = new SweptBarrelMesh(new WaterSurface({ grid: { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 }, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} }).materialUniforms);
    const lift = () => Array.from((mesh.mesh.geometry.getAttribute('sweptLift') as BufferAttribute).array.slice(0, loft.vertexCount));
    mesh.update(loft);
    expect(lift()).toEqual(Array.from(original));
    mesh.update(loft, new Float32Array([0, 0]));
    expect(lift()).toEqual(Array.from(original));
    mesh.update(loft, new Float32Array([1, 0.25]));
    const expected = Array.from(original, (value, v) => Math.fround(value * (v < LOFT_SAMPLES ? 0 : 0.75)));
    expect(lift()).toEqual(expected);
    expect(loft.lift).toEqual(original);
    // Dev: the curl drawn as before, whatever its crest.
    mesh.brokenFoam = false;
    mesh.update(loft, new Float32Array([1, 0.25]));
    expect(lift()).toEqual(Array.from(original));
  });
});

describe('the swept barrel on a broken crest', () => {
  /** Flat water at 0 m with `foam` on every node, a straight open front along +x at z = −100. */
  async function drawn(foam: number) {
    const grid = { xMin: -5, zMin: -110, spacing: 1, nx: 40, nz: 50 };
    const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
    const water = new WaterSurface(source);
    for (let i = 1; i < water.surfaceData.length; i += 2) water.surfaceData[i] = foam;
    const barrel = new SweptBarrel(water, async () => new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]));
    barrel.setSpot('padang');
    await barrel.ready;
    const front = new Float32Array(21 * FRONT_STRIDE);
    for (let k = 0; k < 21; k += 1) {
      const o = k * FRONT_STRIDE;
      front[o + FRONT_FIELD.x] = k + 0.5; front[o + FRONT_FIELD.z] = -100; front[o + FRONT_FIELD.front] = 1; front[o + FRONT_FIELD.sigma] = k;
      front[o + FRONT_FIELD.tau] = 0.1; front[o + FRONT_FIELD.footHeight] = 2.1; front[o + FRONT_FIELD.footDepth] = 7; front[o + FRONT_FIELD.throwZ] = -100.2;
    }
    barrel.draw(front, 21, 0);
    const loft = barrel.lastLoft!;
    const lift = (barrel.mesh.mesh.geometry.getAttribute('sweptLift') as BufferAttribute).array.slice(0, loft.vertexCount);
    const mask = Array.from((water.materialUniforms.waterBarrelMask.value as DataTexture).image.data as Uint8Array);
    return { barrel, water, front, loft, lift, mask };
  }

  it('draws a clean crest’s curl as before: its foam weight is the loft’s lift, byte for byte', async () => {
    for (const foam of [0, 0.3, BROKEN_CREST.clean]) {
      const { loft, lift } = await drawn(foam);
      expect(loft.vertexCount).toBeGreaterThan(0);
      expect(Array.from(lift)).toEqual(Array.from(loft.lift.subarray(0, loft.vertexCount)));
    }
  });

  it('keeps the whitewater on a broken crest’s curl, and lofts, masks and answers the camera’s water as before', async () => {
    const clean = await drawn(0);
    const white = await drawn(0.95);
    expect(white.loft.vertexCount).toBe(clean.loft.vertexCount);
    expect(Array.from(white.loft.positions.subarray(0, 3 * white.loft.vertexCount))).toEqual(Array.from(clean.loft.positions.subarray(0, 3 * clean.loft.vertexCount)));
    expect(Array.from(white.loft.lift.subarray(0, white.loft.vertexCount))).toEqual(Array.from(clean.loft.lift.subarray(0, clean.loft.vertexCount)));
    expect(white.mask).toEqual(clean.mask);
    expect(Math.max(...white.loft.lift.subarray(0, white.loft.vertexCount))).toBe(1);
    expect(Math.max(...white.lift)).toBe(0);
    const [x, y, z] = white.loft.positions.subarray(3 * (10 * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.throat), 3 * (10 * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.throat) + 3);
    expect(white.barrel.waterAt(x, y, z)).toBe(clean.barrel.waterAt(x, y, z));
    // Dev: drawn as before with the switch off, on the same snapshot.
    white.barrel.mesh.brokenFoam = false;
    white.barrel.draw(white.front, 21, 0);
    const lift = (white.barrel.mesh.mesh.geometry.getAttribute('sweptLift') as BufferAttribute).array.slice(0, white.loft.vertexCount);
    expect(Array.from(lift)).toEqual(Array.from(clean.lift));
  });
});
