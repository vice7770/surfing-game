import { describe, expect, it } from 'vitest';
import { measureRideability, rideability } from './Rideability';

describe('rideability', () => {
  it('shares the measured waves among close-outs, mixed peaks and each skill level', () => {
    const stats = rideability([
      { angleDegrees: 5, fit: 0.9 },
      { angleDegrees: 20, fit: 0.9 },
      { angleDegrees: 28, fit: 0.9 },
      { angleDegrees: 35, fit: 0.9 },
      { angleDegrees: 45, fit: 0.9 },
      { angleDegrees: 70, fit: 0.9 },
      { angleDegrees: 50, fit: 0.1 },
      undefined,
    ]);
    expect(stats.samples).toBe(8);
    expect(stats.waves).toBe(7);
    expect(stats.mixed).toBeCloseTo(1 / 7, 12);
    expect(stats.closeout).toBeCloseTo(2 / 7, 12);
    // Makeable shares are cumulative: a wave a beginner can make, a professional can too.
    expect(stats.makeable.professional).toBeCloseTo(4 / 7, 12);
    expect(stats.makeable.advanced).toBeCloseTo(3 / 7, 12);
    expect(stats.makeable.intermediate).toBeCloseTo(2 / 7, 12);
    expect(stats.makeable.beginner).toBeCloseTo(1 / 7, 12);
    // Angles of mixed peaks mean little, so the histogram and median use the clean waves only.
    expect(stats.histogram).toEqual([1, 0, 2, 1, 1, 0, 0, 1, 0]);
    expect(stats.medianAngle).toBe(31.5);
  });

  it('reports no waves without a single break', () => {
    const stats = rideability([undefined, undefined]);
    expect(stats.waves).toBe(0);
    expect(stats.closeout).toBe(0);
    expect(stats.makeable.professional).toBe(0);
    expect(Number.isNaN(stats.medianAngle)).toBe(true);
  });
});

describe('measureRideability', () => {
  it('samples the running surf zone once per peak period', () => {
    const result = measureRideability({
      spot: 'point', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 20, spreading: 24, tide: 0,
      componentCount: 12, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    }, { periods: 3, step: 1 / 30 });
    expect(result.samples).toHaveLength(3);
    expect(result.stats.samples).toBe(3);
    expect(result.simulatedSeconds).toBeCloseTo(27, 6);
  });
});
