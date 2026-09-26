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

  // P9: lying down ArrowUp paddles; standing it trims forward. A key may do one thing in each context.
  it('lets a key serve one action lying down and another standing, but swaps within a context', () => {
    const upOnlyW = { ...DEFAULT_BINDINGS, keyboard: { ...DEFAULT_BINDINGS.keyboard, trimForward: ['KeyW'] } };
    const both = rebind(upOnlyW, 'keyboard', 'trimForward', 1, 'ArrowUp');
    expect(both.keyboard.trimForward).toEqual(['KeyW', 'ArrowUp']);
    expect(both.keyboard.paddle).toEqual(['Space', 'ArrowUp']);
    const crouchOnS = rebind(DEFAULT_BINDINGS, 'keyboard', 'crouch', 0, 'KeyS');
    expect(crouchOnS.keyboard.crouch).toEqual(['KeyS', 'ShiftRight']);
    expect(crouchOnS.keyboard.trimBack).toEqual(['ShiftLeft', 'ArrowDown']);
    // An action used in every context still swaps with a standing one.
    expect(rebind(DEFAULT_BINDINGS, 'keyboard', 'retry', 0, 'KeyE').keyboard.hand).toEqual(['KeyR']);
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
