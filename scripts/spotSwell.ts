import { spreadingFor, type SwellInput } from '../src/game/PhysicalMode';
import { swellChoice } from '../src/game/SurfConditions';
import type { SpotName } from '../src/wave/Bathymetry';

/** `--swell small|medium|big`: a spot's own buoy swell for that Surf screen size (the Reef's and Padang Padang's are their own). */
export type SwellSizeOption = 'small' | 'medium' | 'big';

/** Read `--swell`, rejecting anything but a Surf screen size. */
export function swellSizeOption(value: string | undefined): SwellSizeOption | undefined {
  if (value === undefined) return undefined;
  if (value !== 'small' && value !== 'medium' && value !== 'big') throw new Error(`--swell takes small, medium or big, not ${value}`);
  return value;
}

/** The spot's buoy swell for a Surf screen size, as a report's sea. */
export function chosenSwell(spot: SpotName, size: SwellSizeOption): SwellInput {
  const { significantHeight, peakPeriod, spread, spreading, directionDegrees } = swellChoice(spot, size);
  return { significantHeight, peakPeriod, spreading: spreading ?? spreadingFor(spread), ...(directionDegrees !== undefined ? { directionDegrees } : {}) };
}
