import type { RideView } from '../scene/SpectatorCamera';
import type { Units } from '../ui/units';
import { ACTIONS, DEFAULT_BINDINGS, type Action, type Bindings } from './Bindings';

/** The player's settings (plan P8): four tabs, the Auto benchmark's result, and one-off notices seen. */
export type SettingsTab = 'gameplay' | 'graphics' | 'controls' | 'accessibility';
export type ConcretePreset = 'low' | 'medium' | 'high' | 'ultra';
export type GraphicsPreset = 'auto' | ConcretePreset | 'custom';

export interface GameplaySettings {
  units: Units;
  defaultCamera: RideView | 'overview';
  touchControls: 'auto' | 'on' | 'off';
  /** Only offered while the dev tools are on. */
  showTelemetry: boolean;
}

export interface AdvancedGraphics {
  /** 0.5–1.25 of the display's pixels. */
  renderScale: number;
  nativePixelDensity: boolean;
  frameLimit: 'screen' | 60 | 30;
  waterSimulation: 'auto' | 'fast' | 'accurate';
  seaDetail: 'standard' | 'rich';
  caustics: boolean;
  sprayMist: boolean;
  oceanView: 'near' | 'far';
  foam: 'simple' | 'detailed';
}

export interface GraphicsSettings extends AdvancedGraphics {
  preset: GraphicsPreset;
}

export interface ControlSettings {
  bindings: Bindings;
  handedness: 'right' | 'left';
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  /** 0.9–1.5. */
  uiScale: number;
  highContrastHud: boolean;
}

/** What the Auto benchmark found on this device's graphics adapter. */
export interface Detection {
  preset: ConcretePreset;
  water: 'fast' | 'accurate';
  lowPerformance: boolean;
  adapter: string;
}

export interface GameSettings {
  gameplay: GameplaySettings;
  graphics: GraphicsSettings;
  controls: ControlSettings;
  accessibility: AccessibilitySettings;
  detected?: Detection;
  seen: { rideHints: boolean; lowPerformanceNotice: boolean };
}

export const SETTINGS_KEY = 'breakline.settings.v1';

function copyBindings(bindings: Bindings): Bindings {
  const copy = (table: Record<Action, (string | number)[]>) =>
    Object.fromEntries(ACTIONS.map((action) => [action, [...table[action]]]));
  return { keyboard: copy(bindings.keyboard) as Bindings['keyboard'], gamepad: copy(bindings.gamepad) as Bindings['gamepad'] };
}

export function defaultSettings(prefersReducedMotion = false): GameSettings {
  return {
    gameplay: { units: 'metric', defaultCamera: 'front', touchControls: 'auto', showTelemetry: false },
    // The Medium preset's values (Graphics.PRESETS.medium; a test keeps the two equal).
    graphics: {
      preset: 'auto', renderScale: 1, nativePixelDensity: false, frameLimit: 'screen', waterSimulation: 'auto',
      seaDetail: 'standard', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed',
    },
    controls: { bindings: copyBindings(DEFAULT_BINDINGS), handedness: 'right' },
    accessibility: { reducedMotion: prefersReducedMotion, uiScale: 1, highContrastHud: false },
    seen: { rideHints: false, lowPerformanceNotice: false },
  };
}

type Loose = Record<string, unknown>;

function record(value: unknown): Loose {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Loose : {};
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback;
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function within(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

function sanitizeBindings(raw: unknown, defaults: Bindings): Bindings {
  const source = record(raw);
  const keyboard = record(source.keyboard);
  const gamepad = record(source.gamepad);
  const validKeys = (value: unknown): value is string[] => Array.isArray(value) && value.length >= 1 && value.length <= 2
    && value.every((code) => typeof code === 'string' && code.length > 0);
  const validButtons = (value: unknown): value is number[] => Array.isArray(value) && value.length >= 1 && value.length <= 2
    && value.every((button) => Number.isInteger(button) && button >= 0 && button <= 16);
  const result = copyBindings(defaults);
  for (const action of ACTIONS) {
    if (action === 'pause') continue;
    if (validKeys(keyboard[action])) result.keyboard[action] = [...keyboard[action]];
    if (validButtons(gamepad[action])) result.gamepad[action] = [...gamepad[action]];
  }
  return result;
}

function sanitizeDetection(raw: unknown): Detection | undefined {
  const value = record(raw);
  if (!['low', 'medium', 'high', 'ultra'].includes(value.preset as string)) return undefined;
  if (!['fast', 'accurate'].includes(value.water as string)) return undefined;
  if (typeof value.lowPerformance !== 'boolean' || typeof value.adapter !== 'string') return undefined;
  return { preset: value.preset as ConcretePreset, water: value.water as Detection['water'], lowPerformance: value.lowPerformance, adapter: value.adapter };
}

/** Every field checked against its allowed values; anything invalid falls back to its default, one field at a time. */
export function sanitizeSettings(raw: unknown, defaults: GameSettings): GameSettings {
  const source = record(raw);
  const gameplay = record(source.gameplay);
  const graphics = record(source.graphics);
  const controls = record(source.controls);
  const accessibility = record(source.accessibility);
  const seen = record(source.seen);
  const g = defaults.graphics;
  const detected = sanitizeDetection(source.detected);
  return {
    gameplay: {
      units: oneOf(gameplay.units, ['metric', 'imperial'] as const, defaults.gameplay.units),
      defaultCamera: oneOf(gameplay.defaultCamera, ['front', 'behind', 'side', 'overview'] as const, defaults.gameplay.defaultCamera),
      touchControls: oneOf(gameplay.touchControls, ['auto', 'on', 'off'] as const, defaults.gameplay.touchControls),
      showTelemetry: flag(gameplay.showTelemetry, defaults.gameplay.showTelemetry),
    },
    graphics: {
      preset: oneOf(graphics.preset, ['auto', 'low', 'medium', 'high', 'ultra', 'custom'] as const, g.preset),
      renderScale: within(graphics.renderScale, 0.5, 1.25, g.renderScale),
      nativePixelDensity: flag(graphics.nativePixelDensity, g.nativePixelDensity),
      frameLimit: oneOf(graphics.frameLimit, ['screen', 60, 30] as const, g.frameLimit),
      waterSimulation: oneOf(graphics.waterSimulation, ['auto', 'fast', 'accurate'] as const, g.waterSimulation),
      seaDetail: oneOf(graphics.seaDetail, ['standard', 'rich'] as const, g.seaDetail),
      caustics: flag(graphics.caustics, g.caustics),
      sprayMist: flag(graphics.sprayMist, g.sprayMist),
      oceanView: oneOf(graphics.oceanView, ['near', 'far'] as const, g.oceanView),
      foam: oneOf(graphics.foam, ['simple', 'detailed'] as const, g.foam),
    },
    controls: {
      bindings: sanitizeBindings(controls.bindings, defaults.controls.bindings),
      handedness: oneOf(controls.handedness, ['right', 'left'] as const, defaults.controls.handedness),
    },
    accessibility: {
      reducedMotion: flag(accessibility.reducedMotion, defaults.accessibility.reducedMotion),
      uiScale: within(accessibility.uiScale, 0.9, 1.5, defaults.accessibility.uiScale),
      highContrastHud: flag(accessibility.highContrastHud, defaults.accessibility.highContrastHud),
    },
    ...(detected ? { detected } : {}),
    seen: {
      rideHints: flag(seen.rideHints, defaults.seen.rideHints),
      lowPerformanceNotice: flag(seen.lowPerformanceNotice, defaults.seen.lowPerformanceNotice),
    },
  };
}

export type SettingsChange = SettingsTab | 'detected' | 'seen';
type Listener = (settings: GameSettings, change: SettingsChange) => void;
type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** The settings in memory, saved on every change; a missing or failing storage only loses persistence. */
export class SettingsStore {
  private current: GameSettings;
  private readonly listeners = new Set<Listener>();

  constructor(private readonly storage?: SettingsStorage, private readonly defaults: GameSettings = defaultSettings()) {
    let raw: unknown;
    try {
      raw = JSON.parse(storage?.getItem(SETTINGS_KEY) ?? 'null');
    } catch {
      raw = null;
    }
    this.current = sanitizeSettings(raw, defaults);
  }

  get value(): Readonly<GameSettings> {
    return this.current;
  }

  update<K extends SettingsTab>(tab: K, patch: Partial<GameSettings[K]>): void {
    this.commit({ ...this.current, [tab]: { ...this.current[tab], ...patch } }, tab);
  }

  resetTab(tab: SettingsTab): void {
    this.commit({ ...this.current, [tab]: this.defaults[tab] }, tab);
  }

  setDetected(detection: Detection | undefined): void {
    const { detected: _previous, ...rest } = this.current;
    this.commit(detection ? { ...rest, detected: detection } : rest, 'detected');
  }

  markSeen(key: keyof GameSettings['seen']): void {
    this.commit({ ...this.current, seen: { ...this.current.seen, [key]: true } }, 'seen');
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private commit(next: GameSettings, change: SettingsChange): void {
    this.current = sanitizeSettings(next, this.defaults);
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.current));
    } catch {
      // Storage may be unavailable or full; the settings still apply for this visit.
    }
    for (const listener of this.listeners) listener(this.current, change);
  }
}
