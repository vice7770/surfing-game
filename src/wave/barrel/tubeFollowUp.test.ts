import { describe, expect, it } from 'vitest';
import { PlungingLip, STRIP_PARCELS } from '../PlungingLip';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { BreakingFront, LEAD_RETIRE, type FrontPoint } from './BreakingFront';
import type { CrestSample } from './crestOnset';
import { type TubeFace } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { advanceClocks, FORMATION, GUARD, throwContourDistance, type OnsetTiming } from './sliceClock';
import { SweptCrash, type CrashSea } from './SweptCrash';
import { LOFT, SweptLoft } from './sweptLoft';
import { lipCase, tubeCase } from './toyCase';

/**
 * The step 7 follow-up (pool-tube-contact, 2026-11-05; the water-physics advisor's second ruling,
 * docs/research/pool-tube-wall-2026-11-04/advisor-ruling-2.md): the retire guard by the case's open time (§4), and the
 * holes (§5). The nearest surface is in tubeContact.test.ts, the cap and the switches in faceAnchor.test.ts.
 */
const face = (over: Partial<TubeFace>): TubeFace => ({
  anchor: false, union: false, lag: false, clockRate: 2, thrownEnds: false, continuity: false, distance: false, contour: false, wallFlow: false,
  contact: false, cap: false, merge: false, guard: false, ...over,
});

describe('the step 7 follow-up: the retire guard by the case\'s open time', () => {
  const still = (_x: number, z: number) => 3 - z / 10;
  const timing = (open?: number): OnsetTiming => ({
    h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7, thrownRate: 1.25,
    distance: { to: (x, z, dx, dz, depth) => throwContourDistance(still, x, z, dx, dz, depth), contour: true, ...(open === undefined ? {} : { openTime: () => open }) },
  });
  const thrownPoint = (unbroken: boolean): FrontPoint => ({
    id: 0, front: 0, column: 0, sigma: 0, x: 0, z: 12, b: Number.NaN, height: 0.8, joined: 0, depth: 2.5, throwDepth: 2, crestDepth: 1.8,
    thrown: 0, throwZ: 10, footHeight: 0.84, footDepth: 4.4, broke: 0, tau: 0.001, seen: 0, fresh: null, dirX: 0, dirZ: 1, crestSpeed: 5,
    formation: 1, ...(unbroken ? { unbroken: true as const } : {}),
  });

  it('retires a thrown point the solver has not broken from 3/8 of its case\'s open time, whole by its touchdown', () => {
    const open = 0.74;
    const dt = 1 / 60;
    const scaled = thrownPoint(true);
    const old = thrownPoint(true);
    let time = 0;
    let lastRetire = 0;
    let oldAtTouchdown = Number.NaN;
    while (scaled.tau < open + 0.1) {
      time += dt;
      // Its retirement from its clock as the step began (the clock then moves on).
      const was = scaled.tau;
      advanceClocks([scaled], time, timing(open), dt);
      advanceClocks([old], time, timing(), dt);
      const expected = Math.min(1, Math.max(0, (was - GUARD.after * open) / (GUARD.over * open)));
      expect(scaled.retire ?? 0).toBeCloseTo(expected, 12);
      // At most 1/18 a step (bar 4b's weight).
      expect((scaled.retire ?? 0) - lastRetire).toBeLessThanOrEqual(FORMATION.weightRate * dt + 1e-12);
      lastRetire = scaled.retire ?? 0;
      if (was >= open) expect(scaled.retire).toBe(1);
      if (was >= open && !(oldAtTouchdown === oldAtTouchdown)) oldAtTouchdown = old.retire ?? 0;
    }
    expect(GUARD.after + GUARD.over).toBeCloseTo(1, 15);
    // `?tubeGuard=old`: 0.3 s + 0.5 s, still short of whole at a38's touchdown.
    expect(oldAtTouchdown).toBeGreaterThan(0.8);
    expect(oldAtTouchdown).toBeLessThan(1);
    expect((open - LEAD_RETIRE.after) / LEAD_RETIRE.over).toBeLessThan(1);
  });

  it('gives a point the solver broke since its throw its weight back at the weight\'s rate', () => {
    const dt = 1 / 60;
    const p = thrownPoint(false);
    p.tau = 0.5;
    p.retire = 0.4;
    advanceClocks([p], 1 / 60, timing(0.74), dt);
    expect(p.retire).toBeCloseTo(0.4 - FORMATION.weightRate * dt, 12);
    // Without the guard, as before: a broken point's retirement is left as it is (the matched branch deletes it).
    const q = thrownPoint(false);
    q.tau = 0.5;
    q.retire = 0.4;
    advanceClocks([q], 1 / 60, timing(), dt);
    expect(q.retire).toBe(0.4);
  });

  it('breaks a point on its pace once the crest it claims breaks (`paceBreak`), and not without it', () => {
    for (const paceBreak of [true, false]) {
      const front = new BreakingFront(1, timing(0.74), { distance: timing().distance!.to, ...(paceBreak ? { paceBreak } : {}) });
      const p: FrontPoint = { ...thrownPoint(true), tau: 0.3, jetPace: 5, jetBase: 10, jetUntil: 2, jetWindow: 1.6, seen: 1, crestZ: 11.5 };
      front.points = [p];
      const sample: CrestSample = {
        column: 0, row: 12, x: 0.5, z: 12.1, eta: 0.8, wave: 1.2, strength: 0.6, rise: 0, depth: 1.8, b: Number.NaN, speed: 5, dirX: 0, dirZ: 1,
      };
      front.update([sample], 1, 1.02);
      expect(front.points).toHaveLength(1);
      const next = front.points[0];
      expect(next.unbroken).toBe(paceBreak ? undefined : true);
      if (paceBreak) expect(next.broke).toBe(1.02);
      // An unbroken crest leaves it as it is.
      front.points = [p];
      front.update([{ ...sample, strength: 0 }], 1, 1.02);
      expect(front.points[0].unbroken).toBe(true);
    }
  });

  /** 2 m of still water, 12 m along shore by 30 m, with a 0.8 m crest over rows 10–13 (z 10–14) (SweptCrash.test.ts's). */
  function basin(): ShallowWaterSolver {
    const solver = new ShallowWaterSolver({ nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => 2, { manning: 0 });
    for (let iz = 10; iz < 14; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] += 0.8;
    return solver;
  }
  const water = (solver: ShallowWaterSolver) => solver.h.reduce((sum, h, i) => sum + h * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0);
  const momentum = (solver: ShallowWaterSolver) => solver.qz.reduce((sum, q, i) => sum + q * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0);
  const TOUCHDOWN = 0.5 * Math.sqrt(2 / 9.81);

  it('returns a held jet to its crest, its water and its momentum, nothing landing and no air trapped', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const before = water(solver);
    const momentumBefore = momentum(solver);
    const { strip, thrown } = lip.holdJet({
      cell: 11 * solver.nx + 5, velocityX: 0, velocityZ: 4, volume: 0.2, waveHeight: 0.8, launchX: 5.5, launchY: 2.8, launchZ: 11.5,
      pourX: 5.5, pourY: 2.8, pourZ: 14, pourVY: -1, pourSpacing: 0.05, dirX: 0, dirZ: 1, crestSpeed: 4, relativeSpeed: 0, voidLength: 0.5,
      voidHeight: 0.3, voidArea: 0.1, span: 1, axisX: 1, axisY: 0,
    } as never, true);
    expect(thrown).toBeGreaterThan(0);
    expect(water(solver)).toBeCloseTo(before - thrown, 9);
    let landings = 0;
    lip.onLand = () => { landings += 1; };
    expect(lip.returnJet(strip, 5.5, 12.5)).toBe(true);
    expect(lip.returnJet(strip, 5.5, 12.5)).toBe(false);
    for (let k = 0; k < 100; k += 1) lip.step(0.01);
    expect(landings).toBe(0);
    expect(water(solver)).toBeCloseTo(before, 9);
    expect(momentum(solver)).toBeCloseTo(momentumBefore, 9);
    expect(lip.returnedJets).toBe(1);
    expect(lip.returnedVolume).toBeCloseTo(thrown, 12);
    expect(lip.airborneVolume()).toBe(0);
    expect(lip.trappedAir).toBe(0);
  });

  it('returns the jet of a point unbroken at its touchdown instead of pouring it (`TubeFace.guard`), and pours it without', () => {
    const library = () => new ProfileLibrary([tubeCase(0.2), tubeCase(0.4)]);
    for (const guard of [true, false]) {
      const solver = basin();
      const lip = new PlungingLip(solver);
      const crash = new SweptCrash(library(), 0.05, face({ guard }));
      const s: CrashSea = { solver, lip, stillLevel: 0, period: 16, strength: new Float64Array(solver.h.length), whitewater: new Float64Array(solver.h.length) };
      const points: FrontPoint[] = Array.from({ length: 9 }, (_, k) => ({
        id: k, front: 1, column: k, sigma: k, x: k + 0.5, z: 11.5, b: 0, height: 0.8, joined: 0, depth: 2, throwDepth: 1.8, crestDepth: 1.8,
        thrown: 0, throwZ: 11.5, footHeight: 0.6, footDepth: 2, broke: 0, tau: 0, fresh: null, seen: 0, unbroken: true,
      }));
      let landed = 0;
      lip.onLand = (_x, _z, _v, _vx, _vy, _vz, flight) => { if (flight?.swept) landed += 1; };
      const before = water(solver);
      for (let t = 0; t < TOUCHDOWN + 2; t += 0.01) {
        for (const p of points) p.tau = t;
        solver.time += 0.01;
        crash.update(points, s);
        lip.step(0.01);
      }
      expect(crash.counts.throws).toBe(7);
      expect(water(solver)).toBeCloseTo(before, 9);
      if (guard) {
        expect(crash.counts.returned).toBe(7);
        expect(crash.counts.crashes).toBe(0);
        expect(landed).toBe(0);
        expect(points[4].jetReturned).toBe(true);
      } else {
        expect(crash.counts.returned).toBeUndefined();
        expect(crash.counts.crashes).toBe(7);
        expect(landed).toBe(7 * STRIP_PARCELS);
      }
    }
  });
});

describe('the step 7 follow-up: no holes in the tube', () => {
  it('joins a crest beside a front\'s end to that front, within 1.5 slice spacings and 0.3 s of its clock (`merge`)', () => {
    const front = new BreakingFront(1, { h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7 }, { merge: true });
    const point = (id: number, column: number, z: number, tau: number, f = 7): FrontPoint => ({
      id, front: f, column, sigma: column, x: column + 0.5, z, b: Number.NaN, height: 0.8, joined: 10 + column, depth: 2.5, throwDepth: 2,
      crestDepth: 2.4, thrown: null, throwZ: null, footHeight: 0.84, footDepth: 4.4, broke: 0, tau, seen: 0, fresh: null,
    });
    const byColumn = (points: FrontPoint[]) => {
      const map = new Map<number, FrontPoint[]>();
      for (const p of points) map.set(p.column, [...(map.get(p.column) ?? []), p]);
      return map;
    };
    const endBeside = (front as unknown as { endBeside(m: Map<number, FrontPoint[]>, s: CrestSample, tau: number): FrontPoint | undefined }).endBeside.bind(front);
    const crest = (column: number, z: number): CrestSample => ({
      column, row: 0, x: column + 0.5, z, eta: 0.8, wave: 1.2, strength: 0, rise: 0, depth: 2.4, b: Number.NaN, speed: 4, dirX: 0, dirZ: 1,
    });
    // A front over columns 0–4, its end at column 4: a crest in column 5 beside it, 0.5 m on in z, joins it.
    const points = [0, 1, 2, 3, 4].map((k) => point(k, k, 20, -1.55));
    expect(endBeside(byColumn(points), crest(5, 20.5), -1.7)?.id).toBe(4);
    // Too far along the crest (1.5 slice spacings: 1.5 m), or its clock more than 0.3 s apart: no.
    expect(endBeside(byColumn(points), crest(5, 21.2), -1.7)).toBeUndefined();
    expect(endBeside(byColumn(points), crest(5, 20.5), -1.9)).toBeUndefined();
    // Not an end: its front already has a point in the crest's column.
    expect(endBeside(byColumn([...points, point(9, 5, 25, -1.55)]), crest(5, 20.5), -1.7)).toBeUndefined();
    // From the other side, the front's start.
    expect(endBeside(byColumn(points.map((p) => ({ ...p, column: p.column + 1, x: p.x + 1 }))), crest(0, 20.3), -1.7)?.id).toBe(0);
  });

  const STILL = 0.5;
  /** Two fronts along +x, overlapping over x 7–10 a little apart in z, each thrown at its own clock. */
  function records(tauA: number, tauB: number): Float32Array {
    const out = new Float32Array(20 * FRONT_STRIDE);
    for (let k = 0; k < 20; k += 1) {
      const o = k * FRONT_STRIDE;
      const b = k >= 10;
      out[o + FRONT_FIELD.x] = b ? k - 3 + 0.5 : k + 0.5;
      out[o + FRONT_FIELD.z] = b ? -99.6 : -100;
      out[o + FRONT_FIELD.front] = b ? 2 : 1;
      out[o + FRONT_FIELD.sigma] = b ? k - 10 : k;
      out[o + FRONT_FIELD.tau] = b ? tauB : tauA;
      out[o + FRONT_FIELD.footHeight] = 2.1;
      out[o + FRONT_FIELD.footDepth] = 7;
      out[o + FRONT_FIELD.throwZ] = -100;
      for (const f of [FRONT_FIELD.pace, FRONT_FIELD.anchor, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
    }
    return out;
  }
  const library = () => new ProfileLibrary([lipCase(0.3, 0.04)]);

  it('never drops an open strip at weight 0.5 or more (`TubeFace.merge`); `?tubeMerge=old` as before', () => {
    for (const [tauA, tauB] of [[0.3, 0.1], [0.1, 0.3], [0.3, 0.3]]) {
      const merged = new SweptLoft(library(), 0.05, { contact: true, face: face({ merge: true }) }).build(records(tauA, tauB), 20, STILL, () => STILL);
      const old = new SweptLoft(library(), 0.05, { contact: true, face: face({}) }).build(records(tauA, tauB), 20, STILL, () => STILL);
      expect(merged.overlaps + merged.overlapsKept).toBeGreaterThan(0);
      expect(merged.overlapsOpenHeavy).toBe(0);
      expect(old.overlapsKept).toBe(0);
      expect(old.overlaps).toBeGreaterThan(0);
      // Where the rule before dropped none at weight 0.5, the two agree on every strip.
      if (old.overlapsOpenHeavy === 0) expect([...merged.sliceJoined.subarray(0, merged.sliceCount)]).toEqual([...old.sliceJoined.subarray(0, old.sliceCount)]);
    }
    expect(LOFT.endBlend).toBe(1);
  });
});
