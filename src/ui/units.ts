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

export function formatDistance(metres: number, units: Units): string {
  return units === 'metric' ? `${Math.round(metres)} m` : `${Math.round(metres * FEET_PER_METRE)} ft`;
}

export function formatDuration(seconds: number): string {
  return `${seconds.toFixed(1)} s`;
}
