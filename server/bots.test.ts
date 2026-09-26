import { describe, expect, it } from 'vitest';
import { DEFAULT_SURFER } from '../src/game/SurferChoice';
import { POSE_BYTES, createPose, decodePose, encodePose, readBundle } from '../src/net/poseCodec';
import { lookFor, type ServerMessage } from '../src/net/protocol';
import { SURF_ZONE_STEP } from '../src/wave/SurfZoneRunner';
import { botSourceFrom, type BotSource } from './bots';
import { RoomRegistry, type Connection } from './RoomRegistry';

class FakeConnection implements Connection {
  texts: ServerMessage[] = [];
  bundles: Uint8Array[] = [];
  sendText(text: string): void {
    this.texts.push(JSON.parse(text) as ServerMessage);
  }
  sendBinary(data: Uint8Array): void {
    this.bundles.push(data.slice());
  }
  close(): void {}
  last<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }> | undefined {
    return this.texts.filter((message) => message.type === type).at(-1) as Extract<ServerMessage, { type: T }> | undefined;
  }
}

/** A track of `count` frames: a surfer drifting along shore from x = 0. */
function track(count: number): BotSource {
  const frames = new Uint8Array(count * POSE_BYTES);
  for (let i = 0; i < count; i += 1) {
    const pose = createPose();
    Object.assign(pose, { step: i, x: i * 0.1, z: -100, boardPresent: true, present: true, phase: 0, qw: 1 });
    encodePose(pose, new DataView(frames.buffer, i * POSE_BYTES, POSE_BYTES), 0);
  }
  return botSourceFrom(frames);
}

const look = lookFor(DEFAULT_SURFER);
const settings = (cap: number) => ({ spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap });

function setup(bots?: BotSource) {
  let now = 1_000_000;
  let counter = 0;
  const registry = new RoomRegistry({ build: 'b1', now: () => now, random: (n) => Uint8Array.from({ length: n }, () => (counter++ * 37) % 248), ...(bots ? { bots } : {}) });
  const open = () => {
    const conn = new FakeConnection();
    return { conn, session: registry.connect(conn) };
  };
  return { registry, open, advance: (ms: number) => { now += ms; }, now: () => now };
}

describe('dev bots (spec N1)', () => {
  it('fill a room with surfers replaying a recorded track, on the room\'s clock', () => {
    const { registry, open, advance } = setup(track(200));
    const a = open();
    a.session.text(JSON.stringify({ type: 'create', build: 'b1', settings: settings(50), name: 'Ana', look, bots: 3 }));
    expect(a.conn.last('welcome')!.players.map((player) => player.name)).toEqual(['Bot 1', 'Bot 2', 'Bot 3']);
    advance(2500);
    registry.tick();
    const ids: number[] = [];
    const pose = createPose();
    readBundle(a.conn.bundles.at(-1)!.buffer as ArrayBuffer, (id, view, offset) => {
      ids.push(id);
      decodePose(view, offset, pose);
      expect(pose.step).toBe(Math.round(2.5 / SURF_ZONE_STEP));
      expect(Math.abs(pose.x)).toBeLessThanOrEqual(75);
    });
    expect(ids).toHaveLength(3);
  });

  it('count toward the room\'s cap', () => {
    const { open } = setup(track(20));
    const a = open();
    a.session.text(JSON.stringify({ type: 'create', build: 'b1', settings: settings(3), name: 'Ana', look, bots: 5 }));
    expect(a.conn.last('welcome')!.players).toHaveLength(2);
    const b = open();
    b.session.text(JSON.stringify({ type: 'join', build: 'b1', code: a.conn.last('welcome')!.room.code, name: 'Bea', look }));
    expect(b.conn.last('refused')!.reason).toBe('full');
  });

  it('only exist when the server was started with them', () => {
    const { open } = setup();
    const a = open();
    a.session.text(JSON.stringify({ type: 'create', build: 'b1', settings: settings(50), name: 'Ana', look, bots: 3 }));
    expect(a.conn.last('welcome')!.players).toEqual([]);
  });

  it('are never asked for the sea', () => {
    const { open } = setup(track(20));
    const a = open();
    a.session.text(JSON.stringify({ type: 'create', build: 'b1', settings: settings(50), name: 'Ana', look, bots: 2 }));
    a.session.text('{"type":"needSea"}');
    expect(a.conn.last('fresh')).toEqual({ type: 'fresh' });
  });
});
