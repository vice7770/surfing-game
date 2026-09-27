import { describe, expect, it } from 'vitest';
import { defaultLabSettings } from '../game/waveLab/labSettings';
import { forecastSurf } from '../wave/surfForecast';
import { labSliders, practiceNote, spreadName, stormArrives, surfForecastNote, windWords } from './labPanelModel';
import { formatSurfRange } from './surfHeight';

describe('lab panel model', () => {
  it('lets the Height slider reach 4 m, and 3 m at the Canyon (wave sizes)', () => {
    const height = (spot: 'point' | 'canyon') => labSliders({ ...defaultLabSettings().physical, source: 'buoy', spot }, 'metric')
      .find((slider) => slider.key === 'significantHeight')!.max;
    expect(height('point')).toBe(4);
    expect(height('canyon')).toBe(3);
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
    expect(shown.significantHeight).toBe('1.4 m');
    expect(shown.tide).toBe('-0.5 m');
    expect(shown.windSpeed).toBe('Calm');
  });
});
