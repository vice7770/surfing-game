// Snap round 2's probe lab (not part of the suite; copied in from docs/research/snap-stance-2026-11-03/probes/round2/).
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { createWaterSample, type SurfWater } from './SurfWater';

/** A board and its standing rider (what `RideSession` steps, without the rest of the session). */
export interface Rig { board: BoardBody; rider: AttachedRider; readonly heading: number }

/** A board on the water's surface at (x, z), heading `heading`° (from +z toward +x) in the surface, at `speed` through the water (zz-r2Two's placement). */
export function onWater(water: SurfWater, x: number, z: number, heading: number, speed: number, stance: 'regular' | 'goofy' = 'regular'): Rig {
  const s = water.sampleAt(x, 10, z, createWaterSample());
  const normal = new Vector3(s.normalX, s.normalY, s.normalZ).normalize();
  const h = heading / DEG;
  const level = new Vector3(Math.sin(h), 0, Math.cos(h));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  const flow = new Vector3(s.flowX, s.flowY, s.flowZ);
  board.place(new Vector3(x, s.surfaceY, z).addScaledVector(normal, board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed).add(flow));
  const rider = new AttachedRider(board.shape, { phase: 'standing', stance, ...(process.env.BODYYAW === 'on' ? { bodyYaw: 'on' as const } : {}) });
  board.attach(rider);
  return { board, rider, get heading() { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); } };
}

export interface RideInput { steer: number; snap?: number; compress?: number; crouch?: number; trim?: number }

/** Sets the rider's inputs as `RideSession.step` does. */
export function apply(rig: Rig, i: RideInput): void {
  const { rider } = rig;
  rider.steer = i.steer; rider.trim = i.trim ?? 0; rider.crouch = i.crouch ?? 0; rider.compress = i.compress ?? 0; rider.snap = i.snap ?? 0;
}

/** Keys ramp in and out over 0.2 s (`InputAxes` RAMP_TIME); a pad passes straight through. */
export class Ramp {
  value = 0;
  constructor(private readonly time = 0.2) {}
  update(target: number, dt: number): number {
    if (this.time <= 0) return (this.value = target);
    const step = dt / this.time;
    const gap = target - this.value;
    this.value = Math.abs(gap) <= step ? target : this.value + Math.sign(gap) * step;
    return this.value;
  }
}

export const STEP = 1 / 60;
export const DEG = 180 / Math.PI;
export type Move = 'steer' | 'S' | 'compress' | 'snap' | 'none';

const priv = (rider: unknown) => rider as { planing: boolean; bankReference: number; ankleRest: number; twistTorque: number };

export interface Frame {
  t: number; phase: string; heading: number; path: number; bodyPath: number; upper: number; rate: number; speed: number; bodySpeed: number;
  fromFall: number; bank: number; bankRef: number; roll: number; pitch: number; rest: number; drop: number; front: number; fin: number;
  twist: number; swing: number; planing: boolean; load: number; fraction: number; yaw: number;
}

/** Input for a move: its stance and the steer (+1 the board's left). */
export function input(move: Move, steer: number): RideInput {
  const i: RideInput = { steer };
  if (move === 'snap') i.snap = 1;
  if (move === 'compress') Object.assign(i, { compress: 1, crouch: 0.6 });
  if (move === 'S') i.trim = -1;
  return i;
}

export function frameOf(session: Rig, water: SurfWater, t: number, phase: string, fall: Vector3, last: number, fraction = Number.NaN): Frame {
  const { board, rider } = session;
  const s = water.sampleAt(board.position.x, board.position.y, board.position.z, createWaterSample());
  const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  const heading = Math.atan2(f.x, f.z);
  const vx = board.velocity.x - s.flowX;
  const vz = board.velocity.z - s.flowZ;
  const bx = rider.velocity.x - s.flowX;
  const bz = rider.velocity.z - s.flowZ;
  const fh = new Vector3(f.x, 0, f.z).normalize();
  const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
  const left = new Vector3(1, 0, 0).applyQuaternion(board.orientation);
  const normal = new Vector3(s.normalX, s.normalY, s.normalZ).normalize();
  // The centre fin's attack (still water at the fin).
  const local = new Vector3(0, 0, -board.shape.length / 2 + 0.09).sub(new Vector3(board.shape.centerOfMass.x, board.shape.centerOfMass.y, board.shape.centerOfMass.z));
  const arm = local.applyQuaternion(board.orientation);
  const v = board.velocity.clone().sub(new Vector3(s.flowX, s.flowY, s.flowZ)).add(new Vector3().crossVectors(board.angularVelocity, arm)).applyQuaternion(board.orientation.clone().invert());
  return {
    t, phase, heading: heading * DEG, path: Math.atan2(vx, vz) * DEG, bodyPath: Math.atan2(bx, bz) * DEG, upper: (heading + rider.twist.angle) * DEG,
    rate: Math.atan2(Math.sin(heading - last), Math.cos(heading - last)) / STEP * DEG, speed: Math.hypot(vx, vz), bodySpeed: Math.hypot(bx, bz),
    fromFall: Math.acos(Math.max(-1, Math.min(1, fh.dot(fall)))) * DEG, bank: rider.bank.angle * DEG, bankRef: priv(rider).bankReference * DEG,
    roll: Math.asin(Math.max(-1, Math.min(1, left.dot(normal)))) * DEG, pitch: Math.asin(Math.max(-1, Math.min(1, f.dot(normal)))) * DEG,
    rest: rider.leg.rest, drop: rider.leg.extension, front: rider.contact.frontShare, fin: Math.atan2(Math.abs(v.x), Math.max(1e-6, v.z)) * DEG,
    twist: rider.twist.angle * DEG, swing: rider.swing.angle * DEG, yaw: diff(rider.bodyYaw.heading * DEG, heading * DEG), planing: priv(rider).planing, load: rider.contact.load, fraction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...{ up: up.y },
  } as Frame;
}

/** Signed angle a − b, degrees, in (−180, 180]. */
export const diff = (a: number, b: number) => { let d = (a - b) % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d; };

export interface MoveSummary { name: string; turned: number; time: number; peak: number; mean: number; kept: number; v0: number; v1: number; bodyTurned: number; drift: number; upperLead: number; depth: number; drop: number; front: number; pitch: number; bank: number; fin: number }

export function summarise(name: string, frames: Frame[]): MoveSummary {
  if (frames.length === 0) return { name, turned: 0, time: 0, peak: 0, mean: 0, kept: Number.NaN, v0: Number.NaN, v1: Number.NaN, bodyTurned: 0, drift: 0, upperLead: 0, depth: 0, drop: 0, front: Number.NaN, pitch: 0, bank: 0, fin: 0 };
  let turned = 0; let bodyTurned = 0; let peak = 0; let drift = 0; let upperLead = 0; let depth = 0; let drop = 0; let pitch = 0; let bank = 0; let fin = 0; let front = 0;
  for (let i = 1; i < frames.length; i += 1) {
    turned += diff(frames[i].heading, frames[i - 1].heading);
    bodyTurned += diff(frames[i].bodyPath, frames[i - 1].bodyPath);
  }
  const sign = Math.sign(turned) || 1;
  for (const f of frames) {
    peak = Math.max(peak, sign * f.rate);
    drift = Math.max(drift, Math.abs(diff(f.heading, f.path)));
    upperLead = Math.max(upperLead, sign * f.twist);
    depth = Math.max(depth, -f.rest);
    drop = Math.max(drop, -f.drop);
    pitch = Math.max(pitch, f.pitch);
    bank = Math.max(bank, Math.abs(f.bank));
    fin = Math.max(fin, f.fin);
    front += f.front;
  }
  const time = frames[frames.length - 1].t - frames[0].t + STEP;
  return { name, turned, time, peak, mean: Math.abs(turned) / time, kept: frames[frames.length - 1].speed / frames[0].speed, v0: frames[0].speed, v1: frames[frames.length - 1].speed, bodyTurned, drift, upperLead, depth, drop, front: front / frames.length, pitch, bank, fin };
}

export const r = (x: number, d = 0) => (Number.isFinite(x) ? +x.toFixed(d) : null);
