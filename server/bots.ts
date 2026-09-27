import { readFileSync } from 'node:fs';
import { BOARD_DESIGNS } from '../src/scene/board/boardDesigns';
import { OUTFIT_CHOICES, SUIT_COLORS, SURFER_BODIES } from '../src/game/SurferChoice';
import { POSE_BYTES } from '../src/net/poseCodec';
import type { PlayerLook } from '../src/net/protocol';

/**
 * Dev bots (spec N1): surfers that replay a recorded autopilot track
 * (`npm run bots:record`), to fill a room for measuring frame time, bandwidth
 * and crowding. The server only has them when started with BOTS=1.
 */
export interface BotSource {
  /** Poses at 20 Hz, POSE_BYTES each. */
  frames: Uint8Array;
  count: number;
}

export function botSourceFrom(frames: Uint8Array): BotSource {
  return { frames, count: Math.floor(frames.byteLength / POSE_BYTES) };
}

/** A track file: u32 frame count, then the frames. */
export function encodeBotTrack(frames: readonly Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(4 + frames.length * POSE_BYTES);
  new DataView(bytes.buffer).setUint32(0, frames.length, true);
  frames.forEach((frame, i) => bytes.set(frame.subarray(0, POSE_BYTES), 4 + i * POSE_BYTES));
  return bytes;
}

export function loadBotSource(path: string | URL): BotSource | undefined {
  try {
    const bytes = new Uint8Array(readFileSync(path));
    const count = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
    if (count < 1 || bytes.byteLength < 4 + count * POSE_BYTES) return undefined;
    return { frames: bytes.subarray(4, 4 + count * POSE_BYTES), count };
  } catch {
    return undefined;
  }
}

/** A random bot's looks, from what the game offers. */
export function botLook(random: (count: number) => Uint8Array): PlayerLook {
  const [a, b, c, d] = random(4);
  const colors = Object.keys(SUIT_COLORS);
  return {
    body: SURFER_BODIES[a % SURFER_BODIES.length].id,
    outfit: OUTFIT_CHOICES[b % OUTFIT_CHOICES.length],
    color: colors[c % colors.length],
    board: BOARD_DESIGNS[d % BOARD_DESIGNS.length].id,
  };
}

/** Bots keep inside the tank's 160 m of shore, m. */
const X_LIMIT = 75;

/** A bot's next pose: its track's frame at `frame`, moved `shift` m along shore and stamped with the room's `step`. */
export function botPose(source: BotSource, frame: number, shift: number, step: number, out: Uint8Array): Uint8Array {
  const start = (frame % source.count) * POSE_BYTES;
  out.set(source.frames.subarray(start, start + POSE_BYTES));
  const view = new DataView(out.buffer, out.byteOffset, POSE_BYTES);
  view.setUint32(0, Math.max(0, step), true);
  const move = (offset: number) => {
    const x = view.getInt16(offset, true) / 100 + shift;
    view.setInt16(offset, Math.round(Math.max(-X_LIMIT, Math.min(X_LIMIT, x)) * 100), true);
  };
  move(4);
  move(64);
  return out;
}
