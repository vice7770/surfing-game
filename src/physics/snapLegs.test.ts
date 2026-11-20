import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider, CROUCH_DEPTH, MANUAL_CROUCH_DEPTH, type AttachedRiderOptions } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;
/** The drive's depth: 0.4 of CROUCH_DEPTH (SNAP_DRIVE_DEPTH), 0.12 m. */
const DRIVEN = 0.4 * CROUCH_DEPTH;

interface Inputs { steer?: number; compress?: number; snap?: number }
interface Frame { t: number; rest: number; force: number; rate: number; turned: number; y: number }

/** Standing on flat water at `speed` down +z, settled for 0.3 s, then `seconds` with the inputs `at(t)` gives. */
function ride(options: AttachedRiderOptions, seconds: number, at: (t: number) => Inputs, speed = 8.5): { frames: Frame[]; rider: AttachedRider; board: BoardBody } {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...options });
  board.attach(rider);
  const water = new PlaneWater();
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  const frames: Frame[] = [];
  const heading = () => { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); };
  let last = heading(); let turned = 0;
  for (let n = 0; n < Math.round(seconds / STEP) && rider.attached; n += 1) {
    const t = n * STEP;
    Object.assign(rider, { steer: 0, compress: 0, snap: 0, ...at(t) });
    const before = rider.leg.rest;
    board.step(STEP, water);
    const now = heading(); turned += Math.atan2(Math.sin(now - last), Math.cos(now - last)) * DEG; last = now;
    frames.push({ t: t + STEP, rest: rider.leg.rest, force: rider.leg.force, rate: (rider.leg.rest - before) / STEP, turned, y: rider.position.y });
  }
  return { frames, rider, board };
}

/** The cutback: a Compress carve to `side` for 1 s, then Snap held with the stick `stick` far the other way. */
const cutback = (side: number, stick = 1) => (t: number): Inputs => (t < 1 ? { steer: side, compress: 1 } : { steer: -side * stick, snap: 1 });
const DRIVE = { snapLegs: 'drive' } as const;

// snap-legs (2026-11-10, the owner on a cutback: the surfer's movement "is very off"; opt-in with `snapLegs: 'drive'`,
// the `?snapLegs=drive` dev switch): under Snap with the stick pushed the legs load and then extend as the board comes
// round, in place of holding Snap's depth. docs/research/snap-legs-2026-11-10/README.md.
describe('Snap\'s driving legs (opt-in)', () => {
  it('leaves the default alone: Snap holds its full depth for as long as it is held', () => {
    const { frames } = ride({}, 2.3, cutback(1));
    const hold = frames.filter((f) => f.t > 1.3);
    expect(hold.length).toBeGreaterThan(50);
    for (const f of hold) expect(f.rest, `at ${f.t}`).toBeLessThan(-CROUCH_DEPTH + 0.01);
  });

  it('changes nothing with no Snap held: trim, a Compress carve and a stick-only carve ride exactly as with the switch off', () => {
    for (const inputs of [{}, { steer: 1, compress: 1 }, { steer: -1 }] as Inputs[]) {
      const off = ride({}, 1.5, () => inputs);
      const on = ride(DRIVE, 1.5, () => inputs);
      expect(on.frames).toEqual(off.frames);
      expect(on.board.position.toArray()).toEqual(off.board.position.toArray());
      expect(on.board.orientation.toArray()).toEqual(off.board.orientation.toArray());
    }
  });

  it('comes in low, holds the load while the board still turns the old way, and extends as it comes round, on both sides', () => {
    for (const side of [1, -1]) {
      const { frames } = ride(DRIVE, 2.3, cutback(side));
      const snap = frames.filter((f) => f.t > 1);
      expect(snap[snap.length - 1].t, `side ${side}`).toBeGreaterThan(2.25); // still riding
      // The board's heading the new way (against the first carve's): its furthest the old way, then round.
      const way = (f: Frame) => -side * f.turned;
      const extreme = snap.reduce((a, b) => (way(b) < way(a) ? b : a));
      expect(extreme.t - 1, `side ${side}`).toBeGreaterThan(0.2);
      // Loaded all the way to there: Snap's own depth, Compress's.
      for (const f of snap.filter((f) => f.t <= extreme.t)) expect(f.rest, `side ${side} at ${f.t}`).toBeLessThan(-CROUCH_DEPTH + 0.01);
      // Then out with the turn: nothing at the extreme, half way by about half the drive's 45°, all of it once the board is round.
      const round = snap.filter((f) => f.t > extreme.t && way(f) - way(extreme) >= 45);
      expect(round.length, `side ${side}`).toBeGreaterThan(10);
      const end = snap[snap.length - 1];
      expect(end.rest, `side ${side}`).toBeGreaterThan(-DRIVEN - 0.01);
      // Never taller than the drive's depth while Snap is held, and never back down once driven.
      for (const f of snap) expect(f.rest, `side ${side} at ${f.t}`).toBeLessThanOrEqual(-DRIVEN + 1e-9);
      const after = snap.filter((f) => f.t > extreme.t);
      for (let i = 1; i < after.length; i += 1) expect(after[i].rest, `side ${side} at ${after[i].t}`).toBeGreaterThanOrEqual(after[i - 1].rest - 1e-9);
      // The legs push the body up no faster than the stance's spring can catch it: g·√(m/k), 0.40–0.57 m/s (`projectionCatch`).
      expect(Math.max(...snap.map((f) => f.rate)), `side ${side}`).toBeLessThanOrEqual(0.57 + 1e-6);
      // And the body really rises over the board with them: higher than the same cutback's with the switch off.
      const held = ride({}, 2.3, cutback(side)).frames;
      expect(Math.max(...frames.map((f, i) => f.y - held[i].y)), `side ${side}`).toBeGreaterThan(0.08);
    }
    // The two sides mirror each other.
    const left = ride(DRIVE, 2.3, cutback(1)).frames;
    const right = ride(DRIVE, 2.3, cutback(-1)).frames;
    expect(left[left.length - 1].rest).toBeCloseTo(right[right.length - 1].rest, 2);
  });

  it('moves in proportion to the stick: half a stick half the way out, no stick Snap\'s held load', () => {
    const end = (frames: Frame[]) => frames[frames.length - 1].rest;
    const full = end(ride(DRIVE, 2.3, cutback(1)).frames);
    // Half a stick brings the board round more slowly: 3 s to be through the drive's 45°.
    const half = end(ride(DRIVE, 3, cutback(1, 0.5)).frames);
    expect(full).toBeGreaterThan(-DRIVEN - 0.01);
    // Half the way from Snap's depth (0.3 m) to the drive's (0.12 m): 0.21 m.
    expect(half).toBeGreaterThan(-(CROUCH_DEPTH + DRIVEN) / 2 - 0.015);
    expect(half).toBeLessThan(-(CROUCH_DEPTH + DRIVEN) / 2 + 0.015);
    // Snap with no stick is the default's Snap, bit for bit.
    const plain = (t: number): Inputs => (t < 0.3 ? {} : { snap: 1 });
    expect(ride(DRIVE, 1.5, plain).frames).toEqual(ride({}, 1.5, plain).frames);
  });

  it('drives out of the deeper load too (`snapDepth: \'deep\'`): down to the tuck\'s depth, out to the same stance', () => {
    const { frames } = ride({ ...DRIVE, snapDepth: 'deep' }, 2.6, cutback(1));
    const snap = frames.filter((f) => f.t > 1);
    expect(Math.min(...snap.map((f) => f.rest))).toBeLessThan(-MANUAL_CROUCH_DEPTH + 0.05);
    expect(snap[snap.length - 1].rest).toBeGreaterThan(-DRIVEN - 0.03);
    for (const f of snap) expect(f.rest).toBeLessThanOrEqual(-DRIVEN + 1e-9);
  });

  // The drive is the leg's own rest length: the only force it makes is the leg's, and the board gets its equal and
  // opposite through the feet. In the board's solve the leg's force enters the rider's row along the leg and nowhere
  // else: moving the rest changes rider plus board's momentum by nothing.
  it('presses the board through the feet as the legs go out, with no net force on rider and board together', () => {
    // The same cutback with the switch off and on, at the moment the drive begins: the leg's force on the body, and its
    // equal on the board, is the larger for the push.
    const off = ride({}, 2.3, cutback(1)).frames;
    const on = ride(DRIVE, 2.3, cutback(1)).frames;
    const start = on.findIndex((f, i) => f.t > 1 && f.rest > off[i].rest + 0.002);
    expect(start).toBeGreaterThan(0);
    const mean = (frames: Frame[]) => frames.slice(start, start + 9).reduce((sum, f) => sum + f.force, 0) / 9;
    expect(mean(on)).toBeGreaterThan(mean(off) + 30);

    const { rider } = ride(DRIVE, 1.9, cutback(1));
    const inner = rider as unknown as { leg: { rest: number; force: number }; legStiffness: number };
    const h = 1 / 240;
    const before = new Float64Array(8);
    rider.coupleStanding(new Float64Array(64), before, h);
    // The legs 1 cm longer at rest (pushing the body up): the spring's force along the leg rises by k × 0.01.
    const push = inner.legStiffness * 0.01;
    inner.leg.force += push;
    const after = new Float64Array(8);
    rider.coupleStanding(new Float64Array(64), after, h);
    const by = Array.from(after, (value, i) => value - before[i]);
    const scale = h * push;
    // Rows 0–5 are rider plus board together (momentum and moment): the push is internal to the two.
    for (let i = 0; i < 6; i += 1) expect(Math.abs(by[i]) / scale, `row ${i}`).toBeLessThan(1e-9);
    // Row 6 is the body along its leg: all of the push; row 7, across it, none.
    expect(by[6] / scale).toBeCloseTo(1, 9);
    expect(Math.abs(by[7]) / scale).toBeLessThan(1e-9);
  });
});
