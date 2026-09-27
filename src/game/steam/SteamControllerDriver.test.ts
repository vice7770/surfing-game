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
