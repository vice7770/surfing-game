import { describe, expect, it } from 'vitest';
import type { Maneuver } from '../game/rideAnalysis';
import { breathVignette, heldDownNotice, maneuverCallout, showsBalanceMeter, showsBreathMeter } from './RideHud';

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

// The wipeout spec, Part B: what the player sees of the breath.
describe('the breath on the HUD', () => {
  it('shows the breath meter by the balance meter\'s rule: Practice by default', () => {
    expect(showsBreathMeter('practice', 'practice')).toBe(true);
    expect(showsBreathMeter('practice', 'medium')).toBe(false);
    expect(showsBreathMeter('always', 'big')).toBe(true);
    expect(showsBreathMeter('never', 'practice')).toBe(false);
  });

  it('darkens the screen\'s edges as the breath falls below half, and not before', () => {
    expect(breathVignette(1)).toBe(0);
    expect(breathVignette(0.5)).toBe(0);
    expect(breathVignette(0.3)).toBeGreaterThan(0);
    expect(breathVignette(0.1)).toBeGreaterThan(breathVignette(0.3));
    expect(breathVignette(0)).toBeLessThanOrEqual(0.85);
  });

  it('says "Held down too long" once for each rescue', () => {
    const first = heldDownNotice(1, 0);
    expect(first).toEqual({ seen: 1, text: 'HELD DOWN TOO LONG' });
    expect(heldDownNotice(1, first.seen).text).toBeUndefined();
    expect(heldDownNotice(2, first.seen).text).toBe('HELD DOWN TOO LONG');
  });
});
