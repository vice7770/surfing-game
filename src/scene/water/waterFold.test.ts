import { describe, expect, it } from 'vitest';
import { sampleSurfaceBed, sampleSurfaceHeight } from '../WaterSurface';
import { sampleCubicSurface } from './cubicSurface';
import { foldGridX, foldSignX } from './waterFold';

const grid = { xMin: -20, zMin: -40, spacing: 1, nx: 41, nz: 31 };

describe('the water mirrored past its side edges (the edge mirror)', () => {
  it('reads a grid x past either side edge reflected across it, and anything inside unchanged', () => {
    expect(foldGridX(3.25, 11)).toBe(3.25);
    expect(foldGridX(0, 11)).toBe(0);
    expect(foldGridX(10, 11)).toBe(10);
    expect(foldGridX(-2.5, 11)).toBeCloseTo(2.5, 12);
    expect(foldGridX(12, 11)).toBeCloseTo(8, 12);
    // Past a whole width the reflection reflects again.
    expect(foldGridX(-13, 11)).toBeCloseTo(7, 12);
    expect(foldSignX(5, 11)).toBe(1);
    expect(foldSignX(-1, 11)).toBe(-1);
    expect(foldSignX(11, 11)).toBe(-1);
    expect(foldSignX(-13, 11)).toBe(1);
  });

  it('samples the surface and the bed mirrored along shore, and keeps 0 off the grid across shore', () => {
    const data = new Float32Array(grid.nx * grid.nz * 2);
    const bed = new Float32Array(grid.nx * grid.nz);
    for (let j = 0; j < grid.nz; j += 1) {
      for (let i = 0; i < grid.nx; i += 1) {
        data[(j * grid.nx + i) * 2] = 0.1 * i + 0.01 * j;
        bed[j * grid.nx + i] = -5 + 0.2 * i;
      }
    }
    expect(sampleSurfaceHeight(data, grid, -23, -30)).toBeCloseTo(sampleSurfaceHeight(data, grid, -17, -30), 6);
    expect(sampleSurfaceHeight(data, grid, 24.5, -30)).toBeCloseTo(sampleSurfaceHeight(data, grid, 15.5, -30), 6);
    expect(sampleSurfaceBed(bed, grid, -26, -30)).toBeCloseTo(sampleSurfaceBed(bed, grid, -14, -30), 6);
    // The +x edge's own nodes are drawn at their height (they read 0 before the mirror).
    expect(sampleSurfaceHeight(data, grid, 20, -30)).toBeCloseTo(0.1 * 40 + 0.01 * 10, 5);
    expect(sampleSurfaceHeight(data, grid, 0, -50)).toBe(0);
    expect(sampleCubicSurface(data, grid, -23.5, -30).height).toBeCloseTo(sampleCubicSurface(data, grid, -16.5, -30).height, 6);
    expect(sampleCubicSurface(data, grid, -16.5, -30).slopeX).toBeCloseTo(-sampleCubicSurface(data, grid, -23.5, -30).slopeX, 6);
  });
});
