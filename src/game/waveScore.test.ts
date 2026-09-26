import { describe, expect, it } from 'vitest';
import type { Maneuver, RideReport } from './rideAnalysis';
import { bestTwo, scoreRide } from './waveScore';

const DEG = Math.PI / 180;

/** A turn from `start` lasting 1 s, keeping `kept` of its speed. */
function turn(kind: Maneuver['kind'], start: number, degrees: number, peak: number, speedIn: number, faceFraction: number, kept = 0.92): Maneuver {
  return {
    kind, start, end: start + 1, yaw: degrees * DEG, peakYawRate: peak, speedIn, speedOut: speedIn * kept,
    radius: speedIn / peak, lateralG: (speedIn * peak) / 9.81, roll: 0.7, faceFraction, pocket: true,
  };
}

/**
 * The survey's calibration ride (§10): 22 s of turns only, as Forsyth et al. 2024's
 * accomplished surfers turn — two bottom turns and two cutbacks, linked, in the pocket.
 */
function proRide(overrides: Partial<RideReport> = {}): RideReport {
  return {
    duration: 22, distance: 140, topSpeed: 9.7, meanSpeed: 6.4, pocketTime: 8, end: 'lost the face', timeScale: 1,
    maneuvers: [
      turn('bottom turn', 3, 99, 1.9, 7.3, 0.3),
      turn('cutback', 5, 152, 3, 6.7, 0.8),
      turn('bottom turn', 7.5, 99, 1.9, 7.3, 0.3),
      turn('cutback', 9.5, 152, 3, 6.7, 0.8),
    ],
    ...overrides,
  };
}

describe('scoreRide', () => {
  it('scores a turns-only ride like an accomplished surfer as good (5.0–6.4 on the WSL scale)', () => {
    const { score, parts } = scoreRide(proRide());
    expect(score).toBeGreaterThanOrEqual(5);
    expect(score).toBeLessThanOrEqual(6.4);
    expect(parts.completion).toBe(1);
    expect(parts.combination).toBeCloseTo(0.75, 6);
  });

  it('scores a straight ride low', () => {
    const { score } = scoreRide(proRide({ duration: 10, maneuvers: [] }));
    expect(score).toBeGreaterThanOrEqual(0.3);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('scores a ride that falls just after its last turn low', () => {
    // The last turn ends 10.5 s into the ride.
    const fell = scoreRide(proRide({ end: 'fell', duration: 11.5 }));
    expect(fell.parts.completion).toBe(0.5);
    expect(fell.score).toBeLessThanOrEqual(3.5);
    // A fall long after the last turn is the end of a ride, not a failed manoeuvre.
    expect(scoreRide(proRide({ end: 'fell', duration: 22 })).parts.completion).toBe(1);
  });

  it('never scores below 0.1, and always in tenths', () => {
    expect(scoreRide(proRide({ duration: 0, maneuvers: [] })).score).toBe(0.1);
    for (const ride of [proRide(), proRide({ end: 'fell', duration: 11.5 }), proRide({ duration: 7.3, maneuvers: [] })]) {
      const { score } = scoreRide(ride);
      expect(Math.abs(score * 10 - Math.round(score * 10))).toBeLessThan(1e-9);
    }
  });

  // Review Focus 3: slow motion changes nothing.
  it('scores the same ride the same at any time scale', () => {
    expect(scoreRide(proRide({ timeScale: 0.4 }))).toEqual(scoreRide(proRide()));
  });
});

describe('bestTwo', () => {
  it('adds a heat’s two best scores', () => {
    expect(bestTwo([3.2, 7.1, 5.5])).toBe(12.6);
    expect(bestTwo([4])).toBe(4);
    expect(bestTwo([])).toBe(0);
  });
});
