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
