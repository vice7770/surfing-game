import { describe, expect, it } from 'vitest';
import { AdvectionStencil } from './AdvectionStencil';
import { AerationField } from './AerationField';
import { FoamField } from './FoamField';
import { ShallowWaterSolver, stretchedEdges, uniformEdges } from './ShallowWaterSolver';

function solver(stretched = false) {
  return new ShallowWaterSolver({ nx: 18, xMin: -9, dx: 1, zEdges: stretched ? stretchedEdges(-30, 10, -5, 1, 4) : uniformEdges(-9, 9, 18), xBoundary: 'open' }, () => 2);
}

function fields(water: ShallowWaterSolver) {
  const foam = new FoamField(water, { dense: 3, residual: 20 });
  const air = new AerationField(water);
  for (let i = 0; i < water.h.length; i += 1) {
    foam.dense[i] = (i % 7) / 10;
    foam.residual[i] = (i % 3) / 20;
    air.air[i] = (i % 5) / 100;
    air.depth[i] = (i % 5) / 10;
    air.turbulence[i] = (i % 11) / 20;
  }
  return { foam, air };
}

function compare(a: ReturnType<typeof fields>, b: ReturnType<typeof fields>) {
  for (const key of ['dense', 'residual', 'source'] as const) expect(a.foam[key]).toEqual(b.foam[key]);
  for (const key of ['air', 'depth', 'turbulence'] as const) expect(a.air[key]).toEqual(b.air[key]);
}

describe('the shared advection stencil', () => {
  it('exactly matches independent advection on uniform and stretched grids with mutable flow, dry cells and window shifts', () => {
    for (const stretched of [false, true]) {
      const water = solver(stretched);
      const plain = fields(water);
      const shared = fields(water);
      const stencil = new AdvectionStencil();
      const breaking = new Float64Array(water.h.length);
      for (let step = 0; step < 60; step += 1) {
        if (step === 20 || step === 40) water.shiftAlongShore(step === 20 ? 3 : -2);
        const dt = step % 3 === 0 ? 1 / 30 : 1 / 60;
        for (let i = 0; i < water.h.length; i += 1) {
          water.h[i] = (i + step) % 13 === 0 ? 0.01 : 2 + 0.25 * Math.sin(i * 0.3 + step * 0.4);
          water.qx[i] = water.h[i] * 3 * Math.sin(i * 0.2 + step);
          water.qz[i] = water.h[i] * 4 * Math.cos(i * 0.4 + step);
          breaking[i] = i % 5 === 0 ? 0.4 : 0;
        }
        // Keep solver.time unchanged deliberately: every foam call must rebuild from mutable h/q.
        plain.foam.update(dt, breaking);
        shared.foam.update(dt, breaking, stencil);
        for (const field of [plain.air, shared.air]) {
          field.addBore(12, 0.03, 0.3, dt);
          field.stir(19, 0.5, dt);
        }
        plain.air.update(dt);
        shared.air.update(dt, stencil);
        compare(shared, plain);
      }
    }
  });

  it.each(['dt', 'time', 'window', 'grid'] as const)('rejects a changed %s and falls back to independent aeration lookup', (change) => {
    const water = solver();
    const plain = fields(water);
    const shared = fields(water);
    const stencil = new AdvectionStencil();
    const calm = new Float64Array(water.h.length);
    plain.foam.update(1 / 60, calm);
    shared.foam.update(1 / 60, calm, stencil);
    let dt = 1 / 60;
    if (change === 'dt') dt = 1 / 30;
    if (change === 'time') water.time += 1 / 60;
    if (change === 'window') water.shiftAlongShore(3);
    if (change === 'grid') {
      stencil.begin(solver(true), dt);
      stencil.commit();
    }
    plain.air.update(dt);
    shared.air.update(dt, stencil);
    compare(shared, plain);
  });

  it('reuses a lookup once and supports explicit invalidation for a water edit between consumers', () => {
    const water = solver();
    const stencil = new AdvectionStencil();
    expect(stencil.take(water, 1 / 60)).toBeUndefined();
    stencil.begin(water, 1 / 60);
    expect(stencil.take(water, 1 / 60)).toBeUndefined();
    stencil.commit();
    expect(stencil.take(water, 1 / 60)).toBe(stencil);
    expect(stencil.take(water, 1 / 60)).toBeUndefined();
    stencil.begin(water, 1 / 60);
    stencil.commit();
    water.qx.fill(1);
    stencil.invalidate();
    expect(stencil.take(water, 1 / 60)).toBeUndefined();
  });

  it('allocates only on first use or a new grid size', () => {
    const water = solver();
    const stencil = new AdvectionStencil();
    expect(stencil.values.byteLength + stencil.indices.byteLength).toBe(0);
    stencil.begin(water, 1 / 60);
    const indices = stencil.indices;
    const values = stencil.values;
    expect(indices.byteLength + values.byteLength).toBe(water.h.length * 20);
    stencil.begin(water, 1 / 30);
    expect(stencil.indices).toBe(indices);
    expect(stencil.values).toBe(values);
    stencil.begin(solver(true), 1 / 60);
    expect(stencil.indices).not.toBe(indices);
  });
});
