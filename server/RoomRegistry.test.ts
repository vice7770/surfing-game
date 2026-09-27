import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFER } from '../src/game/SurferChoice';
import { POSE_BYTES, encodeSeaFrame, readBundle, readSeaFrame } from '../src/net/poseCodec';
import { MAX_SEA_BYTES, SEA_DONOR_SECONDS, lookFor, type ServerMessage } from '../src/net/protocol';
import { RoomRegistry, type Connection } from './RoomRegistry';

class FakeConnection implements Connection {
  texts: ServerMessage[] = [];
  bundles: Uint8Array[] = [];
  closed = false;

  sendText(text: string): void {
    this.texts.push(JSON.parse(text) as ServerMessage);
  }

  sendBinary(data: Uint8Array): void {
    this.bundles.push(data.slice());
  }

  close(): void {
    this.closed = true;
  }

  last<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }> | undefined {
    return this.texts.filter((message) => message.type === type).at(-1) as Extract<ServerMessage, { type: T }> | undefined;
  }
}

const look = lookFor(DEFAULT_SURFER);
const settings = { spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap: 3 };

function setup() {
  let now = 1_000_000;
  let counter = 0;
  const registry = new RoomRegistry({
    build: 'b1', now: () => now, random: (n) => Uint8Array.from({ length: n }, () => (counter++ * 37) % 248), seed: () => 7,
  });
  const open = () => {
    const conn = new FakeConnection();
    return { conn, session: registry.connect(conn) };
  };
  const create = (name = 'Ana') => {
    const player = open();
    player.session.text(JSON.stringify({ type: 'create', build: 'b1', settings, name, look }));
    return player;
  };
  const join = (code: string, name = 'Bea', token?: string, build = 'b1') => {
    const player = open();
    player.session.text(JSON.stringify({ type: 'join', build, code, name, look, ...(token ? { token } : {}) }));
    return player;
  };
  return { registry, open, create, join, advance: (ms: number) => { now += ms; } };
}

describe('RoomRegistry', () => {
  it('creates a room and welcomes its creator', () => {
    const { create } = setup();
    const { conn } = create();
    const welcome = conn.last('welcome')!;
    expect(welcome.creator).toBe(true);
    expect(welcome.players).toEqual([]);
    expect(welcome.room).toMatchObject({ spot: 'canyon', cap: 3, seed: 7, build: 'b1', seaTimeAtCreate: 0, createdAt: 1_000_000 });
    expect(welcome.room.code).toMatch(/^[23456789A-HJKMNP-Z]{8}$/);
    expect(welcome.token).toMatch(/^[0-9a-f]{32}$/);
  });

  it('lets friends join by code, and tells everyone', () => {
    const { create, join } = setup();
    const a = create();
    const b = join(a.conn.last('welcome')!.room.code);
    expect(b.conn.last('welcome')!.creator).toBe(false);
    expect(b.conn.last('welcome')!.players.map((player) => player.name)).toEqual(['Ana']);
    expect(a.conn.last('joined')!.player.name).toBe('Bea');
  });

  it('allows two players with the same name', () => {
    const { create, join } = setup();
    const a = create('Ana');
    const b = join(a.conn.last('welcome')!.room.code, 'Ana');
    expect(b.conn.last('welcome')).toBeDefined();
    expect(b.conn.last('welcome')!.you).not.toBe(a.conn.last('welcome')!.you);
  });

  it('ignores everything but a hello from a new connection', () => {
    const { open } = setup();
    const a = open();
    a.session.text('{"type":"ping","t":1}');
    a.session.binary(new Uint8Array(POSE_BYTES));
    expect(a.conn.texts).toEqual([]);
  });

  it('refuses unknown codes, other builds and full rooms', () => {
    const { create, join } = setup();
    expect(join('ABCD2345').conn.last('refused')!.reason).toBe('notFound');
    const { code } = create().conn.last('welcome')!.room;
    expect(join(code, 'x', undefined, 'b2').conn.last('refused')!.reason).toBe('version');
    join(code, 'b');
    join(code, 'c');
    expect(join(code, 'd').conn.last('refused')!.reason).toBe('full');
  });

  it('refuses to create a room on another build', () => {
    const { open } = setup();
    const a = open();
    a.session.text(JSON.stringify({ type: 'create', build: 'old', settings, name: 'Ana', look }));
    expect(a.conn.last('refused')!.reason).toBe('version');
  });

  it('refuses a malformed hello', () => {
    const { open } = setup();
    const a = open();
    a.session.text(JSON.stringify({ type: 'create', build: 'b1', settings: { ...settings, cap: 99 }, name: 'Ana', look }));
    expect(a.conn.last('refused')!.reason).toBe('invalid');
  });

  it('relays poses as bundles of the others, once each', () => {
    const { registry, create, join } = setup();
    const a = create();
    const b = join(a.conn.last('welcome')!.room.code);
    a.session.binary(new Uint8Array(POSE_BYTES).fill(5));
    registry.tick();
    expect(a.conn.bundles).toHaveLength(0);
    expect(b.conn.bundles).toHaveLength(1);
    const ids: number[] = [];
    readBundle(b.conn.bundles[0].buffer as ArrayBuffer, (id, view, offset) => {
      ids.push(id);
      expect(view.getUint8(offset)).toBe(5);
    });
    expect(ids).toEqual([a.conn.last('welcome')!.you]);
    registry.tick();
    expect(b.conn.bundles).toHaveLength(1);
  });

  it('drops malformed poses', () => {
    const { registry, create, join } = setup();
    const a = create();
    const b = join(a.conn.last('welcome')!.room.code);
    a.session.binary(new Uint8Array(POSE_BYTES - 1));
    a.session.binary(new Uint8Array(POSE_BYTES + 1));
    registry.tick();
    expect(b.conn.bundles).toHaveLength(0);
  });

  it('answers pings with the server clock', () => {
    const { create } = setup();
    const a = create();
    a.session.text('{"type":"ping","t":42}');
    expect(a.conn.last('pong')).toEqual({ type: 'pong', t: 42, server: 1_000_000 });
  });

  it('relays calls to everyone, and rides of 3 s or more', () => {
    const { create, join } = setup();
    const a = create();
    const b = join(a.conn.last('welcome')!.room.code);
    const you = a.conn.last('welcome')!.you;
    a.session.text('{"type":"call","call":"party"}');
    expect(b.conn.last('call')).toEqual({ type: 'call', id: you, call: 'party' });
    expect(a.conn.last('call')).toEqual({ type: 'call', id: you, call: 'party' });
    a.session.text('{"type":"ride","distance":40,"seconds":2.5}');
    expect(b.conn.last('ride')).toBeUndefined();
    a.session.text('{"type":"ride","distance":40,"seconds":6}');
    expect(b.conn.last('ride')).toEqual({ type: 'ride', id: you, distance: 40, seconds: 6 });
  });

  it('lets only the creator kick, and keeps the kicked player out', () => {
    const { create, join } = setup();
    const a = create();
    const { code } = a.conn.last('welcome')!.room;
    const b = join(code);
    const c = join(code, 'Cai');
    const bId = b.conn.last('welcome')!.you;
    c.session.text(JSON.stringify({ type: 'kick', id: a.conn.last('welcome')!.you }));
    expect(a.conn.closed).toBe(false);
    a.session.text(JSON.stringify({ type: 'kick', id: bId }));
    expect(b.conn.last('refused')!.reason).toBe('kicked');
    expect(b.conn.closed).toBe(true);
    expect(c.conn.last('left')).toEqual({ type: 'left', id: bId });
    expect(join(code, 'Bea', b.conn.last('welcome')!.token).conn.last('refused')!.reason).toBe('kicked');
  });

  it('never lets the creator kick themselves', () => {
    const { create } = setup();
    const a = create();
    a.session.text(JSON.stringify({ type: 'kick', id: a.conn.last('welcome')!.you }));
    expect(a.conn.closed).toBe(false);
  });

  it('keeps the creator the creator when they rejoin with their token', () => {
    const { create, join } = setup();
    const a = create();
    const { code } = a.conn.last('welcome')!.room;
    const { token } = a.conn.last('welcome')!;
    const b = join(code, 'Bea');
    a.session.close();
    expect(b.conn.last('left')).toEqual({ type: 'left', id: a.conn.last('welcome')!.you });
    const again = join(code, 'Ana', token);
    expect(again.conn.last('welcome')!.creator).toBe(true);
    expect(again.conn.last('welcome')!.token).toBe(token);
  });

  it('closes a room 5 minutes after it empties, and not while anyone is in it', () => {
    const { registry, create, join, advance } = setup();
    const a = create();
    const { code } = a.conn.last('welcome')!.room;
    advance(400_000);
    registry.sweep();
    expect(registry.rooms.size).toBe(1);
    a.session.close();
    advance(299_000);
    registry.sweep();
    expect(registry.rooms.size).toBe(1);
    const back = join(code);
    advance(10_000);
    registry.sweep();
    expect(registry.rooms.size).toBe(1);
    back.session.close();
    advance(301_000);
    registry.sweep();
    expect(registry.rooms.size).toBe(0);
    expect(join(code).conn.last('refused')!.reason).toBe('notFound');
  });

  it('drops a flood, then disconnects a flooder', () => {
    const { create, advance } = setup();
    const a = create();
    for (let second = 0; second < 5; second += 1) {
      a.conn.texts = [];
      for (let i = 0; i < 60; i += 1) a.session.text('{"type":"ping","t":1}');
      expect(a.conn.texts.length).toBeLessThanOrEqual(40);
      advance(1000);
    }
    a.session.text('{"type":"ping","t":1}');
    expect(a.conn.closed).toBe(true);
  });

  it('forgives a single busy second', () => {
    const { create, advance } = setup();
    const a = create();
    for (let i = 0; i < 60; i += 1) a.session.text('{"type":"ping","t":1}');
    advance(1000);
    a.session.text('{"type":"ping","t":1}');
    advance(1000);
    a.session.text('{"type":"ping","t":1}');
    expect(a.conn.closed).toBe(false);
  });

  describe('the sea handover (spec N1)', () => {
    const request = (conn: FakeConnection) => conn.last('seaRequest')!.request;
    const seaFrame = (id: number, fill: number) => encodeSeaFrame(id, new Uint8Array(1000).fill(fill), true);

    it('starts a lone player fresh', () => {
      const { create } = setup();
      const a = create();
      a.session.text('{"type":"needSea"}');
      expect(a.conn.last('fresh')).toEqual({ type: 'fresh' });
    });

    it('asks the longest-present player, and passes their sea to the joiner only', () => {
      const { create, join } = setup();
      const a = create();
      const { code } = a.conn.last('welcome')!.room;
      const b = join(code, 'Bea');
      const c = join(code, 'Cai');
      c.session.text('{"type":"needSea"}');
      expect(b.conn.last('seaRequest')).toBeUndefined();
      const id = request(a.conn);
      a.session.binary(seaFrame(id, 7));
      expect(c.conn.bundles).toHaveLength(1);
      const frame = readSeaFrame(c.conn.bundles[0]);
      expect(frame).toMatchObject({ request: id, deflated: true });
      expect(frame!.bytes[0]).toBe(7);
      expect(b.conn.bundles).toHaveLength(0);
      // A second, unasked frame goes nowhere.
      a.session.binary(seaFrame(id, 8));
      expect(c.conn.bundles).toHaveLength(1);
    });

    it('asks the next player when a donor is slow, then starts the joiner fresh', () => {
      const { registry, create, join, advance } = setup();
      const a = create();
      const { code } = a.conn.last('welcome')!.room;
      const b = join(code, 'Bea');
      const c = join(code, 'Cai');
      c.session.text('{"type":"needSea"}');
      advance(SEA_DONOR_SECONDS * 1000 + 1);
      registry.tick();
      expect(b.conn.last('seaRequest')).toBeDefined();
      // The first donor's late answer is ignored.
      a.session.binary(seaFrame(request(a.conn), 1));
      expect(c.conn.bundles).toHaveLength(0);
      advance(SEA_DONOR_SECONDS * 1000 + 1);
      registry.tick();
      expect(c.conn.last('fresh')).toEqual({ type: 'fresh' });
    });

    it('moves on at once when the donor leaves', () => {
      const { create, join } = setup();
      const a = create();
      const { code } = a.conn.last('welcome')!.room;
      const b = join(code, 'Bea');
      const c = join(code, 'Cai');
      c.session.text('{"type":"needSea"}');
      a.session.close();
      expect(b.conn.last('seaRequest')).toBeDefined();
    });

    it('drops frames bigger than the limit', () => {
      const { create, join } = setup();
      const a = create();
      const b = join(a.conn.last('welcome')!.room.code);
      b.session.text('{"type":"needSea"}');
      a.session.binary(encodeSeaFrame(request(a.conn), new Uint8Array(MAX_SEA_BYTES + 1), false));
      expect(b.conn.bundles).toHaveLength(0);
    });
  });

  it('drops oversized text', () => {
    const { create } = setup();
    const a = create();
    a.session.text(JSON.stringify({ type: 'ping', t: 1, pad: 'x'.repeat(5000) }));
    expect(a.conn.last('pong')).toBeUndefined();
  });
});
