/** The Rich water's gloss where its ripples are resolved (G8). */
export const RICH_BASE_ROUGHNESS = 0.08;
/** Roughness never rises past this from the anti-aliasing (a matte sea would lose its glint path). */
const MAX_ROUGHNESS = 0.6;

/**
 * Specular anti-aliasing (LEAN-style): slope variance a pixel's footprint
 * averages away reappears as roughness, so distant ripples dim to a sheen
 * instead of sparkling. three's GGX takes α = roughness², and α² grows by
 * twice the slope variance (Toksvig).
 */
export function richRoughness(base: number, variance: number): number {
  const alpha = base * base;
  return Math.min(MAX_ROUGHNESS, Math.sqrt(Math.sqrt(alpha * alpha + 2 * variance)));
}

export const waterSpecularPars = /* glsl */ `
float richRoughness( float base, float variance ) {
  float alpha = base * base;
  return min( ${MAX_ROUGHNESS.toFixed(3)}, sqrt( sqrt( alpha * alpha + 2.0 * variance ) ) );
}
`;

/** Classic's roughness, which the Rich water keeps on its underside. */
export const CLASSIC_ROUGHNESS = 0.62;

/** GLSL: the Rich gloss. From below, past the Snell window, the water reflects itself, not the sky: Classic's roughness keeps that dim. Needs `faceDirection`. */
export const RICH_SPECULAR = `roughnessFactor = faceDirection > 0.0 ? richRoughness( roughnessFactor, waterRippleVariance ) : ${CLASSIC_ROUGHNESS.toFixed(3)};`;
