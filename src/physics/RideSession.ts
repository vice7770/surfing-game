import { Quaternion, Vector3 } from 'three';
import { AttachedRider, type RiderPhase, type RiderSeparation } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { DetachedSurfer } from './DetachedSurfer';
import type { StanceName } from './riderPosture';
import type { SurfWater } from './SurfWater';
import { SurfWaterBodyField } from './SurfWaterBodyField';

/** What the player asks for in one step. */
export interface RideInput {
  paddle: boolean;
  popUp: boolean;
  /** −1 (right) to 1 (left). Lying down it turns the swimmer; standing it shifts weight onto a rail. */
  steer: number;
}

export interface RideSessionOptions {
  stance?: StanceName;
}

const Y = new Vector3(0, 1, 0);

/**
 * One board and its rider through a ride and its aftermath (board plan B2, surfer
 * plan S1): the board carries the attached rider; when the rider lets go, the
 * detached surfer starts from the rider's own centre of mass, velocity and spin
 * and moves on the same water, striking the board through its contact seam.
 * Order in a step: the board and attached rider (sample, solve, react), then the
 * detached surfer (sample, integrate, board contact).
 */
export class RideSession {
  readonly board = new BoardBody();
  readonly rider: AttachedRider;
  readonly surfer = new DetachedSurfer();
  /** The state the fall body started from, at the latest separation. */
  readonly handoff = { center: new Vector3(), orientation: new Quaternion(), velocity: new Vector3(), angularVelocity: new Vector3() };
  /** The fall body's linear momentum and centre of mass as it started, for continuity checks. */
  readonly started = { momentum: new Vector3(), center: new Vector3() };
  private field?: SurfWaterBodyField;
  private fieldWater?: SurfWater;

  constructor(options: RideSessionOptions = {}) {
    this.rider = new AttachedRider(this.board.shape, { stance: options.stance });
  }

  get phase(): RiderPhase | 'fallen' {
    return this.rider.attached ? this.rider.phase : 'fallen';
  }

  get separation(): RiderSeparation | undefined {
    return this.rider.attached ? undefined : this.rider.separation;
  }

  /** Lie prone on a level board floating at the surface over (x, z), nose along `heading` (radians from +z toward +x). */
  reset(at: Vector3, heading: number, water: SurfWater): void {
    const orientation = new Quaternion().setFromAxisAngle(Y, heading);
    const surface = water.surfaceAt(at.x, at.z);
    this.board.place(new Vector3(at.x, surface + this.board.shape.centerOfMass.y - 0.05, at.z), orientation);
    this.rider.phase = 'prone';
    this.board.attach(this.rider);
    this.surfer.active = false;
  }

  /** Let the rider go now, into the water. */
  separate(cause: RiderSeparation = 'balance'): void {
    this.rider.release(cause);
  }

  step(dt: number, water: SurfWater, input: RideInput): void {
    const { rider, board, surfer } = this;
    if (rider.attached) {
      rider.paddle = input.paddle;
      rider.steer = input.steer;
      if (input.popUp) rider.popUp();
    }
    board.step(dt, water);
    if (!rider.attached && !surfer.active) {
      surfer.start(rider.handoffState(this.handoff));
      surfer.linearMomentum(this.started.momentum);
      surfer.centerOfMass(this.started.center);
    }
    if (surfer.active) {
      surfer.step(dt, this.bodyField(water), { stroke: input.paddle, steer: input.steer });
      surfer.resolveBoardContact(board);
    }
  }

  private bodyField(water: SurfWater): SurfWaterBodyField {
    if (!this.field || this.fieldWater !== water) {
      this.field = new SurfWaterBodyField(water);
      this.fieldWater = water;
    }
    return this.field;
  }
}
