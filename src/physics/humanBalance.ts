/**
 * The new surfer's balance as a human's, step 3.2 (`AttachedRiderOptions.rider` 'new', the `?rider=new` dev switch;
 * docs/research/new-rider/design.md §2 and §6, the advisor's ruling 29; docs/research/new-rider/3.2).
 *
 * Standing, the body is a free centre of mass on the board (`AttachedRider.freeBody`): nothing carries it across or
 * along the board, so it stays up only by what its feet, hips, knees and arms do. This file holds what a human balance
 * adds to that body:
 * - **the delay line:** what the senses read (the body's own lean and its rate, the vestibular sense; the soles'
 *   pressure) reaches the muscles BALANCE_DELAY s late, and the muscles follow through a first-order MOTOR_LAG. The
 *   passive ankle (its spring and damper, in the solve) acts at once and carries the fast part;
 * - **the order of the moves** (Horak and Nashner 1986): the ankle first, within the feet; the hip once the feet's
 *   pressure passes HIP_SHARE of their reach; the knees lower once the hip passes KNEE_SHARE of its range, or the capture
 *   point leaves the feet, at the crouch's pace and within the stance's travel; the arms out with the knees, which
 *   raises the hip rotor's inertia from SWING_INERTIA_SET to SWING_INERTIA_ARMS;
 * - **the stance room** (the design's table, `stanceRoom`): how much each stance leaves for those moves;
 * - **the capture point** (Hof, Gazendam and Sinke 2005): the centre of mass plus its velocity over ω₀ = √(g_eff / h),
 *   both relative to the feet and across the felt vertical. Past the feet's edge by more than the room still left can
 *   catch, and with the centre of mass itself past the edge, the weight has passed the feet: a fall, by physics;
 * - **the reserve** (design §6): the least of the capture point's margin, the grip left and the knees' strength left.
 *
 * Its roll gains came from `rollModel.ts` (`humanRollModes`, docs/research/new-rider/3.2/model.probe.ts). Work in
 * progress: with them the bars do not pass (docs/research/new-rider/3.2/README.md).
 */

/** The active loops' delay, s (leg postural responses start at about 90–100 ms; Nashner 1977). */
export const BALANCE_DELAY = 0.1;
/** The muscles' lag behind the command, s (provisional; the design's). */
export const MOTOR_LAG = 0.05;
/**
 * The roll's gains (`AttachedRider.humanBank`, δ = K_ref θ_ref − G θ − G_r θ̇ on the delayed senses), from the roll model
 * (`rollModel.ts` `humanRollModes`; docs/research/new-rider/3.2/model.probe.ts) and the round-1 sweep in the probes:
 * - HUMAN_BANK_GAIN, rad of rest per rad of bank: 0. With the delay any gain on the angle rings at about 1 Hz (the
 *   model at the carve lab's turn, 1.3–1.6 times the rail), or a negative one if the turn is stronger (G ≈ 3 and more);
 * - HUMAN_BANK_RATE_GAIN, s: 0.1 (the model's best at the carve lab's turn; margins in the README);
 * - HUMAN_BANK_FORWARD, rad of rest per rad of lean asked: 0.1 (the lean as a feed-forward, the model's steady rest
 *   order of size; the swept 0.1–0.4 all fall in the held carves).
 * These do not pass the bars (README): the free roll grows at 1.2–1.9 Hz after a kick for every law tried.
 */
export const HUMAN_BANK_GAIN = 0;
export const HUMAN_BANK_RATE_GAIN = 0.1;
export const HUMAN_BANK_FORWARD = 0.1;
/**
 * The ankle across (toes and heels: the surfer stands side-on, so this is the human's own sagittal ankle), passive, at
 * once: N·m/rad and N·m·s/rad, the old rider's (the roll model's pick, about 1.4 m g h at 0.8 m). Measured intrinsic
 * ankle stiffness in standing is 0.44–0.93 m g h (Vlutters et al. 2015), 0.91 (Loram and Lakie 2002), 0.08–0.75 across
 * postures (Amiri and Kearney 2020): always under the toppling stiffness, so 800 is already above a braced human's.
 * Doubled (a braced 1,600 and 160, swept) it did not damp the free roll (README).
 */
export const HUMAN_ANKLE_STIFFNESS = 800;
export const HUMAN_ANKLE_DAMPING = 80;
/** The hip takes over past this share of the feet's reach (the design's order). */
export const HIP_SHARE = 0.8;
/** The knees lower past this share of the hip's range (the design's order). */
export const KNEE_SHARE = 0.7;
/** The hip rotor's inertia across, kg·m²: the trunk and head with the arms in (6), and with the arms out (10) [design, I]. */
export const SWING_INERTIA_SET = 6;
export const SWING_INERTIA_ARMS = 10;
/** How fast the arms go out and come back, s (with the knees: the crouch's pace). */
export const ARMS_TIME = 0.15;
/** Once the trigger is gone, the knees come back up over this, s. */
export const KNEE_RETURN_TIME = 0.6;
/** The knees go all the way down (the stance's travel) once the capture point is this far past the feet's edge, m; less, in proportion. */
export const KNEE_PAST_FULL = 0.15;

/** What a stance leaves the balance (design §2): the knees' travel left, m; the hip's range, rad; the arms free (1) or committed (0). */
export interface StanceRoom {
  kneeTravel: number;
  hipRange: number;
  arms: number;
}

/**
 * The design's stance room table, by the leg's depth below the riding stance, m (the crouch ladder: the riding stance
 * 0, the pumping crouch 0.195, Compress and Snap 0.3, the tube tuck 0.45), piecewise linear between them:
 *
 * | Stance | Depth | Knee travel left | Hip range | Arms |
 * |---|---|---|---|---|
 * | Tall (the riding stance) | 0 | 0.30 m | ±1.2 rad | free |
 * | Pumping crouch | 0.195 | 0.15 m | ±0.8 rad | free |
 * | Compress / Snap | 0.30 | 0.05 m | ±0.4 rad | committed |
 * | Tube tuck | 0.45 | 0 | ±0.3 rad | — |
 */
export function stanceRoom(depth: number): StanceRoom {
  const d = Math.max(0, depth);
  const at = (a: number, b: number, from: number, to: number) => a + ((b - a) * (d - from)) / (to - from);
  if (d <= 0.195) return { kneeTravel: at(0.3, 0.15, 0, 0.195), hipRange: at(1.2, 0.8, 0, 0.195), arms: 1 };
  if (d <= 0.3) return { kneeTravel: at(0.15, 0.05, 0.195, 0.3), hipRange: at(0.8, 0.4, 0.195, 0.3), arms: at(1, 0, 0.195, 0.3) };
  return { kneeTravel: Math.max(0, at(0.05, 0, 0.3, 0.45)), hipRange: Math.max(0.3, at(0.4, 0.3, 0.3, 0.45)), arms: 0 };
}

/** A time-stamped ring of channels: written now, read `delay` ago (interpolated; before the first sample, the first). */
export class DelayLine {
  private times: Float64Array;
  private values: Float64Array;
  private head = 0;
  private count = 0;

  constructor(private readonly channels: number, private readonly span: number, capacity = 256) {
    this.times = new Float64Array(capacity);
    this.values = new Float64Array(capacity * channels);
  }

  reset(): void {
    this.head = 0;
    this.count = 0;
  }

  get empty(): boolean {
    return this.count === 0;
  }

  /** Record `values` at time `t`, dropping samples older than the span needs (keeping one before it). */
  push(t: number, ...values: number[]): void {
    let capacity = this.times.length;
    while (this.count >= 2 && this.times[(this.head + 1) % capacity] <= t - this.span) {
      this.head = (this.head + 1) % capacity;
      this.count -= 1;
    }
    if (this.count === capacity) {
      const times = new Float64Array(capacity * 2);
      const store = new Float64Array(capacity * 2 * this.channels);
      for (let i = 0; i < capacity; i += 1) {
        const from = (this.head + i) % capacity;
        times[i] = this.times[from];
        for (let c = 0; c < this.channels; c += 1) store[i * this.channels + c] = this.values[from * this.channels + c];
      }
      this.times = times;
      this.values = store;
      this.head = 0;
      capacity *= 2;
    }
    const at = (this.head + this.count) % capacity;
    this.times[at] = t;
    for (let c = 0; c < this.channels; c += 1) this.values[at * this.channels + c] = values[c] ?? 0;
    this.count += 1;
  }

  /** Channel `channel` at time `t`. */
  at(t: number, channel: number): number {
    const capacity = this.times.length;
    const n = this.channels;
    const first = this.head;
    if (this.count === 0) return 0;
    if (t <= this.times[first]) return this.values[first * n + channel];
    for (let i = 1; i < this.count; i += 1) {
      const b = (first + i) % capacity;
      if (this.times[b] >= t) {
        const a = (first + i - 1) % capacity;
        const span = this.times[b] - this.times[a];
        const va = this.values[a * n + channel];
        return span > 0 ? va + ((t - this.times[a]) / span) * (this.values[b * n + channel] - va) : this.values[b * n + channel];
      }
    }
    return this.values[((first + this.count - 1) % capacity) * n + channel];
  }
}

/** The channels the senses write (`HumanBalance.sense`). */
const BANK = 0;
const BANK_RATE = 1;
const CAPTURE_OUT = 2;

/** The capture point against the feet, from `HumanBalance.capture`. */
export interface CaptureState {
  /** The capture point from the feet's middle across and along the deck, m (board +x, +z). */
  across: number;
  along: number;
  /** How far past the feet's edge it is, m (0 inside). */
  past: number;
  /** The centre of mass itself past the feet's edge (projected along the felt vertical). */
  weightPast: boolean;
  /** What the room still left can catch past the edge, m (the way it is past), and whether it is past by more. */
  reach: number;
  beyond: boolean;
  /** The capture point's margin, 0–1: 1 at the feet's middle, 0 at the edge plus the room's reach. */
  margin: number;
  /** ω₀, 1/s, and the centre of mass's height over the feet along the felt vertical, m. */
  omega: number;
  height: number;
  /** The centre of mass's own place across the felt vertical, m, and its speed across it, m/s (board +x), and the felt vertical's tilt toward +x, rad: for probes. */
  pointAcross: number;
  speedAcross: number;
  tiltAcross: number;
}

/** The new surfer's human balance: the delay line, the roll loop's rest, the order of the moves, the capture point and the reserve. */
export class HumanBalance {
  private readonly line = new DelayLine(3, BALANCE_DELAY + 0.02);
  private clock = 0;
  /** The roll's lagged ankle rest, rad; the body's bank the latest substep (NaN before the first), rad. */
  rollRest = Number.NaN;
  private lastBank = Number.NaN;
  /** The body's own bank rate, rad/s (the vestibular sense), the latest substep. */
  bankRate = 0;
  /** The hip's share of the roll's command now (what it asks past HIP_SHARE of the feet's reach), rad of rest. */
  hipDemand = 0;
  /** The knees' drop asked by the balance, 0–1 of the stance's travel left, and the arms out, 0–1. */
  knees = 0;
  arms = 0;
  /** Why the knees are going down now: the hip near its range, or the capture point off the feet. */
  kneeCause: 'none' | 'hip' | 'capture' = 'none';
  /** The latest capture point (`capture`). */
  readonly state: CaptureState = { across: 0, along: 0, past: 0, weightPast: false, reach: 0, beyond: false, margin: 1, omega: 0, height: 0, pointAcross: 0, speedAcross: 0, tiltAcross: 0 };
  /** The time the capture point last left the feet (NaN while inside), on the balance's clock, s. */
  leftFeetAt = Number.NaN;
  /** The balance's own clock, s. */
  get time(): number {
    return this.clock;
  }

  /** A new mount, or not standing free: nothing sensed, no move under way. */
  reset(): void {
    this.line.reset();
    this.rollRest = Number.NaN;
    this.lastBank = Number.NaN;
    this.bankRate = 0;
    this.hipDemand = 0;
    this.knees = 0;
    this.arms = 0;
    this.kneeCause = 'none';
    this.leftFeetAt = Number.NaN;
    this.state.margin = 1;
    this.state.past = 0;
    this.state.weightPast = false;
    this.state.beyond = false;
  }

  /**
   * One substep's senses, written to the delay line: the body's own bank, rad from the vertical (the vestibular sense;
   * its rate the bank's change since the latest substep), and how far the capture point is past the feet's edge, m.
   * Returns the vestibular bank rate, rad/s.
   */
  sense(h: number, bank: number): number {
    this.clock += h;
    this.bankRate = Number.isNaN(this.lastBank) ? 0 : (bank - this.lastBank) / h;
    this.lastBank = bank;
    this.line.push(this.clock, bank, this.bankRate, this.state.past);
    return this.bankRate;
  }

  /** The body's own bank, rad, and its rate, rad/s, as sensed BALANCE_DELAY ago. */
  sensedBank(): number {
    return this.line.at(this.clock - BALANCE_DELAY, BANK);
  }

  sensedBankRate(): number {
    return this.line.at(this.clock - BALANCE_DELAY, BANK_RATE);
  }

  /** The muscles' lag on the roll's command: `command` followed through MOTOR_LAG, from its first value. Returns the rest, rad. */
  lagRest(h: number, command: number): number {
    if (Number.isNaN(this.rollRest)) this.rollRest = command;
    else this.rollRest += (command - this.rollRest) * (1 - Math.exp(-h / MOTOR_LAG));
    return this.rollRest;
  }

  /** How far past the feet's edge the capture point was BALANCE_DELAY ago, m (0 inside). */
  get sensedCapturePast(): number {
    return this.line.at(this.clock - BALANCE_DELAY, CAPTURE_OUT);
  }

  /**
   * The knees and arms (the design's steps 3 and 4): lower once the hip has used KNEE_SHARE of its `range` (`hipAngle`,
   * rad: how far past it, over the rest of the range), or the capture point was off the feet (how far past their edge,
   * over KNEE_PAST_FULL), as sensed BALANCE_DELAY ago; in proportion, through the motor lag, as far as the stance's
   * travel. The arms go out with them. With neither, both come back over KNEE_RETURN_TIME and ARMS_TIME.
   */
  strategies(h: number, hipAngle: number, room: StanceRoom): void {
    const hip = room.hipRange > 0 ? Math.max(0, Math.min(1, (Math.abs(hipAngle) / room.hipRange - KNEE_SHARE) / (1 - KNEE_SHARE))) : 0;
    const capture = Math.max(0, Math.min(1, this.sensedCapturePast / KNEE_PAST_FULL));
    this.kneeCause = capture > 0 && capture >= hip ? 'capture' : hip > 0 ? 'hip' : 'none';
    const asked = room.kneeTravel > 0 ? Math.max(hip, capture) : 0;
    this.knees += (asked - this.knees) * (1 - Math.exp(-h / (asked > this.knees ? MOTOR_LAG : KNEE_RETURN_TIME)));
    const arms = Math.max(hip, capture) > 0 ? room.arms : 0;
    this.arms += (arms - this.arms) * (1 - Math.exp(-h / ARMS_TIME));
  }

  /** The hip rotor's inertia across with the arms as they are, kg·m². */
  get swingInertia(): number {
    return SWING_INERTIA_SET + this.arms * (SWING_INERTIA_ARMS - SWING_INERTIA_SET);
  }

  /**
   * The capture point (Hof et al. 2005) against the feet. `offset` is the centre of mass from the feet's middle and
   * `velocity` its velocity relative to the feet there, m and m/s in the board's frame (x across, y up, z along);
   * `felt` the felt vertical there (the feet's specific force, m/s², board frame); `halfAcross` the feet's half-width
   * across, and `alongFront` / `alongBack` their reach from the middle toward the nose and the tail, m; `reachAcross`
   * and `reachAlong` what the room left can still catch past the edge each way, m.
   */
  capture(offset: { x: number; y: number; z: number }, velocity: { x: number; y: number; z: number }, felt: { x: number; y: number; z: number },
    halfAcross: number, alongFront: number, alongBack: number, reachAcross: number, reachAlong: number): CaptureState {
    const s = this.state;
    const g = Math.hypot(felt.x, felt.y, felt.z);
    const nx = g > 1e-6 ? felt.x / g : 0;
    const ny = g > 1e-6 ? felt.y / g : 1;
    const nz = g > 1e-6 ? felt.z / g : 0;
    const height = Math.max(0.2, offset.x * nx + offset.y * ny + offset.z * nz);
    const omega = Math.sqrt(Math.max(0.5, g) / height);
    // Across the felt vertical, then onto the deck along it (the point under the centre of mass where the push line meets the deck).
    const along = velocity.x * nx + velocity.y * ny + velocity.z * nz;
    const px = offset.x - height * nx;
    const pz = offset.z - height * nz;
    const vx = velocity.x - along * nx;
    const vz = velocity.z - along * nz;
    s.across = px + vx / omega;
    s.pointAcross = px;
    s.speedAcross = vx;
    s.tiltAcross = Math.atan2(nx, ny);
    s.along = pz + vz / omega;
    s.height = height;
    s.omega = omega;
    const pastX = Math.max(0, Math.abs(s.across) - halfAcross);
    const pastZ = Math.max(0, s.along - alongFront, -s.along - alongBack);
    s.past = Math.max(pastX, pastZ);
    // Unrecoverable once past the edge by more than the reach that way.
    s.beyond = pastX > reachAcross || pastZ > reachAlong;
    s.reach = pastX >= pastZ ? reachAcross : reachAlong;
    s.weightPast = Math.abs(px) > halfAcross || pz > alongFront || -pz > alongBack;
    // The margin across (the feet's narrow way) and along, each over its edge plus the reach.
    const marginX = 1 - Math.abs(s.across) / (halfAcross + reachAcross);
    const marginZ = s.along >= 0 ? 1 - s.along / (alongFront + reachAlong) : 1 - -s.along / (alongBack + reachAlong);
    s.margin = Math.max(0, Math.min(1, marginX, marginZ));
    if (s.past > 0) {
      if (Number.isNaN(this.leftFeetAt)) this.leftFeetAt = this.clock;
    } else {
      this.leftFeetAt = Number.NaN;
    }
    return s;
  }

  /** Whether the weight has passed the feet beyond recovery: the capture point past the edge by more than the room's reach, and the centre of mass past the edge. */
  get fallen(): boolean {
    return this.state.beyond && this.state.weightPast;
  }
}

/**
 * What a rotor of `inertia`, kg·m², driven at up to `torque`, N·m, can still give the body before it reaches its
 * range, `left` rad away (accelerating all the way, then stopped at its end): an angular impulse √(2 I τ left), N·m·s.
 */
export function rotorImpulse(inertia: number, torque: number, left: number): number {
  return Math.sqrt(2 * inertia * torque * Math.max(0, left));
}
