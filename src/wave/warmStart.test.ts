import { describe, expect, it } from 'vitest';
import { shallowWaterWaveNumber } from './dispersion';
import { SeaState } from './SeaState';
import { SeaStateBoundary } from './SeaStateBoundary';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';
import { planSetRun, warmStart } from './warmStart';

const slope = (_x: number, z: number) => (z < 0 ? 8 : 8 - 0.02 * z);

describe('warmStart', () => {
  it('reproduces the analytic sea exactly over a flat bed', () => {
    const solver = new ShallowWaterSolver({ nx: 16, xMin: -40, dx: 5, zEdges: uniformEdges(-100, 100, 40), xBoundary: 'open' }, () => 8);
    const sea = SeaState.fromSpectrum(
      { significantHeight: 1, peakPeriod: 9, direction: 0.2, spreading: 10, componentCount: 12, depth: 8 }, 3, shallowWaterWaveNumber,
    );
    warmStart(solver, sea, { referenceZ: -100, seaTime: 12 });
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        expect(solver.surfaceAt(i)).toBeCloseTo(sea.elevation(solver.xCenters[ix], solver.zCenters[iz], 12), 9);
      }
    }
  });

  it("shoals by Green's law and caps the height at the breaker index", () => {
    const solver = new ShallowWaterSolver({ nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(-50, 395, 445), xBoundary: 'open' }, slope);
    const amplitude = 0.2;
    const sea = new SeaState([{ amplitude, omega: (2 * Math.PI) / 12, direction: 0, phase: 0 }], 8, shallowWaterWaveNumber);
    const twoMetres = solver.cellIndex(0.5, 300.5);
    const thirtyCentimetres = solver.cellIndex(0.5, 385.5);
    let shoaled = 0;
    let capped = 0;
    for (let k = 0; k < 24; k += 1) {
      warmStart(solver, sea, { referenceZ: -50, seaTime: k * 0.5 });
      shoaled = Math.max(shoaled, Math.abs(solver.surfaceAt(twoMetres)));
      capped = Math.max(capped, Math.abs(solver.surfaceAt(thirtyCentimetres)));
    }
    const depthThere = 8 - 0.02 * 300.5;
    expect(shoaled / (amplitude * Math.pow(8 / depthThere, 0.25))).toBeCloseTo(1, 1);
    const depthCap = 8 - 0.02 * 385.5;
    expect(capped).toBeLessThanOrEqual((0.78 * depthCap * Math.SQRT2) / 4 + 1e-9);
  });

  it('starts close to a solution so the spin-up stays calm', () => {
    const solver = new ShallowWaterSolver({ nx: 40, xMin: -80, dx: 4, zEdges: uniformEdges(-100, 380, 240), xBoundary: 'open' }, slope);
    const sea = new SeaState([{ amplitude: 0.25, omega: (2 * Math.PI) / 10, direction: 0.3, phase: 0.4 }], 8, shallowWaterWaveNumber);
    warmStart(solver, sea, { referenceZ: -60, seaTime: 40 });
    solver.addRelaxationZone(new SeaStateBoundary(solver, sea, solver.zoneWeightsAlongZ(-60, -100), 40));
    let initial = 0;
    for (let i = 0; i < solver.h.length; i += 1) if (solver.h[i] > 0.5) initial = Math.max(initial, Math.abs(solver.surfaceAt(i)));
    let largest = 0;
    while (solver.time < 20) {
      solver.step(1 / 20);
      for (let i = 0; i < solver.h.length; i += 1) if (solver.h[i] > 0.5) largest = Math.max(largest, Math.abs(solver.surfaceAt(i)));
    }
    expect(largest).toBeLessThan(1.3 * initial);
  }, 30_000);
});

describe('planSetRun', () => {
  it('hands over a fixed lead before the next set peak, after the spin-up', () => {
    const sea = new SeaState([12, 14].map((period) => ({ amplitude: 0.4, omega: (2 * Math.PI) / period, direction: 0, phase: 0 })), 10);
    const plan = planSetRun(sea, 0, -60, 5, 20, 24);
    expect(plan.setPeakSeaTime - plan.handOverSeaTime).toBeCloseTo(20, 12);
    expect(plan.handOverSeaTime - plan.warmStartSeaTime).toBeCloseTo(24, 12);
    expect(plan.warmStartSeaTime).toBeGreaterThanOrEqual(5);
    expect(sea.envelope(0, -60, plan.setPeakSeaTime)).toBeGreaterThan(0.75);
  });
});
