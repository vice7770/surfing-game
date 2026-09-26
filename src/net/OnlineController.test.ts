import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SURFER } from '../game/SurferChoice';
import { SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import type { SocketLike } from './NetClient';
import { OnlineController, CALL_SECONDS, FEED_SECONDS } from './OnlineController';
import { POSE_BYTES, createPose, encodeBundle, encodePose, encodeSeaFrame, readSeaFrame } from './poseCodec';
import { DEFAULT_ROOM_SETTINGS, lookFor, type ClientMessage, type RoomInfo, type ServerMessage } from './protocol';

class FakeSocket implements SocketLike {
  binaryType = 'blob';
  readyState = 0;
  sent: (string | Uint8Array)[] = [];
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  send(data: string | ArrayBufferView | ArrayBuffer): void {
    this.sent.push(typeof data === 'string' ? data : new Uint8Array((data as ArrayBufferView).buffer ?? data).slice());
  }

  close(): void {
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

  binaries(): Uint8Array[] {
    return this.sent.filter((data): data is Uint8Array => typeof data !== 'string');
  }
}

const look = lookFor(DEFAULT_SURFER);
const room: RoomInfo = { ...DEFAULT_ROOM_SETTINGS, code: 'ABCD2345', seed: 7, build: 'dev', seaTimeAtCreate: 0, createdAt: 100_000 };
const token = 'ab'.repeat(16);

function setup(intent: ConstructorParameters<typeof OnlineController>[0]['intent'] = { create: DEFAULT_ROOM_SETTINGS }) {
  const sockets: FakeSocket[] = [];
  let now = 1000;
  const controller = new OnlineController({
    url: 'ws://test/ws', name: 'Ana', surfer: DEFAULT_SURFER, intent, build: 'dev',
    socket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    now: () => now,
  });
  const welcome = (extra: Partial<Extract<ServerMessage, { type: 'welcome' }>> = {}) => sockets.at(-1)!.receive({
    type: 'welcome', room, you: 1, token, creator: true, players: [{ id: 2, name: 'Bea', look }], ...extra,
  });
  return { controller, sockets, welcome, advance: (ms: number) => { now += ms; vi.advanceTimersByTime(ms); }, now: () => now };
}

describe('OnlineController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a room with the player\'s name and looks', () => {
    const { sockets } = setup({ create: DEFAULT_ROOM_SETTINGS, bots: 4 });
    sockets[0].open();
    expect(sockets[0].texts()[0]).toEqual({ type: 'create', build: 'dev', settings: DEFAULT_ROOM_SETTINGS, name: 'Ana', look, bots: 4 });
  });

  it('joins by code, with a saved token', () => {
    const sockets: FakeSocket[] = [];
    const controller = new OnlineController({
      url: 'ws://test/ws', name: 'Ana', surfer: DEFAULT_SURFER, intent: { join: 'ABCD2345' }, token, build: 'dev',
      socket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket;
      },
    });
    sockets[0].open();
    expect(sockets[0].texts()[0]).toEqual({ type: 'join', build: 'dev', code: 'ABCD2345', name: 'Ana', look, token });
    controller.close();
  });

  it('takes the room, its players and the player\'s role from the welcome', () => {
    const { controller, sockets, welcome } = setup();
    const welcomed = vi.fn();
    controller.onWelcome = welcomed;
    sockets[0].open();
    welcome();
    expect(controller.room).toEqual(room);
    expect(controller.you).toBe(1);
    expect(controller.creator).toBe(true);
    expect(controller.token).toBe(token);
    expect(controller.remote.ids()).toEqual([2]);
    expect(controller.players().map((player) => player.name)).toEqual(['Ana', 'Bea']);
    expect(welcomed).toHaveBeenCalledTimes(1);
  });

  it('keeps the roster as players come and go', () => {
    const { controller, sockets, welcome } = setup();
    sockets[0].open();
    welcome();
    sockets[0].receive({ type: 'joined', player: { id: 3, name: 'Cai', look } });
    sockets[0].receive({ type: 'left', id: 2 });
    expect(controller.remote.ids()).toEqual([3]);
    expect(controller.nameOf(3)).toBe('Cai');
  });

  it('feeds others\' poses to the remote surfers, and their pushes on the water once', () => {
    const { controller, sockets, welcome } = setup();
    sockets[0].open();
    welcome();
    const pose = createPose();
    Object.assign(pose, { step: 600, x: 3, z: -90, boardPresent: true, reaction: { x: 3, z: -90, jx: 5, jz: 1 } });
    const bytes = new Uint8Array(POSE_BYTES);
    encodePose(pose, new DataView(bytes.buffer), 0);
    sockets[0].receive(encodeBundle([{ id: 2, pose: bytes }]).buffer as ArrayBuffer);
    expect(controller.remote.latestPositions()).toEqual([{ x: 3, z: -90 }]);
    expect(Array.from(controller.takeReactions() ?? [])).toEqual([3, -90, 5, 1]);
    expect(controller.takeReactions()).toBeUndefined();
  });

  it('tells the room\'s sea time from the server\'s clock', () => {
    const { controller, sockets, welcome, advance } = setup();
    sockets[0].open();
    welcome();
    expect(controller.clockReady).toBe(false);
    const ping = sockets[0].texts().find((message) => message.type === 'ping') as Extract<ClientMessage, { type: 'ping' }>;
    advance(20);
    sockets[0].receive({ type: 'pong', t: ping.t, server: 160_010 });
    expect(controller.clockReady).toBe(true);
    // Server time now: 160 010 ms at the pong's middle, 10 ms before arrival → 160 020 ms; 60.02 s after creation.
    expect(controller.seaTimeNow()).toBeCloseTo(60.02, 6);
  });

  it('sends its own pose as 76 bytes', () => {
    const { controller, sockets, welcome } = setup();
    sockets[0].open();
    welcome();
    const pose = createPose();
    pose.step = Math.round(60 / SURF_ZONE_STEP);
    controller.sendPose(pose);
    expect(sockets[0].binaries().at(-1)).toHaveLength(POSE_BYTES);
  });

  it('shows calls for 2 s and finished rides for 6 s', () => {
    const { controller, sockets, welcome, advance, now } = setup();
    sockets[0].open();
    welcome();
    sockets[0].receive({ type: 'call', id: 2, call: 'party' });
    sockets[0].receive({ type: 'ride', id: 2, distance: 42, seconds: 6.1 });
    expect(controller.calls.get(2)?.call).toBe('party');
    expect(controller.feed).toEqual([{ id: 2, name: 'Bea', distance: 42, seconds: 6.1, until: now() + FEED_SECONDS * 1000 }]);
    advance(CALL_SECONDS * 1000 + 1);
    controller.prune();
    expect(controller.calls.size).toBe(0);
    expect(controller.feed).toHaveLength(1);
    advance(FEED_SECONDS * 1000);
    controller.prune();
    expect(controller.feed).toHaveLength(0);
  });

  it('sends calls, rides of 3 s or more, and kicks', () => {
    const { controller, sockets, welcome } = setup();
    sockets[0].open();
    welcome();
    controller.call('left');
    controller.rideFinished(12, 2);
    controller.rideFinished(40, 5.5);
    controller.kick(2);
    expect(sockets[0].texts().filter((message) => message.type !== 'ping' && message.type !== 'create')).toEqual([
      { type: 'call', call: 'left' }, { type: 'ride', distance: 40, seconds: 5.5 }, { type: 'kick', id: 2 },
    ]);
  });

  it('rejoins its room, not a new one, after a drop', () => {
    const { controller, sockets, welcome, advance } = setup();
    sockets[0].open();
    welcome();
    sockets[0].drop();
    expect(controller.status).toBe('reconnecting');
    advance(1000);
    sockets[1].open();
    expect(sockets[1].texts()[0]).toEqual({ type: 'join', build: 'dev', code: 'ABCD2345', name: 'Ana', look, token });
    welcome({ you: 5, players: [{ id: 3, name: 'Cai', look }] });
    expect(controller.you).toBe(5);
    expect(controller.remote.ids()).toEqual([3]);
  });

  it('answers the server\'s call for its sea with a sea frame (spec N1)', async () => {
    const { controller, sockets, welcome } = setup();
    sockets[0].open();
    welcome();
    controller.provideSea = async () => ({ bytes: Uint8Array.of(9, 9, 9), deflated: true });
    sockets[0].receive({ type: 'seaRequest', request: 42 });
    await vi.waitFor(() => expect(sockets[0].binaries().length).toBeGreaterThan(0));
    const frame = readSeaFrame(sockets[0].binaries().at(-1)!);
    expect(frame).toMatchObject({ request: 42, deflated: true });
    expect(Array.from(frame!.bytes)).toEqual([9, 9, 9]);
  });

  it('asks for the room\'s sea, and takes a handed-over one or starts fresh', async () => {
    const { controller, sockets, welcome } = setup();
    sockets[0].open();
    welcome();
    const handed = controller.requestSea();
    expect(sockets[0].texts().at(-1)).toEqual({ type: 'needSea' });
    sockets[0].receive(encodeSeaFrame(3, Uint8Array.of(1, 2, 3, 4), false).buffer as ArrayBuffer);
    expect(await handed).toEqual({ bytes: Uint8Array.of(1, 2, 3, 4), deflated: false });
    const fresh = controller.requestSea();
    sockets[0].receive({ type: 'fresh' });
    expect(await fresh).toBeUndefined();
  });

  it('starts fresh when no sea comes in time', async () => {
    const { controller, sockets, welcome, advance } = setup();
    sockets[0].open();
    welcome();
    const handed = controller.requestSea(5000);
    advance(5001);
    expect(await handed).toBeUndefined();
  });

  it('reports a refusal', () => {
    const { controller, sockets } = setup({ join: 'ABCD2345' });
    const refused = vi.fn();
    controller.onRefused = refused;
    sockets[0].open();
    sockets[0].receive({ type: 'refused', reason: 'full' });
    expect(controller.refusal).toBe('full');
    expect(controller.status).toBe('closed');
    expect(refused).toHaveBeenCalledWith('full');
  });
});
