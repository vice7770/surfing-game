import type { LoggedRide, SpotBests } from '../game/Logbook';
import { SURF_SPOTS } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import { el, icon } from './dom';
import { ICONS } from './icons';
import { t, type StringKey } from './strings';
import { formatDistance, formatDuration, formatSpeed, type Units } from './units';

export interface LogbookModel {
  spots: { spot: SpotName; name: StringKey; bests: { label: StringKey; value: string }[] }[];
  recent: { title: string; detail: string }[];
  empty: boolean;
}

const OUTCOME_TITLES: Record<LoggedRide['outcome'], StringKey> = { wipeout: 'end.wipeout', complete: 'end.complete', ended: 'end.ended' };
const NONE = '—';

function when(at: number, now: number): string {
  const seconds = (now - at) / 1000;
  if (seconds < 60) return t('log.justNow');
  if (seconds < 3600) return t('log.minutesAgo', { n: Math.floor(seconds / 60) });
  if (seconds < 86400) return t('log.hoursAgo', { n: Math.floor(seconds / 3600) });
  return new Date(at).toLocaleDateString('en');
}

/** The Logbook as data (plan P8): each Surf spot's bests, then the recent rides, in the player's units. */
export function logbookModel(log: { recent: readonly LoggedRide[]; bests(spot: SpotName): SpotBests }, units: Units, now: number): LogbookModel {
  return {
    spots: SURF_SPOTS.map((spot) => {
      const bests = log.bests(spot);
      return {
        spot,
        name: `spot.${spot}` as StringKey,
        bests: [
          { label: 'end.distance', value: bests.distance === undefined ? NONE : formatDistance(bests.distance, units) },
          { label: 'end.topSpeed', value: bests.topSpeed === undefined ? NONE : formatSpeed(bests.topSpeed, units) },
          { label: 'end.time', value: bests.seconds === undefined ? NONE : formatDuration(bests.seconds) },
        ],
      };
    }),
    recent: log.recent.map((ride) => ({
      title: `${t(`spot.${ride.spot}` as StringKey)} · ${t(OUTCOME_TITLES[ride.outcome])}`,
      detail: [formatDistance(ride.distance, units), formatSpeed(ride.topSpeed, units), formatDuration(ride.seconds), when(ride.at, now)].join(' · '),
    })),
    empty: log.recent.length === 0,
  };
}

export function createLogbookScreen(model: LogbookModel, onBack: () => void): HTMLElement {
  const spots = el('div', { class: 'log-spots' }, ...model.spots.map((spot) => el('div', { class: 'log-spot' },
    el('h3', { text: t(spot.name) }),
    el('dl', {}, ...spot.bests.map((best) => el('div', {}, el('dt', { text: t(best.label) }), el('dd', { text: best.value })))))));
  const recent = model.empty
    ? el('p', { class: 'log-empty', text: t('log.empty') })
    : el('ol', { class: 'log-recent' }, ...model.recent.map((ride) => el('li', {}, el('strong', { text: ride.title }), el('small', { text: ride.detail }))));
  return el('section', { class: 'screen screen-panel', attrs: { 'aria-label': t('log.title') } },
    el('div', { class: 'panel' },
      el('header', { class: 'panel-header' },
        el('button', { class: 'icon-back', attrs: { type: 'button', 'aria-label': t('surf.back') }, dataset: { nav: '', navDefault: '' }, on: { click: onBack } }, icon(ICONS.back)),
        el('h2', { text: t('log.title') })),
      el('h3', { class: 'panel-subhead', text: t('log.bests') }),
      spots,
      el('h3', { class: 'panel-subhead', text: t('log.recent') }),
      recent));
}
