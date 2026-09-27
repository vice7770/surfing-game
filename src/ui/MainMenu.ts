import type { SteamStatus } from '../game/steam/SteamControllerDriver';
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

/** The main menu's tiles (plan P8); the Wave Lab is for everyone (spec L1). */
export function menuTiles(): MenuTile[] {
  return [
    { id: 'surf', label: 'menu.surf', icon: 'surf', disabled: false },
    { id: 'waveLab', label: 'menu.waveLab', icon: 'waveLab', disabled: false },
    { id: 'multiplayer', label: 'menu.multiplayer', icon: 'multiplayer', disabled: false },
    { id: 'logbook', label: 'menu.logbook', icon: 'logbook', disabled: false },
    { id: 'settings', label: 'menu.settings', icon: 'settings', disabled: false },
  ];
}

export type MainMenuHandlers = Record<MenuTileId, () => void>;

/** The menu strip's Steam Controller button (spec C1): Connect until one has connected once; in a browser without WebHID, what it needs. */
export function steamStrip(status: SteamStatus, seen: boolean): { label: StringKey; disabled: boolean } | undefined {
  if (seen || status === 'connected') return undefined;
  return status === 'unsupported' ? { label: 'menu.steamUnsupported', disabled: true } : { label: 'menu.steamConnect', disabled: false };
}

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

/** The speaker toggle (S1): its label says the sound's state, and it carries `data-sound-toggle` so the app can relabel it. */
export function soundToggle(className: string, muted: boolean, toggle: () => void): HTMLElement {
  return el('button', {
    class: className,
    attrs: { type: 'button', 'aria-pressed': String(!muted) },
    dataset: { nav: '', soundToggle: '' },
    on: { click: toggle },
  }, icon(ICONS[muted ? 'muted' : 'sound']), el('span', { class: 'sound-label', text: t(muted ? 'menu.muted' : 'menu.sound') }));
}

/** Relabel every speaker toggle on the page after the sound is muted or unmuted. */
export function refreshSoundToggles(root: ParentNode, muted: boolean): void {
  for (const button of root.querySelectorAll<HTMLElement>('[data-sound-toggle]')) {
    button.setAttribute('aria-pressed', String(!muted));
    button.querySelector('svg')?.replaceWith(icon(ICONS[muted ? 'muted' : 'sound']));
    const label = button.querySelector('.sound-label');
    if (label) label.textContent = t(muted ? 'menu.muted' : 'menu.sound');
  }
}

export function createMainMenu(
  handlers: MainMenuHandlers,
  options: { version: string; sound: { muted: boolean; toggle: () => void }; steam?: { label: string; disabled: boolean; connect(): void } },
): HTMLElement {
  const tiles = menuTiles().map((tile) => el('button', {
    class: tile.id === 'surf' ? 'tile tile-primary' : 'tile',
    attrs: { type: 'button', ...(tile.disabled ? { 'aria-disabled': 'true' } : {}) },
    dataset: tile.id === 'surf' ? { nav: '', navDefault: '' } : { nav: '' },
    on: { click: () => { if (!tile.disabled) handlers[tile.id](); } },
  }, tile.badge ? el('span', { class: 'badge', text: t(tile.badge) }) : null, icon(ICONS[tile.icon]), el('span', { text: t(tile.label) })));
  return el('section', { class: 'screen screen-menu', attrs: { 'aria-label': t('app.name') } },
    el('div', { class: 'brand-block' },
      el('span', { class: 'brand-mark', text: 'B', attrs: { 'aria-hidden': 'true' } }),
      el('h1', { class: 'wordmark', text: t('app.name') }),
      el('p', { class: 'tagline', text: t('app.tagline') })),
    el('nav', { class: 'tiles', attrs: { 'aria-label': t('menu.title') } }, ...tiles),
    el('div', { class: 'menu-strip' },
      el('span', { class: 'strip-group' },
        fullscreenButton() ?? el('span'),
        soundToggle('strip-button', options.sound.muted, options.sound.toggle),
        options.steam ? el('button', {
          class: 'strip-button',
          attrs: { type: 'button', ...(options.steam.disabled ? { 'aria-disabled': 'true' } : {}) },
          dataset: { nav: '' },
          text: options.steam.label,
          on: { click: () => { if (!options.steam?.disabled) options.steam?.connect(); } },
        }) : null),
      el('span', { text: t('menu.version', { version: options.version }) })));
}
