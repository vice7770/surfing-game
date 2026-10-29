import { Quaternion, Vector3 } from 'three';
import type { RiderSeparation } from '../../physics/AttachedRider';
import type { StanceName } from '../../physics/riderPosture';
import { LEASH_BITS, RIDER_PHASES, RIDER_SNAPSHOT, SWIM_BITS } from '../../wave/SurfZoneRunner';

export type RiderPhase = (typeof RIDER_PHASES)[number];

/** The snapshot's point order: trunk centres, then hand and foot tips (limb centres once fallen). */
export const POINT = { pelvis: 0, torso: 1, head: 2, leftHand: 3, rightHand: 4, leftFoot: 5, rightFoot: 6 } as const;

/** What the drawn rider is solved from: the physics' seven points, phase and heading, and the board's pose. */
export interface RiderVisualState {
  readonly points: readonly Vector3[];
  phase: RiderPhase;
  heading: number;
  readonly boardPosition: Vector3;
  readonly boardQuaternion: Quaternion;
  /** 0–1: how hard the hands are pulling, which cups them. */
  stroking: number;
  /**
   * The take-off cue (the snapshot's `cue`: lying, the board planing down a face,
   * or the take-off window): the catch's trigger (the animation-realism plan,
   * §6). Local only: it is not on the wire, so another player's catch is read
   * from its board's speed and pitch.
   */
  cue: boolean;
  /** How the board moves (`RiderMotion`, Part B): its turn rate, rad/s (positive as the heading grows), where it travels (horizontal, unit), how fast, m/s, and its climb, m/s. */
  yawRate: number;
  readonly travel: Vector3;
  speed: number;
  climb: number;
  /**
   * Standing, how fast the body leans across the board, rad/s (positive toward
   * its left, the way a turn grows the heading): the drawn pelvis over the feet,
   * read over sea time by `RiderMotion` as the turn rate is, so another player's
   * body reads it alike. 0 in any other phase.
   */
  leanRate: number;
  /**
   * How far the body has come into its upright pose (from the landing) and its
   * standing cues (from standing), 0–1 (`RiderMotion`); 1 for a state built
   * without motion (the dev sheet, tests).
   */
  uprightBlend: number;
  standingBlend: number;
  /** The duck-dive's press, 0–1 (the wipeout spec). */
  duck: number;
  /**
   * The leash: its plug on the tail, and whether it is worn whole, snapped, or
   * being reeled in. Reeling, the drawn hand on the cord this frame (`grip`,
   * the rig's: hand over hand, the animation-realism plan's phase 4) and
   * whether the rig drew one (`gripped`): the cord is drawn from it.
   */
  readonly leash: { readonly plug: Vector3; worn: boolean; snapped: boolean; reeling: boolean; readonly grip: Vector3; gripped: boolean };
  /**
   * The fallen surfer: stroking, diving, head under, and holding the board (the
   * recovery's grab: turning it deck-up, then pulling the body on). The snapshot
   * does not carry the hold: the page reads it from what it asked and what the
   * ride's status says (`HoldReading`), another player's from the pose's
   * recovering flag (wire flag 128) with the swimmer by the board. `climbing`: on the board again, still climbing on
   * from the water (the snapshot's bit; local only).
   */
  readonly swim: { stroking: boolean; diving: boolean; under: boolean; holding: boolean; climbing: boolean };
  /**
   * Why the rider fell, as the session named it (`RideSession.separation`:
   * balance, foot slip, lost board, impact, reef): the drawn fall's shape reads
   * it (the animation-realism plan's §7). Local only: it is not on the wire, so
   * another player's fall is read from its motion. Undefined riding, or unknown.
   */
  separation: RiderSeparation | undefined;
  /** The rider's stance where the drawing knows it (the player's own setting); undefined, the rig reads it from the feet. */
  stance: StanceName | undefined;
  /** A running clock, s, for the code-driven cycles (the swimmer's crawl and kick). */
  clock: number;
  /** The breath held, 1 full to 0 (Part B): short of it, the swimmer's stroke quickens. */
  breath: number;
  /** Standing, the upper body's twist asked for by the pad, rad about the up, as `yawRate` turns (the movement-flow spec); 0 without. */
  twist: number;
  /**
   * Upright, the weight the rider feels: the front foot's share of the load
   * (0 the back foot, 1 the front), smoothed over 0.3 s (the physics'
   * `contact.weight`; the phase-5 physics plan's W1). The stance gauge reads it as
   * the weight. NaN where unknown: not upright, or another player's (it is not on
   * the wire, and nothing drawn reads it).
   */
  weight: number;
}

export function createRiderVisualState(): RiderVisualState {
  return {
    points: Array.from({ length: 7 }, () => new Vector3()),
    phase: 'prone',
    heading: 0,
    boardPosition: new Vector3(),
    boardQuaternion: new Quaternion(),
    stroking: 0,
    cue: false,
    yawRate: 0,
    leanRate: 0,
    travel: new Vector3(0, 0, 1),
    speed: 0,
    climb: 0,
    uprightBlend: 1,
    standingBlend: 1,
    duck: 0,
    leash: { plug: new Vector3(), worn: true, snapped: false, reeling: false, grip: new Vector3(), gripped: false },
    swim: { stroking: false, diving: false, under: false, holding: false, climbing: false },
    separation: undefined,
    stance: undefined,
    clock: 0,
    breath: 1,
    twist: 0,
    weight: Number.NaN,
  };
}

/** Fills `out` from a snapshot's rider array (`RIDER_SNAPSHOT`) and board pose (position, then quaternion x y z w). */
export function readRiderSnapshot(rider: ArrayLike<number>, board: ArrayLike<number>, out: RiderVisualState): RiderVisualState {
  out.points.forEach((point, i) => point.set(
    rider[RIDER_SNAPSHOT.points + i * 3], rider[RIDER_SNAPSHOT.points + i * 3 + 1], rider[RIDER_SNAPSHOT.points + i * 3 + 2],
  ));
  out.phase = RIDER_PHASES[Math.round(rider[RIDER_SNAPSHOT.phase])] ?? 'prone';
  out.heading = rider[RIDER_SNAPSHOT.heading];
  out.boardPosition.set(board[0], board[1], board[2]);
  out.boardQuaternion.set(board[3], board[4], board[5], board[6]);
  out.duck = rider[RIDER_SNAPSHOT.duck] ?? 0;
  out.cue = (rider[RIDER_SNAPSHOT.cue] ?? 0) > 0.5;
  out.leash.plug.set(rider[RIDER_SNAPSHOT.plug], rider[RIDER_SNAPSHOT.plug + 1], rider[RIDER_SNAPSHOT.plug + 2]);
  const leash = rider[RIDER_SNAPSHOT.leash] ?? 0;
  out.leash.worn = (leash & LEASH_BITS.worn) !== 0;
  out.leash.snapped = (leash & LEASH_BITS.snapped) !== 0;
  out.leash.reeling = (leash & LEASH_BITS.reeling) !== 0;
  out.leash.gripped = false;
  out.breath = rider[RIDER_SNAPSHOT.breath] ?? 1;
  out.twist = rider[RIDER_SNAPSHOT.twist] ?? 0;
  out.weight = rider[RIDER_SNAPSHOT.weight] ?? Number.NaN;
  const swim = rider[RIDER_SNAPSHOT.swim] ?? 0;
  out.swim.stroking = (swim & SWIM_BITS.stroking) !== 0;
  out.swim.diving = (swim & SWIM_BITS.diving) !== 0;
  out.swim.under = (swim & SWIM_BITS.under) !== 0;
  out.swim.climbing = (swim & SWIM_BITS.climbing) !== 0;
  // Not in the snapshot: whoever draws sets them after (the page, from its status and input; a remote pose's flag).
  out.swim.holding = false;
  out.separation = undefined;
  return out;
}
