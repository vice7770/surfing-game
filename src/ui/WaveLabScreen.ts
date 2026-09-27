import { SURF_SPOTS, TIMES, type TimeOfDay } from '../game/SurfConditions';
import { SLOW_MOTION } from '../game/waveLab/labClock';
import { needsRebuild, timeOfDayFor, type WaveLabSettings } from '../game/waveLab/labSettings';
import type { JumpPoint } from '../game/waveLab/FlyInput';
import type { WaveInfo } from '../game/waveLab/waveInfo';
import type { PhysicalSettings } from '../game/PhysicalMode';
import type { WaterLook } from '../scene/water/waterLook';
import type { ReadoutRow } from '../wave/SwellReadout';
import { el, icon } from './dom';
import { ICONS, type IconName } from './icons';
import { labSliders, practiceNote, stormArrives, surfForecastNote } from './labPanelModel';
import { PhysicsReadoutPanel } from './PhysicsReadoutPanel';
import { t, type StringKey } from './strings';
import type { SurfScale } from './surfHeight';
import type { Units } from './units';

/** What the lab's screen asks of the app (spec L1). */
export interface WaveLabHandlers {
  /** Every edit to the draft; the light and the look apply at once, the sea waits for Apply. */
  change(draft: WaveLabSettings): void;
  apply(draft: WaveLabSettings): void;
  newSea(draft: WaveLabSettings): void;
  follow(): void;
  togglePause(): void;
  step(): void;
  setScale(scale: number): void;
  jump(point: JumpPoint): void;
  hideUi(): void;
  menu(): void;
  /** The touch stick, −1…1 (x the screen's right, y forward), and the up/down buttons. */
  stick(x: number, y: number): void;
  rise(value: number): void;
  /** Dev tools: the sound check's panel. */
  soundCheck?(): HTMLElement;
}

/** The lab's state as the screen shows it. */
export interface WaveLabView {
  paused: boolean;
  scale: number;
  following: boolean;
  uiHidden: boolean;
  info?: WaveInfo;
  readout?: ReadoutRow[];
}

export interface WaveLabScreen {
  root: HTMLElement;
  update(view: WaveLabView): void;
  /** The sea now running (after Apply): Apply greys out until the draft differs again. */
  setRunning(settings: WaveLabSettings): void;
}

const clone = (settings: WaveLabSettings): WaveLabSettings => ({ ...settings, physical: { ...settings.physical } });

/** A row of toggle buttons; the pressed one is `current`. */
function segmented<T extends string | number>(choices: readonly { value: T; label: string }[], current: T, pick: (value: T) => void, key: string): HTMLElement {
  return el('div', { class: 'segmented' }, ...choices.map((choice) => el('button', {
    attrs: { type: 'button', 'aria-pressed': String(choice.value === current) },
    dataset: { nav: '', key: `${key}:${choice.value}` },
    text: choice.label,
    on: { click: () => pick(choice.value) },
  })));
}

/**
 * The Wave Lab's screen (spec L1): a toolbar across the top, the settings panel
 * (closed until asked for), the info card at the foot, and on touch a stick to
 * fly with. Everything sits at the edges, and H hides it all.
 */
export function createWaveLabScreen(
  options: { settings: WaveLabSettings; running: WaveLabSettings; devTools: boolean; touch: boolean; units: Units; scale?: SurfScale },
  handlers: WaveLabHandlers,
): WaveLabScreen {
  const draft = clone(options.settings);
  let running = clone(options.running);
  const { units } = options;
  const scale = options.scale ?? 'face';

  const tool = (name: IconName, label: StringKey, action: () => void, attrs: Record<string, string> = {}) => el('button', {
    class: 'lab-tool', attrs: { type: 'button', title: t(label), ...attrs }, dataset: { nav: '' }, on: { click: action },
  }, icon(ICONS[name]), el('span', { text: t(label) }));

  // The settings panel.
  const panel = el('aside', { class: 'lab-panel', attrs: { 'aria-label': t('lab.settings') } });
  panel.hidden = true;
  const pending = el('p', { class: 'lab-pending', text: t('lab.pending') });
  const apply = el('button', { class: 'button-primary', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('lab.apply'), on: { click: () => handlers.apply(clone(draft)) } });
  const newSea = el('button', { class: 'button-secondary', attrs: { type: 'button' }, dataset: { nav: '' }, text: t('lab.newSea'), on: { click: () => handlers.newSea(clone(draft)) } });
  let soundPanel: HTMLElement | undefined;

  const refreshApply = () => {
    const waiting = needsRebuild(running, draft);
    apply.disabled = !waiting;
    pending.hidden = !waiting;
  };
  const edited = (structural: boolean) => {
    refreshApply();
    handlers.change(clone(draft));
    if (structural) renderPanel();
  };
  const setPhysical = <K extends keyof PhysicalSettings>(key: K, value: PhysicalSettings[K], structural = true) => {
    draft.physical[key] = value;
    edited(structural);
  };
  const slider = (label: string, min: number, max: number, step: number, value: number, text: string, onInput: (value: number, output: HTMLOutputElement) => void, disabled = false) => {
    const output = el('output', { text });
    const input = el('input', { attrs: { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value) } });
    input.disabled = disabled;
    input.addEventListener('input', () => onInput(Number(input.value), output));
    return el('label', { class: 'slider' }, el('span', { text: label }), input, output);
  };
  const group = (legend: StringKey, ...children: (Node | null)[]) => el('fieldset', { class: 'lab-group' }, el('legend', { text: t(legend) }), ...children);

  function renderPanel(): void {
    const focused = (document.activeElement as HTMLElement | null)?.dataset?.key;
    const { physical } = draft;
    const sliders = labSliders(physical, units);
    const sliderRows = (which: 'swell' | 'conditions') => sliders.filter((s) => s.group === which).map((s) => slider(s.label, s.min, s.max, s.step, s.value, s.text, (value, output) => {
      draft.physical[s.key] = value;
      output.textContent = labSliders(draft.physical, units).find((next) => next.key === s.key)?.text ?? '';
      if (derived && physical.source === 'storm') derived.textContent = stormArrives(draft.physical, units);
      // The forecast follows every swell slider, the period as much as the height (the wave-sizes spec).
      if (derived && physical.source === 'buoy') derived.textContent = surfForecastNote(draft.physical, units, scale);
      edited(false);
    }, s.disabled));
    const derived = physical.source === 'storm' ? el('p', { class: 'lab-derived', text: stormArrives(physical, units) })
      : physical.source === 'practice' ? el('p', { class: 'lab-note', text: practiceNote(units, physical.spot) })
        : el('p', { class: 'lab-derived', text: surfForecastNote(physical, units, scale) });
    const time = timeOfDayFor(draft);
    const sunHeight = slider(t('lab.sunHeight'), 0, 1, 0.05, draft.sunHeight, `${Math.round(draft.sunHeight * 100)} %`, (value, output) => {
      draft.sunHeight = value;
      output.textContent = `${Math.round(value * 100)} %`;
      edited(false);
    });
    const sunDirection = slider(t('lab.sunDirection'), -180, 180, 5, draft.sunDirection, `${draft.sunDirection}°`, (value, output) => {
      draft.sunDirection = value;
      output.textContent = `${value}°`;
      edited(false);
    });
    panel.replaceChildren(...[
      group('lab.group.break', segmented(SURF_SPOTS.map((spot) => ({ value: spot, label: t(`spot.${spot}` as StringKey) })), physical.spot, (spot) => setPhysical('spot', spot), 'spot')),
      group('lab.group.swell',
        segmented((['buoy', 'storm', 'practice'] as const).map((source) => ({ value: source, label: t(`lab.source.${source}`) })), physical.source, (source) => setPhysical('source', source), 'source'),
        ...sliderRows('swell'), derived),
      group('lab.group.conditions', ...sliderRows('conditions')),
      group('lab.group.light',
        segmented((Object.keys(TIMES) as TimeOfDay[]).map((value) => ({ value, label: t(`cond.time.${value}` as StringKey) })), time, (value) => {
          if (value === 'custom') return;
          Object.assign(draft, TIMES[value]);
          edited(true);
        }, 'time'),
        sunHeight, sunDirection),
      group('lab.group.water', segmented((['classic', 'rich'] as const).map((look) => ({ value: look, label: t(`lab.look.${look}`) })), draft.waterLook, (look: WaterLook) => {
        draft.waterLook = look;
        edited(true);
      }, 'look')),
      options.devTools ? group('lab.group.dev',
        // The graphics settings' water (as Surf runs it), or a solver and compute chosen here.
        segmented([{ value: 'graphics', label: 'As Graphics' }, { value: 2, label: 'Boussinesq' }, { value: 1, label: 'Shallow water' }] as const,
          draft.water === 'graphics' ? 'graphics' : physical.stage, (choice) => {
            if (choice === 'graphics') {
              draft.water = 'graphics';
              edited(true);
            } else {
              draft.water = 'chosen';
              setPhysical('stage', choice);
            }
          }, 'stage'),
        draft.water === 'chosen'
          ? segmented([{ value: 'auto', label: 'GPU when available' }, { value: 'cpu', label: 'CPU only' }] as const, physical.compute, (compute) => setPhysical('compute', compute), 'compute')
          : null,
        handlers.soundCheck ? el('button', {
          class: 'button-secondary', attrs: { type: 'button' }, dataset: { nav: '' }, text: 'Sound check',
          on: {
            click: () => {
              if (soundPanel) {
                soundPanel.remove();
                soundPanel = undefined;
              } else {
                soundPanel = handlers.soundCheck!();
                root.append(soundPanel);
              }
            },
          },
        }) : null) : null,
      pending,
      el('div', { class: 'lab-actions' }, apply, newSea),
    ].filter((child) => child !== null));
    refreshApply();
    if (focused) panel.querySelector<HTMLElement>(`[data-key="${focused}"]`)?.focus();
  }

  // The toolbar.
  const settingsTool = tool('settings', 'lab.settings', () => {
    panel.hidden = !panel.hidden;
    settingsTool.setAttribute('aria-expanded', String(!panel.hidden));
  }, { 'aria-expanded': 'false' });
  const followTool = tool('follow', 'lab.follow', () => handlers.follow(), { 'aria-pressed': 'false' });
  const playTool = tool('pause', 'lab.pauseSea', () => handlers.togglePause());
  const stepTool = tool('step', 'lab.step', () => handlers.step());
  stepTool.disabled = true;
  const speeds = SLOW_MOTION.map((scale) => el('button', {
    attrs: { type: 'button', 'aria-pressed': String(scale === 1) }, dataset: { nav: '' }, text: `${scale}×`, on: { click: () => handlers.setScale(scale) },
  }));
  const jumps = ([1, 2, 3, 4] as const).map((point) => el('button', {
    attrs: { type: 'button', title: `${point}` }, dataset: { nav: '' }, text: t(`lab.jump.${point}`), on: { click: () => handlers.jump(point) },
  }));
  const menu = el('button', {
    class: 'hud-pause lab-menu', attrs: { type: 'button', 'aria-label': t('lab.menu') }, dataset: { nav: '' }, on: { click: () => handlers.menu() },
  }, icon(ICONS.pause));
  const toolbar = el('div', { class: 'lab-toolbar', attrs: { role: 'toolbar', 'aria-label': t('lab.title') } },
    settingsTool, followTool, playTool, stepTool,
    el('div', { class: 'segmented lab-speed', attrs: { 'aria-label': t('lab.slowMotion') } }, ...speeds),
    el('div', { class: 'segmented lab-speed lab-jumps' }, ...jumps),
    tool('eye', 'lab.hideUi', () => handlers.hideUi()),
    menu);
  // A mouse click hands the keys back to the scene, so Space pauses the sea instead of pressing the button again.
  toolbar.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse') (document.activeElement as HTMLElement | null)?.blur();
  });

  // The info card.
  const summary = el('strong', { text: '…' });
  const infoRows = el('dl', { class: 'lab-info-rows' });
  const readoutList = el('dl');
  const readout = options.devTools ? new PhysicsReadoutPanel(readoutList) : undefined;
  const infoHead = el('button', { class: 'lab-info-head', attrs: { type: 'button', 'aria-expanded': 'true' }, dataset: { nav: '' } }, summary, el('small', { text: t('lab.info') }));
  infoHead.addEventListener('click', () => {
    const open = infoHead.getAttribute('aria-expanded') !== 'true';
    infoHead.setAttribute('aria-expanded', String(open));
    infoRows.hidden = !open;
    readoutList.hidden = !open;
  });
  const info = el('aside', { class: 'lab-info', attrs: { 'aria-live': 'off' } }, infoHead, infoRows,
    options.devTools ? el('div', { class: 'physics-readout' }, readoutList) : null);
  // On a phone the card starts folded, so it leaves the wave in view.
  if (options.touch) {
    infoHead.setAttribute('aria-expanded', 'false');
    infoRows.hidden = true;
    readoutList.hidden = true;
  }

  // Touch: a stick to fly with, and up and down.
  const touch = options.touch ? touchControls(handlers) : null;
  const show = el('button', { class: 'lab-show', attrs: { type: 'button' }, text: t('lab.showUi'), on: { click: () => handlers.hideUi() } });
  const root = el('section', { class: 'screen screen-lab', attrs: { 'aria-label': t('lab.title') } },
    toolbar, panel, info, touch,
    options.touch ? null : el('p', { class: 'lab-hint', text: t('lab.hint') }),
    show);
  renderPanel();

  return {
    root,
    update(view: WaveLabView): void {
      followTool.setAttribute('aria-pressed', String(view.following));
      playTool.replaceChildren(icon(ICONS[view.paused ? 'play' : 'pause']), el('span', { text: t(view.paused ? 'lab.playSea' : 'lab.pauseSea') }));
      stepTool.disabled = !view.paused;
      speeds.forEach((button, index) => button.setAttribute('aria-pressed', String(SLOW_MOTION[index] === view.scale)));
      root.classList.toggle('is-ui-hidden', view.uiHidden);
      if (view.info) {
        summary.textContent = view.info.summary;
        infoRows.replaceChildren(...view.info.rows.map((row) => el('div', {}, el('dt', { text: row.label }), el('dd', { text: row.value }))));
      }
      if (view.readout) readout?.render(view.readout);
    },
    setRunning(settings: WaveLabSettings): void {
      running = clone(settings);
      refreshApply();
    },
  };
}

/** The touch stick (bottom left) and the up and down buttons (spec L1). */
function touchControls(handlers: WaveLabHandlers): HTMLElement {
  const knob = el('span', { class: 'lab-stick-knob' });
  const stick = el('div', { class: 'lab-stick', attrs: { role: 'presentation' } }, knob);
  const move = (event: PointerEvent) => {
    const box = stick.getBoundingClientRect();
    const radius = box.width / 2;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    const x = clamp((event.clientX - (box.left + radius)) / radius);
    const y = clamp(-(event.clientY - (box.top + radius)) / radius);
    knob.style.transform = `translate(${x * radius * 0.6}px, ${-y * radius * 0.6}px)`;
    handlers.stick(x, y);
  };
  stick.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    stick.setPointerCapture(event.pointerId);
    move(event);
  });
  stick.addEventListener('pointermove', (event) => {
    if (stick.hasPointerCapture(event.pointerId)) move(event);
  });
  const release = () => {
    knob.style.transform = '';
    handlers.stick(0, 0);
  };
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);
  const hold = (label: StringKey, value: number) => {
    const button = el('button', { attrs: { type: 'button' }, text: t(label) });
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      handlers.rise(value);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(type, () => handlers.rise(0));
    return button;
  };
  return el('div', { class: 'lab-touch' }, stick, hold('lab.up', 1), hold('lab.down', -1));
}
