import { Quaternion, Vector3, type Bone } from 'three';
import { BONES, MIDDLE_FINGER, REQUIRED_BONES, type Side } from './humanoidBones';
import { orientBone } from './orientBone';
import { STANDING_PELVIS } from './posturePoints';
import { POINT, type RiderVisualState } from './riderVisualState';
import { solveTwoBone } from './twoBoneIk';

const SIDES: readonly Side[] = ['left', 'right'];
/** The bind pose faces +z with +y up (glTF from Blender's −Y forward). */
const REST_FORWARD = new Vector3(0, 0, 1);
const REST_BACK = new Vector3(0, 0, -1);
const REST_UP = new Vector3(0, 1, 0);
const WORLD_UP = new Vector3(0, 1, 0);

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
  /** The hips and chest turn from the toe side toward the nose while upright. */
  hipsTurn: 10,
  chestTurn: 25,
  /** The front foot turns toward the nose more than the rear foot. */
  frontFootTurn: 20,
  rearFootTurn: 5,
  /** Standing elbows drop below the line from shoulder to hand, a little behind it. */
  elbowDrop: 1,
  elbowBack: 0.3,
  /** The rear knee turns in toward the front foot. */
  rearKneeIn: 0.5,
  /** Finger curl: relaxed, and cupped while stroking. */
  fingerCurlRelaxed: 12,
  fingerCurlStroke: 32,
  /** A fallen limb reaches this share of its length through its centre point. */
  fallenReach: 0.92,
  /** Legs stop this short of straight when the hips come down to reach the feet. */
  legReach: 0.97,
  /**
   * The knees standing tall (de Sousa 2022: 150° or more extended): the physics'
   * standing pelvis maps to the hips with both knees at this, so its crouch drop
   * bends them from there (90–110° crouched, 90° or less compressed).
   */
  standingKnee: 155,
  /**
   * Standing, the head looks where the board goes: along its travel, led into a
   * turn by the turn over `lookAhead`, s, within `neckTurn` of the chest, and
   * pitched down the face or up it by the climb against the speed, within
   * `lookPitch` (de Sousa 2022: the head toward the lip in the bottom turn).
   */
  lookAhead: 0.4,
  neckTurn: 80,
  lookPitch: 30,
  /**
   * Standing, the chest turns into a turn by the turn over `twistGain`, s, within
   * `twistMost`, and the hips by `hipsTwistShare` of that: the shoulders lead the
   * hips (de Sousa 2022: the trunk rotates, the chest toward the lip).
   */
  twistGain: 0.25,
  twistMost: 35,
  hipsTwistShare: 0.35,
  /**
   * Standing, in a turn the leading arm (the front foot's side) reaches
   * `leadReach` of its length where the head looks, raised `leadRaise`°, blended
   * in by the turn over `armLeadRate`, rad/s (de Sousa 2022: the leading arm
   * toward the lip). A hand reaching down past the hips (E's, or Compress's
   * inside hand) is the physics' own: the spine bends toward it, in the plane of
   * the shoulder and the hand, up to `reachBend`° (folding forward over the toes
   * frontside: the reference's hips flexed to 90° or less), until the arm reaches.
   */
  leadReach: 0.9,
  leadRaise: 15,
  armLeadRate: 1.5,
  reachBend: 60,
  /**
   * The snap (de Sousa 2022's final phase: the weight to the back foot, the trunk
   * rotating, the chest and the leading arm toward the lip; the stances spec's
   * video). The weight is where the pelvis sits over the stance, level, as a
   * share of the stance from its middle: the body rides upright, so riding level
   * it sits over the middle, with the weight fully back (S) 31 % behind, and
   * climbing the face nose-up it sits back over the tail whatever the weight
   * (read along the pitched board, its pitch read as weight: the final review).
   * From `snapFrom` to `snapFull` the weight goes onto the back foot. In a turn,
   * blended in as the leading arm is, the chest turns up to `snapTwist`° further
   * into it and the leading arm rises to `snapRaise`°.
   */
  snapFrom: -0.05,
  snapFull: -0.3,
  snapTwist: 30,
  snapRaise: 60,
  /**
   * The wipeout spec. Ducking, the head tucks down toward the deck and the arms
   * straighten onto the rails (the hands slide along the rail to an arm's
   * reach). Swimming, the arms crawl round the shoulders at `crawlRate` strokes a
   * second each, alternating, `crawlReach` of the arm out, and the feet flutter
   * `kick` m at `kickRate` a second.
   */
  duckArmReach: 0.97,
  crawlRate: 0.8,
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
  /** Standing, how far the weight is back for the snap, 0 to 1, this solve. */
  private back = 0;
  // Scratch, one per role so helpers never share one.
  private readonly up = new Vector3();
  private readonly forward = new Vector3();
  private readonly left = new Vector3();
  private readonly boardUp = new Vector3();
  private readonly boardForward = new Vector3();
  /** The board's forward, level. */
  private readonly level = new Vector3();
  private readonly chestUp = new Vector3();
  private readonly hipsForward = new Vector3();
  private readonly target = new Vector3();
  private readonly hipsAt = new Vector3();
  private readonly bendAxis = new Vector3();
  private readonly pivot = new Vector3();
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
    this.footDrop = ankle.y - ball.y;
    this.footRun = Math.hypot(ball.x - ankle.x, ball.z - ankle.z);
    this.heelToMidfoot = this.footRun / 2;
  }

  /** The crawl's phase, in strokes, and the clock it was advanced to. */
  private crawlPhase = 0;
  private crawlClock = Number.NaN;

  solve(state: RiderVisualState): void {
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
    else forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
    this.perpendicular(forward, up);
    left.crossVectors(up, forward).normalize();
    this.turnTowardNose(hipsForward.copy(forward), upright ? RIG_DETAIL.hipsTurn : 0);
    this.turnTowardNose(this.facing.copy(forward), upright ? RIG_DETAIL.chestTurn : 0);
    this.back = state.phase === 'standing' ? this.weightBack(state) : 0;
    if (state.phase === 'standing') {
      const most = (RIG_DETAIL.twistMost * Math.PI) / 180;
      const snap = this.back * Math.min(1, Math.abs(state.yawRate) / RIG_DETAIL.armLeadRate);
      const twist = state.standingBlend * Math.max(-most, Math.min(most, RIG_DETAIL.twistGain * state.yawRate))
        + (Math.sign(state.yawRate) * snap * RIG_DETAIL.snapTwist * Math.PI) / 180;
      this.facing.applyAxisAngle(up, twist);
      hipsForward.applyAxisAngle(up, RIG_DETAIL.hipsTwistShare * twist);
    }

    // 2. The hips at the pelvis point (standing, raised to the model's extended legs), brought down if the legs cannot reach the feet.
    const hipsAt = this.hipsAt.copy(p[POINT.pelvis]);
    if (upright) hipsAt.addScaledVector(up, state.uprightBlend * this.standingLift(state));
    this.placeHips(hipsAt);
    if (upright) {
      let drop = 0;
      for (const side of SIDES) {
        this.ankleTarget(state, side, target);
        const hip = this.bones.get(BONES.upLeg[side])!.getWorldPosition(this.scratch);
        drop = Math.max(drop, this.dropToReach(hip, target, RIG_DETAIL.legReach * this.legLength));
      }
      if (drop > 0) this.placeHips(hipsAt.addScaledVector(up, -drop));
    }

    // 3. Spine, neck and head: the chest turns toward the nose, the head looks where the board goes.
    chestUp.subVectors(p[POINT.head], p[POINT.torso]);
    if (chestUp.lengthSq() < 1e-10) chestUp.copy(up);
    chestUp.normalize();
    this.orientSpine(chestUp);
    if (state.phase === 'standing') this.bendToReach(state, chestUp);
    this.orient(BONES.neck, chestUp, this.facing);
    if (lying) {
      // Ducking, the head tucks from looking ahead to facing the deck, crown toward the nose.
      const duck = state.phase === 'prone' ? Math.min(1, Math.max(0, state.duck)) : 0;
      this.direction.copy(boardUp).addScaledVector(boardForward, 0.3).lerp(this.scratch.copy(boardForward).addScaledVector(boardUp, 0.2), duck);
      this.orient(BONES.head, this.direction, this.hint.copy(boardForward).lerp(this.middle.copy(boardUp).negate(), duck));
    }
    else if (state.phase === 'standing') this.lookWhereGoing(state);
    else if (upright) this.orient(BONES.head, WORLD_UP, this.hint.copy(boardForward).lerp(this.facing, 0.25));
    else this.orient(BONES.head, chestUp, this.facing);

    // 4. Arms.
    for (const side of SIDES) {
      const outward = this.scratch.copy(left).multiplyScalar(side === 'left' ? 1 : -1);
      if (state.phase === 'prone') pole.copy(boardUp).addScaledVector(outward, 0.5);
      else if (state.phase === 'push') pole.copy(boardForward).negate().addScaledVector(boardUp, 0.3);
      else if (upright) pole.copy(WORLD_UP).multiplyScalar(-RIG_DETAIL.elbowDrop).addScaledVector(this.facing, -RIG_DETAIL.elbowBack);
      else pole.copy(this.facing).negate();
      const shoulder = this.bones.get(BONES.arm[side])!.getWorldPosition(this.joints.shoulder[side]);
      const hand = p[side === 'left' ? POINT.leftHand : POINT.rightHand];
      if (fallen && state.swim.stroking) this.crawlHand(state, side, shoulder, target);
      else if (fallen) target.subVectors(hand, shoulder).setLength(RIG_DETAIL.fallenReach * this.armLength).add(shoulder);
      else if (state.phase === 'prone' && state.duck > 0.3) this.straightOnRail(hand, shoulder, target);
      else target.copy(hand);
      if (state.phase === 'standing' && !this.reachingDown(hand) && !this.isRearFoot(state, side)) this.leadArm(state, shoulder, target);
      solveTwoBone(shoulder, this.upperArm, this.lowerArm, target, pole, this.joints.elbow[side], this.joints.wrist[side]);
      this.aimLimb(BONES.arm[side], BONES.foreArm[side], shoulder, this.joints.elbow[side], this.joints.wrist[side], pole);
      this.orient(BONES.hand[side], this.direction.subVectors(this.joints.wrist[side], this.joints.elbow[side]), fallen ? this.facing : boardUp);
      const curl = state.phase === 'prone'
        ? RIG_DETAIL.fingerCurlRelaxed + (RIG_DETAIL.fingerCurlStroke - RIG_DETAIL.fingerCurlRelaxed) * state.stroking
        : RIG_DETAIL.fingerCurlRelaxed;
      this.curlFingers(side, curl);
    }

    // 5. Legs and feet.
    for (const side of SIDES) {
      const hip = this.bones.get(BONES.upLeg[side])!.getWorldPosition(this.joints.hip[side]);
      const foot = p[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
      if (upright) {
        this.ankleTarget(state, side, target);
        pole.copy(this.facing);
        if (this.isRearFoot(state, side)) pole.addScaledVector(boardForward, RIG_DETAIL.rearKneeIn);
      } else {
        if (fallen) target.subVectors(foot, hip).setLength(RIG_DETAIL.fallenReach * this.legLength).add(hip);
        else target.copy(foot);
        if (fallen && state.swim.stroking) {
          // The flutter kick: the feet beat up and down, alternating.
          const beat = Math.cos(2 * Math.PI * (RIG_DETAIL.kickRate * state.clock + (side === 'left' ? 0 : 0.5)));
          target.addScaledVector(this.facing, RIG_DETAIL.kick * beat);
        }
        pole.copy(lying ? this.scratch.copy(boardUp).negate() : this.facing);
      }
      solveTwoBone(hip, this.upperLeg, this.lowerLeg, target, pole, this.joints.knee[side], this.joints.ankle[side]);
      this.aimLimb(BONES.upLeg[side], BONES.leg[side], hip, this.joints.knee[side], this.joints.ankle[side], pole);
      if (upright) {
        // The sole flat on the deck: the foot keeps its rest pitch along the stance direction.
        this.footForward(state, side, this.footDirection);
        this.direction.copy(this.footDirection).multiplyScalar(this.footRun).addScaledVector(boardUp, -this.footDrop);
        this.orient(BONES.foot[side], this.direction, boardUp);
      } else {
        // Toes pointed along the shin; lying, the top of the foot faces the deck.
        this.direction.subVectors(this.joints.ankle[side], this.joints.knee[side]);
        this.orient(BONES.foot[side], this.direction, lying ? this.hint.copy(boardUp).negate() : this.facing);
      }
    }
  }

  /** The spine from the hips' up to `chestUp`, turning from the hips' facing to the chest's. */
  private orientSpine(chestUp: Vector3): void {
    BONES.spine.forEach((name, i) => {
      const w = (i + 1) / 3;
      this.orient(name, this.direction.copy(this.up).lerp(chestUp, w), this.hint.copy(this.hipsForward).lerp(this.facing, w));
    });
  }

  /** A hand below the hips reaches down (the physics' hand in the face or toward the water), not held out. */
  private reachingDown(hand: Vector3): boolean {
    return hand.y < this.hipsAt.y;
  }

  /**
   * Standing, bends the spine toward a hand reaching down past the arm's length
   * (the physics' hand in the face, or Compress's inside hand at the water), in the
   * plane of the shoulder and the hand about the hips, so it folds forward over the
   * toes as well as sideways: the least bend that reaches, within `reachBend`,
   * checked on the solved shoulder (the spine spreads a bend over its bones) and
   * eased in by the standing blend. Leaves `chestUp` bent as the spine is.
   */
  private bendToReach(state: RiderVisualState, chestUp: Vector3): void {
    const { bendAxis, pivot, middle } = this;
    if (state.standingBlend <= 0) return;
    this.bones.get(BONES.hips)!.getWorldPosition(pivot);
    const reach = RIG_DETAIL.legReach * this.armLength;
    // The reaching hand farthest out of reach.
    let side: Side | undefined;
    let short = 0;
    for (const candidate of SIDES) {
      const hand = state.points[candidate === 'left' ? POINT.leftHand : POINT.rightHand];
      if (!this.reachingDown(hand)) continue;
      const gap = this.bones.get(BONES.arm[candidate])!.getWorldPosition(this.target).distanceTo(hand) - reach;
      if (gap > short) {
        short = gap;
        side = candidate;
      }
    }
    if (!side) return;
    const hand = middle.subVectors(state.points[side === 'left' ? POINT.leftHand : POINT.rightHand], pivot);
    const shoulderOf = () => this.bones.get(BONES.arm[side])!.getWorldPosition(this.target).sub(pivot);
    bendAxis.crossVectors(shoulderOf(), hand);
    if (bendAxis.lengthSq() < 1e-10) return;
    bendAxis.normalize();
    const base = this.chestBase.copy(chestUp);
    const most = (RIG_DETAIL.reachBend * Math.PI) / 180;
    let total = 0;
    for (let pass = 0; pass < 4 && total < most; pass += 1) {
      const shoulder = shoulderOf();
      if (shoulder.distanceTo(hand) <= reach) break;
      // A rigid turn of the solved shoulder toward the hand about the axis: the least that reaches, or the nearest.
      const s = this.bend.copy(shoulder).addScaledVector(bendAxis, -shoulder.dot(bendAxis));
      const h = this.nose.copy(hand).addScaledVector(bendAxis, -hand.dot(bendAxis));
      const toward = Math.min(most - total, Math.max(0, Math.atan2(this.scratch.crossVectors(s, h).dot(bendAxis), s.dot(h))));
      let best = 0;
      let nearest = shoulder.distanceTo(hand);
      for (let i = 1; i <= 12; i += 1) {
        const angle = (toward * i) / 12;
        const distance = this.hint.copy(shoulder).applyAxisAngle(bendAxis, angle).distanceTo(hand);
        if (distance < nearest) {
          nearest = distance;
          best = angle;
        }
        if (distance <= reach) break;
      }
      if (best <= 1e-4) break;
      total = Math.min(most, total + best);
      this.orientSpine(chestUp.copy(base).applyAxisAngle(bendAxis, total));
    }
    if (total > 0 && state.standingBlend < 1) this.orientSpine(chestUp.copy(base).applyAxisAngle(bendAxis, state.standingBlend * total));
  }

  /** Standing, how far the weight is back (`RIG_DETAIL.snapFrom`): where the pelvis sits over the stance, level, 0 to 1. */
  private weightBack(state: RiderVisualState): number {
    const p = state.points;
    const f = this.level.copy(this.boardForward).setY(0);
    if (f.lengthSq() < 1e-8) return 0;
    f.normalize();
    const left = p[POINT.leftFoot].dot(f);
    const right = p[POINT.rightFoot].dot(f);
    const span = Math.abs(left - right);
    if (span < 1e-3) return 0;
    const ahead = (p[POINT.pelvis].dot(f) - (left + right) / 2) / span;
    return state.standingBlend * Math.max(0, Math.min(1, (RIG_DETAIL.snapFrom - ahead) / (RIG_DETAIL.snapFrom - RIG_DETAIL.snapFull)));
  }

  /** Standing, the leading arm reaching where the head looks, blended in by the turn, raised with the weight back. */
  private leadArm(state: RiderVisualState, shoulder: Vector3, target: Vector3): void {
    const weight = state.standingBlend * Math.min(1, Math.abs(state.yawRate) / RIG_DETAIL.armLeadRate);
    if (weight <= 0) return;
    const raise = ((RIG_DETAIL.leadRaise + (RIG_DETAIL.snapRaise - RIG_DETAIL.leadRaise) * this.back) * Math.PI) / 180;
    const aim = this.pole2.copy(this.look).multiplyScalar(Math.cos(raise)).addScaledVector(WORLD_UP, Math.sin(raise)).normalize();
    target.lerp(this.direction.copy(shoulder).addScaledVector(aim, RIG_DETAIL.leadReach * this.armLength), weight);
  }

  /** Standing, the head along the board's travel led into the turn, within the neck's reach, pitched with the climb. */
  private lookWhereGoing(state: RiderVisualState): void {
    const { look, hint, direction } = this;
    look.copy(state.travel).setY(0);
    if (look.lengthSq() < 1e-8) look.copy(this.boardForward).setY(0);
    if (look.lengthSq() < 1e-8) look.set(0, 0, 1);
    look.normalize().applyAxisAngle(WORLD_UP, RIG_DETAIL.lookAhead * state.yawRate);
    hint.copy(this.facing).setY(0);
    if (hint.lengthSq() > 1e-8) {
      hint.normalize();
      const turn = Math.atan2(this.scratch.crossVectors(hint, look).y, hint.dot(look));
      const most = (RIG_DETAIL.neckTurn * Math.PI) / 180;
      if (Math.abs(turn) > most) look.copy(hint).applyAxisAngle(WORLD_UP, Math.sign(turn) * most);
    }
    const pitchMost = (RIG_DETAIL.lookPitch * Math.PI) / 180;
    const pitch = Math.max(-pitchMost, Math.min(pitchMost, Math.atan2(state.climb, Math.max(state.speed, 1))));
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
   * The swimmer's crawl: the hand circles the shoulder in the plane of the
   * heading and the vertical, reaching forward, pulling down and back under the
   * body, recovering over the water; the arms half a stroke apart.
   */
  private crawlHand(state: RiderVisualState, side: Side, shoulder: Vector3, out: Vector3): Vector3 {
    const angle = 2 * Math.PI * (this.crawlPhase + (side === 'left' ? 0 : 0.5));
    const reach = RIG_DETAIL.crawlReach * this.armLength;
    this.nose.set(Math.sin(state.heading), 0, Math.cos(state.heading));
    return out.copy(shoulder).addScaledVector(this.nose, reach * Math.cos(angle)).addScaledVector(WORLD_UP, reach * Math.sin(angle));
  }

  /** The crawl advances with the clock, quicker as the breath runs low; a jump in the clock restarts nothing. */
  private advanceCrawl(state: RiderVisualState): void {
    const step = state.clock - this.crawlClock;
    this.crawlClock = state.clock;
    if (!(step > 0 && step < 0.5)) return;
    const breath = Math.min(1, Math.max(0, state.breath));
    this.crawlPhase = (this.crawlPhase + step * RIG_DETAIL.crawlRate * (1 + RIG_DETAIL.panic * (1 - breath))) % 1;
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

  /** Turns `v` (perpendicular to the body's up) about up toward the board's nose, by at most `degrees`. */
  private turnTowardNose(v: Vector3, degrees: number): Vector3 {
    if (degrees <= 0) return v;
    const { up, nose } = this;
    nose.copy(this.boardForward).addScaledVector(up, -this.boardForward.dot(up));
    if (nose.lengthSq() < 1e-8) return v;
    nose.normalize();
    const angle = Math.min((degrees * Math.PI) / 180, Math.acos(Math.min(1, Math.max(-1, v.dot(nose)))));
    const sign = this.scratch.crossVectors(v, nose).dot(up) >= 0 ? 1 : -1;
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
   * its ankles with both knees at `standingKnee` for this stance, less the
   * physics' standing pelvis over its ankles (`STANDING_PELVIS`). Constant while
   * the feet stay put, so the physics' crouch drop moves the hips as it comes.
   */
  private standingLift(state: RiderVisualState): number {
    const { up, target, middle } = this;
    const knee = (RIG_DETAIL.standingKnee * Math.PI) / 180;
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

  /** How far the hips must come down along the body's up for a hip to be `reach` from its ankle target. */
  private dropToReach(hip: Vector3, target: Vector3, reach: number): number {
    const offset = this.middle.subVectors(hip, target);
    const distanceSq = offset.lengthSq();
    if (distanceSq <= reach * reach) return 0;
    const along = offset.dot(this.up);
    const discriminant = along * along - (distanceSq - reach * reach);
    return Math.max(0, discriminant >= 0 ? along - Math.sqrt(discriminant) : along);
  }

  private isRearFoot(state: RiderVisualState, side: Side): boolean {
    const foot = state.points[side === 'left' ? POINT.leftFoot : POINT.rightFoot];
    const other = state.points[side === 'left' ? POINT.rightFoot : POINT.leftFoot];
    return this.middle.subVectors(other, foot).dot(this.boardForward) > 0;
  }

  /** A standing foot points across the deck toward the chest's side, the front foot turned more toward the nose. */
  private footForward(state: RiderVisualState, side: Side, out: Vector3): Vector3 {
    const { boardUp, nose } = this;
    out.copy(this.forward).addScaledVector(boardUp, -this.forward.dot(boardUp)).normalize();
    nose.copy(this.boardForward).addScaledVector(boardUp, -this.boardForward.dot(boardUp)).normalize();
    const degrees = this.isRearFoot(state, side) ? RIG_DETAIL.rearFootTurn : RIG_DETAIL.frontFootTurn;
    const turn = (degrees * Math.PI) / 180;
    return out.multiplyScalar(Math.cos(turn)).addScaledVector(nose, Math.sin(turn)).normalize();
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
