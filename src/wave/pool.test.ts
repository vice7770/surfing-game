import { describe, expect, it } from 'vitest';
import { madsenSorensenWaveNumber } from './BoussinesqSolver';
import {
  POOL, POOL_BARREL, POOL_BARREL_EDGE_HEIGHT, POOL_BARREL_FACES, POOL_EDGE_HEIGHT, poolBarrelBreakDepth, poolBarrelCrestDepth, poolBarrelDepth, poolBarrelGradient,
  poolBarrelPlatformZ, poolBarrelRiddenAt, poolCrestZ, poolDeckZ, poolDepth, poolNormalShare, poolRampFootZ, poolRiddenAt, poolSea, poolSpot, poolTankLayout, poolTerraceZ,
  regularSignificantHeight,
} from './pool';
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

describe('the Wave Pool’s Barrel floor (the pool-barrel decisions, 2026-10-31)', () => {
  const barrel = { spot: 'pool' as const, seed: 1, significantHeight: regularSignificantHeight(POOL_BARREL_EDGE_HEIGHT.small), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000, tide: 0, poolWaves: 'barrel' as const };

  it('barrels both arms alike, mirrored', () => {
    for (const [x, z] of [[5, -240], [15, -200], [30, -175], [45, -140], [60, -100], [100, -60]]) {
      expect(poolBarrelDepth(-x, z)).toBeCloseTo(poolBarrelDepth(x, z), 12);
    }
    expect(poolSpot('barrel').depthAt).toBe(poolBarrelDepth);
    expect(poolSpot().depthAt).toBe(poolDepth);
  });

  it('runs the same machine: the feed, the zone and the ramp foot, with the plain feed at the zone’s inner edge', () => {
    const training = poolTankLayout(30);
    const layout = poolTankLayout(30, 'barrel');
    expect({ ...layout, fineFrom: 0 }).toEqual({ ...training, fineFrom: 0 });
    expect(layout.fineFrom).toBe(Math.min(training.fineFrom, poolBarrelPlatformZ() - 10));
    expect(tankLayout(barrel)).toEqual({ ...layout, edgeDepth: POOL.feedDepth });
    // No ridges run on seaward: the bed is the ramp alone there, the same at every x, and the feed at the ramp's foot.
    for (const x of [0, 20, 45, 120]) {
      expect(poolBarrelDepth(x, poolRampFootZ())).toBeCloseTo(POOL.feedDepth, 9);
      expect(poolBarrelDepth(x, layout.zoneInner)).toBeCloseTo(POOL.feedDepth, 9);
      expect(poolBarrelDepth(x, poolBarrelPlatformZ() - 10)).toBeCloseTo(poolBarrelDepth(140, poolBarrelPlatformZ() - 10), 9);
    }
  });

  it('crosses a level platform to one steep face, its knee shoreward of the platform’s edge everywhere', () => {
    const b = POOL_BARREL;
    for (let x = 0; x <= POOL.alongShore / 2; x += 0.5) {
      // Continuous at the platform's edge (no step), and level there.
      expect(poolBarrelDepth(x, poolBarrelPlatformZ() + 1e-6)).toBeCloseTo(b.platformDepth, 6);
      expect(poolBarrelDepth(x, poolBarrelPlatformZ() - 1e-6)).toBeCloseTo(b.platformDepth, 4);
    }
    // On the barrel section the face climbs at `gradient` square to the crest line, from the knee to the crest.
    for (const x of [20, 27, 35, 45]) {
      const crest = poolCrestZ(x, POOL_BARREL);
      const normal = poolNormalShare(x, POOL_BARREL);
      expect(poolBarrelDepth(x, crest)).toBeCloseTo(poolBarrelCrestDepth(x), 6);
      // From |x| crestEase the crest shallows on to `outerCrestDepth` at the barrel section's end (keeping its break in order).
      if (x >= b.crestEase) expect(poolBarrelCrestDepth(x)).toBeCloseTo(b.armCrestDepth + ((b.outerCrestDepth - b.armCrestDepth) * (x - b.crestEase)) / (b.armLength - b.crestEase), 9);
      const rise = poolBarrelDepth(x, crest - 5 / normal) - poolBarrelDepth(x, crest - 10 / normal);
      expect(-rise / 5).toBeCloseTo(b.gradient, 6);
      expect(poolBarrelGradient(x)).toBeCloseTo(b.gradient, 9);
    }
    // At the tip, met square, the face is `tipGradient`.
    expect(poolBarrelGradient(0)).toBeCloseTo(b.tipGradient, 9);
    expect(poolBarrelDepth(0, POOL.apexZ)).toBeCloseTo(b.crestDepth, 6);
    expect(poolBarrelDepth(0, POOL.apexZ - 10)).toBeCloseTo(b.crestDepth + 10 * b.tipGradient, 6);
    // Its planform is its own (`POOL_BARREL`'s keys), the training's tip.
    expect(poolCrestZ(0, POOL_BARREL)).toBe(POOL.apexZ);
    expect(POOL_BARREL.apexZ).toBe(POOL.apexZ);
  });

  it('backs off past the barrel section into the platform, level across the open side edges', () => {
    const b = POOL_BARREL;
    expect(poolBarrelCrestDepth(b.armLength)).toBeCloseTo(b.outerCrestDepth, 9);
    for (let x = b.crestEase + 1; x <= b.armLength; x += 1) expect(poolBarrelCrestDepth(x)).toBeLessThan(poolBarrelCrestDepth(x - 1));
    expect(poolBarrelCrestDepth(b.armLength + b.taperWidth)).toBeCloseTo(b.platformDepth, 9);
    for (let x = b.armLength + 1; x <= b.armLength + b.taperWidth; x += 1) expect(poolBarrelCrestDepth(x)).toBeGreaterThan(poolBarrelCrestDepth(x - 1));
    // Past the back-off: the platform from its edge to the beach face, the same at every x out to the edges.
    const edge = POOL.alongShore / 2;
    // (The beach face's toe lies at platformDepth / shoreSlope from the waterline: 36 m at 4.5 m.)
    for (const z of [poolBarrelPlatformZ() + 1, -150, -60, -b.platformDepth / POOL.shoreSlope - 1]) {
      expect(poolBarrelDepth(edge, z)).toBeCloseTo(b.platformDepth, 9);
      expect(poolBarrelDepth(b.armLength + b.taperWidth + 1, z)).toBeCloseTo(b.platformDepth, 9);
      expect(poolBarrelDepth(edge - 3, z)).toBeCloseTo(poolBarrelDepth(edge, z), 9);
    }
    // The lagoon inside the finger, then the training's beach face and deck.
    expect(poolBarrelDepth(0, -100)).toBeCloseTo(b.lagoonDepth, 9);
    expect(poolBarrelDepth(0, 0)).toBeCloseTo(0, 9);
    expect(poolBarrelDepth(0, poolDeckZ() + 5)).toBeCloseTo(-POOL.deck, 9);
  });

  it('gates its breaking age along the crests, as the Canyon does; the training floor keeps rule A', () => {
    const layout = (config: Parameters<typeof tankLayout>[0]) => (new SurfZoneSimulation({ ...config, componentCount: 1, spinUpPeriods: 0 } as never, 'warm').solver as unknown as { deviceLayout(): { breaking?: { diagonalJoin?: number } } }).deviceLayout().breaking?.diagonalJoin;
    expect(layout(barrel)).toBe(POOL_BARREL.ageJoin);
    expect(layout({ ...barrel, poolAgeJoin: 0 }) ?? 0).toBe(0);
    const { poolWaves: _, ...training } = barrel;
    expect(layout({ ...training, poolAgeJoin: 0.5 }) ?? 0).toBe(0);
  });

  it("reads its take-off as plunging, from its bed's steepest slope (its arm's along +z would call it spilling)", () => {
    const sim = new SurfZoneSimulation({ ...barrel, componentCount: 1, spinUpPeriods: 0 } as never, 'warm');
    expect(sim.iribarren().type).toBe('plunging');
    expect(sim.iribarren().value).toBeGreaterThan(0.6);
  });

  it('waits on the right arm’s barrel section, where its first breaks are', () => {
    const takeOff = takeOffPoint(barrel);
    expect(takeOff.x).toBeCloseTo(POOL.takeOffX, 6);
    expect(poolBarrelDepth(takeOff.x, takeOff.z)).toBeCloseTo(poolBarrelBreakDepth(POOL_BARREL_EDGE_HEIGHT.small), 1);
    expect(takeOff.z).toBeLessThan(poolCrestZ(POOL.takeOffX, POOL_BARREL));
    expect(poolBarrelRiddenAt(POOL.takeOffX)).toBe(true);
    expect(poolBarrelRiddenAt(-POOL.takeOffX)).toBe(false);
    expect(POOL_BARREL_EDGE_HEIGHT.small).toBeLessThan(POOL_BARREL_EDGE_HEIGHT.big);
    expect(POOL_BARREL_FACES).toEqual({ small: 1.5, big: 1.8 });
  });
});
