import { describe, expect, it } from 'vitest';
import type { LoggedRide, SpotBests } from '../game/Logbook';
import { DEFAULT_CONDITIONS } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import { endingLine, logbookModel } from './LogbookScreen';

const now = 1_700_000_000_000;
const ride = (overrides: Partial<LoggedRide>): LoggedRide => ({
  outcome: 'wipeout', reason: 'ride.reason.balance', distance: 42.4, topSpeed: 8.2, seconds: 12.44,
  spot: 'point', conditions: DEFAULT_CONDITIONS, seed: 1, at: now, ...overrides,
});
const log = (recent: LoggedRide[], bests: Partial<Record<SpotName, SpotBests>> = {}) => ({ recent, bests: (spot: SpotName) => bests[spot] ?? {} });

describe('logbookModel', () => {
  it('shows each spot\'s bests in the player\'s units, and a dash where there are none', () => {
    const model = logbookModel(log([], { point: { distance: 42.4, topSpeed: 8.2, seconds: 12.44 } }), 'imperial', now);
    // The Wave Pool is first in every spot list (the movement-flow spec, f79c9ecd).
    expect(model.spots.map((spot) => spot.spot)).toEqual(['pool', 'beach', 'point', 'reef', 'canyon', 'padang']);
    expect(model.spots[2].bests.map((best) => best.value)).toEqual(['139 ft', '18 mph', '12.4 s']);
    expect(model.spots[0].bests.map((best) => best.value)).toEqual(['—', '—', '—']);
    expect(model.empty).toBe(true);
  });

  it('marks rides surfed online (N1)', () => {
    const model = logbookModel(log([ride({ online: true }), ride({})]), 'metric', now);
    expect(model.recent[0].title).toContain('Online');
    expect(model.recent[1].title).not.toContain('Online');
  });

  it('lists recent rides with when they happened', () => {
    const model = logbookModel(log([
      ride({ at: now - 30_000 }),
      ride({ at: now - 5 * 60_000, outcome: 'complete', spot: 'reef' }),
      ride({ at: now - 3 * 3_600_000 }),
    ]), 'metric', now);
    expect(model.empty).toBe(false);
    expect(model.recent[0]).toEqual({
      title: 'Point · Wipeout',
      detail: '42 m · 30 km/h · 12.4 s · just now',
      ending: 'Lost balance · stood 12.4 s · what let go: not recorded for this ride',
    });
    expect(model.recent[1].title).toBe('Reef · Ride complete');
    expect(model.recent[1].detail.endsWith('5 min ago')).toBe(true);
    expect(model.recent[2].detail.endsWith('3 h ago')).toBe(true);
  });

  it('puts what ended each ride on its own line', () => {
    const model = logbookModel(log([ride({ seconds: 0.82, fall: { limit: 'margin', across: true, speed: 7.4, steer: -1 } })]), 'metric', now);
    expect(model.recent[0].ending).toBe('Lost balance · stood 0.8 s · Weight ran out, off the side · turn asked 100 % right');
  });
});

/**
 * **What ended the ride, the line the owner rides for.** Every claim here is a number the physics recorded at the
 * separation; where one was not recorded the line says so instead of standing a zero in for it.
 */
describe('endingLine', () => {
  const fall = { limit: 'margin' as const, across: true, speed: 7.4, steer: -1 };

  it('names the cause, how long the rider stood, which limit ran out and the turn being asked for', () => {
    expect(endingLine(ride({ seconds: 0.82, fall })))
      .toBe('Lost balance · stood 0.8 s · Weight ran out, off the side · turn asked 100 % right');
    expect(endingLine(ride({ reason: 'ride.reason.footSlip', seconds: 2.5, fall: { limit: 'grip', across: false, speed: 6, steer: 0.4 } })))
      .toBe('Feet slipped · stood 2.5 s · Grip ran out, along the board · turn asked 40 % left');
    expect(endingLine(ride({ seconds: 1.4, fall: { limit: 'knee', across: false, speed: 9, steer: 0 } })))
      .toBe('Lost balance · stood 1.4 s · Knees ran out, along the board · no turn asked');
  });

  // The default rider's reserve is one filtered minimum of the feet's two headrooms and their grip; the three are
  // never kept apart in the physics, so the line must not pretend to know which went.
  it('says the reserve hit its minimum when the three limits are not kept apart', () => {
    expect(endingLine(ride({ seconds: 0.9, fall: { limit: 'posture', across: false, speed: 5.5, steer: -0.5 } })))
      .toBe('Lost balance · stood 0.9 s · balance reserve ran out — which of weight, grip and knees is not recorded · turn asked 50 % right');
  });

  it('says a fall was not recorded rather than showing a zero', () => {
    expect(endingLine(ride({ seconds: 1.1 }))).toBe('Lost balance · stood 1.1 s · what let go: not recorded for this ride');
  });

  it('claims nothing let go when the ride ended with the rider still up', () => {
    expect(endingLine(ride({ outcome: 'ended', reason: 'ride.reason.retry' }))).toBe('Paddled back out');
    expect(endingLine(ride({ outcome: 'complete', reason: 'ride.reason.kickedOut' }))).toBe('Kicked out');
  });

  it('reads a stick barely off centre as what it is, not as a round zero', () => {
    expect(endingLine(ride({ fall: { ...fall, steer: 0.004 } }))).toContain('turn asked <1 % left');
  });
});
