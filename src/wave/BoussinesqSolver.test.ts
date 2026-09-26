import { describe, expect, it } from 'vitest';
import { BoussinesqSolver, madsenSorensenCelerity } from './BoussinesqSolver';
import { GRAVITY } from './dispersion';
import { ShallowWaterSolver, uniformEdges, type WaterTarget } from './ShallowWaterSolver';
import { calmTarget, longWaveTarget } from './shallowWaterTestSupport';

/** A small linear wave η = a cos(kz − ωt), with the flux that carries it, P = (ω/k) η. */
function linearTarget(amplitude: number, omega: number, k: number) {
  return (_x: number, z: number, t: number, out: WaterTarget): void => {
    out.eta = amplitude * Math.cos(k * z - omega * t);
    out.qx = 0;
    out.qz = (omega / k) * out.eta;
  };
}

/**
 * Wavenumber measured from the phase of the surface along a stretch of channel:
 * each row's complex amplitude at ω over whole periods, unwrapped and fitted
 * against z (reflections average out over several wavelengths).
 */
class PhaseFit {
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  constructor(private readonly solver: ShallowWaterSolver, private readonly rows: number[], private readonly omega: number) {
    this.cos = new Float64Array(rows.length);
    this.sin = new Float64Array(rows.length);
  }
  sample(): void {
    const { solver } = this;
    const phase = this.omega * solver.time;
    this.rows.forEach((row, n) => {
      const eta = solver.surfaceAt(row * solver.nx);
      this.cos[n] += eta * Math.cos(phase);
      this.sin[n] += eta * Math.sin(phase);
    });
  }
  wavenumber(): number {
    const zs = this.rows.map((row) => this.solver.zCenters[row]);
    const phases: number[] = [];
    let previous = 0;
    this.rows.forEach((_, n) => {
      let phase = Math.atan2(this.sin[n], this.cos[n]);
      if (n > 0) phase += 2 * Math.PI * Math.round((previous - phase) / (2 * Math.PI));
      phases.push(phase);
      previous = phase;
    });
    const meanZ = zs.reduce((a, b) => a + b, 0) / zs.length;
    const meanP = phases.reduce((a, b) => a + b, 0) / phases.length;
    let szz = 0;
    let szp = 0;
    zs.forEach((z, n) => {
      szz += (z - meanZ) ** 2;
      szp += (z - meanZ) * (phases[n] - meanP);
    });
    return Math.abs(szp / szz);
  }
}

/** The Madsen–Sørensen phase speed at wavenumber k: √(g d (1 + B(kd)²)/(1 + (B + 1/3)(kd)²)). */
function modelCelerityAt(k: number, depth: number): number {
  const s = (k * depth) ** 2;
  return Math.sqrt((GRAVITY * depth * (1 + s / 15)) / (1 + (1 / 15 + 1 / 3) * s));
}

/** Phase speed of a small wave driven at the model's own kh in a flat channel of depth `depth`, 40 cells per wavelength. */
function measuredCelerity(kh: number, depth: number): { measured: number; omega: number } {
  const kModel = kh / depth;
  const omega = kModel * modelCelerityAt(kModel, depth);
  const wavelength = (2 * Math.PI) / kModel;
  const cells = 40 * 12;
  const length = 12 * wavelength;
  const solver = new BoussinesqSolver(
    { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, length, cells), xBoundary: 'periodic' }, () => depth, { manning: 0, breaking: false },
  );
  solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(2 * wavelength, 0), target: linearTarget(0.001 * depth, omega, kModel) });
  solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(8 * wavelength, length), target: calmTarget });
  const rows: number[] = [];
  for (let iz = 0; iz < solver.nz; iz += 1) {
    const z = solver.zCenters[iz];
    if (z > 3 * wavelength && z < 7 * wavelength) rows.push(iz);
  }
  const period = (2 * Math.PI) / omega;
  const groupTime = length / (0.4 * Math.sqrt(GRAVITY * depth));
  const settle = groupTime + 5 * period;
  const fit = new PhaseFit(solver, rows, omega);
  const step = period / 40;
  while (solver.time < settle - 1e-9) solver.step(step);
  const end = settle + 10 * period;
  while (solver.time < end - 1e-9) {
    solver.step(step);
    fit.sample();
  }
  return { measured: omega / fit.wavenumber(), omega };
}

describe('Boussinesq dispersion', () => {
  for (const kh of [0.5, 1, 2, 3]) {
    it(`carries a small wave at the phase speed its equations predict, at kh = ${kh}`, () => {
      const depth = 2;
      const { measured, omega } = measuredCelerity(kh, depth);
      expect(Math.abs(measured / madsenSorensenCelerity(omega, depth) - 1)).toBeLessThan(0.01);
    }, 60_000);
  }

  it('reduces exactly to the shallow-water solver with dispersion off', () => {
    const grid = { nx: 3, xMin: 0, dx: 1, zEdges: uniformEdges(0, 200, 200), xBoundary: 'open' as const };
    const depthAt = (_x: number, z: number) => 4 - 0.015 * z;
    const plain = new ShallowWaterSolver(grid, depthAt);
    const off = new BoussinesqSolver(grid, depthAt, { dispersion: false, breaking: false });
    for (const solver of [plain, off]) solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(40, 0), target: longWaveTarget(0.2, 8, 4) });
    for (let i = 0; i < 200; i += 1) {
      plain.step(1 / 30);
      off.step(1 / 30);
    }
    expect(Array.from(off.h)).toEqual(Array.from(plain.h));
    expect(Array.from(off.qz)).toEqual(Array.from(plain.qz));
  });

  it('keeps a lake at rest over a sloping bed and a dry beach', () => {
    const solver = new BoussinesqSolver(
      { nx: 6, xMin: 0, dx: 1, zEdges: uniformEdges(0, 120, 120), xBoundary: 'open' },
      (x, z) => 3 - 0.04 * z + 0.2 * Math.sin(x), { breaking: false },
    );
    let fastest = 0;
    for (let i = 0; i < 600; i += 1) {
      solver.step(1 / 30);
      for (let c = 0; c < solver.h.length; c += 1) {
        if (solver.h[c] > 1e-3) fastest = Math.max(fastest, Math.hypot(solver.qx[c], solver.qz[c]) / solver.h[c]);
      }
    }
    expect(fastest).toBeLessThan(1e-9);
  });

  // Plan §1.8's table: the phase speed at a given kh is within 2.5 % of Airy up to kh = 3 (2.4 % there).
  it('has phase speeds within 2.5 % of Airy to kh = 3, and the shallow-water speed in the long-wave limit', () => {
    const depth = 3;
    expect(madsenSorensenCelerity(0.01, depth) / Math.sqrt(GRAVITY * depth)).toBeCloseTo(1, 4);
    for (const kh of [0.5, 1, 2, 3]) {
      const k = kh / depth;
      const model = modelCelerityAt(k, depth);
      expect(madsenSorensenCelerity(k * model, depth)).toBeCloseTo(model, 10);
      const airy = Math.sqrt((GRAVITY * Math.tanh(kh)) / k);
      expect(Math.abs(model / airy - 1)).toBeLessThan(0.025);
    }
  });
});
