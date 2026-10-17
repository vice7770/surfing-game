import { ShaderChunk } from 'three';

/**
 * The Rich water's mirror of the sky (the horizon plan, item 3): three's image-based specular, with the reflected ray
 * and its blur taken from the spread of the water's slopes, as a far sea needs. Adapted from web-ocean's sky reflection
 * (js/wgsl/ocean.js, MIT licence, © 2026 Maksymilian Dendura), rewritten for three's PMREM and split-sum lighting:
 * - the blur (the PMREM's roughness) from the slope variance a pixel does not resolve: what its footprint spans (the
 *   slopes' screen derivatives), the ripples it filters, and the wind chop faded out with distance;
 * - at grazing angles the facets a viewer sees lean toward it (projected area and masking), so the mirror's normal
 *   tilts toward the viewer and sees higher sky;
 * - rays reflected below the horizon (which would read the photo's dark lower half) fold back up;
 * - the Fresnel term from a normal blended 45 % toward up: the long waves' facet with the grazing statistics of all
 *   that is finer, so far water at grazing stays as reflective as a real sea. It is Schlick's Fresnel itself, in place
 *   of three's split-sum DFG: for a GGX lobe as rough as the far water's (0.3–0.6) that DFG masks most of a grazing
 *   view's reflection away (a tenth of the sky where a sea mirrors over half), where on a sea the masked light reaches
 *   the eye off the next wave.
 * The sun's glitter (the direct light) is untouched: this is the environment's share only.
 */

/** Mean square slope of the analytic wind chop at `waterChop` 1: six waves of steepness k·a = 2π·0.012, each (ka)²/2. */
export const CHOP_MEAN_SQUARE_SLOPE = 6 * (2 * Math.PI * 0.012) ** 2 / 2;
/** The chop's slopes fade over this distance, m (`waterChopNormal`): what fades is still there, as roughness. */
export const CHOP_FADE_DISTANCE = 80;
/** Most slope variance the footprint term adds (web-ocean caps each axis at 0.03). */
export const FOOTPRINT_VARIANCE_CAP = 0.06;
/** The grazing tilt toward the viewer per unit rms slope, and the Smith parameter it is gone by (web-ocean). */
export const GRAZING_TILT = 0.32;
export const GRAZING_TILT_END = 2.5;
/** Share of a reflection below the horizon folded back above it, and the Fresnel normal's blend toward up (web-ocean). */
export const BELOW_HORIZON_FOLD = 0.4;
export const FRESNEL_UP_BLEND = 0.45;

type Vec3 = { x: number; y: number; z: number };
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
};
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Chop slope variance lost to its fade at `distance` m, for a chop strength: (1 − fade²) of its mean square slope. */
export function fadedChopVariance(chop: number, distance: number): number {
  const fade = Math.exp(-Math.max(0, distance) / CHOP_FADE_DISTANCE);
  return chop * chop * CHOP_MEAN_SQUARE_SLOPE * (1 - fade * fade);
}

/**
 * The environment lookup's roughness: the material's (the sun's gloss, ripples and foam in it) with the further slope
 * variance the reflection spreads over, α² growing by twice it (as `richRoughness` grows the sun's).
 */
export function skyRoughness(roughness: number, variance: number): number {
  return Math.min(1, Math.sqrt(Math.sqrt(roughness ** 4 + 2 * Math.max(0, variance))));
}

/**
 * The reflected ray toward the sky (world space; `view` toward the eye, `normal` the shading normal, `meanSquareSlope`
 * the unresolved slope variance, both axes): the grazing tilt toward the viewer, then the fold above the horizon.
 * CPU twin of the shader's ray.
 */
export function skyReflectionRay(view: Vec3, normal: Vec3, meanSquareSlope: number): Vec3 {
  const v = normalize(view);
  const sigma = Math.sqrt(Math.max(0, meanSquareSlope) / 2);
  const sine = Math.sqrt(Math.max(1 - v.y * v.y, 1e-6));
  const a = Math.max(v.y, 1e-3) / sine / (Math.SQRT2 * Math.max(sigma, 1e-3));
  const tilt = GRAZING_TILT * sigma * (1 - smoothstep(0, GRAZING_TILT_END, a));
  const toward = normalize({ x: v.x + 1e-5, y: 0, z: v.z });
  const n = normalize({ x: normal.x + toward.x * tilt, y: normal.y, z: normal.z + toward.z * tilt });
  const d = v.x * n.x + v.y * n.y + v.z * n.z;
  const r = { x: 2 * d * n.x - v.x, y: 2 * d * n.y - v.y, z: 2 * d * n.z - v.z };
  r.y = Math.abs(r.y) * BELOW_HORIZON_FOLD + Math.max(r.y, 0) * (1 - BELOW_HORIZON_FOLD);
  return normalize(r);
}

/**
 * The split-sum terms (scale, bias) that make three's indirect specular F0·scale + F90·bias Schlick's Fresnel at a
 * cosine: (1 − (1 − c)⁵, (1 − c)⁵), with no energy left to its multiple-scattering term (scale + bias = 1).
 */
export function skyFresnelTerms(cosine: number): [number, number] {
  const grazing = (1 - Math.min(1, Math.max(0, cosine))) ** 5;
  return [1 - grazing, grazing];
}

/** The cosine the Fresnel term takes: the view against the normal blended toward up. */
export function fresnelCosine(view: Vec3, normal: Vec3): number {
  const v = normalize(view);
  const n = normalize({
    x: normal.x * (1 - FRESNEL_UP_BLEND), y: normal.y * (1 - FRESNEL_UP_BLEND) + FRESNEL_UP_BLEND, z: normal.z * (1 - FRESNEL_UP_BLEND),
  });
  return Math.min(1, Math.max(0, v.x * n.x + v.y * n.y + v.z * n.z));
}

const f = (value: number) => value.toFixed(6);

/**
 * GLSL after <lights_physical_pars_fragment> (it needs the environment map and its sampler): the sky's radiance for
 * the Rich water, and the split-sum terms its Fresnel takes (`skyFresnelTerms`). Needs `vWaterWorld`, `waterChop` and
 * `waterRippleVariance`.
 */
export const waterSkyPars = /* glsl */ `
uniform float waterSkyGain;
vec2 waterSkyDfg = vec2( 0.0 );
#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
// One sky lookup either side: beneath (\`face\` < 0, where the water mirrors itself) three's own ray and blur.
vec3 waterSkyRadiance( const in vec3 normal, const in float roughness, const in float face ) {
  vec3 toEye = cameraPosition - vWaterWorld;
  float eyeDistance = length( toEye );
  vec3 V = toEye / max( eyeDistance, 1e-4 );
  vec3 N = inverseTransformDirection( normal, viewMatrix );
  // The slope variance the pixel leaves unresolved: what its footprint spans, the ripples it filters, the faded chop.
  vec2 slope = N.xz / max( N.y, 0.1 );
  vec2 across = dFdx( slope );
  vec2 down = dFdy( slope );
  float footprint = min( 0.5 * ( dot( across, across ) + dot( down, down ) ), ${f(FOOTPRINT_VARIANCE_CAP)} );
  float chopFade = exp( -eyeDistance / ${CHOP_FADE_DISTANCE.toFixed(1)} );
  float chopLost = waterChop * waterChop * ${f(CHOP_MEAN_SQUARE_SLOPE)} * ( 1.0 - chopFade * chopFade );
  float sigma = sqrt( 0.5 * ( waterRippleVariance + footprint + chopLost ) );
  // Grazing: the facets in view lean toward the viewer, so the mirror sees higher sky (web-ocean, MIT).
  float sine = length( V.xz ) + 1e-5;
  float smith = max( V.y, 1e-3 ) / sine / ( 1.4142 * max( sigma, 1e-3 ) );
  float tilt = face > 0.0 ? ${f(GRAZING_TILT)} * sigma * ( 1.0 - smoothstep( 0.0, ${f(GRAZING_TILT_END)}, smith ) ) : 0.0;
  vec3 facet = normalize( N + vec3( V.x, 0.0, V.z ) * ( tilt / sine ) );
  float blur = face > 0.0 ? min( 1.0, sqrt( sqrt( pow4( roughness ) + 2.0 * ( footprint + chopLost ) ) ) ) : roughness;
  vec3 ray = mix( reflect( -V, facet ), facet, pow4( blur ) );
  // A ray reflected below the horizon would read the photo's dark lower half: fold it back up (web-ocean, MIT).
  if ( face > 0.0 ) ray.y = abs( ray.y ) * ${f(BELOW_HORIZON_FOLD)} + max( ray.y, 0.0 ) * ${f(1 - BELOW_HORIZON_FOLD)};
  // Fresnel from a normal blended toward up: the long waves' facet with the grazing statistics of the finer ones.
  vec3 fresnelNormal = mix( N, vec3( 0.0, 1.0, 0.0 ), ${f(FRESNEL_UP_BLEND)} );
  float grazing = pow( 1.0 - saturate( dot( fresnelNormal, V ) * inversesqrt( dot( fresnelNormal, fresnelNormal ) ) ), 5.0 );
  waterSkyDfg = vec2( 1.0 - grazing, grazing );
  return textureCubeUV( envMap, envMapRotation * normalize( ray ), blur ).rgb * envMapIntensity;
}
#endif
`;

const IBL_CALL = 'getIBLRadiance( geometryViewDir, geometryNormal, material.roughness )';

/**
 * The share of the sky the Rich water mirrors (on top of its Fresnel): the Rich look's own balance (`RICH_WATER`'s
 * reflection, tuned on views down into the water, where the body must show) giving way to the whole of it as the view
 * grazes, where a sea is its sky's mirror, and to the sky the player sees there (`gain`, `horizonGain`: the environment
 * lighting the scene is exposed apart from the background photo, up to 2.7 times brighter at the horizon at sunset).
 * `grazing` is the Fresnel's (1 − c)⁵ (`skyFresnelTerms`): half-way at about 7° above the water, 0.96 at 1°.
 */
export function skyMirrorShare(reflection: number, grazing: number, gain = 1): number {
  return reflection + (gain - reflection) * Math.min(1, Math.max(0, grazing));
}

/**
 * Rich <lights_fragment_maps>: three's own chunk with the sky read by `waterSkyRadiance` (on the water's upper side;
 * three's ray beneath it, where the water mirrors itself), its Fresnel for the environment's share, and the Rich
 * look's mirror balance (`waterReflection`, as `RICH_REFLECTION`) giving way at grazing (`skyMirrorShare`).
 */
export function richSkyReflection(): string {
  const chunk = ShaderChunk.lights_fragment_maps;
  if (chunk.split(IBL_CALL).length !== 2) throw new Error('The sky reflection needs three\'s one image-based radiance call');
  return `${chunk.replace(IBL_CALL, 'waterSkyRadiance( geometryNormal, material.roughness, faceDirection )')}
#if defined( RE_IndirectSpecular ) && defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
  if ( faceDirection > 0.0 ) {
    radiance *= mix( waterReflection, waterSkyGain, waterSkyDfg.y );
    material.dfg = waterSkyDfg;
  } else {
    radiance *= waterReflection;
  }
#elif defined( RE_IndirectSpecular )
  radiance *= waterReflection;
#endif`;
}

/** Rich: the pars after three's physical lighting pars. */
export const WATER_SKY_PARS = `#include <lights_physical_pars_fragment>\n${waterSkyPars}`;
