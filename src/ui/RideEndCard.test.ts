import { describe, expect, it } from 'vitest';
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

  it('flags a new best, and names each outcome', () => {
    expect(endCardModel(wipeout, [], 'metric').newBest).toBe(false);
    expect(endCardModel(wipeout, ['distance'], 'metric').newBest).toBe(true);
    expect(endCardModel({ ...wipeout, outcome: 'complete' }, [], 'metric').title).toBe('end.complete');
    expect(endCardModel({ ...wipeout, outcome: 'ended' }, [], 'metric').title).toBe('end.ended');
  });
});
