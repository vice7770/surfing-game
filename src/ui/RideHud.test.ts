import { describe, expect, it } from 'vitest';
import type { Maneuver } from '../game/rideAnalysis';
import { balanceLimitLabel, balanceTick, TICK_MARGIN, underBarLabel, breathVignette, edgeNotice, heldDownNotice, maneuverCallout, showsBalanceMeter, showsBreathMeter, showsSprintBar, stanceReadout } from './RideHud';

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
  kind, start, end: start + 1, yaw: 1.7, peakYawRate: 1.9, speedIn: 7, speedOut: 6.4, radius: 3.8, lateralG: 1.4,
  pathYaw: 1.7, throughWater: 7, roll: 0.7, faceFraction: 0.3, pocket: false,
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

  // 2026-11-19: a run the analyzer refused to name is not shouted at the player, but the key still moves on, so the
  // manoeuvre after it is called out as its own.
  it('says nothing for an unjudged run, and calls the manoeuvre after it', () => {
    const quiet = maneuverCallout(turn('unjudged', 2), '');
    expect(quiet).toEqual({ key: 'unjudged@2.00' });
    expect(maneuverCallout(turn('bottom turn', 3.5), quiet.key).text).toBe('BOTTOM TURN');
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

  it('hints at the edge of the break once each time the rider is held at the window’s bounds', () => {
    const first = edgeNotice(1, 0);
    expect(first).toEqual({ seen: 1, text: 'EDGE OF THE BREAK, HEAD BACK IN' });
    expect(edgeNotice(1, first.seen).text).toBeUndefined();
    expect(edgeNotice(2, first.seen).text).toBe('EDGE OF THE BREAK, HEAD BACK IN');
  });
});

// The movement-flow spec: the stance readout shows what the player asks for, never a manoeuvre's name.
describe('stanceReadout', () => {
  it('reads the height from Compress past half, then the crouch, else normal', () => {
    expect(stanceReadout({ crouch: 1, compress: 0.6 }).level).toBe('compress');
    expect(stanceReadout({ crouch: 0.4, compress: 0.2 }).level).toBe('crouch');
    expect(stanceReadout({ crouch: 0.1 }).level).toBe('normal');
    expect(stanceReadout({}).level).toBe('normal');
    // The snap stance: Snap wins over Compress and the crouch held with it, and its weight is on the tail.
    expect(stanceReadout({ crouch: 1, compress: 1, snap: 0.6, trim: 0.5 })).toEqual({ level: 'snap', weight: -1 });
    expect(stanceReadout({ compress: 1, snap: 0.4 }).level).toBe('compress');
  });

  it('shows the weight always, and the rotation only when the pad asks for one', () => {
    expect(stanceReadout({ trim: -1.4 })).toEqual({ level: 'normal', weight: -1 });
    expect(stanceReadout({ trim: 0.5, rotate: 0.3 })).toEqual({ level: 'normal', weight: 0.5, rotate: 0.3 });
  });
});

// The sprint paddle's bar (the owner's choices of 2026-10-22): while paddling, below full; gone once full.
describe('showsSprintBar', () => {
  const sprint = (reserve: number, paddling: boolean) => ({ reserve, spent: reserve === 0, paddling, sprinting: false });
  it('shows while the rider paddles with the reserve below full, and not otherwise', () => {
    expect(showsSprintBar(sprint(0.6, true))).toBe(true);
    expect(showsSprintBar(sprint(0, true))).toBe(true);
    expect(showsSprintBar(sprint(1, true))).toBe(false);
    expect(showsSprintBar(sprint(0.6, false))).toBe(false);
    expect(showsSprintBar(undefined)).toBe(false);
  });
});

/**
 * Step 3.2v: **which** of the balance's three limits the meter names. The meter has always drawn only their minimum,
 * so it said how close the rider was and nothing about why — and the three are three different falls, which is what
 * the owner's own fall taxonomy turns on. Measured over 30 runs, the capture point's margin bound in every one and the
 * weight left the feet across the board in every one, with the feet still holding 86-91 % of their grip, so the label
 * carries real information rather than restating the bar.
 */
describe('balanceLimitLabel', () => {
  it('names the nearest limit while standing', () => {
    const ride = (limit: 'margin' | 'grip' | 'knee' | 'posture') => ({ phase: 'standing', balanceLimit: { limit } });
    expect(balanceLimitLabel(ride('margin'), 'metric')).toBe('Weight');
    expect(balanceLimitLabel(ride('grip'), 'metric')).toBe('Grip');
    expect(balanceLimitLabel(ride('knee'), 'metric')).toBe('Knees');
    // The old rider and a prone one have one number with no three terms behind it.
    expect(balanceLimitLabel(ride('posture'), 'metric')).toBe('Balance');
  });

  it('names the limit that let go, and the speed, once the rider is off the board', () => {
    const fallen = { phase: 'fallen' as const, broke: { limit: 'margin' as const, across: true, speed: 8 } };
    expect(balanceLimitLabel(fallen, 'metric')).toBe('Weight off the side — 29km/h');
    // Not across: the same limit without the side.
    expect(balanceLimitLabel({ ...fallen, broke: { ...fallen.broke, across: false } }, 'metric')).toBe('Weight — 29km/h');
    // A grip failure off the board is a different fall and says so.
    expect(balanceLimitLabel({ ...fallen, broke: { limit: 'grip', across: true, speed: 8 } }, 'metric')).toBe('Grip off the side — 29km/h');
  });

  it('says nothing when there is nothing to say, which hides the line', () => {
    expect(balanceLimitLabel(undefined, 'metric')).toBe('');
    // Paddling, before any fall.
    expect(balanceLimitLabel({ phase: 'prone' }, 'metric')).toBe('');
    // Standing on a status that carries no limits (the dev fixtures, and any older snapshot).
    expect(balanceLimitLabel({ phase: 'standing' }, 'metric')).toBe('');
  });

  it('prefers standing over the last fall, so a new ride is not labelled by the old one', () => {
    const ride = { phase: 'standing' as const, balanceLimit: { limit: 'knee' as const }, broke: { limit: 'margin' as const, across: true, speed: 8 } };
    expect(balanceLimitLabel(ride, 'metric')).toBe('Knees');
  });
});

// The balance bar with `rider=new` (2026-11-25): the fill is the exact reserve; it shows on every swell while standing,
// a tick shows the edge nearest to tipping below a margin of 0.6, and the limit's name moves to the dev readout.
describe('the balance bar with the new rider', () => {
  const settings = ['practice', 'always', 'never'] as const;
  const swells = ['practice', 'medium', 'big'] as const;

  it('without rider=new, behaves exactly as before, standing or not', () => {
    for (const setting of settings) for (const swell of swells) for (const standing of [true, false]) {
      const before = setting === 'always' || (setting === 'practice' && swell === 'practice');
      expect(showsBalanceMeter(setting, swell, false, standing)).toBe(before);
      expect(showsBalanceMeter(setting, swell)).toBe(before);
    }
  });

  it('with rider=new, shows on every swell while standing unless the setting is never', () => {
    for (const swell of swells) {
      expect(showsBalanceMeter('practice', swell, true, true)).toBe(true);
      expect(showsBalanceMeter('always', swell, true, true)).toBe(true);
      expect(showsBalanceMeter('never', swell, true, true)).toBe(false);
    }
  });

  it('with rider=new but not standing, today\'s rule applies', () => {
    expect(showsBalanceMeter('practice', 'medium', true, false)).toBe(false);
    expect(showsBalanceMeter('practice', 'practice', true, false)).toBe(true);
    expect(showsBalanceMeter('always', 'big', true, false)).toBe(true);
    expect(showsBalanceMeter('never', 'practice', true, false)).toBe(false);
  });

  const ride = (phase: string, margin: number, toward?: 'left' | 'right' | 'nose' | 'tail') => ({ phase, balanceLimit: { margin, ...(toward ? { toward } : {}) } });

  it('shows the tick below a margin of 0.6 and hides it at and above the line', () => {
    expect(TICK_MARGIN).toBe(0.6);
    expect(balanceTick(ride('standing', 0.59, 'left'))).toBe('left');
    expect(balanceTick(ride('standing', 0.6, 'left'))).toBeUndefined();
    expect(balanceTick(ride('standing', 0.9, 'left'))).toBeUndefined();
    expect(balanceTick(ride('standing', 0, 'tail'))).toBe('tail');
  });

  it('shows the tick while standing and recovering only', () => {
    expect(balanceTick(ride('recover', 0.3, 'right'))).toBe('right');
    for (const phase of ['prone', 'paddling', 'fallen', 'popup']) expect(balanceTick(ride(phase, 0.1, 'left'))).toBeUndefined();
    expect(balanceTick(undefined)).toBeUndefined();
    expect(balanceTick({ phase: 'standing' })).toBeUndefined();
    // The old rider's status has no direction: no tick.
    expect(balanceTick(ride('standing', 0.2))).toBeUndefined();
  });

  it('points to the edge the capture point names, for each of the four', () => {
    // 'left' is the board's +x rail (RideInput.steer +1); the sign itself is pinned in humanBalance.test.ts.
    for (const edge of ['left', 'right', 'nose', 'tail'] as const) expect(balanceTick(ride('standing', 0.3, edge))).toBe(edge);
  });

  it('draws no limit name under the bar with rider=new, and still does without it', () => {
    const standing = { phase: 'standing', balanceLimit: { limit: 'margin' as const } };
    const fallen = { phase: 'fallen', broke: { limit: 'margin' as const, across: true, speed: 8 } };
    expect(underBarLabel(standing, 'metric', true, true)).toBe('');
    expect(underBarLabel(fallen, 'metric', true, true)).toBe('');
    expect(underBarLabel(standing, 'metric', true, false)).toBe('Weight');
    expect(underBarLabel(fallen, 'metric', true, false)).toBe('Weight off the side — 29km/h');
    expect(underBarLabel(standing, 'metric', false, false)).toBe('');
  });
});
