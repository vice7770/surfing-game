import { describe, expect, it } from 'vitest';
import { REEF, type SpotName } from '../Bathymetry';
import { SWEPT_BARREL, SurfZoneSimulation, spillingCurlOn, sweptBarrelOn, sweptCrashOn, type SurfZoneConfig } from '../SurfZoneSimulation';
import { libraryFromBytes } from './barrelLibrary';
import { BARREL_CASES } from './barrelLibraryIndex';
import { BARREL_SPOTS, FLOOR_MARGIN, tubeFootMax } from './barrelSpots';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK } from './ProfileLibrary';
import { onsetTiming } from './sliceClock';
import { createContactHit, SweptContact } from './sweptContact';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';

/**
 * Every spot with barrel cases (Padang Padang Part B, PR 7), switched on only inside these tests: its own cases load,
 * and the loft and the contact build from them on its slope, as the flip would run them. SWEPT_BARREL stays the
 * owner's: no spot changes here.
 */
const SPOTS = [...new Set(BARREL_CASES.map((entry) => entry.spot))];
const STILL = 0;
const flat = () => STILL;
const E = LOFT.extensionSamples;

/** A straight front along +x at z = −100, 1 m apart, thrown there, each point at τ `tau` s and the foot crest `footHeight` m. */
function records(n: number, tau: number, footHeight: number, footDepth: number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau; out[o + FRONT_FIELD.footHeight] = footHeight; out[o + FRONT_FIELD.footDepth] = footDepth;
    out[o + FRONT_FIELD.throwZ] = tau >= 0 ? -100 : Number.NaN;
  }
  return out;
}

describe('the swept barrel’s spots (Part B, PR 7)', () => {
  it('leaves the owner’s switch alone: Padang Padang and the Canyon (2026-10-22) are swept unless a test says so', () => {
    expect(SWEPT_BARREL).toEqual(['padang', 'canyon']);
    for (const spot of ['beach', 'point', 'reef'] as const) {
      expect(sweptBarrelOn({ spot })).toBe(false);
      // A test can switch a spot on only where it has a barrel transect.
      expect(sweptBarrelOn({ spot, sweptBarrel: true })).toBe(BARREL_SPOTS[spot] !== undefined);
    }
    // The Canyon's tubes: on, off with `?canyonTube=off` (the config's say), and never on its old layout.
    expect(sweptBarrelOn({ spot: 'canyon' })).toBe(true);
    expect(sweptBarrelOn({ spot: 'canyon', sweptBarrel: false })).toBe(false);
    expect(sweptBarrelOn({ spot: 'canyon', canyonBed: 'old' })).toBe(false);
  });

  it('gives every spot with cases a transect, and every transect cases', () => {
    for (const spot of SPOTS) expect(BARREL_SPOTS[spot], spot).toBeDefined();
    for (const spot of Object.keys(BARREL_SPOTS) as SpotName[]) expect(SPOTS, spot).toContain(spot);
  });

  it('throws the Reef’s lips on the line through its two runs, never shallower than its top at the tide', () => {
    const reef = BARREL_SPOTS.reef!;
    const midTide = onsetTiming(reef.footDepth, 16, true, reef.onset);
    // reef42 and reef42_a35: where their faces went vertical, for their foot crests.
    expect(midTide.throwDepth(2.127)).toBeCloseTo(1.928, 9);
    expect(midTide.throwDepth(3.503)).toBeCloseTo(5.159, 9);
    // A Practice crest throws at the top's edge, which a tide shifts.
    expect(midTide.throwDepth(0.9)).toBeCloseTo(REEF.crestDepth + FLOOR_MARGIN, 12);
    expect(onsetTiming(reef.footDepth + 0.4, 16, true, reef.onset).throwDepth(0.9)).toBeCloseTo(REEF.crestDepth + FLOOR_MARGIN + 0.4, 12);
  });

  it('follows both spots’ crest jumps, and joins only the Reef’s crests past their throw depth', () => {
    expect(BARREL_SPOTS.padang!.front).toEqual({ jumpReach: 10 });
    expect(BARREL_SPOTS.reef!.front).toEqual({ jumpReach: 10, joinPast: 1.5 });
  });
});

describe.each(SPOTS)('the swept barrel at %s, switched on inside the test', (spot) => {
  const barrel = BARREL_SPOTS[spot]!;
  const bytes = readBarrelCases(spot);
  const cases = bytes.map(decodeCase);
  const library = libraryFromBytes(bytes);
  // A case in the middle of the spot's own slope's range, by its H0/h0.
  const own = cases.filter((c) => Math.abs(c.slope - barrel.slope) <= 1e-6 * barrel.slope).sort((a, b) => a.nonlinearity - b.nonlinearity);
  const middle = own[Math.floor(own.length / 2)];
  const footDepth = barrel.footDepth;
  const footHeight = middle.nonlinearity * footDepth;
  /** Mid-way through the middle case's open tube, s. */
  const openSeconds = 0.5 * middle.touchdown * Math.sqrt(footDepth / 9.81);

  it('loads its own cases, on its slope', () => {
    expect(bytes.length).toBeGreaterThan(0);
    expect(own.length).toBeGreaterThan(0);
    for (const c of cases) expect(c.frames.every(Number.isFinite), c.id).toBe(true);
  });

  it('lofts a thrown front from its cases, overturned mid-tube, every lookup on its slope', () => {
    const loft = new SweptLoft(library, barrel.slope).build(records(21, openSeconds, footHeight, footDepth), 21, STILL, flat);
    expect(loft.sliceCount).toBeGreaterThan(0);
    expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
    // Inside the cases where its slope has two or more to blend; a single case (the Reef's, until its second) flags
    // every other height, here a rounding error off its own.
    if (own.length > 1) expect(loft.clampedLookups).toBe(0);
    expect(library.profileTimes({ slope: barrel.slope, footHeight: middle.nonlinearity, footDepth: 1 }).clamped).toBe(false);
    const middleSlice = Math.floor(loft.sliceCount / 2);
    expect(loft.slicePhase[middleSlice]).toBe(1);
    expect(loft.sliceOverturned[middleSlice]).toBe(1);
  });

  it('rides the drawn tube: air over the face under the lip, water in the lip', () => {
    const front = records(21, openSeconds, footHeight, footDepth);
    const drawn = new SweptLoft(library, barrel.slope).build(front, 21, STILL, flat);
    const contact = new SweptContact(library, barrel.slope);
    contact.update(front, 21, STILL, flat);
    // Under the middle slice's lip, half-way from its throat to its tip along the ray, as drawn.
    const slice = Math.floor(drawn.sliceCount / 2);
    const vertex = (index: number) => {
      const v = slice * LOFT_SAMPLES + E + index;
      return { x: drawn.positions[3 * v], y: drawn.positions[3 * v + 1], z: drawn.positions[3 * v + 2] };
    };
    const tip = vertex(LANDMARK.lip);
    const throat = vertex(LANDMARK.throat);
    const x = (tip.x + throat.x) / 2;
    const z = (tip.z + throat.z) / 2;
    const face = contact.floorAt(x, z);
    expect(Number.isFinite(face)).toBe(true);
    const hit = createContactHit();
    expect(contact.query(x, face + 0.02, z, hit)).toBe(true);
    expect(hit.inWater).toBe(false);
    expect(hit.ceilingY).toBeGreaterThan(face);
    // In the lip itself: between its underside and its top.
    expect(contact.query(x, (hit.ceilingY + hit.ceilingTopY) / 2, z, hit)).toBe(true);
    expect(hit.inWater).toBe(true);
    expect(hit.lipShare).toBeGreaterThan(0);
  });

  it('builds the breaking front on its own transect when a test switches it on', () => {
    const config: SurfZoneConfig = {
      spot, seed: 1, significantHeight: 1, peakPeriod: 12, directionDegrees: 0, spreading: 24, tide: 0,
      componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
    };
    expect(new SurfZoneSimulation({ ...config, sweptBarrel: true }, 'warm').front).toBeDefined();
    expect(new SurfZoneSimulation({ ...config, sweptBarrel: false }, 'warm').front).toBeUndefined();
  });
});

describe('the Canyon’s barrel transect (the tube from Basilisk, 2026-10-22)', () => {
  const canyon = BARREL_SPOTS.canyon!;

  it('throws where its three runs went vertical, with a period term, clamped to the runs', () => {
    const at = (period: number) => onsetTiming(canyon.footDepth, period, true, canyon.onset);
    // a38 (14 s, 1.86 m → 2.74 m), a49 (14 s, 2.52 m → 3.59 m), a29 (11 s, 1.27 m → 2.79 m): exact.
    expect(at(14).throwDepth(1.8599071679999999)).toBeCloseTo(2.740354281192891, 9);
    expect(at(14).throwDepth(2.5191580799999995)).toBeCloseTo(3.590326732873789, 9);
    expect(at(11).throwDepth(1.2682458461538462)).toBeCloseTo(2.788606727843102, 9);
    // canyon23f74_a38 (14 s, 1.886 m → 2.761 m), not in the fit, within 0.013 m.
    expect(Math.abs(at(14).throwDepth(1.8863036746987953) - 2.7610994726910683)).toBeLessThan(0.014);
    // Clamped: a 9 s wave throws as an 11 s one, a 16 s as a 14 s one; a crest under 1.27 m as one of 1.27 m.
    expect(at(9).throwDepth(2)).toBe(at(11).throwDepth(2));
    expect(at(16).throwDepth(2)).toBe(at(14).throwDepth(2));
    expect(at(11).throwDepth(0.9)).toBe(at(11).throwDepth(1.2682458461538462));
    // Padang Padang's has no period term.
    const padang = BARREL_SPOTS.padang!;
    expect(onsetTiming(7, 16, true, padang.onset).throwDepth(2)).toBe(onsetTiming(7, 18, true, padang.onset).throwDepth(2));
  });

  it('joins small crests where the solver fresh-breaks 6 of 12 waves, and clamps under its lowest such row', () => {
    const at = (period: number) => onsetTiming(canyon.footDepth, period, true, canyon.onset);
    // The small drives (the advisor's third ruling, 2026-10-22): 11 s at 1.25 m (band crest 0.81 m, onset 1.93 m on 10
    // waves), 12 s at 1.25 m (0.94 → 1.76, 6 waves), 14 s at 1.1 m (0.89 → 1.80, 11 waves).
    expect(at(11).joinDepth(0.81)).toBeCloseTo(1.93, 9);
    expect(at(12).joinDepth(0.94)).toBeCloseTo(1.76, 9);
    expect(at(14).joinDepth(0.89)).toBeCloseTo(1.8, 9);
    // Under the lowest row a crest clamps to it; at 9 s no small drive broke more than one wave, so its 1.5 m row stays first.
    expect(at(11).joinDepth(0.6)).toBe(at(11).joinDepth(0.81));
    expect(at(9).joinDepth(0.6)).toBeCloseTo(1.89, 9);
    // Each period's rows rise with the crest.
    for (const { rows } of canyon.onset.join) {
      for (let k = 1; k < rows.length; k += 1) expect(rows[k][0]).toBeGreaterThan(rows[k - 1][0]);
    }
  });

  it('plunges a tube only where ξ_f = S / √(η_foot / L0) ≥ 0.54: foot crests to 0.82, 1.22, 1.46 and 1.98 m at 9, 11, 12 and 14 s', () => {
    expect(tubeFootMax('canyon', 9)).toBeCloseTo(0.82, 2);
    expect(tubeFootMax('canyon', 11)).toBeCloseTo(1.22, 2);
    expect(tubeFootMax('canyon', 12)).toBeCloseTo(1.46, 2);
    expect(tubeFootMax('canyon', 14)).toBeCloseTo(1.98, 2);
    expect(tubeFootMax('padang', 16)).toBe(Infinity);
    // The runs: a38 (1.86 m at 14 s) a tube; a49 (2.52 m at 14 s) and a29 (1.27 m at 11 s) not.
    expect(1.8599 <= tubeFootMax('canyon', 14)).toBe(true);
    expect(2.5192 <= tubeFootMax('canyon', 14)).toBe(false);
    expect(1.2682 <= tubeFootMax('canyon', 11)).toBe(false);
  });

  it('runs without the crash, so its spilling front, roller and curl stay (the 6 s lace too), and joins zero-lag crests late', () => {
    expect(sweptCrashOn({ spot: 'canyon' })).toBe(false);
    expect(sweptCrashOn({ spot: 'padang' })).toBe(true);
    expect(sweptCrashOn({ spot: 'canyon', sweptCrash: true })).toBe(true);
    expect(spillingCurlOn({ spot: 'canyon' })).toBe(true);
    expect(spillingCurlOn({ spot: 'canyon', sweptCrash: true })).toBe(false);
    expect(canyon.front).toEqual({ joinPast: 1.5 });
  });
});
