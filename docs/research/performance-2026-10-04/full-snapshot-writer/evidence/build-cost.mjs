import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WORK, sha, assertReady } from './authority.mjs';
const authority = assertReady();
const output = resolve(WORK, 'compiled/cost.mjs');
if (existsSync(output) || existsSync(resolve(WORK, 'compiled.json'))) throw Error('Refuse overwrite compiled evidence');
const records = new Map(authority.ready.inputs.map(row => [row.path, row]));
const { rolldown } = await import(pathToFileURL('/Users/regina/Desktop/Projects/surfing-game/node_modules/rolldown/dist/index.mjs').href);
const build = await rolldown({ input: resolve(WORK, 'cost.ts'), platform: 'node', external: ['three', /^node:/],
  plugins: [{ name: 'exact-shared-canonical-inputs', load(id) {
    const path = id.split('?')[0];
    if (path.startsWith(WORK + '/') || path.startsWith('/Users/regina/Desktop/Projects/surfing-game/src/')) {
      const row = records.get(path); if (!row) throw Error('Unpinned loaded source: ' + path);
      const raw = readFileSync(path); if (raw.length !== row.bytes || sha(raw) !== row.sha256) throw Error('Loaded source changed: ' + path);
    }
    return null;
  } }] });
mkdirSync(resolve(WORK, 'compiled'));
try { await build.write({ file: output, format: 'esm' }); } finally { await build.close(); }
assertReady();
const bytes = readFileSync(output);
writeFileSync(resolve(WORK, 'compiled.json'), JSON.stringify({ schema: 'full-snapshot-writer-compiled/v1', readySha256: authority.sha256, output: { path: output, bytes: bytes.length, sha256: sha(bytes) } }, null, 2) + '\n');
