import { describe, expect, it } from 'vitest';
import { AERATION, AerationField } from './AerationField';
import { GRAVITY } from './dispersion';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';

const DENSITY = 1025;

function flatSolver(stillDepth = 2): ShallowWaterSolver {
  return new ShallowWaterSolver({ nx: 40, xMin: -20, dx: 1, zEdges: uniformEdges(-20, 20, 40), xBoundary: 'open' }, () => stillDepth);
}

function setFlow(solver: ShallowWaterSolver, u: number, w: number): void {
  for (let i = 0; i < solver.h.length; i += 1) {
    solver.qx[i] = solver.h[i] * u;
    solver.qz[i] = solver.h[i] * w;
  }
}

/** Air volume over the grid, m³, and its centroid. */
function moments(field: AerationField, solver: ShallowWaterSolver) {
  let total = 0;
  let x = 0;
  for (let iz = 0; iz < solver.nz; iz += 1) {
    for (let ix = 0; ix < solver.nx; ix += 1) {
      const volume = field.air[iz * solver.nx + ix] * solver.dx * solver.dz[iz];
      total += volume;
      x += volume * solver.xCenters[ix];
    }
  }
  return { total, x: total > 0 ? x / total : 0 };
}

describe('the aeration field', () => {
  it('entrains β of a plunge’s energy as work against buoyancy, down to half its penetration on average', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    const energy = 900;
    const penetration = 1.2;
    field.addPlunge(0.5, 0.5, energy, penetration);
    const cell = solver.cellIndex(0.5, 0.5);
    const volume = field.air[cell] * solver.dx * solver.dz[Math.floor(cell / solver.nx)];
    expect(volume * DENSITY * GRAVITY * (penetration / 2)).toBeCloseTo(AERATION.share * energy, 6);
    expect(field.depth[cell]).toBeCloseTo(penetration, 12);
  });

  it('never plunges deeper than the water', () => {
    const field = new AerationField(flatSolver(0.5));
    field.addPlunge(0.5, 0.5, 900, 1.2);
    expect(field.depth[flatSolver(0.5).cellIndex(0.5, 0.5)]).toBeCloseTo(0.5, 12);
  });

  it('degasses as its bubbles rise out of the plume', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    field.addAir(0.5, 0.5, 0.2, 1);
    const cell = solver.cellIndex(0.5, 0.5);
    const start = field.air[cell];
    for (let k = 0; k < 30; k += 1) field.update(1 / 30);
    expect(field.air[cell]).toBeCloseTo(start * Math.exp(-AERATION.riseSpeed / 1), 6);
  });

  it('holds air longer the deeper the plunge drove it', () => {
    const solver = flatSolver();
    const deep = new AerationField(solver);
    const shallow = new AerationField(solver);
    deep.addAir(0.5, 0.5, 0.1, 1.5);
    shallow.addAir(0.5, 0.5, 0.1, 0.3);
    for (let k = 0; k < 30; k += 1) {
      deep.update(1 / 30);
      shallow.update(1 / 30);
    }
    const cell = solver.cellIndex(0.5, 0.5);
    expect(deep.air[cell]).toBeGreaterThan(shallow.air[cell]);
  });

  it('is carried by the current, and keeps its air on the same water when the window slides', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    field.addAir(0.5, 0.5, 0.2, 1);
    setFlow(solver, 1, 0);
    const before = moments(field, solver);
    for (let k = 0; k < 30; k += 1) field.update(1 / 30);
    const moved = moments(field, solver);
    expect(moved.x - before.x).toBeCloseTo(1, 1);
    setFlow(solver, 0, 0);
    solver.shiftAlongShore(3);
    field.update(1e-9);
    expect(moments(field, solver).x).toBeCloseTo(moved.x, 6);
  });

  it('holds no air on dry cells, and never more air than plume', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    field.addAir(0.5, 0.5, 50, 0.5);
    const cell = solver.cellIndex(0.5, 0.5);
    expect(field.voidFraction(cell)).toBeLessThanOrEqual(1);
    solver.h[cell] = 0;
    field.update(1 / 30);
    expect(field.air[cell]).toBe(0);
    expect(field.voidFraction(cell)).toBe(0);
  });

  it('aerates a bore by its dissipation, shallower than a plunge', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    const cell = solver.cellIndex(0.5, 0.5);
    field.addBore(cell, 0.114, 0.25, 1);
    expect(field.air[cell]).toBeGreaterThan(0);
    expect(field.depth[cell]).toBeCloseTo(AERATION.boreDepth * 0.25, 12);
  });
});
