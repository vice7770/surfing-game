import { describe, expect, it } from 'vitest';
import { EN, t } from './strings';

describe('strings', () => {
  it('fills named placeholders', () => {
    expect(t('menu.version', { version: '0.1.0' })).toBe('v0.1.0');
  });

  it('refuses a missing placeholder value', () => {
    expect(() => t('menu.version')).toThrow(/version/);
  });

  it('has no empty text', () => {
    for (const [key, value] of Object.entries(EN)) expect(value.trim(), key).not.toBe('');
  });
});
