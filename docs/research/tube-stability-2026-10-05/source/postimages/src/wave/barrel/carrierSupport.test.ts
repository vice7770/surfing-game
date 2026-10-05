import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { BreakingFront, type FrontPoint } from './BreakingFront';
import { CarrierSupport, geometricPaceActive } from './carrierSupport';
import type { CrestSample } from './crestOnset';
import { FRONT_FIELD, FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { ProfileLibrary, LANDMARK } from './ProfileLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { SweptCrash, type CrashSea } from './SweptCrash';
import { LOFT, LOFT_SAMPLES, SweptLoft, collapseFade, type LoftResult } from './sweptLoft';
import { advanceClocks, onsetTiming } from './sliceClock';
import { tubeCase } from './toyCase';
import { PlungingLip } from '../PlungingLip';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { BreakingFront as ParentFront } from '/private/tmp/tube-bounded-c-parallel-physics-20261004/source/src/wave/barrel/BreakingFront';
import { SweptCrash as ParentCrash } from '/private/tmp/tube-bounded-c-parallel-physics-20261004/source/src/wave/barrel/SweptCrash';
import { SweptLoft as ParentLoft } from '/private/tmp/tube-bounded-c-parallel-physics-20261004/source/src/wave/barrel/sweptLoft';
import { ProfileLibrary as ParentLibrary } from '/private/tmp/tube-bounded-c-parallel-physics-20261004/source/src/wave/barrel/ProfileLibrary';
import { writeFrontRecords as parentRecords } from '/private/tmp/tube-bounded-c-parallel-physics-20261004/source/src/wave/barrel/frontRecords';
import { ShallowWaterSolver as ParentSolver } from '/private/tmp/tube-bounded-c-parallel-physics-20261004/source/src/wave/ShallowWaterSolver';
import { PlungingLip as ParentLip } from '/private/tmp/tube-bounded-c-parallel-physics-20261004/source/src/wave/PlungingLip';

const cases = readBarrelCases().map(decodeCase), c = cases.find(c => c.id === 'pad19-a30-l12')!;
const lib = new ProfileLibrary(cases, { geometry: 'bounded-C' }), priorLib = new ParentLibrary(cases, { geometry: 'bounded-C' });
const support = new CarrierSupport(lib, c.slope), timing = onsetTiming(7, 18);
const metrics: Record<string, unknown> = {};
afterAll(() => { if (process.env.CARRIER_METRICS) writeFileSync(process.env.CARRIER_METRICS, JSON.stringify(metrics, null, 2) + '\n'); });
const retirement = (h: number, d: number) => { const t = lib.profileTimes({ slope: c.slope, footHeight: h, footDepth: d }); return t.touchdownSeconds + t.collapseSeconds; };
function point(k: number, d = 7, h = c.nonlinearity * d, tau = .5): FrontPoint {
  return { id: 100 + k, front: 1, column: k, x: k + .5, z: 40 + 4 * tau, sigma: k, b: 0, height: h,
    joined: 0, depth: 2, throwDepth: 1.8, crestDepth: 1.8, thrown: 0, throwZ: 40, footHeight: h, footDepth: d,
    broke: 0, tau, fresh: null, seen: 1, jetPace: 4, jetBase: 40, jetUntil: retirement(h, d), jetAt: 0, jetStrip: -1, crashedAt: 1 };
}
function packet(points: readonly FrontPoint[]) { const r = new Float32Array(points.length * FRONT_STRIDE); writeFrontRecords(points, r); return r; }
function sample(p: FrontPoint, z: number): CrestSample { return { column: p.column, row: Math.floor(z), x: p.x, z, eta: p.height, wave: p.height, depth: 1.8, strength: .4, rise: .2, b: 0, speed: 4 }; }
function front(points: FrontPoint[], carrier = true) { const f = new BreakingFront(2, timing, {}, carrier ? support : undefined); f.importState({ nextId: 1000, nextFront: 100, points, held: [], tracks: [] }); return f; }
function basin(zMin = 0) { return new ShallowWaterSolver({ nx: 48, xMin: 0, dx: 1, zEdges: uniformEdges(zMin, zMin + 240, 120), xBoundary: 'wall' }, () => 12, { manning: 0 }); }
function sea(solver: ShallowWaterSolver, lip = new PlungingLip(solver)): CrashSea { return { solver, lip, stillLevel: 0, period: 18, strength: new Float64Array(solver.h.length), whitewater: new Float64Array(solver.h.length) }; }
function landmarks(l: LoftResult, x: number) {
  const crest = (s: number) => l.positions[3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest)];
  for (let s = 0; s + 1 < l.sliceCount; s++) if (l.sliceJoined[s] && crest(s) <= x && x < crest(s + 1)) {
    const t = (x - crest(s)) / (crest(s + 1) - crest(s));
    return { rows: [s, s + 1], x: [crest(s), crest(s + 1)], fraction: t, phases: [l.slicePhase[s], l.slicePhase[s + 1]], overturned: [l.sliceOverturned[s], l.sliceOverturned[s + 1]], weights: [l.sliceWeight[s], l.sliceWeight[s + 1]],
      z: [LANDMARK.crest, LANDMARK.lip, LANDMARK.toe].map(i => { const a = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + i) + 2, b = a + 3 * LOFT_SAMPLES; return l.positions[a] + t * (l.positions[b] - l.positions[a]); }),
      y: [LANDMARK.crest, LANDMARK.lip, LANDMARK.toe].map(i => { const a = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + i) + 1, b = a + 3 * LOFT_SAMPLES; return l.positions[a] + t * (l.positions[b] - l.positions[a]); }) };
  }
  throw new Error('No joined landmark bracket');
}

describe('C provider-derived geometric carrier support', () => {
  it('bounds actual interpolated provider retirement across case/clamp knots and rejects invalid domains', () => {
    const domains = [[.12, 1, 5.5, 9], [4.7, 2, .42, 7], [.4, 1, 3.6, 9], [2.63, 7, 2.65, 7]];
    const evidence = domains.map(([h0, d0, h1, d1]) => {
      const a = { footHeight: h0, footDepth: d0 }, b = { footHeight: h1, footDepth: d1 }, bound = lib.carrierRetirementBound(c.slope, a, b);
      let actualMax = 0, scaleMax = 0;
      for (let k = 0; k <= 128; k++) {
        const t = k / 128, h = Math.fround(h0) + t * (Math.fround(h1) - Math.fround(h0)), d = Math.fround(d0) + t * (Math.fround(d1) - Math.fround(d0));
        const q = lib.profileTimes({ slope: c.slope, footHeight: h, footDepth: d });
        actualMax = Math.max(actualMax, q.touchdownSeconds + q.collapseSeconds); scaleMax = Math.max(scaleMax, q.scale);
        expect(q.touchdownSeconds + q.collapseSeconds).toBeLessThanOrEqual(bound.seconds); expect(q.scale).toBeLessThanOrEqual(bound.maxScale + 1e-12);
      }
      return { a, b, bound, actualMax, scaleMax };
    });
    expect(evidence[1].bound.maxScale).toBeGreaterThan(7); expect(evidence[0].bound.partitions).toBeGreaterThan(1);
    expect(() => lib.carrierRetirementBound(c.slope, { footHeight: 0, footDepth: 7 }, { footHeight: 1, footDepth: 7 })).toThrow();
    expect(() => new CarrierSupport(new ProfileLibrary([tubeCase(.2)]), c.slope)).toThrow('C-only'); metrics.bounds = evidence;
  });
  it('retains interior-only support when both individual endpoints have retired', () => {
    const a = point(0, 1), b = point(1, 9); a.tau = a.jetUntil! + .01; b.tau = b.jetUntil! + .01;
    const interiorTau = (a.tau + b.tau) / 2, interiorRetirement = retirement((a.footHeight + b.footHeight) / 2, 5);
    expect(a.tau).toBeGreaterThan(a.jetUntil!); expect(b.tau).toBeGreaterThan(b.jetUntil!); expect(interiorTau).toBeLessThan(interiorRetirement);
    const own = [a.jetUntil, b.jetUntil]; support.refresh([a, b], 1);
    for (const p of [a, b]) { expect(p.carrierSupport?.ownPocketAlive).toBe(false); expect(p.carrierSupport?.state).toBe('incident-support'); expect(geometricPaceActive(p)).toBe(true); }
    expect([a.jetUntil, b.jetUntil]).toEqual(own); expect(Array.from(packet([a, b])).filter((_, i) => i % FRONT_STRIDE === FRONT_FIELD.pace)).toEqual([4, 4]);
    metrics.interior = { endpointOwnUntil: own, endpointTau: [a.tau, b.tau], interiorTau, interiorRetirement, history: a.carrierSupport };
  });
  it('classifies retired raw X15 while the original captured fixed-X station stays positive joined phase2', () => {
    const fixture = JSON.parse(readFileSync('/private/tmp/tube-bounded-c-carrier-support-20261004/handoff-fixture.json', 'utf8'));
    const points: FrontPoint[] = fixture.initialPoints.map((p: FrontPoint, k: number) => ({ ...point(k), ...p, ...fixture.before.rawRows[k], jetStrip: -1, crashedAt: 36,
      seen: p.seen + fixture.before.movingStep / 60, height: p.footHeight, depth: 4, throwDepth: 3, crestDepth: 2.5, fresh: null }));
    const f = front(points), old = front(points.map(p => ({ ...p })), false), stepTime = points[0].seen + 1 / 60;
    const measuredPacket = (rows: { x: number; z: number; front: number; sigma: number; tau: number; footHeight: number; footDepth: number; throwZ: number | null; pace: number | null }[], overrides: FrontPoint[] = []) => {
      const r = new Float32Array(rows.length * FRONT_STRIDE);
      rows.forEach((row, k) => { const replacement = overrides.find(p => p.x === row.x); r.set(replacement ? packet([replacement]) : [row.x, row.z, row.front, row.sigma, row.tau, row.footHeight, row.footDepth, row.throwZ ?? NaN, row.pace ?? NaN], k * FRONT_STRIDE); });
      return r;
    };
    const before = landmarks(new SweptLoft(lib, c.slope, { sheet: false }).build(measuredPacket(fixture.before.componentRawRows), fixture.before.componentRawRows.length, 0, () => 0), fixture.stationX);
    const samples = points.map((p, k) => sample(p, fixture.after.rawRows[k].z));
    f.update(samples, samples.length, stepTime); old.update(samples, samples.length, stepTime);
    expect(f.points.map(p => p.id)).toEqual(points.map(p => p.id)); expect(old.points[0].z - points[0].z).toBeGreaterThan(2.6);
    expect(f.points[0].z - points[0].z).toBeCloseTo(points[0].jetPace! / 60, 9); expect(f.points[0].carrierSupport?.ownPocketAlive).toBe(false);
    for (let k = 0; k < f.points.length; k++) f.points[k].tau = fixture.after.rawRows[k].tau;
    const solver = basin(-200); solver.time = stepTime; const s = sea(solver), hold = vi.spyOn(s.lip, 'holdJet'), waterBefore = solver.h.slice();
    const crash = new SweptCrash(lib, c.slope); expect(crash.update(f.points, s)).toEqual({ throws: 0, volume: 0 });
    expect(hold).not.toHaveBeenCalled(); expect(solver.h).toEqual(waterBefore); expect(crash.curve.every(p => p.air >= 0)).toBe(true);
    expect(f.points[0].z).toBe(f.points[0].jetBase! + f.points[0].jetPace! * f.points[0].tau);
    expect(packet(f.points)[FRONT_FIELD.pace]).toBe(Math.fround(points[0].jetPace!));
    // The captured full raw component supplies its actual endpoint context; only the measured bracketing pair's
    // source-derived replacement motion is under test. This is a CPU geometry fixture, not a new native capture.
    // Recompute its full arc exactly as SweptCrash does after placement, rather than splice stale sigma words.
    const afterRecords = measuredPacket(fixture.after.componentRawRows, f.points); let sigma = 0;
    for (let k = 0; k < fixture.after.componentRawRows.length; k++) {
      if (k) sigma += Math.hypot(afterRecords[k * FRONT_STRIDE] - afterRecords[(k - 1) * FRONT_STRIDE], afterRecords[k * FRONT_STRIDE + 1] - afterRecords[(k - 1) * FRONT_STRIDE + 1]);
      afterRecords[k * FRONT_STRIDE + FRONT_FIELD.sigma] = sigma;
    }
    const after = landmarks(new SweptLoft(lib, c.slope, { sheet: false }).build(afterRecords, fixture.after.componentRawRows.length, 0, () => 0), fixture.stationX);
    // Mandatory raw X15 is itself provider-retired, even though its incident interpolation at the ORIGINAL
    // captured station remains live. The adjacent intrinsically dead sample is a zero-lift closure; the positive bracket keeps intrinsic weights.
    // Classify the actual raw control and test the original fixed station, never a replacement nearby location.
    const beforeRecords = measuredPacket(fixture.before.componentRawRows);
    const providerFadeAt15 = (records: Float32Array) => {
      const k = Array.from({ length: records.length / FRONT_STRIDE }, (_, k) => k).find(k => records[k * FRONT_STRIDE + FRONT_FIELD.x] === 15)!;
      const o = k * FRONT_STRIDE, times = lib.profileTimes({ slope: c.slope, footHeight: records[o + FRONT_FIELD.footHeight], footDepth: records[o + FRONT_FIELD.footDepth] });
      return { x: 15, tau: records[o + FRONT_FIELD.tau], retirement: times.touchdownSeconds + times.collapseSeconds,
        fade: collapseFade(records[o + FRONT_FIELD.tau], times.touchdownSeconds, times.collapseSeconds) };
    };
    const raw15Before = providerFadeAt15(beforeRecords), raw15After = providerFadeAt15(afterRecords);
    expect(raw15Before.fade).toBe(0); expect(raw15After.fade).toBe(0);
    expect(before.phases).toEqual([2, 2]); expect(after.phases).toEqual([2, 2]);
    expect([...before.overturned, ...after.overturned].every(v => v === 1)).toBe(true);
    const fixedWeight = (s: typeof before) => s.weights[0] + s.fraction * (s.weights[1] - s.weights[0]);
    expect(fixedWeight(before)).toBeGreaterThan(0); expect(fixedWeight(after)).toBeGreaterThan(0);
    expect(after.weights.every(w => w > 0)).toBe(true);
    expect(after.y[0]).toBeGreaterThan(0);
    metrics.handoffBoundaryClassification = { originalCapturedFixedX: fixture.stationX, raw15Before, raw15After, before, after,
      fixedWeightBefore: fixedWeight(before), fixedWeightAfter: fixedWeight(after), firstLiveRowNotResealed: true,
      relocatedStation: false, originalEndpointWeightFailurePreserved: true };
    const dz = after.z.map((z, i) => z - before.z[i]); for (const z of dz) expect(Math.abs(z)).toBeLessThan(.35);
    metrics.handoff = { report: fixture.report, before, after, landmarkDeltaZ: dz, rawOldDelta: old.points[0].z - points[0].z, newEndpointDelta: f.points[0].z - points[0].z,
      immutable: f.points.map(p => [p.id, p.jetPace, p.jetBase, p.jetUntil, p.jetAt]), history: f.points[0].carrierSupport, nativeRerunClaim: false };
  });
  it('uses both incident supports, removes split/removed dependencies, and exports deep dynamic evidence', () => {
    const p = [point(0), point(1), point(2)]; p[1].tau = p[1].jetUntil! + .01;
    support.refresh(p, 1); expect(p[1].carrierSupport?.incidents.map(i => i.otherId)).toEqual([p[0].id, p[2].id]);
    const f = front(p), exported = f.exportState(); expect(exported.points[1].carrierSupport).toEqual(p[1].carrierSupport);
    expect(exported.points[1].carrierSupport).not.toBe(f.points[1].carrierSupport); expect(exported.points[1].carrierSupport?.incidents[0]).not.toBe(f.points[1].carrierSupport?.incidents[0]);
    const imported = front(exported.points); expect(imported.points[1].carrierSupport).not.toBe(exported.points[1].carrierSupport);
    const originalBound = f.points[1].carrierSupport!.incidents[0].boundSeconds;
    (exported.points[1].carrierSupport!.incidents[0] as { boundSeconds: number }).boundSeconds = 999;
    expect(f.points[1].carrierSupport!.incidents[0].boundSeconds).toBe(originalBound); expect(imported.points[1].carrierSupport!.incidents[0].boundSeconds).toBe(originalBound);
    (exported.points[1].carrierSupport! as { state: string }).state = 'released';
    expect(f.points[1].carrierSupport!.state).toBe('incident-support'); expect(imported.points[1].carrierSupport!.state).toBe('incident-support');
    const heldInput = { nextId: 1000, nextFront: 100, points: [], held: [p[1]], tracks: [] }, heldFront = new BreakingFront(2, timing, {}, support);
    heldFront.importState(heldInput); const heldExport = heldFront.exportState();
    (heldExport.held[0].carrierSupport!.incidents[0] as { partitions: number }).partitions = 999;
    expect(heldFront.exportState().held[0].carrierSupport!.incidents[0].partitions).not.toBe(999);
    (heldInput.held[0].carrierSupport!.incidents[0] as { boundSeconds: number }).boundSeconds = 888;
    expect(heldFront.exportState().held[0].carrierSupport!.incidents[0].boundSeconds).toBe(originalBound);
    const coastBefore = f.points.map(p => ({ id: p.id, z: p.z })); f.update([], 0, 1 + 1 / 60);
    expect(f.coasted).toBe(3); expect(f.points.map(p => p.id)).toEqual(coastBefore.map(p => p.id));
    for (const a of coastBefore) expect(f.points.find(p => p.id === a.id)!.z - a.z).toBeCloseTo(4 / 60, 10);
    expect(f.points[1].carrierSupport?.state).toBe('incident-support');
    p[0].front = 2; support.refresh(p, 2); expect(p[1].carrierSupport?.incidents.map(i => i.otherId)).toEqual([p[2].id]);
    support.refresh([p[1]], 3); expect(p[1].carrierSupport?.state).toBe('released'); expect(geometricPaceActive(p[1])).toBe(false);
    support.refreshHeld([p[1]], 3); expect(p[1].carrierSupport?.incidents).toEqual([]);
    expect(Number.isNaN(packet([p[1]])[FRONT_FIELD.pace])).toBe(true);
    const unformed = point(3); unformed.tau = -.2; delete unformed.jetPace; delete unformed.jetBase; delete unformed.jetUntil; delete unformed.jetAt;
    const expired = point(2); expired.tau = expired.jetUntil! + .01; support.refresh([expired, unformed], 3);
    expect(expired.carrierSupport?.incidents[0].minimumPacketAge).toBeLessThan(0); expect(expired.carrierSupport?.state).toBe('incident-support'); expect(unformed.carrierSupport).toBeUndefined();
    expired.tau += .01; expect(geometricPaceActive(expired)).toBe(false); support.refresh([expired, unformed], 3); expect(geometricPaceActive(expired)).toBe(true);
  });
  it('certifies retirement before reacquisition and keeps unaffected live points paced through arc/clock remeasurement', () => {
    const ownTimes = lib.profileTimes({ slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 });
    const middleAge = ownTimes.touchdownSeconds + ownTimes.collapseSeconds / 2;
    const p = Array.from({ length: 15 }, (_, k) => point(k, 7, c.nonlinearity * 7, middleAge - .02));
    const bound = lib.carrierRetirementBound(c.slope, p[0], p[1]).seconds;
    for (let k = 0; k < 5; k++) p[k].tau = bound + .05;
    for (let k = 0; k < p.length; k++) { p[k].x *= 2; p[k].sigma *= 2; p[k].z = p[k].jetBase! + p[k].jetPace! * p[k].tau; p[k].seen = 1; }
    // Keep a single linked front before release; aged coordinates are only slightly different here.
    for (let k = 0; k < p.length; k++) {
      p[k].jetBase = p[k].throwZ = 40 - 4 * p[k].tau; p[k].z = 40;
      p[k].thrown = 1 - middleAge + .003 * (10 - k); p[k].broke = p[k].thrown! - .02; p[k].joined = p[k].thrown! - .03;
    }
    const f = front(p), baseline = front(p.map(p => ({ ...p }))); support.refresh(f.points, 1); expect(f.points[0].carrierSupport?.state).toBe('released'); expect(f.points[4].carrierSupport?.state).toBe('incident-support');
    const dt = 1 / 60, samples = f.points.map((p, k) => sample(p, 40 + (k < 4 ? .2 : 0)));
    f.update(samples, samples.length, 1 + dt);
    baseline.update(baseline.points.map(p => sample(p, 40)), p.length, 1 + dt);
    expect(new Set(f.points.map(p => p.front)).size).toBe(1); expect(new Set(baseline.points.map(p => p.front)).size).toBe(1);
    expect(f.points[0].z).toBe(40.2); expect(f.points.find(p => p.id === 104)!.z).toBeCloseTo(40 + 4 * dt, 10);
    const liveBefore = f.points.filter(p => p.id >= 108).map(p => ({ id: p.id, tau: p.tau, until: p.jetUntil, pace: p.jetPace, base: p.jetBase }));
    advanceClocks(f.points, 1 + dt, timing);
    advanceClocks(baseline.points, 1 + dt, timing);
    const solver = basin(), baselineSolver = basin(); solver.time = baselineSolver.time = 1 + dt;
    new SweptCrash(lib, c.slope).update(f.points, sea(solver)); new SweptCrash(lib, c.slope).update(baseline.points, sea(baselineSolver));
    for (const a of liveBefore) { const current = f.points.find(p => p.id === a.id)!; expect(current.tau).toBeGreaterThan(a.tau); expect(current.jetUntil).toBe(a.until); expect(current.jetPace).toBe(a.pace); expect(current.jetBase).toBe(a.base); expect(current.z).toBe(a.base! + a.pace! * current.tau); }
    const releaseResiduals = f.points.filter(p => p.id >= 105).map(p => ({ id: p.id, tauResidual: p.tau - baseline.points.find(q => q.id === p.id)!.tau, zResidual: p.z - baseline.points.find(q => q.id === p.id)!.z }));
    for (const residual of releaseResiduals) { expect(Math.abs(residual.tauResidual)).toBeLessThan(.002); expect(Math.abs(residual.zResidual)).toBeLessThan(.008); }
    for (const residual of releaseResiduals.filter(p => p.id >= 108)) expect(Math.abs(residual.zResidual)).toBeLessThan(1e-10);
    const releasedLoft = new SweptLoft(lib, c.slope, { sheet: false }).build(packet(f.points), f.points.length, 0, () => 0);
    const baselineLoft = new SweptLoft(lib, c.slope, { sheet: false }).build(packet(baseline.points), baseline.points.length, 0, () => 0);
    const roofResiduals = [13, 17, 21].map(x => {
      const a = landmarks(releasedLoft, x), b = landmarks(baselineLoft, x);
      expect([...a.weights, ...b.weights].every(w => w > 0)).toBe(true); expect(a.phases).toEqual(b.phases);
      expect(a.phases).toEqual([2, 2]); expect([...a.overturned, ...b.overturned].every(v => v > 0)).toBe(true);
      const z = a.z.map((v, k) => v - b.z[k]), y = a.y.map((v, k) => v - b.y[k]);
      for (const residual of z) expect(Math.abs(residual)).toBeLessThan(.01); for (const residual of y) expect(Math.abs(residual)).toBeLessThan(.01);
      return { x, a, b, zResiduals: z, yResiduals: y };
    });
    const allDead = [point(0), point(1)]; for (const p of allDead) p.tau = bound + .05;
    support.refresh(allDead, 1); expect(allDead.every(p => p.carrierSupport?.state === 'released')).toBe(true);
    const l = new SweptLoft(lib, c.slope, { sheet: false }).build(packet(allDead), allDead.length, 0, () => 0); expect(l.sliceCount).toBe(0); expect(l.indexCount).toBe(0);
    metrics.release = { bound, liveBefore, releaseResiduals, roofResiduals, liveAfter: f.points.filter(p => p.id >= 108).map(p => ({ id: p.id, tau: p.tau, z: p.z, history: p.carrierSupport })), globalContinuityProof: false };
  });
  it('prevents actual budgeted C clock lowering from reviving dead support while RAW budget behavior is exact', () => {
    const times = lib.profileTimes({ slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 }), age = times.clearSeconds;
    const p = [point(0), point(1), point(2), point(3), point(4)];
    Object.assign(p[0], { x: 0, sigma: 0, tau: age }); Object.assign(p[1], { x: 10, sigma: 10, tau: age }); Object.assign(p[2], { x: 20, sigma: 20, tau: 100 });
    Object.assign(p[3], { front: 2, x: 200, sigma: 0, tau: age, z: 140 }); Object.assign(p[4], { front: 2, x: 420, sigma: 220, tau: age, z: 140 });
    const r = packet(p), fresh = new SweptLoft(lib, c.slope, { sheet: false }).build(r, p.length, 0, () => 0), prior = new ParentLoft(priorLib, c.slope, { sheet: false }).build(r, p.length, 0, () => 0);
    const dead = (l: LoftResult) => Array.from({ length: l.sliceCount }, (_, k) => k).filter(k => l.sliceFront[k] === 1 && collapseFade(l.sliceSigma[k] <= 10 ? age : age + (100 - age) * (l.sliceSigma[k] - 10) / 10, times.touchdownSeconds, times.collapseSeconds) === 0);
    expect(prior.clamps).toBeGreaterThan(0); expect(dead(prior).length).toBeGreaterThan(0);
    const flatDead = dead(fresh); expect(flatDead).toHaveLength(1);
    for (const row of flatDead) {
      expect(fresh.sliceFade[row]).toBe(0); expect(fresh.sliceWeight[row]).toBe(0); expect(fresh.sliceFormed[row]).toBe(0);
      const x = fresh.positions[3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest)];
      const fraction = (x - r[FRONT_STRIDE + FRONT_FIELD.x]) / (r[2 * FRONT_STRIDE + FRONT_FIELD.x] - r[FRONT_STRIDE + FRONT_FIELD.x]);
      const intrinsicTau = r[FRONT_STRIDE + FRONT_FIELD.tau] + fraction * (r[2 * FRONT_STRIDE + FRONT_FIELD.tau] - r[FRONT_STRIDE + FRONT_FIELD.tau]);
      expect(fresh.sliceTau[row]).toBe(Math.fround(intrinsicTau));
      for (let j = 0; j < LOFT_SAMPLES; j += 1) {
        const v = row * LOFT_SAMPLES + j;
        expect(fresh.positions[3 * v + 1]).toBe(0); expect(fresh.mask[v]).toBe(0); expect(fresh.lift[v]).toBe(0);
        expect(fresh.sheetWeight[v]).toBe(0); expect(fresh.throat[4 * v + 3]).toBe(0);
      }
    }
    for (const contact of [false, true]) { const next = new SweptLoft(new ProfileLibrary([tubeCase(.2), tubeCase(.4)]), .05, { contact, sheet: false }).build(r, p.length, 0, () => 0), parent = new ParentLoft(new ParentLibrary([tubeCase(.2), tubeCase(.4)]), .05, { contact, sheet: false }).build(r, p.length, 0, () => 0);
      expect(next.sliceCount).toBe(parent.sliceCount); expect(next.indexCount).toBe(parent.indexCount); expect(next.clamps).toBe(parent.clamps);
      for (const key of ['positions', 'normals', 'indices', 'sliceTau', 'sliceJoined', 'sliceWeight', 'sliceAnchorVZ'] as const) expect(new Uint8Array(next[key].buffer)).toEqual(new Uint8Array(parent[key].buffer));
    }
    metrics.budget = { actualBudgetTriggered: true, priorClamps: prior.clamps, priorRevivedDeadRows: dead(prior).length, nextRevivedDeadRows: flatDead.filter(row => fresh.sliceWeight[row] > 0).length, retainedFlatDeadRows: flatDead.length, deadClockWordUnclamped: true, rawDrawAndContactByteParity: true };
  }, 20000);
  it('retires a physically expired stalled dependent component coherently, without water/air or unrelated removal', () => {
    const p = [point(0, 1), point(1, 9)]; for (const a of p) a.tau = a.jetUntil! + .01;
    support.refresh(p, 1); const bound = p[0].carrierSupport!.incidents[0].boundSeconds;
    const unrelated = point(2); Object.assign(unrelated, { front: 2, jetAt: 2 * bound, x: 20 });
    const solver = basin(); solver.time = 2 * bound + .01; const s = sea(solver), water = solver.h.slice();
    const hold = vi.spyOn(s.lip, 'holdJet'), air = vi.fn(); s.lip.onAir = air;
    const crash = new SweptCrash(lib, c.slope), all = [...p, unrelated]; expect(crash.update(all, s)).toEqual({ throws: 0, volume: 0 });
    expect(crash.carrierExited.map(p => p.id)).toEqual(p.map(p => p.id)); expect(crash.carrierRetirements).toHaveLength(1); expect(all.map(p => p.id)).toEqual([unrelated.id]);
    const retiredComponent = crash.carrierRetirements.map(c => ({ ...c, pointIds: [...c.pointIds] }));
    expect(solver.h).toEqual(water); expect(hold).not.toHaveBeenCalled(); expect(air).not.toHaveBeenCalled(); expect(s.lip.airborneVolume()).toBe(0);
    const active = point(0); active.tau = .01; solver.time = 100; const one = [active]; crash.update(one, s); expect(one).toHaveLength(0); expect(crash.exited.map(p => p.id)).toEqual([active.id]); expect(crash.carrierExited).toHaveLength(0);
    metrics.stall = { component: retiredComponent, bound, noAdditionalWaterOrAir: true, originalOwnPocketStallRetained: true };
  });
  it('keeps funded water and once-sealed air expiry on the individual pocket while geometric support remains', () => {
    const solver = basin(), lip = new PlungingLip(solver, 16384, 1), s = sea(solver, lip), crash = new SweptCrash(lib, c.slope);
    for (let row = 15; row < 40; row++) for (let x = 0; x < solver.nx; x++) solver.h[row * solver.nx + x] += .8;
    const p = Array.from({ length: 9 }, (_, k) => point(k));
    for (const a of p) { delete a.jetPace; delete a.jetBase; delete a.jetUntil; delete a.jetAt; delete a.jetStrip; delete a.crashedAt; a.tau = 0; a.z = a.throwZ = 40; a.crestSpeed = 4; }
    const water = () => solver.h.reduce((n, h, i) => n + h * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0), initialWater = water();
    const hold = vi.spyOn(lip, 'holdJet'), voids = vi.spyOn(lip, 'setSweptVoid'); let emitted = 0;
    lip.onAir = (_x, _z, amount) => { emitted += amount; };
    const dt = 1 / 120, bound = lib.carrierRetirementBound(c.slope, p[0], p[1]).seconds;
    let ownUntil = 0, trappedOnce = 0, supportOnlyFrames = 0;
    const step = (age: number) => {
      for (const a of p) a.tau = age; solver.time += dt; voids.mockClear(); crash.update(p, s);
      if (!ownUntil) ownUntil = p[4].jetUntil!;
      if (age >= ownUntil && age < bound) {
        expect(p[4].carrierSupport?.state).toBe('incident-support'); expect(crash.curve).toHaveLength(0);
        expect(voids.mock.calls.every(([, v]) => v.area === 0 || v.span === 0)).toBe(true); supportOnlyFrames++;
      }
      if (lip.trappedAir > 0) { if (!trappedOnce) trappedOnce = lip.trappedAir; expect(lip.trappedAir).toBeCloseTo(trappedOnce, 9); }
      lip.step(dt); emitted += lip.spits.reduce((n, e) => n + e.airRate * dt, 0) + lip.eruptions.reduce((n, e) => n + e.airRate * dt, 0);
      expect(emitted + lip.heldAir).toBeCloseTo(lip.trappedAir, 8); expect(water() + lip.airborneVolume() + lip.escapedVolume).toBeCloseTo(initialWater, 8);
    };
    for (let k = 0; k * dt <= bound + 2; k++) step(k * dt);
    expect(supportOnlyFrames).toBeGreaterThan(0); expect(hold).toHaveBeenCalledTimes(7); expect(crash.counts.throws).toBe(7); expect(crash.counts.crashes).toBe(7); expect(crash.counts.starved).toBe(0);
    expect(p.every(a => a.carrierSupport?.state === 'released')).toBe(true); expect(p[4].jetUntil).toBe(ownUntil); expect(lip.heldAir).toBe(0); expect(lip.airborneVolume()).toBe(0); expect(emitted).toBeCloseTo(trappedOnce, 8);
    const funding = crash.counts.thrown; for (let k = 0; k < 8; k++) step(bound + 3 + k * dt);
    expect(crash.counts.thrown).toBe(funding); expect(lip.trappedAir).toBeCloseTo(trappedOnce, 9); expect(emitted).toBeCloseTo(trappedOnce, 8);
    metrics.lifecycle = { ownUntil, bound, supportOnlyFrames, throws: crash.counts.throws, fundedWater: funding, trappedOnce, emitted, heldAir: lip.heldAir, airborneWater: lip.airborneVolume(), onceOnlyFundingAndAir: true };
  }, 20000);
  it('preserves RAW tracker exports, packets and physical crash water/air ledgers against the frozen parent', () => {
    const f = new BreakingFront(2, timing), parent = new ParentFront(2, timing);
    const p = Array.from({ length: 9 }, (_, k) => point(k)); for (const a of p) { delete a.jetPace; delete a.jetBase; delete a.jetUntil; delete a.jetAt; delete a.jetStrip; delete a.crashedAt; a.tau = 0; a.throwZ = 40; a.z = 40; }
    const state = { nextId: 1000, nextFront: 100, points: p, held: [], tracks: [] }; f.importState(state); parent.importState(state);
    const solver = basin(), priorSolver = new ParentSolver({ nx: 48, xMin: 0, dx: 1, zEdges: uniformEdges(0, 240, 120), xBoundary: 'wall' }, () => 12, { manning: 0 }), s = sea(solver);
    const priorSea = { solver: priorSolver, lip: new ParentLip(priorSolver), stillLevel: 0, period: 18, strength: new Float64Array(priorSolver.h.length), whitewater: new Float64Array(priorSolver.h.length) };
    const crash = new SweptCrash(new ProfileLibrary([tubeCase(.2), tubeCase(.4)]), .05), prior = new ParentCrash(new ParentLibrary([tubeCase(.2), tubeCase(.4)]), .05);
    for (const [step, age] of [0, .05, .1, .3, .5, .8, 1.5].entries()) {
      const time = 1 + step / 60, samples = f.points.map(p => sample(p, p.z + .1));
      f.update(samples, samples.length, time); parent.update(samples, samples.length, time);
      for (const a of [...f.points, ...parent.points]) a.tau = age;
      solver.time = priorSolver.time = time; crash.update(f.points, s); prior.update(parent.points, priorSea); s.lip.step(.01); priorSea.lip.step(.01);
      expect(f.exportState()).toEqual(parent.exportState()); expect(crash.counts).toEqual(prior.counts); expect(crash.curve).toEqual(prior.curve); expect(s.lip.exportState()).toEqual(priorSea.lip.exportState());
      for (const key of ['h', 'qx', 'qz'] as const) expect(new Uint8Array(solver[key].buffer)).toEqual(new Uint8Array(priorSolver[key].buffer));
      const a = packet(f.points), b = new Float32Array(a.length); parentRecords(parent.points, b); expect(new Uint32Array(a.buffer)).toEqual(new Uint32Array(b.buffer));
    }
    metrics.raw = { trackerExportEquality: true, solverBytesEquality: true, packetWordsEquality: true, physicalLipLedgerEquality: true, epochs: 7 };
  });
});
