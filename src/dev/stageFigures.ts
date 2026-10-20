import { Quaternion, Vector3 } from 'three';
import { buildBoardShape } from '../physics/boardShape';
import { deckHeight, stanceFeet, type StanceName } from '../physics/riderPosture';
import type { Side } from '../scene/rig/humanoidBones';
import { createStanceJoints, type BoardPose, type StanceJoints } from '../scene/rig/stanceGauge';
import { solveTwoBone } from '../scene/rig/twoBoneIk';
import type { FigureLengths } from './stanceFigure';

/**
 * The animation-realism plan's reference figures (docs/superpowers/plans/2026-10-22-animation-realism.md):
 * every stage of a ride, standing or not, built from its target numbers on a
 * surfer's own proportions, for the stance sheet (`realismSheet.ts`). The
 * standing stages extend the stance map's figure (`stanceFigure.ts`) with the
 * feet's angles to the stringer, the rear knee caving in and a body upright
 * in the world (not on the deck); the rest (lying, sitting, in the water) are
 * placed joint by joint. Conventions: knees and hips as flexion, 0° straight;
 * a foot's angle to the stringer, 90° square across; the chest's and head's
 * yaw from the toes (0°) toward the nose (+).
 */

const DEG = Math.PI / 180;
const shape = buildBoardShape();
const centre = new Vector3(shape.centerOfMass.x, shape.centerOfMass.y, shape.centerOfMass.z);
const WORLD_UP = new Vector3(0, 1, 0);

/** Half the board's width a distance z along it from mid-length (the shape's frame), m. */
export function halfWidth(z: number): number {
  return shape.curves.width(Math.min(1, Math.max(0, z / shape.length + 0.5))) / 2;
}

/** A direction in the levelled board frame: toward the toes' rail, the nose, and the world's up. */
export type Aim = readonly [toes: number, nose: number, up: number];

/** A free arm: the upper arm and forearm reaching along `dir` with the elbow at `elbow`° (included), bending toward `pole`. */
export interface ArmReach { dir: Aim; elbow: number; pole?: Aim }
/** A hand on the deck or a rail: `toes` m toward the toes' rail (negative: the heels'), `above` m over the deck, at `z` (the shape's frame). */
export interface ArmGrab { grab: readonly [toes: number, above: number, z: number]; pole: Aim }
export type ArmSpec = ArmReach | ArmGrab;

/** A standing stage's numbers (every angle in degrees). */
export interface StandingSpec {
  /** The ankles apart along the stringer, m, and the hips' share of the way from the rear ankle to the front. */
  width: number;
  weight: number;
  /** Knee flexion, 0° straight: front, rear. */
  knee: readonly [front: number, rear: number];
  /** Each foot's angle to the stringer, 90° square across: front, rear. */
  foot: readonly [front: number, rear: number];
  /** The rear knee's bend turned from the toes toward the nose (caving in toward the front foot), and how far it drops toward the deck. */
  rearKneeIn: number;
  /** The body (feet to neck) from the world's vertical toward the toes (+, frontside into a turn) or the heels. */
  lean: number;
  /** The trunk bent forward from the body's line toward where the chest faces (the hinge at the hips). */
  trunk: number;
  /** Where the chest and the pelvis face, from the toes toward the nose. */
  chest: number;
  hips: number;
  /** The lead shoulder lower than the trailing one. */
  shoulderDrop: number;
  /** The head's yaw from the toes toward the nose, and its pitch below the horizon. */
  head: readonly [yaw: number, pitch: number];
  lead: ArmSpec;
  trail: ArmSpec;
}

/** A point or direction of a non-standing figure, in the board's frame for a Regular rider: +x the board's left, y up the deck, z the nose. */
export type Local = readonly [x: number, y: number, z: number];
/** A limb's end and the way its middle joint bends. */
export interface FreeLimb { at: Local; pole: Local }

/**
 * A non-standing stage's figure, joint by joint (Regular; Goofy mirrors it):
 * on the board, `y` is above the deck at that z; in the water, above the
 * water's level, about the board's place with its heading.
 */
export interface FreeSpec {
  frame: 'board' | 'water';
  hips: Local;
  /** The pelvis toward the spine's base; the spine's base toward the neck (the back's bend); where the chest faces. */
  up: Local;
  chest: Local;
  facing: Local;
  /** Where the head looks. */
  look: Local;
  legs: Record<Side, FreeLimb>;
  arms: Record<Side, FreeLimb>;
}

/** The ankle's height over the deck, m, and how far behind the foot's middle it sits along the foot. */
const ANKLE_ABOVE = 0.075;
const ANKLE_BACK = 0.06;

/** Scratch frame of the levelled board. */
interface Levelled { toes: Vector3; nose: Vector3; up: Vector3 }

function levelled(board: BoardPose, stance: StanceName): Levelled {
  const nose = new Vector3(0, 0, 1).applyQuaternion(board.boardQuaternion).setY(0);
  if (nose.lengthSq() < 1e-8) nose.set(0, 0, 1);
  nose.normalize();
  const left = new Vector3().crossVectors(WORLD_UP, nose).normalize();
  return { toes: stance === 'regular' ? left.clone().negate() : left, nose, up: WORLD_UP.clone() };
}

const aimOf = (frame: Levelled, aim: Aim) => new Vector3().addScaledVector(frame.toes, aim[0]).addScaledVector(frame.nose, aim[1]).addScaledVector(frame.up, aim[2]).normalize();
/** A board-frame point (the shape's frame) in the world. */
const boardPoint = (board: BoardPose, x: number, y: number, z: number) => new Vector3(x, y, z).sub(centre).applyQuaternion(board.boardQuaternion).add(board.boardPosition);
const deckPoint = (board: BoardPose, x: number, z: number, above: number) => boardPoint(board, x, deckHeight(shape, z) + above, z);
const reachFor = (upper: number, lower: number, elbow: number) => Math.sqrt(upper ** 2 + lower ** 2 - 2 * upper * lower * Math.cos(elbow * DEG));

/** A standing stage's figure on the board (`StandingSpec`), its joints in the world. */
export function standingFigure(spec: StandingSpec, lengths: FigureLengths, stance: StanceName, board: BoardPose): StanceJoints {
  const joints = createStanceJoints();
  const frame = levelled(board, stance);
  const front: Side = stance === 'regular' ? 'left' : 'right';
  const rear: Side = front === 'left' ? 'right' : 'left';
  const toesLocal = new Vector3(stance === 'regular' ? -1 : 1, 0, 0);
  const noseLocal = new Vector3(0, 0, 1);
  const turn = (v: Vector3) => v.clone().applyQuaternion(board.boardQuaternion);
  // The feet on the stringer about the stance's middle, turned to their angles; the ankles over them.
  const { front: frontZ, rear: rearZ } = stanceFeet(shape);
  const middle = (frontZ + rearZ) / 2;
  const footDir = (angle: number) => turn(toesLocal.clone().multiplyScalar(Math.sin(angle * DEG)).addScaledVector(noseLocal, Math.cos(angle * DEG)));
  const toeDir = { [front]: footDir(spec.foot[0]), [rear]: footDir(spec.foot[1]) } as Record<Side, Vector3>;
  // The feet's middles on the stringer, placed so the ankles (behind them along each foot) stand `width` apart.
  const ankle = {
    [front]: deckPoint(board, 0, middle + spec.width / 2 + ANKLE_BACK * Math.cos(spec.foot[0] * DEG), ANKLE_ABOVE),
    [rear]: deckPoint(board, 0, middle - spec.width / 2 + ANKLE_BACK * Math.cos(spec.foot[1] * DEG), ANKLE_ABOVE),
  } as Record<Side, Vector3>;
  for (const side of [front, rear]) ankle[side].addScaledVector(toeDir[side], -ANKLE_BACK);
  // The body's line: the world's up leaned toward the toes (into a frontside turn) or the heels.
  const up = frame.up.clone().multiplyScalar(Math.cos(spec.lean * DEG)).addScaledVector(frame.toes, Math.sin(spec.lean * DEG)).normalize();
  const yawed = (degrees: number) => frame.toes.clone().multiplyScalar(Math.cos(degrees * DEG)).addScaledVector(frame.nose, Math.sin(degrees * DEG));
  const flat = (v: Vector3) => v.addScaledVector(up, -v.dot(up)).normalize();
  const pelvisFacing = flat(yawed(spec.hips));
  const chestYaw = flat(yawed(spec.chest));
  const left = new Vector3().crossVectors(up, pelvisFacing).normalize();
  const frontward = front === 'left' ? left : left.clone().negate();
  // Each hip joint over its foot's line at the weight, as high along the body's line as its knee's bend puts it.
  const reach = (flexion: number) => reachFor(lengths.thigh, lengths.shin, 180 - flexion);
  const base = ankle[rear].clone().lerp(ankle[front], spec.weight);
  const place = (side: Side, toward: number, flexion: number) => {
    const at = base.clone().addScaledVector(frontward, toward * lengths.hipHalf);
    const e = at.clone().sub(ankle[side]);
    const along = e.dot(up);
    const t = -along + Math.sqrt(Math.max(0, along * along - e.lengthSq() + reach(flexion) ** 2));
    return at.addScaledVector(up, t);
  };
  // The weight is read along the deck (the stance gauge's): on a pitched board, rising along the body's line moves the
  // hips along it, so the base slides back by what the rise carried (a few passes).
  const inverse = board.boardQuaternion.clone().invert();
  const alongDeck = (point: Vector3) => point.clone().sub(board.boardPosition).applyQuaternion(inverse).z;
  const nose = flat(turn(noseLocal));
  for (let pass = 0; pass < 4; pass += 1) {
    joints.hip[front].copy(place(front, 1, spec.knee[0]));
    joints.hip[rear].copy(place(rear, -1, spec.knee[1]));
    joints.hips.copy(joints.hip.left).add(joints.hip.right).multiplyScalar(0.5);
    const span = alongDeck(ankle[front]) - alongDeck(ankle[rear]);
    const miss = spec.weight - (alongDeck(joints.hips) - alongDeck(ankle[rear])) / span;
    if (Math.abs(miss) < 0.002) break;
    base.addScaledVector(nose, miss * span);
  }
  // The knees bend toward the toes, the rear one caving in toward the nose and down.
  const kneePole = { [front]: frame.toes.clone(), [rear]: yawed(spec.rearKneeIn).addScaledVector(frame.up, -Math.sin(spec.rearKneeIn * DEG) * 0.5) } as Record<Side, Vector3>;
  for (const side of [front, rear]) {
    joints.ankle[side].copy(ankle[side]);
    solveTwoBone(joints.hip[side], lengths.thigh, lengths.shin, ankle[side], kneePole[side], joints.knee[side], new Vector3());
    joints.toe[side].copy(ankle[side]).addScaledVector(toeDir[side], lengths.foot).addScaledVector(turn(new Vector3(0, -1, 0)), ANKLE_ABOVE * 0.6);
  }
  // The trunk, hinged forward from the body's line toward where the hips and chest face.
  const bendToward = pelvisFacing.clone().add(chestYaw).normalize();
  const trunk = up.clone().multiplyScalar(Math.cos(spec.trunk * DEG)).addScaledVector(bendToward, Math.sin(spec.trunk * DEG)).normalize();
  joints.spine.copy(joints.hips).addScaledVector(trunk, lengths.spineBase);
  joints.neck.copy(joints.spine).addScaledVector(trunk, lengths.trunk);
  joints.head.copy(joints.neck).addScaledVector(trunk, lengths.neck);
  const chestFacing = chestYaw.clone().addScaledVector(trunk, -chestYaw.dot(trunk)).normalize();
  joints.pelvisFacing.copy(pelvisFacing);
  joints.chestFacing.copy(chestFacing);
  joints.headFacing.copy(yawed(spec.head[0]).multiplyScalar(Math.cos(spec.head[1] * DEG)).addScaledVector(frame.up, -Math.sin(spec.head[1] * DEG)));
  // The shoulders across the chest, the lead one dropped.
  const across = new Vector3().crossVectors(trunk, chestFacing).normalize();
  const leadward = front === 'left' ? across : across.clone().negate();
  const shoulders = joints.neck.clone().addScaledVector(trunk, -lengths.shoulderDrop);
  const tilt = leadward.clone().multiplyScalar(Math.cos(spec.shoulderDrop * DEG)).addScaledVector(trunk, -Math.sin(spec.shoulderDrop * DEG));
  joints.shoulder[front].copy(shoulders).addScaledVector(tilt, lengths.shoulderHalf);
  joints.shoulder[rear].copy(shoulders).addScaledVector(tilt, -lengths.shoulderHalf);
  for (const [side, arm] of [[front, spec.lead], [rear, spec.trail]] as const) {
    const shoulder = joints.shoulder[side];
    let hand: Vector3;
    let pole: Vector3;
    if ('grab' in arm) {
      const [toward, above, z] = arm.grab;
      hand = deckPoint(board, toesLocal.x * toward, z, above);
      pole = aimOf(frame, arm.pole);
    } else {
      hand = shoulder.clone().addScaledVector(aimOf(frame, arm.dir), reachFor(lengths.upperArm, lengths.foreArm, arm.elbow));
      pole = arm.pole ? aimOf(frame, arm.pole) : frame.up.clone().negate().addScaledVector(chestFacing, -0.3);
    }
    solveTwoBone(shoulder, lengths.upperArm, lengths.foreArm, hand, pole, joints.elbow[side], joints.wrist[side]);
  }
  return joints;
}

/** A non-standing stage's figure (`FreeSpec`), its joints in the world: on the board's deck, or in the water about it. */
export function freeFigure(spec: FreeSpec, lengths: FigureLengths, stance: StanceName, board: BoardPose): StanceJoints {
  const joints = createStanceJoints();
  const mirror = stance === 'regular' ? 1 : -1;
  const swap = (side: Side): Side => (stance === 'regular' ? side : side === 'left' ? 'right' : 'left');
  const heading = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), levelled(board, stance).nose);
  const point = ([x, y, z]: Local) => (spec.frame === 'board'
    ? deckPoint(board, mirror * x, z, y)
    : new Vector3(mirror * x, y, z).applyQuaternion(heading).add(new Vector3(board.boardPosition.x, 0, board.boardPosition.z)));
  const direction = ([x, y, z]: Local) => (spec.frame === 'board'
    ? new Vector3(mirror * x, y, z).applyQuaternion(board.boardQuaternion)
    : new Vector3(mirror * x, y, z).applyQuaternion(heading)).normalize();
  joints.hips.copy(point(spec.hips));
  const up = direction(spec.up);
  const chest = direction(spec.chest);
  const facing = direction(spec.facing);
  joints.spine.copy(joints.hips).addScaledVector(up, lengths.spineBase);
  joints.neck.copy(joints.spine).addScaledVector(chest, lengths.trunk);
  joints.head.copy(joints.neck).addScaledVector(chest, lengths.neck);
  const chestFacing = facing.clone().addScaledVector(chest, -facing.dot(chest)).normalize();
  const pelvisFacing = facing.clone().addScaledVector(up, -facing.dot(up)).normalize();
  joints.pelvisFacing.copy(pelvisFacing);
  joints.chestFacing.copy(chestFacing);
  joints.headFacing.copy(direction(spec.look));
  const hipLeft = new Vector3().crossVectors(up, pelvisFacing).normalize();
  const chestLeft = new Vector3().crossVectors(chest, chestFacing).normalize();
  const shoulders = joints.neck.clone().addScaledVector(chest, -lengths.shoulderDrop);
  for (const side of ['left', 'right'] as const) {
    const drawn = swap(side);
    const sign = drawn === 'left' ? 1 : -1;
    joints.hip[drawn].copy(joints.hips).addScaledVector(hipLeft, sign * lengths.hipHalf);
    joints.shoulder[drawn].copy(shoulders).addScaledVector(chestLeft, sign * lengths.shoulderHalf);
    const leg = spec.legs[side];
    joints.ankle[drawn].copy(point(leg.at));
    solveTwoBone(joints.hip[drawn], lengths.thigh, lengths.shin, joints.ankle[drawn], direction(leg.pole), joints.knee[drawn], joints.ankle[drawn]);
    // The toes along the shin's line, pointed (lying, sitting, in the water).
    const shin = joints.ankle[drawn].clone().sub(joints.knee[drawn]).normalize();
    joints.toe[drawn].copy(joints.ankle[drawn]).addScaledVector(shin, lengths.foot);
    const arm = spec.arms[side];
    solveTwoBone(joints.shoulder[drawn], lengths.upperArm, lengths.foreArm, point(arm.at), direction(arm.pole), joints.elbow[drawn], joints.wrist[drawn]);
  }
  return joints;
}

/** The feet's angles to the stringer, degrees (90° square across), from a body's ankles and toes on the board. */
export function footAngles(joints: StanceJoints, board: BoardPose): Record<Side, number> {
  const inverse = board.boardQuaternion.clone().invert();
  const angle = (side: Side) => {
    const foot = joints.toe[side].clone().sub(joints.ankle[side]).applyQuaternion(inverse);
    return Math.atan2(Math.abs(foot.x), Math.abs(foot.z)) / DEG;
  };
  return { left: angle('left'), right: angle('right') };
}
