import { Quaternion, Vector3 } from 'three';
import { RIDER_PHASES, RIDER_SNAPSHOT } from '../../wave/SurfZoneRunner';

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
  /** How the board moves (`RiderMotion`, Part B): its turn rate, rad/s (positive as the heading grows), where it travels (horizontal, unit), how fast, m/s, and its climb, m/s. */
  yawRate: number;
  readonly travel: Vector3;
  speed: number;
  climb: number;
  /**
   * How far the body has come into its upright pose (from the landing) and its
   * standing cues (from standing), 0–1 (`RiderMotion`); 1 for a state built
   * without motion (the dev sheet, tests).
   */
  uprightBlend: number;
  standingBlend: number;
}

export function createRiderVisualState(): RiderVisualState {
  return {
    points: Array.from({ length: 7 }, () => new Vector3()),
    phase: 'prone',
    heading: 0,
    boardPosition: new Vector3(),
    boardQuaternion: new Quaternion(),
    stroking: 0,
    yawRate: 0,
    travel: new Vector3(0, 0, 1),
    speed: 0,
    climb: 0,
    uprightBlend: 1,
    standingBlend: 1,
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
  return out;
}
