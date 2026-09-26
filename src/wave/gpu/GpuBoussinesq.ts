import { BoussinesqSolver, type BoussinesqDeviceLayout } from '../BoussinesqSolver';
import { SeaStateBoundary } from '../SeaStateBoundary';
import { PERIODIC, WALL } from '../ShallowWaterSolver';
import { COMPONENT_STRIDE, FIELD, FIELD_COUNT, PARAM_WORDS, ROW_STRIDE, STEP_KERNELS, boussinesqWgsl } from './boussinesqWgsl';

const WORKGROUP = 64;
const TAU = 2 * Math.PI;
/** Fields the CPU writes every frame (board reactions, lip landings), then reads back with the breaking and predictor state. */
const UPLOAD = [FIELD.H, FIELD.QX, FIELD.QZ] as const;
const READBACK = [FIELD.H, FIELD.QX, FIELD.QZ, FIELD.STRENGTH, FIELD.AGE, FIELD.NU, FIELD.PREDX, FIELD.PREDZ] as const;
/** Fields that follow the bed, or that only the CPU's window shift changes between frames. */
const LAYOUT = [FIELD.BED, FIELD.STILL, FIELD.DDX, FIELD.DDZ, FIELD.WEIGHT, FIELD.STRENGTH, FIELD.AGE, FIELD.PREDX, FIELD.PREDZ] as const;

/** The one offshore zone a device step blends toward: its rows and its sea's components. */
interface DeviceZone {
  boundary: SeaStateBoundary;
  firstRow: number;
  rows: number;
}

/** Why the device step cannot run this solver, or undefined when it can. */
export function deviceStepRefusal(solver: BoussinesqSolver): string | undefined {
  const layout = solver.deviceLayout();
  if (layout.xBoundary === PERIODIC) return 'periodic along shore (cyclic solves stay on the CPU)';
  if (!layout.dispersive && !layout.breaking) return 'stage 1 (no dispersion or breaking)';
  if (layout.zones.length > 1 || layout.zones.some((zone) => !(zone instanceof SeaStateBoundary))) return 'relaxation zones other than one linear sea';
  return undefined;
}

function zoneOf(solver: BoussinesqSolver, layout: BoussinesqDeviceLayout): DeviceZone | undefined {
  const boundary = layout.zones[0];
  if (!(boundary instanceof SeaStateBoundary)) return undefined;
  const { nx, nz } = solver;
  let first = nz;
  let last = -1;
  for (let iz = 0; iz < nz; iz += 1) {
    if (boundary.weights[iz * nx] > 0) {
      first = Math.min(first, iz);
      last = iz;
    }
  }
  return last >= first ? { boundary, firstRow: first, rows: last - first + 1 } : undefined;
}

/** The grid buffer: x centres relative to the first, then per row its centre, height, neighbour distances and gap. */
export function packGrid(solver: BoussinesqSolver, layout: BoussinesqDeviceLayout): Float32Array<ArrayBuffer> {
  const { nx, nz, dx, zCenters, dz } = solver;
  const grid = new Float32Array(nx + nz * ROW_STRIDE);
  for (let ix = 0; ix < nx; ix += 1) grid[ix] = ix * dx;
  for (let iz = 0; iz < nz; iz += 1) {
    const o = nx + iz * ROW_STRIDE;
    grid[o] = zCenters[iz];
    grid[o + 1] = dz[iz];
    grid[o + 2] = layout.below[iz];
    grid[o + 3] = layout.above[iz];
    grid[o + 4] = layout.gaps[iz];
  }
  return grid;
}

/**
 * The sea's components for a frame starting at solver time `start` with the
 * window's first column at `firstX`: the along-shore and time parts of each
 * phase are folded in double precision into one angle per frame, so the device
 * only adds kx·(x − firstX) + kz·z − ω·τ in single precision.
 */
export function packComponents(boundary: SeaStateBoundary, start: number, firstX: number, out?: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
  const components = boundary.sea.components;
  const packed = out ?? new Float32Array(Math.max(1, components.length) * COMPONENT_STRIDE);
  const seaTime = start + boundary.timeOffset;
  components.forEach((component, c) => {
    const o = c * COMPONENT_STRIDE;
    const speed = component.omega / component.k;
    const phase = component.kx * firstX + component.phase - component.omega * seaTime;
    packed[o] = component.amplitude;
    packed[o + 1] = component.kx;
    packed[o + 2] = component.kz;
    packed[o + 3] = speed * Math.sin(component.direction);
    packed[o + 4] = speed * Math.cos(component.direction);
    packed[o + 5] = phase - TAU * Math.floor(phase / TAU);
    packed[o + 6] = component.omega;
    packed[o + 7] = 0;
  });
  return packed;
}

/** The Params uniform for one substep `dt` long ending `tau` seconds into the frame. */
export function writeParams(
  solver: BoussinesqSolver, layout: BoussinesqDeviceLayout, zone: DeviceZone | undefined, dt: number, tau: number, out: ArrayBuffer,
): void {
  const words = new Uint32Array(out);
  const floats = new Float32Array(out);
  const n = solver.nx * solver.nz;
  words[0] = solver.nx; words[1] = solver.nz; words[2] = n; words[3] = layout.xBoundary === WALL ? 0 : layout.xBoundary === PERIODIC ? 1 : 2;
  floats[4] = solver.dx; floats[5] = dt; floats[6] = layout.gravity; floats[7] = layout.dryDepth;
  floats[8] = layout.manning; floats[9] = solver.restLevel;
  const breaking = layout.breaking;
  floats[10] = breaking?.onset ?? 0; floats[11] = breaking?.end ?? 0; floats[12] = breaking?.transition ?? 1; floats[13] = breaking?.mixing ?? 0;
  words[14] = layout.dispersive ? 1 : 0; words[15] = breaking ? 1 : 0;
  words[16] = zone ? zone.boundary.sea.components.length : 0;
  words[17] = zone?.firstRow ?? 0; words[18] = zone?.rows ?? 0;
  floats[19] = tau;
}

/**
 * Stage 2 step on the GPU (plan P6): the same kernels as BoussinesqSolver in
 * 32-bit floats. Each frame uploads h, qx and qz (the board and the lip change
 * them on the CPU), plus the bed and carried state after a window shift, runs
 * the CFL substeps, and reads the new water, breaking and predictor state back
 * into the solver, whose CPU consumers (breaking model, lip, foam, board) then
 * run as before.
 */
export class GpuBoussinesq {
  private readonly n: number;
  private readonly fields: GPUBuffer;
  private readonly grid: GPUBuffer;
  private readonly sea: GPUBuffer;
  private readonly params: GPUBuffer;
  private readonly staging: GPUBuffer;
  private readonly bindGroup: GPUBindGroup;
  private readonly pipelines: Map<string, GPUComputePipeline>;
  private readonly paramBytes = new ArrayBuffer(PARAM_WORDS * 4);
  private readonly upload: Float32Array<ArrayBuffer>;
  private readonly field: Float32Array<ArrayBuffer>;
  private readonly components: Float32Array<ArrayBuffer>;
  private readonly zone?: DeviceZone;
  private version = -1;
  private disposed = false;
  /** Wall time of the last frame's device work, ms. */
  lastStepMs = 0;
  /** Diagnostics: the kernels each substep runs, and whether a frame reads its result back. */
  kernels: string[] = [...STEP_KERNELS];
  readback = true;
  lastSubsteps = 0;

  private constructor(readonly solver: BoussinesqSolver, readonly device: GPUDevice, module: GPUShaderModule) {
    const { nx, nz } = solver;
    const layout = solver.deviceLayout();
    this.n = nx * nz;
    this.zone = zoneOf(solver, layout);
    const storage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    this.fields = device.createBuffer({ size: FIELD_COUNT * this.n * 4, usage: storage | GPUBufferUsage.COPY_SRC });
    this.grid = device.createBuffer({ size: (nx + nz * ROW_STRIDE) * 4, usage: storage });
    const count = Math.max(1, this.zone?.boundary.sea.components.length ?? 0);
    this.components = new Float32Array(count * COMPONENT_STRIDE);
    this.sea = device.createBuffer({ size: this.components.byteLength, usage: storage });
    this.params = device.createBuffer({ size: PARAM_WORDS * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.staging = device.createBuffer({ size: READBACK.length * this.n * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    this.upload = new Float32Array(UPLOAD.length * this.n);
    this.field = new Float32Array(this.n);
    const bindLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindLayout] });
    this.pipelines = new Map(STEP_KERNELS.map((entryPoint) => [entryPoint, device.createComputePipeline({ layout: pipelineLayout, compute: { module, entryPoint } })]));
    this.bindGroup = device.createBindGroup({
      layout: bindLayout,
      entries: [
        { binding: 0, resource: { buffer: this.fields } },
        { binding: 1, resource: { buffer: this.grid } },
        { binding: 2, resource: { buffer: this.sea } },
        { binding: 3, resource: { buffer: this.params } },
      ],
    });
    device.queue.writeBuffer(this.grid, 0, packGrid(solver, layout));
  }

  /** A device step for `solver`, or undefined where WebGPU or the solver's setup rules it out. */
  static async create(solver: BoussinesqSolver, gpu: GPU | undefined = globalThis.navigator?.gpu): Promise<GpuBoussinesq | undefined> {
    if (!gpu || deviceStepRefusal(solver)) return undefined;
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) return undefined;
    const size = FIELD_COUNT * solver.nx * solver.nz * 4;
    if (size > adapter.limits.maxStorageBufferBindingSize || size > adapter.limits.maxBufferSize) return undefined;
    const device = await adapter.requestDevice({
      requiredLimits: { maxStorageBufferBindingSize: size, maxBufferSize: size },
    });
    const module = device.createShaderModule({ code: boussinesqWgsl() });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter((message) => message.type === 'error');
    if (errors.length) {
      device.destroy();
      throw new Error(`Boussinesq WGSL: ${errors.map((message) => `${message.lineNum}:${message.linePos} ${message.message}`).join('; ')}`);
    }
    return new GpuBoussinesq(solver, device, module);
  }

  /** Advance the solver by dt seconds on the device, sub-stepping as the CFL condition requires. */
  async step(dt: number): Promise<void> {
    if (this.disposed || !(dt > 0) || !Number.isFinite(dt)) return;
    const started = performance.now();
    const { solver, device, n } = this;
    const layout = solver.deviceLayout();
    if (layout.version !== this.version) {
      this.writeLayout(layout);
      this.version = layout.version;
    }
    UPLOAD.forEach((index, k) => {
      const source = index === FIELD.H ? solver.h : index === FIELD.QX ? solver.qx : solver.qz;
      this.upload.set(source, k * n);
    });
    device.queue.writeBuffer(this.fields, FIELD.H * n * 4, this.upload);
    if (this.zone) {
      packComponents(this.zone.boundary, solver.time, solver.xCenters[0], this.components);
      device.queue.writeBuffer(this.sea, 0, this.components);
    }
    const substeps = Math.max(1, Math.ceil(dt / solver.maxStableStep()));
    const sub = dt / substeps;
    const cells = Math.ceil(n / WORKGROUP);
    for (let s = 0; s < substeps; s += 1) {
      writeParams(solver, layout, this.zone, sub, (s + 1) * sub, this.paramBytes);
      device.queue.writeBuffer(this.params, 0, this.paramBytes);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setBindGroup(0, this.bindGroup);
      for (const kernel of this.kernels) {
        if (kernel === 'relax' && !this.zone) continue;
        pass.setPipeline(this.pipelines.get(kernel)!);
        const groups = kernel === 'rows' ? Math.ceil(solver.nz / WORKGROUP)
          : kernel === 'columns' ? Math.ceil(solver.nx / WORKGROUP)
            : kernel === 'relax' ? Math.ceil((this.zone!.rows * solver.nx) / WORKGROUP)
              : cells;
        pass.dispatchWorkgroups(groups);
      }
      pass.end();
      if (s === substeps - 1 && this.readback) {
        READBACK.forEach((index, k) => encoder.copyBufferToBuffer(this.fields, index * n * 4, this.staging, k * n * 4, n * 4));
      }
      device.queue.submit([encoder.finish()]);
    }
    this.lastSubsteps = substeps;
    if (!this.readback) {
      await device.queue.onSubmittedWorkDone();
      solver.time += dt;
      this.lastStepMs = performance.now() - started;
      return;
    }
    await this.staging.mapAsync(GPUMapMode.READ);
    const back = new Float32Array(this.staging.getMappedRange());
    READBACK.forEach((index, k) => {
      const view = back.subarray(k * n, (k + 1) * n);
      this.target(index).set(view);
    });
    this.staging.unmap();
    solver.adoptDeviceStep(dt);
    this.lastStepMs = performance.now() - started;
  }

  /** The solver array a device field reads back into. */
  private target(index: number): Float64Array {
    const { solver } = this;
    switch (index) {
      case FIELD.H: return solver.h;
      case FIELD.QX: return solver.qx;
      case FIELD.QZ: return solver.qz;
      case FIELD.STRENGTH: return solver.breakingStrength;
      case FIELD.AGE: return solver.breakingAge;
      case FIELD.NU: return solver.viscosity;
      case FIELD.PREDX: return solver.predictor!.x;
      case FIELD.PREDZ: return solver.predictor!.z;
      default: throw new RangeError(`No solver array for field ${index}`);
    }
  }

  /** Bed, still depth and slopes, zone weights, and the carried breaking and predictor state (after a window shift). */
  private writeLayout(layout: BoussinesqDeviceLayout): void {
    const { solver, device, n, field } = this;
    const weights = this.zone?.boundary.weights;
    const predictor = solver.predictor;
    for (const index of LAYOUT) {
      const source = index === FIELD.BED ? solver.bed : index === FIELD.STILL ? layout.still
        : index === FIELD.DDX ? layout.slopeX : index === FIELD.DDZ ? layout.slopeZ
          : index === FIELD.WEIGHT ? weights : index === FIELD.STRENGTH ? solver.breakingStrength
            : index === FIELD.AGE ? solver.breakingAge : index === FIELD.PREDX ? predictor?.x : predictor?.z;
      if (source) field.set(source);
      else field.fill(0);
      device.queue.writeBuffer(this.fields, index * n * 4, field);
    }
    device.queue.writeBuffer(this.grid, 0, packGrid(solver, layout));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.device.destroy();
  }
}
