import { describe, expect, it } from 'vitest';
import { CHURN_TILE, churnSample, churnTexture, freshness } from './churnTexture';

describe('churn whitewater', () => {
  it('tiles seamlessly', () => {
    for (const v of [0.05, 0.5, 0.93]) {
      expect(churnSample(0, v).density).toBeCloseTo(churnSample(1, v).density, 9);
      expect(churnSample(v, 0).height).toBeCloseTo(churnSample(v, 1).height, 9);
    }
  });

  it('is dense: mostly covered, with creases between clumps', () => {
    let covered = 0;
    for (let i = 0; i < 100; i += 1) for (let j = 0; j < 100; j += 1) covered += churnSample(i / 100, j / 100).density;
    expect(covered / 1e4).toBeGreaterThan(0.7);
    expect(covered / 1e4).toBeLessThan(0.95);
  });

  it('takes over from the lace only where the foam is fresh', () => {
    // G9: freshness follows the void fraction the plunge drove in (measured peaks near 0.2).
    expect(freshness(0.01)).toBe(0);
    expect(freshness(0.2)).toBe(1);
    expect(freshness(0.1)).toBeGreaterThan(freshness(0.05));
  });

  it('bakes density and height into a repeating, mipmapped tile', () => {
    const texture = churnTexture();
    expect(texture.image.width).toBe(256);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture).toBe(churnTexture());
    expect(CHURN_TILE).toBe(6);
  });
});
