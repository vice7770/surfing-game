import { describe, expect, it } from 'vitest';
import { TANK_SWELL_LIMITS } from './PhysicalMode';
import skyManifest from '../../public/assets/skies/skies.json';
import { nearestSky, sunElevationFromSlider, type SkyEntry } from '../scene/PhotoSky';
import {
  DEFAULT_CONDITIONS, DEFAULT_SPOT, PADANG_SWELLS, PADANG_TIDES, PADANG_WINDS, REEF_SWELLS, SURF_SPOTS, SWELLS, TIDES, TIMES, WINDS, backdropSettings,
  nextBackdropSpot, physicalSettingsFor, surfForecastFor, surfForecastText, swellChoice, tideFor, windFor,
} from './SurfConditions';
import { PRACTICE_SURF, forecastSurf } from '../wave/surfForecast';
import { surfName as describeName } from '../ui/surfHeight';

const water = { stage: 2 as const, compute: 'auto' as const };

describe('surf conditions', () => {
  it('practises on the practice groundswell', () => {
    expect(physicalSettingsFor('point', DEFAULT_CONDITIONS, water)).toMatchObject({ spot: 'point', source: 'practice', tide: 0, windSpeed: 0 });
  });

  it('turns a big swell at high tide with onshore wind into buoy values, on the given water tier', () => {
    const settings = physicalSettingsFor('reef', { swell: 'big', tide: 'high', wind: 'onshore', time: 'dawn' }, { stage: 1, compute: 'cpu' });
    expect(settings).toMatchObject({
      spot: 'reef', source: 'buoy', significantHeight: REEF_SWELLS.big.significantHeight, peakPeriod: REEF_SWELLS.big.peakPeriod,
      directionDegrees: 20, tide: 0.6, windSpeed: 6, stage: 2, compute: 'auto',
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

  it('gives Padang Padang its own long-period swells, tides and winds', () => {
    const settings = physicalSettingsFor('padang', { swell: 'medium', tide: 'low', wind: 'offshore', time: 'midday' }, water);
    expect(settings).toMatchObject({
      source: 'buoy', significantHeight: PADANG_SWELLS.medium.significantHeight, peakPeriod: PADANG_SWELLS.medium.peakPeriod,
      directionDegrees: PADANG_SWELLS.medium.directionDegrees, tide: PADANG_TIDES.low, windSpeed: PADANG_WINDS.offshore,
    });
    for (const swell of Object.values(PADANG_SWELLS)) {
      expect(swell.significantHeight).toBeLessThanOrEqual(TANK_SWELL_LIMITS.height.max);
      expect(swell.peakPeriod).toBeGreaterThanOrEqual(16);
      expect(swell.peakPeriod).toBeLessThanOrEqual(TANK_SWELL_LIMITS.period.max);
    }
    // Bali's range (the Benoa gauge): lower and higher than the shared tides, within the Wave Lab's −1…1 m slider.
    expect(PADANG_TIDES.low).toBeLessThan(TIDES.low);
    expect(PADANG_TIDES.high).toBeGreaterThan(TIDES.high);
    for (const tide of Object.values(PADANG_TIDES)) expect(Math.abs(tide)).toBeLessThanOrEqual(1);
    for (const wind of Object.values(PADANG_WINDS)) expect(Math.abs(wind)).toBeLessThanOrEqual(12);
    expect(PADANG_WINDS.offshore).toBeLessThan(0);
    expect(PADANG_WINDS.onshore).toBeGreaterThan(0);
  });

  it('keeps every other spot on the shared tides and winds', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      for (const level of ['low', 'mid', 'high'] as const) expect(tideFor(spot, level)).toBe(TIDES[level]);
      for (const kind of ['offshore', 'calm', 'onshore'] as const) expect(windFor(spot, kind)).toBe(WINDS[kind]);
    }
  });

  it('keeps the other spots on the water tier’s stage', () => {
    expect(physicalSettingsFor('point', DEFAULT_CONDITIONS, { stage: 1, compute: 'cpu' })).toMatchObject({ stage: 1, compute: 'cpu' });
  });

  // The Fast tier steps stage 1 on the CPU only because stage 1 has no GPU path; raised to stage 2, the Reef asks for the GPU.
  it('lets the Reef ask for the GPU when it raises the Fast tier’s stage', () => {
    expect(physicalSettingsFor('reef', DEFAULT_CONDITIONS, { stage: 1, compute: 'cpu' })).toMatchObject({ stage: 2, compute: 'auto' });
    expect(physicalSettingsFor('reef', DEFAULT_CONDITIONS, { stage: 2, compute: 'cpu' })).toMatchObject({ stage: 2, compute: 'cpu' });
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
  it('forecasts each swell size\'s surf at each spot, the practice groundswell as measured (wave sizes)', () => {
    for (const spot of SURF_SPOTS) {
      expect(surfForecastFor(spot, 'practice')).toEqual(PRACTICE_SURF[spot]);
      const big = swellChoice(spot, 'big');
      expect(surfForecastFor(spot, 'big')).toEqual(forecastSurf(spot, big.significantHeight, big.peakPeriod));
      expect(surfForecastFor(spot, 'big').typical).toBeGreaterThan(surfForecastFor(spot, 'small').typical);
    }
  });

  it('says what surf the Surf screen\'s choice will make, in the player\'s words (wave sizes)', () => {
    const words = { units: 'metric' as const, scale: 'face' as const, surferHeight: 1.75 };
    const surf = forecastSurf('point', SWELLS.big.significantHeight, SWELLS.big.peakPeriod);
    expect(surfForecastText({ spot: 'point', conditions: { ...DEFAULT_CONDITIONS, swell: 'big' } }, words))
      .toBe(`Surf: ${surf.typical.toFixed(1)}–${surf.sets.toFixed(1)} m · ${describeName(surf.typical)}`);
  });

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
