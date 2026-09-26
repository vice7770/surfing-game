import { el, icon } from './dom';
import { ICONS, type IconName } from './icons';
import { t, type StringKey } from './strings';

export type MenuTileId = 'surf' | 'waveLab' | 'multiplayer' | 'logbook' | 'settings';

export interface MenuTile {
  id: MenuTileId;
  label: StringKey;
  icon: IconName;
  disabled: boolean;
  badge?: StringKey;
}

/** The main menu's tiles (plan P8); the Wave Lab only with the dev tools on, multiplayer still to come. */
export function menuTiles(devTools: boolean): MenuTile[] {
  const tiles: MenuTile[] = [
    { id: 'surf', label: 'menu.surf', icon: 'surf', disabled: false },
    { id: 'waveLab', label: 'menu.waveLab', icon: 'waveLab', disabled: false },
    { id: 'multiplayer', label: 'menu.multiplayer', icon: 'multiplayer', disabled: true, badge: 'menu.comingSoon' },
    { id: 'logbook', label: 'menu.logbook', icon: 'logbook', disabled: false },
    { id: 'settings', label: 'menu.settings', icon: 'settings', disabled: false },
  ];
  return devTools ? tiles : tiles.filter((tile) => tile.id !== 'waveLab');
}

export type MainMenuHandlers = Record<Exclude<MenuTileId, 'multiplayer'>, () => void>;

function fullscreenButton(): HTMLElement | null {
  if (!document.fullscreenEnabled) return null;
  const label = el('span');
  const button = el('button', {
    class: 'strip-button',
    attrs: { type: 'button' },
    dataset: { nav: '' },
    on: {
      click: () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      },
    },
  }, icon(ICONS.fullscreen), label);
  const refresh = () => { label.textContent = t(document.fullscreenElement ? 'menu.exitFullscreen' : 'menu.fullscreen'); };
  document.addEventListener('fullscreenchange', refresh);
  refresh();
  return button;
}

export function createMainMenu(handlers: MainMenuHandlers, options: { devTools: boolean; version: string }): HTMLElement {
  const tiles = menuTiles(options.devTools).map((tile) => el('button', {
    class: tile.id === 'surf' ? 'tile tile-primary' : 'tile',
    attrs: { type: 'button', ...(tile.disabled ? { 'aria-disabled': 'true' } : {}) },
    dataset: tile.id === 'surf' ? { nav: '', navDefault: '' } : { nav: '' },
    on: { click: () => { if (tile.id !== 'multiplayer') handlers[tile.id](); } },
  }, tile.badge ? el('span', { class: 'badge', text: t(tile.badge) }) : null, icon(ICONS[tile.icon]), el('span', { text: t(tile.label) })));
  return el('section', { class: 'screen screen-menu', attrs: { 'aria-label': t('app.name') } },
    el('div', { class: 'brand-block' },
      el('span', { class: 'brand-mark', text: 'B', attrs: { 'aria-hidden': 'true' } }),
      el('h1', { class: 'wordmark', text: t('app.name') }),
      el('p', { class: 'tagline', text: t('app.tagline') })),
    el('nav', { class: 'tiles', attrs: { 'aria-label': t('menu.title') } }, ...tiles),
    el('div', { class: 'menu-strip' },
      fullscreenButton() ?? el('span'),
      el('span', { text: t('menu.version', { version: options.version }) })));
}
