# C1 · Steam Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the 2026 Steam Controller drive the game in Chrome and Arc on a Mac, with precise analog sticks, through WebHID.

**Architecture:**
- **A pure protocol module** (`tritonProtocol.ts`, ported from SDL's Triton driver) decodes the controller's vendor HID state report into the game's existing `PadState` in the standard layout, and builds the lizard-mode commands.
- **A driver** (`SteamControllerDriver.ts`) owns the WebHID devices, keeps lizard mode off while the tab is visible, and registers its pads as an extra source of `readPads()`. Everything downstream (bindings, menus, hints) sees one more standard pad.
- **A stick module** (`Sticks.ts`) holds the new precision settings: which stick trims, the response curve, per-device dead zones, and which pad drives the sticks.

**Tech Stack:** TypeScript 5.9, Vite 8, Vitest 5, WebHID (Chromium only), native DOM UI.

**Spec:** `docs/superpowers/specs/2026-09-26-steam-controller.md`

## Global Constraints

- **English only;** every player-facing string lives in `src/ui/strings.ts`.
- **No new dependencies.** The WebHID types are written locally, because TypeScript's DOM library has none.
- **Tests:** `npx vitest run --dir src`, because other sessions keep worktrees under `.claude/worktrees/`. **Types and build:** `npm run build`.
- **No commits:** the user asked for the work to be left uncommitted on branch `claude/steam-controller`. Every task ends with "leave uncommitted" in place of a commit.
- **Unchanged:** keyboard and touch controls. `Escape` and Start (button 9) stay reserved.
- **The check page is dev-only:** a root HTML page like `gpu-check.html`, which the Vite build does not include.
- **Defaults, verbatim from the spec:** trim on the right stick; stick response Linear; dead zone 0.05 for the Steam Controller and 0.15 for other gamepads, each 0–0.3; the hand on LB (plus L4 on the Steam Controller); pop-up also on R4; L5 and R5 unbound; lizard mode repeated about every second while visible.

## Review Focus

1. **A Puck controller switched off with a stick held.** Expected: steering lets go within about a second, even without a wireless status report. Pinned by the stale-expiry test in Task 2.
2. **Steam running alongside.** Expected: the player is told to quit Steam if the mouse still moves. Pinned by the help text in the Task 6 row test; the hardware check (Task 8) verifies the behaviour.
3. **Two pads connected, both touched.** Expected: the pad already driving keeps the sticks, with no flapping. Pinned in Task 3's `drivingPad` test.
4. **Settings saved before C1, with the hand on X.** Expected: the hand moves to LB and L4, unless LB or L4 is already bound elsewhere. Once migrated, it is never migrated again. Pinned in Task 5.
5. **Safari (no WebHID).** Expected: Settings and the menu say "Needs Chrome or Arc", and nothing throws. Pinned in Task 2 (unsupported driver) and Task 6 (row text).

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/game/steam/webHid.ts` (new) | The WebHID types the driver uses, and `webHid()` |
| `src/game/steam/tritonProtocol.ts` (new) | Report decoding, standard-pad mapping, command bytes (pure) |
| `src/game/steam/testReports.ts` (new) | Builds state-report bytes for tests |
| `src/game/steam/SteamControllerDriver.ts` (new) | Devices, permission, lizard keepalive, pads |
| `src/game/Sticks.ts` (new) | Stick settings, shaping, driving pad |
| `src/game/Bindings.ts` | Pad kinds and ids, extra pad sources, new defaults, labels |
| `src/game/Controls.ts` | Driving pad, stick settings, last pad kind |
| `src/game/Settings.ts` | Stick settings, `seen.steamController`, button range, migration |
| `src/ui/settingsModel.ts`, `src/ui/SettingsScreen.ts`, `src/ui/ui.css` | Controls tab rows |
| `src/ui/MainMenu.ts`, `src/ui/App.ts`, `src/ui/strings.ts`, `src/main.ts` | Wiring, menu strip, hints |
| `controller-check.html`, `src/controllerCheck.ts` (new) | Hardware check page |
| `docs/ASSETS.md`, `ROADMAP.md` | Credit and status |

---

### Task 1: The protocol

**Files:**
- Create: `src/game/steam/webHid.ts`, `src/game/steam/tritonProtocol.ts`, `src/game/steam/testReports.ts`
- Test: `src/game/steam/tritonProtocol.test.ts`
- Modify: `src/game/Bindings.ts` (only `PadKind` and the two optional `PadState` fields, which the protocol returns)

**Interfaces:**
- Produces:
  - `PadKind = 'standard' | 'steam'`
  - `PadState.id?: string`, `PadState.kind?: PadKind`
  - `decodeState(reportId: number, data: DataView): TritonState | undefined`
  - `decodeWirelessStatus(reportId, data): 'connected' | 'disconnected' | undefined`
  - `tritonPad(state: TritonState, id: string): PadState`
  - `isTritonInterface(device: { vendorId; productId; collections }): boolean`
  - `featureLength(collections): number`
  - `lizardModeReport(on: boolean, length?: number): Uint8Array`
  - `mappingsReport(clear: boolean, length?: number): Uint8Array`
  - constants `VALVE_VENDOR`, `TRITON_PRODUCTS`, `VENDOR_USAGE_PAGE`, `FEATURE_REPORT_ID`, `TRIGGER_PRESS`
  - `stateBytes(fields?): DataView` (tests)
  - the WebHID types `HID`, `HIDDevice`, `HIDInputReportEvent`, `HIDConnectionEvent`, `HIDCollectionInfo`, and `webHid(): HID | undefined`

- [ ] **Step 1: Add the pad kind to `Bindings.ts`** (above `PadState`), and the two fields:

```ts
/** Which layout a pad's buttons are printed with: an Xbox-style pad, or the 2026 Steam Controller (spec C1). */
export type PadKind = 'standard' | 'steam';

/** One gamepad's state, as plain values (tests build these directly): pressed buttons, how far each is pressed (0–1, for triggers), and the axes. */
export interface PadState {
  /** Which pad this is, stable while it stays connected (`gamepad:<index>`, `steam:<n>`). */
  id?: string;
  kind?: PadKind;
  buttons: readonly boolean[];
  values?: readonly number[];
  axes: readonly number[];
}
```

- [ ] **Step 2: Write `webHid.ts`**

```ts
/**
 * The slice of WebHID the Steam Controller driver uses (spec C1). TypeScript's DOM
 * library has no WebHID types, and only Chromium browsers (Chrome, Arc) have it.
 */
export interface HIDReportItem {
  reportSize?: number;
  reportCount?: number;
}

export interface HIDReportInfo {
  reportId: number;
  items?: HIDReportItem[];
}

export interface HIDCollectionInfo {
  usagePage: number;
  usage: number;
  inputReports?: HIDReportInfo[];
  outputReports?: HIDReportInfo[];
  featureReports?: HIDReportInfo[];
}

export interface HIDDevice extends EventTarget {
  readonly opened: boolean;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly collections: readonly HIDCollectionInfo[];
  open(): Promise<void>;
  sendFeatureReport(reportId: number, data: BufferSource): Promise<void>;
}

export interface HIDInputReportEvent extends Event {
  readonly device: HIDDevice;
  readonly reportId: number;
  readonly data: DataView;
}

export interface HIDConnectionEvent extends Event {
  readonly device: HIDDevice;
}

export interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

export interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>;
  requestDevice(options: { filters: HIDDeviceFilter[] }): Promise<HIDDevice[]>;
}

/** The browser's WebHID, or undefined (Safari, Firefox, or a page that is not a secure context). */
export function webHid(): HID | undefined {
  return (globalThis.navigator as { hid?: HID } | undefined)?.hid;
}
```

- [ ] **Step 3: Write `testReports.ts`**

```ts
/** A state report's bytes after its ID (WebHID's `data`), laid out as SDL's TritonMTUNoQuat_t: 45 bytes (spec C1, for tests). */
export function stateBytes(fields: { buttons?: number; lt?: number; rt?: number; lx?: number; ly?: number; rx?: number; ry?: number } = {}): DataView {
  const view = new DataView(new ArrayBuffer(45));
  view.setUint8(0, 1);
  view.setUint32(1, fields.buttons ?? 0, true);
  view.setInt16(5, fields.lt ?? 0, true);
  view.setInt16(7, fields.rt ?? 0, true);
  view.setInt16(9, fields.lx ?? 0, true);
  view.setInt16(11, fields.ly ?? 0, true);
  view.setInt16(13, fields.rx ?? 0, true);
  view.setInt16(15, fields.ry ?? 0, true);
  return view;
}

/** A one-byte report body. */
export function byteReport(value: number): DataView {
  return new DataView(new Uint8Array([value]).buffer);
}
```

- [ ] **Step 4: Write the failing test** `tritonProtocol.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { TRIGGER_PRESS, decodeState, decodeWirelessStatus, featureLength, isTritonInterface, lizardModeReport, mappingsReport, tritonPad } from './tritonProtocol';
import { byteReport, stateBytes } from './testReports';

const pad = (fields: Parameters<typeof stateBytes>[0]) => tritonPad(decodeState(0x42, stateBytes(fields))!, 'steam:0');
const pressed = (buttons: readonly boolean[]) => buttons.flatMap((down, index) => (down ? [index] : []));

describe('the Steam Controller protocol (C1)', () => {
  it('reads buttons, triggers and sticks from the three state reports, and nothing else', () => {
    const report = stateBytes({ buttons: 0x80001, lt: 16384, rt: 32767, lx: -32768, ly: 32767, rx: 1000, ry: -1000 });
    expect(decodeState(0x42, report)).toEqual({ buttons: 0x80001, leftTrigger: 16384, rightTrigger: 32767, leftX: -32768, leftY: 32767, rightX: 1000, rightY: -1000 });
    expect(decodeState(0x45, report)).toBeDefined();
    expect(decodeState(0x47, report)).toBeDefined();
    expect(decodeState(0x43, report)).toBeUndefined();
    expect(decodeState(0x42, new DataView(new ArrayBuffer(16)))).toBeUndefined();
  });

  it('puts every button where the standard layout has it, with the grips and ··· as extras 17–21', () => {
    const bits = [0x1, 0x2, 0x4, 0x8, 0x80000, 0x200, 0x4000, 0x40, 0x8000, 0x20, 0x2000, 0x400, 0x1000, 0x800, 0x10000, 0x20000, 0x80, 0x40000, 0x100, 0x10];
    const indices = [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    bits.forEach((bit, i) => expect(pressed(pad({ buttons: bit }).buttons), `bit 0x${bit.toString(16)}`).toEqual([indices[i]]));
  });

  it('reads the triggers’ travel, pressing them past the Gamepad API’s threshold', () => {
    const light = pad({ lt: 3000, rt: 32767 });
    expect(light.values?.[6]).toBeCloseTo(3000 / 32767, 6);
    expect(light.buttons[6]).toBe(false);
    expect(light.values?.[7]).toBe(1);
    expect(light.buttons[7]).toBe(true);
    expect(pad({ lt: Math.ceil(TRIGGER_PRESS * 32767) + 1 }).buttons[6]).toBe(true);
  });

  it('turns the sticks into Gamepad API axes: down positive, clamped to ±1, centred at zero', () => {
    const tilted = pad({ lx: -32768, ly: 32767, rx: 16384, ry: -16384 });
    expect(tilted.axes[0]).toBe(-1);
    expect(tilted.axes[1]).toBe(-1);
    expect(tilted.axes[2]).toBeCloseTo(0.5, 4);
    expect(tilted.axes[3]).toBeCloseTo(0.5, 4);
    expect(pad({})).toMatchObject({ id: 'steam:0', kind: 'steam', axes: [0, 0, 0, 0] });
  });

  it('tells a Puck slot’s controller arriving from leaving', () => {
    expect(decodeWirelessStatus(0x79, byteReport(1))).toBe('disconnected');
    expect(decodeWirelessStatus(0x46, byteReport(2))).toBe('connected');
    expect(decodeWirelessStatus(0x79, byteReport(7))).toBeUndefined();
    expect(decodeWirelessStatus(0x42, byteReport(1))).toBeUndefined();
  });

  it('builds SDL’s lizard-mode command, and the mappings fallback', () => {
    const off = lizardModeReport(false);
    expect(off).toHaveLength(63);
    expect([...off.slice(0, 5)]).toEqual([0x87, 3, 9, 0, 0]);
    expect(off.slice(5).every((byte) => byte === 0)).toBe(true);
    expect([...lizardModeReport(true).slice(0, 5)]).toEqual([0x87, 3, 9, 1, 0]);
    expect(lizardModeReport(false, 64)).toHaveLength(64);
    expect(mappingsReport(true)[0]).toBe(0x81);
    expect(mappingsReport(false)[0]).toBe(0x85);
  });

  it('sizes the command from the device’s own report description', () => {
    expect(featureLength([{ usagePage: 0xff00, usage: 1, featureReports: [{ reportId: 1, items: [{ reportSize: 8, reportCount: 64 }] }] }])).toBe(64);
    expect(featureLength([{ usagePage: 0xff00, usage: 1 }])).toBe(63);
  });

  it('recognises the controller’s input interfaces, not a dock or other Valve devices', () => {
    const device = (productId: number, usage = 1, vendorId = 0x28de) => ({ vendorId, productId, collections: [{ usagePage: 0xff00, usage }] });
    expect(isTritonInterface(device(0x1302))).toBe(true);
    expect(isTritonInterface(device(0x1304))).toBe(true);
    expect(isTritonInterface(device(0x1304, 2))).toBe(false);
    expect(isTritonInterface(device(0x1142))).toBe(false);
    expect(isTritonInterface(device(0x1302, 1, 0x045e))).toBe(false);
  });
});
```

- [ ] **Step 5: Run it.** `npx vitest run --dir src src/game/steam/tritonProtocol.test.ts`. Expected: FAIL, because `./tritonProtocol` is missing.

- [ ] **Step 6: Write `tritonProtocol.ts`**

```ts
/**
 * The 2026 Steam Controller's HID protocol (spec C1). Ported from SDL's Triton driver
 * (src/joystick/hidapi/SDL_hidapi_steam_triton.c and steam/controller_structs.h,
 * zlib licence, copyright Sam Lantinga and Valve), with the report notes of
 * SteamlessController. Pure: report bytes in, a standard-mapping pad and command bytes out.
 */
import type { PadState } from '../Bindings';
import type { HIDCollectionInfo } from './webHid';

export const VALVE_VENDOR = 0x28de;
/** The cable, Bluetooth LE, the Steam Controller Puck and the Nereid receiver. */
export const TRITON_PRODUCTS: readonly number[] = [0x1302, 0x1303, 0x1304, 0x1305];
/** The vendor collection that carries game input; the device's other collections are lizard mode's keyboard and mouse. */
export const VENDOR_USAGE_PAGE = 0xff00;
/** A receiver's dock interface shares the page with usage 2; it is not a controller slot. */
const DOCK_USAGE = 0x0002;

/** State reports: 0x42 by cable and Puck, 0x45 by Bluetooth, 0x47 with a trackpad timestamp. The fields read here sit at the same offsets in all three. */
const STATE_REPORTS = new Set([0x42, 0x45, 0x47]);
/** A Puck slot's controller came or went: one byte, 1 gone and 2 here. */
const WIRELESS_REPORTS = new Set([0x46, 0x79]);

/** Commands travel in feature report 1: a type byte, a length byte, then the payload. */
export const FEATURE_REPORT_ID = 1;
/** Feature report 1's 64 bytes less its ID, unless the device describes it otherwise. */
const FEATURE_REPORT_BYTES = 63;
const SET_SETTINGS_VALUES = 0x87;
const SETTING_LIZARD_MODE = 9;
const CLEAR_DIGITAL_MAPPINGS = 0x81;
const SET_DEFAULT_MAPPINGS = 0x85;

/**
 * The state report's button bits. SDL's enum names 0x40 View and 0x4000 Menu, but
 * maps 0x40 to Start and 0x4000 to Back, as SteamlessController documents them.
 */
const BIT = {
  a: 0x1, b: 0x2, x: 0x4, y: 0x8, quickAccess: 0x10, rightStick: 0x20, menu: 0x40, r4: 0x80,
  r5: 0x100, rb: 0x200, down: 0x400, right: 0x800, left: 0x1000, up: 0x2000, view: 0x4000, leftStick: 0x8000,
  steam: 0x10000, l4: 0x20000, l5: 0x40000, lb: 0x80000,
} as const;

/** Each standard-mapping button's bit, in index order. LT and RT (6, 7) come from the triggers' travel. Extras: 17 L4, 18 R4, 19 L5, 20 R5, 21 Quick Access. */
const STANDARD_BITS = [
  BIT.a, BIT.b, BIT.x, BIT.y, BIT.lb, BIT.rb, 0, 0, BIT.view, BIT.menu, BIT.leftStick, BIT.rightStick,
  BIT.up, BIT.down, BIT.left, BIT.right, BIT.steam, BIT.l4, BIT.r4, BIT.l5, BIT.r5, BIT.quickAccess,
];
/** A trigger counts as pressed beyond this much travel, as the Gamepad API reads one. */
export const TRIGGER_PRESS = 0.12;

/** What the game reads from a state report: raw button bits, triggers 0–32767, sticks ±32767 with up positive. */
export interface TritonState {
  buttons: number;
  leftTrigger: number;
  rightTrigger: number;
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}

/** A state report's fields (WebHID's data leaves out the report ID), or undefined for any other report. */
export function decodeState(reportId: number, data: DataView): TritonState | undefined {
  if (!STATE_REPORTS.has(reportId) || data.byteLength < 17) return undefined;
  return {
    buttons: data.getUint32(1, true),
    leftTrigger: data.getInt16(5, true),
    rightTrigger: data.getInt16(7, true),
    leftX: data.getInt16(9, true),
    leftY: data.getInt16(11, true),
    rightX: data.getInt16(13, true),
    rightY: data.getInt16(15, true),
  };
}

/** A Puck slot's wireless status, or undefined for any other report. */
export function decodeWirelessStatus(reportId: number, data: DataView): 'connected' | 'disconnected' | undefined {
  if (!WIRELESS_REPORTS.has(reportId) || data.byteLength < 1) return undefined;
  const state = data.getUint8(0);
  return state === 2 ? 'connected' : state === 1 ? 'disconnected' : undefined;
}

const unit = (raw: number) => Math.max(-1, Math.min(1, raw / 32767));
/** Up-positive to the Gamepad API's down-positive; `0 -` keeps a centred stick at +0. */
const downward = (raw: number) => 0 - unit(raw);

/** The controller as a standard-mapping pad: the Gamepad API's button order plus the extras, sticks down-positive. */
export function tritonPad(state: TritonState, id: string): PadState {
  const leftTrigger = Math.max(0, unit(state.leftTrigger));
  const rightTrigger = Math.max(0, unit(state.rightTrigger));
  const values = STANDARD_BITS.map((bit, index) => {
    if (index === 6) return leftTrigger;
    if (index === 7) return rightTrigger;
    return (state.buttons & bit) !== 0 ? 1 : 0;
  });
  return {
    id,
    kind: 'steam',
    buttons: values.map((value, index) => (index === 6 || index === 7 ? value > TRIGGER_PRESS : value > 0)),
    values,
    axes: [unit(state.leftX), downward(state.leftY), unit(state.rightX), downward(state.rightY)],
  };
}

/** Whether a WebHID device is one of the controller's input slots: a 2026 Steam Controller product with the vendor collection. */
export function isTritonInterface(device: { vendorId: number; productId: number; collections: readonly HIDCollectionInfo[] }): boolean {
  return device.vendorId === VALVE_VENDOR && TRITON_PRODUCTS.includes(device.productId)
    && device.collections.some((collection) => collection.usagePage === VENDOR_USAGE_PAGE && collection.usage !== DOCK_USAGE);
}

/** Feature report 1's length as the device describes it, less the ID byte. */
export function featureLength(collections: readonly HIDCollectionInfo[]): number {
  for (const collection of collections) {
    const report = collection.featureReports?.find((info) => info.reportId === FEATURE_REPORT_ID);
    const bits = report?.items?.reduce((sum, item) => sum + (item.reportSize ?? 0) * (item.reportCount ?? 0), 0) ?? 0;
    if (bits > 0) return Math.ceil(bits / 8);
  }
  return FEATURE_REPORT_BYTES;
}

/** SDL's command: lizard mode (the firmware's keyboard and mouse) on or off. The firmware turns it back on a few seconds after the last one. */
export function lizardModeReport(on: boolean, length = FEATURE_REPORT_BYTES): Uint8Array {
  const data = new Uint8Array(length);
  data.set([SET_SETTINGS_VALUES, 3, SETTING_LIZARD_MODE, on ? 1 : 0, 0]);
  return data;
}

/** SteamlessController's alternative: clear the digital mappings (lizard off) or restore the defaults (on). The check page tries it. */
export function mappingsReport(clear: boolean, length = FEATURE_REPORT_BYTES): Uint8Array {
  const data = new Uint8Array(length);
  data[0] = clear ? CLEAR_DIGITAL_MAPPINGS : SET_DEFAULT_MAPPINGS;
  return data;
}
```

- [ ] **Step 7: Run it.** Same command. Expected: PASS (8 tests).
- [ ] **Step 8: Leave uncommitted.**

---

### Task 2: The driver

**Files:**
- Create: `src/game/steam/SteamControllerDriver.ts`
- Test: `src/game/steam/SteamControllerDriver.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `class SteamControllerDriver`, with `constructor(environment?: SteamDriverEnvironment)`, `status: SteamStatus`, `pads(): PadState[]`, `onChange(listener): () => void`, `start(): Promise<void>` and `request(): Promise<boolean>`;
  - `type SteamStatus = 'unsupported' | 'disconnected' | 'connected'`;
  - `LIZARD_KEEPALIVE_MS = 1000` and `STALE_MS = 1000`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { STALE_MS, SteamControllerDriver } from './SteamControllerDriver';
import { byteReport, stateBytes } from './testReports';
import type { HID, HIDCollectionInfo } from './webHid';

class FakeDevice extends EventTarget {
  opened = false;
  readonly vendorId = 0x28de;
  readonly productName = 'Steam Controller';
  /** Each feature report sent: its ID and the lizard-mode value byte (index 3 of SDL's command). */
  readonly sent: [number, number][] = [];

  constructor(readonly productId = 0x1302, readonly collections: HIDCollectionInfo[] = [{ usagePage: 0xff00, usage: 1 }]) {
    super();
  }

  async open(): Promise<void> {
    this.opened = true;
  }

  async sendFeatureReport(reportId: number, data: BufferSource): Promise<void> {
    this.sent.push([reportId, (data as Uint8Array)[3]]);
  }

  report(reportId: number, data: DataView): void {
    this.dispatchEvent(Object.assign(new Event('inputreport'), { reportId, data, device: this }));
  }
}

class FakeHid extends EventTarget {
  chosen: FakeDevice[] | 'cancel' = [];

  constructor(private readonly granted: FakeDevice[]) {
    super();
  }

  async getDevices() {
    return this.granted;
  }

  async requestDevice() {
    if (this.chosen === 'cancel') throw new DOMException('No device selected.', 'NotFoundError');
    return this.chosen;
  }

  plug(device: FakeDevice, type: 'connect' | 'disconnect'): void {
    this.dispatchEvent(Object.assign(new Event(type), { device }));
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(granted: FakeDevice[] = []) {
  const hid = new FakeHid(granted);
  const page = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
  let time = 0;
  let tick = () => {};
  const driver = new SteamControllerDriver({
    hid: hid as unknown as HID,
    page: page as unknown as Document,
    now: () => time,
    every: (callback) => { tick = callback; },
  });
  const changed = vi.fn();
  driver.onChange(changed);
  return {
    driver, hid, changed,
    tick: () => tick(),
    advance: (ms: number) => { time += ms; },
    setHidden: (hidden: boolean) => {
      page.visibilityState = hidden ? 'hidden' : 'visible';
      page.dispatchEvent(new Event('visibilitychange'));
    },
  };
}

describe('SteamControllerDriver (C1)', () => {
  it('says unsupported and offers no pads without WebHID (Safari)', async () => {
    const driver = new SteamControllerDriver({ hid: undefined });
    expect(driver.status).toBe('unsupported');
    expect(driver.pads()).toEqual([]);
    await driver.start();
    expect(await driver.request()).toBe(false);
  });

  it('reopens an allowed controller, and counts it connected from its first state report', async () => {
    const device = new FakeDevice();
    const { driver, changed } = setup([device]);
    await driver.start();
    expect(device.opened).toBe(true);
    expect(driver.status).toBe('disconnected');
    device.report(0x42, stateBytes({ buttons: 0x1, lx: 32767 }));
    expect(driver.status).toBe('connected');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(driver.pads()).toMatchObject([{ id: 'steam:0', kind: 'steam', axes: [1, 0, 0, 0] }]);
    expect(driver.pads()[0].buttons[0]).toBe(true);
    expect(device.sent).toEqual([[1, 0]]);
  });

  it('keeps lizard mode off while the game is in view, and gives it back when the tab is hidden', async () => {
    const device = new FakeDevice();
    const { driver, tick, setHidden } = setup([device]);
    await driver.start();
    device.report(0x42, stateBytes());
    tick();
    setHidden(true);
    tick();
    setHidden(false);
    expect(device.sent.map(([, lizard]) => lizard)).toEqual([0, 0, 1, 0]);
  });

  // Review Focus 1: a controller switched off on the Puck must not keep steering.
  it('lets go of a controller that goes quiet, leaves the Puck or is unplugged', async () => {
    const device = new FakeDevice(0x1304);
    const { driver, hid, changed, tick, advance } = setup([device]);
    await driver.start();
    device.report(0x42, stateBytes({ lx: 32767 }));
    advance(STALE_MS + 1);
    expect(driver.pads()).toEqual([]);
    tick();
    expect(changed).toHaveBeenCalledTimes(2);
    device.report(0x42, stateBytes());
    expect(driver.status).toBe('connected');
    device.report(0x79, byteReport(1));
    expect(driver.pads()).toEqual([]);
    device.report(0x42, stateBytes());
    hid.plug(device, 'disconnect');
    expect(driver.status).toBe('disconnected');
    expect(changed).toHaveBeenCalledTimes(6);
  });

  it('opens what the player picks in the chooser, and survives a cancelled chooser', async () => {
    const picked = new FakeDevice(0x1304);
    const { driver, hid } = setup();
    hid.chosen = [picked];
    expect(await driver.request()).toBe(true);
    expect(picked.opened).toBe(true);
    hid.chosen = 'cancel';
    expect(await driver.request()).toBe(false);
  });

  it('ignores other devices, and opens a controller plugged in later', async () => {
    const keyboard = new FakeDevice(0x1302, [{ usagePage: 0x01, usage: 0x06 }]);
    const { driver, hid } = setup([keyboard]);
    await driver.start();
    expect(keyboard.opened).toBe(false);
    const late = new FakeDevice();
    hid.plug(late, 'connect');
    await settle();
    expect(late.opened).toBe(true);
  });
});
```

- [ ] **Step 2: Run it.** `npx vitest run --dir src src/game/steam/SteamControllerDriver.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Write `SteamControllerDriver.ts`**

```ts
import type { PadState } from '../Bindings';
import {
  FEATURE_REPORT_ID, TRITON_PRODUCTS, VALVE_VENDOR, VENDOR_USAGE_PAGE, decodeState, decodeWirelessStatus,
  featureLength, isTritonInterface, lizardModeReport, tritonPad, type TritonState,
} from './tritonProtocol';
import { webHid, type HID, type HIDConnectionEvent, type HIDDevice, type HIDInputReportEvent } from './webHid';

/** How often lizard mode is turned off again while the game is in view, ms. The firmware reverts a few seconds after the last command (SDL repeats every 3 s, SteamlessController every 0.8 s). */
export const LIZARD_KEEPALIVE_MS = 1000;
/** A controller silent this long is gone (switched off on the Puck without a status report), ms, so a held stick does not stay held. */
export const STALE_MS = 1000;

export type SteamStatus = 'unsupported' | 'disconnected' | 'connected';

interface Slot {
  device: HIDDevice;
  index: number;
  state?: TritonState;
  /** When its last state report arrived, ms. */
  at: number;
}

/** Where the driver runs: the browser's by default; tests pass stand-ins. */
export interface SteamDriverEnvironment {
  /** WebHID, or undefined for a browser without it. */
  hid?: HID;
  page?: Pick<Document, 'visibilityState' | 'addEventListener'>;
  now?: () => number;
  every?: (callback: () => void, ms: number) => void;
}

/**
 * The 2026 Steam Controller through WebHID (spec C1): reopens the controllers the
 * browser already allows, asks for one on a click, keeps lizard mode off while the
 * game is in view, and offers each controller that is sending as a standard pad.
 */
export class SteamControllerDriver {
  private readonly slots: Slot[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly hid?: HID;
  private readonly page?: SteamDriverEnvironment['page'];
  private readonly now: () => number;
  private readonly every: (callback: () => void, ms: number) => void;
  private nextIndex = 0;
  private started = false;
  private wasConnected = false;

  constructor(environment: SteamDriverEnvironment = {}) {
    this.hid = 'hid' in environment ? environment.hid : webHid();
    this.page = environment.page ?? globalThis.document;
    this.now = environment.now ?? (() => performance.now());
    this.every = environment.every ?? ((callback, ms) => { setInterval(callback, ms); });
  }

  get status(): SteamStatus {
    if (!this.hid) return 'unsupported';
    return this.live().length > 0 ? 'connected' : 'disconnected';
  }

  /** Each controller sending now, as a pad. */
  pads(): PadState[] {
    return this.live().map((slot) => tritonPad(slot.state!, `steam:${slot.index}`));
  }

  /** Called when a controller starts or stops sending. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Reopen the controllers the browser already allows, and follow them being plugged in and out. */
  async start(): Promise<void> {
    if (!this.hid || this.started) return;
    this.started = true;
    this.hid.addEventListener('connect', (event) => void this.open((event as HIDConnectionEvent).device));
    this.hid.addEventListener('disconnect', (event) => this.drop((event as HIDConnectionEvent).device));
    this.page?.addEventListener('visibilitychange', () => this.sendLizard(this.hidden()));
    this.every(() => this.tick(), LIZARD_KEEPALIVE_MS);
    for (const device of await this.hid.getDevices()) await this.open(device);
  }

  /** Chrome's device chooser (call from a click). True when the player picked a controller. */
  async request(): Promise<boolean> {
    if (!this.hid) return false;
    await this.start();
    let devices: HIDDevice[];
    try {
      devices = await this.hid.requestDevice({
        filters: TRITON_PRODUCTS.map((productId) => ({ vendorId: VALVE_VENDOR, productId, usagePage: VENDOR_USAGE_PAGE })),
      });
    } catch {
      return false;
    }
    for (const device of devices) await this.open(device);
    return devices.some(isTritonInterface);
  }

  private live(): Slot[] {
    const now = this.now();
    return this.slots.filter((slot) => slot.state !== undefined && now - slot.at <= STALE_MS);
  }

  private hidden(): boolean {
    return this.page?.visibilityState === 'hidden';
  }

  private async open(device: HIDDevice): Promise<void> {
    if (!isTritonInterface(device) || this.slots.some((slot) => slot.device === device)) return;
    const slot: Slot = { device, index: this.nextIndex++, at: 0 };
    this.slots.push(slot);
    device.addEventListener('inputreport', (event) => this.report(slot, event as HIDInputReportEvent));
    try {
      if (!device.opened) await device.open();
    } catch {
      this.slots.splice(this.slots.indexOf(slot), 1);
    }
  }

  private report(slot: Slot, event: HIDInputReportEvent): void {
    const state = decodeState(event.reportId, event.data);
    if (state) {
      const arriving = !this.live().includes(slot);
      slot.state = state;
      slot.at = this.now();
      if (arriving) {
        this.sendLizardTo(slot, this.hidden());
        this.changed();
      }
      return;
    }
    if (decodeWirelessStatus(event.reportId, event.data) === 'disconnected' && slot.state) {
      slot.state = undefined;
      this.changed();
    }
  }

  private drop(device: HIDDevice): void {
    const index = this.slots.findIndex((slot) => slot.device === device);
    if (index < 0) return;
    const [slot] = this.slots.splice(index, 1);
    if (slot.state) this.changed();
  }

  /** Once a keepalive period: lizard mode off again while in view, and news of a controller gone quiet. */
  private tick(): void {
    if (!this.hidden()) this.sendLizard(false);
    if ((this.live().length > 0) !== this.wasConnected) this.changed();
  }

  private sendLizard(on: boolean): void {
    for (const slot of this.live()) this.sendLizardTo(slot, on);
  }

  private sendLizardTo(slot: Slot, on: boolean): void {
    slot.device.sendFeatureReport(FEATURE_REPORT_ID, lizardModeReport(on, featureLength(slot.device.collections))).catch(() => undefined);
  }

  private changed(): void {
    this.wasConnected = this.live().length > 0;
    for (const listener of this.listeners) listener();
  }
}
```

- [ ] **Step 4: Run it.** Expected: PASS (6 tests).
- [ ] **Step 5: Leave uncommitted.**

---

### Task 3: Sticks

**Files:**
- Create: `src/game/Sticks.ts`
- Test: `src/game/Sticks.test.ts`

**Interfaces:**
- Consumes: `PadState` (Task 1).
- Produces:
  - `StickSettings { trimStick: 'right' | 'left'; stickResponse: StickResponse; deadzoneSteam: number; deadzoneGamepad: number }`
  - `StickResponse = 'linear' | 'precise'`
  - `DEFAULT_STICK` and `MAX_DEADZONE = 0.3`
  - `shapeAxis(value, deadzone, response): number`
  - `padSticks(pad: PadState | undefined, stick: StickSettings): { steer: number; trim: number }`
  - `padKey(pad, index): string`, `touched(pad): boolean` and `drivingPad(pads, current): string | undefined`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import type { PadState } from './Bindings';
import { DEFAULT_STICK, drivingPad, padSticks, shapeAxis } from './Sticks';

describe('sticks (C1)', () => {
  it('ignores the dead zone and rescales the rest to ±1', () => {
    expect(shapeAxis(0.1, 0.15, 'linear')).toBe(0);
    expect(shapeAxis(-0.575, 0.15, 'linear')).toBeCloseTo(-0.5, 6);
    expect(shapeAxis(1, 0.15, 'linear')).toBe(1);
    expect(shapeAxis(0.05, 0, 'linear')).toBeCloseTo(0.05, 9);
  });

  it('makes Precise finer near centre, rising all the way to full lock', () => {
    const precise = (x: number) => shapeAxis(x, 0.05, 'precise');
    expect(precise(0.05)).toBe(0);
    expect(precise(1)).toBeCloseTo(1, 9);
    expect(precise(-1)).toBeCloseTo(-1, 9);
    expect(precise(0.5)).toBeLessThan(shapeAxis(0.5, 0.05, 'linear') * 0.7);
    for (let step = 1; step < 20; step += 1) expect(precise((step + 1) / 20)).toBeGreaterThan(precise(step / 20));
  });

  it('steers with the left stick and trims with the right by default, up for forward', () => {
    const pad: PadState = { kind: 'standard', buttons: [], axes: [0.5, -0.9, 0, -0.6] };
    expect(padSticks(pad, DEFAULT_STICK).steer).toBeCloseTo((0.5 - 0.15) / 0.85, 6);
    expect(padSticks(pad, DEFAULT_STICK).trim).toBeCloseTo((0.6 - 0.15) / 0.85, 6);
    expect(padSticks(pad, { ...DEFAULT_STICK, trimStick: 'left' }).trim).toBeCloseTo((0.9 - 0.15) / 0.85, 6);
    expect(padSticks(undefined, DEFAULT_STICK)).toEqual({ steer: 0, trim: 0 });
  });

  it('gives the Steam Controller its own, smaller dead zone', () => {
    const steam: PadState = { kind: 'steam', buttons: [], axes: [0.1, 0, 0, 0] };
    expect(padSticks(steam, DEFAULT_STICK).steer).toBeCloseTo((0.1 - 0.05) / 0.95, 6);
    expect(padSticks({ ...steam, kind: 'standard' }, DEFAULT_STICK).steer).toBe(0);
  });

  // Review Focus 3: the pad already driving keeps the sticks while both are held.
  it('lets the pad touched last drive, without flapping while both are held', () => {
    const idle = (id: string): PadState => ({ id, buttons: [false], axes: [0, 0, 0, 0] });
    const pushed = (id: string): PadState => ({ id, buttons: [false], axes: [0, 0, 0.9, 0] });
    expect(drivingPad([idle('a'), idle('b')], undefined)).toBe('a');
    expect(drivingPad([idle('a'), pushed('b')], 'a')).toBe('b');
    expect(drivingPad([pushed('a'), pushed('b')], 'b')).toBe('b');
    expect(drivingPad([idle('a'), idle('b')], 'b')).toBe('b');
    expect(drivingPad([idle('a')], 'b')).toBe('a');
    expect(drivingPad([], 'a')).toBeUndefined();
    expect(drivingPad([{ buttons: [true], axes: [] }], undefined)).toBe('pad:0');
  });
});
```

- [ ] **Step 2: Run it.** `npx vitest run --dir src src/game/Sticks.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Write `Sticks.ts`**

```ts
import type { PadState } from './Bindings';

/** Linear, or Precise: finer near centre and still full lock at the edge (spec C1). */
export type StickResponse = 'linear' | 'precise';

/** The player's stick settings (spec C1). */
export interface StickSettings {
  /** Which stick trims: the right by default, so steering on the left never trims by accident. */
  trimStick: 'right' | 'left';
  stickResponse: StickResponse;
  /** Stick travel ignored around centre: the Steam Controller's magnetic sticks barely drift. */
  deadzoneSteam: number;
  deadzoneGamepad: number;
}

export const DEFAULT_STICK: StickSettings = { trimStick: 'right', stickResponse: 'linear', deadzoneSteam: 0.05, deadzoneGamepad: 0.15 };
export const MAX_DEADZONE = 0.3;
/** Precise is this much cubic, the rest linear: about half the linear response at mid-stick. */
const PRECISE_CUBIC = 0.6;
/** A pad counts as touched with a button down or a stick pushed past this. */
const TOUCH = 0.5;

/** One stick axis after the dead zone, rescaled to ±1 and shaped by the response. */
export function shapeAxis(value: number, deadzone: number, response: StickResponse): number {
  const magnitude = Math.abs(value);
  if (magnitude <= deadzone) return 0;
  const travel = Math.min(1, (magnitude - deadzone) / (1 - deadzone));
  const shaped = response === 'precise' ? (1 - PRECISE_CUBIC) * travel + PRECISE_CUBIC * travel ** 3 : travel;
  return Math.sign(value) * shaped;
}

/** Steering from the left stick (positive right) and trim from the chosen stick (up for forward), with the pad's own dead zone. */
export function padSticks(pad: PadState | undefined, stick: StickSettings): { steer: number; trim: number } {
  if (!pad) return { steer: 0, trim: 0 };
  const deadzone = pad.kind === 'steam' ? stick.deadzoneSteam : stick.deadzoneGamepad;
  const trimAxis = stick.trimStick === 'right' ? 3 : 1;
  return {
    steer: shapeAxis(pad.axes[0] ?? 0, deadzone, stick.stickResponse),
    trim: shapeAxis(-(pad.axes[trimAxis] ?? 0), deadzone, stick.stickResponse),
  };
}

/** A pad's identity: its id, or its place in the list for a pad built without one. */
export function padKey(pad: PadState, index: number): string {
  return pad.id ?? `pad:${index}`;
}

/** Whether the player is using this pad now: a button down, or a stick pushed. */
export function touched(pad: PadState): boolean {
  return pad.buttons.some(Boolean) || pad.axes.slice(0, 4).some((axis) => Math.abs(axis) > TOUCH);
}

/**
 * Which pad drives the sticks (spec C1): the one touched last. While the current one
 * is still touched it keeps them; when nobody touches anything it stays; if it is
 * gone, the first pad takes over.
 */
export function drivingPad(pads: readonly PadState[], current: string | undefined): string | undefined {
  const keys = pads.map(padKey);
  const active = keys.filter((_, index) => touched(pads[index]));
  if (current !== undefined && active.includes(current)) return current;
  if (active.length > 0) return active[0];
  if (current !== undefined && keys.includes(current)) return current;
  return keys[0];
}
```

- [ ] **Step 4: Run it.** Expected: PASS (5 tests).
- [ ] **Step 5: Leave uncommitted.**

---

### Task 4: Bindings and Controls

**Files:**
- Modify: `src/game/Bindings.ts`, `src/game/Controls.ts`
- Test: `src/game/Bindings.test.ts`, `src/game/Controls.test.ts`

**Interfaces:**
- Consumes: Task 3 (`StickSettings`, `DEFAULT_STICK`, `padSticks`, `drivingPad`, `padKey`, `touched`).
- Produces:
  - `addPadSource(source: () => PadState[]): () => void`
  - `readPads()`, which now tags Gamepad API pads `{ id: 'gamepad:<index>', kind: 'standard' }` and appends the registered sources
  - `MAX_BUTTON = 21`
  - `buttonLabel(index: number | undefined, kind?: PadKind): string`
  - `DEFAULT_BINDINGS.gamepad`: `popUp: [0, 18]`, `hand: [4, 17]`
  - `ControlEnvironment.stick?: () => StickSettings`
  - `Controls.lastPadKind: PadKind`

  `padSteer`, `padTrim` and `STICK_DEADZONE` are removed; their job moves to `padSticks`.

- [ ] **Step 1: Update the failing tests in `Bindings.test.ts`.** Change the import line and the `pad` helper:

```ts
import { DEFAULT_BINDINGS, REBINDABLE, addPadSource, buttonLabel, heldActions, keyLabel, readPads, rebind, type PadState } from './Bindings';

const pad = (buttons: number[] = [], x = 0): PadState => ({
  buttons: Array.from({ length: 22 }, (_, i) => buttons.includes(i)), axes: [x, 0, 0, 0],
});
```

Replace the test `'steers from the left stick beyond its dead zone, and lets go when the pad disappears'` with these tests, and replace `'names keys and buttons for the screen'`:

```ts
  it('holds nothing when no pad is connected', () => {
    expect(heldActions(new Set(), [], DEFAULT_BINDINGS).size).toBe(0);
  });

  // C1: the right thumb trims, so the hand moves to LB; the Steam Controller's grips keep the thumbs on the sticks.
  it('reaches for the water with LB or L4, pops up with A or R4, and frees X', () => {
    expect(heldActions(new Set(), [pad([4])], DEFAULT_BINDINGS)).toEqual(new Set(['hand']));
    expect(heldActions(new Set(), [pad([17])], DEFAULT_BINDINGS)).toEqual(new Set(['hand']));
    expect(heldActions(new Set(), [pad([18])], DEFAULT_BINDINGS)).toEqual(new Set(['popUp']));
    expect(heldActions(new Set(), [pad([2]), pad([19]), pad([20])], DEFAULT_BINDINGS).size).toBe(0);
  });

  it('names keys and buttons for the screen, as printed on the pad used last', () => {
    expect(['Space', 'ArrowUp', 'KeyR', 'Digit1', 'ShiftLeft'].map(keyLabel)).toEqual(['Space', '↑', 'R', '1', 'Shift']);
    expect([0, 7, 8, 9, 12].map((index) => buttonLabel(index))).toEqual(['A', 'RT', 'Back', 'Start', 'D-pad↑']);
    expect([0, 8, 9, 16, 17, 18, 19, 20, 21].map((index) => buttonLabel(index, 'steam'))).toEqual(['A', 'View', 'Menu', 'Steam', 'L4', 'R4', 'L5', 'R5', '···']);
    expect(buttonLabel(undefined)).toBe('—');
  });

  it('reads the Gamepad API as standard pads, then adds the Steam Controller’s (C1)', () => {
    const gamepad = { index: 2, connected: true, buttons: [{ pressed: true, value: 1 }], axes: [0.5] } as unknown as Gamepad;
    const steam: PadState = { id: 'steam:0', kind: 'steam', buttons: [], axes: [] };
    const remove = addPadSource(() => [steam]);
    expect(readPads(() => [gamepad, null])).toEqual([{ id: 'gamepad:2', kind: 'standard', buttons: [true], values: [1], axes: [0.5] }, steam]);
    remove();
    expect(readPads(() => [])).toEqual([]);
  });
```

- [ ] **Step 2: Update `Controls.test.ts`.** Let `setup` take stick settings:

```ts
import type { StickSettings } from './Sticks';

function setup(stick?: StickSettings) {
  const target = new EventTarget();
  let pads: PadState[] = [];
  const handlers = { retry: vi.fn(), camera: vi.fn(), pause: vi.fn() };
  const controls = new Controls(() => DEFAULT_BINDINGS, handlers, { target, pads: () => pads, ...(stick ? { stick: () => stick } : {}) });
  const key = (type: 'keydown' | 'keyup', code: string, repeat = false) =>
    target.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
  return { controls, handlers, key, target, setPads: (next: PadState[]) => { pads = next; } };
}
```

In `'passes the pad’s trigger and stick straight through'`, trim now comes from the right stick: change `setPads([analog({ 6: 0.5 }, [0, -0.8, 0, 0])]);` to `setPads([analog({ 6: 0.5 }, [0, 0, 0, -0.8])]);`. Add to the `'the ride request (P9)'` block:

```ts
  it('trims with the left stick when the player chooses it (C1)', () => {
    const { controls, setPads } = setup({ trimStick: 'left', stickResponse: 'linear', deadzoneSteam: 0.05, deadzoneGamepad: 0.15 });
    setPads([analog({}, [0, -0.8, 0, -0.8])]);
    controls.poll();
    expect(controls.rideRequest(1 / 60, true).trim).toBeCloseTo((0.8 - 0.15) / 0.85, 6);
  });

  it('steers with the pad touched last, and names the buttons for it (C1)', () => {
    const { controls, setPads } = setup();
    const xbox: PadState = { id: 'gamepad:0', kind: 'standard', buttons: [], axes: [0, 0, 0, 0] };
    const steam: PadState = { id: 'steam:0', kind: 'steam', buttons: [], axes: [-0.9, 0, 0, 0] };
    setPads([xbox, steam]);
    controls.poll();
    expect(controls.rideRequest(1 / 60, true).steer).toBeCloseTo(-(0.9 - 0.05) / 0.95, 6);
    expect(controls.lastPadKind).toBe('steam');
  });
```

- [ ] **Step 3: Run them.** `npx vitest run --dir src src/game/Bindings.test.ts src/game/Controls.test.ts`. Expected: FAIL (`addPadSource`, `lastPadKind` and the new defaults are missing).

- [ ] **Step 4: Change `Bindings.ts`.** Make these edits:
  - Change the defaults in `DEFAULT_BINDINGS.gamepad`: `popUp: [0, 18]` and `hand: [4, 17]`.
  - Replace the doc comment above `DEFAULT_BINDINGS`'s type header with one noting the C1 change, as a one-line comment on the gamepad table: `// C1: the hand on LB (the right thumb trims); on the Steam Controller L4 also reaches and R4 also pops up.`
  - Replace `readPads` with this:

```ts
/** The highest button index bound: the standard 0–16 and the Steam Controller's extras, 17–21 (spec C1). */
export const MAX_BUTTON = 21;

const padSources = new Set<() => PadState[]>();

/** Add pads the Gamepad API cannot see (the Steam Controller over WebHID, spec C1); returns the undo. */
export function addPadSource(source: () => PadState[]): () => void {
  padSources.add(source);
  return () => { padSources.delete(source); };
}

/** The connected gamepads, read as the standard layout (an unusual one can be rebound), then any added sources' pads. */
export function readPads(source: () => ArrayLike<Gamepad | null> = () => globalThis.navigator?.getGamepads?.() ?? []): PadState[] {
  const pads: PadState[] = [];
  for (const pad of Array.from(source())) {
    if (!pad || !pad.connected) continue;
    pads.push({ id: `gamepad:${pad.index}`, kind: 'standard', buttons: pad.buttons.map((button) => button.pressed), values: pad.buttons.map((button) => button.value), axes: [...pad.axes] });
  }
  for (const extra of padSources) pads.push(...extra());
  return pads;
}
```

  - Delete `STICK_DEADZONE`, `padSteer` and `padTrim`.
  - Replace `BUTTONS` and `buttonLabel` with:

```ts
const BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'D-pad↑', 'D-pad↓', 'D-pad←', 'D-pad→', 'Home', 'L4', 'R4', 'L5', 'R5', '···'];
/** The Steam Controller's own names for the standard buttons it labels differently (spec C1). */
const STEAM_NAMES: Record<number, string> = { 8: 'View', 9: 'Menu', 16: 'Steam' };

/** A button index as printed on the pad: an Xbox-style pad's names, or the Steam Controller's; a dash for an empty slot. */
export function buttonLabel(index: number | undefined, kind: PadKind = 'standard'): string {
  if (index === undefined) return '—';
  return (kind === 'steam' ? STEAM_NAMES[index] : undefined) ?? BUTTONS[index] ?? `Button ${index}`;
}
```

- [ ] **Step 5: Change `Controls.ts`.** Update the import:

```ts
import { heldActions, padValue, readPads, type Action, type Bindings, type PadKind, type PadState } from './Bindings';
import { AxisRamp } from './InputAxes';
import { DEFAULT_STICK, drivingPad, padKey, padSticks, touched, type StickSettings } from './Sticks';
```

Add to `ControlEnvironment`:

```ts
  /** The stick settings (spec C1): which stick trims, the response and the dead zones; the defaults without. */
  stick?: () => StickSettings;
```

Add these fields after `lastDevice`:

```ts
  /** Which pad was used last, so hints name its buttons as printed on it (spec C1). */
  lastPadKind: PadKind = 'standard';
  /** The pad whose sticks steer and trim: the one touched last (spec C1). */
  private driving?: string;
  private readonly stick: () => StickSettings;
```

In the constructor, after `this.pads = ...`: `this.stick = environment.stick ?? (() => DEFAULT_STICK);`. Replace `poll()`:

```ts
  /** Read the gamepads once a frame: new presses fire, held buttons are kept, and the pad touched last drives the sticks. */
  poll(): void {
    const pads = this.pads();
    const now = heldActions(new Set(), pads, this.bindings());
    this.driving = drivingPad(pads, this.driving);
    const used = pads.find(touched);
    if (used) {
      this.lastDevice = 'gamepad';
      this.lastPadKind = used.kind ?? 'standard';
    }
    if (this.active) {
      for (const action of now) if (!this.padPrevious.has(action)) this.press(action);
      this.padHeld = now;
      const sticks = padSticks(pads.find((pad, index) => padKey(pad, index) === this.driving), this.stick());
      this.padSteerValue = sticks.steer;
      this.padTrimValue = sticks.trim;
      this.padCrouchValue = padValue(pads, this.bindings().gamepad.crouch[0]);
    }
    this.padPrevious = now;
  }
```

- [ ] **Step 6: Run them.** Same command. Expected: PASS. Then run `npx vitest run --dir src src/game src/ui`. Expected: `src/ui/settingsModel.test.ts` still passes, because its row count only changes in Task 6.
- [ ] **Step 7: Leave uncommitted.**

---

### Task 5: Settings

**Files:**
- Modify: `src/game/Settings.ts`
- Test: `src/game/Settings.test.ts`

**Interfaces:**
- Consumes: `StickSettings`, `DEFAULT_STICK`, `MAX_DEADZONE` (Task 3); `MAX_BUTTON` (Task 4).
- Produces:
  - `ControlSettings extends StickSettings`, with `padLayout: 2`
  - `seen.steamController: boolean`
  - old saves migrate their pad defaults once

- [ ] **Step 1: Write the failing tests** (add to `Settings.test.ts`'s store `describe`; it already has a `memory()` helper and imports `SETTINGS_KEY`):

```ts
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
    expect(old({ hand: [2], popUp: [0] })).toMatchObject({ hand: [4, 17], popUp: [0, 18] });
    expect(old({ hand: [2], camera: [4] })).toMatchObject({ hand: [2], camera: [4] });
    expect(old({ hand: [2] }, { padLayout: 2 })).toMatchObject({ hand: [2] });
  });
```

- [ ] **Step 2: Run it.** `npx vitest run --dir src src/game/Settings.test.ts`. Expected: FAIL.

- [ ] **Step 3: Change `Settings.ts`.** Update the imports:

```ts
import { ACTIONS, DEFAULT_BINDINGS, MAX_BUTTON, type Action, type Bindings } from './Bindings';
import { DEFAULT_STICK, MAX_DEADZONE, type StickSettings } from './Sticks';
```

Replace `ControlSettings`:

```ts
export interface ControlSettings extends StickSettings {
  bindings: Bindings;
  handedness: 'right' | 'left';
  /** Which default pad layout the bindings started from: 2 since C1 moved the hand to LB. A save without it is migrated once. */
  padLayout: 2;
}
```

In `GameSettings.seen`, add `steamController: boolean` (the menu's Connect button goes once a controller has connected, spec C1):

```ts
  seen: { rideHints: boolean; lowPerformanceNotice: boolean; steamController: boolean };
```

In `defaultSettings()`: `controls: { bindings: copyBindings(DEFAULT_BINDINGS), handedness: 'right', ...DEFAULT_STICK, padLayout: 2 },` and `seen: { rideHints: false, lowPerformanceNotice: false, steamController: false },`.

Replace `sanitizeBindings`:

```ts
/** The pad defaults before C1, which a save from then still holds unless the player changed them. */
const LEGACY_PAD_DEFAULTS: Partial<Record<Action, number[]>> = { hand: [2], popUp: [0] };

function sanitizeBindings(raw: unknown, defaults: Bindings, legacy: boolean): Bindings {
  const source = record(raw);
  const keyboard = record(source.keyboard);
  const gamepad = record(source.gamepad);
  const validKeys = (value: unknown): value is string[] => Array.isArray(value) && value.length >= 1 && value.length <= 2
    && value.every((code) => typeof code === 'string' && code.length > 0);
  const validButtons = (value: unknown): value is number[] => Array.isArray(value) && value.length >= 1 && value.length <= 2
    && value.every((button) => Number.isInteger(button) && button >= 0 && button <= MAX_BUTTON);
  const result = copyBindings(defaults);
  for (const action of ACTIONS) {
    if (action === 'pause') continue;
    if (validKeys(keyboard[action])) result.keyboard[action] = [...keyboard[action]];
    if (validButtons(gamepad[action])) result.gamepad[action] = [...gamepad[action]];
  }
  // C1 moved the hand to LB and added the grips: a save still on the old defaults moves too, unless another action holds a new button.
  if (legacy) {
    for (const [action, old] of Object.entries(LEGACY_PAD_DEFAULTS) as [Action, number[]][]) {
      const fresh = defaults.gamepad[action];
      const unchanged = result.gamepad[action].join() === old.join();
      const taken = ACTIONS.some((other) => other !== action && fresh.some((button) => result.gamepad[other].includes(button)));
      if (unchanged && !taken) result.gamepad[action] = [...fresh];
    }
  }
  return result;
}
```

In `sanitizeSettings`, replace the `controls` block:

```ts
    controls: {
      bindings: sanitizeBindings(controls.bindings, defaults.controls.bindings, controls.padLayout !== 2),
      handedness: oneOf(controls.handedness, ['right', 'left'] as const, defaults.controls.handedness),
      trimStick: oneOf(controls.trimStick, ['right', 'left'] as const, defaults.controls.trimStick),
      stickResponse: oneOf(controls.stickResponse, ['linear', 'precise'] as const, defaults.controls.stickResponse),
      deadzoneSteam: within(controls.deadzoneSteam, 0, MAX_DEADZONE, defaults.controls.deadzoneSteam),
      deadzoneGamepad: within(controls.deadzoneGamepad, 0, MAX_DEADZONE, defaults.controls.deadzoneGamepad),
      padLayout: 2,
    },
```

In the `seen` block add `steamController: flag(seen.steamController, defaults.seen.steamController),`.

- [ ] **Step 4: Run it.** Expected: PASS, and the existing Settings tests still pass: an empty store equals `defaultSettings()`, because the defaults hold the new layout and `padLayout: 2`.
- [ ] **Step 5: Leave uncommitted.**

---

### Task 6: The Controls tab

**Files:**
- Modify: `src/ui/settingsModel.ts`, `src/ui/SettingsScreen.ts`, `src/ui/strings.ts`, `src/ui/ui.css`
- Test: `src/ui/settingsModel.test.ts`

**Interfaces:**
- Consumes: `SteamStatus` (Task 2); `MAX_DEADZONE` (Task 3); `buttonLabel(index, kind)` and `PadKind` (Task 4); the Task 5 settings.
- Produces:
  - `SettingsContext.steam?: SteamStatus` and `SettingsContext.padKind?: PadKind`
  - the row ids `steamConnect`, `trimStick`, `stickResponse`, `deadzoneSteam`, `deadzoneGamepad` and `bind:gamepad:<action>:1`
  - `SettingsScreenOptions.onSteamConnect?(): void` and `SettingsScreenOptions.external?(listener: () => void): () => void`
  - an optional `help` on the choice, slider and button rows

- [ ] **Step 1: Write the failing tests** in `settingsModel.test.ts`. Change the eleven-actions test to two keys and two buttons each:

```ts
  it('lists two keys and two gamepad buttons for each of the eleven actions (P9 adds trim, crouch and the hand; S1 adds mute; C1 a second button)', () => {
    const bindings = settingsModel('controls', defaultSettings(), context).filter((row) => row.kind === 'binding');
    expect(bindings).toHaveLength(44);
    expect(new Set(bindings.map((row) => row.kind === 'binding' && row.action)).size).toBe(11);
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
```

Add the imports: `import type { PadKind } from '../game/Bindings';` and `import type { SteamStatus } from '../game/steam/SteamControllerDriver';`.

- [ ] **Step 2: Run it.** `npx vitest run --dir src src/ui/settingsModel.test.ts`. Expected: FAIL.

- [ ] **Step 3: Add the strings** to `strings.ts`. Put them after `'settings.hand.left'`:

```ts
  'settings.steam': 'Steam Controller',
  'settings.steam.connection': 'Connection',
  'settings.steam.connect': 'Connect',
  'settings.steam.connected': 'Connected',
  'settings.steam.unsupported': 'Needs Chrome or Arc',
  'settings.steam.help': 'Chrome asks once. If the stick still moves the mouse, quit Steam.',
  'settings.sticks': 'Sticks',
  'settings.buttons': 'Buttons',
  'settings.trimStick': 'Trim stick',
  'settings.trimStick.right': 'Right stick',
  'settings.trimStick.left': 'Left stick',
  'settings.stickResponse': 'Stick response',
  'settings.stickResponse.help': 'Precise: finer near centre, full lock at the edge',
  'settings.stickResponse.linear': 'Linear',
  'settings.stickResponse.precise': 'Precise',
  'settings.deadzoneSteam': 'Steam Controller dead zone',
  'settings.deadzoneGamepad': 'Gamepad dead zone',
  'settings.deadzone.help': 'How far the stick moves before it counts',
```

Also add these. After `'hud.stick'`, add `'hud.rightStick': 'Right stick',`. After `'menu.version'`, add `'menu.steamConnect': 'Connect Steam Controller',` and `'menu.steamUnsupported': 'Steam Controller needs Chrome or Arc',`.

- [ ] **Step 4: Change `settingsModel.ts`.**
  - Imports: `import { REBINDABLE, buttonLabel, keyLabel, rebind, type Action, type PadKind } from '../game/Bindings';`, `import { MAX_DEADZONE } from '../game/Sticks';` and `import type { SteamStatus } from '../game/steam/SteamControllerDriver';`.
  - Give the choice, slider and button rows an optional `help?: string`:

```ts
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
```

  - Replace `controlRows`:

```ts
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
```

  - In `settingsModel`, change `if (tab === 'controls') return controlRows(settings);` to `return controlRows(settings, context);`.
  - In `applyRow`, replace the `handedness` line with a set:

```ts
const CONTROLS = new Set(['handedness', 'trimStick', 'stickResponse', 'deadzoneSteam', 'deadzoneGamepad']);
```

  (defined beside `AUDIO`), and `if (CONTROLS.has(id)) return { tab: 'controls', patch: { [id]: value } };`.

- [ ] **Step 5: Change `SettingsScreen.ts`.**
  - Add to `SettingsScreenOptions`:

```ts
  /** Connect the Steam Controller: Chrome's chooser (spec C1). */
  onSteamConnect?(): void;
  /** Something outside the store the rows show changed (the Steam Controller came or went); returns the undo. */
  external?(listener: () => void): () => void;
```

  - In `control(row)`'s button branch, dispatch by id: `on: { click: () => (row.id === 'steamConnect' ? options.onSteamConnect?.() : options.onRedetect()) }`.
  - In `render()`, remove the controls-tab head push at the top. Insert the head before the first binding row. Group four bindings per action, the pad pair in its own `.binding-keys`:

```ts
    let bindingHead = false;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.kind === 'heading') {
        children.push(el('h3', { class: 'panel-subhead', text: row.label }));
      } else if (row.kind === 'binding') {
        if (!bindingHead) {
          bindingHead = true;
          children.push(el('div', { class: 'binding-row binding-head' }, el('span'), el('span', { text: t('settings.keyboard') }), el('span', { text: t('settings.gamepad') })));
        }
        // An action's two keys and two buttons share one line.
        const group = rows.slice(i, i + 4) as Extract<Row, { kind: 'binding' }>[];
        i += 3;
        const bindingButton = (binding: typeof group[number]) => {
          const button = el('button', { class: 'binding', attrs: { type: 'button' }, dataset: { nav: '', focusKey: binding.id }, text: binding.value });
          button.addEventListener('click', () => captureBinding(button, binding));
          return button;
        };
        const help = row.help ? el('small', { class: 'setting-help', text: row.help }) : null;
        children.push(el('div', { class: 'binding-row' },
          el('span', { class: 'setting-label' }, row.label, help),
          el('span', { class: 'binding-keys' }, bindingButton(group[0]), bindingButton(group[1])),
          el('span', { class: 'binding-keys' }, bindingButton(group[2]), bindingButton(group[3]))));
      } else {
        const nextWave = 'nextWave' in row && row.nextWave ? el('span', { class: 'badge-inline', text: t('settings.nextWave') }) : null;
        const help = 'help' in row && row.help ? el('small', { class: 'setting-help', text: row.help }) : null;
        children.push(el('div', { class: 'setting-row' }, el('span', { class: 'setting-label' }, row.label, nextWave, help), control(row)));
      }
    }
```

  - Subscribe to the external source, and undo both on dispose:

```ts
  const stop = store.subscribe(render);
  const stopExternal = options.external?.(render);
  render();
  return { root, dispose: () => { stop(); stopExternal?.(); } };
```

- [ ] **Step 6: Change `ui.css`.** The pad column now holds two buttons: `.binding-row { display: grid; grid-template-columns: minmax(7em, 1fr) minmax(0, 1.4fr) minmax(0, 1.4fr); align-items: center; gap: .6em; }`.

- [ ] **Step 7: Run it.** `npx vitest run --dir src src/ui`. Expected: PASS.
- [ ] **Step 8: Leave uncommitted.**

---

### Task 7: Wiring: the game, the menu and the hints

**Files:**
- Modify: `src/main.ts`, `src/ui/App.ts`, `src/ui/MainMenu.ts`
- Test: `src/ui/MainMenu.test.ts` (the strip button)

**Interfaces:**
- Consumes: Tasks 2, 4, 5 and 6.
- Produces:
  - `App`'s options take `steam?: SteamControllerDriver`
  - `createMainMenu`'s options take `steam?: { label: string; disabled: boolean; connect(): void }`
  - `steamStrip(status: SteamStatus, seen: boolean): { label: StringKey; disabled: boolean } | undefined`, exported from `MainMenu.ts` for the test

- [ ] **Step 1: Write the failing test** in `MainMenu.test.ts`:

```ts
import { menuTiles, steamStrip } from './MainMenu';

describe('steamStrip (C1)', () => {
  it('offers to connect until a controller has connected once, and says what Safari needs', () => {
    expect(steamStrip('disconnected', false)).toEqual({ label: 'menu.steamConnect', disabled: false });
    expect(steamStrip('unsupported', false)).toEqual({ label: 'menu.steamUnsupported', disabled: true });
    expect(steamStrip('connected', false)).toBeUndefined();
    expect(steamStrip('disconnected', true)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it.** `npx vitest run --dir src src/ui/MainMenu.test.ts`. Expected: FAIL (`steamStrip` missing).

- [ ] **Step 3: Change `MainMenu.ts`.**

```ts
import type { SteamStatus } from '../game/steam/SteamControllerDriver';

/** The menu strip's Steam Controller button (spec C1): Connect until one has connected once; in a browser without WebHID, what it needs. */
export function steamStrip(status: SteamStatus, seen: boolean): { label: StringKey; disabled: boolean } | undefined {
  if (seen || status === 'connected') return undefined;
  return status === 'unsupported' ? { label: 'menu.steamUnsupported', disabled: true } : { label: 'menu.steamConnect', disabled: false };
}
```

Extend `createMainMenu`'s options with `steam?: { label: string; disabled: boolean; connect(): void }`. Put the button in the strip group after the sound toggle:

```ts
        soundToggle('strip-button', options.sound.muted, options.sound.toggle),
        options.steam ? el('button', {
          class: 'strip-button',
          attrs: { type: 'button', ...(options.steam.disabled ? { 'aria-disabled': 'true' } : {}) },
          dataset: { nav: '' },
          text: options.steam.label,
          on: { click: () => { if (!options.steam?.disabled) options.steam?.connect(); } },
        }) : null),
```

- [ ] **Step 4: Change `App.ts`.**
  - Imports: `import type { SteamControllerDriver } from '../game/steam/SteamControllerDriver';` and `import { createMainMenu, refreshSoundToggles, steamStrip } from './MainMenu';`.
  - Add the field `private readonly steam?: SteamControllerDriver;`. Change the constructor's options type to `{ startInWaveLab: boolean; steam?: SteamControllerDriver }`, and at its end (before `this.show()`):

```ts
    this.steam = options.steam;
    this.steam?.onChange(() => this.steamChanged());
```

  - Add the method:

```ts
  /** A Steam Controller came or went (spec C1): once one has connected, the menu's Connect button goes for good. */
  private steamChanged(): void {
    if (this.steam?.status !== 'connected' || this.settings.value.seen.steamController) return;
    this.settings.markSeen('steamController');
    if (this.stack.current === 'menu') this.show();
  }
```

  - In `render('menu')`, pass the strip option:

```ts
    if (id === 'menu') {
      const strip = this.steam ? steamStrip(this.steam.status, this.settings.value.seen.steamController) : undefined;
      return [createMainMenu({
        ...handlers unchanged...
      }, {
        devTools: DEV_TOOLS, version: packageJson.version, sound: { muted: this.sound.muted, toggle: () => this.toggleMute() },
        ...(strip ? { steam: { label: t(strip.label), disabled: strip.disabled, connect: () => void this.steam?.request() } } : {}),
      })];
    }
```

  - In `render('settings')`, extend the options:

```ts
        context: () => ({ devTools: DEV_TOOLS, detecting: this.detecting, steam: this.steam?.status ?? 'unsupported', padKind: this.controls.lastPadKind }),
        onSteamConnect: () => void this.steam?.request(),
        ...(this.steam ? { external: (listener: () => void) => this.steam!.onChange(listener) } : {}),
```

  - In `hintText` and `hintKeys`, name the buttons for the pad used last. In `hintText`, the trim hint names the stick that trims:

```ts
    const kind = this.controls.lastPadKind;
    const label = (action: Action) => (pad ? buttonLabel(bindings.gamepad[action][0], kind) : keyLabel(bindings.keyboard[action][0]));
    const trimStick = t(this.settings.value.controls.trimStick === 'right' ? 'hud.rightStick' : 'hud.stick');
    const keys = id === 'lean' ? (pad ? t('hud.stick') : `${label('steerLeft')} ${label('steerRight')}`)
      : id === 'trim' ? (pad ? trimStick : `${label('trimForward')} ${label('trimBack')}`)
        : label(id);
```

  In `hintKeys`, change only the `label` line in the same way: `buttonLabel(bindings.gamepad[action][0], this.controls.lastPadKind)`.

- [ ] **Step 5: Change `main.ts`.** Import `addPadSource` from `./game/Bindings` (extend the existing import if there is one) and `SteamControllerDriver` from `./game/steam/SteamControllerDriver`. Before `const controls = ...`:

```ts
// C1: the 2026 Steam Controller over WebHID, offered to every pad reader as one more standard pad.
const steamController = new SteamControllerDriver();
addPadSource(() => steamController.pads());
void steamController.start();
```

Pass the stick settings to `Controls` as a third argument, `{ stick: () => settings.value.controls }`. Pass `steam: steamController` in `App`'s options.

- [ ] **Step 6: Run everything.** Run `npx vitest run --dir src`, expecting everything to PASS. Then run `npm run build`, expecting no type errors and a finished build.
- [ ] **Step 7: Check in the browser.**
  - Start the dev server (`.claude/launch.json` entry `steam-controller`, port 5187) and open `/`. The menu strip shows "Connect Steam Controller", or the Safari text if the pane has no WebHID.
  - Settings › Controls shows Steam Controller, Sticks (four rows), then Buttons with two key and two pad columns.
  - Changing Trim stick and the sliders sticks after a reload.
  - The console shows no errors.
- [ ] **Step 8: Leave uncommitted.**

---

### Task 8: The hardware check page, credit and records

**Files:**
- Create: `controller-check.html`, `src/controllerCheck.ts`, `.claude/launch.json` (only if missing)
- Modify: `docs/ASSETS.md`, `ROADMAP.md`

**Interfaces:**
- Consumes: Task 1 (`decodeState`, `tritonPad`, `lizardModeReport`, `mappingsReport`, `featureLength`, `FEATURE_REPORT_ID`, `VALVE_VENDOR`, `VENDOR_USAGE_PAGE`) and Task 4 (`buttonLabel`).
- Produces: a dev page; a downloadable recording `steam-controller-recording.json` (`{ device, productId, reportId, t, bytes }[]`).

- [ ] **Step 1: Write `controller-check.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Steam Controller check</title>
    <style>
      body { font: 13px/1.5 ui-monospace, monospace; margin: 16px; background: #0d1117; color: #d6dde6; }
      button, label { font: inherit; margin: 0 6px 6px 0; }
      pre { white-space: pre-wrap; }
      #live { color: #9fe0b8; min-height: 12em; }
    </style>
  </head>
  <body>
    <h1>Steam Controller check (C1)</h1>
    <p>Chrome or Arc, on localhost. Plug the controller in (Puck or cable), press Connect and pick it. Then move the sticks, press every button, and check that the mouse no longer moves. Record 5 s at rest and 5 s moving, and download both.</p>
    <div>
      <button id="connect" type="button">Connect…</button>
      <button id="lizard-off" type="button">Lizard off</button>
      <button id="lizard-on" type="button">Lizard on</button>
      <button id="mappings-clear" type="button">Clear mappings (fallback)</button>
      <button id="mappings-default" type="button">Default mappings</button>
      <label><input id="keepalive" type="checkbox" checked /> Keep lizard off every second</label>
      <button id="record" type="button">Record 5 s</button>
    </div>
    <pre id="live"></pre>
    <pre id="log">Starting…</pre>
    <script type="module" src="/src/controllerCheck.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Write `src/controllerCheck.ts`**

```ts
/**
 * Hardware check for the 2026 Steam Controller (spec C1, dev only: /controller-check.html).
 * Lists what the Gamepad API sees, opens the controller over WebHID, turns lizard mode
 * off, shows its live state and report rates, and records raw reports for the tests.
 */
import { buttonLabel } from './game/Bindings';
import { FEATURE_REPORT_ID, VALVE_VENDOR, VENDOR_USAGE_PAGE, decodeState, featureLength, lizardModeReport, mappingsReport, tritonPad } from './game/steam/tritonProtocol';
import { webHid, type HIDDevice, type HIDInputReportEvent } from './game/steam/webHid';

interface Opened {
  device: HIDDevice;
  index: number;
  counts: Map<number, number>;
  rates: string;
  pad?: ReturnType<typeof tritonPad>;
  raw?: string;
}

const log = document.querySelector<HTMLPreElement>('#log')!;
const live = document.querySelector<HTMLPreElement>('#live')!;
const lines: string[] = [];
const say = (line: string) => {
  lines.push(line);
  log.textContent = lines.join('\n');
};
const hex = (value: number, width = 4) => `0x${value.toString(16).padStart(width, '0')}`;
const bytes = (data: DataView) => Array.from(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
const opened: Opened[] = [];
let recording: { device: number; productId: number; reportId: number; t: number; bytes: number[] }[] | undefined;

function describe(device: HIDDevice): string {
  const collections = device.collections.map((collection) => {
    const ids = (reports?: { reportId: number }[]) => (reports ?? []).map((report) => hex(report.reportId, 2)).join(',') || '-';
    return `    page ${hex(collection.usagePage)} usage ${hex(collection.usage)} in[${ids(collection.inputReports)}] out[${ids(collection.outputReports)}] feature[${ids(collection.featureReports)}]`;
  });
  return [`${device.productName} ${hex(device.vendorId)}:${hex(device.productId)} feature length ${featureLength(device.collections)}`, ...collections].join('\n');
}

async function open(device: HIDDevice): Promise<void> {
  if (opened.some((entry) => entry.device === device)) return;
  const entry: Opened = { device, index: opened.length, counts: new Map(), rates: '' };
  opened.push(entry);
  say(`Device ${entry.index}: ${describe(device)}`);
  if (!device.collections.some((collection) => collection.usagePage === VENDOR_USAGE_PAGE)) {
    say(`  (no vendor collection; not opened)`);
    return;
  }
  device.addEventListener('inputreport', (event) => {
    const { reportId, data } = event as HIDInputReportEvent;
    entry.counts.set(reportId, (entry.counts.get(reportId) ?? 0) + 1);
    recording?.push({ device: entry.index, productId: device.productId, reportId, t: Math.round(performance.now()), bytes: bytes(data) });
    const state = decodeState(reportId, data);
    if (state) {
      entry.pad = tritonPad(state, `steam:${entry.index}`);
      entry.raw = bytes(data).slice(0, 17).map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
    } else if (!entry.counts.has(-reportId)) {
      entry.counts.set(-reportId, 1);
      say(`  device ${entry.index}: first report ${hex(reportId, 2)} (${data.byteLength} bytes): ${bytes(data).slice(0, 16).join(' ')}`);
    }
  });
  try {
    if (!device.opened) await device.open();
    say(`  opened`);
  } catch (error) {
    say(`  open failed: ${String(error)}`);
  }
}

async function send(label: string, report: (length: number) => Uint8Array): Promise<void> {
  const targets = opened.filter((entry) => entry.pad);
  for (const entry of targets.length > 0 ? targets : opened) {
    try {
      await entry.device.sendFeatureReport(FEATURE_REPORT_ID, report(featureLength(entry.device.collections)));
      if (label) say(`${label} → device ${entry.index}: sent`);
    } catch (error) {
      say(`${label || 'keepalive'} → device ${entry.index}: ${String(error)}`);
    }
  }
}

function render(): void {
  const pads = Array.from(navigator.getGamepads?.() ?? []).filter((pad): pad is Gamepad => pad !== null);
  const gamepadLines = pads.length === 0 ? ['Gamepad API: no pads'] : pads.map((pad) => `Gamepad API ${pad.index}: ${pad.id} mapping=${pad.mapping || 'none'} buttons=${pad.buttons.length} axes=${pad.axes.length}`);
  const hidLines = opened.filter((entry) => entry.pad).map((entry) => {
    const pad = entry.pad!;
    const down = pad.buttons.flatMap((pressed, index) => (pressed ? [buttonLabel(index, 'steam')] : []));
    return [
      `WebHID device ${entry.index}: ${entry.rates}`,
      `  buttons: ${down.join(' ') || '-'}`,
      `  left stick ${pad.axes[0].toFixed(3)} ${pad.axes[1].toFixed(3)}   right stick ${pad.axes[2].toFixed(3)} ${pad.axes[3].toFixed(3)}`,
      `  LT ${pad.values![6].toFixed(3)}  RT ${pad.values![7].toFixed(3)}`,
      `  raw ${entry.raw}`,
    ].join('\n');
  });
  live.textContent = [...gamepadLines, ...hidLines].join('\n');
}

const hid = webHid();
say(`Secure context: ${window.isSecureContext}. WebHID: ${hid ? 'yes' : 'no'}. ${navigator.userAgent}`);
if (hid) {
  for (const device of await hid.getDevices()) await open(device);
  hid.addEventListener('connect', (event) => void open((event as unknown as { device: HIDDevice }).device));
  hid.addEventListener('disconnect', (event) => say(`disconnected: ${(event as unknown as { device: HIDDevice }).device.productName}`));
}

document.querySelector('#connect')!.addEventListener('click', async () => {
  if (!hid) return say('No WebHID here: use Chrome or Arc on localhost.');
  try {
    const devices = await hid.requestDevice({ filters: [{ vendorId: VALVE_VENDOR }] });
    say(`Chooser returned ${devices.length} device(s)`);
    for (const device of devices) await open(device);
  } catch (error) {
    say(`Chooser: ${String(error)}`);
  }
});
document.querySelector('#lizard-off')!.addEventListener('click', () => void send('Lizard off (SDL)', (length) => lizardModeReport(false, length)));
document.querySelector('#lizard-on')!.addEventListener('click', () => void send('Lizard on (SDL)', (length) => lizardModeReport(true, length)));
document.querySelector('#mappings-clear')!.addEventListener('click', () => void send('Clear mappings 0x81', (length) => mappingsReport(true, length)));
document.querySelector('#mappings-default')!.addEventListener('click', () => void send('Default mappings 0x85', (length) => mappingsReport(false, length)));
document.querySelector('#record')!.addEventListener('click', () => {
  recording = [];
  say('Recording 5 s…');
  setTimeout(() => {
    const data = recording ?? [];
    recording = undefined;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    link.download = 'steam-controller-recording.json';
    link.textContent = `Download recording (${data.length} reports)`;
    log.after(link);
    say(`Recorded ${data.length} reports.`);
  }, 5000);
});

const keepalive = document.querySelector<HTMLInputElement>('#keepalive')!;
setInterval(() => {
  if (keepalive.checked && document.visibilityState === 'visible') void send('', (length) => lizardModeReport(false, length));
  for (const entry of opened) {
    entry.rates = [...entry.counts].filter(([id]) => id >= 0).map(([id, count]) => `${hex(id, 2)} ${count}/s`).join('  ') || 'no reports';
    for (const id of [...entry.counts.keys()]) if (id >= 0) entry.counts.set(id, 0);
  }
}, 1000);
setInterval(render, 100);
```

- [ ] **Step 3: Launch config.** If `.claude/launch.json` is missing, create:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "steam-controller", "runtimeExecutable": "npx", "runtimeArgs": ["vite", "--port", "5187", "--strictPort"], "port": 5187 }
  ]
}
```

- [ ] **Step 4: Run** `npm run build` and `npx vitest run --dir src`. Expected: both pass.
- [ ] **Step 5: Open** `/controller-check.html` in the browser pane. It loads, and says whether WebHID exists. The pane may lack WebHID; the user's Chrome has it.
- [ ] **Step 6: Credit SDL** in `docs/ASSETS.md`: a "Code (C1)" section naming SDL's Triton driver (zlib licence, copyright Sam Lantinga and Valve), the files ported, and SteamlessController's report notes.
- [ ] **Step 7: Update `ROADMAP.md`.** Add a `### P1 · Steam Controller (C1) — \`In Progress\`` section after Sound. It links the spec and plan, lists what is built, and ends with the open items: the user's hardware check (`controller-check.html`), recorded fixtures, and the hand check in a ride. Remove Backlog item 4, whose hand check this now covers.
- [ ] **Step 8: Leave uncommitted.**

---

## Self-review

- **Spec coverage:**
  - WebHID, Chrome and Arc, Safari text: Tasks 2, 6 and 7.
  - Puck, USB and Bluetooth report IDs: Task 1.
  - Check page: Task 8.
  - Steam advice: Task 6.
  - Connecting (chooser, reconnect, menu strip until seen): Tasks 2, 5 and 7.
  - Lizard mode (off while visible, on when hidden, repeated every second): Task 2.
  - Trim stick setting (right default), response Linear/Precise, per-device dead zones, last-touched pad: Tasks 3, 4, 5 and 6.
  - Standard pad with extras 17–21: Task 1.
  - Hand on LB plus L4, pop-up plus R4, two pad slots, migration: Tasks 4, 5 and 6.
  - Button names by device, trim hint: Tasks 4 and 7.
  - Credit: Task 8.
  - Nothing unassigned.
- **Types:** these names are consistent across tasks:
  - `SteamStatus`, `PadKind`, `StickSettings`, `padSticks`, `drivingPad`, `padKey`, `touched`
  - `buttonLabel(index, kind)`, `addPadSource`, `MAX_BUTTON`, `MAX_DEADZONE`
  - `lizardModeReport(on, length)`, `featureLength(collections)`
- **Out of scope, per the spec:** gyro, trackpads and rumble.
