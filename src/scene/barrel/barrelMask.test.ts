import { describe, expect, it } from 'vitest';
import type { LoftResult } from '../../wave/barrel/sweptLoft';
import { LIFTED, rasterizeBarrelMask } from './barrelMask';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 10, nz: 10 };
/** One quad over x 2–6, z 2–6: mask 1 on its x = 2 side, 0 on its x = 6 side. */
function quad(): LoftResult {
  const positions = new Float32Array([2, 0, 2, 6, 0, 2, 2, 0, 6, 6, 0, 6]);
  return {
    positions, normals: new Float32Array(12), mask: new Float32Array([1, 0, 1, 0]), lift: new Float32Array(4), sheet: new Float32Array(4), sheetWeight: new Float32Array(4), sheetBack: new Float32Array(4), throat: new Float32Array(16), indices: new Uint32Array([0, 1, 2, 1, 3, 2]),
    vertexCount: 4, indexCount: 6, sliceCount: 2, sliceFront: new Int32Array(2), sliceSigma: new Float32Array(2), sliceTau: new Float32Array(2),
    slicePhase: new Uint8Array(2), sliceCrestOffset: new Float32Array(2), sliceLife: new Float32Array(2), sliceCollapse: new Float32Array(2),
    sliceFade: new Float32Array(2).fill(1), sliceTipGap: new Float32Array(2), tipGap: 0, sliceRestHold: new Float32Array(2), sliceRestEnd: new Float32Array(2),
    sliceRestClimb: new Float32Array(2), sliceToeClimb: new Float32Array(2), restSamples: 0, clamps: 0, clampedLookups: 0, caps: 0, overlaps: 0, overlapsOpen: 0, overlapOpenWeight: 0,
    sliceJoined: new Uint8Array([1, 0]), sliceRayX: new Float32Array(2), sliceRayZ: new Float32Array(2).fill(1), sliceWeight: new Float32Array(2).fill(1),
    sliceOverturned: new Uint8Array(2), sliceTipAlong: new Float32Array(2), sliceTipUp: new Float32Array(2), sliceAnchorVX: new Float32Array(2),
    sliceAnchorVZ: new Float32Array(2), sliceFormed: new Float32Array(2), sliceTipX: new Float32Array(2), sliceTipY: new Float32Array(2),
    sliceTipZ: new Float32Array(2), sliceMouth: new Float32Array(2),
  };
}

describe('the barrel mask', () => {
  it('rasterises the loft’s footprint on the render grid’s nodes, interpolated, zero outside', () => {
    const out = new Uint8Array(100);
    // The quad covers the 25 nodes x 2–6 × z 2–6; the 5 at x = 6 read 0, so 20 are set. At x = 4 the mask is 0.5, 128.
    expect(rasterizeBarrelMask(quad(), grid, out)).toBe(20);
    expect(out[3 * 10 + 2]).toBe(255);
    expect(out[3 * 10 + 4]).toBe(128);
    expect(out[3 * 10 + 6]).toBe(0);
    expect(out[1 * 10 + 3]).toBe(0);
  });

  // Review Focus 3.
  it('writes nothing outside the grid for a footprint running off it', () => {
    const loft = quad();
    loft.positions.set([8, 0, 8, 14, 0, 8, 8, 0, 14, 14, 0, 14]);
    const out = new Uint8Array(100);
    rasterizeBarrelMask(loft, grid, out);
    expect(out[9 * 10 + 8]).toBe(255);
    expect(out.length).toBe(100);
  });
});

/**
 * A loft over the grid as a sheet of quads: columns at x (the profile, along +x), rows at z (the slices), each vertex's
 * mask and lift from its x.
 */
function sheet(xs: number[], zs: number[], at: (x: number) => { mask: number; lift: number }): LoftResult {
  const loft = quad();
  const n = xs.length;
  const positions = new Float32Array(3 * n * zs.length);
  const mask = new Float32Array(n * zs.length);
  const lift = new Float32Array(n * zs.length);
  zs.forEach((z, r) => xs.forEach((x, c) => {
    const v = r * n + c;
    positions.set([x, 0, z], 3 * v);
    ({ mask: mask[v], lift: lift[v] } = at(x));
  }));
  const indices: number[] = [];
  for (let r = 0; r + 1 < zs.length; r += 1) {
    for (let c = 0; c + 1 < n; c += 1) {
      const v = r * n + c;
      indices.push(v, v + n, v + 1, v + 1, v + n, v + n + 1);
    }
  }
  return { ...loft, positions, mask, lift, indices: new Uint32Array(indices), vertexCount: n * zs.length, indexCount: indices.length };
}
const steps = (from: number, to: number, step: number) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, k) => from + k * step);
/** The texture's value at (x, z): bilinear over the node-centred texels, as the shader's `waterBarrelMaskAt`. */
function sampled(out: Uint8Array, x: number, z: number): number {
  const [i, k] = [Math.floor(x), Math.floor(z)];
  const [tx, tz] = [x - i, z - k];
  const node = (a: number, b: number) => out[b * 10 + a] / 255;
  return (node(i, k) * (1 - tx) + node(i + 1, k) * tx) * (1 - tz) + (node(i, k + 1) * (1 - tx) + node(i + 1, k + 1) * tx) * tz;
}

describe('the barrel mask round the lifted curl (look-fix round 1)', () => {
  // Lifted to x 3.4, resting from 4.1; the mask full to 4.1 and falling to 0 over the metre past it.
  const ramp = (x: number) => ({
    lift: x <= 3.4 ? 1 : x >= 4.1 ? 0 : (4.1 - x) / 0.7,
    mask: Math.min(1, Math.max(0, 1 - (x - 4.1))),
  });

  it('is full wherever the curl is lifted, so the water never shows through it, and its band lies on the resting curl', () => {
    const loft = sheet(steps(1, 8.5, 0.25), steps(1, 8, 0.5), ramp);
    const out = new Uint8Array(100);
    rasterizeBarrelMask(loft, grid, out);
    for (const x of steps(1.5, 4.0, 0.05)) {
      for (const z of steps(1.5, 7.5, 0.25)) {
        if (ramp(x).lift > LIFTED) expect(sampled(out, x, z), `at ${x}, ${z}`).toBeGreaterThanOrEqual(0.999);
      }
    }
    // Before the fill the filter brought the band up the ramp: the node at x 4 read 1, at x 5 0.1.
    expect(out[4 * 10 + 5]).toBe(255);
    // The band: past the filled nodes the mask falls as the loft's own, over the resting curl.
    expect(sampled(out, 5.5, 4)).toBeLessThan(0.999);
    expect(sampled(out, 5.5, 4)).toBeGreaterThan(0);
    expect(out[4 * 10 + 7]).toBe(0);
  });

  it('never makes full a node whose cells the loft does not cover, so no hole opens where it draws nothing', () => {
    // The loft ends at x 4.25, still lifted at 0.4 (the end of a run): the cell beyond it has no curl.
    const loft = sheet(steps(1, 4.25, 0.25), steps(1, 8, 0.5), (x) => ({ lift: x <= 3.4 ? 1 : 0.4, mask: 1 }));
    const out = new Uint8Array(100);
    rasterizeBarrelMask(loft, grid, out);
    for (let k = 1; k < 8; k += 1) {
      expect(out[k * 10 + 4]).toBe(255);
      expect(out[k * 10 + 5]).toBe(0);
    }
    // Every point the water would give way at (the four nodes round it full) lies under the loft.
    for (const x of steps(0.5, 8, 0.05)) {
      for (const z of steps(0.5, 8.5, 0.25)) {
        if (sampled(out, x, z) >= 0.999) expect(x >= 1 && x <= 4.25 && z >= 1 && z <= 8, `at ${x}, ${z}`).toBe(true);
      }
    }
  });

  it('leaves a curl resting wholly on the water as it was', () => {
    const resting = sheet(steps(1, 8.5, 0.25), steps(1, 8, 0.5), (x) => ({ ...ramp(x), lift: 0 }));
    const lifted = sheet(steps(1, 8.5, 0.25), steps(1, 8, 0.5), ramp);
    const [a, b] = [new Uint8Array(100), new Uint8Array(100)];
    rasterizeBarrelMask(resting, grid, a);
    rasterizeBarrelMask(lifted, grid, b);
    expect(a[4 * 10 + 5]).toBeLessThan(255);
    expect(Array.from(a).filter((v, n) => v !== b[n]).length).toBeGreaterThan(0);
    // Away from the lifted cells the two agree.
    for (let k = 0; k < 10; k += 1) for (const i of [7, 8, 9]) expect(a[k * 10 + i]).toBe(b[k * 10 + i]);
  });
});
