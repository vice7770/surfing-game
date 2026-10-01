import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PlungingLip, STRIP_PARCELS } from '../PlungingLip';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import type { FrontPoint } from './BreakingFront';
import { ProfileLibrary } from './ProfileLibrary';
import { SweptCrash, type CrashSea } from './SweptCrash';
import { tubeCase } from './toyCase';

const GRAVITY = 9.81;
/** 2 m of still water, 12 m along shore by 30 m, with a 0.8 m crest over rows 10–13 (z 10–14). */
function basin(): ShallowWaterSolver {
  const solver = new ShallowWaterSolver({ nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => 2, { manning: 0 });
  for (let iz = 10; iz < 14; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] += 0.8;
  return solver;
}
/** The toy tube scaled to a 0.6 m crest at a 2 m foot (A0 0.3: h0 2 m); its touchdown is 0.5 √(2/g). */
const library = () => new ProfileLibrary([tubeCase(0.2), tubeCase(0.4)]);
const TOUCHDOWN = 0.5 * Math.sqrt(2 / GRAVITY);
/** A straight front along +x on the crest's row 11 (z 11.5), one point a column, its clocks at `tau(k)`. */
function front(n: number, tau: (k: number) => number, first = 0): FrontPoint[] {
  return Array.from({ length: n }, (_, j) => {
    const k = first + j;
    return {
      id: k, front: 1, column: k, sigma: k, x: k + 0.5, z: 11.5, b: 0, height: 0.8, joined: 0, depth: 2, throwDepth: 1.8, crestDepth: 1.8,
      thrown: 0, throwZ: 11.5, footHeight: 0.6, footDepth: 2, broke: 0, tau: tau(k), fresh: null, seen: 0,
    };
  });
}
const water = (solver: ShallowWaterSolver) => solver.h.reduce((sum, h, i) => sum + h * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0);
function sea(solver: ShallowWaterSolver, lip: PlungingLip, strength = 0): CrashSea {
  return { solver, lip, stillLevel: 0, period: 16, strength: new Float64Array(solver.h.length).fill(strength), whitewater: new Float64Array(solver.h.length) };
}
/** Steps the crash with its clocks running from `from` for `seconds`, the lip after it, as the surf zone does. */
function run(crash: SweptCrash, points: FrontPoint[], s: CrashSea, from: number, seconds: number, dt = 0.01): number {
  let thrown = 0;
  for (let t = 0; t < seconds; t += dt) {
    for (const p of points) p.tau = from + t;
    s.solver.time += dt;
    thrown += crash.update(points, s).volume;
    s.lip.step(dt);
  }
  return thrown;
}

describe('the swept barrel’s jets (the Padang Padang spec, Part B, PR 5)', () => {
  it('throws each point’s jet at its throw, crashes it at its touchdown, and pours it from where its lip lands', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const points = front(9, () => -0.05);
    const landed: number[] = [];
    lip.onLand = (_x, z, _volume, _vx, _vy, _vz, flight) => {
      if (flight?.swept) landed.push(z);
    };
    crash.update(points, s);
    expect(crash.counts.throws).toBe(0);
    run(crash, points, s, 0, TOUCHDOWN - 0.01);
    // The end points carry no weight (the loft's ends lie on the water): no jet.
    expect(crash.counts.throws).toBe(7);
    expect(points[0].jetStrip).toBe(-1);
    expect(points[4].jetStrip).toBeGreaterThan(0);
    // The throw's window, over which the front keeps the point's crest until its crash: #86's 2 H, H the wave height
    // the throw measured on the basin's 0.8 m crest.
    expect(points[4].jetWindow).toBeGreaterThan(2 * 0.7);
    expect(points[4].jetWindow).toBeLessThanOrEqual(2 * 0.8);
    expect(points[0].jetWindow).toBeUndefined();
    expect(crash.counts.crashes).toBe(0);
    expect(landed.length).toBe(0);
    run(crash, points, s, TOUCHDOWN, 2);
    expect(crash.counts.crashes).toBe(7);
    expect(crash.counts.late).toBe(0);
    expect(points[4].crashedAt).toBeDefined();
    expect(landed.length).toBe(7 * STRIP_PARCELS);
    // In h0 the tip is (1.2, 0.5) and lands straight below it: 2.4 m ahead of the crest.
    for (const z of landed) expect(Math.abs(z - (11.5 + 2.4))).toBeLessThan(0.6);
    expect(lip.airborneVolume()).toBe(0);
  });

  it('balances the water: what the crests gave is what landed', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const points = front(9, () => 0);
    const before = water(solver);
    const thrown = run(crash, points, s, 0, TOUCHDOWN + 2);
    expect(thrown).toBeGreaterThan(0);
    expect(crash.counts.thrown).toBeCloseTo(thrown, 12);
    expect(crash.counts.starved).toBe(0);
    expect(lip.airborneVolume()).toBe(0);
    expect(water(solver)).toBeCloseTo(before, 9);
  });

  it('throws and pours at once for a point first seen past its touchdown, and nothing for one past its collapse', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const collapse = library().profileTimes({ slope: 0.05, footHeight: 0.6, footDepth: 2 }).collapseSeconds;
    crash.update(front(9, () => TOUCHDOWN + 0.5 * collapse), s);
    expect(crash.counts.throws).toBe(7);
    expect(crash.counts.crashes).toBe(7);
    expect(crash.counts.late).toBe(7);
    const late = new SweptCrash(library(), 0.05);
    const points = front(9, () => TOUCHDOWN + 2 * collapse);
    late.update(points, sea(basin(), new PlungingLip(basin())));
    expect(late.counts.throws).toBe(0);
    expect(late.counts.missed).toBe(9);
    expect(points.every((p) => p.jetStrip === -1)).toBe(true);
  });

  it('pours a lost point’s jet where it was foreseen', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const landed: number[] = [];
    lip.onLand = (_x, z, _volume, _vx, _vy, _vz, flight) => {
      if (flight?.swept) landed.push(z);
    };
    run(crash, front(9, () => 0), s, 0, 0.05);
    expect(crash.counts.throws).toBe(7);
    // The front is gone: nothing more is told of it.
    run(crash, [], s, 0, TOUCHDOWN + 2);
    expect(landed.length).toBe(7 * STRIP_PARCELS);
    for (const z of landed) expect(Math.abs(z - (11.5 + 2.4))).toBeLessThan(0.6);
    expect(lip.airborneVolume()).toBe(0);
  });

  it('moves no water for a front of one point', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const before = water(solver);
    run(crash, front(1, () => 0, 4), sea(solver, lip, 1), 0, TOUCHDOWN + 1);
    expect(crash.counts.throws).toBe(0);
    expect(crash.counts.gated).toBe(0);
    expect(water(solver)).toBe(before);
  });

  it('withholds the breaking from the whitewater over a curl before its touchdown, and gives it back at touchdown', () => {
    const solver = basin();
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, new PlungingLip(solver), 1);
    const cell = (column: number, row: number) => row * solver.nx + column;
    crash.update(front(9, () => -0.05), s);
    // The tent before the throw spans samples 6–121 from (−2 + 12/32) h0 behind its crest to 2 × 89/95 h0 ahead: z 8.25–15.25.
    for (const row of [9, 11, 14]) expect(s.whitewater[cell(4, row)]).toBe(0);
    for (const row of [7, 16]) expect(s.whitewater[cell(4, row)]).toBe(1);
    // The front's ends lie on the water, and columns beyond it are not the barrel's.
    expect(s.whitewater[cell(0, 11)]).toBe(1);
    expect(s.whitewater[cell(10, 11)]).toBe(1);
    expect(crash.counts.gated).toBeGreaterThan(0);
    crash.update(front(9, () => TOUCHDOWN + 0.01), s);
    expect(s.whitewater.every((value) => value === 1)).toBe(true);
  });

  it('throws nothing under an earlier front’s barrel, as the drawing shows that one (first wins)', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    // A second front 2 m shoreward of the first, in the same columns: its footprint lies inside the first's.
    const behind = front(9, () => 0.01).map((p) => ({ ...p, id: p.id + 100, front: 2, z: 13.5, throwZ: 13.5 }));
    crash.update([...front(9, () => 0.01), ...behind], sea(solver, lip));
    expect(crash.counts.throws).toBe(7);
    expect(crash.counts.covered).toBe(9);
    expect(behind.every((p) => p.jetStrip === -1)).toBe(true);
    // Apart, both throw.
    const apart = new SweptCrash(library(), 0.05);
    const far = front(9, () => 0.01).map((p) => ({ ...p, id: p.id + 100, front: 2, z: 25.5, throwZ: 25.5 }));
    apart.update([...front(9, () => 0.01), ...far], sea(basin(), new PlungingLip(basin())));
    expect(apart.counts.covered).toBe(0);
  });

  it('uses only + − × ÷ and √ (online determinism)', () => {
    expect(readFileSync('src/wave/barrel/SweptCrash.ts', 'utf8')).not.toMatch(/Math\.(sin|cos|tan|exp|log|pow|hypot|atan|cbrt)/);
  });
});
