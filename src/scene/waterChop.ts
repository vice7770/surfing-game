import { DataTexture, FloatType, RGBAFormat, Vector2, Vector3, type Texture } from 'three';

/**
 * Wind chop for both water meshes (plan §2.2, WebGL2 tier): six short
 * deep-water waves (ω = √(gk), steepness k·a ≈ 0.075) perturb the shading
 * normal only, never the physics surface, and fade with viewing distance.
 * `waterChop` scales them; P3's local wind will drive it.
 */
export const waterChopPars = /* glsl */ `
uniform float waterTime;
uniform float waterChop;
uniform sampler2D waterChopMap;
uniform float waterChopPatch;
uniform float waterChopFft;
varying vec3 vWaterWorld;

vec2 waterChopSlope( vec2 p, float t ) {
  // The WebGPU tier's FFT wind sea (FftChop), when it runs; else six analytic waves.
  if ( waterChopFft > 0.5 ) return texture2D( waterChopMap, p / waterChopPatch ).xy;
  const vec3 waves[6] = vec3[6](
    vec3( 0.94, 0.34, 1.9 ), vec3( -0.50, 0.87, 1.3 ), vec3( 0.20, -0.98, 2.7 ),
    vec3( 0.77, 0.64, 0.85 ), vec3( -0.90, -0.43, 3.4 ), vec3( 0.34, 0.94, 1.1 )
  );
  vec2 slope = vec2( 0.0 );
  for ( int i = 0; i < 6; i ++ ) {
    vec3 wave = waves[ i ];
    float k = 6.2831853 / wave.z;
    float amplitude = 0.012 * wave.z;
    float phase = k * dot( wave.xy, p ) - sqrt( 9.81 * k ) * t + float( i ) * 1.7;
    slope -= amplitude * k * wave.xy * sin( phase );
  }
  return slope;
}
`;

export const waterChopNormal = /* glsl */ `
#include <normal_fragment_begin>
{
  float chopFade = exp( -length( vWaterWorld - cameraPosition ) / 80.0 );
  vec2 chopSlope = waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime );
  vec3 chopNormal = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  chopNormal = normalize( chopNormal + vec3( -chopSlope.x, 0.0, -chopSlope.y ) );
  normal = normalize( ( viewMatrix * vec4( chopNormal, 0.0 ) ).xyz );
}
`;

export const DEFAULT_WATER_CHOP = 0.25;

/**
 * The FFT chop's slope map, patch size and switch, shared by every water shader
 * (the same uniform objects in each material), so one FftChop render updates all.
 */
/** The Classic map's placeholder until a transform runs. */
const placeholder = new DataTexture(new Float32Array(4), 1, 1, RGBAFormat, FloatType) as Texture;

export const chopFieldUniforms = {
  waterChopMap: { value: placeholder },
  waterChopPatch: { value: 64 },
  waterChopFft: { value: 0 },
  /**
   * Rich's cascades (item 4): their moments as one texture array (layers coarse, fine and cross; three binds its
   * empty array until a transform runs), the two patches, m, and the switch.
   */
  waterChopMoments: { value: null as Texture | null },
  waterChopPatches: { value: new Vector2(64, 12.25) },
  waterChopCascades: { value: 0 },
  /** Each cascade's whole-patch slope covariance (xx, zz, xz) at unit strength: its statistics past its last mip level. */
  waterChopCoarseCov: { value: new Vector3() },
  waterChopFineCov: { value: new Vector3() },
};

/** Rich's moment maps carry mip levels 0 to this (16 texels a side at the last); past it the shaders take each cascade's whole-patch covariance. */
export const CHOP_MOMENT_LEVELS = 4;
/** The chop's grid, texels a side (fftChopMath.FFT_CHOP_SIZE, kept here so the shared chunk needs no import of the maths). */
const CHOP_TEXELS = 256;

/**
 * Rich's cascades (item 4) for shaders that read the chop's slope only (the caustics): both cascades' slopes at level
 * 0, from the moment array. Needs `waterChopPars`; its caller takes `waterChopSlope` where `waterChopCascades` is off.
 */
export const waterChopCascadePars = /* glsl */ `
uniform highp sampler2DArray waterChopMoments;
uniform vec2 waterChopPatches;
uniform float waterChopCascades;
vec2 waterChopCascadeSlope( vec2 p ) {
  return textureLod( waterChopMoments, vec3( p / waterChopPatches.x, 0.0 ), 0.0 ).xy
    + textureLod( waterChopMoments, vec3( p / waterChopPatches.y, 1.0 ), 0.0 ).xy;
}
`;

/**
 * Rich: the chop's mean slope over the pixel's footprint and the covariance (xx, zz, xz) it leaves unresolved, at
 * unit strength (LEAN mapping). With the cascades, from their moments' mip levels (the slope moments sx², sz² and
 * sx·sz box-filtered, after web-ocean's js/wgsl/sim.js; MIT licence, © 2026 Maksymilian Dendura); else from the six analytic waves,
 * each kept as far as the footprint (`dpdx`, `dpdy`: world xz per pixel) resolves it and the rest turned to variance.
 * Needs `waterChopPars`.
 */
export const waterChopMomentPars = /* glsl */ `
${waterChopCascadePars}
uniform vec3 waterChopCoarseCov;
uniform vec3 waterChopFineCov;
// One cascade's mean slope and second moments (xx, zz, xz) over the footprint: its mip levels while the footprint is
// within them, the whole patch's (mean nil) past them. Explicit gradients, so a fragment may skip the maps.
void waterChopCascade( float layer, float side, vec3 whole, vec2 p, vec2 dpdx, vec2 dpdy, inout vec2 mean, inout vec3 second ) {
  float level = log2( max( max( length( dpdx ), length( dpdy ) ) * ${CHOP_TEXELS}.0 / side, 1e-6 ) );
  float far = smoothstep( ${CHOP_MOMENT_LEVELS}.0 - 0.5, ${CHOP_MOMENT_LEVELS}.0 + 0.5, level );
  second += far * whole;
  if ( far >= 1.0 ) return;
  vec2 uv = p / side;
  vec4 moments = textureGrad( waterChopMoments, vec3( uv, layer ), dpdx / side, dpdy / side );
  vec2 crossed = textureGrad( waterChopMoments, vec3( uv, 2.0 ), dpdx / side, dpdy / side ).xy;
  mean += ( 1.0 - far ) * moments.xy;
  second += ( 1.0 - far ) * vec3( moments.zw, layer > 0.5 ? crossed.y : crossed.x );
}
void waterChopStats( vec2 p, float t, vec2 dpdx, vec2 dpdy, out vec2 mean, out vec3 cov ) {
  if ( waterChopCascades > 0.5 ) {
    vec2 coarseMean = vec2( 0.0 );
    vec3 coarseSecond = vec3( 0.0 );
    vec2 fineMean = vec2( 0.0 );
    vec3 fineSecond = vec3( 0.0 );
    waterChopCascade( 0.0, waterChopPatches.x, waterChopCoarseCov, p, dpdx, dpdy, coarseMean, coarseSecond );
    waterChopCascade( 1.0, waterChopPatches.y, waterChopFineCov, p, dpdx, dpdy, fineMean, fineSecond );
    mean = coarseMean + fineMean;
    // Each cascade's covariance, E[s sᵀ] − E[s] E[s]ᵀ (independent cascades add).
    cov = coarseSecond - vec3( coarseMean * coarseMean, coarseMean.x * coarseMean.y )
      + fineSecond - vec3( fineMean * fineMean, fineMean.x * fineMean.y );
    cov.xy = max( cov.xy, 0.0 );
    return;
  }
  const vec3 waves[6] = vec3[6](
    vec3( 0.94, 0.34, 1.9 ), vec3( -0.50, 0.87, 1.3 ), vec3( 0.20, -0.98, 2.7 ),
    vec3( 0.77, 0.64, 0.85 ), vec3( -0.90, -0.43, 3.4 ), vec3( 0.34, 0.94, 1.1 )
  );
  mean = vec2( 0.0 );
  cov = vec3( 0.0 );
  for ( int i = 0; i < 6; i ++ ) {
    vec3 wave = waves[ i ];
    float k = 6.2831853 / wave.z;
    float amplitude = 0.012 * wave.z;
    float phase = k * dot( wave.xy, p ) - sqrt( 9.81 * k ) * t + float( i ) * 1.7;
    // The footprint along the wave, and how much of the wave it keeps (a Gaussian filter about two pixels wide).
    float across = k * length( vec2( dot( dpdx, wave.xy ), dot( dpdy, wave.xy ) ) );
    float kept = exp( -0.125 * across * across );
    float slope = amplitude * k;
    mean -= kept * slope * wave.xy * sin( phase );
    cov += ( 1.0 - kept * kept ) * 0.5 * slope * slope * vec3( wave.xy * wave.xy, wave.x * wave.y );
  }
}
`;

/**
 * Rich's normal chunks: the chop's statistics at the fragment, and the glitter's covariance from them: the chop's
 * own, and what the distance fade (`chopFade`) takes off its mean, which the footprint still holds as roughness.
 * Leaves `waterChopMean` for the chunk to add, faded, to its slope. Needs `waterChopMomentPars` and the glitter's pars.
 */
export const RICH_CHOP_STATS = /* glsl */ `vec2 waterChopMean;
  vec3 waterChopSpread;
  waterChopStats( vWaterWorld.xz, waterTime, dFdx( vWaterWorld.xz ), dFdy( vWaterWorld.xz ), waterChopMean, waterChopSpread );
  waterGlitterCov = waterChop * waterChop * ( waterChopSpread + ( 1.0 - chopFade * chopFade ) * vec3( waterChopMean * waterChopMean, waterChopMean.x * waterChopMean.y ) );`;
