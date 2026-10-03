import { describe, expect, it, vi } from 'vitest';
import { PRESETS } from './Graphics';
import { SETTINGS_KEY, SettingsStore, defaultSettings, sanitizeSettings } from './Settings';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, data };
}

describe('SettingsStore', () => {
  it('moves old preset display limits to 60 Hz and preserves manual Custom limits', () => {
    const load = (preset: string, frameLimit: 'screen' | 60 | 30) =>
      sanitizeSettings({ graphics: { preset, frameLimit } }, defaultSettings()).graphics.frameLimit;
    for (const preset of ['auto', 'low', 'medium', 'high', 'ultra']) expect(load(preset, 'screen')).toBe(60);
    expect(load('custom', 'screen')).toBe('screen');
    expect(load('custom', 30)).toBe(30);
    expect(load('custom', 60)).toBe(60);
  });

  it('reads surf as faces unless the player chose the Hawaiian scale, and old saves as faces (wave sizes)', () => {
    const defaults = defaultSettings();
    expect(defaults.gameplay.surfScale).toBe('face');
    expect(sanitizeSettings({ gameplay: { surfScale: 'hawaiian' } }, defaults).gameplay.surfScale).toBe('hawaiian');
    expect(sanitizeSettings({ gameplay: { units: 'imperial' } }, defaults).gameplay.surfScale).toBe('face');
    expect(sanitizeSettings({ gameplay: { surfScale: 'feet' } }, defaults).gameplay.surfScale).toBe('face');
  });

  // G8: the Rich water, and a saved Low player kept on the Classic water.
  it('defaults the water look to Rich and keeps an old Low save on Classic', () => {
    expect(defaultSettings().graphics.waterLook).toBe('rich');
    const { waterLook: _low, ...oldLow } = { preset: 'low', ...PRESETS.low };
    expect(new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ graphics: oldLow }) })).value.graphics.waterLook).toBe('classic');
    const { waterLook: _auto, ...oldAuto } = { preset: 'auto', ...PRESETS.low };
    const detected = { preset: 'low', water: 'fast', lowPerformance: true, adapter: 'test' };
    expect(new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ graphics: oldAuto, detected }) })).value.graphics.waterLook).toBe('classic');
    const { waterLook: _medium, ...oldMedium } = { preset: 'medium', ...PRESETS.medium };
    expect(new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ graphics: oldMedium }) })).value.graphics.waterLook).toBe('rich');
  });

  it('keeps an old Custom save on Classic where the benchmark rated the machine Low, and on Rich elsewhere', () => {
    const { waterLook: _custom, ...oldCustom } = { preset: 'custom', ...PRESETS.low };
    const low = { preset: 'low', water: 'fast', lowPerformance: true, adapter: 'test' };
    const medium = { preset: 'medium', water: 'fast', lowPerformance: false, adapter: 'test' };
    expect(new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ graphics: oldCustom, detected: low }) })).value.graphics.waterLook).toBe('classic');
    expect(new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ graphics: oldCustom, detected: medium }) })).value.graphics.waterLook).toBe('rich');
  });

  it('defaults particles to Medium, takes an old save’s preset’s, and preserves explicit settings', () => {
    expect(defaultSettings().graphics.particles).toBe('medium');
    const load = (graphics: object, detected?: object) =>
      new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ graphics, ...(detected ? { detected } : {}) }) })).value.graphics.particles;
    const { particles: _low, ...oldLow } = { preset: 'low', ...PRESETS.low };
    expect(load(oldLow)).toBe('low');
    for (const preset of ['medium', 'high', 'ultra'] as const) {
      const { particles: _preset, ...old } = { preset, ...PRESETS[preset] };
      expect(load(old)).toBe(PRESETS[preset].particles);
    }
    const { particles: _auto, ...oldAuto } = { preset: 'auto', ...PRESETS.medium };
    expect(load(oldAuto)).toBe('medium');
    expect(load(oldAuto, { preset: 'high', water: 'accurate', lowPerformance: false, adapter: 'test' })).toBe('high');
    expect(load(oldAuto, { preset: 'low', water: 'fast', lowPerformance: true, adapter: 'test' })).toBe('low');
    const { particles: _custom, ...oldCustom } = { preset: 'custom', ...PRESETS.medium };
    expect(load(oldCustom)).toBe('medium');
    expect(load(oldCustom, { preset: 'low', water: 'fast', lowPerformance: true, adapter: 'test' })).toBe('low');
    expect(load({ ...oldCustom, particles: 'medium' })).toBe('medium');
    expect(load({ ...oldAuto, particles: 'high' })).toBe('high');
    expect(load({ ...oldCustom, particles: 'ultra' })).toBe('medium');
  });

  // C1: the stick settings, with their defaults and ranges.
  it('keeps the stick settings within their ranges', () => {
    expect(defaultSettings().controls).toMatchObject({ trimStick: 'right', stickResponse: 'linear', deadzoneSteam: 0.05, deadzoneGamepad: 0.15 });
    expect(defaultSettings().seen.steamController).toBe(false);
    const stored = { controls: { trimStick: 'up', stickResponse: 'precise', deadzoneSteam: 0.9, deadzoneGamepad: 0.2, bindings: { gamepad: { retry: [3, 20] } } } };
    const store = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify(stored) }));
    expect(store.value.controls).toMatchObject({ trimStick: 'right', stickResponse: 'precise', deadzoneSteam: 0.05, deadzoneGamepad: 0.2 });
    expect(store.value.controls.bindings.gamepad.retry).toEqual([3, 20]);
  });

  // Review Focus 4: a save from before C1 moves the hand to LB and adds the grips, once, unless those buttons are taken.
  it('moves a saved hand on X to LB and L4, and pop-up to A and R4, just once', () => {
    const old = (gamepad: object, extra: object = {}) =>
      new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ controls: { bindings: { gamepad }, ...extra } }) })).value.controls.bindings.gamepad;
    expect(old({ hand: [2], popUp: [0] })).toMatchObject({ hand: [4, 17], popUp: [0, 18], callParty: [2] });
    expect(old({ hand: [2], camera: [4] })).toMatchObject({ hand: [2], camera: [4] });
    expect(old({ hand: [2] }, { padLayout: 2 })).toMatchObject({ hand: [2] });
    // A save from after N1 moves the party call off LB with the hand, as one layout.
    expect(old({ hand: [2], callParty: [4] })).toMatchObject({ hand: [4, 17], callParty: [2] });
  });

  // Review Focus 1 (the wipeout spec): a new action takes only the defaults a save leaves free.
  it('gives the new Duck-dive only the defaults a saved lying-down binding leaves free', () => {
    const saved = { controls: { bindings: { keyboard: { paddle: ['KeyS'] }, gamepad: { paddle: [6] } }, padLayout: 2 } };
    const store = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify(saved) }));
    const { keyboard, gamepad } = store.value.controls.bindings;
    expect(keyboard.paddle).toEqual(['KeyS']);
    expect(keyboard.duckDive).toEqual(['ArrowDown']);
    expect(gamepad.paddle).toEqual([6]);
    expect(gamepad.duckDive).toEqual([13]);
    expect(defaultSettings().controls.bindings.keyboard.duckDive).toEqual(['KeyS', 'ArrowDown']);
  });

  it('leaves the new Duck-dive unbound when a save took both its defaults', () => {
    const saved = { controls: { bindings: { keyboard: { paddle: ['KeyS', 'ArrowDown'] } }, padLayout: 2 } };
    const { keyboard } = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify(saved) })).value.controls.bindings;
    expect(keyboard.paddle).toEqual(['KeyS', 'ArrowDown']);
    expect(keyboard.duckDive).toEqual([]);
  });

  // The stances spec, the final review: a save from before Compress keeps its own bindings, and Compress takes Space and
  // RT only where no action live standing already holds them (unbound otherwise, to set on the Controls screen).
  it('gives Compress its default inputs on an older save only where they are free', () => {
    const saved = (bindings: object) =>
      new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ controls: { bindings, padLayout: 2 } }) })).value.controls.bindings;
    expect(saved({ keyboard: { crouch: ['Space'] }, gamepad: { hand: [7] } }))
      .toMatchObject({ keyboard: { crouch: ['Space'], compress: [] }, gamepad: { hand: [7], compress: [] } });
    expect(saved({ keyboard: { popUp: ['Space'], paddle: ['KeyP'] } }).keyboard.compress).toEqual([]);
    expect(saved({ keyboard: { crouch: ['KeyC'] } })).toMatchObject({ keyboard: { compress: ['Space'] }, gamepad: { compress: [7] } });
  });

  // The wipeout spec, Part B: the breath meter, like the balance meter.
  it('shows the breath meter in Practice by default, and sanitizes it', () => {
    expect(defaultSettings().gameplay.breathMeter).toBe('practice');
    const saved = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ gameplay: { breathMeter: 'sometimes' } }) }));
    expect(saved.value.gameplay.breathMeter).toBe('practice');
    const never = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ gameplay: { breathMeter: 'never' } }) }));
    expect(never.value.gameplay.breathMeter).toBe('never');
  });

  // The riding-the-wave spec: the pocket reflex rides with the player on the Practice swell unless they choose otherwise.
  it('keeps the pocket reflex on the Practice swell by default, and sanitizes it', () => {
    expect(defaultSettings().gameplay.pocketReflex).toBe('practice');
    const saved = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ gameplay: { pocketReflex: 'sometimes' } }) }));
    expect(saved.value.gameplay.pocketReflex).toBe('practice');
  });

  // The stances spec: Regular or Goofy, Regular by default.
  it('rides Regular by default, and sanitizes the stance', () => {
    expect(defaultSettings().gameplay.stance).toBe('regular');
    const goofy = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ gameplay: { stance: 'goofy' } }) }));
    expect(goofy.value.gameplay.stance).toBe('goofy');
    const odd = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ gameplay: { stance: 'switch' } }) }));
    expect(odd.value.gameplay.stance).toBe('regular');
  });

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

  it('keeps the player\'s surfer, saves a change to it and tells subscribers', () => {
    const storage = memory();
    const store = new SettingsStore(storage);
    const heard = vi.fn();
    store.subscribe(heard);
    store.setSurfer({ body: 'surfer3', board: 'midnight' });
    expect(store.value.surfer).toMatchObject({ body: 'surfer3', board: 'midnight', outfit: 'fullsuit' });
    expect(heard).toHaveBeenCalledWith(store.value, 'surfer');
    expect(new SettingsStore(storage).value.surfer.body).toBe('surfer3');
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

describe('SettingsStore online (N1)', () => {
  const token = (n: number) => n.toString(16).padStart(32, '0');
  const code = (n: number) => `ABCD23${'ABCDEFGHJKMN'[n]}${'ABCDEFGHJKMN'[n]}`;

  it('shows name tags by default, starts with no name, and loads an older save without them', () => {
    const store = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ gameplay: { units: 'imperial' } }) }));
    expect(store.value.gameplay.nameTags).toBe(true);
    // The movement-flow spec: a save from before the stance readout shows it (Review Focus 5).
    expect(store.value.gameplay.stanceReadout).toBe(true);
    expect(store.value.online).toEqual({ name: '', tokens: {} });
  });

  it('keeps a clean name, and drops a bad one', () => {
    const store = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ online: { name: '  Ana\n Rita ', tokens: {} } }) }));
    expect(store.value.online.name).toBe('Ana Rita');
    const bad = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ online: { name: 42 } }) }));
    expect(bad.value.online.name).toBe('');
  });

  it('remembers the token for each room, the last 10 only, and nothing malformed', () => {
    const store = new SettingsStore(memory());
    const listener = vi.fn();
    store.subscribe(listener);
    for (let i = 0; i < 12; i += 1) store.rememberRoom(code(i), token(i));
    expect(Object.keys(store.value.online.tokens)).toHaveLength(10);
    expect(Object.values(store.value.online.tokens)).not.toContain(token(0));
    expect(store.value.online.tokens[code(11)]).toBe(token(11));
    expect(listener).toHaveBeenLastCalledWith(store.value, 'online');
    const loaded = new SettingsStore(memory({ [SETTINGS_KEY]: JSON.stringify({ online: { name: 'Ana', tokens: { ABCD2345: token(1), nope: token(2), EFGH2345: 'short' } } }) }));
    expect(loaded.value.online.tokens).toEqual({ ABCD2345: token(1) });
  });

  it('saves the player\'s name', () => {
    const storage = memory();
    const store = new SettingsStore(storage);
    store.setOnlineName(' Bea ');
    expect(store.value.online.name).toBe('Bea');
    expect(JSON.parse(storage.data.get(SETTINGS_KEY)!).online.name).toBe('Bea');
  });
});
