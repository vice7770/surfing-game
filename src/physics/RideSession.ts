import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider, type RiderPhase, type RiderSeparation } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { BoardRecovery } from './BoardRecovery';
import { DetachedSurfer, type LipParcelSource } from './DetachedSurfer';
import { Leash } from './Leash';
import { RIDER_PARTS, deckHeight, type StanceName } from './riderPosture';
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
  /** Lying down or swimming, the Duck-dive action: 0 to 1 (analog). */
  duckDive?: number;
  /** In the water, the pop-up key held: reel the leash in, and grab the board once it is in reach. */
  reel?: boolean;
}

/**
 * The leash's ends (the wipeout spec): the plug sits PLUG_FROM_TAIL, m, ahead of
 * the tail on the deck; the fallen surfer's ankle is ANKLE_REACH of the way from
 * the pelvis through the back leg's node, which is the leg's centre, 0.48 m below
 * the hip of a leg about 0.9 m long (`DetachedSurfer`'s body).
 */
const PLUG_FROM_TAIL = 0.05;
const ANKLE_REACH = 1.85;

/**
 * Where a lesson puts the rider (Surf School, spec L2): a point on the water, a
 * heading (radians from +z toward +x), a speed along it on top of the water's own
 * flow, m/s, and whether the rider stands or lies.
 */
export interface RiderPlacement {
  x: number;
  z: number;
  heading: number;
  speed: number;
  phase: 'standing' | 'prone';
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
  /** The leash, from the back-foot ankle to the tail plug; a new one at each placement. */
  readonly leash = new Leash();
  private readonly plugLocal = new Vector3();
  private readonly ankle = new Vector3();
  private readonly plug = new Vector3();
  private readonly pelvis = new Vector3();
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
    const tail = -this.board.shape.length / 2 + PLUG_FROM_TAIL;
    this.plugLocal.set(0, deckHeight(this.board.shape, tail), tail);
  }

  /** The leash's plug on the tail, in the world. */
  leashPlug(out: Vector3): Vector3 {
    return this.board.toWorld(this.plugLocal, out);
  }

  /** The leash's ankle in the world: the attached rider's back foot, or the fallen surfer's. */
  leashAnkle(out: Vector3): Vector3 {
    const regular = this.rider.stance === 'regular';
    if (this.rider.attached || !this.surfer.active) return this.rider.renderPoint(regular ? 6 : 5, this.board, out);
    const pelvis = this.surfer.getPartPosition('pelvis', this.pelvis);
    return this.surfer.getPartPosition(regular ? 'rightLeg' : 'leftLeg', out).sub(pelvis).multiplyScalar(ANKLE_REACH).add(pelvis);
  }

  get phase(): RiderPhase | 'fallen' {
    return this.rider.attached ? this.rider.phase : 'fallen';
  }

  get separation(): RiderSeparation | undefined {
    return this.rider.attached ? undefined : this.rider.separation;
  }

  /** Lie prone on a level board floating at the surface over (x, z), nose along `heading` (radians from +z toward +x). */
  reset(at: Vector3, heading: number, water: SurfWater): void {
    this.place({ x: at.x, z: at.z, heading, speed: 0, phase: 'prone' }, water);
  }

  /**
   * Put the board on the surface over a point, along a heading and moving with
   * the surface water plus `speed` along the heading, with the rider standing or
   * lying on it (spec L2). The rider mounts moving with the board.
   */
  place(placement: RiderPlacement, water: SurfWater): void {
    const at = new Vector3(placement.x, 0, placement.z);
    const { heading } = placement;
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
    // The placed speed runs along the heading, level: the water carries the rest.
    velocity.x += Math.sin(heading) * placement.speed;
    velocity.z += Math.cos(heading) * placement.speed;
    this.board.place(new Vector3(at.x, surface + this.board.shape.centerOfMass.y - 0.05, at.z), orientation, velocity);
    this.rider.phase = placement.phase;
    this.board.attach(this.rider);
    this.surfer.active = false;
    this.recovery.release();
    this.leash.reset();
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
      // The pop-up key stands the rider up, or lies it back down (the playtest: only the player lies it down).
      if (input.popUp && !(rider.phase === 'standing' && rider.lieDown(board))) rider.popUp();
    }
    board.step(dt, water);
    if (rider.attached) {
      // On the board the cord hangs slack.
      this.leash.tension = 0;
      this.leash.reeling = false;
    }
    if (!rider.attached && !surfer.active) {
      surfer.start(rider.handoffState(this.handoff));
      surfer.linearMomentum(this.started.momentum);
      surfer.centerOfMass(this.started.center);
    }
    if (surfer.active) {
      surfer.step(dt, this.bodyField(water), { stroke: input.paddle, steer: input.steer });
      surfer.resolveBoardContact(board);
      const back = surfer.nodes[this.rider.stance === 'regular' ? 6 : 5];
      this.leash.step(dt, this.leashAnkle(this.ankle), back, this.leashPlug(this.plug), board, input.reel ?? false);
      // In the water, the pop-up input reaches for the board, and holding it reels the leash in; within reach
      // the grab pulls the body onto it.
      if ((input.popUp || input.reel) && this.recovery.state === 'free') this.recovery.tryGrab(board);
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
