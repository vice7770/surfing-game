import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { Ray, Vector3 } from 'three';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { FRONT_STRIDE } from './frontRecords';
import { LANDMARK, ProfileLibrary } from './ProfileLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { createContactHit, SweptContact, type ContactHit } from './sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
import { SweptContact as ParentContact } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/sweptContact';
import { ProfileLibrary as ParentLibrary } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/ProfileLibrary';

const STILL = 0.5;
const cases = readBarrelCases('padang').map(decodeCase);
const c = cases.find(value => value.id === 'pad19-a30-l12')!;
const library = () => new ProfileLibrary(cases, { geometry: 'bounded-C' });
type PacketRow = { x: number; z: number; front: number; sigma: number; tau: number; footHeight: number; footDepth: number; throwZ: number | null; pace: number | null };
const captured = JSON.parse(readFileSync(new URL('./retirementBoundary.fixture.json', import.meta.url), 'utf8')) as {
  sourceWordsRetained: boolean; ordinaryFlatCPUSubstrateNotNativeHeightfieldReplay: boolean;
  epochs: { movingStep: number; packetRows: PacketRow[] }[];
};
const metrics: Record<string, unknown> = {
  schema: 'bounded-C-retirement-contact-fixtures/v1',
  actualPacketInput: 'retirementBoundary.fixture.json, selected front component, moving steps 59 and 60',
  substrate: 'ordinary flat CPU PhysicalSurfWater; not native heightfield/state replay',
  continuityToleranceApplied: false,
  queries: [],
};
afterAll(() => {
  if (process.env.RETIREMENT_CONTACT_METRICS) writeFileSync(process.env.RETIREMENT_CONTACT_METRICS, JSON.stringify(metrics, null, 2) + '\n');
});
afterEach(() => vi.restoreAllMocks());

function packet(rows: PacketRow[]): Float32Array {
  const records = new Float32Array(rows.length * FRONT_STRIDE);
  rows.forEach((row, index) => records.set([row.x, row.z, row.front, row.sigma, row.tau, row.footHeight,
    row.footDepth, row.throwZ ?? NaN, row.pace ?? NaN], index * FRONT_STRIDE));
  return records;
}

/** Controlled parameters and coordinates; ages come from the real Padang provider's own retirement clock. */
function controlled(): Float32Array {
  const query = { slope: c.slope, footHeight: Math.fround(c.nonlinearity * 7), footDepth: 7 };
  const times = library().profileTimes(query), until = times.touchdownSeconds + times.collapseSeconds;
  const ages = [until + times.collapseSeconds, until + times.collapseSeconds, until - times.collapseSeconds / 2,
    until - times.collapseSeconds / 2, until + times.collapseSeconds, until + times.collapseSeconds];
  return packet(ages.map((tau, k) => ({ x: 4 * k + 1, z: -130, front: 1, sigma: 4 * k, tau,
    footHeight: query.footHeight, footDepth: 7, throwZ: -140, pace: 4 })));
}

const xAt = (loft: LoftResult, row: number) => loft.positions[3 * row * LOFT_SAMPLES];
function ghostToLive(loft: LoftResult): number[] {
  return Array.from({ length: Math.max(0, loft.sliceCount - 1) }, (_, row) => row).filter(row =>
    loft.sliceJoined[row] === 1 && loft.sliceFade[row] === 0 && loft.sliceWeight[row] === 0 && loft.sliceWeight[row + 1] > 0);
}
type Preparation = { normalDemand: boolean; result: LoftResult; heightReady: Uint8Array; normalReady: Uint8Array };
function contactPair(records: Float32Array) {
  const solver = new ShallowWaterSolver({ nx: 64, xMin: -8, dx: 1, zEdges: uniformEdges(-170, -60, 110) }, () => 7, { waterLevel: STILL });
  const water = new PhysicalSurfWater(solver, { peakPeriod: 18, nodeSpacing: 2 });
  let preparation: Preparation | undefined;
  const build = SweptLoft.prototype.build;
  vi.spyOn(SweptLoft.prototype, 'build').mockImplementation(function (this: SweptLoft, ...args) {
    const result = build.apply(this, args);
    const state = this as unknown as Preparation;
    if (state.normalDemand) preparation = state;
    return result;
  });
  const owner = SweptContact.forOrdinaryWorker(library(), c.slope);
  owner.updateFromPlainSurface(records, records.length / FRONT_STRIDE, STILL, water);
  const eager = new SweptContact(library(), c.slope);
  const fullScan = new SweptContact(library(), c.slope, { bucket: Infinity });
  water.withSurfaceNodeCache(() => {
    eager.update(records, records.length / FRONT_STRIDE, STILL, (x, z) => water.plainSurfaceAt(x, z));
    fullScan.update(records, records.length / FRONT_STRIDE, STILL, (x, z) => water.plainSurfaceAt(x, z));
  });
  expect(preparation).toBeDefined();
  const state = preparation!;
  expect(state.result.indices.subarray(0, state.result.indexCount)).toEqual(eager.last!.indices.subarray(0, eager.last!.indexCount));
  expect(state.result.sliceJoined.subarray(0, state.result.sliceCount)).toEqual(eager.last!.sliceJoined.subarray(0, eager.last!.sliceCount));
  function sameHit(a: ContactHit, b: ContactHit) {
    for (const key of Object.keys(a) as (keyof ContactHit)[]) expect(Object.is(a[key], b[key]), key).toBe(true);
  }
  function checkPreparedWords() {
    for (let row = 0; row < state.result.sliceCount; row++) if (state.heightReady[row]) {
      const begin = 3 * row * LOFT_SAMPLES, end = begin + 3 * LOFT_SAMPLES;
      expect(state.result.positions.subarray(begin, end)).toEqual(eager.last!.positions.subarray(begin, end));
    }
    for (let vertex = 0; vertex < state.result.vertexCount; vertex++) if (state.normalReady[vertex]) {
      expect(state.result.normals.subarray(3 * vertex, 3 * vertex + 3)).toEqual(eager.last!.normals.subarray(3 * vertex, 3 * vertex + 3));
    }
  }
  return {
    eager, fullScan, owner, state,
    floor(x: number, z: number) {
      const actual = owner.queries.floorAt(x, z), expected = eager.floorAt(x, z);
      expect(Object.is(actual, expected)).toBe(true);
      expect(Object.is(expected, fullScan.floorAt(x, z))).toBe(true);
      checkPreparedWords();
      return actual;
    },
    query(x: number, y: number, z: number) {
      const lazy = createContactHit(), expected = createContactHit(), scan = createContactHit();
      const found = owner.queries.query(x, y, z, lazy);
      expect(found).toBe(eager.query(x, y, z, expected));
      expect(found).toBe(fullScan.query(x, y, z, scan));
      sameHit(lazy, expected); sameHit(lazy, scan); checkPreparedWords();
      return { found, hit: lazy };
    },
  };
}

/** The actual indexed triangle centroids, strictly inside one retained closure strip in XZ. */
function triangleSamples(loft: LoftResult, row: number) {
  const p = loft.positions, selected = new Set([LANDMARK.crest, 48, LANDMARK.lip, LANDMARK.throat, 96, LANDMARK.toe]);
  const samples: { triangle: number; vertices: number[]; x: number; y: number; z: number }[] = [];
  for (let t = 0; t < loft.indexCount; t += 3) {
    const vertices = Array.from(loft.indices.subarray(t, t + 3));
    if (!vertices.every(v => Math.floor(v / LOFT_SAMPLES) === row || Math.floor(v / LOFT_SAMPLES) === row + 1)) continue;
    const j = Math.min(...vertices.map(v => v % LOFT_SAMPLES)) - LOFT.extensionSamples;
    if (!selected.has(j)) continue;
    const [a, b, c] = vertices;
    const area = (p[3 * b] - p[3 * a]) * (p[3 * c + 2] - p[3 * a + 2]) - (p[3 * b + 2] - p[3 * a + 2]) * (p[3 * c] - p[3 * a]);
    if (area === 0) continue;
    samples.push({ triangle: t / 3, vertices,
      x: vertices.reduce((sum, v) => sum + p[3 * v], 0) / 3,
      y: vertices.reduce((sum, v) => sum + p[3 * v + 1], 0) / 3,
      z: vertices.reduce((sum, v) => sum + p[3 * v + 2], 0) / 3 });
  }
  return samples;
}

/** Independent geometric oracle: Three's ray/triangle intersection over the actual active index buffer. */
type Fraction = { numerator: bigint; denominator: bigint };
const EXACT_SCALE = 2 ** 64;
function exactInteger(value: number): bigint {
  const scaled = value * EXACT_SCALE;
  if (!Number.isInteger(scaled)) throw new Error('Fixture coordinate is outside its exact dyadic integer domain');
  return BigInt(scaled);
}
function exactCompare(a: Fraction, b: Fraction): number {
  const delta = a.numerator * b.denominator - b.numerator * a.denominator;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
}
function exactPlaneY(p: Float32Array, vertices: number[], x: number, z: number): Fraction {
  const [a, b, c] = vertices.map(v => [exactInteger(p[3 * v]), exactInteger(p[3 * v + 1]), exactInteger(p[3 * v + 2])]);
  const u = b.map((value, i) => value - a[i]), v = c.map((value, i) => value - a[i]);
  const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  let numerator = a[1] * normal[1] - normal[0] * (exactInteger(x) - a[0]) - normal[2] * (exactInteger(z) - a[2]);
  let denominator = normal[1] * BigInt(EXACT_SCALE);
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  if (denominator === 0n) throw new Error('Vertical triangle has no exact vertical-line height');
  return { numerator, denominator };
}
function indexedCrossings(loft: LoftResult, x: number, z: number) {
  const p = loft.positions;
  let top = -Infinity;
  for (let v = 0; v < loft.vertexCount; v++) top = Math.max(top, p[3 * v + 1]);
  const ray = new Ray(new Vector3(x, top + 1, z), new Vector3(0, -1, 0));
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), out = new Vector3();
  const result: { triangle: number; y: number; minimumVertexY: number; maximumVertexY: number; exact: Fraction }[] = [];
  for (let t = 0; t < loft.indexCount; t += 3) {
    a.fromArray(p, 3 * loft.indices[t]); b.fromArray(p, 3 * loft.indices[t + 1]); c.fromArray(p, 3 * loft.indices[t + 2]);
    if (ray.intersectTriangle(a, b, c, false, out)) result.push({ triangle: t / 3, y: out.y,
      minimumVertexY: Math.min(a.y, b.y, c.y), maximumVertexY: Math.max(a.y, b.y, c.y),
      exact: exactPlaneY(p, Array.from(loft.indices.subarray(t, t + 3)), x, z) });
  }
  return result.sort((a, b) => exactCompare(a.exact, b.exact));
}

describe('real Padang C retirement contact boundary', () => {
  for (const input of [{ label: 'controlled-real-provider', records: controlled() },
    ...captured.epochs.map(epoch => ({ label: `actual-packet-step-${epoch.movingStep}`, records: packet(epoch.packetRows) }))]) {
    it(`${input.label}: rejects exact zero closure rays before nudge and keeps positive indexed interiors eager/lazy/full-scan exact`, () => {
      const before = input.records.slice(), pair = contactPair(input.records), loft = pair.eager.last!;
      const rows = ghostToLive(loft);
      expect(rows.length).toBeGreaterThan(0);
      const evidence: unknown[] = [];
      for (const row of rows) {
        expect(loft.sliceFade[row]).toBe(0); expect(loft.sliceWeight[row]).toBe(0);
        for (let j = 0; j < LOFT_SAMPLES; j++) expect(loft.positions[3 * (row * LOFT_SAMPLES + j) + 1]).toBe(STILL);
        const x = xAt(loft, row);
        const z = loft.positions[3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest) + 2];
        const ready = pair.state.heightReady.slice(), normals = pair.state.normalReady.slice();
        expect(pair.floor(x, z)).toBeNaN();
        for (const y of [STILL - 1, STILL, STILL + 1]) {
          const result = pair.query(x, y, z);
          expect(result.found).toBe(false); expect(result.hit).toEqual(createContactHit());
        }
        expect(pair.state.heightReady).toEqual(ready); expect(pair.state.normalReady).toEqual(normals);
        const samples = triangleSamples(loft, row);
        expect(samples.length).toBeGreaterThan(0);
        for (const sample of samples) {
          expect(sample.x).toBeGreaterThan(x); expect(sample.x).toBeLessThan(xAt(loft, row + 1));
          const floor = pair.floor(sample.x, sample.z);
          expect(Number.isFinite(floor)).toBe(true);
          const below = pair.query(sample.x, floor - 1, sample.z);
          const above = pair.query(sample.x, Math.max(...Array.from(loft.positions.subarray(0, 3 * loft.vertexCount)).filter((_, i) => i % 3 === 1)) + 1, sample.z);
          expect(below.found).toBe(true); expect(below.hit.inWater).toBe(true);
          expect(below.hit.floorY).toBe(floor); expect(Number.isFinite(below.hit.life)).toBe(true);
          expect(above.found).toBe(true); expect(above.hit.inWater).toBe(false);
          expect(above.hit.ceilingY).toBeNaN(); expect(above.hit.ceilingTopY).toBeNaN();
          const actualCrossings = indexedCrossings(loft, sample.x, sample.z);
          expect(actualCrossings.length).toBeGreaterThan(0);
          expect(actualCrossings.some(crossing => crossing.triangle === sample.triangle)).toBe(true);
          // No epsilon around thin water/air layers: their actual intersection midpoints define each query.
          const ys = [actualCrossings[0].y - 1, actualCrossings[actualCrossings.length - 1].y + 1];
          let coincidentPlanes = 0, unrepresentableMidpoints = 0;
          for (let i = 1; i < actualCrossings.length; i++) {
            const a = actualCrossings[i - 1].exact, b = actualCrossings[i].exact;
            if (exactCompare(a, b) === 0) { coincidentPlanes++; continue; }
            const midpoint = Number(a.numerator * b.denominator + b.numerator * a.denominator)
              / Number(2n * a.denominator * b.denominator);
            const exactMidpoint = { numerator: exactInteger(midpoint), denominator: BigInt(EXACT_SCALE) };
            if (!(exactCompare(a, exactMidpoint) < 0 && exactCompare(exactMidpoint, b) < 0)) { unrepresentableMidpoints++; continue; }
            ys.push(midpoint);
          }
          const layers: unknown[] = [];
          for (const y of ys) {
            const exactY = { numerator: exactInteger(y), denominator: BigInt(EXACT_SCALE) };
            const aboveCount = actualCrossings.filter(crossing => exactCompare(crossing.exact, exactY) > 0).length;
            const belowCount = actualCrossings.length - aboveCount;
            const inWater = (aboveCount & 1) === 1;
            const answer = pair.query(sample.x, y, sample.z);
            if (answer.found && answer.hit.inWater !== inWater) metrics.independentOracleFirstFailure = {
              label: input.label, row, sample, y, aboveCount, belowCount,
              actualCrossings: actualCrossings.map(({ exact, ...crossing }) => ({ ...crossing, exact: { numerator: String(exact.numerator), denominator: String(exact.denominator) } })), hit: answer.hit,
            };
            expect(answer.found).toBe(inWater || belowCount > 0);
            if (!answer.found) continue;
            expect(answer.hit.inWater).toBe(inWater);
            const surfaceIndex = inWater ? belowCount : belowCount - 1;
            const crossing = actualCrossings[surfaceIndex];
            // Exact containment in the intersected triangle's actual Y range; no arbitrary continuity bound.
            expect(answer.hit.surfaceY).toBeGreaterThanOrEqual(crossing.minimumVertexY);
            expect(answer.hit.surfaceY).toBeLessThanOrEqual(crossing.maximumVertexY);
            expect(Number.isFinite(answer.hit.ceilingY)).toBe(!inWater && aboveCount >= 2);
            expect(Number.isFinite(answer.hit.ceilingTopY)).toBe(!inWater && aboveCount >= 2);
            const f = (sample.x - x) / (xAt(loft, row + 1) - x);
            expect(answer.hit.life).toBe(loft.sliceLife[row] + f * (loft.sliceLife[row + 1] - loft.sliceLife[row]));
            layers.push({ y, aboveCount, belowCount, hit: answer.hit,
              independentRaySurfaceResidual: answer.hit.surfaceY - crossing.y,
              independentRayFloorResidual: answer.hit.floorY - actualCrossings[0].y });
          }
          evidence.push({ row, zeroX: x, triangle: sample.triangle, vertices: sample.vertices, query: sample,
            positiveInterpolatedWeight: loft.sliceWeight[row + 1] * (sample.x - x) / (xAt(loft, row + 1) - x), floor, below: below.hit, above: above.hit,
            independentActualIndexCrossings: actualCrossings.map(({ exact, ...crossing }) => ({ ...crossing,
              exact: { numerator: String(exact.numerator), denominator: String(exact.denominator) } })),
            coincidentPlanes, unrepresentableMidpoints, layers });
        }
      }
      expect(pair.state.normalReady.some(Boolean)).toBe(true);
      expect(input.records).toEqual(before);
      (metrics.queries as unknown[]).push({ label: input.label, slices: loft.sliceCount, retirement: loft.cSampling!.retirement, rows, evidence,
        allHitFieldsExact: true, actualPreparedPositionsAndSelectedNormalsExact: true, packetWordsUnchanged: true });
    });
  }

  it('preserves RAW query/floor fields against the frozen stable-X parent at captured and controlled geometry', () => {
    let queries = 0, hits = 0;
    for (const records of [controlled(), ...captured.epochs.map(epoch => packet(epoch.packetRows))]) {
      const before = records.slice(), next = new SweptContact(new ProfileLibrary(cases), c.slope);
      const old = new ParentContact(new ParentLibrary(cases), c.slope);
      next.update(records, records.length / FRONT_STRIDE, STILL, () => STILL);
      old.update(records, records.length / FRONT_STRIDE, STILL, () => STILL);
      expect(next.last!).toEqual(old.last!);
      const loft = next.last!;
      const xs = [xAt(loft, 0) - 1, ...Array.from({ length: loft.sliceCount - 1 }, (_, row) => (xAt(loft, row) + xAt(loft, row + 1)) / 2), xAt(loft, loft.sliceCount - 1) + 1];
      for (const x of xs) for (const z of [-150, -140, -135, -130, -125, -120, -100, -60]) {
        expect(Object.is(next.floorAt(x, z), old.floorAt(x, z))).toBe(true);
        for (const y of [STILL - 1, STILL, STILL + 1, STILL + 4, STILL + 8]) {
          const a = createContactHit(), b = createContactHit(), found = next.query(x, y, z, a);
          expect(found).toBe(old.query(x, y, z, b));
          for (const key of Object.keys(a) as (keyof ContactHit)[]) expect(Object.is(a[key], b[key]), key).toBe(true);
          queries++; if (found) hits++;
        }
      }
      expect(records).toEqual(before);
    }
    expect(hits).toBeGreaterThan(0);
    metrics.raw = { fixtures: 3, queries, hits, completeLoftWordsAndMetadataExact: true, queryAndFloorAllFieldsExact: true, packetWordsUnchanged: true };
  });
});
