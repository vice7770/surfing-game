import type { LoftResult } from '../../wave/barrel/sweptLoft';
import type { SurfaceGrid } from '../WaterSurface';

/** A node this close outside a triangle, in barycentric weight, still counts as inside it (shared edges, rounding). */
const EDGE = 1e-6;

/**
 * How far off the water a triangle's vertex must be lifted (its lift, 0–1) for the water to be cut wholly around it
 * (look-fix round 1) [provisional: a lift of 0.02 stands the curl at most a few centimetres off the water where the
 * profile and the water are a metre apart, closer than the two surfaces' own triangles differ].
 */
export const LIFTED = 0.02;

/**
 * Sub-samples a side of a grid cell is tested on when a cell is checked to lie wholly under the loft (look-fix round 1):
 * 4, a quarter of a cell (0.25 m on the 1 m render grid). The loft's footprint has gaps only between its runs and
 * fronts, at least a slice spacing (0.5 m) wide, which these find [provisional].
 */
export const COVER_SAMPLES = 4;

const FULL_COVER = (1 << (COVER_SAMPLES * COVER_SAMPLES)) - 1;

/**
 * Per cell: 1 where a lifted triangle touches it; which of its sub-samples lie under the loft (a bit each), for the cells
 * round a node to fill; 1 where that cover is wanted. Reused between calls, and left all 0 after each.
 */
let liftedCells = new Uint8Array(0);
let cover = new Uint16Array(0);
let wanted = new Uint8Array(0);
/** The box of lifted cells this call (cell indices, inclusive). */
const box = { i0: 0, i1: -1, k0: 0, k1: -1 };

/**
 * Whether the edge (x0, z0) → (x1, z1) of a triangle whose third vertex is (x2, z2) separates it from the square of
 * half-size `r` about (px, pz): along the edge's normal, the square lies wholly beyond the triangle's span.
 */
function separates(x0: number, z0: number, x1: number, z1: number, x2: number, z2: number, px: number, pz: number, r: number): boolean {
  const nx = z1 - z0;
  const nz = x0 - x1;
  const along = nx * x0 + nz * z0;
  const third = nx * x2 + nz * z2;
  const centre = nx * px + nz * pz;
  const reach = r * (Math.abs(nx) + Math.abs(nz));
  return centre + reach < Math.min(along, third) - EDGE || centre - reach > Math.max(along, third) + EDGE;
}

/** Whether a triangle touches the square of half-size `r` about (px, pz), the square's own axes being the caller's box test. */
function touches(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, px: number, pz: number, r: number): boolean {
  return !(separates(ax, az, bx, bz, cx, cz, px, pz, r) || separates(bx, bz, cx, cz, ax, az, px, pz, r) || separates(cx, cz, ax, az, bx, bz, px, pz, r));
}

/**
 * The swept barrel's seam mask (the Padang Padang spec, Part B, PR 3): the loft's footprint seen from above, on the
 * render grid's nodes (`out[k * nx + i]`), 0–255. Each node takes the loft's mask interpolated across the triangle
 * over it, the most where triangles overlap (an overturned lip lies over its own face). Returns how many nodes are
 * set. Nodes off the grid are never written.
 *
 * The water gives way only where the mask is full (look-fix round 1, `BARREL_MASK_FULL`), and the texture is read with
 * linear filtering, so a point reads full only where the four nodes round it are. A lifted curl must stand wholly in
 * that cut: where it didn't, the water's hump would stand over the curl's rests, and the band, which blends the curl
 * into the water it rests on, would blend a lifted piece of it. So every node of a cell a lifted triangle touches
 * (`LIFTED`) is made full, if the loft lies wholly over the cells round it, so the water never gives way where the loft
 * draws nothing (the end of a run, a dropped strip); `COVER_SAMPLES` to a cell side. The mask's band then lies where the
 * curl rests on the water.
 */
export function rasterizeBarrelMask(loft: LoftResult, grid: SurfaceGrid, out: Uint8Array): number {
  out.fill(0);
  const { positions: p, mask, lift, indices } = loft;
  const { xMin, zMin, spacing, nx, nz } = grid;
  const cx1 = nx - 1;
  const cells = cx1 * (nz - 1);
  if (liftedCells.length !== cells) {
    liftedCells = new Uint8Array(cells);
    cover = new Uint16Array(cells);
    wanted = new Uint8Array(cells);
  }
  box.i0 = cx1;
  box.i1 = -1;
  box.k0 = nz;
  box.k1 = -1;
  const half = spacing / 2;
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
    const minX = Math.min(ax, bx, cx);
    const maxX = Math.max(ax, bx, cx);
    const minZ = Math.min(az, bz, cz);
    const maxZ = Math.max(az, bz, cz);
    const i0 = Math.max(0, Math.ceil((minX - xMin) / spacing - EDGE));
    const i1 = Math.min(nx - 1, Math.floor((maxX - xMin) / spacing + EDGE));
    const k0 = Math.max(0, Math.ceil((minZ - zMin) / spacing - EDGE));
    const k1 = Math.min(nz - 1, Math.floor((maxZ - zMin) / spacing + EDGE));
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
    if (!(lift[a] > LIFTED || lift[b] > LIFTED || lift[c] > LIFTED)) continue;
    // The cells (between nodes i, i + 1 and k, k + 1) the lifted triangle touches.
    const ci0 = Math.max(0, Math.floor((minX - xMin) / spacing));
    const ci1 = Math.min(nx - 2, Math.floor((maxX - xMin) / spacing));
    const ck0 = Math.max(0, Math.floor((minZ - zMin) / spacing));
    const ck1 = Math.min(nz - 2, Math.floor((maxZ - zMin) / spacing));
    for (let k = ck0; k <= ck1; k += 1) {
      for (let i = ci0; i <= ci1; i += 1) {
        if (liftedCells[k * cx1 + i] || !touches(ax, az, bx, bz, cx, cz, xMin + (i + 0.5) * spacing, zMin + (k + 0.5) * spacing, half)) continue;
        liftedCells[k * cx1 + i] = 1;
        box.i0 = Math.min(box.i0, i);
        box.i1 = Math.max(box.i1, i);
        box.k0 = Math.min(box.k0, k);
        box.k1 = Math.max(box.k1, k);
      }
    }
  }
  if (box.i1 >= 0) fillAroundLifted(loft, grid, out);
  let set = 0;
  for (let node = 0; node < nx * nz; node += 1) if (out[node] > 0) set += 1;
  return set;
}

/**
 * Each node short of full at a corner of a lifted cell (`box` bounds them): made full if the loft lies wholly over the
 * four cells round it. Leaves `liftedCells`, `wanted` and `cover` all 0 for the next call.
 */
function fillAroundLifted(loft: LoftResult, grid: SurfaceGrid, out: Uint8Array): void {
  const { positions: p, indices } = loft;
  const { xMin, zMin, spacing, nx, nz } = grid;
  const cx1 = nx - 1;
  // The cells round the nodes to fill, one cell beyond the lifted ones' box each way, within the grid.
  const ci0 = Math.max(0, box.i0 - 1);
  const ci1 = Math.min(nx - 2, box.i1 + 1);
  const ck0 = Math.max(0, box.k0 - 1);
  const ck1 = Math.min(nz - 2, box.k1 + 1);
  /** Whether node (i, k) is to be filled: a corner of a lifted cell, short of full, with all four cells on the grid. */
  const candidate = (i: number, k: number) => i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && out[k * nx + i] < 255
    && (liftedCells[(k - 1) * cx1 + i - 1] || liftedCells[(k - 1) * cx1 + i] || liftedCells[k * cx1 + i - 1] || liftedCells[k * cx1 + i]) === 1;
  let any = false;
  for (let k = box.k0; k <= box.k1 + 1; k += 1) {
    for (let i = box.i0; i <= box.i1 + 1; i += 1) {
      if (!candidate(i, k)) continue;
      wanted[(k - 1) * cx1 + i - 1] = 1;
      wanted[(k - 1) * cx1 + i] = 1;
      wanted[k * cx1 + i - 1] = 1;
      wanted[k * cx1 + i] = 1;
      any = true;
    }
  }
  if (any) {
    const sub = spacing / COVER_SAMPLES;
    const x0 = xMin + ci0 * spacing;
    const x1 = xMin + (ci1 + 1) * spacing;
    const z0 = zMin + ck0 * spacing;
    const z1 = zMin + (ck1 + 1) * spacing;
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
      const minX = Math.min(ax, bx, cx);
      const maxX = Math.max(ax, bx, cx);
      const minZ = Math.min(az, bz, cz);
      const maxZ = Math.max(az, bz, cz);
      if (maxX < x0 || minX > x1 || maxZ < z0 || minZ > z1) continue;
      const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
      if (area === 0) continue;
      const ti0 = Math.max(ci0, Math.floor((minX - xMin) / spacing));
      const ti1 = Math.min(ci1, Math.floor((maxX - xMin) / spacing));
      const tk0 = Math.max(ck0, Math.floor((minZ - zMin) / spacing));
      const tk1 = Math.min(ck1, Math.floor((maxZ - zMin) / spacing));
      for (let k = tk0; k <= tk1; k += 1) {
        for (let i = ti0; i <= ti1; i += 1) {
          const cell = k * cx1 + i;
          if (!wanted[cell] || cover[cell] === FULL_COVER) continue;
          let bits = cover[cell];
          for (let v = 0; v < COVER_SAMPLES; v += 1) {
            const z = zMin + k * spacing + (v + 0.5) * sub;
            if (z < minZ - EDGE || z > maxZ + EDGE) continue;
            for (let u = 0; u < COVER_SAMPLES; u += 1) {
              const bit = 1 << (v * COVER_SAMPLES + u);
              if (bits & bit) continue;
              const x = xMin + i * spacing + (u + 0.5) * sub;
              if (x < minX - EDGE || x > maxX + EDGE) continue;
              const wb = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / area;
              const wc = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / area;
              if (wb < -EDGE || wc < -EDGE || 1 - wb - wc < -EDGE) continue;
              bits |= bit;
            }
          }
          cover[cell] = bits;
        }
      }
    }
    const whole = (cell: number) => cover[cell] === FULL_COVER;
    for (let k = box.k0; k <= box.k1 + 1; k += 1) {
      for (let i = box.i0; i <= box.i1 + 1; i += 1) {
        if (!candidate(i, k)) continue;
        if (whole((k - 1) * cx1 + i - 1) && whole((k - 1) * cx1 + i) && whole(k * cx1 + i - 1) && whole(k * cx1 + i)) out[k * nx + i] = 255;
      }
    }
  }
  for (let k = ck0; k <= ck1; k += 1) {
    const row = k * cx1;
    liftedCells.fill(0, row + ci0, row + ci1 + 1);
    wanted.fill(0, row + ci0, row + ci1 + 1);
    cover.fill(0, row + ci0, row + ci1 + 1);
  }
}
