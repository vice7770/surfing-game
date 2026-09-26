import type { RiderSeparation } from '../physics/AttachedRider';
import type { StringKey } from '../ui/strings';
import type { RIDER_PHASES } from '../wave/SurfZoneRunner';

/** How a physical ride ended: knocked off, carried out of the surf zone, or restarted by the player. */
export type RideOutcome = 'wipeout' | 'complete' | 'ended';

export interface RideResult {
  outcome: RideOutcome;
  reason: StringKey;
  /** Horizontal path length while standing, m. */
  distance: number;
  /** Fastest board speed while standing, m/s. */
  topSpeed: number;
  /** Time standing, s of sea time. */
  seconds: number;
}

/** One frame of the ride as the page sees it: the status, the board's position, and the sea's clock. */
export interface RideFrame {
  phase: (typeof RIDER_PHASES)[number];
  speed: number;
  resets: number;
  separation?: RiderSeparation;
  seaTime: number;
  x: number;
  z: number;
}

/** Shorter than this on the feet is a failed pop-up, not a ride. */
export const MIN_RIDE_SECONDS = 1;

const RIDING = new Set<RideFrame['phase']>(['standing', 'recover']);
const FALL_REASONS: Record<RiderSeparation, StringKey> = {
  balance: 'ride.reason.balance',
  'foot slip': 'ride.reason.footSlip',
  'lost board': 'ride.reason.lostBoard',
  impact: 'ride.reason.impact',
};

/**
 * Follows the physical rider frame by frame (plan P8) and sums up each ride:
 * from the first frame standing until the rider falls, the board leaves the surf
 * zone (the session restarts it), or the player paddles out again.
 */
export class RideTracker {
  private riding = false;
  private retryNoted = false;
  private resets?: number;
  private distance = 0;
  private topSpeed = 0;
  private startTime = 0;
  private lastTime = 0;
  private lastX = 0;
  private lastZ = 0;

  /** The player asked to paddle out again: the next restart ends the ride by choice. */
  noteRetry(): void {
    this.retryNoted = true;
  }

  reset(): void {
    this.riding = false;
    this.retryNoted = false;
    this.resets = undefined;
  }

  /** Feed one frame; returns the ride's summary on the frame it ends, if it lasted long enough. */
  update(frame: RideFrame): RideResult | undefined {
    const restarted = this.resets !== undefined && frame.resets > this.resets;
    this.resets = frame.resets;
    if (!this.riding) {
      if (restarted) this.retryNoted = false;
      if (frame.phase === 'standing') this.begin(frame);
      return undefined;
    }
    if (restarted) {
      return this.retryNoted ? this.finish('ended', 'ride.reason.retry') : this.finish('complete', 'ride.reason.outOfWave');
    }
    if (RIDING.has(frame.phase)) {
      this.distance += Math.hypot(frame.x - this.lastX, frame.z - this.lastZ);
      this.topSpeed = Math.max(this.topSpeed, frame.speed);
      this.lastTime = frame.seaTime;
      this.lastX = frame.x;
      this.lastZ = frame.z;
      return undefined;
    }
    if (frame.phase === 'fallen') return this.finish('wipeout', FALL_REASONS[frame.separation ?? 'balance']);
    return this.finish('ended', 'ride.reason.retry');
  }

  private begin(frame: RideFrame): void {
    this.riding = true;
    this.distance = 0;
    this.topSpeed = frame.speed;
    this.startTime = frame.seaTime;
    this.lastTime = frame.seaTime;
    this.lastX = frame.x;
    this.lastZ = frame.z;
  }

  private finish(outcome: RideOutcome, reason: StringKey): RideResult | undefined {
    this.riding = false;
    this.retryNoted = false;
    const seconds = this.lastTime - this.startTime;
    if (seconds < MIN_RIDE_SECONDS) return undefined;
    return { outcome, reason, distance: this.distance, topSpeed: this.topSpeed, seconds };
  }
}
