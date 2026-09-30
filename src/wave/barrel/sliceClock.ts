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

/**
 * Where the game's solver first breaks swell, fresh, on the same transect (the periodicOnset probe, 2026-09-30): one
 * column wide, regular waves driven in the foot's 7 m, each wave's crest height as it passes REFERENCE (5.5 m, nearer
 * the break than the foot, still seaward of every onset: refraction and the spur change a crest's height between the
 * foot and the break in 2D, the advisor) against the still depth under its crest where Kennedy's fresh test first
 * fired (η_t ≥ 0.65 √(g d)), medians over 12 waves, per period, m. The join sits where the solver itself onsets, so the
 * lag keeps its meaning (the advisor, 2026-09-30); a soliton's depths (1.66 m at A0 0.2) sat well shoreward of swell's.
 * Crests under about 1.15 m at the reference seldom broke fresh on the wedge; they clamp to the first row and join
 * only if the solver breaks them. Measured at h0 = 7 m, provisional.
 */
const SWELL_ONSET: readonly { period: number; rows: readonly (readonly [height: number, depth: number])[] }[] = [
  { period: 14, rows: [[1.15, 2.29], [1.61, 2.82], [2.19, 3.24], [2.72, 3.61], [3.1, 3.92]] },
  { period: 16, rows: [[1.18, 2.61], [1.57, 3.18], [1.78, 3.66], [2.02, 4.13], [2.45, 4.55]] },
  { period: 17, rows: [[1.25, 2.61], [1.72, 3.13], [2.09, 3.5], [2.47, 3.82], [2.75, 3.92]] },
  { period: 18, rows: [[1.25, 2.55], [1.81, 2.92], [2.19, 3.34], [2.8, 3.71], [3.21, 3.82]] },
];
/** The foot's depth the swell table was measured at, and the band its heights were read over (their highest), m. */
const SWELL_ONSET_H0 = 7;
const BAND = [6, 5] as const;

/** Linear in x between the table's rows, clamped at its ends: never extrapolated. */
function interpolate(table: readonly (readonly [number, number])[], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let k = 1; k < table.length; k += 1) {
    const [x1, y1] = table[k];
    if (x <= x1) {
      const [x0, y0] = table[k - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

/**
 * A bed's onset timing: its wedge's foot `h0`, m, where crests are first followed; the band of still depth, deeper and
 * shallower, over which their height is read (its highest), m; the still depth where a crest that stood `height` m
 * high over the band joins its front, m;
 * when its lip throws after it joins, s, from that depth; and the earliest τ, s.
 */
export interface OnsetTiming {
  h0: number;
  band: readonly [deeper: number, shallower: number];
  joinDepth(height: number): number;
  lag(depth: number): number;
  earliest: number;
}

/**
 * The onset timing for a bed whose slope rises from `h0` m (the library cases' foot depth) under swell of `period` s:
 * the join depth from SWELL_ONSET (linear in height, then between the two nearest periods, clamped; scaled from its
 * 7 m foot to h0 by depth), and the lag from ONSET_LAG in units of √(h0/g), times `lag`: 1 for the measured upper
 * bound, 0 for none (the true lag for swell is probably well below the soliton's; PR 3's loft shows both).
 */
export function onsetTiming(h0: number, period: number, lag = 1): OnsetTiming {
  const unit = Math.sqrt(h0 / GRAVITY);
  const scale = h0 / SWELL_ONSET_H0;
  const joinAt = (measured: number) => {
    const height = measured / scale;
    const first = SWELL_ONSET[0];
    const last = SWELL_ONSET[SWELL_ONSET.length - 1];
    if (period <= first.period) return interpolate(first.rows, height);
    if (period >= last.period) return interpolate(last.rows, height);
    const k = SWELL_ONSET.findIndex((entry) => entry.period >= period);
    const [below, above] = [SWELL_ONSET[k - 1], SWELL_ONSET[k]];
    const t = (period - below.period) / (above.period - below.period);
    return interpolate(below.rows, height) + t * (interpolate(above.rows, height) - interpolate(below.rows, height));
  };
  return {
    h0,
    band: [BAND[0] * scale, BAND[1] * scale],
    joinDepth: (height) => joinAt(height) * scale,
    lag: (depth) => lag * interpolate(ONSET_LAG, depth / h0) * unit,
    earliest: CLOCK.earliest * unit,
  };
}

/** The biweight kernel's radius: its standard deviation is radius/√7. */
const RADIUS = CLOCK.smoothing * Math.sqrt(7);

/**
 * Sets every front point's clock at `time` s: τ, the time since its lip threw (swept-barrel-build.md, "Smooth clock";
 * the advisor's rulings, 2026-09-30). Returns how many clocks paused this step rather than run back.
 *
 * - **The throw.** A point's lip throws `timing.lag` after it joined the front (at its breaking depth, where the
 *   solver's fresh onset leads the Navier–Stokes wave's vertical face). Until then τ is negative: the library's steepening frames, from
 *   `timing.earliest`. So the front's newest end reads the earliest frames, where the loft blends into the height
 *   field, with no taper.
 * - **Smoothing.** Along each front, a point's throw time is read from a local line through its neighbours',
 *   weighted by a biweight (1 − u²)² of 2 m standard deviation in σ. That turns the solver's grouped onsets (a
 *   staircase of small close-outs) into a ramp at their mean gradient, the physical peel, and reproduces a steady peel
 *   exactly, to its leading edge, where a weighted mean would sit 0.31 of the radius behind. One point uses its own,
 *   and points bunched within about half a metre their weighted mean. The fit is clamped to the window's throw
 *   times, so it never extrapolates.
 * - **Causality.** A point's τ starts at the earliest frame (BreakingFront), and never falls: when a later neighbour
 *   moves the fit, the lip pauses rather than retracts. Frequent pauses would mean the onsets are still noisy at the 2 m scale.
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
      if (shown < point.tau) pauses += 1;
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
