/**
 * Tests only (barrel-gpu, 2026-11-06): the stage 2 step's WGSL run in JavaScript. Node has no WebGPU, so the kernels the
 * game's GPU runs are checked here by translating `boussinesqWgsl()`'s own text, mechanically, into JavaScript: the same
 * statements in the same order, their integer index arithmetic as integers, `select` evaluating both sides as WGSL does.
 * The translation covers the subset the shader uses; anything it does not know (a new builtin, a typed `let`) fails to
 * compile here rather than passing unseen. The side feed's kernel (workgroup memory and barriers) is left out.
 *
 * Two ways to run it:
 * - `stepKernels`: one substep on a solver's state in doubles, every input as the host packs it but unrounded, for a step
 *   by step comparison with the CPU solver (the same algorithm, so they agree to rounding);
 * - `emulatedGpu`: a stand-in WebGPU device for `GpuBoussinesq` itself (its uploads, Params blocks, dispatches and
 *   readback), whose fields are 32-bit as on the GPU (each value stored as f32; the arithmetic between stores in doubles).
 */
import type { BoussinesqSolver } from '../BoussinesqSolver';
import type { SeaStateBoundary } from '../SeaStateBoundary';
import { WALL, PERIODIC } from '../ShallowWaterSolver';
import { DEVICE_READBACK, packComponents, readbackTarget } from './GpuBoussinesq';
import { COMPONENT_STRIDE, FIELD, FIELD_COUNT, PARAM_WORDS, ROW_STRIDE, STEP_KERNELS, boussinesqWgsl } from './boussinesqWgsl';

/** The Params struct's members in order, each 'u32' or 'f32' (one 32-bit word each). */
export function paramsLayout(source = boussinesqWgsl()): { name: string; type: string }[] {
  const body = source.match(/struct Params \{([\s\S]*?)\};/)?.[1];
  if (!body) throw new Error('no Params struct');
  return body.split(',').map((member) => member.trim()).filter(Boolean).map((member) => {
    const [name, type] = member.split(':').map((part) => part.trim());
    return { name, type };
  });
}

/** The shader as JavaScript: a function of (F, G, S, D, P, ops) returning its compute entry points by name. */
export function translateWgsl(source = boussinesqWgsl()): string {
  let js = source.slice(0, source.indexOf('var<workgroup> sideTimes'));
  js = js.replace(/struct Params \{[\s\S]*?\};/, '');
  js = js.replace(/struct Flux \{[^}]*\};/, '');
  js = js.replace(/@group\(\d+\) @binding\(\d+\) var(<[^>]*>)? \w+: [^;]+;/g, '');
  js = js.replace(/var out: Flux;/g, 'let out = {};');
  js = js.replace(/const (\w+): \w+ = /g, 'const $1 = ');
  js = js.replace(/@compute @workgroup_size\(64\) fn (\w+)\(@builtin\(global_invocation_id\) id: vec3<u32>\)/g, 'function $1(id)');
  js = js.replace(/fn (\w+)\(([^)]*)\)(\s*->\s*[\w<>]+)?\s*\{/g, (_all, name: string, params: string) =>
    `function ${name}(${params.split(',').map((param) => param.split(':')[0].trim()).filter(Boolean).join(', ')}) {`);
  js = js.replace(/\bvar (\w+): \w+;/g, 'let $1;');
  js = js.replace(/\bvar (\w+) =/g, 'let $1 =');
  // Integer literals, and integer division of a cell index by the row length.
  js = js.replace(/\b(\d+)u\b/g, '$1');
  js = js.replace(/\b(\w+) \/ (P\.nx|nx)\b/g, 'Math.floor($1 / $2)');
  js = js.replace(/\b[iu]32\(/g, 'Math.trunc(');
  for (const name of ['abs', 'min', 'max', 'sqrt', 'sign', 'pow', 'cos', 'sin']) js = js.replace(new RegExp(`\\b${name}\\(`, 'g'), `Math.${name}(`);
  if (/\bvec[234]|\barray<|\blet \w+:|->|@/.test(js)) throw new Error(`WGSL left untranslated: ${js.match(/.*(vec[234]|array<|let \w+:|->|@).*/)?.[0]}`);
  const entries = [...source.matchAll(/@compute @workgroup_size\(64\) fn (\w+)\(@builtin\(global_invocation_id\) id: vec3<u32>\)/g)].map((m) => m[1]);
  return `${js}\nreturn { ${entries.join(', ')} };`;
}

type Kernel = (id: { x: number }) => void;
export type Kernels = Record<string, Kernel>;

/** The entry points over these buffers: `F` the fields, `G` the grid, `S` the sea's components, `D` the side feed. */
const factories = new Map<string, (...args: unknown[]) => Kernels>();
const select = (f: unknown, t: unknown, condition: boolean) => (condition ? t : f);
const clamp = (x: number, low: number, high: number) => Math.min(Math.max(x, low), high);
export function wgslKernels(
  F: Float32Array | Float64Array, G: ArrayLike<number>, S: ArrayLike<number>, D: ArrayLike<number>, P: Record<string, number>, source?: string,
): Kernels {
  const text = source ?? boussinesqWgsl(P.boundary === PERIODIC);
  let build = factories.get(text);
  if (!build) {
    build = new Function('F', 'G', 'S', 'D', 'P', 'select', 'clamp', translateWgsl(text)) as (...args: unknown[]) => Kernels;
    factories.set(text, build);
  }
  return build(F, G, S, D, P, select, clamp);
}

/** Thread counts a step dispatches, as `GpuBoussinesq` sizes them (rounded up to whole workgroups of 64). */
function threads(kernel: string, P: Record<string, number>): number {
  const groups = (count: number) => Math.ceil(count / 64) * 64;
  if (kernel === 'rows') return groups(P.nz);
  if (kernel === 'columns') return groups(P.nx);
  if (kernel === 'relax') return groups(P.zoneRows * P.nx);
  if (kernel === 'relaxSides') return groups(P.feedSlots);
  return groups(P.n);
}

function dispatch(kernels: Kernels, kernel: string, count: number): void {
  const run = kernels[kernel];
  if (!run) throw new Error(`no kernel ${kernel}`);
  const id = { x: 0 };
  for (let x = 0; x < count; x += 1) { id.x = x; run(id); }
}

/** The fields one substep reads, loaded from the solver as the host uploads them, in doubles. */
function loadFields(solver: BoussinesqSolver, F: Float64Array): void {
  const layout = solver.deviceLayout();
  const n = solver.nx * solver.nz;
  const put = (index: number, values?: ArrayLike<number>) => { if (values) F.set(values, index * n); };
  put(FIELD.H, solver.h); put(FIELD.QX, solver.qx); put(FIELD.QZ, solver.qz);
  put(FIELD.BED, solver.bed); put(FIELD.STILL, layout.still); put(FIELD.DDX, layout.slopeX); put(FIELD.DDZ, layout.slopeZ);
  put(FIELD.WEIGHT, (layout.zones[0] as SeaStateBoundary | undefined)?.weights);
  put(FIELD.STRENGTH, solver.breakingStrength); put(FIELD.AGE, solver.breakingAge);
  put(FIELD.PREDX, solver.predictor?.x); put(FIELD.PREDZ, solver.predictor?.z); put(FIELD.HOLD, solver.plungeHold);
  put(FIELD.ONSET, layout.breaking?.onsetFactor); put(FIELD.JOIN, layout.breaking?.joinField);
}

/**
 * One substep `dt` long of the WGSL (`source`, else the game's for this solver's edges) on `solver`'s state, in doubles: the Params, grid and sea as
 * `writeParams`, `packGrid` and `packComponents` pack them, unrounded. Returns the fields read back (`DEVICE_READBACK`), by
 * field index.
 */
export function stepKernels(solver: BoussinesqSolver, dt: number, source?: string): Map<number, Float64Array> {
  const layout = solver.deviceLayout();
  const { nx, nz } = solver;
  const n = nx * nz;
  const F = new Float64Array(FIELD_COUNT * n);
  loadFields(solver, F);
  const G = new Float64Array(nx + nz * ROW_STRIDE);
  for (let ix = 0; ix < nx; ix += 1) G[ix] = ix * solver.dx;
  for (let iz = 0; iz < nz; iz += 1) {
    const o = nx + iz * ROW_STRIDE;
    G[o] = solver.zCenters[iz]; G[o + 1] = solver.dz[iz]; G[o + 2] = layout.below[iz]; G[o + 3] = layout.above[iz]; G[o + 4] = layout.gaps[iz];
  }
  const boundary = layout.zones[0] as SeaStateBoundary | undefined;
  let zoneFirst = 0, zoneRows = 0;
  if (boundary) {
    let last = -1;
    zoneFirst = nz;
    for (let iz = 0; iz < nz; iz += 1) if (boundary.weights[iz * nx] > 0) { zoneFirst = Math.min(zoneFirst, iz); last = iz; }
    zoneRows = last >= zoneFirst ? last - zoneFirst + 1 : 0;
  }
  const S = boundary ? packComponents(boundary, solver.time, solver.xCenters[0], new Float64Array(Math.max(1, boundary.sea.components.length) * COMPONENT_STRIDE) as never) : new Float64Array(COMPONENT_STRIDE);
  const breaking = layout.breaking;
  const P: Record<string, number> = {
    nx, nz, n, boundary: layout.xBoundary === WALL ? 0 : layout.xBoundary === PERIODIC ? 1 : 2,
    dx: solver.dx, dt, g: layout.gravity, dryDepth: layout.dryDepth, manning: layout.manning, restLevel: solver.restLevel,
    onset: breaking?.onset ?? 0, endShare: breaking?.end ?? 0, transition: breaking?.transition ?? 1, mixing: breaking?.mixing ?? 0,
    dispersive: layout.dispersive ? 1 : 0, breaks: breaking ? 1 : 0, components: boundary?.sea.components.length ?? 0,
    zoneFirst, zoneRows, tau: dt, feedSlots: 0, feedComponents: 0, diagonalJoin: breaking?.diagonalJoin ?? 0,
    onsetField: breaking?.onsetFactor ? 1 : 0, joinField: breaking?.joinField ? 1 : 0,
  };
  if (layout.zones.length > 1) throw new Error('stepKernels covers the offshore zone alone (no side feed)');
  const kernels = wgslKernels(F, G, S, new Float64Array(1), P, source);
  for (const kernel of STEP_KERNELS) {
    if (kernel === 'relax' && !boundary) continue;
    if (kernel === 'relaxSides') continue;
    dispatch(kernels, kernel, threads(kernel, P));
  }
  return new Map(DEVICE_READBACK.map((index) => [index, F.slice(index * n, (index + 1) * n)]));
}

type Memory = { size: number; usage: number; bytes: Uint8Array; mapAsync(): Promise<void>; getMappedRange(): ArrayBuffer; unmap(): void; destroy(): void };

/**
 * A stand-in WebGPU device that runs the WGSL (translated) on what `GpuBoussinesq` uploads: each pass's Params block from
 * its dynamic offset, each dispatch's kernel over its threads, the readback copies after. The fields are 32-bit.
 */
export function emulatedGpu(): GPU {
  const globals = globalThis as Record<string, unknown>;
  globals.GPUBufferUsage ??= { MAP_READ: 1, MAP_WRITE: 2, COPY_SRC: 4, COPY_DST: 8, INDEX: 16, VERTEX: 32, UNIFORM: 64, STORAGE: 128, INDIRECT: 256, QUERY_RESOLVE: 512 };
  globals.GPUShaderStage ??= { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
  globals.GPUMapMode ??= { READ: 1, WRITE: 2 };
  const layoutWords = paramsLayout();
  if (layoutWords.length !== PARAM_WORDS) throw new Error(`Params has ${layoutWords.length} words, not ${PARAM_WORDS}`);
  let bound: Memory[] = [];
  const device = {
    limits: { minUniformBufferOffsetAlignment: 256 },
    queue: {
      writeBuffer: (buffer: Memory, offset: number, data: ArrayBuffer | Float32Array, dataOffset = 0, size?: number) => {
        const bytes = data instanceof ArrayBuffer ? new Uint8Array(data, dataOffset, size)
          : new Uint8Array(data.buffer, data.byteOffset + dataOffset * 4, (size ?? data.length - dataOffset) * 4);
        buffer.bytes.set(bytes, offset);
      },
      submit: (commands: { run(): void }[]) => { for (const command of commands) command.run(); },
      onSubmittedWorkDone: async () => {},
    },
    createBuffer: ({ size, usage }: { size: number; usage: number }) => {
      const memory: Memory = { size, usage, bytes: new Uint8Array(size), mapAsync: async () => {}, unmap: () => {}, destroy: () => {}, getMappedRange: () => memory.bytes.slice().buffer };
      return memory;
    },
    createBindGroupLayout: () => ({}),
    createPipelineLayout: () => ({}),
    createBindGroup: ({ entries }: { entries: { binding: number; resource: { buffer: Memory } }[] }) => ({ buffers: entries.map((entry) => entry.resource.buffer) }),
    // Each pipeline runs the module it was made from: the text `GpuBoussinesq` compiles for its solver.
    createComputePipeline: ({ compute }: { compute: { entryPoint: string; module: { code: string } } }) => ({ entryPoint: compute.entryPoint, code: compute.module.code }),
    createShaderModule: ({ code }: { code: string }) => ({ code, getCompilationInfo: async () => ({ messages: [] }) }),
    createCommandEncoder: () => {
      const jobs: (() => void)[] = [];
      return {
        beginComputePass: () => {
          let offset = 0;
          let entryPoint = '';
          let code = '';
          return {
            setBindGroup: (_index: number, group: { buffers: Memory[] }, offsets: number[] = []) => { bound = group.buffers; offset = offsets[0] ?? 0; },
            setPipeline: (pipeline: { entryPoint: string; code: string }) => { entryPoint = pipeline.entryPoint; code = pipeline.code; },
            dispatchWorkgroups: (groups: number) => {
              const buffers = bound, at = offset, kernel = entryPoint, source = code;
              jobs.push(() => {
                const [fields, grid, sea, params, feed] = buffers;
                const words = new DataView(params.bytes.buffer, at, PARAM_WORDS * 4);
                const P: Record<string, number> = {};
                layoutWords.forEach(({ name, type }, k) => { P[name] = type === 'u32' ? words.getUint32(4 * k, true) : words.getFloat32(4 * k, true); });
                const kernels = wgslKernels(new Float32Array(fields.bytes.buffer), new Float32Array(grid.bytes.buffer), new Float32Array(sea.bytes.buffer), new Float32Array(feed.bytes.buffer), P, source);
                if (kernel === 'relaxSides') throw new Error('the side feed is not emulated');
                dispatch(kernels, kernel, groups * 64);
              });
            },
            end: () => {},
          };
        },
        copyBufferToBuffer: (from: Memory, fromOffset: number, to: Memory, toOffset: number, size: number) => {
          jobs.push(() => to.bytes.set(from.bytes.subarray(fromOffset, fromOffset + size), toOffset));
        },
        finish: () => ({ run: () => { for (const job of jobs) job(); } }),
      };
    },
    destroy: () => {},
  };
  return { requestAdapter: async () => ({ limits: { maxStorageBufferBindingSize: 1e12, maxBufferSize: 1e12 }, requestDevice: async () => device }) } as unknown as GPU;
}

/** The solver arrays a device step reads back, by field index (for comparisons). */
export function readbackFields(solver: BoussinesqSolver): Map<number, Float64Array> {
  return new Map(DEVICE_READBACK.map((index) => [index, readbackTarget(solver, index)]));
}
