import { describe, expect, it } from 'vitest';
import { PRESETS } from '../game/Graphics';
import type { PadKind } from '../game/Bindings';
import { defaultSettings } from '../game/Settings';
import type { SteamStatus } from '../game/steam/SteamControllerDriver';
import { applyRow, settingsModel } from './settingsModel';

const context = { devTools: false, detecting: false };

describe('settingsModel', () => {
  it('offers telemetry only with the dev tools on', () => {
    const ids = (devTools: boolean) => settingsModel('gameplay', defaultSettings(), { ...context, devTools }).map((row) => row.id);
    expect(ids(false)).toEqual(['units', 'defaultCamera', 'touchControls', 'balanceMeter', 'pocketReflex', 'scoreRides', 'nameTags']);
    expect(ids(true)).toContain('showTelemetry');
  });

  // P9: the balance meter, in Practice by default; and a line on what each new action does.
  it('offers the balance meter in Practice by default, and explains the standing actions', () => {
    expect(settingsModel('gameplay', defaultSettings(), context).find((r) => r.id === 'balanceMeter')).toMatchObject({ kind: 'choice', value: 'practice' });
    expect(applyRow(defaultSettings(), 'balanceMeter', 'never')).toEqual({ tab: 'gameplay', patch: { balanceMeter: 'never' } });
    // The riding-the-wave spec: the pocket reflex, a choice like the balance meter's.
    expect(settingsModel('gameplay', defaultSettings(), context).find((r) => r.id === 'pocketReflex')).toMatchObject({ kind: 'choice', value: 'practice' });
    expect(applyRow(defaultSettings(), 'pocketReflex', 'always')).toEqual({ tab: 'gameplay', patch: { pocketReflex: 'always' } });
    const rows = settingsModel('controls', defaultSettings(), context);
    const help = (action: string) => rows.find((r) => r.kind === 'binding' && r.action === action && 'help' in r)?.['help' as never];
    for (const action of ['trimForward', 'trimBack', 'crouch', 'hand']) expect(help(action)).toBeTruthy();
    expect(help('paddle')).toBeUndefined();
  });

  // P9: a WSL-style score, only if the player wants it.
  it('offers scoring rides, off by default', () => {
    const row = settingsModel('gameplay', defaultSettings(), context).find((r) => r.id === 'scoreRides');
    expect(row).toMatchObject({ kind: 'toggle', value: false });
    expect(applyRow(defaultSettings(), 'scoreRides', true)).toEqual({ tab: 'gameplay', patch: { scoreRides: true } });
  });

  // N1: names over the other surfers online, on by default.
  it('offers name tags, on by default', () => {
    const row = settingsModel('gameplay', defaultSettings(), context).find((r) => r.id === 'nameTags');
    expect(row).toMatchObject({ kind: 'toggle', value: true });
    expect(applyRow(defaultSettings(), 'nameTags', false)).toEqual({ tab: 'gameplay', patch: { nameTags: false } });
  });

  it('marks the water simulation and sea detail as taking effect on the next wave', () => {
    const rows = settingsModel('graphics', defaultSettings(), context);
    const nextWave = rows.filter((row) => 'nextWave' in row && row.nextWave).map((row) => row.id);
    expect(nextWave).toEqual(['waterSimulation', 'seaDetail']);
  });

  it('offers Re-detect on Auto only, and holds it while detecting', () => {
    const auto = settingsModel('graphics', defaultSettings(), context).find((row) => row.id === 'redetect');
    expect(auto).toMatchObject({ kind: 'button', disabled: false });
    expect(settingsModel('graphics', defaultSettings(), { ...context, detecting: true }).find((row) => row.id === 'redetect')).toMatchObject({ disabled: true });
    const low = { ...defaultSettings(), graphics: { ...defaultSettings().graphics, preset: 'low' as const } };
    expect(settingsModel('graphics', low, context).find((row) => row.id === 'redetect')).toBeUndefined();
  });

  it('lists two keys and two gamepad buttons for each of the fifteen actions (P9 adds trim, crouch and the hand; S1 adds mute; N1 the four calls; C1 a second button)', () => {
    const bindings = settingsModel('controls', defaultSettings(), context).filter((row) => row.kind === 'binding');
    expect(bindings).toHaveLength(60);
    expect(new Set(bindings.map((row) => row.kind === 'binding' && row.action)).size).toBe(15);
  });

  // Review Focus 2 and 5: the connection row by status, with the Steam advice; Safari says what it needs.
  it('offers the Steam Controller connection by its status (C1)', () => {
    const row = (steam?: SteamStatus) => settingsModel('controls', defaultSettings(), { ...context, ...(steam ? { steam } : {}) }).find((r) => r.id === 'steamConnect');
    expect(row()).toMatchObject({ kind: 'button', action: 'Needs Chrome or Arc', disabled: true });
    expect(row('disconnected')).toMatchObject({ action: 'Connect', disabled: false, help: expect.stringContaining('quit Steam') });
    expect(row('connected')).toMatchObject({ action: 'Connected', disabled: true });
    expect(applyRow(defaultSettings(), 'steamConnect', true)).toBeUndefined();
  });

  it('sets which stick trims, the response and the dead zones (C1)', () => {
    const rows = settingsModel('controls', defaultSettings(), context);
    expect(rows.find((r) => r.id === 'trimStick')).toMatchObject({ kind: 'choice', value: 'right' });
    expect(rows.find((r) => r.id === 'stickResponse')).toMatchObject({ kind: 'choice', value: 'linear' });
    expect(rows.find((r) => r.id === 'deadzoneSteam')).toMatchObject({ kind: 'slider', value: 0.05, min: 0, max: 0.3 });
    expect(rows.find((r) => r.id === 'deadzoneGamepad')).toMatchObject({ kind: 'slider', value: 0.15 });
    expect(applyRow(defaultSettings(), 'trimStick', 'left')).toEqual({ tab: 'controls', patch: { trimStick: 'left' } });
    expect(applyRow(defaultSettings(), 'deadzoneGamepad', 0.1)).toEqual({ tab: 'controls', patch: { deadzoneGamepad: 0.1 } });
  });

  it('names the pad buttons as printed on the pad used last (C1)', () => {
    const value = (id: string, padKind?: PadKind) => settingsModel('controls', defaultSettings(), { ...context, ...(padKind ? { padKind } : {}) }).find((r) => r.id === id);
    expect(value('bind:gamepad:mute:0')).toMatchObject({ value: 'Back' });
    expect(value('bind:gamepad:mute:0', 'steam')).toMatchObject({ value: 'View' });
    expect(value('bind:gamepad:hand:1', 'steam')).toMatchObject({ value: 'L4' });
    expect(value('bind:gamepad:retry:1')).toMatchObject({ value: '—' });
  });
});

describe('applyRow', () => {
  it('turns the preset to Custom for a hand-set value, and copies a chosen preset', () => {
    expect(applyRow(defaultSettings(), 'caustics', false)).toEqual({ tab: 'graphics', patch: expect.objectContaining({ preset: 'custom', caustics: false }) });
    expect(applyRow(defaultSettings(), 'preset', 'low')).toEqual({ tab: 'graphics', patch: { preset: 'low', ...PRESETS.low } });
    expect(applyRow(defaultSettings(), 'frameLimit', '30')).toEqual({ tab: 'graphics', patch: expect.objectContaining({ frameLimit: 30 }) });
  });

  it('rebinds through the swap rules, and refuses a reserved key', () => {
    expect(applyRow(defaultSettings(), 'bind:keyboard:paddle:0', 'KeyW')).toMatchObject({ tab: 'controls' });
    expect(applyRow(defaultSettings(), 'bind:keyboard:paddle:0', 'Escape')).toBeUndefined();
  });

  it('applies gameplay and accessibility values to their tabs', () => {
    expect(applyRow(defaultSettings(), 'units', 'imperial')).toEqual({ tab: 'gameplay', patch: { units: 'imperial' } });
    expect(applyRow(defaultSettings(), 'uiScale', 1.2)).toEqual({ tab: 'accessibility', patch: { uiScale: 1.2 } });
  });

  // G8: the water look among the advanced graphics.
  it('offers the water look among the advanced graphics and applies it instantly', () => {
    const rows = settingsModel('graphics', defaultSettings(), context);
    const row = rows.find((r) => r.id === 'waterLook');
    expect(row).toMatchObject({ kind: 'choice', value: 'rich' });
    expect(row && 'nextWave' in row && row.nextWave).toBeFalsy();
    const ids = rows.map((r) => r.id);
    expect(ids.indexOf('waterLook')).toBe(ids.indexOf('seaDetail') + 1);
    expect(applyRow(defaultSettings(), 'waterLook', 'classic')).toMatchObject({ tab: 'graphics', patch: { waterLook: 'classic' } });
  });
});

describe('the Audio tab (S1)', () => {
  it('has the four volumes and muting out of view, and Mono sits under Accessibility', () => {
    const rows = settingsModel('audio', defaultSettings(), { devTools: false, detecting: false });
    expect(rows.map((row) => row.id)).toEqual(['master', 'sea', 'board', 'ui', 'muteInBackground']);
    expect(rows.filter((row) => row.kind === 'slider')).toHaveLength(4);
    expect(settingsModel('accessibility', defaultSettings(), { devTools: false, detecting: false }).map((row) => row.id)).toContain('monoAudio');
  });

  it('applies volumes to the Audio tab and Mono to Accessibility', () => {
    expect(applyRow(defaultSettings(), 'sea', 0.5)).toEqual({ tab: 'audio', patch: { sea: 0.5 } });
    expect(applyRow(defaultSettings(), 'muteInBackground', false)).toEqual({ tab: 'audio', patch: { muteInBackground: false } });
    expect(applyRow(defaultSettings(), 'monoAudio', true)).toEqual({ tab: 'accessibility', patch: { monoAudio: true } });
  });
});

