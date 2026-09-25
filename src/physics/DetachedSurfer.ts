import { Matrix3, Quaternion, Vector3 } from 'three';

/** World-space sample at one body point. The water implementation owns the interpolation. */
export interface BodyWaterSample {
  surfaceY: number;
  bedY: number;
  flow: Vector3;
  wet: boolean;
  outsideDomain: boolean;
  breaking: number;
  /** Horizontal depth profile is reconstructed from solver-averaged momentum. */
  flowModel?: 'reconstructed' | 'dry' | 'outside';
}

export interface BodyWaterField {
  sampleAt(position: Readonly<Vector3>, out: BodyWaterSample): void;
}

export interface AttachedRiderState {
  /** Rider center of mass in world coordinates. */
  center: Readonly<Vector3>;
  orientation: Readonly<Quaternion>;
  velocity: Readonly<Vector3>;
  angularVelocity: Readonly<Vector3>;
}

export interface SwimInput {
  stroke: boolean;
  steer: number;
}

/** Sum of external forces applied during the latest body step, in newtons. */
export interface BodyForceLedger {
  readonly gravity: Vector3;
  readonly buoyancy: Vector3;
  readonly drag: Vector3;
  readonly swim: Vector3;
}

/** External contact impulses delivered to the body since its latest step. */
export interface BodyContactLedger {
  readonly board: Vector3;
  readonly lip: Vector3;
}

/** Contact-only board seam. The later physical board owns its water forces. */
export interface BoardContactBody {
  readonly position: Vector3;
  readonly orientation: Quaternion;
  readonly halfExtents: Readonly<Vector3>;
  readonly inverseMass: number;
  velocityAt(worldPoint: Readonly<Vector3>, out: Vector3): Vector3;
  inverseEffectiveMass(worldPoint: Readonly<Vector3>, normal: Readonly<Vector3>): number;
  applyImpulse(impulse: Readonly<Vector3>, worldPoint: Readonly<Vector3>): void;
}

/** One coarse airborne water parcel. Its full momentum persists to landing. */
export interface LipContactParcel {
  readonly id: number;
  readonly previousPosition: Readonly<Vector3>;
  readonly position: Readonly<Vector3>;
  readonly velocity: Vector3;
  readonly volume: number;
  readonly radius: number;
}

export type BodyPart = 'pelvis' | 'torso' | 'head' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

/** Read-only pose seam for the procedural surfer and recovery camera. */
export interface DetachedRiderPose {
  readonly heading: number;
  getPartPosition(part: BodyPart, out: Vector3): Vector3;
}

export interface BodyNode {
  readonly part: BodyPart;
  readonly mass: number;
  readonly radius: number;
  readonly volume: number;
  readonly position: Vector3;
  readonly velocity: Vector3;
  submersion: number;
  grounded: boolean;
}

type NodeSpec = { part: BodyPart; mass: number; local: Vector3 };

// A compact center-of-mass model, deliberately separate from the rendered limb geometry.
// Proportions sum to the provisional 73 kg reference; total mass is configurable.
const SPECS: readonly NodeSpec[] = [
  { part: 'pelvis', mass: 20, local: new Vector3(0, 0, 0) },
  { part: 'torso', mass: 23, local: new Vector3(0, 0.35, 0) },
  { part: 'head', mass: 5, local: new Vector3(0, 0.74, 0) },
  { part: 'leftArm', mass: 5, local: new Vector3(-0.36, 0.32, 0.04) },
  { part: 'rightArm', mass: 5, local: new Vector3(0.36, 0.32, 0.04) },
  { part: 'leftLeg', mass: 7.5, local: new Vector3(-0.15, -0.48, 0) },
  { part: 'rightLeg', mass: 7.5, local: new Vector3(0.15, -0.48, 0) },
];

const LINKS: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [1, 3], [1, 4], [0, 5], [0, 6],
];

const PART_INDEX: Readonly<Record<BodyPart, number>> = {
  pelvis: 0, torso: 1, head: 2,
  leftArm: 3, rightArm: 4, leftLeg: 5, rightLeg: 6,
};

const GRAVITY = 9.81;
const WATER_DENSITY = 1000;
const AIR_DENSITY = 1.2;
const DRAG_COEFFICIENT = 0.9;
const DEFAULT_BODY_DENSITY = 950;
// Provisional contact parameters for the standalone kernel, not measured surf data.
const BOARD_RESTITUTION = 0.05;
const BOARD_FRICTION = 0.4;
const LIP_CONTACT_FRACTION = 0.05;
const MAX_LIP_BODY_DELTA_SPEED = 8;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** Fraction of a sphere beneath a horizontal free surface. */
function submergedFraction(surfaceAboveCenter: number, radius: number): number {
  if (surfaceAboveCenter <= -radius) return 0;
  if (surfaceAboveCenter >= radius) return 1;
  const depthFromBottom = surfaceAboveCenter + radius;
  return depthFromBottom * depthFromBottom * (3 * radius - depthFromBottom)
    / (4 * radius * radius * radius);
}

type SweepHit = { fraction: number; normal: Vector3 };

/** Segment against a box expanded by a sphere radius, in board-local coordinates. */
function sweepExpandedBox(start: Vector3, end: Vector3, half: Vector3): SweepHit | undefined {
  let enter = 0;
  let exit = 1;
  let normalAxis = -1;
  let normalSign = 0;
  for (let axis = 0; axis < 3; axis += 1) {
    const origin = start.getComponent(axis);
    const movement = end.getComponent(axis) - origin;
    const extent = half.getComponent(axis);
    if (Math.abs(movement) < 1e-12) {
      if (origin < -extent || origin > extent) return undefined;
      continue;
    }
    const first = (-extent - origin) / movement;
    const second = (extent - origin) / movement;
    const near = Math.min(first, second);
    const far = Math.max(first, second);
    if (near > enter) {
      enter = near;
      normalAxis = axis;
      normalSign = movement > 0 ? -1 : 1;
    }
    exit = Math.min(exit, far);
    if (enter > exit) return undefined;
  }
  if (normalAxis < 0 || enter > 1 || exit < 0) return undefined;
  return { fraction: enter, normal: new Vector3().setComponent(normalAxis, normalSign) };
}

const totalMass = SPECS.reduce((sum, spec) => sum + spec.mass, 0);
const localCenter = SPECS.reduce(
  (center, spec) => center.addScaledVector(spec.local, spec.mass / totalMass),
  new Vector3(),
);
const localOffsets = SPECS.map((spec) => spec.local.clone().sub(localCenter));
const links = LINKS.map(([a, b]) => ({
  a, b, length: localOffsets[a].distanceTo(localOffsets[b]),
}));
const angleLimits = [
  { a: 0, joint: 1, b: 2, minDegrees: 125, maxDegrees: 180 },
  { a: 0, joint: 1, b: 3, minDegrees: 35, maxDegrees: 160 },
  { a: 0, joint: 1, b: 4, minDegrees: 35, maxDegrees: 160 },
  { a: 1, joint: 0, b: 5, minDegrees: 75, maxDegrees: 180 },
  { a: 1, joint: 0, b: 6, minDegrees: 75, maxDegrees: 180 },
].map(({ a, joint, b, minDegrees, maxDegrees }) => {
  const first = localOffsets[a].distanceTo(localOffsets[joint]);
  const second = localOffsets[b].distanceTo(localOffsets[joint]);
  const distanceAt = (degrees: number): number => Math.sqrt(
    first * first + second * second
      - 2 * first * second * Math.cos(degrees * Math.PI / 180),
  );
  return { a, b, minDistance: distanceAt(minDegrees), maxDistance: distanceAt(maxDegrees) };
});

/**
 * Solver-independent post-wipeout body. Seven buoyant mass points and distance
 * joints provide a deterministic first integration slice. Broad neck,
 * shoulder and hip angle bounds keep the point skeleton coherent; lip contact
 * and board grabbing belong to later P4 gates.
 */
export class DetachedSurfer implements DetachedRiderPose {
  readonly nodes: readonly BodyNode[];
  active = false;
  controlGain = 0;
  angularSpeed = 0;
  heading = 0;
  outsideDomain = false;
  readonly lastForces: BodyForceLedger = {
    gravity: new Vector3(), buoyancy: new Vector3(), drag: new Vector3(), swim: new Vector3(),
  };
  readonly lastContacts: BodyContactLedger = { board: new Vector3(), lip: new Vector3() };
  private swimEligible = false;
  private contactPending = false;
  private lipContactPending = false;
  private readonly contactedLipIds = new Set<number>();
  private readonly previous: Vector3[];
  private readonly bedY: number[];
  private readonly sample: BodyWaterSample = {
    surfaceY: 0, bedY: 0, flow: new Vector3(), wet: false, outsideDomain: false, breaking: 0,
  };
  private readonly forces: Vector3[];
  private readonly relative = new Vector3();
  private readonly strokeDirection = new Vector3();
  private readonly linkDelta = new Vector3();
  private readonly boardInverse = new Quaternion();
  private readonly boardLocalStart = new Vector3();
  private readonly boardLocalEnd = new Vector3();
  private readonly boardLocalContact = new Vector3();
  private readonly boardLocalNormal = new Vector3();
  private readonly boardWorldNormal = new Vector3();
  private readonly boardWorldContact = new Vector3();
  private readonly boardPointVelocity = new Vector3();
  private readonly boardRelativeVelocity = new Vector3();
  private readonly boardImpulse = new Vector3();
  private readonly boardTangent = new Vector3();
  private readonly expandedHalf = new Vector3();
  private readonly lipStart = new Vector3();
  private readonly lipEnd = new Vector3();
  private readonly lipTravel = new Vector3();
  private readonly lipClosest = new Vector3();
  private readonly lipRelativeVelocity = new Vector3();
  private readonly lipImpulse = new Vector3();
  private readonly controlCenter = new Vector3();
  private readonly controlLever = new Vector3();
  private readonly controlSpin = new Vector3();
  private readonly controlTorque = new Vector3();
  private readonly controlInertia = new Matrix3();

  constructor(readonly bodyDensity = DEFAULT_BODY_DENSITY, readonly mass = totalMass) {
    if (!Number.isFinite(bodyDensity) || bodyDensity <= 0) throw new RangeError('body density must be finite and positive');
    if (!Number.isFinite(mass) || mass <= 0) throw new RangeError('body mass must be finite and positive');
    this.nodes = SPECS.map((spec) => {
      const nodeMass = spec.mass * mass / totalMass;
      const volume = nodeMass / bodyDensity;
      return {
        part: spec.part,
        mass: nodeMass,
        volume,
        radius: Math.cbrt(3 * volume / (4 * Math.PI)),
        position: new Vector3(),
        velocity: new Vector3(),
        submersion: 0,
        grounded: false,
      };
    });
    this.previous = this.nodes.map(() => new Vector3());
    this.bedY = this.nodes.map(() => -Infinity);
    this.forces = this.nodes.map(() => new Vector3());
  }

  start(attached: AttachedRiderState): void {
    const offset = new Vector3();
    const spin = new Vector3();
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      offset.copy(localOffsets[index]).applyQuaternion(attached.orientation);
      node.position.copy(attached.center).add(offset);
      spin.crossVectors(attached.angularVelocity, offset);
      node.velocity.copy(attached.velocity).add(spin);
      node.submersion = 0;
      node.grounded = false;
    }
    const forward = new Vector3(0, 0, 1).applyQuaternion(attached.orientation);
    this.heading = Math.atan2(forward.x, forward.z);
    this.active = true;
    this.controlGain = 0;
    this.angularSpeed = attached.angularVelocity.length();
    this.outsideDomain = false;
    this.swimEligible = false;
    this.contactPending = false;
    this.lipContactPending = false;
    this.contactedLipIds.clear();
    for (const force of Object.values(this.lastForces)) force.set(0, 0, 0);
    this.lastContacts.board.set(0, 0, 0);
    this.lastContacts.lip.set(0, 0, 0);
  }

  centerOfMass(out = new Vector3()): Vector3 {
    out.set(0, 0, 0);
    for (const node of this.nodes) out.addScaledVector(node.position, node.mass / this.mass);
    return out;
  }

  getPartPosition(part: BodyPart, out: Vector3): Vector3 {
    return out.copy(this.nodes[PART_INDEX[part]].position);
  }

  linearMomentum(out = new Vector3()): Vector3 {
    out.set(0, 0, 0);
    for (const node of this.nodes) out.addScaledVector(node.velocity, node.mass);
    return out;
  }

  angularMomentum(out = new Vector3()): Vector3 {
    out.set(0, 0, 0);
    const center = this.centerOfMass();
    const radius = new Vector3();
    const momentum = new Vector3();
    for (const node of this.nodes) {
      radius.subVectors(node.position, center);
      momentum.copy(node.velocity).multiplyScalar(node.mass);
      out.add(radius.cross(momentum));
    }
    return out;
  }

  private solveDistance(aIndex: number, bIndex: number, minimum: number, maximum: number): void {
    const a = this.nodes[aIndex];
    const b = this.nodes[bIndex];
    const delta = this.linkDelta.subVectors(b.position, a.position);
    const distance = delta.length();
    if (distance < 1e-9) return;
    const target = clamp(distance, minimum, maximum);
    const error = (distance - target) / distance;
    const inverseA = 1 / a.mass;
    const inverseB = 1 / b.mass;
    a.position.addScaledVector(delta, error * inverseA / (inverseA + inverseB));
    b.position.addScaledVector(delta, -error * inverseB / (inverseA + inverseB));
  }

  /**
   * Contact against a board pose held fixed over the just-completed body step.
   * Uses a swept point against an expanded box for fast impacts, then transfers
   * equal and opposite normal impulse. P4 must also sweep the moving board pose.
   */
  resolveBoardContact(board: BoardContactBody): number {
    if (!this.active || !this.contactPending) return 0;
    this.contactPending = false;
    this.boardInverse.copy(board.orientation).invert();
    let contacts = 0;
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const start = this.boardLocalStart.copy(this.previous[index]).sub(board.position)
        .applyQuaternion(this.boardInverse);
      const end = this.boardLocalEnd.copy(node.position).sub(board.position)
        .applyQuaternion(this.boardInverse);
      const half = board.halfExtents;
      const closest = this.boardLocalContact.set(
        clamp(end.x, -half.x, half.x),
        clamp(end.y, -half.y, half.y),
        clamp(end.z, -half.z, half.z),
      );
      const difference = this.boardLocalNormal.subVectors(end, closest);
      const distance = difference.length();
      let penetration = 0;
      if (distance < node.radius) {
        if (distance > 1e-9) {
          difference.divideScalar(distance);
          penetration = node.radius - distance;
        } else {
          const margins = [half.x - Math.abs(end.x), half.y - Math.abs(end.y), half.z - Math.abs(end.z)];
          const axis = margins.indexOf(Math.min(...margins));
          difference.set(0, 0, 0).setComponent(axis, end.getComponent(axis) < 0 ? -1 : 1);
          closest.setComponent(axis, difference.getComponent(axis) * half.getComponent(axis));
          penetration = node.radius + margins[axis];
        }
      } else {
        this.expandedHalf.set(half.x + node.radius, half.y + node.radius, half.z + node.radius);
        const hit = sweepExpandedBox(start, end, this.expandedHalf);
        if (!hit) continue;
        difference.copy(hit.normal);
        end.lerpVectors(start, end, hit.fraction);
        node.position.copy(end).applyQuaternion(board.orientation).add(board.position);
        closest.set(
          clamp(end.x, -half.x, half.x),
          clamp(end.y, -half.y, half.y),
          clamp(end.z, -half.z, half.z),
        );
      }
      contacts += 1;
      const normal = this.boardWorldNormal.copy(difference).applyQuaternion(board.orientation);
      const contactPoint = this.boardWorldContact.copy(closest).applyQuaternion(board.orientation)
        .add(board.position);
      if (penetration > 0) {
        const inverseNode = 1 / node.mass;
        const inverseTotal = inverseNode + board.inverseMass;
        node.position.addScaledVector(normal, penetration * inverseNode / inverseTotal);
        board.position.addScaledVector(normal, -penetration * board.inverseMass / inverseTotal);
      }
      board.velocityAt(contactPoint, this.boardPointVelocity);
      const approach = this.boardRelativeVelocity.subVectors(node.velocity, this.boardPointVelocity)
        .dot(normal);
      if (approach >= 0) continue;
      const inverseEffective = 1 / node.mass + board.inverseEffectiveMass(contactPoint, normal);
      if (!(inverseEffective > 0)) continue;
      const normalImpulse = -(1 + BOARD_RESTITUTION) * approach / inverseEffective;
      const impulse = this.boardImpulse.copy(normal).multiplyScalar(normalImpulse);
      node.velocity.addScaledVector(impulse, 1 / node.mass);
      this.lastContacts.board.add(impulse);
      board.applyImpulse(impulse.multiplyScalar(-1), contactPoint);
      board.velocityAt(contactPoint, this.boardPointVelocity);
      this.boardRelativeVelocity.subVectors(node.velocity, this.boardPointVelocity);
      const tangent = this.boardTangent.copy(this.boardRelativeVelocity)
        .addScaledVector(normal, -this.boardRelativeVelocity.dot(normal));
      const tangentialSpeed = tangent.length();
      if (tangentialSpeed < 1e-9) continue;
      tangent.divideScalar(tangentialSpeed);
      const tangentInverseMass = 1 / node.mass + board.inverseEffectiveMass(contactPoint, tangent);
      if (!(tangentInverseMass > 0)) continue;
      const frictionImpulse = Math.min(tangentialSpeed / tangentInverseMass,
        BOARD_FRICTION * normalImpulse);
      node.velocity.addScaledVector(tangent, -frictionImpulse / node.mass);
      this.lastContacts.board.addScaledVector(tangent, -frictionImpulse);
      board.applyImpulse(this.boardImpulse.copy(tangent).multiplyScalar(frictionImpulse), contactPoint);
    }
    return contacts;
  }

  /**
   * Swept contact with a coarse airborne lip parcel. Only a bounded fraction
   * of its mass participates in one strike; the equal opposite impulse changes
   * the full parcel velocity so landing deposits its post-contact momentum.
   * The wave adapter must provide a stable parcel id and updated velocity.
   */
  resolveLipContact(parcel: LipContactParcel): number {
    if (!this.active || !this.lipContactPending || this.contactedLipIds.has(parcel.id)
      || !(parcel.volume > 0 && parcel.radius > 0)) return 0;
    this.contactedLipIds.add(parcel.id);
    const parcelMass = WATER_DENSITY * parcel.volume;
    let contacts = 0;
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const start = this.lipStart.subVectors(this.previous[index], parcel.previousPosition);
      const end = this.lipEnd.subVectors(node.position, parcel.position);
      const travel = this.lipTravel.subVectors(end, start);
      const travelSquared = travel.lengthSq();
      const combinedRadius = node.radius + parcel.radius;
      const startOutside = start.lengthSq() > combinedRadius * combinedRadius;
      let fraction = 0;
      if (startOutside) {
        if (travelSquared < 1e-12) continue;
        const along = start.dot(travel);
        const discriminant = along * along
          - travelSquared * (start.lengthSq() - combinedRadius * combinedRadius);
        if (discriminant < 0) continue;
        fraction = (-along - Math.sqrt(discriminant)) / travelSquared;
        if (fraction < 0 || fraction > 1) continue;
      }
      const nearest = this.lipClosest.copy(start).addScaledVector(travel, fraction);
      const distance = nearest.length();
      const normal = distance > 1e-9 ? nearest.divideScalar(distance) : nearest.copy(start).normalize();
      if (normal.lengthSq() < 1e-9) normal.set(0, 1, 0);
      const approach = this.lipRelativeVelocity.subVectors(node.velocity, parcel.velocity).dot(normal);
      if (approach >= 0) continue;
      const effectiveMass = Math.min(parcelMass * LIP_CONTACT_FRACTION, node.mass * 0.5);
      const impulseMagnitude = Math.min(-approach / (1 / node.mass + 1 / effectiveMass),
        node.mass * MAX_LIP_BODY_DELTA_SPEED);
      const impulse = this.lipImpulse.copy(normal).multiplyScalar(impulseMagnitude);
      node.velocity.addScaledVector(impulse, 1 / node.mass);
      this.lastContacts.lip.add(impulse);
      parcel.velocity.addScaledVector(impulse, -1 / parcelMass);
      contacts += 1;
    }
    return contacts;
  }

  step(dt: number, water: BodyWaterField, input: SwimInput = { stroke: false, steer: 0 }): void {
    if (!this.active) return;
    if (!(dt > 0 && dt <= 1 / 20)) throw new RangeError('expected a fixed step no larger than 1/20 s');

    let relativeSpeed = 0;
    let breaking = 0;
    let wetMass = 0;
    this.outsideDomain = false;
    for (const force of Object.values(this.lastForces)) force.set(0, 0, 0);
    this.lastContacts.board.set(0, 0, 0);
    this.lastContacts.lip.set(0, 0, 0);
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const force = this.forces[index].set(0, -node.mass * GRAVITY, 0);
      this.lastForces.gravity.y -= node.mass * GRAVITY;
      water.sampleAt(node.position, this.sample);
      this.previous[index].copy(node.position);
      this.bedY[index] = this.sample.outsideDomain ? -Infinity : this.sample.bedY;
      node.grounded = false;
      if (this.sample.outsideDomain) {
        this.outsideDomain = true;
        node.submersion = 0;
        continue;
      }
      node.submersion = this.sample.wet
        ? submergedFraction(this.sample.surfaceY - node.position.y, node.radius) : 0;
      const buoyancy = WATER_DENSITY * GRAVITY * node.volume * node.submersion;
      force.y += buoyancy;
      this.lastForces.buoyancy.y += buoyancy;
      const relative = this.sample.wet
        ? this.relative.subVectors(node.velocity, this.sample.flow)
        : this.relative.copy(node.velocity);
      const speed = relative.length();
      const area = Math.PI * node.radius * node.radius;
      const density = WATER_DENSITY * node.submersion + AIR_DENSITY * (1 - node.submersion);
      const dragMagnitude = Math.min(
        0.5 * density * DRAG_COEFFICIENT * area * speed,
        node.mass / dt,
      );
      force.addScaledVector(relative, -dragMagnitude);
      this.lastForces.drag.addScaledVector(relative, -dragMagnitude);
      if (node.submersion > 0) {
        relativeSpeed += speed * node.mass;
        wetMass += node.mass;
        breaking = Math.max(breaking, clamp(this.sample.breaking, 0, 1));
      }
    }

    this.centerOfMass(this.controlCenter);
    this.controlSpin.set(0, 0, 0);
    let xx = 0; let yy = 0; let zz = 0;
    let xy = 0; let xz = 0; let yz = 0;
    for (const node of this.nodes) {
      this.controlLever.subVectors(node.position, this.controlCenter);
      this.controlTorque.crossVectors(this.controlLever, node.velocity).multiplyScalar(node.mass);
      this.controlSpin.add(this.controlTorque);
      const { x, y, z } = this.controlLever;
      xx += node.mass * (y * y + z * z);
      yy += node.mass * (x * x + z * z);
      zz += node.mass * (x * x + y * y);
      xy -= node.mass * x * y;
      xz -= node.mass * x * z;
      yz -= node.mass * y * z;
    }
    this.controlInertia.set(xx, xy, xz, xy, yy, yz, xz, yz, zz);
    this.angularSpeed = Math.abs(this.controlInertia.determinant()) < 1e-9
      ? 100
      : Math.min(100, this.controlSpin.applyMatrix3(this.controlInertia.invert()).length());
    const meanRelativeSpeed = wetMass > 0 ? relativeSpeed / wetMass : Infinity;
    if (this.swimEligible) {
      if (meanRelativeSpeed > 4 || this.angularSpeed > 8 || breaking > 0.7) this.swimEligible = false;
    } else if (meanRelativeSpeed < 2.5 && this.angularSpeed < 5 && breaking < 0.4) {
      this.swimEligible = true;
    }
    const calm = this.swimEligible
      ? clamp((4 - meanRelativeSpeed) / 3, 0, 1)
        * clamp((8 - this.angularSpeed) / 6, 0, 1) * (1 - breaking)
      : 0;
    this.controlGain += (calm - this.controlGain) * Math.min(1, dt * 3);
    this.heading += clamp(input.steer, -1, 1) * this.controlGain * dt * 2;

    if (input.stroke && this.controlGain > 0) {
      const direction = this.strokeDirection.set(Math.sin(this.heading), 0.3, Math.cos(this.heading)).normalize();
      for (const index of [3, 4, 5, 6]) {
        if (this.nodes[index].submersion <= 0) continue;
        const thrust = index < 5 ? 75 : 30;
        const magnitude = thrust * this.controlGain * this.nodes[index].submersion;
        this.forces[index].addScaledVector(direction, magnitude);
        this.lastForces.swim.addScaledVector(direction, magnitude);
      }
    }

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      node.velocity.addScaledVector(this.forces[index], dt / node.mass);
      node.position.addScaledVector(node.velocity, dt);
    }

    // Angle bounds are endpoint-distance inequalities around each joint.
    // Axial, mass-weighted corrections conserve the point system's linear
    // and angular momentum in free space.
    for (let iteration = 0; iteration < 10; iteration += 1) {
      for (const link of links) {
        this.solveDistance(link.a, link.b, link.length, link.length);
      }
      for (const limit of angleLimits) {
        this.solveDistance(limit.a, limit.b, limit.minDistance, limit.maxDistance);
      }
      for (let index = 0; index < this.nodes.length; index += 1) {
        const node = this.nodes[index];
        const floor = this.bedY[index] + node.radius;
        if (node.position.y < floor) {
          node.position.y = floor;
          node.grounded = true;
        }
      }
    }

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      node.velocity.subVectors(node.position, this.previous[index]).divideScalar(dt);
      if (node.grounded) {
        node.velocity.y = Math.max(0, node.velocity.y);
        node.velocity.x *= 0.8;
        node.velocity.z *= 0.8;
      }
    }
    this.contactPending = true;
    this.lipContactPending = true;
    this.contactedLipIds.clear();
  }
}
