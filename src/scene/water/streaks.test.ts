import { describe, expect, it } from 'vitest';
import { STREAK_STRETCH, streakFrame, streakMask, waterStreakPars } from './streaks';

describe('face streaks', () => {
  it('stretch the lace along the current: a step along it moves the pattern 1/STRETCH as far as a step across', () => {
    const [a0, b0] = streakFrame(0, 0, 1, 0);
    const [aAlong, bAlong] = streakFrame(1, 0, 1, 0);
    const [aAcross, bAcross] = streakFrame(0, 1, 1, 0);
    expect(Math.hypot(aAlong - a0, bAlong - b0)).toBeCloseTo(1 / STREAK_STRETCH, 9);
    expect(Math.hypot(aAcross - a0, bAcross - b0)).toBeCloseTo(1, 9);
  });

  it('run along +z on still water', () => {
    const [a0, b0] = streakFrame(0, 0, 0, 0);
    const [aAlong, bAlong] = streakFrame(0, 1, 0, 0);
    expect(Math.hypot(aAlong - a0, bAlong - b0)).toBeCloseTo(1 / STREAK_STRETCH, 9);
  });

  it('appear only on steep faces with foam about', () => {
    expect(streakMask(0.05, 0.5)).toBe(0);
    expect(streakMask(0.8, 0)).toBe(0);
    expect(streakMask(0.8, 0.3)).toBeGreaterThan(0.5);
    expect(streakMask(0.9, 0.3)).toBeGreaterThanOrEqual(streakMask(0.6, 0.3));
  });

  it('show at the thin foam the physics leaves on its steep faces (0.045 at the 90th percentile)', () => {
    expect(streakMask(0.6, 0.045)).toBeGreaterThan(0.5);
    expect(streakMask(0.6, 0.004)).toBe(0);
  });

  it('has a GLSL twin', () => {
    expect(waterStreakPars).toContain('float waterStreak( vec2 p, vec2 flow, float steepness, float foam )');
  });
});
