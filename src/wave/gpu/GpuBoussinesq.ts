import { BoussinesqSolver, type BoussinesqDeviceLayout } from '../BoussinesqSolver';
import type { DeviceTransfer, PreparedWaterStep } from '../SurfZoneSimulation';
import { SeaStateBoundary } from '../SeaStateBoundary';
import { SideFeed } from '../SideFeed';
import { PERIODIC, WALL, cflSubsteps } from '../ShallowWaterSolver';
import { COMPONENT_STRIDE, FIELD, FIELD_COUNT, PARAM_WORDS, ROW_STRIDE, STEP_KERNELS, boussinesqWgsl } from './boussinesqWgsl';

const WORKGROUP = 64;
/** Params blocks a device starts with (frames with more substeps grow it). */
const PARAM_SLOTS = 4;
const TAU = 2 * Math.PI;
/** Fields the CPU writes every frame (board reactions, lip landings), then reads back with the breaking and predictor state. */
export const DEVICE_UPLOAD = [FIELD.H, FIELD.QX, FIELD.QZ] as const;
/** Fields read back after a step: the water, its breaking and predictor state, and η_t, which a lip's crest motion reads. */
export const DEVICE_READBACK = [FIELD.H, FIELD.QX, FIELD.QZ, FIELD.RATEH, FIELD.STRENGTH, FIELD.AGE, FIELD.NU, FIELD.PREDX, FIELD.PREDZ] as const;
/** Fields that follow the bed, or that only the CPU's window shift changes between frames; the plunge zone is also sent when a cell enters or leaves it. */
export const DEVICE_LAYOUT = [FIELD.BED, FIELD.STILL, FIELD.DDX, FIELD.DDZ, FIELD.WEIGHT, FIELD.STRENGTH, FIELD.AGE, FIELD.PREDX, FIELD.PREDZ, FIELD.HOLD] as const;

/** The one offshore zone a device step blends toward (its rows and its sea's components), and the side feed if any. */
interface DeviceZone {
  boundary: SeaStateBoundary;
  firstRow: number;
  rows: number;
  /** The window's side strips fed with the incoming sea (the wave-sizes spec). */
  feed?: SideFeed;
}

/** The solver array a device field reads back into. */
export function readbackTarget(solver: BoussinesqSolver, index: number): Float64Array {
  switch (index) {
    case FIELD.H: return solver.h;
    case FIELD.QX: return solver.qx;
    case FIELD.QZ: return solver.qz;
    case FIELD.RATEH: return solver.surfaceRiseRate;
    case FIELD.STRENGTH: return solver.breakingStrength;
    case FIELD.AGE: return solver.breakingAge;
    case FIELD.NU: return solver.viscosity;
    case FIELD.PREDX: return solver.predictor!.x;
    case FIELD.PREDZ: return solver.predictor!.z;
    default: throw new RangeError(`No solver array for field ${index}`);
  }
}

/** Why the device step cannot run this solver, or undefined when it can. */
export function deviceStepRefusal(solver: BoussinesqSolver): string | undefined {
  const layout = solver.deviceLayout();
  if (layout.xBoundary === PERIODIC) return 'periodic along shore (cyclic solves stay on the CPU)';
  if (!layout.dispersive && !layout.breaking) return 'stage 1 (no dispersion or breaking)';
  const [first, second, ...rest] = layout.zones;
  const covered = (!first || first instanceof SeaStateBoundary) && (!second || second instanceof SideFeed) && rest.length === 0;
  if (!covered) return 'relaxation zones other than one linear sea and its side feed';
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
  const feed = layout.zones[1] instanceof SideFeed ? layout.zones[1] : undefined;
  return last >= first ? { boundary, firstRow: first, rows: last - first + 1, feed } : undefined;
}

/**
 * The side feed for the device (the wave-sizes spec): per component the time block (written each frame by
 * `packSideTimes`), then per strip cell its cell index, weight, and where its row's and column's factors start,
 * then the strips' row factors (A cos Ψ, A sin Ψ, speedX, speedZ per component) and column factors (cos, sin of kx·Δx).
 */
export function packSideFeed(feed: SideFeed): Float32Array<ArrayBuffer> {
  const tables = feed.deviceTables();
  const slots = tables.slots.length / 4;
  const rowsBase = tables.components * 3 + slots * 4;
  const columnsBase = rowsBase + tables.rows.length;
  const packed = new Float32Array(columnsBase + tables.columns.length);
  for (let slot = 0; slot < slots; slot += 1) {
    const o = tables.components * 3 + slot * 4;
    packed[o] = tables.slots[slot * 4];
    packed[o + 1] = tables.slots[slot * 4 + 1];
    packed[o + 2] = rowsBase + tables.slots[slot * 4 + 2];
    packed[o + 3] = columnsBase + tables.slots[slot * 4 + 3];
  }
  packed.set(tables.rows, rowsBase);
  packed.set(tables.columns, columnsBase);
  return packed;
}

/** The side feed's time block for a frame starting at solver time `start`: cos ωs, sin ωs (in double precision) and ω. */
export function packSideTimes(feed: SideFeed, start: number, out: Float32Array<ArrayBuffer>): void {
  const seaTime = start + feed.timeOffset;
  feed.sea.components.forEach((component, c) => {
    out[c * 3] = Math.cos(component.omega * seaTime);
    out[c * 3 + 1] = Math.sin(component.omega * seaTime);
    out[c * 3 + 2] = component.omega;
  });
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
  const feed = zone?.feed?.deviceShape();
  words[20] = feed?.slots ?? 0; words[21] = feed?.components ?? 0;
  floats[22] = breaking?.diagonalJoin ?? 0;
  words[23] = breaking?.onsetFactor ? 1 : 0;
  words[24] = breaking?.joinField ? 1 : 0;
}

/**
 * Stage 2 step on the GPU (plan P6): the same kernels as BoussinesqSolver in
 * 32-bit floats. Each frame uploads h, qx and qz (the board and the lip change
 * them on the CPU), plus the bed and carried state after a window shift and the
 * plunge zone when it changed, runs
 * the CFL substeps, and reads the new water, breaking and predictor state back
 * into the solver, whose CPU consumers (breaking model, lip, foam, board) then
 * run as before.
 */
export class GpuBoussinesq {
  private readonly n: number;
  private readonly fields: GPUBuffer;
  private readonly grid: GPUBuffer;
  private readonly sea: GPUBuffer;
  /** One Params block per substep, each at its own dynamic offset, so a frame's substeps go in one submission. */
  private params: GPUBuffer;
  private paramSlots = 0;
  private readonly paramStride: number;
  private paramBlocks = new ArrayBuffer(0);
  private readonly staging: GPUBuffer;
  private readonly pipelines: Map<string, GPUComputePipeline>;
  private readonly paramBytes = new ArrayBuffer(PARAM_WORDS * 4);
  private readonly upload: Float32Array<ArrayBuffer>;
  private readonly field: Float32Array<ArrayBuffer>;
  private readonly components: Float32Array<ArrayBuffer>;
  private readonly zone?: DeviceZone;
  /** The side feed's buffer (a placeholder word without one), its packed tables, and how many slots it steps. */
  private feedBuffer: GPUBuffer;
  private feedPacked = new Float32Array(1);
  private feedSlots = 0;
  private bindGroup: GPUBindGroup;
  private readonly bindLayout: GPUBindGroupLayout;
  private version = -1;
  private plungeVersion = -1;
  /**
   * Whether this device's water (h, qx, qz) may differ from the solver's in cells the solver has not marked changed
   * (`ShallowWaterSolver.waterChangedAll`; canyon-perf, 2026-10-29): from its creation, and from each submitted step
   * until its result is unpacked into the solver. Then only the cells the CPU changed since go up.
   */
  private waterStale = true;
  private disposed = false;
  /** At most one future result owns the mapped staging buffer. */
  private preparing = false;
  private privateOwnerUsed = false;
  /** Unsupported diagnostics after speculation retire this private device at the next requested step, never now. */
  private privateUnusable = false;
  private discardPrepared?: () => void;
  /** Wall time of the last frame's device work, ms. */
  lastStepMs = 0;
  /** Diagnostics: the kernels each substep runs, and whether a frame reads its result back. */
  kernels: string[] = [...STEP_KERNELS];
  readback = true;
  lastSubsteps = 0;
  /** CPU preparation, CFL scan, submission, readback wait and unpacking, ms, from the latest frame. */
  readonly diagnostics = { substeps: 0, pack: 0, cfl: 0, encode: 0, map: 0, unpack: 0 };
  /** The latest frame's traffic: bytes written to the device and read back, readback maps and queue submissions. */
  readonly transfer: DeviceTransfer = { uploadBytes: 0, readbackBytes: 0, maps: 0, submits: 0 };
  /** The traffic of the frame being prepared, counted by `write`, `submit` and the map. */
  private counting: DeviceTransfer = { uploadBytes: 0, readbackBytes: 0, maps: 0, submits: 0 };

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
    this.paramStride = Math.max(PARAM_WORDS * 4, device.limits?.minUniformBufferOffsetAlignment ?? 256);
    this.params = this.paramBuffer(PARAM_SLOTS);
    this.staging = device.createBuffer({ size: DEVICE_READBACK.length * this.n * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    this.upload = new Float32Array(DEVICE_UPLOAD.length * this.n);
    this.field = new Float32Array(this.n);
    const bindLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform', hasDynamicOffset: true } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      ],
    });
    this.bindLayout = bindLayout;
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindLayout] });
    this.pipelines = new Map(STEP_KERNELS.map((entryPoint) => [entryPoint, device.createComputePipeline({ layout: pipelineLayout, compute: { module, entryPoint } })]));
    this.feedBuffer = device.createBuffer({ size: 4, usage: storage });
    this.bindGroup = this.bind();
    device.queue.writeBuffer(this.grid, 0, packGrid(solver, layout));
  }

  private bind(): GPUBindGroup {
    return this.device.createBindGroup({
      layout: this.bindLayout,
      entries: [
        { binding: 0, resource: { buffer: this.fields } },
        { binding: 1, resource: { buffer: this.grid } },
        { binding: 2, resource: { buffer: this.sea } },
        { binding: 3, resource: { buffer: this.params, size: PARAM_WORDS * 4 } },
        { binding: 4, resource: { buffer: this.feedBuffer } },
      ],
    });
  }

  /** A Params buffer of `slots` blocks, and its CPU image. */
  private paramBuffer(slots: number): GPUBuffer {
    this.paramSlots = slots;
    this.paramBlocks = new ArrayBuffer(slots * this.paramStride);
    return this.device.createBuffer({ size: slots * this.paramStride, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  }

  /** Room for `substeps` Params blocks: a frame with more substeps than ever before doubles it (and binds it again). */
  private reserveParams(substeps: number): void {
    if (substeps <= this.paramSlots) return;
    let slots = this.paramSlots;
    while (slots < substeps) slots *= 2;
    // Work already submitted keeps the old buffer alive until it finishes; nothing submits with it again.
    this.params.destroy();
    this.params = this.paramBuffer(slots);
    this.bindGroup = this.bind();
  }

  /** `queue.writeBuffer`, counted: a typed array's offset and size are in elements, an ArrayBuffer's in bytes. */
  private write(buffer: GPUBuffer, offset: number, data: Float32Array<ArrayBuffer> | ArrayBuffer, dataOffset = 0, size?: number): void {
    if (size === undefined) this.device.queue.writeBuffer(buffer, offset, data, dataOffset);
    else this.device.queue.writeBuffer(buffer, offset, data, dataOffset, size);
    const elements = data instanceof ArrayBuffer ? data.byteLength : data.length;
    const unit = data instanceof ArrayBuffer ? 1 : data.BYTES_PER_ELEMENT;
    this.counting.uploadBytes += (size ?? elements - dataOffset) * unit;
  }

  /** Pack and upload the side feed's tables (after a slide they are rebuilt), growing its buffer when it must. */
  private writeFeed(): void {
    const feed = this.zone?.feed;
    if (!feed) return;
    this.feedPacked = packSideFeed(feed);
    this.feedSlots = feed.deviceShape().slots;
    if (this.feedPacked.byteLength > this.feedBuffer.size) {
      this.feedBuffer.destroy();
      this.feedBuffer = this.device.createBuffer({ size: this.feedPacked.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
      this.bindGroup = this.bind();
    }
    this.write(this.feedBuffer, 0, this.feedPacked);
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
    await this.runWaterStep(dt, false);
  }

  /** Internal solo-worker preparation: all GPU work/readback, with one mapped result held until an actual advance. */
  async prepareStep(dt: number): Promise<PreparedWaterStep | undefined> {
    if (this.privateOwnerUsed && !this.canonicalReadback()) this.privateUnusable = true;
    if (!this.prefetchEligible() || !(dt > 0) || !Number.isFinite(dt)) return undefined;
    this.privateOwnerUsed = true;
    return this.runWaterStep(dt, true);
  }

  private canonicalReadback(): boolean {
    return this.readback && this.kernels.length === STEP_KERNELS.length && this.kernels.every((kernel, i) => kernel === STEP_KERNELS[i]);
  }

  private prefetchEligible(): boolean { return !this.disposed && !this.privateUnusable && this.canonicalReadback(); }

  private async runWaterStep(dt: number, deferred: boolean): Promise<PreparedWaterStep | undefined> {
    if (this.privateUnusable) throw new Error('Private water prefetch device no longer supports canonical readback');
    if (this.disposed || !(dt > 0) || !Number.isFinite(dt)) return;
    if (this.preparing) throw new Error('A private water result still owns the device staging buffer');
    if (deferred) this.preparing = true;
    let mapped = false;
    try {
      const started = performance.now();
      const { solver, device, n } = this;
      const layout = solver.deviceLayout();
      const sourceTime = solver.time, sourceVersion = layout.version, sourcePlunge = solver.plungeVersion;
      const diagnostics = deferred ? { substeps: 0, pack: 0, cfl: 0, encode: 0, map: 0, unpack: 0 } : this.diagnostics;
      const transfer: DeviceTransfer = { uploadBytes: 0, readbackBytes: 0, maps: 0, submits: 0 };
      this.counting = transfer;
      const readback = this.readback;
      if (layout.version !== this.version) {
        this.writeLayout(layout);
        this.version = layout.version;
      } else if (solver.plungeVersion !== this.plungeVersion) {
        // A cell entered or left the plunge zone: the mask reads only whether its hold is running.
        this.field.set(solver.plungeHold);
        this.write(this.fields, FIELD.HOLD * n * 4, this.field);
      }
      this.plungeVersion = solver.plungeVersion;
      // The water: all of it when the device may hold other water, else the cells the CPU changed since it last held the
      // solver's (a board's push, a lip's landing), the same f32 values either way: a cell that came back from the device
      // goes up as the bits it came back as (canyon-perf, 2026-10-29).
      if (this.waterStale || solver.waterChangedAll) {
        DEVICE_UPLOAD.forEach((index, k) => {
          const source = index === FIELD.H ? solver.h : index === FIELD.QX ? solver.qx : solver.qz;
          this.upload.set(source, k * n);
        });
        this.write(this.fields, FIELD.H * n * 4, this.upload);
      } else if (solver.waterChangedFrom <= solver.waterChangedTo) {
        const from = solver.waterChangedFrom;
        const count = solver.waterChangedTo - from + 1;
        DEVICE_UPLOAD.forEach((index, k) => {
          const source = index === FIELD.H ? solver.h : index === FIELD.QX ? solver.qx : solver.qz;
          this.upload.set(source.subarray(from, from + count), k * n + from);
          this.write(this.fields, (index * n + from) * 4, this.upload, k * n + from, count);
        });
      }
      if (this.zone) {
        packComponents(this.zone.boundary, solver.time, solver.xCenters[0], this.components);
        this.write(this.sea, 0, this.components);
      }
      if (this.zone?.feed && this.feedSlots > 0) {
        // Only the time block changes from frame to frame.
        packSideTimes(this.zone.feed, solver.time, this.feedPacked);
        this.write(this.feedBuffer, 0, this.feedPacked, 0, this.zone.feed.deviceShape().components * 3);
      }
      let phase = performance.now();
      diagnostics.pack = phase - started;
      const substeps = cflSubsteps(dt, solver.maxStableStep());
      let end = performance.now();
      diagnostics.cfl = end - phase;
      phase = end;
      const sub = dt / substeps;
      const cells = Math.ceil(n / WORKGROUP);
      // Every substep's Params first, then all of the frame's substeps (and the readback copies) in one submission: the
      // same kernels with the same parameters in the same order, but a single command buffer that a busy GPU (the
      // page's drawing) schedules once per frame instead of once per substep.
      this.reserveParams(substeps);
      const blocks = new Uint8Array(this.paramBlocks);
      for (let s = 0; s < substeps; s += 1) {
        writeParams(solver, layout, this.zone, sub, (s + 1) * sub, this.paramBytes);
        blocks.set(new Uint8Array(this.paramBytes), s * this.paramStride);
      }
      this.write(this.params, 0, this.paramBlocks, 0, substeps * this.paramStride);
      const encoder = device.createCommandEncoder();
      for (let s = 0; s < substeps; s += 1) {
        const pass = encoder.beginComputePass();
        pass.setBindGroup(0, this.bindGroup, [s * this.paramStride]);
        for (const kernel of this.kernels) {
          if (kernel === 'relax' && !this.zone) continue;
          if (kernel === 'relaxSides' && !(this.feedSlots > 0)) continue;
          pass.setPipeline(this.pipelines.get(kernel)!);
          const groups = kernel === 'rows' ? Math.ceil(solver.nz / WORKGROUP)
            : kernel === 'columns' ? Math.ceil(solver.nx / WORKGROUP)
              : kernel === 'relax' ? Math.ceil((this.zone!.rows * solver.nx) / WORKGROUP)
                : kernel === 'relaxSides' ? Math.ceil(this.feedSlots / WORKGROUP)
                : cells;
          pass.dispatchWorkgroups(groups);
        }
        pass.end();
      }
      if (readback) {
        DEVICE_READBACK.forEach((index, k) => encoder.copyBufferToBuffer(this.fields, index * n * 4, this.staging, k * n * 4, n * 4));
      }
      device.queue.submit([encoder.finish()]);
      // The device's water moves on: it holds the solver's again only once this step's result is unpacked.
      this.waterStale = true;
      transfer.submits += 1;
      if (!deferred) this.lastSubsteps = substeps;
      diagnostics.substeps = substeps;
      end = performance.now();
      diagnostics.encode = end - phase;
      phase = end;
      if (!readback) {
        await device.queue.onSubmittedWorkDone();
        diagnostics.map = performance.now() - phase;
        diagnostics.unpack = 0;
        solver.time += dt;
        this.lastStepMs = performance.now() - started;
        Object.assign(this.transfer, transfer);
        return;
      }
      transfer.maps += 1;
      transfer.readbackBytes += this.staging.size;
      await this.staging.mapAsync(GPUMapMode.READ);
      mapped = true;
      end = performance.now();
      diagnostics.map = end - phase;
      phase = end;
      const back = new Float32Array(this.staging.getMappedRange());
      if (deferred && this.disposed) {
        this.staging.unmap(); mapped = false; this.preparing = false; this.version = -1; this.plungeVersion = -1;
        return undefined;
      }
      if (deferred) {
        const readyMs = end - started;
        let active = true;
        const discard = () => {
          if (!active) return;
          active = false;
          if (this.disposed || !this.canonicalReadback()) this.privateUnusable = true;
          this.staging.unmap(); mapped = false;
          this.preparing = false;
          this.discardPrepared = undefined;
          // GPU carried strength/age/predictor fields already moved forward: a discarded result must rebase all of them.
          this.version = -1; this.plungeVersion = -1;
        };
        this.discardPrepared = discard;
        return Object.freeze({
          commit: () => {
            if (!active) return false;
            if (!this.prefetchEligible()) {
              this.privateUnusable = true; discard();
              throw new Error('Private water prefetch device no longer supports canonical readback');
            }
            if (solver.time !== sourceTime || solver.deviceLayout().version !== sourceVersion || solver.plungeVersion !== sourcePlunge) {
              discard(); return false;
            }
            const unpackStart = performance.now();
            DEVICE_READBACK.forEach((index, k) => readbackTarget(solver, index).set(back.subarray(k * n, (k + 1) * n)));
            solver.waterHeld();
            this.waterStale = false;
            this.staging.unmap(); mapped = false;
            active = false; this.preparing = false; this.discardPrepared = undefined;
            solver.adoptDeviceStep(dt);
            diagnostics.unpack = performance.now() - unpackStart;
            Object.assign(this.diagnostics, diagnostics);
            Object.assign(this.transfer, transfer);
            this.lastSubsteps = substeps;
            this.lastStepMs = readyMs + diagnostics.unpack;
            return true;
          },
          discard,
        });
      }
      DEVICE_READBACK.forEach((index, k) => {
        const view = back.subarray(k * n, (k + 1) * n);
        readbackTarget(solver, index).set(view);
      });
      solver.waterHeld();
      this.waterStale = false;
      this.staging.unmap(); mapped = false;
      solver.adoptDeviceStep(dt);
      diagnostics.unpack = performance.now() - phase;
      Object.assign(this.transfer, transfer);
      this.lastStepMs = performance.now() - started;
    } catch (error) {
      if (deferred) {
        if (mapped) this.staging.unmap();
        this.preparing = false; this.discardPrepared = undefined;
        this.version = -1; this.plungeVersion = -1;
      }
      throw error;
    }
  }

  /** Bed, still depth and slopes, zone weights, the carried breaking and predictor state and the plunge zone (after a window shift). */
  private writeLayout(layout: BoussinesqDeviceLayout): void {
    const { solver, n, field } = this;
    const weights = this.zone?.boundary.weights;
    const predictor = solver.predictor;
    for (const index of DEVICE_LAYOUT) {
      const source = index === FIELD.BED ? solver.bed : index === FIELD.STILL ? layout.still
        : index === FIELD.DDX ? layout.slopeX : index === FIELD.DDZ ? layout.slopeZ
          : index === FIELD.WEIGHT ? weights : index === FIELD.STRENGTH ? solver.breakingStrength
            : index === FIELD.AGE ? solver.breakingAge : index === FIELD.PREDX ? predictor?.x
              : index === FIELD.PREDZ ? predictor?.z : solver.plungeHold;
      if (source) field.set(source);
      else field.fill(0);
      this.write(this.fields, index * n * 4, field);
    }
    // The onset over the bed, where it varies (`KennedyOptions.onsetAt`): only then is it read.
    const onsetFactor = layout.breaking?.onsetFactor;
    if (onsetFactor) {
      field.set(onsetFactor);
      this.write(this.fields, FIELD.ONSET * n * 4, field);
    }
    const joinField = layout.breaking?.joinField;
    if (joinField) {
      field.set(joinField);
      this.write(this.fields, FIELD.JOIN * n * 4, field);
    }
    this.write(this.grid, 0, packGrid(solver, layout));
    this.writeFeed();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.privateOwnerUsed) this.privateUnusable = true;
    this.discardPrepared?.();
    this.device.destroy();
  }
}
