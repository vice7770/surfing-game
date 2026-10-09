import { catmullRomWeights } from '../../physics/PhysicalSurfWater';
import type { SurfaceGrid } from '../WaterSurface';
import { foldGridX } from './waterFold';

/** d/dt of the Catmull-Rom weights (as `PhysicalSurfWater`'s own slopes). */
function catmullRomSlopes(t: number): [number, number, number, number] {
  const t2 = t * t;
  return [(-3 * t2 + 4 * t - 1) / 2, (9 * t2 - 10 * t) / 2, (-9 * t2 + 8 * t + 1) / 2, (3 * t2 - 2 * t) / 2];
}

/**
 * CPU mirror of `waterCubic`: the Catmull-Rom surface over the render nodes,
 * as `PhysicalSurfWater` samples it, so the Rich water draws the surface the
 * board rides. `data` holds (height, foam) per node. Nodes are clamped to the
 * grid across shore and mirrored past its side edges (`foldGridX`), where the
 * drawn water continues as its reflection (the physics clamps there, but no
 * body reaches the edge columns: the rider's boundary holds it inside).
 */
export function sampleCubicSurface(data: Float32Array, grid: SurfaceGrid, x: number, z: number): { height: number; slopeX: number; slopeZ: number } {
  const gx = (x - grid.xMin) / grid.spacing;
  const gz = (z - grid.zMin) / grid.spacing;
  const i0 = Math.floor(gx);
  const j0 = Math.floor(gz);
  const wx = catmullRomWeights(gx - i0);
  const wz = catmullRomWeights(gz - j0);
  const dx = catmullRomSlopes(gx - i0);
  const dz = catmullRomSlopes(gz - j0);
  let height = 0;
  let hx = 0;
  let hz = 0;
  for (let j = 0; j < 4; j += 1) {
    const row = Math.min(grid.nz - 1, Math.max(0, j0 + j - 1));
    for (let i = 0; i < 4; i += 1) {
      const column = Math.min(grid.nx - 1, Math.max(0, Math.round(foldGridX(i0 + i - 1, grid.nx))));
      const value = data[(row * grid.nx + column) * 2];
      height += wz[j] * wx[i] * value;
      hx += wz[j] * dx[i] * value;
      hz += dz[j] * wx[i] * value;
    }
  }
  return { height, slopeX: hx / grid.spacing, slopeZ: hz / grid.spacing };
}

/** GLSL twin of `sampleCubicSurface` over the water's height texture: (height, dη/dx, dη/dz). Needs `waterFoldPars`. */
export const waterCubicPars = /* glsl */ `
vec4 waterCatmullRom( float t ) {
  float t2 = t * t;
  float t3 = t2 * t;
  return 0.5 * vec4( -t3 + 2.0 * t2 - t, 3.0 * t3 - 5.0 * t2 + 2.0, -3.0 * t3 + 4.0 * t2 + t, t3 - t2 );
}
vec4 waterCatmullRomSlope( float t ) {
  float t2 = t * t;
  return 0.5 * vec4( -3.0 * t2 + 4.0 * t - 1.0, 9.0 * t2 - 10.0 * t, -9.0 * t2 + 8.0 * t + 1.0, 3.0 * t2 - 2.0 * t );
}
float waterNode( ivec2 c ) {
  // Mirrored past the side edges (waterFoldX), clamped across shore.
  c.x = int( waterFoldX( float( c.x ) ) + 0.5 );
  return texelFetch( waterSurface, clamp( c, ivec2( 0 ), ivec2( waterGridSize ) - 1 ), 0 ).r;
}
vec3 waterCubic( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  ivec2 c = ivec2( floor( g ) );
  vec2 t = g - vec2( c );
  vec4 wx = waterCatmullRom( t.x );
  vec4 wz = waterCatmullRom( t.y );
  vec4 dx = waterCatmullRomSlope( t.x );
  vec4 dz = waterCatmullRomSlope( t.y );
  vec3 result = vec3( 0.0 );
  for ( int j = 0; j < 4; j ++ ) {
    vec4 row = vec4( waterNode( c + ivec2( -1, j - 1 ) ), waterNode( c + ivec2( 0, j - 1 ) ), waterNode( c + ivec2( 1, j - 1 ) ), waterNode( c + ivec2( 2, j - 1 ) ) );
    result += vec3( wz[ j ] * dot( wx, row ), wz[ j ] * dot( dx, row ), dz[ j ] * dot( wx, row ) );
  }
  return vec3( result.x, result.yz / waterGrid.z );
}
`;
