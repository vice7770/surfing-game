import { describe, expect, it } from 'vitest';
import { TANK_SWELL_LIMITS } from './PhysicalMode';
import {
  DEFAULT_CONDITIONS, SURF_SPOTS, SWELLS, TIDES, WINDS, backdropSettings, nextBackdropSpot, physicalSettingsFor,
} from './SurfConditions';

const water = { stage: 2 as const, compute: 'auto' as const };

describe('surf conditions', () => {
  it('practises on the practice groundswell', () => {
    expect(physicalSettingsFor('point', DEFAULT_CONDITIONS, water)).toMatchObject({ spot: 'point', source: 'practice', tide: 0, windSpeed: 0 });
  });

  it('turns a big swell at high tide with onshore wind into buoy values, on the given water tier', () => {
    const settings = physicalSettingsFor('reef', { swell: 'big', tide: 'high', wind: 'onshore', time: 'dawn' }, { stage: 1, compute: 'cpu' });
    expect(settings).toMatchObject({
      spot: 'reef', source: 'buoy', significantHeight: 2.4, peakPeriod: 14, tide: 0.6, windSpeed: 6, stage: 1, compute: 'cpu',
    });
  });

  it('keeps every choice within what the tank and the Wave Lab allow', () => {
    for (const swell of Object.values(SWELLS)) {
      expect(swell.significantHeight).toBeGreaterThanOrEqual(TANK_SWELL_LIMITS.height.min);
      expect(swell.significantHeight).toBeLessThanOrEqual(TANK_SWELL_LIMITS.height.max);
      expect(swell.peakPeriod).toBeGreaterThanOrEqual(TANK_SWELL_LIMITS.period.min);
      expect(swell.peakPeriod).toBeLessThanOrEqual(TANK_SWELL_LIMITS.period.max);
    }
    for (const tide of Object.values(TIDES)) expect(Math.abs(tide)).toBeLessThanOrEqual(1);
    for (const wind of Object.values(WINDS)) expect(Math.abs(wind)).toBeLessThanOrEqual(12);
  });

  it('offers all four spots, the Canyon included now that its catch cue works', () => {
    expect(SURF_SPOTS).toEqual(['beach', 'point', 'reef', 'canyon']);
  });

  it('shows the menu a different spot each time, on calm practice water', () => {
    expect(nextBackdropSpot('point', () => 0)).not.toBe('point');
    let previous = nextBackdropSpot(undefined);
    for (let i = 0; i < 100; i += 1) {
      const next = nextBackdropSpot(previous);
      expect(next).not.toBe(previous);
      expect(SURF_SPOTS).toContain(next);
      previous = next;
    }
    expect(backdropSettings('beach', water)).toMatchObject({ spot: 'beach', source: 'practice', windSpeed: 0 });
  });
});
