import { describe, expect, it } from 'vitest';
import type { LoggedRide, SpotBests } from '../game/Logbook';
import { DEFAULT_CONDITIONS } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import { logbookModel } from './LogbookScreen';

const now = 1_700_000_000_000;
const ride = (overrides: Partial<LoggedRide>): LoggedRide => ({
  outcome: 'wipeout', reason: 'ride.reason.balance', distance: 42.4, topSpeed: 8.2, seconds: 12.44,
  spot: 'point', conditions: DEFAULT_CONDITIONS, seed: 1, at: now, ...overrides,
});
const log = (recent: LoggedRide[], bests: Partial<Record<SpotName, SpotBests>> = {}) => ({ recent, bests: (spot: SpotName) => bests[spot] ?? {} });

describe('logbookModel', () => {
  it('shows each spot\'s bests in the player\'s units, and a dash where there are none', () => {
    const model = logbookModel(log([], { point: { distance: 42.4, topSpeed: 8.2, seconds: 12.44 } }), 'imperial', now);
    expect(model.spots.map((spot) => spot.spot)).toEqual(['beach', 'point', 'reef']);
    expect(model.spots[1].bests.map((best) => best.value)).toEqual(['139 ft', '18 mph', '12.4 s']);
    expect(model.spots[0].bests.map((best) => best.value)).toEqual(['—', '—', '—']);
    expect(model.empty).toBe(true);
  });

  it('lists recent rides with when they happened', () => {
    const model = logbookModel(log([
      ride({ at: now - 30_000 }),
      ride({ at: now - 5 * 60_000, outcome: 'complete', spot: 'reef' }),
      ride({ at: now - 3 * 3_600_000 }),
    ]), 'metric', now);
    expect(model.empty).toBe(false);
    expect(model.recent[0]).toEqual({ title: 'Point · Wipeout', detail: '42 m · 30 km/h · 12.4 s · just now' });
    expect(model.recent[1].title).toBe('Reef · Ride complete');
    expect(model.recent[1].detail.endsWith('5 min ago')).toBe(true);
    expect(model.recent[2].detail.endsWith('3 h ago')).toBe(true);
  });
});
