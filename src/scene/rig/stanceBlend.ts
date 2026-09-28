import { Quaternion, Vector3 } from 'three';
import { CROUCH_DEPTH } from '../../physics/AttachedRider';
import type { StanceName } from '../../physics/riderPosture';
import { STANDING_PELVIS, pelvisOverDeck } from './posturePoints';
import { POINT, type RiderVisualState } from './riderVisualState';

/**
 * The weight goes onto the back foot as the pelvis, level, sits from SNAP_FROM
 * to SNAP_FULL of the stance behind its middle (the snap; the top-turn plan):
 * the body rides upright, so riding level it sits over the middle, with the
 * weight fully back (S) 31 % behind, and climbing the face nose-up it sits
 * back over the tail whatever the weight (read along the pitched board).
 */
export const SNAP_FROM = -0.05;
export const SNAP_FULL = -0.3;
/** A turn this fast, rad/s, is a full one for the stance's shapes (Part B's leading arm). */
export const TURN_FULL = 1.5;

/** What the stance's shape follows in the physics' state (the riding-body plan, step 3). */
export interface StanceBlend {
  /** Regular (the left foot forward) or Goofy, read from the feet. */
  stance: StanceName;
  /** How deep the crouch is: 0 standing tall, 1 at its full depth (Compress's). */
  depth: number;
  /** How hard the board turns, −1 to 1: + onto the toes' rail (frontside), − onto the heels'. */
  turn: number;
  /** How far the weight is back, 0 to 1 (the snap). */
  back: number;
}

const inverse = new Quaternion();
const forward = new Vector3();
const scratch = new Vector3();

/** The stance's blend from the physics' drawn state: its crouch, its turn and its weight. */
export function stanceBlend(state: RiderVisualState, out: StanceBlend = { stance: 'regular', depth: 0, turn: 0, back: 0 }): StanceBlend {
  const p = state.points;
  inverse.copy(state.boardQuaternion).invert();
  const along = (point: Vector3) => scratch.copy(point).sub(state.boardPosition).applyQuaternion(inverse).z;
  out.stance = along(p[POINT.leftFoot]) >= along(p[POINT.rightFoot]) ? 'regular' : 'goofy';
  out.depth = Math.max(0, Math.min(1, (STANDING_PELVIS - pelvisOverDeck(state)) / CROUCH_DEPTH));
  // Regular faces the −x rail: turning onto the toes swings the nose toward −x, the heading falling.
  const toes = out.stance === 'regular' ? -1 : 1;
  out.turn = Math.max(-1, Math.min(1, (toes * state.yawRate) / TURN_FULL));
  out.back = weightBack(state);
  return out;
}

/** How far the weight is back, 0 to 1: where the pelvis sits over the stance, level. */
export function weightBack(state: RiderVisualState): number {
  const p = state.points;
  forward.set(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0);
  if (forward.lengthSq() < 1e-8) return 0;
  forward.normalize();
  const left = p[POINT.leftFoot].dot(forward);
  const right = p[POINT.rightFoot].dot(forward);
  const span = Math.abs(left - right);
  if (span < 1e-3) return 0;
  const ahead = (p[POINT.pelvis].dot(forward) - (left + right) / 2) / span;
  return Math.max(0, Math.min(1, (SNAP_FROM - ahead) / (SNAP_FROM - SNAP_FULL)));
}
