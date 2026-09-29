import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { ONSET } from './crestOnset';
import { advanceClocks, CLOCK } from './sliceClock';

const THROW = ONSET.throw * ONSET.depthAveraged;
/** A slow peel's clamp: neighbours at most 0.25 s apart per metre of crest. */
const GRADIENT = 0.25;

/** A front of `n` points one metre apart, none thrown, B below the throw. */
function front(n: number, b = 0.7, id = 0): FrontPoint[] {
  return Array.from({ length: n }, (_, k) => ({
    id: k, front: id, column: k, sigma: k, x: k + 0.5, z: 10, b, bRate: 0, height: 1, tau: 0, thrown: false, seen: 0, sliceTau: 0,
  }));
}

describe('the slice clock', () => {
  it('starts a point’s clock at the throw and runs it on', () => {
    const points = front(1);
    points[0].b = THROW;
    advanceClocks(points, 0.1, GRADIENT);
    expect(points[0]).toMatchObject({ thrown: true, tau: 0 });
    advanceClocks(points, 0.1, GRADIENT);
    expect(points[0].tau).toBeCloseTo(0.1, 12);
  });

  it('keeps a point short of the throw in [−1, 0] s, by how fast its B rises', () => {
    const points = front(1, THROW - 0.05);
    advanceClocks(points, 0.1, GRADIENT);
    expect(points[0].tau).toBe(-CLOCK.preThrow);
    points[0].bRate = 0.1;
    advanceClocks(points, 0.1, GRADIENT);
    expect(points[0].tau).toBeCloseTo(-0.5, 12);
    points[0].bRate = 0.01;
    advanceClocks(points, 0.1, GRADIENT);
    expect(points[0].tau).toBe(-CLOCK.preThrow);
    expect(points[0].thrown).toBe(false);
  });

  it('passes a steady 10 m/s peel through untouched', () => {
    const points = front(41);
    const dt = 1 / 30;
    const rate = 0.5;
    // Each point's B rises at `rate` to the throw three steps (0.1 s) per metre from the middle.
    const throwStep = (point: FrontPoint) => 3 * Math.abs(point.column - 20);
    for (let step = 0; step < 60; step += 1) {
      for (const point of points) {
        point.b = step >= throwStep(point) ? THROW : THROW - rate * (throwStep(point) - step) * dt;
        point.bRate = rate;
      }
      advanceClocks(points, dt, GRADIENT);
    }
    points.forEach((point) => expect(point.tau).toBeCloseTo(Math.max(-CLOCK.preThrow, (59 - throwStep(point)) * dt), 9));
  });

  it('spreads a throw from the middle, neighbours no more than the clamp apart', () => {
    const points = front(41);
    points[20].b = THROW;
    for (let t = 0; t < 2; t += 1 / 30) {
      advanceClocks(points, 1 / 30, GRADIENT);
      for (let k = 1; k < points.length; k += 1) {
        expect(Math.abs(points[k].tau - points[k - 1].tau)).toBeLessThanOrEqual(GRADIENT * (points[k].sigma - points[k - 1].sigma) + 1e-9);
      }
    }
    // The middle is never held back; the throw has spread τ / GRADIENT metres each way.
    expect(points[20].tau).toBeGreaterThan(1.9);
    const reach = Math.floor(points[20].tau / GRADIENT);
    points.forEach((point) => expect(point.thrown).toBe(Math.abs(point.column - 20) <= reach));
  });

  it('tapers the drawn τ to zero at a front’s ends, linearly over the end metres', () => {
    const points = front(21);
    for (const point of points) point.b = THROW;
    for (let t = 0; t < 1; t += 0.1) advanceClocks(points, 0.1, GRADIENT);
    const tau = points[10].tau;
    expect(points[0].sliceTau).toBe(0);
    expect(points[20].sliceTau).toBe(0);
    expect(points[1].sliceTau).toBeCloseTo(tau / CLOCK.endTaper, 12);
    expect(points[2].sliceTau).toBeCloseTo((2 * tau) / CLOCK.endTaper, 12);
    expect(points[10].sliceTau).toBe(tau);
    // The clock itself runs on at the ends: only what is drawn tapers.
    expect(points[0].tau).toBe(tau);
  });

  it('never turns a thrown clock back, whatever its neighbours do', () => {
    const points = front(30);
    for (let t = 0, step = 0; t < 10; t += 1 / 30, step += 1) {
      // Onsets arrive in groups of five columns, 0.5 s apart: the teeth the sweep softens.
      for (const point of points) if (step >= 15 * Math.floor(point.column / 5)) point.b = THROW;
      const before = points.map((point) => (point.thrown ? point.tau : undefined));
      advanceClocks(points, 1 / 30, GRADIENT);
      points.forEach((point, k) => {
        if (before[k] !== undefined) expect(point.tau).toBeGreaterThanOrEqual(before[k]! + 1 / 30 - 1e-12);
      });
    }
  });

  it('clocks each front on its own', () => {
    const points = [...front(5, 0.7, 0), ...front(5, 0.7, 1)];
    points[4].b = THROW;
    for (let t = 0; t < 1; t += 0.1) advanceClocks(points, 0.1, GRADIENT);
    expect(points[4].tau).toBeGreaterThan(0.2);
    expect(points[5].tau).toBe(-CLOCK.preThrow);
  });
});
