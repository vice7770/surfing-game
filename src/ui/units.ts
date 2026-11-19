/** Display units for the player (plan P8); the physics and records stay in SI. */
export type Units = 'metric' | 'imperial';

const KMH_PER_MS = 3.6;
const MPH_PER_MS = 2.236936;
const FEET_PER_METRE = 3.28084;

/** A speed in m/s as a whole number of km/h or mph, split for a large readout. */
export function speedParts(metresPerSecond: number, units: Units): { value: string; unit: string } {
  const value = metresPerSecond * (units === 'metric' ? KMH_PER_MS : MPH_PER_MS);
  return { value: Math.round(value).toString(), unit: units === 'metric' ? 'km/h' : 'mph' };
}

export function formatSpeed(metresPerSecond: number, units: Units): string {
  const { value, unit } = speedParts(metresPerSecond, units);
  return `${value} ${unit}`;
}

/** A wave height in m or ft, to one decimal (the Wave Lab, spec L1). */
export function formatHeight(metres: number, units: Units): string {
  return units === 'metric' ? `${metres.toFixed(1)} m` : `${(metres * FEET_PER_METRE).toFixed(1)} ft`;
}

/**
 * A distance in m or ft, whole. A real distance that would round to zero reads `<1` instead: the Logbook now logs
 * falls of a fraction of a second (the owner's ruling of 2026-11-19), and `0 m` under a ride that did travel reads
 * as missing data rather than as a short one. A true zero still reads `0`.
 */
export function formatDistance(metres: number, units: Units): string {
  const unit = units === 'metric' ? 'm' : 'ft';
  const value = units === 'metric' ? metres : metres * FEET_PER_METRE;
  if (value > 0 && value < 0.5) return `<1 ${unit}`;
  return `${Math.round(value)} ${unit}`;
}

/**
 * A time in seconds, to a tenth. A positive time shorter than that reads `<0.1 s`: a stand that lasted one physics
 * step is now logged, and `0.0 s` would stand a zero in for a number that was measured.
 */
export function formatDuration(seconds: number): string {
  if (seconds > 0 && seconds < 0.05) return '<0.1 s';
  return `${seconds.toFixed(1)} s`;
}
