import { smoothstep } from '../../wave/Bathymetry';
import { FOAM_EDGE, FOAM_FADE, FOAM_OCTAVES, foamQuantile, sampleFoamField } from './churnTexture';

/** How far the foam lace is stretched along the current into streaks up a steep face (G8). */
export const STREAK_STRETCH = 7;
/** The foam over which streaks fade in: the physics leaves 0.005–0.05 on its steep faces. */
const STREAK_FOAM = [0.005, 0.05] as const;
/** The surface slope over which streaks fade in: the practice faces peak near 0.5. */
const STREAK_STEEP = [0.25, 0.5] as const;
/**
 * The share of a steep face that is line: about a tenth (G8's hand value, kept). The lines are the foam field's late stage
 * (lace and threads) thresholded for that share, then stretched `STREAK_STRETCH` times along the current, so they keep
 * the flow's stretch. [provisional]
 */
export const STREAK_COVER = 0.1;
/** The late stage's tile as the streaks draw it, m (before the stretch): the small octave's, so a thread is a few centimetres wide. [provisional] */
export const STREAK_TILE = FOAM_OCTAVES.small;
/**
 * The streaks' edge is this many sigma of the field wider per metre of the pixel's footprint: half the late stage's
 * gradient at a threshold crossing, 54 sigma a metre at the median across the stretch (the test measures it), so a ramp
 * is about a pixel wide. (The foam field reads its gradient off the derivatives; the streaks' branch hides them.)
 */
export const STREAK_EDGE_SLOPE = 27;
/** Where the second flow-map phase is shifted, m, so the two phases never sample alike (not a multiple of the tile). */
const STREAK_PHASE = [1.11, 1.89] as const;
/**
 * The streaks turn with the current about anchors this far apart, m, blended
 * across each cell (tiled directional flow): a turn of the current then moves
 * the lines by its angle times a few metres, not times the distance to the
 * world's origin, where they would swim with every wave.
 */
export const STREAK_ANCHOR = 6;

/** The four anchors around (x, z) and their weights: smoothstep across the anchor cell, summing to 1. */
export function streakAnchors(x: number, z: number): { x: number; z: number; weight: number }[] {
  const u = x / STREAK_ANCHOR - 0.5;
  const v = z / STREAK_ANCHOR - 0.5;
  const i = Math.floor(u);
  const j = Math.floor(v);
  const su = smoothstep(0, 1, u - i);
  const sv = smoothstep(0, 1, v - j);
  return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([di, dj]) => ({
    x: (i + di + 0.5) * STREAK_ANCHOR,
    z: (j + dj + 0.5) * STREAK_ANCHOR,
    weight: (di ? su : 1 - su) * (dj ? sv : 1 - sv),
  }));
}

/**
 * A point (x, z), m, in the frame of the current turning about an anchor:
 * (across, along / STREAK_STRETCH) from the anchor, offset by the anchor so
 * each draws its own lines. The current's direction is +z on still water.
 */
export function streakFrame(x: number, z: number, flowX: number, flowZ: number, anchorX = 0, anchorZ = 0): [number, number] {
  const speed = Math.hypot(flowX, flowZ);
  const [dx, dz] = speed > 1e-3 ? [flowX / speed, flowZ / speed] : [0, 1];
  const lx = x - anchorX;
  const lz = z - anchorZ;
  return [-lx * dz + lz * dx + anchorX, (lx * dx + lz * dz) / STREAK_STRETCH + anchorZ];
}

/** Where streaks show: steep faces (surface slope) with some foam about. */
export function streakMask(steepness: number, foam: number): number {
  return smoothstep(STREAK_STEEP[0], STREAK_STEEP[1], steepness) * smoothstep(STREAK_FOAM[0], STREAK_FOAM[1], foam);
}

/** The value of a unit Gaussian above which a tenth of it lies: the threshold of the streaks' lines. */
const STREAK_THRESHOLD = foamQuantile(1 - STREAK_COVER);

/**
 * CPU mirror of `waterStreak`: the share of the pixel at (x, z), m, that is streak, given the current at any point
 * (`flowAt`, m/s), the surface's slope and foam there, the clock and the pixel's footprint. Each of the four anchors'
 * two flow-map phases is the foam field's late stage in the anchor's frame; they are blended in squares, before the
 * threshold, as the foam field's are (Heitz & Neyret 2018).
 */
export function streakCover(
  x: number, z: number, flowAt: (x: number, z: number) => [number, number], time: number, steepness: number, foam: number, footprint = 0, period = 2,
): number {
  const mask = streakMask(steepness, foam) * (1 - smoothstep(FOAM_FADE[0], FOAM_FADE[1], footprint));
  if (mask <= 0) return 0;
  const [flowX, flowZ] = flowAt(x, z);
  const a = time / period - Math.floor(time / period);
  const b = a + 0.5 - Math.floor(a + 0.5);
  const w = 1 - Math.abs(2 * a - 1);
  const pa = [x - flowX * a * period, z - flowZ * a * period];
  const pb = [x - flowX * b * period + STREAK_PHASE[0], z - flowZ * b * period + STREAK_PHASE[1]];
  let sum = 0;
  let squares = 0;
  for (const anchor of streakAnchors(x, z)) {
    const [anchorFlowX, anchorFlowZ] = flowAt(anchor.x, anchor.z);
    const gauss = (p: number[]) => {
      const [u, v] = streakFrame(p[0], p[1], anchorFlowX, anchorFlowZ, anchor.x, anchor.z);
      return sampleFoamField(u / STREAK_TILE, v / STREAK_TILE, 3);
    };
    sum += anchor.weight * (w * gauss(pa) + (1 - w) * gauss(pb));
    squares += anchor.weight * anchor.weight * (w * w + (1 - w) * (1 - w));
  }
  const width = Math.min(1, FOAM_EDGE + STREAK_EDGE_SLOPE * footprint);
  return smoothstep(STREAK_THRESHOLD - width, STREAK_THRESHOLD + width, sum / Math.sqrt(squares)) * mask;
}

/**
 * GLSL: the foam field's late stage (lace and threads), stretched along the current and carried by it in the lace's
 * two flow-map phases, thresholded for a tenth of the face, as thin lines up steep foamy faces. Each of the four anchors
 * around a pixel turns them with the current at the anchor, and their eight samples are blended in squares before the
 * threshold. Returns the lines' coverage: how faint a streak is belongs to the foam layer's reflectance (a bubble
 * monolayer, 0.10), no longer to a hand opacity of 0.55. Needs `foamPatternPars`, the height pars (`waterGrid`,
 * `waterGridSize`) and `waterTime`, and, defined after it, `waterStreakField` of `waterChurnPars` (the water's program
 * lists the streaks first, so this declares the function it calls and that one defines it).
 */
export const waterStreakPars = /* glsl */ `
uniform sampler2D waterFlow;
const float STREAK_STRETCH = ${STREAK_STRETCH.toFixed(3)};
const float STREAK_ANCHOR = ${STREAK_ANCHOR.toFixed(3)};
const float STREAK_TILE = ${STREAK_TILE.toFixed(3)};
float waterStreakField( vec2 frame, vec2 dx, vec2 dy );
vec2 waterStreakCurrent( vec2 anchor ) {
  ivec2 c = clamp( ivec2( floor( ( anchor - waterGrid.xy ) / waterGrid.z + 0.5 ) ), ivec2( 0 ), ivec2( waterGridSize ) - 1 );
  vec2 flow = texelFetch( waterFlow, c, 0 ).rg;
  float speed = length( flow );
  return speed > 1e-3 ? flow / speed : vec2( 0.0, 1.0 );
}
float waterStreakGauss( vec2 q, vec2 anchor, vec2 along, vec2 dpdx, vec2 dpdy ) {
  vec2 across = vec2( -along.y, along.x );
  vec2 local = q - anchor;
  vec2 frame = vec2( dot( local, across ), dot( local, along ) / STREAK_STRETCH ) + anchor;
  vec2 fdx = vec2( dot( dpdx, across ), dot( dpdx, along ) / STREAK_STRETCH );
  vec2 fdy = vec2( dot( dpdy, across ), dot( dpdy, along ) / STREAK_STRETCH );
  return waterStreakField( frame / STREAK_TILE, fdx / STREAK_TILE, fdy / STREAK_TILE );
}
float waterStreak( vec2 p, vec2 flow, float steepness, float foam ) {
  vec2 dpdx = dFdx( p );
  vec2 dpdy = dFdy( p );
  vec2 footprint = abs( dpdx ) + abs( dpdy );
  float size = max( footprint.x, footprint.y );
  float mask = smoothstep( ${STREAK_STEEP[0].toFixed(3)}, ${STREAK_STEEP[1].toFixed(3)}, steepness ) * smoothstep( ${STREAK_FOAM[0].toFixed(3)}, ${STREAK_FOAM[1].toFixed(3)}, foam )
    * ( 1.0 - smoothstep( ${FOAM_FADE[0].toFixed(3)}, ${FOAM_FADE[1].toFixed(3)}, size ) );
  if ( mask <= 0.0 ) return 0.0;
  float a = fract( waterTime / FOAM_FLOW_PERIOD );
  float b = fract( a + 0.5 );
  float w = 1.0 - abs( 2.0 * a - 1.0 );
  vec2 pa = p - flow * a * FOAM_FLOW_PERIOD;
  vec2 pb = p - flow * b * FOAM_FLOW_PERIOD + vec2( ${STREAK_PHASE[0].toFixed(3)}, ${STREAK_PHASE[1].toFixed(3)} );
  vec2 cell = p / STREAK_ANCHOR - 0.5;
  vec2 base = floor( cell );
  vec2 s = smoothstep( 0.0, 1.0, cell - base );
  float sum = 0.0;
  float squares = 0.0;
  for ( int k = 0; k < 4; k ++ ) {
    vec2 corner = vec2( float( k & 1 ), float( k >> 1 ) );
    vec2 anchor = ( base + corner + 0.5 ) * STREAK_ANCHOR;
    vec2 weights = mix( 1.0 - s, s, corner );
    float weight = weights.x * weights.y;
    vec2 along = waterStreakCurrent( anchor );
    sum += weight * ( w * waterStreakGauss( pa, anchor, along, dpdx, dpdy ) + ( 1.0 - w ) * waterStreakGauss( pb, anchor, along, dpdx, dpdy ) );
    squares += weight * weight * ( w * w + ( 1.0 - w ) * ( 1.0 - w ) );
  }
  float width = min( 1.0, ${FOAM_EDGE.toFixed(3)} + ${STREAK_EDGE_SLOPE.toFixed(3)} * size );
  return smoothstep( ${STREAK_THRESHOLD.toFixed(4)} - width, ${STREAK_THRESHOLD.toFixed(4)} + width, sum / sqrt( squares ) ) * mask;
}
`;
