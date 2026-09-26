import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../game/Settings';
import { accessibilityClasses } from './accessibility';

describe('accessibilityClasses', () => {
  it('adds nothing for the defaults on a desktop', () => {
    expect(accessibilityClasses(defaultSettings().accessibility, false, 'right')).toEqual([]);
  });

  it('marks reduced motion, high contrast, touch and a left-handed layout', () => {
    const a = { reducedMotion: true, uiScale: 1.2, highContrastHud: true };
    expect(accessibilityClasses(a, true, 'left')).toEqual(['is-reduced-motion', 'is-high-contrast', 'has-touch', 'is-left-handed']);
  });
});
