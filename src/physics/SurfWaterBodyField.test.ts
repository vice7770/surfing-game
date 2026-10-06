import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DetachedSurfer, type BodyWaterSample } from './DetachedSurfer';
import { PhysicalSurfWater } from './PhysicalSurfWater';
import { createWaterSample, type SurfWater } from './SurfWater';
import { PlaneWater } from './PlaneWater';
import { eddyVelocity } from './eddies';
import { SurfWaterBodyField } from './SurfWaterBodyField';
import { SurfZoneSimulation, TANK, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { ROLLER_FIELD, ROLLER_STRIDE } from '../wave/SpillingRoller';

const config: SurfZoneConfig = {
  spot: 'beach', seed: 2, significantHeight: 1.2, peakPeriod: 11, directionDegrees: 0, spreading: 24, tide: 0,
  componentCount: 8, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('SurfWater body field', () => {
  it('gives the detached surfer exactly the water the board samples', () => {
    const simulation = new SurfZoneSimulation(config);
    for (let step = 0; step < 240; step += 1) simulation.step(1 / 60);
    const water = PhysicalSurfWater.forSimulation(simulation);
    const field = new SurfWaterBodyField(water);
    const body: BodyWaterSample = { surfaceY: 0, bedY: 0, flow: new Vector3(), wet: false, outsideDomain: false, breaking: 0 };
    const board = createWaterSample();
    const xMax = simulation.windowXMin + simulation.solver.nx * simulation.solver.dx;
    for (const [x, y, z] of [[2, -0.5, -60], [-8, -2, -120], [5, 0, -20], [0, 0, TANK.shore - 1], [xMax + 5, 0, -60]]) {
      field.sampleAt(new Vector3(x, y, z), body);
      water.sampleAt(x, y, z, board);
      expect([body.surfaceY, body.bedY, body.wet, body.outsideDomain, body.breaking]).toEqual([board.surfaceY, board.bedY, board.wet, board.outsideDomain, board.breaking]);
      expect(body.flow.toArray()).toEqual([board.flowX, board.flowY, board.flowZ]);
      expect(body.flowModel).toBe(board.outsideDomain ? 'outside' : board.wet ? 'reconstructed' : 'dry');
    }
  });
});

// The wipeout spec, Part B: the fallen surfer, seven points in separate eddies, feels the turbulence.
describe('the body field in turbulent water', () => {
  it('adds the eddies to the flow at the swimmer\'s points, moving with the clock', () => {
    const plain = new PlaneWater();
    const turbulent: SurfWater = {
      sampleAt: (x, y, z, out) => Object.assign(plain.sampleAt(x, y, z, out), { turbulence: 0.5 }),
      surfaceAt: (x, z) => plain.surfaceAt(x, z),
      addReaction() {},
    };
    let time = 3;
    const field = new SurfWaterBodyField(turbulent, () => time);
    const out = { surfaceY: 0, bedY: 0, flow: new Vector3(), wet: false, outsideDomain: false, breaking: 0 };
    field.sampleAt(new Vector3(1, -0.5, 2), out);
    const expected = eddyVelocity(1, -0.5, 2, 3, 0.5, new Vector3());
    expect(out.flow.distanceTo(expected)).toBeLessThan(1e-12);
    time = 3.5;
    field.sampleAt(new Vector3(1, -0.5, 2), out);
    expect(out.flow.distanceTo(expected)).toBeGreaterThan(1e-3);
    const calm = new SurfWaterBodyField(plain, () => time);
    calm.sampleAt(new Vector3(1, -0.5, 2), out);
    expect(out.flow.length()).toBe(0);
  });
});

// The Canyon roller lens (S3): the fallen surfer meets the lens and the breaking the board does.
describe('the body field at the Canyon', () => {
  it('stays a pass-through, its roller lens\'s top, air and flow included', () => {
    const simulation = new SurfZoneSimulation({ ...config, spot: 'canyon' }, 'warm');
    const roller = simulation.roller!;
    for (let column = 0; column < simulation.solver.nx; column += 1) {
      const o = column * ROLLER_STRIDE;
      roller.table[o + ROLLER_FIELD.crest] = -100;
      roller.table[o + ROLLER_FIELD.length] = 5;
      roller.table[o + ROLLER_FIELD.scale] = 1;
      roller.table[o + ROLLER_FIELD.thickness] = 0.4;
      roller.table[o + ROLLER_FIELD.flowZ] = 5;
    }
    const water = PhysicalSurfWater.forSimulation(simulation);
    const field = new SurfWaterBodyField(water);
    const body: BodyWaterSample = { surfaceY: 0, bedY: 0, flow: new Vector3(), wet: false, outsideDomain: false, breaking: 0 };
    const board = createWaterSample();
    let inLens = 0;
    for (const z of [-101, -99, -97, -60]) {
      const surface = water.surfaceAt(2, z);
      for (const y of [surface + 0.05, surface - 0.05, surface - 0.2, surface - 1]) {
        field.sampleAt(new Vector3(2, y, z), body);
        water.sampleAt(2, y, z, board);
        expect([body.surfaceY, body.bedY, body.wet, body.outsideDomain, body.breaking, body.voidFraction])
          .toEqual([board.surfaceY, board.bedY, board.wet, board.outsideDomain, board.breaking, board.voidFraction ?? 0]);
        expect(body.flow.toArray()).toEqual([board.flowX, board.flowY, board.flowZ]);
        if ((board.voidFraction ?? 0) > 0.3) inLens += 1;
      }
    }
    expect(inLens).toBeGreaterThan(0);
  });

  it('keeps a wiped-out body\'s swim control in water the solver breaks ahead of the visible front (the advisor\'s Q1)', () => {
    const swim = (rollerMask: 'front' | 'solver') => {
      const simulation = new SurfZoneSimulation({ ...config, spot: 'canyon', rollerMask }, 'warm');
      const { solver } = simulation;
      // Calm water the solver says breaks everywhere, before any front has reached it.
      for (let i = 0; i < solver.h.length; i += 1) {
        solver.h[i] = Math.max(0, solver.restLevel - solver.bed[i]);
        solver.qx[i] = 0;
        solver.qz[i] = 0;
      }
      simulation.breaking.strength.fill(1);
      const field = new SurfWaterBodyField(PhysicalSurfWater.forSimulation(simulation));
      const surfer = new DetachedSurfer();
      surfer.start({ center: new Vector3(0, -1.5, -200), orientation: new Quaternion(), velocity: new Vector3(), angularVelocity: new Vector3() });
      for (let frame = 0; frame < 120; frame += 1) surfer.step(1 / 60, field, { stroke: true, steer: 0 });
      return surfer.controlGain;
    };
    expect(swim('front')).toBeGreaterThan(0.5);
    expect(swim('solver')).toBe(0);
  });
});
