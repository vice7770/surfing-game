import { smoothstep } from '../../wave/Bathymetry';

/** How far the foam lace is stretched along the current into streaks up a steep face (G8). */
export const STREAK_STRETCH = 7;
/** The foam over which streaks fade in: the physics leaves 0.005–0.05 on its steep faces. */
const STREAK_FOAM = [0.005, 0.05] as const;
/** The surface slope over which streaks fade in: the practice faces peak near 0.5. */
const STREAK_STEEP = [0.25, 0.5] as const;
/** The lines' half-width in lace cells: about a tenth of the face is line. */
const STREAK_LINE = 0.12;
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

/**
 * GLSL: the foam lace's walls, stretched along the current and carried by it
 * in the lace's two flow-map phases, as thin lines up steep foamy faces. Each
 * of the four anchors around a pixel turns them with the current at the
 * anchor. Needs `foamPatternPars`, the height pars (`waterGrid`,
 * `waterGridSize`) and `waterTime`; fades out once a pixel spans a lace cell
 * (the tile has no mipmaps). It returns the lines' coverage: how faint a streak
 * is belongs to the foam layer's reflectance (a bubble monolayer, 0.10), no
 * longer to a hand opacity of 0.55.
 */
export const waterStreakPars = /* glsl */ `
uniform sampler2D waterFlow;
const float STREAK_STRETCH = ${STREAK_STRETCH.toFixed(3)};
const float STREAK_ANCHOR = ${STREAK_ANCHOR.toFixed(3)};
vec2 waterStreakCurrent( vec2 anchor ) {
  ivec2 c = clamp( ivec2( floor( ( anchor - waterGrid.xy ) / waterGrid.z + 0.5 ) ), ivec2( 0 ), ivec2( waterGridSize ) - 1 );
  vec2 flow = texelFetch( waterFlow, c, 0 ).rg;
  float speed = length( flow );
  return speed > 1e-3 ? flow / speed : vec2( 0.0, 1.0 );
}
float waterStreakLines( vec2 q, vec2 anchor, vec2 along ) {
  vec2 local = q - anchor;
  vec2 frame = vec2( dot( local, vec2( -along.y, along.x ) ), dot( local, along ) / STREAK_STRETCH ) + anchor;
  return 1.0 - smoothstep( 0.0, ${STREAK_LINE.toFixed(3)}, texture( waterFoamTile, frame / ( FOAM_CELL * FOAM_TILE ) ).r );
}
float waterStreak( vec2 p, vec2 flow, float steepness, float foam ) {
  vec2 footprint = fwidth( p );
  float mask = smoothstep( ${STREAK_STEEP[0].toFixed(3)}, ${STREAK_STEEP[1].toFixed(3)}, steepness ) * smoothstep( ${STREAK_FOAM[0].toFixed(3)}, ${STREAK_FOAM[1].toFixed(3)}, foam )
    * ( 1.0 - smoothstep( 0.25, 1.0, max( footprint.x, footprint.y ) / FOAM_CELL ) );
  if ( mask <= 0.0 ) return 0.0;
  float a = fract( waterTime / FOAM_FLOW_PERIOD );
  float b = fract( a + 0.5 );
  float w = 1.0 - abs( 2.0 * a - 1.0 );
  vec2 pa = p - flow * a * FOAM_FLOW_PERIOD;
  vec2 pb = p - flow * b * FOAM_FLOW_PERIOD + vec2( 17.3, 5.9 ) * FOAM_CELL;
  vec2 cell = p / STREAK_ANCHOR - 0.5;
  vec2 base = floor( cell );
  vec2 s = smoothstep( 0.0, 1.0, cell - base );
  float lines = 0.0;
  for ( int k = 0; k < 4; k ++ ) {
    vec2 corner = vec2( float( k & 1 ), float( k >> 1 ) );
    vec2 anchor = ( base + corner + 0.5 ) * STREAK_ANCHOR;
    vec2 weights = mix( 1.0 - s, s, corner );
    vec2 along = waterStreakCurrent( anchor );
    lines += weights.x * weights.y * ( w * waterStreakLines( pa, anchor, along ) + ( 1.0 - w ) * waterStreakLines( pb, anchor, along ) );
  }
  return lines * mask;
}
`;
