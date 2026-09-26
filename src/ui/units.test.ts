import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration, formatSpeed, speedParts } from './units';

describe('units', () => {
  it('shows speed in km/h or mph', () => {
    expect(formatSpeed(10, 'metric')).toBe('36 km/h');
    expect(formatSpeed(10, 'imperial')).toBe('22 mph');
    expect(speedParts(0, 'metric')).toEqual({ value: '0', unit: 'km/h' });
  });

  it('shows distance in metres or feet, and time in seconds', () => {
    expect(formatDistance(42.4, 'metric')).toBe('42 m');
    expect(formatDistance(42.4, 'imperial')).toBe('139 ft');
    expect(formatDuration(12.44)).toBe('12.4 s');
  });
});
