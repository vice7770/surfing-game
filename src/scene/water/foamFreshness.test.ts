import { describe, expect, it } from 'vitest';
import {
  AGED_OPACITY, AGED_STREAKS, BUBBLE_TINT, BUBBLE_TINT_GLSL, YOUTH_AIR, YOUTH_COVER, bubbleTint, foamEdge, foamOpacity, foamYouth,
  foamRise, freshFoamCover, freshLace, softCoverage, waterFoamFreshPars,
} from './foamFreshness';
import { FOAM_CELL, FOAM_EDGE, FOAM_FLOW_PERIOD, foamCover, foamCoverage, foamDistance } from '../foamPattern';
import { RICH_FOAM, RICH_FOAM_FRESH } from './richWaterGlsl';
import { richRollerFoam } from './rollerGlsl';

/** Still water's cover at (x, z) for foam of a value and youth. */
function cover(x: number, z: number, foam: number, youth: number, footprint = 0): number {
  return freshFoamCover(x, z, 0, 0, foam, youth, 0.7, footprint);
}

/** Mean still-water cover over a 60 × 60 m area. */
function meanCover(foam: number, youth: number): number {
  let sum = 0;
  let count = 0;
  for (let z = 500; z < 560; z += 0.23) {
    for (let x = -300; x < -240; x += 0.23) {
      sum += cover(x, z, foam, youth);
      count += 1;
    }
  }
  return sum / count;
}

/** The cover over a metre square at (x, z): the patches' scale, above the lace's network. */
function boxCover(x: number, z: number, foam: number, youth: number): number {
  let sum = 0;
  for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) sum += cover(x + i * 0.25, z + j * 0.25, foam, youth);
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

  it('draws young foam at a fine footprint as the lace always was, to rounding', () => {
    for (const [x, z, foam, time] of [[3.1, 4.2, 0.4, 1.2], [-12.7, 88.3, 0.85, 0.3], [40.2, -7.9, 0.15, 1.9]]) {
      expect(freshFoamCover(x, z, 0.6, -0.2, foam, 1, time)).toBeCloseTo(foamCover(x, z, 0.6, -0.2, foam, time), 10);
    }
    // The lace's terms are the old patches' F·(1 + (2v − 1)(1 − F)) for young foam, a multiply-add in v.
    for (const [foam, v] of [[0.3, 0.1], [0.7, 0.9], [0.5, 0.5]]) {
      const [base, gain, gather] = freshLace(foam, 1);
      expect(base + gain * v).toBeCloseTo(foam * (1 + (2 * v - 1) * (1 - foam)), 14);
      expect(gather).toBe(0);
    }
    expect(softCoverage(0.37, foamDistance(1.3, 2.4), FOAM_EDGE)).toBe(foamCoverage(0.37, foamDistance(1.3, 2.4)));
  });

  it('keeps young foam’s cover to its value, and thins aged foam toward a film', () => {
    for (const foam of [0.2, 0.5, 0.8]) expect(Math.abs(meanCover(foam, 1) - foam)).toBeLessThan(0.05);
    // Aged: about the same cover, as an opacity-weighted film (thin foam translucent, thick foam white through).
    for (const foam of [0.2, 0.5]) {
      const aged = meanCover(foam, 0);
      expect(aged).toBeLessThan(meanCover(foam, 1));
      expect(aged).toBeGreaterThan(AGED_OPACITY * foam * 0.75);
    }
    expect(foamOpacity(0.1, 0)).toBeCloseTo(AGED_OPACITY, 10);
    expect(foamOpacity(1, 0)).toBe(1);
    expect(foamOpacity(0.1, 1)).toBe(1);
  });

  it('gathers aged foam’s lace into streaks along the waves’ travel', () => {
    const young = variogram(0.25, 1, 3);
    const aged = variogram(0.25, 0, 3);
    // Young foam's patches are round; aged foam's lace lies in streaks, changing far less along z than across.
    expect(young.z / young.x).toBeGreaterThan(0.9);
    expect(young.z / young.x).toBeLessThan(1.1);
    expect(aged.z / aged.x).toBeLessThan(0.7);
    expect(AGED_STREAKS.along).toBeGreaterThan(1);
    // Without the streaks, aged foam gathers into its round patches.
    let alongX = 0;
    let alongZ = 0;
    for (let z = 100; z < 130; z += 1.3) {
      for (let x = 40; x < 70; x += 1.1) {
        const here = freshFoamCover(x, z, 0, 0, 0.25, 0, 0.7, 0, false);
        alongX += Math.abs(freshFoamCover(x + 3, z, 0, 0, 0.25, 0, 0.7, 0, false) - here);
        alongZ += Math.abs(freshFoamCover(x, z + 3, 0, 0, 0.25, 0, 0.7, 0, false) - here);
      }
    }
    expect(alongZ / alongX).toBeGreaterThan(0.85);
  });

  it('carries aged lace with the current, without a jump as the flow map turns over', () => {
    const flow = { x: 0.6, z: 0.9 };
    const dt = 0.01;
    const t = FOAM_FLOW_PERIOD / 2;
    let moved = 0;
    let still = 0;
    let jump = 0;
    let samples = 0;
    for (let z = 0; z < 12; z += 0.37) {
      for (let x = 0; x < 12; x += 0.41) {
        const here = freshFoamCover(x, z, flow.x, flow.z, 0.3, 0, t);
        moved += Math.abs(freshFoamCover(x + flow.x * dt, z + flow.z * dt, flow.x, flow.z, 0.3, 0, t + dt) - here);
        still += Math.abs(freshFoamCover(x + 0.3, z, flow.x, flow.z, 0.3, 0, t + dt) - here);
        // Phase A turns over at the period's end, where it carries no weight.
        jump += Math.abs(freshFoamCover(x, z, flow.x, flow.z, 0.3, 0, FOAM_FLOW_PERIOD - 1e-6) - freshFoamCover(x, z, flow.x, flow.z, 0.3, 0, FOAM_FLOW_PERIOD + 1e-6));
        samples += 1;
      }
    }
    expect(moved / samples).toBeLessThan(0.2 * (still / samples));
    expect(jump / samples).toBeLessThan(1e-3);
  });

  it('softens the threshold with the pixel’s footprint and with age, without moving it', () => {
    expect(foamEdge(1, 0)).toBe(FOAM_EDGE);
    expect(foamEdge(1, 0.2 * FOAM_CELL)).toBeGreaterThan(FOAM_EDGE);
    expect(foamEdge(0, 0)).toBeGreaterThan(foamEdge(1, 0));
    let radius = 0;
    for (let d = 0; d < 1; d += 0.0005) if (softCoverage(0.5, d, 0.0005) >= 0.5) radius = d;
    for (const edge of [0.01, 0.05, 0.1]) expect(softCoverage(0.5, radius, edge)).toBeCloseTo(0.5, 1);
  });

  it('keeps dense foam as white through as it was, however soft its edge', () => {
    // Saturated foam's threshold sits at the network's widest gaps: a softer edge must open no more of them than before.
    let opened = 0;
    let mean = 0;
    let count = 0;
    for (let z = 0; z < 8; z += 0.13) {
      for (let x = 0; x < 8; x += 0.11) {
        const soft = freshFoamCover(x, z, 0, 0, 1, 0.5, 0.7, 0.2 * FOAM_CELL);
        if (soft < foamCover(x, z, 0, 0, 1, 0.7) - 1e-12) opened += 1;
        mean += soft;
        count += 1;
      }
    }
    expect(opened).toBe(0);
    expect(mean / count).toBeGreaterThan(0.999);
    expect(foamRise(0.4, 0.2)).toBe(0);
    expect(foamRise(1, FOAM_EDGE)).toBe(0);
  });

  it('fades to the mean in the distance, aged foam as a film', () => {
    expect(freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, 1, 1.2, 10 * FOAM_CELL)).toBeCloseTo(0.4, 14);
    // Drawn foam above 1 (the Canyon lip's landing) keeps its excess there, as the lace always did.
    for (const footprint of [0.5, 0.8, 10].map((share) => share * FOAM_CELL)) {
      expect(freshFoamCover(3.1, 4.2, 0.5, 0, 1.3, 1, 1.2, footprint)).toBeCloseTo(foamCover(3.1, 4.2, 0.5, 0, 1.3, 1.2, footprint), 10);
    }
    expect(freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, 0, 1.2, 10 * FOAM_CELL)).toBeCloseTo(0.4 * foamOpacity(0.4, 0), 14);
  });

  it('tints the water under young foam only, and faintly', () => {
    expect(bubbleTint(0.8, 0)).toBe(0);
    expect(bubbleTint(0, 1)).toBe(0);
    expect(bubbleTint(2, 1)).toBe(BUBBLE_TINT);
    expect(BUBBLE_TINT).toBeLessThanOrEqual(0.3);
    expect(BUBBLE_TINT_GLSL).toContain(BUBBLE_TINT.toFixed(4));
  });

  it('adds its GLSL to the Rich foam only, with no new varyings, keeping the lines the roller hooks', () => {
    expect(RICH_FOAM).not.toContain('waterFreshFoamCover');
    expect(RICH_FOAM_FRESH).toContain('waterFreshFoamCover');
    expect(RICH_FOAM_FRESH).toContain('waterFoamYouth( vWaterAir, vWaterFoam )');
    expect(() => richRollerFoam(RICH_FOAM_FRESH)).not.toThrow();
    for (const glsl of [waterFoamFreshPars(), waterFoamFreshPars(false)]) {
      expect(glsl).toContain('web-ocean');
      // A varying handed from the vertex cost the M1's High preset 1–3.6 ms a frame (the cost pass): none here.
      expect(glsl).not.toMatch(/\b(varying|uniform|in|out)\s/);
    }
    // Without the streaks, one texture read a phase fewer.
    const reads = (glsl: string) => glsl.split('texture( waterFoamTile').length - 1;
    expect(reads(waterFoamFreshPars(false))).toBe(reads(waterFoamFreshPars()) - 1);
    // GLSL ES 3.00's reserved words (section 3.7) never name anything ('patch' once did, and the program would not compile).
    const reserved = ['patch', 'sample', 'input', 'output', 'filter', 'active', 'common', 'partition', 'resource', 'noperspective'];
    for (const glsl of [waterFoamFreshPars(), RICH_FOAM_FRESH]) {
      for (const word of reserved) expect(glsl.replace(/\/\/[^\n]*/g, '')).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });
});
