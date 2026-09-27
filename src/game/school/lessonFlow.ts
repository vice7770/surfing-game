import type { RiderSeparation } from '../../physics/AttachedRider';
import type { StringKey } from '../../ui/strings';
import type { RideEnd } from '../rideAnalysis';
import { FALL_REASONS, WORKER_REASONS } from '../RideTracker';
import type { GoalState, Lesson, LessonFrame, LessonGoal } from './lessons';
import type { LessonStart } from './lessonWave';

/** Where a lesson is (spec L2): its explanation card, an attempt, passed, or just missed (the wave restarts shortly). */
export type FlowState = 'card' | 'attempt' | 'passed' | 'missed';

/** A frame of the attempt with what ends a ride: the fall's cause, and the ride analysis' latest finished ride. */
export interface FlowFrame extends LessonFrame {
  separation?: RiderSeparation;
  report?: { id: number; end: RideEnd };
}

/** How long an attempt may run from each start, s; Free Practice rides longer from the pocket. */
const TIME_LIMIT: Record<LessonStart, number> = { pocket: 25, caught: 12, waiting: 15 };
const FREE_POCKET_LIMIT = 40;
/** A missed attempt restarts on the same wave after this long, s. */
const RESTART_AFTER = 2;
/** Misses in a row before the explanation comes back. */
const MISSES_BEFORE_CARD = 3;

/**
 * One lesson's run of attempts (spec L2), or Free Practice's (no lesson, no goal):
 * the card, then attempts that pass on the goal or miss on a fall, a ride the
 * analysis ends, or the time limit; a miss restarts after two seconds, and three
 * in a row bring the card back.
 */
export class LessonFlow {
  state: FlowState = 'card';
  misses = 0;
  goal: GoalState = { progress: 0, passed: false };
  cause?: StringKey;
  private tracker?: LessonGoal;
  private time = 0;
  private missedFor = 0;
  /** The ride analysis' report id when the attempt began; a newer one ended the ride. */
  private seenReport?: number;
  private readonly limit: number;
  /** Whether the rider has stood in this attempt: in Free Practice a ride after the catch runs to FREE_POCKET_LIMIT. */
  private stood = false;

  /** `start`: Free Practice's start (a lesson has its own). */
  constructor(readonly lesson: Lesson | undefined, options: { start?: LessonStart } = {}) {
    const start = lesson?.start ?? options.start ?? 'pocket';
    this.limit = !lesson && start === 'pocket' ? FREE_POCKET_LIMIT : TIME_LIMIT[start];
  }

  /** A new attempt from the card, a restart or R: a fresh goal. */
  start(): void {
    this.state = 'attempt';
    this.tracker = this.lesson?.goal();
    this.goal = { progress: 0, passed: false };
    this.time = 0;
    this.missedFor = 0;
    this.cause = undefined;
    this.seenReport = undefined;
    this.stood = false;
  }

  frame(frame: FlowFrame): void {
    if (this.state !== 'attempt') return;
    this.time += frame.dt;
    if (frame.phase === 'standing') this.stood = true;
    if (this.tracker) this.goal = this.tracker.update(frame);
    if (this.goal.passed) {
      this.state = 'passed';
      this.misses = 0;
      return;
    }
    const reportId = frame.report?.id ?? -1;
    if (this.seenReport === undefined) this.seenReport = reportId;
    if (frame.phase === 'fallen') this.miss(FALL_REASONS[frame.separation ?? 'balance']);
    else if (frame.report && reportId !== this.seenReport) this.miss(frame.report.end === 'fell' ? FALL_REASONS[frame.separation ?? 'balance'] : WORKER_REASONS[frame.report.end]);
    else if (this.time >= (!this.lesson && this.stood ? Math.max(this.limit, FREE_POCKET_LIMIT) : this.limit)) this.miss('school.miss.time');
  }

  /** While missed: after RESTART_AFTER s, 'restart' (the same wave again), or 'card' after too many misses in a row. */
  tick(seconds: number): 'restart' | 'card' | undefined {
    if (this.state !== 'missed') return undefined;
    this.missedFor += seconds;
    if (this.missedFor < RESTART_AFTER) return undefined;
    if (this.lesson && this.misses >= MISSES_BEFORE_CARD) {
      this.misses = 0;
      this.state = 'card';
      return 'card';
    }
    return 'restart';
  }

  /** R: restart now, during an attempt or after a miss; false on a card or after passing. */
  retry(): boolean {
    return this.state === 'attempt' || this.state === 'missed';
  }

  showCard(): void {
    this.state = 'card';
  }

  private miss(cause: StringKey): void {
    this.state = 'missed';
    this.cause = cause;
    this.missedFor = 0;
    if (this.lesson) this.misses += 1;
  }
}
