import { describe, expect, it } from 'vitest';
import {
  AGED_OPACITY, AGED_STREAKS, BUBBLE_TINT, YOUTH_AIR, YOUTH_COVER, bubbleTint, foamEdge, foamOpacity, foamYouth, freshFoamCover,
  softCoverage, waterFoamFreshPars,
} from './foamFreshness';
import { FOAM_CELL, FOAM_EDGE, foamCover, foamCoverage, foamDistance } from '../foamPattern';
import { RICH_FOAM, RICH_FOAM_FRESH } from './richWaterGlsl';
import { richRollerFoam } from './rollerGlsl';

/** Mean still-water cover over a 60 × 60 m area, for foam of a given value and youth. */
function meanCover(foam: number, youth: number): number {
  let sum = 0;
  let count = 0;
  for (let z = 500; z < 560; z += 0.23) {
    for (let x = -300; x < -240; x += 0.23) {
      sum += freshFoamCover(x, z, 0, 0, foam, youth, 0.7);
      count += 1;
    }
  }
  return sum / count;
}

/** The cover over a metre square at (x, z): the patches' scale, above the lace's network. */
function boxCover(x: number, z: number, foam: number, youth: number): number {
  let sum = 0;
  for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) sum += freshFoamCover(x + i * 0.25, z + j * 0.25, 0, 0, foam, youth, 0.7);
  return sum / 16;
}

/** The metre-square cover's variogram `lag` m apart along x and along z: its mean change from a square to the next. */
function variogram(foam: number, youth: number, lag: number): { x: number; z: number } {
  let alongX = 0;
  let alongZ = 0;
  let count = 0;
  for (let z = 100; z < 160; z += 1.3) {
    for (let x = 40; x < 100; x += 1.1) {
      const here = boxCover(x, z, foam, youth);
      alongX += Math.abs(boxCover(x + lag, z, foam, youth) - here);
      alongZ += Math.abs(boxCover(x, z + lag, foam, youth) - here);
      count += 1;
    }
  }
  return { x: alongX / count, z: alongZ / count };
}

describe('foam freshness', () => {
  it('reads youth from the plume’s air and from foam held near saturation', () => {
    expect(foamYouth(0, 0.3)).toBe(0);
    expect(foamYouth(YOUTH_AIR[1], 0)).toBe(1);
    expect(foamYouth(0, YOUTH_COVER[1])).toBe(1);
    let previous = -1;
    for (let air = 0; air <= 0.2; air += 0.005) {
      const youth = foamYouth(air, 0.4);
      expect(youth).toBeGreaterThanOrEqual(previous);
      previous = youth;
    }
  });

  it('draws young foam at a fine footprint exactly as the lace always was', () => {
    for (const [x, z, foam, time] of [[3.1, 4.2, 0.4, 1.2], [-12.7, 88.3, 0.85, 0.3], [40.2, -7.9, 0.15, 1.9]]) {
      expect(freshFoamCover(x, z, 0.6, -0.2, foam, 1, time)).toBe(foamCover(x, z, 0.6, -0.2, foam, time));
    }
    expect(softCoverage(0.37, foamDistance(1.3, 2.4), FOAM_EDGE)).toBe(foamCoverage(0.37, foamDistance(1.3, 2.4)));
  });

  it('keeps young foam’s cover to its value, and thins aged foam toward a film', () => {
    for (const foam of [0.2, 0.5, 0.8]) expect(Math.abs(meanCover(foam, 1) - foam)).toBeLessThan(0.05);
    // Aged: the same cover, as an opacity-weighted film (thin foam translucent, thick foam white through).
    for (const foam of [0.2, 0.5]) {
      const aged = meanCover(foam, 0);
      expect(aged).toBeLessThan(meanCover(foam, 1));
      expect(aged).toBeGreaterThan(AGED_OPACITY * foam * 0.75);
    }
    expect(foamOpacity(0.1, 0)).toBeCloseTo(AGED_OPACITY, 10);
    expect(foamOpacity(1, 0)).toBe(1);
    expect(foamOpacity(0.1, 1)).toBe(1);
  });

  it('breaks aged foam into streaks along the waves’ travel', () => {
    const young = variogram(0.25, 1, 3);
    const aged = variogram(0.25, 0, 3);
    // Young foam's patches are round; aged foam's lace lies in streaks, changing far less along z than across.
    expect(young.z / young.x).toBeGreaterThan(0.9);
    expect(young.z / young.x).toBeLessThan(1.1);
    expect(aged.z / aged.x).toBeLessThan(0.7);
    expect(AGED_STREAKS.along).toBeGreaterThan(1);
  });

  it('softens the threshold with the pixel’s footprint and with age', () => {
    expect(foamEdge(1, 0)).toBe(FOAM_EDGE);
    expect(foamEdge(1, 0.2 * FOAM_CELL)).toBeGreaterThan(FOAM_EDGE);
    expect(foamEdge(0, 0)).toBeGreaterThan(foamEdge(1, 0));
    // A wider edge never moves the threshold: a point on it stays half covered.
    expect(softCoverage(0.5, 0.2, 0.01)).toBeCloseTo(1 - softCoverage(0.5, 0.4, 0.01), 0);
  });

  it('fades to the mean film where a pixel spans more than a cell, as the lace did', () => {
    expect(freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, 1, 1.2, 10 * FOAM_CELL)).toBe(0.4);
    expect(freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, 0, 1.2, 10 * FOAM_CELL)).toBeCloseTo(0.4 * foamOpacity(0.4, 0), 12);
  });

  it('tints the water under young foam only, and faintly', () => {
    expect(bubbleTint(0.8, 0)).toBe(0);
    expect(bubbleTint(0, 1)).toBe(0);
    expect(bubbleTint(2, 1)).toBe(BUBBLE_TINT);
    expect(BUBBLE_TINT).toBeLessThanOrEqual(0.3);
  });

  it('adds its GLSL to the Rich foam only, keeping the lines the roller hooks', () => {
    expect(RICH_FOAM).not.toContain('waterFreshFoamCover');
    expect(RICH_FOAM_FRESH).toContain('waterFreshFoamCover');
    expect(RICH_FOAM_FRESH).toContain('waterBubbleTint');
    expect(() => richRollerFoam(RICH_FOAM_FRESH)).not.toThrow();
    for (const name of ['waterFoamYouth', 'waterFreshPhase', 'waterFreshFoamCover', 'waterBubbleTint']) expect(waterFoamFreshPars).toContain(`${name}(`);
    expect(waterFoamFreshPars).toContain('web-ocean');
  });
});
