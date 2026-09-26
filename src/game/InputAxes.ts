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

  reset(): void {
    this.current = 0;
  }
}
