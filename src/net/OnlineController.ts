import type { SurferSettings } from '../game/SurferChoice';
import { BUILD_ID } from './buildId';
import { roomSeaTime } from './ClockSync';
import { NetClient, type NetStatus, type SocketLike } from './NetClient';
import { POSE_BYTES, SEA_KIND, encodePose, encodeSeaFrame, readSeaFrame, type SurferPose } from './poseCodec';
import { lookFor, type CallId, type ClientMessage, type PlayerInfo, type PlayerLook, type Refusal, type RoomInfo, type RoomSettings, type ServerMessage } from './protocol';
import { RemoteSurfers } from './RemoteSurfers';

/** A surf call's bubble shows this long, s (spec N1). */
export const CALL_SECONDS = 2;
/** A finished ride stays in the feed this long, s. */
export const FEED_SECONDS = 6;
/** Rides shorter than this, s, are not announced. */
export const FEED_MIN_SECONDS = 3;

/** A player asking for the room's sea waits this long for one, ms, then starts fresh. */
export const SEA_WAIT_MS = 30_000;

/** A sea as it travels: encoded (`encodeSurfZoneState`), and deflated or not. */
export interface HandedSea {
  bytes: Uint8Array;
  deflated: boolean;
}

/** Make a room (with dev bots, when the server allows them), or join one by its code. */
export type OnlineIntent = { create: RoomSettings; bots?: number } | { join: string };

export interface OnlineOptions {
  /** The room server's socket (`onlineUrl`). */
  url: string;
  name: string;
  surfer: SurferSettings;
  intent: OnlineIntent;
  /** This player's saved token for the room, if they were in it before. */
  token?: string;
  build?: string;
  socket?: (url: string) => SocketLike;
  /** Local clock, ms. */
  now?: () => number;
}

export interface FeedEntry {
  id: number;
  name: string;
  distance: number;
  seconds: number;
  /** When it leaves the feed, local ms. */
  until: number;
}

/**
 * One online session (spec N1): the line to the room server, the room and who
 * is in it, the others' surfers, calls and finished rides. The game reads the
 * room's clock and the others' pushes on the water from it; the menus read the
 * roster, the feed and the player's role.
 */
export class OnlineController {
  room?: RoomInfo;
  you?: number;
  creator = false;
  token?: string;
  status: NetStatus = 'connecting';
  refusal?: Refusal;
  readonly remote = new RemoteSurfers();
  /** Calls being shouted, by player id (this player's own included), until local ms. */
  readonly calls = new Map<number, { call: CallId; until: number }>();
  feed: FeedEntry[] = [];
  onWelcome?: (room: RoomInfo) => void;
  onChange?: () => void;
  onRefused?: (reason: Refusal) => void;
  /** This player's sea, for someone joining late (spec N1: the sea handover); the game sets it. */
  provideSea?: () => Promise<HandedSea | undefined>;
  private seaWanted?: (sea: HandedSea | undefined) => void;
  readonly name: string;
  readonly look: PlayerLook;
  private readonly net: NetClient;
  private readonly now: () => number;
  private readonly build: string;
  private reactions: number[] = [];
  private readonly poseBytes = new Uint8Array(POSE_BYTES);

  constructor(private readonly options: OnlineOptions) {
    this.name = options.name;
    this.look = lookFor(options.surfer);
    this.token = options.token;
    this.build = options.build ?? BUILD_ID;
    this.now = options.now ?? (() => performance.now());
    this.net = new NetClient(options.url, () => this.hello(), {
      message: (message) => this.handle(message),
      poses: (data) => this.receiveBinary(data),
      status: (status) => {
        this.status = status;
        this.onChange?.();
      },
    }, { socket: options.socket, now: this.now });
  }

  /** Once in a room, every (re)connection rejoins it with this player's token. */
  private hello(): ClientMessage {
    const { name, look, build } = this;
    if (this.room) return { type: 'join', build, code: this.room.code, name, look, ...(this.token ? { token: this.token } : {}) };
    const { intent } = this.options;
    if ('create' in intent) return { type: 'create', build, settings: intent.create, name, look, ...(intent.bots ? { bots: intent.bots } : {}) };
    return { type: 'join', build, code: intent.join, name, look, ...(this.token ? { token: this.token } : {}) };
  }

  /** A bundle of the others' poses, or the sea this player asked for. */
  private receiveBinary(data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    if (bytes[0] !== SEA_KIND) {
      this.remote.receiveBundle(data, this.now(), this.reactions);
      return;
    }
    const frame = readSeaFrame(bytes);
    if (frame) this.takeSea({ bytes: frame.bytes.slice(), deflated: frame.deflated });
  }

  private takeSea(sea: HandedSea | undefined): void {
    const wanted = this.seaWanted;
    this.seaWanted = undefined;
    wanted?.(sea);
  }

  /**
   * The room's sea (spec N1): the longest-present player's, handed over through
   * the server, or undefined to start fresh (nobody else here, nobody answered,
   * or nothing came within `wait` ms).
   */
  requestSea(wait = SEA_WAIT_MS): Promise<HandedSea | undefined> {
    this.takeSea(undefined);
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.seaWanted === settle) this.takeSea(undefined);
      }, wait);
      const settle = (sea: HandedSea | undefined) => {
        clearTimeout(timer);
        resolve(sea);
      };
      this.seaWanted = settle;
      this.net.send({ type: 'needSea' });
    });
  }

  /** The server asks for this player's sea for someone joining: send it, if the game has one. */
  private async answerSea(request: number): Promise<void> {
    const sea = await this.provideSea?.();
    if (sea) this.net.sendBinary(encodeSeaFrame(request, sea.bytes, sea.deflated));
  }

  private handle(message: ServerMessage): void {
    const now = this.now();
    switch (message.type) {
      case 'welcome':
        this.room = message.room;
        this.you = message.you;
        this.token = message.token;
        this.creator = message.creator;
        for (const id of this.remote.ids()) this.remote.leave(id);
        for (const player of message.players) this.remote.join(player);
        this.onWelcome?.(message.room);
        break;
      case 'joined':
        this.remote.join(message.player);
        break;
      case 'left':
        this.remote.leave(message.id);
        this.calls.delete(message.id);
        break;
      case 'call':
        this.calls.set(message.id, { call: message.call, until: now + CALL_SECONDS * 1000 });
        break;
      case 'ride':
        this.feed.push({ id: message.id, name: this.nameOf(message.id) ?? '', distance: message.distance, seconds: message.seconds, until: now + FEED_SECONDS * 1000 });
        break;
      case 'seaRequest':
        void this.answerSea(message.request);
        break;
      case 'fresh':
        this.takeSea(undefined);
        break;
      case 'refused':
        this.refusal = message.reason;
        this.onRefused?.(message.reason);
        break;
      default:
        break;
    }
    this.onChange?.();
  }

  get clockReady(): boolean {
    return this.net.clock.ready;
  }

  /** The room's sea time now, s (NaN before the welcome). */
  seaTimeNow(): number {
    return this.room ? roomSeaTime(this.room, this.net.clock.serverNow(this.now())) : Number.NaN;
  }

  /** Other boards' pushes on the water since the last call (x, z, jx, jz each), once. */
  takeReactions(): Float32Array | undefined {
    if (!this.reactions.length) return undefined;
    const taken = Float32Array.from(this.reactions);
    this.reactions = [];
    return taken;
  }

  sendPose(pose: SurferPose): void {
    encodePose(pose, new DataView(this.poseBytes.buffer), 0);
    this.net.sendPose(this.poseBytes);
  }

  call(call: CallId): void {
    this.net.send({ type: 'call', call });
  }

  /** Announce a finished ride to the room, if it lasted FEED_MIN_SECONDS. */
  rideFinished(distance: number, seconds: number): void {
    if (seconds >= FEED_MIN_SECONDS) this.net.send({ type: 'ride', distance, seconds });
  }

  kick(id: number): void {
    this.net.send({ type: 'kick', id });
  }

  nameOf(id: number): string | undefined {
    return id === this.you ? this.name : this.remote.info(id)?.name;
  }

  /** Everyone in the room, this player first. */
  players(): PlayerInfo[] {
    const others = this.remote.ids().map((id) => this.remote.info(id)!);
    return this.you === undefined ? others : [{ id: this.you, name: this.name, look: this.look }, ...others];
  }

  /** Drops expired calls and feed lines, and hides silent players. */
  prune(): void {
    const now = this.now();
    for (const [id, call] of this.calls) if (call.until <= now) this.calls.delete(id);
    this.feed = this.feed.filter((entry) => entry.until > now);
    this.remote.prune(now);
  }

  close(): void {
    this.takeSea(undefined);
    this.net.close();
  }
}
