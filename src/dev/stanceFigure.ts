import { Vector3 } from 'three';
import type { StanceName } from '../physics/riderPosture';
import type { Side } from '../scene/rig/humanoidBones';
import { createStanceJoints, measureJoints, type BoardPose, type StanceAngles, type StanceJoints, type StanceMeasure } from '../scene/rig/stanceGauge';
import { PROVENANCE, SOURCES, type MappedStance, type StanceTarget } from '../scene/rig/stanceMap';

/** A body's segment lengths, m, from its joints at rest. */
export interface FigureLengths {
  shin: number;
  thigh: number;
  /** Half the hip joints' spread; the spine's base above the hips' centre; the spine's base to the neck; the neck to the head. */
  hipHalf: number;
  spineBase: number;
  trunk: number;
  neck: number;
  /** Half the shoulders' spread, and how far below the neck they sit along the trunk. */
  shoulderHalf: number;
  shoulderDrop: number;
  upperArm: number;
  foreArm: number;
  foot: number;
}

const DEG = Math.PI / 180;

export function figureLengths(rest: StanceJoints): FigureLengths {
  const half = (a: Vector3, b: Vector3) => a.distanceTo(b) / 2;
  const shoulders = rest.shoulder.left.clone().add(rest.shoulder.right).multiplyScalar(0.5);
  return {
    shin: rest.knee.left.distanceTo(rest.ankle.left),
    thigh: rest.hip.left.distanceTo(rest.knee.left),
    hipHalf: half(rest.hip.left, rest.hip.right),
    spineBase: rest.spine.distanceTo(rest.hips),
    trunk: rest.neck.distanceTo(rest.spine),
    neck: rest.head.distanceTo(rest.neck),
    shoulderHalf: half(rest.shoulder.left, rest.shoulder.right),
    shoulderDrop: rest.neck.y - shoulders.y,
    upperArm: rest.elbow.left.distanceTo(rest.shoulder.left),
    foreArm: rest.wrist.left.distanceTo(rest.elbow.left),
    foot: rest.toe.left.distanceTo(rest.ankle.left),
  };
}

/** The measures the figure is built to show exactly; the rest (the hips' angle, the ankles, the lean, the hand's height) follow from them. */
export const FIGURE_HONOURS: readonly StanceMeasure[] = [
  'kneeFront', 'kneeRear', 'stanceWidth', 'weight', 'trunkFlexion', 'trunkPitch', 'chestTwist', 'hipTwist', 'headYaw', 'headPitch',
  'leadArm', 'trailArm', 'leadElbow', 'trailElbow',
];

/** A plain riding stance, for the measures a test gives no reading of. */
export const NEUTRAL_STANCE: StanceAngles = {
  kneeFront: 150, kneeRear: 145, hipFront: 160, hipRear: 160, ankleFront: 15, ankleRear: 15, trunkFlexion: 15, trunkPitch: 0, trunkTilt: 15, lean: 0,
  chestTwist: 25, hipTwist: 10, headYaw: 70, headPitch: 10, leadArm: 40, trailArm: 40, leadElbow: 160, trailElbow: 160,
  lowHand: 0.8, stanceWidth: 0.61, weight: 0.55,
};

/**
 * The figure's angles: each target's middle, and `drawn`'s own reading where
 * the map has no target. A trunk targeted against the world's vertical (read
 * from a picture) tips the drawn trunk's flexion on the deck by the difference.
 */
export function figureAngles(stance: MappedStance, drawn: StanceAngles): StanceAngles {
  const angles = { ...drawn };
  for (const [measure, target] of Object.entries(stance.targets) as [StanceMeasure, { min: number; max: number }][]) angles[measure] = (target.min + target.max) / 2;
  // No weight read (the feet together): the figure stands centred.
  if (!Number.isFinite(angles.weight)) angles.weight = 0.5;
  if (stance.targets.trunkTilt && !stance.targets.trunkFlexion) angles.trunkFlexion = drawn.trunkFlexion + angles.trunkTilt - drawn.trunkTilt;
  return angles;
}

/** How the figure stands a stance: whether its trunk bends to meet the map's hip angles. */
export interface FigurePlan {
  trunkFromHips: boolean;
}

/**
 * The figure bends its trunk to meet the hips' targets where the map has them
 * and their best source ranks at least as high as the trunk's (Q20's order):
 * one trunk cannot meet both a hip and a trunk target that disagree.
 */
export function figurePlan(stance: MappedStance): FigurePlan {
  const rank = (targets: (StanceTarget | undefined)[]) => Math.min(...targets.flatMap((target) => (target ? [PROVENANCE.indexOf(SOURCES[target.sources[0]].kind)] : [])));
  const hips = rank([stance.targets.hipFront, stance.targets.hipRear]);
  const trunk = rank([stance.targets.trunkFlexion, stance.targets.trunkTilt]);
  return { trunkFromHips: Number.isFinite(hips) && hips <= trunk };
}

/**
 * A figure standing the stance `angles` on the board, its trunk bent to meet
 * the hips' angles when `plan` says so (their mean: one trunk, two thighs).
 * Returns the joints in the world (`buildFigure`).
 */
export function referenceJoints(angles: StanceAngles, lengths: FigureLengths, feet: { front: Vector3; rear: Vector3 }, stance: StanceName, board: BoardPose, plan?: FigurePlan): StanceJoints {
  if (!plan?.trunkFromHips) return buildFigure(angles, lengths, feet, stance, board);
  const wanted = (angles.hipFront + angles.hipRear) / 2;
  const miss = (flexion: number) => {
    const read = measureJoints(buildFigure({ ...angles, trunkFlexion: flexion }, lengths, feet, stance, board), board, stance);
    return Math.abs((read.hipFront + read.hipRear) / 2 - wanted);
  };
  // The trunk's bend over the toes that closes the hips to their angle: a coarse sweep, then a finer one.
  let best = 0;
  for (let flexion = -30; flexion <= 85; flexion += 1) if (miss(flexion) < miss(best)) best = flexion;
  const coarse = best;
  for (let flexion = coarse - 1; flexion <= coarse + 1; flexion += 0.05) if (miss(flexion) < miss(best)) best = flexion;
  return buildFigure({ ...angles, trunkFlexion: best }, lengths, feet, stance, board);
}

/**
 * A figure standing the stance `angles` on the board (the sheet's reference,
 * the stance map): the ankles at `feet` (in the board's frame: x across, y up
 * from the board's centre, z the nose) moved apart to the stance's width; the
 * hips' centre along the stringer at the weight, over the feet across; each
 * hip joint as high as its knee's angle puts it (the pelvis tilts), each knee
 * bent toward the toes; the trunk,
 * pelvis, chest and head at their angles; each arm raised outward from the
 * trunk's down and bent forward at the elbow. Returns the joints in the world.
 */
function buildFigure(angles: StanceAngles, lengths: FigureLengths, feet: { front: Vector3; rear: Vector3 }, stance: StanceName, board: BoardPose): StanceJoints {
  const joints = createStanceJoints();
  const up = new Vector3(0, 1, 0);
  const nose = new Vector3(0, 0, 1);
  const toes = new Vector3(stance === 'regular' ? -1 : 1, 0, 0);
  const front: Side = stance === 'regular' ? 'left' : 'right';
  const rear: Side = front === 'left' ? 'right' : 'left';
  const deck = (degrees: number) => toes.clone().multiplyScalar(Math.cos(degrees * DEG)).addScaledVector(nose, Math.sin(degrees * DEG));
  // The feet, spread to the stance's width about their middle.
  const middle = (feet.front.z + feet.rear.z) / 2;
  const ankleFront = feet.front.clone().setZ(middle + angles.stanceWidth / 2);
  const ankleRear = feet.rear.clone().setZ(middle - angles.stanceWidth / 2);
  // The pelvis: its centre along the stringer at the weight, over the feet; each hip joint as high as its knee's
  // angle puts it above its ankle, so a pelvis between two different knees tilts.
  const pelvisFacing = deck(angles.hipTwist);
  const leftward = new Vector3().crossVectors(up, pelvisFacing).normalize();
  const frontward = front === 'left' ? leftward : leftward.clone().negate();
  const reach = (knee: number) => Math.sqrt(Math.max(0, lengths.shin ** 2 + lengths.thigh ** 2 - 2 * lengths.shin * lengths.thigh * Math.cos(knee * DEG)));
  const centre = new Vector3((ankleFront.x + ankleRear.x) / 2, 0, ankleRear.z + angles.weight * (ankleFront.z - ankleRear.z));
  const joint = (ankle: Vector3, toward: number, knee: number) => {
    const at = centre.clone().addScaledVector(frontward, toward * lengths.hipHalf);
    const level = Math.hypot(at.x - ankle.x, at.z - ankle.z);
    return at.setY(ankle.y + Math.sqrt(Math.max(0, reach(knee) ** 2 - level * level)));
  };
  const hip = { [front]: joint(ankleFront, 1, angles.kneeFront), [rear]: joint(ankleRear, -1, angles.kneeRear) } as Record<Side, Vector3>;
  const hips = hip.left.clone().add(hip.right).multiplyScalar(0.5);
  const ankle = { [front]: ankleFront, [rear]: ankleRear } as Record<Side, Vector3>;
  // Each knee in the plane of its leg and the toes, bent toward them.
  const knee = (side: Side) => {
    const axis = hip[side].clone().sub(ankle[side]);
    const d = axis.length();
    axis.normalize();
    const a = (lengths.shin ** 2 - lengths.thigh ** 2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, lengths.shin ** 2 - a * a));
    const bend = toes.clone().addScaledVector(axis, -toes.dot(axis)).normalize();
    return ankle[side].clone().addScaledVector(axis, a).addScaledVector(bend, h);
  };
  // The trunk, the head and where they face.
  const trunk = up.clone().addScaledVector(toes, Math.tan(angles.trunkFlexion * DEG)).addScaledVector(nose, Math.tan(angles.trunkPitch * DEG)).normalize();
  const spine = hips.clone().addScaledVector(trunk, lengths.spineBase);
  const neck = spine.clone().addScaledVector(trunk, lengths.trunk);
  const head = neck.clone().addScaledVector(trunk, lengths.neck);
  const headFacing = deck(angles.headYaw).multiplyScalar(Math.cos(angles.headPitch * DEG)).addScaledVector(up, -Math.sin(angles.headPitch * DEG));
  const chestFacing = deck(angles.chestTwist);
  // The arms: out from the trunk's down toward their side, bent forward.
  const side = new Vector3().crossVectors(trunk, chestFacing).normalize();
  const leadward = front === 'left' ? side : side.clone().negate();
  const shoulders = neck.clone().addScaledVector(trunk, -lengths.shoulderDrop);
  const arm = (lead: boolean) => {
    const out = lead ? leadward : leadward.clone().negate();
    const shoulder = shoulders.clone().addScaledVector(out, lengths.shoulderHalf);
    const elevation = (lead ? angles.leadArm : angles.trailArm) * DEG;
    const upper = trunk.clone().negate().multiplyScalar(Math.cos(elevation)).addScaledVector(out, Math.sin(elevation)).normalize();
    const elbow = shoulder.clone().addScaledVector(upper, lengths.upperArm);
    const bend = Math.PI - (lead ? angles.leadElbow : angles.trailElbow) * DEG;
    const forward = chestFacing.clone().addScaledVector(upper, -chestFacing.dot(upper)).normalize();
    const fore = upper.clone().multiplyScalar(Math.cos(bend)).addScaledVector(forward, Math.sin(bend));
    return { shoulder, elbow, wrist: elbow.clone().addScaledVector(fore, lengths.foreArm) };
  };
  const leadArm = arm(true);
  const trailArm = arm(false);
  const toWorld = (point: Vector3) => point.applyQuaternion(board.boardQuaternion).add(board.boardPosition);
  const turn = (vector: Vector3) => vector.applyQuaternion(board.boardQuaternion);
  joints.hips.copy(toWorld(hips.clone()));
  joints.spine.copy(toWorld(spine));
  joints.neck.copy(toWorld(neck));
  joints.head.copy(toWorld(head));
  joints.pelvisFacing.copy(turn(pelvisFacing));
  joints.chestFacing.copy(turn(chestFacing));
  joints.headFacing.copy(turn(headFacing));
  for (const s of [front, rear] as const) {
    const lead = s === front;
    const { shoulder, elbow, wrist } = lead ? leadArm : trailArm;
    const bent = knee(s);
    joints.shoulder[s].copy(toWorld(shoulder));
    joints.elbow[s].copy(toWorld(elbow));
    joints.wrist[s].copy(toWorld(wrist));
    joints.hip[s].copy(toWorld(hip[s].clone()));
    joints.knee[s].copy(toWorld(bent));
    joints.ankle[s].copy(toWorld(ankle[s].clone()));
    joints.toe[s].copy(toWorld(ankle[s].clone().addScaledVector(toes, lengths.foot)));
  }
  return joints;
}
