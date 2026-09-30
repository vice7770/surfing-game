import { describe, expect, it } from 'vitest';
import { DEFAULT_CONDITIONS } from '../game/SurfConditions';
import { surfModel } from './SurfScreen';

describe('surfModel', () => {
  it('offers the Wave Pool first, then Beach, Point, Reef, Canyon and Padang Padang, marking the chosen spot', () => {
    const model = surfModel({ spot: 'point', conditions: DEFAULT_CONDITIONS });
    expect(model.spots.map((spot) => spot.id)).toEqual(['pool', 'beach', 'point', 'reef', 'canyon', 'padang']);
    expect(model.spots.filter((spot) => spot.selected).map((spot) => spot.id)).toEqual(['point']);
  });

  it('lists swell, tide, wind and time of day, each with the chosen option marked', () => {
    const model = surfModel({ spot: 'beach', conditions: { swell: 'big', tide: 'low', wind: 'offshore', time: 'sunset' } });
    expect(model.rows.map((row) => row.id)).toEqual(['swell', 'tide', 'wind', 'time']);
    expect(model.rows.map((row) => row.options.find((option) => option.selected)?.value)).toEqual(['big', 'low', 'offshore', 'sunset']);
    expect(model.rows[0].options.map((option) => option.value)).toEqual(['practice', 'small', 'medium', 'big']);
  });

  // The movement-flow spec: the pool's three sizes in place of the swell, no tide or wind; Practice rides Medium.
  it('gives the Wave Pool its sizes and time of day only', () => {
    const model = surfModel({ spot: 'pool', conditions: DEFAULT_CONDITIONS });
    expect(model.rows.map((row) => row.id)).toEqual(['swell', 'time']);
    expect(model.rows[0].label).toBe('cond.size');
    expect(model.rows[0].options.map((option) => option.value)).toEqual(['small', 'medium', 'big']);
    expect(model.rows[0].options.find((option) => option.selected)?.value).toBe('medium');
  });
});
