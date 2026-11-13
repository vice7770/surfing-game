import { describe, expect, it } from 'vitest';
import { eigenvalues } from './rollModel';
import { CONTROL_STEP, PredictiveController, add, closedLoop, continuousPlant, design, discretise, leastDamping, mul, plantAt, scheduledDesign, steadyTurn } from './predictiveBalance';

describe('predictive balance (step 3.2d, model only)', () => {
  it('discretises a first-order lag exactly', () => {
    const { phi, gamma } = discretise([[-2]], [[2]], 0.1);
    expect(phi[0][0]).toBeCloseTo(Math.exp(-0.2), 10);
    expect(gamma[0][0]).toBeCloseTo(1 - Math.exp(-0.2), 10);
  });

  it('keeps the gains\' own modes in the nominal loop with the delay (the predictor exact on its own model)', () => {
    const { y, t } = plantAt(7, 0);
    const d = design(y, t);
    const { a, b } = continuousPlant(y, t);
    const { phi, gamma } = discretise(a, b, CONTROL_STEP);
    const loop = eigenvalues(closedLoop(phi, gamma, d.steps, d), { balance: true, maxIterations: 400 });
    const own = eigenvalues(add(d.phi, mul(d.gamma, d.k), -1), { balance: true, maxIterations: 400 });
    // Away from the delay line's defective cluster at the origin (its computed eigenvalues spread there).
    for (const z of own) if (Math.hypot(z.re, z.im) > 0.1) expect(Math.min(...loop.map((w) => Math.hypot(w.re - z.re, w.im - z.im)))).toBeLessThan(1e-5);
    expect(leastDamping(loop).damping).toBeGreaterThan(0.05);
  });
});

describe('predictive balance in the game (step 3.2e, the runtime controller)', () => {
  const limits = { ankle: 10, twist: 1e4 };
  const plant = (speed: number, depth: number) => {
    const { y, t } = plantAt(speed, depth);
    const { a, b } = continuousPlant(y, t);
    return discretise(a, b, CONTROL_STEP);
  };
  const step = (phi: number[][], gamma: number[][], x: number[], u: readonly number[]) => phi.map((row, i) => row.reduce((s, v, j) => s + v * x[j], 0) + gamma[i][0] * u[0] + gamma[i][1] * u[1]);

  it('runs the same loop as the analysis (`closedLoop`) at a table point', () => {
    const d = scheduledDesign(7, 0);
    const { phi, gamma } = plant(7, 0);
    const m = closedLoop(phi, gamma, d.steps, d);
    let z = new Array<number>(m.length).fill(0);
    z[1] = 0.5;
    let x = z.slice(0, 10);
    const ctl = new PredictiveController();
    let worst = 0;
    for (let k = 0; k < 120; k += 1) {
      const u = ctl.tick(d.c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)), 7, 0, 0, 0, limits);
      x = step(phi, gamma, x, u);
      z = m.map((row) => row.reduce((s, v, j) => s + v * z[j], 0));
      for (let i = 0; i < 10; i += 1) worst = Math.max(worst, Math.abs(x[i] - z[i]));
    }
    expect(worst).toBeLessThan(1e-9);
  });

  it('holds the plant\'s own steady turn for the lean asked for, between the table\'s points', () => {
    const { phi, gamma } = plant(7.2, 0.1);
    const ctl = new PredictiveController();
    let x = new Array<number>(10).fill(0);
    const c = scheduledDesign(7, 0).c;
    for (let k = 0; k < 600; k += 1) {
      const u = ctl.tick(c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0)), 7.2, 0.1, 0.1, 0, limits);
      x = step(phi, gamma, x, u);
    }
    // The blended model is not the plant at 7.2 m/s exactly; the bias takes the difference, so the bank still comes to the ask.
    expect(Math.abs(x[2] - 0.1)).toBeLessThan(5e-3);
    const ref = steadyTurn(phi, gamma, 0.1, 0);
    expect(Math.abs(x[4] - ref.x[4])).toBeLessThan(0.02 * Math.abs(ref.x[4]) + 1e-3);
  });
});
