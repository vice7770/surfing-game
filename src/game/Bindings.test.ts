import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, REBINDABLE, addPadSource, buttonLabel, heldActions, keyLabel, readPads, rebind, type PadState } from './Bindings';

const pad = (buttons: number[] = [], x = 0): PadState => ({
  buttons: Array.from({ length: 22 }, (_, i) => buttons.includes(i)), axes: [x, 0, 0, 0],
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

  it('mutes with M or the gamepad\'s Back button, rebindable like the rest (S1)', () => {
    expect(heldActions(new Set(['KeyM']), [], DEFAULT_BINDINGS)).toEqual(new Set(['mute']));
    expect(REBINDABLE).toContain('mute');
    expect(rebind(DEFAULT_BINDINGS, 'keyboard', 'mute', 0, 'KeyN').keyboard.mute).toEqual(['KeyN']);
  });
});

