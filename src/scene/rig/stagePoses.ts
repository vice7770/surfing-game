import { SETTLE_TIME } from '../../physics/AttachedRider';

/**
 * The animation-realism plan's key poses (docs/superpowers/plans/2026-10-22-animation-realism.md,
 * §5): what the drawn rider's shape is at each stage, frontside and backside,
 * as data the rig takes for its targets. The physics still sets the depth, the
 * weight, the lean, the twist, the alarm and the reach; a key pose sets what
 * the physics leaves open (the feet's angles, the knees standing tall, the
 * rear knee caving in, the hinge, where the chest and hips face, the shoulder
 * drop, the relaxed hands, the gaze's pitch). Goofy mirrors Regular. Phase 1:
 * the global stance, trim frontside and backside, and the drop. Phase 2: the
 * turns, each frontside and backside (the bottom turn, the top turn and snap,
 * the cutback), the tube (the grab-rail, the pig-dog) and the kick-out over the
 * back: their trunk, where the chest and hips face, the look's lead, the arms
 * as pointer and the tube's rail grab. The stage reader (`stageBlend.ts`)
 * blends them; the turn's anticipation (the head, then the chest, then the
 * hips) is the rig's (`RIG_DETAIL.cascade`), read from the yaw rate. Phase 3:
 * the take-off and the water: the pop-up's landing (its feet at 45°, settling
 * into riding's), its drawn places (`TAKE_OFF`: the push's flat hands, the hips
 * low in the press, the feet swung onto the deck), the lying poses (paddling's
 * low chest, the look-up, the catch and its cobra) and the lineup sit (`SIT`).
 *
 * Conventions: a foot's angle to the stringer (90° square across); knees and
 * hips as the rig takes them (the knees' flexion, the hips' included angle);
 * the chest's and hips' yaw from the toes (0°) toward the nose (+); the hands'
 * offsets, m, in the board's levelled frame.
 */

/** A hand's place about its knee, m, in the board's levelled frame: toward the nose, toward the toes (in front of the body), up. */
export interface HandOffset {
  nose: number;
  toes: number;
  up: number;
}

export interface StandingPose {
  /**
   * Each foot's angle to the stringer, °: front, rear. The research (Rapture's
   * stance page: 20–30° and 15–25° off square) and the owner's call (§10.3): 45°
   * on the pop-up's landing (phase 3), about 60° front and 80° back riding, the
   * back foot over the fins. Medium confidence.
   */
  foot: { front: number; rear: number };
  /**
   * The knees' flexion standing tall, °: the physics' standing pelvis maps to
   * both knees at this, so its crouch bends them from there. 42° puts trim's
   * knees inside its 30–65° front and 35–70° rear (Borgonovo-Santos 2021, citing
   * earlier work: a half squat, 30–80°; Weiß 2024; Bruton 2013), about equal
   * (the owner's call, §10.1; the plan's 40° left the rear at 31–33° with the
   * hips' place below). Medium.
   */
  kneeTall: number;
  /**
   * The rear knee caves in toward the front foot: its bend turned `toward`°
   * from the rear foot's line toward the nose and `down`° toward the deck
   * (coaching cue; low).
   */
  rearKneeIn: { toward: number; down: number };
  /** The ankle bends no further than this under load, °, before the heel lifts (Seixas 2023: the front ankle 32.7 ± 14.5° on landings). */
  maxDorsiflexion: number;
  /**
   * How far the trunk hinges forward at the hips from the physics' trunk, °,
   * standing tall and at the crouch's full depth: bend at the knees rather than
   * the waist, the head over the board (WSL flow, Barton Lynch): the trunk
   * 15–30° from vertical in trim; backside, leaning into the face on the heels,
   * it hinges further for the same. Crouched, the owner's reference of
   * 2026-10-22 leans the torso 40–50° over the knees.
   */
  hinge: { tall: number; deep: number };
  /** Where the chest and the pelvis face, from the toes toward the nose, °. */
  chest: number;
  hips: number;
  /** The lead shoulder lower than the trailing one, ° (a side bend toward the lead; coaching, low). */
  shoulderDrop: number;
  /**
   * The relaxed free hands about their knees (the owner's reference, 2026-10-22:
   * the arms hang relaxed and close in, framing the knees; the front hand about
   * level with the front knee and slightly ahead of it along the line, the back
   * hand beside the back knee; never spread). Standing taller than the arm
   * reaches, the arm hangs toward the place, in front of the thigh.
   */
  hands: { lead: HandOffset; trail: HandOffset };
  /** The relaxed elbows: no straighter than `elbowMost`°, no more bent than `elbowLeast`° (included; a soft elbow, 30–60° of bend). */
  elbowMost: number;
  elbowLeast: number;
  /** The head pitches down the face, or up it, by the climb against the speed, within this, °; and further down by `gazeDown`° (the drop: the eyes on the base). */
  lookPitch: number;
  gazeDown: number;
  /** The trunk's tilt from the world's vertical, the lean into a turn included, stops at this, ° (the hinge capped by the pose). */
  tiltMost: number;
  /**
   * The spine bends toward a hand reaching down (the water, the face, a rail) no
   * further than this, ° (`RIG_DETAIL.reachBend` at most): in the tube's deep
   * tuck a full bend folded the trunk onto the thighs.
   */
  reachBend: number;
  /**
   * The drawn hips lowered further, m, along the body's line: compressing
   * through the redirect (vertical g; Rapture's top turn). Leaning into a turn
   * the physics' pelvis sits out to the side of the feet, which draws the legs
   * near straight (the top turn's 20–24°).
   */
  sink: number;
  /**
   * The look's lead into a turn past the travel and the yaw rate's own lead, ° at
   * a full turn, the turn's way: anticipating where the turn goes next (the
   * owner's reel, step 6: at three quarters of the face, already look where you
   * go; WSL flow: turns unwind from the head).
   */
  lookTurn: number;
  /**
   * The leading arm as pointer (the plan's §3.2): toward the look, no more than
   * `turn`° from its relaxed hand's heading; `lift` of the way from the relaxed
   * hand's elevation to `raise`° above the level; reaching `reach` of the arm
   * where it lifts. Blended in by the turn, or held at `hold` of it with none
   * (the tube's lead arm at the exit).
   */
  lead: { turn: number; raise: number; lift: number; reach: number; hold: number };
  /** The trailing arm swung up, ° from the trunk's down (the redirect's swing, the kick-out's balance), by the turn or `hold` of it with none. */
  trail: { swing: number; hold: number };
  /**
   * Losing balance, how far the free arms go out, ° from the trunk's down
   * (`RIG_DETAIL.arms.alarmElevation` at most), and how straight the elbow
   * comes (`alarmElbow`, °; `RIG_DETAIL.arms.alarmElbow` at most): out to the
   * level riding, below chest height and bent, close in, in a redirect and the
   * tube (the plan's phase 2, the owner's principle: never spread out; the
   * redirect's near-falls spread them into an airplane).
   */
  alarm: number;
  alarmElbow: number;
  /**
   * The trailing hand on a rail (the tube, decision 12): its `share`, which rail
   * (+1 the toes', −1 the heels'), and its place along the board from the rear
   * foot (0) to the front foot (1).
   */
  grab: { share: number; rail: number; along: number };
  /**
   * The drawn hips' place along the stance (the weight: the hips' share of the
   * way from the rear ankle to the front). The physics sits its pelvis forward
   * (trim 0.67–0.74 drawn, against the coaching's 0.50–0.62; phase 5 is the
   * physics' fix), which kept the front knee bent and the rear one near
   * straight. Drawn only, the hips past `pivot` are drawn at `keep` of their way
   * past it, at most `most` m back from the physics' pelvis; behind it they are
   * the physics' (S's weight back is unchanged).
   */
  weight: { pivot: number; keep: number; most: number };
}

/** Trim, frontside (the plan's §5.9): the lead shoulder low down the line, hips slightly open, the front arm loose toward the travel, the back arm at the side. */
const TRIM_FRONTSIDE: StandingPose = {
  foot: { front: 60, rear: 80 },
  kneeTall: 42,
  rearKneeIn: { toward: 20, down: 10 },
  maxDorsiflexion: 35,
  hinge: { tall: 16, deep: 50 },
  chest: 30,
  hips: 15,
  shoulderDrop: 8,
  // The owner's photo: the front hand forward and down along the line, ahead of the front knee (phase 1 drew it 0.02–0.08 m ahead).
  hands: { lead: { nose: 0.15, toes: 0.12, up: 0 }, trail: { nose: 0.02, toes: 0.2, up: 0.02 } },
  elbowMost: 150,
  elbowLeast: 115,
  lookPitch: 30,
  gazeDown: 0,
  tiltMost: 72,
  reachBend: 60,
  sink: 0,
  lookTurn: 0,
  // Phase 1's: the leading arm turns toward the look by at most 20°, at its relaxed hand's elevation.
  lead: { turn: 20, raise: 0, lift: 0, reach: 0.9, hold: 0 },
  trail: { swing: 0, hold: 0 },
  alarm: 90,
  alarmElbow: 175,
  grab: { share: 0, rail: 0, along: 0 },
  // Trim's 0.50–0.62 (SurfDeeper; Cornish Wave): the planing board's 0.67–0.74 drawn at about 0.58.
  weight: { pivot: 0.52, keep: 0.3, most: 0.1 },
};

/**
 * Trim, backside (the plan's §5.9): the same legs, the chest turned about 55°
 * toward the wave and the shoulders open along the rails, the head over the
 * lead shoulder down the line, the lead arm along the line and the trailing
 * arm at the side. Not the frontside mirrored.
 */
const TRIM_BACKSIDE: StandingPose = {
  ...structuredClone(TRIM_FRONTSIDE),
  // Its lead shoulder drawn low (`RIG_DETAIL.shoulderBend`) bends the upper body sideways, out of the hinge: 44°
  // keeps the trunk inside trim's 15–30° (phase 1: 42°), the chest 52° the shoulders' rise (phase 1: 55°).
  hinge: { tall: 44, deep: 50 },
  chest: 52,
  hips: 25,
  hands: { lead: { nose: 0.14, toes: 0.1, up: 0 }, trail: { nose: -0.02, toes: 0.2, up: 0.02 } },
};

/**
 * The drop (the plan's §5.8): the deepest crouch (the physics' crouch, knees
 * past 90°), the back fairly upright (trunk 20–40°), the arms at waist height
 * or below, in front, the lead arm along the line, the eyes on the base (the
 * head pitched 20–45° down: the gaze's pitch reaches 40°).
 */
const DROP: StandingPose = {
  ...structuredClone(TRIM_FRONTSIDE),
  // Knees past 90° at the physics' full crouch (front 90–115°, rear 85–110°: the research brief; de Sousa 2022).
  kneeTall: 60,
  hinge: { tall: 21, deep: 44 },
  hands: { lead: { nose: 0.14, toes: 0.08, up: -0.04 }, trail: { nose: 0.02, toes: 0.04, up: -0.12 } },
  elbowMost: 160,
  // The lead shoulder's drop raises the trailing one, and the back hand with it: in the drop's crouch the lead shoulder
  // is brought down only to 8° above the trailing one (it sat 17° above), the back hand kept at its knee.
  shoulderDrop: -8,
  lookPitch: 40,
  gazeDown: 15,
  // The owner's call (§10.2): the drop's weight on the back foot (55–60 %: the hips at 0.40–0.45).
  weight: { pivot: 0.38, keep: 0.2, most: 0.1 },
};

/**
 * The bottom turn, frontside (the plan's §5.10; Rapture; de Sousa 2022; Forsyth
 * 2024): compressed at the base by the physics' crouch, the body leaning with
 * the rail (the physics' bank), the trunk 40–60° from vertical (the hinge
 * stops at 55°: it drew 65–74°, folded); the chest and the lead shoulder
 * turned to the wave (the cascade turns them on toward the toes); the lead arm
 * pointing along the look, level, the arm long; the inside hand to the water
 * where the physics puts it.
 */
const BOTTOM_FRONTSIDE: StandingPose = {
  ...structuredClone(TRIM_FRONTSIDE),
  // Leaning forward to dig the rail (the owner's reel, step 3), the hinge stopped by the trunk's 58°.
  hinge: { tall: 30, deep: 40 },
  tiltMost: 58,
  chest: 28,
  hips: 12,
  lookTurn: 10,
  lead: { turn: 70, raise: -10, lift: 1, reach: 0.98, hold: 0 },
};

/**
 * The bottom turn, backside (Hobgood; Knox): low and compact on the heels'
 * rail, rotated with the hips rather than bent over the toes, the shoulders
 * square to the lip (the chest about square to the toes: the heels' turn
 * turns it on toward the nose), looking over the front shoulder at the lip
 * (the neck's reach), the lead arm at the target.
 */
const BOTTOM_BACKSIDE: StandingPose = {
  ...structuredClone(TRIM_FRONTSIDE),
  // Over the toes no further than Hobgood's upright trunk on the deck allows (`RIG_DETAIL.backsideLean`): the hinge
  // is bounded on the heels' rail.
  hinge: { tall: 30, deep: 30 },
  // The rear knee bent past 90° at Compress's depth (de Sousa 2022: 90–110°).
  kneeTall: 45,
  chest: -25,
  hips: -8,
  lookTurn: 20,
  lead: { turn: 70, raise: 0, lift: 1, reach: 0.98, hold: 0 },
};

/**
 * The top turn and the snap, frontside (the plan's §5.11; Rapture; the Bali
 * camp; the owner's reel, step 7): on the heels' rail with the weight back,
 * compressing through the redirect (the knees standing tall at 60°: they
 * drew straight, 20–24°), the lead shoulder and the head swung back to the
 * pocket, the leading hand dropped, the arms at chest height or below and
 * close in (the airplane, 95–136°, was the alarm and the snap's raise).
 */
const TOP_FRONTSIDE: StandingPose = {
  ...structuredClone(TRIM_FRONTSIDE),
  kneeTall: 60,
  sink: 0.08,
  hinge: { tall: 22, deep: 40 },
  chest: 72,
  hips: 30,
  lookTurn: 50,
  hands: { lead: { nose: 0.15, toes: 0.12, up: 0.05 }, trail: { nose: 0.1, toes: 0.18, up: 0.08 } },
  lead: { turn: 45, raise: -24, lift: 1, reach: 0.74, hold: 0 },
  trail: { swing: 55, hold: 0 },
  alarm: 50,
  alarmElbow: 130,
};

/** The top turn and the snap, backside (Hobgood): on the toes' rail, the shoulders opened toward the tail, the head back to the pocket. */
const TOP_BACKSIDE: StandingPose = {
  ...structuredClone(TOP_FRONTSIDE),
  hinge: { tall: 26, deep: 44 },
  chest: -35,
  hips: -12,
  lookTurn: 100,
  lead: { turn: 45, raise: -35, lift: 1, reach: 0.74, hold: 0 },
};

/**
 * The cutback, frontside (the plan's §5.12; Rapture; WSL flow; Forsyth 2024):
 * a long redirect lower on the heels' rail, the head, the lead shoulder, the
 * trail shoulder, the hips and the board coming round about 180° in turn (the
 * cascade), the lead arm long, low along the look, sweeping back with it.
 */
const CUTBACK_FRONTSIDE: StandingPose = {
  ...structuredClone(TOP_FRONTSIDE),
  kneeTall: 55,
  sink: 0.05,
  hinge: { tall: 20, deep: 42 },
  chest: 95,
  hips: 55,
  lookTurn: 75,
  lead: { turn: 150, raise: -20, lift: 1, reach: 0.88, hold: 0 },
  trail: { swing: 35, hold: 0 },
};

/** The cutback, backside: onto the toes, the chest turning toward the tail, looking back over the trailing shoulder. */
const CUTBACK_BACKSIDE: StandingPose = {
  ...structuredClone(CUTBACK_FRONTSIDE),
  hinge: { tall: 24, deep: 44 },
  chest: -75,
  hips: -40,
  lookTurn: 130,
};

/**
 * The tube, frontside: the grab-rail (decision 12; Stab, Jordy Smith): in the
 * deep tuck the back knee dropped toward the deck (the rear knee's pole turned
 * down), the back hand on the outside (heels') rail beside the back foot, the
 * lead arm forward, low and close at the exit; the front palm on the face is
 * the physics' hand (E).
 */
const TUBE_FRONTSIDE: StandingPose = {
  ...structuredClone(TRIM_FRONTSIDE),
  kneeTall: 55,
  rearKneeIn: { toward: 25, down: 55 },
  hinge: { tall: 30, deep: 45 },
  tiltMost: 58,
  reachBend: 20,
  chest: 30,
  hips: 15,
  lead: { turn: 60, raise: -10, lift: 1, reach: 0.82, hold: 1 },
  alarm: 50,
  alarmElbow: 140,
  grab: { share: 1, rail: -1, along: 0.05 },
};

/**
 * The tube, backside: the pig-dog (decision 12; eos.surf; Healey): the rear knee
 * dropped, the trailing hand crossing to the shoreward (toes') rail by the
 * front foot, the chest squared to the exit, the lead arm at it.
 */
const TUBE_BACKSIDE: StandingPose = {
  ...structuredClone(TUBE_FRONTSIDE),
  hinge: { tall: 34, deep: 56 },
  chest: 55,
  hips: 22,
  lead: { turn: 60, raise: -5, lift: 1, reach: 0.86, hold: 1 },
  grab: { share: 1, rail: 1, along: 0.85 },
};

/**
 * The kick-out over the back (the plan's §5.15; a coaching cue, no measured
 * source): hard on the back foot as the nose swings over the back, the front
 * leg long and the back knee bent (the weight back does it), the arms out for
 * balance, no higher than the shoulders.
 */
const KICK_OUT: StandingPose = {
  ...structuredClone(TRIM_FRONTSIDE),
  kneeTall: 32,
  chest: 50,
  hips: 25,
  lead: { turn: 60, raise: 5, lift: 1, reach: 0.9, hold: 0.8 },
  trail: { swing: 50, hold: 0.8 },
};

/**
 * The pop-up's landing (the plan's §5.7; Borgonovo-Santos 2021; Rapture's pop-up
 * page; the owner's call, §10.3): the feet land together at about 45° to the
 * stringer, the back foot across it over the tail pad, the front foot between
 * the hands; the knees bent 70–100° in the landing's crouch (the physics' pelvis
 * 0.3 m under its standing one), the front foot loaded (72 ± 8 % of the impulse:
 * the physics' landing pelvis sits 0.74 of the way to the front foot, drawn
 * back toward 0.62 only past it, so 0.68–0.73), the trunk hinged as in the drop,
 * the eyes forward, the arms low and forward. Standing, it settles into the
 * riding pose over `TAKE_OFF.settle` s, the feet turning to about 60° and 80°.
 */
const LANDING: StandingPose = {
  ...structuredClone(DROP),
  foot: { front: 45, rear: 45 },
  kneeTall: 30,
  rearKneeIn: { toward: 15, down: 10 },
  hinge: { tall: 21, deep: 40 },
  chest: 20,
  hips: 10,
  shoulderDrop: 0,
  hands: { lead: { nose: 0.16, toes: 0.12, up: 0.02 }, trail: { nose: 0.02, toes: 0.12, up: -0.04 } },
  lookPitch: 20,
  gazeDown: 0,
  weight: { pivot: 0.62, keep: 0.4, most: 0.1 },
};

export const STAGE_POSES = {
  trimFrontside: TRIM_FRONTSIDE, trimBackside: TRIM_BACKSIDE, drop: DROP,
  bottomFrontside: BOTTOM_FRONTSIDE, bottomBackside: BOTTOM_BACKSIDE, topFrontside: TOP_FRONTSIDE, topBackside: TOP_BACKSIDE,
  cutbackFrontside: CUTBACK_FRONTSIDE, cutbackBackside: CUTBACK_BACKSIDE, tubeFrontside: TUBE_FRONTSIDE, tubeBackside: TUBE_BACKSIDE,
  kickOut: KICK_OUT, landing: LANDING,
} as const;

/**
 * The pop-up's drawn places (the plan's §5.6 and §5.7, phase 3), timed by the
 * physics' own phases (`PUSH_TIME`, `LANDING_TIME`, `SETTLE_TIME`: Borgonovo-Santos
 * 2021's 0.71 s push and 0.48 s reach):
 * - `hand`: the push's hands flat beside the lower ribs (the owner's call,
 *   §10.4: not gripping the rails, as the physics' push hand does beside the
 *   chest): planted on the deck as the push begins, `ribs` of the way from the
 *   hips to the neck along the lying trunk, `apart` m apart (Borgonovo-Santos
 *   2021: 0.46 m) or `inboard` m in from the rail where the board is narrower,
 *   the wrist `above` m over the deck (the hand's thickness), its back up and
 *   the fingers toward the nose; placed over the push's first `place` s (no
 *   faster than an arm swings, so nothing reads as a jump), coming off the deck
 *   smoothly over the last `lift` of the arm's length as it runs out of reach;
 * - `press`: the chest pushed up by the arms, the hips held low (Rapture's
 *   pop-up: hips down, chest up; Borgonovo-Santos 2021: the elbows from deeply
 *   bent to straight at 80 % of the push): the elbows' included angle from
 *   `elbow`° at `begin` of the push (the hands coming down) to straight by
 *   `straight` of it (eased); the chest's line over the deck solved on the
 *   skeleton so the shoulders are that far from the planted hands, no more than
 *   `lift`° over the physics' own trunk and no lower than it (eased into either
 *   over `liftEase`°: the hips rising over the planted hands would fold the
 *   chest flat; the straight arms lift the hands instead), no faster than
 *   `rate` rad/s (a brisk trunk bend), the lower back lifting `arch` of it
 *   (the arch at the upper back: with no cap it rose to 85° and fell back to
 *   the physics' 27° by the push's end); the hips held where they lay (low and
 *   back), the physics' pelvis
 *   shown from `from` of the push, all of it by the push's end; from `handover`
 *   of the push the trunk hands over to the physics' own by its end, so the
 *   switch to the landing is the physics' (the straight arms lift the hands off
 *   the deck: the reach begins; handing over only from `straight`, the chest
 *   swung 40° in 0.14 s, which an online surfer's 20 Hz poses read as a jump);
 * - `fade`: the lying key pose (the paddle's low chest, the catch's cobra, the
 *   legs together) hands over to the push's own points over its first `fade`
 *   of it ("the chest rises with the push"), and comes back in over the last
 *   `fade` of the lie-down (`recover`: the prone kick-out keeps the physics'
 *   path, the parts together; the plan's §5.15 chest first, then the hands, then
 *   the knees, drawn with the chest leading the physics' trunk down while its
 *   hips stood high, swung the arms through their shoulders at 23–27 rad/s
 *   against 7, and a drawn path for the hands from held out to the rails did
 *   too: tried and not kept);
 * - `touch`: the feet land together at `touch` of the reach, each swung on a
 *   minimum-jerk arc above the deck from where it lay (they never slide along
 *   it), lifted at most `lift` m: the front foot swung through under the body
 *   between the hands, the back foot turned across the stringer; the knees
 *   drive forward and up under the chest (`knee`: their pole from the lying
 *   legs', down `lay` for each of forward, to forward and `drive` up by `up` of
 *   the swing, turning out to the stance's from `out` of it); the relaxed hands
 *   low and forward, `hands` m about the hips (± along the nose, toward the
 *   toes, up) until the knees they frame have planted, each coming there in a
 *   straight line from where the push left it over `armsIn` s;
 * - `settle`: standing, the landing's pose and feet settle into riding's over
 *   this, s (the physics' settle).
 */
export const TAKE_OFF = {
  hand: { ribs: 0.4, apart: 0.46, inboard: 0.02, above: 0.03, place: 0.2, lift: 0.05 },
  press: { elbow: 60, begin: 0.15, straight: 0.8, handover: 0.65, arch: 0.5, lift: 35, liftEase: 5, rate: 5, from: 0.3 },
  fade: 0.4,
  touch: 0.9,
  lift: { front: 0.1, rear: 0.05 },
  knee: { lay: 1, drive: 0.5, up: 0.4, out: 0.5 },
  hands: { nose: 0.15, toes: 0.25, up: -0.25 },
  armsIn: 0.3,
  settle: SETTLE_TIME,
};

/**
 * A lying key pose (the plan's §5.3 and §5.4): the drawn trunk and head on the
 * deck, which the physics' prone points leave open (their chest at 0.18 m and
 * head at 0.32 m over the deck, lifted 10–23°).
 */
export interface LyingPose {
  /**
   * The pelvis' line (the lower back) and the chest's (the upper spine) above
   * the deck, °: the arch at the upper chest only (the plan's §5.3).
   */
  back: number;
  chest: number;
  /** The head's look below the deck's plane, ° (+ down). */
  look: number;
  /** The feet's spread across the stringer, m: the legs together. */
  feet: number;
  /** How far the arm reaches its hand, a share of its length (the drawn arm's `RIG_DETAIL.armReach` cruising). */
  reach: number;
}

/**
 * Paddling, cruising (the plan's §5.3; Sheppard 2013: chest down paddles faster;
 * Rapture's paddle technique): the sternum on the stringer, the chest only
 * slightly lifted (5–15°: the trunk's line reads about 14° with the upper chest
 * at 17°; lower, the shoulders came down to the physics' recovery height and
 * the arm folded tight past them, turning fast enough for a 30 Hz display's
 * smoothing to read the turn as a jump, as in the riding-body plan's step 8),
 * the head neutral with the eyes forward, the legs together (≤ 0.15 m apart)
 * with no kick.
 */
const PADDLE: LyingPose = { back: 4, chest: 17, look: 20, feet: 0.08, reach: 0.97 };
/** The look-up (§5.3): every few strokes the head lifts to scan ahead, the chest a little with it. */
const SCAN: LyingPose = { back: 4, chest: 21, look: -2, feet: 0.08, reach: 0.97 };
/**
 * The catch (§5.4; Rapture, catching unbroken waves): the last explosive full
 * strokes with the head down; on a steep face the chest up in a cobra (20–35°),
 * its depth by the board's nose-down pitch: `CATCH` shallow, `COBRA` steep. The
 * arms reach full (`reach` 1).
 */
const CATCH: LyingPose = { back: 8, chest: 30, look: 30, feet: 0.08, reach: 1 };
const COBRA: LyingPose = { back: 10, chest: 44, look: 32, feet: 0.08, reach: 1 };

export const LYING_POSES = { paddle: PADDLE, scan: SCAN, catch: CATCH, cobra: COBRA } as const;

const blendLying = (a: LyingPose, b: LyingPose, t: number, out: LyingPose): LyingPose => {
  out.back = a.back + (b.back - a.back) * t;
  out.chest = a.chest + (b.chest - a.chest) * t;
  out.look = a.look + (b.look - a.look) * t;
  out.feet = a.feet + (b.feet - a.feet) * t;
  out.reach = a.reach + (b.reach - a.reach) * t;
  return out;
};

const catchPose: LyingPose = { ...PADDLE };

/** The lying pose the water stages' weights ask for: paddling, lifting into the look-up, into the catch (its cobra by the pitch). */
export function lyingPose(weights: WaterWeights, out: LyingPose): LyingPose {
  blendLying(PADDLE, SCAN, weights.scan, out);
  blendLying(CATCH, COBRA, weights.cobra, catchPose);
  return blendLying(out, catchPose, weights.catch, out);
}

/**
 * The lineup sit (the plan's §5.2; a coaching cue, no measured source; Secomb
 * 2015: 53 % of a session is spent stationary): straddling the board, the legs
 * hanging relaxed and slightly apart, the knees about 70°, the torso upright,
 * the hands on the thighs, the head scanning behind.
 * - `hipsOver`: the hips (the hip joints' middle) over the deck, m, along the
 *   board at the middle of the physics' pelvis and torso points (where its prone
 *   body's mass floats the board: the board's trim is the physics' prone one);
 * - `lean`: the trunk from the vertical toward the nose, °, in the world (the
 *   board's roll and pitch move only the legs and hips); `chest` the chest's
 *   further lean;
 * - `thigh`, `shin`: each thigh's way from its hip (out, down, toward the nose),
 *   and each shin's from its knee (out, down, toward the nose), in the board's
 *   frame: the thighs over the rails, the shins hanging in the water;
 * - `hands`: on the thighs, `along` of the way from the hip to the knee, `above`
 *   m over the thigh's line, `inside` m in toward the stringer, within `reach`
 *   of the arm's length (the elbow soft);
 * - `look`: the head's look below the level, °;
 * - `scan`: the head's slow scan (§5.2: ±90° over 4–6 s, timed off the clock with
 *   no noise; a fixed cycle stands in for watching the sets, which the drawn
 *   state does not carry): its yaw, ° (+ toward the body's left), at each key
 *   time, s, over the `cycle`, eased between them; the chest turns `chest` of it.
 */
export const SIT = {
  hipsOver: 0.09,
  lean: 8,
  chest: 4,
  thigh: [0.42, -0.4, 0.8] as const,
  shin: [0.08, -0.96, -0.2] as const,
  hands: { along: 0.72, above: 0.07, inside: 0.02, reach: 0.9 },
  look: 5,
  scan: {
    cycle: 5,
    keys: [[0, 0], [0.8, 0], [1.8, -85], [2.6, -85], [3.8, 70], [4.4, 70], [5, 0]] as readonly (readonly [number, number])[],
    chest: 0.3,
  },
};

/** The scan's yaw at `time` s into the sit, ° (`SIT.scan`): its keys eased between (a smootherstep, no speed at a key). */
export function sitScan(time: number): number {
  const { cycle, keys } = SIT.scan;
  const t = ((time % cycle) + cycle) % cycle;
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, y1] = keys[i];
    const [t0, y0] = keys[i - 1];
    if (t > t1) continue;
    const s = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
    const eased = s * s * s * (s * (6 * s - 15) + 10);
    return y0 + (y1 - y0) * eased;
  }
  return keys[keys.length - 1][1];
}

/**
 * The water stages' weights (`WaterStages`), each 0–1: how far into the lineup
 * sit, the catch and its cobra (by the pitch), and the paddler's look-up.
 */
export interface WaterWeights {
  sit: number;
  catch: number;
  cobra: number;
  scan: number;
}

/**
 * The stages' weights (`StageBlend`), each 0–1: how far the side (in trim and
 * the tube) is backside; how far into the drop; how far into a turn, on which
 * rail (1 the toes', 0 the heels'), and how far the turn is a redirect (the
 * top turn, the snap) rather than a bottom turn, and a redirect low (the
 * cutback); how far into the tube, and the kick-out.
 */
export interface StageWeights {
  backside: number;
  drop: number;
  turn: number;
  rail: number;
  redirect: number;
  cutback: number;
  tube: number;
  kickOut: number;
  /** How far still in the pop-up's landing: 1 landing, easing to 0 over the settle once standing (none for a rider that never landed). */
  landing: number;
}

export const NO_STAGES: Readonly<StageWeights> = { backside: 0, drop: 0, turn: 0, rail: 0, redirect: 0, cutback: 0, tube: 0, kickOut: 0, landing: 0 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpHand = (a: HandOffset, b: HandOffset, t: number, out: HandOffset) => {
  out.nose = lerp(a.nose, b.nose, t);
  out.toes = lerp(a.toes, b.toes, t);
  out.up = lerp(a.up, b.up, t);
};

export function createStandingPose(): StandingPose {
  return structuredClone(TRIM_FRONTSIDE);
}

/** Two poses blended, `t` of the way from `a` to `b`, into `out`. */
export function blendPose(a: StandingPose, b: StandingPose, t: number, out: StandingPose): StandingPose {
  out.foot.front = lerp(a.foot.front, b.foot.front, t);
  out.foot.rear = lerp(a.foot.rear, b.foot.rear, t);
  out.kneeTall = lerp(a.kneeTall, b.kneeTall, t);
  out.rearKneeIn.toward = lerp(a.rearKneeIn.toward, b.rearKneeIn.toward, t);
  out.rearKneeIn.down = lerp(a.rearKneeIn.down, b.rearKneeIn.down, t);
  out.maxDorsiflexion = lerp(a.maxDorsiflexion, b.maxDorsiflexion, t);
  out.hinge.tall = lerp(a.hinge.tall, b.hinge.tall, t);
  out.hinge.deep = lerp(a.hinge.deep, b.hinge.deep, t);
  out.chest = lerp(a.chest, b.chest, t);
  out.hips = lerp(a.hips, b.hips, t);
  out.shoulderDrop = lerp(a.shoulderDrop, b.shoulderDrop, t);
  lerpHand(a.hands.lead, b.hands.lead, t, out.hands.lead);
  lerpHand(a.hands.trail, b.hands.trail, t, out.hands.trail);
  out.elbowMost = lerp(a.elbowMost, b.elbowMost, t);
  out.elbowLeast = lerp(a.elbowLeast, b.elbowLeast, t);
  out.lookPitch = lerp(a.lookPitch, b.lookPitch, t);
  out.gazeDown = lerp(a.gazeDown, b.gazeDown, t);
  out.weight.pivot = lerp(a.weight.pivot, b.weight.pivot, t);
  out.weight.keep = lerp(a.weight.keep, b.weight.keep, t);
  out.weight.most = lerp(a.weight.most, b.weight.most, t);
  out.tiltMost = lerp(a.tiltMost, b.tiltMost, t);
  out.sink = lerp(a.sink, b.sink, t);
  out.reachBend = lerp(a.reachBend, b.reachBend, t);
  out.lookTurn = lerp(a.lookTurn, b.lookTurn, t);
  out.lead.turn = lerp(a.lead.turn, b.lead.turn, t);
  out.lead.raise = lerp(a.lead.raise, b.lead.raise, t);
  out.lead.lift = lerp(a.lead.lift, b.lead.lift, t);
  out.lead.reach = lerp(a.lead.reach, b.lead.reach, t);
  out.lead.hold = lerp(a.lead.hold, b.lead.hold, t);
  out.trail.swing = lerp(a.trail.swing, b.trail.swing, t);
  out.trail.hold = lerp(a.trail.hold, b.trail.hold, t);
  out.alarm = lerp(a.alarm, b.alarm, t);
  out.alarmElbow = lerp(a.alarmElbow, b.alarmElbow, t);
  out.grab.share = lerp(a.grab.share, b.grab.share, t);
  out.grab.rail = lerp(a.grab.rail, b.grab.rail, t);
  out.grab.along = lerp(a.grab.along, b.grab.along, t);
  return out;
}

const turnPose = createStandingPose();
const redirectPose = createStandingPose();
const lowPose = createStandingPose();

/**
 * The standing pose the stages' weights ask for: trim, frontside to backside,
 * then into the drop; into a turn (the bottom turn, or the redirect, low into
 * the cutback, on its rail); then into the tube (by the side) and the kick-out.
 */
export function stagePose(weights: StageWeights, out: StandingPose): StandingPose {
  blendPose(STAGE_POSES.trimFrontside, STAGE_POSES.trimBackside, weights.backside, out);
  blendPose(out, STAGE_POSES.drop, weights.drop, out);
  if (weights.turn > 0) {
    // A bottom turn on the toes' rail is frontside, on the heels' backside; a redirect the other way round.
    blendPose(STAGE_POSES.bottomBackside, STAGE_POSES.bottomFrontside, weights.rail, turnPose);
    blendPose(STAGE_POSES.topFrontside, STAGE_POSES.topBackside, weights.rail, redirectPose);
    blendPose(STAGE_POSES.cutbackFrontside, STAGE_POSES.cutbackBackside, weights.rail, lowPose);
    blendPose(redirectPose, lowPose, weights.cutback, redirectPose);
    blendPose(turnPose, redirectPose, weights.redirect, turnPose);
    blendPose(out, turnPose, weights.turn, out);
  }
  if (weights.tube > 0) {
    blendPose(STAGE_POSES.tubeFrontside, STAGE_POSES.tubeBackside, weights.backside, turnPose);
    blendPose(out, turnPose, weights.tube, out);
  }
  if (weights.kickOut > 0) blendPose(out, STAGE_POSES.kickOut, weights.kickOut, out);
  if (weights.landing > 0) blendPose(out, STAGE_POSES.landing, weights.landing, out);
  return out;
}

/** Every key pose, for tests that set a part of the stance on all of them. */
export const KEY_POSES: readonly StandingPose[] = Object.values(STAGE_POSES);

/** Sets `change` on every key pose; returns what puts them back (tests that switch a part of the stance off). */
export function onEveryPose(change: (pose: StandingPose) => void): () => void {
  const saved = KEY_POSES.map((pose) => structuredClone(pose));
  KEY_POSES.forEach(change);
  return () => KEY_POSES.forEach((pose, i) => Object.assign(pose, structuredClone(saved[i])));
}
