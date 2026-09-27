import { Vector3 } from 'three';
import type { BoardContactBody } from './DetachedSurfer';

/**
 * The leash (the wipeout spec, Part A; the gameplay survey §6), provisional
 * design parameters:
 * - a 6 ft (1.83 m) urethane cord from the back-foot ankle to the tail plug;
 * - slack up to its length, then soft: `softTension`, N, once stretched by
 *   `softShare` of its length (urethane cords stretch 30–50 % before they
 *   stiffen), then `stiffness`, N/m;
 * - `damping`, N·s/m, only while lengthening (the cord's hysteresis), so the
 *   stretched cord still springs the board back (recoil);
 * - it snaps above `snap`, N: manufacturers quote about 100 kg (~1 kN) for some
 *   cords, and a bore's drag on a tethered board is 0.6 kN edge-on to 3 kN
 *   flat-on at 4 m/s (survey §6);
 * - reeled in hand over hand at `reelRate`, m/s, down to `reach`, m, never
 *   pulling harder than `reelForce`, N (0.4 body weights, the prone arm's
 *   HAND_FORCE_LIMIT): the cord slips through the hands beyond it.
 */
export const LEASH = {
  length: 1.83, softShare: 0.4, softTension: 250, stiffness: 4000, damping: 25, snap: 1200, reelRate: 0.6, reelForce: 290, reach: 0.8,
} as const;

/** The body point the cord is tied to: a mass point the tension pulls. */
export interface LeashNode {
  readonly position: Vector3;
  readonly velocity: Vector3;
  readonly mass: number;
}

/**
 * An elastic tether between one body node and the board's plug, applied once a
 * step as equal and opposite impulses along the cord. It only pulls.
 */
export class Leash {
  /** The cord's working length, m: `LEASH.length`, shorter while reeled in. */
  length: number = LEASH.length;
  snapped = false;
  /** Tension at the latest step, N, and the ends' distance, m. */
  tension = 0;
  distance = 0;
  /** The hands are taking the cord in this step. */
  reeling = false;
  private readonly along = new Vector3();
  private readonly plugVelocity = new Vector3();
  private readonly impulse = new Vector3();

  /** A new leash, whole and at full length. */
  reset(): void {
    this.length = LEASH.length;
    this.snapped = false;
    this.tension = 0;
    this.distance = 0;
    this.reeling = false;
  }

  /** The cord's tension, N, stretched `stretch` m past its length and lengthening at `rate` m/s. */
  tensionAt(stretch: number, rate: number): number {
    if (!(stretch > 0)) return 0;
    const soft = LEASH.softShare * LEASH.length;
    const spring = stretch <= soft
      ? (LEASH.softTension * stretch) / soft
      : LEASH.softTension + LEASH.stiffness * (stretch - soft);
    return Math.max(0, spring + LEASH.damping * Math.max(0, rate));
  }

  /**
   * One step: while `reel` is held the hands take up the slack and shorten the
   * cord as long as they can still pull; let go, it is back to full length.
   * Then the cord pulls `node` (at `ankle`) and the board (at `plug`) together.
   */
  step(dt: number, ankle: Readonly<Vector3>, node: LeashNode, plug: Readonly<Vector3>, board: BoardContactBody, reel: boolean): void {
    this.tension = 0;
    const along = this.along.subVectors(plug, ankle);
    this.distance = along.length();
    this.reeling = reel && !this.snapped && this.distance > LEASH.reach;
    if (!reel) this.length = LEASH.length;
    if (this.snapped || this.distance < 1e-6) return;
    along.divideScalar(this.distance);
    board.velocityAt(plug, this.plugVelocity);
    const rate = this.plugVelocity.sub(node.velocity).dot(along);
    if (this.reeling) {
      // Hand over hand: the slack is taken up at once, then the cord shortens while the arms can still pull.
      this.length = Math.min(this.length, Math.max(LEASH.reach, this.distance));
      if (this.tensionAt(this.distance - this.length, rate) < LEASH.reelForce) {
        this.length = Math.max(LEASH.reach, this.length - LEASH.reelRate * dt);
      }
    }
    let tension = this.tensionAt(this.distance - this.length, rate);
    if (this.reeling) tension = Math.min(tension, LEASH.reelForce);
    if (tension > LEASH.snap) {
      this.snapped = true;
      return;
    }
    this.tension = tension;
    if (tension === 0) return;
    const impulse = this.impulse.copy(along).multiplyScalar(tension * dt);
    node.velocity.addScaledVector(impulse, 1 / node.mass);
    board.applyImpulse(impulse.multiplyScalar(-1), plug);
  }
}
