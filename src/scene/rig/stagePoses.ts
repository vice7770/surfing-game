/**
 * The animation-realism plan's key poses (docs/superpowers/plans/2026-10-22-animation-realism.md,
 * §5): what the drawn rider's shape is at each stage, frontside and backside,
 * as data the rig takes for its targets. The physics still sets the depth, the
 * weight, the lean, the twist, the alarm and the reach; a key pose sets what
 * the physics leaves open (the feet's angles, the knees standing tall, the
 * rear knee caving in, the hinge, where the chest and hips face, the shoulder
 * drop, the relaxed hands, the gaze's pitch). Goofy mirrors Regular. Phase 1:
 * the global stance, trim frontside and backside, and the drop; the stage
 * reader (`stageBlend.ts`) blends them.
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
  hands: { lead: { nose: 0.05, toes: 0.1, up: 0 }, trail: { nose: 0.02, toes: 0.2, up: 0.02 } },
  elbowMost: 150,
  elbowLeast: 115,
  lookPitch: 30,
  gazeDown: 0,
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
  hinge: { tall: 42, deep: 50 },
  chest: 55,
  hips: 25,
  hands: { lead: { nose: 0.04, toes: 0.08, up: 0 }, trail: { nose: -0.02, toes: 0.16, up: 0.02 } },
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
  hands: { lead: { nose: 0.1, toes: 0.08, up: -0.04 }, trail: { nose: 0.02, toes: 0.04, up: -0.1 } },
  elbowMost: 158,
  lookPitch: 40,
  gazeDown: 15,
  // The owner's call (§10.2): the drop's weight on the back foot (55–60 %: the hips at 0.40–0.45).
  weight: { pivot: 0.38, keep: 0.2, most: 0.1 },
};

export const STAGE_POSES = { trimFrontside: TRIM_FRONTSIDE, trimBackside: TRIM_BACKSIDE, drop: DROP } as const;

/** The stages' weights (`StageBlend`): how far the side is backside, 0–1, and how far into the drop. */
export interface StageWeights {
  backside: number;
  drop: number;
}

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
  return out;
}

/** The standing pose the stages' weights ask for: trim, frontside to backside, then into the drop. */
export function stagePose(weights: StageWeights, out: StandingPose): StandingPose {
  blendPose(STAGE_POSES.trimFrontside, STAGE_POSES.trimBackside, weights.backside, out);
  return blendPose(out, STAGE_POSES.drop, weights.drop, out);
}

/** Every key pose, for tests that set a part of the stance on all of them. */
export const KEY_POSES: readonly StandingPose[] = Object.values(STAGE_POSES);

/** Sets `change` on every key pose; returns what puts them back (tests that switch a part of the stance off). */
export function onEveryPose(change: (pose: StandingPose) => void): () => void {
  const saved = KEY_POSES.map((pose) => structuredClone(pose));
  KEY_POSES.forEach(change);
  return () => KEY_POSES.forEach((pose, i) => Object.assign(pose, structuredClone(saved[i])));
}
