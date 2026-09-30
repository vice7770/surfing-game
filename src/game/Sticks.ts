import type { Action, PadState } from './Bindings';

/** Linear, or Precise: finer near centre and still full lock at the edge (spec C1). */
export type StickResponse = 'linear' | 'precise';

/** The player's stick settings (spec C1). */
export interface StickSettings {
  /** Which stick trims: the right by default, so steering on the left never trims by accident. */
  trimStick: 'right' | 'left';
  stickResponse: StickResponse;
  /** Stick travel ignored around centre: the Steam Controller's magnetic sticks barely drift. */
  deadzoneSteam: number;
  deadzoneGamepad: number;
}

export const DEFAULT_STICK: StickSettings = { trimStick: 'right', stickResponse: 'linear', deadzoneSteam: 0.05, deadzoneGamepad: 0.15 };
export const MAX_DEADZONE = 0.3;
/** Precise is this much cubic, the rest linear: about half the linear response at mid-stick. */
const PRECISE_CUBIC = 0.6;
/** A pad counts as touched with a button down or a stick pushed past this. */
const TOUCH = 0.5;

/** One stick axis after the dead zone, rescaled to ±1 and shaped by the response. */
export function shapeAxis(value: number, deadzone: number, response: StickResponse): number {
  const magnitude = Math.abs(value);
  if (magnitude <= deadzone) return 0;
  const travel = Math.min(1, (magnitude - deadzone) / (1 - deadzone));
  const shaped = response === 'precise' ? (1 - PRECISE_CUBIC) * travel + PRECISE_CUBIC * travel ** 3 : travel;
  return Math.sign(value) * shaped;
}

/**
 * Steering from the left stick (positive right), trim from the chosen stick (up for forward) and the upper body's
 * rotation from the right stick across (positive right: where the rider looks, the movement-flow spec), with the
 * pad's own dead zone.
 */
export function padSticks(pad: PadState | undefined, stick: StickSettings): { steer: number; trim: number; rotate: number } {
  if (!pad) return { steer: 0, trim: 0, rotate: 0 };
  const deadzone = pad.kind === 'steam' ? stick.deadzoneSteam : stick.deadzoneGamepad;
  const trimAxis = stick.trimStick === 'right' ? 3 : 1;
  return {
    steer: shapeAxis(pad.axes[0] ?? 0, deadzone, stick.stickResponse),
    trim: shapeAxis(-(pad.axes[trimAxis] ?? 0), deadzone, stick.stickResponse),
    rotate: shapeAxis(pad.axes[2] ?? 0, deadzone, stick.stickResponse),
  };
}

/** Which stick an action is on for a pad (spec C1): steering the left, trim the chosen one; undefined for a button. */
export function stickOf(action: Action, stick: Pick<StickSettings, 'trimStick'>): 'left' | 'right' | undefined {
  if (action === 'steerLeft' || action === 'steerRight') return 'left';
  if (action === 'trimForward' || action === 'trimBack') return stick.trimStick;
  return undefined;
}

/** A pad's identity: its id, or its place in the list for a pad built without one. */
export function padKey(pad: PadState, index: number): string {
  return pad.id ?? `pad:${index}`;
}

/** Whether the player is using this pad now: a button down, or a stick pushed. */
export function touched(pad: PadState): boolean {
  return pad.buttons.some(Boolean) || pad.axes.slice(0, 4).some((axis) => Math.abs(axis) > TOUCH);
}

/**
 * Which pad drives the sticks (spec C1): the one touched last. While the current one
 * is still touched it keeps them; when nobody touches anything it stays; if it is
 * gone, the first pad takes over.
 */
export function drivingPad(pads: readonly PadState[], current: string | undefined): string | undefined {
  const keys = pads.map(padKey);
  const active = keys.filter((_, index) => touched(pads[index]));
  if (current !== undefined && active.includes(current)) return current;
  if (active.length > 0) return active[0];
  if (current !== undefined && keys.includes(current)) return current;
  return keys[0];
}
