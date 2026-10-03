import { describe, expect, it } from 'vitest';
import { BARREL_MASK_FULL, SWEPT_BAND_ALPHA, SWEPT_BARREL_DISCARD, WATER_BARREL_DISCARD, mirrorsBarrelDither, seamDraw, waterBarrelMaskPars } from './barrelMaskGlsl';

describe('the swept barrel’s seam (look-fix round 1)', () => {
  it('cuts the water only where the mask is full, with no dither', () => {
    expect(WATER_BARREL_DISCARD).toBe('if ( waterBarrelMaskActive > 0.5 && waterBarrelMaskAt( vWaterWorld.xz ) >= 0.999 ) discard;');
    for (const glsl of [waterBarrelMaskPars, WATER_BARREL_DISCARD, SWEPT_BARREL_DISCARD, SWEPT_BAND_ALPHA]) {
      expect(glsl).not.toContain('Dither');
      expect(glsl).not.toContain('gl_FragCoord');
    }
  });

  it('draws the opaque curl exactly where the water gave way, and the band across the rest of the mask', () => {
    expect(SWEPT_BARREL_DISCARD).toBe('if ( waterBarrelMaskAt( vWaterWorld.xz ) < 0.999 ) discard;');
    expect(SWEPT_BAND_ALPHA).toContain('if ( sweptBandMask <= 0.0 || sweptBandMask >= 0.999 ) discard;');
    expect(SWEPT_BAND_ALPHA).toContain('diffuseColor.a = sweptBandOpaque > 0.5 ? 1.0 : sweptBandMask;');
    // Every mask value: exactly one of the water and the opaque curl, and the band only between them, at the mask.
    for (let k = 0; k <= 1000; k += 1) {
      const mask = k / 1000;
      const draw = seamDraw(mask);
      expect(draw.water).not.toBe(draw.curl);
      expect(draw.band).toBe(mask > 0 && mask < BARREL_MASK_FULL ? mask : 0);
      if (draw.curl) expect(draw.band).toBe(0);
    }
    // The 8-bit mask: a full node reads full, a node one step short does not.
    expect(seamDraw(255 / 255).curl).toBe(true);
    expect(seamDraw(254 / 255).curl).toBe(false);
  });

  it('still tells a fragment that reads the seam’s cut from one that does not', () => {
    expect(mirrorsBarrelDither(`${waterBarrelMaskPars}\n${WATER_BARREL_DISCARD}`)).toBe(true);
    expect(mirrorsBarrelDither(`${waterBarrelMaskPars}\n${SWEPT_BARREL_DISCARD}`)).toBe(true);
    expect(mirrorsBarrelDither('void main() {}')).toBe(false);
  });
});
