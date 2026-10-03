import { waterHeightPars } from '../WaterSurface';
import { CHURN_TILE } from './churnTexture';
import { mistPars } from './mist';
import { waterTubeCarvePars } from './tubeCarve';

/**
 * The Rich spray's shaders (G8): mist (the wide sprites) drawn larger and
 * lit by forward scattering, so it glows toward the sun; drops lit plainly;
 * both fading out just under the water's surface, so no hard line shows
 * where a sprite meets it. The foam ball (G9) is a ball of churned
 * whitewater, opaque to near its rim, lit by the sun and the sky.
 */
export const richSprayVertex = /* glsl */ `
attribute vec2 look;
attribute float kind;
uniform float pixelsPerMetre;
uniform vec3 spraySunDirection;
uniform vec3 spraySunRadiance;
${waterHeightPars}
${waterTubeCarvePars}
${mistPars}
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;
varying vec3 vSprayLight;
varying float vThin;
varying vec3 vSunView;

void main() {
  vec4 view = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * view;
  vMist = abs( kind - 1.0 ) < 0.5 || abs( kind - 4.0 ) < 0.5 ? 1.0 : 0.0;
  vKind = kind;
  gl_PointSize = max( 1.0, look.x * mix( 1.0, 1.6, vMist ) * pixelsPerMetre / max( 0.1, -view.z ) );
  vOpacity = look.y;
  vec3 world = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
  vSprayWorld = world;
  vAbove = world.y - waterCarve( world.xz, waterHeightAt( world.xz ) );
  // One vertex is one sprite: its view direction and lighting are constant across all its fragments.
  float phase = vMist > 0.5
    ? 12.566370614 * henyeyGreenstein( dot( normalize( world - cameraPosition ), spraySunDirection ), MIST_G ) * 0.25
    : 1.0;
  vSprayLight = 0.35 + spraySunRadiance * phase * 0.5;
  vThin = vMist > 0.5 ? min( 1.0, max( vSprayLight.r, max( vSprayLight.g, vSprayLight.b ) ) ) : 1.0;
  vSunView = normalize( ( viewMatrix * vec4( spraySunDirection, 0.0 ) ).xyz );
}
`;

export const richSprayFragment = /* glsl */ `
uniform vec3 sprayColor;
uniform vec3 spraySunRadiance;
uniform sampler2D waterChurnMap;
const float CHURN_TILE = ${CHURN_TILE.toFixed(3)};
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;
varying vec3 vSprayLight;
varying float vThin;
varying vec3 vSunView;

void main() {
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  if ( r > 1.0 ) discard;
  if ( abs( vKind - 2.0 ) < 0.5 ) {
    // A foam ball: churn over a sphere, lit by the sky all round and the sun on its lit side.
    vec2 q = ( gl_PointCoord - 0.5 ) * 2.0;
    vec3 ballNormal = normalize( vec3( q.x, -q.y, sqrt( max( 0.0, 1.0 - r * r ) ) ) );
    vec2 churn = texture( waterChurnMap, ( gl_PointCoord * 0.6 + vSprayWorld.xz + vec2( vSprayWorld.y ) ) / CHURN_TILE ).rg;
    vec3 ballLight = 0.45 + spraySunRadiance * 0.6 * max( 0.0, dot( ballNormal, vSunView ) );
    gl_FragColor = vec4( sprayColor * ballLight * ( 0.8 + 0.2 * churn.y ), vOpacity * ( 1.0 - smoothstep( 0.55, 1.0, r ) ) * mix( 0.55, 1.0, churn.x ) * smoothstep( -0.3, 0.1, vAbove ) );
  } else {
    // Dim mist thins out rather than greying: its dimness goes into its opacity.
    // Mist is a softer disc than a drop cluster.
    float disc = vMist > 0.5 ? ( 1.0 - r ) * ( 1.0 - r ) : 1.0 - r * r;
    gl_FragColor = vec4( sprayColor * vSprayLight / vThin, vOpacity * disc * vThin * smoothstep( -0.1, 0.35, vAbove ) );
  }
  // Lit by a coloured sun the spray can pass 1: tone-map it like the rest of the scene rather than clip it.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
