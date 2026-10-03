import { describe, expect, it } from 'vitest';
import { AERATION, AerationField, TURBULENCE } from './AerationField';
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
    expect(moments(field, solver).total * DENSITY * GRAVITY * (penetration / 2)).toBeCloseTo(AERATION.share * energy, 6);
    expect(field.depth[cell]).toBeCloseTo(penetration, 12);
  });

  it('spreads a plunge’s or a tube’s air over a plume as wide as it is deep, keeping all of it', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    field.addAir(0.5, 0.5, 0.3, 1.2);
    expect(moments(field, solver).total).toBeCloseTo(0.3, 12);
    // Every cell within the plume's radius holds the same air per square metre; none beyond it holds any.
    const inside = [solver.cellIndex(0.5, 0.5), solver.cellIndex(1.5, 0.5), solver.cellIndex(0.5, -0.5)];
    for (const cell of inside) {
      expect(field.air[cell]).toBeCloseTo(field.air[inside[0]], 12);
      expect(field.depth[cell]).toBeCloseTo(1.2, 12);
    }
    expect(field.air[solver.cellIndex(2.5, 0.5)]).toBe(0);
    expect(field.air[solver.cellIndex(0.5, 0.5)]).toBeLessThan(0.3 / 4);
  });

  it('holds no air from a plunge or a tube past the window\'s open edge', () => {
    // The grid's lookup would put all of it in the edge column (x 19.5), lightening the water under a rider there.
    const solver = flatSolver();
    const field = new AerationField(solver);
    field.addPlunge(22.4, 0.5, 900, 1.2);
    field.addAir(-22.4, 0.5, 0.3, 1.2);
    expect(moments(field, solver).total).toBe(0);
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
    expect(moments(deep, solver).total).toBeGreaterThan(moments(shallow, solver).total);
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
    // The columns the window brought in start clear.
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = solver.nx - 3; ix < solver.nx; ix += 1) expect(field.air[iz * solver.nx + ix]).toBe(0);
    }
  });

  it('puts air added just after the window slides where it belongs, not shifted a second time', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    solver.shiftAlongShore(3);
    field.addAir(0.5, 0.5, 0.2, 1);
    field.update(1e-9);
    expect(moments(field, solver).x).toBeCloseTo(0.5, 6);
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

  it('holds no more than the measured peak void fraction: air beyond it vents at once', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    for (let k = 0; k < 20; k += 1) field.addAir(0.5, 0.5, 1, 1);
    const cell = solver.cellIndex(0.5, 0.5);
    expect(field.voidFraction(cell)).toBeCloseTo(AERATION.peak, 12);
    // The water shallowing under it squeezes the excess out too.
    solver.h[cell] = 0.5;
    field.update(1e-6);
    expect(field.voidFraction(cell)).toBeLessThanOrEqual(AERATION.peak + 1e-9);
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

// The wipeout spec, Part B: the plume's turbulence (Ting & Kirby 1995).
describe('the whitewater plume\'s turbulence', () => {
  it('uses each step size when stirring successive cells and when the step size changes', () => {
    const solver = flatSolver();
    const field = new AerationField(solver);
    const cells = [solver.cellIndex(-1.5, 0.5), solver.cellIndex(0.5, 0.5), solver.cellIndex(1.5, 0.5)];
    const strength = 0.7;
    const target = (TURBULENCE.ratio * Math.sqrt(GRAVITY * 2)) ** 2 * strength;
    for (const [cell, dt] of [[cells[0], 0.1], [cells[1], 0.1], [cells[2], 0.25]]) {
      field.stir(cell, strength, dt);
      expect(field.turbulence[cell]).toBe(target * (1 - Math.exp(-dt / TURBULENCE.rise)));
    }
    const previous = field.turbulence[cells[0]];
    field.stir(cells[0], strength, 0.05);
    expect(field.turbulence[cells[0]]).toBe(previous + (target - previous) * (1 - Math.exp(-0.05 / TURBULENCE.rise)));
  });

  const target = (depth: number, strength = 1) => (TURBULENCE.ratio * Math.sqrt(GRAVITY * depth)) ** 2 * strength;

  it('stirs toward Ting & Kirby\'s intensity under breaking, √k ≈ 0.15 √(g h)', () => {
    const solver = flatSolver(2);
    const field = new AerationField(solver, { period: 10 });
    const cell = solver.cellIndex(0.5, 0.5);
    for (let t = 0; t < 2; t += 0.05) {
      field.stir(cell, 1, 0.05);
      field.update(0.05);
    }
    expect(field.turbulence[cell]).toBeGreaterThan(0.9 * target(2));
    expect(field.turbulence[cell]).toBeLessThan(1.05 * target(2));
  });

  it('stirs a weaker break less', () => {
    const solver = flatSolver(2);
    const field = new AerationField(solver, { period: 10 });
    const cell = solver.cellIndex(0.5, 0.5);
    for (let t = 0; t < 3; t += 0.05) field.stir(cell, 0.4, 0.05);
    expect(field.turbulence[cell]).toBeCloseTo(target(2, 0.4), 2);
  });

  it('fades within about one wave period once the breaking stops', () => {
    const solver = flatSolver(2);
    const field = new AerationField(solver, { period: 10 });
    const cell = solver.cellIndex(0.5, 0.5);
    for (let t = 0; t < 3; t += 0.05) field.stir(cell, 1, 0.05);
    const start = field.turbulence[cell];
    for (let t = 0; t < 10 - 1e-9; t += 0.05) field.update(0.05);
    expect(field.turbulence[cell]).toBeCloseTo(start * Math.exp(-3), 3);
  });

  it('is carried by the current like the air', () => {
    const solver = flatSolver(2);
    setFlow(solver, 1, 0);
    const field = new AerationField(solver, { period: 10 });
    const cell = solver.cellIndex(-5.5, 0.5);
    for (let t = 0; t < 1; t += 0.05) field.stir(cell, 1, 0.05);
    for (let t = 0; t < 3; t += 0.05) field.update(0.05);
    expect(field.turbulence[solver.cellIndex(-2.5, 0.5)]).toBeGreaterThan(field.turbulence[cell]);
  });
});
