# P8 Menus and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the simulator in a game: a main menu over live waves, a Surf flow on the physical surf zone with a clean ride HUD, pause and end-of-ride screens, a Logbook, and Settings (gameplay, graphics with an Auto benchmark, remappable keyboard and gamepad controls, accessibility). Today's screen becomes the Wave Lab, behind one `devTools` switch.

**Architecture:**
- **Pure logic in small modules, unit-tested in Node:**
  - strings, units, bindings, settings, graphics presets and the benchmark decision;
  - surf conditions, the ride tracker, the logbook;
  - the screen stack, spatial navigation, and each screen's view model.
- **Thin DOM renderers** build each screen from its model with a tiny `el()` helper and native CSS. They are checked in the browser pane, since Vitest runs without a DOM here and no DOM library is added.
- **`src/ui/App.ts` coordinates:** it owns the settings store, the screen stack, the logbook and the ride tracker, and calls a small public surface on `SurfGame` in `src/main.ts` (show the backdrop, start a Surf session, enter the Wave Lab, pause, apply graphics, retry, replay, new wave, cycle view).
- **`SurfGame` keeps the rendering and physics**, and reports each frame to `App` through a callback.
- **The menu background** is a riderless physical surf zone on the practice groundswell, seen by a new `cinematic` spectator view. On first launch it doubles as the Auto graphics benchmark.

**Tech Stack:** TypeScript, three.js (WebGL), native CSS, Vitest (Node environment), the Gamepad API, and the browser pane for UI checks.

**Spec:** the ROADMAP section "P0 · Menus and settings (P8)" (requirements from the grilling session of 2026-09-26), and the decision recorded that day on the CPU fallback: benchmark, and run stage 1 when stage 2 cannot keep real time; never switch stage mid-run.

## Findings (from reading the code, 2026-09-26)

- **The physical ride has no flow or balance value.** `SurfZoneStatus.ride` carries phase, speed, cue, pop-up, separation and resets. Flow is a legacy-wave manoeuvre score.
  - Task 7 adds a physical balance: the share of the standing body's balance shift still in reserve (`AttachedRider.balance.x` against `STANDING_SHIFT.x`).
  - The Surf HUD shows prompt, speed and balance. **The flow bar is left out of Surf** until a physical flow measure exists, and this is raised with the user at handoff.
- **Physical rides were never logged.** `RunHistory` records only legacy runs. The Logbook (Task 8) records physical rides through the ride tracker (Task 7), and the Wave Lab keeps `RunHistory` for legacy runs.
- **The Auto benchmark is the decided CPU fallback.** It isn't implemented yet (no benchmark code exists). Task 4 decides stage 1 or 2 from the measured worker step time. The choice applies at the start of each session, so no run ever switches mid-way.
- **Touch has no Esc.** The ride HUD gets a pause button, and touch play gets a Pop up button next to Paddle.
- **Leftovers from the dev tools:** `?demo`, `?physical`, `?record` and `?inpage` are read directly in `main.ts`, and the C key is bound there. Both move behind `devTools` and the bindings respectively.

## Global Constraints

- **No new dependencies**, runtime or dev. Plain TypeScript DOM and native CSS; `three` stays the only runtime dependency.
- **One switch:** `DEV_TOOLS` in `src/devTools.ts` gates the Wave Lab tile, the telemetry option, the Profile and Below views, and every URL flag (`demo`, `physical`, `record`, `inpage`).
- **Player-facing text only through `t()`** from `src/ui/strings.ts`, in English. Text shown only while `DEV_TOOLS` is on stays where it is today, because it is slated for removal: the Wave Lab panel, physics readout, telemetry and ride recorder.
- **Settings apply instantly** and persist under `breakline.settings.v1`; the logbook uses `breakline.logbook.v1`. Every storage access is in try/catch, and the game runs with no storage at all.
- **Never switch solver stage or compute mid-run.** Water simulation and sea detail take effect on the next wave, and the UI says so.
- **The UI never changes physics.** Settings choose among existing configurations. The balance meter reads the rider's real state.
- **Every screen works:**
  - from 320 px wide, in portrait and landscape;
  - with mouse, touch, keyboard (arrows, Enter, Esc) and gamepad (D-pad, A, B);
  - with nothing hover-only;
  - with a visible focus ring.
- **Look:** Breakline's tokens (`--ink #163a3e`, `--muted`, `--paper`, `--line`, `--accent #ef805e`, DM Sans and DM Mono, the round "B" mark), PolyTrack's tile layout, and inline SVG icons.
- **Surf spots:** Beach, Point and Reef. The Canyon stays in the Wave Lab until its catch cue works.
- **P7 is untouched:** no changes to the lip, `PlungingLip` or the Reef shape.
- **Commits:** conventional messages in the repo's style, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `.claude/launch.json` is local and not committed.

## Review Focus

1. **Stale or corrupt saved data:** older shapes, hand edits, out-of-range numbers, bad JSON, or a storage that throws on write (private mode, full quota). Each field falls back to its default, and nothing throws (tests in Task 3 and Task 8).
2. **Rebinding conflicts:**
   - a key another action uses is swapped, never shared;
   - Escape and Start can't be bound;
   - no action is ever left with no keyboard key (test in Task 2).
3. **Held input across menus and unplugged gamepads:** pausing while holding Space, or unplugging a pad mid-carve, must not leave paddle or steer stuck on resume (test in Task 2).
4. **A background tab or a spin-up stall during the benchmark** must not label a fast device Low. Intervals over 250 ms are ignored, and sampling starts only once the backdrop runs (test in Task 4).
5. **Imperial units everywhere:** HUD, end card and Logbook, while records stay stored in SI (tests in Task 12 and Task 13).

---

### Task 1: Foundations: the dev-tools switch, strings and units

**Files:**
- Create: `src/devTools.ts`, `src/devTools.test.ts`, `src/ui/strings.ts`, `src/ui/strings.test.ts`, `src/ui/units.ts`, `src/ui/units.test.ts`
- Modify: `src/main.ts:68-81` (URL flags through `devFlag` and `devParam`)

**Interfaces:**
- Produces:
  - `DEV_TOOLS: boolean` (true for now).
  - `devFlag(name: string, search?: string, enabled?: boolean): boolean`.
  - `devParam(name: string, search?: string, enabled?: boolean): string | null`. The defaults are `globalThis.location?.search ?? ''` and `DEV_TOOLS`.
  - `EN`: a flat `as const` record of dotted keys to English text. `type StringKey = keyof typeof EN`. `t(key: StringKey, vars?: Record<string, string | number>): string` fills `{name}` placeholders and throws on a missing value.
  - `type Units = 'metric' | 'imperial'`.
  - `speedParts(ms: number, units: Units): { value: string; unit: string }`: km/h or mph, rounded to whole numbers. `formatSpeed` joins the parts with a space.
  - `formatDistance(m: number, units: Units): string`: m or ft, whole numbers.
  - `formatDuration(s: number): string`: one decimal, `12.4 s`.

Seed `EN` with the menu keys (later tasks add theirs):
- `app.name` "Breakline", `app.tagline` "Surf simulator";
- `menu.surf` "Surf", `menu.waveLab` "Wave Lab", `menu.multiplayer` "Multiplayer", `menu.comingSoon` "Coming soon", `menu.logbook` "Logbook", `menu.settings` "Settings";
- `menu.fullscreen` "Fullscreen", `menu.exitFullscreen` "Exit fullscreen", `menu.version` "v{version}";
- `loading.break` "Setting the break…", `loading.paddleOut` "Paddling out…".

- [ ] **Step 1: Write the failing tests**

```ts
// src/ui/strings.test.ts
import { describe, expect, it } from 'vitest';
import { EN, t } from './strings';

describe('strings', () => {
  it('fills named placeholders', () => {
    expect(t('menu.version', { version: '0.1.0' })).toBe('v0.1.0');
  });
  it('refuses a missing placeholder value', () => {
    expect(() => t('menu.version')).toThrow(/version/);
  });
  it('has no empty text', () => {
    for (const [key, value] of Object.entries(EN)) expect(value.trim(), key).not.toBe('');
  });
});
```

```ts
// src/ui/units.test.ts
import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration, formatSpeed, speedParts } from './units';

describe('units', () => {
  it('shows speed in km/h or mph', () => {
    expect(formatSpeed(10, 'metric')).toBe('36 km/h');
    expect(formatSpeed(10, 'imperial')).toBe('22 mph');
    expect(speedParts(0, 'metric')).toEqual({ value: '0', unit: 'km/h' });
  });
  it('shows distance in metres or feet, and time in seconds', () => {
    expect(formatDistance(42.4, 'metric')).toBe('42 m');
    expect(formatDistance(42.4, 'imperial')).toBe('139 ft');
    expect(formatDuration(12.44)).toBe('12.4 s');
  });
});
```

```ts
// src/devTools.test.ts
import { describe, expect, it } from 'vitest';
import { devFlag, devParam } from './devTools';

describe('devTools', () => {
  it('reads URL flags only while the dev tools are on', () => {
    expect(devFlag('demo', '?demo=carve', true)).toBe(true);
    expect(devFlag('demo', '?demo=carve', false)).toBe(false);
    expect(devParam('demo', '?demo=carve', true)).toBe('carve');
    expect(devParam('demo', '?demo=carve', false)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail** (`npx vitest run src/devTools.test.ts src/ui`: modules not found).
- [ ] **Step 3: Implement the three modules.** In `main.ts`, replace each `new URLSearchParams(window.location.search)` read with `devParam('demo')`, `devFlag('physical')`, `devFlag('record')` and `devFlag('inpage')`.
- [ ] **Step 4: Run** `npx vitest run src/devTools.test.ts src/ui` and `npx tsc -b`. Expect PASS and no type errors.
- [ ] **Step 5: Commit** `feat: add the dev-tools switch, a strings table and display units`.

### Task 2: Actions, bindings and gamepad input

**Files:**
- Create: `src/game/Bindings.ts`, `src/game/Bindings.test.ts`, `src/game/Controls.test.ts`
- Modify: `src/game/Controls.ts` (rewrite on bindings), `src/main.ts` (remove the C-key listener at `bindUi`; construct `Controls` with handlers; call `controls.poll()` at the top of `frame`)

**Interfaces:**
- Produces, in `Bindings.ts`:
  - `ACTIONS = ['paddle', 'popUp', 'steerLeft', 'steerRight', 'retry', 'camera', 'pause'] as const`, `type Action`.
  - `REBINDABLE: readonly Action[]`: all except `pause`.
  - `interface Bindings { keyboard: Record<Action, string[]>; gamepad: Record<Action, number[]> }`, holding `KeyboardEvent.code` values and standard-mapping button indices.
  - `DEFAULT_BINDINGS`:
    - keyboard: paddle `['Space', 'ArrowUp']`, popUp `['Enter']`, steerLeft `['ArrowLeft', 'KeyA']`, steerRight `['ArrowRight', 'KeyD']`, retry `['KeyR']`, camera `['KeyC']`, pause `['Escape']`;
    - gamepad: paddle `[7]` (RT), popUp `[0]` (A), steerLeft `[14]`, steerRight `[15]`, retry `[3]` (Y), camera `[5]` (RB), pause `[9]` (Start).
  - `interface PadState { buttons: readonly boolean[]; axes: readonly number[] }`.
  - `readPads(source?: () => (Gamepad | null)[]): PadState[]` reads `navigator.getGamepads()`, skipping nulls and non-standard mappings.
  - `heldActions(keys: ReadonlySet<string>, pads: readonly PadState[], bindings: Bindings): Set<Action>`.
  - `STICK_DEADZONE = 0.15`. `padSteer(pads: readonly PadState[]): number` reads the first pad's left-stick x beyond the deadzone, rescaled to ±1.
  - `rebind(bindings: Bindings, device: 'keyboard' | 'gamepad', action: Action, slot: 0 | 1, input: string | number): Bindings`. It returns a new object, or the same object when refused:
    - it refuses `pause`, `Escape`, and button 9;
    - when another action holds the input, the slot where it held it receives the input this action had in the slot being rebound (a swap);
    - it refuses when that swap would leave the other action with no keyboard key.
  - `keyLabel(code: string): string`: `Space`, `↑ ↓ ← →` for the arrows, `R` for `KeyR`, `1` for `Digit1`, `Shift` for `ShiftLeft`/`ShiftRight`, otherwise the code.
  - `buttonLabel(index: number): string`: `A B X Y LB RB LT RT Back Start L3 R3 D-pad↑ D-pad↓ D-pad← D-pad→` for indices 0–15.
- Produces, in `Controls.ts`:
  - `new Controls(bindings: () => Bindings, handlers: { retry(): void; camera(): void; pause(): void }, env?: { target?: EventTarget; pads?: () => PadState[]; document?: Document })`.
  - `poll(): void` fires edge-triggered pad actions and reads the stick.
  - `input: BoardInput`: steer is the pad's analog value when non-zero, otherwise keyboard or touch ±1.
  - `enabled: boolean`: false clears held keys, touches and pad state.
  - `requestGetUp()` and `consumeGetUp()` as today.
- The key handler checks `(event.target as Element | null)?.tagName` for `INPUT`, `BUTTON` and `SELECT`, and never uses `instanceof HTMLInputElement`, so it runs in Node tests.
- Touch binding is guarded by `env.document ?? globalThis.document`.
- Keyup always updates the held set, even while disabled.

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/Bindings.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, buttonLabel, heldActions, keyLabel, padSteer, rebind, type PadState } from './Bindings';

const pad = (buttons: number[] = [], x = 0): PadState => ({
  buttons: Array.from({ length: 17 }, (_, i) => buttons.includes(i)), axes: [x, 0, 0, 0],
});

describe('bindings', () => {
  it('reads the default keys and pad buttons as actions', () => {
    expect(heldActions(new Set(['Space', 'KeyA']), [], DEFAULT_BINDINGS)).toEqual(new Set(['paddle', 'steerLeft']));
    expect(heldActions(new Set(), [pad([7, 15])], DEFAULT_BINDINGS)).toEqual(new Set(['paddle', 'steerRight']));
  });

  it('swaps a key another action holds, so no key does two things', () => {
    const next = rebind(DEFAULT_BINDINGS, 'keyboard', 'popUp', 0, 'Space');
    expect(next.keyboard.popUp).toEqual(['Space']);
    expect(next.keyboard.paddle).toEqual(['Enter', 'ArrowUp']);
    expect(DEFAULT_BINDINGS.keyboard.paddle).toEqual(['Space', 'ArrowUp']);
  });

  it('takes a second key from an action that keeps another', () => {
    const next = rebind(DEFAULT_BINDINGS, 'keyboard', 'retry', 1, 'KeyA');
    expect(next.keyboard.retry).toEqual(['KeyR', 'KeyA']);
    expect(next.keyboard.steerLeft).toEqual(['ArrowLeft']);
  });

  it('never binds Escape or Start, and never leaves an action without a key', () => {
    expect(rebind(DEFAULT_BINDINGS, 'keyboard', 'paddle', 0, 'Escape')).toBe(DEFAULT_BINDINGS);
    expect(rebind(DEFAULT_BINDINGS, 'gamepad', 'paddle', 0, 9)).toBe(DEFAULT_BINDINGS);
    expect(rebind(DEFAULT_BINDINGS, 'keyboard', 'retry', 1, 'Enter')).toBe(DEFAULT_BINDINGS);
  });

  it('steers from the left stick beyond its dead zone, and lets go when the pad disappears', () => {
    expect(padSteer([pad([], 0.1)])).toBe(0);
    expect(padSteer([pad([], -0.575)])).toBeCloseTo(-0.5, 6);
    expect(padSteer([pad([], 1)])).toBe(1);
    expect(padSteer([])).toBe(0);
    expect(heldActions(new Set(), [], DEFAULT_BINDINGS).size).toBe(0);
  });

  it('names keys and buttons for the screen', () => {
    expect(['Space', 'ArrowUp', 'KeyR', 'Digit1', 'ShiftLeft'].map(keyLabel)).toEqual(['Space', '↑', 'R', '1', 'Shift']);
    expect([0, 7, 9, 12].map(buttonLabel)).toEqual(['A', 'RT', 'Start', 'D-pad↑']);
  });
});
```

```ts
// src/game/Controls.test.ts
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_BINDINGS, type PadState } from './Bindings';
import { Controls } from './Controls';

const pad = (buttons: number[] = [], x = 0): PadState => ({
  buttons: Array.from({ length: 17 }, (_, i) => buttons.includes(i)), axes: [x, 0, 0, 0],
});

function setup() {
  const target = new EventTarget();
  let pads: PadState[] = [];
  const handlers = { retry: vi.fn(), camera: vi.fn(), pause: vi.fn() };
  const controls = new Controls(() => DEFAULT_BINDINGS, handlers, { target, pads: () => pads });
  const key = (type: 'keydown' | 'keyup', code: string, repeat = false) =>
    target.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
  return { controls, handlers, key, setPads: (next: PadState[]) => { pads = next; } };
}

describe('Controls', () => {
  it('fires a press once, however long the key is held', () => {
    const { handlers, key } = setup();
    key('keydown', 'KeyR');
    key('keydown', 'KeyR', true);
    expect(handlers.retry).toHaveBeenCalledTimes(1);
  });

  it('does not keep paddling after a pause taken while Space was held', () => {
    const { controls, key } = setup();
    key('keydown', 'Space');
    expect(controls.input.paddle).toBe(true);
    controls.enabled = false;
    key('keyup', 'Space');
    controls.enabled = true;
    expect(controls.input.paddle).toBe(false);
  });

  it('lets go of paddle and steer when the gamepad is unplugged', () => {
    const { controls, setPads } = setup();
    setPads([pad([7], -1)]);
    controls.poll();
    expect(controls.input).toMatchObject({ paddle: true, steer: -1 });
    setPads([]);
    controls.poll();
    expect(controls.input).toMatchObject({ paddle: false, steer: 0 });
  });

  it('pops up from the pad on the press, not while held', () => {
    const { controls, setPads } = setup();
    setPads([pad([0])]);
    controls.poll();
    expect(controls.input.getUp).toBe(true);
    controls.consumeGetUp();
    controls.poll();
    expect(controls.input.getUp).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm they fail** (`npx vitest run src/game/Bindings.test.ts src/game/Controls.test.ts`).
- [ ] **Step 3: Implement `Bindings.ts`, then rewrite `Controls.ts` on it.** In `main.ts`:
  - build `controls` with `retry: () => game.quickRetry()`, `camera: () => game.cycleView()` and `pause: () => {}` (Task 12 routes it to `App.pause()`);
  - delete the `KeyC` listener;
  - call `controls.poll()` at the top of `frame`.
- [ ] **Step 4: Run the two test files, then `npm test`.** Expect all to pass (the legacy ride tests don't use `Controls`).
- [ ] **Step 5: Commit** `feat: read keyboard and gamepad through remappable bindings`.

### Task 3: The settings store

**Files:**
- Create: `src/game/Settings.ts`, `src/game/Settings.test.ts`

**Interfaces:**
- Consumes: `Bindings`, `DEFAULT_BINDINGS` and `ACTIONS` (Task 2); `Units` (Task 1); `RideView` from `src/scene/SpectatorCamera.ts`.
- Produces:

```ts
export type SettingsTab = 'gameplay' | 'graphics' | 'controls' | 'accessibility';
export type ConcretePreset = 'low' | 'medium' | 'high' | 'ultra';
export type GraphicsPreset = 'auto' | ConcretePreset | 'custom';
export interface GameplaySettings { units: Units; defaultCamera: RideView | 'overview'; touchControls: 'auto' | 'on' | 'off'; showTelemetry: boolean }
export interface AdvancedGraphics {
  renderScale: number;            // 0.5–1.25, steps of 0.05
  nativePixelDensity: boolean;
  frameLimit: 'screen' | 60 | 30;
  waterSimulation: 'auto' | 'fast' | 'accurate';
  seaDetail: 'standard' | 'rich';
  caustics: boolean;
  sprayMist: boolean;
  oceanView: 'near' | 'far';
  foam: 'simple' | 'detailed';
}
export interface GraphicsSettings extends AdvancedGraphics { preset: GraphicsPreset }
export interface ControlSettings { bindings: Bindings; handedness: 'right' | 'left' }
export interface AccessibilitySettings { reducedMotion: boolean; uiScale: number /* 0.9–1.5 */; highContrastHud: boolean }
export interface Detection { preset: ConcretePreset; water: 'fast' | 'accurate'; lowPerformance: boolean; adapter: string }
export interface GameSettings {
  gameplay: GameplaySettings; graphics: GraphicsSettings; controls: ControlSettings; accessibility: AccessibilitySettings;
  detected?: Detection;
  seen: { rideHints: boolean; lowPerformanceNotice: boolean };
}
export const SETTINGS_KEY = 'breakline.settings.v1';
export function defaultSettings(prefersReducedMotion?: boolean): GameSettings;
export function sanitizeSettings(raw: unknown, defaults: GameSettings): GameSettings;
export type SettingsChange = SettingsTab | 'detected' | 'seen';
export class SettingsStore {
  constructor(storage?: Pick<Storage, 'getItem' | 'setItem'>, defaults?: GameSettings);
  get value(): Readonly<GameSettings>;
  update<K extends SettingsTab>(tab: K, patch: Partial<GameSettings[K]>): void;
  resetTab(tab: SettingsTab): void;
  setDetected(detection: Detection | undefined): void;
  markSeen(key: keyof GameSettings['seen']): void;
  subscribe(listener: (settings: GameSettings, change: SettingsChange) => void): () => void;
}
```

The defaults:
- gameplay: `metric`, `front`, `auto`, `false`.
- graphics: `preset: 'auto'` with the Medium values from Task 4, written out here to avoid an import cycle: `1, false, 'screen', 'auto', 'standard', true, true, 'far', 'detailed'`.
- controls: `DEFAULT_BINDINGS`, `right`.
- accessibility: `prefersReducedMotion`, `1`, `false`.
- seen: both `false`.

`sanitizeSettings` checks each field against its allowed values or range, and falls back to the default field by field. For bindings, each action must hold 1–2 strings (keyboard) or 1–2 integers from 0 to 16 (gamepad); otherwise that action's default applies. `detected` survives only when all four of its fields are valid.

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/Settings.test.ts
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
});
```

- [ ] **Step 2: Run and confirm failure** (`npx vitest run src/game/Settings.test.ts`).
- [ ] **Step 3: Implement.** `update` merges the patch, re-sanitises the whole object, saves and notifies. Storage reads and writes are wrapped in try/catch, as `RunHistory` does.
- [ ] **Step 4: Run the test file and `npx tsc -b`.** Expect PASS.
- [ ] **Step 5: Commit** `feat: keep game settings in a sanitised, saved store`.

### Task 4: Graphics presets and the Auto benchmark decision

**Files:**
- Create: `src/game/Graphics.ts`, `src/game/Graphics.test.ts`

**Interfaces:**
- Consumes: the types from Task 3.
- Produces:
  - `PRESETS: Record<ConcretePreset, AdvancedGraphics>`:

    | Preset | Render scale | Native density | Frame limit | Water | Sea | Caustics | Spray | Ocean | Foam |
    |---|---|---|---|---|---|---|---|---|---|
    | low | 0.75 | false | screen | auto | standard | false | false | near | simple |
    | medium | 1 | false | screen | auto | standard | true | true | far | detailed |
    | high | 1 | true | screen | auto | rich | true | true | far | detailed |
    | ultra | 1.25 | true | screen | auto | rich | true | true | far | detailed |

  - `withPreset(graphics: GraphicsSettings, preset: GraphicsPreset, detected?: Detection): GraphicsSettings`. It copies `PRESETS[preset]`; for `auto` it copies `PRESETS[detected?.preset ?? 'medium']`; `custom` leaves the values alone.
  - `withAdvanced(graphics: GraphicsSettings, patch: Partial<AdvancedGraphics>): GraphicsSettings` sets `preset: 'custom'`.
  - `NEXT_WAVE_FIELDS: readonly (keyof AdvancedGraphics)[] = ['waterSimulation', 'seaDetail']`.
  - `interface ResolvedGraphics { pixelRatio: number; frameInterval: number; stage: 1 | 2; compute: 'auto' | 'cpu'; richSea: boolean; caustics: boolean; sprayMist: boolean; oceanView: 'near' | 'far'; detailedFoam: boolean; stillBackdrop: boolean }`.
  - `resolveGraphics(graphics: GraphicsSettings, detected: Detection | undefined, devicePixelRatio: number): ResolvedGraphics`:
    - pixelRatio = `(nativePixelDensity ? min(dpr, 1.75) : 1) × renderScale`;
    - frameInterval = 0 for `screen`, otherwise 1000 / limit;
    - water `accurate` gives stage 2 with compute auto; `fast` gives stage 1 with compute cpu; `auto` follows `detected?.water`, defaulting to accurate;
    - stillBackdrop holds when the effective preset is `low` (the preset itself, or `auto` with `detected.preset === 'low'`).
  - `STAGE2_REALTIME_MS = 15` (provisional: a step every 1/60 s leaves the worker 1.7 ms headroom; P5 measured 12–15 ms on the CPU and 4.6 ms on the GPU).
  - `BENCHMARK_SECONDS = 6`. `MAX_SAMPLE_INTERVAL_MS = 250`.
  - `class BenchmarkRecorder { add(intervalMs: number, stepMs: number | undefined, gpuCompute: boolean): void; get done(): boolean; result(): Omit<Detection, 'adapter'> }`:
    - it counts time only from intervals of `MAX_SAMPLE_INTERVAL_MS` or less, and ignores longer ones entirely;
    - it is done after `BENCHMARK_SECONDS` of counted time.
  - `choosePreset(sample: { frameIntervals: number[]; stepMs: number[]; gpuCompute: boolean }): Omit<Detection, 'adapter'>`:
    - refresh = the 10th percentile of intervals;
    - late = the share of intervals over 1.5 × refresh;
    - water = `accurate` when the median step time is at most `STAGE2_REALTIME_MS`, else `fast`;
    - preset = late ≤ 0.05 ? (gpuCompute ? `high` : `medium`) : `low`;
    - lowPerformance = late > 0.25.

    Ultra is never chosen automatically.
  - `needsDetection(graphics: GraphicsSettings, detected: Detection | undefined, adapter: string): boolean` holds for preset `auto` with no detection, or with a different adapter.
  - `adapterName(gl: WebGLRenderingContext | WebGL2RenderingContext): string` reads `WEBGL_debug_renderer_info`'s `UNMASKED_RENDERER_WEBGL`, falling back to `gl.RENDERER`. It is untested (browser only).

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/Graphics.test.ts
import { describe, expect, it } from 'vitest';
import { defaultSettings } from './Settings';
import { BenchmarkRecorder, PRESETS, choosePreset, needsDetection, resolveGraphics, withAdvanced, withPreset } from './Graphics';

const steady = (ms: number, n = 360) => Array.from({ length: n }, () => ms);

describe('graphics', () => {
  it('picks High on a GPU tier that keeps the frame rate, Medium on the CPU', () => {
    expect(choosePreset({ frameIntervals: steady(16.7), stepMs: steady(4.6, 50), gpuCompute: true }))
      .toEqual({ preset: 'high', water: 'accurate', lowPerformance: false });
    expect(choosePreset({ frameIntervals: steady(16.7), stepMs: steady(12, 50), gpuCompute: false }).preset).toBe('medium');
  });

  it('drops to Low, and warns, when many frames are late', () => {
    const intervals = [...steady(16.7, 200), ...steady(40, 160)];
    expect(choosePreset({ frameIntervals: intervals, stepMs: steady(5, 50), gpuCompute: true }))
      .toMatchObject({ preset: 'low', lowPerformance: true });
  });

  it('runs the fast water when stage 2 steps cannot keep real time', () => {
    expect(choosePreset({ frameIntervals: steady(16.7), stepMs: steady(19, 50), gpuCompute: false }).water).toBe('fast');
  });

  it('ignores the gaps of a hidden tab', () => {
    const recorder = new BenchmarkRecorder();
    for (let i = 0; i < 20; i += 1) recorder.add(1000, 5, true);
    expect(recorder.done).toBe(false);
    for (let i = 0; i < 400; i += 1) recorder.add(16.7, 5, true);
    expect(recorder.done).toBe(true);
    expect(recorder.result().preset).toBe('high');
  });

  it('resolves pixel ratio, frame interval, water and the still backdrop', () => {
    const low = resolveGraphics(withPreset(defaultSettings().graphics, 'low'), undefined, 2);
    expect(low).toMatchObject({ pixelRatio: 0.75, frameInterval: 0, stage: 2, compute: 'auto', caustics: false, stillBackdrop: true });
    const fast = resolveGraphics({ ...defaultSettings().graphics, frameLimit: 30, waterSimulation: 'auto' },
      { preset: 'medium', water: 'fast', lowPerformance: false, adapter: 'x' }, 3);
    expect(fast).toMatchObject({ frameInterval: 1000 / 30, stage: 1, compute: 'cpu', stillBackdrop: false });
    expect(resolveGraphics(withPreset(defaultSettings().graphics, 'ultra'), undefined, 3).pixelRatio).toBeCloseTo(1.75 * 1.25, 9);
  });

  it('turns the preset to Custom when an advanced value changes, and back when a preset is chosen', () => {
    const custom = withAdvanced(withPreset(defaultSettings().graphics, 'high'), { caustics: false });
    expect(custom.preset).toBe('custom');
    expect(withPreset(custom, 'medium')).toEqual({ preset: 'medium', ...PRESETS.medium });
  });

  it('detects again when there is no detection or the graphics card changed', () => {
    const auto = defaultSettings().graphics;
    const seen = { preset: 'high' as const, water: 'accurate' as const, lowPerformance: false, adapter: 'Apple M2' };
    expect(needsDetection(auto, undefined, 'Apple M2')).toBe(true);
    expect(needsDetection(auto, seen, 'Apple M2')).toBe(false);
    expect(needsDetection(auto, seen, 'Intel UHD 620')).toBe(true);
    expect(needsDetection(withPreset(auto, 'low'), undefined, 'x')).toBe(false);
  });
});
```

- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement `Graphics.ts`.** Also add a test to `Settings.test.ts` that the default graphics equal `{ preset: 'auto', ...PRESETS.medium }`, so the two copies of the Medium values can't drift.
- [ ] **Step 4: Run both test files.** Expect PASS.
- [ ] **Step 5: Commit** `feat: choose graphics presets and the water tier from a benchmark`.

### Task 5: Graphics applied to the renderer

**Files:**
- Create: `src/game/frameLimit.ts`, `src/game/frameLimit.test.ts`
- Modify:
  - `src/scene/FarFieldOcean.ts`: `setViewDistance`, applied in `setProfile` as well.
  - `src/scene/WaterSurface.ts`: `setFoamDetail`, respected in the foam-pattern choice.
  - `src/main.ts`: `applyGraphics`, the frame limiter, the caustics, spray and FFT gates, and the stage and compute of new sessions.
- Test: `src/scene/FarFieldOcean.test.ts`, `src/scene/WaterSurface.test.ts`

**Interfaces:**
- Consumes: `ResolvedGraphics` (Task 4).
- Produces:
  - `frameDue(now: number, lastFrame: number, interval: number): boolean`. It is true when the interval is 0, or when `now − lastFrame ≥ interval − 1`.
  - `FarFieldOcean.setViewDistance(view: 'near' | 'far'): void`: `far` keeps today's fade (0.66 and 0.97 of the extent), `near` uses 0.3 and 0.47. The getter `viewFade: { start: number; end: number }` is for tests.
  - `WaterSurface.setFoamDetail(detailed: boolean): void`. When false, `foamPattern` stays 0 (the soft tint) even for sources with a current.
  - `SurfGame.applyGraphics(resolved: ResolvedGraphics): void`:
    - `renderer.setPixelRatio(resolved.pixelRatio)`, also used in `resize()`;
    - it stores `frameInterval`;
    - it gates `this.caustics` (disable when off) and the spray meshes' visibility (`physicalMode.spray.mesh`, `breakSpray.points`);
    - it calls `farField.setViewDistance` and `water.setFoamDetail`;
    - it keeps `richSea` and the stage and compute for the next `startPhysical`: `gpuTier` is passed only when `richSea`, and FFT chop renders only when `richSea` and compute is `gpu`.
  - `frame()` returns early without stepping or touching `previousFrame` when `frameDue` is false.

- [ ] **Step 1: Failing tests:**
  - `frameDue(1000, 990, 0)` is true, `frameDue(1000, 990, 1000 / 30)` is false, and `frameDue(1033, 1000, 1000 / 30)` is true.
  - After `setViewDistance('near')` on an ocean with an extent of 1500 m, `viewFade` is `{ start: 450, end: 705 }`, and `setProfile` keeps it near.
  - A `WaterSurface` on a source with a current (as in the existing foam test) has `foamPattern` 1, and 0 after `setFoamDetail(false)`.
- [ ] **Step 2: Implement, then run** `npx vitest run src/game/frameLimit.test.ts src/scene/FarFieldOcean.test.ts src/scene/WaterSurface.test.ts`, then `npx tsc -b`.
- [ ] **Step 3: Temporary wiring.** Until `App` exists (Task 10), `main.ts` builds a `SettingsStore` and calls `game.applyGraphics(resolveGraphics(...))` at start-up and on every `graphics` change.
- [ ] **Step 4: Commit** `feat: apply graphics settings to the renderer and the water`.

### Task 6: Surf conditions

**Files:**
- Create: `src/game/SurfConditions.ts`, `src/game/SurfConditions.test.ts`

**Interfaces:**
- Consumes: `PhysicalSettings`, `DEFAULT_PHYSICAL_SETTINGS` and `TANK_SWELL_LIMITS` from `src/game/PhysicalMode.ts`; `SpotName`.
- Produces:

```ts
export const SURF_SPOTS: readonly SpotName[] = ['beach', 'point', 'reef']; // the Canyon returns once its catch cue works (ROADMAP P8)
export type SwellSize = 'practice' | 'small' | 'medium' | 'big';
export type TideLevel = 'low' | 'mid' | 'high';
export type WindKind = 'offshore' | 'calm' | 'onshore';
export type TimeOfDay = 'dawn' | 'midday' | 'sunset';
export interface SurfConditions { swell: SwellSize; tide: TideLevel; wind: WindKind; time: TimeOfDay }
export const DEFAULT_CONDITIONS: SurfConditions = { swell: 'practice', tide: 'mid', wind: 'calm', time: 'midday' };
export const SWELLS = { small: { significantHeight: 0.9, peakPeriod: 9, spread: 0.3 }, medium: { significantHeight: 1.4, peakPeriod: 11, spread: 0.3 }, big: { significantHeight: 2.4, peakPeriod: 14, spread: 0.2 } } as const;
export const TIDES: Record<TideLevel, number> = { low: -0.6, mid: 0, high: 0.6 };
export const WINDS: Record<WindKind, number> = { offshore: -5, calm: 0, onshore: 6 };
export const TIMES: Record<TimeOfDay, { sunHeight: number; sunDirection: number }> = { dawn: { sunHeight: 0.1, sunDirection: -50 }, midday: { sunHeight: 0.75, sunDirection: -15 }, sunset: { sunHeight: 0.08, sunDirection: 45 } };
export const BACKDROP_TIME: TimeOfDay = 'sunset';
export function physicalSettingsFor(spot: SpotName, conditions: SurfConditions, water: { stage: 1 | 2; compute: 'auto' | 'cpu' }): PhysicalSettings;
export function backdropSettings(spot: SpotName, water: { stage: 1 | 2; compute: 'auto' | 'cpu' }): PhysicalSettings; // practice, mid tide, calm
export function nextBackdropSpot(previous: SpotName | undefined, random?: () => number): SpotName; // from SURF_SPOTS, never the previous one
```

The swell sizes are Wave Lab values. They are also initial and tunable: after Task 11, play each one on each spot, record in the plan's record whether it is catchable, and adjust only the table (never physics).

- [ ] **Step 1: Failing tests:**
  - practice maps to `source: 'practice'`;
  - `big` at high tide with onshore wind gives buoy Hs 2.4, Tp 14, tide 0.6 and wind 6, and carries the given stage and compute;
  - every swell sits within `TANK_SWELL_LIMITS`;
  - every tide and wind sits within the Wave Lab slider ranges (tide −1…1, wind −12…12);
  - `SURF_SPOTS` excludes `canyon`;
  - `nextBackdropSpot('point', () => 0)` is never `point`;
  - 100 draws with `Math.random` never repeat the previous spot.
- [ ] **Step 2: Implement, run** `npx vitest run src/game/SurfConditions.test.ts`, **commit** `feat: describe surf conditions as a few simple choices`.

### Task 7: The rider's balance, and the ride tracker

**Files:**
- Create: `src/game/RideTracker.ts`, `src/game/RideTracker.test.ts`
- Modify: `src/physics/AttachedRider.ts` (`balanceReserve`), `src/wave/SurfZoneRunner.ts` (`status().ride.balance`), `src/physics/AttachedRider.test.ts`, `src/wave/SurfZoneRunner.test.ts`

**Interfaces:**
- Produces:
  - `AttachedRider.balanceReserve: number` = `max(0, 1 − |balance.x| / reach.x)`, with `reach` = `STANDING_SHIFT` when upright and `PRONE_SHIFT` otherwise. It measures how much sideways shift the body still has before it can't recover. 1 is centred; 0 is at the limit.
  - `SurfZoneStatus.ride.balance: number`: the session rider's `balanceReserve`, and 0 once fallen.
  - In `RideTracker.ts`:

```ts
export type RideOutcome = 'wipeout' | 'complete' | 'ended';
export interface RideResult { outcome: RideOutcome; reason: StringKey; distance: number; topSpeed: number; seconds: number }
export interface RideFrame { phase: (typeof RIDER_PHASES)[number]; speed: number; resets: number; separation?: RiderSeparation; seaTime: number; x: number; z: number }
export const MIN_RIDE_SECONDS = 1;
export class RideTracker { noteRetry(): void; reset(): void; update(frame: RideFrame): RideResult | undefined }
```

- **The rules:**
  - A ride starts on the first frame with phase `standing`, and stays active through `standing` and `recover`.
  - While active, it adds the horizontal path length (|Δx, Δz| between frames), the maximum speed, and the elapsed `seaTime`.
  - It ends:
    - on `fallen`, as `wipeout` with reason `ride.reason.<balance|footSlip|lostBoard|impact>` from `separation`;
    - when `resets` grows, as `ended` with `ride.reason.retry` if `noteRetry()` came first, otherwise as `complete` with `ride.reason.outOfWave` (the board left the surf zone);
    - on any other phase (`prone`, `push` or `landing`), as `ended` with `ride.reason.retry`.
  - A ride shorter than `MIN_RIDE_SECONDS` returns `undefined`: a pop-up that fails at once is not a ride.
  - Each ride returns its result once.
- **New strings:**
  - `ride.reason.balance` "Lost balance", `ride.reason.footSlip` "Feet slipped", `ride.reason.lostBoard` "Lost the board", `ride.reason.impact` "Hit by the lip";
  - `ride.reason.retry` "Paddled back out", `ride.reason.outOfWave` "Rode it out".

- [ ] **Step 1: Failing tests.** For the rider:
  - in the tow test (`AttachedRider.test.ts`, "rides a board towed at 6 m/s"), `balanceReserve` stays above 0.5 throughout;
  - in "lets go once it tips beyond recovery", it falls below 0.1 before the rider lets go.

  If either expectation doesn't hold, record the measured values in this plan's record and ask; don't tune the rider.

  For the runner: in the existing rider test that paddles to speed, `status().ride.balance` lies within [0, 1].

  For the tracker, feed synthetic frames:
  - 3 s standing, moving 4 m/s along x, then `fallen` with `impact`, gives `wipeout`, `ride.reason.impact`, distance ≈ 12, top speed 4 and seconds ≈ 3;
  - `resets` growing while standing gives `complete`, or `ended` after `noteRetry()`;
  - 0.5 s standing then `fallen` gives `undefined`;
  - a finished ride isn't reported twice.
- [ ] **Step 2: Implement, run** `npx vitest run src/game/RideTracker.test.ts src/physics/AttachedRider.test.ts src/wave/SurfZoneRunner.test.ts` (the last two are slow; allow the 30 s timeout), **commit** `feat: measure the physical rider's balance and track each ride`.

### Task 8: The logbook

**Files:**
- Create: `src/game/Logbook.ts`, `src/game/Logbook.test.ts`

**Interfaces:**
- Consumes: `RideResult` (Task 7), `SurfConditions` (Task 6), `SpotName`.
- Produces:

```ts
export interface LoggedRide extends RideResult { spot: SpotName; conditions: SurfConditions; seed: number; at: number }
export type BestKind = 'distance' | 'topSpeed' | 'seconds';
export type SpotBests = Partial<Record<BestKind, number>>;
export const LOGBOOK_KEY = 'breakline.logbook.v1';
export const LOGBOOK_SIZE = 50;
export class Logbook {
  constructor(storage?: Pick<Storage, 'getItem' | 'setItem'>);
  get recent(): readonly LoggedRide[];     // newest first, at most LOGBOOK_SIZE
  bests(spot: SpotName): SpotBests;         // kept apart from recent, so they outlive the 50-ride window
  add(ride: LoggedRide): BestKind[];        // the records this ride set
}
```

Stored as `{ recent: LoggedRide[]; bests: Record<SpotName, SpotBests> }`. It is validated like `RunHistory`: entries with an unknown spot, a non-finite number or an unknown outcome are dropped, and invalid bests are ignored.

- [ ] **Step 1: Failing tests:**
  - it keeps the 50 newest;
  - a first ride at a spot sets all three bests; a later, longer but slower ride sets only `distance`;
  - bests survive once their ride drops out of the recent 50;
  - corrupt JSON or bad entries load as empty or filtered;
  - a throwing storage never throws out of `add`.
- [ ] **Step 2: Implement, run, commit** `feat: keep a logbook of rides and bests per spot`.

### Task 9: The UI shell

**Files:**
- Create:
  - `src/ui/dom.ts`;
  - `src/ui/ScreenStack.ts` and its test;
  - `src/ui/spatialNav.ts` and its test;
  - `src/ui/MenuInput.ts`, `src/ui/icons.ts`, `src/ui/ui.css`, `src/ui/App.ts`;
  - `.claude/launch.json` (local, not committed).
- Modify:
  - `index.html`: wrap the Wave Lab UI, move the touch controls out, and add `#ui`;
  - `src/main.ts`: export `SurfGame`, start `App`;
  - `src/style.css`: Wave Lab rules scoped under `#wave-lab`.

**Interfaces:**
- Produces:
  - `el<K extends keyof HTMLElementTagNameMap>(tag: K, props?: { class?: string; text?: string; attrs?: Record<string, string>; dataset?: Record<string, string>; on?: Partial<Record<keyof HTMLElementEventMap, (event: Event) => void>> }, ...children: (Node | string)[]): HTMLElementTagNameMap[K]`.
  - `type ScreenId = 'menu' | 'surf' | 'logbook' | 'settings' | 'ride' | 'pause' | 'wavelab'`.
  - `class ScreenStack`:
    - `constructor(root: ScreenId)`;
    - `current: ScreenId`, `stack: readonly ScreenId[]`;
    - `base: ScreenId`: the top-most of `menu`, `ride` and `wavelab`, which is the scene shown underneath;
    - `push(id)`, `back(): ScreenId | undefined` (undefined at the root), `reset(id)`.
  - `type Direction = 'up' | 'down' | 'left' | 'right'`; `interface Rect { x: number; y: number; width: number; height: number }`.
  - `spatialNext(rects: readonly Rect[], current: number, direction: Direction): number`:
    - candidates are the rects whose centre lies beyond the current centre in that direction;
    - the score is the distance along the axis plus 2 × the offset across it, and the lowest wins;
    - with no candidate it returns `current`.
  - `class MenuInput`:
    - constructor: `(options: { root: () => HTMLElement | null; onBack(): void; pads?: () => PadState[] })`;
    - `poll(): void`, called each frame;
    - `active: boolean`;
    - on the keyboard, arrows move focus with `spatialNext` over `root().querySelectorAll('[data-nav]:not([disabled])')`, and Escape calls `onBack`;
    - on a pad, the D-pad moves focus (first move on the press, repeats every 180 ms while held), A (0) clicks the focused element, and B (1) calls `onBack`;
    - when focus is outside the root, the first move focuses `[data-nav-default]` or the first item.
  - `ICONS: Record<'surf' | 'waveLab' | 'multiplayer' | 'logbook' | 'settings' | 'fullscreen' | 'pause' | 'back', string>`: inline 24×24 stroke SVG markup, `stroke="currentColor"`, 1.75 px.
  - `class App`:
    - constructor: `(game: SurfGame, controls: Controls)`;
    - it owns `SettingsStore`, `ScreenStack` and `MenuInput`;
    - `show(id: ScreenId)` sets `#app[data-screen]` and `#app[data-base]`, renders the screen into `#ui`, and focuses its default;
    - `pause(): void`;
    - `frame(intervalMs: number): void`, called by `SurfGame` each frame.
- **`index.html` changes:**
  - the top bar, hero copy, telemetry, manoeuvre call-out, tuning panel, control hint and bottom actions go inside `<div id="wave-lab">`;
  - `.touch-controls` moves out as the shared `#touch-controls`;
  - `<div id="ui" class="ui" aria-live="polite"></div>` is added;
  - `#loading` gets a `<span id="loading-text">`.
- **`ui.css`:**
  - `#wave-lab` shows only when `#app[data-base="wavelab"]`;
  - `.screen` panels on paper (`--paper`) with `backdrop-filter: blur(14px)`;
  - `.tile`: 132×132 minimum, radius 14 px, ink icon above a DM Sans 600 label, coral focus ring `outline: 3px solid var(--accent)`;
  - `.badge` in DM Mono small caps;
  - `--ui-scale` on `.ui { font-size: calc(16px * var(--ui-scale, 1)) }`;
  - `@media (prefers-reduced-motion: reduce)` and `.is-reduced-motion` switch transitions off.

For now `App` renders a placeholder menu: the brand plus the five tile buttons with no actions. Task 10 fills it in.

- [ ] **Step 1: Failing tests:**
  - `ScreenStack`: `back()` at the root is undefined; pushing `ride` then `pause` then `settings` gives current `settings` and base `ride`; `reset('menu')` clears.
  - `spatialNext`: on a 3 × 2 grid of 100 px tiles, `right` from index 0 is 1, `down` from 1 is 4, `left` from 0 stays 0, and `up` from 4 is 1. On a single column, `right` stays put.
- [ ] **Step 2: Implement.** Create `.claude/launch.json` with `{ "version": "0.0.1", "configurations": [{ "name": "breakline", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }] }`.
- [ ] **Step 3: Check in the browser pane.** Run `preview_start` with name `breakline`:
  - the loading card, then the placeholder menu over the scene, with the Wave Lab UI hidden;
  - `/?physical` still opens the Wave Lab, because `App` routes straight to `wavelab` when any dev flag is set (Task 15 adds the way in from the menu).
- [ ] **Step 4: Run** `npm test` and `npm run build`, **commit** `feat: add the screen shell, focus navigation and UI styles`.

### Task 10: The main menu over live waves, and the Auto benchmark

**Files:**
- Create: `src/ui/MainMenu.ts`, `src/ui/MainMenu.test.ts`
- Modify:
  - `src/scene/SpectatorCamera.ts` (`cinematic` view) and its test;
  - `src/game/PhysicalMode.ts` (`idleView`, `defaultView`) and its test;
  - `src/main.ts` (`surfZoneFactory`, `showBackdrop`, `frozen`, frame callback);
  - `src/ui/App.ts`.

**Interfaces:**
- Produces:
  - `menuTiles(devTools: boolean): { id: 'surf' | 'waveLab' | 'multiplayer' | 'logbook' | 'settings'; label: StringKey; icon: keyof typeof ICONS; disabled: boolean; badge?: StringKey }[]`. The order is surf, waveLab (only with dev tools), multiplayer (disabled, badge `menu.comingSoon`), logbook, settings.
  - `createMainMenu(handlers: { surf(): void; waveLab(): void; logbook(): void; settings(): void }, options: { devTools: boolean; version: string }): HTMLElement`:
    - the brand: the "B" mark, `app.name`, `app.tagline`;
    - the tiles as `button[data-nav]`, with `surf` as `data-nav-default`; the disabled tile is `aria-disabled="true"` and still focusable, and its click does nothing;
    - a bottom strip with a Fullscreen toggle (hidden when `document.fullscreenEnabled` is false) and `t('menu.version', { version })` from `package.json`.
  - `SpectatorView` gains `'cinematic'`, with constants `CINEMA_SWEEP = 55`, `CINEMA_RATE = 0.035`, `CINEMA_SHOREWARD = 60` and `CINEMA_HEIGHT = 11`:
    - the camera moves along the shore: x = focus.x + SWEEP·sin(RATE·t), z = focus.z + SHOREWARD, y = max(surface + 6, HEIGHT);
    - it looks at (focus.x + 0.5·SWEEP·sin(RATE·t), 0, focus.z − 30);
    - `SpectatorCamera.setReducedMotion(on: boolean)` freezes t;
    - t advances only in `cinematic` view.
  - `PhysicalMode.idleView: SpectatorView` (default `'overview'`): `homeView` returns it when no rider is present.
  - `PhysicalMode.defaultView: RideView | 'overview'` (default `'front'`): `start()` sets `chosenView` from it instead of `'front'`.
  - `SurfGame.surfZoneFactory(rider: boolean): SurfZoneHostFactory` replaces `createSurfZone`: a worker with `{ rider }`, or `LocalSurfZone` under `?inpage`.
  - `SurfGame.showBackdrop(spot: SpotName): Promise<void>`:
    - it runs `startPhysical` with `backdropSettings(spot, water)`, a riderless factory, the sun from `TIMES[BACKDROP_TIME]` and `idleView = 'cinematic'`;
    - when `stillBackdrop` is set, it advances 90 steps once, then sets `frozen` (no advancing, and rendering only on resize or graphics change).
  - `SurfGame.onFrame?: (intervalMs: number, status: SurfZoneStatus | undefined, gpuCompute: boolean) => void`.
  - `startPhysical(seed, settings, options?: { sun?: { sunHeight: number; sunDirection: number }; rider?: boolean })`. Without `options.sun` it reads the Wave Lab sliders as today.
- **App behaviour:**
  - boot shows `loading.break`, then the menu, and calls `showBackdrop(nextBackdropSpot(previous))` each time the menu opens from anywhere else;
  - on boot, `adapter = adapterName(renderer.getContext())`; if `needsDetection(...)`, a `BenchmarkRecorder` samples each frame while the menu shows and the backdrop is ready and not frozen, then calls `store.setDetected({ ...result, adapter })` and reapplies graphics;
  - if the result has `lowPerformance` and `seen.lowPerformanceNotice` is false, it shows a dismissible notice: `notice.lowPerformance.title` "Low performance detected", `notice.lowPerformance.body` "Check that hardware acceleration is on in your browser settings, then restart the browser.", `notice.dismiss` "Dismiss". Dismissing marks it seen.

- [ ] **Step 1: Failing tests:**
  - `menuTiles(false)` has no `waveLab`, and `menuTiles(true)` has it second; multiplayer is disabled with the badge.
  - `SpectatorCamera` in `cinematic` over a flat test scene stays at least 5 m above the surface, moves between two updates 10 s apart, doesn't move with reduced motion, and looks seaward (its target z is below focus.z).
  - `PhysicalMode`: a riderless start reports `homeView === idleView`, and a start with `defaultView = 'side'` begins in `side` once the rider is present.
- [ ] **Step 2: Implement, then check in the browser:**
  - the menu over the live cinematic waves at the rotating spots;
  - Fullscreen toggles;
  - tiles are reachable by arrows and Enter;
  - on first launch (cleared site data), `localStorage['breakline.settings.v1'].detected` appears about 6 s after the backdrop starts, and the graphics reapply;
  - a forced Low (`preset: 'low'`) shows a still frame.
- [ ] **Step 3: Run** `npm test` and `npm run build`, **commit** `feat: open on a main menu over live waves, benchmarking the device`.

### Task 11: The Surf screen and the ride HUD

**Files:**
- Create: `src/ui/SurfScreen.ts`, `src/ui/SurfScreen.test.ts`, `src/ui/ridePrompt.ts`, `src/ui/ridePrompt.test.ts`, `src/ui/RideHud.ts`
- Modify: `src/main.ts` (`startSurf`), `src/ui/App.ts`, `src/ui/ui.css`, `index.html` (a touch Pop up button in `#touch-controls`)

**Interfaces:**
- Consumes: `SURF_SPOTS`, `SurfConditions`, `physicalSettingsFor`, `TIMES` (Task 6); `ResolvedGraphics` (Task 4); `Bindings`, `keyLabel` (Task 2); `speedParts` (Task 1); `SurfZoneStatus.ride.balance` (Task 7).
- Produces:
  - `surfModel(state: { spot: SpotName; conditions: SurfConditions }): { spots: { id: SpotName; name: StringKey; blurb: StringKey; selected: boolean }[]; rows: { id: keyof SurfConditions; label: StringKey; options: { value: string; label: StringKey; selected: boolean }[] }[] }`.
  - `createSurfScreen(state, handlers: { change(state): void; paddleOut(): void; back(): void }): HTMLElement`:
    - spot cards as `button[data-nav]` in a row that wraps to one column on phones, each with an SVG sketch of its bathymetry;
    - four segmented rows;
    - a primary "Paddle out" (`surf.paddleOut`, `data-nav-default`) and Back;
    - the last choice is kept in `App` memory for the session.
  - `SurfGame.startSurf(spot: SpotName, conditions: SurfConditions, seed: number): Promise<void>`: `physicalSettingsFor(spot, conditions, water from resolved graphics)`, the rider factory, the sun from `TIMES[conditions.time]`, and `physicalMode.defaultView` from settings.
  - `ridePrompt(ride: SurfZoneStatus['ride'] | undefined, keys: { paddle: string; popUp: string; retry: string }): string`:
    - `prone` without the cue: `hud.prompt.paddle` "Hold {paddle} to paddle into a wave";
    - the cue: `hud.prompt.popUp` "Pop up now — {popUp}";
    - `push` or `landing`: `hud.prompt.rising` "Getting up…";
    - `standing` or `recover`: '' (a clean screen while riding);
    - `fallen`: `hud.prompt.fallen` "Wiped out — swim back and press {popUp} by the board, or {retry} to paddle out";
    - undefined: ''.
  - `class RideHud { constructor(root: HTMLElement, onPause: () => void); update(ride: SurfZoneStatus['ride'] | undefined, units: Units, keys: {...}, hints: boolean): void; setTouch(visible: boolean, handedness: 'right' | 'left'): void }`:
    - the prompt top-centre;
    - the speed bottom-left (`speedParts`);
    - the balance meter, a vertical bar at bottom-left that turns coral below 0.3 and shows only while standing;
    - a pause button top-right (`ICONS.pause`, aria-label `hud.pause` "Pause");
    - first-ride hints as keycaps from the bindings (`hud.hint.paddle` "Paddle", `hud.hint.popUp` "Pop up", `hud.hint.steer` "Steer", `hud.hint.pause` "Pause"), shown until `seen.rideHints`.
  - Keys come from `keyLabel(bindings.keyboard[action][0])`, or `buttonLabel` when a gamepad was the last input.
- **New strings:**
  - `surf.title` "Pick a break", `surf.paddleOut` "Paddle out", `surf.back` "Back";
  - `spot.beach` "Beach" / `spot.beach.blurb` "Sandbar peaks and rips";
  - `spot.point` "Point" / `spot.point.blurb` "Long lines along a headland";
  - `spot.reef` "Reef" / `spot.reef.blurb` "Steep shelf, fast and hollow";
  - `cond.swell` "Swell" (`cond.swell.practice` "Practice", `.small` "Small", `.medium` "Medium", `.big` "Big");
  - `cond.tide` "Tide" (Low / Mid / High);
  - `cond.wind` "Wind" (Offshore / Calm / Onshore);
  - `cond.time` "Time of day" (Dawn / Midday / Sunset).

- [ ] **Step 1: Failing tests:**
  - `surfModel` lists exactly Beach, Point and Reef, marks the selected spot and options, and has four rows in the order swell, tide, wind, time;
  - `ridePrompt` gives each phase its text with the given key labels;
  - `ridePrompt` is empty while riding.
- [ ] **Step 2: Implement, then check in the browser:**
  - Surf leads to the Point with practice conditions, then "Paddling out…", then the ride;
  - the prompt follows paddle, cue and pop-up;
  - speed and balance read sensibly while riding;
  - the screen is otherwise clean;
  - the pause button is visible;
  - touch controls show at the mobile preset.

  Play each swell size on each spot and note in this plan's record whether it is catchable.
- [ ] **Step 3: Run** `npm test` and `npm run build`, **commit** `feat: pick a break and conditions, and ride with a clean HUD`.

### Task 12: Pause, the end-of-ride card and logging rides

**Files:**
- Create: `src/ui/PauseMenu.ts`, `src/ui/RideEndCard.ts`, `src/ui/RideEndCard.test.ts`
- Modify: `src/main.ts` (`setPaused`, a frame hook exposing the board pose), `src/ui/App.ts`

**Interfaces:**
- Consumes: `RideTracker` (Task 7), `Logbook` (Task 8), `Controls.enabled` (Task 2), `SettingsStore.markSeen` (Task 3).
- Produces:
  - `SurfGame.setPaused(paused: boolean): void`: no advancing while paused; rendering carries on.
  - `SurfGame.rideFrame(): RideFrame | undefined`, built from `host.snapshot.status` and `snapshot.board`.
  - `createPauseMenu(handlers: { resume(); replay(); newWave(); camera(): string; settings(); quit() }, viewLabel: string): HTMLElement`. Camera cycles the view and relabels itself with the new view's name (`view.front` "Front", `view.behind` "Behind", `view.side` "Side", `view.overview` "Overview").
  - `endCardModel(result: RideResult, records: BestKind[], units: Units): { title: StringKey; reason: StringKey; stats: { label: StringKey; value: string }[]; newBest: boolean }`:
    - the title is `end.wipeout` "Wipeout", `end.complete` "Ride complete" or `end.ended` "Ride over";
    - the stats are `end.distance` "Distance", `end.topSpeed` "Top speed" and `end.time` "Ride time", formatted in the given units;
    - `newBest` holds when `records` is non-empty; the badge text is `end.newBest` "New best".
  - `createRideEndCard(model, handlers: { replay(); newWave(); changeSpot(); menu() }): HTMLElement`:
    - a card at bottom centre that isn't modal: the game keeps running, so a fallen rider can swim back;
    - buttons `end.replay` "Replay (R)", `end.newWave` "New wave", `end.changeSpot` "Change spot", `end.menu` "Menu";
    - it closes when the rider next stands, on R, or on any button.
- **App wiring:**
  - the pause action on `ride` or `wavelab` pushes `pause`, sets `controls.enabled = false`, and calls `game.setPaused(true)`; Resume or Esc reverses all three;
  - the pause items:
    - Replay wave is `game.replay()`;
    - New wave is `startSurf` with seed + 1 in Surf, and `game.newWave()` in the Wave Lab;
    - Settings pushes `settings` over the pause;
    - Quit to menu resets to `menu` and shows the backdrop;
    - strings `pause.title` "Paused", `pause.resume` "Resume", `pause.replay` "Replay wave", `pause.newWave` "New wave", `pause.camera` "Camera: {view}", `pause.settings` "Settings", `pause.quit` "Quit to menu";
  - each frame on `ride`, `tracker.update(game.rideFrame())`; a result calls `logbook.add({ ...result, spot, conditions, seed, at: Date.now() })`, shows the card with the returned records, and `markSeen('rideHints')` after the first result;
  - `game.quickRetry()` from the R binding also calls `tracker.noteRetry()`;
  - Change spot stops the session, resets to the menu, and pushes `surf`.

- [ ] **Step 1: Failing tests** for `endCardModel`:
  - a wipeout of 42.4 m at 8.2 m/s top speed in 12.44 s shows "42 m", "30 km/h" and "12.4 s" in metric, and "139 ft" and "18 mph" in imperial;
  - `records: ['distance']` sets `newBest`;
  - the reason key passes through.
- [ ] **Step 2: Implement, then check in the browser:**
  - Esc pauses and freezes the waves; Esc again resumes, with no stuck paddle when Space was held;
  - Quit returns to the menu;
  - a wipeout shows the card with the right stats, and a second, longer ride shows "New best";
  - the Logbook storage key fills.
- [ ] **Step 3: Run** `npm test` and `npm run build`, **commit** `feat: pause, sum up each ride and log it`.

### Task 13: The Logbook screen

**Files:**
- Create: `src/ui/LogbookScreen.ts`, `src/ui/LogbookScreen.test.ts`
- Modify: `src/ui/App.ts`

**Interfaces:**
- Consumes: `Logbook` (Task 8), units (Task 1), `SURF_SPOTS` (Task 6).
- Produces:
  - `logbookModel(log: { recent: readonly LoggedRide[]; bests(spot: SpotName): SpotBests }, units: Units, now: number): { spots: { spot: SpotName; name: StringKey; bests: { label: StringKey; value: string }[] }[]; recent: { title: string; detail: string }[]; empty: boolean }`.
    - Each spot lists all three bests, with "—" for none.
    - A recent row's title is `"{spot} · {outcome}"` and its detail is `"{distance} · {topSpeed} · {time} · {when}"`. `when` is `log.justNow` "just now" under a minute, `log.minutesAgo` "{n} min ago" under an hour, `log.hoursAgo` "{n} h ago" under a day, and otherwise the date as `toLocaleDateString('en')`.
  - `createLogbookScreen(model, onBack): HTMLElement`: bests as three spot cards, then the recent list, scrollable, and an empty state `log.empty` "No rides yet — paddle out from Surf." Other strings: `log.title` "Logbook", `log.bests` "Bests", `log.recent` "Recent rides".
- [ ] **Step 1: Failing tests:**
  - imperial bests and recent rows come out in ft and mph;
  - a spot without rides shows "—";
  - the relative times are right at 30 s, 5 min and 3 h;
  - an empty logbook sets `empty`.
- [ ] **Step 2: Implement, check in the browser (after Task 12's rides), run tests, commit** `feat: show the logbook of rides and bests`.

### Task 14: The Settings screen

**Files:**
- Create: `src/ui/settingsModel.ts`, `src/ui/settingsModel.test.ts`, `src/ui/SettingsScreen.ts`
- Modify: `src/ui/App.ts`

**Interfaces:**
- Consumes: `SettingsStore` and types (Task 3); `withPreset`, `withAdvanced`, `NEXT_WAVE_FIELDS`, `PRESETS` (Task 4); `REBINDABLE`, `rebind`, `keyLabel`, `buttonLabel` (Task 2).
- Produces:

```ts
export type Row =
  | { kind: 'choice'; id: string; label: StringKey; value: string; options: { value: string; label: StringKey }[]; nextWave?: boolean }
  | { kind: 'toggle'; id: string; label: StringKey; value: boolean; nextWave?: boolean }
  | { kind: 'slider'; id: string; label: StringKey; value: number; min: number; max: number; step: number; format: 'percent' }
  | { kind: 'binding'; id: string; label: StringKey; device: 'keyboard' | 'gamepad'; action: Action; slot: 0 | 1; value: string }
  | { kind: 'button'; id: string; label: StringKey; disabled?: boolean }
  | { kind: 'heading'; id: string; label: StringKey };
export function settingsModel(tab: SettingsTab, settings: GameSettings, context: { devTools: boolean; detecting: boolean }): Row[];
export function applyRow(settings: GameSettings, id: string, value: string | number | boolean): { tab: SettingsTab; patch: object } | undefined;
```

- **Gameplay rows:** `units` (Metric / Imperial), `defaultCamera` (Front / Behind / Side / Overview), `touchControls` (Auto / On / Off), and `showTelemetry` (toggle, only with dev tools).
- **Graphics rows:**
  - `preset` (Auto (detected name) / Low / Medium / High / Ultra, plus Custom only while active);
  - `redetect` (button, only when the preset is Auto; label `settings.detecting` "Detecting…" and disabled while detecting);
  - an `advanced` heading, then the Advanced rows: `renderScale` (slider 50–125 %), `nativePixelDensity`, `frameLimit` (Screen / 60 / 30), `waterSimulation` (Auto / Fast / Accurate), `seaDetail` (Standard / Rich), `caustics`, `sprayMist`, `oceanView` (Near / Far), `foam` (Simple / Detailed);
  - the rows named in `NEXT_WAVE_FIELDS` carry `nextWave: true`, shown as the badge `settings.nextWave` "Next wave".
- **Controls rows:** for each `REBINDABLE` action, two keyboard slots and one gamepad slot (`binding`), then `handedness` (Right / Left).
- **Accessibility rows:** `reducedMotion`, `uiScale` (slider 90–150 %), `highContrastHud`.
- **`applyRow`:** `preset` uses `withPreset(…, detected)`; any Advanced id uses `withAdvanced`; bindings use `rebind`, and a refused rebind returns `undefined`.
- **`createSettingsScreen(store, context, handlers: { back(); redetect() }): HTMLElement`:**
  - tabs as `button[data-nav]` (`settings.gameplay` "Gameplay", `settings.graphics` "Graphics", `settings.controls` "Controls", `settings.accessibility` "Accessibility");
  - rows rendered from the model, with changes applied at once through `store.update`;
  - a per-tab `settings.reset` "Reset" and `settings.back` "Back";
  - a binding row enters capture: it shows `settings.pressKey` "Press a key…" or `settings.pressButton` "Press a button…", the next keydown or newly pressed pad button binds, and Escape or B cancels;
  - a refused binding flashes `settings.cantBind` "That one is reserved".

Every row label and option has a string key. The implementer adds them to `EN` with their plain English names (the labels above).
- [ ] **Step 1: Failing tests:**
  - the telemetry row appears only with dev tools;
  - the Graphics rows mark water simulation and sea detail as `nextWave`;
  - `applyRow(…, 'caustics', false)` returns a Custom preset; `applyRow(…, 'preset', 'low')` returns `PRESETS.low`;
  - Re-detect is present only for Auto, and disabled while detecting;
  - binding `Escape` returns `undefined`;
  - the Controls tab lists 6 actions × 3 slots.
- [ ] **Step 2: Implement, then check in the browser:**
  - each tab;
  - a preset change visibly changes the scene;
  - an Advanced edit flips the preset to Custom;
  - rebinding Paddle to W works in a ride;
  - Reset restores a tab;
  - Re-detect runs the benchmark again on the menu;
  - everything is reachable by arrows, Enter and Esc.
- [ ] **Step 3: Run** `npm test` and `npm run build`, **commit** `feat: settings for gameplay, graphics, controls and accessibility`.

### Task 15: The Wave Lab, accessibility, telemetry and phones

**Files:**
- Modify: `src/ui/App.ts`, `src/main.ts` (`enterWaveLab`, `leaveWaveLab`), `src/ui/ui.css`, `src/style.css`, `index.html` (`#ride-telemetry`)

**Interfaces:**
- Produces:
  - `SurfGame.enterWaveLab(): void` cancels the backdrop and starts the legacy wave (`startRun` with the current Wave Lab settings), or honours `?physical`. `SurfGame.leaveWaveLab(): void` stops whatever runs.
  - The Wave Lab tile goes to screen `wavelab`: today's UI, unchanged. Pause works there, and Quit to menu returns to the backdrop.
  - Dev flags at boot (`physical`, `demo`, `record`) skip the menu and open the Wave Lab as today.
  - `applyAccessibility(app: HTMLElement, a: AccessibilitySettings, touch: boolean, handedness: 'right' | 'left')` sets `--ui-scale` and the classes `is-reduced-motion`, `is-high-contrast`, `is-left-handed` and `has-touch`. Reduced motion also calls `physicalMode.camera.setReducedMotion`.
  - Touch shows for `on`, or for `auto` with `matchMedia('(pointer: coarse)')`.
  - In Surf with dev tools on and `showTelemetry`, an `<aside id="ride-telemetry">` shows a `PhysicsReadoutPanel` of `physicalMode.readout()` plus the fps, refreshed at 4 Hz.
  - Phones:
    - menu tiles in two columns under 620 px;
    - Surf, Logbook and Settings scroll inside their panel;
    - during a ride in portrait on a coarse pointer, a dismissible hint `hud.rotate` "Turn your phone sideways for the best view".
- [ ] **Step 1:** A test for `applyAccessibility`'s pure part, `accessibilityClasses(a, touch, handedness): string[]`, is written and made to pass first.
- [ ] **Step 2: Implement, then check in the browser:**
  - the Wave Lab from the menu plays exactly as before: legacy ride, Apply & replay, Profile and Below, physical model;
  - Esc pauses it;
  - `DEV_TOOLS = false` (temporarily) hides the Wave Lab tile and the telemetry row, and ignores `?physical`;
  - at the mobile preset (375×812) every screen fits, touch controls swap for left-handed, and the portrait hint shows;
  - UI scale 150 % stays usable;
  - high contrast makes the HUD legible on a bright sky.
- [ ] **Step 3: Run** `npm test` and `npm run build`, **commit** `feat: reach the Wave Lab from the menu and apply accessibility settings`.

### Task 16: Documentation and a full pass

**Files:**
- Modify: `README.md`, `ROADMAP.md` (P8), this plan (a "Record" section)

- [ ] **Step 1:** In the README:
  - describe playing from the menu (Surf, controls including gamepad, Settings, Logbook);
  - move the URL flags under a "Developer tools" heading that names `DEV_TOOLS` in `src/devTools.ts`.
- [ ] **Step 2:** Run `npm test` and `npm run build`. Report failures with their output; don't mark anything done over a failure.
- [ ] **Step 3: Full browser pass**, with a screenshot of each screen at desktop and mobile widths:
  - boot, menu, benchmark, Surf, ride, pause, end card, Logbook, each Settings tab, Wave Lab.

  Gamepad support is covered by unit tests. Say so in the record if no physical pad was available for a manual check.
- [ ] **Step 4:** Mark P8 `Done` in the ROADMAP, with a short record: what shipped, the measured benchmark result on the development Mac, any Findings, and the swell table as tuned.
- [ ] **Step 5: Commit** `docs: record P8 menus and settings`.
