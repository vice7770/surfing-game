/**
 * The player's actions and the keys and gamepad buttons bound to them (plan P8).
 * Keys are `KeyboardEvent.code` values; buttons are indices in the Gamepad API's
 * standard mapping. Escape and Start always pause and cannot be rebound.
 */
export const ACTIONS = [
  'paddle', 'popUp', 'steerLeft', 'steerRight', 'trimForward', 'trimBack', 'crouch', 'compress', 'hand', 'retry', 'camera', 'mute',
  'callLeft', 'callRight', 'callParty', 'callNice', 'pause',
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * When an action does anything (spec P9): paddling lying down, trim, crouch,
 * Compress and the hand standing, the rest always. A key may serve one action per
 * context, so ArrowUp paddles lying down and trims forward standing, and Space
 * paddles lying down and compresses standing.
 */
export type ActionContext = 'prone' | 'standing' | 'always';
export const ACTION_CONTEXT: Record<Action, ActionContext> = {
  paddle: 'prone', popUp: 'always', steerLeft: 'always', steerRight: 'always',
  trimForward: 'standing', trimBack: 'standing', crouch: 'standing', compress: 'standing', hand: 'standing',
  retry: 'always', camera: 'always', mute: 'always', pause: 'always',
  callLeft: 'always', callRight: 'always', callParty: 'always', callNice: 'always',
};

/** Whether two actions can be live at once, and so must not share an input. */
function overlap(a: Action, b: Action): boolean {
  const first = ACTION_CONTEXT[a];
  const second = ACTION_CONTEXT[b];
  return first === 'always' || second === 'always' || first === second;
}

/** Actions the player may rebind: all but pause. */
export const REBINDABLE: readonly Action[] = ACTIONS.filter((action) => action !== 'pause');

export interface Bindings {
  keyboard: Record<Action, string[]>;
  gamepad: Record<Action, number[]>;
}

export const DEFAULT_BINDINGS: Bindings = {
  keyboard: {
    paddle: ['Space', 'ArrowUp'],
    popUp: ['Enter'],
    steerLeft: ['ArrowLeft', 'KeyA'],
    steerRight: ['ArrowRight', 'KeyD'],
    trimForward: ['KeyW', 'ArrowUp'],
    trimBack: ['KeyS', 'ArrowDown'],
    crouch: ['ShiftLeft', 'ShiftRight'],
    // The stances spec: the bottom turn's stance, on the paddle's key standing.
    compress: ['Space'],
    hand: ['KeyE'],
    retry: ['KeyR'],
    camera: ['KeyC'],
    mute: ['KeyM'],
    // Online (N1): the surf calls.
    callLeft: ['Digit1'],
    callRight: ['Digit2'],
    callParty: ['Digit3'],
    callNice: ['Digit4'],
    pause: ['Escape'],
  },
  // C1: the hand on LB (the right thumb trims), so the party call takes X; on the Steam Controller L4 also reaches and R4 also pops up.
  gamepad: {
    paddle: [7],
    popUp: [0, 18],
    steerLeft: [14],
    steerRight: [15],
    trimForward: [12],
    trimBack: [13],
    crouch: [6],
    compress: [7],
    hand: [4, 17],
    retry: [3],
    camera: [5],
    mute: [8],
    callLeft: [10],
    callRight: [11],
    callParty: [2],
    callNice: [1],
    pause: [9],
  },
};

const RESERVED_KEY = 'Escape';
const RESERVED_BUTTON = 9;

/** Which layout a pad's buttons are printed with: an Xbox-style pad, or the 2026 Steam Controller (spec C1). */
export type PadKind = 'standard' | 'steam';

/** One gamepad's state, as plain values (tests build these directly): pressed buttons, how far each is pressed (0–1, for triggers), and the axes. */
export interface PadState {
  /** Which pad this is, stable while it stays connected (`gamepad:<index>`, `steam:<n>`). */
  id?: string;
  kind?: PadKind;
  buttons: readonly boolean[];
  values?: readonly number[];
  axes: readonly number[];
}

/** The highest button index bound: the standard 0–16 and the Steam Controller's extras, 17–21 (spec C1). */
export const MAX_BUTTON = 21;

const padSources = new Set<() => PadState[]>();

/** Add pads the Gamepad API cannot see (the Steam Controller over WebHID, spec C1); returns the undo. */
export function addPadSource(source: () => PadState[]): () => void {
  padSources.add(source);
  return () => { padSources.delete(source); };
}

/** The connected gamepads, read as the standard layout (an unusual one can be rebound), then any added sources' pads. */
export function readPads(source: () => ArrayLike<Gamepad | null> = () => globalThis.navigator?.getGamepads?.() ?? []): PadState[] {
  const pads: PadState[] = [];
  for (const pad of Array.from(source())) {
    if (!pad || !pad.connected) continue;
    pads.push({ id: `gamepad:${pad.index}`, kind: 'standard', buttons: pad.buttons.map((button) => button.pressed), values: pad.buttons.map((button) => button.value), axes: [...pad.axes] });
  }
  for (const extra of padSources) pads.push(...extra());
  return pads;
}

/** The actions held down on the keyboard and on any gamepad. */
export function heldActions(keys: ReadonlySet<string>, pads: readonly PadState[], bindings: Bindings): Set<Action> {
  const held = new Set<Action>();
  for (const action of ACTIONS) {
    if (bindings.keyboard[action].some((code) => keys.has(code))
      || pads.some((pad) => bindings.gamepad[action].some((button) => pad.buttons[button]))) {
      held.add(action);
    }
  }
  return held;
}

/** How far any pad presses `button`, 0–1: a trigger's travel, or 1 for a pressed button without one. */
export function padValue(pads: readonly PadState[], button: number | undefined): number {
  if (button === undefined) return 0;
  let value = 0;
  for (const pad of pads) value = Math.max(value, pad.values?.[button] ?? (pad.buttons[button] ? 1 : 0));
  return Math.min(1, Math.max(0, value));
}

/**
 * Bind `input` to `action`'s `slot`. An input another action live in the same
 * context holds is swapped: that action gets this slot's previous input in its
 * place, so no input does two things at once. Refused (the same object returned)
 * for pause, Escape and Start, and when the swap would leave the other action with
 * nothing bound.
 */
export function rebind(bindings: Bindings, device: 'keyboard' | 'gamepad', action: Action, slot: 0 | 1, input: string | number): Bindings {
  if (action === 'pause' || input === (device === 'keyboard' ? RESERVED_KEY : RESERVED_BUTTON)) return bindings;
  const table = bindings[device] as Record<Action, (string | number)[]>;
  const previous = table[action][slot];
  if (previous === input) return bindings;
  const next: Record<Action, (string | number)[]> = { ...table };
  const own = [...table[action]];
  const ownIndex = own.indexOf(input);
  if (ownIndex >= 0) own[ownIndex] = previous as string | number;
  own[slot] = input;
  next[action] = own.filter((value) => value !== undefined);
  const holder = ACTIONS.find((other) => other !== action && overlap(action, other) && table[other].includes(input));
  if (holder) {
    const theirs = [...table[holder]];
    const index = theirs.indexOf(input);
    if (previous !== undefined) theirs[index] = previous;
    else theirs.splice(index, 1);
    if (theirs.length === 0) return bindings;
    next[holder] = theirs;
  }
  return { ...bindings, [device]: next };
}

const ARROWS: Record<string, string> = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
const MODIFIERS: Record<string, string> = { Shift: 'Shift', Control: 'Ctrl', Alt: 'Alt', Meta: 'Cmd' };

/** A key code as the player knows it: `R` for KeyR, `↑` for ArrowUp, `Shift` for either Shift. */
export function keyLabel(code: string): string {
  if (ARROWS[code]) return ARROWS[code];
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const digit = /^Digit(\d)$/.exec(code);
  if (digit) return digit[1];
  const modifier = /^(Shift|Control|Alt|Meta)(Left|Right)$/.exec(code);
  if (modifier) return MODIFIERS[modifier[1]];
  return code;
}

const BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'D-pad↑', 'D-pad↓', 'D-pad←', 'D-pad→', 'Home', 'L4', 'R4', 'L5', 'R5', '···'];
/** The Steam Controller's own names for the standard buttons it labels differently (spec C1). */
const STEAM_NAMES: Record<number, string> = { 8: 'View', 9: 'Menu', 16: 'Steam' };

/** A button index as printed on the pad: an Xbox-style pad's names, or the Steam Controller's; a dash for an empty slot. */
export function buttonLabel(index: number | undefined, kind: PadKind = 'standard'): string {
  if (index === undefined) return '—';
  return (kind === 'steam' ? STEAM_NAMES[index] : undefined) ?? BUTTONS[index] ?? `Button ${index}`;
}
