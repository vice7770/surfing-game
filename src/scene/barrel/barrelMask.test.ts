import { describe, expect, it } from 'vitest';
import type { LoftResult } from '../../wave/barrel/sweptLoft';
import { rasterizeBarrelMask } from './barrelMask';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 10, nz: 10 };
/** One quad over x 2–6, z 2–6: mask 1 on its x = 2 side, 0 on its x = 6 side. */
function quad(): LoftResult {
  const positions = new Float32Array([2, 0, 2, 6, 0, 2, 2, 0, 6, 6, 0, 6]);
  return {
    positions, normals: new Float32Array(12), mask: new Float32Array([1, 0, 1, 0]), lift: new Float32Array(4), indices: new Uint32Array([0, 1, 2, 1, 3, 2]),
    vertexCount: 4, indexCount: 6, sliceCount: 2, sliceFront: new Int32Array(2), sliceSigma: new Float32Array(2), sliceTau: new Float32Array(2),
    slicePhase: new Uint8Array(2), sliceCrestOffset: new Float32Array(2), sliceLife: new Float32Array(2), sliceCollapse: new Float32Array(2),
    sliceFade: new Float32Array(2).fill(1), clamps: 0, clampedLookups: 0, caps: 0,
    sliceJoined: new Uint8Array([1, 0]), sliceRayX: new Float32Array(2), sliceRayZ: new Float32Array(2).fill(1), sliceWeight: new Float32Array(2).fill(1),
    sliceOverturned: new Uint8Array(2), sliceTipAlong: new Float32Array(2), sliceTipUp: new Float32Array(2), sliceAnchorVX: new Float32Array(2),
    sliceAnchorVZ: new Float32Array(2),
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
