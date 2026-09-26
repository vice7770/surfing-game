import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider, type RiderPhase, type RiderSeparation } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { BoardRecovery } from './BoardRecovery';
import { DetachedSurfer, type LipParcelSource } from './DetachedSurfer';
import { RIDER_PARTS, type StanceName } from './riderPosture';
import { createWaterSample, type SurfWater } from './SurfWater';
import { SurfWaterBodyField } from './SurfWaterBodyField';

/** What the player asks for in one step. */
export interface RideInput {
  paddle: boolean;
  popUp: boolean;
  /** −1 (right) to 1 (left). Lying down it turns the swimmer; standing it shifts weight onto a rail. */
  steer: number;
  /** Standing, weight along the board: −1 back to 1 forward (spec P9). */
  trim?: number;
  /** Standing, the crouch: 0 riding stance to 1 deepest. */
  crouch?: number;
  /** Standing, the wave-side hand in the water. */
  hand?: boolean;
}

export interface RideSessionOptions {
  stance?: StanceName;
}

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
  /** The fallen surfer's grab on the board, pulling them back onto it (surfer plan S3). */
  readonly recovery = new BoardRecovery(this.surfer);
  /** The latest climb back on: the swimmer's and board's linear momentum just before, the mounted pair's after (N·s), and how many so far. */
  readonly remount = { before: new Vector3(), after: new Vector3(), count: 0 };
  private readonly spinPart = new Vector3();
  private readonly sample = createWaterSample();
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
    // Put in moving water, a body drifts with it: the board starts with the surface water's velocity,
    // lying along the surface, heading `heading`. Started at rest mid-wave, the flow jolts it.
    const surface = water.surfaceAt(at.x, at.z);
    const sample = water.sampleAt(at.x, surface - 0.05, at.z, this.sample);
    const moving = sample.wet && !sample.outsideDomain;
    const up = new Vector3(0, 1, 0);
    if (moving && sample.normalY > 0.5) up.set(sample.normalX, sample.normalY, sample.normalZ).normalize();
    // Forward keeps the heading's horizontal direction and lies in the surface; the board's +x is its left.
    const forward = new Vector3(Math.sin(heading), -(up.x * Math.sin(heading) + up.z * Math.cos(heading)) / up.y, Math.cos(heading)).normalize();
    const left = new Vector3().crossVectors(up, forward);
    const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, up, forward));
    const velocity = moving ? new Vector3(sample.flowX, sample.flowY, sample.flowZ) : new Vector3();
    this.board.place(new Vector3(at.x, surface + this.board.shape.centerOfMass.y - 0.05, at.z), orientation, velocity);
    this.rider.phase = 'prone';
    this.board.attach(this.rider);
    this.surfer.active = false;
    this.recovery.release();
  }

  /** The drawn body's seven points (pelvis, torso, head, hands, feet), riding or fallen. */
  renderPoint(index: number, out: Vector3): Vector3 {
    return this.rider.attached ? this.rider.renderPoint(index, this.board, out) : this.surfer.getPartPosition(RIDER_PARTS[index], out);
  }

  /** Which way the body faces, radians from +z toward +x. */
  get heading(): number {
    if (!this.rider.attached) return this.surfer.heading;
    const forward = new Vector3(0, 0, 1).applyQuaternion(this.board.orientation);
    return Math.atan2(forward.x, forward.z);
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
      rider.trim = input.trim ?? 0;
      rider.crouch = input.crouch ?? 0;
      rider.hand = input.hand ?? false;
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
      // In the water, the pop-up input reaches for the board; within reach the grab pulls the body onto it.
      if (input.popUp && this.recovery.state === 'free') this.recovery.tryGrab(board);
      if (this.recovery.state !== 'free' && this.recovery.step(dt, board) === 'prone-ready') this.climbOn();
    }
  }

  /**
   * Lying back down on the board after a grab: the rider remounts prone, and
   * the pair moves on with the linear momentum the swimmer and board had
   * together (an inelastic join, like the fall's handoff in reverse).
   */
  private climbOn(): void {
    const { board, rider, surfer, remount } = this;
    surfer.linearMomentum(remount.before).addScaledVector(board.velocity, board.mass);
    rider.phase = 'prone';
    board.attach(rider);
    // Mounted, the body moves with the deck under it, spin included: share the momentum around that.
    const spin = this.spinPart.subVectors(rider.velocity, board.velocity);
    board.velocity.copy(remount.before).addScaledVector(spin, -rider.mass).divideScalar(board.mass + rider.mass);
    rider.velocity.copy(board.velocity).add(spin);
    remount.after.copy(rider.velocity).multiplyScalar(rider.mass).addScaledVector(board.velocity, board.mass);
    surfer.active = false;
    this.recovery.release();
    remount.count += 1;
  }

  /**
   * The airborne lip strikes whoever is in its path after the step: the rider on
   * the board, or the fallen surfer. Each parcel keeps the momentum it has left.
   */
  strike(lip: LipParcelSource): void {
    const { rider, board, surfer } = this;
    if (rider.attached) rider.strikeBy(lip, board);
    else if (surfer.active) surfer.strikeBy(lip);
  }

  private bodyField(water: SurfWater): SurfWaterBodyField {
    if (!this.field || this.fieldWater !== water) {
      this.field = new SurfWaterBodyField(water);
      this.fieldWater = water;
    }
    return this.field;
  }
}
