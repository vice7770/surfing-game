import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { rotatedSun } from '../PhotoSky';
import {
  HAZE_EXTINCTION,
  HAZE_RING_SIZE,
  HAZE_VISIBILITY,
  applyHorizonHaze,
  hazeAmount,
  hazeExtinction,
  hazeTransmittance,
  horizonBandRows,
  horizonGain,
  ringLuminance,
  horizonHazeUniforms,
  horizonRing,
  mirrorGain,
  ringColorAt,
  srgbToLinear,
} from './horizonHaze';

/** The direction at the centre of ring bin k, unturned, as three samples an equirect map (skyMath's `directionAt`). */
function binDirection(k: number, size = HAZE_RING_SIZE): [number, number, number] {
  const longitude = ((k + 0.5) / size - 0.5) * 2 * Math.PI;
  return [Math.cos(longitude), 0, Math.sin(longitude)];
}

/** A ring whose bin k holds (k, 2k, 3k). */
const indexRing = (size = HAZE_RING_SIZE) => Float32Array.from({ length: 3 * size }, (_, i) => Math.floor(i / 3) * (1 + (i % 3)));

describe('the haze over the water', () => {
  it('leaves 2 % of the water’s contrast at the visibility (Koschmieder), and all of it with none', () => {
    expect(hazeTransmittance(HAZE_VISIBILITY, hazeExtinction(HAZE_VISIBILITY))).toBeCloseTo(0.02, 9);
    expect(hazeExtinction(0)).toBe(0);
    expect(hazeTransmittance(5000, 0)).toBe(1);
    expect(HAZE_EXTINCTION).toBeCloseTo(3.912 / HAZE_VISIBILITY, 6);
  });

  it('greys the far sea and hardly touches the break: the tank’s width keeps over 90 %, the far rim about 60 %', () => {
    expect(hazeTransmittance(0)).toBe(1);
    expect(hazeTransmittance(300)).toBeGreaterThan(0.9);
    expect(hazeTransmittance(1500)).toBeGreaterThan(0.5);
    expect(hazeTransmittance(1500)).toBeLessThan(0.7);
    let previous = 1;
    for (let d = 100; d <= 20000; d += 100) {
      const t = hazeTransmittance(d);
      expect(t).toBeLessThan(previous);
      previous = t;
    }
  });

  it('takes the far ocean’s rim the rest of the way to the horizon’s colour over its fade', () => {
    expect(hazeAmount(0)).toBe(0);
    expect(hazeAmount(1200)).toBeCloseTo(1 - hazeTransmittance(1200), 12);
    expect(hazeAmount(1200, 1)).toBe(1);
    expect(hazeAmount(1200, 0.5)).toBeCloseTo(1 - 0.5 * hazeTransmittance(1200), 12);
    expect(hazeAmount(1200, 2)).toBe(1);
    expect(hazeAmount(1200, 0.5, 0)).toBeCloseTo(0.5, 12);
  });
});

describe('the ring of horizon colours', () => {
  it('decodes sRGB as three does', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBeCloseTo(1, 12);
    expect(srgbToLinear(0.5)).toBeCloseTo(0.214, 3);
    expect(srgbToLinear(0.04)).toBeCloseTo(0.04 / 12.92, 12);
  });

  it('reads the rows within a degree of the horizon from an equirect image', () => {
    const { first, count } = horizonBandRows(2048);
    const elevation = (row: number) => (0.5 - (row + 0.5) / 2048) * 180;
    expect(elevation(first)).toBeLessThanOrEqual(1);
    expect(elevation(first)).toBeGreaterThan(0.9);
    expect(elevation(first + count - 1)).toBeGreaterThanOrEqual(-1);
    expect(elevation(first + count - 1)).toBeLessThan(-0.9);
  });

  it('averages each bin’s columns over the band, in linear values', () => {
    const width = 4 * HAZE_RING_SIZE;
    const rows = 3;
    const rgba = new Uint8ClampedArray(4 * width * rows);
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const k = 4 * (row * width + column);
        // Each bin's four columns: two at 0 and two at 255 in red; green by row; blue by bin.
        rgba[k] = column % 4 < 2 ? 0 : 255;
        rgba[k + 1] = row === 0 ? 255 : 0;
        rgba[k + 2] = Math.floor(column / 4) === 5 ? 128 : 0;
        rgba[k + 3] = 255;
      }
    }
    const ring = horizonRing(rgba, width, rows);
    expect(ring.length).toBe(3 * HAZE_RING_SIZE);
    for (let bin = 0; bin < HAZE_RING_SIZE; bin += 1) {
      expect(ring[3 * bin]).toBeCloseTo(0.5, 6);
      expect(ring[3 * bin + 1]).toBeCloseTo(1 / 3, 6);
      expect(ring[3 * bin + 2]).toBeCloseTo(bin === 5 ? srgbToLinear(128 / 255) : 0, 6);
    }
  });

  it('finds the colour a photo’s bin holds wherever the photo is turned, as the sun turns with it', () => {
    const ring = indexRing();
    for (const rotation of [0, 0.7, -2.1, Math.PI]) {
      for (const k of [0, 5, 17, HAZE_RING_SIZE - 1]) {
        const world = rotatedSun(binDirection(k), rotation, new Vector3());
        const [r, g, b] = ringColorAt(ring, world.x, world.z, rotation);
        expect(r).toBeCloseTo(k, 4);
        expect(g).toBeCloseTo(2 * k, 4);
        expect(b).toBeCloseTo(3 * k, 4);
      }
    }
  });

  it('blends neighbouring bins between their centres, across the seam at the back of the photo too', () => {
    const ring = indexRing();
    const between = (a: number) => {
      const longitude = ((a + 1) / HAZE_RING_SIZE - 0.5) * 2 * Math.PI;
      return ringColorAt(ring, Math.cos(longitude), Math.sin(longitude), 0)[0];
    };
    expect(between(9)).toBeCloseTo(9.5, 4);
    // Between the last bin and the first: half of each.
    expect(between(HAZE_RING_SIZE - 1)).toBeCloseTo((HAZE_RING_SIZE - 1) / 2, 4);
  });

  it('decodes any channel encoding, as an HDR’s half floats', () => {
    const rgba = new Float32Array(4 * HAZE_RING_SIZE).fill(2);
    const ring = horizonRing(rgba, HAZE_RING_SIZE, 1, HAZE_RING_SIZE, (v) => v * 0.5);
    expect(Array.from(ring).every((v) => v === 1)).toBe(true);
  });

  it('measures how much brighter the sky shown is than the sky that lights, at the horizon', () => {
    const grey = (v: number) => new Float32Array(3 * HAZE_RING_SIZE).fill(v);
    expect(ringLuminance(grey(0.3))).toBeCloseTo(0.3, 6);
    expect(horizonGain(grey(0.3), grey(1), 0.6)).toBeCloseTo(0.5, 6);
    expect(horizonGain(grey(0.3), grey(0), 0.6)).toBe(1);
  });

  it('turns the haze on with a ring and off without one, keeping the photo’s turn', () => {
    const uniforms = {
      waterHazeRing: { value: new Float32Array(3 * HAZE_RING_SIZE) },
      waterHazeTurn: { value: horizonHazeUniforms.waterHazeTurn.value.clone() },
      waterHazeExtinction: { value: 0 },
      waterSkyGain: { value: 1 },
    };
    applyHorizonHaze(uniforms, { ring: indexRing(), rotation: 0.5, gain: 0.4 }, true);
    expect(uniforms.waterHazeExtinction.value).toBe(HAZE_EXTINCTION);
    expect(uniforms.waterHazeRing.value[3 * 7]).toBe(7);
    expect(uniforms.waterHazeTurn.value.x).toBeCloseTo(Math.cos(0.5), 12);
    expect(uniforms.waterHazeTurn.value.y).toBeCloseTo(Math.sin(0.5), 12);
    expect(uniforms.waterSkyGain.value).toBe(0.4);
    applyHorizonHaze(uniforms, { ring: indexRing(), rotation: 0.5, gain: 0.4 }, false);
    expect(uniforms.waterHazeExtinction.value).toBe(0);
    applyHorizonHaze(uniforms, { rotation: 0.5, gain: 0.4 }, true);
    expect(uniforms.waterHazeExtinction.value).toBe(0);
    expect(uniforms.waterSkyGain.value).toBe(1);
    expect(uniforms.waterHazeRing.value[3 * 7]).toBe(7);
    applyHorizonHaze(uniforms, { ring: indexRing(), rotation: 0, gain: Number.NaN }, true);
    expect(uniforms.waterSkyGain.value).toBe(1);
    // Never brightening the environment: a midday photo brighter than its HDR leaves the mirror at 1.
    applyHorizonHaze(uniforms, { ring: indexRing(), rotation: 0, gain: 1.25 }, true);
    expect(uniforms.waterSkyGain.value).toBe(1);
    expect(mirrorGain(0.37)).toBe(0.37);
    expect(mirrorGain(undefined)).toBe(1);
    expect(mirrorGain(-2)).toBe(1);
  });
});
