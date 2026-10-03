import { waterHeightPars } from '../WaterSurface';
import { CHURN_TILE } from './churnTexture';
import { ballPars, mistPars } from './mist';
import { waterTubeCarvePars } from './tubeCarve';

/**
 * The Rich spray's shaders (G8): mist (the wide sprites) drawn larger and
 * lit by forward scattering, so it glows toward the sun; drops lit plainly;
 * both fading out just under the water's surface, so no hard line shows
 * where a sprite meets it. The foam ball (G9) is a ball of churned
 * whitewater, lit as the foam it tumbles on is (`foamBallColour`): by the sky
 * all round and the sun on its lit side, glowing at its rim when backlit.
 */
export const richSprayVertex = /* glsl */ `
attribute vec2 look;
attribute float kind;
uniform float pixelsPerMetre;
${waterHeightPars}
${waterTubeCarvePars}
${mistPars}
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;

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
}
`;

export const richSprayFragment = /* glsl */ `
uniform vec3 sprayColor;
uniform vec3 spraySunDirection;
uniform vec3 spraySunRadiance;
uniform float spraySkyIrradiance;
uniform float sprayGroundIrradiance;
uniform sampler2D waterChurnMap;
${mistPars}
${ballPars}
const float CHURN_TILE = ${CHURN_TILE.toFixed(3)};
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;

void main() {
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  if ( r > 1.0 ) discard;
  if ( abs( vKind - 2.0 ) < 0.5 ) {
    // A foam ball: lumps of fresh churn over a sphere, lit as the foam under it is (the sky all round, the sun on its lit side).
    vec2 q = ( gl_PointCoord - 0.5 ) * 2.0;
    vec2 lump = ( gl_PointCoord * BALL_LUMPS + vSprayWorld.xz + vec2( vSprayWorld.y ) ) / CHURN_TILE;
    vec2 churn = texture( waterChurnMap, lump ).rg;
    // The clumps stand proud of the sphere: their slope tilts its normal, and their creases are shaded.
    float lumpStep = 0.04 * BALL_LUMPS / CHURN_TILE;
    vec2 lumpSlope = vec2( texture( waterChurnMap, lump + vec2( lumpStep, 0.0 ) ).g, texture( waterChurnMap, lump + vec2( 0.0, lumpStep ) ).g ) - churn.y;
    vec3 ballNormal = normalize( vec3( q.x, -q.y, sqrt( max( 0.0, 1.0 - r * r ) ) ) + BALL_RELIEF * vec3( -lumpSlope.x, lumpSlope.y, 0.0 ) / 0.04 );
    vec3 sunView = normalize( ( viewMatrix * vec4( spraySunDirection, 0.0 ) ).xyz );
    // The drops' phase function toward the eye (1 for an isotropic scatterer): backlit, the thin rim passes the sun on.
    float ballPhase = 12.566370614 * henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), DROP_G );
    float ballUp = dot( ballNormal, normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ) );
    vec3 ballLight = foamBallColour( dot( ballNormal, sunView ), ballUp, spraySkyIrradiance, sprayGroundIrradiance, spraySunRadiance ) * ( 1.0 + BALL_CREASE * ( churn.y - BALL_CREASE_MEAN ) );
    // The thin rim, backlit, shines with the whole of the sun's colour, over the body.
    float water = smoothstep( -0.3, 0.1, vAbove );
    float bodyAlpha = vOpacity * ( 1.0 - smoothstep( 0.55, 1.0, r ) ) * mix( 0.7, 1.0, churn.x ) * water;
    float glowAlpha = foamBallGlowCoverage( ballPhase, sqrt( max( 0.0, 1.0 - r * r ) ), churn.x ) * water;
    float ballAlpha = 1.0 - ( 1.0 - bodyAlpha ) * ( 1.0 - glowAlpha );
    vec3 glowLight = BALL_ALBEDO * spraySunRadiance / 3.14159265;
    gl_FragColor = vec4( ( ballLight * bodyAlpha * ( 1.0 - glowAlpha ) + glowLight * glowAlpha ) / max( ballAlpha, 1e-4 ), ballAlpha );
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
