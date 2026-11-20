import { describe, expect, it } from 'vitest';
import { rideReportsWanted } from './rideReports';

/**
 * The switch only. **A passing test here is not evidence the switch reached a session**: three switches in this
 * project parsed zero times in a real page while their fixture tests passed. The run itself is verified by driving
 * the page and reading `globalThis.breaklineRideReports`, which is what the branch's report cites.
 */
describe('rideReportsWanted', () => {
  it('is off unless the flag is present', () => {
    expect(rideReportsWanted('')).toBeUndefined();
    expect(rideReportsWanted('?record&spot=canyon')).toBeUndefined();
  });

  it('takes the count asked for', () => {
    expect(rideReportsWanted('?rideReports=5')).toBe(5);
    expect(rideReportsWanted('?spot=canyon&rideReports=30&canyonWaves=true')).toBe(30);
  });

  it('falls back to 20 on a bare flag or a value that is not a count', () => {
    expect(rideReportsWanted('?rideReports')).toBe(20);
    expect(rideReportsWanted('?rideReports=')).toBe(20);
    expect(rideReportsWanted('?rideReports=0')).toBe(20);
    expect(rideReportsWanted('?rideReports=-3')).toBe(20);
    expect(rideReportsWanted('?rideReports=2.5')).toBe(20);
    expect(rideReportsWanted('?rideReports=lots')).toBe(20);
  });
});
