import { waterHeightPars } from '../WaterSurface';
import { mistPars } from './mist';
import { waterTubeCarvePars } from './tubeCarve';

/**
 * The Rich spray's shaders (G8): mist (the wide sprites) drawn larger and
 * lit by forward scattering, so it glows toward the sun; drops lit plainly;
 * both fading out just under the water's surface, so no hard line shows
 * where a sprite meets it.
 */
export const richSprayVertex = /* glsl */ `
attribute vec2 look;
uniform float pixelsPerMetre;
${waterHeightPars}
${waterTubeCarvePars}
${mistPars}
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying vec3 vSprayWorld;

void main() {
  vec4 view = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * view;
  vMist = look.x > MIST_SIZE ? 1.0 : 0.0;
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
${mistPars}
varying float vOpacity;
varying float vAbove;
varying float vMist;
varying vec3 vSprayWorld;

void main() {
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  if ( r > 1.0 ) discard;
  float phase = vMist > 0.5
    ? 12.566370614 * henyeyGreenstein( dot( normalize( vSprayWorld - cameraPosition ), spraySunDirection ), MIST_G ) * 0.25
    : 1.0;
  vec3 light = 0.35 + spraySunRadiance * phase * 0.5;
  // Dim mist thins out rather than greying: its dimness goes into its opacity.
  float thin = vMist > 0.5 ? min( 1.0, max( light.r, max( light.g, light.b ) ) ) : 1.0;
  // Mist is a softer disc than a drop cluster.
  float disc = vMist > 0.5 ? ( 1.0 - r ) * ( 1.0 - r ) : 1.0 - r * r;
  gl_FragColor = vec4( sprayColor * light / thin, vOpacity * disc * thin * smoothstep( -0.1, 0.35, vAbove ) );
  // Lit by a coloured sun the spray can pass 1: tone-map it like the rest of the scene rather than clip it.
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
