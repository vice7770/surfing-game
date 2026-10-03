import { DataUtils } from 'three';
import { describe, expect, it } from 'vitest';
import {
  CAPILLARY_WAVELENGTH, RIPPLE_BAND, RIPPLE_RMS_SLOPE, RIPPLE_SIZE, RIPPLE_TILES, RIPPLE_WEIGHTS, rippleFoamGain, rippleSlope, rippleTexture, rippleVariance,
  rippleWaveVectors, waterRipplePars,
} from './rippleTexture';

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

describe('ripple slope variance', () => {
  const point = (sx: number, sz: number): [number, number, number, number] => [sx, sz, sx * sx, sz * sz];

  it('is zero where the footprint resolves the ripples, even when the layers slope opposite ways', () => {
    expect(rippleVariance(point(0.1, -0.05), point(-0.12, 0.08), point(-0.03, 0.02), point(0.09, -0.1), 0.7)).toBe(0);
  });

  it('adds each layer’s unresolved variance as the layers are summed (the finer at 0.6, so 0.36), blended by phase', () => {
    const blurred = (variance: number): [number, number, number, number] => [0, 0, variance / 2, variance / 2];
    expect(rippleVariance(blurred(0.01), blurred(0.02), blurred(0.03), blurred(0), 0.25)).toBeCloseTo(0.25 * (0.01 + 0.36 * 0.02) + 0.75 * 0.03, 12);
    expect(waterRipplePars).toContain('float waterRippleLayerVariance( vec4 t )');
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

describe('the third ripple layer', () => {
  const wavelengths = (tile: number) => rippleWaveVectors().map(([nx, nz]) => tile / Math.hypot(nx, nz));

  it('carries the near water’s centimetre ripples on a 0.35 m tile: 1.25 to 11.7 cm, past the capillary-gravity minimum', () => {
    expect(RIPPLE_TILES).toEqual([4, 1.3, 0.35]);
    // The wave vectors span |n| 3 to 28 per tile (rounded to integers, so a hair either side).
    for (const [nx, nz] of rippleWaveVectors()) {
      expect(Math.hypot(nx, nz)).toBeGreaterThan(RIPPLE_BAND.min - 1);
      expect(Math.hypot(nx, nz)).toBeLessThan(RIPPLE_BAND.max + 1);
    }
    // Before it the shortest ripple anywhere was the second layer's, 4.6 cm.
    expect(Math.min(...wavelengths(RIPPLE_TILES[1]))).toBeGreaterThan(0.044);
    // The band is 1.25 to 11.7 cm on the third tile; this seed's components reach 1.5 cm, past λ = 2π √(σ/(ρ g)) = 1.7 cm
    // (σ = 0.073 N/m), where wind ripples pass from gravity waves to capillary ones.
    const third = wavelengths(RIPPLE_TILES[2]);
    expect(RIPPLE_TILES[2] / RIPPLE_BAND.max).toBeCloseTo(0.0125, 4);
    expect(RIPPLE_TILES[2] / RIPPLE_BAND.min).toBeCloseTo(0.1167, 4);
    expect(CAPILLARY_WAVELENGTH).toBeCloseTo(0.0171, 4);
    expect(Math.min(...third)).toBeLessThan(CAPILLARY_WAVELENGTH);
    expect(Math.max(...third)).toBeLessThan(0.125);
    expect(third.filter((l) => l < 0.02).length).toBeGreaterThanOrEqual(5);
  });

  it('adds its own unresolved variance by its weight squared, so it turns into roughness with distance', () => {
    const blurred = (variance: number): [number, number, number, number] => [0, 0, variance / 2, variance / 2];
    const [, w1, w2] = RIPPLE_WEIGHTS;
    expect(w1).toBe(0.6);
    expect(w2).toBe(0.5);
    expect(rippleVariance(blurred(0.01), blurred(0.02), blurred(0.03), blurred(0), 0.25, blurred(0.04), blurred(0.05)))
      .toBeCloseTo(0.25 * (0.01 + 0.36 * 0.02 + 0.25 * 0.04) + 0.75 * (0.03 + 0.25 * 0.05), 12);
    // Without its taps, the two-layer sum as before.
    expect(rippleVariance(blurred(0.01), blurred(0.02), blurred(0.03), blurred(0), 0.25)).toBeCloseTo(0.25 * (0.01 + 0.36 * 0.02) + 0.75 * 0.03, 12);
  });

  it('taps the one ripple texture at its tile in both flow phases, with no sampler of its own', () => {
    expect(waterRipplePars).toContain(`const float RIPPLE_TILE_2 = ${RIPPLE_TILES[2].toFixed(3)};`);
    expect(waterRipplePars).toContain('vec4 a2 = waterRippleTap( pa, RIPPLE_TILE_2 );');
    expect(waterRipplePars).toContain('vec4 b2 = waterRippleTap( pb, RIPPLE_TILE_2 );');
    expect(waterRipplePars).toContain('RIPPLE_WEIGHT_2 * a2.xy');
    expect(waterRipplePars).toContain('RIPPLE_WEIGHT_2 * RIPPLE_WEIGHT_2 * waterRippleLayerVariance( b2 )');
    expect(waterRipplePars.match(/uniform sampler/g)).toHaveLength(1);
  });
});
