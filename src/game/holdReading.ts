import { Quaternion, Vector3 } from 'three';
import { buildBoardShape } from '../physics/boardShape';

/**
 * The physics grabs the board with the chest within GRAB_REACH, m, of its box
 * (`BoardRecovery`), and lets go of a held one once the chest is 2 m from the
 * grab's target 0.2 m over the board's centre: the page reads that off the
 * board's centre, with a margin (LET_GO).
 */
const GRAB_REACH = 1;
const LET_GO = 2.3;
const SHAPE = buildBoardShape();
const HALF = new Vector3(SHAPE.maxWidth / 2, Math.max(...SHAPE.patches.map((patch) => patch.thickness)) / 2, SHAPE.length / 2);

/** What the page knows of a frame for the hold (`HoldReading.update`). */
export interface HoldInput {
  /** The rider is in the water. */
  fallen: boolean;
  /** The pop-up key pressed or held this frame (the grab, and the reel). */
  asked: boolean;
  /** The Duck-dive action past half (diving lets go of a held board). */
  diving: boolean;
  /** The ride's status as last delivered: the board in reach (free, and near enough to grab); compared by identity. */
  status: { readonly boardInReach: boolean } | undefined;
  /** The drawn chest (the torso point), and the board's pose (its centre of mass and turn), in the world. */
  chest: Vector3;
  board: Vector3;
  turn: Quaternion;
}

const inverse = new Quaternion();
const local = new Vector3();

/** The chest's distance from the board's box (the physics' contact box about its centre of mass), m. */
export function boxGap(chest: Vector3, board: Vector3, turn: Quaternion): number {
  local.subVectors(chest, board).applyQuaternion(inverse.copy(turn).invert());
  const dx = Math.max(0, Math.abs(local.x) - HALF.x);
  const dy = Math.max(0, Math.abs(local.y) - HALF.y);
  const dz = Math.max(0, Math.abs(local.z) - HALF.z);
  return Math.hypot(dx, dy, dz);
}

/**
 * Whether the fallen surfer holds the board (the animation-realism plan's
 * phase 4: the climb's drawn stage), read on the page: the snapshot does not
 * carry the recovery's state. It follows `RideSession`'s own rule from what
 * the page asked and what it sees: the pop-up key with the chest within the
 * grab's reach of the board (the status shows the board in reach only while
 * the key is up: held, the physics grabs it that very step) takes it; the hold
 * lasts while fallen, and lets go diving, with the chest too far from the
 * board, or once a newer status finds the board free and in reach again. A
 * grab the physics refuses (the swimmer tumbling, out of control) reads as a
 * hold until one of those.
 */
export class HoldReading {
  holding = false;
  private grabbedOn: unknown;

  update(input: HoldInput): boolean {
    if (!input.fallen) {
      this.holding = false;
      return false;
    }
    if (!this.holding) {
      if (input.asked && (input.status?.boardInReach || boxGap(input.chest, input.board, input.turn) <= GRAB_REACH)) {
        this.holding = true;
        this.grabbedOn = input.status;
      }
      return this.holding;
    }
    const free = input.status !== this.grabbedOn && input.status?.boardInReach === true;
    if (input.diving || free || input.chest.distanceTo(input.board) > LET_GO) this.holding = false;
    return this.holding;
  }

  reset(): void {
    this.holding = false;
    this.grabbedOn = undefined;
  }
}
