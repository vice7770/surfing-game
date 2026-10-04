import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CrestRayPlan, minimumCrestRaySpacing, type FrontRayControl } from './crestRays';
import { CrestRayPlan as ParentRayPlan } from '/private/tmp/tube-bounded-c-fullsheet-demand-20261004/source/src/wave/barrel/crestRays';
import { ProfileLibrary as ParentLibrary } from '/private/tmp/tube-bounded-c-fullsheet-demand-20261004/source/src/wave/barrel/ProfileLibrary';
import { ProfileLibrary, PROFILE_POINTS, LANDMARK } from './ProfileLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';

const W = '/private/tmp/tube-bounded-c-parallel-rays-20261004';
type Row = FrontRayControl & { front: number; tau: number; throwZ: number | null; pace: number | null };
const saved = JSON.parse(readFileSync(W + '/captured-fronts.json', 'utf8')) as {
  locked: { stationX: number }; observations: { step: number; rawFrontRecords: Row[] }[];
};
const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const parent = new ParentLibrary(cases, { geometry: 'bounded-C' });
const slope = 1 / 19;
const recordsOf = (rows: Row[]) => Float32Array.from(rows.flatMap(row =>
  ['x', 'z', 'front', 'sigma', 'tau', 'footHeight', 'footDepth', 'throwZ', 'pace'].map(key => row[key as keyof Row] ?? NaN)));
function anchorAt(rows: FrontRayControl[], sigma: number): number[] {
  const last = rows.length - 1;
  if (sigma <= rows[0].sigma || sigma >= rows[last].sigma) {
    const k = sigma <= rows[0].sigma ? 0 : last, n = k === 0 ? 1 : last - 1;
    const dx = rows[k].x - rows[n].x, dz = rows[k].z - rows[n].z, length = Math.hypot(dx, dz);
    const beyond = k === 0 ? rows[0].sigma - sigma : sigma - rows[last].sigma;
    return [rows[k].x + beyond * dx / length, rows[k].z + beyond * dz / length];
  }
  let k = 0;
  while (rows[k + 1].sigma < sigma) k += 1;
  const t = (sigma - rows[k].sigma) / (rows[k + 1].sigma - rows[k].sigma);
  return [rows[k].x + t * (rows[k + 1].x - rows[k].x), rows[k].z + t * (rows[k + 1].z - rows[k].z)];
}
function intervals(rows: FrontRayControl[]) {
  const first = rows[0].sigma - 1.5, span = rows.at(-1)!.sigma - rows[0].sigma + 3;
  const n = Math.ceil(span / 0.5), step = span / n;
  return Array.from({ length: 2 * n + 1 }, (_, k) => first + 0.5 * k * step);
}
function storedAdvance(rows: FrontRayControl[], plan: CrestRayPlan) {
  const samples = intervals(rows); let minimum = Infinity;
  for (let i = 0; i + 1 < samples.length; i += 1) {
    const a = anchorAt(rows, samples[i]), b = anchorAt(rows, samples[i + 1]);
    const ra = plan.rayAt(samples[i], new Float64Array(2)), rb = plan.rayAt(samples[i + 1], new Float64Array(2));
    for (const u of [-100, 0, 100]) for (const v of [-100, 0, 100]) {
      const dx = Math.fround(b[0] + v * rb[0]) - Math.fround(a[0] + u * ra[0]);
      const dz = Math.fround(b[1] + v * rb[1]) - Math.fround(a[1] + u * ra[1]);
      minimum = Math.min(minimum, dx * ra[1] - dz * ra[0], dx * rb[1] - dz * rb[0]);
      expect(dx).toBeGreaterThanOrEqual(plan.diagnostics.minimumAdvancePerSigma * (samples[i + 1] - samples[i]));
    }
  }
  return minimum;
}
const groups = (rows: Row[]) => [...new Set(rows.map(r => r.front))].map(front => rows.filter(r => r.front === front)).filter(r => r.length >= 2);
const stationSigma = (rows: Row[], x: number) => {
  const k = rows.findIndex((r, i) => i + 1 < rows.length && r.x <= x && rows[i + 1].x >= x);
  if (k < 0) throw new Error('fixed station outside retained group');
  const t = (x - rows[k].x) / (rows[k + 1].x - rows[k].x);
  return rows[k].sigma + t * (rows[k + 1].sigma - rows[k].sigma);
};

describe('bounded-C X-column shoreward parallel authority', () => {
  it('keeps fixed local rays across the actual69→71 split, remote end removal, translation and sigma rebase', () => {
    const rows22 = saved.observations.find(o => o.step === 22)!.rawFrontRecords.filter(r => r.front === 69);
    const rows23 = saved.observations.find(o => o.step === 23)!.rawFrontRecords.filter(r => r.front === 71);
    const unchangedLocal = rows22.filter(r => r.x >= 7).map(r => ({ ...r, sigma: r.sigma - rows22.find(r => r.x === 7)!.sigma }));
    const moved = unchangedLocal.map(r => ({ ...r, x: r.x + 4096, z: r.z - 8192, sigma: r.sigma + 32 }));
    for (const rows of [rows22, rows23, unchangedLocal, moved]) {
      const plan = new CrestRayPlan(library, slope); plan.prepare(rows);
      const recordPlan = new CrestRayPlan(library, slope); recordPlan.prepareRecords(recordsOf(rows), 0, rows.length);
      expect(plan.diagnostics.invalidIntervals).toBe(0);
      expect(recordPlan.diagnostics).toEqual(plan.diagnostics);
      for (const at of intervals(rows)) {
        expect(Array.from(plan.rayAt(at, new Float64Array(2)))).toEqual([0, 1]);
        expect(recordPlan.rayAt(at, new Float64Array(2))).toEqual(plan.rayAt(at, new Float64Array(2)));
      }
    }
  });

  it('retains positive stored endpoint halfplanes through every captured refined interval and shoulder', () => {
    let minimum = Infinity, intervalsChecked = 0;
    for (const observation of saved.observations) for (const rows of groups(observation.rawFrontRecords)) {
      const plan = new CrestRayPlan(library, slope); plan.prepare(rows);
      expect(plan.diagnostics.invalidIntervals).toBe(0);
      minimum = Math.min(minimum, storedAdvance(rows, plan)); intervalsChecked += intervals(rows).length - 1;
    }
    expect(minimum).toBeGreaterThan(0); expect(intervalsChecked).toBeGreaterThan(1000);
    writeFileSync(W + '/stored-advance-receipt.json', JSON.stringify({ minimumStoredDeltaX: minimum, intervalsChecked,
      nominalRefinedMinimumSpacing: minimumCrestRaySpacing(1.5, 0.5), varyingIndependentOffsets: [-100, 0, 100],
      halfPlaneAdvanceEqualsStoredDeltaX: true, shouldersIncluded: true }, null, 2) + '\n');
  });

  it('diagnoses collapsed/reversed controls and unresolved upload spacing without moving a vertex', () => {
    const valid = [{ x: 0, z: 0, sigma: 0, footHeight: 2, footDepth: 7 }, { x: 1, z: 1, sigma: 1, footHeight: 2, footDepth: 7 }];
    const plan = new CrestRayPlan(library, slope); plan.prepare(valid);
    expect(plan.diagnostics.minimumAdvancePerSigma).toBeGreaterThan(0.7);
    for (const xs of [[0, 0], [1, 0], [10_000_000, 10_000_001]]) {
      const c = valid.map((r, k) => ({ ...r, x: xs[k] })), before = structuredClone(c);
      plan.prepare(c); expect(plan.diagnostics.invalidIntervals).toBeGreaterThan(0); expect(c).toEqual(before);
    }
    expect(() => plan.prepare([{ ...valid[0], z: NaN }, valid[1]])).toThrow('Non-finite');
  });

  it('leaves every captured RAW ray and diagnostic exactly equal to the parent implementation', () => {
    const raw = new ProfileLibrary(cases), old = new ParentLibrary(cases);
    let checked = 0;
    for (const observation of saved.observations) for (const rows of groups(observation.rawFrontRecords)) {
      const a = new CrestRayPlan(raw, slope), b = new ParentRayPlan(old, slope); a.prepare(rows); b.prepare(rows);
      expect(a.diagnostics).toEqual(b.diagnostics);
      for (const at of intervals(rows)) { expect(a.rayAt(at, new Float64Array(2))).toEqual(b.rayAt(at, new Float64Array(2))); checked += 1; }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('records actual metric-profile orientation departure across captured phases without asserting native appearance', () => {
    let maxDegrees = 0, maxSkewDegrees = 0, maxDisplacement = 0, minPhase = Infinity, maxPhase = -Infinity, profiles = 0;
    const split: { step: number; parentDegrees: number; parallelDegrees: number; metricCapHorizontalDisplacement: number }[] = [];
    for (const observation of saved.observations) for (const rows of groups(observation.rawFrontRecords)) {
      const old = new ParentRayPlan(parent, slope); old.prepare(rows);
      for (let k = 0; k < rows.length; k += 1) {
        const r = rows[k], ray = old.rayAt(r.sigma, new Float64Array(2));
        maxDegrees = Math.max(maxDegrees, Math.abs(Math.atan2(ray[0], ray[1]) * 180 / Math.PI));
        const left = rows[Math.max(0, k - 1)], right = rows[Math.min(rows.length - 1, k + 1)];
        maxSkewDegrees = Math.max(maxSkewDegrees, Math.abs(Math.atan2(-(right.z - left.z), right.x - left.x) * 180 / Math.PI));
        const profile = new Float32Array(2 * PROFILE_POINTS);
        const query = { slope, footHeight: r.footHeight, footDepth: r.footDepth, seconds: r.tau, hold: 'drawing' as const };
        const lookup = library.profileAt(query, profile), original = new Float32Array(2 * PROFILE_POINTS);
        const prior = parent.profileAt(query, original);
        expect(profile).toEqual(original); expect(lookup).toEqual(prior);
        const distance = Math.hypot(ray[0], ray[1] - 1), crest = profile[2 * LANDMARK.crest];
        for (let i = 0; i < PROFILE_POINTS; i += 1) maxDisplacement = Math.max(maxDisplacement, Math.abs(profile[2 * i] - crest) * distance);
        minPhase = Math.min(minPhase, lookup.phase === 'pre' ? 0 : lookup.phase === 'open' ? 1 : 2);
        maxPhase = Math.max(maxPhase, lookup.phase === 'pre' ? 0 : lookup.phase === 'open' ? 1 : 2); profiles += 1;
      }
      if (observation.step === 22 && rows[0].front === 69 || observation.step === 23 && rows[0].front === 71) {
        const at = stationSigma(rows, saved.locked.stationX), ray = old.rayAt(at, new Float64Array(2));
        const a = rows.find(r => r.x === 15)!, b = rows.find(r => r.x === 17)!, t = (saved.locked.stationX - 15) / 2;
        const p = new Float32Array(2 * PROFILE_POINTS);
        library.profileAt({ slope, footHeight: a.footHeight + t * (b.footHeight - a.footHeight), footDepth: 7,
          seconds: a.tau + t * (b.tau - a.tau), hold: 'drawing' }, p);
        split.push({ step: observation.step, parentDegrees: Math.atan2(ray[0], ray[1]) * 180 / Math.PI, parallelDegrees: 0,
          metricCapHorizontalDisplacement: Math.abs(p[2 * LANDMARK.lip] - p[2 * LANDMARK.crest]) * Math.hypot(ray[0], ray[1] - 1) });
      }
    }
    expect(profiles).toBeGreaterThan(500); expect(split).toHaveLength(2);
    const splitAngle = split[1].parentDegrees - split[0].parentDegrees;
    expect(Math.abs(splitAngle)).toBeGreaterThan(5); expect(split.map(s => s.parallelDegrees)).toEqual([0, 0]);
    writeFileSync(W + '/orientation-receipt.json', JSON.stringify({ profiles, maxParentAngularDepartureDegrees: maxDegrees,
      maxSkewFromLocalCrestNormalDegrees: maxSkewDegrees, maxMetricProfileHorizontalProjectionDisplacement: maxDisplacement,
      phaseRange: [minPhase, maxPhase], split, parentSplitDegrees: splitAngle, parallelSplitDegrees: 0,
      fullProviderContourAndLookupExact: true, finalLiveWaterVerticalProjectionEqualityClaim: false,
      nativeShapeOrBodyContinuityClaim: false, scope: 'all24 saved raw-front observations,128-point metric provider projections; not actual saved water/final native geometry' }, null, 2) + '\n');
  }, 30000);
});
