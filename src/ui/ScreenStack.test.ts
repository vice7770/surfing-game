import { describe, expect, it } from 'vitest';
import { ScreenStack } from './ScreenStack';

describe('ScreenStack', () => {
  it('has nowhere to go back to from its root', () => {
    const stack = new ScreenStack('menu');
    expect(stack.back()).toBeUndefined();
    expect(stack.current).toBe('menu');
  });

  it('keeps the game screen under overlays as its base', () => {
    const stack = new ScreenStack('menu');
    stack.push('ride');
    stack.push('pause');
    stack.push('settings');
    expect(stack.current).toBe('settings');
    expect(stack.base).toBe('ride');
    expect(stack.back()).toBe('pause');
    expect(stack.base).toBe('ride');
  });

  // L1: `?record` and `?waterSheet` run on a bare stage, a scene with no menu.
  it('counts the bare stage as a scene', () => {
    const stack = new ScreenStack('menu');
    stack.push('stage');
    stack.push('pause');
    expect(stack.base).toBe('stage');
  });

  // L2: a lesson is a scene; the School's list is a panel over the menu.
  it('keeps a lesson under its pause menu, and the menu under the School', () => {
    const stack = new ScreenStack('menu');
    stack.push('school');
    expect(stack.base).toBe('menu');
    stack.push('lesson');
    stack.push('pause');
    expect(stack.base).toBe('lesson');
  });

  it('starts over from a new root', () => {
    const stack = new ScreenStack('menu');
    stack.push('surf');
    stack.reset('menu');
    expect(stack.stack).toEqual(['menu']);
    expect(stack.base).toBe('menu');
  });
});
