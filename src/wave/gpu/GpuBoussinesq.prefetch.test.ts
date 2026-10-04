import { Buffer } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { uniformEdges } from '../ShallowWaterSolver';
import { DEVICE_LAYOUT, DEVICE_READBACK, GpuBoussinesq, readbackTarget } from './GpuBoussinesq';
import { FIELD } from './boussinesqWgsl';

const grid = { nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(-8, 0, 8), xBoundary: 'open' as const };
const dt = 1 / 60, n = 64;
/** Declared transport payload, not computed water: nonzero F32 fields and signed zero exercise exact staging order. */
const transportPacket = (cells: number) => DEVICE_READBACK.map((field, k) => Float32Array.from({ length: cells }, (_, i) =>
  field === FIELD.H ? 2 + i * 0.001 : i === 0 && k === 1 ? -0 : (k + 1) * 0.01 + i * 0.0001));
function same(actual: ArrayLike<number>, expected: ArrayLike<number>, label: string) {
  if (!ArrayBuffer.isView(actual) || !ArrayBuffer.isView(expected)) throw new Error(`${label}: bulk comparison requires actual typed array views`);
  const a = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength), b = Buffer.from(expected.buffer, expected.byteOffset, expected.byteLength);
  if (actual.constructor === expected.constructor && a.length === b.length && a.equals(b)) return;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) throw new Error(`${label}: byte ${i} differs ${a[i]} / ${b[i]}`);
  throw new Error(`${label}: typed array kind/byte range differs ${actual.constructor.name}:${a.length} / ${expected.constructor.name}:${b.length}`);
}
function gate() { let release!: () => void; const promise = new Promise<void>((resolve) => { release = resolve; }); return { promise, release }; }
function fakeGpu(cells = n) {
  const packet = transportPacket(cells);
  vi.stubGlobal('GPUBufferUsage', { STORAGE: 1, COPY_DST: 2, COPY_SRC: 4, MAP_READ: 8, UNIFORM: 16 });
  vi.stubGlobal('GPUShaderStage', { COMPUTE: 1 }); vi.stubGlobal('GPUMapMode', { READ: 1 });
  let mapWait: Promise<void> | undefined, rejectMap = false;
  class Buffer {
    readonly bytes: ArrayBuffer;
    mapped = false; unmaps = 0;
    constructor(readonly size: number, readonly usage: number) { this.bytes = new ArrayBuffer(size); }
    async mapAsync() { if (mapWait) await mapWait; if (rejectMap) throw new Error('mapped readback rejected'); this.mapped = true; }
    getMappedRange() { if (!this.mapped) throw new Error('unmapped read'); return this.bytes; }
    unmap() { if (!this.mapped) throw new Error('double unmap'); this.mapped = false; this.unmaps += 1; }
    destroy() {}
  }
  const buffers: Buffer[] = [];
  const writeBuffer = vi.fn(), copies = vi.fn(), submit = vi.fn((commands: { run(): void }[]) => commands.forEach((c) => c.run()));
  const destroy = vi.fn();
  const device = {
    queue: { writeBuffer, submit, onSubmittedWorkDone: async () => {} },
    createBuffer: ({ size, usage }: { size: number; usage: number }) => { const b = new Buffer(size, usage); buffers.push(b); return b; },
    createBindGroupLayout: () => ({}), createPipelineLayout: () => ({}), createBindGroup: () => ({}), createComputePipeline: () => ({}),
    createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
    createCommandEncoder: () => {
      const jobs: (() => void)[] = [];
      return {
        beginComputePass: () => ({ setBindGroup() {}, setPipeline() {}, dispatchWorkgroups() {}, end() {} }),
        copyBufferToBuffer: (source: Buffer, sourceOffset: number, target: Buffer, targetOffset: number, size: number) => {
          copies(source, sourceOffset, target, targetOffset, size);
          jobs.push(() => {
            const k = DEVICE_READBACK.indexOf(sourceOffset / (cells * 4) as typeof DEVICE_READBACK[number]);
            if (k < 0 || size !== cells * 4) throw new Error('unexpected copy field/size');
            new Float32Array(target.bytes).set(packet[k], targetOffset / 4);
          });
        }, finish: () => ({ run: () => jobs.forEach((job) => job()) }),
      };
    }, destroy,
  };
  const gpu = { requestAdapter: async () => ({ limits: { maxStorageBufferBindingSize: 1e9, maxBufferSize: 1e9 }, requestDevice: async () => device }) } as unknown as GPU;
  return { packet, gpu, buffers, writeBuffer, copies, submit, destroy, wait(value: Promise<void> | undefined) { mapWait = value; }, fail(value: boolean) { rejectMap = value; } };
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('GPU water prefetch mapped ownership', () => {
  it('holds all nine fields, clock, plunge and diagnostics until one commit, preserving the generic step result', async () => {
    const solver = new BoussinesqSolver(grid, () => 2), genericSolver = new BoussinesqSolver(grid, () => 2);
    solver.plungeHold.fill(0.125); genericSolver.plungeHold.fill(0.125);
    const fake = fakeGpu(), ordinary = fakeGpu();
    const host = await GpuBoussinesq.create(solver, fake.gpu), generic = await GpuBoussinesq.create(genericSolver, ordinary.gpu);
    if (!host || !generic) throw new Error('adapter missing');
    const before = DEVICE_READBACK.map((field) => readbackTarget(solver, field).slice()), holds = solver.plungeHold.slice();
    const diagnostics = { ...host.diagnostics }, timing = host.lastStepMs, substeps = host.lastSubsteps;
    const result = await host.prepareStep(dt); if (!result) throw new Error('prepared result missing');
    DEVICE_READBACK.forEach((field, k) => same(readbackTarget(solver, field), before[k], `before commit ${field}`));
    same(solver.plungeHold, holds, 'before commit holds'); expect(solver.time).toBe(0);
    expect(host.diagnostics).toEqual(diagnostics); expect(host.lastStepMs).toBe(timing); expect(host.lastSubsteps).toBe(substeps);
    const staging = fake.buffers.find((buffer) => buffer.usage & 8)!;
    expect(staging.mapped).toBe(true); expect(staging.unmaps).toBe(0);
    await expect(host.prepareStep(dt)).rejects.toThrow('owns the device staging');
    await generic.step(dt); expect(result.commit()).toBe(true);
    DEVICE_READBACK.forEach((field, k) => {
      same(readbackTarget(solver, field), Float64Array.from(fake.packet[k]), `declared packet ${field}`);
      same(readbackTarget(solver, field), readbackTarget(genericSolver, field), `generic result ${field}`);
    });
    same(solver.plungeHold, genericSolver.plungeHold, 'committed holds'); expect(solver.plungeVersion).toBe(genericSolver.plungeVersion);
    expect(solver.time).toBe(dt); expect(solver.time).toBe(genericSolver.time);
    expect(staging.mapped).toBe(false); expect(staging.unmaps).toBe(1);
    expect(result.commit()).toBe(false); result.discard(); expect(staging.unmaps).toBe(1);
    host.dispose(); generic.dispose();
  });

  it('discards without CPU writes and rebases every carried layout field before a normal step', async () => {
    const fake = fakeGpu(), solver = new BoussinesqSolver(grid, () => 2);
    const host = await GpuBoussinesq.create(solver, fake.gpu); if (!host) throw new Error('adapter missing');
    await host.step(dt); const time = solver.time;
    const result = await host.prepareStep(dt); if (!result) throw new Error('prepared result missing');
    const before = DEVICE_READBACK.map((field) => readbackTarget(solver, field).slice()), holds = solver.plungeHold.slice();
    result.discard(); result.discard(); expect(result.commit()).toBe(false); expect(solver.time).toBe(time);
    DEVICE_READBACK.forEach((field, k) => same(readbackTarget(solver, field), before[k], `discarded ${field}`));
    same(solver.plungeHold, holds, 'discarded holds');
    const staging = fake.buffers.find((buffer) => buffer.usage & 8)!; expect(staging.mapped).toBe(false); expect(staging.unmaps).toBe(2);
    fake.writeBuffer.mockClear(); await host.step(dt);
    for (const index of DEVICE_LAYOUT) expect(fake.writeBuffer.mock.calls.some(([buffer, offset]) => buffer === fake.buffers[0] && offset === index * n * 4), `rebase field ${index}`).toBe(true);
    expect(solver.time).toBe(time + dt); host.dispose();
  });

  it.each([['mapped', 'readback'], ['pending', 'kernels']] as const)('releases unsupported private %s/%s state without advancing, then falls back on the next positive step', async (phase, change) => {
    const config = { spot: 'padang' as const, stage: 2 as const, seed: 3, significantHeight: 1.4, peakPeriod: 16,
      directionDegrees: 0, spreading: 24, tide: 0.5, windSpeed: 0, componentCount: 2,
      alongShore: 12, dx: 2, fineSpacing: 2, coarseSpacing: 8, spinUpPeriods: 0 };
    const simulation = new SurfZoneSimulation(config, 'warm'), control = new SurfZoneSimulation(config, 'warm');
    const solver = simulation.solver as BoussinesqSolver, expected = control.solver as BoussinesqSolver;
    solver.holdPlunge(solver.xCenters[2], solver.zCenters[2], 0, 1, 0.8); expected.holdPlunge(expected.xCenters[2], expected.zCenters[2], 0, 1, 0.8);
    const fake = fakeGpu(solver.h.length), host = await GpuBoussinesq.create(solver, fake.gpu); if (!host) throw new Error('adapter missing');
    simulation.device = host; simulation.enableSoloWaterPrefetch();
    const pending = gate(); if (phase === 'pending') fake.wait(pending.promise);
    simulation.prefetchWater(dt); expect(simulation.hasWaterPrefetch).toBe(true);
    if (phase === 'mapped') await (simulation as unknown as { futureWater: { ready: Promise<unknown> } }).futureWater.ready;
    const before = DEVICE_READBACK.map((field) => readbackTarget(solver, field).slice()), holds = solver.plungeHold.slice();
    if (change === 'readback') host.readback = false; else host.kernels.pop();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const discarding = simulation.discardWaterPrefetch();
    expect(solver.time).toBe(0); expect(warning).not.toHaveBeenCalled(); pending.release(); await discarding;
    DEVICE_READBACK.forEach((field, k) => same(readbackTarget(solver, field), before[k], `unsupported private ${field}`));
    same(solver.plungeHold, holds, 'unsupported private hold'); expect(solver.time).toBe(0); expect(warning).not.toHaveBeenCalled();
    const staging = fake.buffers.find((buffer) => buffer.usage & 8)!; expect(staging.mapped).toBe(false); expect(staging.unmaps).toBe(1);
    await simulation.stepAsync(dt); control.step(dt);
    expect(warning).toHaveBeenCalledOnce(); expect(simulation.device).toBeUndefined(); expect(fake.destroy).toHaveBeenCalledOnce();
    DEVICE_READBACK.forEach((field) => same(readbackTarget(solver, field), readbackTarget(expected, field), `CPU fallback ${field}`));
    same(solver.plungeHold, expected.plungeHold, 'CPU fallback hold'); expect(solver.plungeVersion).toBe(expected.plungeVersion); expect(solver.time).toBe(expected.time);
    const actualState = simulation.exportState(), expectedState = control.exportState();
    for (const name of Object.keys(expectedState.arrays)) same(actualState.arrays[name], expectedState.arrays[name], `CPU fallback export ${name}`);
    expect(simulation.front!.exportState()).toEqual(control.front!.exportState()); expect(simulation.lip.exportState()).toEqual(control.lip.exportState());
    expect(await host.prepareStep(dt)).toBeUndefined();
  });

  it('retires pending or mapped staging on disposal without committing fields or future time', async () => {
    const fake = fakeGpu(), solver = new BoussinesqSolver(grid, () => 2);
    const host = await GpuBoussinesq.create(solver, fake.gpu); if (!host) throw new Error('adapter missing');
    const before = DEVICE_READBACK.map((field) => readbackTarget(solver, field).slice());
    const pending = gate(); fake.wait(pending.promise);
    const preparing = host.prepareStep(dt); host.dispose(); pending.release();
    expect(await preparing).toBeUndefined(); expect(fake.destroy).toHaveBeenCalledOnce(); expect(solver.time).toBe(0);
    DEVICE_READBACK.forEach((field, k) => same(readbackTarget(solver, field), before[k], `disposed ${field}`));
    const mappedFake = fakeGpu(), mappedSolver = new BoussinesqSolver(grid, () => 2), mappedHost = await GpuBoussinesq.create(mappedSolver, mappedFake.gpu);
    if (!mappedHost) throw new Error('mapped adapter missing');
    const mapped = await mappedHost.prepareStep(dt); if (!mapped) throw new Error('mapped result missing');
    mappedHost.dispose(); expect(mapped.commit()).toBe(false); expect(mappedSolver.time).toBe(0);
    DEVICE_READBACK.forEach((field, k) => same(readbackTarget(mappedSolver, field), before[k], `mapped disposed ${field}`));
    const staging = mappedFake.buffers.find((buffer) => buffer.usage & 8)!; expect(staging.mapped).toBe(false); expect(staging.unmaps).toBe(1);
  });
});
