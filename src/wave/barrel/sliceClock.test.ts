import { describe, expect, it } from 'vitest';
import { GRAVITY } from '../dispersion';
import type { FrontPoint } from './BreakingFront';
import { advanceClocks, CLOCK, onsetTiming, type OnsetTiming } from './sliceClock';

const DT = 1 / 30;
/** Unlagged, a second of steepening frames: the throw is the join. */
const AT_ONCE: OnsetTiming = { h0: 7, band: [6, 5], joinDepth: () => 2.5, throwDepth: () => 2.5, lagged: false, earliest: -1 };
/** Lagged: the lip throws 0.5 m shoreward of the join. */
const LAGGED: OnsetTiming = { ...AT_ONCE, throwDepth: () => 2, lagged: true };

/** A crest line of `n` points one metre apart, their clocks at the earliest frame as BreakingFront starts them. */
function crest(n: number, id = 0): FrontPoint[] {
  return Array.from({ length: n }, (_, k) => ({
    id: k, front: id, column: k, sigma: k, x: k + 0.5, z: 10, b: NaN, height: 1, joined: 0, depth: 2.5, throwDepth: 2.5, crestDepth: 2.5, thrown: null, broke: 0, tau: AT_ONCE.earliest, seen: 0, fresh: null,
  }));
}

/**
 * Runs the clock at DT from 0 to `seconds`. A point is on the front from the first step at or after
 * `breaksAt(point)`, when it joins (as BreakingFront records it); the pauses are counted.
 */
function run(
  all: FrontPoint[], seconds: number, breaksAt: (point: FrontPoint) => number, timing = AT_ONCE, each?: (time: number) => void,
): number {
  let pauses = 0;
  const joined = new Set<FrontPoint>();
  for (let step = 0; step * DT <= seconds + 1e-9; step += 1) {
    const time = step * DT;
    const front = all.filter((point) => time >= breaksAt(point) - 1e-9);
    for (const point of front) {
      if (joined.has(point)) continue;
      joined.add(point);
      point.joined = time;
      point.broke = time;
      point.tau = timing.earliest;
    }
    pauses += advanceClocks(front, time, timing);
    each?.(time);
  }
  return pauses;
}

describe('the slice clock', () => {
  it('throws a point’s lip where its crest crosses its throw depth, foreseen from its pace till then', () => {
    const points = crest(1);
    Object.assign(points[0], { joined: 5, broke: 5, depth: 2.5, throwDepth: 2, crestDepth: 2.5 });
    // Not yet moving: no sooner than the earliest frame from now.
    advanceClocks(points, 5, LAGGED);
    expect(points[0].tau).toBe(-1);
    // A quarter metre in half a second: the other quarter in another half.
    points[0].crestDepth = 2.25;
    advanceClocks(points, 5.5, LAGGED);
    expect(points[0].tau).toBeCloseTo(-0.5, 12);
    points[0].thrown = 6.1;
    advanceClocks(points, 6.5, LAGGED);
    expect(points[0].tau).toBeCloseTo(0.4, 12);
  });

  it('never throws before the solver breaks the crest, with no lag', () => {
    const points = crest(1);
    points[0].joined = 5;
    points[0].broke = 6;
    advanceClocks(points, 6.5, AT_ONCE);
    expect(points[0].tau).toBeCloseTo(0.5, 12);
  });

  it('reads no earlier than the library’s first frame', () => {
    const points = crest(1);
    Object.assign(points[0], { joined: 5, broke: 5, depth: 2.5, throwDepth: 2, crestDepth: 2.45 });
    // A tenth of the way in half a second: its throw 4.5 s off.
    advanceClocks(points, 5.5, LAGGED);
    expect(points[0].tau).toBe(-1);
    points[0].thrown = 7;
    advanceClocks(points, 6.5, LAGGED);
    expect(points[0].tau).toBeCloseTo(-0.5, 12);
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
    const pauses = run(points, 4, (point) => 0.5 * Math.floor(point.column / 5), AT_ONCE, () => {
      points.forEach((point, k) => {
        if (point.joined < 4 && before[k] !== 0) expect(point.tau).toBeGreaterThanOrEqual(before[k]);
      });
      before = points.map((point) => point.tau);
    });
    expect(pauses).toBeGreaterThan(0);
  });

  it('uses a lone point’s own throw, and bunched points’ mean', () => {
    const lone = crest(1);
    lone[0].joined = 2;
    advanceClocks(lone, 2.5, AT_ONCE);
    expect(lone[0].tau).toBeCloseTo(0.5, 12);
    const bunched = crest(3);
    bunched.forEach((point, k) => { point.sigma = 0.01 * k; point.joined = [0.99, 1, 0.99][k]; });
    advanceClocks(bunched, 1, AT_ONCE);
    // Their weighted mean, not a line through them: every clock within the joins' spread.
    expect(bunched.every((point) => point.tau >= 0 && point.tau <= 0.01 + 1e-12)).toBe(true);
  });

  it('clocks each front on its own', () => {
    const points = [...crest(8, 0), ...crest(8, 1)];
    run(points, 1, (point) => (point.front === 0 ? 0 : 0.5));
    expect(points[3].tau).toBeCloseTo(points[0].tau, 9);
    expect(points[11].tau).toBeCloseTo(points[0].tau - 0.5, 9);
  });

  it('joins and throws by the measured tables, interpolated and never extrapolated', () => {
    const h0 = 7;
    const unit = Math.sqrt(h0 / GRAVITY);
    const timing = onsetTiming(h0, 16);
    expect(timing.earliest).toBeCloseTo(CLOCK.earliest * unit, 12);
    // Where a crest joins, by its highest over 6–5 m and the period: the solver's own swell onsets.
    expect(timing.band).toEqual([6, 5]);
    expect(timing.joinDepth(1.6)).toBeCloseTo(3.18, 12);
    expect(timing.joinDepth(1.395)).toBeCloseTo((2.61 + 3.18) / 2, 12);
    expect(timing.joinDepth(0.5)).toBeCloseTo(2.61, 12);
    expect(timing.joinDepth(4)).toBeCloseTo(4.55, 12);
    const at17 = 2.61 + ((1.6 - 1.29) / (1.74 - 1.29)) * (3.13 - 2.61);
    expect(onsetTiming(h0, 16.5).joinDepth(1.6)).toBeCloseTo((3.18 + at17) / 2, 12);
    expect(onsetTiming(h0, 12).joinDepth(1.2)).toBeCloseTo(2.29, 12);
    expect(onsetTiming(h0, 20).joinDepth(3.3)).toBeCloseTo(3.82, 12);
    // Where its lip throws, by its height at the foot, whatever the period: the Navier–Stokes runs' line, clamped.
    expect(timing.lagged).toBe(true);
    expect(timing.throwDepth(1.65)).toBeCloseTo(1.8 + 0.45 * 1.65, 12);
    expect(onsetTiming(h0, 14).throwDepth(1.65)).toBe(timing.throwDepth(1.65));
    expect(timing.throwDepth(1)).toBeCloseTo(1.8 + 0.45 * 1.22, 12);
    expect(timing.throwDepth(3)).toBeCloseTo(1.8 + 0.45 * 2.5, 12);
    // A higher tide scales both by depth, the reference too; unlagged, for the loft's comparison.
    expect(onsetTiming(8, 16).joinDepth((1.6 * 8) / 7)).toBeCloseTo((3.18 * 8) / 7, 12);
    expect(onsetTiming(8, 16).band[1]).toBeCloseTo((5 * 8) / 7, 12);
    expect(onsetTiming(8, 16).throwDepth((1.65 * 8) / 7)).toBeCloseTo(((1.8 + 0.45 * 1.65) * 8) / 7, 12);
    expect(onsetTiming(h0, 16, false).lagged).toBe(false);
  });
});
