import { describe, expect, it } from 'vitest';
import { GRAVITY } from './dispersion';
import { FOAM_SOURCE_RATE, FoamField, boreDissipation, type FoamDecay } from './FoamField';
import { ShallowWaterSolver, stretchedEdges, uniformEdges } from './ShallowWaterSolver';

const lasting: FoamDecay = { dense: 1e9, residual: 1e9 };

function flatSolver(zEdges: ArrayLike<number> = uniformEdges(-40, 40, 80), stillDepth = 2): ShallowWaterSolver {
  return new ShallowWaterSolver({ nx: 80, xMin: -40, dx: 1, zEdges, xBoundary: 'open' }, () => stillDepth);
}

/** Set a steady current without stepping the solver: the foam only reads h, qx and qz. */
function setFlow(solver: ShallowWaterSolver, u: number, w: number): void {
  for (let i = 0; i < solver.h.length; i += 1) {
    solver.qx[i] = solver.h[i] * u;
    solver.qz[i] = solver.h[i] * w;
  }
}

function placeBlob(foam: FoamField, solver: ShallowWaterSolver, x0: number, z0: number): void {
  for (let iz = 0; iz < solver.nz; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) {
      const r2 = (solver.xCenters[ix] - x0) ** 2 + (solver.zCenters[iz] - z0) ** 2;
      foam.dense[iz * solver.nx + ix] = 0.8 * Math.exp(-r2 / (2 * 2 ** 2));
    }
  }
}

/** Area-weighted total and centroid of the dense foam. */
function moments(foam: FoamField, solver: ShallowWaterSolver) {
  let total = 0;
  let x = 0;
  let z = 0;
  for (let iz = 0; iz < solver.nz; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) {
      const mass = foam.dense[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
      total += mass;
      x += mass * solver.xCenters[ix];
      z += mass * solver.zCenters[iz];
    }
  }
  return { total, x: x / total, z: z / total };
}

const run = (foam: FoamField, solver: ShallowWaterSolver, seconds: number, dt = 1 / 30) => {
  const calm = new Float64Array(solver.h.length);
  for (let step = 0; step < Math.round(seconds / dt); step += 1) foam.update(dt, calm);
};

describe('FoamField', () => {
  it('carries foam with a uniform current and keeps its amount', () => {
    const solver = flatSolver();
    setFlow(solver, 1, 0);
    const foam = new FoamField(solver, lasting);
    placeBlob(foam, solver, -10, 0);
    const before = moments(foam, solver);
    run(foam, solver, 5);
    const after = moments(foam, solver);
    expect(after.x).toBeCloseTo(-5, 0);
    expect(Math.abs(after.x + 5)).toBeLessThan(0.2);
    expect(Math.abs(after.z - before.z)).toBeLessThan(1e-6);
    expect(Math.abs(after.total / before.total - 1)).toBeLessThan(0.05);
  });

  it('carries foam across rows of different size', () => {
    const solver = flatSolver(stretchedEdges(-60, 20, -10, 1, 4));
    setFlow(solver, 0, 0.8);
    const foam = new FoamField(solver, lasting);
    // From the graded cells offshore of the 1 m zone into it; 3–4 m cells would blur a 2 m blob.
    placeBlob(foam, solver, 0, -13);
    const before = moments(foam, solver);
    run(foam, solver, 5);
    const after = moments(foam, solver);
    expect(Math.abs(after.z - before.z - 4)).toBeLessThan(0.2);
    expect(Math.abs(after.total / before.total - 1)).toBeLessThan(0.05);
  });

  it('decays dense whitewater quickly into a lace that lasts longer', () => {
    const solver = flatSolver();
    const foam = new FoamField(solver, { dense: 3, residual: 20 });
    const cell = 40 * solver.nx + 40;
    foam.dense[cell] = 0.6;
    const calm = new Float64Array(solver.h.length);
    let lacePeak = 0;
    let t = 0;
    for (; t < 30 - 1e-9; t += 0.1) {
      foam.update(0.1, calm);
      lacePeak = Math.max(lacePeak, foam.residual[cell]);
    }
    expect(foam.dense[cell]).toBeCloseTo(0.6 * Math.exp(-30 / 3), 12);
    expect(lacePeak).toBeGreaterThan(0.05);
    const lace = foam.residual[cell];
    for (let s = 0; s < 10; s += 1) foam.update(0.1, calm);
    expect(foam.residual[cell] / lace).toBeCloseTo(Math.exp(-1 / 20), 3);
    expect(foam.totalAt(cell)).toBeLessThanOrEqual(1);
  });

  // Hydraulic-jump head loss ΔH = Δh³/(4 h₁ h₂), bore speed c = √(g h₂ (h₁ + h₂)/(2 h₁)), discharge q = c h₁.
  it('measures a bore’s dissipation from its head loss', () => {
    const speed = Math.sqrt((GRAVITY * 1.5 * 2.5) / 2);
    expect(boreDissipation(1, 1.5)).toBeCloseTo(GRAVITY * speed * 1 * (0.5 ** 3 / (4 * 1 * 1.5)), 12);
    expect(boreDissipation(1, 1.2)).toBeLessThan(boreDissipation(1, 1.5));
    expect(boreDissipation(1, 2)).toBeGreaterThan(boreDissipation(1, 1.5));
    expect(boreDissipation(1, 1)).toBe(0);
    expect(boreDissipation(1, 0.8)).toBe(0);
    expect(boreDissipation(0, 0.5)).toBe(0);
  });

  it('makes foam where bores break, in proportion to their dissipation, and none on dry sand', () => {
    const solver = flatSolver(uniformEdges(-40, 40, 80), 1);
    const foam = new FoamField(solver, lasting);
    const breaking = new Float64Array(solver.h.length);
    const big = 40 * solver.nx + 10;
    const small = 40 * solver.nx + 30;
    const calm = 40 * solver.nx + 50;
    const dry = 40 * solver.nx + 70;
    solver.h[big] = 1.25;
    solver.h[small] = 1.1;
    solver.h[calm] = 1.5;
    solver.h[dry] = 0.005;
    breaking[big] = 1;
    breaking[small] = 1;
    breaking[dry] = 1;
    foam.dense[dry] = 0.5;
    foam.update(0.1, breaking);
    expect(foam.dense[big]).toBeCloseTo(FOAM_SOURCE_RATE * 0.1, 9);
    expect(foam.dense[small]).toBeCloseTo((FOAM_SOURCE_RATE * 0.1 * boreDissipation(1, 1.1)) / boreDissipation(1, 1.25), 9);
    expect(foam.dense[calm]).toBe(0);
    expect(foam.totalAt(dry)).toBe(0);
    expect(foam.source[big]).toBeCloseTo(FOAM_SOURCE_RATE, 9);
    expect(foam.source[calm]).toBe(0);
  });

  it('saturates the cell a lip splashes into', () => {
    const solver = flatSolver();
    const foam = new FoamField(solver, lasting);
    foam.addSplash(0.2, 0.3, 0.1);
    const cell = solver.cellIndex(0.2, 0.3);
    expect(foam.dense[cell]).toBe(1);
    expect(foam.dense[cell + 1]).toBe(0);
    expect(foam.dense[cell + solver.nx]).toBe(0);
  });

  it('keeps foam on the same water when the window slides along shore', () => {
    const solver = flatSolver();
    const foam = new FoamField(solver, lasting);
    placeBlob(foam, solver, 0, 0);
    const before = moments(foam, solver);
    solver.shiftAlongShore(3);
    run(foam, solver, 1 / 30);
    const after = moments(foam, solver);
    expect(after.x).toBeCloseTo(before.x, 6);
    // Only the blob's sub-1e-6 tails are flushed.
    expect(after.total).toBeCloseTo(before.total, 3);
  });
});
