import type { BestKind } from '../game/Logbook';
import type { ManeuverKind } from '../game/rideAnalysis';
import type { RideResult } from '../game/RideTracker';
import { el } from './dom';
import { t, type StringKey } from './strings';
import { formatDistance, formatDuration, formatSpeed, type Units } from './units';

export interface EndCardModel {
  title: StringKey;
  reason: StringKey;
  stats: { label: StringKey; value: string }[];
  /** The ride's turns, each with the share of its speed it kept (P9). */
  turns: { label: StringKey; value: string }[];
  /** The slow motion the ride was played at, as a factor, when below 1. */
  slowMotion?: string;
  newBest: boolean;
}

const TITLES: Record<RideResult['outcome'], StringKey> = { wipeout: 'end.wipeout', complete: 'end.complete', ended: 'end.ended' };
export const MANEUVER_LABELS: Record<ManeuverKind, StringKey> = {
  'bottom turn': 'maneuver.bottomTurn', 'top turn': 'maneuver.topTurn', snap: 'maneuver.snap', cutback: 'maneuver.cutback',
};

/**
 * The end-of-ride card as data (plan P8): outcome, reason, distance, top speed and
 * time in the player's units; with the worker's reading of the ride (P9), the time
 * in the pocket and the turns; and, when the player asks for scores, the wave's
 * score and the session's best two.
 */
export function endCardModel(result: RideResult, records: readonly BestKind[], units: Units, scoring?: { score: number; bestTwo: number }): EndCardModel {
  const { report } = result;
  const stats: EndCardModel['stats'] = [
    { label: 'end.distance', value: formatDistance(result.distance, units) },
    { label: 'end.topSpeed', value: formatSpeed(result.topSpeed, units) },
    { label: 'end.time', value: formatDuration(result.seconds) },
  ];
  if (report) stats.push({ label: 'end.pocket', value: formatDuration(report.pocketTime) });
  if (scoring) stats.push({ label: 'end.score', value: scoring.score.toFixed(1) }, { label: 'end.bestTwo', value: scoring.bestTwo.toFixed(1) });
  return {
    title: TITLES[result.outcome],
    reason: result.reason,
    stats,
    turns: (report?.maneuvers ?? []).map((m) => ({
      label: MANEUVER_LABELS[m.kind],
      value: `${Math.round((m.speedIn > 0 ? m.speedOut / m.speedIn : 0) * 100)} %`,
    })),
    ...(result.timeScale !== undefined && result.timeScale < 1 ? { slowMotion: String(Math.round(result.timeScale * 100) / 100) } : {}),
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
    model.turns.length > 0
      ? el('p', { class: 'end-card-turns', text: `${t('end.turns')}: ${model.turns.map((turn) => `${t(turn.label)} ${turn.value}`).join(' · ')}` })
      : null,
    model.slowMotion ? el('p', { class: 'end-card-note', text: t('end.slowMotion', { scale: model.slowMotion }) }) : null,
    el('div', { class: 'end-card-actions' },
      button(t('end.replay', { key: retryKey }), handlers.replay, true),
      button(t('end.newWave'), handlers.newWave),
      button(t('end.changeSpot'), handlers.changeSpot),
      button(t('end.menu'), handlers.menu)));
}
