import { describe, expect, it } from 'vitest';
import { decodeCase, encodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, type BarrelCase } from './ProfileLibrary';

/** A toy case: its lip moves forward with each frame, so interpolation is checkable. */
function toyCase(nonlinearity: number, lipGain: number): BarrelCase {
  const frames = 5;
  const data = new Float32Array(frames * 2 * PROFILE_POINTS);
  for (let f = 0; f < frames; f += 1) {
    for (let p = 0; p < PROFILE_POINTS; p += 1) {
      data[(f * PROFILE_POINTS + p) * 2] = p / 32 + (p === LANDMARK.lip ? lipGain * f : 0);
      data[(f * PROFILE_POINTS + p) * 2 + 1] = p === LANDMARK.crest ? 0.5 : 0.1;
    }
  }
  return { id: `toy-${nonlinearity}`, slope: 0.05, nonlinearity, flatDepth: 0.18, breakerHeight: 0.5, tauStep: 0.25, tauStart: -0.5, touchdown: 0.5, frames: data };
}

describe('the barrel profile library', () => {
  it('round-trips a case through its binary form', () => {
    const c = toyCase(0.3, 0.1);
    expect(decodeCase(encodeCase(c))).toEqual(c);
  });

  it('interpolates in τ between frames and scales to the solver’s height (Froude)', () => {
    const library = new ProfileLibrary([toyCase(0.3, 0.1)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    // H = 2 m against H_I 0.5 h0: h0 = 4 m, so τ's unit is √(4 / 9.81) s. τ = 0.125 sits at frame 2.5.
    const lookup = library.profileAt({ slope: 0.05, nonlinearity: 0.3, height: 2, seconds: 0.125 * Math.sqrt(4 / 9.81) }, out);
    expect(lookup.scale).toBeCloseTo(4, 9);
    expect(lookup.phase).toBe('open');
    expect(out[2 * LANDMARK.lip]).toBeCloseTo(4 * (LANDMARK.lip / 32 + 0.1 * 2.5), 4);
    expect(out[2 * LANDMARK.crest + 1]).toBeCloseTo(2, 5);
  });

  // Review Focus 1: outside the library's cases it clamps, flagged, and never extrapolates.
  it('blends two cases by nonlinearity, and clamps (flagged) outside them, never extrapolating', () => {
    const library = new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    expect(library.profileAt({ slope: 0.05, nonlinearity: 0.3, height: 0.5, seconds: 0 }, out).clamped).toBe(false);
    expect(library.profileAt({ slope: 0.05, nonlinearity: 0.9, height: 0.5, seconds: 0 }, out).clamped).toBe(true);
    expect(library.profileAt({ slope: 0.2, nonlinearity: 0.3, height: 0.5, seconds: 0 }, out).clamped).toBe(true);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
  });

  // Review Focus 4: a tiny breaker at the lowest spring tide.
  it('keeps a tiny breaker finite, its landmarks in order', () => {
    const library = new ProfileLibrary([toyCase(0.3, 0.1)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    library.profileAt({ slope: 0.05, nonlinearity: 0.3, height: 0.05, seconds: 3 }, out);
    expect(out.every((v) => Number.isFinite(v))).toBe(true);
    expect(out[2 * LANDMARK.crest]).toBeLessThan(out[2 * LANDMARK.toe]);
  });
});
