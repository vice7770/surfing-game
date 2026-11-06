/**
 * A stand-in WebGPU device with memory, for Node (barrel-gpu, 2026-11-06): `GpuBoussinesq` runs its real upload,
 * submit and readback code against it. Every `writeBuffer` lands in the buffer's bytes and is counted by what it wrote
 * (the water's three fields, the plunge zone, the other layout fields, everything else); each submission runs `kernel`
 * once on the fields buffer (a whole frame's substeps), then its copies; each map is counted with the bytes it maps.
 * No WGSL runs: `kernel` stands in for the device's step.
 */
import { FIELD, FIELD_COUNT } from '../../../src/wave/gpu/boussinesqWgsl';

export interface Traffic {
  /** Bytes written into h, qx and qz, and how many of those writes there were. */
  waterBytes: number; waterWrites: number;
  /** Writes that covered all three fields whole (a full water upload). */
  fullWater: number;
  /** Bytes written into the plunge zone (HOLD). */
  holdBytes: number;
  /** Bytes written into the other per-cell fields (the layout: bed, still depth, slopes, carried breaking and predictor). */
  layoutBytes: number;
  /** Bytes written anywhere else (Params, the sea's components, the side feed, the grid). */
  otherBytes: number;
  writes: number;
  /** Bytes copied into the staging buffer, maps and their mapped bytes, submissions. */
  copyBytes: number; maps: number; mappedBytes: number; submits: number;
}

export const emptyTraffic = (): Traffic => ({
  waterBytes: 0, waterWrites: 0, fullWater: 0, holdBytes: 0, layoutBytes: 0, otherBytes: 0, writes: 0,
  copyBytes: 0, maps: 0, mappedBytes: 0, submits: 0,
});

export function installGpuGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  g.GPUBufferUsage ??= { MAP_READ: 1, MAP_WRITE: 2, COPY_SRC: 4, COPY_DST: 8, INDEX: 16, VERTEX: 32, UNIFORM: 64, STORAGE: 128, INDIRECT: 256, QUERY_RESOLVE: 512 };
  g.GPUShaderStage ??= { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
  g.GPUMapMode ??= { READ: 1, WRITE: 2 };
}

class FakeBuffer {
  readonly bytes: Uint8Array;
  private mapped = false;
  constructor(readonly size: number, readonly usage: number, private readonly owner: FakeDevice) { this.bytes = new Uint8Array(size); }
  async mapAsync(): Promise<void> {
    this.owner.traffic.maps += 1;
    this.owner.traffic.mappedBytes += this.size;
    this.mapped = true;
  }
  getMappedRange(): ArrayBuffer {
    if (!this.mapped) throw new Error('unmapped read');
    return this.bytes.buffer as ArrayBuffer;
  }
  unmap(): void { this.mapped = false; }
  destroy(): void {}
}

/** The device: `cells` per field, and a step standing in for the kernels (it reads and writes the fields as f32). */
export class FakeDevice {
  traffic: Traffic = emptyTraffic();
  fields?: FakeBuffer;
  /** Each submission's fields, hashed by `onSubmit` before the kernel runs (what the kernels would read). */
  onSubmit?: (fields: Float32Array) => void;
  readonly limits = { minUniformBufferOffsetAlignment: 256 };
  readonly queue = {
    writeBuffer: (buffer: FakeBuffer, offset: number, data: ArrayBuffer | ArrayBufferView, dataOffset = 0, size?: number) => {
      const unit = data instanceof ArrayBuffer ? 1 : (data as Float32Array).BYTES_PER_ELEMENT;
      const base = data instanceof ArrayBuffer ? data : data.buffer;
      const start = (data instanceof ArrayBuffer ? 0 : data.byteOffset) + dataOffset * unit;
      const length = (size ?? ((data instanceof ArrayBuffer ? data.byteLength : (data as Float32Array).length) - dataOffset)) * unit;
      buffer.bytes.set(new Uint8Array(base, start, length), offset);
      const t = this.traffic;
      t.writes += 1;
      if (buffer === this.fields) {
        const field = this.cells * 4;
        const end = offset + length;
        const water = Math.max(0, Math.min(end, 3 * field) - offset);
        if (water > 0) { t.waterBytes += water; t.waterWrites += 1; }
        if (offset === 0 && length >= 3 * field) t.fullWater += 1;
        const holdFrom = FIELD.HOLD * field;
        const hold = Math.max(0, Math.min(end, holdFrom + field) - Math.max(offset, holdFrom));
        t.holdBytes += hold;
        t.layoutBytes += length - water - hold;
      } else t.otherBytes += length;
    },
    submit: (commands: { run(): void }[]) => {
      this.traffic.submits += 1;
      for (const command of commands) command.run();
    },
    onSubmittedWorkDone: async () => {},
  };

  constructor(readonly cells: number, private readonly kernel: (fields: Float32Array) => void) {}

  createBuffer({ size, usage }: { size: number; usage: number }): FakeBuffer {
    const buffer = new FakeBuffer(size, usage, this);
    if (size === FIELD_COUNT * this.cells * 4) this.fields = buffer;
    return buffer;
  }
  createBindGroupLayout() { return {}; }
  createPipelineLayout() { return {}; }
  createBindGroup() { return {}; }
  createComputePipeline() { return {}; }
  createShaderModule() { return { getCompilationInfo: async () => ({ messages: [] }) }; }
  createCommandEncoder() {
    const jobs: (() => void)[] = [];
    let passes = 0;
    const device = this;
    return {
      beginComputePass() {
        passes += 1;
        return { setBindGroup() {}, setPipeline() {}, dispatchWorkgroups() {}, end() {} };
      },
      copyBufferToBuffer(source: FakeBuffer, sourceOffset: number, target: FakeBuffer, targetOffset: number, size: number) {
        jobs.push(() => {
          target.bytes.set(source.bytes.subarray(sourceOffset, sourceOffset + size), targetOffset);
          device.traffic.copyBytes += size;
        });
      },
      finish() {
        return {
          run: () => {
            if (passes > 0 && device.fields) {
              const fields = new Float32Array(device.fields.bytes.buffer);
              device.onSubmit?.(fields);
              device.kernel(fields);
            }
            for (const job of jobs) job();
          },
        };
      },
    };
  }
  destroy() {}
}

/** A `GPU` whose adapter hands out `device`. */
export function fakeGpu(device: FakeDevice): GPU {
  return { requestAdapter: async () => ({ limits: { maxStorageBufferBindingSize: 1e12, maxBufferSize: 1e12 }, requestDevice: async () => device }) } as unknown as GPU;
}
