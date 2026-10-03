import { smoothstep } from '../../wave/Bathymetry';
import { pcg2d } from '../foamPattern';
import { FOAM_EDGE, FOAM_FADE, FOAM_HEX_POWER, FOAM_OCTAVES, foamQuantile, foamTurnedSample, hexCorners } from './churnTexture';

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
 * The streaks' edge is this many sigma of the field wider per metre of the pixel's reach across the lines: half the late
 * stage's gradient at a threshold crossing, 69 sigma a metre at the median across the stretch (the test measures it), so
 * a ramp is about a pixel wide. The reach is the footprint across the lines, or along them over the stretch if that is
 * more: seen at a grazing angle, lines that run away from the eye stay sharp and those across it soften, where the
 * footprint's longest side once blurred them all into translucent ribbons. (The foam field reads its gradient off the
 * derivatives; the streaks' branch hides them.)
 */
export const STREAK_EDGE_SLOPE = 35;
/** Where the second flow-map phase is shifted, m, so the two phases never sample alike (not a multiple of the tile). */
const STREAK_PHASE = [1.11, 1.89] as const;
/**
 * The streaks turn with the current about anchors this far apart, m: the corners of a triangular lattice (tiled
 * directional flow), so a turn of the current moves the lines by its angle times a few metres, not times the distance to
 * the world's origin, where they would swim with every wave. Each anchor turns its lines to the current where they are
 * drawn, not to its own, so between anchors whose currents differ the lines of both still run together, along the
 * current, and never cross in a hatch.
 */
export const STREAK_ANCHOR = 6;
/**
 * Each anchor draws its own lines: the late stage turned and shifted by a hash of its lattice index (past this offset; the
 * foam field's corners take 1024), as the field's hex corners are, so no two anchors read the same texels and none repeats
 * the 3 m tile across its own 6 m. The second flow-map phase reads the anchor's hash xor `STREAK_PHASE_HASH`.
 */
const STREAK_SALT = 4096;
const STREAK_PHASE_HASH = 0x5bd1e995;

export interface StreakAnchor {
  x: number;
  z: number;
  /** Its share of the point, summing to 1 over the three. */
  weight: number;
  /** The hash that turns and shifts its lines. */
  hash: [number, number];
}

/**
 * The three anchors around (x, z): the corners of the triangle of the lattice of edge `STREAK_ANCHOR` that holds it, each
 * weighted by its barycentric weight cubed and normalised to sum 1, as the foam field's hex corners (`FOAM_HEX_POWER`).
 */
export function streakAnchors(x: number, z: number): StreakAnchor[] {
  const corners = hexCorners(x / STREAK_ANCHOR, z / STREAK_ANCHOR);
  const powered = corners.map(({ weight }) => weight ** FOAM_HEX_POWER);
  const total = powered[0] + powered[1] + powered[2];
  return corners.map(({ corner: [i, j] }, index) => ({
    x: (i + 0.5 * j) * STREAK_ANCHOR,
    z: 0.8660254038 * j * STREAK_ANCHOR,
    weight: powered[index] / total,
    hash: pcg2d((i + STREAK_SALT) >>> 0, (j + STREAK_SALT) >>> 0),
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
 * How far a pixel reaches across the streak lines, m, for their edge (`STREAK_EDGE_SLOPE`): its footprint (the world x and
 * z it spans) across the current, or along it over the stretch if that is more. The shader's `reach`.
 */
export function streakReach(flowX: number, flowZ: number, footprintX: number, footprintZ: number): number {
  const speed = Math.hypot(flowX, flowZ);
  const [alongX, alongZ] = speed > 1e-3 ? [flowX / speed, flowZ / speed] : [0, 1];
  return Math.max(Math.abs(alongZ) * footprintX + Math.abs(alongX) * footprintZ, (Math.abs(alongX) * footprintX + Math.abs(alongZ) * footprintZ) / STREAK_STRETCH);
}

/** A component's share below which it is left out: its threshold would sit past the texture's 4 sigma. */
const STREAK_LEAST = 1e-4;

/**
 * CPU mirror of `waterStreak`: the share of the pixel at (x, z), m, that is streak, given the current (`flowAt`, m/s),
 * the surface's slope and foam there, the clock and the pixel's footprint. Each of the three anchors' two flow-map
 * phases is the foam field's late stage in the frame of the current there, turned about the anchor, its own turn and
 * shift. They are combined by
 * their union before any threshold: a component that weighs w is drawn where it passes the value that leaves (1 − F)^w
 * of it below, so the six together cover F = `STREAK_COVER` of the face, and none is blended with another. (Blended,
 * two independent sets of thin lines threshold to beads; the union keeps each a line, only thinner where it weighs less.)
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
  const pa: [number, number] = [x - flowX * a * period, z - flowZ * a * period];
  const pb: [number, number] = [x - flowX * b * period + STREAK_PHASE[0], z - flowZ * b * period + STREAK_PHASE[1]];
  const keep = Math.log(1 - STREAK_COVER);
  let best = -8;
  for (const anchor of streakAnchors(x, z)) {
    const phases: [[number, number], number, [number, number]][] = [
      [pa, w, anchor.hash],
      [pb, 1 - w, [(anchor.hash[0] ^ STREAK_PHASE_HASH) >>> 0, (anchor.hash[1] ^ STREAK_PHASE_HASH) >>> 0]],
    ];
    for (const [p, phase, hash] of phases) {
      const weight = anchor.weight * phase;
      if (weight <= STREAK_LEAST) continue;
      const [u, v] = streakFrame(p[0], p[1], flowX, flowZ, anchor.x, anchor.z);
      best = Math.max(best, foamTurnedSample(u / STREAK_TILE, v / STREAK_TILE, hash[0], hash[1], 3) - foamQuantile(Math.exp(weight * keep)));
    }
  }
  const width = Math.min(1, FOAM_EDGE + STREAK_EDGE_SLOPE * streakReach(flowX, flowZ, footprint, footprint));
  return smoothstep(-width, width, best) * mask;
}

/**
 * GLSL: the foam field's late stage (lace and threads), stretched along the current and carried by it in the lace's
 * two flow-map phases, thresholded for a tenth of the face, as thin lines up steep foamy faces. Each of the three anchors
 * around a pixel turns them about itself to the current at the pixel and draws its own (`STREAK_SALT`); their six
 * samples are combined by their union, each thresholded for its weight. Returns the lines' coverage: how faint a streak
 * is belongs to the foam layer's reflectance (a bubble monolayer, 0.10), no longer to a hand opacity of 0.55. Needs
 * `foamPatternPars` and `waterTime`, and, defined after it, `waterStreakField`, `waterFoamPcg` and `waterFoamQuantile`
 * of `waterChurnPars` (the water's program lists the streaks first, so this declares the functions it calls and that one
 * defines them).
 */
export const waterStreakPars = /* glsl */ `
const float STREAK_STRETCH = ${STREAK_STRETCH.toFixed(3)};
const float STREAK_ANCHOR = ${STREAK_ANCHOR.toFixed(3)};
const float STREAK_TILE = ${STREAK_TILE.toFixed(3)};
const int STREAK_SALT = ${STREAK_SALT};
float waterStreakField( vec2 frame, vec2 dx, vec2 dy, uvec2 h );
uvec2 waterFoamPcg( uvec2 v );
float waterFoamQuantile( float p );
float waterStreakGauss( vec2 q, vec2 anchor, vec2 along, vec2 dpdx, vec2 dpdy, uvec2 h ) {
  vec2 across = vec2( -along.y, along.x );
  vec2 local = q - anchor;
  vec2 frame = vec2( dot( local, across ), dot( local, along ) / STREAK_STRETCH ) + anchor;
  vec2 fdx = vec2( dot( dpdx, across ), dot( dpdx, along ) / STREAK_STRETCH );
  vec2 fdy = vec2( dot( dpdy, across ), dot( dpdy, along ) / STREAK_STRETCH );
  return waterStreakField( frame / STREAK_TILE, fdx / STREAK_TILE, fdy / STREAK_TILE, h );
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
  // The anchors: the corners of the triangle of the lattice of edge STREAK_ANCHOR holding p, weighted as hex corners.
  vec2 q = p / STREAK_ANCHOR;
  vec2 s = vec2( q.x - q.y * 0.5773502692, q.y * 1.1547005384 );
  vec2 cell = floor( s );
  vec2 f = s - cell;
  float up = step( 1.0, f.x + f.y );
  vec3 weights = mix( vec3( 1.0 - f.x - f.y, f.x, f.y ), vec3( f.x + f.y - 1.0, 1.0 - f.y, 1.0 - f.x ), up );
  weights = weights * weights * weights;
  weights /= weights.x + weights.y + weights.z;
  float keep = log( ${(1 - STREAK_COVER).toFixed(4)} );
  float speed = length( flow );
  vec2 along = speed > 1e-3 ? flow / speed : vec2( 0.0, 1.0 );
  float best = -8.0;
  for ( int k = 0; k < 3; k ++ ) {
    vec2 corner = cell + ( k == 0 ? vec2( up ) : ( k == 1 ? vec2( 1.0, 0.0 ) : vec2( 0.0, 1.0 ) ) );
    float weight = k == 0 ? weights.x : ( k == 1 ? weights.y : weights.z );
    vec2 anchor = vec2( corner.x + 0.5 * corner.y, 0.8660254038 * corner.y ) * STREAK_ANCHOR;
    uvec2 h = waterFoamPcg( uvec2( ivec2( corner ) + STREAK_SALT ) );
    if ( weight * w > ${STREAK_LEAST.toExponential(0)} ) best = max( best, waterStreakGauss( pa, anchor, along, dpdx, dpdy, h ) - waterFoamQuantile( exp( weight * w * keep ) ) );
    if ( weight * ( 1.0 - w ) > ${STREAK_LEAST.toExponential(0)} ) best = max( best, waterStreakGauss( pb, anchor, along, dpdx, dpdy, h ^ uvec2( ${STREAK_PHASE_HASH}u ) ) - waterFoamQuantile( exp( weight * ( 1.0 - w ) * keep ) ) );
  }
  // The pixel's reach across the lines, and along them shrunk by the stretch: what the lines' field changes by across it.
  float reach = max( abs( along.y ) * footprint.x + abs( along.x ) * footprint.y, ( abs( along.x ) * footprint.x + abs( along.y ) * footprint.y ) / STREAK_STRETCH );
  float width = min( 1.0, ${FOAM_EDGE.toFixed(3)} + ${STREAK_EDGE_SLOPE.toFixed(3)} * reach );
  return smoothstep( -width, width, best ) * mask;
}
`;
