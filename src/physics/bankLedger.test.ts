import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { createWaterSample } from './SurfWater';
import { FaceWater } from './testing/FaceWater';
import { BANK_SOURCES, bankLedger } from './bankLedger';

/**
 * **Step 3.3l: the bank ledger (`bankLedger`), and the three closure tests that make a number off it worth printing.**
 *
 * Step 3.3k measured the strongest ordering this track has produced — *the body's bank passes 10° before the deck's
 * roll does in 48 of 48 runs, median +0.100 s* — and closed on the one sentence it was not entitled to answer: *"what
 * makes the body's bank run away from 0.22 s is the next question and this round does not answer it."* Nine rounds had
 * by then measured everything reachable at the ankle and found all of it innocent, so the next read had to be upstream
 * of the joint: **who leans the body, per source.**
 *
 * The bank is the **eighth unknown of the board's own solve**, so that attribution can be exact rather than fitted.
 * `AttachedRider.coupleStanding` assembles one linear system `A x = b`; `A` is the plant (the two masses, the board's
 * inertia, the water's added mass and damping, the ankle's and leg's own implicit stiffness) and `b` is the substep's
 * explicit forces and torques. **The solve is linear in `b`**, so splitting `b` into named parts and solving once per
 * part gives a decomposition that sums to the solve's own answer identically. And the body's own lean rate is the sum
 * of two of those unknowns, which `AttachedRider.finish` builds in the code:
 * `θ̇_body = Δu̇ / L + ω_board · rollAxis`.
 *
 * **The predictions, written before this ran** (`docs/research/new-rider/3.3/results/33l/33l-predictions.md`, P0):
 * `split`, `closure` and `residual` all come back at machine precision — the partition of `b` is exact, the sum of the
 * per-source solutions is the solve's own answer, and this file's own factorisation agrees with the game's
 * `solveLinear` — on every substep of every run. All three held.
 *
 * What is asserted here is the **instrument**, not the finding: the three closures, that `own = relative + deck` per
 * source and in total, that nothing is booked unless the ledger is on, and that with it on the trajectory is
 * identical to the digit. The findings are Part 35 of the 3.3 README.
 */

/** The Canyon-matched cell the 3.3 probes run, placed the same way, the new rider standing and the stick never touched. */
const run = (steps: number, ledger: boolean, steer = 0) => {
  const DEG = 180 / Math.PI;
  bankLedger.on = ledger;
  try {
    const water = new FaceWater({ depth: 2.6, height: 1.4, slope: 16, speed: 5.7 });
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
    const rider = new AttachedRider(board.shape, { phase: 'standing', rider: 'new' });
    board.attach(rider);
    rider.steer = steer;
    // The counters are reset by `begin()`, which the board only calls while the ledger is on; a run with it off has
    // to clear them itself or it reads the last run's. Doing it here is what makes "books nothing while off" a test.
    bankLedger.begin();
    const seen: {
      bank: number; roll: number; x: number; y: number;
      split: number; closure: number; residual: number; steps: number;
      sumOwn: number; sumRel: number; sumDeck: number; own: number; rel: number; deck: number;
      halves: number; carry: number;
      // Step 3.3m: the plant's own compliances, off the same LU. `linear` is their linearity control.
      unitSteps: number; unitSkipped: number; rollDeckPer: number; rollRelativePer: number;
      ankleOwn: number; ankleRelative: number; ankleDeck: number; pairOwn: number; bodyHeld: number;
      linear: number;
      // Step 3.3p: the lateral compliances, off the same LU, and their two controls.
      sideSwayPer: number; sideRollPer: number; rollSwayPer: number; yawPer: number;
      sideSwayRigid: number; sideSwayFrozen: number; rigidSingular: number;
    }[] = [];
    for (let i = 0; i < steps; i += 1) {
      board.step(1 / 60, water);
      if (!rider.attached) break;
      let sumOwn = 0;
      let sumRel = 0;
      let sumDeck = 0;
      let halves = 0;
      for (const k of BANK_SOURCES) {
        sumOwn += bankLedger.own[k];
        sumRel += bankLedger.relative[k];
        sumDeck += bankLedger.deck[k];
        halves = Math.max(halves, Math.abs(bankLedger.own[k] - (bankLedger.relative[k] + bankLedger.deck[k])));
      }
      seen.push({
        bank: rider.bank.angle,
        roll: rider.angularVelocity.y,
        x: board.position.x,
        y: board.position.y,
        split: bankLedger.split,
        closure: bankLedger.closure,
        residual: bankLedger.residual,
        steps: bankLedger.steps,
        sumOwn,
        sumRel,
        sumDeck,
        own: bankLedger.ownTotal,
        rel: bankLedger.relativeTotal,
        deck: bankLedger.deckTotal,
        halves,
        carry: bankLedger.own.carry,
        unitSteps: bankLedger.unitSteps,
        unitSkipped: bankLedger.unitSkipped,
        rollDeckPer: bankLedger.rollDeckPer,
        rollRelativePer: bankLedger.rollRelativePer,
        ankleOwn: bankLedger.ankleOwn,
        ankleRelative: bankLedger.ankleRelative,
        ankleDeck: bankLedger.ankleDeck,
        pairOwn: bankLedger.pairOwn,
        bodyHeld: bankLedger.bodyHeld,
        // The three unit solves go through ONE `A⁻¹`, so the paired torque's response is the ankle's less the roll
        // unit's, identically. Relative to the largest of the three so it is a precision and not a size.
        linear: Math.abs(bankLedger.pairOwn - (bankLedger.ankleOwn - (bankLedger.rollRelativePer + bankLedger.rollDeckPer)))
          / Math.max(1e-30, Math.abs(bankLedger.pairOwn), Math.abs(bankLedger.ankleOwn)),
        sideSwayPer: bankLedger.sideSwayPer,
        sideRollPer: bankLedger.sideRollPer,
        rollSwayPer: bankLedger.rollSwayPer,
        yawPer: bankLedger.yawPer,
        sideSwayRigid: bankLedger.sideSwayRigid,
        sideSwayFrozen: bankLedger.sideSwayFrozen,
        rigidSingular: bankLedger.rigidSingular,
      });
    }
    return seen;
  } finally {
    bankLedger.on = false;
  }
};

describe('bankLedger', () => {
  it('P0: the partition of b is exact, the per-source solutions sum to the solve, and the factorisation is the game own', () => {
    const seen = run(50, true);
    expect(seen.length).toBe(50);
    for (const row of seen) {
      expect(row.steps).toBeGreaterThan(0);
      // `split`: max |Σ parts − b| over the rows, N·s and N·m·s.
      expect(row.split).toBeLessThan(1e-9);
      // `closure`: max |Σ_source A⁻¹ part − A⁻¹ b| on rows 3, 4, 5 and 7, m/s and rad/s.
      expect(row.closure).toBeLessThan(1e-9);
      // `residual`: this file's own A⁻¹ b against `solveLinear`'s answer, the same rows.
      expect(row.residual).toBeLessThan(1e-9);
    }
  });

  it('own = relative + deck, per source and in total, and the entries sum to the total', () => {
    const seen = run(50, true);
    for (const row of seen) {
      expect(row.halves).toBeLessThan(1e-12);
      expect(Math.abs(row.own - (row.rel + row.deck))).toBeLessThan(1e-12);
      // The means are over the step's substeps, so the sum closes to the step's own rounding and not to zero.
      const scale = Math.max(1, Math.abs(row.own));
      expect(Math.abs(row.sumOwn - row.own) / scale).toBeLessThan(1e-9);
      expect(Math.abs(row.sumRel - row.rel) / scale).toBeLessThan(1e-9);
      expect(Math.abs(row.sumDeck - row.deck) / scale).toBeLessThan(1e-9);
    }
  });

  it('`carry` is floating-point zero for the new surfer, and structurally so', () => {
    // The body's velocity is DEFINED as the rigid carry plus the three joint rates projected on an orthonormal triad
    // (`up`, `across`, `forward`), so the constraint's own momentum gap is zero by construction and what is left is
    // the triad's own round-off. It is 1e-13 rad/s², not 0.0 exactly, and the bound below says so rather than the
    // probe's printed `0.00` being read as an identity.
    for (const row of run(50, true)) expect(Math.abs(row.carry)).toBeLessThan(1e-11);
  });

  it('is a pure observer: the trajectory is identical to the digit with it on and off', () => {
    const off = run(80, false);
    const on = run(80, true);
    expect(on.length).toBe(off.length);
    for (let i = 0; i < off.length; i += 1) {
      expect(on[i].bank).toBe(off[i].bank);
      expect(on[i].roll).toBe(off[i].roll);
      expect(on[i].x).toBe(off[i].x);
      expect(on[i].y).toBe(off[i].y);
    }
  });

  it('books nothing while it is off', () => {
    const off = run(30, false);
    for (const row of off) {
      expect(row.steps).toBe(0);
      expect(row.sumOwn).toBe(0);
      expect(row.own).toBe(0);
      // Step 3.3m: the unit reads are off with it too, so a probe cannot read a stale compliance.
      expect(row.unitSteps).toBe(0);
      expect(row.unitSkipped).toBe(0);
      expect(row.rollDeckPer).toBe(0);
      expect(row.sideSwayPer).toBe(0);
      expect(row.sideSwayFrozen).toBe(0);
      expect(row.ankleOwn).toBe(0);
      expect(row.bodyHeld).toBe(0);
    }
  });

  it('P0a (step 3.3m): the three unit solves are one A⁻¹, and the ankle unit closes in its own two halves', () => {
    const seen = run(50, true);
    for (const row of seen) {
      expect(row.unitSteps).toBeGreaterThan(0);
      // On this cell the body is banking on every substep, so nothing was skipped and the test is not vacuous.
      expect(row.unitSkipped).toBe(0);
      // The linearity of the three unit right-hand sides through one factorisation.
      expect(row.linear).toBeLessThan(1e-9);
      // `own = relative + deck` for the unit read as well as for every source.
      expect(Math.abs(row.ankleOwn - (row.ankleRelative + row.ankleDeck)))
        .toBeLessThan(1e-12 * Math.max(1, Math.abs(row.ankleRelative)));
      // A roll impulse rolls the deck the way it was applied, and an ankle torque rolls it the other way: the two
      // signs are opposite on every substep, which is what makes `|own/relative| < 1` a split and not a sign error.
      expect(row.rollDeckPer).toBeGreaterThan(0);
      expect(row.ankleDeck).toBeLessThan(0);
      // Both compliances are finite and the board's roll inertia they imply is of order 1 kg·m², not 1e-2 or 1e2.
      expect(1 / row.rollDeckPer).toBeGreaterThan(0.02);
      expect(1 / row.rollDeckPer).toBeLessThan(100);
    }
  });

  // Step 3.3p: the lateral block of the same `A⁻¹`, with the two controls that say it is an effective inertia and not
  // an arbitrary number. `A` is symmetric, so the roll–sway corner read from two different back-substitutions must be
  // one entry; and with every row but the three translations welded the pair is one rigid mass, so the sway mass must
  // read the two masses SUMMED — which is the number step 3.3o's brief took the diagonal `system[i][i] += m` to mean.
  it('P0c (step 3.3p): the lateral compliances are one symmetric A⁻¹, and the frozen control reads the masses summed', () => {
    for (const row of run(240, true)) {
      if (row.unitSteps === 0) continue;
      // Symmetry: two back-substitutions, one entry.
      expect(Math.abs(row.sideRollPer - row.rollSwayPer)).toBeLessThan(1e-12 * Math.max(1, Math.abs(row.sideRollPer)));
      // The effective sway mass is a board's, not a pair's: the ankle is compliant over a 1 ms substep.
      expect(1 / row.sideSwayPer).toBeGreaterThan(1);
      expect(1 / row.sideSwayPer).toBeLessThan(40);
      // Welding the bank row alone does NOT weld the pair — the board can still roll out from under the rider.
      expect(1 / row.sideSwayRigid).toBeLessThan(40);
      // Welding everything but the translations does: 2.54 kg of board, the water's share, and the rider's 73 kg.
      expect(1 / row.sideSwayFrozen).toBeGreaterThan(70);
      expect(1 / row.sideSwayFrozen).toBeLessThan(140);
      expect(row.rigidSingular).toBe(0);
      // The yaw inertia the solve meets, against the model's own `boardYawInertia + riderYawInertia` of about 1.9.
      expect(1 / row.yawPer).toBeGreaterThan(0.5);
      expect(1 / row.yawPer).toBeLessThan(10);
    }
  });

  it('P0b (step 3.3m): the compliances change no trajectory — still bit-identical with the ledger on and off', () => {
    const off = run(80, false);
    const on = run(80, true);
    for (let i = 0; i < off.length; i += 1) {
      expect(on[i].bank).toBe(off[i].bank);
      expect(on[i].x).toBe(off[i].x);
      // and the compliances were actually read on those steps, so the test is not vacuous.
      expect(on[i].unitSteps).toBeGreaterThan(0);
    }
  });

  it('is on a steered ride too, with the same three closures', () => {
    for (const row of run(50, true, 0.5)) {
      expect(row.split).toBeLessThan(1e-9);
      expect(row.closure).toBeLessThan(1e-9);
      expect(row.residual).toBeLessThan(1e-9);
      expect(row.halves).toBeLessThan(1e-12);
    }
  });
});
