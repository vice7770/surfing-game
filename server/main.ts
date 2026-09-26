import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';
import { WebSocketServer, type RawData } from 'ws';
import { POSE_HZ } from '../src/net/protocol';
import { RoomRegistry } from './RoomRegistry';
import { readBuild, serveStatic } from './staticFiles';

export interface ServerOptions {
  port: number;
  /** The built game (Vite's `dist`). */
  root: string;
  /** The build rooms run; read from `root/build.json` by default. */
  build?: string;
}

export interface RunningServer {
  port: number;
  close(): Promise<void>;
}

/** Bigger frames close the socket (the sessions themselves drop anything over MAX_MESSAGE_BYTES). */
const MAX_FRAME_BYTES = 64 * 1024;
/** How often empty rooms are looked for, ms. */
const SWEEP_MS = 10_000;

function bytes(data: RawData): Uint8Array {
  if (Array.isArray(data)) return new Uint8Array(Buffer.concat(data));
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

/**
 * The game and its rooms from one process (spec N1): the built game over HTTP,
 * and `/ws` for rooms. Rooms live in memory: a restart ends them all.
 */
export async function startServer(options: ServerOptions): Promise<RunningServer> {
  const build = options.build ?? readBuild(options.root);
  const registry = new RoomRegistry({ build, now: () => Date.now(), random: (count) => crypto.getRandomValues(new Uint8Array(count)) });
  const server = createServer((request, response) => {
    void serveStatic(options.root, request, response);
  });
  const sockets = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_FRAME_BYTES });
  sockets.on('connection', (socket) => {
    const session = registry.connect({
      sendText: (text) => {
        if (socket.readyState === socket.OPEN) socket.send(text);
      },
      sendBinary: (data) => {
        if (socket.readyState === socket.OPEN) socket.send(data, { binary: true });
      },
      close: () => socket.close(),
    });
    socket.on('message', (data, binary) => {
      if (binary) session.binary(bytes(data));
      else session.text(String(data));
    });
    socket.on('close', () => session.close());
    socket.on('error', () => socket.terminate());
  });
  const tick = setInterval(() => registry.tick(), 1000 / POSE_HZ);
  const sweep = setInterval(() => registry.sweep(), SWEEP_MS);
  await new Promise<void>((resolve) => server.listen(options.port, resolve));
  const { port } = server.address() as AddressInfo;
  return {
    port,
    close: () => {
      clearInterval(tick);
      clearInterval(sweep);
      for (const client of sockets.clients) client.terminate();
      sockets.close();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

async function main(): Promise<void> {
  const root = process.env.STATIC_DIR ?? 'dist';
  const running = await startServer({ port: Number(process.env.PORT ?? 8787), root });
  console.log(`Breakline: the game and its rooms on http://localhost:${running.port} (build ${readBuild(root)}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void main();
