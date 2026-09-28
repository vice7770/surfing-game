import { t } from '../ui/strings';
import { describeSurf, type SurfWords } from '../ui/surfHeight';
import type { SpotName } from '../wave/Bathymetry';
import { PRACTICE_SURF, forecastSurf, type SurfForecast } from '../wave/surfForecast';
import { DEFAULT_PHYSICAL_SETTINGS, type PhysicalSettings } from './PhysicalMode';
import { solverStage } from '../wave/SurfZoneSimulation';

/** The Surf screen's few choices (plan P8), turned into the Wave Lab's physical settings. */
export const SURF_SPOTS: readonly SpotName[] = ['beach', 'point', 'reef', 'canyon'];
/**
 * Where a new player paddles out: the Canyon, whose bed gathers the swell so its
 * waves peel (median 58°) and catch best. The Beach, Point and Reef mostly close
 * out (median 12–15°): their swell refracts parallel to the contours before it
 * breaks (the wave-and-turns findings).
 */
export const DEFAULT_SPOT: SpotName = 'canyon';

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

/** A swell choice: buoy values, and a direction for spots whose swell comes from one side. */
export interface SwellChoice {
  significantHeight: number;
  peakPeriod: number;
  spread: number;
  directionDegrees?: number;
}

/**
 * The Reef's own swells (the Teahupo'o Reef spec, decision 4): long-period groundswells
 * (Teahupo'o's are 2–5 m at 14–20 s, Shand 2024) from the peak's side, for faces of
 * 2–3 / 3–4 / 5–6 m. Provisional until the size report calibrates them.
 */
export const REEF_SWELLS: Record<'small' | 'medium' | 'big', SwellChoice> = {
  small: { significantHeight: 1.3, peakPeriod: 15, spread: 0.2, directionDegrees: 20 },
  medium: { significantHeight: 1.9, peakPeriod: 16, spread: 0.2, directionDegrees: 20 },
  big: { significantHeight: 3, peakPeriod: 17, spread: 0.15, directionDegrees: 20 },
};

/** A spot's swell for a Surf screen choice: the Reef's own, or the shared buoy values. */
export function swellChoice(spot: SpotName, swell: Exclude<SwellSize, 'practice'>): SwellChoice {
  return spot === 'reef' ? REEF_SWELLS[swell] : SWELLS[swell];
}

/** The surf a swell size makes at a spot (the wave-sizes spec): the practice groundswell as measured, the others forecast. */
export function surfForecastFor(spot: SpotName, swell: SwellSize): SurfForecast {
  if (swell === 'practice') return { ...PRACTICE_SURF[spot] };
  const { significantHeight, peakPeriod } = swellChoice(spot, swell);
  return forecastSurf(spot, significantHeight, peakPeriod);
}

/** The Surf screen's line for a choice: "Surf: 1.8–2.3 m · head high". */
export function surfForecastText(choice: { spot: SpotName; conditions: SurfConditions }, words: SurfWords): string {
  return t('surf.forecast', { surf: describeSurf(surfForecastFor(choice.spot, choice.conditions.swell), words) });
}

/** Tide, m, on the Wave Lab's −1…1 m slider. */
export const TIDES: Record<TideLevel, number> = { low: -0.6, mid: 0, high: 0.6 };
/** Local wind, m/s, positive onshore. */
export const WINDS: Record<WindKind, number> = { offshore: -5, calm: 0, onshore: 6 };
/**
 * The sun for each time of day: height 0–1 and direction, degrees, as on the
 * Wave Lab's sliders. Heights match the photographed skies' measured suns
 * (G7: 2.1°, 47.9° and 6.1° over the slider's 0–60°), so each time snaps to its
 * own photo. Low suns stand to the side of the seaward cameras: looking into a
 * photographed sunset's haze washes the frame out.
 */
export const TIMES: Record<TimeOfDay, { sunHeight: number; sunDirection: number }> = {
  dawn: { sunHeight: 0.035, sunDirection: -110 },
  midday: { sunHeight: 0.8, sunDirection: -15 },
  sunset: { sunHeight: 0.1, sunDirection: 110 },
};
/** The light behind the main menu. */
export const BACKDROP_TIME: TimeOfDay = 'sunset';

type WaterTier = { stage: 1 | 2; compute: 'auto' | 'cpu' };

export function physicalSettingsFor(spot: SpotName, conditions: SurfConditions, water: WaterTier): PhysicalSettings {
  const swell = conditions.swell === 'practice' ? undefined : swellChoice(spot, conditions.swell);
  return {
    ...DEFAULT_PHYSICAL_SETTINGS,
    spot,
    ...raisedWater(spot, water),
    source: swell ? 'buoy' : 'practice',
    ...(swell ? { significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, spread: swell.spread } : {}),
    ...(swell?.directionDegrees !== undefined ? { directionDegrees: swell.directionDegrees } : {}),
    tide: TIDES[conditions.tide],
    windSpeed: WINDS[conditions.wind],
  };
}

/**
 * The water tier for a spot: a spot that needs stage 2 raises the tier's stage, and then
 * asks for the GPU (the Fast tier steps stage 1 on the CPU only because stage 1 has none).
 */
function raisedWater(spot: SpotName, water: WaterTier): WaterTier {
  const stage = solverStage(spot, water.stage);
  return { stage, compute: stage !== water.stage ? 'auto' : water.compute };
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
