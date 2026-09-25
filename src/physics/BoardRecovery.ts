import { Vector3 } from 'three';
import { type BoardContactBody, DetachedSurfer } from './DetachedSurfer';

export type RecoveryState = 'free' | 'holding' | 'prone-ready';

/**
 * A provisional hand/chest grab. It transfers spring and damping impulses
 * between the separate rider and board without moving either to a preset pose.
 * The later attached-rider model consumes `prone-ready` at the P4 handoff.
 */
export class BoardRecovery {
  state: RecoveryState = 'free';
  private readonly target = new Vector3();
  private readonly relative = new Vector3();
  private readonly boardVelocity = new Vector3();
  private readonly impulse = new Vector3();
  private readonly heading = new Vector3();
  private readonly boardForward = new Vector3();
  private readonly contacts = [
    { index: 3, xSign: -1, height: 0.02, stiffness: 300, damping: 45 },
    { index: 4, xSign: 1, height: 0.02, stiffness: 300, damping: 45 },
    { index: 1, xSign: 0, height: 0.2, stiffness: 380, damping: 60 },
  ] as const;

  constructor(private readonly rider: DetachedSurfer) {}

  /** Enter/pop-up request; eligibility uses actual reach, motion and heading. */
  tryGrab(board: BoardContactBody): boolean {
    if (!this.rider.active || this.state !== 'free' || this.rider.controlGain < 0.5) return false;
    this.heading.set(Math.sin(this.rider.heading), 0, Math.cos(this.rider.heading));
    this.boardForward.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    if (this.heading.dot(this.boardForward) < 0.3) return false;

    let nearestHand = Infinity;
    let torsoDistance = Infinity;
    let relativeSpeed = Infinity;
    for (const contact of this.contacts) {
      this.targetAt(board, contact.xSign, contact.height, this.target);
      const node = this.rider.nodes[contact.index];
      const distance = node.position.distanceTo(this.target);
      if (contact.index === 1) {
        torsoDistance = distance;
        board.velocityAt(this.target, this.boardVelocity);
        relativeSpeed = node.velocity.distanceTo(this.boardVelocity);
      } else {
        nearestHand = Math.min(nearestHand, distance);
      }
    }
    // The arm nodes are centers, so reach includes the forearm/hand beyond them.
    if (nearestHand > 0.85 || torsoDistance > 1.1 || relativeSpeed > 1.5) return false;
    this.state = 'holding';
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
      board.applyImpulse(this.impulse.multiplyScalar(-1), this.target);
      const distance = node.position.distanceTo(this.target);
      if (contact.index === 1) chestClose = distance < 0.35;
      else handsClose &&= distance < 0.25;
      motionSlow &&= this.relative.length() < 1.2;
    }
    if (handsClose && chestClose && motionSlow) this.state = 'prone-ready';
    return this.state;
  }

  release(): void { this.state = 'free'; }

  private targetAt(board: BoardContactBody, xSign: number, height: number, out: Vector3): Vector3 {
    const handX = Math.min(0.22, board.halfExtents.x * 0.5);
    const frontZ = Math.min(0.25, board.halfExtents.z * 0.25);
    return out.set(xSign * handX, board.halfExtents.y + height, xSign === 0 ? 0 : frontZ)
      .applyQuaternion(board.orientation).add(board.position);
  }
}
