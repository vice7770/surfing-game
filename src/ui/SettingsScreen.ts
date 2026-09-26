import { readPads, type PadState } from '../game/Bindings';
import type { SettingsStore, SettingsTab } from '../game/Settings';
import { el, icon } from './dom';
import { ICONS } from './icons';
import { applyRow, settingsModel, type Row, type SettingsContext } from './settingsModel';
import { t, type StringKey } from './strings';

const TABS: readonly SettingsTab[] = ['gameplay', 'graphics', 'controls', 'accessibility'];
/** Pressing B while waiting for a gamepad button cancels, as Esc does for a key. */
const CANCEL_BUTTON = 1;

export interface SettingsScreenOptions {
  store: SettingsStore;
  context: () => SettingsContext;
  onBack(): void;
  onRedetect(): void;
  /** While a binding waits for a key or button, the menu's own keys and buttons stand down. */
  onCapture(capturing: boolean): void;
  pads?: () => PadState[];
}

/**
 * Settings (plan P8): four tabs whose rows come from `settingsModel`. Every change
 * applies at once through the store; each tab has its own Reset.
 */
export function createSettingsScreen(options: SettingsScreenOptions): HTMLElement {
  const { store } = options;
  let tab: SettingsTab = 'gameplay';
  const tabBar = el('div', { class: 'settings-tabs', attrs: { role: 'tablist' } });
  const body = el('div', { class: 'settings-body' });
  const status = el('p', { class: 'settings-status', attrs: { role: 'status' } });
  const root = el('section', { class: 'screen screen-panel', attrs: { 'aria-label': t('settings.title') } },
    el('div', { class: 'panel panel-settings' },
      el('header', { class: 'panel-header' },
        el('button', { class: 'icon-back', attrs: { type: 'button', 'aria-label': t('settings.back') }, dataset: { nav: '' }, on: { click: options.onBack } }, icon(ICONS.back)),
        el('h2', { text: t('settings.title') })),
      tabBar,
      body,
      status,
      el('footer', { class: 'panel-footer' },
        el('button', { class: 'button-secondary', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('settings.reset'), on: { click: () => store.resetTab(tab) } }))));

  const apply = (id: string, value: string | number | boolean) => {
    const change = applyRow(store.value, id, value);
    if (!change) {
      status.textContent = t('settings.cantBind');
      render();
      return;
    }
    status.textContent = '';
    store.update(change.tab, change.patch as never);
  };

  const captureBinding = (button: HTMLButtonElement, row: Extract<Row, { kind: 'binding' }>) => {
    options.onCapture(true);
    button.textContent = t(row.device === 'keyboard' ? 'settings.pressKey' : 'settings.pressButton');
    button.classList.add('is-capturing');
    let done = false;
    const finish = (value?: string | number) => {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', onKey, true);
      options.onCapture(false);
      if (value === undefined) render();
      else apply(row.id, value);
    };
    // Capture phase, stopped there, so neither the ride controls nor the menu see the key.
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === 'Escape') finish();
      else if (row.device === 'keyboard') finish(event.code);
    };
    window.addEventListener('keydown', onKey, true);
    if (row.device === 'gamepad') {
      const read = options.pads ?? (() => readPads());
      const held = new Set<number>();
      for (const pad of read()) pad.buttons.forEach((down, index) => { if (down) held.add(index); });
      const poll = () => {
        if (done || !button.isConnected) return finish();
        for (const pad of read()) {
          const index = pad.buttons.findIndex((down, i) => down && !held.has(i));
          if (index === CANCEL_BUTTON) return finish();
          if (index >= 0) return finish(index);
        }
        for (const index of [...held]) if (!read().some((pad) => pad.buttons[index])) held.delete(index);
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    }
  };

  const control = (row: Row): HTMLElement => {
    if (row.kind === 'choice') {
      return el('div', { class: 'segmented', attrs: { role: 'group', 'aria-label': row.label } }, ...row.options.map((option) => el('button', {
        attrs: { type: 'button', 'aria-pressed': String(option.value === row.value) },
        dataset: { nav: '', focusKey: `${row.id}:${option.value}` },
        text: option.label,
        on: { click: () => apply(row.id, option.value) },
      })));
    }
    if (row.kind === 'toggle') {
      return el('button', {
        class: 'switch',
        attrs: { type: 'button', 'aria-pressed': String(row.value), 'aria-label': row.label },
        dataset: { nav: '', focusKey: row.id },
        text: t(row.value ? 'settings.on' : 'settings.off'),
        on: { click: () => apply(row.id, !row.value) },
      });
    }
    if (row.kind === 'slider') {
      const output = el('output', { text: `${Math.round(row.value * 100)} %` });
      const input = el('input', {
        attrs: { type: 'range', min: String(row.min), max: String(row.max), step: String(row.step), value: String(row.value), 'aria-label': row.label },
        dataset: { nav: '', focusKey: row.id },
        on: {
          input: () => { output.textContent = `${Math.round(Number(input.value) * 100)} %`; },
          change: () => apply(row.id, Number(input.value)),
        },
      });
      return el('div', { class: 'slider' }, input, output);
    }
    if (row.kind === 'button') {
      const button = el('button', { class: 'button-secondary', attrs: { type: 'button' }, dataset: { nav: '', focusKey: row.id }, text: row.action, on: { click: options.onRedetect } });
      button.disabled = row.disabled;
      return button;
    }
    return el('span');
  };

  const render = () => {
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.focusKey;
    tabBar.replaceChildren(...TABS.map((id) => el('button', {
      class: 'settings-tab',
      attrs: { type: 'button', role: 'tab', 'aria-selected': String(id === tab) },
      dataset: { nav: '', focusKey: `tab:${id}`, ...(id === 'gameplay' ? { navDefault: '' } : {}) },
      text: t(`settings.${id}` as StringKey),
      on: { click: () => { tab = id; status.textContent = ''; render(); } },
    })));
    const rows = settingsModel(tab, store.value, options.context());
    const children: HTMLElement[] = [];
    if (tab === 'controls') {
      children.push(el('div', { class: 'binding-row binding-head' }, el('span'), el('span', { text: t('settings.keyboard') }), el('span', { text: t('settings.gamepad') })));
    }
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.kind === 'heading') {
        children.push(el('h3', { class: 'panel-subhead', text: row.label }));
      } else if (row.kind === 'binding') {
        // An action's two keys and its button share one line.
        const group = rows.slice(i, i + 3) as Extract<Row, { kind: 'binding' }>[];
        i += 2;
        const bindingButton = (binding: typeof group[number]) => {
          const button = el('button', { class: 'binding', attrs: { type: 'button' }, dataset: { nav: '', focusKey: binding.id }, text: binding.value });
          button.addEventListener('click', () => captureBinding(button, binding));
          return button;
        };
        const help = 'help' in row && row.help ? el('small', { class: 'setting-help', text: row.help }) : null;
        children.push(el('div', { class: 'binding-row' },
          el('span', { class: 'setting-label' }, row.label, help),
          el('span', { class: 'binding-keys' }, bindingButton(group[0]), bindingButton(group[1])),
          bindingButton(group[2])));
      } else {
        const nextWave = 'nextWave' in row && row.nextWave ? el('span', { class: 'badge-inline', text: t('settings.nextWave') }) : null;
        children.push(el('div', { class: 'setting-row' }, el('span', { class: 'setting-label' }, row.label, nextWave), control(row)));
      }
    }
    body.replaceChildren(...children);
    if (focusKey) root.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
  };

  const stop = store.subscribe(() => {
    if (!root.isConnected) {
      stop();
      return;
    }
    render();
  });
  render();
  return root;
}
