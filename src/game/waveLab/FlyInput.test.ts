import { describe, expect, it, vi } from 'vitest';
import type { PadState } from '../Bindings';
import { FlyInput, LOOK_PER_PIXEL, PAD_LOOK_RATE } from './FlyInput';

const pad = (buttons: number[] = [], axes = [0, 0, 0, 0]): PadState => ({ buttons: Array.from({ length: 17 }, (_, i) => buttons.includes(i)), axes });

function setup() {
  const keys = new EventTarget();
  const surface = new EventTarget();
  let pads: PadState[] = [];
  const actions = { follow: vi.fn(), jump: vi.fn(), hideUi: vi.fn(), togglePause: vi.fn(), step: vi.fn(), slower: vi.fn(), faster: vi.fn(), pause: vi.fn(), speed: vi.fn() };
  const input = new FlyInput(actions, { keys, surface, pads: () => pads });
  const key = (type: 'keydown' | 'keyup', code: string, target?: { tagName: string }) => {
    const event = Object.assign(new Event(type), { code, repeat: false });
    if (target) Object.defineProperty(event, 'target', { value: target });
    keys.dispatchEvent(event);
  };
  const pointer = (type: string, x: number, y: number) => surface.dispatchEvent(Object.assign(new Event(type), { clientX: x, clientY: y, pointerId: 1 }));
  return { input, actions, key, pointer, surface, setPads: (next: PadState[]) => { pads = next; } };
}

describe('FlyInput', () => {
  it('flies with WASD, Q/E and Shift', () => {
    const { input, key } = setup();
    key('keydown', 'KeyW');
    key('keydown', 'KeyD');
    key('keydown', 'KeyE');
    key('keydown', 'ShiftLeft');
    expect(input.read(1 / 60)).toMatchObject({ forward: 1, strafe: 1, rise: 1, fast: true });
    key('keyup', 'KeyW');
    key('keydown', 'KeyQ');
    expect(input.read(1 / 60)).toMatchObject({ forward: 0, rise: 0 });
  });

  it('looks by dragging, once per drag distance', () => {
    const { input, pointer } = setup();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 110, 95);
    const control = input.read(1 / 60);
    // Dragging right turns right: toward −x when facing +z, so the yaw falls.
    expect(control.yaw).toBeCloseTo(-10 * LOOK_PER_PIXEL, 9);
    expect(control.pitch).toBeCloseTo(5 * LOOK_PER_PIXEL, 9);
    expect(input.read(1 / 60).yaw).toBe(0);
    pointer('pointerup', 110, 95);
    pointer('pointermove', 200, 95);
    expect(input.read(1 / 60).yaw).toBe(0);
  });

  it('turns wheel notches into speed steps', () => {
    const { actions, surface } = setup();
    surface.dispatchEvent(Object.assign(new Event('wheel'), { deltaY: -100 }));
    surface.dispatchEvent(Object.assign(new Event('wheel'), { deltaY: 100 }));
    expect(actions.speed.mock.calls).toEqual([[1], [-1]]);
  });

  it('fires each lab key once per press', () => {
    const { actions, key } = setup();
    for (const code of ['KeyF', 'Digit3', 'KeyH', 'Space', 'Period', 'BracketLeft', 'BracketRight', 'Escape']) key('keydown', code);
    key('keydown', 'KeyF');
    expect(actions.follow).toHaveBeenCalledTimes(1);
    expect(actions.jump).toHaveBeenCalledWith(3);
    expect(actions.hideUi).toHaveBeenCalledTimes(1);
    expect(actions.togglePause).toHaveBeenCalledTimes(1);
    expect(actions.step).toHaveBeenCalledTimes(1);
    expect(actions.slower).toHaveBeenCalledTimes(1);
    expect(actions.faster).toHaveBeenCalledTimes(1);
    expect(actions.pause).toHaveBeenCalledTimes(1);
  });

  it('ignores keys aimed at form controls except Escape', () => {
    const { input, actions, key } = setup();
    key('keydown', 'KeyW', { tagName: 'INPUT' });
    key('keydown', 'Space', { tagName: 'BUTTON' });
    key('keydown', 'Escape', { tagName: 'SELECT' });
    expect(input.read(1 / 60).forward).toBe(0);
    expect(actions.togglePause).not.toHaveBeenCalled();
    expect(actions.pause).toHaveBeenCalledTimes(1);
  });

  it('flies with the sticks and triggers, and presses pad buttons once', () => {
    const { input, actions, setPads } = setup();
    setPads([pad([7, 4], [0.5, -1, 1, 0])]);
    input.poll();
    const control = input.read(0.5);
    expect(control).toMatchObject({ strafe: 0.5, forward: 1, rise: 1, fast: true });
    expect(control.yaw).toBeCloseTo(-PAD_LOOK_RATE * 0.5, 9);
    setPads([pad([0, 3, 12])]);
    input.poll();
    input.poll();
    expect(actions.togglePause).toHaveBeenCalledTimes(1);
    expect(actions.follow).toHaveBeenCalledTimes(1);
    expect(actions.jump).toHaveBeenCalledWith(1);
  });

  it('flies with the touch stick, and holds nothing once disabled', () => {
    const { input, key } = setup();
    input.setStick(0, 1);
    input.setRise(-1);
    expect(input.read(1 / 60)).toMatchObject({ forward: 1, rise: -1 });
    key('keydown', 'KeyW');
    input.enabled = false;
    expect(input.read(1 / 60)).toMatchObject({ forward: 0, strafe: 0, rise: 0 });
  });
});
