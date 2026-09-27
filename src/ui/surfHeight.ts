import type { SurfReading } from '../wave/SurfMeter';
import { t, type StringKey } from './strings';
import type { Units } from './units';

/** How the surf's height reads (the wave-sizes spec): faces in the player's units, or the Hawaiian scale. */
export type SurfScale = 'face' | 'hawaiian';

/** What the surf's words need: the units, the scale, and the height of the surfer the names compare to, m. */
export interface SurfWords {
  units: Units;
  scale: SurfScale;
  surferHeight: number;
}

const FEET_PER_METRE = 3.28084;
/** Who the names compare the surf to when no surfer is chosen, m. */
export const DEFAULT_SURFER_HEIGHT = 1.75;
/** The Hawaiian scale reads about half the face: trough-to-crest is twice it (Caldwell & Aucan 2007). */
export const HAWAIIAN_SHARE = 0.5;

/** The body-relative names, by the typical face over the surfer's height: each name holds below its bound. */
export const SURF_NAMES: readonly { below: number; key: StringKey }[] = [
  { below: 0.2, key: 'surf.name.ankle' },
  { below: 0.35, key: 'surf.name.knee' },
  { below: 0.5, key: 'surf.name.thigh' },
  { below: 0.65, key: 'surf.name.waist' },
  { below: 0.78, key: 'surf.name.chest' },
  { below: 0.9, key: 'surf.name.shoulder' },
  { below: 1.15, key: 'surf.name.head' },
  { below: 1.5, key: 'surf.name.overhead' },
  { below: 1.85, key: 'surf.name.wellOverhead' },
  { below: 2.5, key: 'surf.name.double' },
  { below: 3.5, key: 'surf.name.triple' },
  { below: Infinity, key: 'surf.name.bigger' },
];

/** The surf's name for a typical face, m, against the surfer's height, m. */
export function surfName(face: number, surferHeight = DEFAULT_SURFER_HEIGHT): string {
  const ratio = Math.max(0, face) / surferHeight;
  return t(SURF_NAMES.find((name) => ratio < name.below)!.key);
}

const whole = (value: number) => Math.max(0, Math.round(value));

/** A range of faces as surf reports give it: "2.1–2.7 m", "7–9 ft", or "5–6 ft Hawaiian". */
export function formatSurfRange(low: number, high: number, units: Units, scale: SurfScale): string {
  const from = Math.max(0, Math.min(low, high));
  const to = Math.max(0, low, high);
  if (scale === 'hawaiian') {
    return t('surf.hawaiian', { low: whole(from * FEET_PER_METRE * HAWAIIAN_SHARE), high: whole(to * FEET_PER_METRE * HAWAIIAN_SHARE) });
  }
  if (units === 'imperial') return `${whole(from * FEET_PER_METRE)}–${whole(to * FEET_PER_METRE)} ft`;
  return `${from.toFixed(1)}–${to.toFixed(1)} m`;
}

/** The surf in one line, its range and its name ("2.4–3.1 m · overhead"), or "measuring…". */
export function describeSurf(reading: Pick<SurfReading, 'typical' | 'sets'> | undefined, words: SurfWords): string {
  if (!reading) return t('surf.measuring');
  return `${formatSurfRange(reading.typical, reading.sets, words.units, words.scale)} · ${surfName(reading.typical, words.surferHeight)}`;
}
