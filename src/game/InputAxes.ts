/** A held key reaches its full axis over this long, s, and lets go as fast (spec P9: a digital input feels analog). */
export const RAMP_TIME = 0.2;

/** A digital input held → an analog axis, moving linearly toward its target at 1 / RAMP_TIME per second. */
export class AxisRamp {
  private current = 0;

  get value(): number {
    return this.current;
  }

  update(target: number, dt: number): number {
    const step = Math.max(0, dt) / RAMP_TIME;
    const gap = target - this.current;
    this.current = Math.abs(gap) <= step ? target : this.current + Math.sign(gap) * step;
    return this.current;
  }

  /** Start from at least `value` (a ramp taking over from another without dipping). */
  raise(value: number): void {
    this.current = Math.max(this.current, Math.min(1, value));
  }

  reset(): void {
    this.current = 0;
  }
}

/**
 * The sprint paddle's press (the owner's choice of 2026-10-22): the paddle let go and pressed again within
 * DOUBLE_PRESS_WINDOW, s, and held, sprints; letting it go stops the sprint, and the paddling with it. A single press
 * held paddles at cruise. 0.3 s: deliberate double presses of a key or button come 0.1–0.25 s apart (a
 * double-click's second click; desktop systems wait 0.4–0.5 s to catch slow ones), and a quarter of a cruising
 * stroke (1.2 s a side) is too short a stop to mean one: letting go to stop or to steer lasts longer.
 */
export const DOUBLE_PRESS_WINDOW = 0.3;

/** The paddle held each frame → whether it sprints: pressed again within DOUBLE_PRESS_WINDOW of letting go, and held. */
export class SprintPress {
  private held = false;
  private released = Infinity;
  private sprinting = false;

  update(held: boolean, dt: number): boolean {
    const step = Math.max(0, dt);
    if (held && !this.held) this.sprinting = this.released + step <= DOUBLE_PRESS_WINDOW;
    if (!held) {
      this.released = this.held ? 0 : this.released + step;
      this.sprinting = false;
    }
    this.held = held;
    return this.sprinting;
  }

  reset(): void {
    this.held = false;
    this.released = Infinity;
    this.sprinting = false;
  }
}
