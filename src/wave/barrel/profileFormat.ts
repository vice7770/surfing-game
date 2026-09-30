import type { BarrelCase } from './ProfileLibrary';

const MAGIC = 0x42524c31; // "BRL1"

/**
 * A barrel case as bytes (public/barrels/<id>.bin): a JSON header (every field but the frames), then the frames as
 * 32-bit floats, as the sea handover lays out its state.
 *
 *   u32 magic · u32 header length · header (UTF-8 JSON) · padding to 4 · float32 frames
 */
export function encodeCase(c: BarrelCase): Uint8Array {
  const { frames, ...meta } = c;
  const header = new TextEncoder().encode(JSON.stringify(meta));
  const start = 8 + Math.ceil(header.length / 4) * 4;
  const bytes = new Uint8Array(start + frames.length * 4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, header.length, true);
  bytes.set(header, 8);
  new Float32Array(bytes.buffer, start, frames.length).set(frames);
  return bytes;
}

export function decodeCase(bytes: Uint8Array): BarrelCase {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 8 || view.getUint32(0, true) !== MAGIC) throw new Error('Not a barrel case');
  const length = view.getUint32(4, true);
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))) as Omit<BarrelCase, 'frames'>;
  const start = 8 + Math.ceil(length / 4) * 4;
  // Copy, so the floats are aligned whatever the bytes' own offset.
  return { ...meta, frames: new Float32Array(bytes.slice(start).buffer) };
}
