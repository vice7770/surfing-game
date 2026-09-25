import { describe, expect, it } from 'vitest';
import { sampleSurfaceNormal } from '../scene/WaterSurface';
import { waveNumber } from '../wave/dispersion';
import { ShallowWaterSolver, uniformEdges } from '../wave/ShallowWaterSolver';
import { SurfZoneSimulation, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { SEAWATER_DENSITY, PhysicalSurfWater, catmullRomWeights } from './PhysicalSurfWater';
import { createWaterSample } from './SurfWater';

const config: SurfZoneConfig = {
  spot: 'point', seed: 3, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 8, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};

/** A flat 3 m channel with a steady 1 m/s current and nothing breaking. */
function channel(depth = 3, current = 1) {
  const solver = new ShallowWaterSolver({ nx: 20, xMin: -10, dx: 1, zEdges: uniformEdges(-10, 10, 20), xBoundary: 'open' }, () => depth);
  for (let i = 0; i < solver.h.length; i += 1) solver.qx[i] = solver.h[i] * current;
  const breaking = new Float64Array(solver.h.length);
  return { solver, breaking, water: new PhysicalSurfWater(solver, { peakPeriod: 10, breaking }) };
}

describe('Catmull-Rom weights', () => {
  it('interpolate the nodes, sum to one and reproduce a straight line', () => {
    catmullRomWeights(0).forEach((weight, i) => expect(weight).toBeCloseTo([0, 1, 0, 0][i], 12));
    for (const t of [0.13, 0.5, 0.87]) {
      const w = catmullRomWeights(t);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      expect(w[0] * -1 + w[1] * 0 + w[2] * 1 + w[3] * 2).toBeCloseTo(t, 12);
    }
  });
});

describe('PhysicalSurfWater', () => {
  it('agrees with the rendered surface and its shading normal at every render node', () => {
    const simulation = new SurfZoneSimulation(config);
    for (let step = 0; step < 120; step += 1) simulation.step(1 / 60);
    const water = PhysicalSurfWater.forSimulation(simulation);
    const grid = simulation.renderGrid(1);
    const render = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(render, grid);
    const out = createWaterSample();
    let checked = 0;
    for (let r = 2; r < grid.nz - 2; r += 7) {
      for (let c = 2; c < grid.nx - 2; c += 5) {
        const x = grid.xMin + c * grid.spacing;
        const z = grid.zMin + r * grid.spacing;
        water.sampleAt(x, 0, z, out);
        expect(out.surfaceY).toBeCloseTo(render[(r * grid.nx + c) * 2], 5);
        const normal = sampleSurfaceNormal(render, grid, x, z);
        expect(out.normalX).toBeCloseTo(normal.x, 4);
        expect(out.normalZ).toBeCloseTo(normal.z, 4);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('keeps the surface slope continuous across node lines, so contact forces do not jump', () => {
    const simulation = new SurfZoneSimulation(config);
    for (let step = 0; step < 120; step += 1) simulation.step(1 / 60);
    const water = PhysicalSurfWater.forSimulation(simulation);
    const out = createWaterSample();
    for (const [x, z] of [[3, -70.4], [-6, -100.2], [11, -40.7]]) {
      const left = water.sampleAt(x - 1e-7, 0, z, out).slopeX;
      const right = water.sampleAt(x + 1e-7, 0, z, out).slopeX;
      expect(Math.abs(right - left)).toBeLessThan(1e-5);
    }
  });

  // Plan §1.10: u(z)/ū = kh cosh k(z + h) / sinh kh, whose depth average is 1.
  it('reshapes the depth-averaged current with the linear profile, keeping its mean', () => {
    const { water, solver } = channel();
    const out = createWaterSample();
    const bed = solver.bed[0];
    let sum = 0;
    const layers = 400;
    for (let k = 0; k < layers; k += 1) sum += water.sampleAt(0.2, bed + ((k + 0.5) / layers) * 3, 0.3, out).flowX;
    expect(sum / layers).toBeCloseTo(1, 4);
    const kh = waveNumber((2 * Math.PI) / 10, 3) * 3;
    water.sampleAt(0.2, 5, 0.3, out);
    expect(out.regime).toBe('profile');
    expect(out.flowX).toBeCloseTo(kh / Math.tanh(kh), 9);
    expect(water.sampleAt(0.2, bed - 2, 0.3, out).flowX).toBeCloseTo(kh / Math.sinh(kh), 9);
    expect(out.flowY).toBe(0);
    expect(out.wet).toBe(true);
    expect(out.stillDepth).toBeCloseTo(3, 12);
  });

  it('keeps the depth-averaged current in bores and very shallow water, and none on dry land', () => {
    const { water, breaking, solver } = channel();
    const out = createWaterSample();
    breaking.fill(0.5);
    water.sampleAt(0.2, 0, 0.3, out);
    expect(out.regime).toBe('bore');
    expect(out.flowX).toBeCloseTo(1, 12);
    const shallow = channel(0.004 * 9.81 * 100 / (2 * Math.PI) ** 2 * 0.5).water;
    expect(shallow.sampleAt(0.2, 0, 0.3, out).regime).toBe('shallow');
    solver.h.fill(0.001);
    water.sampleAt(0.2, 0, 0.3, out);
    expect(out.wet).toBe(false);
    expect(out.regime).toBe('dry');
    expect([out.flowX, out.flowY, out.flowZ]).toEqual([0, 0, 0]);
    expect(Number.isFinite(out.surfaceY)).toBe(true);
  });

  it('reconstructs rising water from the flow converging on a point', () => {
    const { water, solver } = channel();
    // qx falls along +x at 0.2 m²/s per metre, so water piles up at 0.2 m/s.
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) solver.qx[iz * solver.nx + ix] = 3 - 0.2 * solver.xCenters[ix];
    }
    const out = createWaterSample();
    const surface = water.sampleAt(0.1, 5, 0.3, out).flowY;
    expect(surface).toBeCloseTo(0.2, 6);
    expect(water.sampleAt(0.1, solver.bed[0], 0.3, out).flowY).toBeCloseTo(0, 9);
  });

  it('says when a point lies beyond the simulated window', () => {
    const { water } = channel();
    const out = createWaterSample();
    for (const [x, z] of [[-10.5, 0], [10.5, 0], [0, -10.5], [0, 10.5]]) {
      water.sampleAt(x, 0, z, out);
      expect(out.outsideDomain).toBe(true);
      expect(out.regime).toBe('outside');
    }
    expect(water.sampleAt(0, 0, 0, out).outsideDomain).toBe(false);
  });

  it('gives the water the opposite of the body’s impulse, conserving momentum', () => {
    const { water, solver } = channel();
    const momentum = (values: Float64Array) => {
      let total = 0;
      for (let iz = 0; iz < solver.nz; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) total += values[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
      return total * SEAWATER_DENSITY;
    };
    const before = { x: momentum(solver.qx), z: momentum(solver.qz) };
    water.addReaction(0.3, -2.7, 150, 900, -60);
    expect(momentum(solver.qx) - before.x).toBeCloseTo(-150, 6);
    expect(momentum(solver.qz) - before.z).toBeCloseTo(60, 6);
    expect(water.unappliedVerticalImpulse).toBe(900);
  });
});
