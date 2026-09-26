import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RGFormat, RepeatWrapping, UnsignedByteType } from 'three';
import { smoothstep } from '../../wave/Bathymetry';
import { pcg2d } from '../foamPattern';

/** The churn tile's size, m: a few clumps of fresh whitewater across a metre or two each. */
export const CHURN_TILE = 6;
const CHURN_SIZE = 256;
/** Feature cells across the tile in the first octave; the second has twice as many. */
const CELLS = 8;

const wrap = (value: number, period: number) => ((value % period) + period) % period;

/** Distance, in cells, to the nearest of one jittered feature point per cell, repeating every `period` cells. */
function nearest(x: number, z: number, period: number, salt: number): number {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  let best = 8;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const [hx, hz] = pcg2d(wrap(cx + i, period) + salt, wrap(cz + j, period));
      best = Math.min(best, Math.hypot(x - (cx + i + hx / 4294967295), z - (cz + j + hz / 4294967295)));
    }
  }
  return best;
}

// Domes 0.8 cell wide: about four fifths covered, the rest creases (0.55 left half the tile open).
const dome = (distance: number) => 1 - smoothstep(0, 0.8, distance);

/**
 * Fresh whitewater at tile coordinates (u, v) in [0, 1]: domed clumps round
 * jittered points (a cauliflower Worley pattern, two octaves) and the creases
 * between them. `height` is 0–1; `density` is how covered the point is.
 */
export function churnSample(u: number, v: number): { density: number; height: number } {
  const height = (dome(nearest(u * CELLS, v * CELLS, CELLS, 0)) + 0.35 * dome(nearest(u * 2 * CELLS, v * 2 * CELLS, 2 * CELLS, 7919))) / 1.35;
  return { density: smoothstep(0.1, 0.35, height), height };
}

/** How much fresh churn replaces the lace: none on old foam, all on the freshest. */
export function freshness(foam: number): number {
  return smoothstep(FRESH_FOAM[0], FRESH_FOAM[1], foam);
}

/** The foam value over which the churn takes over from the lace: the newest whitewater. */
const FRESH_FOAM = [0.55, 0.9] as const;

let texture: DataTexture | undefined;

/** RG8 (density, height), mipmapped and repeating, cached. */
export function churnTexture(): DataTexture {
  if (texture) return texture;
  const data = new Uint8Array(CHURN_SIZE * CHURN_SIZE * 2);
  for (let j = 0; j < CHURN_SIZE; j += 1) {
    for (let i = 0; i < CHURN_SIZE; i += 1) {
      const { density, height } = churnSample((i + 0.5) / CHURN_SIZE, (j + 0.5) / CHURN_SIZE);
      const k = (j * CHURN_SIZE + i) * 2;
      data[k] = Math.round(density * 255);
      data[k + 1] = Math.round(height * 255);
    }
  }
  texture = new DataTexture(data, CHURN_SIZE, CHURN_SIZE, RGFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** How tall the churn's clumps stand, m, for the normal's relief where the foam is fresh. */
export const CHURN_RELIEF = 0.06;

/**
 * GLSL: the churn's (density, height) at p, carried by the current in the
 * lace's two flow-map phases, and its relief as a slope for the normal. Needs
 * `foamPatternPars` and `waterTime`.
 */
export const waterChurnPars = /* glsl */ `
uniform sampler2D waterChurnMap;
const float CHURN_TILE = ${CHURN_TILE.toFixed(3)};
const float CHURN_RELIEF = ${CHURN_RELIEF.toFixed(3)};
float waterFreshness( float foam ) { return smoothstep( ${FRESH_FOAM[0].toFixed(3)}, ${FRESH_FOAM[1].toFixed(3)}, foam ); }
vec2 waterChurnTap( vec2 p ) { return texture( waterChurnMap, p / CHURN_TILE ).rg; }
vec2 waterChurnAt( vec2 p, vec2 flow ) {
  float a = fract( waterTime / FOAM_FLOW_PERIOD );
  float b = fract( a + 0.5 );
  float w = 1.0 - abs( 2.0 * a - 1.0 );
  return w * waterChurnTap( p - flow * a * FOAM_FLOW_PERIOD )
    + ( 1.0 - w ) * waterChurnTap( p - flow * b * FOAM_FLOW_PERIOD + vec2( 2.9, 1.7 ) );
}
vec2 waterChurnSlope( vec2 p, vec2 flow ) {
  const float e = CHURN_TILE / ${CHURN_SIZE.toFixed(1)};
  float h = waterChurnAt( p, flow ).y;
  return CHURN_RELIEF * vec2( waterChurnAt( p + vec2( e, 0.0 ), flow ).y - h, waterChurnAt( p + vec2( 0.0, e ), flow ).y - h ) / e;
}
`;
