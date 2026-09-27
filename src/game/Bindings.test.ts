import { describe, expect, it } from 'vitest';
import { ACTIONS, ACTION_CONTEXT, DEFAULT_BINDINGS, REBINDABLE, addPadSource, buttonLabel, heldActions, keyLabel, readPads, rebind, type PadState } from './Bindings';

const pad = (buttons: number[] = [], x = 0): PadState => ({
  buttons: Array.from({ length: 22 }, (_, i) => buttons.includes(i)), axes: [x, 0, 0, 0],
});

describe('bindings', () => {
  it('reads the default keys and pad buttons as actions', () => {
    expect(heldActions(new Set(['Space', 'KeyA']), [], DEFAULT_BINDINGS)).toEqual(new Set(['paddle', 'compress', 'steerLeft']));
    expect(heldActions(new Set(), [pad([7, 15])], DEFAULT_BINDINGS)).toEqual(new Set(['paddle', 'compress', 'steerRight']));
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

  // The stances spec: Compress on Space and the right trigger standing, where they paddle lying down; its own input
  // standing, apart from the crouch's (Shift, the left trigger).
  it('compresses on Space and the right trigger standing, which paddle lying down', () => {
    expect(ACTION_CONTEXT.compress).toBe('standing');
    expect(DEFAULT_BINDINGS.keyboard.compress).toEqual(['Space']);
    expect(DEFAULT_BINDINGS.gamepad.compress).toEqual([7]);
    expect(DEFAULT_BINDINGS.keyboard.paddle).toContain('Space');
    expect(DEFAULT_BINDINGS.gamepad.paddle).toEqual([7]);
    for (const action of REBINDABLE) {
      if (action === 'compress' || ACTION_CONTEXT[action] === 'prone') continue;
      expect(DEFAULT_BINDINGS.keyboard[action]).not.toContain('Space');
      expect(DEFAULT_BINDINGS.gamepad[action]).not.toContain(7);
    }
    expect(REBINDABLE).toContain('compress');
    const onShift = rebind(DEFAULT_BINDINGS, 'keyboard', 'compress', 0, 'ShiftLeft');
    expect(onShift.keyboard.compress).toEqual(['ShiftLeft']);
    expect(onShift.keyboard.crouch).toEqual(['Space', 'ShiftRight']);
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
  it('reaches for the water with LB or L4, pops up with A or R4, and leaves L5 and R5 free', () => {
    expect(heldActions(new Set(), [pad([4])], DEFAULT_BINDINGS)).toEqual(new Set(['hand']));
    expect(heldActions(new Set(), [pad([17])], DEFAULT_BINDINGS)).toEqual(new Set(['hand']));
    expect(heldActions(new Set(), [pad([18])], DEFAULT_BINDINGS)).toEqual(new Set(['popUp']));
    expect(heldActions(new Set(), [pad([19]), pad([20])], DEFAULT_BINDINGS).size).toBe(0);
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

  // N1: surf calls online, on 1–4 and four spare pad buttons, rebindable. C1 moved the party call from LB to X, which the hand left.
  it('shouts the four surf calls on 1–4 and spare pad buttons, clashing with nothing', () => {
    expect(heldActions(new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4']), [], DEFAULT_BINDINGS))
      .toEqual(new Set(['callLeft', 'callRight', 'callParty', 'callNice']));
    expect(heldActions(new Set(), [pad([10, 11, 2, 1])], DEFAULT_BINDINGS)).toEqual(new Set(['callLeft', 'callRight', 'callParty', 'callNice']));
    for (const call of ['callLeft', 'callRight', 'callParty', 'callNice'] as const) {
      expect(REBINDABLE).toContain(call);
      for (const code of DEFAULT_BINDINGS.keyboard[call]) expect(heldActions(new Set([code]), [], DEFAULT_BINDINGS)).toEqual(new Set([call]));
    }
  });

  it('gives no default pad button two actions that can be live at once', () => {
    for (const a of ACTIONS) {
      for (const b of ACTIONS) {
        const live = ACTION_CONTEXT[a] === 'always' || ACTION_CONTEXT[b] === 'always' || ACTION_CONTEXT[a] === ACTION_CONTEXT[b];
        if (a === b || !live) continue;
        const shared = DEFAULT_BINDINGS.gamepad[a].filter((button) => DEFAULT_BINDINGS.gamepad[b].includes(button));
        expect(shared, `${a} and ${b}`).toEqual([]);
      }
    }
  });

  it('mutes with M or the gamepad\'s Back button, rebindable like the rest (S1)', () => {
    expect(heldActions(new Set(['KeyM']), [], DEFAULT_BINDINGS)).toEqual(new Set(['mute']));
    expect(REBINDABLE).toContain('mute');
    expect(rebind(DEFAULT_BINDINGS, 'keyboard', 'mute', 0, 'KeyN').keyboard.mute).toEqual(['KeyN']);
  });
});

