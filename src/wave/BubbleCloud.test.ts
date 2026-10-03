import { describe, expect, it } from 'vitest';
import { BUBBLE_RISE_SPEED, BubbleCloud } from './BubbleCloud';
import { FoamField } from './FoamField';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';
import { PARTICLE_BUDGETS } from './particleBudget';
import { busyWhitewater } from './particleTestSupport';

function breakingTank() {
  const solver = new ShallowWaterSolver({ nx: 20, xMin: -10, dx: 1, zEdges: uniformEdges(-10, 10, 20), xBoundary: 'open' }, () => 2);
  const foam = new FoamField(solver, { dense: 3, residual: 10 });
  const cell = 10 * solver.nx + 10;
  // A strong bore: 40 units of foam per second on 1 m² entrains about six bubbles in 0.1 s.
  foam.source[cell] = 40;
  foam.reindexSources();
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
    foam.reindexSources();
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
    foam.reindexSources();
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

describe('the Particles setting', () => {
  const run = (bubbles: BubbleCloud, frames = 240) => {
    for (let frame = 0; frame < frames; frame += 1) bubbles.update(busyWhitewater(frame), 1 / 60);
    return bubbles;
  };

  it('keeps the bubbles exactly as they were at High, the default', () => {
    // Pinned from the code before the Particles setting: the same scene, seed and pool, 240 frames.
    const bubbles = run(new BubbleCloud(3));
    expect(bubbles.count).toBe(2142);
    let sum = 0;
    for (let i = 0; i < bubbles.count * 3; i += 1) sum += bubbles.positions[i] * ((i % 5) + 1);
    expect(sum).toBeCloseTo(254815.23696799576, 6);
    const high = new BubbleCloud(3);
    high.setLevel('high');
    run(high);
    expect(Array.from(high.positions.subarray(0, high.count * 3))).toEqual(Array.from(bubbles.positions.subarray(0, bubbles.count * 3)));
  });

  it('entrains a share of the bubbles into a share of the pool at Medium and Low', () => {
    const high = run(new BubbleCloud(3)).count;
    for (const level of ['medium', 'low'] as const) {
      const bubbles = new BubbleCloud(3);
      bubbles.setLevel(level);
      run(bubbles);
      // A share of them, give or take the random draws.
      expect(Math.abs(bubbles.count / high - PARTICLE_BUDGETS[level].bubbles)).toBeLessThan(0.05);
      const { solver, foam } = breakingTank();
      const full = new BubbleCloud(1, 64);
      full.setLevel(level);
      foam.source.fill(400);
      foam.reindexSources();
      full.update({ solver, foam }, 0.1);
      expect(full.count).toBe(64 * PARTICLE_BUDGETS[level].pool);
    }
  });
});

describe('indexed sources and presentation packing', () => {
  it('replays the full-grid traversal exactly at every budget, including full pools and changing sources', () => {
    for (const level of ['high', 'medium', 'low'] as const) {
      const full = new BubbleCloud(17, 64);
      const indexed = new BubbleCloud(17, 64);
      full.setLevel(level);
      indexed.setLevel(level);
      for (let frame = 0; frame < 240; frame += 1) {
        const scene = busyWhitewater(frame);
        const source = scene.foam.source;
        const cells = new Uint32Array(source.length);
        let count = 0;
        for (let i = 0; i < source.length; i += 1) if (source[i] > 0) cells[count++] = i;
        full.update(scene, 1 / 60);
        indexed.update({ ...scene, foam: { source, sourceCells: cells, sourceCount: count } }, 1 / 60);
        expect(indexed.count).toBe(full.count);
        if (frame % 17 === 0 || frame === 239) {
          expect(indexed.positions.subarray(0, indexed.count * 3)).toEqual(full.positions.subarray(0, full.count * 3));
        }
      }
    }
  });

  it('packs on the next read and keeps the same result when intermediate snapshots are skipped', () => {
    const eager = new BubbleCloud(19);
    const lazy = new BubbleCloud(19);
    const buffer = lazy.positions;
    for (let frame = 0; frame < 40; frame += 1) {
      const scene = busyWhitewater(frame);
      eager.update(scene, 1 / 60);
      lazy.update(scene, 1 / 60);
      void eager.positions;
    }
    expect(lazy.count).toBeGreaterThan(0);
    expect(buffer.some((value) => value !== 0)).toBe(false);
    expect(lazy.positions).toBe(buffer);
    expect(lazy.positions.subarray(0, lazy.count * 3)).toEqual(eager.positions.subarray(0, eager.count * 3));
    lazy.clear();
    expect(lazy.count).toBe(0);
    expect(lazy.positions).toBe(buffer);
  });
});
