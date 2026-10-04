import { describe, expect, it } from 'vitest';
import { PlungingLip, type SweptJet } from './PlungingLip';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';

function basin(): ShallowWaterSolver {
  const solver = new ShallowWaterSolver({ nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => 2, { manning: 0 });
  for (let z = 10; z < 14; z += 1) for (let x = 0; x < 12; x += 1) solver.h[z * 12 + x] += 0.8;
  return solver;
}
const water = (solver: ShallowWaterSolver) => solver.h.reduce((sum, h, i) => sum + h * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0);
const jet = (solver: ShallowWaterSolver): SweptJet => ({
  cell: 11 * solver.nx + 3, velocityX: 0, velocityZ: 4, volume: 0.3, waveHeight: 0.8,
  launchX: 3.5, launchY: 2.8, launchZ: 11.5, pourX: 3.5, pourY: 0.01, pourZ: 15,
  pourSpacing: 1 / 24, pourVY: -3, voidLength: 0, axisX: 1, axisY: 0, voidHeight: 0, voidArea: 0, span: 2,
  dirX: 0, dirZ: 1, crestSpeed: 3, relativeSpeed: 1,
});
const current = (area: number) => ({ area, span: 2, length: 1.5, height: 0.6, axisX: 0.8, axisY: -0.6 });

describe('current swept void air ledger', () => {
  it('keeps open growth atmospheric, traps current air once at seal, and releases only lost volume', () => {
    const solver = basin(), lip = new PlungingLip(solver), before = water(solver);
    const strip = lip.holdJet(jet(solver)).strip;
    expect(strip).toBeGreaterThan(0);
    let out = 0;
    lip.onAir = (_x, _z, volume) => { out += volume; };
    const step = () => {
      lip.step(1 / 60);
      out += lip.spits.reduce((sum, spit) => sum + spit.airRate / 60, 0);
      out += lip.eruptions.reduce((sum, eruption) => sum + eruption.airRate / 60, 0);
      expect(out + lip.heldAir).toBeCloseTo(lip.trappedAir, 10);
      expect(water(solver) + lip.airborneVolume() + lip.escapedVolume).toBeCloseTo(before, 9);
    };
    for (const area of [0, 0.1, 0.4]) {
      expect(lip.setSweptVoid(strip, current(area))).toBe(true);
      step(); expect(lip.trappedAir).toBe(0); expect(out).toBe(0);
    }
    const pour = { x: 3.5, y: 0.01, z: 15, spacing: 1 / 24, vy: -3 }, crest = { x: 3.5, y: 0.8, z: 13 };
    expect(lip.crashJet(strip, pour, crest)).toBe(true);
    expect(lip.trappedAir).toBeCloseTo(0.8, 12);
    step(); expect(out).toBe(0); expect(lip.heldAir).toBeCloseTo(0.8, 12);
    lip.setSweptVoid(strip, current(0.1)); step();
    expect(out).toBeCloseTo(0.6, 12); expect(lip.heldAir).toBeCloseTo(0.2, 12);
    lip.setSweptVoid(strip, current(0.3)); step();
    expect(out).toBeCloseTo(0.6, 12); expect(lip.heldAir).toBeCloseTo(0.2, 12);
    lip.crashJet(strip, pour, crest); expect(lip.trappedAir).toBeCloseTo(0.8, 12);
    lip.setSweptVoid(strip, current(0)); step();
    expect(out).toBeCloseTo(0.8, 12); expect(lip.heldAir).toBe(0);
    for (let i = 0; i < 180; i += 1) { lip.setSweptVoid(strip, current(0)); step(); }
    expect(out).toBeCloseTo(0.8, 12); expect(lip.airborneVolume()).toBe(0);
  });

  it('retains the final sealed dose after the last water parcel lands, then flushes on disappearance once', () => {
    const solver = basin(), lip = new PlungingLip(solver);
    const strip = lip.holdJet(jet(solver)).strip;
    lip.setSweptVoid(strip, current(0.4));
    lip.closeJet(strip);
    let out = 0;
    lip.onAir = (_x, _z, volume) => { out += volume; };
    const step = () => {
      lip.step(1 / 60);
      out += lip.spits.reduce((sum, spit) => sum + spit.airRate / 60, 0) + lip.eruptions.reduce((sum, eruption) => sum + eruption.airRate / 60, 0);
      expect(out + lip.heldAir).toBeCloseTo(lip.trappedAir, 10);
    };
    lip.setSweptVoid(strip, current(0.1));
    for (let k = 0; k < 180; k += 1) step();
    expect(lip.airborneVolume()).toBe(0);
    expect(lip.heldAir).toBeCloseTo(0.2, 12);
    expect(lip.setSweptVoid(strip, current(0))).toBe(true); step();
    expect(lip.heldAir).toBe(0); expect(out).toBeCloseTo(0.8, 12);
    for (let k = 0; k < 4; k += 1) { lip.setSweptVoid(strip, current(0)); step(); }
    expect(out).toBeCloseTo(0.8, 12);
  });
});
