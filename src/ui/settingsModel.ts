import { REBINDABLE, buttonLabel, keyLabel, rebind, type Action, type PadKind } from '../game/Bindings';
import { NEXT_WAVE_FIELDS, withAdvanced, withPreset } from '../game/Graphics';
import type { AdvancedGraphics, GameSettings, GraphicsPreset, SettingsTab } from '../game/Settings';
import { MAX_DEADZONE } from '../game/Sticks';
import type { SteamStatus } from '../game/steam/SteamControllerDriver';
import { EN, t, type StringKey } from './strings';

type Option = { value: string; label: string };

/** One row of a Settings tab, as data; labels are already in the player's words. */
export type Row =
  | { kind: 'choice'; id: string; label: string; help?: string; value: string; options: Option[]; nextWave?: boolean }
  | { kind: 'toggle'; id: string; label: string; value: boolean; nextWave?: boolean }
  | { kind: 'slider'; id: string; label: string; help?: string; value: number; min: number; max: number; step: number }
  | { kind: 'binding'; id: string; label: string; help?: string; device: 'keyboard' | 'gamepad'; action: Action; slot: 0 | 1; value: string }
  | { kind: 'button'; id: string; label: string; help?: string; action: string; disabled: boolean }
  | { kind: 'heading'; id: string; label: string };

export interface SettingsContext {
  devTools: boolean;
  detecting: boolean;
  /** The Steam Controller (spec C1); unsupported when omitted. */
  steam?: SteamStatus;
  /** Which pad was used last, so its buttons are named as printed on it; an Xbox-style pad when omitted. */
  padKind?: PadKind;
}

const options = (prefix: string, values: readonly string[]): Option[] =>
  values.map((value) => ({ value, label: t(`${prefix}.${value}` as StringKey) }));

const ADVANCED: readonly (keyof AdvancedGraphics)[] = [
  'renderScale', 'nativePixelDensity', 'frameLimit', 'waterSimulation', 'seaDetail', 'waterLook', 'caustics', 'sprayMist', 'oceanView', 'foam',
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
    { kind: 'choice', id: 'waterLook', label: t('settings.waterLook'), value: g.waterLook, options: options('settings.waterLook', ['classic', 'rich']) },
    { kind: 'toggle', id: 'caustics', label: t('settings.caustics'), value: g.caustics },
    { kind: 'toggle', id: 'sprayMist', label: t('settings.sprayMist'), value: g.sprayMist },
    { kind: 'choice', id: 'oceanView', label: t('settings.oceanView'), value: g.oceanView, options: options('settings.ocean', ['near', 'far']) },
    { kind: 'choice', id: 'foam', label: t('settings.foam'), value: g.foam, options: options('settings.foam', ['simple', 'detailed']) },
  ];
}

function controlRows(settings: GameSettings, context: SettingsContext): Row[] {
  const { bindings, handedness, trimStick, stickResponse, deadzoneSteam, deadzoneGamepad } = settings.controls;
  const steam = context.steam ?? 'unsupported';
  const kind = context.padKind ?? 'standard';
  const deadzoneHelp = t('settings.deadzone.help');
  const rows: Row[] = [
    { kind: 'heading', id: 'steamHeading', label: t('settings.steam') },
    {
      kind: 'button', id: 'steamConnect', label: t('settings.steam.connection'), help: t('settings.steam.help'),
      action: t(steam === 'unsupported' ? 'settings.steam.unsupported' : steam === 'connected' ? 'settings.steam.connected' : 'settings.steam.connect'),
      disabled: steam !== 'disconnected',
    },
    { kind: 'heading', id: 'sticks', label: t('settings.sticks') },
    { kind: 'choice', id: 'trimStick', label: t('settings.trimStick'), value: trimStick, options: options('settings.trimStick', ['right', 'left']) },
    { kind: 'choice', id: 'stickResponse', label: t('settings.stickResponse'), help: t('settings.stickResponse.help'), value: stickResponse, options: options('settings.stickResponse', ['linear', 'precise']) },
    { kind: 'slider', id: 'deadzoneSteam', label: t('settings.deadzoneSteam'), help: deadzoneHelp, value: deadzoneSteam, min: 0, max: MAX_DEADZONE, step: 0.01 },
    { kind: 'slider', id: 'deadzoneGamepad', label: t('settings.deadzoneGamepad'), help: deadzoneHelp, value: deadzoneGamepad, min: 0, max: MAX_DEADZONE, step: 0.01 },
    { kind: 'heading', id: 'buttons', label: t('settings.buttons') },
  ];
  for (const action of REBINDABLE) {
    const label = t(`action.${action}` as StringKey);
    // The standing actions (P9) say what they do, as the key card.
    const helpKey = `action.${action}.help`;
    const help = helpKey in EN ? { help: t(helpKey as StringKey) } : {};
    for (const slot of [0, 1] as const) {
      const code = bindings.keyboard[action][slot];
      rows.push({ kind: 'binding', id: `bind:keyboard:${action}:${slot}`, label, ...help, device: 'keyboard', action, slot, value: code ? keyLabel(code) : '—' });
    }
    for (const slot of [0, 1] as const) {
      rows.push({ kind: 'binding', id: `bind:gamepad:${action}:${slot}`, label, ...help, device: 'gamepad', action, slot, value: buttonLabel(bindings.gamepad[action][slot], kind) });
    }
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
      { kind: 'choice', id: 'balanceMeter', label: t('settings.balanceMeter'), value: g.balanceMeter, options: options('settings.balanceMeter', ['practice', 'always', 'never']) },
      { kind: 'toggle', id: 'scoreRides', label: t('settings.scoreRides'), value: g.scoreRides },
      ...(context.devTools ? [{ kind: 'toggle' as const, id: 'showTelemetry', label: t('settings.showTelemetry'), value: g.showTelemetry }] : []),
    ];
  }
  if (tab === 'graphics') return graphicsRows(settings, context);
  if (tab === 'controls') return controlRows(settings, context);
  if (tab === 'audio') {
    const a = settings.audio;
    return [
      { kind: 'slider', id: 'master', label: t('settings.master'), value: a.master, min: 0, max: 1, step: 0.05 },
      { kind: 'slider', id: 'sea', label: t('settings.sea'), value: a.sea, min: 0, max: 1, step: 0.05 },
      { kind: 'slider', id: 'board', label: t('settings.boardRider'), value: a.board, min: 0, max: 1, step: 0.05 },
      { kind: 'slider', id: 'ui', label: t('settings.interface'), value: a.ui, min: 0, max: 1, step: 0.05 },
      { kind: 'toggle', id: 'muteInBackground', label: t('settings.muteInBackground'), value: a.muteInBackground },
    ];
  }
  const a = settings.accessibility;
  return [
    { kind: 'toggle', id: 'reducedMotion', label: t('settings.reducedMotion'), value: a.reducedMotion },
    { kind: 'slider', id: 'uiScale', label: t('settings.uiScale'), value: a.uiScale, min: 0.9, max: 1.5, step: 0.05 },
    { kind: 'toggle', id: 'highContrastHud', label: t('settings.highContrastHud'), value: a.highContrastHud },
    { kind: 'toggle', id: 'monoAudio', label: t('settings.monoAudio'), value: a.monoAudio },
  ];
}

const GAMEPLAY = new Set(['units', 'defaultCamera', 'touchControls', 'balanceMeter', 'scoreRides', 'showTelemetry']);
const ACCESSIBILITY = new Set(['reducedMotion', 'uiScale', 'highContrastHud', 'monoAudio']);
const AUDIO = new Set(['master', 'sea', 'board', 'ui', 'muteInBackground']);
const CONTROLS = new Set(['handedness', 'trimStick', 'stickResponse', 'deadzoneSteam', 'deadzoneGamepad']);

/** The store update a row's new value makes, or undefined when refused (a reserved key) or not a setting (Re-detect). */
export function applyRow(settings: GameSettings, id: string, value: string | number | boolean): { tab: SettingsTab; patch: object } | undefined {
  if (GAMEPLAY.has(id)) return { tab: 'gameplay', patch: { [id]: value } };
  if (ACCESSIBILITY.has(id)) return { tab: 'accessibility', patch: { [id]: value } };
  if (AUDIO.has(id)) return { tab: 'audio', patch: { [id]: value } };
  if (CONTROLS.has(id)) return { tab: 'controls', patch: { [id]: value } };
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
