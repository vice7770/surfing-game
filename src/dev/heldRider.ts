import { Vector3 } from 'three';
import { AttachedRider, type AttachedRiderOptions } from '../physics/AttachedRider';
import type { BoardBody } from '../physics/BoardBody';
import type { BoardShape } from '../physics/boardShape';

const STANDING_UNKNOWNS = 8;
const BANK = 7;

/**
 * A lab rider (turn redesign, Task 3a) whose bank is held, so the carve lab can
 * measure the board's own roll and turn: standing, the body is bolted on at the
 * bank it has (carried as the upright body was before the redesign, whatever
 * the feet could hold), and the board takes `rollCouple`, N·m, about its roll
 * axis along the heading (positive rolling its +x rail down) in place of the
 * ankle's.
 */
export class HeldRider extends AttachedRider {
  rollCouple = 0;
  /** Off, it rides as any rider, balance and all (to bank it before holding it). */
  holding = true;
  private readonly heldAxis = new Vector3();

  constructor(shape: BoardShape, options: AttachedRiderOptions = {}) {
    super(shape, { phase: 'standing', ...options });
  }

  override coupleStanding(system: Float64Array, rhs: Float64Array, h: number): void {
    super.coupleStanding(system, rhs, h);
    if (!this.holding) return;
    // The body's frame turns about the heading's forward to bank, so its forward is the heading's.
    this.heldAxis.set(0, 0, -1).applyQuaternion(this.orientation);
    // Hold the bank: carried over the substep, the body banks by the board's change of roll, r · Δω, and by
    // its own speed across the leg over the leg's length; their sum after the solve is set to nothing.
    for (let j = 0; j < STANDING_UNKNOWNS; j += 1) system[BANK * STANDING_UNKNOWNS + j] = 0;
    const length = Math.max(0.4, this.leg.height + this.leg.extension);
    system[BANK * STANDING_UNKNOWNS + BANK] = 1 / length;
    system[BANK * STANDING_UNKNOWNS + 3] = this.heldAxis.x;
    system[BANK * STANDING_UNKNOWNS + 4] = this.heldAxis.y;
    system[BANK * STANDING_UNKNOWNS + 5] = this.heldAxis.z;
    rhs[BANK] = -this.bank.rate;
    rhs[3] += h * this.rollCouple * this.heldAxis.x;
    rhs[4] += h * this.rollCouple * this.heldAxis.y;
    rhs[5] += h * this.rollCouple * this.heldAxis.z;
  }

  override settleStanding(x: Float64Array, h: number, board: BoardBody): boolean {
    const feasible = super.settleStanding(x, h, board);
    if (!this.holding) return feasible;
    this.feasible = true;
    return true;
  }
}

/** A tow that keeps the board and its rider at `speed` along the board's heading, leaving the rest of their motion free. */
export function towAlongHeading(board: BoardBody, rider: AttachedRider, speed: number): void {
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0);
  if (forward.lengthSq() < 1e-9) return;
  forward.normalize();
  board.velocity.addScaledVector(forward, speed - board.velocity.dot(forward));
  rider.velocity.addScaledVector(forward, speed - rider.velocity.dot(forward));
}
