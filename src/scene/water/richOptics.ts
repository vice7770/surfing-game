import { Vector3 } from 'three';

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
