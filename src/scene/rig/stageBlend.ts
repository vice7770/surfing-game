import { Vector3 } from 'three';
import type { RiderVisualState } from './riderVisualState';
import type { StanceBlend } from './stanceBlend';
import type { StageWeights } from './stagePoses';

/**
 * The stage reader (the animation-realism plan, §3.1 and §3.3): how far the
 * standing rider is into each stage, from the drawn state only, so remote
 * surfers read it from the same state (no wire change). Each weight moves no
 * faster than a set rate and switches with hysteresis, so poses never flicker.
 * Phase 1: the side (frontside or backside) and the drop.
 */
export const STAGE_READING = {
  /**
   * In trim, the side is the face's: the deck's normal tilts away from the face,
   * so a face on the toes' side reads as frontside. The tilt is smoothed over
   * `tiltTime` s and needs `tilt`° to switch; within it (flat water: the Wave
   * Pool's flat stretch) the last side holds. Read only while the board turns
   * slower than `turning` of a full turn (`StanceBlend.turn`): in a turn the
   * rail's roll is the turn's, not the face's.
   */
  tiltTime: 0.5,
  tilt: 6,
  turning: 0.3,
  /** The side's weight swings fully in this, s. */
  sideSwing: 0.6,
  /**
   * The drop: the board travelling down the face, its descent (the climb
   * against the speed) from `dropFrom`° to `dropFull`°, eased in and out over
   * `dropEase` s.
   */
  dropFrom: 5,
  dropFull: 11,
  dropEase: 0.3,
};

const DEG = Math.PI / 180;
const WORLD_UP = new Vector3(0, 1, 0);
const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};

export class StageBlend {
  readonly weights: StageWeights = { backside: 0, drop: 0 };
  /** The side read last: 1 backside, 0 frontside (frontside until a face says otherwise). */
  private side = 0;
  private tilt = 0;
  /** The weights before easing, moving at their rates. */
  private sideLinear = 0;
  private dropLinear = 0;
  private clock = Number.NaN;
  private readonly up = new Vector3();
  private readonly nose = new Vector3();
  private readonly toes = new Vector3();

  reset(): void {
    this.clock = Number.NaN;
  }

  /** Reads the stages from a standing state (its stance's blend already read); a clock standing still keeps them, a fresh one takes them as they are. */
  update(state: RiderVisualState, blend: StanceBlend): StageWeights {
    const { up, nose, toes } = this;
    up.set(0, 1, 0).applyQuaternion(state.boardQuaternion);
    nose.set(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0);
    if (nose.lengthSq() < 1e-8) nose.set(0, 0, 1);
    nose.normalize();
    // The board's left is up × nose; Regular faces the −x rail, its toes the board's right.
    toes.crossVectors(WORLD_UP, nose).normalize();
    if (blend.stance === 'regular') toes.negate();
    const tilt = Math.asin(Math.max(-1, Math.min(1, up.dot(toes)))) / DEG;
    const descent = Math.atan2(-state.climb, Math.max(state.speed, 1)) / DEG;
    const drop = Math.max(0, Math.min(1, (descent - STAGE_READING.dropFrom) / (STAGE_READING.dropFull - STAGE_READING.dropFrom)));
    const dt = state.clock - this.clock;
    if (dt === 0) return this.weights;
    const fresh = !(dt > 0 && dt < 0.25);
    this.clock = state.clock;
    const steady = Math.abs(blend.turn) < STAGE_READING.turning;
    if (fresh) this.tilt = tilt;
    else if (steady) this.tilt += (tilt - this.tilt) * (1 - Math.exp(-dt / STAGE_READING.tiltTime));
    // A face on the toes' side tilts the deck toward the heels (frontside); on the heels' side, toward the toes.
    if (steady || fresh) {
      if (this.tilt < -STAGE_READING.tilt) this.side = 0;
      else if (this.tilt > STAGE_READING.tilt) this.side = 1;
    }
    if (fresh) {
      this.sideLinear = this.side;
      this.dropLinear = drop;
    } else {
      const swing = dt / STAGE_READING.sideSwing;
      this.sideLinear += Math.max(-swing, Math.min(swing, this.side - this.sideLinear));
      const step = dt / STAGE_READING.dropEase;
      this.dropLinear += Math.max(-step, Math.min(step, drop - this.dropLinear));
    }
    this.weights.backside = ease(this.sideLinear);
    this.weights.drop = ease(this.dropLinear);
    return this.weights;
  }
}
