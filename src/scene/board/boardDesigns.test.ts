import { describe, expect, it } from 'vitest';
import { BOARD_DESIGNS, designPixels, waxPixels } from './boardDesigns';

const pixel = (pixels: Uint8Array, width: number, x: number, y: number) => Array.from(pixels.subarray((y * width + x) * 4, (y * width + x) * 4 + 4));

describe('board designs', () => {
  it('offers five unbranded designs with distinct ids', () => {
    expect(BOARD_DESIGNS).toHaveLength(5);
    expect(new Set(BOARD_DESIGNS.map((d) => d.id)).size).toBe(5);
  });

  it('paints the stringer down the middle of the deck, symmetric either side', () => {
    const pixels = designPixels(BOARD_DESIGNS[0], 'deck', 64, 256);
    expect(pixels).toHaveLength(64 * 256 * 4);
    expect(pixel(pixels, 64, 32, 128)).not.toEqual(pixel(pixels, 64, 20, 128));
    expect(pixel(pixels, 64, 20, 128)).toEqual(pixel(pixels, 64, 43, 128));
  });

  it('shades the rails toward the rail colour at the edges', () => {
    const design = BOARD_DESIGNS[1];
    const pixels = designPixels(design, 'bottom', 64, 256);
    expect(pixel(pixels, 64, 0, 128)).not.toEqual(pixel(pixels, 64, 20, 128));
  });

  it('fades a spray in along the board where the design has one', () => {
    const design = BOARD_DESIGNS.find((d) => d.spray)!;
    const pixels = designPixels(design, 'deck', 64, 256);
    const row = (v: number) => pixel(pixels, 64, 20, Math.round(v * 255));
    expect(row(Math.max(0, design.spray!.from - 0.05))).not.toEqual(row(Math.min(1, design.spray!.to)));
  });

  it('waxes only where the rider stands and lies', () => {
    const wax = waxPixels(32, 256);
    const roughness = (v: number) => wax[(Math.round(v * 255) * 32 + 16) * 4 + 1];
    expect(roughness(0.4)).toBeGreaterThan(130);
    expect(roughness(0.95)).toBeLessThan(40);
  });
});
