import { describe, expect, it } from 'vitest';
import { createSpot } from './Bathymetry';
import { BoussinesqSolver, madsenSorensenCelerity, madsenSorensenWaveNumber } from './BoussinesqSolver';
import { GRAVITY } from './dispersion';
import { ShallowWaterSolver, uniformEdges, type WaterTarget } from './ShallowWaterSolver';
import { calmTarget, longWaveTarget, meanLag, upCrossings } from './shallowWaterTestSupport';

/** Airy wavenumber for ω at depth d (Newton on ω² = g k tanh kd). */
function airyWavenumber(omega: number, depth: number): number {
  let k = omega / Math.sqrt(GRAVITY * depth);
  for (let i = 0; i < 50; i += 1) {
    const t = Math.tanh(k * depth);
    k -= (GRAVITY * k * t - omega * omega) / (GRAVITY * (t + k * depth * (1 - t * t)));
  }
  return k;
}

/** Airy group speed for ω at depth d. */
function airyGroupSpeed(omega: number, depth: number): number {
  const k = airyWavenumber(omega, depth);
  return 0.5 * (omega / k) * (1 + (2 * k * depth) / Math.sinh(2 * k * depth));
}

/** A small Airy wave travelling at `angle` from +z: η = a cos(k·x − ωt), with its depth-integrated flux (ω/k) η. */
function airyTarget(amplitude: number, period: number, depth: number, angle = 0) {
  const omega = (2 * Math.PI) / period;
  const k = airyWavenumber(omega, depth);
  const kx = k * Math.sin(angle);
  const kz = k * Math.cos(angle);
  return (x: number, z: number, t: number, out: WaterTarget): void => {
    const eta = amplitude * Math.cos(kx * x + kz * z - omega * t);
    out.eta = eta;
    out.qx = (omega / k) * eta * Math.sin(angle);
    out.qz = (omega / k) * eta * Math.cos(angle);
  };
}

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
  it('gives the wave number of its own dispersion (wave sizes)', () => {
    const omega = (2 * Math.PI) / 10;
    expect(madsenSorensenWaveNumber(omega, 12)).toBeCloseTo(omega / madsenSorensenCelerity(omega, 12), 12);
  });

  for (const kh of [0.5, 1, 2, 3]) {
    it(`carries a small wave at the phase speed its equations predict, at kh = ${kh}`, () => {
      const depth = 2;
      const { measured, omega } = measuredCelerity(kh, depth);
      expect(Math.abs(measured / madsenSorensenCelerity(omega, depth) - 1)).toBeLessThan(0.01);
    }, 60_000);
  }

  // The Hancock predictor must see the dispersive acceleration: with shallow-water rates alone it
  // lost 8 % of a kh = 1.5 wave's height per wavelength at this resolution.
  it('carries a short dispersive wave without numerical decay', () => {
    const depth = 2;
    const k = 1.5 / depth;
    const omega = k * modelCelerityAt(k, depth);
    const wavelength = (2 * Math.PI) / k;
    const length = 16 * wavelength;
    const solver = new BoussinesqSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, length, 16 * 40), xBoundary: 'periodic' }, () => depth, { manning: 0, breaking: false },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(2 * wavelength, 0), target: linearTarget(0.002, omega, k) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(13 * wavelength, length), target: calmTarget });
    const period = (2 * Math.PI) / omega;
    const settle = (13 * wavelength) / (0.45 * modelCelerityAt(k, depth)) + 3 * period;
    const near = solver.cellIndex(0.5, 3 * wavelength);
    const far = solver.cellIndex(0.5, 12 * wavelength);
    let nearEnvelope = 0;
    let farEnvelope = 0;
    while (solver.time < settle + 4 * period) {
      solver.step(period / 40);
      if (solver.time < settle) continue;
      nearEnvelope = Math.max(nearEnvelope, Math.abs(solver.surfaceAt(near)));
      farEnvelope = Math.max(farEnvelope, Math.abs(solver.surfaceAt(far)));
    }
    expect(1 - Math.pow(farEnvelope / nearEnvelope, 1 / 9)).toBeLessThan(0.005);
  }, 60_000);

  // A trough draining a reef ledge left 0.07 m over 4 m of still depth, and its full-depth dispersive terms ran the
  // backwash away (the Teahupo'o Reef's Big swell): the weakly nonlinear terms fail in a trough as deep as the
  // Tonelli–Petti crest is high, so both switch to shallow water.
  it('turns dispersion off in a trough drained below a fifth of its still depth, as at a crest above the Tonelli–Petti ratio', () => {
    const grid = { nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' as const };
    const solver = new BoussinesqSolver(grid, () => 4, { manning: 0, breaking: false });
    const middle = 20 * solver.nx + 6;
    const cell = (iz: number, ix: number) => iz * solver.nx + ix;
    for (let iz = 18; iz <= 22; iz += 1) for (let ix = 4; ix <= 8; ix += 1) solver.h[cell(iz, ix)] = 0.5;
    const normal = cell(10, 6);
    solver.step(1e-4);
    expect(solver.mask[normal]).toBe(1);
    expect(solver.mask[middle]).toBe(0);
  });

  // The Reef's Big set breaking on its ledge by the open −x edge: a dispersive cell beside the shallow-water bore kept
  // the bore's flux through the implicit recovery while the bore's outflow drained it, from 19 m/s at Froude 4 to NaN;
  // and a Big trough drawn down over the ledge where the window cuts it pumped the edge's inflow to 40 m/s, then NaN.
  it('turns dispersion off where the water runs faster than twice the long-wave speed', () => {
    const grid = { nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' as const };
    const solver = new BoussinesqSolver(grid, () => 4, { manning: 0, breaking: false });
    const critical = 2 * 4 * Math.sqrt(GRAVITY * 4);
    const slow = 20 * solver.nx + 6;
    const fast = 10 * solver.nx + 6;
    solver.qz[slow] = 0.9 * critical;
    solver.qz[fast] = 1.1 * critical;
    solver.step(1e-4);
    expect(solver.mask[slow]).toBe(1);
    expect(solver.mask[fast]).toBe(0);
  });

  // A thick lip landing on the Reef's drained crest piled 0.4 m of water to 1.5 m, and the dispersive terms, still on
  // across that bore, drained it at 23.5 m/s (Teahupo'o Reef Part B): where a jet lands the water is shallow water.
  it('holds a plunging jet\'s roller in shallow water for Kennedy\'s T*, then disperses again', () => {
    const grid = { nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' as const };
    const solver = new BoussinesqSolver(grid, () => 4, { manning: 0, breaking: false });
    const cell = (x: number, z: number) => solver.cellIndex(x, z);
    // A jet 2 m high lands at (6.5, 20.5), travelling toward +z.
    solver.holdPlunge(6.5, 20.5, 0, 1, 2);
    solver.step(1e-4);
    for (const [x, z] of [[6.5, 20.5], [6.5, 19.5], [6.5, 23.5], [5.5, 20.5], [7.5, 22.5]]) expect(solver.mask[cell(x, z)]).toBe(0);
    // Not along the crest past where it landed, not far ahead, and not far behind.
    for (const [x, z] of [[4.5, 20.5], [8.5, 20.5], [6.5, 25.5], [6.5, 16.5]]) expect(solver.mask[cell(x, z)]).toBe(1);
    const hold = 5 * Math.sqrt(4 / GRAVITY);
    while (solver.time < 0.9 * hold) solver.step(0.05);
    expect(solver.mask[cell(6.5, 20.5)]).toBe(0);
    while (solver.time < 1.1 * hold) solver.step(0.05);
    expect(solver.mask[cell(6.5, 20.5)]).toBe(1);
  });

  // The predictor is the dispersive acceleration of the step before: in the Reef's Big swell (25°) it reached
  // −702 m²/s² in a cell that had just switched to shallow water, and pushed that cell's half step all the same.
  it('gives a cell held in shallow water none of the step before\'s dispersive push in its half step', () => {
    const grid = { nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' as const };
    const held = new BoussinesqSolver(grid, () => 4, { manning: 0, breaking: false });
    const free = new BoussinesqSolver(grid, () => 4, { manning: 0, breaking: false });
    held.holdPlunge(6.5, 20.5, 0, 1, 2);
    const cell = held.cellIndex(6.5, 20.5);
    // A lake at rest, with the push of the trace left in the predictor of one cell.
    for (const solver of [held, free]) {
      solver.predictor!.x[cell] = -700;
      solver.step(0.01);
    }
    const moved = (solver: BoussinesqSolver) => Math.max(...Array.from(solver.h, (h) => Math.abs(h - 4)));
    expect(free.mask[cell]).toBe(1);
    expect(moved(free)).toBeGreaterThan(1e-3);
    expect(held.mask[cell]).toBe(0);
    expect(moved(held)).toBeLessThan(1e-12);
    expect(Math.max(...Array.from(held.qx, Math.abs))).toBeLessThan(1e-12);
  });

  it('never holds a plunge zone behind where its jet left the crest: the void\'s face keeps its dispersion', () => {
    const grid = { nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' as const };
    const solver = new BoussinesqSolver(grid, () => 4, { manning: 0, breaking: false });
    const cell = (x: number, z: number) => solver.cellIndex(x, z);
    // From a wave 4 m high, half its height behind is 2 m; this jet left the crest only 0.4 m back.
    solver.holdPlunge(6.5, 20.5, 0, 1, 4, 0.4);
    expect(solver.plungeHold[cell(6.5, 19.5)]).toBeGreaterThan(0);
    expect(solver.plungeHold[cell(6.5, 18.5)]).toBe(0);
    expect(solver.plungeHold[cell(6.5, 26.5)]).toBeGreaterThan(0);
  });

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

  it('gives the wave number of its own dispersion', () => {
    const omega = (2 * Math.PI) / 10;
    expect(madsenSorensenWaveNumber(omega, 12)).toBeCloseTo(omega / madsenSorensenCelerity(omega, 12), 12);
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

describe('Boussinesq shoaling, refraction and groups', () => {
  it('shoals a dispersive wave by linear theory, √(c_g0 / c_g), on a gentle slope', () => {
    const depthAt = (_x: number, z: number) => (z < 200 ? 6 : z > 1100 ? 1.5 : 6 - (4.5 * (z - 200)) / 900);
    const period = 8;
    const solver = new BoussinesqSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, 1400, 1400), xBoundary: 'periodic' }, depthAt, { manning: 0, breaking: false },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(150, 0), target: airyTarget(0.015, period, 6) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(1200, 1400), target: calmTarget });
    const deepGauge = solver.cellIndex(0.5, 250.5);
    const shallowGauge = solver.cellIndex(0.5, 1050.5);
    let deepEnvelope = 0;
    let shallowEnvelope = 0;
    while (solver.time < 360) {
      solver.step(0.1);
      if (solver.time < 290) continue;
      deepEnvelope = Math.max(deepEnvelope, Math.abs(solver.surfaceAt(deepGauge)));
      shallowEnvelope = Math.max(shallowEnvelope, Math.abs(solver.surfaceAt(shallowGauge)));
    }
    const omega = (2 * Math.PI) / period;
    const expected = Math.sqrt(airyGroupSpeed(omega, depthAt(0, 250.5)) / airyGroupSpeed(omega, depthAt(0, 1050.5)));
    expect(Math.abs(shallowEnvelope / deepEnvelope / expected - 1)).toBeLessThan(0.1);
  }, 120_000);

  it("refracts an oblique wave by Snell's law over a sloping bed", () => {
    const nx = 89;
    const dx = 4;
    const period = 20;
    const omega = (2 * Math.PI) / period;
    const deep = 8;
    const shallow = 2;
    const depthAt = (_x: number, z: number) => (z < 150 ? deep : z > 350 ? shallow : deep + ((shallow - deep) * (z - 150)) / 200);
    const kx = (2 * Math.PI) / (nx * dx);
    const incident = Math.asin(kx / airyWavenumber(omega, deep));
    const solver = new BoussinesqSolver(
      { nx, xMin: 0, dx, zEdges: uniformEdges(0, 500, 125), xBoundary: 'periodic' }, depthAt, { manning: 0, breaking: false },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(100, 0), target: airyTarget(0.02, period, deep, incident) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(430, 500), target: calmTarget });
    const gaugeA = solver.cellIndex(solver.xCenters[0], 370);
    const gaugeB = solver.cellIndex(solver.xCenters[0], 410);
    const times: number[] = [];
    const seriesA: number[] = [];
    const seriesB: number[] = [];
    while (solver.time < 160) {
      solver.step(0.1);
      if (solver.time < 110) continue;
      times.push(solver.time);
      seriesA.push(solver.surfaceAt(gaugeA));
      seriesB.push(solver.surfaceAt(gaugeB));
    }
    const kz = (omega * meanLag(upCrossings(times, seriesA), upCrossings(times, seriesB))) / 40;
    const measured = (Math.atan2(kx, kz) * 180) / Math.PI;
    const expected = (Math.asin(kx / airyWavenumber(omega, shallow)) * 180) / Math.PI;
    expect(Math.abs(measured - expected)).toBeLessThan(2);
  }, 120_000);

  it('moves a wave packet at the group speed of its equations, dω/dk', () => {
    const depth = 2;
    const kh = 1.5;
    const k = kh / depth;
    const omega = k * modelCelerityAt(k, depth);
    const step = 1e-4;
    const group = ((k + step) * modelCelerityAt(k + step, depth) - (k - step) * modelCelerityAt(k - step, depth)) / (2 * step);
    const wavelength = (2 * Math.PI) / k;
    const length = 30 * wavelength;
    const solver = new BoussinesqSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, length, 30 * 40), xBoundary: 'periodic' }, () => depth, { manning: 0, breaking: false },
    );
    const period = (2 * Math.PI) / omega;
    const peak = 6 * period;
    const width = 2.5 * period;
    solver.addRelaxationZone({
      weights: solver.zoneWeightsAlongZ(2 * wavelength, 0),
      target: (_x, z, t, out) => {
        const eta = 0.001 * depth * Math.exp(-(((t - peak) / width) ** 2)) * Math.cos(k * z - omega * t);
        out.eta = eta;
        out.qx = 0;
        out.qz = (omega / k) * eta;
      },
    });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(26 * wavelength, length), target: calmTarget });
    const near = solver.cellIndex(0.5, 6 * wavelength);
    const far = solver.cellIndex(0.5, 18 * wavelength);
    const arrival = [0, 0];
    const energy = [0, 0];
    while (solver.time < peak + (22 * wavelength) / group + 3 * width) {
      solver.step(period / 40);
      [near, far].forEach((gauge, n) => {
        const e = solver.surfaceAt(gauge) ** 2;
        arrival[n] += e * solver.time;
        energy[n] += e;
      });
    }
    const measured = (12 * wavelength) / (arrival[1] / energy[1] - arrival[0] / energy[0]);
    expect(Math.abs(measured / group - 1)).toBeLessThan(0.05);
  }, 120_000);

  it('carries a solitary wave at about √(g(d + A)) without losing its height', () => {
    const depth = 1;
    const height = 0.1;
    const speed = Math.sqrt(GRAVITY * (depth + height));
    const solver = new BoussinesqSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, 60, 600), xBoundary: 'periodic' }, () => depth, { manning: 0, breaking: false },
    );
    const kappa = Math.sqrt((3 * height) / (4 * depth ** 3));
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const eta = height / Math.cosh(kappa * (solver.zCenters[iz] - 10)) ** 2;
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        solver.h[i] = depth + eta;
        solver.qz[i] = speed * eta;
      }
    }
    const crest = () => {
      let best = 0;
      for (let iz = 1; iz < solver.nz; iz += 1) if (solver.h[iz * 2] > solver.h[best * 2]) best = iz;
      const [a, b, c] = [solver.h[(best - 1) * 2], solver.h[best * 2], solver.h[(best + 1) * 2]];
      const shift = (0.5 * (a - c)) / (a - 2 * b + c);
      return { z: solver.zCenters[best] + shift * 0.1, height: b - depth };
    };
    while (solver.time < 2) solver.step(0.02);
    const start = { time: solver.time, ...crest() };
    while (solver.time < 2 + 20 / speed) solver.step(0.02);
    const end = crest();
    expect(Math.abs((end.z - start.z) / (solver.time - start.time) / speed - 1)).toBeLessThan(0.03);
    expect(Math.abs(end.height / height - 1)).toBeLessThan(0.05);
  }, 120_000);
});

describe('Boussinesq breaking', () => {
  /** A 10 s, 0.6 m wave from 5 m of water up a 1:40 plane beach, with Kennedy breaking at the plain-slope onset. */
  function planeBeach() {
    const depthAt = (_x: number, z: number) => (z < 60 ? 5 : 5 - (z - 60) / 40);
    const solver = new BoussinesqSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, 280, 560), xBoundary: 'periodic' }, depthAt, { breaking: { onset: 0.65 } },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(50, 0), target: airyTarget(0.3, 10, 5) });
    return { solver, depthAt };
  }

  it('breaks a shoaling wave where its height reaches 0.6–1.0 of the depth, never steeper than Miche before it breaks', () => {
    const { solver, depthAt } = planeBeach();
    const rows = solver.nz;
    const high = new Float64Array(rows).fill(-Infinity);
    const low = new Float64Array(rows).fill(Infinity);
    const broke = new Float64Array(rows);
    const touched = new Float64Array(rows);
    let finite = true;
    while (solver.time < 160) {
      solver.step(0.05);
      if (solver.time < 110) continue;
      for (let iz = 0; iz < rows; iz += 1) {
        const i = iz * solver.nx;
        const surface = solver.surfaceAt(i);
        finite &&= Number.isFinite(surface);
        high[iz] = Math.max(high[iz], surface);
        low[iz] = Math.min(low[iz], surface);
        if (solver.breakingStrength[i] > 0.3) broke[iz] = 1;
        // Breaking by eddy viscosity, or a crest high enough to switch to shallow water (a shock-captured front).
        if (solver.breakingStrength[i] > 0 || (solver.h[i] > 0.05 && solver.mask[i] === 0)) touched[iz] = 1;
      }
    }
    expect(finite).toBe(true);
    let onset = -1;
    for (let iz = 0; iz < rows; iz += 1) {
      if (solver.zCenters[iz] > 60 && broke[iz] > 0) {
        onset = iz;
        break;
      }
    }
    expect(onset).toBeGreaterThan(0);
    const depth = depthAt(0, solver.zCenters[onset]);
    expect((high[onset] - low[onset]) / depth).toBeGreaterThan(0.6);
    expect((high[onset] - low[onset]) / depth).toBeLessThan(1.0);
    const omega = (2 * Math.PI) / 10;
    for (let iz = 0; iz < onset; iz += 1) {
      if (touched[iz] > 0) continue;
      const d = depthAt(0, solver.zCenters[iz]);
      const k = airyWavenumber(omega, d);
      const limit = (0.142 * Math.tanh(k * d) * 2 * Math.PI) / k;
      expect(high[iz] - low[iz]).toBeLessThan(1.1 * limit);
    }
  }, 120_000);

  // A long straight crest breaks along its whole length at once, oblique or not: its parents behind the face carry the
  // same age as the cells beside it, so carrying the age from behind the face (breakingAge.ts) leaves it as it was.
  for (const degrees of [20, 40]) {
    it(`breaks an oblique shoaling wave at ${degrees}° where its height reaches 0.6–1.0 of the depth`, () => {
      const period = 10;
      const omega = (2 * Math.PI) / period;
      const angle = (degrees * Math.PI) / 180;
      // One along-shore wavelength wide in 50 columns (about 4 m at 20°, 2 m at 40°: at 4 m a 40° crest was too coarse to
      // steepen), so the periodic window holds an endless straight crest.
      const nx = 50;
      const dx = (2 * Math.PI) / (airyWavenumber(omega, 5) * Math.sin(angle)) / nx;
      const incident = angle;
      const depthAt = (_x: number, z: number) => (z < 60 ? 5 : 5 - (z - 60) / 40);
      const solver = new BoussinesqSolver(
        { nx, xMin: 0, dx, zEdges: uniformEdges(0, 280, 560), xBoundary: 'periodic' }, depthAt, { breaking: { onset: 0.65 } },
      );
      solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(50, 0), target: airyTarget(0.3, period, 5, incident) });
      const rows = solver.nz;
      const high = new Float64Array(rows).fill(-Infinity);
      const low = new Float64Array(rows).fill(Infinity);
      const broke = new Float64Array(rows);
      let finite = true;
      while (solver.time < 160) {
        solver.step(0.05);
        if (solver.time < 110) continue;
        for (let iz = 0; iz < rows; iz += 1) {
          const i = iz * solver.nx;
          const surface = solver.surfaceAt(i);
          finite &&= Number.isFinite(surface);
          high[iz] = Math.max(high[iz], surface);
          low[iz] = Math.min(low[iz], surface);
          if (solver.breakingStrength[i] > 0.3) broke[iz] = 1;
        }
      }
      expect(finite).toBe(true);
      const onset = solver.zCenters.findIndex((z, iz) => z > 60 && broke[iz] > 0);
      expect(onset).toBeGreaterThan(0);
      const depth = depthAt(0, solver.zCenters[onset]);
      expect((high[onset] - low[onset]) / depth).toBeGreaterThan(0.6);
      expect((high[onset] - low[onset]) / depth).toBeLessThan(1.0);
    }, 900_000);
  }

  // A breaking event is carried with its wave (Kennedy et al. 2000: the age of the breaking event), from behind its front
  // face, never along its crest (breakingAge.ts): inherited from any neighbour, breaking ran along a crest as a fuse at
  // the grid's speed (the Padang Padang probes: about 90 % of a reef's onsets were inherited; it peeled at 2–5 times
  // phase matching). The face's downslope sets the way, not the flux, which runs seaward in a trough and in backwash.
  it('carries a breaking age from behind its front face to the cells ahead, never along its crest', () => {
    const depth = 3;
    const solver = new BoussinesqSolver({ nx: 20, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' }, () => depth, { breaking: { onset: 0.65 } });
    const state = solver as unknown as {
      breakingStrength: Float64Array; breakingAge: Float64Array; rateH: Float64Array; halfEta: Float64Array; qx: Float64Array; qz: Float64Array;
      still: Float64Array; breakingTerms(dt: number): void;
    };
    // The still depth a step would have refreshed.
    state.still.fill(depth);
    /** One old breaking cell on a face sloping up toward (upX, upZ), every cell rising at 0.4 √(g h): past the end threshold (0.15), short of the onset (0.65). */
    const run = (upX: number, upZ: number, flowX = 0, flowZ = 0) => {
      state.rateH.fill(0.4 * Math.sqrt(GRAVITY * depth));
      for (let i = 0; i < state.halfEta.length; i += 1) {
        state.halfEta[i] = 0.05 * (upX * solver.xCenters[i % solver.nx] + upZ * solver.zCenters[Math.floor(i / solver.nx)]);
      }
      state.qx.fill(flowX);
      state.qz.fill(flowZ);
      state.breakingStrength.fill(0);
      state.breakingAge.fill(0);
      const centre = 20 * solver.nx + 10;
      state.breakingStrength[centre] = 1;
      state.breakingAge[centre] = 10;
      state.breakingTerms(0.01);
      return (dx: number, dz: number) => state.breakingStrength[centre + dz * solver.nx + dx];
    };
    // Running +z (the face sloping up toward −z): the cells ahead, and diagonally ahead, carry the event on.
    const shoreward = run(0, -1);
    expect(shoreward(0, 0)).toBeGreaterThan(0);
    expect(shoreward(0, 1)).toBeGreaterThan(0);
    expect(shoreward(-1, 1)).toBeGreaterThan(0);
    expect(shoreward(1, 1)).toBeGreaterThan(0);
    // Beside it along the crest, and behind it, nothing.
    expect(shoreward(-1, 0)).toBe(0);
    expect(shoreward(1, 0)).toBe(0);
    expect(shoreward(0, -1)).toBe(0);
    // The same face in backwash (the flux seaward): the face, not the flux, sets the way.
    const backwash = run(0, -1, 0, -1.5);
    expect(backwash(0, 1)).toBeGreaterThan(0);
    expect(backwash(0, -1)).toBe(0);
    expect(backwash(1, 0)).toBe(0);
    // Running −x (the face sloping up toward +x): along z is along the crest.
    const alongShore = run(1, 0);
    expect(alongShore(-1, 0)).toBeGreaterThan(0);
    expect(alongShore(1, 0)).toBe(0);
    expect(alongShore(0, 1)).toBe(0);
    expect(alongShore(0, -1)).toBe(0);
    // No face, no parent: only the breaking cell itself carries on.
    const flat = run(0, 0);
    expect(flat(0, 0)).toBeGreaterThan(0);
    expect(flat(0, 1)).toBe(0);
    expect(flat(1, 0)).toBe(0);
  });

  it('runs a breaking wave up a dry beach without negative depth or non-finite state', () => {
    const depthAt = (_x: number, z: number) => (z < 0 ? 4 : 4 - 0.05 * z);
    const solver = new BoussinesqSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(-60, 120, 180), xBoundary: 'periodic' }, depthAt, { breaking: { onset: 0.65 } },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(-20, -60), target: longWaveTarget(0.3, 10, 4) });
    let shallowest = Infinity;
    let highestWetZ = -Infinity;
    let finite = true;
    while (solver.time < 60) {
      solver.step(1 / 30);
      for (let i = 0; i < solver.h.length; i += 1) {
        finite &&= Number.isFinite(solver.h[i]) && Number.isFinite(solver.qz[i]);
        shallowest = Math.min(shallowest, solver.h[i]);
        if (solver.h[i] > 0.01) highestWetZ = Math.max(highestWetZ, solver.zCenters[Math.floor(i / solver.nx)]);
      }
    }
    expect(finite).toBe(true);
    expect(shallowest).toBeGreaterThanOrEqual(0);
    expect(highestWetZ).toBeGreaterThan(80);
  }, 60_000);

  it('never gains energy in a closed basin', () => {
    const depth = 2;
    const solver = new BoussinesqSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 200), xBoundary: 'periodic' }, () => depth, { breaking: { onset: 0.65 } },
    );
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] = depth + 0.3 * Math.cos((3 * Math.PI * solver.zCenters[iz]) / 40);
    }
    const start = solver.totalEnergy();
    let largest = start;
    while (solver.time < 60) {
      solver.step(1 / 30);
      largest = Math.max(largest, solver.totalEnergy());
    }
    expect(largest / start).toBeLessThan(1.005);
    expect(solver.totalEnergy()).toBeLessThan(start);
  }, 60_000);
});

describe('Boussinesq surf zone beds', () => {
  it('keeps a lake at rest over every spot, dry shoreline included, with breaking on', () => {
    for (const name of ['beach', 'point', 'reef', 'canyon', 'padang'] as const) {
      const spot = createSpot(name, 1);
      const solver = new BoussinesqSolver(
        { nx: 40, xMin: -80, dx: 4, zEdges: uniformEdges(-300, 30, 110) }, spot.depthAt, { waterLevel: 0.3, breaking: { onset: 0.65 } },
      );
      const initialDepth = Float64Array.from(solver.h);
      for (let frame = 0; frame < 120; frame += 1) solver.step(1 / 15);
      let largestFlow = 0;
      let depthChange = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        largestFlow = Math.max(largestFlow, Math.abs(solver.qx[i]), Math.abs(solver.qz[i]));
        depthChange = Math.max(depthChange, Math.abs(solver.h[i] - initialDepth[i]));
      }
      expect(largestFlow, name).toBeLessThan(1e-9);
      expect(depthChange, name).toBeLessThan(1e-9);
    }
  });

  it('follows the bed as the window slides across the headland', () => {
    const spot = createSpot('point', 1);
    const solver = new BoussinesqSolver(
      { nx: 30, xMin: -200, dx: 4, zEdges: uniformEdges(-200, 20, 55), xBoundary: 'open' }, spot.depthAt, { waterLevel: 0.2, breaking: { onset: 0.65 } },
    );
    for (let move = 0; move < 40; move += 1) {
      solver.step(1 / 15);
      solver.shiftAlongShore(move % 3 === 2 ? -1 : 3);
    }
    solver.step(1 / 15);
    let largestFlow = 0;
    let stillError = 0;
    for (let i = 0; i < solver.h.length; i += 1) {
      largestFlow = Math.max(largestFlow, Math.abs(solver.qx[i]), Math.abs(solver.qz[i]));
      stillError = Math.max(stillError, Math.abs(solver.still[i] - Math.max(0, 0.2 - solver.bed[i])));
    }
    expect(solver.xCenters[0]).toBeGreaterThan(0);
    expect(largestFlow).toBeLessThan(1e-9);
    expect(stillError).toBe(0);
  });

  it('carries its breaking and predictor state with the water when the window slides', () => {
    const solver = new BoussinesqSolver(
      { nx: 20, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' }, () => 3, { breaking: { onset: 0.65 } },
    );
    const state = solver as unknown as { breakingStrength: Float64Array; breakingAge: Float64Array; predictorX: Float64Array; predictorZ: Float64Array };
    for (let i = 0; i < solver.h.length; i += 1) {
      const column = i % solver.nx;
      state.breakingStrength[i] = column / 20;
      state.breakingAge[i] = column;
      state.predictorX[i] = column * 2;
      state.predictorZ[i] = column * 3;
    }
    solver.shiftAlongShore(3);
    const row = 5 * solver.nx;
    // The column that was 3 is now column 0, and so on; new columns start quiet.
    expect(state.breakingAge[row]).toBe(3);
    expect(state.breakingStrength[row + 4]).toBeCloseTo(7 / 20, 12);
    expect(state.predictorX[row + 10]).toBe(26);
    expect(state.predictorZ[row + 16]).toBe(57);
    expect(state.breakingAge[row + 19]).toBe(0);
    expect(state.predictorX[row + 17]).toBe(0);
  });

  it('moves a plunge zone with the water when the window slides', () => {
    const solver = new BoussinesqSolver({ nx: 20, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' }, () => 3);
    solver.holdPlunge(10.5, 20.5, 0, 1, 0);
    const row = 20 * solver.nx;
    expect(solver.plungeHold[row + 10]).toBeGreaterThan(0);
    solver.shiftAlongShore(3);
    // The column that was 10 is now column 7.
    expect(solver.plungeHold[row + 7]).toBeGreaterThan(0);
    expect(solver.plungeHold[row + 10]).toBe(0);
  });
});


describe('Boussinesq open along-shore edges', () => {
  /** The Canyon's wall across both open edges, each 30 m (one half-width) from the axis: 8.2 m deep and a 0.34 slope there. */
  const canyonWalls = (x: number) => 3 + 14 * Math.exp(-(((x - 30) / 30) ** 2));
  const grid = { nx: 60, xMin: 0, dx: 1, zEdges: uniformEdges(0, 200, 50), xBoundary: 'open' as const };

  it('keeps a lake at rest over a bed sloping steeply across the open edges', () => {
    const solver = new BoussinesqSolver(grid, canyonWalls, { breaking: { onset: 0.65 } });
    const initialDepth = Float64Array.from(solver.h);
    for (let frame = 0; frame < 300; frame += 1) solver.step(1 / 30);
    let largestFlow = 0;
    let depthChange = 0;
    for (let i = 0; i < solver.h.length; i += 1) {
      largestFlow = Math.max(largestFlow, Math.abs(solver.qx[i]), Math.abs(solver.qz[i]));
      depthChange = Math.max(depthChange, Math.abs(solver.h[i] - initialDepth[i]));
    }
    expect(largestFlow).toBeLessThan(1e-9);
    expect(depthChange).toBeLessThan(1e-9);
  });

  it('stays bounded for 90 s while an oblique wave train leaves across a bed sloping steeply across the open edges', () => {
    const solver = new BoussinesqSolver(grid, canyonWalls, { breaking: false });
    const edgeDepth = canyonWalls(0);
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(40, 0), target: longWaveTarget(0.5, 10, edgeDepth, (10 * Math.PI) / 180) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(160, 200), target: calmTarget });
    // Twice the linear orbital speed a √(g/d) at the edges.
    const bound = 2 * 0.5 * Math.sqrt(GRAVITY / edgeDepth);
    let fastest = 0;
    while (solver.time < 90 && fastest < bound) {
      solver.step(1 / 30);
      for (let i = 0; i < solver.h.length; i += 1) {
        const speed = Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i];
        if (!(speed <= fastest)) fastest = speed;
      }
    }
    expect(fastest).toBeLessThan(bound);
    expect(solver.time).toBeGreaterThan(90 - 1e-9);
  }, 60_000);
});

describe('Boussinesq stability guards', () => {
  // The Reef's biggest seas pinned a thin dispersing cell's flux to its held neighbours' through the P/Q recovery,
  // and u = P/h ran away (hundreds of m/s in 0.5–3 m of water). FUNWAVE-TVD caps the Froude number where it
  // recovers the velocity (FroudeCap, 5–10; Shi et al. 2011, CACR-11-04).
  it('caps a wet cell\'s speed at ten times its shallow-water wave speed', () => {
    const grid = { nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' as const };
    const solver = new BoussinesqSolver(grid, () => 4, { manning: 0, breaking: false });
    const cell = solver.cellIndex(6.5, 20.5);
    // 100 m/s in 4 m of water, where ten wave speeds are 62.6 m/s.
    solver.qx[cell] = 4 * 100;
    solver.step(1e-4);
    const limit = 10 * Math.sqrt(GRAVITY * solver.h[cell]);
    expect(Math.hypot(solver.qx[cell], solver.qz[cell]) / solver.h[cell]).toBeLessThanOrEqual(limit * (1 + 1e-9));
    expect(solver.froudeCaps).toBe(1);
  });

  // FUNWAVE-TVD's cap never sees a cell under its 1 cm wet depth (MinDepth); the solver's friction governs those.
  it('leaves water under a centimetre deep uncapped', () => {
    const grid = { nx: 12, xMin: 0, dx: 1, zEdges: uniformEdges(0, 40, 40), xBoundary: 'open' as const };
    const solver = new BoussinesqSolver(grid, () => 0.005, { manning: 0, breaking: false });
    const cell = solver.cellIndex(6.5, 20.5);
    // 20 m/s in 5 mm of water: nine times the cap of 2.2 m/s, but too thin to count.
    solver.qx[cell] = 0.005 * 20;
    solver.step(1e-6);
    expect(solver.froudeCaps).toBe(0);
  });
});
