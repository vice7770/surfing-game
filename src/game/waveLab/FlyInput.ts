import { readPads, type PadState } from '../Bindings';
import { FLY_IDLE, type FlyControl } from '../../scene/FlyCamera';

export type JumpPoint = 1 | 2 | 3 | 4;

/** What the lab's keys and buttons do, once per press (spec L1). */
export interface FlyActions {
  follow(): void;
  jump(point: JumpPoint): void;
  hideUi(): void;
  togglePause(): void;
  step(): void;
  slower(): void;
  faster(): void;
  /** Esc or Start: the lab's pause menu. */
  pause(): void;
  /** Wheel notches: + faster flight. */
  speed(steps: number): void;
}

/** Where the input listens: keys on the window, drags and the wheel on the canvas, and the pads. */
export interface FlyEnvironment {
  keys?: EventTarget;
  surface?: EventTarget;
  pads?: () => PadState[];
}

/** Look per pixel dragged, rad. */
export const LOOK_PER_PIXEL = 0.004;
/** Look at full right-stick deflection, rad/s. */
export const PAD_LOOK_RATE = 2.2;
export const PAD_DEAD_ZONE = 0.15;

/** Keys a focused control keeps for itself: a button its Space and Enter, a slider its arrows and paging keys. */
const BUTTON_KEYS = new Set(['Space', 'Enter', 'NumpadEnter']);
const SLIDER_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * Whether a key belongs to the focused control rather than the lab: all of them in
 * a text field or a select, Space and Enter on a button, the arrows on a slider.
 * Esc always reaches the lab. Only those, so a click on the toolbar or a slider
 * does not stop the keys flying.
 */
function ownedByControl(target: EventTarget | null, code: string): boolean {
  if (code === 'Escape') return false;
  const element = target as (Element & { type?: string }) | null;
  const tag = element?.tagName;
  if (tag === 'BUTTON') return BUTTON_KEYS.has(code);
  if (tag === 'INPUT' && element?.type === 'range') return SLIDER_KEYS.has(code);
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}
const MOVE_KEYS: Record<string, { axis: 'strafe' | 'forward' | 'rise'; sign: 1 | -1 }> = {
  KeyW: { axis: 'forward', sign: 1 }, ArrowUp: { axis: 'forward', sign: 1 },
  KeyS: { axis: 'forward', sign: -1 }, ArrowDown: { axis: 'forward', sign: -1 },
  KeyD: { axis: 'strafe', sign: 1 }, ArrowRight: { axis: 'strafe', sign: 1 },
  KeyA: { axis: 'strafe', sign: -1 }, ArrowLeft: { axis: 'strafe', sign: -1 },
  KeyE: { axis: 'rise', sign: 1 }, KeyQ: { axis: 'rise', sign: -1 },
};
/** The lab's one-shot keys. */
const ACTION_KEYS = new Set(['KeyF', 'KeyH', 'Space', 'Period', 'BracketLeft', 'BracketRight', 'Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4']);
/** Standard-layout pad buttons (spec L1): A pause, X hide, Y follow, LB fast, RB step, LT/RT down/up, Start menu, d-pad jump points. */
const PAD = { a: 0, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, start: 9, up: 12, down: 13, left: 14, right: 15 } as const;

function deadZone(value: number | undefined): number {
  const v = value ?? 0;
  return Math.abs(v) < PAD_DEAD_ZONE ? 0 : v;
}

/**
 * The Wave Lab's flying input (spec L1): keys, drag to look, the wheel for speed,
 * the gamepad's sticks and buttons, and the touch stick. Held input is read each
 * frame; lab actions fire once per press. Disabled, it holds nothing.
 */
export class FlyInput {
  private readonly held = new Set<string>();
  private active = true;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private lookX = 0;
  private lookY = 0;
  private stick = { x: 0, y: 0 };
  private touchRise = 0;
  private pad?: PadState;
  private padPrevious = new Set<number>();
  private readonly pads: () => PadState[];

  constructor(private readonly actions: FlyActions, environment: FlyEnvironment = {}) {
    const keys = environment.keys ?? globalThis.window;
    this.pads = environment.pads ?? (() => readPads());
    keys?.addEventListener('keydown', (event) => this.keyDown(event as KeyboardEvent));
    keys?.addEventListener('keyup', (event) => { this.held.delete((event as KeyboardEvent).code); });
    keys?.addEventListener('blur', () => this.release());
    const surface = environment.surface;
    surface?.addEventListener('pointerdown', (event) => {
      if (!this.active) return;
      const pointer = event as PointerEvent;
      this.dragging = true;
      this.lastX = pointer.clientX;
      this.lastY = pointer.clientY;
      (pointer.target as Element | null)?.setPointerCapture?.(pointer.pointerId);
    });
    surface?.addEventListener('pointermove', (event) => {
      if (!this.dragging || !this.active) return;
      const pointer = event as PointerEvent;
      this.lookX += pointer.clientX - this.lastX;
      this.lookY += pointer.clientY - this.lastY;
      this.lastX = pointer.clientX;
      this.lastY = pointer.clientY;
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) surface?.addEventListener(type, () => { this.dragging = false; });
    surface?.addEventListener('wheel', (event) => {
      if (!this.active) return;
      const wheel = event as WheelEvent;
      wheel.preventDefault?.();
      if (wheel.deltaY !== 0) this.actions.speed(wheel.deltaY < 0 ? 1 : -1);
    }, { passive: false });
  }

  get enabled(): boolean {
    return this.active;
  }

  set enabled(enabled: boolean) {
    this.active = enabled;
    if (!enabled) this.release();
  }

  /** The touch stick, −1…1: x the screen's right, y forward. */
  setStick(x: number, y: number): void {
    this.stick = { x, y };
  }

  /** The touch up/down buttons: +1 up, −1 down, 0 neither. */
  setRise(value: number): void {
    this.touchRise = value;
  }

  /** Read the pads once a frame: new button presses fire; the sticks are kept for `read`. */
  poll(): void {
    const pad = this.pads()[0];
    this.pad = this.active ? pad : undefined;
    const now = new Set<number>();
    pad?.buttons.forEach((pressed, index) => { if (pressed) now.add(index); });
    if (this.active) for (const index of now) if (!this.padPrevious.has(index)) this.padPress(index);
    this.padPrevious = now;
  }

  read(dt: number): FlyControl {
    if (!this.active) return { ...FLY_IDLE };
    const control: FlyControl = { ...FLY_IDLE, fast: this.held.has('ShiftLeft') || this.held.has('ShiftRight') };
    for (const code of this.held) {
      const move = MOVE_KEYS[code];
      if (move) control[move.axis] += move.sign;
    }
    control.strafe += this.stick.x;
    control.forward += this.stick.y;
    control.rise += this.touchRise;
    const pad = this.pad;
    if (pad) {
      control.strafe += deadZone(pad.axes[0]);
      control.forward -= deadZone(pad.axes[1]);
      control.rise += Number(pad.buttons[PAD.rt] ?? false) - Number(pad.buttons[PAD.lt] ?? false);
      control.fast ||= Boolean(pad.buttons[PAD.lb]);
      control.yaw -= deadZone(pad.axes[2]) * PAD_LOOK_RATE * dt;
      control.pitch -= deadZone(pad.axes[3]) * PAD_LOOK_RATE * dt;
    }
    control.yaw -= this.lookX * LOOK_PER_PIXEL;
    control.pitch -= this.lookY * LOOK_PER_PIXEL;
    this.lookX = 0;
    this.lookY = 0;
    for (const axis of ['strafe', 'forward', 'rise'] as const) control[axis] = Math.max(-1, Math.min(1, control[axis]));
    return control;
  }

  private keyDown(event: KeyboardEvent): void {
    if (ownedByControl(event.target, event.code) || !this.active) return;
    // Used here, so the menus that also listen for keys (Esc among them) leave the press alone.
    if (MOVE_KEYS[event.code] || ACTION_KEYS.has(event.code)) event.preventDefault?.();
    if (!event.repeat && !this.held.has(event.code)) this.keyPress(event.code);
    this.held.add(event.code);
  }

  private keyPress(code: string): void {
    const { actions } = this;
    if (code === 'KeyF') actions.follow();
    else if (code === 'KeyH') actions.hideUi();
    else if (code === 'Space') actions.togglePause();
    else if (code === 'Period') actions.step();
    else if (code === 'BracketLeft') actions.slower();
    else if (code === 'BracketRight') actions.faster();
    else if (code === 'Escape') actions.pause();
    else if (/^Digit[1-4]$/.test(code)) actions.jump(Number(code.slice(5)) as JumpPoint);
  }

  private padPress(index: number): void {
    const { actions } = this;
    if (index === PAD.a) actions.togglePause();
    else if (index === PAD.x) actions.hideUi();
    else if (index === PAD.y) actions.follow();
    else if (index === PAD.rb) actions.step();
    else if (index === PAD.start) actions.pause();
    else if (index === PAD.up) actions.jump(1);
    else if (index === PAD.right) actions.jump(2);
    else if (index === PAD.down) actions.jump(3);
    else if (index === PAD.left) actions.jump(4);
  }

  private release(): void {
    this.held.clear();
    this.dragging = false;
    this.lookX = 0;
    this.lookY = 0;
    this.stick = { x: 0, y: 0 };
    this.touchRise = 0;
    this.pad = undefined;
  }
}
