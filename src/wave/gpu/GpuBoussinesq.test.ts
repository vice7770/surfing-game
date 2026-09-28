import { describe, expect, it } from 'vitest';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { SeaStateBoundary } from '../SeaStateBoundary';
import { SideFeed } from '../SideFeed';
import { calmTarget } from '../shallowWaterTestSupport';
import { uniformEdges, type WaterTarget } from '../ShallowWaterSolver';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { COMPONENT_STRIDE, FIELD, FIELD_COUNT, PARAM_WORDS, ROW_STRIDE, boussinesqWgsl } from './boussinesqWgsl';
import { DEVICE_READBACK, deviceStepRefusal, packComponents, packGrid, packSideFeed, packSideTimes, readbackTarget, writeParams } from './GpuBoussinesq';

const quick = { spot: 'point' as const, seed: 3, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0,
  alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 8 };

describe('GpuBoussinesq host', () => {
  it('lays every field out once inside the packed buffer', () => {
    const indices = Object.values(FIELD);
    expect(new Set(indices).size).toBe(indices.length);
    expect(Math.max(...indices)).toBeLessThan(FIELD_COUNT);
    expect(boussinesqWgsl()).toContain('fn relax(');
    expect(boussinesqWgsl()).toContain('fn relaxSides(');
  });

  it('packs the side feed so the device formula reproduces its target, after a slide too (wave sizes)', () => {
    const sim = new SurfZoneSimulation(quick);
    const { solver } = sim;
    const feed = solver.relaxationZones.find((zone) => zone instanceof SideFeed) as SideFeed;
    expect(feed).toBeInstanceOf(SideFeed);
    solver.shiftAlongShore(7);
    const packed = packSideFeed(feed);
    const start = solver.time;
    packSideTimes(feed, start, packed);
    const { slots, components: count } = feed.deviceShape();
    expect(slots).toBeGreaterThan(0);
    const base = count * 3;
    const target: WaterTarget = { eta: 0, qx: 0, qz: 0 };
    for (const tau of [0.01, 0.4]) {
      for (const slot of [0, Math.floor(slots / 2), slots - 1]) {
        // Per slot: its cell, weight, and where its row's and its column's factors start.
        const [cell, weight, rowAt, columnAt] = [0, 1, 2, 3].map((k) => packed[base + slot * 4 + k]);
        expect(weight).toBeCloseTo(feed.weights[cell], 6);
        let eta = 0;
        let qx = 0;
        let qz = 0;
        for (let c = 0; c < count; c += 1) {
          const [c0, s0, omega] = [packed[c * 3], packed[c * 3 + 1], packed[c * 3 + 2]];
          const cs = c0 * Math.cos(omega * tau) - s0 * Math.sin(omega * tau);
          const ss = s0 * Math.cos(omega * tau) + c0 * Math.sin(omega * tau);
          const o = rowAt + c * 4;
          const k = columnAt + c * 2;
          const real = packed[o] * packed[k] - packed[o + 1] * packed[k + 1];
          const imaginary = packed[o] * packed[k + 1] + packed[o + 1] * packed[k];
          const value = real * cs + imaginary * ss;
          eta += value;
          qx += packed[o + 2] * value;
          qz += packed[o + 3] * value;
        }
        feed.target(0, 0, start + tau, target, cell);
        expect(eta).toBeCloseTo(target.eta, 4);
        expect(qx).toBeCloseTo(target.qx, 4);
        expect(qz).toBeCloseTo(target.qz, 4);
      }
    }
  });

  it('folds the sea phase so the device formula reproduces the relaxation target', () => {
    const sim = new SurfZoneSimulation(quick);
    const { solver } = sim;
    const boundary = solver.relaxationZones[0] as SeaStateBoundary;
    expect(boundary).toBeInstanceOf(SeaStateBoundary);
    // Slide the window so x no longer starts where it began.
    solver.shiftAlongShore(7);
    const start = solver.time;
    const packed = packComponents(boundary, start, solver.xCenters[0]);
    const count = boundary.sea.components.length;
    const target: WaterTarget = { eta: 0, qx: 0, qz: 0 };
    for (const tau of [0.01, 0.4]) {
      for (const [ix, iz] of [[0, 0], [5, 3], [solver.nx - 1, 10]]) {
        const x = solver.xCenters[ix] - solver.xCenters[0];
        const z = solver.zCenters[iz];
        let eta = 0;
        let qx = 0;
        let qz = 0;
        for (let c = 0; c < count; c += 1) {
          const o = c * COMPONENT_STRIDE;
          const value = packed[o] * Math.cos(packed[o + 1] * x + packed[o + 2] * z + packed[o + 5] - packed[o + 6] * tau);
          eta += value;
          qx += packed[o + 3] * value;
          qz += packed[o + 4] * value;
        }
        boundary.target(solver.xCenters[ix], z, start + tau, target);
        expect(eta).toBeCloseTo(target.eta, 4);
        expect(qx).toBeCloseTo(target.qx, 4);
        expect(qz).toBeCloseTo(target.qz, 4);
      }
    }
  });

  it('packs the grid rows and the per-substep parameters', () => {
    const sim = new SurfZoneSimulation(quick);
    const solver = sim.solver as BoussinesqSolver;
    const layout = solver.deviceLayout();
    const grid = packGrid(solver, layout);
    expect(grid.length).toBe(solver.nx + solver.nz * ROW_STRIDE);
    expect(grid[1]).toBeCloseTo(solver.dx, 6);
    const row = solver.nx + 4 * ROW_STRIDE;
    expect(grid[row]).toBeCloseTo(solver.zCenters[4], 3);
    expect(grid[row + 1]).toBeCloseTo(solver.dz[4], 5);
    const bytes = new ArrayBuffer(PARAM_WORDS * 4);
    writeParams(solver, layout, { boundary: layout.zones[0] as SeaStateBoundary, firstRow: 0, rows: 12 }, 0.02, 0.04, bytes);
    const words = new Uint32Array(bytes);
    const floats = new Float32Array(bytes);
    expect([words[0], words[1], words[2], words[3]]).toEqual([solver.nx, solver.nz, solver.nx * solver.nz, 2]);
    expect(floats[5]).toBeCloseTo(0.02, 7);
    expect(floats[10]).toBeCloseTo(layout.breaking!.onset, 6);
    expect([words[14], words[15], words[16], words[18]]).toEqual([1, 1, (layout.zones[0] as SeaStateBoundary).sea.components.length, 12]);
    expect(floats[19]).toBeCloseTo(0.04, 7);
    // The side feed's slots and components (wave sizes).
    const feed = layout.zones[1] as SideFeed;
    writeParams(solver, layout, { boundary: layout.zones[0] as SeaStateBoundary, firstRow: 0, rows: 12, feed }, 0.02, 0.04, bytes);
    expect([words[20], words[21]]).toEqual([feed.deviceShape().slots, feed.deviceShape().components]);
  });

  it('reads back the surface rise rate, which a lip needs to find its crest\'s motion', () => {
    // Without it a device step left η_t stale (zero after a device spin-up), so no lip was ever thrown on the GPU.
    const solver = new SurfZoneSimulation(quick).solver as BoussinesqSolver;
    expect(DEVICE_READBACK).toContain(FIELD.RATEH);
    expect(readbackTarget(solver, FIELD.RATEH)).toBe(solver.surfaceRiseRate);
    for (const index of DEVICE_READBACK) expect(readbackTarget(solver, index)).toHaveLength(solver.nx * solver.nz);
  });

  it('refuses setups the kernels do not cover', () => {
    const grid = { nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(-8, 0, 8) };
    const flat = () => 2;
    expect(deviceStepRefusal(new BoussinesqSolver({ ...grid, xBoundary: 'periodic' }, flat))).toMatch(/periodic/);
    expect(deviceStepRefusal(new BoussinesqSolver(grid, flat, { dispersion: false }))).toMatch(/stage 1/);
    expect(deviceStepRefusal(new BoussinesqSolver(grid, flat))).toBeUndefined();
    expect(deviceStepRefusal(new SurfZoneSimulation(quick).solver as BoussinesqSolver)).toBeUndefined();
    // The offshore zone and one side feed (wave sizes); anything more stays on the CPU.
    const extra = new SurfZoneSimulation(quick).solver as BoussinesqSolver;
    extra.addRelaxationZone({ weights: extra.zoneWeightsAlongZ(0, 10), target: calmTarget });
    expect(deviceStepRefusal(extra)).toMatch(/relaxation zones/);
  });
});
