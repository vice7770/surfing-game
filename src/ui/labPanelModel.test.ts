import { describe, expect, it } from 'vitest';
import { labHeightLimit, swellFor } from '../game/PhysicalMode';
import { SURF_SPOTS } from '../game/SurfConditions';
import { defaultLabSettings } from '../game/waveLab/labSettings';
import type { SpotName } from '../wave/Bathymetry';
import { forecastSurf } from '../wave/surfForecast';
import { labSliders, practiceNote, spreadName, stormArrives, surfForecastNote, windWords } from './labPanelModel';
import { formatSurfRange } from './surfHeight';

describe('lab panel model', () => {
  it('lets the Height slider reach each spot’s Big, and no further', () => {
    const height = (spot: SpotName) => labSliders({ ...defaultLabSettings().physical, source: 'buoy', spot }, 'metric')
      .find((slider) => slider.key === 'significantHeight')!.max;
    for (const spot of SURF_SPOTS) expect(height(spot)).toBe(labHeightLimit(spot));
    expect(height('point')).toBe(2.4);
    expect(height('canyon')).toBe(2.4);
    expect(height('reef')).toBe(3);
    expect(height('padang')).toBe(3.8);
  });

  it('shows a height above the spot’s limit as the lab runs it, in the slider and the forecast', () => {
    // The owner's Padang Padang sea, taken to the Canyon: the slider, the forecast and the run all say 2.4 m.
    const physical = { ...defaultLabSettings().physical, source: 'buoy' as const, spot: 'canyon' as const, significantHeight: 4, peakPeriod: 12 };
    const slider = labSliders(physical, 'metric').find((s) => s.key === 'significantHeight')!;
    expect(slider).toMatchObject({ value: 2.4, max: 2.4, text: '2.4 m' });
    expect(surfForecastNote(physical, 'metric', 'face')).toBe(surfForecastNote({ ...physical, significantHeight: 2.4 }, 'metric', 'face'));
    expect(swellFor(physical).significantHeight).toBe(2.4);
    const padang = { ...physical, spot: 'padang' as const };
    expect(labSliders(padang, 'metric').find((s) => s.key === 'significantHeight')).toMatchObject({ value: 3.8, text: '3.8 m' });
    expect(swellFor(padang).significantHeight).toBe(3.8);
  });

  it('names the Spread slider for the spread at the break', () => {
    expect(labSliders({ ...defaultLabSettings().physical, source: 'buoy' }, 'metric').find((s) => s.key === 'spread')?.label).toBe('Spread at the break');
  });

  it('says under the swell sliders what surf the buoy swell will make, following its height and period (wave sizes)', () => {
    const physical = { ...defaultLabSettings().physical, source: 'buoy' as const, spot: 'reef' as const, significantHeight: 3, peakPeriod: 14 };
    const surf = forecastSurf('reef', 3, 14);
    expect(surfForecastNote(physical, 'metric', 'face')).toBe(`Surf ${formatSurfRange(surf.typical, surf.sets, 'metric', 'face')} (forecast)`);
    expect(surfForecastNote({ ...physical, peakPeriod: 18 }, 'metric', 'face')).not.toBe(surfForecastNote(physical, 'metric', 'face'));
    expect(surfForecastNote(physical, 'imperial', 'hawaiian')).toContain('Hawaiian');
  });

  it('names the local wind the way surfers do', () => {
    expect(windWords(0, 'metric')).toBe('Calm');
    expect(windWords(-5, 'metric')).toBe('18 km/h offshore');
    expect(windWords(6, 'imperial')).toBe('13 mph onshore');
  });

  it('names the spread from groundswell to windswell', () => {
    expect(spreadName(0.1)).toBe('Groundswell');
    expect(spreadName(0.5)).toBe('Mixed');
    expect(spreadName(0.9)).toBe('Windswell');
  });

  it('says what a storm delivers at the spot, and what the practice swell is', () => {
    const storm = { ...defaultLabSettings().physical, source: 'storm' as const };
    expect(stormArrives(storm, 'metric')).toMatch(/^Arrives at the spot as \d+\.\d m, \d+ s$/);
    expect(practiceNote('metric', 'canyon')).toBe('A steady 1.4 m groundswell every 12 s, from 0°.');
    expect(practiceNote('metric', 'reef')).toBe('A steady 1.0 m groundswell every 14 s, from 0°.');
  });

  it('shows only the sliders of the chosen swell source, with the direction fixed at 0° for every source', () => {
    const ids = (source: 'buoy' | 'storm' | 'practice') =>
      labSliders({ ...defaultLabSettings().physical, source }, 'metric').filter((slider) => slider.group === 'swell').map((slider) => slider.key);
    expect(ids('buoy')).toEqual(['significantHeight', 'peakPeriod', 'spread', 'directionDegrees']);
    expect(ids('storm')).toEqual(['stormWindSpeed', 'stormFetchKm', 'stormDurationHours', 'stormDistanceKm', 'directionDegrees']);
    expect(ids('practice')).toEqual(['directionDegrees']);
    for (const source of ['buoy', 'storm', 'practice'] as const) {
      const direction = labSliders({ ...defaultLabSettings().physical, source, directionDegrees: 25 }, 'metric').find((slider) => slider.key === 'directionDegrees');
      expect(direction).toMatchObject({ value: 0, text: '0°', disabled: true });
    }
  });

  it('frees the direction for Buoy and Storm behind the dev flag ?labRawSea=1, never for Practice', () => {
    const direction = (source: 'buoy' | 'storm' | 'practice') => labSliders({ ...defaultLabSettings().physical, source, directionDegrees: 25 }, 'metric', true)
      .find((slider) => slider.key === 'directionDegrees');
    expect(direction('buoy')).toMatchObject({ value: 25, text: '25°', disabled: false });
    expect(direction('storm')).toMatchObject({ value: 25, text: '25°', disabled: false });
    expect(direction('practice')).toMatchObject({ value: 0, text: '0°', disabled: true });
  });

  it('shows the direction a spot’s Practice swell really comes from', () => {
    const direction = (spot: 'reef' | 'canyon') => labSliders({ ...defaultLabSettings().physical, source: 'practice', spot, directionDegrees: -30 }, 'metric')
      .find((slider) => slider.key === 'directionDegrees');
    expect(direction('reef')).toMatchObject({ value: 0, text: '0°' });
    expect(direction('canyon')).toMatchObject({ value: 0, text: '0°' });
  });

  it('formats every slider’s value for its output', () => {
    const sliders = labSliders({ ...defaultLabSettings().physical, source: 'buoy', significantHeight: 1.4, tide: -0.5 }, 'metric');
    const shown = Object.fromEntries(sliders.map((slider) => [slider.key, slider.text]));
    expect(shown.significantHeight).toBe('1.4 m');
    expect(shown.tide).toBe('-0.5 m');
    expect(shown.windSpeed).toBe('Calm');
  });
});
