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
  return { controls, handlers, key, setPads: (next: PadState[]) => { pads = next; } };
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
