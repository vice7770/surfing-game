import { describe, expect, it } from 'vitest';
import type { Maneuver } from '../game/rideAnalysis';
import { maneuverCallout } from './RideHud';

const turn = (kind: Maneuver['kind'], start: number): Maneuver => ({
  kind, start, end: start + 1, yaw: 1.7, peakYawRate: 1.9, speedIn: 7, speedOut: 6.4, radius: 3.8, lateralG: 1.4, roll: 0.7, faceFraction: 0.3, pocket: false,
});

describe('maneuverCallout', () => {
  it('calls out each new manoeuvre once, by name', () => {
    const first = maneuverCallout(turn('bottom turn', 2), '');
    expect(first).toEqual({ key: 'bottom turn@2.00', text: 'BOTTOM TURN' });
    expect(maneuverCallout(turn('bottom turn', 2), first.key).text).toBeUndefined();
    expect(maneuverCallout(turn('cutback', 4.5), first.key).text).toBe('CUTBACK');
  });

  it('forgets the last one between rides, so the next ride’s first turn is called', () => {
    expect(maneuverCallout(undefined, 'bottom turn@2.00')).toEqual({ key: '' });
  });
});
