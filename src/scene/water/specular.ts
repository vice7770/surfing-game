/** The Rich water's gloss where its ripples are resolved (G8). */
export const RICH_BASE_ROUGHNESS = 0.08;
/** Roughness never rises past this from the anti-aliasing (a matte sea would lose its glint path). */
const MAX_ROUGHNESS = 0.6;

/**
 * Specular anti-aliasing (LEAN-style): slope variance a pixel's footprint
 * averages away reappears as roughness, so distant ripples dim to a sheen
 * instead of sparkling. α² grows by twice the slope variance (Toksvig).
 */
export function richRoughness(base: number, variance: number): number {
  return Math.min(MAX_ROUGHNESS, Math.sqrt(base * base + 2 * variance));
}

export const waterSpecularPars = /* glsl */ `
float richRoughness( float base, float variance ) {
  return min( ${MAX_ROUGHNESS.toFixed(3)}, sqrt( base * base + 2.0 * variance ) );
}
`;
