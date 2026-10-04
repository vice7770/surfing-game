import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const WORK = dirname(fileURLToPath(import.meta.url));
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function assertReady() {
  const raw = readFileSync(resolve(WORK, 'ready.json'));
  if (sha(raw) !== process.env.FULL_SNAPSHOT_READY_SHA256) throw Error('Explicit reviewed source-ready binding required');
  const ready = JSON.parse(raw);
  if (ready.schema !== 'full-snapshot-writer-ready/v1' || ready.status !== 'source-only') throw Error('Wrong ready scope');
  for (const row of ready.inputs) {
    const bytes = readFileSync(row.path);
    if (bytes.length !== row.bytes || sha(bytes) !== row.sha256) throw Error('Changed source/input: ' + row.path);
  }
  return { ready, sha256: sha(raw) };
}
