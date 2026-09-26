import { Vector3, type Quaternion } from 'three';
import { buildBoardShape } from '../../physics/boardShape';
import { RIDER_PARTS, deckHeight, riderPose, stanceFeet, type PosePhase, type StanceName } from '../../physics/riderPosture';
import type { RiderVisualState } from './riderVisualState';

const shape = buildBoardShape();
const centre = new Vector3(shape.centerOfMass.x, shape.centerOfMass.y, shape.centerOfMass.z);
const halfWidth = (z: number) => shape.curves.width(Math.min(1, Math.max(0, z / shape.length + 0.5))) / 2;

/**
 * The seven drawn points of a physics posture on a board at a pose, by
 * `AttachedRider.renderPoint`'s rules: trunk centres; upright arms held out
 * 0.7 past their centres; prone hands beside the rails, push hands on them;
 * upright feet on the stringer at the stance points; lying legs 0.9 past their
 * centres. The whole posture rides the board's frame (the real upright rider
 * keeps its body vertical; on a level board that is the same). For the dev
 * sheet and tests.
 */
export function posturePoints(phase: PosePhase, stance: StanceName, boardPosition: Vector3, boardQuaternion: Quaternion, out: RiderVisualState): RiderVisualState {
  const { parts } = riderPose(shape, phase, stance);
  const upright = phase === 'standing' || phase === 'landing';
  const { front, rear } = stanceFeet(shape);
  for (let i = 0; i < RIDER_PARTS.length; i += 1) {
    const point = out.points[i].set(parts[i * 3], parts[i * 3 + 1], parts[i * 3 + 2]);
    if (i === 3 || i === 4) {
      const outward = i === 3 ? 1 : -1;
      if (phase === 'prone') {
        const z = parts[1 * 3 + 2];
        point.set(outward * (halfWidth(z) + 0.02), deckHeight(shape, z) + 0.02, z);
      } else if (phase === 'push') {
        const z = parts[1 * 3 + 2];
        point.set(outward * halfWidth(z), deckHeight(shape, z), z);
      } else {
        point.set(point.x + 0.7 * (point.x - parts[3]), point.y + 0.7 * (point.y - parts[4]), point.z + 0.7 * (point.z - parts[5]));
      }
    } else if (i >= 5) {
      if (upright) {
        const z = (i === 5) === (stance === 'regular') ? front : rear;
        point.set(0, deckHeight(shape, z), z);
      } else {
        point.set(point.x + 0.9 * (point.x - parts[0]), point.y + 0.9 * (point.y - parts[1]), point.z + 0.9 * (point.z - parts[2]));
      }
    }
    point.sub(centre).applyQuaternion(boardQuaternion).add(boardPosition);
  }
  out.phase = phase;
  out.heading = 0;
  out.boardPosition.copy(boardPosition);
  out.boardQuaternion.copy(boardQuaternion);
  out.stroking = 0;
  return out;
}
