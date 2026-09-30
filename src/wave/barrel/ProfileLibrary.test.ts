import { describe, expect, it } from 'vitest';
import { decodeCase, encodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';
import { toyCase } from './toyCase';

describe('the barrel profile library', () => {
  it('round-trips a case through its binary form', () => {
    const c = toyCase(0.3, 0.1);
    expect(decodeCase(encodeCase(c))).toEqual(c);
  });

  it('interpolates in τ between frames and scales by Froude to the slice’s h0', () => {
    const library = new ProfileLibrary([toyCase(0.3, 0.1)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    // A 1.2 m foot crest over 4 m: A0 0.3, h0 4 m, so τ's unit is √(4 / 9.81) s. τ = 0.125 sits at frame 2.5.
    const lookup = library.profileAt({ slope: 0.05, footHeight: 1.2, footDepth: 4, seconds: 0.125 * Math.sqrt(4 / 9.81) }, out);
    expect(lookup.scale).toBeCloseTo(4, 9);
    expect(lookup.phase).toBe('open');
    expect(out[2 * LANDMARK.lip]).toBeCloseTo(4 * (LANDMARK.lip / 32 + 0.1 * 2.5), 4);
    expect(out[2 * LANDMARK.crest + 1]).toBeCloseTo(2, 5);
  });

  it('scales a slice by its foot: its foot depth inside the cases, the nearest case’s own A0 outside (the advisor, 2026-09-30)', () => {
    const library = new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    // A0 0.3: blended, h0 the foot depth, 7 m; τ's unit √(7/g), the touchdown 0.5 of it, a frame 0.25 of it.
    const inside = library.profileAt({ slope: 0.05, footHeight: 2.1, footDepth: 7, seconds: 0 }, out);
    expect(inside.scale).toBe(7);
    expect(inside.clamped).toBe(false);
    expect(inside.touchdownSeconds).toBeCloseTo(0.5 * Math.sqrt(7 / 9.81), 12);
    expect(inside.frameSeconds).toBeCloseTo(0.25 * Math.sqrt(7 / 9.81), 12);
    // A0 0.1: the 0.2 case, scaled so its foot crest is the slice's: h0 = 0.7 / 0.2 = 3.5 m.
    const small = library.profileAt({ slope: 0.05, footHeight: 0.7, footDepth: 7, seconds: 0 }, out);
    expect(small.scale).toBeCloseTo(3.5, 12);
    expect(small.clamped).toBe(true);
    // A0 0.6: the 0.4 case, h0 = 4.2 / 0.4 = 10.5 m.
    expect(library.profileAt({ slope: 0.05, footHeight: 4.2, footDepth: 7, seconds: 0 }, out).scale).toBeCloseTo(10.5, 12);
  });

  // Review Focus 1: outside the library's cases it clamps, flagged, and never extrapolates.
  it('blends two cases by nonlinearity, and clamps (flagged) outside them, never extrapolating', () => {
    const library = new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    expect(library.profileAt({ slope: 0.05, footHeight: 0.3 * 7, footDepth: 7, seconds: 0 }, out).clamped).toBe(false);
    expect(library.profileAt({ slope: 0.05, footHeight: 0.9 * 7, footDepth: 7, seconds: 0 }, out).clamped).toBe(true);
    expect(library.profileAt({ slope: 0.2, footHeight: 0.3 * 7, footDepth: 7, seconds: 0 }, out).clamped).toBe(true);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  // Review Focus 4: a tiny breaker at the lowest spring tide.
  it('keeps a tiny breaker finite, its landmarks in order', () => {
    const library = new ProfileLibrary([toyCase(0.3, 0.1)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    library.profileAt({ slope: 0.05, footHeight: 0.0105, footDepth: 0.035, seconds: 3 }, out);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
    expect(out[2 * LANDMARK.crest]).toBeLessThan(out[2 * LANDMARK.toe]);
  });
});
