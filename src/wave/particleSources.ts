/** Bore sources, optionally indexed by ascending cell number to skip inactive water. */
export interface ParticleSources {
  readonly source: ArrayLike<number>;
  /** Positive sources in ascending order; only the first `sourceCount` entries are live. */
  readonly sourceCells?: ArrayLike<number>;
  readonly sourceCount?: number;
}

/**
 * Start an indexed traversal at the same full-grid cell as the original scan.
 * Wrapping this sorted list keeps source visits and random draws exactly in order.
 */
export function firstSourceCell(cells: ArrayLike<number>, count: number, start: number): number {
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cells[mid] < start) lo = mid + 1;
    else hi = mid;
  }
  return lo === count ? 0 : lo;
}
