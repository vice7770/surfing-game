import { Quaternion, Vector3 } from 'three';
import type { BoardBody } from './BoardBody';
import { REFERENCE_RIDER } from './boardReference';
import { LIP_CONTACT, LIP_QUERY_MARGIN, type LipContactParcel, type LipParcelSource } from './DetachedSurfer';
import type { BoardShape } from './boardShape';
import { WATER } from './hullForces';
import { SEAWATER_DENSITY as SEAWATER } from './PhysicalSurfWater';
import { createWaterSample } from './SurfWater';
import { RIDER_PARTS, deckHeight, postureCenter, riderPartMasses, riderPartVolumes, riderPose, stanceFeet, type PosePhase, type StanceName, type SupportRegion } from './riderPosture';
import type { SurfWater } from './SurfWater';
import type { StrokeSplash } from '../wave/SprayCloud';

/**
 * Contact limits of a body on a waxed deck (modelling choices, not measured):
 * friction of feet and of a prone body, the most a leg can push in body
 * weights, how long the rider can be airborne over the board, and how far the
 * body can be pushed off its posture and still recover.
 */
const FOOT_FRICTION = 0.9;
const PRONE_FRICTION = 0.7;
/**
 * How hard a body lying on the board can hold it, body weights (a modelling
 * choice): both hands on the rails. Calibrated in P4f: 30 ghost riders on the
 * Point's practice swell for 1.5 min kept hold of the board over a steepening
 * face at 0.6 (80 cues, 6 stands, all 6 riding ≥ 3 s) where 0.3 let the face
 * lift them off (34 cues, 2 stands).
 */
const PRONE_GRIP = 0.6;
const MAX_LOAD = 4;
export const MAX_FLIGHT = 0.4;
export const RECOVERABLE_ERROR = 0.25;
/** Share of the posture error closed per substep, and the fastest correction, m/s. */
const CORRECTION = 0.2;
const MAX_CORRECTION = 0.5;
/** Drag coefficient of a body part in water (the detached surfer's value). */
const PART_DRAG = 0.9;
/**
 * Lying along the board, each part sits in the wake of the one ahead: flow
 * along the body meets this share of the parts' sphere drag. A modelling
 * choice: with it the prone body and board drag about 45 N at 1.7 m/s, near
 * what a paddler's sustained power (tens of watts) can overcome.
 */
const ALONG_BODY_SHELTER = 0.1;
/**
 * Prone paddling, alternating arms:
 * - each arm's cycle, 60 strokes a minute for both arms together;
 * - the share of it spent pulling;
 * - the pull, from 0.45 m ahead of the shoulders to the hip, beside the rail;
 * - how deep the hand goes, and the hand and forearm's drag area (C_d 1.1 × 0.06 m²).
 *
 * The stroke rate follows prone paddling studies (Volschenk et al. 2021).
 * The pull share is calibrated once, so a sustained flat-water paddle settles
 * near 1.6 m/s (plan §1.10, provisional). The hand then peaks at about 4.4 m/s
 * relative to the board, as in fast front-crawl strokes. Quasi-steady hand drag
 * leaves out the hand's added mass and lift, which the fast pull stands in for.
 */
const ARM_CYCLE = 1.0;
const PULL_SHARE = 0.32;
const REACH = 0.45;
const HIP = -0.45;
const HAND_DEPTH = 0.25;
const HAND_OUTSIDE_RAIL = 0.08;
const HAND_RADIUS = 0.08;
const HAND_DRAG_AREA = 0.066;
/**
 * The most one arm pushes or holds against the water, body weights (a modelling
 * choice): steady flat-water paddling needs at most 0.37 from a hand. The hand
 * moves on a fixed path over the board, so its drag grows with the board's
 * speed through the water; beyond this the arm gives way. Without the limit a
 * paddler buried on a steepening face drove a hand at 1.2–1.8 body weights and
 * slid off the board.
 */
const HAND_FORCE_LIMIT = 0.4;
/**
 * Steering lying down: paddling, the arm on the outside of the turn pulls
 * harder and the inside arm softer by this share; not paddling, the outside arm
 * sweeps alone. Board +x is its left, so turning left is a stronger right arm.
 */
const STEER_STROKE = 0.6;
/**
 * A paddler keeps its line: with no steering asked for, the arm on the side to
 * turn toward pulls softer and the other harder, in proportion to the heading
 * error over HOLD_ANGLE, rad, and to the yaw rate over HOLD_ANGLE / HOLD_RATE_TIME
 * (a modelling choice for the paddler's own correction; the turn comes only
 * from the strokes' drag). Steering sets a new line.
 */
const HOLD_ANGLE = (10 * Math.PI) / 180;
const HOLD_RATE_TIME = 0.5;
/**
 * Lying down, the legs trailing past the tail sit in the board's wake: flow
 * along the body meets this further share of their drag (a modelling choice).
 */
const WAKE_SHELTER = 0.5;

/** Fraction of a sphere under a level surface `depth` above its centre. */
function submergedFraction(depth: number, radius: number): number {
  if (depth <= -radius) return 0;
  if (depth >= radius) return 1;
  const wet = depth + radius;
  return (wet * wet * (3 * radius - wet)) / (4 * radius * radius * radius);
}

/**
 * Balance: the rider moves its centre of mass so the centre of pressure sits
 * where it wants it (the middle of the support, or toward a rail when steering),
 * closing the gap with time constant BALANCE_TIME. How far the body can shift,
 * across and along the board: the hips lying down, the whole upper body standing.
 */
const BALANCE_TIME = 0.15;
/** Lying down the hips shift only across the board: fore and aft is trim, not balance. */
const PRONE_SHIFT = { x: 0.1, z: 0 };
/**
 * Lying down, balance is the board's roll. A shortboard under a prone rider
 * floats awash with the body's weight above it, and on its own the pair
 * capsizes (a board tipped 15° on flat water rolls over in about 2 s). A
 * paddler keeps it level by shifting toward the high rail: m of shift per rad
 * of roll and per rad/s of roll rate (a modelling choice).
 */
const PRONE_ROLL_SHIFT = 0.4;
const PRONE_ROLL_DAMPING = 0.16;
const STANDING_SHIFT = { x: 0.35, z: 0.25 };
/**
 * Fore and aft, where the load sits is trim (a later, deliberate control), not
 * balance: standing, the rider only keeps the centre of pressure within this
 * distance of the middle of the stance, clear of the feet's edges.
 */
const TRIM_FREEDOM = 0.2;
/**
 * Standing, steering is a lean: the upper body shifts toward the rail on the
 * side to turn to (board +x is its left, the same for either stance) by up to
 * MAX_LEAN, m (about 13° at the centre of mass), smoothed like the balance
 * shift. The board settles at whatever roll balances that weight on its hull,
 * fins and rail, with no feedback on the roll to ring. Balance then only keeps
 * the centre of pressure within LATERAL_FREEDOM of the middle of the feet.
 */
const MAX_LEAN = 0.2;
const LATERAL_FREEDOM = 0.06;
/** Below this load, in body weights, the centre of pressure says nothing and the rider does not rebalance. */
const BALANCE_LOAD = 0.1;
/** The fastest the body shifts, m/s, and accelerates, m/s² (so balance never jerks the contact), and how long the centre of pressure it reacts to is smoothed, s. */
const MAX_SHIFT_SPEED = 0.6;
const MAX_SHIFT_ACCELERATION = 3;
/** Standing, the rider leans into turns faster: time constant, s, speed, m/s, and acceleration, m/s². */
const STANDING_BALANCE_TIME = 0.15;
const STANDING_SHIFT_SPEED = 0.6;
const STANDING_SHIFT_ACCELERATION = 3;
const COP_SMOOTHING = 0.05;

/**
 * Standing, a push along the deck (a lip strike) sways the body off its feet as
 * an inverted pendulum, ω₀ = √(g / height). Balance moves the centre of pressure
 * within the support to bring the capture point, sway + rate/ω₀, back at rate
 * 1/SWAY_RECOVERY, s; a push that puts the capture point beyond the feet cannot
 * be caught and the body topples (push-recovery capture point; the rate is a
 * modelling choice).
 */
const SWAY_RECOVERY = 0.15;

/** Knee flex that absorbs a landing: natural frequency, rad/s, and the deepest crouch, m. */
const FLEX_FREQUENCY = 5;
const MAX_FLEX = 0.35;

export interface AttachedRiderOptions {
  mass?: number;
  stance?: StanceName;
  phase?: PosePhase;
}

/** The rider's phase: a posture, or lying back down after a failed pop-up. */
export type RiderPhase = PosePhase | 'recover';

/** Why a pop-up found no support: the contact strained lately, the board sank into the surface, the feet landed under water, or there was no water. */
export type StandRefusal = 'strained' | 'sinking' | 'feet under water' | 'no water';

/** The latest pop-up: how it ended, how long it took to stand, s, and its peak landing load, body weights, with the front foot's share then. */
export interface PopUpReport {
  outcome: 'none' | 'rising' | 'stood' | 'no support';
  /** For 'no support', which check refused the stand. */
  refusal?: StandRefusal;
  duration: number;
  landingPeak: number;
  frontShare: number;
}

/**
 * The pop-up's timing, from the laboratory study (Borgonovo-Santos et al. 2021):
 * 1.20 s in all, about 60 % pushing up and 40 % bringing the feet down. After
 * landing the body rises from the landing crouch to the riding stance, and a
 * failed attempt lies back down; both of those times are modelling choices.
 */
const PUSH_TIME = 0.72;
const LANDING_TIME = 0.48;
const SETTLE_TIME = 0.8;
const RECOVER_TIME = 0.6;
/**
 * A stand needs the deck under the feet no deeper than this, m, and the board
 * sinking into the surface slower than this, m/s. Checked in P4f and kept: from
 * 0.2 m a static 10° face lets the rider stand; 0.15 m stood more riders but no
 * more rides of 3 s; a sinking limit of 0.8 m/s changed nothing.
 */
const FEET_DEPTH = 0.1;
const SINK_RATE = 0.3;
/** …and the contact bound by its limits for no more than this long lately, s. */
const STAND_STRAIN = 0.05;
/**
 * The pop-up cue, shown and never acted on: planing pressure carries at least
 * this share of board and rider (lying down, the body's own buoyancy carries
 * much of the rest), the board moves at least this fast, m/s, and
 * the surface falls along its heading at least this steeply (Kimura and
 * Kakinuma 2015: crest-relative speed and a place on the face). Modelling values.
 */
const CUE_SUPPORT = 0.35;
const CUE_SPEED = 2;
const CUE_SLOPE = Math.tan((2 * Math.PI) / 180);

/** Minimum-jerk blend 0 → 1, and its rate per unit s. */
function minimumJerk(s: number): number {
  return s * s * s * (10 - 15 * s + 6 * s * s);
}

function minimumJerkRate(s: number): number {
  return 30 * s * s * (1 - s) * (1 - s);
}

/** Why a rider left the board: tipped off its support, slipped, lost the board, or buckled under load. */
export type RiderSeparation = 'balance' | 'foot slip' | 'lost board' | 'impact';

/** Which limit last bound the contact impulse. */
type ContactLimit = 'none' | 'flight' | 'tip' | 'slip' | 'impact';

/** How far back, s, the contact's recent limits count toward a separation's cause. */
const CAUSE_MEMORY = 0.2;

const SEPARATION: Record<Exclude<ContactLimit, 'none'>, RiderSeparation> = {
  flight: 'lost board', tip: 'balance', slip: 'foot slip', impact: 'impact',
};

/** Work done on the rider since it mounted, J. */
export interface RiderWork {
  gravity: number;
  water: number;
  contact: number;
  /** Done by lip parcels striking the body. */
  lip: number;
}

type V3 = { x: number; y: number; z: number };

const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);

function cross(a: V3, b: V3, out: Vector3): Vector3 {
  return out.set(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

/**
 * The rider as a separate body on the board (board plan §3.2 and §5, B2): a
 * posture of the detached surfer's seven parts, placed on the board for its
 * phase. While the contact holds, the rider joins the board's implicit solve as
 * one composite body:
 * - prone and push, the body lies rigid on the deck and turns with the board;
 * - standing and landing, it is carried at the stance point on the deck and
 *   stays upright while the board pitches and rolls under the feet, turning
 *   only with the board's heading (a point mass; its own spin is not modelled).
 *
 * The contact impulse that follows is checked against what a body standing or
 * lying on a deck can give:
 * - it can only push;
 * - its line passes through the rider's centre of mass and must meet the deck
 *   inside the phase's support (the feet, or chest and hands);
 * - it stays inside a friction cone, and under a leg-load cap.
 *
 * Its line through the centre of mass is also how weight shift torques the
 * board. An impulse outside that set is projected onto it, and the board and
 * rider are solved apart for that substep, so the rider tips, slips or flies
 * rather than receiving grip that does not exist. Knee flex absorbs a landing.
 */
export class AttachedRider {
  readonly mass: number;
  readonly stance: StanceName;
  phase: RiderPhase;
  readonly popUpReport: PopUpReport = { outcome: 'none', duration: 0, landingPeak: 0, frontShare: 0 };
  /** Whether a pop-up would find the board planing down a face now. */
  popUpCue = false;
  /** A paddling hand pulled through the water in the latest substep. */
  stroking = false;
  /** Centre of mass, world. */
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  readonly angularVelocity = new Vector3();
  /** The body's frame: the board's while lying on it, upright on the board's heading while standing. */
  readonly orientation = new Quaternion();
  /** On the board; false once separated. */
  attached = true;
  separation?: RiderSeparation;
  /** Held by the contact this substep; false while tipping, slipping or airborne. */
  inContact = true;
  flightTime = 0;
  /** Distance of the centre of mass from where the posture puts it, m. */
  postureError = 0;
  readonly work: RiderWork = { gravity: 0, water: 0, contact: 0, lip: 0 };
  /** Impulse the lip gave the body since the latest step began, N·s. */
  readonly lastLipImpulse = new Vector3();
  /** The water's latest force on each stroking hand (left, right), N. */
  readonly handLoad = new Float64Array(2);
  /** Each hand that pulled through the water in the latest step, for the spray (G7): where, how hard, how fast. */
  readonly strokes: StrokeSplash[] = [];
  private readonly strokePool: [StrokeSplash, StrokeSplash] = [
    { x: 0, y: 0, z: 0, jx: 0, jy: 0, jz: 0, speed: 0 },
    { x: 0, y: 0, z: 0, jx: 0, jy: 0, jz: 0, speed: 0 },
  ];
  private readonly handWet = [false, false];
  /** Paddle while prone. */
  paddle = false;
  /** Standing, the requested weight shift: −1 (toward board −x, its right) to 1 (toward +x, its left). */
  steer = 0;
  /** Lying down, the heading the paddler keeps (rad from +z toward +x), and the correction it asks of the strokes now. */
  private line: number | undefined;
  private hold = 0;
  /** Buoyancy on the body at the latest substep, N. */
  readonly buoyancy = new Vector3();
  /** Contact over the latest step: mean force on the rider (N, world), centre of pressure (board frame) and more. */
  readonly contact = {
    force: new Vector3(),
    centreOfPressure: new Vector3(),
    /** Share of the load on the front foot, from where the centre of pressure falls between the feet. */
    frontShare: 0,
    /** Peak normal load in the step, body weights. */
    load: 0,
    feasible: true,
  };
  /** Part centres in the board frame (level), x y z per part. */
  readonly parts: Float64Array;
  readonly partMasses: number[];
  readonly partVolumes: number[];
  support: SupportRegion;
  upright = false;

  private readonly shape: BoardShape;
  private readonly feet: { rear: number; front: number };
  private readonly localCenter = new Vector3();
  private readonly base = new Vector3();
  private readonly localInertia = new Array<number>(9).fill(0);
  private readonly worldInertia = new Array<number>(9).fill(0);
  /** From the board's centre of mass to the rider's centre of mass (the line of force), and to where the rider is carried. */
  private readonly arm = new Vector3();
  private readonly carried = new Vector3();
  private readonly drive = new Vector3();
  private readonly external = new Vector3();
  private readonly gravity = new Vector3();
  private readonly waterForce = new Vector3();
  private readonly waterMoment = new Vector3();
  private readonly sample = createWaterSample();
  private readonly partWorld = new Vector3();
  private readonly partVelocity = new Vector3();
  private readonly flow = new Vector3();
  private readonly bodyAxis = new Vector3();
  private readonly partForce = new Vector3();
  /** Water impulses on the parts and hands over the step, and their positions, for the water's reactions. */
  private readonly reaction = new Float64Array((RIDER_PARTS.length + 2) * 3);
  private readonly reactionAt = new Float64Array((RIDER_PARTS.length + 2) * 2);
  private strokeTime = 0;
  /** A posture transition: where it started (board frame), how far along it is and how long it takes, s. */
  private readonly fromParts: Float64Array;
  private phaseTime = 0;
  private phaseDuration = 0;
  private readonly postureRate = new Vector3();
  private readonly footWorld = new Vector3();
  private popUpTime = 0;
  private readonly boardVelocity = new Vector3();
  private readonly boardSpin = new Vector3();
  private readonly impulse = new Vector3();
  private readonly projected = new Vector3();
  /** The body's up: the deck normal lying down, the vertical standing. */
  private readonly up = new Vector3();
  private readonly target = new Vector3();
  private readonly baseWorld = new Vector3();
  private readonly scratch = new Vector3();
  private readonly scratch2 = new Vector3();
  private readonly localScratch = new Vector3();
  private readonly spin = new Quaternion();
  private readonly heading = new Quaternion();
  private flex = 0;
  private flexRate = 0;
  private feasible = true;
  private limit: ContactLimit = 'none';
  /** Recent time each limit bound the contact (decaying over CAUSE_MEMORY), to name a separation's cause. */
  private readonly limitTime: Record<Exclude<ContactLimit, 'none'>, number> = { flight: 0, tip: 0, slip: 0, impact: 0 };
  /** The balance shift of the body in the board frame (x across, z along), its rate, and where the centre of pressure falls without the support's limit. */
  private readonly balance = new Vector3();
  private readonly balanceRate = new Vector3();
  private readonly desiredCop = { x: 0, z: 0 };
  private readonly smoothedCop = { x: 0, z: 0 };
  /** The contact carries enough load for its centre of pressure to guide balance. */
  private loaded = false;
  /** Where the rider wants its centre of pressure, relative to the middle of the support (steering moves it toward a rail). */
  readonly copTarget = { x: 0, z: 0 };
  /** The steering lean of the upper body across the board, m, and its rate. */
  private readonly lean = new Vector3();
  private readonly leanRate = new Vector3();
  private stepImpulse = new Vector3();
  private stepLoad = 0;
  /** The parts' centres (world) as the latest step began, for swept lip contact, and the parcels that have struck. */
  private readonly previousParts = new Float64Array(RIDER_PARTS.length * 3);
  private readonly struckBy = new Set<number>();
  private readonly lipCenter = new Vector3();
  private readonly sweepStart = new Vector3();
  private readonly sweepEnd = new Vector3();
  /** Standing, how far a push has swayed the centre of mass off its posture along the deck (board frame x and z), and how fast. */
  private readonly sway = new Vector3();
  private readonly swayRate = new Vector3();

  constructor(shape: BoardShape, options: AttachedRiderOptions = {}) {
    this.shape = shape;
    this.mass = options.mass ?? REFERENCE_RIDER.mass;
    this.stance = options.stance ?? 'regular';
    this.phase = options.phase ?? 'prone';
    this.partMasses = riderPartMasses(this.mass);
    this.partVolumes = riderPartVolumes(this.mass);
    this.feet = stanceFeet(shape);
    const pose = riderPose(shape, this.posePhase(), this.stance);
    this.parts = pose.parts.slice();
    this.fromParts = pose.parts.slice();
    this.support = pose.support;
  }

  /**
   * Start a pop-up from prone: the hands push the chest up, then the feet come
   * down onto the stance. It stands only if the board still carries the rider
   * then; otherwise the rider lies back down.
   */
  popUp(): boolean {
    if (!this.attached || this.phase !== 'prone') return false;
    this.beginTransition('push', PUSH_TIME);
    this.popUpTime = 0;
    Object.assign(this.popUpReport, { outcome: 'rising', duration: 0, landingPeak: 0, frontShare: 0, refusal: undefined });
    return true;
  }

  private posePhase(): PosePhase {
    return this.phase === 'recover' ? 'prone' : this.phase;
  }

  private beginTransition(phase: RiderPhase, duration: number, board?: BoardBody): void {
    this.fromParts.set(this.parts);
    // The new support's centre is where the centre of pressure is expected until the contact says otherwise.
    const { support } = riderPose(this.shape, phase === 'recover' ? 'prone' : phase, this.stance);
    this.desiredCop.x = this.smoothedCop.x = (support.xMin + support.xMax) / 2;
    this.desiredCop.z = this.smoothedCop.z = (support.zMin + support.zMax) / 2;
    // Changing between lying rigid and standing upright, restate where the parts
    // start in the new frame so none of them moves.
    const upright = phase === 'landing' || phase === 'standing';
    if (board && upright !== this.upright) this.remap(this.fromParts, upright, board);
    // The balance shift is folded into where the transition starts.
    this.balance.set(0, 0, 0);
    this.balanceRate.set(0, 0, 0);
    this.phase = phase;
    this.phaseTime = 0;
    this.phaseDuration = duration;
  }

  /** Advance the phase clock; at a phase's end, move on (or check whether the rider can stand). */
  private advancePhase(h: number, board: BoardBody, water: SurfWater): void {
    if (this.popUpReport.outcome === 'rising') this.popUpTime += h;
    if (this.phaseDuration === 0) return;
    this.phaseTime += h;
    if (this.phaseTime < this.phaseDuration) return;
    const ended = this.phase;
    this.phaseDuration = 0;
    if (ended === 'push') {
      this.beginTransition('landing', LANDING_TIME, board);
    } else if (ended === 'landing') {
      const refusal = this.standRefusal(board, water);
      if (!refusal) {
        this.beginTransition('standing', SETTLE_TIME, board);
        this.popUpReport.outcome = 'stood';
        this.popUpReport.duration = this.popUpTime;
      } else {
        this.beginTransition('recover', RECOVER_TIME, board);
        this.popUpReport.outcome = 'no support';
        this.popUpReport.refusal = refusal;
      }
    } else if (ended === 'recover') {
      this.fromParts.set(this.parts);
      this.phase = 'prone';
    }
  }

  /**
   * Board-frame part positions as placed in one frame, restated for the other so
   * their world positions stay put: rigid places a part at the board transform
   * of its position, upright at the stance point plus its offset turned by the
   * heading.
   */
  private remap(parts: Float64Array, toUpright: boolean, board: BoardBody): void {
    this.frame(board);
    const inverseHeading = this.spin.copy(this.heading).invert();
    const baseWorld = board.toWorld(this.base, this.baseWorld);
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      const part = this.localScratch.set(parts[i * 3], parts[i * 3 + 1], parts[i * 3 + 2]);
      let world: Vector3;
      if (toUpright) {
        world = board.toWorld(part, this.scratch);
        part.subVectors(world, baseWorld).applyQuaternion(inverseHeading).add(this.base);
      } else {
        world = this.scratch.subVectors(part, this.base).applyQuaternion(this.heading).add(baseWorld);
        board.toLocal(world, part);
      }
      parts[i * 3] = part.x;
      parts[i * 3 + 1] = part.y;
      parts[i * 3 + 2] = part.z;
    }
  }

  /** Both feet down on a deck that is not sinking away, with the load between them lately; otherwise, why not. */
  private standRefusal(board: BoardBody, water: SurfWater): StandRefusal | undefined {
    const strained = this.limitTime.flight + this.limitTime.tip + this.limitTime.slip + this.limitTime.impact;
    if (!this.inContact || strained > STAND_STRAIN) return 'strained';
    // Sinking means moving into the water surface, not just downhill along a face.
    const centre = water.sampleAt(board.position.x, board.position.y, board.position.z, this.sample);
    if (centre.outsideDomain || !centre.wet) return 'no water';
    const norm = Math.hypot(centre.slopeX, 1, centre.slopeZ);
    const into = -((board.velocity.x - centre.flowX) * -centre.slopeX + (board.velocity.y - centre.flowY) + (board.velocity.z - centre.flowZ) * -centre.slopeZ) / norm;
    if (into > SINK_RATE) return 'sinking';
    for (const z of [this.feet.rear, this.feet.front]) {
      board.toWorld(this.localScratch.set(0, deckHeight(this.shape, z), z), this.footWorld);
      const sample = water.sampleAt(this.footWorld.x, this.footWorld.y, this.footWorld.z, this.sample);
      if (sample.outsideDomain) return 'no water';
      if (sample.surfaceY - this.footWorld.y > FEET_DEPTH) return 'feet under water';
    }
    return undefined;
  }

  /** Put the rider in its posture on the board, moving with it. */
  mount(board: BoardBody): void {
    this.balance.set(0, 0, 0);
    this.balanceRate.set(0, 0, 0);
    this.updatePosture();
    this.desiredCop.x = (this.support.xMin + this.support.xMax) / 2;
    this.desiredCop.z = (this.support.zMin + this.support.zMax) / 2;
    this.smoothedCop.x = this.desiredCop.x;
    this.smoothedCop.z = this.desiredCop.z;
    this.updateInertia(board);
    this.flex = 0;
    this.flexRate = 0;
    this.frame(board);
    this.position.copy(this.target);
    this.velocity.copy(this.drive.set(0, 0, 0)).add(board.velocityAt(this.target, this.scratch2));
    this.angularVelocity.copy(this.upright ? this.scratch.set(0, board.angularVelocity.y, 0) : board.angularVelocity);
    this.attached = true;
    this.separation = undefined;
    this.limit = 'none';
    for (const limit of Object.keys(this.limitTime) as (keyof typeof this.limitTime)[]) this.limitTime[limit] = 0;
    this.inContact = true;
    this.flightTime = 0;
    this.postureError = 0;
    this.work.gravity = 0;
    this.work.water = 0;
    this.work.contact = 0;
    this.work.lip = 0;
    this.struckBy.clear();
    this.lastLipImpulse.set(0, 0, 0);
    this.sway.set(0, 0, 0);
    this.swayRate.set(0, 0, 0);
    this.markParts();
  }

  /**
   * How far the rider is from letting go, for the balance meter (plan P8): 1 in
   * the posture, 0 when the sway (standing) or the posture error reaches
   * RECOVERABLE_ERROR, the separation threshold in `endStep`.
   */
  get balanceReserve(): number {
    const sway = this.upright ? Math.hypot(this.sway.x, this.sway.z) : 0;
    return Math.max(0, 1 - Math.max(sway, this.postureError) / RECOVERABLE_ERROR);
  }

  kineticEnergy(): number {
    const linear = 0.5 * this.mass * this.velocity.lengthSq();
    if (this.upright) return linear;
    const w = this.angularVelocity;
    const I = this.worldInertia;
    return linear + 0.5 * (w.x * (I[0] * w.x + I[1] * w.y + I[2] * w.z) + w.y * (I[3] * w.x + I[4] * w.y + I[5] * w.z) + w.z * (I[6] * w.x + I[7] * w.y + I[8] * w.z));
  }

  /**
   * The state a fall body starts from when the rider lets go: its centre of
   * mass and velocity, and a body frame whose up is the head's direction (along
   * the board lying down, the rider's up standing), spinning with the rider.
   */
  handoffState(out: { center: Vector3; orientation: Quaternion; velocity: Vector3; angularVelocity: Vector3 }): typeof out {
    out.center.copy(this.position);
    out.velocity.copy(this.velocity);
    out.angularVelocity.copy(this.angularVelocity);
    out.orientation.copy(this.orientation);
    if (!this.upright) out.orientation.multiply(this.spin.setFromAxisAngle(X, Math.PI / 2));
    return out;
  }

  /** Let go of the board now (a retry, or a fall forced from outside). */
  release(cause: RiderSeparation = 'balance'): void {
    if (this.attached) this.separate(cause);
  }

  /**
   * Where the drawn body puts each of the seven points: the trunk parts at their
   * centres, the hands and feet at their tips (the hands in their stroke or on
   * the rails, the feet on the deck while standing).
   */
  renderPoint(index: number, board: BoardBody, out: Vector3): Vector3 {
    if (index < 3) return this.partPosition(index, out);
    const upright = this.phase === 'landing' || this.phase === 'standing';
    if (index === 3 || index === 4) {
      const side = index === 3 ? 0 : 1;
      if (this.phase === 'prone') {
        const stroking = (this.paddle || this.sweeping) && this.strokeEffort(side) > 0;
        const z = stroking ? this.handLocal(side, this.localScratch) : this.localScratch.set(0, 0, this.parts[1 * 3 + 2]).z;
        if (!stroking) this.localScratch.set((side === 0 ? 1 : -1) * (this.halfWidth(z) + 0.02), deckHeight(this.shape, z) + 0.02, z);
        return board.toWorld(this.localScratch, out);
      }
      if (this.phase === 'push') {
        const z = this.parts[1 * 3 + 2];
        return board.toWorld(this.localScratch.set((side === 0 ? 1 : -1) * this.halfWidth(z), deckHeight(this.shape, z), z), out);
      }
      // Arms held out from the shoulders.
      this.partPosition(index, out);
      return out.add(this.scratch2.copy(out).sub(this.partPosition(1, this.target)).multiplyScalar(0.7));
    }
    if (upright) {
      const front = (index === 5) === (this.stance === 'regular');
      const z = front ? this.feet.front : this.feet.rear;
      return board.toWorld(this.localScratch.set(0, deckHeight(this.shape, z), z), out);
    }
    // Legs lying along the board: from the hips through the leg's centre to the feet.
    this.partPosition(index, out);
    return out.add(this.scratch2.copy(out).sub(this.partPosition(0, this.target)).multiplyScalar(0.9));
  }

  private halfWidth(z: number): number {
    return this.shape.curves.width(Math.min(1, Math.max(0, z / this.shape.length + 0.5))) / 2;
  }

  /**
   * A paddling hand's place in the board frame (into `out`) at this point of its
   * stroke: pulling under water from reach to hip, or swinging forward above it.
   * Returns the hand's speed along the board while pulling (0 in recovery).
   */
  private handLocal(side: number, out: Vector3): number {
    const phase = (this.strokeTime / ARM_CYCLE + side * 0.5) % 1;
    let z: number;
    let height: number;
    let along = 0;
    if (phase < PULL_SHARE) {
      const s = phase / PULL_SHARE;
      z = REACH + ((HIP - REACH) * (1 - Math.cos(Math.PI * s))) / 2;
      height = -HAND_DEPTH;
      along = ((HIP - REACH) * Math.PI * Math.sin(Math.PI * s)) / (2 * PULL_SHARE * ARM_CYCLE);
    } else {
      const s = (phase - PULL_SHARE) / (1 - PULL_SHARE);
      z = HIP + ((REACH - HIP) * (1 - Math.cos(Math.PI * s))) / 2;
      height = 0.25 * Math.sin(Math.PI * s);
    }
    out.set((side === 0 ? 1 : -1) * (this.halfWidth(z) + HAND_OUTSIDE_RAIL), deckHeight(this.shape, z) + height, z);
    return along;
  }

  /** A part's centre in the world. */
  partPosition(index: number, out: Vector3): Vector3 {
    this.localScratch.set(this.parts[index * 3], this.parts[index * 3 + 1], this.parts[index * 3 + 2]).sub(this.localCenter);
    return out.copy(this.localScratch).applyQuaternion(this.orientation).add(this.position);
  }

  /** Called by the board at the start of each step. */
  beginStep(): void {
    this.markParts();
    this.lastLipImpulse.set(0, 0, 0);
    this.reaction.fill(0);
    this.handWet[0] = false;
    this.handWet[1] = false;
    this.reactionAt.fill(0);
    this.stepImpulse.set(0, 0, 0);
    this.stepLoad = 0;
    this.contact.feasible = true;
  }

  private markParts(): void {
    for (let i = 0; i < RIDER_PARTS.length; i += 1) this.partPosition(i, this.partWorld).toArray(this.previousParts, i * 3);
  }

  /**
   * Swept contact with an airborne lip parcel over the latest step, part by part
   * (each a sphere of its own volume), as for the fallen surfer. A bounded share
   * of the parcel's mass strikes the body, which moves as one on the board, and
   * the parcel takes the equal and opposite impulse. The body's contact with the
   * board must then take the kick, and may not. Returns 1 for a strike.
   */
  /** Let the lip strike each body part it reaches (`resolveLipContact`): the sheet is offered at its closest point to each. */
  strikeBy(lip: LipParcelSource, board: BoardBody): void {
    if (!this.attached) return;
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      const center = this.partPosition(i, this.lipCenter);
      const reach = Math.cbrt((3 * this.partVolumes[i]) / (4 * Math.PI)) + LIP_QUERY_MARGIN;
      lip.forEachContactNear(center, reach, (parcel) => this.resolveLipContact(parcel, board));
    }
  }

  resolveLipContact(parcel: LipContactParcel, board: BoardBody): number {
    if (!this.attached || this.struckBy.has(parcel.id) || !(parcel.volume > 0 && parcel.radius > 0)) return 0;
    const parcelMass = LIP_CONTACT.density * parcel.volume;
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      const current = this.partPosition(i, this.partWorld);
      const start = this.sweepStart.fromArray(this.previousParts, i * 3).sub(parcel.previousPosition);
      const end = this.sweepEnd.subVectors(current, parcel.position);
      const travel = end.sub(start);
      const radius = Math.cbrt((3 * this.partVolumes[i]) / (4 * Math.PI)) + parcel.radius;
      let fraction = 0;
      if (start.lengthSq() > radius * radius) {
        const travelled = travel.lengthSq();
        if (travelled < 1e-12) continue;
        const along = start.dot(travel);
        const discriminant = along * along - travelled * (start.lengthSq() - radius * radius);
        if (discriminant < 0) continue;
        fraction = (-along - Math.sqrt(discriminant)) / travelled;
        if (fraction < 0 || fraction > 1) continue;
      }
      const normal = start.addScaledVector(travel, fraction);
      if (normal.lengthSq() > 1e-18) normal.normalize();
      else normal.set(0, 1, 0);
      const partVelocity = cross(this.angularVelocity, this.scratch.subVectors(current, this.position), this.scratch2).add(this.velocity);
      const approach = partVelocity.sub(parcel.velocity).dot(normal);
      if (approach >= 0) continue;
      const effective = Math.min(parcelMass * LIP_CONTACT.fraction, this.mass * 0.5);
      const strike = Math.min(-approach / (1 / this.mass + 1 / effective), this.mass * LIP_CONTACT.maxDeltaSpeed);
      const impulse = normal.multiplyScalar(strike);
      const before = this.scratch.copy(this.velocity);
      this.velocity.addScaledVector(impulse, 1 / this.mass);
      if (this.upright) {
        // Along the deck the push sways the body off its feet; into the deck the legs take it.
        const local = this.sweepEnd.copy(impulse).applyQuaternion(this.spin.copy(board.orientation).invert());
        this.swayRate.x += local.x / this.mass;
        this.swayRate.z += local.z / this.mass;
      }
      this.work.lip += impulse.dot(before.add(this.velocity)) / 2;
      this.lastLipImpulse.add(impulse);
      parcel.velocity.addScaledVector(impulse, -1 / parcelMass);
      this.struckBy.add(parcel.id);
      return 1;
    }
    return 0;
  }

  /** After the board's step: the contact means, and the water's reactions to what it did to the body. */
  endStep(dt: number, water: SurfWater, board: BoardBody): void {
    this.contact.force.copy(this.stepImpulse).divideScalar(dt);
    this.contact.load = this.stepLoad;
    if ((this.phase === 'landing' || (this.phase === 'standing' && this.phaseDuration > 0)) && this.stepLoad > this.popUpReport.landingPeak) {
      this.popUpReport.landingPeak = this.stepLoad;
      this.popUpReport.frontShare = this.contact.frontShare;
    }
    this.popUpCue = this.attached && this.phase === 'prone' && this.cue(board, water);
    const { reaction, reactionAt } = this;
    for (let k = 0; k < RIDER_PARTS.length + 2; k += 1) {
      const jx = reaction[k * 3];
      const jy = reaction[k * 3 + 1];
      const jz = reaction[k * 3 + 2];
      if (jx === 0 && jy === 0 && jz === 0) continue;
      water.addReaction(reactionAt[k * 2] / dt, reactionAt[k * 2 + 1] / dt, jx, jy, jz);
    }
    this.strokes.length = 0;
    for (let side = 0; side < 2; side += 1) {
      const k = RIDER_PARTS.length + side;
      const stroke = this.strokePool[side];
      if (!this.handWet[side] || (reaction[k * 3] === 0 && reaction[k * 3 + 2] === 0)) continue;
      stroke.jx = reaction[k * 3];
      stroke.jy = reaction[k * 3 + 1];
      stroke.jz = reaction[k * 3 + 2];
      this.strokes.push(stroke);
    }
  }

  /** Planing down a face: the state the pop-up cue shows. */
  private cue(board: BoardBody, water: SurfWater): boolean {
    const weight = (board.mass + this.mass) * WATER.gravity;
    if (board.forces.pressure.y < CUE_SUPPORT * weight || board.velocity.length() < CUE_SPEED) return false;
    const forward = this.scratch.set(0, 0, 1).applyQuaternion(board.orientation).setY(0);
    if (forward.lengthSq() < 1e-6) return false;
    forward.normalize();
    const sample = water.sampleAt(board.position.x, board.position.y, board.position.z, this.sample);
    return !sample.outsideDomain && -(sample.slopeX * forward.x + sample.slopeZ * forward.z) >= CUE_SLOPE;
  }

  /** Before the board's solve: the posture's target, its drive velocity and the forces on the rider. */
  prepare(h: number, board: BoardBody, water: SurfWater): void {
    this.advancePhase(h, board, water);
    this.balanceStep(h, board);
    this.swayStep(h);
    this.updatePosture();
    this.updateInertia(board);
    this.boardVelocity.copy(board.velocity);
    this.boardSpin.copy(board.angularVelocity);
    this.arm.subVectors(this.position, board.centerOfMass);
    this.frame(board);
    // Back from the air, the knees take up the approach speed along the body's up.
    if (!this.inContact) {
      board.velocityAt(this.upright ? board.toWorld(this.base, this.scratch) : this.target, this.scratch2);
      const approach = this.scratch.subVectors(this.velocity, this.scratch2).dot(this.up);
      if (this.scratch.subVectors(this.position, this.target).dot(this.up) <= 0.02 && approach < 0) this.flexRate = approach;
    }
    this.flexStep(h);
    this.frame(board);
    // The solve carries the centre of mass rigidly with the board (a symmetric coupling). Carried at
    // the stance point while pushing through the centre of mass instead, the coupled system turned
    // singular as a carve changed its geometry, and the solve blew up.
    this.carried.subVectors(this.target, board.centerOfMass);
    // Drive: standing upright as the board rolls and pitches under the feet, the knees' flex, and a
    // bounded correction toward the posture.
    this.uprightVelocity(board, this.drive.set(0, 0, 0)).addScaledVector(this.up, this.flexRate);
    // The balance shift moves the centre of mass across the board.
    const shifted = this.shiftedShare();
    this.drive.add(this.scratch.set((this.balanceRate.x + this.leanRate.x) * shifted, 0, this.balanceRate.z * shifted).applyQuaternion(this.upright ? this.heading : board.orientation));
    // A push's sway carries the centre of mass off its feet.
    if (this.upright) this.drive.add(this.scratch.set(this.swayRate.x, 0, this.swayRate.z).applyQuaternion(board.orientation));
    // The posture's own motion (a pop-up) carries the centre of mass with it.
    this.drive.add(this.scratch.copy(this.postureRate).applyQuaternion(this.upright ? this.heading : board.orientation));
    const error = this.scratch.subVectors(this.target, this.position);
    const correction = Math.min(MAX_CORRECTION, (CORRECTION * error.length()) / h);
    if (error.lengthSq() > 0) this.drive.addScaledVector(error.normalize(), correction);
    this.gravity.set(0, -this.mass * WATER.gravity, 0);
    this.waterForces(h, board, water);
    this.external.copy(this.gravity).add(this.waterForce);
  }

  /**
   * Buoyancy and drag on each part in the water, as in the detached surfer, and
   * the paddling hands' drag against the local water; their sum and moment
   * about the centre of mass.
   */
  private waterForces(h: number, board: BoardBody, water: SurfWater): void {
    this.waterForce.set(0, 0, 0);
    this.waterMoment.set(0, 0, 0);
    this.buoyancy.set(0, 0, 0);
    const frame = this.upright ? this.heading : board.orientation;
    this.bodyAxis.set(0, 0, 1).applyQuaternion(board.orientation);
    const shelter = this.upright ? 1 : ALONG_BODY_SHELTER;
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      this.partWorld.set(this.parts[i * 3], this.parts[i * 3 + 1], this.parts[i * 3 + 2]).sub(this.localCenter).applyQuaternion(frame);
      const offset = this.localScratch.copy(this.partWorld);
      this.partWorld.add(this.position);
      this.partVelocity.copy(cross(this.angularVelocity, offset, this.scratch)).add(this.velocity);
      const radius = Math.cbrt((3 * this.partVolumes[i]) / (4 * Math.PI));
      // Lying on the board, the part of a body sphere inside the board is board, not wet body.
      const z = this.parts[i * 3 + 2];
      const onDeck = !this.upright && Math.abs(z) < this.shape.length / 2;
      const deckY = onDeck ? board.toWorld(this.localScratch.set(this.parts[i * 3], deckHeight(this.shape, z), z), this.scratch2).y : -Infinity;
      const inWake = !this.upright && z < -this.shape.length / 2;
      this.applyWater(i, water, radius, this.partVolumes[i], Math.PI * radius * radius * PART_DRAG, h, inWake ? shelter * WAKE_SHELTER : shelter, deckY);
    }
    this.stroking = false;
    if (this.phase !== 'prone' || (!this.paddle && !this.sweeping)) {
      this.line = undefined;
      this.hold = 0;
      return;
    }
    this.keepLine(board);
    this.strokeTime += h;
    for (let side = 0; side < 2; side += 1) {
      const effort = this.strokeEffort(side);
      if (!(effort > 0)) continue;
      const phase = (this.strokeTime / ARM_CYCLE + side * 0.5) % 1;
      if (phase >= PULL_SHARE) continue;
      // Pull: the hand sweeps from reach to hip beside the rail, fastest mid-stroke.
      const along = this.handLocal(side, this.localScratch);
      board.toWorld(this.localScratch, this.partWorld);
      board.velocityAt(this.partWorld, this.partVelocity).add(this.scratch.set(0, 0, along).applyQuaternion(board.orientation));
      this.applyWater(RIDER_PARTS.length + side, water, HAND_RADIUS, 0, HAND_DRAG_AREA * effort, h, 1);
    }
  }

  /** Steering without paddling: one arm sweeps. */
  private get sweeping(): boolean {
    return Math.abs(this.steer) > 0.05;
  }

  /** How hard arm `side` (0 left, at +x; 1 right) strokes, from the paddle and steer input and the paddler's own line keeping. */
  private strokeEffort(side: number): number {
    const steer = Math.max(-1, Math.min(1, this.steer + this.hold));
    const outside = side === 1 ? steer : -steer;
    return this.paddle ? 1 + STEER_STROKE * outside : Math.max(0, outside);
  }

  /** Paddling straight, the correction that brings the board back to its line; steering, a new line. */
  private keepLine(board: BoardBody): void {
    const forward = this.scratch.set(0, 0, 1).applyQuaternion(board.orientation);
    const heading = Math.atan2(forward.x, forward.z);
    if (this.line === undefined || this.sweeping || !this.paddle) {
      this.line = heading;
      this.hold = 0;
      return;
    }
    let error = heading - this.line;
    error -= 2 * Math.PI * Math.round(error / (2 * Math.PI));
    this.hold = Math.max(-1, Math.min(1, -(error + HOLD_RATE_TIME * board.angularVelocity.y) / HOLD_ANGLE));
  }

  /** Water on one body point at `partWorld` moving at `partVelocity`: buoyancy of `volume` and drag over `dragArea`. */
  private applyWater(slot: number, water: SurfWater, radius: number, volume: number, dragArea: number, h: number, shelter: number, deckY = -Infinity): void {
    const p = this.partWorld;
    const sample = water.sampleAt(p.x, p.y, p.z, this.sample);
    if (!sample.wet || sample.outsideDomain) return;
    // Wet between the deck (if the part lies on one) and the surface.
    const wet = submergedFraction(sample.surfaceY - p.y, radius) - (Number.isFinite(deckY) ? submergedFraction(Math.min(deckY, sample.surfaceY) - p.y, radius) : 0);
    if (!(wet > 0)) return;
    if (slot >= RIDER_PARTS.length) this.stroking = true;
    const support = SEAWATER * WATER.gravity * volume * wet;
    const force = this.partForce.set(-support * sample.slopeX, support, -support * sample.slopeZ);
    this.buoyancy.add(force);
    const relative = this.flow.set(sample.flowX, sample.flowY, sample.flowZ).sub(this.partVelocity);
    const drag = 0.5 * SEAWATER * dragArea * wet * relative.length();
    force.addScaledVector(relative, drag).addScaledVector(this.bodyAxis, -drag * (1 - shelter) * relative.dot(this.bodyAxis));
    if (slot >= RIDER_PARTS.length) {
      const limit = HAND_FORCE_LIMIT * this.mass * WATER.gravity;
      const magnitude = force.length();
      if (magnitude > limit) force.multiplyScalar(limit / magnitude);
      this.handLoad[slot - RIDER_PARTS.length] = Math.min(magnitude, limit);
      const stroke = this.strokePool[slot - RIDER_PARTS.length];
      stroke.x = p.x;
      stroke.y = p.y;
      stroke.z = p.z;
      stroke.speed = relative.length();
      this.handWet[slot - RIDER_PARTS.length] = true;
    }
    this.waterForce.add(force);
    const arm = this.scratch.subVectors(p, this.position);
    this.waterMoment.add(cross(arm, force, this.scratch2));
    this.reaction[slot * 3] += force.x * h;
    this.reaction[slot * 3 + 1] += force.y * h;
    this.reaction[slot * 3 + 2] += force.z * h;
    this.reactionAt[slot * 2] += p.x * h;
    this.reactionAt[slot * 2 + 1] += p.z * h;
  }

  /**
   * Add the rider to the board's 6 × 6 system: m G_fᵀ G_v, with G_v carrying the
   * rider at `carried` and G_f pushing along its line through the centre of
   * mass (`arm`), plus the rider's inertia while it lies rigid on the deck.
   */
  couple(system: Float64Array, rhs: Float64Array, h: number): void {
    const m = this.mass;
    const a = this.arm;
    const b = this.carried;
    const av = [a.x, a.y, a.z];
    const bv = [b.x, b.y, b.z];
    const ab = a.x * b.x + a.y * b.y + a.z * b.z;
    for (let i = 0; i < 3; i += 1) system[i * 6 + i] += m;
    // Top right −m [b]×, bottom left m [a]×, bottom right m((a·b) I − b aᵀ).
    system[0 * 6 + 4] += m * b.z;
    system[0 * 6 + 5] += -m * b.y;
    system[1 * 6 + 3] += -m * b.z;
    system[1 * 6 + 5] += m * b.x;
    system[2 * 6 + 3] += m * b.y;
    system[2 * 6 + 4] += -m * b.x;
    system[3 * 6 + 1] += -m * a.z;
    system[3 * 6 + 2] += m * a.y;
    system[4 * 6 + 0] += m * a.z;
    system[4 * 6 + 2] += -m * a.x;
    system[5 * 6 + 0] += -m * a.y;
    system[5 * 6 + 1] += m * a.x;
    const I = this.worldInertia;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        system[(3 + i) * 6 + 3 + j] += m * ((i === j ? ab : 0) - bv[i] * av[j]) + (this.upright ? 0 : I[i * 3 + j]);
      }
    }
    // The momentum the constraint must supply: v_rider' = v' + ω' × carried + drive.
    const mismatch = cross(this.boardSpin, b, this.scratch).add(this.boardVelocity).add(this.drive).sub(this.velocity);
    const f = this.scratch2.copy(this.external).multiplyScalar(h).addScaledVector(mismatch, -m);
    rhs[0] += f.x;
    rhs[1] += f.y;
    rhs[2] += f.z;
    const torque = cross(a, f, this.scratch);
    rhs[3] += torque.x;
    rhs[4] += torque.y;
    rhs[5] += torque.z;
    if (!this.upright) {
      // Lying rigid, the water's moment on the body turns the board with it.
      rhs[3] += h * this.waterMoment.x;
      rhs[4] += h * this.waterMoment.y;
      rhs[5] += h * this.waterMoment.z;
      const w = this.boardSpin;
      const own = this.angularVelocity;
      const dx = w.x - own.x;
      const dy = w.y - own.y;
      const dz = w.z - own.z;
      rhs[3] -= I[0] * dx + I[1] * dy + I[2] * dz;
      rhs[4] -= I[3] * dx + I[4] * dy + I[5] * dz;
      rhs[5] -= I[6] * dx + I[7] * dy + I[8] * dz;
    }
  }

  /**
   * After the board's solve (`du`, its velocity change): the contact impulse the
   * composite motion needs, and whether a body on a deck can give it. Returns
   * false with the projected impulse held for `pushBoard` when it cannot.
   */
  settle(du: Float64Array, h: number, board: BoardBody): boolean {
    const spin = this.scratch.set(this.boardSpin.x + du[3], this.boardSpin.y + du[4], this.boardSpin.z + du[5]);
    const velocity = cross(spin, this.carried, this.scratch2).add(this.boardVelocity);
    velocity.x += du[0];
    velocity.y += du[1];
    velocity.z += du[2];
    velocity.add(this.drive);
    this.impulse.copy(velocity).sub(this.velocity).multiplyScalar(this.mass).addScaledVector(this.external, -h);
    this.project(this.impulse, h, board, this.projected);
    this.feasible = this.projected.distanceTo(this.impulse) <= 1e-9 * Math.max(1, this.impulse.length());
    return this.feasible;
  }

  /** The projected contact impulse acts on the board along the rider's line of action. */
  pushBoard(rhs: Float64Array): void {
    const j = this.projected;
    rhs[0] -= j.x;
    rhs[1] -= j.y;
    rhs[2] -= j.z;
    const torque = cross(this.arm, j, this.scratch);
    rhs[3] -= torque.x;
    rhs[4] -= torque.y;
    rhs[5] -= torque.z;
  }

  /** After the board has moved: the rider's own motion and ledgers. */
  finish(h: number, board: BoardBody): void {
    const before = this.scratch.copy(this.velocity);
    // Power of the contact on the board is the same at any point of its line; use the centre of mass.
    const boardBefore = cross(this.boardSpin, this.arm, this.localScratch).add(this.boardVelocity);
    const boardAfter = cross(board.angularVelocity, this.arm, this.target).add(board.velocity);
    const contact = this.impulse;
    if (this.feasible) {
      this.velocity.copy(cross(board.angularVelocity, this.carried, this.scratch2).add(board.velocity).add(this.drive));
      contact.copy(this.velocity).sub(before).multiplyScalar(this.mass).addScaledVector(this.external, -h);
      if (this.upright) {
        this.angularVelocity.set(0, board.angularVelocity.y, 0);
      } else {
        this.angularImpulseWork(board);
        this.angularVelocity.copy(board.angularVelocity);
      }
      this.inContact = true;
      this.flightTime = 0;
    } else {
      contact.copy(this.projected);
      this.velocity.addScaledVector(contact, 1 / this.mass).addScaledVector(this.external, h / this.mass);
      this.inContact = contact.lengthSq() > 0;
      this.flightTime = this.inContact ? 0 : this.flightTime + h;
      this.contact.feasible = false;
    }
    const mean = before.add(this.velocity).multiplyScalar(0.5);
    this.work.gravity += h * this.gravity.dot(mean);
    this.work.water += h * this.waterForce.dot(mean);
    if (!this.upright && this.feasible) {
      const spin = this.boardSpin;
      const after = board.angularVelocity;
      this.work.water += (h * (this.waterMoment.x * (spin.x + after.x) + this.waterMoment.y * (spin.y + after.y) + this.waterMoment.z * (spin.z + after.z))) / 2;
    }
    this.work.contact += contact.dot(mean);
    board.work.rider -= contact.dot(boardBefore.add(boardAfter).multiplyScalar(0.5));
    this.stepImpulse.add(contact);
    this.up.set(0, 1, 0).applyQuaternion(board.orientation);
    this.stepLoad = Math.max(this.stepLoad, contact.dot(this.up) / (h * this.mass * WATER.gravity));
    this.position.addScaledVector(this.velocity, h);
    this.frame(board);
    if (this.inContact) {
      this.orientation.copy(this.upright ? this.heading : board.orientation);
    } else {
      const w = this.angularVelocity;
      const q = this.orientation;
      const dq = this.spin.set(w.x * h * 0.5, w.y * h * 0.5, w.z * h * 0.5, 0).multiply(q);
      q.set(q.x + dq.x, q.y + dq.y, q.z + dq.z, q.w + dq.w).normalize();
    }
    this.postureError = this.target.distanceTo(this.position);
    const decay = Math.exp(-h / CAUSE_MEMORY);
    for (const limit of Object.keys(this.limitTime) as (keyof typeof this.limitTime)[]) {
      this.limitTime[limit] = this.limitTime[limit] * decay + (this.limit === limit ? h : 0);
    }
    // Pushed too far off the posture, swayed past recovery, or airborne too long: the rider lets go of the board.
    if (this.flightTime > MAX_FLIGHT) this.separate('lost board');
    else if (this.upright && Math.hypot(this.sway.x, this.sway.z) > RECOVERABLE_ERROR) this.separate('balance');
    else if (this.postureError > RECOVERABLE_ERROR && this.limit !== 'none') this.separate(SEPARATION[this.dominantLimit()]);
  }

  /** The limit that bound the contact most in the recent past. */
  private dominantLimit(): Exclude<ContactLimit, 'none'> {
    let best: Exclude<ContactLimit, 'none'> = 'tip';
    for (const limit of Object.keys(this.limitTime) as (keyof typeof this.limitTime)[]) {
      if (this.limitTime[limit] > this.limitTime[best]) best = limit;
    }
    return best;
  }

  private separate(cause: RiderSeparation): void {
    this.attached = false;
    this.inContact = false;
    this.separation = cause;
  }

  /**
   * The posture's frame on the board as it is now: the heading, the body's up,
   * the stance point in the world and the centre of mass target (`target`).
   */
  private frame(board: BoardBody): void {
    const forward = this.scratch2.set(0, 0, 1).applyQuaternion(board.orientation);
    if (forward.x * forward.x + forward.z * forward.z > 1e-6) this.heading.setFromAxisAngle(Y, Math.atan2(forward.x, forward.z));
    if (this.upright) {
      this.up.copy(Y);
      board.toWorld(this.base, this.baseWorld);
      this.target.copy(this.localCenter).sub(this.base).applyQuaternion(this.heading).add(this.baseWorld);
    } else {
      this.up.set(0, 1, 0).applyQuaternion(board.orientation);
      board.toWorld(this.localCenter, this.target);
    }
    this.target.addScaledVector(this.up, this.flex);
    if (this.upright) this.target.add(this.localScratch.set(this.sway.x, 0, this.sway.z).applyQuaternion(board.orientation));
  }

  /** Standing, the velocity that keeps the body upright as the board rolls and pitches under the stance point. */
  private uprightVelocity(board: BoardBody, out: Vector3): Vector3 {
    if (!this.upright) return out;
    const offset = this.scratch2.subVectors(this.target, this.baseWorld);
    const w = this.scratch.set(-board.angularVelocity.x, 0, -board.angularVelocity.z);
    return out.add(cross(w, offset, this.localScratch));
  }

  /** Lying rigid, the rider turned with the board: book the angular impulse on both sides. */
  private angularImpulseWork(board: BoardBody): void {
    const I = this.worldInertia;
    const before = this.angularVelocity;
    const after = board.angularVelocity;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const dz = after.z - before.z;
    const lx = I[0] * dx + I[1] * dy + I[2] * dz;
    const ly = I[3] * dx + I[4] * dy + I[5] * dz;
    const lz = I[6] * dx + I[7] * dy + I[8] * dz;
    this.work.contact += (lx * (before.x + after.x) + ly * (before.y + after.y) + lz * (before.z + after.z)) / 2;
    board.work.rider -= (lx * (this.boardSpin.x + after.x) + ly * (this.boardSpin.y + after.y) + lz * (this.boardSpin.z + after.z)) / 2;
  }

  /**
   * The nearest impulse a body on a deck can give: pushing only, along a line
   * through its centre of mass that meets the deck inside the support, within
   * the friction cone and the load cap.
   */
  private project(impulse: Vector3, h: number, board: BoardBody, out: Vector3): Vector3 {
    const local = board.toLocal(this.position, this.localScratch);
    const q = board.orientation;
    const j = this.scratch.copy(impulse).applyQuaternion(this.spin.copy(q).invert());
    const height = local.y - deckHeight(this.shape, local.z);
    if (!this.upright) return this.projectHold(j, h, local, out.set(0, 0, 0), q);
    if (!(j.y > 0) || !(height > 0)) {
      this.contact.centreOfPressure.set(local.x, local.y - height, local.z);
      this.limit = 'flight';
      this.loaded = false;
      return out.set(0, 0, 0);
    }
    const cap = MAX_LOAD * this.mass * WATER.gravity * h;
    const normal = Math.min(j.y, cap);
    let limit: ContactLimit = j.y > cap ? 'impact' : 'none';
    // Centre of pressure where the line of action meets the deck, kept inside the support.
    const support = this.support;
    const freeX = local.x - (height * j.x) / j.y;
    const freeZ = local.z - (height * j.z) / j.y;
    this.loaded = j.y > BALANCE_LOAD * this.mass * WATER.gravity * h;
    if (this.loaded) {
      this.desiredCop.x = freeX;
      this.desiredCop.z = freeZ;
    }
    const copX = Math.min(support.xMax, Math.max(support.xMin, freeX));
    const copZ = Math.min(support.zMax, Math.max(support.zMin, freeZ));
    if (limit === 'none' && (copX !== freeX || copZ !== freeZ)) limit = 'tip';
    let tx = ((local.x - copX) * normal) / height;
    let tz = ((local.z - copZ) * normal) / height;
    const friction = FOOT_FRICTION * normal;
    const tangential = Math.hypot(tx, tz);
    if (tangential > friction) {
      tx *= friction / tangential;
      tz *= friction / tangential;
      if (limit === 'none') limit = 'slip';
    }
    this.limit = limit;
    const cx = local.x - (height * tx) / normal;
    const cz = local.z - (height * tz) / normal;
    this.contact.centreOfPressure.set(cx, deckHeight(this.shape, cz), cz);
    const span = this.feet.front - this.feet.rear;
    this.contact.frontShare = Math.min(1, Math.max(0, (cz - this.feet.rear) / span));
    return out.set(tx, normal, tz).applyQuaternion(q);
  }

  /**
   * Lying on the board (and pushing up, or lying back), the body holds it with
   * chest, arms and legs: the contact can pull up to PRONE_GRIP body weights,
   * and grips across the deck in proportion to how hard it presses plus that
   * hold. Only a pull beyond the hold lifts the rider off.
   */
  private projectHold(j: Vector3, h: number, local: Vector3, out: Vector3, q: Quaternion): Vector3 {
    const weight = this.mass * WATER.gravity * h;
    const grip = PRONE_GRIP * weight;
    this.contact.centreOfPressure.set(local.x, deckHeight(this.shape, local.z), local.z);
    this.contact.frontShare = 0;
    this.loaded = j.y > BALANCE_LOAD * weight;
    if (this.loaded) {
      const height = Math.max(0.05, local.y - deckHeight(this.shape, local.z));
      this.desiredCop.x = local.x - (height * j.x) / j.y;
      this.desiredCop.z = local.z - (height * j.z) / j.y;
    }
    if (j.y < -grip) {
      this.limit = 'flight';
      this.loaded = false;
      return out;
    }
    const cap = MAX_LOAD * weight;
    const normal = Math.min(j.y, cap);
    let limit: ContactLimit = j.y > cap ? 'impact' : 'none';
    let tx = j.x;
    let tz = j.z;
    const friction = PRONE_FRICTION * (normal + grip);
    const tangential = Math.hypot(tx, tz);
    if (tangential > friction) {
      tx *= friction / tangential;
      tz *= friction / tangential;
      if (limit === 'none') limit = 'slip';
    }
    this.limit = limit;
    return out.set(tx, normal, tz).applyQuaternion(q);
  }

  /** The posture's parts, centre of mass and support for the current phase. */
  private updatePosture(): void {
    const pose = riderPose(this.shape, this.posePhase(), this.stance);
    this.postureRate.set(0, 0, 0);
    if (this.phaseDuration > 0) {
      // A minimum-jerk path from where the transition began to the phase's pose.
      const s = Math.min(1, this.phaseTime / this.phaseDuration);
      const blend = minimumJerk(s);
      const rate = minimumJerkRate(s) / this.phaseDuration;
      const from = postureCenter(this.fromParts, this.partMasses);
      const to = postureCenter(pose.parts, this.partMasses);
      this.postureRate.set((to.x - from.x) * rate, (to.y - from.y) * rate, (to.z - from.z) * rate);
      for (let k = 0; k < this.parts.length; k += 1) this.parts[k] = this.fromParts[k] + (pose.parts[k] - this.fromParts[k]) * blend;
    } else {
      this.parts.set(pose.parts);
    }
    this.support = pose.support;
    this.upright = pose.upright;
    this.base.set(pose.base.x, pose.base.y, pose.base.z);
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      if (!this.shifts(i)) continue;
      this.parts[i * 3] += this.balance.x + this.lean.x;
      this.parts[i * 3 + 2] += this.balance.z;
    }
    const center = postureCenter(this.parts, this.partMasses);
    this.localCenter.set(center.x, center.y, center.z);
  }

  /** Standing, the feet stay put and the upper body shifts; lying down, the whole body does. */
  private shifts(part: number): boolean {
    return !this.upright || (RIDER_PARTS[part] !== 'leftLeg' && RIDER_PARTS[part] !== 'rightLeg');
  }

  private shiftedShare(): number {
    let shifted = 0;
    for (let i = 0; i < RIDER_PARTS.length; i += 1) if (this.shifts(i)) shifted += this.partMasses[i];
    return shifted / this.mass;
  }

  /** Move the body toward putting the centre of pressure where the rider wants it, within its reach. */
  private balanceStep(h: number, board: BoardBody): void {
    const reach = this.upright ? STANDING_SHIFT : PRONE_SHIFT;
    const support = this.support;
    this.copTarget.x = 0;
    const wantX = (support.xMin + support.xMax) / 2;
    const wantZ = (support.zMin + support.zMax) / 2 + this.copTarget.z;
    if (!this.upright && this.inContact) {
      // Toward the high rail (board +x is its left): the roll, positive with the left rail up, and its rate about the board's length.
      const side = this.scratch.set(1, 0, 0).applyQuaternion(board.orientation);
      const roll = Math.asin(Math.max(-1, Math.min(1, side.y)));
      const rate = this.scratch2.copy(board.angularVelocity).applyQuaternion(this.spin.copy(board.orientation).invert()).z;
      const targetX = Math.min(reach.x, Math.max(-reach.x, PRONE_ROLL_SHIFT * roll + PRONE_ROLL_DAMPING * rate));
      this.shiftAxis('x', targetX, reach.x, h);
      this.shiftAxis('z', 0, reach.z, h);
    } else if (this.inContact && this.loaded) {
      const smooth = Math.min(1, h / COP_SMOOTHING);
      this.smoothedCop.x += (this.desiredCop.x - this.smoothedCop.x) * smooth;
      this.smoothedCop.z += (this.desiredCop.z - this.smoothedCop.z) * smooth;
      const share = this.shiftedShare();
      // Standing, across the board as along it, balance only keeps the load clear of the feet's edges.
      const keepX = this.upright ? Math.min(wantX + LATERAL_FREEDOM, Math.max(wantX - LATERAL_FREEDOM, this.smoothedCop.x)) : wantX;
      const targetX = Math.min(reach.x, Math.max(-reach.x, this.balance.x + (keepX - this.smoothedCop.x) / share));
      const keepZ = Math.min(wantZ + TRIM_FREEDOM, Math.max(wantZ - TRIM_FREEDOM, this.smoothedCop.z));
      const targetZ = Math.min(reach.z, Math.max(-reach.z, this.balance.z + (keepZ - this.smoothedCop.z) / share));
      this.shiftAxis('x', targetX, reach.x, h);
      this.shiftAxis('z', targetZ, reach.z, h);
    } else {
      this.shiftAxis('x', this.balance.x, reach.x, h);
      this.shiftAxis('z', this.balance.z, reach.z, h);
    }
    // The steering lean, standing only.
    const lean = this.upright ? Math.max(-1, Math.min(1, this.steer)) * MAX_LEAN : 0;
    const frequency = 1 / BALANCE_TIME;
    const acceleration = Math.min(MAX_SHIFT_ACCELERATION, Math.max(-MAX_SHIFT_ACCELERATION,
      frequency * frequency * (lean - this.lean.x) - 2 * frequency * this.leanRate.x));
    this.leanRate.x = Math.min(MAX_SHIFT_SPEED, Math.max(-MAX_SHIFT_SPEED, this.leanRate.x + acceleration * h));
    this.lean.x += this.leanRate.x * h;
  }

  /**
   * The sway of a pushed body as an inverted pendulum over its feet, caught (or
   * not) by the centre of pressure the support allows.
   */
  private swayStep(h: number): void {
    if (!this.upright) {
      this.sway.set(0, 0, 0);
      this.swayRate.set(0, 0, 0);
      return;
    }
    if (this.sway.lengthSq() === 0 && this.swayRate.lengthSq() === 0) return;
    const omega = Math.sqrt(WATER.gravity / Math.max(0.3, this.localCenter.y - this.base.y));
    const recovery = 1 + 1 / (SWAY_RECOVERY * omega);
    const { support } = this;
    for (const axis of ['x', 'z'] as const) {
      const half = axis === 'x' ? (support.xMax - support.xMin) / 2 : (support.zMax - support.zMin) / 2;
      const capture = this.sway[axis] + this.swayRate[axis] / omega;
      const pressure = Math.max(-half, Math.min(half, capture * recovery));
      this.swayRate[axis] += h * omega * omega * (this.sway[axis] - pressure);
      this.sway[axis] += h * this.swayRate[axis];
    }
    if (this.sway.lengthSq() < 1e-10 && this.swayRate.lengthSq() < 1e-10) {
      this.sway.set(0, 0, 0);
      this.swayRate.set(0, 0, 0);
    }
  }

  /** Critically damped motion of the balance shift toward `target`, within speed, acceleration and reach limits. */
  private shiftAxis(axis: 'x' | 'z', target: number, reach: number, h: number): void {
    // Standing, the whole body leans quickly into a turn; lying down, the hips shift gently.
    const frequency = 1 / (this.upright ? STANDING_BALANCE_TIME : BALANCE_TIME);
    const maxAcceleration = this.upright ? STANDING_SHIFT_ACCELERATION : MAX_SHIFT_ACCELERATION;
    const maxSpeed = this.upright ? STANDING_SHIFT_SPEED : MAX_SHIFT_SPEED;
    const acceleration = Math.min(maxAcceleration, Math.max(-maxAcceleration,
      frequency * frequency * (target - this.balance[axis]) - 2 * frequency * this.balanceRate[axis]));
    const rate = Math.min(maxSpeed, Math.max(-maxSpeed, this.balanceRate[axis] + acceleration * h));
    const next = this.balance[axis] + rate * h;
    const clamped = Math.min(reach, Math.max(-reach, next));
    this.balanceRate[axis] = clamped === next ? rate : 0;
    this.balance[axis] = clamped;
  }

  /** Inertia of the parts about the centre of mass (point masses and their spheres), in the world. */
  private updateInertia(board: BoardBody): void {
    const I = this.localInertia;
    I.fill(0);
    const c = this.localCenter;
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      const m = this.partMasses[i];
      const radius = Math.cbrt((3 * this.partVolumes[i]) / (4 * Math.PI));
      const r = [this.parts[i * 3] - c.x, this.parts[i * 3 + 1] - c.y, this.parts[i * 3 + 2] - c.z];
      const r2 = r[0] * r[0] + r[1] * r[1] + r[2] * r[2];
      for (let a = 0; a < 3; a += 1) {
        for (let b = 0; b < 3; b += 1) I[a * 3 + b] += m * ((a === b ? r2 : 0) - r[a] * r[b]) + (a === b ? 0.4 * m * radius * radius : 0);
      }
    }
    board.rotateTensor(I, this.worldInertia);
  }

  private flexStep(h: number): void {
    const acceleration = -FLEX_FREQUENCY * FLEX_FREQUENCY * this.flex - 2 * FLEX_FREQUENCY * this.flexRate;
    this.flexRate += h * acceleration;
    this.flex = Math.max(-MAX_FLEX, Math.min(0, this.flex + h * this.flexRate));
    if ((this.flex === 0 && this.flexRate > 0) || (this.flex === -MAX_FLEX && this.flexRate < 0)) this.flexRate = 0;
  }
}
