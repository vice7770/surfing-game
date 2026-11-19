import type { LoggedRide, SpotBests } from '../game/Logbook';
import { SURF_SPOTS } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import { el, icon } from './dom';
import { ICONS } from './icons';
import { t, type StringKey } from './strings';
import { formatDistance, formatDuration, formatSpeed, type Units } from './units';

export interface LogbookModel {
  spots: { spot: SpotName; name: StringKey; bests: { label: StringKey; value: string }[] }[];
  /** Each recent ride: what and where, its numbers, and **what ended it** (`endingLine`). */
  recent: { title: string; detail: string; ending: string }[];
  empty: boolean;
}

const OUTCOME_TITLES: Record<LoggedRide['outcome'], StringKey> = { wipeout: 'end.wipeout', complete: 'end.complete', ended: 'end.ended' };
const NONE = '—';

/**
 * **The steer the ride was asking for when it ended**, as a share of full stick and a side. Literal: an exactly
 * centred stick is "no turn asked", and anything smaller than a percent says so rather than rounding to `0 %`.
 */
function turnAsked(steer: number): string {
  if (steer === 0) return t('log.ending.noTurn');
  const share = Math.abs(steer);
  return t('log.ending.turn', {
    amount: share < 0.01 ? '<1 %' : `${Math.round(share * 100)} %`,
    side: t(steer > 0 ? 'log.ending.left' : 'log.ending.right'),
  });
}

/**
 * **What ended the ride** — the line the owner rides for. Every entry names the cause the ride itself recorded
 * (`reason`). A wipeout adds how long the rider stood, from the stand to the separation; which balance limit ran out
 * and whether the weight left the feet across the board or along it; and the steer being asked for at the time,
 * because a turn asked for on a carried stand is sometimes the whole fall and sometimes harmless.
 *
 * Three cases are said out loud rather than papered over:
 * - `limit: 'posture'` — the default rider's balance reserve is **one filtered minimum** of the feet's lateral and
 *   longitudinal headroom and their grip, and the three are never kept apart in the physics, so the line says the
 *   minimum ran out and nothing about which. They separate only on `?rider=new`.
 * - no `fall` at all — a ride logged before this readout shipped, or a wipeout whose frames carried no record: it
 *   says it was not recorded. It never shows a zero for a number nobody measured.
 * - not a wipeout — a retry mid-flight or a ride ridden out: the rider was still up, so there is nothing that let
 *   go and nothing is claimed.
 */
export function endingLine(ride: LoggedRide): string {
  const parts: string[] = [t(ride.reason)];
  if (ride.outcome !== 'wipeout') return parts.join(' · ');
  parts.push(t('log.ending.stood', { seconds: formatDuration(ride.seconds) }));
  const { fall } = ride;
  if (!fall) {
    parts.push(t('log.ending.unrecorded'));
    return parts.join(' · ');
  }
  parts.push(fall.limit === 'posture'
    ? t('log.ending.minimum')
    : t(fall.across ? 'log.ending.limitAcross' : 'log.ending.limitAlong', { limit: t(`hud.balance.${fall.limit}`) }));
  parts.push(turnAsked(fall.steer));
  return parts.join(' · ');
}

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
      title: `${t(`spot.${ride.spot}` as StringKey)} · ${t(OUTCOME_TITLES[ride.outcome])}${ride.online ? ` · ${t('log.online')}` : ''}`,
      detail: [formatDistance(ride.distance, units), formatSpeed(ride.topSpeed, units), formatDuration(ride.seconds), when(ride.at, now)].join(' · '),
      ending: endingLine(ride),
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
    : el('ol', { class: 'log-recent' }, ...model.recent.map((ride) => el('li', {},
      el('strong', { text: ride.title }),
      el('small', { text: ride.detail }),
      el('small', { class: 'log-ending', text: ride.ending }))));
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
