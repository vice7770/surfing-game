import { describe, expect, it } from 'vitest';
import { tubeFloorDepth } from '../../wave/Overturn';
import { TUBE_CAPACITY, TUBE_STRIDE } from '../../wave/tubeTable';
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

  it('has a GLSL twin that carves and gives a carved surface its slope', () => {
    expect(waterTubePars).toContain('float waterCarve( vec2 xz, float surface )');
    expect(waterTubePars).toContain('vec3 waterCarvedCubic( vec2 xz )');
    expect(TUBE_STRIDE).toBeLessThanOrEqual(12);
  });
});
