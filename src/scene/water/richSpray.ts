import { waterHeightPars } from '../WaterSurface';
import { CHURN_TILE } from './churnTexture';
import { ballPars, mistPars, sprayDrawPars, sprayPars } from './mist';
import { waterTubeCarvePars } from './tubeCarve';

/**
 * The Rich spray's shaders (G8): spray and mist drawn by their optical depth
 * (decided 2026-09-29, item 1; `sprayColour`). Each cluster is a capsule
 * streaked along its travel, soft to its edge and grained with the churn's
 * clumps; its opacity is 1 − e^−τ and its colour the sun in the drops' forward
 * lobe when it is thin and a white when it is thick; it fades as it fills the
 * view or nears the eye, and out just under the water's surface, so no hard
 * line shows where a sprite meets it. The foam ball (G9) is a ball of churned
 * whitewater, lit as the foam it tumbles on is (`foamBallColour`): by the sky
 * all round and the sun on its lit side, glowing at its rim when backlit.
 */
export const richSprayVertex = /* glsl */ `
attribute vec2 look;
attribute float kind;
attribute vec3 velocity;
attribute float tau;
uniform float pixelsPerMetre;
${waterHeightPars}
${waterTubeCarvePars}
${mistPars}
${sprayDrawPars}
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;
varying float vTau;
varying vec3 vTrail;
varying float vHalf;
varying float vFade;

void main() {
  vec4 view = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * view;
  vMist = abs( kind - 1.0 ) < 0.5 || abs( kind - 4.0 ) < 0.5 ? 1.0 : 0.0;
  vKind = kind;
  vOpacity = look.y;
  float depth = max( 0.1, -view.z );
  if ( abs( kind - 2.0 ) < 0.5 ) {
    // A foam ball is a round sprite as wide as it is.
    gl_PointSize = max( 1.0, look.x * pixelsPerMetre / depth );
    vTau = 0.0;
    vTrail = vec3( 1.0, 0.0, 0.0 );
    vHalf = 0.5 * look.x;
    vFade = 1.0;
  } else {
    // A cluster is a capsule: as long as it travels in a frame or two, as wide as its drops spread, in the sprite's plane.
    vec2 trail = ( modelViewMatrix * vec4( velocity, 0.0 ) ).xy * mix( STREAK_DROP, STREAK_MIST, vMist );
    float trailLength = length( trail );
    float halfLength = 0.5 * trailLength;
    float width = look.x * mix( WIDTH_DROP, WIDTH_MIST, vMist );
    float radius = 0.5 * width;
    float extent = radius + halfLength;
    gl_PointSize = clamp( 2.0 * extent * pixelsPerMetre / depth, 1.0, 480.0 );
    vTrail = vec3( trailLength > 1e-4 ? trail / trailLength : vec2( 1.0, 0.0 ), halfLength / extent );
    vHalf = extent;
    // Its water is conserved: the optical depth it was given over its round cluster is spread over the capsule drawn.
    vTau = tau * ( 0.7853982 * look.x * look.x ) / ( 3.1415927 * radius * radius + 4.0 * radius * halfLength );
    // Faded as it grows to fill the view, and as it comes near the eye.
    vFade = ( 1.0 - smoothstep( FADE_FROM, FADE_TO, width * projectionMatrix[ 1 ][ 1 ] / ( 2.0 * depth ) ) ) * smoothstep( NEAR_FROM, NEAR_TO, depth );
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
uniform float spraySkyIrradiance;
uniform float sprayGroundIrradiance;
uniform sampler2D waterChurnMap;
${mistPars}
${ballPars}
${sprayPars}
${sprayDrawPars}
const float CHURN_TILE = ${CHURN_TILE.toFixed(3)};
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying float vKind;
varying vec3 vSprayWorld;
varying float vTau;
varying vec3 vTrail;
varying float vHalf;
varying float vFade;

void main() {
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  if ( r > 1.0 ) discard;
  // The light the sprite adds, and the share of the background it hides (it is blended as premultiplied light).
  float emission;
  float hidden;
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
    gl_FragColor = vec4( ( ballLight * bodyAlpha * ( 1.0 - glowAlpha ) + glowLight * glowAlpha ) / max( ballAlpha, 1e-4 ), 1.0 );
    emission = ballAlpha;
    hidden = ballAlpha;
  } else {
    // A cluster of spray or mist: a capsule along its travel, soft to its edge, with the churn's clumps for grain.
    vec2 p = vec2( gl_PointCoord.x - 0.5, 0.5 - gl_PointCoord.y ) * 2.0;
    vec2 beyond = vec2( max( abs( dot( p, vTrail.xy ) ) - vTrail.z, 0.0 ) * sign( dot( p, vTrail.xy ) ), dot( p, vec2( -vTrail.y, vTrail.x ) ) ) / max( 1.0 - vTrail.z, 1e-3 );
    float edge = length( beyond );
    if ( edge > 1.0 ) discard;
    float clump = texture( waterChurnMap, ( vSprayWorld.xz + vec2( vSprayWorld.y ) + p * vHalf * SPRAY_GRAIN ) / CHURN_TILE ).x;
    float depthHere = vTau * pow( 1.0 - edge, mix( SHAPE_DROP, SHAPE_MIST, vMist ) ) * mix( 1.0 - SPRAY_WISP, 1.0, clump ) * vFade;
    // Where it is thick it is a rounded mass of foam's white: the normal of the sphere under the capsule's edge.
    vec3 sprayNormal = normalize( vec3( beyond.x * vTrail.xy + beyond.y * vec2( -vTrail.y, vTrail.x ), sqrt( max( 0.0, 1.0 - edge * edge ) ) ) );
    vec3 sunView = normalize( ( viewMatrix * vec4( spraySunDirection, 0.0 ) ).xyz );
    vec3 upView = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
    // The drops' phase function toward the eye (1 for an isotropic scatterer): backlit, spray glows.
    float scatter = 12.566370614 * henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), MIST_G );
    gl_FragColor = vec4( sprayColour( depthHere, scatter, dot( sprayNormal, sunView ), dot( sprayNormal, upView ), spraySkyIrradiance, sprayGroundIrradiance, spraySunRadiance ), 1.0 );
    // Drops scatter forward: a thin cluster stops light that still reaches the eye, so it hides only part of what is behind it.
    emission = ( 1.0 - exp( -depthHere ) ) * smoothstep( -0.1, 0.35, vAbove );
    hidden = emission * mix( SPRAY_LEAK, 1.0, sprayWhite( depthHere ) );
  }
  // Lit by a coloured sun the spray can pass 1: tone-map it like the rest of the scene rather than clip it.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor = vec4( gl_FragColor.rgb * emission, hidden );
}
`;
