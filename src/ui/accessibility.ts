import type { AccessibilitySettings } from '../game/Settings';

const CLASSES = ['is-reduced-motion', 'is-high-contrast', 'has-touch', 'is-left-handed'] as const;

/** The classes on `#app` that the stylesheets read for accessibility and touch (plan P8). */
export function accessibilityClasses(a: AccessibilitySettings, touch: boolean, handedness: 'right' | 'left'): string[] {
  return [
    ...(a.reducedMotion ? ['is-reduced-motion'] : []),
    ...(a.highContrastHud ? ['is-high-contrast'] : []),
    ...(touch ? ['has-touch'] : []),
    ...(handedness === 'left' ? ['is-left-handed'] : []),
  ];
}

/** Put the settings on the page: the classes, and the UI scale the menus and HUD size from. */
export function applyAccessibility(app: HTMLElement, a: AccessibilitySettings, touch: boolean, handedness: 'right' | 'left'): void {
  const on = new Set(accessibilityClasses(a, touch, handedness));
  for (const name of CLASSES) app.classList.toggle(name, on.has(name));
  app.style.setProperty('--ui-scale', String(a.uiScale));
}
