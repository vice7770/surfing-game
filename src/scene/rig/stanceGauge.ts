import { Quaternion, Vector3, type Bone, type Object3D } from 'three';
import type { StanceName } from '../../physics/riderPosture';
import { BOARD_CENTRE, deckAt, railHalfWidth } from './boardDeck';
import { BONES, MIDDLE_FINGER, type Side } from './humanoidBones';
import { POINT, type RiderVisualState } from './riderVisualState';

/**
 * A posed body's joints, in the world (the stance map, the riding-body plan's
 * step 2): the hips' centre (between the hip joints), the spine's base, the
 * neck and head, where the pelvis, chest and head face, and each side's limbs.
 */
export interface StanceJoints {
  hips: Vector3;
  spine: Vector3;
  neck: Vector3;
  head: Vector3;
  pelvisFacing: Vector3;
  chestFacing: Vector3;
  headFacing: Vector3;
  shoulder: Record<Side, Vector3>;
  elbow: Record<Side, Vector3>;
  wrist: Record<Side, Vector3>;
  hip: Record<Side, Vector3>;
  knee: Record<Side, Vector3>;
  ankle: Record<Side, Vector3>;
  toe: Record<Side, Vector3>;
  /** The back of each hand (the rig's: the rest pose's up carried by the hand), unit; zero where unknown (a figure). */
  palm: Record<Side, Vector3>;
}

/**
 * The stance's angles, degrees, and lengths, m, on the board: its frame has x
 * across, y the deck's normal and z the nose; Regular faces −x (the toes'
 * rail), its left foot forward, Goofy +x, its right foot forward.
 */
export interface StanceAngles {
  /** Included at the knee: 180° straight. */
  kneeFront: number;
  kneeRear: number;
  /** Included at the hip, between the trunk and the thigh: 180° standing straight. */
  hipFront: number;
  hipRear: number;
  /**
   * The ankle's flexion: how far the shin has closed on the foot from its rest
   * (a skeleton's gauge); from joints alone, the shin's tilt from the deck's
   * normal (the foot flat on the deck).
   */
  ankleFront: number;
  ankleRear: number;
  /** The trunk (the spine's base to the neck) from the deck's normal, toward the toes (+) or heels. */
  trunkFlexion: number;
  /** The same, toward the nose (+) or tail. */
  trunkPitch: number;
  /**
   * The trunk from the world's vertical, toward the toes (+) or heels: what a
   * picture of the rider shows, the lean into a turn included.
   */
  trunkTilt: number;
  /** The body (the feet's middle to the neck) from the world's vertical, toward the toes (+) or heels. */
  lean: number;
  /** Where the chest, the pelvis and the head face, on the deck: 0 toward the toes, + toward the nose. */
  chestTwist: number;
  hipTwist: number;
  headYaw: number;
  /** The head's look below the deck's plane (+). */
  headPitch: number;
  /** The upper arm from the trunk's down: 0 hanging, 90 out, 180 overhead; the lead arm is the front foot's side. */
  leadArm: number;
  trailArm: number;
  /** Included at the elbow: 180° straight. */
  leadElbow: number;
  trailElbow: number;
  /** The lower wrist's height above the board's centre (about the waterline), m, in the world. */
  lowHand: number;
  /** The ankles apart along the stringer, m. */
  stanceWidth: number;
  /** The hips' centre along the stringer from the rear ankle (0) to the front ankle (1); none (NaN) with the feet under `STANCE_MIN` apart. */
  weight: number;
  /** Each foot's angle to the stringer on the deck, from the ankle to the toes: 90° square across (the animation-realism plan). */
  footFront: number;
  footRear: number;
  /** Which way the rear knee bends, on the deck: 0 toward the toes, + toward the nose (caving in toward the front foot). */
  rearKneeIn: number;
  /** The lead shoulder below the trailing one, as a picture shows it: the shoulders' line against the level, + lead lower. */
  shoulderDrop: number;
  /** The rear knee's height over the deck beneath it, m (the tube's dropped knee; the animation-realism plan, phase 2). */
  rearKneeDeck: number;
  /** The trailing wrist from the heels' rail and from the toes' rail at its place along the board, m (the tube's rail grab). */
  trailHeelRail: number;
  trailToeRail: number;
  /** The trailing wrist from the front ankle along the board, m (the pig-dog's grab by the front foot). */
  trailFromFront: number;
  /** The lead arm (the shoulder to the wrist) from the board's nose, °: pointing at the tube's exit, low and close. */
  leadToNose: number;
  /**
   * Lying and sitting (the animation-realism plan's phase 3). The trunk (the
   * spine's base to the neck) above the deck's plane, °: the paddler's chest
   * lift, the catch's cobra.
   */
  chestLift: number;
  /** The wrist farthest ahead under the waterline (the board's centre), ahead of the face (`FACE_DEPTH`) along the board, m (the stroke's entry; none above water). */
  handAhead: number;
  /** The deeper wrist under the waterline, m (+ below; the pull's depth). */
  pullDepth: number;
  /** The ankles apart across the board, m (lying, the legs together). */
  legsApart: number;
  /** The trunk from the world's vertical, any way, ° (sitting upright). */
  sitTrunk: number;
  /** The hips' centre over the deck beneath it, m (sitting on the board). */
  hipsDeck: number;
  /** The wrists apart, m (the push's hands). */
  handsApart: number;
  /** The wrists' middle behind the trunk's middle (between the spine's base and the neck), along the board, m (the push's hands at the lower ribs). */
  handsBack: number;
  /** The back of the hand from the deck's normal, the larger of the two hands, ° (the push's flat palms). */
  palmFlat: number;
  /**
   * Fallen (the animation-realism plan's phase 4). The farther wrist from the
   * head's centre (`HEAD_CENTRE` up the neck's line from the skull's base), m:
   * the forearms shielding the head.
   */
  wristsToHead: number;
  /** The lower wrist above the head's centre along the neck's line, m: the arms crossed overhead, surfacing. */
  wristsOverHead: number;
  /**
   * The farther wrist from the near rail's middle, m: from its edge (the deck's
   * height at the rail) within `RAIL_MIDDLE` m of mid-length, on the side the
   * hands' middle is (climbing back on, both hands on the rail).
   */
  railGrip: number;
}

export type StanceMeasure = keyof StanceAngles;

export interface BoardPose {
  readonly boardPosition: Vector3;
  readonly boardQuaternion: Quaternion;
}

const SIDES: readonly Side[] = ['left', 'right'];
/** The face's place ahead of the head joint (the skull's base) along where the head faces, m: about a skull's depth (the sheet's mannequin draws its skull 0.08 m up the neck, 0.105 m round). */
const FACE_DEPTH = 0.1;
/** The head's centre above the head joint (the skull's base) along the neck's line, m: the sheet's mannequin draws its skull 0.08 m up, 0.105 m round. */
export const HEAD_CENTRE = 0.09;
/** The rail's middle: within this of the board's mid-length, m (the animation-realism plan's phase 4: both hands there to climb on). */
export const RAIL_MIDDLE = 0.3;
/** Feet closer than this along the stringer, m, stand no stance to share the weight between (a landing's feet still arriving). */
export const STANCE_MIN = 0.1;
const DEG = 180 / Math.PI;
const DECK_UP = new Vector3(0, 1, 0);
const NOSE = new Vector3(0, 0, 1);
const WORLD_UP = new Vector3(0, 1, 0);

/** The angle between two vectors, degrees: finite and exact near 0° and 180°. */
function angle(a: Vector3, b: Vector3): number {
  return Math.atan2(scratch.crossVectors(a, b).length(), a.dot(b)) * DEG;
}
const scratch = new Vector3();

const sided = (): Record<Side, Vector3> => ({ left: new Vector3(), right: new Vector3() });

export function createStanceJoints(): StanceJoints {
  return {
    hips: new Vector3(), spine: new Vector3(), neck: new Vector3(), head: new Vector3(),
    pelvisFacing: new Vector3(), chestFacing: new Vector3(), headFacing: new Vector3(),
    shoulder: sided(), elbow: sided(), wrist: sided(), hip: sided(), knee: sided(), ankle: sided(), toe: sided(), palm: sided(),
  };
}

/** The stance's angles from a body's joints (`measure` for a posed skeleton). */
export function measureJoints(joints: StanceJoints, board: BoardPose, stance: StanceName, restAnkle?: number): StanceAngles {
  const inverse = new Quaternion().copy(board.boardQuaternion).invert();
  const local = (point: Vector3) => point.clone().sub(board.boardPosition).applyQuaternion(inverse);
  const direction = (vector: Vector3) => vector.clone().applyQuaternion(inverse);
  const front: Side = stance === 'regular' ? 'left' : 'right';
  const rear: Side = front === 'left' ? 'right' : 'left';
  const toes = new Vector3(stance === 'regular' ? -1 : 1, 0, 0);
  // On the deck: where a facing points, from the toes toward the nose.
  const twist = (facing: Vector3) => {
    const f = direction(facing);
    return Math.atan2(f.dot(NOSE), f.dot(toes)) * DEG;
  };
  const trunk = direction(scratch.copy(joints.neck).sub(joints.spine));
  const down = scratch.copy(joints.spine).sub(joints.neck).clone();
  const knee = (side: Side) => angle(joints.hip[side].clone().sub(joints.knee[side]), joints.ankle[side].clone().sub(joints.knee[side]));
  const hip = (side: Side) => angle(joints.neck.clone().sub(joints.spine), joints.knee[side].clone().sub(joints.hip[side]));
  const ankle = (side: Side) => {
    const shin = joints.knee[side].clone().sub(joints.ankle[side]);
    return restAnkle === undefined ? angle(direction(shin), DECK_UP) : restAnkle - angle(shin, joints.toe[side].clone().sub(joints.ankle[side]));
  };
  const arm = (side: Side) => angle(joints.elbow[side].clone().sub(joints.shoulder[side]), down);
  const elbow = (side: Side) => angle(joints.shoulder[side].clone().sub(joints.elbow[side]), joints.wrist[side].clone().sub(joints.elbow[side]));
  // The body's lean against the world: toward the toes' side, level.
  const toesLevel = toes.clone().applyQuaternion(board.boardQuaternion).projectOnPlane(WORLD_UP).normalize();
  const body = joints.neck.clone().sub(joints.ankle.left.clone().add(joints.ankle.right).multiplyScalar(0.5));
  const worldTrunk = joints.neck.clone().sub(joints.spine);
  const head = direction(joints.headFacing);
  const frontAnkle = local(joints.ankle[front]);
  const rearAnkle = local(joints.ankle[rear]);
  const span = frontAnkle.z - rearAnkle.z;
  const foot = (side: Side) => {
    const along = direction(joints.toe[side].clone().sub(joints.ankle[side]));
    return Math.atan2(Math.abs(along.x), Math.abs(along.z)) * DEG;
  };
  const kneeBend = direction(joints.knee[rear].clone().sub(joints.hip[rear].clone().add(joints.ankle[rear]).multiplyScalar(0.5)));
  const shoulders = joints.shoulder[front].clone().sub(joints.shoulder[rear]);
  // In the shape's frame (about the board's centre of mass): the deck and the rails.
  const shape = (point: Vector3) => local(point).add(BOARD_CENTRE);
  const rearKnee = shape(joints.knee[rear]);
  const trail = shape(joints.wrist[rear]);
  const toesSign = toes.x;
  const rail = (sign: number) => Math.hypot(trail.x - sign * railHalfWidth(trail.z), trail.y - deckAt(trail.z));
  const leadArm = direction(joints.wrist[front].clone().sub(joints.shoulder[front]));
  // Lying and sitting: the waterline at the board's centre (as `lowHand` reads it), the head and the wrists on the board.
  const waterline = board.boardPosition.y;
  // The face: the head joint (the skull's base) and a skull's depth along where the head faces.
  const headAlong = local(joints.head.clone().addScaledVector(joints.headFacing.clone().normalize(), FACE_DEPTH)).z;
  const under = SIDES.filter((side) => joints.wrist[side].y < waterline);
  const middle = local(joints.spine.clone().add(joints.neck).multiplyScalar(0.5));
  const hipsShape = shape(joints.hips);
  const palms = SIDES.filter((side) => joints.palm[side].lengthSq() > 1e-12);
  // Fallen: the head's centre, up the neck's line; the near rail, on the chest's side.
  const neckLine = joints.head.clone().sub(joints.neck);
  if (neckLine.lengthSq() < 1e-12) neckLine.set(0, 1, 0);
  neckLine.normalize();
  const skull = joints.head.clone().addScaledVector(neckLine, HEAD_CENTRE);
  // The rail the hands are at: the one their middle is nearer.
  const handsShape = shape(joints.wrist.left.clone().add(joints.wrist.right).multiplyScalar(0.5));
  const near = handsShape.x >= 0 ? 1 : -1;
  const fromRail = (side: Side) => {
    const wrist = shape(joints.wrist[side]);
    const z = Math.max(-RAIL_MIDDLE, Math.min(RAIL_MIDDLE, wrist.z));
    return Math.hypot(wrist.x - near * railHalfWidth(z), wrist.y - deckAt(z), wrist.z - z);
  };
  return {
    kneeFront: knee(front),
    kneeRear: knee(rear),
    hipFront: hip(front),
    hipRear: hip(rear),
    ankleFront: ankle(front),
    ankleRear: ankle(rear),
    trunkFlexion: Math.atan2(trunk.dot(toes), trunk.dot(DECK_UP)) * DEG,
    trunkPitch: Math.atan2(trunk.dot(NOSE), trunk.dot(DECK_UP)) * DEG,
    trunkTilt: Math.atan2(worldTrunk.dot(toesLevel), worldTrunk.dot(WORLD_UP)) * DEG,
    lean: Math.atan2(body.dot(toesLevel), body.dot(WORLD_UP)) * DEG,
    chestTwist: twist(joints.chestFacing),
    hipTwist: twist(joints.pelvisFacing),
    headYaw: twist(joints.headFacing),
    headPitch: Math.atan2(-head.dot(DECK_UP), Math.hypot(head.x, head.z)) * DEG,
    leadArm: arm(front),
    trailArm: arm(rear),
    leadElbow: elbow(front),
    trailElbow: elbow(rear),
    lowHand: Math.min(...SIDES.map((side) => joints.wrist[side].clone().sub(board.boardPosition).dot(WORLD_UP))),
    stanceWidth: Math.abs(span),
    weight: Math.abs(span) >= STANCE_MIN ? (local(joints.hips).z - rearAnkle.z) / span : Number.NaN,
    footFront: foot(front),
    footRear: foot(rear),
    rearKneeIn: Math.atan2(kneeBend.dot(NOSE), kneeBend.dot(toes)) * DEG,
    shoulderDrop: Math.asin(Math.max(-1, Math.min(1, -shoulders.y / Math.max(1e-9, shoulders.length())))) * DEG,
    rearKneeDeck: rearKnee.y - deckAt(rearKnee.z),
    trailHeelRail: rail(-toesSign),
    trailToeRail: rail(toesSign),
    trailFromFront: Math.abs(local(joints.wrist[rear]).z - frontAnkle.z),
    leadToNose: angle(leadArm, NOSE),
    chestLift: Math.atan2(trunk.dot(DECK_UP), Math.hypot(trunk.x, trunk.z)) * DEG,
    handAhead: under.length ? Math.max(...under.map((side) => local(joints.wrist[side]).z - headAlong)) : Number.NaN,
    pullDepth: Math.max(...SIDES.map((side) => waterline - joints.wrist[side].y)),
    legsApart: Math.abs(local(joints.ankle.left).x - local(joints.ankle.right).x),
    sitTrunk: angle(worldTrunk, WORLD_UP),
    hipsDeck: hipsShape.y - deckAt(hipsShape.z),
    handsApart: joints.wrist.left.distanceTo(joints.wrist.right),
    handsBack: middle.z - (local(joints.wrist.left).z + local(joints.wrist.right).z) / 2,
    palmFlat: palms.length ? Math.max(...palms.map((side) => angle(direction(joints.palm[side]), DECK_UP))) : Number.NaN,
    wristsToHead: Math.max(...SIDES.map((side) => joints.wrist[side].distanceTo(skull))),
    wristsOverHead: Math.min(...SIDES.map((side) => joints.wrist[side].clone().sub(skull).dot(neckLine))),
    railGrip: Math.max(...SIDES.map(fromRail)),
  };
}

/**
 * Where the free hands hang about the knees (the owner's reference of
 * 2026-10-22: relaxed and close in, framing the knees), m: each wrist's height
 * above its knee in the world; how far the front wrist is ahead of the front
 * knee and the rear wrist from the rear knee, along the board's levelled nose;
 * and how far out from the hips' centre the wider wrist sits along it, against
 * the shoulders' spread (sideways for a body facing the rail).
 */
export interface HandReading {
  frontAboveKnee: number;
  rearAboveKnee: number;
  frontAhead: number;
  rearAlong: number;
  /** The lesser of the two wrists' places in front of their knees, toward the toes, m. */
  inFront: number;
  out: number;
  /** The rear wrist's place out from the hips' centre along the levelled nose, m (the front hand reaches along the line: the photo's). */
  rearOut: number;
  shoulders: number;
}

export function measureHands(joints: StanceJoints, board: BoardPose, stance: StanceName): HandReading {
  const front: Side = stance === 'regular' ? 'left' : 'right';
  const rear: Side = front === 'left' ? 'right' : 'left';
  const nose = new Vector3(0, 0, 1).applyQuaternion(board.boardQuaternion).setY(0);
  if (nose.lengthSq() < 1e-8) nose.set(0, 0, 1);
  nose.normalize();
  const along = (a: Vector3, b: Vector3) => a.clone().sub(b).dot(nose);
  const toes = new Vector3().crossVectors(WORLD_UP, nose).normalize().multiplyScalar(stance === 'regular' ? -1 : 1);
  return {
    frontAboveKnee: joints.wrist[front].y - joints.knee[front].y,
    rearAboveKnee: joints.wrist[rear].y - joints.knee[rear].y,
    frontAhead: along(joints.wrist[front], joints.knee[front]),
    rearAlong: along(joints.wrist[rear], joints.knee[rear]),
    inFront: Math.min(...SIDES.map((side) => joints.wrist[side].clone().sub(joints.knee[side]).dot(toes))),
    out: Math.max(...SIDES.map((side) => Math.abs(along(joints.wrist[side], joints.hips)))),
    rearOut: Math.abs(along(joints.wrist[rear], joints.hips)),
    shoulders: joints.shoulder.left.distanceTo(joints.shoulder.right),
  };
}

/** The measures the physics' seven points set themselves: the rig follows them. */
export type PointMeasure = 'trunkFlexion' | 'trunkPitch' | 'trunkTilt' | 'lean' | 'lowHand' | 'stanceWidth' | 'weight';
export const POINT_MEASURES: readonly PointMeasure[] = ['trunkFlexion', 'trunkPitch', 'trunkTilt', 'lean', 'lowHand', 'stanceWidth', 'weight'];

/**
 * The same measures read from the physics' own points, before the rig: the
 * trunk from the pelvis to the torso's centre, the lean from the feet to the
 * head, the lower hand, the feet's spread and the pelvis between them. Where
 * the drawn body misses a target these meet, the drawing moved it.
 */
export function measurePoints(state: RiderVisualState, stance: StanceName): Pick<StanceAngles, PointMeasure> {
  const inverse = new Quaternion().copy(state.boardQuaternion).invert();
  const local = (point: Vector3) => point.clone().sub(state.boardPosition).applyQuaternion(inverse);
  const toes = new Vector3(stance === 'regular' ? -1 : 1, 0, 0);
  const toesLevel = toes.clone().applyQuaternion(state.boardQuaternion).projectOnPlane(WORLD_UP).normalize();
  const { points } = state;
  const worldTrunk = points[POINT.torso].clone().sub(points[POINT.pelvis]);
  const trunk = worldTrunk.clone().applyQuaternion(inverse);
  const feet = points[POINT.leftFoot].clone().add(points[POINT.rightFoot]).multiplyScalar(0.5);
  const body = points[POINT.head].clone().sub(feet);
  const front = local(points[stance === 'regular' ? POINT.leftFoot : POINT.rightFoot]);
  const rear = local(points[stance === 'regular' ? POINT.rightFoot : POINT.leftFoot]);
  const span = front.z - rear.z;
  return {
    trunkFlexion: Math.atan2(trunk.dot(toes), trunk.dot(DECK_UP)) * DEG,
    trunkPitch: Math.atan2(trunk.dot(NOSE), trunk.dot(DECK_UP)) * DEG,
    trunkTilt: Math.atan2(worldTrunk.dot(toesLevel), worldTrunk.dot(WORLD_UP)) * DEG,
    lean: Math.atan2(body.dot(toesLevel), body.dot(WORLD_UP)) * DEG,
    lowHand: Math.min(points[POINT.leftHand].y, points[POINT.rightHand].y) - state.boardPosition.y,
    stanceWidth: Math.abs(span),
    weight: Math.abs(span) >= STANCE_MIN ? (local(points[POINT.pelvis]).z - rear.z) / span : Number.NaN,
  };
}

/** The topmost ancestor of a node. */
function rootOf(node: Object3D): Object3D {
  let top = node;
  while (top.parent) top = top.parent;
  return top;
}

/**
 * Reads a posed skeleton's stance (the stance map). Built from the skeleton
 * at rest, whose facing it takes from the hip joints (left minus right,
 * crossed with up): where the pelvis, chest and head face is carried by their
 * bones from there.
 */
export class StanceGauge {
  private readonly restFacing = { pelvis: new Vector3(), chest: new Vector3(), head: new Vector3() };
  /** The back of each hand at rest, in its bone's frame: the world's up there (the rig's own: it turns this toward the hand's hint). */
  private readonly restPalm = { left: new Vector3(), right: new Vector3() } as Record<Side, Vector3>;
  /** The ankle's included angle at rest, shin to foot, degrees. */
  private readonly restAnkle: number;

  constructor(private readonly bones: ReadonlyMap<string, Bone>) {
    rootOf(this.bone(BONES.hips)).updateMatrixWorld(true);
    const left = this.bone(BONES.upLeg.left).getWorldPosition(new Vector3());
    const right = this.bone(BONES.upLeg.right).getWorldPosition(new Vector3());
    const facing = left.sub(right).cross(WORLD_UP).normalize();
    const carry = (name: string, out: Vector3) => out.copy(facing).applyQuaternion(this.bone(name).getWorldQuaternion(new Quaternion()).invert());
    carry(BONES.hips, this.restFacing.pelvis);
    carry(BONES.spine[2], this.restFacing.chest);
    carry(BONES.head, this.restFacing.head);
    for (const side of SIDES) this.restPalm[side].copy(WORLD_UP).applyQuaternion(this.bone(BONES.hand[side]).getWorldQuaternion(new Quaternion()).invert());
    const joints = this.joints();
    this.restAnkle = SIDES.reduce((sum, side) => sum + angle(joints.knee[side].clone().sub(joints.ankle[side]), joints.toe[side].clone().sub(joints.ankle[side])), 0) / SIDES.length;
  }

  /** The skeleton's joints as posed now. */
  joints(out = createStanceJoints()): StanceJoints {
    rootOf(this.bone(BONES.hips)).updateMatrixWorld(true);
    const at = (name: string, into: Vector3) => this.bone(name).getWorldPosition(into);
    const facing = (name: string, rest: Vector3, into: Vector3) => into.copy(rest).applyQuaternion(this.bone(name).getWorldQuaternion(new Quaternion()));
    for (const side of SIDES) {
      at(BONES.arm[side], out.shoulder[side]);
      at(BONES.foreArm[side], out.elbow[side]);
      at(BONES.hand[side], out.wrist[side]);
      at(BONES.upLeg[side], out.hip[side]);
      at(BONES.leg[side], out.knee[side]);
      at(BONES.foot[side], out.ankle[side]);
      at(BONES.toe[side], out.toe[side]);
      // Square to the hand's own axis (the wrist to the middle finger's base), as the rig turns it toward its hint.
      out.palm[side].copy(this.restPalm[side]).applyQuaternion(this.bone(BONES.hand[side]).getWorldQuaternion(new Quaternion()));
      const finger = this.bones.get(BONES.fingers[side][MIDDLE_FINGER][0]);
      if (finger) {
        const axis = finger.getWorldPosition(new Vector3()).sub(out.wrist[side]).normalize();
        out.palm[side].addScaledVector(axis, -out.palm[side].dot(axis)).normalize();
      }
    }
    out.hips.copy(out.hip.left).add(out.hip.right).multiplyScalar(0.5);
    at(BONES.spine[0], out.spine);
    at(BONES.neck, out.neck);
    at(BONES.head, out.head);
    facing(BONES.hips, this.restFacing.pelvis, out.pelvisFacing);
    facing(BONES.spine[2], this.restFacing.chest, out.chestFacing);
    facing(BONES.head, this.restFacing.head, out.headFacing);
    return out;
  }

  /** The stance's angles as posed now, on `board`, for a Regular or Goofy rider. */
  measure(board: BoardPose, stance: StanceName): StanceAngles {
    return measureJoints(this.joints(), board, stance, this.restAnkle);
  }

  private bone(name: string): Bone {
    const bone = this.bones.get(name);
    if (!bone) throw new Error(`The skeleton has no ${name}.`);
    return bone;
  }
}
