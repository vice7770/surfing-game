import { afterEach, describe, expect, it, vi } from 'vitest';
import { surfZoneConfigFor } from '../../game/PhysicalMode';
import { physicalSettingsFor } from '../../game/SurfConditions';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { uniformEdges, type AlongShoreBoundary } from '../ShallowWaterSolver';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { FIELD, boussinesqWgsl } from './boussinesqWgsl';
import { GpuBoussinesq, deviceStepRefusal } from './GpuBoussinesq';
import { emulatedGpu, readbackFields, stepKernels } from './wgslTestSupport';

/**
 * barrel-gpu (2026-11-06): the Wave Pool's straight Barrel is periodic along shore, which the device refused, so its sea
 * stepped on the CPU (34 ms a step on the M4 Pro, 0.43× real time). The device now solves each row's cyclic system by
 * Sherman–Morrison, as the CPU does (`BoussinesqSolver.cyclic`), its stencils wrapping as they already did. Node has no
 * WebGPU: the shader's own text runs here translated to JavaScript (`wgslTestSupport`), once in doubles against the CPU's
 * step (the same algorithm: they agree to rounding), and through `GpuBoussinesq` with 32-bit fields (the device tier's
 * drift, which the other spots' GPU tier carries too).
 */

const names = Object.fromEntries(Object.entries(FIELD).map(([name, index]) => [index, name]));

/** A breaking swell's hump on a beach with an along-shore bar, `xBoundary` edges, its jets' plunge zone held. */
function breakingSea(xBoundary: AlongShoreBoundary): BoussinesqSolver {
  const grid = { nx: 40, xMin: 0, dx: 1, zEdges: uniformEdges(-60, 0, 60), xBoundary };
  const solver = new BoussinesqSolver(grid, (x, z) => Math.max(0.3, 2 + 0.04 * z + 0.3 * Math.sin(x / 6)), { breaking: { onset: 0.4, diagonalJoin: 0.5 } });
  for (let iz = 0; iz < solver.nz; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) {
    const i = iz * solver.nx + ix;
    const bump = 1.1 * Math.exp(-(((solver.zCenters[iz] + 40) / 4) ** 2)) * (1 + 0.3 * Math.sin((2 * Math.PI * ix) / 40));
    solver.h[i] += bump;
    solver.qz[i] = bump * 4;
    solver.qx[i] = 0.3 * bump * Math.cos((2 * Math.PI * ix) / 20);
  }
  for (let k = 0; k < 150; k += 1) {
    solver.step(1 / 60);
    if (k % 40 === 0) solver.holdPlunge(12, -30, 0.3, 1, 1.2);
  }
  return solver;
}

/** The largest |device − CPU| of each read-back field over its largest |CPU| (floored at 1). */
function gaps(device: Map<number, Float64Array>, solver: BoussinesqSolver): Record<string, number> {
  const cpu = readbackFields(solver);
  const out: Record<string, number> = {};
  for (const [index, values] of device) {
    const reference = cpu.get(index)!;
    let worst = 0, scale = 1;
    for (let i = 0; i < values.length; i += 1) { worst = Math.max(worst, Math.abs(values[i] - reference[i])); scale = Math.max(scale, Math.abs(reference[i])); }
    out[names[index]] = worst / scale;
  }
  return out;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('the device step periodic along shore (barrel-gpu)', () => {
  it('runs the shader as the CPU steps, periodic along shore as at open and wall edges, breaking and plunge zones too', () => {
    for (const edge of ['open', 'wall', 'periodic'] as const) {
      const solver = breakingSea(edge);
      let breaking = 0, held = 0;
      for (let i = 0; i < solver.h.length; i += 1) { if (solver.breakingStrength[i] > 0) breaking += 1; if (solver.plungeHold[i] > 0) held += 1; }
      expect(breaking, edge).toBeGreaterThan(50);
      expect(held, edge).toBeGreaterThan(0);
      for (let trial = 0; trial < 3; trial += 1) {
        const dt = 0.5 * solver.maxStableStep();
        const device = stepKernels(solver, dt);
        solver.step(dt);
        for (const [field, gap] of Object.entries(gaps(device, solver))) expect(gap, `${edge} ${field}`).toBeLessThan(1e-12);
      }
    }
  });

  it('compiles the cyclic solve into the periodic shader alone; the shader as before solves a periodic row wrongly', () => {
    expect(boussinesqWgsl()).not.toContain('cyclicRow');
    expect(boussinesqWgsl(true)).toContain('fn cyclicRow(iz: u32)');
    // The shader every other spot compiles, unchanged, on a periodic sea: its rows solved as open ones.
    const solver = breakingSea('periodic');
    const dt = 0.5 * solver.maxStableStep();
    const device = stepKernels(solver, dt, boussinesqWgsl());
    solver.step(dt);
    expect(gaps(device, solver).QX).toBeGreaterThan(1e-4);
  });

  it('runs the straight Barrel\'s own grid as the CPU does: 280 × 374 cells, its stretched rows and its 64-component sea', () => {
    const settings = physicalSettingsFor('pool', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'auto' });
    const simulation = new SurfZoneSimulation(surfZoneConfigFor(settings, 8761, true), 'warm');
    const solver = simulation.solver as BoussinesqSolver;
    expect([solver.nx, solver.nz, solver.periodicAlongShore]).toEqual([280, 374, true]);
    expect(deviceStepRefusal(solver)).toBeUndefined();
    for (let k = 0; k < 6; k += 1) solver.step(1 / 60);
    const dt = 0.5 * solver.maxStableStep();
    const device = stepKernels(solver, dt);
    solver.step(dt);
    for (const [field, gap] of Object.entries(gaps(device, solver))) expect(gap, field).toBeLessThan(1e-12);
  }, 120_000);

  it('steps a periodic sea through GpuBoussinesq with 32-bit fields within the device tier\'s drift, as an open one', async () => {
    const drift: Record<string, number> = {};
    for (const edge of ['open', 'periodic'] as const) {
      const cpu = breakingSea(edge);
      const mirrored = breakingSea(edge);
      const device = await GpuBoussinesq.create(mirrored, emulatedGpu());
      if (!device) throw new Error(`${edge}: refused`);
      for (let frame = 0; frame < 60; frame += 1) {
        cpu.step(1 / 60);
        await device.step(1 / 60);
      }
      let worst = 0;
      for (let i = 0; i < cpu.h.length; i += 1) worst = Math.max(worst, Math.abs(mirrored.h[i] - cpu.h[i]));
      drift[edge] = worst;
      expect(mirrored.time).toBeCloseTo(cpu.time, 12);
    }
    // A second of breaking water: 32-bit rounding grows to a few micrometres (1.6 and 1.5 µm when written), the same at
    // both kinds of edge.
    expect(drift.open).toBeLessThan(1e-4);
    expect(drift.periodic).toBeLessThan(1e-4);
    expect(drift.periodic).toBeLessThan(10 * Math.max(drift.open, 1e-6));
  }, 120_000);

  it('accepts periodic seas, but not a row too short for two distinct ends', () => {
    const grid = { xMin: 0, dx: 1, zEdges: uniformEdges(-8, 0, 8), xBoundary: 'periodic' as const };
    expect(deviceStepRefusal(new BoussinesqSolver({ ...grid, nx: 8 }, () => 2))).toBeUndefined();
    expect(deviceStepRefusal(new BoussinesqSolver({ ...grid, nx: 2 }, () => 2))).toMatch(/fewer than 3 columns/);
  });
});
