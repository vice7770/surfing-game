import { Quaternion, Vector3 } from 'three';
import type { BoardBody } from './BoardBody';
import { REFERENCE_RIDER } from './boardReference';
import type { BoardShape } from './boardShape';
import { WATER } from './hullForces';
import { RIDER_PARTS, deckHeight, postureCenter, riderPartMasses, riderPartVolumes, riderPose, stanceFeet, type PosePhase, type StanceName, type SupportRegion } from './riderPosture';
import type { SurfWater } from './SurfWater';

/**
 * Contact limits of a body on a waxed deck (modelling choices, not measured):
 * friction of feet and of a prone body, the most a leg can push in body
 * weights, how long the rider can be airborne over the board, and how far the
 * body can be pushed off its posture and still recover.
 */
const FOOT_FRICTION = 0.9;
const PRONE_FRICTION = 0.7;
const MAX_LOAD = 4;
export const MAX_FLIGHT = 0.4;
export const RECOVERABLE_ERROR = 0.25;
/** Share of the posture error closed per substep, and the fastest correction, m/s. */
const CORRECTION = 0.2;
const MAX_CORRECTION = 0.5;
/** Knee flex that absorbs a landing: natural frequency, rad/s, and the deepest crouch, m. */
const FLEX_FREQUENCY = 5;
const MAX_FLEX = 0.35;

export interface AttachedRiderOptions {
  mass?: number;
  stance?: StanceName;
  phase?: PosePhase;
}

/** Why a rider left the board: tipped off its support, slipped, lost the board, or buckled under load. */
export type RiderSeparation = 'balance' | 'foot slip' | 'lost board' | 'impact';

/** Which limit last bound the contact impulse. */
type ContactLimit = 'none' | 'flight' | 'tip' | 'slip' | 'impact';

const SEPARATION: Record<Exclude<ContactLimit, 'none'>, RiderSeparation> = {
  flight: 'lost board', tip: 'balance', slip: 'foot slip', impact: 'impact',
};

/** Work done on the rider since it mounted, J. */
export interface RiderWork {
  gravity: number;
  contact: number;
}

type V3 = { x: number; y: number; z: number };

const Y = new Vector3(0, 1, 0);

function cross(a: V3, b: V3, out: Vector3): Vector3 {
  return out.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

/**
 * The rider as a separate body on the board (board plan §3.2 and §5, B2): a
 * posture of the detached surfer's seven parts, placed on the board for its
 * phase. While the contact holds, the rider joins the board's implicit solve as
 * one composite body:
 * - prone and push, the body lies rigid on the deck and turns with the board;
 * - standing and landing, it is carried at the stance point on the deck and
 *   stays upright while the board pitches and rolls under the feet, turning
 *   only with the board's heading (a point mass; its own spin is not modelled).
 *
 * The contact impulse that follows is checked against what a body standing or
 * lying on a deck can give:
 * - it can only push;
 * - its line passes through the rider's centre of mass and must meet the deck
 *   inside the phase's support (the feet, or chest and hands);
 * - it stays inside a friction cone, and under a leg-load cap.
 *
 * Its line through the centre of mass is also how weight shift torques the
 * board. An impulse outside that set is projected onto it, and the board and
 * rider are solved apart for that substep, so the rider tips, slips or flies
 * rather than receiving grip that does not exist. Knee flex absorbs a landing.
 */
export class AttachedRider {
  readonly mass: number;
  readonly stance: StanceName;
  phase: PosePhase;
  /** Centre of mass, world. */
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  readonly angularVelocity = new Vector3();
  /** The body's frame: the board's while lying on it, upright on the board's heading while standing. */
  readonly orientation = new Quaternion();
  /** On the board; false once separated. */
  attached = true;
  separation?: RiderSeparation;
  /** Held by the contact this substep; false while tipping, slipping or airborne. */
  inContact = true;
  flightTime = 0;
  /** Distance of the centre of mass from where the posture puts it, m. */
  postureError = 0;
  readonly work: RiderWork = { gravity: 0, contact: 0 };
  /** Contact over the latest step: mean force on the rider (N, world), centre of pressure (board frame) and more. */
  readonly contact = {
    force: new Vector3(),
    centreOfPressure: new Vector3(),
    /** Share of the load on the front foot, from where the centre of pressure falls between the feet. */
    frontShare: 0,
    /** Peak normal load in the step, body weights. */
    load: 0,
    feasible: true,
  };
  /** Part centres in the board frame (level), x y z per part. */
  readonly parts: Float64Array;
  readonly partMasses: number[];
  readonly partVolumes: number[];
  support: SupportRegion;
  upright = false;

  private readonly shape: BoardShape;
  private readonly feet: { rear: number; front: number };
  private readonly localCenter = new Vector3();
  private readonly base = new Vector3();
  private readonly localInertia = new Array<number>(9).fill(0);
  private readonly worldInertia = new Array<number>(9).fill(0);
  /** From the board's centre of mass to the rider's centre of mass (the line of force), and to where the rider is carried. */
  private readonly arm = new Vector3();
  private readonly carried = new Vector3();
  private readonly drive = new Vector3();
  private readonly external = new Vector3();
  private readonly boardVelocity = new Vector3();
  private readonly boardSpin = new Vector3();
  private readonly impulse = new Vector3();
  private readonly projected = new Vector3();
  /** The body's up: the deck normal lying down, the vertical standing. */
  private readonly up = new Vector3();
  private readonly target = new Vector3();
  private readonly baseWorld = new Vector3();
  private readonly scratch = new Vector3();
  private readonly scratch2 = new Vector3();
  private readonly localScratch = new Vector3();
  private readonly spin = new Quaternion();
  private readonly heading = new Quaternion();
  private flex = 0;
  private flexRate = 0;
  private feasible = true;
  private limit: ContactLimit = 'none';
  private stepImpulse = new Vector3();
  private stepLoad = 0;

  constructor(shape: BoardShape, options: AttachedRiderOptions = {}) {
    this.shape = shape;
    this.mass = options.mass ?? REFERENCE_RIDER.mass;
    this.stance = options.stance ?? 'regular';
    this.phase = options.phase ?? 'prone';
    this.partMasses = riderPartMasses(this.mass);
    this.partVolumes = riderPartVolumes(this.mass);
    this.feet = stanceFeet(shape);
    const pose = riderPose(shape, this.phase, this.stance);
    this.parts = pose.parts.slice();
    this.support = pose.support;
  }

  /** Put the rider in its posture on the board, moving with it. */
  mount(board: BoardBody): void {
    this.updatePosture();
    this.updateInertia(board);
    this.flex = 0;
    this.flexRate = 0;
    this.frame(board);
    this.position.copy(this.target);
    this.velocity.copy(this.drive.set(0, 0, 0)).add(board.velocityAt(this.carriedPoint(board, this.scratch), this.scratch2));
    this.velocity.add(this.headingVelocity(board, this.scratch));
    this.angularVelocity.copy(this.upright ? this.scratch.set(0, board.angularVelocity.y, 0) : board.angularVelocity);
    this.attached = true;
    this.separation = undefined;
    this.limit = 'none';
    this.inContact = true;
    this.flightTime = 0;
    this.postureError = 0;
    this.work.gravity = 0;
    this.work.contact = 0;
  }

  kineticEnergy(): number {
    const linear = 0.5 * this.mass * this.velocity.lengthSq();
    if (this.upright) return linear;
    const w = this.angularVelocity;
    const I = this.worldInertia;
    return linear + 0.5 * (w.x * (I[0] * w.x + I[1] * w.y + I[2] * w.z) + w.y * (I[3] * w.x + I[4] * w.y + I[5] * w.z) + w.z * (I[6] * w.x + I[7] * w.y + I[8] * w.z));
  }

  /** A part's centre in the world. */
  partPosition(index: number, out: Vector3): Vector3 {
    this.localScratch.set(this.parts[index * 3], this.parts[index * 3 + 1], this.parts[index * 3 + 2]).sub(this.localCenter);
    return out.copy(this.localScratch).applyQuaternion(this.orientation).add(this.position);
  }

  /** Called by the board at the start of each step. */
  beginStep(): void {
    this.stepImpulse.set(0, 0, 0);
    this.stepLoad = 0;
    this.contact.feasible = true;
  }

  endStep(dt: number): void {
    this.contact.force.copy(this.stepImpulse).divideScalar(dt);
    this.contact.load = this.stepLoad;
  }

  /** Before the board's solve: the posture's target, its drive velocity and the forces on the rider. */
  prepare(h: number, board: BoardBody, _water: SurfWater): void {
    this.updatePosture();
    this.updateInertia(board);
    this.boardVelocity.copy(board.velocity);
    this.boardSpin.copy(board.angularVelocity);
    this.arm.subVectors(this.position, board.centerOfMass);
    this.frame(board);
    // Back from the air, the knees take up the approach speed along the body's up.
    if (!this.inContact) {
      board.velocityAt(this.carriedPoint(board, this.scratch), this.scratch2);
      const approach = this.scratch.subVectors(this.velocity, this.scratch2).dot(this.up);
      if (this.scratch.subVectors(this.position, this.target).dot(this.up) <= 0.02 && approach < 0) this.flexRate = approach;
    }
    this.flexStep(h);
    this.frame(board);
    this.carried.subVectors(this.carriedPoint(board, this.scratch), board.centerOfMass);
    // Drive: the posture turning with the heading, the knees' flex, and a bounded correction toward the posture.
    this.headingVelocity(board, this.drive).addScaledVector(this.up, this.flexRate);
    const error = this.scratch.subVectors(this.target, this.position);
    const correction = Math.min(MAX_CORRECTION, (CORRECTION * error.length()) / h);
    if (error.lengthSq() > 0) this.drive.addScaledVector(error.normalize(), correction);
    this.external.set(0, -this.mass * WATER.gravity, 0);
  }

  /**
   * Add the rider to the board's 6 × 6 system: m G_fᵀ G_v, with G_v carrying the
   * rider at `carried` and G_f pushing along its line through the centre of
   * mass (`arm`), plus the rider's inertia while it lies rigid on the deck.
   */
  couple(system: Float64Array, rhs: Float64Array, h: number): void {
    const m = this.mass;
    const a = this.arm;
    const b = this.carried;
    const av = [a.x, a.y, a.z];
    const bv = [b.x, b.y, b.z];
    const ab = a.x * b.x + a.y * b.y + a.z * b.z;
    for (let i = 0; i < 3; i += 1) system[i * 6 + i] += m;
    // Top right −m [b]×, bottom left m [a]×, bottom right m((a·b) I − b aᵀ).
    system[0 * 6 + 4] += m * b.z;
    system[0 * 6 + 5] += -m * b.y;
    system[1 * 6 + 3] += -m * b.z;
    system[1 * 6 + 5] += m * b.x;
    system[2 * 6 + 3] += m * b.y;
    system[2 * 6 + 4] += -m * b.x;
    system[3 * 6 + 1] += -m * a.z;
    system[3 * 6 + 2] += m * a.y;
    system[4 * 6 + 0] += m * a.z;
    system[4 * 6 + 2] += -m * a.x;
    system[5 * 6 + 0] += -m * a.y;
    system[5 * 6 + 1] += m * a.x;
    const I = this.worldInertia;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        system[(3 + i) * 6 + 3 + j] += m * ((i === j ? ab : 0) - bv[i] * av[j]) + (this.upright ? 0 : I[i * 3 + j]);
      }
    }
    // The momentum the constraint must supply: v_rider' = v' + ω' × carried + drive.
    const mismatch = cross(this.boardSpin, b, this.scratch).add(this.boardVelocity).add(this.drive).sub(this.velocity);
    const f = this.scratch2.copy(this.external).multiplyScalar(h).addScaledVector(mismatch, -m);
    rhs[0] += f.x;
    rhs[1] += f.y;
    rhs[2] += f.z;
    const torque = cross(a, f, this.scratch);
    rhs[3] += torque.x;
    rhs[4] += torque.y;
    rhs[5] += torque.z;
    if (!this.upright) {
      const w = this.boardSpin;
      const own = this.angularVelocity;
      const dx = w.x - own.x;
      const dy = w.y - own.y;
      const dz = w.z - own.z;
      rhs[3] -= I[0] * dx + I[1] * dy + I[2] * dz;
      rhs[4] -= I[3] * dx + I[4] * dy + I[5] * dz;
      rhs[5] -= I[6] * dx + I[7] * dy + I[8] * dz;
    }
  }

  /**
   * After the board's solve (`du`, its velocity change): the contact impulse the
   * composite motion needs, and whether a body on a deck can give it. Returns
   * false with the projected impulse held for `pushBoard` when it cannot.
   */
  settle(du: Float64Array, h: number, board: BoardBody): boolean {
    const spin = this.scratch.set(this.boardSpin.x + du[3], this.boardSpin.y + du[4], this.boardSpin.z + du[5]);
    const velocity = cross(spin, this.carried, this.scratch2).add(this.boardVelocity);
    velocity.x += du[0];
    velocity.y += du[1];
    velocity.z += du[2];
    velocity.add(this.drive);
    this.impulse.copy(velocity).sub(this.velocity).multiplyScalar(this.mass).addScaledVector(this.external, -h);
    this.project(this.impulse, h, board, this.projected);
    this.feasible = this.projected.distanceTo(this.impulse) <= 1e-9 * Math.max(1, this.impulse.length());
    return this.feasible;
  }

  /** The projected contact impulse acts on the board along the rider's line of action. */
  pushBoard(rhs: Float64Array): void {
    const j = this.projected;
    rhs[0] -= j.x;
    rhs[1] -= j.y;
    rhs[2] -= j.z;
    const torque = cross(this.arm, j, this.scratch);
    rhs[3] -= torque.x;
    rhs[4] -= torque.y;
    rhs[5] -= torque.z;
  }

  /** After the board has moved: the rider's own motion and ledgers. */
  finish(h: number, board: BoardBody): void {
    const before = this.scratch.copy(this.velocity);
    // Power of the contact on the board is the same at any point of its line; use the centre of mass.
    const boardBefore = cross(this.boardSpin, this.arm, this.localScratch).add(this.boardVelocity);
    const boardAfter = cross(board.angularVelocity, this.arm, this.target).add(board.velocity);
    const contact = this.impulse;
    if (this.feasible) {
      this.velocity.copy(cross(board.angularVelocity, this.carried, this.scratch2).add(board.velocity).add(this.drive));
      contact.copy(this.velocity).sub(before).multiplyScalar(this.mass).addScaledVector(this.external, -h);
      if (this.upright) {
        this.angularVelocity.set(0, board.angularVelocity.y, 0);
      } else {
        this.angularImpulseWork(board);
        this.angularVelocity.copy(board.angularVelocity);
      }
      this.inContact = true;
      this.flightTime = 0;
    } else {
      contact.copy(this.projected);
      this.velocity.addScaledVector(contact, 1 / this.mass).addScaledVector(this.external, h / this.mass);
      this.inContact = contact.lengthSq() > 0;
      this.flightTime = this.inContact ? 0 : this.flightTime + h;
      this.contact.feasible = false;
    }
    const mean = before.add(this.velocity).multiplyScalar(0.5);
    this.work.gravity += h * this.external.dot(mean);
    this.work.contact += contact.dot(mean);
    board.work.rider -= contact.dot(boardBefore.add(boardAfter).multiplyScalar(0.5));
    this.stepImpulse.add(contact);
    this.up.set(0, 1, 0).applyQuaternion(board.orientation);
    this.stepLoad = Math.max(this.stepLoad, contact.dot(this.up) / (h * this.mass * WATER.gravity));
    this.position.addScaledVector(this.velocity, h);
    this.frame(board);
    if (this.inContact) {
      this.orientation.copy(this.upright ? this.heading : board.orientation);
    } else {
      const w = this.angularVelocity;
      const q = this.orientation;
      const dq = this.spin.set(w.x * h * 0.5, w.y * h * 0.5, w.z * h * 0.5, 0).multiply(q);
      q.set(q.x + dq.x, q.y + dq.y, q.z + dq.z, q.w + dq.w).normalize();
    }
    this.postureError = this.target.distanceTo(this.position);
    // Pushed too far off the posture, or airborne too long: the rider lets go of the board.
    if (this.flightTime > MAX_FLIGHT) this.separate('lost board');
    else if (this.postureError > RECOVERABLE_ERROR && this.limit !== 'none') this.separate(SEPARATION[this.limit]);
  }

  private separate(cause: RiderSeparation): void {
    this.attached = false;
    this.inContact = false;
    this.separation = cause;
  }

  /**
   * The posture's frame on the board as it is now: the heading, the body's up,
   * the stance point in the world and the centre of mass target (`target`).
   */
  private frame(board: BoardBody): void {
    const forward = this.scratch2.set(0, 0, 1).applyQuaternion(board.orientation);
    if (forward.x * forward.x + forward.z * forward.z > 1e-6) this.heading.setFromAxisAngle(Y, Math.atan2(forward.x, forward.z));
    if (this.upright) {
      this.up.copy(Y);
      board.toWorld(this.base, this.baseWorld);
      this.target.copy(this.localCenter).sub(this.base).applyQuaternion(this.heading).add(this.baseWorld);
    } else {
      this.up.set(0, 1, 0).applyQuaternion(board.orientation);
      board.toWorld(this.localCenter, this.target);
    }
    this.target.addScaledVector(this.up, this.flex);
  }

  /** Where the rider is carried: the stance point standing, its own centre of mass lying down. */
  private carriedPoint(board: BoardBody, out: Vector3): Vector3 {
    return this.upright ? board.toWorld(this.base, out) : out.copy(this.target);
  }

  /** How the standing body moves as the heading turns it about the stance point. */
  private headingVelocity(board: BoardBody, out: Vector3): Vector3 {
    if (!this.upright) return out.set(0, 0, 0);
    const offset = this.scratch2.subVectors(this.target, this.baseWorld);
    return cross(this.scratch.set(0, board.angularVelocity.y, 0), offset, out);
  }

  /** Lying rigid, the rider turned with the board: book the angular impulse on both sides. */
  private angularImpulseWork(board: BoardBody): void {
    const I = this.worldInertia;
    const before = this.angularVelocity;
    const after = board.angularVelocity;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const dz = after.z - before.z;
    const lx = I[0] * dx + I[1] * dy + I[2] * dz;
    const ly = I[3] * dx + I[4] * dy + I[5] * dz;
    const lz = I[6] * dx + I[7] * dy + I[8] * dz;
    this.work.contact += (lx * (before.x + after.x) + ly * (before.y + after.y) + lz * (before.z + after.z)) / 2;
    board.work.rider -= (lx * (this.boardSpin.x + after.x) + ly * (this.boardSpin.y + after.y) + lz * (this.boardSpin.z + after.z)) / 2;
  }

  /**
   * The nearest impulse a body on a deck can give: pushing only, along a line
   * through its centre of mass that meets the deck inside the support, within
   * the friction cone and the load cap.
   */
  private project(impulse: Vector3, h: number, board: BoardBody, out: Vector3): Vector3 {
    const local = board.toLocal(this.position, this.localScratch);
    const q = board.orientation;
    const j = this.scratch.copy(impulse).applyQuaternion(this.spin.copy(q).invert());
    const height = local.y - deckHeight(this.shape, local.z);
    if (!(j.y > 0) || !(height > 0)) {
      this.contact.centreOfPressure.set(local.x, local.y - height, local.z);
      this.limit = 'flight';
      return out.set(0, 0, 0);
    }
    const cap = MAX_LOAD * this.mass * WATER.gravity * h;
    const normal = Math.min(j.y, cap);
    let limit: ContactLimit = j.y > cap ? 'impact' : 'none';
    // Centre of pressure where the line of action meets the deck, kept inside the support.
    const support = this.support;
    const freeX = local.x - (height * j.x) / j.y;
    const freeZ = local.z - (height * j.z) / j.y;
    const copX = Math.min(support.xMax, Math.max(support.xMin, freeX));
    const copZ = Math.min(support.zMax, Math.max(support.zMin, freeZ));
    if (limit === 'none' && (copX !== freeX || copZ !== freeZ)) limit = 'tip';
    let tx = ((local.x - copX) * normal) / height;
    let tz = ((local.z - copZ) * normal) / height;
    const friction = (this.phase === 'prone' ? PRONE_FRICTION : FOOT_FRICTION) * normal;
    const tangential = Math.hypot(tx, tz);
    if (tangential > friction) {
      tx *= friction / tangential;
      tz *= friction / tangential;
      if (limit === 'none') limit = 'slip';
    }
    this.limit = limit;
    const cx = local.x - (height * tx) / normal;
    const cz = local.z - (height * tz) / normal;
    this.contact.centreOfPressure.set(cx, deckHeight(this.shape, cz), cz);
    const span = this.feet.front - this.feet.rear;
    this.contact.frontShare = Math.min(1, Math.max(0, (cz - this.feet.rear) / span));
    return out.set(tx, normal, tz).applyQuaternion(q);
  }

  /** The posture's parts, centre of mass and support for the current phase. */
  private updatePosture(): void {
    const pose = riderPose(this.shape, this.phase, this.stance);
    this.parts.set(pose.parts);
    this.support = pose.support;
    this.upright = pose.upright;
    this.base.set(pose.base.x, pose.base.y, pose.base.z);
    const center = postureCenter(this.parts, this.partMasses);
    this.localCenter.set(center.x, center.y, center.z);
  }

  /** Inertia of the parts about the centre of mass (point masses and their spheres), in the world. */
  private updateInertia(board: BoardBody): void {
    const I = this.localInertia;
    I.fill(0);
    const c = this.localCenter;
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      const m = this.partMasses[i];
      const radius = Math.cbrt((3 * this.partVolumes[i]) / (4 * Math.PI));
      const r = [this.parts[i * 3] - c.x, this.parts[i * 3 + 1] - c.y, this.parts[i * 3 + 2] - c.z];
      const r2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2];
      for (let a = 0; a < 3; a += 1) {
        for (let b = 0; b < 3; b += 1) I[a * 3 + b] += m * ((a === b ? r2 : 0) - r[a] * r[b]) + (a === b ? 0.4 * m * radius * radius : 0);
      }
    }
    board.rotateTensor(I, this.worldInertia);
  }

  private flexStep(h: number): void {
    const acceleration = -FLEX_FREQUENCY * FLEX_FREQUENCY * this.flex - 2 * FLEX_FREQUENCY * this.flexRate;
    this.flexRate += h * acceleration;
    this.flex = Math.max(-MAX_FLEX, Math.min(0, this.flex + h * this.flexRate));
    if ((this.flex === 0 && this.flexRate > 0) || (this.flex === -MAX_FLEX && this.flexRate < 0)) this.flexRate = 0;
  }
}
