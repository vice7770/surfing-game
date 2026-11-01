import { describe, expect, it } from 'vitest';
import { POOL_STRAIGHT, poolStraightAt, poolStraightFrame } from '../pool';
import { POOL_TUBE_CASES, barrelCasesFor, libraryFromBytes } from './barrelLibrary';
import { BARREL_SPOTS, POOL_FRONT_REACH, poolStraightFrontAt } from './barrelSpots';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';
import { onsetTiming } from './sliceClock';
import { BARREL_SLOPE, SweptLoft, crestToTip } from './sweptLoft';

/** The Wave Pool's straight Barrel's swept tube (pool-barrel-drawing, 2026-11-01). */
describe('the Wave Pool’s straight Barrel tube', () => {
  it('loads only its own list of cases, provisional until step 2’s land, and reads them as one family by A0', () => {
    const entries = barrelCasesFor('pool');
    expect(entries.map((entry) => entry.id).sort()).toEqual([...POOL_TUBE_CASES].sort());
    // Padang Padang loads its own as before, the pool's stand-ins among them.
    expect(barrelCasesFor('padang').map((entry) => entry.id)).toEqual(expect.arrayContaining([...POOL_TUBE_CASES]));
    const library = libraryFromBytes(readBarrelCases('pool'), 'basilisk', 'pool');
    // One family: every case takes the pool's slope, so a slice brackets them by its A0 alone.
    expect(new Set(library.cases.map((c) => c.slope))).toEqual(new Set([BARREL_SPOTS.pool!.slope]));
    expect(BARREL_SLOPE.pool).toBe(BARREL_SPOTS.pool!.slope);
    // Their files keep their own slopes; the library without the spot does too.
    expect(readBarrelCases('pool').map((bytes) => decodeCase(bytes).slope)).toEqual(entries.map((entry) => entry.slope));
    expect(libraryFromBytes(readBarrelCases('pool')).cases.map((c) => c.slope)).toEqual(entries.map((entry) => entry.slope));
    // The pool's 1.5 m faces' foot crest (A0 about 0.26 on its 4.5 m platform) blends a20 and a30.
    const blend = library.frameBlend({ slope: BARREL_SLOPE.pool!, footHeight: 1.17, footDepth: 4.5, seconds: 0 }, {} as never);
    expect([blend.lower.id, blend.upper.id]).toEqual(['pad19-a20-l12', 'pad19-a30-l12']);
  });

  it('follows crests on its reef only: from s 20 to 205 along it and no further inside than 30 m behind its crest line', () => {
    // `n` m seaward of the reef's crest line, square to it, at `s` along it.
    const phi = (POOL_STRAIGHT.reefAngle * Math.PI) / 180;
    const at = (s: number, n: number) => {
      const { x, z } = poolStraightAt(s);
      return [x - POOL_STRAIGHT.side * n * Math.sin(phi), z - n * Math.cos(phi)] as const;
    };
    for (const s of [25, 40, 100, 200]) {
      // On the platform seaward of the face, on the face, on the top and just behind it.
      for (const n of [80, 30, 0, -10, -29]) expect(poolStraightFrontAt(...at(s, n))).toBe(true);
      // The lagoon and the beach's shore break inside it.
      expect(poolStraightFrontAt(...at(s, -31))).toBe(false);
      expect(poolStraightFrontAt(poolStraightAt(s).x, -25)).toBe(false);
    }
    // Past the reef's ends: its start's convex end and the shore break by the +x wrap, and past its back-off.
    for (const s of [0, 10, 215, 240]) expect(poolStraightFrontAt(...at(s, 20))).toBe(false);
    const { s, n } = poolStraightFrame(poolStraightAt(100).x, poolStraightAt(100).z);
    expect(s).toBeCloseTo(100, 9);
    expect(n).toBeCloseTo(0, 9);
    expect(POOL_FRONT_REACH).toEqual({ from: 20, to: 205, behind: 30 });
  });

  it('sizes its crests at the 4.5 m platform, reads them over 3.86–3.21 m and throws them where they join (zero lag)', () => {
    const pool = BARREL_SPOTS.pool!;
    expect(pool.footDepth).toBe(POOL_STRAIGHT.platformDepth);
    expect(pool.frontFrom).toBe('fine');
    expect(pool.front).toEqual({ joinPast: 1.5 });
    expect(pool.crash).toBeUndefined();
    const timing = onsetTiming(pool.footDepth, 10, true, pool.onset);
    expect(timing.band[0]).toBeCloseTo(3.857, 3);
    expect(timing.band[1]).toBeCloseTo(3.214, 3);
    for (const height of [0.8, 1.1, 1.4, 1.8]) expect(timing.throwDepth(height)).toBe(Infinity);
    // Its join deepens with the band crest, never extrapolated.
    const rows = pool.onset.join[0].rows;
    for (let k = 1; k < rows.length; k += 1) expect(rows[k][1]).toBeGreaterThanOrEqual(rows[k - 1][1]);
    expect(timing.joinDepth(rows[0][0] - 0.3)).toBeCloseTo(rows[0][1], 9);
    expect(timing.joinDepth(rows[rows.length - 1][0] + 0.3)).toBeCloseTo(rows[rows.length - 1][1], 9);
  });
});

describe('the loft’s stretch (T3)', () => {
  it('reads 1 before the throw and the crest-to-tip arc at τ = 0 over its own as the lip flies', () => {
    const library = libraryFromBytes(readBarrelCases('pool'), 'basilisk', 'pool');
    const loft = new SweptLoft(library, BARREL_SLOPE.pool!, { holdClearDrawing: true });
    const query = { slope: BARREL_SLOPE.pool!, footHeight: 1.17, footDepth: 4.5 };
    const touchdown = library.profileTimes(query).touchdownSeconds;
    const profile = new Float32Array(2 * PROFILE_POINTS);
    library.profileAt({ ...query, seconds: 0 }, profile);
    const atThrow = crestToTip(profile);
    for (const tau of [-0.3, 0.5 * touchdown, 0.95 * touchdown]) {
      const records = new Float32Array(21 * FRONT_STRIDE);
      for (let k = 0; k < 21; k += 1) {
        const o = k * FRONT_STRIDE;
        records[o + FRONT_FIELD.x] = k + 0.5; records[o + FRONT_FIELD.z] = -100; records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
        records[o + FRONT_FIELD.tau] = tau; records[o + FRONT_FIELD.footHeight] = 1.17; records[o + FRONT_FIELD.footDepth] = 4.5;
        records[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
      }
      const result = loft.build(records, 21, 0, () => 0);
      const middle = Math.floor(result.sliceCount / 2);
      expect(result.sliceAfter[middle]).toBeCloseTo(tau - touchdown, 6);
      if (tau < 0) {
        expect(result.sliceStretch[middle]).toBe(1);
        continue;
      }
      library.profileAt({ ...query, seconds: tau, hold: 'contact' }, profile);
      expect(result.sliceStretch[middle]).toBeCloseTo(Math.min(1, atThrow / crestToTip(profile)), 4);
      expect(result.sliceStretch[middle]).toBeLessThan(1);
    }
    // The arc's own landmarks: the crest and the tip.
    expect(LANDMARK.lip - LANDMARK.crest).toBe(32);
  });
});
