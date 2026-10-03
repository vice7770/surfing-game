import { describe, expect, it } from 'vitest';
import { NORMAL_KERNEL_CLAMP, NORMAL_KERNEL_VARIANCE, RICH_BASE_ROUGHNESS, RICH_SPECULAR, normalKernelVariance, richRoughness, waterSpecularPars } from './specular';

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

describe('the shading normal’s own unresolved variation', () => {
  it('adds σ² (|∂n/∂x|² + |∂n/∂y|²) to the slope variance, with Filament’s kernel and clamp', () => {
    expect(NORMAL_KERNEL_VARIANCE).toBe(0.15);
    // Its clamp is on α², which grows by twice the variance.
    expect(2 * NORMAL_KERNEL_CLAMP).toBe(0.2);
    expect(normalKernelVariance([0, 0, 0], [0, 0, 0])).toBe(0);
    expect(normalKernelVariance([0.1, 0, 0], [0, 0.2, 0])).toBeCloseTo(0.15 * (0.01 + 0.04), 12);
    expect(normalKernelVariance([3, 0, 0], [0, 3, 0])).toBe(NORMAL_KERNEL_CLAMP);
  });

  it('leaves a flat, resolved surface glossy and turns a normal that swings across a pixel into a soft lobe', () => {
    expect(richRoughness(RICH_BASE_ROUGHNESS, normalKernelVariance([0, 0, 0], [0, 0, 0]))).toBeCloseTo(RICH_BASE_ROUGHNESS, 9);
    // A cell edge where the normal turns 20° from one pixel to the next: the glint's lobe widens from α = 0.0064 to α ≈ 0.19.
    const turn = (20 * Math.PI) / 180;
    const roughness = richRoughness(RICH_BASE_ROUGHNESS, normalKernelVariance([Math.sin(turn), 1 - Math.cos(turn), 0], [0, 0, 0]));
    expect(roughness ** 2).toBeGreaterThan(0.05);
    expect(roughness).toBeLessThanOrEqual(0.6);
  });

  it('runs in a line of its own before the gloss, whose call and clamp are unchanged', () => {
    expect(RICH_SPECULAR).toContain('vec3 richNormalDx = dFdx( normal );');
    expect(RICH_SPECULAR).toContain(`waterRippleVariance += min( ${NORMAL_KERNEL_VARIANCE.toFixed(3)} * ( dot( richNormalDx, richNormalDx ) + dot( richNormalDy, richNormalDy ) ), ${NORMAL_KERNEL_CLAMP.toFixed(3)} );`);
    const gloss = 'roughnessFactor = faceDirection > 0.0 ? richRoughness( roughnessFactor, waterRippleVariance ) : 0.620;';
    expect(RICH_SPECULAR).toContain(gloss);
    expect(RICH_SPECULAR.indexOf('waterRippleVariance +=')).toBeLessThan(RICH_SPECULAR.indexOf(gloss));
  });
});
