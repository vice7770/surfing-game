import type { FrontPoint } from './BreakingFront';

/**
 * The slice clock's constants (the advisor, 2026-09-30):
 * - `smoothing`, m: the onsets are smoothed along the front over a 2 m standard deviation, about a quarter of
 *   Padang Padang's open curl (V_p ≈ 9–10 m/s over the 0.82–0.85 s open phase of round 6's run: 7–8 m);
 * - `bunched`, m²: below this weighted variance of σ (two points under about 0.6 m apart; two a column apart are
 *   0.25), a fit's slope is meaningless and the mean is used. Both provisional.
 */
export const CLOCK = { smoothing: 2, bunched: 0.1 } as const;

/** The biweight kernel's radius: its standard deviation is radius/√7. */
const RADIUS = CLOCK.smoothing * Math.sqrt(7);

/**
 * Sets every front point's clock at `time` s (swept-barrel-build.md, "Smooth clock"; the advisor's ruling,
 * 2026-09-30). Returns how many clocks paused this step rather than run back.
 *
 * - **Smoothing.** Along each front, a point's onset is read from a local line through its neighbours' onsets,
 *   weighted by a biweight (1 − u²)² of 2 m standard deviation in σ. That turns the solver's grouped onsets (a
 *   staircase of small close-outs) into a ramp at their mean gradient, the physical peel, and reproduces a steady peel
 *   exactly, to its leading edge, where a weighted mean would sit 0.31 of the radius behind. One point uses its own
 *   onset, and points bunched within about half a metre their weighted mean. The fit is clamped to the window's
 *   onsets, so it never extrapolates.
 * - **Causality.** τ = time − the fitted onset, at least 0, and never falling: when a later neighbour moves the fit,
 *   the lip pauses rather than retracts. Frequent pauses would mean the onsets are still noisy at the 2 m scale.
 * - **Ends.** No taper: a front holds only breaking crests, so its leading end is its newest break, near τ = 0, where
 *   slices appear unseen; its other end hands over to the roller (the owner's round-6 decision).
 *
 * Only + − × ÷ and loops over points in σ order, for online determinism.
 */
export function advanceClocks(points: FrontPoint[], time: number): number {
  let pauses = 0;
  let start = 0;
  while (start < points.length) {
    let end = start + 1;
    while (end < points.length && points[end].front === points[start].front) end += 1;
    for (let k = start; k < end; k += 1) {
      const point = points[k];
      const shown = Math.max(0, time - smoothedOnset(points, start, end, k));
      if (shown < point.tau) pauses += 1;
      else point.tau = shown;
    }
    start = end;
  }
  return pauses;
}

/** Point k's onset from a biweight-weighted line through the onsets of points[start, end) near it. */
function smoothedOnset(points: readonly FrontPoint[], start: number, end: number, k: number): number {
  const centre = points[k].sigma;
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let t0 = 0;
  let t1 = 0;
  let low = Infinity;
  let high = -Infinity;
  let from = k;
  while (from > start && centre - points[from - 1].sigma < RADIUS) from -= 1;
  for (let j = from; j < end && points[j].sigma - centre < RADIUS; j += 1) {
    const other = points[j];
    const d = other.sigma - centre;
    const u = d / RADIUS;
    const w = (1 - u * u) * (1 - u * u);
    s0 += w;
    s1 += w * d;
    s2 += w * d * d;
    t0 += w * other.onset;
    t1 += w * d * other.onset;
    if (other.onset < low) low = other.onset;
    if (other.onset > high) high = other.onset;
  }
  const mean = t0 / s0;
  // The weighted variance of σ about its mean: below `bunched` the line's slope is meaningless.
  const spread = s2 / s0 - (s1 / s0) * (s1 / s0);
  const fitted = spread < CLOCK.bunched ? mean : (s2 * t0 - s1 * t1) / (s0 * s2 - s1 * s1);
  return Math.min(high, Math.max(low, fitted));
}
