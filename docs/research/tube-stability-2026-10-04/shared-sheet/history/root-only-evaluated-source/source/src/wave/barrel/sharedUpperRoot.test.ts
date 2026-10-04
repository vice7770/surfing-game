import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boundedCParameters, blendBoundedCParameters, sampleBoundedC, type BoundedCParameters, type Vec2 } from './boundedCProfile';
import { pairUpperRoot } from './sharedUpperRoot';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { ProfileLibrary } from './ProfileLibrary';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';

const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const oldReport = JSON.parse(readFileSync('/private/tmp/tube-bounded-c-shared-seam-20261004/fixed-query-inputs.json', 'utf8')) as {
  actual: PyRow[]; heldIndices: Record<string, number>;
  phaseGrid: (PyRow & { case: string })[]; crossCaseGridAll: (PyRow & { cases: string[]; share: number })[];
};
type PyRow = { params: { A: Vec2; T: Vec2; ct: Vec2; tt: Vec2; TD: number; tau: number }; rawPolyline?: { point: number; q: number; y: number }[] };
const fromPy = (r: PyRow): BoundedCParameters => ({ crest: r.params.A, toe: r.params.T, incoming: r.params.ct,
  outgoing: r.params.tt, authoredTD: r.params.TD, tau: r.params.tau });
const golden = JSON.parse(readFileSync('/private/tmp/tube-bounded-c-precision-v4-fixed-20261004/port-reference.json', 'utf8')) as {
  rawBlocks: Record<string, number[]>; precision522: { block: string; sample: string; params: BoundedCParameters }[];
};
const frame = (c: typeof cases[number], f: number) => c.frames.slice(256 * f, 256 * (f + 1));
const blend = (a: Float32Array, b: Float32Array, t: number) => Float32Array.from(a, (v, i) => v + t * (b[i] - v));

function crossings(p: Float32Array): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < 127; i += 1) for (let j = i + 2; j < 127; j += 1) {
    const ax = p[2 * i], ay = p[2 * i + 1], dx = p[2 * i + 2] - ax, dy = p[2 * i + 3] - ay;
    const bx = p[2 * j], by = p[2 * j + 1], ex = p[2 * j + 2] - bx, ey = p[2 * j + 3] - by;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((bx - ax) * ey - (by - ay) * ex) / den, u = ((bx - ax) * dy - (by - ay) * dx) / den;
    if (t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9) result.add(`${i}/${j}`);
  }
  return result;
}

function records(height: number, center: number, curved: boolean): Float32Array {
  const data = new Float32Array(9 * FRONT_STRIDE);
  for (let k = 0; k < 9; k += 1) {
    const o = k * FRONT_STRIDE;
    data[o + FRONT_FIELD.x] = k + 0.5; data[o + FRONT_FIELD.z] = -100 + (curved ? 0.02 * (k - 4) ** 2 : 0);
    data[o + FRONT_FIELD.front] = 1; data[o + FRONT_FIELD.sigma] = k;
    data[o + FRONT_FIELD.footHeight] = height; data[o + FRONT_FIELD.footDepth] = 7;
    data[o + FRONT_FIELD.tau] = center + 0.006 * (k - 4); data[o + FRONT_FIELD.throwZ] = data[o + FRONT_FIELD.z];
  }
  return data;
}
const waters = [() => 0.5, (x: number, z: number) => 0.5 + 0.12 * (z + 100) + 0.03 * (x - 4.5),
  (x: number, z: number) => 0.5 - 0.09 * (z + 100) + 0.22 * Math.sin(0.8 * (z + 100)) + 0.04 * Math.cos(x)];

function column(loft: LoftResult, strip: number, x: number, z: number): { y: number; segment: number; vertices: number[] }[] {
  const p = loft.positions, hits: { y: number; segment: number; vertices: number[] }[] = [];
  let base = 0;
  for (let s = 0; s < strip; s += 1) if (loft.sliceJoined[s]) base += 6 * (LOFT_SAMPLES - 1);
  for (let j = 0; j < LOFT_SAMPLES - 1; j += 1) for (const offset of [0, 3]) {
    const t = base + 6 * j + offset, u = loft.indices[t], v = loft.indices[t + 1], w = loft.indices[t + 2];
    const ax = p[3 * u], az = p[3 * u + 2], bx = p[3 * v], bz = p[3 * v + 2], cx = p[3 * w], cz = p[3 * w + 2];
    const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (Math.abs(area) < 1e-12) continue;
    const vb = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / area;
    const vc = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / area;
    if (vb <= 1e-9 || vc <= 1e-9 || vb + vc >= 1 - 1e-9) continue;
    hits.push({ y: (1 - vb - vc) * p[3 * u + 1] + vb * p[3 * v + 1] + vc * p[3 * w + 1], segment: j - LOFT.extensionSamples, vertices: [u, v, w] });
  }
  return hits.sort((a, b) => a.y - b.y);
}

describe('coupled upper-root shared sampling experiment', () => {
  it('evaluates all6447 original/precision queries without new crossings, missing domains or hidden limits', () => {
    const groups: Record<string, { attempted: number; valid: number; failed: number; resolved: number }> = {};
    const failures: unknown[] = [];
    let maximumRoofEnvelopeChange = 0, maximumMaterialDisplacement = 0, maximumRootRadiusReduction = 0, coalescedStations = 0, limitedRoots = 0;
    function check(raw: Float32Array, z: BoundedCParameters, group: string, id: unknown) {
      const stats = groups[group] ??= { attempted: 0, valid: 0, failed: 0, resolved: 0 };
      stats.attempted += 1;
      const before = raw.slice(), out = raw.slice();
      try {
        const original = sampleBoundedC(z, before, false), meta = sampleBoundedC(z, out, false, undefined, true);
        const paired = pairUpperRoot(out, meta);
        if (!out.every(Number.isFinite)) throw Error('nonfinite contour');
        for (let i = 0; i < 128; i += 1) {
          if (i <= 32 || i >= 102 || i >= 60 && i <= 80) {
            if (out[2 * i] !== before[2 * i] || out[2 * i + 1] !== before[2 * i + 1]) throw Error(`changed preserved point${i}`);
          }
          maximumMaterialDisplacement = Math.max(maximumMaterialDisplacement, Math.hypot(out[2 * i] - before[2 * i], out[2 * i + 1] - before[2 * i + 1]));
        }
        const oldPairs = crossings(before), newPairs = [...crossings(out)].filter(p => !oldPairs.has(p));
        if (newPairs.length) throw Error(`new proper crossing pairs${newPairs.join(',')}`);
        if (paired) {
          stats.resolved += 1;
          for (let i = 40; i <= 48; i += 1) {
            const j = 128 - i;
            if (out[2 * i] !== out[2 * j] || out[2 * i + 1] < out[2 * j + 1]) throw Error(`unordered common station${i}/${j}`);
          }
          maximumRoofEnvelopeChange = Math.max(maximumRoofEnvelopeChange, paired.maximumRoofEnvelopeChange);
          coalescedStations += paired.coalescedStations;
          if (meta.rootRadius < original.rootRadius) limitedRoots += 1;
          maximumRootRadiusReduction = Math.max(maximumRootRadiusReduction, original.rootRadius - meta.rootRadius);
        } else if (!out.every((v, i) => v === before[i])) throw Error('changed unresolved v4 contour');
        stats.valid += 1;
      } catch (error) {
        stats.failed += 1;
        failures.push({ group, id, params: z, error: String(error), raw: Array.from(raw), before: Array.from(before), after: Array.from(out) });
      }
    }
    for (const [i, r] of oldReport.actual.entries()) {
      const raw = new Float32Array(256);
      for (const v of r.rawPolyline!) { raw[2 * v.point] = v.q; raw[2 * v.point + 1] = v.y; }
      check(raw, fromPy(r), 'captured5', i);
    }
    for (const c of cases) {
      const n = c.frames.length / 256;
      for (let f = 0; f < n; f += 1) {
        const a = frame(c, f), za = boundedCParameters(a, c.touchdown, c.tauStart + f * c.tauStep);
        check(a, za, 'frames1224', [c.id, f]);
        if (f + 1 < n) {
          const b = frame(c, f + 1), zb = boundedCParameters(b, c.touchdown, c.tauStart + (f + 1) * c.tauStep);
          for (const w of [0.25, 0.5, 0.75]) check(blend(a, b, w), blendBoundedCParameters(za, zb, w), 'adjacent3648', [c.id, f, w]);
        }
      }
    }
    const held = new Map<string, Float32Array>();
    for (const c of cases) {
      const heldIndex = oldReport.heldIndices[c.id];
      expect(heldIndex).toBeDefined(); held.set(c.id, frame(c, heldIndex));
    }
    for (const [i, r] of oldReport.phaseGrid.entries()) check(held.get(r.case)!, fromPy(r), 'phase376', i);
    for (const [i, r] of oldReport.crossCaseGridAll.entries()) check(blend(held.get(r.cases[0])!, held.get(r.cases[1])!, r.share), fromPy(r), 'casePairs672', i);
    for (const r of golden.precision522) check(new Float32Array(golden.rawBlocks[r.block]), r.params, 'precision522', [r.block, r.sample]);
    const receipt = { groups, failures, maximumRoofEnvelopeChange, maximumMaterialDisplacement, maximumRootRadiusReduction, limitedRoots, coalescedStations,
      originalV4CoefficientsUnchanged: true, geometryPhysicallyEquivalent: false, fixedProfilePoints: 128, rowVertices: LOFT_SAMPLES, vertexBudget: LOFT.budget };
    if (process.env.SHARED_ROOT_QUERY_RECEIPT) writeFileSync(process.env.SHARED_ROOT_QUERY_RECEIPT, JSON.stringify(receipt, null, 2) + '\n');
    expect(Object.values(groups).reduce((n, g) => n + g.attempted, 0)).toBe(6447);
    expect({ count: failures.length, first: failures[0] }).toEqual({ count: 0, first: undefined });
  }, 30000);

  it('repairs the exact retained Reef column without changing its input/time/water/weights', () => {
    const old = JSON.parse(readFileSync('/private/tmp/tube-bounded-c-final-mesh-canonical-receipt-20261004.json', 'utf8')) as {
      failures: { case: string; x: number; z: number; strip: number; penetration: number }[];
      firstVertices: { inputRecords: number[]; water: number; stillLevel: number };
    };
    const failure = old.failures[0], c = cases.find(c => c.id === failure.case)!;
    const input = new Float32Array(old.firstVertices.inputRecords);
    const loft = new SweptLoft(library, c.slope).build(input, 9, old.firstVertices.stillLevel, waters[old.firstVertices.water]);
    const hits = column(loft, failure.strip, failure.x, failure.z);
    const top = hits.filter(h => h.segment >= 32 && h.segment < 64), under = hits.filter(h => h.segment >= 64 && h.segment < 88);
    expect(top.length).toBeGreaterThan(0); expect(under.length).toBeGreaterThan(0);
    const signedGap = Math.min(...top.map(h => h.y)) - Math.max(...under.map(h => h.y));
    if (process.env.SHARED_ROOT_EXACT_RECEIPT) writeFileSync(process.env.SHARED_ROOT_EXACT_RECEIPT, JSON.stringify({ originalPenetration: failure.penetration,
      fixedInputRecords: Array.from(input), x: failure.x, z: failure.z, strip: failure.strip, hits, signedGap }, null, 2) + '\n');
    expect(signedGap).toBeGreaterThanOrEqual(0);
  });

  it('shares actual paired triangle footprints and deferred projected datum across straight/curved adjacent-age rows', () => {
    let pairedCells = 0;
    for (const c of cases) {
      const q = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 }, times = library.profileTimes(q);
      for (const center of [0.8 * times.clearSeconds, times.clearSeconds, times.touchdownSeconds - 0.03, times.touchdownSeconds + 0.4 * times.collapseSeconds]) {
        for (const heightAt of waters) for (const curved of [false, true]) {
          const data = records(q.footHeight, center, curved);
          const draw = new SweptLoft(library, c.slope).build(data, 9, 0.5, heightAt);
          const deferred = SweptLoft.forContactQueries(library, c.slope), last = deferred.build(data, 9, 0.5, heightAt);
          for (let row = 0; row < draw.sliceCount; row += 1) deferred.prepareRow(row);
          expect(last.positions.subarray(0, 3 * draw.vertexCount)).toEqual(draw.positions.subarray(0, 3 * draw.vertexCount));
          expect(last.indices.subarray(0, draw.indexCount)).toEqual(draw.indices.subarray(0, draw.indexCount));
          expect(draw.vertexCount).toBeLessThanOrEqual(LOFT.budget); expect(LOFT_SAMPLES).toBe(134);
          let base = 0;
          for (let s = 0; s + 1 < draw.sliceCount; s += 1) {
            if (!draw.sliceJoined[s]) continue;
            const p = draw.positions, rootPaired = (row: number) => {
              for (let k = 0; k < 9; k += 1) {
                const a = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + 40 + k), b = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + 88 - k);
                if (p[a] !== p[b] || p[a + 2] !== p[b + 2]) return false;
              }
              return true;
            };
            if (rootPaired(s) && rootPaired(s + 1)) for (let k = 0; k < 8; k += 1) {
              const cells = [40 + k, 87 - k].map(i => [0, 3].map(offset => {
                const t = base + 6 * (LOFT.extensionSamples + i) + offset;
                return [draw.indices[t], draw.indices[t + 1], draw.indices[t + 2]].map(v => [p[3 * v], p[3 * v + 2]].join(',')).sort().join('|');
              }).sort());
              expect(cells[1]).toEqual(cells[0]);
              pairedCells += 1;
            }
            base += 6 * (LOFT_SAMPLES - 1);
          }
        }
      }
    }
    expect(pairedCells).toBeGreaterThan(1000);
  }, 30000);
});
