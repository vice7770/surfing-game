import { describe, expect, it } from 'vitest';
import { GRAVITY } from './dispersion';
import { FULLY_DEVELOPED_PERIOD, stormSwell } from './StormSwell';

describe('stormSwell', () => {
  it('grows fetch-limited seas by the JONSWAP relations', () => {
    const swell = stormSwell({ windSpeed: 15, fetchKm: 100, durationHours: 72, distanceKm: 0 });
    const fetch = (GRAVITY * 100_000) / (15 * 15);
    expect(swell.growth).toBe('fetch-limited');
    expect(swell.stormHeight).toBeCloseTo(1.6e-3 * Math.sqrt(fetch) * (15 * 15) / GRAVITY, 9);
    expect(swell.stormPeriod).toBeCloseTo(0.2857 * Math.cbrt(fetch) * 15 / GRAVITY, 9);
    expect(swell.stormPeriod).toBeCloseTo(7.1, 1);
  });

  it('caps long fetches at a fully developed Pierson–Moskowitz sea', () => {
    const swell = stormSwell({ windSpeed: 15, fetchKm: 2000, durationHours: 72, distanceKm: 0 });
    expect(swell.growth).toBe('fully developed');
    expect(swell.stormHeight).toBeCloseTo((0.22 * 15 * 15) / GRAVITY, 9);
    expect(swell.stormPeriod).toBeCloseTo((FULLY_DEVELOPED_PERIOD * 15) / GRAVITY, 9);
    // Pierson–Moskowitz ω_p = 0.877 g / U19.5 with U19.5 ≈ 1.026 U10.
    expect(FULLY_DEVELOPED_PERIOD).toBeCloseTo((2 * Math.PI * 1.026) / 0.877, 12);
  });

  it('limits short storms by their duration', () => {
    const short = stormSwell({ windSpeed: 15, fetchKm: 1000, durationHours: 6, distanceKm: 0 });
    const long = stormSwell({ windSpeed: 15, fetchKm: 1000, durationHours: 48, distanceKm: 0 });
    expect(short.growth).toBe('duration-limited');
    expect(short.stormHeight).toBeLessThan(long.stormHeight);
  });

  // Sandwell saturates the sea when the crest speed reaches the wind speed (c = U), so 17 s
  // needs ≈ 27 m/s; the Pierson–Moskowitz peak sits about 17 % above that period.
  it("reaches Sandwell's 17 s swell between a strong gale and 27 m/s", () => {
    expect(stormSwell({ windSpeed: 27, fetchKm: 5000, durationHours: 96, distanceKm: 0 }).stormPeriod).toBeGreaterThan(17);
    expect(stormSwell({ windSpeed: 20, fetchKm: 5000, durationHours: 96, distanceKm: 0 }).stormPeriod).toBeLessThan(17);
  });

  it('delivers lower, cleaner, more grouped swell from farther storms', () => {
    const near = stormSwell({ windSpeed: 18, fetchKm: 600, durationHours: 36, distanceKm: 500 });
    const far = stormSwell({ windSpeed: 18, fetchKm: 600, durationHours: 36, distanceKm: 4000 });
    expect(far.significantHeight).toBeLessThan(near.significantHeight);
    expect(far.spreading).toBeGreaterThan(near.spreading);
    expect(far.bandwidth).toBeLessThan(near.bandwidth);
    const groupSpeed = (GRAVITY * far.peakPeriod) / (4 * Math.PI);
    expect(far.travelHours).toBeCloseTo(4_000_000 / groupSpeed / 3600, 9);
  });
});
