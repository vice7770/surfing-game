/**
 * Jev's answers into the game's controls. A decision sets a plan (paddle or
 * wait, which way to point, stand up, which line to ride, where the weight
 * goes); the motor holds that plan and turns it into a `RideRequest` every step,
 * steering onto the planned heading the way a player's thumb would. Presses (the
 * pop-up, a fresh start) count once. The motor never adds a decision of its own:
 * an answer that did not come back keeps the last plan, and is counted.
 */
import type { RideRequest } from '../../wave/SurfZoneRunner';
import type { WaveFrame } from '../../physics/waveFrame';
import { chosen, type Verdict } from './answers';
import { wrap, type Observation, type Phase } from './observe';

const DEG = Math.PI / 180;
/** Lying down, "angled toward the open face" is this far from the wave's travel (the dev autopilot's take-off angle). */
const TAKEOFF_ANGLE = 35 * DEG;
/** Standing, each line's angle from the wave's travel toward the open face. */
export const LINE_ANGLES = { straight: 0, drop: 25 * DEG, along: 60 * DEG, climb: 100 * DEG } as const;
export type Line = keyof typeof LINE_ANGLES;
/**
 * The heading's error per full stroke lying down and per full lean standing, rad, and the yaw rate's damping, s (lying
 * down, the dev autopilot's gains). Standing, a full lean loads the rail and drains the balance, and with nothing held
 * the rider holds its own line, so the lean comes in gentler: full only past about 35° off the line.
 */
const HEADING_GAIN = 0.35;
const STANDING_GAIN = 0.6;
const YAW_DAMPING = 0.25;
/** Weight forward and back, of the trim's −1 to 1. */
const TRIM = 0.6;
/**
 * A thumb, not a switch: the heading aimed at and the weight follow the plan with these time constants, s, so a plan
 * that changes between looks blends in over a few tenths of a second instead of throwing the lean from one rail to
 * the other.
 */
const AIM_TIME = 0.25;
const TRIM_TIME = 0.2;
/** Pumping: crouch, then extend, each half of this period, s, at this depth; crouched low, this deep (the dev autopilot's turn crouch). */
const PUMP_PERIOD = 0.8;
const PUMP_CROUCH = 0.7;
const LOW_CROUCH = 0.6;
export type Stance = 'low' | 'tall' | 'pump';

export interface Plan {
  phase: Phase;
  paddle: boolean;
  aim: 'open' | 'beach';
  pop: boolean;
  reset: boolean;
  line: Line;
  trim: number;
  stance: Stance;
  swim: boolean;
  open: number;
  travel: number;
  /** Questions asked but not answered, whose last value was kept. */
  missing: string[];
}

export const IDLE_PLAN: Plan = {
  phase: 'prone', paddle: false, aim: 'beach', pop: false, reset: false, line: 'along', trim: 0, stance: 'low', swim: false, open: 0, travel: 0, missing: [],
};

/** What the motor reads every step: cheap, live values from the surf zone. */
export interface Live {
  phase: Phase;
  heading: number;
  wave: WaveFrame;
  boardInReach: boolean;
}

export interface MotorOptions {
  /** Send the game's pocket reflex with every request, as the game does for a player (on the Practice swell by default). */
  pocketReflex?: boolean;
}

export class Motor {
  /** Answers missing from a decision (an error, or a question dropped), and presses made. */
  missing = 0;
  pops = 0;
  resets = 0;
  private lastHeading = Number.NaN;
  private clock = 0;
  /** The heading aimed at and the weight, as the thumb holds them now; NaN until set. */
  private aim = Number.NaN;
  private trim = 0;
  private aimPhase?: Phase;
  private pressed = { pop: false, reset: false };

  constructor(private readonly options: MotorOptions = {}) {}

  /** The plan a decision sets: its answers, with the previous plan's values where an answer is missing. */
  plan(verdict: Verdict, obs: Observation, previous: Plan, asked: readonly string[]): Plan {
    const missing = asked.filter((id) => !(id in verdict.answers));
    this.missing += missing.length;
    this.pressed = { pop: false, reset: false };
    const plan: Plan = { ...previous, phase: obs.phase, open: obs.open, travel: obs.travel, pop: false, reset: false, missing };
    switch (obs.phase) {
      case 'prone':
      case 'recover': {
        const paddle = chosen(verdict, 'paddle', previous.paddle ? 'go' : 'wait');
        plan.paddle = paddle === 'go';
        plan.reset = paddle === 'reset';
        plan.aim = chosen(verdict, 'aim', previous.aim) === 'open' ? 'open' : 'beach';
        plan.pop = chosen(verdict, 'pop', 'wait') === 'stand';
        if (plan.pop) plan.paddle = false;
        break;
      }
      case 'push':
      case 'landing':
      case 'standing': {
        const line = chosen(verdict, 'line', previous.line);
        plan.reset = line === 'out';
        if (line in LINE_ANGLES) plan.line = line as Line;
        const weight = chosen(verdict, 'weight', previous.trim > 0 ? 'forward' : previous.trim < 0 ? 'back' : 'centre');
        plan.trim = weight === 'forward' ? TRIM : weight === 'back' ? -TRIM : 0;
        const stance = chosen(verdict, 'stance', previous.stance);
        if (stance === 'low' || stance === 'tall' || stance === 'pump') plan.stance = stance;
        break;
      }
      case 'fallen': {
        const recover = chosen(verdict, 'recover', previous.swim ? 'board' : 'out');
        plan.swim = recover === 'board';
        plan.reset = recover === 'out';
        break;
      }
    }
    return plan;
  }

  /** One step's controls from the plan and the live surf zone. */
  act(plan: Plan, live: Live, dt: number): RideRequest {
    this.clock += dt;
    const yawRate = Number.isFinite(this.lastHeading) && dt > 0 ? wrap(live.heading - this.lastHeading) / dt : 0;
    this.lastHeading = live.heading;
    const travel = live.wave.valid ? Math.atan2(live.wave.directionX, live.wave.directionZ) : plan.travel;
    const request: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false, ...(this.options.pocketReflex ? { pocketReflex: true } : {}) };
    if (plan.reset && !this.pressed.reset) {
      this.pressed.reset = true;
      this.resets += 1;
      request.retry = true;
      return request;
    }
    // The plan was made for the phase of its decision; the next decision follows a change of phase.
    switch (live.phase) {
      case 'prone':
      case 'recover': {
        if (plan.phase !== 'prone' && plan.phase !== 'recover') return request;
        request.paddle = plan.paddle;
        const target = plan.aim === 'open' && plan.open !== 0 ? travel + plan.open * TAKEOFF_ANGLE : travel;
        request.steer = steerOnto(this.follow(target, live, dt), live.heading, yawRate);
        if (plan.pop && !this.pressed.pop) {
          this.pressed.pop = true;
          this.pops += 1;
          request.popUp = true;
        }
        break;
      }
      case 'push':
      case 'landing':
        // Getting to the feet, hands off: the dev autopilot steers nothing until the rider stands.
        break;
      case 'standing': {
        // The stance and the weight may come from a look taken while popping up; the line only from one taken
        // standing. Until that lands (a reaction after the feet are down) the hands stay off and the rider holds its
        // own line, as a player does in the instant of landing.
        const standingPlan = plan.phase === 'push' || plan.phase === 'landing' || plan.phase === 'standing';
        const open = plan.open !== 0 ? plan.open : Math.sign(wrap(live.heading - travel)) || 1;
        const aim = this.follow(travel + open * LINE_ANGLES[plan.line], live, dt);
        if (plan.phase === 'standing') request.steer = steerOnto(aim, live.heading, yawRate, STANDING_GAIN);
        this.trim += ((standingPlan ? plan.trim : 0) - this.trim) * (1 - Math.exp(-dt / TRIM_TIME));
        if (standingPlan) {
          request.trim = Math.abs(this.trim) < 0.02 ? 0 : this.trim;
          request.crouch = plan.stance === 'low' ? LOW_CROUCH
            : plan.stance === 'pump' && (this.clock % PUMP_PERIOD) < PUMP_PERIOD / 2 ? PUMP_CROUCH : 0;
        }
        break;
      }
      case 'fallen':
        if (plan.phase === 'fallen' && plan.swim) request.reel = true;
        break;
    }
    return request;
  }

  /** The heading aimed at, eased toward `target`; it starts from the board's own heading at each change of phase. */
  private follow(target: number, live: Live, dt: number): number {
    if (!Number.isFinite(this.aim) || this.aimPhase !== live.phase) {
      this.aim = live.heading;
      this.trim = 0;
    }
    this.aimPhase = live.phase;
    this.aim += wrap(target - this.aim) * (1 - Math.exp(-dt / AIM_TIME));
    return this.aim;
  }
}

/** The lean (or, lying down, the stroke) that turns the heading onto `target`, damped by the yaw rate. */
export function steerOnto(target: number, heading: number, yawRate: number, gain = HEADING_GAIN): number {
  return Math.max(-1, Math.min(1, wrap(target - heading) / gain - YAW_DAMPING * yawRate));
}
