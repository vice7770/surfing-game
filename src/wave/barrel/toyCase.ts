import { LANDMARK, PROFILE_POINTS, type BarrelCase } from './ProfileLibrary';

/** A toy case for tests: its lip moves forward with each frame, so interpolation is checkable; its crest stays at x = 1 h0. */
export function toyCase(nonlinearity: number, lipGain: number): BarrelCase {
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
