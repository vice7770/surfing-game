import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import type { OutfitId } from '../scene/character/outfits';

/** The committed surfers (`public/assets/surfers/surfers.json`, G7): two women and two men. */
export type SurferBody = 'surfer1' | 'surfer2' | 'surfer3' | 'surfer4';
export type SurferSex = 'female' | 'male';
export const SURFER_SEXES: readonly SurferSex[] = ['female', 'male'];
export const SURFER_BODIES: readonly { id: SurferBody; sex: SurferSex }[] = [
  { id: 'surfer1', sex: 'female' },
  { id: 'surfer2', sex: 'female' },
  { id: 'surfer3', sex: 'male' },
  { id: 'surfer4', sex: 'male' },
];

const bodiesOf = (sex: SurferSex) => SURFER_BODIES.filter((body) => body.sex === sex).map((body) => body.id);

export function sexOf(body: SurferBody): SurferSex {
  return SURFER_BODIES.find((candidate) => candidate.id === body)?.sex ?? 'female';
}

/** The body's look: its place, from 1, among the bodies of its sex. */
export function lookOf(body: SurferBody): number {
  return bodiesOf(sexOf(body)).indexOf(body) + 1;
}

/** The looks a sex offers, from 1. */
export function looksFor(sex: SurferSex): number[] {
  return bodiesOf(sex).map((_, i) => i + 1);
}

/** The body of this sex with this look; a look the sex does not have falls back to its first. */
export function surferBody(sex: SurferSex, look: number): SurferBody {
  const bodies = bodiesOf(sex);
  return bodies[look - 1] ?? bodies[0];
}

/** What the player wears: a full suit, a spring suit, or a rash vest over a bikini or boardshorts (by the body). */
export type OutfitChoice = 'fullsuit' | 'springsuit' | 'vest';
export const OUTFIT_CHOICES: readonly OutfitChoice[] = ['fullsuit', 'springsuit', 'vest'];

/** The suit's accent colour (a rash vest takes it whole); teal is the surfer's own default. */
export const SUIT_COLORS = {
  teal: '#1f6f78',
  coral: '#de7860',
  sand: '#d8b46a',
  navy: '#233a5e',
  lime: '#8fb339',
  graphite: '#3a3f45',
} as const;
export type SuitColor = keyof typeof SUIT_COLORS;

/** The player's surfer (G7 Part B), kept with the settings. */
export interface SurferSettings {
  body: SurferBody;
  outfit: OutfitChoice;
  color: SuitColor;
  /** A `BOARD_DESIGNS` id. */
  board: string;
}

export const DEFAULT_SURFER: SurferSettings = { body: 'surfer1', outfit: 'fullsuit', color: 'teal', board: BOARD_DESIGNS[0].id };

/** The outfit the body wears: the vest comes with a bikini on the women and boardshorts on the men. */
export function outfitFor(choice: SurferSettings): OutfitId {
  if (choice.outfit !== 'vest') return choice.outfit;
  return sexOf(choice.body) === 'male' ? 'vestShorts' : 'vestBikini';
}

/** A stored choice checked field by field: anything unknown (an older build's body or design) falls back to its default. */
export function sanitizeSurfer(raw: unknown, defaults: SurferSettings): SurferSettings {
  const value = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const pick = <T>(field: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(field as T) ? field as T : fallback);
  return {
    body: pick(value.body, SURFER_BODIES.map((body) => body.id), defaults.body),
    outfit: pick(value.outfit, OUTFIT_CHOICES, defaults.outfit),
    color: pick(value.color, Object.keys(SUIT_COLORS) as SuitColor[], defaults.color),
    board: pick(value.board, BOARD_DESIGNS.map((design) => design.id), defaults.board),
  };
}
