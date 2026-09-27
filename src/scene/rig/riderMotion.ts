import { Vector3 } from 'three';
import type { RiderPhase, RiderVisualState } from './riderVisualState';

/** Samples are smoothed over this, s: a turn reads within a fifth of a second, a single physics step's jitter does not. */
const MOTION_TIME = 0.15;
/** A board farther than this from its last sample, m, has been put somewhere new (a retry, a remote surfer's jump). */
const MOTION_JUMP = 3;
/** Slower than this, m/s, the board travels where it points. */
const SLOW = 0.5;

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * How the drawn board moves (Part B): its turn rate, where it travels and how
 * fast it climbs, read from the drawn states over sea time, so the local rider
 * and every remote one pose from the same motion. A repeated or earlier sample
 * changes nothing; a jump, or climbing back on after a fall, starts over.
 */
export class RiderMotion {
  private time = Number.NaN;
  private heading = 0;
  private phase: RiderPhase = 'prone';
  private readonly position = new Vector3();
  private readonly velocity = new Vector3();
  private yawRate = 0;
  private readonly sample = new Vector3();

  update(state: RiderVisualState, time: number): void {
    const dt = time - this.time;
    const jumped = state.boardPosition.distanceTo(this.position) > MOTION_JUMP;
    const climbedBack = this.phase === 'fallen' && state.phase !== 'fallen';
    if (Number.isNaN(this.time) || jumped || climbedBack) {
      this.reset();
      this.remember(state, time);
    } else if (dt > 0) {
      const blend = 1 - Math.exp(-dt / MOTION_TIME);
      this.yawRate += (wrap(state.heading - this.heading) / dt - this.yawRate) * blend;
      this.sample.subVectors(state.boardPosition, this.position).divideScalar(dt);
      this.velocity.lerp(this.sample, blend);
      this.remember(state, time);
    }
    this.write(state);
  }

  /** Forget the motion: the next sample starts from rest. */
  reset(): void {
    this.time = Number.NaN;
    this.yawRate = 0;
    this.velocity.set(0, 0, 0);
  }

  private remember(state: RiderVisualState, time: number): void {
    this.time = time;
    this.heading = state.heading;
    this.phase = state.phase;
    this.position.copy(state.boardPosition);
  }

  private write(state: RiderVisualState): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    state.yawRate = this.yawRate;
    state.speed = speed;
    state.climb = this.velocity.y;
    if (speed >= SLOW) state.travel.set(this.velocity.x / speed, 0, this.velocity.z / speed);
    else state.travel.set(Math.sin(this.heading), 0, Math.cos(this.heading));
  }
}
