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
