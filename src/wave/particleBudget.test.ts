import { describe, expect, it } from 'vitest';
import { LIP_SUBDIVISIONS } from '../scene/water/richLip';
import { PARTICLE_BUDGETS, PARTICLE_LEVELS, particleBudget, poolSize } from './particleBudget';

describe('particle budgets', () => {
  it('keeps High as the game always was: every source, pool and width whole, the lip sheet at its full detail', () => {
    expect(PARTICLE_BUDGETS.high).toEqual({ spawn: 1, foamBall: 1, bubbles: 1, pool: 1, mistSize: 1, lipSubdivisions: LIP_SUBDIVISIONS });
    expect(poolSize(4096, PARTICLE_BUDGETS.high)).toBe(4096);
    expect(poolSize(1023, PARTICLE_BUDGETS.high)).toBe(1023);
  });

  it('asks less of each lower level, on every count', () => {
    expect(PARTICLE_LEVELS).toEqual(['low', 'medium', 'high']);
    for (let i = 1; i < PARTICLE_LEVELS.length; i += 1) {
      const lower = PARTICLE_BUDGETS[PARTICLE_LEVELS[i - 1]];
      const upper = PARTICLE_BUDGETS[PARTICLE_LEVELS[i]];
      for (const key of Object.keys(upper) as (keyof typeof upper)[]) {
        expect(lower[key]).toBeLessThan(upper[key]);
        expect(lower[key]).toBeGreaterThan(0);
      }
    }
  });

  it('sizes a pool in whole particles, and reads an unknown level as High', () => {
    expect(poolSize(4096, PARTICLE_BUDGETS.medium)).toBe(4096 * PARTICLE_BUDGETS.medium.pool);
    expect(poolSize(1023, PARTICLE_BUDGETS.low)).toBe(Math.floor(1023 * PARTICLE_BUDGETS.low.pool));
    expect(particleBudget('ultra' as never)).toBe(PARTICLE_BUDGETS.high);
  });
});
