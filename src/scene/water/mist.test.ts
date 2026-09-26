import { describe, expect, it } from 'vitest';
import { MIST_G, henyeyGreenstein, isMist, mistPars } from './mist';

describe('mist', () => {
  it('tells mist from drops by size', () => {
    expect(isMist(0.4)).toBe(true);
    expect(isMist(0.1)).toBe(false);
  });

  it('scatters forward: brightest looking toward the sun, normalised over the sphere', () => {
    expect(henyeyGreenstein(1, MIST_G)).toBeGreaterThan(10 * henyeyGreenstein(-1, MIST_G));
    let total = 0;
    const n = 2000;
    for (let i = 0; i < n; i += 1) {
      const c = -1 + (2 * (i + 0.5)) / n;
      total += henyeyGreenstein(c, MIST_G) * 2 * Math.PI * (2 / n);
    }
    expect(total).toBeCloseTo(1, 2);
  });

  it('has a GLSL twin', () => {
    expect(mistPars).toContain('float henyeyGreenstein( float cosTheta, float g )');
  });
});
