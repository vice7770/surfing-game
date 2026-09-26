import type { RiderPhase } from '../physics/AttachedRider';
import type { WaveFrame } from '../physics/waveFrame';

/** One step of a ride, as the analyzer reads it (spec P9). */
export interface RideSample {
  /** Simulated time, s. */
  t: number;
  x: number;
  z: number;
  /** Radians from +z toward +x. */
  heading: number;
  /** Over ground, m/s. */
  speed: number;
  /** The board's roll, rad. */
  roll: number;
  /** The contact's normal load, body weights. */
  load: number;
  phase: RiderPhase | 'fallen';
  wave: WaveFrame;
  /** Still-water depth at the board, m. */
  depth: number;
  /** The water's breaking strength at the board. */
  breakingHere: number;
}

export type ManeuverKind = 'bottom turn' | 'top turn' | 'snap' | 'cutback';

export interface Maneuver {
  kind: ManeuverKind;
  /** Seconds into the ride. */
  start: number;
  end: number;
  /** Radians turned, signed as the heading. */
  yaw: number;
  /** rad/s. */
  peakYawRate: number;
  speedIn: number;
  speedOut: number;
  /** m, speed / yaw rate at the peak. */
  radius: number;
  /** g, speed × yaw rate / 9.81 at the peak. */
  lateralG: number;
  /** Peak |roll|, rad. */
  roll: number;
  /** Height on the face at the peak. */
  faceFraction: number;
  /** On the face (≥ 0.4) with the crest breaking within 4 m. */
  pocket: boolean;
}

export type RideEnd = 'fell' | 'lost the face' | 'inside' | 'kicked out';

export interface RideReport {
  duration: number;
  distance: number;
  topSpeed: number;
  meanSpeed: number;
  /** Time high on the face beside a breaking crest, s. */
  pocketTime: number;
  maneuvers: Maneuver[];
  end: RideEnd;
  /** The slow motion the ride was played at: recorded, never used (everything reads simulated time). */
  timeScale: number;
}

const GRAVITY = 9.81;
/** A turn: faster than this yaw rate, rad/s, for at least this long, s. */
const TURN_RATE = 0.6;
const TURN_TIME = 0.3;
/** Where on the face a turn's peak divides bottom turns from top turns. */
const HIGH_ON_FACE = 0.5;
/** A snap peaks at least this fast, rad/s, and lasts no longer, s. */
const SNAP_RATE = 3;
const SNAP_TIME = 0.8;
/** A cutback turns at least this far, rad, and reverses along the crest. */
const CUTBACK_YAW = (120 * Math.PI) / 180;
/** The pocket: this high on the face, with the crest breaking at least this strongly. */
const POCKET_FACE = 0.4;
const POCKET_BREAKING = 0.3;
/** Kicked out: this far behind the crest, m, for this long, s. */
const KICK_OUT_BEHIND = 1;
const KICK_OUT_TIME = 0.5;
/** Inside: water shallower than this, m, or a bore at least this strong for this long, s. */
const SHALLOW = 0.5;
const BORE = 0.5;
const BORE_TIME = 2;
/** Lost the face: no wave, this far ahead of a crest lower than this (m), or slower than this (m/s), for this long (s). */
const LOST_AHEAD = 8;
const LOST_FACE = 0.2;
const LOST_SPEED = 1.5;
const LOST_TIME = 1.5;

const wrap = (angle: number) => angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));

/** The ride's running totals at one moment. */
interface Mark {
  t: number;
  distance: number;
  pocketTime: number;
}

/** How long a condition has held, and the totals when it began. */
class Hold {
  time = 0;
  since: Mark = { t: 0, distance: 0, pocketTime: 0 };

  run(holds: boolean, dt: number, before: Mark): number {
    if (!holds) {
      this.time = 0;
      return 0;
    }
    if (this.time === 0) this.since = before;
    this.time += dt;
    return this.time;
  }
}

/** A turn in progress. */
interface Turn {
  start: number;
  end: number;
  sign: number;
  startHeading: number;
  yaw: number;
  speedIn: number;
  speedOut: number;
  alongIn: number;
  alongOut: number;
  roll: number;
  peak: number;
  peakSpeed: number;
  wave: Pick<WaveFrame, 'valid' | 'directionX' | 'directionZ' | 'faceFraction' | 'crestBreaking'>;
}

/** The previous sample: what the next one is measured against. */
interface Previous {
  t: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  roll: number;
  along: number;
  phase: RideSample['phase'];
}

/**
 * Reads one ride from its samples (spec P9): it starts when the rider stands
 * from a pop-up, finds turns (runs of fast yaw) and names them by where on the
 * face they peak and which way they turn against the wave, and ends the ride on
 * a fall, a kick-out, the inside or a lost face. Everything runs on the samples'
 * simulated time, so slow motion and dropped steps read the same ride.
 */
export class RideAnalyzer {
  private previous?: Previous;
  private started = false;
  private startTime = 0;
  private distance = 0;
  private pocketTime = 0;
  private topSpeed = 0;
  private readonly maneuvers: Maneuver[] = [];
  private turn?: Turn;
  private readonly kickOut = new Hold();
  private readonly bore = new Hold();
  private readonly lost = new Hold();
  private finished?: RideReport;

  constructor(private readonly timeScale = 1) {}

  get riding(): boolean {
    return this.started && !this.finished;
  }

  /** The latest finished manoeuvre, for callouts. */
  get latest(): Maneuver | undefined {
    return this.maneuvers[this.maneuvers.length - 1];
  }

  /** The ride's report, once it has ended. */
  report(): RideReport | undefined {
    return this.finished;
  }

  push(sample: RideSample): void {
    if (this.finished) return;
    const previous = this.previous;
    if (!this.started) {
      this.remember(sample);
      if (sample.phase === 'standing' && previous && previous.phase !== 'standing' && previous.phase !== 'fallen') {
        this.started = true;
        this.startTime = sample.t;
        this.topSpeed = sample.speed;
      }
      return;
    }
    const dt = sample.t - previous!.t;
    if (!(dt > 0)) return;
    const before: Mark = { t: previous!.t, distance: this.distance, pocketTime: this.pocketTime };
    if (sample.phase === 'fallen') {
      this.finish('fell', { ...before, t: sample.t });
      return;
    }
    const { wave } = sample;
    this.distance += Math.hypot(sample.x - previous!.x, sample.z - previous!.z);
    this.topSpeed = Math.max(this.topSpeed, sample.speed);
    if (wave.valid && wave.faceFraction >= POCKET_FACE && wave.crestBreaking >= POCKET_BREAKING) this.pocketTime += dt;
    this.track(sample, previous!, dt);
    this.remember(sample);
    const behind = sample.phase === 'standing' && wave.valid && wave.aheadOfCrest < -KICK_OUT_BEHIND;
    const noFace = !wave.valid || (wave.aheadOfCrest > LOST_AHEAD && wave.faceHeight < LOST_FACE) || sample.speed < LOST_SPEED;
    if (this.kickOut.run(behind, dt, before) >= KICK_OUT_TIME) this.finish('kicked out', this.kickOut.since);
    else if (sample.depth < SHALLOW) this.finish('inside', { t: sample.t, distance: this.distance, pocketTime: this.pocketTime });
    else if (this.bore.run(sample.breakingHere >= BORE, dt, before) >= BORE_TIME) this.finish('inside', this.bore.since);
    else if (this.lost.run(noFace, dt, before) >= LOST_TIME) this.finish('lost the face', this.lost.since);
  }

  private remember(sample: RideSample): void {
    this.previous = {
      t: sample.t, x: sample.x, z: sample.z, heading: sample.heading, speed: sample.speed, roll: sample.roll,
      along: sample.wave.speedAlongCrest, phase: sample.phase,
    };
  }

  /** Extend, start or close the turn in progress with the yaw rate since the previous sample. */
  private track(sample: RideSample, previous: Previous, dt: number): void {
    const rate = wrap(sample.heading - previous.heading) / dt;
    const fast = Math.abs(rate) > TURN_RATE;
    if (this.turn && (!fast || Math.sign(rate) !== this.turn.sign)) this.closeTurn();
    if (!fast) return;
    const { wave } = sample;
    this.turn ??= {
      start: previous.t, end: previous.t, sign: Math.sign(rate), startHeading: previous.heading, yaw: 0,
      speedIn: previous.speed, speedOut: previous.speed, alongIn: previous.along, alongOut: previous.along,
      roll: Math.abs(previous.roll), peak: 0, peakSpeed: 0, wave: { ...wave },
    };
    const turn = this.turn;
    turn.yaw += rate * dt;
    turn.end = sample.t;
    turn.speedOut = sample.speed;
    turn.alongOut = wave.speedAlongCrest;
    turn.roll = Math.max(turn.roll, Math.abs(sample.roll));
    if (Math.abs(rate) > turn.peak) {
      turn.peak = Math.abs(rate);
      turn.peakSpeed = sample.speed;
      turn.wave = {
        valid: wave.valid, directionX: wave.directionX, directionZ: wave.directionZ,
        faceFraction: wave.faceFraction, crestBreaking: wave.crestBreaking,
      };
    }
  }

  /** Name the finished turn, if it was long enough and fits a manoeuvre. */
  private closeTurn(): void {
    const turn = this.turn!;
    this.turn = undefined;
    const duration = turn.end - turn.start;
    if (duration < TURN_TIME - 1e-9 || !turn.wave.valid) return;
    // Toward the crest when the heading's part along the wave's travel shrinks, judged halfway through the turn.
    const travel = Math.atan2(turn.wave.directionX, turn.wave.directionZ);
    const towardCrest = Math.sin(turn.startHeading + turn.yaw / 2 - travel) * turn.yaw > 0;
    const high = turn.wave.faceFraction >= HIGH_ON_FACE;
    let kind: ManeuverKind;
    if (towardCrest && !high) kind = 'bottom turn';
    else if (!towardCrest && high) {
      if (Math.abs(turn.yaw) >= CUTBACK_YAW && turn.alongIn * turn.alongOut < 0) kind = 'cutback';
      else if (turn.peak >= SNAP_RATE && duration <= SNAP_TIME) kind = 'snap';
      else kind = 'top turn';
    } else return;
    this.maneuvers.push({
      kind, start: turn.start - this.startTime, end: turn.end - this.startTime, yaw: turn.yaw, peakYawRate: turn.peak,
      speedIn: turn.speedIn, speedOut: turn.speedOut,
      radius: turn.peakSpeed / turn.peak, lateralG: (turn.peakSpeed * turn.peak) / GRAVITY, roll: turn.roll,
      faceFraction: turn.wave.faceFraction,
      pocket: turn.wave.faceFraction >= POCKET_FACE && turn.wave.crestBreaking >= POCKET_BREAKING,
    });
  }

  private finish(end: RideEnd, at: Mark): void {
    if (this.turn) this.closeTurn();
    const duration = Math.max(0, at.t - this.startTime);
    this.finished = {
      duration, distance: at.distance, topSpeed: this.topSpeed, meanSpeed: duration > 0 ? at.distance / duration : 0,
      pocketTime: at.pocketTime, maneuvers: this.maneuvers, end, timeScale: this.timeScale,
    };
  }
}
