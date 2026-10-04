import { readFileSync, readlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export const WORK = dirname(fileURLToPath(import.meta.url));
export const ROOT = '/Users/regina/Desktop/Projects/surfing-game';
export const FULL = '/private/tmp/surf-tube-fallback-current-20261004';
export const ROW = '/private/tmp/surf-tube-fallback-rowband-20261004';
export const sha256 = raw => createHash('sha256').update(raw).digest('hex');
export function authority() {
  const raw = readFileSync(resolve(WORK, 'ready.json')), readySha256 = sha256(raw);
  if (process.env.ROWBAND_NATIVE_READY_SHA256 !== readySha256) throw Error('Reviewed rowband native readiness required');
  const ready = JSON.parse(raw), records = new Map();
  const add = row => { const old = records.get(row.path);
    if (old && (old.bytes !== row.bytes || old.sha256 !== row.sha256)) throw Error('Conflicting pin: ' + row.path); records.set(row.path, row); };
  for (const row of ready.ownedRecords) add({ ...row, path: resolve(WORK, row.path) });
  for (const row of [...ready.borrowedRecords, ...ready.assets, ...ready.captureServe, ...ready.fullRuntime, ...ready.rowbandRuntime]) add(row);
  for (const row of ready.links) if (readlinkSync(resolve(WORK, row.path)) !== row.target) throw Error('Owned dependency alias changed');
  const input = JSON.parse(readFileSync(resolve(FULL, 'check-inputs.json'))), original = JSON.parse(readFileSync(resolve(FULL, 'ready.json')));
  for (const row of original.records) add({ ...row, path: resolve(FULL, row.path) });
  for (const row of input.sourceLinks) { if (readlinkSync(row.linkPath) !== row.linkTarget) throw Error('Borrowed source alias changed'); add(row); }
  for (const row of [...input.installedPackagesAndCriticalThreeReferences, ...input.canonicalConfigs, ...input.retainedReferences]) add(row);
  for (const row of records.values()) { const bytes = readFileSync(row.path);
    if (bytes.length !== row.bytes || sha256(bytes) !== row.sha256) throw Error('Changed authority bytes: ' + row.path); }
  const fullMain = readFileSync(resolve(FULL, 'candidate/src/main.ts'), 'utf8');
  if (!fullMain.includes("new WebGLRenderer({ antialias: true, stencil: true, powerPreference: 'high-performance' })")) throw Error('Held literal context changed');
  for (const row of ready.rowbandRuntime) if (!ready.rowChangedPaths.includes(row.relativePath)) {
    const full = ready.fullRuntime.find(other => other.relativePath === row.relativePath);
    if (!full || full.bytes !== row.bytes || full.sha256 !== row.sha256) throw Error('Unexpected rowband runtime composition: ' + row.relativePath);
  }
  return { ready, readySha256, records: [...records.values()] };
}
export function resolver(arm, pin) {
  const input = JSON.parse(readFileSync(resolve(FULL, 'check-inputs.json')));
  const fullPaths = new Set(pin.ready.fullRuntime.map(row => row.relativePath));
  const rowPaths = new Set(pin.ready.rowChangedPaths);
  const known = new Set([...input.sourceLinks.map(row => row.relativePath), ...fullPaths, ...rowPaths]);
  const pinned = new Set(pin.records.map(row => row.path));
  const choose = relative => arm === 'candidate' && rowPaths.has(relative) ? resolve(ROW, relative)
    : fullPaths.has(relative) ? resolve(FULL, 'candidate', relative) : resolve(ROOT, relative);
  return { name: 'full-fallback-vs-rowband-canonical-arm', resolveId(specifier, importer) {
    if (specifier.startsWith('@arm/')) return choose('src/' + specifier.slice(5) + '.ts');
    if (!importer || !specifier.startsWith('.')) return null;
    const clean = importer.split('?')[0]; let relative;
    for (const prefix of [resolve(FULL, 'candidate') + '/', ROW + '/', ROOT + '/']) if (clean.startsWith(prefix)) relative = clean.slice(prefix.length);
    if (!relative?.startsWith('src/')) return null;
    const stem = resolve(ROOT, dirname(relative), specifier);
    const options = [stem, stem + '.ts', stem + '.tsx', stem + '.json', resolve(stem, 'index.ts')].map(path => path.slice(ROOT.length + 1));
    const found = options.find(path => known.has(path)); if (!found) throw Error('Unpinned source dependency: ' + importer + ' -> ' + specifier);
    return choose(found);
  }, load(id) {
    if ((id.startsWith(ROOT + '/src/') || id.startsWith(resolve(FULL, 'candidate/src') + '/') || id.startsWith(ROW + '/src/')) && !pinned.has(id)) throw Error('Unpinned loaded module: ' + id);
    return null;
  } };
}
