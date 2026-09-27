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

export interface LabPauseHandlers {
  resume(): void;
  settings(): void;
  quit(): void;
  sound: { muted: boolean; toggle(): void };
}

/** The Wave Lab's pause menu (spec L1): the sea holds still; there is no ride to replay. */
export function createLabPauseMenu(handlers: LabPauseHandlers): HTMLElement {
  const item = (label: string, action: () => void, isDefault = false) => el('button', {
    class: 'pause-item',
    attrs: { type: 'button' },
    dataset: isDefault ? { nav: '', navDefault: '' } : { nav: '' },
    text: label,
    on: { click: action },
  });
  return el('section', { class: 'screen screen-panel screen-pause', attrs: { 'aria-label': t('pause.title') } },
    el('div', { class: 'panel panel-narrow' },
      el('h2', { class: 'pause-title', text: t('pause.title') }),
      el('div', { class: 'pause-items' },
        item(t('pause.resume'), handlers.resume, true),
        item(t('pause.settings'), handlers.settings),
        soundToggle('pause-item', handlers.sound.muted, handlers.sound.toggle),
        item(t('pause.quit'), handlers.quit))));
}

export interface LessonPauseHandlers {
  resume(): void;
  restart(): void;
  explain(): void;
  /** Toggle 0.5x slow motion; returns whether it is now on. */
  slowMotion(): boolean;
  slowMotionOn: boolean;
  camera(): string;
  settings(): void;
  /** Free Practice: the lessons' explanations. */
  howTo?(): void;
  lessons(): void;
  quit(): void;
  sound: { muted: boolean; toggle(): void };
}

/** The pause menu in a Surf School lesson or Free Practice (spec L2): restart on the same wave, the explanation, slow motion, and the way back to the lessons. */
export function createLessonPauseMenu(handlers: LessonPauseHandlers, viewName: string): HTMLElement {
  const item = (label: string, action: () => void, isDefault = false) => el('button', {
    class: 'pause-item',
    attrs: { type: 'button' },
    dataset: isDefault ? { nav: '', navDefault: '' } : { nav: '' },
    text: label,
    on: { click: action },
  });
  const slowLabel = (on: boolean) => t('school.slowMotion', { state: t(on ? 'school.on' : 'school.off') });
  const slow = item(slowLabel(handlers.slowMotionOn), () => {
    slow.textContent = slowLabel(handlers.slowMotion());
  });
  const camera = item(t('pause.camera', { view: viewName }), () => {
    camera.textContent = t('pause.camera', { view: handlers.camera() });
  });
  return el('section', { class: 'screen screen-panel screen-pause', attrs: { 'aria-label': t('pause.title') } },
    el('div', { class: 'panel panel-narrow' },
      el('h2', { class: 'pause-title', text: t('pause.title') }),
      el('div', { class: 'pause-items' },
        item(t('pause.resume'), handlers.resume, true),
        item(t('school.restart'), handlers.restart),
        handlers.howTo ? item(t('school.howTo'), handlers.howTo) : item(t('school.explain'), handlers.explain),
        slow,
        camera,
        item(t('pause.settings'), handlers.settings),
        soundToggle('pause-item', handlers.sound.muted, handlers.sound.toggle),
        item(t('school.list'), handlers.lessons),
        item(t('pause.quit'), handlers.quit))));
}
