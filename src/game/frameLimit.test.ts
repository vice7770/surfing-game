import { describe, expect, it } from 'vitest';
import { frameDue } from './frameLimit';

describe('frameDue', () => {
  it('renders every frame without a limit, and waits out a 30 fps limit with a millisecond of slack', () => {
    expect(frameDue(1000, 990, 0)).toBe(true);
    expect(frameDue(1000, 990, 1000 / 30)).toBe(false);
    expect(frameDue(1033, 1000, 1000 / 30)).toBe(true);
  });
});
