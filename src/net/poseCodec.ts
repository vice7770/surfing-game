/**
 * A surfer's pose on the wire (spec N1): 76 bytes, little-endian, sent 20
 * times a second. Positions are centimetres (±327 m covers the tank), the
 * board's height above its owner's water millimetres, the quaternion and the
 * heading fixed-point; the board's push on the water rides along so every
 * player's water feels every board.
 *
 * | offset | field |
 * |---|---|
 * | 0 | u32 room sea-time step |
 * | 4 | i16 ×2 board x, z (cm) |
 * | 8 | i16 lift above the owner's water (mm) |
 * | 10 | i16 ×4 quaternion ×32767 |
 * | 18 | i16 ×21 rider points relative to the board: mm with flag 64, else cm (the bots' recorded tracks, and a swimmer beyond 32 m of a lost board) |
 * | 60 | u8 phase (255 = no rider) |
 * | 61 | u8 flags: 1 rider present, 2 board present, 4 paddling, 8 leash snapped, 16 duck-diving, 32 diving (the wipeout spec; older readers ignore them), 64 the points in mm (the riding-body plan, step 7: centimetres tilted a drawn chest 1.7° a step) |
 * | 62 | i16 heading ×10000 |
 * | 64 | i16 ×2 reaction point x, z (cm) |
 * | 68 | f32 ×2 reaction impulse x, z (N·s) |
 */
export const POSE_BYTES = 76;
/**
 * A handed-over sea (spec N1), both ways through the server: kind, flags (1 =
 * deflated), u16 0, u32 request id, then the encoded state (`encodeSurfZoneState`).
 */
export const SEA_KIND = 2;
const SEA_HEADER = 8;

export function encodeSeaFrame(request: number, bytes: Uint8Array, deflated: boolean): Uint8Array {
  const frame = new Uint8Array(SEA_HEADER + bytes.byteLength);
  const view = new DataView(frame.buffer);
  view.setUint8(0, SEA_KIND);
  view.setUint8(1, deflated ? 1 : 0);
  view.setUint32(4, request, true);
  frame.set(bytes, SEA_HEADER);
  return frame;
}

/** A sea frame's request id, flags and payload; undefined for anything else (a pose is exactly POSE_BYTES, a bundle is kind 1). */
export function readSeaFrame(data: Uint8Array): { request: number; deflated: boolean; bytes: Uint8Array } | undefined {
  if (data.byteLength <= SEA_HEADER || data.byteLength === POSE_BYTES || data[0] !== SEA_KIND) return undefined;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { request: view.getUint32(4, true), deflated: (data[1] & 1) === 1, bytes: data.subarray(SEA_HEADER) };
}

/** The server's bundle of others' poses: kind, 0, u16 count, then (u16 id, pose) each. */
export const BUNDLE_KIND = 1;
const BUNDLE_HEADER = 4;
const BUNDLE_ENTRY = 2 + POSE_BYTES;

const FLAG_PRESENT = 1;
const FLAG_BOARD = 2;
const FLAG_PADDLING = 4;
const FLAG_LEASH_SNAPPED = 8;
const FLAG_DUCKING = 16;
const FLAG_DIVING = 32;
const FLAG_MILLIMETRES = 64;
/** Beyond this from the board, m, a point does not fit millimetres in an i16: the pose's points go in centimetres. */
const MILLIMETRE_REACH = 32.767;
const NO_RIDER = 255;

export interface SurferPose {
  /** Room sea time in fixed steps (`SURF_ZONE_STEP`). */
  step: number;
  x: number;
  z: number;
  /** The board's height above its owner's water surface, m: drawn on each player's own water. */
  lift: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  /** The rider's seven drawn points (x, y, z each) relative to the board's position, m. */
  points: Float32Array;
  /** Index in `RIDER_PHASES`, or −1 with no rider. */
  phase: number;
  present: boolean;
  boardPresent: boolean;
  paddling: boolean;
  /** The wipeout spec: the leash has snapped, the rider is duck-diving, the fallen surfer dives. */
  leashSnapped: boolean;
  ducking: boolean;
  diving: boolean;
  heading: number;
  /** The board's push on the water since the last pose: its impulse-weighted point and summed impulse. */
  reaction: { x: number; z: number; jx: number; jz: number };
}

export function createPose(): SurferPose {
  return {
    step: 0, x: 0, z: 0, lift: 0, qx: 0, qy: 0, qz: 0, qw: 1, points: new Float32Array(21), phase: -1,
    present: false, boardPresent: false, paddling: false, leashSnapped: false, ducking: false, diving: false, heading: 0,
    reaction: { x: 0, z: 0, jx: 0, jz: 0 },
  };
}

function i16(value: number): number {
  return Number.isFinite(value) ? Math.max(-32768, Math.min(32767, Math.round(value))) : 0;
}

export function encodePose(pose: SurferPose, view: DataView, offset: number): void {
  view.setUint32(offset, Math.max(0, Math.min(0xffffffff, Math.round(pose.step))), true);
  view.setInt16(offset + 4, i16(pose.x * 100), true);
  view.setInt16(offset + 6, i16(pose.z * 100), true);
  view.setInt16(offset + 8, i16(pose.lift * 1000), true);
  const norm = Math.hypot(pose.qx, pose.qy, pose.qz, pose.qw) || 1;
  view.setInt16(offset + 10, i16((pose.qx / norm) * 32767), true);
  view.setInt16(offset + 12, i16((pose.qy / norm) * 32767), true);
  view.setInt16(offset + 14, i16((pose.qz / norm) * 32767), true);
  view.setInt16(offset + 16, i16((pose.qw / norm) * 32767), true);
  const near = pose.points.every((value) => Math.abs(value) <= MILLIMETRE_REACH);
  const scale = near ? 1000 : 100;
  for (let i = 0; i < 21; i += 1) view.setInt16(offset + 18 + i * 2, i16(pose.points[i] * scale), true);
  view.setUint8(offset + 60, pose.phase >= 0 && pose.phase < NO_RIDER ? Math.round(pose.phase) : NO_RIDER);
  view.setUint8(offset + 61, (pose.present ? FLAG_PRESENT : 0) | (pose.boardPresent ? FLAG_BOARD : 0) | (pose.paddling ? FLAG_PADDLING : 0)
    | (pose.leashSnapped ? FLAG_LEASH_SNAPPED : 0) | (pose.ducking ? FLAG_DUCKING : 0) | (pose.diving ? FLAG_DIVING : 0) | (near ? FLAG_MILLIMETRES : 0));
  view.setInt16(offset + 62, i16(pose.heading * 10000), true);
  view.setInt16(offset + 64, i16(pose.reaction.x * 100), true);
  view.setInt16(offset + 66, i16(pose.reaction.z * 100), true);
  view.setFloat32(offset + 68, Number.isFinite(pose.reaction.jx) ? pose.reaction.jx : 0, true);
  view.setFloat32(offset + 72, Number.isFinite(pose.reaction.jz) ? pose.reaction.jz : 0, true);
}

export function decodePose(view: DataView, offset: number, out: SurferPose): SurferPose {
  out.step = view.getUint32(offset, true);
  out.x = view.getInt16(offset + 4, true) / 100;
  out.z = view.getInt16(offset + 6, true) / 100;
  out.lift = view.getInt16(offset + 8, true) / 1000;
  out.qx = view.getInt16(offset + 10, true) / 32767;
  out.qy = view.getInt16(offset + 12, true) / 32767;
  out.qz = view.getInt16(offset + 14, true) / 32767;
  out.qw = view.getInt16(offset + 16, true) / 32767;
  const phase = view.getUint8(offset + 60);
  out.phase = phase === NO_RIDER ? -1 : phase;
  const flags = view.getUint8(offset + 61);
  const scale = (flags & FLAG_MILLIMETRES) !== 0 ? 1000 : 100;
  for (let i = 0; i < 21; i += 1) out.points[i] = view.getInt16(offset + 18 + i * 2, true) / scale;
  out.present = (flags & FLAG_PRESENT) !== 0;
  out.boardPresent = (flags & FLAG_BOARD) !== 0;
  out.paddling = (flags & FLAG_PADDLING) !== 0;
  out.leashSnapped = (flags & FLAG_LEASH_SNAPPED) !== 0;
  out.ducking = (flags & FLAG_DUCKING) !== 0;
  out.diving = (flags & FLAG_DIVING) !== 0;
  out.heading = view.getInt16(offset + 62, true) / 10000;
  out.reaction.x = view.getInt16(offset + 64, true) / 100;
  out.reaction.z = view.getInt16(offset + 66, true) / 100;
  out.reaction.jx = view.getFloat32(offset + 68, true);
  out.reaction.jz = view.getFloat32(offset + 72, true);
  return out;
}

/** The server's bundle: each entry's id and its player's latest pose bytes. */
export function encodeBundle(entries: readonly { id: number; pose: Uint8Array }[]): Uint8Array {
  const bytes = new Uint8Array(BUNDLE_HEADER + entries.length * BUNDLE_ENTRY);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, BUNDLE_KIND);
  view.setUint16(2, entries.length, true);
  entries.forEach((entry, i) => {
    const offset = BUNDLE_HEADER + i * BUNDLE_ENTRY;
    view.setUint16(offset, entry.id, true);
    bytes.set(entry.pose.subarray(0, POSE_BYTES), offset + 2);
  });
  return bytes;
}

/** Visits each pose in a bundle (its id, and where its bytes start); a malformed bundle visits nothing. Returns the count. */
export function readBundle(data: ArrayBuffer, visit: (id: number, view: DataView, offset: number) => void): number {
  if (data.byteLength < BUNDLE_HEADER) return 0;
  const view = new DataView(data);
  const count = view.getUint16(2, true);
  if (view.getUint8(0) !== BUNDLE_KIND || data.byteLength !== BUNDLE_HEADER + count * BUNDLE_ENTRY) return 0;
  for (let i = 0; i < count; i += 1) {
    const offset = BUNDLE_HEADER + i * BUNDLE_ENTRY;
    visit(view.getUint16(offset, true), view, offset + 2);
  }
  return count;
}
