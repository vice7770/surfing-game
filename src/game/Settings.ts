import type { RideView } from '../scene/SpectatorCamera';
import type { Units } from '../ui/units';
import type { WaterLook } from '../scene/water/waterLook';
import type { StanceName } from '../physics/riderPosture';
import { ACTIONS, DEFAULT_BINDINGS, MAX_BUTTON, type Action, type Bindings } from './Bindings';
import { DEFAULT_STICK, MAX_DEADZONE, type StickSettings } from './Sticks';
import { DEFAULT_SURFER, sanitizeSurfer, type SurferSettings } from './SurferChoice';
import { PRESETS } from './Graphics';
import { cleanName } from '../net/protocol';
import { normalizeRoomCode } from '../net/roomCode';

/** The player's settings (plan P8): four tabs, the Auto benchmark's result, and one-off notices seen. */
export type SettingsTab = 'gameplay' | 'graphics' | 'controls' | 'audio' | 'accessibility';
export type ConcretePreset = 'low' | 'medium' | 'high' | 'ultra';
export type GraphicsPreset = 'auto' | ConcretePreset | 'custom';

export interface GameplaySettings {
  units: Units;
  defaultCamera: RideView | 'overview';
  touchControls: 'auto' | 'on' | 'off';
  /** The balance meter (spec P9): on the Practice swell only, always, or never. */
  balanceMeter: 'practice' | 'always' | 'never';
  /** The pocket reflex (the riding-the-wave spec): with no weight held the rider trims to stay near the curl; Practice only, always, or never. */
  pocketReflex: 'practice' | 'always' | 'never';
  /** Regular (left foot forward) or Goofy (the stances spec); a change rides from the next ride. */
  stance: StanceName;
  /** Score each ride 0–10 on the WSL criteria (spec P9), off unless the player wants it. */
  scoreRides: boolean;
  /** Only offered while the dev tools are on. */
  showTelemetry: boolean;
  /** Names over the other surfers online (spec N1). */
  nameTags: boolean;
}

/** Online (spec N1): the name others see, and this player's token for each room they were in (the last ONLINE_ROOMS_KEPT). */
export interface OnlineSettings {
  name: string;
  tokens: Record<string, string>;
}

/** Rooms whose tokens are kept. */
export const ONLINE_ROOMS_KEPT = 10;

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
  /** G8: Classic (today's water, the light fallback) or Rich (detail, gloss, churn, lit mist). */
  waterLook: WaterLook;
}

export interface GraphicsSettings extends AdvancedGraphics {
  preset: GraphicsPreset;
}

export interface ControlSettings extends StickSettings {
  bindings: Bindings;
  handedness: 'right' | 'left';
  /** Which default pad layout the bindings started from: 2 since C1 moved the hand to LB. A save without it is migrated once. */
  padLayout: 2;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  /** 0.9–1.5. */
  uiScale: number;
  highContrastHud: boolean;
  /** S1: down-mix positional sound to one channel, for single-ear listening. */
  monoAudio: boolean;
}

/** S1: the volumes of the Master bus and each bus under it, 0–1, and muting while the game is out of view. */
export interface AudioSettings {
  master: number;
  sea: number;
  board: number;
  ui: number;
  muteInBackground: boolean;
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
  audio: AudioSettings;
  accessibility: AccessibilitySettings;
  /** Who the player rides as, chosen on the Surf screen (G7 Part B). */
  surfer: SurferSettings;
  detected?: Detection;
  /** One-off notices seen; `steamController`: a Steam Controller has connected, so the menu's Connect button goes (spec C1). */
  seen: { rideHints: boolean; lowPerformanceNotice: boolean; steamController: boolean };
  online: OnlineSettings;
}

export const SETTINGS_KEY = 'breakline.settings.v1';

function copyBindings(bindings: Bindings): Bindings {
  const copy = (table: Record<Action, (string | number)[]>) =>
    Object.fromEntries(ACTIONS.map((action) => [action, [...table[action]]]));
  return { keyboard: copy(bindings.keyboard) as Bindings['keyboard'], gamepad: copy(bindings.gamepad) as Bindings['gamepad'] };
}

export function defaultSettings(prefersReducedMotion = false): GameSettings {
  return {
    gameplay: { units: 'metric', defaultCamera: 'front', touchControls: 'auto', balanceMeter: 'practice', pocketReflex: 'practice', stance: 'regular', scoreRides: false, showTelemetry: false, nameTags: true },
    // The Medium preset's values (Graphics.PRESETS.medium; a test keeps the two equal).
    graphics: {
      preset: 'auto', renderScale: 1, nativePixelDensity: false, frameLimit: 'screen', waterSimulation: 'auto',
      seaDetail: 'standard', caustics: true, sprayMist: true, oceanView: 'far', foam: 'detailed', waterLook: 'rich',
    },
    controls: { bindings: copyBindings(DEFAULT_BINDINGS), handedness: 'right', ...DEFAULT_STICK, padLayout: 2 },
    audio: { master: 1, sea: 1, board: 1, ui: 1, muteInBackground: true },
    accessibility: { reducedMotion: prefersReducedMotion, uiScale: 1, highContrastHud: false, monoAudio: false },
    surfer: { ...DEFAULT_SURFER },
    seen: { rideHints: false, lowPerformanceNotice: false, steamController: false },
    online: { name: '', tokens: {} },
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

/** The pad defaults before C1, which a save from then still holds unless the player changed them (the party call only exists since N1). */
const LEGACY_PAD_DEFAULTS: Partial<Record<Action, number[]>> = { hand: [2], popUp: [0], callParty: [4] };

function sanitizeBindings(raw: unknown, defaults: Bindings, legacy: boolean): Bindings {
  const source = record(raw);
  const keyboard = record(source.keyboard);
  const gamepad = record(source.gamepad);
  const validKeys = (value: unknown): value is string[] => Array.isArray(value) && value.length >= 1 && value.length <= 2
    && value.every((code) => typeof code === 'string' && code.length > 0);
  const validButtons = (value: unknown): value is number[] => Array.isArray(value) && value.length >= 1 && value.length <= 2
    && value.every((button) => Number.isInteger(button) && button >= 0 && button <= MAX_BUTTON);
  const result = copyBindings(defaults);
  for (const action of ACTIONS) {
    if (action === 'pause') continue;
    if (validKeys(keyboard[action])) result.keyboard[action] = [...keyboard[action]];
    if (validButtons(gamepad[action])) result.gamepad[action] = [...gamepad[action]];
  }
  // C1 moved the hand to LB, the party call to X and added the grips. The actions a save still holds on their old defaults
  // move together, as one layout, unless that would leave a button with two actions (the player rebound around them).
  if (legacy) {
    const moved = (Object.entries(LEGACY_PAD_DEFAULTS) as [Action, number[]][])
      .filter(([action, old]) => result.gamepad[action].join() === old.join())
      .map(([action]) => action);
    const next = { ...result.gamepad };
    for (const action of moved) next[action] = [...defaults.gamepad[action]];
    const clash = moved.some((action) => next[action].some((button) => ACTIONS.some((other) => other !== action && next[other].includes(button))));
    if (!clash) result.gamepad = next;
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
  const audio = record(source.audio);
  const seen = record(source.seen);
  const g = defaults.graphics;
  const detected = sanitizeDetection(source.detected);
  const preset = oneOf(graphics.preset, ['auto', 'low', 'medium', 'high', 'ultra', 'custom'] as const, g.preset);
  // A save from before G8 has no water look: take its preset's, so a Low player stays on the light Classic water
  // (a Custom one takes the benchmark's, so a machine rated Low stays there too).
  const presetLook = preset === 'custom'
    ? (detected?.preset === 'low' ? PRESETS.low.waterLook : g.waterLook)
    : PRESETS[preset === 'auto' ? detected?.preset ?? 'medium' : preset].waterLook;
  return {
    gameplay: {
      units: oneOf(gameplay.units, ['metric', 'imperial'] as const, defaults.gameplay.units),
      defaultCamera: oneOf(gameplay.defaultCamera, ['front', 'behind', 'side', 'overview'] as const, defaults.gameplay.defaultCamera),
      touchControls: oneOf(gameplay.touchControls, ['auto', 'on', 'off'] as const, defaults.gameplay.touchControls),
      balanceMeter: oneOf(gameplay.balanceMeter, ['practice', 'always', 'never'] as const, defaults.gameplay.balanceMeter),
      pocketReflex: oneOf(gameplay.pocketReflex, ['practice', 'always', 'never'] as const, defaults.gameplay.pocketReflex),
      stance: oneOf(gameplay.stance, ['regular', 'goofy'] as const, defaults.gameplay.stance),
      scoreRides: flag(gameplay.scoreRides, defaults.gameplay.scoreRides),
      showTelemetry: flag(gameplay.showTelemetry, defaults.gameplay.showTelemetry),
      nameTags: flag(gameplay.nameTags, defaults.gameplay.nameTags),
    },
    graphics: {
      preset,
      renderScale: within(graphics.renderScale, 0.5, 1.25, g.renderScale),
      nativePixelDensity: flag(graphics.nativePixelDensity, g.nativePixelDensity),
      frameLimit: oneOf(graphics.frameLimit, ['screen', 60, 30] as const, g.frameLimit),
      waterSimulation: oneOf(graphics.waterSimulation, ['auto', 'fast', 'accurate'] as const, g.waterSimulation),
      seaDetail: oneOf(graphics.seaDetail, ['standard', 'rich'] as const, g.seaDetail),
      caustics: flag(graphics.caustics, g.caustics),
      sprayMist: flag(graphics.sprayMist, g.sprayMist),
      oceanView: oneOf(graphics.oceanView, ['near', 'far'] as const, g.oceanView),
      foam: oneOf(graphics.foam, ['simple', 'detailed'] as const, g.foam),
      waterLook: oneOf(graphics.waterLook, ['classic', 'rich'] as const, presetLook),
    },
    controls: {
      bindings: sanitizeBindings(controls.bindings, defaults.controls.bindings, controls.padLayout !== 2),
      handedness: oneOf(controls.handedness, ['right', 'left'] as const, defaults.controls.handedness),
      trimStick: oneOf(controls.trimStick, ['right', 'left'] as const, defaults.controls.trimStick),
      stickResponse: oneOf(controls.stickResponse, ['linear', 'precise'] as const, defaults.controls.stickResponse),
      deadzoneSteam: within(controls.deadzoneSteam, 0, MAX_DEADZONE, defaults.controls.deadzoneSteam),
      deadzoneGamepad: within(controls.deadzoneGamepad, 0, MAX_DEADZONE, defaults.controls.deadzoneGamepad),
      padLayout: 2,
    },
    audio: {
      master: within(audio.master, 0, 1, defaults.audio.master),
      sea: within(audio.sea, 0, 1, defaults.audio.sea),
      board: within(audio.board, 0, 1, defaults.audio.board),
      ui: within(audio.ui, 0, 1, defaults.audio.ui),
      muteInBackground: flag(audio.muteInBackground, defaults.audio.muteInBackground),
    },
    accessibility: {
      reducedMotion: flag(accessibility.reducedMotion, defaults.accessibility.reducedMotion),
      uiScale: within(accessibility.uiScale, 0.9, 1.5, defaults.accessibility.uiScale),
      highContrastHud: flag(accessibility.highContrastHud, defaults.accessibility.highContrastHud),
      monoAudio: flag(accessibility.monoAudio, defaults.accessibility.monoAudio),
    },
    surfer: sanitizeSurfer(source.surfer, defaults.surfer),
    ...(detected ? { detected } : {}),
    seen: {
      rideHints: flag(seen.rideHints, defaults.seen.rideHints),
      lowPerformanceNotice: flag(seen.lowPerformanceNotice, defaults.seen.lowPerformanceNotice),
      steamController: flag(seen.steamController, defaults.seen.steamController),
    },
    online: sanitizeOnline(source.online, defaults.online),
  };
}

/** A clean name (or none) and the well-formed room tokens, the last ONLINE_ROOMS_KEPT. */
function sanitizeOnline(raw: unknown, defaults: OnlineSettings): OnlineSettings {
  const online = record(raw);
  const tokens = Object.entries(record(online.tokens))
    .filter(([code, token]) => normalizeRoomCode(code) === code && typeof token === 'string' && /^[0-9a-f]{32}$/.test(token))
    .slice(-ONLINE_ROOMS_KEPT);
  return { name: cleanName(online.name) ?? defaults.name, tokens: Object.fromEntries(tokens) as Record<string, string> };
}

export type SettingsChange = SettingsTab | 'surfer' | 'detected' | 'seen' | 'online';
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

  /** The name others see online (cleaned; empty when nothing is left). */
  setOnlineName(name: string): void {
    this.commit({ ...this.current, online: { ...this.current.online, name: cleanName(name) ?? '' } }, 'online');
  }

  /** This player's token for a room, so a rejoin keeps their place (a creator stays the creator); the oldest beyond ONLINE_ROOMS_KEPT go. */
  rememberRoom(code: string, token: string): void {
    const { [code]: _previous, ...others } = this.current.online.tokens;
    const tokens = Object.fromEntries([...Object.entries(others), [code, token]].slice(-ONLINE_ROOMS_KEPT));
    this.commit({ ...this.current, online: { ...this.current.online, tokens } }, 'online');
  }

  setSurfer(patch: Partial<SurferSettings>): void {
    this.commit({ ...this.current, surfer: { ...this.current.surfer, ...patch } }, 'surfer');
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
