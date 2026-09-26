import { Group, type Vector3 } from 'three';
import type { BodyPart, DetachedRiderPose } from '../../physics/DetachedSurfer';
import { RIDER_PARTS } from '../../physics/riderPosture';
import type { RiderVisualState } from '../rig/riderVisualState';
import { Surfer } from '../Surfer';
import type { OutfitId } from './outfits';
import { LOD_DISTANCE, SkinnedSurfer } from './SkinnedSurfer';
import type { OutfitColors } from './surferMaterial';

/**
 * The physical rider as drawn: a skinned surfer once its model has loaded,
 * and the primitive surfer until then, or if the model cannot load.
 */
export class SurferView {
  readonly group = new Group();
  private readonly fallback = new Surfer();
  private skinnedSurfer?: SkinnedSurfer;
  /** Loads started; only the latest one's surfer is kept. */
  private requests = 0;
  private outfit?: { id: OutfitId; colors: Partial<OutfitColors> };
  private presetId?: string;
  /** The graphics preset's level of detail: the full body's distance, m, and the largest texture, px. */
  private detail = { lodDistance: LOD_DISTANCE, textureCap: Infinity };
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
    const request = ++this.requests;
    this.presetId = presetId;
    return SkinnedSurfer.load(`assets/surfers/${presetId}.glb`, this.detail.textureCap)
      .then((surfer) => {
        // A later choice is on its way: this one arrived too late to be drawn.
        if (request !== this.requests) return;
        surfer.lodDistance = this.detail.lodDistance;
        if (this.outfit) surfer.setOutfit(this.outfit.id, this.outfit.colors);
        if (this.skinnedSurfer) this.group.remove(this.skinnedSurfer.group);
        this.skinnedSurfer = surfer;
        this.group.add(surfer.group);
        this.fallback.group.visible = false;
      })
      .catch((error: unknown) => console.warn(`Surfer model ${presetId} unavailable; drawing the simple surfer.`, error));
  }

  /** The graphics preset's level of detail; a new texture size reloads the surfer at it. */
  setDetail(lodDistance: number, textureCap: number): void {
    const resized = textureCap !== this.detail.textureCap;
    this.detail = { lodDistance, textureCap };
    if (this.skinnedSurfer) this.skinnedSurfer.lodDistance = lodDistance;
    if (resized && this.presetId) void this.load(this.presetId);
  }

  /** Dresses the surfer drawn now, and every one loaded after it. */
  dress(outfit: OutfitId, colors: Partial<OutfitColors>): void {
    this.outfit = { id: outfit, colors };
    this.skinnedSurfer?.setOutfit(outfit, colors);
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
