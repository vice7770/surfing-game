import type { BestKind } from '../game/Logbook';
import type { RideResult } from '../game/RideTracker';
import { el } from './dom';
import { t, type StringKey } from './strings';
import { formatDistance, formatDuration, formatSpeed, type Units } from './units';

export interface EndCardModel {
  title: StringKey;
  reason: StringKey;
  stats: { label: StringKey; value: string }[];
  newBest: boolean;
}

const TITLES: Record<RideResult['outcome'], StringKey> = { wipeout: 'end.wipeout', complete: 'end.complete', ended: 'end.ended' };

/** The end-of-ride card as data (plan P8): outcome, reason, distance, top speed and time in the player's units. */
export function endCardModel(result: RideResult, records: readonly BestKind[], units: Units): EndCardModel {
  return {
    title: TITLES[result.outcome],
    reason: result.reason,
    stats: [
      { label: 'end.distance', value: formatDistance(result.distance, units) },
      { label: 'end.topSpeed', value: formatSpeed(result.topSpeed, units) },
      { label: 'end.time', value: formatDuration(result.seconds) },
    ],
    newBest: records.length > 0,
  };
}

export interface EndCardHandlers {
  replay(): void;
  newWave(): void;
  changeSpot(): void;
  menu(): void;
}

/**
 * The card at the foot of the screen after a ride. It is not modal: the waves run
 * on and a fallen rider can swim back, so it takes no focus.
 */
export function createRideEndCard(model: EndCardModel, handlers: EndCardHandlers, retryKey: string): HTMLElement {
  const button = (label: string, action: () => void, primary = false) =>
    el('button', { class: primary ? 'button-primary' : 'button-secondary', attrs: { type: 'button' }, text: label, on: { click: action } });
  return el('aside', { class: 'end-card', attrs: { role: 'status' } },
    el('header', { class: 'end-card-head' },
      el('div', {},
        el('h2', { text: t(model.title) }),
        el('p', { class: 'end-card-reason', text: t(model.reason) })),
      model.newBest ? el('span', { class: 'end-card-best', text: t('end.newBest') }) : null),
    el('dl', { class: 'end-card-stats' },
      ...model.stats.map((stat) => el('div', {}, el('dt', { text: t(stat.label) }), el('dd', { text: stat.value })))),
    el('div', { class: 'end-card-actions' },
      button(t('end.replay', { key: retryKey }), handlers.replay, true),
      button(t('end.newWave'), handlers.newWave),
      button(t('end.changeSpot'), handlers.changeSpot),
      button(t('end.menu'), handlers.menu)));
}
