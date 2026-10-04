import { writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { crestMotion } from '../CrestKinematics';
import { GRAVITY } from '../dispersion';
import { PlungingLip } from '../PlungingLip';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import type { FrontPoint } from './BreakingFront';
import { CrashCurve, createCrashSlice } from './crashCurve';
import { FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { SweptCrash, type CrashSea } from './SweptCrash';
import { SweptLoft } from './sweptLoft';
import { tubeCase } from './toyCase';
import { SweptCrash as ParentCrash } from '/private/tmp/tube-bounded-c-parallel-rays-20261004/source/src/wave/barrel/SweptCrash';
import { ShallowWaterSolver as ParentSolver, uniformEdges as parentEdges } from '/private/tmp/tube-bounded-c-parallel-rays-20261004/source/src/wave/ShallowWaterSolver';
import { PlungingLip as ParentLip } from '/private/tmp/tube-bounded-c-parallel-rays-20261004/source/src/wave/PlungingLip';
import { ProfileLibrary as ParentLibrary } from '/private/tmp/tube-bounded-c-parallel-rays-20261004/source/src/wave/barrel/ProfileLibrary';

const metrics: { planar: unknown[]; lifecycle: unknown[]; projectedWidth: unknown[] } = { planar: [], lifecycle: [], projectedWidth: [] };
afterAll(() => { if (process.env.PARALLEL_PHYSICAL_METRICS) writeFileSync(process.env.PARALLEL_PHYSICAL_METRICS, JSON.stringify(metrics, null, 2) + '\n'); });
const cases = readBarrelCases().map(decodeCase), c = cases.find(c => c.id === 'pad19-a30-l12')!;
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const query = { slope: c.slope, footHeight: c.nonlinearity * 2, footDepth: 2 }, times = library.profileTimes(query);
const pointsFor = (slope = 0, age = 0, n = 9, centerZ = 60.5): FrontPoint[] => Array.from({ length: n }, (_, k) => ({
  id: k + 100, front: 1, column: k + 18, sigma: k * Math.sqrt(1 + slope * slope), x: k + 18.5,
  z: centerZ + slope * (k - (n - 1) / 2), b: 0, height: .8, joined: 0, depth: 2, throwDepth: 1.8, crestDepth: 1.8,
  thrown: 0, throwZ: centerZ + slope * (k - (n - 1) / 2), footHeight: query.footHeight, footDepth: 2, broke: 0,
  tau: age, fresh: null, seen: 0, crestSpeed: 4,
}));
const sea = (solver: ShallowWaterSolver, lip = new PlungingLip(solver)): CrashSea => ({ solver, lip, stillLevel: 0, period: 16,
  strength: new Float64Array(solver.h.length), whitewater: new Float64Array(solver.h.length) });
function planar(nz: number, sign = 1, speed = 4) {
  const nx = sign * Math.sqrt(1 - nz * nz), slope = -nx / nz;
  const solver = new ShallowWaterSolver({ nx: 48, xMin: 0, dx: 1, zEdges: uniformEdges(0, 120, 120), xBoundary: 'wall' }, () => 12, { manning: 0 });
  // Actual travelling planar falling face eta=A-g(n_x X+n_z Z-c_n t), so eta_t=g*c_n.
  const gradient = .025;
  for (let row = 0; row < solver.nz; row++) for (let x = 0; x < solver.nx; x++) {
    const i = row * solver.nx + x;
    solver.h[i] = 12 + .8 - gradient * (nx * (x + .5 - 22.5) + nz * (solver.zCenters[row] - 60.5));
    solver.surfaceRiseRate[i] = gradient * speed;
  }
  return { solver, points: pointsFor(slope), nx, nz, slope };
}
const water = (s: ShallowWaterSolver) => s.h.reduce((n, h, i) => n + h * s.dx * s.dz[Math.floor(i / s.nx)], 0);

describe('parallel C physical normal and extrusion width', () => {
  for (const nz of [1, .8, Math.SQRT1_2, .3]) for (const sign of [-1, 1]) {
    it(`measures planar physical n_z=${nz},sign=${sign} while C sections remain shoreward`, () => {
      const f = planar(nz, sign), before = f.points.map(p => ({ z: p.z, cell: f.solver.cellIndex(p.x, p.z) }));
      for (const p of f.points) {
        const motion = crestMotion(f.solver, f.solver.cellIndex(p.x, p.z))!;
        expect(motion.speed).toBeCloseTo(4, 10); expect(motion.direction.x).toBeCloseTo(f.nx, 10); expect(motion.direction.z).toBeCloseTo(nz, 10);
      }
      const crash = new SweptCrash(library, c.slope); crash.update(f.points, sea(f.solver));
      expect(crash.paced).toHaveLength(f.points.length);
      metrics.planar.push({ expectedNormalZ: nz, normalXSign: sign, centerPace: f.points[4].jetPace, measuredPhysicalZ: crash.paced[4].rayZ, drawRayZ: crash.paced[4].drawRayZ, source: crash.paced[4].physicalDirectionSource });
      for (const [k, p] of f.points.entries()) {
        expect(p.jetPace).toBeCloseTo(4 / Math.max(.5, nz), 10); expect(p.crestZ).toBe(before[k].z);
        expect(crash.paced[k].sourceCell).toBe(before[k].cell); expect(crash.paced[k].physicalDirectionSource).toBe('solver-face');
        expect(crash.paced[k].drawRayZ).toBe(1);
      }
      const curve = new CrashCurve(library, c.slope), rays = curve.prepareRays(f.points, 0, f.points.length);
      expect(curve.ray(f.points, 0, f.points.length, 4, { x: 0, z: 0 }, rays)).toEqual({ x: 0, z: 1 });
      const records = new Float32Array(f.points.length * FRONT_STRIDE); writeFrontRecords(f.points, records);
      const loft = new SweptLoft(library, c.slope).build(records, f.points.length, 0, () => 0);
      expect(loft.rayInvalidIntervals).toBe(0); expect(loft.rayMinAdvance).toBeGreaterThan(0);
      expect(Array.from(loft.sliceRayX.subarray(0, loft.sliceCount)).every(x => x === 0)).toBe(true);
      expect(Array.from(loft.sliceRayZ.subarray(0, loft.sliceCount)).every(z => z === 1)).toBe(true);
    });
  }
  for (const historical of [1, 4, 20, undefined]) it(`clamps historical normal speed before projection: ${historical}`, () => {
    const f = planar(.8, 1, 2); for (const p of f.points) p.crestSpeed = historical;
    const crash = new SweptCrash(library, c.slope); crash.update(f.points, sea(f.solver));
    const wave = Math.sqrt(GRAVITY * (1.8 + .8)), normal = historical === undefined ? wave : Math.min(1.5 * wave, Math.max(.5 * wave, historical));
    for (const p of f.points) expect(p.jetPace).toBeCloseTo(normal / .8, 10);
    expect(crash.counts.paceSlow).toBe(historical === 1 ? 9 : 0); expect(crash.counts.paceFast).toBe(historical === 20 ? 9 : 0);
    expect(crash.counts.paceUnmeasured).toBe(historical === undefined ? 9 : 0);
  });
  it('uses explicit local physical-tangent approximation only when fresh crestMotion is missing', () => {
    for (const slope of [.75, -.75, 3]) {
      const f = planar(1); f.solver.surfaceRiseRate.fill(0); f.points = pointsFor(slope);
      expect(crestMotion(f.solver, f.solver.cellIndex(f.points[4].x, f.points[4].z))).toBeUndefined();
      const crash = new SweptCrash(library, c.slope); crash.update(f.points, sea(f.solver));
      for (const [k, p] of f.points.entries()) {
        expect(p.jetPace).toBeCloseTo(4 / Math.max(.5, 1 / Math.sqrt(1 + slope * slope)), 12);
        expect(crash.paced[k].physicalDirectionSource).toBe('local-front-tangent'); expect(crash.paced[k].drawRayZ).toBe(1);
      }
    }
  });
  it('reads all original source cells/tangents before new throws finalize and never re-paces after relabel', () => {
    const f = planar(.8); f.solver.surfaceRiseRate.fill(0); f.points = pointsFor(.75, Math.min(.1, times.clearSeconds / 2));
    f.points[4].z += .6; for (const p of f.points) p.throwZ = p.z - 2;
    const original = f.points.map(p => ({ ...p })), source = original.map(p => f.solver.cellIndex(p.x, p.z)), lip = new PlungingLip(f.solver);
    const hold = vi.spyOn(lip, 'holdJet'), crash = new SweptCrash(library, c.slope), geometry = (crash as unknown as { geometry: CrashCurve }).geometry;
    const stages: number[][] = [], prepare = geometry.prepareRays.bind(geometry);
    vi.spyOn(geometry, 'prepareRays').mockImplementation((p, start, end, into) => { stages.push(p.slice(start, end).map(p => p.z)); return prepare(p, start, end, into); });
    crash.update(f.points, sea(f.solver, lip)); expect(stages).toHaveLength(2); expect(stages[0]).toEqual(original.map(p => p.z)); expect(stages[1]).toEqual(f.points.map(p => p.z));
    for (const [k, p] of f.points.entries()) {
      const a = original[Math.max(0, k - 1)], b = original[Math.min(original.length - 1, k + 1)], dx = b.x - a.x, dz = b.z - a.z;
      expect(crash.paced[k].rayZ).toBe(dx / Math.sqrt(dx * dx + dz * dz)); expect(crash.paced[k].sourceCell).toBe(source[k]);
      expect(p.z).toBe(p.throwZ! + p.jetPace! * p.tau); expect(p.crestZ).toBe(original[k].z);
    }
    for (const [jet] of hold.mock.calls) expect(jet.cell).toBe(source[f.points.findIndex(p => p.x === jet.launchX)]);
    const paced = f.points.map(p => p.jetPace); for (const p of f.points) { p.front = 71; p.crestSpeed = 20; p.tau += .01; }
    f.solver.surfaceRiseRate.fill(.3); crash.update(f.points, sea(f.solver, lip)); expect(crash.paced).toHaveLength(0); expect(f.points.map(p => p.jetPace)).toEqual(paced);
    expect(f.points[0].jetStrip).toBe(-1); expect(f.points.at(-1)!.jetStrip).toBe(-1);
    for (const p of f.points) expect(p.z).toBe(p.jetBase! + p.jetPace! * p.tau);
  });
  it('uses half-neighbor X spans for C, preserving arc clocks/end weights and exact RAW sigma widths', () => {
    const layouts = [pointsFor(.75), pointsFor(-.75), pointsFor(0).map((p, i) => ({ ...p, x: 10 + i + .2 * i * i, z: 40 + .1 * i * i }))];
    const raw = new CrashCurve(new ProfileLibrary([tubeCase(.2), tubeCase(.4)]), c.slope), column = new CrashCurve(library, c.slope);
    for (const p of layouts) {
      p[0].sigma = 0; for (let i = 1; i < p.length; i++) p[i].sigma = p[i - 1].sigma + Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z);
      const before = p.map(p => ({ ...p }));
      for (let k = 0; k < p.length; k++) {
        const a = column.slice(p, 0, p.length, k, 0, () => 0, createCrashSlice()), b = raw.slice(p, 0, p.length, k, 0, () => 0, createCrashSlice());
        expect(a.width).toBe(((k ? p[k].x - p[k - 1].x : 0) + (k + 1 < p.length ? p[k + 1].x - p[k].x : 0)) / 2);
        expect(b.width).toBe(((k ? p[k].sigma - p[k - 1].sigma : 0) + (k + 1 < p.length ? p[k + 1].sigma - p[k].sigma : 0)) / 2);
        expect(a.endWeight).toBe(b.endWeight);
      }
      expect(p).toEqual(before);
    }
    const p = pointsFor(.75); expect(column.slice(p, 0, 9, 4, 0, () => 0, createCrashSlice()).width).toBe(1);
    expect(raw.slice(p, 0, 9, 4, 0, () => 0, createCrashSlice()).width).toBe(1.25);
    expect(column.slice(p, 0, 9, 0, 0, () => 0, createCrashSlice()).width).toBe(.5);
    expect(raw.slice(p, 0, 9, 0, 0, () => 0, createCrashSlice()).width).toBe(.625);
  });
  it('uniform untapered local area*X span is invariant under obliquity and translation', () => {
    const curve = new CrashCurve(library, c.slope), output = [0, .75, -.75, 1].map(slope => {
      const p = pointsFor(slope, times.clearSeconds).map(p => ({ ...p, x: p.x + 123, z: p.z - 90 }));
      return curve.slice(p, 0, p.length, 4, 0, () => 0, createCrashSlice());
    });
    expect(output[0].weight).toBe(1); expect(output[0].voidArea).toBeGreaterThan(0);
    for (const s of output) { expect(s.width).toBe(1); expect(s.voidArea * s.width).toBe(output[0].voidArea); expect(s.prospectiveJetArea * s.width).toBe(output[0].prospectiveJetArea); }
  });
  it('funding and uniform current-void volume double with projected X span, not sigma arc', () => {
    const read = (spacing: number) => {
      const f = planar(1); f.solver.surfaceRiseRate.fill(0);
      f.points = pointsFor(.75).map((p, k) => ({ ...p, x: 10.5 + spacing * k, column: 10 + spacing * k }));
      const lip = new PlungingLip(f.solver, 16384, 1), hold = vi.spyOn(lip, 'holdJet');
      new SweptCrash(library, c.slope).update(f.points, sea(f.solver, lip));
      const center = hold.mock.calls.map(([jet]) => jet).find(jet => jet.launchX === f.points[4].x)!;
      const curve = new CrashCurve(library, c.slope), current = curve.slice(f.points, 0, f.points.length, 4, 0, () => 0, createCrashSlice(), { tau: times.clearSeconds });
      return { span: center.span, asked: center.volume, currentVolume: current.voidArea * current.width, prospectiveArea: current.prospectiveJetArea, currentArea: current.voidArea };
    };
    const one = read(1), two = read(2); expect(one.currentArea).toBeGreaterThan(0); expect(two.span).toBe(2 * one.span);
    expect(two.asked).toBe(2 * one.asked); expect(two.currentArea).toBe(one.currentArea); expect(two.currentVolume).toBe(2 * one.currentVolume);
    metrics.projectedWidth.push({ one, two, varyingSectionVolumeIntegralClaim: false });
  });
  it('preserves RAW points, pace/rays/width, water/momentum, strip state and packet words against frozen parent', () => {
    const spec = { nx: 48, xMin: 0, dx: 1, zEdges: uniformEdges(0, 120, 120), xBoundary: 'wall' as const };
    const solver = new ShallowWaterSolver(spec, () => 2, { manning: 0 }), donor = new ParentSolver({ ...spec, zEdges: parentEdges(0, 120, 120) }, () => 2, { manning: 0 });
    for (const s of [solver, donor]) for (let z = 54; z < 68; z++) for (let x = 0; x < s.nx; x++) s.h[z * s.nx + x] += .8;
    const lip = new PlungingLip(solver), priorLip = new ParentLip(donor), toy = [tubeCase(.2), tubeCase(.4)];
    const crash = new SweptCrash(new ProfileLibrary(toy), .05), prior = new ParentCrash(new ParentLibrary(toy), .05);
    const p = pointsFor(.75), q = p.map(p => ({ ...p }));
    for (const age of [0, .05, .1, .25, .4, .7, 1.5]) {
      for (const x of [...p, ...q]) x.tau = age;
      crash.update(p, sea(solver, lip)); prior.update(q, { solver: donor, lip: priorLip, stillLevel: 0, period: 16, strength: new Float64Array(donor.h.length), whitewater: new Float64Array(donor.h.length) });
      lip.step(.01); priorLip.step(.01); expect(p).toEqual(q); expect(crash.counts).toEqual(prior.counts); expect(crash.curve).toEqual(prior.curve); expect(crash.paced).toEqual(prior.paced);
      expect(lip.exportState()).toEqual(priorLip.exportState());
      for (const [actual, parent] of [[solver.h, donor.h], [solver.qx, donor.qx], [solver.qz, donor.qz]]) {
        expect(new Uint8Array(actual.buffer, actual.byteOffset, actual.byteLength)).toEqual(new Uint8Array(parent.buffer, parent.byteOffset, parent.byteLength));
      }
      const a = new Float32Array(p.length * FRONT_STRIDE), b = a.slice(); writeFrontRecords(p, a); writeFrontRecords(q, b);
      expect(new Uint32Array(a.buffer)).toEqual(new Uint32Array(b.buffer));
    }
  });
});

function lifecycle(slope: number) {
  const solver = new ShallowWaterSolver({ nx: 48, xMin: 0, dx: 1, zEdges: uniformEdges(0, 90, 90), xBoundary: 'wall' }, () => 2, { manning: 0 });
  for (let z = 44; z < 76; z++) for (let x = 0; x < solver.nx; x++) solver.h[z * solver.nx + x] += .8;
  const lip = new PlungingLip(solver, 16384, 1), crash = new SweptCrash(library, c.slope), points = pointsFor(slope), s = sea(solver, lip);
  const hold = vi.spyOn(lip, 'holdJet'), voids = vi.spyOn(lip, 'setSweptVoid'), before = water(solver), dt = 1 / 120, curve = new CrashCurve(library, c.slope), sealedIDs = new Set<number>(); let emitted = 0, expectedSealedDose = 0;
  lip.onAir = (_x, _z, air) => { emitted += air; };
  function step(age: number) {
    for (const p of points) p.tau = age; solver.time += dt; voids.mockClear(); crash.update(points, s);
    const heightAt = (x: number, z: number) => solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
    const currentByStrip = new Map(voids.mock.calls.map(([id, current]) => [id, current]));
    for (const [id, current] of currentByStrip) {
      if (current.span === 0) continue;
      const k = points.findIndex(p => p.jetStrip === id), slice = curve.slice(points, 0, points.length, k, 0, heightAt, createCrashSlice());
      expect(current.area).toBe(slice.voidArea); expect(current.span).toBe(slice.width);
    }
    for (const [, strip] of lip.exportState().strips) {
      if (!strip.tube) continue;
      const id = strip.tube.id, current = currentByStrip.get(id);
      if (current) expect(strip.tube.sweptVoidVolume).toBe(current.area * current.span);
      if (strip.tube.closedAt !== null && !sealedIDs.has(id)) {
        expect(current).toBeDefined(); expect(strip.tube.air).toBe(current!.area * current!.span);
        expectedSealedDose += current!.area * current!.span; sealedIDs.add(id);
      }
    }
    expect(lip.trappedAir).toBeCloseTo(expectedSealedDose, 10);
    for (const p of crash.curve) {
      const source = points.find(q => q.x === p.x)!, current = currentByStrip.get(source.jetStrip!);
      expect(current).toBeDefined(); expect(p.air).toBe(current!.area * current!.span);
    }
    if (age < times.touchdownSeconds + times.collapseSeconds) {
      const footprint = (crash as unknown as { corners: Float64Array }).corners;
      for (let k = 0; k < points.length; k++) {
        const x = [0, 2, 4, 6].map(offset => footprint[8 * k + offset]);
        const span = ((k ? points[k].x - points[k - 1].x : 0) + (k + 1 < points.length ? points[k + 1].x - points[k].x : 0)) / 2;
        expect(Math.max(...x) - Math.min(...x)).toBe(span);
      }
    }
    lip.step(dt);
    emitted += lip.spits.reduce((n, e) => n + e.airRate * dt, 0) + lip.eruptions.reduce((n, e) => n + e.airRate * dt, 0);
    expect(emitted + lip.heldAir).toBeCloseTo(lip.trappedAir, 8); expect(water(solver) + lip.airborneVolume() + lip.escapedVolume).toBeCloseTo(before, 8);
  }
  return { solver, lip, crash, points, hold, voids, step, get emitted() { return emitted; }, get expectedSealedDose() { return expectedSealedDose; } };
}
describe('projected C water/current air/lifecycle quadrature', () => {
  for (const slope of [0, .75, -.75]) it(`funds X-width and preserves atmospheric/once-sealed/released air at120Hz,slope=${slope}`, () => {
    const f = lifecycle(slope), curve = new CrashCurve(library, c.slope); f.step(0);
    expect(f.crash.counts.throws).toBe(7); expect(f.lip.trappedAir).toBe(0); expect(f.crash.counts.starved).toBe(0);
    let asked = 0;
    for (const [jet] of f.hold.mock.calls) {
      const k = f.points.findIndex(p => p.x === jet.launchX), slice = curve.slice(f.points, 0, f.points.length, k, 0, () => .8, createCrashSlice());
      expect(jet.volume).toBe(slice.prospectiveJetArea * slice.width * slice.endWeight); expect(jet.span).toBe(slice.width); expect(jet.dirX).toBe(0); expect(jet.dirZ).toBe(1); asked += jet.volume;
    }
    expect(f.crash.counts.asked).toBe(asked); expect(f.crash.counts.thrown).toBeCloseTo(asked, 10);
    let open = 0, sealed = 0; const dt = 1 / 120;
    for (let k = 1; k <= Math.ceil((times.touchdownSeconds + times.collapseSeconds + 2) / dt); k++) {
      const age = k * dt; f.voids.mockClear(); f.step(age);
      for (const [id, current] of f.voids.mock.calls) {
        if (current.span === 0) continue;
        const p = f.points.find(p => p.jetStrip === id)!; expect(current.span).toBe(1);
        const index = f.points.indexOf(p), heightAt = (x: number, z: number) => f.solver.sampleCentered(f.solver.h, x, z) + f.solver.sampleCentered(f.solver.bed, x, z);
        const slice = curve.slice(f.points, 0, f.points.length, index, 0, heightAt, createCrashSlice());
        // Actual live-water projection changes at landings; the setSweptVoid call is the current pre-lip-step datum.
        expect(current.area).toBeGreaterThanOrEqual(0); expect(slice.width).toBe(current.span);
      }
      const volume = f.lip.exportState().strips.reduce((n, [, strip]) => n + (strip.tube?.sweptVoidVolume ?? 0), 0);
      if (age < times.touchdownSeconds) { open = Math.max(open, volume); expect(f.lip.trappedAir).toBe(0); expect(f.emitted).toBe(0); }
      else if (!sealed && f.lip.trappedAir > 0) sealed = f.lip.trappedAir;
      if (sealed) expect(f.lip.trappedAir).toBeCloseTo(sealed, 9);
      for (const current of f.crash.curve) expect(current.air).toBeGreaterThanOrEqual(0);
    }
    expect(open).toBeGreaterThan(0); expect(sealed).toBeGreaterThan(0); expect(f.crash.counts.crashes).toBe(7);
    expect(f.lip.heldAir).toBe(0); expect(f.emitted).toBeCloseTo(sealed, 8); expect(f.lip.airborneVolume()).toBe(0);
    metrics.lifecycle.push({ slope, asked: f.crash.counts.asked, funded: f.crash.counts.thrown, starved: f.crash.counts.starved, openMaximum: open, trappedOnce: sealed, expectedProjectedDose: f.expectedSealedDose, emitted: f.emitted, heldAir: f.lip.heldAir, crashes: f.crash.counts.crashes, fundingSourceShareFixture: 1, exactVaryingSectionIntegralClaim: false });
  });
  for (const sealed of [false, true]) it(`removes oblique geometry without duplicate air dose,sealed=${sealed}`, () => {
    const f = lifecycle(.75), dt = 1 / 120, until = sealed ? times.touchdownSeconds + .1 * times.collapseSeconds : times.clearSeconds;
    for (let k = 0; k * dt <= until; k++) f.step(k * dt);
    const trapped = f.lip.trappedAir; if (sealed) expect(trapped).toBeGreaterThan(0); else expect(trapped).toBe(0);
    f.points.length = 0; for (let k = 0; k < 240; k++) f.step(until + (k + 1) * dt);
    expect(f.lip.heldAir).toBe(0); expect(f.emitted).toBeCloseTo(trapped, 8); expect(f.lip.trappedAir).toBeCloseTo(trapped, 9); expect(f.lip.airborneVolume()).toBe(0);
  });
});
