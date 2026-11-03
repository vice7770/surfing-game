import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
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

describe('the snap stance', () => {
  describe('without Snap, every ride is the one before it', () => {
    it('reproduces the scripted ride of the code before the snap stance, bit for bit', () => {
      expect(scriptedRide()).toBe(BEFORE_SNAP);
    });

    it('rides the same with Snap at 0 as with no Snap in the input', () => {
      expect(scriptedRide({ snap: 0 })).toBe(scriptedRide());
    });

    it('ignores Snap held under `?snap=off`', () => {
      expect(scriptedRide({ snap: 1 }, { snap: 'off' })).toBe(scriptedRide());
      expect(scriptedRide({ snap: 1 })).not.toBe(scriptedRide());
    });

    it('does nothing lying down', () => {
      const water = new PlaneWater();
      const prone = (snap: number) => {
        const session = new RideSession();
        session.place({ x: 0, z: 0, heading: 0, speed: 1.5, phase: 'prone' }, water);
        for (let n = 0; n < 60; n += 1) session.step(STEP, water, { paddle: true, popUp: false, steer: 0.3, snap });
        return session.board.position.toArray().concat(session.board.velocity.toArray());
      };
      expect(prone(1)).toEqual(prone(0));
    });
  });

  describe('it wins over the crouch, Compress and the trim', () => {
    it('takes its own depth and weight, and drops Compress\'s pull', () => {
      const run = (input: Partial<AttachedRider>) => {
        const { board, rider, water } = flat(7);
        Object.assign(rider, { steer: 1, ...input });
        let pull = 0;
        for (let n = 0; n < 60; n += 1) {
          board.step(STEP, water);
          pull = Math.max(pull, (rider as unknown as { assistForce: Vector3 }).assistForce.length());
        }
        return { rest: rider.leg.rest, front: rider.contact.weight, twist: rider.twist.angle, pull };
      };
      const snap = run({ snap: 1 });
      const all = run({ snap: 1, compress: 1, crouch: 1, trim: 1 });
      const compress = run({ compress: 1, crouch: 0.6 });
      // Snap's legs, loaded as deep as Compress's (round 2: the owner's "load itself ready for the movement"); and no
      // gameplay pull.
      expect(all.rest).toBeCloseTo(snap.rest, 6);
      expect(snap.rest).toBeLessThan(-0.95 * CROUCH_DEPTH);
      expect(all.pull).toBe(0);
      expect(compress.pull).toBeGreaterThan(0);
      // The weight on the tail whatever the trim; the shoulders turned toward the steer.
      expect(all.front).toBeCloseTo(snap.front, 6);
      expect(snap.front).toBeLessThan(0.4);
      expect(snap.twist).toBeGreaterThan(0.5);
    });
  });

  describe('the physics: weight on the tail', () => {
    // Weight back sinks the tail (the Exploratorium's surfing physics; Savitsky 1964): the board trims nose up and the trim's
    // drag slows it. Measured: 7 → 4.8 m/s in 0.8 s on flat water, where level trim keeps 5.9.
    it('slows the board riding straight, nose up, the pressure on the back foot', () => {
      const ride = (snap: number) => {
        const { board, rider, water } = flat(7);
        let pitch = 0;
        let front = 0;
        for (let n = 0; n < 60; n += 1) {
          rider.snap = snap;
          board.step(STEP, water);
          pitch = Math.max(pitch, Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y));
          front = rider.contact.weight;
        }
        return { speed: board.velocity.length(), pitch: (pitch * 180) / Math.PI, front };
      };
      const level = ride(0);
      const snap = ride(1);
      expect(rideKept(snap.speed, level.speed)).toBeLessThan(0.9);
      expect(snap.pitch).toBeGreaterThan(level.pitch + 5);
      expect(snap.front).toBeLessThan(0.35);
      expect(level.front).toBeGreaterThan(0.45);
    });

    // The snap's start (the pinned snap's climb, 150° from the fall line at 6.7 m/s) held 0.6 s and let go: the board
    // pivots on its tail faster than the steer alone turns it (measured 283°/s against 174°/s; 127° by 1 s against 44°).
    // The static face gives the climb nothing back: the board stops dead at the apex (0.09 of its speed) and the rider
    // falls 0.8 s after letting go (1.37 s), as the pinned snap's does.
    it('pivots faster than the steer alone off a climb', () => {
      const steer = snapTurn(acrossFace(150, 6.7), { snap: false, hold: 0 });
      const snap = snapTurn(acrossFace(150, 6.7), { snap: true, hold: 0.6 });
      expect(snap.peak).toBeGreaterThan(200);
      expect(snap.peak).toBeGreaterThan(steer.peak + 50);
      expect(snap.turned[snap.at(1)]).toBeGreaterThan(steer.turned[steer.at(1)] + 50);
    });

    // A bottom turn in the trough (still water, 7 and 9 m/s): Snap held 0.6 s and let go turns sharper than the steer
    // alone and than Compress, sheds speed, and the rider stays on.
    it.each([7, 9])('turns sharper than the steer alone and Compress at %i m/s, and stays on when let go in time', (speed) => {
      const steer = snapTurn(flat(speed), { snap: false, hold: 0 });
      const snap = snapTurn(flat(speed), { snap: true, hold: 0.6 });
      const compressed = flat(speed);
      Object.assign(compressed.rider, { compress: 1, crouch: 0.6 });
      const compress = snapTurn(compressed, { snap: false, hold: 0 });
      const at = snap.at(0.8);
      expect(snap.turned[at]).toBeGreaterThan(steer.turned[at] + 15);
      expect(snap.turned[at]).toBeGreaterThan(compress.turned[at] + 5);
      expect(snap.peak).toBeGreaterThan(Math.max(steer.peak, compress.peak) + 30);
      expect(snap.speeds[at]).toBeLessThan(compress.speeds[at] - 1);
      expect(snap.fell).toBeNaN();
    });

    // On still water, where no face's gravity mixes in, the pivot costs more speed than a carve does, in time and per
    // degree (measured: 7 → 3.8 m/s turning 65° by 0.8 s, where the carve keeps 6.1 m/s turning 27°).
    it('sheds more speed than a carve on still water', () => {
      const carve = snapTurn(flat(7), { snap: false, hold: 0 });
      const snap = snapTurn(flat(7), { snap: true, hold: 0.6 });
      const at = snap.at(0.8);
      expect(snap.speeds[at]).toBeLessThan(0.75 * carve.speeds[at]);
      expect((snap.speed - snap.speeds[at]) / snap.turned[at]).toBeGreaterThan((carve.speed - carve.speeds[at]) / carve.turned[at]);
      expect(snap.turned[at]).toBeGreaterThan(carve.turned[at] + 20);
    });

    // Pushed too hard (held on into the stall), the tail swings across its path past the fins' stall (FIN_STALL, 18°):
    // the fins let go and the tail slides. A held carve keeps its fins under it.
    it('lets the fins go when held on hard, where a carve keeps them', () => {
      const carve = snapTurn(flat(7), { snap: false, hold: 0, seconds: 1.2 });
      const held = snapTurn(flat(7), { snap: true, hold: 9, seconds: 1.2 });
      expect(carve.fin).toBeLessThan(FIN_STALL);
      expect(held.fin).toBeGreaterThan(FIN_STALL);
    });
  });
});

// The pinned turns (`AttachedRider.test.ts`: the snap, the cutback, a bottom turn carried into a top turn), made with
// Snap. None passes; each is pinned with what it measures (docs/research/snap-stance-2026-11-03/README.md).
describe('the pinned turns, with Snap', () => {
  // The pinned snap's climb, Snap held 0.6 s and let go: 136° by 1 s and 150° at 1.07 s (peak 295°/s), on against the
  // steer's 44° and S's 109°. Forsyth et al. 2024's cutbacks and top turns: 152° in 0.96 s. Short by about 0.1 s: the
  // first 0.3 s still lean in the wrong way (the balance's lean-in, the deep U's root).
  it.fails('snaps back down the face from a climb, 150° within 1 s', () => {
    const snap = snapTurn(acrossFace(150, 6.7), { snap: true, hold: 0.6 });
    expect(snap.fell).toBeNaN();
    expect(snap.turned[snap.at(1)]).toBeGreaterThan(150);
  });

  // The pinned cutback (80° across at 9 m/s, 2 s), carved 0.4 s and then Snap for 0.6 s: 76° by 1 s and the rider falls at
  // 1.77 s, the board below planing climbing the static face (7 m/s: 145°, falling at 1.25 s).
  it.fails('cuts back from across the face, turning 150° and staying on', () => {
    const setup = acrossFace(80, 9);
    const { board, rider, water } = setup;
    let last = headingOf(board);
    let turned = 0;
    for (let n = 0; n < 132; n += 1) {
      const t = n * STEP;
      if (t >= 0.2) {
        rider.steer = -1;
        rider.snap = t >= 0.6 && t < 1.2 ? 1 : 0;
      }
      board.step(STEP, water);
      if (!rider.attached) break;
      const now = headingOf(board);
      turned += Math.atan2(Math.sin(now - last), Math.cos(now - last));
      last = now;
    }
    expect(rider.attached).toBe(true);
    expect((-turned * 180) / Math.PI).toBeGreaterThan(150);
  });

  // A compressed bottom turn carried up the face to 120° from the fall line, then Snap with the steer back for 0.6 s: the
  // body still leans into the old turn and the board pivots on it (9 m/s: the turn back is 30°, the rider falls at 1.17
  // s; 10 m/s with the steer a fifth of a second after Snap: back down to 18° from the fall line, falling at 1.97 s).
  it.fails('carries a bottom turn up the face into a snap back down it', () => {
    const { board, rider, water } = acrossFace(90, 9);
    for (let n = 0; n < 12; n += 1) board.step(STEP, water);
    const fromFallLine = () => Math.abs((headingOf(board) * 180) / Math.PI);
    Object.assign(rider, { steer: -1, compress: 1, crouch: 0.6 });
    for (let n = 0; n < 180 && rider.attached && fromFallLine() < 120; n += 1) board.step(STEP, water);
    Object.assign(rider, { steer: 1, compress: 0, crouch: 0 });
    let lowest = 180;
    for (let n = 0; n < 120 && rider.attached; n += 1) {
      rider.snap = n * STEP < 0.6 ? 1 : 0;
      board.step(STEP, water);
      if (rider.attached) lowest = Math.min(lowest, fromFallLine());
    }
    expect(rider.attached).toBe(true);
    expect(lowest).toBeLessThan(90);
  });
});

function rideKept(speed: number, reference: number): number {
  return speed / reference;
}
