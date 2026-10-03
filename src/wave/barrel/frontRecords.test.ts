import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { FRONT_FIELD, FRONT_STRIDE, writeFrontRecords } from './frontRecords';

const point = (id: number, throwZ: number | null): FrontPoint => ({
  id, front: 3, column: id, sigma: id * 1.1, x: id + 0.5, z: -150 + id, b: 0.3, height: 1.7, joined: 5, depth: 3.1,
  throwDepth: 2.5, crestDepth: 2.4, thrown: throwZ === null ? null : 6, broke: 5.2, tau: 0.25 * id, seen: 7, fresh: null,
  footHeight: 1.6, footDepth: 7, throwZ,
});

describe('the front records the snapshot carries', () => {
  it('writes each point’s place, clock, foot and throw, NaN before the throw, and stops at capacity', () => {
    const out = new Float32Array(2 * FRONT_STRIDE);
    expect(writeFrontRecords([point(0, -151.5), point(1, null), point(2, null)], out)).toBe(2);
    expect(Array.from(out.subarray(0, FRONT_STRIDE))).toEqual([0.5, -150, 3, 0, 0, 1.600000023841858, 7, -151.5]);
    expect(out[FRONT_STRIDE + FRONT_FIELD.throwZ]).toBeNaN();
    expect(out[FRONT_STRIDE + FRONT_FIELD.tau]).toBeCloseTo(0.25, 6);
  });
});
