import { describe, expect, it } from 'vitest';
import { RICH_BASE_ROUGHNESS, richRoughness, waterSpecularPars } from './specular';

describe('specular anti-aliasing', () => {
  it('keeps the base gloss where the ripples are resolved, and roughens monotonically with their unresolved variance', () => {
    expect(richRoughness(RICH_BASE_ROUGHNESS, 0)).toBeCloseTo(RICH_BASE_ROUGHNESS, 9);
    let last = 0;
    for (const variance of [0, 0.001, 0.004, 0.02, 0.1, 1]) {
      const roughness = richRoughness(RICH_BASE_ROUGHNESS, variance);
      expect(roughness).toBeGreaterThanOrEqual(last);
      last = roughness;
    }
    expect(richRoughness(RICH_BASE_ROUGHNESS, 10)).toBe(0.6);
  });

  it('adds the variance in GGX alpha space, where three takes alpha = roughness² (LEAN: alpha² grows by twice it)', () => {
    const variance = 0.0027;
    const roughness = richRoughness(RICH_BASE_ROUGHNESS, variance);
    expect(roughness).toBeCloseTo(0.27, 2);
    expect(roughness ** 4 - RICH_BASE_ROUGHNESS ** 4).toBeCloseTo(2 * variance, 9);
  });

  it('has a GLSL twin', () => {
    expect(waterSpecularPars).toContain('float richRoughness( float base, float variance )');
  });
});
