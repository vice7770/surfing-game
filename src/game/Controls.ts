import type { BoardInput } from '../physics/BoardPhysics';
import type { RideInput } from '../physics/RideSession';
import { heldActions, padSteer, padTrim, padValue, readPads, type Action, type Bindings, type PadState } from './Bindings';
import { AxisRamp } from './InputAxes';

/** What a press of retry, camera and pause does; paddle, pop-up and steer are read through `input`. */
export interface ControlHandlers {
  retry(): void;
  camera(): void;
  pause(): void;
}

/** Where the controls listen: the window and the connected pads by default; tests pass stand-ins. */
export interface ControlEnvironment {
  target?: EventTarget;
  pads?: () => PadState[];
  document?: Document;
}

const EDITABLE = new Set(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA']);
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
  private padCrouchValue = 0;
  private touchPaddle = false;
  private touchLeft = false;
  private touchRight = false;
  private touchCrouch = false;
  /** Keys held → the ride's axes, ramped (spec P9). */
  private readonly ramps = { steer: new AxisRamp(), trim: new AxisRamp(), crouch: new AxisRamp() };
  /** The latest ride request, for the hints to see what the player holds. */
  lastRequest: RideInput = { paddle: false, popUp: false, steer: 0, trim: 0, crouch: 0, hand: false };
  private getUpRequested = false;
  private active = true;
  /** The device the player last pressed something on, so hints can name its keys or buttons. */
  lastDevice: 'keyboard' | 'gamepad' = 'keyboard';
  private readonly pads: () => PadState[];

  constructor(private readonly bindings: () => Bindings, private readonly handlers: ControlHandlers, environment: ControlEnvironment = {}) {
    const target = environment.target ?? globalThis.window;
    this.pads = environment.pads ?? (() => readPads());
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
   * The ride's request for this frame (spec P9): paddling lying down; trim, crouch
   * and the hand standing; steering always. Keys and touch ramp in and out over
   * RAMP_TIME, so a digital input feels analog; a pad's stick and trigger pass
   * straight through. Disabled, every axis ramps back to rest.
   */
  rideRequest(dt: number, standing: boolean): RideInput {
    const keys = this.active ? heldActions(this.held, [], this.bindings()) : new Set<Action>();
    const has = (action: Action) => this.active && (keys.has(action) || this.padHeld.has(action));
    const touch = (held: boolean) => this.active && held;
    const steerKeys = Number(has('steerRight') || touch(this.touchRight)) - Number(has('steerLeft') || touch(this.touchLeft));
    const trimKeys = standing ? Number(has('trimForward')) - Number(has('trimBack')) : 0;
    const crouchKeys = standing && (has('crouch') || touch(this.touchCrouch)) ? 1 : 0;
    const steer = this.ramps.steer.update(steerKeys, dt);
    const trim = this.ramps.trim.update(trimKeys, dt);
    const crouch = this.ramps.crouch.update(crouchKeys, dt);
    const pad = this.active;
    this.lastRequest = {
      paddle: !standing && (has('paddle') || touch(this.touchPaddle)),
      popUp: this.active && this.getUpRequested,
      steer: pad && this.padSteerValue !== 0 ? this.padSteerValue : steer,
      trim: standing && pad && this.padTrimValue !== 0 ? this.padTrimValue : trim,
      crouch: standing && pad ? Math.max(this.padCrouchValue, crouch) : crouch,
      hand: standing && has('hand'),
    };
    return this.lastRequest;
  }

  requestGetUp(): void { this.getUpRequested = true; }
  consumeGetUp(): void { this.getUpRequested = false; }

  /** Read the gamepads once a frame: new presses fire, held buttons and the stick are kept. */
  poll(): void {
    const pads = this.pads();
    const now = heldActions(new Set(), pads, this.bindings());
    if (pads.some((pad) => pad.buttons.some(Boolean) || Math.abs(pad.axes[0] ?? 0) > 0.5 || Math.abs(pad.axes[1] ?? 0) > 0.5)) this.lastDevice = 'gamepad';
    if (this.active) {
      for (const action of now) if (!this.padPrevious.has(action)) this.press(action);
      this.padHeld = now;
      this.padSteerValue = padSteer(pads);
      this.padTrimValue = padTrim(pads);
      this.padCrouchValue = padValue(pads, this.bindings().gamepad.crouch[0]);
    }
    this.padPrevious = now;
  }

  private keyDown(event: KeyboardEvent): void {
    const tag = (event.target as Element | null)?.tagName;
    if (tag && EDITABLE.has(tag)) return;
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
  }

  private release(): void {
    this.held.clear();
    this.padHeld = new Set();
    this.padSteerValue = 0;
    this.padTrimValue = 0;
    this.padCrouchValue = 0;
    this.touchPaddle = false;
    this.touchLeft = false;
    this.touchRight = false;
    this.touchCrouch = false;
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
