import { smoothstep } from './tubeSeam';

/**
 * Ruling 21's dug foot (`TubeFace.dug`, `?wallFoot=dug`; the water-physics advisor's ruling 21,
 * docs/research/pool-look-reference-2026-11-11/ruling-21.md; notes in step9/README.md). Pure pieces, only + − × ÷.
 *
 * Today the seam blend holds every floor vertex on the solver's sea where the case lies under it. On the wave's front the
 * case's foot lies 0.2 to 0.4 m under the sea, so the drawn face left the case at mid-face and ran flat along the sea: a
 * tight hollow corner there (*measured*, step 8). Under the switch the front is the case's own, and the return to the
 * sea is made ahead of the toe, on the flat trough, where the slopes differ by a few degrees.
 */

/**
 * The forward rest's lengths under the switch, in the slice's height H (`REST`'s own are 0.1, 0.5 and 3): the trough
 * holds until the sea is within `near` H of it, eases onto the sea over `ramp` H, and gives up `ahead` H past the toe.
 * Easing an offset Δ over a length L adds a slope of 1.5 Δ / L: 0.05 H over 2 H is 2° (*reasoned*, the ruling);
 * the lengths themselves are *provisional*.
 */
export const REST_DUG = { ramp: 2, near: 0.05, ahead: 5 } as const;

/**
 * Ruling 22's soft cap on the dig (docs/research/pool-look-reference-2026-11-11/ruling-22.md, point 3), in the slice's
 * height H and the sea's own depth: the dig (sea − drawn, m) is untouched up to `free` H, eased above it so it never
 * passes `most` H, and never more than `bed` of the sea's depth there. The structural dig is 0.35 H at most (the toe's
 * 0.3 to 0.4 m plus the trough's 0.18 m, *measured*); more means the sea stood unusually high over the fixed case.
 * All three are *provisional*.
 */
export const DUG_CAP = { free: 0.35, most: 0.5, bed: 0.5 } as const;

/**
 * The capped dig, m: `dig` itself (the same number) up to a = `DUG_CAP.free` H; above it a + (b − a) x / (1 + x) with
 * x = (dig − a) / (b − a) and b = `DUG_CAP.most` H, whose value and slope meet the untouched part's at a and which
 * stays under b; and at most `DUG_CAP.bed` of the sea's `depth` there (sea − bed, m; no rule where it is not finite).
 */
export function dugCap(dig: number, height: number, depth: number): number {
  const a = DUG_CAP.free * height;
  const b = DUG_CAP.most * height;
  let capped = dig;
  if (dig > a && b > a) {
    const x = (dig - a) / (b - a);
    capped = a + ((b - a) * x) / (1 + x);
  }
  if (depth < Infinity) {
    const most = DUG_CAP.bed * Math.max(0, depth);
    if (capped > most) capped = most;
  }
  return capped;
}

/**
 * How many profile points past the crest ease today's height share into the clock's alone: a quarter of the 32 points
 * from the crest to the lip mark (the ruling's item 2: no step between the crest, on today's rule, and the next point).
 */
export const DUG_CREST = 8;

/**
 * A profile point's ramp under the switch: −1 at and behind the crest (today's rule, untouched), then a smoothstep from
 * 0 at the crest to 1 at `DUG_CREST` points past it, and 1 from there (the face, the trough, the forward extension).
 */
export function dugCrestRamp(profileIndex: number, crest: number): number {
  if (!(profileIndex > crest)) return -1;
  return smoothstep((profileIndex - crest) / DUG_CREST);
}

/**
 * The case's share α at a vertex past the crest: α_τ (`tau`) alone where the ramp is whole, and today's α_τ · α_h
 * (`height`, the share by its height over the sea) at the crest, eased between: α = α_τ (α_h + (1 − α_h) ramp).
 */
export function dugShare(tau: number, height: number, ramp: number): number {
  return tau * (height + (1 - height) * ramp);
}

/**
 * Where the k-th of `count` forward vertices stands, m along its ray: evenly from the toe (`toeX`, k = 0) to
 * `REST_DUG.ahead` H plus the mask's band past it (k = `count`), so the mesh reaches the rest's end and the band beyond.
 */
export function dugAlong(k: number, count: number, toeX: number, height: number, band: number): number {
  return toeX + (k * (REST_DUG.ahead * height + band)) / count;
}

/**
 * The profile's own line past the toe at `along` (m): the segment `from`..`last − 1` that holds it, into `out` as
 * (segment's first point, share along it); at and past the last point, the last segment at share 1 (its front level).
 */
export function dugPlace(profile: ArrayLike<number>, from: number, last: number, along: number, out: Float64Array): void {
  let m = from;
  while (m < last - 1 && profile[2 * (m + 1)] < along) m += 1;
  const x0 = profile[2 * m];
  const x1 = profile[2 * m + 2];
  out[0] = m;
  out[1] = along >= profile[2 * last] ? 1 : x1 > x0 ? Math.min(1, Math.max(0, (along - x0) / (x1 - x0))) : 0;
}
