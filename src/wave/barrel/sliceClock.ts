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
 * Where the lip throws: the still depth under the crest where the Navier–Stokes wave's face goes vertical (the
 * library's τ = 0), against the crest's height at the wedge's foot, h0 = 7 m (the advisor's periodic Basilisk runs on
 * round 6's Padang Padang transect, level 12, 2026-09-30: 16 s 0.99 m → 1.99 m, 14 s 1.22 m → 2.45 m, 16 s 1.65 m →
 * 2.38 m, 18 s 2.50 m → 2.97 m). The lag after the solver's onset read 0.22, 2.30 and 1.60 √(h0/g) in the first runs,
 * no function of depth (the kennedyLag probe's solitary lags ran 2.3–2.8), so the throw is keyed on the Navier–Stokes
 * depth itself and the solver's onset only has to lead it (the advisor's option b). Breaking depth is set mainly by
 * height (d_b ≈ H_b/γ), and the runs confound height with period, so one line in height through all four, residuals
 * within 0.21 m [inferred] (the three-point line put the Small wave 0.26 m too deep), clamped to the measured heights:
 * past them it would extrapolate. Period dependence is untested (the next run: the same height at another period).
 * Provisional.
 */
const THROW_DEPTH = { intercept: 1.56, slope: 0.56, heights: [0.99, 2.5] } as const;

/**
 * Where the game's solver first breaks swell, fresh, on the same transect (the periodicOnset probe, 2026-09-30): one
 * column wide, regular waves driven in the foot's 7 m, each wave's crest height as its highest over BAND (6 to 5 m,
 * nearer the break than the foot, still seaward of every onset: refraction and the spur change a crest's height
 * between the foot and the break in 2D, and one reading jitters; the advisor) against the still depth under its crest where Kennedy's fresh test first
 * fired (η_t ≥ 0.65 √(g d)), medians over 12 waves, per period, m. The join sits where the solver itself onsets, ahead
 * of the throw (the advisor, 2026-09-30); a soliton's depths (1.66 m at A0 0.2) sat well shoreward of swell's.
 * Crests under about 1.2 m over the band seldom broke fresh on the wedge (1 wave in 12, near the flat's edge): they
 * clamp to the first row and join only if the solver breaks them there, so small swell mostly draws no barrel, as at
 * a reef pass (the advisor: one wave is no table row). Measured at h0 = 7 m, provisional.
 */
const SWELL_ONSET: readonly { period: number; rows: readonly (readonly [height: number, depth: number])[] }[] = [
  { period: 14, rows: [[1.2, 2.29], [1.75, 2.82], [2.29, 3.24], [2.74, 3.61], [3.15, 3.92]] },
  { period: 16, rows: [[1.19, 2.61], [1.6, 3.18], [1.84, 3.66], [2.21, 4.13], [2.68, 4.55]] },
  { period: 17, rows: [[1.29, 2.61], [1.74, 3.13], [2.16, 3.5], [2.51, 3.82], [2.82, 3.92]] },
  { period: 18, rows: [[1.29, 2.55], [1.82, 2.92], [2.37, 3.34], [2.86, 3.71], [3.3, 3.82]] },
];
/** The foot's depth the swell table was measured at, and the band its heights were read over (their highest), m. */
const SWELL_ONSET_H0 = 7;
const BAND = [6, 5] as const;

/**
 * A barrel transect's onset tables (Padang Padang Part B, PR 7: every spot's own): the foot's still depth `h0` they
 * were measured at (the Navier–Stokes runs' h0), m; the band of still depth, deeper and shallower, over which a crest's
 * height sizes its join, m; the join, per period, the solver's fresh onset against the crest's height over the band
 * (rows of [height, still depth], m: the periodicOnset or spotOnset probe on the transect); and the throw, the
 * Navier–Stokes vertical depth as a line in the foot crest, m, clamped to the runs' foot crests.
 */
export interface OnsetTables {
  h0: number;
  band: readonly [deeper: number, shallower: number];
  join: readonly { period: number; rows: readonly (readonly [height: number, depth: number])[] }[];
  throwDepth: { intercept: number; slope: number; heights: readonly [lowest: number, highest: number] };
  /**
   * The shallowest a lip throws, m at mid tide: the transect's flat (a reef's top), which a tide shifts rather than
   * scales. A wave too small to go vertical on the slope throws as it crosses onto the flat (the Reef; the advisor,
   * 2026-10-01). None: no floor (Padang Padang).
   */
  floor?: number;
}

/** Padang Padang's tables (round 6's transect: the 7 m foot, 1:19 along the path to the 1.25 m flat). */
export const PADANG_ONSET: OnsetTables = { h0: SWELL_ONSET_H0, band: BAND, join: SWELL_ONSET, throwDepth: THROW_DEPTH };

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
 * high over the band joins its front, m; the still depth where a crest `footHeight` m high at the foot goes vertical
 * in Navier–Stokes, m, which the solver must break it before for it to join; whether its lip throws there (`lagged`),
 * or where it joins; and the earliest τ, s.
 */
export interface OnsetTiming {
  h0: number;
  band: readonly [deeper: number, shallower: number];
  joinDepth(height: number): number;
  throwDepth(footHeight: number): number;
  lagged: boolean;
  earliest: number;
}

/**
 * The onset timing for a bed whose slope rises from `h0` m (the library cases' foot depth, at the tide) under swell of
 * `period` s, from its transect's `tables` (Padang Padang's unless given): the join depth (linear in height, then
 * between the two nearest periods, clamped) and the throw depth (linear in foot height, clamped), both scaled from the
 * tables' foot to h0 by depth (about ±7 % for a ±0.5 m tide). `lagged` throws where the Navier–Stokes wave goes
 * vertical (the default); unlagged throws at the join (PR 3's loft shows both).
 */
export function onsetTiming(h0: number, period: number, lagged = true, tables: OnsetTables = PADANG_ONSET): OnsetTiming {
  const unit = Math.sqrt(h0 / GRAVITY);
  const scale = h0 / tables.h0;
  const { join, band, throwDepth } = tables;
  const [lowest, highest] = throwDepth.heights;
  const joinAt = (measured: number) => {
    const height = measured / scale;
    const first = join[0];
    const last = join[join.length - 1];
    if (period <= first.period) return interpolate(first.rows, height);
    if (period >= last.period) return interpolate(last.rows, height);
    const k = join.findIndex((entry) => entry.period >= period);
    const [below, above] = [join[k - 1], join[k]];
    const t = (period - below.period) / (above.period - below.period);
    return interpolate(below.rows, height) + t * (interpolate(above.rows, height) - interpolate(below.rows, height));
  };
  return {
    h0,
    band: [band[0] * scale, band[1] * scale],
    joinDepth: (height) => joinAt(height) * scale,
    throwDepth: (footHeight) => {
      const depth = (throwDepth.intercept + throwDepth.slope * Math.min(highest, Math.max(lowest, footHeight / scale))) * scale;
      return tables.floor === undefined ? depth : Math.max(depth, tables.floor + h0 - tables.h0);
    },
    lagged,
    earliest: CLOCK.earliest * unit,
  };
}

/** The biweight kernel's radius: its standard deviation is radius/√7. */
const RADIUS = CLOCK.smoothing * Math.sqrt(7);

/**
 * Sets every front point's clock at `time` s: τ, the time since its lip threw (swept-barrel-build.md, "Smooth clock";
 * the advisor's rulings, 2026-09-30). Returns how many clocks paused this step rather than run back.
 *
 * - **The throw.** A point's lip throws when its crest crosses its throw depth, where the Navier–Stokes wave its size
 *   goes vertical (BreakingFront, `timing.throwDepth`), and never before the solver broke it; unlagged, when it joined.
 *   Till then τ is negative, the library's steepening frames from `timing.earliest`, its throw foreseen at the pace
 *   its crest has come shoreward since it joined. So the front's newest end reads the earliest frames, where the loft
 *   blends into the height field, with no taper.
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
      const shown = Math.max(timing.earliest, time - fittedThrow(points, start, end, k, time, timing));
      if (shown < point.tau) pauses += 1;
      else point.tau = shown;
    }
    start = end;
  }
  return pauses;
}

/**
 * When `point`'s lip throws, s, as known at `time`: when its crest crossed its throw depth, or, before it has, when it
 * will at the pace it has come shoreward since it joined, no later than its clock's earliest frame from now (a crest
 * not yet moving throws no sooner than that); unlagged, when it joined. Never before the solver broke it.
 */
function throwTime(point: FrontPoint, time: number, timing: OnsetTiming): number {
  if (!timing.lagged) return Math.max(point.joined, point.broke);
  if (point.thrown !== null) return Math.max(point.thrown, point.broke);
  const latest = time - timing.earliest;
  const come = point.depth - point.crestDepth;
  const foreseen = come > 0 ? point.joined + ((point.depth - point.throwDepth) * (time - point.joined)) / come : latest;
  return Math.max(Math.min(foreseen, latest), point.broke);
}

/** Point k's throw time from a biweight-weighted line through the throw times of points[start, end) near it. */
function fittedThrow(points: readonly FrontPoint[], start: number, end: number, k: number, time: number, timing: OnsetTiming): number {
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
    const thrown = throwTime(other, time, timing);
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
