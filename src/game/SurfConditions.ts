import type { SpotName } from '../wave/Bathymetry';
import { DEFAULT_PHYSICAL_SETTINGS, type PhysicalSettings } from './PhysicalMode';

/**
 * The Surf screen's few choices (plan P8), turned into the Wave Lab's physical
 * settings. The Canyon returns to this list once its catch cue works (ROADMAP P8).
 */
export const SURF_SPOTS: readonly SpotName[] = ['beach', 'point', 'reef'];

export type SwellSize = 'practice' | 'small' | 'medium' | 'big';
export type TideLevel = 'low' | 'mid' | 'high';
export type WindKind = 'offshore' | 'calm' | 'onshore';
export type TimeOfDay = 'dawn' | 'midday' | 'sunset';

export interface SurfConditions {
  swell: SwellSize;
  tide: TideLevel;
  wind: WindKind;
  time: TimeOfDay;
}

export const DEFAULT_CONDITIONS: SurfConditions = { swell: 'practice', tide: 'mid', wind: 'calm', time: 'midday' };

/**
 * Buoy values for the swell sizes, on the Wave Lab's sliders (spread 0 is a clean
 * groundswell). Initial choices, tuned by riding each spot: only this table changes.
 */
export const SWELLS = {
  small: { significantHeight: 0.9, peakPeriod: 9, spread: 0.3 },
  medium: { significantHeight: 1.4, peakPeriod: 11, spread: 0.3 },
  big: { significantHeight: 2.4, peakPeriod: 14, spread: 0.2 },
} as const;

/** Tide, m, on the Wave Lab's −1…1 m slider. */
export const TIDES: Record<TideLevel, number> = { low: -0.6, mid: 0, high: 0.6 };
/** Local wind, m/s, positive onshore. */
export const WINDS: Record<WindKind, number> = { offshore: -5, calm: 0, onshore: 6 };
/** The sun for each time of day: height 0–1 and direction, degrees, as on the Wave Lab's sliders. */
export const TIMES: Record<TimeOfDay, { sunHeight: number; sunDirection: number }> = {
  dawn: { sunHeight: 0.1, sunDirection: -50 },
  midday: { sunHeight: 0.75, sunDirection: -15 },
  sunset: { sunHeight: 0.08, sunDirection: 45 },
};
/** The light behind the main menu. */
export const BACKDROP_TIME: TimeOfDay = 'sunset';

type WaterTier = { stage: 1 | 2; compute: 'auto' | 'cpu' };

export function physicalSettingsFor(spot: SpotName, conditions: SurfConditions, water: WaterTier): PhysicalSettings {
  const swell = conditions.swell === 'practice' ? undefined : SWELLS[conditions.swell];
  return {
    ...DEFAULT_PHYSICAL_SETTINGS,
    spot,
    stage: water.stage,
    compute: water.compute,
    source: swell ? 'buoy' : 'practice',
    ...(swell ? { significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, spread: swell.spread } : {}),
    tide: TIDES[conditions.tide],
    windSpeed: WINDS[conditions.wind],
  };
}

/** The menu's waves: the practice groundswell at mid tide in calm air. */
export function backdropSettings(spot: SpotName, water: WaterTier): PhysicalSettings {
  return physicalSettingsFor(spot, { swell: 'practice', tide: 'mid', wind: 'calm', time: BACKDROP_TIME }, water);
}

/** A spot for the menu's waves, never the one it showed last. */
export function nextBackdropSpot(previous: SpotName | undefined, random: () => number = Math.random): SpotName {
  const choices = SURF_SPOTS.filter((spot) => spot !== previous);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
