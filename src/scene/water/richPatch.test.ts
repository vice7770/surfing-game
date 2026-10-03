import { describe, expect, it } from 'vitest';
import { PATCH_OVERLAP, PATCH_SIZE, PATCH_SPACING, createPatchGeometry, patchOverlap, patchRect, richPatchDiscard } from './richPatch';

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

describe('the seam between the patch and the coarse water', () => {
  it('overlaps by half the pixel\'s footprint with margin, never under the old half metre nor past the cap', () => {
    expect(patchOverlap(0)).toBe(PATCH_OVERLAP.min);
    expect(patchOverlap(0.2)).toBe(0.5);
    expect(patchOverlap(1)).toBeCloseTo(1.5, 12);
    // The lineup's horizon at sunset: a pixel of 6 m of water, 77 m out from a 1.6 m eye, takes 9 m (a fixed 3 m removed the line there).
    expect(patchOverlap(6)).toBeCloseTo(9, 12);
    expect(patchOverlap(100)).toBe(PATCH_OVERLAP.max);
    let last = 0;
    for (let footprint = 0; footprint < 20; footprint += 0.1) {
      const overlap = patchOverlap(footprint);
      expect(overlap).toBeGreaterThanOrEqual(last);
      last = overlap;
    }
  });

  it('is in the Rich discard as the footprint, taken before the first discard, and no longer as half a metre', () => {
    expect(richPatchDiscard).toContain('vec2 richPatchFoot = fwidth( vWaterWorld.xz );');
    expect(richPatchDiscard).toContain('float richPatchOverlap = clamp( 1.5 * max( richPatchFoot.x, richPatchFoot.y ), 0.5, 16.0 );');
    expect(richPatchDiscard.indexOf('fwidth(')).toBeLessThan(richPatchDiscard.indexOf('discard;'));
    expect(richPatchDiscard).toContain('waterPatchRect.xy + richPatchOverlap');
    expect(richPatchDiscard).toContain('waterPatchRect.zw - richPatchOverlap');
    expect(richPatchDiscard).not.toContain('+ 0.5 )');
    expect(richPatchDiscard).toContain('if ( vWaterSkirt > 0.001 && !gl_FrontFacing ) discard;');
  });
});
