import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { RideSession } from './RideSession';
import {
  DEFAULT_WEIGHTS, PredictiveController, SCHEDULE_SPEEDS, SCHEDULE_TWIST_K, TWIST_STIFFNESS, scheduledDesign,
  twistKnots, type DesignWeights,
} from './predictiveBalance';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;
/** `AttachedRider`'s own stop, restated here so the test checks the handover against the FORMULA, not against the class. */
const TWIST_BODY_RANGE = 0.87;
const TWIST_STOP = 2000;
const secant = (angle: number): number => {
  const over = Math.abs(angle) - TWIST_BODY_RANGE;
  return over > 0 ? TWIST_STIFFNESS + (TWIST_STOP * over) / Math.abs(angle) : 0;
};

/**
 * **Step 3.5j, `?twistStop=model|design`: the twist joint's end stop, carried by the plant the balance is designed on.**
 *
 * The disagreement it closes is arithmetic and was found by step 3.5i (`docs/research/new-rider/3.5/twist-work.md`
 * §5.2), which **registered it without claiming it as a cause**: `coupleYaw` puts `TWIST_STOP` = 2000 N·m/rad on the
 * joint past `TWIST_BODY_RANGE` = 0.87 rad (49.85°), the balance's internal `TwistPlant` carries `TWIST_STIFFNESS` =
 * 20 and no stop at all, and the measured `cue` ride reached **51.10°** — so the ride enters the region where the two
 * disagree **100x** in stiffness and, at that angle, **43.7 N·m** in torque, which is 44 % of the whole authority the
 * hips have.
 *
 * `'model'` corrects Φ, Γ, the filter and the reference and leaves the gain row alone — the only arm that is purely a
 * change of what the controller BELIEVES. `'design'` re-solves the gain row too, which the LQR answers by wanting the
 * twist handle used up to 20x harder. Measured: `docs/research/new-rider/3.5/twist-stop.md`. **The fall does not
 * move**, which was the expected outcome.
 */

/** A new-rider pair on flat water at `speed` down +z, stepped with the stick hard over from the 13th frame. */
function carve(seconds: number, twistStop?: 'model' | 'design', speed = 8): {
  rider: AttachedRider;
  ticks: { twist: number; modelK: number; schedK: number; u1: number; bank: number; roll: number }[];
  fellAt: number | null;
} {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, {
    phase: 'standing', rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on',
    ...(twistStop ? { twistStop } : {}),
  });
  board.attach(rider);
  const water = new PlaneWater();
  const ticks: { twist: number; modelK: number; schedK: number; u1: number; bank: number; roll: number }[] = [];
  let fellAt: number | null = null;
  for (let n = 0; n < Math.round(seconds / STEP); n += 1) {
    rider.steer = n > 12 ? 1 : 0;
    board.step(STEP, water);
    if (!rider.attached) { fellAt = (n + 1) * STEP; break; }
    const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    ticks.push({
      twist: rider.twistBody.angle,
      modelK: rider.twistModelK,
      schedK: rider.predictor.schedTwistK,
      u1: -rider.predictor.sent[1],
      bank: rider.bank.angle,
      roll: Math.atan2(up.dot(new Vector3(fwd.z, 0, -fwd.x)), up.y),
    });
  }
  return { rider, ticks, fellAt };
}

describe('the twist joint\'s end stop in the balance\'s own plant (opt-in)', () => {
  it('puts the axis\'s first knot exactly at TWIST_STIFFNESS, so a sub-stop tick cannot move', () => {
    expect(SCHEDULE_TWIST_K[0]).toBe(TWIST_STIFFNESS);
    // And the top knot is the stop's own tangent, which the secant approaches from below and never passes.
    expect(SCHEDULE_TWIST_K[SCHEDULE_TWIST_K.length - 1]).toBe(TWIST_STIFFNESS + TWIST_STOP);
    for (let deg = 49.9; deg < 400; deg += 0.1) expect(secant(deg / DEG)).toBeLessThan(TWIST_STIFFNESS + TWIST_STOP);
  });

  it('reads the knots either side of a stiffness, and nothing at all at or below the first', () => {
    expect(twistKnots(undefined)).toBeUndefined();
    expect(twistKnots(Number.NaN)).toBeUndefined();
    expect(twistKnots(0)).toBeUndefined();
    expect(twistKnots(20)).toBeUndefined();
    expect(twistKnots(-500)).toBeUndefined();
    expect(twistKnots(40)).toEqual({ k0: 20, k1: 60, f: 0.5 });
    expect(twistKnots(60)).toEqual({ k0: 20, k1: 60, f: 1 });
    expect(twistKnots(120)).toEqual({ k0: 60, k1: 180, f: 0.5 });
    // Past the top knot it is held there, as the rail's lookup is held at its own limit.
    expect(twistKnots(1e9)).toEqual({ k0: 540, k1: 2020, f: 1 });
  });

  it('is the SECANT, which reproduces the game\'s own joint torque exactly at the angle it is at', () => {
    // `coupleYaw`'s own spring, less its active part: k θ + TWIST_STOP sign(θ)(|θ| − R).
    const game = (angle: number): number => {
      const over = Math.abs(angle) - TWIST_BODY_RANGE;
      return TWIST_STIFFNESS * angle + (over > 0 ? TWIST_STOP * Math.sign(angle) * over : 0);
    };
    for (const deg of [50, 51.1, 55, 60, 75, -51.1, -60]) {
      const angle = deg / DEG;
      expect(secant(angle) * angle).toBeCloseTo(game(angle), 9);
    }
    // At the ride's own peak the shipped line is wrong by 43.7 N·m — 44 % of the hips' 100 N·m authority.
    expect(game(51.1 / DEG) - TWIST_STIFFNESS * (51.1 / DEG)).toBeCloseTo(43.726, 3);
  });

  it('designs the first knot BIT-IDENTICALLY to the shipped design, at every schedule speed', () => {
    const shipped: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two' };
    for (const mode of ['model', 'design'] as const) {
      const weights: DesignWeights = { ...shipped, twistStop: mode };
      for (const speed of SCHEDULE_SPEEDS) {
        const base = scheduledDesign(speed, 0, 0, shipped);
        const knot = scheduledDesign(speed, 0, 0, weights, SCHEDULE_TWIST_K[0]);
        expect(knot.phi).toEqual(base.phi);
        expect(knot.gamma).toEqual(base.gamma);
        expect(knot.k).toEqual(base.k);
        expect(knot.l).toEqual(base.l);
      }
    }
  });

  it('leaves the gain row alone on `model` and re-solves it on `design`, while both correct the plant', () => {
    const shipped: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two' };
    for (const speed of [4, 5, 8.5, 12]) {
      const base = scheduledDesign(speed, 0, 0, shipped);
      for (const k of SCHEDULE_TWIST_K.slice(1)) {
        const model = scheduledDesign(speed, 0, 0, { ...shipped, twistStop: 'model' }, k);
        const design = scheduledDesign(speed, 0, 0, { ...shipped, twistStop: 'design' }, k);
        // Both carry the corrected plant: Φ and Γ move, and by the same amount in both arms.
        expect(model.phi).not.toEqual(base.phi);
        expect(model.phi).toEqual(design.phi);
        expect(model.gamma).toEqual(design.gamma);
        // `model` keeps the shipped gain row; `design` does not, and wants the twist handle used harder.
        expect(model.k).toEqual(base.k);
        expect(design.k).not.toEqual(base.k);
        expect(Math.abs(design.k[1][6])).toBeGreaterThan(Math.abs(base.k[1][6]));
      }
    }
  });

  it('is byte-identical in the controller with the flag off, and with it on below the stop', () => {
    const shipped: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two' };
    const limits = { ankle: 0.25, twist: 100 };
    const senses = [0.01, -0.02, 0.03, 0.04, -0.05, 0.06, 0.007, 0, 0];
    for (const mode of ['model', 'design'] as const) {
      for (const [speed, depth, rail, bank] of [[5, 0, 0, 0.1], [6.7, 0.195, 0.0034, -0.2], [9.3, 0.3, 0.35, 0.3]] as const) {
        const base = new PredictiveController(shipped, 'tan');
        const flagged = new PredictiveController({ ...shipped, twistStop: mode }, 'tan');
        // Below the stop the body hands over nothing (`twistModelK` is 0 and the argument `undefined`), and at or
        // under the first knot `twistKnots` returns nothing either: both must leave the commands bit-identical.
        for (let n = 0; n < 24; n += 1) {
          const a = base.tick(senses, speed, depth, bank, 0, limits, rail, 0);
          const b = flagged.tick(senses, speed, depth, bank, 0, limits, rail, 0, n % 2 ? undefined : TWIST_STIFFNESS);
          expect(b[0]).toBe(a[0]);
          expect(b[1]).toBe(a[1]);
          expect(flagged.raw[0]).toBe(base.raw[0]);
          expect(flagged.raw[1]).toBe(base.raw[1]);
          expect(flagged.schedTwistK).toBe(TWIST_STIFFNESS);
        }
      }
    }
  });

  it('still asks the torso to stay SQUARE through a turn: the flag does not move the reference', () => {
    const shipped: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two' };
    const limits = { ankle: 1e6, twist: 1e6 };
    for (const mode of [undefined, 'model', 'design'] as const) {
      const c = new PredictiveController(mode ? { ...shipped, twistStop: mode } : shipped, 'tan');
      for (const bankDeg of [1.3369, 20, 40]) {
        c.reset();
        c.tick(new Array<number>(9).fill(0), 5, 0, -(bankDeg / DEG), 0, limits, 0, 0, mode ? secant(55 / DEG) : undefined);
        expect(c.reference.x[6]).toBe(0);
      }
    }
  });

  it('hands the schedule the joint\'s own secant past the stop, and NOTHING off the switch', () => {
    const off = carve(4);
    expect(off.ticks.length).toBeGreaterThan(30);
    // The negative control: off the switch the body hands over nothing and the axis never leaves the first knot.
    expect(off.ticks.every((t) => t.modelK === 0)).toBe(true);
    expect(off.ticks.every((t) => t.schedK === TWIST_STIFFNESS)).toBe(true);
    // And the cell must actually reach the stop, or it says nothing about the handover.
    const past = off.ticks.filter((t) => Math.abs(t.twist) > TWIST_BODY_RANGE).length;
    expect(past).toBeGreaterThan(0);

    for (const mode of ['model', 'design'] as const) {
      const on = carve(4, mode);
      expect(on.ticks.filter((t) => Math.abs(t.twist) > TWIST_BODY_RANGE).length).toBeGreaterThan(0);
      let checked = 0;
      for (let i = 1; i < on.ticks.length; i += 1) {
        // The control tick fires on the frame's FIRST substep, so the angle it read is the previous frame's end.
        const want = secant(on.ticks[i - 1].twist);
        expect(on.ticks[i].modelK).toBeCloseTo(want, 9);
        expect(on.ticks[i].schedK).toBeCloseTo(want <= TWIST_STIFFNESS ? TWIST_STIFFNESS : Math.min(2020, want), 9);
        if (want > 0) checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    }
  });

  it('reaches the rider through a RideSession, which is the hop an option has been dropped in before', () => {
    // 6 m/s on flat water with the stick hard over is a cell that reaches the stop (59.9° of twist); 8 and 10 do
    // not reliably, and a cell that never passes 0.87 rad would say nothing about the handover.
    const made = (twistStop?: 'model' | 'design') => {
      const session = new RideSession({
        rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on',
        ...(twistStop ? { twistStop } : {}),
      });
      const water = new PlaneWater();
      session.place({ x: 0, z: 0, heading: 0, speed: 6, phase: 'standing' }, water);
      const seen: { twist: number; modelK: number; schedK: number }[] = [];
      for (let n = 0; n < 240 && session.rider.attached; n += 1) {
        session.step(STEP, water, { paddle: false, popUp: false, steer: n > 12 ? 1 : 0 });
        if (!session.rider.attached) break;
        seen.push({ twist: session.rider.twistBody.angle, modelK: session.rider.twistModelK, schedK: session.rider.predictor.schedTwistK });
      }
      return seen;
    };
    const off = made();
    expect(off.length).toBeGreaterThan(30);
    expect(off.every((t) => t.modelK === 0 && t.schedK === TWIST_STIFFNESS)).toBe(true);
    expect(off.filter((t) => Math.abs(t.twist) > TWIST_BODY_RANGE).length).toBeGreaterThan(0);
    for (const mode of ['model', 'design'] as const) {
      const on = made(mode);
      let moved = 0;
      for (let i = 1; i < on.length; i += 1) {
        const want = secant(on[i - 1].twist);
        expect(on[i].modelK).toBeCloseTo(want, 9);
        if (want > 0) moved += 1;
      }
      // The point of the test: the option arrived, and it arrived on ticks that mattered.
      expect(moved).toBeGreaterThan(0);
    }
  });

  it('is byte-identical in the GAME with the flag off: the whole carve, frame for frame', () => {
    const a = carve(4);
    const b = carve(4);
    expect(b.fellAt).toBe(a.fellAt);
    expect(b.ticks).toEqual(a.ticks);
    // And with the flag on, every frame before the joint first passes the stop must match the default's exactly.
    for (const mode of ['model', 'design'] as const) {
      const on = carve(4, mode);
      const first = on.ticks.findIndex((t) => Math.abs(t.twist) > TWIST_BODY_RANGE);
      expect(first).toBeGreaterThan(0);
      for (let i = 0; i <= first; i += 1) expect(on.ticks[i]).toEqual(a.ticks[i]);
    }
  });
});
