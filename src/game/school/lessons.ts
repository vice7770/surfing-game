import type { Action } from '../Bindings';
import type { HintId } from '../hints';
import type { ManeuverKind } from '../rideAnalysis';
import type { RideView } from '../../scene/SpectatorCamera';
import type { RIDER_PHASES } from '../../wave/SurfZoneRunner';
import type { LessonStart } from './lessonWave';

/** One frame of an attempt as the goals read it (spec L2): the rider, the player's input, and the wave under the board. */
export interface LessonFrame {
  /** Simulated seconds since the last frame. */
  dt: number;
  phase: (typeof RIDER_PHASES)[number];
  /** Over ground, m/s. */
  speed: number;
  /** Radians from +z toward +x. */
  heading: number;
  input: { steer: number; trim: number; crouch: number; hand: boolean; paddle: boolean };
  wave: { valid: boolean; faceFraction: number; crestBreaking: number; aheadOfCrest: number };
  /** The ride's latest manoeuvre, as the ride analysis reads it, and when in the ride it began, s. */
  live?: { kind: ManeuverKind; start: number };
}

/** How far a goal has got: a fraction, whether it passed, and what the prompt counts ("1 of 2", "3 of 5 s"). */
export interface GoalState {
  progress: number;
  passed: boolean;
  count?: { done: number; of: number; seconds?: boolean };
}

export interface LessonGoal {
  update(frame: LessonFrame): GoalState;
}

export type LessonId = 'lean' | 'trim' | 'crouch' | 'bottomTurn' | 'topTurn' | 'hand' | 'pocket' | 'popUp' | 'catch';

/** A lesson (spec L2): where it starts, the view, the controls it teaches, its goal, and the Surf hint it retires when passed. */
export interface Lesson {
  id: LessonId;
  start: LessonStart;
  view: RideView;
  actions: readonly Action[];
  goal(): LessonGoal;
  hint?: HintId;
}

// Provisional thresholds (spec L2): tuned on the reference wave once the riding work lands it.
/**
 * Lean: each way, the heading swings this far while that lean is held, rad. The
 * spec's 20° waits for the riding work's turn-rate fix: today a held lean turns
 * the board about 8° before the wave turns it back.
 */
const LEAN_SWING = (8 * Math.PI) / 180;
/** A lean or weight shift counts from this much input. */
const HELD = 0.3;
/** Trim: weight held this far forward (back) for TRIM_TIME s speeds (slows) the board by TRIM_SPEED m/s. */
const TRIM_INPUT = 0.5;
const TRIM_TIME = 1;
const TRIM_SPEED = 0.5;
/** Crouch: PUMPS crouches (deeper than CROUCH_DOWN, then back up past CROUCH_UP) within PUMP_WINDOW s, keeping the speed. */
const PUMPS = 3;
const CROUCH_DOWN = 0.6;
const CROUCH_UP = 0.2;
const PUMP_WINDOW = 8;
/** Hand: held HAND_TIME s while the board slows HAND_SLOW m/s and the curl closes in HAND_CLOSER m. */
const HAND_TIME = 1;
const HAND_SLOW = 1;
const HAND_CLOSER = 2;
/** Pocket: POCKET_TIME s in all, standing high on the face beside a breaking crest (the ride analysis' pocket). */
const POCKET_TIME = 5;
const POCKET_FACE = 0.4;
const POCKET_BREAKING = 0.3;
/** Pop-up and catch: on the feet this long without a break. */
const STAND_TIME = 2;

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Lean: a swing of LEAN_SWING each way, each while the lean that way is held. */
class LeanGoal implements LessonGoal {
  private readonly done = new Set<number>();
  private side = 0;
  private from = 0;

  update(frame: LessonFrame): GoalState {
    const side = frame.phase === 'standing' && Math.abs(frame.input.steer) >= HELD ? Math.sign(frame.input.steer) : 0;
    if (side !== this.side) {
      this.side = side;
      this.from = frame.heading;
    } else if (side !== 0 && Math.abs(wrap(frame.heading - this.from)) >= LEAN_SWING) {
      this.done.add(side);
    }
    return { progress: this.done.size / 2, passed: this.done.size === 2, count: { done: this.done.size, of: 2 } };
  }
}

/** Trim: forward weight speeds the board up, then back weight slows it. */
class TrimGoal implements LessonGoal {
  private stage = 0;
  private held = 0;
  private from = 0;

  update(frame: LessonFrame): GoalState {
    const wanted = this.stage === 0 ? 1 : -1;
    const holding = frame.phase === 'standing' && frame.input.trim * wanted >= TRIM_INPUT;
    if (!holding) {
      this.held = 0;
    } else {
      if (this.held === 0) this.from = frame.speed;
      this.held += frame.dt;
      if (this.held >= TRIM_TIME && (frame.speed - this.from) * wanted >= TRIM_SPEED) {
        this.stage += 1;
        this.held = 0;
      }
    }
    return { progress: this.stage / 2, passed: this.stage >= 2, count: { done: Math.min(2, this.stage), of: 2 } };
  }
}

/** Crouch: pumps (a crouch, then standing tall again) that keep the board's speed. */
class CrouchGoal implements LessonGoal {
  private pumps = 0;
  private low = false;
  private since = 0;
  private startSpeed = 0;
  private passed = false;

  update(frame: LessonFrame): GoalState {
    if (!this.passed && frame.phase === 'standing') {
      this.since += frame.dt;
      if (this.pumps > 0 && this.since > PUMP_WINDOW) this.pumps = 0;
      if (!this.low && frame.input.crouch >= CROUCH_DOWN) {
        this.low = true;
        if (this.pumps === 0) {
          this.since = 0;
          this.startSpeed = frame.speed;
        }
      } else if (this.low && frame.input.crouch <= CROUCH_UP) {
        this.low = false;
        this.pumps += 1;
        if (this.pumps >= PUMPS) {
          if (frame.speed >= this.startSpeed) this.passed = true;
          else this.pumps = 0;
        }
      }
    }
    return { progress: this.passed ? 1 : this.pumps / PUMPS, passed: this.passed, count: { done: this.passed ? PUMPS : this.pumps, of: PUMPS } };
  }
}

/** A turn the ride analysis names: bottom turn, or top turn (a snap counts). */
class TurnGoal implements LessonGoal {
  private passed = false;

  constructor(private readonly kinds: readonly ManeuverKind[]) {}

  update(frame: LessonFrame): GoalState {
    if (frame.live && this.kinds.includes(frame.live.kind)) this.passed = true;
    return { progress: this.passed ? 1 : 0, passed: this.passed };
  }
}

/** Hand: in the face long enough to slow the board and let the curl catch up. */
class HandGoal implements LessonGoal {
  private held = 0;
  private speed = 0;
  private ahead = 0;
  private passed = false;

  update(frame: LessonFrame): GoalState {
    const holding = frame.phase === 'standing' && frame.input.hand && frame.wave.valid;
    if (!holding) {
      this.held = 0;
    } else if (!this.passed) {
      if (this.held === 0) {
        this.speed = frame.speed;
        this.ahead = frame.wave.aheadOfCrest;
      }
      this.held += frame.dt;
      if (this.held >= HAND_TIME && this.speed - frame.speed >= HAND_SLOW && this.ahead - frame.wave.aheadOfCrest >= HAND_CLOSER) this.passed = true;
    }
    return { progress: this.passed ? 1 : Math.min(0.99, this.held / HAND_TIME), passed: this.passed };
  }
}

/** Pocket: time high on the face beside the breaking crest, in all. */
class PocketGoal implements LessonGoal {
  private time = 0;

  update(frame: LessonFrame): GoalState {
    const { wave } = frame;
    if (frame.phase === 'standing' && wave.valid && wave.faceFraction >= POCKET_FACE && wave.crestBreaking >= POCKET_BREAKING) this.time += frame.dt;
    const passed = this.time >= POCKET_TIME - 1e-9;
    return { progress: Math.min(1, this.time / POCKET_TIME), passed, count: { done: Math.min(POCKET_TIME, Math.floor(this.time)), of: POCKET_TIME, seconds: true } };
  }
}

/** Pop-up and catch: on the feet for STAND_TIME s at a stretch. */
class StandGoal implements LessonGoal {
  private time = 0;
  private passed = false;

  update(frame: LessonFrame): GoalState {
    this.time = frame.phase === 'standing' ? this.time + frame.dt : 0;
    if (this.time >= STAND_TIME - 1e-9) this.passed = true;
    return { progress: this.passed ? 1 : Math.min(0.99, this.time / STAND_TIME), passed: this.passed };
  }
}

const steer: readonly Action[] = ['steerLeft', 'steerRight'];

/** The nine lessons, in teaching order (spec L2). */
export const LESSONS: readonly Lesson[] = [
  { id: 'lean', start: 'pocket', view: 'behind', actions: steer, goal: () => new LeanGoal(), hint: 'lean' },
  { id: 'trim', start: 'pocket', view: 'side', actions: ['trimForward', 'trimBack'], goal: () => new TrimGoal(), hint: 'trim' },
  { id: 'crouch', start: 'pocket', view: 'side', actions: ['crouch'], goal: () => new CrouchGoal(), hint: 'crouch' },
  { id: 'bottomTurn', start: 'pocket', view: 'front', actions: [...steer, 'crouch'], goal: () => new TurnGoal(['bottom turn']) },
  { id: 'topTurn', start: 'pocket', view: 'front', actions: [...steer, 'trimBack'], goal: () => new TurnGoal(['top turn', 'snap']) },
  { id: 'hand', start: 'pocket', view: 'behind', actions: ['hand'], goal: () => new HandGoal(), hint: 'hand' },
  { id: 'pocket', start: 'pocket', view: 'behind', actions: ['trimForward', 'trimBack', ...steer], goal: () => new PocketGoal() },
  { id: 'popUp', start: 'caught', view: 'front', actions: ['popUp'], goal: () => new StandGoal() },
  { id: 'catch', start: 'waiting', view: 'front', actions: ['paddle', 'popUp'], goal: () => new StandGoal() },
];

export function lessonById(id: LessonId): Lesson {
  const lesson = LESSONS.find((candidate) => candidate.id === id);
  if (!lesson) throw new Error(`No lesson ${id}`);
  return lesson;
}
