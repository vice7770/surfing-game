import { DEFAULT_SURFER, sanitizeSurfer, type SurferSettings } from '../game/SurferChoice';
import type { SurfConditions, SwellSize, TideLevel, TimeOfDay, WindKind } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import { normalizeRoomCode } from './roomCode';

/** Room sizes a creator may choose (spec N1). */
export const ROOM_CAP = { min: 2, max: 50 } as const;
/** Poses sent and bundles relayed per second. */
export const POSE_HZ = 20;
/** Largest message a player may send, bytes; larger ones are dropped. */
export const MAX_MESSAGE_BYTES = 4096;
/** Messages a player may send per second; more are dropped. */
export const MAX_MESSAGES_PER_SECOND = 40;
/** Seconds in a row of too many messages before the player is disconnected. */
export const FLOOD_SECONDS = 5;
/** An empty room closes after this long, s. */
export const EMPTY_ROOM_SECONDS = 300;
/** A player not heard from in this long, s, vanishes for the others. */
export const SILENT_PLAYER_SECONDS = 5;
/** A handed-over sea may be this big, bytes (spec N1). */
export const MAX_SEA_BYTES = 8 * 1024 * 1024;
/** A donor gets this long to send its sea before the next is asked, s. */
export const SEA_DONOR_SECONDS = 10;
/** Longest name, characters. */
export const NAME_LENGTH = 16;
/** Most bots a dev room takes. */
export const MAX_BOTS = ROOM_CAP.max - 1;

/** Surf calls: "Left!", "Right!", "Party wave!", "Nice one!". */
export const CALLS = ['left', 'right', 'party', 'nice'] as const;
export type CallId = (typeof CALLS)[number];

const SPOTS: readonly SpotName[] = ['beach', 'point', 'reef', 'canyon'];
const SWELLS: readonly SwellSize[] = ['practice', 'small', 'medium', 'big'];
const TIDES: readonly TideLevel[] = ['low', 'mid', 'high'];
const WINDS: readonly WindKind[] = ['offshore', 'calm', 'onshore'];
const TIMES: readonly TimeOfDay[] = ['dawn', 'midday', 'sunset'];

/** What a room's creator chooses. */
export interface RoomSettings {
  spot: SpotName;
  conditions: SurfConditions;
  cap: number;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap: ROOM_CAP.max,
};

/** A running room: its settings, the sea's seed, the build it runs, and its clock (server ms at creation, and the sea time then). */
export interface RoomInfo extends RoomSettings {
  code: string;
  seed: number;
  build: string;
  seaTimeAtCreate: number;
  createdAt: number;
}

/** A surfer's looks as sent: plain strings, checked by `surferFor` on arrival. */
export interface PlayerLook {
  body: string;
  outfit: string;
  color: string;
  board: string;
}

export interface PlayerInfo {
  id: number;
  name: string;
  look: PlayerLook;
}

/** Why the server turned a player away. */
export type Refusal = 'full' | 'version' | 'notFound' | 'kicked' | 'invalid';

/** Player → server, as JSON text. Poses go separately, as binary (`poseCodec`). */
export type ClientMessage =
  | { type: 'create'; build: string; settings: RoomSettings; name: string; look: PlayerLook; bots?: number }
  | { type: 'join'; build: string; code: string; name: string; look: PlayerLook; token?: string }
  | { type: 'ping'; t: number }
  | { type: 'call'; call: CallId }
  | { type: 'ride'; distance: number; seconds: number }
  | { type: 'kick'; id: number }
  /** Ask for the room's sea: a handover from another player, or `fresh` when nobody can give one (spec N1). */
  | { type: 'needSea' };

/** Server → player, as JSON text. Poses come as binary bundles (`poseCodec`). */
export type ServerMessage =
  | { type: 'welcome'; room: RoomInfo; you: number; token: string; creator: boolean; players: PlayerInfo[] }
  | { type: 'joined'; player: PlayerInfo }
  | { type: 'left'; id: number }
  | { type: 'pong'; t: number; server: number }
  | { type: 'call'; id: number; call: CallId }
  | { type: 'ride'; id: number; distance: number; seconds: number }
  | { type: 'refused'; reason: Refusal }
  /** To a donor: send your sea for request `request` (a `SEA_KIND` frame). */
  | { type: 'seaRequest'; request: number }
  /** To a player who asked: no sea is coming, start a fresh one. */
  | { type: 'fresh' };

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function oneOf<T>(value: unknown, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? value as T : undefined;
}

function shortString(value: unknown, length: number): string | undefined {
  return typeof value === 'string' && value.length <= length ? value : undefined;
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** A name as others see it: control characters dropped, spaces collapsed, NAME_LENGTH at most; undefined when nothing is left. */
export function cleanName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_LENGTH).trim();
  return name || undefined;
}

export function parseRoomSettings(raw: unknown): RoomSettings | undefined {
  const value = record(raw);
  const conditions = record(value?.conditions);
  if (!value || !conditions) return undefined;
  const spot = oneOf(value.spot, SPOTS);
  const swell = oneOf(conditions.swell, SWELLS);
  const tide = oneOf(conditions.tide, TIDES);
  const wind = oneOf(conditions.wind, WINDS);
  const time = oneOf(conditions.time, TIMES);
  const cap = value.cap;
  if (!spot || !swell || !tide || !wind || !time) return undefined;
  if (typeof cap !== 'number' || !Number.isInteger(cap) || cap < ROOM_CAP.min || cap > ROOM_CAP.max) return undefined;
  return { spot, conditions: { swell, tide, wind, time }, cap };
}

export function parseLook(raw: unknown): PlayerLook | undefined {
  const value = record(raw);
  if (!value) return undefined;
  const body = shortString(value.body, 32);
  const outfit = shortString(value.outfit, 32);
  const color = shortString(value.color, 32);
  const board = shortString(value.board, 32);
  return body !== undefined && outfit !== undefined && color !== undefined && board !== undefined ? { body, outfit, color, board } : undefined;
}

/** A player's message, checked field by field; undefined for anything malformed. */
export function parseClientMessage(text: string): ClientMessage | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  const value = record(raw);
  if (!value) return undefined;
  switch (value.type) {
    case 'ping': {
      const t = finite(value.t);
      return t === undefined ? undefined : { type: 'ping', t };
    }
    case 'call': {
      const call = oneOf(value.call, CALLS);
      return call ? { type: 'call', call } : undefined;
    }
    case 'ride': {
      const distance = finite(value.distance);
      const seconds = finite(value.seconds);
      return distance !== undefined && seconds !== undefined && distance >= 0 && seconds >= 0 ? { type: 'ride', distance, seconds } : undefined;
    }
    case 'needSea':
      return { type: 'needSea' };
    case 'kick':
      return typeof value.id === 'number' && Number.isInteger(value.id) ? { type: 'kick', id: value.id } : undefined;
    case 'create': {
      const build = shortString(value.build, 64);
      const settings = parseRoomSettings(value.settings);
      const name = cleanName(value.name);
      const look = parseLook(value.look);
      if (build === undefined || !settings || !name || !look) return undefined;
      if (value.bots === undefined) return { type: 'create', build, settings, name, look };
      const bots = value.bots;
      if (typeof bots !== 'number' || !Number.isInteger(bots) || bots < 0 || bots > MAX_BOTS) return undefined;
      return { type: 'create', build, settings, name, look, bots };
    }
    case 'join': {
      const build = shortString(value.build, 64);
      const code = typeof value.code === 'string' ? normalizeRoomCode(value.code) : undefined;
      const name = cleanName(value.name);
      const look = parseLook(value.look);
      if (build === undefined || !code || !name || !look) return undefined;
      if (value.token === undefined) return { type: 'join', build, code, name, look };
      if (typeof value.token !== 'string' || !/^[0-9a-f]{32}$/.test(value.token)) return undefined;
      return { type: 'join', build, code, name, look, token: value.token };
    }
    default:
      return undefined;
  }
}

/** The server's message (the server is trusted: only its shape is checked). */
export function parseServerMessage(text: string): ServerMessage | undefined {
  try {
    const value = record(JSON.parse(text));
    return value && typeof value.type === 'string' ? value as unknown as ServerMessage : undefined;
  } catch {
    return undefined;
  }
}

export function lookFor(surfer: SurferSettings): PlayerLook {
  return { body: surfer.body, outfit: surfer.outfit, color: surfer.color, board: surfer.board };
}

/** Another player's surfer from their look; anything this build doesn't know falls back to the default. */
export function surferFor(look: PlayerLook): SurferSettings {
  return sanitizeSurfer(look, DEFAULT_SURFER);
}
