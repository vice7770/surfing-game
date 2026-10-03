import { describe, expect, it } from 'vitest';
import { PATCH_SIZE, PATCH_SPACING, createPatchGeometry, patchRect } from './richPatch';

const grid = { xMin: -100, zMin: -60, spacing: 1, nx: 301, nz: 181 };

describe('the dense water patch', () => {
  it('sits ahead of the camera, snapped to whole render nodes', () => {
    const rect = patchRect({ x: 10.3, z: 5.8, dirX: 0, dirZ: -1 }, grid);
    expect(rect.x1 - rect.x0).toBe(PATCH_SIZE);
    expect(rect.z1 - rect.z0).toBe(PATCH_SIZE);
    expect(Number.isInteger(rect.x0 - grid.xMin)).toBe(true);
    expect(Number.isInteger(rect.z0 - grid.zMin)).toBe(true);
    expect((rect.z0 + rect.z1) / 2).toBeLessThan(5.8); // ahead of the camera (−z)
    expect(rect.x0).toBeLessThan(10.3);
    expect(rect.x1).toBeGreaterThan(10.3);
  });

  it('clamps the patch inside the grid when the camera is outside it', () => {
    const rect = patchRect({ x: 900, z: -400, dirX: 1, dirZ: 0 }, grid);
    expect(rect.x1).toBeLessThanOrEqual(grid.xMin + (grid.nx - 1) * grid.spacing);
    expect(rect.x0).toBeGreaterThanOrEqual(grid.xMin);
    expect(rect.z0).toBeGreaterThanOrEqual(grid.zMin);
    expect(rect.z1).toBeLessThanOrEqual(grid.zMin + (grid.nz - 1) * grid.spacing);
  });

  it('keeps the patch within a grid smaller than it', () => {
    const small = { xMin: 0, zMin: 0, spacing: 1, nx: 41, nz: 31 };
    expect(patchRect({ x: 20, z: 15, dirX: 0, dirZ: 1 }, small)).toEqual({ x0: 0, z0: 0, x1: 40, z1: 30 });
  });

  it('builds a quarter-metre grid with a skirt round its rim', () => {
    const geometry = createPatchGeometry(8, PATCH_SPACING);
    const n = 8 / PATCH_SPACING + 1;
    const rim = 4 * (n - 1);
    expect(geometry.getAttribute('position').count).toBe(n * n + rim);
    const skirt = geometry.getAttribute('skirt');
    let lowered = 0;
    for (let i = 0; i < skirt.count; i += 1) lowered += skirt.getX(i);
    expect(lowered).toBe(rim);
    // Every triangle index is in range, and the skirt adds two triangles per rim edge.
    const index = geometry.getIndex()!;
    expect(index.count).toBe(6 * (n - 1) * (n - 1) + 6 * rim);
    for (let i = 0; i < index.count; i += 1) expect(index.getX(i)).toBeLessThan(n * n + rim);
  });
});
