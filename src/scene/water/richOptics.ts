import { Vector3 } from 'three';
import { BED_RAY_FLOOR, WATER_IOR, type Rgb } from '../waterOptics';

/**
 * What the Rich look adds to the water's optics, compiled into the Rich programs only: Classic keeps `waterOptics.ts`
 * byte for byte.
 */

/**
 * The least cosine the Rich shading normal keeps with the eye, in view space. A rendering constant [provisional]: a
 * perturbed shading normal that faces away from the eye has no physical meaning, and 0.05 (87° off the eye) keeps the
 * grazing Fresnel while the surface stays visible.
 */
export const RICH_NORMAL_FLOOR = 0.05;

/**
 * CPU twin of `RICH_NORMAL_GUARD`: the normal pushed back along the eye direction until it faces the eye by the floor,
 * n += (floor − n·v) v, then renormalised. A normal that already faces the eye by the floor is returned unchanged; one
 * turned away is turned back in the plane it makes with the eye.
 */
export function guardedNormal(normal: Vector3, toEye: Vector3, floor = RICH_NORMAL_FLOOR): Vector3 {
  const facing = normal.dot(toEye);
  const guarded = normal.clone();
  if (facing < floor) guarded.addScaledVector(toEye, floor - facing).normalize();
  return guarded;
}

/**
 * GLSL, run right after a Rich normal chunk (view space). `waterBodyFragment` gives a surface turned away from the eye
 * R∞ alone (the deep water's colour: navy-cobalt in Padang Padang's clear water), and the Rich normal adds the chop, the
 * ripples and the churn per pixel, so at grazing angles nothing kept it facing the eye: pixels along the edge of a
 * trough, the far waterline and a face's silhouette turned away and painted saturated dashes. Pushing the normal back
 * to the visible hemisphere keeps their colour and the sky's sheen (`guardedNormal`). `vViewPosition` points from the
 * fragment to the eye.
 */
export const RICH_NORMAL_GUARD = /* glsl */ `
{
  vec3 richGuardView = isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( vViewPosition );
  float richGuardCos = dot( normal, richGuardView );
  if ( richGuardCos < ${RICH_NORMAL_FLOOR.toFixed(2)} ) normal = normalize( normal + ( ${RICH_NORMAL_FLOOR.toFixed(2)} - richGuardCos ) * richGuardView );
}
`;

/** GLSL `refract`: the incident direction bent through a surface with unit normal `normal`, by the index ratio `eta` (zero past total reflection). */
export function refractRay(incident: Vector3, normal: Vector3, eta = 1 / WATER_IOR): Vector3 {
  const d = normal.dot(incident);
  const k = 1 - eta * eta * (1 - d * d);
  if (k < 0) return new Vector3();
  return incident.clone().multiplyScalar(eta).addScaledVector(normal, -(eta * d + Math.sqrt(k)));
}

/**
 * Metres of water the view ray and the sun's ray cross for each metre of depth, 1/|r_v.y| + 1/|r_s.y|, from the
 * refracted rays' world-vertical components, each held at `BED_RAY_FLOOR` (`waterBodyFragment`'s Rich body).
 */
export function bedPathFactor(refractedView: Vector3, refractedSun: Vector3): number {
  return 1 / Math.max(BED_RAY_FLOOR, -refractedView.y) + 1 / Math.max(BED_RAY_FLOOR, -refractedSun.y);
}

/**
 * CPU twin of the Rich body (`waterBodyFragment`'s `rich` option): R∞ (1 − e) + A · bedLight · e, e = e^{−K · depth ·
 * bedPathFactor}, for a water of diffuse attenuation `diffuse` and deep reflectance `deep` over a bed of albedo `bed`.
 */
export function richShallowReflectance(
  water: { deep: Rgb; diffuse: Rgb; bed: Rgb }, depth: number, refractedView: Vector3, refractedSun: Vector3, bedLight = 1,
): Rgb {
  const path = Math.max(0, depth) * bedPathFactor(refractedView, refractedSun);
  return [0, 1, 2].map((i) => {
    const reach = Math.exp(-water.diffuse[i] * path);
    return water.deep[i] * (1 - reach) + water.bed[i] * bedLight * reach;
  }) as unknown as Rgb;
}
