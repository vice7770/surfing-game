import { ROLLER_DEFAULTS, ROLLER_SLOTS } from '../../wave/SpillingRoller';
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
float waterRollerFresh;
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
float waterRollerToe( float x, float time, float roughness ) {
  float h1 = ${f(ROLLER_LOOK.referenceDepth)};
  float t = time * ${f(ROLLER_LOOK.toeRate)} / ${f(ROLLER_LOOK.fingerLife)};
  float n = ${f(ROLLER_LOOK.toeShortWeight)} * waterRollerNoise2( vec2( x / ( ${f(ROLLER_LOOK.toeShort)} * h1 ), t ), 1 )
    + ${f(ROLLER_LOOK.toeLongWeight)} * waterRollerNoise2( vec2( x / ( ${f(ROLLER_LOOK.toeLong)} * h1 ), t ), 2 );
  return ${f(ROLLER_LOOK.toeAmplitude)} * roughness * n / ${f(ROLLER_LOOK.toeNoiseSpread)};
}
void waterRollerAt( vec2 xz, float time ) {
  waterRollerCover = 0.0;
  waterRollerFresh = 1.0;
  waterRollerPresence = 0.0;
  waterRollerFlow = vec2( 0.0 );
  if ( xz.y < waterRollerExtent.x || xz.y > waterRollerExtent.y ) return;
  // Past a side edge the water is the tank's mirror image (waterFoldXZ): so is its roller, running the other way.
  float mirrored = waterFoldSign( ( xz.x - waterGrid.x ) / waterGrid.z );
  xz = waterFoldXZ( xz );
  float gx = ( xz.x - waterRollerColumn0 ) / waterRollerColumnWidth;
  if ( !( waterRollerColumns >= 2.0 && gx >= 0.0 && gx <= waterRollerColumns - 1.0 ) ) return;
  float i0 = min( waterRollerColumns - 2.0, floor( gx ) );
  float tx = gx - i0;
  int c0 = 2 * int( i0 );
  for ( int slot = 0; slot < ${ROLLER_SLOTS}; slot++ ) {
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
    float band;
    if ( xi < 0.0 ) {
      band = smoothstep( -${f(ROLLER_LOOK.rear)}, 0.0, xi );
    } else {
      float toe = xi - waterRollerToe( xz.x, time, roughness ) / len;
      band = 1.0 - smoothstep( ${f(ROLLER_LOOK.edge)}, 1.0, toe );
      if ( xi > ${f(ROLLER_LOOK.holeFrom)} ) {
        float scale = ${f(ROLLER_LOOK.holeScale * ROLLER_LOOK.referenceDepth)};
        float hole = waterRollerNoise3( vec3( xz.x / scale, xi * len / scale, time / ${f(ROLLER_LOOK.holeLife)} ) );
        band *= 1.0 - smoothstep( 0.62, 0.8, hole ) * smoothstep( ${f(ROLLER_LOOK.holeFrom)}, 0.8, xi );
      }
    }
    float cover = g * band;
    if ( !( cover > waterRollerCover ) ) continue;
    waterRollerCover = cover;
    waterRollerFresh = xi > 0.0 ? 1.0 - min( 1.0, xi ) : 1.0;
    waterRollerPresence = g * ( xi < 0.0 ? smoothstep( -${f(ROLLER_LOOK.rear)}, 0.0, xi ) : 1.0 - smoothstep( 1.0, 1.3, xi ) );
    waterRollerFlow = ( w0 * b0.xy + w1 * b1.xy ) * vec2( mirrored, 1.0 );
  }
}
`;

/** Replace `target` once in `glsl`, or throw: each hook must find, once, the chunk line it changes. */
function hook(glsl: string, target: string, replacement: string): string {
  if (glsl.split(target).length !== 2) throw new Error(`Roller hook expects one "${target}"`);
  return glsl.split(target).join(replacement);
}

/**
 * The band's albedo (ROLLER_LOOK.wrap's comment): fresh whitewater's at the crest, flat across the visible at the foam
 * colour's brightest channel, falling to the foam colour at the toe; and the foam drawn, the band's as far as the band
 * is what covers (all of it where it covers the most).
 */
const BAND_ALBEDO = `  vec3 waterBandAlbedo = mix( waterFoamColor, vec3( max( waterFoamColor.r, max( waterFoamColor.g, waterFoamColor.b ) ) ), waterRollerFresh );
  float waterBandShare = waterRollerCover / max( waterCover, 1e-4 );`;

/**
 * The band lit as a volume scatterer: what the sun gives it beyond the surface's N·L, wrapped round the face (never
 * negative, so the band never shows darker than the surface-lit foam), as three's direct diffuse, E·albedo/π.
 */
const BAND_VOLUME = `  float waterBandSun = dot( waterN, waterSunDirection );
  totalEmissiveRadiance += step( 0.0, faceDirection ) * waterRollerCover * waterBandAlbedo * waterSunRadiance * RECIPROCAL_PI
    * ( max( 0.0, ( waterBandSun + ${f(ROLLER_LOOK.wrap)} ) / ${f(1 + ROLLER_LOOK.wrap)} ) - max( 0.0, waterBandSun ) );`;

/** Any `<normal_fragment_begin>` chunk with the band evaluated first, for the normal and the body chunks after it. */
export function rollerNormal(normal: string): string {
  return hook(normal, '#include <normal_fragment_begin>\n', '#include <normal_fragment_begin>\nwaterRollerAt( vWaterWorld.xz, waterTime );\n');
}

/**
 * The Rich normal chunk: the churn's micro-normals stand on the band as on fresh whitewater (its air at the top taken as
 * the lens's mean, ᾱ, which already saturates the freshness), carried with the lens's water, c·n̂ (R3 §4).
 */
export function richRollerNormal(normal: string): string {
  return hook(rollerNormal(normal),
    'float waterFreshNormal = waterFreshness( vWaterAir ) * waterFoamPattern;\n  if ( waterFreshNormal > 0.0 ) waterSlope += waterFreshNormal * waterChurnSlope( vWaterWorld.xz, vWaterFlow );',
    `float waterFreshNormal = max( waterFreshness( vWaterAir ), waterRollerCover * waterFreshness( ${f(ROLLER_DEFAULTS.voidMean)} ) ) * waterFoamPattern;
  if ( waterFreshNormal > 0.0 ) waterSlope += waterFreshNormal * waterChurnSlope( vWaterWorld.xz, mix( vWaterFlow, waterRollerFlow, waterRollerCover ) );`);
}

/**
 * Classic foam (`CLASSIC_FOAM`, copied, never changed in place): cover = max(cover, the band's), the band in its own
 * albedo (plan §4, the ruling of 2026-10-07), matte as foam, lit as a volume.
 */
export function classicRollerFoam(foam: string): string {
  const drawn = hook(foam, 'diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor, waterCover );',
    `waterCover = max( waterCover, waterRollerCover );
${BAND_ALBEDO}
  diffuseColor.rgb = mix( waterBody * waterBodyGain, mix( waterFoamColor, waterBandAlbedo, waterBandShare ), waterCover );`);
  return hook(drawn, 'roughnessFactor = mix( roughnessFactor, 0.9, waterCover );', `roughnessFactor = mix( roughnessFactor, 0.9, waterCover );
${BAND_VOLUME}`);
}

/**
 * Rich foam (`RICH_FOAM`, copied): the same cover, albedo and light (the band's albedo is uncreased, so the churn's
 * crease never greys it). Where the band covers, its whitewater is fresh (its churn and micro-normals, through
 * `waterFreshness` with ᾱ), the churn carried with the lens's water, c·n̂, so it travels with the roller. Only the band
 * does this, not the rest of the lens beyond its toe, and the field's own crease and backlit glow stay the field's: so
 * the lens never greys the foam it lies on (the ruling of 2026-10-07).
 */
export function richRollerFoam(foam: string): string {
  let out = hook(foam, 'vec2 waterChurn = waterChurnAt( vWaterWorld.xz, vWaterFlow );',
    'vec2 waterChurn = waterChurnAt( vWaterWorld.xz, mix( vWaterFlow, waterRollerFlow, waterRollerCover ) );');
  out = hook(out, 'float waterCover = mix( waterLace, max( waterLace, waterChurn.x ), waterFresh );',
    `float waterLensFresh = max( waterFresh, waterRollerCover * waterFreshness( ${f(ROLLER_DEFAULTS.voidMean)} ) * waterFoamPattern );
  float waterCover = mix( waterLace, max( waterLace, waterChurn.x ), waterLensFresh );`);
  out = hook(out, 'diffuseColor.rgb = mix( waterUnder, waterFoamColor * waterCrease, waterCover );',
    `waterCover = max( waterCover, waterRollerCover );
${BAND_ALBEDO}
  diffuseColor.rgb = mix( waterUnder, mix( waterFoamColor * waterCrease, waterBandAlbedo, waterBandShare ), waterCover );`);
  return hook(out, 'roughnessFactor = mix( roughnessFactor, 0.7, waterCover );', `roughnessFactor = mix( roughnessFactor, 0.7, waterCover );
${BAND_VOLUME}`);
}

/** The body chunk's crest light dims under the band as under foam (plan §4). */
export function rollerCrestLight(body: string): string {
  return hook(body, '( 1.0 - vWaterFoam ) * waterBehind', '( 1.0 - max( vWaterFoam, waterRollerCover ) ) * waterBehind');
}
