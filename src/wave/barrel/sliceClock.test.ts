import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { advanceClocks } from './sliceClock';

const DT = 1 / 30;

/** A crest line of `n` points one metre apart. */
function crest(n: number, id = 0): FrontPoint[] {
  return Array.from({ length: n }, (_, k) => ({
    id: k, front: id, column: k, sigma: k, x: k + 0.5, z: 10, b: NaN, height: 1, onset: 0, tau: 0, seen: 0,
  }));
}

/**
 * Runs the clock at DT from 0 to `seconds`. A point is on the front from its break at `breaksAt(point)`, its onset
 * that time (as BreakingFront backdates it); the pauses are counted.
 */
function run(all: FrontPoint[], seconds: number, breaksAt: (point: FrontPoint) => number, each?: (time: number) => void): number {
  let pauses = 0;
  for (let step = 0; step * DT <= seconds + 1e-9; step += 1) {
    const time = step * DT;
    const front = all.filter((point) => time >= breaksAt(point) - 1e-9);
    for (const point of front) point.onset = breaksAt(point);
    pauses += advanceClocks(front, time);
    each?.(time);
  }
  return pauses;
}

describe('the slice clock', () => {
  it('runs a point’s clock from its onset', () => {
    const points = crest(1);
    points[0].onset = 5;
    advanceClocks(points, 5);
    expect(points[0].tau).toBe(0);
    advanceClocks(points, 5.1);
    expect(points[0].tau).toBeCloseTo(0.1, 12);
  });

  it('reads a steady 10 m/s peel exactly, to its leading edge, without pausing', () => {
    const points = crest(41);
    expect(run(points, 2, (point) => 0.1 * point.column)).toBe(0);
    for (const point of points.slice(0, 21)) expect(point.tau).toBeCloseTo(2 - 0.1 * point.column, 9);
  });

  it('turns grouped onsets into a ramp at their mean gradient', () => {
    const points = crest(40);
    // Groups of five columns breaking together, 0.5 s apart: the solver's teeth, a peel of 10 m/s on average.
    run(points, 5, (point) => 0.5 * Math.floor(point.column / 5));
    const interior = points.slice(8, 32);
    for (let k = 1; k < interior.length; k += 1) {
      expect(Math.abs(interior[k].tau - interior[k - 1].tau)).toBeLessThan(0.2);
    }
    const gradient = (interior[0].tau - interior.at(-1)!.tau) / (interior.at(-1)!.sigma - interior[0].sigma);
    expect(gradient).toBeCloseTo(0.1, 1);
  });

  it('never turns a clock back when a later neighbour breaks, and counts the pauses', () => {
    const points = crest(30);
    let before = points.map((point) => point.tau);
    const pauses = run(points, 4, (point) => 0.5 * Math.floor(point.column / 5), () => {
      points.forEach((point, k) => expect(point.tau).toBeGreaterThanOrEqual(before[k]));
      before = points.map((point) => point.tau);
    });
    expect(pauses).toBeGreaterThan(0);
  });

  it('uses a lone point’s own onset, and bunched points’ mean', () => {
    const lone = crest(1);
    lone[0].onset = 2;
    advanceClocks(lone, 2.5);
    expect(lone[0].tau).toBeCloseTo(0.5, 12);
    const bunched = crest(3);
    bunched.forEach((point, k) => { point.sigma = 0.01 * k; point.onset = [0.99, 1, 0.99][k]; });
    advanceClocks(bunched, 1);
    // Their weighted mean, not a line through them: every clock within the onsets' spread.
    expect(bunched.every((point) => point.tau >= 0 && point.tau <= 0.01 + 1e-12)).toBe(true);
  });

  it('clocks each front on its own', () => {
    const points = [...crest(8, 0), ...crest(8, 1)];
    run(points, 1, (point) => (point.front === 0 ? 0 : 0.5));
    expect(points[3].tau).toBeCloseTo(points[0].tau, 9);
    expect(points[11].tau).toBeCloseTo(points[0].tau - 0.5, 9);
  });
});
