/**
 * **Step 3.5i: the two quantities the engine COMPUTES AND THROWS AWAY — measured, on the owner's own rider and spot.**
 *
 * Two force-class rulings are open and both are stated in adjectives. This file turns them into numbers. **It changes
 * no behaviour, tunes no constant, adds no switch and pairs nothing.** Nothing under `src/` or `server/` is touched:
 * the instrument is a read-only wrapper installed on two prototypes from this file, and `PROBE=off` runs the same
 * bench with no wrapper at all so the two dumps can be compared value by value.
 *
 * ## A — the hip clamp's discarded angular impulse
 *
 * `standingBody.ts`'s `hipStep` [R, `:295–311`] integrates the trunk rotor and then clamps it:
 *
 *     this.hip.torque = burst - back * I * w * (w * angle + 2 * rate);   // the torque `couple()` pairs
 *     this.hip.rate  += h * this.hip.torque / I;
 *     this.hip.angle += h * this.hip.rate;
 *     if (Math.abs(this.hip.angle) > range) {
 *       this.hip.angle = Math.sign(this.hip.angle) * range;
 *       if (this.hip.rate * this.hip.angle > 0) this.hip.rate = 0;      // <- I x rate vanishes
 *     }
 *
 * and `couple()` [R, `:379`] pairs `this.hip.torque`, which was computed **before** the clamp. So zeroing `hip.rate`
 * removes `HIP_PITCH_INERTIA x rate` of angular momentum from the rotor with no reaction anywhere.
 *
 * **The instrument is an identity, not a model.** Every term of that integration is public after the call
 * (`hip.angle`, `hip.rate`, `hip.torque`), `h` and `depth` are the call's own arguments, and `HIP_PITCH_INERTIA` is a
 * module constant, so the pre-clamp state is recoverable exactly:
 *
 *     ratePre  = rateBefore + h * hip.torque / I
 *     anglePre = angleBefore + h * ratePre
 *
 * and the clamp fired iff `|anglePre| > hipRange(depth)`. **This reconstruction is CHECKED, not assumed:** on every
 * substep where the clamp did NOT fire, `anglePre` and `ratePre` must equal the post-call `hip.angle` and `hip.rate`
 * **exactly** (`===`), and on every substep where it did, `hip.angle` must equal `sign(anglePre) * range` exactly. The
 * counts of both are printed. That identity is what makes the discarded figure a measurement.
 *
 * **The limit MOVES.** `range = hipRange(depth)` and `depth = -leg.rest` [R, `AttachedRider.ts:3482`], which the leg
 * follower moves continuously, so a firing can mean two different things and they are counted separately:
 *
 * | class | test | what it is |
 * | --- | --- | --- |
 * | **driven** | `range >= rangePrev` and `\|anglePre\| > range` | the rotor drove itself into a stop that did not move |
 * | **shrink** | `range < rangePrev` | the stop moved onto the rotor as the legs bent |
 *
 * ⚠️ **`HIP_PITCH_INERTIA` is a CONSTANT 8 kg.m^2** [R, `standingBody.ts:93`]. It does not depend on depth, so there
 * is no "momentum changed because the inertia changed" bookkeeping term to separate out at all — what moves with depth
 * is the **range**, and that is the split above. The brief's warning is right in substance and wrong in its letter,
 * and the two classes are reported apart so a moving stop can never be read as a driven one.
 *
 * ## B — the hand's discarded residual moment (engine-target row 19)
 *
 * `wetForce` [R, `AttachedRider.ts:4488–4490`] sums the hand's force into `waterForce` and adds
 * `cross(hand - position, force)` — **the full moment at the hand's own lever** — into `waterMoment`. Standing, only
 * `waterMoment.y` survives: `handYaw = this.waterMoment.y - moment` [R, `:4346`] and only `rhs[4]` receives it
 * [R, `:4726`]. The x and z components are computed and dropped (`rhs[3..5] += h * waterMoment` is the **prone**
 * branch, `if (!this.upright)` [R, `:4541–4544`]).
 *
 * The instrument differences `waterMoment` and `waterForce` across the original call, so what it reads is the engine's
 * own addition and not a re-derivation. **Two identities check it:** the differenced force must equal `this.partForce`
 * (the capped force the engine applied) to the bit, and the differenced moment must equal
 * `cross(partWorld - position, partForce)` to within double rounding. Both counts are printed.
 *
 * References, all N.m at the same substep, so the residual is never a bare N.m:
 * - **deliver** — `|cross(arm, F_hand)|`, the moment the hand's force DOES put on the board, at the rider's own lever
 *   [R, `:4536` prone and `:4724` standing, `torque = cross(a, f)`];
 * - **ankle** — `|standingBody.torque|`, the pitch ankle's own torque that substep;
 * - **gravity** — `|cross(position - baseWorld, (0, -m g, 0))|`, the body's weight moment about the stance point: the
 *   inverted pendulum's own toppling moment, the scale balance works against.
 *
 * ## The live window
 *
 * `AttachedRider.separate` [R, `:5227-5232`, not `:4586`] sets `attached`/`climbing`/`inContact`/`separation` and **never `phase` or
 * `upright`**, so every rider column freezes after separation — and `freeBody` does not read `attached`, so the
 * wrapper keeps being called on a dead rider. **Every figure here is a per-frame DELTA of the accumulators, added only
 * on frames with `attached && upright && phase === 'standing'`**, and the frozen frames are counted and printed beside
 * the kept ones.
 *
 * ## What a zero would mean, and the positive controls
 *
 * - **A zero in A** would mean the `braking` backstop always wins and the clamp is never reached. **Positive control
 *   `INJECT=hip`:** at a chosen substep the wrapper sets `hip.angle` to the limit and `hip.rate` to a known
 *   `INJRATE`, so a clamp MUST fire with a discard of about `I * INJRATE`; the probe must report it.
 * - **A zero in B** would mean the hand never loads, or its moment is exactly along world Y. **Positive control
 *   `INJECT=hand`:** the wrapper adds a known force `INJF` at a known offset `INJARM` into `waterForce`/`waterMoment`
 *   after the original call, so the differenced channel must report the engine's own moment PLUS exactly
 *   `cross(INJARM, INJF)` while the independent `cross(hand - position, partForce)` channel must not; the difference
 *   recovers the injection. `SELFTEST=1` additionally puts known vectors through the same reduction arithmetic.
 *
 * **Both INJECT arms change the ride and are controls, never measurements.** No reported number comes from them.
 *
 * ## Run from the repository's root
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/discarded.ts -o <scratch>/discarded.mjs --format esm --platform node
 *   SELFTEST=1 node <scratch>/discarded.mjs
 *   PROBE=on  OUT=<scratch>/on.jsonl  node <scratch>/discarded.mjs
 *   PROBE=off OUT=<scratch>/off.jsonl node <scratch>/discarded.mjs
 *   MODE=compare A=<scratch>/on.jsonl B=<scratch>/off.jsonl node <scratch>/discarded.mjs
 *   INJECT=hip  PROBE=on OUT=<scratch>/injhip.jsonl  node <scratch>/discarded.mjs
 *   INJECT=hand PROBE=on OUT=<scratch>/injhand.jsonl node <scratch>/discarded.mjs
 *
 * Env: `MODE=ride|compare`, `PROBE=on|off`, `SEED`, `SIZE`, `SECONDS`, `TRIALS`, `GAP`, `STANCES`, `ENTRIES`, `ARMS`
 * (`plain`, `stick`, `hand`, `handstick`), `SIDE`, `RIDER=new|old`, `FELT=deck`, `BODY=two`, `INJECT`, `INJRATE`,
 * `INJSUB`, `SELFTEST`, `OUT`, `A`, `B`.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { WATER } from '../../../../src/physics/hullForces';
import { RIDER_PARTS, riderPartMasses } from '../../../../src/physics/riderPosture';
import { HIP_PITCH_INERTIA, StandingBody, hipRange } from '../../../../src/physics/standingBody';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const MODE = (process.env.MODE ?? 'ride') as 'ride' | 'compare';
const PROBE = (process.env.PROBE ?? 'on') === 'on';
const SEED = Number(process.env.SEED ?? 1);
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const SECONDS = Number(process.env.SECONDS ?? 4);
const TRIALS = Number(process.env.TRIALS ?? 3);
const GAP = Number(process.env.GAP ?? 1.5);
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];
const ENTRIES = (process.env.ENTRIES ?? '2,5').split(',').map(Number);
const ARMS = (process.env.ARMS ?? 'plain,stick,hand,handstick').split(',') as ArmName[];
const SIDE = Number(process.env.SIDE ?? -45);
const RIDER = process.env.RIDER ?? 'new';
const FELT = process.env.FELT ?? 'deck';
const BODY = process.env.BODY ?? 'two';
const INJECT = process.env.INJECT ?? '';
/** The known rotor rate injected by the `INJECT=hip` control, rad/s, and the substep of each rider it is injected on. */
const INJRATE = Number(process.env.INJRATE ?? 2);
const INJSUB = Number(process.env.INJSUB ?? 40);
/** The known force and lever injected by the `INJECT=hand` control (world), N and m. */
const INJF = new Vector3(3, -5, 7);
const INJARM = new Vector3(0.11, -0.23, 0.37);
const OUT = process.env.OUT;

type Stance = 'tall' | 'crouch' | 'compress';
type ArmName = 'plain' | 'stick' | 'hand' | 'handstick';

const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};
const r = (v: number, n: number): number | null => (Number.isFinite(v) ? Number(v.toFixed(n)) : null);


// ---------------------------------------------------------------------------------------------------------------
// Quantiles. `qt` is this track's own upper-middle element; `med` is the plain median. Both are printed and named.
// ---------------------------------------------------------------------------------------------------------------
function qt(v: number[], q: number): number {
  if (v.length === 0) return Number.NaN;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}
function med(v: number[]): number {
  if (v.length === 0) return Number.NaN;
  const s = [...v].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

// ---------------------------------------------------------------------------------------------------------------
// A's accumulator: one per StandingBody, advanced inside the wrapper, read per frame.
// ---------------------------------------------------------------------------------------------------------------
interface HipAcc {
  /** Substeps the rotor was integrated (every `prepare` call). */
  subs: number;
  /** The state before the call, and the range the previous call used. */
  angle: number;
  rate: number;
  range: number;
  seen: boolean;
  /** Firings: the angle clamp, and the subset that zeroed an outward rate. */
  fires: number;
  zeroed: number;
  /** The discarded angular momentum, N.m.s: sum of magnitudes, signed sum, largest single. */
  discard: number;
  signed: number;
  biggest: number;
  /** Split by class. */
  driven: number;
  drivenDiscard: number;
  shrink: number;
  shrinkDiscard: number;
  /** The angle the stop removed, rad, summed. */
  overshoot: number;
  /** References over the window: the rotor's own peak momentum, and the two torque impulses. */
  peak: number;
  ankle: number;
  ankleSigned: number;
  hip: number;
  /** The identity checks on the reconstruction. */
  idOk: number;
  idBad: number;
  clampOk: number;
  clampBad: number;
  worst: number;
  /** Every firing's discard, for the distribution. */
  each: number[];
  /**
   * The MECHANISM, so "it never fired" can be read as a cause and not only as a count: the hip's demand is the ankle's
   * own torque past `HIP_PITCH_SHARE` of the feet's reach [R, `standingBody.ts:276-277`], recoverable exactly in the
   * wrapper from `this.torque` before the call and the call's own `load`, `toe` and `heel`.
   */
  excessSubs: number;
  /** Substeps where the rotor was NOT at rest at zero: the non-vacuous half of the identity check. */
  moving: number;
  excessMax: number;
  headroom: number[];
  torqueMax: number;
  angleMax: number;
  rangeMin: number;
  rangeMax: number;
}

function newHip(): HipAcc {
  return {
    subs: 0, angle: 0, rate: 0, range: 0, seen: false, fires: 0, zeroed: 0, discard: 0, signed: 0, biggest: 0,
    driven: 0, drivenDiscard: 0, shrink: 0, shrinkDiscard: 0, overshoot: 0, peak: 0, ankle: 0, ankleSigned: 0,
    hip: 0, idOk: 0, idBad: 0, clampOk: 0, clampBad: 0, worst: 0, each: [],
    excessSubs: 0, moving: 0, excessMax: 0, headroom: [], torqueMax: 0, angleMax: 0, rangeMin: Infinity, rangeMax: 0,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// B's accumulator: one per AttachedRider.
// ---------------------------------------------------------------------------------------------------------------
interface HandAcc {
  /** Substeps a standing hand's `wetForce` ran (the hand loaded at all). */
  wetSubs: number;
  /** Of those, the ones whose applied force was non-zero. */
  loadSubs: number;
  /** The dropped moment's magnitude, N.m: sum, largest. */
  drop: number;
  dropMax: number;
  /** The signed board-frame components of the dropped moment, N.m, summed and counted by sign. */
  rollSum: number;
  rollPos: number;
  rollNeg: number;
  pitchSum: number;
  pitchPos: number;
  pitchNeg: number;
  /** The kept world-Y component (what becomes `handYaw`), summed as magnitude. */
  kept: number;
  /** The three references, summed as magnitudes over the same substeps. */
  deliver: number;
  ankle: number;
  gravity: number;
  /** The identity checks. */
  forceOk: number;
  forceBad: number;
  momentOk: number;
  momentBad: number;
  worstForce: number;
  worstMoment: number;
  /** The injection control's own recovery error, N.m. */
  injWorst: number;
  /**
   * How often the standing hand was ASKED for at all — `standingHand` runs only with `upright && handSide !== 0`
   * [R, `AttachedRider.ts:4296`] — against how often it came back having loaded. The difference is a hand the engine
   * placed out of the water, which is a different answer from "the player never asked".
   */
  asked: number;
  askedDry: number;
  /**
   * ⭐ The ENERGY question, which is what makes this a force-class ruling rather than bookkeeping: today the dropped
   * components do **no work and are booked as doing none** — the full `waterMoment` work is booked only
   * `if (!this.upright)` [R, `AttachedRider.ts:5093-5098`], and standing only `handYaw`'s is [R, `:5088-5090`]. So
   * pairing the residual would ADD work of `R . omega` per substep. Both the signed and the absolute sums are kept,
   * J, with the rider's own angular velocity.
   */
  energy: number;
  energyAbs: number;
  keptEnergy: number;
  /** Per-substep samples, for the distributions. */
  dropEach: number[];
  rollEach: number[];
  pitchEach: number[];
  vsDeliver: number[];
  vsAnkle: number[];
  vsGravity: number[];
  forceEach: number[];
  leverEach: number[];
  ankleEach: number[];
  deliverEach: number[];
  gravityEach: number[];
}

function newHand(): HandAcc {
  return {
    wetSubs: 0, loadSubs: 0, drop: 0, dropMax: 0, rollSum: 0, rollPos: 0, rollNeg: 0, pitchSum: 0, pitchPos: 0,
    pitchNeg: 0, kept: 0, deliver: 0, ankle: 0, gravity: 0, forceOk: 0, forceBad: 0, momentOk: 0, momentBad: 0,
    worstForce: 0, worstMoment: 0, injWorst: 0, asked: 0, askedDry: 0, energy: 0, energyAbs: 0, keptEnergy: 0, dropEach: [], rollEach: [], pitchEach: [], vsDeliver: [],
    vsAnkle: [], vsGravity: [], forceEach: [], leverEach: [], ankleEach: [], deliverEach: [], gravityEach: [],
  };
}

const hips = new WeakMap<StandingBody, HipAcc>();
const hands = new WeakMap<AttachedRider, HandAcc>();
/** The board the harness is stepping, for the hand's board-frame projection. Read only. */
let currentBoard: BoardBody | null = null;

// ---------------------------------------------------------------------------------------------------------------
// The reduction arithmetic, shared by the live path and `SELFTEST`.
// ---------------------------------------------------------------------------------------------------------------
/** The part of a world moment the standing path drops: everything but its world-Y component. */
function dropped(m: Vector3, out: Vector3): Vector3 {
  return out.set(m.x, 0, m.z);
}
/** A moment's components about the board's long axis (roll) and its beam (pitch). */
function inBoard(m: Vector3, board: BoardBody, roll: Vector3, beam: Vector3): { roll: number; pitch: number; yaw: number } {
  roll.set(0, 0, 1).applyQuaternion(board.orientation);
  beam.set(1, 0, 0).applyQuaternion(board.orientation);
  const up = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
  return { roll: m.dot(roll), pitch: m.dot(beam), yaw: m.dot(up) };
}

function selftest(): void {
  const m = new Vector3(3, -7, 11);
  const out = new Vector3();
  dropped(m, out);
  const board = new BoardBody();
  board.place(new Vector3(0, 0, 0), new Quaternion(), new Vector3());
  const axes = inBoard(m, board, new Vector3(), new Vector3());
  // A known cross product, by hand: (1,2,3) x (4,5,6) = (-3, 6, -3).
  const c = new Vector3().crossVectors(new Vector3(1, 2, 3), new Vector3(4, 5, 6));
  emit({
    kind: 'selftest',
    dropKeepsXZ: out.x === 3 && out.y === 0 && out.z === 11,
    dropLength: out.length() === Math.hypot(3, 11),
    identityBoardFrame: axes.roll === 11 && axes.pitch === 3 && axes.yaw === -7,
    cross: c.x === -3 && c.y === 6 && c.z === -3,
    hipInertia: HIP_PITCH_INERTIA,
    hipRangeTall: hipRange(0), hipRangeCrouch: hipRange(0.195), hipRangeCompress: hipRange(0.3), hipRangeTuck: hipRange(0.45),
  });
}

// ---------------------------------------------------------------------------------------------------------------
// The wrappers. Installed only with PROBE=on; each calls the original and changes nothing (INJECT arms aside).
// ---------------------------------------------------------------------------------------------------------------
type Prepare = StandingBody['prepare'];
type WetForce = (slot: number, sample: unknown, wet: number, volume: number, dragArea: number, h: number, shelter: number, buoyant?: boolean) => void;

function install(): void {
  const sbProto = StandingBody.prototype as unknown as { prepare: Prepare };
  const originalPrepare = sbProto.prepare;
  sbProto.prepare = function patched(this: StandingBody, ...args: Parameters<Prepare>): void {
    let acc = hips.get(this);
    if (!acc) {
      acc = newHip();
      hips.set(this, acc);
    }
    const h = args[0];
    const depth = args[11] ?? 0;
    const range = hipRange(depth);
    const before = { angle: this.hip.angle, rate: this.hip.rate };
    // The demand the rotor will be given this substep, from the numbers `prepare` itself reads: its own standing
    // `this.torque` (the previous substep's ankle torque) against HIP_PITCH_SHARE of the feet's reach.
    const load = Math.max(0, args[3]);
    const toe = args[9] ?? Infinity;
    const heel = args[10] ?? Infinity;
    const room = 0.8 * load;
    const ankleNow = this.torque;
    const excess = ankleNow > room * toe ? ankleNow - room * toe : ankleNow < -room * heel ? ankleNow + room * heel : 0;
    const bound = ankleNow >= 0 ? room * toe : room * heel;
    if (INJECT === 'hip' && acc.subs === INJSUB) {
      // The control: the rotor is put AT its limit with a known outward rate, so the clamp must fire.
      this.hip.angle = range;
      this.hip.rate = INJRATE;
      before.angle = range;
      before.rate = INJRATE;
    }
    originalPrepare.apply(this, args);
    acc.subs += 1;
    const torque = this.hip.torque;
    const ratePre = before.rate + (h * torque) / HIP_PITCH_INERTIA;
    const anglePre = before.angle + h * ratePre;
    const fired = Math.abs(anglePre) > range;
    if (fired) {
      acc.fires += 1;
      const clamped = Math.sign(anglePre) * range;
      if (this.hip.angle === clamped) acc.clampOk += 1;
      else acc.clampBad += 1;
      acc.overshoot += Math.abs(anglePre) - range;
      if (ratePre * clamped > 0) {
        acc.zeroed += 1;
        const discard = HIP_PITCH_INERTIA * ratePre;
        acc.discard += Math.abs(discard);
        acc.signed += discard;
        if (Math.abs(discard) > acc.biggest) acc.biggest = Math.abs(discard);
        acc.each.push(discard);
        if (acc.seen && range < acc.range) {
          acc.shrink += 1;
          acc.shrinkDiscard += Math.abs(discard);
        } else {
          acc.driven += 1;
          acc.drivenDiscard += Math.abs(discard);
        }
      }
    } else {
      // The reconstruction must reproduce the post-call state exactly when nothing clamped it.
      if (this.hip.angle === anglePre && this.hip.rate === ratePre) acc.idOk += 1;
      else {
        acc.idBad += 1;
        const err = Math.max(Math.abs(this.hip.angle - anglePre), Math.abs(this.hip.rate - ratePre));
        if (err > acc.worst) acc.worst = err;
      }
    }
    const momentum = Math.abs(HIP_PITCH_INERTIA * ratePre);
    if (momentum > acc.peak) acc.peak = momentum;
    acc.ankle += h * Math.abs(this.torque);
    acc.ankleSigned += h * this.torque;
    acc.hip += h * Math.abs(torque);
    if (excess !== 0) acc.excessSubs += 1;
    if (torque !== 0 || before.rate !== 0 || before.angle !== 0) acc.moving += 1;
    if (Math.abs(excess) > acc.excessMax) acc.excessMax = Math.abs(excess);
    if (Number.isFinite(bound) && bound > 0) acc.headroom.push(Math.abs(ankleNow) / bound);
    if (Math.abs(ankleNow) > acc.torqueMax) acc.torqueMax = Math.abs(ankleNow);
    if (Math.abs(this.hip.angle) > acc.angleMax) acc.angleMax = Math.abs(this.hip.angle);
    if (range < acc.rangeMin) acc.rangeMin = range;
    if (range > acc.rangeMax) acc.rangeMax = range;
    acc.angle = this.hip.angle;
    acc.rate = this.hip.rate;
    acc.range = range;
    acc.seen = true;
  } as Prepare;

  const handProto = AttachedRider.prototype as unknown as { standingHand: (h: number, board: unknown, water: unknown) => void };
  const originalStanding = handProto.standingHand;
  handProto.standingHand = function patched(this: AttachedRider, h: number, board: unknown, water: unknown): void {
    let acc = hands.get(this);
    if (!acc) {
      acc = newHand();
      hands.set(this, acc);
    }
    const before = acc.wetSubs;
    originalStanding.call(this, h, board, water);
    acc.asked += 1;
    if (acc.wetSubs === before) acc.askedDry += 1;
  };

  const arProto = AttachedRider.prototype as unknown as { wetForce: WetForce };
  const originalWet = arProto.wetForce;
  const m0 = new Vector3();
  const f0 = new Vector3();
  const dM = new Vector3();
  const dF = new Vector3();
  const expect = new Vector3();
  const drop = new Vector3();
  const lever = new Vector3();
  const deliver = new Vector3();
  const gravity = new Vector3();
  const axisA = new Vector3();
  const axisB = new Vector3();
  arProto.wetForce = function patched(this: AttachedRider, ...args: Parameters<WetForce>): void {
    const slot = args[0];
    const h = args[5];
    const standing = slot >= RIDER_PARTS.length && this.upright && this.phase === 'standing';
    if (!standing) {
      originalWet.apply(this, args);
      return;
    }
    const self = this as unknown as {
      waterMoment: Vector3; waterForce: Vector3; partForce: Vector3; partWorld: Vector3; arm: Vector3; baseWorld: Vector3;
    };
    m0.copy(self.waterMoment);
    f0.copy(self.waterForce);
    originalWet.apply(this, args);
    let acc = hands.get(this);
    if (!acc) {
      acc = newHand();
      hands.set(this, acc);
    }
    if (INJECT === 'hand') {
      // The control: a known force at a known lever, added AFTER the engine's own, so the differenced channel must
      // report the engine's moment plus exactly cross(INJARM, INJF).
      self.waterForce.add(INJF);
      self.waterMoment.add(new Vector3().crossVectors(INJARM, INJF));
    }
    dM.subVectors(self.waterMoment, m0);
    dF.subVectors(self.waterForce, f0);
    const force = self.partForce;
    lever.subVectors(self.partWorld, this.position);
    expect.crossVectors(lever, force);
    acc.wetSubs += 1;
    if (force.lengthSq() > 0) acc.loadSubs += 1;
    const forceErr = INJECT === 'hand' ? dF.distanceTo(new Vector3().addVectors(force, INJF)) : dF.distanceTo(force);
    // ⚠️ NOT an exact test: `waterForce`/`waterMoment` are running accumulators, so (W + f) − W is not f to the bit.
    // The tolerance is relative to the accumulator's own size, and the worst error is printed either way.
    if (forceErr <= 1e-9 * Math.max(1, f0.length(), force.length())) acc.forceOk += 1;
    else {
      acc.forceBad += 1;
      if (forceErr > acc.worstForce) acc.worstForce = forceErr;
    }
    const injected = INJECT === 'hand' ? new Vector3().crossVectors(INJARM, INJF) : new Vector3();
    const momentErr = dM.distanceTo(new Vector3().addVectors(expect, injected));
    const scale = Math.max(1, expect.length(), m0.length());
    if (momentErr <= 1e-9 * scale) acc.momentOk += 1;
    else {
      acc.momentBad += 1;
      if (momentErr > acc.worstMoment) acc.worstMoment = momentErr;
    }
    if (INJECT === 'hand') {
      // The recovery: the differenced channel minus the independent one must BE the injection.
      const recovered = new Vector3().subVectors(dM, expect);
      const err = recovered.distanceTo(injected);
      if (err > acc.injWorst) acc.injWorst = err;
    }
    // The residual: the engine's own moment at the hand's lever, less the world-Y component the standing path keeps.
    dropped(INJECT === 'hand' ? expect : dM, drop);
    const magnitude = drop.length();
    acc.drop += magnitude;
    if (magnitude > acc.dropMax) acc.dropMax = magnitude;
    acc.kept += Math.abs((INJECT === 'hand' ? expect : dM).y);
    acc.dropEach.push(magnitude);
    acc.forceEach.push(force.length());
    acc.leverEach.push(lever.length());
    if (currentBoard) {
      const axes = inBoard(drop, currentBoard, axisA, axisB);
      acc.rollSum += axes.roll;
      acc.pitchSum += axes.pitch;
      if (axes.roll > 0) acc.rollPos += 1;
      else if (axes.roll < 0) acc.rollNeg += 1;
      if (axes.pitch > 0) acc.pitchPos += 1;
      else if (axes.pitch < 0) acc.pitchNeg += 1;
      acc.rollEach.push(axes.roll);
      acc.pitchEach.push(axes.pitch);
    }
    // What pairing it would cost in work: the residual against the body's own angular velocity.
    const spin = this.angularVelocity;
    const power = drop.x * spin.x + drop.z * spin.z;
    acc.energy += h * power;
    acc.energyAbs += h * Math.abs(power);
    acc.keptEnergy += h * Math.abs((INJECT === 'hand' ? expect : dM).y * spin.y);
    deliver.crossVectors(self.arm, force);
    const ankle = Math.abs(this.standingBody.torque);
    gravity.crossVectors(
      lever.subVectors(this.position, self.baseWorld),
      axisA.set(0, -this.mass * WATER.gravity, 0),
    );
    acc.deliver += deliver.length();
    acc.ankle += ankle;
    acc.gravity += gravity.length();
    acc.deliverEach.push(deliver.length());
    acc.ankleEach.push(ankle);
    acc.gravityEach.push(gravity.length());
    if (deliver.length() > 0) acc.vsDeliver.push(magnitude / deliver.length());
    if (ankle > 0) acc.vsAnkle.push(magnitude / ankle);
    if (gravity.length() > 0) acc.vsGravity.push(magnitude / gravity.length());
  } as WetForce;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=compare — the read-only proof: two dumps, value by value, bit for bit.
// ---------------------------------------------------------------------------------------------------------------
function compare(): void {
  const a = readFileSync(process.env.A!, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
  const b = readFileSync(process.env.B!, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
  const key = (row: Record<string, unknown>): string => `${row.trial}|${row.arm}|${row.stance}|${row.entry}|${row.frame}`;
  const byKey = new Map<string, Record<string, unknown>>();
  for (const row of b) if (row.kind === 'state') byKey.set(key(row), row);
  let rows = 0;
  let values = 0;
  let diffs = 0;
  let missing = 0;
  const where: string[] = [];
  const shared = new Set<string>();
  for (const row of a) {
    if (row.kind !== 'state') continue;
    const other = byKey.get(key(row));
    if (!other) {
      missing += 1;
      continue;
    }
    rows += 1;
    for (const k of Object.keys(row)) {
      if (!(k in other)) continue;
      shared.add(k);
      values += 1;
      const x = row[k];
      const y = other[k];
      const same = Array.isArray(x) && Array.isArray(y)
        ? x.length === y.length && x.every((v, i) => v === y[i])
        : x === y;
      if (!same) {
        diffs += 1;
        if (where.length < 20) where.push(`${key(row)} ${k}: ${JSON.stringify(x)} vs ${JSON.stringify(y)}`);
      }
    }
  }
  // Array columns count one value each above; count their elements too, for the honest total.
  let elements = 0;
  for (const row of a) {
    if (row.kind !== 'state') continue;
    for (const k of Object.keys(row)) {
      const v = row[k];
      if (Array.isArray(v)) elements += v.length - 1;
    }
  }
  emit({
    kind: 'compare', aRows: a.filter((x) => x.kind === 'state').length, bRows: b.filter((x) => x.kind === 'state').length,
    matchedRows: rows, missing, columns: shared.size, values, valuesWithArrayElements: values + elements, diffs, where,
  });
}

if (process.env.SELFTEST) {
  selftest();
} else if (MODE === 'compare') {
  compare();
} else {
  if (PROBE) install();
  ride();
}

// ---------------------------------------------------------------------------------------------------------------
// The bench: the Canyon as `?canyonWaves=true` builds it, the owner's own rider on it.
// ---------------------------------------------------------------------------------------------------------------
function ride(): void {
  const wall = Date.now();
  const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const base = surfZoneConfigFor(settings, SEED, true);
  const config: SurfZoneConfig = { ...base, compute: 'cpu', canyonBed: 'b' };
  const sim = new SurfZoneSimulation(config);
  const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
  const focus = sim.breakPoint();
  const scratch = createWaterSample();

  interface Run {
    trial: number; arm: ArmName; stance: Stance; entry: number;
    board: BoardBody; rider: AttachedRider;
    frame: number; done: boolean; fellAt: number | null; cause: string;
    live: number; frozen: number;
    /** The rider's own water work at its last live frame, J, for the energy comparison. */
    waterWork: number;
    hip: HipAcc | null; hand: HandAcc | null;
    /** The live totals: the accumulators' per-frame deltas, added only on live frames. */
    totals: Record<string, number>;
    lastHip: HipAcc | null; lastHand: HandAcc | null;
  }
  const runs: Run[] = [];
  let trials = 0;

  const HIP_KEYS = ['subs', 'fires', 'zeroed', 'discard', 'signed', 'driven', 'drivenDiscard', 'shrink', 'shrinkDiscard', 'overshoot', 'ankle', 'ankleSigned', 'hip', 'idOk', 'idBad', 'clampOk', 'clampBad', 'excessSubs', 'moving'] as const;
  const HAND_KEYS = ['wetSubs', 'loadSubs', 'drop', 'kept', 'deliver', 'ankle', 'gravity', 'forceOk', 'forceBad', 'momentOk', 'momentBad', 'rollPos', 'rollNeg', 'pitchPos', 'pitchNeg', 'rollSum', 'pitchSum', 'asked', 'askedDry', 'energy', 'energyAbs', 'keptEnergy'] as const;

  function snapshot(e: Run): void {
    const hip = e.hip;
    const hand = e.hand;
    if (hip) {
      const last = e.lastHip ?? newHip();
      for (const k of HIP_KEYS) e.totals[`hip_${k}`] = (e.totals[`hip_${k}`] ?? 0) + (hip[k] - last[k]);
      e.lastHip = { ...hip, each: [], headroom: [] };
    }
    if (hand) {
      const last = e.lastHand ?? newHand();
      for (const k of HAND_KEYS) e.totals[`hand_${k}`] = (e.totals[`hand_${k}`] ?? 0) + (hand[k] - last[k]);
      e.lastHand = { ...hand, dropEach: [], rollEach: [], pitchEach: [], vsDeliver: [], vsAnkle: [], vsGravity: [], forceEach: [], leverEach: [], ankleEach: [], deliverEach: [], gravityEach: [] };
    }
  }

  function place(trial: number, x: number, z: number): void {
    const sy = physical.surfaceAt(x, z);
    const here = physical.sampleAt(x, sy, z, scratch);
    if (!here.wet || here.outsideDomain) return;
    const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
    const fall = new Vector3(here.slopeX, 0, here.slopeZ);
    if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
    fall.normalize();
    const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
    const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
    const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
    const left = new Vector3().crossVectors(normal, forward).normalize();
    for (const arm of ARMS) {
      for (const stance of STANCES) {
        for (const entry of ENTRIES) {
          const board = new BoardBody();
          board.place(
            new Vector3(x, sy, z).addScaledVector(normal, board.shape.centerOfMass.y),
            new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
            forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
          );
          const rd = new AttachedRider(board.shape, {
            phase: 'standing',
            ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
            ...(FELT ? { feltFrame: FELT } : {}),
            ...(BODY ? { riderBody: BODY } : {}),
          } as ConstructorParameters<typeof AttachedRider>[1]);
          board.attach(rd);
          rd.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
          rd.compress = stance === 'compress' ? 1 : 0;
          rd.steer = arm === 'stick' || arm === 'handstick' ? 1 : 0;
          rd.hand = arm === 'hand' || arm === 'handstick';
          runs.push({
            trial, arm, stance, entry, board, rider: rd, frame: 0, done: false, fellAt: null, cause: '',
            live: 0, frozen: 0, waterWork: 0, hip: null, hand: null, totals: {}, lastHip: null, lastHand: null,
          });
        }
      }
    }
  }

  const fwd = new Vector3();
  const sideV = new Vector3();
  const boardUp = new Vector3();
  const partW = new Vector3();

  /** The body's pitch inertia about the rotor's own axis through the body's centre of mass, from the game's own point masses. */
  function bodyPitchInertia(rider: AttachedRider, axis: Vector3): number {
    const masses = riderPartMasses(rider.mass);
    let total = 0;
    for (let i = 0; i < RIDER_PARTS.length; i += 1) {
      rider.partPosition(i, partW).sub(rider.position);
      const along = partW.dot(axis);
      total += masses[i] * Math.max(0, partW.lengthSq() - along * along);
    }
    return total;
  }

  function stepRide(e: Run, water: PhysicalSurfWater): void {
    const { board, rider } = e;
    e.frame += 1;
    currentBoard = board;
    board.step(STEP, water);
    currentBoard = null;
    if (PROBE) {
      e.hip = hips.get(rider.standingBody) ?? null;
      e.hand = hands.get(rider) ?? null;
    }
    const liveNow = rider.attached && rider.upright && rider.phase === 'standing';
    if (liveNow) {
      e.live += 1;
      e.waterWork = rider.work.water;
      snapshot(e);
    } else {
      e.frozen += 1;
      // Re-base the snapshot so a frozen frame's substeps are never added to a live total.
      if (e.hip) e.lastHip = { ...e.hip, each: [] };
      if (e.hand) {
        e.lastHand = { ...e.hand, dropEach: [], rollEach: [], pitchEach: [], vsDeliver: [], vsAnkle: [], vsGravity: [], forceEach: [], leverEach: [], ankleEach: [], deliverEach: [], gravityEach: [] };
      }
    }
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    sideV.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(sideV), boardUp.y);
    const axis = new Vector3(1, 0, 0).applyQuaternion(board.orientation);
    // The state row: UNROUNDED, so `MODE=compare` is a bit-for-bit test and not a rounded one.
    const state: Record<string, unknown> = {
      kind: 'state', trial: e.trial, arm: e.arm, stance: e.stance, entry: e.entry, frame: e.frame,
      live: liveNow ? 1 : 0,
      bx: board.position.x, by: board.position.y, bz: board.position.z,
      qx: board.orientation.x, qy: board.orientation.y, qz: board.orientation.z, qw: board.orientation.w,
      vx: board.velocity.x, vy: board.velocity.y, vz: board.velocity.z,
      wx: board.angularVelocity.x, wy: board.angularVelocity.y, wz: board.angularVelocity.z,
      rx: rider.position.x, ry: rider.position.y, rz: rider.position.z,
      rvx: rider.velocity.x, rvy: rider.velocity.y, rvz: rider.velocity.z,
      rwx: rider.angularVelocity.x, rwy: rider.angularVelocity.y, rwz: rider.angularVelocity.z,
      hipAngle: rider.standingBody.hip.angle, hipRate: rider.standingBody.hip.rate, hipTorque: rider.standingBody.hip.torque,
      ankleAngle: rider.standingBody.pitch.angle, ankleRate: rider.standingBody.pitch.rate, ankleTorque: rider.standingBody.torque,
      ankleRest: rider.standingBody.rest, reference: rider.standingBody.reference,
      legRest: rider.leg.rest, legExt: rider.leg.extension, legForce: rider.leg.force,
      bank: rider.bank.angle, bankRate: rider.bank.rate, swing: rider.swing.angle, swingRate: rider.swing.rate,
      handLoad0: rider.handLoad[0], handLoad1: rider.handLoad[1],
      attached: rider.attached ? 1 : 0, upright: rider.upright ? 1 : 0, phase: rider.phase,
      subs: board.substepsTaken, rollDeg: roll * DEG, workWater: rider.work.water, workGravity: rider.work.gravity,
      parts: Array.from(rider.parts),
      bodyPitchInertia: bodyPitchInertia(rider, axis),
      bodyPitchRate: rider.angularVelocity.dot(axis),
    };
    emit(state);
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
      e.done = true;
      e.fellAt = e.frame * STEP;
      e.cause = !rider.attached ? 'detached' : !rider.upright ? 'down' : rider.phase;
    }
    if (e.frame >= Math.round(SECONDS / STEP)) e.done = true;
  }

  const frames = Math.round((TRIALS * GAP + SECONDS + 2) / STEP);
  emit({
    kind: 'head', probe: PROBE ? 'on' : 'off', inject: INJECT || 'none', spot: 'canyon', bed: 'b', size: SIZE, seed: SEED,
    stage: 2, focus: { x: r(focus.x, 2), z: r(focus.z, 2) }, grid: `${sim.solver.nx} x ${sim.solver.nz} = ${sim.solver.nx * sim.solver.nz}`,
    spinUp: r(sim.solver.time, 2), wallSpinUp: r((Date.now() - wall) / 1000, 1),
    rider: RIDER, felt: FELT, body: BODY, arms: ARMS, stances: STANCES, entries: ENTRIES, trials: TRIALS,
    seconds: SECONDS, side: SIDE, hipInertia: HIP_PITCH_INERTIA, injRate: INJRATE, injSub: INJSUB,
    injForce: INJF.toArray(), injArm: INJARM.toArray(), frames,
  });

  let lastPlace = -1e9;
  for (let i = 0; i < frames; i += 1) {
    sim.step(STEP);
    const t = sim.solver.time;
    if (trials < TRIALS && t - lastPlace > GAP) {
      trials += 1;
      lastPlace = t;
      place(trials, focus.x, focus.z - 6);
      emit({ kind: 'trial', trial: trials, t: r(t, 4), x: r(focus.x, 2), z: r(focus.z - 6, 2), riders: ARMS.length * STANCES.length * ENTRIES.length });
    }
    for (const e of runs) if (!e.done) stepRide(e, physical);
    if (trials >= TRIALS && runs.every((e) => e.done)) break;
  }

  // -------------------------------------------------------------------------------------------------------------
  // The per-run rows, and the summary. Every figure carries its population.
  // -------------------------------------------------------------------------------------------------------------
  for (const e of runs) {
    emit({
      kind: 'run', trial: e.trial, arm: e.arm, stance: e.stance, entry: e.entry, frames: e.frame, live: e.live,
      frozen: e.frozen, fellAt: e.fellAt === null ? null : r(e.fellAt, 4), cause: e.cause || 'held',
      ...Object.fromEntries(Object.entries(e.totals).map(([k, v]) => [k, r(v, 8)])),
      hipPeak: e.hip ? r(e.hip.peak, 6) : null, hipBiggest: e.hip ? r(e.hip.biggest, 6) : null,
      hipExcessMax: e.hip ? r(e.hip.excessMax, 4) : null, hipTorqueMax: e.hip ? r(e.hip.torqueMax, 4) : null,
      hipAngleMaxDeg: e.hip ? r(e.hip.angleMax * DEG, 4) : null,
      hipHeadroomMax: e.hip ? r(Math.max(0, ...e.hip.headroom), 4) : null,
      hipRangeMinDeg: e.hip && Number.isFinite(e.hip.rangeMin) ? r(e.hip.rangeMin * DEG, 3) : null,
      hipRangeMaxDeg: e.hip ? r(e.hip.rangeMax * DEG, 3) : null,
      handDropMax: e.hand ? r(e.hand.dropMax, 6) : null, waterWork: r(e.waterWork, 4),
      handInjWorst: e.hand ? r(e.hand.injWorst, 12) : null,
      hipWorstId: e.hip ? r(e.hip.worst, 18) : null,
      handWorstForce: e.hand ? r(e.hand.worstForce, 18) : null,
      handWorstMoment: e.hand ? r(e.hand.worstMoment, 18) : null,
    });
  }

  if (PROBE) {
    const total = (key: string): number => runs.reduce((a, e) => a + (e.totals[key] ?? 0), 0);
    const liveFrames = runs.reduce((a, e) => a + e.live, 0);
    const frozenFrames = runs.reduce((a, e) => a + e.frozen, 0);
    const each: number[] = [];
    const drops: number[] = [];
    const rolls: number[] = [];
    const pitches: number[] = [];
    const vsD: number[] = [];
    const vsA: number[] = [];
    const vsG: number[] = [];
    const forces: number[] = [];
    const levers: number[] = [];
    const ankles: number[] = [];
    const delivers: number[] = [];
    const gravities: number[] = [];
    for (const e of runs) {
      if (e.hip) each.push(...e.hip.each);
      if (e.hand) {
        drops.push(...e.hand.dropEach);
        rolls.push(...e.hand.rollEach);
        pitches.push(...e.hand.pitchEach);
        vsD.push(...e.hand.vsDeliver);
        vsA.push(...e.hand.vsAnkle);
        vsG.push(...e.hand.vsGravity);
        forces.push(...e.hand.forceEach);
        levers.push(...e.hand.leverEach);
        ankles.push(...e.hand.ankleEach);
        delivers.push(...e.hand.deliverEach);
        gravities.push(...e.hand.gravityEach);
      }
    }
    const withHand = runs.filter((e) => (e.totals.hand_wetSubs ?? 0) > 0).length;
    const headroom: number[] = [];
    for (const e of runs) if (e.hip) headroom.push(...e.hip.headroom);
    /** One row per (arm x stance x entry) cell, so no figure is pooled across inputs without its cell being readable. */
    const cells: Record<string, unknown>[] = [];
    for (const arm of ARMS) {
      for (const stance of STANCES) {
        for (const entry of ENTRIES) {
          const mine = runs.filter((e) => e.arm === arm && e.stance === stance && e.entry === entry);
          if (mine.length === 0) continue;
          const sub = (k: string): number => mine.reduce((a, e) => a + (e.totals[k] ?? 0), 0);
          cells.push({
            arm, stance, entry, runs: mine.length, live: mine.reduce((a, e) => a + e.live, 0),
            fell: mine.filter((e) => e.fellAt !== null).length,
            hipSubs: sub('hip_subs'), hipExcessSubs: sub('hip_excessSubs'), hipZeroed: sub('hip_zeroed'),
            hipDiscard: r(sub('hip_discard'), 6),
            handWetSubs: sub('hand_wetSubs'), handRuns: mine.filter((e) => (e.totals.hand_wetSubs ?? 0) > 0).length,
            handAsked: sub('hand_asked'), handAskedDry: sub('hand_askedDry'),
            handDrop: r(sub('hand_drop'), 4), handKept: r(sub('hand_kept'), 4), handDeliver: r(sub('hand_deliver'), 4),
            handAnkle: r(sub('hand_ankle'), 4), handGravity: r(sub('hand_gravity'), 4),
            rollSum: r(sub('hand_rollSum'), 4), pitchSum: r(sub('hand_pitchSum'), 4),
            rollPos: sub('hand_rollPos'), rollNeg: sub('hand_rollNeg'), pitchPos: sub('hand_pitchPos'), pitchNeg: sub('hand_pitchNeg'),
          });
        }
      }
    }
    const withFire = runs.filter((e) => (e.totals.hip_zeroed ?? 0) > 0).length;
    emit({
      kind: 'sum', probe: 'on', inject: INJECT || 'none', runs: runs.length, liveFrames, frozenFrames,
      // --- A
      hipSubs: total('hip_subs'), hipFires: total('hip_fires'), hipZeroed: total('hip_zeroed'),
      hipZeroedShare: r(total('hip_zeroed') / Math.max(1, total('hip_subs')), 8),
      hipRunsWithFire: withFire,
      hipDiscard: r(total('hip_discard'), 6), hipSigned: r(total('hip_signed'), 6),
      hipDriven: total('hip_driven'), hipDrivenDiscard: r(total('hip_drivenDiscard'), 6),
      hipShrink: total('hip_shrink'), hipShrinkDiscard: r(total('hip_shrinkDiscard'), 6),
      hipOvershootDeg: r(total('hip_overshoot') * DEG, 6),
      hipEachMed: r(med(each.map(Math.abs)), 6), hipEachQt: r(qt(each.map(Math.abs), 0.5), 6),
      hipEachMax: r(Math.max(0, ...each.map(Math.abs)), 6),
      hipPeakMed: r(med(runs.filter((e) => e.hip).map((e) => e.hip!.peak)), 6),
      ankleImpulse: r(total('hip_ankle'), 6), ankleSigned: r(total('hip_ankleSigned'), 6),
      hipTorqueImpulse: r(total('hip_hip'), 6),
      hipIdOk: total('hip_idOk'), hipIdBad: total('hip_idBad'), hipClampOk: total('hip_clampOk'), hipClampBad: total('hip_clampBad'),
      hipExcessSubs: total('hip_excessSubs'), hipMovingSubs: total('hip_moving'),
      hipExcessMax: r(Math.max(0, ...runs.filter((e) => e.hip).map((e) => e.hip!.excessMax)), 4),
      hipTorqueMax: r(Math.max(0, ...runs.filter((e) => e.hip).map((e) => e.hip!.torqueMax)), 4),
      hipAngleMaxDeg: r(Math.max(0, ...runs.filter((e) => e.hip).map((e) => e.hip!.angleMax)) * DEG, 4),
      headroomMed: r(med(headroom), 5), headroomQt: r(qt(headroom, 0.5), 5), headroomMax: r(Math.max(0, ...headroom), 5),
      headroomN: headroom.length,
      // --- B
      handWetSubs: total('hand_wetSubs'), handLoadSubs: total('hand_loadSubs'), handRuns: withHand,
      handAsked: total('hand_asked'), handAskedDry: total('hand_askedDry'),
      dropEnergy: r(total('hand_energy'), 6), dropEnergyAbs: r(total('hand_energyAbs'), 6), keptEnergy: r(total('hand_keptEnergy'), 6),
      rideWaterWork: r(runs.reduce((a, e) => a + (e.waterWork ?? 0), 0), 4),
      handAskedRuns: runs.filter((e) => (e.totals.hand_asked ?? 0) > 0).length,
      handShareOfSubs: r(total('hand_wetSubs') / Math.max(1, total('hip_subs')), 8),
      handDrop: r(total('hand_drop'), 6), handKept: r(total('hand_kept'), 6),
      handDeliver: r(total('hand_deliver'), 6), handAnkle: r(total('hand_ankle'), 6), handGravity: r(total('hand_gravity'), 6),
      dropMed: r(med(drops), 6), dropQt: r(qt(drops, 0.5), 6), dropMax: r(Math.max(0, ...drops), 6),
      rollMed: r(med(rolls), 6), pitchMed: r(med(pitches), 6),
      rollSum: r(total('hand_rollSum'), 6), pitchSum: r(total('hand_pitchSum'), 6),
      rollPos: total('hand_rollPos'), rollNeg: total('hand_rollNeg'), pitchPos: total('hand_pitchPos'), pitchNeg: total('hand_pitchNeg'),
      vsDeliverMed: r(med(vsD), 6), vsDeliverMax: r(Math.max(0, ...vsD), 6),
      vsAnkleMed: r(med(vsA), 6), vsAnkleMax: r(Math.max(0, ...vsA), 6),
      vsGravityMed: r(med(vsG), 6), vsGravityMax: r(Math.max(0, ...vsG), 6),
      forceMed: r(med(forces), 6), forceMax: r(Math.max(0, ...forces), 6),
      leverMed: r(med(levers), 6),
      ankleMed: r(med(ankles), 6), deliverMed: r(med(delivers), 6), gravityMed: r(med(gravities), 6),
      // Within a RUN, is the residual's sign one-signed? (the pooled count can be one-signed by cells cancelling)
      runSignRoll: runs.filter((e) => (e.totals.hand_wetSubs ?? 0) > 0).map((e) => r(Math.max(e.totals.hand_rollPos ?? 0, e.totals.hand_rollNeg ?? 0) / Math.max(1, (e.totals.hand_rollPos ?? 0) + (e.totals.hand_rollNeg ?? 0)), 4)),
      runSignPitch: runs.filter((e) => (e.totals.hand_wetSubs ?? 0) > 0).map((e) => r(Math.max(e.totals.hand_pitchPos ?? 0, e.totals.hand_pitchNeg ?? 0) / Math.max(1, (e.totals.hand_pitchPos ?? 0) + (e.totals.hand_pitchNeg ?? 0)), 4)),
      handForceOk: total('hand_forceOk'), handForceBad: total('hand_forceBad'),
      handMomentOk: total('hand_momentOk'), handMomentBad: total('hand_momentBad'),
      handInjWorst: r(Math.max(0, ...runs.filter((e) => e.hand).map((e) => e.hand!.injWorst)), 15),
      handWorstForce: r(Math.max(0, ...runs.filter((e) => e.hand).map((e) => e.hand!.worstForce)), 15),
      handWorstMoment: r(Math.max(0, ...runs.filter((e) => e.hand).map((e) => e.hand!.worstMoment)), 15),
      hipWorstId: r(Math.max(0, ...runs.filter((e) => e.hip).map((e) => e.hip!.worst)), 18),
      cells,
      wall: r((Date.now() - wall) / 1000, 1),
    });
  } else {
    emit({ kind: 'sum', probe: 'off', runs: runs.length, liveFrames: runs.reduce((a, e) => a + e.live, 0), wall: r((Date.now() - wall) / 1000, 1) });
  }
}
