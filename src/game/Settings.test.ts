import { describe, expect, it, vi } from 'vitest';
import { SETTINGS_KEY, SettingsStore, defaultSettings } from './Settings';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, data };
}

describe('SettingsStore', () => {
  it('starts from the defaults with nothing stored, or with something that is not JSON', () => {
    expect(new SettingsStore(memory()).value).toEqual(defaultSettings());
    expect(new SettingsStore(memory({ [SETTINGS_KEY]: '{oops' })).value).toEqual(defaultSettings());
  });

  it('keeps valid fields and replaces invalid ones one by one', () => {
    const stored = { gameplay: { units: 'imperial', defaultCamera: 'upside-down' }, accessibility: { uiScale: 9 },
      controls: { bindings: { keyboard: { paddle: ['KeyW'], popUp: [] }, gamepad: { retry: [99] } } } };
    const store = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify(stored) }));
    expect(store.value.gameplay.units).toBe('imperial');
    expect(store.value.gameplay.defaultCamera).toBe('front');
    expect(store.value.accessibility.uiScale).toBe(1);
    expect(store.value.controls.bindings.keyboard.paddle).toEqual(['KeyW']);
    expect(store.value.controls.bindings.keyboard.popUp).toEqual(['Enter']);
    expect(store.value.controls.bindings.gamepad.retry).toEqual([3]);
  });

  it('saves every change, and keeps working when the storage throws', () => {
    const storage = memory();
    const store = new SettingsStore(storage);
    store.update('gameplay', { units: 'imperial' });
    expect(JSON.parse(storage.data.get(SETTINGS_KEY)!).gameplay.units).toBe('imperial');
    const broken = new SettingsStore({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } });
    expect(() => broken.update('accessibility', { uiScale: 1.2 })).not.toThrow();
    expect(broken.value.accessibility.uiScale).toBe(1.2);
  });

  it('resets one tab and leaves the others', () => {
    const store = new SettingsStore(memory());
    store.update('gameplay', { units: 'imperial' });
    store.update('accessibility', { uiScale: 1.3 });
    store.resetTab('gameplay');
    expect(store.value.gameplay.units).toBe('metric');
    expect(store.value.accessibility.uiScale).toBe(1.3);
  });

  it('tells subscribers what changed', () => {
    const store = new SettingsStore(memory());
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    store.setDetected({ preset: 'high', water: 'accurate', lowPerformance: false, adapter: 'GPU' });
    expect(listener).toHaveBeenLastCalledWith(store.value, 'detected');
    stop();
    store.markSeen('rideHints');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps a detection only when all of it is valid', () => {
    const valid = { preset: 'low', water: 'fast', lowPerformance: true, adapter: 'Intel' };
    expect(new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ detected: valid }) })).value.detected).toEqual(valid);
    const broken = { ...valid, preset: 'turbo' };
    expect(new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ detected: broken }) })).value.detected).toBeUndefined();
  });

  // S1: the Audio tab and Mono audio.
  it('starts the Audio tab at full volume with muting out of view on, and Mono off', () => {
    const { audio, accessibility } = new SettingsStore(memory()).value;
    expect(audio).toEqual({ master: 1, sea: 1, board: 1, ui: 1, muteInBackground: true });
    expect(accessibility.monoAudio).toBe(false);
  });

  it('loads an older save without an Audio tab, and replaces a volume out of range', () => {
    const older = { gameplay: { units: 'imperial' }, accessibility: { uiScale: 1.2 } };
    const store = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify(older) }));
    expect(store.value.audio.master).toBe(1);
    expect(store.value.gameplay.units).toBe('imperial');
    const loud = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ audio: { master: 3, sea: 0.4, muteInBackground: false } }) }));
    expect(loud.value.audio).toMatchObject({ master: 1, sea: 0.4, muteInBackground: false });
  });
});

