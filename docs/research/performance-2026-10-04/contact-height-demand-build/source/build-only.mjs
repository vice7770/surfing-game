import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from './baseline/node_modules/vite/dist/node/index.js';

// Proposed only. Root must approve the frozen ready authority and both strict arms.
const root = '/private/tmp/contact-height-demand-build-20261004';
const expectedBuildId = '68e263250-qa-contact-height';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const readyBytes = readFileSync(path.join(root, 'ready.json'));
assert.equal(process.env.CONTACT_HEIGHT_BUILD_READY_SHA256, sha(readyBytes), 'Exact reviewed ready authority is required');
assert.equal(process.env.BUILD_ID, expectedBuildId, 'Both arms must use the fixed common BUILD_ID');
const ready = JSON.parse(readyBytes);
assert.equal(ready.stage, 'source-ready; strict/build/hardware unexecuted');
assert.equal(ready.proposedBuild.commonBuildId, expectedBuildId);
assert.deepEqual(ready.scopeBlockers.buildSource, []);
for (const record of ready.preparedArtifacts) {
  const bytes = readFileSync(record.path);
  assert.equal(bytes.length, record.bytes, record.path);
  assert.equal(sha(bytes), record.sha256, record.path);
}
const sourceBytes = readFileSync(path.join(root, 'source-manifest.json'));
const source = JSON.parse(sourceBytes);
const dependency = JSON.parse(readFileSync(path.join(root, 'dependency-authority.json')));
for (const record of dependency.packageRecords) {
  const bytes = readFileSync(record.path);
  assert.equal(bytes.length, record.bytes, record.path);
  assert.equal(sha(bytes), record.sha256, record.path);
}
function verifySource(arm) {
  assert.equal(readlinkSync(path.join(arm.root, 'node_modules')), dependency.nodeModulesTarget);
  for (const record of arm.files) {
    const bytes = readFileSync(path.join(arm.root, record.path));
    assert.equal(bytes.length, record.bytes, record.path);
    assert.equal(sha(bytes), record.sha256, record.path);
  }
}
function outputRecords(directory, prefix = '') {
  const records = [];
  for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = path.posix.join(prefix, entry.name);
    assert(!entry.isSymbolicLink(), `No build-output symlink ${relative}`);
    if (entry.isDirectory()) records.push(...outputRecords(directory, relative));
    else if (entry.isFile()) {
      const bytes = readFileSync(path.join(directory, relative));
      records.push({ path: relative, bytes: bytes.length, sha256: sha(bytes) });
    }
  }
  return records;
}
const result = {
  schema: 'contact-height-two-arm-build-terminal/v1',
  status: 'running',
  scope: 'QA client/worker bundling only; no serving, browser, GPU, FPS or adoption',
  baseline: source.baseline,
  commonBuildId: expectedBuildId,
  readySha256: sha(readyBytes),
  sourceManifestSha256: sha(sourceBytes),
  armManifests: [],
  failure: null,
};
let activeArm;
try {
  assert.deepEqual(source.arms.map(arm => arm.arm), ['baseline', 'candidate']);
  for (const arm of source.arms) {
    verifySource(arm);
    assert.equal(arm.nonliteralOrResolutionBlockers.length, 0);
    assert(!existsSync(path.join(arm.root, 'dist')), `${arm.arm} output must be initially absent; no output deletion or retry`);
    assert(!existsSync(path.join(arm.root, 'build-manifest.json')), `${arm.arm} manifest must be initially absent`);
  }
  for (const arm of source.arms) {
    activeArm = arm.arm;
    console.log(`START proposed build arm=${arm.arm} BUILD_ID=${expectedBuildId}`);
    const flags = {
      root: arm.root,
      configFile: path.join(arm.root, 'vite.config.ts'),
      configLoader: 'runner',
      cacheDir: path.join(arm.root, '.cache/vite-build'),
      build: { outDir: path.join(arm.root, 'dist'), copyPublicDir: false, emptyOutDir: false },
    };
    await build(flags);
    verifySource(arm);
    const outputRoot = flags.build.outDir;
    const buildRecord = JSON.parse(readFileSync(path.join(outputRoot, 'build.json')));
    assert.equal(buildRecord.build, expectedBuildId);
    const records = outputRecords(outputRoot);
    const workers = records.filter(record => /^assets\/surfZoneWorker-[^/]+\.js$/.test(record.path));
    assert.equal(workers.length, 1, 'One real surf-zone worker artifact is required');
    const html = readFileSync(path.join(outputRoot, 'index.html'), 'utf8');
    const mainMatches = [...html.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"/g)];
    assert.equal(mainMatches.length, 1, 'One client module script is required');
    const mainPath = mainMatches[0][1].replace(/^\//, '');
    assert(records.some(record => record.path === mainPath), 'Client module artifact exists');
    const manifest = {
      schema: 'contact-height-build-arm/v1',
      arm: arm.arm,
      status: 'passed',
      scope: result.scope,
      runtimeBaseline: source.baseline,
      documentationHeadAtPreparation: source.documentationHeadAtPreparation,
      buildId: expectedBuildId,
      node: process.version,
      versions: dependency.packageRecords.map(record => ({ name: record.name, version: record.version, sha256: record.sha256 })),
      readySha256: result.readySha256,
      sourceManifest: { path: path.join(root, 'source-manifest.json'), bytes: sourceBytes.length, sha256: result.sourceManifestSha256 },
      literalSourceFiles: arm.fileCount,
      literalSourceBytes: arm.bytes,
      overlaysApplied: arm.arm === 'candidate' ? source.overlaysAppliedInOrder : [],
      inlineBuildFlags: flags,
      outputRoot,
      clientEntry: mainPath,
      surfZoneWorker: workers[0].path,
      outputRecords: records,
      publicAssetCopies: false,
      servingOrHardwareStarted: false,
    };
    const manifestPath = path.join(arm.root, 'build-manifest.json'), bytes = Buffer.from(json(manifest));
    writeFileSync(manifestPath, bytes);
    result.armManifests.push({ arm: arm.arm, path: manifestPath, bytes: bytes.length, sha256: sha(bytes) });
    console.log(`TERMINAL build arm=${arm.arm} manifestSha256=${sha(bytes)}`);
  }
  result.status = 'passed';
} catch (error) {
  result.status = 'failed';
  result.failure = { arm: activeArm ?? 'preflight', name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) };
  throw error;
} finally {
  writeFileSync(path.join(root, 'build-terminal.json'), json(result));
}
