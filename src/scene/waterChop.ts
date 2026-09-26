import { DataTexture, FloatType, RGBAFormat, type Texture } from 'three';

/**
 * Wind chop for both water meshes (plan §2.2, WebGL2 tier): six short
 * deep-water waves (ω = √(gk), steepness k·a ≈ 0.075) perturb the shading
 * normal only, never the physics surface, and fade with viewing distance.
 * `waterChop` scales them; P3's local wind will drive it.
 */
export const waterChopPars = /* glsl */ `
uniform float waterTime;
uniform float waterChop;
uniform sampler2D waterChopMap;
uniform float waterChopPatch;
uniform float waterChopFft;
varying vec3 vWaterWorld;

vec2 waterChopSlope( vec2 p, float t ) {
  // The WebGPU tier's FFT wind sea (FftChop), when it runs; else six analytic waves.
  if ( waterChopFft > 0.5 ) return texture2D( waterChopMap, p / waterChopPatch ).xy;
  const vec3 waves[6] = vec3[6](
    vec3( 0.94, 0.34, 1.9 ), vec3( -0.50, 0.87, 1.3 ), vec3( 0.20, -0.98, 2.7 ),
    vec3( 0.77, 0.64, 0.85 ), vec3( -0.90, -0.43, 3.4 ), vec3( 0.34, 0.94, 1.1 )
  );
  vec2 slope = vec2( 0.0 );
  for ( int i = 0; i < 6; i ++ ) {
    vec3 wave = waves[ i ];
    float k = 6.2831853 / wave.z;
    float amplitude = 0.012 * wave.z;
    float phase = k * dot( wave.xy, p ) - sqrt( 9.81 * k ) * t + float( i ) * 1.7;
    slope -= amplitude * k * wave.xy * sin( phase );
  }
  return slope;
}
`;

export const waterChopNormal = /* glsl */ `
#include <normal_fragment_begin>
{
  float chopFade = exp( -length( vWaterWorld - cameraPosition ) / 80.0 );
  vec2 chopSlope = waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime );
  vec3 chopNormal = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  chopNormal = normalize( chopNormal + vec3( -chopSlope.x, 0.0, -chopSlope.y ) );
  normal = normalize( ( viewMatrix * vec4( chopNormal, 0.0 ) ).xyz );
}
`;

export const DEFAULT_WATER_CHOP = 0.25;

/**
 * The FFT chop's slope map, patch size and switch, shared by every water shader
 * (the same uniform objects in each material), so one FftChop render updates all.
 */
export const chopFieldUniforms = {
  waterChopMap: { value: new DataTexture(new Float32Array(4), 1, 1, RGBAFormat, FloatType) as Texture },
  waterChopPatch: { value: 64 },
  waterChopFft: { value: 0 },
};
