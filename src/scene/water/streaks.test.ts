import { describe, expect, it } from 'vitest';
import { FOAM_CELL } from '../foamPattern';
import { foamQuantile, sampleFoamField, waterChurnPars } from './churnTexture';
import {
  STREAK_ANCHOR, STREAK_COVER, STREAK_EDGE_SLOPE, STREAK_STRETCH, STREAK_TILE, streakAnchors, streakCover, streakFrame, streakMask, waterStreakPars,
} from './streaks';

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

describe('face streaks from the foam field’s late stage', () => {
  const flowAt = (): [number, number] => [0.1, 0.9];
  const steep = 0.8;
  const foam = 0.3;

  it('draw about a tenth of a steep, foamy face as line, and none where the face is flat or has no foam', () => {
    let sum = 0;
    let count = 0;
    for (let z = 2; z < 32; z += 0.2) {
      for (let x = 2; x < 32; x += 0.2) {
        sum += streakCover(x, z, flowAt, 3.1, steep, foam);
        count += 1;
      }
    }
    expect(Math.abs(sum / count - STREAK_COVER)).toBeLessThan(0.03);
    expect(streakCover(5, 5, flowAt, 3.1, 0.05, foam)).toBe(0);
    expect(streakCover(5, 5, flowAt, 3.1, steep, 0)).toBe(0);
  });

  it('keep the flow’s stretch: the lines are the late stage drawn STREAK_STRETCH times longer along the current than across it', () => {
    // Along +z, a step of STRETCH times a step across it changes the lines alike.
    const across = 0.025;
    const along = across * STREAK_STRETCH;
    let acrossBoth = 0;
    let alongBoth = 0;
    let first = 0;
    let acrossSecond = 0;
    let alongSecond = 0;
    let count = 0;
    const still = (): [number, number] => [0, 1];
    for (let z = 2; z < 28; z += 0.19) {
      for (let x = 2; x < 28; x += 0.19) {
        const a = streakCover(x, z, still, 3.1, steep, foam) >= 0.5 ? 1 : 0;
        const b = streakCover(x + across, z, still, 3.1, steep, foam) >= 0.5 ? 1 : 0;
        const c = streakCover(x, z + along, still, 3.1, steep, foam) >= 0.5 ? 1 : 0;
        acrossBoth += a * b;
        alongBoth += a * c;
        first += a;
        acrossSecond += b;
        alongSecond += c;
        count += 1;
      }
    }
    const cover = first / count;
    const correlation = (both: number, second: number) => (both / count - cover * (second / count)) / (cover * (1 - cover));
    // The same likeness a step across and STRETCH times that along; across the whole step, it would be much less.
    expect(Math.abs(correlation(acrossBoth, acrossSecond) - correlation(alongBoth, alongSecond))).toBeLessThan(0.12);
    expect(correlation(acrossBoth, acrossSecond)).toBeGreaterThan(0.2);
  });

  it('take their edge from the late stage’s gradient: the slope is half its median at a threshold crossing', () => {
    const h = 0.004;
    const threshold = foamQuantile(1 - STREAK_COVER);
    const gradients: number[] = [];
    for (let j = 0; j < 300; j += 1) {
      for (let i = 0; i < 300; i += 1) {
        const u = (i * 0.0173) / STREAK_TILE;
        const v = (j * 0.0191) / STREAK_TILE;
        const g = sampleFoamField(u, v, 3);
        if (Math.abs(g - threshold) > 0.15) continue;
        gradients.push((Math.abs(sampleFoamField(u + h / STREAK_TILE, v, 3) - g) + Math.abs(sampleFoamField(u, v + h / STREAK_TILE, 3) - g)) / h);
      }
    }
    gradients.sort((a, b) => a - b);
    const median = gradients[gradients.length >> 1];
    expect(Math.abs(STREAK_EDGE_SLOPE - 0.5 * median) / (0.5 * median)).toBeLessThan(0.25);
  });

  it('are blended in squares before the threshold, and defined where the churn map is: declared here, defined there', () => {
    expect(waterStreakPars).toContain('float waterStreakField( vec2 frame, vec2 dx, vec2 dy );');
    expect(waterStreakPars).toContain('squares += weight * weight * ( w * w + ( 1.0 - w ) * ( 1.0 - w ) );');
    expect(waterStreakPars).toContain('sum / sqrt( squares )');
    expect(waterStreakPars).not.toContain('waterFoamTile');
    expect(waterChurnPars).toContain('float waterStreakField( vec2 frame, vec2 dx, vec2 dy ) {');
    expect(/^[\x09\x0a\x20-\x7e]*$/.test(waterStreakPars)).toBe(true);
  });
});
