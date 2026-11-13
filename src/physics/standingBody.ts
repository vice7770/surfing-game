import { Quaternion, Vector3 } from 'three';
import { WATER } from './hullForces';

/**
 * The new surfer's standing body, steps 3.1 and 3.1b (`AttachedRiderOptions.rider` 'new', the `?rider=new` dev switch;
 * docs/research/new-rider/design.md §1 and §7, the advisor's rulings 29 and 29a; docs/research/new-rider/3.1).
 *
 * Standing, the old rider's centre of mass is carried along the board: kinematic drives keep it plumb in pitch while
 * the board pitches under it, and pull it back to its posture along the board. Here the body is free along the board
 * too: its speed along its own forward axis is a ninth unknown in the board's solve (with the leg's rate along its up
 * and the bank's across it). Nothing moves it there but forces with a reaction on the board at the feet:
 * - **the pitch ankle:** a passive spring and damper on the ankle's own angle (the leg line against the deck's normal),
 *   acting at once, stiffening with the leg's load; about a rest that an active loop sets after a delay and a motor
 *   lag (ruling 29a). The loop's command: the ankle's angle that puts the body on its reference lean (with the stretch
 *   that holds its weight there when the feet's pressure is asked off their middle: W/S, Snap), and feedback on the
 *   body's own lean off that reference and its lean rate. The reference: the face's normal under the board (what the
 *   rider sees ahead), trimmed slowly toward the body's own push through the feet (what the soles feel);
 * - **gravity,** which tips the body off its feet as an inverted pendulum (explicit, through the leg's line).
 * The body's frame is the heading, then the leg line's pitch, then its bank, so the body leans with the face.
 *
 * The knees (§1): a softer leg spring, and a strength cap in place of `MAX_LOAD`: two knees of KNEE_TORQUE each hold a
 * push along the leg of at most 2 τ / d, d the knee's offset from the hip–ankle line of two BONE_LENGTH bones. Past it
 * the knees yield and spend their travel.
 *
 * The values are the design's and the pitch model's (`docs/research/new-rider/3.1/pitchModel.ts`), provisional. The
 * rest of the standing rider (the bank law and its roll drive, the leg's load and rest, the swing, the twist, 32
 * substeps) is the old one's (`AttachedRider`).
 */

/** The knees' spring along the leg, N/m: inside the design's 15–25 kN/m for bent knees (Matsumoto & Griffin 1998's legs-bent 22 kN/m; today 44). Its damping ratio stays `RIDER_LEG`'s 0.35. */
export const KNEE_STIFFNESS = 20_000;
/** Each knee's strongest extending moment, N·m (the design's about 300 per leg, provisional). */
export const KNEE_TORQUE = 300;
/** Thigh and shank, m (the design's two 0.45 m bones). */
export const BONE_LENGTH = 0.45;
/** The ankle's height over the deck, m: the hip–ankle line of the riding stance (pelvis 0.78 m) is 0.705 m, the design's d of 0.28 m. */
export const ANKLE_HEIGHT = 0.075;
/**
 * The pitch ankle's passive stiffness, in m g L (L the leg's length: the centre of mass over the feet), at a load of
 * one body weight: the top of the design's sourced 0.7–1.2. Passive, it acts at once on the ankle's angle. Alone (step
 * 3.1) it was too soft: the body and the board were joined along it by only (k − m g L) / L², about 180 N/m.
 */
export const PITCH_ANKLE = 1.2;
/** The pitch ankle's damping over its stiffness, s: the bank ankle's ratio (80 over 800 N·m/rad). */
export const PITCH_DAMPING_TIME = 0.1;
/**
 * The reference's slow trim, s: the face's normal under the board gives the reference, and its difference from the body's
 * own push through the feet (low-passed over SPECIFIC_FORCE_TIME, the line from the centre of pressure to the centre of
 * mass) is smoothed over this. Step 3.1 read the board's specific force at the feet here (0.1 s). With the active loop the
 * pitch model finds no gains that hold the body with that: the body's own push on the 2.5 kg board tilts the board's felt
 * vertical, and the reference follows it (the don't-retry list's felt-force loop, in pitch); below about 1 s every gain
 * pair rings or grows. The body's own push is smooth (73 kg), and 0.5 s keeps the loop damped (docs/research/new-rider/3.1,
 * section 10).
 */
export const PITCH_REFERENCE_TIME = 0.5;
/**
 * The active pitch ankle (ruling 29a; the human ankle's own stiffness is below the toppling stiffness, so posture is
 * held by an active, delayed loop: Loram and Lakie 2002, Morasso and Sanguineti 2002, recalled): the rest's command
 * reads the body's own lean off its reference and its lean rate, and arrives PITCH_DELAY, s, later (leg postural
 * responses start at about 90–100 ms; Nashner 1977), through a motor lag of PITCH_MOTOR_LAG, s. PITCH_LEAN_GAIN, rad of
 * rest per rad of lean off the reference, and PITCH_RATE_GAIN, s: chosen on the pitch model for damping at load factors
 * 1.0 to 1.8 g at the hull's measured pitch stiffness and drag (`hull.probe.ts`). Larger gains ring: with the delay, the
 * board slides from under a leaning body faster than the loop answers (section 10).
 */
export const PITCH_DELAY = 0.1;
export const PITCH_MOTOR_LAG = 0.05;
export const PITCH_LEAN_GAIN = 0.25;
export const PITCH_RATE_GAIN = 0.1;
/**
 * The ankle stiffening with activation (ruling 29a's step 2: muscles stiffen as they activate): its passive stiffness
 * grows with the leg's load, low-passed over PITCH_ACTIVATION_TIME, s, from one body weight up, to at most
 * PITCH_ACTIVATION_MAX of its base. Without it, above about 1.2 g the felt gravity outgrows the passive ankle, and the
 * board slides from under the body faster than the delayed loop can answer (the pitch model; the held carves toppled).
 */
export const PITCH_ACTIVATION_TIME = 0.2;
export const PITCH_ACTIVATION_MAX = 2;
/** The furthest the leg line leans off the deck's normal before the body is off its posture, rad. */
export const MAX_PITCH = (45 * Math.PI) / 180;

/**
 * The legs' strength along the leg, N, at a hip–ankle distance `hipToAnkle`, m: two knees of KNEE_TORQUE, each at d
 * from the line of force, d = √(b² − (D/2)²). Standing (0.705 m) 3.0 body weights at 73 kg, the pumping crouch 2.25,
 * Compress 2.1, the tuck 1.9; a straight leg holds any push.
 */
export function kneeStrength(hipToAnkle: number): number {
  const half = Math.max(0, hipToAnkle) / 2;
  const d = Math.sqrt(Math.max(0, BONE_LENGTH * BONE_LENGTH - half * half));
  return d > 1e-6 ? (2 * KNEE_TORQUE) / d : Infinity;
}

const X = new Vector3(1, 0, 0);
const Z = new Vector3(0, 0, 1);

/** The pitch of `v` in the heading's vertical plane, from the vertical toward the heading, rad (`inverse` the heading's inverse). */
function pitchOf(v: Vector3, inverse: Quaternion, scratch: Vector3): number {
  const local = scratch.copy(v).applyQuaternion(inverse);
  return Math.atan2(local.z, local.y);
}

/** The body's pitch on the board: its frame, the pitch ankle and the ninth row of the board's solve. */
export class StandingBody {
  /** The leg line's lean off the deck's normal (the pitch ankle's angle, forward +), rad, and its rate relative to the board, rad/s. */
  readonly pitch = { angle: 0, rate: 0 };
  /** The frame's pitch from the vertical about the heading's level side axis, forward +, rad; and the deck normal's. */
  framePitch = 0;
  deckPitch = 0;
  /** The lean the body is asked for, from the vertical (forward +), rad; the ankle's rest off the deck's normal, rad; its torque, N·m (+ pushes the body back). */
  reference = 0;
  rest = 0;
  torque = 0;
  /** The ankle's stiffness, N·m/rad, and the implicit share of its torque per rad/s of rate over the substep (k h + c). */
  stiffness = 0;
  implicit = 0;
  /** The body's speed along its forward axis relative to where it is carried, m/s, and after the latest solve. */
  speed = 0;
  speedAfter = 0;
  /** The felt lean's smoothed difference from the face's normal, rad (PITCH_REFERENCE_TIME); NaN until the body first stands free. */
  private deviation = Number.NaN;
  /** The felt lean's smoothed difference from the face's normal, rad (for probes). */
  get felt(): number {
    return this.deviation;
  }

  /** The active rest's commands over the last PITCH_DELAY, a ring of (time on the body's clock, s; command, rad); the lagged rest it gives, rad. */
  private clock = 0;
  private times = new Float64Array(512);
  private commands = new Float64Array(512);
  private head = 0;
  private count = 0;
  private lagged = Number.NaN;
  /** The leg line's lean from the vertical the latest substep, rad (NaN before the first), and the leg's load low-passed, N. */
  private lastLean = Number.NaN;
  private activation = Number.NaN;
  /** The active part of the rest now (the lagged command less its feed-forward), rad, for probes. */
  active = 0;

  private readonly inverse = new Quaternion();
  private readonly scratch = new Vector3();
  private readonly turn = new Quaternion();

  /** A new mount: nothing felt yet. */
  reset(): void {
    this.pitch.angle = 0;
    this.pitch.rate = 0;
    this.framePitch = 0;
    this.deckPitch = 0;
    this.reference = 0;
    this.rest = 0;
    this.torque = 0;
    this.speed = 0;
    this.speedAfter = 0;
    this.deviation = Number.NaN;
    this.forget();
  }

  /** The loop's memory: the delay line, the lag, the lean's last value and the load's smoothing. */
  private forget(): void {
    this.count = 0;
    this.head = 0;
    this.lagged = Number.NaN;
    this.lastLean = Number.NaN;
    this.activation = Number.NaN;
    this.active = 0;
  }

  /** Not standing free (landing, lying): the felt lean starts again when the body next stands free. */
  idle(): void {
    this.deviation = Number.NaN;
    this.torque = 0;
    this.speed = 0;
    this.speedAfter = 0;
    this.forget();
  }

  /**
   * The frame's pitch from the leg line `lean` (the centre of mass from the feet, world), the posture's own pitch over
   * the feet `posture` (rad) and the board's `up`; with no lean (a new mount), square to the deck.
   */
  measure(heading: Quaternion, boardUp: Vector3, posture: number, lean?: Vector3): void {
    this.inverse.copy(heading).invert();
    this.deckPitch = pitchOf(boardUp, this.inverse, this.scratch);
    if (lean) {
      this.pitch.angle = pitchOf(lean, this.inverse, this.scratch) - this.deckPitch;
    } else {
      this.pitch.angle = 0;
    }
    const ankle = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch.angle));
    this.framePitch = this.deckPitch + ankle - posture;
  }

  /** The bank of the leg line `lean` (world) toward the heading's +x, rad: its angle off the heading's vertical plane. */
  bankOf(heading: Quaternion, lean: Vector3): number {
    const local = this.scratch.copy(lean).applyQuaternion(this.inverse.copy(heading).invert());
    return Math.atan2(local.x, Math.hypot(local.y, local.z));
  }

  /** The body's frame: the heading, the pitch, then the bank (`bank`, rad toward the board's +x), into `out`. */
  frame(heading: Quaternion, bank: number, out: Quaternion): Quaternion {
    out.copy(heading).multiply(this.turn.setFromAxisAngle(X, this.framePitch));
    return out.multiply(this.turn.setFromAxisAngle(Z, -bank));
  }

  /**
   * Before the solve: the pitch ankle's rest and torque. `rate` is the leg line's pitch rate relative to the board
   * (rad/s), `length` the leg's (m), `load` the leg's (N), `cop` the trim's target for the feet's pressure along the
   * board from their middle (m), `waterUp` the face's normal under the board and `felt` the body's own push through the
   * feet, low-passed (N), both world.
   */
  prepare(h: number, mass: number, length: number, load: number, cop: number, rate: number, heading: Quaternion, waterUp: Vector3, felt: Vector3): void {
    this.inverse.copy(heading).invert();
    const face = pitchOf(waterUp, this.inverse, this.scratch);
    const sensed = felt.lengthSq() > 1e-6 ? pitchOf(felt, this.inverse, this.scratch) - face : 0;
    // Standing free for the first time since the mount or the landing: the felt lean as it is now.
    if (Number.isNaN(this.deviation)) this.deviation = sensed;
    else this.deviation += (sensed - this.deviation) * (1 - Math.exp(-h / PITCH_REFERENCE_TIME));
    // The lean that puts the feet's pressure at the trim's target: off the felt vertical by asin(cop / L).
    const offset = Math.asin(Math.max(-0.9, Math.min(0.9, cop / length)));
    this.reference = face + this.deviation + offset;
    // The ankle stiffens with activation (PITCH_ACTIVATION_MAX; 1: its base).
    const weight = mass * WATER.gravity;
    if (Number.isNaN(this.activation)) this.activation = load;
    else this.activation += (load - this.activation) * (1 - Math.exp(-h / PITCH_ACTIVATION_TIME));
    const stiffening = Math.max(1, Math.min(PITCH_ACTIVATION_MAX, this.activation / weight));
    this.stiffness = PITCH_ANKLE * weight * length * stiffening;
    const damping = PITCH_DAMPING_TIME * this.stiffness;
    // The body's own lean from the vertical and its rate (the vestibular sense).
    const lean = this.deckPitch + this.pitch.angle;
    const leanRate = Number.isNaN(this.lastLean) ? rate : (lean - this.lastLean) / h;
    this.lastLean = lean;
    // The command: the ankle's angle that puts the body on its reference, with the stretch that holds its weight off
    // the felt vertical there (the trim's target), and the balance's own feedback on the lean and its rate.
    const forward = this.reference - this.deckPitch - (length * load * Math.tan(offset)) / this.stiffness;
    const feedback = PITCH_LEAN_GAIN * (this.reference - lean) - PITCH_RATE_GAIN * leanRate;
    const command = forward + feedback;
    // Delayed PITCH_DELAY and lagged PITCH_MOTOR_LAG; a fresh loop starts on its command.
    this.clock += h;
    this.push(this.clock, command);
    const delayed = this.at(this.clock - PITCH_DELAY);
    if (Number.isNaN(this.lagged)) this.lagged = delayed;
    else this.lagged += (delayed - this.lagged) * (1 - Math.exp(-h / PITCH_MOTOR_LAG));
    this.rest = this.lagged;
    this.active = this.lagged - forward;
    this.pitch.rate = rate;
    // Backward Euler on the ankle, as the bank's: over the substep the lean moves at its rate after the solve.
    this.implicit = this.stiffness * h + damping;
    this.torque = this.stiffness * (this.pitch.angle - this.rest) + this.implicit * rate;
  }

  /** Records a command at time `t` and drops those older than the delay needs (keeping one before it). */
  private push(t: number, value: number): void {
    let capacity = this.times.length;
    while (this.count >= 2 && this.times[(this.head + 1) % capacity] <= t - PITCH_DELAY) {
      this.head = (this.head + 1) % capacity;
      this.count -= 1;
    }
    if (this.count === capacity) {
      const times = new Float64Array(capacity * 2);
      const commands = new Float64Array(capacity * 2);
      for (let i = 0; i < capacity; i += 1) {
        times[i] = this.times[(this.head + i) % capacity];
        commands[i] = this.commands[(this.head + i) % capacity];
      }
      this.times = times;
      this.commands = commands;
      this.head = 0;
      capacity *= 2;
    }
    const at = (this.head + this.count) % capacity;
    this.times[at] = t;
    this.commands[at] = value;
    this.count += 1;
  }

  /** The command at time `t`, interpolated; before the first, the first. */
  private at(t: number): number {
    const capacity = this.times.length;
    const first = this.head;
    if (t <= this.times[first]) return this.commands[first];
    for (let i = 1; i < this.count; i += 1) {
      const b = (first + i) % capacity;
      if (this.times[b] >= t) {
        const a = (first + i - 1) % capacity;
        const span = this.times[b] - this.times[a];
        return span > 0 ? this.commands[a] + ((t - this.times[a]) / span) * (this.commands[b] - this.commands[a]) : this.commands[b];
      }
    }
    return this.commands[(first + this.count - 1) % capacity];
  }

  /**
   * The ninth row and column of the board's N × N standing solve (`AttachedRider.coupleStanding`): the body's speed
   * along `forward` (world). `m` the body's mass, `arm` its line of force from the board's centre of mass, `carried`
   * where it is carried from it, `push` the rider's momentum the constraint must supply (h F − m mismatch), `length` the leg's.
   */
  couple(system: Float64Array, rhs: Float64Array, N: number, h: number, m: number, forward: Vector3, arm: Vector3, carried: Vector3, push: Vector3, length: number): void {
    const f = forward;
    const af = this.scratch.crossVectors(arm, f);
    const fv = [f.x, f.y, f.z];
    const afv = [af.x, af.y, af.z];
    const bf = this.scratch.crossVectors(carried, f);
    const bfv = [bf.x, bf.y, bf.z];
    for (let i = 0; i < 3; i += 1) {
      system[i * N + 8] += m * fv[i];
      system[8 * N + i] += m * fv[i];
      system[(3 + i) * N + 8] += m * afv[i];
      system[8 * N + 3 + i] += m * bfv[i];
    }
    system[8 * N + 8] += m + (h * this.implicit) / (length * length);
    // The ankle pushes the body back along its forward axis by its torque over the leg's length.
    rhs[8] += f.dot(push) - (h * this.torque) / length;
  }
}
