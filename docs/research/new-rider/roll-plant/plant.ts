// The roll-plant lab (ruling 29e, 2026-11-13): the board with a rigid rider (fixed payload masses, no AttachedRider),
// towed on flat still water, with any of its roll, yaw rate and slip held each substep, and the water's force and moment
// on it split by contributor, exactly as the solver applies them (explicit force plus the implicit share of each
// patch and foil). Not part of the suite; probes only. Reads src/ (private members by name), changes nothing there.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { BoardBody, type BoardPayload } from '../../../../src/physics/BoardBody';
import { finForce, createFinForce, type FinSpec } from '../../../../src/physics/finForces';
import { WATER, createPatchForce, patchForce, wettedShare } from '../../../../src/physics/hullForces';
import { createWaterSample, type SurfWater, type WaterSample } from '../../../../src/physics/SurfWater';

export const STEP = 1 / 60;
export const DEG = 180 / Math.PI;
const G = 9.81;

/** Flat still water, 3 m deep, surface at y = 0. */
export class Flat implements SurfWater {
  surfaceAt(): number { return 0; }
  sampleAt(_x: number, _y: number, _z: number, out: WaterSample): WaterSample {
    Object.assign(out, {
      surfaceY: 0, stillDepth: 3, waterDepth: 3, bedY: -3, wet: true, outsideDomain: false, slopeX: 0, slopeZ: 0,
      normalX: 0, normalY: 1, normalZ: 0, flowX: 0, flowY: 0, flowZ: 0, regime: 'profile', breaking: 0, voidFraction: 0,
      bedNormalX: 0, bedNormalY: 1, bedNormalZ: 0, bedMaterial: 'sand',
    });
    return out;
  }
  addReaction(): void {}
}

/**
 * The rigid riders (73 kg, the reference rider; centre of mass 0.915 m over the board's lowest bottom point and 0.30 m
 * behind mid-length, where the old rider's sits in a 7 m/s glide, `scout.probe.ts`):
 * - `point`: one point mass, as the game's riders are (the old rider "a point mass; its own spin is not modelled",
 *   `AttachedRider.ts`; the new one adds a bank but no yaw): no inertia of its own;
 * - `human`: the same mass spread to give a standing human's own inertia about its centre (roll of the board = the
 *   body's sagittal plane, about 9 kg·m² more; yaw 1 + across pair; [I] values from body-segment tables, recalled:
 *   standing about 11–13 kg·m² sagittal and 1.2–2 kg·m² about the long axis, de Leva 1996 / Zatsiorsky 2002).
 *   Pairs: 49 kg vertical at ±0.43 m (roll and pitch 9.06), 12 kg across at ±0.29 m (roll and yaw 1.0), 12 kg along at
 *   ±0.29 m (yaw and pitch 1.0). Own inertia: roll 10.1, yaw 2.0, pitch 10.1 kg·m².
 */
export type RiderKind = 'point' | 'human' | 'none';
export const RIDER_POINT = { x: 0, y: 0.915, z: -0.30 };
export function payloads(kind: RiderKind, z = RIDER_POINT.z): BoardPayload[] {
  const { x, y } = RIDER_POINT;
  if (kind === 'none') return [];
  if (kind === 'point') return [{ mass: 73, point: { x, y, z } }];
  return [
    { mass: 24.5, point: { x, y: y + 0.43, z } }, { mass: 24.5, point: { x, y: y - 0.43, z } },
    { mass: 6, point: { x: x + 0.29, y, z } }, { mass: 6, point: { x: x - 0.29, y, z } },
    { mass: 6, point: { x, y, z: z + 0.29 } }, { mass: 6, point: { x, y, z: z - 0.29 } },
  ];
}

/** What is held each substep (undefined: free). Angles rad, rates rad/s, speed m/s. */
export interface Hold {
  /** The tow: the centre's horizontal speed kept at this. */
  speed?: number;
  /** Roll about the board's own long axis (left rail up +), and its rate held at 0 while held. */
  roll?: number;
  /** The heading's rate (about world up; + turns toward the board's left). */
  yawRate?: number;
  /** The path's angle to the heading in the level plane (+: the board slides toward its right, as `lab.ts` slip). */
  slip?: number;
  /** A force on the deck, N, along the board's own left axis (+), at a board-frame point (shape coordinates): the feet's push. */
  push?: { force: number; at: { x: number; y: number; z: number }; forward?: boolean };
  /** A roll rate imposed each substep (rad/s), about the board's long axis through `rollAxis` (a board-frame point; default the centre of mass). */
  rollRate?: number;
  rollAxis?: { x: number; y: number; z: number };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Euler angles of the board: q = Qy(ψ) Qx(−θ) Qz(φ). Heading ψ (from +z toward +x), pitch θ (nose up +), roll φ (left rail up +). */
export function euler(q: Quaternion): { heading: number; pitch: number; roll: number } {
  const f = new Vector3(0, 0, 1).applyQuaternion(q);
  const heading = Math.atan2(f.x, f.z);
  const pitch = Math.asin(Math.max(-1, Math.min(1, f.y)));
  const base = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -pitch));
  const rest = base.clone().invert().multiply(q);
  const l = new Vector3(1, 0, 0).applyQuaternion(rest);
  return { heading, pitch, roll: Math.atan2(l.y, l.x) };
}
export function fromEuler(heading: number, pitch: number, roll: number): Quaternion {
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -pitch))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), roll));
}

/** ω = a ŷ + b e₁ + c f (e₁ the level pitch axis, f the board's long axis): the Euler rates (ψ̇, −θ̇, φ̇). */
function eulerRates(q: Quaternion, w: Vector3): { a: number; b: number; c: number; e1: Vector3; f: Vector3 } {
  const { heading } = euler(q);
  const y = new Vector3(0, 1, 0);
  const e1 = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
  const f = new Vector3(0, 0, 1).applyQuaternion(q);
  const m = new Matrix4().makeBasis(y, e1, f);
  const inv = m.clone().invert();
  const s = w.clone().applyMatrix4(inv);
  return { a: s.x, b: s.y, c: s.z, e1, f };
}

/** A contributor ledger: world force and moment about the centre of mass, impulses summed over a frame. */
export const PARTS = ['pressL', 'pressR', 'buoyL', 'buoyR', 'fricL', 'fricR', 'waterL', 'waterR', 'radL', 'radR', 'finL', 'finR', 'finC', 'railL', 'railR'] as const;
export type Part = typeof PARTS[number];
export interface Ledger { force: Record<Part, Vector3>; moment: Record<Part, Vector3>; ramp: { force: Vector3; moment: Vector3 }; time: number }
export function ledger(): Ledger {
  const force = {} as Record<Part, Vector3>;
  const moment = {} as Record<Part, Vector3>;
  for (const p of PARTS) { force[p] = new Vector3(); moment[p] = new Vector3(); }
  return { force, moment, ramp: { force: new Vector3(), moment: new Vector3() }, time: 0 };
}

export class Lab {
  readonly board: BoardBody;
  hold: Hold = {};
  /** The ledger being filled (cleared by `frame`). */
  book = ledger();
  private readonly water: SurfWater;
  private v0 = new Vector3();
  private w0 = new Vector3();
  private c0 = new Vector3();
  private du = new Float64Array(6);
  private readonly fin = createFinForce();
  private readonly pf = createPatchForce();
  private readonly fs = createWaterSample();

  constructor(water: SurfWater, rider: RiderKind, options: { z?: number; substeps?: number; fins?: readonly FinSpec[] } = {}) {
    this.water = water;
    this.board = new BoardBody({ payloads: payloads(rider, options.z), substeps: options.substeps ?? 32, ...(options.fins ? { fins: options.fins } : {}) });
    const b = this.board as Any;
    const substep = b.substep.bind(b);
    const settleFoils = b.settleFoils.bind(b);
    b.settleFoils = (h: number, du: Float64Array, ...rest: number[]) => { this.du.set(du); settleFoils(h, du, ...rest); };
    b.substep = (h: number, w: SurfWater) => {
      this.h = h;
      this.constrain();
      this.v0.copy(this.board.velocity);
      this.w0.copy(this.board.angularVelocity);
      this.c0.copy(this.board.centerOfMass);
      this.du.fill(0);
      substep(h, w);
      this.account(h);
    };
  }

  /** Place the board level on the water at speed `speed` along heading 0 (+z), at its floating draft guess. */
  place(speed: number, draft = 0.08, pitch = 8 / DEG): void {
    const q = fromEuler(0, pitch, 0);
    // Put the shape's tail bottom about `draft` under the surface.
    this.board.place(new Vector3(0, -draft + this.board.shape.centerOfMass.y, 0), q, new Vector3(0, 0, speed));
  }

  /** The held quantities, applied before each substep (rotation about the centre of mass). */
  private constrain(): void {
    const { hold, board } = this;
    const q = board.orientation;
    const w = board.angularVelocity;
    const v = board.velocity;
    const e = euler(q);
    if (hold.roll !== undefined) {
      q.copy(fromEuler(e.heading, e.pitch, hold.roll));
      (board as Any).updateRotation();
    }
    const rates = eulerRates(q, w);
    if (hold.roll !== undefined) rates.c = 0;
    if (hold.yawRate !== undefined) rates.a = hold.yawRate;
    if (hold.roll !== undefined || hold.yawRate !== undefined) {
      w.set(0, 0, 0).addScaledVector(new Vector3(0, 1, 0), rates.a).addScaledVector(rates.e1, rates.b).addScaledVector(rates.f, rates.c);
    }
    const heading = euler(q).heading;
    if (hold.speed !== undefined || hold.slip !== undefined) {
      const level = Math.hypot(v.x, v.z);
      const speed = hold.speed ?? level;
      // lab.ts slip = atan2(−v_left, v_fwd): + when the path points to the board's right of its heading.
      const dir = hold.slip !== undefined ? heading - hold.slip : Math.atan2(v.x, v.z);
      v.x = speed * Math.sin(dir);
      v.z = speed * Math.cos(dir);
    }
    if (hold.rollRate !== undefined) {
      const f = new Vector3(0, 0, 1).applyQuaternion(q);
      const spin = f.clone().multiplyScalar(hold.rollRate);
      w.add(spin);
      if (hold.rollAxis) {
        const axis = board.toWorld(hold.rollAxis, new Vector3());
        // Rotating about the axis point: the centre of mass moves at spin × (c − P).
        v.add(spin.clone().cross(board.centerOfMass.clone().sub(axis)));
      }
    }
    (board as Any).syncPosition();
    if (hold.push) {
      const at = board.toWorld(hold.push.at, new Vector3());
      const dir = new Vector3(hold.push.forward ? 0 : 1, 0, hold.push.forward ? 1 : 0).applyQuaternion(q);
      (board as Any).applyImpulse(dir.multiplyScalar(hold.push.force * this.h), at);
    }
  }

  /** The substep about to be taken, s (the push's impulse). */
  private h = 0;

  /** Every contributor's impulse in the substep just taken, into the ledger (as the solver applied it). */
  private account(h: number): void {
    const b = this.board as Any;
    const book = this.book;
    const c = this.c0;
    const v = this.v0;
    const w = this.w0;
    const [dvx, dvy, dvz, dwx, dwy, dwz] = this.du;
    const count: number = b.count;
    const arm: Float64Array = b.arm;
    const normal: Float64Array = b.normal;
    const point: Float64Array = b.point;
    const samples: WaterSample[] = b.samples;
    // The wetted length, as `substep` computes it.
    let wetMin = Infinity;
    let wetMax = -Infinity;
    for (let k = 0; k < count; k += 1) {
      const s = samples[k];
      if (s.wet && !s.outsideDomain && wettedShare(s.surfaceY - point[k * 3 + 1]) > 0) { wetMin = Math.min(wetMin, b.alongBoard[k]); wetMax = Math.max(wetMax, b.alongBoard[k]); }
    }
    const wettedLength = wetMax >= wetMin ? wetMax - wetMin + b.stationLength : b.stationLength;
    const add = (part: Part, fx: number, fy: number, fz: number, rx: number, ry: number, rz: number) => {
      book.force[part].x += fx; book.force[part].y += fy; book.force[part].z += fz;
      book.moment[part].x += ry * fz - rz * fy; book.moment[part].y += rz * fx - rx * fz; book.moment[part].z += rx * fy - ry * fx;
    };
    const patch = { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 }, area: 0, thickness: 0 };
    for (let k = 0; k < count; k += 1) {
      const rx = arm[k * 3]; const ry = arm[k * 3 + 1]; const rz = arm[k * 3 + 2];
      const nx = normal[k * 3]; const ny = normal[k * 3 + 1]; const nz = normal[k * 3 + 2];
      const left = b.local[k * 3] > 0;
      patch.position.x = point[k * 3]; patch.position.y = point[k * 3 + 1]; patch.position.z = point[k * 3 + 2];
      patch.normal.x = nx; patch.normal.y = ny; patch.normal.z = nz;
      patch.area = b.area[k]; patch.thickness = b.thickness[k];
      const s = samples[k];
      const rel = { x: v.x + w.y * rz - w.z * ry - s.flowX, y: v.y + w.z * rx - w.x * rz - s.flowY, z: v.z + w.x * ry - w.y * rx - s.flowZ };
      const f = patchForce(patch, s, rel, wettedLength, this.pf, b.pressureScale[k], b.plateShareNow, 1);
      // Pressure: explicit plus the implicit share −damping·(Δv·n + Δω·(r×n)) (damping already times h).
      const cx = ry * nz - rz * ny; const cy = rz * nx - rx * nz; const cz = rx * ny - ry * nx;
      const change = dvx * nx + dvy * ny + dvz * nz + dwx * cx + dwy * cy + dwz * cz;
      const implicit = -b.damping[k] * change;
      const px = h * f.pressure.x + implicit * nx; const py = h * f.pressure.y + implicit * ny; const pz = h * f.pressure.z + implicit * nz;
      add(left ? 'pressL' : 'pressR', px, py, pz, rx, ry, rz);
      const bx = f.buoyancyPoint.x - c.x; const by = f.buoyancyPoint.y - c.y; const bz = f.buoyancyPoint.z - c.z;
      add(left ? 'buoyL' : 'buoyR', h * f.buoyancy.x, h * f.buoyancy.y, h * f.buoyancy.z, bx, by, bz);
      add(left ? 'fricL' : 'fricR', h * f.friction.x, h * f.friction.y, h * f.friction.z, rx, ry, rz);
      // The ramp's patches (partly wetted bottom): their pressure and buoyancy, also kept apart.
      const share = wettedShare(s.surfaceY - point[k * 3 + 1]);
      if (share > 0 && share < 1) {
        const fx = px + h * f.buoyancy.x; const fy = py + h * f.buoyancy.y; const fz = pz + h * f.buoyancy.z;
        book.ramp.force.x += fx; book.ramp.force.y += fy; book.ramp.force.z += fz;
        book.ramp.moment.x += ry * fz - rz * fy; book.ramp.moment.y += rz * fx - rx * fz; book.ramp.moment.z += rx * fy - ry * fx;
      }
      // Water inertia: radiation, entry and added mass along the surface normal ν, explicit plus implicit.
      const ux = b.surfaceNormal[k * 3]; const uy = b.surfaceNormal[k * 3 + 1]; const uz = b.surfaceNormal[k * 3 + 2];
      const sx = ry * uz - rz * uy; const sy = rz * ux - rx * uz; const sz = rx * uy - ry * ux;
      const surfaceChange = dvx * ux + dvy * uy + dvz * uz + dwx * sx + dwy * sy + dwz * sz;
      const speed = b.surfaceSpeed[k];
      // Split: radiation and entry against the patch's own speed into the surface (a damping), and the rest (the
      // added mass's and entry's answer to the solve's change of speed: inertia).
      const radiated = -(h * b.radiation[k] + b.entrained[k]) * speed;
      const water = -(h * b.radiation[k] + b.entrained[k]) * surfaceChange - b.addedMass[k] * surfaceChange;
      add(left ? 'radL' : 'radR', radiated * ux, radiated * uy, radiated * uz, rx, ry, rz);
      add(left ? 'waterL' : 'waterR', water * ux, water * uy, water * uz, rx, ry, rz);
    }
    // Fins and rails, as `applyFoils` and `settleFoils`.
    const q = this.board.orientation;
    const inverse = q.clone().invert();
    const foils: Any[] = b.foils;
    for (let k = 0; k < foils.length; k += 1) {
      const foil = foils[k];
      const root = new Vector3(foil.local.x, foil.local.y, foil.local.z).applyQuaternion(q).add(c);
      let fx = 0; let fy = 0; let fz = 0;
      let px = root.x; let py = root.y; let pz = root.z;
      let part: Part;
      if (foil.kind === 'fin') {
        part = foil.fin.side > 0 ? 'finL' : foil.fin.side < 0 ? 'finR' : 'finC';
        const down = new Vector3(0, -1, 0).applyQuaternion(q);
        const tip = root.clone().addScaledVector(down, foil.height);
        const s = this.water.sampleAt((root.x + tip.x) / 2, (root.y + tip.y) / 2, (root.z + tip.z) / 2, this.fs);
        let immersed = 0;
        if (s.wet && !s.outsideDomain) {
          const low = Math.min(root.y, tip.y); const span = Math.abs(root.y - tip.y);
          immersed = span > 1e-9 ? Math.min(1, Math.max(0, (s.surfaceY - low) / span)) : s.surfaceY > low ? 1 : 0;
        }
        const lowIsTip = tip.y < root.y; const sh = immersed / 2;
        const p = lowIsTip ? tip.clone().lerp(root, sh) : root.clone().lerp(tip, sh);
        px = p.x; py = p.y; pz = p.z;
        const rx = px - c.x; const ry = py - c.y; const rz = pz - c.z;
        const rel = new Vector3(v.x + w.y * rz - w.z * ry - s.flowX, v.y + w.z * rx - w.x * rz - s.flowY, v.z + w.x * ry - w.y * rx - s.flowZ).applyQuaternion(inverse);
        const out = finForce(foil.fin, rel, immersed, this.fin);
        const force = new Vector3(out.force.x, out.force.y, out.force.z).applyQuaternion(q);
        fx = force.x; fy = force.y; fz = force.z;
      } else {
        part = foil.normal.x > 0 ? 'railL' : 'railR';
        const n = new Vector3(foil.normal.x, foil.normal.y, foil.normal.z).applyQuaternion(q);
        const s = this.water.sampleAt(px, py, pz, this.fs);
        const share = s.wet && !s.outsideDomain ? Math.min(1, Math.max(0, 0.5 + (s.surfaceY - py) / foil.height)) : 0;
        const rx = px - c.x; const ry = py - c.y; const rz = pz - c.z;
        const ux = v.x + w.y * rz - w.z * ry - s.flowX; const uy = v.y + w.z * rx - w.x * rz - s.flowY; const uz = v.z + w.x * ry - w.y * rx - s.flowZ;
        const into = ux * n.x + uy * n.y + uz * n.z;
        const sp = Math.hypot(ux, uy, uz);
        if (into > 0 && share > 0 && sp > 0) {
          const k2 = 0.5 * WATER.density * 1 * share * foil.area;
          fx = -k2 * sp * into * n.x; fy = -k2 * sp * into * n.y; fz = -k2 * sp * into * n.z;
        }
      }
      const rx = b.foilArm[k * 3]; const ry = b.foilArm[k * 3 + 1]; const rz = b.foilArm[k * 3 + 2];
      const nx = b.foilNormal[k * 3]; const ny = b.foilNormal[k * 3 + 1]; const nz = b.foilNormal[k * 3 + 2];
      const cx = ry * nz - rz * ny; const cy = rz * nx - rx * nz; const cz = rx * ny - ry * nx;
      const change = dvx * nx + dvy * ny + dvz * nz + dwx * cx + dwy * cy + dwz * cz;
      const implicit = -b.foilDamping[k] * change;
      add(part, h * fx + implicit * nx, h * fy + implicit * ny, h * fz + implicit * nz, rx, ry, rz);
    }
    book.time += h;
  }

  /** One 1/60 s step; returns the ledger's mean forces and moments over it. */
  frame(): Ledger {
    this.book = ledger();
    this.board.step(STEP, this.water);
    const book = this.book;
    for (const p of PARTS) { book.force[p].multiplyScalar(1 / STEP); book.moment[p].multiplyScalar(1 / STEP); }
    book.ramp.force.multiplyScalar(1 / STEP); book.ramp.moment.multiplyScalar(1 / STEP);
    return book;
  }

  /** Board-frame readings: speed, slip (°, + sliding toward the board's right), yaw rate (rad/s about world up), roll, pitch, draft. */
  read(): { speed: number; slip: number; yawRate: number; roll: number; rollRate: number; pitch: number; heading: number; lateralAccel: number; draft: number } {
    const { board } = this;
    const q = board.orientation;
    const v = board.velocity;
    const vb = v.clone().applyQuaternion(q.clone().invert());
    const e = euler(q);
    const rates = eulerRates(q, board.angularVelocity);
    let draft = -Infinity;
    const p = new Vector3();
    for (const patch of board.shape.patches) { board.toWorld(patch.position, p); draft = Math.max(draft, -p.y); }
    // Lateral acceleration of the path: speed times the path's turn rate, approximated by V·ψ̇ + V·(d slip/dt) outside.
    return { speed: Math.hypot(v.x, v.z), slip: Math.atan2(-vb.x, vb.z) * DEG, yawRate: rates.a, roll: e.roll * DEG, rollRate: rates.c, pitch: e.pitch * DEG, heading: e.heading, lateralAccel: 0, draft };
  }

  /** The level unit vectors of the board: forward and left (world). */
  axes(): { fwd: Vector3; left: Vector3; up: Vector3 } {
    const q = this.board.orientation;
    return { fwd: new Vector3(0, 0, 1).applyQuaternion(q), left: new Vector3(1, 0, 0).applyQuaternion(q), up: new Vector3(0, 1, 0).applyQuaternion(q) };
  }
}

/** Sum of several parts' vectors. */
export function sum(rec: Record<Part, Vector3>, parts: readonly Part[]): Vector3 {
  const out = new Vector3();
  for (const p of parts) out.add(rec[p]);
  return out;
}
export const GROUPS: Record<string, readonly Part[]> = {
  pressure: ['pressL', 'pressR'], buoyancy: ['buoyL', 'buoyR'], friction: ['fricL', 'fricR'], waterInertia: ['waterL', 'waterR'], radiation: ['radL', 'radR'],
  fins: ['finL', 'finR', 'finC'], rails: ['railL', 'railR'], all: PARTS,
};
export const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
export { G };
