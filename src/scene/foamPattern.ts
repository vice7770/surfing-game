import { DataTexture, LinearFilter, RGFormat, RepeatWrapping, UnsignedByteType } from 'three';

/**
 * Foam drawn as a cellular network (plan §2.4, G4): foam covers the surface
 * within a threshold of the cell walls between jittered feature points (the
 * Voronoi edges, F2 − F1), so bubble holes open up and leave connected lace as
 * the foam value falls. The threshold is chosen so the covered fraction equals
 * the foam value. Patches of a smooth value noise gather thin lace together, and
 * a two-phase flow map carries both with the current.
 *
 * The network is baked once into a seamless tiling texture (red: wall distance,
 * green: patch value) from an integer PCG2D hash (Jarzynski & Olano 2020), so
 * the shader reads it instead of hashing nine cells per phase. The functions
 * here sample the same texels the GPU does.
 */

/** Pattern cell size, m: about one bubble hole across in surf-zone lace. */
export const FOAM_CELL = 0.7;
/** Cells across the tiling texture: the pattern repeats every 64 × 0.7 = 44.8 m. */
export const FOAM_TILE = 64;
const TEXELS_PER_CELL = 8;
export const FOAM_TILE_TEXELS = FOAM_TILE * TEXELS_PER_CELL;
/** Patch lattice spacing in cells (5.6 m); it divides the tile, so patches tile too. */
const PATCH_CELLS = 8;
/** Flow-map period, s: each phase drifts with the current for this long before it fades out. */
export const FOAM_FLOW_PERIOD = 2;
/** Half-width of the soft network edge, in cells. */
const EDGE = 0.04;
const LEVELS = 16;

function pcg2d(ix: number, iz: number): [number, number] {
  let x = (Math.imul(ix >>> 0, 1664525) + 1013904223) >>> 0;
  let y = (Math.imul(iz >>> 0, 1664525) + 1013904223) >>> 0;
  x = (x + Math.imul(y, 1664525)) >>> 0;
  y = (y + Math.imul(x, 1664525)) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  y = (y ^ (y >>> 16)) >>> 0;
  x = (x + Math.imul(y, 1664525)) >>> 0;
  y = (y + Math.imul(x, 1664525)) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  y = (y ^ (y >>> 16)) >>> 0;
  return [x, y];
}

const wrap = (value: number, period: number) => ((value % period) + period) % period;

/**
 * How far a point (in cells) lies from the wall between its two nearest
 * feature points: the second-nearest distance minus the nearest, with one
 * jittered point per cell repeating every `FOAM_TILE` cells.
 */
export function foamDistance(x: number, z: number): number {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  let nearest = 8;
  let second = 8;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const [hx, hz] = pcg2d(wrap(cx + i, FOAM_TILE), wrap(cz + j, FOAM_TILE));
      const distance = Math.hypot(x - (cx + i + hx / 4294967295), z - (cz + j + hz / 4294967295));
      if (distance < nearest) {
        second = nearest;
        nearest = distance;
      } else if (distance < second) {
        second = distance;
      }
    }
  }
  return second - nearest;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [0, 1] with mean ½ on a lattice of `PATCH_CELLS` cells, tiling with the network. */
function foamPatchValue(x: number, z: number): number {
  const px = x / PATCH_CELLS;
  const pz = z / PATCH_CELLS;
  const cx = Math.floor(px);
  const cz = Math.floor(pz);
  const sx = smoothstep(0, 1, px - cx);
  const sz = smoothstep(0, 1, pz - cz);
  const lattice = FOAM_TILE / PATCH_CELLS;
  const value = (i: number, j: number) => pcg2d(wrap(cx + i, lattice) + 7919, wrap(cz + j, lattice) + 104729)[0] / 4294967295;
  const top = value(0, 0) + (value(1, 0) - value(0, 0)) * sx;
  const bottom = value(0, 1) + (value(1, 1) - value(0, 1)) * sx;
  return top + (bottom - top) * sz;
}

let tileData: Uint8Array | undefined;

/** The baked tile, (wall distance, patch) per texel as bytes over [0, 1] cells. */
export function foamTileData(): Uint8Array {
  if (!tileData) {
    const size = FOAM_TILE_TEXELS;
    tileData = new Uint8Array(size * size * 2);
    for (let j = 0; j < size; j += 1) {
      for (let i = 0; i < size; i += 1) {
        const x = (i + 0.5) / TEXELS_PER_CELL;
        const z = (j + 0.5) / TEXELS_PER_CELL;
        const k = (j * size + i) * 2;
        tileData[k] = Math.round(Math.min(1, foamDistance(x, z)) * 255);
        tileData[k + 1] = Math.round(foamPatchValue(x, z) * 255);
      }
    }
  }
  return tileData;
}

let tileTexture: DataTexture | undefined;

/** The tile as a repeating, linearly filtered RG8 texture shared by both water meshes. */
export function foamTileTexture(): DataTexture {
  if (!tileTexture) {
    tileTexture = new DataTexture(foamTileData(), FOAM_TILE_TEXELS, FOAM_TILE_TEXELS, RGFormat, UnsignedByteType);
    tileTexture.wrapS = RepeatWrapping;
    tileTexture.wrapT = RepeatWrapping;
    tileTexture.magFilter = LinearFilter;
    tileTexture.minFilter = LinearFilter;
    tileTexture.generateMipmaps = false;
    tileTexture.needsUpdate = true;
  }
  return tileTexture;
}

/** CPU mirror of a linearly filtered, repeating texture read of the tile at (x, z) cells: channel 0 is the wall distance, 1 the patch. */
export function sampleFoamTile(x: number, z: number, channel = 0): number {
  const data = foamTileData();
  const size = FOAM_TILE_TEXELS;
  const tx = x * TEXELS_PER_CELL - 0.5;
  const tz = z * TEXELS_PER_CELL - 0.5;
  const i0 = Math.floor(tx);
  const j0 = Math.floor(tz);
  const fx = tx - i0;
  const fz = tz - j0;
  const at = (i: number, j: number) => data[(wrap(j, size) * size + wrap(i, size)) * 2 + channel] / 255;
  const top = at(i0, j0) + (at(i0 + 1, j0) - at(i0, j0)) * fx;
  const bottom = at(i0, j0 + 1) + (at(i0 + 1, j0 + 1) - at(i0, j0 + 1)) * fx;
  return top + (bottom - top) * fz;
}

/**
 * Wall half-thickness for foam values 0, 1/16, …, 1: the distance from the
 * walls within which the foam-value share of the surface lies, measured once
 * from the baked tile.
 */
export const FOAM_THRESHOLDS: readonly number[] = (() => {
  const distances: number[] = [];
  for (let z = 0.11; z < FOAM_TILE; z += 0.37) for (let x = 0.07; x < FOAM_TILE; x += 0.37) distances.push(sampleFoamTile(x, z));
  distances.sort((a, b) => a - b);
  const quantile = (share: number) => distances[Math.min(distances.length - 1, Math.max(0, Math.round(share * (distances.length - 1))))];
  return Array.from({ length: LEVELS + 1 }, (_, k) => quantile(k / LEVELS));
})();

/** Foam present at a point `distance` cells from the nearest cell wall, for foam value `foam`. */
export function foamCoverage(foam: number, distance: number): number {
  if (!(foam > 0.001)) return 0;
  const s = Math.min(1, foam) * LEVELS;
  const k = Math.min(LEVELS - 1, Math.floor(s));
  const radius = FOAM_THRESHOLDS[k] + (FOAM_THRESHOLDS[k + 1] - FOAM_THRESHOLDS[k]) * (s - k);
  return 1 - smoothstep(radius - EDGE, radius + EDGE, distance);
}

/** Local foam value inside a patch: F·(1 + (2v − 1)(1 − F)), mean F, never above 1, solid when F → 1. */
function patchy(foam: number, patch: number): number {
  const f = Math.min(1, foam);
  return f * (1 + (2 * patch - 1) * (1 - f));
}

/** Coverage from one flow-map phase, at world position (x, z) in m. */
function phaseCover(foam: number, x: number, z: number): number {
  const cx = x / FOAM_CELL;
  const cz = z / FOAM_CELL;
  return foamCoverage(patchy(foam, sampleFoamTile(cx, cz, 1)), sampleFoamTile(cx, cz, 0));
}

/**
 * Share of a pixel `footprint` metres across at which the network gives way to
 * its mean: the tile has no mipmaps, so finer detail would alias.
 */
function detailFade(footprint: number): number {
  return smoothstep(0.25, 1, footprint / FOAM_CELL);
}

/** CPU mirror of `waterFoamCover`: world position and current in m and m/s, time in s, pixel footprint in m. */
export function foamCover(x: number, z: number, flowX: number, flowZ: number, foam: number, time: number, footprint = 0): number {
  if (!(foam > 0.001)) return 0;
  const fade = detailFade(footprint);
  if (fade >= 1) return foam;
  const a = time / FOAM_FLOW_PERIOD - Math.floor(time / FOAM_FLOW_PERIOD);
  const b = a + 0.5 - Math.floor(a + 0.5);
  const weight = 1 - Math.abs(2 * a - 1);
  // Phase B is offset only as far as the current moves the pattern, so still water keeps one static network.
  const offset = smoothstep(0, 0.5, (Math.hypot(flowX, flowZ) * FOAM_FLOW_PERIOD) / FOAM_CELL);
  const coverA = phaseCover(foam, x - flowX * a * FOAM_FLOW_PERIOD, z - flowZ * a * FOAM_FLOW_PERIOD);
  const coverB = phaseCover(foam, x - flowX * b * FOAM_FLOW_PERIOD + 17.3 * FOAM_CELL * offset, z - flowZ * b * FOAM_FLOW_PERIOD + 5.9 * FOAM_CELL * offset);
  const cover = weight * coverA + (1 - weight) * coverB;
  return fade > 0 ? cover + (foam - cover) * fade : cover;
}

export const foamPatternPars = /* glsl */ `
uniform sampler2D waterFoamTile;
const float FOAM_CELL = ${FOAM_CELL.toFixed(3)};
const float FOAM_TILE = ${FOAM_TILE.toFixed(1)};
const float FOAM_FLOW_PERIOD = ${FOAM_FLOW_PERIOD.toFixed(3)};
const float FOAM_THRESHOLDS[${LEVELS + 1}] = float[${LEVELS + 1}]( ${FOAM_THRESHOLDS.map((r) => r.toFixed(5)).join(', ')} );

float foamCoverage( float foam, float distance ) {
  if ( foam <= 0.001 ) return 0.0;
  float s = min( foam, 1.0 ) * ${LEVELS.toFixed(1)};
  int k = min( ${LEVELS - 1}, int( floor( s ) ) );
  float radius = mix( FOAM_THRESHOLDS[ k ], FOAM_THRESHOLDS[ k + 1 ], s - float( k ) );
  return 1.0 - smoothstep( radius - ${EDGE.toFixed(3)}, radius + ${EDGE.toFixed(3)}, distance );
}

float foamPhaseCover( float foam, vec2 p ) {
  vec2 tile = texture( waterFoamTile, p / ( FOAM_CELL * FOAM_TILE ) ).rg;
  float f = min( foam, 1.0 );
  return foamCoverage( f * ( 1.0 + ( 2.0 * tile.g - 1.0 ) * ( 1.0 - f ) ), tile.r );
}

float waterFoamCover( vec2 p, vec2 flow, float foam, float time, float footprint ) {
  if ( foam <= 0.001 ) return 0.0;
  float fade = smoothstep( 0.25, 1.0, footprint / FOAM_CELL );
  if ( fade >= 1.0 ) return foam;
  float a = fract( time / FOAM_FLOW_PERIOD );
  float b = fract( a + 0.5 );
  float weight = 1.0 - abs( 2.0 * a - 1.0 );
  float offset = smoothstep( 0.0, 0.5, length( flow ) * FOAM_FLOW_PERIOD / FOAM_CELL );
  float coverA = foamPhaseCover( foam, p - flow * a * FOAM_FLOW_PERIOD );
  float coverB = foamPhaseCover( foam, p - flow * b * FOAM_FLOW_PERIOD + vec2( 17.3, 5.9 ) * FOAM_CELL * offset );
  return mix( weight * coverA + ( 1.0 - weight ) * coverB, foam, fade );
}
`;
