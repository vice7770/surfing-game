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
export function lizardModeReport(on: boolean, length = FEATURE_REPORT_BYTES): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(length);
  data.set([SET_SETTINGS_VALUES, 3, SETTING_LIZARD_MODE, on ? 1 : 0, 0]);
  return data;
}

/** SteamlessController's alternative: clear the digital mappings (lizard off) or restore the defaults (on). The check page tries it. */
export function mappingsReport(clear: boolean, length = FEATURE_REPORT_BYTES): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(length);
  data[0] = clear ? CLEAR_DIGITAL_MAPPINGS : SET_DEFAULT_MAPPINGS;
  return data;
}
