import { describe, expect, it } from 'vitest';
import { DROP_G, MIST_G, ballPars, henyeyGreenstein, isMist, mistPars } from './mist';

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

  it('scatters as water drops do: Mie g is 0.86–0.88, 180–510 times brighter at 10° than at 90° (spray-and-mist.md §3)', () => {
    expect(DROP_G).toBeGreaterThanOrEqual(0.86);
    expect(DROP_G).toBeLessThanOrEqual(0.88);
    const contrast = henyeyGreenstein(Math.cos((10 * Math.PI) / 180), DROP_G) / henyeyGreenstein(0, DROP_G);
    expect(contrast).toBeGreaterThan(180);
    expect(contrast).toBeLessThan(510);
    // The game's old mist g gave 21.
    expect(henyeyGreenstein(Math.cos((10 * Math.PI) / 180), 0.6) / henyeyGreenstein(0, 0.6)).toBeLessThan(25);
  });

  it('has a GLSL twin', () => {
    expect(mistPars).toContain('float henyeyGreenstein( float cosTheta, float g )');
    expect(ballPars).toContain(`const float DROP_G = ${DROP_G.toFixed(3)};`);
  });
});
