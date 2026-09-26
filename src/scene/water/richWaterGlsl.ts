/**
 * The Rich water's shader chunks (G8), swapped in for the Classic ones by
 * `WaterSurface` and `FarFieldOcean` when the Water look is Rich.
 */
import { waterCubicPars } from './cubicSurface';
import { PATCH_SKIRT } from './richPatch';
import { RICH_SPECULAR } from './specular';

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
 * The Rich foam composition for `waterBodyFragment`: the lace, streaked up
 * steep faces along the current, over a glossy body that turns matte under foam.
 */
export const RICH_FOAM = /* glsl */ `  vec2 waterFootprint = fwidth( vWaterWorld.xz );
  float waterCover = mix( vWaterFoam, waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, max( waterFootprint.x, waterFootprint.y ) ), waterFoamPattern );
  waterCover = max( waterCover, waterFoamPattern * waterStreak( vWaterWorld.xz, vWaterFlow, length( waterSurfaceSlope ), vWaterFoam ) );
  diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor, waterCover );
  ${RICH_SPECULAR}
  roughnessFactor = mix( roughnessFactor, 0.7, waterCover );`;

/**
 * Rich <normal_fragment_begin>: the Catmull-Rom normal per pixel, the wind chop
 * (and, from Task 5, the ripples), flipped for the underside and written in view space.
 */
export function richNormalFragment(opts: { ripples: boolean }): string {
  return /* glsl */ `
#include <normal_fragment_begin>
{
  vec3 waterSurfaceSample = waterCubic( vWaterWorld.xz );
  waterSurfaceSlope = waterSurfaceSample.yz;
  vec2 waterSlope = waterSurfaceSample.yz;
  float chopFade = exp( -length( vWaterWorld - cameraPosition ) / 80.0 );
  waterSlope += waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime );
  ${opts.ripples ? 'waterSlope += waterRippleSlopeAt( vWaterWorld.xz, vWaterFlow );' : ''}
  vec3 waterWorldNormal = normalize( vec3( -waterSlope.x, 1.0, -waterSlope.y ) ) * faceDirection;
  normal = normalize( ( viewMatrix * vec4( waterWorldNormal, 0.0 ) ).xyz );
}
`;
}
