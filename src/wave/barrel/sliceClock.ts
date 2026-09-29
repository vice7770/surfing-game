import type { FrontPoint } from './BreakingFront';
import { ONSET } from './crestOnset';

/**
 * The slice clock's constants (the advisor, 2026-09-30):
 * - `smoothing`, m: the onsets are smoothed along the front over a 2 m standard deviation, about a quarter of
 *   Padang Padang's open curl (V_p ≈ 9–10 m/s over the 0.82–0.85 s open phase of round 6's run: 7–8 m);
 * - `bunched`, m²: below this weighted variance of σ (two points under about 0.6 m apart; two a column apart are
 *   0.25), a fit's slope is meaningless and the mean is used;
 * - `endTaper`, m: τ tapers to 0 over an unbroken shoulder's last metres, so slices appear there unseen
 *   (swept-barrel-build.md). All provisional.
 */
export const CLOCK = { smoothing: 2, bunched: 0.1, endTaper: 3 } as const;

/** The biweight kernel's radius: its standard deviation is radius/√7. */
const RADIUS = CLOCK.smoothing * Math.sqrt(7);

/**
 * Advances every front point's clock to `time` s (swept-barrel-build.md, "Smooth clock"; the advisor's ruling,
 * 2026-09-30). Returns how many shown clocks paused this step rather than run back.
 *
 * - **The throw.** A point throws when its B first reaches `ONSET.throw × ONSET.depthAveraged`. Its onset is then,
 *   less the part of the last step since B crossed it (read from B's rise, at most `dt`).
 * - **Smoothing.** Along each front, a broken point's onset is read from a local line through its broken
 *   neighbours' onsets, weighted by a biweight (1 − u²)² of 2 m standard deviation in σ. That turns the solver's
 *   grouped onsets (a staircase of small close-outs) into a ramp at their mean gradient, the physical peel, and
 *   reproduces a steady peel exactly, to its leading edge. One point uses its own onset, and points bunched within
 *   about a metre their weighted mean. The fit is clamped to the window's onsets, so it never extrapolates.
 * - **Causality.** Only broken points count, unbroken ones show τ = 0, and a shown τ never falls: when a later
 *   neighbour moves the fit, the lip pauses rather than retracts.
 * - **Ends.** τ tapers to 0 over `CLOCK.endTaper` m toward an unbroken shoulder only. At a broken end the tube
 *   hands over to the roller (the owner's round-6 decision), so it is not tapered.
 *
 * Only + − × ÷ and loops over points in σ order, for online determinism.
 */
export function advanceClocks(points: FrontPoint[], time: number, dt: number): number {
  const threshold = ONSET.throw * ONSET.depthAveraged;
  for (const point of points) {
    if (point.thrown || !(point.b >= threshold)) continue;
    point.thrown = true;
    point.onset = time - (point.bRate > 0 ? Math.min(dt, (point.b - threshold) / point.bRate) : 0);
  }
  let pauses = 0;
  let start = 0;
  while (start < points.length) {
    let end = start + 1;
    while (end < points.length && points[end].front === points[start].front) end += 1;
    const first = points[start];
    const last = points[end - 1];
    for (let k = start; k < end; k += 1) {
      const point = points[k];
      if (!point.thrown) {
        point.tau = 0;
        continue;
      }
      let shown = Math.max(0, time - smoothedOnset(points, start, end, k));
      const toShoulder = Math.min(
        first.thrown ? Infinity : point.sigma - first.sigma,
        last.thrown ? Infinity : last.sigma - point.sigma,
      );
      if (toShoulder < CLOCK.endTaper) shown = (shown * toShoulder) / CLOCK.endTaper;
      if (shown < point.tau) pauses += 1;
      else point.tau = shown;
    }
    start = end;
  }
  return pauses;
}

/** Point k's onset from a biweight-weighted line through the broken onsets of points[start, end) near it. */
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
    if (!other.thrown) continue;
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
