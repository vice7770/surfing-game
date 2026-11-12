import { describe, expect, it } from 'vitest';
import { madsenSorensenWaveNumber } from './BoussinesqSolver';
import { barrelCasesFor } from './barrel/barrelLibrary';
import { BARREL_SPOTS, POOL_FOOT_DEPTH, POOL_FRONT_REACH, POOL_REF_FRONT_REACH, barrelSpotOf, poolLead, poolRamp, poolStraightFrontAt } from './barrel/barrelSpots';
import { onsetTiming } from './barrel/sliceClock';
import {
  POOL, POOL_INSIDE, POOL_REF, POOL_STRAIGHT, POOL_STRAIGHT_EDGE_HEIGHT, poolPeriodOf, poolRampFootZ, poolRefLine, poolRefOn, poolSea, poolSpot, poolStraightAt, poolStraightRiddenAt,
  poolStraightBreakDepth, poolStraightCrestDepth, poolStraightDepth, poolStraightInsideDepth, poolStraightLedgeDepth, poolStraightPlatformZ, poolStraightRefDepth,
  poolStraightDepthWith, poolStraightStartOut, poolTankLayout, regularSignificantHeight,
} from './pool';
import { alongShoreOf, peakTakeOffX, rideLineupOffset, surfZoneSea, takeOffPoint, tankLayout, tankRiderBounds, type SurfZoneConfig } from './SurfZoneSimulation';

/** The straight Barrel at the owner's reference size (`?poolSize=ref`; ruling 13, docs/research/pool-look-reference-2026-11-11). */
describe('the Wave Pool\'s straight Barrel at the reference size (`poolSize` ref)', () => {
  const barrel = {
    spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(POOL_STRAIGHT_EDGE_HEIGHT.big), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
    tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel',
  } as SurfZoneConfig;
  const ref = { ...barrel, significantHeight: regularSignificantHeight(POOL_REF.edgeHeight), peakPeriod: POOL_REF.period, poolSize: 'ref', poolTubeCase: 'big' } as SurfZoneConfig;
  const r = POOL_STRAIGHT;
  const phi = (r.reefAngle * Math.PI) / 180;
  /** The point s m along the reef and n m seaward of its crest line. */
  const at = (s: number, n: number) => { const p = poolStraightAt(s); return [p.x - n * Math.sin(phi), p.z - n * Math.cos(phi)] as const; };
  /** The same on the reference size's own line (step 4, ruling 16: its lengths along the reef × 1.11, from x 127.7). */
  const ar = (s: number, n: number) => { const p = poolStraightAt(s, POOL_REF.startX); return [p.x - n * Math.sin(phi), p.z - n * Math.cos(phi)] as const; };

  it('is ruling 13\'s numbers: every depth 1.11 times the 1.8 m Barrel\'s, the period by its root, the slopes unchanged', () => {
    expect(POOL_REF).toMatchObject({ scale: 1.11, face: 2.0, period: 10.5, platformDepth: 5.0, flatWidth: 6.7, kneeRounding: 3.3 });
    // Step 4 (ruling 16): the knots stand 1.11 × further along the reef too; `short` keeps them where the 1.8 m Barrel's are.
    expect(POOL_REF.crestProfile).toEqual([[0, 5.0], [33.3, 1.78], [72.2, 1.0], [194.3, 1.0], [227.6, 2.2], [260.9, 5.0]]);
    expect(POOL_REF.short.crestProfile).toEqual([[0, 5.0], [30, 1.78], [65, 1.0], [175, 1.0], [205, 2.2], [235, 5.0]]);
    expect(POOL_REF.startX).toBe(127.7);
    expect(POOL_REF.startX / r.startX).toBeCloseTo(1.11, 2);
    expect(POOL_REF.takeOffS).toBe(44.4);
    expect(POOL_REF.takeOffS / r.takeOffS).toBeCloseTo(1.11, 9);
    expect(poolRefLine()).toEqual({ crestProfile: POOL_REF.crestProfile, startX: 127.7, takeOffS: 44.4 });
    expect(poolRefLine('short')).toEqual({ crestProfile: POOL_REF.short.crestProfile, startX: r.startX, takeOffS: r.takeOffS });
    // Froude: each knot's depth within 1 % of 1.11 × today's at 1.11 × its place along the reef; the period within 0.5 % of × √1.11.
    POOL_REF.crestProfile.forEach(([s, depth], k) => {
      expect(Math.abs(s - 1.11 * r.crestProfile[k][0]), `knot ${k}'s place`).toBeLessThanOrEqual(0.051);
      expect(POOL_REF.short.crestProfile[k]).toEqual([r.crestProfile[k][0], depth]);
      expect(depth / r.crestProfile[k][1], `knot ${k}`).toBeGreaterThan(1.099);
      expect(depth / r.crestProfile[k][1], `knot ${k}`).toBeLessThan(1.121);
    });
    expect(POOL_REF.period / POOL.period).toBeCloseTo(Math.sqrt(1.11), 2);
    expect(POOL_REF.platformDepth / r.platformDepth).toBeCloseTo(1.11, 2);
    expect(POOL_REF.flatWidth / r.flatWidth).toBeCloseTo(1.11, 1);
    expect(POOL_REF.kneeRounding / r.kneeRounding).toBeCloseTo(1.11, 1);
  });

  it('lays the floor: the 1 m crest, the 6.7 m top, the 1/9.5 face to the 5 m platform, the 1/10 back', () => {
    expect(poolStraightCrestDepth(133.2, POOL_REF)).toBeCloseTo(1.0, 9);
    expect(poolStraightCrestDepth(0, POOL_REF)).toBeCloseTo(5.0, 9);
    expect(poolStraightCrestDepth(52.75, POOL_REF)).toBeCloseTo((1.78 + 1.0) / 2, 9);
    expect(poolStraightCrestDepth(260.9, POOL_REF)).toBeCloseTo(5.0, 9);
    expect(poolStraightCrestDepth(250, POOL_REF)).toBeLessThan(5.0);
    expect(poolStraightRefDepth(...ar(133.2, 0))).toBeCloseTo(1.0, 9);
    // The face square to the reef: 1/9.5.
    expect(poolStraightRefDepth(...ar(133.2, 19))).toBeCloseTo(1.0 + 19 / 9.5, 9);
    // The knee, 38 m out, rounded ±3.3 m; the platform beyond.
    const knee = (POOL_REF.platformDepth - 1.0) / r.gradient;
    expect(knee).toBeCloseTo(38, 9);
    expect(poolStraightRefDepth(...ar(133.2, knee))).toBeCloseTo(5.0 - (r.gradient * POOL_REF.kneeRounding) / 4, 9);
    expect(poolStraightRefDepth(...ar(133.2, knee + 3.3))).toBeCloseTo(5.0, 9);
    expect(poolStraightRefDepth(...ar(133.2, knee + 12))).toBeCloseTo(5.0, 9);
    // The top, then 1/10 down to the platform.
    expect(poolStraightRefDepth(...ar(133.2, -6.7))).toBeCloseTo(1.0, 9);
    expect(poolStraightRefDepth(...ar(133.2, -16.7))).toBeCloseTo(2.0, 9);
    expect(poolStraightRefDepth(...ar(133.2, -60))).toBeCloseTo(5.0, 9);
    // The machine's floor, the ramp's foot and the beach are the pool's own.
    expect(poolStraightRefDepth(0, poolRampFootZ() - 5)).toBe(POOL.feedDepth);
    expect(poolStraightRefDepth(0, -4)).toBe(poolStraightDepth(0, -4));
    // The ramp from the machine's floor now ends on the 5 m platform.
    expect(poolStraightRefDepth(0, poolStraightPlatformZ() - 1e-9)).toBeCloseTo(5.0, 6);
  });

  it('keeps the knee on the platform: clear of the platform\'s seaward edge and the ramp\'s foot along the whole reef', () => {
    // The rounded knee's outer end, square to the reef: (5 − crest) × 9.5 + 3.3 m seaward of the crest line (41.3 m on the barrel).
    const edge = poolStraightPlatformZ();
    let least = Infinity;
    for (let s = 0; s <= 261; s += 1) {
      const out = (POOL_REF.platformDepth - poolStraightCrestDepth(s, POOL_REF)) / r.gradient + POOL_REF.kneeRounding;
      least = Math.min(least, ar(s, out)[1] - edge);
    }
    expect(edge - poolRampFootZ()).toBeGreaterThan(0);
    // At least 5 m of level platform between the ramp's top and the knee's nearest point.
    expect(least).toBeGreaterThan(5);
    // And the floor is continuous across the platform's edge there (no step where the reef would poke past it).
    for (let x = -140; x <= 140; x += 7) expect(Math.abs(poolStraightRefDepth(x, edge + 1e-6) - poolStraightRefDepth(x, edge - 1e-6)), `x ${x}`).toBeLessThan(1e-3);
  });

  it('is taken by the straight Barrel alone, with the shallow inside scaled and never the ledge', () => {
    expect(poolRefOn(ref)).toBe(true);
    expect(poolRefOn(barrel)).toBe(false);
    expect(poolRefOn({ ...ref, poolBarrel: 'aframe' })).toBe(false);
    expect(poolRefOn({ ...ref, poolWaves: 'training' })).toBe(false);
    expect(poolRefOn({ ...ref, spot: 'canyon' })).toBe(false);
    expect(poolPeriodOf(ref)).toBe(10.5);
    expect(poolPeriodOf(barrel)).toBe(10);
    expect(poolPeriodOf({ ...ref, poolBarrel: 'aframe' })).toBe(10);
    const spot = poolSpot('barrel', undefined, undefined, 'ref');
    expect(spot.depthAt(...ar(133.2, 0))).toBeCloseTo(1.0, 9);
    // The ledge is ignored under the reference size: the same floor.
    const ledge = poolSpot('barrel', undefined, 'ledge', 'ref');
    for (const n of [-30, -10, 0, 10, 20, 38, 45]) expect(ledge.depthAt(...ar(133.2, n)), `n ${n}`).toBe(spot.depthAt(...ar(133.2, n)));
    // The inside's shelf, 1.11 times larger: 0.333 m under the crest, 17.76 m across; seaward of the top's inner edge unchanged.
    const inside = poolSpot('barrel', undefined, 'inside', 'ref');
    const step = POOL_INSIDE.step * 1.11;
    expect(inside.depthAt(...ar(133.2, -(6.7 + 10)))).toBeCloseTo(1.0 + step, 9);
    expect(inside.depthAt(...ar(133.2, -(6.7 + step * 10 + POOL_INSIDE.width * 1.11 - 0.5)))).toBeCloseTo(1.0 + step, 9);
    expect(inside.depthAt(...ar(133.2, -(6.7 + step * 10 + POOL_INSIDE.width * 1.11 + 10)))).toBeCloseTo(2.0 + step, 9);
    for (const n of [-6, 0, 10, 38, 45]) expect(inside.depthAt(...ar(133.2, n)), `n ${n}`).toBe(spot.depthAt(...ar(133.2, n)));
    // The A-frame and the training floor never take it.
    expect(poolSpot('barrel', 'aframe', undefined, 'ref').depthAt).toBe(poolSpot('barrel', 'aframe').depthAt);
    expect(poolSpot('training', undefined, undefined, 'ref').depthAt).toBe(poolSpot('training').depthAt);
  });

  it('leaves the default untouched: the same floors, sea, tank, take-off and start without the switch', () => {
    expect(POOL.period).toBe(10);
    expect(POOL_STRAIGHT).toMatchObject({ platformDepth: 4.5, flatWidth: 6, kneeRounding: 3, gradient: 1 / 9.5, backSlope: 1 / 10, startOut: { small: 18, big: 13.5 } });
    expect(POOL_STRAIGHT.crestProfile).toEqual([[0, 4.5], [30, 1.6], [65, 0.9], [175, 0.9], [205, 2.0], [235, 4.5]]);
    expect(poolSpot('barrel').depthAt).toBe(poolStraightDepth);
    expect(poolSpot('barrel', undefined, 'ledge').depthAt).toBe(poolStraightLedgeDepth);
    expect(poolSpot('barrel', undefined, 'inside').depthAt).toBe(poolStraightInsideDepth);
    expect(poolStraightDepth(...at(120, 0))).toBeCloseTo(0.9, 9);
    expect(poolStraightDepth(...at(120, 60))).toBeCloseTo(4.5, 9);
    expect(poolStraightBreakDepth(1.32)).toBeCloseTo(0.01 + 1.44 * 1.32, 12);
    expect(poolStraightStartOut(1.32)).toBe(13.5);
    expect(poolStraightStartOut(1.05)).toBe(18);
    expect(rideLineupOffset(barrel)).toBe(13.5);
    const sea = surfZoneSea(barrel).components[0];
    expect(sea.omega).toBe((2 * Math.PI) / 10);
    expect(sea.amplitude).toBeCloseTo(1.32 / 2, 12);
    expect(poolSea(1, 9, madsenSorensenWaveNumber).components[0].omega).toBe((2 * Math.PI) / 10);
    expect(BARREL_SPOTS.pool!.footDepth).toBe(4.4);
    expect(barrelSpotOf(barrel)).toBe(BARREL_SPOTS.pool);
    expect(barrelSpotOf({ ...ref, poolBarrel: 'aframe' })).toBe(BARREL_SPOTS.pool);
    expect(barrelSpotOf({ spot: 'canyon', poolSize: 'ref' })).toBe(BARREL_SPOTS.canyon);
    expect(barrelCasesFor('pool').map((entry) => entry.id)).toEqual(['periodic-canyon23-a38-l13']);
    expect(barrelCasesFor('pool', undefined, 'pool').map((entry) => entry.id)).toEqual(['periodic-pool-straight-small-l13', 'periodic-pool-straight-big-l13']);
  });

  it('runs the machine at 10.5 s in the same tank, its wave wrapped across the sides as today\'s', () => {
    const sea = surfZoneSea(ref).components[0];
    expect(sea.omega).toBe((2 * Math.PI) / 10.5);
    expect(sea.amplitude).toBeCloseTo(POOL_REF.edgeHeight / 2, 12);
    // Two along-shore wavelengths in its own window, at the feed: k sin θ = 2π × 2 / 311 (ruling 14).
    const k = madsenSorensenWaveNumber((2 * Math.PI) / 10.5, tankLayout(ref).edgeDepth);
    expect(POOL_REF.alongShore).toBe(311);
    expect(k * Math.sin(-sea.direction)).toBeCloseTo((2 * Math.PI * 2) / 311, 9);
    // The wider window gives the copy's direction: 36.8° at the feed (today 39.1°); kept at 280 m the sea turned to 41.8°.
    const degrees = (config: SurfZoneConfig) => (-surfZoneSea(config).components[0].direction * 180) / Math.PI;
    expect(degrees(ref)).toBeCloseTo(36.8, 1);
    expect(degrees(barrel)).toBeCloseTo(39.1, 1);
    expect(degrees({ ...ref, alongShore: 280 })).toBeCloseTo(41.8, 1);
    // The tank is the machine's own: the same zone, feed and fine grid (the zone is 1.67 of the 10.5 s wave's lengths).
    expect(tankLayout(ref)).toEqual(tankLayout(barrel));
    expect(poolTankLayout(0, 'straight')).toEqual(poolTankLayout(0, 'straight'));
  });

  // Step 2 (ruling 14): the reference size's own wrapped window, 280 m × 1.11; every other pool keeps 280 m.
  it('wraps a 311 m window at the reference size alone; the config\'s own width (`?poolWindow`) overrides it', () => {
    expect(POOL.alongShore).toBe(280);
    expect(alongShoreOf(ref)).toBe(311);
    expect(alongShoreOf({ ...ref, alongShore: 280 })).toBe(280);
    expect(alongShoreOf(barrel)).toBe(280);
    expect(alongShoreOf({ ...barrel, poolWaves: 'training' })).toBe(280);
    // Asked for where it does not apply, the width stays the pool's.
    expect(alongShoreOf({ ...ref, poolBarrel: 'aframe' })).toBe(280);
    expect(alongShoreOf({ ...ref, poolWaves: 'training' })).toBe(280);
    expect(alongShoreOf({ spot: 'canyon', poolSize: 'ref', poolWaves: 'barrel' })).toBe(alongShoreOf({ spot: 'canyon' }));
    expect(alongShoreOf({ spot: 'reef', poolSize: 'ref', poolWaves: 'barrel' })).toBe(160);
    // The rider's bounds follow the window; the take-off is the reef's own place, the same in either window.
    expect(tankRiderBounds(ref).xMax - tankRiderBounds(ref).xMin).toBeCloseTo(tankRiderBounds(barrel).xMax - tankRiderBounds(barrel).xMin + 31, 9);
    expect(tankRiderBounds({ ...ref, alongShore: 280 })).toEqual(tankRiderBounds(barrel));
    expect(takeOffPoint(ref)).toEqual(takeOffPoint({ ...ref, alongShore: 280 }));
  });

  it('keeps the floor continuous across the wrap: the same bed at both walls, in the 280 m default and the 311 m reference', () => {
    const jump = (depthAt: (x: number, z: number) => number, width: number) => {
      let worst = 0;
      // The wrap joins the last column (centre W/2 − 0.5) to the first (−W/2 + 0.5); the walls themselves too.
      for (let z = tankLayout(ref).offshore; z <= 6; z += 0.5) {
        worst = Math.max(worst, Math.abs(depthAt(width / 2, z) - depthAt(-width / 2, z)), Math.abs(depthAt(width / 2 - 0.5, z) - depthAt(-width / 2 + 0.5, z)));
      }
      return worst;
    };
    expect(jump(poolStraightDepth, 280)).toBe(0);
    expect(jump(poolSpot('barrel', undefined, undefined, 'ref', 311).depthAt, 311)).toBe(0);
    expect(jump(poolSpot('barrel', undefined, undefined, 'ref', 280).depthAt, 280)).toBe(0);
    expect(jump(poolSpot('barrel', undefined, 'inside', 'ref', 311).depthAt, 311)).toBe(0);
    // The reef and its slopes end well inside either wall: the wall columns are the plain ramp, platform and beach.
    for (const x of [-155.5, -140, 140, 155.5]) expect(poolStraightRefDepth(x, -150)).toBe(POOL_REF.platformDepth);
    // The window's width moves nothing on the floor (only the wrap's wall, which is off, reads it).
    for (const [x, z] of [[84, -195], [40, -160], [0, -120], [-60, -60], [130, -100]]) {
      expect(poolSpot('barrel', undefined, undefined, 'ref', 311).depthAt(x, z)).toBe(poolSpot('barrel', undefined, undefined, 'ref', 280).depthAt(x, z));
      expect(poolSpot('barrel', undefined, undefined, 'ref').depthAt(x, z)).toBe(poolStraightRefDepth(x, z));
      // Today's floor does not read a window passed without the size.
      expect(poolSpot('barrel', undefined, undefined, undefined, 311).depthAt(x, z)).toBe(poolStraightDepth(x, z));
    }
  });

  it('stands the wrap\'s wall (off by default) at its own window\'s edge', () => {
    const before = POOL_STRAIGHT.wrapWallWidth;
    try {
      POOL_STRAIGHT.wrapWallWidth = 2;
      expect(poolStraightRefDepth(155, -100)).toBe(-POOL.deck);
      expect(poolStraightRefDepth(-155, -100)).toBe(-POOL.deck);
      expect(poolStraightRefDepth(140, -100)).toBe(POOL_REF.platformDepth);
      expect(poolStraightRefDepth(139.5, -100, false, 280)).toBe(-POOL.deck);
      // Today's stays at 140 m.
      expect(poolStraightDepth(139.5, -100)).toBe(-POOL.deck);
      expect(poolStraightDepthWith(139.5, -100, POOL_STRAIGHT)).toBe(-POOL.deck);
    } finally {
      POOL_STRAIGHT.wrapWallWidth = before;
    }
  });

  it('seats the take-off and the start 1.11 times the 1.8 m Barrel\'s', () => {
    expect(poolStraightBreakDepth(POOL_REF.edgeHeight, 'ref')).toBeCloseTo(1.11 * (0.01 + 1.44 * 1.32), 12);
    expect(poolStraightStartOut(POOL_REF.edgeHeight, 'ref')).toBeCloseTo(1.11 * 13.5, 12);
    expect(rideLineupOffset(ref)).toBeCloseTo(14.985, 9);
    const big = takeOffPoint(barrel);
    const point = takeOffPoint(ref);
    // Step 4: s 44.4 along its own line (x 93.7, where the 1.8 m Barrel's s 40 is x 84.4), where the reference floor is first 2.12 m deep.
    expect(point.x).toBe(poolStraightAt(44.4, 127.7).x);
    expect(point.x).toBeCloseTo(93.69, 2);
    expect(peakTakeOffX('pool', undefined, 'barrel', undefined, 'ref')).toBe(point.x);
    // The short reef's (`?poolReef=short`): the 1.8 m Barrel's column; and without the size the switch is not read.
    expect(takeOffPoint({ ...ref, poolReef: 'short' }).x).toBe(big.x);
    expect(peakTakeOffX('pool', undefined, 'barrel', undefined, 'ref', 'short')).toBe(big.x);
    expect(takeOffPoint({ ...barrel, poolReef: 'short' })).toEqual(big);
    expect(peakTakeOffX('pool', undefined, 'barrel')).toBe(big.x);
    expect(peakTakeOffX('pool', undefined, 'training', undefined, 'ref')).toBe(peakTakeOffX('pool', undefined, 'training'));
    expect(peakTakeOffX('pool', undefined, 'barrel', 'aframe', 'ref')).toBe(peakTakeOffX('pool', undefined, 'barrel', 'aframe'));
    expect(poolStraightRefDepth(point.x, point.z)).toBeLessThanOrEqual(1.11 * 1.9108);
    expect(poolStraightRefDepth(point.x, point.z - 1)).toBeGreaterThan(1.11 * 1.9108);
  });

  it('lays the reef 1.11 times longer along its line; `poolReef` short is the floor before step 4 (ruling 16)', () => {
    const long = poolSpot('barrel', undefined, undefined, 'ref');
    const short = poolSpot('barrel', undefined, undefined, 'ref', undefined, 'short');
    // The floor before step 4, written out: `POOL_REF`'s depths on the 1.8 m Barrel's knots and line.
    const before = (x: number, z: number) => poolStraightDepthWith(x, z, { gradient: r.gradient, kneeRounding: POOL_REF.kneeRounding }, undefined,
      { platformDepth: POOL_REF.platformDepth, crestProfile: POOL_REF.short.crestProfile, flatWidth: POOL_REF.flatWidth, alongShore: 311 });
    let differ = 0;
    for (let x = -155; x <= 155; x += 5) for (let z = -260; z <= 0; z += 5) {
      expect(short.depthAt(x, z), `x ${x}, z ${z}`).toBe(before(x, z));
      if (long.depthAt(x, z) !== short.depthAt(x, z)) differ += 1;
    }
    expect(differ).toBeGreaterThan(100);
    // The long reef is the short one stretched from the same z: the same depth at 1.11 × the place along the line, on the barrel.
    for (const s of [70, 100, 120, 150, 170]) for (const n of [-20, -5, 0, 10, 30, 45]) expect(long.depthAt(...ar(1.11 * s, n)), `s ${s}, n ${n}`).toBeCloseTo(short.depthAt(...at(s, n)), 9);
    // Its line starts at x 127.7, z −221 and ends at x −72, z −53 (17 m nearer the beach than the short reef's end, z −70).
    const end = poolStraightAt(260.9, POOL_REF.startX);
    expect(end.x).toBeCloseTo(-72.2, 1);
    expect(end.z).toBeCloseTo(-53.3, 1);
    expect(poolStraightAt(235).z).toBeCloseTo(-69.9, 1);
    // The peel's columns follow the line: x −72 to 128 (the short reef's and the default's: −65 to 115).
    const line = poolRefLine();
    expect(poolStraightRiddenAt(127, line)).toBe(true);
    expect(poolStraightRiddenAt(128, line)).toBe(false);
    expect(poolStraightRiddenAt(-72, line)).toBe(true);
    expect(poolStraightRiddenAt(-73, line)).toBe(false);
    for (const x of [-73, -66, -65, 0, 115, 116, 127]) {
      expect(poolStraightRiddenAt(x, poolRefLine('short')), `x ${x}`).toBe(poolStraightRiddenAt(x));
      expect(poolStraightRiddenAt(x), `x ${x}`).toBe(x >= -65 && x <= 115);
    }
    // The reef stays inside its 311 m window: the wall columns are plain platform, ramp and beach (checked on the wrap above).
    for (let z = -221; z <= -40; z += 3) for (const x of [-155.5, 155.5]) expect(long.depthAt(x, z), `x ${x}, z ${z}`).toBe(Math.min(POOL_REF.platformDepth, Math.max(-POOL.deck, -z * POOL.shoreSlope)));
    // The default's floor reads neither the size nor the switch.
    expect(poolSpot('barrel', undefined, undefined, undefined, undefined, 'short').depthAt).toBe(poolStraightDepth);
  });

  it('sizes the tube from the 1.8 m case alone on a transect 1.11 times larger', () => {
    expect(barrelCasesFor('pool', undefined, 'big').map((entry) => entry.id)).toEqual(['periodic-pool-straight-big-l13']);
    const record = barrelSpotOf(ref)!;
    const pool = BARREL_SPOTS.pool!;
    expect(record.footDepth).toBeCloseTo(1.11 * POOL_FOOT_DEPTH, 12);
    expect(record.slope).toBe(pool.slope);
    expect(record.onset).toBe(pool.onset);
    // Step 4 (ruling 16): the front's reach × 1.11 on the reference's own line: s 22.2 to 111, to 33.3 m behind it.
    expect(POOL_REF_FRONT_REACH).toEqual({ from: 22.2, to: 111, behind: 33.3 });
    expect(record.frontAt).not.toBe(pool.frontAt);
    for (const [s, n, on] of [[22.3, 0, true], [22.1, 0, false], [110.9, 5, true], [111.1, 5, false], [60, -33.2, true], [60, -33.4, false], [60, 40, true]] as const) {
      expect(record.frontAt!(...ar(s, n)), `s ${s}, n ${n}`).toBe(on);
    }
    // The short reef's (`?poolReef=short`): the pool's own reach on the pool's line; the default's record never changes.
    expect(barrelSpotOf({ ...ref, poolReef: 'short' })!.frontAt).toBe(pool.frontAt);
    expect(barrelSpotOf({ ...ref, poolReef: 'short' })!.footDepth).toBe(record.footDepth);
    expect(barrelSpotOf({ ...barrel, poolReef: 'short' })).toBe(pool);
    expect(pool.frontAt).toBe(poolStraightFrontAt);
    expect(POOL_FRONT_REACH).toEqual({ from: 20, to: 100, behind: 30 });
    expect(record.front).toBe(pool.front);
    // The lagged join 1.11 × deeper and √1.11 × longer at 1.11 × the foot crest.
    expect(record.faceAnchor!.lead(1.11 * 1.08)).toBeCloseTo(1.11 * poolLead(1.08), 12);
    expect(record.faceAnchor!.lead(1.11 * 0.9)).toBeCloseTo(1.11 * poolLead(0.9), 12);
    expect(record.faceAnchor!.ramp(1.11 * 1.08)).toBeCloseTo(Math.sqrt(1.11) * poolRamp(1.08), 12);
    // The transect's tables read by the deeper foot: the band, the join and the throw 1.11 × deeper at 1.11 × the crest.
    const today = onsetTiming(pool.footDepth, 10, true, pool.onset);
    const scaled = onsetTiming(record.footDepth, 10.5, true, record.onset);
    expect(scaled.band[0]).toBeCloseTo(1.11 * today.band[0], 9);
    for (const crest of [0.84, 1.0, 1.08]) {
      expect(scaled.joinDepth(1.11 * crest), `join at ${crest}`).toBeCloseTo(1.11 * today.joinDepth(crest), 9);
      expect(scaled.throwDepth(1.11 * crest), `throw at ${crest}`).toBeCloseTo(1.11 * today.throwDepth(crest), 9);
    }
    expect(scaled.earliest).toBeCloseTo(Math.sqrt(1.11) * today.earliest, 9);
  });
});
