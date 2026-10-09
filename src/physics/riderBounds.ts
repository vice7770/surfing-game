/**
 * The rider's bounds (the owner's 2026-10-09 playtest: "We could make the same wave, just limit the map access"): the
 * board, the rider on it and the fallen surfer stay inside the simulated window. Past each open side edge the tank's
 * water is drawn as its own mirror image (`EdgeBand`), but only the window is simulated; the rider is held a margin
 * inside it, softly: never moved, only slowed and drawn back.
 */

/**
 * The margin inside each side edge, past the tank's edge ramp, m: `OPEN_EDGE_RAMP` (20 m, where the solver levels the
 * bed toward the edges and the open edges' stencils reach) and one cell more. Inside it the bed and the waves are the
 * spot's own; in the ramp the bed is the solver's levelled stand-in, and at the edge the water is the mirror's.
 */
export function sideMargin(ramp: number, dx: number): number {
  return ramp + dx;
}

/**
 * The law (per axis, on how far the body is past the bounds, `depth`, and its speed outward):
 * - Inside the bounds, nothing.
 * - Past them, an outward speed is braked at `brakeRate` (per second) toward a slow return inward, `returnRate` metres per
 *   second per metre of depth: a paddler at 1.5 m/s goes about 1 m past and drifts back; a rider at 12 m/s, about 8 m.
 * - A body already heading in faster than that return is never pushed: the boundary only holds, it never throws.
 * - A paddler pushing on settles about a metre past (its stroke's 0.5 m/s² against 0.4 s⁻¹ × 1 s⁻¹ per metre), never
 *   near the edge: the side margin is 21 m.
 */
export const RIDER_BOUNDS = { returnRate: 0.4, brakeRate: 1 } as const;

/** The rectangle the rider is held in, m (world x along shore, z across it, toward the beach). */
export interface RiderBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

/**
 * The bounds for a tank: its side edges, its relaxation zone's inner edge offshore (beyond it the water is held to the
 * incoming sea, not simulated freely) and its shore, each with its margin, m.
 */
export function riderBounds(tank: { xMin: number; xMax: number; zoneInner: number; shore: number }, margins: { side: number; offshore: number; shore: number }): RiderBounds {
  return { xMin: tank.xMin + margins.side, xMax: tank.xMax - margins.side, zMin: tank.zoneInner + margins.offshore, zMax: tank.shore - margins.shore };
}

/** How far past the bounds a point lies, m (0 inside): the larger of its two axes'. */
export function boundsDepth(x: number, z: number, bounds: RiderBounds): number {
  return Math.max(0, bounds.xMin - x, x - bounds.xMax, bounds.zMin - z, z - bounds.zMax);
}

/** One axis: the velocity change toward the inside for a body `depth` m past a bound, moving `outward` m/s out. */
function axisPush(depth: number, outward: number, dt: number): number {
  if (!(depth > 0)) return 0;
  const target = -RIDER_BOUNDS.returnRate * depth;
  if (outward <= target) return 0;
  return -(outward - target) * (1 - Math.exp(-RIDER_BOUNDS.brakeRate * dt));
}

/**
 * The velocity change this step for a body at (x, z) moving (vx, vz), held by `bounds`: written to `out` (world x and z),
 * and the depth past the bounds returned. Positions are never touched.
 */
export function boundsPush(x: number, z: number, vx: number, vz: number, bounds: RiderBounds, dt: number, out: { x: number; z: number }): number {
  const pastLow = bounds.xMin - x;
  const pastHigh = x - bounds.xMax;
  // (`0 - push`, not `-push`: no −0 for a body left alone.)
  out.x = pastLow > 0 ? 0 - axisPush(pastLow, -vx, dt) : pastHigh > 0 ? axisPush(pastHigh, vx, dt) : 0;
  const pastOffshore = bounds.zMin - z;
  const pastShore = z - bounds.zMax;
  out.z = pastOffshore > 0 ? 0 - axisPush(pastOffshore, -vz, dt) : pastShore > 0 ? axisPush(pastShore, vz, dt) : 0;
  return boundsDepth(x, z, bounds);
}
