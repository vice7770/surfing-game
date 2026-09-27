import { Vector3, type PerspectiveCamera } from 'three';

/** One frame's flying (spec L1): −1…1 along each axis, look changes in radians, and the fast modifier. */
export interface FlyControl {
  /** + the screen's right. */
  strafe: number;
  /** + along the view. */
  forward: number;
  /** + straight up. */
  rise: number;
  /** Look change this frame, rad: + turns toward +x (from +z), + pitches up. */
  yaw: number;
  pitch: number;
  fast: boolean;
}

export const FLY_IDLE: Readonly<FlyControl> = { strafe: 0, forward: 0, rise: 0, yaw: 0, pitch: 0, fast: false };

/** Where the camera may be: the simulated window, above the bed plus FLOOR_CLEARANCE, below yMax. */
export interface FlyBounds {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  yMax: number;
  /** The seabed's elevation under (x, z), m. */
  floor(x: number, z: number): number;
}

/** Flight speed, m/s: the base, its wheel range and step, and the fast factor. */
export const FLY_SPEED = { base: 6, min: 1, max: 40, fastFactor: 4, wheelStep: 1.25 } as const;
const PITCH_LIMIT = (85 * Math.PI) / 180;
/** The velocity closes on the asked one over this time, s: starts and stops ease instead of jerking. */
const EASE_TIME = 0.18;
const FLOOR_CLEARANCE = 0.3;

/**
 * The Wave Lab's free camera (spec L1): a position, a yaw from +z toward +x and a
 * pitch, flown along the view, across it and straight up, with eased velocity,
 * inside the simulated window and above the seabed.
 */
export class FlyCamera {
  readonly position = new Vector3();
  yaw = 0;
  pitch = 0;
  speed: number = FLY_SPEED.base;
  private readonly velocity = new Vector3();
  private readonly wanted = new Vector3();
  private readonly direction = new Vector3();
  private readonly right = new Vector3();
  private readonly target = new Vector3();

  forward(out: Vector3): Vector3 {
    const c = Math.cos(this.pitch);
    return out.set(Math.sin(this.yaw) * c, Math.sin(this.pitch), Math.cos(this.yaw) * c);
  }

  update(dt: number, control: FlyControl, bounds: FlyBounds): void {
    this.yaw += control.yaw;
    this.pitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, this.pitch + control.pitch));
    if (!(dt > 0)) return;
    this.forward(this.direction);
    // Facing (sin yaw, cos yaw), the screen's right is (−cos yaw, 0, sin yaw).
    this.right.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    this.wanted.set(0, 0, 0)
      .addScaledVector(this.direction, control.forward)
      .addScaledVector(this.right, control.strafe);
    this.wanted.y += control.rise;
    if (this.wanted.lengthSq() > 1) this.wanted.normalize();
    this.wanted.multiplyScalar(this.speed * (control.fast ? FLY_SPEED.fastFactor : 1));
    this.velocity.lerp(this.wanted, 1 - Math.exp(-dt / EASE_TIME));
    this.position.addScaledVector(this.velocity, dt);
    this.clamp(bounds);
  }

  /** Stand at `from` looking at `to`; motion stops. */
  lookAt(from: Vector3, to: Vector3): void {
    this.position.copy(from);
    const d = this.target.subVectors(to, from);
    this.yaw = Math.atan2(d.x, d.z);
    this.pitch = Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, Math.atan2(d.y, Math.hypot(d.x, d.z))));
    this.velocity.set(0, 0, 0);
  }

  /** Move with what the camera follows (a crest, spec L1 Follow). */
  translate(dx: number, dy: number, dz: number): void {
    this.position.x += dx;
    this.position.y += dy;
    this.position.z += dz;
  }

  /** The wheel: each notch ×1.25 (or ÷), within FLY_SPEED.min–max. */
  scaleSpeed(steps: number): void {
    this.speed = Math.min(FLY_SPEED.max, Math.max(FLY_SPEED.min, this.speed * FLY_SPEED.wheelStep ** steps));
  }

  applyTo(camera: PerspectiveCamera): void {
    camera.position.copy(this.position);
    camera.lookAt(this.target.copy(this.position).add(this.forward(this.direction)));
  }

  private clamp(bounds: FlyBounds): void {
    const p = this.position;
    const v = this.velocity;
    const hold = (value: number, min: number, max: number, axis: 'x' | 'y' | 'z') => {
      if (value < min || value > max) v[axis] = 0;
      return Math.min(max, Math.max(min, value));
    };
    p.x = hold(p.x, bounds.xMin, bounds.xMax, 'x');
    p.z = hold(p.z, bounds.zMin, bounds.zMax, 'z');
    p.y = hold(p.y, bounds.floor(p.x, p.z) + FLOOR_CLEARANCE, bounds.yMax, 'y');
  }
}
