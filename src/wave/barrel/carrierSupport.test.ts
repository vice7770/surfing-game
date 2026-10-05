import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const cases = readBarrelCases().map(decodeCase), c = cases.find(c => c.id === 'pad19-a30-l12')!;
const lib = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const support = new CarrierSupport(lib, c.slope), timing = onsetTiming(7, 18);
afterEach(() => vi.restoreAllMocks());
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
    expect(() => new CarrierSupport(new ProfileLibrary([tubeCase(.2)]), c.slope)).toThrow('C-only');
  });
  it('retains interior-only support when both individual endpoints have retired', () => {
    const a = point(0, 1), b = point(1, 9); a.tau = a.jetUntil! + .01; b.tau = b.jetUntil! + .01;
    const interiorTau = (a.tau + b.tau) / 2, interiorRetirement = retirement((a.footHeight + b.footHeight) / 2, 5);
    expect(a.tau).toBeGreaterThan(a.jetUntil!); expect(b.tau).toBeGreaterThan(b.jetUntil!); expect(interiorTau).toBeLessThan(interiorRetirement);
    const own = [a.jetUntil, b.jetUntil]; support.refresh([a, b], 1);
    for (const p of [a, b]) { expect(p.carrierSupport?.ownPocketAlive).toBe(false); expect(p.carrierSupport?.state).toBe('incident-support'); expect(geometricPaceActive(p)).toBe(true); }
    expect([a.jetUntil, b.jetUntil]).toEqual(own); expect(Array.from(packet([a, b])).filter((_, i) => i % FRONT_STRIDE === FRONT_FIELD.pace)).toEqual([4, 4]);

  });
  it('preserves captured X16.25 phase2 and keeps a controlled expired endpoint as geometric support', () => {
    // Only packet words are replayed; this flat CPU basin is not a native heightfield replay.
    type CapturedRow = { x: number; z: number; front: number; sigma: number; tau: number; footHeight: number; footDepth: number; throwZ: number | null; pace: number | null };
    const fixture = JSON.parse(readFileSync(new URL('./retirementBoundary.fixture.json', import.meta.url), 'utf8')) as {
      epochs: { locked: { stationX: number }; packetRows: CapturedRow[] }[];
    };
    for (const epoch of fixture.epochs) {
      expect(epoch.locked.stationX).toBe(16.25);
      const records = Float32Array.from(epoch.packetRows.flatMap(row => [row.x, row.z, row.front, row.sigma, row.tau,
        row.footHeight, row.footDepth, row.throwZ ?? NaN, row.pace ?? NaN]));
      const words = records.slice(), raw15 = epoch.packetRows.find(row => row.x === 15)!;
      const ownTimes = lib.profileTimes({ slope: c.slope, footHeight: raw15.footHeight, footDepth: raw15.footDepth });
      expect(collapseFade(raw15.tau, ownTimes.touchdownSeconds, ownTimes.collapseSeconds)).toBeGreaterThan(0);
      const loft = new SweptLoft(lib, c.slope, { sheet: false }).build(records, epoch.packetRows.length, 0, () => 0);
      const fixed = landmarks(loft, epoch.locked.stationX);
      expect(fixed.phases).toEqual([2, 2]); expect(fixed.overturned).toEqual([1, 1]);
      expect(fixed.weights.every(weight => weight > 0)).toBe(true);
      const pair = [raw15, epoch.packetRows.find(row => row.x === 17)!].map((row, k): FrontPoint => ({
        ...point(k, row.footDepth, row.footHeight, row.tau), x: row.x, z: row.z, sigma: row.sigma,
        front: row.front, throwZ: row.throwZ, jetBase: row.throwZ!, jetPace: row.pace!,
        jetUntil: retirement(row.footHeight, row.footDepth), jetAt: 0, jetStrip: -1, crashedAt: 0,
      }));
      // This packet captures a live X15 pocket. Advance only the controlled pair's
      // first endpoint to test expiry; the captured packet words remain untouched.
      pair[0].tau = pair[0].jetUntil! + 1 / 120;
      pair[0].z = pair[0].jetBase! + pair[0].jetPace! * pair[0].tau;
      expect(collapseFade(pair[0].tau, ownTimes.touchdownSeconds, ownTimes.collapseSeconds)).toBe(0);
      const owned = pair.map(p => [p.id, p.jetPace, p.jetBase, p.jetUntil, p.jetAt]);
      support.refresh(pair, 1);
      expect(pair[0].carrierSupport?.ownPocketAlive).toBe(false);
      expect(pair[0].carrierSupport?.state).toBe('incident-support'); expect(geometricPaceActive(pair[0])).toBe(true);
      const controlled = new SweptLoft(lib, c.slope, { sheet: false }).build(packet(pair), pair.length, 0, () => 0);
      const controlledFixed = landmarks(controlled, epoch.locked.stationX);
      expect(controlledFixed.phases).toEqual([2, 2]);
      expect(controlledFixed.weights.every(weight => weight > 0)).toBe(true);
      const solver = basin(-200), s = sea(solver), waterBefore = solver.h.slice(), hold = vi.spyOn(s.lip, 'holdJet');
      solver.time = 1;
      expect(new SweptCrash(lib, c.slope).update(pair, s)).toEqual({ throws: 0, volume: 0 });
      expect(hold).not.toHaveBeenCalled(); expect(solver.h).toEqual(waterBefore);
      expect(s.lip.airborneVolume()).toBe(0); expect(s.lip.trappedAir).toBe(0);
      expect(pair.map(p => [p.id, p.jetPace, p.jetBase, p.jetUntil, p.jetAt])).toEqual(owned);
      expect(pair[0].z).toBe(pair[0].jetBase! + pair[0].jetPace! * pair[0].tau);
      expect(packet(pair)[FRONT_FIELD.pace]).toBe(Math.fround(raw15.pace!));
      expect(records).toEqual(words);
    }
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
    [13, 17, 21].forEach(x => {
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

  });
  it('keeps budgeted C dead support flat and preserves RAW draw/contact arc recipes', () => {
    const times = lib.profileTimes({ slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 }), age = times.clearSeconds;
    const liveJump = times.touchdownSeconds + times.collapseSeconds / 2;
    const p = [point(0), point(1), point(2), point(3), point(4)];
    // A finite live-to-live age jump at a mandatory knot exercises budget clock
    // clamping; the later age-100 endpoint independently exercises dead support.
    Object.assign(p[0], { x: 0, sigma: 0, tau: age }); Object.assign(p[1], { x: .02, sigma: .02, tau: liveJump }); Object.assign(p[2], { x: 20, sigma: 20, tau: 100 });
    Object.assign(p[3], { front: 2, x: 200, sigma: 0, tau: age, z: 140 }); Object.assign(p[4], { front: 2, x: 420, sigma: 220, tau: age, z: 140 });
    const r = packet(p), fresh = new SweptLoft(lib, c.slope, { sheet: false }).build(r, p.length, 0, () => 0);
    const intrinsicAge = (l: LoftResult, row: number) => {
      const x = l.positions[3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest)];
      const left = x <= r[FRONT_STRIDE + FRONT_FIELD.x] ? 0 : FRONT_STRIDE;
      const right = left + FRONT_STRIDE;
      const fraction = Math.max(0, Math.min(1, (x - r[left + FRONT_FIELD.x]) / (r[right + FRONT_FIELD.x] - r[left + FRONT_FIELD.x])));
      return r[left + FRONT_FIELD.tau] + fraction * (r[right + FRONT_FIELD.tau] - r[left + FRONT_FIELD.tau]);
    };
    const dead = (l: LoftResult) => Array.from({ length: l.sliceCount }, (_, k) => k).filter(k => l.sliceFront[k] === 1 && collapseFade(intrinsicAge(l, k), times.touchdownSeconds, times.collapseSeconds) === 0);
    expect(fresh.clamps).toBeGreaterThan(0); expect(fresh.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    expect(fresh.cSampling!.budgetTruncated).toBe(true);
    expect(fresh.cSampling!.retirement.budgetClampedDeadStations).toBe(0);
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
    const raw = new ProfileLibrary([tubeCase(.2), tubeCase(.4)]);
    const drawing = new SweptLoft(raw, .05, { sheet: false }).build(r, p.length, 0, () => 0);
    const contact = new SweptLoft(raw, .05, { contact: true, sheet: false }).build(r, p.length, 0, () => 0);
    expect(drawing.sliceCount).toBe(contact.sliceCount); expect(drawing.clamps).toBeGreaterThan(0);
    expect(drawing.clamps).toBe(contact.clamps); expect(drawing.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    for (const key of ['sliceSigma', 'sliceTau', 'sliceJoined', 'sliceWeight', 'sliceRayX', 'sliceRayZ'] as const) {
      expect(drawing[key].subarray(0, drawing.sliceCount)).toEqual(contact[key].subarray(0, contact.sliceCount));
    }
    expect(drawing.indices.subarray(0, drawing.indexCount)).toEqual(contact.indices.subarray(0, contact.indexCount));
    expect(Object.keys(drawing)).not.toContain('cSampling'); expect(Object.keys(contact)).not.toContain('cSampling');
  }, 20000);
  it('retires a physically expired stalled dependent component coherently, without water/air or unrelated removal', () => {
    const p = [point(0, 1), point(1, 9)]; for (const a of p) a.tau = a.jetUntil! + .01;
    support.refresh(p, 1); const bound = p[0].carrierSupport!.incidents[0].boundSeconds;
    const unrelated = point(2); Object.assign(unrelated, { front: 2, jetAt: 2 * bound, x: 20 });
    const solver = basin(); solver.time = 2 * bound + .01; const s = sea(solver), water = solver.h.slice();
    const hold = vi.spyOn(s.lip, 'holdJet'), air = vi.fn(); s.lip.onAir = air;
    const crash = new SweptCrash(lib, c.slope), all = [...p, unrelated]; expect(crash.update(all, s)).toEqual({ throws: 0, volume: 0 });
    expect(crash.carrierExited.map(p => p.id)).toEqual(p.map(p => p.id)); expect(crash.carrierRetirements).toHaveLength(1); expect(all.map(p => p.id)).toEqual([unrelated.id]);
    expect(solver.h).toEqual(water); expect(hold).not.toHaveBeenCalled(); expect(air).not.toHaveBeenCalled(); expect(s.lip.airborneVolume()).toBe(0);
    const active = point(0); active.tau = .01; solver.time = 100; const one = [active]; crash.update(one, s); expect(one).toHaveLength(0); expect(crash.exited.map(p => p.id)).toEqual([active.id]); expect(crash.carrierExited).toHaveLength(0);

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

  }, 20000);
  it('keeps RAW tracker state isolated and encodes individual pocket expiry without carrier history', () => {
    const f = new BreakingFront(2, timing);
    const p = Array.from({ length: 9 }, (_, k) => point(k));
    for (const a of p) {
      delete a.jetPace; delete a.jetBase; delete a.jetUntil; delete a.jetAt; delete a.jetStrip; delete a.crashedAt;
      a.tau = 0; a.throwZ = 40; a.z = 40;
    }
    const state = { nextId: 1000, nextFront: 100, points: p, held: [], tracks: [] };
    f.importState(state);
    const imported = f.exportState();
    expect(imported).toEqual(state); expect(imported.points[0]).not.toBe(state.points[0]);
    imported.points[0].z = -999; state.points[0].z = -888;
    expect(f.points[0].z).toBe(40);
    const solver = basin(), s = sea(solver), raw = new ProfileLibrary([tubeCase(.2), tubeCase(.4)]);
    const crash = new SweptCrash(raw, .05), beforeWater = solver.h.reduce((sum, h, i) => sum + h * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0);
    let owned: { id: number; pace: number; base: number; until: number; at: number; strip: number }[] = [];
    const hold = vi.spyOn(s.lip, 'holdJet'); let fundingCalls = 0;
    for (const [step, age] of [0, .05, .1, .3, .5, .8, 1.5].entries()) {
      const time = 1 + step / 60, samples = f.points.map(p => sample(p, p.z + .1));
      f.update(samples, samples.length, time);
      for (const a of f.points) a.tau = age;
      solver.time = time; crash.update(f.points, s);
      const identities = f.points.map(p => ({ id: p.id, pace: p.jetPace!, base: p.jetBase!, until: p.jetUntil!, at: p.jetAt!, strip: p.jetStrip! }));
      if (step === 0) { owned = identities; fundingCalls = hold.mock.calls.length; expect(fundingCalls).toBeGreaterThan(0); }
      else { expect(identities).toEqual(owned); expect(hold).toHaveBeenCalledTimes(fundingCalls); }
      for (const p of f.points) expect(p.carrierSupport).toBeUndefined();
      const records = packet(f.points), expected = Float32Array.from(f.points.flatMap(p => [p.x, p.z, p.front, p.sigma, p.tau,
        p.footHeight, p.footDepth, p.throwZ ?? NaN, p.tau < p.jetUntil! ? p.jetPace! : NaN]));
      expect(new Uint32Array(records.buffer)).toEqual(new Uint32Array(expected.buffer));
      const exported = f.exportState(); expect(exported.points).toEqual(f.points);
      expect(exported.points.every((p, k) => p !== f.points[k])).toBe(true);
      s.lip.step(.01);
      const water = solver.h.reduce((sum, h, i) => sum + h * solver.dx * solver.dz[Math.floor(i / solver.nx)], 0);
      expect(water + s.lip.airborneVolume() + s.lip.escapedVolume).toBeCloseTo(beforeWater, 8);
      expect(solver.h.every(h => h >= 0 && Number.isFinite(h))).toBe(true);
      expect(solver.qx.every(Number.isFinite)).toBe(true); expect(solver.qz.every(Number.isFinite)).toBe(true);
    }
    expect(crash.counts.thrown + crash.counts.starvedVolume).toBeCloseTo(crash.counts.asked, 10);
  });
});
