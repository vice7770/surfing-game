import { describe, expect, it } from 'vitest';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type FrameBlend } from './ProfileLibrary';
import { sheetAcross, sheetTablesLookup } from './lipSheet';

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
