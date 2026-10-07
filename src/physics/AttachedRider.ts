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
 * On flat water at 7 m/s this brings the bottom turn round 90° in 1.02–1.03 s,
 * either side, keeping 0.56–0.58 of the speed (0.36 before; 0.87 with
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
 * Nor may the pull lean the body in where the feet can no longer catch it. They catch a body falling into the turn
 * by rolling the board further onto its rail, and past the rail's bite they no longer can (RAIL_BITE, RAIL_EASE).
 * So the pull eases off over the last RAIL_EASE before the bite, judged where the rail will be PULL_LOOKAHEAD, s, on
 * at its roll rate: about as long as the turn takes to answer the lean (the rail in 0.05 s and its pull 0.04 s
 * after it: `docs/research/rail-control-study.md`, from the carve lab's plant).
 *
 * Compress taken mid-turn on flat water, where the held turn's feet already brake near their edges, rolled the rail
 * past its bite at 7–8 m/s (to 85° and 87°) and the rider fell into the turn at 0.87 and 0.75 s; at 10 m/s the yaw
 * rate swung 1.60 rad/s. Compressing into the turn from the start fell at 8 m/s too (0.9 s). Eased, those turns keep
 * the rail under 49° and the lean under 45°, and 10 m/s swings 1.32 rad/s; the bottom turn still comes round 90° in
 * 1.03 s either side. Judged where the rail is, the rail ran on to 57° and the lean to 63° at 7 m/s; 0.05 s ahead
 * left 10 m/s swinging 1.46 rad/s; 0.08–0.12 s all hold; from 0.15 s the rail change's riders fall
 * (`leanOut.test.ts`) and a late projection costs too little (`projectionLean.test.ts`).
 */
const PULL_LOOKAHEAD = 0.1;
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
 * crouch) 90° then comes in 1.03 s keeping 0.87 of the speed, either side
 * (0.56–0.58 without; 0.83–0.84 at 0.35, 0.96 at 0.5); compressed alone, 0.79 in
 * 1.0 s. These were 0.90–0.91 and 0.83 before the pull eased short of the rail's
 * bite (PULL_LOOKAHEAD). Riding straight the same board keeps 0.63 after 1 s: on
 * flat water the carry gives back the planing drag a wave's face would feed.
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
 * and, under a tube's curl, a deeper manual tuck. Compress shortens the leg by up
 * to CROUCH_DEPTH, m, and full manual crouch by CROUCH_SHARE of it (the pumping
 * crouch). Under a tube's curl (`covered`) manual input keeps that share through
 * 0.6, and further input adds a smooth tuck, reaching MANUAL_CROUCH_DEPTH at 1;
 * Compress fades out this extra tuck to keep its sharp-turn stance. The deep tuck
 * is for tube clearance only (the owner's decision of 2026-10-06): everywhere
 * else full manual crouch keeps the pumping crouch's depth, as it had before the
 * tuck. These are provisional posture targets. The leg
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
  /**
   * A tube's curl covers the rider: a body point sampled this step lies in the tube's air under the curl, before it
   * touches down (the swept contact's `covered`). Only then does full manual crouch fold into the deep tuck.
   */
  covered = false;
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
  /** Standing, how deep the crouch: 0 (riding stance) to 1 (deepest: the pumping crouch, or under a tube's curl the deep tuck). */
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
  /** The board's roll toward the lean asked for, PULL_LOOKAHEAD on at its present roll rate, rad (COMPRESS_PULL's bite). */
  private railAhead = 0;
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
    this.railAhead = 0;
    this.covered = false;
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
    const leanSide = Math.sign(this.bankReference);
    this.railAhead = leanSide * roll + Math.max(0, leanSide * rollRate) * PULL_LOOKAHEAD;
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
    const bite = Math.max(0, Math.min(1, (RAIL_BITE - this.railAhead) / RAIL_EASE));
    const fade = Math.max(0, 1 - past / PULL_OVERLEAN) * speedFade * bite;
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
    // Under a tube's curl full manual crouch folds into the deep tuck; anywhere else it is the pumping crouch.
    const crouch = this.covered ? manualCrouchShare(this.crouch, this.compress) : CROUCH_SHARE * Math.max(0, Math.min(1, this.crouch));
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
    this.covered = false;
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
    if (sample.covered && slot < RIDER_PARTS.length) this.covered = true;
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
    const height = local.y - deckHeight(this.shape, local.z);
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
