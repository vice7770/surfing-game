import { describe, expect, it } from 'vitest';
import { shallowWaterWaveNumber } from './dispersion';
import { SeaState } from './SeaState';
import { SeaStateBoundary } from './SeaStateBoundary';
import { ShallowWaterSolver, uniformEdges, type WaterTarget } from './ShallowWaterSolver';

const spectrum = { significantHeight: 1, peakPeriod: 9, direction: 0.25, spreading: 8, componentCount: 16, depth: 8 };

function linearFlux(sea: SeaState, x: number, z: number, t: number): { qx: number; qz: number } {
  let qx = 0;
  let qz = 0;
  for (const c of sea.components) {
    const eta = c.amplitude * Math.cos(c.kx * x + c.kz * z - c.omega * t + c.phase);
    const speed = c.omega / c.k;
    qx += speed * Math.sin(c.direction) * eta;
    qz += speed * Math.cos(c.direction) * eta;
  }
  return { qx, qz };
}

describe('SeaStateBoundary', () => {
  it('matches the linear sea in every zone cell, also after the window slides', () => {
    const solver = new ShallowWaterSolver(
      { nx: 20, xMin: -50, dx: 5, zEdges: uniformEdges(-200, 0, 40), xBoundary: 'open' }, () => 8,
    );
    const sea = SeaState.fromSpectrum(spectrum, 4, shallowWaterWaveNumber);
    const weights = solver.zoneWeightsAlongZ(-160, -200);
    const boundary = new SeaStateBoundary(solver, sea, weights, 37);
    const out: WaterTarget = { eta: 0, qx: 0, qz: 0 };
    const check = (t: number) => {
      let checked = 0;
      for (let i = 0; i < weights.length; i += 1) {
        if (weights[i] <= 0) continue;
        const x = solver.xCenters[i % solver.nx];
        const z = solver.zCenters[Math.floor(i / solver.nx)];
        boundary.target(x, z, t, out, i);
        const flux = linearFlux(sea, x, z, t + 37);
        expect(out.eta).toBeCloseTo(sea.elevation(x, z, t + 37), 9);
        expect(out.qx).toBeCloseTo(flux.qx, 9);
        expect(out.qz).toBeCloseTo(flux.qz, 9);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(100);
    };
    check(3.25);
    solver.shiftAlongShore(3);
    check(5.5);
  });

  it('generates the linear sea state inside a flat channel', () => {
    const depth = 6;
    const solver = new ShallowWaterSolver(
      { nx: 100, xMin: -100, dx: 2, zEdges: uniformEdges(0, 400, 200), xBoundary: 'open' }, () => depth, { manning: 0 },
    );
    const sea = SeaState.fromSpectrum({ ...spectrum, significantHeight: 0.6, peakPeriod: 10, spreading: 24, depth }, 7, shallowWaterWaveNumber);
    solver.addRelaxationZone(new SeaStateBoundary(solver, sea, solver.zoneWeightsAlongZ(80, 0)));
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(320, 400), target: (_x, _z, _t, out) => { out.eta = 0; out.qx = 0; out.qz = 0; } });
    const gauges = [-30, -15, 0, 15, 30].map((x) => ({ x, index: solver.cellIndex(x, 131) }));
    let simulated = 0;
    let linear = 0;
    while (solver.time < 200) {
      solver.step(0.1);
      if (solver.time < 80) continue;
      for (const gauge of gauges) {
        simulated += solver.surfaceAt(gauge.index) ** 2;
        linear += sea.elevation(solver.xCenters[gauge.index % solver.nx], 131, solver.time) ** 2;
      }
    }
    expect(Math.sqrt(simulated / linear)).toBeGreaterThan(0.9);
    expect(Math.sqrt(simulated / linear)).toBeLessThan(1.1);
  }, 60_000);
});
