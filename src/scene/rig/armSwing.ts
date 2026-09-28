import { Vector3 } from 'three';
import type { Side } from './humanoidBones';

const GRAVITY = 9.81;
/**
 * Winter 2009 (Biomechanics and Motor Control of Human Movement, table 4.1):
 * each arm segment's mass (share of the body's), its centre of mass from the
 * proximal joint, and its radius of gyration about that centre (shares of the
 * segment's length).
 */
const SEGMENTS = {
  upper: { mass: 0.028, centre: 0.436, gyration: 0.322 },
  fore: { mass: 0.016, centre: 0.43, gyration: 0.303 },
  hand: { mass: 0.006, centre: 0.506, gyration: 0.297 },
};
/** A step longer than this, s, is a gap (a paused page, a new session): the swing starts at rest. */
const GAP = 0.25;
/** A change of the shoulder's velocity above this within a step, m/s, is a jump (a teleport, a switch), not a motion: the swing starts at rest. */
const JUMP = 3;
/**
 * A sustained acceleration is the body's and the arm's tone's, not the swing's:
 * the swing feels the shoulder's velocity less its running mean over HOLD, s
 * (provisional). A board slowing on flat water, or the steady pull of a carve
 * the body leans against, would otherwise hold the hands off their places.
 */
const HOLD = 0.5;

/**
 * The straight arm's pendulum frequency about the shoulder, rad/s, from its
 * segments' lengths, m: √(g·d / k²), d the arm's centre of mass from the
 * shoulder and k its radius of gyration there (Winter 2009's segments).
 */
export function armPendulum(upper: number, fore: number, hand: number): number {
  const parts = [
    { ...SEGMENTS.upper, length: upper, from: 0 },
    { ...SEGMENTS.fore, length: fore, from: upper },
    { ...SEGMENTS.hand, length: hand, from: upper + fore },
  ];
  let mass = 0;
  let moment = 0;
  let inertia = 0;
  for (const part of parts) {
    const centre = part.from + part.centre * part.length;
    mass += part.mass;
    moment += part.mass * centre;
    inertia += part.mass * ((part.gyration * part.length) ** 2 + centre ** 2);
  }
  return Math.sqrt((GRAVITY * moment) / inertia);
}

interface Hand {
  /** The hand's offset from its cued place, m, and its velocity, m/s, in the world. */
  readonly offset: Vector3;
  readonly velocity: Vector3;
  /** The shoulder last followed, its velocity and that velocity's running mean (valid once `moving`), and the clock then. */
  readonly shoulder: Vector3;
  readonly shoulderVelocity: Vector3;
  readonly sustained: Vector3;
  moving: boolean;
  clock: number;
}

const newHand = (): Hand => ({
  offset: new Vector3(), velocity: new Vector3(), shoulder: new Vector3(), shoulderVelocity: new Vector3(), sustained: new Vector3(), moving: false, clock: Number.NaN,
});

/**
 * The free arms' swing (the riding body, step 4): each hand a mass on a
 * critically damped spring about its cued place, driven by its shoulder's
 * motion, so the body's pump and turns leave the hand behind for a moment and
 * it settles back. The arms as passive mass dampers driven by the body (Pontzer
 * et al. 2009, J Exp Biol 212: 523–534); damped critically, held by the arm's
 * tone rather than swinging free (provisional). The cue's own changes (an arm
 * raised, a hand reaching down) are the rig's, not the swing's. Stateful per
 * clock: a clock standing still keeps the swing; a fresh start, a gap or a jump
 * starts it at rest.
 */
export class ArmSwing {
  private readonly hands: Record<Side, Hand> = { left: newHand(), right: newHand() };
  private readonly scratch = new Vector3();
  private readonly swung = new Vector3();
  private readonly reach = new Vector3();

  /** `omega`: the arm's pendulum, rad/s (`armPendulum`); `most`: by default, how far the hand swings off its cued direction from the shoulder, rad. */
  constructor(private readonly omega: number, private readonly most: number) {}

  /**
   * Swings the hand whose shoulder is at `shoulder` at `clock`, and moves its
   * cued place `target` `share` (0–1) of the way to where the hand hangs, within
   * `most` rad of the cued direction: a hand on a point (share 0) keeps its
   * target while its swing runs on, so it comes back to it without a jump.
   */
  follow(side: Side, shoulder: Vector3, target: Vector3, share: number, clock: number, most = this.most): void {
    const hand = this.hands[side];
    const dt = clock - hand.clock;
    if (!(dt >= 0) || dt >= GAP) {
      this.rest(hand, shoulder, clock);
      return;
    }
    if (dt > 0) {
      const velocity = this.scratch.subVectors(shoulder, hand.shoulder).divideScalar(dt);
      if (!hand.moving) hand.sustained.copy(velocity);
      const sustained = this.swung.copy(hand.sustained).lerp(velocity, 1 - Math.exp(-dt / HOLD));
      if (hand.moving) {
        // The change this step of the shoulder's velocity less its sustained part, taken as an impulse: the hand keeps its own.
        const kick = this.reach.subVectors(hand.shoulderVelocity, hand.sustained).sub(velocity).add(sustained);
        if (kick.length() > JUMP) {
          this.rest(hand, shoulder, clock);
          return;
        }
        hand.velocity.add(kick);
      }
      hand.shoulderVelocity.copy(velocity);
      hand.sustained.copy(sustained);
      hand.moving = true;
      // The critically damped spring's exact step: the same at any rate.
      const decay = Math.exp(-this.omega * dt);
      const carry = this.swung.copy(hand.velocity).addScaledVector(hand.offset, this.omega);
      hand.offset.addScaledVector(carry, dt).multiplyScalar(decay);
      hand.velocity.addScaledVector(carry, -this.omega * dt).multiplyScalar(decay);
      hand.shoulder.copy(shoulder);
      hand.clock = clock;
    }
    if (share > 0) this.hang(hand, shoulder, target, share, most);
  }

  /** Holds the hand at rest (lying, pushing, fallen): the next swing starts from here. */
  still(side: Side, shoulder: Vector3, clock: number): void {
    this.rest(this.hands[side], shoulder, clock);
  }

  /** Forgets the swings: the next follow starts each hand at rest. */
  reset(): void {
    for (const side of ['left', 'right'] as const) this.hands[side].clock = Number.NaN;
  }

  private rest(hand: Hand, shoulder: Vector3, clock: number): void {
    hand.offset.set(0, 0, 0);
    hand.velocity.set(0, 0, 0);
    hand.shoulder.copy(shoulder);
    hand.moving = false;
    hand.clock = clock;
  }

  /** The hand at its offset, kept at the target's reach from the shoulder and within `most` of its direction; `share` of the way. */
  private hang(hand: Hand, shoulder: Vector3, target: Vector3, share: number, most: number): void {
    const reach = this.reach.subVectors(target, shoulder);
    const length = reach.length();
    if (length < 1e-6) return;
    const swung = this.swung.copy(target).add(hand.offset).sub(shoulder);
    if (swung.lengthSq() < 1e-12) return;
    if (reach.angleTo(swung) > most) {
      // Turned back toward the cued direction, in the plane of the two.
      const across = this.scratch.copy(swung).addScaledVector(reach, -swung.dot(reach) / (length * length)).normalize();
      swung.copy(reach).multiplyScalar(Math.cos(most) / length).addScaledVector(across, Math.sin(most));
    }
    swung.setLength(length).add(shoulder);
    target.lerp(swung, share);
  }
}
