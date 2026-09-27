import { describe, expect, it } from 'vitest';
import { defaultLabSettings } from '../game/waveLab/labSettings';
import { forecastSurf } from '../wave/surfForecast';
import { labSliders, practiceNote, spreadName, stormArrives, windWords } from './labPanelModel';
import { formatSurfRange } from './surfHeight';

describe('lab panel model', () => {
  it('shows the surf a buoy height will make beside the Height slider (wave sizes)', () => {
    const physical = { ...defaultLabSettings().physical, source: 'buoy' as const, spot: 'reef' as const, significantHeight: 3, peakPeriod: 14 };
    const height = labSliders(physical, 'metric').find((slider) => slider.key === 'significantHeight')!;
    const surf = forecastSurf('reef', 3, 14);
    expect(height.text).toBe(`3.0 m · surf ${formatSurfRange(surf.typical, surf.sets, 'metric', 'face')}`);
    expect(labSliders(physical, 'imperial', 'hawaiian').find((slider) => slider.key === 'significantHeight')!.text).toContain('Hawaiian');
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
    expect(practiceNote('metric')).toBe('A steady 1.4 m groundswell every 12 s, from 10°.');
  });

  it('shows only the sliders of the chosen swell source, with the direction fixed for Practice', () => {
    const ids = (source: 'buoy' | 'storm' | 'practice') =>
      labSliders({ ...defaultLabSettings().physical, source }, 'metric').filter((slider) => slider.group === 'swell').map((slider) => slider.key);
    expect(ids('buoy')).toEqual(['significantHeight', 'peakPeriod', 'spread', 'directionDegrees']);
    expect(ids('storm')).toEqual(['stormWindSpeed', 'stormFetchKm', 'stormDurationHours', 'stormDistanceKm', 'directionDegrees']);
    expect(ids('practice')).toEqual(['directionDegrees']);
    const direction = labSliders({ ...defaultLabSettings().physical, source: 'practice' }, 'metric').find((slider) => slider.key === 'directionDegrees');
    expect(direction?.disabled).toBe(true);
  });

  it('formats every slider’s value for its output', () => {
    const sliders = labSliders({ ...defaultLabSettings().physical, source: 'buoy', significantHeight: 1.4, tide: -0.5 }, 'metric');
    const shown = Object.fromEntries(sliders.map((slider) => [slider.key, slider.text]));
    const surf = forecastSurf(defaultLabSettings().physical.spot, 1.4, defaultLabSettings().physical.peakPeriod);
    expect(shown.significantHeight).toBe(`1.4 m · surf ${formatSurfRange(surf.typical, surf.sets, 'metric', 'face')}`);
    expect(shown.tide).toBe('-0.5 m');
    expect(shown.windSpeed).toBe('Calm');
  });
});
