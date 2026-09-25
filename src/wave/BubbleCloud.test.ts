import { describe, expect, it } from 'vitest';
import { BUBBLE_RISE_SPEED, BubbleCloud } from './BubbleCloud';
import { FoamField } from './FoamField';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';

function breakingTank() {
  const solver = new ShallowWaterSolver({ nx: 20, xMin: -10, dx: 1, zEdges: uniformEdges(-10, 10, 20), xBoundary: 'open' }, () => 2);
  const foam = new FoamField(solver, { dense: 3, residual: 10 });
  const cell = 10 * solver.nx + 10;
  // A strong bore: 40 units of foam per second on 1 m² entrains about six bubbles in 0.1 s.
  foam.source[cell] = 40;
  return { solver, foam, cell };
}

const positions = (bubbles: BubbleCloud) =>
  Array.from({ length: bubbles.count }, (_, i) => [bubbles.positions[i * 3], bubbles.positions[i * 3 + 1], bubbles.positions[i * 3 + 2]]);

describe('BubbleCloud', () => {
  it('entrains bubbles under the breaking cell only, below the surface', () => {
    const { solver, foam, cell } = breakingTank();
    const bubbles = new BubbleCloud(1);
    bubbles.update({ solver, foam }, 0.1);
    const drawn = positions(bubbles);
    expect(drawn.length).toBeGreaterThan(3);
    const x = solver.xCenters[cell % solver.nx];
    const z = solver.zCenters[Math.floor(cell / solver.nx)];
    for (const [bx, by, bz] of drawn) {
      expect(Math.abs(bx - x)).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(Math.abs(bz - z)).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(by).toBeLessThan(solver.surfaceAt(cell) - 0.2);
    }
    foam.source.fill(0);
    const quiet = new BubbleCloud(1);
    quiet.update({ solver, foam }, 0.1);
    expect(quiet.count).toBe(0);
  });

  it('rises to the surface and is gone', () => {
    const { solver, foam } = breakingTank();
    const bubbles = new BubbleCloud(1);
    bubbles.update({ solver, foam }, 0.1);
    const start = positions(bubbles);
    foam.source.fill(0);
    bubbles.update({ solver, foam }, 0.5);
    const later = positions(bubbles);
    expect(later.length).toBeGreaterThan(0);
    expect(later[0][1]).toBeCloseTo(start[0][1] + BUBBLE_RISE_SPEED * 0.5, 6);
    for (let step = 0; step < 40; step += 1) bubbles.update({ solver, foam }, 0.1);
    expect(bubbles.count).toBe(0);
  });

  it('replays the same bubbles for the same seed and stays within its pool', () => {
    const run = (seed: number) => {
      const { solver, foam } = breakingTank();
      const bubbles = new BubbleCloud(seed, 64);
      for (let step = 0; step < 20; step += 1) bubbles.update({ solver, foam }, 0.1);
      return positions(bubbles);
    };
    expect(run(3)).toEqual(run(3));
    expect(run(3)).not.toEqual(run(4));
    expect(run(3).length).toBeLessThanOrEqual(64);
  });
});
