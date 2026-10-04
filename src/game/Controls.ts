import type { RideInput } from '../physics/RideSession';
import { heldActions, padValue, readPads, type Action, type Bindings, type PadKind, type PadState } from './Bindings';
import { AxisRamp } from './InputAxes';
import { DEFAULT_STICK, drivingPad, padKey, padSticks, touched, type StickSettings } from './Sticks';
import type { CallId } from '../net/protocol';

/** One frame's paddle, steer and pop-up press, as `input` reads them. */
export interface BoardInput {
  paddle: boolean;
  steer: number;
  getUp: boolean;
}

/** What a press of retry, camera and pause does; paddle, pop-up and steer are read through `input`. */
export interface ControlHandlers {
  retry(): void;
  camera(): void;
  pause(): void;
  /** Sound on and off (S1). */
  mute?(): void;
  /** A surf call online (N1). */
  call?(call: CallId): void;
}

/** Each call action's call. */
const CALL_OF: Partial<Record<Action, CallId>> = { callLeft: 'left', callRight: 'right', callParty: 'party', callNice: 'nice' };

/** Where the controls listen: the window and the connected pads by default; tests pass stand-ins. */
export interface ControlEnvironment {
  target?: EventTarget;
  pads?: () => PadState[];
  document?: Document;
  /** The stick settings (spec C1): which stick trims, the response and the dead zones; the defaults without. */
  stick?: () => StickSettings;
}

const EDITABLE = new Set(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA']);
/** A trigger's travel below this is at rest, not a press. */
const TRIGGER_REST = 0.05;
const NO_INPUT: BoardInput = { paddle: false, steer: 0, getUp: false };

/**
 * Keyboard, gamepad and touch input for the ride, through the player's bindings
 * (plan P8). Presses (pop-up, retry, camera, pause) fire once per press; held
 * actions are read each frame. Disabled while a menu is open, holding nothing.
 */
export class Controls {
  private readonly held = new Set<string>();
  private padHeld = new Set<Action>();
  private padPrevious = new Set<Action>();
  private padSteerValue = 0;
  private padTrimValue = 0;
  private padRotateValue = 0;
  private padCrouchValue = 0;
  private padCompressValue = 0;
  private padDuckValue = 0;
  private touchPaddle = false;
  private touchLeft = false;
  private touchRight = false;
  private touchCrouch = false;
  private touchCompress = false;
  /** Compress held since lying down (Space and RT paddle): it waits for a fresh press standing. */
  private compressStale = false;
  /** Keys held → the ride's axes, ramped (spec P9). */
  private readonly ramps = { steer: new AxisRamp(), trim: new AxisRamp(), crouch: new AxisRamp(), compress: new AxisRamp(), duckDive: new AxisRamp() };
  /** The latest ride request, for the hints to see what the player holds. */
  lastRequest: RideInput = { paddle: false, popUp: false, steer: 0, trim: 0, crouch: 0, compress: 0, hand: false, duckDive: 0, reel: false };
  private getUpRequested = false;
  private active = true;
  /** The device the player last pressed something on, so hints can name its keys or buttons. */
  lastDevice: 'keyboard' | 'gamepad' = 'keyboard';
  /** Which pad was used last, so hints name its buttons as printed on it (spec C1). */
  lastPadKind: PadKind = 'standard';
  /** The pad whose sticks steer and trim: the one touched last (spec C1). */
  private driving?: string;
  private readonly stick: () => StickSettings;
  private readonly pads: () => PadState[];

  constructor(private readonly bindings: () => Bindings, private readonly handlers: ControlHandlers, environment: ControlEnvironment = {}) {
    const target = environment.target ?? globalThis.window;
    this.pads = environment.pads ?? (() => readPads());
    this.stick = environment.stick ?? (() => DEFAULT_STICK);
    target.addEventListener('keydown', (event) => this.keyDown(event as KeyboardEvent));
    target.addEventListener('keyup', (event) => {
      this.held.delete((event as KeyboardEvent).code);
    });
    target.addEventListener('blur', () => this.release());
    const page = environment.document ?? globalThis.document;
    if (page) {
      this.bindTouchButton(page, 'touch-paddle', (held) => { this.touchPaddle = held; });
      this.bindTouchButton(page, 'touch-left', (held) => { this.touchLeft = held; });
      this.bindTouchButton(page, 'touch-right', (held) => { this.touchRight = held; });
      this.bindTouchButton(page, 'touch-crouch', (held) => { this.touchCrouch = held; });
      this.bindTouchButton(page, 'touch-compress', (held) => { this.touchCompress = held; });
    }
  }

  get enabled(): boolean {
    return this.active;
  }

  /** Off while a menu is open: everything held is let go, so nothing sticks on return. */
  set enabled(enabled: boolean) {
    this.active = enabled;
    if (!enabled) this.release();
  }

  get input(): BoardInput {
    if (!this.active) return NO_INPUT;
    const keys = heldActions(this.held, [], this.bindings());
    const has = (action: Action) => keys.has(action) || this.padHeld.has(action);
    const digital = Number(has('steerRight') || this.touchRight) - Number(has('steerLeft') || this.touchLeft);
    return {
      paddle: has('paddle') || this.touchPaddle,
      steer: this.padSteerValue !== 0 ? this.padSteerValue : digital,
      getUp: this.getUpRequested,
    };
  }

  /**
   * The ride's request for this frame (spec P9): paddling, the duck-dive and the
   * pop-up key's hold (the reel, in the water) lying down; trim, crouch, Compress
   * and the hand standing; steering always. Keys and touch ramp in and out over
   * RAMP_TIME, so a digital input feels analog; a pad's stick and trigger pass
   * straight through. Disabled, every axis ramps back to rest. The upper body's
   * rotation is the pad's alone (the movement-flow spec): standing, while the pad
   * was used last; otherwise undefined, and the body turns with the ride by itself.
   */
  rideRequest(dt: number, standing: boolean): RideInput {
    const keys = this.active ? heldActions(this.held, [], this.bindings()) : new Set<Action>();
    const has = (action: Action) => this.active && (keys.has(action) || this.padHeld.has(action));
    const touch = (held: boolean) => this.active && held;
    const steerKeys = Number(has('steerRight') || touch(this.touchRight)) - Number(has('steerLeft') || touch(this.touchLeft));
    const trimKeys = standing ? Number(has('trimForward')) - Number(has('trimBack')) : 0;
    const crouchKeys = standing && (has('crouch') || touch(this.touchCrouch)) ? 1 : 0;
    // Compress takes a press made standing: the paddle's Space or RT held through the pop-up does not compress.
    const compressHeld = has('compress') || touch(this.touchCompress) || (this.active && this.padCompressValue > 0);
    if (!standing) this.compressStale = compressHeld;
    else if (!compressHeld) this.compressStale = false;
    const compressing = standing && !this.compressStale;
    const compressKeys = compressing && (has('compress') || touch(this.touchCompress)) ? 1 : 0;
    // The keyboard's duck-dive ramps; a pad's buttons (LT analog, the D-pad at full) pass straight through.
    const duckKeys = !standing && this.active && keys.has('duckDive') ? 1 : 0;
    const steer = this.ramps.steer.update(steerKeys, dt);
    const trim = this.ramps.trim.update(trimKeys, dt);
    // Switching from crouch starts Compress at the current input ramp, avoiding a delayed turn request.
    if (compressKeys) this.ramps.compress.raise(this.ramps.crouch.value);
    const crouch = this.ramps.crouch.update(crouchKeys, dt);
    const compress = this.ramps.compress.update(compressKeys, dt);
    const duck = this.ramps.duckDive.update(duckKeys, dt);
    const pad = this.active;
    this.lastRequest = {
      paddle: !standing && (has('paddle') || touch(this.touchPaddle)),
      popUp: this.active && this.getUpRequested,
      steer: pad && this.padSteerValue !== 0 ? this.padSteerValue : steer,
      trim: standing && pad && this.padTrimValue !== 0 ? this.padTrimValue : trim,
      crouch: standing && pad ? Math.max(this.padCrouchValue, crouch) : crouch,
      compress: compressing && pad ? Math.max(this.padCompressValue, compress) : compress,
      hand: standing && has('hand'),
      rotate: standing && pad && this.lastDevice === 'gamepad' ? this.padRotateValue : undefined,
      duckDive: standing ? 0 : Math.max(pad ? this.padDuckValue : 0, duck),
      reel: !standing && has('popUp'),
    };
    return this.lastRequest;
  }

  requestGetUp(): void { this.getUpRequested = true; }
  consumeGetUp(): void { this.getUpRequested = false; }

  /** Read the gamepads once a frame: new presses fire, held buttons are kept, and the pad touched last drives the sticks. */
  poll(): void {
    const pads = this.pads();
    const now = heldActions(new Set(), pads, this.bindings());
    this.driving = drivingPad(pads, this.driving);
    const used = pads.find(touched);
    if (used) {
      this.lastDevice = 'gamepad';
      this.lastPadKind = used.kind ?? 'standard';
    }
    if (this.active) {
      for (const action of now) if (!this.padPrevious.has(action)) this.press(action);
      this.padHeld = now;
      const sticks = padSticks(pads.find((pad, index) => padKey(pad, index) === this.driving), this.stick());
      this.padSteerValue = sticks.steer;
      this.padTrimValue = sticks.trim;
      this.padRotateValue = sticks.rotate;
      this.padCrouchValue = padValue(pads, this.bindings().gamepad.crouch[0]);
      // A trigger resting just off its stop is not a press (the Steam Controller reports raw travel).
      const compressValue = padValue(pads, this.bindings().gamepad.compress[0]);
      this.padCompressValue = compressValue < TRIGGER_REST ? 0 : compressValue;
      this.padDuckValue = Math.max(0, ...this.bindings().gamepad.duckDive.map((button) => padValue(pads, button)));
    }
    this.padPrevious = now;
  }

  private keyDown(event: KeyboardEvent): void {
    const tag = (event.target as Element | null)?.tagName;
    // A form control keeps its own keys, except the pause key, so Esc always pauses the Wave Lab.
    if (tag && EDITABLE.has(tag) && !this.bindings().keyboard.pause.includes(event.code)) return;
    this.lastDevice = 'keyboard';
    if (!this.active) return;
    const actions = heldActions(new Set([event.code]), [], this.bindings());
    if (actions.size > 0 || event.code === 'Space') event.preventDefault();
    if (!event.repeat && !this.held.has(event.code)) for (const action of actions) this.press(action);
    this.held.add(event.code);
  }

  private press(action: Action): void {
    if (action === 'popUp') this.getUpRequested = true;
    else if (action === 'retry') this.handlers.retry();
    else if (action === 'camera') this.handlers.camera();
    else if (action === 'pause') this.handlers.pause();
    else if (action === 'mute') this.handlers.mute?.();
    else if (CALL_OF[action]) this.handlers.call?.(CALL_OF[action]);
  }

  private release(): void {
    this.held.clear();
    this.padHeld = new Set();
    this.padSteerValue = 0;
    this.padTrimValue = 0;
    this.padRotateValue = 0;
    this.padCrouchValue = 0;
    this.padCompressValue = 0;
    this.padDuckValue = 0;
    this.touchPaddle = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchCrouch = false;
    this.touchCompress = false;
    this.getUpRequested = false;
  }

  private bindTouchButton(page: Document, id: string, setHeld: (held: boolean) => void): void {
    const button = page.getElementById(id);
    if (!button) return;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setHeld(true);
      button.classList.add('is-held');
    });
    const release = () => {
      setHeld(false);
      button.classList.remove('is-held');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }
}
