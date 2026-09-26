import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientMessage, ServerMessage } from './protocol';
import { NetClient, onlineUrl, type NetStatus, type SocketLike } from './NetClient';

class FakeSocket implements SocketLike {
  binaryType = 'blob';
  readyState = 0;
  sent: (string | Uint8Array)[] = [];
  closed = false;
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(readonly url: string) {}

  send(data: string | ArrayBufferView | ArrayBuffer): void {
    this.sent.push(typeof data === 'string' ? data : new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer));
  }

  close(): void {
    this.closed = true;
    this.readyState = 3;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  drop(): void {
    this.readyState = 3;
    this.onclose?.({});
  }

  receive(message: ServerMessage | ArrayBuffer): void {
    this.onmessage?.({ data: message instanceof ArrayBuffer ? message : JSON.stringify(message) });
  }

  texts(): ClientMessage[] {
    return this.sent.filter((data): data is string => typeof data === 'string').map((data) => JSON.parse(data) as ClientMessage);
  }
}

function setup(hello: ClientMessage = { type: 'ping', t: -1 }) {
  const sockets: FakeSocket[] = [];
  const messages: ServerMessage[] = [];
  const statuses: NetStatus[] = [];
  const poses: ArrayBuffer[] = [];
  let now = 1000;
  const client = new NetClient('ws://test/ws', () => hello, {
    message: (message) => messages.push(message),
    poses: (data) => poses.push(data),
    status: (status) => statuses.push(status),
  }, {
    socket: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
    now: () => now,
  });
  return { client, sockets, messages, statuses, poses, advance: (ms: number) => { now += ms; vi.advanceTimersByTime(ms); } };
}

const join: ClientMessage = { type: 'join', build: 'dev', code: 'ABCD2345', name: 'Ana', look: { body: 'surfer1', outfit: 'fullsuit', color: 'teal', board: 'x' } };

describe('NetClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('says hello first, then pings', () => {
    const { sockets, statuses } = setup(join);
    expect(sockets).toHaveLength(1);
    expect(sockets[0].binaryType).toBe('arraybuffer');
    sockets[0].open();
    const texts = sockets[0].texts();
    expect(texts[0]).toEqual(join);
    expect(texts[1]).toMatchObject({ type: 'ping' });
    expect(statuses).toEqual(['connecting', 'open']);
  });

  it('pings often at first, then every 2 s', () => {
    const { sockets, advance } = setup(join);
    sockets[0].open();
    advance(3000);
    const early = sockets[0].texts().filter((message) => message.type === 'ping').length;
    expect(early).toBeGreaterThanOrEqual(6);
    advance(4000);
    expect(sockets[0].texts().filter((message) => message.type === 'ping').length - early).toBe(2);
  });

  it('feeds pongs to the clock, and passes other messages on', () => {
    const { client, sockets, messages, advance } = setup(join);
    sockets[0].open();
    const ping = sockets[0].texts().find((message) => message.type === 'ping') as Extract<ClientMessage, { type: 'ping' }>;
    advance(40);
    sockets[0].receive({ type: 'pong', t: ping.t, server: 50_000 });
    expect(client.clock.ready).toBe(true);
    expect(client.clock.offset).toBeCloseTo(50_000 + 20 - 1040, 6);
    sockets[0].receive({ type: 'left', id: 3 });
    expect(messages).toEqual([{ type: 'left', id: 3 }]);
  });

  it('hands pose bundles over as they come', () => {
    const { sockets, poses } = setup(join);
    sockets[0].open();
    const bundle = new Uint8Array([1, 0, 0, 0]).buffer;
    sockets[0].receive(bundle);
    expect(poses).toEqual([bundle]);
  });

  it('sends poses only while connected', () => {
    const { client, sockets } = setup(join);
    client.sendPose(new Uint8Array([1, 2]));
    expect(sockets[0].sent).toHaveLength(0);
    sockets[0].open();
    client.sendPose(new Uint8Array([1, 2]));
    expect(sockets[0].sent.at(-1)).toEqual(new Uint8Array([1, 2]));
  });

  it('reconnects after a drop, backing off, and says hello again', () => {
    const { sockets, statuses, advance } = setup(join);
    sockets[0].open();
    sockets[0].drop();
    expect(statuses.at(-1)).toBe('reconnecting');
    advance(999);
    expect(sockets).toHaveLength(1);
    advance(1);
    expect(sockets).toHaveLength(2);
    sockets[1].drop();
    advance(1999);
    expect(sockets).toHaveLength(2);
    advance(1);
    expect(sockets).toHaveLength(3);
    sockets[2].open();
    expect(sockets[2].texts()[0]).toEqual(join);
    expect(statuses.at(-1)).toBe('open');
    sockets[2].drop();
    advance(1000);
    expect(sockets).toHaveLength(4);
  });

  it('stops for good when refused', () => {
    const { sockets, statuses, messages, advance } = setup(join);
    sockets[0].open();
    sockets[0].receive({ type: 'refused', reason: 'kicked' });
    sockets[0].drop();
    advance(60_000);
    expect(sockets).toHaveLength(1);
    expect(statuses.at(-1)).toBe('closed');
    expect(messages).toEqual([{ type: 'refused', reason: 'kicked' }]);
  });

  it('stops for good when closed', () => {
    const { client, sockets, statuses, advance } = setup(join);
    sockets[0].open();
    client.close();
    expect(sockets[0].closed).toBe(true);
    sockets[0].drop();
    advance(60_000);
    expect(sockets).toHaveLength(1);
    expect(statuses.at(-1)).toBe('closed');
    const pings = sockets[0].texts().length;
    advance(10_000);
    expect(sockets[0].texts()).toHaveLength(pings);
  });

  it('builds the socket address from the page', () => {
    expect(onlineUrl({ protocol: 'https:', host: 'breakline.fly.dev' })).toBe('wss://breakline.fly.dev/ws');
    expect(onlineUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe('ws://localhost:5173/ws');
  });
});
