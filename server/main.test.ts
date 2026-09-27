import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { DEFAULT_SURFER } from '../src/game/SurferChoice';
import { POSE_BYTES, readBundle } from '../src/net/poseCodec';
import { lookFor, type ServerMessage } from '../src/net/protocol';
import { startServer } from './main';

const servers: { close(): Promise<void> }[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

const settings = { spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, cap: 50 };

function site(): string {
  const root = mkdtempSync(join(tmpdir(), 'breakline-'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>Breakline</title>');
  writeFileSync(join(root, 'build.json'), JSON.stringify({ build: 'b9' }));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'assets', 'main-abc123.js'), 'console.log(1)');
  return root;
}

function open(port: number): Promise<WebSocket> {
  const socket = new WebSocket(`ws://localhost:${port}/ws`);
  return new Promise((resolve, reject) => {
    socket.on('open', () => resolve(socket));
    socket.on('error', reject);
  });
}

function next(socket: WebSocket, type: ServerMessage['type']): Promise<ServerMessage> {
  return new Promise((resolve) => {
    const listener = (data: WebSocket.RawData, binary: boolean) => {
      if (binary) return;
      const message = JSON.parse(String(data)) as ServerMessage;
      if (message.type !== type) return;
      socket.off('message', listener);
      resolve(message);
    };
    socket.on('message', listener);
  });
}

function nextBundle(socket: WebSocket): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const listener = (data: WebSocket.RawData, binary: boolean) => {
      if (!binary) return;
      socket.off('message', listener);
      const buffer = data as Buffer;
      resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
    };
    socket.on('message', listener);
  });
}

describe('server', () => {
  it('serves the game, with long caching only for hashed assets, and nothing outside it', async () => {
    const server = await startServer({ port: 0, root: site() });
    servers.push(server);
    const base = `http://localhost:${server.port}`;
    const page = await fetch(`${base}/`);
    expect(await page.text()).toContain('Breakline');
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(page.headers.get('cache-control')).toBe('no-cache');
    const asset = await fetch(`${base}/assets/main-abc123.js`);
    expect(asset.headers.get('content-type')).toContain('javascript');
    expect(asset.headers.get('cache-control')).toContain('immutable');
    expect((await fetch(`${base}/missing.js`)).status).toBe(404);
    expect((await fetch(`${base}/..%2Fpackage.json`)).status).toBe(404);
    expect((await fetch(`${base}/%2e%2e/%2e%2e/etc/passwd`)).status).toBe(404);
  });

  it('runs a room over WebSockets: create, join, poses relayed', async () => {
    const server = await startServer({ port: 0, root: site() });
    servers.push(server);
    const a = await open(server.port);
    const welcomed = next(a, 'welcome');
    a.send(JSON.stringify({ type: 'create', build: 'b9', settings, name: 'Ana', look: lookFor(DEFAULT_SURFER) }));
    const welcome = await welcomed as Extract<ServerMessage, { type: 'welcome' }>;
    expect(welcome.room.build).toBe('b9');

    const b = await open(server.port);
    const joined = next(b, 'welcome');
    b.send(JSON.stringify({ type: 'join', build: 'b9', code: welcome.room.code, name: 'Bea', look: lookFor(DEFAULT_SURFER) }));
    await joined;

    const bundle = nextBundle(b);
    a.send(new Uint8Array(POSE_BYTES).fill(3));
    const ids: number[] = [];
    readBundle(await bundle, (id) => ids.push(id));
    expect(ids).toEqual([welcome.you]);

    const left = next(b, 'left');
    a.close();
    expect(await left).toEqual({ type: 'left', id: welcome.you });
    b.close();
  });

  it('turns away a page on another build', async () => {
    const server = await startServer({ port: 0, root: site() });
    servers.push(server);
    const a = await open(server.port);
    const refused = next(a, 'refused');
    a.send(JSON.stringify({ type: 'create', build: 'old', settings, name: 'Ana', look: lookFor(DEFAULT_SURFER) }));
    expect(await refused).toEqual({ type: 'refused', reason: 'version' });
  });
});
