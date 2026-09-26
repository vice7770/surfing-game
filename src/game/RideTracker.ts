import type { RiderSeparation } from '../physics/AttachedRider';
import type { RideEnd, RideReport } from './rideAnalysis';
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
  /** The worker's reading of the ride (P9): its turns, pocket time and end, when it ended the ride. */
  report?: RideReport;
  /** The slow motion the ride was played at, when below 1. */
  timeScale?: number;
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
  /** The worker's latest finished ride (P9); its id counts up. */
  report?: RideReport & { id: number };
  /** The page's slow motion, 0.4–1. */
  timeScale?: number;
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
/** The worker's ride ends other than a fall (P9): the ride is complete, for these reasons. */
const WORKER_REASONS: Record<Exclude<RideEnd, 'fell'>, StringKey> = {
  'lost the face': 'ride.reason.lostFace',
  inside: 'ride.reason.inside',
  'kicked out': 'ride.reason.kickedOut',
};

/**
 * Follows the physical rider frame by frame (plan P8) and sums up each ride:
 * from the first frame standing until the rider falls, the board leaves the surf
 * zone (the session restarts it), or the player paddles out again. The worker's
 * own reading of the ride (P9) ends it first when it arrives, and a ride it ended
 * while the rider still stands is not begun again until the rider leaves the
 * stance.
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
  private slowest = 1;
  /** The latest worker report seen, and whether the rider must leave the stance before a new ride begins. */
  private seenReport?: number;
  private waitForLeave = false;

  /** The player asked to paddle out again: the next restart ends the ride by choice. */
  noteRetry(): void {
    this.retryNoted = true;
  }

  reset(): void {
    this.riding = false;
    this.retryNoted = false;
    this.resets = undefined;
    this.seenReport = undefined;
    this.waitForLeave = false;
  }

  /** Feed one frame; returns the ride's summary on the frame it ends, if it lasted long enough. */
  update(frame: RideFrame): RideResult | undefined {
    const restarted = this.resets !== undefined && frame.resets > this.resets;
    this.resets = frame.resets;
    const report = frame.report && frame.report.id !== this.seenReport ? frame.report : undefined;
    if (frame.report) this.seenReport = frame.report.id;
    if (!this.riding) {
      if (restarted) this.retryNoted = false;
      if (!RIDING.has(frame.phase)) this.waitForLeave = false;
      if (frame.phase === 'standing' && !this.waitForLeave) this.begin(frame);
      return undefined;
    }
    this.slowest = Math.min(this.slowest, frame.timeScale ?? 1);
    if (report) {
      this.waitForLeave = RIDING.has(frame.phase);
      const reason = report.end === 'fell' ? FALL_REASONS[frame.separation ?? 'balance'] : WORKER_REASONS[report.end];
      const { id: _, ...reading } = report;
      return this.finish(report.end === 'fell' ? 'wipeout' : 'complete', reason, reading);
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
    this.slowest = frame.timeScale ?? 1;
  }

  /** The ride's summary: the worker's measures when it read the ride, the tracker's own otherwise. */
  private finish(outcome: RideOutcome, reason: StringKey, report?: RideReport): RideResult | undefined {
    this.riding = false;
    this.retryNoted = false;
    const seconds = report ? report.duration : this.lastTime - this.startTime;
    if (seconds < MIN_RIDE_SECONDS) return undefined;
    return {
      outcome, reason, seconds,
      distance: report ? report.distance : this.distance,
      topSpeed: report ? report.topSpeed : this.topSpeed,
      ...(report ? { report } : {}),
      ...(this.slowest < 1 ? { timeScale: this.slowest } : {}),
    };
  }
}
