import { Quaternion, Vector3 } from 'three';

/** A still scene is drawn again at least this often, ms, to show what loads meanwhile (a sky, a surfer's body). */
export const STILL_REFRESH_MS = 500;
/** View moves smaller than these show as nothing: 0.1 mm, and about 1e-4 rad (a tenth of a pixel). */
const POSITION_EPSILON_SQUARED = 1e-8;
const ROTATION_EPSILON = 1e-9;

interface View {
  readonly position: Vector3;
  readonly quaternion: Quaternion;
}

/**
 * Whether a scene that holds still (the paused game) needs drawing again: the
 * browser keeps showing the last frame, so it is drawn only when the view has
 * moved, something asked for it, or the refresh is due.
 */
export class StillFrameGate {
  private readonly position = new Vector3();
  private readonly quaternion = new Quaternion();
  private drawnAt = Number.NEGATIVE_INFINITY;

  needsDraw(view: View, now: number, changed: boolean): boolean {
    return changed || now - this.drawnAt >= STILL_REFRESH_MS
      || view.position.distanceToSquared(this.position) > POSITION_EPSILON_SQUARED
      || 1 - Math.abs(view.quaternion.dot(this.quaternion)) > ROTATION_EPSILON;
  }

  drawn(view: View, now: number): void {
    this.position.copy(view.position);
    this.quaternion.copy(view.quaternion);
    this.drawnAt = now;
  }

  /** The next check draws. */
  reset(): void {
    this.drawnAt = Number.NEGATIVE_INFINITY;
  }
}
