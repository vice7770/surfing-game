/**
 * The sprint paddle's reserve (the owner's choices of 2026-10-22): the anaerobic
 * capacity a sprint draws on. In the critical-power model, work above the power a
 * body can sustain comes from a finite store, W′, which refills once the effort
 * drops below that power (Skiba et al. 2012, the W′ balance); surfing is that
 * pattern, long paddling at a sustainable effort broken by short all-out sprints
 * to catch a wave or get out of the impact zone (Farley et al. 2012, the
 * physiological demands of competitive surfing). The owner's numbers: a full
 * reserve lasts `drain` s of sprinting and refills in `refill` s of anything else
 * (cruising, lying still, riding, swimming); emptied, the paddler cruises until it
 * is back to `again` of full. Linear both ways, a gameplay simplification of W′'s
 * exponential refill.
 */
export const PADDLE_RESERVE = { drain: 8, refill: 15, again: 0.25 } as const;

/** One surfer's sprint reserve: 1 full to 0 spent. */
export class PaddleReserve {
  level = 1;
  /** Emptied: the sprint waits until the reserve is back to `PADDLE_RESERVE.again`. */
  spent = false;

  reset(): void {
    this.level = 1;
    this.spent = false;
  }

  /** Whether a sprint can draw on it now. */
  get available(): boolean {
    return !this.spent && this.level > 0;
  }

  /** `dt` s, sprinting or not. */
  step(dt: number, sprinting: boolean): void {
    if (sprinting) {
      this.level = Math.max(0, this.level - dt / PADDLE_RESERVE.drain);
      if (this.level === 0) this.spent = true;
    } else {
      this.level = Math.min(1, this.level + dt / PADDLE_RESERVE.refill);
      if (this.spent && this.level >= PADDLE_RESERVE.again) this.spent = false;
    }
  }
}
