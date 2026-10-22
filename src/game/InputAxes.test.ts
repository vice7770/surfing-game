import { describe, expect, it } from 'vitest';
import { AxisRamp, DOUBLE_PRESS_WINDOW, RAMP_TIME, SprintPress } from './InputAxes';

describe('AxisRamp', () => {
  it('reaches a held key in 0.2 s, lets go at the same rate, and reverses in 0.4 s', () => {
    expect(RAMP_TIME).toBe(0.2);
    const ramp = new AxisRamp();
    expect(ramp.update(1, 0.1)).toBeCloseTo(0.5, 9);
    expect(ramp.update(1, 0.1)).toBeCloseTo(1, 9);
    expect(ramp.update(1, 0.1)).toBe(1);
    expect(ramp.update(0, 0.1)).toBeCloseTo(0.5, 9);
    expect(ramp.update(0, 0.1)).toBeCloseTo(0, 9);
    ramp.update(1, 0.2);
    expect(ramp.update(-1, 0.2)).toBeCloseTo(0, 9);
    expect(ramp.update(-1, 0.2)).toBeCloseTo(-1, 9);
    expect(ramp.value).toBeCloseTo(-1, 9);
  });

  it('starts over from rest', () => {
    const ramp = new AxisRamp();
    ramp.update(1, 0.2);
    ramp.reset();
    expect(ramp.value).toBe(0);
    expect(ramp.update(1, 0.05)).toBeCloseTo(0.25, 9);
  });
});

// The sprint paddle (the owner's choices of 2026-10-22): double-press the paddle and keep holding it.
describe('SprintPress', () => {
  const STEP = 1 / 60;
  /** Hold (or not) for `seconds` at 60 frames a second; whether the last frame sprints. */
  const hold = (press: SprintPress, held: boolean, seconds: number) => {
    let sprinting = false;
    for (let i = 0; i < Math.round(seconds / STEP); i += 1) sprinting = press.update(held, STEP);
    return sprinting;
  };

  it('cruises on a single press held, however long', () => {
    const press = new SprintPress();
    expect(hold(press, true, 5)).toBe(false);
  });

  it('sprints on a release and a press again within the window, while held, and stops when let go', () => {
    expect(DOUBLE_PRESS_WINDOW).toBe(0.3);
    const press = new SprintPress();
    hold(press, true, 0.1);
    hold(press, false, 0.15);
    expect(hold(press, true, 3)).toBe(true);
    expect(press.update(false, STEP)).toBe(false);
    // Pressed again at once, it sprints again: a double press from the sprint.
    expect(press.update(true, STEP)).toBe(true);
  });

  it('cruises when the second press comes after the window', () => {
    const press = new SprintPress();
    hold(press, true, 0.1);
    hold(press, false, 0.35);
    expect(hold(press, true, 1)).toBe(false);
  });

  it('does not sprint on the first press after a reset (a menu, the window losing focus)', () => {
    const press = new SprintPress();
    hold(press, true, 0.1);
    hold(press, false, 0.1);
    press.reset();
    expect(hold(press, true, 1)).toBe(false);
  });
});
