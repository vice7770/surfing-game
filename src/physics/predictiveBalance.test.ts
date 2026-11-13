import { describe, expect, it } from 'vitest';
import { eigenvalues } from './rollModel';
import { CONTROL_STEP, add, closedLoop, continuousPlant, design, discretise, leastDamping, mul, plantAt } from './predictiveBalance';

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
    for (const z of own) expect(Math.min(...loop.map((w) => Math.hypot(w.re - z.re, w.im - z.im)))).toBeLessThan(1e-5);
    expect(leastDamping(loop).damping).toBeGreaterThan(0.05);
  });
});
