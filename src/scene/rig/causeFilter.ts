import { Quaternion, Vector3 } from 'three';
import { ARM_ALARM, ARM_SPREAD } from '../../physics/AttachedRider';
import { ARM_REST_OFFSET } from './posturePoints';
import { POINT, type RiderVisualState } from './riderVisualState';

/**
 * A linear second-order follower: the value is pulled toward the input at the
 * natural rate `omega`, rad/s, with damping `damping` (1: critically damped,
 * no overshoot). Stepped exactly for an input moving in a straight line
 * between frames, so it follows alike at any display rate (as `ArmSwing` is):
 * x'' + 2ζω x' + ω² x = ω² u. At low frequencies it lags 2ζ/ω s; at f Hz it
 * passes |ω² / (ω² − (2πf)² + 2iζω·2πf)|. A clock standing still keeps the
 * value; a first step, a clock going back, or a gap past `GAP` starts over at
 * the input.
 */
export class Follower {
  value = 0;
  rate = 0;
  private input = 0;
  private clock = Number.NaN;

  constructor(public omega: number, public damping = 1) {}

  /** Forgets the motion: the next `follow` starts over at its input. */
  reset(): void {
    this.clock = Number.NaN;
  }

  /** Starts over at `input`, at rest. */
  seed(input: number, clock: number): number {
    this.value = input;
    this.rate = 0;
    this.input = input;
    this.clock = clock;
    return input;
  }

  follow(input: number, clock: number): number {
    const dt = clock - this.clock;
    if (dt === 0) return this.value;
    if (!(dt > 0 && dt < GAP)) return this.seed(input, clock);
    const { omega: w, damping: z } = this;
    // The input's ramp over the step, and the value's offset from the ramp's particular solution u(t) − 2ζr/ω.
    const ramp = (input - this.input) / dt;
    const lead = (2 * z * ramp) / w;
    const e0 = this.value - (this.input - lead);
    const v0 = this.rate - ramp;
    let e: number;
    let v: number;
    if (z >= 1 - 1e-9) {
      const b = v0 + w * e0;
      const decay = Math.exp(-w * dt);
      e = (e0 + b * dt) * decay;
      v = (b - w * (e0 + b * dt)) * decay;
    } else {
      const wd = w * Math.sqrt(1 - z * z);
      const b = (v0 + z * w * e0) / wd;
      const decay = Math.exp(-z * w * dt);
      const [c, s] = [Math.cos(wd * dt), Math.sin(wd * dt)];
      e = decay * (e0 * c + b * s);
      v = decay * ((b * wd - z * w * e0) * c - (e0 * wd + z * w * b) * s);
    }
    this.value = e + input - lead;
    this.rate = v + ramp;
    this.input = input;
    this.clock = clock;
    return this.value;
  }
}

/** A frame longer than this, s (a paused page, a new session), starts a follower over. */
const GAP = 0.25;

/**
 * The motion filter (the animation-realism plan, §4, decision 7): what the
 * drawn body shows of the physics' motion, sorted by cause. The physics, its
 * points and the ride's feel are untouched; only how the drawn trunk follows
 * them changes. Standing, the board's 3–5 Hz roll-yaw wobble and the leg
 * spring's ring are kept out of the trunk: the legs, solved between the raw
 * board and the followed pelvis, take them (the absorption). Pumps (about
 * 1 Hz), the crouch ladder, weight shifts and the lean into a turn pass.
 */
export const CAUSE_FILTER = {
  /** 0 turns the filter off (tests that read the rig alone). */
  share: 1,
  /**
   * The pelvis's place on the board's levelled frame (across, up, along):
   * critically damped at 16 rad/s (fc about 2.5 Hz): 0.29× at 4 Hz, 0.86× at
   * 1 Hz, 0.125 s behind below 1 Hz (the plan's §4).
   */
  pelvis: { omega: 16, damping: 1 },
  /**
   * The trunk's lean across the board (its roll about the levelled nose), and
   * its pitch along it: at 18 rad/s, damped at 0.7, so the drawn lean trails
   * the physics' bank by about 0.1 s below 1 Hz at any display rate (2ζ/ω =
   * 0.078 s at its slowest; the plan's 0.12 s at most), passing 0.43× at 4 Hz. The plan's 12
   * rad/s, critically damped, lags 0.17 s; the physics' own lean carries little
   * of the board's wobble (0.05° of the chest's 1.9° mid-turn): the rig's hinge
   * and reach bend carried most (`RIG_DETAIL.trunkFollow`). Overshoots a step
   * by 4.6 %.
   */
  lean: { omega: 18, damping: 0.7 },
  /**
   * The yaw rate the rig's cues read (the chest's twist, the head's lead, the
   * leading arm, the snap and the turn's blend): `RiderMotion` smooths it over
   * 0.15 s (one pole, 26 % at 4 Hz); one more pole at `time` s makes the pair
   * second order, 11 % at 4 Hz (−19 dB) and 0.23 s behind: the plan's second
   * order at 9 rad/s (11 % at 4 Hz, 0.22 s behind).
   */
  yawRate: { time: 0.08 },
  /** The drawn pelvis never trails the physics' by more than this, m (a body thrown hard: the legs cannot take more). */
  leash: 0.15,
};

/** What the filter hands the rig from the physics' own points, before it moves them. */
export interface DrawnCues {
  /** How near the physics says the rider is to letting go, 0–1, read from its own hands about its own torso. */
  alarm: number;
}

/**
 * How near the physics says the rider is to letting go, 0–1, read back from its
 * drawn hands (the riding-body plan's step 5): standing, the physics holds each
 * free hand out from its torso by `ARM_SPREAD` of the arm's rest offset at ease
 * and up to `ARM_ALARM` more with no margin left. The lesser of the two hands'
 * readings (a hand the physics puts on a point reads anything). Online surfers
 * send the same points: no wire change.
 */
export function balanceAlarmOf(points: readonly Vector3[]): number {
  const torso = points[POINT.torso];
  const read = (hand: Vector3) => (hand.distanceTo(torso) / ARM_REST_OFFSET - 1 - ARM_SPREAD) / ARM_ALARM;
  return Math.max(0, Math.min(1, Math.min(read(points[POINT.leftHand]), read(points[POINT.rightHand]))));
}

const WORLD_UP = new Vector3(0, 1, 0);

/**
 * The motion filter's stage in `PosedBody`, between the point blend and the
 * rig: standing, the pelvis point followed on the board's levelled frame, the
 * torso and head points turned about it to the trunk's followed lean, and the
 * yaw rate smoothed once more. The hands and feet are left on their points.
 * Any other phase passes through, the followers kept at the physics' own; so
 * the filter starts over, at no jump, at every switch, a teleport and a fall.
 */
export class CauseFilter {
  readonly cues: DrawnCues = { alarm: 0 };
  private readonly pelvis = [0, 1, 2].map(() => new Follower(CAUSE_FILTER.pelvis.omega, CAUSE_FILTER.pelvis.damping));
  private readonly roll = new Follower(CAUSE_FILTER.lean.omega, CAUSE_FILTER.lean.damping);
  private readonly pitch = new Follower(CAUSE_FILTER.lean.omega, CAUSE_FILTER.lean.damping);
  private yawRate = 0;
  private clock = Number.NaN;
  private phase = '';
  private readonly nose = new Vector3();
  private readonly left = new Vector3();
  private readonly offset = new Vector3();
  private readonly trunk = new Vector3();
  private readonly followed = new Vector3();
  private readonly turn = new Quaternion();
  private readonly scratch = new Vector3();

  reset(): void {
    this.clock = Number.NaN;
    this.phase = '';
  }

  /** Filters `state` in place (its pelvis, torso and head points and its yaw rate); returns the cues read before. */
  apply(state: RiderVisualState): DrawnCues {
    this.cues.alarm = balanceAlarmOf(state.points);
    const dt = state.clock - this.clock;
    // The yaw rate: one more pole, exact for a rate held over the frame.
    if (dt > 0 && dt < GAP) this.yawRate += (state.yawRate - this.yawRate) * (1 - Math.exp(-dt / CAUSE_FILTER.yawRate.time));
    else if (dt !== 0) this.yawRate = state.yawRate;
    this.clock = state.clock;
    const share = CAUSE_FILTER.share;
    if (share <= 0) return this.cues;
    state.yawRate += (this.yawRate - state.yawRate) * share;

    const p = state.points;
    const { nose, left, offset, trunk, followed } = this;
    // The board's levelled frame: its nose on the level, the left across, the world's up.
    nose.set(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0);
    if (nose.lengthSq() < 1e-8) nose.set(0, 0, 1);
    nose.normalize();
    left.crossVectors(WORLD_UP, nose).normalize();
    offset.subVectors(p[POINT.pelvis], state.boardPosition);
    const place = [offset.dot(left), offset.y, offset.dot(nose)];
    trunk.subVectors(p[POINT.torso], p[POINT.pelvis]);
    const up = Math.max(1e-6, trunk.y);
    const lean = [Math.atan2(trunk.dot(left), up), Math.atan2(trunk.dot(nose), up)];
    const standing = state.phase === 'standing';
    const switched = state.phase !== this.phase;
    this.phase = state.phase;
    if (!standing || switched) {
      this.seed(place, lean, state.clock);
      return this.cues;
    }
    const drawn = place.map((value, i) => this.pelvis[i].follow(value, state.clock));
    // Held within `leash` of the physics' pelvis (a body thrown hard, a fall's start): drawn at the leash's length,
    // the follower carried along with its rate, so nothing jumps.
    const gap = Math.hypot(drawn[0] - place[0], drawn[1] - place[1], drawn[2] - place[2]);
    if (gap > CAUSE_FILTER.leash) {
      const keep = CAUSE_FILTER.leash / gap;
      drawn.forEach((value, i) => {
        drawn[i] = place[i] + (value - place[i]) * keep;
        this.pelvis[i].value = drawn[i];
      });
    }
    followed.copy(state.boardPosition).addScaledVector(left, drawn[0]).addScaledVector(WORLD_UP, drawn[1]).addScaledVector(nose, drawn[2]);
    const roll = this.roll.follow(lean[0], state.clock);
    const pitch = this.pitch.follow(lean[1], state.clock);
    // The trunk turned from its own lean to the followed one, about the pelvis, carrying the head with it.
    const length = trunk.length();
    if (length > 1e-6) {
      trunk.divideScalar(length);
      this.scratch.copy(WORLD_UP).addScaledVector(left, Math.tan(roll)).addScaledVector(nose, Math.tan(pitch)).normalize();
      this.turn.setFromUnitVectors(trunk, this.scratch);
      // Partly filtered, the turn and the pelvis's move are taken by `share`.
      if (share < 1) this.turn.slerp(new Quaternion(), 1 - share);
      followed.lerp(p[POINT.pelvis], 1 - share);
      for (const index of [POINT.torso, POINT.head]) {
        p[index].sub(p[POINT.pelvis]).applyQuaternion(this.turn).add(followed);
      }
    }
    p[POINT.pelvis].copy(followed);
    return this.cues;
  }

  private seed(place: number[], lean: number[], clock: number): void {
    place.forEach((value, i) => this.pelvis[i].seed(value, clock));
    this.roll.seed(lean[0], clock);
    this.pitch.seed(lean[1], clock);
  }
}
