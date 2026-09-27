import { cleanName, NAME_LENGTH, type Refusal, type RoomSettings } from '../net/protocol';
import { normalizeRoomCode } from '../net/roomCode';
import { el, icon } from './dom';
import { ICONS } from './icons';
import { t, type StringKey } from './strings';
import { createSurfChoices } from './SurfScreen';

/** Room sizes on offer (spec N1: 2–50). */
export const CAP_CHOICES = [2, 5, 10, 20, 30, 40, 50] as const;

export interface MultiplayerState {
  name: string;
  code: string;
  settings: RoomSettings;
  /** Whether this browser offers WebGPU; undefined while it is being asked. */
  webGpu: boolean | undefined;
  /** Why the last attempt failed. */
  refusal?: Refusal | 'unreachable';
  /** A create or join is on its way. */
  busy?: boolean;
}

export interface MultiplayerModel {
  canCreate: boolean;
  canJoin: boolean;
  message?: StringKey;
}

/**
 * The Multiplayer screen as data (spec N1): a named player on a browser that
 * can run the shared sea may create a room, or join one with a valid code.
 */
export function multiplayerModel(state: MultiplayerState): MultiplayerModel {
  const able = state.webGpu === true && cleanName(state.name) !== undefined && !state.busy;
  const message: StringKey | undefined = state.webGpu === false ? 'online.noWebGpu'
    : state.webGpu === undefined ? 'online.checkingGpu'
      : state.refusal === 'unreachable' ? 'online.unreachable'
        : state.refusal ? `online.refused.${state.refusal}` as StringKey : undefined;
  return { canCreate: able, canJoin: able && normalizeRoomCode(state.code) !== undefined, message };
}

export interface MultiplayerHandlers {
  name(value: string): void;
  /** Make a room as `name` (as typed now). */
  create(settings: RoomSettings, name: string): void;
  join(code: string, name: string): void;
  back(): void;
}

/** Name, surfer, then join a room by its code or make one; the buttons follow what is typed. */
export function createMultiplayerScreen(initial: MultiplayerState, handlers: MultiplayerHandlers, surfer: Node): HTMLElement {
  const state: MultiplayerState = { ...initial, settings: { ...initial.settings, conditions: { ...initial.settings.conditions } } };
  const message = el('p', { class: 'online-message', attrs: { role: 'status' } });
  const createButton = el('button', {
    class: 'button-primary', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('online.create'),
    on: { click: () => { if (multiplayerModel(state).canCreate) handlers.create(state.settings, cleanName(state.name)!); } },
  });
  const joinButton = el('button', {
    class: 'button-primary', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('online.join'),
    on: { click: () => { if (multiplayerModel(state).canJoin) handlers.join(normalizeRoomCode(state.code)!, cleanName(state.name)!); } },
  });
  const refresh = () => {
    const model = multiplayerModel(state);
    createButton.disabled = !model.canCreate;
    joinButton.disabled = !model.canJoin;
    message.textContent = model.message ? t(model.message) : '';
    message.hidden = !model.message;
  };
  const nameField = el('input', {
    class: 'text-field',
    attrs: { type: 'text', maxlength: String(NAME_LENGTH), autocomplete: 'nickname', spellcheck: 'false', placeholder: t('online.namePlaceholder'), 'aria-label': t('online.name') },
    dataset: { nav: '' },
    on: {
      input: () => {
        state.name = nameField.value;
        state.refusal = undefined;
        refresh();
      },
      change: () => handlers.name(nameField.value),
    },
  });
  nameField.value = state.name;
  const codeField = el('input', {
    class: 'text-field text-field-code',
    attrs: { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'characters', placeholder: t('online.codePlaceholder'), 'aria-label': t('online.code') },
    dataset: { nav: '' },
    on: {
      input: () => {
        state.code = codeField.value;
        state.refusal = undefined;
        refresh();
      },
      keydown: (event) => { if (event.key === 'Enter') joinButton.click(); },
    },
  });
  codeField.value = state.code;
  const caps = el('div', { class: 'segmented', attrs: { role: 'group', 'aria-label': t('online.cap') } });
  for (const cap of CAP_CHOICES) {
    const button = el('button', {
      attrs: { type: 'button', 'aria-pressed': String(cap === state.settings.cap) },
      dataset: { nav: '' },
      text: String(cap),
      on: {
        click: () => {
          state.settings.cap = cap;
          for (const other of caps.querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === button));
        },
      },
    });
    caps.append(button);
  }
  const choices = createSurfChoices({ spot: state.settings.spot, conditions: state.settings.conditions }, (choice) => {
    state.settings = { ...state.settings, spot: choice.spot, conditions: choice.conditions };
  });
  refresh();
  return el('section', { class: 'screen screen-panel', attrs: { 'aria-label': t('online.title') } },
    el('div', { class: 'panel panel-online' },
      el('header', { class: 'panel-header' },
        el('button', { class: 'icon-back', attrs: { type: 'button', 'aria-label': t('surf.back') }, dataset: { nav: '' }, on: { click: handlers.back } }, icon(ICONS.back)),
        el('h2', { text: t('online.title') })),
      el('p', { class: 'panel-lead', text: t('online.lead') }),
      el('label', { class: 'field' }, el('span', { class: 'choice-label', text: t('online.name') }), nameField),
      surfer,
      message,
      el('section', { class: 'online-join' },
        el('h3', { class: 'panel-subhead', text: t('online.joinTitle') }),
        el('div', { class: 'online-join-row' }, codeField, joinButton)),
      el('section', { class: 'online-create' },
        el('h3', { class: 'panel-subhead', text: t('online.createTitle') }),
        ...choices,
        el('div', { class: 'choice-row' }, el('span', { class: 'choice-label', text: t('online.cap') }), caps),
        el('footer', { class: 'panel-footer' }, createButton))));
}
