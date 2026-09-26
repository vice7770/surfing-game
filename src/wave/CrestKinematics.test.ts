import { describe, expect, it } from 'vitest';
import { BoussinesqSolver } from './BoussinesqSolver';
import { BREAKING_ONSET_RATIO, CrestTracker, breakerForm, surfaceSpeedFactor } from './CrestKinematics';
import { uniformEdges } from './ShallowWaterSolver';
import { waveNumber } from './dispersion';

describe('crest kinematics', () => {
  it('gives the linear surface-to-mean speed ratio, kh·coth(kh)', () => {
    expect(surfaceSpeedFactor(1e-6)).toBeCloseTo(1, 6);
    expect(surfaceSpeedFactor(1)).toBeCloseTo(1 / Math.tanh(1), 9);
    expect(surfaceSpeedFactor(50)).toBe(3);
  });

  it('measures a linear wave: crest speed near the phase speed, surface-speed ratio near a·k·coth(kd)', () => {
    const depth = 10;
    const period = 8;
    const k = waveNumber((2 * Math.PI) / period, depth);
    const amplitude = 0.3;
    const solver = new BoussinesqSolver({ nx: 4, xMin: 0, dx: 1, zEdges: uniformEdges(0, 400, 800), xBoundary: 'periodic' }, () => depth);
    const c = (2 * Math.PI) / period / k;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      // A gentle envelope peaking mid-channel makes one crest the highest.
      const z = solver.zCenters[iz];
      const eta = amplitude * Math.cos(k * (z - 200)) * (1 + 0.05 * Math.cos((2 * Math.PI * (z - 200)) / 400));
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        solver.h[i] = depth + eta;
        solver.qz[i] = c * eta;
      }
    }
    const tracker = new CrestTracker(solver, period, 100);
    for (let s = 0; s < 120; s += 1) {
      solver.step(1 / 60);
      tracker.update(1 / 60);
    }
    const crest = tracker.crest(1)!;
    const expected = amplitude * k / Math.tanh(k * depth);
    expect(crest.speed / c).toBeGreaterThan(0.9);
    expect(crest.speed / c).toBeLessThan(1.1);
    expect(crest.ratio).toBeGreaterThan(0.8 * expected);
    expect(crest.ratio).toBeLessThan(1.2 * expected);
    expect(crest.direction.z).toBeGreaterThan(0.99);
  });

  it('has no crest over dry or nearly dry bed', () => {
    const solver = new BoussinesqSolver({ nx: 3, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40) }, () => -1);
    const tracker = new CrestTracker(solver, 10);
    tracker.update(1 / 60);
    tracker.update(1 / 60);
    expect(tracker.crest(1)).toBeUndefined();
  });

  it('throws a jet only on plunging bed slopes', () => {
    expect(breakerForm(0.2)).toBe('roller');
    expect(breakerForm(0.8)).toBe('jet');
    expect(breakerForm(3)).toBe('none');
    expect(BREAKING_ONSET_RATIO).toBeGreaterThan(0.5);
  });
});
