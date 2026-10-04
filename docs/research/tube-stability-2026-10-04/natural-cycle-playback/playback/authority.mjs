import { readFileSync, readlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const WORK = dirname(fileURLToPath(import.meta.url));
export const ROOT = '/Users/regina/Desktop/Projects/surfing-game';
export const SOURCE_WORK = '/private/tmp/surf-tube-fallback-current-20261004';
export const sha256 = raw => createHash('sha256').update(raw).digest('hex');
export function authority() {
  const raw = readFileSync(resolve(WORK, 'ready.json')), readySha256 = sha256(raw);
  if (process.env.NATURAL_TUBE_READY_SHA256 !== readySha256) throw Error('Reviewed natural playback readiness required');
  const ready = JSON.parse(raw), records = new Map();
  const add = row => {
    const old = records.get(row.path);
    if (old && (old.bytes !== row.bytes || old.sha256 !== row.sha256)) throw Error('Conflicting authority: ' + row.path);
    records.set(row.path, row);
  };
  for (const row of ready.ownedRecords) add({ ...row, path: resolve(WORK, row.path) });
  for (const row of [...ready.borrowedRecords, ...ready.assets, ...ready.captureServe]) add(row);
  for (const row of ready.links) if (readlinkSync(resolve(WORK, row.path)) !== row.target) throw Error('Owned read-only dependency alias changed: ' + row.path);
  const input = JSON.parse(readFileSync(resolve(SOURCE_WORK, 'check-inputs.json')));
  const original = JSON.parse(readFileSync(resolve(SOURCE_WORK, 'ready.json')));
  for (const row of original.records) add({ ...row, path: resolve(SOURCE_WORK, row.path) });
  for (const row of input.sourceLinks) {
    if (readlinkSync(row.linkPath) !== row.linkTarget) throw Error('Source alias changed: ' + row.linkPath);
    add(row);
  }
  for (const row of [...input.installedPackagesAndCriticalThreeReferences, ...input.canonicalConfigs, ...input.retainedReferences]) add(row);
  for (const row of records.values()) {
    const bytes = readFileSync(row.path);
    if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) throw Error('Changed pinned bytes: ' + row.path);
  }
  const before = readFileSync(resolve(SOURCE_WORK, 'baseline/src/main.ts'), 'utf8');
  const after = readFileSync(resolve(SOURCE_WORK, 'candidate/src/main.ts'), 'utf8');
  if (!before.includes("new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })") || !after.includes("new WebGLRenderer({ antialias: true, stencil: true, powerPreference: 'high-performance' })")) throw Error('Pinned literal main renderer options changed');
  return { ready, readySha256, records: [...records.values()] };
}
export function resolver(arm, pin) {
  const manifest = JSON.parse(readFileSync(resolve(SOURCE_WORK, 'source-manifest.json')));
  const input = JSON.parse(readFileSync(resolve(SOURCE_WORK, 'check-inputs.json')));
  const overlays = new Set(manifest.ownedPaths.map(row => row.path));
  const relativePaths = new Set([...input.sourceLinks.map(row => row.relativePath), ...overlays]);
  const pinned = new Set(pin.records.map(row => row.path));
  const choose = relative => arm === 'candidate' && overlays.has(relative) ? resolve(SOURCE_WORK, 'candidate', relative) : resolve(ROOT, relative);
  return { name: 'natural-playback-canonical-arm', resolveId(specifier, importer) {
    if (specifier.startsWith('@arm/')) return choose('src/' + specifier.slice(5) + '.ts');
    if (!importer || !specifier.startsWith('.')) return null;
    const clean = importer.split('?')[0]; let relative;
    for (const prefix of [resolve(SOURCE_WORK, 'candidate') + '/', ROOT + '/']) if (clean.startsWith(prefix)) relative = clean.slice(prefix.length);
    if (!relative?.startsWith('src/')) return null;
    const stem = resolve(ROOT, dirname(relative), specifier);
    const alternatives = [stem, stem + '.ts', stem + '.tsx', stem + '.json', resolve(stem, 'index.ts')].map(path => path.slice(ROOT.length + 1));
    const target = alternatives.find(path => relativePaths.has(path));
    if (!target) throw Error('Unpinned relative dependency: ' + importer + ' -> ' + specifier);
    return choose(target);
  }, load(id) {
    if ((id.startsWith(ROOT + '/src/') || id.startsWith(resolve(SOURCE_WORK, 'candidate/src') + '/')) && !pinned.has(id)) throw Error('Unpinned module: ' + id);
    return null;
  } };
}
