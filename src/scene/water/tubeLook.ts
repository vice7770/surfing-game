import { devParam } from '../../devTools';

/**
 * Dev switch `?tubeLook=merge` (ruling 10, 2026-11-11, `docs/research/tube-merge-2026-11-11/README.md`): the drawing
 * fixes that let the Wave Pool's tube read as part of its wave. The water's body colour already agrees across the
 * joins; what sets the tube apart is drawn lines and bands, each with a cause in the shading. Render only: nothing the
 * rider feels changes, and without the switch every program is today's byte for byte.
 *
 * 1. `withNormalGuard`: the navy outlines. The body's colour is worked out only where the shading normal faces the eye,
 *    and falls back to the deep-water colour (navy) elsewhere. At a silhouette the chop and ripples tip the shading
 *    normal past the eye though the surface itself still faces it, so the outline, the lip's edge and steep ripples on
 *    the sea drew as navy lines and dashes. The guard turns such a normal back to grazing and floors the view's
 *    cosine, so those pixels take the body's colour seen at a grazing angle.
 * 2. `withWallRipple`: the stripes on the tube's wall. The ripples' slope is a slope of a level surface (x and z); added
 *    whole to a near-vertical wall's normal it squeezes into stripes. It now fades with the wall's own tilt (the
 *    normal's y, squared): whole on level water, none on a vertical wall.
 *
 * Measured on headless stills of the rideable build (the ruling's README, "What the build measured"): the navy
 * outline from behind and the dashes on the sea go; the stripes at the wall's base ease only a little, so another
 * cause is left there. The ruling's rank 2 (the white lip as wrongly lit by the sky) is not built: with no sky through
 * the lip at all its pixels did not change. The white is the light through the thin lip, which belongs to the lip's
 * own look (ruling 9).
 */
export function tubeLookMerge(search?: string): boolean {
  return devParam('tubeLook', search)?.trim().toLowerCase() === 'merge';
}

/** Read once: the programs are compiled from it. */
export const TUBE_LOOK_MERGE = tubeLookMerge();

/** The floor under the view's cosine once the normal is guarded [provisional, ruling 10 rank 1]. */
export const GUARD_VIEW_COS = 0.03;

const VIEW_COS = 'float waterViewCos = dot( waterN, waterV );';
const GUARDED_VIEW_COS = /* glsl */ `// ?tubeLook=merge: a shading normal tipped past the eye is turned back to grazing (the navy outlines).
  waterN = normalize( waterN - min( 0.0, dot( waterN, waterV ) ) * waterV );
  float waterViewCos = max( dot( waterN, waterV ), ${GUARD_VIEW_COS.toFixed(2)} );`;

/** Rank 1: the body colour's normal guard, on a fragment shader built with `waterBodyFragment`. */
export function withNormalGuard(fragment: string, on = TUBE_LOOK_MERGE): string {
  return on ? fragment.replace(VIEW_COS, GUARDED_VIEW_COS) : fragment;
}

const RIPPLE_ADD = 'chopNormal = normalize( chopNormal + vec3( -chopSlope.x, 0.0, -chopSlope.y ) );';
const WALL_RIPPLE_ADD = /* glsl */ `// ?tubeLook=merge: a level surface's slopes fade on a wall as it stands up (the wall's stripes).
  chopNormal = normalize( chopNormal + chopNormal.y * chopNormal.y * vec3( -chopSlope.x, 0.0, -chopSlope.y ) );`;

/** Rank 3: the chop and ripples fade with the surface's tilt, on a fragment shader built with a chop normal block. */
export function withWallRipple(fragment: string, on = TUBE_LOOK_MERGE): string {
  return on ? fragment.replace(RIPPLE_ADD, WALL_RIPPLE_ADD) : fragment;
}
