/**
 * Soft, irregular edges for the drawn whitewater at a spilling spot (the foam look, item 4a; the playtest of 2026-10-21).
 * The spilling front gates the white per column and per wave, so a straight crest drew it as a rectangle with a straight
 * toe and square ends, and a short-crested sea split it into blocks. Here the drawn copy alone (the whitewater whose foam
 * is drawn, and the roller band's drawn table) gives up a noisy share of each run of white at its ends along the crest
 * and at its toe, fading in beyond it; the felt whitewater, the breaking, the air and the felt roller table never read
 * it. Look only, and everything is a pure function of the run, the cell and the sea's time: two clients stepping the
 * same sea draw the same edges. Only + − × ÷, floor and integer hashing, as the spilling front's decision paths (R3 §3.4).
 */
import { smoothstep } from './Bathymetry';

export const DRAWN_EDGES = {
  /**
   * The ends along the crest: each row's run of white gives up 0 to `endCut` m at either end, by a noise over the row's
   * position across shore (`endWavelength` m) and time (`endLife` s), and fades in over `endFade` m beyond the cut: the
   * end frays into fingers a few metres long. A run shorter than (cut + fade) / `endShare` has both scaled down, so its
   * middle is always left whole.
   */
  endCut: 4,
  endShare: 0.3,
  endFade: 2,
  endWavelength: 3,
  endLife: 3,
  /** Runs this many metres apart or less along a row count as one: the solver's breaking is patchy within a crest. */
  gap: 3,
  /**
   * The toe: each column's run of white gives up to `toeShare` of its depth down the face at its shoreward end, by a
   * noise along shore (`toeWavelength` m) and time (`toeLife` s), fading in over `toeFade` of its depth: the seaward half
   * is left whole.
   */
  toeShare: 0.3,
  toeFade: 0.15,
  toeWavelength: 4,
  toeLife: 2,
  /** The roller band's drawn ends: its scale fades in over 1 to `bandFade` columns from each end of a slot's run. */
  bandFade: 6,
} as const;

/** A lattice cell's value in [0, 1): an integer hash of (i, j, salt). */
function hash(i: number, j: number, salt: number): number {
  let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x165667b1) ^ Math.imul(salt | 0, 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1] over (a, b), lattice spacing 1. */
export function edgeNoise(a: number, b: number, salt: number): number {
  const i = Math.floor(a);
  const j = Math.floor(b);
  const u = a - i;
  const v = b - j;
  const su = u * u * (3 - 2 * u);
  const sv = v * v * (3 - 2 * v);
  const top = hash(i, j, salt) + (hash(i + 1, j, salt) - hash(i, j, salt)) * su;
  const bottom = hash(i, j + 1, salt) + (hash(i + 1, j + 1, salt) - hash(i, j + 1, salt)) * su;
  return top + (bottom - top) * sv;
}

/**
 * Frays the ends of each run of drawn white along one row (`values[start .. start + count)`, cell centres `xCenters`,
 * `dx` apart), at across-shore position z and sea time `time`. Only lowers values.
 */
export function frayRow(values: Float64Array, start: number, count: number, xCenters: ArrayLike<number>, dx: number, z: number,
  time: number): void {
  const { endCut, endShare, endFade, endWavelength, endLife, gap } = DRAWN_EDGES;
  const zs = z / endWavelength;
  const ts = time / endLife;
  let ix = 0;
  while (ix < count) {
    if (!(values[start + ix] > 0)) {
      ix += 1;
      continue;
    }
    // One run, through gaps of at most `gap` m.
    let end = ix;
    let next = ix + 1;
    while (next < count && xCenters[next] - xCenters[end] <= gap + dx) {
      if (values[start + next] > 0) end = next;
      next += 1;
    }
    const x0 = xCenters[ix] - 0.5 * dx;
    const x1 = xCenters[end] + 0.5 * dx;
    const scale = Math.min(1, (endShare * (x1 - x0)) / (endCut + endFade));
    const fade = scale * endFade;
    // Each end its own noise: keyed by where it lies along shore, so neighbouring runs fray differently.
    const cutLow = scale * endCut * edgeNoise(zs, ts, Math.floor(x0));
    const cutHigh = scale * endCut * edgeNoise(zs + 0.5, ts, Math.floor(x1) + 7919);
    for (let k = ix; k <= end; k += 1) {
      if (!(values[start + k] > 0)) continue;
      const x = xCenters[k];
      const share = smoothstep(cutLow, cutLow + fade, x - x0) * smoothstep(cutHigh, cutHigh + fade, x1 - x);
      values[start + k] *= share;
    }
    ix = end + 1;
  }
}

/**
 * Frays each column's runs of drawn white at their shoreward end (the toe): `values` is row-major, `nx` columns, rows at
 * `zCenters`; x along shore at `xCenters`. Only the `count` rows listed in `rows` (ascending) hold any white: a run is
 * a stretch of consecutive listed rows. Only lowers values.
 */
export function frayToes(values: Float64Array, nx: number, rows: ArrayLike<number>, count: number, xCenters: ArrayLike<number>,
  zCenters: ArrayLike<number>, time: number): void {
  const { toeShare, toeFade, toeWavelength, toeLife } = DRAWN_EDGES;
  const ts = time / toeLife;
  for (let ix = 0; ix < nx; ix += 1) {
    const noise = toeShare * edgeNoise(xCenters[ix] / toeWavelength, ts, 104729);
    let k = 0;
    while (k < count) {
      if (!(values[rows[k] * nx + ix] > 0)) {
        k += 1;
        continue;
      }
      let end = k;
      while (end + 1 < count && rows[end + 1] === rows[end] + 1 && values[rows[end + 1] * nx + ix] > 0) end += 1;
      if (end > k) {
        // The run's depth to its cells' edges: a toe cut by nothing leaves its last row whole.
        const spacing = (zCenters[rows[end]] - zCenters[rows[k]]) / (end - k);
        const toe = zCenters[rows[end]] + 0.5 * spacing;
        const depth = toe - zCenters[rows[k]] + 0.5 * spacing;
        const edge = toe - noise * depth;
        const fade = toeFade * depth;
        for (let j = k; j <= end; j += 1) values[rows[j] * nx + ix] *= 1 - smoothstep(edge - fade, edge, zCenters[rows[j]]);
      }
      k = end + 1;
    }
  }
}

/**
 * The roller band's drawn table (`ROLLER_FIELD`, slot-major, `stride` floats a column): each slot's run of columns with
 * a band fades in over 1 to `bandFade` columns from either end, by a noise keyed on where the end lies and the time.
 */
export function frayBand(table: Float32Array, slots: number, nx: number, stride: number, scaleField: number, time: number): void {
  const { bandFade, endLife } = DRAWN_EDGES;
  const ts = time / endLife;
  for (let slot = 0; slot < slots; slot += 1) {
    const at = (column: number) => (slot * nx + column) * stride + scaleField;
    let column = 0;
    while (column < nx) {
      if (!(table[at(column)] > 0)) {
        column += 1;
        continue;
      }
      let end = column;
      while (end + 1 < nx && table[at(end + 1)] > 0) end += 1;
      const length = end - column + 1;
      const most = Math.max(1, Math.floor(length / 3));
      const low = Math.min(most, 1 + (bandFade - 1) * edgeNoise(column / 7, ts, slot + 31));
      const high = Math.min(most, 1 + (bandFade - 1) * edgeNoise(end / 7, ts, slot + 61));
      for (let k = column; k <= end; k += 1) {
        const share = Math.min(1, (k - column + 0.5) / low, (end - k + 0.5) / high);
        table[at(k)] *= share * share * (3 - 2 * share);
      }
      column = end + 1;
    }
  }
}
