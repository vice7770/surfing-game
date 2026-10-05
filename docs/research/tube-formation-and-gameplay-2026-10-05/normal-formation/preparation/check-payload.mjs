// Prepared source only. Root may run this checker; preparation did not execute it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { TextEncoder } from 'node:util';
import { createProductionEvidenceProjection } from './evidence-projection.mjs';

const RAW = '/private/tmp/tube-board-raw-normal-native-20261005';
const SOURCE = '/private/tmp/tube-c-formation-trial-20261005/source';
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const sha = value => createHash('sha256').update(value).digest('hex');
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const at = arg.indexOf('='); assert(arg.startsWith('--') && at > 2, 'Use --key=value');
  return [arg.slice(2, at), arg.slice(at + 1)];
}));
assert(Object.keys(args).every(k => ['reference', 'manifest'].includes(k)), 'Unknown argument');
const projection = createProductionEvidenceProjection(), L = projection.limits;
assert.equal(L.maxRows, 7201); assert.equal(L.maxEvents, 6);
assert.equal(L.reportBytes, 32 * 1024 * 1024); assert.equal(L.traceBytes, 24 * 1024 * 1024);
const conservativeTraceBytes = L.maxRows * (L.compactRowBytes + 1);
const conservativeReportBytes = L.maxRows * (L.compactRowBytes + 1) + L.metadataReserveBytes;
assert(conservativeTraceBytes <= L.traceBytes, 'Finite7201-row NDJSON budget');
assert(conservativeReportBytes <= L.reportBytes, 'Rows, six event graphs and metadata reserve fit report');

// Verify the exact browser-serialized factory has no module-local dependencies.
const isolated = runInNewContext('(' + createProductionEvidenceProjection.toString() + ')()', {
  Float64Array, Uint8Array, Uint16Array, ArrayBuffer, TextEncoder,
  btoa: value => Buffer.from(value, 'latin1').toString('base64'),
});
assert.deepEqual(JSON.parse(JSON.stringify(isolated.limits)), L);

const waveSource = readFileSync(SOURCE + '/src/physics/waveFrame.ts', 'utf8');
const riderSource = readFileSync(SOURCE + '/src/physics/AttachedRider.ts', 'utf8');
const metadataBytes = readFileSync(RAW + '/observer-fields.json');
const metadata = JSON.parse(metadataBytes);
assert.equal(metadata.allFields.length, 143, 'Existing schema only; no new operand inventory');
function interfaceBody(source, name) {
  const match = source.match(new RegExp('(?:export )?interface ' + name + '(?: extends [^{]+)? \\{([\\s\\S]*?)\\n\\}'));
  assert(match, 'Pinned public interface ' + name);
  return match[1].replace(/\/\*[\s\S]*?\*\//g, '');
}
function primitiveMembers(source, name) {
  const members = [...interfaceBody(source, name).matchAll(/\b([A-Za-z]\w*)\??\s*:\s*(number|boolean|RiderPhase|ContactLimit)\s*;/g)]
    .map(m => ({ key: m[1], type: m[2] }));
  assert(members.length, 'Nonempty primitive interface ' + name); return members;
}
const waveMembers = primitiveMembers(waveSource, 'WaveFrame');
assert.equal(waveMembers.length, 14, 'All existing own WaveFrame primitives in fixture');
const landingMembers = primitiveMembers(riderSource, 'LandingDemandOperands');
assert.equal(landingMembers.length, 143);
assert.deepEqual(landingMembers.map(m => m.key).sort(), metadata.allFields.slice().sort());
const sampleMembers = [...landingMembers, ...primitiveMembers(riderSource, 'RiderContactSample')];
const finiteDecimal = '-2.2250738585072014e-308';
const WORST = Number(finiteDecimal);
assert(Number.isFinite(WORST)); assert.equal(JSON.stringify(WORST), finiteDecimal);
function scalarFixture(members) {
  return Object.fromEntries(members.map(({ key, type }) => [key,
    type === 'boolean' ? false : type === 'RiderPhase' ? 'standing' : type === 'ContactLimit' ? 'impact' : WORST]));
}
const contactSample = scalarFixture(sampleMembers);
const contactDiagnostics = {
  mount: WORST, step: WORST, substeps: WORST, elapsedStepSeconds: WORST,
  limitedSubsteps: WORST, nonContactSubsteps: WORST, maxFlightTime: WORST, recoverableError: WORST,
  last: contactSample, firstLimited: { ...contactSample }, firstNonContact: { ...contactSample },
  loss: { trigger: 'posture-error', selectedCause: 'lost board', dominantLimit: 'impact', sample: { ...contactSample } },
  meanForceX: WORST, meanForceY: WORST, meanForceZ: WORST,
  peakNormalLoad: WORST, landingPeak: WORST, landingFrontShare: WORST,
};
function makeFixture() {
  const boardBacking = new Float64Array(10).fill(0.25), riderBacking = new Float64Array(35).fill(0.75);
  const board = boardBacking.subarray(1, 9), rider = riderBacking.subarray(1, 34);
  board.fill(WORST); rider.fill(WORST); board[0] = -0; rider[0] = -0;
  const ride = { phase: 'standing', speed: WORST, boardSpeed: WORST, cue: true, separation: 'lost board',
    resets: Number.MAX_SAFE_INTEGER, balance: WORST, bank: WORST, wave: scalarFixture(waveMembers),
    popUp: { outcome: 'rising', refusal: 'feet under water', duration: WORST, landingPeak: WORST, frontShare: WORST },
    contactDiagnostics };
  return { step: 7200, physicalSeconds: 119.99999999999999, seaTime: WORST,
    input: { paddle: false, popUp: false, steer: WORST },
    inputView: { ride, board: { x: WORST, z: WORST, heading: WORST }, peelDirection: WORST, focusZ: WORST, crestBehind: WORST },
    ride, board, rider, pilot: { state: 'position', attempts: 1, outcome: 'fell · lost board', rideTime: 119.99999999999999, phase: '' },
    clocks: { workerSeaTime: WORST, visualClock: WORST, waterTime: WORST, surfaceRevision: Number.MAX_SAFE_INTEGER },
    camera: { position: [WORST, WORST, WORST], quaternion: [WORST, WORST, WORST, WORST] },
    loft: { slices: 300, vertices: 40200, indices: 240000 },
    witness: { classification: 'contained', pointCountInUnambiguousCavity: 7, commonComponentCount: 300,
      sevenPublishedWitnessesAndReferenceTrunkSpheresContained: true,
      component: { localId: 300, front: Number.MAX_SAFE_INTEGER, firstRow: 299, lastRow: 300, sigmaMin: WORST, sigmaMax: WORST },
      headVertical: { radius: WORST, floorGap: WORST, roofGap: WORST } },
    nearFormed: { available: true, qualifies: true, front: Number.MAX_SAFE_INTEGER, horizontalDistance: WORST,
      reason: 'no-positive-formed-weighted-joined-indexed-band' },
    detector: { cumulativeMilliseconds: WORST, disabledReason: 'x'.repeat(128), measured: true },
  };
}
function fingerprint(value) {
  if (ArrayBuffer.isView(value)) return { dtype: value.constructor.name, byteOffset: value.byteOffset,
    length: value.length, activeBytes: Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64') };
  if (value && typeof value === 'object') return Array.isArray(value) ? value.map(fingerprint)
    : Object.fromEntries(Object.keys(value).map(k => [k, fingerprint(value[k])]));
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) return { number: String(value), minusZero: Object.is(value, -0) };
  return value === undefined ? { absentValue: 'undefined' } : value;
}
function deepFreezeData(value) {
  if (!value || typeof value !== 'object' || ArrayBuffer.isView(value) || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeData(child); return Object.freeze(value);
}
function decodeWords(record, source) {
  assert.equal(record.dtype, 'Float64Array'); assert.equal(record.count, source.length);
  assert.equal(record.encoding, 'base64-exact-active-typed-array-words');
  const decoded = Buffer.from(record.data, 'base64');
  assert.equal(decoded.length, source.byteLength);
  assert(decoded.equals(Buffer.from(source.buffer, source.byteOffset, source.byteLength)), 'Exact active words, including signed zero and view offset');
}
function assertDetached(out, raw) {
  const identities = new Set();
  const walk = (v, visitor) => { if (!v || typeof v !== 'object') return; visitor(v);
    if (!ArrayBuffer.isView(v)) for (const c of Object.values(v)) walk(c, visitor); };
  walk(raw, v => identities.add(v)); walk(out, v => assert(!identities.has(v), 'Detached evidence graph'));
}
const fixture = deepFreezeData(makeFixture()), before = JSON.stringify(fingerprint(fixture));
const row = projection.projectRow(fixture), isolatedRow = isolated.projectRow(fixture);
assert.equal(JSON.stringify(row), JSON.stringify(isolatedRow), 'Browser-serialized projection identical');
assert.equal(JSON.stringify(fingerprint(fixture)), before, 'Projection did not mutate any source value/word');
assertDetached(row, fixture); decodeWords(row.board, fixture.board); decodeWords(row.rider, fixture.rider);
assert.deepEqual(Object.keys(row.input).sort(), ['paddle', 'popUp', 'steer']);
for (const key of Object.keys(fixture.input)) assert(Object.is(row.input[key], fixture.input[key]), 'Exact original returned input field ' + key);
assert(!Object.hasOwn(row.ride, 'contactDiagnostics')); assert(!Object.hasOwn(row.inputView, 'ride'));
assert(!Object.hasOwn(row.inputView, 'wave')); assert.deepEqual(Object.keys(row.ride.wave).sort(), waveMembers.map(m => m.key).sort());
const finiteFixtureRowBytes = bytes(row);
row.input.steer = 0; row.ride.wave.directionX = 1; row.inputView.board.x = 1;
row.camera.position[0] = 1; row.witness.component.front = 1; row.board.data = '';
assert.equal(JSON.stringify(fingerprint(fixture)), before, 'Mutating detached output cannot alter source');
const event = projection.projectEventRide(fixture.ride); assertDetached(event, fixture);
assert.equal(JSON.stringify(fingerprint(fixture)), before, 'Full event did not mutate source');
assert.deepEqual(Object.keys(event.contactDiagnostics.last).sort(), Object.keys(contactSample).sort());
const finiteFixtureEventBytes = bytes(event);
event.contactDiagnostics.last.boardPreRhs0 = 1;
assert.equal(JSON.stringify(fingerprint(fixture)), before, 'Mutating detached contact event cannot alter source');

const unavailableFixture = makeFixture();
for (const member of waveMembers) if (member.type === 'number') unavailableFixture.ride.wave[member.key] = -Infinity;
unavailableFixture.inputView.crestBehind = -Infinity; unavailableFixture.ride.separation = undefined;
unavailableFixture.ride.popUp.refusal = undefined;
const unavailableRow = projection.projectRow(unavailableFixture);
assert.equal(unavailableRow.ride.wave.curlDistance, null);
assert.equal(unavailableRow.ride.wave.$availability.curlDistance, '-Infinity');
assert.equal(unavailableRow.ride.separation, null); assert.equal(unavailableRow.ride.$availability.separation, 'undefined');
const sparseFixture = makeFixture(); delete sparseFixture.ride.separation; sparseFixture.ride.popUp.refusal = null;
const sparseRow = projection.projectRow(sparseFixture);
assert.equal(sparseRow.ride.$availability.separation, 'absent');
assert.equal(sparseRow.ride.popUp.refusal, null); assert(!sparseRow.ride.popUp.$availability?.refusal);
const initialFixture = makeFixture(); Object.assign(initialFixture, { step: 0, physicalSeconds: 0,
  input: null, inputView: null, witness: null, nearFormed: null });
const initialRow = projection.projectRow(initialFixture);
assert.equal(initialRow.input, null); assert.equal(initialRow.inputView, null);
assert.equal(initialRow.witness, null); assert.equal(initialRow.nearFormed, null);
const unknownWave = makeFixture(); unknownWave.ride.wave.newPrimitive = 1;
assert.throws(() => projection.projectRow(unknownWave), /Unrecognized own WaveFrame primitive/);
const overlay = makeFixture(); overlay.input.compress = 1;
assert.throws(() => projection.projectRow(overlay), /production line-pilot shape/);
const float32 = makeFixture(); float32.board = new Float32Array(8);
assert.throws(() => projection.projectRow(float32), /Float64Array/);

let referenceCheck = { requested: false, complete: false };
if (args.reference) {
  assert.equal(args.reference, RAW + '/candidate-first/report.json', 'Only declared completed raw-normal143 report');
  const content = readFileSync(args.reference); assert(content.length <= L.reportBytes);
  const reference = JSON.parse(content); assert.equal(reference.complete, true, 'Never process a still-live/incomplete output');
  assert(Array.isArray(reference.steps) && reference.steps.length <= 2160);
  const samples = reference.steps.filter(r => r.ride?.contactDiagnosticRetention === 'full');
  assert(samples.length > 0, 'Completed report has existing full graph evidence');
  const selected = [...samples.slice(0, 3), ...samples.slice(-3)];
  const eventSizes = selected.map(r => {
    const before = JSON.stringify(fingerprint(r.ride)), result = projection.projectEventRide(r.ride);
    assert.equal(JSON.stringify(fingerprint(r.ride)), before); assertDetached(result, r.ride);
    for (const sample of [result.contactDiagnostics.last, result.contactDiagnostics.firstLimited,
      result.contactDiagnostics.firstNonContact, result.contactDiagnostics.loss?.sample]) if (sample)
      for (const key of metadata.allFields) assert(Object.hasOwn(sample, key), 'Existing field retained: ' + key);
    return bytes(result);
  });
  referenceCheck = { requested: true, complete: true, file: args.reference, bytes: content.length,
    sha256: sha(content), selectedEventGraphs: eventSizes.length, maximumSelectedEventBytes: Math.max(...eventSizes) };
}

function artifactMetadata(records, maxCount, perItem, totalCap, extension) {
  assert(Array.isArray(records) && records.length <= maxCount, 'Artifact count cap ' + extension);
  let total = 0; const seen = new Set();
  for (const record of records) {
    assert(record && typeof record.file === 'string' && record.file.endsWith(extension));
    assert(!record.file.includes('/') && !record.file.includes('\\') && !seen.has(record.file)); seen.add(record.file);
    assert(Number.isSafeInteger(record.bytes) && record.bytes > 0 && record.bytes <= perItem);
    assert(/^[0-9a-f]{64}$/.test(record.sha256), 'External artifact SHA256 only');
    assert(!Object.hasOwn(record, 'data') && !Object.hasOwn(record, 'png'), 'No embedded media payload');
    total += record.bytes;
  }
  assert(total <= totalCap, 'Aggregate byte cap ' + extension); return total;
}
let manifestCheck = { requested: false, complete: false, externalArtifactsOnly: true };
if (args.manifest) {
  const content = readFileSync(args.manifest); assert(content.length <= L.reportBytes);
  const report = JSON.parse(content); assert.equal(report.complete, true, 'Completed gameplay manifest required');
  assert(Array.isArray(report.steps) && report.steps.length <= L.maxRows);
  for (const row of report.steps) {
    assert(bytes(row) <= L.compactRowBytes);
    assert(!Object.hasOwn(row.ride ?? {}, 'contactDiagnostics'));
    assert(!Object.hasOwn(row.inputView ?? {}, 'ride'));
  }
  const artifacts = report.artifacts ?? []; assert(Array.isArray(artifacts));
  const pngs = artifacts.filter(a => a.file?.endsWith('.png'));
  const movies = artifacts.filter(a => a.file?.endsWith('.webm'));
  const pngBytes = artifactMetadata(pngs, 6, 12 * 1024 * 1024, 48 * 1024 * 1024, '.png');
  const sidecarBytes = artifactMetadata(report.loftSnapshots ?? [], 4, 6 * 1024 * 1024, 24 * 1024 * 1024, '.json');
  const movieBytes = artifactMetadata(movies, 1, 16 * 1024 * 1024, 16 * 1024 * 1024, '.webm');
  const traces = artifacts.filter(a => a.file === 'steps.ndjson'); assert.equal(traces.length, 1);
  assert(Number.isSafeInteger(traces[0].bytes) && traces[0].bytes <= L.traceBytes);
  assert(/^[0-9a-f]{64}$/.test(traces[0].sha256));
  const checkpoints = report.checkpoints ?? []; assert(Array.isArray(checkpoints) && checkpoints.length <= L.maxEvents);
  for (const checkpoint of checkpoints) {
    assert(bytes(checkpoint) <= L.checkpointBytes, 'Complete checkpoint metadata cap512KiB');
    assert(checkpoint.fullEventRide && bytes(checkpoint.fullEventRide) <= L.fullEventBytes, 'One full event graph per checkpoint');
  }
  const header = { ...report, steps: [], checkpoints: [] };
  assert(bytes(header) <= L.headerReserveBytes, 'Header metadata reserve512KiB');
  manifestCheck = { requested: true, complete: true, file: args.manifest, reportBytes: content.length,
    reportSha256: sha(content), rows: report.steps.length, fullEventCheckpoints: checkpoints.length,
    pngs: pngs.length, pngBytes, sidecars: (report.loftSnapshots ?? []).length, sidecarBytes,
    movies: movies.length, movieBytes, traceBytes: traces[0].bytes, externalArtifactsOnly: true };
}
process.stdout.write(JSON.stringify({ schema: 'c-formation-autopilot-payload-check/v1', passed: true,
  sourceSchema: { ownWavePrimitives: waveMembers.length, existingContactOperands: metadata.allFields.length,
    metadataSha256: sha(metadataBytes), addedObserverFields: 0 },
  proof: { detached: true, nonmutating: true, exactActiveFloat64Words: true, signedZeroWordsRetained: true,
    originalThreeInputFieldsRetained: true, isolatedBrowserFactory: true, absentUndefinedNullInfinityDistinct: true,
    finiteWorstDecimal: finiteDecimal, finiteFixtureRowBytes, unavailableFixtureRowBytes: bytes(unavailableRow),
    initialFixtureRowBytes: bytes(initialRow), finiteFixtureEventBytes, compactRowCap: L.compactRowBytes,
    conservative7201RowTraceBytes: conservativeTraceBytes, conservativeReportBytes,
    reportMetadataReserveBytes: L.metadataReserveBytes, fullEventCapBytes: L.fullEventBytes },
  limits: L, referenceCheck, manifestCheck, scope: 'Payload serialization checks; no physics, FPS, gameplay, geometry or native acceptance claim' }) + '\n');
