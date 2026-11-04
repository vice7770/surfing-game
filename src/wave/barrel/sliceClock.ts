import { crestCelerity, LEAD_RETIRE, type FrontPoint } from './BreakingFront';
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
  throwDepth: {
    intercept: number; slope: number; heights: readonly [lowest: number, highest: number];
    /**
     * A transect whose runs differ in period as well as height (the Canyon's 11 and 14 s): m per second of the sea's
     * peak period from `reference`, the period clamped to `periods` (the runs' own), so none is extrapolated.
     */
    period?: { slope: number; reference: number; periods: readonly [shortest: number, longest: number] };
    /**
     * Under the lowest run's foot crest, the lowest run's depth scaled by Froude with the foot crest (a wave the run's
     * shape at a smaller size goes vertical proportionally shallower) in place of clamping to it: the depth the drawn case
     * itself goes vertical, when the drawn case is the lowest run scaled (the pool's straight Barrel under the step 3
     * ruling's lagged join, whose clock keys on it; pool-tube-face, 2026-11-03). None: clamped.
     */
    froude?: true;
  };
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
  /**
   * The lagged join's formation ramp (the advisor's step 3 fallback; the pool's straight Barrel, `TubeFace.lag`): s over
   * which a joined point's slice forms from its join (smoothstep, `FrontPoint.formation`), by its foot height; absent: none.
   */
  formationRamp?: (footHeight: number) => number;
  /**
   * The fastest a thrown point's clock catches up on its fit, × real time: 2 (the advisor's fifth ruling, 2026-10-22), or
   * the step 3 ruling's 1.25 at the pool's straight Barrel (`TubeFace.clockRate`). Absent: 2.
   */
  thrownRate?: number;
  /**
   * Step 7's formation by distance (the advisor's 2026-11-04 ruling §1.4.2; `TubeFace.distance`): before its throw a point's
   * clock is τ = −D/C_p, D its crest's distance along its travel to its throw contour (`to`: the front's `distance`),
   * smoothed along σ, C_p its crest's pace (`crestCelerity`), within [τ_e, 0), never falling, at `FORMATION.rate` of
   * real time; its slice's weight ramps over the case's first `FORMATION.ramp` s of τ. `contour`: its lip throws when its
   * clock reaches 0 (the retire guard kept: unbroken `LEAD_RETIRE.after` s past its throw, it retires); without, an
   * unbroken point holds short of 0 until the solver breaks it (`?tubeThrow=break`). Absent: none of it.
   */
  distance?: { to: (x: number, z: number, dx: number, dz: number, depth: number) => number; contour: boolean };
}

/**
 * Step 7's formation by distance (`OnsetTiming.distance`; the advisor's 2026-11-04 ruling §1.4.2):
 * - `rate`: a pre-throw clock runs at 0.5–1.5 × real time, so it neither holds nor jumps;
 * - `ramp`, s: the slice's weight ramps (smoothstep) over the case's first 0.3 s of τ, the frames within 0.07–0.10 m of
 *   the solver's surface;
 * - `weightRate`, per s: and changes by at most 1/18 a 1/60 s step (bar 4b);
 * - `reach`, s: points this far past their throw still read their distance, for their neighbours' smoothing.
 */
export const FORMATION = { rate: [0.5, 1.5], ramp: 0.3, weightRate: 60 / 18, reach: 1 } as const;

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
  // The throw's period term, m at the tables' foot (none on a transect run at one period's trend, Padang Padang's).
  const byPeriod = throwDepth.period
    ? throwDepth.period.slope * (Math.min(throwDepth.period.periods[1], Math.max(throwDepth.period.periods[0], period)) - throwDepth.period.reference)
    : 0;
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
      const below = throwDepth.froude && footHeight / scale < lowest ? footHeight / scale / lowest : 1;
      const depth = (throwDepth.intercept + throwDepth.slope * Math.min(highest, Math.max(lowest, footHeight / scale)) + byPeriod) * below * scale;
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
 * - **Causality.** A point's τ starts at the earliest frame (BreakingFront), and never falls: before its throw, when a
 *   later neighbour moves the fit, the face pauses rather than retracts (it is waiting for its crest). Frequent pauses
 *   would mean the onsets are still noisy at the 2 m scale.
 * - **After the throw** (the advisor, 2026-10-22: the Canyon's lips hung 0.3–1.3 s in 16–30 % of its tubes): a point
 *   whose own crest has crossed its throw depth fits its throw time over its thrown neighbours only, so neighbours
 *   still joining or foreseen no longer slide it later; and once its lip is drawn thrown (τ ≥ 0) its clock runs at
 *   least at real time, `step` s a step, catching up only when the fit moves earlier, and then at most at twice real
 *   time, so a catch-up plays as a speed-up rather than a jump (the fifth ruling). A face whose fit has thrown it
 *   reaches τ = 0 as before and runs on from there at the same cap. A free jet never hangs and never skips.
 *
 * Only + − × ÷ and loops over points in σ order, for online determinism.
 */
export function advanceClocks(points: FrontPoint[], time: number, timing: OnsetTiming, step = 0): number {
  let pauses = 0;
  let start = 0;
  while (start < points.length) {
    let end = start + 1;
    while (end < points.length && points[end].front === points[start].front) end += 1;
    const rate = timing.thrownRate ?? 2;
    if (timing.distance) {
      pauses += distanceClocks(points, start, end, time, timing, step, rate);
      start = end;
      continue;
    }
    for (let k = start; k < end; k += 1) {
      const point = points[k];
      if (timing.formationRamp && !(point.formation! >= 1)) {
        // A lagged join's slice forms over its ramp from its join (smoothstep): it never appears at once.
        const u = Math.min(1, Math.max(0, (time - point.joined) / timing.formationRamp(point.footHeight)));
        point.formation = u * u * (3 - 2 * u);
      }
      const shown = Math.max(timing.earliest, time - fittedThrow(points, start, end, k, time, timing));
      if (point.unbroken) {
        // A lagged join the solver hasn't broken yet (`FrontOptions.lead`) holds short of its throw, never running back;
        // past its own foreseen throw by `LEAD_RETIRE.after` it retires over `LEAD_RETIRE.over`.
        if (shown < point.tau) pauses += 1;
        else point.tau = Math.min(shown, UNBROKEN_HOLD);
        const late = time - ownThrow(point, time, timing) - LEAD_RETIRE.after;
        if (late > 0) point.retire = Math.min(1, late / LEAD_RETIRE.over);
      } else if (point.tau >= 0) point.tau = step > 0 ? Math.min(Math.max(shown, point.tau + step), point.tau + rate * step) : Math.max(shown, point.tau);
      else if (shown < point.tau) pauses += 1;
      else point.tau = shown >= 0 && step > 0 ? Math.min(shown, Math.max(0, point.tau + 2 * step)) : shown;
    }
    start = end;
  }
  return pauses;
}

/**
 * Step 7's throw-contour distance (`OnsetTiming.distance.to`, `FrontOptions.distance`): the still depth `stillAt` read every
 * `step` m along (dx, dz) from (x, z), linear between reads, to where it is `depth`: ahead while it is deeper (to `ahead` m:
 * |τ_e| C_p ≤ 1.91 s × 1.5 √(g 3 m) ≈ 15.5 m at the 1.8 m faces; Infinity past it), behind once it is shallower (negative,
 * to `behind` m; NaN past it). NaN where the depth can't be read.
 */
export const THROW_CONTOUR = { step: 0.5, ahead: 16, behind: 8 } as const;
export function throwContourDistance(stillAt: (x: number, z: number) => number, x: number, z: number, dx: number, dz: number, depth: number): number {
  const { step, ahead, behind } = THROW_CONTOUR;
  let before = stillAt(x, z);
  if (!(before === before)) return Number.NaN;
  if (before > depth) {
    for (let t = step; t <= ahead; t += step) {
      const after = stillAt(x + t * dx, z + t * dz);
      if (after <= depth) return t - step + (step * (before - depth)) / (before - after);
      before = after;
    }
    return Infinity;
  }
  for (let t = -step; t >= -behind; t -= step) {
    const after = stillAt(x + t * dx, z + t * dz);
    if (after > depth) return t + step - (step * (depth - before)) / (after - before);
    before = after;
  }
  return Number.NaN;
}

/** Per point of a front, its distance to its throw contour (m), and smoothed along σ (`distanceClocks`). */
let distances = new Float64Array(0);
let smoothed = new Float64Array(0);

/**
 * One front's clocks, points[start, end), by distance (`OnsetTiming.distance`, step 7): before its throw each point's τ
 * follows −D/C_p (D smoothed along σ by the clock's biweight line, as the throw times are) within the rate's bounds, its
 * weight ramping with it; it throws when τ reaches 0, by `contour`, or once the solver has broken it too. After its
 * throw, as `advanceClocks` (its fit over its thrown neighbours, at most `thrownRate` × real time), its throw its clock's.
 * Returns the steps held (unbroken, short of 0).
 */
function distanceClocks(points: FrontPoint[], start: number, end: number, time: number, timing: OnsetTiming, step: number, rate: number): number {
  const { to, contour } = timing.distance!;
  const n = end - start;
  if (distances.length < n) {
    distances = new Float64Array(2 * n);
    smoothed = new Float64Array(2 * n);
  }
  for (let k = start; k < end; k += 1) {
    const p = points[k];
    distances[k - start] = p.tau < FORMATION.reach
      ? to(p.x, p.z, p.dirX ?? 0, p.dirZ ?? 1, p.throwDepth)
      : Number.NaN;
  }
  for (let k = start; k < end; k += 1) smoothed[k - start] = fitAlong(points, start, end, k, distances);
  const [slowest, fastest] = FORMATION.rate;
  let pauses = 0;
  for (let k = start; k < end; k += 1) {
    const point = points[k];
    if (point.tau < 0) {
      const d = smoothed[k - start];
      const target = d === d ? -d / crestCelerity(point.crestSpeed, point.crestDepth, point.height) : Number.NaN;
      let next = point.tau;
      if (step > 0) {
        // No distance in reach: real time.
        const want = target === target ? target : point.tau + step;
        next = Math.min(point.tau + fastest * step, Math.max(point.tau + slowest * step, want));
      }
      if (point.unbroken && !contour) {
        // `?tubeThrow=break`: it waits short of its throw for the solver's break, and retires past its foreseen throw.
        if (next > UNBROKEN_HOLD) {
          next = Math.max(point.tau, UNBROKEN_HOLD);
          pauses += 1;
        }
        const late = (target === target ? target : 0) - LEAD_RETIRE.after;
        if (late > 0) point.retire = Math.min(1, late / LEAD_RETIRE.over);
      }
      const u = Math.min(1, Math.max(0, (next - timing.earliest) / FORMATION.ramp));
      const was = point.formation ?? 0;
      point.formation = Math.max(was, Math.min(u * u * (3 - 2 * u), was + FORMATION.weightRate * step));
      if (next >= 0) point.thrown = time - next;
      point.tau = next;
      continue;
    }
    // Thrown, by its clock: unbroken this long past its throw, it retires (the guard).
    if (point.unbroken) {
      const late = point.tau - LEAD_RETIRE.after;
      if (late > 0) point.retire = Math.min(1, late / LEAD_RETIRE.over);
    }
    if (point.formation !== undefined && point.formation < 1) point.formation = Math.min(1, point.formation + FORMATION.weightRate * step);
    const shown = Math.max(timing.earliest, time - fittedThrow(points, start, end, k, time, timing));
    point.tau = step > 0 ? Math.min(Math.max(shown, point.tau + step), point.tau + rate * step) : Math.max(shown, point.tau);
  }
  return pauses;
}

/**
 * Point k's value of `values` (by its index from `start`; NaN or infinite: none) from a biweight-weighted line through its
 * neighbours' along σ, as `fittedThrow`'s, clamped to the window's values; NaN with none in reach.
 */
function fitAlong(points: readonly FrontPoint[], start: number, end: number, k: number, values: Float64Array): number {
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
    const v = values[j - start];
    if (!(v === v) || v === Infinity || v === -Infinity) continue;
    const d = points[j].sigma - centre;
    const u = d / RADIUS;
    const w = (1 - u * u) * (1 - u * u);
    s0 += w;
    s1 += w * d;
    s2 += w * d * d;
    t0 += w * v;
    t1 += w * d * v;
    if (v < low) low = v;
    if (v > high) high = v;
  }
  if (!(s0 > 0)) return values[k - start] === Infinity ? Infinity : Number.NaN;
  const mean = t0 / s0;
  const spread = s2 / s0 - (s1 / s0) * (s1 / s0);
  const fitted = spread < CLOCK.bunched ? mean : (s2 * t0 - s1 * t1) / (s0 * s2 - s1 * s1);
  return Math.min(high, Math.max(low, fitted));
}

/**
 * When `point`'s lip throws, s, as known at `time`: when its crest crossed its throw depth, or, before it has, when it
 * will at the pace it has come shoreward since it joined, no later than its clock's earliest frame from now (a crest
 * not yet moving throws no sooner than that); unlagged, when it joined. Never before the solver broke it. By distance
 * (step 7), when its clock reached 0.
 */
function throwTime(point: FrontPoint, time: number, timing: OnsetTiming): number {
  if (timing.distance && point.thrown !== null) return point.thrown;
  if (!timing.lagged) return Math.max(point.joined, point.broke);
  // A lagged join not yet broken (`FrontOptions.lead`): its own crest's, the break still to come.
  if (point.unbroken) return ownThrow(point, time, timing);
  if (point.thrown !== null) return Math.max(point.thrown, point.broke);
  const latest = time - timing.earliest;
  const come = point.depth - point.crestDepth;
  const foreseen = come > 0 ? point.joined + ((point.depth - point.throwDepth) * (time - point.joined)) / come : latest;
  return Math.max(Math.min(foreseen, latest), point.broke);
}

/** A point's own crest's throw, s: when it crossed its throw depth, or when it will at the pace it has come since it joined. */
function ownThrow(point: FrontPoint, time: number, timing: OnsetTiming): number {
  if (point.thrown !== null) return point.thrown;
  const latest = time - timing.earliest;
  const come = point.depth - point.crestDepth;
  const foreseen = come > 0 ? point.joined + ((point.depth - point.throwDepth) * (time - point.joined)) / come : latest;
  return Math.min(foreseen, latest);
}

/** Where a lagged join's clock holds while the solver hasn't broken it, s: just short of its throw. */
const UNBROKEN_HOLD = -1e-3;

/**
 * Point k's throw time from a biweight-weighted line through the throw times of points[start, end) near it: once its
 * own crest has thrown (lagged), through its thrown neighbours' only.
 */
function fittedThrow(points: readonly FrontPoint[], start: number, end: number, k: number, time: number, timing: OnsetTiming): number {
  const centre = points[k].sigma;
  const thrownOnly = timing.lagged && points[k].thrown !== null;
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
    if (thrownOnly && other.thrown === null) continue;
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
