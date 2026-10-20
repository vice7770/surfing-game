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
 * hips) is the rig's (`RIG_DETAIL.cascade`), read from the yaw rate.
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

export const STAGE_POSES = {
  trimFrontside: TRIM_FRONTSIDE, trimBackside: TRIM_BACKSIDE, drop: DROP,
  bottomFrontside: BOTTOM_FRONTSIDE, bottomBackside: BOTTOM_BACKSIDE, topFrontside: TOP_FRONTSIDE, topBackside: TOP_BACKSIDE,
  cutbackFrontside: CUTBACK_FRONTSIDE, cutbackBackside: CUTBACK_BACKSIDE, tubeFrontside: TUBE_FRONTSIDE, tubeBackside: TUBE_BACKSIDE,
  kickOut: KICK_OUT,
} as const;

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
}

export const NO_STAGES: Readonly<StageWeights> = { backside: 0, drop: 0, turn: 0, rail: 0, redirect: 0, cutback: 0, tube: 0, kickOut: 0 };

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
