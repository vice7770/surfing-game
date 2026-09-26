import { describe, expect, it } from 'vitest';
import { DEFAULT_CONDITIONS } from '../game/SurfConditions';
import { surfModel } from './SurfScreen';

describe('surfModel', () => {
  it('offers Beach, Point, Reef and Canyon, marking the chosen spot', () => {
    const model = surfModel({ spot: 'point', conditions: DEFAULT_CONDITIONS });
    expect(model.spots.map((spot) => spot.id)).toEqual(['beach', 'point', 'reef', 'canyon']);
    expect(model.spots.filter((spot) => spot.selected).map((spot) => spot.id)).toEqual(['point']);
  });

  it('lists swell, tide, wind and time of day, each with the chosen option marked', () => {
    const model = surfModel({ spot: 'beach', conditions: { swell: 'big', tide: 'low', wind: 'offshore', time: 'sunset' } });
    expect(model.rows.map((row) => row.id)).toEqual(['swell', 'tide', 'wind', 'time']);
    expect(model.rows.map((row) => row.options.find((option) => option.selected)?.value)).toEqual(['big', 'low', 'offshore', 'sunset']);
    expect(model.rows[0].options.map((option) => option.value)).toEqual(['practice', 'small', 'medium', 'big']);
  });
});
