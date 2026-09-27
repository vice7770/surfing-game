import {
  OUTFIT_CHOICES, SUIT_COLORS, SURFER_SEXES, lookOf, looksFor, outfitFor, sexOf, surferBody,
  type SuitColor, type SurferSettings, type SurferSex,
} from '../game/SurferChoice';
import type { TimeOfDay } from '../game/SurfConditions';
import { BOARD_DESIGNS } from '../scene/board/boardDesigns';
import { el } from './dom';
import type { StringKey } from './strings';
import { t } from './strings';

type RowId = 'sex' | 'look' | 'outfit' | 'color' | 'board';

export interface SurferModel {
  rows: { id: RowId; label: StringKey; options: { value: string; label: StringKey; selected: boolean; swatch?: string }[] }[];
}

/**
 * The Surfer card as data (G7 Part B): the sex, one of that sex's looks, the
 * outfit, the suit's colour and the board design, with the choice marked.
 * The sex and look rows are two views of the one stored body.
 */
export function surferModel(choice: SurferSettings): SurferModel {
  const sex = sexOf(choice.body);
  const row = (
    id: RowId, values: readonly string[], selected: string, label: (value: string) => StringKey, swatch?: (value: string) => string,
  ) => ({
    id,
    label: `surfer.row.${id}` as StringKey,
    options: values.map((value) => ({
      value, label: label(value), selected: selected === value, ...(swatch ? { swatch: swatch(value) } : {}),
    })),
  });
  return {
    rows: [
      row('sex', SURFER_SEXES, sex, (value) => `surfer.sex.${value}` as StringKey),
      row('look', looksFor(sex).map(String), String(lookOf(choice.body)), (value) => `surfer.look.${value}` as StringKey),
      // The vest is named for what goes with it on this body: a bikini or boardshorts.
      row('outfit', OUTFIT_CHOICES, choice.outfit, (value) => `surfer.outfit.${outfitFor({ ...choice, outfit: value as SurferSettings['outfit'] })}` as StringKey),
      row('color', Object.keys(SUIT_COLORS), choice.color, (value) => `surfer.color.${value}` as StringKey, (value) => SUIT_COLORS[value as SuitColor]),
      row('board', BOARD_DESIGNS.map((design) => design.id), choice.board, (value) => `surfer.board.${value}` as StringKey),
    ],
  };
}

/** What a pick changes: the sex and look rows both pick the body, and a change of sex keeps the look. */
export function pickPatch(choice: SurferSettings, row: RowId, value: string): Partial<SurferSettings> {
  if (row === 'sex') return { body: surferBody(value as SurferSex, lookOf(choice.body)) };
  if (row === 'look') return { body: surferBody(sexOf(choice.body), Number(value)) };
  return { [row]: value };
}

/** What draws the surfer beside the pickers; absent where WebGL is not. */
export interface SurferPreviewLike {
  show(choice: SurferSettings, time: TimeOfDay): void;
  dispose(): void;
}

/**
 * The Surfer card: a preview of the surfer on their board over four picker
 * rows. A pick applies at once (`change`), and the preview follows it.
 */
export function createSurferCard(
  initial: SurferSettings,
  time: TimeOfDay,
  handlers: { change(patch: Partial<SurferSettings>): void },
  makePreview?: (canvas: HTMLCanvasElement) => SurferPreviewLike | undefined,
): { root: HTMLElement; setTime(time: TimeOfDay): void; dispose(): void } {
  const choice: SurferSettings = { ...initial };
  let currentTime = time;
  const canvas = el('canvas', { class: 'surfer-preview', attrs: { role: 'img', 'aria-label': t('surfer.preview') } }) as HTMLCanvasElement;
  const preview = makePreview?.(canvas);
  if (!preview) canvas.hidden = true;
  const rows = el('div', { class: 'choice-rows surfer-rows' });
  const build = () => {
    rows.replaceChildren(...surferModel(choice).rows.map((row) => {
      const group = el('div', { class: row.id === 'color' ? 'segmented swatches' : 'segmented', attrs: { role: 'group', 'aria-label': t(row.label) } });
      for (const option of row.options) {
        const button = el('button', {
          attrs: { type: 'button', 'aria-pressed': String(option.selected), ...(option.swatch ? { 'aria-label': t(option.label), style: `--swatch: ${option.swatch}` } : {}) },
          dataset: { nav: '' },
          ...(option.swatch ? {} : { text: t(option.label) }),
          on: {
            click: () => {
              const patch = pickPatch(choice, row.id, option.value);
              Object.assign(choice, patch);
              handlers.change(patch);
              preview?.show({ ...choice }, currentTime);
              // A body change offers that sex's looks and renames the vest (bikini or boardshorts): redraw the rows,
              // keeping focus on the pick.
              build();
              (rows.querySelector(`[aria-label="${t(row.label)}"] [aria-pressed="true"]`) as HTMLElement | null)?.focus();
            },
          },
        });
        group.append(button);
      }
      return el('div', { class: 'choice-row' }, el('span', { class: 'choice-label', text: t(row.label) }), group);
    }));
  };
  build();
  preview?.show({ ...choice }, currentTime);
  const root = el('section', { class: 'surfer-card', attrs: { 'aria-label': t('surfer.title') } },
    el('h3', { text: t('surfer.title') }), canvas, rows);
  return {
    root,
    setTime(next) {
      currentTime = next;
      preview?.show({ ...choice }, currentTime);
    },
    dispose() {
      preview?.dispose();
    },
  };
}
