import { PEEL_ALIGNMENT, PEEL_GAP, TUBE_CAPACITY, TUBE_STRIDE } from '../../wave/tubeTable';
import type { SurfaceGrid } from '../WaterSurface';

/** Bisection steps the GPU takes along a void's floor curve (the CPU's `tubeFloorDepth` takes 40): millimetres off at most. */
export const TUBE_BISECTIONS = 16;
/** Most tubes the GPU reads in one column (a column throws once per wave, so it rarely holds two). */
const TUBES_PER_COLUMN = 8;
const HALF_WIDTH = (3 * Math.sqrt(3)) / 4;

/** CPU twin of the GLSL floor depth, m below the crest; NaN outside the void. */
export function tubeFloorDepthApprox(length: number, width: number, tilt: number, ahead: number): number {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  if (!(ahead >= 0 && ahead <= length * c)) return Number.NaN;
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < TUBE_BISECTIONS; step += 1) {
    const m = (lo + hi) / 2;
    const hw = HALF_WIDTH * m * Math.sqrt(Math.max(0, 1 - m));
    if (length * m * c - width * hw * s < ahead) lo = m;
    else hi = m;
  }
  const u = (lo + hi) / 2;
  return width / 2 + length * u * s + width * HALF_WIDTH * u * Math.sqrt(Math.max(0, 1 - u)) * c;
}

/** Columns the GPU's index spans for a render grid: every column a node's blend can reach, and a spare each side. */
export function tubeColumnCount(grid: SurfaceGrid, columnWidth: number): number {
  return Math.ceil(((grid.nx - 1) * grid.spacing) / columnWidth) + 4;
}

/**
 * Lay the flying tubes out for the GPU: `tubes` holds each as three RGBA
 * texels (its `tubeTable` row), sorted by world column, and `columns` holds,
 * per column from `column0` on, its first tube and how many. A column keeps
 * its TUBES_PER_COLUMN biggest voids; tubes beyond the grid are dropped.
 */
export function packTubeTextures(
  table: ArrayLike<number>, count: number, grid: SurfaceGrid, columnWidth: number, tubes: Float32Array, columns: Float32Array,
): { column0: number; count: number } {
  const column0 = Math.floor(grid.xMin / columnWidth - 0.5) - 1;
  const span = Math.floor(columns.length / 2);
  columns.fill(0);
  const byColumn = new Map<number, number[]>();
  for (let tube = 0; tube < Math.min(count, TUBE_CAPACITY); tube += 1) {
    const column = table[tube * TUBE_STRIDE + 9];
    if (!(column >= column0 && column < column0 + span)) continue;
    const list = byColumn.get(column);
    if (list) list.push(tube);
    else byColumn.set(column, [tube]);
  }
  const size = (tube: number) => table[tube * TUBE_STRIDE + 6] * table[tube * TUBE_STRIDE + 7] * table[tube * TUBE_STRIDE + 10];
  let rows = 0;
  for (const column of [...byColumn.keys()].sort((a, b) => a - b)) {
    const kept = byColumn.get(column)!.sort((a, b) => size(b) - size(a)).slice(0, TUBES_PER_COLUMN);
    columns[(column - column0) * 2] = rows;
    columns[(column - column0) * 2 + 1] = kept.length;
    for (const tube of kept) {
      for (let k = 0; k < TUBE_STRIDE; k += 1) tubes[rows * TUBE_STRIDE + k] = table[tube * TUBE_STRIDE + k];
      rows += 1;
    }
  }
  return { column0, count: rows };
}

/**
 * GLSL (G9): a surface cut by the flying tubes, as `carveAt` cuts it on the
 * CPU (`float waterCarve( vec2 xz, float surface )`). Needs `waterGrid` only
 * through its callers; the tube uniforms are its own.
 */
export const waterTubeCarvePars = /* glsl */ `
uniform sampler2D waterTubeMap;
uniform sampler2D waterTubeColumns;
uniform float waterTubeColumn0;
uniform float waterTubeColumnWidth;
uniform float waterTubeCount;
float waterTubeFloorDepth( float L, float W, float tilt, float ahead ) {
  float c = cos( tilt );
  float s = sin( tilt );
  if ( ahead < 0.0 || ahead > L * c ) return -1.0;
  float lo = 0.0;
  float hi = 1.0;
  for ( int i = 0; i < ${TUBE_BISECTIONS}; i ++ ) {
    float m = 0.5 * ( lo + hi );
    float hw = ${HALF_WIDTH.toFixed(9)} * m * sqrt( max( 0.0, 1.0 - m ) );
    if ( L * m * c - W * hw * s < ahead ) lo = m; else hi = m;
  }
  float u = 0.5 * ( lo + hi );
  return W * 0.5 + L * u * s + W * ${HALF_WIDTH.toFixed(9)} * u * sqrt( max( 0.0, 1.0 - u ) ) * c;
}
float waterTubeFloorOf( vec4 a, vec4 b, vec4 c, vec2 xz ) {
  float ahead = ( xz.x - a.x ) * a.w + ( xz.y - a.y ) * b.x;
  if ( ahead < 0.0 || ahead > b.y || c.z <= 0.0 ) return 1e6;
  float depth = waterTubeFloorDepth( b.z * c.z, b.w * c.z, c.x, ahead );
  return depth < 0.0 ? 1e6 : a.z - depth;
}
float waterTubeFloor( int k, vec2 xz ) {
  return waterTubeFloorOf( texelFetch( waterTubeMap, ivec2( 0, k ), 0 ), texelFetch( waterTubeMap, ivec2( 1, k ), 0 ), texelFetch( waterTubeMap, ivec2( 2, k ), 0 ), xz );
}
// The column's most open tube, or -1.
int waterColumnTube( float column ) {
  int c = int( column - waterTubeColumn0 );
  if ( c < 0 || c >= textureSize( waterTubeColumns, 0 ).x ) return -1;
  vec2 span = texelFetch( waterTubeColumns, ivec2( c, 0 ), 0 ).rg;
  int best = -1;
  float open = -1.0;
  for ( int i = 0; i < ${TUBES_PER_COLUMN}; i ++ ) {
    if ( float( i ) >= span.y ) break;
    int k = int( span.x ) + i;
    float o = texelFetch( waterTubeMap, ivec2( 1, k ), 0 ).y;
    if ( o > open ) { open = o; best = k; }
  }
  return best;
}
float waterColumnCarve( float column, vec2 xz, float surface ) {
  int c = int( column - waterTubeColumn0 );
  if ( c < 0 || c >= textureSize( waterTubeColumns, 0 ).x ) return surface;
  vec2 span = texelFetch( waterTubeColumns, ivec2( c, 0 ), 0 ).rg;
  float carved = surface;
  for ( int i = 0; i < ${TUBES_PER_COLUMN}; i ++ ) {
    if ( float( i ) >= span.y ) break;
    carved = min( carved, waterTubeFloor( int( span.x ) + i, xz ) );
  }
  return carved;
}
float waterCarve( vec2 xz, float surface ) {
  if ( waterTubeCount < 0.5 ) return surface;
  float u = xz.x / waterTubeColumnWidth - 0.5;
  float c0 = floor( u );
  float t = u - c0;
  float blended = mix( waterColumnCarve( c0, xz, surface ), waterColumnCarve( c0 + 1.0, xz, surface ), t );
  int k0 = waterColumnTube( c0 );
  int k1 = waterColumnTube( c0 + 1.0 );
  if ( k0 >= 0 && k1 >= 0 ) {
    vec4 a0 = texelFetch( waterTubeMap, ivec2( 0, k0 ), 0 );
    vec4 b0 = texelFetch( waterTubeMap, ivec2( 1, k0 ), 0 );
    vec4 a1 = texelFetch( waterTubeMap, ivec2( 0, k1 ), 0 );
    vec4 b1 = texelFetch( waterTubeMap, ivec2( 1, k1 ), 0 );
    float gap = dot( a1.xy - a0.xy, vec2( a0.w, b0.x ) );
    float alignment = a0.w * a1.w + b0.x * b1.x;
    // Neighbouring tubes of one peel: interpolate the tube itself; every tube still cuts through the blend.
    if ( abs( gap ) <= ${PEEL_GAP.toFixed(3)} && alignment >= ${PEEL_ALIGNMENT.toFixed(3)} ) {
      vec4 a = mix( a0, a1, t );
      vec4 b = mix( b0, b1, t );
      vec4 c = mix( texelFetch( waterTubeMap, ivec2( 2, k0 ), 0 ), texelFetch( waterTubeMap, ivec2( 2, k1 ), 0 ), t );
      vec2 dir = normalize( vec2( a.w, b.x ) );
      a.w = dir.x;
      b.x = dir.y;
      return min( blended, waterTubeFloorOf( a, b, c, xz ) );
    }
  }
  return blended;
}
`;

/** GLSL: the Catmull-Rom surface cut by the tubes, with its slope. Needs `waterCubicPars` and `waterTubeCarvePars`. */
export const waterCarvedCubicPars = /* glsl */ `
vec3 waterCarvedCubic( vec2 xz ) {
  vec3 surface = waterCubic( xz );
  float h = waterCarve( xz, surface.x );
  if ( h >= surface.x - 1e-4 ) return surface;
  const float e = 0.05;
  vec2 ex = vec2( e, 0.0 );
  vec2 ez = vec2( 0.0, e );
  float hx = waterCarve( xz + ex, waterCubic( xz + ex ).x );
  float hz = waterCarve( xz + ez, waterCubic( xz + ez ).x );
  return vec3( h, ( hx - h ) / e, ( hz - h ) / e );
}
`;

/** Both, for the Rich water. */
export const waterTubePars = `${waterTubeCarvePars}\n${waterCarvedCubicPars}`;
