import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { BodyWaterSample } from './DetachedSurfer';
import { PhysicalSurfWater } from './PhysicalSurfWater';
import { createWaterSample, type SurfWater } from './SurfWater';
import { PlaneWater } from './PlaneWater';
import { eddyVelocity } from './eddies';
import { SurfWaterBodyField } from './SurfWaterBodyField';
import { SurfZoneSimulation, TANK, type SurfZoneConfig } from '../wave/SurfZoneSimulation';

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
