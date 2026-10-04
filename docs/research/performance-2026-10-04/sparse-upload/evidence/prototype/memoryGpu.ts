/** Protocol-only WebGPU memory recorder. It does not emulate WGSL or prove physical GPU parity. */
export class MemoryBuffer {
  readonly bytes: ArrayBuffer;
  constructor(readonly size: number, private readonly owner: MemoryGpu) { this.bytes = new ArrayBuffer(size); }
  async mapAsync(): Promise<void> {
    if (this.owner.failMap) { this.owner.failMap = false; throw new Error('injected map failure'); }
  }
  getMappedRange(): ArrayBuffer { return this.bytes; }
  unmap(): void {}
  destroy(): void {}
}

export class MemoryGpu {
  readonly buffers: MemoryBuffer[] = [];
  readonly waterWrites: { offset: number; bytes: number }[] = [];
  /** First three field bytes immediately before the recorded compute pass starts. */
  readonly inputs: Uint8Array[] = [];
  /** Last staging copy: all nine readback fields, with their original field order. */
  readonly readbacks: Uint8Array[] = [];
  onCompute?: (fields: Float32Array) => void;
  failMap = false;
  destroyed = false;

  constructor(private readonly cells: number) {}

  private write(buffer: MemoryBuffer, offset: number, data: ArrayBuffer | ArrayBufferView, dataOffset = 0, size?: number): void {
    const typed = ArrayBuffer.isView(data);
    const element = typed && 'BYTES_PER_ELEMENT' in data ? Number(data.BYTES_PER_ELEMENT) : 1;
    const sourceOffset = typed ? data.byteOffset : 0;
    const sourceLength = typed ? data.byteLength : data.byteLength;
    const bytes = new Uint8Array(typed ? data.buffer : data, sourceOffset + dataOffset * element,
      size === undefined ? sourceLength - dataOffset * element : size * element);
    new Uint8Array(buffer.bytes, offset, bytes.length).set(bytes);
    if (buffer === this.buffers[0] && offset < 3 * this.cells * 4) this.waterWrites.push({ offset, bytes: bytes.length });
  }

  readonly device = {
    queue: {
      writeBuffer: (buffer: MemoryBuffer, offset: number, data: ArrayBuffer | ArrayBufferView, dataOffset?: number, size?: number) =>
        this.write(buffer, offset, data, dataOffset, size),
      submit: (commands: { run(): void }[]) => { for (const command of commands) command.run(); },
      onSubmittedWorkDone: async () => {},
    },
    createBuffer: ({ size }: { size: number }) => {
      const buffer = new MemoryBuffer(size, this);
      this.buffers.push(buffer);
      return buffer;
    },
    createBindGroupLayout: () => ({}), createPipelineLayout: () => ({}), createBindGroup: () => ({}),
    createComputePipeline: () => ({}),
    createShaderModule: () => ({ getCompilationInfo: async () => ({ messages: [] }) }),
    createCommandEncoder: () => {
      const copies: (() => void)[] = [];
      return {
        beginComputePass: () => ({ setBindGroup: () => {}, setPipeline: () => {}, dispatchWorkgroups: () => {}, end: () => {} }),
        copyBufferToBuffer: (from: MemoryBuffer, source: number, to: MemoryBuffer, target: number, size: number) => {
          copies.push(() => new Uint8Array(to.bytes, target, size).set(new Uint8Array(from.bytes, source, size)));
        },
        finish: () => ({ run: () => {
          this.inputs.push(new Uint8Array(this.buffers[0].bytes.slice(0, 3 * this.cells * 4)));
          this.onCompute?.(new Float32Array(this.buffers[0].bytes));
          for (const copy of copies) copy();
          if (copies.length) this.readbacks.push(new Uint8Array(this.buffers[4].bytes.slice(0)));
        } }),
      };
    },
    destroy: () => { this.destroyed = true; },
  };

  readonly gpu = { requestAdapter: async () => ({
    limits: { maxStorageBufferBindingSize: 1e9, maxBufferSize: 1e9 }, requestDevice: async () => this.device,
  }) } as unknown as GPU;

  takeWaterWrites(): { offset: number; bytes: number }[] {
    const writes = this.waterWrites.slice();
    this.waterWrites.length = 0;
    return writes;
  }
}
