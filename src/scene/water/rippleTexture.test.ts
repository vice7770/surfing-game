import { DataUtils } from 'three';
import { describe, expect, it } from 'vitest';
import { RIPPLE_RMS_SLOPE, RIPPLE_SIZE, rippleFoamGain, rippleSlope, rippleTexture, waterRipplePars } from './rippleTexture';

describe('ripple texture', () => {
  it('tiles exactly: the slope at one edge equals the opposite edge', () => {
    for (const v of [0.1, 0.37, 0.8]) {
      const [a0, b0] = rippleSlope(0, v);
      const [a1, b1] = rippleSlope(1, v);
      expect(a1).toBeCloseTo(a0, 9);
      expect(b1).toBeCloseTo(b0, 9);
      const [c0, d0] = rippleSlope(v, 0);
      const [c1, d1] = rippleSlope(v, 1);
      expect(c1).toBeCloseTo(c0, 9);
      expect(d1).toBeCloseTo(d0, 9);
    }
  });

  it('has zero mean and the intended rms slope', () => {
    let sum = 0;
    let squares = 0;
    let count = 0;
    for (let i = 0; i < 64; i += 1) {
      for (let j = 0; j < 64; j += 1) {
        const [sx, sz] = rippleSlope(i / 64, j / 64);
        sum += sx + sz;
        squares += sx * sx + sz * sz;
        count += 2;
      }
    }
    expect(Math.abs(sum / count)).toBeLessThan(0.005);
    expect(Math.sqrt(squares / count)).toBeCloseTo(RIPPLE_RMS_SLOPE, 3);
  });

  it('stores each slope with its square, so filtered texels give the unresolved variance', () => {
    const texture = rippleTexture();
    expect(texture.image.width).toBe(RIPPLE_SIZE);
    expect(texture.generateMipmaps).toBe(true);
    const data = texture.image.data as Uint16Array;
    const [sx, sz] = rippleSlope(0.5 / RIPPLE_SIZE, 0.5 / RIPPLE_SIZE);
    expect(DataUtils.fromHalfFloat(data[0])).toBeCloseTo(sx, 2);
    expect(DataUtils.fromHalfFloat(data[1])).toBeCloseTo(sz, 2);
    expect(DataUtils.fromHalfFloat(data[2])).toBeCloseTo(sx * sx, 3);
    expect(DataUtils.fromHalfFloat(data[3])).toBeCloseTo(sz * sz, 3);
    expect(rippleTexture()).toBe(texture);
  });

  it('carries the ripples on the current in two phases in the shader', () => {
    expect(waterRipplePars).toContain('vec2 waterRippleSlopeAt( vec2 p, vec2 flow )');
    expect(waterRipplePars).toContain('waterRippleVariance =');
  });
});

describe('ripple strength over foam', () => {
  it('is glassy on clean water, busiest in thin turbulent foam, and damped under thick foam', () => {
    expect(rippleFoamGain(0)).toBeCloseTo(0.35, 9);
    expect(rippleFoamGain(0.25)).toBeGreaterThan(0.75);
    expect(rippleFoamGain(0.9)).toBeLessThan(0.3);
    expect(waterRipplePars).toContain('float waterRippleFoamGain( float foam )');
  });
});
