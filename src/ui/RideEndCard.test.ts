import { describe, expect, it } from 'vitest';
import type { Maneuver, RideReport } from '../game/rideAnalysis';
import type { RideResult } from '../game/RideTracker';
import { endCardModel } from './RideEndCard';

const wipeout: RideResult = { outcome: 'wipeout', reason: 'ride.reason.impact', distance: 42.4, topSpeed: 8.2, seconds: 12.44 };

describe('endCardModel', () => {
  it('sums up the ride in the player\'s units', () => {
    const metric = endCardModel(wipeout, [], 'metric');
    expect(metric.title).toBe('end.wipeout');
    expect(metric.reason).toBe('ride.reason.impact');
    expect(metric.stats).toEqual([
      { label: 'end.distance', value: '42 m' },
      { label: 'end.topSpeed', value: '30 km/h' },
      { label: 'end.time', value: '12.4 s' },
    ]);
    expect(endCardModel(wipeout, [], 'imperial').stats.map((stat) => stat.value)).toEqual(['139 ft', '18 mph', '12.4 s']);
  });

  // P9: the worker's reading of the ride, and a score when the player asks for one.
  it('lists the turns and the time in the pocket, notes slow motion, and scores only when asked', () => {
    const turn = (kind: Maneuver['kind'], speedIn: number, speedOut: number): Maneuver => ({
      kind, start: 2, end: 3, yaw: 1.7, peakYawRate: 1.9, speedIn, speedOut, radius: 3.8, lateralG: 1.4, roll: 0.7, faceFraction: 0.3, pocket: true,
    });
    const report: RideReport = {
      duration: 12.4, distance: 42, topSpeed: 8.2, meanSpeed: 3.4, pocketTime: 3.24, end: 'kicked out', timeScale: 1,
      maneuvers: [turn('bottom turn', 7, 6.4), turn('cutback', 6.7, 6)],
    };
    const ridden: RideResult = { ...wipeout, report };
    const plain = endCardModel(ridden, [], 'metric');
    expect(plain.stats).toContainEqual({ label: 'end.pocket', value: '3.2 s' });
    expect(plain.turns).toEqual([{ label: 'maneuver.bottomTurn', value: '91 %' }, { label: 'maneuver.cutback', value: '90 %' }]);
    expect(plain.stats.map((stat) => stat.label)).not.toContain('end.score');
    expect(plain.slowMotion).toBeUndefined();
    const scored = endCardModel(ridden, [], 'metric', { score: 5.6, bestTwo: 11.8 });
    expect(scored.stats).toContainEqual({ label: 'end.score', value: '5.6' });
    expect(scored.stats).toContainEqual({ label: 'end.bestTwo', value: '11.8' });
    expect(endCardModel({ ...ridden, timeScale: 0.4 }, [], 'metric').slowMotion).toBe('0.4');
    // Without the worker's reading (a restart), the card is P8's.
    expect(endCardModel(wipeout, [], 'metric').turns).toEqual([]);
  });

  it('flags a new best, and names each outcome', () => {
    expect(endCardModel(wipeout, [], 'metric').newBest).toBe(false);
    expect(endCardModel(wipeout, ['distance'], 'metric').newBest).toBe(true);
    expect(endCardModel({ ...wipeout, outcome: 'complete' }, [], 'metric').title).toBe('end.complete');
    expect(endCardModel({ ...wipeout, outcome: 'ended' }, [], 'metric').title).toBe('end.ended');
  });
});
