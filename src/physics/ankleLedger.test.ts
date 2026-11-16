import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { createWaterSample } from './SurfWater';
import { FaceWater } from './testing/FaceWater';

/**
 * **Step 3.3i: the ankle ledger (`AttachedRider.ankle`, `AttachedRider.ankleLedger`), the sole's own bound
 * (`ankleLimit: 'feet'`), and the positive control for both.**
 *
 * Step 3.3h measured the board's roll residual at **+33.47 N·m** through the commanded turn and closed on *"the full
 * 33 N·m goes into a board that cannot resist it because there is no joint to absorb it ... not a cap, an ankle he
 * does not have"*. The ankle **is** there: the body's bank θ is the eighth unknown of the board's own solve and the
 * ankle is a spring–damper on the joint's own angle, `τ = K (θ − φ − δ) + (K h + C)(θ̇ − φ̇)`, with K = 800 N·m/rad
 * and C = 80 N·m·s/rad for the new rider. So this file instruments it and bounds it, and these tests are what makes a
 * number off either worth printing.
 *
 * **The predictions, written before any of this ran** (`3.3/README.md` Part 32 §0 and §2):
 *
 * 1. **The ankle's torque IS the board's roll moment from the rider.** Rows 0–5 of the coupled solve a standing rider
 *    runs are **the pair's** momentum (`solveStep`'s own comment), so an internal joint torque belongs only in the
 *    joint's own row and the board's roll comes out of that solve through the point the body is carried at, which
 *    while banking carries the body's own across offset. (On the fallback path the reaction is applied at the rider's
 *    **centre of mass**, and for a massless leg moments about the foot give `τ_ankle = (r_cm − r_foot) × F`, so
 *    `(r_foot − r_board) × F − τ_ankle ≡ (r_cm − r_board) × F` — the same statement.) **So the ankle's booked torque
 *    and the roll ledger's own `rider` residual must be the same moment read two ways.** Predicted: they agree far
 *    better than they cancel.
 * 2. **The joint's own angle is small**, of order `τ/K` plus the rest's ±0.25 rad — not the 14–41° by which the roll
 *    exceeds the commanded lean.
 * 3. **The bound does not bite at the median.** 33 N·m over a 720 N load is an arm of 0.046 m against the feet's own
 *    0.13 m, so `|demand|` sits near a third of `legLoad × 0.13`; what it clips is peaks.
 *
 * All three held when the probe ran them (Part 32 §2, §3). What is asserted here is the instrument, not the finding:
 * the pairing's sign and size against an independent reading, the bound's own arithmetic, that the clamp clamps, that
 * nothing is booked unless the ledger is on, and that with it on the trajectory is identical to the digit.
 */

/** The Canyon-matched cell `3.3/deck.ts` runs, placed the same way, with the new rider standing and a held stick. */
const run = (steps: number, steer: number, options: { ledger?: boolean; limit?: boolean } = {}) => {
  const DEG = 180 / Math.PI;
  AttachedRider.ankleLedger = options.ledger ?? false;
  BoardBody.rollLedger = options.ledger ?? false;
  try {
    const water = new FaceWater({ depth: 2.6, height: 1.4, slope: 16, speed: 5.7, vertical: 'surface' });
    const fall = new Vector3(0, 0, 1);
    const pz = water.crestZ() + 0.75 * water.front;
    const here = water.sampleAt(0, 50, pz, createWaterSample());
    const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
    const entry = (5.7 - alongFlow) / Math.cos(45 / DEG);
    const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
    const hAng = (Math.atan2(fall.x, fall.z) * DEG - 45) / DEG;
    const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
    const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
    const left = new Vector3().crossVectors(normal, forward).normalize();
    const board = new BoardBody({});
    board.place(
      new Vector3(0, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
      new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
      forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
    );
    const rider = new AttachedRider(board.shape, { phase: 'standing', rider: 'new', ...(options.limit ? { ankleLimit: 'feet' as const } : {}) });
    board.attach(rider);
    rider.steer = steer;
    const seen: { torque: number; demand: number; bound: number; load: number; angle: number; absorbed: number; over: number; substeps: number; residual: number }[] = [];
    for (let i = 0; i < steps; i += 1) {
      board.step(1 / 60, water);
      if (!rider.attached) break;
      const a = rider.ankle;
      if (a.substeps > 0) {
        seen.push({
          torque: a.torque, demand: a.demand, bound: a.bound, load: a.load, angle: a.angle, absorbed: a.absorbed, over: a.over, substeps: a.substeps,
          // The probe's own sense for the roll ledger (`deck.ts`: every entry negated into its own roll sense).
          residual: -board.roll.rider,
        });
      }
    }
    return { board, rider, seen };
  } finally {
    AttachedRider.ankleLedger = false;
    BoardBody.rollLedger = false;
  }
};

const median = (v: number[]) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return Number.NaN;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

describe('the ankle ledger and the sole\'s own bound (step 3.3i)', () => {
  it('books the ankle\'s torque as the SAME moment the roll ledger books as the rider\'s residual', () => {
    // Prediction 1. The two are the same moment read two ways, so the difference must be a small fraction of either
    // column and far smaller than the sum. Measured on the probe's own arms at |difference| 0.95 N·m against columns
    // of 16–18 N·m unsteered and 4.24 against 23–33 at a full stick; the thresholds here are loose on purpose.
    const { seen } = run(60, 0, { ledger: true });
    expect(seen.length).toBeGreaterThan(30);
    const size = median(seen.map((x) => Math.abs(x.residual)));
    const difference = median(seen.map((x) => Math.abs(x.torque - x.residual)));
    const sum = median(seen.map((x) => Math.abs(x.torque + x.residual)));
    expect(size).toBeGreaterThan(1);
    expect(difference).toBeLessThan(0.5 * size);
    expect(difference).toBeLessThan(0.5 * sum);
    // And in the same direction, step by step, in the large majority: a sign error in the instrument would invert it.
    const together = seen.filter((x) => Math.sign(x.torque) === Math.sign(x.residual)).length;
    expect(together).toBeGreaterThan(0.8 * seen.length);
  });

  it('builds the sole\'s bound out of the load and the feet\'s HALF-width across, not their width', () => {
    // A factor-of-two slip between a half-width and a width is the shape of error this track has caught repeatedly, so
    // the instrument's own arithmetic is asserted against the posture's published 0.13 m (`riderPosture.ts`).
    const { rider, seen } = run(40, 0, { ledger: true });
    expect(rider.support.xMax).toBeCloseTo(0.13, 9);
    expect(rider.support.xMin).toBeCloseTo(-0.13, 9);
    for (const x of seen) expect(x.bound).toBeCloseTo(x.load * 0.13, 6);
    // And it is the size the code's own note derives, `m g d` = 716 N × 0.13 m = 93 N·m, on a load near a body weight.
    expect(median(seen.map((x) => x.bound))).toBeGreaterThan(70);
    expect(median(seen.map((x) => x.bound))).toBeLessThan(120);
  });

  it('clamps the delivered torque to that bound with the switch on, and clamps nothing without it', () => {
    // Prediction 3's other half: the clamp must bind only where the demand breaches, and the shipped rider must show
    // an `absorbed` of exactly zero — which is the internal control for every A/B in Part 32.
    const open = run(120, 1, { ledger: true });
    for (const x of open.seen) {
      expect(x.absorbed).toBe(0);
      expect(x.torque).toBe(x.demand);
    }
    const held = run(120, 1, { ledger: true, limit: true });
    for (const x of held.seen) {
      // Every substep's delivered torque is inside the bound, so the step's mean and its peak are too.
      expect(Math.abs(x.torque)).toBeLessThanOrEqual(x.bound + 1e-9);
      expect(x.absorbed).toBeGreaterThanOrEqual(-1e-9);
    }
    expect(held.rider.ankle.peak).toBeLessThanOrEqual(held.rider.ankle.bound * (1 + 1e-9) + 1e-6);
    // And on a full stick it really does bite somewhere, or the switch would be untested by this file.
    expect(Math.max(...held.seen.map((x) => x.absorbed))).toBeGreaterThan(0);
  });

  it('keeps the joint\'s own angle small, which is prediction 2, and far inside a human\'s own range', () => {
    // `τ/K` = 33/800 = 0.041 rad = 2.4°, plus the rest the balance commands, which ANKLE_REST_RANGE bounds at 14.32°
    // [R]. No range-of-motion source is offered here: the point is the size against the code's own bound, not against
    // a human's stop, and a number without a population it came from does not belong in an assertion.
    const { seen } = run(60, 0, { ledger: true });
    const DEG = 180 / Math.PI;
    expect(Math.abs(median(seen.map((x) => x.angle))) * DEG).toBeLessThan(5);
    expect(Math.max(...seen.map((x) => Math.abs(x.angle))) * DEG).toBeLessThan(30);
  });

  it('is off by default and changes nothing about the rider or the board when it is on', () => {
    expect(AttachedRider.ankleLedger).toBe(false);
    // Off: nothing is written, so every entry of a stepped rider's ledger is still its initial zero.
    const off = run(30, 1);
    for (const value of Object.values(off.rider.ankle)) expect(value).toBe(0);
    expect(off.seen.length).toBe(0);
    // On: a pure observer — the trajectory is identical to the digit, rider and board.
    const on = run(30, 1, { ledger: true });
    expect(on.board.centerOfMass.toArray()).toEqual(off.board.centerOfMass.toArray());
    expect(on.board.velocity.toArray()).toEqual(off.board.velocity.toArray());
    expect(on.board.angularVelocity.toArray()).toEqual(off.board.angularVelocity.toArray());
    expect(on.board.orientation.toArray()).toEqual(off.board.orientation.toArray());
    expect(on.rider.bank.angle).toBe(off.rider.bank.angle);
    expect(AttachedRider.ankleLedger).toBe(false);
  });
});
