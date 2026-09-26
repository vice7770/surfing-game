import { describe, expect, it } from 'vitest';
import { SurfZoneSimulation, type SurfZoneConfig } from './SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from './surfZoneState';

// A small breaking tank (the Point, 40 m of shore) whose lip throws within seconds.
const config: SurfZoneConfig = {
  spot: 'point', seed: 7, significantHeight: 1.6, peakPeriod: 11, directionDegrees: 10, spreading: 18, tide: 0,
  componentCount: 24, alongShore: 40, stage: 2, compute: 'cpu', startSeaTime: 0,
};
const STEP = 1 / 60;

/** Steps `sim` until water is in the air (so the lip's state matters), at most `limit` steps. */
function untilAirborne(sim: SurfZoneSimulation, limit = 2400): void {
  for (let i = 0; i < limit && !(sim.lip.airborneVolume() > 0.05 && i > 300); i += 1) sim.step(STEP);
}

function fingerprint(sim: SurfZoneSimulation): number[] {
  const { solver } = sim;
  let a = 0;
  let b = 0;
  for (let i = 0; i < solver.h.length; i += 1) {
    a += solver.h[i] * ((i % 97) + 1);
    b += solver.qx[i] * ((i % 89) + 1) + solver.qz[i] * ((i % 83) + 1);
  }
  return [sim.seaTime, a, b, sim.foam.dense.reduce((sum, v) => sum + v, 0), sim.lipLaunches, sim.lip.airborneVolume(), sim.lip.landings];
}

describe('surf zone state (spec N1: the sea handover)', () => {
  it('restores a running sea exactly: the copy steps on as the original does, lip in the air included', () => {
    const donor = new SurfZoneSimulation(config);
    untilAirborne(donor);
    expect(donor.lip.airborneVolume()).toBeGreaterThan(0);
    const state = donor.exportState();
    const joiner = new SurfZoneSimulation({ ...config, startSeaTime: 1000 });
    joiner.importState(state);
    expect(joiner.seaTime).toBe(donor.seaTime);
    for (let i = 0; i < 300; i += 1) {
      donor.step(STEP);
      joiner.step(STEP);
    }
    expect(fingerprint(joiner)).toEqual(fingerprint(donor));
  });

  it('survives 32-bit encoding closely enough to break where the donor breaks', () => {
    const donor = new SurfZoneSimulation(config);
    untilAirborne(donor);
    const bytes = encodeSurfZoneState(donor.exportState());
    const joiner = new SurfZoneSimulation({ ...config, startSeaTime: 1000 });
    joiner.importState(decodeSurfZoneState(bytes));
    for (let i = 0; i < 300; i += 1) {
      donor.step(STEP);
      joiner.step(STEP);
    }
    const { solver } = donor;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < solver.h.length; i += 1) {
      if (solver.h[i] <= 0.01) continue;
      const d = solver.surfaceAt(i) - joiner.solver.surfaceAt(i);
      sum += d * d;
      count += 1;
    }
    expect(Math.sqrt(sum / count) / config.significantHeight).toBeLessThan(1e-3);
    expect(joiner.lipLaunches).toBe(donor.lipLaunches);
  });

  it('refuses a state from a different tank', () => {
    const donor = new SurfZoneSimulation({ ...config, stage: 1 });
    const other = new SurfZoneSimulation({ ...config, stage: 1, alongShore: 60 });
    expect(() => other.importState(donor.exportState())).toThrow(/tank/);
  });
});
