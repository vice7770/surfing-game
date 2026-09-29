import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { ONSET } from './crestOnset';
import { advanceClocks, CLOCK } from './sliceClock';

const THROW = ONSET.throw * ONSET.depthAveraged;
const DT = 1 / 30;

/** A front of `n` points one metre apart, none thrown, B short of the throw. */
function front(n: number, id = 0): FrontPoint[] {
  return Array.from({ length: n }, (_, k) => ({
    id: k, front: id, column: k, sigma: k, x: k + 0.5, z: 10, b: 0.7, bRate: 0, height: 1, onset: 0, thrown: false, tau: 0, seen: 0,
  }));
}

/** Runs the clock at DT from 0 to `seconds`, each point throwing at `throwsAt(point)`; the pauses counted. */
function run(points: FrontPoint[], seconds: number, throwsAt: (point: FrontPoint) => number, each?: (time: number) => void): number {
  let pauses = 0;
  for (let step = 0; step * DT <= seconds + 1e-9; step += 1) {
    const time = step * DT;
    for (const point of points) point.b = time >= throwsAt(point) - 1e-9 ? THROW : 0.7;
    pauses += advanceClocks(points, time, DT);
    each?.(time);
  }
  return pauses;
}

describe('the slice clock', () => {
  it('starts a point’s clock at its throw and runs it on', () => {
    const points = front(1);
    points[0].b = THROW;
    advanceClocks(points, 5, DT);
    expect(points[0]).toMatchObject({ thrown: true, onset: 5, tau: 0 });
    advanceClocks(points, 5.1, DT);
    expect(points[0].tau).toBeCloseTo(0.1, 12);
  });

  it('places a throw between steps by how fast B was rising', () => {
    const points = front(1);
    points[0].b = THROW + 0.004;
    points[0].bRate = 0.2;
    advanceClocks(points, 5, DT);
    expect(points[0].onset).toBeCloseTo(5 - 0.02, 12);
    expect(points[0].tau).toBeCloseTo(0.02, 12);
  });

  it('keeps unbroken points at τ = 0', () => {
    const points = front(5);
    run(points, 1, (point) => (point.column === 0 ? 0 : Infinity));
    expect(points.slice(1).every((point) => !point.thrown && point.tau === 0)).toBe(true);
  });

  it('reads a steady 10 m/s peel exactly, to its leading edge, without pausing', () => {
    const points = front(41);
    expect(run(points, 2, (point) => 0.1 * point.column)).toBe(0);
    for (const point of points) expect(point.tau).toBeCloseTo(point.column <= 20 ? 2 - 0.1 * point.column : 0, 9);
  });

  it('turns grouped onsets into a ramp at their mean gradient', () => {
    const points = front(40);
    // Groups of five columns throwing together, 0.5 s apart: the solver's teeth, a peel of 10 m/s on average.
    run(points, 5, (point) => 0.5 * Math.floor(point.column / 5));
    const interior = points.slice(8, 32);
    for (let k = 1; k < interior.length; k += 1) {
      expect(Math.abs(interior[k].tau - interior[k - 1].tau)).toBeLessThan(0.2);
    }
    const gradient = (interior[0].tau - interior.at(-1)!.tau) / (interior.at(-1)!.sigma - interior[0].sigma);
    expect(gradient).toBeCloseTo(0.1, 1);
  });

  it('never turns a shown clock back when a later neighbour breaks, and counts the pauses', () => {
    const points = front(30);
    let before = points.map((point) => point.tau);
    const pauses = run(points, 4, (point) => 0.5 * Math.floor(point.column / 5), () => {
      points.forEach((point, k) => expect(point.tau).toBeGreaterThanOrEqual(before[k]));
      before = points.map((point) => point.tau);
    });
    expect(pauses).toBeGreaterThan(0);
  });

  it('uses a lone broken point’s own onset, and bunched points’ mean', () => {
    const points = front(9);
    points[4].b = THROW;
    advanceClocks(points, 2, DT);
    advanceClocks(points, 2.5, DT);
    expect(points[4].tau).toBeCloseTo(0.5, 12);
    const bunched = front(3);
    bunched.forEach((point, k) => { point.sigma = 0.01 * k; point.b = THROW; point.bRate = 0.1 * (k + 1); point.thrown = false; });
    bunched[0].b = THROW + 0.001;
    bunched[2].b = THROW + 0.003;
    advanceClocks(bunched, 1, DT);
    // Onsets 0.99, 1 and 0.99: their weighted mean, not a line through them.
    expect(bunched.every((point) => Number.isFinite(point.tau) && point.tau >= 0 && point.tau < 0.011)).toBe(true);
  });

  it('tapers at an unbroken shoulder only, never at the broken end', () => {
    const points = front(21);
    run(points, 1, (point) => (point.column <= 18 ? 0 : Infinity));
    const tau = points[10].tau;
    expect(points[0].tau).toBe(tau);
    expect(points[18].tau).toBeCloseTo((tau * 2) / CLOCK.endTaper, 12);
    expect(points[17].tau).toBe(tau);
  });

  it('clocks each front on its own', () => {
    const points = [...front(8, 0), ...front(8, 1)];
    points.forEach((point, k) => { point.sigma = k % 8; });
    run(points, 1, (point) => (point.front === 0 ? 0 : 0.5));
    expect(points[3].tau).toBeCloseTo(points[0].tau, 9);
    expect(points[11].tau).toBeCloseTo(points[0].tau - 0.5, 9);
  });
});
