import type { RideInput } from '../physics/RideSession';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';

/** What the autopilot sees each step: the ride's status, the peel, the board and the water behind it. */
export interface AutopilotView {
  ride: NonNullable<SurfZoneStatus['ride']>;
  /** +1 when the break peels toward +x, −1 toward −x, 0 for a close-out. */
  peelDirection: number;
  /** The board's position and heading (radians from +z toward +x). */
  board: { x: number; z: number; heading: number };
  /** The break line, z. */
  focusZ: number;
  /** The highest surface within 14 m seaward of the board, m above still water (tide removed). */
  crestBehind: number;
}

export interface AutopilotOptions {
  /** Where to wait, m outside the break line (the catch report's riders stood from 4–8 m out). */
  waitOutside?: number;
  /** A crest this high behind the board starts a paddle, m. */
  rise?: number;
  /** The riding line, degrees from the wave's travel toward the peel. */
  lineDegrees?: number;
  /** Seconds of paddling without a cue before giving up. */
  giveUp?: number;
  /** Standing: hold a line along the face ('line'), or ride S-turns up and down it ('turns', spec P9). */
  style?: 'line' | 'turns';
}

export type AutopilotState = 'position' | 'wait' | 'go' | 'ride' | 'done';
type Turn = 'bottom' | 'top' | 'cutback';

/** Standing, how far the heading error and yaw rate turn the lean: rad per full lean, and s of yaw rate. */
const HEADING_GAIN = 0.35;
const YAW_DAMPING = 0.25;
/** The face band the line keeps, and how far it turns the line to get back in it, degrees. */
const FACE_LOW = 0.35;
const FACE_HIGH = 0.75;
const FACE_TURN = 15;
/** Standing, the ride is over below this speed over ground, m/s, for this long, s. */
const STALL = 1.5;
const STALL_TIME = 1;
/**
 * S-turns, by the angle from the fall line toward the peel (0 down the face,
 * 90° along it, 180° up it): a bottom turn starts low on the face heading down
 * and ends heading up it; a top turn starts high heading along or up and ends
 * heading down; a cutback starts far out on the shoulder and ends heading back
 * toward the peel's source. No turn is held longer than TURN_LIMIT, s.
 */
const DEG = Math.PI / 180;
const BOTTOM_FACE = 0.35;
const BOTTOM_START = 90 * DEG;
const BOTTOM_END = 120 * DEG;
const TOP_FACE = 0.7;
const TOP_START = 60 * DEG;
const TOP_END = 30 * DEG;
const SHOULDER = 8;
const CUTBACK_END = -30 * DEG;
const TURN_LIMIT = 1.5;
/** A snap: the crest breaking this strongly within 4 m. */
const SNAP_BREAKING = 0.3;
/** Turning, the crouch and the weight back; the bottom turn extends past EXTEND_FROM (P9 Task 8: extend where the load is high). */
const TURN_CROUCH = 0.6;
const EXTEND_FROM = 60 * DEG;
const TOP_TRIM = -0.5;
const SNAP_TRIM = -1;

/**
 * A dev autopilot for the recorder and the ride report (spec P9 phase 0). It
 * paddles in to wait outside the break line, goes when a crest rises behind,
 * pops up on the cue, and standing holds a line along the face toward the peel,
 * turning up when low on the face and down when high, or (style 'turns') rides
 * S-turns up and down the face with a pump between them. It only produces a
 * `RideInput`, like a player.
 */
export class Autopilot {
  state: AutopilotState = 'position';
  /** Why the latest attempt ended. */
  outcome?: string;
  attempts = 0;
  /** Seconds standing in the attempt under way. */
  rideTime = 0;
  private readonly waitOutside: number;
  private readonly rise: number;
  private readonly line: number;
  private readonly giveUp: number;
  private clock = 0;
  private stalled = 0;
  private popped = false;
  private lastHeading = Number.NaN;
  private travel = 0;
  private readonly style: 'line' | 'turns';
  /** The turn under way and how long it has been held, and a turn given up that waits for its trigger to clear. */
  private turn?: Turn;
  private turnTime = 0;
  private blocked?: Turn;

  constructor(options: AutopilotOptions = {}) {
    this.waitOutside = options.waitOutside ?? 5;
    this.rise = options.rise ?? 0.5;
    this.line = ((options.lineDegrees ?? 60) * Math.PI) / 180;
    this.giveUp = options.giveUp ?? 8;
    this.style = options.style ?? 'line';
  }

  reset(): void {
    this.state = 'position';
    this.outcome = undefined;
    this.rideTime = 0;
    this.lastHeading = Number.NaN;
    this.turn = undefined;
    this.blocked = undefined;
  }

  next(view: AutopilotView, dt: number): RideInput {
    const input: RideInput = { paddle: false, popUp: false, steer: 0 };
    const { ride } = view;
    const heading = view.board.heading;
    const yawRate = Number.isFinite(this.lastHeading) && dt > 0 ? wrap(heading - this.lastHeading) / dt : 0;
    this.lastHeading = heading;
    if (ride.wave.valid) this.travel = Math.atan2(ride.wave.directionX, ride.wave.directionZ);
    switch (this.state) {
      case 'position':
        if (ride.phase === 'prone' && view.focusZ - view.board.z > this.waitOutside) input.paddle = true;
        else this.state = 'wait';
        break;
      case 'wait':
        if (view.crestBehind > this.rise) {
          this.state = 'go';
          this.attempts += 1;
          this.clock = 0;
          this.popped = false;
          this.rideTime = 0;
          this.stalled = 0;
          return this.next(view, 0);
        }
        break;
      case 'go':
        this.clock += dt;
        if (ride.phase === 'fallen' || ride.phase === 'recover') {
          this.end(ride.separation ? `fell · ${ride.separation}` : 'no stand');
        } else if (ride.phase === 'prone') {
          if (ride.cue && !this.popped) {
            input.popUp = true;
            this.popped = true;
          } else if (this.clock > this.giveUp) {
            this.end('missed the wave');
          } else {
            input.paddle = true;
          }
        } else if (ride.phase === 'standing') {
          this.state = 'ride';
        }
        break;
      case 'ride': {
        if (ride.phase === 'fallen') {
          this.end(`fell · ${ride.separation ?? 'balance'}`);
          break;
        }
        this.rideTime += dt;
        this.stalled = ride.speed < STALL ? this.stalled + dt : 0;
        if (this.stalled > STALL_TIME) {
          this.end('the wave left');
          break;
        }
        if (this.style === 'turns' && view.peelDirection !== 0) Object.assign(input, this.turns(view, heading, dt));
        else input.steer = this.steer(view, heading, yawRate);
        break;
      }
      case 'done':
        break;
    }
    return input;
  }

  /** The lean that brings the heading onto the line: the travel direction turned toward the peel, opened when low on the face and closed when high. */
  private steer(view: AutopilotView, heading: number, yawRate: number): number {
    const { wave } = view.ride;
    let target = this.travel;
    if (view.peelDirection !== 0) {
      let line = this.line;
      if (wave.valid && wave.faceFraction < FACE_LOW) line += (FACE_TURN * Math.PI) / 180;
      else if (wave.valid && wave.faceFraction > FACE_HIGH) line -= (FACE_TURN * Math.PI) / 180;
      target += Math.sign(view.peelDirection) * line;
    }
    return Math.max(-1, Math.min(1, wrap(target - heading) / HEADING_GAIN - YAW_DAMPING * yawRate));
  }

  /** S-turns: the turn the face calls for, held to its end, and the pump between them. */
  private turns(view: AutopilotView, heading: number, dt: number): Pick<RideInput, 'steer' | 'trim' | 'crouch'> {
    const { wave } = view.ride;
    const peel = Math.sign(view.peelDirection);
    const angle = peel * wrap(heading - this.travel);
    if (this.turn) {
      this.turnTime += dt;
      const done = this.turn === 'bottom' ? angle > BOTTOM_END : this.turn === 'top' ? angle < TOP_END : angle < CUTBACK_END;
      if (!done && this.turnTime > TURN_LIMIT) this.blocked = this.turn;
      if (done || this.turnTime > TURN_LIMIT) this.turn = undefined;
    }
    if (!this.turn && wave.valid) {
      const wanted: Turn | undefined = wave.aheadOfCrest > SHOULDER && angle > TOP_END ? 'cutback'
        : wave.faceFraction > TOP_FACE && angle > TOP_START ? 'top'
          : wave.faceFraction < BOTTOM_FACE && angle < BOTTOM_START ? 'bottom' : undefined;
      if (wanted !== this.blocked) {
        this.turn = wanted;
        this.turnTime = 0;
      }
      if (wanted === undefined) this.blocked = undefined;
    }
    switch (this.turn) {
      case 'bottom':
        return { steer: peel, trim: 0, crouch: angle < EXTEND_FROM ? TURN_CROUCH : 0 };
      case 'top':
      case 'cutback':
        return { steer: -peel, trim: wave.crestBreaking > SNAP_BREAKING ? SNAP_TRIM : TOP_TRIM, crouch: TURN_CROUCH };
      default:
        // Between turns: crouched heading down into the next bottom turn, extended climbing.
        return { steer: 0, trim: 0, crouch: angle < BOTTOM_START ? TURN_CROUCH : 0 };
    }
  }

  private end(outcome: string): void {
    this.state = 'done';
    this.outcome = outcome;
  }
}

function wrap(angle: number): number {
  return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
}
