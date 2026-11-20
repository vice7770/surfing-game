import type { RiderSeparation } from '../physics/AttachedRider';
import type { RideEnd, RideReport } from './rideAnalysis';
import type { StringKey } from '../ui/strings';
import type { BrokenLimit, RIDER_PHASES } from '../wave/SurfZoneRunner';

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
  /**
   * **What let go, when the ride ended in a separation** (the Logbook's fall readout): the physics' own record of
   * the fall (`SurfZoneStatus.ride.broke`), taken at the separation. Absent when the ride ended with the rider still
   * on the board (a retry mid-flight, or a ride that was ridden out), and absent on a wipeout whose frames carried no
   * `broke` — the readout must say so rather than show a zero.
   */
  fall?: BrokenLimit;
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
  /** What let go at the latest fall (`SurfZoneStatus.ride.broke`), held by the runner until the rider is back up. */
  broke?: BrokenLimit;
  /** The page's slow motion, 0.4–1. */
  timeScale?: number;
}

/**
 * Shorter than this on the feet is a failed pop-up, not a ride — **except a fall** (the owner's ruling of
 * 2026-11-19). He wants every fall he stood up for in the Logbook, however short, because the shortest stands are
 * exactly the ones he cannot explain; he does not want the fifty-entry list filling with aborted pop-ups.
 *
 * "Stood up for" is the outcome itself, not a second test. There are two ways to reach a `wipeout`, and a stand is
 * behind both: a ride **begins** only on a `standing` frame (`update`), and a worker report of `end: 'fell'` is
 * published only for a ride the analyzer started, which it does only on a `standing` sample
 * (`RideAnalyzer.push`) — the same test, taken on the worker's full-rate samples rather than the page's drawn
 * frames. A pop-up that goes push → landing → fallen without ever standing starts neither, and so is never logged,
 * short or not.
 */
export const MIN_RIDE_SECONDS = 1;

const RIDING = new Set<RideFrame['phase']>(['standing', 'recover']);
export const FALL_REASONS: Record<RiderSeparation, StringKey> = {
  balance: 'ride.reason.balance',
  'foot slip': 'ride.reason.footSlip',
  'lost board': 'ride.reason.lostBoard',
  impact: 'ride.reason.impact',
  reef: 'ride.reason.reef',
};
/** The worker's ride ends other than a fall (P9): the ride is complete, for these reasons. */
export const WORKER_REASONS: Record<Exclude<RideEnd, 'fell'>, StringKey> = {
  'kicked out': 'ride.reason.kickedOut',
  'wave died': 'ride.reason.waveDied',
  'lost the wave': 'ride.reason.lostWave',
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
  /**
   * Whether a wipeout has already been logged for the rider's current time off the board. The worker's report can
   * land a few frames after the page saw the fall itself, so without this the same fall would be logged twice: once
   * from the `fallen` frame, and again from the report that follows it onto another `fallen` frame.
   */
  private fallLogged = false;
  /**
   * What let go, from the last frame of this ride that carried it. The runner latches it at the separation and holds
   * it until the rider is back on the board, so a worker report that lands a few frames after the fall still finds
   * it. Cleared when a ride begins, so one ride never shows the previous ride's fall.
   */
  private broke?: BrokenLimit;

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
    this.fallLogged = false;
    this.broke = undefined;
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
      if (frame.phase !== 'fallen') this.fallLogged = false;
      // A stand the page's frames stepped over. The worker advances the sea in batches and the page reads one
      // snapshot a drawn frame, so a stand that began and fell inside one batch is never seen standing here: it
      // arrives only as the worker's report, on a frame that already reads `fallen`. Logging it is the owner's
      // ruling of 2026-11-19 — every fall he stood up for, however short, and his falls come within a second — and
      // it does not weaken the ruling's other half: a failed pop-up produces **no report at all**, because the
      // analyzer starts a ride only on a `standing` sample. The report is that same stand test, taken on the
      // worker's own full-rate samples instead of the page's.
      if (report && report.end === 'fell' && frame.phase === 'fallen' && !this.fallLogged) return this.logUnseenFall(frame, report);
      if (frame.phase === 'standing' && !this.waitForLeave) this.begin(frame);
      return undefined;
    }
    this.slowest = Math.min(this.slowest, frame.timeScale ?? 1);
    if (frame.broke) this.broke = frame.broke;
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
    if (frame.phase === 'fallen') {
      // The stand ends at the separation, not at the last frame that was still standing: with falls of a fraction of
      // a second now logged, a stand of a single frame would otherwise measure exactly 0 and read as a zero where a
      // number was measured. It adds at most one frame to a wipeout's time.
      this.lastTime = frame.seaTime;
      return this.finish('wipeout', FALL_REASONS[frame.separation ?? 'balance']);
    }
    return this.finish('ended', 'ride.reason.retry');
  }

  /**
   * Log a fall from the worker's report alone, for a stand no frame of the page's ever read. Its measures are the
   * report's, as they are for any ride the worker ended; what let go and the slow motion are this frame's, so a
   * stale latch from the ride before cannot be handed to it.
   */
  private logUnseenFall(frame: RideFrame, report: RideReport & { id: number }): RideResult | undefined {
    this.broke = frame.broke;
    this.slowest = frame.timeScale ?? 1;
    const { id: _, ...reading } = report;
    return this.finish('wipeout', FALL_REASONS[frame.separation ?? 'balance'], reading);
  }

  private begin(frame: RideFrame): void {
    this.riding = true;
    this.broke = frame.broke;
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
    if (seconds < MIN_RIDE_SECONDS && outcome !== 'wipeout') return undefined;
    // A fall is logged once for the rider's time off the board, whichever saw it first: the page's own `fallen`
    // frame, or the worker's report landing after it.
    if (outcome === 'wipeout') this.fallLogged = true;
    // Only a wipeout carries a fall: a ride that ended with the rider still up has nothing that let go, and the
    // runner's latch would otherwise hand it the fall that ended the ride before.
    const fall = outcome === 'wipeout' ? this.broke : undefined;
    return {
      outcome, reason, seconds,
      distance: report ? report.distance : this.distance,
      topSpeed: report ? report.topSpeed : this.topSpeed,
      ...(report ? { report } : {}),
      ...(fall ? { fall: { ...fall } } : {}),
      ...(this.slowest < 1 ? { timeScale: this.slowest } : {}),
    };
  }
}
