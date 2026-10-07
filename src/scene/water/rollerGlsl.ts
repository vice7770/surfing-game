import { ROLLER_LOOK } from './rollerLook';

/** A number as a GLSL float literal. */
const f = (value: number) => (Number.isInteger(value) ? `${value}.0` : `${value}`);

/**
 * The roller lens's band (the Canyon roller lens, S3, plan §4): `waterRollerAt( xz, time )` reads the roller's table
 * (an RGBA32F texture, 2 texels per column and one row per slot: `ROLLER_FIELD` as the worker lays it out) and leaves the
 * band's coverage, its brightness over the foam's, how much of a lens lies here and its water's velocity in four
 * file-scope values the foam chunks read. The GLSL twin of `rollerLookAt` (rollerLook.ts), line for line. Rows outside
 * the lenses' reach across shore (`waterRollerExtent`) leave at once, and so do columns with no lens.
 */
export const waterRollerPars = /* glsl */ `
uniform highp sampler2D waterRoller;
uniform float waterRollerColumns;
uniform float waterRollerColumn0;
uniform float waterRollerColumnWidth;
uniform vec2 waterRollerExtent;
float waterRollerCover;
float waterRollerBright;
float waterRollerPresence;
vec2 waterRollerFlow;
uvec3 waterPcg3d( uvec3 v ) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return v;
}
float waterRollerHash( ivec3 cell ) {
  return float( waterPcg3d( uvec3( cell ) ).x ) * ( 1.0 / 4294967296.0 );
}
vec3 waterRollerFade( vec3 t ) {
  return t * t * t * ( t * ( t * 6.0 - 15.0 ) + 10.0 );
}
float waterRollerNoise2( vec2 p, int salt ) {
  vec2 i = floor( p );
  vec2 u = waterRollerFade( vec3( p - i, 0.0 ) ).xy;
  ivec2 c = ivec2( i );
  float a = waterRollerHash( ivec3( c, salt ) );
  float b = waterRollerHash( ivec3( c + ivec2( 1, 0 ), salt ) );
  float d0 = waterRollerHash( ivec3( c + ivec2( 0, 1 ), salt ) );
  float d1 = waterRollerHash( ivec3( c + ivec2( 1, 1 ), salt ) );
  return 2.0 * mix( mix( a, b, u.x ), mix( d0, d1, u.x ), u.y ) - 1.0;
}
float waterRollerNoise3( vec3 p ) {
  vec3 i = floor( p );
  vec3 u = waterRollerFade( p - i );
  ivec3 c = ivec3( i );
  float near = mix( mix( waterRollerHash( c ), waterRollerHash( c + ivec3( 1, 0, 0 ) ), u.x ),
    mix( waterRollerHash( c + ivec3( 0, 1, 0 ) ), waterRollerHash( c + ivec3( 1, 1, 0 ) ), u.x ), u.y );
  float far = mix( mix( waterRollerHash( c + ivec3( 0, 0, 1 ) ), waterRollerHash( c + ivec3( 1, 0, 1 ) ), u.x ),
    mix( waterRollerHash( c + ivec3( 0, 1, 1 ) ), waterRollerHash( c + ivec3( 1, 1, 1 ) ), u.x ), u.y );
  return mix( near, far, u.z );
}
float waterRollerLife( float life, float depth ) {
  return life * sqrt( max( ${f(ROLLER_LOOK.minDepth)}, depth ) / ${f(ROLLER_LOOK.referenceDepth)} );
}
float waterRollerToe( float x, float time, float depth, float roughness ) {
  float h1 = max( ${f(ROLLER_LOOK.minDepth)}, depth );
  float t = time * ${f(ROLLER_LOOK.toeRate)} / waterRollerLife( ${f(ROLLER_LOOK.fingerLife)}, depth );
  float n = waterRollerNoise2( vec2( x / ( ${f(ROLLER_LOOK.toeShort)} * h1 ), t ), 1 ) + waterRollerNoise2( vec2( x / ( ${f(ROLLER_LOOK.toeLong)} * h1 ), t ), 2 );
  return ${f(ROLLER_LOOK.toeAmplitude)} * roughness * n / ${f(ROLLER_LOOK.toeNoiseSpread)};
}
void waterRollerAt( vec2 xz, float time ) {
  waterRollerCover = 0.0;
  waterRollerBright = 1.0;
  waterRollerPresence = 0.0;
  waterRollerFlow = vec2( 0.0 );
  if ( xz.y < waterRollerExtent.x || xz.y > waterRollerExtent.y ) return;
  float gx = ( xz.x - waterRollerColumn0 ) / waterRollerColumnWidth;
  if ( !( waterRollerColumns >= 2.0 && gx >= 0.0 && gx <= waterRollerColumns - 1.0 ) ) return;
  float i0 = min( waterRollerColumns - 2.0, floor( gx ) );
  float tx = gx - i0;
  int c0 = 2 * int( i0 );
  for ( int slot = 0; slot < 2; slot++ ) {
    vec4 a0 = texelFetch( waterRoller, ivec2( c0, slot ), 0 );
    vec4 a1 = texelFetch( waterRoller, ivec2( c0 + 2, slot ), 0 );
    bool live0 = a0.z > 0.0;
    bool live1 = a1.z > 0.0;
    if ( !live0 && !live1 ) continue;
    float w0 = live0 ? ( live1 ? 1.0 - tx : 1.0 ) : 0.0;
    float w1 = 1.0 - w0;
    float len = w0 * a0.y + w1 * a1.y;
    if ( !( len > 0.0 ) ) continue;
    float xi = ( xz.y - ( w0 * a0.x + w1 * a1.x ) ) / len;
    vec4 b0 = texelFetch( waterRoller, ivec2( c0 + 1, slot ), 0 );
    vec4 b1 = texelFetch( waterRoller, ivec2( c0 + 3, slot ), 0 );
    float roughness = w0 * b0.w + w1 * b1.w;
    if ( xi < -${f(ROLLER_LOOK.rear)} || xi > 1.0 + 4.0 * ${f(ROLLER_LOOK.toeAmplitude)} * roughness / len ) continue;
    float g = ( 1.0 - tx ) * ( live0 ? a0.z : 0.0 ) + tx * ( live1 ? a1.z : 0.0 );
    float depth = w0 * b0.z + w1 * b1.z;
    float band;
    if ( xi < 0.0 ) {
      band = smoothstep( -${f(ROLLER_LOOK.rear)}, 0.0, xi );
    } else {
      float toe = xi - waterRollerToe( xz.x, time, depth, roughness ) / len;
      band = 1.0 - smoothstep( ${f(ROLLER_LOOK.edge)}, 1.0, toe );
      if ( xi > ${f(ROLLER_LOOK.holeFrom)} ) {
        float scale = ${f(ROLLER_LOOK.holeScale)} * max( ${f(ROLLER_LOOK.minDepth)}, depth );
        float hole = waterRollerNoise3( vec3( xz.x / scale, xi * len / scale, time / waterRollerLife( ${f(ROLLER_LOOK.holeLife)}, depth ) ) );
        band *= 1.0 - smoothstep( 0.62, 0.8, hole ) * smoothstep( ${f(ROLLER_LOOK.holeFrom)}, 0.8, xi );
      }
    }
    float cover = g * band;
    if ( !( cover > waterRollerCover ) ) continue;
    waterRollerCover = cover;
    waterRollerBright = xi > 0.0 ? 1.0 - ( 1.0 - ${f(ROLLER_LOOK.toeBright)} ) * min( 1.0, xi ) : 1.0;
    waterRollerPresence = g * ( xi < 0.0 ? smoothstep( -${f(ROLLER_LOOK.rear)}, 0.0, xi ) : 1.0 - smoothstep( 1.0, 1.3, xi ) );
    waterRollerFlow = w0 * b0.xy + w1 * b1.xy;
  }
}
`;
