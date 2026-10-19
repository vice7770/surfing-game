import { describe, expect, it } from 'vitest';
import {
  AGED_OPACITY, AGED_STREAKS, BUBBLE_TINT, YOUTH_AIR, YOUTH_COVER, bubbleTint, foamEdge, foamFreshness, foamOpacity, foamYouth,
  freshFoamCover, richFreshVertex, softCoverage, streakPatch, waterFoamFreshPars, waterFoamFreshVertexPars, type FoamFreshness,
} from './foamFreshness';
import { FOAM_CELL, FOAM_EDGE, FOAM_FLOW_PERIOD, foamCover, foamCoverage, foamDistance } from '../foamPattern';
import { RICH_FOAM, RICH_FOAM_FRESH } from './richWaterGlsl';
import { richRollerFoam } from './rollerGlsl';

const YOUNG: FoamFreshness = { youth: 1, streak: 0.5 };

/** Still water's cover at (x, z) for foam of a value and youth, its streaks read there as the vertex would. */
function cover(x: number, z: number, foam: number, youth: number, footprint = 0): number {
  return freshFoamCover(x, z, 0, 0, foam, { youth, streak: streakPatch(x, z, 0, 0, 0.7) }, 0.7, footprint);
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
    expect(foamFreshness(1, 2, 0, 0, 0.4, 0.2, 0.3)).toEqual({ youth: 1, streak: streakPatch(1, 2, 0, 0, 0.3) });
    expect(foamFreshness(1, 2, 0, 0, 0.4, 0, 0.3, false).streak).toBe(0.5);
  });

  it('draws young foam at a fine footprint exactly as the lace always was', () => {
    for (const [x, z, foam, time] of [[3.1, 4.2, 0.4, 1.2], [-12.7, 88.3, 0.85, 0.3], [40.2, -7.9, 0.15, 1.9]]) {
      expect(freshFoamCover(x, z, 0.6, -0.2, foam, { youth: 1, streak: 0.13 }, time)).toBe(foamCover(x, z, 0.6, -0.2, foam, time));
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
  });

  it('carries the streaks with the current, without a jump as the flow map turns over', () => {
    const flow = { x: 0.6, z: 0.9 };
    const dt = 0.01;
    const t = FOAM_FLOW_PERIOD / 2;
    let moved = 0;
    let still = 0;
    let jump = 0;
    let samples = 0;
    for (let z = 0; z < 20; z += 0.7) {
      for (let x = 0; x < 20; x += 0.7) {
        const here = streakPatch(x, z, flow.x, flow.z, t);
        moved += Math.abs(streakPatch(x + flow.x * dt, z + flow.z * dt, flow.x, flow.z, t + dt) - here);
        still += Math.abs(streakPatch(x + 1, z, flow.x, flow.z, t + dt) - here);
        // Phase A turns over at the period's end, where it carries no weight.
        jump += Math.abs(streakPatch(x, z, flow.x, flow.z, FOAM_FLOW_PERIOD - 1e-6) - streakPatch(x, z, flow.x, flow.z, FOAM_FLOW_PERIOD + 1e-6));
        samples += 1;
      }
    }
    expect(moved / samples).toBeLessThan(0.1 * (still / samples));
    expect(jump / samples).toBeLessThan(1e-4);
  });

  it('softens the threshold with the pixel’s footprint and with age', () => {
    expect(foamEdge(1, 0)).toBe(FOAM_EDGE);
    expect(foamEdge(1, 0.2 * FOAM_CELL)).toBeGreaterThan(FOAM_EDGE);
    expect(foamEdge(0, 0)).toBeGreaterThan(foamEdge(1, 0));
    // Softer, not moved: a point on the threshold stays half covered however soft the edge.
    for (const edge of [0.01, 0.05, 0.1]) {
      const onIt = softCoverage(0.5, 0, edge);
      expect(onIt).toBe(1);
      let radius = 0;
      for (let d = 0; d < 1; d += 0.001) if (softCoverage(0.5, d, 0.001) >= 0.5) radius = d;
      expect(softCoverage(0.5, radius, edge)).toBeCloseTo(0.5, 1);
    }
  });

  it('fades to the mean in the distance, keeping aged foam’s streaks', () => {
    expect(freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, YOUNG, 1.2, 10 * FOAM_CELL)).toBe(0.4);
    const aged = (streak: number) => freshFoamCover(3.1, 4.2, 0.5, 0, 0.4, { youth: 0, streak }, 1.2, 10 * FOAM_CELL);
    expect(aged(0.5)).toBeCloseTo(0.4 * foamOpacity(0.4, 0), 12);
    expect(aged(0.8)).toBeGreaterThan(aged(0.5));
    expect(aged(0.2)).toBeLessThan(aged(0.5));
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
    expect(RICH_FOAM_FRESH).toContain('vWaterFresh');
    expect(() => richRollerFoam(RICH_FOAM_FRESH)).not.toThrow();
    for (const name of ['waterFreshPatchy', 'waterFreshPhase', 'waterFreshFoamCover']) expect(waterFoamFreshPars).toContain(`${name}(`);
    for (const glsl of [waterFoamFreshPars, waterFoamFreshVertexPars()]) expect(glsl).toContain('web-ocean');
    // The streaks are read per vertex; without them, no read and a neutral patch.
    expect(waterFoamFreshVertexPars()).toContain('textureLod( waterFoamTile');
    expect(waterFoamFreshVertexPars(false)).not.toContain('textureLod');
    expect(richFreshVertex()).toContain('waterStreakPatch(');
    expect(richFreshVertex(false)).not.toContain('waterStreakPatch(');
    // GLSL ES 3.00's reserved words (section 3.7) never name anything ('patch' once did, and the program would not compile).
    const reserved = ['patch', 'sample', 'input', 'output', 'filter', 'active', 'common', 'partition', 'resource', 'noperspective'];
    for (const glsl of [waterFoamFreshPars, waterFoamFreshVertexPars(), richFreshVertex(), RICH_FOAM_FRESH]) {
      for (const word of reserved) expect(glsl.replace(/\/\/[^\n]*/g, '')).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });
});
