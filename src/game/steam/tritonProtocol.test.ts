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
