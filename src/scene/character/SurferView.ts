import { Group, type Vector3 } from 'three';
import type { BodyPart, DetachedRiderPose } from '../../physics/DetachedSurfer';
import { RIDER_PARTS } from '../../physics/riderPosture';
import type { RiderVisualState } from '../rig/riderVisualState';
import { Surfer } from '../Surfer';
import { SkinnedSurfer } from './SkinnedSurfer';

/**
 * The physical rider as drawn: a skinned surfer once its model has loaded,
 * and the primitive surfer until then, or if the model cannot load.
 */
export class SurferView {
  readonly group = new Group();
  private readonly fallback = new Surfer();
  private skinnedSurfer?: SkinnedSurfer;
  private readonly pose: DetachedRiderPose & { heading: number; points: Float64Array } = {
    heading: 0,
    points: new Float64Array(RIDER_PARTS.length * 3),
    getPartPosition(part: BodyPart, out) {
      const i = RIDER_PARTS.indexOf(part);
      return out.set(this.points[i * 3], this.points[i * 3 + 1], this.points[i * 3 + 2]);
    },
  };

  constructor() {
    this.fallback.setBoardVisible(false);
    this.group.add(this.fallback.group);
  }

  get skinned(): SkinnedSurfer | undefined {
    return this.skinnedSurfer;
  }

  /** Loads a surfer from `public/assets/surfers/` (relative to the page); the primitive surfer stays if it fails. */
  load(presetId = 'surfer1'): Promise<void> {
    return SkinnedSurfer.load(`assets/surfers/${presetId}.glb`)
      .then((surfer) => {
        if (this.skinnedSurfer) this.group.remove(this.skinnedSurfer.group);
        this.skinnedSurfer = surfer;
        this.group.add(surfer.group);
        this.fallback.group.visible = false;
      })
      .catch((error: unknown) => console.warn(`Surfer model ${presetId} unavailable; drawing the simple surfer.`, error));
  }

  update(state: RiderVisualState, cameraPosition?: Vector3): void {
    if (this.skinnedSurfer) {
      this.skinnedSurfer.update(state, cameraPosition);
      return;
    }
    this.pose.heading = state.heading;
    state.points.forEach((point, i) => point.toArray(this.pose.points, i * 3));
    this.fallback.updateDetached(this.pose, state.boardPosition, state.boardQuaternion);
  }
}
