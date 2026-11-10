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
/**
 * The drawing's dev switches, set once by the page (`PhysicalMode`): every rider drawn on this page reads them alike,
 * the player's and other players'. `snapArms: 'old'` (`?snapArms=old`): Snap drawn as before snap-carve (its arms, and
 * the tube's pose for a deep Snap: `HumanoidRig`'s `RIG_DETAIL.snapArms`, `StageBlend`'s tube).
 */
export const RIG_SWITCHES: RigSwitches = {};
/**
 * `snapArms: 'old'` as above. The turning body (2026-11-10, the owner's "the movement of the surfer is very off"; the
 * study in docs/research/turn-body-2026-11-10), each opt-in and drawn only:
 * - `turnTrunk: 'lean'` (`?turnTrunk=lean`): in a turn the trunk leans with the physics' lean line, not folded over the toes.
 * - `turnLead: 'on'` (`?turnLead=on`): the stick (`RiderVisualState.steer`) turns the head, then the chest, then the hips,
 *   and starts the turn's pose, before the board comes round. Another player's stick is not on the wire (0): as before.
 * - `cutbackHand: 'back'` (`?cutbackHand=back`): in a frontside cutback the back hand reaches for the water, the front arm
 *   points where the board goes.
 * `?turnBody=on` sets all three (`turnBodySwitches`).
 */
export interface RigSwitches { snapArms?: 'old'; turnTrunk?: 'lean'; turnLead?: 'on'; cutbackHand?: 'back' }

/** The turning body's switches from a page's address (`RIG_SWITCHES`); `enabled` false (the dev tools off), none. */
export function turnBodySwitches(search: string, enabled = true): Pick<RigSwitches, 'turnTrunk' | 'turnLead' | 'cutbackHand'> {
  if (!enabled) return {};
  const params = new URLSearchParams(search);
  const is = (name: string, value: string) => params.get(name)?.trim().toLowerCase() === value;
  const all = is('turnBody', 'on');
  return {
    ...(all || is('turnTrunk', 'lean') ? { turnTrunk: 'lean' as const } : {}),
    ...(all || is('turnLead', 'on') ? { turnLead: 'on' as const } : {}),
    ...(all || is('cutbackHand', 'back') ? { cutbackHand: 'back' as const } : {}),
  };
}
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

/**
 * How far into Snap the drawn state is, 0 to 1 (snap-carve): the weight back (`weightBack`) with the shoulders wound
 * (`state.twist`, Snap's aim, full at SNAP_TWIST, TWIST_RANGE). Either alone is not Snap: a tube's backside crouch sits
 * the pelvis back on a pitched board, and the pad's rotation stick winds the shoulders.
 */
export function snapShare(state: RiderVisualState): number {
  // Snap held where the drawing knows it (snap-arms-gate): Compress alone is no Snap, however far back and wound.
  if (state.snap === 0) return 0;
  return weightBack(state) * Math.min(1, Math.abs(state.twist) / SNAP_TWIST);
}
const SNAP_TWIST = (45 * Math.PI) / 180;

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
