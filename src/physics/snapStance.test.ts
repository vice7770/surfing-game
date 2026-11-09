import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider, CROUCH_DEPTH, MANUAL_CROUCH_DEPTH } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { FIN_STALL } from './finForces';
import { PlaneWater } from './PlaneWater';
import { stanceFeet } from './riderPosture';
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
      const back = run({ trim: -1 });
      // Snap's legs, loaded as deep as Compress's (round 2: the owner's "load itself ready for the movement"); and no
      // gameplay pull.
      expect(all.rest).toBeCloseTo(snap.rest, 6);
      expect(snap.rest).toBeLessThan(-0.95 * CROUCH_DEPTH);
      expect(all.pull).toBe(0);
      expect(compress.pull).toBeGreaterThan(0);
      // The weight on the tail whatever the trim, further back than Compress's and full S's (measured 0.43 of the load on
      // the front foot, against 0.70 and 0.49, turning at 7 m/s); the shoulders turned toward the steer.
      expect(all.front).toBeCloseTo(snap.front, 6);
      expect(snap.front).toBeLessThan(0.45);
      expect(snap.front).toBeLessThan(compress.front - 0.2);
      expect(snap.front).toBeLessThan(back.front);
      expect(snap.twist).toBeGreaterThan(0.5);
    });
  });

  describe('the physics: weight on the tail', () => {
    // Weight back sinks the tail (the Exploratorium's surfing physics; Savitsky 1964): the board trims nose up and the trim's
    // drag slows it. Measured (round 2, the hips over the back foot): 7 → 4.8 m/s in 1 s on flat water, where level trim
    // keeps 5.3; 17° nose up against 9°; 0.48 of the load on the front foot against 0.76.
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
      expect(rideKept(snap.speed, level.speed)).toBeLessThan(0.95);
      expect(snap.pitch).toBeGreaterThan(level.pitch + 5);
      expect(snap.front).toBeLessThan(0.5);
      expect(level.front).toBeGreaterThan(0.7);
    });

    // Round 2: the hips over the back foot, not behind it (level, in the world: the board trims nose up under them).
    // Measured riding straight at 7 m/s: the centre of mass 0.09–0.14 m ahead of the back foot and the hips 0.04–0.10 m;
    // with the upper body also leaning back as full S does (round 1 and the first round-2 commit) they sat 0.03–0.14 m
    // and 0.11–0.24 m behind it, the board trimmed 20–47° nose up and, pivoting about the rider, ran 60–70° off its path.
    it('keeps the centre of mass over the back foot, not behind it', () => {
      const { board, rider, water } = flat(7);
      const rear = stanceFeet(board.shape).rear;
      let least = Infinity;
      let most = -Infinity;
      for (let n = 0; n < 60; n += 1) {
        rider.snap = 1;
        board.step(STEP, water);
        if (n < 30) continue;
        const foot = board.toWorld(new Vector3(0, 0, rear), new Vector3());
        const level = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
        const over = rider.position.clone().sub(foot).dot(level);
        least = Math.min(least, over);
        most = Math.max(most, over);
      }
      expect(rider.leg.rest).toBeLessThan(-0.95 * CROUCH_DEPTH);
      expect(least).toBeGreaterThan(0);
      expect(most).toBeLessThan(0.2);
    });

    // The snap's start (the pinned snap's climb, 150° from the fall line at 6.7 m/s) held 0.6 s and let go: the board
    // comes round twice as far by 1 s as the steer alone turns it (round 2: 91° against 44°, peak 191°/s against 174°/s),
    // and the rider stays on. With the upper body leaning back past the hips it pivoted further (127° by 1 s, 283°/s) but
    // stalled dead at the apex sliding sideways, and the rider fell 0.8 s after letting go.
    it('turns twice as far as the steer alone off a climb, and stays on', () => {
      const steer = snapTurn(acrossFace(150, 6.7), { snap: false, hold: 0 });
      const snap = snapTurn(acrossFace(150, 6.7), { snap: true, hold: 0.6 });
      // snap-recentre (2026-11-06): the weight is centred again once Snap is let go; round 2's figures came after the release
      // with the weight left over the tail (the owner's "stuck in snap stance"). Centred, the peak is the steer's (172 against
      // 174°/s, round 2's 191) and the turn by 1 s 1.7× the steer's (76° against 44°; round 2's 91°, 2.1×).
      expect(snap.peak).toBeGreaterThan(0.95 * steer.peak);
      expect(snap.turned[snap.at(1)]).toBeGreaterThan(1.6 * steer.turned[steer.at(1)]);
      expect(snap.fell).toBeNaN();
    });

    // A bottom turn in the trough (still water, 7 and 9 m/s): Snap held 0.6 s and let go turns sharper than the steer alone
    // and about as far as Compress with its gameplay pull (round 2: 51° and 31° by 0.8 s, against 27° and 22°, and
    // Compress's 49° and 32°), peaks far faster, sheds speed where Compress's carry keeps it, and the rider stays on.
    it.each([7, 9])('turns sharper than the steer alone and as far as Compress at %i m/s, and stays on when let go in time', (speed) => {
      const steer = snapTurn(flat(speed), { snap: false, hold: 0 });
      const snap = snapTurn(flat(speed), { snap: true, hold: 0.6 });
      const compressed = flat(speed);
      Object.assign(compressed.rider, { compress: 1, crouch: 0.6 });
      const compress = snapTurn(compressed, { snap: false, hold: 0 });
      const at = snap.at(0.8);
      expect(snap.turned[at]).toBeGreaterThan(steer.turned[at] + 8);
      expect(snap.turned[at]).toBeGreaterThan(compress.turned[at] - 3);
      // snap-recentre (2026-11-06): the weight is centred again once Snap is let go; round 2's figures carried it left
      // over the tail after the release (the owner's "stuck in snap stance"): the peak 32°/s over the best of the steer
      // and Compress at 9 m/s (round 2: over 50).
      expect(snap.peak).toBeGreaterThan(Math.max(steer.peak, compress.peak) + 25);
      expect(snap.speeds[at]).toBeLessThan(compress.speeds[at] - 1.5);
      expect(snap.fell).toBeNaN();
    });

    // On still water, where no face's gravity mixes in, the tail-loaded turn costs more speed than a carve does, in time
    // and per degree (round 2: 6.8 → 4.7 m/s turning 51° by 0.8 s, where the carve keeps 6.1 m/s turning 27°). Taken at
    // full effort (snap-quick), the body moving back onto the tail pushes the board on under it a moment: 5.0 m/s at 0.8 s.
    it('sheds more speed than a carve on still water', () => {
      const carve = snapTurn(flat(7), { snap: false, hold: 0 });
      const snap = snapTurn(flat(7), { snap: true, hold: 0.6 });
      const at = snap.at(0.8);
      expect(snap.speeds[at]).toBeLessThan(0.85 * carve.speeds[at]);
      expect((snap.speed - snap.speeds[at]) / snap.turned[at]).toBeGreaterThan((carve.speed - carve.speeds[at]) / carve.turned[at]);
      expect(snap.turned[at]).toBeGreaterThan(carve.turned[at] + 20);
    });

    // Held on, the tail-loaded turn keeps slowing toward a stall, its fins under it, the board turning with its path
    // rather than spinning under the rider (round 2, still water at 7 m/s: 3.9 m/s and 78° by 1.2 s, the centre fin's
    // attack at most 7°). With the upper body leaning back past the hips the tail swung across its path past the fins'
    // stall (FIN_STALL, 18°; 58–65°) and the board slid (2.2 m/s, 58°).
    it('keeps its fins when held on, slowing toward a stall, and the rider stays on', () => {
      const carve = snapTurn(flat(7), { snap: false, hold: 0, seconds: 1.2 });
      const held = snapTurn(flat(7), { snap: true, hold: 9, seconds: 1.2 });
      expect(carve.fin).toBeLessThan(FIN_STALL);
      expect(held.fin).toBeLessThan(FIN_STALL);
      expect(held.speeds[held.speeds.length - 1]).toBeLessThan(0.6 * held.speed);
      expect(held.speeds[held.speeds.length - 1]).toBeLessThan(0.8 * carve.speeds[carve.speeds.length - 1]);
      expect(held.fell).toBeNaN();
    });

    // Let go with the steer held on (the keys' 0.2 s ramp, `InputAxes`), the board carries on round under the rider: the
    // fins grip a heading within 25° of its path. Round 1 and the first round-2 commit spun it back (the heading 60–70° off
    // its path, the fins weathervaning it 100° the other way) and the rider fell (still water, 7 m/s).
    it('carries on round when let go, rather than spinning back', () => {
      const { board, rider, water } = flat(7);
      for (let n = 0; n < 12; n += 1) board.step(STEP, water);
      const ramp = (from: number, t: number) => Math.max(0, Math.min(1, (t - from) / 0.2));
      let last = headingOf(board);
      let turned = 0;
      let atRelease = 0;
      let least = 0;
      let drift = 0;
      for (let n = 0; n < 108; n += 1) {
        const t = n * STEP;
        rider.steer = -ramp(0, t);
        rider.snap = t < 0.6 ? ramp(0, t) : 1 - ramp(0.6, t);
        board.step(STEP, water);
        expect(rider.attached).toBe(true);
        const now = headingOf(board);
        turned += Math.atan2(Math.sin(now - last), Math.cos(now - last));
        last = now;
        if (Math.abs(t - 0.8) < 1e-9) atRelease = turned;
        if (t > 0.8) least = Math.min(least, turned - atRelease);
        const path = Math.atan2(board.velocity.x, board.velocity.z);
        drift = Math.max(drift, Math.abs(Math.atan2(Math.sin(now - path), Math.cos(now - path))));
      }
      // snap-recentre (2026-11-06): the weight is centred again once Snap is let go; round 2's figures carried it left
      // over the tail after the release (the owner's "stuck in snap stance"): the fins re-engaged, it comes round 90°
      // (round 2: over 100°).
      expect((-turned * 180) / Math.PI).toBeGreaterThan(80);
      expect((least * 180) / Math.PI).toBeLessThan(5);
      expect((drift * 180) / Math.PI).toBeLessThan(30);
    });
  });
});

// snap-quick (the owner's research, 2026-11-05): from Compress, with the legs already loaded, a snap is set up in about
// 0.2–0.5 s, the head and shoulders first, then the weight slammed onto the tail. Taken at full effort while Snap is held
// (SNAP_TWIST_FREQUENCY, SNAP_SHIFT_TIME), from Compress at full steer on still water at 8 m/s, the shoulders reach 90 %
// of their wind and the body 90 % of its way back over the tail in 0.35 and 0.43 s, against 0.48 and 0.52 s at the
// balance's calm pace (`snapQuick: 'old'`, the `?snapQuick=old` dev switch).
describe('the snap set up from Compress', () => {
  const setUp = (snapQuick?: 'old') => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 8));
    const rider = new AttachedRider(board.shape, { phase: 'standing', ...(snapQuick ? { snapQuick } : {}) });
    board.attach(rider);
    const water = new PlaneWater() as SurfWater;
    const rear = stanceFeet(board.shape).rear;
    const back = () => {
      const foot = board.toWorld(new Vector3(0, 0, rear), new Vector3());
      const level = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
      return rider.position.clone().sub(foot).dot(level);
    };
    Object.assign(rider, { compress: 1, steer: -1 });
    for (let n = 0; n < 24; n += 1) board.step(STEP, water);
    const twist: number[] = [];
    const over: number[] = [];
    const from = back();
    Object.assign(rider, { compress: 0, snap: 1 });
    for (let n = 0; n < 42; n += 1) {
      board.step(STEP, water);
      twist.push(rider.twist.angle);
      over.push(back());
    }
    const reach = (series: number[], start: number) => {
      const end = series.slice(-6).reduce((a, x) => a + x, 0) / 6;
      return (series.findIndex((x) => (x - start) / (end - start) >= 0.9) + 1) * STEP;
    };
    return { twist: reach(twist, 0), weight: reach(over, from), attached: rider.attached };
  };
  it('winds the shoulders and puts the weight on the tail within the coaching\'s half second, sooner than the calm pace', () => {
    const quick = setUp();
    const calm = setUp('old');
    expect(quick.attached).toBe(true);
    expect(quick.twist).toBeLessThan(0.4);
    expect(quick.weight).toBeLessThan(0.47);
    expect(quick.twist).toBeLessThan(calm.twist - 0.05);
    expect(quick.weight).toBeLessThan(calm.weight - 0.03);
  });
});

// snap-recentre (the owner, 2026-11-06: "snap gets stuck in snap stance, the game says it changes but the animation or the
// surfer gets stuck"): let go, the rider centres the weight again (RECENTRE_TIME). Riding straight on still water at 8 m/s,
// Snap held 0.8 s and let go: the centre of mass comes back from 0.08 m ahead of the back foot to 0.28 m by 0.75 s (0.30
// before the snap), the front foot's share to 0.72 (0.79). As before (`snapRecentre: 'old'`) it stayed at 0.04–0.08 m with
// the front foot at 0.46–0.57 for the next 1.5 s.
describe('Snap let go', () => {
  const release = (snapRecentre?: 'old') => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 8));
    const rider = new AttachedRider(board.shape, { phase: 'standing', ...(snapRecentre ? { snapRecentre } : {}) });
    board.attach(rider);
    const water = new PlaneWater() as SurfWater;
    const rear = stanceFeet(board.shape).rear;
    const over = () => {
      const foot = board.toWorld(new Vector3(0, 0, rear), new Vector3());
      const level = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
      return rider.position.clone().sub(foot).dot(level);
    };
    for (let n = 0; n < 30; n += 1) board.step(STEP, water);
    const before = over();
    rider.snap = 1;
    for (let n = 0; n < 48; n += 1) board.step(STEP, water);
    const held = over();
    rider.snap = 0;
    for (let n = 0; n < 45; n += 1) board.step(STEP, water);
    return { before, held, after: over(), front: rider.contact.frontShare, attached: rider.attached };
  };
  it('centres the weight again, where before it stayed over the tail', () => {
    const centred = release();
    const stuck = release('old');
    expect(centred.attached).toBe(true);
    expect(centred.held).toBeLessThan(centred.before - 0.15);
    expect(centred.after).toBeGreaterThan(centred.before - 0.06);
    expect(centred.front).toBeGreaterThan(0.65);
    expect(stuck.after).toBeLessThan(stuck.before - 0.15);
  });
});

// snap-lean (the owner's pick, 2026-11-05; opt-in with `snapPivot: 'lean'`, the `?snapPivot=lean` dev switch): a full
// steer under Snap leans as far as its tight turn holds, up to 70°, in place of the steer's 50° (top turns ride a 75 ± 3°
// rail, Forsyth et al. 2024). Round 3 measured it sharper everywhere (still water at 7 m/s, keys: 92° by 1 s at up to
// 215°/s, against 61° at 151°/s), at the cost of more falls at the stall on still water. Here, with instant input, it
// leans 47° against 36° and turns 93° by 1 s at up to 236°/s, against 50° at 199°/s. By default nothing changes.
describe('Snap leaning for its own turn (opt-in)', () => {
  const trough = (snapPivot?: 'lean') => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 7));
    const rider = new AttachedRider(board.shape, { phase: 'standing', ...(snapPivot ? { snapPivot } : {}) });
    board.attach(rider);
    const water = new PlaneWater() as SurfWater;
    for (let n = 0; n < 12; n += 1) board.step(STEP, water);
    let last = headingOf(board);
    let turned = 0;
    let peak = 0;
    let bank = 0;
    for (let n = 0; n < 60; n += 1) {
      Object.assign(rider, { steer: 1, snap: n * STEP < 0.6 ? 1 : 0 });
      board.step(STEP, water);
      if (!rider.attached) break;
      const now = headingOf(board);
      const d = Math.atan2(Math.sin(now - last), Math.cos(now - last));
      last = now;
      turned += d;
      peak = Math.max(peak, Math.abs(d) / STEP);
      bank = Math.max(bank, Math.abs(rider.bank.angle));
    }
    return { turned: (Math.abs(turned) * 180) / Math.PI, peak: (peak * 180) / Math.PI, bank: (bank * 180) / Math.PI };
  };
  it('leans further and turns sharper', () => {
    const steerCap = trough();
    const lean = trough('lean');
    expect(lean.bank).toBeGreaterThan(steerCap.bank + 8);
    expect(lean.turned).toBeGreaterThan(steerCap.turned + 15);
    // snap-recentre (2026-11-06): the weight is centred again once Snap is let go; round 2's figures carried it left
    // over the tail after the release (the owner's "stuck in snap stance"): 20°/s over (36° before).
    expect(lean.peak).toBeGreaterThan(steerCap.peak + 15);
  });
});

describe('Snap\'s deeper load (opt-in)', () => {
  // snap-carve (2026-11-08, the owner's "doesn't lower the center of gravity so much"): `snapDepth: 'deep'` loads Snap's
  // legs toward the tube tuck's 0.45 m. Still water at 7 m/s, instant input, Snap held 0.6 s with the steer on.
  const turn = (snapDepth?: 'deep', snapPivot?: 'lean') => {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 7));
    const rider = new AttachedRider(board.shape, { phase: 'standing', ...(snapDepth ? { snapDepth } : {}), ...(snapPivot ? { snapPivot } : {}) });
    board.attach(rider);
    const water = new PlaneWater() as SurfWater;
    for (let n = 0; n < 12; n += 1) board.step(STEP, water);
    let last = headingOf(board);
    let turned = 0;
    let peak = 0;
    let rest = 0;
    for (let n = 0; n < 60; n += 1) {
      Object.assign(rider, { steer: 1, snap: n * STEP < 0.6 ? 1 : 0 });
      board.step(STEP, water);
      if (!rider.attached) break;
      const now = headingOf(board);
      const d = Math.atan2(Math.sin(now - last), Math.cos(now - last));
      last = now;
      turned += d;
      peak = Math.max(peak, Math.abs(d) / STEP);
      rest = Math.min(rest, rider.leg.rest);
    }
    return { attached: rider.attached, turned: (Math.abs(turned) * 180) / Math.PI, peak: (peak * 180) / Math.PI, rest };
  };
  // Measured: the legs 0.34–0.35 m down by 1 s against 0.28; the turn by 1 s 46° against 43° (with `snapPivot: 'lean'` 73°
  // against 77°), the peak 193°/s against 198 (211 against 218): no sharper. Both stay on here; round 2's still-water
  // protocol (7 and 9 m/s, the steer held, eased or let go, keys or pad) falls in 5 of 12 against 2 (11 of 12 either way
  // leaning): docs/research/snap-carve-2026-11-08/README.md.
  it('loads deeper than Compress, within the tuck, and turns about as far', () => {
    for (const pivot of [undefined, 'lean'] as const) {
      const as = turn(undefined, pivot);
      const deep = turn('deep', pivot);
      expect(as.rest).toBeGreaterThan(-CROUCH_DEPTH - 1e-9);
      expect(deep.rest).toBeLessThan(as.rest - 0.05);
      expect(deep.rest).toBeGreaterThan(-MANUAL_CROUCH_DEPTH - 1e-9);
      expect(deep.attached).toBe(as.attached);
      expect(Math.abs(deep.turned - as.turned)).toBeLessThan(5);
      expect(Math.abs(deep.peak - as.peak)).toBeLessThan(10);
    }
  });
});

// snap-stamp (the owner's ask of 2026-11-08: "turn less or very sharply with snap"; opt-in with `snapStamp: 'on'`, the
// `?snapStamp=on` dev switch): under Snap a steer past STAMP_STEER (0.8) stamps the weight past the tail for 0.25 s once
// Snap has set the hips over it (0.3 s), then back over the fins; a partial steer is Snap's carve as before. Round 2's
// climbs of the static 15° face, instant input, Snap held 0.6 s with the steer held on: docs/research/snap-stamp-2026-11-08/README.md.
describe('Snap\'s stamp (opt-in)', () => {
  const climb = (across: number, speed: number, steer: number, snapStamp?: 'on') => {
    const setup = acrossFace(across, speed);
    const rider = new AttachedRider(setup.board.shape, { phase: 'standing', ...(snapStamp ? { snapStamp } : {}) });
    setup.board.attach(rider);
    for (let n = 0; n < 12; n += 1) setup.board.step(STEP, setup.water);
    let last = headingOf(setup.board);
    let turned = 0;
    let at1 = 0;
    let peak = 0;
    let slid = 0;
    let fell = Number.NaN;
    let least = Infinity;
    for (let n = 0; n < 96; n += 1) {
      Object.assign(rider, { steer, snap: n * STEP < 0.6 ? 1 : 0 });
      setup.board.step(STEP, setup.water);
      if (!rider.attached) { fell = (n + 1) * STEP; break; }
      least = Math.min(least, setup.board.velocity.length());
      const now = headingOf(setup.board);
      const d = Math.atan2(Math.sin(now - last), Math.cos(now - last));
      last = now;
      turned += d;
      if (n * STEP < 1) {
        at1 = turned;
        peak = Math.max(peak, Math.abs(d) / STEP);
        if (finAttack(setup.board) > (18 * Math.PI) / 180) slid += STEP;
      }
    }
    return { attached: rider.attached, at1: (Math.abs(at1) * 180) / Math.PI, peak: (peak * 180) / Math.PI, slid, turned, fell, least };
  };
  // Measured here: from 150° at 6.7 m/s 90° by 1 s at up to 222°/s against 76° at 172°/s; both stall near the apex (the
  // static face gives nothing back) and fall, the stamp's 0.05 s later. From 120°, 70° at 268°/s against 51° at 214°/s,
  // both on, the centre fin past its stall 0.23 s against 0.07.
  it('turns a full steer sharper, the tail sliding a moment, and keeps the rider on', () => {
    for (const across of [150, 120]) {
      const today = climb(across, 6.7, 1);
      const stamp = climb(across, 6.7, 1, 'on');
      // No more falls than today's Snap: from 150° at 6.7 m/s both stall at the static face's apex and fall, the stamp's later.
      if (!stamp.attached) expect(today.attached, `${across}`).toBe(false);
      if (!stamp.attached) expect(stamp.fell, `${across}`).toBeGreaterThan(today.fell);
      expect(stamp.at1, `${across}`).toBeGreaterThan(today.at1 + 12);
      expect(stamp.peak, `${across}`).toBeGreaterThan(Math.max(200, today.peak + 25));
    }
    // From 120° the centre fin passes its stall (FIN_STALL, 18°) for a moment, then grips again.
    const slide = climb(120, 6.7, 1, 'on').slid;
    expect(slide).toBeGreaterThan(0.1);
    expect(slide).toBeLessThan(0.4);
  });
  it('leaves a partial steer under Snap as it was, bit for bit', () => {
    for (const across of [150, 120]) {
      expect(climb(across, 6.7, 0.6, 'on').turned).toBe(climb(across, 6.7, 0.6).turned);
      expect(climb(across, 8, 0.75, 'on').turned).toBe(climb(across, 8, 0.75).turned);
    }
  });
  it('rides the same with the switch and no Snap', () => {
    expect(scriptedRide({}, { snapStamp: 'on' })).toBe(BEFORE_SNAP);
  });
});

// rider-agile (the owner, 2026-11-08: "surfers have incredible agility and balance and stretching abilities, right now the
// playable surfer is a bit static"; opt-in with `agile: 'on'`, the `?agile=on` dev switch): the two feet act apart on the
// board (the feet's couple against the hips, the legs' split against the trunk), and under Snap a steer past 0.8 launches
// the tail with them in the stamp's place. The same climbs as the stamp's: docs/research/rider-agile-2026-11-09/README.md.
describe('the agile legs (opt-in)', () => {
  const climb = (across: number, speed: number, steer: number, agile?: 'on', each?: (rider: AttachedRider, board: BoardBody, t: number) => void) => {
    const setup = acrossFace(across, speed);
    const rider = new AttachedRider(setup.board.shape, { phase: 'standing', ...(agile ? { agile } : {}) });
    setup.board.attach(rider);
    for (let n = 0; n < 12; n += 1) setup.board.step(STEP, setup.water);
    let last = headingOf(setup.board);
    let turned = 0;
    let at1 = 0;
    let slid = 0;
    for (let n = 0; n < 96; n += 1) {
      Object.assign(rider, { steer, snap: n * STEP < 0.6 ? 1 : 0 });
      setup.board.step(STEP, setup.water);
      if (!rider.attached) break;
      each?.(rider, setup.board, (n + 1) * STEP);
      const now = headingOf(setup.board);
      turned += Math.atan2(Math.sin(now - last), Math.cos(now - last));
      last = now;
      if (n * STEP < 1) {
        at1 = turned;
        if (finAttack(setup.board) > FIN_STALL) slid += STEP;
      }
    }
    return { attached: rider.attached, at1: (Math.abs(at1) * 180) / Math.PI, turned, slid };
  };
  // Measured here (the README's table is the probe's): by 1 s the launch turns the climb from 120° further and the one
  // from 150° as far (75° both), and no rider falls where today's from 150° does; the fins grip throughout (no slide:
  // the bars' 200–300°/s and 120° are not met).
  it('turns a full steer under Snap as far as today or further, with no more falls', () => {
    for (const across of [150, 120]) {
      const today = climb(across, 6.7, 1);
      const agile = climb(across, 6.7, 1, 'on');
      if (today.attached) expect(agile.attached, `${across}`).toBe(true);
      expect(agile.at1, `${across}`).toBeGreaterThan(today.at1 + (across === 120 ? 8 : -3));
      expect(agile.slid, `${across}`).toBeLessThan(0.1);
    }
  });
  it('leaves a partial steer under Snap as it was, bit for bit', () => {
    for (const across of [150, 120]) {
      expect(climb(across, 6.7, 0.6, 'on').turned).toBe(climb(across, 6.7, 0.6).turned);
      expect(climb(across, 8, 0.75, 'on').turned).toBe(climb(across, 8, 0.75).turned);
    }
  });
  it('rides the same with the switch and no Snap', () => {
    expect(scriptedRide({}, { agile: 'on' })).toBe(BEFORE_SNAP);
  });
  // No hidden motors: what turns and pitches the board is two feet's forces, equal and opposite (no net force on the
  // pair), whose moment is the hips' and the trunk's torques reversed; each foot pushes across no harder than a leg can.
  it('moves the board only by the feet\'s forces, equal and opposite, with their reaction on the hips and the trunk', () => {
    let worked = 0;
    let most = 0;
    climb(120, 6.7, 1, 'on', (rider, board) => {
      const [front, back] = rider.limbs;
      const torques = rider.legTorques;
      expect(front.force.clone().add(back.force).length()).toBeLessThan(1e-9);
      const lever = front.point.clone().sub(back.point).applyQuaternion(board.orientation);
      const moment = lever.clone().cross(front.force);
      const along = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
      const push = front.force.clone().addScaledVector(along, -front.force.dot(along));
      // The moment has nothing about the board's length (the feet stand on its line), and its size is the two torques'.
      expect(Math.abs(moment.dot(along))).toBeLessThan(1e-6);
      expect(moment.length()).toBeCloseTo(Math.hypot(torques.hip, torques.trunk), 3);
      expect(push.length() * lever.length()).toBeCloseTo(Math.hypot(torques.hip, torques.trunk), 3);
      if (torques.hip !== 0 || torques.trunk !== 0) worked += 1;
      most = Math.max(most, Math.abs(torques.hip));
    });
    expect(worked).toBeGreaterThan(10);
    // The feet's couple: within the legs' strength sideways (0.35 body weights a foot over the feet's 0.63 m).
    expect(most).toBeGreaterThan(20);
    expect(most).toBeLessThanOrEqual(0.35 * 75 * 9.81 * 0.63 + 1e-9);
  });
  // The hips and the trunk start and end at rest and come home: over a launch and its recovery the feet's couples give
  // the board no net angular impulse (what turns it for good is the water).
  it('gives the board no net angular impulse over a launch and its recovery', () => {
    const setup = flat(8);
    const rider = new AttachedRider(setup.board.shape, { phase: 'standing', agile: 'on' });
    setup.board.attach(rider);
    for (let n = 0; n < 12; n += 1) setup.board.step(STEP, setup.water);
    let peak = 0;
    for (let n = 0; n < 150 && rider.attached; n += 1) {
      Object.assign(rider, { steer: 1, snap: n < 60 ? 1 : 0 });
      setup.board.step(STEP, setup.water);
      peak = Math.max(peak, Math.abs(rider.hip.angle));
    }
    expect(peak).toBeGreaterThan((8 * Math.PI) / 180);
    expect(peak).toBeLessThanOrEqual((15 * Math.PI) / 180 + 1e-12);
    // Home and at rest: the momentum the hips and the trunk took from the board is all given back.
    expect(Math.abs(rider.hip.angle)).toBeLessThan(0.01);
    expect(Math.abs(rider.hip.rate)).toBeLessThan(0.02);
    expect(Math.abs(rider.trunk.angle)).toBeLessThan(0.01);
    expect(Math.abs(rider.trunk.rate)).toBeLessThan(0.02);
  });
  // The drawing follows the physics: at the launch's end the drawn head is back over the tail of the pelvis, the pelvis
  // is forward (the back leg longer, the front leg shorter than today's Snap at the same moment), the hands swung
  // against the turn with the hips.
  it('shows the launch in the drawn points', () => {
    const drawn = (agile?: 'on') => {
      const setup = flat(8);
      const rider = new AttachedRider(setup.board.shape, { phase: 'standing', ...(agile ? { agile } : {}) });
      setup.board.attach(rider);
      for (let n = 0; n < 12; n += 1) setup.board.step(STEP, setup.water);
      for (let n = 0; n < 33; n += 1) {
        Object.assign(rider, { steer: 1, snap: 1 });
        setup.board.step(STEP, setup.water);
      }
      const point = (i: number) => setup.board.toLocal(rider.renderPoint(i, setup.board, new Vector3()), new Vector3());
      const regular = rider.stance === 'regular';
      return { pelvis: point(0), head: point(2), front: point(regular ? 5 : 6), back: point(regular ? 6 : 5), hand: point(3), hip: rider.hip.angle, trunk: rider.trunk.angle, twist: rider.drawnTwist - rider.twist.angle };
    };
    const today = drawn();
    const agile = drawn('on');
    expect(today.hip).toBe(0);
    expect(today.twist).toBe(0);
    // A left turn: the hips to the right (negative), the trunk back (negative).
    expect(agile.hip).toBeLessThan((-8 * Math.PI) / 180);
    expect(agile.trunk).toBeLessThan((-5 * Math.PI) / 180);
    expect(agile.twist).toBeCloseTo(agile.hip, 12);
    expect(agile.head.z - agile.pelvis.z).toBeLessThan(today.head.z - today.pelvis.z - 0.05);
    expect(agile.pelvis.distanceTo(agile.back)).toBeGreaterThan(today.pelvis.distanceTo(today.back) + 0.005);
    expect(agile.pelvis.distanceTo(agile.front)).toBeLessThan(today.pelvis.distanceTo(today.front) - 0.01);
    expect(agile.hand.x).toBeLessThan(today.hand.x - 0.05);
  });

  // Stage 2a (docs/research/rider-agile-2026-11-09/README.md): Snap held with the hand button takes the toes' rail.
  describe('the rail grab (Snap with the hand button)', () => {
    const GRIP = 450;
    const grabRide = (steer: number, each?: (rider: AttachedRider, board: BoardBody, t: number) => void, plan: (t: number) => { snap: number; hand: boolean } = () => ({ snap: 1, hand: true })) => {
      const setup = flat(8);
      const rider = new AttachedRider(setup.board.shape, { phase: 'standing', agile: 'on' });
      setup.board.attach(rider);
      for (let n = 0; n < 12; n += 1) setup.board.step(STEP, setup.water);
      for (let n = 0; n < 72 && rider.attached; n += 1) {
        Object.assign(rider, { steer, ...plan(n * STEP) });
        setup.board.step(STEP, setup.water);
        each?.(rider, setup.board, (n + 1) * STEP);
      }
      return { rider, board: setup.board };
    };
    // Measured on stage 1's code (main 0e54ef4a) with this helper: the four climbs' turns, rad.
    it('leaves the agile legs without the hand button as they were, bit for bit', () => {
      const before = [1.5479012735983415, 1.9794174489951115, 1.8049282226528067, 1.502058699424341];
      const now: number[] = [];
      for (const across of [150, 120]) for (const speed of [6.7, 8]) now.push(climb(across, speed, 1, 'on').turned);
      expect(now).toEqual(before);
    });
    // The hand is a third entry in the ledger only while it holds the rail, drawn there, within a hand's grip; the
    // launch waits for it; the feet's couple is still equal and opposite.
    it('holds the rail with the drawn hand, within its grip, once the body is low enough to reach', () => {
      for (const steer of [1, -1]) {
        let heldAt = Number.NaN;
        let most = 0;
        let hand = 0;
        grabRide(steer, (rider, board, t) => {
          const [front, back, third] = rider.limbs;
          expect(front.force.clone().add(back.force).length()).toBeLessThan(1e-9);
          if (!rider.grab.held) {
            expect(third).toBeUndefined();
            expect(rider.grab.force).toBe(0);
            if (Number.isNaN(heldAt)) expect(rider.hip.angle).toBe(0);
            return;
          }
          if (Number.isNaN(heldAt)) heldAt = t;
          expect(third.name).toBe('hand');
          expect(third.force.length()).toBeLessThanOrEqual(GRIP + 1e-6);
          most = Math.max(most, third.force.length());
          // On the toes' rail (Regular's −x), between the feet, and one drawn hand is on that point.
          expect(third.point.x).toBeLessThan(-0.15);
          const rail = board.toWorld(third.point, new Vector3());
          const drawn = [3, 4].map((i) => rider.renderPoint(i, board, new Vector3()).distanceTo(rail));
          hand = drawn[0] < drawn[1] ? 3 : 4;
          expect(Math.min(...drawn)).toBeLessThan(1e-9);
          expect(Math.max(...drawn)).toBeGreaterThan(0.3);
        });
        expect(heldAt, `${steer}`).toBeGreaterThan(0.4);
        expect(heldAt, `${steer}`).toBeLessThan(0.75);
        expect(most, `${steer}`).toBeGreaterThan(100);
        // Regular: a left turn (steer +) is backside, the trailing (right) hand's pigdog; frontside the leading hand.
        expect(hand, `${steer}`).toBe(steer > 0 ? 4 : 3);
      }
    });
    it('levers the rail up backside only, and lets go with the button or out of reach', () => {
      const pull = (steer: number) => { let most = 0; grabRide(steer, (rider) => { most = Math.max(most, rider.grab.pull); }); return most; };
      expect(pull(1)).toBeGreaterThan(0.5 * GRIP);
      expect(pull(1)).toBeLessThanOrEqual(0.6 * GRIP + 1e-9);
      expect(pull(-1)).toBe(0);
      // The button let go at 0.9 s: the hand is off the rail at once and gives nothing.
      const released = grabRide(0, (rider, _board, t) => { if (t > 0.92) { expect(rider.grab.held).toBe(false); expect(rider.limbs.length).toBe(2); } }, (t) => ({ snap: 1, hand: t < 0.9 }));
      expect(released.rider.grab.reach).toBe(0);
      // Pressed for 0.3 s only: the body is not down yet, and the hand never held.
      let held = false;
      grabRide(0, (rider) => { held ||= rider.grab.held; }, (t) => ({ snap: t < 0.3 ? 1 : 0, hand: t < 0.3 }));
      expect(held).toBe(false);
    });
    // Free of the water (the sea swapped for air under a held grab), a full steer's pull and launch: the board's and
    // the rider's momentum together change by gravity's alone. (Their angular momentum with the rotors' is not closed
    // in the air, with or without the hand: see the README.)
    it('keeps the linear momentum of board and rider through a pull and a launch in the air', () => {
      const { rider, board } = grabRide(0, undefined, () => ({ snap: 1, hand: true }));
      expect(rider.grab.held).toBe(true);
      const air = new PlaneWater({ inside: () => false }) as SurfWater;
      const momentum = () => board.velocity.clone().multiplyScalar(board.mass).addScaledVector(rider.velocity, rider.mass);
      const before = momentum();
      let most = 0;
      let wound = 0;
      for (let n = 1; n <= 18; n += 1) {
        Object.assign(rider, { steer: 1, snap: 1, hand: true });
        board.step(STEP, air);
        const change = momentum().sub(before);
        change.y += (board.mass + rider.mass) * 9.81 * n * STEP;
        expect(change.length()).toBeLessThan(1e-9);
        most = Math.max(most, rider.grab.force);
        wound = Math.max(wound, Math.abs(rider.hip.angle));
      }
      expect(most).toBeGreaterThan(200);
      expect(wound).toBeGreaterThan((15 * Math.PI) / 180);
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

// snap-upturn (2026-11-08, the owner on a pad with `?snapPivot=lean&snapStamp=on&snapDepth=deep`: "I can't turn UP the
// wave ... the surfer gets confused and falls"; docs/research/snap-upturn-2026-11-08/README.md). A bottom turn: on the
// 15° face heading 35° off the fall line, a full steer up the face under Snap for 0.6 s, then everything let go. Before,
// Snap leaned the top turn's 70° rail into the climb (44° of bank at the release against the steer's 32°); the climb
// took the speed that held it and the rider fell in 1.2–1.4 s after the press. Now it asks for the steer's rail.
describe('Snap turning up the face (bottom turn)', () => {
  const upturn = (speed: number, snapUpturn?: 'old') => {
    const yaw = (35 * Math.PI) / 180;
    const normal = new Vector3(0, 1, Math.tan(FACE)).normalize();
    const fall = new Vector3(0, -Math.sin(FACE), Math.cos(FACE));
    const side = new Vector3().crossVectors(normal, fall).normalize();
    const forward = fall.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(side, -Math.sin(yaw)).normalize();
    const left = new Vector3().crossVectors(normal, forward).normalize();
    const board = new BoardBody();
    board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed));
    const rider = new AttachedRider(board.shape, { phase: 'standing', snapPivot: 'lean', snapStamp: 'on', snapDepth: 'deep', ...(snapUpturn ? { snapUpturn } : {}) });
    board.attach(rider);
    const water = new PlaneWater({ slopeZ: -Math.tan(FACE) }) as SurfWater;
    for (let n = 0; n < 12; n += 1) board.step(STEP, water);
    const fromFall = () => {
      const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
      return (Math.acos(Math.max(-1, Math.min(1, f.z))) * 180) / Math.PI;
    };
    const start = fromFall();
    let fell = Number.NaN;
    let twist = 0;
    let most = start;
    for (let n = 0; n < 120; n += 1) {
      const on = n * STEP < 0.6;
      // Heading toward −x with the board's left down the face, up the face is the board's right: the steer −1.
      Object.assign(rider, { steer: on ? -1 : 0, snap: on ? 1 : 0 });
      board.step(STEP, water);
      if (!rider.attached) {
        fell = (n + 1) * STEP;
        break;
      }
      if (on) twist = Math.min(twist, rider.twist.angle);
      most = Math.max(most, fromFall());
    }
    return { fell, twist, climbed: most - start };
  };
  it.each([8, 9])('stays on at %i m/s, the shoulders wound toward the turn, the board come round up the face', (speed) => {
    const now = upturn(speed);
    expect(now.fell).toBeNaN();
    // The shoulders wind the turn's way (the steer's sign), most of the spine's range.
    expect(now.twist).toBeLessThan(-0.5);
    expect(now.climbed).toBeGreaterThan(15);
    // Before (`snapUpturn: 'old'`), the rider fell inside 1.6 s of the press.
    expect(upturn(speed, 'old').fell).toBeLessThan(1.6);
  });
});
