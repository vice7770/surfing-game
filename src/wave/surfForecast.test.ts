import { describe, expect, it } from 'vitest';
import { SETS_OVER_TYPICAL, caldwellAucan, fitForecast, forecastSurf, komarGaughan } from './surfForecast';

describe('empirical surf heights', () => {
  it('breaks Hs 3 m at 12 s at about 4 m (Komar & Gaughan)', () => {
    expect(komarGaughan(3, 12)).toBeCloseTo(0.39 * 9.81 ** 0.2 * (12 * 9) ** 0.4, 10);
    expect(komarGaughan(3, 12)).toBeGreaterThan(3.9);
    expect(komarGaughan(3, 12)).toBeLessThan(4.1);
  });

  it('gives Hawaii\'s outer-reef sets from shoaling and refraction (Caldwell & Aucan)', () => {
    const shoaled = 3 ** 0.8 * ((Math.sqrt(9.81) * 12) / (4 * Math.PI)) ** 0.4;
    const feet = shoaled * 3.28084;
    const kr = -0.0003 * feet ** 3 + 0.0099 * feet ** 2 - 0.025 * feet + 1.0747;
    expect(caldwellAucan(3, 12)).toBeCloseTo(shoaled * kr, 10);
    // Above 21 ft the refraction is fixed at 2.145.
    const big = 8 ** 0.8 * ((Math.sqrt(9.81) * 16) / (4 * Math.PI)) ** 0.4;
    expect(caldwellAucan(8, 16)).toBeCloseTo(big * 2.145, 10);
  });

  it('fits a spot\'s forecast to measured runs in the Komar-Gaughan form', () => {
    const runs = [1, 2, 3, 4].flatMap((significantHeight) => [10, 14, 18].map((period) => {
      const typical = 0.6 * significantHeight ** 0.8 * period ** 0.4;
      return { significantHeight, period, typical, sets: 1.3 * typical };
    }));
    const fit = fitForecast(runs);
    expect(fit.a).toBeCloseTo(0.6, 6);
    expect(fit.sets).toBeCloseTo(1.3, 6);
  });

  it('forecasts sets no smaller than the typical face', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      const surf = forecastSurf(spot, 2, 12);
      expect(surf.typical).toBeGreaterThan(0);
      expect(surf.sets).toBeGreaterThanOrEqual(surf.typical);
    }
    expect(SETS_OVER_TYPICAL).toBe(1.27);
  });
});
