/** TMP-only controlled repeated-epoch contact cost harness. Calling this export requires root's quiet CPU lease. */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { gunzipSync } from 'node:zlib';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { ShallowWaterSolver } from '../ShallowWaterSolver';
import { ProfileLibrary } from './ProfileLibrary';
import { decodeCase } from './profileFormat';
import { createContactHit, SweptContact, type ContactHit, type SweptSurfaceQueries } from './sweptContact';
import { BARREL_SLOPE, SweptLoft, type LoftResult } from './sweptLoft';
import { PhysicalSurfWater as OriginalWater } from '../../../oracle/src/physics/PhysicalSurfWater';
import { ShallowWaterSolver as OriginalSolver } from '../../../oracle/src/wave/ShallowWaterSolver';
import { ProfileLibrary as OriginalLibrary } from '../../../oracle/src/wave/barrel/ProfileLibrary';
import { decodeCase as originalDecodeCase } from '../../../oracle/src/wave/barrel/profileFormat';
import { createContactHit as originalHit, SweptContact as OriginalContact } from '../../../oracle/src/wave/barrel/sweptContact';
import { SweptLoft as OriginalLoft } from '../../../oracle/src/wave/barrel/sweptLoft';

const FIXTURE = '/private/tmp/contact-lazy-height-20261004-v3/run/capture.json.gz';
const AUTHORITY = 'performance/authority.json';
const RESULT = 'performance/cost-first-report.json';
const NUMERIC_HIT_FIELDS = ['surfaceY', 'normalX', 'normalY', 'normalZ', 'floorY', 'waterFloorY', 'ceilingY', 'ceilingTopY',
  'lipShare', 'lipVX', 'lipVY', 'lipVZ', 'lipWeight', 'tangentX', 'tangentZ', 'life'] as const;
type NumericState = { nx: number; nz: number; dx: number; restLevel: number; time: number; h: Float64Array; bed: Float64Array;
  xCenters: Float64Array; zCenters: Float64Array; dz: Float64Array };
type Call = { ordinal: number; method: 'query' | 'floorAt'; input: number[]; initial?: ContactHit; result: number | boolean; output?: ContactHit };
type Fixture = { byteOrder: string; seaTime: number; config: { spot: 'padang'; peakPeriod: number };
  options: { barrelCases: Uint8Array[] }; restLevel: number; nodeSpacing: number; solver: Omit<NumericState, 'restLevel' | 'time'>;
  records: Float32Array; recordCount: number; stillLevel: number; contactOptions: { bucket: number }; loft: LoftResult };
type Capture = { firstFixture: Fixture; epochs: { queries: Call[]; hitNormalVertices: number[] }[] };
type Sink = { results: Uint8Array; inWater: Uint8Array; fields: Float64Array; floors: Float64Array };
type Context = { label: 'A-original' | 'B-private'; update(): void; queries: SweptSurfaceQueries; hit: ContactHit; sink: Sink;
  backend: SweptContact | OriginalContact; solver: NumericState };
type Plan = { schema: number; baseline: string; warmupPassesPerVariant: number; measuredBlocks: number;
  capture: { compressedBytes: number; compressedSha256: string; expandedBytes: number; expandedSha256: string };
  parity: { path: string; sha256: string }; sourceFiles: { path: string; bytes: number; sha256: string }[] };
const sha = (raw: ArrayBufferView) => createHash('sha256').update(Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength)).digest('hex');
const bytes = (raw: ArrayBufferView) => Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
function same(actual: unknown, expected: unknown, label: string): void { assert(Object.is(actual, expected), label); }
function sameBytes(actual: ArrayBufferView, expected: ArrayBufferView, label: string): void {
  assert.equal(actual.byteLength, expected.byteLength, `${label} length`); assert.equal(Buffer.compare(bytes(actual), bytes(expected)), 0, label);
}
function unpack(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unpack);
  if (!value || typeof value !== 'object') return value;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length === 1 && item.undefined === true) return undefined;
  if (Object.keys(item).length === 1 && typeof item.number === 'string') {
    switch (item.number) { case 'NaN': return NaN; case '-0': return -0; case 'Infinity': return Infinity;
      case '-Infinity': return -Infinity; default: assert.fail('Unknown number tag'); }
  }
  if (typeof item.type === 'string' && typeof item.byteLength === 'number' && typeof item.base64 === 'string') {
    const owned = new Uint8Array(Buffer.from(item.base64, 'base64'));
    assert.equal(owned.byteOffset, 0); assert.equal(owned.buffer.byteLength, owned.byteLength); assert.equal(owned.byteLength, item.byteLength);
    switch (item.type) { case 'Uint8Array': return owned; case 'Float64Array': return new Float64Array(owned.buffer);
      case 'Float32Array': return new Float32Array(owned.buffer); case 'Int32Array': return new Int32Array(owned.buffer);
      case 'Uint32Array': return new Uint32Array(owned.buffer); default: assert.fail('Unknown typed payload'); }
  }
  return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, unpack(entry)]));
}
function numericState<T extends object>(prototype: T, f: Fixture): T & NumericState {
  // All fields required by the separately verified real plain provider; no Proxy, tracking, interpolation helper or step.
  return Object.assign(Object.create(prototype) as T, { nx: f.solver.nx, nz: f.solver.nz, dx: f.solver.dx,
    restLevel: f.restLevel, time: f.seaTime, h: f.solver.h.slice(), bed: f.solver.bed.slice(), xCenters: f.solver.xCenters.slice(),
    zCenters: f.solver.zCenters.slice(), dz: f.solver.dz.slice() });
}
function newSink(): Sink { return { results: new Uint8Array(441), inWater: new Uint8Array(441), fields: new Float64Array(441 * 16), floors: new Float64Array(186) }; }
function expectedSink(calls: Call[]): Sink {
  const sink = newSink(); let query = 0, floor = 0;
  for (const call of calls) {
    if (call.method === 'floorAt') sink.floors[floor++] = call.result as number;
    else {
      assert(call.output); sink.results[query] = call.result ? 1 : 0; sink.inWater[query] = call.output.inWater ? 1 : 0;
      for (let k = 0; k < NUMERIC_HIT_FIELDS.length; k++) sink.fields[query * 16 + k] = call.output[NUMERIC_HIT_FIELDS[k]];
      query++;
    }
  }
  assert.equal(query, 441); assert.equal(floor, 186); return sink;
}
function contextA(f: Fixture): Context {
  const solver = numericState(OriginalSolver.prototype, f);
  const backend = new OriginalContact(new OriginalLibrary(f.options.barrelCases.map(raw => originalDecodeCase(new Uint8Array(raw)))), BARREL_SLOPE.padang!, f.contactOptions);
  const water = new OriginalWater(solver, { peakPeriod: f.config.peakPeriod, nodeSpacing: f.nodeSpacing, swept: backend });
  // Same untimed empty ownership/setup epoch as the private context; no queries or fixture build yet.
  water.withSurfaceNodeCache(() => backend.update(new Float32Array(0), 0, f.stillLevel, (x, z) => water.plainSurfaceAt(x, z)));
  return { label: 'A-original', backend, solver, queries: backend, hit: originalHit(), sink: newSink(),
    update() { water.withSurfaceNodeCache(() => backend.update(f.records, f.recordCount, f.stillLevel, (x, z) => water.plainSurfaceAt(x, z))); } };
}
function contextB(f: Fixture): Context {
  const solver = numericState(ShallowWaterSolver.prototype, f);
  // One-time QA ownership acquisition only, on an empty epoch, restored BEFORE any preflight/warmup/measurement.
  // No wrappers/spies/proxies remain on any measured contact, loft, provider or selected-normal call.
  let backend: SweptContact | undefined;
  const originalUpdate = SweptContact.prototype.update;
  SweptContact.prototype.update = function (this: SweptContact, ...args) { backend = this; return originalUpdate.apply(this, args); };
  let owner!: ReturnType<typeof SweptContact.forOrdinaryWorker>, water!: PhysicalSurfWater;
  try {
    owner = SweptContact.forOrdinaryWorker(new ProfileLibrary(f.options.barrelCases.map(raw => decodeCase(new Uint8Array(raw)))), BARREL_SLOPE.padang!);
    water = new PhysicalSurfWater(solver, { peakPeriod: f.config.peakPeriod, nodeSpacing: f.nodeSpacing, swept: owner.queries });
    owner.updateFromPlainSurface(new Float32Array(0), 0, f.stillLevel, water);
  } finally { SweptContact.prototype.update = originalUpdate; }
  assert(backend); assert.equal(backend.update, originalUpdate);
  return { label: 'B-private', backend, solver, queries: owner.queries, hit: createContactHit(), sink: newSink(),
    update() { owner.updateFromPlainSurface(f.records, f.recordCount, f.stillLevel, water); } };
}
/** Entire measured workload: stats reset + full original eager-Y build + every original call/restore + output sink stores. */
function workload(context: Context, calls: Call[]): void {
  const stats = context.backend.stats;
  stats.queries = 0; stats.hits = 0; stats.anomalies = 0; stats.quads = 0; stats.overlaps = 0;
  context.update();
  let query = 0, floor = 0;
  for (const call of calls) {
    if (call.method === 'floorAt') context.sink.floors[floor++] = context.queries.floorAt(call.input[0], call.input[1]);
    else {
      Object.assign(context.hit, call.initial!); // Required captured reused-hit state, charged to both variants.
      context.sink.results[query] = context.queries.query(call.input[0], call.input[1], call.input[2], context.hit) ? 1 : 0;
      context.sink.inWater[query] = context.hit.inWater ? 1 : 0;
      for (let k = 0; k < NUMERIC_HIT_FIELDS.length; k++) context.sink.fields[query * 16 + k] = context.hit[NUMERIC_HIT_FIELDS[k]];
      query++;
    }
  }
}
function guard(context: Context, expected: Sink, f: Fixture, vertices: number[]): void {
  sameBytes(context.sink.results, expected.results, `${context.label} results`); sameBytes(context.sink.inWater, expected.inWater, `${context.label} water`);
  // Object.is retains the public numeric contract including signed zero and NaN, independent of NaN payload bits in a sink.
  for (let i = 0; i < expected.fields.length; i++) same(context.sink.fields[i], expected.fields[i], `${context.label} field ${i}`);
  for (let i = 0; i < expected.floors.length; i++) same(context.sink.floors[i], expected.floors[i], `${context.label} floor ${i}`);
  assert.deepEqual(context.backend.stats, { queries: 441, hits: 28, anomalies: 0, quads: 142, overlaps: 0 });
  const actual = context.backend.last!; assert.equal(actual.sliceCount, 187); assert.equal(actual.vertexCount, 25_058); assert.equal(actual.indexCount, 136_458);
  sameBytes(actual.positions.subarray(0, f.loft.positions.length), f.loft.positions, `${context.label} active positions`);
  sameBytes(actual.indices.subarray(0, f.loft.indices.length), f.loft.indices, `${context.label} active indices`);
  for (const key of ['sliceFront', 'sliceJoined', 'sliceRayX', 'sliceRayZ', 'sliceLife', 'sliceTipAlong', 'sliceTipUp', 'sliceAnchorVX', 'sliceAnchorVZ', 'sliceWeight'] as const) {
    sameBytes(actual[key].subarray(0, f.loft[key].length), f.loft[key], `${context.label} ${key}`);
  }
  for (const v of vertices) sameBytes(actual.normals.subarray(3 * v, 3 * v + 3), f.loft.normals.subarray(3 * v, 3 * v + 3), `${context.label} selected normal ${v}`);
}
function guardSource(plan: Plan): void {
  for (const file of plan.sourceFiles) { const raw = readFileSync(file.path); assert.equal(raw.byteLength, file.bytes, file.path); assert.equal(sha(raw), file.sha256, file.path); }
}
function median(values: number[]): number { const sorted = [...values].sort((a, b) => a - b), at = sorted.length >> 1; return sorted.length & 1 ? sorted[at] : (sorted[at - 1] + sorted[at]) / 2; }
const prototypeEntries: [string, object, string][] = [
  ['candidate contact update', SweptContact.prototype, 'update'], ['candidate query', SweptContact.prototype, 'query'], ['candidate floor', SweptContact.prototype, 'floorAt'],
  ['candidate loft build', SweptLoft.prototype, 'build'], ['candidate prepare normal', SweptLoft.prototype, 'prepareNormal'], ['candidate eager normals', SweptLoft.prototype, 'normals'],
  ['candidate plain surface', PhysicalSurfWater.prototype, 'plainSurfaceAt'], ['candidate height cache', PhysicalSurfWater.prototype, 'withSurfaceNodeCache'],
  ['candidate sample', ShallowWaterSolver.prototype, 'sampleCentered'], ['candidate rows', ShallowWaterSolver.prototype, 'rowBelow'],
  ['oracle update', OriginalContact.prototype, 'update'], ['oracle query', OriginalContact.prototype, 'query'], ['oracle floor', OriginalContact.prototype, 'floorAt'],
  ['oracle loft build', OriginalLoft.prototype, 'build'], ['oracle normals', OriginalLoft.prototype, 'normals'], ['oracle plain surface', OriginalWater.prototype, 'plainSurfaceAt'],
  ['oracle height cache', OriginalWater.prototype, 'withSurfaceNodeCache'], ['oracle sample', OriginalSolver.prototype, 'sampleCentered'], ['oracle rows', OriginalSolver.prototype, 'rowBelow'],
];
const prototypePins = prototypeEntries.map(([name, target, key]) => ({ name, target, key, fn: Reflect.get(target, key) as Function }));
function guardPrototypes(): void { for (const entry of prototypePins) assert.equal(Reflect.get(entry.target, entry.key), entry.fn, entry.name); }

export function runContactNormalCost(): void {
  const report: Record<string, unknown> = { schema: 1, status: 'running', scope: 'Controlled repeated actual first epoch; no 15-epoch history, render/FPS or gameplay timing claim',
    node: process.version, platform: process.platform, arch: process.arch, measuredCallTimers: 'Only one outer performance.now pair per complete workload',
    outputSinks: 'Preallocated sink stores charged equally inside timing; all exact guards outside timing' };
  try {
    const planBytes = readFileSync(AUTHORITY), plan = JSON.parse(planBytes.toString('utf8')) as Plan;
    assert.equal(plan.schema, 1); assert.equal(plan.baseline, 'ef60d3cee'); assert.equal(plan.warmupPassesPerVariant, 16); assert.equal(plan.measuredBlocks, 60);
    guardSource(plan); guardPrototypes();
    const parityBytes = readFileSync(plan.parity.path); assert.equal(sha(parityBytes), plan.parity.sha256);
    const parity = JSON.parse(parityBytes.toString('utf8')); assert.equal(parity.status, 'passed'); assert.equal(parity.publicCalls, 627); assert.equal(parity.demandedNormalVertices, 65);
    const packed = readFileSync(FIXTURE), expanded = gunzipSync(packed);
    assert.equal(packed.byteLength, plan.capture.compressedBytes); assert.equal(sha(packed), plan.capture.compressedSha256);
    assert.equal(expanded.byteLength, plan.capture.expandedBytes); assert.equal(sha(expanded), plan.capture.expandedSha256);
    const capture = unpack(JSON.parse(expanded.toString('utf8'))) as Capture, f = capture.firstFixture, epoch = capture.epochs[0];
    assert.equal(f.byteOrder, 'little'); assert.equal(new Uint8Array(new Uint32Array([0x01020304]).buffer)[0], 4);
    assert.equal(epoch.queries.length, 627); assert.equal(epoch.hitNormalVertices.length, 65); assert.equal(f.recordCount, 125); assert.equal(f.nodeSpacing, 2);
    assert(f.solver.h instanceof Float64Array && f.solver.bed instanceof Float64Array); assert(f.solver.h.every(Number.isFinite) && f.solver.bed.every(Number.isFinite));
    assert.deepEqual(Object.keys(createContactHit()).filter(key => key !== 'inWater'), [...NUMERIC_HIT_FIELDS]);
    const expected = expectedSink(epoch.queries), A = contextA(f), B = contextB(f); guardPrototypes();
    for (const key of ['h', 'bed', 'xCenters', 'zCenters', 'dz'] as const) assert.notEqual(A.solver[key].buffer, B.solver[key].buffer);
    // One complete preflight per variant plus exactly sixteen alternating complete warmups per variant, all untimed.
    for (const context of [A, B]) { workload(context, epoch.queries); guard(context, expected, f, epoch.hitNormalVertices); }
    for (let pass = 0; pass < plan.warmupPassesPerVariant; pass++) for (const context of (pass & 1 ? [B, A] : [A, B])) {
      workload(context, epoch.queries); guard(context, expected, f, epoch.hitNormalVertices);
    }
    const trials: { block: number; slot: number; variant: string; ms: number }[] = [];
    const blocks: { block: number; order: string; originalMs: number; privateMs: number; savingMs: number }[] = [];
    for (let block = 0; block < plan.measuredBlocks; block++) {
      const order = block & 1 ? [B, A, A, B] : [A, B, B, A];
      const old: number[] = [], deferred: number[] = [];
      for (let slot = 0; slot < order.length; slot++) {
        const context = order[slot]; guardPrototypes();
        const begin = performance.now();
        workload(context, epoch.queries);
        const ms = performance.now() - begin;
        // All result, geometry, selected Float32 normal and stats guards run after the measured window.
        guard(context, expected, f, epoch.hitNormalVertices);
        assert(Number.isFinite(ms) && ms >= 0); trials.push({ block, slot, variant: context.label, ms });
        (context === A ? old : deferred).push(ms);
      }
      const originalMs = (old[0] + old[1]) / 2, privateMs = (deferred[0] + deferred[1]) / 2;
      blocks.push({ block, order: block & 1 ? 'BAAB' : 'ABBA', originalMs, privateMs, savingMs: originalMs - privateMs });
    }
    guardPrototypes(); guardSource(plan);
    for (const context of [A, B]) for (const key of ['h', 'bed', 'xCenters', 'zCenters', 'dz'] as const) sameBytes(context.solver[key], f.solver[key], `${context.label} unchanged ${key}`);
    Object.assign(report, { status: 'passed', planSha256: sha(planBytes), paritySha256: plan.parity.sha256, captureSha256: plan.capture.compressedSha256,
      seaTime: f.seaTime, publicCallsPerWorkload: 627, queryCallsPerWorkload: 441, floorCallsPerWorkload: 186, hitsPerWorkload: 28,
      heightCallsPerWorkloadEstablishedByParity: 20_117, eagerNormalVertices: 23_852, demandedNormalVerticesEstablishedByParity: 65,
      emptySetupEpochsPerVariant: 1, fullPreflightsPerVariant: 1, warmupPassesPerVariant: 16, measuredBlocks: 60, measuredWorkloadsPerVariant: 120,
      completeOriginalMedianMs: median(trials.filter(t => t.variant === A.label).map(t => t.ms)), completePrivateMedianMs: median(trials.filter(t => t.variant === B.label).map(t => t.ms)),
      pairedSavingMedianMs: median(blocks.map(block => block.savingMs)), trials, blocks,
      prototypes: prototypePins.map(pin => ({ name: pin.name, functionTextSha256: createHash('sha256').update(Function.prototype.toString.call(pin.fn)).digest('hex') })),
      state: 'Independent fixed F64 state; no per-workload h/bed copies; full contact/node cache and ready/run reset inside update',
      exclusions: ['fixture decode/context construction/one-time empty QA ownership acquisition', 'initial packed front-record extraction', 'ordinary water/body/particle simulation and renderer',
        'output guards/source hashes outside timer', 'other fourteen capture epochs'], persistentPrivateExtraBytes: 42_458,
      adoption: 'Requires separate root review; this controlled repeated epoch cannot establish browser FPS or historical workload behavior' });
  } catch (cause) { report.status = 'failed'; report.failure = String(cause); throw cause; }
  finally { writeFileSync(RESULT, JSON.stringify(report, null, 2) + '\n'); }
}
