import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { PlungingLip } from '../PlungingLip';
import { ShallowWaterSolver, WATER_LIST, uniformEdges } from '../ShallowWaterSolver';
import { FIELD, FIELD_COUNT } from './boussinesqWgsl';
import { DEVICE_UPLOAD, GpuBoussinesq, RUN_GAP } from './GpuBoussinesq';

/**
 * barrel-gpu (2026-11-06): the Barrel's jets made the device's uploads 60× what they were (7 kB a step against
 * 451 kB at 1.5 m): each launch marked the whole water, landings at either end of the window and a board's push between
 * them spanned thousands of cells, and each cell entering or leaving the plunge zone sent all of it. The device now gets
 * the runs of cells the CPU changed, and the plunge zone's cells that entered or left; its water and the cells it reads
 * held are the same bits either way. Each change's old path is a switch (`configure`, `PlungingLip.launchMarks`).
 */

type Memory = { size: number; usage: number; bytes: Uint8Array; mapAsync(): Promise<void>; getMappedRange(): ArrayBuffer; unmap(): void; destroy(): void };
interface Write { offset: number; length: number }

/** A device with memory: writes land in buffers; each submission runs `kernel` on the fields (f32), then its copies. */
function memoryGpu(cells: number, kernel: (fields: Float32Array) => void = () => {}) {
  vi.stubGlobal('GPUBufferUsage', { STORAGE: 1, COPY_DST: 2, COPY_SRC: 4, MAP_READ: 8, UNIFORM: 16 });
  vi.stubGlobal('GPUShaderStage', { COMPUTE: 1 });
  vi.stubGlobal('GPUMapMode', { READ: 1 });
  let fields: Memory | undefined;
  const water: Write[] = [];
  const hold: Write[] = [];
  let submitted: ((fields: Float32Array) => void) | undefined;
  const device = {
    queue: {
      writeBuffer: (buffer: Memory, offset: number, data: ArrayBuffer | Float32Array, dataOffset = 0, size?: number) => {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data, dataOffset, size)
          : new Uint8Array(data.buffer, data.byteOffset + dataOffset * 4, (size ?? data.length - dataOffset) * 4);
        buffer.bytes.set(bytes, offset);
        if (buffer !== fields) return;
        if (offset < 3 * cells * 4) water.push({ offset, length: bytes.length });
        else if (offset >= FIELD.HOLD * cells * 4 && offset < (FIELD.HOLD + 1) * cells * 4) hold.push({ offset, length: bytes.length });
      },
      submit: (commands: { copies: (() => void)[] }[]) => {
        const view = new Float32Array(fields!.bytes.buffer);
        submitted?.(view);
        kernel(view);
        for (const command of commands) for (const copy of command.copies) copy();
      },
      onSubmittedWorkDone: async () => {},
    },
    createBuffer: ({ size, usage }: { size: number; usage: number }) => {
      const memory: Memory = { size, usage, bytes: new Uint8Array(size), mapAsync: async () => {}, unmap: () => {}, destroy: () => {}, getMappedRange: () => memory.bytes.slice().buffer };
      if (size === FIELD_COUNT * cells * 4) fields = memory;
      return memory;
    },
    createBindGroupLayout: () => ({}), createPipelineLayout: () => ({}), createBindGroup: () => ({}), createComputePipeline: () => ({}),
    createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
    createCommandEncoder: () => {
      const copies: (() => void)[] = [];
      return {
        beginComputePass: () => ({ setBindGroup: () => {}, setPipeline: () => {}, dispatchWorkgroups: () => {}, end: () => {} }),
        copyBufferToBuffer: (from: Memory, fromOffset: number, to: Memory, toOffset: number, size: number) => {
          copies.push(() => to.bytes.set(from.bytes.subarray(fromOffset, fromOffset + size), toOffset));
        },
        finish: () => ({ copies }),
      };
    },
    destroy: () => {},
  };
  const gpu = { requestAdapter: async () => ({ limits: { maxStorageBufferBindingSize: 1e9, maxBufferSize: 1e9 }, requestDevice: async () => device }) } as unknown as GPU;
  return {
    gpu, water, hold,
    fields: () => new Float32Array(fields!.bytes.buffer),
    onSubmit(check: (fields: Float32Array) => void) { submitted = check; },
    clear() { water.length = 0; hold.length = 0; },
  };
}

/** The device's water is the solver's, as f32 bits, in every cell. */
function holdsWater(solver: ShallowWaterSolver, fields: Float32Array): boolean {
  const n = solver.nx * solver.nz;
  return [solver.h, solver.qx, solver.qz].every((array, k) => array.every((value, i) => Object.is(Math.fround(value), fields[k * n + i])));
}

const dt = 1 / 60;
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('the device gets only what the CPU changed (barrel-gpu)', () => {
  it('marks a launch\'s source cells, every cell it changes among them, and the whole water only with launchWater old', () => {
    const solver = new ShallowWaterSolver({ nx: 8, xMin: 0, dx: 1, zEdges: uniformEdges(0, 30, 30), xBoundary: 'wall' }, () => 2, { manning: 0 });
    for (let iz = 10; iz < 14; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) {
      solver.h[iz * solver.nx + ix] += 0.8;
      solver.qz[iz * solver.nx + ix] = 1.5 * solver.h[iz * solver.nx + ix];
    }
    for (const marks of ['cells', 'all'] as const) {
      const lip = new PlungingLip(solver, 64);
      lip.launchMarks = marks;
      solver.waterHeld();
      const before = [solver.h.slice(), solver.qx.slice(), solver.qz.slice()];
      expect(lip.launch(solver.cellIndex(3.5, 12.5), { x: 0, z: 5 }, 3, 0.3, 3)).toBeGreaterThan(0);
      const listed = new Set(solver.waterChangedCells);
      let changed = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        if (solver.h[i] === before[0][i] && solver.qx[i] === before[1][i] && solver.qz[i] === before[2][i]) continue;
        changed += 1;
        if (marks === 'cells') expect(listed.has(i), `cell ${i}`).toBe(true);
      }
      expect(changed).toBeGreaterThan(1);
      expect(solver.waterChangedAll).toBe(marks === 'all');
      // Its landings mark their cells too.
      solver.waterHeld();
      for (let k = 0; k < 240; k += 1) lip.step(1 / 240);
      expect(solver.waterChangedCount).toBeGreaterThan(0);
    }
  });

  it('lists each marked cell once, and past WATER_LIST keeps only the span', () => {
    const solver = new ShallowWaterSolver({ nx: 128, xMin: 0, dx: 1, zEdges: uniformEdges(0, 72, 72), xBoundary: 'open' }, () => 2);
    expect(solver.waterChangedAll).toBe(true);
    solver.markWater(7);
    expect(solver.waterChangedCount).toBe(0);
    solver.waterHeld();
    for (const cell of [40, 7, 40, 900]) solver.markWater(cell);
    expect([...solver.waterChangedCells]).toEqual([40, 7, 900]);
    expect([solver.waterChangedFrom, solver.waterChangedTo]).toEqual([7, 900]);
    solver.waterHeld();
    expect(solver.waterChangedCount).toBe(0);
    solver.markWater(40);
    expect([...solver.waterChangedCells]).toEqual([40]);
    solver.waterHeld();
    for (let i = 0; i <= WATER_LIST; i += 1) solver.markWater(i);
    expect(solver.waterChangedOverflow).toBe(true);
    expect(solver.waterChangedCount).toBe(WATER_LIST);
    solver.waterHeld();
    expect([solver.waterChangedOverflow, solver.waterChangedCount]).toEqual([false, 0]);
    solver.markWater(3);
    expect([...solver.waterChangedCells]).toEqual([3]);
  });

  it('sends each run of the changed cells, the span with deviceWater old or past the list, the device holding the same bits', async () => {
    const solver = new BoussinesqSolver({ nx: 128, xMin: 0, dx: 1, zEdges: uniformEdges(-72, 0, 72), xBoundary: 'open' }, () => 2);
    const n = solver.nx * solver.nz;
    // The device's step nudges every cell's water, so what it holds is its own until read back.
    const gpu = memoryGpu(n, (fields) => {
      for (let i = 0; i < 3 * n; i += 1) fields[i] = Math.fround(fields[i] * 1.001 + 0.001);
    });
    for (let i = 0; i < n; i += 1) { solver.qx[i] = 0.1 * Math.sin(i); solver.qz[i] = 0.05 * Math.cos(i); }
    const host = await GpuBoussinesq.create(solver, gpu.gpu);
    if (!host) throw new Error('adapter missing');
    const step = async () => { gpu.clear(); await host.step(dt); expect(holdsWater(solver, gpu.fields())).toBe(true); };
    const push = (...cells: number[]) => { for (const cell of cells) { solver.qx[cell] += 0.25; solver.markWater(cell); } };
    const runs = (...spans: [number, number][]) => spans.flatMap(([first, last]) => DEVICE_UPLOAD.map((index) => ({ offset: (index * n + first) * 4, length: (last - first + 1) * 4 })))
      .sort((a, b) => a.offset - b.offset);
    const sorted = (writes: Write[]) => [...writes].sort((a, b) => a.offset - b.offset);
    await step();
    expect(gpu.water).toEqual([{ offset: 0, length: 3 * n * 4 }]);
    expect(host.transfer.fullWater).toBe(1);
    // Two cells together and one far off: two runs.
    push(9000, 5, 6);
    await step();
    expect(sorted(gpu.water)).toEqual(runs([5, 6], [9000, 9000]));
    expect(host.transfer.fullWater).toBe(0);
    // Two cells RUN_GAP apart: one run, the cells between going up as the bits the device holds; one more apart, two.
    push(5, 5 + RUN_GAP);
    await step();
    expect(sorted(gpu.water)).toEqual(runs([5, 5 + RUN_GAP]));
    push(5, 6 + RUN_GAP);
    await step();
    expect(sorted(gpu.water)).toEqual(runs([5, 5], [6 + RUN_GAP, 6 + RUN_GAP]));
    // The old path: one span from the first cell to the last.
    host.configure({ water: 'span' });
    push(9000, 5);
    await step();
    expect(sorted(gpu.water)).toEqual(runs([5, 9000]));
    host.configure({});
    // Past the list: the span.
    push(...Array.from({ length: WATER_LIST + 1 }, (_, k) => 100 + k));
    await step();
    expect(sorted(gpu.water)).toEqual(runs([100, 100 + WATER_LIST]));
    // Nothing changed: nothing goes up.
    await step();
    expect(gpu.water).toEqual([]);
  });

  it('sends the cells that entered or left the plunge zone, the whole zone with devicePlunge old, the device reading the same holds', async () => {
    const solver = new BoussinesqSolver({ nx: 48, xMin: 0, dx: 1, zEdges: uniformEdges(-60, 0, 60), xBoundary: 'open' }, () => 3);
    const n = solver.nx * solver.nz;
    const gpu = memoryGpu(n);
    // At every submission the device reads a hold running in exactly the cells where the solver's runs.
    let checked = 0;
    gpu.onSubmit((fields) => {
      for (let i = 0; i < n; i += 1) expect(fields[FIELD.HOLD * n + i] > 0, `cell ${i}`).toBe(solver.plungeHold[i] > 0);
      checked += 1;
    });
    const host = await GpuBoussinesq.create(solver, gpu.gpu);
    if (!host) throw new Error('adapter missing');
    await host.step(dt);
    const wholeBytes: number[] = [];
    for (const rule of ['cells', 'whole'] as const) {
      host.configure({ plunge: rule });
      const sent: number[] = [];
      for (let k = 0; k < 400; k += 1) {
        // A jet lands every 0.5 s, at either end of the window by turns; each zone runs out about 2.8 s on.
        if (k % 30 === 0) solver.holdPlunge(k % 60 === 0 ? 6 : 40, -30 + (k % 90) / 10, 0, 1, 1.2, 4);
        gpu.clear();
        await host.step(dt);
        sent.push(gpu.hold.reduce((total, write) => total + write.length, 0));
        if (rule === 'whole') wholeBytes.push(host.transfer.fullPlunge);
      }
      const total = sent.reduce((a, b) => a + b, 0);
      if (rule === 'cells') {
        expect(total).toBeGreaterThan(0);
        expect(Math.max(...sent)).toBeLessThan(n * 4);
      } else {
        expect(sent.filter((bytes) => bytes > 0).every((bytes) => bytes === n * 4)).toBe(true);
        expect(wholeBytes.some((count) => count > 0)).toBe(true);
      }
    }
    expect(checked).toBe(801);
  });

  // The proof: a sea with a lip on the stand-in device, whose step is a second solver reading the device's f32 fields and
  // writing its results back as f32. Launches, landings in the plunge zone and a board's push each step: the solver's water
  // after each step and the device's fields at each submission hash the same with the old paths as with the new.
  it('steps a lip\'s sea on the device to the same bits with each change\'s old path', async () => {
    const grid = { nx: 40, xMin: 0, dx: 1, zEdges: uniformEdges(-60, 0, 60), xBoundary: 'open' as const };
    const depth = (_x: number, z: number) => Math.max(0.4, 3 + 0.05 * z);
    const options = { breaking: { onset: 0.4 } };
    const run = async (old: boolean) => {
      const solver = new BoussinesqSolver(grid, depth, options);
      const twin = new BoussinesqSolver(grid, depth, options);
      const n = solver.nx * solver.nz;
      // A swell's hump coming ashore, travelling along shore too.
      for (let iz = 0; iz < solver.nz; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        const bump = 0.6 * Math.exp(-(((solver.zCenters[iz] + 40) / 4) ** 2));
        solver.h[i] += bump;
        solver.qz[i] = bump * 4;
        solver.qx[i] = 0.2 * bump * Math.sin(ix / 3);
      }
      const field = (fields: Float32Array, index: number) => fields.subarray(index * n, (index + 1) * n);
      const gpu = memoryGpu(n, (fields) => {
        twin.h.set(field(fields, FIELD.H)); twin.qx.set(field(fields, FIELD.QX)); twin.qz.set(field(fields, FIELD.QZ));
        twin.breakingStrength.set(field(fields, FIELD.STRENGTH)); twin.breakingAge.set(field(fields, FIELD.AGE));
        twin.predictor!.x.set(field(fields, FIELD.PREDX)); twin.predictor!.z.set(field(fields, FIELD.PREDZ));
        twin.plungeHold.set(field(fields, FIELD.HOLD));
        twin.time = solver.time;
        twin.step(dt);
        field(fields, FIELD.H).set(twin.h); field(fields, FIELD.QX).set(twin.qx); field(fields, FIELD.QZ).set(twin.qz);
        field(fields, FIELD.RATEH).set(twin.surfaceRiseRate); field(fields, FIELD.STRENGTH).set(twin.breakingStrength);
        field(fields, FIELD.AGE).set(twin.breakingAge); field(fields, FIELD.NU).set(twin.viscosity);
        field(fields, FIELD.PREDX).set(twin.predictor!.x); field(fields, FIELD.PREDZ).set(twin.predictor!.z);
      });
      const deviceHash = createHash('sha256');
      gpu.onSubmit((fields) => {
        for (const index of [FIELD.H, FIELD.QX, FIELD.QZ, FIELD.STRENGTH, FIELD.AGE, FIELD.PREDX, FIELD.PREDZ]) deviceHash.update(field(fields, index));
        deviceHash.update(Uint8Array.from(field(fields, FIELD.HOLD), (value) => (value > 0 ? 1 : 0)));
      });
      const host = await GpuBoussinesq.create(solver, gpu.gpu);
      if (!host) throw new Error('adapter missing');
      if (old) host.configure({ water: 'span', plunge: 'whole' });
      const lip = new PlungingLip(solver, 2048);
      if (old) lip.launchMarks = 'all';
      let landings = 0;
      lip.onLand = (x, z, _volume, vx, vz) => { landings += 1; solver.holdPlunge(x, z, vx, vz, 1, 3); };
      const waterHash = createHash('sha256');
      let bytes = 0, launches = 0, whole = 0;
      for (let k = 0; k < 240; k += 1) {
        await host.step(dt);
        bytes += host.transfer.uploadBytes;
        whole += host.transfer.fullWater + host.transfer.fullPlunge;
        // A jet from the crest's highest cell in a column, every 0.25 s, the column walking along shore.
        if (k % 15 === 0) {
          const column = 4 + ((k / 15) * 7) % 32;
          let crest = column;
          for (let iz = 0; iz < solver.nz; iz += 1) if (solver.surfaceAt(iz * solver.nx + column) > solver.surfaceAt(crest)) crest = iz * solver.nx + column;
          if (lip.launch(crest, { x: 0.5, z: 4 }, solver.surfaceAt(crest) + 0.4, 0.2, 3, undefined, undefined, 0.6) > 0) launches += 1;
        }
        lip.step(dt);
        // A board's push on a 3 × 3 patch moving along shore.
        const centre = 30 * solver.nx + 2 + (k % 36);
        for (const i of [centre - solver.nx - 1, centre - solver.nx, centre - solver.nx + 1, centre - 1, centre, centre + 1, centre + solver.nx - 1, centre + solver.nx, centre + solver.nx + 1]) {
          solver.qx[i] -= 0.01; solver.markWater(i);
        }
        for (const array of [solver.h, solver.qx, solver.qz, solver.breakingStrength, solver.plungeHold]) waterHash.update(new Uint8Array(array.buffer));
      }
      return { water: waterHash.digest('hex'), device: deviceHash.digest('hex'), bytes, launches, landings, whole };
    };
    const fresh = await run(false);
    const old = await run(true);
    expect(fresh.launches).toBeGreaterThan(5);
    expect(fresh.landings).toBeGreaterThan(20);
    expect(fresh.water).toBe(old.water);
    expect(fresh.device).toBe(old.device);
    // Only the first step sends the whole water; the old paths sent it at every launch, and the plunge zone whole.
    expect(fresh.whole).toBe(1);
    expect(old.whole).toBeGreaterThan(fresh.launches);
    expect(fresh.bytes).toBeLessThan(old.bytes);
  });
});
