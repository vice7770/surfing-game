import { Quaternion, Vector3, type Bone } from 'three';
import { ArmSwing, armPendulum } from './armSwing';
import { Breathing } from './breathing';
import { Follower, balanceAlarmOf, type DrawnCues } from './causeFilter';
import { BONES, MIDDLE_FINGER, REQUIRED_BONES, type Side } from './humanoidBones';
import { orientBone } from './orientBone';
import { STANDING_PELVIS } from './posturePoints';
import { POINT, type RiderVisualState } from './riderVisualState';
import { BOARD_CENTRE, deckAt, railHalfWidth } from './boardDeck';
import { StageBlend } from './stageBlend';
import { TURN_FULL, stanceBlend, weightBack, type StanceBlend } from './stanceBlend';
import { createStandingPose, stagePose, type HandOffset, type StageWeights, type StandingPose } from './stagePoses';
import { solveTwoBone } from './twoBoneIk';

const SIDES: readonly Side[] = ['left', 'right'];
/** The bind pose faces +z with +y up (glTF from Blender's −Y forward). */
const REST_FORWARD = new Vector3(0, 0, 1);
const REST_BACK = new Vector3(0, 0, -1);
const REST_UP = new Vector3(0, 1, 0);
const WORLD_UP = new Vector3(0, 1, 0);

/**
 * `value` brought smoothly under `cap`: unchanged up to `band` below it, then
 * slowing at a steady rate to stop at the cap `band` past it (a hard stop kinks
 * the motion, which the smoothing layer takes for a jump).
 */
function softCap(value: number, cap: number, band: number): number {
  const start = cap - band;
  if (value <= start) return value;
  const past = Math.min(value - start, 2 * band);
  return start + past - (past * past) / (4 * band);
}

/** A driven bone's rest data: its axis toward its child and a body direction, both in its own frame. */
interface Rest {
  bone: Bone;
  axis: Vector3;
  hint: Vector3;
}

/**
 * The code-driven layer: what the physics does not say about the body (art
 * direction from surf photography, not measured). Angles in degrees.
 */
export const RIG_DETAIL = {
  /**
   * The stance's own numbers (the feet's angles, the knees standing tall, the
   * rear knee caving in, the hinge, where the hips and chest face, the shoulder
   * drop, the relaxed hands, the gaze's pitch, the ankle's reach) are the key
   * poses' (`stagePoses.ts`, the animation-realism plan), blended by the stages
   * read from the drawn state (`stageBlend.ts`). The hips and chest turn toward
   * the nose less as the weight goes back.
   *
   * Standing, a free arm (its hand not reaching down) takes the key pose's
   * relaxed hand over the physics' held-out hand, by `share` (the owner's
   * reference of 2026-10-22: hanging relaxed and close in, framing the knees).
   * In a redirect the trailing arm swings up toward the key pose's `trail.swing`°
   * from the trunk's down (45° at most: the animation-realism plan's phase 2,
   * the arms at chest height or below; the Bali camp's swung-around arm at 100°
   * drew an airplane), the elbow at `elbow`° (Kerr's drop: 150–160°). Losing balance
   * (step 5), the free arms go out toward `alarmElevation`° and straighten toward
   * `alarmElbow`° with the physics' alarm (`balanceAlarm`): outstretched arms
   * steady a challenging stance (Patel et al. 2014, Neurosci Lett 579: 97–100),
   * and restricting them impairs side-to-side balance (Objero et al. 2019, Gait
   * Posture 74: 71–75). `alarmShare` of it (0 in tests that read the arms without it), and `pointShare` of
   * the leading arm's pointing (`StandingPose.lead`'s lift and hold; 0 in tests that read the arms as phase 1 drew
   * them, at the knee).
   * The alarm moves the arms only for a real threat (the animation-realism plan's
   * §4): under `alarmDeadband` it counts as none (the rest rescaled, so a full
   * alarm still spreads them fully), and it rises within `alarmRise` s and falls
   * within `alarmFall` s (one pole each way, at a third of that: 95 %), so a
   * pump's dips and the margin's flutter do not lift the arms. The physics
   * smooths its margin over 0.1 s only.
   */
  arms: {
    share: 1, elbow: 155, alarmElevation: 90, alarmElbow: 175, alarmShare: 1, pointShare: 1,
    alarmDeadband: 0.25, alarmRise: 0.25, alarmFall: 0.6,
  },
  /**
   * Standing, a free hand swings with the body (step 4, `armSwing.ts`): a mass on
   * a critically damped spring about its cued place, at the arm's own pendulum
   * (Winter 2009's segments on the skeleton's arm, the hand taken as 0.74 of the
   * forearm: Drillis & Contini's 0.108 H to 0.146 H), so the body's pump and
   * turns leave it behind for a moment (Pontzer et al. 2009: the arms as passive
   * mass dampers). `share` of it (0 in tests that hold the arms to their cues);
   * within `most`° of the cued direction from the shoulder (provisional). The
   * animation-realism plan (§4) keeps a third of it, within 15°: landings and
   * big hits still swing the hands, the turns' and pumps' flop (11.7 and 9.0 cm
   * RMS pumping) read as arms moving with no intent.
   */
  swing: { share: 0.35, most: 15 },
  /**
   * The chest breathes (step 4, `breathing.ts`): the upper spine turns back and
   * forth about the body's left, its two bones taking half each, faster and
   * deeper with the physics' work; the neck and head keep their world directions.
   * `share` of it (0 in tests that hold the chest still).
   */
  breath: { share: 1 },
  /**
   * Standing, a clavicle follows its arm (step 3): lifting a `ratio` of the
   * arm's rise from the trunk's down above `from`° (the scapulohumeral rhythm,
   * Inman et al. 1944: about 2:1, the arm to the shoulder blade), and swinging
   * forward up to `protract`° as the arm reaches forward; `share` of it.
   */
  clavicle: { share: 1, from: 30, ratio: 1 / 3, protract: 15 },
  /** Standing elbows drop below the line from shoulder to hand, a little behind it. */
  elbowDrop: 1,
  elbowBack: 0.3,
  /** Finger curl: relaxed, and cupped while stroking. */
  fingerCurlRelaxed: 12,
  fingerCurlStroke: 32,
  /** A fallen limb reaches this share of its length through its centre point. */
  fallenReach: 0.92,
  /**
   * Legs stop this short of straight when the hips come down to reach the feet:
   * a knee at about 160°, soft, never locked (de Sousa 2022: 150° or more
   * extending; SurfDeeper: avoid locking out; at 0.97 the rig stopped it at 152°,
   * the stance map's finding). Arms reach `armReach`.
   */
  legReach: 0.985,
  /**
   * The legs come to their reach smoothly over this share of their length each
   * side of it (`softCap`): a hard stop kinked the knee's motion, which the
   * smoothing layer took for a jump and eased the leg off its foot (a pump's
   * rear foot slid 13 cm; it still slid at 0.015). The narrowest that held the
   * pump's feet, so standing tall gives up least (trim-back's front knee 159° →
   * 154.5° on the test humanoid).
   */
  legEase: 0.025,
  armReach: 0.97,
  /**
   * Lying, the arms come to their reach smoothly over this share of their length
   * each side of it (`softCap`; step 8). The paddle's hand is out of the drawn
   * arm's reach through most of the pull: at a hard stop the elbow snapped from
   * straight to 150° in a frame each time the hand came within it (four times a
   * stroke), which the smoothing took for jumps. The hand moves at up to 4.4 m/s,
   * so the band is wider than the legs'.
   */
  armEase: 0.1,
  /**
   * Standing, the trunk hinges at the hips toward the toes (the riding-body plan,
   * step 3): forward from the physics' trunk by the key pose's `hinge`, from
   * `tall` standing tall to `deep` at the crouch's full depth, blended by the
   * depth. The pelvis moves back along the level as the upper body comes
   * forward, as far as keeps the body's centre of mass where the unhinged body
   * has it (Winter 2009's segment shares, on the body the legs and the physics'
   * hands give). At most `hingeMost`°. Until the animation-realism plan it
   * hinged to a hip angle instead: the pelvis's way back undid most of each
   * degree, so the solved hinge moved ten times the legs' motion (the board's
   * wobble, 1.3° of the chest's 1.9° mid-turn) and its own tolerance.
   */
  hingeMost: 80,
  /**
   * The hinge stops where the trunk is the key pose's `tiltMost`° from the
   * world's vertical, the lean into a turn included (72° riding: the map's
   * Compress read 45–75° from pictures, and held longer the trunk had folded
   * past horizontal, the head below the hips; the bottom turn's 55°: the plan's
   * 40–60°), easing into it over `tiltEase`° (`softCap`).
   */
  tiltEase: 3,
  /**
   * The hinge swings no faster than this, rad/s: a brisk trunk bend. A full
   * Compress drops the hips in about 0.2 s, a swing of about 2.5 rad/s; faster
   * is the physics' posture jumping in a step (the body thrown off the board),
   * which the drawn trunk takes over the next frames.
   */
  hingeRate: 4,
  /**
   * The hinge and the spine's bend toward a reaching hand follow their solved
   * angles at `omega`, rad/s, critically damped (the animation-realism plan's
   * §4: the motion filter): both are solved afresh each frame from the legs on
   * the rolling board and the hand on the water, and drew the board's 3–5 Hz
   * wobble into the chest (1.3° and 0.9° RMS of its 1.9° mid-turn). At 12 rad/s
   * they pass 0.19× at 4 Hz and 0.78× at a pump's 1 Hz. The bend reaches for
   * the hand `bendSlack` of the arm short of its reach, so the elbow, not the
   * spine, takes what the follower holds back.
   */
  trunkFollow: { omega: 12, bend: 6, ankles: 8, bendSlack: 0.015, hingeSwing: 5 },
  /**
   * Turning backside, the trunk bends over the toes no further than this, °, on
   * the deck, blended in by the turn: the middle of the map's ±20° (Hobgood: the
   * backside bottom turn rotated with the hips rather than leaning over), the
   * inside hand reaching the water on the heels' side. Not in a redirect (the
   * stage reader's): the frontside top turn is on the heels' rail too.
   */
  backsideLean: 0,
  /**
   * Standing, the head looks where the board goes: along its travel, led into a
   * turn by the turn over `lookAhead`, s, within `neckTurn` of the chest, and
   * pitched down the face or up it by the climb against the speed, within the
   * key pose's `lookPitch` (de Sousa 2022: the head toward the lip in the bottom turn; the
   * stance map: 0.4 s left it at 75° from the toes in Compress, the lip within 70°).
   * The motion filter (the animation-realism plan's §4) holds the gaze steady
   * in the world (Pozzo et al. 1990: the head held toward the horizon while the
   * body moves): its heading, past the neck's reach, and its pitch follow at
   * `gazeFollow` rad/s, critically damped (0.25 s behind, 0.09× at 4 Hz), so
   * neither the board's yaw wobble (through the yaw rate, or the chest's facing
   * at the neck's reach) nor its heave over chop turns or nods it. The lead is
   * longer by the heading's lag, so a steady turn is still looked into 0.6 s
   * ahead (0.6 s before). Within `neckTurn`° of the chest: the neck's axial
   * rotation, about 80–90° (the backside bottom turn's look over the front
   * shoulder, 100–140° from the toes with the shoulders square, needs its
   * last degrees). Where the key pose looks further into a turn than the yaw
   * rate's lead (`StandingPose.lookTurn`: a redirect's destination), the pose's
   * lead stands in for it.
   */
  lookAhead: 0.85,
  neckTurn: 90,
  gazeFollow: 8,
  /**
   * The anticipation cascade (the animation-realism plan's §3.2 and phase 2;
   * WSL flow: turns unwind head → shoulders → hips → board; the owner's reel,
   * step 4: the head is the steering wheel): each part is turned into the turn
   * ahead of the board by what the board turns over its lead, s, at the yaw
   * rate (the motion filter's, second order): the head by the look's 0.6 s
   * (`lookAhead` less its follow), the chest by `chest`, the hips by `hips`, so
   * each comes round before the next (their world turn rates peak 0.1–0.35 s
   * apart). The chest and hips within `twistMost`° of where the key pose has
   * them, each followed, critically damped (the key poses' own turns come in by
   * the stage weights): the chest at `chestFollow` rad/s, the hips at
   * `hipsFollow` (0.5 s and 0.71 s behind; the gaze's 0.25 s), the neck's reach
   * counted from where the chest is turning to, so the head turns first: in a
   * cutback the head's world turn rate peaks 0.1–0.25 s before the chest's,
   * the chest's 0.1–0.3 s before the hips'; the pad's twist (the movement-flow spec) turns the head and the chest
   * at once and the hips by `hipsTwist` of it. This replaces the instant
   * proportional twist (the chest by 0.25 s of the turn and the hips by a third
   * of that, together) and the snap's extra 45°: the redirect's key poses turn
   * the shoulders back to the pocket.
   */
  cascade: { chest: 0.3, hips: 0.12, hipsTwist: 0.35, twistMost: 45, chestFollow: 4, hipsFollow: 2.8 },
  /**
   * Anticipating the redirect (the owner's reel, steps 5 and 6: climbing with
   * the weight going back, at three quarters of the face already look where you
   * go next): the look turned up to `look`° toward the redirect's way (frontside
   * the heels', backside the toes') by the climb, from `climbFrom` to
   * `climbFull` m/s, times the weight back (`weightBack`); none in the kick-out.
   */
  anticipate: { look: 30, climbFrom: 0.3, climbFull: 1.2 },
  /**
   * The pump's arms (the plan's §5.13; Rapture, compression and extension:
   * small arm motions in time, pushing down, never rising): the free arms'
   * elevation lowered by `gain`°/(m/s) of the pelvis's rise over the deck (pushing
   * down as the body extends), within `most`° (the hands' swing pumping stays
   * under the motion filter's 4 cm), none as it drops (a compression
   * lifting them read as the alarm); the rise read through a critically damped
   * follower at `follow` rad/s (the motion filter's pelvis passes the ~1 Hz pump).
   */
  pump: { gain: 7, most: 4, follow: 16 },
  /**
   * The lead shoulder drawn at least the key pose's `shoulderDrop` below the
   * trailing one against the level, as a picture shows it (the plan's phase 1
   * left it 9–16° high: the chest turned toward the nose and hinged over the
   * toes about the feet's line raises it): the upper spine bent toward the nose
   * within `pitch`°, then sideways about where the chest faces within `side`°,
   * as far as brings it there, each followed at `follow` rad/s; never bent the
   * other way (a lean that drops it further is left).
   */
  shoulderBend: { pitch: 8, side: 22, follow: 6 },
  /**
   * Standing, in a turn the leading arm (the front foot's side) points (the
   * plan's §3.2: arms as pointer): toward where the head looks, blended in by
   * the turn over `armLeadRate`, rad/s, within the key pose's `lead.turn`° of
   * its relaxed hand's heading, raised `lead.lift` of the way to its
   * `lead.raise`° (de Sousa 2022: the leading arm toward the lip; the owner's
   * reel, step 7: the leading hand dropped at the top), at no more than
   * `leadReach` of the arm where it does not lift (its elbow bent), the key
   * pose's `lead.reach` where it does. A hand reaching down past
   * the hips (E's, or Compress's inside hand) is the physics' own: the spine
   * bends toward it, in the plane of the shoulder and the hand, up to
   * `reachBend`° (folding forward over the toes frontside: the reference's hips
   * flexed to 90° or less), until the arm reaches. The bend comes in, and the
   * leading arm hands over to the physics' hand, over the first `reachFade` m
   * below the hips (the riding-body plan: at once, the chest turned 58° in a
   * frame), and in time over `reachHandover` s.
   */
  armLeadRate: TURN_FULL,
  leadReach: 0.9,
  /**
   * The arms' share of the turn (the leading arm's reach, the trailing arm's
   * swing) follows the turn no faster than this, per second: a full swing in a
   * quarter second, the pace of the hinge's Compress. Read straight from the yaw
   * rate the arm whipped 150° in 0.12 s as a weave reversed (step 3's review);
   * step 4's secondary motion is the fuller answer.
   */
  armRate: 4,
  /**
   * It lets go of the turn no faster than this, per second: through a rail
   * change the yaw rate passes through none, and the pointing arm dropped to the
   * knee and rose again between the turns (a weave's hands bobbed 6 cm).
   */
  armFall: 1.5,
  reachBend: 60,
  reachFade: 0.1,
  reachHandover: 0.25,
  /** The tube's grabbing wrist over its rail's edge, m (the hand's thickness on the rail). */
  grabAbove: 0.035,
  /**
   * The wipeout spec. Ducking, the head tucks down toward the deck and the arms
   * straighten onto the rails (the hands slide along the rail to an arm's
   * reach). Swimming, the arms crawl round the shoulders at `crawlRate` strokes a
   * second each, alternating, `crawlReach` of the arm out, and the feet flutter
   * `kick` m at `kickRate` a second.
   */
  duckArmReach: 0.97,
  /**
   * The crawl's arm cycles a second: an adult's at 1.0 m/s (Kjendlie et al.
   * 2004: 0.38 ± 0.04), the physics' swimmer's own speed (step 8; it drew 0.8).
   */
  crawlRate: 0.38,
  /**
   * Swimming, the body's roll about its spine, degrees (step 8): at most `away`
   * toward the side the swimmer does not breathe to and `breath` toward the side
   * it does (Payton et al. 1999: 57 ± 4° and 66 ± 5° at race pace), breathing
   * each cycle to its right (provisional: a recreational swimmer's habit); the
   * hips roll `hips` as far (Barden and Barber 2022: 45–54° at the hips).
   */
  crawlRoll: { away: 57, breath: 66, hips: 0.8 },
  /**
   * Lying, the elbow's side through the paddle stroke (step 8): high, out and
   * trailing the hand, as a paddler's high elbow. The arm sweeps forward, down
   * under the shoulder and back to the hip, then forward again out beside the
   * shoulder: this stays 36° or more off every way it points. An elbow pointing
   * up met the arm head on under the shoulder, one pointing out beside it, and
   * each flipped the elbow in a frame.
   */
  strokeElbow: { out: 1, up: 1, forward: -1 },
  /**
   * Lying, the hand's back through the stroke (step 8): up, out and toward the
   * nose, so the palm pushes back while pulling and faces the water swinging
   * forward, 36° or more off the forearm's every way. The deck's normal, falling
   * back to the chest's facing (the deck, lying), spun the hand half a turn as
   * the forearm passed under the shoulder.
   */
  strokeHand: { out: 1, up: 1, forward: 1 },
  /** Short of breath the crawl quickens, up to (1 + `panic`) times at none (Part B's body cue). */
  panic: 1,
  crawlReach: 0.85,
  kick: 0.15,
  kickRate: 2,
};

/**
 * Poses a Mixamo-named skeleton from a `RiderVisualState` each frame: the hips
 * at the pelvis point, the spine toward the torso and head points, and the
 * limbs to the hand and foot points by two-bone IK, with `RIG_DETAIL` choosing
 * what the physics leaves open. Only rotations change (and the hips' place),
 * so no bone ever stretches.
 */
export class HumanoidRig {
  /** World joint positions after `solve`. */
  readonly joints = {
    hip: { left: new Vector3(), right: new Vector3() },
    knee: { left: new Vector3(), right: new Vector3() },
    ankle: { left: new Vector3(), right: new Vector3() },
    shoulder: { left: new Vector3(), right: new Vector3() },
    elbow: { left: new Vector3(), right: new Vector3() },
    wrist: { left: new Vector3(), right: new Vector3() },
  };
  /** Where the chest faces after `solve`. */
  readonly facing = new Vector3();
  /** Swimming, the facing before the crawl's roll, the head's share of the roll, rad, and the rolled body's back (step 8). */
  private readonly swimFacing = new Vector3();
  private headRoll = 0;
  private readonly crawlBack = new Vector3();
  /** Standing, where the head looks after `solve` (unit). */
  readonly look = new Vector3();
  /** The ankle's height above the sole at rest (MPFB stands the body on y = 0), m. */
  readonly soleHeight: number;
  /** From the ankle to mid-foot along the foot, m. */
  readonly heelToMidfoot: number;
  readonly legLength: number;
  readonly armLength: number;
  private readonly rest = new Map<string, Rest>();
  private readonly upperLeg: number;
  private readonly lowerLeg: number;
  private readonly upperArm: number;
  private readonly lowerArm: number;
  /** At rest, how far the hip joints sit below the hips bone and out from it, m. */
  private readonly hipDrop: number;
  private readonly hipHalfWidth: number;
  /** The foot's rest pitch: how far the ball sits below and ahead of the ankle. */
  private readonly footDrop: number;
  private readonly footRun: number;
  private readonly fingerRests = new Map<Bone, Quaternion>();
  /** The clavicles' and toes' rest turns against their parents: where they return when not driven. */
  private readonly localRests = new Map<Bone, Quaternion>();
  /** Standing, the free arms' elevation turned by the pump this solve, rad (`RIG_DETAIL.pump`), and the pelvis's height over the deck followed for its rise. */
  private pumpLift = 0;
  private readonly riseFollower = new Follower(RIG_DETAIL.pump.follow);
  /** The shoulder drop's bends, rad, followed (`RIG_DETAIL.shoulderBend`): sideways, and toward the nose. */
  private readonly dropFollower = new Follower(RIG_DETAIL.shoulderBend.follow);
  private readonly pitchFollower2 = new Follower(RIG_DETAIL.shoulderBend.follow);
  /** The anticipation cascade's chest and hips, ° toward the nose from the toes, followed (`RIG_DETAIL.cascade`). */
  private readonly chestFollower = new Follower(RIG_DETAIL.cascade.chestFollow);
  /** Where the chest is turning to this solve (its target, before it follows): the neck's reach is the head's from there, so the head leads. */
  private readonly chestAim = new Vector3();
  private readonly aimFollower = new Follower(RIG_DETAIL.gazeFollow);
  /** The chest's line this solve (the upper spine, bent for the lead shoulder's drop): the free arms spread from its down. */
  private readonly chestLine = new Vector3(0, 1, 0);
  private readonly hipsFollower = new Follower(RIG_DETAIL.cascade.hipsFollow);
  /** Standing, how far the trunk hinges forward at the hips this solve, rad (step 3), and at which clock. */
  private hingeAngle = 0;
  private hingeClock = Number.NaN;
  /** Standing, the arms' share of the turn this solve, 0 to 1 (`armRate`), and at which clock. */
  private armTurn = 0;
  /** Standing, how near the physics says the rider is to letting go, 0 (at ease) to 1, this solve (step 5), past its deadband and smoothed, and at which clock. */
  private alarm = 0;
  private alarmClock = Number.NaN;
  private armClock = Number.NaN;
  /** The motion filter's followers in the rig (`trunkFollow`, `gazeFollow`): the hinge's angle, the reach bend's turn (on the board's levelled frame), the gaze's pitch and heading. */
  private readonly hingeFollower = new Follower(RIG_DETAIL.trunkFollow.omega);
  private readonly roomFollower = new Follower(RIG_DETAIL.trunkFollow.omega);
  private readonly tallFollower = new Follower(RIG_DETAIL.trunkFollow.hingeSwing);
  private readonly deepFollower = new Follower(RIG_DETAIL.trunkFollow.hingeSwing);
  private readonly bendFollower = [0, 1, 2].map(() => new Follower(RIG_DETAIL.trunkFollow.bend));
  private readonly pitchFollower = new Follower(RIG_DETAIL.gazeFollow);
  private readonly yawFollower = new Follower(RIG_DETAIL.gazeFollow);
  private readonly blend: StanceBlend = { stance: 'regular', depth: 0, turn: 0, back: 0 };
  /** Upright, the stages read from the drawn state (`stageBlend.ts`) and the key pose they blend (`stagePoses.ts`), this solve. */
  private readonly stages = new StageBlend();
  /** The stages' weights this solve (read only: for tests and the dev views). */
  get stageWeights(): Readonly<StageWeights> {
    return this.stages.weights;
  }
  /** The alarm the free arms show this solve, 0–1, past its deadband and smoothed (read only: for tests). */
  get alarmShown(): number {
    return this.alarm;
  }
  readonly pose: StandingPose = createStandingPose();
  /** The knees about the hips on the board's levelled frame, followed (the relaxed hands frame them without the board's wobble). */
  private readonly kneeFollowers: Record<Side, Follower[]> = {
    left: [0, 1, 2].map(() => new Follower(RIG_DETAIL.trunkFollow.omega)),
    right: [0, 1, 2].map(() => new Follower(RIG_DETAIL.trunkFollow.omega)),
  };
  private readonly calmKnee = { left: new Vector3(), right: new Vector3() } as Record<Side, Vector3>;
  private readonly ankleFollowers: Record<Side, Follower[]> = {
    left: [0, 1, 2].map(() => new Follower(RIG_DETAIL.trunkFollow.ankles)),
    right: [0, 1, 2].map(() => new Follower(RIG_DETAIL.trunkFollow.ankles)),
  };
  private readonly kneeSquare = new Vector3();
  private readonly kneeNose = new Vector3();
  private readonly relaxedAt = new Vector3();
  private readonly spreadAt = new Vector3();
  private readonly handNose = new Vector3();
  private readonly handToes = new Vector3();
  private readonly handScratch = new Vector3();
  private readonly leadAim = new Vector3();
  /** Each hand's reach down this solve, handed over at `reachHandover` (`followReach`), and at which clock. */
  private readonly reaching: Record<Side, number> = { left: 0, right: 0 };
  private reachClock = Number.NaN;
  /** The body's line this solve, before the hinge: the physics' trunk, followed; and less its pitch along the board (the standing lift's). */
  private readonly bodyUp = new Vector3();
  private readonly liftUp = new Vector3();
  private readonly bodyNose = new Vector3();
  private readonly leadLevel = new Vector3();
  /** The skeleton's trunk at rest: the hips bone to the spine's base, the spine's base to the neck, the neck to the head, m. */
  private readonly spineBase: number;
  private readonly trunkLength: number;
  private readonly neckLength: number;
  private readonly unhinged = { up: new Vector3(), hipsForward: new Vector3(), facing: new Vector3(), hips: new Vector3(), chestUp: new Vector3(), mass: new Vector3() };
  private readonly mass = {
    sum: new Vector3(), point: new Vector3(), body: new Vector3(), spine: new Vector3(), neck: new Vector3(), hip: new Vector3(), modelHip: new Vector3(), knee: new Vector3(), ankle: new Vector3(), pole: new Vector3(),
  };
  /** Where the knees bend toward standing: the chest's facing before the trunk hinges. */
  private readonly kneeFacing = new Vector3();
  private readonly levelForward = new Vector3();
  /** This solve's ankle targets and knee poles, for the hinge's model (they do not change as the trunk hinges). */
  private readonly legAim = {
    ankle: { left: new Vector3(), right: new Vector3() } as Record<Side, Vector3>,
    pole: { left: new Vector3(), right: new Vector3() } as Record<Side, Vector3>,
  };
  /** Standing, the free hands' swing (step 4). */
  private readonly swing: ArmSwing;
  /** The chest's breathing (step 4), and turning scratch. */
  private readonly breathing = new Breathing();
  private readonly turnWorld = new Quaternion();
  private readonly turnBy = new Quaternion();
  private readonly turnParent = new Quaternion();
  private readonly aimFrom = new Vector3();
  private readonly aimTo = new Vector3();
  private readonly handHint = new Vector3();
  private readonly legAnkle = new Vector3();
  // Scratch, one per role so helpers never share one.
  private readonly up = new Vector3();
  private readonly forward = new Vector3();
  private readonly left = new Vector3();
  private readonly boardUp = new Vector3();
  private readonly boardForward = new Vector3();
  private readonly chestUp = new Vector3();
  private readonly hipsForward = new Vector3();
  private readonly target = new Vector3();
  private readonly hipsAt = new Vector3();
  private readonly bendAxis = new Vector3();
  private readonly pivot = new Vector3();
  private readonly strokeOffset = new Vector3();
  private readonly pole2 = new Vector3();
  private readonly headHint = new Vector3();
  private readonly chestBase = new Vector3();
  private readonly pole = new Vector3();
  private readonly direction = new Vector3();
  private readonly hint = new Vector3();
  private readonly footDirection = new Vector3();
  private readonly scratch = new Vector3();
  private readonly nose = new Vector3();
  private readonly bend = new Vector3();
  private readonly middle = new Vector3();
  private readonly turn = new Quaternion();
  private readonly curl = new Quaternion();
  private readonly xAxis = new Vector3(1, 0, 0);

  constructor(private readonly bones: ReadonlyMap<string, Bone>) {
    const missing = REQUIRED_BONES.filter((name) => !bones.has(name));
    if (missing.length) throw new Error(`The surfer's skeleton lacks ${missing.join(', ')}`);
    bones.get(BONES.hips)!.updateMatrixWorld(true);
    const world = (name: string) => bones.get(name)!.getWorldPosition(new Vector3());
    const capture = (name: string, toward: Vector3 | string, hintWorld: Vector3) => {
      const bone = bones.get(name)!;
      const inverse = bone.getWorldQuaternion(new Quaternion()).invert();
      const axis = typeof toward === 'string' ? world(toward).sub(world(name)) : toward.clone();
      this.rest.set(name, { bone, axis: axis.applyQuaternion(inverse).normalize(), hint: hintWorld.clone().applyQuaternion(inverse) });
    };
    capture(BONES.hips, BONES.spine[0], REST_FORWARD);
    capture(BONES.spine[0], BONES.spine[1], REST_FORWARD);
    capture(BONES.spine[1], BONES.spine[2], REST_FORWARD);
    capture(BONES.spine[2], BONES.neck, REST_FORWARD);
    capture(BONES.neck, BONES.head, REST_FORWARD);
    capture(BONES.head, REST_UP, REST_FORWARD);
    for (const side of SIDES) {
      capture(BONES.upLeg[side], BONES.leg[side], REST_FORWARD);
      capture(BONES.leg[side], BONES.foot[side], REST_FORWARD);
      capture(BONES.foot[side], BONES.toe[side], REST_UP);
      capture(BONES.shoulder[side], BONES.arm[side], REST_UP);
      capture(BONES.toe[side], REST_FORWARD, REST_UP);
      for (const name of [BONES.shoulder[side], BONES.toe[side]]) this.localRests.set(bones.get(name)!, bones.get(name)!.quaternion.clone());
      // Elbows point backward at rest.
      capture(BONES.arm[side], BONES.foreArm[side], REST_BACK);
      capture(BONES.foreArm[side], BONES.hand[side], REST_BACK);
      capture(BONES.hand[side], BONES.fingers[side][MIDDLE_FINGER][0], REST_UP);
      for (const finger of BONES.fingers[side]) {
        for (const name of finger) {
          const bone = bones.get(name);
          if (bone) this.fingerRests.set(bone, bone.quaternion.clone());
        }
      }
    }
    this.upperLeg = world(BONES.leg.left).distanceTo(world(BONES.upLeg.left));
    this.lowerLeg = world(BONES.foot.left).distanceTo(world(BONES.leg.left));
    this.upperArm = world(BONES.foreArm.left).distanceTo(world(BONES.arm.left));
    this.lowerArm = world(BONES.hand.left).distanceTo(world(BONES.foreArm.left));
    this.legLength = this.upperLeg + this.lowerLeg;
    const hips = world(BONES.hips);
    const hip = world(BONES.upLeg.left);
    this.hipDrop = hips.y - hip.y;
    this.hipHalfWidth = Math.hypot(hip.x - hips.x, hip.z - hips.z);
    this.armLength = this.upperArm + this.lowerArm;
    const ankle = world(BONES.foot.left);
    const ball = world(BONES.toe.left);
    this.soleHeight = ankle.y;
    this.spineBase = world(BONES.spine[0]).distanceTo(hips);
    this.trunkLength = world(BONES.neck).distanceTo(world(BONES.spine[0]));
    this.swing = new ArmSwing(armPendulum(this.upperArm, this.lowerArm, 0.74 * this.lowerArm), Math.PI);
    this.neckLength = world(BONES.head).distanceTo(world(BONES.neck));
    this.footDrop = ankle.y - ball.y;
    this.footRun = Math.hypot(ball.x - ankle.x, ball.z - ankle.z);
    this.heelToMidfoot = this.footRun / 2;
  }

  /** The crawl's phase, in strokes, and the clock it was advanced to. */
  private crawlPhase = 0;
  private crawlClock = Number.NaN;

  /**
   * Poses the skeleton from `state`. `cues`: what the motion filter read from
   * the physics' own points before it moved them (`PosedBody`); without them
   * the rig reads the points it is given.
   */
  solve(state: RiderVisualState, cues?: DrawnCues): void {
    this.advanceCrawl(state);
    const { up, forward, left, boardUp, boardForward, chestUp, hipsForward, target, pole } = this;
    const p = state.points;
    boardUp.set(0, 1, 0).applyQuaternion(state.boardQuaternion);
    boardForward.set(0, 0, 1).applyQuaternion(state.boardQuaternion);
    const upright = state.phase === 'standing' || state.phase === 'landing';
    const lying = state.phase === 'prone' || state.phase === 'push' || state.phase === 'recover';
    const fallen = state.phase === 'fallen';

    // 1. The body's frame: up along the spine, forward where the chest faces.
    up.subVectors(p[POINT.torso], p[POINT.pelvis]);
    if (up.lengthSq() < 1e-10) up.copy(boardUp);
    up.normalize();
    if (upright) {
      // Hips open along the feet: the chest faces left × up (regular faces the −x rail).
      this.scratch.subVectors(p[POINT.leftFoot], p[POINT.rightFoot]);
      forward.crossVectors(this.scratch, up);
    } else if (lying) forward.copy(boardUp).negate();
    else {
      // Fallen: the heading square to the spine, as far as the spine rises, and the water's down square to it. Upright
      // the heading leads, lying flat or diving the down: a swimmer faces the water (step 8: the heading alone vanished
      // as the spine lay along it, and the swimmer faced wherever its spine leaned, on its side or up). Rising in the
      // heading's plane the two agree, so neither cancels the other.
      const rise = Math.max(0, up.y);
      forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
      forward.addScaledVector(up, -forward.dot(up)).multiplyScalar(rise);
      forward.add(this.scratch.set(0, -1, 0).addScaledVector(up, up.y));
    }
    this.perpendicular(forward, up);
    left.crossVectors(up, forward).normalize();
    this.bodyUp.copy(up);
    if (upright) {
      stanceBlend(state, this.blend);
      stagePose(this.stages.update(state, this.blend), this.pose);
    } else this.stages.reset();
    if (state.phase === 'standing' && this.pose.grab.share > 0) this.grabRail(state);
    // Where the key pose has the hips and the chest face (toward the nose, or past the toes toward the tail), then the
    // anticipation cascade: each turned into the turn ahead of the board by its lead (the head's is the look's).
    // Each followed (`cascade.chestFollow`, `hipsFollow`): the hips after the chest after the head (whose gaze follows).
    let chest = upright ? this.pose.chest : 0;
    let hips = upright ? this.pose.hips : 0;
    if (state.phase === 'standing') {
      const { cascade } = RIG_DETAIL;
      const most = cascade.twistMost;
      const blend = state.standingBlend;
      const toNose = (this.blend.stance === 'regular' ? 1 : -1) * (180 / Math.PI);
      chest += Math.max(-most, Math.min(most, toNose * blend * (cascade.chest * state.yawRate + state.twist)));
      hips += Math.max(-most, Math.min(most, toNose * blend * (cascade.hips * state.yawRate + cascade.hipsTwist * state.twist)));
      // The neck's reach from where the chest is turning to, followed as the gaze is (its yaw-rate lead carries what
      // is left of the board's wobble in the yaw rate).
      this.turnTowardNose(this.chestAim.copy(forward), this.aimFollower.follow(chest, state.clock));
      chest = this.chestFollower.follow(chest, state.clock);
      hips = this.hipsFollower.follow(hips, state.clock);
    } else {
      this.chestFollower.seed(chest, state.clock);
      this.aimFollower.seed(chest, state.clock);
      this.hipsFollower.seed(hips, state.clock);
    }
    const landing = state.phase !== 'standing';
    this.turnTowardNose(hipsForward.copy(forward), hips, landing);
    this.turnTowardNose(this.facing.copy(forward), chest, landing);
    if (state.phase !== 'standing') this.chestAim.copy(this.facing);
    // Swimming, the body rolls about its spine toward each pulling arm (step 8); the head keeps the unrolled facing,
    // turning with the roll only to breathe.
    this.swimFacing.copy(this.facing);
    this.headRoll = 0;
    if (fallen && state.swim.stroking) {
      const { roll, head } = this.crawlRoll(state);
      this.headRoll = head;
      this.facing.applyAxisAngle(up, roll);
      hipsForward.applyAxisAngle(up, roll * RIG_DETAIL.crawlRoll.hips);
    }

    // 2. The hips at the pelvis point (standing, raised to the model's extended legs), brought down if the legs cannot reach the feet.
    // Raised and lowered along the trunk's line less its pitch along the board, so the hips keep the physics' place
    // along the stance (the weight): along a trunk pitched toward the nose the lift had carried them 0.06 forward.
    const lift = this.liftUp.copy(up).addScaledVector(boardForward, -up.dot(boardForward));
    if (lift.lengthSq() < 1e-8) lift.copy(up);
    lift.normalize();
    const hipsAt = this.hipsAt.copy(p[POINT.pelvis]);
    if (upright) hipsAt.addScaledVector(lift, state.uprightBlend * this.standingLift(state) - (state.phase === 'standing' ? state.standingBlend * this.pose.sink : 0));
    if (state.phase === 'standing') this.weighBack(state, hipsAt);
    this.placeHips(hipsAt);
    if (upright) {
      let drop = 0;
      for (const side of SIDES) {
        this.ankleTarget(state, side, target);
        const hip = this.bones.get(BONES.upLeg[side])!.getWorldPosition(this.scratch);
        drop = Math.max(drop, this.dropToReach(hip, target, RIG_DETAIL.legReach * this.legLength, lift));
      }
      if (drop > 0) this.placeHips(hipsAt.addScaledVector(lift, -drop));
    }
    this.kneeFacing.copy(this.facing);
    const hinged = this.hingeAngle;
    this.hingeAngle = 0;
    if (state.phase === 'standing' && state.standingBlend > 0) this.hinge(state, hinged);
    else {
      this.hingeClock = state.clock;
      this.hingeFollower.seed(0, state.clock);
    }

    // 3. Spine, neck and head: the chest turns toward the nose, the head looks where the board goes.
    chestUp.subVectors(p[POINT.head], p[POINT.torso]);
    if (chestUp.lengthSq() < 1e-10) chestUp.copy(up);
    chestUp.normalize();
    if (this.hingeAngle) chestUp.applyAxisAngle(left, this.hingeAngle);
    // The lead shoulder dropped: the spine bent toward the lead (the nose's) side, about where the chest faces, as far
    // as shows the key pose's drop against the level.
    if (state.phase === 'standing') this.shoulderBend(state, chestUp);
    this.chestLine.copy(state.phase === 'standing' ? chestUp : this.up);
    if (state.phase !== 'standing') {
      this.dropFollower.seed(0, state.clock);
      this.pitchFollower2.seed(0, state.clock);
    }
    this.orientSpine(chestUp);
    this.followReach(state);
    if (state.phase === 'standing') this.bendToReach(state, chestUp);
    else {
      for (const follower of this.bendFollower) follower.seed(0, state.clock);
      this.pitchFollower.seed(0, state.clock);
      this.yawFollower.reset();
    }
    // The chest breathes: the upper spine turned back (inhaling) and forward about the body's left, half at each bone.
    const breath = RIG_DETAIL.breath.share * this.breathing.update(state, this.trunkLength / 2);
    if (breath) {
      this.turnBone(BONES.spine[1], left, -breath / 2);
      this.turnBone(BONES.spine[2], left, -breath / 2);
    }
    this.orient(BONES.neck, chestUp, this.facing);
    if (lying) {
      // Ducking, the head tucks from looking ahead to facing the deck, crown toward the nose.
      const duck = state.phase === 'prone' ? Math.min(1, Math.max(0, state.duck)) : 0;
      this.direction.copy(boardUp).addScaledVector(boardForward, 0.3).lerp(this.scratch.copy(boardForward).addScaledVector(boardUp, 0.2), duck);
      this.orient(BONES.head, this.direction, this.hint.copy(boardForward).lerp(this.middle.copy(boardUp).negate(), duck));
    }
    else if (state.phase === 'standing') this.lookWhereGoing(state);
    else if (upright) this.orient(BONES.head, WORLD_UP, this.hint.copy(boardForward).lerp(this.facing, 0.25));
    else this.orient(BONES.head, chestUp, this.direction.copy(this.swimFacing).applyAxisAngle(up, this.headRoll));

    // 4. Legs and feet (before the arms: the relaxed hands frame the knees).
    for (const side of SIDES) {
      const hip = this.bones.get(BONES.upLeg[side])!.getWorldPosition(this.joints.hip[side]);
      const foot = p[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
      if (upright) {
        this.ankleTarget(state, side, target);
        this.kneePole(state, side, pole);
      } else {
        if (fallen) target.subVectors(foot, hip).setLength(RIG_DETAIL.fallenReach * this.legLength).add(hip);
        else target.copy(foot);
        if (fallen && state.swim.stroking) {
          // The flutter kick: the feet beat up and down, alternating.
          const beat = Math.cos(2 * Math.PI * (RIG_DETAIL.kickRate * state.clock + (side === 'left' ? 0 : 0.5)));
          target.addScaledVector(this.facing, RIG_DETAIL.kick * beat);
        }
        if (lying) this.lyingKnees(state, pole);
        else pole.copy(this.facing);
      }
      solveTwoBone(hip, this.upperLeg, this.lowerLeg, target, pole, this.joints.knee[side], this.joints.ankle[side]);
      // The ball, where the flat foot meets the deck ahead of the ankle.
      const ball = this.pivot;
      if (upright) {
        this.footForward(state, side, this.footDirection);
        ball.copy(target).addScaledVector(this.footDirection, this.footRun).addScaledVector(boardUp, -this.footDrop);
        // Past the ankle's reach under load the heel lifts, the foot turning about the ball (step 3): the ankle's
        // flexion is how far the shin has closed on the flat foot from their angle at rest.
        const shin = this.direction.subVectors(this.joints.knee[side], this.joints.ankle[side]);
        const foot = this.scratch.subVectors(ball, this.joints.ankle[side]);
        const flexion = Math.PI / 2 + Math.atan2(this.footDrop, this.footRun) - shin.angleTo(foot);
        const lift = state.phase === 'standing'
          ? state.standingBlend * Math.max(0, Math.min(Math.PI / 4, flexion - (this.pose.maxDorsiflexion * Math.PI) / 180))
          : 0;
        if (lift > 0) {
          const axis = this.bendAxis.crossVectors(boardUp, this.footDirection).normalize();
          target.sub(ball).applyAxisAngle(axis, lift).add(ball);
          solveTwoBone(hip, this.upperLeg, this.lowerLeg, target, pole, this.joints.knee[side], this.joints.ankle[side]);
        }
      }
      this.aimLimb(BONES.upLeg[side], BONES.leg[side], hip, this.joints.knee[side], this.joints.ankle[side], pole);
      if (upright) this.followKnee(state, side);
      if (upright) {
        // The sole on the deck: from the ankle to the ball (its rest pitch standing flat), the toes along the deck.
        this.orient(BONES.foot[side], this.direction.subVectors(ball, this.joints.ankle[side]), boardUp);
        this.orient(BONES.toe[side], this.footDirection, boardUp);
      } else {
        // Toes pointed along the shin; lying, the top of the foot faces the deck.
        this.direction.subVectors(this.joints.ankle[side], this.joints.knee[side]);
        this.orient(BONES.foot[side], this.direction, lying ? this.hint.copy(boardUp).negate() : this.facing);
        this.restLocal(BONES.toe[side]);
      }
    }

    this.followArmTurn(state);
    this.followAlarm(state, cues);
    this.followPump(state);
    // 5. Arms.
    for (const side of SIDES) {
      if (state.phase === 'push') pole.copy(boardForward).negate().addScaledVector(boardUp, 0.3);
      else if (upright) pole.copy(WORLD_UP).multiplyScalar(-RIG_DETAIL.elbowDrop).addScaledVector(this.facing, -RIG_DETAIL.elbowBack);
      else pole.copy(this.facing).negate();
      // The clavicle at rest against the chest (it follows its arm below, standing): the shoulder read from this solve.
      this.restLocal(BONES.shoulder[side]);
      const shoulder = this.bones.get(BONES.arm[side])!.getWorldPosition(this.joints.shoulder[side]);
      const hand = p[side === 'left' ? POINT.leftHand : POINT.rightHand];
      if (state.phase === 'prone') this.strokeSide(side, RIG_DETAIL.strokeElbow, pole);
      if (fallen && state.swim.stroking) this.crawlHand(state, side, shoulder, target);
      else if (fallen) target.subVectors(hand, shoulder).setLength(RIG_DETAIL.fallenReach * this.armLength).add(shoulder);
      else if (state.phase === 'prone' && state.duck > 0.3) this.straightOnRail(hand, shoulder, target);
      // Lying, and landing (the crouched landing's hand passed through the arm's full reach, the elbow snapping), the
      // hand brought within the arm's reach smoothly.
      else if (state.phase === 'prone' || state.phase === 'landing') this.softReach(shoulder, hand, target);
      else target.copy(hand);
      if (state.phase === 'standing') this.freeArm(state, side, shoulder, target, 1 - this.reaching[side]);
      if (state.phase === 'standing' && !this.isRearFoot(state, side)) this.leadArm(state, shoulder, target, 1 - this.reaching[side]);
      if (state.phase === 'standing') this.driveClavicle(state, side, shoulder, target, chestUp, 1 - this.reaching[side]);
      // A free hand swings with the body; one on a point keeps it, and lying, pushing or fallen the swing rests.
      if (state.phase === 'standing') {
        const free = RIG_DETAIL.swing.share * state.standingBlend * (1 - this.reaching[side]);
        this.swing.follow(side, shoulder, target, free, state.clock, (RIG_DETAIL.swing.most * Math.PI) / 180);
      } else this.swing.still(side, shoulder, state.clock);
      solveTwoBone(shoulder, this.upperArm, this.lowerArm, target, pole, this.joints.elbow[side], this.joints.wrist[side]);
      this.aimLimb(BONES.arm[side], BONES.foreArm[side], shoulder, this.joints.elbow[side], this.joints.wrist[side], pole);
      // The hand's back toward the deck's normal, turning to the chest's facing as the forearm comes along the normal
      // (a hint along the forearm spun the hand).
      const forearm = this.direction.subVectors(this.joints.wrist[side], this.joints.elbow[side]).normalize();
      const handHint = this.handHint.copy(fallen ? this.facing : boardUp);
      if (state.phase === 'prone') this.strokeSide(side, RIG_DETAIL.strokeHand, handHint);
      else if (!fallen) {
        const off = this.scratch.copy(boardUp).addScaledVector(forearm, -boardUp.dot(forearm)).length();
        const keep = Math.min(1, Math.max(0, (off - 0.15) / 0.2));
        handHint.multiplyScalar(keep).addScaledVector(this.facing, 1 - keep);
      }
      this.orient(BONES.hand[side], forearm, handHint);
      const curl = state.phase === 'prone'
        ? RIG_DETAIL.fingerCurlRelaxed + (RIG_DETAIL.fingerCurlStroke - RIG_DETAIL.fingerCurlRelaxed) * state.stroking
        : RIG_DETAIL.fingerCurlRelaxed;
      this.curlFingers(side, curl);
    }
  }

  /**
   * Standing, hinges the trunk forward at the hips (about the body's left) to the
   * key pose's hinge (`hinge` by the crouch's depth), the pelvis
   * moving back along the level so the centre of mass stays, eased in by the
   * standing blend. Never hinges back: a body already folded further is left.
   */
  private hinge(state: RiderVisualState, last: number): void {
    const { unhinged, levelForward } = this;
    const { depth } = this.blend;
    // The key poses' hinge, as the stages swing between them, followed slower than the hinge itself (`hingeSwing`): a
    // rail change swings the turn's pose in 0.3 s, and its trunk with it drew the swing's edges into the wobble band.
    const tall = this.tallFollower.follow(this.pose.hinge.tall, state.clock);
    const deep = this.deepFollower.follow(this.pose.hinge.deep, state.clock);
    const wanted = ((tall + (deep - tall) * depth) * Math.PI) / 180;
    unhinged.up.copy(this.up);
    unhinged.hipsForward.copy(this.hipsForward);
    unhinged.facing.copy(this.facing);
    this.bones.get(BONES.hips)!.getWorldPosition(unhinged.hips);
    unhinged.chestUp.subVectors(state.points[POINT.head], state.points[POINT.torso]);
    if (unhinged.chestUp.lengthSq() < 1e-10) unhinged.chestUp.copy(this.up);
    unhinged.chestUp.normalize();
    levelForward.copy(this.forward).setY(0);
    if (levelForward.lengthSq() < 1e-8) return;
    levelForward.normalize();
    for (const side of SIDES) {
      this.ankleTarget(state, side, this.legAim.ankle[side]);
      this.calmAnkle(state, side, this.legAim.ankle[side]);
      this.kneePole(state, side, this.legAim.pole[side]);
    }
    this.massAt(state, 0, 0, unhinged.mass);
    // Backside, the trunk no further over the toes than `backsideLean` on the deck.
    const toes = this.scratch.set(this.blend.stance === 'regular' ? -1 : 1, 0, 0).applyQuaternion(state.boardQuaternion);
    const leaning = Math.atan2(unhinged.up.dot(toes), unhinged.up.dot(this.boardUp));
    // The backside bottom turn's (on the heels' rail, not a redirect: a frontside top turn is on the heels too).
    const backside = Math.max(0, -this.blend.turn) * (1 - this.stages.weights.redirect);
    const allowed = Math.PI / 2 + ((RIG_DETAIL.backsideLean * Math.PI) / 180 - Math.PI / 2) * backside - leaning;
    // Nor further than keeps the trunk (the model's, between the body's up and the chest's) within the key pose's
    // `tiltMost` of the world's vertical, the lean into the turn included.
    const room = this.tiltRoom(this.aimFrom.copy(unhinged.up).add(unhinged.chestUp).normalize());
    const most = (RIG_DETAIL.hingeMost * Math.PI) / 180;
    // Followed (the motion filter: the crouch's depth reads the rolling deck, and the backside bound the deck's roll),
    // within the bounds; and brought under the tilt's room smoothly once followed (`tiltEase` each side of it), so a
    // lean building faster than the follower does not fold the trunk past it. The backside bound holds only what is
    // followed: as a cap it passed the deck's roll wobble whenever it held the hinge. No faster than a brisk trunk bend
    // since the last solve; a clock standing still keeps the last (a display frame drawn twice from one snapshot), a
    // fresh solve takes it all.
    const angle = Math.max(0, Math.min(wanted, most, allowed, room));
    const followed = this.hingeFollower.follow(angle * state.standingBlend, state.clock);
    // The tilt's room followed too (it reads the physics' lean, the board's wobble in it): binding (the bottom turn's
    // 58°), the raw room drew the wobble into the chest.
    const roomFollowed = Number.isFinite(room) ? this.roomFollower.follow(Math.max(0, Math.min(most, room)), state.clock) : most;
    if (!Number.isFinite(room)) this.roomFollower.seed(most, state.clock);
    let hinge = Math.max(0, softCap(followed, Math.max(0, Math.min(most, roomFollowed)), (RIG_DETAIL.tiltEase * Math.PI) / 180));
    const dt = state.clock - this.hingeClock;
    if (dt === 0) hinge = last;
    else if (dt > 0 && dt < 0.25) hinge = last + Math.max(-RIG_DETAIL.hingeRate * dt, Math.min(RIG_DETAIL.hingeRate * dt, hinge - last));
    this.hingeClock = state.clock;
    this.hingeAngle = hinge;
    this.poseHinge(state, this.hingeAngle);
    // The pelvis gone back may carry the hips past the legs' reach: they come down again, straight down, which leaves
    // the centre of mass where the hinge kept it.
    let drop = 0;
    for (const side of SIDES) {
      const hip = this.bones.get(BONES.upLeg[side])!.getWorldPosition(this.scratch);
      drop = Math.max(drop, this.dropToReach(hip, this.legAim.ankle[side], RIG_DETAIL.legReach * this.legLength, WORLD_UP));
    }
    if (drop > 0) this.placeHips(this.hipsAt.addScaledVector(WORLD_UP, -drop));
  }


  /**
   * The hinge's model of the legs stands on calm ankles: each ankle target about
   * the board on its levelled frame, followed (`trunkFollow.ankles`), so the
   * board's roll and pitch under the feet, which the drawn legs take, do not
   * move the hinge (the motion filter). In place.
   */
  private calmAnkle(state: RiderVisualState, side: Side, ankle: Vector3): void {
    const { nose, toes } = this.levelled(this.handNose, this.handToes);
    const offset = this.handScratch.subVectors(ankle, state.boardPosition);
    const followers = this.ankleFollowers[side];
    const calm = [offset.dot(nose), offset.y, offset.dot(toes)].map((value, i) => followers[i].follow(value, state.clock));
    ankle.copy(state.boardPosition).addScaledVector(nose, calm[0]).addScaledVector(WORLD_UP, calm[1]).addScaledVector(toes, calm[2]);
  }

  /**
   * How far, rad, the trunk `trunk` may turn forward about the body's left
   * before it is the key pose's `tiltMost` from the world's vertical; negative, how far it
   * is past, turning further over. Turned by θ its height is a·cos θ + b·sin θ + c
   * (Rodrigues), coming down to the bound at φ + acos. A trunk leaning back
   * rises as it turns forward (b > 0): its room runs to where it comes down on
   * the far side; one the turn never brings within the bound is not bounded.
   */
  private tiltRoom(trunk: Vector3): number {
    const { left } = this;
    const most = (this.pose.tiltMost * Math.PI) / 180;
    const floor = Math.cos(most);
    const c = left.dot(trunk) * left.y;
    const a = trunk.y - c;
    const b = this.aimTo.crossVectors(left, trunk).y;
    const r = Math.hypot(a, b);
    if (r < 1e-9 || (floor - c) / r >= 1) return Infinity;
    if (a + c <= floor && b <= 0) return most - Math.acos(Math.max(-1, Math.min(1, trunk.y)));
    return Math.atan2(b, a) + Math.acos(Math.max(-1, (floor - c) / r));
  }

  /**
   * Standing, the alarm the arms show (step 5, `balanceAlarmOf`), past its
   * deadband and smoothed (`RIG_DETAIL.arms`): rising fast, falling slower. A
   * clock standing still keeps it; a fresh solve takes the alarm as it is; not
   * standing it is none.
   */
  private followAlarm(state: RiderVisualState, cues?: DrawnCues): void {
    const { arms } = RIG_DETAIL;
    const raw = state.phase === 'standing' ? (cues?.alarm ?? balanceAlarmOf(state.points)) : 0;
    const wanted = arms.alarmShare * Math.max(0, (raw - arms.alarmDeadband) / (1 - arms.alarmDeadband));
    const dt = state.clock - this.alarmClock;
    this.alarmClock = state.clock;
    if (dt === 0) return;
    if (!(dt > 0 && dt < 0.25)) {
      this.alarm = wanted;
      return;
    }
    const time = (wanted > this.alarm ? arms.alarmRise : arms.alarmFall) / 3;
    this.alarm += (wanted - this.alarm) * (1 - Math.exp(-dt / time));
  }

  /**
   * The arms' share of the turn, by the yaw rate over `armLeadRate`, followed at
   * `armRate` since the last solve; a clock standing still keeps it, a fresh solve
   * takes it all.
   */
  private followArmTurn(state: RiderVisualState): void {
    const now = Math.min(1, Math.abs(state.yawRate) / RIG_DETAIL.armLeadRate);
    const dt = state.clock - this.armClock;
    const up = RIG_DETAIL.armRate * dt;
    const down = RIG_DETAIL.armFall * dt;
    if (dt > 0 && dt < 0.25) this.armTurn += Math.max(-down, Math.min(up, now - this.armTurn));
    else if (dt !== 0) this.armTurn = now;
    this.armClock = state.clock;
  }

  /**
   * Standing, the pump's arms (`RIG_DETAIL.pump`): the free arms' elevation
   * lowered by the pelvis's rise over the deck, its rate read through a
   * critically damped follower; none off the board's standing phase.
   */
  private followPump(state: RiderVisualState): void {
    const { pump } = RIG_DETAIL;
    const height = this.scratch.subVectors(state.points[POINT.pelvis], state.boardPosition).dot(this.boardUp);
    if (state.phase !== 'standing') {
      this.riseFollower.seed(height, state.clock);
      this.pumpLift = 0;
      return;
    }
    this.riseFollower.follow(height, state.clock);
    const most = (pump.most * Math.PI) / 180;
    // Pushing down as the body rises, never lifting the arms (the plan: small motions pushing down, never rising).
    this.pumpLift = -state.standingBlend * Math.min(most, (pump.gain * Math.max(0, this.riseFollower.rate) * Math.PI) / 180);
  }

  /**
   * The tube's rail grab (decision 12; the key pose's `grab`): the trailing
   * hand's point moved onto its rail (the toes' or the heels'), at its place
   * between the rear foot and the front along the board, the wrist just over
   * the rail's edge: a hand on a point, as E's in the face, so the arm reaches
   * it and the spine bends toward it (`bendToReach`), handed over in time
   * (`reachHandover`). Drawn only: the physics' hand is not moved.
   */
  private grabRail(state: RiderVisualState): void {
    const { grab } = this.pose;
    const p = state.points;
    const regular = this.blend.stance === 'regular';
    const rear = p[regular ? POINT.rightFoot : POINT.leftFoot];
    const front = p[regular ? POINT.leftFoot : POINT.rightFoot];
    const inverse = this.turnParent.copy(state.boardQuaternion).invert();
    const along = (point: Vector3) => this.scratch.subVectors(point, state.boardPosition).applyQuaternion(inverse).add(BOARD_CENTRE).z;
    const z = along(rear) + (along(front) - along(rear)) * grab.along;
    // Regular's toes are the board's −x rail.
    const x = (regular ? -1 : 1) * Math.max(-1, Math.min(1, grab.rail)) * railHalfWidth(z);
    const rail = this.middle.set(x, deckAt(z) + RIG_DETAIL.grabAbove, z).sub(BOARD_CENTRE).applyQuaternion(state.boardQuaternion).add(state.boardPosition);
    p[regular ? POINT.rightHand : POINT.leftHand].lerp(rail, Math.max(0, Math.min(1, grab.share)) * state.standingBlend);
  }

  /**
   * The lead shoulder dropped (`RIG_DETAIL.shoulderBend`): `chestUp` bent as far
   * as brings the shoulders' line to the key pose's drop against the level (the
   * lead side lower), none where it already shows that much. First toward the
   * nose (the upper body over the front foot: the lead shoulder low, pointing
   * down the line), within `pitch`°, which keeps the trunk's tilt over the toes;
   * then sideways about where the chest faces for the rest, within `side`° (a
   * chest open toward the nose and tilted over the toes raises the lead
   * shoulder: geometry, not a choice). Each followed.
   */
  private shoulderBend(state: RiderVisualState, chestUp: Vector3): void {
    const { shoulderBend } = RIG_DETAIL;
    // The front foot's shoulder (Regular's left: the body's left), whichever way the chest faces.
    const lead = this.blend.stance === 'regular' ? 1 : -1;
    const wanted = -Math.sin((state.standingBlend * this.pose.shoulderDrop * Math.PI) / 180);
    const across = this.aimFrom;
    // The lead shoulder's height on the shoulders' line (unit), for the chest's up turned by `angle` about `axis`.
    const height = (axis: Vector3, angle: number) => {
      across.crossVectors(this.aimTo.copy(chestUp).applyAxisAngle(axis, angle), this.facing);
      const length = across.length();
      return length < 1e-9 ? 0 : (lead * across.y) / length;
    };
    // The least turn about `axis`, within `mostDegrees` either way (`toward`: one way only), that brings it down there,
    // or all of it the way it comes down.
    const solve = (axis: Vector3, mostDegrees: number, toward = 0) => {
      const now = height(axis, 0);
      if (now <= wanted || mostDegrees <= 0) return 0;
      const reach = (mostDegrees * Math.PI) / 180;
      const way = toward || (height(axis, reach) <= height(axis, -reach) ? 1 : -1);
      const most = way * reach;
      const far = height(axis, most);
      if (far >= now) return 0;
      if (far > wanted) return most;
      let low = 0;
      let high = most;
      for (let i = 0; i < 16; i += 1) {
        const middle = (low + high) / 2;
        if (height(axis, middle) > wanted) low = middle;
        else high = middle;
      }
      return high;
    };
    const nose = this.nose.copy(this.boardForward).setY(0);
    if (nose.lengthSq() > 1e-8) {
      // About the level axis across the nose: a turn toward the nose.
      const pitchAxis = this.pole2.crossVectors(WORLD_UP, nose.normalize()).normalize();
      chestUp.applyAxisAngle(pitchAxis, this.pitchFollower2.follow(solve(pitchAxis, shoulderBend.pitch, 1), state.clock));
    }
    chestUp.applyAxisAngle(this.facing, this.dropFollower.follow(solve(this.facing, shoulderBend.side), state.clock));
  }

  /** Forgets the last solve's motion: the next hinges, and swings its arms, at once (a new tile of the surfer sheet, a teleport). */
  reset(): void {
    this.hingeClock = Number.NaN;
    this.hingeAngle = 0;
    this.armClock = Number.NaN;
    this.alarmClock = Number.NaN;
    this.reachClock = Number.NaN;
    this.hingeFollower.reset();
    this.roomFollower.reset();
    this.tallFollower.reset();
    this.deepFollower.reset();
    this.stages.reset();
    for (const follower of this.bendFollower) follower.reset();
    this.pitchFollower.reset();
    this.yawFollower.reset();
    for (const side of SIDES) for (const follower of [...this.kneeFollowers[side], ...this.ankleFollowers[side]]) follower.reset();
    this.swing.reset();
    this.breathing.reset();
    this.armTurn = 0;
    this.riseFollower.reset();
    this.dropFollower.reset();
    this.pitchFollower2.reset();
    this.chestFollower.reset();
    this.aimFollower.reset();
    this.hipsFollower.reset();
    this.pumpLift = 0;
  }

  /** Poses the hips and the trunk's frame hinged by `angle`, rad, the pelvis back as far as keeps the centre of mass. */
  private poseHinge(state: RiderVisualState, angle: number): void {
    const { unhinged, left, levelForward } = this;
    this.up.copy(unhinged.up).applyAxisAngle(left, angle);
    this.hipsForward.copy(unhinged.hipsForward).applyAxisAngle(left, angle);
    this.facing.copy(unhinged.facing).applyAxisAngle(left, angle);
    const back = angle <= 0 ? 0 : this.backForMass(state, angle);
    this.placeHips(this.hipsAt.copy(unhinged.hips).addScaledVector(levelForward, -back));
  }

  /** How far back along the level the pelvis goes, m, for the body hinged by `angle` to keep its centre of mass (a secant search). */
  private backForMass(state: RiderVisualState, angle: number): number {
    const miss = (back: number) => this.scratch.subVectors(this.massAt(state, angle, back, this.middle), this.unhinged.mass).dot(this.levelForward);
    let a = 0;
    let fa = miss(a);
    let b = 0.1;
    let fb = miss(b);
    for (let i = 0; i < 3 && Math.abs(fb) > 1e-4 && fb !== fa; i += 1) {
      const next = b - (fb * (b - a)) / (fb - fa);
      a = b;
      fa = fb;
      b = Math.max(0, Math.min(0.5, next));
      fb = miss(b);
    }
    return b;
  }

  /**
   * The body's centre of mass, hinged by `angle` with the pelvis `back` m along
   * the level, from the skeleton's lengths, the legs' reach to their ankles and
   * the physics' hands (Winter 2009's segment shares), into `out`. A model of the
   * body the solve will draw, before it draws it.
   */
  private massAt(state: RiderVisualState, angle: number, back: number, out: Vector3): Vector3 {
    const { unhinged, left, mass } = this;
    const up = this.hint.copy(unhinged.up).applyAxisAngle(left, angle);
    const chestUp = this.pole2.copy(unhinged.chestUp).applyAxisAngle(left, angle);
    const hips = mass.body.copy(unhinged.hips).addScaledVector(this.levelForward, -back);
    const sum = mass.sum.set(0, 0, 0);
    let total = 0;
    const add = (share: number, point: Vector3) => {
      sum.addScaledVector(point, share);
      total += share;
    };
    const spine = mass.spine.copy(hips).addScaledVector(up, this.spineBase);
    const neck = mass.neck.copy(chestUp).add(up).normalize().multiplyScalar(this.trunkLength).add(spine);
    add(0.081, this.direction.copy(neck).addScaledVector(chestUp, this.neckLength));
    add(0.355, this.direction.copy(spine).add(neck).multiplyScalar(0.5));
    for (const side of SIDES) {
      const hip = mass.modelHip.copy(hips).addScaledVector(up, -this.hipDrop).addScaledVector(left, side === 'left' ? this.hipHalfWidth : -this.hipHalfWidth);
      add(0.071, hip);
      mass.ankle.copy(this.legAim.ankle[side]);
      solveTwoBone(hip, this.upperLeg, this.lowerLeg, mass.ankle, this.legAim.pole[side], mass.knee, this.legAnkle);
      add(0.1, this.direction.copy(hip).add(mass.knee).multiplyScalar(0.5));
      add(0.0465, this.direction.copy(mass.knee).add(mass.ankle).multiplyScalar(0.5));
      add(0.0145, mass.ankle);
      // An arm from its shoulder (about the neck) to the physics' hand.
      add(0.05, this.direction.copy(neck).add(state.points[side === 'left' ? POINT.leftHand : POINT.rightHand]).multiplyScalar(0.5));
    }
    return out.copy(sum).divideScalar(total);
  }

  /** The spine from the hips' up to `chestUp`, turning from the hips' facing to the chest's. */
  private orientSpine(chestUp: Vector3): void {
    BONES.spine.forEach((name, i) => {
      const w = (i + 1) / 3;
      this.orient(name, this.direction.copy(this.up).lerp(chestUp, w), this.hint.copy(this.hipsForward).lerp(this.facing, w));
    });
  }

  /**
   * How far a hand reaches down, 0 to 1: a hand below the hips reaches (the
   * physics' hand in the face or toward the water), not held out, coming in over
   * `reachFade` m.
   */
  private reachDepth(hand: Vector3): number {
    return Math.max(0, Math.min(1, (this.hipsAt.y - hand.y) / RIG_DETAIL.reachFade));
  }

  /**
   * Each hand's reach down (`reachDepth`), handed over no faster than in
   * `reachHandover` s (the animation-realism plan: the relaxed hand at the knee
   * and the physics' spread hand dipping to the water in a banked carve are far
   * apart, and the hand crossed between them in a frame or two); a clock
   * standing still keeps it, a fresh solve takes it as it is.
   */
  private followReach(state: RiderVisualState): void {
    const dt = state.clock - this.reachClock;
    this.reachClock = state.clock;
    if (dt === 0) return;
    for (const side of SIDES) {
      const now = state.phase === 'standing' ? this.reachDepth(state.points[side === 'left' ? POINT.leftHand : POINT.rightHand]) : 0;
      if (dt > 0 && dt < 0.25) {
        const most = dt / RIG_DETAIL.reachHandover;
        this.reaching[side] += Math.max(-most, Math.min(most, now - this.reaching[side]));
      } else this.reaching[side] = now;
    }
  }

  /**
   * Standing, bends the spine toward a hand reaching down past the arm's length
   * (the physics' hand in the face, or Compress's inside hand at the water), in the
   * plane of the shoulder and the hand about the hips, so it folds forward over the
   * toes as well as sideways: the least bend that reaches, within `reachBend`,
   * checked on the solved shoulder (the spine spreads a bend over its bones) and
   * eased in by the standing blend, then followed on the board's levelled frame
   * (`trunkFollow`). Leaves `chestUp` bent as the spine is.
   */
  private bendToReach(state: RiderVisualState, chestUp: Vector3): void {
    const base = this.bendBase.copy(chestUp);
    const turn = this.bendTurn.set(0, 0, 0);
    if (this.reachBend(state, chestUp)) turn.copy(this.bendAxis).multiplyScalar(this.bendAngle);
    // Followed on the board's levelled frame (the motion filter): the bend's axis turns with the board.
    const nose = this.nose.copy(this.boardForward).setY(0);
    if (nose.lengthSq() < 1e-8) nose.set(0, 0, 1);
    nose.normalize();
    const across = this.pole2.crossVectors(WORLD_UP, nose).normalize();
    const local = [turn.dot(across), turn.y, turn.dot(nose)].map((value, i) => this.bendFollower[i].follow(value, state.clock));
    turn.copy(across).multiplyScalar(local[0]).addScaledVector(WORLD_UP, local[1]).addScaledVector(nose, local[2]);
    const angle = turn.length();
    if (angle < 1e-6) {
      if (!chestUp.equals(base)) this.orientSpine(chestUp.copy(base));
      return;
    }
    this.orientSpine(chestUp.copy(base).applyAxisAngle(turn.divideScalar(angle), angle));
  }

  /** The reach bend this solve, unfollowed (`bendToReach`): its axis (`bendAxis`) and angle, eased, or false for none. */
  private readonly bendBase = new Vector3();
  private readonly bendTurn = new Vector3();
  private bendAngle = 0;

  private reachBend(state: RiderVisualState, chestUp: Vector3): boolean {
    const { bendAxis, pivot, middle } = this;
    if (state.standingBlend <= 0) return false;
    this.bones.get(BONES.hips)!.getWorldPosition(pivot);
    const reach = (RIG_DETAIL.armReach - RIG_DETAIL.trunkFollow.bendSlack) * this.armLength;
    // The reaching hand farthest out of reach, weighed by how far it reaches down.
    let side: Side | undefined;
    let short = 0;
    let depth = 0;
    for (const candidate of SIDES) {
      const hand = state.points[candidate === 'left' ? POINT.leftHand : POINT.rightHand];
      const down = this.reaching[candidate];
      if (down <= 0) continue;
      const gap = (this.bones.get(BONES.arm[candidate])!.getWorldPosition(this.target).distanceTo(hand) - reach) * down;
      if (gap > short) {
        short = gap;
        side = candidate;
        depth = down;
      }
    }
    if (!side) return false;
    const hand = middle.subVectors(state.points[side === 'left' ? POINT.leftHand : POINT.rightHand], pivot);
    const shoulderOf = () => this.bones.get(BONES.arm[side])!.getWorldPosition(this.target).sub(pivot);
    bendAxis.crossVectors(shoulderOf(), hand);
    if (bendAxis.lengthSq() < 1e-10) return false;
    bendAxis.normalize();
    const base = this.chestBase.copy(chestUp);
    const most = (Math.min(RIG_DETAIL.reachBend, this.pose.reachBend) * Math.PI) / 180;
    let total = 0;
    for (let pass = 0; pass < 4 && total < most; pass += 1) {
      const shoulder = shoulderOf();
      if (shoulder.distanceTo(hand) <= reach) break;
      // A rigid turn of the solved shoulder toward the hand about the axis: the least that reaches, or the nearest.
      const s = this.bend.copy(shoulder).addScaledVector(bendAxis, -shoulder.dot(bendAxis));
      const h = this.nose.copy(hand).addScaledVector(bendAxis, -hand.dot(bendAxis));
      const toward = Math.min(most - total, Math.max(0, Math.atan2(this.scratch.crossVectors(s, h).dot(bendAxis), s.dot(h))));
      // Turning toward the hand brings the shoulder nearer all the way to `toward`: the least turn that reaches, found
      // by halving (a search in steps jumped between them, a jitter), or all of it if none reaches.
      const distanceAt = (angle: number) => this.hint.copy(shoulder).applyAxisAngle(bendAxis, angle).distanceTo(hand);
      let best = toward;
      if (distanceAt(toward) <= reach) {
        let low = 0;
        let high = toward;
        for (let i = 0; i < 24; i += 1) {
          const middleAngle = (low + high) / 2;
          if (distanceAt(middleAngle) <= reach) high = middleAngle;
          else low = middleAngle;
        }
        best = high;
      }
      if (best <= 1e-6) break;
      total = Math.min(most, total + best);
      this.orientSpine(chestUp.copy(base).applyAxisAngle(bendAxis, total));
    }
    this.bendAngle = state.standingBlend * depth * total;
    return total > 0;
  }

  /**
   * Standing, the leading arm as pointer (the animation-realism plan's §3.2 and
   * phase 2): turned toward where the head looks, within the key pose's
   * `lead.turn`° of its relaxed hand's heading, raised `lead.lift` of the way
   * from the relaxed hand's elevation to `lead.raise`° above the level and
   * reaching `lead.reach` of the arm as it does (phase 1 kept it at the relaxed
   * hand's height, within 20°: trim's pose still does), blended in by the turn
   * (`armTurn`, rate-limited) or held at `lead.hold` with none (the tube's lead
   * arm at the exit); `share` of it, handing over to a hand reaching down.
   */
  private leadArm(state: RiderVisualState, shoulder: Vector3, target: Vector3, share: number): void {
    const { lead } = this.pose;
    const pointing = RIG_DETAIL.arms.pointShare;
    const lift = lead.lift * pointing;
    const weight = share * state.standingBlend * Math.max(this.armTurn, lead.hold * pointing);
    if (weight <= 0) return;
    const reach = this.leadAim.subVectors(target, shoulder).length();
    const level = this.leadLevel.copy(this.look).setY(0);
    if (reach < 1e-6 || level.lengthSq() < 1e-8) return;
    level.normalize();
    // Toward the look, no more than `lead.turn` from the hand's own heading, and less as the look comes round behind it
    // (none past 150°: which way to turn is no longer clear, and it flipped).
    const own = Math.atan2(this.leadAim.x, this.leadAim.z);
    const toward = Math.atan2(level.x, level.z);
    const most = (lead.turn * Math.PI) / 180;
    const apart = Math.atan2(Math.sin(toward - own), Math.cos(toward - own));
    const fade = Math.max(0, Math.min(1, (150 - (Math.abs(apart) * 180) / Math.PI) / 60));
    const heading = own + fade * Math.max(-most, Math.min(most, apart));
    level.set(Math.sin(heading), 0, Math.cos(heading));
    const relaxed = Math.asin(Math.max(-1, Math.min(1, this.leadAim.y / reach)));
    const raise = relaxed + ((lead.raise * Math.PI) / 180 - relaxed) * lift;
    const aim = level.multiplyScalar(Math.cos(raise)).addScaledVector(WORLD_UP, Math.sin(raise));
    // At no more than `leadReach` of the arm unlifted (an arm straight as it swings round spins about itself), the
    // pose's reach lifted; or the free arm's own where losing balance has straightened it (step 5).
    const loose = Math.min(reach, RIG_DETAIL.leadReach * this.armLength);
    const length = loose + (lead.reach * this.armLength - loose) * lift;
    const goal = this.direction.copy(shoulder).addScaledVector(aim, length);
    this.blendAim(shoulder, target, goal, weight, Math.max(RIG_DETAIL.armReach * this.armLength, reach));
  }

  /**
   * Blends a hand's target about its shoulder toward `toward` by `weight`: its
   * direction turned the short way and its reach eased, within the arm's reach
   * (a straight line between two targets passes inside it and folds the elbow).
   */
  private blendAim(shoulder: Vector3, target: Vector3, toward: Vector3, weight: number, most = RIG_DETAIL.armReach * this.armLength): void {
    const from = this.aimFrom.subVectors(target, shoulder);
    const to = this.aimTo.subVectors(toward, shoulder);
    const reach = Math.min(most, from.length() + (to.length() - from.length()) * weight);
    const angle = from.angleTo(to);
    if (from.lengthSq() < 1e-12 || to.lengthSq() < 1e-12 || angle > Math.PI - 1e-3) {
      target.lerp(toward, weight);
      return;
    }
    from.normalize();
    to.normalize();
    if (angle > 1e-6) {
      const s = Math.sin(angle);
      from.multiplyScalar(Math.sin((1 - weight) * angle) / s).addScaledVector(to, Math.sin(weight * angle) / s);
    }
    target.copy(shoulder).addScaledVector(from.normalize(), reach);
  }

  /**
   * Standing, turns a clavicle with its arm (`RIG_DETAIL.clavicle`): up toward the
   * chest's up with the arm's rise above `from`, forward with its reach forward;
   * moves `shoulder` with it.
   */
  private driveClavicle(state: RiderVisualState, side: Side, shoulder: Vector3, target: Vector3, chestUp: Vector3, free: number): void {
    const { clavicle } = RIG_DETAIL;
    const share = clavicle.share * state.standingBlend;
    if (share <= 0) return;
    const bone = this.bones.get(BONES.shoulder[side])!;
    const reach = this.direction.subVectors(target, shoulder);
    if (reach.lengthSq() < 1e-8) return;
    reach.normalize();
    const rise = Math.atan2(this.scratch.crossVectors(reach, this.up).length(), -reach.dot(this.up));
    const lift = share * clavicle.ratio * Math.max(0, rise - (clavicle.from * Math.PI) / 180);
    const swing = (share * clavicle.protract * Math.PI * Math.max(0, reach.dot(this.facing))) / 180;
    if (lift <= 0 && swing <= 0) return;
    const along = this.hint.subVectors(shoulder, bone.getWorldPosition(this.chestBase)).normalize();
    const toward = (direction: Vector3, angle: number) => {
      const perpendicular = this.bendAxis.copy(direction).addScaledVector(along, -direction.dot(along));
      if (perpendicular.lengthSq() < 1e-8) return;
      along.multiplyScalar(Math.cos(angle)).addScaledVector(perpendicular.normalize(), Math.sin(angle));
    };
    toward(chestUp, lift);
    toward(this.facing, swing);
    this.orient(BONES.shoulder[side], along, chestUp);
    bone.updateMatrixWorld(true);
    // A free hand goes where its shoulder goes (its target was set from the shoulder); a hand holding a point stays.
    const before = this.middle.copy(shoulder);
    this.bones.get(BONES.arm[side])!.getWorldPosition(shoulder);
    target.addScaledVector(before.sub(shoulder).negate(), free);
  }

  /**
   * Standing, a free arm toward the key pose's relaxed hand (`relaxedHand`,
   * framing its knee), its elevation turned by the pump (`pumpLift`); in a
   * redirect the trailing arm swings up toward the key pose's `trail.swing`°
   * from the trunk's down (by the turn, or `trail.hold` of it with none); losing balance (step 5) both go out
   * toward `alarmElevation`° along the physics' hand's heading about the trunk,
   * straightening toward `alarmElbow`°, by the alarm. `share` of it, none for a
   * hand reaching down.
   */
  private freeArm(state: RiderVisualState, side: Side, shoulder: Vector3, target: Vector3, share: number): void {
    const { arms } = RIG_DETAIL;
    const weight = arms.share * share * state.standingBlend;
    if (weight <= 0) return;
    // From the chest's down (the shoulders' girdle), bent for the lead shoulder's drop.
    const down = this.bend.copy(this.chestLine).negate();
    // The physics' hand's heading about the trunk: its direction from the shoulder, off the trunk's axis.
    const out = this.nose.subVectors(target, shoulder).addScaledVector(down, -this.scratch.subVectors(target, shoulder).dot(down));
    if (out.lengthSq() < 1e-8) out.copy(this.boardForward).addScaledVector(down, -this.boardForward.dot(down));
    if (out.lengthSq() < 1e-8) return;
    out.normalize();
    const relaxed = this.relaxedHand(state, side, shoulder, this.relaxedAt);
    // The pump: small arm motions in time, pushing down as the body extends.
    if (this.pumpLift) {
      const arm = this.handScratch.subVectors(relaxed, shoulder);
      const axis = this.bendAxis.crossVectors(down, arm);
      if (axis.lengthSq() > 1e-10) relaxed.copy(shoulder).add(arm.applyAxisAngle(axis.normalize(), this.pumpLift));
    }
    let most = Math.max(RIG_DETAIL.armReach * this.armLength, relaxed.distanceTo(shoulder));
    // In a redirect the trailing arm swings up (the key pose's), as far as the turn has come in.
    const { trail } = this.pose;
    const swingUp = this.isRearFoot(state, side) && trail.swing > 1 ? Math.max(this.armTurn, trail.hold) : 0;
    if (swingUp > 0) this.blendAim(shoulder, relaxed, this.spreadArm(shoulder, down, out, trail.swing, arms.elbow, this.spreadAt), swingUp, most);
    // Losing balance the arms go out, straightening: out to the straight arm's own reach.
    if (this.alarm > 0) {
      const spread = this.spreadArm(shoulder, down, out, Math.min(arms.alarmElevation, this.pose.alarm), arms.alarmElbow, this.spreadAt);
      most = Math.max(most, spread.distanceTo(shoulder));
      this.blendAim(shoulder, relaxed, spread, this.alarm, most);
    }
    this.blendAim(shoulder, target, relaxed, weight, most);
  }

  /** A spread arm's hand: its upper arm `degrees` from the trunk's `down` along `out`, the elbow at `elbowDegrees` (the wrist above the upper arm by half the bend). */
  private spreadArm(shoulder: Vector3, down: Vector3, out: Vector3, degrees: number, elbowDegrees: number, into: Vector3): Vector3 {
    const elevation = ((degrees + (180 - elbowDegrees) / 2) * Math.PI) / 180;
    const reach = this.elbowReach(elbowDegrees);
    return into.copy(shoulder).addScaledVector(down, Math.cos(elevation) * reach).addScaledVector(out, Math.sin(elevation) * reach);
  }

  /** From the shoulder to the wrist with the elbow at `degrees` (included), m. */
  private elbowReach(degrees: number): number {
    const elbow = (degrees * Math.PI) / 180;
    return Math.sqrt(this.upperArm ** 2 + this.lowerArm ** 2 - 2 * this.upperArm * this.lowerArm * Math.cos(elbow));
  }

  /**
   * The relaxed free hand (the key pose's `hands`; the owner's reference of
   * 2026-10-22): about its knee, followed on the board's levelled frame (so the
   * legs' absorption of the board's wobble does not bob it), offset toward the
   * nose, the toes and up, at no more than the soft elbow's reach from the
   * shoulder (standing tall the arm hangs toward it, in front of the thigh) and
   * no less than its most bent.
   */
  private relaxedHand(state: RiderVisualState, side: Side, shoulder: Vector3, out: Vector3): Vector3 {
    const offset: HandOffset = this.isRearFoot(state, side) ? this.pose.hands.trail : this.pose.hands.lead;
    const { nose, toes, up } = this.bodyFrame();
    out.copy(this.calmKnee[side]).addScaledVector(nose, offset.nose).addScaledVector(toes, offset.toes).addScaledVector(up, offset.up);
    const offsetFromShoulder = this.handScratch.subVectors(out, shoulder);
    const distance = offsetFromShoulder.length();
    if (distance < 1e-6) return out;
    const reach = Math.max(this.elbowReach(this.pose.elbowLeast), Math.min(this.elbowReach(this.pose.elbowMost), distance));
    return out.copy(shoulder).addScaledVector(offsetFromShoulder, reach / distance);
  }

  /**
   * The body's frame this solve: along its line (`bodyUp`, the physics' trunk
   * followed), toward the toes (where the feet's line faces) and toward the nose
   * across them. The relaxed hands lean with the body into a turn.
   */
  private bodyFrame(): { nose: Vector3; toes: Vector3; up: Vector3 } {
    const nose = this.bodyNose.crossVectors(this.bodyUp, this.forward).normalize();
    if (nose.dot(this.boardForward) < 0) nose.negate();
    return { nose, toes: this.forward, up: this.bodyUp };
  }

  /** The board's levelled frame: its nose on the level, and toward the stance's toes (Regular faces the −x rail). */
  private levelled(nose: Vector3, toes: Vector3): { nose: Vector3; toes: Vector3 } {
    nose.copy(this.boardForward).setY(0);
    if (nose.lengthSq() < 1e-8) nose.set(0, 0, 1);
    nose.normalize();
    toes.crossVectors(WORLD_UP, nose).normalize();
    if (this.blend.stance === 'regular') toes.negate();
    return { nose, toes };
  }

  /**
   * Standing, the knee about the hips followed on the board's levelled frame
   * (`calmKnee`, for the relaxed hands); otherwise the followers rest at it.
   */
  private followKnee(state: RiderVisualState, side: Side): void {
    const { nose, toes, up } = this.bodyFrame();
    const knee = this.handScratch.subVectors(this.joints.knee[side], this.hipsAt);
    const local = [knee.dot(nose), knee.dot(up), knee.dot(toes)];
    const followers = this.kneeFollowers[side];
    const calm = state.phase === 'standing'
      ? local.map((value, i) => followers[i].follow(value, state.clock))
      : local.map((value, i) => followers[i].seed(value, state.clock));
    this.calmKnee[side].copy(this.hipsAt).addScaledVector(nose, calm[0]).addScaledVector(up, calm[1]).addScaledVector(toes, calm[2]);
  }

  /** Standing, the head along the board's travel led into the turn, within the neck's reach, pitched with the climb. */
  private lookWhereGoing(state: RiderVisualState): void {
    const { look, hint, direction } = this;
    look.copy(state.travel).setY(0);
    if (look.lengthSq() < 1e-8) look.copy(this.boardForward).setY(0);
    if (look.lengthSq() < 1e-8) look.set(0, 0, 1);
    // Turning, from where the board points: carving hard it points into the turn ahead of where it travels (35–50°
    // on flat water), and the look leads from there.
    const turnShare = Math.min(1, Math.abs(state.yawRate) / RIG_DETAIL.armLeadRate);
    const pointing = this.leadLevel.copy(this.boardForward).setY(0);
    if (pointing.lengthSq() > 1e-8 && look.lengthSq() > 1e-8) look.normalize().lerp(pointing.normalize(), turnShare);
    if (look.lengthSq() < 1e-8) look.copy(this.boardForward).setY(0);
    // The head looks where the pad's twist turns the shoulders, too (the movement-flow spec); further into a turn by the
    // key pose's lead (where the turn goes next); and, climbing with the weight going back, toward the redirect to come.
    const { anticipate } = RIG_DETAIL;
    const rising = Math.max(0, Math.min(1, (state.climb - anticipate.climbFrom) / (anticipate.climbFull - anticipate.climbFrom)));
    // The redirect turns frontside onto the heels (Regular's heading growing), backside onto the toes.
    const way = (this.blend.stance === 'regular' ? 1 : -1) * (1 - 2 * this.stages.weights.backside);
    const coming = way * rising * weightBack(state) * (1 - this.stages.weights.kickOut) * anticipate.look;
    // The key pose's lead stands in for the yaw rate's where it looks further (a redirect's destination), not on top.
    // The gaze's follow lags a turning target by its own time (`lag`): that is added to what it follows, below, so the
    // head reaches where it looks (and the neck's reach) while the body comes round, rather than trailing it.
    const lag = 2 / RIG_DETAIL.gazeFollow;
    const ahead = Math.sign(state.yawRate) * Math.max(Math.abs((RIG_DETAIL.lookAhead - lag) * state.yawRate), (state.standingBlend * turnShare * this.pose.lookTurn * Math.PI) / 180);
    look.normalize().applyAxisAngle(WORLD_UP, ahead + state.standingBlend * (state.twist + (coming * Math.PI) / 180));
    // Within the neck's reach of where the chest is turning to: the head turns first, the chest comes round after it.
    hint.copy(this.chestAim).setY(0);
    if (hint.lengthSq() > 1e-8) {
      hint.normalize();
      const turn = Math.atan2(this.scratch.crossVectors(hint, look).y, hint.dot(look));
      const most = (RIG_DETAIL.neckTurn * Math.PI) / 180;
      if (Math.abs(turn) > most) look.copy(hint).applyAxisAngle(WORLD_UP, Math.sign(turn) * most);
    }
    // The gaze held steady in the world (the motion filter): its heading followed, so the board's yaw wobble and what
    // is left of it in the yaw rate (and in the chest's facing, at the neck's reach) do not turn the head.
    const heading = Math.atan2(look.x, look.z);
    const last = this.yawFollower.value;
    const followed = this.yawFollower.follow(last + Math.atan2(Math.sin(heading - last), Math.cos(heading - last)) + lag * state.yawRate, state.clock);
    look.set(Math.sin(followed), 0, Math.cos(followed));
    const pitchMost = (this.pose.lookPitch * Math.PI) / 180;
    const climbing = Math.atan2(state.climb, Math.max(state.speed, 1)) - (this.pose.gazeDown * Math.PI) / 180;
    const pitch = this.pitchFollower.follow(Math.max(-pitchMost, Math.min(pitchMost, climbing)), state.clock);
    direction.copy(WORLD_UP).multiplyScalar(Math.cos(pitch)).addScaledVector(look, -Math.sin(pitch));
    look.multiplyScalar(Math.cos(pitch)).addScaledVector(WORLD_UP, Math.sin(pitch));
    // Easing in from the landing's head: world up, facing mostly the nose.
    const blend = state.standingBlend;
    if (blend < 1) {
      direction.multiplyScalar(blend).addScaledVector(WORLD_UP, 1 - blend).normalize();
      this.headHint.copy(this.boardForward).lerp(this.facing, 0.25).multiplyScalar(1 - blend).addScaledVector(look, blend);
      this.orient(BONES.head, direction, this.headHint);
      return;
    }
    this.orient(BONES.head, direction, look);
  }

  /**
   * Lying, a direction on the arm's side of the board (step 8): `out` from the
   * body, `up` off the deck and `forward` toward the nose (negative: toward the
   * tail), in the board's frame.
   */
  private strokeSide(side: Side, direction: { out: number; up: number; forward: number }, result: Vector3): Vector3 {
    const outward = this.strokeOffset.copy(this.left).multiplyScalar(side === 'left' ? 1 : -1);
    return result.copy(outward).multiplyScalar(direction.out).addScaledVector(this.boardUp, direction.up).addScaledVector(this.boardForward, direction.forward);
  }

  /**
   * The swimmer's crawl: the hand circles the shoulder in the plane of the
   * heading and the vertical, reaching forward, pulling down and back under the
   * body, recovering over the water; the arms half a stroke apart.
   */
  private crawlHand(state: RiderVisualState, side: Side, shoulder: Vector3, out: Vector3): Vector3 {
    const angle = 2 * Math.PI * (this.crawlPhase + (side === 'left' ? 0 : 0.5));
    const reach = RIG_DETAIL.crawlReach * this.armLength;
    this.nose.set(Math.sin(state.heading), 0, Math.cos(state.heading));
    // The circle in the plane of the heading and the rolled body's back (step 8): swinging forward, the arm goes out
    // over the water as the body rolls away from it.
    const back = this.crawlBack.copy(this.facing).negate();
    return out.copy(shoulder).addScaledVector(this.nose, reach * Math.cos(angle)).addScaledVector(back, reach * Math.sin(angle));
  }

  /**
   * The swimmer's roll about its spine now, rad (positive: the left shoulder up),
   * and the head's share of it (step 8, `RIG_DETAIL.crawlRoll`): toward each arm
   * as its hand passes under its shoulder, further toward the breathing side,
   * where the head turns with the body; the head stays down otherwise, and
   * holding its breath (under water or diving) it never turns, and the roll is
   * even.
   */
  private crawlRoll(state: RiderVisualState): { roll: number; head: number } {
    const { away, breath } = RIG_DETAIL.crawlRoll;
    const held = state.swim.under || state.swim.diving;
    const wave = Math.sin(2 * Math.PI * this.crawlPhase);
    const roll = ((wave >= 0 || held ? away : breath) * Math.PI * wave) / 180;
    return { roll, head: held ? 0 : Math.min(0, roll) };
  }

  /** The crawl advances with the clock, quicker as the breath runs low; a jump in the clock restarts nothing. */
  private advanceCrawl(state: RiderVisualState): void {
    const step = state.clock - this.crawlClock;
    this.crawlClock = state.clock;
    if (!(step > 0 && step < 0.5)) return;
    const breath = Math.min(1, Math.max(0, state.breath));
    this.crawlPhase = (this.crawlPhase + step * RIG_DETAIL.crawlRate * (1 + RIG_DETAIL.panic * (1 - breath))) % 1;
  }

  /**
   * Lying, the knees' side: down toward the deck, and toward the side the feet's
   * line turns (their line crossed with the deck's normal, as the standing chest
   * faces): the toes' side while the feet stand in the stance, the nose's once
   * they lie side by side. Lying down from standing (and popping up) the leg
   * sweeps from under the body to behind it, and the deck's down alone lay along
   * the standing leg at the switch: the knee turned to whichever side and swung
   * back over as the leg straightened (up to 10 m/s). This stays 45° or more off
   * the leg's every way.
   */
  private lyingKnees(state: RiderVisualState, out: Vector3): Vector3 {
    const feet = this.scratch.subVectors(state.points[POINT.leftFoot], state.points[POINT.rightFoot]).cross(this.boardUp);
    out.copy(this.boardUp).negate();
    return feet.lengthSq() > 1e-8 ? out.add(feet.normalize()) : out;
  }

  /** Lying, the hand's point brought within the arm's reach smoothly (`armEase`): along the line from the shoulder. */
  private softReach(shoulder: Vector3, hand: Vector3, out: Vector3): Vector3 {
    const offset = out.subVectors(hand, shoulder);
    const distance = offset.length();
    if (distance < 1e-9) return out.copy(hand);
    const reach = softCap(distance, RIG_DETAIL.armReach * this.armLength, RIG_DETAIL.armEase * this.armLength);
    return offset.multiplyScalar(reach / distance).add(shoulder);
  }

  /** Ducking, a hand on its rail slid forward along the board until the arm from the shoulder is straight. */
  private straightOnRail(hand: Vector3, shoulder: Vector3, out: Vector3): Vector3 {
    const reach = RIG_DETAIL.duckArmReach * this.armLength;
    const offset = this.middle.subVectors(hand, shoulder);
    // |offset + t F| = reach, the forward root: t = −(o·F) + √((o·F)² − (|o|² − reach²)).
    const along = offset.dot(this.boardForward);
    const discriminant = along * along - (offset.lengthSq() - reach * reach);
    const t = discriminant > 0 ? Math.max(0, -along + Math.sqrt(discriminant)) : 0;
    return out.copy(hand).addScaledVector(this.boardForward, t);
  }

  /** Turns a bone by `angle` rad about the world's `axis`, its children with it. */
  private turnBone(name: string, axis: Vector3, angle: number): void {
    const bone = this.bones.get(name)!;
    const world = bone.getWorldQuaternion(this.turnWorld);
    const turned = this.turnBy.setFromAxisAngle(axis, angle).multiply(world);
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(this.turnParent).invert().multiply(turned));
    bone.updateMatrixWorld(true);
  }

  private orient(name: string, direction: Vector3, hint: Vector3): void {
    const rest = this.rest.get(name)!;
    orientBone(rest.bone, rest.axis, rest.hint, direction, hint);
  }

  /** Makes `v` a unit vector perpendicular to `axis`, falling back to face down or along +z when it lies along it. */
  private perpendicular(v: Vector3, axis: Vector3): Vector3 {
    v.addScaledVector(axis, -v.dot(axis));
    if (v.lengthSq() < 1e-8) v.set(0, -1, 0).addScaledVector(axis, axis.y);
    if (v.lengthSq() < 1e-8) v.set(0, 0, 1).addScaledVector(axis, -axis.z);
    return v.normalize();
  }

  /**
   * Turns `v` (perpendicular to the body's up, about the toes' way) about up by
   * `degrees` toward the board's nose, or toward its tail where negative (the
   * key poses' chest and hips, past the nose in a redirect).
   */
  private turnTowardNose(v: Vector3, degrees: number, capped = false): Vector3 {
    if (degrees === 0) return v;
    const { up, nose } = this;
    nose.copy(this.boardForward).addScaledVector(up, -this.boardForward.dot(up));
    if (nose.lengthSq() < 1e-8) return v;
    nose.normalize();
    const sign = this.scratch.crossVectors(v, nose).dot(up) >= 0 ? 1 : -1;
    // Landing, no further than the nose (or the tail): the feet still arriving, their line swings.
    let angle = (degrees * Math.PI) / 180;
    if (capped) {
      const toNose = Math.acos(Math.min(1, Math.max(-1, v.dot(nose))));
      angle = angle > 0 ? Math.min(angle, toNose) : Math.max(angle, toNose - Math.PI);
    }
    return v.applyQuaternion(this.turn.setFromAxisAngle(up, sign * angle));
  }

  private placeHips(position: Vector3): void {
    const hips = this.rest.get(BONES.hips)!.bone;
    hips.position.copy(position);
    if (hips.parent) {
      hips.parent.updateMatrixWorld(true);
      hips.parent.worldToLocal(hips.position);
    }
    this.orient(BONES.hips, this.up, this.hipsForward);
  }

  /**
   * How far above the physics' pelvis the hips go standing: the model's hips over
   * its ankles with both knees at the key pose's `kneeTall` for this stance, less the
   * physics' standing pelvis over its ankles (`STANDING_PELVIS`). Constant while
   * the feet stay put, so the physics' crouch drop moves the hips as it comes.
   */
  private standingLift(state: RiderVisualState): number {
    const { liftUp: up, target, middle } = this;
    const knee = ((180 - this.pose.kneeTall) * Math.PI) / 180;
    const reach = Math.sqrt(this.upperLeg ** 2 + this.lowerLeg ** 2 - 2 * this.upperLeg * this.lowerLeg * Math.cos(knee));
    let height = 0;
    for (const side of SIDES) {
      this.ankleTarget(state, side, target);
      middle.copy(state.points[POINT.pelvis]).addScaledVector(this.left, side === 'left' ? this.hipHalfWidth : -this.hipHalfWidth).sub(target);
      middle.addScaledVector(up, -middle.dot(up));
      height += Math.sqrt(Math.max(0, reach * reach - middle.lengthSq())) + this.hipDrop;
    }
    return height / SIDES.length - (STANDING_PELVIS - this.soleHeight);
  }

  /**
   * How far the hips must come down along `axis` (the body's up) for a hip to be
   * within `reach` of its ankle target, the leg's stretch brought under `reach`
   * smoothly (`softCap` over `legEase` of the leg's length).
   */
  private dropToReach(hip: Vector3, target: Vector3, reach: number, axis: Vector3 = this.up): number {
    const offset = this.middle.subVectors(hip, target);
    const distance = offset.length();
    const wanted = softCap(distance, reach, RIG_DETAIL.legEase * this.legLength);
    if (wanted >= distance) return 0;
    const along = offset.dot(axis);
    const discriminant = along * along - (distance * distance - wanted * wanted);
    return Math.max(0, discriminant >= 0 ? along - Math.sqrt(discriminant) : along);
  }

  private isRearFoot(state: RiderVisualState, side: Side): boolean {
    const foot = state.points[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
    const other = state.points[side === 'left' ? POINT.rightFoot : POINT.leftFoot];
    return this.middle.subVectors(other, foot).dot(this.boardForward) > 0;
  }

  /** A standing foot points across the deck toward the chest's side, turned toward the nose to the key pose's angle to the stringer. */
  private footForward(state: RiderVisualState, side: Side, out: Vector3): Vector3 {
    const { boardUp, nose } = this;
    out.copy(this.forward).addScaledVector(boardUp, -this.forward.dot(boardUp)).normalize();
    nose.copy(this.boardForward).addScaledVector(boardUp, -this.boardForward.dot(boardUp)).normalize();
    const degrees = 90 - (this.isRearFoot(state, side) ? this.pose.foot.rear : this.pose.foot.front);
    const turn = (degrees * Math.PI) / 180;
    return out.multiplyScalar(Math.cos(turn)).addScaledVector(nose, Math.sin(turn)).normalize();
  }

  /**
   * Which way a standing knee bends: the front one where the chest faces before
   * the hinge; the rear one caving in toward the front foot, its foot's line
   * turned toward the nose and down by the key pose's `rearKneeIn`.
   */
  private kneePole(state: RiderVisualState, side: Side, out: Vector3): Vector3 {
    if (!this.isRearFoot(state, side)) return out.copy(this.kneeFacing);
    const { boardUp } = this;
    const { kneeSquare: square, kneeNose: nose } = this;
    square.copy(this.forward).addScaledVector(boardUp, -this.forward.dot(boardUp)).normalize();
    nose.copy(this.boardForward).addScaledVector(boardUp, -this.boardForward.dot(boardUp)).normalize();
    const turn = ((90 - this.pose.foot.rear + this.pose.rearKneeIn.toward) * Math.PI) / 180;
    const down = (this.pose.rearKneeIn.down * Math.PI) / 180;
    out.copy(square).multiplyScalar(Math.cos(turn)).addScaledVector(nose, Math.sin(turn)).normalize();
    return out.multiplyScalar(Math.cos(down)).addScaledVector(boardUp, -Math.sin(down));
  }

  /**
   * Standing, the drawn hips moved back along the stance toward the key pose's
   * weight (`StandingPose.weight`), eased in by the standing blend: drawn only.
   */
  private weighBack(state: RiderVisualState, hipsAt: Vector3): void {
    const { pivot, keep, most } = this.pose.weight;
    // Along the deck, as the stance gauge reads the weight: a board planing nose up under an upright body sits its
    // hips forward along the deck, and the front knee bends for it.
    const nose = this.boardForward;
    const front = state.points[this.blend.stance === 'regular' ? POINT.leftFoot : POINT.rightFoot].dot(nose);
    const rear = state.points[this.blend.stance === 'regular' ? POINT.rightFoot : POINT.leftFoot].dot(nose);
    const span = front - rear;
    if (span < 0.1) return;
    const weight = (hipsAt.dot(nose) - rear) / span;
    if (weight <= pivot) return;
    // Not in a turn: the bottom turn's preparation goes to the front foot (the owner's call, §10.2).
    const back = Math.min(most, (1 - keep) * (weight - pivot) * span) * (1 - Math.abs(this.blend.turn));
    hipsAt.addScaledVector(nose, -state.standingBlend * back);
  }


  /** Where a standing ankle goes: above the foot point by the sole's height, behind it by half the foot. */
  private ankleTarget(state: RiderVisualState, side: Side, out: Vector3): Vector3 {
    const point = state.points[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
    this.footForward(state, side, this.footDirection);
    return out.copy(point).addScaledVector(this.boardUp, this.soleHeight).addScaledVector(this.footDirection, -this.heelToMidfoot);
  }

  /** Aims a limb's two bones at its solved joints, their fronts toward the bend (or the pole when straight). */
  private aimLimb(upperName: string, lowerName: string, root: Vector3, mid: Vector3, end: Vector3, pole: Vector3): void {
    const { bend } = this;
    bend.subVectors(mid, this.middle.copy(root).lerp(end, 0.5));
    if (bend.lengthSq() < 1e-10) bend.copy(pole);
    this.orient(upperName, this.direction.subVectors(mid, root), bend);
    this.orient(lowerName, this.direction.subVectors(end, mid), bend);
  }

  /** Returns a bone to its rest turn against its parent (a clavicle or toes not driven this solve). */
  private restLocal(name: string): void {
    const bone = this.bones.get(name)!;
    bone.quaternion.copy(this.localRests.get(bone)!);
    bone.updateMatrixWorld(true);
  }

  /** Curls each finger joint by `degrees` about its local x axis from its rest. */
  private curlFingers(side: Side, degrees: number): void {
    this.curl.setFromAxisAngle(this.xAxis, (degrees * Math.PI) / 180);
    for (const finger of BONES.fingers[side]) {
      for (const name of finger) {
        const bone = this.bones.get(name);
        const rest = bone && this.fingerRests.get(bone);
        if (!bone || !rest) continue;
        bone.quaternion.copy(rest).multiply(this.curl);
        bone.updateMatrixWorld(true);
      }
    }
  }
}
