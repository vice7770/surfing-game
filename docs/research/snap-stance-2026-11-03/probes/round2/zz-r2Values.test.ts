import { Matrix4, Quaternion, Vector3 } from 'three';
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { AttachedRider, CROUCH_DEPTH } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { FIN_STALL } from './finForces';
import { PlaneWater } from './PlaneWater';
import { RideSession, type RideInput, type RideSessionOptions } from './RideSession';
import type { SurfWater } from './SurfWater';

/**
 * The snap stance (the owner's decisions of 2026-11-03; docs/research/snap-stance-2026-11-03/README.md): held standing,
 * the weight on the tail, the back knee deep, the shoulders turning toward the steer. These pin what it changes and
 * what it must not: without Snap every ride is the one before it.
 */
const STEP = 1 / 60;
const FACE = (15 * Math.PI) / 180;

/** FNV-1a over the bytes of each number: one hash for a whole trace. */
class TraceHash {
  private hash = 0x811c9dc5;
  private readonly view = new DataView(new ArrayBuffer(8));

  add(...values: number[]): void {
    for (const value of values) {
      this.view.setFloat64(0, value, true);
      for (let i = 0; i < 8; i += 1) {
        this.hash ^= this.view.getUint8(i);
        this.hash = Math.imul(this.hash, 0x01000193) >>> 0;
      }
    }
  }

  get value(): number {
    return this.hash >>> 0;
  }
}

/**
 * A scripted ride down the 15° face and across it with every stance but Snap: crouched on the drop, a compressed bottom
 * turn, a release, a top turn with the weight back, the hand in the face, then trim forward. Each step's board and rider
 * state goes into the hash. `extra` is merged into every input (Snap at 0, or held under `?snap=off`).
 */
function scriptedRide(extra: Partial<RideInput> = {}, options: RideSessionOptions = {}): number {
  const water = new PlaneWater({ slopeZ: -Math.tan(FACE) });
  const session = new RideSession(options);
  session.place({ x: 0, z: 0, heading: 0, speed: 7, phase: 'standing', followSurface: true }, water);
  const hash = new TraceHash();
  const { board, rider } = session;
  for (let n = 0; n < 240; n += 1) {
    const t = n * STEP;
    const input: RideInput = { paddle: false, popUp: false, steer: 0, ...extra };
    if (t < 0.5) input.crouch = 0.6;
    else if (t < 1.2) Object.assign(input, { steer: -1, crouch: 0.6, compress: 1 });
    else if (t < 1.6) input.steer = 0;
    else if (t < 2.4) Object.assign(input, { steer: 1, trim: -1 });
    else if (t < 3.2) Object.assign(input, { steer: 0.3, hand: true });
    else input.trim = 0.6;
    session.step(STEP, water, input);
    const p = board.position;
    const q = board.orientation;
    const v = board.velocity;
    const w = board.angularVelocity;
    hash.add(p.x, p.y, p.z, q.x, q.y, q.z, q.w, v.x, v.y, v.z, w.x, w.y, w.z);
    if (rider.attached) hash.add(rider.bank.angle, rider.leg.rest, rider.twist.angle, rider.swing.angle, rider.contact.frontShare);
    else hash.add(-1);
  }
  return hash.value;
}

/**
 * The scripted ride's hash on the code before the snap stance (`origin/claude/playtest-1103b`, 4eee1e5f: main 632f3f13
 * and the pool tube case swap), measured by swapping that commit's `AttachedRider.ts` and `RideSession.ts` back in.
 */
const BEFORE_SNAP = 4104973259;

/** A board on the 15° face heading `across` degrees from its fall line toward −x, at `speed`, with a standing rider. */
function acrossFace(across: number, speed: number) {
  const yaw = (across * Math.PI) / 180;
  const normal = new Vector3(0, 1, Math.tan(FACE)).normalize();
  const fall = new Vector3(0, -Math.sin(FACE), Math.cos(FACE));
  const side = new Vector3().crossVectors(normal, fall).normalize();
  const forward = fall.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(side, -Math.sin(yaw)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  return { board, rider, water: new PlaneWater({ slopeZ: -Math.tan(FACE) }) as SurfWater };
}

function flat(speed: number) {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  return { board, rider, water: new PlaneWater() as SurfWater };
}

const headingOf = (board: BoardBody) => {
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  return Math.atan2(forward.x, forward.z);
};

/** The centre fin's attack, rad: its sideways speed over its speed along the board (still water). */
function finAttack(board: BoardBody): number {
  const local = new Vector3(0, 0, -board.shape.length / 2 + 0.09).sub(new Vector3(board.shape.centerOfMass.x, board.shape.centerOfMass.y, board.shape.centerOfMass.z));
  const arm = local.applyQuaternion(board.orientation);
  const velocity = board.velocity.clone().add(new Vector3().crossVectors(board.angularVelocity, arm)).applyQuaternion(board.orientation.clone().invert());
  return Math.abs(Math.atan2(velocity.x, Math.max(1e-6, velocity.z)));
}

/**
 * Snap and full steer from `start` s for `hold` s (the steer held on after), measured from the steer: the turn, the peak
 * yaw rate, the speed, the fins' largest attack and when the rider fell (NaN on).
 */
function snapTurn(setup: ReturnType<typeof acrossFace>, options: { snap: boolean; hold: number; steer?: number; seconds?: number; trim?: number }) {
  const { board, rider, water } = setup;
  for (let n = 0; n < 12; n += 1) board.step(STEP, water);
  const speed = board.velocity.length();
  let last = headingOf(board);
  let turned = 0;
  let peak = 0;
  let fin = 0;
  let fell = Number.NaN;
  const turnedAt: number[] = [];
  const speedAt: number[] = [];
  for (let n = 0; n < Math.round((options.seconds ?? 1.4) / STEP); n += 1) {
    const t = n * STEP;
    rider.steer = options.steer ?? 1;
    rider.snap = options.snap && t < options.hold ? 1 : 0;
    rider.trim = options.trim ?? 0;
    board.step(STEP, water);
    if (!rider.attached) {
      fell = t + STEP;
      break;
    }
    const now = headingOf(board);
    const d = Math.atan2(Math.sin(now - last), Math.cos(now - last));
    last = now;
    turned += d;
    peak = Math.max(peak, Math.abs(d) / STEP);
    fin = Math.max(fin, finAttack(board));
    turnedAt.push((turned * 180) / Math.PI);
    speedAt.push(board.velocity.length());
  }
  const at = (seconds: number) => Math.round(seconds / STEP) - 1;
  return { speed, turned: turnedAt, speeds: speedAt, at, peak: (peak * 180) / Math.PI, fin, fell };
}


function rideKept(speed: number, reference: number): number { return speed / reference; }
it('values', () => {
  const o: Record<string, unknown> = {};
  const run = (input: Partial<AttachedRider>) => {
    const { board, rider, water } = flat(7);
    Object.assign(rider, { steer: 1, ...input });
    let pull = 0;
    for (let n = 0; n < 60; n += 1) { board.step(STEP, water); pull = Math.max(pull, (rider as unknown as { assistForce: Vector3 }).assistForce.length()); }
    return { rest: rider.leg.rest, front: rider.contact.weight, twist: rider.twist.angle, pull };
  };
  o.snap = run({ snap: 1 }); o.compress = run({ compress: 1, crouch: 0.6 }); o.trimS = run({ trim: -1 }); o.none = run({});
  const ride = (snap: number, trim = 0) => {
    const { board, rider, water } = flat(7);
    let pitch = 0; let front = 0;
    for (let n = 0; n < 60; n += 1) { rider.snap = snap; rider.trim = trim; board.step(STEP, water); pitch = Math.max(pitch, Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y)); front = rider.contact.weight; }
    return { speed: board.velocity.length(), pitch: (pitch * 180) / Math.PI, front };
  };
  o.straight = { level: ride(0), snap: ride(1), S: ride(0, -1) };
  const steer = snapTurn(acrossFace(150, 6.7), { snap: false, hold: 0 });
  const snap = snapTurn(acrossFace(150, 6.7), { snap: true, hold: 0.6 });
  o.climb = { steerPeak: steer.peak, snapPeak: snap.peak, steer1: steer.turned[steer.at(1)], snap1: snap.turned[snap.at(1)], snapFell: snap.fell };
  for (const speed of [7, 9]) {
    const st = snapTurn(flat(speed), { snap: false, hold: 0, seconds: 2 });
    const sn = snapTurn(flat(speed), { snap: true, hold: 0.6, seconds: 2 });
    const c = flat(speed); Object.assign(c.rider, { compress: 1, crouch: 0.6 });
    const co = snapTurn(c, { snap: false, hold: 0, seconds: 2 });
    const at = sn.at(0.8); const end = sn.turned.length - 1;
    o['flat' + speed] = { steer08: st.turned[at], snap08: sn.turned[at], comp08: co.turned[at], steerEnd: st.turned[st.turned.length - 1], snapEnd: sn.turned[end], compEnd: co.turned[co.turned.length - 1], snapPeak: sn.peak, steerPeak: st.peak, compPeak: co.peak, v0: sn.speed, snapV08: sn.speeds[at], compV08: co.speeds[at], steerV08: st.speeds[at], snapVend: sn.speeds[end], compVend: co.speeds[co.speeds.length - 1], snapFell: sn.fell, snapFin: sn.fin };
  }
  const held = snapTurn(flat(7), { snap: true, hold: 9, seconds: 1.2 });
  const carve = snapTurn(flat(7), { snap: false, hold: 0, seconds: 1.2 });
  o.held = { fin: held.fin * 180 / Math.PI, carveFin: carve.fin * 180 / Math.PI, v: held.speeds[held.speeds.length - 1], fell: held.fell, turned: held.turned[held.turned.length - 1] };
  writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(o, null, 1));
});
