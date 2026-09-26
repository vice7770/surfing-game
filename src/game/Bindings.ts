/**
 * The player's actions and the keys and gamepad buttons bound to them (plan P8).
 * Keys are `KeyboardEvent.code` values; buttons are indices in the Gamepad API's
 * standard mapping. Escape and Start always pause and cannot be rebound.
 */
export const ACTIONS = ['paddle', 'popUp', 'steerLeft', 'steerRight', 'retry', 'camera', 'pause'] as const;
export type Action = (typeof ACTIONS)[number];

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
    retry: ['KeyR'],
    camera: ['KeyC'],
    pause: ['Escape'],
  },
  gamepad: {
    paddle: [7],
    popUp: [0],
    steerLeft: [14],
    steerRight: [15],
    retry: [3],
    camera: [5],
    pause: [9],
  },
};

const RESERVED_KEY = 'Escape';
const RESERVED_BUTTON = 9;

/** One gamepad's state, as plain values (tests build these directly). */
export interface PadState {
  buttons: readonly boolean[];
  axes: readonly number[];
}

/** The connected gamepads. Every pad is read as the standard layout; an unusual one can be rebound. */
export function readPads(source: () => ArrayLike<Gamepad | null> = () => globalThis.navigator?.getGamepads?.() ?? []): PadState[] {
  const pads: PadState[] = [];
  for (const pad of Array.from(source())) {
    if (!pad || !pad.connected) continue;
    pads.push({ buttons: pad.buttons.map((button) => button.pressed), axes: [...pad.axes] });
  }
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

/** The left stick is ignored within this much of centre, so a worn stick does not steer. */
export const STICK_DEADZONE = 0.15;

/** Steering from the first pad's left stick, rescaled beyond the dead zone to ±1 (positive to the right). */
export function padSteer(pads: readonly PadState[]): number {
  const x = pads[0]?.axes[0] ?? 0;
  const magnitude = Math.abs(x);
  if (magnitude <= STICK_DEADZONE) return 0;
  return Math.sign(x) * Math.min(1, (magnitude - STICK_DEADZONE) / (1 - STICK_DEADZONE));
}

/**
 * Bind `input` to `action`'s `slot`. An input another action holds is swapped:
 * that action gets this slot's previous input in its place, so no input does two
 * things. Refused (the same object returned) for pause, Escape and Start, and when
 * the swap would leave the other action with nothing bound.
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
  const holder = ACTIONS.find((other) => other !== action && table[other].includes(input));
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

const BUTTONS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'D-pad↑', 'D-pad↓', 'D-pad←', 'D-pad→', 'Home'];

/** A standard-mapping button index as printed on an Xbox-style pad. */
export function buttonLabel(index: number): string {
  return BUTTONS[index] ?? `Button ${index}`;
}
