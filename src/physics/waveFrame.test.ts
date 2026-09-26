import { describe, expect, it } from 'vitest';
import { exactWaveNumber } from '../wave/dispersion';
import { SwellWater } from './SwellWater';
import { WaveFrameGauge, requiredSpeed } from './waveFrame';

describe('wave frame', () => {
  const period = 10;
  const depth = 4;
  const k = exactWaveNumber((2 * Math.PI) / period, depth);
  const c = (2 * Math.PI) / period / k;
  const wavelength = (2 * Math.PI) / k;
  const still = { x: 0, y: 0, z: 0 };

  /** The gauge after `seconds` of a 1 m swell travelling +z, the rider held at z. */
  const settle = (z: number, seconds: number) => {
    const water = new SwellWater({ height: 1, period, depth });
    const gauge = new WaveFrameGauge();
    let frame = gauge.update(water, { x: 0, y: 0, z }, still, 1 / 60, 90);
    for (let s = 0; s < Math.round(seconds * 60); s += 1) {
      water.advance(1 / 60);
      frame = gauge.update(water, { x: 0, y: 0, z }, still, 1 / 60, 90);
    }
    return { frame, crestZ: c * water.time };
  };

  it('gives the speed a peel demands, c / sin α', () => {
    expect(requiredSpeed(4, 30)).toBeCloseTo(8, 9);
    expect(requiredSpeed(4, 90)).toBeCloseTo(4, 9);
    expect(requiredSpeed(4, 0)).toBe(Infinity);
  });

  it('tracks a linear crest at its phase speed', () => {
    const { frame } = settle(10, 1);
    expect(frame.valid).toBe(true);
    expect(frame.directionZ).toBeGreaterThan(0.99);
    expect(frame.crestSpeed / c).toBeGreaterThan(0.95);
    expect(frame.crestSpeed / c).toBeLessThan(1.05);
  });

  it('places the rider on the face: distance ahead of the crest and height on it', () => {
    // After 1 s the crest is at z = c; a rider 5 m ahead of it, a quarter wavelength ahead, and at the trough.
    const ahead = settle(c + 5, 1).frame;
    expect(ahead.aheadOfCrest).toBeGreaterThan(4.5);
    expect(ahead.aheadOfCrest).toBeLessThan(5.5);
    expect(settle(c + wavelength / 4, 1).frame.faceFraction).toBeCloseTo(0.5, 1);
    expect(settle(c + wavelength / 2 - 0.25, 1).frame.faceFraction).toBeLessThan(0.05);
    expect(settle(c + 0.1, 1).frame.faceFraction).toBeGreaterThan(0.95);
    expect(settle(c - 5, 1).frame.aheadOfCrest).toBeLessThan(-4.5);
  });

  it('splits the speed over ground along the wave and along the crest', () => {
    const water = new SwellWater({ height: 1, period, depth });
    const frame = new WaveFrameGauge().update(water, { x: 0, y: 0, z: 5 }, { x: 3, y: -2, z: 4 }, 1 / 60, 45);
    expect(frame.speedOverGround).toBeCloseTo(5, 6);
    expect(frame.speedShoreward).toBeCloseTo(4, 2);
    expect(frame.speedAlongCrest).toBeCloseTo(3, 2);
  });

  it('has no frame on flat water', () => {
    const flat = new SwellWater({ height: 0, period, depth });
    expect(new WaveFrameGauge().update(flat, still, still, 1 / 60, 90).valid).toBe(false);
  });
});
