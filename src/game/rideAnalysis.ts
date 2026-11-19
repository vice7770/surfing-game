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
  /**
   * **The board's speed through the water along its heading**, m/s: `boardVelocity·forward − waterFlow·forward`,
   * signed (negative when the water runs forward past the board faster than the board goes).
   *
   * This is NOT `speed`, which is over the ground. The two are different columns and were measured differing by up
   * to 1.5x on one traced ride — a cutback bogged to 1.1–1.3 m/s through the water while reading 3.5–3.7 over still
   * water. This is the column the physics reads for its own turn ceiling, so it is the one a carry is paid from.
   */
  throughWater: number;
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

/**
 * `'unjudged'` is a measured run the analyzer refuses to name (2026-11-19): it is kept, with its measurements and the
 * condition it failed, so the readout can show what was rejected and why. It is not a manoeuvre: it scores nothing
 * and passes no lesson.
 */
export type ManeuverKind = 'bottom turn' | 'top turn' | 'snap' | 'cutback' | 'unjudged';

/** Why a run was left `'unjudged'` (the bottom turn's three conditions, in the order they are tested). */
export type UnjudgedReason =
  /** The travelled path turned less than TURN_RATE on average: the nose moved, the board did not. */
  | 'path did not bend'
  /** The path bent away from the face the nose turned into. */
  | 'path turned the other way'
  /** The board did not gain height in the CARRY_TIME after it let go. */
  | 'no carry'
  /**
   * **The carry was never measured.** Three ways, all the same failure: the ride ended inside the window, the wave
   * went unreadable (`WaveFrame.valid === false`) for part of it, or the sample the turn let go on read no wave, so
   * there is no height to measure *against*. Missing data is not a climb and is not a flattening either: it is
   * nothing, and a zero from the gauge is not a height of 0 m.
   */
  | 'carry unseen'
  /** The climb was higher than the saved speed through the water could pay for, v² / 2g. */
  | 'speed cannot carry';

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
  /**
   * m, the path's mean radius over the turn: its length over the angle it turned. Not speed / yaw rate: a board
   * that pivots, or rides moving water, swings its heading about its path (the angulation study).
   */
  radius: number;
  /** g, the path's mean pull over the turn: its mean speed times its turn rate, over 9.81. */
  lateralG: number;
  /** rad, the travelled path's own turn over the run, signed as the heading's. 0 for a board that only yawed its nose. */
  pathYaw: number;
  /** m/s, the speed through the water along the heading when the turn let go (`RideSample.throughWater`, not the ground speed). */
  throughWater: number;
  /**
   * The height gained over the CARRY_TIME after the turn let go, **in metres above the trough ahead of the crest —
   * never a fraction of the face**: the window's **mean** height there against the height it let go at, so for a
   * steady climb it is about half the height finally reached. Negative when it dropped. Absent when the carry was
   * never watched.
   *
   * Metres, because `faceFraction` is a height **divided by a face height that moves**: a board held still under a
   * flattening wave climbs that fraction while climbing nothing at all (0.375 m over a face falling 1.50 → 1.23 m
   * reads 0.250 → 0.305 of the face). Each sample's fraction is taken against its **own** face height, so the
   * denominator cancels and what is left is the rise.
   */
  carry?: number;
  /** Set only on an `'unjudged'` run: the condition it failed. */
  unjudged?: UnjudgedReason;
  /** Peak |roll|, rad. */
  roll: number;
  /** Height on the face at the peak. */
  faceFraction: number;
  /** On the face (≥ 0.4) with the crest breaking within 4 m. */
  pocket: boolean;
}

export type RideEnd = 'fell' | 'kicked out' | 'wave died' | 'lost the wave';

export interface RideReport {
  duration: number;
  distance: number;
  topSpeed: number;
  meanSpeed: number;
  /** Time high on the face beside a breaking crest, s. */
  pocketTime: number;
  /** Time within CURL_NEAR of the curl along the crest, s (the riding-the-wave spec's done criteria). */
  curlTime: number;
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
/**
 * **How long the carry is watched after a bottom turn lets go, s.** TURN_TIME, the run that already makes a turn a
 * turn: no new bar. A candidate whose ride ends inside this window is left unjudged, never named on a guess.
 */
const CARRY_TIME = TURN_TIME;
/**
 * **The least mean rise, m, that the analyzer will read as a climb.** This is not a bar on how much a bottom turn
 * must climb — the owner's ruling is that any climb counts, and HIGH_ON_FACE was offered to him and declined. It is
 * the floor below which the number is not a measurement of anything:
 *
 *  - The carry is a mean of the ~20 steps of a CARRY_TIME window, each a face fraction times a face height, so its
 *    own floating-point error is of order `20 x 2^-52 x 1 m`, under 1e-14 m. A board held at a constant 0.27 of a
 *    1.5 m face measured +5.6e-17 of a face on a bare `> 0`, and was named a bottom turn on it. 1e-9 m is five
 *    orders of magnitude clear of that.
 *  - Nothing physical lives at 1e-9 m either. The face is read from a water surface sampled every 0.5 m
 *    (`waveFrame`'s SPACING) on a wave of metres, so a nanometre of rise is seven orders of magnitude below the
 *    centimetre a surfer could feel, and far below anything the solver resolves.
 *
 * 1e-9 m is also the length the analyzer already uses as the least distance it will believe a board has moved
 * (`track` and `remember`, `moved > 1e-9`), in the same unit: metres.
 */
const CARRY_RISE = 1e-9;
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
/** The wave died: water shallower than this under the rider, m (the shore), or for DIED_TIME, s, no face of LOST_FACE, m, and no broken water of BORE. */
const SHALLOW = 0.5;
const BORE = 0.5;
const LOST_FACE = 0.2;
const DIED_TIME = 1.5;
/** Lost the wave: this far ahead of a live face's crest, m, moving shoreward faster than it, for LOST_TIME, s. */
const LOST_AHEAD = 8;
const LOST_TIME = 1.5;
/** Near the curl: within this distance along the crest, m. */
const CURL_NEAR = 8;

const wrap = (angle: number) => angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));

/**
 * Whether the **travelled path** disqualifies a bottom-turn candidate, and how. The path has to pass the bar the
 * heading passes — TURN_RATE on average over the run — and it has to bend toward the crest by the same test the
 * heading is judged by, taken from the course the board actually ran rather than the direction its nose pointed.
 *
 * A board that has not moved has no course, so there is no path to judge: that is `'path did not bend'` too.
 */
function pathFault(turn: Turn, duration: number, travel: number): UnjudgedReason | undefined {
  if (turn.startCourse === undefined || Math.abs(turn.pathYaw) < TURN_RATE * duration) return 'path did not bend';
  const pathToward = Math.sin(turn.startCourse + turn.pathYaw / 2 - travel) * turn.pathYaw > 0;
  return pathToward ? undefined : 'path turned the other way';
}

/** The ride's running totals at one moment. */
interface Mark {
  t: number;
  distance: number;
  pocketTime: number;
  curlTime: number;
}

/** How long a condition has held, and the totals when it began. */
class Hold {
  time = 0;
  since: Mark = { t: 0, distance: 0, pocketTime: 0, curlTime: 0 };

  run(holds: boolean, dt: number, before: Mark): number {
    if (!holds) {
      this.time = 0;
      return 0;
    }
    if (this.time === 0) this.since = before;
    this.time += dt;
    return this.time;
  }

  reset(): void {
    this.time = 0;
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
  /** The path's own turn, rad, and its length, m, over the turn. */
  pathYaw: number;
  pathLength: number;
  /** Which way the path ran into the turn's first sample, rad (none when the board had not moved). */
  startCourse?: number;
  roll: number;
  peak: number;
  /**
   * At the turn's last sample: where the board was on the face (a fraction of it), **the face's own crest-to-trough
   * height, m** — not the board's — and the speed through the water. Their product is the board's height above the
   * trough, m, which is what a carry is measured in.
   *
   * `releaseValid` is **that same sample's `WaveFrame.valid`**, and it has to travel with them: the gauge zeroes
   * `faceFraction` and `faceHeight` on a frame where it finds no wave, so without it a single unreadable frame at
   * the release hands the carry a baseline of 0 m and any constant height reads as a full climb.
   */
  releaseFace: number;
  releaseFaceHeight: number;
  releaseValid: boolean;
  releaseThroughWater: number;
  wave: Pick<WaveFrame, 'valid' | 'directionX' | 'directionZ' | 'faceFraction' | 'crestBreaking'>;
}

/**
 * A bottom-turn candidate whose carry up the face is still being watched. **Every height here is metres above the
 * trough ahead of the crest** — the wave's own frame, not world y and not a fraction of the face — because the face
 * height that fraction divides by moves under the board (see `Maneuver.carry`).
 */
interface Carrying {
  maneuver: Maneuver;
  /** Simulated time the turn let go. */
  releaseT: number;
  /**
   * The board's height above the trough where it let go, m, and the speed through the water it let go with, m/s.
   * There is only a `Carrying` at all when the release sample read a wave (`closeTurn`), so this is a measured
   * height and never the gauge's zero.
   */
  heightAtRelease: number;
  throughWater: number;
  /** The highest the board has been since it let go, m above the trough: the climb that had to be paid for. */
  topHeight: number;
  /**
   * The height integrated over the time the face was **read**, m·s, and that time, s: their ratio is the mean height,
   * which is what decides *whether* it climbed. The peak would not do: it only ever rises, so a flicker above the
   * release height makes any run — even one sliding back down the face — look as though it carried.
   */
  heightSeconds: number;
  seconds: number;
  /**
   * The whole time watched since it let go, s, readable or not. More than `seconds` when any sample carried no wave,
   * and then the window is not a measurement: the two sum the same steps in the same order, so they are the same
   * number whenever the face was read throughout.
   */
  watched: number;
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
  /** Which way the path ran into this sample, radians from +z toward +x (none before it has moved). */
  course?: number;
  phase: RideSample['phase'];
}

/**
 * Reads one ride from its samples (spec P9): it starts when the rider stands
 * from a pop-up, finds turns (runs of fast yaw) and names them by where on the
 * face they peak and which way they turn against the wave, and ends the ride on
 * a fall, a kick-out, the inside or a lost face. Everything runs on the samples'
 * simulated time, so slow motion and dropped steps read the same ride.
 *
 * **A run is named only when the board turned** (the reviewer's control of 2026-11-19). Until then the name came from
 * the heading alone — `towardCrest` from the nose's yaw, `high` from the face fraction — while the travelled path's
 * own bend was measured and used only to *report* the radius and the pull. A control riding dead straight along the
 * crest at 4 m/s, flat, at a constant 0.25 of the face, with nothing but its nose yawing 100° in 1 s, scored a
 * **bottom turn** with radius `Infinity` and 0 g. The path's bend now gates the name, so that run is `'unjudged'`.
 *
 * A bottom turn must meet three conditions, in this order:
 *  1. **The travelled path bent into the same face as the nose** — `pathYaw`, not `yaw`, averaging at least TURN_RATE
 *     over the run (the same bar the heading must pass) and toward the crest by the same test.
 *  2. **The board kept gaining height for CARRY_TIME after it let go** — a bottom turn that does not carry up the
 *     face is not a bottom turn. This is a **sign** test on the mean height, with no magnitude bar: it rejects a run
 *     that flattened or dropped, and passes any climb at all. **How much of the face a bottom turn must climb is a
 *     number the owner has to set**, and until he does this gate says only that it climbed. Three things that are not
 *     a climb are not let through as one: a window the wave went unreadable through is `'carry unseen'`, not a carry;
 *     so is a **release sample that read no wave**, because the gauge's zeroed `faceFraction` and `faceHeight` are
 *     not a baseline of 0 m, and a board standing still measured a +0.375 m climb off them; and a rise under
 *     CARRY_RISE — a nanometre, the analyzer's own floor on a measured length — is the sum's own roundoff.
 *  3. **The saved speed through the water could pay for that climb** — the height actually reached, in metres,
 *     against v² / 2g, with v the board's speed through the water along its heading (`RideSample.throughWater`),
 *     never the ground speed. No free constant: it is the kinetic height, and g.
 *
 * **Both the climb and the carry are metres above the trough ahead of the crest, never fractions of the face** (the
 * reviewer's third control of 2026-11-19). `faceFraction` divides by a face height that moves, so a board sitting
 * still at 0.375 m while the wave flattened from 1.50 m to 1.23 m rose 0.250 → 0.305 of the face and scored a bottom
 * turn on it; condition 3 charged its speed for the same phantom 0.08 m. Each sample's fraction is now multiplied by
 * that same sample's own face height, so the moving denominator cancels. What is left is still the height above a
 * **trough the wave reports** — a datum that shifts if the trough itself rises or falls, which is the limit of what
 * `WaveFrame` can say about the board's own motion.
 *
 * Anything that fails, or whose carry the ride ended before, is `'unjudged'` with the reason: never guessed into
 * another name. **The turns off the top — top turn, snap and cutback — are deliberately untouched**, because the same
 * nose-only hole is there and closing it is a ruling the owner has to make: a snap is partly a slide, so a path that
 * barely bends may be the manoeuvre rather than the artefact.
 *
 * **Known limit: `pathYaw` is the path over the GROUND**, accumulated from the samples' own x and z, as it always
 * was when it only fed the reported radius. On a moving face the ground path is not the path through the water, so a
 * board held still against a fast crest bends its ground path less than it bends its water path, and the other way
 * about. Making the path water-relative would also move `radius` and `lateralG`, numbers already shipped and quoted,
 * so it is a separate change and not this one's to make.
 */
export class RideAnalyzer {
  private previous?: Previous;
  private started = false;
  private startTime = 0;
  private distance = 0;
  private pocketTime = 0;
  private curlTime = 0;
  private topSpeed = 0;
  private readonly maneuvers: Maneuver[] = [];
  private turn?: Turn;
  private carrying?: Carrying;
  private readonly kickOut = new Hold();
  private readonly died = new Hold();
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
    // Lying down ends the ride unreported (the game's tracker names it); the next stand starts a new one.
    if (this.started && (sample.phase === 'prone' || sample.phase === 'recover')) this.forget();
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
    const before: Mark = { t: previous!.t, distance: this.distance, pocketTime: this.pocketTime, curlTime: this.curlTime };
    if (sample.phase === 'fallen') {
      this.finish('fell', { ...before, t: sample.t });
      return;
    }
    const { wave } = sample;
    this.distance += Math.hypot(sample.x - previous!.x, sample.z - previous!.z);
    this.topSpeed = Math.max(this.topSpeed, sample.speed);
    if (wave.valid && wave.faceFraction >= POCKET_FACE && wave.crestBreaking >= POCKET_BREAKING) this.pocketTime += dt;
    this.track(sample, previous!, dt);
    this.watchCarry(sample, dt);
    this.remember(sample);
    // Near the curl on unbroken water: in the whitewater every crest point breaks, so the curl reads 0 m.
    if (wave.valid && wave.curlDistance <= CURL_NEAR && sample.breakingHere < BORE) this.curlTime += dt;
    const behind = sample.phase === 'standing' && wave.valid && wave.aheadOfCrest < -KICK_OUT_BEHIND;
    const live = wave.valid && wave.faceHeight >= LOST_FACE;
    const dead = !live && sample.breakingHere < BORE;
    const leaving = live && sample.breakingHere < BORE && wave.aheadOfCrest > LOST_AHEAD && wave.speedShoreward > wave.crestSpeed;
    if (this.kickOut.run(behind, dt, before) >= KICK_OUT_TIME) this.finish('kicked out', this.kickOut.since);
    else if (sample.depth < SHALLOW) this.finish('wave died', { t: sample.t, distance: this.distance, pocketTime: this.pocketTime, curlTime: this.curlTime });
    else if (this.died.run(dead, dt, before) >= DIED_TIME) this.finish('wave died', this.died.since);
    else if (this.lost.run(leaving, dt, before) >= LOST_TIME) this.finish('lost the wave', this.lost.since);
  }

  private remember(sample: RideSample): void {
    const previous = this.previous;
    const moved = previous ? Math.hypot(sample.x - previous.x, sample.z - previous.z) : 0;
    this.previous = {
      t: sample.t, x: sample.x, z: sample.z, heading: sample.heading, speed: sample.speed, roll: sample.roll,
      along: sample.wave.speedAlongCrest, phase: sample.phase,
      course: moved > 1e-9 ? Math.atan2(sample.x - previous!.x, sample.z - previous!.z) : previous?.course,
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
      pathYaw: 0, pathLength: 0, startCourse: previous.course, roll: Math.abs(previous.roll), peak: 0,
      releaseFace: wave.faceFraction, releaseFaceHeight: wave.faceHeight, releaseValid: wave.valid,
      releaseThroughWater: sample.throughWater,
      wave: { ...wave },
    };
    const turn = this.turn;
    turn.yaw += rate * dt;
    // The path: this step's course against the last one's.
    const moved = Math.hypot(sample.x - previous.x, sample.z - previous.z);
    if (moved > 1e-9) {
      const course = Math.atan2(sample.x - previous.x, sample.z - previous.z);
      if (previous.course !== undefined) turn.pathYaw += wrap(course - previous.course);
      turn.pathLength += moved;
    }
    turn.end = sample.t;
    turn.speedOut = sample.speed;
    turn.alongOut = wave.speedAlongCrest;
    turn.releaseFace = wave.faceFraction;
    turn.releaseFaceHeight = wave.faceHeight;
    // The three above are a reading of one sample, and this says whether that sample read anything: they move together.
    turn.releaseValid = wave.valid;
    turn.releaseThroughWater = sample.throughWater;
    turn.roll = Math.max(turn.roll, Math.abs(sample.roll));
    if (Math.abs(rate) > turn.peak) {
      turn.peak = Math.abs(rate);
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
    const measured = this.measure(turn, duration);
    if (towardCrest && !high) {
      // A bottom turn is only named once its carry has been watched. A second turn closing before the first's window
      // has run leaves that one unjudged: `watchCarry` is the only thing that ever sees a carry through.
      this.settleCarry(false);
      // Condition 1, and then the baseline condition 2 would be measured against. A release sample that read no wave
      // has no height on the face, and the gauge's zeros are not a height of 0 m: a board that never moved reads a
      // climb of its whole height off them. An absent baseline is the same failure as an absent window, so it is the
      // same reason.
      const fault: UnjudgedReason | undefined =
        pathFault(turn, duration, travel) ?? (turn.releaseValid ? undefined : 'carry unseen');
      if (fault) this.maneuvers.push({ ...measured, kind: 'unjudged', unjudged: fault });
      else {
        // Where it let go, in metres above the trough ahead of the crest: the fraction of the face against the face's
        // own height at that same sample, both read on a sample that carried a wave.
        const heightAtRelease = turn.releaseFace * turn.releaseFaceHeight;
        this.carrying = {
          maneuver: measured, releaseT: turn.end, heightAtRelease, throughWater: turn.releaseThroughWater,
          topHeight: heightAtRelease, heightSeconds: 0, seconds: 0, watched: 0,
        };
      }
      return;
    }
    if (!towardCrest && high) {
      // The turns off the top are unchanged: the nose-only hole is still open here, and closing it is the owner's call.
      let kind: ManeuverKind;
      if (Math.abs(turn.yaw) >= CUTBACK_YAW && turn.alongIn * turn.alongOut < 0) kind = 'cutback';
      else if (turn.peak >= SNAP_RATE && duration <= SNAP_TIME) kind = 'snap';
      else kind = 'top turn';
      this.maneuvers.push({ ...measured, kind });
    }
  }

  /** Everything a finished turn measures, before it is named. */
  private measure(turn: Turn, duration: number): Maneuver {
    return {
      kind: 'unjudged', start: turn.start - this.startTime, end: turn.end - this.startTime, yaw: turn.yaw,
      peakYawRate: turn.peak, speedIn: turn.speedIn, speedOut: turn.speedOut,
      radius: Math.abs(turn.pathYaw) > 1e-9 ? turn.pathLength / Math.abs(turn.pathYaw) : Infinity,
      lateralG: (turn.pathLength * Math.abs(turn.pathYaw)) / (duration * duration * GRAVITY),
      pathYaw: turn.pathYaw, throughWater: turn.releaseThroughWater, roll: turn.roll,
      faceFraction: turn.wave.faceFraction,
      pocket: turn.wave.faceFraction >= POCKET_FACE && turn.wave.crestBreaking >= POCKET_BREAKING,
    };
  }

  /** Follow a released bottom turn up the face, and judge it once CARRY_TIME has passed. */
  private watchCarry(sample: RideSample, dt: number): void {
    const carrying = this.carrying;
    if (!carrying) return;
    carrying.watched += dt;
    if (sample.wave.valid) {
      // Metres above the trough ahead of the crest: this sample's fraction of the face against **this sample's own**
      // face height, so a face that grows or shrinks under a board that is not moving cannot read as a climb.
      const height = sample.wave.faceFraction * sample.wave.faceHeight;
      carrying.topHeight = Math.max(carrying.topHeight, height);
      carrying.heightSeconds += height * dt;
      carrying.seconds += dt;
    }
    if (sample.t >= carrying.releaseT + CARRY_TIME - 1e-9) this.settleCarry();
  }

  /**
   * Judge the bottom turn whose carry was being watched. Both heights and the carry are **metres above the trough
   * ahead of the crest**.
   *
   * The window has to be a measurement before it can be judged. `seen` is false when the ride ended inside it, and
   * `seconds < watched` says the wave went unreadable for part of it: either way there is no mean height, and the
   * run is left `'carry unseen'` rather than named on what little there was. A mean taken over the one sample of
   * eighteen that carried a wave is not a carry; it is a coincidence.
   *
   * Then two readings of the same window, each used for what it means. **Whether it climbed** is the mean height
   * against the height it let go at — the mean, because the peak only ever rises, so one flicker above the release
   * height would pass a run that slid back down the face. **What the climb cost** is the peak, the height it
   * actually reached, which is the conservative number to ask the speed to pay for.
   */
  private settleCarry(seen = true): void {
    const carrying = this.carrying;
    if (!carrying) return;
    this.carrying = undefined;
    const { maneuver, throughWater, heightAtRelease, seconds, watched } = carrying;
    if (!seen || !(seconds > 0) || seconds < watched) {
      this.maneuvers.push({ ...maneuver, kind: 'unjudged', unjudged: 'carry unseen' });
      return;
    }
    const carry = carrying.heightSeconds / seconds - heightAtRelease;
    // The climb reached, in metres, against the kinetic height the speed through the water holds: v² / 2g. Both the
    // peak and the release height are metres above the trough, each taken with its own sample's face height: a face
    // that shrank under the board used to charge the speed for a climb that never happened.
    const climb = carrying.topHeight - heightAtRelease;
    const paid = throughWater > 0 && climb <= (throughWater * throughWater) / (2 * GRAVITY);
    const fault: UnjudgedReason | undefined = !(carry > CARRY_RISE) ? 'no carry' : !paid ? 'speed cannot carry' : undefined;
    this.maneuvers.push({ ...maneuver, carry, ...(fault ? { kind: 'unjudged' as const, unjudged: fault } : { kind: 'bottom turn' as const }) });
  }

  /** Drop the ride under way, as if the analyzer were new. */
  private forget(): void {
    this.started = false;
    this.startTime = 0;
    this.distance = 0;
    this.pocketTime = 0;
    this.curlTime = 0;
    this.topSpeed = 0;
    this.maneuvers.length = 0;
    this.turn = undefined;
    this.carrying = undefined;
    this.kickOut.reset();
    this.died.reset();
    this.lost.reset();
  }

  private finish(end: RideEnd, at: Mark): void {
    if (this.turn) this.closeTurn();
    // The ride is over, so any carry still being watched was never seen through: unjudged, not named on a guess.
    this.settleCarry(false);
    const duration = Math.max(0, at.t - this.startTime);
    this.finished = {
      duration, distance: at.distance, topSpeed: this.topSpeed, meanSpeed: duration > 0 ? at.distance / duration : 0,
      pocketTime: at.pocketTime, curlTime: at.curlTime, maneuvers: this.maneuvers, end, timeScale: this.timeScale,
    };
  }
}
