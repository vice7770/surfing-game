import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { PhysicalSurfWater } from '../source/src/physics/PhysicalSurfWater';
import { createWaterSample } from '../source/src/physics/SurfWater';
import { ShallowWaterSolver, uniformEdges } from '../source/src/wave/ShallowWaterSolver';
import { FRONT_FIELD, FRONT_STRIDE } from '../source/src/wave/barrel/frontRecords';
import { readBarrelCases } from '../source/src/wave/barrel/nodeBarrelCases';
import { decodeCase } from '../source/src/wave/barrel/profileFormat';
import { PROFILE_POINTS, ProfileLibrary } from '../source/src/wave/barrel/ProfileLibrary';
import { createContactHit, SweptContact } from '../source/src/wave/barrel/sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from '../source/src/wave/barrel/sweptLoft';
import { ProfileLibrary as ParentLibrary } from '../../tube-board-raw-normal-native-20261005/source/src/wave/barrel/ProfileLibrary';
import { SweptLoft as ParentLoft } from '../../tube-board-raw-normal-native-20261005/source/src/wave/barrel/sweptLoft';

const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const parentLibrary = new ParentLibrary(cases, { geometry: 'bounded-C' });
const STILL = 0.5;
const waters = [
  () => STILL,
  (x: number, z: number) => STILL + 0.12 * (z + 100) + 0.03 * (x - 4.5),
  (x: number, z: number) => STILL - 0.09 * (z + 100) + 0.22 * Math.sin(0.8 * (z + 100)) + 0.04 * Math.cos(x),
];
const metrics = {
  sourceOnlyFixture: true,
  zeroFormationFixtures: 0,
  zeroFormationQueries: 0,
  ordinaryWaterSamples: 0,
  exactParentLofts: 0,
  exactParentArrays: 0,
  rawProviderLofts: 0,
  partialFormation: [] as unknown[],
  failures: [] as unknown[],
};
afterAll(() => {
  if (process.env.FORMATION_METRICS) writeFileSync(process.env.FORMATION_METRICS, JSON.stringify(metrics, null, 2) + '\n');
});

function records(height: number, tau: (k: number) => number): Float32Array {
  const data = new Float32Array(9 * FRONT_STRIDE);
  for (let k = 0; k < 9; k += 1) {
    const o = k * FRONT_STRIDE;
    data[o + FRONT_FIELD.x] = k + 0.5; data[o + FRONT_FIELD.z] = -100;
    data[o + FRONT_FIELD.front] = 1; data[o + FRONT_FIELD.sigma] = k;
    data[o + FRONT_FIELD.footHeight] = height; data[o + FRONT_FIELD.footDepth] = 7;
    data[o + FRONT_FIELD.tau] = tau(k); data[o + FRONT_FIELD.throwZ] = -100;
    data[o + FRONT_FIELD.pace] = 0;
  }
  return data;
}

type ResultArray = Float32Array | Int32Array | Uint32Array | Uint8Array;
function activeCount(field: string, result: LoftResult): number {
  if (field === 'indices') return result.indexCount;
  if (field.startsWith('slice')) return result.sliceCount;
  if (field === 'positions' || field === 'normals') return 3 * result.vertexCount;
  if (field === 'throat') return 4 * result.vertexCount;
  return result.vertexCount;
}
function sameLoftWords(actual: LoftResult, expected: LoftResult): void {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  let arrays = 0;
  for (const [field, value] of Object.entries(actual)) {
    const prior = expected[field as keyof LoftResult];
    if (ArrayBuffer.isView(value)) {
      const a = value as ResultArray, b = prior as ResultArray;
      expect(a.constructor).toBe(b.constructor);
      const n = activeCount(field, actual);
      const aBytes = new Uint8Array(a.buffer, a.byteOffset, n * a.BYTES_PER_ELEMENT);
      const bBytes = new Uint8Array(b.buffer, b.byteOffset, n * b.BYTES_PER_ELEMENT);
      expect(aBytes, field).toEqual(bBytes);
      arrays += 1;
    } else expect(value, field).toEqual(prior);
  }
  expect(arrays).toBe(37);
  metrics.exactParentLofts += 1;
  metrics.exactParentArrays += arrays;
}

// These two geometric witnesses inspect the actual F32 vertices and triangles,
// independently of the formation-weight arithmetic under test.
function crossedOwned(loft: LoftResult): { row: number; segments: [number, number] }[] {
  const p = loft.positions, failures: { row: number; segments: [number, number] }[] = [];
  for (let s = 0; s < loft.sliceCount; s += 1) {
    if (loft.sliceWeight[s] === 0) continue;
    const o = s * LOFT_SAMPLES + LOFT.extensionSamples;
    const orient = (a: number, b: number, c: number) =>
      (p[3 * (o + b) + 2] - p[3 * (o + a) + 2]) * (p[3 * (o + c) + 1] - p[3 * (o + a) + 1]) -
      (p[3 * (o + b) + 1] - p[3 * (o + a) + 1]) * (p[3 * (o + c) + 2] - p[3 * (o + a) + 2]);
    for (let i = 0; i + 1 < PROFILE_POINTS; i += 1) for (let j = i + 2; j + 1 < PROFILE_POINTS; j += 1) {
      if (!(i + 1 >= 32 && i <= 112 || j + 1 >= 32 && j <= 112)) continue;
      const a = orient(i, i + 1, j), b = orient(i, i + 1, j + 1), c = orient(j, j + 1, i), d = orient(j, j + 1, i + 1);
      if (a * b < -1e-12 && c * d < -1e-12) failures.push({ row: s, segments: [i, j] });
    }
  }
  return failures;
}
function column(loft: LoftResult, strip: number, x: number, z: number): { y: number; layer: number; segment: number }[] {
  const p = loft.positions, hits: { y: number; layer: number; segment: number }[] = [];
  let base = 0;
  for (let s = 0; s < strip; s += 1) if (loft.sliceJoined[s]) base += 6 * (LOFT_SAMPLES - 1);
  for (let j = 0; j + 1 < LOFT_SAMPLES; j += 1) for (const offset of [0, 3]) {
    const t = base + 6 * j + offset, u = loft.indices[t], v = loft.indices[t + 1], w = loft.indices[t + 2];
    const ax = p[3 * u], az = p[3 * u + 2], bx = p[3 * v], bz = p[3 * v + 2], cx = p[3 * w], cz = p[3 * w + 2];
    const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (Math.abs(area) < 1e-12) continue;
    const vb = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / area;
    const vc = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / area;
    if (vb <= 1e-9 || vc <= 1e-9 || vb + vc >= 1 - 1e-9) continue;
    const i = j - LOFT.extensionSamples;
    hits.push({ y: (1 - vb - vc) * p[3 * u + 1] + vb * p[3 * v + 1] + vc * p[3 * w + 1], layer: i >= 88 ? 2 : i >= 64 ? 1 : i >= 32 ? 0 : -1, segment: i });
  }
  return hits.sort((a, b) => a.y - b.y);
}
function sameGeometry(a: LoftResult, b: LoftResult): void {
  expect(b.sliceCount).toBe(a.sliceCount); expect(b.vertexCount).toBe(a.vertexCount); expect(b.indexCount).toBe(a.indexCount);
  for (const field of ['positions', 'normals', 'indices', 'mask', 'lift', 'sliceWeight'] as const) {
    const n = activeCount(field, a);
    expect(b[field].subarray(0, n), field).toEqual(a[field].subarray(0, n));
  }
}

describe('true bounded-C formation activation', () => {
  it('leaves zero-formation drawing on ordinary water with no mask, lift or contact ownership', () => {
    const profile = new Float32Array(2 * PROFILE_POINTS);
    for (const c of cases) {
      const height = Math.fround(c.nonlinearity * 7), query = { slope: c.slope, footHeight: height, footDepth: 7 };
      const times = library.profileTimes(query);
      for (const seconds of [-0.1 * times.clearSeconds, 0]) for (const heightAt of waters) {
        const data = records(height, () => seconds), before = data.slice();
        expect(library.profileAt({ ...query, seconds: data[FRONT_FIELD.tau] }, profile).analytic!.formation).toBe(0);
        const draw = new SweptLoft(library, c.slope).build(data, 9, STILL, heightAt);
        expect(draw.sliceCount).toBeGreaterThan(4); expect(draw.indexCount).toBeGreaterThan(0);
        expect(draw.sliceWeight.subarray(0, draw.sliceCount).every(v => v === 0)).toBe(true);
        expect(draw.lift.subarray(0, draw.vertexCount).every(v => v === 0)).toBe(true);
        expect(draw.mask.subarray(0, draw.vertexCount).every(v => v === 0)).toBe(true);
        let heightError = 0;
        for (let v = 0; v < draw.vertexCount; v += 1) {
          const o = 3 * v;
          heightError = Math.max(heightError, Math.abs(draw.positions[o + 1] - heightAt(draw.positions[o], draw.positions[o + 2])));
        }
        // The height sampler receives pre-store coordinates; this bounds only its final F32 storage roundoff.
        expect(heightError).toBeLessThan(5e-6);
        const contact = new SweptContact(library, c.slope); contact.update(data, 9, STILL, heightAt);
        const zValues = Array.from(draw.positions.subarray(0, 3 * draw.vertexCount)).filter((_, i) => i % 3 === 2);
        const minZ = Math.min(...zValues), maxZ = Math.max(...zValues);
        for (const x of [2.371, 4.371, 6.371]) for (let k = 0; k < 9; k += 1) {
          const z = minZ + (k + 0.371) / 9 * (maxZ - minZ);
          expect(contact.floorAt(x, z)).toBeNaN();
          for (const y of [heightAt(x, z) - 0.2, heightAt(x, z) + 0.2]) {
            expect(contact.query(x, y, z, createContactHit())).toBe(false); metrics.zeroFormationQueries += 1;
          }
        }
        expect(data).toEqual(before); metrics.zeroFormationFixtures += 1;
      }
    }
  }, 30000);

  it('preserves exact ordinary PhysicalSurfWater samples through the real deferred worker owner at formation zero', () => {
    const c = cases.find(c => c.id === 'pad19-a30-l12')!;
    const query = { slope: c.slope, footHeight: Math.fround(c.nonlinearity * 7), footDepth: 7 };
    const times = library.profileTimes(query);
    const solver = new ShallowWaterSolver({ nx: 32, xMin: -12, dx: 1, zEdges: uniformEdges(-135, -75, 60), xBoundary: 'open' }, () => 7, { waterLevel: STILL });
    for (let iz = 0; iz < solver.nz; iz += 1) for (let ix = 0; ix < solver.nx; ix += 1) {
      const i = iz * solver.nx + ix, x = solver.xCenters[ix], z = solver.zCenters[iz];
      solver.h[i] += 0.08 * Math.sin(0.3 * x) + 0.12 * Math.cos(0.4 * (z + 100));
      solver.qx[i] = solver.h[i] * 0.3; solver.qz[i] = solver.h[i] * 1.4;
    }
    const ordinary = new PhysicalSurfWater(solver, { peakPeriod: 19 });
    const owner = SweptContact.forOrdinaryWorker(library, c.slope);
    const water = new PhysicalSurfWater(solver, { peakPeriod: 19, swept: owner.queries });
    for (const seconds of [-0.1 * times.clearSeconds, 0]) {
      owner.updateFromPlainSurface(records(query.footHeight, () => seconds), 9, STILL, ordinary);
      for (const x of [2.371, 4.371, 6.371]) for (const z of [-106.7, -102.3, -100, -98.7, -96.2]) {
        const level = ordinary.surfaceAt(x, z);
        expect(water.surfaceAt(x, z)).toBe(level);
        for (const y of [level - 0.2, level + 0.2, level + 1]) {
          expect(water.sampleAt(x, y, z, createWaterSample())).toEqual(ordinary.sampleAt(x, y, z, createWaterSample()));
          metrics.ordinaryWaterSamples += 1;
        }
      }
    }
  });

  it('retains every active parent loft word once formation is one, including drawing, eager contact and deferred contact', () => {
    const profile = new Float32Array(2 * PROFILE_POINTS);
    for (const c of cases) {
      const height = Math.fround(c.nonlinearity * 7), query = { slope: c.slope, footHeight: height, footDepth: 7 };
      const times = library.profileTimes(query);
      for (const age of [times.clearSeconds + 0.2 * (times.touchdownSeconds - times.clearSeconds), times.touchdownSeconds + 0.4 * times.collapseSeconds]) for (const heightAt of waters) {
        const data = records(height, k => age + 0.001 * (k - 4)), before = data.slice();
        for (let k = 0; k < 9; k += 1) expect(library.profileAt({ ...query, seconds: data[k * FRONT_STRIDE + FRONT_FIELD.tau] }, profile).analytic!.formation).toBe(1);
        for (const contact of [false, true]) {
          const actual = new SweptLoft(library, c.slope, { contact }).build(data, 9, STILL, heightAt);
          const prior = new ParentLoft(parentLibrary, c.slope, { contact }).build(data, 9, STILL, heightAt);
          sameLoftWords(actual, prior);
        }
        const deferred = SweptLoft.forContactQueries(library, c.slope), parentDeferred = ParentLoft.forContactQueries(parentLibrary, c.slope);
        const actual = deferred.build(data, 9, STILL, heightAt), prior = parentDeferred.build(data, 9, STILL, heightAt);
        for (let row = 0; row < actual.sliceCount; row += 1) { deferred.prepareRow(row); parentDeferred.prepareRow(row); }
        for (let v = 0; v < actual.vertexCount; v += 1) { deferred.prepareNormal(v); parentDeferred.prepareNormal(v); }
        sameLoftWords(actual, prior);
        expect(data).toEqual(before);
      }
    }
  }, 60000);

  it('keeps finite ordered partially formed contours and positive air clearance through actual drawing/contact triangles', () => {
    let totalAir = 0;
    const profile = new Float32Array(2 * PROFILE_POINTS);
    for (const c of cases) {
      const height = Math.fround(c.nonlinearity * 7), query = { slope: c.slope, footHeight: height, footDepth: 7 };
      const times = library.profileTimes(query);
      for (const fraction of [0.2, 0.5, 0.8]) for (const [waterIndex, heightAt] of waters.entries()) {
        const data = records(height, k => times.clearSeconds * (fraction + 0.015 * (k - 4))), before = data.slice();
        const draw = new SweptLoft(library, c.slope).build(data, 9, STILL, heightAt);
        expect(draw.positions.subarray(0, 3 * draw.vertexCount).every(Number.isFinite)).toBe(true);
        expect(draw.normals.subarray(0, 3 * draw.vertexCount).every(Number.isFinite)).toBe(true);
        const crossed = crossedOwned(draw);
        if (crossed.length) metrics.failures.push({ case: c.id, fraction, waterIndex, crossed });
        const contact = new SweptContact(library, c.slope); contact.update(data, 9, STILL, heightAt);
        sameGeometry(draw, contact.last!);
        const deferred = SweptLoft.forContactQueries(library, c.slope), last = deferred.build(data, 9, STILL, heightAt);
        for (let row = 0; row < last.sliceCount; row += 1) deferred.prepareRow(row);
        for (let v = 0; v < last.vertexCount; v += 1) deferred.prepareNormal(v);
        sameGeometry(contact.last!, last);
        const formations = Array.from(draw.sliceTau.subarray(0, draw.sliceCount), seconds => library.profileAt({ ...query, seconds }, profile).analytic!.formation);
        expect(formations.every(g => g > 0 && g < 1)).toBe(true);
        let airColumns = 0, minClearance = Infinity, minThickness = Infinity;
        for (let s = 0; s + 1 < draw.sliceCount; s += 1) {
          if (!draw.sliceJoined[s] || draw.sliceWeight[s] === 0 || draw.sliceWeight[s + 1] === 0) continue;
          const o = s * LOFT_SAMPLES, next = o + LOFT_SAMPLES;
          const x = draw.positions[3 * o] + 0.371 * (draw.positions[3 * next] - draw.positions[3 * o]);
          const stops = [...new Set(Array.from({ length: LOFT_SAMPLES }, (_, j) => draw.positions[3 * (o + j) + 2]))].sort((a, b) => a - b);
          for (let k = 0; k + 1 < stops.length; k += 1) {
            const z = (stops[k] + stops[k + 1]) / 2, hits = column(draw, s, x, z);
            const top = hits.filter(h => h.layer === 0), under = hits.filter(h => h.layer === 1), lower = hits.filter(h => h.layer === 2);
            if (!top.length || !under.length || !lower.length) continue;
            const penetration = Math.max(Math.max(...lower.map(h => h.y)) - Math.min(...under.map(h => h.y)), Math.max(...under.map(h => h.y)) - Math.min(...top.map(h => h.y)));
            if (penetration > 1e-5) {
              metrics.failures.push({ case: c.id, fraction, waterIndex, strip: s, ages: [draw.sliceTau[s], draw.sliceTau[s + 1]], weights: [draw.sliceWeight[s], draw.sliceWeight[s + 1]], x, z, hits, penetration });
              continue;
            }
            if (hits.length !== 3 || hits[1].y - hits[0].y < 1e-4 || hits[2].y - hits[1].y < 1e-4) continue;
            const hit = createContactHit();
            expect(contact.query(x, (hits[0].y + hits[1].y) / 2, z, hit)).toBe(true);
            expect(hit.inWater).toBe(false);
            expect(hit.floorY).toBeCloseTo(hits[0].y, 5);
            expect(hit.ceilingY).toBeCloseTo(hits[1].y, 5);
            expect(hit.ceilingTopY).toBeCloseTo(hits[2].y, 5);
            expect(Math.hypot(hit.normalX, hit.normalY, hit.normalZ)).toBeCloseTo(1, 10);
            minClearance = Math.min(minClearance, hit.ceilingY - hit.floorY);
            minThickness = Math.min(minThickness, hit.ceilingTopY - hit.ceilingY);
            airColumns += 1;
          }
        }
        metrics.partialFormation.push({ case: c.id, fraction, waterIndex, minFormation: Math.min(...formations), maxFormation: Math.max(...formations), airColumns, minClearance: Number.isFinite(minClearance) ? minClearance : null, minThickness: Number.isFinite(minThickness) ? minThickness : null });
        // Late partial formation must have actual air under a roof in every case/water fixture.
        // Earlier fractions are surveyed too; their roof may not yet have overturned.
        if (fraction === 0.8) expect(airColumns, JSON.stringify({ case: c.id, fraction, waterIndex })).toBeGreaterThan(0);
        if (airColumns > 0) { expect(minClearance).toBeGreaterThan(0); expect(minThickness).toBeGreaterThan(0); }
        totalAir += airColumns;
        expect(data).toEqual(before);
      }
    }
    expect(metrics.failures).toEqual([]);
    expect(totalAir).toBeGreaterThan(100);
  }, 60000);

  it('keeps the non-C provider exact at all sampled ages', () => {
    const raw = new ProfileLibrary(cases), parentRaw = new ParentLibrary(cases);
    const c = cases.find(c => c.id === 'pad19-a30-l12')!, height = Math.fround(c.nonlinearity * 7);
    const times = raw.profileTimes({ slope: c.slope, footHeight: height, footDepth: 7 });
    for (const age of [-0.1 * times.touchdownSeconds, 0, 0.8 * times.touchdownSeconds]) for (const heightAt of waters) {
      const data = records(height, () => age);
      for (const contact of [false, true]) {
        sameLoftWords(new SweptLoft(raw, c.slope, { contact }).build(data, 9, STILL, heightAt), new ParentLoft(parentRaw, c.slope, { contact }).build(data, 9, STILL, heightAt));
        metrics.rawProviderLofts += 1;
      }
    }
  }, 30000);
});
