/**
 * The swept barrel's seam in the shaders (the Padang Padang spec, Part B, PR 3; the build sheet's "keep two surfaces and
 * cut a hole", after Surf's Up): the mask's value at a world xz, read from the texture `rasterizeBarrelMask` fills on
 * the render grid's nodes (node-centred texels, linear filtering). Where the mask is full only the curl draws, where it
 * is 0 only the water, and across the band between, where the curl rests on the water, a transparent copy of the curl
 * (the band) fades it into the water by the mask. Needs `waterGrid` and `waterGridSize`.
 *
 * The seam was once a per-pixel dither of the two surfaces, interleaved gradient noise (Jimenez 2014). That noise is
 * made to be averaged over frames; this renderer has no temporal pass (MSAA only), so the dither showed as a dot grid,
 * worst at a low sun where the two halves were shaded apart (look-fix round 1). Blending over the coincident surfaces
 * replaces it.
 */
export const waterBarrelMaskPars = /* glsl */ `
uniform sampler2D waterBarrelMask;
uniform float waterBarrelMaskActive;
float waterBarrelMaskAt( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  return texture( waterBarrelMask, ( g + 0.5 ) / waterGridSize ).r;
}
`;

/**
 * The mask's value from which it is full, the water gives way and the opaque curl draws: a hair under 1, since the mask
 * is an 8-bit texture read with linear filtering, and between nodes that are all 255 it reads 1 to within the filter's
 * precision, while one node short of 255 brings it to 254/255 at most (look-fix round 1).
 */
export const BARREL_MASK_FULL = 0.999;
const FULL = BARREL_MASK_FULL.toFixed(3);

/** The water gives way only where the mask is full, with no dither (look-fix round 1). */
export const WATER_BARREL_DISCARD = `if ( waterBarrelMaskActive > 0.5 && waterBarrelMaskAt( vWaterWorld.xz ) >= ${FULL} ) discard;`;

/** The opaque curl shows exactly where the water gave way: the same test, the other way. */
export const SWEPT_BARREL_DISCARD = `if ( waterBarrelMaskAt( vWaterWorld.xz ) < ${FULL} ) discard;`;

/**
 * The band (the curl's transparent copy, `SWEPT_BAND` defined): it draws only across the band, where the mask is
 * neither 0 nor full and the curl rests on the water, its alpha the mask, so the curl fades into the water it rests on.
 * `sweptBandOpaque` (dev) draws it opaque, to compare the curl's shading with the water's under it.
 */
export const SWEPT_BAND_ALPHA = /* glsl */ `float sweptBandMask = waterBarrelMaskAt( vWaterWorld.xz );
if ( sweptBandMask <= 0.0 || sweptBandMask >= ${FULL} ) discard;
diffuseColor.a = sweptBandOpaque > 0.5 ? 1.0 : sweptBandMask;`;

/** What draws a pixel whose mask reads `mask` (the three discards' CPU twin): the water, the opaque curl, the band's alpha. */
export function seamDraw(mask: number): { water: boolean; curl: boolean; band: number } {
  return { water: mask < BARREL_MASK_FULL, curl: mask >= BARREL_MASK_FULL, band: mask > 0 && mask < BARREL_MASK_FULL ? mask : 0 };
}

/**
 * Whether a fragment shader reads the barrel mask's cut, the water's or the curl's (for tests). Named for the dither the
 * seam once shared; it has none now.
 */
export function mirrorsBarrelDither(fragment: string): boolean {
  return fragment.includes('waterBarrelMaskAt( vWaterWorld.xz )') && fragment.includes(FULL);
}
