// Future offline-only helpers. Builtins only; never imports a game, browser, solver or TS module.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const WORK = '/private/tmp/surf-zero-mask-triangle-20261004/partial-eight';
export const CAPTURE = '/private/tmp/surf-wavelab-passive-original-v2-20261004';
export const TARGETS = [0, 5, 10, 15, 20, 25, 30, 35];
export const ORIGINAL_TARGETS = [0, 5, 10, 15, 20, 25, 30, 35, 40];
export const SOURCE_NAMES = [
  'src/scene/barrel/barrelMask.ts', 'src/scene/barrel/barrelMask.test.ts',
  'src/scene/barrel/SweptBarrel.ts', 'src/scene/barrel/SweptBarrelMesh.ts', 'src/scene/WaterSurface.ts',
];
export const HELPERS = ['README.md', 'plan.json', 'original.ts', 'candidate.ts', 'analytic-proof.md', 'authority.mjs', 'fixtures.mjs', 'freeze.mjs', 'run.mjs', 'offline-driver.py'];
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function within(root, path) {
  const p = resolve(path), rel = relative(root, p);
  assert(rel && !rel.startsWith('..') && !rel.startsWith('/') && resolve(root, rel) === p, 'Path outside owned input tree: ' + p);
  return p;
}
export function bytes(path, cap) {
  const p = resolve(path), stat = lstatSync(p);
  assert(stat.isFile() && !stat.isSymbolicLink() && realpathSync(p) === p, 'Nonregular/symlink input: ' + p);
  assert(Number.isSafeInteger(stat.size) && stat.size <= cap, 'Input file byte cap: ' + p);
  return readFileSync(p);
}
export function record(path, cap = 8 * 1024 * 1024) {
  const p = resolve(path), body = bytes(p, cap);
  return { path: p, bytes: body.length, sha256: hash(body) };
}
export function verify(pin, cap = 8 * 1024 * 1024) {
  assert(pin && Number.isSafeInteger(pin.bytes) && pin.bytes >= 0 && /^[0-9a-f]{64}$/.test(pin.sha256));
  const actual = record(pin.path, cap);
  assert.deepEqual(actual, { path: pin.path, bytes: pin.bytes, sha256: pin.sha256 }, 'Input identity changed: ' + pin.path);
  return actual;
}
export function json(path, cap = 8 * 1024 * 1024) { return JSON.parse(bytes(path, cap).toString('utf8')); }
export function replaceOnce(source, literal, replacement) {
  assert.equal(source.split(literal).length, 2, 'Expected exactly one source literal: ' + literal);
  return source.replace(literal, () => replacement);
}
export function sourceDelta(original, candidate) {
  const anchor = '    const c = indices[t + 2];\n';
  const guard = '    if (mask[a] === 0 && mask[b] === 0 && mask[c] === 0) continue;\n';
  assert.equal(candidate, replaceOnce(original, anchor, anchor + guard), 'Candidate must contain only the single exact guard');
  return { anchor, guard, method: 'One callback literal insertion; all other source bytes equal' };
}
export function compileRaster(source) {
  let body = replaceOnce(source, "import type { LoftResult } from '../../wave/barrel/sweptLoft';\n", '');
  body = replaceOnce(body, "import type { SurfaceGrid } from '../WaterSurface';\n", '');
  body = replaceOnce(body, 'export function rasterizeBarrelMask(loft: LoftResult, grid: SurfaceGrid, out: Uint8Array): number {', 'function rasterizeBarrelMask(loft, grid, out) {');
  assert(!/^import\b/m.test(body), 'Unexpected runtime import');
  return new Function('"use strict";\n' + body + '\nreturn rasterizeBarrelMask;')();
}

// Metadata graph validation matches the V2 transporter, including same-state buffer aliases.
export function captureGraph(report, driver) {
  assert.equal(report.schema, 'wavelab-passive-original-native/v1');
  assert.equal(report.plan?.schema, 'wavelab-passive-original-plan/v2');
  assert.equal(report.plan.work, CAPTURE);
  assert.deepEqual(report.plan.targetsSeconds, ORIGINAL_TARGETS);
  for (const key of ['adoption', 'qualityPass', 'fpsGate']) assert.equal(report[key], false);
  assert.equal(report.valid, false); assert.equal(report.incomplete, true);
  assert.equal(report.partialEvidencePreserved, true); assert(typeof report.firstFailure === 'string' && report.firstFailure.length > 0);
  assert.equal(report.capture?.state, 'incomplete'); assert.equal(report.capture.failure, 'Error: 96MiB retained numerical/typed payload exceeded');
  assert.equal(report.capture.frames.length, 8);
  assert.deepEqual(report.capture.frames.map(f => f.index), TARGETS.map((_, i) => i));
  assert.deepEqual(report.capture.frames.map(f => f.targetSeconds), TARGETS);
  assert.equal(driver.schema, 'root-passive-original-native-driver/v1');
  assert.equal(driver.valid, false); assert.equal(driver.exitCode, 1);
  assert.equal(driver.nativeValid, false); assert.equal(driver.nativeIncomplete, true);
  assert.equal(driver.nativeFirstFailure, report.firstFailure);
  assert.equal(driver.independentClosureValid, true);
  assert.equal(driver.readySha256, report.ready.sha256); assert.equal(driver.bindingsSha256, report.binding.sha256);
  assert.deepEqual(driver.membersAfterCleanup, []);
  for (const port of [4259, 9669]) { assert.equal(report.postPorts[port].closed, true); assert.equal(driver.postPorts[port].closed, true); }
  const owned = new Map(), all = new Map(), artifacts = new Map();
  assert(report.artifacts.length <= 4096 && report.capture.fields.length <= 4096);
  for (const pin of report.artifacts) {
    within(join(CAPTURE, 'native-first'), pin.path);
    assert(!artifacts.has(pin.path)); artifacts.set(pin.path, pin);
  }
  let physical = 0, logicalOwned = 0, logicalAlias = 0, across = 0;
  for (const f of report.capture.fields) {
    assert(typeof f.label === 'string' && !f.label.includes('..') && !all.has(f.label));
    assert(Number.isSafeInteger(f.bytes) && f.bytes >= 0 && f.bytes <= 96 * 1024 * 1024);
    assert(f.file && artifacts.has(f.file.path)); assert.deepEqual(f.file, artifacts.get(f.file.path));
    if (f.kind === 'typed') {
      assert.equal(f.semanticField, f.label.replace(/^state-[0-8]\//, ''));
      const widths = { Float32Array: 4, Float64Array: 8, Uint32Array: 4, Int32Array: 4, Uint16Array: 2, Int16Array: 2, Uint8Array: 1, Uint8ClampedArray: 1, Int8Array: 1 };
      assert(widths[f.type] && Number.isSafeInteger(f.elements) && f.elements >= 0 && f.bytes === f.elements * widths[f.type]);
      logicalOwned += f.bytes;
      if (f.payloadDuplicateOf !== undefined) {
        const c = owned.get(f.payloadDuplicateOf); assert(c && c.kind === 'typed' && c.payloadDuplicateOf === undefined);
        for (const k of ['semanticField', 'type', 'elements', 'bytes']) assert.equal(f[k], c[k]);
        assert.equal(f.payloadCanonical, c.label); assert.equal(f.physicalBytes, 0);
        assert.equal(f.payloadEquality?.equalBytes, f.bytes);
        assert.equal(f.payloadEquality?.method, 'Exact full Uint8 byte comparison against earlier immutable owned canonical of same semantic field/type/elements/bytes');
        assert.deepEqual(f.file, c.file); across += 1;
      } else {
        assert.equal(f.payloadCanonical, f.label); assert.equal(f.physicalBytes, f.bytes); physical += f.bytes;
      }
    } else { assert.equal(f.kind, 'png'); assert.equal(f.file.bytes, f.bytes); }
    owned.set(f.label, f); all.set(f.label, f);
  }
  assert((report.capture.bufferAliases?.length ?? 0) <= 4096);
  for (const a of report.capture.bufferAliases ?? []) {
    assert(!all.has(a.label)); const source = owned.get(a.field); assert(source?.kind === 'typed');
    assert.equal(a.label.split('/')[0], source.label.split('/')[0]);
    assert.equal(a.payloadDuplicateOf, source.label); assert.equal(a.physicalBytes, 0);
    for (const k of ['type', 'elements', 'bytes', 'payloadCanonical']) assert.equal(a[k], source[k]);
    assert.equal(a.payloadEquality?.equalBytes, a.bytes);
    assert.equal(a.payloadEquality?.method, 'Same original buffer/type/interval within this state');
    assert.deepEqual(a.file, source.file); logicalAlias += a.bytes; all.set(a.label, a);
  }
  assert.equal(physical, report.capture.typedPhysicalBytes); assert.equal(physical, report.capture.typedBytes);
  assert(physical <= 96 * 1024 * 1024);
  assert.equal(logicalOwned, report.capture.typedLogicalOwnedFieldBytes); assert.equal(logicalAlias, report.capture.typedLogicalBufferAliasBytes);
  assert.equal(logicalOwned + logicalAlias, report.capture.typedLogicalBytes);
  assert.equal(across, report.capture.typedPayloadAliases); assert.equal(report.capture.bufferAliases.length, report.capture.typedSameBufferAliases);
  const aliasRows = new Map();
  for (const a of report.fileAliases) { assert(!aliasRows.has(a.label)); aliasRows.set(a.label, a); }
  for (const f of all.values()) if (f.payloadDuplicateOf !== undefined) {
    const a = aliasRows.get(f.label); assert(a); assert.equal(a.payloadDuplicateOf, f.payloadDuplicateOf);
    assert.equal(a.logicalBytes, f.bytes); assert.equal(a.physicalBytes, 0); assert.deepEqual(a.file, f.file);
    if (f.field) { assert.equal(a.withinStateBufferAlias, true); assert.equal(a.payloadCanonical, f.payloadCanonical); }
  }
  assert.equal(aliasRows.size, across + report.capture.bufferAliases.length);
  return { all, artifacts, physical, logicalOwned, logicalAlias };
}
export function selectedInputs(report, graph) {
  const chosen = [], files = new Map();
  for (const frame of report.capture.frames) {
    assert(frame.loft, 'Missing actual original loft (no synthetic empty replacement): state-' + frame.index);
    for (const [name, type, length] of [
      ['loft-positions', 'Float32Array', 3 * frame.loft.vertexCount],
      ['loft-mask', 'Float32Array', frame.loft.vertexCount],
      ['loft-indices', 'Uint32Array', frame.loft.indexCount],
      ['mesh-position', 'Float32Array', 3 * frame.actualActiveVertices],
      ['mesh-indices', 'Uint32Array', frame.indexCount],
      ['texture-waterBarrelMask', 'Uint8Array', frame.water.maskGrid.nx * frame.water.maskGrid.nz],
    ]) {
      const label = 'state-' + frame.index + '/' + name, field = graph.all.get(label);
      assert(field, 'Missing canonical field/alias: ' + label);
      assert.equal(field.type, type); assert.equal(field.elements, length);
      const local = [...frame.fields, ...frame.aliases].find(f => f.label === label);
      assert(local, 'Field absent from its actual frame: ' + label);
      for (const key of ['type', 'elements', 'bytes', 'payloadCanonical']) assert.equal(local[key], field[key]);
      if (local.file) assert.deepEqual(local.file, field.file);
      chosen.push({ label, type, elements: field.elements, bytes: field.bytes, canonical: field.payloadCanonical, file: field.file });
      files.set(field.file.path, field.file);
    }
    assert.equal(frame.pixels?.field?.label, 'state-' + frame.index + '/original.png');
    assert.deepEqual(frame.pixels.field.file, graph.all.get(frame.pixels.field.label)?.file);
  }
  assert([...files.values()].reduce((n, p) => n + p.bytes, 0) <= 96 * 1024 * 1024);
  return { chosen, files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
}
