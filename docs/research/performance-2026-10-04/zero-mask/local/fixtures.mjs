import assert from 'node:assert/strict';
import { replaceOnce } from './authority.mjs';

// Execute the exact frozen existing suite body with its two used assertion primitives.
export function existingRegression(source, rasterizeBarrelMask) {
  let body = replaceOnce(source, "import { describe, expect, it } from 'vitest';\n", '');
  body = replaceOnce(body, "import type { LoftResult } from '../../wave/barrel/sweptLoft';\n", '');
  body = replaceOnce(body, "import { rasterizeBarrelMask } from './barrelMask';\n", '');
  body = replaceOnce(body, 'function quad(): LoftResult {', 'function quad() {');
  assert(!/^import\b/m.test(body));
  const tests = [], describe = (_name, callback) => callback();
  const it = (name, callback) => { callback(); tests.push({ name, passed: true }); };
  const expect = actual => ({ toBe: expected => assert.equal(actual, expected) });
  new Function('describe', 'it', 'expect', 'rasterizeBarrelMask', '"use strict";\n' + body)(describe, it, expect, rasterizeBarrelMask);
  assert.equal(tests.length, 2, 'Existing suite shape changed; review in a new package');
  return tests;
}

// Positive and zero triangles share the exact footprint. Keep every triangle in both orders.
export function overlapFixture(original, candidate) {
  const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 10, nz: 10 };
  const quad = [2, 0, 2, 6, 0, 2, 2, 0, 6, 6, 0, 6];
  const positions = new Float32Array([...quad, ...quad]);
  const mask = new Float32Array([0, 0, 0, 0, 1, 0, 1, 0]);
  const zero = [0, 1, 2, 1, 3, 2], positive = [4, 5, 6, 5, 7, 6];
  const reference = { positions, mask, indices: new Uint32Array(positive), vertexCount: 8, indexCount: 6 };
  const expected = new Uint8Array(100).fill(255);
  assert.equal(original(reference, grid, expected), 20);
  assert.equal(expected[3 * 10 + 2], 255); assert.equal(expected[3 * 10 + 4], 128);
  assert.equal(expected[3 * 10 + 6], 0); assert.equal(expected[1 * 10 + 3], 0);
  const before = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(mask.buffer)]);
  const receipts = [];
  for (const [order, indices] of [['zero-then-positive', [...zero, ...positive]], ['positive-then-zero', [...positive, ...zero]]]) {
    const loft = { positions, mask, indices: new Uint32Array(indices), vertexCount: 8, indexCount: 12 };
    const indexBefore = Buffer.from(loft.indices.buffer).subarray().slice();
    for (const [name, raster] of [['original', original], ['candidate', candidate]]) {
      const out = new Uint8Array(100).fill(255), set = raster(loft, grid, out);
      assert.equal(set, 20); assert(Buffer.from(out).equals(Buffer.from(expected)), name + ' loses positive overlap support: ' + order);
      assert(Buffer.from(loft.indices.buffer).equals(indexBefore)); receipts.push({ order, function: name, set, fullByteParity: true });
    }
  }
  assert(Buffer.concat([Buffer.from(positions.buffer), Buffer.from(mask.buffer)]).equals(before));
  return { receipts, initialOutput: 'All255: exact expected off-footprint zeros verify full-call clear', positiveSupport: 'Exact standalone positive quad, both overlap orders', noRenderedIndexFiltering: true };
}
