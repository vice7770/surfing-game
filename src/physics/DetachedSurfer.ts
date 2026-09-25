import { Quaternion, Vector3 } from 'three';

/** World-space sample at one body point. The water implementation owns the interpolation. */
export interface BodyWaterSample {
  surfaceY: number;
  bedY: number;
  flow: Vector3;
  wet: boolean;
  outsideDomain: boolean;
  breaking: number;
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

const totalMass = SPECS.reduce((sum, spec) => sum + spec.mass, 0);
const localCenter = SPECS.reduce(
  (center, spec) => center.addScaledVector(spec.local, spec.mass / totalMass),
  new Vector3(),
);
const localOffsets = SPECS.map((spec) => spec.local.clone().sub(localCenter));
const links = LINKS.map(([a, b]) => ({
  a, b, length: localOffsets[a].distanceTo(localOffsets[b]),
}));

/**
 * Solver-independent post-wipeout body. Seven buoyant mass points and distance
 * joints provide a deterministic first integration slice. Angle limits, lip
 * contact, and board grabbing belong to later P4 gates.
 */
export class DetachedSurfer implements DetachedRiderPose {
  readonly nodes: readonly BodyNode[];
  active = false;
  controlGain = 0;
  heading = 0;
  outsideDomain = false;
  private readonly previous: Vector3[];
  private readonly bedY: number[];
  private readonly sample: BodyWaterSample = {
    surfaceY: 0, bedY: 0, flow: new Vector3(), wet: false, outsideDomain: false, breaking: 0,
  };
  private readonly forces: Vector3[];
  private readonly relative = new Vector3();
  private readonly strokeDirection = new Vector3();
  private readonly linkDelta = new Vector3();

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
    this.outsideDomain = false;
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

  step(dt: number, water: BodyWaterField, input: SwimInput = { stroke: false, steer: 0 }): void {
    if (!this.active) return;
    if (!(dt > 0 && dt <= 1 / 20)) throw new RangeError('expected a fixed step no larger than 1/20 s');

    let relativeSpeed = 0;
    let breaking = 0;
    let wetMass = 0;
    this.outsideDomain = false;
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const force = this.forces[index].set(0, -node.mass * GRAVITY, 0);
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
      force.y += WATER_DENSITY * GRAVITY * node.volume * node.submersion;
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
      if (node.submersion > 0) {
        relativeSpeed += speed * node.mass;
        wetMass += node.mass;
        breaking = Math.max(breaking, clamp(this.sample.breaking, 0, 1));
      }
    }

    const meanRelativeSpeed = wetMass > 0 ? relativeSpeed / wetMass : Infinity;
    const calm = clamp((4 - meanRelativeSpeed) / 3, 0, 1) * (1 - breaking);
    this.controlGain += (calm - this.controlGain) * Math.min(1, dt * 3);
    this.heading += clamp(input.steer, -1, 1) * this.controlGain * dt * 2;

    if (input.stroke && this.controlGain > 0) {
      const direction = this.strokeDirection.set(Math.sin(this.heading), 0.3, Math.cos(this.heading)).normalize();
      for (const index of [3, 4, 5, 6]) {
        if (this.nodes[index].submersion <= 0) continue;
        const thrust = index < 5 ? 75 : 30;
        this.forces[index].addScaledVector(direction,
          thrust * this.controlGain * this.nodes[index].submersion);
      }
    }

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      node.velocity.addScaledVector(this.forces[index], dt / node.mass);
      node.position.addScaledVector(node.velocity, dt);
    }

    // Mass-weighted, axial corrections preserve total linear momentum and do
    // not inject a constraint torque. The first slice leaves angle limits open.
    const delta = this.linkDelta;
    for (let iteration = 0; iteration < 6; iteration += 1) {
      for (const link of links) {
        const a = this.nodes[link.a];
        const b = this.nodes[link.b];
        delta.subVectors(b.position, a.position);
        const distance = delta.length();
        if (distance < 1e-9) continue;
        const error = (distance - link.length) / distance;
        const inverseA = 1 / a.mass;
        const inverseB = 1 / b.mass;
        a.position.addScaledVector(delta, error * inverseA / (inverseA + inverseB));
        b.position.addScaledVector(delta, -error * inverseB / (inverseA + inverseB));
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
  }
}
