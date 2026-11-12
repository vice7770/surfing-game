import { describe, expect, it } from 'vitest';
import { BARREL_CASES } from './barrelLibraryIndex';
import { libraryFromBytes } from './barrelLibrary';
import { HELD_JET_STEP, heldFrameJetStep } from './heldJetStep';
import { overturnAt } from './heldOverturn';
import { readBarrelCases } from './nodeBarrelCases';
import { heldFrame, ProfileLibrary, type BarrelCase } from './ProfileLibrary';
import { decodeCase } from './profileFormat';

const BIG = 'periodic-pool-straight-big-l13';
const frameOf = (c: BarrelCase, tau: number) => Math.round((tau - c.tauStart) / c.tauStep);

// Ruling 16 (pool-look-reference step 4): the reference pool's held frame, by the jet-step test.
describe('the held frame’s jet-step test (`heldFrameJetStep`)', () => {
  const cases = readBarrelCases(undefined, BARREL_CASES).map(decodeCase);

  it('reads every case in the index', () => {
    expect(cases.length).toBe(13);
    expect(cases.map((c) => c.id)).toContain(BIG);
  });

  it('moves the pool’s big case from frame 176 to 175: 176’s jet area counts the void too (0.0754 against 0.0336 h0²)', () => {
    const big = cases.find((c) => c.id === BIG)!;
    expect(frameOf(big, heldFrame(big).tau)).toBe(176);
    const held = heldFrameJetStep(big);
    expect(frameOf(big, held.tau)).toBe(175);
    expect(held.clear).toBe(true);
    expect(overturnAt(big.frames, 176).jetArea).toBeCloseTo(0.0754, 3);
    expect(overturnAt(big.frames, 175).jetArea).toBeCloseTo(0.0336, 3);
    // Pick & Feddersen's fit for this run: A_J = 0.118 H_I² = 0.036 h0² (barrel-cases.md); frame 175 agrees within 10 %.
    expect(overturnAt(big.frames, 175).jetArea / 0.036).toBeGreaterThan(0.9);
    expect(overturnAt(big.frames, 175).jetArea / 0.036).toBeLessThan(1.1);
  });

  it('leaves every other case’s held frame where it was: they step × 1.02–1.16 into it', () => {
    for (const c of cases) {
      if (c.id === BIG) continue;
      const old = heldFrame(c);
      expect(heldFrameJetStep(c), c.id).toEqual(old);
      const frame = frameOf(c, old.tau);
      const step = overturnAt(c.frames, frame).jetArea / overturnAt(c.frames, frame - 1).jetArea;
      expect(step, c.id).toBeGreaterThan(1);
      expect(step, c.id).toBeLessThan(1.17);
      expect(step, c.id).toBeLessThan(HELD_JET_STEP);
    }
  });

  it('holds the same on the library’s own frames (their loops closed), and only when the library is asked', () => {
    for (const c of cases) {
      const plain = new ProfileLibrary([c]);
      const stepped = new ProfileLibrary([c], { heldFrame: heldFrameJetStep });
      const [mine] = stepped.cases;
      const before = frameOf(c, plain.heldFrameOf(plain.cases[0]).tau);
      expect(before, c.id).toBe(frameOf(c, heldFrame(c).tau));
      expect(frameOf(c, stepped.heldFrameOf(mine).tau), c.id).toBe(c.id === BIG ? 175 : before);
    }
    const bytes = readBarrelCases('pool', undefined, 'big');
    const old = libraryFromBytes(bytes, 'basilisk', 'pool');
    const ref = libraryFromBytes(bytes, 'basilisk', 'pool', 'jet-step');
    expect(frameOf(old.cases[0], old.heldFrameOf(old.cases[0]).tau)).toBe(176);
    expect(frameOf(ref.cases[0], ref.heldFrameOf(ref.cases[0]).tau)).toBe(175);
    // `?poolTubeCase=pool` on the default pool blends the same case: it keeps frame 176 (no rule asked).
    const pool = libraryFromBytes(readBarrelCases('pool', undefined, 'pool'), 'basilisk', 'pool');
    expect(pool.cases.map((c) => frameOf(c, pool.heldFrameOf(c).tau))).toEqual(readBarrelCases('pool', undefined, 'pool').map(decodeCase).map((c) => frameOf(c, heldFrame(c).tau)));
  });
});
