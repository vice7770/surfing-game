/**
 * Step 3.3o: **how wrong the balance's own internal plant is, per part.**
 *
 * Step 3.3n found that the loop's command-bias estimate `b̂₀` is an unbounded integrator that reaches 0.31–2.82 of the
 * ankle's whole command bound and is propagated inside the forward model, and closed with the sentence that is this
 * round's brief: *"The bias only grows because the loop's internal model does not match the game — it is the only
 * slack the model has, so all mismatch piles into it … **Nobody has measured how wrong that model is**, or which part
 * of it (the water's captive derivatives, the point-mass body, the free-versus-held table, the rail schedule)."*
 *
 * This probe measures it. **It builds nothing: no source file is touched, no switch added, no constant moved.**
 *
 * ## The five instruments, and what each is an identity of
 *
 * **1. The game's own state, in the model's own coordinates — a read, not a reconstruction.** `AttachedRider` hands
 * the controller a seven-row sense vector built from the game's own angles [R, `AttachedRider.ts:3429–3436`], and
 * `senseMatrix` says which state each row is [R, `predictiveBalance.ts:143–151`]. Inverting those seven rows gives
 * **seven of the ten states exactly**:
 *
 *     θ = s₀   θ̇ = s₁   ω_u = s₂   θ_t = s₃   r = s₂ − s₄   φ = s₀ − s₅   φ̇ = s₁ − s₆
 *
 * Two more are read off the game directly in the same sign: `δ = −ankleRest` (the lagged commanded rest) and
 * `τ_a = −twistBody.active` (the lagged twist torque). **Only the slip `β` is neither sensed nor stored**, so it is
 * derived — the board's sideslip through the water — and **every number that depends on it is reported for BOTH
 * signs of it**, so no conclusion rests on a frame I chose. P0a checks the seven by pushing the reconstruction back
 * through the controller's own `C`.
 *
 * **2. The one-step residual of the controller's own blended model (the headline).** The controller holds Φ and Γ, its
 * own eight-point blend, and sends `u`. So
 *
 *     resid = Φ x_k + Γ u_k − x_{k+1}
 *
 * is the model's own arithmetic against the game's own next state, with nothing modelled on either side. Reported per
 * component against (a) that component's own one-step change, which is the only scale that says whether the model
 * knows where the state is going, and (b) the design's own `stateScale`.
 *
 * **3. The two rows the fall is about, against the ledger.** For a zero-order hold over one step the model's implied
 * **mean** acceleration over that step is `(Φ[i]·x + Γ[i]·u − x[i]) / h` exactly — which is the same quantity the
 * bank ledger publishes, a mean over the frame's substeps. So:
 *
 *     φ̈_model = (Φ[1]·x + Γ[1]·u − φ̇) · 60   against   −bankLedger.deckTotal
 *     θ̈_model = (Φ[3]·x + Γ[3]·u − θ̇) · 60   against   −bankLedger.ownTotal
 *
 * the sign because the model's `φ = −roll` and `θ = −bank` by instrument 1's own identity. **Both sides are reads.**
 *
 * **4. Per part, by differencing the code's own plant.** `twistRows` is linear in each of the twelve captive
 * derivatives, in the ankle's spring and damper, in the twist's and in the feet's forward force, so building the
 * plant with one group zeroed and subtracting gives that group's **exact** row — the code's own function, not a
 * reimplementation of it:
 *
 *     contribution of a group to row i = (A_full[i] − A_without[i]) · x
 *
 * Six groups are separable this way (the water's roll, yaw and side derivatives; the ankle's spring; the twist's; the
 * feet's forward force). Gravity is **not** zeroable — `yawRows` divides by `m g` — so the pendulum's own term
 * `g/L · θ` is read off the line that writes it [R] and the rest is reported as a named remainder. P0e checks the
 * groups sum to the row.
 *
 * **5. The rail and the speed the schedule is actually read at.** The rail handed to `blend` is **not the board's
 * rail**: it is derived from the lean *asked for* and capped at `SCHEDULE_RAIL_CAP = 12°`
 * [R, `AttachedRider.ts:3448–3452`]. And `labAt`, `boardInertiaAt` and `blend` all clamp the speed to the table's
 * 4 m/s floor. Both are measured per tick against what the board is actually doing, and the roll row is then
 * re-evaluated with the rail-corrected derivatives at the **measured** rail to see whether that is closer to the
 * game — which is the only test that can tell whether the rail schedule is the wrong part.
 *
 * ## The populations, named, never pooled
 *
 * 1. **step 3.3k's / 3.3l's / 3.3m's / 3.3n's own unsteered arm**: the Canyon-matched `FaceWater` (1.4 m / 16° /
 *    5.7 m/s, 2.6 m deep, the board 0.75 fronts ahead of the crest and 45° off the fall line), the stance held, the
 *    stick **never touched**, eight relative entry speeds × three stances, 9 s a run — 24 trajectories.
 * 2. **the owner's own low-speed cell** (`ENTRIES=1,2,3,4,5,6`): the same water and placement with the entry set
 *    **absolutely** × three stances — 18 runs. **This is the bar.**
 * 3. **a steered arm** (`STEERS`) — the only arm on which the schedule's rail is not identically zero.
 *
 * Read-only. It turns the bank ledger on (a measurement tool, `bankLedger.test.ts` asserts the rider is byte-identical
 * with it on and off) and names every private it reads: `PredictiveController.senses`, `.estimate`,
 * `.blendedDesign`; `AttachedRider.ankleRest`, `.ankleRoom`, `.ankleBite`, `.heldAnkleRaw`, `.leanAsked`, `.schedRail`.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/plant.ts -o <scratch>/pl.mjs --format esm --platform node
 *   RIDER=new FELT=deck node <scratch>/pl.mjs
 *
 * Env: `RIDER=new|old`, `STANCES`, `EXTRAS`, `ENTRIES`, `STEERS`, `SECONDS`, `FELT=deck`, `LEDGER=off`, `OUT`, `TRACE`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { bankLedger, BANK_SOURCES, type BankSource } from '../../../../src/physics/bankLedger';
import { CONTROL_STEP, continuousPlant, discretise, plantAt, railLimit } from '../../../../src/physics/predictiveBalance';
import type { TwistPlant, YawPlant } from '../../../../src/physics/rollModel';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** `AttachedRider`'s own MAX_BANK, °, restated so the probe never imports a private: the clamp 3.3k flagged. */
const MAX_BANK = 70;
/** The lowest speed the design's tables hold: `PLANT_SPEEDS`, `BOARD_INERTIA` and `SCHEDULE_SPEEDS` all start at 4 [R]. */
const TABLE_FLOOR = 4;
const TABLE_CEIL = 12;

const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '-3,-2,-1,0,1,1.5,2,3').split(',').map(Number);
const ENTRIES = process.env.ENTRIES ? process.env.ENTRIES.split(',').map(Number) : null;
const STEERS = (process.env.STEERS ?? '0').split(',').map(Number);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE === '1';
const FELT = process.env.FELT === 'deck' ? 'deck' : undefined;
/** `LEDGER=off`: the purity arm — the ride with the ledger not turned on, so "the ledger changes nothing" is read. */
const LEDGER = process.env.LEDGER === 'off' ? 'off' : 'on';

type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const span = (v: number[], d = 2) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };
/** `Math.max(...list, NaN)` is NaN for every list — this folder's own trap, avoided by hand. */
const peak = (v: number[]) => { const s = sorted(v); return s.length ? s[s.length - 1] : Number.NaN; };
const share = (v: boolean[]) => (v.length ? v.filter(Boolean).length / v.length : Number.NaN);

/** As `fall.ts`, `bank.ts`, `deck.ts`, `roll.ts` and `loop.ts`: the deeper of crouch and Compress wins. */
function stanceInputs(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/**
 * The controller's own scratch holdings, private to TypeScript and present at run time. **Read, never written.**
 * `blendedDesign` is refilled **in place** every tick, so Φ and Γ are copied on the frame that ran the tick.
 */
interface ControlInner {
  senses: number[][];
  estimate: number[];
  blendedDesign?: { phi: number[][]; gamma: number[][]; k: number[][]; c: number[][]; steps: number };
}

/** `AttachedRider`'s own privates this probe reads, each named rather than reached for anonymously. */
interface RiderInner {
  ankleRest: number;
  ankleRoom: number;
  ankleBite: number;
  heldAnkleRaw: number;
  leanAsked: number;
  /** The rail the schedule was read at, rad — `min(SCHEDULE_RAIL_CAP, …)` of the lean ASKED for, not the board's rail. */
  schedRail: number;
}

/** The six groups of the plant that can be zeroed exactly, and the twelve coefficients each owns. */
type Group = 'waterRoll' | 'waterYaw' | 'waterSide' | 'ankle' | 'twist' | 'feetForward';
const GROUPS: Group[] = ['waterRoll', 'waterYaw', 'waterSide', 'ankle', 'twist', 'feetForward'];

function without(y: YawPlant, t: TwistPlant, g: Group): { y: YawPlant; t: TwistPlant } {
  const yy: YawPlant = { ...y };
  const tt: TwistPlant = { ...t };
  if (g === 'waterRoll') { yy.heelRoll = 0; yy.slipRoll = 0; yy.yawRoll = 0; yy.rollDamping = 0; }
  if (g === 'waterYaw') { yy.heelYaw = 0; yy.slipYaw = 0; yy.yawDamping = 0; yy.rollRateYaw = 0; }
  if (g === 'waterSide') { yy.heelSide = 0; yy.slipSide = 0; yy.yawSide = 0; yy.rollRateSide = 0; }
  if (g === 'ankle') { yy.ankleStiffness = 0; yy.ankleDamping = 0; }
  if (g === 'twist') { tt.stiffness = 0; tt.damping = 0; }
  if (g === 'feetForward') { yy.feetForward = 0; }
  return { y: yy, t: tt };
}

/** Which ledger sources are the water's own push on the hull and the foils, and which are the rider's through the feet. */
const WATER_SOURCES: BankSource[] = ['buoyancy', 'pressure', 'suction', 'friction', 'fins', 'rails', 'froth', 'addedMass'];
const BOARD_SOURCES: BankSource[] = ['weight', 'gyro'];
const RIDER_SOURCES: BankSource[] = BANK_SOURCES.filter((s) => !WATER_SOURCES.includes(s) && !BOARD_SOURCES.includes(s)) as BankSource[];

const dot = (row: readonly number[], x: readonly number[]) => { let s = 0; for (let j = 0; j < x.length; j += 1) s += row[j] * x[j]; return s; };

/** One control tick's row. Every angle is in degrees, every acceleration in °/s², and every datum named beside it. */
interface Tick {
  t: number;
  ticks: number;
  through: number;
  /** The probe's own board-frame roll and the body's bank, ° (+ = the deck normal / the body's lean toward the board's +x). */
  roll: number;
  bank: number;
  rail: number;
  clamped: number;
  /** The speed the controller was handed, m/s, and the speed the design's table was actually read at (clamped to 4–12). */
  speed: number;
  speedUsed: number;
  speedClamped: number;
  /** The rail the schedule was read at, °, against the board's own measured |rail|, and the table's own limit there. */
  schedRail: number;
  railMeas: number;
  railUsable: number;

  // --- 2. the one-step residual of the controller's own blended model, per component ---
  /** `|Φx+Γu−x⁺|` on the board's roll rate and the body's bank rate, °/s. */
  resRollRate: number;
  resBankRate: number;
  /** The same over that component's OWN one-step change: above 1 = the model does not know where it is going. */
  ratioRollRate: number;
  ratioBankRate: number;
  /** The same pair on the two angles, and on the slip (the derived state's own self-check). */
  ratioRoll: number;
  ratioBank: number;
  resSlip: number;
  ratioSlip: number;
  /** The whole residual as a root-mean-square over the ten states in the design's own `stateScale` units. */
  resScaled: number;
  /** The same two ratios computed with the derived slip's sign REVERSED: the frame's own sensitivity, printed. */
  ratioRollRateNeg: number;
  ratioBankRateNeg: number;

  // --- 3. the two rows the fall is about, against the ledger ---
  /** The model's own implied mean roll acceleration over the step, °/s², and the game's own (`−deckTotal`). */
  rollAccModel: number;
  rollAccGame: number;
  /** The same for the body's lean (`−ownTotal`). */
  bankAccModel: number;
  bankAccGame: number;
  /** `model − game` over `|game|`: the row's own relative error. */
  rollRel: number;
  bankRel: number;
  /** Whether the model has the right SIGN of the acceleration. */
  rollSign: number;
  bankSign: number;

  // --- 4. per part ---
  /** The model's own contribution to the roll row, °/s², by group (`A_full − A_without`, the code's own function). */
  mWaterRoll: number;
  mWaterYaw: number;
  mWaterSide: number;
  mAnkle: number;
  mTwist: number;
  mFeetFwd: number;
  /** The remainder: gravity through the feet, the pendulum's own `g/L`, the inertias and the pure kinematics. */
  mRest: number;
  /** P0e: the six groups plus the remainder against `A_full[1]·x`, relative. Must be ~0. */
  mClose: number;
  /** The model's three water groups and its four rider groups, signed sums, °/s². */
  mWaterAll: number;
  mRiderAll: number;
  /** The game's own roll row by source group (`deck` column), °/s². */
  gWater: number;
  gRider: number;
  gBoard: number;
  /** `gWater + gBoard`: the hull, the foils, the board's own weight and its gyro — what the model's water must answer. */
  gWaterAll: number;
  /** The ledger's `carry` and `gyro` — two terms `twistRows` has no counterpart for at all — on both columns. */
  gCarryDeck: number;
  gCarryOwn: number;
  gGyroDeck: number;
  /** The pendulum's own term the point-mass body is built on, `g/L · θ`, °/s² [R, `yawRows`: `bankAcc[2] += g/hh`]. */
  mPendulum: number;
  /** The model's bank row by group, °/s². */
  bWaterRoll: number;
  bWaterYaw: number;
  bWaterSide: number;
  bAnkle: number;
  bRest: number;
  bClose: number;

  // --- 5. the rail schedule, tested rather than asserted ---
  /** The model's own roll-righting coefficient at the schedule's rail and at the board's measured one, N·m/rad. */
  heelRoll0: number;
  heelRollAt: number;
  /** The roll row re-evaluated with the derivatives at the MEASURED rail, °/s², and its own error against the game. */
  rollAccAtRail: number;
  relAtRail: number;
  /** 1 when the measured rail's plant is CLOSER to the game than the schedule's is. */
  railHelps: number;

  // --- 6. the counterfactual plants: one named coefficient at a time, on the game's own recorded state ---
  /**
   * The roll row's own implied mean acceleration, °/s², with `YawPlant.boardMass` raised from the **dry board's
   * 2.54 kg** to **the two masses the game's own solve accelerates sideways, 2.54 + 73 = 75.54 kg**
   * [R, `AttachedRider.coupleStanding`: `system[i * N + i] += m` for i = 0, 1, 2]. The water's own lateral added mass
   * is still left out, so this is a LOWER bound on the right value.
   */
  rollAccSway: number;
  relSway: number;
  /** Both at once: the measured rail and the pair's sway mass. */
  rollAccBoth: number;
  relBoth: number;
  /** The same three on the bank row. */
  relBankRail: number;
  relBankSway: number;
  relBankBoth: number;
  /** Which of the four is closest to the game on the roll row: 0 shipped, 1 rail, 2 sway, 3 both. */
  bestRoll: number;

  // --- P0b: is `deckTotal` the WHOLE roll acceleration? The game's own φ̇ change over the step says.
  /** `(φ̇⁺ − φ̇)/h`, °/s², off the previous tick's own reconstructed state: the game's own mean roll acceleration. */
  rollAccMeas: number;
  bankAccMeas: number;
  /** The previous tick's ledger reading against it, relative — the control on instrument 3's game side. */
  ledgerRollRel: number;
  ledgerBankRel: number;
  /** The rebuilt exact-point plant's roll row against the controller's own blended one, relative: the blend's own error. */
  blendRel: number;
}

function oneRun(st: Stance, extra: number, entry0: number | null, steer: number): Record<string, unknown> {
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const pz = water.crestZ() + AHEAD * water.front;
  const here = water.sampleAt(0, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  const entry = entry0 ?? ((FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra);
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(0, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(FELT ? { feltFrame: FELT } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stanceInputs(rider, st);
  rider.steer = steer;
  bankLedger.on = LEDGER === 'on';

  const ctl = rider.predictor as unknown as ControlInner;
  const inner = rider as unknown as RiderInner;
  const fwd = new Vector3();
  const sideV = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  const ticks: Tick[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  let lastTicks = -1;
  /** The previous tick's snapshot: the state, the command, and COPIES of the blend's Φ and Γ. */
  let prev: { t: number; x: number[]; xNeg: number[]; u: number[]; phi: number[][]; gamma: number[][]; scale: number[]; rollGame: number; bankGame: number } | null = null;
  let senseOff = 0;
  let spacingOff = 0;
  let ledgerSplit = 0;
  let ledgerClosure = 0;
  let ledgerResidual = 0;
  let ledgerApart = 0;

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    sideV.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    const flowX = cen.outsideDomain ? 0 : cen.flowX;
    const flowZ = cen.outsideDomain ? 0 : cen.flowZ;
    const through = Math.hypot(board.velocity.x - flowX, board.velocity.z - flowZ);
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const tilt = Math.atan2(nW.dot(sideV), nW.y) * DEG;
    const bank = rider.bank.angle * DEG;
    const rail = roll - tilt;
    // The slip: the board's own sideslip through the water, rad. `fwd` and `sideV` are the heading's own level pair,
    // so this is the angle between where the board points and where it is going, in the level plane.
    const vFwd = (board.velocity.x - flowX) * fwd.x + (board.velocity.z - flowZ) * fwd.z;
    const vSide = (board.velocity.x - flowX) * sideV.x + (board.velocity.z - flowZ) * sideV.z;
    const beta = Math.atan2(vSide, Math.abs(vFwd) < 1e-6 ? 1e-6 : vFwd);

    if (bankLedger.on) {
      ledgerSplit = Math.max(ledgerSplit, bankLedger.split);
      ledgerClosure = Math.max(ledgerClosure, bankLedger.closure);
      ledgerResidual = Math.max(ledgerResidual, bankLedger.residual);
      ledgerApart = Math.max(ledgerApart, bankLedger.apart);
    }

    const nTicks = rider.predictor.ticks;
    const d = ctl.blendedDesign;
    if (d && nTicks > lastTicks && ctl.senses.length > 0) {
      lastTicks = nTicks;
      const n = d.phi.length;
      const s = ctl.senses[ctl.senses.length - 1];
      // --- 1. the game's own state in the model's coordinates: seven rows inverted, two read, one derived.
      const x = new Array<number>(n).fill(0);
      x[2] = s[0];
      x[3] = s[1];
      x[7] = s[2];
      x[6] = s[3];
      x[4] = s[2] - s[4];
      x[0] = s[0] - s[5];
      x[1] = s[1] - s[6];
      x[5] = beta;
      x[8] = -inner.ankleRest;
      x[9] = -rider.twistBody.active;
      const xNeg = x.slice();
      xNeg[5] = -beta;
      // P0a: push it back through the controller's own C. Seven rows, must be exactly the sense.
      for (let q = 0; q < d.c.length && q < 7; q += 1) senseOff = Math.max(senseOff, Math.abs(dot(d.c[q], x) - s[q]));

      const u = [rider.predictor.sent[0], rider.predictor.sent[1]];

      // The speed and depth the design was read at, recomputed exactly as the bank step computes them [R].
      const fwdH = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
      const speedUsed = board.velocity.dot(fwdH) - flowX * fwdH.x - flowZ * fwdH.z;
      const depth = Math.max(0, -(rider as unknown as { leg: { rest: number } }).leg.rest);
      const schedRail = inner.schedRail;

      // --- 4/5. the plant the controller is reading, rebuilt at its own point, and the six groups off it.
      const { y, t: tw } = plantAt(speedUsed, depth, { rail: schedRail });
      const full = continuousPlant(y, tw);
      // **The decomposition is in the controller's own discrete form, not the continuous one.** The plant's own roll
      // mode is near 32 rad/s and the step is 1/60 s, so `(Φ − I)/h` is NOT `A` — P0g measures the gap and it is the
      // size of the thing being measured. So each group's contribution is read as a difference of **implied mean
      // accelerations over the step**, exactly the quantity the headline and the ledger are both in:
      //     contribution = (Φ_full[i]·x + Γ_full·u − x[i])/h  −  (Φ_without[i]·x + Γ_without·u − x[i])/h
      // which is the same difference `A_full − A_without` would give if `A h` were small, and is not an assumption
      // that it is. The groups are then only approximately additive (discretisation is non-linear in `A`), and the
      // closure column says by how much rather than asserting it.
      const fullD = discretise(full.a, full.b, CONTROL_STEP);
      const meanAcc = (phi: number[][], gamma: number[][], row: number) =>
        (dot(phi[row], x) + gamma[row][0] * u[0] + gamma[row][1] * u[1] - x[row]) / CONTROL_STEP;
      const rollAll = meanAcc(fullD.phi, fullD.gamma, 1);
      const bankAll = meanAcc(fullD.phi, fullD.gamma, 3);
      const gm: Record<Group, number> = { waterRoll: 0, waterYaw: 0, waterSide: 0, ankle: 0, twist: 0, feetForward: 0 };
      const gb: Record<Group, number> = { waterRoll: 0, waterYaw: 0, waterSide: 0, ankle: 0, twist: 0, feetForward: 0 };
      for (const g of GROUPS) {
        const w = without(y, tw, g);
        const c2 = continuousPlant(w.y, w.t);
        const d2 = discretise(c2.a, c2.b, CONTROL_STEP);
        gm[g] = rollAll - meanAcc(d2.phi, d2.gamma, 1);
        gb[g] = bankAll - meanAcc(d2.phi, d2.gamma, 3);
      }
      const mSum = GROUPS.reduce((acc, g) => acc + gm[g], 0);
      const bSum = GROUPS.reduce((acc, g) => acc + gb[g], 0);
      const mRest = rollAll - mSum;
      const bRest = bankAll - bSum;
      // The pendulum's own coefficient, read off the line that writes it [R, `yawRows`: `bankAcc[2] += g / hh`].
      const mPend = (9.81 / y.height) * x[2];

      // The same plant at the board's MEASURED rail, for P3c.
      const railUse = Math.min(railLimit(speedUsed) * DEG, Math.abs(rail));
      const atRail = plantAt(speedUsed, depth, { rail: (railUse / DEG) });
      const atRailC = continuousPlant(atRail.y, atRail.t);
      const atRailD = discretise(atRailC.a, atRailC.b, CONTROL_STEP);
      const rollAtRail = meanAcc(atRailD.phi, atRailD.gamma, 1);
      const bankAtRail = meanAcc(atRailD.phi, atRailD.gamma, 3);
      // The counterfactuals: the pair's sway mass, and both changes at once.
      const PAIR_MASS = 2.54 + y.mass;
      const swayC = continuousPlant({ ...y, boardMass: PAIR_MASS }, tw);
      const swayD = discretise(swayC.a, swayC.b, CONTROL_STEP);
      const rollSway = meanAcc(swayD.phi, swayD.gamma, 1);
      const bankSway = meanAcc(swayD.phi, swayD.gamma, 3);
      const bothC = continuousPlant({ ...atRail.y, boardMass: PAIR_MASS }, atRail.t);
      const bothD = discretise(bothC.a, bothC.b, CONTROL_STEP);
      const rollBoth = meanAcc(bothD.phi, bothD.gamma, 1);
      const bankBoth = meanAcc(bothD.phi, bothD.gamma, 3);

      // --- 3. the two rows against the ledger, in °/s².
      const ledgerOn = bankLedger.on;
      const rollGame = ledgerOn ? -bankLedger.deckTotal * DEG : Number.NaN;
      const bankGame = ledgerOn ? -bankLedger.ownTotal * DEG : Number.NaN;
      let gWater = 0;
      let gRider = 0;
      let gBoard = 0;
      if (ledgerOn) {
        for (const src of WATER_SOURCES) gWater -= bankLedger.deck[src] * DEG;
        for (const src of RIDER_SOURCES) gRider -= bankLedger.deck[src] * DEG;
        for (const src of BOARD_SOURCES) gBoard -= bankLedger.deck[src] * DEG;
      }

      // --- 2. the one-step residual, against the PREVIOUS tick's own Φ, Γ and command.
      let resRollRate = Number.NaN;
      let resBankRate = Number.NaN;
      let ratioRollRate = Number.NaN;
      let ratioBankRate = Number.NaN;
      let ratioRoll = Number.NaN;
      let ratioBank = Number.NaN;
      let resSlip = Number.NaN;
      let ratioSlip = Number.NaN;
      let resScaled = Number.NaN;
      let ratioRollRateNeg = Number.NaN;
      let ratioBankRateNeg = Number.NaN;
      let rollAccModel = Number.NaN;
      let bankAccModel = Number.NaN;
      let rollAccAtRail = Number.NaN;
      let rollAccMeas = Number.NaN;
      let bankAccMeas = Number.NaN;
      let ledgerRollRel = Number.NaN;
      let ledgerBankRel = Number.NaN;
      if (prev) {
        // P0b: the game's own mean roll and lean acceleration over the step that just ran, off its own two states.
        rollAccMeas = ((x[1] - prev.x[1]) / CONTROL_STEP) * DEG;
        bankAccMeas = ((x[3] - prev.x[3]) / CONTROL_STEP) * DEG;
        if (Math.abs(rollAccMeas) > 1e-6) ledgerRollRel = (prev.rollGame - rollAccMeas) / Math.abs(rollAccMeas);
        if (Math.abs(bankAccMeas) > 1e-6) ledgerBankRel = (prev.bankGame - bankAccMeas) / Math.abs(bankAccMeas);
      }
      if (prev) {
        spacingOff = Math.max(spacingOff, Math.abs(t - prev.t - CONTROL_STEP));
        const pred = new Array<number>(n).fill(0);
        const predNeg = new Array<number>(n).fill(0);
        for (let q = 0; q < n; q += 1) {
          pred[q] = dot(prev.phi[q], prev.x) + prev.gamma[q][0] * prev.u[0] + prev.gamma[q][1] * prev.u[1];
          predNeg[q] = dot(prev.phi[q], prev.xNeg) + prev.gamma[q][0] * prev.u[0] + prev.gamma[q][1] * prev.u[1];
        }
        const ratio = (q: number, p: number[]) => {
          const move = Math.abs(x[q] - prev!.x[q]);
          return move > 1e-9 ? Math.abs(p[q] - x[q]) / move : Number.NaN;
        };
        resRollRate = Math.abs(pred[1] - x[1]) * DEG;
        resBankRate = Math.abs(pred[3] - x[3]) * DEG;
        ratioRollRate = ratio(1, pred);
        ratioBankRate = ratio(3, pred);
        ratioRoll = ratio(0, pred);
        ratioBank = ratio(2, pred);
        resSlip = Math.abs(pred[5] - x[5]) * DEG;
        ratioSlip = ratio(5, pred);
        ratioRollRateNeg = ratio(1, predNeg);
        ratioBankRateNeg = ratio(3, predNeg);
        let acc = 0;
        for (let q = 0; q < n; q += 1) { const sc = prev.scale[q]; acc += ((pred[q] - x[q]) / sc) ** 2; }
        resScaled = Math.sqrt(acc / n);
      }
      // The model's own implied mean acceleration over THIS step, off this tick's own blend and state.
      {
        const pr = dot(d.phi[1], x) + d.gamma[1][0] * u[0] + d.gamma[1][1] * u[1];
        const pb = dot(d.phi[3], x) + d.gamma[3][0] * u[0] + d.gamma[3][1] * u[1];
        rollAccModel = (pr - x[1]) / CONTROL_STEP * DEG;
        bankAccModel = (pb - x[3]) / CONTROL_STEP * DEG;
        rollAccAtRail = rollAtRail * DEG;
      }

      const scale = [0.05, 0.5, 0.05, 0.25, 0.2, 0.02, 0.5, 1, 0.25, 30];
      prev = {
        t,
        x: x.slice(),
        xNeg,
        u,
        phi: d.phi.map((row) => row.slice()),
        gamma: d.gamma.map((row) => row.slice()),
        scale,
        rollGame: rollGame,
        bankGame: bankGame,
      };

      const relOf = (m: number, g: number) => (Number.isFinite(g) && Math.abs(g) > 1e-9 ? (m - g) / Math.abs(g) : Number.NaN);
      ticks.push({
        t,
        ticks: nTicks,
        through,
        roll,
        bank,
        rail,
        clamped: Math.abs(bank) >= MAX_BANK - 1e-6 ? 1 : 0,
        speed: speedUsed,
        speedUsed: Math.max(TABLE_FLOOR, Math.min(TABLE_CEIL, speedUsed)),
        speedClamped: speedUsed < TABLE_FLOOR || speedUsed > TABLE_CEIL ? 1 : 0,
        schedRail: schedRail * DEG,
        railMeas: Math.abs(rail),
        railUsable: railLimit(speedUsed) * DEG,
        resRollRate,
        resBankRate,
        ratioRollRate,
        ratioBankRate,
        ratioRoll,
        ratioBank,
        resSlip,
        ratioSlip,
        resScaled,
        ratioRollRateNeg,
        ratioBankRateNeg,
        rollAccModel,
        rollAccGame: rollGame,
        bankAccModel,
        bankAccGame: bankGame,
        rollRel: relOf(rollAccModel, rollGame),
        bankRel: relOf(bankAccModel, bankGame),
        rollSign: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? (Math.sign(rollAccModel) === Math.sign(rollGame) ? 1 : 0) : Number.NaN,
        bankSign: Number.isFinite(bankGame) && Math.abs(bankGame) > 1e-9 ? (Math.sign(bankAccModel) === Math.sign(bankGame) ? 1 : 0) : Number.NaN,
        mWaterRoll: gm.waterRoll * DEG,
        mWaterYaw: gm.waterYaw * DEG,
        mWaterSide: gm.waterSide * DEG,
        mAnkle: gm.ankle * DEG,
        mTwist: gm.twist * DEG,
        mFeetFwd: gm.feetForward * DEG,
        mRest: mRest * DEG,
        mWaterAll: (gm.waterRoll + gm.waterYaw + gm.waterSide) * DEG,
        mRiderAll: (gm.ankle + gm.twist + gm.feetForward + mRest) * DEG,
        gWaterAll: gWater + gBoard,
        mClose: Math.abs(mSum + mRest - rollAll) / Math.max(1e-30, Math.abs(rollAll)),
        gWater,
        gRider,
        gBoard,
        gCarryDeck: ledgerOn ? -bankLedger.deck.carry * DEG : Number.NaN,
        gCarryOwn: ledgerOn ? -bankLedger.own.carry * DEG : Number.NaN,
        gGyroDeck: ledgerOn ? -bankLedger.deck.gyro * DEG : Number.NaN,
        mPendulum: mPend * DEG,
        bWaterRoll: gb.waterRoll * DEG,
        bWaterYaw: gb.waterYaw * DEG,
        bWaterSide: gb.waterSide * DEG,
        bAnkle: gb.ankle * DEG,
        bRest: bRest * DEG,
        bClose: Math.abs(bSum + bRest - bankAll) / Math.max(1e-30, Math.abs(bankAll)),
        heelRoll0: y.heelRoll,
        heelRollAt: atRail.y.heelRoll,
        rollAccAtRail,
        relAtRail: relOf(rollAccAtRail, rollGame),
        railHelps: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9
          ? (Math.abs(rollAccAtRail - rollGame) < Math.abs(rollAccModel - rollGame) ? 1 : 0) : Number.NaN,
        rollAccMeas,
        bankAccMeas,
        ledgerRollRel,
        ledgerBankRel,
        blendRel: Math.abs(rollAccModel) > 1e-9 ? (rollAll * DEG - rollAccModel) / Math.abs(rollAccModel) : Number.NaN,
        rollAccSway: rollSway * DEG,
        relSway: relOf(rollSway * DEG, rollGame),
        rollAccBoth: rollBoth * DEG,
        relBoth: relOf(rollBoth * DEG, rollGame),
        relBankRail: relOf(bankAtRail * DEG, bankGame),
        relBankSway: relOf(bankSway * DEG, bankGame),
        relBankBoth: relOf(bankBoth * DEG, bankGame),
        bestRoll: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9
          ? [rollAll * DEG, rollAtRail * DEG, rollSway * DEG, rollBoth * DEG]
            .map((v, q) => [Math.abs(v - rollGame), q] as const)
            .sort((p, q) => p[0] - q[0])[0][1]
          : Number.NaN,
      });
    }

    // `attached` is the test (step 3.3f §1): `separate` leaves `phase` and `upright` untouched.
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
      fell = rider.attached ? rider.phase : (rider.separation ?? 'separated');
      fellAt = t;
      break;
    }
  }
  bankLedger.on = false;

  if (TRACE && ticks.length) {
    process.stdout.write(`# TRACE ${RIDER} ${st} entry=${f(entry, 3)} steer=${steer} felt=${FELT ?? 'world'}\n`);
    const keys = Object.keys(ticks[0]);
    process.stdout.write(`${keys.join('\t')}\n`);
    for (const xx of ticks) {
      const row = xx as unknown as Record<string, number>;
      process.stdout.write(`${keys.map((k) => (Number.isFinite(row[k]) ? row[k].toFixed(6) : 'NaN')).join('\t')}\n`);
    }
  }

  // Every window starts after 0.2 s (the placement's contact transient) and excludes the `MAX_BANK` clamp's frames,
  // which are counted and published — exactly as 3.3k, 3.3l, 3.3m and 3.3n did.
  const live = ticks.filter((xx) => xx.t > 0.2 && xx.clamped === 0);
  const end = ticks[ticks.length - 1];
  const endT = Number.isFinite(fellAt) ? fellAt : (end?.t ?? Number.NaN);
  const late = live.filter((xx) => xx.t >= endT - 0.2);
  const virgin = ticks.filter((xx) => xx.ticks <= 6);
  const col = (w: Tick[], k: keyof Tick) => w.map((xx) => Number(xx[k]));
  const absCol = (w: Tick[], k: keyof Tick) => w.map((xx) => Math.abs(Number(xx[k])));
  const shareOf = (w: Tick[], k: keyof Tick) => share(w.filter((xx) => Number.isFinite(Number(xx[k]))).map((xx) => Number(xx[k]) === 1));
  const aboveOne = (w: Tick[], k: keyof Tick) => share(w.filter((xx) => Number.isFinite(Number(xx[k]))).map((xx) => Number(xx[k]) > 1));

  const out: Record<string, unknown> = {
    rider: RIDER,
    ledger: LEDGER,
    stance: st,
    extra: entry0 === null ? extra : null,
    entryAsked: entry0,
    entry: r(entry, 3),
    steer,
    felt: FELT ?? 'world',
    fell,
    fellAt: r(fellAt, 3),
    frames: Math.round((Number.isFinite(fellAt) ? fellAt : SECONDS) / STEP),
    tickRows: ticks.length,
    liveRows: live.length,
    clampedRows: ticks.filter((xx) => xx.clamped === 1).length,
    throughFirst: r(ticks.filter((xx) => xx.t > 0.2)[0]?.through ?? Number.NaN, 3),
    throughFall: r(end?.through ?? Number.NaN, 3),
    rollFall: r(end?.roll ?? Number.NaN, 2),
    bankFall: r(end?.bank ?? Number.NaN, 2),
    railFall: r(end?.rail ?? Number.NaN, 2),
    // --- P0 controls
    senseOff: r(senseOff, 15),
    spacingOff: r(spacingOff, 12),
    ledgerSplit: r(ledgerSplit, 12),
    ledgerClosure: r(ledgerClosure, 12),
    ledgerResidual: r(ledgerResidual, 12),
    ledgerApart: ledgerApart,
    closeRoll: r(peak(absCol(live, 'mClose')), 15),
    closeBank: r(peak(absCol(live, 'bClose')), 15),
    // --- P1 the one-step residual
    resRollRateMed: r(median(absCol(live, 'resRollRate')), 3),
    resRollRatePeak: r(peak(absCol(live, 'resRollRate')), 3),
    resBankRateMed: r(median(absCol(live, 'resBankRate')), 3),
    resBankRatePeak: r(peak(absCol(live, 'resBankRate')), 3),
    ratioRollRateMed: r(median(col(live, 'ratioRollRate')), 3),
    ratioBankRateMed: r(median(col(live, 'ratioBankRate')), 3),
    ratioRollMed: r(median(col(live, 'ratioRoll')), 3),
    ratioBankMed: r(median(col(live, 'ratioBank')), 3),
    ratioSlipMed: r(median(col(live, 'ratioSlip')), 3),
    aboveOneRollRate: r(aboveOne(live, 'ratioRollRate'), 3),
    aboveOneBankRate: r(aboveOne(live, 'ratioBankRate'), 3),
    ratioRollRateMedNeg: r(median(col(live, 'ratioRollRateNeg')), 3),
    ratioBankRateMedNeg: r(median(col(live, 'ratioBankRateNeg')), 3),
    resScaledMed: r(median(col(live, 'resScaled')), 4),
    resScaledPeak: r(peak(col(live, 'resScaled')), 4),
    // P0f: the first six ticks, where the filter has not run but the probe's state is the game's own.
    ratioRollRateVirgin: r(median(col(virgin.filter((xx) => Number.isFinite(xx.ratioRollRate)), 'ratioRollRate')), 3),
    // --- P1/P2 the rows against the ledger
    rollAccModelMed: r(median(absCol(live, 'rollAccModel')), 1),
    rollAccGameMed: r(median(absCol(live, 'rollAccGame')), 1),
    rollRelMed: r(median(absCol(live, 'rollRel')), 3),
    rollRelPeak: r(peak(absCol(live, 'rollRel')), 3),
    rollSignRight: r(shareOf(live, 'rollSign'), 3),
    bankAccModelMed: r(median(absCol(live, 'bankAccModel')), 1),
    bankAccGameMed: r(median(absCol(live, 'bankAccGame')), 1),
    bankRelMed: r(median(absCol(live, 'bankRel')), 3),
    bankRelPeak: r(peak(absCol(live, 'bankRel')), 3),
    bankSignRight: r(shareOf(live, 'bankSign'), 3),
    rollRelLate: r(median(absCol(late, 'rollRel')), 3),
    bankRelLate: r(median(absCol(late, 'bankRel')), 3),
    // --- P2 per part
    mWaterRollMed: r(median(absCol(live, 'mWaterRoll')), 1),
    mWaterYawMed: r(median(absCol(live, 'mWaterYaw')), 1),
    mWaterSideMed: r(median(absCol(live, 'mWaterSide')), 1),
    mAnkleMed: r(median(absCol(live, 'mAnkle')), 1),
    mTwistMed: r(median(absCol(live, 'mTwist')), 1),
    mFeetFwdMed: r(median(absCol(live, 'mFeetFwd')), 1),
    mRestMed: r(median(absCol(live, 'mRest')), 1),
    gWaterMed: r(median(absCol(live, 'gWater')), 1),
    gRiderMed: r(median(absCol(live, 'gRider')), 1),
    gBoardMed: r(median(absCol(live, 'gBoard')), 1),
    gCarryDeckMed: r(median(absCol(live, 'gCarryDeck')), 4),
    gCarryOwnMed: r(median(absCol(live, 'gCarryOwn')), 4),
    gCarryOwnPeak: r(peak(absCol(live, 'gCarryOwn')), 4),
    gGyroDeckMed: r(median(absCol(live, 'gGyroDeck')), 4),
    // P0b: the ledger's own reading against the game's own state change, and the blend's own error.
    ledgerRollRelMed: r(median(absCol(live, 'ledgerRollRel')), 4),
    ledgerBankRelMed: r(median(absCol(live, 'ledgerBankRel')), 4),
    rollAccMeasMed: r(median(absCol(live, 'rollAccMeas')), 1),
    bankAccMeasMed: r(median(absCol(live, 'bankAccMeas')), 1),
    blendRelMed: r(median(absCol(live, 'blendRel')), 4),
    blendRelPeak: r(peak(absCol(live, 'blendRel')), 4),
    // The water's own gap: the model's water term against the ledger's water sources, both on the roll row.
    mWaterAllMed: r(median(absCol(live, 'mWaterAll')), 1),
    mRiderAllMed: r(median(absCol(live, 'mRiderAll')), 1),
    gWaterAllMed: r(median(absCol(live, 'gWaterAll')), 1),
    waterGapMed: r(median(live.map((xx) => (Math.abs(xx.gWaterAll) > 1e-9 ? (xx.mWaterAll - xx.gWaterAll) / Math.abs(xx.gWaterAll) : Number.NaN)).filter(Number.isFinite)), 3),
    riderGapMed: r(median(live.map((xx) => (Math.abs(xx.gRider) > 1e-9 ? (xx.mRiderAll - xx.gRider) / Math.abs(xx.gRider) : Number.NaN)).filter(Number.isFinite)), 3),
    waterGapAbsMed: r(median(live.map((xx) => Math.abs(xx.mWaterAll - xx.gWaterAll)).filter(Number.isFinite)), 1),
    riderGapAbsMed: r(median(live.map((xx) => Math.abs(xx.mRiderAll - xx.gRider)).filter(Number.isFinite)), 1),
    carryShareMed: r(median(live.map((xx) => (Math.abs(xx.rollAccGame) > 1e-9 ? Math.abs(xx.gCarryDeck / xx.rollAccGame) : Number.NaN)).filter(Number.isFinite)), 3),
    carryShareOwnMed: r(median(live.map((xx) => (Math.abs(xx.bankAccGame) > 1e-9 ? Math.abs(xx.gCarryOwn / xx.bankAccGame) : Number.NaN)).filter(Number.isFinite)), 3),
    mPendulumMed: r(median(absCol(live, 'mPendulum')), 1),
    bAnkleMed: r(median(absCol(live, 'bAnkle')), 1),
    bRestMed: r(median(absCol(live, 'bRest')), 1),
    // --- P3 the rail
    schedRailPeak: r(peak(absCol(live, 'schedRail')), 6),
    railMeasPeak: r(peak(col(live, 'railMeas')), 2),
    railMeasMed: r(median(col(live, 'railMeas')), 2),
    heelRoll0Med: r(median(col(live, 'heelRoll0')), 1),
    heelRollAtMed: r(median(col(live, 'heelRollAt')), 1),
    heelRollFlips: r(share(live.map((xx) => Math.sign(xx.heelRollAt) !== Math.sign(xx.heelRoll0))), 3),
    relAtRailMed: r(median(absCol(live, 'relAtRail')), 3),
    railHelpsShare: r(shareOf(live, 'railHelps'), 3),
    // --- the counterfactuals, roll row then bank row
    relSwayMed: r(median(absCol(live, 'relSway')), 3),
    relBothMed: r(median(absCol(live, 'relBoth')), 3),
    relBankRailMed: r(median(absCol(live, 'relBankRail')), 3),
    relBankSwayMed: r(median(absCol(live, 'relBankSway')), 3),
    relBankBothMed: r(median(absCol(live, 'relBankBoth')), 3),
    bestShipped: r(share(live.filter((xx) => Number.isFinite(xx.bestRoll)).map((xx) => xx.bestRoll === 0)), 3),
    bestRail: r(share(live.filter((xx) => Number.isFinite(xx.bestRoll)).map((xx) => xx.bestRoll === 1)), 3),
    bestSway: r(share(live.filter((xx) => Number.isFinite(xx.bestRoll)).map((xx) => xx.bestRoll === 2)), 3),
    bestBoth: r(share(live.filter((xx) => Number.isFinite(xx.bestRoll)).map((xx) => xx.bestRoll === 3)), 3),
    // --- P4 the speed
    speedMed: r(median(col(live, 'speed')), 3),
    speedMin: r(sorted(col(live, 'speed'))[0] ?? Number.NaN, 3),
    speedClampedShare: r(share(live.map((xx) => xx.speedClamped === 1)), 3),
  };
  return out;
}

const rows: Record<string, unknown>[] = [];
for (const st of STANCES) {
  for (const steer of STEERS) {
    if (ENTRIES) for (const e of ENTRIES) rows.push(oneRun(st, 0, e, steer));
    else for (const extra of EXTRAS) rows.push(oneRun(st, extra, null, steer));
  }
}
for (const row of rows) emit(row);

const num = (k: string) => rows.map((x) => Number(x[k])).filter(Number.isFinite);
const sh = (k: string) => span(num(k), 3);
process.stdout.write(`\n# step 3.3o — the internal plant against the game, ${rows.length} runs, ${RIDER} rider, ${FELT ?? 'world'} filter, ledger ${LEDGER}\n`);
process.stdout.write(`# fell ${rows.filter((x) => x.fell).length} of ${rows.length}, at ${span(num('fellAt'), 3)} s, median ${f(median(num('fellAt')), 3)}\n`);
process.stdout.write(`# P0a sense residual, peak over runs: ${peak(num('senseOff')).toExponential(3)}  | tick spacing off: ${peak(num('spacingOff')).toExponential(3)} s\n`);
process.stdout.write(`# P0c ledger split ${peak(num('ledgerSplit')).toExponential(2)} closure ${peak(num('ledgerClosure')).toExponential(2)} residual ${peak(num('ledgerResidual')).toExponential(2)} apart ${peak(num('ledgerApart'))}\n`);
process.stdout.write(`# P0e group closure, roll ${peak(num('closeRoll')).toExponential(2)} bank ${peak(num('closeBank')).toExponential(2)}\n`);
process.stdout.write(`# P0b the ledger vs the game's own state change: roll ${sh('ledgerRollRelMed')} rel, lean ${sh('ledgerBankRelMed')} | measured roll acc ${sh('rollAccMeasMed')} °/s², lean ${sh('bankAccMeasMed')}\n`);
process.stdout.write(`# P0g the blend's own error (exact point vs the controller's blend) ${sh('blendRelMed')} median, ${sh('blendRelPeak')} peak\n`);
process.stdout.write(`# P1 one-step residual: roll rate ${sh('resRollRateMed')} °/s median (peak ${sh('resRollRatePeak')}), bank rate ${sh('resBankRateMed')} (peak ${sh('resBankRatePeak')})\n`);
process.stdout.write(`#    over the component's own change: roll rate ${sh('ratioRollRateMed')}, bank rate ${sh('ratioBankRateMed')}, roll ${sh('ratioRollMed')}, bank ${sh('ratioBankMed')}, slip ${sh('ratioSlipMed')}\n`);
process.stdout.write(`#    share of ticks above 1: roll rate ${sh('aboveOneRollRate')}, bank rate ${sh('aboveOneBankRate')}\n`);
process.stdout.write(`#    with the derived slip's sign reversed: roll rate ${sh('ratioRollRateMedNeg')}, bank rate ${sh('ratioBankRateMedNeg')}\n`);
process.stdout.write(`#    scaled rms ${sh('resScaledMed')} median, ${sh('resScaledPeak')} peak | first six ticks' roll-rate ratio ${sh('ratioRollRateVirgin')}\n`);
process.stdout.write(`# P1 rows vs the ledger: roll model ${sh('rollAccModelMed')} °/s² vs game ${sh('rollAccGameMed')}, rel err ${sh('rollRelMed')} (peak ${sh('rollRelPeak')}), sign right ${sh('rollSignRight')}\n`);
process.stdout.write(`#                        bank model ${sh('bankAccModelMed')} vs game ${sh('bankAccGameMed')}, rel err ${sh('bankRelMed')} (peak ${sh('bankRelPeak')}), sign right ${sh('bankSignRight')}\n`);
process.stdout.write(`#    last 0.2 s: roll ${sh('rollRelLate')}, bank ${sh('bankRelLate')}\n`);
process.stdout.write(`# P2 model roll row by group, °/s² median: waterRoll ${sh('mWaterRollMed')} waterYaw ${sh('mWaterYawMed')} waterSide ${sh('mWaterSideMed')} ankle ${sh('mAnkleMed')} twist ${sh('mTwistMed')} feetFwd ${sh('mFeetFwdMed')} rest ${sh('mRestMed')}\n`);
process.stdout.write(`#    game roll row by group: water ${sh('gWaterMed')} rider ${sh('gRiderMed')} board ${sh('gBoardMed')} | carry ${sh('gCarryDeckMed')} gyro ${sh('gGyroDeckMed')}\n`);
process.stdout.write(`#    SIGNED sums: model water ${sh('mWaterAllMed')} vs game water+board ${sh('gWaterAllMed')} | model rider ${sh('mRiderAllMed')} vs game rider ${sh('gRiderMed')}\n`);
process.stdout.write(`#    water gap ${sh('waterGapMed')} rel (${sh('waterGapAbsMed')} °/s²), rider gap ${sh('riderGapMed')} rel (${sh('riderGapAbsMed')} °/s²)\n`);
process.stdout.write(`#    carry's share of the roll row ${sh('carryShareMed')}, of the lean row ${sh('carryShareOwnMed')}; carry's own peak ${sh('gCarryOwnPeak')} °/s²\n`);
process.stdout.write(`#    the pendulum's own g/L term ${sh('mPendulumMed')} °/s²; bank row ankle ${sh('bAnkleMed')} rest ${sh('bRestMed')}\n`);
process.stdout.write(`# P3 schedule's rail peak ${sh('schedRailPeak')}° vs measured |rail| median ${sh('railMeasMed')}° peak ${sh('railMeasPeak')}°\n`);
process.stdout.write(`#    heelRoll at 0 ${sh('heelRoll0Med')} vs at the measured rail ${sh('heelRollAtMed')} N·m/rad; sign flips in ${sh('heelRollFlips')} of ticks\n`);
process.stdout.write(`#    P3c: rel err with the measured rail's plant ${sh('relAtRailMed')} against ${sh('rollRelMed')}; it HELPS in ${sh('railHelpsShare')} of ticks\n`);
process.stdout.write(`# P4 speed median ${sh('speedMed')} m/s, min ${sh('speedMin')}; clamped to the table's 4–12 in ${sh('speedClampedShare')} of ticks\n`);
process.stdout.write(`# P5 counterfactuals, roll row rel err: shipped ${sh('rollRelMed')} | rail ${sh('relAtRailMed')} | sway 75.54 kg ${sh('relSwayMed')} | both ${sh('relBothMed')}\n`);
process.stdout.write(`#    bank row rel err: shipped ${sh('bankRelMed')} | rail ${sh('relBankRailMed')} | sway ${sh('relBankSwayMed')} | both ${sh('relBankBothMed')}\n`);
process.stdout.write(`#    closest on the roll row, share of ticks: shipped ${sh('bestShipped')} rail ${sh('bestRail')} sway ${sh('bestSway')} both ${sh('bestBoth')}\n`);
