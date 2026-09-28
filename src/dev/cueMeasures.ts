import { Vector3, type Bone, type Object3D } from 'three';
import { BONES } from '../scene/rig/humanoidBones';
import { PosedBody } from '../scene/rig/posedBody';
import type { RiderVisualState } from '../scene/rig/riderVisualState';
import type { StanceName } from '../physics/riderPosture';
import { drawnStance } from './ridingPoses';

/**
 * The points a player watches on the drawn body (step 5's cues), in the
 * board's frame: x across, y along the deck's normal, z toward the nose, m.
 */
export interface CueMarks {
  hips: Vector3;
  head: Vector3;
  hands: [Vector3, Vector3];
}

const AT = new Vector3(0, 0.03, 0);

/** The watched points of a posed skeleton, on the board of `state`. */
export function cueMarks(bones: Map<string, Bone>, state: RiderVisualState): CueMarks {
  const inverse = state.boardQuaternion.clone().invert();
  const mark = (name: string) => bones.get(name)!.getWorldPosition(new Vector3()).sub(state.boardPosition).applyQuaternion(inverse);
  return { hips: mark(BONES.hips), head: mark(BONES.head), hands: [mark(BONES.hand.left), mark(BONES.hand.right)] };
}

/** A stance of the map drawn as the game draws it (`drawnStance`) on `skeleton`, and its watched points at the read. */
export function stanceMarks(id: string, side: StanceName, skeleton: { root: Object3D; bones: Map<string, Bone> }): CueMarks {
  const body = new PosedBody(skeleton.bones);
  const { state } = drawnStance(id, side, AT, (step) => body.update(step));
  skeleton.root.updateMatrixWorld(true);
  return cueMarks(skeleton.bones, state);
}

/**
 * How far a cue moves the drawn body between two readings along an axis of the
 * board: the largest shift of the hips, the head and the hands, m. At the front
 * view (about 11 m, a 52° field of view) 10 cm is about 10 pixels at 1080p.
 */
export function cueShift(a: CueMarks, b: CueMarks, axis: 'x' | 'y' | 'z'): number {
  const points = (marks: CueMarks) => [marks.hips, marks.head, ...marks.hands];
  const [from, to] = [points(a), points(b)];
  return Math.max(...from.map((point, i) => Math.abs(to[i][axis] - point[axis])));
}
