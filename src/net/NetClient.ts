import { ClockSync } from './ClockSync';
import { parseServerMessage, type ClientMessage, type ServerMessage } from './protocol';

/** The part of a WebSocket the client uses; tests stand in a fake. */
export interface SocketLike {
  binaryType: string;
  readonly readyState: number;
  send(data: string | ArrayBufferView | ArrayBuffer): void;
  close(): void;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export type NetStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface NetEvents {
  message(message: ServerMessage): void;
  /** A bundle of others' poses (`poseCodec.readBundle`). */
  poses(data: ArrayBuffer): void;
  status(status: NetStatus): void;
}

export interface NetClientOptions {
  socket?: (url: string) => SocketLike;
  /** Local clock, ms. */
  now?: () => number;
}

const OPEN = 1;
/** Pings come every FAST_PING_MS for the first FAST_PINGS_FOR_MS, so the clock settles quickly, then every PING_MS. */
const FAST_PING_MS = 500;
const FAST_PINGS_FOR_MS = 3000;
const PING_MS = 2000;
/** Waits before each reconnection attempt, ms; the last repeats. */
const BACKOFF_MS = [1000, 2000, 4000, 8000];

/** The room server's socket address for this page (spec N1). */
export function onlineUrl(location: { protocol: string; host: string }): string {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

/**
 * The page's line to the room server (spec N1). It says hello on every
 * connection (the caller decides whether that creates or rejoins), pings to
 * follow the server's clock, and reconnects with backoff after a drop, until
 * it is closed or the server refuses it.
 */
export class NetClient {
  readonly clock = new ClockSync();
  private socket?: SocketLike;
  private stopped = false;
  private attempts = 0;
  private pingTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private readonly makeSocket: (url: string) => SocketLike;
  private readonly now: () => number;

  constructor(private readonly url: string, private readonly hello: () => ClientMessage, private readonly events: NetEvents, options: NetClientOptions = {}) {
    this.makeSocket = options.socket ?? ((address) => new WebSocket(address) as unknown as SocketLike);
    this.now = options.now ?? (() => performance.now());
    events.status('connecting');
    this.connect();
  }

  get open(): boolean {
    return this.socket?.readyState === OPEN;
  }

  send(message: ClientMessage): void {
    if (this.open) this.socket!.send(JSON.stringify(message));
  }

  sendPose(bytes: Uint8Array): void {
    if (this.open) this.socket!.send(bytes);
  }

  /** Leave for good: no more reconnecting. */
  close(): void {
    if (this.stopped) return;
    this.stop();
    const { socket } = this;
    this.socket = undefined;
    socket?.close();
  }

  private stop(): void {
    this.stopped = true;
    clearTimeout(this.pingTimer);
    clearTimeout(this.retryTimer);
    this.events.status('closed');
  }

  private connect(): void {
    const socket = this.makeSocket(this.url);
    socket.binaryType = 'arraybuffer';
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket !== socket || this.stopped) return;
      this.attempts = 0;
      this.events.status('open');
      this.send(this.hello());
      this.ping(0);
    };
    socket.onmessage = ({ data }) => {
      if (this.socket !== socket) return;
      if (data instanceof ArrayBuffer) {
        this.events.poses(data);
        return;
      }
      if (typeof data !== 'string') return;
      const message = parseServerMessage(data);
      if (!message) return;
      if (message.type === 'pong') {
        this.clock.add(message.t, message.server, this.now());
        return;
      }
      if (message.type === 'refused') this.stop();
      this.events.message(message);
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      clearTimeout(this.pingTimer);
      this.socket = undefined;
      if (this.stopped) return;
      this.events.status('reconnecting');
      const wait = BACKOFF_MS[Math.min(this.attempts, BACKOFF_MS.length - 1)];
      this.attempts += 1;
      this.retryTimer = setTimeout(() => this.connect(), wait);
    };
    // A failed socket also closes; the close handler reconnects.
    socket.onerror = () => {};
  }

  /** Ping now, then again soon while the connection is young, less often after. */
  private ping(sinceOpen: number): void {
    this.send({ type: 'ping', t: this.now() });
    const wait = sinceOpen < FAST_PINGS_FOR_MS ? FAST_PING_MS : PING_MS;
    this.pingTimer = setTimeout(() => this.ping(sinceOpen + wait), wait);
  }
}
