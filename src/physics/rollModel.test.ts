import { describe, expect, it } from 'vitest';
import {
  ROLL_DESIGN, captureGains, closedLoopMatrix, eigenvalues, modes, stepResponse, steadyCarve, type RollGains, type RollParams,
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
