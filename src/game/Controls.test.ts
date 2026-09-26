import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_BINDINGS, type PadState } from './Bindings';
import { Controls } from './Controls';

const pad = (buttons: number[] = [], x = 0): PadState => ({
  buttons: Array.from({ length: 17 }, (_, i) => buttons.includes(i)), axes: [x, 0, 0, 0],
});

function setup() {
  const target = new EventTarget();
  let pads: PadState[] = [];
  const handlers = { retry: vi.fn(), camera: vi.fn(), pause: vi.fn() };
  const controls = new Controls(() => DEFAULT_BINDINGS, handlers, { target, pads: () => pads });
  const key = (type: 'keydown' | 'keyup', code: string, repeat = false) =>
    target.dispatchEvent(Object.assign(new Event(type), { code, repeat }));
  return { controls, handlers, key, target, setPads: (next: PadState[]) => { pads = next; } };
}

describe('Controls', () => {
  it('fires a press once, however long the key is held', () => {
    const { handlers, key } = setup();
    key('keydown', 'KeyR');
    key('keydown', 'KeyR', true);
    expect(handlers.retry).toHaveBeenCalledTimes(1);
  });

  it('does not keep paddling after a pause taken while Space was held', () => {
    const { controls, key } = setup();
    key('keydown', 'Space');
    expect(controls.input.paddle).toBe(true);
    controls.enabled = false;
    key('keyup', 'Space');
    controls.enabled = true;
    expect(controls.input.paddle).toBe(false);
  });

  it('lets go of paddle and steer when the gamepad is unplugged', () => {
    const { controls, setPads } = setup();
    setPads([pad([7], -1)]);
    controls.poll();
    expect(controls.input).toMatchObject({ paddle: true, steer: -1 });
    setPads([]);
    controls.poll();
    expect(controls.input).toMatchObject({ paddle: false, steer: 0 });
  });

  it('pops up from the pad on the press, not while held', () => {
    const { controls, setPads } = setup();
    setPads([pad([0])]);
    controls.poll();
    expect(controls.input.getUp).toBe(true);
    controls.consumeGetUp();
    controls.poll();
    expect(controls.input.getUp).toBe(false);
  });

  it('remembers whether the keyboard or a gamepad was used last, for the hints', () => {
    const { controls, key, setPads } = setup();
    expect(controls.lastDevice).toBe('keyboard');
    setPads([pad([0])]);
    controls.poll();
    expect(controls.lastDevice).toBe('gamepad');
    key('keydown', 'Space');
    expect(controls.lastDevice).toBe('keyboard');
  });
});

describe('the ride request (P9)', () => {
  const analog = (values: Record<number, number>, axes = [0, 0, 0, 0]): PadState => ({
    buttons: Array.from({ length: 17 }, (_, i) => (values[i] ?? 0) > 0.5),
    values: Array.from({ length: 17 }, (_, i) => values[i] ?? 0),
    axes,
  });

  it('paddles on ArrowUp lying down and trims forward on it standing', () => {
    const prone = setup();
    prone.key('keydown', 'ArrowUp');
    expect(prone.controls.rideRequest(0.2, false)).toMatchObject({ paddle: true, trim: 0 });
    const standing = setup();
    standing.key('keydown', 'ArrowUp');
    expect(standing.controls.rideRequest(0.2, true)).toMatchObject({ paddle: false, trim: 1 });
  });

  it('crouches on Shift and reaches for the water on E only standing', () => {
    const prone = setup();
    prone.key('keydown', 'ShiftLeft');
    prone.key('keydown', 'KeyE');
    expect(prone.controls.rideRequest(0.2, false)).toMatchObject({ crouch: 0, hand: false });
    const standing = setup();
    standing.key('keydown', 'ShiftLeft');
    standing.key('keydown', 'KeyE');
    expect(standing.controls.rideRequest(0.2, true)).toMatchObject({ crouch: 1, hand: true });
  });

  it('ramps keys in over 0.2 s; opposite keys cancel, and unbound keys do nothing', () => {
    const { controls, key } = setup();
    key('keydown', 'KeyW');
    expect(controls.rideRequest(0.1, true).trim).toBeCloseTo(0.5, 9);
    key('keydown', 'KeyS');
    expect(controls.rideRequest(0.1, true).trim).toBeCloseTo(0, 9);
    const other = setup();
    other.key('keydown', 'ControlLeft');
    expect(other.controls.rideRequest(0.2, true)).toMatchObject({ paddle: false, steer: 0, trim: 0, crouch: 0, hand: false });
  });

  it('passes the pad’s trigger and stick straight through', () => {
    const { controls, setPads } = setup();
    setPads([analog({ 6: 0.5 }, [0, -0.8, 0, 0])]);
    controls.poll();
    const request = controls.rideRequest(1 / 60, true);
    expect(request.crouch).toBeCloseTo(0.5, 9);
    expect(request.trim).toBeGreaterThan(0.7);
  });

  // Review Focus 5: nothing stays held through a pause or a lost focus.
  it('lets every axis go within 0.2 s of a pause or a blur', () => {
    for (const leave of ['pause', 'blur'] as const) {
      const { controls, key, target } = setup();
      for (const code of ['KeyW', 'ShiftLeft', 'ArrowLeft', 'KeyE']) key('keydown', code);
      controls.rideRequest(0.3, true);
      if (leave === 'pause') controls.enabled = false;
      else target.dispatchEvent(new Event('blur'));
      expect(controls.rideRequest(0.2, true)).toMatchObject({ trim: 0, crouch: 0, steer: 0, hand: false, paddle: false });
    }
  });
});
