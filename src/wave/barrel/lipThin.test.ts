import { afterEach, describe, expect, it } from 'vitest';
import { libraryFromBytes } from './barrelLibrary';
import { CrashCurve } from './crashCurve';
import { LIP_THIN, lipThinShare, thinFrame, thinLip } from './lipThin';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, type BarrelCase } from './ProfileLibrary';

const FLOATS = 2 * PROFILE_POINTS;
const UNDER = LANDMARK.throat - LANDMARK.lip;

/** A flat lip: the top run along y = 1 from x = 0 to the tip at (1, 1), the underside `thick` under it back to x = 0.2. */
function flatLip(thick: number): Float32Array {
  const frame = new Float32Array(FLOATS);
  for (let i = 0; i < PROFILE_POINTS; i += 1) {
    let x: number;
    let y: number;
    if (i < LANDMARK.crest) [x, y] = [-1 + i / LANDMARK.crest, 0.5 + 0.5 * (i / LANDMARK.crest)];
    else if (i <= LANDMARK.lip) [x, y] = [(i - LANDMARK.crest) / (LANDMARK.lip - LANDMARK.crest), 1];
    else if (i <= LANDMARK.throat) [x, y] = [0.99 - (0.79 * (i - LANDMARK.lip - 1)) / (UNDER - 1), 1 - thick];
    else [x, y] = [0.2 + (i - LANDMARK.throat) * 0.05, 1 - thick - (i - LANDMARK.throat) * 0.02];
    frame[2 * i] = x;
    frame[2 * i + 1] = y;
  }
  return frame;
}
const thickAt = (frame: Float32Array, i: number) => 1 - frame[2 * i + 1];
const bitsOf = (frames: Float32Array) => new Uint32Array(frames.buffer, frames.byteOffset, frames.length);
const big = () => decodeCase(readBarrelCases('pool', undefined, 'big')[0]);

afterEach(() => {
  LIP_THIN.on = true;
});

describe('the hand-thinned lip (ruling 23)', () => {
  it('is on, and keyed to the pool’s 1.8 m run alone', () => {
    expect(LIP_THIN.on).toBe(true);
    expect(LIP_THIN.caseId).toBe('periodic-pool-straight-big-l13');
    expect(big().id).toBe(LIP_THIN.caseId);
  });

  it('fades in time: whole to 0.36, eased to the held share at 0.90, then held', () => {
    expect(lipThinShare(0.01)).toBe(1);
    expect(lipThinShare(LIP_THIN.fullUntil)).toBe(1);
    expect(lipThinShare((LIP_THIN.fullUntil + LIP_THIN.heldFrom) / 2)).toBeCloseTo((1 + LIP_THIN.held) / 2, 12);
    expect(lipThinShare(LIP_THIN.heldFrom)).toBeCloseTo(LIP_THIN.held, 12);
    expect(lipThinShare(3)).toBeCloseTo(LIP_THIN.held, 12);
    let last = 1;
    for (let tau = 0.3; tau < 1; tau += 0.01) {
      expect(lipThinShare(tau)).toBeLessThanOrEqual(last);
      last = lipThinShare(tau);
    }
  });

  it('moves a thick lip’s underside by one capillary length times the ramp, toward the top face', () => {
    const stored = flatLip(0.2);
    const frame = stored.slice();
    expect(thinFrame(stored, frame, 0, 0.1)).toBeGreaterThan(0);
    let last = Infinity;
    for (let i = LANDMARK.lip + 1; i < LANDMARK.throat; i += 1) {
      const cut = thickAt(stored, i) - thickAt(frame, i);
      expect(frame[2 * i]).toBe(stored[2 * i]);
      expect(cut).toBeGreaterThanOrEqual(0);
      expect(cut).toBeLessThanOrEqual(LIP_THIN.cut + 1e-6);
      // The ramp falls from the tip's side to the throat's.
      expect(cut).toBeLessThanOrEqual(last + 1e-6);
      last = cut;
    }
    // Next to the tip the ramp is nearly whole (this flat lip's blunt end takes a fifth of the arc); next to the throat, nearly nothing.
    expect(thickAt(stored, LANDMARK.lip + 1) - thickAt(frame, LANDMARK.lip + 1)).toBeGreaterThan(0.85 * LIP_THIN.cut);
    expect(thickAt(stored, LANDMARK.throat - 1) - thickAt(frame, LANDMARK.throat - 1)).toBeLessThan(0.02 * LIP_THIN.cut);
  });

  it('never cuts more than half the thickness', () => {
    const stored = flatLip(0.04);
    const frame = stored.slice();
    thinFrame(stored, frame, 0, 0.1);
    for (let i = LANDMARK.lip + 1; i < LANDMARK.throat; i += 1) expect(thickAt(frame, i)).toBeGreaterThanOrEqual(0.02 - 1e-6);
    expect(thickAt(frame, LANDMARK.lip + 1)).toBeLessThan(0.022);
  });

  it('leaves the floor: a lip just over it is cut to it, one under it is not touched', () => {
    const over = flatLip(LIP_THIN.floor + 0.001);
    const cut = over.slice();
    thinFrame(over, cut, 0, 0.1);
    for (let i = LANDMARK.lip + 1; i < LANDMARK.throat; i += 1) expect(thickAt(cut, i)).toBeGreaterThanOrEqual(LIP_THIN.floor - 1e-6);
    expect(thickAt(cut, LANDMARK.lip + 1)).toBeLessThan(LIP_THIN.floor + 0.0002);
    const under = flatLip(LIP_THIN.floor - 0.001);
    const same = under.slice();
    expect(thinFrame(under, same, 0, 0.1)).toBe(0);
    expect(Array.from(bitsOf(same))).toEqual(Array.from(bitsOf(under)));
  });

  it('cuts less late in the flight, and nothing at or before the throw', () => {
    const stored = flatLip(0.2);
    const early = stored.slice();
    const late = stored.slice();
    thinFrame(stored, early, 0, 0.2);
    thinFrame(stored, late, 0, 1.2);
    const i = LANDMARK.lip + 3;
    expect(thickAt(stored, i) - thickAt(late, i)).toBeCloseTo(LIP_THIN.held * (thickAt(stored, i) - thickAt(early, i)), 6);
    for (const tau of [0, -0.5]) {
      const frame = stored.slice();
      expect(thinFrame(stored, frame, 0, tau)).toBe(0);
      expect(Array.from(bitsOf(frame))).toEqual(Array.from(bitsOf(stored)));
    }
  });

  it('does not touch the tip, the top face, the throat or anything else', () => {
    const stored = flatLip(0.2);
    const frame = stored.slice();
    thinFrame(stored, frame, 0, 0.1);
    const [a, b] = [bitsOf(stored), bitsOf(frame)];
    for (let i = 0; i < PROFILE_POINTS; i += 1) {
      if (i > LANDMARK.lip && i < LANDMARK.throat) continue;
      expect([b[2 * i], b[2 * i + 1]], `point ${i}`).toEqual([a[2 * i], a[2 * i + 1]]);
    }
  });

  it('cuts the stored case: points 0..64 and 88..127 and every frame up to the throw byte-equal, no thickness grown', () => {
    const stored = big();
    const cut = thinLip(stored);
    expect(cut).not.toBe(stored);
    expect(cut.storedFrames).toBe(stored.frames);
    expect({ ...cut, frames: undefined, storedFrames: undefined }).toEqual({ ...stored, frames: undefined, storedFrames: undefined });
    const [a, b] = [bitsOf(stored.frames), bitsOf(cut.frames)];
    const count = stored.frames.length / FLOATS;
    let moved = 0;
    for (let f = 0; f < count; f += 1) {
      const before = stored.tauStart + f * stored.tauStep <= 0;
      for (let i = 0; i < PROFILE_POINTS; i += 1) {
        const o = f * FLOATS + 2 * i;
        const same = a[o] === b[o] && a[o + 1] === b[o + 1];
        if (before || i <= LANDMARK.lip || i >= LANDMARK.throat) expect(same, `frame ${f} point ${i}`).toBe(true);
        else if (!same) moved += 1;
      }
    }
    expect(moved).toBeGreaterThan(500);
  });

  it('gives any other case, and this one with the constant off, back as it is', () => {
    const other: BarrelCase = { ...big(), id: 'periodic-pool-straight-big-bo4k-l14' };
    expect(thinLip(other)).toBe(other);
    for (const bytes of readBarrelCases()) {
      const c = decodeCase(bytes);
      if (c.id !== LIP_THIN.caseId) expect(thinLip(c), c.id).toBe(c);
    }
    LIP_THIN.on = false;
    const stored = big();
    expect(thinLip(stored)).toBe(stored);
  });

  it('reaches the library’s drawn and collided frames, and leaves the held frame and the crash’s water as stored', () => {
    const bytes = readBarrelCases('pool', undefined, 'big');
    const query = { slope: 0.0535, footHeight: 1.2, footDepth: 1.2 / 0.3547 };
    const profile = (library: ReturnType<typeof libraryFromBytes>, seconds: number, hold?: 'drawing' | 'contact') => {
      const out = new Float32Array(FLOATS);
      library.profileAt({ ...query, seconds, hold }, out);
      return out;
    };
    const on = libraryFromBytes(bytes, 'basilisk', 'pool', 'jet-step');
    LIP_THIN.on = false;
    const off = libraryFromBytes(bytes, 'basilisk', 'pool', 'jet-step');
    LIP_THIN.on = true;
    expect(off.cases[0].storedFrames).toBeUndefined();
    expect(on.heldFrameOf(on.cases[0])).toEqual(off.heldFrameOf(off.cases[0]));
    expect(on.profileTimes(query)).toEqual(off.profileTimes(query));
    // Before the throw nothing differs; in the flight the underside does, for the drawing and the contact alike.
    expect(Array.from(profile(on, -0.2))).toEqual(Array.from(profile(off, -0.2)));
    for (const hold of [undefined, 'drawing', 'contact'] as const) {
      const [a, b] = [profile(off, 0.4, hold), profile(on, 0.4, hold)];
      let differ = 0;
      for (let i = 0; i < PROFILE_POINTS; i += 1) {
        const same = a[2 * i] === b[2 * i] && a[2 * i + 1] === b[2 * i + 1];
        if (i <= LANDMARK.lip || i >= LANDMARK.throat) expect(same, `point ${i}`).toBe(true);
        else if (!same) differ += 1;
      }
      expect(differ, String(hold)).toBeGreaterThan(10);
    }
    expect(Array.from(profile(on, 0.4, 'drawing'))).toEqual(Array.from(profile(on, 0.4, 'contact')));
    // The crash's jet and void are the stored held frame's.
    const overturn = (library: ReturnType<typeof libraryFromBytes>) => (new CrashCurve(library, 0.0535) as unknown as { overturnOf(c: BarrelCase): unknown }).overturnOf(library.cases[0]);
    expect(overturn(on)).toEqual(overturn(off));
  });

  it('leaves the default pool’s a38 and every other spot’s cases as stored', () => {
    for (const spot of ['pool', 'canyon', 'reef', 'point', 'padang'] as const) {
      const bytes = readBarrelCases(spot);
      const library = libraryFromBytes(bytes, 'basilisk', spot);
      LIP_THIN.on = false;
      const off = libraryFromBytes(bytes, 'basilisk', spot);
      LIP_THIN.on = true;
      library.cases.forEach((c, k) => {
        expect(c.storedFrames, c.id).toBeUndefined();
        expect(Array.from(bitsOf(c.frames)), c.id).toEqual(Array.from(bitsOf(off.cases[k].frames)));
      });
    }
  });
});
