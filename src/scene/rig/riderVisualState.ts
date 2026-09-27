import { Quaternion, Vector3 } from 'three';
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
  /** The duck-dive's press, 0–1 (the wipeout spec). */
  duck: number;
  /** The leash: its plug on the tail, and whether it is worn whole, snapped, or being reeled in. */
  readonly leash: { readonly plug: Vector3; worn: boolean; snapped: boolean; reeling: boolean };
  /** The fallen surfer: stroking, diving, head under. */
  readonly swim: { stroking: boolean; diving: boolean; under: boolean };
}

export function createRiderVisualState(): RiderVisualState {
  return {
    points: Array.from({ length: 7 }, () => new Vector3()),
    phase: 'prone',
    heading: 0,
    boardPosition: new Vector3(),
    boardQuaternion: new Quaternion(),
    stroking: 0,
    duck: 0,
    leash: { plug: new Vector3(), worn: true, snapped: false, reeling: false },
    swim: { stroking: false, diving: false, under: false },
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
  out.leash.plug.set(rider[RIDER_SNAPSHOT.plug], rider[RIDER_SNAPSHOT.plug + 1], rider[RIDER_SNAPSHOT.plug + 2]);
  const leash = rider[RIDER_SNAPSHOT.leash] ?? 0;
  out.leash.worn = (leash & LEASH_BITS.worn) !== 0;
  out.leash.snapped = (leash & LEASH_BITS.snapped) !== 0;
  out.leash.reeling = (leash & LEASH_BITS.reeling) !== 0;
  const swim = rider[RIDER_SNAPSHOT.swim] ?? 0;
  out.swim.stroking = (swim & SWIM_BITS.stroking) !== 0;
  out.swim.diving = (swim & SWIM_BITS.diving) !== 0;
  out.swim.under = (swim & SWIM_BITS.under) !== 0;
  return out;
}
