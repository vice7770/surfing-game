import { describe, expect, it } from 'vitest';
import { devFlag, devParam } from './devTools';

describe('devTools', () => {
  it('reads URL flags only while the dev tools are on', () => {
    expect(devFlag('demo', '?demo=carve', true)).toBe(true);
    expect(devFlag('demo', '?demo=carve', false)).toBe(false);
    expect(devParam('demo', '?demo=carve', true)).toBe('carve');
    expect(devParam('demo', '?demo=carve', false)).toBeNull();
  });
});
