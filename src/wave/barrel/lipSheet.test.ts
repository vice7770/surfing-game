import { describe, expect, it } from 'vitest';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type FrameBlend } from './ProfileLibrary';
import { NO_CHORD, polylineChords, sheetAcross, sheetTablesLookup } from './lipSheet';

const library = new ProfileLibrary(readBarrelCases().map(decodeCase));
/** Padang Padang's library slope and its foot depth, m. */
const SLOPE = 1 / 19;
const H0 = 7;

describe('the lip’s sheet kept per library frame (the advisor, 2026-10-01)', () => {
  it('knows how the library blends a slice’s profile from its cases’ frames', () => {
    const profile = new Float32Array(2 * PROFILE_POINTS);
    const blend = {} as FrameBlend;
    for (const [a0, share] of [[0.17, 0.4], [0.3, 0.9], [0.5, 0.2], [0.12, 1.2]]) {
      const times = library.profileTimes({ slope: SLOPE, footHeight: a0 * H0, footDepth: H0 });
      const query = { slope: SLOPE, footHeight: a0 * H0, footDepth: H0, seconds: share * times.touchdownSeconds, hold: 'drawing' as const };
      library.profileAt(query, profile);
      library.frameBlend(query, blend);
      // Rebuild each point from the blend's frames as profileAt does.
      const floats = 2 * PROFILE_POINTS;
      for (const i of [0, LANDMARK.crest, LANDMARK.lip, LANDMARK.throat, LANDMARK.toe]) {
        for (let k = 0; k < 2; k += 1) {
          const at = (frames: Float32Array, f: number) => frames[f * floats + 2 * i + k];
          const lower = at(blend.lower.frames, blend.lowerFrame) + blend.lowerShare * (at(blend.lower.frames, blend.lowerNext) - at(blend.lower.frames, blend.lowerFrame));
          const upper = at(blend.upper.frames, blend.upperFrame) + blend.upperShare * (at(blend.upper.frames, blend.upperNext) - at(blend.upper.frames, blend.upperFrame));
          expect(profile[2 * i + k]).toBeCloseTo(blend.scale * (lower + blend.weight * (upper - lower)), 4);
        }
      }
    }
  });

  it('blends the sheet from its tables close to the blended profile’s own, over the library’s open blends', () => {
    const profile = new Float32Array(2 * PROFILE_POINTS);
    const across = new Float32Array(PROFILE_POINTS);
    const back = new Float32Array(PROFILE_POINTS);
    const out = { across: new Float32Array(PROFILE_POINTS), back: new Float32Array(PROFILE_POINTS) };
    const blend = {} as FrameBlend;
    const transmission: number[] = [];
    const views: number[] = [];
    for (let a0 = 0.12; a0 <= 0.5; a0 += 0.02) {
      for (let share = 0.1; share <= 1.001; share += 0.05) {
        const times = library.profileTimes({ slope: SLOPE, footHeight: a0 * H0, footDepth: H0 });
        const query = { slope: SLOPE, footHeight: a0 * H0, footDepth: H0, seconds: share * times.touchdownSeconds, hold: 'drawing' as const };
        const lookup = library.profileAt(query, profile);
        const formed = sheetAcross(profile, lookup.scale, across, back);
        if (!(formed > 0.99 && sheetTablesLookup(library.frameBlend(query, blend), out) > 0.99)) continue;
        for (let i = 36; i <= 84; i += 1) {
          if (Math.abs(i - LANDMARK.lip) <= 3) continue;
          // Red goes first in water (about 0.5 /m here): its transmission through the sheet is what a thickness error shows.
          transmission.push(Math.abs(Math.exp(-0.5 * out.across[i]) - Math.exp(-0.5 * across[i])));
          views.push(Math.abs(out.back[i] - back[i]));
        }
      }
    }
    const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
    const percentile = (values: number[], q: number) => sorted(values)[Math.floor(q * (values.length - 1))];
    expect(transmission.length).toBeGreaterThan(5000);
    expect(Math.max(...transmission)).toBeLessThan(0.025);
    expect(percentile(transmission, 0.99)).toBeLessThan(0.015);
    expect(percentile(views, 0.99)).toBeLessThan(0.05);
    expect(Math.max(...views)).toBeLessThan(0.15);
  });
});

describe('the water the sun crosses through a slice (look-fix round 1)', () => {
  /** A polyline from its points, (along, up) each. */
  const line = (points: [number, number][]) => new Float32Array(points.flat());

  it('runs from a point on the back ahead to the face, and from the face behind to the back, at the point’s height', () => {
    // Flat water at 0, a crest rising to (1, 1) and falling again to (2, 0).
    const points: [number, number][] = [[-2, 0], [-1, 0], [0, 0], [0.5, 0.5], [1, 1], [1.5, 0.5], [2, 0], [3, 0], [4, 0]];
    const out = new Float32Array(2 * points.length);
    polylineChords(line(points), points.length, out);
    // The back at (0.5, 0.5): the water lies ahead, to the face at x 1.5.
    expect(out[2 * 3]).toBeCloseTo(1, 6);
    expect(out[2 * 3 + 1]).toBe(NO_CHORD);
    // The face at (1.5, 0.5): the water lies behind, to the back at x 0.5.
    expect(out[2 * 5]).toBe(NO_CHORD);
    expect(out[2 * 5 + 1]).toBeCloseTo(1, 6);
    // The flat water: no water toward either side at its height.
    for (const i of [0, 1, 7, 8]) expect([out[2 * i], out[2 * i + 1]]).toEqual([NO_CHORD, NO_CHORD]);
    // The crest's top: the line meets no water on either side, so the chords run down to it, not off to nothing.
    expect([out[2 * 4], out[2 * 4 + 1]]).toEqual([0, 0]);
  });

  it('carries the line from a tube’s back wall across the tube and through the lip where it hangs at that height', () => {
    // A back rising to a crest, a lip thrown ahead to its tip at (5.6, 0.9), its underside back up to the throat at
    // (4, 1.6), the tube's inner face down to the toe at (3.5, 0), the trough and a ripple on it at (6.3, 0.05).
    const points: [number, number][] = [[-2, 0], [0, 0], [1, 1], [2, 2], [3, 2.5], [4, 2.4], [5, 2], [5.5, 1.4], [5.6, 0.9], [5.2, 1.2],
      [4.5, 1.5], [4, 1.6], [3.6, 1.2], [3.4, 0.6], [3.5, 0], [4.5, -0.2], [6, 0], [6.3, 0.05], [6.6, 0], [8, 0]];
    const out = new Float32Array(2 * points.length);
    polylineChords(line(points), points.length, out);
    // The back at (1, 1): the wall to the inner face at x 3.533, then the lip from its underside at 5.467 to its outer
    // face at 5.58, not the wall alone.
    const wall = 3.6 - (0.2 / 0.6) * 0.2 - 1;
    const lip = 5.5 + (0.4 / 0.5) * 0.1 - (5.6 - (0.1 / 0.3) * 0.4);
    expect(out[2 * 2]).toBeCloseTo(wall + lip, 5);
    // The ripple's top: nothing toward the open sea ahead; behind it, the wave from its toe to its back.
    expect(out[2 * 17]).toBe(0);
    expect(out[2 * 17 + 1]).toBeCloseTo(6.3 - 0.05 - (6.3 - (3.4 + (0.55 / 0.6) * 0.1)), 5);
    // The crest's top meets no water on either side. The throat, the top of the tube's air walked over backward, is no
    // crest's top: the light reaches its roof through the water behind it, back to the back slope at x 1.6.
    expect([out[2 * 4], out[2 * 4 + 1]]).toEqual([0, 0]);
    expect(out[2 * 11]).toBe(NO_CHORD);
    expect(out[2 * 11 + 1]).toBeCloseTo(4 - 1.6, 5);
  });

  it('crosses only the lip where it overturns, and finds nothing past the height field’s own reach', () => {
    // A lip thrown ahead of a face: out over the trough and back under itself to the face.
    const points: [number, number][] = [[-1, 0], [0, 0], [1, 2], [2, 2.2], [3, 1.6], [3.2, 1], [3, 0.8], [2.4, 1.3], [1.8, 1], [1.7, 0.5], [2, 0], [4, 0]];
    const out = new Float32Array(2 * points.length);
    polylineChords(line(points), points.length, out);
    // The lip's outer face at (3, 1.6) falls: behind it the lip, to its underside rising through 1.6? No: the underside
    // tops out at 1.3, so the water behind runs back to the back slope at x 0.8.
    expect(out[2 * 4 + 1]).toBeCloseTo(3 - 0.8, 5);
    // The underside at (2.4, 1.3) rises (walked from the tip back): the lip's water lies ahead of it, to the outer face.
    expect(out[2 * 7]).toBeGreaterThan(0);
    expect(out[2 * 7]).toBeLessThan(1);
    // A crest wider than the reach: no chord.
    const wide: [number, number][] = [[-20, 0], [-10, 1], [0, 2], [10, 1], [20, 0]];
    const far = new Float32Array(2 * wide.length);
    polylineChords(line(wide), wide.length, far);
    expect(far[2 * 1]).toBe(NO_CHORD);
  });
});
