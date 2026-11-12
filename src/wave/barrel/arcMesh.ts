import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';

/**
 * Ruling 18's build 2 (`TubeFace.arcMesh`, `?loftMesh=arc`; docs/research/pool-look-reference-2026-11-11/step6/README.md):
 * where a slice's vertices stand on its profile's curve before the throw.
 *
 * Before the face overturns for good the profile's lip mark is the face's steepest point (scripts/barrel-library.ts), not a
 * material point: it slides along the steep face from frame to frame (0.16 to 0.89 m from the crest within the pool case's
 * last 0.12 s, measured), and its lip-to-throat points all lie at that one place. Two slices a little apart in clock then
 * carry the same vertex index at different places on the crest's bend, and the loft's quads, joined index to index, pleat.
 *
 * Here, before the throw, the vertices between the crest and the toe (two marks that exist at every clock) stand at fixed
 * shares of that arc: the lip's and throat's points at the share the lip mark holds at the throw itself (clock 0, where the
 * face is vertical and the mark is the place the jet leaves from), the crest-to-lip points evenly up to it, the
 * throat-to-toe points evenly after it. So the lip-to-throat segment keeps zero length until the throw, at the place the jet
 * opens from, and from the throw on the library's own marks stand as they are (no vertex moves at clock 0: the share is the
 * mark's own there). Every vertex stays on the profile's own polyline; the back slope and the front are as before.
 */

/** The crest-to-toe span, profile points. A function, not a constant: `ProfileLibrary` reads this module too (ruling 19's frame join). */
const span = () => LANDMARK.toe - LANDMARK.crest;

/** The arc's length from the crest mark to the toe mark along the profile's polyline, m. */
function arcTo(profile: ArrayLike<number>, from: number, to: number): number {
  let length = 0;
  for (let i = from; i < to; i += 1) length += Math.hypot(profile[2 * i + 2] - profile[2 * i], profile[2 * i + 3] - profile[2 * i + 1]);
  return length;
}

/** The lip mark's share of the crest-to-toe arc, 0 to 1; NaN on a profile with no such arc. */
export function lipShare(profile: ArrayLike<number>): number {
  const whole = arcTo(profile, LANDMARK.crest, LANDMARK.toe);
  return whole > 0 ? arcTo(profile, LANDMARK.crest, LANDMARK.lip) / whole : Number.NaN;
}

/** The lip-to-throat arc's length, m: 0 until the lip is a jet with an underside. */
export function jetLength(profile: ArrayLike<number>): number {
  return arcTo(profile, LANDMARK.lip, LANDMARK.throat);
}

/** Per profile point, the polyline segment it stands on (its first point's index) and how far along it, 0 to 1. */
export interface ArcPlaces {
  from: Uint8Array;
  share: Float32Array;
}

export function arcPlaces(): ArcPlaces {
  const places = { from: new Uint8Array(PROFILE_POINTS), share: new Float32Array(PROFILE_POINTS) };
  for (let i = 0; i < PROFILE_POINTS; i += 1) places.from[i] = i;
  return places;
}

/**
 * Each point's place on `profile`'s polyline with the lip's and throat's points at `share` of the crest-to-toe arc
 * (`lipShare` at the throw). Points up to the crest and from the toe keep their own place. Returns false, the places
 * untouched, where the rule does not apply: the lip already has an underside (`jetLength` over 0), the share is not a
 * number strictly between 0 and 1, or the arc has no length.
 */
export function arcRespace(profile: ArrayLike<number>, share: number, arc: Float64Array, into: ArcPlaces): boolean {
  if (!(share > 0 && share < 1) || jetLength(profile) > 0) return false;
  const SPAN = span();
  // The arc's length at each of the crest-to-toe points.
  arc[0] = 0;
  for (let k = 0; k < SPAN; k += 1) {
    const i = LANDMARK.crest + k;
    arc[k + 1] = arc[k] + Math.hypot(profile[2 * i + 2] - profile[2 * i], profile[2 * i + 3] - profile[2 * i + 1]);
  }
  const whole = arc[SPAN];
  if (!(whole > 0)) return false;
  let k = 0;
  for (let i = LANDMARK.crest + 1; i < LANDMARK.toe; i += 1) {
    const u = i <= LANDMARK.lip ? (share * (i - LANDMARK.crest)) / (LANDMARK.lip - LANDMARK.crest)
      : i < LANDMARK.throat ? share
        : share + ((1 - share) * (i - LANDMARK.throat)) / (LANDMARK.toe - LANDMARK.throat);
    const target = u * whole;
    while (k < SPAN - 1 && arc[k + 1] <= target) k += 1;
    const step = arc[k + 1] - arc[k];
    into.from[i] = LANDMARK.crest + k;
    into.share[i] = step > 0 ? Math.min(1, Math.max(0, (target - arc[k]) / step)) : 0;
  }
  return true;
}
