import { describe, expect, it } from 'vitest';
import { MinimumJerkTrack } from './MinimumJerkTrack';

const H = 1 / 240;

/** Step `track` for `time` s, returning its largest |acceleration| and the acceleration after the first substep. */
function run(track: MinimumJerkTrack, time: number) {
  let peak = 0;
  let first = NaN;
  for (let i = 0; i < Math.round(time / H); i += 1) {
    track.step(H);
    if (Number.isNaN(first)) first = track.acceleration;
    peak = Math.max(peak, Math.abs(track.acceleration));
  }
  return { peak, first };
}

describe('MinimumJerkTrack', () => {
  it('moves from rest to its target over the time, easing in and out (minimum jerk)', () => {
    const track = new MinimumJerkTrack();
    track.retarget(1, 0.25);
    const halfway = run(track, 0.125);
    expect(track.value).toBeCloseTo(0.5, 2);
    // Minimum jerk peaks at 5.77 Δ/T² and starts from no acceleration, growing as 60 (t/T) Δ/T²
    // (a critically damped follower starts at its peak, ω²Δ, about 880/s² here).
    expect(Math.abs(halfway.first)).toBeLessThan((60 * (H / 0.25)) / 0.25 ** 2);
    const rest = run(track, 0.2);
    expect(Math.max(halfway.peak, rest.peak)).toBeLessThan(5.8 / 0.25 ** 2);
    expect(track.value).toBe(1);
    expect(track.rate).toBe(0);
    expect(track.acceleration).toBe(0);
  });

  it('keeps its rate and acceleration when retargeted mid-way, and gets there over the new time', () => {
    const track = new MinimumJerkTrack();
    track.retarget(1, 0.3);
    run(track, 0.1);
    const { value, rate, acceleration } = track;
    track.retarget(0, 1);
    expect(track.value).toBe(value);
    expect(track.rate).toBe(rate);
    expect(track.acceleration).toBe(acceleration);
    track.step(H);
    expect(Math.abs(track.rate - rate)).toBeLessThan(Math.abs(acceleration) * H * 3 + 1e-3);
    run(track, 1);
    expect(track.value).toBe(0);
    expect(track.rate).toBe(0);
  });

  it('holds still once there, and a repeated target does not restart it', () => {
    const track = new MinimumJerkTrack();
    track.retarget(0.6, 0.2);
    run(track, 0.1);
    const before = track.value;
    track.retarget(0.6, 0.2);
    track.step(H);
    expect(track.value).toBeGreaterThan(before);
    run(track, 0.2);
    expect(track.value).toBe(0.6);
    track.step(H);
    expect(track.value).toBe(0.6);
  });

  it('stays within 0–1 when turned back hard near an end', () => {
    const track = new MinimumJerkTrack();
    track.retarget(1, 0.35);
    run(track, 0.2);
    track.retarget(0, 0.05);
    for (let i = 0; i < 60; i += 1) {
      track.step(H);
      expect(track.value).toBeGreaterThanOrEqual(0);
      expect(track.value).toBeLessThanOrEqual(1);
    }
  });

  it('resets to rest at 0', () => {
    const track = new MinimumJerkTrack();
    track.retarget(1, 0.2);
    run(track, 0.1);
    track.reset();
    expect([track.value, track.rate, track.acceleration, track.target]).toEqual([0, 0, 0, 0]);
  });
});
