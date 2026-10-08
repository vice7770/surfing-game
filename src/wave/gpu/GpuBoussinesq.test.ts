import { describe, expect, it, vi } from 'vitest';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { SeaStateBoundary } from '../SeaStateBoundary';
import { SideFeed } from '../SideFeed';
import { calmTarget } from '../shallowWaterTestSupport';
import { uniformEdges, type WaterTarget } from '../ShallowWaterSolver';
import { SurfZoneSimulation, type SolverDevice } from '../SurfZoneSimulation';
import { COMPONENT_STRIDE, FIELD, FIELD_COUNT, PARAM_WORDS, ROW_STRIDE, boussinesqWgsl } from './boussinesqWgsl';
import {
  DEVICE_LAYOUT, DEVICE_READBACK, DEVICE_UPLOAD, GpuBoussinesq, deviceStepRefusal, packComponents, packGrid, packSideFeed, packSideTimes, readbackTarget, writeParams,
} from './GpuBoussinesq';

const quick = { spot: 'point' as const, seed: 3, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 10, spreading: 12, tide: 0, windSpeed: 0,
  alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1, componentCount: 8 };
/** A fed sea: Padang Padang with its sides fed by the config (no spot is fed by default since 2026-10-07), warm-built, since packing reads no stepped water. */
const fed = () => new SurfZoneSimulation({ ...quick, spot: 'padang', significantHeight: 1.2, peakPeriod: 16, sideFeed: true }, 'warm');

/**
 * A stand-in for the GPU (plan P6): a second solver, stepped on the CPU, is the device's memory, and each frame it
 * exchanges with the surf zone's solver exactly the fields GpuBoussinesq sends and reads back, when it does. A surf
 * zone on it sees what one on the GPU sees, in doubles: anything its lip, foam or breaking read that the device does
 * not return goes stale, as η_t did on the GPU until 33fae37.
 */
class ShadowDevice implements SolverDevice {
  private version = -1;
  private plungeVersion = -1;

  constructor(private readonly solver: BoussinesqSolver, private readonly memory: BoussinesqSolver, private readonly readback: readonly number[] = DEVICE_READBACK) {}

  async step(dt: number): Promise<void> {
    const { solver, memory } = this;
    const layout = solver.deviceLayout();
    if (layout.version !== this.version) {
      for (const index of DEVICE_LAYOUT) this.send(index);
      this.version = layout.version;
    } else if (solver.plungeVersion !== this.plungeVersion) {
      this.send(FIELD.HOLD);
    }
    this.plungeVersion = solver.plungeVersion;
    for (const index of DEVICE_UPLOAD) this.send(index);
    memory.time = solver.time;
    memory.step(dt);
    for (const index of this.readback) readbackTarget(solver, index).set(readbackTarget(memory, index));
    solver.adoptDeviceStep(dt);
  }

  dispose(): void {}

  /** One field into the device's memory. The bed, and the still depth, slopes and zone weights that follow it, match already. */
  private send(index: number): void {
    const { solver, memory } = this;
    if (index === FIELD.HOLD) memory.plungeHold.set(solver.plungeHold);
    else if (![FIELD.BED, FIELD.STILL, FIELD.DDX, FIELD.DDZ, FIELD.WEIGHT].includes(index as never)) readbackTarget(memory, index).set(readbackTarget(solver, index));
  }
}

describe('GpuBoussinesq host', () => {
  it('reports submission and readback stages separately without changing the device step or its diagnostic no-readback path', async () => {
    vi.stubGlobal('GPUBufferUsage', { STORAGE: 1, COPY_DST: 2, COPY_SRC: 4, MAP_READ: 8, UNIFORM: 16 });
    vi.stubGlobal('GPUShaderStage', { COMPUTE: 1 });
    vi.stubGlobal('GPUMapMode', { READ: 1 });
    let clock = 0;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => clock++);
    const copies = vi.fn();
    const wait = vi.fn(async () => {});
    const submit = vi.fn();
    const device = {
      queue: { writeBuffer: vi.fn(), submit, onSubmittedWorkDone: wait },
      createBuffer: ({ size }: { size: number }) => ({ size, mapAsync: async () => {}, getMappedRange: () => new ArrayBuffer(size), unmap: () => {} }),
      createBindGroupLayout: () => ({}), createPipelineLayout: () => ({}), createBindGroup: () => ({}), createComputePipeline: () => ({}),
      createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
      createCommandEncoder: () => ({
        beginComputePass: () => ({ setBindGroup: () => {}, setPipeline: () => {}, dispatchWorkgroups: () => {}, end: () => {} }),
        copyBufferToBuffer: copies, finish: () => ({}),
      }),
      destroy: () => {},
    };
    const gpu = { requestAdapter: async () => ({ limits: { maxStorageBufferBindingSize: 1e9, maxBufferSize: 1e9 }, requestDevice: async () => device }) } as unknown as GPU;
    try {
      const solver = new BoussinesqSolver({ nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(-8, 0, 8), xBoundary: 'open' }, () => 2);
      const host = await GpuBoussinesq.create(solver, gpu);
      expect(host).toBeDefined();
      await host!.step(1 / 60);
      expect(host!.diagnostics).toEqual({ substeps: 1, pack: 1, cfl: 1, encode: 1, map: 1, unpack: 1 });
      expect(host!.lastSubsteps).toBe(host!.diagnostics.substeps);
      expect(copies).toHaveBeenCalledTimes(DEVICE_READBACK.length);
      expect(solver.time).toBe(1 / 60);
      host!.readback = false;
      await host!.step(1 / 60);
      expect(host!.diagnostics.unpack).toBe(0);
      expect(host!.diagnostics.map).toBe(1);
      expect(wait).toHaveBeenCalledOnce();
      expect(submit).toHaveBeenCalledTimes(2);
      expect(copies).toHaveBeenCalledTimes(DEVICE_READBACK.length);
      expect(solver.time).toBe(2 / 60);
    } finally {
      now.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('lays every field out once inside the packed buffer', () => {
    const indices = Object.values(FIELD);
    expect(new Set(indices).size).toBe(indices.length);
    expect(Math.max(...indices)).toBeLessThan(FIELD_COUNT);
    expect(boussinesqWgsl()).toContain('fn relax(');
    expect(boussinesqWgsl()).toContain('fn relaxSides(');
  });

  it('packs the side feed so the device formula reproduces its target, after a slide too (wave sizes)', () => {
    const sim = fed();
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
    // A fed sea's side feed: its slots and components (wave sizes).
    const fedSolver = fed().solver as BoussinesqSolver;
    const fedLayout = fedSolver.deviceLayout();
    const feed = fedLayout.zones[1] as SideFeed;
    expect(feed).toBeInstanceOf(SideFeed);
    writeParams(fedSolver, fedLayout, { boundary: fedLayout.zones[0] as SeaStateBoundary, firstRow: 0, rows: 12, feed }, 0.02, 0.04, bytes);
    expect([words[20], words[21]]).toEqual([feed.deviceShape().slots, feed.deviceShape().components]);
  });

  it('reads back the surface rise rate, which a lip needs to find its crest\'s motion', () => {
    // Without it a device step left η_t stale (zero after a device spin-up), so no lip was ever thrown on the GPU.
    const solver = new SurfZoneSimulation(quick).solver as BoussinesqSolver;
    expect(DEVICE_READBACK).toContain(FIELD.RATEH);
    expect(readbackTarget(solver, FIELD.RATEH)).toBe(solver.surfaceRiseRate);
    for (const index of DEVICE_READBACK) expect(readbackTarget(solver, index)).toHaveLength(solver.nx * solver.nz);
  });

  describe('the device tier\'s data flow', () => {
    // The Point on 1 m cells throws within a second of its spin-up.
    const config = { ...quick, dx: 1, fineSpacing: 1 };
    const seconds = 3;
    const step = 1 / 30;
    let reference: Promise<SurfZoneSimulation> | undefined;
    /** The surf zone on the CPU alone, spun up there, as the CPU tier runs. */
    const onCpu = () => {
      reference ??= (async () => {
        const simulation = new SurfZoneSimulation(config);
        for (let frame = 0; frame < seconds / step; frame += 1) simulation.step(step);
        return simulation;
      })();
      return reference;
    };
    /** The same surf zone on a device exchanging `readback`, spun up on it, as the worker's GPU tier runs. */
    const onDevice = async (readback?: readonly number[]) => {
      const simulation = new SurfZoneSimulation(config, 'warm');
      const memory = new SurfZoneSimulation(config, 'warm').solver as BoussinesqSolver;
      expect(memory.bed).toEqual(simulation.solver.bed);
      const device = new ShadowDevice(simulation.solver as BoussinesqSolver, memory, readback);
      simulation.device = device;
      await simulation.spinUp();
      for (let frame = 0; frame < seconds / step; frame += 1) await simulation.stepAsync(step);
      // A device that throws is dropped for the CPU without a word: this one must have stepped it all.
      expect(simulation.device).toBe(device);
      return simulation;
    };

    it('steps the surf zone as the CPU does, lips and all, on the fields it sends and reads back', async () => {
      const cpu = await onCpu();
      const device = await onDevice();
      expect(cpu.lipLaunches).toBeGreaterThan(0);
      expect(device.lipLaunches).toBe(cpu.lipLaunches);
      expect(device.lip.landings).toBe(cpu.lip.landings);
      expect(device.solver.h).toEqual(cpu.solver.h);
      expect(device.solver.qx).toEqual(cpu.solver.qx);
    }, 300_000);

    it('goes silent without η_t read back, as the GPU tier did before 33fae37', async () => {
      const cpu = await onCpu();
      const device = await onDevice(DEVICE_READBACK.filter((index) => index !== FIELD.RATEH));
      expect(cpu.lipLaunches).toBeGreaterThan(0);
      expect(device.lipLaunches).toBe(0);
    }, 300_000);
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
