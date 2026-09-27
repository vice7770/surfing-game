/**
 * A 0–1 posture stage moved toward its target along a minimum-jerk path (Flash
 * & Hogan 1985, the smooth profile of a practised human movement; the pop-up's
 * transitions use it too): it starts and ends with no acceleration, peaking at
 * 5.77 Δ/T² mid-way. Given a new target part-way (an analog input, a release),
 * it plans the quintic from where it is, at its rate and acceleration, to rest
 * on the new target over the new time, so the body's motion stays smooth. A
 * body cannot start a movement at full acceleration: the duck-dive's stages
 * once did (a critically damped follower, ω²Δ at the first instant), and asked
 * the hands to pull the body onto the deck with many times its weight.
 */
export class MinimumJerkTrack {
  value = 0;
  /** 1/s. */
  rate = 0;
  /** 1/s². */
  acceleration = 0;
  target = 0;
  private readonly coefficients = new Float64Array(6);
  private elapsed = 0;
  /** The plan's length, s; 0 at rest on the target. */
  private duration = 0;

  /** Head for `target` over `time` s from the current motion; the same target again keeps the plan. */
  retarget(target: number, time: number): void {
    if (target === this.target) return;
    this.target = target;
    const T = Math.max(1e-3, time);
    const delta = target - this.value;
    const v = this.rate;
    const a = this.acceleration;
    const c = this.coefficients;
    c[0] = this.value;
    c[1] = v;
    c[2] = a / 2;
    c[3] = (20 * delta - 12 * v * T - 3 * a * T * T) / (2 * T ** 3);
    c[4] = (-30 * delta + 16 * v * T + 3 * a * T * T) / (2 * T ** 4);
    c[5] = (12 * delta - 6 * v * T - a * T * T) / (2 * T ** 5);
    this.elapsed = 0;
    this.duration = T;
  }

  step(h: number): void {
    if (this.duration <= 0) return;
    this.elapsed += h;
    if (this.elapsed >= this.duration) {
      this.settle();
      return;
    }
    const t = this.elapsed;
    const c = this.coefficients;
    const value = c[0] + t * (c[1] + t * (c[2] + t * (c[3] + t * (c[4] + t * c[5]))));
    this.rate = c[1] + t * (2 * c[2] + t * (3 * c[3] + t * (4 * c[4] + t * 5 * c[5])));
    this.acceleration = 2 * c[2] + t * (6 * c[3] + t * (12 * c[4] + t * 20 * c[5]));
    this.value = value;
    // Turned back hard near an end, the path would overshoot the posture: it stops there.
    if (value < 0 || value > 1) {
      this.value = Math.min(1, Math.max(0, value));
      this.rate = 0;
      this.acceleration = 0;
    }
  }

  reset(): void {
    this.target = 0;
    this.settle();
    this.value = 0;
  }

  private settle(): void {
    this.value = this.target;
    this.rate = 0;
    this.acceleration = 0;
    this.duration = 0;
  }
}
