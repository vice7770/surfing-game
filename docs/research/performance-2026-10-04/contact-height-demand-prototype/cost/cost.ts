/** Source-only three-arm cost proposal. Execution requires passed height parity and an explicitly frozen root authority. */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { gunzipSync } from 'node:zlib';
import { PhysicalSurfWater as EagerWater } from '/private/tmp/contact-normal-demand-prototype-20261004/oracle/src/physics/PhysicalSurfWater';
import { ShallowWaterSolver as EagerSolver } from '/private/tmp/contact-normal-demand-prototype-20261004/oracle/src/wave/ShallowWaterSolver';
import { ProfileLibrary as EagerLibrary } from '/private/tmp/contact-normal-demand-prototype-20261004/oracle/src/wave/barrel/ProfileLibrary';
import { decodeCase as eagerDecode } from '/private/tmp/contact-normal-demand-prototype-20261004/oracle/src/wave/barrel/profileFormat';
import { createContactHit as eagerHit, SweptContact as EagerContact } from '/private/tmp/contact-normal-demand-prototype-20261004/oracle/src/wave/barrel/sweptContact';
import { BARREL_SLOPE as EAGER_SLOPE, SweptLoft as EagerLoft } from '/private/tmp/contact-normal-demand-prototype-20261004/oracle/src/wave/barrel/sweptLoft';
import { PhysicalSurfWater as NormalWater } from '/private/tmp/contact-normal-demand-prototype-20261004/src/physics/PhysicalSurfWater';
import { ShallowWaterSolver as NormalSolver } from '/private/tmp/contact-normal-demand-prototype-20261004/src/wave/ShallowWaterSolver';
import { ProfileLibrary as NormalLibrary } from '/private/tmp/contact-normal-demand-prototype-20261004/src/wave/barrel/ProfileLibrary';
import { decodeCase as normalDecode } from '/private/tmp/contact-normal-demand-prototype-20261004/src/wave/barrel/profileFormat';
import { createContactHit as normalHit, SweptContact as NormalContact } from '/private/tmp/contact-normal-demand-prototype-20261004/src/wave/barrel/sweptContact';
import { BARREL_SLOPE as NORMAL_SLOPE, SweptLoft as NormalLoft } from '/private/tmp/contact-normal-demand-prototype-20261004/src/wave/barrel/sweptLoft';
import { PhysicalSurfWater as HeightWater } from '/private/tmp/contact-height-demand-prototype-20261004/src/physics/PhysicalSurfWater';
import { ShallowWaterSolver as HeightSolver } from '/private/tmp/contact-height-demand-prototype-20261004/src/wave/ShallowWaterSolver';
import { ProfileLibrary as HeightLibrary } from '/private/tmp/contact-height-demand-prototype-20261004/src/wave/barrel/ProfileLibrary';
import { decodeCase as heightDecode } from '/private/tmp/contact-height-demand-prototype-20261004/src/wave/barrel/profileFormat';
import { createContactHit as heightHit, SweptContact as HeightContact, type ContactHit, type SweptSurfaceQueries } from '/private/tmp/contact-height-demand-prototype-20261004/src/wave/barrel/sweptContact';
import { BARREL_SLOPE as HEIGHT_SLOPE, LOFT_SAMPLES, SweptLoft as HeightLoft, type LoftResult } from '/private/tmp/contact-height-demand-prototype-20261004/src/wave/barrel/sweptLoft';

const ROOT = '/private/tmp/contact-height-demand-cost-20261004';
const FIXTURE = '/private/tmp/contact-lazy-height-20261004-v3/run/capture.json.gz';
const AUTHORITY = join(ROOT, 'approved-authority.json');
const RESULT = join(ROOT, 'cost-first-report.json');
const SOURCE_ROOTS = [
  '/private/tmp/contact-normal-demand-prototype-20261004/oracle/src',
  '/private/tmp/contact-normal-demand-prototype-20261004/src',
  '/private/tmp/contact-height-demand-prototype-20261004/src',
] as const;
const HELPER_FILES = ['cost.ts', 'cost.test.ts', 'vitest.cost.config.ts', 'tsconfig.cost.json', 'package.json', 'plan.md'] as const;
const NUMERIC_FIELDS = ['surfaceY', 'normalX', 'normalY', 'normalZ', 'floorY', 'waterFloorY', 'ceilingY', 'ceilingTopY',
  'lipShare', 'lipVX', 'lipVY', 'lipVZ', 'lipWeight', 'tangentX', 'tangentZ', 'life'] as const;
const WARMUPS = 18;
const BLOCKS = 60;
const PERMUTATIONS = ['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'] as const;
type Arm = 'A-eager' | 'B-normal' | 'C-height';
type NumericState = { nx: number; nz: number; dx: number; restLevel: number; time: number; h: Float64Array; bed: Float64Array;
  xCenters: Float64Array; zCenters: Float64Array; dz: Float64Array };
type Call = { ordinal: number; method: 'query' | 'floorAt'; input: number[]; initial?: ContactHit; output?: ContactHit;
  result: boolean | number; error?: string; candidates: { strip: number }[]; normalVertices: number[] };
type Fixture = { byteOrder: string; seaTime: number; config: { spot: 'padang'; peakPeriod: number }; options: { barrelCases: Uint8Array[] };
  restLevel: number; nodeSpacing: number; solver: Omit<NumericState, 'restLevel' | 'time'>; records: Float32Array; recordCount: number;
  stillLevel: number; contactOptions: { bucket: number }; loftOptions: { contact: boolean; sheet: boolean }; loft: LoftResult };
type Epoch = { queries: Call[]; runs: [number, number][]; hitNormalVertices: number[] };
type Capture = { status: { complete: boolean; ordinaryArraysIdentical: boolean }; firstFixture: Fixture; epochs: Epoch[] };
type Backend = { stats: { queries: number; hits: number; anomalies: number; quads: number; overlaps: number }; last: LoftResult | undefined };
type LoftInspection = { normalReady: Uint8Array; heightReady?: Uint8Array };
type Sink = { results: Uint8Array; inWater: Uint8Array; fields: Float64Array; floors: Float64Array };
type Context = { arm: Arm; update(): void; queries: SweptSurfaceQueries; backend: Backend; solver: NumericState;
  records: Float32Array; hit: ContactHit; sink: Sink; inspection?: LoftInspection };
type FilePin = { path: string; bytes: number; sha256: string };
type Authority = { schema: 'contact-height-three-arm-cost/v1'; status: 'root-reviewed-after-height-parity'; baseline: string;
  schedule: { warmupsPerArm: number; blocks: number; trialsPerArm: number; permutations: string[]; blockConstruction: string };
  sourceRoots: string[]; sourceFiles: FilePin[]; sourcePreparation: { path: string; sha256: string };
  heightParity: { status: 'passed'; exitCode: 0; replayEpochs: 1; publicCalls: 627; queryCalls: 441; floorCalls: 186;
    selectedNormalVertices: 65; evidenceFiles: FilePin[]; heightRuntimeFiles: FilePin[] };
  normalParity: FilePin; capture: { compressedBytes: number; compressedSha256: string; expandedBytes: number; expandedSha256: string } };
type Trial = { block: number; slot: number; arm: Arm; ms: number };
type Block = { block: number; order: string; eagerMs: number; normalMs: number; heightMs: number;
  eagerMinusNormalMs: number; eagerMinusHeightMs: number; normalMinusHeightMs: number };
const bytes = (a: ArrayBufferView) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const sha = (a: ArrayBufferView) => createHash('sha256').update(bytes(a)).digest('hex');
function sameBytes(a: ArrayBufferView, b: ArrayBufferView, label: string): void {
  assert.equal(a.byteLength, b.byteLength, `${label} length`); assert.equal(Buffer.compare(bytes(a), bytes(b)), 0, label);
}
function unpack(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unpack);
  if (!value || typeof value !== 'object') return value;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length === 1 && item.undefined === true) return undefined;
  if (Object.keys(item).length === 1 && typeof item.number === 'string') {
    switch (item.number) { case '-0': return -0; case 'NaN': return NaN; case 'Infinity': return Infinity;
      case '-Infinity': return -Infinity; default: assert.fail('Unknown numeric tag'); }
  }
  if (typeof item.type === 'string' && typeof item.byteLength === 'number' && typeof item.base64 === 'string') {
    const owned = new Uint8Array(Buffer.from(item.base64, 'base64'));
    assert.equal(owned.byteOffset, 0); assert.equal(owned.buffer.byteLength, owned.byteLength); assert.equal(owned.byteLength, item.byteLength);
    switch (item.type) { case 'Uint8Array': return owned; case 'Float64Array': return new Float64Array(owned.buffer);
      case 'Float32Array': return new Float32Array(owned.buffer); case 'Uint32Array': return new Uint32Array(owned.buffer);
      case 'Int32Array': return new Int32Array(owned.buffer); default: assert.fail('Unknown typed payload'); }
  }
  return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, unpack(entry)]));
}
function numericState<T extends object>(prototype: T, f: Fixture): T & NumericState {
  // Actual imported solver prototypes operate on independent numeric receivers, never live-bound solver methods or fake interpolation.
  return Object.assign(Object.create(prototype) as T, { nx: f.solver.nx, nz: f.solver.nz, dx: f.solver.dx, restLevel: f.restLevel,
    time: f.seaTime, h: f.solver.h.slice(), bed: f.solver.bed.slice(), xCenters: f.solver.xCenters.slice(),
    zCenters: f.solver.zCenters.slice(), dz: f.solver.dz.slice() });
}
function newSink(): Sink { return { results: new Uint8Array(441), inWater: new Uint8Array(441), fields: new Float64Array(441 * 16), floors: new Float64Array(186) }; }
function expectedSink(calls: Call[]): Sink {
  const result = newSink(); let query = 0, floor = 0;
  for (const call of calls) {
    assert.equal(call.error, undefined);
    if (call.method === 'floorAt') result.floors[floor++] = call.result as number;
    else {
      assert(call.initial && call.output);
      assert.deepEqual(Object.keys(call.initial).sort(), [...NUMERIC_FIELDS, 'inWater'].sort());
      result.results[query] = call.result ? 1 : 0; result.inWater[query] = call.output.inWater ? 1 : 0;
      for (let k = 0; k < NUMERIC_FIELDS.length; k++) result.fields[query * 16 + k] = call.output[NUMERIC_FIELDS[k]];
      query++;
    }
  }
  assert.equal(query, 441); assert.equal(floor, 186); return result;
}
function contextEager(f: Fixture): Context {
  const solver = numericState(EagerSolver.prototype, f), records = f.records.slice();
  const backend = new EagerContact(new EagerLibrary(f.options.barrelCases.map(raw => eagerDecode(new Uint8Array(raw)))), EAGER_SLOPE.padang!, f.contactOptions);
  const water = new EagerWater(solver, { peakPeriod: f.config.peakPeriod, nodeSpacing: f.nodeSpacing, swept: backend });
  water.withSurfaceNodeCache(() => backend.update(new Float32Array(0), 0, f.stillLevel, (x, z) => water.plainSurfaceAt(x, z)));
  return { arm: 'A-eager', backend, solver, records, queries: backend, hit: eagerHit(), sink: newSink(),
    update() { water.withSurfaceNodeCache(() => backend.update(records, f.recordCount, f.stillLevel, (x, z) => water.plainSurfaceAt(x, z))); } };
}
function contextNormal(f: Fixture): Context {
  const solver = numericState(NormalSolver.prototype, f), records = f.records.slice();
  let backend: NormalContact | undefined, inspection: LoftInspection | undefined;
  const update = NormalContact.prototype.update, build = NormalLoft.prototype.build;
  // Empty setup ownership hooks only; both are restored in finally before any full preflight, warmup or measured workload.
  NormalContact.prototype.update = function (this: NormalContact, ...args) { backend = this; return update.apply(this, args); };
  NormalLoft.prototype.build = function (this: NormalLoft, ...args) { inspection = this as unknown as LoftInspection; return build.apply(this, args); };
  let owner!: ReturnType<typeof NormalContact.forOrdinaryWorker>, water!: NormalWater;
  try {
    owner = NormalContact.forOrdinaryWorker(new NormalLibrary(f.options.barrelCases.map(raw => normalDecode(new Uint8Array(raw)))), NORMAL_SLOPE.padang!);
    water = new NormalWater(solver, { peakPeriod: f.config.peakPeriod, nodeSpacing: f.nodeSpacing, swept: owner.queries });
    owner.updateFromPlainSurface(new Float32Array(0), 0, f.stillLevel, water);
  } finally { NormalContact.prototype.update = update; NormalLoft.prototype.build = build; }
  assert(backend && inspection); assert.equal(backend.update, update);
  return { arm: 'B-normal', backend, solver, records, queries: owner.queries, hit: normalHit(), sink: newSink(), inspection,
    update() { owner.updateFromPlainSurface(records, f.recordCount, f.stillLevel, water); } };
}
function contextHeight(f: Fixture): Context {
  const solver = numericState(HeightSolver.prototype, f), records = f.records.slice();
  let backend: HeightContact | undefined, inspection: LoftInspection | undefined;
  const update = HeightContact.prototype.update, build = HeightLoft.prototype.build;
  HeightContact.prototype.update = function (this: HeightContact, ...args) { backend = this; return update.apply(this, args); };
  HeightLoft.prototype.build = function (this: HeightLoft, ...args) { inspection = this as unknown as LoftInspection; return build.apply(this, args); };
  let owner!: ReturnType<typeof HeightContact.forOrdinaryWorker>, water!: HeightWater;
  try {
    owner = HeightContact.forOrdinaryWorker(new HeightLibrary(f.options.barrelCases.map(raw => heightDecode(new Uint8Array(raw)))), HEIGHT_SLOPE.padang!);
    water = new HeightWater(solver, { peakPeriod: f.config.peakPeriod, nodeSpacing: f.nodeSpacing, swept: owner.queries });
    owner.updateFromPlainSurface(new Float32Array(0), 0, f.stillLevel, water);
  } finally { HeightContact.prototype.update = update; HeightLoft.prototype.build = build; }
  assert(backend && inspection); assert.equal(backend.update, update);
  return { arm: 'C-height', backend, solver, records, queries: owner.queries, hit: heightHit(), sink: newSink(), inspection,
    // Every nonempty timed call executes the real capture: full h + bed + xCenters copies, cache invalidation and complete private build.
    update() { owner.updateFromPlainSurface(records, f.recordCount, f.stillLevel, water); } };
}
function resetCommon(context: Context): void {
  const s = context.backend.stats; s.queries = 0; s.hits = 0; s.anomalies = 0; s.quads = 0; s.overlaps = 0;
}
/** Only update plus all original ordered calls/initial-hit restores/common sinks are enclosed by the trial's outer timer. */
function workload(context: Context, calls: Call[]): void {
  context.update(); let query = 0, floor = 0;
  for (const call of calls) {
    if (call.method === 'floorAt') context.sink.floors[floor++] = context.queries.floorAt(call.input[0], call.input[1]);
    else {
      Object.assign(context.hit, call.initial!);
      context.sink.results[query] = context.queries.query(call.input[0], call.input[1], call.input[2], context.hit) ? 1 : 0;
      context.sink.inWater[query] = context.hit.inWater ? 1 : 0;
      for (let k = 0; k < NUMERIC_FIELDS.length; k++) context.sink.fields[query * 16 + k] = context.hit[NUMERIC_FIELDS[k]];
      query++;
    }
  }
}
function expectedRows(epoch: Epoch): Set<number> {
  const result = new Set<number>();
  for (const call of epoch.queries) {
    for (const c of call.candidates) { result.add(c.strip); result.add(c.strip + 1); }
    for (const v of call.normalVertices) {
      const row = Math.floor(v / LOFT_SAMPLES), run = epoch.runs.find(([first, last]) => row >= first && row <= last);
      assert(run); result.add(row); result.add(Math.max(run[0], row - 1)); result.add(Math.min(run[1], row + 1));
    }
  }
  assert.equal(result.size, 15); return result;
}
function guard(context: Context, expected: Sink, f: Fixture, vertices: number[], rows: Set<number>): void {
  sameBytes(context.sink.results, expected.results, `${context.arm} results`); sameBytes(context.sink.inWater, expected.inWater, `${context.arm} water`);
  for (let i = 0; i < expected.fields.length; i++) if (!Object.is(context.sink.fields[i], expected.fields[i])) assert.fail(`${context.arm} hit ${i}`);
  for (let i = 0; i < expected.floors.length; i++) if (!Object.is(context.sink.floors[i], expected.floors[i])) assert.fail(`${context.arm} floor ${i}`);
  assert.deepEqual(context.backend.stats, { queries: 441, hits: 28, anomalies: 0, quads: 142, overlaps: 0 });
  const actual = context.backend.last!; assert.equal(actual.sliceCount, 187); assert.equal(actual.vertexCount, 25_058); assert.equal(actual.indexCount, 136_458);
  if (context.arm !== 'C-height') sameBytes(actual.positions.subarray(0, f.loft.positions.length), f.loft.positions, `${context.arm} positions`);
  else {
    // No forceActive/drain. All eager XZ and only already materialized Y are compared bitwise, using native F32 views.
    const ready = context.inspection!.heightReady!; assert(ready);
    const actualBits = new Uint32Array(actual.positions.buffer, actual.positions.byteOffset, actual.positions.length);
    const expectedBits = new Uint32Array(f.loft.positions.buffer, f.loft.positions.byteOffset, f.loft.positions.length);
    for (let v = 0; v < actual.vertexCount; v++) {
      const o = 3 * v;
      if (actualBits[o] !== expectedBits[o]) assert.fail(`${context.arm} X ${v}`);
      if (actualBits[o + 2] !== expectedBits[o + 2]) assert.fail(`${context.arm} Z ${v}`);
      if (ready[Math.floor(v / LOFT_SAMPLES)] === 1 && actualBits[o + 1] !== expectedBits[o + 1]) assert.fail(`${context.arm} ready Y ${v}`);
    }
    let readyRows = 0;
    for (let row = 0; row < actual.sliceCount; row++) if (ready[row] === 1) { readyRows++; assert(rows.has(row), `unexpected ready row ${row}`); }
    assert(readyRows > 0 && readyRows <= 15); // Bound by original crossing candidates + exact selected-normal halo, not unused history.
  }
  sameBytes(actual.indices.subarray(0, f.loft.indices.length), f.loft.indices, `${context.arm} indices`);
  for (const key of ['sliceFront', 'sliceJoined', 'sliceRayX', 'sliceRayZ', 'sliceLife', 'sliceTipAlong', 'sliceTipUp', 'sliceAnchorVX', 'sliceAnchorVZ', 'sliceWeight'] as const)
    sameBytes(actual[key].subarray(0, f.loft[key].length), f.loft[key], `${context.arm} ${key}`);
  for (const v of vertices) sameBytes(actual.normals.subarray(3 * v, 3 * v + 3), f.loft.normals.subarray(3 * v, 3 * v + 3), `${context.arm} normal ${v}`);
  if (context.inspection) {
    let readyNormals = 0;
    for (let v = 0; v < actual.vertexCount; v++) readyNormals += context.inspection.normalReady[v] === 1 ? 1 : 0;
    assert.equal(readyNormals, 65);
    for (const v of vertices) assert.equal(context.inspection.normalReady[v], 1);
  }
}
function runtimeFiles(root: string): string[] {
  const result: string[] = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, item.name);
    if (item.isDirectory()) result.push(...runtimeFiles(path));
    else if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.test.ts')) result.push(path);
  }
  return result;
}
function guardFiles(pins: FilePin[]): void {
  for (const file of pins) { const raw = readFileSync(file.path); assert.equal(raw.byteLength, file.bytes, file.path); assert.equal(sha(raw), file.sha256, file.path); }
}
function guardCoverage(authority: Authority): void {
  assert.deepEqual(authority.sourceRoots, [...SOURCE_ROOTS]);
  const required = [...SOURCE_ROOTS.flatMap(root => runtimeFiles(root)), ...HELPER_FILES.map(name => join(ROOT, name)),
    '/private/tmp/contact-normal-demand-prototype-20261004/oracle/package.json',
    '/private/tmp/contact-normal-demand-prototype-20261004/package.json', '/private/tmp/contact-height-demand-prototype-20261004/package.json'].sort();
  const actual = authority.sourceFiles.map(file => file.path).sort();
  assert.deepEqual(actual, required); assert.equal(new Set(actual).size, actual.length);
}
const prototypeEntries: [string, object, string][] = [
  ['A update', EagerContact.prototype, 'update'], ['A query', EagerContact.prototype, 'query'], ['A floor', EagerContact.prototype, 'floorAt'],
  ['A loft build', EagerLoft.prototype, 'build'], ['A eager normals', EagerLoft.prototype, 'normals'], ['A plain', EagerWater.prototype, 'plainSurfaceAt'],
  ['A cache', EagerWater.prototype, 'withSurfaceNodeCache'], ['A sample', EagerSolver.prototype, 'sampleCentered'], ['A rows', EagerSolver.prototype, 'rowBelow'],
  ['B factory', NormalContact, 'forOrdinaryWorker'], ['B update', NormalContact.prototype, 'update'], ['B query', NormalContact.prototype, 'query'], ['B floor', NormalContact.prototype, 'floorAt'],
  ['B loft factory', NormalLoft, 'forContactQueries'], ['B loft build', NormalLoft.prototype, 'build'], ['B prepare normal', NormalLoft.prototype, 'prepareNormal'],
  ['B eager normals', NormalLoft.prototype, 'normals'], ['B plain', NormalWater.prototype, 'plainSurfaceAt'], ['B cache', NormalWater.prototype, 'withSurfaceNodeCache'],
  ['B sample', NormalSolver.prototype, 'sampleCentered'], ['B rows', NormalSolver.prototype, 'rowBelow'],
  ['C factory', HeightContact, 'forOrdinaryWorker'], ['C update', HeightContact.prototype, 'update'], ['C query', HeightContact.prototype, 'query'], ['C floor', HeightContact.prototype, 'floorAt'],
  ['C loft factory', HeightLoft, 'forContactQueries'], ['C loft build', HeightLoft.prototype, 'build'], ['C prepare row', HeightLoft.prototype, 'prepareRow'],
  ['C prepare normal', HeightLoft.prototype, 'prepareNormal'], ['C eager normals', HeightLoft.prototype, 'normals'], ['C provider factory', HeightWater.prototype, 'createOwnedPlainSurface'],
  ['C plain', HeightWater.prototype, 'plainSurfaceAt'], ['C cache', HeightWater.prototype, 'withSurfaceNodeCache'],
  ['C sample', HeightSolver.prototype, 'sampleCentered'], ['C rows', HeightSolver.prototype, 'rowBelow'],
];
const prototypePins = prototypeEntries.map(([name, target, key]) => ({ name, target, key, fn: Reflect.get(target, key) as Function }));
function guardPrototypes(): void { for (const pin of prototypePins) assert.equal(Reflect.get(pin.target, pin.key), pin.fn, pin.name); }
function median(values: number[]): number { const sorted = [...values].sort((a, b) => a - b), at = sorted.length >> 1;
  return sorted.length & 1 ? sorted[at] : (sorted[at - 1] + sorted[at]) / 2; }
function pairedSummary(values: number[]) {
  return { blocks: values.length, medianMs: median(values), meanMs: values.reduce((a, b) => a + b, 0) / values.length,
    positive: values.filter(v => v > 0).length, negative: values.filter(v => v < 0).length, zero: values.filter(v => v === 0).length };
}

export function runContactHeightCost(): void {
  const trials: Trial[] = [], blocks: Block[] = [];
  const report: Record<string, unknown> = { schema: 'contact-height-three-arm-cost-report/v1', status: 'running',
    scope: 'Controlled repeated actual first F64 epoch; no historical sea/body/renderer/browser FPS result',
    node: process.version, platform: process.platform, arch: process.arch, trials, blocks,
    measurement: 'One outer performance.now pair around update + 627 original calls/initial-hit restores/common sinks',
    commonResets: 'Five stats fields reset outside every arm window; immutable source snapshots copied once during context construction, not restored per trial',
    constructorWarmth: 'Three empty setup epochs; one untimed nonempty full preflight per arm includes first owned-provider construction/fixed-grid copies and dynamic capacity growth',
    excluded: ['fixture decode/context/owner/loft construction', 'empty QA ownership hooks, restored before first nonempty workload',
      'common stats reset', 'guards/source hashes', 'initial packed front-record extraction', 'ordinary water/body/particles/renderer', 'other fourteen epochs'],
    adoption: 'None; root review and a controlled repeated epoch cannot establish gameplay/FPS benefit' };
  try {
    const expectedAuthorityHash = process.env.CONTACT_HEIGHT_COST_AUTHORITY_SHA256;
    assert(expectedAuthorityHash && /^[a-f0-9]{64}$/.test(expectedAuthorityHash), 'Root must pin approved authority after height parity; source-only preparation is not permission to execute');
    const authorityBytes = readFileSync(AUTHORITY); assert.equal(sha(authorityBytes), expectedAuthorityHash);
    const authority = JSON.parse(authorityBytes.toString('utf8')) as Authority;
    assert.equal(authority.schema, 'contact-height-three-arm-cost/v1'); assert.equal(authority.status, 'root-reviewed-after-height-parity');
    assert.equal(authority.baseline, 'ef60d3cee120d6b157fe94386d923b6b4392205b');
    assert.deepEqual(authority.schedule, { warmupsPerArm: WARMUPS, blocks: BLOCKS, trialsPerArm: 120,
      permutations: [...PERMUTATIONS], blockConstruction: 'permutation followed by its reverse' });
    assert.deepEqual({ status: authority.heightParity.status, exitCode: authority.heightParity.exitCode, replayEpochs: authority.heightParity.replayEpochs,
      publicCalls: authority.heightParity.publicCalls, queryCalls: authority.heightParity.queryCalls, floorCalls: authority.heightParity.floorCalls,
      selectedNormalVertices: authority.heightParity.selectedNormalVertices },
    { status: 'passed', exitCode: 0, replayEpochs: 1, publicCalls: 627, queryCalls: 441, floorCalls: 186, selectedNormalVertices: 65 });
    assert(authority.heightParity.evidenceFiles.length > 0 && authority.heightParity.heightRuntimeFiles.length === 3);
    assert.deepEqual(authority.heightParity.heightRuntimeFiles.map(file => file.path).sort(), [
      SOURCE_ROOTS[2] + '/physics/PhysicalSurfWater.ts', SOURCE_ROOTS[2] + '/wave/barrel/sweptLoft.ts', SOURCE_ROOTS[2] + '/wave/barrel/sweptContact.ts',
    ].sort());
    for (const file of authority.heightParity.heightRuntimeFiles) {
      assert(file.path.startsWith(SOURCE_ROOTS[2] + '/')); const pin = authority.sourceFiles.find(record => record.path === file.path);
      assert.deepEqual(pin, file, 'Cost height runtime must be exactly the runtime frozen with passed height parity');
    }
    guardFiles(authority.heightParity.evidenceFiles); guardFiles(authority.heightParity.heightRuntimeFiles); guardFiles([authority.normalParity]);
    assert.equal(authority.normalParity.sha256, '2694b938529bc35f366804e35de42870144c3d9cf49202640dffc6656e121f31');
    const normalParity = JSON.parse(readFileSync(authority.normalParity.path, 'utf8')); assert.equal(normalParity.status, 'passed');
    guardCoverage(authority); guardFiles(authority.sourceFiles); guardPrototypes();
    const preparation = readFileSync(authority.sourcePreparation.path); assert.equal(sha(preparation), authority.sourcePreparation.sha256);
    const packed = readFileSync(FIXTURE), expanded = gunzipSync(packed);
    assert.equal(packed.byteLength, authority.capture.compressedBytes); assert.equal(sha(packed), authority.capture.compressedSha256);
    assert.equal(expanded.byteLength, authority.capture.expandedBytes); assert.equal(sha(expanded), authority.capture.expandedSha256);
    assert.equal(sha(packed), 'e7bbbb85cf03450f97fe8807414f749dbada7a5b5fa814e490f578f26f965e2f');
    assert.equal(sha(expanded), 'a9c1e4d0b759aac2a9123e9d02cef97a957e959415d65ad098f53b3f99287648');
    const capture = unpack(JSON.parse(expanded.toString('utf8'))) as Capture, f = capture.firstFixture, epoch = capture.epochs[0];
    assert.equal(capture.status.complete, true); assert.equal(capture.status.ordinaryArraysIdentical, true); assert.equal(capture.epochs.length, 15);
    assert.equal(f.byteOrder, 'little'); assert.equal(new Uint8Array(new Uint32Array([0x01020304]).buffer)[0], 4);
    assert.equal(f.config.spot, 'padang'); assert.equal(f.seaTime, 125.99999999999488);
    assert.equal(f.recordCount, 125); assert.equal(f.nodeSpacing, 2); assert.equal(f.solver.nx * f.solver.nz, 116_000);
    assert.equal(f.solver.h.byteLength, 928_000); assert.equal(f.solver.bed.byteLength, 928_000); assert.equal(f.solver.xCenters.byteLength, 1_280);
    assert(f.solver.h instanceof Float64Array && f.solver.bed instanceof Float64Array); assert(f.solver.h.every(Number.isFinite) && f.solver.bed.every(Number.isFinite));
    assert.deepEqual(f.loftOptions, { contact: true, sheet: false }); assert.equal(f.contactOptions.bucket, 0.5);
    assert.equal(epoch.queries.length, 627); assert.equal(epoch.hitNormalVertices.length, 65);
    assert.deepEqual(Object.keys(heightHit()).filter(key => key !== 'inWater'), [...NUMERIC_FIELDS]);
    const expected = expectedSink(epoch.queries), rows = expectedRows(epoch);
    const A = contextEager(f), B = contextNormal(f), C = contextHeight(f), contexts = [A, B, C]; guardPrototypes();
    for (const key of ['h', 'bed', 'xCenters', 'zCenters', 'dz'] as const) {
      assert.notEqual(A.solver[key].buffer, B.solver[key].buffer); assert.notEqual(A.solver[key].buffer, C.solver[key].buffer);
      assert.notEqual(B.solver[key].buffer, C.solver[key].buffer);
    }
    assert.notEqual(A.records.buffer, B.records.buffer); assert.notEqual(A.records.buffer, C.records.buffer); assert.notEqual(B.records.buffer, C.records.buffer);
    const byLetter: Record<string, Context> = { A, B, C };
    for (const context of contexts) { resetCommon(context); workload(context, epoch.queries); guard(context, expected, f, epoch.hitNormalVertices, rows); }
    for (let pass = 0; pass < WARMUPS; pass++) for (const letter of PERMUTATIONS[pass % PERMUTATIONS.length]) {
      const context = byLetter[letter]; resetCommon(context); workload(context, epoch.queries); guard(context, expected, f, epoch.hitNormalVertices, rows);
    }
    Object.assign(report, { authoritySha256: sha(authorityBytes), sourcePreparationSha256: authority.sourcePreparation.sha256,
      captureSha256: sha(packed), seaTime: f.seaTime, publicCallsPerWorkload: 627, queryCallsPerWorkload: 441, floorCallsPerWorkload: 186,
      emptySetupsPerArm: 1, nonemptyPreflightsPerArm: 1, warmupsPerArm: WARMUPS, measuredTrialsPerArm: 120, measuredBlocks: BLOCKS,
      measuredTrialsTotal: 360, maximumCompleteWorkloads: 417, minimumHeightCopiesPerNonemptyWorkloadBytes: 1_857_280,
      sourceAuthorityRecords: authority.sourceFiles.length, prototypeAuthorityRecords: prototypePins.length });
    for (let block = 0; block < BLOCKS; block++) {
      const permutation = PERMUTATIONS[block % PERMUTATIONS.length], order = permutation + [...permutation].reverse().join('');
      const times: Record<Arm, number[]> = { 'A-eager': [], 'B-normal': [], 'C-height': [] };
      for (let slot = 0; slot < order.length; slot++) {
        const context = byLetter[order[slot]]; resetCommon(context); guardPrototypes();
        const begin = performance.now();
        workload(context, epoch.queries);
        const ms = performance.now() - begin;
        assert(Number.isFinite(ms) && ms >= 0); trials.push({ block, slot, arm: context.arm, ms });
        guard(context, expected, f, epoch.hitNormalVertices, rows); times[context.arm].push(ms);
      }
      const means = contexts.map(context => { assert.equal(times[context.arm].length, 2); return (times[context.arm][0] + times[context.arm][1]) / 2; });
      const [eagerMs, normalMs, heightMs] = means;
      blocks.push({ block, order, eagerMs, normalMs, heightMs, eagerMinusNormalMs: eagerMs - normalMs,
        eagerMinusHeightMs: eagerMs - heightMs, normalMinusHeightMs: normalMs - heightMs });
    }
    guardPrototypes(); guardFiles(authority.sourceFiles); guardFiles(authority.heightParity.evidenceFiles);
    for (const context of contexts) for (const key of ['h', 'bed', 'xCenters', 'zCenters', 'dz'] as const)
      sameBytes(context.solver[key], f.solver[key], `${context.arm} unchanged F64 ${key}`);
    for (const context of contexts) sameBytes(context.records, f.records, `${context.arm} unchanged packed records`);
    assert.equal(trials.length, 360); assert.equal(blocks.length, 60);
    for (const context of contexts) assert.equal(trials.filter(trial => trial.arm === context.arm).length, 120);
    Object.assign(report, { status: 'passed',
      pairedSaving: { eagerToNormal: pairedSummary(blocks.map(block => block.eagerMinusNormalMs)),
        eagerToHeight: pairedSummary(blocks.map(block => block.eagerMinusHeightMs)), normalToHeight: pairedSummary(blocks.map(block => block.normalMinusHeightMs)) },
      descriptiveArmMediansOnly: Object.fromEntries(contexts.map(context => [context.arm, median(trials.filter(trial => trial.arm === context.arm).map(trial => trial.ms))])),
      readyRowsLastHeightTrial: Array.from(C.inspection!.heightReady!.subarray(0, C.backend.last!.sliceCount)).flatMap((ready, row) => ready === 1 ? [row] : []),
      selectedNormalsEachPrivateArm: 65,
      prototypes: prototypePins.map(pin => ({ name: pin.name, functionTextSha256: createHash('sha256').update(Function.prototype.toString.call(pin.fn)).digest('hex') })),
      limits: 'Fixed warm context, common sinks, guards outside timing, separate source/module layout and JIT; cannot establish cold allocation, changing histories or browser FPS' });
  } catch (cause) { report.status = 'failed'; report.failure = String(cause); throw cause; }
  finally { writeFileSync(RESULT, JSON.stringify(report, null, 2) + '\n'); }
}
