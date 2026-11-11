import { describe, expect, it } from 'vitest';
import { PhysicalSurfWater, wallWaterFlow } from '../../physics/PhysicalSurfWater';
import { createWaterSample } from '../../physics/SurfWater';
import { ShallowWaterSolver, uniformEdges } from '../ShallowWaterSolver';
import { tubeFaceOf, type TubeFace } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { createContactHit, SweptContact } from './sweptContact';
import { WALL_FLOW } from './sweptLoft';
import { lipCase } from './toyCase';
import { parseSeamBand, parseSeamTau, seamB, seamBand, seamHeightWeight, seamTauWeight, smoothstep, TUBE_SEAM } from './tubeSeam';

/**
 * Ruling 5's seam blend (the water-physics advisor's advisor-ruling-5.md §4, docs/research/tube-seam-2026-11-11;
 * `?tubeSeam=blend`): one weight α = α_h · α_τ for the case's loft, its contact and its water's flow; no step in the
 * crest water's share of the crest's speed at the throw; opt-in, and off the build as before.
 */
describe('ruling 5: the seam blend\'s weights', () => {
  it('has the ruling\'s constants', () => {
    expect(TUBE_SEAM.tau).toEqual([-0.5, 0]);
    expect(TUBE_SEAM.band).toBe(0.25);
    expect(TUBE_SEAM.thrown).toBe(0.2);
  });

  it('holds the case out until 0.5 s before the throw and gives it whole at the throw, C1', () => {
    const [on, full] = TUBE_SEAM.tau;
    for (const tau of [-3, -1, -0.5]) expect(seamTauWeight(tau, on, full)).toBe(0);
    for (const tau of [0, 0.1, 2]) expect(seamTauWeight(tau, on, full)).toBe(1);
    expect(seamTauWeight(-0.25, on, full)).toBeCloseTo(0.5, 12);
    // Rising all the way, by at most 1.5 / (full − on) a second (the smoothstep's steepest), and flat at both ends.
    let last = 0;
    const step = 1e-3;
    for (let tau = on; tau <= full + 1e-9; tau += step) {
      const w = seamTauWeight(tau, on, full);
      expect(w).toBeGreaterThanOrEqual(last);
      expect(w - last).toBeLessThanOrEqual((1.5 / (full - on)) * step + 1e-9);
      last = w;
    }
    expect(seamTauWeight(on + step, on, full)).toBeLessThan(2e-5);
    expect(1 - seamTauWeight(full - step, on, full)).toBeLessThan(2e-5);
    // Another course (`?seamTau=-0.75,0`); a course of no length is a step, not a division by zero.
    expect(seamTauWeight(-0.375, -0.75, 0)).toBeCloseTo(0.5, 12);
    expect(seamTauWeight(-0.1, 0, 0)).toBe(0);
    expect(seamTauWeight(0, 0, 0)).toBe(1);
  });

  it('gives the case no share where its surface is the solver\'s, and all of it a band above', () => {
    for (const delta of [-1, -1e-9, 0]) expect(seamHeightWeight(delta, 0.25)).toBe(0);
    for (const delta of [0.25, 0.3, 5]) expect(seamHeightWeight(delta, 0.25)).toBe(1);
    expect(seamHeightWeight(0.125, 0.25)).toBeCloseTo(0.5, 12);
    // The height it stands at, δ S(δ / b): leaves the solver's surface with no step and no slope, and joins the case's.
    const stands = (delta: number) => delta * seamHeightWeight(delta, 0.25);
    expect(stands(1e-4)).toBeLessThan(1e-10);
    expect(stands(1e-4) / 1e-4).toBeLessThan(1e-6);
    expect(stands(0.25)).toBe(0.25);
    let last = 0;
    for (let delta = 0; delta <= 0.3; delta += 1e-3) {
      // Never over the case's own height, never falling as the case rises.
      expect(stands(delta)).toBeLessThanOrEqual(delta);
      expect(stands(delta)).toBeGreaterThanOrEqual(last);
      last = stands(delta);
    }
    // The band in proportion to the slice's foot height: 0.25 m at the "1.5 m" Barrel's.
    expect(seamBand(0.25, TUBE_SEAM.height)).toBeCloseTo(0.25, 12);
    expect(seamBand(0.25, 2 * TUBE_SEAM.height)).toBeCloseTo(0.5, 12);
    expect(seamBand(0.25, 0)).toBe(0.25);
    expect(smoothstep(Number.NaN)).toBe(0);
  });

  it('takes the crest water from 0.85 to 1 of the crest\'s speed over 0.2 s after the throw, with no step', () => {
    const { before, thrown } = WALL_FLOW;
    for (const tau of [-2, -0.5, -1e-6, 0]) expect(seamB(tau, before, thrown)).toBe(before);
    for (const tau of [TUBE_SEAM.thrown, 0.5, 3]) expect(seamB(tau, before, thrown)).toBe(thrown);
    expect(seamB(TUBE_SEAM.thrown / 2, before, thrown)).toBeCloseTo((before + thrown) / 2, 12);
    // Today's rule steps by 0.15 at τ = 0; this one moves by under 0.002 in any 1/600 s.
    const step = 1 / 600;
    for (let tau = -0.1; tau < 0.4; tau += step) {
      expect(Math.abs(seamB(tau + step, before, thrown) - seamB(tau, before, thrown))).toBeLessThan(0.002);
    }
    expect(seamB(1e-3, before, thrown) - before).toBeLessThan(2e-5);
  });

  it('reads `seamTau=on,full` and `seamBand=m`, and nothing else', () => {
    expect(parseSeamTau('-0.5,0')).toEqual([-0.5, 0]);
    expect(parseSeamTau('-0.75, 0')).toEqual([-0.75, 0]);
    expect(parseSeamTau('-1,-0.25')).toEqual([-1, -0.25]);
    for (const text of [undefined, '', '-0.5', '0,-0.5', '0,0', 'a,b', '-0.5,', ',0', '-1,0,1', 'nan,0', '-inf,0']) expect(parseSeamTau(text), String(text)).toBeUndefined();
    expect(parseSeamBand('0.25')).toBe(0.25);
    expect(parseSeamBand('0.4')).toBe(0.4);
    for (const text of [undefined, '', ' ', '0', '-0.1', 'x', '3', 'Infinity']) expect(parseSeamBand(text), String(text)).toBeUndefined();
  });
});

describe('ruling 5: the seam blend\'s switch', () => {
  it('is opt-in: without `tubeSeam=blend` the tube has no seam setting, whatever the tuning inputs say', () => {
    const all = tubeFaceOf(true, {})!;
    expect('seam' in all).toBe(false);
    expect(tubeFaceOf(true, { seamTau: [-0.75, 0], seamBand: 0.4 })).toEqual(all);
    expect('seam' in tubeFaceOf(true, { seamTau: [-0.75, 0], seamBand: 0.4 })!).toBe(false);
    expect(tubeFaceOf(true, { tubeSeam: 'blend' })).toEqual({ ...all, seam: { tau: TUBE_SEAM.tau, band: TUBE_SEAM.band } });
    expect(tubeFaceOf(true, { tubeSeam: 'blend', seamTau: [-0.75, 0], seamBand: 0.4 })).toEqual({ ...all, seam: { tau: [-0.75, 0], band: 0.4 } });
    // With the C1 clock too; and only with the wall water it weighs.
    expect(tubeFaceOf(true, { tubeSeam: 'blend', formClock: 'c1' })).toMatchObject({ formClock: true, seam: { tau: TUBE_SEAM.tau } });
    expect('seam' in tubeFaceOf(true, { tubeSeam: 'blend', wallFlow: 'old' })!).toBe(false);
    expect('seam' in tubeFaceOf(true, { tubeSeam: 'blend', tubeFrom: 'piece' })!).toBe(false);
    expect('seam' in tubeFaceOf(true, { tubeSeam: 'blend', tubeFace: 'old' })!).toBe(false);
  });
});

describe('ruling 5: the seam blend in the loft, the contact and the flow', () => {
  const STILL = 0.5;
  const H0 = 7;
  const face = (over: Partial<TubeFace>): TubeFace => ({
    anchor: false, union: true, lag: false, clockRate: 2, thrownEnds: false, continuity: false, distance: false, contour: false, wallFlow: true,
    contact: true, cap: false, merge: false, guard: false, track: false, inertia: false, retire: false, buoy: false, drop: false, ...over,
  });
  function records(n: number, tau: number): Float32Array {
    const out = new Float32Array(n * FRONT_STRIDE);
    for (let k = 0; k < n; k += 1) {
      const o = k * FRONT_STRIDE;
      out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
      out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = H0;
      out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
      for (const f of [FRONT_FIELD.pace, FRONT_FIELD.anchor, FRONT_FIELD.crestSpeed, FRONT_FIELD.tauRate]) out[o + f] = Number.NaN;
    }
    return out;
  }
  const seam = { tau: TUBE_SEAM.tau, band: TUBE_SEAM.band };
  const build = (tau: number, blend: boolean) => {
    const solver = new ShallowWaterSolver({ nx: 48, xMin: -12, dx: 1, zEdges: uniformEdges(-130, -70, 60) }, () => H0, { waterLevel: STILL });
    for (let i = 0; i < solver.qz.length; i += 1) solver.qz[i] = 1.2 * solver.h[i];
    const contact = new SweptContact(new ProfileLibrary([lipCase(0.3, 0.04)]), 0.05, { face: face(blend ? { seam } : {}) });
    contact.update(records(21, tau), 21, STILL, () => STILL);
    const options = { peakPeriod: 18, nodeSpacing: 2, swept: contact, sweptUnion: true, sweptWall: true, sweptNearest: true };
    return {
      contact,
      water: new PhysicalSurfWater(solver, { ...options, ...(blend ? { sweptSeam: true } : {}) }),
      solverFlow: new PhysicalSurfWater(solver, { ...options, sweptWall: false }),
    };
  };

  it('weighs the wall water\'s flow by the case\'s share, as `wallWaterFlow`\'s share', () => {
    const hit = createContactHit();
    Object.assign(hit, { tangentX: 1, tangentZ: 0, normalX: 0, normalY: 0.5, normalZ: Math.sqrt(0.75), wallAlong: 5, wallUp: 0, wallLow: 0, wallTop: 1, wallSpeed: 5, wallB: 0.85, wallWeight: 1 });
    const at = (share: number) => {
      const flow = createWaterSample();
      Object.assign(flow, { flowX: 0.3, flowY: 0.2, flowZ: 1 });
      wallWaterFlow(flow, 0.6, hit, share);
      return flow;
    };
    const none = at(0);
    const whole = at(1);
    expect(none).toMatchObject({ flowX: 0.3, flowY: 0.2, flowZ: 1 });
    for (const share of [0.1, 0.5, 0.9]) {
      const f = at(share);
      for (const key of ['flowX', 'flowY', 'flowZ'] as const) expect(f[key]).toBeCloseTo(none[key] + share * (whole[key] - none[key]), 12);
    }
  });

  it('leaves the solver\'s surface and flow alone until 0.5 s before the throw', () => {
    const before = build(-0.3, false);
    const early = build(-0.6, true);
    const a = createWaterSample();
    const b = createWaterSample();
    let stood = 0;
    for (let z = -106; z <= -94; z += 0.25) {
      // Without the blend the case stands over the water here; with it, at τ −0.6 s, the water's own surface answers.
      if (before.contact.floorAt(10.25, z) > STILL + 0.05) stood += 1;
      const floor = early.contact.floorAt(10.25, z);
      if (floor === floor) expect(floor).toBeCloseTo(STILL, 5);
      expect(early.water.surfaceAt(10.25, z)).toBeCloseTo(early.solverFlow.plainSurfaceAt(10.25, z), 5);
      for (let y = STILL - 0.5; y <= STILL + 0.5; y += 0.1) {
        early.water.sampleAt(10.25, y, z, a);
        early.solverFlow.sampleAt(10.25, y, z, b);
        expect(a.flowX).toBe(b.flowX);
        expect(a.flowY).toBe(b.flowY);
        expect(a.flowZ).toBe(b.flowZ);
        expect(a.wallWater).toBeUndefined();
      }
    }
    expect(stood).toBeGreaterThan(5);
  });

  it('stands the case S(δ / b) α_τ of its height over the solver\'s surface in between, its flow by the same share', () => {
    const old = build(-0.3, false);
    const blended = build(-0.3, true);
    const share = seamTauWeight(-0.3, seam.tau[0], seam.tau[1]);
    expect(share).toBeGreaterThan(0.3);
    expect(share).toBeLessThan(0.4);
    const band = seamBand(seam.band, 2.1);
    const a = createWaterSample();
    const b = createWaterSample();
    const c = createWaterSample();
    let between = 0;
    let moved = 0;
    for (let z = -106; z <= -94; z += 0.05) {
      const was = old.contact.floorAt(10.25, z);
      const now = blended.contact.floorAt(10.25, z);
      if (!(was === was) || !(now === now)) continue;
      const delta = was - STILL;
      // Never under the water, never over the case; within the triangles' own interpolation of the rule.
      expect(now).toBeGreaterThanOrEqual(STILL - 1e-6);
      expect(now).toBeLessThanOrEqual(Math.max(STILL, STILL + share * delta) + 1e-6);
      expect(now - STILL).toBeCloseTo(share * seamHeightWeight(delta, band) * Math.max(0, delta), 1);
      if (delta > 0.05) between += 1;
      for (let y = STILL - 0.3; y <= STILL + 1.5; y += 0.1) {
        old.water.sampleAt(10.25, y, z, a);
        blended.water.sampleAt(10.25, y, z, b);
        blended.solverFlow.sampleAt(10.25, y, z, c);
        // The blend's flow is never farther from the solver's than the wall water's whole (the surfaces differ, so the
        // wall water's own value does too: by its largest anywhere on this face, 6 m/s).
        expect(Math.abs(b.flowZ - c.flowZ)).toBeLessThanOrEqual(share * 6 + 1e-9);
        if (b.flowZ !== c.flowZ) moved += 1;
      }
    }
    expect(between).toBeGreaterThan(20);
    expect(moved).toBeGreaterThan(0);
  });

  it('is the build as before from the throw where the case stands a band over the water, and off', () => {
    const old = build(0.05, false);
    const blended = build(0.05, true);
    const band = seamBand(seam.band, 2.1);
    let same = 0;
    for (let z = -106; z <= -94; z += 0.05) {
      const was = old.contact.floorAt(10.25, z);
      const now = blended.contact.floorAt(10.25, z);
      if (!(was === was)) continue;
      // Whole by its clock (τ ≥ 0): only the height band differs, under the case's own height.
      expect(now).toBeLessThanOrEqual(was + 1e-6);
      // (A grid cell past the band's edge: the contact's triangles carry a corner's share across a cell.)
      if (was - STILL > 2 * band + 0.1) {
        expect(now).toBeCloseTo(was, 5);
        same += 1;
      }
    }
    expect(same).toBeGreaterThan(10);
    // Off: the same loft twice gives the same bytes (no state of the blend's leaks into the build without it).
    const again = build(0.05, false);
    for (let z = -106; z <= -94; z += 0.05) expect(again.contact.floorAt(10.25, z)).toBe(old.contact.floorAt(10.25, z));
  });
});
