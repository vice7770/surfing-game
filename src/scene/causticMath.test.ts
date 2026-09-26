import { describe, expect, it } from 'vitest';
import { bedHit, causticProfile, crestFocalDepth, refract } from './causticMath';
import { WATER_IOR } from './waterOptics';

const overhead = { x: 0, y: 1, z: 0 };

describe('caustics from the real surface', () => {
  it("refracts by Snell's law and passes a vertical ray straight through flat water", () => {
    const incident = { x: Math.sin(0.6), y: -Math.cos(0.6), z: 0 };
    const ray = refract(incident, overhead, 1 / WATER_IOR)!;
    expect(Math.hypot(ray.x, ray.y, ray.z)).toBeCloseTo(1, 12);
    expect(Math.sin(0.6)).toBeCloseTo(WATER_IOR * ray.x, 12);
    expect(bedHit(3, 4, 2, overhead, overhead)).toEqual({ x: 3, z: 4 });
  });

  it('lights a bed under flat water evenly', () => {
    const light = causticProfile(() => 0, 3, { x: 0.3, y: 1, z: 0 }, 0, 20, 400, 40);
    for (const value of light) expect(value).toBeCloseTo(1, 9);
  });

  it('focuses sunlight under crests, doubling it at half the focal depth, and conserves it over a wave', () => {
    const amplitude = 0.05;
    const wavelength = 10;
    const k = (2 * Math.PI) / wavelength;
    const focus = crestFocalDepth(amplitude, k);
    const light = causticProfile((x) => -amplitude * k * Math.sin(k * x), focus / 2, overhead, -wavelength / 2, wavelength / 2, 20000, 200);
    const mean = light.reduce((a, b) => a + b, 0) / light.length;
    expect(mean).toBeCloseTo(1, 3);
    // The crest is at x = 0, the middle bin; the trough at the ends.
    expect(light[100]).toBeGreaterThan(1.9);
    expect(light[100]).toBeLessThan(2.1);
    expect(light[0]).toBeLessThan(1);
  });
});
