import { SURF_ZONE_STEP } from '../wave/SurfZoneRunner';

/** Behind the room's clock by more than this, s, for RESYNC_AFTER s: rebuild the sea at the room's time (spec N1). */
export const RESYNC_BEHIND = 1;
export const RESYNC_AFTER = 3;
/** Behind by more than this at once, s (a background tab, a sleeping laptop): rebuild now. */
export const RESYNC_JUMP = 5;
/** Most steps asked for in one frame. */
export const MAX_ONLINE_BATCH = 30;
/** The worker's queue online: room to catch up after a join. */
export const ONLINE_QUEUE = 90;

export interface PacerStep {
  /** Steps to ask the surf zone for now. */
  steps: number;
  /** The sea has fallen too far behind the room: rebuild it at the room's time. */
  resync: boolean;
  /** The sea has reached the room's clock since the last start. */
  caughtUp: boolean;
}

/**
 * Online pacing (spec N1): instead of stepping on the frame's elapsed time, ask
 * for the steps that bring the sea to the room's clock, less those already on
 * their way. Until the sea first catches up (a join spins up behind), it only
 * catches up; after that, staying behind means re-syncing.
 */
export class OnlinePacer {
  private behindFor = 0;
  private caughtUp = false;

  constructor(private readonly step = SURF_ZONE_STEP) {}

  /** A new sea: catch up again before any re-sync. */
  reset(): void {
    this.behindFor = 0;
    this.caughtUp = false;
  }

  /** `target` is the room's sea time now, `shown` the latest snapshot's, `outstanding` the steps asked for but not shown, `dt` the frame. */
  next(target: number, shown: number, outstanding: number, dt: number): PacerStep {
    const wanted = Math.floor((target - shown) / this.step + 1e-6) - outstanding;
    const steps = Math.max(0, Math.min(MAX_ONLINE_BATCH, wanted));
    const behind = target - shown;
    if (!this.caughtUp && behind <= RESYNC_BEHIND) this.caughtUp = true;
    this.behindFor = this.caughtUp && behind > RESYNC_BEHIND ? this.behindFor + dt : 0;
    const resync = this.caughtUp && (behind > RESYNC_JUMP || this.behindFor >= RESYNC_AFTER);
    return { steps, resync, caughtUp: this.caughtUp };
  }
}
