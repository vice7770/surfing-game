import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { BreakingFront, type FrontPoint } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/BreakingFront';
import { CarrierSupport } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/carrierSupport';
import type { CrestSample } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/crestOnset';
import { FRONT_STRIDE, writeFrontRecords } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/frontRecords';
import { ProfileLibrary, LANDMARK } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/ProfileLibrary';
import { readBarrelCases } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/nodeBarrelCases';
import { decodeCase } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/profileFormat';
import { SweptCrash, type CrashSea } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/SweptCrash';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/sweptLoft';
import { advanceClocks, onsetTiming } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/barrel/sliceClock';
import { PlungingLip } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/PlungingLip';
import { ShallowWaterSolver, uniformEdges } from '/private/tmp/tube-bounded-c-stable-x-sampling-20261005/source/src/wave/ShallowWaterSolver';
const W = '/private/tmp/tube-bounded-c-stable-x-sampling-20261005';
const frozen = '/private/tmp/tube-bounded-c-carrier-support-20261004';
const cases = readBarrelCases().map(decodeCase), c = cases.find(c => c.id === 'pad19-a30-l12')!;
const lib = new ProfileLibrary(cases, { geometry: 'bounded-C' }), carrier = new CarrierSupport(lib, c.slope), timing = onsetTiming(7, 18);
const ownTimes = lib.profileTimes({ slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 });
const ownUntil = ownTimes.touchdownSeconds + ownTimes.collapseSeconds, middleAge = ownTimes.touchdownSeconds + ownTimes.collapseSeconds / 2;
const bounds = lib.carrierRetirementBound(c.slope, { footHeight: c.nonlinearity * 7, footDepth: 7 }, { footHeight: c.nonlinearity * 7, footDepth: 7 });
const dt = 1 / 60, time = 1 + dt;
const fixture = JSON.parse(readFileSync(`${frozen}/handoff-fixture.json`, 'utf8'));
const older = JSON.parse(readFileSync('/private/tmp/tube-parallel-carrier-handoff-audit-20261004/analysis.json', 'utf8'));
const measuredNew = fixture.after.rawRows[0].z - fixture.before.rawRows[0].z, measuredOld = older.rawZDelta[0];
const snapshots: unknown[] = [];
const sourcePin = (path: string) => { const b = readFileSync(path); return { file: path, bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') }; };
const report: Record<string, unknown> = { schema: 'bounded-C-stable-X-real-carrier-release-stress/v1', complete: false, frozenReadiness: sourcePin(`${frozen}/readiness.json`), frozenRuntimePins: JSON.parse(readFileSync(`${frozen}/readiness.json`, 'utf8')).runtimePins,
  measurementInputs: { newer: { distance: measuredNew, fixture: sourcePin(`${frozen}/handoff-fixture.json`), report: fixture.report }, older: { distance: measuredOld, audit: sourcePin('/private/tmp/tube-parallel-carrier-handoff-audit-20261004/analysis.json') } },
  input: { case: c.id, slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7, ownTimes, ownUntil, middleAge, bound: bounds, solverTimeBefore: 1, solverTimeAfter: time, dt,
    rawPoints: 15, retiredPoints: 'indices 0..4 tau=provider bound+.05; point4 retained by live point5, only0..3 reacquire',
    coordinates: 'X=2*(k+.5), Z=40 at initial epoch; sigma=2*k; bases are constructed as40-4*tau for this controlled synthetic fixture',
    physicalHistory: 'throw(k)=1-middleAge+.003*(10-k); broke=throw-.02; joined=throw-.03, chronological',
    pacing: '4m/s fixed original jet pace; base/foot/until/at preserved through trial; no water strips',
    sampledTarget: 'breaking crest samples at Z40+distance for released0..3; retained/live4..14 sampleZ40', heightAt: 'zero flat CPU substrate',
    fixedStations: [10.5, 11, 12, 13, 17, 21], mandatorySurvivingPhase2Stations: [13, 17, 21] },
  limits: ['Synthetic parameter stress from the frozen positive-weight overturned phase2 fixture; not replay of native state or motion.', 'Only handoff DISTANCES are measured capture inputs; other controlled positions, bases, timings and solver substrate are explicitly synthetic.', 'Negative return cases are source-supported hypothetical solver reacquisition within the same match reach, not observed native return.', 'No arbitrary numerical success tolerance: report every clock/XYZ/weight/topology residual; passing identity/lifetime/phase gates is not broad visual continuity proof.', 'No build/native/browser/resource/port/Git/repository/frozen-file mutation or adoption claim.'], trials: snapshots };
afterAll(() => { report.complete = snapshots.length === 5; writeFileSync(`${W}/stress-result.json`, JSON.stringify(report, null, 2) + '\n'); });
function points(): FrontPoint[] {
  return Array.from({ length: 15 }, (_, k) => {
    const tau = k < 5 ? bounds.seconds + .05 : middleAge - .02, thrown = 1 - middleAge + .003 * (10 - k), base = 40 - 4 * tau;
    return { id: 100 + k, front: 1, column: k, x: 2 * (k + .5), z: 40, sigma: 2 * k, b: 0, height: c.nonlinearity * 7,
      joined: thrown - .03, depth: 2, throwDepth: 1.8, crestDepth: 1.8, thrown, throwZ: base, footHeight: c.nonlinearity * 7, footDepth: 7,
      broke: thrown - .02, tau, fresh: null, seen: 1, jetPace: 4, jetBase: base, jetUntil: ownUntil, jetAt: 0, jetStrip: -1, crashedAt: 1 };
  });
}
function tracker(p: FrontPoint[]) { const f = new BreakingFront(2, timing, {}, carrier); f.importState({ nextId: 1000, nextFront: 100, points: p, held: [], tracks: [] }); return f; }
function sample(p: FrontPoint, z: number): CrestSample { return { column: p.column, row: Math.floor(z), x: p.x, z, eta: p.height, wave: p.height, depth: 1.8, strength: .4, rise: .2, b: 0, speed: 4 }; }
function sea(): CrashSea { const solver = new ShallowWaterSolver({ nx: 48, xMin: 0, dx: 1, zEdges: uniformEdges(0, 240, 120), xBoundary: 'wall' }, () => 12, { manning: 0 }); solver.time = time;
  return { solver, lip: new PlungingLip(solver), stillLevel: 0, period: 18, strength: new Float64Array(solver.h.length), whitewater: new Float64Array(solver.h.length) }; }
function packet(p: FrontPoint[]) { const r = new Float32Array(p.length * FRONT_STRIDE); writeFrontRecords(p, r); return r; }
function state(p: FrontPoint[]) { return p.map(p => ({ id: p.id, front: p.front, column: p.column, x: p.x, z: p.z, sigma: p.sigma, tau: p.tau, joined: p.joined, broke: p.broke, thrown: p.thrown,
  jetPace: p.jetPace, jetBase: p.jetBase, jetUntil: p.jetUntil, jetAt: p.jetAt, history: p.carrierSupport })); }
function row(l: LoftResult, s: number) { return { row: s, front: l.sliceFront[s], sigma: l.sliceSigma[s], tau: l.sliceTau[s], phase: l.slicePhase[s], joined: l.sliceJoined[s], weight: l.sliceWeight[s], fade: l.sliceFade[s], overturned: l.sliceOverturned[s],
  landmarks: [LANDMARK.crest, LANDMARK.lip, LANDMARK.toe].map(i => Array.from(l.positions.subarray(3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + i), 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + i) + 3))) }; }
function station(l: LoftResult, x: number) {
  const cx = (s: number) => l.positions[3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest)];
  for (let s = 0; s + 1 < l.sliceCount; s++) if (l.sliceJoined[s] && cx(s) <= x && x < cx(s + 1)) {
    const a = row(l, s), b = row(l, s + 1), fraction = (x - cx(s)) / (cx(s + 1) - cx(s));
    return { available: true as const, x, fraction, a, b, xyz: a.landmarks.map((v, i) => v.map((value, axis) => value + fraction * (b.landmarks[i][axis] - value))),
      tau: a.tau + fraction * (b.tau - a.tau), weight: a.weight + fraction * (b.weight - a.weight), positivePhase2Roof: a.phase === 2 && b.phase === 2 && !!a.overturned && !!b.overturned && a.weight > 0 && b.weight > 0 };
  }
  return { available: false as const, x, reason: 'no-current-joined-fixed-X-bracket' };
}
function topology(l: LoftResult) { return { slices: l.sliceCount, indices: l.indexCount, joinedRows: Array.from(l.sliceJoined.subarray(0, l.sliceCount)), fronts: Array.from(l.sliceFront.subarray(0, l.sliceCount)),
  phase2JoinedRows: Array.from({ length: l.sliceCount }, (_, s) => s).filter(s => l.sliceJoined[s] && l.slicePhase[s] === 2), rayInvalidIntervals: l.rayInvalidIntervals, rayMinAdvance: l.rayMinAdvance }; }
function run(distance: number, label: string) {
  const input = points(), f = tracker(input), baseline = tracker(input), before = state(f.points); carrier.refresh(f.points, 1);
  const samples = f.points.map((p, k) => sample(p, 40 + (k < 4 ? distance : 0)));
  f.update(samples, samples.length, time); baseline.update(baseline.points.map(p => sample(p, 40)), input.length, time);
  const afterTracker = state(f.points), beforeFit = f.points.map(p => ({ id: p.id, tau: p.tau }));
  const paused = advanceClocks(f.points, time, timing), baselinePaused = advanceClocks(baseline.points, time, timing), afterClocks = state(f.points);
  const s = sea(), baselineSea = sea(), crash = new SweptCrash(lib, c.slope), baselineCrash = new SweptCrash(lib, c.slope);
  const waterBefore = s.solver.h.slice(), crashResult = crash.update(f.points, s), baselineCrashResult = baselineCrash.update(baseline.points, baselineSea);
  const current = new SweptLoft(lib, c.slope, { sheet: false }).build(packet(f.points), f.points.length, 0, () => 0), reference = new SweptLoft(lib, c.slope, { sheet: false }).build(packet(baseline.points), baseline.points.length, 0, () => 0);
  const pointResiduals = f.points.map(p => { const q = baseline.points.find(q => q.id === p.id); return { id: p.id, preserved: !!q, frontChanged: q ? p.front !== q.front : true, sigma: q ? p.sigma - q.sigma : null, tau: q ? p.tau - q.tau : null, z: q ? p.z - q.z : null,
    advance: p.tau - beforeFit.find(q => q.id === p.id)!.tau, ownAlive: p.tau < p.jetUntil!, history: p.carrierSupport }; });
  const stations = [10.5, 11, 12, 13, 17, 21].map(x => { const a = station(current, x), b = station(reference, x); return { x, current: a, reference: b,
    xyzResidual: a.available && b.available ? a.xyz.map((v, i) => v.map((value, axis) => value - b.xyz[i][axis])) : null,
    tauResidual: a.available && b.available ? a.tau - b.tau : null, weightResidual: a.available && b.available ? a.weight - b.weight : null }; });
  const trial = { label, distance, sourceSupportedMatchReach: 4, before, samples, afterTracker, afterClocks, afterCrash: state(f.points), baselineAfterCrash: state(baseline.points), paused, baselinePaused,
    crashResult, baselineCrashResult, pointResiduals, stations, topology: topology(current), baselineTopology: topology(reference), identityPreserved: f.points.map(p => p.id).join() === input.map(p => p.id).join(),
    sameFrontPreserved: new Set(f.points.map(p => p.front)).size === 1, immutablePacePreserved: f.points.every(p => { const original = input.find(q => q.id === p.id)!; return p.jetBase === original.jetBase && p.jetPace === original.jetPace && p.jetUntil === original.jetUntil && p.jetAt === original.jetAt; }),
    mandatoryRoofPreserved: stations.filter(s => [13, 17, 21].includes(s.x)).every(s => s.current.available && s.current.positivePhase2Roof && s.reference.available && s.reference.positivePhase2Roof),
    resourceScope: 'single ordinary CPU tracker/fitted-clock/crash update and two finite loft builds; no advance of live game/native state' };
  const crestX = (l: LoftResult) => Array.from({ length: l.sliceCount }, (_, row) => l.positions[3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest)]);
  const currentX = crestX(current), referenceX = crestX(reference), currentPacket = packet(f.points), referencePacket = packet(baseline.points);
  expect(currentX).toEqual(referenceX);
  for (const x of [11, 13, 17, 21]) {
    const ri = f.points.findIndex(p => p.x === x), row = currentX.indexOf(x);
    expect(row).toBeGreaterThanOrEqual(0);
    expect(current.sliceTau[row]).toBe(currentPacket[ri * FRONT_STRIDE + 4]);
    const bi = baseline.points.findIndex(p => p.x === x), br = referenceX.indexOf(x);
    expect(reference.sliceTau[br]).toBe(referencePacket[bi * FRONT_STRIDE + 4]);
    expect(current.sliceTau[row] - reference.sliceTau[br]).toBe(currentPacket[ri * FRONT_STRIDE + 4] - referencePacket[bi * FRONT_STRIDE + 4]);
  }
  Object.assign(trial, { stableX: { currentX, referenceX, mandatoryLiveKnots: [11, 13, 17, 21], rawKnotAgeResidualIsExactPacketWordResidual: true,
    currentDiagnostics: current.cSampling, referenceDiagnostics: reference.cSampling,
    localSigmaDifferences: currentX.map((x, row) => ({ x, current: row ? current.sliceSigma[row] - current.sliceSigma[row - 1] : 0,
      reference: row ? reference.sliceSigma[row] - reference.sliceSigma[row - 1] : 0,
      residual: row ? (current.sliceSigma[row] - current.sliceSigma[row - 1]) - (reference.sliceSigma[row] - reference.sliceSigma[row - 1]) : 0 })) },
    continuityToleranceApplied: false, providerOrContinuousRetirementRootClaim: false });
  snapshots.push(trial); writeFileSync(`${W}/stress-result.json`, JSON.stringify(report, null, 2) + '\n');
  expect(trial.identityPreserved).toBe(true); expect(trial.sameFrontPreserved).toBe(true); expect(trial.immutablePacePreserved).toBe(true); expect(trial.mandatoryRoofPreserved).toBe(true);
  expect(current.rayInvalidIntervals).toBe(0); expect(crashResult).toEqual({ throws: 0, volume: 0 }); expect(s.solver.h).toEqual(waterBefore);
  for (const p of f.points.filter(p => p.id >= 104)) expect(p.z).toBe(p.jetBase! + p.jetPace! * p.tau);
  for (const p of f.points.filter(p => p.id >= 108)) expect(p.tau).toBeGreaterThan(input.find(q => q.id === p.id)!.tau);
  expect(pointResiduals.every(p => p.tau !== null && Number.isFinite(p.tau) && p.advance >= 0)).toBe(true);
  return trial;
}
describe('finite carrier-support release stress (residuals reported without arbitrary tolerances)', () => {
  it('control frozen small +0.2m reacquisition', () => run(.2, 'small-control'));
  it('measured physical-mouth +2.634963989m reacquisition', () => run(measuredNew, 'newer-measured-distance'));
  it('measured prior parallel +2.808105469m reacquisition', () => run(measuredOld, 'older-measured-distance'));
  it('source-supported hypothetical -2.634963989m return', () => run(-measuredNew, 'hypothetical-newer-negative-return'));
  it('source-supported hypothetical -2.808105469m return', () => run(-measuredOld, 'hypothetical-older-negative-return'));
});
