import { describe, expect, it } from 'vitest';
import { SWEPT_BARREL_DISCARD, WATER_BARREL_DISCARD, WATER_BARREL_FALLBACK_DISCARD } from './barrelMaskGlsl';

/** Evaluate only the scalar discard predicate from our fixed GLSL constants, with texture/noise reads supplied.
 * The comparisons and max have the same semantics here; these cases use exact binary fractions. No raster/GPU claim.
 */
function survives(discard: string, sampled: number, authored: number, dither: number, active = 1): boolean {
  const prefix = 'if ( ';
  const suffix = ' ) discard;';
  if (!discard.startsWith(prefix) || !discard.endsWith(suffix)) throw new Error('Unexpected discard statement');
  const condition = discard.slice(prefix.length, -suffix.length);
  const rejected = new Function('waterBarrelMaskAt', 'waterBarrelDither', 'vWaterWorld', 'gl_FragCoord',
    'vSweptMask', 'waterBarrelMaskActive', 'max', `return (${condition});`);
  return !rejected(() => sampled, () => dither, { xz: null }, { xy: null }, authored, active, Math.max);
}

describe('the authored swept coverage predicate', () => {
  it('keeps an authored core even when a coarse texture reads zero', () => {
    for (const sampled of [0, 0.25, 0.5, 1]) {
      for (const dither of [0, 0.25, 0.5, 0.9990234375]) {
        expect(survives(SWEPT_BARREL_DISCARD, sampled, 1, dither)).toBe(true);
      }
    }
  });

  it.each([
    { sampled: 0, authored: 0, dither: 0, kept: false },
    { sampled: 0, authored: 0.25, dither: 0.125, kept: true },
    { sampled: 0, authored: 0.25, dither: 0.25, kept: false },
    { sampled: 0, authored: 0.25, dither: 0.5, kept: false },
    { sampled: 0.25, authored: 0.25, dither: 0.375, kept: false }, // Adding masks would wrongly keep this pixel.
    { sampled: 0.75, authored: 0.25, dither: 0.5, kept: true }, // Retain the stronger texture support.
    { sampled: 0.5, authored: 0, dither: 0.5, kept: false },
  ])('preserves the band threshold for sampled=$sampled authored=$authored dither=$dither', ({ sampled, authored, dither, kept }) => {
    expect(survives(SWEPT_BARREL_DISCARD, sampled, authored, dither)).toBe(kept);
  });

  it('leaves the ordinary water and late repair predicates independent of authored loft coverage', () => {
    for (const authored of [0, 0.25, 1]) {
      expect(survives(WATER_BARREL_DISCARD, 0.25, authored, 0.5)).toBe(true);
      expect(survives(WATER_BARREL_FALLBACK_DISCARD, 0.25, authored, 0.5)).toBe(false);
      expect(survives(WATER_BARREL_DISCARD, 0.75, authored, 0.5)).toBe(false);
      expect(survives(WATER_BARREL_FALLBACK_DISCARD, 0.75, authored, 0.5)).toBe(true);
      expect(survives(WATER_BARREL_DISCARD, 1, authored, 0.5, 0)).toBe(true);
      expect(survives(WATER_BARREL_FALLBACK_DISCARD, 1, authored, 0.5, 0)).toBe(false);
    }
    // Additional authored loft support can overlap the unchanged water; depth/stencil resolve its visibility.
    expect(survives(SWEPT_BARREL_DISCARD, 0, 1, 0.5)).toBe(true);
    expect(survives(WATER_BARREL_DISCARD, 0, 1, 0.5)).toBe(true);
  });
});
