import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';

const STEP = 1 / 60;

/** Standing on flat water at `speed` down +z, settled for 0.3 s. */
function onFlat(speed: number, carveFlex?: 'on') {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, { phase: 'standing', ...(carveFlex ? { carveFlex } : {}) });
  board.attach(rider);
  const water = new PlaneWater();
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  return { board, rider, water };
}

interface Frame { t: number; rest: number; force: number; rate: number; bank: number; y: number }

/** `seconds` with the inputs `at(t)` gives; every frame's leg, lean and the body's height over the water. */
function ride(carveFlex: 'on' | undefined, seconds: number, at: (t: number) => { steer?: number; compress?: number; crouch?: number }, speed = 9): { frames: Frame[]; rider: AttachedRider; board: BoardBody } {
  const { board, rider, water } = onFlat(speed, carveFlex);
  const frames: Frame[] = [];
  for (let n = 0; n < Math.round(seconds / STEP) && rider.attached; n += 1) {
    const t = n * STEP;
    Object.assign(rider, { steer: 0, compress: 0, crouch: 0, ...at(t) });
    const before = rider.leg.rest;
    board.step(STEP, water);
    frames.push({ t: t + STEP, rest: rider.leg.rest, force: rider.leg.force, rate: (rider.leg.rest - before) / STEP, bank: rider.bank.angle, y: rider.position.y });
  }
  return { frames, rider, board };
}

const lowest = (frames: Frame[]) => Math.min(...frames.map((f) => f.rest));

// carve-flex (2026-11-10, the owner: the surfer's movement in turns is "very off"; opt-in with `carveFlex: 'on'`, the
// `?carveFlex=on` dev switch): on a standing, stick-only carve the legs yield to the turn's load and push back up as it
// ends. docs/research/carve-flex-2026-11-10/README.md.
describe('the carve\'s flexing legs (opt-in)', () => {
  it('leaves the default alone: the stick alone never bends the legs', () => {
    const { frames } = ride(undefined, 1.5, () => ({ steer: 1 }));
    expect(frames.length).toBeGreaterThan(80);
    for (const f of frames) expect(f.rest).toBe(0);
  });

  it('bends nothing without the stick: trim rides exactly as with the switch off', () => {
    const off = ride(undefined, 1.5, () => ({}));
    const on = ride('on', 1.5, () => ({}));
    expect(on.frames).toEqual(off.frames);
    expect(on.board.position.toArray()).toEqual(off.board.position.toArray());
    expect(on.board.orientation.toArray()).toEqual(off.board.orientation.toArray());
  });

  it('sinks as the turn\'s load comes on, to a moderate crouch at most, and rises again as it ends, on both sides', () => {
    for (const side of [1, -1]) {
      const { frames, rider } = ride('on', 4, (t) => ({ steer: t < 1.1 ? side : 0 }), 11);
      expect(rider.attached, `side ${side}`).toBe(true);
      // Through time: nothing before the body leans (the load comes with the lean), then down with it.
      const early = frames.filter((f) => f.t < 0.25);
      const turn = frames.filter((f) => f.t < 1.1);
      expect(lowest(early), `side ${side}`).toBeGreaterThan(-0.01);
      expect(Math.sign(turn[turn.length - 1].bank)).toBe(side);
      expect(Math.abs(turn[turn.length - 1].bank)).toBeGreaterThan(0.5);
      // 0.05–0.12 m: at most CARVE_FLEX of CROUCH_DEPTH, well short of Compress's 0.3 m.
      expect(lowest(turn), `side ${side}`).toBeLessThan(-0.05);
      expect(lowest(frames), `side ${side}`).toBeGreaterThanOrEqual(-0.12 - 1e-9);
      // The stick let go, the legs sink no further and stand up as the board rolls back flat: to the riding stance, no taller.
      const after = frames.filter((f) => f.t >= 1.1);
      expect(lowest(after), `side ${side}`).toBeGreaterThanOrEqual(lowest(turn) - 0.01); // (the motion under way coasts out: millimetres)
      for (const f of after) expect(-f.rest, `side ${side} at ${f.t}`).toBeLessThanOrEqual(0.12 * Math.abs(f.bank) / (50 * Math.PI / 180) + 0.05);
      const end = frames[frames.length - 1];
      expect(end.rest, `side ${side}`).toBeGreaterThan(-0.01);
      expect(Math.max(...frames.map((f) => f.rest))).toBeLessThanOrEqual(1e-9);
      // Rising no faster than the stance's spring can catch the body: g·√(m/k), 0.40–0.57 m/s (`projectionCatch`).
      expect(Math.max(...frames.map((f) => f.rate)), `side ${side}`).toBeLessThanOrEqual(0.57 + 1e-6);
    }
    // The two sides mirror each other.
    const left = ride('on', 1.1, () => ({ steer: 1 }), 11);
    const right = ride('on', 1.1, () => ({ steer: -1 }), 11);
    expect(lowest(left.frames)).toBeCloseTo(lowest(right.frames), 3);
  });

  it('flexes in proportion: a gentle turn a little, a full turn more', () => {
    const half = lowest(ride('on', 1.6, () => ({ steer: 0.5 })).frames);
    const full = lowest(ride('on', 1.6, () => ({ steer: 1 })).frames);
    expect(half).toBeLessThan(-0.005);
    expect(half).toBeGreaterThan(-0.06);
    expect(full).toBeLessThan(half - 0.03);
  });

  it('lets Compress go deeper on top, exactly as Compress alone', () => {
    // Compress from the start: the flex never asks for more than Compress, so the ride is the default's, bit for bit.
    const off = ride(undefined, 1.2, () => ({ steer: 1, compress: 1 }));
    const on = ride('on', 1.2, () => ({ steer: 1, compress: 1 }));
    expect(on.frames).toEqual(off.frames);
    // Compress taken mid-turn over the flex: the legs carry on down from where the flex has them, never back up first.
    const { frames } = ride('on', 1.8, (t) => ({ steer: 1, compress: t >= 1 ? 1 : 0 }));
    const at = frames.findIndex((f) => f.t >= 1);
    expect(frames[at].rest).toBeLessThan(-0.03);
    for (let i = at; i < at + 20; i += 1) expect(frames[i + 1].rest).toBeLessThanOrEqual(frames[i].rest + 1e-9);
    expect(lowest(frames)).toBeLessThan(-0.25);
  });

  // The flex is the leg's own rest length: the only force it makes is the leg's, and the board gets its equal and
  // opposite through the feet. In the board's solve the leg's force enters the rider's row along the leg and nowhere else:
  // moving the rest changes rider plus board's momentum by nothing.
  it('acts on the board only through the leg: unloading it sinking, pressing it rising, with no net force on the two', () => {
    const { rider } = ride('on', 0.9, () => ({ steer: 1 }));
    expect(rider.leg.rest).toBeLessThan(-0.01);
    const inner = rider as unknown as { leg: { rest: number; force: number; extension: number }; legStiffness: number; up: Vector3 };
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
