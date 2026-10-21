import { Quaternion, Vector3 } from 'three';
import { BOARD_CENTRE, BOARD_LENGTH, deckAt, railHalfWidth } from './boardDeck';
import { POINT, type RiderVisualState } from './riderVisualState';

/**
 * The fall's shape, read once at its start from its cause (the animation-realism
 * plan's §7): to the side (the default: feet first), flat (onto reef: the depth
 * is unknown), a pearl (thrown forward over a dug-in nose), over the falls (a
 * ball, pitched with the lip) and off the back (seat first).
 */
export type FallShape = 'side' | 'flat' | 'pearl' | 'falls' | 'back';

/**
 * How the fallen surfer's reflexes and recovery stages are read from the drawn
 * state (the animation-realism plan's §6, §7 and phase 4), every time in s,
 * angles in °, lengths in m:
 * - the protective reflex starts `onset` after the fall (a sudden fall's first
 *   muscle responses come 54–85 ms after its onset, the deltoid's at 80 ms:
 *   Bisdorff et al. 1999, J Neurol Neurosurg Psychiatry 66: 447–455; and a
 *   muscle moves the limb some 40 ms after it fires); the knees start to bend
 *   by `braced` (bent by `bent`), the forearms cover the head by `shielded`
 *   (the plan's 0.25 and 0.4 s; at 0.4 the arm's swing up spiked the drawn
 *   body's switch, the bones' smoothing over it); the shield holds until the
 *   swimmer has surfaced (Rapture: cover the head under water, the arms
 *   overhead rising);
 * - the cause's own shape (the pearl's arms forward round the head, falling off
 *   the back's arms out and back) shows from the onset, handing over to the
 *   shield from `causeHold` over `causeFade`;
 * - the shape: the session's cause where it names one (local only: `impact` is
 *   the lip's, over the falls; `reef`, flat), else the board's pitch at the fall:
 *   nose down past `pearlPitch` a pearl, nose up past `backPitch` off the back;
 *   a body slipping back off the board faster than `backSlip` m/s over the first
 *   `window` s is off the back too, and one lifted faster than `lift` m/s within
 *   `liftWithin` s (after the switch's blend, `liftAfter`) goes over the falls
 *   (the plan's §7: remote surfers read the motion only);
 * - tumbling: the drawn spine turning faster than `tumble` rad/s (smoothed over
 *   `tumbleSmooth`), the loose curl held `tumbleHold` after; over the falls, the
 *   ball for at least `ballFor` (Rapture: limp, let it tumble; hold-downs 5–10 s);
 *   in over `curlIn`, out over `curlOut`;
 * - feet first in the air: the pelvis `airFrom`–`airFull` m over the board's
 *   centre (it floats at the surface) and falling faster than `airFalling` m/s,
 *   within the fall's first `airWithin`, a reflex from the onset, in over `airIn`;
 * - surfaced: the head out of the water for `outFor` (none before `settle`, nor
 *   tumbling), or, its head bobbing at the surface (the physics floats it
 *   there), calm for `calmFor` with the head within `nearSurface` of the board's
 *   centre; under again only for `underFor`, deeper than `deepUnder` (a wave);
 *   rising under water faster than `rising` m/s before that, the arms crossed
 *   overhead (in over `surfaceIn`, held `surfaceHold` once up);
 * - treading water once up, in over `treadIn`, looking round (`look`: s, ° from
 *   the board's bearing: to the board, then away for the next wave, a fixed
 *   scan as the drawn state carries no wave, as the sit's);
 * - the near hand reaches for the board within `reach` of the chest, surfaced
 *   and calm, in over `reachIn`;
 * - reeling (the snapshot's bit), in over `reelIn`, out over `reelOut`, held
 *   `reelHold` past the bit (it flickers at the leash's reach); holding the board
 *   in over `climbIn`, the pull (the chest over the deck, within `overDeck` of
 *   it, the deck facing up: its normal's up past `deckUp`, the physics' aligned
 *   board's 0.7) in over `pullIn`; the hands keep the rail they took until the
 *   chest is `railSwitch` past the other; the crawl's share in over `strokeIn`
 *   (held `strokeHold`).
 */
export const FALL_READING = {
  onset: 0.12, braced: 0.25, bent: 0.4, shielded: 0.45,
  causeHold: 0.5, causeFade: 0.3,
  pearlPitch: 25, backPitch: 20, backSlip: 1.5, window: 0.12, lift: 1, liftAfter: 0.1, liftWithin: 0.6,
  tumble: 3, tumbleSmooth: 0.08, tumbleHold: 0.6, ballFor: 1.5, curlIn: 0.3, curlOut: 0.5,
  airFrom: 0.15, airFull: 0.4, airFalling: 0.3, airWithin: 1.5, airIn: 0.3,
  settle: 0.6, outFor: 0.3, calmFor: 1.5, calmRate: 1.2, nearSurface: 0.3, underFor: 1.2, deepUnder: 0.5,
  rising: 0.1, surfaceIn: 0.3, surfaceHold: 0.3,
  treadIn: 0.6, treadOut: 0.4,
  look: [[0, 0], [1.4, 0], [2.4, -75], [3.0, -75], [3.8, 0]] as readonly (readonly [number, number])[],
  reach: 1.5, reachIn: 0.4,
  reelIn: 0.3, reelOut: 0.3, reelHold: 0.4,
  climbIn: 0.4, pullIn: 0.25, overDeck: 0.15, deckUp: 0.7, railSwitch: 0.1,
  strokeIn: 0.3, strokeHold: 0.3,
};

/** The fallen surfer's stages, each 0–1 (eased), read by `FallStages`. */
export interface FallWeights {
  shape: FallShape;
  /** Time into the fall, s. */
  since: number;
  /** The forearms over the head (the brace, then the shield), until surfaced. */
  guard: number;
  /** The knees' reflex bend. */
  bend: number;
  /** The cause's own first shape (the pearl's, off the back's), handing over to the shield. */
  cause: number;
  /** Feet first in the air (flat onto reef). */
  air: number;
  /** The loose curl tumbling (the ball over the falls). */
  curl: number;
  /** Rising under water: the arms crossed overhead. */
  surfacing: number;
  /** Up: treading water, looking round. */
  surfaced: number;
  /** Looking round once up: the look's yaw from the board's bearing, °. */
  lookYaw: number;
  /** The near hand reaching for the board. */
  reach: number;
  reel: number;
  /** Holding the board, and pulling the chest over the deck. */
  climb: number;
  pull: number;
  /** The crawl's share of the arms. */
  stroke: number;
}

export function createFallWeights(): FallWeights {
  return {
    shape: 'side', since: 0, guard: 0, bend: 0, cause: 0, air: 0, curl: 0, surfacing: 0, surfaced: 0, lookYaw: 0, reach: 0, reel: 0, climb: 0, pull: 0, stroke: 0,
  };
}

const DEG = Math.PI / 180;
const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
const ramp = (x: number, from: number, full: number) => Math.max(0, Math.min(1, (x - from) / (full - from)));

/** A linear weight moving at its rates toward a target (eased when read). */
class Rate {
  value = 0;
  step(target: number, dt: number, rise: number, fall = rise): number {
    const most = dt / (target > this.value ? rise : fall);
    this.value += Math.max(-most, Math.min(most, target - this.value));
    return ease(this.value);
  }
}

/** The look's yaw at `time` s since surfacing (`FALL_READING.look`), eased between its keys. */
export function fallLook(time: number): number {
  const keys = FALL_READING.look;
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, y1] = keys[i];
    const [t0, y0] = keys[i - 1];
    if (time > t1) continue;
    const s = t1 > t0 ? Math.max(0, (time - t0) / (t1 - t0)) : 1;
    return y0 + (y1 - y0) * s * s * s * (s * (6 * s - 15) + 10);
  }
  return keys[keys.length - 1][1];
}

/**
 * The fallen surfer's stages (the animation-realism plan's phase 4), read from
 * the drawn state only (the session's cause aside, local and optional), so a
 * remote surfer reads them alike: the protective reflexes over the ragdoll and
 * their shape by cause, tumbling, feet first, surfacing, treading water and
 * looking round, reaching for the board, reeling the leash and holding the
 * board to climb on. Read fallen; anything else lets it go, and the next fall
 * starts over.
 */
export class FallStages {
  readonly weights = createFallWeights();
  /** The board's point nearest the chest (the world), how far, and the rail it is on (+1 the board's left, −1 its right, in its frame). */
  readonly nearest = new Vector3();
  distance = Number.POSITIVE_INFINITY;
  nearRail = 1;
  /** The chest is over the deck (within `overDeck` of it, between the rails). */
  overDeck = false;
  /** The last read held the board (the rail it holds is kept). */
  private holdingRail = false;
  /** When the swimmer surfaced (the clock), for the look round. */
  surfacedAt = Number.NaN;
  private clock = Number.NaN;
  private start = Number.NaN;
  private slip = 0;
  private slipTime = 0;
  private readonly pelvis = new Vector3();
  private readonly head = new Vector3();
  private readonly spine = new Vector3();
  private turnRate = 0;
  private headRise = 0;
  private pelvisRise = 0;
  private tumbleUntil = Number.NEGATIVE_INFINITY;
  private outTime = 0;
  private underTime = 0;
  private calmTime = 0;
  private up = false;
  private reelAt = Number.NEGATIVE_INFINITY;
  private strokeAt = Number.NEGATIVE_INFINITY;
  private readonly rates = {
    curl: new Rate(), air: new Rate(), surfacing: new Rate(), surfaced: new Rate(), reach: new Rate(), reel: new Rate(), climb: new Rate(), pull: new Rate(), stroke: new Rate(),
  };
  private readonly inverse = new Quaternion();
  private readonly local = new Vector3();
  private readonly scratch = new Vector3();

  reset(): void {
    this.clock = Number.NaN;
  }

  /** Whether the reader has a fall under way (read since its start, no gap). */
  get active(): boolean {
    return Number.isFinite(this.clock);
  }

  update(state: RiderVisualState): FallWeights {
    const R = FALL_READING;
    const w = this.weights;
    const dt = state.clock - this.clock;
    if (dt === 0) return w;
    const p = state.points;
    this.readBoard(state);
    if (!(dt > 0 && dt < 0.25)) {
      this.begin(state);
      return w;
    }
    this.clock = state.clock;
    const since = state.clock - this.start;
    w.since = since;
    // The motion: the pelvis and the head rising (smoothed over a frame or two), the spine's turn rate.
    const smooth = 1 - Math.exp(-dt / 0.05);
    this.pelvisRise += ((p[POINT.pelvis].y - this.pelvis.y) / dt - this.pelvisRise) * smooth;
    this.headRise += ((p[POINT.head].y - this.head.y) / dt - this.headRise) * smooth;
    const spine = this.scratch.subVectors(p[POINT.torso], p[POINT.pelvis]);
    if (spine.lengthSq() > 1e-10) {
      spine.normalize();
      const turn = Math.acos(Math.max(-1, Math.min(1, spine.dot(this.spine)))) / dt;
      this.turnRate += (turn - this.turnRate) * (1 - Math.exp(-dt / R.tumbleSmooth));
      this.spine.copy(spine);
    }
    // The shape by the body's motion: slipping back off the board in the first moments; lifted with the lip.
    if (since <= R.window) {
      this.local.copy(state.travel).multiplyScalar(state.speed);
      this.local.y = state.climb;
      const nose = this.scratch.set(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0);
      if (nose.lengthSq() > 1e-8) {
        nose.normalize();
        const body = this.local.negate().addScaledVector(this.pelvis, -1 / dt).addScaledVector(p[POINT.pelvis], 1 / dt);
        this.slip += body.dot(nose) * dt;
        this.slipTime += dt;
      }
    } else if (this.slipTime > 0) {
      if (w.shape === 'side' && this.slip / this.slipTime < -R.backSlip) w.shape = 'back';
      this.slipTime = 0;
    }
    if (since > R.liftAfter && since <= R.liftWithin && this.pelvisRise > R.lift && w.shape !== 'flat') w.shape = 'falls';
    this.pelvis.copy(p[POINT.pelvis]);
    this.head.copy(p[POINT.head]);
    // Tumbling, and the curl (the ball held a while over the falls).
    if (this.turnRate > R.tumble) this.tumbleUntil = state.clock + R.tumbleHold;
    const tumbling = state.clock < this.tumbleUntil;
    const curl = tumbling || (w.shape === 'falls' && since < R.ballFor && since > R.onset) ? 1 : 0;
    // Under and out: surfaced once out a while (not tumbling, nor straight after the fall), or calm at the surface.
    const under = state.swim.under;
    this.outTime = under ? 0 : this.outTime + dt;
    this.underTime = under ? this.underTime + dt : 0;
    const near = this.boardHeight(state);
    const calm = !tumbling && Math.abs(this.headRise) < 0.15 && this.turnRate < R.calmRate;
    this.calmTime = calm ? this.calmTime + dt : 0;
    const atSurface = Number.isFinite(near) && p[POINT.head].y > near - R.nearSurface;
    if (!this.up) {
      if (since >= R.settle && !tumbling && (this.outTime >= R.outFor || (this.calmTime >= R.calmFor && atSurface))) {
        this.up = true;
        this.surfacedAt = state.clock;
      }
    } else if (tumbling || (this.underTime >= R.underFor && Number.isFinite(near) && p[POINT.head].y < near - R.deepUnder)) {
      this.up = false;
    }
    const rising = !this.up && since >= R.settle && under && this.headRise > R.rising;
    const holdUp = this.up && state.clock - this.surfacedAt < R.surfaceHold;
    // The weights.
    const onset = ease((since - R.onset) / (R.shielded - R.onset));
    w.bend = ease((since - R.onset) / (R.bent - R.onset));
    const surfacedNow = this.rates.surfaced.step(this.up ? 1 : 0, dt, R.treadIn, R.treadOut);
    w.surfaced = surfacedNow;
    w.guard = onset * (1 - surfacedNow);
    w.cause = w.shape === 'pearl' || w.shape === 'back' ? ease((since - R.onset) / (R.braced - R.onset)) * (1 - ease((since - R.causeHold) / R.causeFade)) : 0;
    w.curl = this.rates.curl.step(curl, dt, R.curlIn, R.curlOut);
    const height = Number.isFinite(near) ? p[POINT.pelvis].y - near : Number.NaN;
    const air = since < R.airWithin && !under && this.pelvisRise < -R.airFalling ? ramp(height, R.airFrom, R.airFull) : 0;
    // A reflex too: from the onset.
    w.air = this.rates.air.step(Number.isFinite(air) ? air * Math.min(1, Math.max(0, (since - R.onset) / (R.braced - R.onset))) : 0, dt, R.airIn, 0.25);
    w.surfacing = this.rates.surfacing.step(rising || holdUp || (w.surfacing > 0.5 && this.up && holdUp) ? 1 : 0, dt, R.surfaceIn);
    w.lookYaw = this.up ? fallLook(state.clock - this.surfacedAt) : 0;
    if (state.leash.reeling) this.reelAt = state.clock;
    if (state.swim.stroking) this.strokeAt = state.clock;
    const reeling = state.clock - this.reelAt <= R.reelHold;
    const stroking = state.clock - this.strokeAt <= R.strokeHold;
    w.reel = this.rates.reel.step(reeling && !state.swim.holding ? 1 : 0, dt, R.reelIn, R.reelOut);
    w.climb = this.rates.climb.step(state.swim.holding ? 1 : 0, dt, R.climbIn);
    w.pull = this.rates.pull.step(state.swim.holding && this.overDeck ? 1 : 0, dt, R.pullIn);
    w.stroke = this.rates.stroke.step(stroking ? 1 : 0, dt, R.strokeIn);
    const reach = this.up && calm && !stroking && !reeling && !state.swim.holding && this.distance < R.reach;
    w.reach = this.rates.reach.step(reach ? 1 : 0, dt, R.reachIn);
    return w;
  }

  /** A fall starts (or is read afresh after a gap): its shape from the cause, or the board's pitch now. */
  private begin(state: RiderVisualState): void {
    const R = FALL_READING;
    const w = this.weights;
    this.clock = state.clock;
    this.start = state.clock;
    const nose = this.scratch.set(0, 0, 1).applyQuaternion(state.boardQuaternion);
    const pitch = Math.asin(Math.max(-1, Math.min(1, nose.y))) / DEG;
    const cause = state.separation;
    w.shape = cause === 'impact' ? 'falls' : cause === 'reef' ? 'flat' : pitch < -R.pearlPitch ? 'pearl' : pitch > R.backPitch ? 'back' : 'side';
    w.since = 0;
    w.guard = w.bend = w.cause = w.air = w.curl = w.surfacing = w.surfaced = w.reach = w.reel = w.climb = w.pull = w.stroke = 0;
    w.lookYaw = 0;
    for (const rate of Object.values(this.rates)) rate.value = 0;
    // Already holding, reeling or swimming (a fall read afresh): those as they are.
    this.rates.climb.value = state.swim.holding ? 1 : 0;
    this.rates.reel.value = state.leash.reeling ? 1 : 0;
    this.rates.stroke.value = state.swim.stroking ? 1 : 0;
    this.slip = 0;
    this.slipTime = 0;
    this.pelvis.copy(state.points[POINT.pelvis]);
    this.head.copy(state.points[POINT.head]);
    this.spine.subVectors(state.points[POINT.torso], state.points[POINT.pelvis]).normalize();
    this.turnRate = 0;
    this.headRise = 0;
    this.pelvisRise = 0;
    this.tumbleUntil = Number.NEGATIVE_INFINITY;
    this.outTime = this.underTime = this.calmTime = 0;
    this.up = false;
    this.surfacedAt = Number.NaN;
    this.reelAt = this.strokeAt = Number.NEGATIVE_INFINITY;
  }

  /** The board's centre height (it floats at the surface), when it is near enough to stand for the surface here (within 4 m). */
  private boardHeight(state: RiderVisualState): number {
    const pelvis = state.points[POINT.pelvis];
    const dx = pelvis.x - state.boardPosition.x;
    const dz = pelvis.z - state.boardPosition.z;
    return dx * dx + dz * dz < 16 ? state.boardPosition.y : Number.NaN;
  }

  /** The board's point nearest the chest, its distance and rail, and whether the chest is over the deck. */
  private readBoard(state: RiderVisualState): void {
    this.inverse.copy(state.boardQuaternion).invert();
    const chest = this.local.copy(state.points[POINT.torso]).sub(state.boardPosition).applyQuaternion(this.inverse).add(BOARD_CENTRE);
    const half = BOARD_LENGTH / 2;
    const z = Math.max(-half, Math.min(half, chest.z));
    const rail = railHalfWidth(z);
    const deck = deckAt(z);
    // Holding the board, the rail the hands took (the chest wanders under the board as it rolls: the hands jumped rails),
    // changed only once the chest is well past the other one.
    const side = chest.x >= 0 ? 1 : -1;
    if (!state.swim.holding || !this.holdingRail) this.nearRail = side;
    else if (chest.x * this.nearRail < -(railHalfWidth(Math.max(-BOARD_LENGTH / 2, Math.min(BOARD_LENGTH / 2, chest.z))) + FALL_READING.railSwitch)) this.nearRail = side;
    this.holdingRail = state.swim.holding;
    const deckUp = this.scratch.set(0, 1, 0).applyQuaternion(state.boardQuaternion).y;
    this.overDeck = deckUp >= FALL_READING.deckUp && Math.abs(chest.x) <= rail && chest.y >= deck - FALL_READING.overDeck && Math.abs(chest.z) <= half;
    const x = Math.max(-rail, Math.min(rail, chest.x));
    const y = Math.max(deck - 0.07, Math.min(deck, chest.y));
    this.nearest.set(x, y, z).sub(BOARD_CENTRE).applyQuaternion(state.boardQuaternion).add(state.boardPosition);
    this.distance = this.nearest.distanceTo(state.points[POINT.torso]);
  }
}
