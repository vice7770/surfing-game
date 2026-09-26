import { SURF_SPOTS, type SurfConditions } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import { el, icon } from './dom';
import { ICONS } from './icons';
import type { StringKey } from './strings';
import { t } from './strings';

export interface SurfChoice {
  spot: SpotName;
  conditions: SurfConditions;
}

type ConditionId = keyof SurfConditions;

const CONDITION_OPTIONS: Record<ConditionId, readonly string[]> = {
  swell: ['practice', 'small', 'medium', 'big'],
  tide: ['low', 'mid', 'high'],
  wind: ['offshore', 'calm', 'onshore'],
  time: ['dawn', 'midday', 'sunset'],
};

export interface SurfModel {
  spots: { id: SpotName; name: StringKey; blurb: StringKey; selected: boolean }[];
  rows: { id: ConditionId; label: StringKey; options: { value: string; label: StringKey; selected: boolean }[] }[];
}

/** The Surf screen as data (plan P8): the spots on offer and the four condition rows, with the choices marked. */
export function surfModel(choice: SurfChoice): SurfModel {
  return {
    spots: SURF_SPOTS.map((id) => ({
      id, name: `spot.${id}` as StringKey, blurb: `spot.${id}.blurb` as StringKey, selected: id === choice.spot,
    })),
    rows: (Object.keys(CONDITION_OPTIONS) as ConditionId[]).map((id) => ({
      id,
      label: `cond.${id}` as StringKey,
      options: CONDITION_OPTIONS[id].map((value) => ({
        value, label: `cond.${id}.${value}` as StringKey, selected: choice.conditions[id] === value,
      })),
    })),
  };
}

/** A line sketch of each spot's seabed, seen from above: waves come in from the top. */
const SKETCHES: Record<SpotName, string> = {
  beach: '<path d="M4 38c10-4 20 4 30 0s20-4 30 0 10 2 12 1"/><path d="M14 26c6-3 12-3 18 0M48 24c6-3 12-3 18 0" stroke-dasharray="3 3"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>',
  point: '<path d="M4 42h24c10 0 14-8 20-16s12-14 28-16"/><path d="M34 34c6-8 14-16 30-18" stroke-dasharray="3 3"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>',
  reef: '<path d="M4 42c14-2 24-2 36-2s22 0 36 2"/><path d="M22 30c6-8 12-10 18-10s12 2 18 10" stroke-dasharray="3 3"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>',
  canyon: '<path d="M4 42c14-2 24-2 36-2s22 0 36 2"/><path d="M36 42V14M44 42V14" stroke-dasharray="3 3"/><path d="M4 12c12 2 24-2 36 0s24 2 36 0" opacity=".45"/>',
};

function sketch(spot: SpotName): Element {
  return icon(`<svg viewBox="0 0 80 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${SKETCHES[spot]}</svg>`);
}

function press(group: HTMLElement, chosen: HTMLElement): void {
  for (const button of group.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button === chosen));
}

/** Pick a spot and the conditions, then paddle out. Choices apply as they are made; nothing re-renders. */
export function createSurfScreen(initial: SurfChoice, handlers: { change(choice: SurfChoice): void; paddleOut(): void; back(): void }): HTMLElement {
  const choice: SurfChoice = { spot: initial.spot, conditions: { ...initial.conditions } };
  const model = surfModel(choice);
  const spots = el('div', { class: 'spot-cards', attrs: { role: 'group', 'aria-label': t('surf.title') } });
  for (const spot of model.spots) {
    const card = el('button', {
      class: 'spot-card',
      attrs: { type: 'button', 'aria-pressed': String(spot.selected) },
      dataset: { nav: '' },
      on: {
        click: () => {
          choice.spot = spot.id;
          press(spots, card);
          handlers.change({ ...choice });
        },
      },
    }, sketch(spot.id), el('span', { class: 'spot-text' }, el('strong', { text: t(spot.name) }), el('small', { text: t(spot.blurb) })));
    spots.append(card);
  }
  const rows = model.rows.map((row) => {
    const group = el('div', { class: 'segmented', attrs: { role: 'group', 'aria-label': t(row.label) } });
    for (const option of row.options) {
      const button = el('button', {
        attrs: { type: 'button', 'aria-pressed': String(option.selected) },
        dataset: { nav: '' },
        text: t(option.label),
        on: {
          click: () => {
            (choice.conditions as unknown as Record<string, string>)[row.id] = option.value;
            press(group, button);
            handlers.change({ ...choice, conditions: { ...choice.conditions } });
          },
        },
      });
      group.append(button);
    }
    return el('div', { class: 'choice-row' }, el('span', { class: 'choice-label', text: t(row.label) }), group);
  });
  return el('section', { class: 'screen screen-panel', attrs: { 'aria-label': t('surf.title') } },
    el('div', { class: 'panel' },
      el('header', { class: 'panel-header' },
        el('button', { class: 'icon-back', attrs: { type: 'button', 'aria-label': t('surf.back') }, dataset: { nav: '' }, on: { click: handlers.back } }, icon(ICONS.back)),
        el('h2', { text: t('surf.title') })),
      spots,
      el('div', { class: 'choice-rows' }, ...rows),
      el('footer', { class: 'panel-footer' },
        el('button', { class: 'button-primary', attrs: { type: 'button' }, dataset: { nav: '', navDefault: '' }, text: t('surf.paddleOut'), on: { click: handlers.paddleOut } }))));
}
