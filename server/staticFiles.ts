import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.hdr': 'application/octet-stream',
  '.exr': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.ktx2': 'image/ktx2',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/** The build a directory holds (Vite writes `build.json`), or 'dev'. */
export function readBuild(root: string): string {
  try {
    const { build } = JSON.parse(readFileSync(join(root, 'build.json'), 'utf8')) as { build?: unknown };
    return typeof build === 'string' && build ? build : 'dev';
  } catch {
    return 'dev';
  }
}

function notFound(response: ServerResponse): void {
  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
}

/**
 * The built game from `root` (spec N1): `/` is `index.html`; Vite's hashed
 * `/assets/` files are cached for good and everything else is revalidated.
 * Nothing outside `root` is ever served.
 */
export async function serveStatic(root: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' }).end();
    return;
  }
  let path: string;
  try {
    path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    notFound(response);
    return;
  }
  if (path.endsWith('/')) path += 'index.html';
  const base = resolve(root);
  const file = resolve(base, `.${normalize(`/${path}`)}`);
  if (!file.startsWith(base + sep) || path.includes('\0')) {
    notFound(response);
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) {
      notFound(response);
      return;
    }
    const hashed = path.startsWith('/assets/') && /-[\w-]{6,}\.\w+$/.test(path);
    response.writeHead(200, {
      'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch {
    notFound(response);
  }
}
