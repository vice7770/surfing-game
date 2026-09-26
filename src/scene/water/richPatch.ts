import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { SurfaceGrid } from '../WaterSurface';

/** The dense patch drawn where the camera looks (G8): its side and vertex spacing, m. */
export const PATCH_SIZE = 96;
export const PATCH_SPACING = 0.25;
/** How far the skirt hangs below the surface to hide seams with the coarse water, m. */
export const PATCH_SKIRT = 0.3;

/** Rich vertex pars: the patch's skirt and flag. */
export const richPatchVertexPars = /* glsl */ `
attribute float skirt;
attribute float patch;
varying float vPatch;
`;

/** Rich fragment pars and the coarse water's discard under the patch (inset half a metre so the two overlap). */
export const richPatchFragmentPars = /* glsl */ `
uniform vec4 waterPatchRect;
uniform float waterPatchActive;
varying float vPatch;
`;
export const richPatchDiscard = /* glsl */ `
if ( vPatch < 0.5 && waterPatchActive > 0.5
  && all( greaterThan( vWaterWorld.xz, waterPatchRect.xy + 0.5 ) ) && all( lessThan( vWaterWorld.xz, waterPatchRect.zw - 0.5 ) ) ) discard;
`;

export interface PatchRect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/**
 * Where the dense patch goes: centred 0.3 of its size ahead of the camera
 * along its ground direction, its corner on a render node (so its vertices
 * include every node), and kept inside the grid (narrowed to a grid smaller
 * than it).
 */
export function patchRect(camera: { x: number; z: number; dirX: number; dirZ: number }, grid: SurfaceGrid, size = PATCH_SIZE): PatchRect {
  const extentX = (grid.nx - 1) * grid.spacing;
  const extentZ = (grid.nz - 1) * grid.spacing;
  const width = Math.min(size, extentX);
  const depth = Math.min(size, extentZ);
  const length = Math.hypot(camera.dirX, camera.dirZ) || 1;
  const centreX = camera.x + (camera.dirX / length) * 0.3 * size;
  const centreZ = camera.z + (camera.dirZ / length) * 0.3 * size;
  const snap = (value: number, origin: number) => origin + Math.round((value - origin) / grid.spacing) * grid.spacing;
  const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
  const x0 = clamp(snap(centreX - width / 2, grid.xMin), grid.xMin, grid.xMin + extentX - width);
  const z0 = clamp(snap(centreZ - depth / 2, grid.zMin), grid.zMin, grid.zMin + extentZ - depth);
  return { x0, z0, x1: x0 + width, z1: z0 + depth };
}

/**
 * A flat `size` × `size` grid in xz, centred on the origin, at `spacing`,
 * facing up, and a skirt: the rim again with `skirt` = 1, which the vertex
 * shader hangs below the surface, joined to the rim by outward-facing quads.
 */
export function createPatchGeometry(size: number, spacing: number): BufferGeometry {
  const n = Math.round(size / spacing) + 1;
  const positions: number[] = [];
  const skirt: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      positions.push(-size / 2 + i * spacing, 0, -size / 2 + j * spacing);
      skirt.push(0);
    }
  }
  for (let j = 0; j < n - 1; j += 1) {
    for (let i = 0; i < n - 1; i += 1) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // The rim, walked along −z's edge (+x), +x's edge (+z), +z's edge (−x), then −x's edge (−z).
  const rim: number[] = [];
  for (let i = 0; i < n - 1; i += 1) rim.push(i);
  for (let j = 0; j < n - 1; j += 1) rim.push(j * n + n - 1);
  for (let i = n - 1; i > 0; i -= 1) rim.push((n - 1) * n + i);
  for (let j = n - 1; j > 0; j -= 1) rim.push(j * n);
  const first = n * n;
  rim.forEach((top) => {
    positions.push(positions[top * 3], 0, positions[top * 3 + 2]);
    skirt.push(1);
  });
  for (let k = 0; k < rim.length; k += 1) {
    const top = rim[k];
    const nextTop = rim[(k + 1) % rim.length];
    const bottom = first + k;
    const nextBottom = first + ((k + 1) % rim.length);
    indices.push(top, nextTop, bottom, nextTop, nextBottom, bottom);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('skirt', new Float32BufferAttribute(skirt, 1));
  // 1 on every patch vertex: the coarse water lacks the attribute and reads 0, so one material tells them apart.
  geometry.setAttribute('patch', new Float32BufferAttribute(new Float32Array(skirt.length).fill(1), 1));
  geometry.setIndex(indices);
  return geometry;
}
