import { Vector3 } from 'three';
import { POINT, type RiderVisualState } from './riderVisualState';

const scratch = new Vector3();

/**
 * The fallen body's frame as the rig draws it (the riding body's step 8): up
 * along its spine (the pelvis to the torso point); forward its heading made
 * square to the spine as far as the spine rises, and the water's down square to
 * it (upright the heading leads, lying flat the down: a swimmer faces the
 * water); left = up × forward. `up` is left unit; returns `forward`, unit.
 */
export function fallenFrame(state: RiderVisualState, up: Vector3, forward: Vector3): Vector3 {
  const rise = Math.max(0, up.y);
  forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
  forward.addScaledVector(up, -forward.dot(up)).multiplyScalar(rise);
  forward.add(scratch.set(0, -1, 0).addScaledVector(up, up.y));
  forward.addScaledVector(up, -forward.dot(up));
  if (forward.lengthSq() < 1e-8) forward.set(0, -1, 0).addScaledVector(up, up.y);
  if (forward.lengthSq() < 1e-8) forward.set(0, 0, 1).addScaledVector(up, -up.z);
  return forward.normalize();
}

/**
 * Below this, m, the two arm (or leg) points' spread across the drawn body
 * changes nothing: the body side on (`ARMS`, `LEGS`), its limbs keep the sides
 * they had.
 */
const ARMS = 0.1;
const LEGS = 0.06;

/**
 * The fallen body's limbs taken by side (the animation-realism plan's phase 4).
 * The fall body (`DetachedSurfer`) builds its seven mass points on the rider's
 * frame with its left arm and leg at that frame's −x: the body's right as the
 * rig draws it facing its heading (lying, the deck's down). Each drawn arm
 * reached through its shoulder for the point of its name, across the chest,
 * for the whole fall, and a fall from lying down flung each hand over the body
 * (from its rail to the other side, 7.7 m/s). Here, before anything blends the
 * points, the arm points (and the leg points) trade places when they lie the
 * other way round across the drawn body, with a margin so a body side on keeps
 * its sides; the drawing after (the blends, the rig, the leash) reads them by
 * side. The physics is untouched: its nodes are symmetric, and only the leash
 * ties to one leg (drawn at the back foot's ankle by side, as riding).
 */
export class FallenSides {
  /** Whether the arm points and the leg points trade places this frame. */
  arms = false;
  legs = false;
  private fallen = false;
  private readonly up = new Vector3();
  private readonly forward = new Vector3();
  private readonly left = new Vector3();

  reset(): void {
    this.fallen = false;
  }

  apply(state: RiderVisualState): void {
    if (state.phase !== 'fallen') {
      this.fallen = false;
      this.arms = this.legs = false;
      return;
    }
    const p = state.points;
    this.up.subVectors(p[POINT.torso], p[POINT.pelvis]);
    if (this.up.lengthSq() < 1e-10) return;
    this.up.normalize();
    fallenFrame(state, this.up, this.forward);
    this.left.crossVectors(this.up, this.forward);
    const arms = scratch.subVectors(p[POINT.leftHand], p[POINT.rightHand]).dot(this.left);
    const legs = scratch.subVectors(p[POINT.leftFoot], p[POINT.rightFoot]).dot(this.left);
    if (!this.fallen) {
      this.arms = arms < 0;
      this.legs = legs < 0;
    } else {
      if (arms < -ARMS) this.arms = true;
      else if (arms > ARMS) this.arms = false;
      if (legs < -LEGS) this.legs = true;
      else if (legs > LEGS) this.legs = false;
    }
    this.fallen = true;
    if (this.arms) swap(p[POINT.leftHand], p[POINT.rightHand]);
    if (this.legs) swap(p[POINT.leftFoot], p[POINT.rightFoot]);
  }
}

function swap(a: Vector3, b: Vector3): void {
  scratch.copy(a);
  a.copy(b);
  b.copy(scratch);
}
