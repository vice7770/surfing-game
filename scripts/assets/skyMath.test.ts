import { describe, expect, it } from 'vitest';
import { directionAt, encodeHdr, extractSun, horizontalIrradiance, parseHdr, pixelSolidAngle, type HdrImage } from './skyMath';

function skyWithSun(width: number, height: number, sunCol: number, sunRow: number): HdrImage {
  const data = new Float32Array(width * height * 3).fill(1);
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const i = ((sunRow + dr) * width + sunCol + dc) * 3;
      data[i] = 5000;
      data[i + 1] = 4000;
      data[i + 2] = 3000;
    }
  }
  return { width, height, data };
}

describe('sky math', () => {
  it('round-trips RGBE within its 8-bit mantissa', () => {
    const image: HdrImage = { width: 4, height: 2, data: new Float32Array([0.5, 1, 2, 10, 20, 40, 0, 0, 0, 1e4, 1, 0.01, 3, 3, 3, 0.2, 0.3, 0.4, 7, 8, 9, 1, 1, 1]) };
    const back = parseHdr(encodeHdr(image));
    expect(back.width).toBe(4);
    expect(back.height).toBe(2);
    for (let i = 0; i < image.data.length; i += 3) {
      const max = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]);
      for (let c = 0; c < 3; c += 1) expect(Math.abs(back.data[i + c] - image.data[i + c])).toBeLessThanOrEqual(max / 128);
    }
  });

  it('reads run-length scanlines as three writes them', () => {
    const header = new TextEncoder().encode('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1 +X 8\n');
    // One RLE scanline of 8 pixels, all (128, 64, 32, e=129): each channel a run of 8.
    const scan = [2, 2, 0, 8, 128 + 8, 128, 128 + 8, 64, 128 + 8, 32, 128 + 8, 129];
    const bytes = new Uint8Array([...header, ...scan]);
    const image = parseHdr(bytes);
    expect(image.width).toBe(8);
    expect(image.data[0]).toBeCloseTo(1, 6);
    expect(image.data[1]).toBeCloseTo(0.5, 6);
    expect(image.data[23]).toBeCloseTo(0.25, 6);
  });

  it('maps the top row to straight up and the middle column to +x, as three samples an equirect map', () => {
    expect(directionAt(0.5, 0, 64, 32).y).toBeGreaterThan(0.99);
    const horizon = directionAt(31.5, 15.5, 64, 32);
    expect(Math.abs(horizon.y)).toBeLessThan(1e-9);
    expect(horizon.x).toBeCloseTo(1, 9);
  });

  it('gives pixel solid angles that cover the sphere', () => {
    let total = 0;
    for (let row = 0; row < 64; row += 1) total += pixelSolidAngle(row, 128, 64) * 128;
    expect(total).toBeCloseTo(4 * Math.PI, 6);
  });

  it('finds the sun, removes it and measures its irradiance', () => {
    const image = skyWithSun(128, 64, 40, 20);
    const { sun, image: cleaned } = extractSun(image);
    const expected = directionAt(40, 20, 128, 64);
    expect(sun.direction[0]).toBeCloseTo(expected.x, 2);
    expect(sun.direction[1]).toBeCloseTo(expected.y, 2);
    expect(sun.direction[2]).toBeCloseTo(expected.z, 2);
    expect(sun.pixels).toBe(9);
    expect(Math.max(...cleaned.data)).toBeLessThan(2);
    let omega = 0;
    for (let row = 19; row <= 21; row += 1) omega += 3 * pixelSolidAngle(row, 128, 64);
    expect(sun.irradiance[0]).toBeCloseTo(4999 * omega, 3);
    expect(sun.irradiance[0]).toBeGreaterThan(sun.irradiance[2]);
  });

  it('never gives the sun negative energy in a channel dimmer than the sky around it', () => {
    const image = skyWithSun(128, 64, 40, 20);
    for (let i = 0; i < image.data.length; i += 3) image.data[i + 2] = 2; // a blue sky
    for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) image.data[((20 + dr) * 128 + 40 + dc) * 3 + 2] = 1.5; // a red sun, bluer sky
    const { sun } = extractSun(image);
    expect(sun.irradiance[2]).toBe(0);
    expect(sun.irradiance[0]).toBeGreaterThan(0);
  });

  it('leaves a sunless sky untouched', () => {
    const image: HdrImage = { width: 16, height: 8, data: new Float32Array(16 * 8 * 3).fill(1) };
    const { sun, image: cleaned } = extractSun(image);
    expect(sun.irradiance).toEqual([0, 0, 0]);
    expect(Array.from(cleaned.data)).toEqual(Array.from(image.data));
  });

  it('measures a uniform unit sky’s horizontal irradiance as π', () => {
    const image: HdrImage = { width: 256, height: 128, data: new Float32Array(256 * 128 * 3).fill(1) };
    expect(horizontalIrradiance(image)).toBeCloseTo(Math.PI, 2);
  });
});
