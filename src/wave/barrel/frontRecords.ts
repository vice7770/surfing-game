import type { FrontPoint } from './BreakingFront';
import { geometricPaceActive } from './carrierSupport';

/**
 * A front point as the snapshot carries it to the page (the Padang Padang spec, Part B, PR 3): where its crest is, which
 * front and how far along it, its clock, its foot crest and depth (which size and scale its profile), its crest's z
 * where it crossed its throw depth (NaN until then), where its pace starts (PR 5), and, while it runs on that pace, the
 * pace along its column, m per second of its clock (NaN otherwise, and always without the crash): the contact's Ṡ (the
 * advisor, 2026-10-03). And how far its slice has faded, 0–1: under the step 3 ruling's lagged join, as it forms from
 * its join (`FrontPoint.formation`) and as it retires unbroken (`FrontPoint.retire`); 0 for every other point.
 *
 * Step 7's three (the advisor's 2026-11-04 ruling; NaN where the simulation keeps none, at every spot but the pool's
 * straight Barrel, and there with their switches off): its anchor's shift as the simulation keeps it, m (the case's crest
 * along its ray from the point under the contact's hold, `continueAnchor`; NaN: the crest anchor), read by the loft with
 * `TubeFace.continuity`; its drawn crest's speed along its ray, m/s (its crest's pace and its shift's rate), and its
 * clock's rate, × real time: the wall's water's (`TubeFace.wallFlow`).
 */
export const FRONT_STRIDE = 13;
export const FRONT_FIELD = {
  x: 0, z: 1, front: 2, sigma: 3, tau: 4, footHeight: 5, footDepth: 6, throwZ: 7, pace: 8, fade: 9, anchor: 10, crestSpeed: 11, tauRate: 12,
} as const;
/** Most front points a snapshot carries: about one per metre of breaking crest, several fronts across a 320 m window. */
export const FRONT_CAPACITY = 2048;

/**
 * A front's piece after a gap (`writeFrontRecords`'s `footMax`) is written as its own front, numbered front + piece ×
 * this: within float32's exact integers for 15 pieces of fronts numbered under a million.
 */
export const FRONT_PIECE = 2 ** 20;

/**
 * Writes `points` (in their order: by front, then σ) into `out` as records, as many as fit; returns how many. `footMax`, m:
 * a point whose foot crest is higher plunges no tube (a spot's tube regime, `BarrelSpot.tubeFrom`), so it is left out,
 * and the piece of its front after it is written as a front of its own (`FRONT_PIECE`): the loft never bridges the gap.
 * `spanned`: only points whose piece has reached its span (`FrontPoint.tubeSpan`, `BarrelSpot.tubeSpan`); the others
 * are left out the same way.
 */
export function writeFrontRecords(points: readonly FrontPoint[], out: Float32Array, footMax = Infinity, spanned = false): number {
  const capacity = Math.floor(out.length / FRONT_STRIDE);
  let count = 0;
  let front = Number.NaN;
  let piece = 0;
  let gap = false;
  for (let k = 0; k < points.length && count < capacity; k += 1) {
    const p = points[k];
    if (p.front !== front) {
      front = p.front;
      piece = 0;
      gap = false;
    }
    if (!(p.footHeight <= footMax) || (spanned && p.tubeSpan !== true)) {
      gap = true;
      continue;
    }
    if (gap) {
      piece = Math.min(15, piece + 1);
      gap = false;
    }
    const o = count * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = p.x;
    out[o + FRONT_FIELD.z] = p.z;
    out[o + FRONT_FIELD.front] = p.front + piece * FRONT_PIECE;
    out[o + FRONT_FIELD.sigma] = p.sigma;
    out[o + FRONT_FIELD.tau] = p.tau;
    out[o + FRONT_FIELD.footHeight] = p.footHeight;
    out[o + FRONT_FIELD.footDepth] = p.footDepth;
    out[o + FRONT_FIELD.throwZ] = p.throwZ ?? Number.NaN;
    if (p.carrierSupport) out[o + FRONT_FIELD.pace] = geometricPaceActive(p) ? p.jetPace! : Number.NaN;
    else out[o + FRONT_FIELD.pace] = p.jetPace !== undefined && p.jetUntil !== undefined && p.tau < p.jetUntil ? p.jetPace : Number.NaN;
    out[o + FRONT_FIELD.fade] = 1 - (1 - (p.retire ?? 0)) * (p.formation ?? 1);
    out[o + FRONT_FIELD.anchor] = p.anchorShift ?? Number.NaN;
    out[o + FRONT_FIELD.crestSpeed] = p.wallSpeed ?? Number.NaN;
    out[o + FRONT_FIELD.tauRate] = p.tauRate ?? Number.NaN;
    count += 1;
  }
  return count;
}

/**
 * At a spot with `BarrelSpot.tubeSpan` (the Canyon; the advisor's fourth ruling, 2026-10-22): each tube-regime piece of
 * a front (its points in a row within `footMax`, as `writeFrontRecords` splits them) whose span along the crest has
 * reached `span` of its wave heights (`heightOf` its highest foot crest's point, m), or one of whose points already had,
 * marks all its points (`FrontPoint.tubeSpan`). Once marked, a point stays marked, so a piece is drawn, felt and takes
 * the curl's columns from then on and a shrinking tube never pops out; a point joining a marked piece is marked with it.
 */
export function latchTubeSpans(points: FrontPoint[], footMax: number, span: number, heightOf: (point: FrontPoint) => number): void {
  let start = 0;
  while (start < points.length) {
    if (!(points[start].footHeight <= footMax)) {
      start += 1;
      continue;
    }
    let end = start + 1;
    while (end < points.length && points[end].front === points[start].front && points[end].footHeight <= footMax) end += 1;
    let spanned = false;
    let highest = start;
    for (let k = start; k < end; k += 1) {
      if (points[k].tubeSpan === true) spanned = true;
      if (points[k].footHeight > points[highest].footHeight) highest = k;
    }
    if (!spanned) spanned = points[end - 1].sigma - points[start].sigma >= span * heightOf(points[highest]);
    if (spanned) for (let k = start; k < end; k += 1) points[k].tubeSpan = true;
    start = end;
  }
}
