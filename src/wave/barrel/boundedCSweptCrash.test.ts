import { describe, expect, it } from 'vitest';
import { PlungingLip } from '../PlungingLip';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import type { FrontPoint } from './BreakingFront';
import { ProfileLibrary } from './ProfileLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { SweptCrash, type CrashSea } from './SweptCrash';

const cases = readBarrelCases().map(decodeCase);
const c = cases.find(c => c.id === 'pad19-a30-l12')!;
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const query = { slope: c.slope, footHeight: c.nonlinearity * 2, footDepth: 2 };
const times = library.profileTimes(query);
const water = (solver: ShallowWaterSolver) => solver.h.reduce((sum, h, i) => sum + h * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0);
function fixture() {
  const solver = new ShallowWaterSolver({ nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => 2, { manning: 0 });
  for (let z = 10; z < 14; z++) for (let x = 0; x < 12; x++) solver.h[z * 12 + x] += 0.8;
  const lip = new PlungingLip(solver), crash = new SweptCrash(library, c.slope);
  const sea: CrashSea = { solver, lip, stillLevel: 0, period: 16, strength: new Float64Array(solver.h.length), whitewater: new Float64Array(solver.h.length) };
  const points: FrontPoint[] = Array.from({ length: 9 }, (_, k) => ({ id: k, front: 1, column: k, sigma: k, x: k + 0.5, z: 11.5,
    b: 0, height: 0.8, joined: 0, depth: 2, throwDepth: 1.8, crestDepth: 1.8, thrown: 0, throwZ: 11.5,
    footHeight: query.footHeight, footDepth: 2, broke: 0, tau: 0, fresh: null, seen: 0 }));
  const before = water(solver), dt = 1 / 120;
  let emitted = 0;
  lip.onAir = (_x, _z, volume) => { emitted += volume; };
  function step(age: number) {
    for (const point of points) point.tau = age;
    solver.time += dt; crash.update(points, sea); lip.step(dt);
    emitted += lip.spits.reduce((sum, spit) => sum + spit.airRate * dt, 0) + lip.eruptions.reduce((sum, eruption) => sum + eruption.airRate * dt, 0);
    expect(emitted + lip.heldAir).toBeCloseTo(lip.trappedAir, 9);
    expect(water(solver) + lip.airborneVolume() + lip.escapedVolume).toBeCloseTo(before, 9);
  }
  return { solver, lip, crash, points, step, get emitted() { return emitted; } };
}

describe('bounded-C actual swept crash lifecycle', () => {
  it('funds water prospectively, keeps formation air atmospheric, seals current air, and retires it once', () => {
    const f = fixture();
    f.step(0);
    expect(f.crash.counts.throws).toBe(7); expect(f.crash.counts.thrown).toBeGreaterThan(0);
    expect(f.lip.trappedAir).toBe(0);
    expect(f.lip.exportState().strips.every(([, strip]) => strip.tube!.sweptVoidVolume === 0)).toBe(true);
    let openMaximum = 0, sealed = 0;
    const dt = 1 / 120;
    for (let k = 1; k <= Math.ceil((times.touchdownSeconds + times.collapseSeconds + 2) / dt); k++) {
      const age = k * dt; f.step(age);
      const current = f.lip.exportState().strips.reduce((sum, [, strip]) => sum + (strip.tube?.sweptVoidVolume ?? 0), 0);
      if (age < times.touchdownSeconds) {
        openMaximum = Math.max(openMaximum, current); expect(f.lip.trappedAir).toBe(0); expect(f.emitted).toBe(0);
      } else if (!sealed && f.lip.trappedAir > 0) sealed = f.lip.trappedAir;
      if (sealed) expect(f.lip.trappedAir).toBeCloseTo(sealed, 10);
    }
    expect(openMaximum).toBeGreaterThan(0); expect(sealed).toBeGreaterThan(0);
    expect(f.crash.counts.crashes).toBe(7); expect(f.lip.heldAir).toBe(0);
    expect(f.emitted).toBeCloseTo(sealed, 9); expect(f.lip.airborneVolume()).toBe(0);
  });

  it('does not trap removed open geometry and flushes removed sealed geometry through ordinary update', () => {
    for (const removeAfterSeal of [false, true]) {
      const f = fixture(), dt = 1 / 120;
      const until = removeAfterSeal ? times.touchdownSeconds + 0.1 * times.collapseSeconds : times.clearSeconds;
      for (let k = 0; k * dt <= until; k++) f.step(k * dt);
      const trapped = f.lip.trappedAir;
      if (removeAfterSeal) expect(trapped).toBeGreaterThan(0); else expect(trapped).toBe(0);
      f.points.length = 0;
      for (let k = 0; k < 240; k++) f.step(until + (k + 1) * dt);
      expect(f.lip.heldAir).toBe(0); expect(f.emitted).toBeCloseTo(trapped, 9);
      expect(f.lip.trappedAir).toBeCloseTo(trapped, 10); expect(f.lip.airborneVolume()).toBe(0);
    }
  });
});
