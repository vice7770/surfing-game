import { Quaternion, Vector3 } from 'three';
import { type BoardContactBody, DetachedSurfer } from './DetachedSurfer';

export type RecoveryState = 'free' | 'holding' | 'prone-ready';

/** How far the chest may be from the nearest point of the board to grab it, m, and how fast the two may be moving apart, m/s. */
const GRAB_REACH = 1.0;
const GRAB_SPEED = 1.5;
/**
 * Before pulling on (the wipeout spec: grab from any side), the hands turn the
 * board toward the swimmer's heading and roll it deck-up, and keep it so while
 * the body comes on: a couple on the board at its rails, and its reaction on
 * the two arm nodes. The hands turn it at up to TURN_RATE, rad/s, TURN_GAIN
 * rad/s per rad of error, closing SERVO_SHARE of the rate gap each step (a
 * servo on the board's own inertia about the turn: its roll inertia is tiny, and
 * a torque law rang) plus a steady effort that builds while the gap stays,
 * never harder than MAX_TWIST, N·m (provisional: a light
 * board turned by hand in about a second). It counts as aligned within
 * ALIGNED_YAW, rad, the deck normal's vertical part past ALIGNED_UP, turning
 * slower than ALIGNED_RATE, rad/s; flipped past LOST_UP during the pull, the
 * hands turn it back first.
 */
const TURN_RATE = 3;
const TURN_GAIN = 4;
const SERVO_SHARE = 0.5;
/** The hands' steady effort builds at TWIST_BUILD, N·m per rad/s of rate gap per s: the water's hold on a rolled board (~25 N·m) needs it. */
const TWIST_BUILD = 40;
const MAX_TWIST = 40;
const ALIGNED_YAW = (25 * Math.PI) / 180;
const ALIGNED_UP = 0.7;
const ALIGNED_RATE = 2;
const LOST_UP = 0.3;
/** The body comes on only while the deck's normal is within about 18° of the vertical (MOUNT_UP) and turning slower than MOUNT_RATE, rad/s. */
const MOUNT_UP = 0.95;
const MOUNT_RATE = 1;
/**
 * While turning the board the chest stays by it: a spring and damper toward
 * HOLD_GAP, m, from the board's nearest point (N/m, N·s/m), each impulse capped
 * at HOLD_IMPULSE, N·s (provisional).
 */
const HOLD_GAP = 0.35;
const HOLD_STIFFNESS = 150;
const HOLD_DAMPING = 40;
const HOLD_IMPULSE = 4;
const Y = new Vector3(0, 1, 0);

function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * A provisional hand/chest grab. It transfers spring and damping impulses
 * between the separate rider and board without moving either to a preset pose:
 * first the hands turn and right the board (from whichever side it was
 * grabbed), then they and the chest pull the body onto the deck. The
 * attached-rider model consumes `prone-ready` at the P4 handoff.
 */
export class BoardRecovery {
  state: RecoveryState = 'free';
  /** The board is deck-up and turned to the swimmer's heading: the pull onto it has begun. */
  aligned = false;
  /** The deck normal's vertical part at the latest step. */
  private up = 1;
  /** The hands' steady turning effort, N·m (world). */
  private readonly effort = new Vector3();
  private readonly angular = new Vector3();
  private readonly moment = new Vector3();
  private readonly target = new Vector3();
  private readonly relative = new Vector3();
  private readonly boardVelocity = new Vector3();
  private readonly impulse = new Vector3();
  private readonly nearest = new Vector3();
  private readonly local = new Vector3();
  private readonly inverse = new Quaternion();
  private readonly axis = new Vector3();
  private readonly torque = new Vector3();
  private readonly lever = new Vector3();
  private readonly force = new Vector3();
  private readonly point = new Vector3();
  private readonly contacts = [
    { index: 3, xSign: -1, height: 0.02, stiffness: 300, damping: 45 },
    { index: 4, xSign: 1, height: 0.02, stiffness: 300, damping: 45 },
    { index: 1, xSign: 0, height: 0.2, stiffness: 380, damping: 60 },
  ] as const;

  constructor(private readonly rider: DetachedSurfer) {}

  /** Whether a grab now would reach: the chest near enough to the board, and not moving away from it too fast. */
  inReach(board: BoardContactBody): boolean {
    if (!this.rider.active || this.rider.controlGain < 0.5) return false;
    const torso = this.rider.nodes[1];
    this.nearestPoint(board, torso.position, this.nearest);
    if (torso.position.distanceTo(this.nearest) > GRAB_REACH) return false;
    board.velocityAt(this.nearest, this.boardVelocity);
    return torso.velocity.distanceTo(this.boardVelocity) <= GRAB_SPEED;
  }

  /** Enter/pop-up request: from any side, if the board is in reach. */
  tryGrab(board: BoardContactBody): boolean {
    if (this.state !== 'free' || !this.inReach(board)) return false;
    this.state = 'holding';
    this.aligned = false;
    this.effort.set(0, 0, 0);
    return true;
  }

  /** Apply force impulses; no position or velocity is assigned directly. */
  step(dt: number, board: BoardContactBody): RecoveryState {
    if (this.state === 'free') return this.state;
    this.targetAt(board, 0, 0.2, this.target);
    if (this.rider.nodes[1].position.distanceTo(this.target) > 2) {
      this.release();
      return this.state;
    }
    const aligned = this.align(dt, board);
    if (!this.aligned) this.aligned = aligned;
    else if (this.up < LOST_UP) this.aligned = false;
    if (!this.aligned) {
      this.hold(dt, board);
      return this.state;
    }
    let handsClose = true;
    let chestClose = true;
    let motionSlow = true;
    for (const contact of this.contacts) {
      const node = this.rider.nodes[contact.index];
      this.targetAt(board, contact.xSign, contact.height, this.target);
      board.velocityAt(this.target, this.boardVelocity);
      this.relative.subVectors(this.boardVelocity, node.velocity);
      this.impulse.subVectors(this.target, node.position).multiplyScalar(contact.stiffness)
        .addScaledVector(this.relative, contact.damping).multiplyScalar(dt);
      if (this.impulse.length() > 6) this.impulse.setLength(6);
      node.velocity.addScaledVector(this.impulse, 1 / node.mass);
      // The hands hold the board flat while the body hauls itself on: the board takes the pull at its centre,
      // and the moment it would have had about it goes through the grip into the arms.
      this.impulse.multiplyScalar(-1);
      board.applyImpulse(this.impulse, board.position);
      this.armsTake(this.moment.subVectors(this.target, board.position).cross(this.impulse));
      const distance = node.position.distanceTo(this.target);
      if (contact.index === 1) chestClose = distance < 0.35;
      else handsClose &&= distance < 0.25;
      motionSlow &&= this.relative.length() < 1.2;
    }
    // Only onto a deck held nearly flat and still: joined rolled 44°, the pair capsized under the prone balance.
    if (handsClose && chestClose && motionSlow && this.up > MOUNT_UP && board.angularVelocity.length() < MOUNT_RATE) this.state = 'prone-ready';
    return this.state;
  }

  release(): void {
    this.state = 'free';
    this.aligned = false;
    this.effort.set(0, 0, 0);
  }

  /**
   * The hands turn the board toward the swimmer's heading and roll it deck-up
   * (and hold it there). Returns whether it is aligned and slow.
   */
  private align(dt: number, board: BoardContactBody): boolean {
    const up = this.axis.set(0, 1, 0).applyQuaternion(board.orientation);
    const forward = this.local.set(0, 0, 1).applyQuaternion(board.orientation);
    this.up = up.y;
    const level = Math.hypot(forward.x, forward.z);
    const yawError = level > 0.2 ? wrap(this.rider.heading - Math.atan2(forward.x, forward.z)) : 0;
    // The rate the hands want: the deck's normal toward the vertical, about their common perpendicular, and
    // the heading about the vertical.
    const tilt = Math.acos(Math.max(-1, Math.min(1, up.y)));
    const want = this.torque.crossVectors(up, Y);
    if (want.lengthSq() > 1e-9) want.setLength(TURN_GAIN * tilt);
    else if (up.y < 0) want.copy(forward).setLength(TURN_GAIN * tilt);
    want.addScaledVector(Y, TURN_GAIN * yawError);
    if (want.length() > TURN_RATE) want.setLength(TURN_RATE);
    this.turn(dt, board, want);
    return Math.abs(yawError) < ALIGNED_YAW && up.y > ALIGNED_UP && board.angularVelocity.length() < ALIGNED_RATE;
  }

  /**
   * The hands' angular impulse on the board toward the rate `want`, rad/s: the
   * servo's share of the gap on the board's own inertia, plus the steady effort
   * (which halves whenever the gap turns against it, so it never winds up past a
   * turn), at most MAX_TWIST; and its reaction on the swimmer.
   */
  private turn(dt: number, board: BoardContactBody, want: Vector3): void {
    const gap = want.sub(board.angularVelocity);
    if (this.effort.dot(gap) < 0) this.effort.multiplyScalar(0.5);
    this.effort.addScaledVector(gap, TWIST_BUILD * dt);
    if (this.effort.length() > MAX_TWIST) this.effort.setLength(MAX_TWIST);
    const angular = this.angular.copy(this.effort).multiplyScalar(dt);
    const size = gap.length();
    if (size > 1e-9) {
      const inverseInertia = this.inverseInertia(board, this.point.copy(gap).divideScalar(size));
      if (inverseInertia > 1e-9) angular.addScaledVector(this.point, (SERVO_SHARE * size) / inverseInertia);
    }
    if (angular.length() > MAX_TWIST * dt) angular.setLength(MAX_TWIST * dt);
    this.couple(board, angular);
  }

  /** The board's inverse inertia about unit `axis`, from its response to a push across a lever at its rail. */
  private inverseInertia(board: BoardContactBody, axis: Vector3): number {
    const r = Math.max(0.05, board.halfExtents.x);
    if (!this.leverAcross(board, axis)) return 0;
    const across = this.force.crossVectors(axis, this.lever);
    const at = this.target.copy(board.position).addScaledVector(this.lever, r);
    return (board.inverseEffectiveMass(at, across) - board.inverseMass) / (r * r);
  }

  /** A unit lever across `axis` into `this.lever`: the board's own across axis unless it lies along the axis. */
  private leverAcross(board: BoardContactBody, axis: Vector3): boolean {
    const lever = this.lever.set(1, 0, 0).applyQuaternion(board.orientation);
    lever.addScaledVector(axis, -lever.dot(axis));
    if (lever.lengthSq() < 1e-6) {
      lever.set(0, 0, 1).applyQuaternion(board.orientation);
      lever.addScaledVector(axis, -lever.dot(axis));
    }
    if (lever.lengthSq() < 1e-6) return false;
    lever.normalize();
    return true;
  }

  /**
   * The angular impulse `angular`, N·m·s, on the board as two opposite pushes at
   * its rails, and the opposite on the swimmer through its two arms.
   */
  private couple(board: BoardContactBody, angular: Vector3): void {
    const size = angular.length();
    if (size < 1e-12) return;
    const axis = this.point.copy(angular).divideScalar(size);
    if (!this.leverAcross(board, axis)) return;
    const r = Math.max(0.05, board.halfExtents.x);
    // Pushes ±J at ±r·e give an angular impulse 2r (e × J) along the axis when J = (axis × e) L / 2r.
    const impulse = this.force.crossVectors(axis, this.lever).multiplyScalar(size / (2 * r));
    board.applyImpulse(impulse, this.target.copy(board.position).addScaledVector(this.lever, r));
    board.applyImpulse(impulse.multiplyScalar(-1), this.target.copy(board.position).addScaledVector(this.lever, -r));
    this.armsTake(angular.multiplyScalar(-1));
    angular.multiplyScalar(-1);
  }

  /** An angular impulse `angular`, N·m·s, on the swimmer through its arms: G at one and −G at the other, d × G = L across d. */
  private armsTake(angular: Vector3): void {
    const left = this.rider.nodes[3];
    const right = this.rider.nodes[4];
    const d = this.lever.subVectors(left.position, right.position);
    const span = d.lengthSq();
    if (span < 1e-6) return;
    const reaction = this.force.crossVectors(angular, d).multiplyScalar(1 / span);
    left.velocity.addScaledVector(reaction, 1 / left.mass);
    right.velocity.addScaledVector(reaction, -1 / right.mass);
  }

  /** The chest keeps HOLD_GAP from the board's nearest point while the hands turn it. */
  private hold(dt: number, board: BoardContactBody): void {
    const torso = this.rider.nodes[1];
    this.nearestPoint(board, torso.position, this.nearest);
    const toward = this.impulse.subVectors(this.nearest, torso.position);
    const distance = toward.length();
    if (distance <= HOLD_GAP || distance < 1e-9) return;
    toward.divideScalar(distance);
    board.velocityAt(this.nearest, this.boardVelocity);
    const closing = this.relative.subVectors(this.boardVelocity, torso.velocity).dot(toward);
    let magnitude = (HOLD_STIFFNESS * (distance - HOLD_GAP) + HOLD_DAMPING * closing) * dt;
    magnitude = Math.max(0, Math.min(HOLD_IMPULSE, magnitude));
    if (magnitude === 0) return;
    toward.multiplyScalar(magnitude);
    torso.velocity.addScaledVector(toward, 1 / torso.mass);
    board.applyImpulse(toward.multiplyScalar(-1), this.nearest);
  }

  /** The point of the board's contact box nearest `point`, in the world. */
  private nearestPoint(board: BoardContactBody, point: Vector3, out: Vector3): Vector3 {
    this.inverse.copy(board.orientation).invert();
    const local = this.local.subVectors(point, board.position).applyQuaternion(this.inverse);
    const half = board.halfExtents;
    local.set(
      Math.min(half.x, Math.max(-half.x, local.x)),
      Math.min(half.y, Math.max(-half.y, local.y)),
      Math.min(half.z, Math.max(-half.z, local.z)),
    );
    return out.copy(local).applyQuaternion(board.orientation).add(board.position);
  }

  private targetAt(board: BoardContactBody, xSign: number, height: number, out: Vector3): Vector3 {
    const handX = Math.min(0.22, board.halfExtents.x * 0.5);
    const frontZ = Math.min(0.25, board.halfExtents.z * 0.25);
    return out.set(xSign * handX, board.halfExtents.y + height, xSign === 0 ? 0 : frontZ)
      .applyQuaternion(board.orientation).add(board.position);
  }
}
