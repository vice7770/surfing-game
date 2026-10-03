import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { caseFromLibrary, libraryJson, refitTip, sustainedOverturn, TIP_FIT_FRAMES, tipVelocities, type LibraryJson } from './caseFromLibrary';
import { LANDMARK, PROFILE_POINTS } from './ProfileLibrary';

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
