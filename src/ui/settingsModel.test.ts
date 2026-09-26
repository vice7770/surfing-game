import { describe, expect, it } from 'vitest';
import { PRESETS } from '../game/Graphics';
import { defaultSettings } from '../game/Settings';
import { applyRow, settingsModel } from './settingsModel';

const context = { devTools: false, detecting: false };

describe('settingsModel', () => {
  it('offers telemetry only with the dev tools on', () => {
    const ids = (devTools: boolean) => settingsModel('gameplay', defaultSettings(), { ...context, devTools }).map((row) => row.id);
    expect(ids(false)).toEqual(['units', 'defaultCamera', 'touchControls', 'scoreRides']);
    expect(ids(true)).toContain('showTelemetry');
  });

  // P9: a WSL-style score, only if the player wants it.
  it('offers scoring rides, off by default', () => {
    const row = settingsModel('gameplay', defaultSettings(), context).find((r) => r.id === 'scoreRides');
    expect(row).toMatchObject({ kind: 'toggle', value: false });
    expect(applyRow(defaultSettings(), 'scoreRides', true)).toEqual({ tab: 'gameplay', patch: { scoreRides: true } });
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

  it('lists a keyboard pair and a gamepad button for each of the ten actions (P9 adds trim, crouch and the hand)', () => {
    const bindings = settingsModel('controls', defaultSettings(), context).filter((row) => row.kind === 'binding');
    expect(bindings).toHaveLength(30);
    expect(new Set(bindings.map((row) => row.kind === 'binding' && row.action)).size).toBe(10);
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
});
