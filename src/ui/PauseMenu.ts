import { el } from './dom';
import { soundToggle } from './MainMenu';
import { t } from './strings';

export interface PauseHandlers {
  resume(): void;
  replay(): void;
  newWave(): void;
  /** Cycle the camera; returns the new view's name. */
  camera(): string;
  settings(): void;
  quit(): void;
  /** The speaker toggle (S1). */
  sound: { muted: boolean; toggle(): void };
}

export interface OnlinePauseHandlers {
  resume(): void;
  camera(): string;
  settings(): void;
  leave(): void;
  sound: { muted: boolean; toggle(): void };
}

/**
 * The pause menu online (spec N1): the sea keeps running for everyone, so it
 * offers no replay or new wave; the room's players (and the creator's Kick)
 * sit beside Resume, Camera, Settings, the sound and Leave room.
 */
export function createOnlinePauseMenu(handlers: OnlinePauseHandlers, viewName: string, players: HTMLElement): HTMLElement {
  const item = (label: string, action: () => void, isDefault = false) => el('button', {
    class: 'pause-item',
    attrs: { type: 'button' },
    dataset: isDefault ? { nav: '', navDefault: '' } : { nav: '' },
    text: label,
    on: { click: action },
  });
  const camera = item(t('pause.camera', { view: viewName }), () => {
    camera.textContent = t('pause.camera', { view: handlers.camera() });
  });
  return el('section', { class: 'screen screen-panel screen-pause', attrs: { 'aria-label': t('pause.title') } },
    el('div', { class: 'panel panel-narrow' },
      el('h2', { class: 'pause-title', text: t('pause.title') }),
      el('div', { class: 'pause-items' },
        item(t('pause.resume'), handlers.resume, true),
        camera,
        item(t('pause.settings'), handlers.settings),
        soundToggle('pause-item', handlers.sound.muted, handlers.sound.toggle),
        item(t('online.leave'), handlers.leave)),
      players));
}

/** The pause menu (plan P8): the waves hold still until Resume, Esc or B. */
export function createPauseMenu(handlers: PauseHandlers, viewName: string): HTMLElement {
  const item = (label: string, action: () => void, isDefault = false) => el('button', {
    class: 'pause-item',
    attrs: { type: 'button' },
    dataset: isDefault ? { nav: '', navDefault: '' } : { nav: '' },
    text: label,
    on: { click: action },
  });
  const camera = item(t('pause.camera', { view: viewName }), () => {
    camera.textContent = t('pause.camera', { view: handlers.camera() });
  });
  return el('section', { class: 'screen screen-panel screen-pause', attrs: { 'aria-label': t('pause.title') } },
    el('div', { class: 'panel panel-narrow' },
      el('h2', { class: 'pause-title', text: t('pause.title') }),
      el('div', { class: 'pause-items' },
        item(t('pause.resume'), handlers.resume, true),
        item(t('pause.replay'), handlers.replay),
        item(t('pause.newWave'), handlers.newWave),
        camera,
        item(t('pause.settings'), handlers.settings),
        soundToggle('pause-item', handlers.sound.muted, handlers.sound.toggle),
        item(t('pause.quit'), handlers.quit))));
}
