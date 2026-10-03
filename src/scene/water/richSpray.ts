import { waterHeightPars } from '../WaterSurface';
import { CHURN_TILE } from './churnTexture';
import { ballPars, mistPars } from './mist';
import { waterTubeCarvePars } from './tubeCarve';

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
 * The Rich spray's shaders (G8): mist (the wide sprites) drawn larger and
 * lit by forward scattering, so it glows toward the sun; drops lit plainly;
 * both fading out just under the water's surface, so no hard line shows
 * where a sprite meets it. The foam ball (G9) is a clump of the churned
 * whitewater, opaque to near its rim, lit as the foam it tumbles on is
 * (`foamBallLight`): by the sky, the foam sheet under it and the sun on its
 * lit side, as far as the other balls leave it the sun, and by the foam
 * round it where they crowd its view (`ballShade`), with a gold rim where it
 * is thin and backlit.
 */
export const richSprayVertex = /* glsl */ `
attribute vec2 look;
attribute float kind;
uniform float pixelsPerMetre;
${waterHeightPars}
${waterTubeCarvePars}
${mistPars}
${spraySkyPars}
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;
varying vec3 vSky;
varying float vRadius;

void main() {
  vec4 view = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * view;
  vMist = abs( kind - 1.0 ) < 0.5 || abs( kind - 4.0 ) < 0.5 ? 1.0 : 0.0;
  vKind = kind;
  gl_PointSize = max( 1.0, look.x * mix( 1.0, 1.6, vMist ) * pixelsPerMetre / max( 0.1, -view.z ) );
  vOpacity = look.y;
  vRadius = 0.5 * look.x;
  vSky = spraySky();
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
const float CHURN_TILE = ${CHURN_TILE.toFixed(3)};
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;
varying vec3 vSky;
varying float vRadius;

void main() {
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  if ( r > 1.0 ) discard;
  if ( abs( vKind - 2.0 ) < 0.5 ) {
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
    vec3 ballLight = foamBallLight( dot( worldNormal, spraySunDirection ), worldNormal.y, shade.x, shade.y, 0.88 + 0.12 * churn.y, ballDepth, forward, vSky, spraySunRadiance, spraySunDirection.y, waterFoamColor );
    gl_FragColor = vec4( ballLight, vOpacity * ( 1.0 - exp( -ballDepth ) ) * shade.z * smoothstep( -0.3, 0.1, vAbove ) );
  } else {
    float phase = vMist > 0.5
      ? 12.566370614 * henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), MIST_G ) * 0.25
      : 1.0;
    vec3 light = 0.35 + spraySunRadiance * phase * 0.5;
    // Dim mist thins out rather than greying: its dimness goes into its opacity.
    float thin = vMist > 0.5 ? min( 1.0, max( light.r, max( light.g, light.b ) ) ) : 1.0;
    // Mist is a softer disc than a drop cluster.
    float disc = vMist > 0.5 ? ( 1.0 - r ) * ( 1.0 - r ) : 1.0 - r * r;
    gl_FragColor = vec4( sprayColor * light / thin, vOpacity * disc * thin * smoothstep( -0.1, 0.35, vAbove ) );
  }
  // Lit by a coloured sun the spray can pass 1: tone-map it like the rest of the scene rather than clip it.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
