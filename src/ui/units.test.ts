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

  // The Logbook now logs a fall of a fraction of a second (the owner's ruling of 2026-11-19): neither column may
  // round a measured number down to a bare zero, which would read as missing data.
  it('never rounds a real distance or time down to zero', () => {
    expect(formatDistance(0.3, 'metric')).toBe('<1 m');
    expect(formatDistance(0.1, 'imperial')).toBe('<1 ft');
    expect(formatDistance(0, 'metric')).toBe('0 m');
    expect(formatDistance(0.6, 'metric')).toBe('1 m');
    expect(formatDuration(0.42)).toBe('0.4 s');
    expect(formatDuration(1 / 60)).toBe('<0.1 s');
    expect(formatDuration(0)).toBe('0.0 s');
  });
});
