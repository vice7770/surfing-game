import {
  EMPTY_ROOM_SECONDS, FLOOD_SECONDS, MAX_MESSAGE_BYTES, MAX_MESSAGES_PER_SECOND, parseClientMessage, type ClientMessage, type Refusal,
} from '../src/net/protocol';
import { POSE_BYTES } from '../src/net/poseCodec';
import { newRoomCode } from '../src/net/roomCode';
import { Room, send, type Connection, type Player } from './Room';

export type { Connection } from './Room';

export interface RegistryOptions {
  /** The build this server serves: new rooms run it, and a page on another build is told to reload. */
  build: string;
  /** Server clock, ms. */
  now: () => number;
  /** Random bytes (crypto). */
  random: (count: number) => Uint8Array;
  /** A new room's sea seed; 1–9999 from `random` by default. */
  seed?: () => number;
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Every room on this server (spec N1), and a session per connection that turns
 * its messages into room actions. Pure: sockets and clocks come in from outside.
 */
export class RoomRegistry {
  readonly rooms = new Map<string, Room>();
  private readonly seed: () => number;

  constructor(readonly options: RegistryOptions) {
    this.seed = options.seed ?? (() => {
      const [a, b] = options.random(2);
      return 1 + (((a << 8) | b) % 9999);
    });
  }

  connect(conn: Connection): ServerSession {
    return new ServerSession(this, conn);
  }

  /** Relay: every room sends its bundles. */
  tick(): void {
    const now = this.options.now();
    for (const room of this.rooms.values()) room.tick(now);
  }

  /** Close rooms empty for EMPTY_ROOM_SECONDS. */
  sweep(): void {
    const now = this.options.now();
    for (const [code, room] of this.rooms) {
      if (room.players.size === 0 && now - room.emptySince >= EMPTY_ROOM_SECONDS * 1000) this.rooms.delete(code);
    }
  }

  newToken(): string {
    return hex(this.options.random(16));
  }

  /** A new room with its creator seated, or why not. */
  create(conn: Connection, message: Extract<ClientMessage, { type: 'create' }>): { room: Room; player: Player } | Refusal {
    if (message.build !== this.options.build) return 'version';
    let code = newRoomCode(this.options.random);
    while (this.rooms.has(code)) code = newRoomCode(this.options.random);
    const now = this.options.now();
    const token = this.newToken();
    const room = new Room({
      ...message.settings, code, seed: this.seed(), build: this.options.build, seaTimeAtCreate: 0, createdAt: now,
    }, token, now);
    this.rooms.set(code, room);
    return { room, player: room.add(conn, message.name, message.look, token) };
  }

  /** A seat in an existing room, or why not. */
  join(conn: Connection, message: Extract<ClientMessage, { type: 'join' }>): { room: Room; player: Player } | Refusal {
    const room = this.rooms.get(message.code);
    if (!room) return 'notFound';
    if (message.build !== room.info.build) return 'version';
    if (message.token && room.banned.has(message.token)) return 'kicked';
    if (room.full) return 'full';
    return { room, player: room.add(conn, message.name, message.look, message.token ?? this.newToken()) };
  }
}

/**
 * One connection's side of the server: a hello first (create or join), then
 * room messages and poses. More than MAX_MESSAGES_PER_SECOND in a wall-clock
 * second are dropped; FLOOD_SECONDS such seconds in a row close the connection.
 */
export class ServerSession {
  private room?: Room;
  private player?: Player;
  private closed = false;
  private windowSecond = Number.NaN;
  private windowCount = 0;
  private floodedSeconds = 0;

  constructor(private readonly registry: RoomRegistry, private readonly conn: Connection) {}

  text(data: string): void {
    if (!this.admit() || data.length > MAX_MESSAGE_BYTES) return;
    const message = parseClientMessage(data);
    if (!this.player || !this.room) {
      this.hello(message);
      return;
    }
    const { room, player } = this;
    // Kicked (the socket is still closing): nothing more from this player.
    if (!message || room.players.get(player.id) !== player) return;
    switch (message.type) {
      case 'ping':
        send(this.conn, { type: 'pong', t: message.t, server: this.registry.options.now() });
        break;
      case 'call':
        room.broadcast({ type: 'call', id: player.id, call: message.call });
        break;
      case 'ride':
        if (message.seconds >= 3) room.broadcast({ type: 'ride', id: player.id, distance: message.distance, seconds: message.seconds });
        break;
      case 'kick':
        room.kick(player, message.id, this.registry.options.now());
        break;
      case 'needSea':
        room.needSea(player, this.registry.options.now());
        break;
      default:
        break;
    }
  }

  binary(data: Uint8Array): void {
    if (!this.admit() || !this.player || !this.room) return;
    if (data.byteLength === POSE_BYTES) this.room.pose(this.player, data);
    else this.room.seaFrame(this.player, data);
  }

  /** The connection went away: the player leaves their room. */
  close(): void {
    this.closed = true;
    if (this.room && this.player) this.room.remove(this.player, this.registry.options.now());
    this.room = undefined;
    this.player = undefined;
  }

  private hello(message: ClientMessage | undefined): void {
    if (!message || (message.type !== 'create' && message.type !== 'join')) {
      if (message === undefined) this.refuse('invalid');
      return;
    }
    const seated = message.type === 'create' ? this.registry.create(this.conn, message) : this.registry.join(this.conn, message);
    if (typeof seated === 'string') {
      this.refuse(seated);
      return;
    }
    this.room = seated.room;
    this.player = seated.player;
  }

  private refuse(reason: Refusal): void {
    send(this.conn, { type: 'refused', reason });
    this.conn.close();
  }

  /** Counts a message against this second's allowance; false when it must be dropped (or the connection was closed). */
  private admit(): boolean {
    if (this.closed) return false;
    const second = Math.floor(this.registry.options.now() / 1000);
    if (second !== this.windowSecond) {
      const flooded = this.windowCount > MAX_MESSAGES_PER_SECOND;
      this.floodedSeconds = flooded ? (second === this.windowSecond + 1 ? this.floodedSeconds + 1 : 1) : 0;
      this.windowSecond = second;
      this.windowCount = 0;
      if (this.floodedSeconds >= FLOOD_SECONDS) {
        this.conn.close();
        this.close();
        return false;
      }
    }
    this.windowCount += 1;
    return this.windowCount <= MAX_MESSAGES_PER_SECOND;
  }
}
