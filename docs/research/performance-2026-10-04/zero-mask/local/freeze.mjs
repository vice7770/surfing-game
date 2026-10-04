// ROOT review/freeze only, after the native lease and independent closure. Never runs a raster.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WORK, CAPTURE, HELPERS, SOURCE_NAMES, TARGETS, captureGraph, selectedInputs, record, verify, json, sourceDelta, within } from './authority.mjs';

assert.equal(process.env.ROOT_ZERO_MASK_SOURCE_REVIEWED, 'true');
const args = process.argv.slice(2);
assert.equal(args.length, 2);
assert(/^--capture-report-sha256=[0-9a-f]{64}$/.test(args[0]));
assert(/^--capture-driver-sha256=[0-9a-f]{64}$/.test(args[1]));
const expectedReport = args[0].split('=')[1], expectedDriver = args[1].split('=')[1];
const OUT = join(WORK, 'freeze-first'), readyPath = join(WORK, 'ready.json');
assert(!existsSync(OUT) && !existsSync(readyPath), 'First freeze outcome is immutable; repair requires a new package');
mkdirSync(OUT);
const outcome = { schema: 'zero-mask-partial-eight-freeze-first/v1', valid: false, nativeCaptureComplete: false, nineStateQuality: false, startedAt: new Date().toISOString(), firstFailure: null, inputsUnchangedAfter: null, adoption: false, qualityPass: false, fpsGate: false };
const pins = new Map();
const add = pin => { const old = pins.get(pin.path); if (old) assert.deepEqual(old, pin); else pins.set(pin.path, pin); return pin; };
function save() { const body = JSON.stringify(outcome) + '\n'; assert(Buffer.byteLength(body) <= 131072); writeFileSync(join(OUT, 'report.json'), body); }
save();
try {
  const plan = json(join(WORK, 'plan.json'));
  assert.equal(plan.schema, 'zero-mask-partial-eight-plan/v1'); assert.equal(plan.work, WORK); assert.equal(plan.captureWork, CAPTURE);
  assert.equal(plan.nativeCaptureComplete, false); assert.equal(plan.nineStateQuality, false);
  assert.deepEqual(plan.originalCaptureTargetsSeconds, [0, 5, 10, 15, 20, 25, 30, 35, 40]);
  assert.deepEqual(plan.targetsSeconds, TARGETS);
  assert.equal(plan.rawUniqueBytes, 96 * 1024 * 1024); assert.equal(plan.summaryBytes, 128 * 1024);
  assert.equal(plan.metadataFileBytes, 8 * 1024 * 1024); assert.equal(plan.gridNodes, 1048576);
  assert.equal(plan.logBytes, 1024 * 1024); assert.equal(plan.commandSeconds, 30); assert.equal(plan.cleanupSeconds, 1); assert.equal(plan.wholeSeconds, 31);
  assert.equal(plan.warmupCallsPerFunctionPerState, 1); assert.equal(plan.pairedCallsPerState, 8);
  const helpers = HELPERS.map(name => add(record(join(WORK, name))));
  const reportPin = add(record(join(CAPTURE, 'native-first', 'report.json')));
  const driverPin = add(record(join(CAPTURE, 'native-first.native-driver.json')));
  assert.equal(reportPin.sha256, expectedReport); assert.equal(driverPin.sha256, expectedDriver);
  const report = json(reportPin.path), driver = json(driverPin.path);
  assert.deepEqual(driver.nativeReport, reportPin);
  const graph = captureGraph(report, driver), selection = selectedInputs(report, graph);
  const captureReady = add(verify(report.ready)), bindingPin = add(verify(report.binding));
  const ready = json(captureReady.path), binding = json(bindingPin.path);
  assert.equal(ready.schema, 'wavelab-passive-original-ready/v2');
  assert.equal(binding.valid, true); assert.equal(binding.originalSource, true); assert.equal(binding.storageRevision, 2);
  assert.deepEqual(binding.ready, captureReady);
  within(CAPTURE, captureReady.path); within(CAPTURE, bindingPin.path);
  const sources = {};
  for (const rel of SOURCE_NAMES) {
    const path = join(CAPTURE, 'source', rel), copy = ready.sourceCopies.find(pin => pin.path === path);
    const original = ready.sourceFiles.find(pin => pin.path === join(report.plan.repository, rel));
    assert(copy && original, 'Original capture source authority missing: ' + rel);
    assert.equal(copy.bytes, original.bytes); assert.equal(copy.sha256, original.sha256);
    sources[rel] = add(verify(copy));
  }
  const original = readFileSync(join(WORK, 'original.ts'), 'utf8'), candidate = readFileSync(join(WORK, 'candidate.ts'), 'utf8');
  assert.equal(original, readFileSync(sources['src/scene/barrel/barrelMask.ts'].path, 'utf8'), 'Scratch original must reproduce the actual capture source bytes');
  const delta = sourceDelta(original, candidate);
  for (const pin of selection.files) add(verify(pin, plan.rawUniqueBytes));
  assert(pins.size <= 128, 'Input closure pin cap');
  for (const pin of pins.values()) verify(pin, Math.max(plan.rawUniqueBytes, plan.metadataFileBytes));
  outcome.inputsUnchangedAfter = true;
  const frozen = {
    schema: 'zero-mask-partial-eight-ready/v1', createdAt: new Date().toISOString(), plan, helpers, sources,
    nativeCaptureComplete: false, nineStateQuality: false,
    capture: { report: reportPin, driver: driverPin, ready: captureReady, binding: bindingPin, nativeValid: false, nativeIncomplete: true, retainedCompletedStates: 8, targetsSeconds: TARGETS,
      nativeFirstFailure: report.firstFailure, nativeCaptureFailure: report.capture.failure,
      physicalCaptureBytes: graph.physical, selectedUniqueBytes: selection.files.reduce((n, pin) => n + pin.bytes, 0) },
    selectedFields: selection.chosen, selectedFiles: selection.files, inputPins: [...pins.values()].sort((a, b) => a.path.localeCompare(b.path)), sourceDelta: delta,
    closure: 'All source/metadata and canonical raw files actually used by the harness are pinned. Other payload bytes and PNG pixels are not read or claimed independently verified; their original descriptor pins remain in the frozen native report.',
    inactiveTextureRule: 'Original set-count0 requires active0. The original WaterSurface leaves inactive texture bytes stale; they remain input receipts, with no retained-texture equality assertion. Every original/candidate raster output byte/count still must match.',
    adoption: false, qualityPass: false, fpsGate: false,
  };
  const body = JSON.stringify(frozen) + '\n'; assert(Buffer.byteLength(body) <= plan.summaryBytes);
  writeFileSync(readyPath, body, { flag: 'wx' });
  outcome.valid = true; outcome.ready = record(readyPath, plan.summaryBytes); outcome.inputPins = pins.size;
} catch (error) { outcome.firstFailure ??= String(error); process.exitCode = 1; }
finally {
  if (outcome.inputsUnchangedAfter !== true) {
    try { for (const pin of pins.values()) verify(pin, 96 * 1024 * 1024); outcome.inputsUnchangedAfter = true; }
    catch (error) { outcome.inputsUnchangedAfter = false; outcome.closureFailure = String(error); }
  }
  outcome.endedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ valid: outcome.valid, firstFailure: outcome.firstFailure, ready: outcome.ready ?? null, report: join(OUT, 'report.json') }));
}
