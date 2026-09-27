import type { OnlinePhase } from '../game/OnlinePlay';
import type { NetStatus } from '../net/NetClient';
import type { FeedEntry } from '../net/OnlineController';
import type { PlayerInfo } from '../net/protocol';
import { el } from './dom';
import { t } from './strings';
import { formatDistance, type Units } from './units';

export interface OnlineHudState {
  status: NetStatus;
  phase?: OnlinePhase;
  /** How far the sea is behind the room, s, while it catches up. */
  behind?: number;
  respawnIn?: number;
  feed: readonly FeedEntry[];
  units: Units;
  /** Local ms, as the feed's expiry times. */
  now: number;
}

export interface OnlineHudModel {
  notice?: string;
  feed: string[];
}

/** The online HUD as data (spec N1): one notice at a time, and the ride feed's current lines. */
export function onlineHudModel(state: OnlineHudState): OnlineHudModel {
  const notice = state.status === 'reconnecting' ? t('online.reconnecting')
    : state.phase === 'catching-up' ? (state.behind !== undefined && state.behind > 1 ? t('online.catchingUpBy', { s: Math.ceil(state.behind) }) : t('online.catchingUp'))
      : state.phase === 'resyncing' ? t('online.resyncing')
        : state.respawnIn !== undefined ? t('online.respawnIn', { s: Math.max(1, Math.ceil(state.respawnIn)) })
          : undefined;
  const feed = state.feed.filter((entry) => entry.until > state.now).map((entry) => t('online.feed', {
    name: entry.name, distance: formatDistance(entry.distance, state.units), seconds: entry.seconds.toFixed(1),
  }));
  return { notice, feed };
}

export interface PlayerRow {
  id: number;
  name: string;
  you: boolean;
  kick: boolean;
}

/** The room's players for the pause menu: Kick only for the room's creator, never on their own row. */
export function playersModel(players: readonly PlayerInfo[], you: number | undefined, creator: boolean): PlayerRow[] {
  return players.map((player) => ({ id: player.id, name: player.name, you: player.id === you, kick: creator && player.id !== you }));
}

/**
 * The online HUD over a ride (spec N1): a notice (reconnecting, catching up,
 * a respawn's countdown) and the feed of finished rides. Names are other
 * players' words, so they are only ever set as text.
 */
export class OnlineHud {
  readonly root = el('div', { class: 'online-hud' });
  private readonly notice = el('p', { class: 'online-notice', attrs: { role: 'status' } });
  private readonly feed = el('ol', { class: 'online-feed', attrs: { 'aria-live': 'polite' } });
  private shown = '';

  constructor() {
    this.root.append(this.notice, this.feed);
    this.notice.hidden = true;
  }

  update(model: OnlineHudModel): void {
    const key = JSON.stringify(model);
    if (key === this.shown) return;
    this.shown = key;
    this.notice.hidden = model.notice === undefined;
    this.notice.textContent = model.notice ?? '';
    this.feed.replaceChildren(...model.feed.map((line) => el('li', { text: line })));
  }
}

/** The pause menu's players: names, "you", and the creator's Kick buttons; kept current while the menu is open. */
export class PlayersPanel {
  readonly root: HTMLElement;
  private readonly list = el('ul', { class: 'online-players' });
  private shown = '';

  constructor(link: string, private readonly onKick: (id: number) => void) {
    const copy = el('button', {
      class: 'strip-button', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('online.copyLink'),
      on: {
        click: () => {
          void globalThis.navigator?.clipboard?.writeText(link).then(() => { copy.textContent = t('online.copied'); }, () => {});
        },
      },
    });
    this.root = el('section', { class: 'online-players-panel', attrs: { 'aria-label': t('online.players') } },
      el('h3', { class: 'panel-subhead', text: t('online.players') }),
      this.list,
      el('p', { class: 'online-link' }, el('span', { text: link }), copy));
  }

  update(rows: readonly PlayerRow[]): void {
    const key = JSON.stringify(rows);
    if (key === this.shown) return;
    this.shown = key;
    this.list.replaceChildren(...rows.map((row) => el('li', {},
      el('span', { text: row.name }),
      row.you ? el('small', { text: t('online.you') }) : null,
      row.kick ? el('button', {
        class: 'strip-button', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('online.kick'), on: { click: () => this.onKick(row.id) },
      }) : null)));
  }
}
