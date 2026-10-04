/**
 * The swept barrel's seam in the shaders (the Padang Padang spec, Part B, PR 3; the build sheet's "keep two surfaces and
 * cut a hole", after Surf's Up): the mask's value at a world xz, read from the texture `rasterizeBarrelMask` fills on
 * the seam grid's nodes (node-centred texels, linear filtering), and a per-pixel dither both surfaces share
 * (interleaved gradient noise, Jimenez 2014). Where the mask is 1 only the swept surface draws, where it is 0 only the
 * water, and across the band between each pixel shows exactly one of them. The seam's grid can be finer than the water.
 */
export const waterBarrelMaskPars = /* glsl */ `
uniform sampler2D waterBarrelMask;
uniform float waterBarrelMaskActive;
uniform vec4 waterBarrelGrid;
uniform vec2 waterBarrelGridSize;
float waterBarrelMaskAt( vec2 xz ) {
  vec2 g = ( xz - waterBarrelGrid.xy ) / waterBarrelGrid.z;
  return texture( waterBarrelMask, ( g + 0.5 ) / waterBarrelGridSize ).r;
}
float waterBarrelDither( vec2 fragCoord ) {
  return fract( 52.9829189 * fract( dot( fragCoord, vec2( 0.06711056, 0.00583715 ) ) ) );
}
`;

/** The water gives way where the mask covers it; in the band, where the mask beats the pixel's dither. */
export const WATER_BARREL_DISCARD = 'if ( waterBarrelMaskActive > 0.5 && waterBarrelMaskAt( vWaterWorld.xz ) > waterBarrelDither( gl_FragCoord.xy ) ) discard;';

/** A late repair draws only water fragments the original world-mask test rejected. Inactive masks never repair. */
export const WATER_BARREL_FALLBACK_DISCARD = 'if ( waterBarrelMaskActive < 0.5 || waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';

/** The swept surface keeps its original world-mask and dither test. */
export const SWEPT_BARREL_DISCARD = 'if ( waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';

/** Whether a fragment shader reads the barrel mask and the shared dither (for tests). */
export function mirrorsBarrelDither(fragment: string): boolean {
  return fragment.includes('waterBarrelMaskAt( vWaterWorld.xz )') && fragment.includes('waterBarrelDither( gl_FragCoord.xy )');
}
