/**
 * The Rich water's shader chunks (G8), swapped in for the Classic ones by
 * `WaterSurface` and `FarFieldOcean` when the Water look is Rich.
 */
import { waterCubicPars } from './cubicSurface';
import { PATCH_SKIRT } from './richPatch';
import { RICH_SPECULAR } from './specular';
import { CLASSIC_FOAM } from '../waterOptics';

export { waterCubicPars };

/** File-scope values the normal chunk computes and the body chunk reads (Rich fragment only). */
export const richFragmentPars = /* glsl */ `
vec2 waterSurfaceSlope;
float waterRippleVariance = 0.0;
`;

/** Rich <beginnormal_vertex>: the Classic varyings, the height from the Catmull-Rom surface (the normal is per pixel). */
export const richBeginNormal = /* glsl */ `
vec2 waterXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;
vec3 waterCubicSample = waterCubic( waterXZ );
float waterHeight = waterCubicSample.x;
vec3 objectNormal = normalize( vec3( -waterCubicSample.y, 1.0, -waterCubicSample.z ) );
vWaterDepth = max( 0.0, waterHeight - waterBedAt( waterXZ ) );
vWaterFoam = waterFoamAt( waterXZ );
vWaterFlow = waterFlowAt( waterXZ );
`;

/** Rich <begin_vertex>: the vertex lifted to the Catmull-Rom height; the patch's skirt hangs below it. */
export const richVertexHeight = `vec3 transformed = vec3( position );
transformed.y = waterHeight - ${PATCH_SKIRT.toFixed(3)} * skirt;
vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
vPatch = onPatch;`;

/**
 * The Rich foam composition for `waterBodyFragment`: fresh whitewater as dense
 * churn, creased between its clumps, opening into the lace as it ages; the
 * lace streaked up steep faces along the current; a glossy body that turns
 * matte under foam; and thin fresh foam glowing when the sun is behind it.
 */
export const RICH_FOAM = /* glsl */ `  vec2 waterFootprint = fwidth( vWaterWorld.xz );
  float waterLace = mix( vWaterFoam, waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, max( waterFootprint.x, waterFootprint.y ) ), waterFoamPattern );
  vec2 waterChurn = waterChurnAt( vWaterWorld.xz, vWaterFlow );
  float waterFresh = waterFreshness( vWaterFoam ) * waterFoamPattern;
  float waterCover = mix( waterLace, max( waterLace, waterChurn.x ), waterFresh );
  waterCover = max( waterCover, waterFoamPattern * waterStreak( vWaterWorld.xz, vWaterFlow, length( waterSurfaceSlope ), vWaterFoam ) );
  float waterCrease = mix( 1.0, 0.88 + 0.12 * waterChurn.y, waterFresh );
  diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor * waterCrease, waterCover );
  ${RICH_SPECULAR}
  roughnessFactor = mix( roughnessFactor, 0.7, waterCover );
  totalEmissiveRadiance += 0.18 * waterFresh * ( 1.0 - waterChurn.x ) * pow( max( 0.0, dot( -waterV, waterSunDirection ) ), 6.0 ) * waterSunRadiance;`;

/**
 * The Rich look's own balance (G8, tuned on the water sheet against the
 * reference stills): how much of the sky its glossy surface mirrors, and the
 * gain on its body colour. Classic keeps `WATER_BODY_GAIN` and the full sky.
 */
export const RICH_WATER = { reflection: 0.5, bodyGain: 4 } as const;

export const richReflectionPars = /* glsl */ `
uniform float waterReflection;
`;

/** Rich: scales the sky the water mirrors (three's image-based specular), after <lights_fragment_maps>. */
export const RICH_REFLECTION = `#include <lights_fragment_maps>
#if defined( RE_IndirectSpecular )
  radiance *= waterReflection;
#endif`;

/** The far ocean's Rich foam: Classic's composition with the Rich gloss (it has no churn or streaks). */
export const RICH_FAR_FOAM = CLASSIC_FOAM.replace(
  'roughnessFactor = mix( roughnessFactor, 0.9, waterCover );',
  `${RICH_SPECULAR}\n  roughnessFactor = mix( roughnessFactor, 0.7, waterCover );`,
);

/** The far ocean's Rich <normal_fragment_begin>: its analytic normal and the chop, as Classic, plus the ripples on still water. */
export const richFarNormal = /* glsl */ `
#include <normal_fragment_begin>
{
  float chopFade = exp( -length( vWaterWorld - cameraPosition ) / 80.0 );
  vec2 chopSlope = waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime ) + waterRippleSlopeAt( vWaterWorld.xz, vec2( 0.0 ) );
  vec3 chopNormal = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  chopNormal = normalize( chopNormal + vec3( -chopSlope.x, 0.0, -chopSlope.y ) );
  normal = normalize( ( viewMatrix * vec4( chopNormal, 0.0 ) ).xyz );
}
`;

// Fresh whitewater's clumps stand proud of the surface.
const CHURN_RELIEF = `float waterFreshNormal = waterFreshness( vWaterFoam ) * waterFoamPattern;
  if ( waterFreshNormal > 0.0 ) waterSlope += waterFreshNormal * waterChurnSlope( vWaterWorld.xz, vWaterFlow );`;

/**
 * Rich <normal_fragment_begin>: the Catmull-Rom normal per pixel, the wind chop
 * (and, from Task 5, the ripples), flipped for the underside and written in view space.
 */
export function richNormalFragment(opts: { ripples: boolean; churn?: boolean }): string {
  return /* glsl */ `
#include <normal_fragment_begin>
{
  vec3 waterSurfaceSample = waterCubic( vWaterWorld.xz );
  waterSurfaceSlope = waterSurfaceSample.yz;
  vec2 waterSlope = waterSurfaceSample.yz;
  float chopFade = exp( -length( vWaterWorld - cameraPosition ) / 80.0 );
  waterSlope += waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime );
  ${opts.ripples ? 'waterSlope += waterRippleSlopeAt( vWaterWorld.xz, vWaterFlow );' : ''}
  ${opts.churn ? CHURN_RELIEF : ''}
  vec3 waterWorldNormal = normalize( vec3( -waterSlope.x, 1.0, -waterSlope.y ) ) * faceDirection;
  normal = normalize( ( viewMatrix * vec4( waterWorldNormal, 0.0 ) ).xyz );
}
`;
}
