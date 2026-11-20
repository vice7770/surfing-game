import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider, type AttachedRiderOptions } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;
const G = 9.81;
/** The lean the rider counts as upright (UPRIGHT_BANK), 2°. */
const UPRIGHT = 2 / DEG;

interface Inputs { steer?: number; compress?: number; snap?: number }
/** One step: the time, the body's lean, where the weight sits along the board (− = toward the tail), the board's yaw rate (°/s), the back foot's push (N). */
interface Frame { t: number; bank: number; weight: number; yaw: number; push: number }

/** Standing on flat water at `speed` down +z, settled for 0.3 s, then `seconds` with the inputs `at(t)` gives. */
function ride(options: AttachedRiderOptions, seconds: number, at: (t: number) => Inputs, speed = 9): { frames: Frame[]; rider: AttachedRider; board: BoardBody } {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...options });
  board.attach(rider);
  const water = new PlaneWater();
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  const inner = rider as unknown as { balance: Vector3 };
  const heading = () => { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); };
  let last = heading();
  const frames: Frame[] = [];
  for (let n = 0; n < Math.round(seconds / STEP) && rider.attached; n += 1) {
    const t = n * STEP;
    Object.assign(rider, { steer: 0, compress: 0, snap: 0, ...at(t) });
    board.step(STEP, water);
    const now = heading();
    const yaw = (Math.atan2(Math.sin(now - last), Math.cos(now - last)) * DEG) / STEP;
    last = now;
    frames.push({ t: t + STEP, bank: rider.bank.angle, weight: inner.balance.z, yaw, push: rider.legPush.force.length() });
  }
  return { frames, rider, board };
}

/** The cutback: a Compress carve to `side` for 1 s, then Snap held with the stick the other way. */
const cutback = (side: number) => (t: number): Inputs => (t < 1 ? { steer: side, compress: 1 } : { steer: -side, snap: 1 });
const CROSS = { snapCross: 'on' } as const;

// snap-cross (2026-11-10, the owner on a cutback: "very off", the board turning harder the old way before it comes
// round; opt-in with `snapCross: 'on'`, the `?snapCross=on` dev switch): a Snap taken on the other rail keeps the
// weight over the middle of the board until the body has come over it, the back foot pushing the body across, and only
// then weights the tail. docs/research/snap-rail-change-2026-11-10/README.md.
describe('Snap\'s rail change (opt-in)', () => {
  it('leaves the default alone: Snap weights the tail at once, on the old rail, and the legs push nothing', () => {
    for (const side of [1, -1]) {
      const { frames } = ride({}, 1.6, cutback(side));
      const lean = frames.find((f) => f.t > 1)!.bank;
      expect(Math.abs(lean), `side ${side}`).toBeGreaterThan(0.4);
      // 0.3 s into Snap the body still leans the old way, and the weight is already well back.
      const early = frames.find((f) => f.t > 1.3)!;
      expect(early.bank * lean, `side ${side}`).toBeGreaterThan(0);
      expect(early.weight, `side ${side}`).toBeLessThan(-0.1);
      for (const f of frames) expect(f.push).toBe(0);
    }
  });

  it('changes nothing with no Snap held: trim, a Compress carve, a stick-only carve and a rail change ride exactly as with the switch off', () => {
    const plans: ((t: number) => Inputs)[] = [() => ({}), () => ({ steer: 1, compress: 1 }), () => ({ steer: -1 }), (t) => ({ steer: t < 0.8 ? 1 : -1, compress: 1 }), (t) => ({ steer: t < 0.8 ? -1 : 1 })];
    for (const plan of plans) {
      const off = ride({}, 1.6, plan);
      const on = ride(CROSS, 1.6, plan);
      expect(on.frames).toEqual(off.frames);
      expect(on.board.position.toArray()).toEqual(off.board.position.toArray());
      expect(on.board.orientation.toArray()).toEqual(off.board.orientation.toArray());
    }
  });

  it('keeps the weight over the middle until the body has come over the board, then puts it on the tail, on both sides', () => {
    for (const side of [1, -1]) {
      const { frames } = ride(CROSS, 2.2, cutback(side));
      const snap = frames.filter((f) => f.t > 1);
      const lean = snap[0].bank;
      expect(Math.abs(lean), `side ${side}`).toBeGreaterThan(0.4);
      // The body is over the board when its lean the old way is inside the upright band.
      const over = snap.findIndex((f) => f.bank * Math.sign(lean) <= UPRIGHT);
      expect(over, `side ${side}`).toBeGreaterThan(10);
      // Where the carve left it till then (a couple of centimetres off the middle), not a step toward the tail.
      const carved = frames.filter((f) => f.t <= 1).pop()!.weight;
      expect(Math.abs(carved), `side ${side}`).toBeLessThan(0.05);
      for (const f of snap.slice(0, over)) expect(Math.abs(f.weight - carved), `side ${side} at ${f.t}`).toBeLessThan(0.005);
      // Then to the tail, on the new rail, and it stays there while Snap is held.
      const after = snap.slice(over + 30);
      expect(after.length, `side ${side}`).toBeGreaterThan(10);
      for (const f of after) expect(f.weight, `side ${side} at ${f.t}`).toBeLessThan(-0.1);
    }
    // Snap with no stick has no rail to change: the default's Snap, bit for bit.
    const plain = (t: number): Inputs => (t < 0.3 ? {} : { snap: 1 });
    expect(ride(CROSS, 1.5, plain).frames).toEqual(ride({}, 1.5, plain).frames);
  });

  it('pushes the body across with the back foot, within the leg\'s strength, only while the body leans the old way', () => {
    const { frames, rider } = ride(CROSS, 2.2, cutback(1));
    const snap = frames.filter((f) => f.t > 1);
    const lean = Math.sign(snap[0].bank);
    const pushed = snap.filter((f) => f.push > 0);
    expect(pushed.length).toBeGreaterThan(10);
    for (const f of pushed) expect(f.push).toBeLessThanOrEqual(0.35 * rider.mass * G + 1e-9);
    // Nothing once the body is on the new rail, and nothing before Snap.
    for (const f of snap.filter((f) => f.bank * lean < -0.1)) expect(f.push, `at ${f.t}`).toBe(0);
    for (const f of frames.filter((f) => f.t <= 1)) expect(f.push).toBe(0);
  });

  // The push is the leg drive's pair (legDrive.test): on the body toward the new rail, the opposite on the board at the
  // back foot. In the board's solve it adds nothing to the two's momentum and turns them by the couple of its two lines.
  it('has its equal and opposite on the board at the back foot: nothing on rider plus board, the moment the two forces\' couple', () => {
    const { rider } = ride(CROSS, 1 + 6 * STEP, cutback(1));
    const inner = rider as unknown as { external: Vector3; driveForce: Vector3; arm: Vector3 };
    const force = rider.legPush.force.clone();
    expect(force.length()).toBeGreaterThan(0.1 * rider.mass * G);
    const h = 1 / 240;
    const withPush = new Float64Array(8);
    rider.coupleStanding(new Float64Array(64), withPush, h);
    inner.external.sub(force);
    inner.driveForce.set(0, 0, 0);
    const without = new Float64Array(8);
    rider.coupleStanding(new Float64Array(64), without, h);
    const by = Array.from(withPush, (value, i) => value - without[i]);
    const scale = h * force.length();
    for (let i = 0; i < 3; i += 1) expect(Math.abs(by[i]) / scale).toBeLessThan(1e-9);
    const couple = new Vector3().subVectors(inner.arm, rider.legPush.foot).cross(force).multiplyScalar(h);
    expect(new Vector3(by[3], by[4], by[5]).distanceTo(couple) / scale).toBeLessThan(1e-9);
  });

  it('turns less hard the old way after Snap than the default does', () => {
    for (const side of [1, -1]) {
      // The old way is the first carve's: the sign of the yaw just before Snap.
      const peak = (frames: Frame[]) => {
        const way = Math.sign(frames.filter((f) => f.t <= 1).pop()!.yaw);
        return Math.max(...frames.filter((f) => f.t > 1 && f.t < 1.6).map((f) => f.yaw * way));
      };
      const off = peak(ride({}, 1.7, cutback(side)).frames);
      const on = peak(ride(CROSS, 1.7, cutback(side)).frames);
      expect(off, `side ${side}`).toBeGreaterThan(100);
      expect(on, `side ${side}`).toBeLessThan(0.75 * off);
    }
  });

  it('is the leg drive\'s own push where that is on already: `legDrive: \'on\'` on top changes nothing', () => {
    const alone = ride(CROSS, 2.2, cutback(1));
    const both = ride({ ...CROSS, legDrive: 'on' }, 2.2, cutback(1));
    expect(both.frames).toEqual(alone.frames);
    expect(both.board.orientation.toArray()).toEqual(alone.board.orientation.toArray());
  });
});
