import { POSE_BYTES, encodeBundle } from '../src/net/poseCodec';
import type { PlayerInfo, PlayerLook, RoomInfo, ServerMessage } from '../src/net/protocol';

/** One player's socket, as the rooms see it. */
export interface Connection {
  sendText(text: string): void;
  sendBinary(data: Uint8Array): void;
  close(): void;
}

export interface Player {
  readonly id: number;
  readonly name: string;
  readonly look: PlayerLook;
  /** The player's secret: it brings a creator back as the creator, and a kicked player stays out by it. */
  readonly token: string;
  readonly conn: Connection;
  /** The latest pose, and whether it arrived since the last tick. */
  pose?: Uint8Array;
  poseFresh: boolean;
}

export function send(conn: Connection, message: ServerMessage): void {
  conn.sendText(JSON.stringify(message));
}

function info(player: Player): PlayerInfo {
  return { id: player.id, name: player.name, look: player.look };
}

/**
 * A running room (spec N1): its players and their latest poses. It relays;
 * it never simulates. Held in memory only.
 */
export class Room {
  readonly players = new Map<number, Player>();
  /** Tokens kicked out of this room. */
  readonly banned = new Set<string>();
  /** When the room last became empty, server ms (its creation counts). */
  emptySince: number;
  private nextId = 1;

  constructor(readonly info: RoomInfo, readonly creatorToken: string, now: number) {
    this.emptySince = now;
  }

  get full(): boolean {
    return this.players.size >= this.info.cap;
  }

  isCreator(player: Player): boolean {
    return player.token === this.creatorToken;
  }

  /** Seat a player: they get the room and everyone in it, everyone else hears they joined. */
  add(conn: Connection, name: string, look: PlayerLook, token: string): Player {
    const player: Player = { id: this.nextId, name, look, token, conn, poseFresh: false };
    this.nextId = this.nextId >= 0xffff ? 1 : this.nextId + 1;
    const others = [...this.players.values()];
    this.players.set(player.id, player);
    send(conn, { type: 'welcome', room: this.info, you: player.id, token, creator: this.isCreator(player), players: others.map(info) });
    for (const other of others) send(other.conn, { type: 'joined', player: info(player) });
    return player;
  }

  /** A player leaves (closed, dropped or kicked); safe to call twice. */
  remove(player: Player, now: number): void {
    if (this.players.get(player.id) !== player) return;
    this.players.delete(player.id);
    for (const other of this.players.values()) send(other.conn, { type: 'left', id: player.id });
    if (this.players.size === 0) this.emptySince = now;
  }

  broadcast(message: ServerMessage): void {
    const text = JSON.stringify(message);
    for (const player of this.players.values()) player.conn.sendText(text);
  }

  /** The creator removes another player, who can't come back with the same token. */
  kick(by: Player, id: number, now: number): void {
    const target = this.players.get(id);
    if (!this.isCreator(by) || !target || target === by) return;
    this.banned.add(target.token);
    send(target.conn, { type: 'refused', reason: 'kicked' });
    this.remove(target, now);
    target.conn.close();
  }

  /** A player's latest pose; anything but a whole pose is dropped. */
  pose(player: Player, bytes: Uint8Array): void {
    if (bytes.byteLength !== POSE_BYTES || this.players.get(player.id) !== player) return;
    player.pose = bytes.slice();
    player.poseFresh = true;
  }

  /** Each player gets one bundle of the others' poses that arrived since the last tick. */
  tick(): void {
    const fresh = [...this.players.values()].filter((player) => player.poseFresh && player.pose);
    if (fresh.length === 0) return;
    for (const recipient of this.players.values()) {
      const entries = fresh.filter((player) => player !== recipient).map((player) => ({ id: player.id, pose: player.pose! }));
      if (entries.length) recipient.conn.sendBinary(encodeBundle(entries));
    }
    for (const player of fresh) player.poseFresh = false;
  }
}
