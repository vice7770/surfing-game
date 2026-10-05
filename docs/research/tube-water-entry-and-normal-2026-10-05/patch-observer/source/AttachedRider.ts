import { Quaternion, Vector3 } from 'three';
import type { BoardBody } from './BoardBody';
import { REFERENCE_RIDER } from './boardReference';
import { LIP_CONTACT, LIP_QUERY_MARGIN, type LipContactParcel, type LipParcelSource } from './DetachedSurfer';
import type { BoardShape } from './boardShape';
import { WATER } from './hullForces';
import { RIDER_LEG } from './legSpring';
import { MinimumJerkTrack } from './MinimumJerkTrack';
import { SEAWATER_DENSITY as SEAWATER } from './PhysicalSurfWater';
import { createWaterSample } from './SurfWater';
import { RIDER_PARTS, deckHeight, duckPose, postureCenter, riderPartMasses, riderPartVolumes, riderPose, stanceFeet, type PosePhase, type StanceName, type SupportRegion } from './riderPosture';
import type { SurfWater, WaterSample } from './SurfWater';
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
/**
 * Swinging forward over the water (the riding-body plan, step 8; only the pull
 * pushes on the water), the drawn hand at mid-swing, m:
 * - this far out past its pulling line: the stroke's width, as Nessler et al.
 *   2015 measure it (170 ± 67 mm), where the pull's line beside the rail alone
 *   gives about 90 mm;
 * - this high over the deck, skimming the water: the wrist through about 370 mm
 *   up and down (Nessler et al. 2015: 424 ± 78). At 0.25 m, about the shoulder's
 *   height, the arm folded tight to pass it, turning fast enough that a 30 Hz
 *   display's smoothing read the turn as a jump.
 */
const RECOVERY_SWING = 0.1;
const RECOVERY_HEIGHT = 0.12;
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
 * Carried upright (landing from a pop-up, and standing below planing), balance
 * keeps the centre of pressure within LATERAL_FREEDOM, m, of the middle of the
 * feet across, and steering leans the upper body toward the rail by up to
 * MAX_LEAN, m, as before the bank.
 */
const LATERAL_FREEDOM = 0.06;
const MAX_LEAN = 0.2;
/**
 * The body banks only while the board planes: its speed through the water over
 * PLANING_SPEED, m/s, and until it falls under PLANING_DROP. Below planing the
 * hull gives the ankles nothing to push against (the carve lab's held rider
 * capsized its board at 3 m/s), and a banked body tipped over on a slow board
 * after the pop-up (the Canyon's ride report); off the plane it stands back up
 * and is then carried upright. Snapped upright at once, a body banked in a
 * slowing carve threw the board onto its rail.
 */
const PLANING_SPEED = 4;
const PLANING_DROP = 3;
/** Off the plane, the body stands back up on its ankles first, and is carried upright once within this bank, rad, and bank rate, rad/s. */
const UPRIGHT_BANK = (2 * Math.PI) / 180;
const UPRIGHT_RATE = 0.2;
/**
 * Standing, the body banks on its ankles and knees (the turn redesign): an
 * inverted pendulum over the feet whose bank θ from the vertical, toward the
 * board's +x side (its left, the same for either stance), is an eighth unknown
 * in the board's solve. The ankle couples it to the board's roll φ with
 * ANKLE_STIFFNESS, N·m/rad, and ANKLE_DAMPING, N·m·s/rad (`rollModel`'s pick):
 * τ = k (θ − φ − δ) + c (θ̇ − φ̇).
 *
 * The balance sets the ankle's rest δ from the bank asked for, the body's bank
 * and its rate, BANK_GAIN (θ_ref − θ) − BANK_RATE_GAIN θ̇, through a motor lag of
 * BALANCE_LAG, s (without it the feedback rang from one substep to the next
 * through the light board). In a steady carve the ankle rests, so the body and
 * the rail bank as far as asked: the reference gain is the bank gain. The
 * balance reads nothing of the board's roll or the turn's pull: fed back, both
 * drove the board's 3–5 Hz roll-yaw wobble (P4e's Mode B).
 *
 * The planing board is stiff in roll about the rider's load line (850–1,700
 * N·m/rad, the carve lab's plant), so the rail follows the body's bank and the
 * rest only trims it; past ANKLE_REST_RANGE, rad, the feet's pressure reaches
 * their edges and more only rolls the board away onto its rail (`rollModel`'s
 * `bankAuthority`). Steering asks for up to RAIL_RANGE of bank (50°, chosen
 * with the user over 40–45°: a stronger turn, and a stall if it is held
 * uphill), eased in over REFERENCE_TIME, s, at up to REFERENCE_RATE, rad/s; the
 * heading hold and the hand ask for up to HOLD_BANK, rad. Past MAX_BANK the body
 * is off its posture.
 *
 * Steering into a lean (past STEER_DEADBAND, toward a bank past UPRIGHT_BANK)
 * that the body lags by more than the feet's linear range (ANKLE_REST_RANGE /
 * BANK_GAIN, about 2°), the feet never roll the board away from it: the upper
 * body's swing throws the body into the lean, and the feet only catch it (the
 * rail-change study). The planing hull turns hard on a small roll (a held board
 * rolled 8° turns at 0.8 rad/s at 7 m/s). So the feet's push that threw the body
 * into a new lean first swung the board the wrong way. At the top of the face
 * that pointed it up to stall while the body fell in at 3 rad/s; in a rail change
 * it dug the old rail (it still may while the bank asked for crosses over, about
 * 0.2 s); mid-carve it pumped the rail in the roll–yaw wobble. Within the linear
 * range the feet hold a steady carve: the swing is a rotor and holds no steady
 * torque, and given a carve's small steady rest across a face it wound to its
 * range, after which a held partial steer turned the wrong way (the final
 * review). Unsteered, near upright, the heading hold, the hand and a shove keep
 * the feet's whole range.
 *
 * The projection (the movement-flow spec: Compress released, the legs extend, the
 * rail neutral): while the legs extend out of a crouch or Compress with no lean
 * asked for, the body still banked (past UPRIGHT_BANK) from the turn it leaves and
 * the board planing, the feet hold the board neutral under the body, an ankle rest
 * of nothing, and the upper body's swing takes the rest of what the balance asks.
 * Rolling the board on past the body there (the counter-steer above) held the rail
 * 14–16° past the bank at its bite while the extension loaded it with 2–2.9 body
 * weights: the old turn closed up, the board skidded out once the legs were
 * straight, and on the deep U the rider fell within a second of letting go at
 * 25–40° from the fall line (on the Wave Pool the projections lost about 40% of
 * their speed, and 4 riders in 21 reached a cutback).
 * Rolled flatter than the body instead, the feet threw it into the turn (the turn
 * redesign's lesson: the hull rights about the rider's load line).
 */
const ANKLE_STIFFNESS = 800;
const ANKLE_DAMPING = 80;
const BANK_GAIN = 7.4;
const BANK_RATE_GAIN = 3.6;
const BALANCE_LAG = 0.01;
const ANKLE_REST_RANGE = 0.25;
const RAIL_RANGE = (50 * Math.PI) / 180;
const REFERENCE_TIME = 0.05;
const REFERENCE_RATE = 5;
const HOLD_BANK = 0.1;
const MAX_BANK = (70 * Math.PI) / 180;
/**
 * The rider leans no further than a turn of TURN_RADIUS, m, can hold at the
 * board's speed, atan(v² / (g R)): 48° at 7 m/s, 39° at 6 m/s, 11° at 2 m/s.
 * The board carves about 4.3 m on a 50° rail (7.4 m/s at 1.7 rad/s; Forsyth et
 * al. 2024's bottom turns run at 3.8 m). Leaning for a tighter turn than that,
 * the body fell into it as the turn slowed, and a rider steering hard at 1–2
 * m/s after a pop-up banked to 70° with no turn under it (the Canyon's ride
 * report).
 */
const TURN_RADIUS = 4.5;
/**
 * The rail bites up to RAIL_BITE, rad; past it the board bogs (the carve lab: 6
 * → 2 m/s in 0.6 s at 60–65°). The feet brake the body's fall into a turn by
 * rolling the board further onto its rail, so past the bite their room to do so
 * closes over RAIL_EASE, rad, and the upper body's swing brakes it instead.
 */
const RAIL_BITE = (48 * Math.PI) / 180;
const RAIL_EASE = (4 * Math.PI) / 180;
/**
 * The upper body's swing (the turn redesign, with the user): the torso and arms
 * swing about the forward axis as a rotor of SWING_INERTIA, kg·m², within
 * ±SWING_RANGE, rad, driven from the hips at up to SWING_TORQUE, N·m
 * (provisional). What the balance asks of the feet beyond their range goes to
 * the swing, sized by SWING_SERIES, N·m/rad (the ankle and the planing hull in
 * series at 7 m/s: 800 and 860). Its reaction turns the body on its feet; the
 * board feels only the push at the feet. It swings back at SWING_FREQUENCY,
 * rad/s, only once the feet can carry the body again (the rest asked for within
 * SWING_RELEASE, rad, of their range): given back while the body still needed
 * it, the momentum threw the rider into the turn.
 */
const SWING_INERTIA = 10;
const SWING_TORQUE = 200;
const SWING_RANGE = 1.2;
const SWING_SERIES = 430;
const SWING_FREQUENCY = 1.5;
const SWING_RELEASE = 0.05;
/**
 * The upper body's twist (the movement-flow spec), asked for by the pad's
 * rotation: the trunk, arms and head turn about the leg as a rotor of
 * TWIST_INERTIA, kg·m² (de Leva 1996's segments, the arms held off the trunk),
 * within ±TWIST_RANGE, rad (the spine's axial rotation, about 40–50°: Neumann,
 * Kinesiology of the Musculoskeletal System), toward the rotation asked for,
 * critically damped at TWIST_FREQUENCY, rad/s. The hips turn it with at most
 * TWIST_TORQUE, N·m (peak trunk axial rotation, about 100–150 N·m), and no more
 * than the feet's grip holds on the deck, FOOT_FRICTION times the leg's load
 * at TWIST_GRIP_RADIUS, m. Their reaction turns the board through the feet: a
 * short-lived yaw, since the body's angular momentum stays its own, first away
 * from the twist and then, as it stops, toward it. Nothing asked for (the
 * keyboard and touch), the rotor rests and the body turns with the ride. The
 * body's rigid inertia still counts the upper body (provisional).
 */
const TWIST_INERTIA = 1.5;
const TWIST_RANGE = (45 * Math.PI) / 180;
const TWIST_FREQUENCY = 7;
const TWIST_TORQUE = 120;
const TWIST_GRIP_RADIUS = 0.15;
/**
 * The compressed turn's assist (the movement-flow spec's Q4 and Q16, a
 * gameplay rule, not physics). Compress is the sharp turn's stance, and a real
 * bottom turn comes round 99° in 0.96 s (Forsyth et al. 2024). Here every
 * stance took about 1.45 s: the body needs about half a second to lean in
 * before the hull's pull builds, since leaning in first means pushing the feet
 * out. The lower body of Compress, and the twist, changed nothing.
 *
 * So while Compress goes deeper than the crouch, the board planes and the
 * rider steers, the body is pulled into the turn. The pull acts at its centre
 * of mass, level and across the board's path, so it does no work on that path.
 * It is COMPRESS_PULL of the pull the lean asked for balances: m g tan of the
 * bank reference, scaled by Compress. It leads the body's lean, which it
 * leans in.
 *
 * On flat water at 7 m/s this brings the bottom turn round 90° in 1.0 s,
 * either side, keeping about 0.6 of the speed (0.36 before; 0.9 with
 * CARVE_CARRY). At 0.7 a rider compressing from standing fell after 100°.
 * Riding straight it does nothing.
 */
const COMPRESS_PULL = 0.5;
/**
 * The pull leads the lean in, and must never carry the body past it: it fades out as the body leans past the
 * lean asked for by up to PULL_OVERLEAN, rad, and as the board slows from PULL_FULL_SPEED to PLANING_DROP, m/s.
 * Held into a cutback with the weight back, the board pivoted at 4 rad/s, bogged from 7 to 3 m/s, and the pull
 * kept tipping the body in (70° against 15° asked) until it fell.
 */
const PULL_OVERLEAN = (10 * Math.PI) / 180;
/**
 * The carve's carry (the movement-flow spec's Q4 and Q16, a gameplay rule,
 * not physics), under the same gate as COMPRESS_PULL. A real bottom turn or
 * cutback keeps 0.88–0.95 of its speed (Forsyth et al. 2024), fed by the wave
 * it turns on; here the hull's carve shed it (the compressed bottom turn kept
 * 0.6 at 90°, and on the Wave Pool's 1.1 m face every cutback dropped off the
 * plane). So the body is pushed along the board's level path by CARVE_CARRY of
 * the pull its bank balances, m g tan of the bank, scaled by Compress: it gives
 * back part of what the carve sheds, in proportion to how hard it turns, and
 * nothing riding straight. Pushing the body (not the board) keeps it off the
 * feet: they pass on only the board's share.
 *
 * In the stances spec's bottom turn (flat water at 7 m/s, compressed over the
 * crouch) 90° then comes in 1.02 s keeping 0.90–0.91 of the speed, either side
 * (0.60–0.62 without; 0.86–0.87 at 0.35, 1.0 at 0.5); compressed alone, 0.83 in
 * 0.95 s. Riding straight the same board keeps 0.63 after 1 s: on flat water
 * the carry gives back the planing drag a wave's face would feed.
 */
const CARVE_CARRY = 0.4;
const PULL_FULL_SPEED = 5;
/**
 * The rail change's lean-out pull (the movement-flow spec's cutback, a gameplay rule, not physics), under
 * COMPRESS_PULL's gate. Leaning one way and steering the other, a body comes up out of its lean only as the board turns
 * harder into it, as a bicycle steers into a lean to stand up (the rail-change study's counter-steer), and the rail
 * follows the body, so the old turn runs on until the body is upright. On the Wave Pool the flow's cutbacks began with
 * the body leaning 10–13° the old way, and the board first turned on 12° (median, up to 42°) that way, along the face,
 * at 1.7–2.1 rad/s: about a body weight of push for about 0.2 s, while the crest closed (on Medium 14 of 38 cutbacks
 * were caught by it, 13 of them falling). Changing rails from a full compressed carve (31°) at 7–9 m/s on a 3–8° still
 * face, the old turn ran on 26–53° and 20 riders in 36 fell.
 *
 * So while Compress goes deeper than the crouch, the board planes, the rider steers and the body still leans the other
 * way to the steer by more than UPRIGHT_BANK, the body is pulled toward the new rail, level and across the board's
 * path, by LEAN_OUT_PULL of its weight, scaled by the steer and by Compress and faded with speed as COMPRESS_PULL is:
 * the push the old turn gave, without the turn. Brought over faster than the balance asks, the body is braked by the
 * feet, which roll the board onto the new rail ahead of it, so the new turn starts sooner. The pull ends as the body
 * comes upright: it never pulls a body into a lean (the lean-in study's feed-forward) and does nothing in a turn begun
 * upright. With it the Medium pool's cutbacks first turned 5° (median) the old way and 10 of 39 were caught, and from
 * the full carve the old turn ran on 13–34° and 4 riders in 36 fell. At 0.7 the pool's cutbacks did about as well; at
 * 1.5 more rebounds fell, changing rails from the cutback's deeper lean.
 */
const LEAN_OUT_PULL = 1;
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

/** Knee flex that absorbs a landing lying down: natural frequency, rad/s, and the deepest crouch, m. */
const FLEX_FREQUENCY = 5;
const MAX_FLEX = 0.35;
/**
 * Standing, the rider stands on a leg (spec P9, the flexible rider): its centre
 * of mass rides a spring and damper along the vertical through the posture's
 * place, a seventh unknown in the board's solve (stiffness LEG_STIFFNESS below,
 * damping ratio `legSpring`'s RIDER_LEG 0.35; provisional). Across the leg the body is still carried upright over its
 * stance, as in P4e: a finite leg across delayed the upright correction and
 * destabilised the board's 3 Hz roll-yaw swing (the P9 plan's findings).
 * The leg holds the load the stance feels, gravity plus the stance's own
 * acceleration low-passed over SPECIFIC_FORCE_TIME, s: a muscle setpoint, the
 * rider's weight standing still and nothing in free fall. Its travel before the
 * body is off its posture, m: MAX_FLEX down, LEG_EXTENSION up.
 */
const SPECIFIC_FORCE_TIME = 0.1;
const LEG_EXTENSION = 0.1;
/** The balance margin's smoothing, s. */
const MARGIN_TIME = 0.1;
/** The drawn arms reach out ARM_SPREAD of their length at ease, and ARM_ALARM more with no margin left. */
export const ARM_SPREAD = 0.7;
export const ARM_ALARM = 0.8;
/**
 * The upper body's swing drawn (Part B): standing, the drawn chest, head and arms
 * turn together about the forward axis through the pelvis by SWING_DRAWN_CHEST of
 * the swing (at its ±69° range the trunk rolls 24°; the arms, held along the board,
 * lie close to the axis and ride with the chest). The parts the physics solves
 * with do not move; the drawn points carry it to online surfers.
 */
const SWING_DRAWN_CHEST = 0.35;
/**
 * The leg's stiffness in the riding stance, N/m: between the upright body's
 * 87 kN/m (5.5 Hz) and the legs-bent 22 kN/m (2.75 Hz, RIDER_LEG) of Matsumoto &
 * Griffin 1998, for knees partly bent (3.9 Hz; provisional). At 22 kN/m the
 * leg's bounce sat on the board's 3 Hz roll-yaw swing and a three-quarter carve
 * threw the rider.
 */
const LEG_STIFFNESS = 44_000;
/**
 * Standing, the rider's own reflexes (spec P9, heading hold): with no lean asked
 * for, it keeps the line it was on, leaning against the heading error (full lean
 * at STANDING_HOLD_ANGLE, rad) and the yaw rate (over STANDING_HOLD_RATE_TIME, s),
 * with at most STANDING_HOLD_SHARE of its lean (provisional). Holding a line
 * across a face means leaning into it, onto the uphill rail. With the paddler's
 * 10° the board drifted 7° toward the fall line over 10 s at 45° across a 15°
 * face; at 5° it holds within about 1°. Banked (the turn redesign), lines up to
 * 80° across that face hold until the board, slowed by running across it, stops
 * planing (5–9 s from 7 m/s); held upright they threw the rider at once (P4e).
 */
const STANDING_HOLD_ANGLE = (5 * Math.PI) / 180;
const STANDING_HOLD_RATE_TIME = 0.5;
/** The hold reads the yaw rate smoothed over this, s: it keeps a line, and read raw it fed the board's roll-yaw wobble through the bank. */
const STANDING_HOLD_RATE_SMOOTHING = 0.25;
/** Out of a turn, the hold takes up its line once the yaw rate has fallen below this, rad/s. */
const STANDING_HOLD_SETTLE = 0.15;
const STANDING_HOLD_SHARE = 0.5;
/** A steer within this is none: lying down no arm sweeps, and standing the heading hold keeps the line. */
const STEER_DEADBAND = 0.05;
/** Trim: the upper body shifts fore or aft by up to this much, m, moving the load along the board (provisional). */
const TRIM_SHIFT = 0.25;
/**
 * The height ladder: standing, the pumping crouch, Compress (the sharp turn's)
 * and a deeper manual tuck for a tube. Compress shortens the leg by up to
 * CROUCH_DEPTH, m. Through manual input 0.6 the pumping crouch keeps its
 * CROUCH_SHARE of that depth; further input adds a smooth tuck, reaching
 * MANUAL_CROUCH_DEPTH at 1. Compress fades out this extra tuck to keep its
 * existing sharp-turn stance. These are provisional posture targets. The leg
 * moves at most MAX_LEG_SPEED, m/s (a
 * countermovement jump's take-off speed, so a jump stays possible), and softens
 * toward the legs-bent 22 kN/m (provisional). The weight stays the trim's in
 * every stance: W/S put it on the front foot for a bottom turn, the back foot
 * for a cutback.
 */
export const CROUCH_DEPTH = 0.3;
export const CROUCH_SHARE = 0.65;
export const MANUAL_CROUCH_DEPTH = 0.45;
const PUMPING_CROUCH_LIMIT = 0.6;
const MAX_LEG_SPEED = 2.5;
const CROUCH_SOFTENING = 0.5;

/** Preserve the pumping stance, then fold deeper through the remaining manual range. */
function manualCrouchShare(input: number, compress: number): number {
  const crouch = Math.max(0, Math.min(1, input));
  const tuck = Math.max(0, (crouch - PUMPING_CROUCH_LIMIT) / (1 - PUMPING_CROUCH_LIMIT));
  const smoothTuck = tuck * tuck * (3 - 2 * tuck);
  const turn = Math.max(0, Math.min(1, compress));
  const manual = CROUCH_SHARE * crouch
    + ((MANUAL_CROUCH_DEPTH - CROUCH_SHARE * CROUCH_DEPTH) / CROUCH_DEPTH) * smoothTuck;
  // Fade only the tuck below the full Compress stance, so intermediate turn input cannot
  // extend further than its final posture. Shallower manual stances keep their old max selection.
  return manual - Math.max(0, manual - 1) * turn;
}
/**
 * How the leg's rest length moves toward the crouch asked for: critically damped
 * at LEG_FREQUENCY, rad/s; going down at most CROUCH_ACCELERATION, m/s² (about
 * 0.6 g, so the feet stay loaded) and CROUCH_SPEED, m/s; extending at most
 * EXTEND_ACCELERATION and MAX_LEG_SPEED (provisional).
 */
const LEG_FREQUENCY = 12;
const CROUCH_ACCELERATION = 6;
const CROUCH_SPEED = 1.5;
const EXTEND_ACCELERATION = 15;
/**
 * While the feet brake the body's bank near their edges (the ankle's rest past
 * CROUCH_HOLD of ANKLE_REST_RANGE), the legs hold rather than drop, stopping at
 * the edges. A crouch's drop takes the load off the board; taken as the body
 * leaned into a hard turn, the ankles' brake rolled the light board onto its
 * rail instead of stopping the body, and the rider dove into the turn (the
 * Canyon's bottom turns, crouched at full steer on the trough's flat water).
 * Surfers compress under a turn's load, once the rail is set.
 */
const CROUCH_HOLD = 0.75;
/**
 * Compressing deeper than the crouch, the legs drop at least as fast as the
 * crouch's, and faster as a turn loads them: the specific force along the leg
 * above COMPRESS_KEEP of gravity, so under a turn's load the feet keep that
 * share of the rider's weight. The crouch's hold is not needed. Paced by the
 * load alone (about 0.1 g on flat water), Compress took about a second to reach
 * its depth riding straight, and the player saw nothing happen (the
 * movement-flow spec's Q1).
 */
const COMPRESS_KEEP = 0.9;
/**
 * Standing, a hand in the face (spec P9): asked for, the upper body bends toward
 * the wave side, where the water stands higher beside the board (read
 * WAVE_SIDE_REACH, m, out on each side; a side only when it is WAVE_SIDE_MIN, m,
 * higher), leaning HAND_BEND of the full lean that way. The shoulder swings out
 * and down (an upper body HAND_TORSO, m, bent HAND_TORSO_ANGLE from the leg) and
 * the arm (ARM_LENGTH, m) reaches down and out at ARM_ANGLE from the leg. A flat
 * hand's drag, C_d A = 1.1 x 0.013 m2 (Berger et al. 1995; Bilinauskaite et al.
 * 2013), times its immersed share; the arm gives way at HAND_FORCE_LIMIT. The
 * geometry is provisional. The drag acts on the body, and its moment about the
 * body's vertical turns the board through the feet.
 */
const WAVE_SIDE_REACH = 0.6;
const WAVE_SIDE_MIN = 0.05;
const HAND_BEND = 0.5;
const HAND_TORSO = 0.55;
const HAND_TORSO_ANGLE = (60 * Math.PI) / 180;
const ARM_LENGTH = 0.7;
const ARM_ANGLE = (25 * Math.PI) / 180;
const STANDING_HAND_DRAG = 1.1 * 0.013;
/**
 * Compressing into a lean, the inside hand reaches for the water (de Sousa 2022:
 * the body leans into the curve until the inside hand nears the water): from
 * REACH_FROM of Compress and REACH_LEAN of bank, on the side the body leans
 * toward, REACH_ALONG, m, along the board toward its own arm's shoulder —
 * frontside the rear arm (toward the tail), backside the leading arm (toward the
 * nose). Where it is under the surface it drags like the hand in the face.
 */
const REACH_FROM = 0.5;
const REACH_LEAN = (10 * Math.PI) / 180;
const REACH_ALONG = 0.3;
/**
 * The reaching hand touches rather than plunges: its arm bends to keep no more
 * than its lowest REACH_DIP, m, under the surface (about a tenth of the hand, a
 * few tens of newtons at bottom-turn speeds; held fully under at 7 m/s it pulls
 * about 0.4 body weights, the E hand's stall).
 */
const REACH_DIP = 0.03;

export interface AttachedRiderOptions {
  mass?: number;
  stance?: StanceName;
  phase?: PosePhase;
}

/** The rider's phase: a posture, or lying back down after a failed pop-up. */
export type RiderPhase = PosePhase | 'recover';

/** Why a stand has no support: the contact strained lately, the board sank into the surface, the feet landed under water, or there was no water. */
export type StandRefusal = 'strained' | 'sinking' | 'feet under water' | 'no water';

/** The latest pop-up: how it ended, how long it took to stand, s, and its peak landing load, body weights, with the front foot's share then. */
export interface PopUpReport {
  outcome: 'none' | 'rising' | 'stood';
  /** A stand the board could not carry: which check found no support (the rider stands anyway). */
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
 * The duck-dive's timing (the wipeout spec): the arms straighten over
 * PRESS_TIME, s; the knee starts KNEE_DELAY s after the press began and lands
 * over KNEE_TIME; released, both give back over RELEASE_TIME, letting the board
 * float the body up behind the wave (given back in 0.4 s, the body pulled itself
 * down onto the rising board harder than the prone grip holds, and let go). Each
 * eases in and out along a minimum-jerk path (`MinimumJerkTrack`): stopped dead
 * at full press, the rising body flew off the board, and started at full
 * acceleration (a critically damped follower), the knee pulled the body off the
 * deck as it began. The input's depth (analog) sets how far each goes. Coaching
 * sources [A] only: provisional.
 */
const PRESS_TIME = 0.35;
const KNEE_DELAY = 0.3;
const KNEE_TIME = 0.25;
const RELEASE_TIME = 1.0;
/**
 * Ducking, both hands are wrapped round the rails: they hold the board with up
 * to DUCK_GRIP body weights (a person can hang their weight from two hands;
 * provisional), where lying down paddling holds PRONE_GRIP.
 */
const DUCK_GRIP = 1.0;
const DUCK_HELD = 0.05;
const DUCK_BUSY = 0.1;
/**
 * Ducking, the board is under water and has no waterplane to right it, and the
 * body is up over it on straight arms: an inverted pendulum. The hands on both
 * rails let the upper body lean toward the high rail across their span, up to
 * DUCK_SHIFT, m, at DUCK_ROLL_SHIFT m per rad of roll and DUCK_ROLL_DAMPING m
 * per rad/s (a modelling choice: more than the body's ~0.5 m height over the
 * board per rad, which the prone hip shift cannot give). It leans no faster
 * than the hips shift: thrown across at 1.5 m/s, the body kicked the light
 * board into a faster roll the other way.
 */
const DUCK_SHIFT = 0.2;
const DUCK_ROLL_SHIFT = 1.0;
const DUCK_ROLL_DAMPING = 0.3;
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
export type RiderSeparation = 'balance' | 'foot slip' | 'lost board' | 'impact' | 'reef';

/** Which limit last bound the contact impulse. */
type ContactLimit = 'none' | 'flight' | 'tip' | 'slip' | 'impact';

/** Diagnostic-only observation of existing state at the end of one contact substep. */
interface LandingDemandOperands {
  projectLocalX: number;
  projectLocalY: number;
  projectLocalZ: number;
  projectDeckY: number;
  projectHeight: number;
  demandLocalX: number;
  demandLocalY: number;
  demandLocalZ: number;
  legHeight: number;
  legLoad: number;
  legStiffness: number;
  legDamping: number;
  legForce: number;
  legRateAfter: number;
  specificForceX: number;
  specificForceY: number;
  specificForceZ: number;
  postureRateX: number;
  postureRateY: number;
  postureRateZ: number;
  driveX: number;
  driveY: number;
  driveZ: number;
  carriedRelativeX: number;
  carriedRelativeY: number;
  carriedRelativeZ: number;
  demandPositionX: number;
  demandPositionY: number;
  demandPositionZ: number;
  demandVelocityX: number;
  demandVelocityY: number;
  demandVelocityZ: number;
  demandTargetX: number;
  demandTargetY: number;
  demandTargetZ: number;
  demandUpX: number;
  demandUpY: number;
  demandUpZ: number;
  /** Observer-only copies of the unaugmented board solve and trial standing result. */
  boardPreMatrix00: number;
  boardPreMatrix01: number;
  boardPreMatrix02: number;
  boardPreMatrix03: number;
  boardPreMatrix04: number;
  boardPreMatrix05: number;
  boardPreMatrix10: number;
  boardPreMatrix11: number;
  boardPreMatrix12: number;
  boardPreMatrix13: number;
  boardPreMatrix14: number;
  boardPreMatrix15: number;
  boardPreMatrix20: number;
  boardPreMatrix21: number;
  boardPreMatrix22: number;
  boardPreMatrix23: number;
  boardPreMatrix24: number;
  boardPreMatrix25: number;
  boardPreMatrix30: number;
  boardPreMatrix31: number;
  boardPreMatrix32: number;
  boardPreMatrix33: number;
  boardPreMatrix34: number;
  boardPreMatrix35: number;
  boardPreMatrix40: number;
  boardPreMatrix41: number;
  boardPreMatrix42: number;
  boardPreMatrix43: number;
  boardPreMatrix44: number;
  boardPreMatrix45: number;
  boardPreMatrix50: number;
  boardPreMatrix51: number;
  boardPreMatrix52: number;
  boardPreMatrix53: number;
  boardPreMatrix54: number;
  boardPreMatrix55: number;
  boardPreRhs0: number;
  boardPreRhs1: number;
  boardPreRhs2: number;
  boardPreRhs3: number;
  boardPreRhs4: number;
  boardPreRhs5: number;
  preparedBoardVelocityX: number;
  preparedBoardVelocityY: number;
  preparedBoardVelocityZ: number;
  preparedBoardSpinX: number;
  preparedBoardSpinY: number;
  preparedBoardSpinZ: number;
  riderExternalX: number;
  riderExternalY: number;
  riderExternalZ: number;
  forceArmX: number;
  forceArmY: number;
  forceArmZ: number;
  carriedArmX: number;
  carriedArmY: number;
  carriedArmZ: number;
  trialBoardDeltaVelocityX: number;
  trialBoardDeltaVelocityY: number;
  trialBoardDeltaVelocityZ: number;
  trialBoardDeltaSpinX: number;
  trialBoardDeltaSpinY: number;
  trialBoardDeltaSpinZ: number;
  /** 1 after this prepare/substep reached trial settlement; 0 otherwise. */
  standingTrialAvailable: number;
  /** Existing aggregate board RHS primitives; invalid whenever standingTrialAvailable is 0. */
  boardPreBuoyancyForceX: number;
  boardPreBuoyancyForceY: number;
  boardPreBuoyancyForceZ: number;
  boardPreBuoyancyTorqueX: number;
  boardPreBuoyancyTorqueY: number;
  boardPreBuoyancyTorqueZ: number;
  boardPrePressureForceX: number;
  boardPrePressureForceY: number;
  boardPrePressureForceZ: number;
  boardPrePressureTorqueX: number;
  boardPrePressureTorqueY: number;
  boardPrePressureTorqueZ: number;
  boardPreFrictionForceX: number;
  boardPreFrictionForceY: number;
  boardPreFrictionForceZ: number;
  boardPreFrictionTorqueX: number;
  boardPreFrictionTorqueY: number;
  boardPreFrictionTorqueZ: number;
  boardPreFinForceX: number;
  boardPreFinForceY: number;
  boardPreFinForceZ: number;
  boardPreFinTorqueX: number;
  boardPreFinTorqueY: number;
  boardPreFinTorqueZ: number;
  boardPreRailForceX: number;
  boardPreRailForceY: number;
  boardPreRailForceZ: number;
  boardPreRailTorqueX: number;
  boardPreRailTorqueY: number;
  boardPreRailTorqueZ: number;
  boardPreGyroX: number;
  boardPreGyroY: number;
  boardPreGyroZ: number;
  boardPreWeight: number;
  boardPreStepSeconds: number;
  boardPreWaterImpulseX: number;
  boardPreWaterImpulseY: number;
  boardPreWaterImpulseZ: number;
  boardPreWaterTorqueImpulseX: number;
  boardPreWaterTorqueImpulseY: number;
  boardPreWaterTorqueImpulseZ: number;
  // BEGIN observer-only water-patch field declarations
  /** Fixed48-patch scalar copies; require standingTrialAvailable1 and scope/count qualification. */
  waterPatchCount: number;
  waterPatchScopeAvailable: number;
  waterPatch00OldAddedMass: number;
  waterPatch00AddedMass: number;
  waterPatch00EntrainedMass: number;
  waterPatch00Radiation: number;
  waterPatch00IntoSurface: number;
  waterPatch00Push: number;
  waterPatch00Inertia: number;
  waterPatch00Projection: number;
  waterPatch00WettedArea: number;
  waterPatch00DeckWettedArea: number;
  waterPatch00AddedMassPerArea: number;
  waterPatch00RadiationPerArea: number;
  waterPatch00NuX: number;
  waterPatch00NuY: number;
  waterPatch00NuZ: number;
  waterPatch00ArmCrossNuX: number;
  waterPatch00ArmCrossNuY: number;
  waterPatch00ArmCrossNuZ: number;
  waterPatch00ArmX: number;
  waterPatch00ArmY: number;
  waterPatch00ArmZ: number;
  waterPatch00NormalX: number;
  waterPatch00NormalY: number;
  waterPatch00NormalZ: number;
  waterPatch00PositionX: number;
  waterPatch00PositionY: number;
  waterPatch00PositionZ: number;
  waterPatch00RelativeX: number;
  waterPatch00RelativeY: number;
  waterPatch00RelativeZ: number;
  waterPatch00FlowX: number;
  waterPatch00FlowY: number;
  waterPatch00FlowZ: number;
  waterPatch00SurfaceY: number;
  waterPatch00SlopeX: number;
  waterPatch00SlopeZ: number;
  waterPatch00SampleNormalX: number;
  waterPatch00SampleNormalY: number;
  waterPatch00SampleNormalZ: number;
  waterPatch00WaterDepth: number;
  waterPatch01OldAddedMass: number;
  waterPatch01AddedMass: number;
  waterPatch01EntrainedMass: number;
  waterPatch01Radiation: number;
  waterPatch01IntoSurface: number;
  waterPatch01Push: number;
  waterPatch01Inertia: number;
  waterPatch01Projection: number;
  waterPatch01WettedArea: number;
  waterPatch01DeckWettedArea: number;
  waterPatch01AddedMassPerArea: number;
  waterPatch01RadiationPerArea: number;
  waterPatch01NuX: number;
  waterPatch01NuY: number;
  waterPatch01NuZ: number;
  waterPatch01ArmCrossNuX: number;
  waterPatch01ArmCrossNuY: number;
  waterPatch01ArmCrossNuZ: number;
  waterPatch01ArmX: number;
  waterPatch01ArmY: number;
  waterPatch01ArmZ: number;
  waterPatch01NormalX: number;
  waterPatch01NormalY: number;
  waterPatch01NormalZ: number;
  waterPatch01PositionX: number;
  waterPatch01PositionY: number;
  waterPatch01PositionZ: number;
  waterPatch01RelativeX: number;
  waterPatch01RelativeY: number;
  waterPatch01RelativeZ: number;
  waterPatch01FlowX: number;
  waterPatch01FlowY: number;
  waterPatch01FlowZ: number;
  waterPatch01SurfaceY: number;
  waterPatch01SlopeX: number;
  waterPatch01SlopeZ: number;
  waterPatch01SampleNormalX: number;
  waterPatch01SampleNormalY: number;
  waterPatch01SampleNormalZ: number;
  waterPatch01WaterDepth: number;
  waterPatch02OldAddedMass: number;
  waterPatch02AddedMass: number;
  waterPatch02EntrainedMass: number;
  waterPatch02Radiation: number;
  waterPatch02IntoSurface: number;
  waterPatch02Push: number;
  waterPatch02Inertia: number;
  waterPatch02Projection: number;
  waterPatch02WettedArea: number;
  waterPatch02DeckWettedArea: number;
  waterPatch02AddedMassPerArea: number;
  waterPatch02RadiationPerArea: number;
  waterPatch02NuX: number;
  waterPatch02NuY: number;
  waterPatch02NuZ: number;
  waterPatch02ArmCrossNuX: number;
  waterPatch02ArmCrossNuY: number;
  waterPatch02ArmCrossNuZ: number;
  waterPatch02ArmX: number;
  waterPatch02ArmY: number;
  waterPatch02ArmZ: number;
  waterPatch02NormalX: number;
  waterPatch02NormalY: number;
  waterPatch02NormalZ: number;
  waterPatch02PositionX: number;
  waterPatch02PositionY: number;
  waterPatch02PositionZ: number;
  waterPatch02RelativeX: number;
  waterPatch02RelativeY: number;
  waterPatch02RelativeZ: number;
  waterPatch02FlowX: number;
  waterPatch02FlowY: number;
  waterPatch02FlowZ: number;
  waterPatch02SurfaceY: number;
  waterPatch02SlopeX: number;
  waterPatch02SlopeZ: number;
  waterPatch02SampleNormalX: number;
  waterPatch02SampleNormalY: number;
  waterPatch02SampleNormalZ: number;
  waterPatch02WaterDepth: number;
  waterPatch03OldAddedMass: number;
  waterPatch03AddedMass: number;
  waterPatch03EntrainedMass: number;
  waterPatch03Radiation: number;
  waterPatch03IntoSurface: number;
  waterPatch03Push: number;
  waterPatch03Inertia: number;
  waterPatch03Projection: number;
  waterPatch03WettedArea: number;
  waterPatch03DeckWettedArea: number;
  waterPatch03AddedMassPerArea: number;
  waterPatch03RadiationPerArea: number;
  waterPatch03NuX: number;
  waterPatch03NuY: number;
  waterPatch03NuZ: number;
  waterPatch03ArmCrossNuX: number;
  waterPatch03ArmCrossNuY: number;
  waterPatch03ArmCrossNuZ: number;
  waterPatch03ArmX: number;
  waterPatch03ArmY: number;
  waterPatch03ArmZ: number;
  waterPatch03NormalX: number;
  waterPatch03NormalY: number;
  waterPatch03NormalZ: number;
  waterPatch03PositionX: number;
  waterPatch03PositionY: number;
  waterPatch03PositionZ: number;
  waterPatch03RelativeX: number;
  waterPatch03RelativeY: number;
  waterPatch03RelativeZ: number;
  waterPatch03FlowX: number;
  waterPatch03FlowY: number;
  waterPatch03FlowZ: number;
  waterPatch03SurfaceY: number;
  waterPatch03SlopeX: number;
  waterPatch03SlopeZ: number;
  waterPatch03SampleNormalX: number;
  waterPatch03SampleNormalY: number;
  waterPatch03SampleNormalZ: number;
  waterPatch03WaterDepth: number;
  waterPatch04OldAddedMass: number;
  waterPatch04AddedMass: number;
  waterPatch04EntrainedMass: number;
  waterPatch04Radiation: number;
  waterPatch04IntoSurface: number;
  waterPatch04Push: number;
  waterPatch04Inertia: number;
  waterPatch04Projection: number;
  waterPatch04WettedArea: number;
  waterPatch04DeckWettedArea: number;
  waterPatch04AddedMassPerArea: number;
  waterPatch04RadiationPerArea: number;
  waterPatch04NuX: number;
  waterPatch04NuY: number;
  waterPatch04NuZ: number;
  waterPatch04ArmCrossNuX: number;
  waterPatch04ArmCrossNuY: number;
  waterPatch04ArmCrossNuZ: number;
  waterPatch04ArmX: number;
  waterPatch04ArmY: number;
  waterPatch04ArmZ: number;
  waterPatch04NormalX: number;
  waterPatch04NormalY: number;
  waterPatch04NormalZ: number;
  waterPatch04PositionX: number;
  waterPatch04PositionY: number;
  waterPatch04PositionZ: number;
  waterPatch04RelativeX: number;
  waterPatch04RelativeY: number;
  waterPatch04RelativeZ: number;
  waterPatch04FlowX: number;
  waterPatch04FlowY: number;
  waterPatch04FlowZ: number;
  waterPatch04SurfaceY: number;
  waterPatch04SlopeX: number;
  waterPatch04SlopeZ: number;
  waterPatch04SampleNormalX: number;
  waterPatch04SampleNormalY: number;
  waterPatch04SampleNormalZ: number;
  waterPatch04WaterDepth: number;
  waterPatch05OldAddedMass: number;
  waterPatch05AddedMass: number;
  waterPatch05EntrainedMass: number;
  waterPatch05Radiation: number;
  waterPatch05IntoSurface: number;
  waterPatch05Push: number;
  waterPatch05Inertia: number;
  waterPatch05Projection: number;
  waterPatch05WettedArea: number;
  waterPatch05DeckWettedArea: number;
  waterPatch05AddedMassPerArea: number;
  waterPatch05RadiationPerArea: number;
  waterPatch05NuX: number;
  waterPatch05NuY: number;
  waterPatch05NuZ: number;
  waterPatch05ArmCrossNuX: number;
  waterPatch05ArmCrossNuY: number;
  waterPatch05ArmCrossNuZ: number;
  waterPatch05ArmX: number;
  waterPatch05ArmY: number;
  waterPatch05ArmZ: number;
  waterPatch05NormalX: number;
  waterPatch05NormalY: number;
  waterPatch05NormalZ: number;
  waterPatch05PositionX: number;
  waterPatch05PositionY: number;
  waterPatch05PositionZ: number;
  waterPatch05RelativeX: number;
  waterPatch05RelativeY: number;
  waterPatch05RelativeZ: number;
  waterPatch05FlowX: number;
  waterPatch05FlowY: number;
  waterPatch05FlowZ: number;
  waterPatch05SurfaceY: number;
  waterPatch05SlopeX: number;
  waterPatch05SlopeZ: number;
  waterPatch05SampleNormalX: number;
  waterPatch05SampleNormalY: number;
  waterPatch05SampleNormalZ: number;
  waterPatch05WaterDepth: number;
  waterPatch06OldAddedMass: number;
  waterPatch06AddedMass: number;
  waterPatch06EntrainedMass: number;
  waterPatch06Radiation: number;
  waterPatch06IntoSurface: number;
  waterPatch06Push: number;
  waterPatch06Inertia: number;
  waterPatch06Projection: number;
  waterPatch06WettedArea: number;
  waterPatch06DeckWettedArea: number;
  waterPatch06AddedMassPerArea: number;
  waterPatch06RadiationPerArea: number;
  waterPatch06NuX: number;
  waterPatch06NuY: number;
  waterPatch06NuZ: number;
  waterPatch06ArmCrossNuX: number;
  waterPatch06ArmCrossNuY: number;
  waterPatch06ArmCrossNuZ: number;
  waterPatch06ArmX: number;
  waterPatch06ArmY: number;
  waterPatch06ArmZ: number;
  waterPatch06NormalX: number;
  waterPatch06NormalY: number;
  waterPatch06NormalZ: number;
  waterPatch06PositionX: number;
  waterPatch06PositionY: number;
  waterPatch06PositionZ: number;
  waterPatch06RelativeX: number;
  waterPatch06RelativeY: number;
  waterPatch06RelativeZ: number;
  waterPatch06FlowX: number;
  waterPatch06FlowY: number;
  waterPatch06FlowZ: number;
  waterPatch06SurfaceY: number;
  waterPatch06SlopeX: number;
  waterPatch06SlopeZ: number;
  waterPatch06SampleNormalX: number;
  waterPatch06SampleNormalY: number;
  waterPatch06SampleNormalZ: number;
  waterPatch06WaterDepth: number;
  waterPatch07OldAddedMass: number;
  waterPatch07AddedMass: number;
  waterPatch07EntrainedMass: number;
  waterPatch07Radiation: number;
  waterPatch07IntoSurface: number;
  waterPatch07Push: number;
  waterPatch07Inertia: number;
  waterPatch07Projection: number;
  waterPatch07WettedArea: number;
  waterPatch07DeckWettedArea: number;
  waterPatch07AddedMassPerArea: number;
  waterPatch07RadiationPerArea: number;
  waterPatch07NuX: number;
  waterPatch07NuY: number;
  waterPatch07NuZ: number;
  waterPatch07ArmCrossNuX: number;
  waterPatch07ArmCrossNuY: number;
  waterPatch07ArmCrossNuZ: number;
  waterPatch07ArmX: number;
  waterPatch07ArmY: number;
  waterPatch07ArmZ: number;
  waterPatch07NormalX: number;
  waterPatch07NormalY: number;
  waterPatch07NormalZ: number;
  waterPatch07PositionX: number;
  waterPatch07PositionY: number;
  waterPatch07PositionZ: number;
  waterPatch07RelativeX: number;
  waterPatch07RelativeY: number;
  waterPatch07RelativeZ: number;
  waterPatch07FlowX: number;
  waterPatch07FlowY: number;
  waterPatch07FlowZ: number;
  waterPatch07SurfaceY: number;
  waterPatch07SlopeX: number;
  waterPatch07SlopeZ: number;
  waterPatch07SampleNormalX: number;
  waterPatch07SampleNormalY: number;
  waterPatch07SampleNormalZ: number;
  waterPatch07WaterDepth: number;
  waterPatch08OldAddedMass: number;
  waterPatch08AddedMass: number;
  waterPatch08EntrainedMass: number;
  waterPatch08Radiation: number;
  waterPatch08IntoSurface: number;
  waterPatch08Push: number;
  waterPatch08Inertia: number;
  waterPatch08Projection: number;
  waterPatch08WettedArea: number;
  waterPatch08DeckWettedArea: number;
  waterPatch08AddedMassPerArea: number;
  waterPatch08RadiationPerArea: number;
  waterPatch08NuX: number;
  waterPatch08NuY: number;
  waterPatch08NuZ: number;
  waterPatch08ArmCrossNuX: number;
  waterPatch08ArmCrossNuY: number;
  waterPatch08ArmCrossNuZ: number;
  waterPatch08ArmX: number;
  waterPatch08ArmY: number;
  waterPatch08ArmZ: number;
  waterPatch08NormalX: number;
  waterPatch08NormalY: number;
  waterPatch08NormalZ: number;
  waterPatch08PositionX: number;
  waterPatch08PositionY: number;
  waterPatch08PositionZ: number;
  waterPatch08RelativeX: number;
  waterPatch08RelativeY: number;
  waterPatch08RelativeZ: number;
  waterPatch08FlowX: number;
  waterPatch08FlowY: number;
  waterPatch08FlowZ: number;
  waterPatch08SurfaceY: number;
  waterPatch08SlopeX: number;
  waterPatch08SlopeZ: number;
  waterPatch08SampleNormalX: number;
  waterPatch08SampleNormalY: number;
  waterPatch08SampleNormalZ: number;
  waterPatch08WaterDepth: number;
  waterPatch09OldAddedMass: number;
  waterPatch09AddedMass: number;
  waterPatch09EntrainedMass: number;
  waterPatch09Radiation: number;
  waterPatch09IntoSurface: number;
  waterPatch09Push: number;
  waterPatch09Inertia: number;
  waterPatch09Projection: number;
  waterPatch09WettedArea: number;
  waterPatch09DeckWettedArea: number;
  waterPatch09AddedMassPerArea: number;
  waterPatch09RadiationPerArea: number;
  waterPatch09NuX: number;
  waterPatch09NuY: number;
  waterPatch09NuZ: number;
  waterPatch09ArmCrossNuX: number;
  waterPatch09ArmCrossNuY: number;
  waterPatch09ArmCrossNuZ: number;
  waterPatch09ArmX: number;
  waterPatch09ArmY: number;
  waterPatch09ArmZ: number;
  waterPatch09NormalX: number;
  waterPatch09NormalY: number;
  waterPatch09NormalZ: number;
  waterPatch09PositionX: number;
  waterPatch09PositionY: number;
  waterPatch09PositionZ: number;
  waterPatch09RelativeX: number;
  waterPatch09RelativeY: number;
  waterPatch09RelativeZ: number;
  waterPatch09FlowX: number;
  waterPatch09FlowY: number;
  waterPatch09FlowZ: number;
  waterPatch09SurfaceY: number;
  waterPatch09SlopeX: number;
  waterPatch09SlopeZ: number;
  waterPatch09SampleNormalX: number;
  waterPatch09SampleNormalY: number;
  waterPatch09SampleNormalZ: number;
  waterPatch09WaterDepth: number;
  waterPatch10OldAddedMass: number;
  waterPatch10AddedMass: number;
  waterPatch10EntrainedMass: number;
  waterPatch10Radiation: number;
  waterPatch10IntoSurface: number;
  waterPatch10Push: number;
  waterPatch10Inertia: number;
  waterPatch10Projection: number;
  waterPatch10WettedArea: number;
  waterPatch10DeckWettedArea: number;
  waterPatch10AddedMassPerArea: number;
  waterPatch10RadiationPerArea: number;
  waterPatch10NuX: number;
  waterPatch10NuY: number;
  waterPatch10NuZ: number;
  waterPatch10ArmCrossNuX: number;
  waterPatch10ArmCrossNuY: number;
  waterPatch10ArmCrossNuZ: number;
  waterPatch10ArmX: number;
  waterPatch10ArmY: number;
  waterPatch10ArmZ: number;
  waterPatch10NormalX: number;
  waterPatch10NormalY: number;
  waterPatch10NormalZ: number;
  waterPatch10PositionX: number;
  waterPatch10PositionY: number;
  waterPatch10PositionZ: number;
  waterPatch10RelativeX: number;
  waterPatch10RelativeY: number;
  waterPatch10RelativeZ: number;
  waterPatch10FlowX: number;
  waterPatch10FlowY: number;
  waterPatch10FlowZ: number;
  waterPatch10SurfaceY: number;
  waterPatch10SlopeX: number;
  waterPatch10SlopeZ: number;
  waterPatch10SampleNormalX: number;
  waterPatch10SampleNormalY: number;
  waterPatch10SampleNormalZ: number;
  waterPatch10WaterDepth: number;
  waterPatch11OldAddedMass: number;
  waterPatch11AddedMass: number;
  waterPatch11EntrainedMass: number;
  waterPatch11Radiation: number;
  waterPatch11IntoSurface: number;
  waterPatch11Push: number;
  waterPatch11Inertia: number;
  waterPatch11Projection: number;
  waterPatch11WettedArea: number;
  waterPatch11DeckWettedArea: number;
  waterPatch11AddedMassPerArea: number;
  waterPatch11RadiationPerArea: number;
  waterPatch11NuX: number;
  waterPatch11NuY: number;
  waterPatch11NuZ: number;
  waterPatch11ArmCrossNuX: number;
  waterPatch11ArmCrossNuY: number;
  waterPatch11ArmCrossNuZ: number;
  waterPatch11ArmX: number;
  waterPatch11ArmY: number;
  waterPatch11ArmZ: number;
  waterPatch11NormalX: number;
  waterPatch11NormalY: number;
  waterPatch11NormalZ: number;
  waterPatch11PositionX: number;
  waterPatch11PositionY: number;
  waterPatch11PositionZ: number;
  waterPatch11RelativeX: number;
  waterPatch11RelativeY: number;
  waterPatch11RelativeZ: number;
  waterPatch11FlowX: number;
  waterPatch11FlowY: number;
  waterPatch11FlowZ: number;
  waterPatch11SurfaceY: number;
  waterPatch11SlopeX: number;
  waterPatch11SlopeZ: number;
  waterPatch11SampleNormalX: number;
  waterPatch11SampleNormalY: number;
  waterPatch11SampleNormalZ: number;
  waterPatch11WaterDepth: number;
  waterPatch12OldAddedMass: number;
  waterPatch12AddedMass: number;
  waterPatch12EntrainedMass: number;
  waterPatch12Radiation: number;
  waterPatch12IntoSurface: number;
  waterPatch12Push: number;
  waterPatch12Inertia: number;
  waterPatch12Projection: number;
  waterPatch12WettedArea: number;
  waterPatch12DeckWettedArea: number;
  waterPatch12AddedMassPerArea: number;
  waterPatch12RadiationPerArea: number;
  waterPatch12NuX: number;
  waterPatch12NuY: number;
  waterPatch12NuZ: number;
  waterPatch12ArmCrossNuX: number;
  waterPatch12ArmCrossNuY: number;
  waterPatch12ArmCrossNuZ: number;
  waterPatch12ArmX: number;
  waterPatch12ArmY: number;
  waterPatch12ArmZ: number;
  waterPatch12NormalX: number;
  waterPatch12NormalY: number;
  waterPatch12NormalZ: number;
  waterPatch12PositionX: number;
  waterPatch12PositionY: number;
  waterPatch12PositionZ: number;
  waterPatch12RelativeX: number;
  waterPatch12RelativeY: number;
  waterPatch12RelativeZ: number;
  waterPatch12FlowX: number;
  waterPatch12FlowY: number;
  waterPatch12FlowZ: number;
  waterPatch12SurfaceY: number;
  waterPatch12SlopeX: number;
  waterPatch12SlopeZ: number;
  waterPatch12SampleNormalX: number;
  waterPatch12SampleNormalY: number;
  waterPatch12SampleNormalZ: number;
  waterPatch12WaterDepth: number;
  waterPatch13OldAddedMass: number;
  waterPatch13AddedMass: number;
  waterPatch13EntrainedMass: number;
  waterPatch13Radiation: number;
  waterPatch13IntoSurface: number;
  waterPatch13Push: number;
  waterPatch13Inertia: number;
  waterPatch13Projection: number;
  waterPatch13WettedArea: number;
  waterPatch13DeckWettedArea: number;
  waterPatch13AddedMassPerArea: number;
  waterPatch13RadiationPerArea: number;
  waterPatch13NuX: number;
  waterPatch13NuY: number;
  waterPatch13NuZ: number;
  waterPatch13ArmCrossNuX: number;
  waterPatch13ArmCrossNuY: number;
  waterPatch13ArmCrossNuZ: number;
  waterPatch13ArmX: number;
  waterPatch13ArmY: number;
  waterPatch13ArmZ: number;
  waterPatch13NormalX: number;
  waterPatch13NormalY: number;
  waterPatch13NormalZ: number;
  waterPatch13PositionX: number;
  waterPatch13PositionY: number;
  waterPatch13PositionZ: number;
  waterPatch13RelativeX: number;
  waterPatch13RelativeY: number;
  waterPatch13RelativeZ: number;
  waterPatch13FlowX: number;
  waterPatch13FlowY: number;
  waterPatch13FlowZ: number;
  waterPatch13SurfaceY: number;
  waterPatch13SlopeX: number;
  waterPatch13SlopeZ: number;
  waterPatch13SampleNormalX: number;
  waterPatch13SampleNormalY: number;
  waterPatch13SampleNormalZ: number;
  waterPatch13WaterDepth: number;
  waterPatch14OldAddedMass: number;
  waterPatch14AddedMass: number;
  waterPatch14EntrainedMass: number;
  waterPatch14Radiation: number;
  waterPatch14IntoSurface: number;
  waterPatch14Push: number;
  waterPatch14Inertia: number;
  waterPatch14Projection: number;
  waterPatch14WettedArea: number;
  waterPatch14DeckWettedArea: number;
  waterPatch14AddedMassPerArea: number;
  waterPatch14RadiationPerArea: number;
  waterPatch14NuX: number;
  waterPatch14NuY: number;
  waterPatch14NuZ: number;
  waterPatch14ArmCrossNuX: number;
  waterPatch14ArmCrossNuY: number;
  waterPatch14ArmCrossNuZ: number;
  waterPatch14ArmX: number;
  waterPatch14ArmY: number;
  waterPatch14ArmZ: number;
  waterPatch14NormalX: number;
  waterPatch14NormalY: number;
  waterPatch14NormalZ: number;
  waterPatch14PositionX: number;
  waterPatch14PositionY: number;
  waterPatch14PositionZ: number;
  waterPatch14RelativeX: number;
  waterPatch14RelativeY: number;
  waterPatch14RelativeZ: number;
  waterPatch14FlowX: number;
  waterPatch14FlowY: number;
  waterPatch14FlowZ: number;
  waterPatch14SurfaceY: number;
  waterPatch14SlopeX: number;
  waterPatch14SlopeZ: number;
  waterPatch14SampleNormalX: number;
  waterPatch14SampleNormalY: number;
  waterPatch14SampleNormalZ: number;
  waterPatch14WaterDepth: number;
  waterPatch15OldAddedMass: number;
  waterPatch15AddedMass: number;
  waterPatch15EntrainedMass: number;
  waterPatch15Radiation: number;
  waterPatch15IntoSurface: number;
  waterPatch15Push: number;
  waterPatch15Inertia: number;
  waterPatch15Projection: number;
  waterPatch15WettedArea: number;
  waterPatch15DeckWettedArea: number;
  waterPatch15AddedMassPerArea: number;
  waterPatch15RadiationPerArea: number;
  waterPatch15NuX: number;
  waterPatch15NuY: number;
  waterPatch15NuZ: number;
  waterPatch15ArmCrossNuX: number;
  waterPatch15ArmCrossNuY: number;
  waterPatch15ArmCrossNuZ: number;
  waterPatch15ArmX: number;
  waterPatch15ArmY: number;
  waterPatch15ArmZ: number;
  waterPatch15NormalX: number;
  waterPatch15NormalY: number;
  waterPatch15NormalZ: number;
  waterPatch15PositionX: number;
  waterPatch15PositionY: number;
  waterPatch15PositionZ: number;
  waterPatch15RelativeX: number;
  waterPatch15RelativeY: number;
  waterPatch15RelativeZ: number;
  waterPatch15FlowX: number;
  waterPatch15FlowY: number;
  waterPatch15FlowZ: number;
  waterPatch15SurfaceY: number;
  waterPatch15SlopeX: number;
  waterPatch15SlopeZ: number;
  waterPatch15SampleNormalX: number;
  waterPatch15SampleNormalY: number;
  waterPatch15SampleNormalZ: number;
  waterPatch15WaterDepth: number;
  waterPatch16OldAddedMass: number;
  waterPatch16AddedMass: number;
  waterPatch16EntrainedMass: number;
  waterPatch16Radiation: number;
  waterPatch16IntoSurface: number;
  waterPatch16Push: number;
  waterPatch16Inertia: number;
  waterPatch16Projection: number;
  waterPatch16WettedArea: number;
  waterPatch16DeckWettedArea: number;
  waterPatch16AddedMassPerArea: number;
  waterPatch16RadiationPerArea: number;
  waterPatch16NuX: number;
  waterPatch16NuY: number;
  waterPatch16NuZ: number;
  waterPatch16ArmCrossNuX: number;
  waterPatch16ArmCrossNuY: number;
  waterPatch16ArmCrossNuZ: number;
  waterPatch16ArmX: number;
  waterPatch16ArmY: number;
  waterPatch16ArmZ: number;
  waterPatch16NormalX: number;
  waterPatch16NormalY: number;
  waterPatch16NormalZ: number;
  waterPatch16PositionX: number;
  waterPatch16PositionY: number;
  waterPatch16PositionZ: number;
  waterPatch16RelativeX: number;
  waterPatch16RelativeY: number;
  waterPatch16RelativeZ: number;
  waterPatch16FlowX: number;
  waterPatch16FlowY: number;
  waterPatch16FlowZ: number;
  waterPatch16SurfaceY: number;
  waterPatch16SlopeX: number;
  waterPatch16SlopeZ: number;
  waterPatch16SampleNormalX: number;
  waterPatch16SampleNormalY: number;
  waterPatch16SampleNormalZ: number;
  waterPatch16WaterDepth: number;
  waterPatch17OldAddedMass: number;
  waterPatch17AddedMass: number;
  waterPatch17EntrainedMass: number;
  waterPatch17Radiation: number;
  waterPatch17IntoSurface: number;
  waterPatch17Push: number;
  waterPatch17Inertia: number;
  waterPatch17Projection: number;
  waterPatch17WettedArea: number;
  waterPatch17DeckWettedArea: number;
  waterPatch17AddedMassPerArea: number;
  waterPatch17RadiationPerArea: number;
  waterPatch17NuX: number;
  waterPatch17NuY: number;
  waterPatch17NuZ: number;
  waterPatch17ArmCrossNuX: number;
  waterPatch17ArmCrossNuY: number;
  waterPatch17ArmCrossNuZ: number;
  waterPatch17ArmX: number;
  waterPatch17ArmY: number;
  waterPatch17ArmZ: number;
  waterPatch17NormalX: number;
  waterPatch17NormalY: number;
  waterPatch17NormalZ: number;
  waterPatch17PositionX: number;
  waterPatch17PositionY: number;
  waterPatch17PositionZ: number;
  waterPatch17RelativeX: number;
  waterPatch17RelativeY: number;
  waterPatch17RelativeZ: number;
  waterPatch17FlowX: number;
  waterPatch17FlowY: number;
  waterPatch17FlowZ: number;
  waterPatch17SurfaceY: number;
  waterPatch17SlopeX: number;
  waterPatch17SlopeZ: number;
  waterPatch17SampleNormalX: number;
  waterPatch17SampleNormalY: number;
  waterPatch17SampleNormalZ: number;
  waterPatch17WaterDepth: number;
  waterPatch18OldAddedMass: number;
  waterPatch18AddedMass: number;
  waterPatch18EntrainedMass: number;
  waterPatch18Radiation: number;
  waterPatch18IntoSurface: number;
  waterPatch18Push: number;
  waterPatch18Inertia: number;
  waterPatch18Projection: number;
  waterPatch18WettedArea: number;
  waterPatch18DeckWettedArea: number;
  waterPatch18AddedMassPerArea: number;
  waterPatch18RadiationPerArea: number;
  waterPatch18NuX: number;
  waterPatch18NuY: number;
  waterPatch18NuZ: number;
  waterPatch18ArmCrossNuX: number;
  waterPatch18ArmCrossNuY: number;
  waterPatch18ArmCrossNuZ: number;
  waterPatch18ArmX: number;
  waterPatch18ArmY: number;
  waterPatch18ArmZ: number;
  waterPatch18NormalX: number;
  waterPatch18NormalY: number;
  waterPatch18NormalZ: number;
  waterPatch18PositionX: number;
  waterPatch18PositionY: number;
  waterPatch18PositionZ: number;
  waterPatch18RelativeX: number;
  waterPatch18RelativeY: number;
  waterPatch18RelativeZ: number;
  waterPatch18FlowX: number;
  waterPatch18FlowY: number;
  waterPatch18FlowZ: number;
  waterPatch18SurfaceY: number;
  waterPatch18SlopeX: number;
  waterPatch18SlopeZ: number;
  waterPatch18SampleNormalX: number;
  waterPatch18SampleNormalY: number;
  waterPatch18SampleNormalZ: number;
  waterPatch18WaterDepth: number;
  waterPatch19OldAddedMass: number;
  waterPatch19AddedMass: number;
  waterPatch19EntrainedMass: number;
  waterPatch19Radiation: number;
  waterPatch19IntoSurface: number;
  waterPatch19Push: number;
  waterPatch19Inertia: number;
  waterPatch19Projection: number;
  waterPatch19WettedArea: number;
  waterPatch19DeckWettedArea: number;
  waterPatch19AddedMassPerArea: number;
  waterPatch19RadiationPerArea: number;
  waterPatch19NuX: number;
  waterPatch19NuY: number;
  waterPatch19NuZ: number;
  waterPatch19ArmCrossNuX: number;
  waterPatch19ArmCrossNuY: number;
  waterPatch19ArmCrossNuZ: number;
  waterPatch19ArmX: number;
  waterPatch19ArmY: number;
  waterPatch19ArmZ: number;
  waterPatch19NormalX: number;
  waterPatch19NormalY: number;
  waterPatch19NormalZ: number;
  waterPatch19PositionX: number;
  waterPatch19PositionY: number;
  waterPatch19PositionZ: number;
  waterPatch19RelativeX: number;
  waterPatch19RelativeY: number;
  waterPatch19RelativeZ: number;
  waterPatch19FlowX: number;
  waterPatch19FlowY: number;
  waterPatch19FlowZ: number;
  waterPatch19SurfaceY: number;
  waterPatch19SlopeX: number;
  waterPatch19SlopeZ: number;
  waterPatch19SampleNormalX: number;
  waterPatch19SampleNormalY: number;
  waterPatch19SampleNormalZ: number;
  waterPatch19WaterDepth: number;
  waterPatch20OldAddedMass: number;
  waterPatch20AddedMass: number;
  waterPatch20EntrainedMass: number;
  waterPatch20Radiation: number;
  waterPatch20IntoSurface: number;
  waterPatch20Push: number;
  waterPatch20Inertia: number;
  waterPatch20Projection: number;
  waterPatch20WettedArea: number;
  waterPatch20DeckWettedArea: number;
  waterPatch20AddedMassPerArea: number;
  waterPatch20RadiationPerArea: number;
  waterPatch20NuX: number;
  waterPatch20NuY: number;
  waterPatch20NuZ: number;
  waterPatch20ArmCrossNuX: number;
  waterPatch20ArmCrossNuY: number;
  waterPatch20ArmCrossNuZ: number;
  waterPatch20ArmX: number;
  waterPatch20ArmY: number;
  waterPatch20ArmZ: number;
  waterPatch20NormalX: number;
  waterPatch20NormalY: number;
  waterPatch20NormalZ: number;
  waterPatch20PositionX: number;
  waterPatch20PositionY: number;
  waterPatch20PositionZ: number;
  waterPatch20RelativeX: number;
  waterPatch20RelativeY: number;
  waterPatch20RelativeZ: number;
  waterPatch20FlowX: number;
  waterPatch20FlowY: number;
  waterPatch20FlowZ: number;
  waterPatch20SurfaceY: number;
  waterPatch20SlopeX: number;
  waterPatch20SlopeZ: number;
  waterPatch20SampleNormalX: number;
  waterPatch20SampleNormalY: number;
  waterPatch20SampleNormalZ: number;
  waterPatch20WaterDepth: number;
  waterPatch21OldAddedMass: number;
  waterPatch21AddedMass: number;
  waterPatch21EntrainedMass: number;
  waterPatch21Radiation: number;
  waterPatch21IntoSurface: number;
  waterPatch21Push: number;
  waterPatch21Inertia: number;
  waterPatch21Projection: number;
  waterPatch21WettedArea: number;
  waterPatch21DeckWettedArea: number;
  waterPatch21AddedMassPerArea: number;
  waterPatch21RadiationPerArea: number;
  waterPatch21NuX: number;
  waterPatch21NuY: number;
  waterPatch21NuZ: number;
  waterPatch21ArmCrossNuX: number;
  waterPatch21ArmCrossNuY: number;
  waterPatch21ArmCrossNuZ: number;
  waterPatch21ArmX: number;
  waterPatch21ArmY: number;
  waterPatch21ArmZ: number;
  waterPatch21NormalX: number;
  waterPatch21NormalY: number;
  waterPatch21NormalZ: number;
  waterPatch21PositionX: number;
  waterPatch21PositionY: number;
  waterPatch21PositionZ: number;
  waterPatch21RelativeX: number;
  waterPatch21RelativeY: number;
  waterPatch21RelativeZ: number;
  waterPatch21FlowX: number;
  waterPatch21FlowY: number;
  waterPatch21FlowZ: number;
  waterPatch21SurfaceY: number;
  waterPatch21SlopeX: number;
  waterPatch21SlopeZ: number;
  waterPatch21SampleNormalX: number;
  waterPatch21SampleNormalY: number;
  waterPatch21SampleNormalZ: number;
  waterPatch21WaterDepth: number;
  waterPatch22OldAddedMass: number;
  waterPatch22AddedMass: number;
  waterPatch22EntrainedMass: number;
  waterPatch22Radiation: number;
  waterPatch22IntoSurface: number;
  waterPatch22Push: number;
  waterPatch22Inertia: number;
  waterPatch22Projection: number;
  waterPatch22WettedArea: number;
  waterPatch22DeckWettedArea: number;
  waterPatch22AddedMassPerArea: number;
  waterPatch22RadiationPerArea: number;
  waterPatch22NuX: number;
  waterPatch22NuY: number;
  waterPatch22NuZ: number;
  waterPatch22ArmCrossNuX: number;
  waterPatch22ArmCrossNuY: number;
  waterPatch22ArmCrossNuZ: number;
  waterPatch22ArmX: number;
  waterPatch22ArmY: number;
  waterPatch22ArmZ: number;
  waterPatch22NormalX: number;
  waterPatch22NormalY: number;
  waterPatch22NormalZ: number;
  waterPatch22PositionX: number;
  waterPatch22PositionY: number;
  waterPatch22PositionZ: number;
  waterPatch22RelativeX: number;
  waterPatch22RelativeY: number;
  waterPatch22RelativeZ: number;
  waterPatch22FlowX: number;
  waterPatch22FlowY: number;
  waterPatch22FlowZ: number;
  waterPatch22SurfaceY: number;
  waterPatch22SlopeX: number;
  waterPatch22SlopeZ: number;
  waterPatch22SampleNormalX: number;
  waterPatch22SampleNormalY: number;
  waterPatch22SampleNormalZ: number;
  waterPatch22WaterDepth: number;
  waterPatch23OldAddedMass: number;
  waterPatch23AddedMass: number;
  waterPatch23EntrainedMass: number;
  waterPatch23Radiation: number;
  waterPatch23IntoSurface: number;
  waterPatch23Push: number;
  waterPatch23Inertia: number;
  waterPatch23Projection: number;
  waterPatch23WettedArea: number;
  waterPatch23DeckWettedArea: number;
  waterPatch23AddedMassPerArea: number;
  waterPatch23RadiationPerArea: number;
  waterPatch23NuX: number;
  waterPatch23NuY: number;
  waterPatch23NuZ: number;
  waterPatch23ArmCrossNuX: number;
  waterPatch23ArmCrossNuY: number;
  waterPatch23ArmCrossNuZ: number;
  waterPatch23ArmX: number;
  waterPatch23ArmY: number;
  waterPatch23ArmZ: number;
  waterPatch23NormalX: number;
  waterPatch23NormalY: number;
  waterPatch23NormalZ: number;
  waterPatch23PositionX: number;
  waterPatch23PositionY: number;
  waterPatch23PositionZ: number;
  waterPatch23RelativeX: number;
  waterPatch23RelativeY: number;
  waterPatch23RelativeZ: number;
  waterPatch23FlowX: number;
  waterPatch23FlowY: number;
  waterPatch23FlowZ: number;
  waterPatch23SurfaceY: number;
  waterPatch23SlopeX: number;
  waterPatch23SlopeZ: number;
  waterPatch23SampleNormalX: number;
  waterPatch23SampleNormalY: number;
  waterPatch23SampleNormalZ: number;
  waterPatch23WaterDepth: number;
  waterPatch24OldAddedMass: number;
  waterPatch24AddedMass: number;
  waterPatch24EntrainedMass: number;
  waterPatch24Radiation: number;
  waterPatch24IntoSurface: number;
  waterPatch24Push: number;
  waterPatch24Inertia: number;
  waterPatch24Projection: number;
  waterPatch24WettedArea: number;
  waterPatch24DeckWettedArea: number;
  waterPatch24AddedMassPerArea: number;
  waterPatch24RadiationPerArea: number;
  waterPatch24NuX: number;
  waterPatch24NuY: number;
  waterPatch24NuZ: number;
  waterPatch24ArmCrossNuX: number;
  waterPatch24ArmCrossNuY: number;
  waterPatch24ArmCrossNuZ: number;
  waterPatch24ArmX: number;
  waterPatch24ArmY: number;
  waterPatch24ArmZ: number;
  waterPatch24NormalX: number;
  waterPatch24NormalY: number;
  waterPatch24NormalZ: number;
  waterPatch24PositionX: number;
  waterPatch24PositionY: number;
  waterPatch24PositionZ: number;
  waterPatch24RelativeX: number;
  waterPatch24RelativeY: number;
  waterPatch24RelativeZ: number;
  waterPatch24FlowX: number;
  waterPatch24FlowY: number;
  waterPatch24FlowZ: number;
  waterPatch24SurfaceY: number;
  waterPatch24SlopeX: number;
  waterPatch24SlopeZ: number;
  waterPatch24SampleNormalX: number;
  waterPatch24SampleNormalY: number;
  waterPatch24SampleNormalZ: number;
  waterPatch24WaterDepth: number;
  waterPatch25OldAddedMass: number;
  waterPatch25AddedMass: number;
  waterPatch25EntrainedMass: number;
  waterPatch25Radiation: number;
  waterPatch25IntoSurface: number;
  waterPatch25Push: number;
  waterPatch25Inertia: number;
  waterPatch25Projection: number;
  waterPatch25WettedArea: number;
  waterPatch25DeckWettedArea: number;
  waterPatch25AddedMassPerArea: number;
  waterPatch25RadiationPerArea: number;
  waterPatch25NuX: number;
  waterPatch25NuY: number;
  waterPatch25NuZ: number;
  waterPatch25ArmCrossNuX: number;
  waterPatch25ArmCrossNuY: number;
  waterPatch25ArmCrossNuZ: number;
  waterPatch25ArmX: number;
  waterPatch25ArmY: number;
  waterPatch25ArmZ: number;
  waterPatch25NormalX: number;
  waterPatch25NormalY: number;
  waterPatch25NormalZ: number;
  waterPatch25PositionX: number;
  waterPatch25PositionY: number;
  waterPatch25PositionZ: number;
  waterPatch25RelativeX: number;
  waterPatch25RelativeY: number;
  waterPatch25RelativeZ: number;
  waterPatch25FlowX: number;
  waterPatch25FlowY: number;
  waterPatch25FlowZ: number;
  waterPatch25SurfaceY: number;
  waterPatch25SlopeX: number;
  waterPatch25SlopeZ: number;
  waterPatch25SampleNormalX: number;
  waterPatch25SampleNormalY: number;
  waterPatch25SampleNormalZ: number;
  waterPatch25WaterDepth: number;
  waterPatch26OldAddedMass: number;
  waterPatch26AddedMass: number;
  waterPatch26EntrainedMass: number;
  waterPatch26Radiation: number;
  waterPatch26IntoSurface: number;
  waterPatch26Push: number;
  waterPatch26Inertia: number;
  waterPatch26Projection: number;
  waterPatch26WettedArea: number;
  waterPatch26DeckWettedArea: number;
  waterPatch26AddedMassPerArea: number;
  waterPatch26RadiationPerArea: number;
  waterPatch26NuX: number;
  waterPatch26NuY: number;
  waterPatch26NuZ: number;
  waterPatch26ArmCrossNuX: number;
  waterPatch26ArmCrossNuY: number;
  waterPatch26ArmCrossNuZ: number;
  waterPatch26ArmX: number;
  waterPatch26ArmY: number;
  waterPatch26ArmZ: number;
  waterPatch26NormalX: number;
  waterPatch26NormalY: number;
  waterPatch26NormalZ: number;
  waterPatch26PositionX: number;
  waterPatch26PositionY: number;
  waterPatch26PositionZ: number;
  waterPatch26RelativeX: number;
  waterPatch26RelativeY: number;
  waterPatch26RelativeZ: number;
  waterPatch26FlowX: number;
  waterPatch26FlowY: number;
  waterPatch26FlowZ: number;
  waterPatch26SurfaceY: number;
  waterPatch26SlopeX: number;
  waterPatch26SlopeZ: number;
  waterPatch26SampleNormalX: number;
  waterPatch26SampleNormalY: number;
  waterPatch26SampleNormalZ: number;
  waterPatch26WaterDepth: number;
  waterPatch27OldAddedMass: number;
  waterPatch27AddedMass: number;
  waterPatch27EntrainedMass: number;
  waterPatch27Radiation: number;
  waterPatch27IntoSurface: number;
  waterPatch27Push: number;
  waterPatch27Inertia: number;
  waterPatch27Projection: number;
  waterPatch27WettedArea: number;
  waterPatch27DeckWettedArea: number;
  waterPatch27AddedMassPerArea: number;
  waterPatch27RadiationPerArea: number;
  waterPatch27NuX: number;
  waterPatch27NuY: number;
  waterPatch27NuZ: number;
  waterPatch27ArmCrossNuX: number;
  waterPatch27ArmCrossNuY: number;
  waterPatch27ArmCrossNuZ: number;
  waterPatch27ArmX: number;
  waterPatch27ArmY: number;
  waterPatch27ArmZ: number;
  waterPatch27NormalX: number;
  waterPatch27NormalY: number;
  waterPatch27NormalZ: number;
  waterPatch27PositionX: number;
  waterPatch27PositionY: number;
  waterPatch27PositionZ: number;
  waterPatch27RelativeX: number;
  waterPatch27RelativeY: number;
  waterPatch27RelativeZ: number;
  waterPatch27FlowX: number;
  waterPatch27FlowY: number;
  waterPatch27FlowZ: number;
  waterPatch27SurfaceY: number;
  waterPatch27SlopeX: number;
  waterPatch27SlopeZ: number;
  waterPatch27SampleNormalX: number;
  waterPatch27SampleNormalY: number;
  waterPatch27SampleNormalZ: number;
  waterPatch27WaterDepth: number;
  waterPatch28OldAddedMass: number;
  waterPatch28AddedMass: number;
  waterPatch28EntrainedMass: number;
  waterPatch28Radiation: number;
  waterPatch28IntoSurface: number;
  waterPatch28Push: number;
  waterPatch28Inertia: number;
  waterPatch28Projection: number;
  waterPatch28WettedArea: number;
  waterPatch28DeckWettedArea: number;
  waterPatch28AddedMassPerArea: number;
  waterPatch28RadiationPerArea: number;
  waterPatch28NuX: number;
  waterPatch28NuY: number;
  waterPatch28NuZ: number;
  waterPatch28ArmCrossNuX: number;
  waterPatch28ArmCrossNuY: number;
  waterPatch28ArmCrossNuZ: number;
  waterPatch28ArmX: number;
  waterPatch28ArmY: number;
  waterPatch28ArmZ: number;
  waterPatch28NormalX: number;
  waterPatch28NormalY: number;
  waterPatch28NormalZ: number;
  waterPatch28PositionX: number;
  waterPatch28PositionY: number;
  waterPatch28PositionZ: number;
  waterPatch28RelativeX: number;
  waterPatch28RelativeY: number;
  waterPatch28RelativeZ: number;
  waterPatch28FlowX: number;
  waterPatch28FlowY: number;
  waterPatch28FlowZ: number;
  waterPatch28SurfaceY: number;
  waterPatch28SlopeX: number;
  waterPatch28SlopeZ: number;
  waterPatch28SampleNormalX: number;
  waterPatch28SampleNormalY: number;
  waterPatch28SampleNormalZ: number;
  waterPatch28WaterDepth: number;
  waterPatch29OldAddedMass: number;
  waterPatch29AddedMass: number;
  waterPatch29EntrainedMass: number;
  waterPatch29Radiation: number;
  waterPatch29IntoSurface: number;
  waterPatch29Push: number;
  waterPatch29Inertia: number;
  waterPatch29Projection: number;
  waterPatch29WettedArea: number;
  waterPatch29DeckWettedArea: number;
  waterPatch29AddedMassPerArea: number;
  waterPatch29RadiationPerArea: number;
  waterPatch29NuX: number;
  waterPatch29NuY: number;
  waterPatch29NuZ: number;
  waterPatch29ArmCrossNuX: number;
  waterPatch29ArmCrossNuY: number;
  waterPatch29ArmCrossNuZ: number;
  waterPatch29ArmX: number;
  waterPatch29ArmY: number;
  waterPatch29ArmZ: number;
  waterPatch29NormalX: number;
  waterPatch29NormalY: number;
  waterPatch29NormalZ: number;
  waterPatch29PositionX: number;
  waterPatch29PositionY: number;
  waterPatch29PositionZ: number;
  waterPatch29RelativeX: number;
  waterPatch29RelativeY: number;
  waterPatch29RelativeZ: number;
  waterPatch29FlowX: number;
  waterPatch29FlowY: number;
  waterPatch29FlowZ: number;
  waterPatch29SurfaceY: number;
  waterPatch29SlopeX: number;
  waterPatch29SlopeZ: number;
  waterPatch29SampleNormalX: number;
  waterPatch29SampleNormalY: number;
  waterPatch29SampleNormalZ: number;
  waterPatch29WaterDepth: number;
  waterPatch30OldAddedMass: number;
  waterPatch30AddedMass: number;
  waterPatch30EntrainedMass: number;
  waterPatch30Radiation: number;
  waterPatch30IntoSurface: number;
  waterPatch30Push: number;
  waterPatch30Inertia: number;
  waterPatch30Projection: number;
  waterPatch30WettedArea: number;
  waterPatch30DeckWettedArea: number;
  waterPatch30AddedMassPerArea: number;
  waterPatch30RadiationPerArea: number;
  waterPatch30NuX: number;
  waterPatch30NuY: number;
  waterPatch30NuZ: number;
  waterPatch30ArmCrossNuX: number;
  waterPatch30ArmCrossNuY: number;
  waterPatch30ArmCrossNuZ: number;
  waterPatch30ArmX: number;
  waterPatch30ArmY: number;
  waterPatch30ArmZ: number;
  waterPatch30NormalX: number;
  waterPatch30NormalY: number;
  waterPatch30NormalZ: number;
  waterPatch30PositionX: number;
  waterPatch30PositionY: number;
  waterPatch30PositionZ: number;
  waterPatch30RelativeX: number;
  waterPatch30RelativeY: number;
  waterPatch30RelativeZ: number;
  waterPatch30FlowX: number;
  waterPatch30FlowY: number;
  waterPatch30FlowZ: number;
  waterPatch30SurfaceY: number;
  waterPatch30SlopeX: number;
  waterPatch30SlopeZ: number;
  waterPatch30SampleNormalX: number;
  waterPatch30SampleNormalY: number;
  waterPatch30SampleNormalZ: number;
  waterPatch30WaterDepth: number;
  waterPatch31OldAddedMass: number;
  waterPatch31AddedMass: number;
  waterPatch31EntrainedMass: number;
  waterPatch31Radiation: number;
  waterPatch31IntoSurface: number;
  waterPatch31Push: number;
  waterPatch31Inertia: number;
  waterPatch31Projection: number;
  waterPatch31WettedArea: number;
  waterPatch31DeckWettedArea: number;
  waterPatch31AddedMassPerArea: number;
  waterPatch31RadiationPerArea: number;
  waterPatch31NuX: number;
  waterPatch31NuY: number;
  waterPatch31NuZ: number;
  waterPatch31ArmCrossNuX: number;
  waterPatch31ArmCrossNuY: number;
  waterPatch31ArmCrossNuZ: number;
  waterPatch31ArmX: number;
  waterPatch31ArmY: number;
  waterPatch31ArmZ: number;
  waterPatch31NormalX: number;
  waterPatch31NormalY: number;
  waterPatch31NormalZ: number;
  waterPatch31PositionX: number;
  waterPatch31PositionY: number;
  waterPatch31PositionZ: number;
  waterPatch31RelativeX: number;
  waterPatch31RelativeY: number;
  waterPatch31RelativeZ: number;
  waterPatch31FlowX: number;
  waterPatch31FlowY: number;
  waterPatch31FlowZ: number;
  waterPatch31SurfaceY: number;
  waterPatch31SlopeX: number;
  waterPatch31SlopeZ: number;
  waterPatch31SampleNormalX: number;
  waterPatch31SampleNormalY: number;
  waterPatch31SampleNormalZ: number;
  waterPatch31WaterDepth: number;
  waterPatch32OldAddedMass: number;
  waterPatch32AddedMass: number;
  waterPatch32EntrainedMass: number;
  waterPatch32Radiation: number;
  waterPatch32IntoSurface: number;
  waterPatch32Push: number;
  waterPatch32Inertia: number;
  waterPatch32Projection: number;
  waterPatch32WettedArea: number;
  waterPatch32DeckWettedArea: number;
  waterPatch32AddedMassPerArea: number;
  waterPatch32RadiationPerArea: number;
  waterPatch32NuX: number;
  waterPatch32NuY: number;
  waterPatch32NuZ: number;
  waterPatch32ArmCrossNuX: number;
  waterPatch32ArmCrossNuY: number;
  waterPatch32ArmCrossNuZ: number;
  waterPatch32ArmX: number;
  waterPatch32ArmY: number;
  waterPatch32ArmZ: number;
  waterPatch32NormalX: number;
  waterPatch32NormalY: number;
  waterPatch32NormalZ: number;
  waterPatch32PositionX: number;
  waterPatch32PositionY: number;
  waterPatch32PositionZ: number;
  waterPatch32RelativeX: number;
  waterPatch32RelativeY: number;
  waterPatch32RelativeZ: number;
  waterPatch32FlowX: number;
  waterPatch32FlowY: number;
  waterPatch32FlowZ: number;
  waterPatch32SurfaceY: number;
  waterPatch32SlopeX: number;
  waterPatch32SlopeZ: number;
  waterPatch32SampleNormalX: number;
  waterPatch32SampleNormalY: number;
  waterPatch32SampleNormalZ: number;
  waterPatch32WaterDepth: number;
  waterPatch33OldAddedMass: number;
  waterPatch33AddedMass: number;
  waterPatch33EntrainedMass: number;
  waterPatch33Radiation: number;
  waterPatch33IntoSurface: number;
  waterPatch33Push: number;
  waterPatch33Inertia: number;
  waterPatch33Projection: number;
  waterPatch33WettedArea: number;
  waterPatch33DeckWettedArea: number;
  waterPatch33AddedMassPerArea: number;
  waterPatch33RadiationPerArea: number;
  waterPatch33NuX: number;
  waterPatch33NuY: number;
  waterPatch33NuZ: number;
  waterPatch33ArmCrossNuX: number;
  waterPatch33ArmCrossNuY: number;
  waterPatch33ArmCrossNuZ: number;
  waterPatch33ArmX: number;
  waterPatch33ArmY: number;
  waterPatch33ArmZ: number;
  waterPatch33NormalX: number;
  waterPatch33NormalY: number;
  waterPatch33NormalZ: number;
  waterPatch33PositionX: number;
  waterPatch33PositionY: number;
  waterPatch33PositionZ: number;
  waterPatch33RelativeX: number;
  waterPatch33RelativeY: number;
  waterPatch33RelativeZ: number;
  waterPatch33FlowX: number;
  waterPatch33FlowY: number;
  waterPatch33FlowZ: number;
  waterPatch33SurfaceY: number;
  waterPatch33SlopeX: number;
  waterPatch33SlopeZ: number;
  waterPatch33SampleNormalX: number;
  waterPatch33SampleNormalY: number;
  waterPatch33SampleNormalZ: number;
  waterPatch33WaterDepth: number;
  waterPatch34OldAddedMass: number;
  waterPatch34AddedMass: number;
  waterPatch34EntrainedMass: number;
  waterPatch34Radiation: number;
  waterPatch34IntoSurface: number;
  waterPatch34Push: number;
  waterPatch34Inertia: number;
  waterPatch34Projection: number;
  waterPatch34WettedArea: number;
  waterPatch34DeckWettedArea: number;
  waterPatch34AddedMassPerArea: number;
  waterPatch34RadiationPerArea: number;
  waterPatch34NuX: number;
  waterPatch34NuY: number;
  waterPatch34NuZ: number;
  waterPatch34ArmCrossNuX: number;
  waterPatch34ArmCrossNuY: number;
  waterPatch34ArmCrossNuZ: number;
  waterPatch34ArmX: number;
  waterPatch34ArmY: number;
  waterPatch34ArmZ: number;
  waterPatch34NormalX: number;
  waterPatch34NormalY: number;
  waterPatch34NormalZ: number;
  waterPatch34PositionX: number;
  waterPatch34PositionY: number;
  waterPatch34PositionZ: number;
  waterPatch34RelativeX: number;
  waterPatch34RelativeY: number;
  waterPatch34RelativeZ: number;
  waterPatch34FlowX: number;
  waterPatch34FlowY: number;
  waterPatch34FlowZ: number;
  waterPatch34SurfaceY: number;
  waterPatch34SlopeX: number;
  waterPatch34SlopeZ: number;
  waterPatch34SampleNormalX: number;
  waterPatch34SampleNormalY: number;
  waterPatch34SampleNormalZ: number;
  waterPatch34WaterDepth: number;
  waterPatch35OldAddedMass: number;
  waterPatch35AddedMass: number;
  waterPatch35EntrainedMass: number;
  waterPatch35Radiation: number;
  waterPatch35IntoSurface: number;
  waterPatch35Push: number;
  waterPatch35Inertia: number;
  waterPatch35Projection: number;
  waterPatch35WettedArea: number;
  waterPatch35DeckWettedArea: number;
  waterPatch35AddedMassPerArea: number;
  waterPatch35RadiationPerArea: number;
  waterPatch35NuX: number;
  waterPatch35NuY: number;
  waterPatch35NuZ: number;
  waterPatch35ArmCrossNuX: number;
  waterPatch35ArmCrossNuY: number;
  waterPatch35ArmCrossNuZ: number;
  waterPatch35ArmX: number;
  waterPatch35ArmY: number;
  waterPatch35ArmZ: number;
  waterPatch35NormalX: number;
  waterPatch35NormalY: number;
  waterPatch35NormalZ: number;
  waterPatch35PositionX: number;
  waterPatch35PositionY: number;
  waterPatch35PositionZ: number;
  waterPatch35RelativeX: number;
  waterPatch35RelativeY: number;
  waterPatch35RelativeZ: number;
  waterPatch35FlowX: number;
  waterPatch35FlowY: number;
  waterPatch35FlowZ: number;
  waterPatch35SurfaceY: number;
  waterPatch35SlopeX: number;
  waterPatch35SlopeZ: number;
  waterPatch35SampleNormalX: number;
  waterPatch35SampleNormalY: number;
  waterPatch35SampleNormalZ: number;
  waterPatch35WaterDepth: number;
  waterPatch36OldAddedMass: number;
  waterPatch36AddedMass: number;
  waterPatch36EntrainedMass: number;
  waterPatch36Radiation: number;
  waterPatch36IntoSurface: number;
  waterPatch36Push: number;
  waterPatch36Inertia: number;
  waterPatch36Projection: number;
  waterPatch36WettedArea: number;
  waterPatch36DeckWettedArea: number;
  waterPatch36AddedMassPerArea: number;
  waterPatch36RadiationPerArea: number;
  waterPatch36NuX: number;
  waterPatch36NuY: number;
  waterPatch36NuZ: number;
  waterPatch36ArmCrossNuX: number;
  waterPatch36ArmCrossNuY: number;
  waterPatch36ArmCrossNuZ: number;
  waterPatch36ArmX: number;
  waterPatch36ArmY: number;
  waterPatch36ArmZ: number;
  waterPatch36NormalX: number;
  waterPatch36NormalY: number;
  waterPatch36NormalZ: number;
  waterPatch36PositionX: number;
  waterPatch36PositionY: number;
  waterPatch36PositionZ: number;
  waterPatch36RelativeX: number;
  waterPatch36RelativeY: number;
  waterPatch36RelativeZ: number;
  waterPatch36FlowX: number;
  waterPatch36FlowY: number;
  waterPatch36FlowZ: number;
  waterPatch36SurfaceY: number;
  waterPatch36SlopeX: number;
  waterPatch36SlopeZ: number;
  waterPatch36SampleNormalX: number;
  waterPatch36SampleNormalY: number;
  waterPatch36SampleNormalZ: number;
  waterPatch36WaterDepth: number;
  waterPatch37OldAddedMass: number;
  waterPatch37AddedMass: number;
  waterPatch37EntrainedMass: number;
  waterPatch37Radiation: number;
  waterPatch37IntoSurface: number;
  waterPatch37Push: number;
  waterPatch37Inertia: number;
  waterPatch37Projection: number;
  waterPatch37WettedArea: number;
  waterPatch37DeckWettedArea: number;
  waterPatch37AddedMassPerArea: number;
  waterPatch37RadiationPerArea: number;
  waterPatch37NuX: number;
  waterPatch37NuY: number;
  waterPatch37NuZ: number;
  waterPatch37ArmCrossNuX: number;
  waterPatch37ArmCrossNuY: number;
  waterPatch37ArmCrossNuZ: number;
  waterPatch37ArmX: number;
  waterPatch37ArmY: number;
  waterPatch37ArmZ: number;
  waterPatch37NormalX: number;
  waterPatch37NormalY: number;
  waterPatch37NormalZ: number;
  waterPatch37PositionX: number;
  waterPatch37PositionY: number;
  waterPatch37PositionZ: number;
  waterPatch37RelativeX: number;
  waterPatch37RelativeY: number;
  waterPatch37RelativeZ: number;
  waterPatch37FlowX: number;
  waterPatch37FlowY: number;
  waterPatch37FlowZ: number;
  waterPatch37SurfaceY: number;
  waterPatch37SlopeX: number;
  waterPatch37SlopeZ: number;
  waterPatch37SampleNormalX: number;
  waterPatch37SampleNormalY: number;
  waterPatch37SampleNormalZ: number;
  waterPatch37WaterDepth: number;
  waterPatch38OldAddedMass: number;
  waterPatch38AddedMass: number;
  waterPatch38EntrainedMass: number;
  waterPatch38Radiation: number;
  waterPatch38IntoSurface: number;
  waterPatch38Push: number;
  waterPatch38Inertia: number;
  waterPatch38Projection: number;
  waterPatch38WettedArea: number;
  waterPatch38DeckWettedArea: number;
  waterPatch38AddedMassPerArea: number;
  waterPatch38RadiationPerArea: number;
  waterPatch38NuX: number;
  waterPatch38NuY: number;
  waterPatch38NuZ: number;
  waterPatch38ArmCrossNuX: number;
  waterPatch38ArmCrossNuY: number;
  waterPatch38ArmCrossNuZ: number;
  waterPatch38ArmX: number;
  waterPatch38ArmY: number;
  waterPatch38ArmZ: number;
  waterPatch38NormalX: number;
  waterPatch38NormalY: number;
  waterPatch38NormalZ: number;
  waterPatch38PositionX: number;
  waterPatch38PositionY: number;
  waterPatch38PositionZ: number;
  waterPatch38RelativeX: number;
  waterPatch38RelativeY: number;
  waterPatch38RelativeZ: number;
  waterPatch38FlowX: number;
  waterPatch38FlowY: number;
  waterPatch38FlowZ: number;
  waterPatch38SurfaceY: number;
  waterPatch38SlopeX: number;
  waterPatch38SlopeZ: number;
  waterPatch38SampleNormalX: number;
  waterPatch38SampleNormalY: number;
  waterPatch38SampleNormalZ: number;
  waterPatch38WaterDepth: number;
  waterPatch39OldAddedMass: number;
  waterPatch39AddedMass: number;
  waterPatch39EntrainedMass: number;
  waterPatch39Radiation: number;
  waterPatch39IntoSurface: number;
  waterPatch39Push: number;
  waterPatch39Inertia: number;
  waterPatch39Projection: number;
  waterPatch39WettedArea: number;
  waterPatch39DeckWettedArea: number;
  waterPatch39AddedMassPerArea: number;
  waterPatch39RadiationPerArea: number;
  waterPatch39NuX: number;
  waterPatch39NuY: number;
  waterPatch39NuZ: number;
  waterPatch39ArmCrossNuX: number;
  waterPatch39ArmCrossNuY: number;
  waterPatch39ArmCrossNuZ: number;
  waterPatch39ArmX: number;
  waterPatch39ArmY: number;
  waterPatch39ArmZ: number;
  waterPatch39NormalX: number;
  waterPatch39NormalY: number;
  waterPatch39NormalZ: number;
  waterPatch39PositionX: number;
  waterPatch39PositionY: number;
  waterPatch39PositionZ: number;
  waterPatch39RelativeX: number;
  waterPatch39RelativeY: number;
  waterPatch39RelativeZ: number;
  waterPatch39FlowX: number;
  waterPatch39FlowY: number;
  waterPatch39FlowZ: number;
  waterPatch39SurfaceY: number;
  waterPatch39SlopeX: number;
  waterPatch39SlopeZ: number;
  waterPatch39SampleNormalX: number;
  waterPatch39SampleNormalY: number;
  waterPatch39SampleNormalZ: number;
  waterPatch39WaterDepth: number;
  waterPatch40OldAddedMass: number;
  waterPatch40AddedMass: number;
  waterPatch40EntrainedMass: number;
  waterPatch40Radiation: number;
  waterPatch40IntoSurface: number;
  waterPatch40Push: number;
  waterPatch40Inertia: number;
  waterPatch40Projection: number;
  waterPatch40WettedArea: number;
  waterPatch40DeckWettedArea: number;
  waterPatch40AddedMassPerArea: number;
  waterPatch40RadiationPerArea: number;
  waterPatch40NuX: number;
  waterPatch40NuY: number;
  waterPatch40NuZ: number;
  waterPatch40ArmCrossNuX: number;
  waterPatch40ArmCrossNuY: number;
  waterPatch40ArmCrossNuZ: number;
  waterPatch40ArmX: number;
  waterPatch40ArmY: number;
  waterPatch40ArmZ: number;
  waterPatch40NormalX: number;
  waterPatch40NormalY: number;
  waterPatch40NormalZ: number;
  waterPatch40PositionX: number;
  waterPatch40PositionY: number;
  waterPatch40PositionZ: number;
  waterPatch40RelativeX: number;
  waterPatch40RelativeY: number;
  waterPatch40RelativeZ: number;
  waterPatch40FlowX: number;
  waterPatch40FlowY: number;
  waterPatch40FlowZ: number;
  waterPatch40SurfaceY: number;
  waterPatch40SlopeX: number;
  waterPatch40SlopeZ: number;
  waterPatch40SampleNormalX: number;
  waterPatch40SampleNormalY: number;
  waterPatch40SampleNormalZ: number;
  waterPatch40WaterDepth: number;
  waterPatch41OldAddedMass: number;
  waterPatch41AddedMass: number;
  waterPatch41EntrainedMass: number;
  waterPatch41Radiation: number;
  waterPatch41IntoSurface: number;
  waterPatch41Push: number;
  waterPatch41Inertia: number;
  waterPatch41Projection: number;
  waterPatch41WettedArea: number;
  waterPatch41DeckWettedArea: number;
  waterPatch41AddedMassPerArea: number;
  waterPatch41RadiationPerArea: number;
  waterPatch41NuX: number;
  waterPatch41NuY: number;
  waterPatch41NuZ: number;
  waterPatch41ArmCrossNuX: number;
  waterPatch41ArmCrossNuY: number;
  waterPatch41ArmCrossNuZ: number;
  waterPatch41ArmX: number;
  waterPatch41ArmY: number;
  waterPatch41ArmZ: number;
  waterPatch41NormalX: number;
  waterPatch41NormalY: number;
  waterPatch41NormalZ: number;
  waterPatch41PositionX: number;
  waterPatch41PositionY: number;
  waterPatch41PositionZ: number;
  waterPatch41RelativeX: number;
  waterPatch41RelativeY: number;
  waterPatch41RelativeZ: number;
  waterPatch41FlowX: number;
  waterPatch41FlowY: number;
  waterPatch41FlowZ: number;
  waterPatch41SurfaceY: number;
  waterPatch41SlopeX: number;
  waterPatch41SlopeZ: number;
  waterPatch41SampleNormalX: number;
  waterPatch41SampleNormalY: number;
  waterPatch41SampleNormalZ: number;
  waterPatch41WaterDepth: number;
  waterPatch42OldAddedMass: number;
  waterPatch42AddedMass: number;
  waterPatch42EntrainedMass: number;
  waterPatch42Radiation: number;
  waterPatch42IntoSurface: number;
  waterPatch42Push: number;
  waterPatch42Inertia: number;
  waterPatch42Projection: number;
  waterPatch42WettedArea: number;
  waterPatch42DeckWettedArea: number;
  waterPatch42AddedMassPerArea: number;
  waterPatch42RadiationPerArea: number;
  waterPatch42NuX: number;
  waterPatch42NuY: number;
  waterPatch42NuZ: number;
  waterPatch42ArmCrossNuX: number;
  waterPatch42ArmCrossNuY: number;
  waterPatch42ArmCrossNuZ: number;
  waterPatch42ArmX: number;
  waterPatch42ArmY: number;
  waterPatch42ArmZ: number;
  waterPatch42NormalX: number;
  waterPatch42NormalY: number;
  waterPatch42NormalZ: number;
  waterPatch42PositionX: number;
  waterPatch42PositionY: number;
  waterPatch42PositionZ: number;
  waterPatch42RelativeX: number;
  waterPatch42RelativeY: number;
  waterPatch42RelativeZ: number;
  waterPatch42FlowX: number;
  waterPatch42FlowY: number;
  waterPatch42FlowZ: number;
  waterPatch42SurfaceY: number;
  waterPatch42SlopeX: number;
  waterPatch42SlopeZ: number;
  waterPatch42SampleNormalX: number;
  waterPatch42SampleNormalY: number;
  waterPatch42SampleNormalZ: number;
  waterPatch42WaterDepth: number;
  waterPatch43OldAddedMass: number;
  waterPatch43AddedMass: number;
  waterPatch43EntrainedMass: number;
  waterPatch43Radiation: number;
  waterPatch43IntoSurface: number;
  waterPatch43Push: number;
  waterPatch43Inertia: number;
  waterPatch43Projection: number;
  waterPatch43WettedArea: number;
  waterPatch43DeckWettedArea: number;
  waterPatch43AddedMassPerArea: number;
  waterPatch43RadiationPerArea: number;
  waterPatch43NuX: number;
  waterPatch43NuY: number;
  waterPatch43NuZ: number;
  waterPatch43ArmCrossNuX: number;
  waterPatch43ArmCrossNuY: number;
  waterPatch43ArmCrossNuZ: number;
  waterPatch43ArmX: number;
  waterPatch43ArmY: number;
  waterPatch43ArmZ: number;
  waterPatch43NormalX: number;
  waterPatch43NormalY: number;
  waterPatch43NormalZ: number;
  waterPatch43PositionX: number;
  waterPatch43PositionY: number;
  waterPatch43PositionZ: number;
  waterPatch43RelativeX: number;
  waterPatch43RelativeY: number;
  waterPatch43RelativeZ: number;
  waterPatch43FlowX: number;
  waterPatch43FlowY: number;
  waterPatch43FlowZ: number;
  waterPatch43SurfaceY: number;
  waterPatch43SlopeX: number;
  waterPatch43SlopeZ: number;
  waterPatch43SampleNormalX: number;
  waterPatch43SampleNormalY: number;
  waterPatch43SampleNormalZ: number;
  waterPatch43WaterDepth: number;
  waterPatch44OldAddedMass: number;
  waterPatch44AddedMass: number;
  waterPatch44EntrainedMass: number;
  waterPatch44Radiation: number;
  waterPatch44IntoSurface: number;
  waterPatch44Push: number;
  waterPatch44Inertia: number;
  waterPatch44Projection: number;
  waterPatch44WettedArea: number;
  waterPatch44DeckWettedArea: number;
  waterPatch44AddedMassPerArea: number;
  waterPatch44RadiationPerArea: number;
  waterPatch44NuX: number;
  waterPatch44NuY: number;
  waterPatch44NuZ: number;
  waterPatch44ArmCrossNuX: number;
  waterPatch44ArmCrossNuY: number;
  waterPatch44ArmCrossNuZ: number;
  waterPatch44ArmX: number;
  waterPatch44ArmY: number;
  waterPatch44ArmZ: number;
  waterPatch44NormalX: number;
  waterPatch44NormalY: number;
  waterPatch44NormalZ: number;
  waterPatch44PositionX: number;
  waterPatch44PositionY: number;
  waterPatch44PositionZ: number;
  waterPatch44RelativeX: number;
  waterPatch44RelativeY: number;
  waterPatch44RelativeZ: number;
  waterPatch44FlowX: number;
  waterPatch44FlowY: number;
  waterPatch44FlowZ: number;
  waterPatch44SurfaceY: number;
  waterPatch44SlopeX: number;
  waterPatch44SlopeZ: number;
  waterPatch44SampleNormalX: number;
  waterPatch44SampleNormalY: number;
  waterPatch44SampleNormalZ: number;
  waterPatch44WaterDepth: number;
  waterPatch45OldAddedMass: number;
  waterPatch45AddedMass: number;
  waterPatch45EntrainedMass: number;
  waterPatch45Radiation: number;
  waterPatch45IntoSurface: number;
  waterPatch45Push: number;
  waterPatch45Inertia: number;
  waterPatch45Projection: number;
  waterPatch45WettedArea: number;
  waterPatch45DeckWettedArea: number;
  waterPatch45AddedMassPerArea: number;
  waterPatch45RadiationPerArea: number;
  waterPatch45NuX: number;
  waterPatch45NuY: number;
  waterPatch45NuZ: number;
  waterPatch45ArmCrossNuX: number;
  waterPatch45ArmCrossNuY: number;
  waterPatch45ArmCrossNuZ: number;
  waterPatch45ArmX: number;
  waterPatch45ArmY: number;
  waterPatch45ArmZ: number;
  waterPatch45NormalX: number;
  waterPatch45NormalY: number;
  waterPatch45NormalZ: number;
  waterPatch45PositionX: number;
  waterPatch45PositionY: number;
  waterPatch45PositionZ: number;
  waterPatch45RelativeX: number;
  waterPatch45RelativeY: number;
  waterPatch45RelativeZ: number;
  waterPatch45FlowX: number;
  waterPatch45FlowY: number;
  waterPatch45FlowZ: number;
  waterPatch45SurfaceY: number;
  waterPatch45SlopeX: number;
  waterPatch45SlopeZ: number;
  waterPatch45SampleNormalX: number;
  waterPatch45SampleNormalY: number;
  waterPatch45SampleNormalZ: number;
  waterPatch45WaterDepth: number;
  waterPatch46OldAddedMass: number;
  waterPatch46AddedMass: number;
  waterPatch46EntrainedMass: number;
  waterPatch46Radiation: number;
  waterPatch46IntoSurface: number;
  waterPatch46Push: number;
  waterPatch46Inertia: number;
  waterPatch46Projection: number;
  waterPatch46WettedArea: number;
  waterPatch46DeckWettedArea: number;
  waterPatch46AddedMassPerArea: number;
  waterPatch46RadiationPerArea: number;
  waterPatch46NuX: number;
  waterPatch46NuY: number;
  waterPatch46NuZ: number;
  waterPatch46ArmCrossNuX: number;
  waterPatch46ArmCrossNuY: number;
  waterPatch46ArmCrossNuZ: number;
  waterPatch46ArmX: number;
  waterPatch46ArmY: number;
  waterPatch46ArmZ: number;
  waterPatch46NormalX: number;
  waterPatch46NormalY: number;
  waterPatch46NormalZ: number;
  waterPatch46PositionX: number;
  waterPatch46PositionY: number;
  waterPatch46PositionZ: number;
  waterPatch46RelativeX: number;
  waterPatch46RelativeY: number;
  waterPatch46RelativeZ: number;
  waterPatch46FlowX: number;
  waterPatch46FlowY: number;
  waterPatch46FlowZ: number;
  waterPatch46SurfaceY: number;
  waterPatch46SlopeX: number;
  waterPatch46SlopeZ: number;
  waterPatch46SampleNormalX: number;
  waterPatch46SampleNormalY: number;
  waterPatch46SampleNormalZ: number;
  waterPatch46WaterDepth: number;
  waterPatch47OldAddedMass: number;
  waterPatch47AddedMass: number;
  waterPatch47EntrainedMass: number;
  waterPatch47Radiation: number;
  waterPatch47IntoSurface: number;
  waterPatch47Push: number;
  waterPatch47Inertia: number;
  waterPatch47Projection: number;
  waterPatch47WettedArea: number;
  waterPatch47DeckWettedArea: number;
  waterPatch47AddedMassPerArea: number;
  waterPatch47RadiationPerArea: number;
  waterPatch47NuX: number;
  waterPatch47NuY: number;
  waterPatch47NuZ: number;
  waterPatch47ArmCrossNuX: number;
  waterPatch47ArmCrossNuY: number;
  waterPatch47ArmCrossNuZ: number;
  waterPatch47ArmX: number;
  waterPatch47ArmY: number;
  waterPatch47ArmZ: number;
  waterPatch47NormalX: number;
  waterPatch47NormalY: number;
  waterPatch47NormalZ: number;
  waterPatch47PositionX: number;
  waterPatch47PositionY: number;
  waterPatch47PositionZ: number;
  waterPatch47RelativeX: number;
  waterPatch47RelativeY: number;
  waterPatch47RelativeZ: number;
  waterPatch47FlowX: number;
  waterPatch47FlowY: number;
  waterPatch47FlowZ: number;
  waterPatch47SurfaceY: number;
  waterPatch47SlopeX: number;
  waterPatch47SlopeZ: number;
  waterPatch47SampleNormalX: number;
  waterPatch47SampleNormalY: number;
  waterPatch47SampleNormalZ: number;
  waterPatch47WaterDepth: number;
  // END observer-only water-patch field declarations
}
function landingDemandOperands(): LandingDemandOperands {
  return { projectLocalX: 0, projectLocalY: 0, projectLocalZ: 0, projectDeckY: 0, projectHeight: 0, demandLocalX: 0, demandLocalY: 0, demandLocalZ: 0, legHeight: 0, legLoad: 0, legStiffness: 0, legDamping: 0, legForce: 0, legRateAfter: 0, specificForceX: 0, specificForceY: 0, specificForceZ: 0, postureRateX: 0, postureRateY: 0, postureRateZ: 0, driveX: 0, driveY: 0, driveZ: 0, carriedRelativeX: 0, carriedRelativeY: 0, carriedRelativeZ: 0, demandPositionX: 0, demandPositionY: 0, demandPositionZ: 0, demandVelocityX: 0, demandVelocityY: 0, demandVelocityZ: 0, demandTargetX: 0, demandTargetY: 0, demandTargetZ: 0, demandUpX: 0, demandUpY: 0, demandUpZ: 0,
    boardPreMatrix00: 0, boardPreMatrix01: 0, boardPreMatrix02: 0, boardPreMatrix03: 0, boardPreMatrix04: 0, boardPreMatrix05: 0, boardPreMatrix10: 0, boardPreMatrix11: 0, boardPreMatrix12: 0, boardPreMatrix13: 0, boardPreMatrix14: 0, boardPreMatrix15: 0, boardPreMatrix20: 0, boardPreMatrix21: 0, boardPreMatrix22: 0, boardPreMatrix23: 0, boardPreMatrix24: 0, boardPreMatrix25: 0, boardPreMatrix30: 0, boardPreMatrix31: 0, boardPreMatrix32: 0, boardPreMatrix33: 0, boardPreMatrix34: 0, boardPreMatrix35: 0, boardPreMatrix40: 0, boardPreMatrix41: 0, boardPreMatrix42: 0, boardPreMatrix43: 0, boardPreMatrix44: 0, boardPreMatrix45: 0, boardPreMatrix50: 0, boardPreMatrix51: 0, boardPreMatrix52: 0, boardPreMatrix53: 0, boardPreMatrix54: 0, boardPreMatrix55: 0, boardPreRhs0: 0, boardPreRhs1: 0, boardPreRhs2: 0, boardPreRhs3: 0, boardPreRhs4: 0, boardPreRhs5: 0, preparedBoardVelocityX: 0, preparedBoardVelocityY: 0, preparedBoardVelocityZ: 0, preparedBoardSpinX: 0, preparedBoardSpinY: 0, preparedBoardSpinZ: 0, riderExternalX: 0, riderExternalY: 0, riderExternalZ: 0, forceArmX: 0, forceArmY: 0, forceArmZ: 0, carriedArmX: 0, carriedArmY: 0, carriedArmZ: 0, trialBoardDeltaVelocityX: 0, trialBoardDeltaVelocityY: 0, trialBoardDeltaVelocityZ: 0, trialBoardDeltaSpinX: 0, trialBoardDeltaSpinY: 0, trialBoardDeltaSpinZ: 0, standingTrialAvailable: 0,
    boardPreBuoyancyForceX: 0, boardPreBuoyancyForceY: 0, boardPreBuoyancyForceZ: 0, boardPreBuoyancyTorqueX: 0, boardPreBuoyancyTorqueY: 0, boardPreBuoyancyTorqueZ: 0, boardPrePressureForceX: 0, boardPrePressureForceY: 0, boardPrePressureForceZ: 0, boardPrePressureTorqueX: 0, boardPrePressureTorqueY: 0, boardPrePressureTorqueZ: 0, boardPreFrictionForceX: 0, boardPreFrictionForceY: 0, boardPreFrictionForceZ: 0, boardPreFrictionTorqueX: 0, boardPreFrictionTorqueY: 0, boardPreFrictionTorqueZ: 0, boardPreFinForceX: 0, boardPreFinForceY: 0, boardPreFinForceZ: 0, boardPreFinTorqueX: 0, boardPreFinTorqueY: 0, boardPreFinTorqueZ: 0, boardPreRailForceX: 0, boardPreRailForceY: 0, boardPreRailForceZ: 0, boardPreRailTorqueX: 0, boardPreRailTorqueY: 0, boardPreRailTorqueZ: 0, boardPreGyroX: 0, boardPreGyroY: 0, boardPreGyroZ: 0, boardPreWeight: 0, boardPreStepSeconds: 0, boardPreWaterImpulseX: 0, boardPreWaterImpulseY: 0, boardPreWaterImpulseZ: 0, boardPreWaterTorqueImpulseX: 0, boardPreWaterTorqueImpulseY: 0, boardPreWaterTorqueImpulseZ: 0
    /* BEGIN observer-only water-patch field defaults */,
    waterPatchCount: 0,
    waterPatchScopeAvailable: 0,
    waterPatch00OldAddedMass: 0,
    waterPatch00AddedMass: 0,
    waterPatch00EntrainedMass: 0,
    waterPatch00Radiation: 0,
    waterPatch00IntoSurface: 0,
    waterPatch00Push: 0,
    waterPatch00Inertia: 0,
    waterPatch00Projection: 0,
    waterPatch00WettedArea: 0,
    waterPatch00DeckWettedArea: 0,
    waterPatch00AddedMassPerArea: 0,
    waterPatch00RadiationPerArea: 0,
    waterPatch00NuX: 0,
    waterPatch00NuY: 0,
    waterPatch00NuZ: 0,
    waterPatch00ArmCrossNuX: 0,
    waterPatch00ArmCrossNuY: 0,
    waterPatch00ArmCrossNuZ: 0,
    waterPatch00ArmX: 0,
    waterPatch00ArmY: 0,
    waterPatch00ArmZ: 0,
    waterPatch00NormalX: 0,
    waterPatch00NormalY: 0,
    waterPatch00NormalZ: 0,
    waterPatch00PositionX: 0,
    waterPatch00PositionY: 0,
    waterPatch00PositionZ: 0,
    waterPatch00RelativeX: 0,
    waterPatch00RelativeY: 0,
    waterPatch00RelativeZ: 0,
    waterPatch00FlowX: 0,
    waterPatch00FlowY: 0,
    waterPatch00FlowZ: 0,
    waterPatch00SurfaceY: 0,
    waterPatch00SlopeX: 0,
    waterPatch00SlopeZ: 0,
    waterPatch00SampleNormalX: 0,
    waterPatch00SampleNormalY: 0,
    waterPatch00SampleNormalZ: 0,
    waterPatch00WaterDepth: 0,
    waterPatch01OldAddedMass: 0,
    waterPatch01AddedMass: 0,
    waterPatch01EntrainedMass: 0,
    waterPatch01Radiation: 0,
    waterPatch01IntoSurface: 0,
    waterPatch01Push: 0,
    waterPatch01Inertia: 0,
    waterPatch01Projection: 0,
    waterPatch01WettedArea: 0,
    waterPatch01DeckWettedArea: 0,
    waterPatch01AddedMassPerArea: 0,
    waterPatch01RadiationPerArea: 0,
    waterPatch01NuX: 0,
    waterPatch01NuY: 0,
    waterPatch01NuZ: 0,
    waterPatch01ArmCrossNuX: 0,
    waterPatch01ArmCrossNuY: 0,
    waterPatch01ArmCrossNuZ: 0,
    waterPatch01ArmX: 0,
    waterPatch01ArmY: 0,
    waterPatch01ArmZ: 0,
    waterPatch01NormalX: 0,
    waterPatch01NormalY: 0,
    waterPatch01NormalZ: 0,
    waterPatch01PositionX: 0,
    waterPatch01PositionY: 0,
    waterPatch01PositionZ: 0,
    waterPatch01RelativeX: 0,
    waterPatch01RelativeY: 0,
    waterPatch01RelativeZ: 0,
    waterPatch01FlowX: 0,
    waterPatch01FlowY: 0,
    waterPatch01FlowZ: 0,
    waterPatch01SurfaceY: 0,
    waterPatch01SlopeX: 0,
    waterPatch01SlopeZ: 0,
    waterPatch01SampleNormalX: 0,
    waterPatch01SampleNormalY: 0,
    waterPatch01SampleNormalZ: 0,
    waterPatch01WaterDepth: 0,
    waterPatch02OldAddedMass: 0,
    waterPatch02AddedMass: 0,
    waterPatch02EntrainedMass: 0,
    waterPatch02Radiation: 0,
    waterPatch02IntoSurface: 0,
    waterPatch02Push: 0,
    waterPatch02Inertia: 0,
    waterPatch02Projection: 0,
    waterPatch02WettedArea: 0,
    waterPatch02DeckWettedArea: 0,
    waterPatch02AddedMassPerArea: 0,
    waterPatch02RadiationPerArea: 0,
    waterPatch02NuX: 0,
    waterPatch02NuY: 0,
    waterPatch02NuZ: 0,
    waterPatch02ArmCrossNuX: 0,
    waterPatch02ArmCrossNuY: 0,
    waterPatch02ArmCrossNuZ: 0,
    waterPatch02ArmX: 0,
    waterPatch02ArmY: 0,
    waterPatch02ArmZ: 0,
    waterPatch02NormalX: 0,
    waterPatch02NormalY: 0,
    waterPatch02NormalZ: 0,
    waterPatch02PositionX: 0,
    waterPatch02PositionY: 0,
    waterPatch02PositionZ: 0,
    waterPatch02RelativeX: 0,
    waterPatch02RelativeY: 0,
    waterPatch02RelativeZ: 0,
    waterPatch02FlowX: 0,
    waterPatch02FlowY: 0,
    waterPatch02FlowZ: 0,
    waterPatch02SurfaceY: 0,
    waterPatch02SlopeX: 0,
    waterPatch02SlopeZ: 0,
    waterPatch02SampleNormalX: 0,
    waterPatch02SampleNormalY: 0,
    waterPatch02SampleNormalZ: 0,
    waterPatch02WaterDepth: 0,
    waterPatch03OldAddedMass: 0,
    waterPatch03AddedMass: 0,
    waterPatch03EntrainedMass: 0,
    waterPatch03Radiation: 0,
    waterPatch03IntoSurface: 0,
    waterPatch03Push: 0,
    waterPatch03Inertia: 0,
    waterPatch03Projection: 0,
    waterPatch03WettedArea: 0,
    waterPatch03DeckWettedArea: 0,
    waterPatch03AddedMassPerArea: 0,
    waterPatch03RadiationPerArea: 0,
    waterPatch03NuX: 0,
    waterPatch03NuY: 0,
    waterPatch03NuZ: 0,
    waterPatch03ArmCrossNuX: 0,
    waterPatch03ArmCrossNuY: 0,
    waterPatch03ArmCrossNuZ: 0,
    waterPatch03ArmX: 0,
    waterPatch03ArmY: 0,
    waterPatch03ArmZ: 0,
    waterPatch03NormalX: 0,
    waterPatch03NormalY: 0,
    waterPatch03NormalZ: 0,
    waterPatch03PositionX: 0,
    waterPatch03PositionY: 0,
    waterPatch03PositionZ: 0,
    waterPatch03RelativeX: 0,
    waterPatch03RelativeY: 0,
    waterPatch03RelativeZ: 0,
    waterPatch03FlowX: 0,
    waterPatch03FlowY: 0,
    waterPatch03FlowZ: 0,
    waterPatch03SurfaceY: 0,
    waterPatch03SlopeX: 0,
    waterPatch03SlopeZ: 0,
    waterPatch03SampleNormalX: 0,
    waterPatch03SampleNormalY: 0,
    waterPatch03SampleNormalZ: 0,
    waterPatch03WaterDepth: 0,
    waterPatch04OldAddedMass: 0,
    waterPatch04AddedMass: 0,
    waterPatch04EntrainedMass: 0,
    waterPatch04Radiation: 0,
    waterPatch04IntoSurface: 0,
    waterPatch04Push: 0,
    waterPatch04Inertia: 0,
    waterPatch04Projection: 0,
    waterPatch04WettedArea: 0,
    waterPatch04DeckWettedArea: 0,
    waterPatch04AddedMassPerArea: 0,
    waterPatch04RadiationPerArea: 0,
    waterPatch04NuX: 0,
    waterPatch04NuY: 0,
    waterPatch04NuZ: 0,
    waterPatch04ArmCrossNuX: 0,
    waterPatch04ArmCrossNuY: 0,
    waterPatch04ArmCrossNuZ: 0,
    waterPatch04ArmX: 0,
    waterPatch04ArmY: 0,
    waterPatch04ArmZ: 0,
    waterPatch04NormalX: 0,
    waterPatch04NormalY: 0,
    waterPatch04NormalZ: 0,
    waterPatch04PositionX: 0,
    waterPatch04PositionY: 0,
    waterPatch04PositionZ: 0,
    waterPatch04RelativeX: 0,
    waterPatch04RelativeY: 0,
    waterPatch04RelativeZ: 0,
    waterPatch04FlowX: 0,
    waterPatch04FlowY: 0,
    waterPatch04FlowZ: 0,
    waterPatch04SurfaceY: 0,
    waterPatch04SlopeX: 0,
    waterPatch04SlopeZ: 0,
    waterPatch04SampleNormalX: 0,
    waterPatch04SampleNormalY: 0,
    waterPatch04SampleNormalZ: 0,
    waterPatch04WaterDepth: 0,
    waterPatch05OldAddedMass: 0,
    waterPatch05AddedMass: 0,
    waterPatch05EntrainedMass: 0,
    waterPatch05Radiation: 0,
    waterPatch05IntoSurface: 0,
    waterPatch05Push: 0,
    waterPatch05Inertia: 0,
    waterPatch05Projection: 0,
    waterPatch05WettedArea: 0,
    waterPatch05DeckWettedArea: 0,
    waterPatch05AddedMassPerArea: 0,
    waterPatch05RadiationPerArea: 0,
    waterPatch05NuX: 0,
    waterPatch05NuY: 0,
    waterPatch05NuZ: 0,
    waterPatch05ArmCrossNuX: 0,
    waterPatch05ArmCrossNuY: 0,
    waterPatch05ArmCrossNuZ: 0,
    waterPatch05ArmX: 0,
    waterPatch05ArmY: 0,
    waterPatch05ArmZ: 0,
    waterPatch05NormalX: 0,
    waterPatch05NormalY: 0,
    waterPatch05NormalZ: 0,
    waterPatch05PositionX: 0,
    waterPatch05PositionY: 0,
    waterPatch05PositionZ: 0,
    waterPatch05RelativeX: 0,
    waterPatch05RelativeY: 0,
    waterPatch05RelativeZ: 0,
    waterPatch05FlowX: 0,
    waterPatch05FlowY: 0,
    waterPatch05FlowZ: 0,
    waterPatch05SurfaceY: 0,
    waterPatch05SlopeX: 0,
    waterPatch05SlopeZ: 0,
    waterPatch05SampleNormalX: 0,
    waterPatch05SampleNormalY: 0,
    waterPatch05SampleNormalZ: 0,
    waterPatch05WaterDepth: 0,
    waterPatch06OldAddedMass: 0,
    waterPatch06AddedMass: 0,
    waterPatch06EntrainedMass: 0,
    waterPatch06Radiation: 0,
    waterPatch06IntoSurface: 0,
    waterPatch06Push: 0,
    waterPatch06Inertia: 0,
    waterPatch06Projection: 0,
    waterPatch06WettedArea: 0,
    waterPatch06DeckWettedArea: 0,
    waterPatch06AddedMassPerArea: 0,
    waterPatch06RadiationPerArea: 0,
    waterPatch06NuX: 0,
    waterPatch06NuY: 0,
    waterPatch06NuZ: 0,
    waterPatch06ArmCrossNuX: 0,
    waterPatch06ArmCrossNuY: 0,
    waterPatch06ArmCrossNuZ: 0,
    waterPatch06ArmX: 0,
    waterPatch06ArmY: 0,
    waterPatch06ArmZ: 0,
    waterPatch06NormalX: 0,
    waterPatch06NormalY: 0,
    waterPatch06NormalZ: 0,
    waterPatch06PositionX: 0,
    waterPatch06PositionY: 0,
    waterPatch06PositionZ: 0,
    waterPatch06RelativeX: 0,
    waterPatch06RelativeY: 0,
    waterPatch06RelativeZ: 0,
    waterPatch06FlowX: 0,
    waterPatch06FlowY: 0,
    waterPatch06FlowZ: 0,
    waterPatch06SurfaceY: 0,
    waterPatch06SlopeX: 0,
    waterPatch06SlopeZ: 0,
    waterPatch06SampleNormalX: 0,
    waterPatch06SampleNormalY: 0,
    waterPatch06SampleNormalZ: 0,
    waterPatch06WaterDepth: 0,
    waterPatch07OldAddedMass: 0,
    waterPatch07AddedMass: 0,
    waterPatch07EntrainedMass: 0,
    waterPatch07Radiation: 0,
    waterPatch07IntoSurface: 0,
    waterPatch07Push: 0,
    waterPatch07Inertia: 0,
    waterPatch07Projection: 0,
    waterPatch07WettedArea: 0,
    waterPatch07DeckWettedArea: 0,
    waterPatch07AddedMassPerArea: 0,
    waterPatch07RadiationPerArea: 0,
    waterPatch07NuX: 0,
    waterPatch07NuY: 0,
    waterPatch07NuZ: 0,
    waterPatch07ArmCrossNuX: 0,
    waterPatch07ArmCrossNuY: 0,
    waterPatch07ArmCrossNuZ: 0,
    waterPatch07ArmX: 0,
    waterPatch07ArmY: 0,
    waterPatch07ArmZ: 0,
    waterPatch07NormalX: 0,
    waterPatch07NormalY: 0,
    waterPatch07NormalZ: 0,
    waterPatch07PositionX: 0,
    waterPatch07PositionY: 0,
    waterPatch07PositionZ: 0,
    waterPatch07RelativeX: 0,
    waterPatch07RelativeY: 0,
    waterPatch07RelativeZ: 0,
    waterPatch07FlowX: 0,
    waterPatch07FlowY: 0,
    waterPatch07FlowZ: 0,
    waterPatch07SurfaceY: 0,
    waterPatch07SlopeX: 0,
    waterPatch07SlopeZ: 0,
    waterPatch07SampleNormalX: 0,
    waterPatch07SampleNormalY: 0,
    waterPatch07SampleNormalZ: 0,
    waterPatch07WaterDepth: 0,
    waterPatch08OldAddedMass: 0,
    waterPatch08AddedMass: 0,
    waterPatch08EntrainedMass: 0,
    waterPatch08Radiation: 0,
    waterPatch08IntoSurface: 0,
    waterPatch08Push: 0,
    waterPatch08Inertia: 0,
    waterPatch08Projection: 0,
    waterPatch08WettedArea: 0,
    waterPatch08DeckWettedArea: 0,
    waterPatch08AddedMassPerArea: 0,
    waterPatch08RadiationPerArea: 0,
    waterPatch08NuX: 0,
    waterPatch08NuY: 0,
    waterPatch08NuZ: 0,
    waterPatch08ArmCrossNuX: 0,
    waterPatch08ArmCrossNuY: 0,
    waterPatch08ArmCrossNuZ: 0,
    waterPatch08ArmX: 0,
    waterPatch08ArmY: 0,
    waterPatch08ArmZ: 0,
    waterPatch08NormalX: 0,
    waterPatch08NormalY: 0,
    waterPatch08NormalZ: 0,
    waterPatch08PositionX: 0,
    waterPatch08PositionY: 0,
    waterPatch08PositionZ: 0,
    waterPatch08RelativeX: 0,
    waterPatch08RelativeY: 0,
    waterPatch08RelativeZ: 0,
    waterPatch08FlowX: 0,
    waterPatch08FlowY: 0,
    waterPatch08FlowZ: 0,
    waterPatch08SurfaceY: 0,
    waterPatch08SlopeX: 0,
    waterPatch08SlopeZ: 0,
    waterPatch08SampleNormalX: 0,
    waterPatch08SampleNormalY: 0,
    waterPatch08SampleNormalZ: 0,
    waterPatch08WaterDepth: 0,
    waterPatch09OldAddedMass: 0,
    waterPatch09AddedMass: 0,
    waterPatch09EntrainedMass: 0,
    waterPatch09Radiation: 0,
    waterPatch09IntoSurface: 0,
    waterPatch09Push: 0,
    waterPatch09Inertia: 0,
    waterPatch09Projection: 0,
    waterPatch09WettedArea: 0,
    waterPatch09DeckWettedArea: 0,
    waterPatch09AddedMassPerArea: 0,
    waterPatch09RadiationPerArea: 0,
    waterPatch09NuX: 0,
    waterPatch09NuY: 0,
    waterPatch09NuZ: 0,
    waterPatch09ArmCrossNuX: 0,
    waterPatch09ArmCrossNuY: 0,
    waterPatch09ArmCrossNuZ: 0,
    waterPatch09ArmX: 0,
    waterPatch09ArmY: 0,
    waterPatch09ArmZ: 0,
    waterPatch09NormalX: 0,
    waterPatch09NormalY: 0,
    waterPatch09NormalZ: 0,
    waterPatch09PositionX: 0,
    waterPatch09PositionY: 0,
    waterPatch09PositionZ: 0,
    waterPatch09RelativeX: 0,
    waterPatch09RelativeY: 0,
    waterPatch09RelativeZ: 0,
    waterPatch09FlowX: 0,
    waterPatch09FlowY: 0,
    waterPatch09FlowZ: 0,
    waterPatch09SurfaceY: 0,
    waterPatch09SlopeX: 0,
    waterPatch09SlopeZ: 0,
    waterPatch09SampleNormalX: 0,
    waterPatch09SampleNormalY: 0,
    waterPatch09SampleNormalZ: 0,
    waterPatch09WaterDepth: 0,
    waterPatch10OldAddedMass: 0,
    waterPatch10AddedMass: 0,
    waterPatch10EntrainedMass: 0,
    waterPatch10Radiation: 0,
    waterPatch10IntoSurface: 0,
    waterPatch10Push: 0,
    waterPatch10Inertia: 0,
    waterPatch10Projection: 0,
    waterPatch10WettedArea: 0,
    waterPatch10DeckWettedArea: 0,
    waterPatch10AddedMassPerArea: 0,
    waterPatch10RadiationPerArea: 0,
    waterPatch10NuX: 0,
    waterPatch10NuY: 0,
    waterPatch10NuZ: 0,
    waterPatch10ArmCrossNuX: 0,
    waterPatch10ArmCrossNuY: 0,
    waterPatch10ArmCrossNuZ: 0,
    waterPatch10ArmX: 0,
    waterPatch10ArmY: 0,
    waterPatch10ArmZ: 0,
    waterPatch10NormalX: 0,
    waterPatch10NormalY: 0,
    waterPatch10NormalZ: 0,
    waterPatch10PositionX: 0,
    waterPatch10PositionY: 0,
    waterPatch10PositionZ: 0,
    waterPatch10RelativeX: 0,
    waterPatch10RelativeY: 0,
    waterPatch10RelativeZ: 0,
    waterPatch10FlowX: 0,
    waterPatch10FlowY: 0,
    waterPatch10FlowZ: 0,
    waterPatch10SurfaceY: 0,
    waterPatch10SlopeX: 0,
    waterPatch10SlopeZ: 0,
    waterPatch10SampleNormalX: 0,
    waterPatch10SampleNormalY: 0,
    waterPatch10SampleNormalZ: 0,
    waterPatch10WaterDepth: 0,
    waterPatch11OldAddedMass: 0,
    waterPatch11AddedMass: 0,
    waterPatch11EntrainedMass: 0,
    waterPatch11Radiation: 0,
    waterPatch11IntoSurface: 0,
    waterPatch11Push: 0,
    waterPatch11Inertia: 0,
    waterPatch11Projection: 0,
    waterPatch11WettedArea: 0,
    waterPatch11DeckWettedArea: 0,
    waterPatch11AddedMassPerArea: 0,
    waterPatch11RadiationPerArea: 0,
    waterPatch11NuX: 0,
    waterPatch11NuY: 0,
    waterPatch11NuZ: 0,
    waterPatch11ArmCrossNuX: 0,
    waterPatch11ArmCrossNuY: 0,
    waterPatch11ArmCrossNuZ: 0,
    waterPatch11ArmX: 0,
    waterPatch11ArmY: 0,
    waterPatch11ArmZ: 0,
    waterPatch11NormalX: 0,
    waterPatch11NormalY: 0,
    waterPatch11NormalZ: 0,
    waterPatch11PositionX: 0,
    waterPatch11PositionY: 0,
    waterPatch11PositionZ: 0,
    waterPatch11RelativeX: 0,
    waterPatch11RelativeY: 0,
    waterPatch11RelativeZ: 0,
    waterPatch11FlowX: 0,
    waterPatch11FlowY: 0,
    waterPatch11FlowZ: 0,
    waterPatch11SurfaceY: 0,
    waterPatch11SlopeX: 0,
    waterPatch11SlopeZ: 0,
    waterPatch11SampleNormalX: 0,
    waterPatch11SampleNormalY: 0,
    waterPatch11SampleNormalZ: 0,
    waterPatch11WaterDepth: 0,
    waterPatch12OldAddedMass: 0,
    waterPatch12AddedMass: 0,
    waterPatch12EntrainedMass: 0,
    waterPatch12Radiation: 0,
    waterPatch12IntoSurface: 0,
    waterPatch12Push: 0,
    waterPatch12Inertia: 0,
    waterPatch12Projection: 0,
    waterPatch12WettedArea: 0,
    waterPatch12DeckWettedArea: 0,
    waterPatch12AddedMassPerArea: 0,
    waterPatch12RadiationPerArea: 0,
    waterPatch12NuX: 0,
    waterPatch12NuY: 0,
    waterPatch12NuZ: 0,
    waterPatch12ArmCrossNuX: 0,
    waterPatch12ArmCrossNuY: 0,
    waterPatch12ArmCrossNuZ: 0,
    waterPatch12ArmX: 0,
    waterPatch12ArmY: 0,
    waterPatch12ArmZ: 0,
    waterPatch12NormalX: 0,
    waterPatch12NormalY: 0,
    waterPatch12NormalZ: 0,
    waterPatch12PositionX: 0,
    waterPatch12PositionY: 0,
    waterPatch12PositionZ: 0,
    waterPatch12RelativeX: 0,
    waterPatch12RelativeY: 0,
    waterPatch12RelativeZ: 0,
    waterPatch12FlowX: 0,
    waterPatch12FlowY: 0,
    waterPatch12FlowZ: 0,
    waterPatch12SurfaceY: 0,
    waterPatch12SlopeX: 0,
    waterPatch12SlopeZ: 0,
    waterPatch12SampleNormalX: 0,
    waterPatch12SampleNormalY: 0,
    waterPatch12SampleNormalZ: 0,
    waterPatch12WaterDepth: 0,
    waterPatch13OldAddedMass: 0,
    waterPatch13AddedMass: 0,
    waterPatch13EntrainedMass: 0,
    waterPatch13Radiation: 0,
    waterPatch13IntoSurface: 0,
    waterPatch13Push: 0,
    waterPatch13Inertia: 0,
    waterPatch13Projection: 0,
    waterPatch13WettedArea: 0,
    waterPatch13DeckWettedArea: 0,
    waterPatch13AddedMassPerArea: 0,
    waterPatch13RadiationPerArea: 0,
    waterPatch13NuX: 0,
    waterPatch13NuY: 0,
    waterPatch13NuZ: 0,
    waterPatch13ArmCrossNuX: 0,
    waterPatch13ArmCrossNuY: 0,
    waterPatch13ArmCrossNuZ: 0,
    waterPatch13ArmX: 0,
    waterPatch13ArmY: 0,
    waterPatch13ArmZ: 0,
    waterPatch13NormalX: 0,
    waterPatch13NormalY: 0,
    waterPatch13NormalZ: 0,
    waterPatch13PositionX: 0,
    waterPatch13PositionY: 0,
    waterPatch13PositionZ: 0,
    waterPatch13RelativeX: 0,
    waterPatch13RelativeY: 0,
    waterPatch13RelativeZ: 0,
    waterPatch13FlowX: 0,
    waterPatch13FlowY: 0,
    waterPatch13FlowZ: 0,
    waterPatch13SurfaceY: 0,
    waterPatch13SlopeX: 0,
    waterPatch13SlopeZ: 0,
    waterPatch13SampleNormalX: 0,
    waterPatch13SampleNormalY: 0,
    waterPatch13SampleNormalZ: 0,
    waterPatch13WaterDepth: 0,
    waterPatch14OldAddedMass: 0,
    waterPatch14AddedMass: 0,
    waterPatch14EntrainedMass: 0,
    waterPatch14Radiation: 0,
    waterPatch14IntoSurface: 0,
    waterPatch14Push: 0,
    waterPatch14Inertia: 0,
    waterPatch14Projection: 0,
    waterPatch14WettedArea: 0,
    waterPatch14DeckWettedArea: 0,
    waterPatch14AddedMassPerArea: 0,
    waterPatch14RadiationPerArea: 0,
    waterPatch14NuX: 0,
    waterPatch14NuY: 0,
    waterPatch14NuZ: 0,
    waterPatch14ArmCrossNuX: 0,
    waterPatch14ArmCrossNuY: 0,
    waterPatch14ArmCrossNuZ: 0,
    waterPatch14ArmX: 0,
    waterPatch14ArmY: 0,
    waterPatch14ArmZ: 0,
    waterPatch14NormalX: 0,
    waterPatch14NormalY: 0,
    waterPatch14NormalZ: 0,
    waterPatch14PositionX: 0,
    waterPatch14PositionY: 0,
    waterPatch14PositionZ: 0,
    waterPatch14RelativeX: 0,
    waterPatch14RelativeY: 0,
    waterPatch14RelativeZ: 0,
    waterPatch14FlowX: 0,
    waterPatch14FlowY: 0,
    waterPatch14FlowZ: 0,
    waterPatch14SurfaceY: 0,
    waterPatch14SlopeX: 0,
    waterPatch14SlopeZ: 0,
    waterPatch14SampleNormalX: 0,
    waterPatch14SampleNormalY: 0,
    waterPatch14SampleNormalZ: 0,
    waterPatch14WaterDepth: 0,
    waterPatch15OldAddedMass: 0,
    waterPatch15AddedMass: 0,
    waterPatch15EntrainedMass: 0,
    waterPatch15Radiation: 0,
    waterPatch15IntoSurface: 0,
    waterPatch15Push: 0,
    waterPatch15Inertia: 0,
    waterPatch15Projection: 0,
    waterPatch15WettedArea: 0,
    waterPatch15DeckWettedArea: 0,
    waterPatch15AddedMassPerArea: 0,
    waterPatch15RadiationPerArea: 0,
    waterPatch15NuX: 0,
    waterPatch15NuY: 0,
    waterPatch15NuZ: 0,
    waterPatch15ArmCrossNuX: 0,
    waterPatch15ArmCrossNuY: 0,
    waterPatch15ArmCrossNuZ: 0,
    waterPatch15ArmX: 0,
    waterPatch15ArmY: 0,
    waterPatch15ArmZ: 0,
    waterPatch15NormalX: 0,
    waterPatch15NormalY: 0,
    waterPatch15NormalZ: 0,
    waterPatch15PositionX: 0,
    waterPatch15PositionY: 0,
    waterPatch15PositionZ: 0,
    waterPatch15RelativeX: 0,
    waterPatch15RelativeY: 0,
    waterPatch15RelativeZ: 0,
    waterPatch15FlowX: 0,
    waterPatch15FlowY: 0,
    waterPatch15FlowZ: 0,
    waterPatch15SurfaceY: 0,
    waterPatch15SlopeX: 0,
    waterPatch15SlopeZ: 0,
    waterPatch15SampleNormalX: 0,
    waterPatch15SampleNormalY: 0,
    waterPatch15SampleNormalZ: 0,
    waterPatch15WaterDepth: 0,
    waterPatch16OldAddedMass: 0,
    waterPatch16AddedMass: 0,
    waterPatch16EntrainedMass: 0,
    waterPatch16Radiation: 0,
    waterPatch16IntoSurface: 0,
    waterPatch16Push: 0,
    waterPatch16Inertia: 0,
    waterPatch16Projection: 0,
    waterPatch16WettedArea: 0,
    waterPatch16DeckWettedArea: 0,
    waterPatch16AddedMassPerArea: 0,
    waterPatch16RadiationPerArea: 0,
    waterPatch16NuX: 0,
    waterPatch16NuY: 0,
    waterPatch16NuZ: 0,
    waterPatch16ArmCrossNuX: 0,
    waterPatch16ArmCrossNuY: 0,
    waterPatch16ArmCrossNuZ: 0,
    waterPatch16ArmX: 0,
    waterPatch16ArmY: 0,
    waterPatch16ArmZ: 0,
    waterPatch16NormalX: 0,
    waterPatch16NormalY: 0,
    waterPatch16NormalZ: 0,
    waterPatch16PositionX: 0,
    waterPatch16PositionY: 0,
    waterPatch16PositionZ: 0,
    waterPatch16RelativeX: 0,
    waterPatch16RelativeY: 0,
    waterPatch16RelativeZ: 0,
    waterPatch16FlowX: 0,
    waterPatch16FlowY: 0,
    waterPatch16FlowZ: 0,
    waterPatch16SurfaceY: 0,
    waterPatch16SlopeX: 0,
    waterPatch16SlopeZ: 0,
    waterPatch16SampleNormalX: 0,
    waterPatch16SampleNormalY: 0,
    waterPatch16SampleNormalZ: 0,
    waterPatch16WaterDepth: 0,
    waterPatch17OldAddedMass: 0,
    waterPatch17AddedMass: 0,
    waterPatch17EntrainedMass: 0,
    waterPatch17Radiation: 0,
    waterPatch17IntoSurface: 0,
    waterPatch17Push: 0,
    waterPatch17Inertia: 0,
    waterPatch17Projection: 0,
    waterPatch17WettedArea: 0,
    waterPatch17DeckWettedArea: 0,
    waterPatch17AddedMassPerArea: 0,
    waterPatch17RadiationPerArea: 0,
    waterPatch17NuX: 0,
    waterPatch17NuY: 0,
    waterPatch17NuZ: 0,
    waterPatch17ArmCrossNuX: 0,
    waterPatch17ArmCrossNuY: 0,
    waterPatch17ArmCrossNuZ: 0,
    waterPatch17ArmX: 0,
    waterPatch17ArmY: 0,
    waterPatch17ArmZ: 0,
    waterPatch17NormalX: 0,
    waterPatch17NormalY: 0,
    waterPatch17NormalZ: 0,
    waterPatch17PositionX: 0,
    waterPatch17PositionY: 0,
    waterPatch17PositionZ: 0,
    waterPatch17RelativeX: 0,
    waterPatch17RelativeY: 0,
    waterPatch17RelativeZ: 0,
    waterPatch17FlowX: 0,
    waterPatch17FlowY: 0,
    waterPatch17FlowZ: 0,
    waterPatch17SurfaceY: 0,
    waterPatch17SlopeX: 0,
    waterPatch17SlopeZ: 0,
    waterPatch17SampleNormalX: 0,
    waterPatch17SampleNormalY: 0,
    waterPatch17SampleNormalZ: 0,
    waterPatch17WaterDepth: 0,
    waterPatch18OldAddedMass: 0,
    waterPatch18AddedMass: 0,
    waterPatch18EntrainedMass: 0,
    waterPatch18Radiation: 0,
    waterPatch18IntoSurface: 0,
    waterPatch18Push: 0,
    waterPatch18Inertia: 0,
    waterPatch18Projection: 0,
    waterPatch18WettedArea: 0,
    waterPatch18DeckWettedArea: 0,
    waterPatch18AddedMassPerArea: 0,
    waterPatch18RadiationPerArea: 0,
    waterPatch18NuX: 0,
    waterPatch18NuY: 0,
    waterPatch18NuZ: 0,
    waterPatch18ArmCrossNuX: 0,
    waterPatch18ArmCrossNuY: 0,
    waterPatch18ArmCrossNuZ: 0,
    waterPatch18ArmX: 0,
    waterPatch18ArmY: 0,
    waterPatch18ArmZ: 0,
    waterPatch18NormalX: 0,
    waterPatch18NormalY: 0,
    waterPatch18NormalZ: 0,
    waterPatch18PositionX: 0,
    waterPatch18PositionY: 0,
    waterPatch18PositionZ: 0,
    waterPatch18RelativeX: 0,
    waterPatch18RelativeY: 0,
    waterPatch18RelativeZ: 0,
    waterPatch18FlowX: 0,
    waterPatch18FlowY: 0,
    waterPatch18FlowZ: 0,
    waterPatch18SurfaceY: 0,
    waterPatch18SlopeX: 0,
    waterPatch18SlopeZ: 0,
    waterPatch18SampleNormalX: 0,
    waterPatch18SampleNormalY: 0,
    waterPatch18SampleNormalZ: 0,
    waterPatch18WaterDepth: 0,
    waterPatch19OldAddedMass: 0,
    waterPatch19AddedMass: 0,
    waterPatch19EntrainedMass: 0,
    waterPatch19Radiation: 0,
    waterPatch19IntoSurface: 0,
    waterPatch19Push: 0,
    waterPatch19Inertia: 0,
    waterPatch19Projection: 0,
    waterPatch19WettedArea: 0,
    waterPatch19DeckWettedArea: 0,
    waterPatch19AddedMassPerArea: 0,
    waterPatch19RadiationPerArea: 0,
    waterPatch19NuX: 0,
    waterPatch19NuY: 0,
    waterPatch19NuZ: 0,
    waterPatch19ArmCrossNuX: 0,
    waterPatch19ArmCrossNuY: 0,
    waterPatch19ArmCrossNuZ: 0,
    waterPatch19ArmX: 0,
    waterPatch19ArmY: 0,
    waterPatch19ArmZ: 0,
    waterPatch19NormalX: 0,
    waterPatch19NormalY: 0,
    waterPatch19NormalZ: 0,
    waterPatch19PositionX: 0,
    waterPatch19PositionY: 0,
    waterPatch19PositionZ: 0,
    waterPatch19RelativeX: 0,
    waterPatch19RelativeY: 0,
    waterPatch19RelativeZ: 0,
    waterPatch19FlowX: 0,
    waterPatch19FlowY: 0,
    waterPatch19FlowZ: 0,
    waterPatch19SurfaceY: 0,
    waterPatch19SlopeX: 0,
    waterPatch19SlopeZ: 0,
    waterPatch19SampleNormalX: 0,
    waterPatch19SampleNormalY: 0,
    waterPatch19SampleNormalZ: 0,
    waterPatch19WaterDepth: 0,
    waterPatch20OldAddedMass: 0,
    waterPatch20AddedMass: 0,
    waterPatch20EntrainedMass: 0,
    waterPatch20Radiation: 0,
    waterPatch20IntoSurface: 0,
    waterPatch20Push: 0,
    waterPatch20Inertia: 0,
    waterPatch20Projection: 0,
    waterPatch20WettedArea: 0,
    waterPatch20DeckWettedArea: 0,
    waterPatch20AddedMassPerArea: 0,
    waterPatch20RadiationPerArea: 0,
    waterPatch20NuX: 0,
    waterPatch20NuY: 0,
    waterPatch20NuZ: 0,
    waterPatch20ArmCrossNuX: 0,
    waterPatch20ArmCrossNuY: 0,
    waterPatch20ArmCrossNuZ: 0,
    waterPatch20ArmX: 0,
    waterPatch20ArmY: 0,
    waterPatch20ArmZ: 0,
    waterPatch20NormalX: 0,
    waterPatch20NormalY: 0,
    waterPatch20NormalZ: 0,
    waterPatch20PositionX: 0,
    waterPatch20PositionY: 0,
    waterPatch20PositionZ: 0,
    waterPatch20RelativeX: 0,
    waterPatch20RelativeY: 0,
    waterPatch20RelativeZ: 0,
    waterPatch20FlowX: 0,
    waterPatch20FlowY: 0,
    waterPatch20FlowZ: 0,
    waterPatch20SurfaceY: 0,
    waterPatch20SlopeX: 0,
    waterPatch20SlopeZ: 0,
    waterPatch20SampleNormalX: 0,
    waterPatch20SampleNormalY: 0,
    waterPatch20SampleNormalZ: 0,
    waterPatch20WaterDepth: 0,
    waterPatch21OldAddedMass: 0,
    waterPatch21AddedMass: 0,
    waterPatch21EntrainedMass: 0,
    waterPatch21Radiation: 0,
    waterPatch21IntoSurface: 0,
    waterPatch21Push: 0,
    waterPatch21Inertia: 0,
    waterPatch21Projection: 0,
    waterPatch21WettedArea: 0,
    waterPatch21DeckWettedArea: 0,
    waterPatch21AddedMassPerArea: 0,
    waterPatch21RadiationPerArea: 0,
    waterPatch21NuX: 0,
    waterPatch21NuY: 0,
    waterPatch21NuZ: 0,
    waterPatch21ArmCrossNuX: 0,
    waterPatch21ArmCrossNuY: 0,
    waterPatch21ArmCrossNuZ: 0,
    waterPatch21ArmX: 0,
    waterPatch21ArmY: 0,
    waterPatch21ArmZ: 0,
    waterPatch21NormalX: 0,
    waterPatch21NormalY: 0,
    waterPatch21NormalZ: 0,
    waterPatch21PositionX: 0,
    waterPatch21PositionY: 0,
    waterPatch21PositionZ: 0,
    waterPatch21RelativeX: 0,
    waterPatch21RelativeY: 0,
    waterPatch21RelativeZ: 0,
    waterPatch21FlowX: 0,
    waterPatch21FlowY: 0,
    waterPatch21FlowZ: 0,
    waterPatch21SurfaceY: 0,
    waterPatch21SlopeX: 0,
    waterPatch21SlopeZ: 0,
    waterPatch21SampleNormalX: 0,
    waterPatch21SampleNormalY: 0,
    waterPatch21SampleNormalZ: 0,
    waterPatch21WaterDepth: 0,
    waterPatch22OldAddedMass: 0,
    waterPatch22AddedMass: 0,
    waterPatch22EntrainedMass: 0,
    waterPatch22Radiation: 0,
    waterPatch22IntoSurface: 0,
    waterPatch22Push: 0,
    waterPatch22Inertia: 0,
    waterPatch22Projection: 0,
    waterPatch22WettedArea: 0,
    waterPatch22DeckWettedArea: 0,
    waterPatch22AddedMassPerArea: 0,
    waterPatch22RadiationPerArea: 0,
    waterPatch22NuX: 0,
    waterPatch22NuY: 0,
    waterPatch22NuZ: 0,
    waterPatch22ArmCrossNuX: 0,
    waterPatch22ArmCrossNuY: 0,
    waterPatch22ArmCrossNuZ: 0,
    waterPatch22ArmX: 0,
    waterPatch22ArmY: 0,
    waterPatch22ArmZ: 0,
    waterPatch22NormalX: 0,
    waterPatch22NormalY: 0,
    waterPatch22NormalZ: 0,
    waterPatch22PositionX: 0,
    waterPatch22PositionY: 0,
    waterPatch22PositionZ: 0,
    waterPatch22RelativeX: 0,
    waterPatch22RelativeY: 0,
    waterPatch22RelativeZ: 0,
    waterPatch22FlowX: 0,
    waterPatch22FlowY: 0,
    waterPatch22FlowZ: 0,
    waterPatch22SurfaceY: 0,
    waterPatch22SlopeX: 0,
    waterPatch22SlopeZ: 0,
    waterPatch22SampleNormalX: 0,
    waterPatch22SampleNormalY: 0,
    waterPatch22SampleNormalZ: 0,
    waterPatch22WaterDepth: 0,
    waterPatch23OldAddedMass: 0,
    waterPatch23AddedMass: 0,
    waterPatch23EntrainedMass: 0,
    waterPatch23Radiation: 0,
    waterPatch23IntoSurface: 0,
    waterPatch23Push: 0,
    waterPatch23Inertia: 0,
    waterPatch23Projection: 0,
    waterPatch23WettedArea: 0,
    waterPatch23DeckWettedArea: 0,
    waterPatch23AddedMassPerArea: 0,
    waterPatch23RadiationPerArea: 0,
    waterPatch23NuX: 0,
    waterPatch23NuY: 0,
    waterPatch23NuZ: 0,
    waterPatch23ArmCrossNuX: 0,
    waterPatch23ArmCrossNuY: 0,
    waterPatch23ArmCrossNuZ: 0,
    waterPatch23ArmX: 0,
    waterPatch23ArmY: 0,
    waterPatch23ArmZ: 0,
    waterPatch23NormalX: 0,
    waterPatch23NormalY: 0,
    waterPatch23NormalZ: 0,
    waterPatch23PositionX: 0,
    waterPatch23PositionY: 0,
    waterPatch23PositionZ: 0,
    waterPatch23RelativeX: 0,
    waterPatch23RelativeY: 0,
    waterPatch23RelativeZ: 0,
    waterPatch23FlowX: 0,
    waterPatch23FlowY: 0,
    waterPatch23FlowZ: 0,
    waterPatch23SurfaceY: 0,
    waterPatch23SlopeX: 0,
    waterPatch23SlopeZ: 0,
    waterPatch23SampleNormalX: 0,
    waterPatch23SampleNormalY: 0,
    waterPatch23SampleNormalZ: 0,
    waterPatch23WaterDepth: 0,
    waterPatch24OldAddedMass: 0,
    waterPatch24AddedMass: 0,
    waterPatch24EntrainedMass: 0,
    waterPatch24Radiation: 0,
    waterPatch24IntoSurface: 0,
    waterPatch24Push: 0,
    waterPatch24Inertia: 0,
    waterPatch24Projection: 0,
    waterPatch24WettedArea: 0,
    waterPatch24DeckWettedArea: 0,
    waterPatch24AddedMassPerArea: 0,
    waterPatch24RadiationPerArea: 0,
    waterPatch24NuX: 0,
    waterPatch24NuY: 0,
    waterPatch24NuZ: 0,
    waterPatch24ArmCrossNuX: 0,
    waterPatch24ArmCrossNuY: 0,
    waterPatch24ArmCrossNuZ: 0,
    waterPatch24ArmX: 0,
    waterPatch24ArmY: 0,
    waterPatch24ArmZ: 0,
    waterPatch24NormalX: 0,
    waterPatch24NormalY: 0,
    waterPatch24NormalZ: 0,
    waterPatch24PositionX: 0,
    waterPatch24PositionY: 0,
    waterPatch24PositionZ: 0,
    waterPatch24RelativeX: 0,
    waterPatch24RelativeY: 0,
    waterPatch24RelativeZ: 0,
    waterPatch24FlowX: 0,
    waterPatch24FlowY: 0,
    waterPatch24FlowZ: 0,
    waterPatch24SurfaceY: 0,
    waterPatch24SlopeX: 0,
    waterPatch24SlopeZ: 0,
    waterPatch24SampleNormalX: 0,
    waterPatch24SampleNormalY: 0,
    waterPatch24SampleNormalZ: 0,
    waterPatch24WaterDepth: 0,
    waterPatch25OldAddedMass: 0,
    waterPatch25AddedMass: 0,
    waterPatch25EntrainedMass: 0,
    waterPatch25Radiation: 0,
    waterPatch25IntoSurface: 0,
    waterPatch25Push: 0,
    waterPatch25Inertia: 0,
    waterPatch25Projection: 0,
    waterPatch25WettedArea: 0,
    waterPatch25DeckWettedArea: 0,
    waterPatch25AddedMassPerArea: 0,
    waterPatch25RadiationPerArea: 0,
    waterPatch25NuX: 0,
    waterPatch25NuY: 0,
    waterPatch25NuZ: 0,
    waterPatch25ArmCrossNuX: 0,
    waterPatch25ArmCrossNuY: 0,
    waterPatch25ArmCrossNuZ: 0,
    waterPatch25ArmX: 0,
    waterPatch25ArmY: 0,
    waterPatch25ArmZ: 0,
    waterPatch25NormalX: 0,
    waterPatch25NormalY: 0,
    waterPatch25NormalZ: 0,
    waterPatch25PositionX: 0,
    waterPatch25PositionY: 0,
    waterPatch25PositionZ: 0,
    waterPatch25RelativeX: 0,
    waterPatch25RelativeY: 0,
    waterPatch25RelativeZ: 0,
    waterPatch25FlowX: 0,
    waterPatch25FlowY: 0,
    waterPatch25FlowZ: 0,
    waterPatch25SurfaceY: 0,
    waterPatch25SlopeX: 0,
    waterPatch25SlopeZ: 0,
    waterPatch25SampleNormalX: 0,
    waterPatch25SampleNormalY: 0,
    waterPatch25SampleNormalZ: 0,
    waterPatch25WaterDepth: 0,
    waterPatch26OldAddedMass: 0,
    waterPatch26AddedMass: 0,
    waterPatch26EntrainedMass: 0,
    waterPatch26Radiation: 0,
    waterPatch26IntoSurface: 0,
    waterPatch26Push: 0,
    waterPatch26Inertia: 0,
    waterPatch26Projection: 0,
    waterPatch26WettedArea: 0,
    waterPatch26DeckWettedArea: 0,
    waterPatch26AddedMassPerArea: 0,
    waterPatch26RadiationPerArea: 0,
    waterPatch26NuX: 0,
    waterPatch26NuY: 0,
    waterPatch26NuZ: 0,
    waterPatch26ArmCrossNuX: 0,
    waterPatch26ArmCrossNuY: 0,
    waterPatch26ArmCrossNuZ: 0,
    waterPatch26ArmX: 0,
    waterPatch26ArmY: 0,
    waterPatch26ArmZ: 0,
    waterPatch26NormalX: 0,
    waterPatch26NormalY: 0,
    waterPatch26NormalZ: 0,
    waterPatch26PositionX: 0,
    waterPatch26PositionY: 0,
    waterPatch26PositionZ: 0,
    waterPatch26RelativeX: 0,
    waterPatch26RelativeY: 0,
    waterPatch26RelativeZ: 0,
    waterPatch26FlowX: 0,
    waterPatch26FlowY: 0,
    waterPatch26FlowZ: 0,
    waterPatch26SurfaceY: 0,
    waterPatch26SlopeX: 0,
    waterPatch26SlopeZ: 0,
    waterPatch26SampleNormalX: 0,
    waterPatch26SampleNormalY: 0,
    waterPatch26SampleNormalZ: 0,
    waterPatch26WaterDepth: 0,
    waterPatch27OldAddedMass: 0,
    waterPatch27AddedMass: 0,
    waterPatch27EntrainedMass: 0,
    waterPatch27Radiation: 0,
    waterPatch27IntoSurface: 0,
    waterPatch27Push: 0,
    waterPatch27Inertia: 0,
    waterPatch27Projection: 0,
    waterPatch27WettedArea: 0,
    waterPatch27DeckWettedArea: 0,
    waterPatch27AddedMassPerArea: 0,
    waterPatch27RadiationPerArea: 0,
    waterPatch27NuX: 0,
    waterPatch27NuY: 0,
    waterPatch27NuZ: 0,
    waterPatch27ArmCrossNuX: 0,
    waterPatch27ArmCrossNuY: 0,
    waterPatch27ArmCrossNuZ: 0,
    waterPatch27ArmX: 0,
    waterPatch27ArmY: 0,
    waterPatch27ArmZ: 0,
    waterPatch27NormalX: 0,
    waterPatch27NormalY: 0,
    waterPatch27NormalZ: 0,
    waterPatch27PositionX: 0,
    waterPatch27PositionY: 0,
    waterPatch27PositionZ: 0,
    waterPatch27RelativeX: 0,
    waterPatch27RelativeY: 0,
    waterPatch27RelativeZ: 0,
    waterPatch27FlowX: 0,
    waterPatch27FlowY: 0,
    waterPatch27FlowZ: 0,
    waterPatch27SurfaceY: 0,
    waterPatch27SlopeX: 0,
    waterPatch27SlopeZ: 0,
    waterPatch27SampleNormalX: 0,
    waterPatch27SampleNormalY: 0,
    waterPatch27SampleNormalZ: 0,
    waterPatch27WaterDepth: 0,
    waterPatch28OldAddedMass: 0,
    waterPatch28AddedMass: 0,
    waterPatch28EntrainedMass: 0,
    waterPatch28Radiation: 0,
    waterPatch28IntoSurface: 0,
    waterPatch28Push: 0,
    waterPatch28Inertia: 0,
    waterPatch28Projection: 0,
    waterPatch28WettedArea: 0,
    waterPatch28DeckWettedArea: 0,
    waterPatch28AddedMassPerArea: 0,
    waterPatch28RadiationPerArea: 0,
    waterPatch28NuX: 0,
    waterPatch28NuY: 0,
    waterPatch28NuZ: 0,
    waterPatch28ArmCrossNuX: 0,
    waterPatch28ArmCrossNuY: 0,
    waterPatch28ArmCrossNuZ: 0,
    waterPatch28ArmX: 0,
    waterPatch28ArmY: 0,
    waterPatch28ArmZ: 0,
    waterPatch28NormalX: 0,
    waterPatch28NormalY: 0,
    waterPatch28NormalZ: 0,
    waterPatch28PositionX: 0,
    waterPatch28PositionY: 0,
    waterPatch28PositionZ: 0,
    waterPatch28RelativeX: 0,
    waterPatch28RelativeY: 0,
    waterPatch28RelativeZ: 0,
    waterPatch28FlowX: 0,
    waterPatch28FlowY: 0,
    waterPatch28FlowZ: 0,
    waterPatch28SurfaceY: 0,
    waterPatch28SlopeX: 0,
    waterPatch28SlopeZ: 0,
    waterPatch28SampleNormalX: 0,
    waterPatch28SampleNormalY: 0,
    waterPatch28SampleNormalZ: 0,
    waterPatch28WaterDepth: 0,
    waterPatch29OldAddedMass: 0,
    waterPatch29AddedMass: 0,
    waterPatch29EntrainedMass: 0,
    waterPatch29Radiation: 0,
    waterPatch29IntoSurface: 0,
    waterPatch29Push: 0,
    waterPatch29Inertia: 0,
    waterPatch29Projection: 0,
    waterPatch29WettedArea: 0,
    waterPatch29DeckWettedArea: 0,
    waterPatch29AddedMassPerArea: 0,
    waterPatch29RadiationPerArea: 0,
    waterPatch29NuX: 0,
    waterPatch29NuY: 0,
    waterPatch29NuZ: 0,
    waterPatch29ArmCrossNuX: 0,
    waterPatch29ArmCrossNuY: 0,
    waterPatch29ArmCrossNuZ: 0,
    waterPatch29ArmX: 0,
    waterPatch29ArmY: 0,
    waterPatch29ArmZ: 0,
    waterPatch29NormalX: 0,
    waterPatch29NormalY: 0,
    waterPatch29NormalZ: 0,
    waterPatch29PositionX: 0,
    waterPatch29PositionY: 0,
    waterPatch29PositionZ: 0,
    waterPatch29RelativeX: 0,
    waterPatch29RelativeY: 0,
    waterPatch29RelativeZ: 0,
    waterPatch29FlowX: 0,
    waterPatch29FlowY: 0,
    waterPatch29FlowZ: 0,
    waterPatch29SurfaceY: 0,
    waterPatch29SlopeX: 0,
    waterPatch29SlopeZ: 0,
    waterPatch29SampleNormalX: 0,
    waterPatch29SampleNormalY: 0,
    waterPatch29SampleNormalZ: 0,
    waterPatch29WaterDepth: 0,
    waterPatch30OldAddedMass: 0,
    waterPatch30AddedMass: 0,
    waterPatch30EntrainedMass: 0,
    waterPatch30Radiation: 0,
    waterPatch30IntoSurface: 0,
    waterPatch30Push: 0,
    waterPatch30Inertia: 0,
    waterPatch30Projection: 0,
    waterPatch30WettedArea: 0,
    waterPatch30DeckWettedArea: 0,
    waterPatch30AddedMassPerArea: 0,
    waterPatch30RadiationPerArea: 0,
    waterPatch30NuX: 0,
    waterPatch30NuY: 0,
    waterPatch30NuZ: 0,
    waterPatch30ArmCrossNuX: 0,
    waterPatch30ArmCrossNuY: 0,
    waterPatch30ArmCrossNuZ: 0,
    waterPatch30ArmX: 0,
    waterPatch30ArmY: 0,
    waterPatch30ArmZ: 0,
    waterPatch30NormalX: 0,
    waterPatch30NormalY: 0,
    waterPatch30NormalZ: 0,
    waterPatch30PositionX: 0,
    waterPatch30PositionY: 0,
    waterPatch30PositionZ: 0,
    waterPatch30RelativeX: 0,
    waterPatch30RelativeY: 0,
    waterPatch30RelativeZ: 0,
    waterPatch30FlowX: 0,
    waterPatch30FlowY: 0,
    waterPatch30FlowZ: 0,
    waterPatch30SurfaceY: 0,
    waterPatch30SlopeX: 0,
    waterPatch30SlopeZ: 0,
    waterPatch30SampleNormalX: 0,
    waterPatch30SampleNormalY: 0,
    waterPatch30SampleNormalZ: 0,
    waterPatch30WaterDepth: 0,
    waterPatch31OldAddedMass: 0,
    waterPatch31AddedMass: 0,
    waterPatch31EntrainedMass: 0,
    waterPatch31Radiation: 0,
    waterPatch31IntoSurface: 0,
    waterPatch31Push: 0,
    waterPatch31Inertia: 0,
    waterPatch31Projection: 0,
    waterPatch31WettedArea: 0,
    waterPatch31DeckWettedArea: 0,
    waterPatch31AddedMassPerArea: 0,
    waterPatch31RadiationPerArea: 0,
    waterPatch31NuX: 0,
    waterPatch31NuY: 0,
    waterPatch31NuZ: 0,
    waterPatch31ArmCrossNuX: 0,
    waterPatch31ArmCrossNuY: 0,
    waterPatch31ArmCrossNuZ: 0,
    waterPatch31ArmX: 0,
    waterPatch31ArmY: 0,
    waterPatch31ArmZ: 0,
    waterPatch31NormalX: 0,
    waterPatch31NormalY: 0,
    waterPatch31NormalZ: 0,
    waterPatch31PositionX: 0,
    waterPatch31PositionY: 0,
    waterPatch31PositionZ: 0,
    waterPatch31RelativeX: 0,
    waterPatch31RelativeY: 0,
    waterPatch31RelativeZ: 0,
    waterPatch31FlowX: 0,
    waterPatch31FlowY: 0,
    waterPatch31FlowZ: 0,
    waterPatch31SurfaceY: 0,
    waterPatch31SlopeX: 0,
    waterPatch31SlopeZ: 0,
    waterPatch31SampleNormalX: 0,
    waterPatch31SampleNormalY: 0,
    waterPatch31SampleNormalZ: 0,
    waterPatch31WaterDepth: 0,
    waterPatch32OldAddedMass: 0,
    waterPatch32AddedMass: 0,
    waterPatch32EntrainedMass: 0,
    waterPatch32Radiation: 0,
    waterPatch32IntoSurface: 0,
    waterPatch32Push: 0,
    waterPatch32Inertia: 0,
    waterPatch32Projection: 0,
    waterPatch32WettedArea: 0,
    waterPatch32DeckWettedArea: 0,
    waterPatch32AddedMassPerArea: 0,
    waterPatch32RadiationPerArea: 0,
    waterPatch32NuX: 0,
    waterPatch32NuY: 0,
    waterPatch32NuZ: 0,
    waterPatch32ArmCrossNuX: 0,
    waterPatch32ArmCrossNuY: 0,
    waterPatch32ArmCrossNuZ: 0,
    waterPatch32ArmX: 0,
    waterPatch32ArmY: 0,
    waterPatch32ArmZ: 0,
    waterPatch32NormalX: 0,
    waterPatch32NormalY: 0,
    waterPatch32NormalZ: 0,
    waterPatch32PositionX: 0,
    waterPatch32PositionY: 0,
    waterPatch32PositionZ: 0,
    waterPatch32RelativeX: 0,
    waterPatch32RelativeY: 0,
    waterPatch32RelativeZ: 0,
    waterPatch32FlowX: 0,
    waterPatch32FlowY: 0,
    waterPatch32FlowZ: 0,
    waterPatch32SurfaceY: 0,
    waterPatch32SlopeX: 0,
    waterPatch32SlopeZ: 0,
    waterPatch32SampleNormalX: 0,
    waterPatch32SampleNormalY: 0,
    waterPatch32SampleNormalZ: 0,
    waterPatch32WaterDepth: 0,
    waterPatch33OldAddedMass: 0,
    waterPatch33AddedMass: 0,
    waterPatch33EntrainedMass: 0,
    waterPatch33Radiation: 0,
    waterPatch33IntoSurface: 0,
    waterPatch33Push: 0,
    waterPatch33Inertia: 0,
    waterPatch33Projection: 0,
    waterPatch33WettedArea: 0,
    waterPatch33DeckWettedArea: 0,
    waterPatch33AddedMassPerArea: 0,
    waterPatch33RadiationPerArea: 0,
    waterPatch33NuX: 0,
    waterPatch33NuY: 0,
    waterPatch33NuZ: 0,
    waterPatch33ArmCrossNuX: 0,
    waterPatch33ArmCrossNuY: 0,
    waterPatch33ArmCrossNuZ: 0,
    waterPatch33ArmX: 0,
    waterPatch33ArmY: 0,
    waterPatch33ArmZ: 0,
    waterPatch33NormalX: 0,
    waterPatch33NormalY: 0,
    waterPatch33NormalZ: 0,
    waterPatch33PositionX: 0,
    waterPatch33PositionY: 0,
    waterPatch33PositionZ: 0,
    waterPatch33RelativeX: 0,
    waterPatch33RelativeY: 0,
    waterPatch33RelativeZ: 0,
    waterPatch33FlowX: 0,
    waterPatch33FlowY: 0,
    waterPatch33FlowZ: 0,
    waterPatch33SurfaceY: 0,
    waterPatch33SlopeX: 0,
    waterPatch33SlopeZ: 0,
    waterPatch33SampleNormalX: 0,
    waterPatch33SampleNormalY: 0,
    waterPatch33SampleNormalZ: 0,
    waterPatch33WaterDepth: 0,
    waterPatch34OldAddedMass: 0,
    waterPatch34AddedMass: 0,
    waterPatch34EntrainedMass: 0,
    waterPatch34Radiation: 0,
    waterPatch34IntoSurface: 0,
    waterPatch34Push: 0,
    waterPatch34Inertia: 0,
    waterPatch34Projection: 0,
    waterPatch34WettedArea: 0,
    waterPatch34DeckWettedArea: 0,
    waterPatch34AddedMassPerArea: 0,
    waterPatch34RadiationPerArea: 0,
    waterPatch34NuX: 0,
    waterPatch34NuY: 0,
    waterPatch34NuZ: 0,
    waterPatch34ArmCrossNuX: 0,
    waterPatch34ArmCrossNuY: 0,
    waterPatch34ArmCrossNuZ: 0,
    waterPatch34ArmX: 0,
    waterPatch34ArmY: 0,
    waterPatch34ArmZ: 0,
    waterPatch34NormalX: 0,
    waterPatch34NormalY: 0,
    waterPatch34NormalZ: 0,
    waterPatch34PositionX: 0,
    waterPatch34PositionY: 0,
    waterPatch34PositionZ: 0,
    waterPatch34RelativeX: 0,
    waterPatch34RelativeY: 0,
    waterPatch34RelativeZ: 0,
    waterPatch34FlowX: 0,
    waterPatch34FlowY: 0,
    waterPatch34FlowZ: 0,
    waterPatch34SurfaceY: 0,
    waterPatch34SlopeX: 0,
    waterPatch34SlopeZ: 0,
    waterPatch34SampleNormalX: 0,
    waterPatch34SampleNormalY: 0,
    waterPatch34SampleNormalZ: 0,
    waterPatch34WaterDepth: 0,
    waterPatch35OldAddedMass: 0,
    waterPatch35AddedMass: 0,
    waterPatch35EntrainedMass: 0,
    waterPatch35Radiation: 0,
    waterPatch35IntoSurface: 0,
    waterPatch35Push: 0,
    waterPatch35Inertia: 0,
    waterPatch35Projection: 0,
    waterPatch35WettedArea: 0,
    waterPatch35DeckWettedArea: 0,
    waterPatch35AddedMassPerArea: 0,
    waterPatch35RadiationPerArea: 0,
    waterPatch35NuX: 0,
    waterPatch35NuY: 0,
    waterPatch35NuZ: 0,
    waterPatch35ArmCrossNuX: 0,
    waterPatch35ArmCrossNuY: 0,
    waterPatch35ArmCrossNuZ: 0,
    waterPatch35ArmX: 0,
    waterPatch35ArmY: 0,
    waterPatch35ArmZ: 0,
    waterPatch35NormalX: 0,
    waterPatch35NormalY: 0,
    waterPatch35NormalZ: 0,
    waterPatch35PositionX: 0,
    waterPatch35PositionY: 0,
    waterPatch35PositionZ: 0,
    waterPatch35RelativeX: 0,
    waterPatch35RelativeY: 0,
    waterPatch35RelativeZ: 0,
    waterPatch35FlowX: 0,
    waterPatch35FlowY: 0,
    waterPatch35FlowZ: 0,
    waterPatch35SurfaceY: 0,
    waterPatch35SlopeX: 0,
    waterPatch35SlopeZ: 0,
    waterPatch35SampleNormalX: 0,
    waterPatch35SampleNormalY: 0,
    waterPatch35SampleNormalZ: 0,
    waterPatch35WaterDepth: 0,
    waterPatch36OldAddedMass: 0,
    waterPatch36AddedMass: 0,
    waterPatch36EntrainedMass: 0,
    waterPatch36Radiation: 0,
    waterPatch36IntoSurface: 0,
    waterPatch36Push: 0,
    waterPatch36Inertia: 0,
    waterPatch36Projection: 0,
    waterPatch36WettedArea: 0,
    waterPatch36DeckWettedArea: 0,
    waterPatch36AddedMassPerArea: 0,
    waterPatch36RadiationPerArea: 0,
    waterPatch36NuX: 0,
    waterPatch36NuY: 0,
    waterPatch36NuZ: 0,
    waterPatch36ArmCrossNuX: 0,
    waterPatch36ArmCrossNuY: 0,
    waterPatch36ArmCrossNuZ: 0,
    waterPatch36ArmX: 0,
    waterPatch36ArmY: 0,
    waterPatch36ArmZ: 0,
    waterPatch36NormalX: 0,
    waterPatch36NormalY: 0,
    waterPatch36NormalZ: 0,
    waterPatch36PositionX: 0,
    waterPatch36PositionY: 0,
    waterPatch36PositionZ: 0,
    waterPatch36RelativeX: 0,
    waterPatch36RelativeY: 0,
    waterPatch36RelativeZ: 0,
    waterPatch36FlowX: 0,
    waterPatch36FlowY: 0,
    waterPatch36FlowZ: 0,
    waterPatch36SurfaceY: 0,
    waterPatch36SlopeX: 0,
    waterPatch36SlopeZ: 0,
    waterPatch36SampleNormalX: 0,
    waterPatch36SampleNormalY: 0,
    waterPatch36SampleNormalZ: 0,
    waterPatch36WaterDepth: 0,
    waterPatch37OldAddedMass: 0,
    waterPatch37AddedMass: 0,
    waterPatch37EntrainedMass: 0,
    waterPatch37Radiation: 0,
    waterPatch37IntoSurface: 0,
    waterPatch37Push: 0,
    waterPatch37Inertia: 0,
    waterPatch37Projection: 0,
    waterPatch37WettedArea: 0,
    waterPatch37DeckWettedArea: 0,
    waterPatch37AddedMassPerArea: 0,
    waterPatch37RadiationPerArea: 0,
    waterPatch37NuX: 0,
    waterPatch37NuY: 0,
    waterPatch37NuZ: 0,
    waterPatch37ArmCrossNuX: 0,
    waterPatch37ArmCrossNuY: 0,
    waterPatch37ArmCrossNuZ: 0,
    waterPatch37ArmX: 0,
    waterPatch37ArmY: 0,
    waterPatch37ArmZ: 0,
    waterPatch37NormalX: 0,
    waterPatch37NormalY: 0,
    waterPatch37NormalZ: 0,
    waterPatch37PositionX: 0,
    waterPatch37PositionY: 0,
    waterPatch37PositionZ: 0,
    waterPatch37RelativeX: 0,
    waterPatch37RelativeY: 0,
    waterPatch37RelativeZ: 0,
    waterPatch37FlowX: 0,
    waterPatch37FlowY: 0,
    waterPatch37FlowZ: 0,
    waterPatch37SurfaceY: 0,
    waterPatch37SlopeX: 0,
    waterPatch37SlopeZ: 0,
    waterPatch37SampleNormalX: 0,
    waterPatch37SampleNormalY: 0,
    waterPatch37SampleNormalZ: 0,
    waterPatch37WaterDepth: 0,
    waterPatch38OldAddedMass: 0,
    waterPatch38AddedMass: 0,
    waterPatch38EntrainedMass: 0,
    waterPatch38Radiation: 0,
    waterPatch38IntoSurface: 0,
    waterPatch38Push: 0,
    waterPatch38Inertia: 0,
    waterPatch38Projection: 0,
    waterPatch38WettedArea: 0,
    waterPatch38DeckWettedArea: 0,
    waterPatch38AddedMassPerArea: 0,
    waterPatch38RadiationPerArea: 0,
    waterPatch38NuX: 0,
    waterPatch38NuY: 0,
    waterPatch38NuZ: 0,
    waterPatch38ArmCrossNuX: 0,
    waterPatch38ArmCrossNuY: 0,
    waterPatch38ArmCrossNuZ: 0,
    waterPatch38ArmX: 0,
    waterPatch38ArmY: 0,
    waterPatch38ArmZ: 0,
    waterPatch38NormalX: 0,
    waterPatch38NormalY: 0,
    waterPatch38NormalZ: 0,
    waterPatch38PositionX: 0,
    waterPatch38PositionY: 0,
    waterPatch38PositionZ: 0,
    waterPatch38RelativeX: 0,
    waterPatch38RelativeY: 0,
    waterPatch38RelativeZ: 0,
    waterPatch38FlowX: 0,
    waterPatch38FlowY: 0,
    waterPatch38FlowZ: 0,
    waterPatch38SurfaceY: 0,
    waterPatch38SlopeX: 0,
    waterPatch38SlopeZ: 0,
    waterPatch38SampleNormalX: 0,
    waterPatch38SampleNormalY: 0,
    waterPatch38SampleNormalZ: 0,
    waterPatch38WaterDepth: 0,
    waterPatch39OldAddedMass: 0,
    waterPatch39AddedMass: 0,
    waterPatch39EntrainedMass: 0,
    waterPatch39Radiation: 0,
    waterPatch39IntoSurface: 0,
    waterPatch39Push: 0,
    waterPatch39Inertia: 0,
    waterPatch39Projection: 0,
    waterPatch39WettedArea: 0,
    waterPatch39DeckWettedArea: 0,
    waterPatch39AddedMassPerArea: 0,
    waterPatch39RadiationPerArea: 0,
    waterPatch39NuX: 0,
    waterPatch39NuY: 0,
    waterPatch39NuZ: 0,
    waterPatch39ArmCrossNuX: 0,
    waterPatch39ArmCrossNuY: 0,
    waterPatch39ArmCrossNuZ: 0,
    waterPatch39ArmX: 0,
    waterPatch39ArmY: 0,
    waterPatch39ArmZ: 0,
    waterPatch39NormalX: 0,
    waterPatch39NormalY: 0,
    waterPatch39NormalZ: 0,
    waterPatch39PositionX: 0,
    waterPatch39PositionY: 0,
    waterPatch39PositionZ: 0,
    waterPatch39RelativeX: 0,
    waterPatch39RelativeY: 0,
    waterPatch39RelativeZ: 0,
    waterPatch39FlowX: 0,
    waterPatch39FlowY: 0,
    waterPatch39FlowZ: 0,
    waterPatch39SurfaceY: 0,
    waterPatch39SlopeX: 0,
    waterPatch39SlopeZ: 0,
    waterPatch39SampleNormalX: 0,
    waterPatch39SampleNormalY: 0,
    waterPatch39SampleNormalZ: 0,
    waterPatch39WaterDepth: 0,
    waterPatch40OldAddedMass: 0,
    waterPatch40AddedMass: 0,
    waterPatch40EntrainedMass: 0,
    waterPatch40Radiation: 0,
    waterPatch40IntoSurface: 0,
    waterPatch40Push: 0,
    waterPatch40Inertia: 0,
    waterPatch40Projection: 0,
    waterPatch40WettedArea: 0,
    waterPatch40DeckWettedArea: 0,
    waterPatch40AddedMassPerArea: 0,
    waterPatch40RadiationPerArea: 0,
    waterPatch40NuX: 0,
    waterPatch40NuY: 0,
    waterPatch40NuZ: 0,
    waterPatch40ArmCrossNuX: 0,
    waterPatch40ArmCrossNuY: 0,
    waterPatch40ArmCrossNuZ: 0,
    waterPatch40ArmX: 0,
    waterPatch40ArmY: 0,
    waterPatch40ArmZ: 0,
    waterPatch40NormalX: 0,
    waterPatch40NormalY: 0,
    waterPatch40NormalZ: 0,
    waterPatch40PositionX: 0,
    waterPatch40PositionY: 0,
    waterPatch40PositionZ: 0,
    waterPatch40RelativeX: 0,
    waterPatch40RelativeY: 0,
    waterPatch40RelativeZ: 0,
    waterPatch40FlowX: 0,
    waterPatch40FlowY: 0,
    waterPatch40FlowZ: 0,
    waterPatch40SurfaceY: 0,
    waterPatch40SlopeX: 0,
    waterPatch40SlopeZ: 0,
    waterPatch40SampleNormalX: 0,
    waterPatch40SampleNormalY: 0,
    waterPatch40SampleNormalZ: 0,
    waterPatch40WaterDepth: 0,
    waterPatch41OldAddedMass: 0,
    waterPatch41AddedMass: 0,
    waterPatch41EntrainedMass: 0,
    waterPatch41Radiation: 0,
    waterPatch41IntoSurface: 0,
    waterPatch41Push: 0,
    waterPatch41Inertia: 0,
    waterPatch41Projection: 0,
    waterPatch41WettedArea: 0,
    waterPatch41DeckWettedArea: 0,
    waterPatch41AddedMassPerArea: 0,
    waterPatch41RadiationPerArea: 0,
    waterPatch41NuX: 0,
    waterPatch41NuY: 0,
    waterPatch41NuZ: 0,
    waterPatch41ArmCrossNuX: 0,
    waterPatch41ArmCrossNuY: 0,
    waterPatch41ArmCrossNuZ: 0,
    waterPatch41ArmX: 0,
    waterPatch41ArmY: 0,
    waterPatch41ArmZ: 0,
    waterPatch41NormalX: 0,
    waterPatch41NormalY: 0,
    waterPatch41NormalZ: 0,
    waterPatch41PositionX: 0,
    waterPatch41PositionY: 0,
    waterPatch41PositionZ: 0,
    waterPatch41RelativeX: 0,
    waterPatch41RelativeY: 0,
    waterPatch41RelativeZ: 0,
    waterPatch41FlowX: 0,
    waterPatch41FlowY: 0,
    waterPatch41FlowZ: 0,
    waterPatch41SurfaceY: 0,
    waterPatch41SlopeX: 0,
    waterPatch41SlopeZ: 0,
    waterPatch41SampleNormalX: 0,
    waterPatch41SampleNormalY: 0,
    waterPatch41SampleNormalZ: 0,
    waterPatch41WaterDepth: 0,
    waterPatch42OldAddedMass: 0,
    waterPatch42AddedMass: 0,
    waterPatch42EntrainedMass: 0,
    waterPatch42Radiation: 0,
    waterPatch42IntoSurface: 0,
    waterPatch42Push: 0,
    waterPatch42Inertia: 0,
    waterPatch42Projection: 0,
    waterPatch42WettedArea: 0,
    waterPatch42DeckWettedArea: 0,
    waterPatch42AddedMassPerArea: 0,
    waterPatch42RadiationPerArea: 0,
    waterPatch42NuX: 0,
    waterPatch42NuY: 0,
    waterPatch42NuZ: 0,
    waterPatch42ArmCrossNuX: 0,
    waterPatch42ArmCrossNuY: 0,
    waterPatch42ArmCrossNuZ: 0,
    waterPatch42ArmX: 0,
    waterPatch42ArmY: 0,
    waterPatch42ArmZ: 0,
    waterPatch42NormalX: 0,
    waterPatch42NormalY: 0,
    waterPatch42NormalZ: 0,
    waterPatch42PositionX: 0,
    waterPatch42PositionY: 0,
    waterPatch42PositionZ: 0,
    waterPatch42RelativeX: 0,
    waterPatch42RelativeY: 0,
    waterPatch42RelativeZ: 0,
    waterPatch42FlowX: 0,
    waterPatch42FlowY: 0,
    waterPatch42FlowZ: 0,
    waterPatch42SurfaceY: 0,
    waterPatch42SlopeX: 0,
    waterPatch42SlopeZ: 0,
    waterPatch42SampleNormalX: 0,
    waterPatch42SampleNormalY: 0,
    waterPatch42SampleNormalZ: 0,
    waterPatch42WaterDepth: 0,
    waterPatch43OldAddedMass: 0,
    waterPatch43AddedMass: 0,
    waterPatch43EntrainedMass: 0,
    waterPatch43Radiation: 0,
    waterPatch43IntoSurface: 0,
    waterPatch43Push: 0,
    waterPatch43Inertia: 0,
    waterPatch43Projection: 0,
    waterPatch43WettedArea: 0,
    waterPatch43DeckWettedArea: 0,
    waterPatch43AddedMassPerArea: 0,
    waterPatch43RadiationPerArea: 0,
    waterPatch43NuX: 0,
    waterPatch43NuY: 0,
    waterPatch43NuZ: 0,
    waterPatch43ArmCrossNuX: 0,
    waterPatch43ArmCrossNuY: 0,
    waterPatch43ArmCrossNuZ: 0,
    waterPatch43ArmX: 0,
    waterPatch43ArmY: 0,
    waterPatch43ArmZ: 0,
    waterPatch43NormalX: 0,
    waterPatch43NormalY: 0,
    waterPatch43NormalZ: 0,
    waterPatch43PositionX: 0,
    waterPatch43PositionY: 0,
    waterPatch43PositionZ: 0,
    waterPatch43RelativeX: 0,
    waterPatch43RelativeY: 0,
    waterPatch43RelativeZ: 0,
    waterPatch43FlowX: 0,
    waterPatch43FlowY: 0,
    waterPatch43FlowZ: 0,
    waterPatch43SurfaceY: 0,
    waterPatch43SlopeX: 0,
    waterPatch43SlopeZ: 0,
    waterPatch43SampleNormalX: 0,
    waterPatch43SampleNormalY: 0,
    waterPatch43SampleNormalZ: 0,
    waterPatch43WaterDepth: 0,
    waterPatch44OldAddedMass: 0,
    waterPatch44AddedMass: 0,
    waterPatch44EntrainedMass: 0,
    waterPatch44Radiation: 0,
    waterPatch44IntoSurface: 0,
    waterPatch44Push: 0,
    waterPatch44Inertia: 0,
    waterPatch44Projection: 0,
    waterPatch44WettedArea: 0,
    waterPatch44DeckWettedArea: 0,
    waterPatch44AddedMassPerArea: 0,
    waterPatch44RadiationPerArea: 0,
    waterPatch44NuX: 0,
    waterPatch44NuY: 0,
    waterPatch44NuZ: 0,
    waterPatch44ArmCrossNuX: 0,
    waterPatch44ArmCrossNuY: 0,
    waterPatch44ArmCrossNuZ: 0,
    waterPatch44ArmX: 0,
    waterPatch44ArmY: 0,
    waterPatch44ArmZ: 0,
    waterPatch44NormalX: 0,
    waterPatch44NormalY: 0,
    waterPatch44NormalZ: 0,
    waterPatch44PositionX: 0,
    waterPatch44PositionY: 0,
    waterPatch44PositionZ: 0,
    waterPatch44RelativeX: 0,
    waterPatch44RelativeY: 0,
    waterPatch44RelativeZ: 0,
    waterPatch44FlowX: 0,
    waterPatch44FlowY: 0,
    waterPatch44FlowZ: 0,
    waterPatch44SurfaceY: 0,
    waterPatch44SlopeX: 0,
    waterPatch44SlopeZ: 0,
    waterPatch44SampleNormalX: 0,
    waterPatch44SampleNormalY: 0,
    waterPatch44SampleNormalZ: 0,
    waterPatch44WaterDepth: 0,
    waterPatch45OldAddedMass: 0,
    waterPatch45AddedMass: 0,
    waterPatch45EntrainedMass: 0,
    waterPatch45Radiation: 0,
    waterPatch45IntoSurface: 0,
    waterPatch45Push: 0,
    waterPatch45Inertia: 0,
    waterPatch45Projection: 0,
    waterPatch45WettedArea: 0,
    waterPatch45DeckWettedArea: 0,
    waterPatch45AddedMassPerArea: 0,
    waterPatch45RadiationPerArea: 0,
    waterPatch45NuX: 0,
    waterPatch45NuY: 0,
    waterPatch45NuZ: 0,
    waterPatch45ArmCrossNuX: 0,
    waterPatch45ArmCrossNuY: 0,
    waterPatch45ArmCrossNuZ: 0,
    waterPatch45ArmX: 0,
    waterPatch45ArmY: 0,
    waterPatch45ArmZ: 0,
    waterPatch45NormalX: 0,
    waterPatch45NormalY: 0,
    waterPatch45NormalZ: 0,
    waterPatch45PositionX: 0,
    waterPatch45PositionY: 0,
    waterPatch45PositionZ: 0,
    waterPatch45RelativeX: 0,
    waterPatch45RelativeY: 0,
    waterPatch45RelativeZ: 0,
    waterPatch45FlowX: 0,
    waterPatch45FlowY: 0,
    waterPatch45FlowZ: 0,
    waterPatch45SurfaceY: 0,
    waterPatch45SlopeX: 0,
    waterPatch45SlopeZ: 0,
    waterPatch45SampleNormalX: 0,
    waterPatch45SampleNormalY: 0,
    waterPatch45SampleNormalZ: 0,
    waterPatch45WaterDepth: 0,
    waterPatch46OldAddedMass: 0,
    waterPatch46AddedMass: 0,
    waterPatch46EntrainedMass: 0,
    waterPatch46Radiation: 0,
    waterPatch46IntoSurface: 0,
    waterPatch46Push: 0,
    waterPatch46Inertia: 0,
    waterPatch46Projection: 0,
    waterPatch46WettedArea: 0,
    waterPatch46DeckWettedArea: 0,
    waterPatch46AddedMassPerArea: 0,
    waterPatch46RadiationPerArea: 0,
    waterPatch46NuX: 0,
    waterPatch46NuY: 0,
    waterPatch46NuZ: 0,
    waterPatch46ArmCrossNuX: 0,
    waterPatch46ArmCrossNuY: 0,
    waterPatch46ArmCrossNuZ: 0,
    waterPatch46ArmX: 0,
    waterPatch46ArmY: 0,
    waterPatch46ArmZ: 0,
    waterPatch46NormalX: 0,
    waterPatch46NormalY: 0,
    waterPatch46NormalZ: 0,
    waterPatch46PositionX: 0,
    waterPatch46PositionY: 0,
    waterPatch46PositionZ: 0,
    waterPatch46RelativeX: 0,
    waterPatch46RelativeY: 0,
    waterPatch46RelativeZ: 0,
    waterPatch46FlowX: 0,
    waterPatch46FlowY: 0,
    waterPatch46FlowZ: 0,
    waterPatch46SurfaceY: 0,
    waterPatch46SlopeX: 0,
    waterPatch46SlopeZ: 0,
    waterPatch46SampleNormalX: 0,
    waterPatch46SampleNormalY: 0,
    waterPatch46SampleNormalZ: 0,
    waterPatch46WaterDepth: 0,
    waterPatch47OldAddedMass: 0,
    waterPatch47AddedMass: 0,
    waterPatch47EntrainedMass: 0,
    waterPatch47Radiation: 0,
    waterPatch47IntoSurface: 0,
    waterPatch47Push: 0,
    waterPatch47Inertia: 0,
    waterPatch47Projection: 0,
    waterPatch47WettedArea: 0,
    waterPatch47DeckWettedArea: 0,
    waterPatch47AddedMassPerArea: 0,
    waterPatch47RadiationPerArea: 0,
    waterPatch47NuX: 0,
    waterPatch47NuY: 0,
    waterPatch47NuZ: 0,
    waterPatch47ArmCrossNuX: 0,
    waterPatch47ArmCrossNuY: 0,
    waterPatch47ArmCrossNuZ: 0,
    waterPatch47ArmX: 0,
    waterPatch47ArmY: 0,
    waterPatch47ArmZ: 0,
    waterPatch47NormalX: 0,
    waterPatch47NormalY: 0,
    waterPatch47NormalZ: 0,
    waterPatch47PositionX: 0,
    waterPatch47PositionY: 0,
    waterPatch47PositionZ: 0,
    waterPatch47RelativeX: 0,
    waterPatch47RelativeY: 0,
    waterPatch47RelativeZ: 0,
    waterPatch47FlowX: 0,
    waterPatch47FlowY: 0,
    waterPatch47FlowZ: 0,
    waterPatch47SurfaceY: 0,
    waterPatch47SlopeX: 0,
    waterPatch47SlopeZ: 0,
    waterPatch47SampleNormalX: 0,
    waterPatch47SampleNormalY: 0,
    waterPatch47SampleNormalZ: 0,
    waterPatch47WaterDepth: 0,
    /* END observer-only water-patch field defaults */
 };
}

export interface RiderContactSample extends LandingDemandOperands {
  step: number; substep: number; seconds: number; elapsedStepSeconds: number;
  phase: RiderPhase; phaseTime: number; phaseDuration: number; popUpTime: number;
  feasible: boolean; inContact: boolean; flightTime: number; postureError: number;
  limit: ContactLimit;
  recentFlight: number; recentTip: number; recentSlip: number; recentImpact: number;
  legExtension: number; legRate: number; legRest: number;
  demandX: number; demandY: number; demandZ: number;
  projectedX: number; projectedY: number; projectedZ: number;
  appliedX: number; appliedY: number; appliedZ: number;
  peakNormalLoad: number; frontShare: number;
  relativeVelocityX: number; relativeVelocityY: number; relativeVelocityZ: number;
  supportXMin: number; supportXMax: number; supportZMin: number; supportZMax: number;
  copX: number; copZ: number;
}

/** A first, exact `finish` separation branch, latched until the next mount. */
export interface RiderContactLoss {
  trigger: 'flight-time' | 'sway-error' | 'posture-error';
  selectedCause: RiderSeparation;
  /** The actual cause selector, used only by the posture-error branch. */
  dominantLimit: Exclude<ContactLimit, 'none'> | null;
  sample: RiderContactSample;
}

/** Fixed-size diagnostic state; no trajectory history, additional queries, or physics inputs. */
export interface RiderContactDiagnostics {
  mount: number; step: number; substeps: number; elapsedStepSeconds: number;
  limitedSubsteps: number; nonContactSubsteps: number;
  maxFlightTime: number; recoverableError: number;
  last: RiderContactSample | null;
  firstLimited: RiderContactSample | null;
  firstNonContact: RiderContactSample | null;
  loss: RiderContactLoss | null;
  meanForceX: number; meanForceY: number; meanForceZ: number;
  peakNormalLoad: number; landingPeak: number; landingFrontShare: number;
}

function contactSample(): RiderContactSample {
  return {
    ...landingDemandOperands(),
    step: 0, substep: 0, seconds: 0, elapsedStepSeconds: 0,
    phase: 'prone', phaseTime: 0, phaseDuration: 0, popUpTime: 0,
    feasible: true, inContact: true, flightTime: 0, postureError: 0, limit: 'none',
    recentFlight: 0, recentTip: 0, recentSlip: 0, recentImpact: 0,
    legExtension: 0, legRate: 0, legRest: 0,
    demandX: 0, demandY: 0, demandZ: 0, projectedX: 0, projectedY: 0, projectedZ: 0,
    appliedX: 0, appliedY: 0, appliedZ: 0, peakNormalLoad: 0, frontShare: 0,
    relativeVelocityX: 0, relativeVelocityY: 0, relativeVelocityZ: 0,
    supportXMin: 0, supportXMax: 0, supportZMin: 0, supportZMax: 0, copX: 0, copZ: 0,
  };
}

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
  /** Done by the compressed turn's assist (COMPRESS_PULL), a gameplay rule's. */
  assist: number;
  /** Done by the carve's carry (CARVE_CARRY), a gameplay rule's. */
  carry: number;
  /** Done by the rail change's lean-out pull (LEAN_OUT_PULL), a gameplay rule's. */
  leanOut: number;
}

type V3 = { x: number; y: number; z: number };

const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);
const Z = new Vector3(0, 0, 1);

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
  /** Regular or Goofy; changed only between rides (a retry, a placement, or off the board), never mid-ride. */
  stance: StanceName;
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
  /** The body's frame: the board's while lying on it, on the board's heading and banked while standing. */
  readonly orientation = new Quaternion();
  /** On the board; false once separated. */
  attached = true;
  separation?: RiderSeparation;
  /** Held by the contact this substep; false while tipping, slipping or airborne. */
  inContact = true;
  flightTime = 0;
  /** Distance of the centre of mass from where the posture puts it, m. */
  postureError = 0;
  readonly work: RiderWork = { gravity: 0, water: 0, contact: 0, lip: 0, assist: 0, carry: 0, leanOut: 0 };
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
  /** Lying down, the Duck-dive input: 0 to 1. */
  duckDive = 0;
  /** The duck-dive's progress: the arms' press and the knee on the tail (0–1 each), and how long it has been held, s. */
  readonly duck = { press: 0, knee: 0, held: 0 };
  /** The press's and the knee's paths, and their rates. */
  private readonly pressTrack = new MinimumJerkTrack();
  private readonly kneeTrack = new MinimumJerkTrack();
  /** The duck-dive postures, and the centre of mass each moves by (press from prone, knee from press), board frame. */
  /** The duck-dive postures for each stance (the stance changes between rides), with the support and each stage's centre-of-mass move. */
  private readonly ducks: Record<StanceName, { press: Float64Array; knee: Float64Array; support: SupportRegion; shiftPress: Vector3; shiftKnee: Vector3 }>;
  /** Standing, weight along the board: −1 (back, on the tail) to 1 (forward). */
  trim = 0;
  /** Standing, how deep the crouch: 0 (riding stance) to 1 (deepest). */
  crouch = 0;
  /** Standing, Compress: 0 (none) to 1 (full depth; the weight stays the trim's), taken alone or over the crouch. */
  compress = 0;
  /** Standing, the upper body's rotation asked for (`RideInput.rotate`), −1 to 1 toward the board's +x; NaN when none is (the body turns with the ride). */
  rotate = Number.NaN;
  /** Standing, the wave-side hand reaches for the water. */
  hand = false;
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
  /** The curl's water over a part in the tube's air (the swept barrel, Part B, PR 4). */
  private readonly lipSample = createWaterSample();
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
  protected feasible = true;
  private limit: ContactLimit = 'none';
  /** Recent time each limit bound the contact (decaying over CAUSE_MEMORY), to name a separation's cause. */
  private readonly limitTime: Record<Exclude<ContactLimit, 'none'>, number> = { flight: 0, tip: 0, slip: 0, impact: 0 };
  // Fixed records belong only to observation. No solver or input path reads them.
  private contactMount = 0;
  private contactStep = 0;
  private contactSubsteps = 0;
  private contactElapsed = 0;
  private contactLimited = 0;
  private contactNonContact = 0;
  private readonly contactLast = contactSample();
  private readonly contactFirstLimited = contactSample();
  private readonly contactFirstNonContact = contactSample();
  private readonly contactLossSample = contactSample();
  private contactLoss?: { trigger: RiderContactLoss['trigger']; selectedCause: RiderSeparation; dominantLimit: RiderContactLoss['dominantLimit'] };
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
  /**
   * Standing, the leg (spec P9): the centre of mass's extension along the leg from
   * the posture's place, m, and its rate relative to the board, m/s; the extension
   * it rests at (a crouch shortens it); and its force on the rider along the leg, N.
   */
  readonly leg = { extension: 0, rate: 0, rest: 0, force: 0, height: 0 };
  /** Standing, the heading the rider holds (rad from +z toward +x) when no lean is asked for, and its own lean for it now. */
  standingLine: number | undefined;
  private standingHold = 0;
  private holdRate = 0;
  private legStiffness = LEG_STIFFNESS;
  /** Standing, the side the hand reaches for (+1 the board's +x side, −1 the other, 0 none), where it is, and the moment of its drag about the body's vertical this substep, N m. */
  private handSide = 0;
  readonly handPoint = new Vector3();
  private handYaw = 0;
  private restRate = 0;
  /** Standing, the leg's rest rising toward a shallower crouch asked for: a crouch or Compress released (the projection). */
  private extending = false;

  private legFresh = true;
  private legDamping = 0;
  /** Gravity plus the stance's acceleration, low-passed (world), and the stance's velocity at the latest substep. */
  private readonly specificForce = new Vector3();
  private readonly stanceVelocity = new Vector3();
  /** The load the leg holds, N, and the leg's rate after the latest solve, m/s. */
  private readonly landingDemand = landingDemandOperands();
  private legLoad = 0;
  private legRateAfter = 0;
  /**
   * Standing, how far from a fall, 0 to 1 (spec P9): the least of how near the
   * centre of pressure is to the support's edges across and along, and how near
   * the push across the deck is to the feet's grip, smoothed over MARGIN_TIME.
   * 1 in any other phase. The drawn arms spread as it shrinks.
   */
  balanceMargin = 1;
  private rawMargin = 1;
  /**
   * Standing, the body's bank on its ankles (the turn redesign): its angle from
   * the vertical toward the board's +x side, rad, and its rate, rad/s; 0 in any
   * other phase. The body's frame standing (the heading, banked), the line across
   * the leg toward more bank, and the board's roll axis along the heading.
   */
  readonly bank = { angle: 0, rate: 0 };
  /** Standing, the upper body's swing about the forward axis against the body, rad and rad/s (the turn redesign). */
  readonly swing = { angle: 0, rate: 0 };
  /** Standing, the upper body's twist about the leg (TWIST_RANGE), rad, positive toward the board's +x (its left), and its rate. */
  readonly twist = { angle: 0, rate: 0 };
  private readonly bodyFrame = new Quaternion();
  private readonly bankTurn = new Quaternion();
  private readonly swingTurn = new Quaternion();
  private readonly swingAxis = new Vector3();
  private readonly swingPivot = new Vector3();
  private readonly across = new Vector3();
  private readonly rollAxis = new Vector3();
  /**
   * The body's speed across the leg relative to the feet, m/s, and after the
   * latest solve; the leg's length, m; the bank asked for, eased in, rad; the
   * ankle's rest the balance sets, rad, and its torque with the bank's current
   * rate, N·m.
   */
  private bankSpeed = 0;
  private bankSpeedAfter = 0;
  private legLength = 1;
  private bankReference = 0;
  /** The board planes (PLANING_SPEED, PLANING_DROP); the body banks, from planing until it is upright again off the plane. */
  private planing = false;
  private banked = false;
  private ankleRest = 0;
  private ankleTorque = 0;
  protected swingTorque = 0;
  /** The hips' torque on the upper body's twist, N·m about the leg; the board takes its reaction through the feet. */
  private twistTorque = 0;
  /** The compressed turn's assist on the body, N (world): COMPRESS_PULL. */
  private readonly assistForce = new Vector3();
  /** The carve's carry on the body, N (world): CARVE_CARRY. */
  private readonly carryForce = new Vector3();
  /** The rail change's lean-out pull on the body, N (world): LEAN_OUT_PULL. */
  private readonly leanOutForce = new Vector3();

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
    const ducks = (stance: StanceName) => {
      const press = duckPose(shape, 'duckPress', stance);
      const knee = duckPose(shape, 'duckKnee', stance);
      const prone = postureCenter(riderPose(shape, 'prone', stance).parts, this.partMasses);
      const pressed = postureCenter(press.parts, this.partMasses);
      const kneeling = postureCenter(knee.parts, this.partMasses);
      return {
        press: press.parts, knee: knee.parts, support: press.support,
        shiftPress: new Vector3(pressed.x - prone.x, pressed.y - prone.y, pressed.z - prone.z),
        shiftKnee: new Vector3(kneeling.x - pressed.x, kneeling.y - pressed.y, kneeling.z - pressed.z),
      };
    };
    this.ducks = { regular: ducks('regular'), goofy: ducks('goofy') };
  }

  /** +1 regular (left foot forward), −1 goofy. */
  /**
   * Standing on a planing board, the body banks on its ankles (the turn
   * redesign). Landing from a pop-up, and standing below planing, it is carried
   * upright over its stance, keeping the load clear of the feet's edges across
   * as along (LATERAL_FREEDOM), as before the bank.
   */
  private get banking(): boolean {
    return this.upright && this.phase === 'standing' && this.banked;
  }

  get stanceSign(): number {
    return this.stance === 'regular' ? 1 : -1;
  }

  /**
   * Start a pop-up from prone: the hands push the chest up, then the feet come
   * down onto the stance. It stands only if the board still carries the rider
   * then; otherwise the rider lies back down.
   */
  popUp(): boolean {
    if (!this.attached || this.phase !== 'prone' || this.duck.press > DUCK_BUSY) return false;
    this.beginTransition('push', PUSH_TIME);
    this.popUpTime = 0;
    Object.assign(this.popUpReport, { outcome: 'rising', duration: 0, landingPeak: 0, frontShare: 0, refusal: undefined });
    return true;
  }

  /** Lie back down from standing, when the player asks: the body goes back to the prone posture over RECOVER_TIME. */
  lieDown(board: BoardBody): boolean {
    if (!this.attached || this.phase !== 'standing') return false;
    this.beginTransition('recover', RECOVER_TIME, board);
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
    if (board && this.upright && !upright) {
      // Leaving the leg, the body starts from where it is along it, not from the posture's place.
      for (let i = 0; i < RIDER_PARTS.length; i += 1) this.fromParts[i * 3 + 1] += this.leg.extension;
    }
    if (board && upright !== this.upright) this.remap(this.fromParts, upright, board);
    if (upright && !this.upright) this.legFresh = true;
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
      // The rider stands whatever the board can carry (the playtest: laid back down on its own, it seemed a
      // fault); a stand without support is noted, and the physics decides what follows.
      this.popUpReport.refusal = this.standRefusal(board, water);
      this.beginTransition('standing', SETTLE_TIME, board);
      this.popUpReport.outcome = 'stood';
      this.popUpReport.duration = this.popUpTime;
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
    // Entering upright uses the destination's current heading. While lying down,
    // bodyFrame can still be identity or an older mount's frame. Leaving upright
    // uses its actual body frame, including bank, to preserve the world points.
    const inverseFrame = this.spin.copy(toUpright ? this.heading : this.bodyFrame).invert();
    const baseWorld = board.toWorld(this.base, this.baseWorld);
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      const part = this.localScratch.set(parts[i * 3], parts[i * 3 + 1], parts[i * 3 + 2]);
      let world: Vector3;
      if (toUpright) {
        world = board.toWorld(part, this.scratch);
        part.subVectors(world, baseWorld).applyQuaternion(inverseFrame).add(this.base);
      } else {
        world = this.scratch.subVectors(part, this.base).applyQuaternion(this.bodyFrame).add(baseWorld);
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
      // A foot in the curl's water, with air beneath it, is struck by the lip, not sunk (the advisor's ruling 4).
      if (sample.waterFloorY === undefined && sample.surfaceY - this.footWorld.y > FEET_DEPTH) return 'feet under water';
    }
    return undefined;
  }

  /** Put the rider in its posture on the board, moving with it. */
  mount(board: BoardBody): void {
    this.contactMount++;
    this.contactStep = this.contactSubsteps = this.contactElapsed = 0;
    this.contactLimited = this.contactNonContact = 0;
    this.contactLoss = undefined;
    this.duck.press = 0;
    this.duck.knee = 0;
    this.duck.held = 0;
    this.pressTrack.reset();
    this.kneeTrack.reset();
    this.balance.set(0, 0, 0);
    this.balanceRate.set(0, 0, 0);
    // A new mount starts from the neutral stance, whatever the body was doing before (a relaunch mid-carve).
    this.lean.set(0, 0, 0);
    this.leanRate.set(0, 0, 0);
    this.updatePosture();
    this.desiredCop.x = (this.support.xMin + this.support.xMax) / 2;
    this.desiredCop.z = (this.support.zMin + this.support.zMax) / 2;
    this.smoothedCop.x = this.desiredCop.x;
    this.smoothedCop.z = this.desiredCop.z;
    this.updateInertia(board);
    this.flex = 0;
    this.flexRate = 0;
    this.bank.angle = 0;
    this.bank.rate = 0;
    this.bankSpeed = 0;
    this.bankSpeedAfter = 0;
    this.bankReference = 0;
    this.planing = false;
    this.banked = false;
    this.ankleRest = 0;
    this.ankleTorque = 0;
    this.swingTorque = 0;
    this.swing.angle = 0;
    this.swing.rate = 0;
    this.resetTwist();
    this.frame(board, false);
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
    this.work.assist = 0;
    this.work.carry = 0;
    this.work.leanOut = 0;
    this.struckBy.clear();
    this.lastLipImpulse.set(0, 0, 0);
    this.sway.set(0, 0, 0);
    this.swayRate.set(0, 0, 0);
    this.legFresh = true;
    this.leg.extension = 0;
    this.leg.rate = 0;
    this.leg.rest = 0;
    this.restRate = 0;
    this.extending = false;
    this.legRateAfter = 0;
    this.balanceMargin = 1;
    this.rawMargin = 1;
    this.standingLine = undefined;
    this.standingHold = 0;
    this.markParts();
  }

  /**
   * How far the rider is from letting go, for the balance meter (plan P8).
   * Standing, it is the leg's balance margin (P9): how near the feet's pressure is
   * to their edges and their grip. The body's sway off its stance, which P8 read,
   * barely moved while the feet were close to tipping. Otherwise 1 in the
   * posture, 0 when the posture error reaches RECOVERABLE_ERROR, the separation
   * threshold in `endStep`.
   */
  get balanceReserve(): number {
    if (this.upright) return this.balanceMargin;
    return Math.max(0, 1 - this.postureError / RECOVERABLE_ERROR);
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
    if (index < 3) return this.swung(index, this.partPosition(index, out), SWING_DRAWN_CHEST);
    const upright = this.phase === 'landing' || this.phase === 'standing';
    if (index === 3 || index === 4) {
      const side = index === 3 ? 0 : 1;
      if (this.phase === 'prone') {
        const stroking = (this.paddle || this.sweeping) && this.strokeEffort(side) > 0;
        // Ducking, the hands hold the rails where the arms reach; otherwise beside the chest.
        const reach = this.duck.press > DUCK_BUSY ? this.parts[index * 3 + 2] + 0.15 * this.duck.press : this.parts[1 * 3 + 2];
        const z = stroking ? this.handLocal(side, this.localScratch) : this.localScratch.set(0, 0, reach).z;
        if (!stroking) this.localScratch.set((side === 0 ? 1 : -1) * (this.halfWidth(z) + 0.02), deckHeight(this.shape, z) + 0.02, z);
        return board.toWorld(this.localScratch, out);
      }
      if (this.phase === 'push') {
        const z = this.parts[1 * 3 + 2];
        return board.toWorld(this.localScratch.set((side === 0 ? 1 : -1) * this.halfWidth(z), deckHeight(this.shape, z), z), out);
      }
      // The hand in the face, or arms held out from the shoulders.
      if (this.handSide !== 0 && (index === 3) === (this.handSide > 0)) return out.copy(this.handPoint);
      this.partPosition(index, out);
      const spread = upright ? ARM_SPREAD + ARM_ALARM * (1 - this.balanceMargin) : ARM_SPREAD;
      out.add(this.scratch2.copy(out).sub(this.partPosition(1, this.target)).multiplyScalar(spread));
      return this.swung(index, out, SWING_DRAWN_CHEST);
    }
    if (upright) {
      const front = (index === 5) === (this.stance === 'regular');
      const z = front ? this.feet.front : this.feet.rear;
      return board.toWorld(this.localScratch.set(0, deckHeight(this.shape, z), z), out);
    }
    // Ducking, the back leg's knee is on the tail: its foot lies on the deck behind it (the wipeout spec),
    // blended in from the trailing leg as the knee lands.
    const back = this.stance === 'regular' ? 6 : 5;
    if (index === back && this.phase === 'prone' && this.duck.knee > DUCK_BUSY) {
      const footZ = Math.max(-this.shape.length / 2 + 0.02, this.parts[index * 3 + 2] - 0.55);
      board.toWorld(this.footWorld.set(this.parts[index * 3], deckHeight(this.shape, footZ) + 0.04, footZ), this.footWorld);
      this.partPosition(index, out);
      out.add(this.scratch2.copy(out).sub(this.partPosition(0, this.target)).multiplyScalar(0.9));
      return out.lerp(this.footWorld, Math.min(1, this.duck.knee));
    }
    // Legs lying along the board: from the hips through the leg's centre to the feet.
    this.partPosition(index, out);
    return out.add(this.scratch2.copy(out).sub(this.partPosition(0, this.target)).multiplyScalar(0.9));
  }

  /**
   * A drawn point of the upper body turned with the swing: about the forward axis
   * through the pelvis by `share` of it (standing only; the swing is 0 otherwise).
   */
  private swung(index: number, out: Vector3, share: number): Vector3 {
    if (index === 0 || this.phase !== 'standing' || this.swing.angle === 0) return out;
    const pelvis = this.partPosition(0, this.swingPivot);
    this.swingTurn.setFromAxisAngle(this.swingAxis.set(0, 0, 1).applyQuaternion(this.heading), share * this.swing.angle);
    return out.sub(pelvis).applyQuaternion(this.swingTurn).add(pelvis);
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
    let swing = 0;
    let along = 0;
    if (phase < PULL_SHARE) {
      const s = phase / PULL_SHARE;
      z = REACH + ((HIP - REACH) * (1 - Math.cos(Math.PI * s))) / 2;
      height = -HAND_DEPTH;
      along = ((HIP - REACH) * Math.PI * Math.sin(Math.PI * s)) / (2 * PULL_SHARE * ARM_CYCLE);
    } else {
      // Out of the water at the hip, over it and out, and back in at the reach, rising and settling with no speed at
      // either end, so the drawn hand neither jumps nor jerks (the riding-body plan, step 8).
      const s = (phase - PULL_SHARE) / (1 - PULL_SHARE);
      z = HIP + ((REACH - HIP) * (1 - Math.cos(Math.PI * s))) / 2;
      const arc = (1 - Math.cos(2 * Math.PI * s)) / 2;
      height = -HAND_DEPTH + (HAND_DEPTH + RECOVERY_HEIGHT) * arc;
      swing = RECOVERY_SWING * arc;
    }
    out.set((side === 0 ? 1 : -1) * (this.halfWidth(z) + HAND_OUTSIDE_RAIL + swing), deckHeight(this.shape, z) + height, z);
    return along;
  }

  /** A part's centre in the world. */
  partPosition(index: number, out: Vector3): Vector3 {
    this.localScratch.set(this.parts[index * 3], this.parts[index * 3 + 1], this.parts[index * 3 + 2]).sub(this.localCenter);
    return out.copy(this.localScratch).applyQuaternion(this.orientation).add(this.position).addScaledVector(this.up, this.legFold(index));
  }

  /**
   * Standing on a compressed or crouched leg, the legs fold rather than sink: the
   * feet stay on the deck, so a leg's middle drops half as far as the hips. The
   * body's parts otherwise move with its centre of mass.
   */
  private legFold(part: number): number {
    if (!this.upright || this.shifts(part)) return 0;
    return -this.leg.extension / 2;
  }

  /** Called by the board at the start of each step. */
  beginStep(): void {
    this.contactStep++;
    this.contactSubsteps = this.contactElapsed = 0;
    this.contactLimited = this.contactNonContact = 0;
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
    // Availability only; stale numeric copies are ignored until this substep reaches settleStanding.
    this.landingDemand.standingTrialAvailable = 0;
    this.advancePhase(h, board, water);
    this.duckStep(h);
    this.planingStep(board, water);
    this.holdLine(h, board);
    this.waveSide(board, water);
    this.balanceStep(h, board);
    this.swayStep(h);
    this.updatePosture();
    this.updateInertia(board);
    this.boardVelocity.copy(board.velocity);
    this.boardSpin.copy(board.angularVelocity);
    this.arm.subVectors(this.position, board.centerOfMass);
    this.frame(board);
    // Back from the air, the knees take up the approach speed along the body's up (standing, the leg does).
    if (!this.inContact && !this.upright) {
      board.velocityAt(this.upright ? board.toWorld(this.base, this.scratch) : this.target, this.scratch2);
      const approach = this.scratch.subVectors(this.velocity, this.scratch2).dot(this.up);
      if (this.scratch.subVectors(this.position, this.target).dot(this.up) <= 0.02 && approach < 0) this.flexRate = approach;
    }
    if (this.upright) {
      this.flex = 0;
      this.flexRate = 0;
    } else {
      this.flexStep(h);
    }
    this.frame(board);
    // The solve carries the centre of mass rigidly with the board (a symmetric coupling). Carried at
    // the stance point while pushing through the centre of mass instead, the coupled system turned
    // singular as a carve changed its geometry, and the solve blew up. Standing, it is carried where
    // it is along the leg and across it.
    this.carried.subVectors(this.target, board.centerOfMass);
    if (this.upright) {
      const off = this.scratch.subVectors(this.position, this.target);
      this.carried.addScaledVector(this.up, off.dot(this.up));
      if (this.banking) this.carried.addScaledVector(this.across, off.dot(this.across));
    }
    // Drive: keeping the body's bank as the board rolls and pitches under the feet, the knees' flex, and a
    // bounded correction toward the posture.
    this.uprightVelocity(board, this.drive.set(0, 0, 0)).addScaledVector(this.up, this.flexRate);
    // The balance shift moves the centre of mass across the board.
    const shifted = this.shiftedShare();
    this.drive.add(this.scratch.set((this.balanceRate.x + this.leanRate.x) * shifted, 0, this.balanceRate.z * shifted).applyQuaternion(this.upright ? this.bodyFrame : board.orientation));
    // A push's sway carries the centre of mass off its feet.
    if (this.upright) this.drive.add(this.scratch.set(this.swayRate.x, 0, this.swayRate.z).applyQuaternion(board.orientation));
    // The posture's own motion (a pop-up) carries the centre of mass with it.
    this.drive.add(this.scratch.copy(this.postureRate).applyQuaternion(this.upright ? this.bodyFrame : board.orientation));
    const error = this.scratch.subVectors(this.target, this.position);
    // Standing, the leg holds the height and the ankles the bank; the correction only brings the body back along the board.
    if (this.upright) error.addScaledVector(this.up, -error.dot(this.up));
    if (this.banking) error.addScaledVector(this.across, -error.dot(this.across));
    const correction = Math.min(MAX_CORRECTION, (CORRECTION * error.length()) / h);
    if (error.lengthSq() > 0) this.drive.addScaledVector(error.normalize(), correction);
    this.gravity.set(0, -this.mass * WATER.gravity, 0);
    this.waterForces(h, board, water);
    this.compressAssist(board);
    this.external.copy(this.gravity).add(this.waterForce).add(this.assistForce).add(this.carryForce).add(this.leanOutForce);
    if (this.upright) {
      this.prepareLeg(h, board, water);
      this.twistStep(h);
      if (this.banking) {
        this.prepareBank(h, board);
      } else {
        // Landing: carried upright, the bank's unknown held at nothing.
        this.bank.rate = 0;
        this.bankSpeed = 0;
        this.ankleTorque = 0;
        this.swingTorque = 0;
        this.swing.angle = 0;
        this.swing.rate = 0;
      }
    }
  }

  /** Whether the board planes: its speed through the water under it, over PLANING_SPEED and until under PLANING_DROP. */
  private planingStep(board: BoardBody, water: SurfWater): void {
    const under = water.sampleAt(board.position.x, board.position.y, board.position.z, this.sample);
    const flowX = under.outsideDomain ? 0 : under.flowX;
    const flowZ = under.outsideDomain ? 0 : under.flowZ;
    const speed = Math.hypot(board.velocity.x - flowX, board.velocity.z - flowZ);
    if (this.planing ? speed < PLANING_DROP : speed > PLANING_SPEED) this.planing = !this.planing;
    if (this.planing) this.banked = true;
    else if (Math.abs(this.bank.angle) < UPRIGHT_BANK && Math.abs(this.bank.rate) < UPRIGHT_RATE) this.banked = false;
  }

  /**
   * Standing: the bank's rate, the balance's ankle rest and the ankle's torque
   * before the board's solve (the turn redesign). The rest is taken from the
   * body's line, not the water's: the planing board rights about the rider's
   * load line (the carve lab's plant), and a rest that laid it flat on a face
   * across the heading held the feet at their edges against the hull.
   */
  private prepareBank(h: number, board: BoardBody): void {
    this.legLength = Math.max(0.4, this.leg.height + this.leg.extension);
    const carried = cross(this.boardSpin, this.carried, this.scratch2).add(this.boardVelocity).add(this.drive);
    this.bankSpeed = this.localScratch.subVectors(this.velocity, carried).dot(this.across);
    this.bank.rate = this.bankSpeed / this.legLength;
    // The board's roll about the heading, positive with the +x rail down.
    const side = this.scratch.set(1, 0, 0).applyQuaternion(this.heading);
    const boardUp = this.scratch2.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y);
    this.rollAxis.set(0, 0, -1).applyQuaternion(this.heading);
    const rollRate = this.rollAxis.dot(this.boardSpin);
    // The bank asked for, no more than a turn at the board's speed can hold, eased in.
    const speed = this.boardVelocity.dot(this.localScratch.set(0, 0, 1).applyQuaternion(this.heading));
    const most = this.planing ? Math.min(MAX_BANK, Math.atan((speed * speed) / (WATER.gravity * TURN_RADIUS))) : 0;
    const asked = Math.max(-most, Math.min(most, this.steer * RAIL_RANGE + (this.standingHold + HAND_BEND * this.handBend) * HOLD_BANK));
    const toward = (asked - this.bankReference) * (1 - Math.exp(-h / REFERENCE_TIME));
    this.bankReference += Math.max(-REFERENCE_RATE * h, Math.min(REFERENCE_RATE * h, toward));
    // The rest the balance wants, within what the feet can give; the upper body swings for the rest of it.
    const wanted = BANK_GAIN * (this.bankReference - this.bank.angle) - BANK_RATE_GAIN * this.bank.rate;
    // Past the rail's bite the feet no longer roll the board further onto it.
    const room = ANKLE_REST_RANGE * Math.max(0, 1 - Math.max(0, Math.abs(roll) - RAIL_BITE) / RAIL_EASE);
    const reach = roll > 0 ? Math.max(-room, Math.min(ANKLE_REST_RANGE, wanted)) : Math.max(-ANKLE_REST_RANGE, Math.min(room, wanted));
    // Steering into a lean the body lags, the feet never roll the board away from it: the upper body throws the lean.
    const asking = Math.abs(this.steer) > STEER_DEADBAND && Math.abs(this.bankReference) > UPRIGHT_BANK ? Math.sign(this.bankReference) : 0;
    const lagging = Math.abs(this.bankReference - this.bank.angle) > ANKLE_REST_RANGE / BANK_GAIN;
    // The projection: extending out of a crouch or Compress with no lean asked for, the feet hold the board neutral.
    const projecting = this.extending && this.planing && Math.abs(this.steer) <= STEER_DEADBAND && !this.hand
      && Math.abs(this.bank.angle) > UPRIGHT_BANK;
    const lean = projecting ? 0 : reach * asking > 0 && lagging ? 0 : reach;
    this.swingStep(h, wanted - lean);
    this.ankleRest += (lean - this.ankleRest) * (1 - Math.exp(-h / BALANCE_LAG));
    // Backward Euler on the ankle: over the substep the bank and the roll move at their rates after the solve.
    this.ankleTorque = ANKLE_STIFFNESS * (this.bank.angle - roll - this.ankleRest) + (ANKLE_STIFFNESS * h + ANKLE_DAMPING) * (this.bank.rate - rollRate);
  }

  /**
   * The upper body's swing: `unmet` is the rest the balance wanted beyond the
   * feet's range, rad. The hips turn the upper body against it, a burst it can
   * give only while the swing could still be braked inside its range (a rotor
   * holds no steady torque); the swing comes back only once the feet can carry
   * the body alone, and stops hard at its range.
   */
  private swingStep(h: number, unmet: number): void {
    let burst = Math.max(-SWING_TORQUE, Math.min(SWING_TORQUE, -SWING_SERIES * unmet));
    // The upper body turns the other way to the body (its acceleration is −burst / inertia).
    const outward = -burst * (this.swing.angle !== 0 ? Math.sign(this.swing.angle) : -Math.sign(burst)) > 0;
    const braking = (this.swing.rate * Math.abs(this.swing.rate) * SWING_INERTIA) / (2 * SWING_TORQUE);
    if (outward && Math.abs(this.swing.angle + braking) >= SWING_RANGE) burst = 0;
    const back = Math.max(0, 1 - Math.abs(unmet) / SWING_RELEASE);
    this.swingTorque = burst + SWING_INERTIA * SWING_FREQUENCY * (back * SWING_FREQUENCY * this.swing.angle + 2 * this.swing.rate);
    this.swing.rate -= (h * this.swingTorque) / SWING_INERTIA;
    this.swing.angle += h * this.swing.rate;
    if (Math.abs(this.swing.angle) > SWING_RANGE) {
      this.swing.angle = Math.sign(this.swing.angle) * SWING_RANGE;
      if (this.swing.rate * this.swing.angle > 0) this.swing.rate = 0;
    }
  }

  /**
   * The upper body's twist (TWIST_RANGE): toward the rotation asked for while standing, back to rest otherwise, with
   * the hips' torque no more than they give and the feet's grip holds.
   */
  private twistStep(h: number): void {
    const asked = this.phase === 'standing' && !Number.isNaN(this.rotate) ? Math.max(-1, Math.min(1, this.rotate)) * TWIST_RANGE : 0;
    const most = Math.min(TWIST_TORQUE, FOOT_FRICTION * this.legLoad * TWIST_GRIP_RADIUS);
    const wanted = TWIST_INERTIA * (TWIST_FREQUENCY * TWIST_FREQUENCY * (asked - this.twist.angle) - 2 * TWIST_FREQUENCY * this.twist.rate);
    this.twistTorque = Math.max(-most, Math.min(most, wanted));
    this.twist.rate += (h * this.twistTorque) / TWIST_INERTIA;
    this.twist.angle += h * this.twist.rate;
    if (Math.abs(this.twist.angle) > TWIST_RANGE) {
      this.twist.angle = Math.sign(this.twist.angle) * TWIST_RANGE;
      if (this.twist.rate * this.twist.angle > 0) this.twist.rate = 0;
    }
  }

  /**
   * COMPRESS_PULL: compressing into a turn, planing, the body is pulled in across the board's path by the lean asked
   * for; CARVE_CARRY pushes it along the path; LEAN_OUT_PULL pulls a body still leaning the other way toward the new rail.
   */
  private compressAssist(board: BoardBody): void {
    this.assistForce.set(0, 0, 0);
    this.carryForce.set(0, 0, 0);
    this.leanOutForce.set(0, 0, 0);
    // Compress keeps its pumping-stance activation; a deeper manual tuck does not disable a pressed turn control.
    const crouch = CROUCH_SHARE * Math.max(0, Math.min(1, this.crouch));
    const compress = Math.max(0, Math.min(1, this.compress));
    if (!this.upright || !this.banking || !this.planing || compress <= crouch || Math.abs(this.steer) <= STEER_DEADBAND) return;
    const along = this.scratch.set(board.velocity.x, 0, board.velocity.z);
    if (along.lengthSq() < 1e-6) return;
    const speed = along.length();
    along.divideScalar(speed);
    // Toward the lean's side of the path: the board's +x is its left, and the left of a path along v is up × v.
    const lean = Math.min(Math.abs(this.bankReference), MAX_BANK);
    const past = Math.max(0, this.bank.angle * Math.sign(this.bankReference) - lean);
    const speedFade = Math.min(1, Math.max(0, (speed - PLANING_DROP) / (PULL_FULL_SPEED - PLANING_DROP)));
    const fade = Math.max(0, 1 - past / PULL_OVERLEAN) * speedFade;
    this.assistForce.crossVectors(Y, along)
      .multiplyScalar(Math.sign(this.bankReference) * fade * compress * COMPRESS_PULL * this.mass * WATER.gravity * Math.tan(lean));
    // CARVE_CARRY: along the path, by the pull the body's own bank balances.
    this.carryForce.copy(along).multiplyScalar(compress * CARVE_CARRY * this.mass * WATER.gravity * Math.tan(Math.min(Math.abs(this.bank.angle), MAX_BANK)));
    // LEAN_OUT_PULL: toward the steer's side of the path while the body still leans the other way, until it is upright.
    const side = Math.sign(this.steer);
    if (-this.bank.angle * side > UPRIGHT_BANK) {
      this.leanOutForce.crossVectors(Y, along)
        .multiplyScalar(side * Math.min(1, Math.abs(this.steer)) * speedFade * compress * LEAN_OUT_PULL * this.mass * WATER.gravity);
    }
  }

  private resetTwist(): void {
    this.twist.angle = 0;
    this.twist.rate = 0;
    this.twistTorque = 0;
  }

  /** Standing: the leg's state and load before the board's solve. */
  private prepareLeg(h: number, board: BoardBody, water: SurfWater): void {
    const stance = board.velocityAt(this.baseWorld, this.localScratch);
    if (this.legFresh) {
      // A fresh leg holds the rider's weight if the board is in the water, and nothing if it is in the
      // air: dropped with its board, it must not kick the light board away.
      this.legFresh = false;
      this.stanceVelocity.copy(stance);
      const under = water.sampleAt(board.position.x, board.position.y, board.position.z, this.sample);
      const floating = under.wet && !under.outsideDomain && board.lowestPoint() < under.surfaceY;
      this.specificForce.set(0, floating ? WATER.gravity : 0, 0);
    }
    const blend = 1 - Math.exp(-h / SPECIFIC_FORCE_TIME);
    this.specificForce.x += ((stance.x - this.stanceVelocity.x) / h - this.specificForce.x) * blend;
    this.specificForce.y += ((stance.y - this.stanceVelocity.y) / h + WATER.gravity - this.specificForce.y) * blend;
    this.specificForce.z += ((stance.z - this.stanceVelocity.z) / h - this.specificForce.z) * blend;
    this.stanceVelocity.copy(stance);
    this.legLoad = this.mass * Math.max(0, this.specificForce.dot(this.up));
    // The crouch: a shorter leg, reached no faster than the legs can move, and softer.
    // Critically damped, and going down no harder than keeps the feet loaded: a sudden drop of the leg would
    // have to pull the body down, and unloaded feet lose their grip.
    const crouch = manualCrouchShare(this.crouch, this.compress);
    const compress = Math.max(0, Math.min(1, this.compress));
    const rest = -Math.max(crouch, compress) * CROUCH_DEPTH;
    const down = rest < this.leg.rest;
    const compressing = compress > CROUCH_SHARE * Math.max(0, Math.min(1, this.crouch));
    const accelerationLimit = !down ? EXTEND_ACCELERATION
      : compressing ? Math.max(CROUCH_ACCELERATION, this.legLoad / this.mass - COMPRESS_KEEP * WATER.gravity) : CROUCH_ACCELERATION;
    const speedLimit = down ? CROUCH_SPEED : MAX_LEG_SPEED;
    // While the feet brake the body's bank near their edges, the crouch's legs hold rather than drop (CROUCH_HOLD).
    const hold = this.banking && !compressing
      ? Math.max(0, Math.min(1, (Math.abs(this.ankleRest) / ANKLE_REST_RANGE - CROUCH_HOLD) / (1 - CROUCH_HOLD))) : 0;
    const acceleration = Math.max(-accelerationLimit * (1 - hold), Math.min(accelerationLimit,
      LEG_FREQUENCY * LEG_FREQUENCY * (rest - this.leg.rest) - 2 * LEG_FREQUENCY * this.restRate));
    this.restRate = Math.max(-speedLimit * (1 - hold), Math.min(speedLimit, this.restRate + acceleration * h));
    // Compress keeps its old stop; a deeper manual target opens more travel. A released tuck
    // retains its current travel limit while extending, so release cannot snap the body up.
    const deepest = Math.max(-this.leg.rest, CROUCH_DEPTH, -rest);
    this.leg.rest = Math.max(-deepest, Math.min(0, this.leg.rest + this.restRate * h));
    // Feet on a deck only push: compressing, the legs fold no faster than the body falls onto them, so a board
    // dropping or rolling away from under the rider unloads the feet rather than being pulled up by them.
    const slack = this.leg.extension - this.legLoad / this.legStiffness;
    if (compressing && this.leg.rest < slack) {
      this.leg.rest = Math.min(0, slack);
      this.restRate = Math.max(this.restRate, this.leg.rate);
    }
    if (this.leg.rest === 0 || this.leg.rest === -deepest) this.restRate = 0;
    this.extending = this.restRate > 0 && this.leg.rest < rest;
    // The deeper tuck keeps the current bent-leg stiffness rather than softening below it.
    this.legStiffness = LEG_STIFFNESS * (1 - (CROUCH_SOFTENING * Math.min(CROUCH_DEPTH, -this.leg.rest)) / CROUCH_DEPTH);
    this.legDamping = 2 * RIDER_LEG.axialDamping * Math.sqrt(this.legStiffness * this.mass);
    this.leg.height = this.localCenter.y - this.base.y;
    // Where the centre of mass is along the leg, and how fast it moves along it relative to where it is carried.
    this.leg.extension = this.scratch2.subVectors(this.position, this.target).dot(this.up);
    const carried = cross(this.boardSpin, this.carried, this.scratch2).add(this.boardVelocity).add(this.drive);
    this.leg.rate = this.localScratch.subVectors(this.velocity, carried).dot(this.up);
    this.landingDemand.carriedRelativeX = this.localScratch.x;
    this.landingDemand.carriedRelativeY = this.localScratch.y;
    this.landingDemand.carriedRelativeZ = this.localScratch.z;
    this.leg.force = this.legLoad - this.legStiffness * (this.leg.extension - this.leg.rest) - this.legDamping * this.leg.rate;
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
    const frame = this.upright ? this.bodyFrame : board.orientation;
    this.bodyAxis.set(0, 0, 1).applyQuaternion(board.orientation);
    const shelter = this.upright ? 1 : ALONG_BODY_SHELTER;
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      this.partWorld.set(this.parts[i * 3], this.parts[i * 3 + 1], this.parts[i * 3 + 2]).sub(this.localCenter).applyQuaternion(frame);
      const offset = this.localScratch.copy(this.partWorld);
      this.partWorld.add(this.position).addScaledVector(this.up, this.legFold(i));
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
    this.handLoad[0] = 0;
    this.handLoad[1] = 0;
    this.handYaw = 0;
    if (this.upright && this.handSide !== 0) this.standingHand(h, board, water);
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

  /** Standing, the hand reaching into the face or, compressing, toward the water on the inside of the turn: its drag on the body, and the moment it turns the board by. */
  private standingHand(h: number, board: BoardBody, water: SurfWater): void {
    const side = this.scratch2.set(this.handSide, 0, 0).applyQuaternion(board.orientation).setY(0);
    if (side.lengthSq() < 1e-9) return;
    side.normalize();
    // The shoulder: out from the hips along the bent upper body; the hand: down and out along the arm.
    const hand = this.partPosition(0, this.handPoint)
      .addScaledVector(this.up, HAND_TORSO * Math.cos(HAND_TORSO_ANGLE)).addScaledVector(side, HAND_TORSO * Math.sin(HAND_TORSO_ANGLE))
      .addScaledVector(this.up, -ARM_LENGTH * Math.cos(ARM_ANGLE)).addScaledVector(side, ARM_LENGTH * Math.sin(ARM_ANGLE));
    // Reaching in a turn, the hand is its own arm's (the +x side's arm leads for Regular, trails for Goofy), and
    // it touches the water rather than plunging.
    if (!this.hand) {
      hand.addScaledVector(this.scratch.set(0, 0, 1).applyQuaternion(board.orientation), this.handSide * this.stanceSign * REACH_ALONG);
      hand.y = Math.max(hand.y, water.surfaceAt(hand.x, hand.z) + HAND_RADIUS - REACH_DIP);
    }
    this.partWorld.copy(hand);
    this.partVelocity.copy(cross(this.angularVelocity, this.localScratch.subVectors(hand, this.position), this.scratch)).add(this.velocity);
    const moment = this.waterMoment.y;
    this.applyWater(RIDER_PARTS.length + (this.handSide > 0 ? 0 : 1), water, HAND_RADIUS, 0, STANDING_HAND_DRAG, h, 1);
    this.handYaw = this.waterMoment.y - moment;
  }

  /** The hand in the face bends the body toward it; the hand reaching in a turn follows the lean and bends none. */
  private get handBend(): number {
    return this.hand ? this.handSide : 0;
  }

  /** Steering without paddling: one arm sweeps. */
  private get sweeping(): boolean {
    return Math.abs(this.steer) > STEER_DEADBAND;
  }

  /** How hard arm `side` (0 left, at +x; 1 right) strokes, from the paddle and steer input and the paddler's own line keeping. */
  private strokeEffort(side: number): number {
    // Ducking, the hands hold the rails.
    if (this.duck.press > DUCK_BUSY) return 0;
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
    // Wet between the surface and what lies under the part: the deck it rests on, or the curl's underside where the
    // part is in the curl's water (the swept barrel, the Padang Padang spec, Part B, PR 4).
    const bottom = Math.min(sample.surfaceY, Math.max(deckY, sample.waterFloorY ?? -Infinity));
    const wet = submergedFraction(sample.surfaceY - p.y, radius) - (Number.isFinite(bottom) ? submergedFraction(bottom - p.y, radius) : 0);
    // The curl's water is a falling jet, its pressure near the air's: it drags and does not float (the advisor, 2026-09-30).
    if (wet > 0) this.wetForce(slot, sample, wet, volume, dragArea, h, shelter, sample.waterFloorY === undefined);
    // A part in the tube's air whose sphere reaches the curl's underside feels the lip: its share between the underside
    // and the top, in the curl's water's own flow (the advisor's ruling 4), drag alone. Centre-only sampling would jump.
    if (sample.ceilingY !== undefined && sample.ceilingTopY !== undefined && sample.ceilingY - p.y < radius) {
      const share = submergedFraction(sample.ceilingTopY - p.y, radius) - submergedFraction(sample.ceilingY - p.y, radius);
      if (share > 0) {
        const lip = water.sampleAt(p.x, (sample.ceilingY + sample.ceilingTopY) / 2, p.z, this.lipSample);
        if (lip.wet && !lip.outsideDomain) this.wetForce(slot, lip, share, volume, dragArea, h, shelter, false);
      }
    }
  }

  /**
   * Buoyancy (unless `buoyant` is false: the curl's falling water) and drag from `sample` on the `wet` share of one body
   * point at `partWorld`, moving at `partVelocity`.
   */
  private wetForce(slot: number, sample: WaterSample, wet: number, volume: number, dragArea: number, h: number, shelter: number, buoyant = true): void {
    const p = this.partWorld;
    if (slot >= RIDER_PARTS.length) this.stroking = true;
    // Aerated water (the wipeout spec, Part B) is a lighter mixture to float and drag in.
    const mixture = SEAWATER * (1 - (sample.voidFraction ?? 0));
    const support = buoyant ? mixture * WATER.gravity * volume * wet : 0;
    const force = this.partForce.set(-support * sample.slopeX, support, -support * sample.slopeZ);
    this.buoyancy.add(force);
    const relative = this.flow.set(sample.flowX, sample.flowY, sample.flowZ).sub(this.partVelocity);
    const drag = 0.5 * mixture * dragArea * wet * relative.length();
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

  // BEGIN observer-only water-patch scalar dispatcher
  /** Begin the current hull leaf, including detached riders; writes only new diagnostic scope fields. */
  beginBoardWaterPatchObservation(count: number): void {
    const observer = this.landingDemand;
    observer.waterPatchCount = count;
    observer.waterPatchScopeAvailable = 0;
  }

  /** Primitive copies only, before rider.prepare; no arrays/vectors or source scratch references retained. */
  observeBoardWaterPatch(
    count: number,
    k: number,
    oldAddedMass: number,
    addedMass: number,
    entrainedMass: number,
    radiation: number,
    intoSurface: number,
    push: number,
    inertia: number,
    projection: number,
    wettedArea: number,
    deckWettedArea: number,
    addedMassPerArea: number,
    radiationPerArea: number,
    nuX: number,
    nuY: number,
    nuZ: number,
    armCrossNuX: number,
    armCrossNuY: number,
    armCrossNuZ: number,
    armX: number,
    armY: number,
    armZ: number,
    normalX: number,
    normalY: number,
    normalZ: number,
    positionX: number,
    positionY: number,
    positionZ: number,
    relativeX: number,
    relativeY: number,
    relativeZ: number,
    flowX: number,
    flowY: number,
    flowZ: number,
    surfaceY: number,
    slopeX: number,
    slopeZ: number,
    sampleNormalX: number,
    sampleNormalY: number,
    sampleNormalZ: number,
    waterDepth: number,
  ): void {
    const observer = this.landingDemand;
    observer.waterPatchCount = count;
    if (count !== 48) {
      observer.waterPatchScopeAvailable = 0;
      return;
    }
    switch (k) {
      case 0:
        observer.waterPatch00OldAddedMass = oldAddedMass;
        observer.waterPatch00AddedMass = addedMass;
        observer.waterPatch00EntrainedMass = entrainedMass;
        observer.waterPatch00Radiation = radiation;
        observer.waterPatch00IntoSurface = intoSurface;
        observer.waterPatch00Push = push;
        observer.waterPatch00Inertia = inertia;
        observer.waterPatch00Projection = projection;
        observer.waterPatch00WettedArea = wettedArea;
        observer.waterPatch00DeckWettedArea = deckWettedArea;
        observer.waterPatch00AddedMassPerArea = addedMassPerArea;
        observer.waterPatch00RadiationPerArea = radiationPerArea;
        observer.waterPatch00NuX = nuX;
        observer.waterPatch00NuY = nuY;
        observer.waterPatch00NuZ = nuZ;
        observer.waterPatch00ArmCrossNuX = armCrossNuX;
        observer.waterPatch00ArmCrossNuY = armCrossNuY;
        observer.waterPatch00ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch00ArmX = armX;
        observer.waterPatch00ArmY = armY;
        observer.waterPatch00ArmZ = armZ;
        observer.waterPatch00NormalX = normalX;
        observer.waterPatch00NormalY = normalY;
        observer.waterPatch00NormalZ = normalZ;
        observer.waterPatch00PositionX = positionX;
        observer.waterPatch00PositionY = positionY;
        observer.waterPatch00PositionZ = positionZ;
        observer.waterPatch00RelativeX = relativeX;
        observer.waterPatch00RelativeY = relativeY;
        observer.waterPatch00RelativeZ = relativeZ;
        observer.waterPatch00FlowX = flowX;
        observer.waterPatch00FlowY = flowY;
        observer.waterPatch00FlowZ = flowZ;
        observer.waterPatch00SurfaceY = surfaceY;
        observer.waterPatch00SlopeX = slopeX;
        observer.waterPatch00SlopeZ = slopeZ;
        observer.waterPatch00SampleNormalX = sampleNormalX;
        observer.waterPatch00SampleNormalY = sampleNormalY;
        observer.waterPatch00SampleNormalZ = sampleNormalZ;
        observer.waterPatch00WaterDepth = waterDepth;
        break;
      case 1:
        observer.waterPatch01OldAddedMass = oldAddedMass;
        observer.waterPatch01AddedMass = addedMass;
        observer.waterPatch01EntrainedMass = entrainedMass;
        observer.waterPatch01Radiation = radiation;
        observer.waterPatch01IntoSurface = intoSurface;
        observer.waterPatch01Push = push;
        observer.waterPatch01Inertia = inertia;
        observer.waterPatch01Projection = projection;
        observer.waterPatch01WettedArea = wettedArea;
        observer.waterPatch01DeckWettedArea = deckWettedArea;
        observer.waterPatch01AddedMassPerArea = addedMassPerArea;
        observer.waterPatch01RadiationPerArea = radiationPerArea;
        observer.waterPatch01NuX = nuX;
        observer.waterPatch01NuY = nuY;
        observer.waterPatch01NuZ = nuZ;
        observer.waterPatch01ArmCrossNuX = armCrossNuX;
        observer.waterPatch01ArmCrossNuY = armCrossNuY;
        observer.waterPatch01ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch01ArmX = armX;
        observer.waterPatch01ArmY = armY;
        observer.waterPatch01ArmZ = armZ;
        observer.waterPatch01NormalX = normalX;
        observer.waterPatch01NormalY = normalY;
        observer.waterPatch01NormalZ = normalZ;
        observer.waterPatch01PositionX = positionX;
        observer.waterPatch01PositionY = positionY;
        observer.waterPatch01PositionZ = positionZ;
        observer.waterPatch01RelativeX = relativeX;
        observer.waterPatch01RelativeY = relativeY;
        observer.waterPatch01RelativeZ = relativeZ;
        observer.waterPatch01FlowX = flowX;
        observer.waterPatch01FlowY = flowY;
        observer.waterPatch01FlowZ = flowZ;
        observer.waterPatch01SurfaceY = surfaceY;
        observer.waterPatch01SlopeX = slopeX;
        observer.waterPatch01SlopeZ = slopeZ;
        observer.waterPatch01SampleNormalX = sampleNormalX;
        observer.waterPatch01SampleNormalY = sampleNormalY;
        observer.waterPatch01SampleNormalZ = sampleNormalZ;
        observer.waterPatch01WaterDepth = waterDepth;
        break;
      case 2:
        observer.waterPatch02OldAddedMass = oldAddedMass;
        observer.waterPatch02AddedMass = addedMass;
        observer.waterPatch02EntrainedMass = entrainedMass;
        observer.waterPatch02Radiation = radiation;
        observer.waterPatch02IntoSurface = intoSurface;
        observer.waterPatch02Push = push;
        observer.waterPatch02Inertia = inertia;
        observer.waterPatch02Projection = projection;
        observer.waterPatch02WettedArea = wettedArea;
        observer.waterPatch02DeckWettedArea = deckWettedArea;
        observer.waterPatch02AddedMassPerArea = addedMassPerArea;
        observer.waterPatch02RadiationPerArea = radiationPerArea;
        observer.waterPatch02NuX = nuX;
        observer.waterPatch02NuY = nuY;
        observer.waterPatch02NuZ = nuZ;
        observer.waterPatch02ArmCrossNuX = armCrossNuX;
        observer.waterPatch02ArmCrossNuY = armCrossNuY;
        observer.waterPatch02ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch02ArmX = armX;
        observer.waterPatch02ArmY = armY;
        observer.waterPatch02ArmZ = armZ;
        observer.waterPatch02NormalX = normalX;
        observer.waterPatch02NormalY = normalY;
        observer.waterPatch02NormalZ = normalZ;
        observer.waterPatch02PositionX = positionX;
        observer.waterPatch02PositionY = positionY;
        observer.waterPatch02PositionZ = positionZ;
        observer.waterPatch02RelativeX = relativeX;
        observer.waterPatch02RelativeY = relativeY;
        observer.waterPatch02RelativeZ = relativeZ;
        observer.waterPatch02FlowX = flowX;
        observer.waterPatch02FlowY = flowY;
        observer.waterPatch02FlowZ = flowZ;
        observer.waterPatch02SurfaceY = surfaceY;
        observer.waterPatch02SlopeX = slopeX;
        observer.waterPatch02SlopeZ = slopeZ;
        observer.waterPatch02SampleNormalX = sampleNormalX;
        observer.waterPatch02SampleNormalY = sampleNormalY;
        observer.waterPatch02SampleNormalZ = sampleNormalZ;
        observer.waterPatch02WaterDepth = waterDepth;
        break;
      case 3:
        observer.waterPatch03OldAddedMass = oldAddedMass;
        observer.waterPatch03AddedMass = addedMass;
        observer.waterPatch03EntrainedMass = entrainedMass;
        observer.waterPatch03Radiation = radiation;
        observer.waterPatch03IntoSurface = intoSurface;
        observer.waterPatch03Push = push;
        observer.waterPatch03Inertia = inertia;
        observer.waterPatch03Projection = projection;
        observer.waterPatch03WettedArea = wettedArea;
        observer.waterPatch03DeckWettedArea = deckWettedArea;
        observer.waterPatch03AddedMassPerArea = addedMassPerArea;
        observer.waterPatch03RadiationPerArea = radiationPerArea;
        observer.waterPatch03NuX = nuX;
        observer.waterPatch03NuY = nuY;
        observer.waterPatch03NuZ = nuZ;
        observer.waterPatch03ArmCrossNuX = armCrossNuX;
        observer.waterPatch03ArmCrossNuY = armCrossNuY;
        observer.waterPatch03ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch03ArmX = armX;
        observer.waterPatch03ArmY = armY;
        observer.waterPatch03ArmZ = armZ;
        observer.waterPatch03NormalX = normalX;
        observer.waterPatch03NormalY = normalY;
        observer.waterPatch03NormalZ = normalZ;
        observer.waterPatch03PositionX = positionX;
        observer.waterPatch03PositionY = positionY;
        observer.waterPatch03PositionZ = positionZ;
        observer.waterPatch03RelativeX = relativeX;
        observer.waterPatch03RelativeY = relativeY;
        observer.waterPatch03RelativeZ = relativeZ;
        observer.waterPatch03FlowX = flowX;
        observer.waterPatch03FlowY = flowY;
        observer.waterPatch03FlowZ = flowZ;
        observer.waterPatch03SurfaceY = surfaceY;
        observer.waterPatch03SlopeX = slopeX;
        observer.waterPatch03SlopeZ = slopeZ;
        observer.waterPatch03SampleNormalX = sampleNormalX;
        observer.waterPatch03SampleNormalY = sampleNormalY;
        observer.waterPatch03SampleNormalZ = sampleNormalZ;
        observer.waterPatch03WaterDepth = waterDepth;
        break;
      case 4:
        observer.waterPatch04OldAddedMass = oldAddedMass;
        observer.waterPatch04AddedMass = addedMass;
        observer.waterPatch04EntrainedMass = entrainedMass;
        observer.waterPatch04Radiation = radiation;
        observer.waterPatch04IntoSurface = intoSurface;
        observer.waterPatch04Push = push;
        observer.waterPatch04Inertia = inertia;
        observer.waterPatch04Projection = projection;
        observer.waterPatch04WettedArea = wettedArea;
        observer.waterPatch04DeckWettedArea = deckWettedArea;
        observer.waterPatch04AddedMassPerArea = addedMassPerArea;
        observer.waterPatch04RadiationPerArea = radiationPerArea;
        observer.waterPatch04NuX = nuX;
        observer.waterPatch04NuY = nuY;
        observer.waterPatch04NuZ = nuZ;
        observer.waterPatch04ArmCrossNuX = armCrossNuX;
        observer.waterPatch04ArmCrossNuY = armCrossNuY;
        observer.waterPatch04ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch04ArmX = armX;
        observer.waterPatch04ArmY = armY;
        observer.waterPatch04ArmZ = armZ;
        observer.waterPatch04NormalX = normalX;
        observer.waterPatch04NormalY = normalY;
        observer.waterPatch04NormalZ = normalZ;
        observer.waterPatch04PositionX = positionX;
        observer.waterPatch04PositionY = positionY;
        observer.waterPatch04PositionZ = positionZ;
        observer.waterPatch04RelativeX = relativeX;
        observer.waterPatch04RelativeY = relativeY;
        observer.waterPatch04RelativeZ = relativeZ;
        observer.waterPatch04FlowX = flowX;
        observer.waterPatch04FlowY = flowY;
        observer.waterPatch04FlowZ = flowZ;
        observer.waterPatch04SurfaceY = surfaceY;
        observer.waterPatch04SlopeX = slopeX;
        observer.waterPatch04SlopeZ = slopeZ;
        observer.waterPatch04SampleNormalX = sampleNormalX;
        observer.waterPatch04SampleNormalY = sampleNormalY;
        observer.waterPatch04SampleNormalZ = sampleNormalZ;
        observer.waterPatch04WaterDepth = waterDepth;
        break;
      case 5:
        observer.waterPatch05OldAddedMass = oldAddedMass;
        observer.waterPatch05AddedMass = addedMass;
        observer.waterPatch05EntrainedMass = entrainedMass;
        observer.waterPatch05Radiation = radiation;
        observer.waterPatch05IntoSurface = intoSurface;
        observer.waterPatch05Push = push;
        observer.waterPatch05Inertia = inertia;
        observer.waterPatch05Projection = projection;
        observer.waterPatch05WettedArea = wettedArea;
        observer.waterPatch05DeckWettedArea = deckWettedArea;
        observer.waterPatch05AddedMassPerArea = addedMassPerArea;
        observer.waterPatch05RadiationPerArea = radiationPerArea;
        observer.waterPatch05NuX = nuX;
        observer.waterPatch05NuY = nuY;
        observer.waterPatch05NuZ = nuZ;
        observer.waterPatch05ArmCrossNuX = armCrossNuX;
        observer.waterPatch05ArmCrossNuY = armCrossNuY;
        observer.waterPatch05ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch05ArmX = armX;
        observer.waterPatch05ArmY = armY;
        observer.waterPatch05ArmZ = armZ;
        observer.waterPatch05NormalX = normalX;
        observer.waterPatch05NormalY = normalY;
        observer.waterPatch05NormalZ = normalZ;
        observer.waterPatch05PositionX = positionX;
        observer.waterPatch05PositionY = positionY;
        observer.waterPatch05PositionZ = positionZ;
        observer.waterPatch05RelativeX = relativeX;
        observer.waterPatch05RelativeY = relativeY;
        observer.waterPatch05RelativeZ = relativeZ;
        observer.waterPatch05FlowX = flowX;
        observer.waterPatch05FlowY = flowY;
        observer.waterPatch05FlowZ = flowZ;
        observer.waterPatch05SurfaceY = surfaceY;
        observer.waterPatch05SlopeX = slopeX;
        observer.waterPatch05SlopeZ = slopeZ;
        observer.waterPatch05SampleNormalX = sampleNormalX;
        observer.waterPatch05SampleNormalY = sampleNormalY;
        observer.waterPatch05SampleNormalZ = sampleNormalZ;
        observer.waterPatch05WaterDepth = waterDepth;
        break;
      case 6:
        observer.waterPatch06OldAddedMass = oldAddedMass;
        observer.waterPatch06AddedMass = addedMass;
        observer.waterPatch06EntrainedMass = entrainedMass;
        observer.waterPatch06Radiation = radiation;
        observer.waterPatch06IntoSurface = intoSurface;
        observer.waterPatch06Push = push;
        observer.waterPatch06Inertia = inertia;
        observer.waterPatch06Projection = projection;
        observer.waterPatch06WettedArea = wettedArea;
        observer.waterPatch06DeckWettedArea = deckWettedArea;
        observer.waterPatch06AddedMassPerArea = addedMassPerArea;
        observer.waterPatch06RadiationPerArea = radiationPerArea;
        observer.waterPatch06NuX = nuX;
        observer.waterPatch06NuY = nuY;
        observer.waterPatch06NuZ = nuZ;
        observer.waterPatch06ArmCrossNuX = armCrossNuX;
        observer.waterPatch06ArmCrossNuY = armCrossNuY;
        observer.waterPatch06ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch06ArmX = armX;
        observer.waterPatch06ArmY = armY;
        observer.waterPatch06ArmZ = armZ;
        observer.waterPatch06NormalX = normalX;
        observer.waterPatch06NormalY = normalY;
        observer.waterPatch06NormalZ = normalZ;
        observer.waterPatch06PositionX = positionX;
        observer.waterPatch06PositionY = positionY;
        observer.waterPatch06PositionZ = positionZ;
        observer.waterPatch06RelativeX = relativeX;
        observer.waterPatch06RelativeY = relativeY;
        observer.waterPatch06RelativeZ = relativeZ;
        observer.waterPatch06FlowX = flowX;
        observer.waterPatch06FlowY = flowY;
        observer.waterPatch06FlowZ = flowZ;
        observer.waterPatch06SurfaceY = surfaceY;
        observer.waterPatch06SlopeX = slopeX;
        observer.waterPatch06SlopeZ = slopeZ;
        observer.waterPatch06SampleNormalX = sampleNormalX;
        observer.waterPatch06SampleNormalY = sampleNormalY;
        observer.waterPatch06SampleNormalZ = sampleNormalZ;
        observer.waterPatch06WaterDepth = waterDepth;
        break;
      case 7:
        observer.waterPatch07OldAddedMass = oldAddedMass;
        observer.waterPatch07AddedMass = addedMass;
        observer.waterPatch07EntrainedMass = entrainedMass;
        observer.waterPatch07Radiation = radiation;
        observer.waterPatch07IntoSurface = intoSurface;
        observer.waterPatch07Push = push;
        observer.waterPatch07Inertia = inertia;
        observer.waterPatch07Projection = projection;
        observer.waterPatch07WettedArea = wettedArea;
        observer.waterPatch07DeckWettedArea = deckWettedArea;
        observer.waterPatch07AddedMassPerArea = addedMassPerArea;
        observer.waterPatch07RadiationPerArea = radiationPerArea;
        observer.waterPatch07NuX = nuX;
        observer.waterPatch07NuY = nuY;
        observer.waterPatch07NuZ = nuZ;
        observer.waterPatch07ArmCrossNuX = armCrossNuX;
        observer.waterPatch07ArmCrossNuY = armCrossNuY;
        observer.waterPatch07ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch07ArmX = armX;
        observer.waterPatch07ArmY = armY;
        observer.waterPatch07ArmZ = armZ;
        observer.waterPatch07NormalX = normalX;
        observer.waterPatch07NormalY = normalY;
        observer.waterPatch07NormalZ = normalZ;
        observer.waterPatch07PositionX = positionX;
        observer.waterPatch07PositionY = positionY;
        observer.waterPatch07PositionZ = positionZ;
        observer.waterPatch07RelativeX = relativeX;
        observer.waterPatch07RelativeY = relativeY;
        observer.waterPatch07RelativeZ = relativeZ;
        observer.waterPatch07FlowX = flowX;
        observer.waterPatch07FlowY = flowY;
        observer.waterPatch07FlowZ = flowZ;
        observer.waterPatch07SurfaceY = surfaceY;
        observer.waterPatch07SlopeX = slopeX;
        observer.waterPatch07SlopeZ = slopeZ;
        observer.waterPatch07SampleNormalX = sampleNormalX;
        observer.waterPatch07SampleNormalY = sampleNormalY;
        observer.waterPatch07SampleNormalZ = sampleNormalZ;
        observer.waterPatch07WaterDepth = waterDepth;
        break;
      case 8:
        observer.waterPatch08OldAddedMass = oldAddedMass;
        observer.waterPatch08AddedMass = addedMass;
        observer.waterPatch08EntrainedMass = entrainedMass;
        observer.waterPatch08Radiation = radiation;
        observer.waterPatch08IntoSurface = intoSurface;
        observer.waterPatch08Push = push;
        observer.waterPatch08Inertia = inertia;
        observer.waterPatch08Projection = projection;
        observer.waterPatch08WettedArea = wettedArea;
        observer.waterPatch08DeckWettedArea = deckWettedArea;
        observer.waterPatch08AddedMassPerArea = addedMassPerArea;
        observer.waterPatch08RadiationPerArea = radiationPerArea;
        observer.waterPatch08NuX = nuX;
        observer.waterPatch08NuY = nuY;
        observer.waterPatch08NuZ = nuZ;
        observer.waterPatch08ArmCrossNuX = armCrossNuX;
        observer.waterPatch08ArmCrossNuY = armCrossNuY;
        observer.waterPatch08ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch08ArmX = armX;
        observer.waterPatch08ArmY = armY;
        observer.waterPatch08ArmZ = armZ;
        observer.waterPatch08NormalX = normalX;
        observer.waterPatch08NormalY = normalY;
        observer.waterPatch08NormalZ = normalZ;
        observer.waterPatch08PositionX = positionX;
        observer.waterPatch08PositionY = positionY;
        observer.waterPatch08PositionZ = positionZ;
        observer.waterPatch08RelativeX = relativeX;
        observer.waterPatch08RelativeY = relativeY;
        observer.waterPatch08RelativeZ = relativeZ;
        observer.waterPatch08FlowX = flowX;
        observer.waterPatch08FlowY = flowY;
        observer.waterPatch08FlowZ = flowZ;
        observer.waterPatch08SurfaceY = surfaceY;
        observer.waterPatch08SlopeX = slopeX;
        observer.waterPatch08SlopeZ = slopeZ;
        observer.waterPatch08SampleNormalX = sampleNormalX;
        observer.waterPatch08SampleNormalY = sampleNormalY;
        observer.waterPatch08SampleNormalZ = sampleNormalZ;
        observer.waterPatch08WaterDepth = waterDepth;
        break;
      case 9:
        observer.waterPatch09OldAddedMass = oldAddedMass;
        observer.waterPatch09AddedMass = addedMass;
        observer.waterPatch09EntrainedMass = entrainedMass;
        observer.waterPatch09Radiation = radiation;
        observer.waterPatch09IntoSurface = intoSurface;
        observer.waterPatch09Push = push;
        observer.waterPatch09Inertia = inertia;
        observer.waterPatch09Projection = projection;
        observer.waterPatch09WettedArea = wettedArea;
        observer.waterPatch09DeckWettedArea = deckWettedArea;
        observer.waterPatch09AddedMassPerArea = addedMassPerArea;
        observer.waterPatch09RadiationPerArea = radiationPerArea;
        observer.waterPatch09NuX = nuX;
        observer.waterPatch09NuY = nuY;
        observer.waterPatch09NuZ = nuZ;
        observer.waterPatch09ArmCrossNuX = armCrossNuX;
        observer.waterPatch09ArmCrossNuY = armCrossNuY;
        observer.waterPatch09ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch09ArmX = armX;
        observer.waterPatch09ArmY = armY;
        observer.waterPatch09ArmZ = armZ;
        observer.waterPatch09NormalX = normalX;
        observer.waterPatch09NormalY = normalY;
        observer.waterPatch09NormalZ = normalZ;
        observer.waterPatch09PositionX = positionX;
        observer.waterPatch09PositionY = positionY;
        observer.waterPatch09PositionZ = positionZ;
        observer.waterPatch09RelativeX = relativeX;
        observer.waterPatch09RelativeY = relativeY;
        observer.waterPatch09RelativeZ = relativeZ;
        observer.waterPatch09FlowX = flowX;
        observer.waterPatch09FlowY = flowY;
        observer.waterPatch09FlowZ = flowZ;
        observer.waterPatch09SurfaceY = surfaceY;
        observer.waterPatch09SlopeX = slopeX;
        observer.waterPatch09SlopeZ = slopeZ;
        observer.waterPatch09SampleNormalX = sampleNormalX;
        observer.waterPatch09SampleNormalY = sampleNormalY;
        observer.waterPatch09SampleNormalZ = sampleNormalZ;
        observer.waterPatch09WaterDepth = waterDepth;
        break;
      case 10:
        observer.waterPatch10OldAddedMass = oldAddedMass;
        observer.waterPatch10AddedMass = addedMass;
        observer.waterPatch10EntrainedMass = entrainedMass;
        observer.waterPatch10Radiation = radiation;
        observer.waterPatch10IntoSurface = intoSurface;
        observer.waterPatch10Push = push;
        observer.waterPatch10Inertia = inertia;
        observer.waterPatch10Projection = projection;
        observer.waterPatch10WettedArea = wettedArea;
        observer.waterPatch10DeckWettedArea = deckWettedArea;
        observer.waterPatch10AddedMassPerArea = addedMassPerArea;
        observer.waterPatch10RadiationPerArea = radiationPerArea;
        observer.waterPatch10NuX = nuX;
        observer.waterPatch10NuY = nuY;
        observer.waterPatch10NuZ = nuZ;
        observer.waterPatch10ArmCrossNuX = armCrossNuX;
        observer.waterPatch10ArmCrossNuY = armCrossNuY;
        observer.waterPatch10ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch10ArmX = armX;
        observer.waterPatch10ArmY = armY;
        observer.waterPatch10ArmZ = armZ;
        observer.waterPatch10NormalX = normalX;
        observer.waterPatch10NormalY = normalY;
        observer.waterPatch10NormalZ = normalZ;
        observer.waterPatch10PositionX = positionX;
        observer.waterPatch10PositionY = positionY;
        observer.waterPatch10PositionZ = positionZ;
        observer.waterPatch10RelativeX = relativeX;
        observer.waterPatch10RelativeY = relativeY;
        observer.waterPatch10RelativeZ = relativeZ;
        observer.waterPatch10FlowX = flowX;
        observer.waterPatch10FlowY = flowY;
        observer.waterPatch10FlowZ = flowZ;
        observer.waterPatch10SurfaceY = surfaceY;
        observer.waterPatch10SlopeX = slopeX;
        observer.waterPatch10SlopeZ = slopeZ;
        observer.waterPatch10SampleNormalX = sampleNormalX;
        observer.waterPatch10SampleNormalY = sampleNormalY;
        observer.waterPatch10SampleNormalZ = sampleNormalZ;
        observer.waterPatch10WaterDepth = waterDepth;
        break;
      case 11:
        observer.waterPatch11OldAddedMass = oldAddedMass;
        observer.waterPatch11AddedMass = addedMass;
        observer.waterPatch11EntrainedMass = entrainedMass;
        observer.waterPatch11Radiation = radiation;
        observer.waterPatch11IntoSurface = intoSurface;
        observer.waterPatch11Push = push;
        observer.waterPatch11Inertia = inertia;
        observer.waterPatch11Projection = projection;
        observer.waterPatch11WettedArea = wettedArea;
        observer.waterPatch11DeckWettedArea = deckWettedArea;
        observer.waterPatch11AddedMassPerArea = addedMassPerArea;
        observer.waterPatch11RadiationPerArea = radiationPerArea;
        observer.waterPatch11NuX = nuX;
        observer.waterPatch11NuY = nuY;
        observer.waterPatch11NuZ = nuZ;
        observer.waterPatch11ArmCrossNuX = armCrossNuX;
        observer.waterPatch11ArmCrossNuY = armCrossNuY;
        observer.waterPatch11ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch11ArmX = armX;
        observer.waterPatch11ArmY = armY;
        observer.waterPatch11ArmZ = armZ;
        observer.waterPatch11NormalX = normalX;
        observer.waterPatch11NormalY = normalY;
        observer.waterPatch11NormalZ = normalZ;
        observer.waterPatch11PositionX = positionX;
        observer.waterPatch11PositionY = positionY;
        observer.waterPatch11PositionZ = positionZ;
        observer.waterPatch11RelativeX = relativeX;
        observer.waterPatch11RelativeY = relativeY;
        observer.waterPatch11RelativeZ = relativeZ;
        observer.waterPatch11FlowX = flowX;
        observer.waterPatch11FlowY = flowY;
        observer.waterPatch11FlowZ = flowZ;
        observer.waterPatch11SurfaceY = surfaceY;
        observer.waterPatch11SlopeX = slopeX;
        observer.waterPatch11SlopeZ = slopeZ;
        observer.waterPatch11SampleNormalX = sampleNormalX;
        observer.waterPatch11SampleNormalY = sampleNormalY;
        observer.waterPatch11SampleNormalZ = sampleNormalZ;
        observer.waterPatch11WaterDepth = waterDepth;
        break;
      case 12:
        observer.waterPatch12OldAddedMass = oldAddedMass;
        observer.waterPatch12AddedMass = addedMass;
        observer.waterPatch12EntrainedMass = entrainedMass;
        observer.waterPatch12Radiation = radiation;
        observer.waterPatch12IntoSurface = intoSurface;
        observer.waterPatch12Push = push;
        observer.waterPatch12Inertia = inertia;
        observer.waterPatch12Projection = projection;
        observer.waterPatch12WettedArea = wettedArea;
        observer.waterPatch12DeckWettedArea = deckWettedArea;
        observer.waterPatch12AddedMassPerArea = addedMassPerArea;
        observer.waterPatch12RadiationPerArea = radiationPerArea;
        observer.waterPatch12NuX = nuX;
        observer.waterPatch12NuY = nuY;
        observer.waterPatch12NuZ = nuZ;
        observer.waterPatch12ArmCrossNuX = armCrossNuX;
        observer.waterPatch12ArmCrossNuY = armCrossNuY;
        observer.waterPatch12ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch12ArmX = armX;
        observer.waterPatch12ArmY = armY;
        observer.waterPatch12ArmZ = armZ;
        observer.waterPatch12NormalX = normalX;
        observer.waterPatch12NormalY = normalY;
        observer.waterPatch12NormalZ = normalZ;
        observer.waterPatch12PositionX = positionX;
        observer.waterPatch12PositionY = positionY;
        observer.waterPatch12PositionZ = positionZ;
        observer.waterPatch12RelativeX = relativeX;
        observer.waterPatch12RelativeY = relativeY;
        observer.waterPatch12RelativeZ = relativeZ;
        observer.waterPatch12FlowX = flowX;
        observer.waterPatch12FlowY = flowY;
        observer.waterPatch12FlowZ = flowZ;
        observer.waterPatch12SurfaceY = surfaceY;
        observer.waterPatch12SlopeX = slopeX;
        observer.waterPatch12SlopeZ = slopeZ;
        observer.waterPatch12SampleNormalX = sampleNormalX;
        observer.waterPatch12SampleNormalY = sampleNormalY;
        observer.waterPatch12SampleNormalZ = sampleNormalZ;
        observer.waterPatch12WaterDepth = waterDepth;
        break;
      case 13:
        observer.waterPatch13OldAddedMass = oldAddedMass;
        observer.waterPatch13AddedMass = addedMass;
        observer.waterPatch13EntrainedMass = entrainedMass;
        observer.waterPatch13Radiation = radiation;
        observer.waterPatch13IntoSurface = intoSurface;
        observer.waterPatch13Push = push;
        observer.waterPatch13Inertia = inertia;
        observer.waterPatch13Projection = projection;
        observer.waterPatch13WettedArea = wettedArea;
        observer.waterPatch13DeckWettedArea = deckWettedArea;
        observer.waterPatch13AddedMassPerArea = addedMassPerArea;
        observer.waterPatch13RadiationPerArea = radiationPerArea;
        observer.waterPatch13NuX = nuX;
        observer.waterPatch13NuY = nuY;
        observer.waterPatch13NuZ = nuZ;
        observer.waterPatch13ArmCrossNuX = armCrossNuX;
        observer.waterPatch13ArmCrossNuY = armCrossNuY;
        observer.waterPatch13ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch13ArmX = armX;
        observer.waterPatch13ArmY = armY;
        observer.waterPatch13ArmZ = armZ;
        observer.waterPatch13NormalX = normalX;
        observer.waterPatch13NormalY = normalY;
        observer.waterPatch13NormalZ = normalZ;
        observer.waterPatch13PositionX = positionX;
        observer.waterPatch13PositionY = positionY;
        observer.waterPatch13PositionZ = positionZ;
        observer.waterPatch13RelativeX = relativeX;
        observer.waterPatch13RelativeY = relativeY;
        observer.waterPatch13RelativeZ = relativeZ;
        observer.waterPatch13FlowX = flowX;
        observer.waterPatch13FlowY = flowY;
        observer.waterPatch13FlowZ = flowZ;
        observer.waterPatch13SurfaceY = surfaceY;
        observer.waterPatch13SlopeX = slopeX;
        observer.waterPatch13SlopeZ = slopeZ;
        observer.waterPatch13SampleNormalX = sampleNormalX;
        observer.waterPatch13SampleNormalY = sampleNormalY;
        observer.waterPatch13SampleNormalZ = sampleNormalZ;
        observer.waterPatch13WaterDepth = waterDepth;
        break;
      case 14:
        observer.waterPatch14OldAddedMass = oldAddedMass;
        observer.waterPatch14AddedMass = addedMass;
        observer.waterPatch14EntrainedMass = entrainedMass;
        observer.waterPatch14Radiation = radiation;
        observer.waterPatch14IntoSurface = intoSurface;
        observer.waterPatch14Push = push;
        observer.waterPatch14Inertia = inertia;
        observer.waterPatch14Projection = projection;
        observer.waterPatch14WettedArea = wettedArea;
        observer.waterPatch14DeckWettedArea = deckWettedArea;
        observer.waterPatch14AddedMassPerArea = addedMassPerArea;
        observer.waterPatch14RadiationPerArea = radiationPerArea;
        observer.waterPatch14NuX = nuX;
        observer.waterPatch14NuY = nuY;
        observer.waterPatch14NuZ = nuZ;
        observer.waterPatch14ArmCrossNuX = armCrossNuX;
        observer.waterPatch14ArmCrossNuY = armCrossNuY;
        observer.waterPatch14ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch14ArmX = armX;
        observer.waterPatch14ArmY = armY;
        observer.waterPatch14ArmZ = armZ;
        observer.waterPatch14NormalX = normalX;
        observer.waterPatch14NormalY = normalY;
        observer.waterPatch14NormalZ = normalZ;
        observer.waterPatch14PositionX = positionX;
        observer.waterPatch14PositionY = positionY;
        observer.waterPatch14PositionZ = positionZ;
        observer.waterPatch14RelativeX = relativeX;
        observer.waterPatch14RelativeY = relativeY;
        observer.waterPatch14RelativeZ = relativeZ;
        observer.waterPatch14FlowX = flowX;
        observer.waterPatch14FlowY = flowY;
        observer.waterPatch14FlowZ = flowZ;
        observer.waterPatch14SurfaceY = surfaceY;
        observer.waterPatch14SlopeX = slopeX;
        observer.waterPatch14SlopeZ = slopeZ;
        observer.waterPatch14SampleNormalX = sampleNormalX;
        observer.waterPatch14SampleNormalY = sampleNormalY;
        observer.waterPatch14SampleNormalZ = sampleNormalZ;
        observer.waterPatch14WaterDepth = waterDepth;
        break;
      case 15:
        observer.waterPatch15OldAddedMass = oldAddedMass;
        observer.waterPatch15AddedMass = addedMass;
        observer.waterPatch15EntrainedMass = entrainedMass;
        observer.waterPatch15Radiation = radiation;
        observer.waterPatch15IntoSurface = intoSurface;
        observer.waterPatch15Push = push;
        observer.waterPatch15Inertia = inertia;
        observer.waterPatch15Projection = projection;
        observer.waterPatch15WettedArea = wettedArea;
        observer.waterPatch15DeckWettedArea = deckWettedArea;
        observer.waterPatch15AddedMassPerArea = addedMassPerArea;
        observer.waterPatch15RadiationPerArea = radiationPerArea;
        observer.waterPatch15NuX = nuX;
        observer.waterPatch15NuY = nuY;
        observer.waterPatch15NuZ = nuZ;
        observer.waterPatch15ArmCrossNuX = armCrossNuX;
        observer.waterPatch15ArmCrossNuY = armCrossNuY;
        observer.waterPatch15ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch15ArmX = armX;
        observer.waterPatch15ArmY = armY;
        observer.waterPatch15ArmZ = armZ;
        observer.waterPatch15NormalX = normalX;
        observer.waterPatch15NormalY = normalY;
        observer.waterPatch15NormalZ = normalZ;
        observer.waterPatch15PositionX = positionX;
        observer.waterPatch15PositionY = positionY;
        observer.waterPatch15PositionZ = positionZ;
        observer.waterPatch15RelativeX = relativeX;
        observer.waterPatch15RelativeY = relativeY;
        observer.waterPatch15RelativeZ = relativeZ;
        observer.waterPatch15FlowX = flowX;
        observer.waterPatch15FlowY = flowY;
        observer.waterPatch15FlowZ = flowZ;
        observer.waterPatch15SurfaceY = surfaceY;
        observer.waterPatch15SlopeX = slopeX;
        observer.waterPatch15SlopeZ = slopeZ;
        observer.waterPatch15SampleNormalX = sampleNormalX;
        observer.waterPatch15SampleNormalY = sampleNormalY;
        observer.waterPatch15SampleNormalZ = sampleNormalZ;
        observer.waterPatch15WaterDepth = waterDepth;
        break;
      case 16:
        observer.waterPatch16OldAddedMass = oldAddedMass;
        observer.waterPatch16AddedMass = addedMass;
        observer.waterPatch16EntrainedMass = entrainedMass;
        observer.waterPatch16Radiation = radiation;
        observer.waterPatch16IntoSurface = intoSurface;
        observer.waterPatch16Push = push;
        observer.waterPatch16Inertia = inertia;
        observer.waterPatch16Projection = projection;
        observer.waterPatch16WettedArea = wettedArea;
        observer.waterPatch16DeckWettedArea = deckWettedArea;
        observer.waterPatch16AddedMassPerArea = addedMassPerArea;
        observer.waterPatch16RadiationPerArea = radiationPerArea;
        observer.waterPatch16NuX = nuX;
        observer.waterPatch16NuY = nuY;
        observer.waterPatch16NuZ = nuZ;
        observer.waterPatch16ArmCrossNuX = armCrossNuX;
        observer.waterPatch16ArmCrossNuY = armCrossNuY;
        observer.waterPatch16ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch16ArmX = armX;
        observer.waterPatch16ArmY = armY;
        observer.waterPatch16ArmZ = armZ;
        observer.waterPatch16NormalX = normalX;
        observer.waterPatch16NormalY = normalY;
        observer.waterPatch16NormalZ = normalZ;
        observer.waterPatch16PositionX = positionX;
        observer.waterPatch16PositionY = positionY;
        observer.waterPatch16PositionZ = positionZ;
        observer.waterPatch16RelativeX = relativeX;
        observer.waterPatch16RelativeY = relativeY;
        observer.waterPatch16RelativeZ = relativeZ;
        observer.waterPatch16FlowX = flowX;
        observer.waterPatch16FlowY = flowY;
        observer.waterPatch16FlowZ = flowZ;
        observer.waterPatch16SurfaceY = surfaceY;
        observer.waterPatch16SlopeX = slopeX;
        observer.waterPatch16SlopeZ = slopeZ;
        observer.waterPatch16SampleNormalX = sampleNormalX;
        observer.waterPatch16SampleNormalY = sampleNormalY;
        observer.waterPatch16SampleNormalZ = sampleNormalZ;
        observer.waterPatch16WaterDepth = waterDepth;
        break;
      case 17:
        observer.waterPatch17OldAddedMass = oldAddedMass;
        observer.waterPatch17AddedMass = addedMass;
        observer.waterPatch17EntrainedMass = entrainedMass;
        observer.waterPatch17Radiation = radiation;
        observer.waterPatch17IntoSurface = intoSurface;
        observer.waterPatch17Push = push;
        observer.waterPatch17Inertia = inertia;
        observer.waterPatch17Projection = projection;
        observer.waterPatch17WettedArea = wettedArea;
        observer.waterPatch17DeckWettedArea = deckWettedArea;
        observer.waterPatch17AddedMassPerArea = addedMassPerArea;
        observer.waterPatch17RadiationPerArea = radiationPerArea;
        observer.waterPatch17NuX = nuX;
        observer.waterPatch17NuY = nuY;
        observer.waterPatch17NuZ = nuZ;
        observer.waterPatch17ArmCrossNuX = armCrossNuX;
        observer.waterPatch17ArmCrossNuY = armCrossNuY;
        observer.waterPatch17ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch17ArmX = armX;
        observer.waterPatch17ArmY = armY;
        observer.waterPatch17ArmZ = armZ;
        observer.waterPatch17NormalX = normalX;
        observer.waterPatch17NormalY = normalY;
        observer.waterPatch17NormalZ = normalZ;
        observer.waterPatch17PositionX = positionX;
        observer.waterPatch17PositionY = positionY;
        observer.waterPatch17PositionZ = positionZ;
        observer.waterPatch17RelativeX = relativeX;
        observer.waterPatch17RelativeY = relativeY;
        observer.waterPatch17RelativeZ = relativeZ;
        observer.waterPatch17FlowX = flowX;
        observer.waterPatch17FlowY = flowY;
        observer.waterPatch17FlowZ = flowZ;
        observer.waterPatch17SurfaceY = surfaceY;
        observer.waterPatch17SlopeX = slopeX;
        observer.waterPatch17SlopeZ = slopeZ;
        observer.waterPatch17SampleNormalX = sampleNormalX;
        observer.waterPatch17SampleNormalY = sampleNormalY;
        observer.waterPatch17SampleNormalZ = sampleNormalZ;
        observer.waterPatch17WaterDepth = waterDepth;
        break;
      case 18:
        observer.waterPatch18OldAddedMass = oldAddedMass;
        observer.waterPatch18AddedMass = addedMass;
        observer.waterPatch18EntrainedMass = entrainedMass;
        observer.waterPatch18Radiation = radiation;
        observer.waterPatch18IntoSurface = intoSurface;
        observer.waterPatch18Push = push;
        observer.waterPatch18Inertia = inertia;
        observer.waterPatch18Projection = projection;
        observer.waterPatch18WettedArea = wettedArea;
        observer.waterPatch18DeckWettedArea = deckWettedArea;
        observer.waterPatch18AddedMassPerArea = addedMassPerArea;
        observer.waterPatch18RadiationPerArea = radiationPerArea;
        observer.waterPatch18NuX = nuX;
        observer.waterPatch18NuY = nuY;
        observer.waterPatch18NuZ = nuZ;
        observer.waterPatch18ArmCrossNuX = armCrossNuX;
        observer.waterPatch18ArmCrossNuY = armCrossNuY;
        observer.waterPatch18ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch18ArmX = armX;
        observer.waterPatch18ArmY = armY;
        observer.waterPatch18ArmZ = armZ;
        observer.waterPatch18NormalX = normalX;
        observer.waterPatch18NormalY = normalY;
        observer.waterPatch18NormalZ = normalZ;
        observer.waterPatch18PositionX = positionX;
        observer.waterPatch18PositionY = positionY;
        observer.waterPatch18PositionZ = positionZ;
        observer.waterPatch18RelativeX = relativeX;
        observer.waterPatch18RelativeY = relativeY;
        observer.waterPatch18RelativeZ = relativeZ;
        observer.waterPatch18FlowX = flowX;
        observer.waterPatch18FlowY = flowY;
        observer.waterPatch18FlowZ = flowZ;
        observer.waterPatch18SurfaceY = surfaceY;
        observer.waterPatch18SlopeX = slopeX;
        observer.waterPatch18SlopeZ = slopeZ;
        observer.waterPatch18SampleNormalX = sampleNormalX;
        observer.waterPatch18SampleNormalY = sampleNormalY;
        observer.waterPatch18SampleNormalZ = sampleNormalZ;
        observer.waterPatch18WaterDepth = waterDepth;
        break;
      case 19:
        observer.waterPatch19OldAddedMass = oldAddedMass;
        observer.waterPatch19AddedMass = addedMass;
        observer.waterPatch19EntrainedMass = entrainedMass;
        observer.waterPatch19Radiation = radiation;
        observer.waterPatch19IntoSurface = intoSurface;
        observer.waterPatch19Push = push;
        observer.waterPatch19Inertia = inertia;
        observer.waterPatch19Projection = projection;
        observer.waterPatch19WettedArea = wettedArea;
        observer.waterPatch19DeckWettedArea = deckWettedArea;
        observer.waterPatch19AddedMassPerArea = addedMassPerArea;
        observer.waterPatch19RadiationPerArea = radiationPerArea;
        observer.waterPatch19NuX = nuX;
        observer.waterPatch19NuY = nuY;
        observer.waterPatch19NuZ = nuZ;
        observer.waterPatch19ArmCrossNuX = armCrossNuX;
        observer.waterPatch19ArmCrossNuY = armCrossNuY;
        observer.waterPatch19ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch19ArmX = armX;
        observer.waterPatch19ArmY = armY;
        observer.waterPatch19ArmZ = armZ;
        observer.waterPatch19NormalX = normalX;
        observer.waterPatch19NormalY = normalY;
        observer.waterPatch19NormalZ = normalZ;
        observer.waterPatch19PositionX = positionX;
        observer.waterPatch19PositionY = positionY;
        observer.waterPatch19PositionZ = positionZ;
        observer.waterPatch19RelativeX = relativeX;
        observer.waterPatch19RelativeY = relativeY;
        observer.waterPatch19RelativeZ = relativeZ;
        observer.waterPatch19FlowX = flowX;
        observer.waterPatch19FlowY = flowY;
        observer.waterPatch19FlowZ = flowZ;
        observer.waterPatch19SurfaceY = surfaceY;
        observer.waterPatch19SlopeX = slopeX;
        observer.waterPatch19SlopeZ = slopeZ;
        observer.waterPatch19SampleNormalX = sampleNormalX;
        observer.waterPatch19SampleNormalY = sampleNormalY;
        observer.waterPatch19SampleNormalZ = sampleNormalZ;
        observer.waterPatch19WaterDepth = waterDepth;
        break;
      case 20:
        observer.waterPatch20OldAddedMass = oldAddedMass;
        observer.waterPatch20AddedMass = addedMass;
        observer.waterPatch20EntrainedMass = entrainedMass;
        observer.waterPatch20Radiation = radiation;
        observer.waterPatch20IntoSurface = intoSurface;
        observer.waterPatch20Push = push;
        observer.waterPatch20Inertia = inertia;
        observer.waterPatch20Projection = projection;
        observer.waterPatch20WettedArea = wettedArea;
        observer.waterPatch20DeckWettedArea = deckWettedArea;
        observer.waterPatch20AddedMassPerArea = addedMassPerArea;
        observer.waterPatch20RadiationPerArea = radiationPerArea;
        observer.waterPatch20NuX = nuX;
        observer.waterPatch20NuY = nuY;
        observer.waterPatch20NuZ = nuZ;
        observer.waterPatch20ArmCrossNuX = armCrossNuX;
        observer.waterPatch20ArmCrossNuY = armCrossNuY;
        observer.waterPatch20ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch20ArmX = armX;
        observer.waterPatch20ArmY = armY;
        observer.waterPatch20ArmZ = armZ;
        observer.waterPatch20NormalX = normalX;
        observer.waterPatch20NormalY = normalY;
        observer.waterPatch20NormalZ = normalZ;
        observer.waterPatch20PositionX = positionX;
        observer.waterPatch20PositionY = positionY;
        observer.waterPatch20PositionZ = positionZ;
        observer.waterPatch20RelativeX = relativeX;
        observer.waterPatch20RelativeY = relativeY;
        observer.waterPatch20RelativeZ = relativeZ;
        observer.waterPatch20FlowX = flowX;
        observer.waterPatch20FlowY = flowY;
        observer.waterPatch20FlowZ = flowZ;
        observer.waterPatch20SurfaceY = surfaceY;
        observer.waterPatch20SlopeX = slopeX;
        observer.waterPatch20SlopeZ = slopeZ;
        observer.waterPatch20SampleNormalX = sampleNormalX;
        observer.waterPatch20SampleNormalY = sampleNormalY;
        observer.waterPatch20SampleNormalZ = sampleNormalZ;
        observer.waterPatch20WaterDepth = waterDepth;
        break;
      case 21:
        observer.waterPatch21OldAddedMass = oldAddedMass;
        observer.waterPatch21AddedMass = addedMass;
        observer.waterPatch21EntrainedMass = entrainedMass;
        observer.waterPatch21Radiation = radiation;
        observer.waterPatch21IntoSurface = intoSurface;
        observer.waterPatch21Push = push;
        observer.waterPatch21Inertia = inertia;
        observer.waterPatch21Projection = projection;
        observer.waterPatch21WettedArea = wettedArea;
        observer.waterPatch21DeckWettedArea = deckWettedArea;
        observer.waterPatch21AddedMassPerArea = addedMassPerArea;
        observer.waterPatch21RadiationPerArea = radiationPerArea;
        observer.waterPatch21NuX = nuX;
        observer.waterPatch21NuY = nuY;
        observer.waterPatch21NuZ = nuZ;
        observer.waterPatch21ArmCrossNuX = armCrossNuX;
        observer.waterPatch21ArmCrossNuY = armCrossNuY;
        observer.waterPatch21ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch21ArmX = armX;
        observer.waterPatch21ArmY = armY;
        observer.waterPatch21ArmZ = armZ;
        observer.waterPatch21NormalX = normalX;
        observer.waterPatch21NormalY = normalY;
        observer.waterPatch21NormalZ = normalZ;
        observer.waterPatch21PositionX = positionX;
        observer.waterPatch21PositionY = positionY;
        observer.waterPatch21PositionZ = positionZ;
        observer.waterPatch21RelativeX = relativeX;
        observer.waterPatch21RelativeY = relativeY;
        observer.waterPatch21RelativeZ = relativeZ;
        observer.waterPatch21FlowX = flowX;
        observer.waterPatch21FlowY = flowY;
        observer.waterPatch21FlowZ = flowZ;
        observer.waterPatch21SurfaceY = surfaceY;
        observer.waterPatch21SlopeX = slopeX;
        observer.waterPatch21SlopeZ = slopeZ;
        observer.waterPatch21SampleNormalX = sampleNormalX;
        observer.waterPatch21SampleNormalY = sampleNormalY;
        observer.waterPatch21SampleNormalZ = sampleNormalZ;
        observer.waterPatch21WaterDepth = waterDepth;
        break;
      case 22:
        observer.waterPatch22OldAddedMass = oldAddedMass;
        observer.waterPatch22AddedMass = addedMass;
        observer.waterPatch22EntrainedMass = entrainedMass;
        observer.waterPatch22Radiation = radiation;
        observer.waterPatch22IntoSurface = intoSurface;
        observer.waterPatch22Push = push;
        observer.waterPatch22Inertia = inertia;
        observer.waterPatch22Projection = projection;
        observer.waterPatch22WettedArea = wettedArea;
        observer.waterPatch22DeckWettedArea = deckWettedArea;
        observer.waterPatch22AddedMassPerArea = addedMassPerArea;
        observer.waterPatch22RadiationPerArea = radiationPerArea;
        observer.waterPatch22NuX = nuX;
        observer.waterPatch22NuY = nuY;
        observer.waterPatch22NuZ = nuZ;
        observer.waterPatch22ArmCrossNuX = armCrossNuX;
        observer.waterPatch22ArmCrossNuY = armCrossNuY;
        observer.waterPatch22ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch22ArmX = armX;
        observer.waterPatch22ArmY = armY;
        observer.waterPatch22ArmZ = armZ;
        observer.waterPatch22NormalX = normalX;
        observer.waterPatch22NormalY = normalY;
        observer.waterPatch22NormalZ = normalZ;
        observer.waterPatch22PositionX = positionX;
        observer.waterPatch22PositionY = positionY;
        observer.waterPatch22PositionZ = positionZ;
        observer.waterPatch22RelativeX = relativeX;
        observer.waterPatch22RelativeY = relativeY;
        observer.waterPatch22RelativeZ = relativeZ;
        observer.waterPatch22FlowX = flowX;
        observer.waterPatch22FlowY = flowY;
        observer.waterPatch22FlowZ = flowZ;
        observer.waterPatch22SurfaceY = surfaceY;
        observer.waterPatch22SlopeX = slopeX;
        observer.waterPatch22SlopeZ = slopeZ;
        observer.waterPatch22SampleNormalX = sampleNormalX;
        observer.waterPatch22SampleNormalY = sampleNormalY;
        observer.waterPatch22SampleNormalZ = sampleNormalZ;
        observer.waterPatch22WaterDepth = waterDepth;
        break;
      case 23:
        observer.waterPatch23OldAddedMass = oldAddedMass;
        observer.waterPatch23AddedMass = addedMass;
        observer.waterPatch23EntrainedMass = entrainedMass;
        observer.waterPatch23Radiation = radiation;
        observer.waterPatch23IntoSurface = intoSurface;
        observer.waterPatch23Push = push;
        observer.waterPatch23Inertia = inertia;
        observer.waterPatch23Projection = projection;
        observer.waterPatch23WettedArea = wettedArea;
        observer.waterPatch23DeckWettedArea = deckWettedArea;
        observer.waterPatch23AddedMassPerArea = addedMassPerArea;
        observer.waterPatch23RadiationPerArea = radiationPerArea;
        observer.waterPatch23NuX = nuX;
        observer.waterPatch23NuY = nuY;
        observer.waterPatch23NuZ = nuZ;
        observer.waterPatch23ArmCrossNuX = armCrossNuX;
        observer.waterPatch23ArmCrossNuY = armCrossNuY;
        observer.waterPatch23ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch23ArmX = armX;
        observer.waterPatch23ArmY = armY;
        observer.waterPatch23ArmZ = armZ;
        observer.waterPatch23NormalX = normalX;
        observer.waterPatch23NormalY = normalY;
        observer.waterPatch23NormalZ = normalZ;
        observer.waterPatch23PositionX = positionX;
        observer.waterPatch23PositionY = positionY;
        observer.waterPatch23PositionZ = positionZ;
        observer.waterPatch23RelativeX = relativeX;
        observer.waterPatch23RelativeY = relativeY;
        observer.waterPatch23RelativeZ = relativeZ;
        observer.waterPatch23FlowX = flowX;
        observer.waterPatch23FlowY = flowY;
        observer.waterPatch23FlowZ = flowZ;
        observer.waterPatch23SurfaceY = surfaceY;
        observer.waterPatch23SlopeX = slopeX;
        observer.waterPatch23SlopeZ = slopeZ;
        observer.waterPatch23SampleNormalX = sampleNormalX;
        observer.waterPatch23SampleNormalY = sampleNormalY;
        observer.waterPatch23SampleNormalZ = sampleNormalZ;
        observer.waterPatch23WaterDepth = waterDepth;
        break;
      case 24:
        observer.waterPatch24OldAddedMass = oldAddedMass;
        observer.waterPatch24AddedMass = addedMass;
        observer.waterPatch24EntrainedMass = entrainedMass;
        observer.waterPatch24Radiation = radiation;
        observer.waterPatch24IntoSurface = intoSurface;
        observer.waterPatch24Push = push;
        observer.waterPatch24Inertia = inertia;
        observer.waterPatch24Projection = projection;
        observer.waterPatch24WettedArea = wettedArea;
        observer.waterPatch24DeckWettedArea = deckWettedArea;
        observer.waterPatch24AddedMassPerArea = addedMassPerArea;
        observer.waterPatch24RadiationPerArea = radiationPerArea;
        observer.waterPatch24NuX = nuX;
        observer.waterPatch24NuY = nuY;
        observer.waterPatch24NuZ = nuZ;
        observer.waterPatch24ArmCrossNuX = armCrossNuX;
        observer.waterPatch24ArmCrossNuY = armCrossNuY;
        observer.waterPatch24ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch24ArmX = armX;
        observer.waterPatch24ArmY = armY;
        observer.waterPatch24ArmZ = armZ;
        observer.waterPatch24NormalX = normalX;
        observer.waterPatch24NormalY = normalY;
        observer.waterPatch24NormalZ = normalZ;
        observer.waterPatch24PositionX = positionX;
        observer.waterPatch24PositionY = positionY;
        observer.waterPatch24PositionZ = positionZ;
        observer.waterPatch24RelativeX = relativeX;
        observer.waterPatch24RelativeY = relativeY;
        observer.waterPatch24RelativeZ = relativeZ;
        observer.waterPatch24FlowX = flowX;
        observer.waterPatch24FlowY = flowY;
        observer.waterPatch24FlowZ = flowZ;
        observer.waterPatch24SurfaceY = surfaceY;
        observer.waterPatch24SlopeX = slopeX;
        observer.waterPatch24SlopeZ = slopeZ;
        observer.waterPatch24SampleNormalX = sampleNormalX;
        observer.waterPatch24SampleNormalY = sampleNormalY;
        observer.waterPatch24SampleNormalZ = sampleNormalZ;
        observer.waterPatch24WaterDepth = waterDepth;
        break;
      case 25:
        observer.waterPatch25OldAddedMass = oldAddedMass;
        observer.waterPatch25AddedMass = addedMass;
        observer.waterPatch25EntrainedMass = entrainedMass;
        observer.waterPatch25Radiation = radiation;
        observer.waterPatch25IntoSurface = intoSurface;
        observer.waterPatch25Push = push;
        observer.waterPatch25Inertia = inertia;
        observer.waterPatch25Projection = projection;
        observer.waterPatch25WettedArea = wettedArea;
        observer.waterPatch25DeckWettedArea = deckWettedArea;
        observer.waterPatch25AddedMassPerArea = addedMassPerArea;
        observer.waterPatch25RadiationPerArea = radiationPerArea;
        observer.waterPatch25NuX = nuX;
        observer.waterPatch25NuY = nuY;
        observer.waterPatch25NuZ = nuZ;
        observer.waterPatch25ArmCrossNuX = armCrossNuX;
        observer.waterPatch25ArmCrossNuY = armCrossNuY;
        observer.waterPatch25ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch25ArmX = armX;
        observer.waterPatch25ArmY = armY;
        observer.waterPatch25ArmZ = armZ;
        observer.waterPatch25NormalX = normalX;
        observer.waterPatch25NormalY = normalY;
        observer.waterPatch25NormalZ = normalZ;
        observer.waterPatch25PositionX = positionX;
        observer.waterPatch25PositionY = positionY;
        observer.waterPatch25PositionZ = positionZ;
        observer.waterPatch25RelativeX = relativeX;
        observer.waterPatch25RelativeY = relativeY;
        observer.waterPatch25RelativeZ = relativeZ;
        observer.waterPatch25FlowX = flowX;
        observer.waterPatch25FlowY = flowY;
        observer.waterPatch25FlowZ = flowZ;
        observer.waterPatch25SurfaceY = surfaceY;
        observer.waterPatch25SlopeX = slopeX;
        observer.waterPatch25SlopeZ = slopeZ;
        observer.waterPatch25SampleNormalX = sampleNormalX;
        observer.waterPatch25SampleNormalY = sampleNormalY;
        observer.waterPatch25SampleNormalZ = sampleNormalZ;
        observer.waterPatch25WaterDepth = waterDepth;
        break;
      case 26:
        observer.waterPatch26OldAddedMass = oldAddedMass;
        observer.waterPatch26AddedMass = addedMass;
        observer.waterPatch26EntrainedMass = entrainedMass;
        observer.waterPatch26Radiation = radiation;
        observer.waterPatch26IntoSurface = intoSurface;
        observer.waterPatch26Push = push;
        observer.waterPatch26Inertia = inertia;
        observer.waterPatch26Projection = projection;
        observer.waterPatch26WettedArea = wettedArea;
        observer.waterPatch26DeckWettedArea = deckWettedArea;
        observer.waterPatch26AddedMassPerArea = addedMassPerArea;
        observer.waterPatch26RadiationPerArea = radiationPerArea;
        observer.waterPatch26NuX = nuX;
        observer.waterPatch26NuY = nuY;
        observer.waterPatch26NuZ = nuZ;
        observer.waterPatch26ArmCrossNuX = armCrossNuX;
        observer.waterPatch26ArmCrossNuY = armCrossNuY;
        observer.waterPatch26ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch26ArmX = armX;
        observer.waterPatch26ArmY = armY;
        observer.waterPatch26ArmZ = armZ;
        observer.waterPatch26NormalX = normalX;
        observer.waterPatch26NormalY = normalY;
        observer.waterPatch26NormalZ = normalZ;
        observer.waterPatch26PositionX = positionX;
        observer.waterPatch26PositionY = positionY;
        observer.waterPatch26PositionZ = positionZ;
        observer.waterPatch26RelativeX = relativeX;
        observer.waterPatch26RelativeY = relativeY;
        observer.waterPatch26RelativeZ = relativeZ;
        observer.waterPatch26FlowX = flowX;
        observer.waterPatch26FlowY = flowY;
        observer.waterPatch26FlowZ = flowZ;
        observer.waterPatch26SurfaceY = surfaceY;
        observer.waterPatch26SlopeX = slopeX;
        observer.waterPatch26SlopeZ = slopeZ;
        observer.waterPatch26SampleNormalX = sampleNormalX;
        observer.waterPatch26SampleNormalY = sampleNormalY;
        observer.waterPatch26SampleNormalZ = sampleNormalZ;
        observer.waterPatch26WaterDepth = waterDepth;
        break;
      case 27:
        observer.waterPatch27OldAddedMass = oldAddedMass;
        observer.waterPatch27AddedMass = addedMass;
        observer.waterPatch27EntrainedMass = entrainedMass;
        observer.waterPatch27Radiation = radiation;
        observer.waterPatch27IntoSurface = intoSurface;
        observer.waterPatch27Push = push;
        observer.waterPatch27Inertia = inertia;
        observer.waterPatch27Projection = projection;
        observer.waterPatch27WettedArea = wettedArea;
        observer.waterPatch27DeckWettedArea = deckWettedArea;
        observer.waterPatch27AddedMassPerArea = addedMassPerArea;
        observer.waterPatch27RadiationPerArea = radiationPerArea;
        observer.waterPatch27NuX = nuX;
        observer.waterPatch27NuY = nuY;
        observer.waterPatch27NuZ = nuZ;
        observer.waterPatch27ArmCrossNuX = armCrossNuX;
        observer.waterPatch27ArmCrossNuY = armCrossNuY;
        observer.waterPatch27ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch27ArmX = armX;
        observer.waterPatch27ArmY = armY;
        observer.waterPatch27ArmZ = armZ;
        observer.waterPatch27NormalX = normalX;
        observer.waterPatch27NormalY = normalY;
        observer.waterPatch27NormalZ = normalZ;
        observer.waterPatch27PositionX = positionX;
        observer.waterPatch27PositionY = positionY;
        observer.waterPatch27PositionZ = positionZ;
        observer.waterPatch27RelativeX = relativeX;
        observer.waterPatch27RelativeY = relativeY;
        observer.waterPatch27RelativeZ = relativeZ;
        observer.waterPatch27FlowX = flowX;
        observer.waterPatch27FlowY = flowY;
        observer.waterPatch27FlowZ = flowZ;
        observer.waterPatch27SurfaceY = surfaceY;
        observer.waterPatch27SlopeX = slopeX;
        observer.waterPatch27SlopeZ = slopeZ;
        observer.waterPatch27SampleNormalX = sampleNormalX;
        observer.waterPatch27SampleNormalY = sampleNormalY;
        observer.waterPatch27SampleNormalZ = sampleNormalZ;
        observer.waterPatch27WaterDepth = waterDepth;
        break;
      case 28:
        observer.waterPatch28OldAddedMass = oldAddedMass;
        observer.waterPatch28AddedMass = addedMass;
        observer.waterPatch28EntrainedMass = entrainedMass;
        observer.waterPatch28Radiation = radiation;
        observer.waterPatch28IntoSurface = intoSurface;
        observer.waterPatch28Push = push;
        observer.waterPatch28Inertia = inertia;
        observer.waterPatch28Projection = projection;
        observer.waterPatch28WettedArea = wettedArea;
        observer.waterPatch28DeckWettedArea = deckWettedArea;
        observer.waterPatch28AddedMassPerArea = addedMassPerArea;
        observer.waterPatch28RadiationPerArea = radiationPerArea;
        observer.waterPatch28NuX = nuX;
        observer.waterPatch28NuY = nuY;
        observer.waterPatch28NuZ = nuZ;
        observer.waterPatch28ArmCrossNuX = armCrossNuX;
        observer.waterPatch28ArmCrossNuY = armCrossNuY;
        observer.waterPatch28ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch28ArmX = armX;
        observer.waterPatch28ArmY = armY;
        observer.waterPatch28ArmZ = armZ;
        observer.waterPatch28NormalX = normalX;
        observer.waterPatch28NormalY = normalY;
        observer.waterPatch28NormalZ = normalZ;
        observer.waterPatch28PositionX = positionX;
        observer.waterPatch28PositionY = positionY;
        observer.waterPatch28PositionZ = positionZ;
        observer.waterPatch28RelativeX = relativeX;
        observer.waterPatch28RelativeY = relativeY;
        observer.waterPatch28RelativeZ = relativeZ;
        observer.waterPatch28FlowX = flowX;
        observer.waterPatch28FlowY = flowY;
        observer.waterPatch28FlowZ = flowZ;
        observer.waterPatch28SurfaceY = surfaceY;
        observer.waterPatch28SlopeX = slopeX;
        observer.waterPatch28SlopeZ = slopeZ;
        observer.waterPatch28SampleNormalX = sampleNormalX;
        observer.waterPatch28SampleNormalY = sampleNormalY;
        observer.waterPatch28SampleNormalZ = sampleNormalZ;
        observer.waterPatch28WaterDepth = waterDepth;
        break;
      case 29:
        observer.waterPatch29OldAddedMass = oldAddedMass;
        observer.waterPatch29AddedMass = addedMass;
        observer.waterPatch29EntrainedMass = entrainedMass;
        observer.waterPatch29Radiation = radiation;
        observer.waterPatch29IntoSurface = intoSurface;
        observer.waterPatch29Push = push;
        observer.waterPatch29Inertia = inertia;
        observer.waterPatch29Projection = projection;
        observer.waterPatch29WettedArea = wettedArea;
        observer.waterPatch29DeckWettedArea = deckWettedArea;
        observer.waterPatch29AddedMassPerArea = addedMassPerArea;
        observer.waterPatch29RadiationPerArea = radiationPerArea;
        observer.waterPatch29NuX = nuX;
        observer.waterPatch29NuY = nuY;
        observer.waterPatch29NuZ = nuZ;
        observer.waterPatch29ArmCrossNuX = armCrossNuX;
        observer.waterPatch29ArmCrossNuY = armCrossNuY;
        observer.waterPatch29ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch29ArmX = armX;
        observer.waterPatch29ArmY = armY;
        observer.waterPatch29ArmZ = armZ;
        observer.waterPatch29NormalX = normalX;
        observer.waterPatch29NormalY = normalY;
        observer.waterPatch29NormalZ = normalZ;
        observer.waterPatch29PositionX = positionX;
        observer.waterPatch29PositionY = positionY;
        observer.waterPatch29PositionZ = positionZ;
        observer.waterPatch29RelativeX = relativeX;
        observer.waterPatch29RelativeY = relativeY;
        observer.waterPatch29RelativeZ = relativeZ;
        observer.waterPatch29FlowX = flowX;
        observer.waterPatch29FlowY = flowY;
        observer.waterPatch29FlowZ = flowZ;
        observer.waterPatch29SurfaceY = surfaceY;
        observer.waterPatch29SlopeX = slopeX;
        observer.waterPatch29SlopeZ = slopeZ;
        observer.waterPatch29SampleNormalX = sampleNormalX;
        observer.waterPatch29SampleNormalY = sampleNormalY;
        observer.waterPatch29SampleNormalZ = sampleNormalZ;
        observer.waterPatch29WaterDepth = waterDepth;
        break;
      case 30:
        observer.waterPatch30OldAddedMass = oldAddedMass;
        observer.waterPatch30AddedMass = addedMass;
        observer.waterPatch30EntrainedMass = entrainedMass;
        observer.waterPatch30Radiation = radiation;
        observer.waterPatch30IntoSurface = intoSurface;
        observer.waterPatch30Push = push;
        observer.waterPatch30Inertia = inertia;
        observer.waterPatch30Projection = projection;
        observer.waterPatch30WettedArea = wettedArea;
        observer.waterPatch30DeckWettedArea = deckWettedArea;
        observer.waterPatch30AddedMassPerArea = addedMassPerArea;
        observer.waterPatch30RadiationPerArea = radiationPerArea;
        observer.waterPatch30NuX = nuX;
        observer.waterPatch30NuY = nuY;
        observer.waterPatch30NuZ = nuZ;
        observer.waterPatch30ArmCrossNuX = armCrossNuX;
        observer.waterPatch30ArmCrossNuY = armCrossNuY;
        observer.waterPatch30ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch30ArmX = armX;
        observer.waterPatch30ArmY = armY;
        observer.waterPatch30ArmZ = armZ;
        observer.waterPatch30NormalX = normalX;
        observer.waterPatch30NormalY = normalY;
        observer.waterPatch30NormalZ = normalZ;
        observer.waterPatch30PositionX = positionX;
        observer.waterPatch30PositionY = positionY;
        observer.waterPatch30PositionZ = positionZ;
        observer.waterPatch30RelativeX = relativeX;
        observer.waterPatch30RelativeY = relativeY;
        observer.waterPatch30RelativeZ = relativeZ;
        observer.waterPatch30FlowX = flowX;
        observer.waterPatch30FlowY = flowY;
        observer.waterPatch30FlowZ = flowZ;
        observer.waterPatch30SurfaceY = surfaceY;
        observer.waterPatch30SlopeX = slopeX;
        observer.waterPatch30SlopeZ = slopeZ;
        observer.waterPatch30SampleNormalX = sampleNormalX;
        observer.waterPatch30SampleNormalY = sampleNormalY;
        observer.waterPatch30SampleNormalZ = sampleNormalZ;
        observer.waterPatch30WaterDepth = waterDepth;
        break;
      case 31:
        observer.waterPatch31OldAddedMass = oldAddedMass;
        observer.waterPatch31AddedMass = addedMass;
        observer.waterPatch31EntrainedMass = entrainedMass;
        observer.waterPatch31Radiation = radiation;
        observer.waterPatch31IntoSurface = intoSurface;
        observer.waterPatch31Push = push;
        observer.waterPatch31Inertia = inertia;
        observer.waterPatch31Projection = projection;
        observer.waterPatch31WettedArea = wettedArea;
        observer.waterPatch31DeckWettedArea = deckWettedArea;
        observer.waterPatch31AddedMassPerArea = addedMassPerArea;
        observer.waterPatch31RadiationPerArea = radiationPerArea;
        observer.waterPatch31NuX = nuX;
        observer.waterPatch31NuY = nuY;
        observer.waterPatch31NuZ = nuZ;
        observer.waterPatch31ArmCrossNuX = armCrossNuX;
        observer.waterPatch31ArmCrossNuY = armCrossNuY;
        observer.waterPatch31ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch31ArmX = armX;
        observer.waterPatch31ArmY = armY;
        observer.waterPatch31ArmZ = armZ;
        observer.waterPatch31NormalX = normalX;
        observer.waterPatch31NormalY = normalY;
        observer.waterPatch31NormalZ = normalZ;
        observer.waterPatch31PositionX = positionX;
        observer.waterPatch31PositionY = positionY;
        observer.waterPatch31PositionZ = positionZ;
        observer.waterPatch31RelativeX = relativeX;
        observer.waterPatch31RelativeY = relativeY;
        observer.waterPatch31RelativeZ = relativeZ;
        observer.waterPatch31FlowX = flowX;
        observer.waterPatch31FlowY = flowY;
        observer.waterPatch31FlowZ = flowZ;
        observer.waterPatch31SurfaceY = surfaceY;
        observer.waterPatch31SlopeX = slopeX;
        observer.waterPatch31SlopeZ = slopeZ;
        observer.waterPatch31SampleNormalX = sampleNormalX;
        observer.waterPatch31SampleNormalY = sampleNormalY;
        observer.waterPatch31SampleNormalZ = sampleNormalZ;
        observer.waterPatch31WaterDepth = waterDepth;
        break;
      case 32:
        observer.waterPatch32OldAddedMass = oldAddedMass;
        observer.waterPatch32AddedMass = addedMass;
        observer.waterPatch32EntrainedMass = entrainedMass;
        observer.waterPatch32Radiation = radiation;
        observer.waterPatch32IntoSurface = intoSurface;
        observer.waterPatch32Push = push;
        observer.waterPatch32Inertia = inertia;
        observer.waterPatch32Projection = projection;
        observer.waterPatch32WettedArea = wettedArea;
        observer.waterPatch32DeckWettedArea = deckWettedArea;
        observer.waterPatch32AddedMassPerArea = addedMassPerArea;
        observer.waterPatch32RadiationPerArea = radiationPerArea;
        observer.waterPatch32NuX = nuX;
        observer.waterPatch32NuY = nuY;
        observer.waterPatch32NuZ = nuZ;
        observer.waterPatch32ArmCrossNuX = armCrossNuX;
        observer.waterPatch32ArmCrossNuY = armCrossNuY;
        observer.waterPatch32ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch32ArmX = armX;
        observer.waterPatch32ArmY = armY;
        observer.waterPatch32ArmZ = armZ;
        observer.waterPatch32NormalX = normalX;
        observer.waterPatch32NormalY = normalY;
        observer.waterPatch32NormalZ = normalZ;
        observer.waterPatch32PositionX = positionX;
        observer.waterPatch32PositionY = positionY;
        observer.waterPatch32PositionZ = positionZ;
        observer.waterPatch32RelativeX = relativeX;
        observer.waterPatch32RelativeY = relativeY;
        observer.waterPatch32RelativeZ = relativeZ;
        observer.waterPatch32FlowX = flowX;
        observer.waterPatch32FlowY = flowY;
        observer.waterPatch32FlowZ = flowZ;
        observer.waterPatch32SurfaceY = surfaceY;
        observer.waterPatch32SlopeX = slopeX;
        observer.waterPatch32SlopeZ = slopeZ;
        observer.waterPatch32SampleNormalX = sampleNormalX;
        observer.waterPatch32SampleNormalY = sampleNormalY;
        observer.waterPatch32SampleNormalZ = sampleNormalZ;
        observer.waterPatch32WaterDepth = waterDepth;
        break;
      case 33:
        observer.waterPatch33OldAddedMass = oldAddedMass;
        observer.waterPatch33AddedMass = addedMass;
        observer.waterPatch33EntrainedMass = entrainedMass;
        observer.waterPatch33Radiation = radiation;
        observer.waterPatch33IntoSurface = intoSurface;
        observer.waterPatch33Push = push;
        observer.waterPatch33Inertia = inertia;
        observer.waterPatch33Projection = projection;
        observer.waterPatch33WettedArea = wettedArea;
        observer.waterPatch33DeckWettedArea = deckWettedArea;
        observer.waterPatch33AddedMassPerArea = addedMassPerArea;
        observer.waterPatch33RadiationPerArea = radiationPerArea;
        observer.waterPatch33NuX = nuX;
        observer.waterPatch33NuY = nuY;
        observer.waterPatch33NuZ = nuZ;
        observer.waterPatch33ArmCrossNuX = armCrossNuX;
        observer.waterPatch33ArmCrossNuY = armCrossNuY;
        observer.waterPatch33ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch33ArmX = armX;
        observer.waterPatch33ArmY = armY;
        observer.waterPatch33ArmZ = armZ;
        observer.waterPatch33NormalX = normalX;
        observer.waterPatch33NormalY = normalY;
        observer.waterPatch33NormalZ = normalZ;
        observer.waterPatch33PositionX = positionX;
        observer.waterPatch33PositionY = positionY;
        observer.waterPatch33PositionZ = positionZ;
        observer.waterPatch33RelativeX = relativeX;
        observer.waterPatch33RelativeY = relativeY;
        observer.waterPatch33RelativeZ = relativeZ;
        observer.waterPatch33FlowX = flowX;
        observer.waterPatch33FlowY = flowY;
        observer.waterPatch33FlowZ = flowZ;
        observer.waterPatch33SurfaceY = surfaceY;
        observer.waterPatch33SlopeX = slopeX;
        observer.waterPatch33SlopeZ = slopeZ;
        observer.waterPatch33SampleNormalX = sampleNormalX;
        observer.waterPatch33SampleNormalY = sampleNormalY;
        observer.waterPatch33SampleNormalZ = sampleNormalZ;
        observer.waterPatch33WaterDepth = waterDepth;
        break;
      case 34:
        observer.waterPatch34OldAddedMass = oldAddedMass;
        observer.waterPatch34AddedMass = addedMass;
        observer.waterPatch34EntrainedMass = entrainedMass;
        observer.waterPatch34Radiation = radiation;
        observer.waterPatch34IntoSurface = intoSurface;
        observer.waterPatch34Push = push;
        observer.waterPatch34Inertia = inertia;
        observer.waterPatch34Projection = projection;
        observer.waterPatch34WettedArea = wettedArea;
        observer.waterPatch34DeckWettedArea = deckWettedArea;
        observer.waterPatch34AddedMassPerArea = addedMassPerArea;
        observer.waterPatch34RadiationPerArea = radiationPerArea;
        observer.waterPatch34NuX = nuX;
        observer.waterPatch34NuY = nuY;
        observer.waterPatch34NuZ = nuZ;
        observer.waterPatch34ArmCrossNuX = armCrossNuX;
        observer.waterPatch34ArmCrossNuY = armCrossNuY;
        observer.waterPatch34ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch34ArmX = armX;
        observer.waterPatch34ArmY = armY;
        observer.waterPatch34ArmZ = armZ;
        observer.waterPatch34NormalX = normalX;
        observer.waterPatch34NormalY = normalY;
        observer.waterPatch34NormalZ = normalZ;
        observer.waterPatch34PositionX = positionX;
        observer.waterPatch34PositionY = positionY;
        observer.waterPatch34PositionZ = positionZ;
        observer.waterPatch34RelativeX = relativeX;
        observer.waterPatch34RelativeY = relativeY;
        observer.waterPatch34RelativeZ = relativeZ;
        observer.waterPatch34FlowX = flowX;
        observer.waterPatch34FlowY = flowY;
        observer.waterPatch34FlowZ = flowZ;
        observer.waterPatch34SurfaceY = surfaceY;
        observer.waterPatch34SlopeX = slopeX;
        observer.waterPatch34SlopeZ = slopeZ;
        observer.waterPatch34SampleNormalX = sampleNormalX;
        observer.waterPatch34SampleNormalY = sampleNormalY;
        observer.waterPatch34SampleNormalZ = sampleNormalZ;
        observer.waterPatch34WaterDepth = waterDepth;
        break;
      case 35:
        observer.waterPatch35OldAddedMass = oldAddedMass;
        observer.waterPatch35AddedMass = addedMass;
        observer.waterPatch35EntrainedMass = entrainedMass;
        observer.waterPatch35Radiation = radiation;
        observer.waterPatch35IntoSurface = intoSurface;
        observer.waterPatch35Push = push;
        observer.waterPatch35Inertia = inertia;
        observer.waterPatch35Projection = projection;
        observer.waterPatch35WettedArea = wettedArea;
        observer.waterPatch35DeckWettedArea = deckWettedArea;
        observer.waterPatch35AddedMassPerArea = addedMassPerArea;
        observer.waterPatch35RadiationPerArea = radiationPerArea;
        observer.waterPatch35NuX = nuX;
        observer.waterPatch35NuY = nuY;
        observer.waterPatch35NuZ = nuZ;
        observer.waterPatch35ArmCrossNuX = armCrossNuX;
        observer.waterPatch35ArmCrossNuY = armCrossNuY;
        observer.waterPatch35ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch35ArmX = armX;
        observer.waterPatch35ArmY = armY;
        observer.waterPatch35ArmZ = armZ;
        observer.waterPatch35NormalX = normalX;
        observer.waterPatch35NormalY = normalY;
        observer.waterPatch35NormalZ = normalZ;
        observer.waterPatch35PositionX = positionX;
        observer.waterPatch35PositionY = positionY;
        observer.waterPatch35PositionZ = positionZ;
        observer.waterPatch35RelativeX = relativeX;
        observer.waterPatch35RelativeY = relativeY;
        observer.waterPatch35RelativeZ = relativeZ;
        observer.waterPatch35FlowX = flowX;
        observer.waterPatch35FlowY = flowY;
        observer.waterPatch35FlowZ = flowZ;
        observer.waterPatch35SurfaceY = surfaceY;
        observer.waterPatch35SlopeX = slopeX;
        observer.waterPatch35SlopeZ = slopeZ;
        observer.waterPatch35SampleNormalX = sampleNormalX;
        observer.waterPatch35SampleNormalY = sampleNormalY;
        observer.waterPatch35SampleNormalZ = sampleNormalZ;
        observer.waterPatch35WaterDepth = waterDepth;
        break;
      case 36:
        observer.waterPatch36OldAddedMass = oldAddedMass;
        observer.waterPatch36AddedMass = addedMass;
        observer.waterPatch36EntrainedMass = entrainedMass;
        observer.waterPatch36Radiation = radiation;
        observer.waterPatch36IntoSurface = intoSurface;
        observer.waterPatch36Push = push;
        observer.waterPatch36Inertia = inertia;
        observer.waterPatch36Projection = projection;
        observer.waterPatch36WettedArea = wettedArea;
        observer.waterPatch36DeckWettedArea = deckWettedArea;
        observer.waterPatch36AddedMassPerArea = addedMassPerArea;
        observer.waterPatch36RadiationPerArea = radiationPerArea;
        observer.waterPatch36NuX = nuX;
        observer.waterPatch36NuY = nuY;
        observer.waterPatch36NuZ = nuZ;
        observer.waterPatch36ArmCrossNuX = armCrossNuX;
        observer.waterPatch36ArmCrossNuY = armCrossNuY;
        observer.waterPatch36ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch36ArmX = armX;
        observer.waterPatch36ArmY = armY;
        observer.waterPatch36ArmZ = armZ;
        observer.waterPatch36NormalX = normalX;
        observer.waterPatch36NormalY = normalY;
        observer.waterPatch36NormalZ = normalZ;
        observer.waterPatch36PositionX = positionX;
        observer.waterPatch36PositionY = positionY;
        observer.waterPatch36PositionZ = positionZ;
        observer.waterPatch36RelativeX = relativeX;
        observer.waterPatch36RelativeY = relativeY;
        observer.waterPatch36RelativeZ = relativeZ;
        observer.waterPatch36FlowX = flowX;
        observer.waterPatch36FlowY = flowY;
        observer.waterPatch36FlowZ = flowZ;
        observer.waterPatch36SurfaceY = surfaceY;
        observer.waterPatch36SlopeX = slopeX;
        observer.waterPatch36SlopeZ = slopeZ;
        observer.waterPatch36SampleNormalX = sampleNormalX;
        observer.waterPatch36SampleNormalY = sampleNormalY;
        observer.waterPatch36SampleNormalZ = sampleNormalZ;
        observer.waterPatch36WaterDepth = waterDepth;
        break;
      case 37:
        observer.waterPatch37OldAddedMass = oldAddedMass;
        observer.waterPatch37AddedMass = addedMass;
        observer.waterPatch37EntrainedMass = entrainedMass;
        observer.waterPatch37Radiation = radiation;
        observer.waterPatch37IntoSurface = intoSurface;
        observer.waterPatch37Push = push;
        observer.waterPatch37Inertia = inertia;
        observer.waterPatch37Projection = projection;
        observer.waterPatch37WettedArea = wettedArea;
        observer.waterPatch37DeckWettedArea = deckWettedArea;
        observer.waterPatch37AddedMassPerArea = addedMassPerArea;
        observer.waterPatch37RadiationPerArea = radiationPerArea;
        observer.waterPatch37NuX = nuX;
        observer.waterPatch37NuY = nuY;
        observer.waterPatch37NuZ = nuZ;
        observer.waterPatch37ArmCrossNuX = armCrossNuX;
        observer.waterPatch37ArmCrossNuY = armCrossNuY;
        observer.waterPatch37ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch37ArmX = armX;
        observer.waterPatch37ArmY = armY;
        observer.waterPatch37ArmZ = armZ;
        observer.waterPatch37NormalX = normalX;
        observer.waterPatch37NormalY = normalY;
        observer.waterPatch37NormalZ = normalZ;
        observer.waterPatch37PositionX = positionX;
        observer.waterPatch37PositionY = positionY;
        observer.waterPatch37PositionZ = positionZ;
        observer.waterPatch37RelativeX = relativeX;
        observer.waterPatch37RelativeY = relativeY;
        observer.waterPatch37RelativeZ = relativeZ;
        observer.waterPatch37FlowX = flowX;
        observer.waterPatch37FlowY = flowY;
        observer.waterPatch37FlowZ = flowZ;
        observer.waterPatch37SurfaceY = surfaceY;
        observer.waterPatch37SlopeX = slopeX;
        observer.waterPatch37SlopeZ = slopeZ;
        observer.waterPatch37SampleNormalX = sampleNormalX;
        observer.waterPatch37SampleNormalY = sampleNormalY;
        observer.waterPatch37SampleNormalZ = sampleNormalZ;
        observer.waterPatch37WaterDepth = waterDepth;
        break;
      case 38:
        observer.waterPatch38OldAddedMass = oldAddedMass;
        observer.waterPatch38AddedMass = addedMass;
        observer.waterPatch38EntrainedMass = entrainedMass;
        observer.waterPatch38Radiation = radiation;
        observer.waterPatch38IntoSurface = intoSurface;
        observer.waterPatch38Push = push;
        observer.waterPatch38Inertia = inertia;
        observer.waterPatch38Projection = projection;
        observer.waterPatch38WettedArea = wettedArea;
        observer.waterPatch38DeckWettedArea = deckWettedArea;
        observer.waterPatch38AddedMassPerArea = addedMassPerArea;
        observer.waterPatch38RadiationPerArea = radiationPerArea;
        observer.waterPatch38NuX = nuX;
        observer.waterPatch38NuY = nuY;
        observer.waterPatch38NuZ = nuZ;
        observer.waterPatch38ArmCrossNuX = armCrossNuX;
        observer.waterPatch38ArmCrossNuY = armCrossNuY;
        observer.waterPatch38ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch38ArmX = armX;
        observer.waterPatch38ArmY = armY;
        observer.waterPatch38ArmZ = armZ;
        observer.waterPatch38NormalX = normalX;
        observer.waterPatch38NormalY = normalY;
        observer.waterPatch38NormalZ = normalZ;
        observer.waterPatch38PositionX = positionX;
        observer.waterPatch38PositionY = positionY;
        observer.waterPatch38PositionZ = positionZ;
        observer.waterPatch38RelativeX = relativeX;
        observer.waterPatch38RelativeY = relativeY;
        observer.waterPatch38RelativeZ = relativeZ;
        observer.waterPatch38FlowX = flowX;
        observer.waterPatch38FlowY = flowY;
        observer.waterPatch38FlowZ = flowZ;
        observer.waterPatch38SurfaceY = surfaceY;
        observer.waterPatch38SlopeX = slopeX;
        observer.waterPatch38SlopeZ = slopeZ;
        observer.waterPatch38SampleNormalX = sampleNormalX;
        observer.waterPatch38SampleNormalY = sampleNormalY;
        observer.waterPatch38SampleNormalZ = sampleNormalZ;
        observer.waterPatch38WaterDepth = waterDepth;
        break;
      case 39:
        observer.waterPatch39OldAddedMass = oldAddedMass;
        observer.waterPatch39AddedMass = addedMass;
        observer.waterPatch39EntrainedMass = entrainedMass;
        observer.waterPatch39Radiation = radiation;
        observer.waterPatch39IntoSurface = intoSurface;
        observer.waterPatch39Push = push;
        observer.waterPatch39Inertia = inertia;
        observer.waterPatch39Projection = projection;
        observer.waterPatch39WettedArea = wettedArea;
        observer.waterPatch39DeckWettedArea = deckWettedArea;
        observer.waterPatch39AddedMassPerArea = addedMassPerArea;
        observer.waterPatch39RadiationPerArea = radiationPerArea;
        observer.waterPatch39NuX = nuX;
        observer.waterPatch39NuY = nuY;
        observer.waterPatch39NuZ = nuZ;
        observer.waterPatch39ArmCrossNuX = armCrossNuX;
        observer.waterPatch39ArmCrossNuY = armCrossNuY;
        observer.waterPatch39ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch39ArmX = armX;
        observer.waterPatch39ArmY = armY;
        observer.waterPatch39ArmZ = armZ;
        observer.waterPatch39NormalX = normalX;
        observer.waterPatch39NormalY = normalY;
        observer.waterPatch39NormalZ = normalZ;
        observer.waterPatch39PositionX = positionX;
        observer.waterPatch39PositionY = positionY;
        observer.waterPatch39PositionZ = positionZ;
        observer.waterPatch39RelativeX = relativeX;
        observer.waterPatch39RelativeY = relativeY;
        observer.waterPatch39RelativeZ = relativeZ;
        observer.waterPatch39FlowX = flowX;
        observer.waterPatch39FlowY = flowY;
        observer.waterPatch39FlowZ = flowZ;
        observer.waterPatch39SurfaceY = surfaceY;
        observer.waterPatch39SlopeX = slopeX;
        observer.waterPatch39SlopeZ = slopeZ;
        observer.waterPatch39SampleNormalX = sampleNormalX;
        observer.waterPatch39SampleNormalY = sampleNormalY;
        observer.waterPatch39SampleNormalZ = sampleNormalZ;
        observer.waterPatch39WaterDepth = waterDepth;
        break;
      case 40:
        observer.waterPatch40OldAddedMass = oldAddedMass;
        observer.waterPatch40AddedMass = addedMass;
        observer.waterPatch40EntrainedMass = entrainedMass;
        observer.waterPatch40Radiation = radiation;
        observer.waterPatch40IntoSurface = intoSurface;
        observer.waterPatch40Push = push;
        observer.waterPatch40Inertia = inertia;
        observer.waterPatch40Projection = projection;
        observer.waterPatch40WettedArea = wettedArea;
        observer.waterPatch40DeckWettedArea = deckWettedArea;
        observer.waterPatch40AddedMassPerArea = addedMassPerArea;
        observer.waterPatch40RadiationPerArea = radiationPerArea;
        observer.waterPatch40NuX = nuX;
        observer.waterPatch40NuY = nuY;
        observer.waterPatch40NuZ = nuZ;
        observer.waterPatch40ArmCrossNuX = armCrossNuX;
        observer.waterPatch40ArmCrossNuY = armCrossNuY;
        observer.waterPatch40ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch40ArmX = armX;
        observer.waterPatch40ArmY = armY;
        observer.waterPatch40ArmZ = armZ;
        observer.waterPatch40NormalX = normalX;
        observer.waterPatch40NormalY = normalY;
        observer.waterPatch40NormalZ = normalZ;
        observer.waterPatch40PositionX = positionX;
        observer.waterPatch40PositionY = positionY;
        observer.waterPatch40PositionZ = positionZ;
        observer.waterPatch40RelativeX = relativeX;
        observer.waterPatch40RelativeY = relativeY;
        observer.waterPatch40RelativeZ = relativeZ;
        observer.waterPatch40FlowX = flowX;
        observer.waterPatch40FlowY = flowY;
        observer.waterPatch40FlowZ = flowZ;
        observer.waterPatch40SurfaceY = surfaceY;
        observer.waterPatch40SlopeX = slopeX;
        observer.waterPatch40SlopeZ = slopeZ;
        observer.waterPatch40SampleNormalX = sampleNormalX;
        observer.waterPatch40SampleNormalY = sampleNormalY;
        observer.waterPatch40SampleNormalZ = sampleNormalZ;
        observer.waterPatch40WaterDepth = waterDepth;
        break;
      case 41:
        observer.waterPatch41OldAddedMass = oldAddedMass;
        observer.waterPatch41AddedMass = addedMass;
        observer.waterPatch41EntrainedMass = entrainedMass;
        observer.waterPatch41Radiation = radiation;
        observer.waterPatch41IntoSurface = intoSurface;
        observer.waterPatch41Push = push;
        observer.waterPatch41Inertia = inertia;
        observer.waterPatch41Projection = projection;
        observer.waterPatch41WettedArea = wettedArea;
        observer.waterPatch41DeckWettedArea = deckWettedArea;
        observer.waterPatch41AddedMassPerArea = addedMassPerArea;
        observer.waterPatch41RadiationPerArea = radiationPerArea;
        observer.waterPatch41NuX = nuX;
        observer.waterPatch41NuY = nuY;
        observer.waterPatch41NuZ = nuZ;
        observer.waterPatch41ArmCrossNuX = armCrossNuX;
        observer.waterPatch41ArmCrossNuY = armCrossNuY;
        observer.waterPatch41ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch41ArmX = armX;
        observer.waterPatch41ArmY = armY;
        observer.waterPatch41ArmZ = armZ;
        observer.waterPatch41NormalX = normalX;
        observer.waterPatch41NormalY = normalY;
        observer.waterPatch41NormalZ = normalZ;
        observer.waterPatch41PositionX = positionX;
        observer.waterPatch41PositionY = positionY;
        observer.waterPatch41PositionZ = positionZ;
        observer.waterPatch41RelativeX = relativeX;
        observer.waterPatch41RelativeY = relativeY;
        observer.waterPatch41RelativeZ = relativeZ;
        observer.waterPatch41FlowX = flowX;
        observer.waterPatch41FlowY = flowY;
        observer.waterPatch41FlowZ = flowZ;
        observer.waterPatch41SurfaceY = surfaceY;
        observer.waterPatch41SlopeX = slopeX;
        observer.waterPatch41SlopeZ = slopeZ;
        observer.waterPatch41SampleNormalX = sampleNormalX;
        observer.waterPatch41SampleNormalY = sampleNormalY;
        observer.waterPatch41SampleNormalZ = sampleNormalZ;
        observer.waterPatch41WaterDepth = waterDepth;
        break;
      case 42:
        observer.waterPatch42OldAddedMass = oldAddedMass;
        observer.waterPatch42AddedMass = addedMass;
        observer.waterPatch42EntrainedMass = entrainedMass;
        observer.waterPatch42Radiation = radiation;
        observer.waterPatch42IntoSurface = intoSurface;
        observer.waterPatch42Push = push;
        observer.waterPatch42Inertia = inertia;
        observer.waterPatch42Projection = projection;
        observer.waterPatch42WettedArea = wettedArea;
        observer.waterPatch42DeckWettedArea = deckWettedArea;
        observer.waterPatch42AddedMassPerArea = addedMassPerArea;
        observer.waterPatch42RadiationPerArea = radiationPerArea;
        observer.waterPatch42NuX = nuX;
        observer.waterPatch42NuY = nuY;
        observer.waterPatch42NuZ = nuZ;
        observer.waterPatch42ArmCrossNuX = armCrossNuX;
        observer.waterPatch42ArmCrossNuY = armCrossNuY;
        observer.waterPatch42ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch42ArmX = armX;
        observer.waterPatch42ArmY = armY;
        observer.waterPatch42ArmZ = armZ;
        observer.waterPatch42NormalX = normalX;
        observer.waterPatch42NormalY = normalY;
        observer.waterPatch42NormalZ = normalZ;
        observer.waterPatch42PositionX = positionX;
        observer.waterPatch42PositionY = positionY;
        observer.waterPatch42PositionZ = positionZ;
        observer.waterPatch42RelativeX = relativeX;
        observer.waterPatch42RelativeY = relativeY;
        observer.waterPatch42RelativeZ = relativeZ;
        observer.waterPatch42FlowX = flowX;
        observer.waterPatch42FlowY = flowY;
        observer.waterPatch42FlowZ = flowZ;
        observer.waterPatch42SurfaceY = surfaceY;
        observer.waterPatch42SlopeX = slopeX;
        observer.waterPatch42SlopeZ = slopeZ;
        observer.waterPatch42SampleNormalX = sampleNormalX;
        observer.waterPatch42SampleNormalY = sampleNormalY;
        observer.waterPatch42SampleNormalZ = sampleNormalZ;
        observer.waterPatch42WaterDepth = waterDepth;
        break;
      case 43:
        observer.waterPatch43OldAddedMass = oldAddedMass;
        observer.waterPatch43AddedMass = addedMass;
        observer.waterPatch43EntrainedMass = entrainedMass;
        observer.waterPatch43Radiation = radiation;
        observer.waterPatch43IntoSurface = intoSurface;
        observer.waterPatch43Push = push;
        observer.waterPatch43Inertia = inertia;
        observer.waterPatch43Projection = projection;
        observer.waterPatch43WettedArea = wettedArea;
        observer.waterPatch43DeckWettedArea = deckWettedArea;
        observer.waterPatch43AddedMassPerArea = addedMassPerArea;
        observer.waterPatch43RadiationPerArea = radiationPerArea;
        observer.waterPatch43NuX = nuX;
        observer.waterPatch43NuY = nuY;
        observer.waterPatch43NuZ = nuZ;
        observer.waterPatch43ArmCrossNuX = armCrossNuX;
        observer.waterPatch43ArmCrossNuY = armCrossNuY;
        observer.waterPatch43ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch43ArmX = armX;
        observer.waterPatch43ArmY = armY;
        observer.waterPatch43ArmZ = armZ;
        observer.waterPatch43NormalX = normalX;
        observer.waterPatch43NormalY = normalY;
        observer.waterPatch43NormalZ = normalZ;
        observer.waterPatch43PositionX = positionX;
        observer.waterPatch43PositionY = positionY;
        observer.waterPatch43PositionZ = positionZ;
        observer.waterPatch43RelativeX = relativeX;
        observer.waterPatch43RelativeY = relativeY;
        observer.waterPatch43RelativeZ = relativeZ;
        observer.waterPatch43FlowX = flowX;
        observer.waterPatch43FlowY = flowY;
        observer.waterPatch43FlowZ = flowZ;
        observer.waterPatch43SurfaceY = surfaceY;
        observer.waterPatch43SlopeX = slopeX;
        observer.waterPatch43SlopeZ = slopeZ;
        observer.waterPatch43SampleNormalX = sampleNormalX;
        observer.waterPatch43SampleNormalY = sampleNormalY;
        observer.waterPatch43SampleNormalZ = sampleNormalZ;
        observer.waterPatch43WaterDepth = waterDepth;
        break;
      case 44:
        observer.waterPatch44OldAddedMass = oldAddedMass;
        observer.waterPatch44AddedMass = addedMass;
        observer.waterPatch44EntrainedMass = entrainedMass;
        observer.waterPatch44Radiation = radiation;
        observer.waterPatch44IntoSurface = intoSurface;
        observer.waterPatch44Push = push;
        observer.waterPatch44Inertia = inertia;
        observer.waterPatch44Projection = projection;
        observer.waterPatch44WettedArea = wettedArea;
        observer.waterPatch44DeckWettedArea = deckWettedArea;
        observer.waterPatch44AddedMassPerArea = addedMassPerArea;
        observer.waterPatch44RadiationPerArea = radiationPerArea;
        observer.waterPatch44NuX = nuX;
        observer.waterPatch44NuY = nuY;
        observer.waterPatch44NuZ = nuZ;
        observer.waterPatch44ArmCrossNuX = armCrossNuX;
        observer.waterPatch44ArmCrossNuY = armCrossNuY;
        observer.waterPatch44ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch44ArmX = armX;
        observer.waterPatch44ArmY = armY;
        observer.waterPatch44ArmZ = armZ;
        observer.waterPatch44NormalX = normalX;
        observer.waterPatch44NormalY = normalY;
        observer.waterPatch44NormalZ = normalZ;
        observer.waterPatch44PositionX = positionX;
        observer.waterPatch44PositionY = positionY;
        observer.waterPatch44PositionZ = positionZ;
        observer.waterPatch44RelativeX = relativeX;
        observer.waterPatch44RelativeY = relativeY;
        observer.waterPatch44RelativeZ = relativeZ;
        observer.waterPatch44FlowX = flowX;
        observer.waterPatch44FlowY = flowY;
        observer.waterPatch44FlowZ = flowZ;
        observer.waterPatch44SurfaceY = surfaceY;
        observer.waterPatch44SlopeX = slopeX;
        observer.waterPatch44SlopeZ = slopeZ;
        observer.waterPatch44SampleNormalX = sampleNormalX;
        observer.waterPatch44SampleNormalY = sampleNormalY;
        observer.waterPatch44SampleNormalZ = sampleNormalZ;
        observer.waterPatch44WaterDepth = waterDepth;
        break;
      case 45:
        observer.waterPatch45OldAddedMass = oldAddedMass;
        observer.waterPatch45AddedMass = addedMass;
        observer.waterPatch45EntrainedMass = entrainedMass;
        observer.waterPatch45Radiation = radiation;
        observer.waterPatch45IntoSurface = intoSurface;
        observer.waterPatch45Push = push;
        observer.waterPatch45Inertia = inertia;
        observer.waterPatch45Projection = projection;
        observer.waterPatch45WettedArea = wettedArea;
        observer.waterPatch45DeckWettedArea = deckWettedArea;
        observer.waterPatch45AddedMassPerArea = addedMassPerArea;
        observer.waterPatch45RadiationPerArea = radiationPerArea;
        observer.waterPatch45NuX = nuX;
        observer.waterPatch45NuY = nuY;
        observer.waterPatch45NuZ = nuZ;
        observer.waterPatch45ArmCrossNuX = armCrossNuX;
        observer.waterPatch45ArmCrossNuY = armCrossNuY;
        observer.waterPatch45ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch45ArmX = armX;
        observer.waterPatch45ArmY = armY;
        observer.waterPatch45ArmZ = armZ;
        observer.waterPatch45NormalX = normalX;
        observer.waterPatch45NormalY = normalY;
        observer.waterPatch45NormalZ = normalZ;
        observer.waterPatch45PositionX = positionX;
        observer.waterPatch45PositionY = positionY;
        observer.waterPatch45PositionZ = positionZ;
        observer.waterPatch45RelativeX = relativeX;
        observer.waterPatch45RelativeY = relativeY;
        observer.waterPatch45RelativeZ = relativeZ;
        observer.waterPatch45FlowX = flowX;
        observer.waterPatch45FlowY = flowY;
        observer.waterPatch45FlowZ = flowZ;
        observer.waterPatch45SurfaceY = surfaceY;
        observer.waterPatch45SlopeX = slopeX;
        observer.waterPatch45SlopeZ = slopeZ;
        observer.waterPatch45SampleNormalX = sampleNormalX;
        observer.waterPatch45SampleNormalY = sampleNormalY;
        observer.waterPatch45SampleNormalZ = sampleNormalZ;
        observer.waterPatch45WaterDepth = waterDepth;
        break;
      case 46:
        observer.waterPatch46OldAddedMass = oldAddedMass;
        observer.waterPatch46AddedMass = addedMass;
        observer.waterPatch46EntrainedMass = entrainedMass;
        observer.waterPatch46Radiation = radiation;
        observer.waterPatch46IntoSurface = intoSurface;
        observer.waterPatch46Push = push;
        observer.waterPatch46Inertia = inertia;
        observer.waterPatch46Projection = projection;
        observer.waterPatch46WettedArea = wettedArea;
        observer.waterPatch46DeckWettedArea = deckWettedArea;
        observer.waterPatch46AddedMassPerArea = addedMassPerArea;
        observer.waterPatch46RadiationPerArea = radiationPerArea;
        observer.waterPatch46NuX = nuX;
        observer.waterPatch46NuY = nuY;
        observer.waterPatch46NuZ = nuZ;
        observer.waterPatch46ArmCrossNuX = armCrossNuX;
        observer.waterPatch46ArmCrossNuY = armCrossNuY;
        observer.waterPatch46ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch46ArmX = armX;
        observer.waterPatch46ArmY = armY;
        observer.waterPatch46ArmZ = armZ;
        observer.waterPatch46NormalX = normalX;
        observer.waterPatch46NormalY = normalY;
        observer.waterPatch46NormalZ = normalZ;
        observer.waterPatch46PositionX = positionX;
        observer.waterPatch46PositionY = positionY;
        observer.waterPatch46PositionZ = positionZ;
        observer.waterPatch46RelativeX = relativeX;
        observer.waterPatch46RelativeY = relativeY;
        observer.waterPatch46RelativeZ = relativeZ;
        observer.waterPatch46FlowX = flowX;
        observer.waterPatch46FlowY = flowY;
        observer.waterPatch46FlowZ = flowZ;
        observer.waterPatch46SurfaceY = surfaceY;
        observer.waterPatch46SlopeX = slopeX;
        observer.waterPatch46SlopeZ = slopeZ;
        observer.waterPatch46SampleNormalX = sampleNormalX;
        observer.waterPatch46SampleNormalY = sampleNormalY;
        observer.waterPatch46SampleNormalZ = sampleNormalZ;
        observer.waterPatch46WaterDepth = waterDepth;
        break;
      case 47:
        observer.waterPatch47OldAddedMass = oldAddedMass;
        observer.waterPatch47AddedMass = addedMass;
        observer.waterPatch47EntrainedMass = entrainedMass;
        observer.waterPatch47Radiation = radiation;
        observer.waterPatch47IntoSurface = intoSurface;
        observer.waterPatch47Push = push;
        observer.waterPatch47Inertia = inertia;
        observer.waterPatch47Projection = projection;
        observer.waterPatch47WettedArea = wettedArea;
        observer.waterPatch47DeckWettedArea = deckWettedArea;
        observer.waterPatch47AddedMassPerArea = addedMassPerArea;
        observer.waterPatch47RadiationPerArea = radiationPerArea;
        observer.waterPatch47NuX = nuX;
        observer.waterPatch47NuY = nuY;
        observer.waterPatch47NuZ = nuZ;
        observer.waterPatch47ArmCrossNuX = armCrossNuX;
        observer.waterPatch47ArmCrossNuY = armCrossNuY;
        observer.waterPatch47ArmCrossNuZ = armCrossNuZ;
        observer.waterPatch47ArmX = armX;
        observer.waterPatch47ArmY = armY;
        observer.waterPatch47ArmZ = armZ;
        observer.waterPatch47NormalX = normalX;
        observer.waterPatch47NormalY = normalY;
        observer.waterPatch47NormalZ = normalZ;
        observer.waterPatch47PositionX = positionX;
        observer.waterPatch47PositionY = positionY;
        observer.waterPatch47PositionZ = positionZ;
        observer.waterPatch47RelativeX = relativeX;
        observer.waterPatch47RelativeY = relativeY;
        observer.waterPatch47RelativeZ = relativeZ;
        observer.waterPatch47FlowX = flowX;
        observer.waterPatch47FlowY = flowY;
        observer.waterPatch47FlowZ = flowZ;
        observer.waterPatch47SurfaceY = surfaceY;
        observer.waterPatch47SlopeX = slopeX;
        observer.waterPatch47SlopeZ = slopeZ;
        observer.waterPatch47SampleNormalX = sampleNormalX;
        observer.waterPatch47SampleNormalY = sampleNormalY;
        observer.waterPatch47SampleNormalZ = sampleNormalZ;
        observer.waterPatch47WaterDepth = waterDepth;
        observer.waterPatchScopeAvailable = 1;
        break;
      default:
        observer.waterPatchScopeAvailable = 0;
    }
  }
  // END observer-only water-patch scalar dispatcher

  /** Scalar-only observation of the already assembled board RHS terms, before rider augmentation. */
  observeBoardRhsComponents(
    boardPreBuoyancyForceX: number,
    boardPreBuoyancyForceY: number,
    boardPreBuoyancyForceZ: number,
    boardPreBuoyancyTorqueX: number,
    boardPreBuoyancyTorqueY: number,
    boardPreBuoyancyTorqueZ: number,
    boardPrePressureForceX: number,
    boardPrePressureForceY: number,
    boardPrePressureForceZ: number,
    boardPrePressureTorqueX: number,
    boardPrePressureTorqueY: number,
    boardPrePressureTorqueZ: number,
    boardPreFrictionForceX: number,
    boardPreFrictionForceY: number,
    boardPreFrictionForceZ: number,
    boardPreFrictionTorqueX: number,
    boardPreFrictionTorqueY: number,
    boardPreFrictionTorqueZ: number,
    boardPreFinForceX: number,
    boardPreFinForceY: number,
    boardPreFinForceZ: number,
    boardPreFinTorqueX: number,
    boardPreFinTorqueY: number,
    boardPreFinTorqueZ: number,
    boardPreRailForceX: number,
    boardPreRailForceY: number,
    boardPreRailForceZ: number,
    boardPreRailTorqueX: number,
    boardPreRailTorqueY: number,
    boardPreRailTorqueZ: number,
    boardPreGyroX: number,
    boardPreGyroY: number,
    boardPreGyroZ: number,
    boardPreWeight: number,
    boardPreStepSeconds: number,
    boardPreWaterImpulseX: number,
    boardPreWaterImpulseY: number,
    boardPreWaterImpulseZ: number,
    boardPreWaterTorqueImpulseX: number,
    boardPreWaterTorqueImpulseY: number,
    boardPreWaterTorqueImpulseZ: number,
  ): void {
    const observer = this.landingDemand;
    observer.boardPreBuoyancyForceX = boardPreBuoyancyForceX;
    observer.boardPreBuoyancyForceY = boardPreBuoyancyForceY;
    observer.boardPreBuoyancyForceZ = boardPreBuoyancyForceZ;
    observer.boardPreBuoyancyTorqueX = boardPreBuoyancyTorqueX;
    observer.boardPreBuoyancyTorqueY = boardPreBuoyancyTorqueY;
    observer.boardPreBuoyancyTorqueZ = boardPreBuoyancyTorqueZ;
    observer.boardPrePressureForceX = boardPrePressureForceX;
    observer.boardPrePressureForceY = boardPrePressureForceY;
    observer.boardPrePressureForceZ = boardPrePressureForceZ;
    observer.boardPrePressureTorqueX = boardPrePressureTorqueX;
    observer.boardPrePressureTorqueY = boardPrePressureTorqueY;
    observer.boardPrePressureTorqueZ = boardPrePressureTorqueZ;
    observer.boardPreFrictionForceX = boardPreFrictionForceX;
    observer.boardPreFrictionForceY = boardPreFrictionForceY;
    observer.boardPreFrictionForceZ = boardPreFrictionForceZ;
    observer.boardPreFrictionTorqueX = boardPreFrictionTorqueX;
    observer.boardPreFrictionTorqueY = boardPreFrictionTorqueY;
    observer.boardPreFrictionTorqueZ = boardPreFrictionTorqueZ;
    observer.boardPreFinForceX = boardPreFinForceX;
    observer.boardPreFinForceY = boardPreFinForceY;
    observer.boardPreFinForceZ = boardPreFinForceZ;
    observer.boardPreFinTorqueX = boardPreFinTorqueX;
    observer.boardPreFinTorqueY = boardPreFinTorqueY;
    observer.boardPreFinTorqueZ = boardPreFinTorqueZ;
    observer.boardPreRailForceX = boardPreRailForceX;
    observer.boardPreRailForceY = boardPreRailForceY;
    observer.boardPreRailForceZ = boardPreRailForceZ;
    observer.boardPreRailTorqueX = boardPreRailTorqueX;
    observer.boardPreRailTorqueY = boardPreRailTorqueY;
    observer.boardPreRailTorqueZ = boardPreRailTorqueZ;
    observer.boardPreGyroX = boardPreGyroX;
    observer.boardPreGyroY = boardPreGyroY;
    observer.boardPreGyroZ = boardPreGyroZ;
    observer.boardPreWeight = boardPreWeight;
    observer.boardPreStepSeconds = boardPreStepSeconds;
    observer.boardPreWaterImpulseX = boardPreWaterImpulseX;
    observer.boardPreWaterImpulseY = boardPreWaterImpulseY;
    observer.boardPreWaterImpulseZ = boardPreWaterImpulseZ;
    observer.boardPreWaterTorqueImpulseX = boardPreWaterTorqueImpulseX;
    observer.boardPreWaterTorqueImpulseY = boardPreWaterTorqueImpulseY;
    observer.boardPreWaterTorqueImpulseZ = boardPreWaterTorqueImpulseZ;
  }

  /**
   * Standing: `couple` on an 8 x 8 system over (v, w, s', u'), the seventh unknown
   * the leg's rate and the eighth the bank's, the body's speed across the leg.
   * The rider moves at v + w x carried + drive + up s' + across u' and pushes
   * along its line through its centre of mass (G_v and G_f, as lying down, each
   * with the leg's column up and the bank's across). The leg's spring and damper
   * act on s', and the ankle's on u', implicitly. Carried rigidly over the
   * substep, the body banks with the board's change of roll, which leaves the
   * ankle's stretch to u' alone.
   */
  coupleStanding(system: Float64Array, rhs: Float64Array, h: number): void {
    // Observer-only scalar copies before the rider augments any matrix/RHS word.
    const observer = this.landingDemand;
    observer.boardPreMatrix00 = system[0 * 8 + 0];
    observer.boardPreMatrix01 = system[0 * 8 + 1];
    observer.boardPreMatrix02 = system[0 * 8 + 2];
    observer.boardPreMatrix03 = system[0 * 8 + 3];
    observer.boardPreMatrix04 = system[0 * 8 + 4];
    observer.boardPreMatrix05 = system[0 * 8 + 5];
    observer.boardPreMatrix10 = system[1 * 8 + 0];
    observer.boardPreMatrix11 = system[1 * 8 + 1];
    observer.boardPreMatrix12 = system[1 * 8 + 2];
    observer.boardPreMatrix13 = system[1 * 8 + 3];
    observer.boardPreMatrix14 = system[1 * 8 + 4];
    observer.boardPreMatrix15 = system[1 * 8 + 5];
    observer.boardPreMatrix20 = system[2 * 8 + 0];
    observer.boardPreMatrix21 = system[2 * 8 + 1];
    observer.boardPreMatrix22 = system[2 * 8 + 2];
    observer.boardPreMatrix23 = system[2 * 8 + 3];
    observer.boardPreMatrix24 = system[2 * 8 + 4];
    observer.boardPreMatrix25 = system[2 * 8 + 5];
    observer.boardPreMatrix30 = system[3 * 8 + 0];
    observer.boardPreMatrix31 = system[3 * 8 + 1];
    observer.boardPreMatrix32 = system[3 * 8 + 2];
    observer.boardPreMatrix33 = system[3 * 8 + 3];
    observer.boardPreMatrix34 = system[3 * 8 + 4];
    observer.boardPreMatrix35 = system[3 * 8 + 5];
    observer.boardPreMatrix40 = system[4 * 8 + 0];
    observer.boardPreMatrix41 = system[4 * 8 + 1];
    observer.boardPreMatrix42 = system[4 * 8 + 2];
    observer.boardPreMatrix43 = system[4 * 8 + 3];
    observer.boardPreMatrix44 = system[4 * 8 + 4];
    observer.boardPreMatrix45 = system[4 * 8 + 5];
    observer.boardPreMatrix50 = system[5 * 8 + 0];
    observer.boardPreMatrix51 = system[5 * 8 + 1];
    observer.boardPreMatrix52 = system[5 * 8 + 2];
    observer.boardPreMatrix53 = system[5 * 8 + 3];
    observer.boardPreMatrix54 = system[5 * 8 + 4];
    observer.boardPreMatrix55 = system[5 * 8 + 5];
    observer.boardPreRhs0 = rhs[0];
    observer.boardPreRhs1 = rhs[1];
    observer.boardPreRhs2 = rhs[2];
    observer.boardPreRhs3 = rhs[3];
    observer.boardPreRhs4 = rhs[4];
    observer.boardPreRhs5 = rhs[5];
    observer.preparedBoardVelocityX = this.boardVelocity.x;
    observer.preparedBoardVelocityY = this.boardVelocity.y;
    observer.preparedBoardVelocityZ = this.boardVelocity.z;
    observer.preparedBoardSpinX = this.boardSpin.x;
    observer.preparedBoardSpinY = this.boardSpin.y;
    observer.preparedBoardSpinZ = this.boardSpin.z;
    observer.riderExternalX = this.external.x;
    observer.riderExternalY = this.external.y;
    observer.riderExternalZ = this.external.z;
    observer.forceArmX = this.arm.x;
    observer.forceArmY = this.arm.y;
    observer.forceArmZ = this.arm.z;
    observer.carriedArmX = this.carried.x;
    observer.carriedArmY = this.carried.y;
    observer.carriedArmZ = this.carried.z;
    const N = 8;
    const m = this.mass;
    const a = this.arm;
    const b = this.carried;
    const n = this.up;
    const t = this.across;
    const av = [a.x, a.y, a.z];
    const bv = [b.x, b.y, b.z];
    const nv = [n.x, n.y, n.z];
    const tv = [t.x, t.y, t.z];
    const ab = a.x * b.x + a.y * b.y + a.z * b.z;
    const an = cross(a, n, this.localScratch).toArray();
    const bn = cross(b, n, this.scratch).toArray();
    const at = cross(a, t, this.localScratch).toArray();
    const bt = cross(b, t, this.scratch).toArray();
    for (let i = 0; i < 3; i += 1) {
      system[i * N + i] += m;
      // Columns and rows 6 and 7: m G_f^T up and m up^T G_v, and the same across.
      system[i * N + 6] += m * nv[i];
      system[6 * N + i] += m * nv[i];
      system[(3 + i) * N + 6] += m * an[i];
      system[6 * N + 3 + i] += m * bn[i];
      if (!this.banking) continue;
      system[i * N + 7] += m * tv[i];
      system[7 * N + i] += m * tv[i];
      system[(3 + i) * N + 7] += m * at[i];
      system[7 * N + 3 + i] += m * bt[i];
    }
    system[0 * N + 4] += m * b.z;
    system[0 * N + 5] += -m * b.y;
    system[1 * N + 3] += -m * b.z;
    system[1 * N + 5] += m * b.x;
    system[2 * N + 3] += m * b.y;
    system[2 * N + 4] += -m * b.x;
    system[3 * N + 1] += -m * a.z;
    system[3 * N + 2] += m * a.y;
    system[4 * N + 0] += m * a.z;
    system[4 * N + 2] += -m * a.x;
    system[5 * N + 0] += -m * a.y;
    system[5 * N + 1] += m * a.x;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) system[(3 + i) * N + 3 + j] += m * ((i === j ? ab : 0) - bv[i] * av[j]);
    }
    system[6 * N + 6] += m + h * this.legDamping + h * h * this.legStiffness;
    const length = this.legLength;
    // Landing, the bank's unknown is held at nothing: the body is carried upright.
    system[7 * N + 7] += this.banking ? m + (h * (ANKLE_STIFFNESS * h + ANKLE_DAMPING)) / (length * length) : 1;
    // The momentum the constraint must supply: v_rider' = v' + w' x carried + drive + up s'' + across u'.
    const mismatch = cross(this.boardSpin, b, this.scratch).add(this.boardVelocity).add(this.drive)
      .addScaledVector(n, this.leg.rate).addScaledVector(t, this.bankSpeed).sub(this.velocity);
    const f = this.scratch2.copy(this.external).multiplyScalar(h).addScaledVector(mismatch, -m);
    rhs[0] += f.x;
    rhs[1] += f.y;
    rhs[2] += f.z;
    const torque = cross(a, f, this.scratch);
    rhs[3] += torque.x;
    rhs[4] += torque.y + h * this.handYaw;
    rhs[5] += torque.z;
    // Backward Euler on the leg: its force now, less what the current rate adds to the stretch over the substep.
    rhs[6] += n.dot(f) + h * (this.leg.force - h * this.legStiffness * this.leg.rate);
    // The ankle pushes the body back across the leg by its torque over the leg's length.
    if (this.banking) rhs[7] += t.dot(f) - (h * (this.ankleTorque + this.swingTorque)) / length;
    // The upper body's swing turns the body on its feet; the board feels only the push at the feet, not its couple.
    rhs[3] -= h * this.swingTorque * this.rollAxis.x;
    rhs[4] -= h * this.swingTorque * this.rollAxis.y;
    rhs[5] -= h * this.swingTorque * this.rollAxis.z;
    // The twist's hips turn the board the other way through the feet.
    rhs[3] -= h * this.twistTorque * n.x;
    rhs[4] -= h * this.twistTorque * n.y;
    rhs[5] -= h * this.twistTorque * n.z;
  }

  /** Standing, after the 8 x 8 solve: the contact impulse the motion needs, and whether feet on a deck can give it (as `settle`). */
  settleStanding(x: Float64Array, h: number, board: BoardBody): boolean {
    // Trial board delta from the coupled solve, before contact projection or fallback.
    const observer = this.landingDemand;
    observer.trialBoardDeltaVelocityX = x[0];
    observer.trialBoardDeltaVelocityY = x[1];
    observer.trialBoardDeltaVelocityZ = x[2];
    observer.trialBoardDeltaSpinX = x[3];
    observer.trialBoardDeltaSpinY = x[4];
    observer.trialBoardDeltaSpinZ = x[5];
    observer.standingTrialAvailable = 1;
    const spin = this.scratch.set(this.boardSpin.x + x[3], this.boardSpin.y + x[4], this.boardSpin.z + x[5]);
    this.legRateAfter = this.leg.rate + x[6];
    this.bankSpeedAfter = this.bankSpeed + x[7];
    const velocity = cross(spin, this.carried, this.scratch2).add(this.boardVelocity).add(this.drive)
      .addScaledVector(this.up, this.legRateAfter).addScaledVector(this.across, this.bankSpeedAfter);
    velocity.x += x[0];
    velocity.y += x[1];
    velocity.z += x[2];
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
    // The solver's demand is overwritten by the applied impulse below when limited.
    // Copy its three primitive words first; never borrow a physics scratch vector.
    const demandX = this.impulse.x, demandY = this.impulse.y, demandZ = this.impulse.z;
    const before = this.scratch.copy(this.velocity);
    // Power of the contact on the board is the same at any point of its line; use the centre of mass.
    const boardBefore = cross(this.boardSpin, this.arm, this.localScratch).add(this.boardVelocity);
    const boardAfter = cross(board.angularVelocity, this.arm, this.target).add(board.velocity);
    const contact = this.impulse;
    if (this.feasible) {
      this.velocity.copy(cross(board.angularVelocity, this.carried, this.scratch2).add(board.velocity).add(this.drive));
      if (this.upright) this.velocity.addScaledVector(this.up, this.legRateAfter).addScaledVector(this.across, this.bankSpeedAfter);
      contact.copy(this.velocity).sub(before).multiplyScalar(this.mass).addScaledVector(this.external, -h);
      if (this.upright) {
        this.angularVelocity.set(0, board.angularVelocity.y, 0).addScaledVector(this.rollAxis, this.bankSpeedAfter / this.legLength);
      } else {
        this.angularImpulseWork(board);
        this.angularVelocity.copy(board.angularVelocity);
      }
      this.inContact = true;
      this.flightTime = 0;
    } else {
      contact.copy(this.projected);
      this.velocity.addScaledVector(contact, 1 / this.mass).addScaledVector(this.external, h / this.mass);
      // Standing, the feet stay on the deck, unloaded, while the leg can still reach it.
      this.inContact = contact.lengthSq() > 0 || (this.upright && this.leg.extension < LEG_EXTENSION);
      this.flightTime = this.inContact ? 0 : this.flightTime + h;
      this.contact.feasible = false;
    }
    this.balanceMargin = this.upright ? this.balanceMargin + (this.rawMargin - this.balanceMargin) * (1 - Math.exp(-h / MARGIN_TIME)) : 1;
    const mean = before.add(this.velocity).multiplyScalar(0.5);
    this.work.gravity += h * this.gravity.dot(mean);
    this.work.water += h * this.waterForce.dot(mean);
    this.work.assist += h * this.assistForce.dot(mean);
    this.work.carry += h * this.carryForce.dot(mean);
    this.work.leanOut += h * this.leanOutForce.dot(mean);
    if (this.upright && this.feasible && this.swingTorque !== 0) {
      // The swing's couple, which the board did not take with the push along the line of force.
      board.work.rider -= (h * this.swingTorque * this.rollAxis.dot(this.scratch2.addVectors(this.boardSpin, board.angularVelocity))) / 2;
    }
    if (this.upright && this.feasible && this.twistTorque !== 0) {
      // The twist's reaction, which turned the board through the feet.
      board.work.rider -= (h * this.twistTorque * this.up.dot(this.scratch2.addVectors(this.boardSpin, board.angularVelocity))) / 2;
    }
    if (this.upright && this.feasible && this.handYaw !== 0) {
      // The hand's moment turned the board through the feet.
      this.work.water += (h * this.handYaw * (this.boardSpin.y + board.angularVelocity.y)) / 2;
    }
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
      this.orientation.copy(this.upright ? this.bodyFrame : board.orientation);
    } else {
      const w = this.angularVelocity;
      const q = this.orientation;
      const dq = this.spin.set(w.x * h * 0.5, w.y * h * 0.5, w.z * h * 0.5, 0).multiply(q);
      q.set(q.x + dq.x, q.y + dq.y, q.z + dq.z, q.w + dq.w).normalize();
    }
    if (this.upright) {
      // Along the leg, its travel is not an error: only how far past it the body has gone.
      const along = this.scratch2.subVectors(this.position, this.target).dot(this.up);
      const travel = Math.min(LEG_EXTENSION, Math.max(Math.min(-MAX_FLEX, this.leg.rest - 0.15), along));
      this.postureError = this.localScratch.copy(this.target).addScaledVector(this.up, travel).distanceTo(this.position);
    } else {
      this.postureError = this.target.distanceTo(this.position);
    }
    const decay = Math.exp(-h / CAUSE_MEMORY);
    for (const limit of Object.keys(this.limitTime) as (keyof typeof this.limitTime)[]) {
      this.limitTime[limit] = this.limitTime[limit] * decay + (this.limit === limit ? h : 0);
    }
    this.observeContact(h, board, demandX, demandY, demandZ);
    // Pushed too far off the posture, swayed past recovery, or airborne too long: the rider lets go of the board.
    if (this.flightTime > MAX_FLIGHT) {
      this.observeLoss('flight-time', 'lost board', null);
      this.separate('lost board');
    } else if (this.upright && Math.hypot(this.sway.x, this.sway.z) > RECOVERABLE_ERROR) {
      this.observeLoss('sway-error', 'balance', null);
      this.separate('balance');
    } else if (this.postureError > RECOVERABLE_ERROR && this.limit !== 'none') {
      const dominant = this.dominantLimit();
      this.observeLoss('posture-error', SEPARATION[dominant], dominant);
      this.separate(SEPARATION[dominant]);
    }
  }

  private observeContact(h: number, board: BoardBody, demandX: number, demandY: number, demandZ: number): void {
    this.contactSubsteps++;
    this.contactElapsed += h;
    const s = this.contactLast;
    Object.assign(s, this.landingDemand);
    s.step = this.contactStep; s.substep = this.contactSubsteps; s.seconds = h; s.elapsedStepSeconds = this.contactElapsed;
    s.phase = this.phase; s.phaseTime = this.phaseTime; s.phaseDuration = this.phaseDuration; s.popUpTime = this.popUpTime;
    s.feasible = this.feasible; s.inContact = this.inContact; s.flightTime = this.flightTime; s.postureError = this.postureError;
    s.limit = this.limit;
    s.recentFlight = this.limitTime.flight; s.recentTip = this.limitTime.tip;
    s.recentSlip = this.limitTime.slip; s.recentImpact = this.limitTime.impact;
    s.legExtension = this.leg.extension; s.legRate = this.leg.rate; s.legRest = this.leg.rest;
    s.demandX = demandX; s.demandY = demandY; s.demandZ = demandZ;
    s.projectedX = this.projected.x; s.projectedY = this.projected.y; s.projectedZ = this.projected.z;
    s.appliedX = this.impulse.x; s.appliedY = this.impulse.y; s.appliedZ = this.impulse.z;
    s.peakNormalLoad = this.stepLoad; s.frontShare = this.contact.frontShare;
    s.relativeVelocityX = this.velocity.x - board.velocity.x;
    s.relativeVelocityY = this.velocity.y - board.velocity.y;
    s.relativeVelocityZ = this.velocity.z - board.velocity.z;
    s.supportXMin = this.support.xMin; s.supportXMax = this.support.xMax;
    s.supportZMin = this.support.zMin; s.supportZMax = this.support.zMax;
    s.copX = this.contact.centreOfPressure.x; s.copZ = this.contact.centreOfPressure.z;
    if (!this.feasible && this.contactLimited++ === 0) Object.assign(this.contactFirstLimited, s);
    if (!this.inContact && this.contactNonContact++ === 0) Object.assign(this.contactFirstNonContact, s);
  }

  private observeLoss(trigger: RiderContactLoss['trigger'], selectedCause: RiderSeparation, dominantLimit: RiderContactLoss['dominantLimit']): void {
    if (this.contactLoss) return;
    Object.assign(this.contactLossSample, this.contactLast);
    this.contactLoss = { trigger, selectedCause, dominantLimit };
  }

  /** Copies bounded diagnostic records for the ordinary status/snapshot path; no state or water query is performed. */
  readContactDiagnostics(): RiderContactDiagnostics {
    return {
      mount: this.contactMount, step: this.contactStep, substeps: this.contactSubsteps, elapsedStepSeconds: this.contactElapsed,
      limitedSubsteps: this.contactLimited, nonContactSubsteps: this.contactNonContact,
      maxFlightTime: MAX_FLIGHT, recoverableError: RECOVERABLE_ERROR,
      last: this.contactSubsteps ? { ...this.contactLast } : null,
      firstLimited: this.contactLimited ? { ...this.contactFirstLimited } : null,
      firstNonContact: this.contactNonContact ? { ...this.contactFirstNonContact } : null,
      loss: this.contactLoss ? { ...this.contactLoss, sample: { ...this.contactLossSample } } : null,
      meanForceX: this.contact.force.x, meanForceY: this.contact.force.y, meanForceZ: this.contact.force.z,
      peakNormalLoad: this.contact.load, landingPeak: this.popUpReport.landingPeak, landingFrontShare: this.popUpReport.frontShare,
    };
  }

  /** The limit that bound the contact most in the recent past. */
  private dominantLimit(): Exclude<ContactLimit, 'none'> {
    let best: Exclude<ContactLimit, 'none'> = 'tip';
    for (const limit of Object.keys(this.limitTime) as (keyof typeof this.limitTime)[]) {
      if (this.limitTime[limit] > this.limitTime[best]) best = limit;
    }
    return best;
  }

  /** Name a separation by what it came with (a strike on the reef, the Teahupo'o Reef's Part C); only once separated. */
  relabelSeparation(cause: RiderSeparation): void {
    if (!this.attached) this.separation = cause;
  }

  private separate(cause: RiderSeparation): void {
    this.attached = false;
    this.inContact = false;
    this.separation = cause;
  }

  /**
   * The posture's frame on the board as it is now: the heading, the body's up,
   * the stance point in the world and the centre of mass target (`target`).
   * Standing, the body is banked as far as its centre of mass leans over the
   * feet (`measure`; a new mount starts upright), within MAX_BANK.
   */
  private frame(board: BoardBody, measure = true): void {
    const forward = this.scratch2.set(0, 0, 1).applyQuaternion(board.orientation);
    if (forward.x * forward.x + forward.z * forward.z > 1e-6) this.heading.setFromAxisAngle(Y, Math.atan2(forward.x, forward.z));
    if (this.upright) {
      board.toWorld(this.base, this.baseWorld);
      const sway = this.localScratch.set(this.sway.x, 0, this.sway.z).applyQuaternion(board.orientation);
      if (measure && this.banking) {
        const lean = this.scratch2.subVectors(this.position, this.baseWorld).sub(sway);
        const side = this.scratch.copy(X).applyQuaternion(this.heading);
        const angle = Math.atan2(lean.dot(side), lean.y) - Math.atan2(this.localCenter.x - this.base.x, this.localCenter.y - this.base.y);
        this.bank.angle = Math.max(-MAX_BANK, Math.min(MAX_BANK, angle));
      } else if (!this.banking) {
        this.bank.angle = 0;
        this.bank.rate = 0;
      }
      this.bodyFrame.copy(this.heading).multiply(this.bankTurn.setFromAxisAngle(Z, -this.bank.angle));
      this.up.copy(Y).applyQuaternion(this.bodyFrame);
      this.across.copy(X).applyQuaternion(this.bodyFrame);
      this.target.copy(this.localCenter).sub(this.base).applyQuaternion(this.bodyFrame).add(this.baseWorld).add(sway);
    } else {
      this.bank.angle = 0;
      this.bank.rate = 0;
      this.swing.angle = 0;
      this.swing.rate = 0;
      this.swingTorque = 0;
      this.resetTwist();
      this.up.set(0, 1, 0).applyQuaternion(board.orientation);
      board.toWorld(this.localCenter, this.target);
    }
    this.target.addScaledVector(this.up, this.flex);
  }

  /** Standing, the velocity that keeps the body's bank as the board rolls and pitches under the stance point. */
  private uprightVelocity(board: BoardBody, out: Vector3): Vector3 {
    if (!this.upright) return out;
    const offset = this.scratch2.addVectors(this.carried, board.centerOfMass).sub(this.baseWorld);
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
    const deck = deckHeight(this.shape, local.z);
    const height = local.y - deck;
    // Observer-only primitive copies of the actual projection/leg/drive operands.
    const d = this.landingDemand;
    d.projectLocalX = local.x; d.projectLocalY = local.y; d.projectLocalZ = local.z;
    d.projectDeckY = deck; d.projectHeight = height;
    d.demandLocalX = j.x; d.demandLocalY = j.y; d.demandLocalZ = j.z;
    d.legHeight = this.leg.height; d.legLoad = this.legLoad;
    d.legStiffness = this.legStiffness; d.legDamping = this.legDamping;
    d.legForce = this.leg.force; d.legRateAfter = this.legRateAfter;
    d.specificForceX = this.specificForce.x; d.specificForceY = this.specificForce.y; d.specificForceZ = this.specificForce.z;
    d.postureRateX = this.postureRate.x; d.postureRateY = this.postureRate.y; d.postureRateZ = this.postureRate.z;
    d.driveX = this.drive.x; d.driveY = this.drive.y; d.driveZ = this.drive.z;
    d.demandPositionX = this.position.x; d.demandPositionY = this.position.y; d.demandPositionZ = this.position.z;
    d.demandVelocityX = this.velocity.x; d.demandVelocityY = this.velocity.y; d.demandVelocityZ = this.velocity.z;
    d.demandTargetX = this.target.x; d.demandTargetY = this.target.y; d.demandTargetZ = this.target.z;
    d.demandUpX = this.up.x; d.demandUpY = this.up.y; d.demandUpZ = this.up.z;
    if (!this.upright) return this.projectHold(j, h, local, out.set(0, 0, 0), q);
    if (!(j.y > 0) || !(height > 0)) {
      this.contact.centreOfPressure.set(local.x, local.y - height, local.z);
      this.rawMargin = 0;
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
    // How near a fall: the free centre of pressure against the support's edges across; along, only past a
    // foot toward the support's end (weight on one foot is a stance, not a fall); and the push across the
    // deck against the grip.
    const across = 1 - Math.abs(freeX - (support.xMin + support.xMax) / 2) / ((support.xMax - support.xMin) / 2);
    const feet = (this.feet.front - this.feet.rear) / 2;
    const beyond = Math.max(0, Math.abs(freeZ - (support.zMin + support.zMax) / 2) - feet);
    const along = 1 - beyond / Math.max(1e-6, (support.zMax - support.zMin) / 2 - feet);
    this.rawMargin = Math.max(0, Math.min(1, across, along, 1 - tangential / friction));
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
    const grip = (this.duck.press > DUCK_BUSY ? DUCK_GRIP : PRONE_GRIP) * weight;
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

  /**
   * The duck-dive's progress this substep: lying still on the board (not in a
   * posture change), the press moves toward the input over PRESS_TIME and the knee
   * follows once the press has been held KNEE_DELAY s; let go, both give back
   * over RELEASE_TIME. Anything else (standing, pushing up) holds none.
   */
  private duckStep(h: number): void {
    const { duck } = this;
    if (!this.attached || this.phase !== 'prone' || this.phaseDuration > 0) {
      duck.press = 0;
      duck.knee = 0;
      duck.held = 0;
      this.pressTrack.reset();
      this.kneeTrack.reset();
      return;
    }
    const target = Math.max(0, Math.min(1, this.duckDive));
    const holding = target > DUCK_HELD;
    duck.held = holding ? duck.held + h : 0;
    const pressTarget = holding ? target : 0;
    this.pressTrack.retarget(pressTarget, pressTarget > duck.press ? PRESS_TIME : RELEASE_TIME);
    this.pressTrack.step(h);
    duck.press = this.pressTrack.value;
    const kneeTarget = holding && duck.held >= KNEE_DELAY ? target : 0;
    this.kneeTrack.retarget(kneeTarget, kneeTarget > duck.knee ? KNEE_TIME : RELEASE_TIME);
    this.kneeTrack.step(h);
    duck.knee = this.kneeTrack.value;
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
    const { press, knee } = this.duck;
    if (press > 0 || knee > 0) {
      // Ducking: from prone toward the press, then from the press toward the knee; the centre of mass moves with them.
      const duck = this.ducks[this.stance];
      for (let k = 0; k < this.parts.length; k += 1) {
        this.parts[k] += press * (duck.press[k] - pose.parts[k]) + knee * (duck.knee[k] - duck.press[k]);
      }
      this.postureRate.addScaledVector(duck.shiftPress, this.pressTrack.rate).addScaledVector(duck.shiftKnee, this.kneeTrack.rate);
      if (press > DUCK_BUSY) this.support = duck.support;
    }
    this.upright = pose.upright;
    this.base.set(pose.base.x, pose.base.y, pose.base.z);
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      if (!this.shifts(i)) continue;
      this.parts[i * 3] += this.balance.x + this.lean.x;
      this.parts[i * 3 + 2] += this.balance.z + this.lean.z;
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
      const ducking = this.duck.press > DUCK_BUSY;
      const reachX = ducking ? DUCK_SHIFT : reach.x;
      const wanted = ducking ? DUCK_ROLL_SHIFT * roll + DUCK_ROLL_DAMPING * rate : PRONE_ROLL_SHIFT * roll + PRONE_ROLL_DAMPING * rate;
      const targetX = Math.min(reachX, Math.max(-reachX, wanted));
      this.shiftAxis('x', targetX, reachX, h);
      this.shiftAxis('z', 0, reach.z, h);
    } else if (this.inContact && this.loaded) {
      const smooth = Math.min(1, h / COP_SMOOTHING);
      this.smoothedCop.x += (this.desiredCop.x - this.smoothedCop.x) * smooth;
      this.smoothedCop.z += (this.desiredCop.z - this.smoothedCop.z) * smooth;
      const share = this.shiftedShare();
      // Standing, the bank balances across the board (`prepareBank`); landing, as along it, balance only keeps the load clear of the feet's edges.
      const keepX = this.upright ? Math.min(wantX + LATERAL_FREEDOM, Math.max(wantX - LATERAL_FREEDOM, this.smoothedCop.x)) : wantX;
      const targetX = this.banking ? 0 : Math.min(reach.x, Math.max(-reach.x, this.balance.x + (keepX - this.smoothedCop.x) / share));
      const keepZ = Math.min(wantZ + TRIM_FREEDOM, Math.max(wantZ - TRIM_FREEDOM, this.smoothedCop.z));
      const targetZ = Math.min(reach.z, Math.max(-reach.z, this.balance.z + (keepZ - this.smoothedCop.z) / share));
      this.shiftAxis('x', targetX, reach.x, h);
      this.shiftAxis('z', targetZ, reach.z, h);
    } else {
      this.shiftAxis('x', this.banking ? 0 : this.balance.x, reach.x, h);
      this.shiftAxis('z', this.balance.z, reach.z, h);
    }
    // Carried upright, the steering lean (with the heading hold and the hand); banked, steering is the bank. The trim, standing only.
    const lean = this.upright && !this.banking ? Math.max(-1, Math.min(1, this.steer + this.standingHold + HAND_BEND * this.handBend)) * MAX_LEAN : 0;
    const trim = this.upright ? Math.max(-1, Math.min(1, this.trim)) * TRIM_SHIFT : 0;
    this.leanAxis('x', lean, h);
    this.leanAxis('z', trim, h);
  }

  /**
   * Standing, the side the hand reaches for: with the hand asked for, the wave side, where the water stands
   * higher beside the board; compressing into a lean without it, the side the body leans toward.
   */
  private waveSide(board: BoardBody, water: SurfWater): void {
    this.handSide = 0;
    if (this.phase !== 'standing' || !this.attached) return;
    if (!this.hand) {
      if (this.compress >= REACH_FROM && Math.abs(this.bank.angle) >= REACH_LEAN) this.handSide = Math.sign(this.bank.angle);
      return;
    }
    const side = this.scratch.set(1, 0, 0).applyQuaternion(board.orientation).setY(0);
    if (side.lengthSq() < 1e-9) return;
    side.normalize();
    const { x, z } = board.position;
    const left = water.surfaceAt(x + side.x * WAVE_SIDE_REACH, z + side.z * WAVE_SIDE_REACH);
    const right = water.surfaceAt(x - side.x * WAVE_SIDE_REACH, z - side.z * WAVE_SIDE_REACH);
    if (Math.abs(left - right) >= WAVE_SIDE_MIN) this.handSide = left > right ? 1 : -1;
  }

  /** Critically damped motion of the lean toward `target` along one axis, within the shift's speed and acceleration. */
  private leanAxis(axis: 'x' | 'z', target: number, h: number): void {
    const frequency = 1 / BALANCE_TIME;
    const acceleration = Math.min(MAX_SHIFT_ACCELERATION, Math.max(-MAX_SHIFT_ACCELERATION,
      frequency * frequency * (target - this.lean[axis]) - 2 * frequency * this.leanRate[axis]));
    this.leanRate[axis] = Math.min(MAX_SHIFT_SPEED, Math.max(-MAX_SHIFT_SPEED, this.leanRate[axis] + acceleration * h));
    this.lean[axis] += this.leanRate[axis] * h;
  }

  /**
   * Standing, with no lean asked for, the rider keeps the line it was on: its
   * own lean against the heading error and the yaw rate. Steering sets a new line.
   */
  private holdLine(h: number, board: BoardBody): void {
    const standing = this.phase === 'standing' && this.attached;
    if (!standing || Math.abs(this.steer) > STEER_DEADBAND || this.hand) {
      this.standingLine = undefined;
      this.standingHold = 0;
      this.holdRate = 0;
      return;
    }
    const forward = this.scratch.set(0, 0, 1).applyQuaternion(board.orientation);
    const heading = Math.atan2(forward.x, forward.z);
    if (this.standingLine === undefined) {
      // Out of a turn the banked body carries the board on round a moment: the line is the heading it comes out on.
      if (Math.abs(board.angularVelocity.y) > STANDING_HOLD_SETTLE) {
        this.standingHold = 0;
        return;
      }
      this.standingLine = heading;
      this.holdRate = board.angularVelocity.y;
    }
    this.holdRate += (board.angularVelocity.y - this.holdRate) * (1 - Math.exp(-h / STANDING_HOLD_RATE_SMOOTHING));
    let error = heading - this.standingLine;
    error -= 2 * Math.PI * Math.round(error / (2 * Math.PI));
    const turn = -(error + STANDING_HOLD_RATE_TIME * this.holdRate) / STANDING_HOLD_ANGLE;
    this.standingHold = Math.max(-STANDING_HOLD_SHARE, Math.min(STANDING_HOLD_SHARE, turn));
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
