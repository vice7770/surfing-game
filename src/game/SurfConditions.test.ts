import { describe, expect, it } from 'vitest';
import { TANK_SWELL_LIMITS } from './PhysicalMode';
import skyManifest from '../../public/assets/skies/skies.json';
import { nearestSky, sunElevationFromSlider, type SkyEntry } from '../scene/PhotoSky';
import {
  DEFAULT_CONDITIONS, DEFAULT_SPOT, REEF_SWELLS, SURF_SPOTS, SWELLS, TIDES, TIMES, WINDS, backdropSettings, nextBackdropSpot, physicalSettingsFor,
} from './SurfConditions';

const water = { stage: 2 as const, compute: 'auto' as const };

describe('surf conditions', () => {
  it('practises on the practice groundswell', () => {
    expect(physicalSettingsFor('point', DEFAULT_CONDITIONS, water)).toMatchObject({ spot: 'point', source: 'practice', tide: 0, windSpeed: 0 });
  });

  it('turns a big swell at high tide with onshore wind into buoy values, on the given water tier', () => {
    const settings = physicalSettingsFor('reef', { swell: 'big', tide: 'high', wind: 'onshore', time: 'dawn' }, { stage: 1, compute: 'cpu' });
    expect(settings).toMatchObject({
      spot: 'reef', source: 'buoy', significantHeight: REEF_SWELLS.big.significantHeight, peakPeriod: REEF_SWELLS.big.peakPeriod,
      directionDegrees: 20, tide: 0.6, windSpeed: 6, stage: 2, compute: 'cpu',
    });
  });

  it('gives the Reef its own long-period swells from the peak’s side', () => {
    const settings = physicalSettingsFor('reef', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, water);
    expect(settings).toMatchObject({ source: 'buoy', significantHeight: REEF_SWELLS.medium.significantHeight, peakPeriod: REEF_SWELLS.medium.peakPeriod, directionDegrees: 20, stage: 2 });
    expect(physicalSettingsFor('point', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, water).significantHeight).toBe(SWELLS.medium.significantHeight);
    for (const swell of Object.values(REEF_SWELLS)) {
      expect(swell.significantHeight).toBeLessThanOrEqual(TANK_SWELL_LIMITS.height.max);
      expect(swell.peakPeriod).toBeGreaterThanOrEqual(14);
      expect(swell.peakPeriod).toBeLessThanOrEqual(TANK_SWELL_LIMITS.period.max);
    }
  });

  it('keeps the other spots on the water tier’s stage', () => {
    expect(physicalSettingsFor('point', DEFAULT_CONDITIONS, { stage: 1, compute: 'cpu' }).stage).toBe(1);
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

  // The Canyon's waves peel (median 58°) and catch best; the other spots mostly close out (median 12–15°).
  it('starts a new player at the Canyon', () => {
    expect(DEFAULT_SPOT).toBe('canyon');
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

  it('lights each time of day with its own photographed sky (G7)', () => {
    const skies = skyManifest.skies as unknown as SkyEntry[];
    for (const time of ['dawn', 'midday', 'sunset'] as const) {
      expect(nearestSky(skies, sunElevationFromSlider(TIMES[time].sunHeight)).timeOfDay, time).toBe(time);
    }
  });
});
