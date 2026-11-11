import { describe, expect, it } from 'vitest';
import { advanceClocks, FORM_CLOCK, FORMATION, formRate, throwContourDistance, type OnsetTiming } from './sliceClock';
import { FORM_CLOCK_DEFAULT, tubeFaceOf } from './faceAnchor';
import type { FrontPoint } from './BreakingFront';

/**
 * Ruling 4's rank 1, the C1 formation clock (the water-physics advisor's advisor-ruling-4.md,
 * docs/research/pool-tube-track-2026-11-05; notes in docs/research/form-clock-2026-11-11/README.md): the clock advances
 * by a rate, the rate follows −D/C_p critically damped within 0.5–1.5 × real time and changes by at most 1 a second, D is
 * read from a sub-cell crest, and `?formClock=old` is step 7's clock untouched.
 */
describe('ruling 4, rank 1: the C1 formation clock', () => {
  const dt = 1 / 60;
  // A plane face 1:10 along +z: the throw contour (2 m) at z 10.
  const still = (_x: number, z: number) => 3 - z / 10;
  const timing = (c1: boolean): OnsetTiming => ({
    h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7, thrownRate: 1.25,
    distance: { to: (x, z, dx, dz, depth) => throwContourDistance(still, x, z, dx, dz, depth), contour: true, ...(c1 ? { c1: true } : {}) },
  });
  const make = (k: number, tau: number): FrontPoint => ({
    id: k, front: 0, column: k, sigma: k, x: k, z: 0, b: Number.NaN, height: 0.8, joined: 0, depth: 2.5, throwDepth: 2, crestDepth: 3,
    thrown: null, throwZ: null, footHeight: 0.84, footDepth: 4.4, broke: 0, tau, seen: 0, fresh: null, dirX: 0, dirZ: 1, crestSpeed: 5,
  });
  /**
   * A straight crest coming in along +z at `pace(t)` m/s from z 1.5, read as the solver gives it: a cell centre (1 m rows)
   * and, with `sub`, its place within the cell. Runs `steps` steps; returns each step's clocks and rates of the middle point.
   */
  const run = (c1: boolean, sub: boolean, steps: number, pace: (time: number) => number = () => 5, start = -1.7) => {
    const points = [0, 1, 2, 3, 4].map((k) => make(k, start));
    const t = timing(c1);
    let crest = 1.5;
    let time = 0;
    const taus: number[] = [];
    const rates: number[] = [];
    const committed: number[] = [];
    const crests: number[] = [];
    let thrownAt = Number.NaN;
    for (let n = 0; n < steps; n += 1) {
      time += dt;
      crest += pace(time) * dt;
      for (const p of points) {
        const centre = Math.floor(crest) + 0.5;
        p.z = centre;
        if (sub) p.crestSub = crest - centre;
        p.crestDepth = 3 - crest / 10;
      }
      crests.push(crest);
      const before = points[2].tau;
      advanceClocks(points, time, t, dt);
      taus.push(points[2].tau);
      rates.push((points[2].tau - before) / dt);
      committed.push(points[2].formRate ?? Number.NaN);
      if (!(thrownAt === thrownAt) && points[2].thrown !== null) thrownAt = time;
    }
    return { taus, rates, committed, crests, thrownAt, point: points[2] };
  };

  it('moves its rate by at most its acceleration a step, towards its bounds and no further', () => {
    const most = FORM_CLOCK.accel * dt;
    for (const rate of [0.5, 0.8, 1, 1.3, 1.5]) {
      for (const error of [-2, -0.3, -0.01, 0, 0.01, 0.3, 2]) {
        const next = formRate(rate, error, dt, 0.5, 1.5);
        expect(Math.abs(next - rate)).toBeLessThanOrEqual(most + 1e-15);
        expect(next).toBeGreaterThanOrEqual(0.5);
        expect(next).toBeLessThanOrEqual(1.5);
      }
    }
    // On its target at real time it stays there; behind, it speeds up; ahead, it slows.
    expect(formRate(1, 0, dt, 0.5, 1.5)).toBe(1);
    expect(formRate(1, 0.5, dt, 0.5, 1.5)).toBeCloseTo(1 + most, 12);
    expect(formRate(1, -0.5, dt, 0.5, 1.5)).toBeCloseTo(1 - most, 12);
    // A rate outside narrower bounds (a forming clock's 0.6 as it throws: at least real time from there) comes in at that most.
    expect(formRate(0.6, 0, dt, 1, 1.25)).toBeCloseTo(0.6 + most, 12);
    expect(formRate(1.5, 0, dt, 1, 1.25)).toBeCloseTo(1.5 - most, 12);
  });

  it('follows −D/C_p without overshooting, from far behind and from far ahead', () => {
    // A clock 0.3 s behind its target (the crest joined late), and one 0.3 s ahead: its rate goes to its bound at its most
    // a second, comes off it in time and lands.
    for (const start of [-1.7 - 0.3, -1.7 + 0.3]) {
      const { taus, crests } = run(true, true, 96, () => 5, start);
      const errors = taus.map((tau, n) => -(10 - crests[n]) / 5 - tau);
      const sign = Math.sign(errors[0]);
      // Never past its target by more than a hundredth of a second, and within 0.03 s of it after 1.5 s.
      for (const e of errors) expect(sign * e).toBeGreaterThan(-0.01);
      expect(Math.abs(errors[89])).toBeLessThan(0.03);
    }
  });

  it('keeps its rate within 0.5–1.5 × real time and |τ̈| ≤ 1 a second, through the throw and after it', () => {
    // The crest's pace swings ±30 % every 0.4 s (a lurching wave), so the target runs off real time both ways.
    const pace = (time: number) => 5 * (1 + 0.3 * Math.sign(Math.sin((2 * Math.PI * time) / 0.4)));
    const { rates, committed, thrownAt, taus } = run(true, true, 240, pace);
    expect(thrownAt).toBeGreaterThan(1.2);
    expect(thrownAt).toBeLessThan(2.2);
    for (let n = 0; n < rates.length; n += 1) {
      // The rate a step advances by is the one committed the step before (the first step's: real time).
      expect(rates[n]).toBeCloseTo(n === 0 ? 1 : committed[n - 1], 9);
      if (taus[n] < 0) {
        expect(committed[n]).toBeGreaterThanOrEqual(FORMATION.rate[0]);
        expect(committed[n]).toBeLessThanOrEqual(FORMATION.rate[1]);
      }
      // C1 everywhere, the throw included: the rate never changes by more than accel × dt a step.
      if (n > 0) expect(Math.abs(committed[n] - committed[n - 1])).toBeLessThanOrEqual(FORM_CLOCK.accel * dt + 1e-12);
    }
    // After its throw the rate comes within real time and the thrown catch-up (1.25) and stays there.
    const settled = committed.slice(Math.round(thrownAt / dt) + 31);
    expect(settled.length).toBeGreaterThan(10);
    for (const r of settled) {
      expect(r).toBeGreaterThanOrEqual(1 - 1e-12);
      expect(r).toBeLessThanOrEqual(1.25 + 1e-12);
    }
  });

  it('is C1 where step 7\'s clock switches between its bounds: a crest read a row at a time', () => {
    // The crest's cell centre steps 1 m at a time, so step 7's target jumps 0.2 s at each row and its clock runs on a
    // bound to catch it; the C1 clock reads the crest within its cell and never touches one.
    const old = run(false, false, 130);
    const c1 = run(true, true, 130);
    const onBound = (rates: number[]) => rates.filter((r) => Math.abs(r - 0.5) < 1e-9 || Math.abs(r - 1.5) < 1e-9).length;
    const jumps = (rates: number[]) => Math.max(...rates.slice(1).map((r, n) => Math.abs(r - rates[n])));
    const forming = (r: { rates: number[]; taus: number[] }) => r.rates.filter((_, n) => r.taus[n] < 0);
    expect(onBound(forming(old))).toBeGreaterThan(20);
    expect(jumps(forming(old))).toBeGreaterThan(0.4);
    expect(onBound(forming(c1))).toBe(0);
    expect(jumps(c1.rates)).toBeLessThanOrEqual(FORM_CLOCK.accel * dt + 1e-9);
    // Both throw as the crest reaches the contour (1.7 s), the C1 clock within 0.05 s of it.
    expect(old.thrownAt).toBeCloseTo(1.7, 1);
    expect(Math.abs(c1.thrownAt - 1.7)).toBeLessThan(0.05);
    // Even without the sub-cell crest (rows only) the C1 clock's rate keeps its bound a step.
    const rows = run(true, false, 130);
    expect(jumps(rows.rates)).toBeLessThanOrEqual(FORM_CLOCK.accel * dt + 1e-9);
  });

  it('leaves step 7\'s clock alone: no rate kept, the sub-cell crest unread (`?formClock=old`)', () => {
    const plain = run(false, false, 160);
    const withSub = run(false, true, 160);
    expect(withSub.taus).toEqual(plain.taus);
    expect(plain.point.formRate).toBeUndefined();
    expect(withSub.point.thrown).toBe(plain.point.thrown);
    // Step 7's own rule, a step at a time: the target clamped to 0.5–1.5 × real time before the throw.
    for (let n = 1; n < plain.taus.length && plain.taus[n] < 0; n += 1) {
      const target = -(10 - (Math.floor(plain.crests[n]) + 0.5)) / 5;
      const was = plain.taus[n - 1];
      expect(plain.taus[n]).toBeCloseTo(Math.min(was + 1.5 * dt, Math.max(was + 0.5 * dt, target)), 12);
    }
  });

  it('holds an unbroken point short of its throw with `?tubeThrow=break`, at no rate, and lets it go at the clock\'s most', () => {
    const t = timing(true);
    const held = { ...make(0, -0.05), z: 9.5, crestSub: 0, unbroken: true as const, formation: 1 };
    let time = 0;
    for (let n = 0; n < 30; n += 1) {
      time += dt;
      advanceClocks([held], time, { ...t, distance: { ...t.distance!, contour: false } }, dt);
    }
    expect(held.tau).toBeLessThan(0);
    expect(held.thrown).toBeNull();
    expect(held.formRate).toBe(0);
    // Broken: it runs on, its rate rising from none by 1/60 a step.
    const freed: FrontPoint = { ...held };
    delete freed.unbroken;
    advanceClocks([freed], time + dt, { ...t, distance: { ...t.distance!, contour: false } }, dt);
    expect(freed.formRate).toBeCloseTo(FORM_CLOCK.accel * dt, 12);
  });

  it('is switched by `formClock`, with formation by distance only', () => {
    expect(tubeFaceOf(true, {})?.formClock).toBe(FORM_CLOCK_DEFAULT);
    expect(tubeFaceOf(true, { formClock: 'c1' })?.formClock).toBe(true);
    expect(tubeFaceOf(true, { formClock: 'old' })?.formClock).toBe(false);
    // No formation by distance (`?tubeForm=old`, step 6's lag off, the piece): no distance clock to smooth.
    expect(tubeFaceOf(true, { formClock: 'c1', tubeForm: 'old' })?.formClock).toBe(false);
    expect(tubeFaceOf(true, { formClock: 'c1', tubeLag: 0 })?.formClock).toBe(false);
    expect(tubeFaceOf(true, { formClock: 'c1', tubeFrom: 'piece' })?.formClock).toBe(false);
    expect(tubeFaceOf(false, { formClock: 'c1' })).toBeUndefined();
  });
});
