import type { FrontPoint } from './BreakingFront';
import { GRAVITY } from '../dispersion';

/**
 * The slice clock's constants (the advisor, 2026-09-30):
 * - `smoothing`, m: the onsets are smoothed along the front over a 2 m standard deviation, about a quarter of
 *   Padang Padang's open curl (V_p ≈ 9–10 m/s over the 0.82–0.85 s open phase of round 6's run: 7–8 m);
 * - `bunched`, m²: below this weighted variance of σ (two points under about 0.6 m apart; two a column apart are
 *   0.25), a fit's slope is meaningless and the mean is used;
 * - `earliest`, √(h0/g): the library's first frame before the face goes vertical (its runs output from 3 before),
 *   the earliest a slice's clock reads. All provisional.
 */
export const CLOCK = { smoothing: 2, bunched: 0.1, earliest: -3 } as const;

/**
 * How long after the solver's Kennedy onset the lip throws, √(h0/g), against the still depth under the crest at the
 * onset, h0 (the kennedyLag probe, 2026-09-30): the game's solver at 1 m on round 6's Padang Padang transect (h0 7 m,
 * 1:19 to a 1.25 m flat), each soliton's onset against Basilisk's face going vertical (A0 0.3 at level 11; 0.2 and
 * 0.45 from level-10 scouts, ±0.3). The crests stand where Basilisk's do at the vertical time (about 1 m apart): the
 * trigger fires early, at η/h ≈ 0.9, while the crest still shoals. Solitary waves break far higher than swell (H/h
 * 1.38–1.40 on 1:35, Grilli et al. 1997, against 0.6–0.8), so for Padang Padang's swell this is an upper bound until
 * periodic runs exist. Measured, provisional.
 */
const ONSET_LAG: readonly (readonly [depth: number, lag: number])[] = [[0.237, 2.34], [0.35, 2.6], [0.5, 2.82]];

/** When a point's lip throws after its onset, s, from the still depth under it then, m; and the earliest τ, s. */
export interface OnsetTiming {
  lag(depth: number): number;
  earliest: number;
}

/**
 * The onset timing for a bed whose slope rises from `h0` m (the library cases' foot depth): ONSET_LAG interpolated
 * linearly by the join's depth over h0, clamped at its ends (never extrapolated), in units of √(h0/g).
 */
export function onsetTiming(h0: number): OnsetTiming {
  const unit = Math.sqrt(h0 / GRAVITY);
  return {
    lag(depth: number): number {
      const d = depth / h0;
      if (d <= ONSET_LAG[0][0]) return ONSET_LAG[0][1] * unit;
      for (let k = 1; k < ONSET_LAG.length; k += 1) {
        const [d1, lag1] = ONSET_LAG[k];
        if (d <= d1) {
          const [d0, lag0] = ONSET_LAG[k - 1];
          return (lag0 + ((d - d0) / (d1 - d0)) * (lag1 - lag0)) * unit;
        }
      }
      return ONSET_LAG[ONSET_LAG.length - 1][1] * unit;
    },
    earliest: CLOCK.earliest * unit,
  };
}

/** The biweight kernel's radius: its standard deviation is radius/√7. */
const RADIUS = CLOCK.smoothing * Math.sqrt(7);

/**
 * Sets every front point's clock at `time` s: τ, the time since its lip threw (swept-barrel-build.md, "Smooth clock";
 * the advisor's rulings, 2026-09-30). Returns how many clocks paused this step rather than run back.
 *
 * - **The throw.** A point's lip throws `timing.lag` after it joined the front (the solver's onset, which leads the
 *   Navier–Stokes wave's vertical face). Until then τ is negative: the library's steepening frames, from
 *   `timing.earliest`. So the front's newest end reads the earliest frames, where the loft blends into the height
 *   field, with no taper.
 * - **Smoothing.** Along each front, a point's throw time is read from a local line through its neighbours',
 *   weighted by a biweight (1 − u²)² of 2 m standard deviation in σ. That turns the solver's grouped onsets (a
 *   staircase of small close-outs) into a ramp at their mean gradient, the physical peel, and reproduces a steady peel
 *   exactly, to its leading edge, where a weighted mean would sit 0.31 of the radius behind. One point uses its own,
 *   and points bunched within about half a metre their weighted mean. The fit is clamped to the window's throw
 *   times, so it never extrapolates.
 * - **Causality.** A point's τ starts where the fit puts it and never falls after: when a later neighbour moves the
 *   fit, the lip pauses rather than retracts. Frequent pauses would mean the onsets are still noisy at the 2 m scale.
 *
 * Only + − × ÷ and loops over points in σ order, for online determinism.
 */
export function advanceClocks(points: FrontPoint[], time: number, timing: OnsetTiming): number {
  let pauses = 0;
  let start = 0;
  while (start < points.length) {
    let end = start + 1;
    while (end < points.length && points[end].front === points[start].front) end += 1;
    for (let k = start; k < end; k += 1) {
      const point = points[k];
      const shown = Math.max(timing.earliest, time - fittedThrow(points, start, end, k, timing));
      // A point that joined this step starts where the fit puts it.
      if (point.joined === time) point.tau = shown;
      else if (shown < point.tau) pauses += 1;
      else point.tau = shown;
    }
    start = end;
  }
  return pauses;
}

/** Point k's throw time from a biweight-weighted line through the throw times of points[start, end) near it. */
function fittedThrow(points: readonly FrontPoint[], start: number, end: number, k: number, timing: OnsetTiming): number {
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
    const thrown = other.joined + timing.lag(other.depth);
    const d = other.sigma - centre;
    const u = d / RADIUS;
    const w = (1 - u * u) * (1 - u * u);
    s0 += w;
    s1 += w * d;
    s2 += w * d * d;
    t0 += w * thrown;
    t1 += w * d * thrown;
    if (thrown < low) low = thrown;
    if (thrown > high) high = thrown;
  }
  const mean = t0 / s0;
  // The weighted variance of σ about its mean: below `bunched` the line's slope is meaningless.
  const spread = s2 / s0 - (s1 / s0) * (s1 / s0);
  const fitted = spread < CLOCK.bunched ? mean : (s2 * t0 - s1 * t1) / (s0 * s2 - s1 * s1);
  return Math.min(high, Math.max(low, fitted));
}
