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

/**
 * The screen-space variance of the pixel's filter kernel, px², that turns the shading normal's own variation across a
 * pixel into slope variance: σ² (|∂n/∂x|² + |∂n/∂y|²), added to the ripples' before `richRoughness` (Kaplanyan, Hill,
 * Patney & Lefohn 2016; Tokuyoshi & Kaplanyan 2019). 0.15 is Filament's default for the same form (its
 * `specularAntiAliasingVariance`), close to the papers' Gaussian kernel, 1/(2π) [provisional until checked against them].
 * The ripple map's mips give the variance of the ripples a pixel cannot resolve, but the Catmull-Rom normal, the
 * analytic chop, the churn relief and the loft's interpolated normals add curvature that is unresolved too; at roughness
 * 0.08 (GGX α = 0.0064) the sun's glint lands on single pixels along cell and triangle edges.
 */
export const NORMAL_KERNEL_VARIANCE = 0.15;
/** The most slope variance that variation adds: Filament's clamp on α², 0.2 (`specularAntiAliasingThreshold`), halved, as α² grows by twice it. */
export const NORMAL_KERNEL_CLAMP = 0.1;

/** CPU twin of the GLSL: the slope variance the shading normal's screen-space derivatives leave unresolved. */
export function normalKernelVariance(dx: readonly number[], dy: readonly number[]): number {
  const squares = (v: readonly number[]) => v.reduce((sum, c) => sum + c * c, 0);
  return Math.min(NORMAL_KERNEL_CLAMP, NORMAL_KERNEL_VARIANCE * (squares(dx) + squares(dy)));
}

/**
 * GLSL: the Rich gloss. The normal's own unresolved variation joins the ripples' variance in a line of its own, before
 * `richRoughness`, whose call and clamp are unchanged. From below, past the Snell window, the water reflects itself, not
 * the sky: Classic's roughness keeps that dim. Needs `faceDirection`.
 */
export const RICH_SPECULAR = `{
    vec3 richNormalDx = dFdx( normal );
    vec3 richNormalDy = dFdy( normal );
    waterRippleVariance += min( ${NORMAL_KERNEL_VARIANCE.toFixed(3)} * ( dot( richNormalDx, richNormalDx ) + dot( richNormalDy, richNormalDy ) ), ${NORMAL_KERNEL_CLAMP.toFixed(3)} );
  }
  roughnessFactor = faceDirection > 0.0 ? richRoughness( roughnessFactor, waterRippleVariance ) : ${CLASSIC_ROUGHNESS.toFixed(3)};`;
