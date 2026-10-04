// Proposed candidate-only compilation; root must separately grant CPU lease.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from './baseline/node_modules/vite/dist/node/index.js';
const root = '/private/tmp/surf-tube-rowband-fps-20261004';
const expectedBuildId = '306258296';
const workerSha = 'e08444a9b72f73d62126a2e4b503092bc6e3cc7536d714a2e49743ed1293f480';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const record = file => { const b = readFileSync(file); return { path: file, bytes: b.length, sha256: sha(b) }; };
const verify = (file, pin) => { const r = record(file); assert.equal(r.bytes, pin.bytes, file); assert.equal(r.sha256, pin.sha256, file); };
const readyPath = path.join(root, 'ready.json'), readyBytes = readFileSync(readyPath), ready = JSON.parse(readyBytes);
assert.equal(process.env.ROWBAND_FPS_READY_SHA256, sha(readyBytes), 'Reviewed source-ready SHA required');
assert.equal(process.env.BUILD_ID, expectedBuildId, 'Candidate must use existing production BUILD_ID');
assert.equal(ready.stage, 'source-ready; checks/build/hardware unexecuted');
for (const pin of [...ready.artifacts, ...ready.borrowedSourceAuthorities]) verify(pin.path, pin);
assert(!existsSync(path.join(root, 'build-terminal.json')) && !existsSync(path.join(root, 'bindings.json')), 'Fresh build metadata only; no deletion/retry');
const sourcePath = path.join(root, 'source-manifest.json'), sourceBytes = readFileSync(sourcePath), source = JSON.parse(sourceBytes);
const reusePath = path.join(root, 'baseline-reuse.json'), reuse = JSON.parse(readFileSync(reusePath));
const dependency = JSON.parse(readFileSync(path.join(root, 'dependency-authority.json')));
const verifySource = arm => { for (const pin of arm.files) verify(path.join(arm.root, pin.path), pin); for (const key of ['public', 'node_modules']) assert.equal(readlinkSync(path.join(arm.root, key)), path.join('/Users/regina/Desktop/Projects/surfing-game', key)); };
const verifyBaseline = () => { for (const pin of reuse.outputRecords) verify(path.join(reuse.outputRoot, pin.path), pin); assert.equal(JSON.parse(readFileSync(path.join(reuse.outputRoot, 'build.json'))).build, expectedBuildId); };
for (const pin of dependency.packageRecords) verify(pin.path, pin);
for (const arm of source.arms) verifySource(arm);
verifyBaseline();
assert.equal(reuse.commonBuildId, expectedBuildId); assert.equal(reuse.sourcePinCount, 552); assert.equal(reuse.testCount, 92);
const candidate = source.arms.find(a => a.arm === 'candidate'); assert(candidate && candidate.fileCount === 554);
assert(!existsSync(path.join(candidate.root, 'dist')), 'Candidate output initially absent');
for (const arm of source.arms) assert(!existsSync(path.join(arm.root, 'build-manifest.json')), 'New wrappers initially absent');
const terminal = { schema: 'tube-rowband-candidate-build-terminal/v1', status: 'running', runtimeBaseline: source.baseline, buildId: expectedBuildId, readySha256: sha(readyBytes), sourceManifestSha256: sha(sourceBytes), baselineReused: true, armManifests: [], failure: null };
function outputs(dir, prefix = '') {
  const rows = [];
  for (const item of readdirSync(path.join(dir, prefix), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const name = path.posix.join(prefix, item.name); assert(!item.isSymbolicLink(), name);
    if (item.isDirectory()) rows.push(...outputs(dir, name));
    else if (item.isFile()) { const r = record(path.join(dir, name)); rows.push({ path: name, bytes: r.bytes, sha256: r.sha256 }); }
  }
  return rows;
}
function saveManifest(arm, metadata) {
  const value = { schema: 'tube-rowband-fps-build-arm/v1', arm: arm.arm, status: 'passed', runtimeBaseline: source.baseline, buildId: expectedBuildId, readySha256: sha(readyBytes), sourceManifest: record(sourcePath), literalSourceFiles: arm.fileCount, outputRoot: path.join(arm.root, 'dist'), taskPublicAssetCopies: false, ...metadata };
  const name = path.join(arm.root, 'build-manifest.json'); writeFileSync(name, json(value)); terminal.armManifests.push({ arm: arm.arm, ...record(name) });
}
try {
  console.log(JSON.stringify({ stage: 'START', arm: 'candidate', buildId: expectedBuildId, baselineReused: true }));
  const flags = { root: candidate.root, configFile: path.join(candidate.root, 'vite.config.ts'), configLoader: 'runner', cacheDir: path.join(candidate.root, '.cache/vite-build'), build: { outDir: path.join(candidate.root, 'dist'), copyPublicDir: false, emptyOutDir: false } };
  await build(flags);
  for (const arm of source.arms) verifySource(arm); verifyBaseline();
  const out = flags.build.outDir, rows = outputs(out), workers = rows.filter(r => /^assets\/surfZoneWorker-[^/]+\.js$/.test(r.path));
  assert.equal(rows.length, 11, 'Same eleven compiled files required'); assert.equal(workers.length, 1);
  assert.equal(workers[0].bytes, 447015); assert.equal(workers[0].sha256, workerSha, 'Renderer-only candidate must keep accepted worker byte-exact');
  assert.equal(JSON.parse(readFileSync(path.join(out, 'build.json'))).build, expectedBuildId);
  const html = readFileSync(path.join(out, 'index.html'), 'utf8'), matches = [...html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)]; assert.equal(matches.length, 1);
  const client = matches[0][1].replace(/^\//, ''); assert(rows.some(r => r.path === client));
  saveManifest(source.arms.find(a => a.arm === 'baseline'), { reusedCanonicalCompilation: true, originalCompilation: reuse.rootCompiled, originalBuildTerminal: reuse.rootTerminal, baselineReuse: record(reusePath), publicAssetCopies: 'original production flags not separately recorded; no new task copies', inlineBuildFlags: null, clientEntry: reuse.clientEntry, surfZoneWorker: reuse.surfZoneWorker, outputRecords: reuse.outputRecords });
  saveManifest(candidate, { reusedCanonicalCompilation: false, publicAssetCopies: false, inlineBuildFlags: flags, clientEntry: client, surfZoneWorker: workers[0].path, outputRecords: rows, overlaysApplied: source.overlaysAppliedInOrder });
  assert.equal(terminal.armManifests.length, 2);
  terminal.status = 'passed'; console.log(JSON.stringify({ stage: 'TERMINAL', status: 'passed', workerByteExact: true, armManifests: terminal.armManifests }));
} catch (error) { terminal.status = 'failed'; terminal.failure = String(error); throw error; }
finally { writeFileSync(path.join(root, 'build-terminal.json'), json(terminal)); }
