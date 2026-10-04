/** QA comparisons only. Callers retain views so successful whole-grid checks allocate nothing. */
export function exactBytes(a: ArrayBufferView, b: ArrayBufferView, label: string): void {
  if (a.byteLength !== b.byteLength) throw Error(`${label}: byte lengths ${a.byteLength}/${b.byteLength}`);
  const x = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const y = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) throw Error(`${label}: byte ${i}: ${x[i]}/${y[i]}`);
}

export interface BytePair { a: ArrayBufferView; b: ArrayBufferView; x: Uint32Array | Uint8Array; y: Uint32Array | Uint8Array; name: string; currentA?: () => unknown; currentB?: () => unknown }
export function bytePair(a: ArrayBufferView, b: ArrayBufferView, name: string): BytePair {
  if (a.byteLength !== b.byteLength) throw Error(`${name}: different byte lengths`);
  const words = a.byteOffset % 4 === 0 && b.byteOffset % 4 === 0 && a.byteLength % 4 === 0;
  return { a, b, name, x: words ? new Uint32Array(a.buffer, a.byteOffset, a.byteLength / 4) : new Uint8Array(a.buffer, a.byteOffset, a.byteLength),
    y: words ? new Uint32Array(b.buffer, b.byteOffset, b.byteLength / 4) : new Uint8Array(b.buffer, b.byteOffset, b.byteLength) };
}
export function comparePairs(pairs: readonly BytePair[]): void {
  for (let k = 0; k < pairs.length; k += 1) {
    const p = pairs[k];
    if (p.currentA && p.currentA() !== p.a || p.currentB && p.currentB() !== p.b) throw Error(`${p.name}: current array identity changed`);
    for (let i = 0; i < p.x.length; i += 1) if (p.x[i] !== p.y[i]) throw Error(`${p.name}: word ${i}: ${p.x[i]}/${p.y[i]}`);
  }
}
export function exactScalar(a: unknown, b: unknown, name: string): void {
  if (!Object.is(a, b)) throw Error(`${name}: ${String(a)}/${String(b)}`);
}
/** Detailed lifecycle evidence before cost only. It is deliberately not called after timed rows. */
export function exactTree(a: unknown, b: unknown, name: string): void {
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) { exactBytes(a, b, name); return; }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aa = a as Record<string, unknown>, bb = b as Record<string, unknown>;
    const keys = Object.keys(aa), other = Object.keys(bb);
    if (keys.length !== other.length) throw Error(`${name}: key lengths`);
    for (let i = 0; i < keys.length; i += 1) {
      if (keys[i] !== other[i]) throw Error(`${name}: key order ${i}`);
      exactTree(aa[keys[i]], bb[keys[i]], `${name}.${keys[i]}`);
    }
    return;
  }
  exactScalar(a, b, name);
}

export function verifyStateWords(raw: Uint8Array, arrays: Record<string, Float32Array | Float64Array>): void {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  if (raw.length < 8 || view.getUint32(0, true) !== 0x53455431) throw Error('SET1 magic/length');
  const headerLength = view.getUint32(4, true);
  if (8 + headerLength > raw.length) throw Error('SET1 header length');
  const header = JSON.parse(new TextDecoder().decode(raw.subarray(8, 8 + headerLength))) as { arrays: [string, number][] };
  let offset = 8 + Math.ceil(headerLength / 4) * 4;
  for (const [name, length] of header.arrays) {
    const array = arrays[name];
    if (!(array instanceof Float32Array) || array.length !== length) throw Error(`SET1 decoded field ${name}`);
    const words = new Uint32Array(array.buffer, array.byteOffset, array.length);
    if (offset + length * 4 > raw.length) throw Error(`SET1 truncated ${name}`);
    for (let i = 0; i < length; i += 1) if (words[i] !== view.getUint32(offset + i * 4, true)) throw Error(`SET1 offset/word ${name}[${i}]`);
    offset += length * 4;
  }
  if (offset !== raw.length || Object.keys(arrays).length !== header.arrays.length) throw Error('SET1 total field/byte length');
}
export function stats(values: readonly number[]) {
  if (values.length === 0 || values.some(v => !Number.isFinite(v))) throw Error('Timing values invalid');
  const sorted = [...values].sort((a, b) => a - b), n = sorted.length;
  return { median: (sorted[(n - 1) >> 1] + sorted[n >> 1]) / 2, mean: values.reduce((a, b) => a + b, 0) / n,
    p95: sorted[Math.ceil(n * .95) - 1], min: sorted[0], max: sorted[n - 1] };
}

/** Snapshot views are reused. Payload and property identity checks are separate. */
export function directArrays(object: object): Record<string, ArrayBufferView> {
  const result: Record<string, ArrayBufferView> = {};
  for (const [key, value] of Object.entries(object)) if (ArrayBuffer.isView(value)) result[key] = value;
  return result;
}
