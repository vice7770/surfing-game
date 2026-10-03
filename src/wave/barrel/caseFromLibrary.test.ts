import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  caseFromLibrary, libraryJson, refitTip, smoothUnderside, sustainedOverturn, TIP_FIT_FRAMES, tipVelocities, UNDERSIDE_SMOOTHING, undersideTurn, type LibraryJson,
} from './caseFromLibrary';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, PROFILE_POINTS, type BarrelCase } from './ProfileLibrary';

// Round 6's Padang Padang sample: level 11 on the 1:24.8 wedge, every second output from τ = −0.6 to 3.0.
const sample = JSON.parse(readFileSync('docs/research/water-physics/notes/round6-tube-profiles/data/padang-ray-L11-profiles.json', 'utf8')) as LibraryJson;

describe('a Basilisk library as a barrel case', () => {
  const { barrel, refilled } = caseFromLibrary(sample, 'padang-ray-l11', 0.1785714);
  const count = barrel.frames.length / (2 * PROFILE_POINTS);
  const phases = sample.frames.map((frame) => frame.phase);

  // The tube ends at touchdown and blends into the roller later (basilisk-profiles.md, decision 4): after touchdown
  // the landmarks lose their meaning (round 6 §5.2), so the case keeps one frame past it, for the blend's end.
  it('keeps the frames up to one past touchdown, in order, with the run’s slope, height and times', () => {
    expect(count).toBe(phases.filter((phase) => phase !== 'post').length + 1);
    expect(barrel.slope).toBeCloseTo(0.0403226, 7);
    expect(barrel.nonlinearity).toBe(0.3);
    expect(barrel.flatDepth).toBeCloseTo(0.1785714, 7);
    expect(barrel.touchdown).toBeCloseTo(sample.run.t_impact - sample.run.t_vertical, 9);
    expect(barrel.tauStart).toBeCloseTo(sample.frames[0].tau, 9);
    expect(barrel.tauStep).toBeCloseTo(0.05, 9);
    expect(barrel.breakerHeight).toBeCloseTo(sample.frames.filter((frame) => frame.phase === 'open').at(-1)!.H, 9);
  });

  it('puts x’s origin on the crest as the face goes vertical', () => {
    // τ = 0 falls between two frames (here −0.025 and +0.025), so read it as ProfileLibrary does.
    const position = (0 - barrel.tauStart) / barrel.tauStep;
    const f = Math.floor(position);
    const crest = (frame: number) => barrel.frames[(frame * PROFILE_POINTS + LANDMARK.crest) * 2];
    expect(Math.abs(crest(f) + (position - f) * (crest(f + 1) - crest(f)))).toBeLessThan(1e-5);
  });

  it('stores the lip tip’s velocity, two floats a frame', () => {
    expect(barrel.tipVelocity!.length).toBe(2 * count);
    expect(Array.from(barrel.tipVelocity!).every(Number.isFinite)).toBe(true);
  });

  it('refills flagged frames from their clean neighbours, and counts them', () => {
    const kept = sample.frames.slice(0, count);
    expect(refilled).toBe(kept.filter((frame) => frame.flags.length > 0).length);
    expect(barrel.frames.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('reads library.py’s own layout, the run’s fields at the top level', () => {
    const flat = { ...sample.run, run: 'tools/basilisk/runs/pad19_L11', frames: sample.frames };
    expect(caseFromLibrary(libraryJson(flat), 'padang-ray-l11', 0.1785714).barrel).toEqual(barrel);
    expect(libraryJson(sample as unknown as Record<string, unknown>)).toBe(sample);
  });

  it('refuses frames off the τ step, as a run analysed without its fine output’s start gives', () => {
    const coarse = { ...sample, frames: [{ ...sample.frames[0], tau: sample.frames[0].tau - 1 }, ...sample.frames] };
    expect(() => caseFromLibrary(coarse, 'coarse', 0.1785714)).toThrow(/τ step/);
  });
});

describe('the lip tip’s velocity', () => {
  it('recovers a steady tip’s velocity by a local line, one-sided at the ends', () => {
    const count = 12;
    const step = 0.025;
    const frames = new Float32Array(count * 2 * PROFILE_POINTS);
    for (let f = 0; f < count; f += 1) {
      frames[f * 2 * PROFILE_POINTS + 2 * LANDMARK.lip] = 0.8 * f * step;
      frames[f * 2 * PROFILE_POINTS + 2 * LANDMARK.lip + 1] = 1 - 0.3 * f * step;
    }
    const v = tipVelocities(frames, step);
    for (let f = 0; f < count; f += 1) {
      expect(v[2 * f]).toBeCloseTo(0.8, 4);
      expect(v[2 * f + 1]).toBeCloseTo(-0.3, 4);
    }
    expect(TIP_FIT_FRAMES).toBe(4);
  });

  // PR 7 (the advisor's ruling): the landmark is a lip only once the face has overturned for good.
  it('fits only the sustained overturn: zero before it, exact inside it, one-sided at its ends, refills ignored', () => {
    const count = 20;
    const step = 0.025;
    const floats = 2 * PROFILE_POINTS;
    const frames = new Float32Array(count * floats);
    for (let f = 0; f < count; f += 1) {
      // The landmark jumps forward at frame 8, as the steepest face point gives way to the jet's tip.
      frames[f * floats + 2 * LANDMARK.lip] = f < 8 ? -0.7 : 0.8 * f * step;
      frames[f * floats + 2 * LANDMARK.lip + 1] = 1 - 0.3 * f * step;
    }
    // A refilled frame inside the overturn: wild, and never fed to a fit.
    frames[12 * floats + 2 * LANDMARK.lip] = 5;
    const v = tipVelocities(frames, step, { from: 8, to: 17, usable: (f) => f !== 12 });
    for (let f = 0; f < 8; f += 1) expect([v[2 * f], v[2 * f + 1]]).toEqual([0, 0]);
    for (let f = 8; f < count; f += 1) {
      expect(v[2 * f]).toBeCloseTo(0.8, 4);
      expect(v[2 * f + 1]).toBeCloseTo(-0.3, 4);
    }
  });

  it('finds the overturn that lasts to touchdown, past a stepped face’s flicker', () => {
    const count = 30;
    const floats = 2 * PROFILE_POINTS;
    const frames = new Float32Array(count * floats);
    // Overturned (lip ahead of throat) at frames 3–4 (a flicker), then 10–24; touchdown at frame 25's τ.
    for (let f = 0; f < count; f += 1) {
      frames[f * floats + 2 * LANDMARK.lip] = (f >= 3 && f <= 4) || (f >= 10 && f <= 24) ? 1 : 0;
    }
    expect(sustainedOverturn(frames, -1, 0.1, -1 + 25 * 0.1)).toEqual({ from: 10, to: 24 });
    // A case kept as committed (its run elsewhere): a frame copied from the one before it counts as refilled.
    const c = { id: 'kept', slope: 0.05, nonlinearity: 0.3, flatDepth: 0.18, breakerHeight: 0.5, tauStep: 0.1, tauStart: -1, touchdown: 1.5, frames };
    for (let f = 10; f < count; f += 1) frames[f * floats + 2 * LANDMARK.lip] = 1 + 0.08 * f;
    frames.copyWithin(16 * floats, 15 * floats, 16 * floats);
    const refit = refitTip(c).tipVelocity!;
    expect(refit[2 * 5]).toBe(0);
    expect(refit[2 * 20]).toBeCloseTo(0.8, 4);
  });

  it('smooths a tip that steps a cell at a time', () => {
    const count = 20;
    const frames = new Float32Array(count * 2 * PROFILE_POINTS);
    // A landmark stepping 0.01 h0 every other frame: 0.2 h0/τ on average at a 0.025 step.
    for (let f = 0; f < count; f += 1) frames[f * 2 * PROFILE_POINTS + 2 * LANDMARK.lip] = 0.01 * Math.floor(f / 2);
    const v = tipVelocities(frames, 0.025);
    for (let f = TIP_FIT_FRAMES; f < count - TIP_FIT_FRAMES; f += 1) expect(v[2 * f]).toBeCloseTo(0.2, 1);
  });
});

describe('the underside’s grid noise (look-fix round 1)', () => {
  const floats = 2 * PROFILE_POINTS;
  /**
   * One frame: a back and an outer face over a crest at (0, 1) to the tip at (0.3, 0.4), the underside from the tip
   * straight up to the throat at (0.3, 0.64) with a cell's step in it at points 74–76, the inner face and the trough.
   */
  function stepped(step: number, outerX = 0.36): BarrelCase {
    const frame = new Float32Array(floats);
    const set = (p: number, x: number, y: number) => { frame[2 * p] = x; frame[2 * p + 1] = y; };
    for (let p = 0; p <= LANDMARK.crest; p += 1) set(p, -1 + p / LANDMARK.crest, p / LANDMARK.crest);
    // The outer face falls from the crest out to `outerX` and down to the tip.
    for (let p = LANDMARK.crest; p <= LANDMARK.lip; p += 1) {
      const t = (p - LANDMARK.crest) / (LANDMARK.lip - LANDMARK.crest);
      set(p, t < 0.5 ? 2 * t * outerX : outerX - (2 * t - 1) * (outerX - 0.3), 1 - 0.6 * t);
    }
    for (let p: number = LANDMARK.lip; p <= LANDMARK.throat; p += 1) {
      const t = (p - LANDMARK.lip) / (LANDMARK.throat - LANDMARK.lip);
      set(p, 0.3 + (p >= 75 ? -step : p === 74 ? -step / 2 : 0), 0.4 + 0.24 * t);
    }
    for (let p = LANDMARK.throat; p < PROFILE_POINTS; p += 1) set(p, 0.3 + (p - LANDMARK.throat) * 0.02, 0.64 - (p - LANDMARK.throat) * 0.016);
    const frames = new Float32Array(2 * floats);
    frames.set(frame, 0);
    frames.set(frame, floats);
    return { id: 'stepped', slope: 0.05, nonlinearity: 0.3, flatDepth: 0.18, breakerHeight: 1, tauStep: 0.1, tauStart: 0, touchdown: 1, frames, tipVelocity: new Float32Array([0.9, -0.3, 0.9, -0.3]) };
  }
  const turns = (c: BarrelCase, frame: number) => {
    const out: number[] = [];
    for (let k = LANDMARK.lip + 1; k < LANDMARK.throat; k += 1) {
      const turn = undersideTurn(c.frames, frame * floats, k);
      if (turn !== undefined) out.push(turn);
    }
    return out;
  };

  it('smooths a cell’s step out of a near-vertical underside, and nothing else', () => {
    const before = stepped(0.0117);
    expect(Math.max(...turns(before, 0))).toBeGreaterThan(UNDERSIDE_SMOOTHING.turn);
    const after = smoothUnderside(before);
    for (const frame of [0, 1]) expect(Math.max(...turns(after, frame))).toBeLessThanOrEqual(UNDERSIDE_SMOOTHING.turn);
    for (let i = 0; i < before.frames.length; i += 1) {
      const p = Math.floor((i % floats) / 2);
      // Only the underside's interior moves, and less than the step: the landmarks, the tip's velocity and the rest stay.
      if (p <= LANDMARK.lip || p >= LANDMARK.throat) expect(after.frames[i]).toBe(before.frames[i]);
      else expect(Math.abs(after.frames[i] - before.frames[i])).toBeLessThan(0.0117);
    }
    expect(after.tipVelocity).toBe(before.tipVelocity);
    // Smoothed, it smooths to itself.
    expect(Array.from(smoothUnderside(after).frames)).toEqual(Array.from(after.frames));
  });

  it('leaves a smooth underside and a folded one (before the cavity forms) as they are', () => {
    const smooth = stepped(0);
    expect(Array.from(smoothUnderside(smooth).frames)).toEqual(Array.from(smooth.frames));
    const folded = stepped(0);
    for (let p = LANDMARK.lip; p <= LANDMARK.throat; p += 1) folded.frames.set(folded.frames.subarray(2 * LANDMARK.lip, 2 * LANDMARK.lip + 2), 2 * p);
    expect(Array.from(smoothUnderside(folded).frames)).toEqual(Array.from(folded.frames));
  });

  it('never moves a point across the lip’s outer face, where the tip is thinner than the move', () => {
    /** A tip at (0, 0) a millimetre thin: the outer face comes down to it from `face`, the underside leaves it up to (0, 0.012). */
    const tip = (face: [number, number]): BarrelCase => {
      const frame = new Float32Array(floats);
      const set = (p: number, x: number, y: number) => { frame[2 * p] = x; frame[2 * p + 1] = y; };
      const run = (from: number, to: number, a: [number, number], b: [number, number]) => {
        for (let p = from; p <= to; p += 1) set(p, a[0] + ((p - from) / (to - from)) * (b[0] - a[0]), a[1] + ((p - from) / (to - from)) * (b[1] - a[1]));
      };
      run(0, LANDMARK.crest, [-1, -0.2], [-0.02, 0.06]);
      run(LANDMARK.crest, 61, [-0.02, 0.06], [0.012, 0.03]);
      set(62, 0.01, 0.025);
      set(63, face[0], face[1]);
      set(LANDMARK.lip, 0, 0);
      set(65, 0, 0.012);
      run(66, LANDMARK.throat, [0.006, 0.02], [-0.01, 0.045]);
      run(LANDMARK.throat, PROFILE_POINTS - 1, [-0.01, 0.045], [0.5, -0.2]);
      return { id: 'tip', slope: 0.05, nonlinearity: 0.3, flatDepth: 0.18, breakerHeight: 1, tauStep: 0.1, tauStart: 0, touchdown: 1, frames: frame, tipVelocity: new Float32Array(2) };
    };
    // Point 65 turns 37° where the underside stands near vertical; its first filtered place, (0.0015, 0.011), lies past a
    // face through (0.001, 0.012), so it stays; with the face out at (0.006, 0.012) it moves, past where that face was.
    const hemmed = tip([0.001, 0.012]);
    expect(undersideTurn(hemmed.frames, 0, 65)).toBeGreaterThan(UNDERSIDE_SMOOTHING.turn);
    expect(Array.from(smoothUnderside(hemmed).frames.subarray(130, 132))).toEqual([0, Math.fround(0.012)]);
    const open = smoothUnderside(tip([0.006, 0.012])).frames;
    expect(open[130]).toBeGreaterThan(0.001);
    expect(open[131]).toBeLessThan(0.012);
  });

  it('leaves no near-vertical underside point on any committed case’s open frames turning past the limit, the tip untouched', () => {
    let points = 0;
    for (const bytes of readBarrelCases()) {
      const c = decodeCase(bytes);
      const count = c.frames.length / floats;
      for (let f = 0; f < count; f += 1) {
        const tau = c.tauStart + f * c.tauStep;
        if (tau < 0 || tau > c.touchdown) continue;
        const frameTurns = turns(c, f);
        points += frameTurns.length;
        for (const turn of frameTurns) expect(turn, `${c.id} frame ${f}`).toBeLessThanOrEqual(UNDERSIDE_SMOOTHING.turn);
      }
      // Written smoothed: smoothing it again changes nothing.
      expect(Array.from(smoothUnderside(c).frames), c.id).toEqual(Array.from(c.frames));
    }
    expect(points).toBeGreaterThan(1500);
  });
});
