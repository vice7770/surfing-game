/** TMP-only single actual-epoch replay; no water stepping, body trajectory replay, GPU, or timing. */
import { afterEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { ShallowWaterSolver } from '../ShallowWaterSolver';
import type { SurfZoneConfig } from '../SurfZoneSimulation';
import { FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { decodeCase } from './profileFormat';
import { CONTACT, createContactHit, SweptContact, type ContactHit } from './sweptContact';
import { BARREL_SLOPE, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
import { PhysicalSurfWater as OriginalWater } from '../../../oracle/src/physics/PhysicalSurfWater';
import { ShallowWaterSolver as OriginalSolver } from '../../../oracle/src/wave/ShallowWaterSolver';
import { ProfileLibrary as OriginalLibrary } from '../../../oracle/src/wave/barrel/ProfileLibrary';
import { decodeCase as originalDecodeCase } from '../../../oracle/src/wave/barrel/profileFormat';
import { createContactHit as originalHit, SweptContact as OriginalContact } from '../../../oracle/src/wave/barrel/sweptContact';
import { BARREL_SLOPE as ORIGINAL_SLOPE, SweptLoft as OriginalLoft } from '../../../oracle/src/wave/barrel/sweptLoft';

const FIXTURE = '/private/tmp/contact-lazy-height-20261004-v3/run/capture.json.gz';
const COMPRESSED_SHA = 'e7bbbb85cf03450f97fe8807414f749dbada7a5b5fa814e490f578f26f965e2f';
const EXPANDED_SHA = 'a9c1e4d0b759aac2a9123e9d02cef97a957e959415d65ad098f53b3f99287648';
const PROOF = 'checks/f64-replay-first-proof.json';
type NumericArray = Float32Array | Float64Array | Uint8Array | Uint32Array | Int32Array;
type CandidateTrace = { strip: number; x: number; z: number; crossings: number };
type QueryTrace = {
  ordinal: number; phase: string; method: 'query' | 'floorAt'; input: number[];
  initial?: ContactHit; result: boolean | number; output?: ContactHit;
  candidates: CandidateTrace[]; heldXz: number[]; normalVertices: number[]; error?: string;
};
type NumericState = {
  nx: number; nz: number; dx: number; restLevel: number; time: number;
  h: Float64Array; bed: Float64Array; xCenters: Float64Array; zCenters: Float64Array; dz: Float64Array;
};
type Epoch = {
  ordinal: number; seaTime: number; afterWaterEnded: boolean; slices: number; vertices: number; indices: number;
  joinedStrips: number; runs: [number, number][]; heightCalls: Record<string, number>;
  normalCalls: number; normalRows: number; hitNormalVertices: number[]; queries: QueryTrace[];
};
type Fixture = {
  byteOrder: string; seaTime: number; config: SurfZoneConfig; options: { barrelCases: Uint8Array[] };
  grid: { xMin: number; zMin: number; nx: number; nz: number; spacing: number };
  windowXMin: number; restLevel: number; nodeSpacing: number; solver: Omit<NumericState, 'restLevel' | 'time'>;
  records: Float32Array; recordCount: number; stillLevel: number;
  contactOptions: { bucket: number }; loftOptions: { contact: boolean; sheet: boolean };
  loft: LoftResult;
};
type Capture = { status: { complete: boolean; ordinaryArraysIdentical: boolean }; epochs: Epoch[]; firstFixture: Fixture };
type PrivateLoft = {
  normalReady: Uint8Array; normalFirst: Int32Array; normalLast: Int32Array;
  prepareNormal(v: number): void;
};
type ContactInspection = {
  at: Int32Array;
  normalAt(loft: LoftResult, k: number, hit: ContactHit): void;
  crossings(loft: LoftResult, s: number, x: number, z: number): number;
  heldByAnother(loft: LoftResult, s: number, x: number, z: number): boolean;
  ensureBucket(s: number): void;
};
const sha = (value: ArrayBufferView) => createHash('sha256').update(Buffer.from(value.buffer, value.byteOffset, value.byteLength)).digest('hex');
const bytes = (value: ArrayBufferView) => Buffer.from(value.buffer, value.byteOffset, value.byteLength);
function same(actual: unknown, expected: unknown, label: string): void {
  assert(Object.is(actual, expected), `${label}: actual ${String(actual)}, expected ${String(expected)}`);
}
function sameBytes(actual: ArrayBufferView, expected: ArrayBufferView, label: string): void {
  const a = bytes(actual), b = bytes(expected);
  assert.equal(a.length, b.length, `${label} byte length`);
  if (Buffer.compare(a, b) !== 0) {
    let i = 0; while (a[i] === b[i] && i < a.length) i++;
    assert.fail(`${label}: first differing byte ${i}, actual ${a[i]}, expected ${b[i]}`);
  }
}
function sameFields(actual: object, expected: object, label: string): void {
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), `${label} fields`);
  const a = actual as Record<string, unknown>, b = expected as Record<string, unknown>;
  for (const key of Object.keys(b)) same(a[key], b[key], `${label}.${key}`);
}
/** Decode tags without deleting undefined fields; typed bytes always use plain owning Uint8Array, never Buffer.slice. */
function unpack(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unpack);
  if (!value || typeof value !== 'object') return value;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length === 1 && item.undefined === true) return undefined;
  if (Object.keys(item).length === 1 && typeof item.number === 'string') {
    switch (item.number) {
      case 'NaN': return Number.NaN;
      case '-0': return -0;
      case 'Infinity': return Infinity;
      case '-Infinity': return -Infinity;
      default: assert.fail(`Unknown number tag ${item.number}`);
    }
  }
  if (typeof item.type === 'string' && typeof item.byteLength === 'number' && typeof item.base64 === 'string') {
    const owned = new Uint8Array(Buffer.from(item.base64, 'base64'));
    assert.equal(owned.byteOffset, 0); assert.equal(owned.buffer.byteLength, owned.byteLength);
    assert.equal(owned.byteLength, item.byteLength);
    switch (item.type) {
      case 'Uint8Array': return owned;
      case 'Float32Array': return new Float32Array(owned.buffer);
      case 'Float64Array': return new Float64Array(owned.buffer);
      case 'Uint32Array': return new Uint32Array(owned.buffer);
      case 'Int32Array': return new Int32Array(owned.buffer);
      default: assert.fail(`Unknown typed payload ${item.type}`);
    }
  }
  return Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, unpack(entry)]));
}
function encode(_key: string, value: unknown): unknown {
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) {
    return { number: Object.is(value, -0) ? '-0' : String(value) };
  }
  if (value === undefined) return { undefined: true };
  return value;
}
/**
 * Fixed numeric height state only. Both sides execute their own real solver sampleCentered/rowBelow methods
 * and their own real PhysicalSurfWater plainSurfaceAt/node cache. No new interpolation formula is shared.
 * Missing fields throw if replay unexpectedly reaches flow, stepping, carving, or other uncaptured behavior.
 */
function numericProvider<T extends object>(prototype: T, fixture: Fixture): { solver: T & NumericState; reads: Set<string> } {
  const fields: NumericState = {
    nx: fixture.solver.nx, nz: fixture.solver.nz, dx: fixture.solver.dx, restLevel: fixture.restLevel, time: fixture.seaTime,
    h: fixture.solver.h.slice(), bed: fixture.solver.bed.slice(), xCenters: fixture.solver.xCenters.slice(),
    zCenters: fixture.solver.zCenters.slice(), dz: fixture.solver.dz.slice(),
  };
  const target = Object.assign(Object.create(prototype) as T, fields);
  const reads = new Set<string>();
  const solver = new Proxy(target, {
    get(object, key, receiver) {
      if (!Reflect.has(object, key)) assert.fail(`Plain numeric provider read uncaptured ${String(key)}`);
      if (typeof key === 'string') reads.add(key);
      return Reflect.get(object, key, receiver);
    },
  });
  return { solver, reads };
}
function compareFreshGeometry(a: LoftResult, b: LoftResult): void {
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
  for (const key of Object.keys(a) as (keyof LoftResult)[]) {
    if (key === 'normals') continue; // Private unused normals have no full-result contract.
    const av = a[key], bv = b[key];
    if (ArrayBuffer.isView(av) && ArrayBuffer.isView(bv)) sameBytes(av, bv, `fresh geometry ${key}`);
    else same(av, bv, `fresh geometry ${key}`);
  }
}
/** Capture comparisons cover active geometry/metadata actually read by contact, not old unused output history. */
function compareCapturedQueryGeometry(actual: LoftResult, recorded: LoftResult): void {
  for (const key of ['vertexCount', 'indexCount', 'sliceCount', 'restSamples', 'clamps', 'clampedLookups', 'overlaps',
    'overlapsOpen', 'overlapOpenWeight', 'rayCorrections', 'rayMaxBlend', 'rayMinAdvance', 'rayInvalidIntervals', 'tipGap'] as const) {
    same(actual[key], recorded[key], `captured scalar ${key}`);
  }
  for (const key of ['positions', 'indices', 'sliceFront', 'sliceJoined', 'sliceRayX', 'sliceRayZ', 'sliceLife',
    'sliceTipAlong', 'sliceTipUp', 'sliceAnchorVX', 'sliceAnchorVZ', 'sliceWeight'] as const) {
    const expected = recorded[key] as NumericArray;
    sameBytes((actual[key] as NumericArray).subarray(0, expected.length), expected, `captured query geometry ${key}`);
  }
}
function traceQueries(contact: ContactInspection) {
  const trace = { candidates: [] as CandidateTrace[], heldXz: [] as number[], normalVertices: [] as number[] };
  let holding = false;
  const crossings = contact.crossings, held = contact.heldByAnother, bucket = contact.ensureBucket, normal = contact.normalAt;
  vi.spyOn(contact, 'crossings').mockImplementation(function (this: ContactInspection, ...args) {
    const result = crossings.apply(this, args);
    trace.candidates.push({ strip: args[1], x: args[2], z: args[3], crossings: result }); return result;
  });
  vi.spyOn(contact, 'heldByAnother').mockImplementation(function (this: ContactInspection, ...args) {
    const previous = holding; holding = true;
    try { return held.apply(this, args); } finally { holding = previous; }
  });
  vi.spyOn(contact, 'ensureBucket').mockImplementation(function (this: ContactInspection, s) {
    if (holding) trace.heldXz.push(s); return bucket.call(this, s);
  });
  vi.spyOn(contact, 'normalAt').mockImplementation(function (this: ContactInspection, ...args) {
    for (let m = 0; m < 3; m++) trace.normalVertices.push(this.at[3 * args[1] + m]);
    return normal.apply(this, args);
  });
  return { trace, reset() { trace.candidates.length = 0; trace.heldXz.length = 0; trace.normalVertices.length = 0; } };
}

afterEach(() => vi.restoreAllMocks());
describe('actual first-epoch F64 ordinary contact replay', () => {
  it('replays exactly 627 recorded calls and exactly 65 demanded normal vertices against capture and independent eager oracle', () => {
    const proof: Record<string, unknown> = { schema: 1, status: 'running', baseline: 'ef60d3cee', fixture: FIXTURE,
      compressedSha256: COMPRESSED_SHA, expandedSha256: EXPANDED_SHA, replayEpochs: 1,
      scope: 'Contact/query/floor parity only; no body trajectory or later-epoch replay, cost or FPS claim' };
    try {
      const packed = readFileSync(FIXTURE), expanded = gunzipSync(packed);
      assert.equal(packed.byteLength, 2_451_650); assert.equal(sha(packed), COMPRESSED_SHA);
      assert.equal(expanded.byteLength, 13_547_682); assert.equal(sha(expanded), EXPANDED_SHA);
      const capture = unpack(JSON.parse(expanded.toString('utf8'))) as Capture;
      const f = capture.firstFixture, epoch = capture.epochs[0];
      assert.equal(capture.epochs.length, 15); assert.equal(capture.status.complete, true); assert.equal(capture.status.ordinaryArraysIdentical, true);
      assert.equal(f.byteOrder, 'little'); assert.equal(new Uint8Array(new Uint32Array([0x01020304]).buffer)[0], 4);
      assert.equal(epoch.ordinal, 1); same(f.seaTime, epoch.seaTime, 'epoch sea time'); assert.equal(epoch.afterWaterEnded, true);
      assert.equal(f.recordCount, 125); assert.equal(f.records.byteLength, f.recordCount * FRONT_STRIDE * 4);
      assert.equal(f.solver.nx, 160); assert.equal(f.solver.nz, 725); assert.equal(f.solver.h.length, f.solver.nx * f.solver.nz);
      assert.equal(f.solver.bed.length, f.solver.h.length);
      assert(f.solver.h instanceof Float64Array && f.solver.bed instanceof Float64Array);
      assert(f.solver.h.every(Number.isFinite) && f.solver.bed.every(Number.isFinite), 'captured F64 h/bed are finite before case intake');
      assert.equal(f.nodeSpacing, 2); assert.equal(f.options.barrelCases.length, 4);
      same(f.contactOptions.bucket, CONTACT.bucket, 'ordinary bucket'); assert.deepEqual(f.loftOptions, { contact: true, sheet: false });
      same(f.solver.xCenters[0] - f.solver.dx / 2, f.grid.xMin, 'captured grid x origin'); same(f.grid.xMin, f.windowXMin, 'window origin');
      same(f.solver.zCenters[0] - f.solver.dz[0] / 2, f.grid.zMin, 'captured grid z origin'); same(f.grid.spacing, f.nodeSpacing, 'node spacing');
      assert.equal(Math.round(f.solver.nx * f.solver.dx / f.nodeSpacing) + 1, f.grid.nx);
      const zSpan = f.solver.zCenters[f.solver.nz - 1] + f.solver.dz[f.solver.nz - 1] / 2 - f.grid.zMin;
      assert.equal(Math.round(zSpan / f.nodeSpacing) + 1, f.grid.nz);
      const cState = numericProvider(ShallowWaterSolver.prototype, f), oState = numericProvider(OriginalSolver.prototype, f);
      for (const key of ['h', 'bed', 'xCenters', 'zCenters', 'dz'] as const) {
        assert.notEqual(cState.solver[key].buffer, oState.solver[key].buffer);
        sameBytes(cState.solver[key], f.solver[key], `candidate F64 ${key}`); sameBytes(oState.solver[key], f.solver[key], `oracle F64 ${key}`);
      }
      const slope = BARREL_SLOPE[f.config.spot]; assert.notEqual(slope, undefined); same(slope, ORIGINAL_SLOPE[f.config.spot], 'slope');
      let backend!: SweptContact, privateLoft!: PrivateLoft;
      const computed: number[] = [], eagerRuns: [number, number][] = [];
      const update = SweptContact.prototype.update, build = SweptLoft.prototype.build;
      vi.spyOn(SweptContact.prototype, 'update').mockImplementation(function (this: SweptContact, ...args) { backend = this; return update.apply(this, args); });
      vi.spyOn(SweptLoft.prototype, 'build').mockImplementation(function (this: SweptLoft, ...args) { privateLoft = this as unknown as PrivateLoft; return build.apply(this, args); });
      const cProto = SweptLoft.prototype as unknown as PrivateLoft, prepare = cProto.prepareNormal;
      vi.spyOn(cProto, 'prepareNormal').mockImplementation(function (this: PrivateLoft, v) {
        if (this.normalReady[v] !== 1) computed.push(v); return prepare.call(this, v);
      });
      const oProto = OriginalLoft.prototype as unknown as { normals(first: number, last: number): void }, normals = oProto.normals;
      vi.spyOn(oProto, 'normals').mockImplementation(function (this: typeof oProto, first, last) { eagerRuns.push([first, last]); return normals.call(this, first, last); });
      // Each decode receives a plain Uint8Array with its own complete buffer, avoiding Buffer.slice intake semantics.
      const owner = SweptContact.forOrdinaryWorker(new ProfileLibrary(f.options.barrelCases.map(raw => decodeCase(new Uint8Array(raw)))), slope!);
      const oracle = new OriginalContact(new OriginalLibrary(f.options.barrelCases.map(raw => originalDecodeCase(new Uint8Array(raw)))), slope!, f.contactOptions);
      const water = new PhysicalSurfWater(cState.solver, { peakPeriod: f.config.peakPeriod, nodeSpacing: f.nodeSpacing, swept: owner.queries });
      const oldWater = new OriginalWater(oState.solver, { peakPeriod: f.config.peakPeriod, nodeSpacing: f.nodeSpacing, swept: oracle });
      const callbacks: [number, number, number][] = [], oldCallbacks: [number, number, number][] = [];
      const plain = water.plainSurfaceAt.bind(water), oldPlain = oldWater.plainSurfaceAt.bind(oldWater);
      vi.spyOn(water, 'plainSurfaceAt').mockImplementation((x, z) => { const value = plain(x, z); callbacks.push([x, z, value]); return value; });
      vi.spyOn(oldWater, 'plainSurfaceAt').mockImplementation((x, z) => { const value = oldPlain(x, z); oldCallbacks.push([x, z, value]); return value; });
      owner.updateFromPlainSurface(f.records.slice(), f.recordCount, f.stillLevel, water);
      oldWater.withSurfaceNodeCache(() => oracle.update(f.records.slice(), f.recordCount, f.stillLevel, (x, z) => oldWater.plainSurfaceAt(x, z)));
      assert.equal(computed.length, 0); assert.equal(callbacks.length, Object.values(epoch.heightCalls).reduce((a, b) => a + b, 0));
      assert.equal(callbacks.length, oldCallbacks.length);
      for (let i = 0; i < callbacks.length; i++) for (let j = 0; j < 3; j++) same(callbacks[i][j], oldCallbacks[i][j], `height callback ${i}[${j}]`);
      assert.deepEqual(eagerRuns, epoch.runs); assert.equal(eagerRuns.length, epoch.normalCalls);
      const eagerRows = eagerRuns.reduce((sum, [first, last]) => sum + last - first + 1, 0);
      assert.equal(eagerRows, epoch.normalRows); assert.equal(eagerRows * LOFT_SAMPLES, 23_852);
      for (const [first, last] of eagerRuns) for (let row = first; row <= last; row++) {
        assert.equal(privateLoft.normalFirst[row], first); assert.equal(privateLoft.normalLast[row], last);
      }
      compareFreshGeometry(backend.last!, oracle.last!); compareCapturedQueryGeometry(backend.last!, f.loft); compareCapturedQueryGeometry(oracle.last!, f.loft);
      assert.equal(backend.last!.sliceCount, 187); assert.equal(backend.last!.vertexCount, 25_058);
      const cTrace = traceQueries(backend as unknown as ContactInspection), oTrace = traceQueries(oracle as unknown as ContactInspection);
      const a = createContactHit(), b = originalHit();
      const results: Record<string, unknown>[] = []; let floors = 0, hits = 0, anomalies = 0;
      assert.equal(epoch.queries.length, 627);
      for (let i = 0; i < epoch.queries.length; i++) {
        const q = epoch.queries[i]; assert.equal(q.ordinal, i + 1); assert.equal(q.error, undefined);
        cTrace.reset(); oTrace.reset(); const before = computed.length;
        const [x, y, z] = q.input;
        let result: number | boolean;
        if (q.method === 'floorAt') {
          assert.equal(q.input.length, 2); floors++;
          result = owner.queries.floorAt(x, y); same(result, oracle.floorAt(x, y), `oracle floor ${q.ordinal}`);
          assert.equal(computed.length, before, `floor ${q.ordinal} normal work`);
        } else {
          assert.equal(q.method, 'query'); assert.equal(q.input.length, 3); assert(q.initial && q.output);
          assert.deepEqual(Object.keys(a).sort(), Object.keys(q.initial).sort(), 'recorded initial hit schema');
          Object.assign(a, q.initial); Object.assign(b, q.initial);
          sameFields(a, q.initial, `candidate initial ${q.ordinal}`); sameFields(b, q.initial, `oracle initial ${q.ordinal}`);
          result = owner.queries.query(x, y, z, a); same(result, oracle.query(x, y, z, b), `oracle result ${q.ordinal}`);
          sameFields(a, q.output, `captured output ${q.ordinal}`); sameFields(b, q.output, `oracle captured output ${q.ordinal}`);
          if (result) hits++;
          else {
            assert.equal(computed.length, before, `false ${q.ordinal} normal work`);
            if (q.candidates.some(c => c.crossings > 0)) anomalies++;
          }
        }
        same(result, q.result, `captured result ${q.ordinal}`);
        assert.deepEqual(cTrace.trace, { candidates: q.candidates, heldXz: q.heldXz, normalVertices: q.normalVertices }, `candidate trace ${q.ordinal}`);
        assert.deepEqual(oTrace.trace, cTrace.trace, `oracle trace ${q.ordinal}`);
        assert.deepEqual(backend.stats, oracle.stats, `stats ${q.ordinal}`);
        for (const v of q.normalVertices) {
          assert.equal(privateLoft.normalReady[v], 1); assert(v >= 0 && v < f.loft.vertexCount);
          sameBytes(backend.last!.normals.subarray(3 * v, 3 * v + 3), oracle.last!.normals.subarray(3 * v, 3 * v + 3), `oracle selected normal ${q.ordinal}/${v}`);
          sameBytes(backend.last!.normals.subarray(3 * v, 3 * v + 3), f.loft.normals.subarray(3 * v, 3 * v + 3), `captured selected normal ${q.ordinal}/${v}`);
        }
        results.push({ ordinal: q.ordinal, phase: q.phase, method: q.method, result,
          outputSha256: q.method === 'query' ? createHash('sha256').update(JSON.stringify(a, encode)).digest('hex') : undefined,
          normalVertices: [...cTrace.trace.normalVertices], stats: { ...backend.stats } });
      }
      assert.equal(floors, 186); assert.equal(hits, 28);
      assert.equal(backend.stats.queries, 627 - floors); assert.equal(backend.stats.hits, hits); assert.equal(backend.stats.anomalies, anomalies);
      assert.equal(computed.length, 65); assert.equal(new Set(computed).size, 65);
      assert.deepEqual([...computed].sort((a, b) => a - b), epoch.hitNormalVertices);
      assert.equal(callbacks.length, oldCallbacks.length); // No normal/floor/query operation asks the height provider again.
      assert.equal(callbacks.length, Object.values(epoch.heightCalls).reduce((a, b) => a + b, 0));
      for (const key of ['h', 'bed', 'xCenters', 'zCenters', 'dz'] as const) {
        sameBytes(cState.solver[key], f.solver[key], `unchanged candidate F64 ${key}`); sameBytes(oState.solver[key], f.solver[key], `unchanged oracle F64 ${key}`);
      }
      assert.deepEqual([...cState.reads].sort(), [...oState.reads].sort());
      const heightStream = Float64Array.from(callbacks.flat());
      Object.assign(proof, { status: 'passed', seaTime: f.seaTime, slices: 187, vertices: 25_058, records: 125,
        heightCalls: callbacks.length, heightCallbackStreamSha256: sha(heightStream), providerFieldsRead: [...cState.reads].sort(),
        publicCalls: 627, queryCalls: 627 - floors, floorCalls: floors, hits, anomalies, eagerNormalRows: eagerRows, eagerNormalVertices: eagerRows * LOFT_SAMPLES,
        demandedNormalVertices: computed.length, demandedVertexOrder: computed, stats: { ...backend.stats }, results,
        captureContract: { activeArrays: ['positions', 'indices', 'sliceFront', 'sliceJoined', 'sliceRayX', 'sliceRayZ', 'sliceLife',
          'sliceTipAlong', 'sliceTipUp', 'sliceAnchorVX', 'sliceAnchorVZ', 'sliceWeight'], selectedNormalVertices: epoch.hitNormalVertices,
          excludedHistoricalUnused: ['unselected/isolated normal slots', 'unused old mouth/sheet output slots'],
          freshCandidateOracle: 'All full geometry buffers/scalars except private unused normal buffer are byte/value-identical' } });
    } catch (cause) {
      proof.status = 'failed'; proof.failure = String(cause); throw cause;
    } finally {
      writeFileSync(PROOF, JSON.stringify(proof, encode, 2) + '\n');
    }
  });
});
