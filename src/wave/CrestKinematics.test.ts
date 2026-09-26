import { describe, expect, it } from 'vitest';
import { BoussinesqSolver, madsenSorensenCelerity } from './BoussinesqSolver';
import { JET_SPEED_RATIO, breakerForm, crestSpeedAt } from './CrestKinematics';
import { uniformEdges } from './ShallowWaterSolver';
import { waveNumber } from './dispersion';

/** A linear wave train travelling shoreward over a flat 10 m bed; returns the solver after one step and the crest row. */
function travellingWave(amplitude = 0.3, period = 8, depth = 10) {
  const k = waveNumber((2 * Math.PI) / period, depth);
  const c = (2 * Math.PI) / period / k;
  const solver = new BoussinesqSolver({ nx: 4, xMin: 0, dx: 1, zEdges: uniformEdges(0, 400, 800), xBoundary: 'periodic' }, () => depth);
  for (let iz = 0; iz < solver.nz; iz += 1) {
    const eta = amplitude * Math.cos(k * (solver.zCenters[iz] - 200));
    for (let ix = 0; ix < solver.nx; ix += 1) {
      solver.h[iz * solver.nx + ix] = depth + eta;
      solver.qz[iz * solver.nx + ix] = c * eta;
    }
  }
  solver.step(1 / 60);
  let crest = 0;
  for (let iz = 300; iz < 500; iz += 1) if (solver.h[iz * solver.nx + 1] > solver.h[crest * solver.nx + 1]) crest = iz;
  return { solver, crest, omega: (2 * Math.PI) / period, depth };
}

describe('crest kinematics', () => {
  it("measures a travelling crest's speed from the surface's own motion on its front face", () => {
    const { solver, crest, omega, depth } = travellingWave();
    const speed = crestSpeedAt(solver, crest * solver.nx + 1)!;
    const expected = madsenSorensenCelerity(omega, depth);
    expect(speed).toBeGreaterThan(0.95 * expected);
    expect(speed).toBeLessThan(1.05 * expected);
  });

  it('finds no crest speed on still water', () => {
    const solver = new BoussinesqSolver({ nx: 3, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40) }, () => 3);
    solver.step(1 / 60);
    expect(crestSpeedAt(solver, 20 * solver.nx + 1)).toBeUndefined();
  });

  it('throws a jet only on plunging bed slopes, at the crest speed until measured otherwise', () => {
    expect(breakerForm(0.2)).toBe('roller');
    expect(breakerForm(0.8)).toBe('jet');
    expect(breakerForm(3)).toBe('none');
    expect(JET_SPEED_RATIO).toBe(1);
  });
});
