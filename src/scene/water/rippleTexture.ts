import { DataTexture, DataUtils, HalfFloatType, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, RepeatWrapping } from 'three';
import { seededRandom } from '../../wave/random';
import { smoothstep } from '../../wave/Bathymetry';
import { FOAM_FLOW_PERIOD } from '../foamPattern';
import { DEFAULT_WATER_CHOP } from '../waterChop';

/** The two ripple layers' repeats, m: the larger rides the chop, the finer the capillary texture. */
export const RIPPLE_TILES = [4, 1.3] as const;
export const RIPPLE_SIZE = 256;
/** The flow-map period, s: the foam lace's, so ripples and lace drift together. */
export const RIPPLE_PERIOD = FOAM_FLOW_PERIOD;
/** RMS slope of one layer at strength 1 (a light wind sea's fine slopes, art-directed). */
export const RIPPLE_RMS_SLOPE = 0.1;
const COMPONENTS = 48;

/**
 * The ripples' gain over a foam value: glassy on clean water, busiest in the
 * thin foam of turbulent water, and damped under thick foam, which calms the
 * surface beneath it (a lit foam mat would otherwise show them as blotches).
 */
export function rippleFoamGain(foam: number): number {
  return (0.35 + 0.65 * Math.min(1, Math.max(0, foam * 3))) * (1 - 0.75 * smoothstep(0.3, 0.8, foam));
}

type RippleTap = readonly [number, number, number, number];

const layerVariance = (t: RippleTap) => Math.max(0, t[2] + t[3] - t[0] * t[0] - t[1] * t[1]);

/**
 * CPU mirror of the shader's unresolved slope variance at strength 1, from
 * the filtered taps (sx, sz, sx², sz²) of the two layers in the two flow-map
 * phases: each layer's own variance, weighted as the layers are summed (the
 * finer at 0.6, so its variance at 0.36), blended by the phase weight `w`.
 * Where the footprint resolves the ripples every tap is a point and none is left.
 */
export function rippleVariance(a0: RippleTap, a1: RippleTap, b0: RippleTap, b1: RippleTap, w: number): number {
  return w * (layerVariance(a0) + 0.36 * layerVariance(a1)) + (1 - w) * (layerVariance(b0) + 0.36 * layerVariance(b1));
}

/** The ripples' strength for a wind chop: 0.8 on calm water, 1 at the default chop; the tank and the far ocean share it. */
export const rippleStrength = (chop: number) => 0.8 + (0.2 * chop) / DEFAULT_WATER_CHOP;

interface Component { nx: number; nz: number; amplitude: number; phase: number }

/**
 * The ripple height field over one tile: a seeded sum of cosines with integer
 * wave vectors (so it tiles exactly), |n| from 3 to 28 per tile, spread as
 * cos² about the +x wind, amplitudes falling as |n|⁻² (a wind sea's slope
 * spectrum), scaled so the rms slope of each component is `RIPPLE_RMS_SLOPE`.
 */
function components(seed: number): Component[] {
  const random = seededRandom(seed, 0x51b7a1);
  const list: Component[] = [];
  const taken = new Set<string>();
  while (list.length < COMPONENTS) {
    const magnitude = 3 * (28 / 3) ** random();
    const angle = (random() - 0.5) * Math.PI;
    if (random() > Math.cos(angle) ** 2) continue;
    const nx = Math.round(magnitude * Math.cos(angle));
    const nz = Math.round(magnitude * Math.sin(angle));
    const key = `${nx},${nz}`;
    if ((nx === 0 && nz === 0) || taken.has(key)) continue;
    taken.add(key);
    list.push({ nx, nz, amplitude: 1 / (nx * nx + nz * nz), phase: random() * 2 * Math.PI });
  }
  // Scale to the rms slope, measured on a 64² grid of the tile.
  let squares = 0;
  for (let i = 0; i < 64; i += 1) {
    for (let j = 0; j < 64; j += 1) {
      const [sx, sz] = rawSlope(list, i / 64, j / 64);
      squares += sx * sx + sz * sz;
    }
  }
  const scale = RIPPLE_RMS_SLOPE / Math.sqrt(squares / (2 * 64 * 64));
  for (const component of list) component.amplitude *= scale;
  return list;
}

function rawSlope(list: readonly Component[], u: number, v: number): [number, number] {
  let sx = 0;
  let sz = 0;
  for (const { nx, nz, amplitude, phase } of list) {
    const s = -amplitude * 2 * Math.PI * Math.sin(2 * Math.PI * (nx * u + nz * v) + phase);
    sx += s * nx;
    sz += s * nz;
  }
  return [sx, sz];
}

const cache = new Map<number, Component[]>();
const componentsFor = (seed: number) => {
  let list = cache.get(seed);
  if (!list) cache.set(seed, (list = components(seed)));
  return list;
};

/** The ripple slope (∂h/∂u, ∂h/∂v) at tile coordinates (u, v), exact and tileable. */
export function rippleSlope(u: number, v: number, seed = 1): [number, number] {
  return rawSlope(componentsFor(seed), u, v);
}

let texture: DataTexture | undefined;

/** RGBA half floats (sx, sz, sx², sz²), mipmapped and repeating: filtered texels give each footprint's mean slope and its variance. */
export function rippleTexture(seed = 1): DataTexture {
  if (texture) return texture;
  const data = new Uint16Array(RIPPLE_SIZE * RIPPLE_SIZE * 4);
  for (let j = 0; j < RIPPLE_SIZE; j += 1) {
    for (let i = 0; i < RIPPLE_SIZE; i += 1) {
      const [sx, sz] = rippleSlope((i + 0.5) / RIPPLE_SIZE, (j + 0.5) / RIPPLE_SIZE, seed);
      const k = (j * RIPPLE_SIZE + i) * 4;
      data[k] = DataUtils.toHalfFloat(sx);
      data[k + 1] = DataUtils.toHalfFloat(sz);
      data[k + 2] = DataUtils.toHalfFloat(sx * sx);
      data[k + 3] = DataUtils.toHalfFloat(sz * sz);
    }
  }
  texture = new DataTexture(data, RIPPLE_SIZE, RIPPLE_SIZE, RGBAFormat, HalfFloatType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * GLSL: the two ripple layers carried by the current in two flow-map phases
 * (as the foam lace), glassy on clean water and busier where there is foam.
 * Sets `waterRippleVariance` (declared in `richFragmentPars`), the slope
 * variance the footprint leaves unresolved, for the specular anti-aliasing.
 */
export const waterRipplePars = /* glsl */ `
uniform sampler2D waterRippleMap;
uniform float waterRippleStrength;
const float RIPPLE_PERIOD = ${RIPPLE_PERIOD.toFixed(3)};
const float RIPPLE_TILE_0 = ${RIPPLE_TILES[0].toFixed(3)};
const float RIPPLE_TILE_1 = ${RIPPLE_TILES[1].toFixed(3)};
float waterRippleFoamGain( float foam ) { return mix( 0.35, 1.0, clamp( foam * 3.0, 0.0, 1.0 ) ) * ( 1.0 - 0.75 * smoothstep( 0.3, 0.8, foam ) ); }
vec4 waterRippleTap( vec2 p, float tile ) { return texture( waterRippleMap, p / tile ); }
float waterRippleLayerVariance( vec4 t ) { return max( 0.0, t.z + t.w - dot( t.xy, t.xy ) ); }
vec2 waterRippleSlopeAt( vec2 p, vec2 flow ) {
  float a = fract( waterTime / RIPPLE_PERIOD );
  float b = fract( a + 0.5 );
  float w = 1.0 - abs( 2.0 * a - 1.0 );
  vec2 pa = p - flow * a * RIPPLE_PERIOD;
  vec2 pb = p - flow * b * RIPPLE_PERIOD + vec2( 7.13, 3.31 );
  vec4 a0 = waterRippleTap( pa, RIPPLE_TILE_0 );
  vec4 a1 = waterRippleTap( pa, RIPPLE_TILE_1 );
  vec4 b0 = waterRippleTap( pb, RIPPLE_TILE_0 );
  vec4 b1 = waterRippleTap( pb, RIPPLE_TILE_1 );
  vec2 slope = w * ( a0.xy + 0.6 * a1.xy ) + ( 1.0 - w ) * ( b0.xy + 0.6 * b1.xy );
  // Each layer's own unresolved variance (see rippleVariance), so resolved ripples leave none.
  float variance = w * ( waterRippleLayerVariance( a0 ) + 0.36 * waterRippleLayerVariance( a1 ) )
    + ( 1.0 - w ) * ( waterRippleLayerVariance( b0 ) + 0.36 * waterRippleLayerVariance( b1 ) );
  float strength = waterRippleStrength * waterRippleFoamGain( vWaterFoam );
  waterRippleVariance = strength * strength * variance;
  return strength * slope;
}
`;
