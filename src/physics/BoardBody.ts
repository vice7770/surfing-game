import { Quaternion, Vector3 } from 'three';
import type { AttachedRider } from './AttachedRider';
import type { BoardContactBody } from './DetachedSurfer';
import { buildBoardShape, type BoardShape } from './boardShape';
import { WATER, WET_RAMP, createPatchForce, patchForce, planingScales, wettedShare, type WorldPatch } from './hullForces';
import { createWaterSample, type SurfWater, type WaterSample } from './SurfWater';

interface Vec { x: number; y: number; z: number }

/** A rigid mass carried by the board at a board-frame point: a stand-in for the rider's weight until P4d. */
export interface BoardPayload {
  mass: number;
  point: Vec;
}

/** Work done on the board since it was placed, J. With the kinetic energy it closes the energy ledger. */
export interface BoardWork {
  gravity: number;
  buoyancy: number;
  pressure: number;
  /** Exchanged with the water the board sets moving along its normals. */
  addedMass: number;
  radiation: number;
  friction: number;
  bed: number;
  /** Done by the rider's contact on the board. */
  rider: number;
}

export interface BoardBodyOptions {
  shape?: BoardShape;
  payloads?: BoardPayload[];
  /** Substeps per `step` (4 at 1/60 s). */
  substeps?: number;
}

/**
 * Added mass of a flat section wetted over beam b, ρπb²/8 per unit length (the
 * planing strip-theory value, Zarnick 1978), spread over the section: ρπb/8 per
 * unit of area projected on the local water surface, against motion into it. The rate of change of added mass (the slam
 * term) is left to the planing pressure, and the water's own acceleration is
 * left to the hydrostatic slope force. Added mass gained as a patch wets meets it
 * inelastically, sharing its normal momentum (von Kármán's water-entry model).
 */
const ADDED_MASS_PER_AREA = Math.PI / 8;
/**
 * Wave radiation damping of motion into the surface at each wetted patch, as a share of the
 * critical heave damping of a floating strip with that added mass: a modelling
 * choice so a floating board settles in a cycle or two rather than ringing.
 * Per unit area it is ρ · 2ζ√(gπb/8).
 */
const RADIATION_DAMPING = 0.5;

/**
 * Water entry is impulsive: a face must take several substeps to wet, or a
 * rail-first landing is resolved while the board is still rolled. A substep is
 * halved, up to this many times, while any face approaching the water would
 * cross more than `ENTRY_CROSSING` of the wetting ramp within it.
 */
const MAX_REFINEMENT = 4;
const ENTRY_CROSSING = WET_RAMP / 4;

/** Seabed contact: Coulomb friction of foam on sand, share of penetration removed per substep, allowed overlap (m), passes. */
const BED_FRICTION = 0.6;
const BED_BIAS = 0.2;
const BED_SLOP = 0.002;
const BED_ITERATIONS = 4;

/** 3 × 3 row-major product R A Rᵀ, using `t` as scratch. */
function rotateTensor(r: number[], a: number[], out: number[], t: number[]): void {
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) t[i * 3 + j] = r[i * 3] * a[j] + r[i * 3 + 1] * a[3 + j] + r[i * 3 + 2] * a[6 + j];
  }
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) out[i * 3 + j] = t[i * 3] * r[j * 3] + t[i * 3 + 1] * r[j * 3 + 1] + t[i * 3 + 2] * r[j * 3 + 2];
  }
}

function invert3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/**
 * Solve the 6 × 6 system A x = b in place by Gaussian elimination with partial
 * pivoting; x overwrites b and A is destroyed. The board alone is symmetric; a
 * standing rider, carried at the feet but pushing along its own line, is not.
 */
function solve6(a: Float64Array, b: Float64Array): void {
  for (let col = 0; col < 6; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 6; row += 1) if (Math.abs(a[row * 6 + col]) > Math.abs(a[pivot * 6 + col])) pivot = row;
    if (pivot !== col) {
      for (let k = 0; k < 6; k += 1) {
        const t = a[col * 6 + k];
        a[col * 6 + k] = a[pivot * 6 + k];
        a[pivot * 6 + k] = t;
      }
      const t = b[col];
      b[col] = b[pivot];
      b[pivot] = t;
    }
    const diagonal = a[col * 6 + col];
    for (let row = col + 1; row < 6; row += 1) {
      const factor = a[row * 6 + col] / diagonal;
      if (factor === 0) continue;
      for (let k = col; k < 6; k += 1) a[row * 6 + k] -= factor * a[col * 6 + k];
      b[row] -= factor * b[col];
    }
  }
  for (let row = 5; row >= 0; row -= 1) {
    let value = b[row];
    for (let k = row + 1; k < 6; k += 1) value -= a[row * 6 + k] * b[k];
    b[row] = value / a[row * 6 + row];
  }
}

/**
 * The shortboard as one rigid body on sampled water (board plan B1, wave plan
 * P4c). Its mass and inertia come from the reference hull, plus any payloads.
 * Each substep samples the water at every bottom patch and applies buoyancy,
 * planing pressure (concentrated behind each strip's spray root) and skin
 * friction there (`hullForces`), gravity at the centre of mass, and seabed
 * contact at each patch's bottom and deck points.
 *
 * - **Water inertia:** added mass, water entry and radiation damping against
 *   each wetted patch's motion into the local surface (see the constants), so
 *   the light board moves with the water it sets moving and settles instead of
 *   ringing. Planing and sliding along a face move no point into the surface, so
 *   their lift stays with the pressure.
 * - **Integration:** semi-implicit Euler, with the planing pressure linearly
 *   implicit along each patch normal and the water's inertia implicit, so a
 *   light board meeting water fast (a drop, a riderless board in whitewater)
 *   stops without bouncing off its own pressure. Substeps halve while a face
 *   enters the water.
 * - **Reactions:** each patch's hydrodynamic impulse over the step is handed to
 *   the water once, after the step, at the patch's mean position.
 * - **Contact seam:** it is the `BoardContactBody` the detached surfer strikes
 *   and grabs. The contact box is centred on the board's own centre of mass, and
 *   moves of `position` made between steps are carried into the body.
 * - **Not modelled yet:** fins and rail grip (P4e), and a sloping seabed normal.
 */
export class BoardBody implements BoardContactBody {
  readonly shape: BoardShape;
  /** Board and payloads, kg. */
  readonly mass: number;
  readonly inverseMass: number;
  readonly halfExtents: Vector3;
  /** The board's own centre of mass: the contact box centre. */
  readonly position = new Vector3();
  readonly orientation = new Quaternion();
  /** Centre of mass of the board and payloads, and its velocity. */
  readonly centerOfMass = new Vector3();
  readonly velocity = new Vector3();
  /** World frame, rad/s. */
  readonly angularVelocity = new Vector3();
  readonly work: BoardWork = { gravity: 0, buoyancy: 0, pressure: 0, addedMass: 0, radiation: 0, friction: 0, bed: 0, rider: 0 };
  /** The rider standing or lying on the board, coupled through its contacts. */
  rider?: AttachedRider;
  /** Mean forces over the latest step, N. */
  readonly forces = {
    buoyancy: new Vector3(), pressure: new Vector3(), addedMass: new Vector3(), radiation: new Vector3(), friction: new Vector3(), bed: new Vector3(),
  };
  /** Hull volume under water and wetted bottom area at the latest substep. */
  submergedVolume = 0;
  wettedArea = 0;
  /** Patches that sampled beyond the water's domain at the latest substep. */
  outsidePatches = 0;

  private readonly substeps: number;
  private readonly count: number;
  private readonly bodyInertia: number[];
  private readonly bodyInverseInertia: number[];
  /** Board centre of mass relative to the composite centre, board frame. */
  private readonly boardOffset: Vec;
  private readonly local: Float64Array;
  private readonly localNormal: Float64Array;
  private readonly area: Float64Array;
  private readonly thickness: Float64Array;
  private readonly alongBoard: Float64Array;
  /** Added mass and radiation damping per unit wetted area, and their values this substep, by patch. */
  private readonly addedMassPerArea: Float64Array;
  private readonly radiationPerArea: Float64Array;
  private readonly addedMass: Float64Array;
  /** Added mass gained this substep: water newly set moving, which shares the patch's momentum into the surface. */
  private readonly entrained: Float64Array;
  private readonly previousAddedMass: Float64Array;
  private readonly radiation: Float64Array;
  /** Each patch's speed into the local water surface, and that surface's normal, at the start of the substep. */
  private readonly surfaceSpeed: Float64Array;
  private readonly surfaceNormal: Float64Array;
  /** Patch indices of each strip along the board, tail to nose, and each patch's planing pressure scale. */
  private readonly strips: Int32Array[];
  private readonly pressureScale: Float64Array;
  private readonly stripShares: Float64Array;
  private readonly stripBeams: Float64Array;
  private readonly stripScales: Float64Array;
  private readonly beam: Float64Array;
  private readonly stationLength: number;
  private readonly samples: WaterSample[];
  private readonly arm: Float64Array;
  private readonly normal: Float64Array;
  private readonly point: Float64Array;
  private readonly damping: Float64Array;
  private readonly reaction: Float64Array;
  private readonly meanPosition: Float64Array;
  private readonly bedImpulse: Float64Array;
  private readonly rotation = new Array<number>(9).fill(0);
  private readonly worldInertia = new Array<number>(9).fill(0);
  private readonly worldInverseInertia = new Array<number>(9).fill(0);
  private readonly system = new Float64Array(36);
  private readonly rhs = new Float64Array(6);
  private readonly systemCopy = new Float64Array(36);
  private readonly rhsCopy = new Float64Array(6);
  private readonly lastPosition = new Vector3();
  private readonly patch: WorldPatch = { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 }, area: 0, thickness: 0 };
  private readonly force = createPatchForce();
  private readonly spin = new Quaternion();
  private readonly inverse = new Quaternion();
  private readonly scratch = new Vector3();
  private readonly armScratch = new Vector3();
  private readonly normalScratch = new Vector3();
  private readonly relative = { x: 0, y: 0, z: 0 };
  private readonly direction = new Float64Array(6);
  private readonly tensorScratch = new Array<number>(9).fill(0);

  constructor(options: BoardBodyOptions = {}) {
    const shape = options.shape ?? buildBoardShape();
    const payloads = options.payloads ?? [];
    this.shape = shape;
    this.substeps = options.substeps ?? 4;
    this.mass = shape.mass + payloads.reduce((sum, payload) => sum + payload.mass, 0);
    this.inverseMass = 1 / this.mass;
    const maxThickness = Math.max(...shape.patches.map((patch) => patch.thickness));
    this.halfExtents = new Vector3(shape.maxWidth / 2, maxThickness / 2, shape.length / 2);

    const board = shape.centerOfMass;
    const center = { x: board.x * shape.mass, y: board.y * shape.mass, z: board.z * shape.mass };
    for (const { mass, point } of payloads) {
      center.x += mass * point.x;
      center.y += mass * point.y;
      center.z += mass * point.z;
    }
    center.x /= this.mass;
    center.y /= this.mass;
    center.z /= this.mass;
    this.boardOffset = { x: board.x - center.x, y: board.y - center.y, z: board.z - center.z };
    // Parallel axis: the board's own tensor, moved to the composite centre, plus the payload points.
    const inertia = [...shape.inertia];
    const addPoint = (mass: number, r: Vec) => {
      const rr = [r.x, r.y, r.z];
      const r2 = r.x * r.x + r.y * r.y + r.z * r.z;
      for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) inertia[i * 3 + j] += mass * ((i === j ? r2 : 0) - rr[i] * rr[j]);
    };
    addPoint(shape.mass, this.boardOffset);
    for (const { mass, point } of payloads) addPoint(mass, { x: point.x - center.x, y: point.y - center.y, z: point.z - center.z });
    this.bodyInertia = inertia;
    this.bodyInverseInertia = invert3(inertia);

    const count = shape.patches.length;
    this.count = count;
    this.local = new Float64Array(count * 3);
    this.localNormal = new Float64Array(count * 3);
    this.area = new Float64Array(count);
    this.thickness = new Float64Array(count);
    this.alongBoard = new Float64Array(count);
    shape.patches.forEach((patch, k) => {
      this.local.set([patch.position.x - center.x, patch.position.y - center.y, patch.position.z - center.z], k * 3);
      this.localNormal.set([patch.normal.x, patch.normal.y, patch.normal.z], k * 3);
      this.area[k] = patch.area;
      this.thickness[k] = patch.thickness;
      this.alongBoard[k] = patch.position.z;
    });
    this.stationLength = shape.patches[0].length;
    // Each station's beam: its patches' planform over the station length.
    const beam = new Map<number, number>();
    for (const patch of shape.patches) beam.set(patch.position.z, (beam.get(patch.position.z) ?? 0) + patch.area / patch.length);
    this.addedMassPerArea = new Float64Array(count);
    this.radiationPerArea = new Float64Array(count);
    shape.patches.forEach((patch, k) => {
      const b = beam.get(patch.position.z) ?? 0;
      this.addedMassPerArea[k] = WATER.density * ADDED_MASS_PER_AREA * b;
      this.radiationPerArea[k] = WATER.density * 2 * RADIATION_DAMPING * Math.sqrt((WATER.gravity * Math.PI * b) / 8);
    });
    this.addedMass = new Float64Array(count);
    this.entrained = new Float64Array(count);
    this.previousAddedMass = new Float64Array(count);
    this.radiation = new Float64Array(count);
    this.surfaceSpeed = new Float64Array(count);
    // The j-th patch across each station forms strip j, sorted tail to nose.
    const strips: number[][] = [];
    const placed = new Map<number, number>();
    shape.patches.forEach((patch, k) => {
      const j = placed.get(patch.position.z) ?? 0;
      placed.set(patch.position.z, j + 1);
      (strips[j] ??= []).push(k);
    });
    this.strips = strips.map((strip) => Int32Array.from(strip.sort((a, b) => shape.patches[a].position.z - shape.patches[b].position.z)));
    this.pressureScale = new Float64Array(count).fill(1);
    this.stripShares = new Float64Array(beam.size);
    this.stripBeams = new Float64Array(beam.size);
    this.stripScales = new Float64Array(beam.size);
    this.beam = Float64Array.from(shape.patches, (patch) => beam.get(patch.position.z) ?? 0);
    this.surfaceNormal = new Float64Array(count * 3);
    this.samples = shape.patches.map(() => createWaterSample());
    this.arm = new Float64Array(count * 3);
    this.normal = new Float64Array(count * 3);
    this.point = new Float64Array(count * 3);
    this.damping = new Float64Array(count);
    this.reaction = new Float64Array(count * 3);
    this.meanPosition = new Float64Array(count * 2);
    this.bedImpulse = new Float64Array(count * 2 * 3);
    this.place(new Vector3());
  }

  get outsideDomain(): boolean {
    return this.outsidePatches > 0;
  }

  /** Put the board's own centre of mass at `position`, moving uniformly at `velocity` and spinning at `angularVelocity`. */
  place(position: Vector3, orientation = new Quaternion(), velocity = new Vector3(), angularVelocity = new Vector3()): void {
    this.orientation.copy(orientation).normalize();
    this.updateRotation();
    const offset = this.rotate(this.boardOffset, this.scratch);
    this.centerOfMass.copy(position).sub(offset);
    this.velocity.copy(velocity);
    this.angularVelocity.copy(angularVelocity);
    this.syncPosition();
    this.previousAddedMass.fill(0);
    for (const key of Object.keys(this.work) as (keyof BoardWork)[]) this.work[key] = 0;
  }

  /** Put a rider on the board, in its posture and moving with the board. */
  attach(rider: AttachedRider): void {
    this.rider = rider;
    rider.mount(this);
  }

  /** A board-frame point (the shape's coordinates) in the world. */
  toWorld(local: Readonly<Vec>, out: Vector3): Vector3 {
    const c = this.shape.centerOfMass;
    return out.set(local.x - c.x, local.y - c.y, local.z - c.z).applyQuaternion(this.orientation).add(this.position);
  }

  /** A world point in the board frame. */
  toLocal(world: Readonly<Vec>, out: Vector3): Vector3 {
    const c = this.shape.centerOfMass;
    this.inverse.copy(this.orientation).invert();
    return out.set(world.x - this.position.x, world.y - this.position.y, world.z - this.position.z).applyQuaternion(this.inverse).add(c);
  }

  /** A board-frame 3 × 3 tensor (row-major) in the world: R A Rᵀ. */
  rotateTensor(local: number[], out: number[]): void {
    this.updateRotation();
    rotateTensor(this.rotation, local, out, this.tensorScratch);
  }

  kineticEnergy(): number {
    const w = this.angularVelocity;
    const I = this.worldInertia;
    const Iw = [I[0] * w.x + I[1] * w.y + I[2] * w.z, I[3] * w.x + I[4] * w.y + I[5] * w.z, I[6] * w.x + I[7] * w.y + I[8] * w.z];
    return 0.5 * this.mass * this.velocity.lengthSq() + 0.5 * (w.x * Iw[0] + w.y * Iw[1] + w.z * Iw[2]);
  }

  /** Height of the lowest point of the hull slab, m. */
  lowestPoint(): number {
    this.updateRotation();
    let lowest = Infinity;
    for (let k = 0; k < this.count; k += 1) {
      const r = this.rotateArray(this.local, k, this.armScratch);
      const n = this.rotateArray(this.localNormal, k, this.normalScratch);
      const bottom = this.centerOfMass.y + r.y;
      lowest = Math.min(lowest, bottom, bottom - n.y * this.thickness[k]);
    }
    return lowest;
  }

  velocityAt(worldPoint: Readonly<Vector3>, out: Vector3): Vector3 {
    const w = this.angularVelocity;
    const rx = worldPoint.x - this.centerOfMass.x;
    const ry = worldPoint.y - this.centerOfMass.y;
    const rz = worldPoint.z - this.centerOfMass.z;
    return out.set(this.velocity.x + w.y * rz - w.z * ry, this.velocity.y + w.z * rx - w.x * rz, this.velocity.z + w.x * ry - w.y * rx);
  }

  inverseEffectiveMass(worldPoint: Readonly<Vector3>, normal: Readonly<Vector3>): number {
    this.updateRotation();
    return this.inverseEffective(worldPoint.x - this.centerOfMass.x, worldPoint.y - this.centerOfMass.y, worldPoint.z - this.centerOfMass.z, normal.x, normal.y, normal.z);
  }

  applyImpulse(impulse: Readonly<Vector3>, worldPoint: Readonly<Vector3>): void {
    this.updateRotation();
    this.impulseAt(worldPoint.x - this.centerOfMass.x, worldPoint.y - this.centerOfMass.y, worldPoint.z - this.centerOfMass.z, impulse.x, impulse.y, impulse.z);
  }

  /** Advance by `dt` on `water`, then hand the water its reactions. */
  step(dt: number, water: SurfWater): void {
    // A contact solver may have moved the board between steps.
    this.centerOfMass.add(this.scratch.subVectors(this.position, this.lastPosition));
    const h = dt / this.substeps;
    this.reaction.fill(0);
    this.meanPosition.fill(0);
    for (const force of Object.values(this.forces)) force.set(0, 0, 0);
    this.rider?.beginStep();
    for (let s = 0; s < this.substeps; s += 1) this.advance(h, water, 0);
    const inverseDt = 1 / dt;
    for (const force of Object.values(this.forces)) force.multiplyScalar(inverseDt);
    this.rider?.endStep(dt, water, this);
    for (let k = 0; k < this.count; k += 1) {
      const jx = this.reaction[k * 3];
      const jy = this.reaction[k * 3 + 1];
      const jz = this.reaction[k * 3 + 2];
      if (jx === 0 && jy === 0 && jz === 0) continue;
      water.addReaction(this.meanPosition[k * 2] * inverseDt, this.meanPosition[k * 2 + 1] * inverseDt, jx, jy, jz);
    }
  }

  private advance(h: number, water: SurfWater, depth: number): void {
    if (depth < MAX_REFINEMENT && this.entering(h)) {
      this.advance(h / 2, water, depth + 1);
      this.advance(h / 2, water, depth + 1);
    } else {
      this.substep(h, water);
    }
  }

  /** Whether a face moving into the water, against the latest samples, would wet too fast in a substep of `h`. */
  private entering(h: number): boolean {
    this.updateRotation();
    const { samples, velocity: v, angularVelocity: w, centerOfMass: c } = this;
    for (let k = 0; k < this.count; k += 1) {
      const sample = samples[k];
      if (!sample.wet || sample.outsideDomain) continue;
      const r = this.rotateArray(this.local, k, this.armScratch);
      const n = this.rotateArray(this.localNormal, k, this.normalScratch);
      for (let face = 0; face < 2; face += 1) {
        const t = face === 0 ? 0 : this.thickness[k];
        const rx = r.x - n.x * t;
        const ry = r.y - n.y * t;
        const rz = r.z - n.z * t;
        const sinking = -(v.y + w.z * rx - w.x * rz - sample.flowY) * h;
        if (!(sinking > ENTRY_CROSSING)) continue;
        const depth = sample.surfaceY - (c.y + ry);
        if (depth < WET_RAMP / 2 && depth + sinking > -WET_RAMP / 2) return true;
      }
    }
    return false;
  }

  private substep(h: number, water: SurfWater): void {
    this.updateRotation();
    const { count, arm, normal, point, samples, centerOfMass: c, velocity: v, angularVelocity: w } = this;
    let wetMin = Infinity;
    let wetMax = -Infinity;
    this.outsidePatches = 0;
    for (let k = 0; k < count; k += 1) {
      const r = this.rotateArray(this.local, k, this.armScratch);
      const n = this.rotateArray(this.localNormal, k, this.normalScratch);
      arm.set([r.x, r.y, r.z], k * 3);
      normal.set([n.x, n.y, n.z], k * 3);
      point.set([c.x + r.x, c.y + r.y, c.z + r.z], k * 3);
      const sample = water.sampleAt(c.x + r.x, c.y + r.y, c.z + r.z, samples[k]);
      if (sample.outsideDomain) this.outsidePatches += 1;
      if (sample.wet && !sample.outsideDomain && wettedShare(sample.surfaceY - (c.y + r.y)) > 0) {
        wetMin = Math.min(wetMin, this.alongBoard[k]);
        wetMax = Math.max(wetMax, this.alongBoard[k]);
      }
    }
    const wettedLength = wetMax >= wetMin ? wetMax - wetMin + this.stationLength : this.stationLength;
    this.placePressure();

    // Forces, torques about the centre of mass, and the implicit pressure matrix.
    const { system, rhs, force, patch } = this;
    system.fill(0);
    const totals = { bx: 0, by: 0, bz: 0, btx: 0, bty: 0, btz: 0, px: 0, py: 0, pz: 0, ptx: 0, pty: 0, ptz: 0, fx: 0, fy: 0, fz: 0, ftx: 0, fty: 0, ftz: 0 };
    let submerged = 0;
    let wetted = 0;
    let waterX = 0;
    let waterY = 0;
    let waterZ = 0;
    let waterTx = 0;
    let waterTy = 0;
    let waterTz = 0;
    for (let k = 0; k < count; k += 1) {
      const rx = arm[k * 3];
      const ry = arm[k * 3 + 1];
      const rz = arm[k * 3 + 2];
      const nx = normal[k * 3];
      const ny = normal[k * 3 + 1];
      const nz = normal[k * 3 + 2];
      const sample = samples[k];
      patch.position.x = point[k * 3];
      patch.position.y = point[k * 3 + 1];
      patch.position.z = point[k * 3 + 2];
      patch.normal.x = nx;
      patch.normal.y = ny;
      patch.normal.z = nz;
      patch.area = this.area[k];
      patch.thickness = this.thickness[k];
      const { relative } = this;
      relative.x = v.x + w.y * rz - w.z * ry - sample.flowX;
      relative.y = v.y + w.z * rx - w.x * rz - sample.flowY;
      relative.z = v.z + w.x * ry - w.y * rx - sample.flowZ;
      patchForce(patch, sample, relative, wettedLength, force, this.pressureScale[k]);
      submerged += force.submerged * patch.area * patch.thickness;
      wetted += force.wettedArea;
      const b = force.buoyancy;
      const bx = force.buoyancyPoint.x - c.x;
      const by = force.buoyancyPoint.y - c.y;
      const bz = force.buoyancyPoint.z - c.z;
      totals.bx += b.x;
      totals.by += b.y;
      totals.bz += b.z;
      totals.btx += by * b.z - bz * b.y;
      totals.bty += bz * b.x - bx * b.z;
      totals.btz += bx * b.y - by * b.x;
      const p = force.pressure;
      totals.px += p.x;
      totals.py += p.y;
      totals.pz += p.z;
      totals.ptx += ry * p.z - rz * p.y;
      totals.pty += rz * p.x - rx * p.z;
      totals.ptz += rx * p.y - ry * p.x;
      const f = force.friction;
      totals.fx += f.x;
      totals.fy += f.y;
      totals.fz += f.z;
      totals.ftx += ry * f.z - rz * f.y;
      totals.fty += rz * f.x - rx * f.z;
      totals.ftz += rx * f.y - ry * f.x;
      this.reaction[k * 3] += (b.x + p.x + f.x) * h;
      this.reaction[k * 3 + 1] += (b.y + p.y + f.y) * h;
      this.reaction[k * 3 + 2] += (b.z + p.z + f.z) * h;
      this.meanPosition[k * 2] += patch.position.x * h;
      this.meanPosition[k * 2 + 1] += patch.position.z * h;
      // Planing pressure acts along the normal (generalized direction [n, r × n]),
      // linearly implicit.
      const damping = force.pressureDamping * h;
      this.damping[k] = damping;
      if (damping > 0) {
        const a = this.direction;
        a[0] = nx;
        a[1] = ny;
        a[2] = nz;
        a[3] = ry * nz - rz * ny;
        a[4] = rz * nx - rx * nz;
        a[5] = rx * ny - ry * nx;
        for (let i = 0; i < 6; i += 1) for (let j = 0; j < 6; j += 1) system[i * 6 + j] += damping * a[i] * a[j];
      }
      // The water's inertia answers the patch's motion into the local surface, along
      // its normal ν ∝ (−∂η/∂x, 1, −∂η/∂z) (generalized direction [ν, r × ν]), over
      // the patch's projection on it: added mass, water entry and radiation, all
      // implicit. Planing and sliding along a face move no point into the surface,
      // so they leave the lift to the pressure.
      const slopeNorm = Math.hypot(sample.slopeX, 1, sample.slopeZ);
      const ux = -sample.slopeX / slopeNorm;
      const uy = 1 / slopeNorm;
      const uz = -sample.slopeZ / slopeNorm;
      this.surfaceNormal[k * 3] = ux;
      this.surfaceNormal[k * 3 + 1] = uy;
      this.surfaceNormal[k * 3 + 2] = uz;
      const projection = Math.abs(nx * ux + ny * uy + nz * uz);
      const addedMass = this.addedMassPerArea[k] * (force.wettedArea + force.deckWettedArea) * projection;
      const radiation = this.radiationPerArea[k] * force.wettedArea * projection;
      const intoSurface = relative.x * ux + relative.y * uy + relative.z * uz;
      // Water entry (von Kármán): added mass gained this substep meets the patch inelastically.
      const entrained = Math.max(0, addedMass - this.previousAddedMass[k]);
      this.previousAddedMass[k] = addedMass;
      this.addedMass[k] = addedMass;
      this.entrained[k] = entrained;
      this.radiation[k] = radiation;
      this.surfaceSpeed[k] = intoSurface;
      const push = -(h * radiation + entrained) * intoSurface;
      const cx = ry * uz - rz * uy;
      const cy = rz * ux - rx * uz;
      const cz = rx * uy - ry * ux;
      waterX += push * ux;
      waterY += push * uy;
      waterZ += push * uz;
      waterTx += push * cx;
      waterTy += push * cy;
      waterTz += push * cz;
      const inertia = h * radiation + addedMass + entrained;
      if (inertia > 0) {
        const a = this.direction;
        a[0] = ux;
        a[1] = uy;
        a[2] = uz;
        a[3] = cx;
        a[4] = cy;
        a[5] = cz;
        for (let i = 0; i < 6; i += 1) for (let j = 0; j < 6; j += 1) system[i * 6 + j] += inertia * a[i] * a[j];
      }
    }
    this.submergedVolume = submerged;
    this.wettedArea = wetted;

    const I = this.worldInertia;
    const Iw = [I[0] * w.x + I[1] * w.y + I[2] * w.z, I[3] * w.x + I[4] * w.y + I[5] * w.z, I[6] * w.x + I[7] * w.y + I[8] * w.z];
    const gyro = [w.y * Iw[2] - w.z * Iw[1], w.z * Iw[0] - w.x * Iw[2], w.x * Iw[1] - w.y * Iw[0]];
    const weight = -this.mass * WATER.gravity;
    rhs[0] = h * (totals.bx + totals.px + totals.fx) + waterX;
    rhs[1] = h * (weight + totals.by + totals.py + totals.fy) + waterY;
    rhs[2] = h * (totals.bz + totals.pz + totals.fz) + waterZ;
    rhs[3] = h * (totals.btx + totals.ptx + totals.ftx - gyro[0]) + waterTx;
    rhs[4] = h * (totals.bty + totals.pty + totals.fty - gyro[1]) + waterTy;
    rhs[5] = h * (totals.btz + totals.ptz + totals.ftz - gyro[2]) + waterTz;
    for (let i = 0; i < 3; i += 1) {
      system[i * 6 + i] += this.mass;
      for (let j = 0; j < 3; j += 1) system[(i + 3) * 6 + j + 3] += I[i * 3 + j];
    }
    // A rider joins the solve as a composite body; if its contact cannot give the
    // impulse that needs, the two are solved apart with the impulse it can give.
    const { rider } = this;
    if (rider?.attached) {
      rider.prepare(h, this, water);
      this.systemCopy.set(system);
      this.rhsCopy.set(rhs);
      rider.couple(system, rhs, h);
    }
    solve6(system, rhs);
    if (rider?.attached && !rider.settle(rhs, h, this)) {
      system.set(this.systemCopy);
      rhs.set(this.rhsCopy);
      rider.pushBoard(rhs);
      solve6(system, rhs);
    }
    const [dvx, dvy, dvz, dwx, dwy, dwz] = rhs;

    const avx = v.x + dvx / 2;
    const avy = v.y + dvy / 2;
    const avz = v.z + dvz / 2;
    const awx = w.x + dwx / 2;
    const awy = w.y + dwy / 2;
    const awz = w.z + dwz / 2;
    // Patch by patch, the implicit impulses: the rest of the planing pressure along
    // the normal, and all of the radiation, added mass and entry vertically.
    for (let k = 0; k < count; k += 1) {
      const damping = this.damping[k];
      const radiation = this.radiation[k];
      const addedMass = this.addedMass[k];
      const entrained = this.entrained[k];
      if (!(damping > 0) && !(radiation > 0) && !(addedMass > 0)) continue;
      const rx = arm[k * 3];
      const ry = arm[k * 3 + 1];
      const rz = arm[k * 3 + 2];
      const nx = normal[k * 3];
      const ny = normal[k * 3 + 1];
      const nz = normal[k * 3 + 2];
      const cx = ry * nz - rz * ny;
      const cy = rz * nx - rx * nz;
      const cz = rx * ny - ry * nx;
      const change = dvx * nx + dvy * ny + dvz * nz + dwx * cx + dwy * cy + dwz * cz;
      const mean = avx * nx + avy * ny + avz * nz + awx * cx + awy * cy + awz * cz;
      const pressure = -damping * change;
      const ux = this.surfaceNormal[k * 3];
      const uy = this.surfaceNormal[k * 3 + 1];
      const uz = this.surfaceNormal[k * 3 + 2];
      const sx = ry * uz - rz * uy;
      const sy = rz * ux - rx * uz;
      const sz = rx * uy - ry * ux;
      const surfaceChange = dvx * ux + dvy * uy + dvz * uz + dwx * sx + dwy * sy + dwz * sz;
      const surfaceMean = avx * ux + avy * uy + avz * uz + awx * sx + awy * sy + awz * sz;
      const radiated = -h * radiation * (this.surfaceSpeed[k] + surfaceChange);
      const inertia = -addedMass * surfaceChange - entrained * (this.surfaceSpeed[k] + surfaceChange);
      const water = radiated + inertia;
      this.work.pressure += pressure * mean;
      this.work.radiation += radiated * surfaceMean;
      this.work.addedMass += inertia * surfaceMean;
      this.forces.pressure.x += pressure * nx;
      this.forces.pressure.y += pressure * ny;
      this.forces.pressure.z += pressure * nz;
      this.forces.radiation.x += radiated * ux;
      this.forces.radiation.y += radiated * uy;
      this.forces.radiation.z += radiated * uz;
      this.forces.addedMass.x += inertia * ux;
      this.forces.addedMass.y += inertia * uy;
      this.forces.addedMass.z += inertia * uz;
      this.reaction[k * 3] += pressure * nx + water * ux;
      this.reaction[k * 3 + 1] += pressure * ny + water * uy;
      this.reaction[k * 3 + 2] += pressure * nz + water * uz;
    }

    this.work.gravity += h * weight * avy;
    this.work.buoyancy += h * (totals.bx * avx + totals.by * avy + totals.bz * avz + totals.btx * awx + totals.bty * awy + totals.btz * awz);
    this.work.pressure += h * (totals.px * avx + totals.py * avy + totals.pz * avz + totals.ptx * awx + totals.pty * awy + totals.ptz * awz);
    this.work.friction += h * (totals.fx * avx + totals.fy * avy + totals.fz * avz + totals.ftx * awx + totals.fty * awy + totals.ftz * awz);
    this.forces.buoyancy.x += h * totals.bx;
    this.forces.buoyancy.y += h * totals.by;
    this.forces.buoyancy.z += h * totals.bz;
    this.forces.pressure.x += h * totals.px;
    this.forces.pressure.y += h * totals.py;
    this.forces.pressure.z += h * totals.pz;
    this.forces.friction.x += h * totals.fx;
    this.forces.friction.y += h * totals.fy;
    this.forces.friction.z += h * totals.fz;
    v.x += dvx;
    v.y += dvy;
    v.z += dvz;
    w.x += dwx;
    w.y += dwy;
    w.z += dwz;

    this.resolveBed(h);

    c.addScaledVector(v, h);
    const spin = this.spin.set(w.x * h * 0.5, w.y * h * 0.5, w.z * h * 0.5, 0).multiply(this.orientation);
    const q = this.orientation;
    q.set(q.x + spin.x, q.y + spin.y, q.z + spin.z, q.w + spin.w).normalize();
    this.updateRotation();
    this.syncPosition();
    if (rider?.attached) rider.finish(h, this);
  }

  /**
   * Where each patch sits in the planing pressure distribution: along each strip,
   * from the end the flow meets first, behind its spray root (`planingScales`).
   */
  private placePressure(): void {
    const { samples, point, arm, velocity: v, angularVelocity: w, rotation: r } = this;
    let flowX = 0;
    let flowY = 0;
    let flowZ = 0;
    for (let k = 0; k < this.count; k += 1) {
      const sample = samples[k];
      const share = sample.wet && !sample.outsideDomain ? wettedShare(sample.surfaceY - point[k * 3 + 1]) : 0;
      if (!(share > 0)) continue;
      const rx = arm[k * 3];
      const ry = arm[k * 3 + 1];
      const rz = arm[k * 3 + 2];
      flowX += share * (v.x + w.y * rz - w.z * ry - sample.flowX);
      flowY += share * (v.y + w.z * rx - w.x * rz - sample.flowY);
      flowZ += share * (v.z + w.x * ry - w.y * rx - sample.flowZ);
    }
    this.pressureScale.fill(1);
    const speed = Math.hypot(flowX, flowY, flowZ);
    if (!(speed > 0)) return;
    // The board's long axis is the rotation's third column.
    const along = (flowX * r[2] + flowY * r[5] + flowZ * r[8]) / speed;
    const noseFirst = along > 0;
    for (const strip of this.strips) {
      const n = strip.length;
      for (let i = 0; i < n; i += 1) {
        const k = strip[noseFirst ? n - 1 - i : i];
        const sample = samples[k];
        this.stripShares[i] = sample.wet && !sample.outsideDomain ? wettedShare(sample.surfaceY - point[k * 3 + 1]) : 0;
        this.stripBeams[i] = this.beam[k];
      }
      planingScales(this.stripShares, this.stationLength, this.stripBeams, along * along, this.stripScales);
      for (let i = 0; i < n; i += 1) this.pressureScale[strip[noseFirst ? n - 1 - i : i]] = this.stripScales[i];
    }
  }

  /** Sequential impulses keeping the slab's bottom and deck points above the seabed (vertical normal). */
  private resolveBed(h: number): void {
    const { count, arm, normal, samples, bedImpulse } = this;
    bedImpulse.fill(0);
    let touching = false;
    for (let k = 0; k < count && !touching; k += 1) {
      const bed = samples[k].bedY;
      const y = this.centerOfMass.y + arm[k * 3 + 1];
      touching = bed > y - normal[k * 3 + 1] * this.thickness[k] - 0.05 || bed > y - 0.05;
    }
    if (!touching) return;
    const v = this.velocity;
    const w = this.angularVelocity;
    for (let iteration = 0; iteration < BED_ITERATIONS; iteration += 1) {
      for (let k = 0; k < count; k += 1) {
        const bed = samples[k].bedY;
        for (let face = 0; face < 2; face += 1) {
          const t = face === 0 ? 0 : this.thickness[k];
          const rx = arm[k * 3] - normal[k * 3] * t;
          const ry = arm[k * 3 + 1] - normal[k * 3 + 1] * t;
          const rz = arm[k * 3 + 2] - normal[k * 3 + 2] * t;
          const slot = (k * 2 + face) * 3;
          const penetration = bed - (this.centerOfMass.y + ry);
          if (!(penetration > 0) && bedImpulse[slot + 1] === 0) continue;
          const vy = v.y + w.z * rx - w.x * rz;
          const target = (BED_BIAS * Math.max(0, penetration - BED_SLOP)) / h;
          const inverse = this.inverseEffective(rx, ry, rz, 0, 1, 0);
          const total = Math.max(0, bedImpulse[slot + 1] + (target - vy) / inverse);
          const normalImpulse = total - bedImpulse[slot + 1];
          bedImpulse[slot + 1] = total;
          if (normalImpulse !== 0) this.bedWork(rx, ry, rz, 0, normalImpulse, 0);
          // Coulomb friction in the bed plane, within the cone of the accumulated normal impulse.
          const vx = v.x + w.y * rz - w.z * ry;
          const vz = v.z + w.x * ry - w.y * rx;
          const slip = Math.hypot(vx, vz);
          if (!(slip > 0) && bedImpulse[slot] === 0 && bedImpulse[slot + 2] === 0) continue;
          const inverseX = this.inverseEffective(rx, ry, rz, 1, 0, 0);
          const inverseZ = this.inverseEffective(rx, ry, rz, 0, 0, 1);
          let fx = bedImpulse[slot] - vx / inverseX;
          let fz = bedImpulse[slot + 2] - vz / inverseZ;
          const limit = BED_FRICTION * total;
          const magnitude = Math.hypot(fx, fz);
          if (magnitude > limit) {
            fx *= limit / magnitude;
            fz *= limit / magnitude;
          }
          const ix = fx - bedImpulse[slot];
          const iz = fz - bedImpulse[slot + 2];
          bedImpulse[slot] = fx;
          bedImpulse[slot + 2] = fz;
          if (ix !== 0 || iz !== 0) this.bedWork(rx, ry, rz, ix, 0, iz);
        }
      }
    }
  }

  /** Apply a bed impulse and book its work, ½ J · (v_before + v_after) at the point. */
  private bedWork(rx: number, ry: number, rz: number, ix: number, iy: number, iz: number): void {
    const v = this.velocity;
    const w = this.angularVelocity;
    const before = ix * (v.x + w.y * rz - w.z * ry) + iy * (v.y + w.z * rx - w.x * rz) + iz * (v.z + w.x * ry - w.y * rx);
    this.impulseAt(rx, ry, rz, ix, iy, iz);
    const after = ix * (v.x + w.y * rz - w.z * ry) + iy * (v.y + w.z * rx - w.x * rz) + iz * (v.z + w.x * ry - w.y * rx);
    this.work.bed += (before + after) / 2;
    this.forces.bed.x += ix;
    this.forces.bed.y += iy;
    this.forces.bed.z += iz;
  }

  private impulseAt(rx: number, ry: number, rz: number, ix: number, iy: number, iz: number): void {
    this.velocity.x += ix * this.inverseMass;
    this.velocity.y += iy * this.inverseMass;
    this.velocity.z += iz * this.inverseMass;
    const tx = ry * iz - rz * iy;
    const ty = rz * ix - rx * iz;
    const tz = rx * iy - ry * ix;
    const J = this.worldInverseInertia;
    this.angularVelocity.x += J[0] * tx + J[1] * ty + J[2] * tz;
    this.angularVelocity.y += J[3] * tx + J[4] * ty + J[5] * tz;
    this.angularVelocity.z += J[6] * tx + J[7] * ty + J[8] * tz;
  }

  private inverseEffective(rx: number, ry: number, rz: number, nx: number, ny: number, nz: number): number {
    const cx = ry * nz - rz * ny;
    const cy = rz * nx - rx * nz;
    const cz = rx * ny - ry * nx;
    const J = this.worldInverseInertia;
    return this.inverseMass + cx * (J[0] * cx + J[1] * cy + J[2] * cz) + cy * (J[3] * cx + J[4] * cy + J[5] * cz) + cz * (J[6] * cx + J[7] * cy + J[8] * cz);
  }

  private updateRotation(): void {
    const { x, y, z, w } = this.orientation;
    const r = this.rotation;
    r[0] = 1 - 2 * (y * y + z * z);
    r[1] = 2 * (x * y - z * w);
    r[2] = 2 * (x * z + y * w);
    r[3] = 2 * (x * y + z * w);
    r[4] = 1 - 2 * (x * x + z * z);
    r[5] = 2 * (y * z - x * w);
    r[6] = 2 * (x * z - y * w);
    r[7] = 2 * (y * z + x * w);
    r[8] = 1 - 2 * (x * x + y * y);
    rotateTensor(r, this.bodyInertia, this.worldInertia, this.tensorScratch);
    rotateTensor(r, this.bodyInverseInertia, this.worldInverseInertia, this.tensorScratch);
  }

  private rotate(v: Vec, out: Vector3): Vector3 {
    const r = this.rotation;
    return out.set(r[0] * v.x + r[1] * v.y + r[2] * v.z, r[3] * v.x + r[4] * v.y + r[5] * v.z, r[6] * v.x + r[7] * v.y + r[8] * v.z);
  }

  private rotateArray(values: Float64Array, k: number, out: Vector3): Vector3 {
    const r = this.rotation;
    const x = values[k * 3];
    const y = values[k * 3 + 1];
    const z = values[k * 3 + 2];
    return out.set(r[0] * x + r[1] * y + r[2] * z, r[3] * x + r[4] * y + r[5] * z, r[6] * x + r[7] * y + r[8] * z);
  }

  private syncPosition(): void {
    this.position.copy(this.centerOfMass).add(this.rotate(this.boardOffset, this.scratch));
    this.lastPosition.copy(this.position);
  }
}
