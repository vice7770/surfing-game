import { describe, expect, it } from 'vitest';
import type { Maneuver } from '../game/rideAnalysis';
import { maneuverCallout, showsBalanceMeter } from './RideHud';

// P9: on by default in Practice, off in natural seas (the spec).
describe('showsBalanceMeter', () => {
  it('shows the meter on the Practice swell and hides it on a natural sea, unless set always or never', () => {
    expect(showsBalanceMeter('practice', 'practice')).toBe(true);
    expect(showsBalanceMeter('practice', 'medium')).toBe(false);
    expect(showsBalanceMeter('always', 'big')).toBe(true);
    expect(showsBalanceMeter('never', 'practice')).toBe(false);
  });
});

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
