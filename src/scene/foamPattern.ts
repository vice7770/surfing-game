/**
 * Foam drawn as a cellular network (plan §2.4, G4): foam covers the surface
 * farther than a threshold from jittered feature points, so bubble holes open
 * up and leave lace as the foam value falls. The threshold is chosen so the
 * covered fraction equals the foam value. A two-phase flow map carries the
 * network with the current. The functions here mirror the GLSL exactly
 * (integer PCG2D hash, Jarzynski & Olano 2020).
 */

/** Pattern cell size, m: about one bubble hole across in surf-zone lace. */
export const FOAM_CELL = 0.7;
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

/** Distance from (x, z), in cells, to the nearest feature point (one jittered point per cell). */
export function foamDistance(x: number, z: number): number {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  let best = 8;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const [hx, hz] = pcg2d(cx + i, cz + j);
      best = Math.min(best, Math.hypot(x - (cx + i + hx / 4294967295), z - (cz + j + hz / 4294967295)));
    }
  }
  return best;
}

/**
 * Network radius for foam values 0, 1/16, …, 1: the distance exceeded by the
 * foam-value share of the surface, measured once from the pattern itself.
 */
export const FOAM_THRESHOLDS: readonly number[] = (() => {
  const distances: number[] = [];
  for (let z = 0; z < 80; z += 0.37) for (let x = 0; x < 80; x += 0.37) distances.push(foamDistance(x, z));
  distances.sort((a, b) => a - b);
  const quantile = (share: number) => distances[Math.min(distances.length - 1, Math.max(0, Math.round(share * (distances.length - 1))))];
  return Array.from({ length: LEVELS + 1 }, (_, k) => quantile(1 - k / LEVELS));
})();

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Foam present at a point `distance` cells from its nearest feature point, for foam value `foam`. */
export function foamCoverage(foam: number, distance: number): number {
  if (!(foam > 0.001)) return 0;
  const s = Math.min(1, foam) * LEVELS;
  const k = Math.min(LEVELS - 1, Math.floor(s));
  const radius = FOAM_THRESHOLDS[k] + (FOAM_THRESHOLDS[k + 1] - FOAM_THRESHOLDS[k]) * (s - k);
  return smoothstep(radius - EDGE, radius + EDGE, distance);
}

/** CPU mirror of `waterFoamCover`: world position and current in m and m/s, time in s. */
export function foamCover(x: number, z: number, flowX: number, flowZ: number, foam: number, time: number): number {
  if (!(foam > 0.001)) return 0;
  const a = time / FOAM_FLOW_PERIOD - Math.floor(time / FOAM_FLOW_PERIOD);
  const b = a + 0.5 - Math.floor(a + 0.5);
  const weight = 1 - Math.abs(2 * a - 1);
  const coverA = foamCoverage(foam, foamDistance((x - flowX * a * FOAM_FLOW_PERIOD) / FOAM_CELL, (z - flowZ * a * FOAM_FLOW_PERIOD) / FOAM_CELL));
  const coverB = foamCoverage(foam, foamDistance((x - flowX * b * FOAM_FLOW_PERIOD) / FOAM_CELL + 17.3, (z - flowZ * b * FOAM_FLOW_PERIOD) / FOAM_CELL + 5.9));
  return weight * coverA + (1 - weight) * coverB;
}

export const foamPatternPars = /* glsl */ `
const float FOAM_CELL = ${FOAM_CELL.toFixed(3)};
const float FOAM_FLOW_PERIOD = ${FOAM_FLOW_PERIOD.toFixed(3)};
const float FOAM_THRESHOLDS[${LEVELS + 1}] = float[${LEVELS + 1}]( ${FOAM_THRESHOLDS.map((r) => r.toFixed(5)).join(', ')} );

uvec2 foamHash( uvec2 v ) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v = v ^ ( v >> 16u );
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v = v ^ ( v >> 16u );
  return v;
}

float foamDistance( vec2 p ) {
  vec2 cell = floor( p );
  float best = 8.0;
  for ( int j = -1; j <= 1; j ++ ) {
    for ( int i = -1; i <= 1; i ++ ) {
      vec2 c = cell + vec2( float( i ), float( j ) );
      vec2 point = c + vec2( foamHash( uvec2( ivec2( c ) ) ) ) / 4294967295.0;
      best = min( best, length( p - point ) );
    }
  }
  return best;
}

float foamCoverage( float foam, float distance ) {
  if ( foam <= 0.001 ) return 0.0;
  float s = min( foam, 1.0 ) * ${LEVELS.toFixed(1)};
  int k = min( ${LEVELS - 1}, int( floor( s ) ) );
  float radius = mix( FOAM_THRESHOLDS[ k ], FOAM_THRESHOLDS[ k + 1 ], s - float( k ) );
  return smoothstep( radius - ${EDGE.toFixed(3)}, radius + ${EDGE.toFixed(3)}, distance );
}

float waterFoamCover( vec2 p, vec2 flow, float foam, float time ) {
  if ( foam <= 0.001 ) return 0.0;
  float a = fract( time / FOAM_FLOW_PERIOD );
  float b = fract( a + 0.5 );
  float weight = 1.0 - abs( 2.0 * a - 1.0 );
  float coverA = foamCoverage( foam, foamDistance( ( p - flow * a * FOAM_FLOW_PERIOD ) / FOAM_CELL ) );
  float coverB = foamCoverage( foam, foamDistance( ( p - flow * b * FOAM_FLOW_PERIOD ) / FOAM_CELL + vec2( 17.3, 5.9 ) ) );
  return weight * coverA + ( 1.0 - weight ) * coverB;
}
`;
