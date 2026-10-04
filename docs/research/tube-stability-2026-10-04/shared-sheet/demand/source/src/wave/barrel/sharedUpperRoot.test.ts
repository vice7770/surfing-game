import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boundedCParameters, blendBoundedCParameters, sampleBoundedC, type BoundedCParameters, type Vec2 } from './boundedCProfile';
import { pairInnerSheet, roofEnvelopeDifference } from './sharedUpperRoot';
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
const switches = JSON.parse(readFileSync('/private/tmp/tube-bounded-c-shared-seam-20261004/precision-switch-inputs.json', 'utf8')) as {
  block: string; label: string; tauSwitch: number; tauPair: [number, number]; params: BoundedCParameters; raw: number[];
}[];
const frame = (c: typeof cases[number], f: number) => c.frames.slice(256 * f, 256 * (f + 1));
const blend = (a: Float32Array, b: Float32Array, t: number) => Float32Array.from(a, (v, i) => v + t * (b[i] - v));

function crossings(p: Float32Array, first = 0, last = 127): Set<string> {
  const result = new Set<string>();
  for (let i = first; i < last; i += 1) for (let j = i + 2; j < last; j += 1) {
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
  for (let k = 0; k < 21; k += 1) {
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

describe('coupled complete inner-sheet shared sampling experiment', () => {
  it('evaluates all6447 original/precision queries without new crossings, missing domains or hidden limits', () => {
    const groups: Record<string, { attempted: number; valid: number; failed: number; resolved: number; maximumRoofEnvelopeChange: number; maximumNormalizedRoofEnvelopeChange: number; maximumMaterialDisplacement: number; maximumNormalizedMaterialDisplacement: number }> = {};
    const failures: unknown[] = [];
    let maximumRoofEnvelopeChange = 0, maximumMaterialDisplacement = 0, maximumRootRadiusReduction = 0, coalescedStations = 0, limitedRoots = 0;
    function check(raw: Float32Array, z: BoundedCParameters, group: string, id: unknown, preservedCarrierStart = 0) {
      const stats = groups[group] ??= { attempted: 0, valid: 0, failed: 0, resolved: 0, maximumRoofEnvelopeChange: 0, maximumNormalizedRoofEnvelopeChange: 0, maximumMaterialDisplacement: 0, maximumNormalizedMaterialDisplacement: 0 };
      stats.attempted += 1;
      const before = raw.slice(), out = raw.slice();
      try {
        const original = sampleBoundedC(z, before, false, undefined, false, preservedCarrierStart), meta = sampleBoundedC(z, out, false, undefined, true, preservedCarrierStart);
        const paired = pairInnerSheet(out, meta);
        const first = preservedCarrierStart, last = first ? 112 : 127, spatialScale = Math.max(z.toe[0] - z.crest[0], z.crest[1] - z.toe[1]);
        if (!out.subarray(2 * first, 2 * last + 2).every(Number.isFinite)) throw Error('nonfinite known contour');
        for (let i = first; i <= last; i += 1) {
          if (i <= 32 || i >= 102 || i >= 60 && i <= 80) {
            if (out[2 * i] !== before[2 * i] || out[2 * i + 1] !== before[2 * i + 1]) throw Error(`changed preserved point${i}`);
          }
          const displacement = Math.hypot(out[2 * i] - before[2 * i], out[2 * i + 1] - before[2 * i + 1]);
          maximumMaterialDisplacement = Math.max(maximumMaterialDisplacement, displacement);
          stats.maximumMaterialDisplacement = Math.max(stats.maximumMaterialDisplacement, displacement);
          stats.maximumNormalizedMaterialDisplacement = Math.max(stats.maximumNormalizedMaterialDisplacement, displacement / spatialScale);
        }
        const oldPairs = crossings(before, first, last), newPairs = [...crossings(out, first, last)].filter(p => !oldPairs.has(p));
        if (newPairs.length) throw Error(`new proper crossing pairs${newPairs.join(',')}`);
        if (paired) {
          if (meta.sheetExists) stats.resolved += 1;
          for (let i = 38; i <= 58; i += 1) {
            const j = 126 - i;
            if (out[2 * i] !== out[2 * j] || out[2 * i + 1] < out[2 * j + 1]) throw Error(`unordered common station${i}/${j}`);
          }
          maximumRoofEnvelopeChange = Math.max(maximumRoofEnvelopeChange, paired.maximumRoofEnvelopeChange);
          stats.maximumRoofEnvelopeChange = Math.max(stats.maximumRoofEnvelopeChange, paired.maximumRoofEnvelopeChange);
          stats.maximumNormalizedRoofEnvelopeChange = Math.max(stats.maximumNormalizedRoofEnvelopeChange, paired.maximumRoofEnvelopeChange / spatialScale);
          coalescedStations += paired.coalescedStations;
          if (meta.rootRadius < original.rootRadius) limitedRoots += 1;
          maximumRootRadiusReduction = Math.max(maximumRootRadiusReduction, original.rootRadius - meta.rootRadius);
        }
        stats.valid += 1;
      } catch (error) {
        stats.failed += 1;
        failures.push({ group, id, knownContour: [preservedCarrierStart, preservedCarrierStart ? 112 : 127], missingBulkNotObserved: preservedCarrierStart === 32, params: z, error: String(error), raw: Array.from(raw), before: Array.from(before), after: Array.from(out) });
      }
    }
    for (const [i, r] of oldReport.actual.entries()) {
      const raw = new Float32Array(256);
      for (const v of r.rawPolyline!) { raw[2 * v.point] = v.q; raw[2 * v.point + 1] = v.y; }
      check(raw, fromPy(r), 'captured5-partial32to112', i, 32);
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
    const receipt = { partialCaptureLimitation: 'Five captures contain only32..112: upstream0..31 and113..127 unobserved, excluded from bulk guards/crossing/preservation checks; buffer placeholders are not evidence. Full asset/provider queries use all128 points.', groups, failures, maximumRoofEnvelopeChange, maximumMaterialDisplacement, maximumRootRadiusReduction, limitedRoots, coalescedStations,
      originalV4CoefficientsUnchanged: true, geometryPhysicallyEquivalent: false, fixedProfilePoints: 128, rowVertices: LOFT_SAMPLES, vertexBudget: LOFT.budget };
    writeFileSync('/private/tmp/tube-bounded-c-fullsheet-demand-20261004/fullsheet-query-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
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
    writeFileSync('/private/tmp/tube-bounded-c-fullsheet-demand-20261004/fullsheet-exact-receipt.json', JSON.stringify({ originalPenetration: failure.penetration,
      fixedInputRecords: Array.from(input), x: failure.x, z: failure.z, strip: failure.strip, hits, signedGap }, null, 2) + '\n');
    expect(signedGap).toBeGreaterThanOrEqual(0);
  });

  it('records all40 unchanged precision switches using union-breakpoint roof envelopes and sampled full-contour distances', () => {
    const pointDistance = (x: number, y: number, p: Float32Array, i: number) => {
      const ax = p[2 * i], ay = p[2 * i + 1], dx = p[2 * i + 2] - ax, dy = p[2 * i + 3] - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(x - ax - t * dx, y - ay - t * dy);
    };
    // Vertices plus edge midpoints against every segment: evidence, not a Hausdorff proof.
    const sampledDistance = (a: Float32Array, b: Float32Array) => {
      let d = 0;
      for (const [p, q] of [[a, b], [b, a]]) for (let i = 32; i <= 112; i += 1) for (const t of i === 112 ? [0] : [0, 0.5]) {
        const x = p[2 * i] + t * (p[2 * (i + 1)] - p[2 * i]), y = p[2 * i + 1] + t * (p[2 * (i + 1) + 1] - p[2 * i + 1]);
        let best = Infinity;
        for (let j = 32; j < 112; j += 1) best = Math.min(best, pointDistance(x, y, q, j));
        d = Math.max(d, best);
      }
      return d;
    };
    const rows = switches.map(s => {
      const original: Float32Array[] = [], paired: Float32Array[] = [], existence: boolean[] = [];
      for (const tau of s.tauPair) {
        const before = new Float32Array(s.raw), out = before.slice(), z = { ...s.params, tau };
        sampleBoundedC(z, before, false);
        const meta = sampleBoundedC(z, out, false, undefined, true);
        pairInnerSheet(out, meta); existence.push(meta.sheetExists); original.push(before); paired.push(out);
        expect([...crossings(out)].filter(p => !crossings(before).has(p))).toEqual([]);
      }
      const spatialScale = Math.max(s.params.toe[0] - s.params.crest[0], s.params.crest[1] - s.params.toe[1]);
      const originalRoofSwitch = roofEnvelopeDifference(original[0], original[1]), pairedRoofSwitch = roofEnvelopeDifference(paired[0], paired[1]);
      const perSideRoofResampling = paired.map((p, i) => roofEnvelopeDifference(original[i], p));
      const sampledOriginalSwitch = sampledDistance(original[0], original[1]), sampledPairedSwitch = sampledDistance(paired[0], paired[1]);
      return { block: s.block, label: s.label, tauSwitch: s.tauSwitch, tauPair: s.tauPair, sheetExists: existence, spatialScale,
        originalRoofSwitch, pairedRoofSwitch, normalizedPairedRoofSwitch: pairedRoofSwitch / spatialScale,
        perSideRoofResampling, sampledOriginalSwitch, sampledPairedSwitch, normalizedSampledPairedSwitch: sampledPairedSwitch / spatialScale };
    });
    const receipt = { switches: rows, measuredSwitches: rows.length, activeCollapsedSwitches: rows.filter(r => r.sheetExists[0] !== r.sheetExists[1]).length,
      maximumOriginalRoofSwitch: Math.max(...rows.map(r => r.originalRoofSwitch)), maximumPairedRoofSwitch: Math.max(...rows.map(r => r.pairedRoofSwitch)),
      maximumNormalizedPairedRoofSwitch: Math.max(...rows.map(r => r.normalizedPairedRoofSwitch)),
      maximumSampledPairedSwitch: Math.max(...rows.map(r => r.sampledPairedSwitch)), maximumNormalizedSampledPairedSwitch: Math.max(...rows.map(r => r.normalizedSampledPairedSwitch)),
      fixedOriginalGateAndControls: true, sameSamplingInBothStates: true,
      limitation: 'Roof metric is exact vertical polygon difference on common domain at union breakpoints; whole-contour metric samples vertices/midpoints, not continuous Hausdorff proof.' };
    writeFileSync('/private/tmp/tube-bounded-c-fullsheet-demand-20261004/fullsheet-switch-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
    expect(rows.length).toBe(40);
    expect(rows.every(r => Number.isFinite(r.pairedRoofSwitch) && Number.isFinite(r.sampledPairedSwitch))).toBe(true);
  }, 30000);

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
              for (let k = 0; k < 21; k += 1) {
                const a = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + 38 + k), b = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + 88 - k);
                if (p[a] !== p[b] || p[a + 2] !== p[b + 2]) return false;
              }
              return true;
            };
            if (rootPaired(s) && rootPaired(s + 1)) for (let k = 0; k < 20; k += 1) {
              const cells = [38 + k, 87 - k].map(i => [0, 3].map(offset => {
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
