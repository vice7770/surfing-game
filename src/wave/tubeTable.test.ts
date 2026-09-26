import { describe, expect, it } from 'vitest';
import { tubeFloorDepth } from './Overturn';
import { TUBE_STRIDE, carveAt, carveGrid, tubeFloor } from './tubeTable';

const tube = (column: number, over: Partial<Record<'crestX' | 'crestZ' | 'y' | 'open' | 'scale', number>> = {}) => [
  over.crestX ?? column + 0.5, over.crestZ ?? 0, over.y ?? 2, 0, 1, over.open ?? 3, 2, 0.8, 0.6, column, over.scale ?? 1, 0,
];

describe('tube table', () => {
  it('puts the floor where tubeFloorDepth does, ahead of the crest along its travel', () => {
    const table = tube(4);
    expect(tubeFloor(table, 0, 4.5, 0.7)).toBeCloseTo(2 - tubeFloorDepth({ length: 2, width: 0.8, tilt: 0.6 }, 0.7), 12);
    expect(tubeFloor(table, 0, 4.5, -0.1)).toBeNaN();
    expect(tubeFloor(tube(4, { open: 0.5 }), 0, 4.5, 0.7)).toBeNaN();
    expect(tubeFloor(tube(4, { scale: 0 }), 0, 4.5, 0.7)).toBeNaN();
  });

  it('shrinks the void toward its crest as its scale falls', () => {
    const half = tubeFloor(tube(4, { scale: 0.5 }), 0, 4.5, 0.3);
    expect(half).toBeCloseTo(2 - tubeFloorDepth({ length: 1, width: 0.4, tilt: 0.6 }, 0.3), 12);
    expect(half).toBeGreaterThan(tubeFloor(tube(4), 0, 4.5, 0.3));
  });

  it('carves a column centre exactly as that column’s tube, and blends linearly toward an uncarved neighbour', () => {
    const table = tube(4);
    const floor = tubeFloor(table, 0, 4.5, 0.7);
    expect(carveAt(table, 1, 1, 4.5, 0.7, 5)).toBeCloseTo(floor, 12);
    expect(carveAt(table, 1, 1, 5.5, 0.7, 5)).toBe(5);
    expect(carveAt(table, 1, 1, 5, 0.7, 5)).toBeCloseTo((floor + 5) / 2, 12);
    expect(carveAt([], 0, 1, 5, 0.7, 5)).toBe(5);
  });

  it('interpolates the tube itself between neighbouring columns that both hold one, so a peel’s stages do not saw the void', () => {
    // Column 5 threw later: its crest is behind and its void less open.
    const table = [...tube(4, { crestZ: 0.4, open: 3 }), ...tube(5, { crestZ: 0, open: 0.8 })];
    const between = [4.5 + 0.5, 0.2, 2, 0, 1, 1.9, 2, 0.8, 0.6, 4.5, 1, 0];
    expect(carveAt(table, 2, 1, 5, 0.9, 5)).toBeCloseTo(tubeFloor(between, 0, 5, 0.9), 12);
    // At a column centre it is that column's own tube.
    expect(carveAt(table, 2, 1, 4.5, 0.9, 5)).toBeCloseTo(tubeFloor(table, 0, 4.5, 0.9), 12);
    // Beyond the less open tube's reach, the interpolated one still reaches: no step at column 5's opening.
    expect(carveAt(table, 2, 1, 5, 1.5, 5)).toBeLessThan(5);
  });

  it('interpolates only between tubes of one peel: neighbours far apart along their travel, or facing apart, just blend', () => {
    const blend = (table: number[], x: number, z: number) => {
      const t = x - 4.5;
      const f0 = tubeFloor(table, 0, x, z);
      const f1 = tubeFloor(table, 1, x, z);
      const m0 = f0 === f0 ? Math.min(5, f0) : 5;
      const m1 = f1 === f1 ? Math.min(5, f1) : 5;
      return m0 + (m1 - m0) * t;
    };
    const apart = [...tube(4, { crestZ: 0 }), ...tube(5, { crestZ: 5 })];
    for (const z of [0.3, 1.5, 2.5, 5.5]) expect(carveAt(apart, 2, 1, 5, z, 5)).toBeCloseTo(blend(apart, 5, z), 12);
    const facing = [...tube(4), ...tube(5)];
    facing[12 + 4] = -1; // column 5's crest runs the other way
    for (const z of [-3, 0.2, 0.7, 4]) expect(carveAt(facing, 2, 1, 5, z, 5)).toBeCloseTo(blend(facing, 5, z), 12);
  });

  it('keeps a second, lower tube of a column between column centres too', () => {
    const table = [...tube(4, { open: 3 }), ...tube(5, { open: 2.8 }), ...tube(4, { y: 1, open: 1 })];
    const [x, z] = [4.8, 0.5];
    const m0 = Math.min(tubeFloor(table, 0, x, z), tubeFloor(table, 2, x, z));
    const m1 = tubeFloor(table, 1, x, z);
    const blend = m0 + (m1 - m0) * (x - 4.5);
    expect(tubeFloor(table, 2, x, z)).toBeLessThan(tubeFloor(table, 0, x, z));
    expect(carveAt(table, 3, 1, x, z, 5)).toBeLessThanOrEqual(blend + 1e-9);
  });

  it('keeps the lower floor where two tubes of one column overlap, and never raises the surface', () => {
    const table = [...tube(4, { y: 2 }), ...tube(4, { y: 1.5 })];
    expect(carveAt(table, 2, 1, 4.5, 0.7, 5)).toBeCloseTo(tubeFloor(table, 1, 4.5, 0.7), 12);
    expect(carveAt(table, 2, 1, 4.5, 0.7, 0)).toBe(0);
  });

  it('carves each render node once, from its raw height, inside the tubes’ reach only', () => {
    const grid = { xMin: 0, zMin: -2, spacing: 1, nx: 10, nz: 6 };
    const data = new Float32Array(grid.nx * grid.nz * 2).fill(5);
    const table = [...tube(4), ...tube(4, { y: 1.5 })];
    carveGrid(data, grid, table, 2, 1);
    let carved = 0;
    for (let j = 0; j < grid.nz; j += 1) {
      for (let i = 0; i < grid.nx; i += 1) {
        const k = (j * grid.nx + i) * 2;
        expect(data[k]).toBeCloseTo(carveAt(table, 2, 1, i, grid.zMin + j, 5), 5);
        expect(data[k + 1]).toBe(5);
        if (data[k] < 5) carved += 1;
      }
    }
    expect(carved).toBeGreaterThan(0);
  });

  it('leaves the grid alone with no tubes, or tubes outside it', () => {
    const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 4, nz: 4 };
    const data = new Float32Array(grid.nx * grid.nz * 2).fill(5);
    carveGrid(data, grid, [], 0, 1);
    carveGrid(data, grid, tube(40), 1, 1);
    expect(Array.from(data).every((value) => value === 5)).toBe(true);
  });

  it('packs to TUBE_STRIDE', () => {
    expect(tube(0)).toHaveLength(TUBE_STRIDE);
  });
});
