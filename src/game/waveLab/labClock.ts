import { SURF_ZONE_STEP } from '../../wave/SurfZoneRunner';

/** The lab's slow-motion presets (spec L1). */
export const SLOW_MOTION = [0.1, 0.25, 0.5, 1] as const;

/**
 * The Wave Lab's time (spec L1): paused, the sea takes no steps except the
 * frame-steps asked for; running, it runs at the slow-motion scale.
 */
export class LabClock {
  paused = false;
  scale = 1;
  private pending = 0;

  togglePause(): void {
    this.paused = !this.paused;
    this.pending = 0;
  }

  /** One physics step, only while paused. */
  step(): void {
    if (this.paused) this.pending += 1;
  }

  /** The preset nearest `scale`. */
  setScale(scale: number): void {
    this.scale = SLOW_MOTION.reduce<number>((best, preset) => (Math.abs(preset - scale) < Math.abs(best - scale) ? preset : best), 1);
  }

  slower(): void {
    this.scale = SLOW_MOTION[Math.max(0, this.index() - 1)];
  }

  faster(): void {
    this.scale = SLOW_MOTION[Math.min(SLOW_MOTION.length - 1, this.index() + 1)];
  }

  /** Simulated seconds for a frame that took `elapsed` s. */
  advance(elapsed: number): number {
    if (this.paused) {
      const steps = this.pending;
      this.pending = 0;
      return steps * SURF_ZONE_STEP;
    }
    return elapsed > 0 ? elapsed * this.scale : 0;
  }

  private index(): number {
    const index = SLOW_MOTION.indexOf(this.scale as (typeof SLOW_MOTION)[number]);
    return index >= 0 ? index : SLOW_MOTION.length - 1;
  }
}
