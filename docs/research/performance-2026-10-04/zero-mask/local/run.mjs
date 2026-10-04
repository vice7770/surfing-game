// Future ROOT-owned offline execution. No imports from the repository or native/browser/physics helpers.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { WORK, TARGETS, record, verify, json, bytes, hash, captureGraph, selectedInputs, sourceDelta, compileRaster } from './authority.mjs';
import { existingRegression, overlapFixture } from './fixtures.mjs';

assert.equal(process.env.ROOT_ZERO_MASK_OFFLINE_LEASE, 'true');
assert.equal(Number(process.env.ROOT_ZERO_MASK_DRIVER_PID), process.ppid, 'Independent supervisor required');
const args = process.argv.slice(2); assert.equal(args.length, 1); assert(/^--ready-sha256=[0-9a-f]{64}$/.test(args[0]));
const OUT = join(WORK, 'offline-first'); assert(!existsSync(OUT), 'First result immutable; no retry'); mkdirSync(OUT);
const started = performance.now();
const result = { schema: 'zero-mask-partial-eight-offline-first/v1', valid: false, incomplete: true, nativeCaptureComplete: false, nineStateQuality: false, startedAt: new Date().toISOString(), firstFailure: null,
  phase: 'input', states: [], regression: null, overlap: null, timings: [], inputsUnchangedBefore: null, inputsUnchangedAfter: null, arraysUnchangedAfter: null,
  adoption: false, qualityPass: false, fpsGate: false, scope: 'Local CPU mask parity/cost on all eight completed states from FAILED native V2. Does not complete/accept native capture, nine-state quality, renderer, physics, game FPS or video-artifact reproduction.' };
let ready, original, candidate, loaded = new Map(), usedPins = [], arraysBefore = [];
function deadline() { assert(performance.now() - started <= 30000, '30s offline command work deadline'); }
function save() { const body = JSON.stringify(result) + '\n'; assert(Buffer.byteLength(body) <= 128 * 1024, '128KiB summary cap'); writeFileSync(join(OUT, 'report.json'), body); }
function compare(a, b, label) {
  assert.equal(a.length, b.length); let mismatches = 0; const first = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { mismatches++; if (first.length < 16) first.push({ node: i, original: a[i], other: b[i] }); }
  assert.equal(mismatches, 0, label + ': ' + JSON.stringify({ mismatches, first }));
}
function readArray(field) {
  let raw = loaded.get(field.file.path);
  if (!raw) {
    raw = bytes(field.file.path, ready.plan.rawUniqueBytes);
    assert.equal(raw.length, field.file.bytes); assert.equal(hash(raw), field.file.sha256);
    assert([...loaded.values()].reduce((n, b) => n + b.length, raw.length) <= ready.plan.rawUniqueBytes);
    loaded.set(field.file.path, raw);
  }
  assert.equal(raw.length, field.bytes);
  const constructors = { Float32Array, Uint32Array, Uint8Array }; const Type = constructors[field.type]; assert(Type);
  // Copy into one aligned buffer; the exact byte sequence is preserved, including Float32 words.
  const owned = new Uint8Array(raw.length); owned.set(raw); const value = new Type(owned.buffer);
  assert.equal(value.length, field.elements); arraysBefore.push({ value, sha256: hash(owned) }); return value;
}
function validateState(frame, byLabel) {
  deadline(); const id = 'state-' + frame.index;
  const array = name => readArray(byLabel.get(id + '/' + name));
  const loft = { positions: array('loft-positions'), mask: array('loft-mask'), indices: array('loft-indices'), vertexCount: frame.loft.vertexCount, indexCount: frame.loft.indexCount };
  const meshP = array('mesh-position'), meshI = array('mesh-indices'), retained = array('texture-waterBarrelMask');
  const grid = frame.water.maskGrid;
  assert([grid.xMin, grid.zMin, grid.spacing].every(Number.isFinite) && grid.spacing > 0);
  assert(Number.isSafeInteger(grid.nx) && grid.nx > 0 && Number.isSafeInteger(grid.nz) && grid.nz > 0);
  const nodes = grid.nx * grid.nz; assert(Number.isSafeInteger(nodes) && nodes <= ready.plan.gridNodes && retained.length === nodes);
  assert.deepEqual(frame.waterUniforms.waterBarrelGrid, [grid.xMin, grid.zMin, grid.spacing, 0]);
  assert.deepEqual(frame.waterUniforms.waterBarrelGridSize, [grid.nx, grid.nz]);
  assert.equal(frame.waterUniforms.waterBarrelMask.width, grid.nx); assert.equal(frame.waterUniforms.waterBarrelMask.height, grid.nz);
  assert.equal(frame.loft.indexCount, frame.indexCount); assert(Number.isSafeInteger(loft.vertexCount) && loft.vertexCount >= 0);
  assert(Number.isSafeInteger(loft.indexCount) && loft.indexCount >= 0 && loft.indexCount % 3 === 0);
  assert.equal(loft.positions.length, 3 * loft.vertexCount); assert.equal(loft.mask.length, loft.vertexCount); assert.equal(loft.indices.length, loft.indexCount);
  assert(loft.positions.every(Number.isFinite), 'Nonfinite original positions');
  assert(loft.mask.every(v => Number.isFinite(v) && v >= 0 && v <= 1), 'Original mask outside finite source domain');
  assert(loft.indices.every(v => v < loft.vertexCount), 'Original index out of active prefix');
  assert.equal(frame.actualActiveVertices, loft.indexCount > 0 ? loft.vertexCount : 0);
  assert.equal(meshP.length, 3 * frame.actualActiveVertices); assert.equal(meshI.length, loft.indexCount);
  assert.equal(frame.barrelMesh.drawRange.start, 0); assert.equal(frame.barrelMesh.drawRange.count, loft.indexCount);
  if (loft.indexCount > 0) assert(Buffer.from(meshP.buffer).equals(Buffer.from(loft.positions.buffer)), 'Actual mesh/loft position words differ');
  let flipped = 0, zeroMaskTriangles = 0;
  for (let t = 0; t < loft.indexCount; t += 3) {
    const a = loft.indices[t], b = loft.indices[t + 1], c = loft.indices[t + 2];
    assert.equal(meshI[t], a);
    if (meshI[t + 1] === b && meshI[t + 2] === c) {} else { assert.equal(meshI[t + 1], c); assert.equal(meshI[t + 2], b); flipped++; }
    if (loft.mask[a] === 0 && loft.mask[b] === 0 && loft.mask[c] === 0) zeroMaskTriangles++;
  }
  const outOriginal = new Uint8Array(nodes).fill(255), outCandidate = new Uint8Array(nodes).fill(255);
  const setOriginal = original(loft, grid, outOriginal); deadline();
  const setCandidate = candidate(loft, grid, outCandidate); deadline();
  const receipt = { index: frame.index, targetSeconds: frame.targetSeconds, phase: frame.phase, seaTime: frame.status.seaTime,
    vertices: loft.vertexCount, indices: loft.indexCount, triangles: loft.indexCount / 3, nodes, zeroMaskTriangles,
    zeroMaskTriangleFraction: loft.indexCount > 0 ? zeroMaskTriangles / (loft.indexCount / 3) : null, permittedRendererWindingSwaps: flipped,
    originalSet: setOriginal, candidateSet: setCandidate, originalBytesSha256: hash(outOriginal), candidateBytesSha256: hash(outCandidate),
    originalActive: frame.waterUniforms.waterBarrelMaskActive, retainedTexture: byLabel.get(id + '/texture-waterBarrelMask').file,
    originalPNG: frame.pixels.field.file, camera: frame.camera, exactOutputParity: false, retainedActiveTextureReproduction: null };
  result.states.push(receipt); save();
  assert.equal(setOriginal, outOriginal.reduce((n, v) => n + (v > 0 ? 1 : 0), 0));
  assert.equal(setCandidate, outCandidate.reduce((n, v) => n + (v > 0 ? 1 : 0), 0));
  assert.equal(frame.waterUniforms.waterBarrelMaskActive, setOriginal > 0 ? 1 : 0, 'Original active decision differs');
  if (setOriginal > 0) { compare(outOriginal, retained, 'Retained active texture reproduction ' + id); receipt.retainedActiveTextureReproduction = true; }
  else receipt.retainedActiveTextureReproduction = 'Inactive0: original source retains stale ignored texture bytes; identity preserved, equality is inapplicable';
  assert.equal(setOriginal, setCandidate); compare(outOriginal, outCandidate, 'Candidate complete output ' + id); receipt.exactOutputParity = true; save();
  return { frame, loft, grid, outOriginal, outCandidate, expected: outOriginal.slice(), set: setOriginal };
}
save();
try {
  const readyPin = record(join(WORK, 'ready.json'), 128 * 1024); assert.equal(readyPin.sha256, args[0].split('=')[1]);
  ready = json(readyPin.path, 128 * 1024); assert.equal(ready.schema, 'zero-mask-partial-eight-ready/v1');
  assert.equal(ready.nativeCaptureComplete, false); assert.equal(ready.nineStateQuality, false);
  assert.deepEqual(ready.plan.targetsSeconds, TARGETS); assert.equal(ready.plan.commandSeconds, 30);
  assert.equal(ready.plan.rawUniqueBytes, 96 * 1024 * 1024); assert.equal(ready.plan.summaryBytes, 128 * 1024);
  assert.equal(ready.plan.warmupCallsPerFunctionPerState, 1); assert.equal(ready.plan.pairedCallsPerState, 8);
  usedPins = [readyPin, ...ready.inputPins]; assert(usedPins.length <= 129);
  for (const pin of usedPins) { verify(pin, ready.plan.rawUniqueBytes); deadline(); }
  result.inputsUnchangedBefore = true; result.ready = readyPin; result.capture = ready.capture;
  const report = json(ready.capture.report.path), driver = json(ready.capture.driver.path), graph = captureGraph(report, driver), selection = selectedInputs(report, graph);
  assert.deepEqual(selection.chosen, ready.selectedFields); assert.deepEqual(selection.files, ready.selectedFiles);
  const originalSource = readFileSync(join(WORK, 'original.ts'), 'utf8'), candidateSource = readFileSync(join(WORK, 'candidate.ts'), 'utf8');
  assert.equal(originalSource, readFileSync(ready.sources['src/scene/barrel/barrelMask.ts'].path, 'utf8'));
  result.sourceDelta = sourceDelta(originalSource, candidateSource);
  result.analyticZeroContribution = {
    source: ready.helpers.find(pin => pin.path === join(WORK, 'analytic-proof.md')),
    rationale: 'All three exact zero mask words yield zero/signed-zero for finite barycentric arithmetic, or NaN for nonfinite multiplication by zero. None is strictly greater than a nonnegative Uint8 node. Other triangles and the final count see unchanged bytes.',
    scope: 'Exact frozen raster/update formula and single guard; source argument, not physical/visual or FPS evidence',
  };
  assert(result.analyticZeroContribution.source);
  original = compileRaster(originalSource); candidate = compileRaster(candidateSource);
  const byLabel = new Map(ready.selectedFields.map(field => [field.label, field]));
  const states = []; result.phase = 'all-eight-local-parity'; save();
  for (const frame of report.capture.frames) states.push(validateState(frame, byLabel));
  assert.equal(result.states.length, 8); assert(result.states.every(state => state.exactOutputParity));
  result.phase = 'regression'; save();
  const testSource = readFileSync(ready.sources['src/scene/barrel/barrelMask.test.ts'].path, 'utf8');
  result.regression = { original: existingRegression(testSource, original), candidate: existingRegression(testSource, candidate), authority: ready.sources['src/scene/barrel/barrelMask.test.ts'] };
  result.overlap = overlapFixture(original, candidate); deadline(); save();
  result.phase = 'paired-whole-raster-cost'; result.costProtocol = {
    pairsPerState: 8, warmupsPerFunctionPerState: 1, order: 'Even pair original→candidate; odd pair candidate→original',
    charged: 'Every entire unchanged raster function, including out.fill(0), all original triangle/node work and final set-node scan',
    excluded: 'Input I/O/hashes, output allocation, parity comparisons and fixture execution lie outside each call timer',
    limits: 'Short CPU measurements in this offline process; no materiality threshold, sustained FPS claim or adoption decision',
  }; save();
  for (const state of states) {
    for (const [fn, out] of [[original, state.outOriginal], [candidate, state.outCandidate]]) {
      assert.equal(fn(state.loft, state.grid, out), state.set); compare(out, state.expected, 'Warmup parity'); deadline();
    }
    const timing = { index: state.frame.index, targetSeconds: state.frame.targetSeconds, pairs: [], originalMs: [], candidateMs: [] }; result.timings.push(timing); save();
    for (let pair = 0; pair < 8; pair++) {
      const order = pair % 2 ? ['candidate', 'original'] : ['original', 'candidate'], row = { pair, order };
      for (const name of order) {
        deadline(); const fn = name === 'original' ? original : candidate, out = name === 'original' ? state.outOriginal : state.outCandidate;
        const begin = performance.now(), set = fn(state.loft, state.grid, out), elapsedMs = performance.now() - begin;
        row[name + 'Ms'] = elapsedMs; timing[name + 'Ms'].push(elapsedMs);
        assert.equal(set, state.set); compare(out, state.expected, 'Timed complete parity'); deadline();
      }
      timing.pairs.push(row); save();
    }
    timing.originalTotalMs = timing.originalMs.reduce((a, b) => a + b, 0); timing.candidateTotalMs = timing.candidateMs.reduce((a, b) => a + b, 0);
    timing.totalDifferenceMs = timing.originalTotalMs - timing.candidateTotalMs; save();
  }
  assert.equal(result.timings.length, 8); result.phase = 'input-closure'; save(); deadline();
  result.valid = true; result.incomplete = false;
} catch (error) { result.firstFailure ??= String(error); result.valid = false; result.incomplete = true; process.exitCode = 1; }
finally {
  try {
    for (const pin of usedPins) { verify(pin, 96 * 1024 * 1024); deadline(); }
    result.inputsUnchangedAfter = true;
  } catch (error) { result.inputsUnchangedAfter = false; result.firstFailure ??= String(error); result.closureFailure = String(error); result.valid = false; result.incomplete = true; process.exitCode = 1; }
  try {
    for (const array of arraysBefore) assert.equal(hash(new Uint8Array(array.value.buffer)), array.sha256, 'Retained working array mutation');
    result.arraysUnchangedAfter = true;
  } catch (error) { result.arraysUnchangedAfter = false; result.firstFailure ??= String(error); result.arrayClosureFailure = String(error); result.valid = false; result.incomplete = true; process.exitCode = 1; }
  result.readUniqueRawBytes = [...loaded.values()].reduce((n, b) => n + b.length, 0); result.readUniqueRawFiles = loaded.size;
  result.elapsedMs = performance.now() - started; result.endedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ valid: result.valid, incomplete: result.incomplete, firstFailure: result.firstFailure, elapsedMs: result.elapsedMs, report: join(OUT, 'report.json') }));
}
