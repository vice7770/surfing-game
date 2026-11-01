import { describe, expect, it } from 'vitest';
import type { BufferAttribute, DataTexture } from 'three';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { LANDMARK, ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { LOFT, LOFT_SAMPLES, type LoftResult } from '../../wave/barrel/sweptLoft';
import { toyCase } from '../../wave/barrel/toyCase';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { BROKEN_CREST, BrokenCrests, LIP_FOAM, brokenWeight, lipFoamAt } from './brokenCrest';
import { SweptBarrel } from './SweptBarrel';
import { SWEPT_LIFT_STEPS, SweptBarrelMesh, packSweptLift } from './SweptBarrelMesh';

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

  it('takes a crest as broken only with whitewater on its face as well', () => {
    const broken = new BrokenCrests();
    // The crest landmark lies at z −100, the toe 8 m ahead, the face read halfway between.
    const read: number[] = [];
    const at = (crest: number, face: number) => (_x: number, z: number) => {
      read.push(z);
      return z < -99 ? crest : face;
    };
    expect(broken.update(slices([3], [1]), at(0.9, 0.9))[0]).toBe(1);
    expect(read.map((z) => +z.toFixed(2))).toEqual([-100, -96]);
    // Lace on a clean face's crest, and old foam on the face below a clean crest: not broken.
    expect(broken.update(slices([3], [1], 2), at(0.9, 0.3))[0]).toBe(0);
    expect(broken.update(slices([3], [1], 3), at(0.3, 0.9))[0]).toBe(0);
  });

  it('reads each slice’s crest as it is before its touchdown, and holds the last reading through its collapse', () => {
    const broken = new BrokenCrests();
    const foam = new Map<number, number>([[3, 0.9], [7, 0.2]]);
    const at = (x: number) => foam.get(Math.round(x)) ?? 0;
    // Open (phase 1): the crest as it is now, white on the broken crest at x 3, none on the clean one at x 7.
    expect(Array.from(broken.update(slices([3, 7], [1, 1]), at).subarray(0, 2))).toEqual([1, 0]);
    // The onset's whitewater under a young curl fades as it opens: so does the curl's.
    foam.set(3, 0.4);
    expect(Array.from(broken.update(slices([3, 7], [0, 1]), at).subarray(0, 2))).toEqual([0, 0]);
    foam.set(3, 0.9);
    expect(Array.from(broken.update(slices([3, 7], [1, 1]), at).subarray(0, 2))).toEqual([1, 0]);
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

  it('latches the lip’s foam when a place is first drawn: its crest’s and face’s, times the kept share, the lesser of then and now', () => {
    const broken = new BrokenCrests();
    // The crest landmark lies at z −100, the face read 4 m ahead.
    let [crest, face] = [0.9, 0.85];
    const at = () => (_x: number, z: number) => (z < -99 ? crest : face);
    broken.update(slices([3], [1]), at());
    expect([broken.weights[0], broken.outer[0], broken.face[0]].map((v) => +v.toFixed(4))).toEqual([1, 0.9, 0.85]);
    // More foam comes under it (the solver's onset whitewater): the lip carries only what it had when first drawn.
    [crest, face] = [1, 1];
    broken.update(slices([3], [1]), at());
    expect([broken.outer[0], broken.face[0]].map((v) => +v.toFixed(4))).toEqual([0.9, 0.85]);
    // Less: the lesser.
    [crest, face] = [0.82, 0.81];
    broken.update(slices([3], [1]), at());
    expect([broken.outer[0], broken.face[0]].map((v) => +v.toFixed(4))).toEqual([+(brokenWeight(0.81) * 0.82).toFixed(4), +(brokenWeight(0.81) * 0.81).toFixed(4)]);
    // A clean crest's lip carries none, whatever lace rides on it.
    broken.update(slices([3], [1], 2), () => 0.5);
    expect([broken.outer[0], broken.face[0]]).toEqual([0, 0]);
  });
});

describe('the foam a lip carries (T3)', () => {
  const { crest, lip, throat, toe } = LANDMARK;

  it('carries its crest’s foam on the outer surface and its face’s on the underside, thinned by the stretch', () => {
    // Before the throw, unstretched and no sheet yet: as read.
    expect(lipFoamAt(crest + 10, 0.8, 0.6, 1, 0, -0.2, 0.3)).toBeCloseTo(0.8, 6);
    expect(lipFoamAt(lip + 10, 0.8, 0.6, 1, 0, -0.2, 0.3)).toBeCloseTo(0.6, 6);
    // Stretched to twice its arc: half.
    expect(lipFoamAt(crest + 10, 0.8, 0.6, 0.5, 0, 0, 0.3)).toBeCloseTo(0.4, 6);
    expect(lipFoamAt(lip + 10, 0.8, 0.6, 0.5, 0, 0, 0.3)).toBeCloseTo(0.3, 6);
    // Behind the crest, its crest's; the back wall, the face's, neither thinned nor capped.
    expect(lipFoamAt(crest - 2, 0.8, 0.6, 0.5, 1, -1, 0.3)).toBeCloseTo(0.8, 6);
    expect(lipFoamAt(throat + 5, 0.8, 0.6, 0.5, 1, -1, 0.3)).toBeCloseTo(0.6, 6);
    expect(lipFoamAt(toe, 0.8, 0.95, 0.2, 1, -1, 0.3)).toBeCloseTo(0.95, 6);
  });

  it('stays translucent as a sheet until touchdown: capped at 0.3 as far as the point is a sheet', () => {
    expect(lipFoamAt(lip - 4, 1, 1, 1, 1, -0.01, 0.3)).toBeCloseTo(LIP_FOAM.cap, 6);
    expect(lipFoamAt(lip + 4, 1, 1, 1, 1, 0, 0.3)).toBeCloseTo(LIP_FOAM.cap, 6);
    expect(lipFoamAt(lip - 4, 1, 1, 1, 0.5, 0, 0.3)).toBeCloseTo(0.65, 6);
    expect(lipFoamAt(lip - 4, 0.2, 1, 1, 1, 0, 0.3)).toBeCloseTo(0.2, 6);
    // A clean crest's lip: none.
    for (let point = 0; point < 128; point += 1) expect(lipFoamAt(point, 0, 0, 1, 1, -0.1, 0.3)).toBe(0);
  });

  it('turns white from the tip within the flash after touchdown, sweeping back to the crest and the throat over the collapse', () => {
    // The tip: white within the flash, on every slice, clean or not.
    expect(lipFoamAt(lip, 0, 0, 1, 1, 0.05, 0.3)).toBeGreaterThan(0.2);
    expect(lipFoamAt(lip, 0, 0, 1, 1, LIP_FOAM.flash, 0.3)).toBeCloseTo(1, 6);
    // Early in the collapse the crest and the throat are still the lip's own; by its end, all white.
    expect(lipFoamAt(crest, 0, 0, 1, 1, LIP_FOAM.flash, 0.3)).toBe(0);
    expect(lipFoamAt(throat, 0, 0, 1, 1, LIP_FOAM.flash, 0.3)).toBe(0);
    expect(lipFoamAt(crest + 16, 0, 0, 1, 1, 0.1, 0.3)).toBe(0);
    expect(lipFoamAt(crest + 16, 0, 0, 1, 1, 0.2, 0.3)).toBeCloseTo(1, 6);
    expect(lipFoamAt(crest, 0, 0, 1, 1, 0.3, 0.3)).toBeCloseTo(1, 6);
    expect(lipFoamAt(throat, 0, 0, 1, 1, 0.3, 0.3)).toBeCloseTo(1, 6);
    // The back wall keeps the face's.
    expect(lipFoamAt(throat + 1, 0, 0.1, 1, 1, 1, 0.3)).toBeCloseTo(0.1, 6);
    // Monotonic: the white only spreads.
    for (let point = crest; point <= throat; point += 1) {
      let last = 0;
      for (let after = 0; after <= 0.5; after += 0.01) {
        const now = lipFoamAt(point, 0, 0, 1, 1, after, 0.3);
        expect(now).toBeGreaterThanOrEqual(last - 1e-12);
        last = now;
      }
    }
  });
});

/** `sweptLift`'s lift and the foam its lifted water carries. */
const unpack = (packed: number) => [Math.floor(packed) / SWEPT_LIFT_STEPS, packed - Math.floor(packed)] as const;

describe('the mesh’s `sweptLift`: the lift and the lifted water’s own foam', () => {
  const mesh = () => new SweptBarrelMesh(new WaterSurface({ grid: { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 }, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} }).materialUniforms);
  const attribute = (swept: SweptBarrelMesh, loft: LoftResult) => Array.from((swept.mesh.geometry.getAttribute('sweptLift') as BufferAttribute).array.slice(0, loft.vertexCount));

  it('packs the lift to a thousandth and the foam below 1', () => {
    for (const lift of [0, 0.25, 0.5, 1]) {
      for (const foam of [0, 0.3, 0.75, 1]) {
        const [l, f] = unpack(Math.fround(packSweptLift(lift, foam)));
        expect(Math.abs(l - lift)).toBeLessThan(0.5 / SWEPT_LIFT_STEPS + 1e-9);
        expect(Math.abs(f - Math.min(foam, 0.998))).toBeLessThan(2e-4);
      }
    }
  });

  it('carries no foam on a clean crest’s lip before touchdown, and leaves the loft’s own lift untouched', () => {
    const loft = slices([3, 7], [1, 1]);
    Object.assign(loft, { sliceStretch: new Float32Array([1, 1]), sliceAfter: new Float32Array([-0.1, -0.1]), sliceCollapse: new Float32Array([0.3, 0.3]) });
    const original = loft.lift.slice();
    const swept = mesh();
    swept.update(loft, new Float32Array([0, 0]), { outer: new Float32Array(2), face: new Float32Array(2) });
    attribute(swept, loft).forEach((value, v) => {
      const [lift, foam] = unpack(value);
      expect(Math.abs(lift - original[v])).toBeLessThan(0.5 / SWEPT_LIFT_STEPS + 1e-6);
      expect(foam).toBe(0);
    });
    expect(loft.lift).toEqual(original);
  });

  it('carries a broken crest’s foam on its lift, the white after touchdown; `lipFoam` old keeps the kept share as before', () => {
    const loft = slices([3, 7], [1, 2]);
    Object.assign(loft, { sliceStretch: new Float32Array([0.5, 1]), sliceAfter: new Float32Array([-0.1, 0.5]), sliceCollapse: new Float32Array([0.3, 0.3]) });
    const swept = mesh();
    swept.update(loft, new Float32Array([1, 0]), { outer: new Float32Array([0.9, 0]), face: new Float32Array([0.7, 0]) });
    const values = attribute(swept, loft).map(unpack);
    const at = (slice: number, point: number) => values[slice * LOFT_SAMPLES + LOFT.extensionSamples + point];
    // The first slice: its crest's foam halved on the outer surface (no sheet in this loft: uncapped), its face's on the wall.
    expect(at(0, LANDMARK.crest + 10)[1]).toBeCloseTo(0.45, 3);
    expect(at(0, LANDMARK.toe)[1]).toBeCloseTo(0.7, 3);
    // The second, past its collapse: white from the crest to the throat, though its crest was clean.
    for (const point of [LANDMARK.crest, LANDMARK.lip, LANDMARK.throat]) expect(at(1, point)[1]).toBeCloseTo(0.998, 3);
    // The extensions over the water carry none.
    expect(values[0][1]).toBe(0);
    // `?lipFoam=old`: the lift less the kept share, no foam of its own, as before T3.
    swept.lipFoam = 'old';
    swept.update(loft, new Float32Array([1, 0.25]), { outer: new Float32Array([0.9, 0]), face: new Float32Array([0.7, 0]) });
    attribute(swept, loft).forEach((value, v) => {
      const [lift, foam] = unpack(value);
      expect(Math.abs(lift - loft.lift[v] * (v < LOFT_SAMPLES ? 0 : 0.75))).toBeLessThan(0.5 / SWEPT_LIFT_STEPS + 1e-6);
      expect(foam).toBe(0);
    });
    // Dev: no crest's foam at all (`brokenFoam` off): the lift as it is.
    swept.brokenFoam = false;
    swept.update(loft, new Float32Array([1, 0.25]));
    attribute(swept, loft).forEach((value, v) => expect(Math.abs(unpack(value)[0] - loft.lift[v])).toBeLessThan(0.5 / SWEPT_LIFT_STEPS + 1e-6));
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

  it('draws a clean crest’s curl as before: its foam weight is the loft’s lift, and its lip carries none before touchdown', async () => {
    for (const foam of [0, 0.3, BROKEN_CREST.clean]) {
      const { loft, lift } = await drawn(foam);
      expect(loft.vertexCount).toBeGreaterThan(0);
      Array.from(lift).forEach((value, v) => {
        expect(Math.abs(unpack(value)[0] - loft.lift[v])).toBeLessThan(0.5 / SWEPT_LIFT_STEPS + 1e-6);
        if (loft.sliceAfter[Math.floor(v / LOFT_SAMPLES)] <= 0) expect(unpack(value)[1]).toBeLessThan(1e-9);
      });
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
    // Its lifted water carries the crest's foam (T3), capped where the lip is a sheet; resting, the water's own.
    const carried = Array.from(white.lift, (value) => unpack(value)[1]);
    expect(Math.max(...carried)).toBeGreaterThan(0.9);
    for (let v = 0; v < white.loft.vertexCount; v += 1) {
      if (white.loft.sheetWeight[v] >= 0.999) expect(carried[v]).toBeLessThanOrEqual(LIP_FOAM.cap + 1e-3);
    }
    const [x, y, z] = white.loft.positions.subarray(3 * (10 * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.throat), 3 * (10 * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.throat) + 3);
    expect(white.barrel.waterAt(x, y, z)).toBe(clean.barrel.waterAt(x, y, z));
    // Dev: drawn as before with the switch off, on the same snapshot.
    white.barrel.mesh.brokenFoam = false;
    white.barrel.draw(white.front, 21, 0);
    const lift = (white.barrel.mesh.mesh.geometry.getAttribute('sweptLift') as BufferAttribute).array.slice(0, white.loft.vertexCount);
    expect(Array.from(lift)).toEqual(Array.from(clean.lift));
    // `?lipFoam=old`: the lift less the kept share (all of it here): the water's foam under the curl, as before T3.
    white.barrel.mesh.brokenFoam = true;
    white.barrel.mesh.lipFoam = 'old';
    white.barrel.draw(white.front, 21, 0);
    const old = (white.barrel.mesh.mesh.geometry.getAttribute('sweptLift') as BufferAttribute).array.slice(0, white.loft.vertexCount);
    expect(Math.max(...Array.from(old))).toBe(0);
  });
});
