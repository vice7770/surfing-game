import { describe, expect, it } from 'vitest';
import { FOAM_CELL } from '../foamPattern';
import { STREAK_ANCHOR, STREAK_STRETCH, streakAnchors, streakFrame, streakMask, waterStreakPars } from './streaks';

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

  it('hold still when the current turns: a 1° turn moves the lines well under a lace cell, even 100 m from the origin', () => {
    const [x, z] = [70.3, -71.2];
    const turn = Math.PI / 180;
    for (const anchor of streakAnchors(x, z)) {
      const [a0, b0] = streakFrame(x, z, 0.2, 1, anchor.x, anchor.z);
      const [a1, b1] = streakFrame(x, z, 0.2 * Math.cos(turn) - Math.sin(turn), 0.2 * Math.sin(turn) + Math.cos(turn), anchor.x, anchor.z);
      expect(Math.hypot(a1 - a0, b1 - b0) / FOAM_CELL).toBeLessThan(0.3);
    }
  });

  it('blend the four anchors around a point with weights that sum to 1 and change smoothly across anchor cells', () => {
    for (const [x, z] of [[0.1, 0.2], [70.3, -71.2], [-13, 44.9], [STREAK_ANCHOR * 3.5, -STREAK_ANCHOR * 2.5]]) {
      const anchors = streakAnchors(x, z);
      expect(anchors).toHaveLength(4);
      expect(anchors.reduce((sum, anchor) => sum + anchor.weight, 0)).toBeCloseTo(1, 12);
    }
    // Either side of a cell boundary, the same anchor carries the same weight.
    const weightOf = (x: number, z: number, ax: number, az: number) =>
      streakAnchors(x, z).find((anchor) => anchor.x === ax && anchor.z === az)?.weight ?? 0;
    const edge = STREAK_ANCHOR * 1.5;
    expect(weightOf(edge - 1e-6, 1, STREAK_ANCHOR * 1.5, STREAK_ANCHOR * 0.5)).toBeCloseTo(weightOf(edge + 1e-6, 1, STREAK_ANCHOR * 1.5, STREAK_ANCHOR * 0.5), 5);
  });

  it('has a GLSL twin', () => {
    expect(waterStreakPars).toContain('float waterStreak( vec2 p, vec2 flow, float steepness, float foam )');
  });
});
