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
}

export type AutopilotState = 'position' | 'wait' | 'go' | 'ride' | 'done';

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
 * A dev autopilot for the recorder and the ride report (spec P9 phase 0). It
 * paddles in to wait outside the break line, goes when a crest rises behind,
 * pops up on the cue, and standing holds a line along the face toward the peel,
 * turning up when low on the face and down when high. It only produces a
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

  constructor(options: AutopilotOptions = {}) {
    this.waitOutside = options.waitOutside ?? 5;
    this.rise = options.rise ?? 0.5;
    this.line = ((options.lineDegrees ?? 60) * Math.PI) / 180;
    this.giveUp = options.giveUp ?? 8;
  }

  reset(): void {
    this.state = 'position';
    this.outcome = undefined;
    this.rideTime = 0;
    this.lastHeading = Number.NaN;
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
        input.steer = this.steer(view, heading, yawRate);
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

  private end(outcome: string): void {
    this.state = 'done';
    this.outcome = outcome;
  }
}

function wrap(angle: number): number {
  return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
}
