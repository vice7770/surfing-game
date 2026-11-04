import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { BARREL_SPOTS, poolLead, poolRamp } from './barrelSpots';
import { ANCHOR_CONTINUITY, caseCrossing, continueAnchor, smoothShifts, THROWN_RATE, tubeFaceOf, type AnchorTrack } from './faceAnchor';
import { FRONT_FIELD, FRONT_STRIDE, writeFrontRecords } from './frontRecords';
import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';
import { advanceClocks, type OnsetTiming } from './sliceClock';

describe('the surfable tube (the advisor\'s step 3 ruling)', () => {
  it('is the pool\'s alone, and both old switches give the build before', () => {
    expect(BARREL_SPOTS.pool!.faceAnchor).toBeDefined();
    for (const spot of ['padang', 'canyon', 'point', 'reef'] as const) expect(BARREL_SPOTS[spot]!.faceAnchor).toBeUndefined();
    expect(tubeFaceOf(false, {})).toBeUndefined();
    expect(tubeFaceOf(true, { tubeFace: 'old', tubeFrom: 'piece' })).toBeUndefined();
    expect(tubeFaceOf(true, {})).toEqual({
      anchor: true, union: true, lag: true, clockRate: THROWN_RATE.face, thrownEnds: true, continuity: true, distance: true, contour: true, wallFlow: true,
    });
    // The piece, never below the solver's surface: the union alone.
    expect(tubeFaceOf(true, { tubeFrom: 'piece' })).toEqual({
      anchor: false, union: true, lag: false, clockRate: THROWN_RATE.old, thrownEnds: false, continuity: false, distance: false, contour: false, wallFlow: false,
    });
    expect(tubeFaceOf(true, { tubeFace: 'old' })).toMatchObject({ anchor: true, union: false, lag: true });
    expect(tubeFaceOf(true, { tubeLag: 0 })).toMatchObject({ anchor: true, lag: false, clockRate: THROWN_RATE.face });
    expect(tubeFaceOf(true, { tubeClock: 'old' })).toMatchObject({ lag: true, clockRate: THROWN_RATE.old });
  });

  it('turns each of step 7\'s pieces off by its own switch, and all three off give step 6', () => {
    expect(tubeFaceOf(true, { tubeAnchor: 'old' })).toMatchObject({ continuity: false, distance: true, contour: true, wallFlow: true });
    expect(tubeFaceOf(true, { tubeForm: 'old' })).toMatchObject({ continuity: true, distance: false, contour: false, wallFlow: true });
    expect(tubeFaceOf(true, { tubeThrow: 'break' })).toMatchObject({ continuity: true, distance: true, contour: false, wallFlow: true });
    expect(tubeFaceOf(true, { wallFlow: 'old' })).toMatchObject({ continuity: true, distance: true, contour: true, wallFlow: false });
    expect(tubeFaceOf(true, { tubeAnchor: 'old', tubeForm: 'old', wallFlow: 'old' })).toEqual({
      anchor: true, union: true, lag: true, clockRate: THROWN_RATE.face, thrownEnds: true, continuity: false, distance: false, contour: false, wallFlow: false,
    });
    // Formation by distance needs the lag, the wall's water the union.
    expect(tubeFaceOf(true, { tubeLag: 0 })).toMatchObject({ distance: false, contour: false, continuity: true });
    expect(tubeFaceOf(true, { tubeFace: 'old' })).toMatchObject({ wallFlow: false, continuity: true, distance: true });
    // Without the crash (`?poolCrash=off`) nothing keeps the anchor: it is computed each build, as step 6's.
    expect(tubeFaceOf(true, { sweptCrash: false })).toMatchObject({ continuity: false, distance: true, wallFlow: true });
  });

  it('keeps a point\'s shift step to step in the wave\'s frame: capped, held on a miss, never back to the crest anchor, eased from it', () => {
    const { crest, slack, hold, ease } = ANCHOR_CONTINUITY;
    const dt = 1 / 60;
    const c = 5;
    const cap = (crest * c + slack) * dt;
    const advance = c * dt;
    expect(cap).toBeCloseTo(0.03, 9);
    // On a ray along +z. Faced from its first step: it starts there.
    const a: AnchorTrack = {};
    let z = 0;
    expect(continueAnchor(a, 2, 0, c, 0, z, 0, 1)).toBe(2);
    // The wave moves on C Δt while the point (a crest cell's centre) stands: the target's shift grows by C Δt, kept.
    expect(continueAnchor(a, 2 + advance, dt, c, 0, z, 0, 1)).toBeCloseTo(2 + advance, 12);
    // The point steps a 1 m row forward and the target's place moves on C Δt: the shift drops by the step, uncapped.
    z += 1;
    expect(continueAnchor(a, 1 + 2 * advance, 2 * dt, c, 0, z, 0, 1)).toBeCloseTo(1 + 2 * advance, 12);
    // A jump of the target's place along the ray (0.5 m) is held to the cap about the wave's advance.
    expect(continueAnchor(a, 1.5 + 3 * advance, 3 * dt, c, 0, z, 0, 1)).toBeCloseTo(1 + 3 * advance + cap, 12);
    expect(a.anchorRate).toBeCloseTo(c + cap / dt, 9);
    // A miss: the case's crest runs on along the ray at its last rate (the point standing, the shift grows by it).
    const rate = a.anchorRate!;
    const before = a.anchorShift!;
    expect(continueAnchor(a, Number.NaN, 4 * dt, c, 0, z, 0, 1)).toBeCloseTo(before + rate * dt, 12);
    // Past `hold`, the shift stands with the point; never NaN.
    let t = 4 * dt;
    while (t < 3 * dt + hold + 0.1) t += dt;
    const after = continueAnchor(a, Number.NaN, t, c, 0, z, 0, 1);
    expect(after).toBe(after);
    expect(continueAnchor(a, Number.NaN, t + dt, c, 0, z + 1, 0, 1)).toBe(after);
    // On the crest anchor first: NaN, then eased from 0 to its face anchor over `ease`, then capped about the advance.
    const b: AnchorTrack = {};
    expect(continueAnchor(b, Number.NaN, 0, c, 0, 0, 0, 1)).toBeNaN();
    expect(continueAnchor(b, 2, 1, c, 0, 0, 0, 1)).toBe(0);
    expect(continueAnchor(b, 2, 1 + ease / 2, c, 0, 0, 0, 1)).toBeCloseTo(1, 12);
    expect(continueAnchor(b, 2, 1 + ease, c, 0, 0, 0, 1)).toBeCloseTo(Math.min(2, 1 + (c + crest * c + slack) * (ease / 2)), 12);
    // Uncapped (`?tubeAnchor=old` with the wall's water): as smoothed, the case's crest's speed along the ray tracked.
    const d: AnchorTrack = {};
    continueAnchor(d, 2, 0, c, 0, 0, 0, 1, false);
    expect(continueAnchor(d, 2.05, dt, c, 0, 0.05, 0, 1, false)).toBe(2.05);
    expect(d.anchorRate).toBeCloseTo(6, 9);
    expect(continueAnchor(d, Number.NaN, 2 * dt, c, 0, 0.1, 0, 1, false)).toBeNaN();
  });

  it('leads the pool\'s join by the advisor\'s depths and forms over his ramps, clamped', () => {
    expect(poolLead(0.84)).toBeCloseTo(0.45, 12);
    expect(poolLead(1.08)).toBeCloseTo(0.5, 12);
    expect(poolLead(0.5)).toBeCloseTo(0.45, 12);
    expect(poolLead(2)).toBeCloseTo(0.5, 12);
    expect(poolRamp(0.84)).toBeCloseTo(0.85, 12);
    expect(poolRamp(1.08)).toBeCloseTo(0.96, 12);
  });

  it('finds a case\'s lower face crossing at 0.3 of its height', () => {
    // A ramp from the crest (1 m up at x 0) down to its trough (0 at x 4): 0.3 is crossed at x 2.8.
    const profile = new Float32Array(2 * PROFILE_POINTS);
    for (let i = 0; i < PROFILE_POINTS; i += 1) {
      const x = ((i - LANDMARK.crest) / (PROFILE_POINTS - 1 - LANDMARK.crest)) * 6;
      profile[2 * i] = x;
      profile[2 * i + 1] = i <= LANDMARK.crest ? 1 : Math.max(0, 1 - x / 4);
    }
    expect(caseCrossing(profile, LANDMARK.crest)).toBeCloseTo(2.8, 5);
    expect(caseCrossing(profile, LANDMARK.crest, 0.5)).toBeCloseTo(2, 5);
    // Searched from a point past the face: no crossing.
    expect(caseCrossing(profile, PROFILE_POINTS - 2)).toBeNaN();
  });

  it('smooths the shifts along σ, over the points that have one', () => {
    const sigma = [0, 1, 2, 3, 20];
    const out = new Float64Array(5);
    // A constant stays; a point with none takes its neighbours'; one with no neighbour in reach keeps none.
    expect(smoothShifts(sigma, [2, Number.NaN, 2, 2, Number.NaN], 5, out)).toBe(1);
    expect(Array.from(out.subarray(0, 4))).toEqual([2, 2, 2, 2]);
    expect(out[4]).toBeNaN();
    // A line through the middle point is kept there (the biweight is symmetric).
    smoothShifts([0, 1, 2, 3, 4], [0, 1, 2, 3, 4], 5, out);
    expect(out[2]).toBeCloseTo(2, 12);
  });

  it('caps a thrown clock\'s catch-up at 1.25× under the ruling, 2× otherwise', () => {
    const point = (): FrontPoint => ({
      id: 0, front: 0, column: 0, sigma: 0, x: 0, z: 0, b: Number.NaN, height: 1, joined: 0, depth: 2.5, throwDepth: 2.5, crestDepth: 2,
      thrown: 0, throwZ: 0, footHeight: 1, footDepth: 4.4, broke: 0, tau: 0, seen: 0, fresh: null,
    });
    const timing: OnsetTiming = { h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2.5, lagged: true, earliest: -1 };
    const dt = 1 / 60;
    for (const [rate, expected] of [[undefined, 2], [THROWN_RATE.face, 1.25]] as const) {
      // Its fit says it threw 1 s ago, its clock at 0: it catches up at the cap.
      const p = point();
      advanceClocks([p], 1, { ...timing, ...(rate ? { thrownRate: rate } : {}) }, dt);
      expect(p.tau / dt).toBeCloseTo(expected, 9);
    }
  });

  it('holds an unbroken lagged join short of its throw, and retires it past its foreseen throw', () => {
    const timing: OnsetTiming = { h0: 4.4, band: [3.8, 3.2], joinDepth: () => 2.5, throwDepth: () => 2, lagged: true, earliest: -1.7, formationRamp: () => 0.85 };
    // Joined at 0 at 2.5 m, its crest past its 2 m throw depth at 1 s, the solver not breaking it.
    const p: FrontPoint = {
      id: 0, front: 0, column: 0, sigma: 0, x: 0, z: 0, b: Number.NaN, height: 1, joined: 0, depth: 2.5, throwDepth: 2, crestDepth: 1.9,
      thrown: 1, throwZ: 0, footHeight: 1, footDepth: 4.4, broke: 0, tau: -1.7, seen: 0, fresh: null, unbroken: true,
    };
    advanceClocks([p], 1.2, timing, 1 / 60);
    expect(p.tau).toBeLessThan(0);
    expect(p.tau).toBeGreaterThan(-0.01);
    expect(p.retire ?? 0).toBe(0);
    expect(p.formation).toBe(1);
    advanceClocks([p], 1.55, timing, 1 / 60);
    expect(p.retire).toBeCloseTo(0.5, 9);
    // The record carries its fade; every other point's is 0.
    const out = new Float32Array(2 * FRONT_STRIDE);
    writeFrontRecords([p, { ...p, unbroken: undefined, retire: undefined, formation: undefined, x: 1, sigma: 1 }], out);
    expect(out[FRONT_FIELD.fade]).toBeCloseTo(0.5, 6);
    expect(out[FRONT_STRIDE + FRONT_FIELD.fade]).toBe(0);
  });
});
