/**
 * The Rich water's shader chunks (G8), swapped in for the Classic ones by
 * `WaterSurface` and `FarFieldOcean` when the Water look is Rich.
 */
import { waterCubicPars } from './cubicSurface';
import { PATCH_SKIRT } from './richPatch';
import { RICH_SPECULAR } from './specular';
import { FOAM_ALBEDO, FOAM_DENSE } from '../foamPattern';

export { waterCubicPars };

/**
 * The bubble plume's whiteness per unit void fraction per metre (G9, a render
 * constant): a fully aerated metre of plume (α ≈ 0.2) reads near white.
 */
export const PLUME_DENSITY = 15;

/** File-scope values the normal chunk computes and the body chunk reads (Rich fragment only). */
export const richFragmentPars = /* glsl */ `
vec2 waterSurfaceSlope;
float waterRippleVariance = 0.0;
`;

/** The air in the water, for the tank's Rich fragment (G9): the vertex shader writes these (`richAerationVertexPars`). */
export const richAerationFragmentPars = /* glsl */ `
varying float vWaterAir;
varying float vWaterPlumeDepth;
const float PLUME_DENSITY = ${PLUME_DENSITY.toFixed(3)};
`;

/**
 * Rich vertex pars (G9): the air breaking drove into the water, per render node
 * (void fraction, plume depth), bilinear as the flow is. Needs the height pars.
 */
export const richAerationVertexPars = /* glsl */ `
uniform sampler2D waterAeration;
varying float vWaterAir;
varying float vWaterPlumeDepth;
vec2 waterAerationAt( vec2 xz ) {
  vec2 g = clamp( ( xz - waterGrid.xy ) / waterGrid.z, vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  vec2 top = mix( texelFetch( waterAeration, c, 0 ).rg, texelFetch( waterAeration, c + ivec2( 1, 0 ), 0 ).rg, t.x );
  vec2 bottom = mix( texelFetch( waterAeration, c + ivec2( 0, 1 ), 0 ).rg, texelFetch( waterAeration, c + ivec2( 1, 1 ), 0 ).rg, t.x );
  return mix( top, bottom, t.y );
}
`;

/** Rich <beginnormal_vertex>: the Classic varyings, the height from the Catmull-Rom surface (the normal is per pixel). */
export const richBeginNormal = /* glsl */ `
vec2 waterXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;
vec3 waterCubicSample = waterCarvedCubic( waterXZ );
float waterHeight = waterCubicSample.x;
vec3 objectNormal = normalize( vec3( -waterCubicSample.y, 1.0, -waterCubicSample.z ) );
vWaterDepth = max( 0.0, waterHeight - waterBedAt( waterXZ ) );
vWaterFoam = waterFoamAt( waterXZ );
vWaterAir = waterAerationAt( waterXZ ).x;
vWaterPlumeDepth = waterAerationAt( waterXZ ).y;
vWaterFlow = waterFlowAt( waterXZ );
`;

/** Rich <begin_vertex>: the vertex lifted to the Catmull-Rom height; the patch's skirt hangs below it. */
export const richVertexHeight = `vec3 transformed = vec3( position );
transformed.y = waterHeight - ${PATCH_SKIRT.toFixed(3)} * skirt;
vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
vPatch = onPatch;
vWaterSkirt = skirt;`;

/**
 * GLSL: the foam as a layer that adds light to the water under it (`foamOverWater`, with `FOAM_ALBEDO`), and Rich's
 * gain on the whole, not on the water alone. `under` is the water's reflectance before the gain, `reflectance` the
 * layer's; it needs `waterBodyGain`. The foam is white, whatever the light: it takes the colour of the sky and sun
 * that fall on it, where it used to be tinted mint.
 */
const foamLayer = (under: string, reflectance: string) => `float waterFoamT = 1.0 - ${reflectance};
  diffuseColor.rgb = waterBodyGain * ( vec3( ${reflectance} ) + waterFoamT * waterFoamT * ${under} / ( 1.0 - ${reflectance} * ${under} ) );`;

/** GLSL: the reflectance of foam by its age proxy `age` (`foamAge`): fresh whitewater to lace. */
const foamAlbedoAt = (age: string) => `mix( ${FOAM_ALBEDO.fresh.toFixed(3)}, ${FOAM_ALBEDO.lace.toFixed(3)}, ${age} )`;

/** GLSL: how dense the foam still is, `smoothstep( FOAM_DENSE, foam )` of `foamAge`. */
const foamDense = (foam: string) => `smoothstep( ${FOAM_DENSE[0].toFixed(2)}, ${FOAM_DENSE[1].toFixed(2)}, ${foam} )`;

/**
 * The Rich foam composition for `waterBodyFragment`: fresh whitewater as dense
 * churn, creased between its clumps, opening into the lace as it ages (the
 * baked life cycle of `foamBake`: dense with holes, then lace and threads, by
 * an age proxy from the void fraction and the foam value [provisional]); the
 * lace streaked up steep faces along the current; a glossy body that turns
 * matte under foam; and thin fresh foam glowing when the sun is behind it.
 * Under it all, the bubble plume (G9) whitens the body as far down as the air
 * went: from above seen through the water over its middle, from below plainly.
 * The foam is a layer that adds light to that water (`foamLayer`): bright
 * white where it is fresh (0.55), dimmer as lace (0.25), a veil as streaks (0.10),
 * and a single layer of bubbles (also 0.10) at the edge of a patch, thickening to
 * its stage's reflectance within `FOAM_THICK` sigma of the field.
 */
export const RICH_FOAM = /* glsl */ `  vec2 waterFootprint = fwidth( vWaterWorld.xz );
  float waterFresh = waterFreshness( vWaterAir ) * waterFoamPattern;
  float waterAge = 1.0 - max( waterFresh, ${foamDense('vWaterFoam')} );
  vec2 waterField = waterFoamField( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterAge, max( waterFootprint.x, waterFootprint.y ) );
  float waterLace = mix( vWaterFoam, waterField.x, waterFoamPattern );
  vec2 waterChurn = waterChurnAt( vWaterWorld.xz, vWaterFlow );
  float waterCover = mix( waterLace, max( waterLace, waterChurn.x ), waterFresh );
  float waterThick = mix( 1.0, mix( waterField.y, 1.0, waterFresh ), waterFoamPattern );
  float waterStreakCover = waterFoamPattern * waterStreak( vWaterWorld.xz, vWaterFlow, length( waterSurfaceSlope ), vWaterFoam );
  float waterCrease = mix( 1.0, 0.88 + 0.12 * waterChurn.y, waterFresh );
  float waterPlume = 1.0 - exp( -PLUME_DENSITY * vWaterAir * min( vWaterPlumeDepth, vWaterDepth ) );
  float waterPlumePath = faceDirection > 0.0 ? 0.5 * min( vWaterPlumeDepth, vWaterDepth ) / waterRefractedCosine( abs( waterViewCos ) ) : 0.0;
  vec3 waterUnder = mix( waterBody, waterFoamColor * exp( -waterAttenuation * waterPlumePath ) / waterBodyGain, waterPlume );
  float waterFoamR = max( waterCover * waterCrease * mix( ${FOAM_ALBEDO.streak.toFixed(3)}, ${foamAlbedoAt('waterAge')}, waterThick ), waterStreakCover * ${FOAM_ALBEDO.streak.toFixed(3)} );
  ${foamLayer('waterUnder', 'waterFoamR')}
  waterCover = max( waterCover, waterStreakCover );
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

/**
 * The far ocean's Rich foam (and the swept barrel's): Classic's lace network, composed as the water's foam is, a layer
 * that adds light (`foamLayer`), with the Rich gloss. It has no churn, streaks or aeration, so its age is its foam's.
 */
export const RICH_FAR_FOAM = /* glsl */ `  vec2 waterFootprint = fwidth( vWaterWorld.xz );
  float waterCover = mix( vWaterFoam, waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, max( waterFootprint.x, waterFootprint.y ) ), waterFoamPattern );
  float waterFoamR = waterCover * ${foamAlbedoAt(`( 1.0 - ${foamDense('vWaterFoam')} )`)};
  ${foamLayer('waterBody', 'waterFoamR')}
  ${RICH_SPECULAR}
  roughnessFactor = mix( roughnessFactor, 0.7, waterCover );`;

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
const CHURN_RELIEF = `float waterFreshNormal = waterFreshness( vWaterAir ) * waterFoamPattern;
  if ( waterFreshNormal > 0.0 ) waterSlope += waterFreshNormal * waterChurnSlope( vWaterWorld.xz, vWaterFlow );`;

/**
 * Rich <normal_fragment_begin>: the Catmull-Rom normal per pixel, the wind chop
 * (and, from Task 5, the ripples), flipped for the underside and written in view space.
 */
export function richNormalFragment(opts: { ripples: boolean; churn?: boolean }): string {
  return /* glsl */ `
#include <normal_fragment_begin>
{
  vec3 waterSurfaceSample = waterCarvedCubic( vWaterWorld.xz );
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
