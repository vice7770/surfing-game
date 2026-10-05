import { describe, expect, it } from 'vitest';
import { BreakingFront, type FrontPoint } from './BreakingFront';
import { CarrierSupport } from './carrierSupport';
import type { CrestSample } from './crestOnset';
import { FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { ProfileLibrary, LANDMARK } from './ProfileLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { SweptCrash, type CrashSea } from './SweptCrash';
import { LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from './sweptLoft';
import { advanceClocks, onsetTiming } from './sliceClock';
import { PlungingLip } from '../PlungingLip';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
const cases = readBarrelCases().map(decodeCase), c = cases.find(c => c.id === 'pad19-a30-l12')!;
const lib = new ProfileLibrary(cases, { geometry: 'bounded-C' }), carrier = new CarrierSupport(lib, c.slope), timing = onsetTiming(7, 18);
const ownTimes = lib.profileTimes({ slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 });
const ownUntil = ownTimes.touchdownSeconds + ownTimes.collapseSeconds, middleAge = ownTimes.touchdownSeconds + ownTimes.collapseSeconds / 2;
const bounds = lib.carrierRetirementBound(c.slope, { footHeight: c.nonlinearity * 7, footDepth: 7 }, { footHeight: c.nonlinearity * 7, footDepth: 7 });
const dt = 1 / 60, time = 1 + dt;
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
function run(distance: number) {
  const input = points(), f = tracker(input), baseline = tracker(input);
  carrier.refresh(f.points, 1);
  const samples = f.points.map((p, k) => sample(p, 40 + (k < 4 ? distance : 0)));
  f.update(samples, samples.length, time);
  baseline.update(baseline.points.map(p => sample(p, 40)), input.length, time);
  const beforeFit = f.points.map(p => ({ id: p.id, tau: p.tau }));
  advanceClocks(f.points, time, timing); advanceClocks(baseline.points, time, timing);
  const s = sea(), waterBefore = s.solver.h.slice();
  const crashResult = new SweptCrash(lib, c.slope).update(f.points, s);
  new SweptCrash(lib, c.slope).update(baseline.points, sea());
  const current = new SweptLoft(lib, c.slope, { sheet: false }).build(packet(f.points), f.points.length, 0, () => 0);
  const reference = new SweptLoft(lib, c.slope, { sheet: false }).build(packet(baseline.points), baseline.points.length, 0, () => 0);
  const crestX = (l: LoftResult) => Array.from({ length: l.sliceCount }, (_, row) =>
    l.positions[3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest)]);
  const currentX = crestX(current), referenceX = crestX(reference);
  const currentPacket = packet(f.points), referencePacket = packet(baseline.points);
  expect(currentX).toEqual(referenceX);
  for (const x of [11, 13, 17, 21]) {
    const ri = f.points.findIndex(p => p.x === x), row = currentX.indexOf(x);
    expect(row).toBeGreaterThanOrEqual(0);
    expect(current.sliceTau[row]).toBe(currentPacket[ri * FRONT_STRIDE + 4]);
    const bi = baseline.points.findIndex(p => p.x === x), br = referenceX.indexOf(x);
    expect(reference.sliceTau[br]).toBe(referencePacket[bi * FRONT_STRIDE + 4]);
    expect(current.sliceTau[row] - reference.sliceTau[br]).toBe(currentPacket[ri * FRONT_STRIDE + 4] - referencePacket[bi * FRONT_STRIDE + 4]);
  }
  for (const x of [13, 17, 21]) {
    const a = station(current, x), b = station(reference, x);
    expect(a.available && a.positivePhase2Roof).toBe(true);
    expect(b.available && b.positivePhase2Roof).toBe(true);
  }
  expect(f.points.map(p => p.id)).toEqual(input.map(p => p.id));
  expect(new Set(f.points.map(p => p.front)).size).toBe(1);
  for (const p of f.points) {
    const original = input.find(q => q.id === p.id)!;
    expect([p.jetBase, p.jetPace, p.jetUntil, p.jetAt]).toEqual([original.jetBase, original.jetPace, original.jetUntil, original.jetAt]);
    expect(Number.isFinite(p.tau - baseline.points.find(q => q.id === p.id)!.tau)).toBe(true);
    expect(p.tau).toBeGreaterThanOrEqual(beforeFit.find(q => q.id === p.id)!.tau);
  }
  expect(current.rayInvalidIntervals).toBe(0);
  expect(current.vertexCount).toBeLessThanOrEqual(LOFT.budget);
  expect(crashResult).toEqual({ throws: 0, volume: 0 }); expect(s.solver.h).toEqual(waterBefore);
  for (const p of f.points.filter(p => p.id >= 104)) expect(p.z).toBe(p.jetBase! + p.jetPace! * p.tau);
  for (const p of f.points.filter(p => p.id >= 108)) expect(p.tau).toBeGreaterThan(input.find(q => q.id === p.id)!.tau);
}

describe('synthetic carrier release with surviving fixed-X roof stations', () => {
  // These explicit offsets exercise small/large returns within the tracker's 4m match reach.
  // They are controlled parameters, not measurements from a native replay.
  it.each([0.2, 2.6, 2.8, -2.6, -2.8])('preserves identity, phase-2 roof and mandatory clocks after a %sm released-end move', run);
});
