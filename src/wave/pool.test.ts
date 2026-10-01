import { describe, expect, it } from 'vitest';
import { madsenSorensenWaveNumber } from './BoussinesqSolver';
import { POOL, POOL_EDGE_HEIGHT, poolCrestZ, poolDepth, poolNormalShare, poolRiddenAt, poolSea, poolTankLayout, poolTerraceZ, regularSignificantHeight } from './pool';
import { SurfZoneSimulation, takeOffPoint, tankLayout } from './SurfZoneSimulation';

describe('the Wave Pool (the movement-flow spec)', () => {
  it('is the same on both arms, so every wave peels both ways alike', () => {
    for (const [x, z] of [[10, -215], [30, -190], [60, -130], [90, -60]]) {
      expect(poolDepth(-x, z)).toBeCloseTo(poolDepth(x, z), 12);
    }
  });

  it('breaks first at its tip: its crest is shallowest seaward there, and runs back shoreward along the arms', () => {
    expect(poolCrestZ(0)).toBe(POOL.apexZ);
    for (let x = 5; x <= 100; x += 5) expect(poolCrestZ(x)).toBeGreaterThan(poolCrestZ(x - 5));
    // The crest ramps from the tip's depth to the arm's end's (the advisor's ramped reef).
    expect(poolDepth(0, poolCrestZ(0))).toBeCloseTo(POOL.crestDepth, 6);
    expect(poolDepth(POOL.armLength, poolCrestZ(POOL.armLength))).toBeCloseTo(POOL.crestEndDepth, 6);
    // Past the arms' taper, the terrace: the reef has ended in its channel.
    expect(poolDepth(POOL.armLength + POOL.taperWidth + 5, -150)).toBeCloseTo(POOL.terraceDepth, 6);
  });

  it('feeds its machine where the wave is near linear, up a ramp to the terrace, level across the open edges', () => {
    const layout = poolTankLayout(30);
    // Clear of the finger: the machine's floor, the ramp's top, the terrace.
    expect(poolDepth(120, layout.zoneInner - 5)).toBeCloseTo(POOL.feedDepth, 6);
    expect(poolDepth(120, poolTerraceZ())).toBeCloseTo(POOL.terraceDepth, 6);
    // In front of the finger its faces run on seaward at their 1:18 normal gradient across the ramp: Mead's focus, two
    // ridges aligned with the approach, kept on the advisor's ruling (2026-10-01) since every measurement was made on it.
    for (const x of [20, 45]) {
      const along = poolCrestZ(x) - layout.zoneInner;
      expect(poolDepth(x, layout.zoneInner)).toBeCloseTo(POOL.crestDepth + (POOL.crestEndDepth - POOL.crestDepth) * (x / POOL.armLength) + along * poolNormalShare(x) * POOL.gradient, 6);
    }
    // The terrace's edge and the tip's crest, as designed.
    expect(poolTerraceZ()).toBeCloseTo(-257, 0);
    expect(poolDepth(0, poolTerraceZ())).toBeCloseTo(POOL.terraceDepth, 6);
    expect(poolDepth(0, POOL.apexZ)).toBeCloseTo(POOL.crestDepth, 6);
    const edge = POOL.alongShore / 2;
    for (const z of [-250, -150, -60]) expect(poolDepth(edge, z)).toBeCloseTo(poolDepth(edge - 3, z), 6);
  });

  it('sends one regular wave, its height the size asked for, bigger for bigger sizes', () => {
    const sea = poolSea(regularSignificantHeight(0.8), 9, madsenSorensenWaveNumber);
    expect(sea.components).toHaveLength(1);
    expect(sea.components[0].amplitude).toBeCloseTo(0.4, 9);
    expect(sea.components[0].direction).toBe(0);
    expect(POOL_EDGE_HEIGHT.small).toBeLessThan(POOL_EDGE_HEIGHT.medium);
    expect(POOL_EDGE_HEIGHT.medium).toBeLessThan(POOL_EDGE_HEIGHT.big);
  });

  it('waits for waves on the right arm, where its peel is measured', () => {
    const config = { spot: 'pool' as const, seed: 1, significantHeight: regularSignificantHeight(POOL_EDGE_HEIGHT.medium), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000, tide: 0 };
    const takeOff = takeOffPoint(config);
    expect(takeOff.x).toBeCloseTo(POOL.takeOffX, 6);
    expect(poolDepth(takeOff.x, takeOff.z)).toBeGreaterThan(POOL.crestDepth);
    expect(poolRiddenAt(POOL.takeOffX)).toBe(true);
    expect(poolRiddenAt(-POOL.takeOffX)).toBe(false);
    expect(tankLayout(config).edgeDepth).toBe(POOL.feedDepth);
    expect(SurfZoneSimulation).toBeDefined();
  });
});
