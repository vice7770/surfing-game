/**
 * The Rich water's shader chunks (G8), swapped in for the Classic ones by
 * `WaterSurface` and `FarFieldOcean` when the Water look is Rich.
 */
import { waterCubicPars } from './cubicSurface';
import { PATCH_SKIRT } from './richPatch';
import { RICH_SPECULAR } from './specular';
import { RICH_GLITTER_RIPPLES, RICH_SUN_GLITTER } from './glitter';
import { CLASSIC_FOAM } from '../waterOptics';
import { RICH_CHOP_STATS } from '../waterChop';

export { waterCubicPars };

/**
 * The bubble plume's whiteness per unit void fraction per metre (G9, a render
 * constant): a fully aerated metre of plume (α ≈ 0.2) reads near white.
 */
export const PLUME_DENSITY = 15;

/**
 * CPU twin of the plume's whiteness in `RICH_FOAM`: how far down the air reaches (the plume's depth, at most the
 * water's), m, and how white it turns the body, from the void fraction. Every input is ≥ 0 over a triangle, so the
 * clamps change nothing there; they hold where 4× MSAA shades a sliver triangle at a pixel centre outside it (three
 * interpolates at the centre): there the varyings run far out of range (depth −26 m, void fraction −0.66 was seen),
 * `exp` of the negative path reached 1e20, and three's multiscattering overflowed that body colour into a NaN pixel.
 */
export function plumeReach(plumeDepth: number, depth: number): number {
  return Math.max(0, Math.min(plumeDepth, depth));
}

export function plumeWhiteness(air: number, reach: number): number {
  return 1 - Math.exp(Math.min(0, -PLUME_DENSITY * air * reach));
}

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
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  g = clamp( vec2( waterFoldX( g.x ), g.y ), vec2( 0.0 ), waterGridSize - 1.0 );
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

/** The diagnostic vertex-normal path carries the cubic slope already computed for displacement. */
export const richVertexSlopePars = 'varying vec2 vWaterSurfaceSlope;';
export const richBeginVertexNormal = richBeginNormal.replace(
  'float waterHeight = waterCubicSample.x;',
  'float waterHeight = waterCubicSample.x;\nvWaterSurfaceSlope = waterCubicSample.yz;',
);

/** Rich <begin_vertex>: the vertex lifted to the Catmull-Rom height; the patch's skirt hangs below it. */
export const richVertexHeight = `vec3 transformed = vec3( position );
transformed.y = waterHeight - ${PATCH_SKIRT.toFixed(3)} * skirt;
vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
vPatch = onPatch;
vWaterSkirt = skirt;`;

/**
 * The Rich foam composition for `waterBodyFragment`: fresh whitewater as dense
 * churn, creased between its clumps, opening into the lace as it ages; the
 * lace streaked up steep faces along the current; a glossy body that turns
 * matte under foam; and thin fresh foam glowing when the sun is behind it.
 * Under it all, the bubble plume (G9) whitens the body as far down as the air
 * went: from above seen through the water over its middle, from below plainly.
 */
export const RICH_FOAM = /* glsl */ `  vec2 waterFootprint = fwidth( vWaterWorld.xz );
  float waterLace = mix( vWaterFoam, waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, max( waterFootprint.x, waterFootprint.y ) ), waterFoamPattern );
  vec2 waterChurn = waterChurnAt( vWaterWorld.xz, vWaterFlow );
  float waterFresh = waterFreshness( vWaterAir ) * waterFoamPattern;
  float waterCover = mix( waterLace, max( waterLace, waterChurn.x ), waterFresh );
  waterCover = max( waterCover, waterFoamPattern * waterStreak( vWaterWorld.xz, vWaterFlow, length( waterSurfaceSlope ), vWaterFoam ) );
  float waterCrease = mix( 1.0, 0.88 + 0.12 * waterChurn.y, waterFresh );
  // Held in range off a sliver triangle's edge, where MSAA shades it (plumeReach, plumeWhiteness).
  float waterPlumeReach = max( 0.0, min( vWaterPlumeDepth, vWaterDepth ) );
  float waterPlume = 1.0 - exp( min( 0.0, -PLUME_DENSITY * vWaterAir * waterPlumeReach ) );
  float waterPlumePath = faceDirection > 0.0 ? 0.5 * waterPlumeReach / waterRefractedCosine( abs( waterViewCos ) ) : 0.0;
  vec3 waterUnder = mix( waterBody * waterBodyGain, waterFoamColor * exp( -waterAttenuation * waterPlumePath ), waterPlume );
  diffuseColor.rgb = mix( waterUnder, waterFoamColor * waterCrease, waterCover );
  ${RICH_SPECULAR}
  roughnessFactor = mix( roughnessFactor, 0.7, waterCover );${RICH_SUN_GLITTER}
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
  `${RICH_SPECULAR}\n  roughnessFactor = mix( roughnessFactor, 0.7, waterCover );${RICH_SUN_GLITTER}`,
);

/**
 * The far ocean's Rich <normal_fragment_begin>: its analytic normal and the chop, as Classic, plus the ripples on
 * still water; and the ripples' variance for the sun's glitter (item 5).
 */
export const richFarNormal = /* glsl */ `
#include <normal_fragment_begin>
{
  float chopFade = exp( -length( vWaterWorld - cameraPosition ) / 80.0 );
  ${RICH_CHOP_STATS}
  vec2 chopSlope = waterChop * chopFade * waterChopMean + waterRippleSlopeAt( vWaterWorld.xz, vec2( 0.0 ) );
  vec3 chopNormal = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  chopNormal = normalize( chopNormal + vec3( -chopSlope.x, 0.0, -chopSlope.y ) );
  normal = normalize( ( viewMatrix * vec4( chopNormal, 0.0 ) ).xyz );
  ${RICH_GLITTER_RIPPLES}
}
`;

// Fresh whitewater's clumps stand proud of the surface.
const CHURN_RELIEF = `float waterFreshNormal = waterFreshness( vWaterAir ) * waterFoamPattern;
  if ( waterFreshNormal > 0.0 ) waterSlope += waterFreshNormal * waterChurnSlope( vWaterWorld.xz, vWaterFlow );`;

/**
 * Rich <normal_fragment_begin>: the Catmull-Rom normal per pixel, the wind chop
 * (and, from Task 5, the ripples), flipped for the underside and written in view space;
 * then the ripples' variance for the sun's glitter (web-ocean plan, item 5).
 */
export function richNormalFragment(opts: { ripples: boolean; churn?: boolean; vertexNormals?: boolean }): string {
  const surface = opts.vertexNormals
    ? `waterSurfaceSlope = vWaterSurfaceSlope;
  vec2 waterSlope = vWaterSurfaceSlope;`
    : `vec3 waterSurfaceSample = waterCarvedCubic( vWaterWorld.xz );
  waterSurfaceSlope = waterSurfaceSample.yz;
  vec2 waterSlope = waterSurfaceSample.yz;`;
  return /* glsl */ `
#include <normal_fragment_begin>
{
  ${surface}
  float chopFade = exp( -length( vWaterWorld - cameraPosition ) / 80.0 );
  ${RICH_CHOP_STATS}
  waterSlope += waterChop * chopFade * waterChopMean;
  ${opts.ripples ? 'waterSlope += waterRippleSlopeAt( vWaterWorld.xz, vWaterFlow );' : ''}
  ${opts.churn ? CHURN_RELIEF : ''}
  vec3 waterWorldNormal = normalize( vec3( -waterSlope.x, 1.0, -waterSlope.y ) ) * faceDirection;
  normal = normalize( ( viewMatrix * vec4( waterWorldNormal, 0.0 ) ).xyz );
  ${RICH_GLITTER_RIPPLES}
}
`;
}
