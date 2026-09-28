import { Quaternion, Vector3, type Bone, type Object3D } from 'three';
import type { StanceName } from '../../physics/riderPosture';
import { BONES, type Side } from './humanoidBones';

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
  /** The shin's tilt from the deck's normal: the ankle's flexion with the foot flat on the deck. */
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
  /** The hips' centre along the stringer from the rear ankle (0) to the front ankle (1). */
  weight: number;
}

export type StanceMeasure = keyof StanceAngles;

export interface BoardPose {
  readonly boardPosition: Vector3;
  readonly boardQuaternion: Quaternion;
}

const SIDES: readonly Side[] = ['left', 'right'];
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
    shoulder: sided(), elbow: sided(), wrist: sided(), hip: sided(), knee: sided(), ankle: sided(), toe: sided(),
  };
}

/** The stance's angles from a body's joints (`measure` for a posed skeleton). */
export function measureJoints(joints: StanceJoints, board: BoardPose, stance: StanceName): StanceAngles {
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
  const ankle = (side: Side) => angle(direction(joints.knee[side].clone().sub(joints.ankle[side])), DECK_UP);
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
    weight: span !== 0 ? (local(joints.hips).z - rearAnkle.z) / span : 0.5,
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

  constructor(private readonly bones: ReadonlyMap<string, Bone>) {
    rootOf(this.bone(BONES.hips)).updateMatrixWorld(true);
    const left = this.bone(BONES.upLeg.left).getWorldPosition(new Vector3());
    const right = this.bone(BONES.upLeg.right).getWorldPosition(new Vector3());
    const facing = left.sub(right).cross(WORLD_UP).normalize();
    const carry = (name: string, out: Vector3) => out.copy(facing).applyQuaternion(this.bone(name).getWorldQuaternion(new Quaternion()).invert());
    carry(BONES.hips, this.restFacing.pelvis);
    carry(BONES.spine[2], this.restFacing.chest);
    carry(BONES.head, this.restFacing.head);
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
    return measureJoints(this.joints(), board, stance);
  }

  private bone(name: string): Bone {
    const bone = this.bones.get(name);
    if (!bone) throw new Error(`The skeleton has no ${name}.`);
    return bone;
  }
}
