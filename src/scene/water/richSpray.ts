import { waterHeightPars } from '../WaterSurface';
import { CHURN_TILE, churnTexture } from './churnTexture';
import { CAPSULE_MEANS, SPRAY_DRAW, ballPars, mistPars, sprayPars } from './mist';
import { waterTubeCarvePars } from './tubeCarve';

/** The churn's mean clump height, 0–1, over its tile: what the spray's grain is taken about. */
const CHURN_HEIGHT_MEAN = (() => {
  const data = churnTexture().image.data as Uint8Array;
  let sum = 0;
  for (let k = 1; k < data.length; k += 2) sum += data[k];
  return sum / (255 * (data.length / 2));
})();

/** `capsuleMean` in GLSL. */
const capsulePars = /* glsl */ `
const float CAPSULE_DISC = ${CAPSULE_MEANS.disc.toFixed(6)};
const float CAPSULE_LINE = ${CAPSULE_MEANS.line.toFixed(6)};
float capsuleMean( float halfLength ) {
  return ( CAPSULE_DISC * 3.14159265 + CAPSULE_LINE * 4.0 * halfLength ) / ( 3.14159265 + 4.0 * halfLength );
}
`;

/**
 * The sky's irradiance on a level surface, per channel: the photographed sky's own where the scene has one (its
 * environment map at roughness 1, as three lights the water's foam with it, `getIBLIrradiance`), else the sky the
 * sun leaves (`skyIrradiance`, its colour taken as neutral).
 */
export const spraySkyPars = /* glsl */ `
uniform float spraySkyIrradiance;
#ifdef ENVMAP_TYPE_CUBE_UV
uniform sampler2D sprayEnvironment;
uniform float sprayEnvironmentIntensity;
uniform mat3 sprayEnvironmentRotation;
#include <cube_uv_reflection_fragment>
#endif
vec3 spraySky() {
#ifdef ENVMAP_TYPE_CUBE_UV
  return 3.14159265 * textureCubeUV( sprayEnvironment, sprayEnvironmentRotation * vec3( 0.0, 1.0, 0.0 ), 1.0 ).rgb * sprayEnvironmentIntensity;
#else
  return vec3( spraySkyIrradiance );
#endif
}
`;

/**
 * The Rich spray's shaders (G8). Spray and mist are drawn by their optical depth (decided 2026-09-29, item 1;
 * `sprayLight`): each cluster a capsule along the way it travels in the frame, its drops spread across it as a
 * diffusing cloud's are (`SPRAY_DRAW`), stopping 1 − e^−τ of what is behind it and adding the light its drops scatter:
 * the sun in their forward lobe where the spray round it is thin, a white where it is thick, never under the decided
 * readability minimum; while its water is still sheets, clear water that reflects as the water does. It fades as it
 * fills the view or nears the eye, and out just under the water's surface, so no hard line shows where a sprite meets
 * it. The foam ball (G9) is a clump of the churned whitewater, opaque to near its rim, lit as the foam it tumbles on is
 * (`foamBallLight`): by the sky, the foam sheet under it and the sun on its lit side, as far as the other balls leave
 * it the sun, and by the foam round it where they crowd its view (`ballShade`), with a gold rim where it is thin and
 * backlit. Everything is drawn as premultiplied light, farthest first.
 */
export const richSprayVertex = /* glsl */ `
attribute vec2 look;
attribute float kind;
attribute vec3 streak;
attribute float tau;
attribute float column;
attribute float glass;
uniform float pixelsPerMetre;
uniform float screenHeight;
uniform float maxPointSize;
${waterHeightPars}
${waterTubeCarvePars}
${mistPars}
${spraySkyPars}
const float SPRAY_FADE_FROM = ${SPRAY_DRAW.fadeFrom.toFixed(3)};
const float SPRAY_FADE_TO = ${SPRAY_DRAW.fadeTo.toFixed(3)};
const float SPRAY_CAP_FROM = ${SPRAY_DRAW.capFrom.toFixed(3)};
const float SPRAY_NEAR_FROM = ${SPRAY_DRAW.nearFrom.toFixed(3)};
const float SPRAY_NEAR_TO = ${SPRAY_DRAW.nearTo.toFixed(3)};
${capsulePars}
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;
varying vec3 vSky;
varying float vRadius;
varying vec3 vTrail;
varying float vTau;
varying float vColumn;
varying float vGlass;
varying float vFade;

void main() {
  vec4 view = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * view;
  vMist = abs( kind - 1.0 ) < 0.5 || abs( kind - 4.0 ) < 0.5 ? 1.0 : 0.0;
  vKind = kind;
  vOpacity = look.y;
  vRadius = 0.5 * look.x;
  vSky = spraySky();
  float depth = max( 0.1, -view.z );
  if ( abs( kind - 2.0 ) < 0.5 ) {
    // A foam ball is a round sprite as wide as it is.
    gl_PointSize = max( 1.0, look.x * pixelsPerMetre / depth );
    vTrail = vec3( 1.0, 0.0, 0.0 );
    vTau = 0.0;
    vColumn = 0.0;
    vGlass = 0.0;
    vFade = 1.0;
  } else {
    // A cluster is a capsule as long as it travels while the eye takes it in and as wide as it is, in the sprite's plane.
    vec2 trail = ( modelViewMatrix * vec4( streak, 0.0 ) ).xy;
    float trailLength = length( trail );
    float halfLength = 0.5 * trailLength;
    float extent = vRadius + halfLength;
    float pixels = 2.0 * extent * pixelsPerMetre / depth;
    gl_PointSize = clamp( pixels, 1.0, maxPointSize );
    vTrail = vec3( trailLength > 1e-6 ? trail / trailLength : vec2( 1.0, 0.0 ), halfLength / extent );
    // Its drops spread over the capsule drawn (the depth it has over its round cluster), most on its axis.
    vTau = tau * ( 3.14159265 * vRadius * vRadius ) / ( 3.14159265 * vRadius * vRadius + 4.0 * vRadius * halfLength ) / capsuleMean( halfLength / vRadius );
    vColumn = column;
    vGlass = glass;
    // Faded as it fills the view (and before the largest point drawn), and as it nears the eye.
    vFade = ( 1.0 - smoothstep( SPRAY_FADE_FROM, SPRAY_FADE_TO, pixels / screenHeight ) ) * ( 1.0 - smoothstep( SPRAY_CAP_FROM * maxPointSize, maxPointSize, pixels ) ) * smoothstep( SPRAY_NEAR_FROM, SPRAY_NEAR_TO, depth );
    // Faded away, it is not drawn at all: put it behind the far plane.
    if ( vFade <= 0.0 ) gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
  }
  vec3 world = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
  vSprayWorld = world;
  vAbove = world.y - waterCarve( world.xz, waterHeightAt( world.xz ) );
}
`;

export const richSprayFragment = /* glsl */ `
uniform vec3 sprayColor;
uniform vec3 spraySunDirection;
uniform vec3 spraySunRadiance;
uniform vec3 waterFoamColor;
uniform sampler2D waterChurnMap;
${mistPars}
${ballPars}
${sprayPars}
const float CHURN_TILE = ${CHURN_TILE.toFixed(3)};
const float CHURN_HEIGHT_MEAN = ${CHURN_HEIGHT_MEAN.toFixed(4)};
const float SPRAY_CLUMPS = ${SPRAY_DRAW.clumps.toFixed(3)};
const float SPRAY_WISP = ${SPRAY_DRAW.wisp.toFixed(3)};
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;
varying vec3 vSky;
varying float vRadius;
varying vec3 vTrail;
varying float vTau;
varying float vColumn;
varying float vGlass;
varying float vFade;

void main() {
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  // The light it adds, and the shares of what is behind it it adds that light over and hides (premultiplied light).
  float emission;
  float hidden;
  if ( abs( vKind - 2.0 ) < 0.5 ) {
    if ( r > 1.0 ) discard;
    // A foam ball: a clump of the fresh churn over a sphere, lit as the foam it tumbles on is (foamBallLight).
    vec2 q = ( gl_PointCoord - 0.5 ) * 2.0;
    vec2 lump = ( gl_PointCoord * BALL_LUMPS + vSprayWorld.xz + vec2( vSprayWorld.y ) ) / CHURN_TILE;
    vec2 churn = texture( waterChurnMap, lump ).rg;
    // The clumps stand proud of the sphere: their slope tilts its normal.
    float lumpStep = 0.04 * BALL_LUMPS / CHURN_TILE;
    vec2 lumpSlope = vec2( texture( waterChurnMap, lump + vec2( lumpStep, 0.0 ) ).g, texture( waterChurnMap, lump + vec2( 0.0, lumpStep ) ).g ) - churn.y;
    vec3 sphereNormal = vec3( q.x, -q.y, sqrt( max( 0.0, 1.0 - r * r ) ) );
    vec3 ballNormal = normalize( sphereNormal + BALL_RELIEF * vec3( -lumpSlope.x, lumpSlope.y, 0.0 ) / 0.04 );
    vec3 worldNormal = normalize( ( vec4( ballNormal, 0.0 ) * viewMatrix ).xyz );
    // The sun this point of the ball gets past the other balls, and how much of its view they fill.
    vec3 sphereWorld = normalize( ( vec4( sphereNormal, 0.0 ) * viewMatrix ).xyz );
    vec3 shade = ballShade( vSprayWorld + vRadius * sphereWorld, sphereWorld, spraySunDirection, vSprayWorld );
    // Its outline follows the clumps, drawing in across a crease; it is thick to near that outline.
    r /= 1.0 - BALL_FRAY * ( 1.0 - churn.x );
    float ballDepth = foamBallDepth( r );
    // The drops' phase function toward the eye: backlit, the thin rim passes the sun on.
    float forward = henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), DROP_G );
    gl_FragColor = vec4( foamBallLight( dot( worldNormal, spraySunDirection ), worldNormal.y, shade.x, shade.y, 0.88 + 0.12 * churn.y, ballDepth, forward, vSky, spraySunRadiance, spraySunDirection.y, waterFoamColor ), 1.0 );
    emission = vOpacity * ( 1.0 - exp( -ballDepth ) ) * shade.z * smoothstep( -0.3, 0.1, vAbove );
    hidden = emission;
  } else {
    // A cluster of drops: a capsule along its streak, its drops spread across it most at its middle (clusterProfile).
    vec2 p = vec2( gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y ) * 2.0;
    vec2 across = vec2( -vTrail.y, vTrail.x );
    float along = dot( p, vTrail.xy );
    vec2 off = vec2( sign( along ) * max( abs( along ) - vTrail.z, 0.0 ), dot( p, across ) ) / max( 1.0 - vTrail.z, 1e-3 );
    float edge2 = dot( off, off );
    if ( edge2 > 1.0 ) discard;
    float profile = max( 0.0, ( exp( -2.0 * edge2 ) - 0.135335283 ) / 0.864664717 );
    // Its drops gather in clumps drawn out along its streak: the churn's, about its mean (SPRAY_DRAW).
    float radii = max( 1.0 - vTrail.z, 1e-3 );
    vec2 grainAt = vec2( along / ( radii + vTrail.z ), dot( p, across ) / radii ) * SPRAY_CLUMPS / 16.0 + fract( vSprayWorld.xz * 0.37 + vSprayWorld.y * 0.71 );
    float grain = max( 0.0, 1.0 + SPRAY_WISP * ( texture( waterChurnMap, grainAt ).g / CHURN_HEIGHT_MEAN - 1.0 ) );
    // Where the spray is thick it is a rounded cloud: the normal of the sphere under the capsule's edge.
    vec3 viewNormal = vec3( off.x * vTrail.xy + off.y * across, sqrt( max( 0.0, 1.0 - edge2 ) ) );
    vec3 worldNormal = normalize( ( vec4( viewNormal, 0.0 ) * viewMatrix ).xyz );
    // The drops' phase function toward the eye: backlit, spray glows.
    float phase = henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), MIST_G );
    vec3 light = sprayLight( vColumn, phase, dot( worldNormal, spraySunDirection ), worldNormal.y, vSky, spraySunRadiance, spraySunDirection.y, waterFoamColor );
    float stopped = 1.0 - exp( -vTau * profile * grain );
    float white = 1.0 - exp( -( 1.0 - MIST_G ) * vColumn );
    // The water still in sheets: clear, its surfaces turned every way, so it reflects the light round it and the sun
    // as water does on average (a ball of water reflects the sun evenly all round).
    float sheet = min( 1.0, vGlass * profile );
    vec3 ground = waterFoamColor * ( vSky + spraySunRadiance * max( 0.0, spraySunDirection.y ) );
    vec3 glassLight = SPRAY_GLASS * ( ( vSky + ground ) / 6.283185307 + spraySunRadiance / 12.566370614 );
    float fade = vFade * smoothstep( -0.1, 0.35, vAbove );
    // The sheets show where the drops do not already cover.
    float clear = sheet * ( 1.0 - stopped );
    float weight = stopped + clear;
    if ( weight < 1e-5 ) discard;
    gl_FragColor = vec4( ( light * stopped + glassLight * clear ) / weight, 1.0 );
    emission = weight * fade;
    hidden = ( stopped * mix( SPRAY_LEAK, 1.0, white ) + clear * SPRAY_GLASS ) * fade;
  }
  // Lit by a coloured sun the spray can pass 1: tone-map it like the rest of the scene rather than clip it.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor = vec4( gl_FragColor.rgb * emission, hidden );
}
`;
