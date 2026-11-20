import { describe, expect, it } from 'vitest';
import { surfZoneConfigFor } from '../game/PhysicalMode';
import { physicalSettingsFor } from '../game/SurfConditions';
import { TEST_WAVE_STARTS, testWaveOverrides } from '../game/testWave';
import { PhysicalSurfWater } from '../physics/PhysicalSurfWater';
import { createWaterSample } from '../physics/SurfWater';
import { SURF_ZONE_STEP, SurfZoneRunner, type RideRequest } from './SurfZoneRunner';
import type { SurfZoneState } from './surfZoneState';
import { TEST_WAVE } from './testWave';
import { CANYON_B } from './Bathymetry';

/** Every array of two sea states, bit for bit. */
function sameSea(a: SurfZoneState, b: SurfZoneState): boolean {
  if (a.solverTime !== b.solverTime || a.seaTimeOffset !== b.seaTimeOffset) return false;
  return Object.keys(a.arrays).every((name) => {
    const x = a.arrays[name];
    const y = b.arrays[name];
    return x.length === y.length && Buffer.from(x.buffer, x.byteOffset, x.byteLength).equals(Buffer.from(y.buffer, y.byteOffset, y.byteLength));
  });
}

/**
 * The white's +x edge near a board on the upcoast peak's arm: the last column, from the arm's tip to 25 m past the board,
 * whose felt breaking (what the gauge and the hold-down read) is at least 0.3 within 20 m seaward to 10 m shoreward of it.
 */
function whiteEdge(runner: SurfZoneRunner, nearZ: number, nearX: number): number {
  const { solver } = runner.simulation;
  const breaking = runner.simulation.feltBreaking;
  let edge = -Infinity;
  for (let iz = 0; iz < solver.nz; iz += 1) {
    const z = solver.zCenters[iz];
    if (z < nearZ - 20 || z > nearZ + 10) continue;
    for (let ix = 0; ix < solver.nx; ix += 1) {
      const x = solver.xCenters[ix];
      if (x >= CANYON_B.takeOffX - 5 && x <= nearX + 25 && breaking[iz * solver.nx + ix] >= 0.3) edge = Math.max(edge, x);
    }
  }
  return edge;
}

/**
 * The test wave (`?testWave=ride`, 2026-11-20) on the in-page solver, through the game's own config path: built twice (two
 * page loads), its start is the same sea bit for bit; restarted twice from that start (the game's restart: the recorded
 * sea, then the rider placed), the water and the board run the same steps bit for bit; and the placement stands the rider
 * on the open face, part way up it, with the white along the crest on the side it peels from.
 */
describe('the test wave', () => {
  it('is the same wave at the same time and place every run, and `ride` stands the surfer on its face ahead of the white', () => {
    const settings = { ...physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' }), tide: 0, windSpeed: 0 };
    const config = surfZoneConfigFor(settings, TEST_WAVE.seed, false, testWaveOverrides('ride'));
    const one = new SurfZoneRunner(config, { rider: true });
    const two = new SurfZoneRunner(config, { rider: true });
    // Two builds: the same start, at the same sea time.
    const start = one.simulation.exportState();
    expect(one.simulation.seaTime).toBeCloseTo(TEST_WAVE_STARTS.ride.seaTime, 9);
    expect(sameSea(start, two.simulation.exportState())).toBe(true);
    // Two restarts on one build and one on the other: place, then a second with no input.
    const { placement } = TEST_WAVE_STARTS.ride;
    const ride = (runner: SurfZoneRunner) => {
      runner.simulation.importState(start);
      runner.invalidateTubeApproach();
      const boards: number[] = [];
      let placed: ReturnType<SurfZoneRunner['status']>['ride'];
      let gap = Number.NaN;
      for (let step = 0; step < Math.round(1 / SURF_ZONE_STEP); step += 1) {
        const request: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false, ...(step === 0 ? { place: placement } : {}) };
        runner.advance(1, request);
        const { board } = runner.session!;
        boards.push(board.position.x, board.position.y, board.position.z, board.velocity.x, board.velocity.y, board.velocity.z);
        if (step === 0) {
          placed = runner.status().ride;
          gap = board.position.x - whiteEdge(runner, board.position.z, board.position.x);
        }
      }
      return { boards, sea: runner.simulation.exportState(), placed: placed!, gap };
    };
    const first = ride(one);
    const again = ride(one);
    const other = ride(two);
    expect(again.boards).toEqual(first.boards);
    expect(other.boards).toEqual(first.boards);
    expect(sameSea(again.sea, first.sea)).toBe(true);
    expect(sameSea(other.sea, first.sea)).toBe(true);
    // Standing on the open face: part way up it, ahead of the crest, the white along the crest toward −x (where it peels from).
    const { placed } = first;
    expect(placed.phase).toBe('standing');
    expect(placed.wave.valid).toBe(true);
    expect(placed.wave.faceFraction).toBeGreaterThan(0.3);
    expect(placed.wave.faceFraction).toBeLessThan(0.75);
    expect(placed.wave.aheadOfCrest).toBeGreaterThan(0);
    expect(placed.wave.crestBreaking).toBeLessThan(0.1);
    // About 10 m ahead of the white along the arm (+x, the way it peels).
    expect(first.gap).toBeGreaterThan(7);
    expect(first.gap).toBeLessThan(14);
    // The foam is drawn only: the water the board feels carries no lens and no plume air, where the white is too.
    const felt = PhysicalSurfWater.forSimulation(one.simulation);
    const sample = createWaterSample();
    let white = 0;
    const { solver } = one.simulation;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const cell = iz * solver.nx + ix;
        if (!(one.simulation.aeration.voidFraction(cell) > 0.05)) continue;
        const x = solver.xCenters[ix];
        const z = solver.zCenters[iz];
        felt.sampleAt(x, felt.surfaceAt(x, z) - 0.1, z, sample);
        expect(sample.voidFraction).toBe(0);
        expect(sample.lensShare).toBeUndefined();
        white += 1;
      }
    }
    expect(white).toBeGreaterThan(100);
  }, 1_500_000);
});
