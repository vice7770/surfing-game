import { smoothstep } from '../../wave/Bathymetry';

/** How far the foam lace is stretched along the current into streaks up a steep face (G8). */
export const STREAK_STRETCH = 7;
export const STREAK_OPACITY = 0.55;
/** The foam over which streaks fade in: the physics leaves 0.005–0.05 on its steep faces. */
const STREAK_FOAM = [0.005, 0.05] as const;
/** The surface slope over which streaks fade in: the practice faces peak near 0.5. */
const STREAK_STEEP = [0.25, 0.5] as const;
/** The lines' half-width in lace cells: about a tenth of the face is line. */
const STREAK_LINE = 0.12;

/**
 * A point (x, z), m, in the current's frame: (across, along / STREAK_STRETCH).
 * The current's direction is +z on still water.
 */
export function streakFrame(x: number, z: number, flowX: number, flowZ: number): [number, number] {
  const speed = Math.hypot(flowX, flowZ);
  const [dx, dz] = speed > 1e-3 ? [flowX / speed, flowZ / speed] : [0, 1];
  return [-x * dz + z * dx, (x * dx + z * dz) / STREAK_STRETCH];
}

/** Where streaks show: steep faces (surface slope) with some foam about. */
export function streakMask(steepness: number, foam: number): number {
  return smoothstep(STREAK_STEEP[0], STREAK_STEEP[1], steepness) * smoothstep(STREAK_FOAM[0], STREAK_FOAM[1], foam);
}

/**
 * GLSL: the foam lace's walls, stretched along the current and carried by it
 * in the lace's two flow-map phases, as thin lines up steep foamy faces.
 * Needs `foamPatternPars` and `waterTime`; fades out once a pixel spans a
 * lace cell (the tile has no mipmaps).
 */
export const waterStreakPars = /* glsl */ `
const float STREAK_STRETCH = ${STREAK_STRETCH.toFixed(3)};
const float STREAK_OPACITY = ${STREAK_OPACITY.toFixed(3)};
float waterStreakLines( vec2 p, vec2 flow ) {
  float speed = length( flow );
  vec2 along = speed > 1e-3 ? flow / speed : vec2( 0.0, 1.0 );
  vec2 frame = vec2( dot( p, vec2( -along.y, along.x ) ), dot( p, along ) / STREAK_STRETCH );
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
  float lines = w * waterStreakLines( p - flow * a * FOAM_FLOW_PERIOD, flow )
    + ( 1.0 - w ) * waterStreakLines( p - flow * b * FOAM_FLOW_PERIOD + vec2( 17.3, 5.9 ) * FOAM_CELL, flow );
  return STREAK_OPACITY * lines * mask;
}
`;
