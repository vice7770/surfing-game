import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { CrashCurve, createCrashSlice } from './crashCurve';
import type { FrontPoint } from './BreakingFront';
import { FRONT_FIELD, FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type FrameBlend } from './ProfileLibrary';
import { sheetAcross, sheetTablesLookup } from './lipSheet';
import { createContactHit, SweptContact } from './sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';

const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const STILL = 0.5;
const waters = [
  () => STILL,
  (x: number, z: number) => STILL + 0.12 * (z + 100) + 0.03 * (x - 4.5),
  (x: number, z: number) => STILL - 0.09 * (z + 100) + 0.22 * Math.sin(0.8 * (z + 100)) + 0.04 * Math.cos(x),
];
function records(height: number, tau: (k: number) => number, n = 9): Float32Array {
  const data = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    data[o + FRONT_FIELD.x] = k + 0.5; data[o + FRONT_FIELD.z] = -100;
    data[o + FRONT_FIELD.front] = 1; data[o + FRONT_FIELD.sigma] = k;
    data[o + FRONT_FIELD.footHeight] = height; data[o + FRONT_FIELD.footDepth] = 7;
    data[o + FRONT_FIELD.tau] = tau(k); data[o + FRONT_FIELD.throwZ] = -100;
    data[o + FRONT_FIELD.pace] = 0;
  }
  return data;
}
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
function column(loft: LoftResult, strip: number, x: number, z: number): { y: number; layer: number; segment: number; vertices: number[] }[] {
  const p = loft.positions, result: { y: number; layer: number; segment: number; vertices: number[] }[] = [];
  let base = 0;
  for (let s = 0; s < strip; s += 1) if (loft.sliceJoined[s]) base += 6 * (LOFT_SAMPLES - 1);
  for (let j = 0; j + 1 < LOFT_SAMPLES; j += 1) for (const offset of [0, 3]) {
    const t = base + 6 * j + offset;
    const u = loft.indices[t], v = loft.indices[t + 1], w = loft.indices[t + 2];
    const ax = p[3 * u], az = p[3 * u + 2], bx = p[3 * v], bz = p[3 * v + 2], cx = p[3 * w], cz = p[3 * w + 2];
    const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (Math.abs(area) < 1e-12) continue;
    const vb = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / area;
    const vc = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / area;
    if (vb <= 1e-9 || vc <= 1e-9 || vb + vc >= 1 - 1e-9) continue;
    const i = j - LOFT.extensionSamples;
    result.push({ y: (1 - vb - vc) * p[3 * u + 1] + vb * p[3 * v + 1] + vc * p[3 * w + 1], layer: i >= 88 ? 2 : i >= 64 ? 1 : i >= 32 ? 0 : -1, segment: i, vertices: [u, v, w] });
  }
  return result.sort((a, b) => a.y - b.y);
}

describe('bounded-C derived consumers', () => {
  it('measures each actual parameter-first sheet and discards stale values in zero-loop states', () => {
    const query = { slope: 1 / 19, footHeight: 2.1, footDepth: 7 };
    const times = library.profileTimes(query);
    const blend = {} as FrameBlend;
    const profile = new Float32Array(2 * PROFILE_POINTS);
    const sheet = { across: new Float32Array(PROFILE_POINTS), back: new Float32Array(PROFILE_POINTS) };
    const exact = { across: new Float32Array(PROFILE_POINTS), back: new Float32Array(PROFILE_POINTS) };
    for (const seconds of [times.clearSeconds, times.touchdownSeconds, times.touchdownSeconds + 0.5 * times.collapseSeconds, 0, times.touchdownSeconds + times.collapseSeconds]) {
      const lookup = library.profileAt({ ...query, seconds }, profile);
      library.frameBlend({ ...query, seconds }, blend);
      expect(blend.analyticProfile).toEqual(profile);
      const formed = sheetTablesLookup(blend, sheet);
      exact.across.fill(0); exact.back.fill(0);
      const expected = lookup.analytic!.sheetExists ? sheetAcross(profile, lookup.scale, exact.across, exact.back) : 0;
      expect(formed).toBe(expected); expect(sheet).toEqual(exact);
      if (!lookup.analytic!.sheetExists) expect(sheet.across.every(v => v === 0)).toBe(true);
    }
  });

  it('keeps final core contours clear across formation, sealing and retirement with live water and end weights', () => {
    const failures: unknown[] = [];
    for (const c of cases) {
      const height = c.nonlinearity * 7, query = { slope: c.slope, footHeight: height, footDepth: 7 };
      const times = library.profileTimes(query), formed = times.clearSeconds, impact = times.touchdownSeconds;
      for (const age of [-0.1 * formed, 0, 0.2 * formed, formed, 0.8 * impact, impact - 1e-5, impact, impact + 0.5 * times.collapseSeconds, impact + 0.95 * times.collapseSeconds]) {
        for (const [waterIndex, heightAt] of waters.entries()) {
          const loft = new SweptLoft(library, c.slope, { sheet: false }).build(records(height, () => age), 9, STILL, heightAt);
          expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
          const crossed = crossedOwned(loft);
          if (crossed.length) failures.push({ case: c.id, age, waterIndex, count: crossed.length, first: crossed[0] });
        }
      }
    }
    expect(failures).toEqual([]);
  }, 30000);

  it('uses identical final drawing/contact geometry and ordered air columns with neighboring different ages', () => {
    let checkedAir = 0;
    const failures: { case: string; center: number; waterIndex: number; strip: number; sigma: number[]; ages: number[]; weights: number[]; x: number; z: number; layers: { y: number; layer: number }[]; penetration: number }[] = [];
    let firstVertices: unknown;
    for (const c of cases) {
      const query = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 }, times = library.profileTimes(query);
      for (const center of [0.8 * times.clearSeconds, times.clearSeconds, times.touchdownSeconds - 0.03, times.touchdownSeconds + 0.4 * times.collapseSeconds]) {
      for (const [waterIndex, heightAt] of waters.entries()) {
        const data = records(query.footHeight, k => center + 0.006 * (k - 4));
        const draw = new SweptLoft(library, query.slope).build(data, 9, STILL, heightAt);
        expect(crossedOwned(draw)).toEqual([]);
        const contact = new SweptContact(library, query.slope);
        try { contact.update(data, 9, STILL, heightAt); }
        catch (error) { throw new Error(JSON.stringify({ case: c.id, query, center, waterIndex, firstAge: data[FRONT_FIELD.tau] }) + ': ' + String(error)); }
        expect(contact.last!.positions.subarray(0, 3 * draw.vertexCount)).toEqual(draw.positions.subarray(0, 3 * draw.vertexCount));
        expect(contact.last!.indices.subarray(0, draw.indexCount)).toEqual(draw.indices.subarray(0, draw.indexCount));
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
              failures.push({ case: c.id, center, waterIndex, strip: s, sigma: [draw.sliceSigma[s], draw.sliceSigma[s + 1]], ages: [draw.sliceTau[s], draw.sliceTau[s + 1]], weights: [draw.sliceWeight[s], draw.sliceWeight[s + 1]], x, z, layers: hits, penetration });
              firstVertices ??= { rows: [s, s + 1].map(row => ({ row, vertices: Array.from(draw.positions.subarray(3 * row * LOFT_SAMPLES, 3 * (row + 1) * LOFT_SAMPLES)) })), inputRecords: Array.from(data), water: waterIndex, stillLevel: STILL };
              continue;
            }
            if (hits.length !== 3 || hits[1].y - hits[0].y < 1e-4 || hits[2].y - hits[1].y < 1e-4) continue;
            const hit = createContactHit();
            expect(contact.query(x, (hits[0].y + hits[1].y) / 2, z, hit)).toBe(true);
            expect(hit.inWater).toBe(false);
            expect(hit.floorY).toBeCloseTo(hits[0].y, 5);
            expect(hit.ceilingY).toBeCloseTo(hits[1].y, 5);
            expect(hit.ceilingTopY).toBeCloseTo(hits[2].y, 5);
            checkedAir += 1;
          }
        }
      }
    }
    }
    if (process.env.CONSUMER_METRICS) writeFileSync(process.env.CONSUMER_METRICS, JSON.stringify({ failures, firstVertices, checkedAir, zeroWeightRowsArePureWaterAndNotClaimedLiftedContours: true }, null, 2) + '\n');
    expect({ count: failures.length, first: failures[0], maxPenetration: Math.max(0, ...failures.map(f => f.penetration)) }).toEqual({ count: 0, first: undefined, maxPenetration: 0 });
    expect(checkedAir).toBeGreaterThan(100);
  }, 30000);

  it('preserves the floor plateau allocation and exact cap edge through the real and deferred final meshes', () => {
    let paired = 0;
    const profile = new Float32Array(2 * PROFILE_POINTS);
    for (const c of cases) {
      const height = Math.fround(c.nonlinearity * 7), query = { slope: c.slope, footHeight: height, footDepth: 7 };
      const times = library.profileTimes(query);
      // Start just after impact: F32 tau may round a mathematical exact-impact input to a still-airborne cap.
      for (const phase of [0.001, 0.25, 0.5, 0.95]) for (const heightAt of waters) {
        const age = Math.fround(times.touchdownSeconds + phase * times.collapseSeconds);
        const lookup = library.profileAt({ ...query, seconds: age }, profile);
        if (!lookup.analytic!.sheetExists) continue;
        expect(profile[2 * LANDMARK.lip + 1]).toBe(profile[2 * 104 + 1]);
        expect(profile[2 * LANDMARK.lip]).toBeGreaterThanOrEqual(profile[2 * 103]);
        expect(profile[2 * LANDMARK.lip]).toBeLessThanOrEqual(profile[2 * 105]);
        const data = records(height, () => age);
        const draw = new SweptLoft(library, c.slope).build(data, 9, STILL, heightAt);
        const deferred = SweptLoft.forContactQueries(library, c.slope), last = deferred.build(data, 9, STILL, heightAt);
        for (let row = 0; row < draw.sliceCount; row += 1) {
          deferred.prepareRow(row);
          if (draw.sliceWeight[row] === 0) continue;
          const cap = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
          const floor = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + 104);
          expect(draw.positions.subarray(cap, cap + 3)).toEqual(draw.positions.subarray(floor, floor + 3));
          paired += 1;
        }
        expect(last.positions.subarray(0, 3 * draw.vertexCount)).toEqual(draw.positions.subarray(0, 3 * draw.vertexCount));
        expect(last.indices.subarray(0, draw.indexCount)).toEqual(draw.indices.subarray(0, draw.indexCount));
      }
    }
    expect(paired).toBeGreaterThan(500);
  }, 30000);

  it('separates zero-loop launch air, prospective water, actual cap-floor contact and continuing fluid flow', () => {
    const c = cases.find(c => c.id === 'pad19-a30-l12')!;
    const query = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 };
    const times = library.profileTimes(query);
    const points: FrontPoint[] = Array.from({ length: 9 }, (_, k) => ({ id: k, front: 1, column: k, sigma: k,
      x: k + 0.5, z: -100, b: 0, height: 2, joined: 0, depth: 3, throwDepth: 2.5, crestDepth: 2,
      thrown: 0, throwZ: -100, footHeight: query.footHeight, footDepth: 7, broke: 0, tau: 0, fresh: null, seen: 0 }));
    const curve = new CrashCurve(library, c.slope);
    const initial = curve.slice(points, 0, 9, 4, STILL, waters[0], createCrashSlice());
    expect(initial.analytic).toBe(true); expect(initial.voidArea).toBe(0); expect(initial.jetArea).toBe(0);
    expect(initial.prospectiveJetArea).toBeGreaterThan(0);
    const growing = curve.slice(points, 0, 9, 4, STILL, waters[0], createCrashSlice(), { tau: times.clearSeconds });
    expect(growing.voidArea).toBeGreaterThan(0); expect(growing.voidHeight).toBeGreaterThan(0);
    for (const seconds of [times.touchdownSeconds, times.touchdownSeconds + 0.5 * times.collapseSeconds]) {
      for (const heightAt of waters) {
        for (const p of points) p.tau = seconds;
        const data = new Float32Array(9 * FRONT_STRIDE); writeFrontRecords(points, data);
        const draw = new SweptLoft(library, c.slope).build(data, 9, STILL, heightAt);
        const slice = curve.slice(points, 0, 9, 4, STILL, heightAt, createCrashSlice());
        const row = Array.from(draw.sliceSigma.subarray(0, draw.sliceCount)).indexOf(4);
        const cap = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.lip);
        expect(slice.tipY).toBeCloseTo(draw.positions[cap + 1], 5);
        expect(slice.landY).toBeCloseTo(slice.tipY, 5);
      }
    }
    const profile = new Float32Array(2 * PROFILE_POINTS);
    const resting = library.profileAt({ ...query, seconds: times.touchdownSeconds + 0.5 * times.collapseSeconds }, profile);
    expect(resting.tipAlong).toBe(0); expect(resting.tipUp).toBe(0);
    const motion = curve.jetMotion(points[4], { tipAlong: 0, tipUp: 0, crestSpeed: 0 });
    expect(motion.tipUp).toBeLessThan(0);
    const retired = curve.slice(points, 0, 9, 4, STILL, waters[0], createCrashSlice(), { tau: times.touchdownSeconds + times.collapseSeconds });
    expect(retired.voidArea).toBe(0); expect(retired.voidHeight).toBe(0);
  });
});
