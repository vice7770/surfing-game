import { tubeFloorDepth } from './Overturn';

/**
 * The flying tubes as a flat table (G9), one row of TUBE_STRIDE per tube: its
 * crest now (x, z), the crest's height when it threw (y), its travel direction
 * (x, z), how far ahead of the crest its floor reaches now (open), its void's
 * length, width and tilt, its world column, its scale (1 while it flies, falling
 * to 0 as it collapses) and its trapped air, m³. The physics carves from it,
 * and so does the page, from the copy each snapshot carries.
 */
export const TUBE_STRIDE = 12;
export const TUBE_CAPACITY = 128;

const T = { crestX: 0, crestZ: 1, y: 2, dirX: 3, dirZ: 4, open: 5, length: 6, width: 7, tilt: 8, column: 9, scale: 10 } as const;

/** Where tube `tube`'s void floor lies under (x, z), m; NaN outside its void. */
export function tubeFloor(table: ArrayLike<number>, tube: number, x: number, z: number): number {
  const o = tube * TUBE_STRIDE;
  const ahead = (x - table[o + T.crestX]) * table[o + T.dirX] + (z - table[o + T.crestZ]) * table[o + T.dirZ];
  const scale = table[o + T.scale];
  if (!(ahead >= 0 && ahead <= table[o + T.open]) || !(scale > 0)) return Number.NaN;
  const depth = tubeFloorDepth({ length: table[o + T.length] * scale, width: table[o + T.width] * scale, tilt: table[o + T.tilt] }, ahead);
  return table[o + T.y] - depth;
}

const between = new Float64Array(TUBE_STRIDE);

/**
 * The surface at (x, z) where the tubes leave it, m. Between two column
 * centres that both hold a tube, the tube itself is interpolated (its crest,
 * opening and size, from each column's most open one): a peeling tube is one
 * shape, and its columns are samples of it at neighbouring stages. Beside a
 * column with none, each column's tubes cut the surface to their lowest floor
 * and the two columns blend linearly, as the water does between nodes.
 */
export function carveAt(table: ArrayLike<number>, count: number, columnWidth: number, x: number, z: number, surface: number): number {
  if (count === 0) return surface;
  const u = x / columnWidth - 0.5;
  const c0 = Math.floor(u);
  const t = u - c0;
  let m0 = surface;
  let m1 = surface;
  let open0 = -1;
  let open1 = -1;
  for (let tube = 0; tube < count; tube += 1) {
    const o = tube * TUBE_STRIDE;
    const column = table[o + T.column];
    if (column !== c0 && column !== c0 + 1) continue;
    if (column === c0 && (open0 < 0 || table[o + T.open] > table[open0 * TUBE_STRIDE + T.open])) open0 = tube;
    if (column === c0 + 1 && (open1 < 0 || table[o + T.open] > table[open1 * TUBE_STRIDE + T.open])) open1 = tube;
    const floor = tubeFloor(table, tube, x, z);
    if (!(floor === floor)) continue;
    if (column === c0) m0 = Math.min(m0, floor);
    else m1 = Math.min(m1, floor);
  }
  if (open0 >= 0 && open1 >= 0) {
    const a = open0 * TUBE_STRIDE;
    const b = open1 * TUBE_STRIDE;
    for (let k = 0; k < TUBE_STRIDE; k += 1) between[k] = table[a + k] + (table[b + k] - table[a + k]) * t;
    const length = Math.hypot(between[T.dirX], between[T.dirZ]) || 1;
    between[T.dirX] /= length;
    between[T.dirZ] /= length;
    const floor = tubeFloor(between, 0, x, z);
    return floor === floor ? Math.min(surface, floor) : surface;
  }
  return m0 + (m1 - m0) * t;
}

let marks = new Uint8Array(0);

/**
 * Carve a render grid's interleaved (height, foam) in place: every node within
 * a tube's reach, once, from its raw height. The reach is its column's blend
 * span across, and its crest to its open front along its travel, padded by a
 * node spacing.
 */
export function carveGrid(
  data: Float32Array, grid: { xMin: number; zMin: number; spacing: number; nx: number; nz: number }, table: ArrayLike<number>, count: number, columnWidth: number,
): void {
  if (count === 0) return;
  const { xMin, zMin, spacing, nx, nz } = grid;
  if (marks.length < nx * nz) marks = new Uint8Array(nx * nz);
  marks.fill(0, 0, nx * nz);
  let any = false;
  for (let tube = 0; tube < count; tube += 1) {
    const o = tube * TUBE_STRIDE;
    const column = table[o + T.column];
    const reach = Math.min(table[o + T.open], table[o + T.length] * Math.cos(table[o + T.tilt]));
    const frontX = table[o + T.crestX] + table[o + T.dirX] * reach;
    const frontZ = table[o + T.crestZ] + table[o + T.dirZ] * reach;
    const x0 = Math.min((column - 0.5) * columnWidth, Math.min(table[o + T.crestX], frontX) - spacing);
    const x1 = Math.max((column + 1.5) * columnWidth, Math.max(table[o + T.crestX], frontX) + spacing);
    const z0 = Math.min(table[o + T.crestZ], frontZ) - spacing;
    const z1 = Math.max(table[o + T.crestZ], frontZ) + spacing;
    const c0 = Math.max(0, Math.ceil((x0 - xMin) / spacing));
    const c1 = Math.min(nx - 1, Math.floor((x1 - xMin) / spacing));
    const r0 = Math.max(0, Math.ceil((z0 - zMin) / spacing));
    const r1 = Math.min(nz - 1, Math.floor((z1 - zMin) / spacing));
    for (let r = r0; r <= r1; r += 1) {
      for (let c = c0; c <= c1; c += 1) {
        marks[r * nx + c] = 1;
        any = true;
      }
    }
  }
  if (!any) return;
  for (let r = 0; r < nz; r += 1) {
    for (let c = 0; c < nx; c += 1) {
      if (!marks[r * nx + c]) continue;
      const k = (r * nx + c) * 2;
      data[k] = carveAt(table, count, columnWidth, xMin + c * spacing, zMin + r * spacing, data[k]);
    }
  }
}
