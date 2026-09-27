import { describe, expect, it } from 'vitest';
import { tubeFloorDepth } from '../../wave/Overturn';
import { PEEL_ALIGNMENT, PEEL_GAP, TUBE_CAPACITY, TUBE_EDGE, TUBE_STRIDE, carveAt } from '../../wave/tubeTable';
import { packTubeTextures, tubeColumnCount, tubeFloorDepthApprox, waterTubePars } from './tubeCarve';

const grid = { xMin: 10, zMin: -50, spacing: 1, nx: 30, nz: 40 };
const row = (column: number, width = 0.8) => [column + 0.5, -20, 2, 0, 1, 3, 2, width, 0.6, column, 1, 0];
const buffers = () => ({ tubes: new Float32Array(3 * 4 * TUBE_CAPACITY), columns: new Float32Array(tubeColumnCount(grid, 1) * 2) });

describe('the GPU tube carve', () => {
  it('follows tubeFloorDepth to within 5 mm with its short bisection', () => {
    for (const shape of [{ length: 2, width: 0.8, tilt: 0.6 }, { length: 1.2, width: 0.4, tilt: 0.9 }, { length: 3, width: 1.3, tilt: 0.4 }]) {
      for (let ahead = 0; ahead <= shape.length * Math.cos(shape.tilt); ahead += 0.05) {
        expect(Math.abs(tubeFloorDepthApprox(shape.length, shape.width, shape.tilt, ahead) - tubeFloorDepth(shape, ahead))).toBeLessThan(0.005);
      }
      expect(tubeFloorDepthApprox(shape.length, shape.width, shape.tilt, -0.1)).toBeNaN();
    }
  });

  it('sorts tubes by column and points each column at its own', () => {
    const table = [...row(20), ...row(15), ...row(20, 0.5)];
    const { tubes, columns } = buffers();
    const packed = packTubeTextures(table, 3, grid, 1, tubes, columns);
    expect(packed.count).toBe(3);
    const at = (column: number) => [columns[(column - packed.column0) * 2], columns[(column - packed.column0) * 2 + 1]];
    expect(at(15)).toEqual([0, 1]);
    expect(at(20)).toEqual([1, 2]);
    expect(at(16)).toEqual([0, 0]);
    expect(tubes[9]).toBe(15);
    expect(tubes[12 + 9]).toBe(20);
    expect(tubes[24 + 9]).toBe(20);
  });

  it('indexes tubes by world column across a window shift', () => {
    const { tubes, columns } = buffers();
    const before = packTubeTextures(row(20), 1, grid, 1, tubes, columns);
    const after = packTubeTextures(row(20), 1, { ...grid, xMin: grid.xMin + 7 }, 1, tubes, columns);
    expect(after.column0 - before.column0).toBe(7);
    expect(columns[(20 - after.column0) * 2 + 1]).toBe(1);
  });

  it('keeps the eight biggest voids of a crowded column, drops tubes outside the grid, and clamps the count', () => {
    const crowded: number[] = [];
    for (let k = 0; k < 10; k += 1) crowded.push(...row(20, 0.1 + 0.1 * k));
    const { tubes, columns } = buffers();
    const packed = packTubeTextures(crowded, 10, grid, 1, tubes, columns);
    expect(packed.count).toBe(8);
    const widths = Array.from({ length: 8 }, (_, k) => tubes[k * 12 + 7]);
    expect(Math.min(...widths)).toBeCloseTo(0.3, 5);
    const outside = packTubeTextures([...row(200), ...row(-40)], 2, grid, 1, tubes, columns);
    expect(outside.count).toBe(0);
    const many: number[] = [];
    for (let k = 0; k < TUBE_CAPACITY + 5; k += 1) many.push(...row(12 + (k % 20)));
    expect(packTubeTextures(many, TUBE_CAPACITY + 5, grid, 1, tubes, columns).count).toBeLessThanOrEqual(TUBE_CAPACITY);
  });

  it('agrees with the physics’ carve: one tube, a peel of two, a tube beside none, unrelated neighbours, a shifted grid, a shut tube, collapsing tubes', () => {
    const tube = (column: number, crestZ: number, open: number, dirZ = 1, scale = 1) => [column + 0.5, crestZ, 2, 0, dirZ, open, 2, 0.8, 0.6, column, scale, 0];
    const cases: { table: number[]; count: number; xMin: number }[] = [
      { table: tube(14, 0, 3), count: 1, xMin: 10 },
      { table: [...tube(14, 0.4, 3), ...tube(15, 0, 0.8)], count: 2, xMin: 10 },
      { table: [...tube(14, 0, 3), ...tube(15, 5, 3)], count: 2, xMin: 10 },
      { table: [...tube(14, 0, 3), ...tube(15, 0, 3, -1)], count: 2, xMin: 10 },
      { table: [...tube(21, 0.4, 3), ...tube(22, 0, 1.2)], count: 2, xMin: 17 },
      { table: tube(14, 0, 0), count: 1, xMin: 10 },
      // G9: a collapsing tube alone, and one collapsing beside an open one of its peel.
      { table: tube(14, 0, 3, 1, 0.55), count: 1, xMin: 10 },
      { table: [...tube(14, 0.4, 3, 1, 0.35), ...tube(15, 0, 1.6)], count: 2, xMin: 10 },
    ];
    for (const { table, count, xMin } of cases) {
      const g = { ...grid, xMin };
      const { tubes, columns } = buffers();
      const packed = packTubeTextures(table, count, g, 1, tubes, columns);
      for (let x = xMin + 3.6; x <= xMin + 6.4; x += 0.1) {
        // Off the void's back and front edges, where the floor steps and 32-bit texels fall either side of 64-bit ones.
        for (let z = -0.95; z <= 6; z += 0.1) {
          const gpu = gpuCarve(tubes, columns, packed.column0, packed.count, 1, x, z, 5);
          expect(Math.abs(gpu - carveAt(table, count, 1, x, z, 5))).toBeLessThan(0.005);
        }
      }
    }
  });

  it('has a GLSL twin that carves and gives a carved surface its slope', () => {
    expect(waterTubePars).toContain('float waterCarve( vec2 xz, float surface )');
    expect(waterTubePars).toContain('vec3 waterCarvedCubic( vec2 xz )');
    // The gate and the minimum the JS mirror above follows.
    expect(waterTubePars).toContain(`if ( abs( gap ) <= ${PEEL_GAP.toFixed(3)} && alignment >= ${PEEL_ALIGNMENT.toFixed(3)} )`);
    expect(waterTubePars).toContain('return min( blended, waterTubeFloorOf( a, b, c, xz ) );');
    // The floor meets the surface over an edge, as the physics' carve does (TUBE_EDGE).
    expect(waterTubePars).toContain(`float edge = smoothstep( 0.0, ${TUBE_EDGE.toFixed(3)}, ahead );`);
    expect(TUBE_STRIDE).toBeLessThanOrEqual(12);
  });
});

/** A line-for-line JS mirror of the GLSL waterCarve, reading the packed textures as the shader does. */
function gpuCarve(tubes: Float32Array, columns: Float32Array, column0: number, count: number, width: number, x: number, z: number, surface: number): number {
  if (count < 0.5) return surface;
  const texel = (column: number, row: number) => tubes.subarray(row * 12 + column * 4, row * 12 + column * 4 + 4);
  const floorOf = (a: ArrayLike<number>, b: ArrayLike<number>, c: ArrayLike<number>) => {
    const ahead = (x - a[0]) * a[3] + (z - a[1]) * b[0];
    if (ahead < 0 || ahead > b[1] || c[2] <= 0) return 1e6;
    const depth = tubeFloorDepthApprox(b[2] * c[2], b[3] * c[2], c[0], ahead);
    const t = Math.min(1, Math.max(0, ahead / TUBE_EDGE));
    return depth === depth ? a[2] - depth * t * t * (3 - 2 * t) : 1e6;
  };
  const span = (column: number) => {
    const c = column - column0;
    return c < 0 || c >= columns.length / 2 ? [0, 0] : [columns[c * 2], columns[c * 2 + 1]];
  };
  const columnCarve = (column: number) => {
    const [first, n] = span(column);
    let carved = surface;
    for (let i = 0; i < Math.min(n, 8); i += 1) carved = Math.min(carved, floorOf(texel(0, first + i), texel(1, first + i), texel(2, first + i)));
    return carved;
  };
  const mostOpen = (column: number) => {
    const [first, n] = span(column);
    let best = -1;
    let open = -1;
    for (let i = 0; i < Math.min(n, 8); i += 1) if (texel(1, first + i)[1] > open) (open = texel(1, first + i)[1]), (best = first + i);
    return best;
  };
  const u = x / width - 0.5;
  const c0 = Math.floor(u);
  const t = u - c0;
  const blended = columnCarve(c0) + (columnCarve(c0 + 1) - columnCarve(c0)) * t;
  const k0 = mostOpen(c0);
  const k1 = mostOpen(c0 + 1);
  if (k0 >= 0 && k1 >= 0) {
    const [a0, b0, e0] = [texel(0, k0), texel(1, k0), texel(2, k0)];
    const [a1, b1, e1] = [texel(0, k1), texel(1, k1), texel(2, k1)];
    const gap = (a1[0] - a0[0]) * a0[3] + (a1[1] - a0[1]) * b0[0];
    const alignment = a0[3] * a1[3] + b0[0] * b1[0];
    if (Math.abs(gap) <= PEEL_GAP && alignment >= PEEL_ALIGNMENT) {
      const mix = (p: ArrayLike<number>, q: ArrayLike<number>) => Array.from({ length: 4 }, (_, k) => p[k] + (q[k] - p[k]) * t);
      const [a, b, e] = [mix(a0, a1), mix(b0, b1), mix(e0, e1)];
      const length = Math.hypot(a[3], b[0]);
      a[3] /= length;
      b[0] /= length;
      return Math.min(blended, floorOf(a, b, e));
    }
  }
  return blended;
}
