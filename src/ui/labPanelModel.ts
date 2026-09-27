import { PRACTICE_SWELL, swellFor, swellHeightLimit, type PhysicalSettings } from '../game/PhysicalMode';
import { forecastSurf } from '../wave/surfForecast';
import { t } from './strings';
import { formatSurfRange, type SurfScale } from './surfHeight';
import { formatHeight, formatSpeed, type Units } from './units';

/** The sea settings the lab's panel shows as sliders (spec L1). */
export type SliderKey = 'significantHeight' | 'peakPeriod' | 'spread' | 'stormWindSpeed' | 'stormFetchKm' | 'stormDurationHours'
  | 'stormDistanceKm' | 'directionDegrees' | 'tide' | 'windSpeed';

export interface LabSlider {
  key: SliderKey;
  group: 'swell' | 'conditions';
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  /** The value as the output beside the slider shows it. */
  text: string;
  disabled?: boolean;
}

/** Local wind in surfers' words: calm, or its speed and whether it blows offshore or onshore. */
export function windWords(windSpeed: number, units: Units): string {
  if (windSpeed === 0) return t('lab.wind.calm');
  return t(windSpeed < 0 ? 'lab.wind.offshore' : 'lab.wind.onshore', { speed: formatSpeed(Math.abs(windSpeed), units) });
}

/** The spread slider's name: a clean groundswell to a messy windswell. */
export function spreadName(spread: number): string {
  return t(spread < 0.34 ? 'lab.spread.groundswell' : spread < 0.67 ? 'lab.spread.mixed' : 'lab.spread.windswell');
}

/** What a storm's swell becomes at the spot. */
export function stormArrives(physical: PhysicalSettings, units: Units): string {
  const swell = swellFor(physical);
  return t('lab.stormArrives', { height: formatHeight(swell.significantHeight, units), period: Math.round(swell.peakPeriod) });
}

/** The practice groundswell, in words. */
export function practiceNote(units: Units): string {
  return t('lab.practiceNote', {
    height: formatHeight(PRACTICE_SWELL.significantHeight, units), period: PRACTICE_SWELL.peakPeriod, direction: PRACTICE_SWELL.directionDegrees ?? 0,
  });
}

/** The buoy height with the surf it will make at the spot (the wave-sizes spec): "3.0 m · surf 4.3–5.4 m". */
function heightText(physical: PhysicalSettings, units: Units, scale: SurfScale): string {
  const { typical, sets } = forecastSurf(physical.spot, physical.significantHeight, physical.peakPeriod);
  return t('lab.surfForecast', { height: formatHeight(physical.significantHeight, units), surf: formatSurfRange(typical, sets, units, scale) });
}

/** The sliders for these settings: the chosen swell source's own, the direction (fixed by Practice), tide and wind. */
export function labSliders(physical: PhysicalSettings, units: Units, scale: SurfScale = 'face'): LabSlider[] {
  const swell = (key: SliderKey, label: string, min: number, max: number, step: number, text: string): LabSlider =>
    ({ key, group: 'swell', label, min, max, step, value: physical[key], text });
  const sliders: LabSlider[] = [];
  if (physical.source === 'buoy') {
    sliders.push(
      swell('significantHeight', t('lab.height'), 0.3, swellHeightLimit(physical.spot), 0.1, heightText(physical, units, scale)),
      swell('peakPeriod', t('lab.period'), 6, 18, 0.5, `${physical.peakPeriod.toFixed(1)} s`),
      swell('spread', t('lab.spread'), 0, 1, 0.05, spreadName(physical.spread)),
    );
  } else if (physical.source === 'storm') {
    sliders.push(
      swell('stormWindSpeed', t('lab.stormWind'), 8, 30, 1, formatSpeed(physical.stormWindSpeed, units)),
      swell('stormFetchKm', t('lab.fetch'), 50, 2000, 50, `${physical.stormFetchKm} km`),
      swell('stormDurationHours', t('lab.duration'), 3, 96, 3, `${physical.stormDurationHours} h`),
      swell('stormDistanceKm', t('lab.distance'), 0, 10000, 100, `${physical.stormDistanceKm} km`),
    );
  }
  sliders.push({ ...swell('directionDegrees', t('lab.direction'), -40, 40, 5, `${physical.directionDegrees}°`), disabled: physical.source === 'practice' });
  sliders.push(
    { key: 'tide', group: 'conditions', label: t('lab.tide'), min: -1, max: 1, step: 0.1, value: physical.tide, text: formatHeight(physical.tide, units) },
    { key: 'windSpeed', group: 'conditions', label: t('lab.wind'), min: -12, max: 12, step: 1, value: physical.windSpeed, text: windWords(physical.windSpeed, units) },
  );
  return sliders;
}
