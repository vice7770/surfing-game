import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { BodyWaterSample } from './DetachedSurfer';
import { PhysicalSurfWater } from './PhysicalSurfWater';
import { createWaterSample } from './SurfWater';
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
