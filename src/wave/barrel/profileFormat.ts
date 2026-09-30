import { PROFILE_POINTS, type BarrelCase } from './ProfileLibrary';

const MAGIC = 0x42524c32; // "BRL2"
/** "BRL1": the frames alone, before the tip's velocities (Part B, PR 4). */
const LEGACY = 0x42524c31;

/**
 * A barrel case as bytes (public/barrels/<id>.bin): a JSON header (every field but the frames and the tip's
 * velocities), then the frames and the tip's velocities as 32-bit floats, as the sea handover lays out its state.
 *
 *   u32 magic · u32 header length · header (UTF-8 JSON) · padding to 4 · float32 frames · float32 tip velocities (2 per frame)
 *
 * A BRL1 file has no tip velocities; it decodes without them (zero in the lookup).
 */
export function encodeCase(c: BarrelCase): Uint8Array {
  const { frames, tipVelocity, ...meta } = c;
  const tip = tipVelocity ?? new Float32Array(2 * (frames.length / (2 * PROFILE_POINTS)));
  const header = new TextEncoder().encode(JSON.stringify(meta));
  const start = 8 + Math.ceil(header.length / 4) * 4;
  const bytes = new Uint8Array(start + (frames.length + tip.length) * 4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, header.length, true);
  bytes.set(header, 8);
  new Float32Array(bytes.buffer, start, frames.length).set(frames);
  new Float32Array(bytes.buffer, start + frames.length * 4, tip.length).set(tip);
  return bytes;
}

export function decodeCase(bytes: Uint8Array): BarrelCase {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = bytes.byteLength < 8 ? 0 : view.getUint32(0, true);
  if (magic !== MAGIC && magic !== LEGACY) throw new Error('Not a barrel case');
  const length = view.getUint32(4, true);
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))) as Omit<BarrelCase, 'frames' | 'tipVelocity'>;
  const start = 8 + Math.ceil(length / 4) * 4;
  // Copy, so the floats are aligned whatever the bytes' own offset.
  const floats = new Float32Array(bytes.slice(start).buffer);
  if (magic === LEGACY) return { ...meta, frames: floats };
  const count = floats.length / (2 * PROFILE_POINTS + 2);
  return { ...meta, frames: floats.slice(0, count * 2 * PROFILE_POINTS), tipVelocity: floats.slice(count * 2 * PROFILE_POINTS) };
}
