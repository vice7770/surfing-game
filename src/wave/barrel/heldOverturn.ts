import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';

/**
 * A frame's overturn, as the advisor's `metrics.py` measures it (tools/basilisk/analysis/interface.py: `void_polygon`,
 * `jet_polygon`, `shape_metrics`), on the library's 128 points with their fixed landmarks (the Padang Padang spec,
 * Part B, PR 5: the crash's water and air). In h0:
 * - `jetArea`: the jet, the water above the void where the surface folds back, behind the vertical through the throat:
 *   the top surface's last crossing of the throat's x before the tip, on to the tip and back under it to the throat;
 * - `voidArea`: the void, from the tip under the jet to the throat and down the face to its point nearest the tip (within
 *   2 h0 ahead), closed straight back to the tip;
 * - `voidLength`, (`axisX`, `axisY`): the void's diameter, its longest chord, and that chord's direction, forward and down.
 * A frame whose surface never folds back has neither. Measured on each case's held frame (PR 4's `heldFrame`: the jet off
 * the face and the void open), they agree with the runs' own metrics frame within 7 % (jet) and 12 % (void). Only + − × ÷
 * and √, for online determinism.
 */
export interface Overturn {
  jetArea: number;
  voidArea: number;
  voidLength: number;
  axisX: number;
  axisY: number;
}

const FLOATS = 2 * PROFILE_POINTS;
/** How far ahead of the tip the face is searched for its point nearest the tip, h0 (metrics.py's 2.0). */
const FACE_REACH = 2;

const none = (): Overturn => ({ jetArea: 0, voidArea: 0, voidLength: 0, axisX: 1, axisY: 0 });

/** Frame `frame`'s overturn, from a case's frames (PROFILE_POINTS (x, y) pairs per frame, h0). */
export function overturnAt(frames: Float32Array, frame: number): Overturn {
  const o = frame * FLOATS;
  const x = (i: number) => frames[o + 2 * i];
  const y = (i: number) => frames[o + 2 * i + 1];
  const tipX = x(LANDMARK.lip);
  const tipY = y(LANDMARK.lip);
  // Overturned: the underside runs back from the tip to a throat behind it.
  if (!(tipX - x(LANDMARK.throat) > 0)) return none();
  // The void: the face's point nearest the tip, from the throat on.
  let k = -1;
  let nearest = Infinity;
  for (let i = LANDMARK.throat; i < PROFILE_POINTS; i += 1) {
    if (!(x(i) < tipX + FACE_REACH)) continue;
    const dx = x(i) - tipX;
    const dy = y(i) - tipY;
    const d = dx * dx + dy * dy;
    if (d < nearest) {
      nearest = d;
      k = i;
    }
  }
  if (k - LANDMARK.lip < 2) return none();
  let twice = 0;
  for (let i = LANDMARK.lip; i <= k; i += 1) {
    const j = i === k ? LANDMARK.lip : i + 1;
    twice += x(i) * y(j) - x(j) * y(i);
  }
  // Its diameter: the longest chord between two of its points.
  let longest = 0;
  let from: number = LANDMARK.lip;
  let to: number = LANDMARK.lip;
  for (let i = LANDMARK.lip; i <= k; i += 1) {
    for (let j = i + 1; j <= k; j += 1) {
      const dx = x(j) - x(i);
      const dy = y(j) - y(i);
      const d = dx * dx + dy * dy;
      if (d > longest) {
        longest = d;
        from = i;
        to = j;
      }
    }
  }
  const length = Math.sqrt(longest);
  // Forward and down, as the tilt below the horizontal is read (metrics.py: atan2(|vy|, |vx|)).
  const axisX = length > 0 ? Math.abs(x(to) - x(from)) / length : 1;
  const axisY = length > 0 ? -Math.abs(y(to) - y(from)) / length : 0;
  // The jet: from the top's last crossing of the throat's x before the tip.
  const throatX = x(LANDMARK.throat);
  let crossing = -1;
  for (let i = 0; i < LANDMARK.lip; i += 1) if ((x(i) - throatX) * (x(i + 1) - throatX) <= 0) crossing = i;
  let jetArea = 0;
  if (crossing >= 0) {
    const run = x(crossing + 1) - x(crossing);
    const t = run !== 0 ? (throatX - x(crossing)) / run : 0;
    const startX = x(crossing) + t * run;
    const startY = y(crossing) + t * (y(crossing + 1) - y(crossing));
    let jet = 0;
    let px = startX;
    let py = startY;
    for (let i = crossing + 1; i <= LANDMARK.throat; i += 1) {
      jet += px * y(i) - x(i) * py;
      px = x(i);
      py = y(i);
    }
    jet += px * startY - startX * py;
    jetArea = Math.abs(jet) / 2;
  }
  return { jetArea, voidArea: Math.abs(twice) / 2, voidLength: length, axisX, axisY };
}

/** Two overturns blended by `weight` (0 the first, 1 the second), as the library blends their frames; the axis renormalised with √. */
export function blendOverturn(a: Overturn, b: Overturn, weight: number): Overturn {
  if (weight === 0) return a;
  if (weight === 1) return b;
  const lerp = (p: number, q: number) => p + weight * (q - p);
  const ax = lerp(a.axisX, b.axisX);
  const ay = lerp(a.axisY, b.axisY);
  const norm = Math.sqrt(ax * ax + ay * ay);
  return {
    jetArea: lerp(a.jetArea, b.jetArea), voidArea: lerp(a.voidArea, b.voidArea), voidLength: lerp(a.voidLength, b.voidLength),
    axisX: norm > 0 ? ax / norm : 1, axisY: norm > 0 ? ay / norm : 0,
  };
}
