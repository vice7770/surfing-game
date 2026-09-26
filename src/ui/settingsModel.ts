import { REBINDABLE, buttonLabel, keyLabel, rebind, type Action } from '../game/Bindings';
import { NEXT_WAVE_FIELDS, withAdvanced, withPreset } from '../game/Graphics';
import type { AdvancedGraphics, GameSettings, GraphicsPreset, SettingsTab } from '../game/Settings';
import { t, type StringKey } from './strings';

type Option = { value: string; label: string };

/** One row of a Settings tab, as data; labels are already in the player's words. */
export type Row =
  | { kind: 'choice'; id: string; label: string; value: string; options: Option[]; nextWave?: boolean }
  | { kind: 'toggle'; id: string; label: string; value: boolean; nextWave?: boolean }
  | { kind: 'slider'; id: string; label: string; value: number; min: number; max: number; step: number }
  | { kind: 'binding'; id: string; label: string; device: 'keyboard' | 'gamepad'; action: Action; slot: 0 | 1; value: string }
  | { kind: 'button'; id: string; label: string; action: string; disabled: boolean }
  | { kind: 'heading'; id: string; label: string };

export interface SettingsContext {
  devTools: boolean;
  detecting: boolean;
}

const options = (prefix: string, values: readonly string[]): Option[] =>
  values.map((value) => ({ value, label: t(`${prefix}.${value}` as StringKey) }));

const ADVANCED: readonly (keyof AdvancedGraphics)[] = [
  'renderScale', 'nativePixelDensity', 'frameLimit', 'waterSimulation', 'seaDetail', 'caustics', 'sprayMist', 'oceanView', 'foam',
];

function graphicsRows(settings: GameSettings, context: SettingsContext): Row[] {
  const g = settings.graphics;
  const nextWave = (id: keyof AdvancedGraphics) => NEXT_WAVE_FIELDS.includes(id);
  const presets: Option[] = [
    { value: 'auto', label: settings.detected ? t('settings.preset.auto', { preset: t(`settings.preset.${settings.detected.preset}` as StringKey) }) : t('settings.preset.autoPending') },
    ...options('settings.preset', ['low', 'medium', 'high', 'ultra']),
    ...(g.preset === 'custom' ? options('settings.preset', ['custom']) : []),
  ];
  return [
    { kind: 'choice', id: 'preset', label: t('settings.preset'), value: g.preset, options: presets },
    ...(g.preset === 'auto'
      ? [{ kind: 'button' as const, id: 'redetect', label: t('settings.detection'), action: t(context.detecting ? 'settings.detecting' : 'settings.redetect'), disabled: context.detecting }]
      : []),
    { kind: 'heading', id: 'advanced', label: t('settings.advanced') },
    { kind: 'slider', id: 'renderScale', label: t('settings.renderScale'), value: g.renderScale, min: 0.5, max: 1.25, step: 0.05 },
    { kind: 'toggle', id: 'nativePixelDensity', label: t('settings.nativePixelDensity'), value: g.nativePixelDensity },
    { kind: 'choice', id: 'frameLimit', label: t('settings.frameLimit'), value: String(g.frameLimit), options: options('settings.frameLimit', ['screen', '60', '30']) },
    { kind: 'choice', id: 'waterSimulation', label: t('settings.waterSimulation'), value: g.waterSimulation, options: options('settings.water', ['auto', 'fast', 'accurate']), nextWave: nextWave('waterSimulation') },
    { kind: 'choice', id: 'seaDetail', label: t('settings.seaDetail'), value: g.seaDetail, options: options('settings.sea', ['standard', 'rich']), nextWave: nextWave('seaDetail') },
    { kind: 'toggle', id: 'caustics', label: t('settings.caustics'), value: g.caustics },
    { kind: 'toggle', id: 'sprayMist', label: t('settings.sprayMist'), value: g.sprayMist },
    { kind: 'choice', id: 'oceanView', label: t('settings.oceanView'), value: g.oceanView, options: options('settings.ocean', ['near', 'far']) },
    { kind: 'choice', id: 'foam', label: t('settings.foam'), value: g.foam, options: options('settings.foam', ['simple', 'detailed']) },
  ];
}

function controlRows(settings: GameSettings): Row[] {
  const { bindings, handedness } = settings.controls;
  const rows: Row[] = [];
  for (const action of REBINDABLE) {
    const label = t(`action.${action}` as StringKey);
    for (const slot of [0, 1] as const) {
      const code = bindings.keyboard[action][slot];
      rows.push({ kind: 'binding', id: `bind:keyboard:${action}:${slot}`, label, device: 'keyboard', action, slot, value: code ? keyLabel(code) : '—' });
    }
    rows.push({ kind: 'binding', id: `bind:gamepad:${action}:0`, label, device: 'gamepad', action, slot: 0, value: buttonLabel(bindings.gamepad[action][0]) });
  }
  rows.push({ kind: 'choice', id: 'handedness', label: t('settings.handedness'), value: handedness, options: options('settings.hand', ['right', 'left']) });
  return rows;
}

/** The rows of one Settings tab (plan P8). */
export function settingsModel(tab: SettingsTab, settings: GameSettings, context: SettingsContext): Row[] {
  if (tab === 'gameplay') {
    const g = settings.gameplay;
    return [
      { kind: 'choice', id: 'units', label: t('settings.units'), value: g.units, options: options('settings.units', ['metric', 'imperial']) },
      { kind: 'choice', id: 'defaultCamera', label: t('settings.defaultCamera'), value: g.defaultCamera, options: options('view', ['front', 'behind', 'side', 'overview']) },
      { kind: 'choice', id: 'touchControls', label: t('settings.touchControls'), value: g.touchControls, options: options('settings.touch', ['auto', 'on', 'off']) },
      ...(context.devTools ? [{ kind: 'toggle' as const, id: 'showTelemetry', label: t('settings.showTelemetry'), value: g.showTelemetry }] : []),
    ];
  }
  if (tab === 'graphics') return graphicsRows(settings, context);
  if (tab === 'controls') return controlRows(settings);
  const a = settings.accessibility;
  return [
    { kind: 'toggle', id: 'reducedMotion', label: t('settings.reducedMotion'), value: a.reducedMotion },
    { kind: 'slider', id: 'uiScale', label: t('settings.uiScale'), value: a.uiScale, min: 0.9, max: 1.5, step: 0.05 },
    { kind: 'toggle', id: 'highContrastHud', label: t('settings.highContrastHud'), value: a.highContrastHud },
  ];
}

const GAMEPLAY = new Set(['units', 'defaultCamera', 'touchControls', 'showTelemetry']);
const ACCESSIBILITY = new Set(['reducedMotion', 'uiScale', 'highContrastHud']);

/** The store update a row's new value makes, or undefined when refused (a reserved key) or not a setting (Re-detect). */
export function applyRow(settings: GameSettings, id: string, value: string | number | boolean): { tab: SettingsTab; patch: object } | undefined {
  if (GAMEPLAY.has(id)) return { tab: 'gameplay', patch: { [id]: value } };
  if (ACCESSIBILITY.has(id)) return { tab: 'accessibility', patch: { [id]: value } };
  if (id === 'handedness') return { tab: 'controls', patch: { handedness: value } };
  if (id === 'preset') return { tab: 'graphics', patch: withPreset(settings.graphics, value as GraphicsPreset, settings.detected) };
  if ((ADVANCED as readonly string[]).includes(id)) {
    const typed = id === 'frameLimit' && value !== 'screen' ? Number(value) : value;
    return { tab: 'graphics', patch: withAdvanced(settings.graphics, { [id]: typed }) };
  }
  const binding = /^bind:(keyboard|gamepad):(\w+):([01])$/.exec(id);
  if (binding) {
    const [, device, action, slot] = binding;
    const current = settings.controls.bindings;
    const next = rebind(current, device as 'keyboard' | 'gamepad', action as Action, Number(slot) as 0 | 1, value as string | number);
    return next === current ? undefined : { tab: 'controls', patch: { bindings: next } };
  }
  return undefined;
}
