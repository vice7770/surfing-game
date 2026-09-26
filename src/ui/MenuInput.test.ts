import { describe, expect, it, vi } from 'vitest';
import { MenuInput } from './MenuInput';

const escape = () => Object.assign(new Event('keydown', { cancelable: true }), { code: 'Escape' });

describe('MenuInput', () => {
  it('goes back on Esc', () => {
    const target = new EventTarget();
    const onBack = vi.fn();
    new MenuInput({ root: () => null, onBack, target, pads: () => [] });
    target.dispatchEvent(escape());
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('ignores the Esc the ride controls already took to pause, so the pause menu stays open', () => {
    const target = new EventTarget();
    target.addEventListener('keydown', (event) => event.preventDefault());
    const onBack = vi.fn();
    new MenuInput({ root: () => null, onBack, target, pads: () => [] });
    target.dispatchEvent(escape());
    expect(onBack).not.toHaveBeenCalled();
  });
});
