import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { caseFromLibrary, libraryJson, TIP_FIT_FRAMES, tipVelocities, type LibraryJson } from './caseFromLibrary';
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

  it('smooths a tip that steps a cell at a time', () => {
    const count = 20;
    const frames = new Float32Array(count * 2 * PROFILE_POINTS);
    // A landmark stepping 0.01 h0 every other frame: 0.2 h0/τ on average at a 0.025 step.
    for (let f = 0; f < count; f += 1) frames[f * 2 * PROFILE_POINTS + 2 * LANDMARK.lip] = 0.01 * Math.floor(f / 2);
    const v = tipVelocities(frames, 0.025);
    for (let f = TIP_FIT_FRAMES; f < count - TIP_FIT_FRAMES; f += 1) expect(v[2 * f]).toBeCloseTo(0.2, 1);
  });
});
