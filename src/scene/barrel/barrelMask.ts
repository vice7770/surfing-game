import type { LoftResult } from '../../wave/barrel/sweptLoft';
import type { SurfaceGrid } from '../WaterSurface';

/** A node this close outside a triangle, in barycentric weight, still counts as inside it (shared edges, rounding). */
const EDGE = 1e-6;

/**
 * The swept barrel's seam mask (the Padang Padang spec, Part B, PR 3): the loft's footprint seen from above, on the
 * render grid's nodes (`out[k * nx + i]`), 0–255. Each node takes the loft's mask interpolated across the triangle
 * over it, the most where triangles overlap (an overturned lip lies over its own face). Returns how many nodes are
 * set. Nodes off the grid are never written.
 */
export function rasterizeBarrelMask(loft: LoftResult, grid: SurfaceGrid, out: Uint8Array): number {
  out.fill(0);
  const { positions: p, mask, indices } = loft;
  const { xMin, zMin, spacing, nx, nz } = grid;
  for (let t = 0; t < loft.indexCount; t += 3) {
    const a = indices[t];
    const b = indices[t + 1];
    const c = indices[t + 2];
    const ax = p[3 * a];
    const az = p[3 * a + 2];
    const bx = p[3 * b];
    const bz = p[3 * b + 2];
    const cx = p[3 * c];
    const cz = p[3 * c + 2];
    const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
    if (area === 0) continue;
    const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - xMin) / spacing - EDGE));
    const i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - xMin) / spacing + EDGE));
    const k0 = Math.max(0, Math.ceil((Math.min(az, bz, cz) - zMin) / spacing - EDGE));
    const k1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - zMin) / spacing + EDGE));
    for (let k = k0; k <= k1; k += 1) {
      const z = zMin + k * spacing;
      for (let i = i0; i <= i1; i += 1) {
        const x = xMin + i * spacing;
        const wb = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / area;
        const wc = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / area;
        const wa = 1 - wb - wc;
        if (wa < -EDGE || wb < -EDGE || wc < -EDGE) continue;
        const value = Math.round(255 * (wa * mask[a] + wb * mask[b] + wc * mask[c]));
        const node = k * nx + i;
        if (value > out[node]) out[node] = Math.min(255, value);
      }
    }
  }
  let set = 0;
  for (let node = 0; node < nx * nz; node += 1) if (out[node] > 0) set += 1;
  return set;
}
