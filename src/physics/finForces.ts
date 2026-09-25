import { WATER } from './hullForces';

interface Vec { x: number; y: number; z: number }

/**
 * One fin: where it stands (its root at the bottom, `fromTail` ahead of the tail
 * and `fromRail` in from the rail on `side`, +1 the board's left and −1 its right,
 * or on the stringer when `side` is 0), how deep it reaches, its area, and its
 * toe-in (the leading edge turned toward the stringer).
 */
export interface FinSpec {
  name: string;
  side: -1 | 0 | 1;
  fromTail: number;
  fromRail: number;
  depth: number;
  area: number;
  toe: number;
}

/**
 * A thruster of typical modern fins (modelling values, not a measured set):
 * 0.0095 m², 0.115 m deep; side fins 0.28 m ahead of the tail, 3 cm in from the
 * rails, toed 3° in; the centre fin 0.09 m ahead of the tail.
 */
export const THRUSTER: readonly FinSpec[] = [
  { name: 'left', side: 1, fromTail: 0.28, fromRail: 0.03, depth: 0.115, area: 0.0095, toe: (3 * Math.PI) / 180 },
  { name: 'right', side: -1, fromTail: 0.28, fromRail: 0.03, depth: 0.115, area: 0.0095, toe: (3 * Math.PI) / 180 },
  { name: 'centre', side: 0, fromTail: 0.09, fromRail: 0, depth: 0.115, area: 0.0095, toe: 0 },
];

/**
 * Stall: attached lift gives way to flat-plate lift above FIN_STALL, over about
 * STALL_WIDTH. Falk et al. 2019 found separation above about 20° on a simplified
 * three-fin setup (not a universal angle); 18° is a modelling choice.
 */
export const FIN_STALL = (18 * Math.PI) / 180;
const STALL_WIDTH = (2 * Math.PI) / 180;
/**
 * Profile drag, span efficiency, and the post-stall flat-plate lift and drag
 * scales (C_L ≈ k sin 2α, C_D ≈ k sin² α). The post-stall lift is set well below
 * the attached peak (about 0.57 at 16°): separated flow that has also drawn air
 * down the fin loses grip, while its drag keeps rising.
 */
const PROFILE_DRAG = 0.012;
const SPAN_EFFICIENCY = 0.8;
const POST_STALL_LIFT = 0.35;
const POST_STALL_DRAG = 1.3;

/** Helmbold's lift slope for a low aspect ratio foil, per radian. */
export function liftSlope(aspectRatio: number): number {
  return (2 * Math.PI * aspectRatio) / (2 + Math.sqrt(aspectRatio * aspectRatio + 4));
}

export interface FinForce {
  /** Board frame, N. */
  force: Vec;
  lift: number;
  drag: number;
  /** Angle between the chord and the flow past the fin, rad. */
  attack: number;
  /** −∂(force · fin normal)/∂(sideways speed), N·s/m, for the implicit solve. */
  damping: number;
  /** The fin's normal in the board frame (its sideways direction). */
  normal: Vec;
}

export function createFinForce(): FinForce {
  return { force: { x: 0, y: 0, z: 0 }, lift: 0, drag: 0, attack: 0, damping: 0, normal: { x: 1, y: 0, z: 0 } };
}

/** Lift and drag coefficients at attack α, blending attached flow into the post-stall flat plate. */
function coefficients(attack: number, slope: number, aspectRatio: number, forward: boolean): { lift: number; drag: number } {
  const attached = forward ? 1 / (1 + Math.exp((Math.abs(attack) - FIN_STALL) / STALL_WIDTH)) : 0;
  const liftAttached = slope * attack;
  const lift = attached * liftAttached + (1 - attached) * POST_STALL_LIFT * Math.sin(2 * attack);
  const drag = PROFILE_DRAG + attached * ((liftAttached * liftAttached) / (Math.PI * aspectRatio * SPAN_EFFICIENCY))
    + (1 - attached) * POST_STALL_DRAG * Math.sin(attack) * Math.sin(attack);
  return { lift, drag };
}

/** In-plane force on the fin (board frame x and z), from its velocity relative to the water. */
function planeForce(spec: FinSpec, ux: number, uz: number, immersed: number, out: FinForce): void {
  const toe = -spec.side * spec.toe;
  const cx = Math.sin(toe);
  const cz = Math.cos(toe);
  const nx = cz;
  const nz = -cx;
  const along = ux * cx + uz * cz;
  const across = ux * nx + uz * nz;
  const speed = Math.hypot(along, across);
  out.normal.x = nx;
  out.normal.y = 0;
  out.normal.z = nz;
  out.force.x = 0;
  out.force.y = 0;
  out.force.z = 0;
  out.lift = 0;
  out.drag = 0;
  out.attack = 0;
  if (!(speed > 0) || !(immersed > 0)) return;
  // Moving backward, the fin is a flat plate whichever way the flow meets it.
  const forward = along >= 0;
  const attack = forward ? Math.atan2(across, along) : Math.atan2(across, -along);
  const aspectRatio = (spec.depth * spec.depth) / spec.area;
  const { lift, drag } = coefficients(attack, liftSlope(aspectRatio), aspectRatio, forward);
  const load = 0.5 * WATER.density * spec.area * immersed * speed * speed;
  out.attack = attack;
  out.lift = load * Math.abs(lift);
  out.drag = load * drag;
  // Drag opposes the fin's motion through the water; lift acts across it, against the slip.
  const dx = ux / speed;
  const dz = uz / speed;
  const px = (along * nx - across * cx) / speed;
  const pz = (along * nz - across * cz) / speed;
  const sign = forward ? 1 : -1;
  out.force.x = -load * (drag * dx + sign * lift * px);
  out.force.z = -load * (drag * dz + sign * lift * pz);
}

const SLOPE_STEP = 1e-4;

/**
 * The water's force on one fin moving at `relative` (board frame, the fin's
 * velocity minus the water's at its depth) with `immersed` of its span in the
 * water: lift across the flow against the slip, and drag along it.
 */
export function finForce(spec: FinSpec, relative: Vec, immersed: number, out: FinForce): FinForce {
  planeForce(spec, relative.x, relative.z, immersed, out);
  out.damping = 0;
  if (!(immersed > 0)) return out;
  // The sideways slope, by central difference along the fin normal.
  const { x: nx, z: nz } = out.normal;
  const fx = out.force.x;
  const fz = out.force.z;
  const { lift, drag, attack } = out;
  planeForce(spec, relative.x + SLOPE_STEP * nx, relative.z + SLOPE_STEP * nz, immersed, out);
  const plus = out.force.x * nx + out.force.z * nz;
  planeForce(spec, relative.x - SLOPE_STEP * nx, relative.z - SLOPE_STEP * nz, immersed, out);
  const minus = out.force.x * nx + out.force.z * nz;
  out.damping = Math.max(0, -(plus - minus) / (2 * SLOPE_STEP));
  out.force.x = fx;
  out.force.z = fz;
  out.lift = lift;
  out.drag = drag;
  out.attack = attack;
  return out;
}
