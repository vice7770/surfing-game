import type { LipState } from './PlungingLip';
import type { FrontState } from './barrel/BreakingFront';

/**
 * A running sea as data (spec N1: the sea handover): its grid (to check it
 * fits), the solver's clock and the sea time it maps to, the arrays that carry
 * its history, the lip's counters and the lip itself.
 */
export interface SurfZoneState {
  nx: number;
  nz: number;
  solverTime: number;
  seaTimeOffset: number;
  arrays: Record<string, Float64Array | Float32Array>;
  /** `onsetsArmed`: whether the donor watches for new breakers (absent from states before Part B of the Teahupo'o Reef). */
  counters: { lipLaunches: number; lipVolume: number; lipJets: number; lipRollers: number; onsetsArmed?: boolean };
  lip: LipState;
  /** The swept barrel's breaking front, on the spots that run it (the Padang Padang spec, Part B). */
  front?: FrontState;
}

const MAGIC = 0x53455431; // "SET1"

/**
 * The state as bytes for the network: a JSON header (everything but the
 * arrays, and each array's name and length), then the arrays as 32-bit floats.
 * 32-bit rounding causes no drift (the drift report); ±Infinity survives it.
 *
 *   u32 magic · u32 header length · header (UTF-8 JSON) · padding to 4 · float32 arrays
 */
export function encodeSurfZoneState(state: SurfZoneState): Uint8Array {
  const names = Object.keys(state.arrays);
  const header = new TextEncoder().encode(JSON.stringify({
    nx: state.nx, nz: state.nz, solverTime: state.solverTime, seaTimeOffset: state.seaTimeOffset, counters: state.counters, lip: state.lip, front: state.front,
    arrays: names.map((name) => [name, state.arrays[name].length]),
  }));
  const start = 8 + Math.ceil(header.length / 4) * 4;
  const floats = names.reduce((sum, name) => sum + state.arrays[name].length, 0);
  const bytes = new Uint8Array(start + floats * 4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, header.length, true);
  bytes.set(header, 8);
  const out = new Float32Array(bytes.buffer, start, floats);
  let offset = 0;
  for (const name of names) {
    out.set(state.arrays[name], offset);
    offset += state.arrays[name].length;
  }
  return bytes;
}

export function decodeSurfZoneState(bytes: Uint8Array): SurfZoneState {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 8 || view.getUint32(0, true) !== MAGIC) throw new Error('Not a sea state');
  const length = view.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))) as Omit<SurfZoneState, 'arrays'> & { arrays: [string, number][] };
  const start = 8 + Math.ceil(length / 4) * 4;
  // Copy, so the floats are aligned whatever the bytes' own offset.
  const floats = new Float32Array(bytes.slice(start).buffer);
  const arrays: Record<string, Float32Array> = {};
  let offset = 0;
  for (const [name, count] of header.arrays) {
    if (offset + count > floats.length) throw new Error('A truncated sea state');
    arrays[name] = floats.subarray(offset, offset + count);
    offset += count;
  }
  return { ...header, arrays };
}

/** Deflate, where the platform has CompressionStream (every browser that runs WebGPU does); the bytes unchanged otherwise. */
export async function compress(bytes: Uint8Array): Promise<{ bytes: Uint8Array; deflated: boolean }> {
  if (typeof CompressionStream === 'undefined') return { bytes, deflated: false };
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return { bytes: new Uint8Array(await new Response(stream).arrayBuffer()), deflated: true };
}

export async function decompress(bytes: Uint8Array, deflated: boolean): Promise<Uint8Array> {
  if (!deflated) return bytes;
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
