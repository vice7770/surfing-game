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
import { ANKLE_HEIGHT, HIP_PITCH_INERTIA, HIP_PITCH_TORQUE, KNEE_STIFFNESS, StandingBody, kneeStrength } from './standingBody';
import { HIP_SHARE, HUMAN_ANKLE_DAMPING, HUMAN_ANKLE_STIFFNESS, HUMAN_BANK_FORWARD, HUMAN_BANK_GAIN, HUMAN_BANK_RATE_GAIN, HumanBalance, MOTOR_LAG, rotorImpulse, stanceRoom } from './humanBalance';
import type { SurfWater, WaterSample } from './SurfWater';
import { CONTROL_STEP, DEFAULT_WEIGHTS, PredictiveController, TWIST_DAMPING, TWIST_STIFFNESS, railPull, stanceAt, type DesignWeights } from './predictiveBalance';
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
/**
 * The legs' power limit (A-lite, the advisor's ruling 27, `legPower: 'cap'`; docs/research/board-in-water/a-lite): the
 * standing contact's net positive power on the board and body together, W per kg of the rider, at any instant
 * (LEG_POWER_PEAK, near a strong human's jump peak, about 4.4 kW at 73 kg) and over any LEG_POWER_WINDOW s
 * (LEG_POWER_HELD, about 1.5 kW). Absorbing energy (negative power) is not limited [provisional].
 */
export const LEG_POWER_PEAK = 60;
export const LEG_POWER_HELD = 20;
export const LEG_POWER_WINDOW = 0.5;
export const MAX_FLIGHT = 0.4;
export const RECOVERABLE_ERROR = 0.25;
/** The new surfer standing free (step 3.2): the board's substeps per frame (`standingSubsteps`); env override for the probes only. */
export const NEW_STANDING_SUBSTEPS = 16;
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
 * - each arm's cycle cruising: 50 strokes a minute a side (the phase 5 physics
 *   plan, item 2.8; Nessler et al. 2019, a short board in a swim flume: 36–54 a
 *   side over 0.6–2.0 m/s; Rapture's paddle technique: a left-and-right cycle
 *   every 2–3 s cruising). It was 60, from Volschenk et al. 2021's sprints;
 * - the share of it spent pulling;
 * - the pull, from 0.485 m ahead of the board's middle to as far behind it (the
 *   shoulders to the hip), beside the rail: 0.97 m (Nessler et al. 2015: 970 ±
 *   77 mm; 0.90 m before);
 * - how deep the hand goes, and the hand and forearm's drag area (C_d 1.1 × 0.06 m²).
 *
 * The pull share is calibrated so a sustained flat-water paddle settles near
 * 1.6 m/s (plan §1.10, provisional, 1.5–2 m/s; it settled at 1.74 m/s at 60
 * strokes a minute). The hand then peaks at about 4.5 m/s relative to the
 * board, as in fast front-crawl strokes: faster, the drawn hand was read as
 * jumping at 30 Hz (`PointInertia`) and its stroke drawn differently by display
 * rate. Quasi-steady hand drag leaves out the hand's added mass and lift, which
 * the fast pull stands in for.
 */
const ARM_CYCLE = 1.2;
const PULL_SHARE = 0.28;
/**
 * The sprint (the phase 5 physics plan, item 2.8): as a wave picks the board up,
 * the last strokes quicken (Rapture, catching unbroken waves: a few hard, fast
 * strokes; Nessler et al. 2019: the rate rises with the speed, to 54 a side).
 * The arm's cycle shortens toward SPRINT_CYCLE, s, as the surface falls along
 * the heading from SPRINT_SLOPE to SPRINT_SLOPE_FULL (the face lifting the
 * tail), or at once with the pop-up cue, eased over SPRINT_TIME, s (about a
 * stroke). Modelling values.
 */
const SPRINT_CYCLE = 1.0;
const SPRINT_SLOPE = Math.tan((2 * Math.PI) / 180);
const SPRINT_SLOPE_FULL = Math.tan((8 * Math.PI) / 180);
const SPRINT_TIME = 0.4;
/**
 * The player's sprint paddle (the owner's choices of 2026-10-22: double-press the
 * paddle and hold it; `RideSession`'s PaddleReserve allowing). The strokes go over
 * to it over SPRINT_PADDLE_TIME, s, a quarter of a cruising stroke, and back as
 * it stops:
 * - each arm's cycle SPRINT_PADDLE_CYCLE, s: 70 strokes a minute a side (the
 *   owner's figure, from the sprint paddling studies: Sheppard et al. 2013,
 *   Nessler et al. 2019, Volschenk et al. 2021), from 50 cruising;
 * - the pulls overlap: SPRINT_PADDLE_PULL of each arm's cycle spent pulling, from
 *   PULL_SHARE's 0.28. Front-crawl swimmers go from catch-up toward superposition
 *   of the arms' propulsive phases as they speed up (Chollet, Chalies and Chatard
 *   2000, the index of coordination). Over the same 0.97 m the hand moves against
 *   the board at about the cruise's speed and pulls for more of the time;
 *   quickening alone, the hand ran so fast that the sprint settled at 2.4 m/s and
 *   took longer than the cruise to come up to it;
 * - a deeper catch: the hand SPRINT_PADDLE_DEPTH, m, down (HAND_DEPTH's 0.25),
 *   the forearm upright under it and the upper arm in the water, their drag area
 *   SPRINT_PADDLE_AREA times the hand's and forearm's (0.12 m², about a whole
 *   arm's at C_d 0.8–0.9, with the added mass of an arm driven hard into the
 *   catch, which quasi-steady drag leaves out): fitted to the top speed. It was
 *   2.4 until canyon-catch (2026-10-29), fitted while the stroke's slow ends,
 *   where the board outruns the hand, braked; with the hand feathering there
 *   (FEATHER_DRAG), 1.8 gives the same 2.08 m/s on flat water;
 * - the arm pulling all out: it gives way at SPRINT_PADDLE_LIMIT body weights,
 *   not HAND_FORCE_LIMIT's 0.4 (a modelling value). Sprint paddling is limited by
 *   pulling strength (Sheppard et al. 2012: relative pull-up strength predicted
 *   the sprint's 5–15 m times from a standing start, r = 0.88–0.94).
 * The arms pull at their limit for longer each cycle, so from rest the sprint has
 * more force; through the hand's and the body's drag it settles near 2.1 m/s on
 * flat water, against the cruise's 1.6 (the owner's "a third faster", reaching it
 * sooner). Averaged over a stroke: 2.06 m/s; 1 m/s in 0.55 s against the cruise's
 * 1.12; 90 % of its own top speed in 2.3 s against 2.4; the cruise's 90 % in 1.0
 * s against 2.4. The catch's own quickening (SPRINT_CYCLE) stays, free.
 */
const SPRINT_PADDLE_TIME = 0.3;
const SPRINT_PADDLE_CYCLE = 60 / 70;
const SPRINT_PADDLE_PULL = 0.43;
const SPRINT_PADDLE_DEPTH = 0.32;
const SPRINT_PADDLE_AREA = 1.8;
/** SPRINT_PADDLE_AREA as fitted before the hand feathered (the 'old' stroke, `AttachedRiderOptions.stroke`). */
const SPRINT_PADDLE_AREA_BROADSIDE = 2.4;
const SPRINT_PADDLE_LIMIT = 0.8;
const REACH = 0.485;
const HIP = -0.485;
const HAND_DEPTH = 0.25;
const HAND_OUTSIDE_RAIL = 0.08;
/**
 * The board's roll through each stroke (the phase 5 physics plan, item 2.8;
 * Nessler et al. 2019: 27–45° from rail to rail, more on smaller boards): the
 * paddler rolls toward each arm as it pulls, reaching with the shoulder. The
 * prone balance levels the board toward a roll that swings STROKE_ROLL, rad,
 * toward the pulling arm, at its most STROKE_ROLL_LEAD of a cycle before the
 * pull's middle (the board lags the body's shift about that much), and comes in
 * over STROKE_ROLL_TIME, s, as the board gets under way (full by
 * STROKE_ROLL_SPEED, m/s: the first strokes from rest are flat). On a face
 * (catching, or meeting whitewater, the surface tilted from STROKE_ROLL_CALM to
 * STROKE_ROLL_ROUGH) the paddler keeps the board flat: rolling into whitewater
 * capsized it under a hand pulling against the bore's upflow. Modelling values,
 * sized on flat water: the hips' 0.1 m reach rolls it 17–19° (from 7–10°); a
 * bigger reach rolled it further and threw the rider. The roll also keeps the
 * line in a quartering swell: without it, at 50 strokes a minute, the board
 * wandered 9–12° over the strokes (2–5° with it).
 *
 * The balance comes first (the paddle-balance fix, 2026-10-22; the "posture
 * first" principle of dual-task balance, Shumway-Cook and Woollacott: a body
 * keeps its balance before a second task's movement). The hips level the board
 * first, within their reach, and the stroke's swing takes only the reach the
 * levelling leaves. The swing alone asks more than the hips have: its rate,
 * 15° at 0.83 Hz, asks PRONE_ROLL_DAMPING × 1.37 rad/s, 0.22 m of the 0.1 m.
 * Asked together, as the swing's tracking error, the hips were held by the
 * swing whenever chop, a steering stroke or a face rolled the board the other
 * way: in a probe, 0.03–0.08 m toward the low rail while the board rolled
 * toward it at 50–70°/s. Past about 36° the hips' 0.1 m cannot right the board
 * (its roll with the hips held there, on flat water), so it capsized and the
 * rider slid off ('lost board'), in 8 of 55 paddling runs (chop, steering, a
 * face lifting the board at 30°) and 18 of 72 chop runs. On flat water the
 * board rocks as before (18.6° rail to rail).
 */
const STROKE_ROLL = (15 * Math.PI) / 180;
const STROKE_ROLL_LEAD = 0.35;
const STROKE_ROLL_TIME = 0.5;
const STROKE_ROLL_SPEED = 1.2;
const STROKE_ROLL_CALM = Math.tan((3 * Math.PI) / 180);
const STROKE_ROLL_ROUGH = Math.tan((8 * Math.PI) / 180);
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
 * A pulling hand the board outruns (canyon-catch, 2026-10-29): the stroke sweeps the hand back over the board on a fixed
 * path at about 2.6–2.9 m/s on average (the sprint's and the cruise's), so once the board goes faster than that through
 * the water, the hand's palm would meet the water head-on from in front and brake. A paddler cannot pull water that
 * outruns the stroke and does not hold the palm against it: the hand slices in edge-on until the board slows, and the
 * arm drives in no broadside blade. Edge-on, a flat hand's drag is about a fifth of its broadside drag (Berger, de Groot
 * and Hollander 1995: the hand's drag coefficient falls from about 1.1 broadside to 0.2–0.3 at small pitch): its drag
 * area is FEATHER_DRAG of the pulling hand's then. Without it the sprint settled down a 12° face at 3.0 m/s against the
 * cruise's 3.9, slower the steeper the face (3.7 against 5.8 at 20°), and a paddler's sprint left Canyon waves behind
 * that the cruise caught. Flat-water paddling never outruns its hands (1.6 and 2.1 m/s), and is unchanged.
 */
const FEATHER_DRAG = 0.2;
/**
 * Steering lying down: paddling, the arm on the outside of the turn pulls
 * harder and the inside arm softer by this share; not paddling, the outside arm
 * sweeps alone. Board +x is its left, so turning left is a stronger right arm.
 */
const STEER_STROKE = 0.6;
/**
 * The side paddle's fast mode: not paddling, past SWEEP_FAST_FROM of the stick the sweeping arm quickens to
 * SWEEP_FAST_CADENCE times its strokes a second at full steer, and its pull reaches SWEEP_FAST_WIDE, m, further out from
 * the rail (a wider sweep, a longer arm about the board). Small steer keeps the old stroke for precision. The turn still
 * comes only from the hand's own drag, pulling water aft, so the glide is kept.
 */
const SWEEP_FAST_FROM = 0.5;
const SWEEP_FAST_CADENCE = 1.8;
const SWEEP_FAST_WIDE = 0.2;
/**
 * The fast sweep's shape (owner, 2026-11-09: "the arms look broken"): a long, flat pull through the water, SWEEP_FAST_PULL
 * of the cycle (0.28 slow), and a low recovery, RECOVERY_HEIGHT scaled by SWEEP_FAST_LOW, the kayak sweep's. The fast share eases
 * toward the stick over SWEEP_FAST_EASE, s, so stick noise never reshapes a stroke mid-way.
 */
const SWEEP_FAST_PULL = 0.45;
const SWEEP_FAST_LOW = 0.4;
const SWEEP_FAST_EASE = 0.25;
/**
 * A paddler keeps its line: with no steering asked for, the arm on the side to
 * turn toward pulls softer and the other harder, in proportion to the heading
 * error over HOLD_ANGLE, rad, and to the yaw rate over HOLD_ANGLE / HOLD_RATE_TIME
 * (a modelling choice for the paddler's own correction; the turn comes only
 * from the strokes' drag). Steering sets a new line.
 *
 * Under way it reads the line over the strokes, the heading error and the yaw
 * rate smoothed over HOLD_SMOOTHING, s: each arm's pull yaws the board toward
 * the other side until the next (±0.3 rad/s at 50 strokes a minute), and read
 * at once the correction softened the very arm pulling, by 40–60 % at the end of
 * its pull, and the paddle settled at 1.3 m/s. From rest, before the fins grip,
 * it reads them at once, the smoothing coming in by HOLD_SMOOTHING_SPEED, m/s.
 * The gains were 10° and 0.5 s at 60 strokes a minute, read at once.
 */
const HOLD_ANGLE = (6 * Math.PI) / 180;
const HOLD_RATE_TIME = 0.65;
const HOLD_SMOOTHING = 0.5;
const HOLD_SMOOTHING_SPEED = 1.5;
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
 *
 * The level it keeps is the water's under the board, not the world's (the
 * paddle-balance fix, 2026-10-22). Lying awash, the body moves with the surface
 * water, and the vertical it feels is the surface's normal: the otoliths sense
 * gravity less the head's acceleration (Angelaki and Cullen 2008), and for
 * water moving under gravity that is normal to the free surface, a surface of
 * equal pressure (Euler's equation: g − a = ∇p / ρ). The rate is the board's own
 * (the semicircular canals sense rotation). Levelled to the world's horizontal
 * across sloping water (chop, or a swell or a face crossed at an angle), the
 * hips held the board against the water's own level and spent their reach on
 * it: in a probe's chop (Hs 0.65–1.55 m at 2.2–4.2 s, `ChopWater`), with the
 * balance first (STROKE_ROLL), 3 runs of 72 still capsized, all in seas too
 * steep to stand unbroken (slopes to 23–28°); none level with the water. On
 * flat water the two levels are one.
 */
const PRONE_ROLL_SHIFT = 0.4;
const PRONE_ROLL_DAMPING = 0.16;
const STANDING_SHIFT = { x: 0.35, z: 0.25 };
/**
 * Fore and aft, where the load sits is trim, not balance: the rider only keeps
 * the centre of pressure within TRIM_FREEDOM, m, of where it holds it, clear of
 * the feet's edges.
 *
 * Standing, W/S set where it holds it (the phase-5 physics plan's W2, option (a)
 * of batch B's record, the owner's decision of 2026-10-22): TRIM_PRESSURE of half
 * the stance toward the front foot or the back, so full S holds 0.40 of the load
 * on the front foot, full W 0.60 and nothing 0.50 (toward the coaching's 70/30:
 * Rapture's top turn on the back foot, Cornish Wave's driving forward). The
 * board's own pushes still move it within the 0.2 m zone before the rider
 * re-centres. The plan's 0.30 / 0.70 broke the bars (with a 0.1 m zone 34 tests,
 * with 0.2 m the coached cutbacks: 4.21–4.44 m/s against 4.5): on still water
 * every carve sheds 0.2–0.6 g, and the pressure held back sinks the tail into
 * it. Until then the zone sat about the middle and W/S moved only the upper body
 * (TRIM_SHIFT, kept as the feed-forward). Landing from a pop-up holds the middle:
 * the landing loads the front foot (72/28 in the laboratory study).
 */
const TRIM_FREEDOM = 0.2;
const TRIM_PRESSURE = 0.2;
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
 *
 * The speed is the board's through the water under it, as planing reads it:
 * the carve's hull and fins feel only that. Read over the ground (until the
 * phase-5 follow-up, 2026-10-22), a board climbing a wave's face, whose water
 * runs shoreward under it (the medians on the Beach's and the Point's faces at
 * Medium: about 1.1 m/s half way up, 1.4–1.7 near the top), read 18 % slower
 * than it ran through the water, and leaned 10° less into a top turn or cutback.
 */
const TURN_RADIUS = 4.5;
/**
 * The rail bites up to RAIL_BITE, rad; past it the board bogs (the carve lab: 6
 * → 2 m/s in 0.6 s at 60–65°). The feet brake the body's fall into a turn by
 * rolling the board further onto its rail, so past the bite their room to do so
 * closes over RAIL_EASE, rad, and the upper body's swing brakes it instead.
 *
 * The rail bogs against the water it cuts, so its roll is read from the water's
 * surface under the board (the phase-5 physics plan's item 2.4 B, the owner's
 * decision 9 of 2026-10-22); the carve lab measured the bite on flat water, where
 * the two agree. Read from the world's level, a board running along a 30° face
 * had its downhill rail (a redirect's: the heels frontside, the toes backside)
 * past the bite 18° into the water, and Compress's pull off, while its uphill
 * rail bit on to 78°. The ankle and the body's bank stay against gravity.
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
 * The new surfer's twist as a body degree of freedom (step 3.2e, the advisor's ruling 29i; the split and the numbers are
 * step 3.2c's, docs/research/new-rider/3.2 Part 3). The board's share of the rider's yaw inertia (the feet, shanks and
 * knees; `stanceAt`'s `lower`, de Leva 1996) turns rigidly with the board through the planted feet. The upper body's
 * share (pelvis, trunk, arms and head; `upper`, and TWIST_BODY_ARMS more with the arms out) turns on the legs' twist:
 * their stiffness and damping (TWIST_STIFFNESS, TWIST_DAMPING: the trunk's axial stiffness, Kosmopoulos et al. 2012)
 * and the active torque the balance sends, through the muscles' lag. The torque turns the board through the feet and
 * the upper body the other way: a limb's force with its reaction. The active torque is at most TWIST_BODY_TORQUE, N·m
 * (the hips' rotation, about 50 N·m a leg: McNabb et al. 2024) and what the feet's grip holds (FOOT_FRICTION times the
 * leg's load at TWIST_GRIP_SPAN, m, half the feet's spacing); the twist's range is TWIST_BODY_RANGE, rad (the hips about
 * 30° and the bent knees about 20°: Simoneau et al. 1998, Lorenz et al. 2015), past which the joints stop it
 * (TWIST_STOP, N·m/rad, and TWIST_STOP_DAMPING: an end stop, not sourced).
 */
const TWIST_BODY_TORQUE = 100;
const TWIST_BODY_RANGE = 0.87;
const TWIST_BODY_ARMS = 0.87;
const TWIST_GRIP_SPAN = 0.315;
const TWIST_STOP = 2000;
const TWIST_STOP_DAMPING = 50;
/**
 * How fast the new surfer sets the rail it is asked for, rad/s (step 3.2f, the advisor's ruling 29j): the lean asked
 * moves toward the player's stick at no more than this. The old rider's REFERENCE_RATE is 5 rad/s, which reaches 44° in
 * 0.15 s: that is not a human setting a rail, and the balance, predicting over its 0.1 s delay, cannot follow it.
 * There is no measured roll rate for a rider setting a rail. What is sourced is the turn: a real bottom turn comes
 * round 99° in 0.96 s (Forsyth et al. 2024, as `COMPRESS_PULL` cites it), and the roll-plant lab's 1.9 rad/s is a yaw
 * rate on a 42° rail, not a roll rate. If the rail is set over about the first half of such a turn, 0.7 rad in 0.5 s is
 * about 1.4 rad/s, which is the sourced upper end. The carve bars were measured over 0.5, 1, 1.4, 2 and 5 rad/s
 * (docs/research/new-rider/3.2 Part 6): the held carves pass at 0.5 (2.38 s and 2.58 s against the bars' 2.28 and 2.30)
 * and fail from 1 up (1.43 s and 1.60 s). So this is the rate
 * the carve needs, not a measured human rate: 0.7 rad takes 1.4 s, where a whole bottom turn takes about 1 s.
 */
const LEAN_IN_RATE = 0.5;
/**
 * How far onto its rail the balance's schedule is trusted, degrees (step 3.2f). The plant was measured at rails of 0 to
 * 40° (`predictiveBalance.ts` RAIL_PLANT), and a controller designed on it is sound to 20°: beyond that the measured
 * plant's own sideslip mode diverges (at 7 m/s and 40° the side force per degree of sideslip has changed sign, so a
 * slide feeds itself, and no gains hold it: the lab's spin-out). Past this cap the schedule holds its design there and
 * the reference carries the rest. The bars were measured over caps of 0, 5, 10, 12, 15, 20, 30 and 40°
 * (docs/research/new-rider/3.2 Part 6): the held carves are longest at 5° (2.83 s and 2.98 s), and the turn pair gets
 * furthest at 10° (its falls move out of the bottom turn), where the Compress carve sits exactly on its bar. So the
 * measured big-rail plant is in the model and read only to here; that is a finding, not a preference.
 */
const SCHEDULE_RAIL_CAP = 5;
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
 * On flat water at 7 m/s this brings the bottom turn round 90° in 1.02 s,
 * either side, keeping 0.57 of the speed (0.36 before; with CARVE_CARRY, 1.12–
 * 1.15 s keeping 0.91). At 0.7 a rider compressing from standing fell after
 * 100°. Riding straight it does nothing.
 *
 * The path, the speed it fades with and the carry's direction are the board's
 * through the water (the phase-5 follow-up, 2026-10-22). Read over the ground, a
 * face's own flow turned them: on water running 1.5 m/s up a 5° face the coached
 * cutback bogged to 1.1–1.3 m/s through the water (3.5–3.7 on still water), and
 * on the Beach's and Point's faces at Medium a top turn's or cutback's pull read
 * 0.7 weaker and 13° off its path (the medians). Through the water the rules are
 * the same on any uniformly moving water as on still water.
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
 * rate swung 1.60 rad/s. Compressing into the turn from the start fell at 8 m/s too (0.9 s). Eased, and within
 * TURN_PULL_LIMIT, those turns keep the rail under 49° and the rider on, and 10 m/s swings 1.05 rad/s. Judged where
 * the rail is (no look-ahead), the rail ran on to 57° and the lean to 63° at 7 m/s; and TURN_PULL_LIMIT alone,
 * without this ease, let that rider fall again: at a 40–45° lean asked for the limit barely bites. Before the limit,
 * 0.08–0.12 s ahead held 7–10 m/s (0.05 s left 10 m/s swinging 1.46 rad/s; from 0.15 s the rail change's riders
 * fell); with it 0.07 s holds them all, and brings the backside bar to 1.15 s where 0.1 s left it at 1.167 s (the
 * owner's decision of 2026-10-07).
 */
const PULL_LOOKAHEAD = 0.07;
/**
 * And it may not pull a turn harder than a real bottom turn pulls: the compressed turn's whole sideways pull, what the
 * lean asked for balances (g tan of it) and COMPRESS_PULL's on top, stays within TURN_PULL_LIMIT g. Forsyth et al.
 * 2024's bottom turns peak at 1.41 g, as do the game's own on waves (1.42 g; `docs/research/bottom-turn-entry-
 * study.md`). It binds above about 43° asked: at speed the lean asked for is RAIL_RANGE's 50° (1.19 g), and the pull
 * falls from 0.6 to 0.22 g. Uncapped, Compress taken mid-turn at 11 m/s tightened the turn by about 1.1 rad/s and it
 * rang at about 3 Hz, its yaw rate swinging 1.27 rad/s against the guard's 0.87; capped, 0.83.
 *
 * The owner's decision of 2026-10-07 (option (ii), with PULL_LOOKAHEAD at 0.07 s): the still-water bar then comes
 * round 90° in 1.117 s frontside and 1.15 s backside (1.03 s before), keeping 0.913 and 0.910 of its speed (0.87
 * before), accepted as the spec's "about 1 s"; and a late projection costs a little less (0.731 of the speed kept
 * against 0.704, `projectionLean.test.ts`).
 */
const TURN_PULL_LIMIT = 1.41;
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
 * crouch) 90° then comes in 1.12 s frontside and 1.15 s backside, keeping 0.91
 * of the speed (0.57 without; 0.85–0.87 at 0.35, 1.0 at 0.5); compressed alone,
 * 0.80 in 1.07 s (with TURN_PULL_LIMIT). Riding straight the same board keeps
 * 0.63 after 1 s: on flat water the carry gives back the planing drag a wave's
 * face would feed.
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
/**
 * The leg drive (leg-drive, 2026-11-10; `legDrive: 'on'`, opt-in; docs/research/leg-drive-2026-11-10): the rail
 * change's righting push made by the legs, in LEAN_OUT_PULL's place. The cause: LEAN_OUT_PULL pushes the body's centre
 * of mass from outside, a force with no reaction; a rider leaning toward the wave is righted when the feet go under the
 * body, the back leg driving the tail out, away from the new rail. So under LEAN_OUT_PULL's gate less Compress (the
 * board planes, the rider steers, the body still leans the other way by more than UPRIGHT_BANK) the legs push the body
 * toward the new rail, level and across the board's path, and the board takes the equal and opposite push at the back
 * foot: nothing on the two together, and the push behind the board's centre is the yaw that goes with it. The limbs
 * bound it three ways:
 * - strength: LEG_SIDE_STRENGTH of the body's weight (the back leg's push sideways, as the agile legs'), by the steer;
 * - grip: FOOT_FRICTION times the back foot's own load (an unloaded foot pushes nothing: unbounded, a body weight
 *   threw the board from under every rider in 0.2 s);
 * - reach: the push ends when the feet have gone as far from under the body, since it began, as the legs reach
 *   sideways at this pelvis height: sqrt(straight² − pelvis²), the straight leg being the stance's pelvis height with
 *   LEG_EXTENSION, so 0.41 m standing (pelvis 0.78 m) and 0.72 m in Compress's crouch (0.48 m).
 * The two forces do not share a line, so they are also a couple (the push times the body's height over the back foot)
 * that a real body takes at the hips; the point-mass body has nowhere to take it (the doc's open point).
 */
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
/**
 * The weight the rider feels (the phase-5 physics plan's W1, the owner's
 * decision 1 of 2026-10-22): the front foot's share of the load, low-passed over
 * WEIGHT_TIME, s, the coaching's sustained feel (60/40, 70/30) rather than one
 * instant's. A read-out only: nothing in the physics reads it.
 */
const WEIGHT_TIME = 0.3;
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
 * Snap (the snap stance, the owner's decisions of 2026-11-03; docs/research/snap-stance-2026-11-03/README.md): held
 * standing, the weight goes onto the tail for a sharp turn that sheds speed. Nothing here pushes the board: each term
 * is the rider's own posture, and the turn and the speed it costs are the hull's and the fins' (`BoardBody`).
 * - **The weight on the tail:** the balance holds the feet's pressure SNAP_PRESSURE of half the stance toward the back
 *   foot, over the side fins (0.7: 85/15 on the back foot; Rapture's snap, 80/20 to 90/10), within SNAP_FREEDOM, m,
 *   where the trim lets it wander TRIM_FREEDOM (the coaching's "commit to extreme back-foot loading"). The hull trims
 *   nose up until its lift sits under the load (the Exploratorium's surfing physics; Savitsky 1964): the wetted length
 *   shortens into the rockered tail, the nose leaves the water, the yaw it resisted goes, and the trim's drag slows the
 *   board. The hips go over the back foot, not behind it: the upper body stays over them (no TRIM_SHIFT, which S keeps).
 *   Round 2 (the owner's "the board moves by itself ... the rider falls after"): leaning the upper body back as full S
 *   does on top of the pressure put the centre of mass 0.15 m behind the back foot. Under the board's braking the
 *   balance then kept the pressure on the tail only by sitting further back, the nose rose 20–47°, and the board
 *   pivoted about the rider at about 200°/s while the rider's own path turned at about 30°/s: its heading ran 60–70°
 *   off its path, the fins stalled (attack 45–85°), the speed fell to 0.2 m/s, and let go, the fins weathervaned it
 *   back 100° and the rider fell (flat water, 7 m/s). The drawn hips sat behind the back foot on a pitched board and
 *   the crouch read half its depth. Over the back foot, the same turn keeps its fins (the heading within 25–30° of the
 *   path) and the rider stays on (docs/research/snap-stance-2026-11-03/README.md, Round 2).
 * - **The body loaded:** the legs come down SNAP_DEPTH of CROUCH_DEPTH (0.3 m, Compress's depth) as fast as Compress
 *   takes them (no slower than the load falls, the legs only pushing), and let go they extend as Compress's do (the
 *   projection). With the hips over the back foot the back knee closes past 90° and the front leg stays long (the
 *   kick-out's and the top turn's sourced knees, the animation-realism plan §5.11, §5.15; round 2: the owner's "the
 *   rider should load itself ready for the movement like the other stances", where 0.15 m read as standing). Opt-in,
 *   `snapDepth: 'deep'` loads them to the tube tuck's depth (SNAP_DEPTH_DEEP; snap-carve, 2026-11-08).
 * - **The shoulders turning first:** the upper body's twist (TWIST_RANGE, through the feet's grip) wound at once toward
 *   where the turn ends (`snapAim`) and unwound as the board comes round under it (Rapture: the head and shoulders
 *   rotate first; de Sousa 2022: the trunk rotates, the chest to the lip).
 * - **The lean the turn can hold:** the rider leans for a turn of SNAP_RADIUS, m, in place of TURN_RADIUS: the tail's
 *   rocker carves tighter than the whole rail, and real cutbacks and top turns run on a 2.2 m radius (Forsyth et al.
 *   2024).
 * Snap wins over the crouch, Compress and the trim held with it. The fins stall past FIN_STALL (`finForces`): pivoted
 * hard enough, the tail slides.
 */
const SNAP_PRESSURE = 0.7;
const SNAP_FREEDOM = 0.05;
const SNAP_DEPTH = 1;
/** A face tilted less than this, its slope's sine, has no fall line for Snap's aim (flat water, a swell's back). */
const SNAP_FACE = Math.sin((5 * Math.PI) / 180);
const SNAP_RADIUS = 2.2;
/**
 * Snap taken at full effort (snap-quick, the owner's research of 2026-11-05; docs/research/snap-quick-2026-11-05/README.md).
 * From Compress, with the legs already loaded, a snap is set up and started in about 0.2–0.5 s: the head and shoulders
 * turn first, abruptly, then the hips, and the weight is slammed onto the tail (surf coaching the owner gathered; Rapture:
 * the head and shoulders rotate "as fast as possible", and that rotation sets the snap's speed). Here the shoulders took
 * 0.55 s to 90 % of their wind and the weight 0.67 s to the tail (the drawn hips 0.85 s, all of it 1.3 s), at the
 * balance's calm pace, which every other stance keeps. While Snap is held the body goes about as fast as it can, from
 * Compress with the steer on: the shoulders 90 % in 0.35 s, the weight on the tail and the hips over it in 0.42 s.
 * - SNAP_TWIST_FREQUENCY, rad/s: the shoulders' wind critically damped at this, within the hips' torque and the feet's
 *   grip (TWIST_TORQUE, the grip at TWIST_GRIP_RADIUS). At 16 they took the 45° in 0.27 s, but the twist's reaction,
 *   which first turns the board away from the turn, grew with it and cut the snap's turn (its peak 132°/s at 9 m/s
 *   against 148).
 * - SNAP_SHIFT_TIME, s, and SNAP_SHIFT_SPEED, m/s: the weight's shift along the board, critically damped at this within
 *   an inverted pendulum's acceleration, g times how far the pressure can go ahead of the body (to the front foot, half
 *   the stance) over the body's height above the feet (Winter 1995; Hof et al. 2005): about 4 m/s² crouched in Compress
 *   against the calm 3 (STANDING_SHIFT_ACCELERATION). The speed is no tighter than that acceleration reaches over the
 *   shift (about 1 m/s over Snap's 0.25 m). The body moving back that fast pushes the board on under it a moment (a few
 *   tenths of a m/s), so Snap keeps a little more speed than at the calm pace (still water, 7 m/s: 5.0 m/s at 0.8 s
 *   against 4.7), still more than a carve sheds, in time and per degree.
 */
/**
 * Snap leaning for its own turn (snap-lean, the owner's pick of 2026-11-05, opt-in with `snapPivot: 'lean'`;
 * docs/research/snap-fan-2026-11-05/README.md): a full steer under Snap asks for up to SNAP_RAIL_RANGE of bank, still no
 * more than its SNAP_RADIUS turn holds at the board's speed, in place of the steer's RAIL_RANGE (50°). Top turns and
 * cutbacks ride a 75 ± 3° rail, against 42 ± 3° in bottom turns (Forsyth et al. 2024, 214 waves, a board-mounted IMU).
 * Measured headless (round 3): every Snap turns sharper (192–239°/s at the peak, against 151–237), and the still-water
 * fan's apex doubles (2.3 m vacuum); on still water, past the rail's bite, the board bogs and the rider falls at the stall
 * in 7 of 12 runs (2 by default). On a wave the face feeds the speed back; the owner rides it.
 */
const SNAP_RAIL_RANGE = MAX_BANK;
/**
 * Snap let go, the rider centres the weight and re-engages the fins (Rapture's snap: "centre the weight and re-engage the
 * fins"; de Sousa 2022's re-entry): the hips go back over the stance's middle, the shift's own place before Snap, at the
 * balance's pace, for up to RECENTRE_TIME, s, or until within RECENTRE_HOME, m; then the balance's band (TRIM_FREEDOM)
 * again. Before (snap-recentre, 2026-11-06), let go riding straight the body stayed over the tail, the centre of mass
 * 0.06–0.08 m ahead of the back foot against 0.30 before the snap: the pressure under it sat at the stance's middle, inside
 * the balance's band (which moves the body only for a pressure past 0.2 m), so nothing brought it back, and the owner saw
 * the surfer "stuck in snap stance" with the stance changed.
 */
const RECENTRE_TIME = 1;
const RECENTRE_HOME = 0.02;
/**
 * Snap's stamp (snap-stamp, the owner's ask of 2026-11-08: "turn less or very sharply with snap", opt-in with
 * `snapStamp: 'on'`; docs/research/snap-stamp-2026-11-08/README.md). The stick sets the sharpness. Under Snap a steer up
 * to STAMP_STEER is Snap's rail carve, the fins holding, as before. Past it the rider stamps: the upper body slams back
 * past the hips (already over the back foot) by up to STAMP_BACK, m, for STAMP_TIME, s, then comes back over the hips and
 * the side fins (the coaching: "slam the weight onto the tail, then centre it"; Rapture's snap: the fins "momentarily
 * lose grip", the tail slides, then the weight re-engages them). Nothing here turns the board: the weight behind the
 * fins unloads the nose and lets the centre fin's attack pass FIN_STALL (`finForces`), so the tail slides and the hull
 * pivots about the rider; back over the fins, they grip again. The cost is the speed the slide sheds.
 * - STAMP_STEER: the last fifth of the stick's throw. The owner's "all the way" is the stick at its rim; a pad's stick
 *   reads 0.8–1 there after its deadzone and the keys reach 1, while a held carve sits well inside it.
 * - STAMP_SET, s: the stamp waits for Snap's set-up, the weight on the tail and the hips over it (snap-quick: 0.42 s at
 *   full effort, the shoulders 90 % wound in 0.35 s). Stamped at once (round 3's lever), the lean came before the hips
 *   were over the tail, and the turns were shorter than without it.
 * - STAMP_BACK and STAMP_TIME: round 3's stamp (the whole TRIM_SHIFT, 0.25 m, for 0.3 s) turned the 150° climb at up to
 *   305°/s but stalled the board. Here, measured on the 15° plane's climbs: 0.15 m for 0.25 s keeps every rider on (0 of
 *   4 falls, today's Snap 1); 0.25 m turns more and falls as today does; 0.15 s turns less than 0.25 s.
 * - STAMP_REARM: the steer must come back under STAMP_STEER − this before another stamp, so a held stick stamps once.
 * - STAMP_RETURN, s: the lean's way back runs at the stamp's pace (Snap's own shift, SNAP_SHIFT_TIME) for this long.
 */
const STAMP_STEER = 0.8;
const STAMP_REARM = 0.2;
const STAMP_TIME = 0.25;
const STAMP_RETURN = 0.4;
const STAMP_SET = 0.3;
const STAMP_BACK = 0.15;
const SNAP_TWIST_FREQUENCY = 11;
/**
 * The agile legs (rider-agile, 2026-11-09, the owner: "surfers have incredible agility and balance and stretching
 * abilities, right now the playable surfer is a bit static"; `agile: 'on'`, opt-in; docs/research/rider-agile-2026-11-09).
 * The two feet act apart on the board, each force with its reaction on the body (no hidden motors):
 * - the feet's couple about the deck's normal (one foot pushes across the deck one way, the other the other way) turns
 *   the board, and its reaction turns the hips the other way (HIP_INERTIA, kg·m²: the pelvis, the thighs and the trunk's
 *   lower half about the body's long axis, de Leva 1996's segments; HIP_RANGE, the hips' rotation on fixed feet, Neumann's
 *   35–45° at each hip). Each foot pushes across the deck no harder than its grip (FOOT_FRICTION times its own load) and
 *   the leg's strength sideways (LEG_SIDE_STRENGTH body weights, hip abduction and adduction, Bohannon 1997; to be
 *   re-sourced), so the couple is at most the feet's span times the weaker foot's push;
 * - the legs' split along the board (one leg presses, the other lightens) pitches the board under the feet, and its
 *   reaction pitches the trunk the other way (TRUNK_INERTIA, kg·m², the trunk, head and arms about the hips' axis;
 *   TRUNK_RANGE). Neither foot pulls: the split is at most what takes one foot's load to nothing (TRUNK_TORQUE at most).
 * A full steer under Snap (STAMP_STEER, timed as the stamp is: once per press-and-turn, the stick's throw past the
 * threshold its depth) launches the tail: the pressure goes forward off the fins (toward AGILE_PRESSURE), the trunk
 * goes back, and the hips whip against the turn, their reaction throwing the board round under them; then the recovery
 * for STAMP_RETURN, all three back (the hips square over the board, the pressure over the fins).
 * AGILE_FREQUENCY, rad/s: how fast the hips and the trunk are asked to go, within those torques.
 * HIP_RANGE and TRUNK_RANGE are the launch's, measured on the 15° plane's climbs, not the joints' (40° and more): the
 * hips' 40° with the trunk's 20° reached 219–309°/s and threw every rider; 15° and 10° keep all four on, turning 48–87°
 * in the 0.8 s after the launch against today's 39–84°, the fins never past their stall.
 */
const HIP_INERTIA = 2.5;
const HIP_RANGE = (15 * Math.PI) / 180;
const LEG_SIDE_STRENGTH = 0.35;
const TRUNK_INERTIA = 8;
const TRUNK_RANGE = (10 * Math.PI) / 180;
const TRUNK_TORQUE = 150;
const AGILE_PRESSURE = 0.2;
const AGILE_FREQUENCY = 14;
const SNAP_SHIFT_TIME = 0.09;
const SNAP_SHIFT_SPEED = 1.2;
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
/**
 * Snap's deeper load (snap-carve, the owner's feedback of 2026-11-08, opt-in with `snapDepth: 'deep'`;
 * docs/research/snap-carve-2026-11-08/README.md): Snap's legs come down to the tube tuck's depth (MANUAL_CROUCH_DEPTH),
 * SNAP_DEPTH_DEEP of CROUCH_DEPTH. The cause: a loaded bottom turn and a full rail carve sit in the deepest surf crouch,
 * the knees and the hips at 90° or less (de Sousa 2022's fundamental phase; Kerr read at the turn's base: knees about 80° or
 * less, the lead hand at the water), as deep as the tuck the tube asks for. The owner's reference, Surf Analytica's "JJF and
 * one perfect full rail carve": the hips near the board through the bottom turn. The leg model goes there already (the
 * tuck's own travel), and within a 0.6 s Snap the legs reach 0.33–0.37 m (CROUCH_SPEED, the load). Measured headless
 * (round 2's single moves): the turn by 1 s within ±4° of Compress's depth and the peak up to 29°/s higher, but on still
 * water 5 of 12 riders fall after the release (2 at Compress's depth) and a snap taken deep turns less on a second snap; with
 * `snapPivot: 'lean'` 11 of 12 fall at either depth. So it is opt-in, to ride.
 */
const SNAP_DEPTH_DEEP = MANUAL_CROUCH_DEPTH / CROUCH_DEPTH;
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
 * The projection's catch (compress-exit, 2026-10-29), m/s: letting Compress go, the legs extend no faster than the
 * stance's spring can catch the body, g·√(m/k): 0.40 at the riding stance's 44 kN/m, 0.57 at Compress's softened 22 kN/m
 * (the reference rider's 73 kg).
 *
 * The leg is a spring under the body (Blickhan 1989's spring-mass leg), sagging m g / k under its weight. A body moving
 * up along it at v relative to the deck swings about that sag by v / ω (ω = √(k/m)); if the deck stops rising under the
 * feet, or drops away, the spring runs out of sag and the feet leave it once v / ω > m g / k, that is v > g / ω: a
 * jump's take-off, the push falling to zero with the body still rising (Linthorne 2001). Out of a compressed bottom turn
 * on the Canyon's Big, the legs rose at up to 1.25 m/s (EXTEND_ACCELERATION's 1.5 g, a 2.5–3 body-weight push) and the
 * body at 1.4 m/s off the deck. Where the board then came off the bottom and rolled out of the turn, the feet left
 * it for about 0.4 s, the unloaded board turned and slowed under the rider, and 9 of 14 riders on one wave fell 1.9–2.5 s
 * after standing. Coaches read the bottom turn's extension as progressive (De Sousa 2022), and the knees load 45–90 N·m
 * through river-wave turns (Weiß et al. 2024), not a jump's push. Caught, 13 of 14 ride on.
 *
 * Only letting Compress go: the pumping crouch let go keeps its pace, as the pumps' tests and the stance map pin it.
 * Compress's softening is the leg's own (CROUCH_SOFTENING), so the catch falls from 0.57 to 0.40 m/s as the leg stiffens
 * toward the riding stance.
 */
function projectionCatch(mass: number, stiffness: number): number {
  return WATER.gravity * Math.sqrt(mass / stiffness);
}
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
 * The projection rises tall (the phase-5 physics plan's item 2.2 A, the owner's
 * decision 6 of 2026-10-22): letting Compress go from at least TALL_FROM, m,
 * down while the board planes, the leg rises to the riding stance as before and,
 * once within TALL_START, m, of it, on to EXTENSION_TALL, m, over it; there it
 * settles back to it over EXTENSION_SETTLE, s. De Sousa 2022's final phase
 * extends the knees and hips progressively, to 150° or more at the knee: with
 * two 0.45 m bones the riding stance's 42° straightens to about 24° at +0.04 m
 * (0.06 m would be straight). Until then the ladder's top was the riding
 * stance, and the extension stood no taller than trim.
 *
 * Aimed tall from the moment of letting go, the leg rose faster through the
 * turn's load and pumped the board on: a late projection (let go at a 25° lean,
 * `projectionLean.test.ts`) kept 0.766 of its speed at 8.5 m/s against the
 * owner's 0.74 (0.731 before). Rising to the riding stance first, it keeps
 * 0.727. The pumping crouch let go stands no taller than before: risen tall,
 * the pump's balance read as a near fall (the drawn arms' alarm 0.26 against
 * 0.2). Within LEG_EXTENSION's travel up; a crouch or Compress taken again drops
 * the aim at once.
 */
export const EXTENSION_TALL = 0.04;
/**
 * The carve's flexing legs (carve-flex, 2026-11-10; `carveFlex: 'on'`, opt-in; docs/research/carve-flex-2026-11-10): on
 * a standing, stick-only carve the legs never bent (the turning-body study: the pelvis 0.77–0.78 m over the deck all
 * the way round, a tall body folded at the hips), where a surfer's knees sink through the bottom of a turn as its load
 * comes on and rise as it ends. So while the rider steers, the legs yield to the turn's load: the leg's rest comes down
 * by the load along the leg over the rider's weight (1 / cos of the lean in a steady turn; nothing riding straight or
 * across a face), reaching CARVE_FLEX of CROUCH_DEPTH at the load a full stick's lean carries (1 / cos RAIL_RANGE,
 * 1.56 body weights), and never more than the stick's own share of it: no stick, no flex. The stick let go mid-turn, the
 * legs sink no further and stand up as the board rolls back flat under them (its bank over RAIL_RANGE): standing up at
 * once, or as the load eased, threw the slowed rider back into its lean (the exit probe: 27 and 15 falls of 45, to 5
 * with straight legs and 7 this way). Either way the legs push the body up no faster than the stance's spring can catch
 * it (`projectionCatch`).
 *
 * It is the leg's own rest length, the one the crouch and Compress move, so all it does to the board goes through the
 * leg's spring at the feet: the board is unloaded while the body sinks and pressed while the legs push it back up.
 * It drops as Compress does (no faster than the body falls onto the legs, the feet only pushing).
 *
 * CARVE_FLEX 0.4 is 0.12 m: the deep end of the surf stance's half-squat (knees flexed 30–80°, Borgonovo-Santos et al.
 * 2021; de Sousa 2022's preparation, knees 90–110°), which the stance map reads at the pumping crouch's 0.117 m (knees
 * 102–104° drawn). River-wave turns peak at 45–51° of knee flexion (Weiss et al. 2025), inside it. Compress (0.3 m)
 * and the crouch stay the player's deeper stances: the deeper of them and the flex is the one the legs take.
 */
const CARVE_FLEX = 0.4;
/**
 * Snap's driving legs (snap-legs, 2026-11-10; `snapLegs: 'drive'`, opt-in; docs/research/snap-legs-2026-11-10): held,
 * Snap kept the legs at its full depth, a tight ball over the tail for as long as the button was down (the turning-body
 * study's cutback: the pelvis 0.47–0.55 m over the deck all the way round, drawn knees 51–100°), where a surfer comes
 * into the turn low and drives the legs out through it (the stance map: the front knee "extending through the snap",
 * de Sousa 2022; the turning-body study's cutback: knees 100–130° / 110–140°; Knox's cutback: low in the bottom turn, then pushing on
 * the back foot with the body held more upright). So under Snap with the stick
 * pushed, the legs load as before, and then extend as the board comes round under the wound shoulders: the leg's rest
 * rises from Snap's depth toward SNAP_DRIVE_DEPTH of CROUCH_DEPTH by how far the board's heading has turned the
 * stick's way since the furthest it went the other way (a Snap taken on the other rail first turns the old way for
 * 0.25–0.5 s: the load), over SNAP_DRIVE_TURN, and by how far the stick is pushed (half a stick, half the move; no
 * stick, Snap's held load as before). Once driven the legs stay out for that turn; the stick thrown the other way, or
 * Snap taken again, loads them anew.
 *
 * It is the leg's own rest length, the one the crouch, Compress and Snap move, so all it does to the board goes through
 * the leg's spring at the feet: the board is pressed while the legs push the body up. They rise no faster than the
 * stance's spring can catch the body (`projectionCatch`, as Compress let go).
 *
 * - SNAP_DRIVE_TURN is TWIST_RANGE (45°): the shoulders lead the board by as much as the spine turns, and the legs are
 *   out when the board has come round to where the shoulders pointed. Measured against 90° (the move half as big by the
 *   time Snap is let go, nothing better), the body's lean come over to the new rail in its place (earlier, 0.16 s sooner
 *   to fall), a 0.4 s clock from the rail change (as the heading, but a bare timer), and the twist unwinding (it never
 *   unwinds on flat water or across a face: no move).
 * - SNAP_DRIVE_DEPTH is CARVE_FLEX (0.4: 0.12 m, the pumping crouch's depth, the deep end of the surf stance's
 *   half-squat): the pelvis 0.68–0.70 m over the deck. Standing all the way up (0) drew the knees 3–7° straighter
 *   for a full-height body in a 2 m turn.
 */
const SNAP_DRIVE_DEPTH = CARVE_FLEX;
const SNAP_DRIVE_TURN = TWIST_RANGE;
const EXTENSION_SETTLE = 0.5;
const TALL_FROM = 0.05;
const TALL_START = 0.02;
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
 * The new surfer (step 3.2): the flat hand skimming the face is also a weak support, a plate's lift out of the water
 * along the surface's normal: C_L HAND_LIFT on HAND_AREA, m² (a flat plate at 20–40° of attack: C_L about 0.8–1.2;
 * Hoerner and Borst 1985, Fluid-Dynamic Lift, recalled), its share wet, with the drag at most HAND_FORCE_LIMIT.
 */
const HAND_LIFT = 1;
const HAND_AREA = 0.013;
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
  /**
   * How a pulling hand meets water outrunning it (`FEATHER_DRAG`): 'feather', the default, edge-on; 'old' broadside, as
   * before canyon-catch (the `?stroke=old` dev switch, for A/Bs).
   */
  stroke?: 'feather' | 'old';
  /**
   * How the legs extend letting Compress go (`projectionCatch`): by default no faster than the stance's spring can
   * catch the body; 'old' at the legs' full pace, as before compress-exit (the `?extension=old` dev switch, for A/Bs).
   */
  extension?: 'old';
  /**
   * Snap taken at full effort (snap-quick, 2026-11-05; SNAP_TWIST_FREQUENCY, SNAP_SHIFT_TIME): by default the shoulders
   * and the weight go as fast as the body can take them while Snap is held; 'old' at the balance's calm pace, as before
   * (the `?snapQuick=old` dev switch, for A/Bs).
   */
  snapQuick?: 'old';
  /**
   * Snap's lean (snap-lean, 2026-11-05; SNAP_RAIL_RANGE), opt-in: 'lean' lets a full steer under Snap lean as far as its
   * tight turn holds, up to MAX_BANK, in place of the steer's RAIL_RANGE (the `?snapPivot=lean` dev switch, to ride).
   */
  snapPivot?: 'lean';
  /**
   * After Snap (snap-recentre, 2026-11-06, the owner: "snap gets stuck in snap stance"; RECENTRE_TIME): by default the
   * rider centres the weight again when Snap is let go; 'old' leaves it over the tail until the balance's band is crossed,
   * as before (the `?snapRecentre=old` dev switch, for A/Bs).
   */
  snapRecentre?: 'old';
  /**
   * snap-upturn (2026-11-08, the owner: "I can't turn UP the wave"): with `snapPivot: 'lean'`, a Snap turning the board
   * up the face asks for the steer's RAIL_RANGE, the top turn's lean kept for turns down it; 'old' leans every Snap (the
   * `?snapUpturn=old` dev switch, for A/Bs).
   */
  snapUpturn?: 'old';
  /**
   * Snap's deeper load (snap-carve, 2026-11-08, the owner: "doesn't lower the center of gravity so much"; SNAP_DEPTH_DEEP),
   * opt-in: 'deep' loads Snap's legs to the tube tuck's depth (MANUAL_CROUCH_DEPTH, 0.45 m) in place of Compress's 0.3 m
   * (the `?snapDepth=deep` dev switch, to ride). By default as deep as Compress, as before.
   */
  snapDepth?: 'deep';
  /**
   * Snap's stamp (snap-stamp, 2026-11-08, the owner: "turn less or very sharply with snap"; STAMP_STEER), opt-in: 'on'
   * makes a full steer under Snap slam the weight back past the tail for a moment, then over the fins again (the
   * `?snapStamp=on` dev switch, to ride). A partial steer is today's Snap, as is every Snap by default.
   */
  snapStamp?: 'on';
  /**
   * The agile legs (rider-agile, 2026-11-09; HIP_INERTIA), opt-in: 'on' lets the two feet act apart on the board (the
   * feet's couple against the hips, the legs' split against the trunk), and a full steer under Snap launches the tail
   * with them in place of the stamp (the `?agile=on` dev switch, to ride). By default as before.
   */
  agile?: 'on';
  /**
   * The leg drive (leg-drive, 2026-11-10; LEAN_OUT_PULL's note), opt-in: 'on' makes the rail change's righting push a
   * pair through the legs, on the body toward the new rail and the opposite on the board at the back foot, in
   * LEAN_OUT_PULL's place and without Compress's gate (the `?legDrive=on` dev switch, to ride). By default as before.
   */
  legDrive?: 'on';
  /**
   * The carve's flexing legs (carve-flex, 2026-11-10; CARVE_FLEX), opt-in: 'on' lets a standing rider's legs yield to a
   * steered turn's load, the knees sinking as it comes on and extending as it ends, to a moderate crouch at most (the
   * `?carveFlex=on` dev switch, to ride). By default the stick alone never bends the legs, as before.
   */
  carveFlex?: 'on';
  /**
   * Snap's driving legs (snap-legs, 2026-11-10; SNAP_DRIVE_DEPTH), opt-in: 'drive' lets the legs of a rider turning
   * under Snap extend as the board comes round, pressing it through the feet, in place of holding Snap's full depth for
   * as long as it is held (the `?snapLegs=drive` dev switch, to ride). By default Snap holds its depth, as before.
   */
  snapLegs?: 'drive';
  /**
   * Snap's rail change (snap-cross, 2026-11-10), opt-in: 'on' has a Snap taken on the other rail keep the weight where
   * it is until the body has come over the board, and has the back foot push the body across (the leg drive) meanwhile
   * (the `?snapCross=on` dev switch, to ride). By default Snap puts the weight on the tail at once, as before.
   */
  snapCross?: 'on';
  /**
   * The legs' power limit (A-lite, the advisor's ruling 27; docs/research/board-in-water/a-lite), opt-in: 'cap' stops
   * the standing contact making energy on steep water. When feet on a deck cannot give the push the coupled solve
   * needs, the board takes no more than the legs transmit (the leg's own force along its line, not the pair's push),
   * and the contact's net positive power stays within LEG_POWER_PEAK at any instant and LEG_POWER_HELD over any
   * LEG_POWER_WINDOW (the `?legPower=cap` dev switch, to ride). By default as before.
   */
  legPower?: 'cap';
  /**
   * The new surfer (docs/research/new-rider/design.md, the advisor's ruling 29), opt-in: 'new' builds its steps behind
   * the `?rider=new` dev switch. Step 3.1: standing, the body is free along the board as well (`StandingBody`, a ninth
   * unknown in the board's solve), leaning with the face on its pitch ankle; the knees are softer, with a strength cap
   * in place of MAX_LOAD; and the contact's power is A-lite's window (LEG_POWER_PEAK, LEG_POWER_HELD). Step 3.2: free
   * across as well, with no drive left, balanced by a human's delayed moves (`HumanBalance`). Every other phase as
   * before. By default the old rider.
   */
  rider?: 'new';
  /** The new surfer standing free: the board's substeps per frame (NEW_STANDING_SUBSTEPS by default; for the probes' substep trials). */
  standingSubsteps?: number;
  /**
   * The new surfer standing free (step 3.2b): a scale on the rider's own yaw inertia (`riderYawInertia`), which turns
   * with the board through the planted feet. 1 by default; 0 is 3.2's point mass (for the probes' comparisons only).
   */
  yawInertiaScale?: number;
  /** The new surfer standing free: the roll balance's gains in place of HUMAN_BANK_GAIN, HUMAN_BANK_RATE_GAIN and HUMAN_BANK_FORWARD (for the probes' sweeps only). */
  humanGains?: { bank?: number; bankRate?: number; forward?: number };
  /**
   * The new surfer's balance by prediction (step 3.2e), for the probes' rounds only: the design's weights (over
   * DEFAULT_WEIGHTS), the lean asked's pace (rad/s; REFERENCE_RATE by default), the reference's steady turn ('linear' by
   * default since 3.2f, or 'linear'), and the bank rate's sense ('canal' by default: the body's own angular rate; or 'difference': the
   * bank's change over a substep, 3.2's), and the legs' passive twist in the game (TWIST_STIFFNESS, TWIST_DAMPING: braced or
   * relaxed for the yaw step's report; the internal model keeps its own).
   */
  balance?: { weights?: Partial<DesignWeights>; leanRate?: number; turn?: 'linear' | 'tan'; rateSense?: 'canal' | 'difference'; twist?: { stiffness?: number; damping?: number }; railCap?: number };
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
export const PUSH_TIME = 0.72;
export const LANDING_TIME = 0.48;
export const SETTLE_TIME = 0.8;
export const RECOVER_TIME = 0.6;
/**
 * Climbing back on from the water (swim-back, 2026-10-29): the hands on the rails push the chest up out of the water
 * and the body slides along onto the deck, from wherever the swimmer's parts were into the prone posture, over
 * CLIMB_TIME, s. Provisional, by the pop-up's own two moves: the arms' push up (PUSH_TIME, 0.72 s, Borgonovo-Santos
 * 2021) and a move of the whole body onto its support (LANDING_TIME, 0.48 s). The body comes across and along the
 * board low, still floating, over the first CLIMB_ACROSS of the time, and rises onto it from CLIMB_RISE of it on: risen
 * first beside the board, out of the water, its weight came onto the near rail and rolled the board over.
 */
export const CLIMB_TIME = 1.2;
const CLIMB_ACROSS = 0.55;
/** Climbing on, the drawn hands reach the rails over this share of the climb, from where the swimmer's arms were. */
const CLIMB_HANDS = 0.25;
const CLIMB_RISE = 0.15;
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
  /** Done on the body by the legs' drive at a rail change (`legDrive: 'on'`): the legs' own work, with the board's share in its ledger. */
  legDrive: number;
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
  readonly work: RiderWork = { gravity: 0, water: 0, contact: 0, lip: 0, assist: 0, carry: 0, leanOut: 0, legDrive: 0 };
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
  /** Standing, Snap (the snap stance): 0 (none) to 1 (held): the weight on the tail, the back knee deep, the shoulders turning toward the steer; it wins over the crouch, Compress and the trim. */
  snap = 0;
  /** Snap's aim, latched as it is taken: the side the turn goes (+1 the board's left), and where on the face it ends (level, unit; zero on flat water). */
  private snapSide = 0;
  private readonly snapTarget = new Vector3();
  private snapHeld = false;
  /** Standing, the upper body's rotation asked for (`RideInput.rotate`), −1 to 1 toward the board's +x; NaN when none is (the body turns with the ride). */
  rotate = Number.NaN;
  /** Standing, the wave-side hand reaches for the water. */
  hand = false;
  /** Standing, the requested weight shift: −1 (toward board −x, its right) to 1 (toward +x, its left). */
  steer = 0;
  /** Lying down, the heading the paddler keeps (rad from +z toward +x), and the correction it asks of the strokes now. */
  private line: number | undefined;
  private hold = 0;
  /** The heading error and yaw rate the line keeping reads, smoothed over the strokes (rad, rad/s). */
  private lineError = 0;
  private lineRate = 0;
  /** Buoyancy on the body at the latest substep, N. */
  readonly buoyancy = new Vector3();
  /** Contact over the latest step: mean force on the rider (N, world), centre of pressure (board frame) and more. */
  readonly contact = {
    force: new Vector3(),
    centreOfPressure: new Vector3(),
    /** Share of the load on the front foot, from where the centre of pressure falls between the feet. */
    frontShare: 0,
    /** Upright, the weight: `frontShare` low-passed over WEIGHT_TIME (0 the back foot, 1 the front); NaN in any other phase. */
    weight: Number.NaN,
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
  /** How far through its cycle the left arm is (the right half a cycle on), 0–1; and the cycle now, s. */
  private strokePhase = 0;
  private strokeCycle = ARM_CYCLE;
  /** The side paddle's fast share eased toward the stick's (SWEEP_FAST_EASE). */
  private sweepEase = 0;
  /** Paddling, the sprint: 0 cruising to 1 at SPRINT_CYCLE (read only). */
  sprint = 0;
  /** Lying down, the player's sprint paddle (SPRINT_PADDLE_CYCLE): asked for, with the reserve to give it (`RideSession`). */
  paddleSprint = false;
  /** How far the strokes have gone over to the player's sprint, 0 cruising to 1 (read only). */
  paddleSprintShare = 0;
  /** Sprinting, the pulling arm's drag area broadside to the stroke this substep, m² (SPRINT_PADDLE_AREA). */
  private bladeArea = 0;
  /** A hand is pulling this substep (`paddleStep`): one the board outruns feathers (`FEATHER_DRAG`), unless the stroke is 'old'. */
  private pulling = false;
  private readonly feathers: boolean;
  /** Letting Compress go, the legs extend no faster than the stance's spring can catch the body (`projectionCatch`); false with `extension: 'old'`. */
  private readonly catches: boolean;
  /** Snap at full effort (SNAP_TWIST_FREQUENCY, SNAP_SHIFT_TIME); false with `snapQuick: 'old'`. */
  private readonly quick: boolean;
  /** Snap leans for its own turn (SNAP_RAIL_RANGE); only with `snapPivot: 'lean'`. */
  private readonly snapLean: boolean;
  /** Snap turning up the face asks for the steer's rail (snap-upturn); false with `snapUpturn: 'old'`. */
  private readonly upturnKept: boolean;
  /** Snap let go, the weight is centred again (RECENTRE_TIME); false with `snapRecentre: 'old'`. */
  private readonly recentres: boolean;
  /** Snap's load, of CROUCH_DEPTH (SNAP_DEPTH; SNAP_DEPTH_DEEP with `snapDepth: 'deep'`). */
  private readonly snapDepth: number;
  /** Snap's share the latest step, and how long the centring after it has run, s (NaN while none runs). */
  private snapBefore = 0;
  private recentreTime = Number.NaN;
  /** Snap's stamp (STAMP_STEER); only with `snapStamp: 'on'`. */
  private readonly stamps: boolean;
  /** The stamp running: its time, s (NaN while none runs), its depth 0–1, and whether a new press-and-turn may start one. */
  private stampTime = Number.NaN;
  private stampDepth = 0;
  private stampArmed = true;
  private snapHeldTime = 0;
  /** The agile legs (HIP_INERTIA); only with `agile: 'on'`. */
  private readonly agile: boolean;
  /** Agile: the hips' turn about the body's up against the board, rad (positive toward the board's left), and the trunk's pitch about the body's side axis (the board's +x on a level body; positive forward), with their rates. */
  readonly hip = { angle: 0, rate: 0 };
  readonly trunk = { angle: 0, rate: 0 };
  /** Agile: the torques on the hips and the trunk this substep, N·m, and their axes in the world (the body's up square to the board's length, and across the body). */
  private hipTorque = 0;
  private trunkTorque = 0;
  private readonly trunkAxis = new Vector3(1, 0, 0);
  private readonly hipAxis = new Vector3(0, 1, 0);
  /**
   * The limbs' ledger this substep: what the body's contacts other than the line of force (each foot's push across and
   * along the deck; later a hand on a rail) do to the board, as a force and a moment about its centre of mass, N and
   * N·m in the world. The body takes the opposite. `limbs` lists each contact's point (board frame) and force (world).
   */
  private readonly limbForce = new Vector3();
  private readonly limbTorque = new Vector3();
  readonly limbs: { name: string; point: Vector3; force: Vector3 }[] = [];
  private readonly footEntries = [{ name: 'front foot', point: new Vector3(), force: new Vector3() }, { name: 'back foot', point: new Vector3(), force: new Vector3() }];
  /** Agile: the front foot's share from the line of force alone, before the legs' split. */
  private lineShare = 0.5;
  /** The sprint's blade area over the hand's (SPRINT_PADDLE_AREA, or the 'old' stroke's SPRINT_PADDLE_AREA_BROADSIDE). */
  private readonly sprintArea: number;
  /** How much of the stroke's roll the prone balance asks for, 0–1, and how calm the water under the board is for it, 0–1. */
  private strokeRoll = 0;
  private waterCalm = 1;
  /** A posture transition: where it started (board frame), how far along it is and how long it takes, s. */
  private readonly fromParts: Float64Array;
  /** The transition is a climb from the water (`climbFrom`): its path comes across low, then rises. */
  private climbing = false;
  private readonly handRail = new Vector3();
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
  /** The new surfer's senses for its balance (step 3.2e), the model's order and signs. */
  private readonly senseScratch = new Array<number>(7).fill(0);
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
  /** Where the rider wants its centre of pressure, relative to the middle of the support: along the board, where W/S hold it (TRIM_PRESSURE). */
  readonly copTarget = { x: 0, z: 0 };
  /** Pushing up, how far the arms let the body over the high rail as the board rolls under it, m, and its rate (`armsGiveStep`). */
  private armsGive = 0;
  private armsGiveRate = 0;
  /** The prone posture's centre of mass over the deck, m: pushing up, the arms give for the lift above it. */
  private readonly proneHeight: number;
  /** The steering lean of the upper body across the board, m, and its rate. */
  private readonly lean = new Vector3();
  private readonly leanRate = new Vector3();
  private stepImpulse = new Vector3();
  private stepLoad = 0;
  /** The new surfer: the feet's load the latest substep, in body weights (the capture point's validity condition, step 3.2h). */
  captureLoad = 0;
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
  /** Standing, the share of EXTENSION_TALL the leg's rest aims over the riding stance (the projection rising tall), and whether it has got there and is settling back. */
  private tall = 0;
  private tallReached = false;
  private tallFrom = false;
  /** The leg was last brought down by Compress (not the crouch alone): letting it go is the projection. */
  private fromCompress = false;
  /** The carve's flexing legs; only with `carveFlex: 'on'`. */
  private readonly carveFlexes: boolean;
  /** The leg was last brought down by the carve's flex: the load easing, it rises at the projection's catch. */
  private fromFlex = false;
  /**
   * Snap's rail change (snap-cross, 2026-11-10; `snapCross: 'on'`, opt-in; docs/research/snap-rail-change-2026-11-10).
   * Snap taken with the stick thrown against a carve put the weight on the tail within 0.3 s, the body still leaning
   * 40° into the old turn: the old carve tightened (75 -> 110-155°/s the old way) for the 0.4-0.5 s the body takes to
   * come over the board, and ran the heading 35° further the wrong way. A surfer comes out of the bottom turn with the
   * weight even, the body crossing the board, and weights the tail on the new rail (the stance map: Knox's cutback,
   * "weight more even" up the face; Hobgood: back on the tail into the snap). So while the body still leans against
   * the stick's side under Snap (more than UPRIGHT_BANK, measured as Snap or the stick's side begins), Snap's weight
   * shift waits (the balance holds where it was), and the back foot pushes the body across as the leg drive does
   * (`legDriveStep`: the same push, grip and reach, with or without `legDrive: 'on'`). Once the body is over the board
   * the weight goes back as before. A Snap taken upright, or on the rail it is already on, is unchanged.
   */
  private readonly snapCrosses: boolean;
  /** The side the Snap's stick asks (+1 the board's left; 0 before it says), and whether the body has come over to it. */
  private crossSide = 0;
  private crossed = true;
  /** The legs' power limit (LEG_POWER_PEAK, LEG_POWER_HELD); only with `legPower: 'cap'`. */
  readonly capsLegs: boolean;
  /** The new surfer (`rider: 'new'`); and the power window kept, with `legPower: 'cap'` or the new surfer. */
  private readonly newRider: boolean;
  private readonly newSubsteps: number;
  private readonly yawScale: number;
  private readonly bankGain: number;
  private readonly bankRateGain: number;
  private readonly bankForward: number;
  /**
   * The new surfer standing free (step 3.2b, `coupleYaw`): the body's own spin about its long axis, rad/s (world, about
   * `up`), the inertia it turns with, kg·m², and whether it was coupled to the board's yaw through the feet this substep.
   */
  private yawSpin = 0;
  yawInertia = 0;
  private yawCoupled = false;
  /**
   * The new surfer standing free (step 3.2e): the twist as a body degree of freedom (`coupleYaw`, `finish`). `angle` the
   * upper body's yaw less the board's, rad, and `rate` its rate, rad/s (about `up`, + to the board's left, as `twist`);
   * `upper` the upper body's own spin, rad/s (world, about `up`); `active` the twist's active torque through the muscles'
   * lag and `torque` the legs' whole torque on the board the latest substep, N·m (+ turns the board to its left; the
   * upper body takes the other); the rest is the substep's implicit coupling, kept for `finish`.
   */
  readonly twistBody = { angle: 0, rate: 0, upper: 0, active: 0, torque: 0, coupled: false, inertia: 0, alpha: 0, beta: 0, gain: 0, spring: 0, turn: 0 };
  /** The twist asked for (the pad's rotation or Snap's aim), rad: the balance's reference for the twist (step 3.2e). */
  private twistAsked = 0;
  /** The lean the player asks for (the steer and the hand), eased as `bankReference`, rad: the new surfer's balance's reference (step 3.2e). */
  private leanAsked = 0;
  /**
   * The new surfer standing free (step 3.2e): balance by prediction (`PredictiveController`, `predictor`), on its own
   * clock of simulated time (`controlDue`, s to its next tick), the commands held between its ticks (this file's signs):
   * the ankle's command before the feet's reach (the hip takes the rest; the predictor is fed the reach's) and the twist's torque.
   * Off with `humanGains` (3.2's delayed law, the probes' comparisons): the twist then is passive.
   */
  private readonly predictive: boolean;
  readonly predictor: PredictiveController;
  private readonly leanPace: number;
  private readonly rateSense: 'canal' | 'difference';
  /** The legs' passive twist, N·m/rad and N·m·s/rad (TWIST_STIFFNESS, TWIST_DAMPING unless a probe braces or relaxes it). */
  private readonly twistStiffness: number;
  private readonly twistDamping: number;
  /** How far onto its rail the balance's schedule is trusted, rad (SCHEDULE_RAIL_CAP). */
  private readonly railCap: number;
  private controlDue = 0;
  private heldAnkleRaw = 0;
  /** The rail the balance's schedule is reading, rad (step 3.2f; for the probes). */
  schedRail = 0;
  private heldTwist = 0;
  /** The latest substep, s (`coupleYaw` has no step of its own). */
  private substep = 0;
  private readonly windowed: boolean;
  /** The new surfer standing: the body's pitch on the board (`StandingBody`), and its forward axis (world). */
  readonly standingBody = new StandingBody();
  private readonly forward = new Vector3(0, 0, 1);
  /** The new surfer: the body's own push through the feet, low-passed over SPECIFIC_FORCE_TIME, N (world): the pitch reference's slow trim. */
  private readonly bodyPush = new Vector3(0, 1, 0);
  /**
   * The new surfer standing, step 3.2 (`HumanBalance`): the delayed balance across (the roll's rest, the hip across, the
   * knees and arms), the capture point and the reserve; the friction and the knees' strength used, 0–1, the latest contact.
   */
  readonly human = new HumanBalance();
  /** The new surfer: the hip across's lagged demand, N·m, and the leg depth the player's stance holds, m (`stanceDepth`). */
  private swingLagged = 0;
  private heldDepth = 0;
  private frictionUsed = 0;
  private kneeUsed = 0;
  /** The new surfer: the capture point's scratch (`captureStep`). */
  private readonly captureFeet = new Vector3();
  private readonly captureOffset = new Vector3();
  private readonly captureVelocity = new Vector3();
  private readonly captureFelt = new Vector3();
  private readonly captureScratch = new Vector3();
  /** The pair's momentum the latest substep, kg·m/s, and its specific force low-passed, m/s² (world); fresh until the first. */
  private readonly pairMomentum = new Vector3();
  private readonly pairFelt = new Vector3(0, WATER.gravity, 0);
  private pairFresh = true;
  /** The new surfer standing, the hand in the water: the water's support on it along its surface's normal, N (world), the latest substep. */
  readonly handSupport = new Vector3();
  private supporting = false;
  /** The contact's net work this substep may still do, J (`legPower: 'cap'`), and the substeps' net works over the last LEG_POWER_WINDOW: their end times on the rider's clock, s, and works, J, a ring. */
  private powerBudget = Infinity;
  private powerClock = 0;
  private powerEnds = new Float64Array(1024);
  private powerWorks = new Float64Array(1024);
  private powerHead = 0;
  private powerCount = 0;
  private powerSum = 0;
  private readonly powerScratch = new Vector3();
  private readonly powerScratch2 = new Vector3();
  /** The back foot's push at a rail change: the leg drive, or Snap's rail change under Snap. */
  private get drives(): boolean {
    return this.legDrive || (this.snapCrosses && this.snapping > 0);
  }
  /** Snap's driving legs (SNAP_DRIVE_DEPTH); only with `snapLegs: 'drive'`. */
  private readonly snapDrives: boolean;
  /** The side Snap's turn goes while it is held (+1 the board's left; 0 before the stick says), and the board's level heading the latest step, rad. */
  private snapDriveSide = 0;
  private snapDriveYaw = 0;
  /** How far the board's heading has turned that side since, rad; the furthest it went the other way first; and how far round it has come from there, of SNAP_DRIVE_TURN (0–1, never back). */
  private snapDriveTurn = 0;
  private snapDriveLow = 0;
  private snapDriven = 0;

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
  /** The board's roll into the water toward the lean asked for, PULL_LOOKAHEAD on at its present roll rate, rad (COMPRESS_PULL's bite). */
  private railAhead = 0;
  /** The water's surface normal under the board (the world's up off the water): the level the rail's bite is read from (RAIL_BITE), and the level a prone body keeps (PRONE_ROLL_SHIFT). */
  private readonly waterUp = new Vector3(0, 1, 0);
  /** The water's own flow under the board, level, m/s: the compressed turn's rules read the board's motion through it. */
  private readonly waterFlow = { x: 0, z: 0 };
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
  /** The board whose hollow the part in hand stands over (`overHollow`), where along it, m, and the deck plane's height under the part, m. */
  private hollowBoard?: BoardBody;
  private hollowZ = 0;
  private hollowY = 0;
  /** The leg drive; only with `legDrive: 'on'`. */
  private readonly legDrive: boolean;
  /** The leg drive on the body, N (world); the board takes the opposite at the back foot, `driveFoot` from its centre (world). */
  private readonly driveForce = new Vector3();
  private readonly driveFoot = new Vector3();
  private readonly driveDirection = new Vector3();
  private driveStep = 0;
  private driveSide = 0;
  private driveUsed = 0;
  private driveReach = 0;

  constructor(shape: BoardShape, options: AttachedRiderOptions = {}) {
    this.shape = shape;
    this.mass = options.mass ?? REFERENCE_RIDER.mass;
    this.stance = options.stance ?? 'regular';
    this.phase = options.phase ?? 'prone';
    this.feathers = (options.stroke ?? 'feather') === 'feather';
    this.catches = options.extension !== 'old';
    this.quick = options.snapQuick !== 'old';
    this.snapLean = options.snapPivot === 'lean';
    this.upturnKept = options.snapUpturn !== 'old';
    this.recentres = options.snapRecentre !== 'old';
    this.snapDepth = options.snapDepth === 'deep' ? SNAP_DEPTH_DEEP : SNAP_DEPTH;
    this.agile = options.agile === 'on';
    this.legDrive = options.legDrive === 'on';
    this.carveFlexes = options.carveFlex === 'on';
    this.snapDrives = options.snapLegs === 'drive';
    this.snapCrosses = options.snapCross === 'on';
    this.capsLegs = options.legPower === 'cap';
    this.newRider = options.rider === 'new';
    this.newSubsteps = options.standingSubsteps ?? NEW_STANDING_SUBSTEPS;
    this.yawScale = options.yawInertiaScale ?? 1;
    this.bankGain = options.humanGains?.bank ?? HUMAN_BANK_GAIN;
    this.bankRateGain = options.humanGains?.bankRate ?? HUMAN_BANK_RATE_GAIN;
    this.bankForward = options.humanGains?.forward ?? HUMAN_BANK_FORWARD;
    this.predictive = this.newRider && options.humanGains === undefined;
    this.predictor = new PredictiveController(options.balance?.weights ? { ...DEFAULT_WEIGHTS, ...options.balance.weights } : undefined, options.balance?.turn ?? 'tan');
    this.leanPace = options.balance?.leanRate ?? LEAN_IN_RATE;
    this.rateSense = options.balance?.rateSense ?? 'canal';
    this.twistStiffness = options.balance?.twist?.stiffness ?? TWIST_STIFFNESS;
    this.twistDamping = options.balance?.twist?.damping ?? TWIST_DAMPING;
    this.railCap = ((options.balance?.railCap ?? SCHEDULE_RAIL_CAP) * Math.PI) / 180;
    this.windowed = this.capsLegs || this.newRider;
    this.stamps = options.snapStamp === 'on' && !this.agile;
    this.sprintArea = this.feathers ? SPRINT_PADDLE_AREA : SPRINT_PADDLE_AREA_BROADSIDE;
    this.partMasses = riderPartMasses(this.mass);
    this.partVolumes = riderPartVolumes(this.mass);
    this.feet = stanceFeet(shape);
    const pose = riderPose(shape, this.posePhase(), this.stance);
    this.parts = pose.parts.slice();
    this.fromParts = pose.parts.slice();
    this.support = pose.support;
    const lying = postureCenter(riderPose(shape, 'prone', this.stance).parts, this.partMasses);
    this.proneHeight = lying.y - deckHeight(shape, lying.z);
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

  /**
   * The new surfer standing (`rider: 'new'`, step 3.1): the body is free along the board too, its speed along its
   * forward axis the ninth unknown of the board's solve (`StandingBody`). Step 3.2: free across as well with no drive
   * left (no roll drive, shifts or sway), balanced by `HumanBalance`. Landing and every other phase as before.
   */
  get freeBody(): boolean {
    return this.newRider && this.upright && this.phase === 'standing';
  }

  /**
   * The board's substeps while this rider stands (`BoardBody.step`): the old rider's 32 (`STANDING_SUBSTEPS`, for its
   * upright drive's one-substep lag, P4e's Mode A); the new surfer standing free, NEW_STANDING_SUBSTEPS (step 3.2: no
   * drive is left, so the fewest that pass its bars).
   */
  get standingSubsteps(): number | undefined {
    return this.freeBody ? this.newSubsteps : undefined;
  }

  /** The standing contact's power is capped: A-lite (`legPower: 'cap'`), or the new surfer standing (its window only; rule 1 is its own). */
  get powerCapped(): boolean {
    return this.capsLegs || this.freeBody;
  }

  /** Snap held, 0–1 (the snap stance): standing only; it wins over the crouch, Compress and the trim. The rig gates Snap's arms on it. */
  get snapping(): number {
    return this.upright && this.phase === 'standing' && this.snap > 0 ? Math.min(1, this.snap) : 0;
  }

  /** The crouch and Compress asked for, as the stance takes them: Snap held wins over both. */
  private get crouchAsked(): number {
    const snap = this.snapping;
    return snap > 0 ? this.crouch * (1 - snap) : this.crouch;
  }

  private get compressAsked(): number {
    const snap = this.snapping;
    return snap > 0 ? this.compress * (1 - snap) : this.compress;
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
    if (!this.attached || this.phase !== 'prone' || this.climbing || this.duck.press > DUCK_BUSY) return false;
    this.beginTransition('push', PUSH_TIME);
    this.popUpTime = 0;
    Object.assign(this.popUpReport, { outcome: 'rising', duration: 0, landingPeak: 0, frontShare: 0, refusal: undefined });
    return true;
  }

  /**
   * Climb back on from the water (swim-back, 2026-10-29): before the board takes the rider (`BoardBody.attach`), the
   * transition into the prone posture starts from the swimmer's own parts, `parts` (world, x y z per part in
   * `RIDER_PARTS` order), over CLIMB_TIME, coming across before it rises. The phase is 'prone' throughout (the drawn
   * body follows the parts); climbing, it neither paddles, pops up nor shows the cue. The contact carries it as any
   * posture change: if it cannot hold the body (a wave, a board torn away), the rider lets go into the water again.
   */
  climbFrom(parts: ArrayLike<number>, board: BoardBody): void {
    this.beginTransition('prone', CLIMB_TIME);
    // Lying, the body turns with the board, from the step it is mounted (duck-drawn): its own turn was the one it had
    // when it last rode, before the fall or the dive, and the parts were drawn turned by it for the first step back on.
    this.orientation.copy(board.orientation);
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      board.toLocal(this.scratch.set(parts[i * 3], parts[i * 3 + 1], parts[i * 3 + 2]), this.scratch2);
      this.fromParts[i * 3] = this.scratch2.x;
      this.fromParts[i * 3 + 1] = this.scratch2.y;
      this.fromParts[i * 3 + 2] = this.scratch2.z;
    }
    this.climbing = true;
  }

  /** Climbing back on from the water (`climbFrom`), until lying on the board. */
  get climbingOn(): boolean {
    return this.attached && this.climbing;
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
    // The balance shift (and the arms' give) is folded into where the transition starts.
    this.balance.set(0, 0, 0);
    this.balanceRate.set(0, 0, 0);
    this.armsGive = 0;
    this.armsGiveRate = 0;
    this.phase = phase;
    this.phaseTime = 0;
    this.phaseDuration = duration;
    this.climbing = false;
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
    } else if (ended === 'prone') {
      // On the board after a climb.
      this.fromParts.set(this.parts);
      this.climbing = false;
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
    this.sprint = 0;
    this.paddleSprintShare = 0;
    this.strokeRoll = 0;
    this.waterCalm = 1;
    this.balance.set(0, 0, 0);
    this.balanceRate.set(0, 0, 0);
    this.armsGive = 0;
    this.armsGiveRate = 0;
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
    this.waterUp.set(0, 1, 0);
    this.waterFlow.x = 0;
    this.waterFlow.z = 0;
    this.covered = false;
    this.ankleTorque = 0;
    this.swingTorque = 0;
    this.swing.angle = 0;
    this.swing.rate = 0;
    this.resetTwist();
    // The new surfer: nothing felt yet, and (standing) the body square to the deck (`frame`), in pitch and, on a planing
    // board, across too: as a body balances on a board sliding freely down its face, where the felt vertical is the
    // face's normal. Square in pitch alone, plumb across (step 3.1), a start across a face had its bank run uphill.
    if (this.newRider) {
      this.standingBody.reset();
      this.human.reset();
      this.yawCoupled = false;
      this.resetBalance();
      this.pairFresh = true;
      this.swingLagged = 0;
      this.heldDepth = 0;
      this.frictionUsed = 0;
      this.kneeUsed = 0;
      if (this.upright && this.phase === 'standing' && board.velocity.length() > PLANING_SPEED) {
        this.planing = true;
        this.banked = true;
      }
    }
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
    this.work.legDrive = 0;
    if (this.windowed) this.resetPower();
    this.driveUsed = 0;
    this.driveSide = 0;
    this.driveForce.set(0, 0, 0);
    this.crossSide = 0;
    this.crossed = true;
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
    this.tall = 0;
    this.tallReached = false;
    this.tallFrom = false;
    this.fromCompress = false;
    this.fromFlex = false;
    this.snapDriveSide = 0;
    this.snapDriven = 0;
    this.legRateAfter = 0;
    this.balanceMargin = 1;
    this.rawMargin = 1;
    this.contact.weight = Number.NaN;
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
    // The new surfer standing (step 3.2, design §6): the least of the capture point's margin, the grip left and the knees' strength left.
    if (this.freeBody) return Math.max(0, Math.min(this.human.state.margin, 1 - this.frictionUsed, 1 - this.kneeUsed));
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
   * mass and velocity, a body frame whose up is the head's direction (along
   * the board lying down, the rider's up standing), spinning with the rider,
   * and, given room for them, its own parts' centres in the world (the phase 5
   * physics plan, item 2.10: the fall starts from the rider's pose).
   */
  handoffState(out: { center: Vector3; orientation: Quaternion; velocity: Vector3; angularVelocity: Vector3; parts?: Float64Array }): typeof out {
    out.center.copy(this.position);
    out.velocity.copy(this.velocity);
    out.angularVelocity.copy(this.angularVelocity);
    out.orientation.copy(this.orientation);
    if (!this.upright) out.orientation.multiply(this.spin.setFromAxisAngle(X, Math.PI / 2));
    if (out.parts) {
      for (let i = 0; i < RIDER_PARTS.length; i += 1) this.partPosition(i, this.scratch).toArray(out.parts, i * 3);
    }
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
    if (index < 3) return this.turned(this.swung(index, this.partPosition(index, out), SWING_DRAWN_CHEST));
    const upright = this.phase === 'landing' || this.phase === 'standing';
    if (index === 3 || index === 4) {
      const side = index === 3 ? 0 : 1;
      if (this.climbing) {
        // Climbing on: the hands go from where the swimmer's arms were to the rails beside the chest (within the board's
        // length) over the climb's first CLIMB_HANDS, then hold them there.
        const z = Math.max(-this.shape.length / 2 + 0.05, Math.min(this.shape.length / 2 - 0.05, this.parts[1 * 3 + 2]));
        const rail = board.toWorld(this.localScratch.set((side === 0 ? 1 : -1) * this.halfWidth(z), deckHeight(this.shape, z), z), this.handRail);
        const reach = minimumJerk(Math.min(1, this.phaseTime / (CLIMB_HANDS * this.phaseDuration)));
        return this.partPosition(index, out).lerp(rail, reach);
      }
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
      return this.turned(this.swung(index, out, SWING_DRAWN_CHEST));
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
    // The new surfer: about the body's own forward axis, which pitches with it.
    this.swingTurn.setFromAxisAngle(this.swingAxis.set(0, 0, 1).applyQuaternion(this.freeBody ? this.bodyFrame : this.heading), share * this.swing.angle);
    return out.sub(pelvis).applyQuaternion(this.swingTurn).add(pelvis);
  }

  /**
   * Agile: a drawn point of the body above the feet turned as the hips and the trunk are (`hip`, `trunk`): about the
   * body's up and its side axis, through the pelvis (the hips turn on the legs; the trunk pitches from them).
   */
  private turned(out: Vector3): Vector3 {
    if (!this.agile || this.phase !== 'standing' || (this.hip.angle === 0 && this.trunk.angle === 0)) return out;
    const pelvis = this.partPosition(0, this.swingPivot);
    this.swingTurn.setFromAxisAngle(this.trunkAxis, this.trunk.angle);
    out.sub(pelvis).applyQuaternion(this.swingTurn);
    this.swingTurn.setFromAxisAngle(this.hipAxis, this.hip.angle);
    return out.applyQuaternion(this.swingTurn).add(pelvis);
  }

  /** Agile: the torques on the hips (about the body's up) and the trunk (about the body's side axis) the latest substep, N·m; the feet's forces in `limbs` are their reaction on the board. */
  get legTorques(): { hip: number; trunk: number } {
    return { hip: this.hipTorque, trunk: this.trunkTorque };
  }

  /** The upper body's turn against the board as the rig draws it, rad: the twist, and with the agile legs the hips' turn. */
  get drawnTwist(): number {
    return this.agile ? this.twist.angle + this.hip.angle : this.twist.angle;
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
    const phase = this.armPhase(side);
    let z: number;
    let height: number;
    let swing = 0;
    let along = 0;
    const pull = this.pullShare;
    if (phase < pull) {
      const s = phase / pull;
      z = REACH + ((HIP - REACH) * (1 - Math.cos(Math.PI * s))) / 2;
      height = -this.handDepth;
      swing = SWEEP_FAST_WIDE * this.sweepEase * Math.sin(Math.PI * s);
      along = ((HIP - REACH) * Math.PI * Math.sin(Math.PI * s)) / (2 * pull * this.strokeCycle);
    } else {
      // Out of the water at the hip, over it and out, and back in at the reach, rising and settling with no speed at
      // either end, so the drawn hand neither jumps nor jerks (the riding-body plan, step 8).
      const s = (phase - pull) / (1 - pull);
      z = HIP + ((REACH - HIP) * (1 - Math.cos(Math.PI * s))) / 2;
      const arc = (1 - Math.cos(2 * Math.PI * s)) / 2;
      height = -this.handDepth + (this.handDepth + RECOVERY_HEIGHT * (1 - (1 - SWEEP_FAST_LOW) * this.sweepEase)) * arc;
      swing = RECOVERY_SWING * arc;
    }
    out.set((side === 0 ? 1 : -1) * (this.halfWidth(z) + HAND_OUTSIDE_RAIL + swing), deckHeight(this.shape, z) + height, z);
    return along;
  }

  /** Sprint paddling now: asked for (`paddleSprint`), paddling, lying down, not ducking. Its reserve drains (`RideSession`). */
  get sprintPaddling(): boolean {
    return this.attached && this.paddleSprint && this.paddle && this.phase === 'prone' && !this.climbing && this.duck.press <= DUCK_BUSY;
  }

  /** The share of each arm's cycle spent pulling: more as the strokes go over to the player's sprint (SPRINT_PADDLE_PULL). */
  private get pullShare(): number {
    const base = PULL_SHARE + (SPRINT_PADDLE_PULL - PULL_SHARE) * this.paddleSprintShare;
    return base + (SWEEP_FAST_PULL - base) * this.sweepEase;
  }

  /** How deep the pulling hand goes, m: deeper as the strokes go over to the player's sprint. */
  private get handDepth(): number {
    return HAND_DEPTH + (SPRINT_PADDLE_DEPTH - HAND_DEPTH) * this.paddleSprintShare;
  }

  /** How far through its cycle arm `side` (0 left, 1 right, half a cycle on) is, 0–1: pulling below PULL_SHARE. */
  private armPhase(side: number): number {
    return (this.strokePhase + side * 0.5) % 1;
  }

  /**
   * The stroke's clock over a substep: the sprint eased toward the face's fall along the heading (or the pop-up cue),
   * and the arms advanced at the cycle it gives, so a quickening stroke never jumps.
   */
  private advanceStroke(h: number, board: BoardBody, water: SurfWater): void {
    let wanted = this.popUpCue ? 1 : 0;
    const sample = water.sampleAt(board.position.x, board.position.y, board.position.z, this.sample);
    const forward = this.scratch.set(0, 0, 1).applyQuaternion(board.orientation).setY(0);
    if (!sample.outsideDomain && forward.lengthSq() > 1e-6) {
      forward.normalize();
      const fall = -(sample.slopeX * forward.x + sample.slopeZ * forward.z);
      wanted = Math.max(wanted, Math.min(1, Math.max(0, (fall - SPRINT_SLOPE) / (SPRINT_SLOPE_FULL - SPRINT_SLOPE))));
    }
    const tilt = sample.outsideDomain ? 0 : Math.hypot(sample.slopeX, sample.slopeZ);
    this.waterCalm = 1 - Math.min(1, Math.max(0, (tilt - STROKE_ROLL_CALM) / (STROKE_ROLL_ROUGH - STROKE_ROLL_CALM)));
    this.sprint += (wanted - this.sprint) * Math.min(1, h / SPRINT_TIME);
    const caught = ARM_CYCLE + (SPRINT_CYCLE - ARM_CYCLE) * this.sprint;
    this.strokeCycle = caught + (Math.min(caught, SPRINT_PADDLE_CYCLE) - caught) * this.paddleSprintShare;
    this.sweepEase += (this.sweepFast - this.sweepEase) * Math.min(1, h / SWEEP_FAST_EASE);
    if (this.sweepEase < 1e-9) this.sweepEase = 0;
    this.strokeCycle /= 1 + (SWEEP_FAST_CADENCE - 1) * this.sweepEase;
    this.strokePhase = (this.strokePhase + h / this.strokeCycle) % 1;
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
      if (this.upright && !this.freeBody) {
        // Along the deck the push sways the body off its feet; into the deck the legs take it (the new surfer standing:
        // the push is already in the free body's velocity).
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
    this.popUpCue = this.attached && this.phase === 'prone' && !this.climbing && this.cue(board, water);
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
    this.substep = h;
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
    const free = this.freeBody;
    if (this.upright) {
      const off = this.scratch.subVectors(this.position, this.target);
      this.carried.addScaledVector(this.up, off.dot(this.up));
      if (this.banking) this.carried.addScaledVector(this.across, off.dot(this.across));
      // The new surfer: along the board too (the ninth unknown).
      if (free) this.carried.addScaledVector(this.forward, off.dot(this.forward));
    }
    // Drive: keeping the body's bank as the board rolls and pitches under the feet, the knees' flex, and a
    // bounded correction toward the posture.
    this.uprightVelocity(board, this.drive.set(0, 0, 0)).addScaledVector(this.up, this.flexRate);
    // The balance shift moves the centre of mass across the board. A push's sway carries the centre of mass off its feet.
    // The new surfer standing (step 3.2): neither; the body is a free centre of mass, moved only by forces.
    if (!free) {
      const shifted = this.shiftedShare();
      this.drive.add(this.scratch.set((this.balanceRate.x + this.leanRate.x + this.armsGiveRate) * shifted, 0, this.balanceRate.z * shifted).applyQuaternion(this.upright ? this.bodyFrame : board.orientation));
      if (this.upright) this.drive.add(this.scratch.set(this.swayRate.x, 0, this.swayRate.z).applyQuaternion(board.orientation));
    }
    // The posture's own motion (a pop-up) carries the centre of mass with it.
    this.drive.add(this.scratch.copy(this.postureRate).applyQuaternion(this.upright ? this.bodyFrame : board.orientation));
    const error = this.scratch.subVectors(this.target, this.position);
    // Standing, the leg holds the height and the ankles the bank; the correction only brings the body back along the board.
    if (this.upright) error.addScaledVector(this.up, -error.dot(this.up));
    if (this.banking) error.addScaledVector(this.across, -error.dot(this.across));
    // The new surfer: nor along it, where the pitch ankle holds the body.
    if (free) error.addScaledVector(this.forward, -error.dot(this.forward));
    const correction = Math.min(MAX_CORRECTION, (CORRECTION * error.length()) / h);
    if (error.lengthSq() > 0) this.drive.addScaledVector(error.normalize(), correction);
    this.gravity.set(0, -this.mass * WATER.gravity, 0);
    this.waterForces(h, board, water);
    this.compressAssist(board);
    this.legDriveStep(h, board);
    this.external.copy(this.gravity).add(this.waterForce).add(this.assistForce).add(this.carryForce).add(this.leanOutForce);
    if (this.drives) this.external.add(this.driveForce);
    if (this.upright) {
      this.prepareLeg(h, board, water);
      if (free) this.preparePitch(h);
      else if (this.newRider) {
        this.standingBody.idle();
        this.human.reset();
        this.swingLagged = 0;
        this.resetBalance();
      }
      this.twistStep(h);
      if (this.agile) this.legsStep(h, board);
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
    if (this.windowed) this.preparePower(h);
  }

  /**
   * The new surfer standing (`freeBody`), before the solve: the pitch ankle's rest and torque (`StandingBody.prepare`),
   * and the body's speed along its forward axis relative to where it is carried (the ninth unknown's).
   */
  private preparePitch(h: number): void {
    this.legLength = Math.max(0.4, this.leg.height + this.leg.extension);
    // Relative to the board's own motion at the centre of mass: the leg line's pitch rate on the deck.
    const rigid = cross(this.boardSpin, this.carried, this.scratch2).add(this.boardVelocity);
    const relative = this.localScratch.subVectors(this.velocity, rigid).dot(this.forward);
    this.standingBody.speed = relative - this.drive.dot(this.forward);
    // The feet's reach from the stance point to the toe and the heel (the support's ends), and the leg's depth (the hip's range).
    const toe = this.support.zMax - this.base.z;
    const heel = this.base.z - this.support.zMin;
    this.standingBody.prepare(h, this.mass, this.legLength, this.legLoad, this.copTarget.z, relative / this.legLength, this.heading, this.waterUp, this.bodyPush, toe, heel, -this.leg.rest);
  }

  /** Whether the board planes: its speed through the water under it, over PLANING_SPEED and until under PLANING_DROP. */
  private planingStep(board: BoardBody, water: SurfWater): void {
    const under = water.sampleAt(board.position.x, board.position.y, board.position.z, this.sample);
    if (under.wet && !under.outsideDomain && under.normalY > 0) this.waterUp.set(under.normalX, under.normalY, under.normalZ);
    else this.waterUp.set(0, 1, 0);
    const flowX = under.outsideDomain ? 0 : under.flowX;
    const flowZ = under.outsideDomain ? 0 : under.flowZ;
    this.waterFlow.x = flowX;
    this.waterFlow.z = flowZ;
    const speed = Math.hypot(board.velocity.x - flowX, board.velocity.z - flowZ);
    if (this.planing ? speed < PLANING_DROP : speed > PLANING_SPEED) this.planing = !this.planing;
    if (this.planing) this.banked = true;
    else if (Math.abs(this.bank.angle) < UPRIGHT_BANK && Math.abs(this.bank.rate) < UPRIGHT_RATE) this.banked = false;
    // The new surfer standing (step 3.2): the body is free across whatever the board's speed; nothing carries it upright.
    if (this.freeBody) this.banked = true;
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
    // The board's roll about the heading, positive with the +x rail down: from the world's level (the ankle's) and
    // into the water, from its surface under the board (the rail's bite, RAIL_BITE).
    const side = this.scratch.set(1, 0, 0).applyQuaternion(this.heading);
    const boardUp = this.scratch2.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y);
    const rail = roll - Math.atan2(this.waterUp.dot(side), this.waterUp.y);
    this.rollAxis.set(0, 0, -1).applyQuaternion(this.heading);
    const rollRate = this.rollAxis.dot(this.boardSpin);
    // The bank asked for, no more than a turn at the board's speed through the water can hold, eased in.
    const forward = this.localScratch.set(0, 0, 1).applyQuaternion(this.heading);
    const speed = this.boardVelocity.dot(forward) - this.waterFlow.x * forward.x - this.waterFlow.z * forward.z;
    // Snap: the lean a tail-weighted turn can hold (SNAP_RADIUS).
    const radius = this.snapping > 0 ? TURN_RADIUS + this.snapping * (SNAP_RADIUS - TURN_RADIUS) : TURN_RADIUS;
    const most = this.planing ? Math.min(MAX_BANK, Math.atan((speed * speed) / (WATER.gravity * radius))) : 0;
    // `snapPivot: 'lean'`: under Snap the steer asks for as much lean as the tight turn holds (SNAP_RAIL_RANGE).
    // snap-upturn: a Snap turning the board up the face (a bottom turn) asks for the steer's rail, not the top turn's.
    const snapLeans = this.snapLean && this.snapping > 0 && !(this.upturnKept && this.turningUp());
    const railRange = snapLeans ? RAIL_RANGE + this.snapping * (SNAP_RAIL_RANGE - RAIL_RANGE) : RAIL_RANGE;
    const asked = Math.max(-most, Math.min(most, this.steer * railRange + (this.standingHold + HAND_BEND * this.handBend) * HOLD_BANK));
    const toward = (asked - this.bankReference) * (1 - Math.exp(-h / REFERENCE_TIME));
    this.bankReference += Math.max(-REFERENCE_RATE * h, Math.min(REFERENCE_RATE * h, toward));
    if (this.predictive) {
      // The new surfer's balance by prediction (step 3.2e): the lean the player asks (the steer, the hand) is its
      // reference, eased as the bank's. The line held on its own (`holdLine`, a heading loop of the old rider's) is left
      // out: as a reference it rang with the board's yaw and grew (docs/research/new-rider/3.2 Part 5).
      const own = Math.max(-most, Math.min(most, this.steer * railRange + HAND_BEND * this.handBend * HOLD_BANK));
      const towardOwn = (own - this.leanAsked) * (1 - Math.exp(-h / REFERENCE_TIME));
      this.leanAsked += Math.max(-this.leanPace * h, Math.min(this.leanPace * h, towardOwn));
    }
    if (this.freeBody) {
      this.humanBank(h, roll, rail, rollRate);
      return;
    }
    // The rest the balance wants, within what the feet can give; the upper body swings for the rest of it.
    const wanted = BANK_GAIN * (this.bankReference - this.bank.angle) - BANK_RATE_GAIN * this.bank.rate;
    // Past the rail's bite the feet no longer roll the board further onto it.
    const room = ANKLE_REST_RANGE * Math.max(0, 1 - Math.max(0, Math.abs(rail) - RAIL_BITE) / RAIL_EASE);
    const reach = rail > 0 ? Math.max(-room, Math.min(ANKLE_REST_RANGE, wanted)) : Math.max(-ANKLE_REST_RANGE, Math.min(room, wanted));
    const leanSide = Math.sign(this.bankReference);
    this.railAhead = leanSide * rail + Math.max(0, leanSide * rollRate) * PULL_LOOKAHEAD;
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
   * The new surfer standing (step 3.2, `HumanBalance`): the bank's ankle and the hip across as a human's.
   * - The ankle: `bankSpeed` is the body's speed across relative to the board under it (no drive carries it), so the
   *   passive spring and damper (HUMAN_ANKLE_STIFFNESS, HUMAN_ANKLE_DAMPING) act on the ankle's own angle and rate,
   *   implicitly in the solve, at once and with no lag (P4e's Mode A came from the old drive's one-substep lag).
   * - Its rest: the bank law's form, δ = K_ref θ_ref − G θ − G_r θ̇, but on the body's own bank and bank rate as sensed
   *   BALANCE_DELAY ago (the vestibular sense), the lean asked for not delayed (the rider's own), all through MOTOR_LAG;
   *   within the feet's reach and the rail's bite as before. The gains (HUMAN_BANK_*) are the roll model's
   *   (`rollModel.ts`, `humanRollModes`): any feedback on the bank's angle rings through the delay.
   * - The hip across (the swing rotor) takes what the rest asks past HIP_SHARE of the feet's reach, within the
   *   stance's hip range and with the arms' inertia (`HumanBalance.swingInertia`), through the same delay and lag.
   * The old's "lagging" rule (the feet never counter-steer into a lean the body lags; the swing throws it) is kept in
   * form; with no gain on the bank's angle it never acts.
   */
  private humanBank(h: number, roll: number, rail: number, rollRate: number): void {
    if (this.predictive) {
      this.predictiveBank(h, roll, rail, rollRate);
      return;
    }
    const human = this.human;
    const relative = this.bankSpeed / this.legLength;
    human.sense(h, this.bank.angle);
    this.bank.rate = human.bankRate;
    const bank = human.sensedBank();
    const wanted = this.bankForward * this.bankReference - this.bankGain * bank - this.bankRateGain * human.sensedBankRate();
    const room = ANKLE_REST_RANGE * Math.max(0, 1 - Math.max(0, Math.abs(rail) - RAIL_BITE) / RAIL_EASE);
    const reachRest = rail > 0 ? Math.max(-room, Math.min(ANKLE_REST_RANGE, wanted)) : Math.max(-ANKLE_REST_RANGE, Math.min(room, wanted));
    const leanSide = Math.sign(this.bankReference);
    this.railAhead = leanSide * rail + Math.max(0, leanSide * rollRate) * PULL_LOOKAHEAD;
    const asking = Math.abs(this.steer) > STEER_DEADBAND && Math.abs(this.bankReference) > UPRIGHT_BANK ? Math.sign(this.bankReference) : 0;
    const lagging = this.bankGain > 0 && Math.abs(this.bankReference - bank) > ANKLE_REST_RANGE / this.bankGain;
    const projecting = this.extending && this.planing && Math.abs(this.steer) <= STEER_DEADBAND && !this.hand
      && Math.abs(this.bank.angle) > UPRIGHT_BANK;
    const lean = projecting ? 0 : reachRest * asking > 0 && lagging ? 0 : reachRest;
    // The hip across: what the command asks past HIP_SHARE of the feet's reach, within the stance's range.
    const ankleShare = Math.max(-HIP_SHARE * ANKLE_REST_RANGE, Math.min(HIP_SHARE * ANKLE_REST_RANGE, lean));
    this.humanSwingStep(h, -SWING_SERIES * (wanted - ankleShare), stanceRoom(this.stanceDepth).hipRange, human.swingInertia);
    this.ankleRest = human.lagRest(h, lean);
    this.ankleTorque = HUMAN_ANKLE_STIFFNESS * (this.bank.angle - roll - this.ankleRest) + (HUMAN_ANKLE_STIFFNESS * h + HUMAN_ANKLE_DAMPING) * relative;
  }

  /**
   * The new surfer standing free (step 3.2e, the advisor's ruling 29i): balance by prediction (`PredictiveController`,
   * 3.2d's design). On its own clock (CONTROL_STEP of simulated time, whatever the frame or the substeps), the controller
   * takes the senses (the body's own bank and its rate, the head's yaw rate, the twist and its rate, the ankle's own angle
   * and rate; they reach it BALANCE_DELAY late, never the slip), the board's speed through the water and the leg's depth,
   * and the bank and twist asked for, and sends two commands held until its next tick: the ankle's rest and the twist's
   * torque. Its signs are the model's (x forward, y right): every angle and moment here is the other way.
   * - The ankle as 3.2's: the rest within the feet's reach and the rail's bite, through the motor lag; the passive spring
   *   and damper implicit in the solve. The hip across takes what the command asks past HIP_SHARE of the reach.
   * - The twist's torque through the motor lag (`twistBody.active`), within the hips' strength and the feet's grip.
   */
  private predictiveBank(h: number, roll: number, rail: number, rollRate: number): void {
    const human = this.human;
    const relative = this.bankSpeed / this.legLength;
    human.sense(h, this.bank.angle);
    this.bank.rate = human.bankRate;
    const tb = this.twistBody;
    if (this.controlDue <= 1e-9) {
      this.controlDue += CONTROL_STEP;
      const turn = this.up.dot(this.boardSpin);
      const upper = tb.coupled ? tb.upper : turn + tb.rate;
      const sense = this.senseScratch;
      sense[0] = -this.bank.angle;
      // The bank's rate as the canals sense it: the body's own angular rate (its rate on the board and the board's roll rate).
      sense[1] = this.rateSense === 'difference' ? -this.bank.rate : -(relative + rollRate);
      sense[2] = -upper;
      sense[3] = -tb.angle;
      sense[4] = -(upper - turn);
      sense[5] = -(this.bank.angle - roll);
      sense[6] = -relative;
      const forward = this.localScratch.set(0, 0, 1).applyQuaternion(this.heading);
      const speed = this.boardVelocity.dot(forward) - this.waterFlow.x * forward.x - this.waterFlow.z * forward.z;
      const grip = FOOT_FRICTION * Math.max(0, this.legLoad) * TWIST_GRIP_SPAN;
      // The ankle's command is let past the feet's reach (the hip takes the rest); the predictor is fed what the ankle sent.
      // Step 3.2f: the schedule's rail is the rail that holds the lean asked for. The turn's pull at a rail is
      // `railPull` of what that rail's own lean would balance (0.76-0.88 measured), so the rail is a little more than
      // the lean: tan(lean) = pull × tan(rail). Two passes, since the pull itself goes with the rail.
      let rail = Math.abs(this.leanAsked);
      for (let k = 0; k < 2; k += 1) rail = Math.atan(Math.tan(Math.min(MAX_BANK, Math.abs(this.leanAsked))) / railPull(speed, rail));
      rail = Math.min(this.railCap, rail);
      const u = this.predictor.tick(sense, speed, this.yawDepth, -this.leanAsked, -this.twistAsked, { ankle: ANKLE_REST_RANGE, twist: Math.min(TWIST_BODY_TORQUE, grip) }, rail);
      this.schedRail = rail;
      this.heldAnkleRaw = -this.predictor.raw[0];
      this.heldTwist = -u[1];
    }
    this.controlDue -= h;
    const wanted = this.heldAnkleRaw;
    const room = ANKLE_REST_RANGE * Math.max(0, 1 - Math.max(0, Math.abs(rail) - RAIL_BITE) / RAIL_EASE);
    const lean = rail > 0 ? Math.max(-room, Math.min(ANKLE_REST_RANGE, wanted)) : Math.max(-ANKLE_REST_RANGE, Math.min(room, wanted));
    const leanSide = Math.sign(this.bankReference);
    this.railAhead = leanSide * rail + Math.max(0, leanSide * rollRate) * PULL_LOOKAHEAD;
    // The hip across: what the command asks past HIP_SHARE of the feet's reach, within the stance's range.
    const ankleShare = Math.max(-HIP_SHARE * ANKLE_REST_RANGE, Math.min(HIP_SHARE * ANKLE_REST_RANGE, lean));
    this.humanSwingStep(h, -SWING_SERIES * (wanted - ankleShare), stanceRoom(this.stanceDepth).hipRange, human.swingInertia);
    this.ankleRest = human.lagRest(h, lean);
    this.ankleTorque = HUMAN_ANKLE_STIFFNESS * (this.bank.angle - roll - this.ankleRest) + (HUMAN_ANKLE_STIFFNESS * h + HUMAN_ANKLE_DAMPING) * relative;
    tb.active += (this.heldTwist - tb.active) * (1 - Math.exp(-h / MOTOR_LAG));
  }

  /** The new surfer's leg depth below the riding stance, m, as the posture holds it (the yaw inertia's split and the balance's schedule). */
  private get yawDepth(): number {
    return Math.max(0, -this.leg.rest);
  }

  /**
   * The new surfer's leg depth below the riding stance the player holds (the crouch, Compress, Snap or tuck asked), m:
   * the stance room's key (`stanceRoom`). The balance's own knee drop is not counted: it spends the stance's travel.
   */
  private get stanceDepth(): number {
    return Math.max(0, this.heldDepth);
  }

  /**
   * The new surfer's hip across (step 3.2): the swing rotor of `inertia` (the arms in or out), driven by `demand`, N·m
   * (the hip's delayed share), through the motor lag, within ±`range`; pushed only while it can still be braked inside
   * its range (a rotor holds no steady torque), and brought back upright once nothing is asked. As `swingStep`, its
   * reaction turns the body on its feet and the board feels only the push at the feet.
   */
  private humanSwingStep(h: number, demand: number, range: number, inertia: number): void {
    this.swingLagged += (demand - this.swingLagged) * (1 - Math.exp(-h / MOTOR_LAG));
    let burst = Math.max(-SWING_TORQUE, Math.min(SWING_TORQUE, this.swingLagged));
    // The upper body turns the other way to the body (its acceleration is −burst / inertia).
    const outward = -burst * (this.swing.angle !== 0 ? Math.sign(this.swing.angle) : -Math.sign(burst)) > 0;
    const braking = (this.swing.rate * Math.abs(this.swing.rate) * inertia) / (2 * SWING_TORQUE);
    if (outward && Math.abs(this.swing.angle + braking) >= range) burst = 0;
    const back = Math.max(0, 1 - Math.abs(this.swingLagged) / (0.1 * SWING_TORQUE));
    this.swingTorque = burst + inertia * SWING_FREQUENCY * (back * SWING_FREQUENCY * this.swing.angle + 2 * this.swing.rate);
    this.swing.rate -= (h * this.swingTorque) / inertia;
    this.swing.angle += h * this.swing.rate;
    if (Math.abs(this.swing.angle) > range) {
      this.swing.angle = Math.sign(this.swing.angle) * range;
      if (this.swing.rate * this.swing.angle > 0) this.swing.rate = 0;
    }
  }

  /**
   * snap-upturn: the turn asked for takes the board up the face, toward its fall line reversed (the steer's way, or
   * unsteered Snap's latched side). On a face shallower than SNAP_FACE, false.
   */
  private turningUp(): boolean {
    const side = Math.abs(this.steer) > STEER_DEADBAND ? Math.sign(this.steer) : this.snapHeld ? this.snapSide : 0;
    const slope = Math.hypot(this.waterUp.x, this.waterUp.z);
    if (side === 0 || !(slope > SNAP_FACE)) return false;
    const forward = this.scratch.set(0, 0, 1).applyQuaternion(this.heading);
    // Up the face is −waterUp's level part; the board's left (+) turns from +z toward +x, as in snapAim.
    const across = forward.x * -this.waterUp.z - forward.z * -this.waterUp.x;
    return (across < 0 ? 1 : -1) === side;
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
    const snap = this.snapping;
    if (!(snap > 0)) this.snapHeld = false;
    const asked = this.phase === 'standing' && !Number.isNaN(this.rotate) ? Math.max(-1, Math.min(1, this.rotate)) * TWIST_RANGE
      : snap > 0 ? snap * this.snapAim() : 0;
    // The new surfer standing free (step 3.2e): the twist is a body degree of freedom balanced by prediction; what is
    // asked for is its reference (`predictiveBank`), and the old rotor rests.
    if (this.freeBody) {
      this.twistAsked = Math.max(-TWIST_BODY_RANGE, Math.min(TWIST_BODY_RANGE, asked));
      this.twistTorque = 0;
      return;
    }
    const most = Math.min(TWIST_TORQUE, FOOT_FRICTION * this.legLoad * TWIST_GRIP_RADIUS);
    // Snap held, the shoulders turn as fast as the hips and the feet's grip take them (SNAP_TWIST_FREQUENCY).
    const frequency = this.quick && snap > 0 ? TWIST_FREQUENCY + snap * (SNAP_TWIST_FREQUENCY - TWIST_FREQUENCY) : TWIST_FREQUENCY;
    const wanted = TWIST_INERTIA * (frequency * frequency * (asked - this.twist.angle) - 2 * frequency * this.twist.rate);
    this.twistTorque = Math.max(-most, Math.min(most, wanted));
    this.twist.rate += (h * this.twistTorque) / TWIST_INERTIA;
    this.twist.angle += h * this.twist.rate;
    if (Math.abs(this.twist.angle) > TWIST_RANGE) {
      this.twist.angle = Math.sign(this.twist.angle) * TWIST_RANGE;
      if (this.twist.rate * this.twist.angle > 0) this.twist.rate = 0;
    }
  }

  /**
   * Snap's aim, rad: the shoulders wound toward where the turn ends. Taken with Snap (and again when the steer changes
   * side), the turn goes the steer's way (or, unsteered, the way to the face's fall line reversed) and ends on the fall
   * line reversed: straight up the face from below, straight down it from above (the owner's two moves, the video's).
   * The shoulders lead the board by as much as the spine turns (TWIST_RANGE) and unwind as the board comes round under
   * them, the hips taking it round through the feet. On flat water the turn has no end: they lead by the whole range.
   */
  private snapAim(): number {
    const forward = this.scratch.set(0, 0, 1).applyQuaternion(this.heading);
    const steer = Math.abs(this.steer) > STEER_DEADBAND ? Math.sign(this.steer) : 0;
    if (!this.snapHeld || (steer !== 0 && steer !== this.snapSide)) {
      const downhill = this.scratch2.set(this.waterUp.x, 0, this.waterUp.z);
      const slope = downhill.length();
      if (!this.snapHeld) this.snapTarget.set(0, 0, 0);
      if (slope > SNAP_FACE && (!this.snapHeld || this.snapTarget.lengthSq() === 0)) {
        downhill.divideScalar(slope);
        // The fall line the other way to the board's.
        this.snapTarget.copy(downhill).multiplyScalar(forward.dot(downhill) > 0 ? -1 : 1);
      }
      const across = forward.x * this.snapTarget.z - forward.z * this.snapTarget.x;
      this.snapSide = steer !== 0 ? steer : this.snapTarget.lengthSq() > 0 ? (across < 0 ? 1 : -1) : 0;
      this.snapHeld = true;
    }
    if (this.snapTarget.lengthSq() === 0) return this.snapSide * TWIST_RANGE;
    // How far the target lies round the turn's way, 0 to 2π (the board's left, +, turns from +z toward +x).
    const toward = Math.atan2(this.snapTarget.x, this.snapTarget.z) - Math.atan2(forward.x, forward.z);
    const round = ((this.snapSide * toward) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return this.snapSide * Math.min(TWIST_RANGE, round > 1.5 * Math.PI ? 0 : round);
  }

  /**
   * COMPRESS_PULL: compressing into a turn, planing, the body is pulled in across the board's path by the lean asked
   * for; CARVE_CARRY pushes it along the path; LEAN_OUT_PULL pulls a body still leaning the other way toward the new rail.
   */
  private compressAssist(board: BoardBody): void {
    this.assistForce.set(0, 0, 0);
    this.carryForce.set(0, 0, 0);
    this.leanOutForce.set(0, 0, 0);
    // The new surfer (ruling 29, item 3): none of the three; they act on the body with no reaction on the board.
    if (this.newRider) return;
    // Compress keeps its pumping-stance activation; a deeper manual tuck does not disable a pressed turn control.
    const crouch = CROUCH_SHARE * Math.max(0, Math.min(1, this.crouchAsked));
    const compress = Math.max(0, Math.min(1, this.compressAsked));
    if (!this.upright || !this.banking || !this.planing || compress <= crouch || Math.abs(this.steer) <= STEER_DEADBAND) return;
    // The board's path through the water: the carve's and the drag's (on moving water the path over the ground is off it).
    const along = this.scratch.set(board.velocity.x - this.waterFlow.x, 0, board.velocity.z - this.waterFlow.z);
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
      .multiplyScalar(Math.sign(this.bankReference) * fade * compress * this.mass * WATER.gravity
        * Math.min(COMPRESS_PULL * Math.tan(lean), Math.max(0, TURN_PULL_LIMIT - Math.tan(lean))));
    // CARVE_CARRY: along the path, by the pull the body's own bank balances.
    this.carryForce.copy(along).multiplyScalar(compress * CARVE_CARRY * this.mass * WATER.gravity * Math.tan(Math.min(Math.abs(this.bank.angle), MAX_BANK)));
    // LEAN_OUT_PULL: toward the steer's side of the path while the body still leans the other way, until it is upright.
    // With the leg drive the legs make this push (`legDriveStep`), never both.
    const side = Math.sign(this.steer);
    // The new surfer (ruling 29): none, it has no reaction on the board (the "no hidden motors" rule).
    if (!this.legDrive && !this.newRider && -this.bank.angle * side > UPRIGHT_BANK) {
      this.leanOutForce.crossVectors(Y, along)
        .multiplyScalar(side * Math.min(1, Math.abs(this.steer)) * speedFade * compress * LEAN_OUT_PULL * this.mass * WATER.gravity);
    }
  }

  /** The leg drive (LEG_SIDE_STRENGTH's push at a rail change): the legs' push on the body this substep, within their strength, the back foot's grip and their reach. */
  private legDriveStep(h: number, board: BoardBody): void {
    this.driveForce.set(0, 0, 0);
    if (!this.drives) return;
    const side = Math.sign(this.steer);
    const open = this.upright && this.banking && this.planing && Math.abs(this.steer) > STEER_DEADBAND && -this.bank.angle * side > UPRIGHT_BANK;
    if (!open || side !== this.driveSide) {
      this.driveUsed = 0;
      this.driveSide = open ? side : 0;
    }
    if (!open) return;
    const along = this.scratch.set(board.velocity.x - this.waterFlow.x, 0, board.velocity.z - this.waterFlow.z);
    if (along.lengthSq() < 1e-6) return;
    along.normalize();
    const direction = this.driveDirection.crossVectors(Y, along).multiplyScalar(side);
    const stance = this.parts[1] - this.base.y;
    const pelvis = stance + this.scratch2.subVectors(this.position, this.target).dot(this.up);
    const straight = stance + LEG_EXTENSION;
    this.driveReach = Math.sqrt(Math.max(0, straight * straight - pelvis * pelvis));
    const foot = board.toWorld(this.localScratch.set(0, deckHeight(this.shape, this.feet.rear), this.feet.rear), this.driveFoot).sub(board.centerOfMass);
    const slide = cross(board.angularVelocity, foot, this.scratch2).add(board.velocity).sub(this.velocity);
    this.driveUsed = Math.max(0, this.driveUsed - h * slide.dot(direction));
    if (this.driveUsed >= this.driveReach) return;
    const share = Number.isFinite(this.contact.frontShare) ? this.contact.frontShare : 0.5;
    const strength = LEG_SIDE_STRENGTH * this.mass * WATER.gravity * Math.min(1, Math.abs(this.steer));
    const grip = FOOT_FRICTION * this.legLoad * (1 - share);
    this.driveForce.copy(direction).multiplyScalar(Math.min(strength, grip));
  }

  /**
   * The leg drive's state the latest substep: the push on the body, N (world; the board takes the opposite at `foot`,
   * the back foot from the board's centre of mass, world), how far the feet have gone from under the body since the
   * push began and the legs' sideways reach at this pelvis height, m. For the rig: the pelvis `used` off the feet's line.
   */
  get legPush(): { force: Readonly<Vector3>; foot: Readonly<Vector3>; used: number; reach: number } {
    return { force: this.driveForce, foot: this.driveFoot, used: this.driveUsed, reach: this.driveReach };
  }

  private resetTwist(): void {
    this.twist.angle = 0;
    this.twist.rate = 0;
    this.twistTorque = 0;
    this.resetTwistBody();
    this.hip.angle = 0;
    this.hip.rate = 0;
    this.trunk.angle = 0;
    this.trunk.rate = 0;
    this.hipTorque = 0;
    this.trunkTorque = 0;
    this.limbForce.set(0, 0, 0);
    this.limbTorque.set(0, 0, 0);
    this.limbs.length = 0;
  }
  /** The new surfer's twist body (step 3.2e): back square with the board, at rest. */
  private resetTwistBody(): void {
    const tb = this.twistBody;
    tb.angle = 0;
    tb.rate = 0;
    tb.upper = 0;
    tb.active = 0;
    tb.torque = 0;
    tb.coupled = false;
  }

  /** The new surfer's balance by prediction (step 3.2e): nothing sensed, nothing sent, the clock to tick at once. */
  private resetBalance(): void {
    this.predictor.reset();
    this.controlDue = 0;
    this.heldAnkleRaw = 0;
    this.heldTwist = 0;
    this.twistAsked = 0;
    this.leanAsked = 0;
    this.resetTwistBody();
  }


  /** Agile, a launch running (`stampStep`'s clock): 1 while the tail is thrown, 0 in the recovery and otherwise. */
  private get launching(): number {
    if (!this.agile || !(this.stampTime >= 0)) return 0;
    return this.stampTime <= STAMP_TIME * (0.5 + 0.5 * this.stampDepth) ? this.stampDepth : 0;
  }

  /**
   * The agile legs (HIP_INERTIA) before the board's solve: the trunk's pitch and the hips' turn toward where the launch
   * or its recovery asks, each by a torque the legs can give, and the feet's forces on the board that make them (the
   * limbs' ledger). The trunk first: its split sets each foot's load, which bounds the feet's couple.
   */
  private legsStep(h: number, board: BoardBody): void {
    const launch = this.launching;
    const span = this.feet.front - this.feet.rear;
    const load = this.legLoad;
    const share = this.lineShare;
    // The trunk back for the launch: the front leg presses and the back leg lightens, neither past nothing.
    const trunkAsked = -launch * TRUNK_RANGE;
    let wanted = TRUNK_INERTIA * (AGILE_FREQUENCY * AGILE_FREQUENCY * (trunkAsked - this.trunk.angle) - 2 * AGILE_FREQUENCY * this.trunk.rate);
    this.trunkTorque = Math.max(-Math.min(TRUNK_TORQUE, (1 - share) * span * load), Math.min(Math.min(TRUNK_TORQUE, share * span * load), wanted));
    this.trunk.rate += (h * this.trunkTorque) / TRUNK_INERTIA;
    this.trunk.angle += h * this.trunk.rate;
    if (Math.abs(this.trunk.angle) > TRUNK_RANGE) {
      this.trunk.angle = Math.sign(this.trunk.angle) * TRUNK_RANGE;
      if (this.trunk.rate * this.trunk.angle > 0) this.trunk.rate = 0;
    }
    // The feet's loads with the split, and the couple the weaker foot's push across the deck allows.
    const front = load * Math.min(1, Math.max(0, share - this.trunkTorque / Math.max(1e-6, span * load)));
    const strength = LEG_SIDE_STRENGTH * this.mass * WATER.gravity;
    const most = span * Math.min(strength, FOOT_FRICTION * front, FOOT_FRICTION * (load - front));
    // The hips against the turn for the launch (the board comes round under them), square again after.
    const hipAsked = -launch * this.snapSide * HIP_RANGE;
    wanted = HIP_INERTIA * (AGILE_FREQUENCY * AGILE_FREQUENCY * (hipAsked - this.hip.angle) - 2 * AGILE_FREQUENCY * this.hip.rate);
    this.hipTorque = Math.max(-most, Math.min(most, wanted));
    this.hip.rate += (h * this.hipTorque) / HIP_INERTIA;
    this.hip.angle += h * this.hip.rate;
    if (Math.abs(this.hip.angle) > HIP_RANGE) {
      this.hip.angle = Math.sign(this.hip.angle) * HIP_RANGE;
      if (this.hip.rate * this.hip.angle > 0) this.hip.rate = 0;
    }
    // The ledger: each foot's push on the board (the hips' couple across the body, the trunk's along its up),
    // equal and opposite at the two feet, so their sum is no force and their moment is the torques' reaction.
    // The axes: across the body (its up crossed with the board's length), and the body's up square to the board's length.
    const along = this.scratch.set(0, 0, 1).applyQuaternion(board.orientation);
    const side = this.trunkAxis.crossVectors(this.up, along).normalize();
    const up = this.hipAxis.crossVectors(along, side);
    this.limbForce.set(0, 0, 0);
    this.limbTorque.set(0, 0, 0);
    this.limbs.length = 0;
    for (let foot = 0; foot < 2; foot += 1) {
      const sign = foot === 0 ? 1 : -1;
      const entry = this.footEntries[foot];
      entry.point.set(0, 0, foot === 0 ? this.feet.front : this.feet.rear);
      // About the up: the front foot pushes the board across, −torque / span; about the side axis: it presses down, torque / span.
      entry.force.copy(side).multiplyScalar((-sign * this.hipTorque) / span).addScaledVector(up, (sign * this.trunkTorque) / span);
      this.limbs.push(entry);
      this.limbForce.add(entry.force);
    }
    this.limbTorque.copy(up).multiplyScalar(-this.hipTorque).addScaledVector(side, -this.trunkTorque);
  }

  /**
   * The carve's flex asked of the legs, of CROUCH_DEPTH (CARVE_FLEX): the load along the leg over the rider's weight, of
   * what a full stick's lean carries, and no more than the stick's share.
   */
  private carveFlex(): number {
    const stick = Math.abs(this.steer) > STEER_DEADBAND ? Math.abs(this.steer) : 0;
    const depth = CARVE_FLEX * CROUCH_DEPTH;
    // The stick let go mid-turn: the legs sink no further, and stand up as the board rolls back flat under them.
    if (stick === 0) {
      if (!this.fromFlex) return 0;
      return CARVE_FLEX * Math.max(0, Math.min(1, -this.leg.rest / depth, Math.abs(this.bank.angle) / RAIL_RANGE));
    }
    const over = this.legLoad / (this.mass * WATER.gravity) - 1;
    return CARVE_FLEX * Math.max(0, Math.min(1, stick, over / (1 / Math.cos(RAIL_RANGE) - 1)));
  }

  /**
   * Snap's load on the legs now, of CROUCH_DEPTH, with `snapLegs: 'drive'` (SNAP_DRIVE_DEPTH): Snap's own depth until
   * the board turns the stick's way, then let out toward the drive's depth by how far the board has come round from
   * the furthest it went the other way (of SNAP_DRIVE_TURN, never back), as far as the stick is pushed.
   */
  private snapLoad(snap: number): number {
    if (!(snap > 0)) {
      this.snapDriveSide = 0;
      this.snapDriven = 0;
      return this.snapDepth;
    }
    const forward = this.scratch.set(0, 0, 1).applyQuaternion(this.heading);
    const yaw = Math.atan2(forward.x, forward.z);
    const stick = Math.abs(this.steer) > STEER_DEADBAND ? Math.min(1, Math.abs(this.steer)) : 0;
    const side = stick > 0 ? Math.sign(this.steer) : this.snapDriveSide;
    if (side !== this.snapDriveSide) {
      // Snap taken with the stick, or the stick thrown the other way under it: a new turn, loaded again.
      this.snapDriveSide = side;
      this.snapDriveTurn = 0;
      this.snapDriveLow = 0;
      this.snapDriven = 0;
    } else if (side !== 0) {
      // The board's left (+) turns from +z toward +x, as in `snapAim`.
      const by = yaw - this.snapDriveYaw;
      this.snapDriveTurn += side * Math.atan2(Math.sin(by), Math.cos(by));
      this.snapDriveLow = Math.min(this.snapDriveLow, this.snapDriveTurn);
      this.snapDriven = Math.max(this.snapDriven, Math.min(1, (this.snapDriveTurn - this.snapDriveLow) / SNAP_DRIVE_TURN));
    }
    this.snapDriveYaw = yaw;
    const drive = Math.min(this.snapDepth, SNAP_DRIVE_DEPTH);
    return this.snapDepth - stick * this.snapDriven * (this.snapDepth - drive);
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
      // The new surfer: as a board sliding on its face feels it, along the face's normal (the pitch's reference).
      if (floating && this.freeBody) this.specificForce.copy(this.waterUp).multiplyScalar(WATER.gravity * this.waterUp.y);
      if (this.newRider) this.bodyPush.copy(this.specificForce).multiplyScalar(this.mass);
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
    const crouchAsked = this.crouchAsked;
    const crouch = this.covered ? manualCrouchShare(crouchAsked, this.compressAsked) : CROUCH_SHARE * Math.max(0, Math.min(1, crouchAsked));
    const compress = Math.max(0, Math.min(1, this.compressAsked));
    const snap = this.snapping;
    // Snap's driving legs (`snapLegs: 'drive'`): its load let out as the board comes round (SNAP_DRIVE_DEPTH).
    const snapLoad = this.snapDrives ? this.snapLoad(snap) : this.snapDepth;
    const held = snap > 0 ? Math.max(crouch, compress, snap * snapLoad) : Math.max(crouch, compress);
    // The carve's flex (CARVE_FLEX): steering, the legs yield to the turn's load, as far as the stick asks at most.
    const flex = this.carveFlexes ? this.carveFlex() : 0;
    const flexing = flex > held;
    if (flexing) this.fromFlex = true;
    else if (held > 0) this.fromFlex = false;
    let asked = -(flexing ? flex : held) * CROUCH_DEPTH;
    // The new surfer standing (step 3.2): the stance held keys the balance's room; the balance's own knee drop
    // (`HumanBalance.strategies`) lowers the leg's rest within that stance's travel, at the crouch's pace.
    if (this.freeBody) {
      this.heldDepth = -asked;
      const room = stanceRoom(this.heldDepth);
      // The hip near its range: across (the swing) or in pitch (`StandingBody`'s hip), whichever is nearer.
      this.human.strategies(h, Math.max(Math.abs(this.swing.angle), Math.abs(this.standingBody.hip.angle)), room);
      asked = Math.min(asked, -(this.heldDepth + this.human.knees * room.kneeTravel));
    }
    // The projection rises tall (EXTENSION_TALL): Compress let go while planing, it rises to the riding stance as
    // before, then on over it, and settles back once there. The pumping crouch let go stands no taller than before.
    if (compress > 0 || snap > 0) this.fromCompress = true;
    else if (asked < 0) this.fromCompress = false;
    if (asked < 0 || !this.fromCompress || this.phase !== 'standing' || !this.planing) {
      this.tall = 0;
      this.tallReached = false;
      this.tallFrom = false;
    } else if (this.leg.rest < -TALL_FROM) {
      this.tall = 1;
      this.tallReached = false;
      this.tallFrom = false;
    }
    if (this.tall > 0 && this.leg.rest >= -TALL_START) this.tallFrom = true;
    if (this.tallFrom && !this.tallReached && this.leg.rest >= 0.9 * EXTENSION_TALL * this.tall) this.tallReached = true;
    if (this.tallReached) this.tall = Math.max(0, this.tall - h / EXTENSION_SETTLE);
    const rest = asked + (this.tallFrom ? EXTENSION_TALL * this.tall : 0);
    const down = rest < this.leg.rest;
    // Snap loads as Compress does: down at least as fast as the load, the legs only pushing.
    // The flex yields to the load as Compress does.
    const compressing = compress > CROUCH_SHARE * Math.max(0, Math.min(1, crouchAsked)) || snap * this.snapDepth > crouch || flexing;
    const accelerationLimit = !down ? EXTEND_ACCELERATION
      : compressing ? Math.max(CROUCH_ACCELERATION, this.legLoad / this.mass - COMPRESS_KEEP * WATER.gravity) : CROUCH_ACCELERATION;
    // Letting Compress go, the legs rise no faster than the stance's spring can catch the body (`projectionCatch`).
    const caught = (this.catches && !down && this.fromCompress) || (!down && this.fromFlex) ? projectionCatch(this.mass, this.legStiffness) : Infinity;
    const speedLimit = down ? CROUCH_SPEED : Math.min(MAX_LEG_SPEED, caught);
    // While the feet brake the body's bank near their edges, the crouch's legs hold rather than drop (CROUCH_HOLD).
    const hold = this.banking && !compressing
      ? Math.max(0, Math.min(1, (Math.abs(this.ankleRest) / ANKLE_REST_RANGE - CROUCH_HOLD) / (1 - CROUCH_HOLD))) : 0;
    const acceleration = Math.max(-accelerationLimit * (1 - hold), Math.min(accelerationLimit,
      LEG_FREQUENCY * LEG_FREQUENCY * (rest - this.leg.rest) - 2 * LEG_FREQUENCY * this.restRate));
    this.restRate = Math.max(-speedLimit * (1 - hold), Math.min(speedLimit, this.restRate + acceleration * h));
    // Compress keeps its old stop; a deeper manual target opens more travel. A released tuck
    // retains its current travel limit while extending, so release cannot snap the body up.
    const deepest = Math.max(-this.leg.rest, CROUCH_DEPTH, -rest);
    // Up to the riding stance, or over it as far as the projection's aim (EXTENSION_TALL); settling, down from where it is.
    const tallest = Math.max(0, rest, this.leg.rest);
    this.leg.rest = Math.max(-deepest, Math.min(tallest, this.leg.rest + this.restRate * h));
    // Feet on a deck only push: compressing, the legs fold no faster than the body falls onto them, so a board
    // dropping or rolling away from under the rider unloads the feet rather than being pulled up by them.
    const slack = this.leg.extension - this.legLoad / this.legStiffness;
    // The new surfer's balance lowers the knees too (`human.knees`, the capture point off the feet or the hip near its
    // range), and the rule is the same for that drop: a foot on a deck has nothing to pull against, so the leg cannot
    // drag the body down onto a board that is falling away from under it. Without this the balance's knee drop in a
    // chop's trough left the rest 0.18 m under the body and the spring pulled it down with 3.6 kN — 5 body weights,
    // on a rider the water was carrying nothing of — and the body went 0.26 m off its posture and was separated by
    // RECOVERABLE_ERROR. (Step 3.2h; the trace is `3.2/README.md` Part 8 §3.)
    if ((compressing || (this.freeBody && this.human.knees > 0)) && this.leg.rest < slack) {
      this.leg.rest = Math.min(0, slack);
      this.restRate = Math.max(this.restRate, this.leg.rate);
    }
    if ((this.leg.rest === tallest && this.restRate > 0) || this.leg.rest === -deepest) this.restRate = 0;
    this.extending = this.restRate > 0 && this.leg.rest < rest;
    // The deeper tuck keeps the current bent-leg stiffness rather than softening below it; standing tall, the riding stance's.
    // The new surfer: the softer knees (KNEE_STIFFNESS), their strength capped in `project` (`kneeStrength`).
    this.legStiffness = this.freeBody ? KNEE_STIFFNESS
      : LEG_STIFFNESS * (1 - (CROUCH_SOFTENING * Math.min(CROUCH_DEPTH, Math.max(0, -this.leg.rest))) / CROUCH_DEPTH);
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
      // Climbing on, a part beside the board (past its rail) is in the water, not over the deck (swim-back: its
      // buoyancy cut there put the swimmer's weight on the near rail and rolled the board over).
      const onDeck = !this.upright && Math.abs(z) < this.shape.length / 2 && (!this.climbing || Math.abs(this.parts[i * 3]) <= this.halfWidth(z));
      const deckY = onDeck ? board.toWorld(this.localScratch.set(this.parts[i * 3], deckHeight(this.shape, z), z), this.scratch2).y : -Infinity;
      const inWake = !this.upright && z < -this.shape.length / 2;
      this.hollowBoard = undefined;
      if (this.upright && board.hollowOpen) this.overHollow(board);
      this.applyWater(i, water, radius, this.partVolumes[i], Math.PI * radius * radius * PART_DRAG, h, inWake ? shelter * WAKE_SHELTER : shelter, deckY);
      this.hollowBoard = undefined;
    }
    this.stroking = false;
    this.handLoad[0] = 0;
    this.handLoad[1] = 0;
    this.handYaw = 0;
    if (this.upright && this.handSide !== 0) this.standingHand(h, board, water);
    // The player's sprint comes in over SPRINT_PADDLE_TIME while paddling lying down, and goes as it stops.
    this.paddleSprintShare += ((this.sprintPaddling ? 1 : 0) - this.paddleSprintShare) * Math.min(1, h / SPRINT_PADDLE_TIME);
    if (this.phase !== 'prone' || this.climbing || (!this.paddle && !this.sweeping)) {
      this.line = undefined;
      this.hold = 0;
      return;
    }
    this.keepLine(h, board);
    this.advanceStroke(h, board, water);
    for (let side = 0; side < 2; side += 1) {
      const effort = this.strokeEffort(side);
      if (!(effort > 0)) continue;
      if (this.armPhase(side) >= this.pullShare) continue;
      // Pull: the hand sweeps from reach to hip beside the rail, fastest mid-stroke.
      const along = this.handLocal(side, this.localScratch);
      board.toWorld(this.localScratch, this.partWorld);
      board.velocityAt(this.partWorld, this.partVelocity).add(this.scratch.set(0, 0, along).applyQuaternion(board.orientation));
      // Sprinting, the arm deeper in the catch pushes broadside along the stroke (SPRINT_PADDLE_AREA).
      this.bladeArea = HAND_DRAG_AREA * (this.sprintArea - 1) * this.paddleSprintShare * effort;
      this.pulling = this.feathers;
      this.applyWater(RIDER_PARTS.length + side, water, HAND_RADIUS, 0, HAND_DRAG_AREA * effort, h, 1);
      this.pulling = false;
      this.bladeArea = 0;
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
    // The new surfer standing (step 3.2, ruling 29 item 4): the hand also leans on the water it skims (HAND_LIFT).
    this.supporting = this.freeBody;
    this.handSupport.set(0, 0, 0);
    this.applyWater(RIDER_PARTS.length + (this.handSide > 0 ? 0 : 1), water, HAND_RADIUS, 0, STANDING_HAND_DRAG, h, 1);
    this.supporting = false;
    this.handYaw = this.waterMoment.y - moment;
  }

  /** The hand in the face bends the body toward it; the hand reaching in a turn follows the lean and bends none. */
  private get handBend(): number {
    return this.hand ? this.handSide : 0;
  }

  /** The side paddle's fast share, 0–1: steering without paddling, from SWEEP_FAST_FROM of the stick to full. */
  private get sweepFast(): number {
    if (this.paddle) return 0;
    return Math.min(1, Math.max(0, (Math.abs(this.steer) - SWEEP_FAST_FROM) / (1 - SWEEP_FAST_FROM)));
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
  private keepLine(h: number, board: BoardBody): void {
    const forward = this.scratch.set(0, 0, 1).applyQuaternion(board.orientation);
    const heading = Math.atan2(forward.x, forward.z);
    if (this.line === undefined || this.sweeping || !this.paddle) {
      this.line = heading;
      this.hold = 0;
      this.lineError = 0;
      this.lineRate = board.angularVelocity.y;
      return;
    }
    let error = heading - this.line;
    error -= 2 * Math.PI * Math.round(error / (2 * Math.PI));
    // Over the strokes under way; at once from rest.
    const smoothing = HOLD_SMOOTHING * Math.min(1, board.velocity.length() / HOLD_SMOOTHING_SPEED);
    const ease = smoothing > h ? h / smoothing : 1;
    this.lineError += (error - this.lineError) * ease;
    this.lineRate += (board.angularVelocity.y - this.lineRate) * ease;
    this.hold = Math.max(-1, Math.min(1, -(this.lineError + HOLD_RATE_TIME * this.lineRate) / HOLD_ANGLE));
  }

  /**
   * The hollow over a banked planing deck (deck-hollow, 2026-11-10; `HOLLOW`'s note; only on a board with
   * `deckHollow: 'on'`): whether the standing rider's part at `partWorld` is over the deck, inside its planform (a part
   * outboard of the rail is in the water), and if so the deck plane's height straight under it, for `applyWater`.
   */
  private overHollow(board: BoardBody): void {
    const p = this.partWorld;
    const local = board.toLocal(p, this.localScratch);
    if (Math.abs(local.z) >= this.shape.length / 2 || Math.abs(local.x) > this.halfWidth(local.z)) return;
    this.hollowZ = local.z;
    const up = this.scratch.set(0, 1, 0).applyQuaternion(board.orientation);
    const deck = board.toWorld(local.setY(deckHeight(this.shape, local.z)), this.scratch2);
    this.hollowY = deck.y - ((p.x - deck.x) * up.x + (p.z - deck.z) * up.z) / up.y;
    this.hollowBoard = board;
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
    let wet = submergedFraction(sample.surfaceY - p.y, radius) - (Number.isFinite(bottom) ? submergedFraction(bottom - p.y, radius) : 0);
    // Over a planing board's open hollow the part is dry from the surface line down to the deck plane, by the hollow's
    // open share: no water there to float it or drag it (`overHollow`).
    if (this.hollowBoard && wet > 0 && sample.surfaceY > this.hollowY) {
      const share = this.hollowBoard.hollowWetAt(this.hollowZ, sample.surfaceY - this.hollowY, sample);
      if (share < 1) wet = share * wet + (1 - share) * submergedFraction(this.hollowY - p.y, radius);
    }
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
    // A pulling hand the board outruns slices in edge-on (`FEATHER_DRAG`): the water meets it from in front.
    const outrun = this.pulling && slot >= RIDER_PARTS.length && relative.dot(this.bodyAxis) < 0;
    const drag = 0.5 * mixture * dragArea * wet * relative.length() * (outrun ? FEATHER_DRAG : 1);
    // Inside a roller lens (the Canyon roller lens, S3; the advisor's ruling of 2026-10-06, provisional): the shelter
    // models streamlined ambient flow along a paddling body, but a roller overruns a prone rider from behind and strikes
    // its feet, legs and tail as bluff bodies. Where the lens's own flow is (its share, S(ζ)·g), none of it is sheltered;
    // everywhere else, as before.
    const lens = sample.lensShare;
    const along = lens !== undefined && lens > 0 ? shelter + (1 - shelter) * lens : shelter;
    force.addScaledVector(relative, drag).addScaledVector(this.bodyAxis, -drag * (1 - along) * relative.dot(this.bodyAxis));
    if (this.bladeArea > 0 && slot >= RIDER_PARTS.length && !outrun) {
      // A plate's drag acts along its normal: the arm broadside to the stroke pushes only along the board.
      const normal = relative.dot(this.bodyAxis);
      force.addScaledVector(this.bodyAxis, 0.5 * mixture * this.bladeArea * wet * normal * Math.abs(normal));
    }
    if (this.supporting && slot >= RIDER_PARTS.length) {
      // The flat hand skimming the face leans on it: a plate's lift, ½ ρ C_L A v², out of the water along its surface's
      // normal, capped with the drag at HAND_FORCE_LIMIT below.
      const lift = 0.5 * mixture * HAND_LIFT * HAND_AREA * wet * relative.lengthSq();
      this.handSupport.set(sample.normalX, sample.normalY, sample.normalZ).multiplyScalar(lift);
      force.add(this.handSupport);
    }
    if (slot >= RIDER_PARTS.length) {
      const prone = this.phase === 'prone' ? this.paddleSprintShare : 0;
      const limit = (HAND_FORCE_LIMIT + (SPRINT_PADDLE_LIMIT - HAND_FORCE_LIMIT) * prone) * this.mass * WATER.gravity;
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
   * The new surfer standing free: the rider's own yaw inertia turns with the board through the planted feet (step 3.2b,
   * the advisor's ruling 29f), now split (step 3.2e, ruling 29i). The point mass carries the body's translation; about its
   * long axis (`up`, the leg line):
   * - the board's share (`stanceAt`'s `lower`: the feet, shanks and knees) is held rigid to the board's turn while the feet
   *   are on the deck: I_L n nᵀ on the rotation and its own spin's momentum on the right-hand side, as 3.2b's whole was;
   * - the upper body's share (`upper`, and TWIST_BODY_ARMS with the arms out) turns on the legs' twist θ_t (the upper body's
   *   yaw less the board's), which puts τ_b = τ_a + k θ_t + c θ̇_t on the board and −τ_b on the upper body (TWIST_STIFFNESS,
   *   TWIST_DAMPING, the active torque τ_a; an end stop past TWIST_BODY_RANGE). Backward Euler over the substep, the upper
   *   body's spin eliminated: with α = h (k h + c), the board meets β n nᵀ, β = I_U α / (I_U + α), and on the right-hand
   *   side n [β (ω_u − Ω) + I_U / (I_U + α) h (τ_a + k θ_t)], Ω its own turn now. `finish` moves the twist on.
   * So the standing solve and the solves apart all carry it; no force but the legs' with its reaction. In flight the
   * lower body keeps its spin and the twist its angle and rate; back on the deck the coupling starts from the board's own
   * turn (no impulse).
   */
  coupleYaw(system: Float64Array, rhs: Float64Array, board: BoardBody): void {
    const active = this.freeBody && this.inContact && this.yawScale > 0;
    const tb = this.twistBody;
    if (!active) {
      this.yawCoupled = false;
      this.yawInertia = 0;
      tb.coupled = false;
      return;
    }
    const n = this.up;
    const w = board.angularVelocity;
    const turn = n.x * w.x + n.y * w.y + n.z * w.z;
    if (!this.yawCoupled) this.yawSpin = turn;
    const stance = stanceAt(this.yawDepth);
    const lower = this.yawScale * stance.lower;
    const upper = this.yawScale * (stance.upper + TWIST_BODY_ARMS * Math.max(0, Math.min(1, this.human.arms)));
    if (!tb.coupled) tb.upper = turn + tb.rate;
    const h = this.substep;
    const over = Math.abs(tb.angle) - TWIST_BODY_RANGE;
    const stiffness = this.twistStiffness + (over > 0 ? TWIST_STOP : 0);
    const damping = this.twistDamping + (over > 0 ? TWIST_STOP_DAMPING : 0);
    const alpha = h * (stiffness * h + damping);
    const beta = (upper * alpha) / (upper + alpha);
    const gain = upper / (upper + alpha);
    tb.inertia = upper;
    tb.alpha = alpha;
    tb.beta = beta;
    tb.gain = gain;
    tb.turn = turn;
    tb.spring = tb.active + this.twistStiffness * tb.angle + (over > 0 ? TWIST_STOP * Math.sign(tb.angle) * over : 0);
    const inertia = lower + beta;
    this.yawInertia = inertia;
    const kick = lower * (this.yawSpin - turn) + beta * (tb.upper - turn) + gain * h * tb.spring;
    const nv = [n.x, n.y, n.z];
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) system[(3 + i) * 6 + 3 + j] += inertia * nv[i] * nv[j];
      rhs[3 + i] += kick * nv[i];
    }
    this.yawCoupled = true;
    tb.coupled = true;
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
    // The new surfer standing: a 9 x 9 system, the ninth unknown the body's speed along its forward axis (`StandingBody`).
    const free = this.freeBody;
    const N = free ? 9 : 8;
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
    // The new surfer standing: its own ankle across (`humanBank`).
    const ankleK = free ? HUMAN_ANKLE_STIFFNESS : ANKLE_STIFFNESS;
    const ankleC = free ? HUMAN_ANKLE_DAMPING : ANKLE_DAMPING;
    system[7 * N + 7] += this.banking ? m + (h * (ankleK * h + ankleC)) / (length * length) : 1;
    // The momentum the constraint must supply: v_rider' = v' + w' x carried + drive + up s'' + across u'.
    const mismatch = cross(this.boardSpin, b, this.scratch).add(this.boardVelocity).add(this.drive)
      .addScaledVector(n, this.leg.rate).addScaledVector(t, this.bankSpeed);
    if (free) mismatch.addScaledVector(this.forward, this.standingBody.speed);
    mismatch.sub(this.velocity);
    const f = this.scratch2.copy(this.external).multiplyScalar(h).addScaledVector(mismatch, -m);
    if (free) this.standingBody.couple(system, rhs, N, h, m, this.forward, a, b, f, this.legLength, this.across);
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
    this.driveStep = h;
    if (this.drives) this.pushDrive(rhs);
    // The upper body's swing turns the body on its feet; the board feels only the push at the feet, not its couple.
    rhs[3] -= h * this.swingTorque * this.rollAxis.x;
    rhs[4] -= h * this.swingTorque * this.rollAxis.y;
    rhs[5] -= h * this.swingTorque * this.rollAxis.z;
    // The twist's hips turn the board the other way through the feet.
    rhs[3] -= h * this.twistTorque * n.x;
    rhs[4] -= h * this.twistTorque * n.y;
    rhs[5] -= h * this.twistTorque * n.z;
    if (this.agile) {
      // The limbs' ledger: the feet's forces on the board (and so on the two together, nothing: the body takes the
      // opposite). Rows 0–2 and 3–5 are the pair's momentum, so only the body's own rows and its arm's share see a net force.
      const force = this.limbForce;
      const lever = cross(a, force, this.scratch);
      rhs[3] += h * (this.limbTorque.x - lever.x);
      rhs[4] += h * (this.limbTorque.y - lever.y);
      rhs[5] += h * (this.limbTorque.z - lever.z);
      rhs[6] -= h * n.dot(force);
      if (this.banking) rhs[7] -= h * t.dot(force);
      if (free) rhs[8] -= h * this.forward.dot(force);
    }
  }

  /** Standing, after the 8 x 8 solve: the contact impulse the motion needs, and whether feet on a deck can give it (as `settle`). */
  settleStanding(x: Float64Array, h: number, board: BoardBody): boolean {
    const spin = this.scratch.set(this.boardSpin.x + x[3], this.boardSpin.y + x[4], this.boardSpin.z + x[5]);
    this.legRateAfter = this.leg.rate + x[6];
    this.bankSpeedAfter = this.bankSpeed + x[7];
    const velocity = cross(spin, this.carried, this.scratch2).add(this.boardVelocity).add(this.drive)
      .addScaledVector(this.up, this.legRateAfter).addScaledVector(this.across, this.bankSpeedAfter);
    if (this.freeBody) {
      this.standingBody.speedAfter = this.standingBody.speed + x[8];
      velocity.addScaledVector(this.forward, this.standingBody.speedAfter);
    }
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
    if (this.drives && this.upright) this.pushDrive(rhs);
  }

  /** The leg drive's reaction on the board alone, as `pushBoard` adds it (`legPower: 'cap'`: the board under no push from the feet). */
  pushDrives(rhs: Float64Array): void {
    if (this.drives && this.upright) this.pushDrive(rhs);
  }

  /** `legPower: 'cap'`: an empty power window (a new mount). */
  private resetPower(): void {
    this.powerBudget = Infinity;
    this.powerClock = 0;
    this.powerHead = 0;
    this.powerCount = 0;
    this.powerSum = 0;
  }

  /**
   * `legPower: 'cap'`, before the solve: the net work the contact may still do over the substep of `h`, the least of
   * LEG_POWER_PEAK over it and LEG_POWER_HELD over the LEG_POWER_WINDOW it closes (the works of the substeps still in
   * it counted whole, absorbing ones too); standing only.
   */
  private preparePower(h: number): void {
    const end = this.powerClock + h;
    const capacity = this.powerEnds.length;
    while (this.powerCount > 0 && this.powerEnds[this.powerHead] <= end - LEG_POWER_WINDOW) {
      this.powerSum -= this.powerWorks[this.powerHead];
      this.powerHead = (this.powerHead + 1) % capacity;
      this.powerCount -= 1;
    }
    if (this.powerCount === 0) this.powerSum = 0;
    this.powerBudget = this.upright
      ? Math.max(0, Math.min(LEG_POWER_PEAK * this.mass * h, LEG_POWER_HELD * this.mass * LEG_POWER_WINDOW - this.powerSum)) : Infinity;
  }

  /** `legPower: 'cap'`, after the substep of `h`: its net contact work, J, into the power window (nothing while not standing). */
  private recordPower(h: number, work: number): void {
    this.powerClock += h;
    let capacity = this.powerEnds.length;
    if (this.powerCount === capacity) {
      const ends = new Float64Array(capacity * 2);
      const works = new Float64Array(capacity * 2);
      for (let i = 0; i < capacity; i += 1) {
        ends[i] = this.powerEnds[(this.powerHead + i) % capacity];
        works[i] = this.powerWorks[(this.powerHead + i) % capacity];
      }
      this.powerEnds = ends;
      this.powerWorks = works;
      this.powerHead = 0;
      capacity *= 2;
    }
    const at = (this.powerHead + this.powerCount) % capacity;
    this.powerEnds[at] = this.powerClock;
    this.powerWorks[at] = this.upright ? work : 0;
    this.powerSum += this.powerWorks[at];
    this.powerCount += 1;
  }

  /**
   * `legPower: 'cap'`, standing, after the coupled solve met the contact (`settleStanding`, `x` its solution): whether
   * the contact's net work in it, on the body and the board together (the push along the line of force, and the swing's,
   * the twist's and the agile legs' couples, as `finish` books them), is more than the legs may do this substep. If so,
   * the two are solved apart (`pushCapped`) from the impulse the solve asked for.
   */
  overPower(x: Float64Array, h: number): boolean {
    if (!this.upright) return false;
    const m = this.mass;
    const a = this.arm;
    const j = this.impulse;
    const ws = this.boardSpin;
    // The body's mean velocity over the substep less the board's at the line of force.
    const change = cross(this.powerScratch.set(x[3], x[4], x[5]), a, this.powerScratch);
    const board = cross(ws, a, this.powerScratch2).add(this.boardVelocity);
    let work = j.x * (this.velocity.x + (j.x + this.external.x * h) / (2 * m) - board.x - (x[0] + change.x) / 2)
      + j.y * (this.velocity.y + (j.y + this.external.y * h) / (2 * m) - board.y - (x[1] + change.y) / 2)
      + j.z * (this.velocity.z + (j.z + this.external.z * h) / (2 * m) - board.z - (x[2] + change.z) / 2);
    // The couples' work on the board at its mean spin, as `finish` books them.
    const sx = ws.x + x[3] / 2;
    const sy = ws.y + x[4] / 2;
    const sz = ws.z + x[5] / 2;
    if (this.swingTorque !== 0) work -= h * this.swingTorque * (this.rollAxis.x * sx + this.rollAxis.y * sy + this.rollAxis.z * sz);
    if (this.twistTorque !== 0) work -= h * this.twistTorque * (this.up.x * sx + this.up.y * sy + this.up.z * sz);
    // The new surfer's twist (step 3.2e): the legs' twist impulse on the board this substep, against the twist's rate.
    const tb = this.twistBody;
    if (tb.coupled && tb.inertia > 0) {
      const impulse = tb.beta * (tb.upper - tb.turn - (this.up.x * x[3] + this.up.y * x[4] + this.up.z * x[5])) + tb.gain * h * tb.spring;
      work += impulse * (this.up.x * sx + this.up.y * sy + this.up.z * sz - (tb.upper - impulse / (2 * tb.inertia)));
    }
    // The new surfer's hip in pitch: its couple on the pair, about the pitch axis.
    const hip = this.freeBody ? this.standingBody.hip.torque : 0;
    if (hip !== 0) work -= h * hip * (this.across.x * sx + this.across.y * sy + this.across.z * sz);
    if (this.agile && (this.hipTorque !== 0 || this.trunkTorque !== 0)) work += h * (this.limbTorque.x * sx + this.limbTorque.y * sy + this.limbTorque.z * sz);
    if (!(work > this.powerBudget)) return false;
    this.feasible = false;
    this.projected.copy(this.impulse);
    return true;
  }

  /**
   * `legPower: 'cap'`, the two solved apart: the body's velocity at its mean over the substep with no push from the
   * feet, less the board's at the line of force with its velocity change `x` (6), into `out`. The contact's net work
   * with the projected impulse j scaled by s is then W(s) = a s + b s², a = j·rel(base), b = j·j / 2m + j·rel(full) − a.
   */
  private apartRelative(x: Float64Array, h: number, out: Vector3): Vector3 {
    const m = this.mass;
    const change = cross(this.powerScratch.set(x[3], x[4], x[5]), this.arm, this.powerScratch);
    const board = cross(this.boardSpin, this.arm, out).add(this.boardVelocity);
    return out.set(
      this.velocity.x + (this.external.x * h) / (2 * m) - board.x - (x[0] + change.x) / 2,
      this.velocity.y + (this.external.y * h) / (2 * m) - board.y - (x[1] + change.y) / 2,
      this.velocity.z + (this.external.z * h) / (2 * m) - board.z - (x[2] + change.z) / 2,
    );
  }

  /** `legPower: 'cap'`, standing, the share of the projected push the leg's own force gives along the leg (its load, spring and damper, `prepareLeg`; feet only push). */
  private legShare(h: number): number {
    // The new surfer: the push is the legs' and ankles' own forces already (rule 1 is automatic), only its power capped.
    if (this.freeBody) return 1;
    const along = this.projected.dot(this.up);
    const most = h * Math.max(0, this.leg.force);
    return along > most ? most / along : 1;
  }

  /**
   * `legPower: 'cap'`, the two solved apart, `full` the board's velocity change under the whole projected push: whether
   * it stands as it is, making no energy (W(1) ≤ 0), or within both the leg's force and the legs' power.
   */
  pushKept(full: Float64Array, h: number): boolean {
    if (!this.upright) return true;
    const j = this.projected;
    const work = j.dot(this.apartRelative(full, h, this.powerScratch2)) + j.lengthSq() / (2 * this.mass);
    return !(work > 0) || (this.legShare(h) >= 1 && !(work > this.powerBudget));
  }

  /**
   * `legPower: 'cap'`, standing, the two solved apart (ruling 27's A-lite), from the board's velocity change with none
   * of the projected push (`base`) and with all of it (`full`; the solve is linear in the push). Rule 1: the feet resist
   * as hard as the push asks while that makes no energy (the share s₀ with W(s₀) ≤ 0: holding and absorbing cost the
   * legs nothing), and push beyond it only with the leg's own force, not the push the coupled solve sized for board and
   * body together. Rule 2: no more of that than keeps the net work within what the legs may still do this substep
   * (LEG_POWER_PEAK, LEG_POWER_HELD). The impulse keeps its line, so its centre of pressure and friction cone hold. Scales
   * the projected impulse and returns the share.
   */
  limitPush(base: Float64Array, full: Float64Array, h: number): number {
    const j = this.projected;
    const a = j.dot(this.apartRelative(base, h, this.powerScratch2));
    const b = j.lengthSq() / (2 * this.mass) + j.dot(this.apartRelative(full, h, this.powerScratch2)) - a;
    const free = a < 0 ? (b > 0 ? Math.min(1, -a / b) : 1) : 0;
    let s = Math.max(free, this.legShare(h));
    const budget = Math.max(0, this.powerBudget);
    if (a * s + b * s * s > budget) {
      // W(free) ≤ 0 ≤ budget, so the root lies past `free` (W convex for b > 0; linear or concave otherwise).
      if (b > 1e-12) s = (-a + Math.sqrt(Math.max(0, a * a + 4 * b * budget))) / (2 * b);
      else s = a > 0 ? budget / a : s;
      s = Math.max(free, Math.min(1, s));
    }
    this.projected.multiplyScalar(s);
    return s;
  }

  /** The leg drive's reaction on the board: the opposite push at the back foot, so the pair is nothing on the two together. */
  private pushDrive(rhs: Float64Array): void {
    const h = this.driveStep;
    const force = this.driveForce;
    const torque = cross(this.driveFoot, force, this.localScratch);
    rhs[0] -= h * force.x;
    rhs[1] -= h * force.y;
    rhs[2] -= h * force.z;
    rhs[3] -= h * torque.x;
    rhs[4] -= h * torque.y;
    rhs[5] -= h * torque.z;
  }

  /** After the board has moved: the rider's own motion and ledgers. */
  finish(h: number, board: BoardBody): void {
    // The new surfer standing free (`coupleYaw`): the body's spin turned with the board through the feet this substep.
    if (this.yawCoupled) this.yawSpin = this.up.dot(board.angularVelocity);
    // The new surfer standing free (step 3.2e): the twist moved on with the board's turn after the solve (`coupleYaw`).
    const tb = this.twistBody;
    let twistWork = 0;
    if (tb.coupled && tb.inertia > 0) {
      const turned = this.up.dot(board.angularVelocity);
      const before = tb.upper;
      tb.upper = (tb.inertia * tb.upper - h * tb.spring + tb.alpha * turned) / (tb.inertia + tb.alpha);
      tb.rate = tb.upper - turned;
      tb.angle += h * tb.rate;
      tb.torque = (tb.inertia * (before - tb.upper)) / h;
      // The legs' twist work: on the board at its mean turn, on the upper body the other way at its mean spin.
      twistWork = h * tb.torque * ((tb.turn + turned) / 2 - (before + tb.upper) / 2);
      this.twist.angle = tb.angle;
      this.twist.rate = tb.rate;
    }
    // `legPower: 'cap'`: the contact's net work this substep, the leg drive's board share left out (`recordPower`).
    const ledger = this.windowed ? board.work.rider + this.work.contact : 0;
    let driveShare = 0;
    const before = this.scratch.copy(this.velocity);
    // Power of the contact on the board is the same at any point of its line; use the centre of mass.
    const boardBefore = cross(this.boardSpin, this.arm, this.localScratch).add(this.boardVelocity);
    const boardAfter = cross(board.angularVelocity, this.arm, this.target).add(board.velocity);
    const contact = this.impulse;
    const free = this.freeBody;
    if (this.feasible) {
      this.velocity.copy(cross(board.angularVelocity, this.carried, this.scratch2).add(board.velocity).add(this.drive));
      if (this.upright) this.velocity.addScaledVector(this.up, this.legRateAfter).addScaledVector(this.across, this.bankSpeedAfter);
      if (free) this.velocity.addScaledVector(this.forward, this.standingBody.speedAfter);
      contact.copy(this.velocity).sub(before).multiplyScalar(this.mass).addScaledVector(this.external, -h);
      if (this.upright) {
        this.angularVelocity.set(0, board.angularVelocity.y, 0).addScaledVector(this.rollAxis, this.bankSpeedAfter / this.legLength);
        // The new surfer (step 3.2): the bank's speed is the body's relative to the board, so its own bank rate adds the board's roll.
        if (free) this.angularVelocity.addScaledVector(this.rollAxis, board.angularVelocity.dot(this.rollAxis));
        if (free) {
          // The body pitching on its ankle: its rate on the deck after the solve, plus the board's own about the same axis.
          const pitched = (this.standingBody.speedAfter + this.drive.dot(this.forward)) / this.legLength + board.angularVelocity.dot(this.across);
          this.angularVelocity.addScaledVector(this.across, pitched);
        }
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
    const felt = this.contact;
    if (this.agile) {
      // The legs' split moves the feet's shares past the line of force's.
      this.lineShare = felt.frontShare;
      if (this.upright && this.legLoad > 0) felt.frontShare = Math.min(1, Math.max(0, felt.frontShare - this.trunkTorque / ((this.feet.front - this.feet.rear) * this.legLoad)));
    }
    felt.weight = !this.upright ? Number.NaN
      : Number.isNaN(felt.weight) ? felt.frontShare : felt.weight + (felt.frontShare - felt.weight) * (1 - Math.exp(-h / WEIGHT_TIME));
    const mean = before.add(this.velocity).multiplyScalar(0.5);
    this.work.gravity += h * this.gravity.dot(mean);
    this.work.water += h * this.waterForce.dot(mean);
    this.work.assist += h * this.assistForce.dot(mean);
    this.work.carry += h * this.carryForce.dot(mean);
    this.work.leanOut += h * this.leanOutForce.dot(mean);
    if (this.drives && this.driveForce.lengthSq() > 0) {
      this.work.legDrive += h * this.driveForce.dot(mean);
      const footBefore = cross(this.boardSpin, this.driveFoot, this.scratch2).add(this.boardVelocity);
      const footAfter = cross(board.angularVelocity, this.driveFoot, this.localScratch).add(board.velocity);
      board.work.rider -= (h * this.driveForce.dot(footBefore.add(footAfter))) / 2;
      if (this.windowed) driveShare = -(h * this.driveForce.dot(footBefore)) / 2;
    }
    if (this.upright && this.feasible && this.swingTorque !== 0) {
      // The swing's couple, which the board did not take with the push along the line of force.
      board.work.rider -= (h * this.swingTorque * this.rollAxis.dot(this.scratch2.addVectors(this.boardSpin, board.angularVelocity))) / 2;
    }
    if (free && this.feasible && this.standingBody.hip.torque !== 0) {
      // The new surfer's hip in pitch: the trunk's couple, which the pair took about the pitch axis.
      board.work.rider -= (h * this.standingBody.hip.torque * this.across.dot(this.scratch2.addVectors(this.boardSpin, board.angularVelocity))) / 2;
    }
    if (this.upright && this.feasible && this.twistTorque !== 0) {
      // The twist's reaction, which turned the board through the feet.
      board.work.rider -= (h * this.twistTorque * this.up.dot(this.scratch2.addVectors(this.boardSpin, board.angularVelocity))) / 2;
    }
    if (this.agile && this.upright && this.feasible && (this.hipTorque !== 0 || this.trunkTorque !== 0)) {
      // The agile legs' couples, which turned and pitched the board through the feet.
      board.work.rider += (h * this.limbTorque.dot(this.scratch2.addVectors(this.boardSpin, board.angularVelocity))) / 2;
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
    if (twistWork !== 0) this.work.contact += twistWork;
    if (this.windowed) this.recordPower(h, board.work.rider + this.work.contact - ledger - driveShare);
    this.stepImpulse.add(contact);
    // The new surfer: the body's own push through the feet (the soles' sense), for the pitch reference's slow trim.
    if (this.newRider && this.upright) this.bodyPush.addScaledVector(this.scratch2.copy(contact).divideScalar(h).sub(this.bodyPush), 1 - Math.exp(-h / SPECIFIC_FORCE_TIME));
    this.up.set(0, 1, 0).applyQuaternion(board.orientation);
    const substepLoad = contact.dot(this.up) / (h * this.mass * WATER.gravity);
    this.stepLoad = Math.max(this.stepLoad, substepLoad);
    // The new surfer: the feet's own load this substep, in body weights, for the capture point's validity condition
    // (`humanBalance.ts` CAPTURE_LOAD, step 3.2h). A read-out for the probes as well.
    if (free) this.captureLoad = substepLoad;
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
    // The new surfer standing (step 3.2): the capture point against the feet (`HumanBalance`), which replaces the sway's
    // RECOVERABLE_ERROR as the balance's fall test. Step 3.2h gives it its validity condition: it is read only while the
    // feet carry the body (CAPTURE_LOAD), and while they do not, `RECOVERABLE_ERROR` below (the leg past its travel, the
    // lean past MAX_BANK or MAX_PITCH) and MAX_FLIGHT carry the window.
    if (free) this.captureStep(h, board, substepLoad);
    else this.pairFresh = true;
    // Pushed too far off the posture, swayed past recovery, or airborne too long: the rider lets go of the board.
    if (this.flightTime > MAX_FLIGHT) this.separate('lost board');
    else if (free && this.human.fallen) this.separate(this.limit === 'slip' ? 'foot slip' : 'balance');
    else if (this.upright && Math.hypot(this.sway.x, this.sway.z) > RECOVERABLE_ERROR) this.separate('balance');
    else if (this.postureError > RECOVERABLE_ERROR && this.limit !== 'none') this.separate(SEPARATION[this.dominantLimit()]);
  }

  /**
   * The new surfer standing (step 3.2): the capture point against the feet (`HumanBalance.capture`), in the board's
   * frame: the centre of mass from the feet's middle, its velocity relative to the feet there, the felt vertical (the
   * feet's specific force, low-passed SPECIFIC_FORCE_TIME), the feet's extent (the support), and what the room left can
   * still catch past the edge: the rotor's angular impulse to its range (`rotorImpulse`) as a capture-point distance,
   * the hip across (the swing) across and the hip in pitch along. `load` is the feet's own load this substep, in body
   * weights: the test's validity condition (step 3.2h, `humanBalance.ts` CAPTURE_LOAD). The felt vertical's low pass
   * keeps running through a light window, so the test resumes on a current reading.
   */
  private captureStep(h: number, board: BoardBody, load: number): void {
    const support = this.support;
    const midX = (support.xMin + support.xMax) / 2;
    const midZ = (support.zMin + support.zMax) / 2;
    const feet = board.toWorld(this.localScratch.set(midX, deckHeight(this.shape, midZ), midZ), this.captureFeet);
    const inverse = this.spin.copy(board.orientation).invert();
    const offset = this.captureOffset.subVectors(this.position, feet).applyQuaternion(inverse);
    const velocity = this.captureVelocity.subVectors(this.velocity, board.velocityAt(feet, this.scratch)).applyQuaternion(inverse);
    // The felt vertical: the pair's (board and body together) specific force, low-passed SPECIFIC_FORCE_TIME. Only the
    // water and gravity move the pair's centre of mass, so the feet's own pushes on the light board (the balance's moves)
    // do not tilt it; the turn's pull and the drag do. (The feet's own specific force swung by a g and more as the body
    // pushed the 2.5 kg board, and the capture point read a fall in 0.07 s of a lean begun: the don't-retry list.)
    const momentum = this.captureScratch.copy(board.velocity).multiplyScalar(board.mass).addScaledVector(this.velocity, this.mass);
    const total = board.mass + this.mass;
    if (this.pairFresh) {
      this.pairFelt.set(0, WATER.gravity, 0);
      this.pairFresh = false;
    } else {
      const ax = (momentum.x - this.pairMomentum.x) / (h * total);
      const ay = (momentum.y - this.pairMomentum.y) / (h * total) + WATER.gravity;
      const az = (momentum.z - this.pairMomentum.z) / (h * total);
      const blend = 1 - Math.exp(-h / SPECIFIC_FORCE_TIME);
      this.pairFelt.x += (ax - this.pairFelt.x) * blend;
      this.pairFelt.y += (ay - this.pairFelt.y) * blend;
      this.pairFelt.z += (az - this.pairFelt.z) * blend;
    }
    this.pairMomentum.copy(momentum);
    const felt = this.captureFelt.copy(this.pairFelt).applyQuaternion(inverse);
    const height = Math.max(0.2, offset.length());
    const omega = Math.sqrt(Math.max(0.5, this.pairFelt.length()) / height);
    const room = stanceRoom(this.stanceDepth);
    // Step 3.2i measured `rotorReach`'s horizon cap here and did not keep it: it buys nothing on the chop (the cap does
    // not bind with the arms in, where the hip's inertia is 6 kg·m²) and costs the push bar 44 % of its saved shove,
    // because under a shove ω₀ is read from a felt gravity the impulse itself inflates to 13–19 m/s², so the horizon
    // 1/ω₀ is artificially short exactly where the felt gravity is least trustworthy (`3.2/README.md` Part 9 §3).
    const across = rotorImpulse(this.human.swingInertia, SWING_TORQUE, room.hipRange - Math.abs(this.swing.angle)) / (this.mass * height * omega);
    const along = rotorImpulse(HIP_PITCH_INERTIA, HIP_PITCH_TORQUE, room.hipRange - Math.abs(this.standingBody.hip.angle)) / (this.mass * height * omega);
    this.human.capture(offset, velocity, felt, (support.xMax - support.xMin) / 2, support.zMax - midZ, midZ - support.zMin, across, along, load, h);
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
    this.climbing = false;
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
    if (this.upright && this.freeBody) {
      // The new surfer standing (`StandingBody`): the heading, then the leg line's pitch (square to the deck on a new
      // mount), then its bank; the body's forward axis is the ninth unknown's.
      board.toWorld(this.base, this.baseWorld);
      const sway = this.localScratch.set(this.sway.x, 0, this.sway.z).applyQuaternion(board.orientation);
      const cx = this.localCenter.x - this.base.x;
      const cy = this.localCenter.y - this.base.y;
      const cz = this.localCenter.z - this.base.z;
      const boardUp = this.scratch.set(0, 1, 0).applyQuaternion(board.orientation);
      if (measure) {
        const lean = this.scratch2.subVectors(this.position, this.baseWorld).sub(sway);
        this.standingBody.measure(this.heading, boardUp, Math.atan2(cz, cy), lean);
        if (this.banking) {
          const angle = this.standingBody.bankOf(this.heading, lean) - Math.atan2(cx, Math.hypot(cy, cz));
          this.bank.angle = Math.max(-MAX_BANK, Math.min(MAX_BANK, angle));
        }
      } else {
        this.standingBody.measure(this.heading, boardUp, Math.atan2(cz, cy));
        // A new mount on a planing board: square to the deck across as well (`mount`).
        if (this.banking) this.bank.angle = Math.max(-MAX_BANK, Math.min(MAX_BANK, this.standingBody.bankOf(this.heading, boardUp) - Math.atan2(cx, Math.hypot(cy, cz))));
      }
      if (!this.banking) {
        this.bank.angle = 0;
        this.bank.rate = 0;
      }
      this.standingBody.frame(this.heading, this.bank.angle, this.bodyFrame);
      this.up.copy(Y).applyQuaternion(this.bodyFrame);
      this.across.copy(X).applyQuaternion(this.bodyFrame);
      this.forward.copy(Z).applyQuaternion(this.bodyFrame);
      this.target.copy(this.localCenter).sub(this.base).applyQuaternion(this.bodyFrame).add(this.baseWorld).add(sway);
    } else if (this.upright) {
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
    // The new surfer standing (step 3.2): none; the body keeps its bank by its own inertia and the ankle's forces.
    if (this.freeBody) return out;
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
      this.frictionUsed = 0;
      this.kneeUsed = 0;
      this.contact.centreOfPressure.set(local.x, local.y - height, local.z);
      this.rawMargin = 0;
      this.limit = 'flight';
      this.loaded = false;
      return out.set(0, 0, 0);
    }
    // The new surfer standing: the knees' strength (`kneeStrength`) at the leg's length now, in MAX_LOAD's place.
    const cap = (this.freeBody ? kneeStrength(this.parts[1] - this.base.y + this.leg.extension - ANKLE_HEIGHT) : MAX_LOAD * this.mass * WATER.gravity) * h;
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
    this.frictionUsed = friction > 0 ? Math.min(1, tangential / friction) : 1;
    this.kneeUsed = Math.min(1, j.y / cap);
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
    if (this.phaseDuration > 0 && this.climbing) {
      // Climbing on: across and along the board on a minimum-jerk path over the first CLIMB_ACROSS of the time, up (the
      // board's y) over the time from CLIMB_RISE on.
      const s = Math.min(1, this.phaseTime / this.phaseDuration);
      const slide = Math.min(1, s / CLIMB_ACROSS);
      const up = Math.max(0, (s - CLIMB_RISE) / (1 - CLIMB_RISE));
      const rise = minimumJerk(up);
      const across = minimumJerk(slide);
      const riseRate = s > CLIMB_RISE ? minimumJerkRate(up) / ((1 - CLIMB_RISE) * this.phaseDuration) : 0;
      const acrossRate = s < CLIMB_ACROSS ? minimumJerkRate(slide) / (CLIMB_ACROSS * this.phaseDuration) : 0;
      const from = postureCenter(this.fromParts, this.partMasses);
      const to = postureCenter(pose.parts, this.partMasses);
      this.postureRate.set((to.x - from.x) * acrossRate, (to.y - from.y) * riseRate, (to.z - from.z) * acrossRate);
      for (let k = 0; k < this.parts.length; k += 1) {
        this.parts[k] = this.fromParts[k] + (pose.parts[k] - this.fromParts[k]) * (k % 3 === 1 ? rise : across);
      }
    } else if (this.phaseDuration > 0) {
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
      this.parts[i * 3] += this.balance.x + this.lean.x + this.armsGive;
      this.parts[i * 3 + 2] += this.balance.z + this.lean.z;
    }
    const center = postureCenter(this.parts, this.partMasses);
    this.localCenter.set(center.x, center.y, center.z);
  }

  /**
   * Snap's weight as its rail change lets it through (`snapCross: 'on'`): none while the body still leans against the
   * stick's side, as it did when Snap or that side began; all of it once it has come over, and for the rest of that Snap.
   */
  private crossStep(snap: number): number {
    if (!(snap > 0)) {
      this.crossSide = 0;
      this.crossed = true;
      return snap;
    }
    const side = Math.abs(this.steer) > STEER_DEADBAND ? Math.sign(this.steer) : this.crossSide;
    const against = this.banking ? -this.bank.angle * side : 0;
    if (side !== this.crossSide) {
      this.crossSide = side;
      this.crossed = false;
    }
    if (against <= UPRIGHT_BANK) this.crossed = true;
    return this.crossed ? snap : 0;
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
    const free = this.freeBody;
    this.copTarget.x = 0;
    // Standing, W/S set the pressure the rider holds along the board (TRIM_PRESSURE); landing and lying, the middle.
    this.copTarget.z = this.upright && this.phase === 'standing'
      ? (Math.max(-1, Math.min(1, this.trim)) * TRIM_PRESSURE * (this.feet.front - this.feet.rear)) / 2 : 0;
    // Snap: the pressure onto the back foot, over the fins (SNAP_PRESSURE), held closer (SNAP_FREEDOM).
    const snap = this.snapping;
    // Snap's rail change (`snapCross: 'on'`): the weight waits until the body is over the board.
    const weighted = this.snapCrosses ? this.crossStep(snap) : snap;
    if (weighted > 0) this.copTarget.z += weighted * ((-SNAP_PRESSURE * (this.feet.front - this.feet.rear)) / 2 - this.copTarget.z);
    // Snap's stamp (`snapStamp: 'on'`): a full steer slams the weight past the tail for STAMP_TIME, then back over the fins.
    const stamp = this.stamps ? this.stampStep(h, snap) : 0;
    // The agile launch (`agile: 'on'`, in the stamp's place and on its clock): the pressure forward off the fins while the tail is thrown.
    if (this.agile) {
      this.stampStep(h, snap);
      const span = this.feet.front - this.feet.rear;
      this.copTarget.z += snap * this.launching * ((-AGILE_PRESSURE * span) / 2 - this.copTarget.z);
    }
    // Snap let go standing, the weight is centred again, held as close as Snap held it, for up to RECENTRE_TIME.
    if (this.recentres) {
      if (snap > 0 || !this.upright || this.phase !== 'standing') this.recentreTime = Number.NaN;
      else if (this.snapBefore > 0) this.recentreTime = 0;
      else if (this.recentreTime >= 0) this.recentreTime += h;
      if (this.recentreTime > RECENTRE_TIME) this.recentreTime = Number.NaN;
      this.snapBefore = snap;
    }
    const recentring = this.recentreTime >= 0;
    const freedom = weighted > 0 ? TRIM_FREEDOM + weighted * (SNAP_FREEDOM - TRIM_FREEDOM) : TRIM_FREEDOM;
    const wantX = (support.xMin + support.xMax) / 2;
    const wantZ = (support.zMin + support.zMax) / 2 + this.copTarget.z;
    if (!this.upright && this.inContact) {
      // Toward the high rail (board +x is its left): the roll from the water's level (PRONE_ROLL_SHIFT), positive with
      // the left rail up, and its rate about the board's length.
      const side = this.scratch.set(1, 0, 0).applyQuaternion(board.orientation);
      const roll = Math.asin(Math.max(-1, Math.min(1, side.dot(this.waterUp))));
      const rate = this.scratch2.copy(board.angularVelocity).applyQuaternion(this.spin.copy(board.orientation).invert()).z;
      const ducking = this.duck.press > DUCK_BUSY;
      const onRails = ducking;
      const reachX = onRails ? DUCK_SHIFT : reach.x;
      this.armsGiveStep(roll, h);
      // Paddling, the level kept swings toward each arm as it pulls (board +x, the left arm's side, down is a negative
      // roll); pushing up, at once level.
      const rolling = this.paddle && !ducking && this.phase === 'prone' && !this.climbing ? Math.min(1, board.velocity.length() / STROKE_ROLL_SPEED) * this.waterCalm : 0;
      this.strokeRoll = this.phase === 'prone' ? this.strokeRoll + (rolling - this.strokeRoll) * Math.min(1, h / STROKE_ROLL_TIME) : 0;
      const swing = 2 * Math.PI * (this.strokePhase - this.pullShare / 2 + STROKE_ROLL_LEAD);
      const rollTo = -STROKE_ROLL * this.strokeRoll * Math.cos(swing);
      const rollRate = ((STROKE_ROLL * this.strokeRoll * 2 * Math.PI) / this.strokeCycle) * Math.sin(swing);
      let wanted: number;
      if (onRails) {
        wanted = DUCK_ROLL_SHIFT * roll + DUCK_ROLL_DAMPING * rate;
      } else {
        // The balance first: the hips level the board within their reach, and the stroke's swing has what is left.
        const level = Math.min(reachX, Math.max(-reachX, PRONE_ROLL_SHIFT * roll + PRONE_ROLL_DAMPING * rate));
        const spare = reachX - Math.abs(level);
        wanted = level + Math.min(spare, Math.max(-spare, -(PRONE_ROLL_SHIFT * rollTo + PRONE_ROLL_DAMPING * rollRate)));
      }
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
      const keepZ = Math.min(wantZ + freedom, Math.max(wantZ - freedom, this.smoothedCop.z));
      // After Snap the hips go back over the stance's middle (the posture's own place); there, the balance's band again.
      if (recentring && Math.abs(this.balance.z) <= RECENTRE_HOME) this.recentreTime = Number.NaN;
      // The new surfer standing: along the board the body is its own (`StandingBody`): the pitch ankle's rest puts the
      // pressure at the trim's target, so the upper body does not shift along it.
      const targetZ = recentring || free ? 0 : Math.min(reach.z, Math.max(-reach.z, this.balance.z + (keepZ - this.smoothedCop.z) / share));
      this.shiftAxis('x', targetX, reach.x, h);
      this.shiftAxis('z', targetZ, reach.z, h);
    } else {
      this.shiftAxis('x', this.banking ? 0 : this.balance.x, reach.x, h);
      this.shiftAxis('z', free ? 0 : this.balance.z, reach.z, h);
    }
    // Carried upright, the steering lean (with the heading hold and the hand); banked, steering is the bank. The trim, standing only.
    const lean = this.upright && !this.banking ? Math.max(-1, Math.min(1, this.steer + this.standingHold + HAND_BEND * this.handBend)) * MAX_LEAN : 0;
    const level = this.upright ? Math.max(-1, Math.min(1, this.trim)) * TRIM_SHIFT : 0;
    // Snap: the upper body over the hips, which the pressure has put over the back foot (no lean back past it).
    // The new surfer: no shift along the board (the trim is the pitch ankle's rest).
    const trim = free ? 0 : snap > 0 ? level * (1 - snap) - snap * stamp * STAMP_BACK : level;
    this.leanAxis('x', lean, h);
    // The stamp and its return at Snap's full-effort pace (SNAP_SHIFT_TIME), the weight's own shift.
    if (this.stamps && snap > 0 && this.stampTime >= 0 && this.quick) this.leanAxis('z', trim, h, snap);
    else this.leanAxis('z', trim, h);
  }

  /**
   * Snap's stamp (snap-stamp; STAMP_STEER): returns how far the upper body is asked back past the hips now, 0–1. It starts
   * once per press-and-turn, when the steer passes STAMP_STEER with Snap held at least STAMP_SET; its depth is the steer
   * past the threshold, and it lasts STAMP_TIME (half of it for a steer just past). Then the return runs at the same pace
   * for STAMP_RETURN, the body back over the hips and the fins.
   */
  private stampStep(h: number, snap: number): number {
    if (snap <= 0) {
      this.snapHeldTime = 0;
      this.stampArmed = true;
      this.stampTime = Number.NaN;
      return 0;
    }
    this.snapHeldTime += h;
    const steer = Math.abs(this.steer);
    if (steer < STAMP_STEER - STAMP_REARM) this.stampArmed = true;
    if (this.stampArmed && steer > STAMP_STEER && this.snapHeldTime >= STAMP_SET) {
      this.stampArmed = false;
      this.stampTime = 0;
      this.stampDepth = Math.min(1, (steer - STAMP_STEER) / (1 - STAMP_STEER));
    }
    if (!(this.stampTime >= 0)) return 0;
    this.stampTime += h;
    const length = STAMP_TIME * (0.5 + 0.5 * this.stampDepth);
    if (this.stampTime > length + STAMP_RETURN) {
      this.stampTime = Number.NaN;
      return 0;
    }
    return this.stampTime <= length ? this.stampDepth : 0;
  }


  /**
   * Pushing up (the pop-up; the paddle-balance fix, 2026-10-22), the hips keep the
   * prone balance (PRONE_ROLL_SHIFT within PRONE_SHIFT) and the arms give. As the
   * chest leaves the deck the body rises on its hands, which hold the rails, and
   * the board rolls under them while the body's centre of mass stays over the
   * board's middle: the body shifts toward the high rail by its lift over the
   * prone posture times tan of the roll, within the hands' span on the rails
   * (DUCK_SHIFT). Carried rigidly with the deck, the rising body (its centre of
   * mass from 0.19 m to 0.45 m over it) swung across by its height for every
   * radian of roll; the hips' 0.1 m levels that only to 13°.
   *
   * The duck-dive's hold, which batch C gave the push (the hands on the rails,
   * DUCK_ROLL_SHIFT 1.0 m per rad), is made for a board under water, with no
   * waterplane and slow to roll. On a floating or planing board the body's shift,
   * critically damped over BALANCE_TIME, came a quarter cycle or more behind the
   * board's roll and drove it: in a probe on a static 15° face, popping up at
   * each tenth of a second through a stroke, the board rolled 22–79° in the rise
   * and the rider fell in 11 of 12 (none, the board within 18°, with the hips'
   * balance and the arms' give); popping up on a face catching the paddler, 17 of
   * 20, 12 in the rise (4 and 3 with this, the 3 nose-diving at the foot of an
   * 18° face).
   */
  private armsGiveStep(roll: number, h: number): void {
    if (this.phase !== 'push') {
      this.armsGive = 0;
      this.armsGiveRate = 0;
      return;
    }
    const lift = Math.max(0, this.localCenter.y - deckHeight(this.shape, this.localCenter.z) - this.proneHeight);
    const give = Math.max(-DUCK_SHIFT, Math.min(DUCK_SHIFT, lift * Math.tan(roll)));
    this.armsGiveRate = (give - this.armsGive) / h;
    this.armsGive = give;
  }

  /**
   * Standing, the side the hand reaches for: with the hand asked for, the wave side, where the water stands
   * higher beside the board; compressing into a lean without it, the side the body leans toward.
   */
  private waveSide(board: BoardBody, water: SurfWater): void {
    this.handSide = 0;
    if (this.phase !== 'standing' || !this.attached) return;
    if (!this.hand) {
      if (this.compressAsked >= REACH_FROM && Math.abs(this.bank.angle) >= REACH_LEAN) this.handSide = Math.sign(this.bank.angle);
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
  private leanAxis(axis: 'x' | 'z', target: number, h: number, quick = 0): void {
    let frequency = 1 / BALANCE_TIME;
    let maxAcceleration = MAX_SHIFT_ACCELERATION;
    let maxSpeed = MAX_SHIFT_SPEED;
    if (quick > 0) {
      // Snap's stamp: as fast as Snap's own shift (`shiftAxis`): SNAP_SHIFT_TIME within the inverted pendulum's acceleration.
      const height = Math.max(0.4, this.leg.height + this.leg.extension);
      const pendulum = (WATER.gravity * (this.feet.front - this.feet.rear)) / 2 / height;
      frequency += quick * (1 / SNAP_SHIFT_TIME - frequency);
      maxAcceleration += quick * (Math.max(maxAcceleration, pendulum) - maxAcceleration);
      maxSpeed += quick * (Math.max(maxSpeed, SNAP_SHIFT_SPEED) - maxSpeed);
    }
    const acceleration = Math.min(maxAcceleration, Math.max(-maxAcceleration,
      frequency * frequency * (target - this.lean[axis]) - 2 * frequency * this.leanRate[axis]));
    this.leanRate[axis] = Math.min(maxSpeed, Math.max(-maxSpeed, this.leanRate[axis] + acceleration * h));
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
    let frequency = 1 / (this.upright ? STANDING_BALANCE_TIME : BALANCE_TIME);
    let maxAcceleration = this.upright ? STANDING_SHIFT_ACCELERATION : MAX_SHIFT_ACCELERATION;
    let maxSpeed = this.upright ? STANDING_SHIFT_SPEED : MAX_SHIFT_SPEED;
    const snap = axis === 'z' && this.quick ? this.snapping : 0;
    if (snap > 0) {
      // Snap held, the weight goes onto the tail as fast as the body can take it: the inverted pendulum's acceleration,
      // the pressure at the front foot ahead of the body over its height above the feet (SNAP_SHIFT_TIME).
      const height = Math.max(0.4, this.leg.height + this.leg.extension);
      const pendulum = (WATER.gravity * (this.feet.front - this.feet.rear)) / 2 / height;
      frequency += snap * (1 / SNAP_SHIFT_TIME - frequency);
      maxAcceleration += snap * (Math.max(maxAcceleration, pendulum) - maxAcceleration);
      maxSpeed += snap * (SNAP_SHIFT_SPEED - maxSpeed);
    }
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
