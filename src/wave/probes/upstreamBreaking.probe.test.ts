// Probe (opt-in: PROBE=1): the upstream experiment's copy of breakingTerms, in all-neighbours mode, reproduces the solver's own bit for bit.
import { expect, it } from 'vitest';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { inheritOnlyFromUpstream } from './upstreamBreaking';

it.skipIf(!process.env.PROBE)('the copied breaking method reproduces the solver’s own in all mode', () => {
  const config = { spot: 'reef' as const, seed: 1, significantHeight: 2, peakPeriod: 14, directionDegrees: 0, spreading: 24, tide: 0, componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1 };
  const run = () => {
    const s = new SurfZoneSimulation(config);
    let breaking = 0;
    for (let k = 0; k < 600; k += 1) {
      s.step(1 / 30);
      for (const v of (s.solver as BoussinesqSolver).breakingStrength) if (v > 0) breaking += 1;
    }
    return { h: Float64Array.from(s.solver.h), breaking };
  };
  const original = (BoussinesqSolver.prototype as unknown as { breakingTerms: unknown }).breakingTerms;
  const a = run();
  inheritOnlyFromUpstream('all');
  const b = run();
  (BoussinesqSolver.prototype as unknown as { breakingTerms: unknown }).breakingTerms = original;
  console.log('breaking cell-steps', a.breaking, b.breaking);
  expect(a.breaking).toBeGreaterThan(0);
  expect(b.breaking).toBe(a.breaking);
  for (let i = 0; i < a.h.length; i += 1) expect(b.h[i]).toBe(a.h[i]);
}, 600_000);
