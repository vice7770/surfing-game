import { describe, expect, it } from 'vitest';
import { lipShare } from './arcMesh';
import { libraryFromBytes } from './barrelLibrary';
import { encodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, ProfileLibrary, arcFramesOf, type BarrelCase } from './ProfileLibrary';

/**
 * Ruling 19's frame join (`ProfileLibrary`'s `frameJoin: 'arc'`, `?frameJoin=arc`;
 * docs/research/pool-look-reference-2026-11-11/ruling-19.md, section (a)): before the throw two frames whose lips have no
 * underside are each spaced by arc at the throw's share, then joined; from the throw on, and where one of the two already
 * has a jet, the join is today's. The stored frames stay as they are.
 */

const { crest, lip, throat, toe, front } = LANDMARK;
const FLOATS = 2 * PROFILE_POINTS;
const THROW_SHARE = 0.3;
const GRAVITY = 9.81;

/** The test profile's curve from the crest to the toe by its arc share: a quarter circle (radius 0.2) then a straight face. */
function faceCurve(u: number, steep: number): [number, number] {
  const radius = 0.2;
  const bend = (Math.PI / 2) * radius;
  const run = Math.hypot(0.1 + steep, 0.3);
  const s = u * (bend + run);
  if (s <= bend) {
    const angle = Math.PI / 2 - s / radius;
    return [radius * Math.cos(angle), 0.3 + radius * Math.sin(angle)];
  }
  const t = (s - bend) / run;
  return [0.2 + t * (0.1 + steep), 0.3 - 0.3 * t];
}

/** One frame: the lip mark at `share` of the crest-to-toe arc, its lip-to-throat points all there (or a jet `jet` long). */
function frame(share: number, steep: number, jet = 0): Float32Array {
  const out = new Float32Array(FLOATS);
  const put = (i: number, p: [number, number]) => { out[2 * i] = p[0]; out[2 * i + 1] = p[1]; };
  for (let i = 0; i < PROFILE_POINTS; i += 1) {
    if (i <= crest) put(i, [-2 + (2 * i) / crest, (0.5 * i) / crest]);
    else if (i <= lip) put(i, faceCurve((share * (i - crest)) / (lip - crest), steep));
    else if (i <= throat) {
      const p = faceCurve(share, steep);
      const t = (i - lip) / (throat - lip);
      put(i, [p[0] + jet * (i === lip ? 0 : 0.5 * (1 - t)), p[1] - 0.2 * jet * t]);
    } else if (i <= toe) put(i, faceCurve(share + ((1 - share) * (i - throat)) / (toe - throat), steep));
    else put(i, [0.3 + steep + (1.7 * (i - toe)) / (front - toe), 0]);
  }
  if (jet > 0) put(lip, [faceCurve(share, steep)[0] + 0.5 * jet, faceCurve(share, steep)[1]]);
  return out;
}

const SLIDES = [0.62, 0.08, 0.45, 0.15, 0.7, 0.1, 0.55, 0.2, 0.66, 0.12];
/**
 * A case whose lip mark slides before the throw, as the library's does: frames 0.1 apart from τ = −1 (frame 10 at the
 * throw); before it the mark stands at a share of its own each frame, from it at `THROW_SHARE`. The face's foot runs
 * forward with the clock. `jetAt`: a frame before the throw whose lip already has an underside.
 */
function slideCase(jetAt?: number): BarrelCase {
  const frames = 15;
  const data = new Float32Array(frames * FLOATS);
  for (let f = 0; f < frames; f += 1) data.set(frame(f < 10 ? SLIDES[f] : THROW_SHARE, 0.01 * f, f === jetAt ? 0.1 : 0), f * FLOATS);
  return {
    id: 'slide', slope: 0.05, nonlinearity: 0.3, flatDepth: 0.18, breakerHeight: 0.5, tauStep: 0.1, tauStart: -1, touchdown: 0.4,
    frames: data, tipVelocity: new Float32Array(2 * frames),
  };
}

/** A slice at scale 1 (h0 1 m), so the profile is the case's own numbers; `tau` in the case's unit. */
const query = (tau: number) => ({ slope: 0.05, footHeight: 0.3, footDepth: 1, seconds: tau * Math.sqrt(1 / GRAVITY) });
const profile = (library: ProfileLibrary, tau: number): Float32Array => {
  const out = new Float32Array(FLOATS);
  library.profileAt(query(tau), out);
  return out;
};
/** A point's distance from the test curve at `steep`, crest to toe (the curve sampled finely). */
function offCurve(px: number, py: number, steep: number): number {
  let best = Infinity;
  for (let k = 0; k <= 4000; k += 1) {
    const [x, y] = faceCurve(k / 4000, steep);
    best = Math.min(best, Math.hypot(px - x, py - y));
  }
  return best;
}
const worstOff = (p: Float32Array, steep: number): number => {
  let worst = 0;
  for (let i = crest; i <= toe; i += 1) worst = Math.max(worst, offCurve(p[2 * i], p[2 * i + 1], steep));
  return worst;
};

describe('the frame join by arc: the frames spaced (`arcFramesOf`)', () => {
  it('keeps the frames up to the throw, each spaced with the lip mark at the throw’s share, the case’s own untouched', () => {
    const c = slideCase();
    const stored = c.frames.slice();
    const arc = arcFramesOf(c)!;
    expect(arc.last).toBe(10);
    expect(arc.share).toBeCloseTo(THROW_SHARE, 2);
    expect(arc.frames.length).toBe(11 * FLOATS);
    expect([...arc.spaced]).toEqual(new Array(11).fill(1));
    for (let f = 0; f <= 10; f += 1) {
      const spaced = arc.frames.subarray(f * FLOATS, (f + 1) * FLOATS);
      expect(lipShare(spaced), `frame ${f}`).toBeCloseTo(THROW_SHARE, 2);
      // On the frame's own curve, and nothing moved up to the crest or from the toe.
      expect(worstOff(spaced, 0.01 * f), `frame ${f}`).toBeLessThan(0.002);
      for (let i = 0; i < PROFILE_POINTS; i += 1) {
        if (i > crest && i < toe) continue;
        expect(spaced[2 * i]).toBe(stored[f * FLOATS + 2 * i]);
        expect(spaced[2 * i + 1]).toBe(stored[f * FLOATS + 2 * i + 1]);
      }
    }
    expect(c.frames).toEqual(stored);
  });

  it('leaves a frame whose lip has an underside as stored, and has nothing for a case that starts at its throw', () => {
    const c = slideCase(7);
    const arc = arcFramesOf(c)!;
    expect(arc.spaced[7]).toBe(0);
    expect(arc.spaced[6]).toBe(1);
    expect(arc.frames.subarray(7 * FLOATS, 8 * FLOATS)).toEqual(c.frames.subarray(7 * FLOATS, 8 * FLOATS));
    expect(arcFramesOf({ ...slideCase(), tauStart: 0.05 })).toBeUndefined();
  });
});

describe('the frame join by arc: the library', () => {
  const c = slideCase();
  const today = new ProfileLibrary([c]);
  const joined = new ProfileLibrary([c], { frameJoin: 'arc' });

  it('is off unless asked: the library without the option joins point by point, and counts nothing', () => {
    expect(today.arcJoinPairs).toBe(0);
    const mid = profile(today, -0.55);
    const a = c.frames.subarray(4 * FLOATS, 5 * FLOATS);
    const b = c.frames.subarray(5 * FLOATS, 6 * FLOATS);
    for (let i = 0; i < FLOATS; i += 1) expect(mid[i]).toBeCloseTo(0.5 * (a[i] + b[i]), 6);
  });

  it('draws the curve between two frames where today’s join cuts across the bend', () => {
    // Between frames 4 and 5 the mark slides from 0.7 to 0.1 of the arc: the true curve is the face at steep 0.045.
    expect(worstOff(profile(today, -0.55), 0.045)).toBeGreaterThan(0.02);
    expect(worstOff(profile(joined, -0.55), 0.045)).toBeLessThan(0.003);
    for (const tau of [-0.95, -0.73, -0.41, -0.26, -0.08, -0.001]) expect(worstOff(profile(joined, tau), 0.01 * (10 + tau / 0.1)), `tau ${tau}`).toBeLessThan(0.003);
  });

  it('draws each stored frame’s own curve at its own time, the lip’s points at the throw’s share', () => {
    for (let f = 0; f < 10; f += 1) {
      const p = profile(joined, -1 + 0.1 * f);
      expect(worstOff(p, 0.01 * f), `frame ${f}`).toBeLessThan(0.002);
      expect(lipShare(p), `frame ${f}`).toBeCloseTo(THROW_SHARE, 2);
      expect(Math.hypot(p[2 * throat] - p[2 * lip], p[2 * throat + 1] - p[2 * lip + 1])).toBeLessThan(1e-6);
    }
  });

  it('moves no point at the throw or after it, and none outside the crest-to-toe arc before it', () => {
    for (const tau of [0, 0.03, 0.1, 0.17, 0.33, 0.4]) expect(profile(joined, tau), `tau ${tau}`).toEqual(profile(today, tau));
    for (const tau of [-0.95, -0.55, -0.05]) {
      const a = profile(joined, tau);
      const b = profile(today, tau);
      for (let i = 0; i < PROFILE_POINTS; i += 1) {
        if (i > crest && i < toe) continue;
        expect(a[2 * i]).toBe(b[2 * i]);
        expect(a[2 * i + 1]).toBe(b[2 * i + 1]);
      }
    }
  });

  it('gives `pointAt` the same curve as `profileAt` (the wall’s water, the contact and the crash read one curve)', () => {
    const out = new Float64Array(2);
    for (const tau of [-0.95, -0.55, -0.31, -0.05, 0, 0.2]) {
      const p = profile(joined, tau);
      for (const point of [crest, lip, throat, toe, front]) {
        joined.pointAt(query(tau), point, out);
        expect(out[0], `tau ${tau} point ${point}`).toBeCloseTo(p[2 * point], 5);
        expect(out[1], `tau ${tau} point ${point}`).toBeCloseTo(p[2 * point + 1], 5);
      }
    }
  });

  it('keeps today’s join for a pair with one frame with an underside and one without, and counts them', () => {
    const mixed = slideCase(7);
    const a = new ProfileLibrary([mixed], { frameJoin: 'arc' });
    const b = new ProfileLibrary([mixed]);
    expect(joined.arcJoinPairs).toBe(10);
    expect(joined.arcJoinMixed).toBe(0);
    expect(a.arcJoinPairs).toBe(10);
    expect(a.arcJoinMixed).toBe(2);
    for (const tau of [-0.38, -0.3, -0.22]) expect(profile(a, tau), `tau ${tau}`).toEqual(profile(b, tau));
    expect(worstOff(profile(a, -0.55), 0.045)).toBeLessThan(0.003);
  });

  it('is threaded by `libraryFromBytes`, for the raw shape alone, and leaves the cases’ frames as stored', () => {
    const bytes = [encodeCase(c)];
    expect(libraryFromBytes(bytes).options.frameJoin).toBeUndefined();
    expect(libraryFromBytes(bytes, 'basilisk', undefined, undefined, 'arc').options.frameJoin).toBe('arc');
    expect(libraryFromBytes(bytes, 'basilisk', undefined, 'jet-step', 'arc').options).toMatchObject({ frameJoin: 'arc' });
    expect(libraryFromBytes(bytes, 'basilisk', undefined, 'jet-step', 'arc').options.heldFrame).toBeDefined();
    expect(libraryFromBytes(bytes, 'bounded-C', undefined, undefined, 'arc').options.frameJoin).toBeUndefined();
    const on = libraryFromBytes(bytes, 'basilisk', undefined, undefined, 'arc');
    expect(on.cases[0].frames).toEqual(libraryFromBytes(bytes).cases[0].frames);
    expect(on.arcJoinPairs).toBe(10);
  });
});
