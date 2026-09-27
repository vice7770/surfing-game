import { Vector3 } from 'three';
import type { RiderPhase, RiderVisualState } from './riderVisualState';

/** Samples are smoothed over this, s: a turn reads within a fifth of a second, a single physics step's jitter does not. */
const MOTION_TIME = 0.15;
/** A board farther than this from its last sample, m, has been put somewhere new (a retry, a remote surfer's jump). */
const MOTION_JUMP = 3;
/** Sea time going back more than this, s, is a new session: start over (a remote pose's small jitter is not). */
const TIME_BACK = 0.25;
/**
 * The travel follows the board's velocity from SLOW, m/s, fully by SLOW + SLOW_BLEND,
 * less as the board moves off the way it points (half as much sideways, none
 * backward): crawling, or sliding back in a stall, it travels where it points,
 * with no switch.
 */
const SLOW = 0.5;
const SLOW_BLEND = 1;
/**
 * The drawn body eases in: the upright body over UPRIGHT_EASE, s, from the landing
 * (the rig's lift to the legs' length), and the standing cues over STANDING_EASE
 * from standing (the look, the twist, the leading arm, the reach), so neither
 * switch snaps the body.
 */
const UPRIGHT_EASE = 0.4;
const STANDING_EASE = 0.3;

const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

/**
 * How the drawn board moves (Part B): its turn rate, where it travels and how
 * fast it climbs, read from the drawn states over sea time, so the local rider
 * and every remote one pose from the same motion; and how far the body has come
 * into its upright and standing poses. A repeated or earlier sample changes
 * nothing; a jump, climbing back on after a fall, or sea time going back starts over.
 */
export class RiderMotion {
  private time = Number.NaN;
  private heading = 0;
  private phase: RiderPhase = 'prone';
  private readonly position = new Vector3();
  private readonly velocity = new Vector3();
  private yawRate = 0;
  private uprightSince = Number.NaN;
  private standingSince = Number.NaN;
  private readonly sample = new Vector3();
  private readonly pointing = new Vector3();

  update(state: RiderVisualState, time: number): void {
    const dt = time - this.time;
    const jumped = state.boardPosition.distanceTo(this.position) > MOTION_JUMP;
    const climbedBack = this.phase === 'fallen' && state.phase !== 'fallen';
    if (Number.isNaN(this.time) || jumped || climbedBack || dt < -TIME_BACK) {
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
    this.uprightSince = Number.NaN;
    this.standingSince = Number.NaN;
  }

  private remember(state: RiderVisualState, time: number): void {
    this.time = time;
    this.heading = state.heading;
    this.phase = state.phase;
    this.position.copy(state.boardPosition);
    const upright = state.phase === 'landing' || state.phase === 'standing';
    if (!upright) this.uprightSince = Number.NaN;
    else if (Number.isNaN(this.uprightSince)) this.uprightSince = time;
    if (state.phase !== 'standing') this.standingSince = Number.NaN;
    else if (Number.isNaN(this.standingSince)) this.standingSince = time;
  }

  private write(state: RiderVisualState): void {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    state.yawRate = this.yawRate;
    state.speed = speed;
    state.climb = this.velocity.y;
    const pointing = this.pointing.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    const along = speed > 0 ? (this.velocity.x * pointing.x + this.velocity.z * pointing.z) / speed : 0;
    const follow = Math.max(0, Math.min(1, (speed - SLOW) / SLOW_BLEND)) * Math.max(0, 0.5 + 0.5 * along);
    state.travel.copy(pointing).multiplyScalar(1 - follow);
    if (follow > 0) state.travel.x += (follow * this.velocity.x) / speed;
    if (follow > 0) state.travel.z += (follow * this.velocity.z) / speed;
    if (state.travel.lengthSq() < 1e-12) state.travel.copy(pointing);
    state.travel.normalize();
    state.uprightBlend = Number.isNaN(this.uprightSince) ? 0 : ease((this.time - this.uprightSince) / UPRIGHT_EASE);
    state.standingBlend = Number.isNaN(this.standingSince) ? 0 : ease((this.time - this.standingSince) / STANDING_EASE);
  }
}
