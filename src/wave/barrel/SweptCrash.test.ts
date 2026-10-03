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
/** The water in rows [from, to), m³. */
const rowsWater = (solver: ShallowWaterSolver, from: number, to: number) =>
  solver.h.reduce((sum, h, i) => (i >= from * solver.nx && i < to * solver.nx ? sum + h * solver.dx * solver.dz[Math.floor(i / solver.nx)] : sum), 0);
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
    // The throw's window, over which the point claims its crest while on its pace: #86's 2 H, H the wave height the
    // throw measured on the basin's 0.8 m crest.
    expect(points[4].jetWindow).toBeGreaterThan(2 * 0.7);
    expect(points[4].jetWindow).toBeLessThanOrEqual(2 * 0.8);
    // Its pace from the throw: its crest's, unmeasured here, so the long-wave speed √(g (h + η)) at its crest; its z runs
    // on it from where it threw (BreakingFront). The ends, with no jet, run on theirs too (the advisor, 2026-10-03).
    const pace = Math.sqrt(GRAVITY * (1.8 + 0.8));
    expect(points[4].jetPace).toBeCloseTo(pace, 12);
    expect(points[4].jetBase).toBe(11.5);
    expect(points[4].z).toBeCloseTo(11.5 + pace * points[4].tau, 12);
    expect(points[0].jetStrip).toBe(-1);
    expect(points[0].jetPace).toBeCloseTo(pace, 12);
    expect(points[0].z).toBeCloseTo(11.5 + pace * points[0].tau, 12);
    expect(crash.counts.paceUnmeasured).toBe(9);
    expect(crash.counts.crashes).toBe(0);
    expect(landed.length).toBe(0);
    run(crash, points, s, TOUCHDOWN, 2);
    expect(crash.counts.crashes).toBe(7);
    expect(crash.counts.late).toBe(0);
    expect(points[4].crashedAt).toBeDefined();
    expect(landed.length).toBe(7 * STRIP_PARCELS);
    // In h0 the tip is (1.2, 0.5) and lands straight below it, 2.4 m ahead of the anchor, which is the crest point; the
    // pour follows the drawn lip as its point runs on at its pace through the collapse.
    const collapse = library().profileTimes({ slope: 0.05, footHeight: 0.6, footDepth: 2 }).collapseSeconds;
    for (const z of landed) {
      expect(z).toBeGreaterThan(11.5 + pace * TOUCHDOWN + 2.4 - 0.6);
      expect(z).toBeLessThan(11.5 + pace * (TOUCHDOWN + collapse) + 2.4 + 0.6);
    }
    expect(lip.airborneVolume()).toBe(0);
  });

  it('paces a point at its throw step before its slice is taken, its jet launched from the paced crest, its water from the solver’s crest under it (the advisor, 2026-10-03)', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    // The crest crossed its throw depth 5 m back, at z 6.5, and the clock passes 0 only now (τ 0.02 s): the solver's crest
    // stands on rows 10–13 (z 10–14), the paced point 5 m behind it over flat water.
    const points = front(9, () => 0.02).map((p) => ({ ...p, throwZ: 6.5 }));
    const crestWater = rowsWater(solver, 10, 14);
    const flatWater = rowsWater(solver, 0, 10);
    solver.time += 0.01;
    crash.update(points, s);
    const pace = Math.sqrt(GRAVITY * (1.8 + 0.8));
    // Its z on its pace at the throw step itself, and the slice taken there: its drawn crest, the jet's launch point.
    for (const p of points) expect(p.z).toBeCloseTo(6.5 + pace * 0.02, 12);
    expect(crash.paced.length).toBe(9);
    for (const thrown of crash.paced) {
      expect(thrown.crestZ).toBe(11.5);
      expect(thrown.rayZ).toBeCloseTo(1, 12);
    }
    const strip = lip.exportState().strips.find(([id]) => id === points[4].jetStrip)![1];
    expect(strip.tube!.x).toBeCloseTo(4.5, 9);
    expect(strip.tube!.z).toBeCloseTo(6.5 + pace * 0.02, 9);
    // Its water left the solver's crest under it (#86): the crest's rows gave all of it, the water under the paced point none.
    expect(crash.counts.throws).toBe(7);
    expect(crash.counts.thrown).toBeGreaterThan(0);
    expect(crestWater - rowsWater(solver, 10, 14)).toBeCloseTo(crash.counts.thrown, 9);
    expect(rowsWater(solver, 0, 10)).toBe(flatWater);
    // With no throw point its pace starts from its z at the throw step, so it stays on the solver's crest there.
    const unanchored = front(9, () => 0.02).map((p) => ({ ...p, throwZ: null }));
    new SweptCrash(library(), 0.05).update(unanchored, sea(basin(), new PlungingLip(basin())));
    for (const p of unanchored) {
      expect(p.jetBase).toBeCloseTo(11.5 - pace * 0.02, 12);
      expect(p.z).toBeCloseTo(11.5, 12);
    }
  });

  it('foresees the landing at the throw where the crash lands it, its point on its pace and its clock at real time (the advisor, 2026-10-03)', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const points = front(9, () => 0);
    run(crash, points, s, 0, 0.01);
    // The foresight: where its parcels wait, held.
    const state = lip.exportState();
    const strip = state.strips.find(([id]) => id === points[4].jetStrip)![1];
    const slot = state.slots.indexOf(strip.parcels[0]);
    const foreseen = { x: state.fields.x[slot], z: state.fields.z[slot] };
    // The crash, at touchdown on the same clock: the first crash curve point is where its lip lands.
    let landed: { x: number; z: number } | undefined;
    for (let t = 0.01; t < TOUCHDOWN + 0.05 && !landed; t += 0.01) {
      for (const p of points) p.tau = t;
      solver.time += 0.01;
      crash.update(points, s);
      if (points[4].crashedAt !== undefined) landed = crash.curve[Math.floor(crash.curve.length / 2)];
      lip.step(0.01);
    }
    expect(landed).toBeDefined();
    // Within the pace's one step of clock past touchdown.
    const pace = Math.sqrt(GRAVITY * (1.8 + 0.8));
    expect(landed!.x).toBeCloseTo(foreseen.x, 6);
    expect(Math.abs(landed!.z - foreseen.z)).toBeLessThanOrEqual(pace * 0.01 + 1e-9);
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

  it('pours a lost point’s jet where it was foreseen, from when its point leaves the front (the advisor, 2026-10-03)', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const landed: { z: number; t: number }[] = [];
    lip.onLand = (_x, z, _volume, _vx, _vy, _vz, flight) => {
      if (flight?.swept) landed.push({ z, t: lip.time });
    };
    run(crash, front(9, () => 0), s, 0, 0.05);
    expect(crash.counts.throws).toBe(7);
    // Held: nothing has poured and no void has closed, though the clock ran on.
    expect(landed.length).toBe(0);
    expect(lip.trappedAir).toBe(0);
    // The front is gone: its jets crash where they were foreseen (the slice at touchdown, its point paced there), now.
    const left = lip.time;
    run(crash, [], s, 0, TOUCHDOWN + 2);
    expect(crash.counts.lost).toBe(7);
    expect(landed.length).toBe(7 * STRIP_PARCELS);
    const pace = Math.sqrt(GRAVITY * (1.8 + 0.8));
    for (const { z } of landed) expect(Math.abs(z - (11.5 + pace * TOUCHDOWN + 2.4))).toBeLessThan(0.6);
    expect(Math.min(...landed.map((landing) => landing.t))).toBeLessThan(left + 0.02);
    expect(lip.airborneVolume()).toBe(0);
    // Their voids closed as they left, trapping their air: none as a pour began.
    expect(lip.closedAtPour).toBe(0);
    expect(lip.trappedAir).toBeGreaterThan(0);
  });

  it('lets a point whose clock stalls leave the front 2 T after its throw, its jet crashing where it was foreseen (the advisor, 2026-10-03)', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const landed: { z: number; t: number }[] = [];
    lip.onLand = (_x, z, _volume, _vx, _vy, _vz, flight) => {
      if (flight?.swept) landed.push({ z, t: lip.time });
    };
    const points = front(9, () => 0);
    run(crash, points, s, 0, 0.05);
    const thrownAt = points[4].jetAt!;
    expect(thrownAt).toBeCloseTo(0.01, 12);
    // Its clock stalls at 0.05 s while the sea runs on: short of touchdown 2 T after its throw, every point leaves, jet or not.
    let left = Number.NaN;
    let exited = 0;
    for (let step = 0; step < 100 && Number.isNaN(left); step += 1) {
      for (const p of points) p.tau = 0.05;
      solver.time += 0.01;
      crash.update(points, s);
      lip.step(0.01);
      if (points.length === 0) {
        left = solver.time;
        exited = crash.exited.length;
      }
    }
    expect(left - thrownAt).toBeGreaterThanOrEqual(2 * TOUCHDOWN);
    expect(left - thrownAt).toBeLessThan(2 * TOUCHDOWN + 0.01 + 1e-9);
    expect(exited).toBe(9);
    expect(crash.counts.exits).toBe(9);
    expect(crash.counts.exitJets).toBe(7);
    expect(crash.counts.crashes + crash.counts.foreseen + crash.counts.lost).toBe(0);
    // Their jets pour from where they were foreseen, from the step they left.
    run(crash, points, s, 0, 2);
    expect(landed.length).toBe(7 * STRIP_PARCELS);
    expect(Math.min(...landed.map((landing) => landing.t))).toBeGreaterThan(left - 1e-9);
    const pace = Math.sqrt(GRAVITY * (1.8 + 0.8));
    for (const { z } of landed) expect(Math.abs(z - (11.5 + pace * TOUCHDOWN + 2.4))).toBeLessThan(0.6);
    expect(lip.airborneVolume()).toBe(0);
    expect(lip.closedAtPour).toBe(0);
  });

  it('lets a point still on its pace 2 (T + collapse) after its throw leave the front, its clock stalled in its slice’s fade (the advisor, 2026-10-03)', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const landed: { z: number; t: number }[] = [];
    lip.onLand = (_x, z, _volume, _vx, _vy, _vz, flight) => {
      if (flight?.swept) landed.push({ z, t: lip.time });
    };
    const collapse = library().profileTimes({ slope: 0.05, footHeight: 0.6, footDepth: 2 }).collapseSeconds;
    const points = front(9, () => 0);
    // Thrown at its first step, crashed at touchdown, and pouring when its clock stalls in its fade.
    run(crash, points, s, 0, TOUCHDOWN + 0.3 * collapse);
    const thrownAt = points[4].jetAt!;
    expect(points[4].crashedAt).toBeDefined();
    expect(crash.counts.crashes).toBe(7);
    const stall = points[4].tau;
    expect(stall).toBeGreaterThan(TOUCHDOWN);
    // The sea runs on: on its pace, at z = jetBase + jetPace τ, until 2 (T + collapse) after its throw; then every point
    // leaves the front, jet or not, apart from the 2 T exits.
    const pace = Math.sqrt(GRAVITY * (1.8 + 0.8));
    let left = Number.NaN;
    let exited = 0;
    for (let step = 0; step < 300 && Number.isNaN(left); step += 1) {
      for (const p of points) p.tau = stall;
      solver.time += 0.01;
      crash.update(points, s);
      lip.step(0.01);
      if (points.length === 0) {
        left = solver.time;
        exited = crash.fadeExited.length;
      } else {
        expect(points[4].z).toBeCloseTo(11.5 + pace * stall, 9);
      }
    }
    expect(left - thrownAt).toBeGreaterThanOrEqual(2 * (TOUCHDOWN + collapse));
    expect(left - thrownAt).toBeLessThan(2 * (TOUCHDOWN + collapse) + 0.01 + 1e-9);
    expect(exited).toBe(9);
    expect(crash.counts.fadeExits).toBe(9);
    expect(crash.counts.fadeExitJets).toBe(7);
    expect(crash.counts.exits + crash.counts.exitJets + crash.counts.lost + crash.counts.foreseen).toBe(0);
    // Its pour runs on the lip's own time from its crash, so it had all left before the point did: every parcel landed
    // where the drawn lip came down, from its crash to its stalled clock, and its void closed at its crash.
    run(crash, points, s, 0, 1);
    expect(landed.length).toBe(7 * STRIP_PARCELS);
    for (const { z, t } of landed) {
      expect(z).toBeGreaterThan(11.5 + pace * TOUCHDOWN + 2.4 - 0.6);
      expect(z).toBeLessThan(11.5 + pace * stall + 2.4 + 0.6);
      expect(t).toBeLessThan(left);
    }
    expect(lip.airborneVolume()).toBe(0);
    expect(lip.closedAtPour).toBe(0);
  });

  it('paces a thrown point, jet or not, along its column, c_n / n_z after the clamp, with no blend through its slice’s fade (the advisor)', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const wave = Math.sqrt(GRAVITY * (1.8 + 0.8));
    // Fronts at 0°, 26.6° and 71.6° to the columns (their rays' z parts 1, 0.894 and 0.316, held to 0.5); crests at 4 m/s,
    // and one at 10 m/s, past 1.5 √(g (h + η)).
    const paced = (slope: number, speed: number) => {
      const points = front(9, () => 0).map((p) => ({ ...p, z: 11.5 + slope * (p.x - 4.5), throwZ: 11.5 + slope * (p.x - 4.5), crestSpeed: speed }));
      crash.update(points, s);
      return points[4];
    };
    expect(paced(0, 4).jetPace).toBeCloseTo(4, 12);
    expect(paced(0.5, 4).jetPace).toBeCloseTo(4 / (1 / Math.sqrt(1.25)), 2);
    expect(paced(3, 4).jetPace).toBeCloseTo(4 / 0.5, 2);
    expect(paced(0, 10).jetPace).toBeCloseTo(1.5 * wave, 12);
    // Every point of the front, its two ends with no jet among them.
    expect(crash.counts.paceFast).toBe(9);
    // Held to its pace from the throw until its slice has faded, at touchdown + collapse, whatever crest it claims; then
    // left where the front puts it (the ordinary match).
    const points = front(9, () => 0).map((p) => ({ ...p, crestSpeed: 4 }));
    run(crash, points, s, 0, 0.02);
    const p = points[4];
    const times = library().profileTimes({ slope: 0.05, footHeight: 0.6, footDepth: 2 });
    const until = times.touchdownSeconds + times.collapseSeconds;
    expect(p.jetUntil).toBeCloseTo(until, 12);
    expect(points[0].jetUntil).toBeCloseTo(until, 12);
    for (const tau of [0.1, 0.8 * TOUCHDOWN + 0.05, TOUCHDOWN, TOUCHDOWN + 0.5 * times.collapseSeconds, until - 0.01, until + 0.01]) {
      for (const q of points) {
        q.tau = tau;
        q.crestZ = 14;
      }
      const before = p.z;
      crash.update(points, s);
      if (tau < until) expect(p.z).toBeCloseTo(11.5 + 4 * tau, 12);
      else expect(p.z).toBe(before);
    }
    expect(p.crashedAt).toBeDefined();
  });

  it('crashes as foreseen the jet of a point left alone on its front at its touchdown', () => {
    const solver = basin();
    const lip = new PlungingLip(solver);
    const crash = new SweptCrash(library(), 0.05);
    const s = sea(solver, lip);
    const points = front(9, () => 0);
    run(crash, points, s, 0, 0.05);
    expect(crash.counts.throws).toBe(7);
    // Its neighbours gone, point 4 stands alone: no ray to draw it by, so the runs pass it over. The others' jets crash
    // where they were foreseen as their points leave.
    const alone = [points[4]];
    run(crash, alone, s, 0.05, TOUCHDOWN - 0.06);
    expect(crash.counts.lost).toBe(6);
    expect(points[4].crashedAt).toBeUndefined();
    expect(crash.counts.foreseen).toBe(0);
    const trapped = lip.trappedAir;
    run(crash, alone, s, TOUCHDOWN, 0.02);
    expect(points[4].crashedAt).toBeDefined();
    expect(crash.counts.foreseen).toBe(1);
    expect(crash.counts.crashes).toBe(0);
    expect(lip.trappedAir).toBeGreaterThan(trapped);
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
