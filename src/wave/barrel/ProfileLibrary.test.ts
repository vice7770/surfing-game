import { describe, expect, it } from 'vitest';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase, encodeCase } from './profileFormat';
import { CLEAR, heldFrame, LANDMARK, PROFILE_POINTS, ProfileLibrary } from './ProfileLibrary';
import { GRAVITY } from '../dispersion';
import { toyCase, tubeCase } from './toyCase';

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

  it('round-trips a case with its tip velocities (BRL2), and reads a BRL1 file with none', () => {
    const c = tubeCase(0.3);
    const back = decodeCase(encodeCase(c));
    expect(Array.from(back.frames)).toEqual(Array.from(c.frames));
    expect(Array.from(back.tipVelocity!)).toEqual(Array.from(c.tipVelocity!));
    const old = encodeCase(c).slice();
    new DataView(old.buffer).setUint32(0, 0x42524c31, true);
    const legacy = decodeCase(old.subarray(0, old.length - c.tipVelocity!.length * 4));
    expect(Array.from(legacy.frames)).toEqual(Array.from(c.frames));
    expect(legacy.tipVelocity).toBeUndefined();
  });

  it('gives the tip’s velocity in m/s, scaled by √(g h0), and the last clear time a frame before touchdown', () => {
    const c = tubeCase(0.3);
    const library = new ProfileLibrary([c]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    const lookup = library.profileAt({ slope: c.slope, footHeight: 2.1, footDepth: 7, seconds: 0.1 }, out);
    // One case: h0 = 2.1 / 0.3 = 7 m.
    expect(lookup.tipAlong).toBeCloseTo(0.9 * Math.sqrt(GRAVITY * 7), 4);
    expect(lookup.tipUp).toBeCloseTo(-0.3 * Math.sqrt(GRAVITY * 7), 4);
    expect(lookup.clearSeconds).toBeCloseTo((c.touchdown - c.tauStep) * Math.sqrt(7 / GRAVITY), 6);
    expect(library.profileTimes({ slope: c.slope, footHeight: 2.1, footDepth: 7 }).clearSeconds).toBe(lookup.clearSeconds);
    // A BRL1 case has none: zero.
    const legacy = new ProfileLibrary([toyCase(0.3, 0.1)]).profileAt({ slope: 0.05, footHeight: 2.1, footDepth: 7, seconds: 0.1 }, out);
    expect(legacy.tipAlong).toBe(0);
    expect(legacy.tipUp).toBe(0);
  });
});

describe('the held frame, where the contact holds through touchdown (the advisor, 2026-09-30)', () => {
  /** The toy tube's void at its held frame, h0: its underside over the toe, at x 0.8 h0. */
  const TUBE_VOID = 0.6 - 0.2 / 6;
  /** The toy tube with its frame a frame before touchdown (3) changed by `edit`. */
  const edited = (edit: (frame: Float32Array) => void) => {
    const c = tubeCase(0.3);
    edit(c.frames.subarray(3 * 2 * PROFILE_POINTS, 4 * 2 * PROFILE_POINTS));
    return c;
  };

  it('holds the frame before touchdown where the jet is off the face and the void open, and measures its void', () => {
    const held = heldFrame(tubeCase(0.3));
    expect(held.clear).toBe(true);
    expect(held.tau).toBe(0.25);
    expect(held.voidHeight).toBeCloseTo(TUBE_VOID, 5);
  });

  it('goes back past a frame whose void has collapsed onto the face, or whose jet has reached it', () => {
    // pad19-a30-l12's way: the underside bunched against the face, the tip within a cell of the throat.
    const collapsed = edited((frame) => {
      for (let i = LANDMARK.lip; i <= LANDMARK.toe; i += 1) {
        const t = (LANDMARK.toe - i) / (LANDMARK.toe - LANDMARK.lip);
        frame[2 * i] = 0.8 + 0.01 * t;
        frame[2 * i + 1] = 0.01 * t;
      }
    });
    expect(heldFrame(collapsed)).toMatchObject({ tau: 0, clear: true });
    // A tip a cell over the flat: the jet has reached the face.
    const landed = edited((frame) => {
      frame[2 * LANDMARK.lip + 1] = CLEAR.gap / 2;
    });
    expect(heldFrame(landed)).toMatchObject({ tau: 0, clear: true });
    // Neither in any frame: the frame before touchdown, unclear.
    expect(heldFrame(toyCase(0.3, 0))).toMatchObject({ tau: 0.25, clear: false, voidHeight: 0 });
  });

  it('finds the library’s held frames: a frame before touchdown, two in pad19-a30-l12, whose last two have closed', () => {
    const found = new Map(readBarrelCases().map(decodeCase).map((c) => {
      const held = heldFrame(c);
      return [c.id, { before: Math.round((c.touchdown - held.tau) / c.tauStep), metres: 7 * held.voidHeight, clear: held.clear }];
    }));
    // Voids at h0 7 m: 0.48, 1.17, 1.75 and 0.49 m (measured on the frames; W_O across the voids is 0.45, 1.00, 1.45, 0.39 m).
    const expected = { 'pad19-a20-l12': [1, 0.482], 'pad19-a30-l12': [2, 1.172], 'pad19-a45-l12': [1, 1.748], 'periodic-padang19s-l12': [1, 0.492] };
    for (const [id, [before, metres]] of Object.entries(expected)) {
      expect(found.get(id)).toMatchObject({ before, clear: true });
      expect(found.get(id)!.metres).toBeCloseTo(metres, 2);
    }
  });

  it('collapses a slice’s tube over √(2W/g), W its held void blended by the cases’ weights and scaled by h0', () => {
    const library = new ProfileLibrary([tubeCase(0.3)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    // One case at h0 7 m.
    const lookup = library.profileAt({ slope: 0.05, footHeight: 2.1, footDepth: 7, seconds: 0.1 }, out);
    expect(lookup.collapseSeconds).toBeCloseTo(Math.sqrt((2 * TUBE_VOID * 7) / GRAVITY), 5);
    // A second tube twice as tall: at A0 0.4, halfway between, over h0 = the foot depth, 7 m.
    const tall = tubeCase(0.5);
    for (let k = 1; k < tall.frames.length; k += 2) tall.frames[k] *= 2;
    const blend = new ProfileLibrary([tubeCase(0.3), tall]).profileTimes({ slope: 0.05, footHeight: 2.8, footDepth: 7 });
    expect(blend.collapseSeconds).toBeCloseTo(Math.sqrt((2 * 1.5 * TUBE_VOID * 7) / GRAVITY), 5);
    expect(blend.clearSeconds).toBeCloseTo(0.25 * Math.sqrt(7 / GRAVITY), 9);
  });
});
