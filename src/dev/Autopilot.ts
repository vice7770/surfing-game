import type { SurfZoneHost } from '../game/SurfZoneHost';
import type { RideInput } from '../physics/RideSession';
import { RIDER_SNAPSHOT, type SurfZoneStatus } from '../wave/SurfZoneRunner';

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

/**
 * The autopilot's view of a running surf zone with a rider (the recorder and `?demo`):
 * the ride's status, the peel, the board, and the highest water within `look` m
 * seaward of the board, tide removed. None without a rider.
 */
export function autopilotView(host: SurfZoneHost, focusZ: number, tide: number, look = 14): AutopilotView | undefined {
  const { status, board, rider } = host.snapshot;
  if (!status.ride) return undefined;
  let crest = -Infinity;
  for (let back = 2; back <= look; back += 2) crest = Math.max(crest, host.heightAt(board[0], board[2] - back));
  return {
    ride: status.ride,
    peelDirection: status.peel?.direction ?? 0,
    board: { x: board[0], z: board[2], heading: rider[RIDER_SNAPSHOT.heading] },
    focusZ,
    crestBehind: crest - tide,
  };
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
  /**
   * Standing: hold a line along the face ('line'), ride S-turns up and down it ('turns', spec P9), or ride the user's
   * movement flow ('flow', the movement-flow spec): bottom turn, projection, cutback, rebound.
   */
  style?: 'line' | 'turns' | 'flow';
  /** Standing, end the ride when the board crawls (STALL for STALL_TIME); false leaves the end to the caller's ride analyzer. */
  stall?: boolean;
  /** Riding S-turns, the longest a turn is held, s (TURN_LIMIT by default). */
  turnLimit?: number;
  /** Riding S-turns, the height on the face below which a bottom turn starts (BOTTOM_FACE by default). */
  bottomFace?: number;
  /** Riding the flow, how far ahead of the curl a cutback starts, m (CUTBACK_REACH by default). */
  cutbackReach?: number;
  /** Riding the flow, the phase it starts in once standing ('drop' by default; the probe's isolated cutback starts in 'cutback'). */
  flowFrom?: FlowPhase;
  /** Riding the flow, the heading from the fall line where the bottom turn is released, degrees (FLOW_BOTTOM_END by default). */
  bottomEnd?: number;
}

export type AutopilotState = 'position' | 'wait' | 'go' | 'ride' | 'done';
type Turn = 'bottom' | 'top' | 'cutback';
/** The movement flow's phases (style 'flow'): the rebound is the bottom turn off the foam after a cutback. */
export type FlowPhase = 'drop' | 'bottom' | 'project' | 'trim' | 'cutback' | 'rebound';

/** A phase of the flow the autopilot rode, for the probe's log: when, how long, how far it turned, and the wave in and out. */
export interface FlowRecord {
  phase: FlowPhase;
  /** Seconds into the ride it began, and how long it lasted. */
  at: number;
  seconds: number;
  /** The heading turned, degrees, positive toward the open face (a cutback's are negative). */
  degrees: number;
  /** Speed over ground in and out, m/s; height on the face in and out (0 trough, 1 crest); metres along the crest to the curl in and out (Infinity: none within the gauge's reach). */
  speedIn: number;
  speedOut: number;
  faceIn: number;
  faceOut: number;
  curlIn: number;
  curlOut: number;
  /** It reached its end (not given up at its limit, nor ended by a fall or the wave leaving). */
  completed: boolean;
}

/** A turn the autopilot rode (style 'turns'), for the recorder's log: when, how far, how long, and the speed it kept. */
export interface TurnRecord {
  kind: Turn;
  /** Seconds into the ride it began. */
  at: number;
  seconds: number;
  /** The heading turned, degrees. */
  degrees: number;
  speedIn: number;
  speedOut: number;
  /** It reached its end (not given up at TURN_LIMIT, nor ended by a fall). */
  completed: boolean;
}

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
/**
 * The take-off is angled this far from the wave's travel toward the open face,
 * and a bottom turn starts no further ahead of the crest than BOTTOM_REACH, m
 * (riding-the-wave Task 7: straight down a 1.3 m face the rider stood 8 m ahead
 * of the crest, on the flat, where a full bottom turn bled its speed and it fell).
 */
const TAKEOFF_ANGLE = 35 * DEG;
const BOTTOM_REACH = 6;
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
/**
 * Turning, the crouch and the weight back; the bottom turn compresses over the crouch at its base and extends past
 * EXTEND_FROM (P9 Task 8: extend where the load is high; the stances spec's sequence).
 */
const TURN_CROUCH = 0.6;
const EXTEND_FROM = 60 * DEG;
const TOP_TRIM = -0.5;
const SNAP_TRIM = -1;
/**
 * The movement flow (style 'flow', the user's notes in the movement-flow spec), by the same angle from the fall line
 * toward the open face (negative toward the curl):
 * - drop: crouched down the face from the pop-up, until below FLOW_BOTTOM_FACE of it, out on the flat
 *   (BOTTOM_REACH) or after FLOW_DROP_LIMIT, s;
 * - bottom turn: Compress with a little weight on the front foot (FLOW_DRIVE), leaning toward the open face, until
 *   the heading is FLOW_BOTTOM_END from the fall line. The body's lean carries the heading on after the release, to
 *   about 55° (the pool flow probe). With the feet holding the board neutral through the extension, released at 45°
 *   the body was still banked 29–30° on a 38–40° rail, the board carved on at 2.6–3.1 rad/s under 2.3–2.5 body
 *   weights and kept 0.59–0.73 of its speed through the water, coming out along the face at 4.5–5.5 m/s; released at
 *   25°, banked 18–19° on a 23° rail, it kept 0.85–0.86 and came out at 6.3 m/s. Released at 85° the heading went on
 *   to 95–122°, up the face, with the rail at its 48° bite and the body still banked 33° into the turn; held to 110°
 *   the turn ended at 2.6–3.7 m/s, off the plane;
 * - projection: Compress released, tall and centred, holding that heading up the face, until the body has come back
 *   within FLOW_UPRIGHT of upright (the cutback changes rails from there), the board is above FLOW_TOP_FACE of the
 *   face (its top), or after FLOW_PROJECT_LIMIT, s. Begun while the body was still banked 11–41° into the bottom
 *   turn (once the projection's speed had faded 15%), every cutback on the pool fell in 0.2 s or carved on up the
 *   face to a stall;
 * - trim: along the face on the riding line, pumping (crouched while the face fraction falls, extended while it
 *   rises: the extension meets the load at the foot of each dip), until CUTBACK_REACH ahead of the curl; low on the
 *   face heading down, another bottom turn;
 * - cutback: heading along the face or up it (past FLOW_CUTBACK_FROM), Compress with the weight on the back foot
 *   (FLOW_CUTBACK_TRIM), leaning and looking back toward the curl (the rotation stick), until the heading is
 *   FLOW_CUTBACK_END past the fall line toward the curl, back down the face, or has come round FLOW_CUTBACK_TURN.
 *   The weight is the coaching's 65/35 onto the back foot (at rest; Rapture's cutback, 65/35 to 70/30): full back,
 *   82/18 at rest, sank the tail of a board doing 4.5–6 m/s through the water to a 19–26° trim, where the
 *   tail-loaded hull planes (Savitsky), and its drag took every cutback on the pool off the plane. Carried on round
 *   160°, the turns ended heading back toward the curl at 3.6–5 m/s, still banked 25–48°, and the rebound's rail
 *   change from there fell within a second;
 * - rebound: the bottom turn again, off the foam, then the projection.
 * No turn is held longer than FLOW_TURN_LIMIT, s.
 *
 * CUTBACK_REACH: the pool's curl runs along the crest at about 6.5–10 m/s (the pool probe and the bed sweep: Hutt's
 * V_s = C_b / sin α). A cutback is a U-turn, which leaves the rider about where it began along the crest, and takes
 * about 1.5 s, while the curl closes 10–15 m: begun 10 m ahead, the cutback comes round as the foam arrives, and the
 * rebound is off it, as the user describes. Nearer, the foam takes the rider mid-turn; further, it runs back to it
 * slowing.
 */
const FLOW_BOTTOM_FACE = 0.4;
const FLOW_DROP_LIMIT = 1.5;
const FLOW_DRIVE = 0.3;
const FLOW_BOTTOM_END = 25 * DEG;
const FLOW_TOP_FACE = 0.65;
const FLOW_PROJECT_LIMIT = 1;
const FLOW_UPRIGHT = 12 * DEG;
const FLOW_CUTBACK_FROM = 45 * DEG;
const FLOW_CUTBACK_TURN = 160 * DEG;
const FLOW_CUTBACK_END = 30 * DEG;
const FLOW_CUTBACK_TRIM = -0.5;
const FLOW_TURN_LIMIT = 3;
const CUTBACK_REACH = 10;
/** Pumping, the face fraction's rate is smoothed over this, s: a falling or rising face, not the board's chatter. */
const PUMP_SMOOTHING = 0.15;

/**
 * A dev autopilot for the recorder and the ride report (spec P9 phase 0). It
 * paddles in to wait outside the break line, goes when a crest rises behind,
 * pops up on the cue, and standing holds a line along the face toward the peel,
 * turning up when low on the face and down when high, or (style 'turns') rides
 * S-turns up and down the face with a pump between them, or (style 'flow') rides
 * the movement flow. It only produces a `RideInput`, like a player.
 */
export class Autopilot {
  state: AutopilotState = 'position';
  /** Why the latest attempt ended. */
  outcome?: string;
  attempts = 0;
  /** Seconds standing in the attempt under way. */
  rideTime = 0;
  /** Riding S-turns, what the rider is doing now, for the recorder's overlay (empty otherwise). */
  phase = '';
  /** The turns ridden this attempt. */
  readonly turnRecords: TurnRecord[] = [];
  /** Riding the flow, its phases this attempt, the one under way last. */
  readonly flowRecords: FlowRecord[] = [];
  private readonly waitOutside: number;
  private readonly rise: number;
  private readonly line: number;
  private readonly giveUp: number;
  private clock = 0;
  private stalled = 0;
  private readonly stall: boolean;
  private readonly turnLimit: number;
  private readonly bottomFace: number;
  /** The open face the gauge last showed this attempt (away from the curl), 0 before it has shown one. */
  private seenFace = 0;
  /** The open face the latest attempt saw: a paddler turns only about 7°/s, so waiting it points that way already. */
  private lastFace = 0;
  private popped = false;
  private lastHeading = Number.NaN;
  private travel = 0;
  private readonly style: 'line' | 'turns' | 'flow';
  private readonly cutbackReach: number;
  private readonly flowFrom: FlowPhase;
  private readonly bottomEnd: number;
  /** Riding the flow: the open face it rides toward this attempt (kept, so passing the curl never reverses it), the heading turned in the phase under way and the last heading, and the face fraction's last value and smoothed rate (1/s). */
  private flowFace = 0;
  private flowYaw = 0;
  private flowHeading = 0;
  private flowOpen = false;
  private lastFraction = Number.NaN;
  private fractionRate = 0;
  /** The turn under way and how long it has been held, and a turn given up that waits for its trigger to clear. */
  private turn?: Turn;
  private turnTime = 0;
  /** The open face a turn under way began toward: it finishes that way (the curl showing on the other side mid-turn reversed it). */
  private turnFace = 0;
  private blocked?: Turn;
  /** The turn under way: the heading turned so far, the last heading, and its start's time and speed. */
  private turnYaw = 0;
  private turnHeading = 0;
  private turnStart = 0;
  private turnSpeed = 0;

  constructor(options: AutopilotOptions = {}) {
    this.waitOutside = options.waitOutside ?? 5;
    this.rise = options.rise ?? 0.5;
    this.line = ((options.lineDegrees ?? 60) * Math.PI) / 180;
    this.giveUp = options.giveUp ?? 8;
    this.style = options.style ?? 'line';
    this.stall = options.stall ?? true;
    this.turnLimit = options.turnLimit ?? TURN_LIMIT;
    this.bottomFace = options.bottomFace ?? BOTTOM_FACE;
    this.cutbackReach = options.cutbackReach ?? CUTBACK_REACH;
    this.flowFrom = options.flowFrom ?? 'drop';
    this.bottomEnd = options.bottomEnd !== undefined ? options.bottomEnd * DEG : FLOW_BOTTOM_END;
  }

  /** Start an attempt now, as when a crest rises behind the waiting board (a placed start: Surf School's, the probes'). */
  go(): void {
    this.state = 'go';
    this.attempts += 1;
    this.clock = 0;
    this.popped = false;
    this.rideTime = 0;
    this.stalled = 0;
  }

  /** End the ride from outside (the ride analyzer's end). */
  finish(outcome: string): void {
    this.flowOpen = false;
    if (this.state === 'ride') this.end(outcome);
  }

  reset(): void {
    this.state = 'position';
    this.seenFace = 0;
    this.outcome = undefined;
    this.rideTime = 0;
    this.lastHeading = Number.NaN;
    this.turn = undefined;
    this.blocked = undefined;
    this.phase = '';
    this.turnRecords.length = 0;
    this.flowRecords.length = 0;
    this.flowOpen = false;
    this.flowFace = 0;
    this.lastFraction = Number.NaN;
    this.fractionRate = 0;
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
      case 'wait': {
        const face = this.lastFace || Math.sign(view.peelDirection);
        if (face !== 0) input.steer = this.aim(this.travel + face * TAKEOFF_ANGLE, heading, yawRate);
        if (view.crestBehind > this.rise) {
          this.go();
          return this.next(view, 0);
        }
        break;
      }
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
            const open = this.openFace(view);
            if (open !== 0) input.steer = this.aim(this.travel + open * TAKEOFF_ANGLE, heading, yawRate);
          }
        } else if (ride.phase === 'standing') {
          this.state = 'ride';
        }
        break;
      case 'ride': {
        if (ride.phase === 'fallen') {
          this.closeTurn(false, ride.speed);
          this.closeFlow(false, view);
          this.end(`fell · ${ride.separation ?? 'balance'}`);
          break;
        }
        this.rideTime += dt;
        this.stalled = ride.speed < STALL ? this.stalled + dt : 0;
        if (this.stall && this.stalled > STALL_TIME) {
          this.closeFlow(false, view);
          this.end('the wave left');
          break;
        }
        if (this.style === 'turns' && this.openFace(view) !== 0) Object.assign(input, this.turns(view, heading, dt));
        else if (this.style === 'flow' && (this.flowFace || this.openFace(view)) !== 0) Object.assign(input, this.flow(view, heading, yawRate, dt));
        else input.steer = this.steer(view, heading, yawRate);
        break;
      }
      case 'done':
        break;
    }
    return input;
  }

  /**
   * The lean that brings the heading onto the line: the travel direction turned toward the peel (or `open`), opened
   * when low on the face and closed when high.
   */
  private steer(view: AutopilotView, heading: number, yawRate: number, open = this.openFace(view)): number {
    const { wave } = view.ride;
    let target = this.travel;
    if (open !== 0) {
      let line = this.line;
      if (wave.valid && wave.faceFraction < FACE_LOW) line += (FACE_TURN * Math.PI) / 180;
      else if (wave.valid && wave.faceFraction > FACE_HIGH) line -= (FACE_TURN * Math.PI) / 180;
      target += open * line;
    }
    return this.aim(target, heading, yawRate);
  }

  /** The lean (or, lying down, the stroke) that turns the heading onto `target`. */
  private aim(target: number, heading: number, yawRate: number): number {
    return Math.max(-1, Math.min(1, wrap(target - heading) / HEADING_GAIN - YAW_DAMPING * yawRate));
  }

  /**
   * Which way along the crest the open face lies: away from the curl the gauge sees, or last saw this attempt (a
   * curl gone out of reach mid-turn must not reverse it), else the break's peel.
   */
  private openFace(view: AutopilotView): number {
    const { wave } = view.ride;
    if (wave.valid && wave.curlSide !== 0) {
      this.seenFace = -wave.curlSide;
      this.lastFace = this.seenFace;
    }
    return this.seenFace !== 0 ? this.seenFace : Math.sign(view.peelDirection);
  }

  /** S-turns: the turn the face calls for, held to its end, and the pump between them. */
  private turns(view: AutopilotView, heading: number, dt: number): Pick<RideInput, 'steer' | 'trim' | 'crouch' | 'compress'> {
    const { wave } = view.ride;
    const open = this.openFace(view);
    if (this.turn) {
      this.turnTime += dt;
      this.turnYaw += wrap(heading - this.turnHeading);
      this.turnHeading = heading;
      const angle = this.turnFace * wrap(heading - this.travel);
      const done = this.turn === 'bottom' ? angle > BOTTOM_END : this.turn === 'top' ? angle < TOP_END : angle < CUTBACK_END;
      if (!done && this.turnTime > this.turnLimit) this.blocked = this.turn;
      if (done || this.turnTime > this.turnLimit) this.closeTurn(done, view.ride.speed);
    }
    if (!this.turn && wave.valid) {
      const angle = open * wrap(heading - this.travel);
      const wanted: Turn | undefined = wave.aheadOfCrest > SHOULDER && angle > TOP_END ? 'cutback'
        : wave.faceFraction > TOP_FACE && angle > TOP_START ? 'top'
          : wave.faceFraction < this.bottomFace && angle < BOTTOM_START && wave.aheadOfCrest <= BOTTOM_REACH ? 'bottom' : undefined;
      if (wanted !== this.blocked) {
        this.turn = wanted;
        this.turnTime = 0;
        this.turnFace = open;
        this.turnYaw = 0;
        this.turnHeading = heading;
        this.turnStart = this.rideTime;
        this.turnSpeed = view.ride.speed;
      }
      if (wanted === undefined) this.blocked = undefined;
    }
    const peel = this.turn ? this.turnFace : open;
    const angle = peel * wrap(heading - this.travel);
    switch (this.turn) {
      case 'bottom':
        this.phase = angle < EXTEND_FROM ? 'BOTTOM TURN · COMPRESSED' : 'BOTTOM TURN · EXTENDING';
        return { steer: peel, trim: 0, crouch: angle < EXTEND_FROM ? TURN_CROUCH : 0, compress: angle < EXTEND_FROM ? 1 : 0 };
      case 'top':
      case 'cutback': {
        const snap = wave.crestBreaking > SNAP_BREAKING;
        this.phase = this.turn === 'cutback' ? 'CUTBACK · WEIGHT BACK' : snap ? 'SNAP · WEIGHT BACK' : 'TOP TURN · WEIGHT BACK';
        return { steer: -peel, trim: snap ? SNAP_TRIM : TOP_TRIM, crouch: TURN_CROUCH, compress: 0 };
      }
      default:
        // Between turns: crouched heading down into the next bottom turn, extended climbing.
        this.phase = angle < BOTTOM_START ? 'DROPPING · CROUCHED' : 'CLIMBING · EXTENDED';
        return { steer: 0, trim: 0, crouch: angle < BOTTOM_START ? TURN_CROUCH : 0, compress: 0 };
    }
  }

  /**
   * The movement flow (FLOW_* above): the phase under way, ended when it reaches its end or its limit and the next
   * begun, and the inputs it asks for. The open face is kept for the whole ride.
   */
  private flow(view: AutopilotView, heading: number, yawRate: number, dt: number): Pick<RideInput, 'steer' | 'trim' | 'crouch' | 'compress' | 'rotate'> {
    const { wave } = view.ride;
    if (this.flowFace === 0) this.flowFace = this.openFace(view);
    const face = this.flowFace;
    const angle = face * wrap(heading - this.travel);
    const fraction = wave.valid ? wave.faceFraction : 0;
    const curl = wave.valid ? wave.curlDistance : Infinity;
    if (Number.isFinite(this.lastFraction) && dt > 0) {
      this.fractionRate += ((fraction - this.lastFraction) / dt - this.fractionRate) * (1 - Math.exp(-dt / PUMP_SMOOTHING));
    }
    this.lastFraction = fraction;
    const record = this.trackFlow(view, heading);
    const time = record?.seconds ?? 0;
    const turned = face * this.flowYaw;
    const cutback = curl >= this.cutbackReach && angle > FLOW_CUTBACK_FROM;
    // The phase's end: [reached its end, given up at its limit], and what follows.
    let next: FlowPhase | undefined;
    let reached = true;
    switch (record?.phase) {
      case undefined:
        next = this.flowFrom;
        break;
      case 'drop':
        if (!wave.valid || fraction < FLOW_BOTTOM_FACE || wave.aheadOfCrest > BOTTOM_REACH) next = 'bottom';
        else if (time > FLOW_DROP_LIMIT) [next, reached] = ['bottom', false];
        break;
      case 'bottom':
      case 'rebound':
        if (angle > this.bottomEnd) next = 'project';
        else if (time > FLOW_TURN_LIMIT) [next, reached] = ['project', false];
        break;
      case 'project':
        if (Math.abs(view.ride.bank ?? 0) <= FLOW_UPRIGHT || fraction > FLOW_TOP_FACE) next = cutback ? 'cutback' : 'trim';
        else if (time > FLOW_PROJECT_LIMIT) [next, reached] = [cutback ? 'cutback' : 'trim', false];
        break;
      case 'trim':
        if (cutback) next = 'cutback';
        else if (fraction < FLOW_BOTTOM_FACE && angle < BOTTOM_START) next = 'bottom';
        break;
      case 'cutback':
        if (-turned > FLOW_CUTBACK_TURN || angle < -FLOW_CUTBACK_END) next = 'rebound';
        else if (time > FLOW_TURN_LIMIT) [next, reached] = ['rebound', false];
        break;
    }
    if (next) {
      this.closeFlow(reached);
      this.flowRecords.push({
        phase: next, at: this.rideTime, seconds: 0, degrees: 0, speedIn: view.ride.speed, speedOut: view.ride.speed,
        faceIn: fraction, faceOut: fraction, curlIn: curl, curlOut: curl, completed: false,
      });
      this.flowOpen = true;
      this.flowYaw = 0;
      this.flowHeading = heading;
    }
    const phase = this.flowRecords[this.flowRecords.length - 1].phase;
    switch (phase) {
      case 'drop':
        this.phase = 'FLOW · DROP';
        return { steer: 0, trim: 0, crouch: 1, compress: 0 };
      case 'bottom':
      case 'rebound':
        this.phase = phase === 'bottom' ? 'FLOW · BOTTOM TURN' : 'FLOW · REBOUND';
        return { steer: face, trim: FLOW_DRIVE, crouch: 0, compress: 1 };
      case 'project':
        this.phase = 'FLOW · PROJECTION';
        return { steer: 0, trim: 0, crouch: 0, compress: 0 };
      case 'trim': {
        const falling = this.fractionRate < 0;
        this.phase = falling ? 'FLOW · PUMP · DOWN' : 'FLOW · PUMP · UP';
        return { steer: this.steer(view, heading, yawRate, face), trim: 0, crouch: falling ? 1 : 0, compress: 0 };
      }
      case 'cutback':
        this.phase = 'FLOW · CUTBACK';
        return { steer: -face, trim: FLOW_CUTBACK_TRIM, crouch: 0, compress: 1, rotate: -face };
    }
  }

  /** The flow's phase under way brought up to now: its time, the heading turned, and the speed and wave out. */
  private trackFlow(view: AutopilotView, heading: number): FlowRecord | undefined {
    if (!this.flowOpen) return undefined;
    const record = this.flowRecords[this.flowRecords.length - 1];
    const { wave } = view.ride;
    this.flowYaw += wrap(heading - this.flowHeading);
    this.flowHeading = heading;
    record.seconds = this.rideTime - record.at;
    record.degrees = (this.flowFace * this.flowYaw * 180) / Math.PI;
    record.speedOut = view.ride.speed;
    record.faceOut = wave.valid ? wave.faceFraction : 0;
    record.curlOut = wave.valid ? wave.curlDistance : Infinity;
    return record;
  }

  /** The flow's phase under way ended (brought up to `view` first, when given): `completed` when it reached its end. */
  private closeFlow(completed: boolean, view?: AutopilotView): void {
    if (view) this.trackFlow(view, view.board.heading);
    if (!this.flowOpen) return;
    this.flowRecords[this.flowRecords.length - 1].completed = completed;
    this.flowOpen = false;
  }

  /** The turn under way, recorded and ended: `completed` when it reached its end. */
  private closeTurn(completed: boolean, speed: number): void {
    if (!this.turn) return;
    this.turnRecords.push({
      kind: this.turn, at: this.turnStart, seconds: this.turnTime, degrees: (Math.abs(this.turnYaw) * 180) / Math.PI,
      speedIn: this.turnSpeed, speedOut: speed, completed,
    });
    this.turn = undefined;
  }

  private end(outcome: string): void {
    this.state = 'done';
    this.outcome = outcome;
  }
}

function wrap(angle: number): number {
  return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));
}
