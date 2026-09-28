import type { Bone } from 'three';
import { BodyInertia } from './bodyInertia';
import { HumanoidRig } from './HumanoidRig';
import { PointInertia } from './pointInertia';
import type { RiderVisualState } from './riderVisualState';

export interface PosedBodyOptions {
  /** Blend the switches out: the physics' points' jumps before the rig (`PointInertia`) and the rig's own after it (`BodyInertia`); on by default. */
  inertia?: boolean;
  /** Each layer alone (for the body film): the points', and the bones'. */
  points?: boolean;
  bones?: boolean;
}

/**
 * The drawn body's posing from a visual state (the riding-body plan): the
 * physics' points blended where they jump, the rig solving the skeleton from
 * them, and the rig's own switches blended out. The page's surfers (local and
 * online) and the body film pose through this, so the film measures what the
 * page draws. The points are blended in place: whatever else draws from the
 * state after it (the leash) follows the drawn body.
 */
export class PosedBody {
  readonly rig: HumanoidRig;
  private readonly points?: PointInertia;
  private readonly inertia?: BodyInertia;

  constructor(bones: Map<string, Bone>, options: PosedBodyOptions = {}) {
    this.rig = new HumanoidRig(bones);
    const inertia = options.inertia ?? true;
    if (options.points ?? inertia) this.points = new PointInertia();
    if (options.bones ?? inertia) this.inertia = new BodyInertia(bones);
  }

  /** Forgets the motion: the next state is drawn as the rig solves it (a new tile of the surfer sheet, a teleport). */
  reset(): void {
    this.points?.reset();
    this.inertia?.reset();
  }

  update(state: RiderVisualState): void {
    this.points?.apply(state);
    this.rig.solve(state);
    this.inertia?.apply(state);
  }
}
