import { Quaternion, Vector3 } from 'three';
import { WATER } from './hullForces';

/**
 * The new surfer's standing body, step 3.1 (`AttachedRiderOptions.rider` 'new', the `?rider=new` dev switch;
 * docs/research/new-rider/design.md §1 and §7, the advisor's ruling 29; docs/research/new-rider/3.1).
 *
 * Standing, the old rider's centre of mass is carried along the board: kinematic drives keep it plumb in pitch while
 * the board pitches under it, and pull it back to its posture along the board. Here the body is free along the board
 * too: its speed along its own forward axis is a ninth unknown in the board's solve (with the leg's rate along its up
 * and the bank's across it). Nothing moves it there but forces with a reaction on the board at the feet:
 * - **the pitch ankle,** a passive spring and damper between the leg line and the deck's normal, about a rest. The
 *   rest is where the body balances with the feet's pressure at the trim's target (`copTarget`, W/S and Snap): the
 *   reference lean is the board's specific force at the feet, low-passed (what the body feels as "down"), with the
 *   face's normal under the board as its feed-forward (what the rider sees ahead), and the rest adds the ankle's own
 *   stretch that holds the body's weight off that line when the pressure is asked away from the middle;
 * - **gravity,** which tips the body off its feet as an inverted pendulum (explicit, through the leg's line).
 * The body's frame is the heading, then the leg line's pitch, then its bank, so the body leans with the face.
 *
 * The knees (§1): a softer leg spring, and a strength cap in place of `MAX_LOAD`: two knees of KNEE_TORQUE each hold a
 * push along the leg of at most 2 τ / d, d the knee's offset from the hip–ankle line of two BONE_LENGTH bones. Past it
 * the knees yield and spend their travel.
 *
 * The values are the design's, provisional. The rest of the standing rider (the bank law and its roll drive, the leg's
 * load and rest, the swing, the twist, 32 substeps) is the old one's (`AttachedRider`).
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
 * The pitch ankle's passive stiffness, in m g L (L the leg's length: the centre of mass over the feet): the top of the
 * design's sourced 0.7–1.2. Below 1 the body topples without an active loop (3.2 brings one); at 1.2 it stands on
 * its own, softly: the body and the board are joined along it by only (k − m g L) / L², about 180 N/m, and under a
 * load over 1.2 g (a carve's, a bump's) the body topples in pitch (docs/research/new-rider/3.1, measured).
 */
export const PITCH_ANKLE = 1.2;
/** The pitch ankle's damping over its stiffness, s: the bank ankle's ratio (80 over 800 N·m/rad). */
export const PITCH_DAMPING_TIME = 0.1;
/**
 * How long the felt lean's difference from the face's normal is smoothed, s, on top of the specific force's own
 * SPECIFIC_FORCE_TIME: the reference's slow part; the face's normal gives the fast part. The one tuning round
 * (docs/research/new-rider/3.1): 0.5 s lagged the felt lean, and the soft passive ankle let the body sit ahead of it
 * by about five times the lag (it fell on a 20° drop from 4 m/s); 0.2 s and 0.1 s hold the drop, 0.1 s the better.
 */
export const PITCH_REFERENCE_TIME = 0.1;
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
  }

  /** Not standing free (landing, lying): the felt lean starts again when the body next stands free. */
  idle(): void {
    this.deviation = Number.NaN;
    this.torque = 0;
    this.speed = 0;
    this.speedAfter = 0;
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
   * board from their middle (m), `waterUp` the face's normal under the board and `felt` the low-passed specific force at
   * the feet (gravity less their acceleration), both world.
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
    this.stiffness = PITCH_ANKLE * mass * WATER.gravity * length;
    const damping = PITCH_DAMPING_TIME * this.stiffness;
    // There the ankle holds the body's weight off the felt vertical: L × load × tan of the offset.
    this.rest = this.reference - this.deckPitch - (length * load * Math.tan(offset)) / this.stiffness;
    this.pitch.rate = rate;
    // Backward Euler on the ankle, as the bank's: over the substep the lean moves at its rate after the solve.
    this.implicit = this.stiffness * h + damping;
    this.torque = this.stiffness * (this.pitch.angle - this.rest) + this.implicit * rate;
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
