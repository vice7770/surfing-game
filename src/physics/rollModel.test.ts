import { describe, expect, it } from 'vitest';
import {
  ROLL_DESIGN, bankAuthority, captureGains, closedLoopMatrix, eigenvalues, modes, referenceGain, stepResponse, steadyCarve, type RollGains, type RollParams,
} from './rollModel';

const G = 9.81;
const plant: RollParams = ROLL_DESIGN.params;
const none: RollGains = { roll: 0, rollRate: 0, bank: 0, bankRate: 0, pull: 0, reference: 0 };

describe('eigenvalues', () => {
  it('finds a damped pair', () => {
    const values = eigenvalues([[0, 1], [-4, -0.4]]);
    expect(values).toHaveLength(2);
    for (const value of values) {
      expect(value.re).toBeCloseTo(-0.2, 6);
      expect(Math.abs(value.im)).toBeCloseTo(Math.sqrt(3.96), 6);
    }
  });

  it('finds real roots of a larger matrix', () => {
    const values = eigenvalues([[2, 0, 0], [1, -3, 0], [4, 5, 7]]).map((v) => v.re).sort((a, b) => a - b);
    expect(values[0]).toBeCloseTo(-3, 6);
    expect(values[1]).toBeCloseTo(2, 6);
    expect(values[2]).toBeCloseTo(7, 6);
  });
});

describe('the roll model', () => {
  it('lets an unheld body fall as an inverted pendulum', () => {
    const loose = { ...plant, hullStiffness: 0, hullDamping: 1, ankleStiffness: 0, ankleDamping: 0 };
    const fastest = Math.max(...eigenvalues(closedLoopMatrix(loose, none)).map((v) => v.re));
    expect(Math.abs(fastest - Math.sqrt(G / plant.height)) / Math.sqrt(G / plant.height)).toBeLessThan(0.02);
  });

  // The plan's first balance: the body's bank toward the steer's reference by a capture-point law. The turn's
  // pull builds behind the rail, so a body banking ahead of it topples inward.
  it('topples a rider that balances on its bank alone', () => {
    expect(modes(eigenvalues(closedLoopMatrix(plant, captureGains(1.5, 4)))).slowest).toBeLessThan(0);
  });

  it('holds the designed rider with every mode damped and quick', () => {
    const designed = modes(eigenvalues(closedLoopMatrix(plant, ROLL_DESIGN.gains)));
    expect(designed.slowest).toBeGreaterThan(6);
    expect(designed.leastDamping).toBeGreaterThanOrEqual(0.4);
  });

  it('carves onto a 40° rail within the feet, the body banked the same', () => {
    const response = stepResponse(plant, ROLL_DESIGN.gains, (40 * Math.PI) / 180, 0.5, 3);
    expect(response.rail * 180 / Math.PI).toBeCloseTo(40, 0);
    expect(response.bank * 180 / Math.PI).toBeCloseTo(40, 0);
    expect(response.rise).toBeLessThan(0.7);
    // About 0.13 m of the feet under 1.1–1.4 body weights.
    expect(response.peakTorque).toBeLessThan(150);
  });
});

describe('steadyCarve', () => {
  it('banks the body and the rail to where gravity and the turn balance', () => {
    const carve = steadyCarve(G * Math.tan((40 * Math.PI) / 180));
    expect(carve.bank * 180 / Math.PI).toBeCloseTo(40, 0);
    expect(carve.rail).toBeCloseTo(carve.bank, 9);
  });
});

// Task 3b: the carve lab's plant. The board rights about the rider's load line (850–910 N·m/rad at 5–7 m/s,
// 1,270–1,700 at 9–11 m/s), so what the feet can do to the body's bank is bounded.
describe('bankAuthority', () => {
  const rider = { mass: 75, height: 0.85, ankleStiffness: 800, footReach: 0.13 };

  it('caps the ankle rest near 0.23 rad at 7 m/s, where the feet reach their edges', () => {
    const at7 = bankAuthority({ ...rider, hullStiffness: 860 });
    expect(at7.series).toBeCloseTo((800 * 860) / 1660, 6);
    expect(at7.restRange).toBeGreaterThan(0.2);
    expect(at7.restRange).toBeLessThan(0.26);
    // About 3 rad/s² of bank: −40° to +40° takes at least 2 √(1.4 / 3) ≈ 1.4 s on the feet alone.
    expect(at7.acceleration).toBeGreaterThan(2.5);
    expect(at7.acceleration).toBeLessThan(3.5);
  });

  it('gives the feet less of the board to roll, and a smaller rest, on a stiffer hull at speed', () => {
    const at7 = bankAuthority({ ...rider, hullStiffness: 860 });
    const at11 = bankAuthority({ ...rider, hullStiffness: 1650 });
    expect(at11.share).toBeLessThan(at7.share);
    expect(at11.restRange).toBeLessThan(at7.restRange);
  });

  it('keeps the reference gain equal to the bank gain for a balance on the bank alone', () => {
    const feedback = { roll: 0, rollRate: 0, bank: 7.4, bankRate: 3.6, pull: 0 };
    expect(referenceGain({ ...plant, hullStiffness: 860, hullDamping: 43, turnLag: 0.04 }, feedback)).toBeCloseTo(7.4, 6);
  });
});
