/**
 * Steps 3.3o and 3.3p: **how wrong the balance's own internal plant is, per part — and whether the game's own 9×9
 * solve can supply a better one.**
 *
 * **Step 3.3p's five additions, and what each one is an identity of** (the five instruments 3.3o built are below,
 * unchanged):
 *
 * **6. The four inertias the game's own `A⁻¹` holds, against the four the model has by hand.** `coupleStanding`'s
 * `system[i * N + i] += m` is a **diagonal** of `A`, and the same loop writes the coupling to the bank's own freedom
 * two lines down [R], so the quantity the model's `boardMass` should be compared with is `1 / (t̂ · Δv)` off `A⁻¹` —
 * which is the sibling of Part 36 §2's reading that `A[7][7] · L²` is not an effective inertia. The bank ledger now
 * publishes the whole **4×4 lateral compliance** of the game's own matrix (the deck's roll, the board's sway, its
 * turn, the joint's own angle) plus two counterfactual factorisations, and this probe reads it per tick. `A` is
 * symmetric, so its two roll–sway corners must agree exactly; and with every row but the three translations welded
 * the sway mass must read the two masses SUMMED, which is the positive control.
 *
 * **7. FORCE against FORCE, with no inertia and no solve in between.** The model's own water roll moment, side force
 * and yaw moment from the twelve derivatives read at the state, against `BoardBody.roll`, `BoardBody.yaw` and
 * `BoardBody.forces` — the board's own per-source ledgers, both static measurement flags, both off in the game. This
 * is the instrument that separates "the derivatives are wrong" from "the denominator is wrong", because neither side
 * has an inertia in it.
 *
 * **8. The water's own heel datum, as a counterfactual and as the round's switch.** Every one of the twelve
 * derivatives was measured per radian of the board's heel **against a flat free surface** [R]; the model is fed `φ`,
 * its roll from the **world's level** [R]. The corrected plant is the same plant with `−heelColumn` as an extra
 * **input** column driven by the measured tilt, and `heelColumn` is **imported from `predictiveBalance`** so the
 * counterfactual scored here and the switch that ships are one function. `WHEEL=tilt|predict` rides it.
 *
 * **9. The derived plant's ceiling**: the model's own four generalised forces put through the game's own 4×4
 * compliance, so that every mass, inertia and lever of the model's lateral block is gone and only the forces are the
 * model's. **This is the brief's own ruling item 2, measured instead of built.** Its control is the diagonal alone,
 * which must reproduce the model's own `K / boardRollInertia` to within the two inertias' own ratio.
 *
 * **10. The roll row's own conditioning**, in the model and in the game: its largest single term over the net it
 * produces. A row whose net is a third of its largest term turns a 2–6× term error into a 4–16× net error, which is
 * what 3.3o measured and could not attribute.
 *
 * ---
 *
 * Step 3.3o: **how wrong the balance's own internal plant is, per part.**
 *
 * Step 3.3n found that the loop's command-bias estimate `b̂₀` is an unbounded integrator that reaches 0.31–2.82 of the
 * ankle's whole command bound and is propagated inside the forward model, and closed with the sentence that is this
 * round's brief: *"The bias only grows because the loop's internal model does not match the game — it is the only
 * slack the model has, so all mismatch piles into it … **Nobody has measured how wrong that model is**, or which part
 * of it (the water's captive derivatives, the point-mass body, the free-versus-held table, the rail schedule)."*
 *
 * Step 3.3o's probe measured it and built nothing. **Step 3.3p's additions above are read-only too, and the one
 * source change of the round — `?waterHeel=tilt|predict` — is reached here only through `WHEEL`, which is off by
 * default, so every arm with `WHEEL` unset is step 3.3o's own probe on step 3.3o's own cells.**
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
 * Env: `RIDER=new|old`, `STANCES`, `EXTRAS`, `ENTRIES`, `STEERS`, `SECONDS`, `FELT=deck`, `LEDGER=off`,
 * `WHEEL=tilt|predict` (step 3.3p's switch), `OUT`, `TRACE`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { bankLedger, BANK_SOURCES, type BankSource } from '../../../../src/physics/bankLedger';
import { CONTROL_STEP, continuousPlant, discretise, heelColumn, plantAt, railLimit } from '../../../../src/physics/predictiveBalance';
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
/** `WHEEL=tilt`: step 3.3p's shipped switch, so the arm that rides it is the same probe on the same cells. */
const WHEEL = process.env.WHEEL === 'tilt' ? 'tilt' : process.env.WHEEL === 'predict' ? 'predict' : undefined;
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
  blendedDesign?: { phi: number[][]; gamma: number[][]; k: number[][]; c: number[][]; steps: number; gammaD?: number[][] };
}

/** `AttachedRider`'s own privates this probe reads, each named rather than reached for anonymously. */
interface RiderInner {
  ankleRest: number;
  ankleRoom: number;
  ankleBite: number;
  heldAnkleRaw: number;
  leanAsked: number;
  /** Step 3.3p: the tilt the controller was handed, rad, in the model's own sign (0 unless `waterHeel`). */
  schedTilt: number;
  /** The rail the schedule was read at, rad — `min(SCHEDULE_RAIL_CAP, …)` of the lean ASKED for, not the board's rail. */
  schedRail: number;
  /** Step 3.3p: the tilt the controller was handed, rad, model sign (0 unless `waterHeel` is on). */
  schedTilt: number;
}

/** The six groups of the plant that can be zeroed exactly, and the twelve coefficients each owns. */
type Group = 'waterRoll' | 'waterYaw' | 'waterSide' | 'ankle' | 'twist' | 'feetForward';
const GROUPS: Group[] = ['waterRoll', 'waterYaw', 'waterSide', 'ankle', 'twist', 'feetForward'];

/**
 * The plant with the tilt as a third input: Φ, Γ (two commands) and Γ_d (the tilt's own column).
 *
 * **`heelColumn` is imported from `predictiveBalance`, not reimplemented here**, so the counterfactual this probe
 * scores and the switch the round ships are the same arithmetic on the same function. Every derivative in
 * `PLANT_SPEEDS`, `RAIL_PLANT` and `FROZEN_PLANT` was measured per radian of the board's heel against a flat free
 * surface [R]; the model is fed `φ`, its roll from the world's level [R]. The corrected plant is the same plant with
 * `−heelColumn` as an extra input column driven by the measured tilt, so the water's own terms see `φ − tilt` and
 * every other term still sees `φ`.
 */
function tiltPlant(y: YawPlant, t: TwistPlant): { phi: number[][]; gamma: number[][]; gammaD: number[] } {
  const { a, b } = continuousPlant(y, t);
  const heel = heelColumn(y, t);
  const b3 = b.map((row, i) => [...row, -heel[i]]);
  const d = discretise(a, b3, CONTROL_STEP);
  return { phi: d.phi, gamma: d.gamma.map((row) => [row[0], row[1]]), gammaD: d.gamma.map((row) => row[2]) };
}

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

  // --- 7. step 3.3p: the inertias the GAME's own 9×9 meets, off its own A⁻¹, against the model's hand-built ones ---
  /** `1 / (t̂ · Δv)` for a unit side impulse on the board's rows, kg — the mass the solve divides a side force by. */
  swayMassGame: number;
  /** The model's own: `YawPlant.boardMass`, kg (2.54, the dry board) [R]. */
  swayMassModel: number;
  /** The same read with the bank row welded (×10⁶): the positive control, which must read the masses SUMMED. */
  swayMassRigid: number;
  /** `1 / (r̂ · Δω)` for a unit roll impulse, kg·m², against the model's `boardRollInertia` (3.3m's reproduction). */
  rollInertiaGame: number;
  rollInertiaModel: number;
  /** `1 / (n̂ · Δω)` for a unit yaw impulse about the body's up, kg·m², against `boardYawInertia + riderYawInertia`. */
  yawInertiaGame: number;
  yawInertiaModel: number;
  /** The cross terms, both corners: the roll a unit side impulse makes and the sway a unit roll impulse makes. */
  sideRollGame: number;
  rollSwayGame: number;
  /** The joint's own `Δu̇ / L` for a unit side impulse: the feet's acceleration, which the model has through the slip. */
  sideRelativeGame: number;
  /** The control that works: the same read with everything but the three translations welded, kg. */
  swayMassFrozen: number;

  // --- 8. step 3.3p: FORCE against FORCE, with no inertia and no solve in between ---
  /**
   * The game's own water roll moment on the board, N·m, in the model's own sign — `BoardBody.roll`'s ten water
   * sources summed (`gyro`, `rider` and `total` left out: the first is the board's own, the second a residual).
   * The datum: `BoardBody.roll` is about the board's own long axis, positive lifting the board's +x rail, which is
   * the same rotation as the model's `+φ` (right rail down) [R + A on the two docstrings]; 3.3m measured that axis
   * and `rollAxis` agree to 2–5 %, so nothing below turns on which is used.
   */
  kGame: number;
  /** The same for the side force, N, along the model's own +y (the board's right), ten sources summed. */
  yGame: number;
  /** The same for the yaw moment, N·m, in the model's sign (+ nose right), off `BoardBody.yaw`. */
  nGame: number;
  /** The model's own three, from the twelve captive derivatives read at the controller's own state. */
  kModel: number;
  yModel: number;
  nModel: number;
  /**
   * The same three with the board's **heel relative to the water** put in where the model puts its world roll. The
   * lab measured every derivative per radian of heel against a flat free surface, and the model is fed `φ`, the
   * board's roll from the world's level — on a face those differ by the face's own tilt. Both are printed.
   */
  kModelRail: number;
  yModelRail: number;
  nModelRail: number;
  /** The face's own tilt under the board, °: the whole difference between the two rows above. */
  tilt: number;

  // --- 9. step 3.3p: the TILT plant — the same plant with the water's own terms read at the heel against the water ---
  /** Its implied mean roll and lean acceleration, °/s², and its own relative error against the game's. */
  rollAccTilt: number;
  bankAccTilt: number;
  relTilt: number;
  relBankTilt: number;
  /** Whether it gets the SIGN of the two accelerations right. */
  rollSignTilt: number;
  bankSignTilt: number;
  /** Its own one-step residual ratios, on the previous tick's own tilt plant and the previous tick's own tilt. */
  ratioRollRateTilt: number;
  ratioBankRateTilt: number;
  /** The same four for the tilt plant read ALSO at the board's measured rail (the two corrections together). */
  rollAccTiltRail: number;
  relTiltRail: number;
  relBankTiltRail: number;
  rollSignTiltRail: number;

  // --- 10. step 3.3p: the DERIVED plant's ceiling — the model's own forces through the GAME's own 4×4 compliance ---
  /**
   * `φ̈` from `C_game · (the model's own generalised forces)`, °/s², where `C_game` is the game's own `A⁻¹` on the
   * four lateral coordinates and the forces are the model's own: the water's roll moment, side force and yaw moment
   * from the twelve derivatives at the state, plus the body's push across at the feet and the ankle's own torque.
   * **This is the ceiling on what re-deriving the inertia side can buy**: it is the model's force side with the
   * game's own mass matrix and nothing of the model's own masses left in it.
   */
  rollAccDerived: number;
  relDerived: number;
  rollSignDerived: number;
  /** The same with the water's heel taken against the water (the two corrections at once). */
  rollAccDerivedTilt: number;
  relDerivedTilt: number;
  rollSignDerivedTilt: number;
  /** The control on the mapping's signs and scalings: the DIAGONAL alone, against the model's own `K / I_roll`. */
  rollAccDerivedDiag: number;
  rollAccModelDiag: number;

  // --- 11. step 3.3p: the row's own CONDITIONING, in the model and in the game ---
  /** The model's largest single roll-row group over the net it produces: how much cancellation the row lives on. */
  condModel: number;
  /** The game's own: its largest single source group (water+board or rider) over its own net. */
  condGame: number;
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
    ...(WHEEL ? { waterHeel: WHEEL } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stanceInputs(rider, st);
  rider.steer = steer;
  bankLedger.on = LEDGER === 'on';
  // Step 3.3p: the board's own roll and yaw ledgers (both static measurement flags, both off in the game) for the
  // force-against-force read. `LEDGER=off` turns all three off together, so the purity arm is one arm.
  BoardBody.rollLedger = LEDGER === 'on';
  BoardBody.yawLedger = LEDGER === 'on';

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
  let prev: {
    t: number; x: number[]; xNeg: number[]; u: number[]; phi: number[][]; gamma: number[][]; scale: number[];
    rollGame: number; bankGame: number;
    /** Step 3.3p: the tilt plant at the same point, and the tilt it was read at (model sign, rad). */
    tPhi: number[][]; tGamma: number[][]; tGammaD: number[]; tiltRad: number;
    /** The controller's own tilt column and the tilt it was handed, when `waterHeel` is on. */
    ownGammaD: number[] | null; ownTilt: number;
  } | null = null;
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
      // **Step 3.3p: the tilt plant.** The water's own terms read at the heel against the water, the rest of the
      // plant untouched, the tilt entering as a measured input. `tiltRad` is in the model's own sign, which is the
      // probe's reversed (`φ = −roll` by instrument 1's identity), so the heel the water sees is `φ − tiltRad`.
      const ledgerLive = bankLedger.on && bankLedger.unitSteps > 0;
      const tiltRad = -tilt / DEG;
      const tp = tiltPlant(y, tw);
      const tiltAcc = (row: number) =>
        (dot(tp.phi[row], x) + tp.gamma[row][0] * u[0] + tp.gamma[row][1] * u[1] + tp.gammaD[row] * tiltRad - x[row]) / CONTROL_STEP;
      const rollTilt = tiltAcc(1);
      const bankTilt = tiltAcc(3);
      // And the two corrections together: the schedule read at the board's measured rail AND the water's own datum.
      const tpRail = tiltPlant(atRail.y, atRail.t);
      const tiltRailAcc = (row: number) =>
        (dot(tpRail.phi[row], x) + tpRail.gamma[row][0] * u[0] + tpRail.gamma[row][1] * u[1] + tpRail.gammaD[row] * tiltRad - x[row]) / CONTROL_STEP;
      const rollTiltRail = tiltRailAcc(1);
      const bankTiltRail = tiltRailAcc(3);

      // **Step 3.3p: the derived plant's ceiling.** The model's own four generalised forces put through the GAME's
      // own 4×4 compliance, so the whole inertia side of the model — `boardRollInertia`, `boardMass · V`,
      // `boardYawInertia + riderYawInertia`, `m h²`, the 0.031 m deck lever and the point-mass pendulum's own
      // geometry — is replaced by the matrix the integrator actually inverts, and nothing but the forces is the
      // model's. The column scalings are the ledger's own: the roll and yaw entries are per N·m, the sway entry per
      // N, and the ankle column is the response the ledger reads for `b[7] = 1/L`, which the code writes as
      // `rhs[7] += −h τ / L` [R], so the torque that multiplies it is **−τ** (§10's own note).
      //
      // `push` is the model's own body-push row (`yawRows`: `torque / hh` with `push[2] -= m g`), recovered from the
      // plant's own numbers rather than re-derived, and it enters the side slot because that is where the game puts a
      // lateral force on the board. The ankle's cop torque goes in the ankle slot alone, which is where
      // `coupleStanding` puts it and what 3.3m verified.

      // --- 8. step 3.3p: FORCE against FORCE. The model's own three water loads from the twelve derivatives read at
      // a state, against the game's own per-source totals — no inertia, no mass matrix and no solve in between, so
      // this separates "the derivatives are wrong" from "the denominator is wrong" with nothing in common between
      // the two sides but the state.
      const loads = (yy: YawPlant, phi: number) => ({
        k: yy.heelRoll * phi + yy.slipRoll * x[5] + yy.yawRoll * x[4] + yy.rollDamping * x[1],
        y: yy.heelSide * phi + yy.slipSide * x[5] + yy.yawSide * x[4] + yy.rollRateSide * x[1],
        n: yy.heelYaw * phi + yy.slipYaw * x[5] + yy.yawDamping * x[4] + yy.rollRateYaw * x[1],
      });
      const mk = loads(y, x[0]);
      // The model's own φ is `−roll` in radians by instrument 1's identity, so the heel against the water in the
      // same sign is `−rail`.
      const mkRail = loads(y, -rail / DEG);
      // The game's own: the ten water sources of each ledger. `modelY` is the board's right, which is the opposite of
      // the probe's own `sideV` (the board's +x, its left), and `nGame`'s sign flips with it.
      let waterK = Number.NaN;
      let waterY = Number.NaN;
      let waterN = Number.NaN;
      if (BoardBody.rollLedger) {
        const rl = board.roll;
        waterK = rl.buoyancy + rl.pressure + rl.addedMass + rl.radiation + rl.friction + rl.bed + rl.fins + rl.rails + rl.froth + rl.suction;
        const yl = board.yaw;
        waterN = -(yl.buoyancy + yl.pressure + yl.addedMass + yl.radiation + yl.friction + yl.bed + yl.fins + yl.rails + yl.froth + yl.suction);
        const fo = board.forces;
        waterY = -(fo.buoyancy.dot(sideV) + fo.pressure.dot(sideV) + fo.addedMass.dot(sideV) + fo.radiation.dot(sideV)
          + fo.friction.dot(sideV) + fo.bed.dot(sideV) + fo.fins.dot(sideV) + fo.rails.dot(sideV) + fo.froth.dot(sideV)
          + fo.suction.dot(sideV));
      }

      // **The signs, read rather than assumed.** `rollAxis` is + rolling the deck toward the board's +x, which is the
      // probe's + roll and so the model's **−φ** [R, bankLedger's own datum paragraph + instrument 1's identity];
      // `across` is + toward the board's +x, so the model's **−y**; `up` is + turning the nose toward the board's +x,
      // so the model's **−r**. Each of the three corners therefore carries two sign flips — one on the force, one on
      // the response — and **comes out positive**. The ankle's column is the response to `b[7] = 1/L` where the code
      // writes `rhs[7] += −h τ_game / L` and the model's ankle torque is `−τ_game`, so it enters as `−τ_model`.
      // The diagonal-only read below is the control that says these signs are right: it must reproduce the model's
      // own `K / boardRollInertia` within the 0.75–1.18 the two inertias differ by.
      const ankleTorqueModel = y.ankleStiffness * (x[2] - x[0] - x[8]) + y.ankleDamping * (x[3] - x[1]);
      // The body's weight across at the feet — and **only** that. The model's own `push` also carries `τ_ankle / h`,
      // the horizontal force at the feet the ankle's torque implies; the game books the ankle on row 7 alone and lets
      // the constraint carry its reaction [R, `coupleStanding`; 3.3m §2 reading 3], so putting both in would count
      // the ankle twice.
      const pushDerived = -y.mass * 9.81 * x[2];
      const derivedRoll = (ld: { k: number; y: number; n: number }) => (
        bankLedger.rollDeckPer * ld.k
        + bankLedger.sideRollPer * (ld.y + pushDerived)
        + bankLedger.yawRollPer * ld.n
        - bankLedger.ankleDeck * ankleTorqueModel
      ) * DEG;
      const haveC = ledgerLive && bankLedger.rollDeckPer !== 0;
      const rollDerived = haveC ? derivedRoll(mk) : Number.NaN;
      const rollDerivedTilt = haveC ? derivedRoll(mkRail) : Number.NaN;
      const rollDerivedDiag = haveC ? bankLedger.rollDeckPer * mk.k * DEG : Number.NaN;
      const rollModelDiag = (mk.k / y.boardRollInertia) * DEG;

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
      let ratioRollRateTilt = Number.NaN;
      let ratioBankRateTilt = Number.NaN;
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
          // Step 3.3p: the controller's OWN tilt input when it has one (`waterHeel`), so an arm's residual is the
          // residual of the model that arm actually ran and not of the shipped one evaluated on its trajectory.
          const d0 = prev.ownGammaD ? prev.ownGammaD[q] * prev.ownTilt : 0;
          pred[q] = dot(prev.phi[q], prev.x) + prev.gamma[q][0] * prev.u[0] + prev.gamma[q][1] * prev.u[1] + d0;
          predNeg[q] = dot(prev.phi[q], prev.xNeg) + prev.gamma[q][0] * prev.u[0] + prev.gamma[q][1] * prev.u[1] + d0;
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
        // Step 3.3p: the same one-step residual on the tilt plant, off the PREVIOUS tick's own tilt plant, state,
        // command and tilt — the same shape as the shipped plant's above, nothing of this tick in it.
        const predTilt = new Array<number>(n).fill(0);
        for (let q = 0; q < n; q += 1) {
          predTilt[q] = dot(prev.tPhi[q], prev.x) + prev.tGamma[q][0] * prev.u[0] + prev.tGamma[q][1] * prev.u[1]
            + prev.tGammaD[q] * prev.tiltRad;
        }
        ratioRollRateTilt = ratio(1, predTilt);
        ratioBankRateTilt = ratio(3, predTilt);
        let acc = 0;
        for (let q = 0; q < n; q += 1) { const sc = prev.scale[q]; acc += ((pred[q] - x[q]) / sc) ** 2; }
        resScaled = Math.sqrt(acc / n);
      }
      // The model's own implied mean acceleration over THIS step, off this tick's own blend and state.
      {
        const own = (row: number) => (d.gammaD ? d.gammaD[row][0] * inner.schedTilt : 0);
        const pr = dot(d.phi[1], x) + d.gamma[1][0] * u[0] + d.gamma[1][1] * u[1] + own(1);
        const pb = dot(d.phi[3], x) + d.gamma[3][0] * u[0] + d.gamma[3][1] * u[1] + own(3);
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
        tPhi: tp.phi.map((row) => row.slice()),
        tGamma: tp.gamma.map((row) => row.slice()),
        tGammaD: tp.gammaD.slice(),
        tiltRad,
        ownGammaD: d.gammaD ? d.gammaD.map((row) => row[0]) : null,
        ownTilt: inner.schedTilt,
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
        schedTilt: inner.schedTilt * DEG,
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
        // Step 3.3p: the game's own effective inertias, each the reciprocal of a unit read off its own `A⁻¹`. The
        // ledger's unit rows are means over the substeps the body banked through, so a frame with none reads NaN
        // rather than a reciprocal of zero.
        swayMassGame: ledgerOn && bankLedger.sideSwayPer !== 0 ? 1 / bankLedger.sideSwayPer : Number.NaN,
        swayMassModel: y.boardMass,
        swayMassRigid: ledgerOn && bankLedger.sideSwayRigid !== 0 ? 1 / bankLedger.sideSwayRigid : Number.NaN,
        rollInertiaGame: ledgerOn && bankLedger.rollDeckPer !== 0 ? 1 / bankLedger.rollDeckPer : Number.NaN,
        rollInertiaModel: y.boardRollInertia,
        yawInertiaGame: ledgerOn && bankLedger.yawPer !== 0 ? 1 / bankLedger.yawPer : Number.NaN,
        yawInertiaModel: y.boardYawInertia + y.riderYawInertia,
        sideRollGame: ledgerOn ? bankLedger.sideRollPer : Number.NaN,
        rollSwayGame: ledgerOn ? bankLedger.rollSwayPer : Number.NaN,
        sideRelativeGame: ledgerOn ? bankLedger.sideRelativePer : Number.NaN,
        swayMassFrozen: ledgerOn && bankLedger.sideSwayFrozen !== 0 ? 1 / bankLedger.sideSwayFrozen : Number.NaN,
        kGame: waterK,
        yGame: waterY,
        nGame: waterN,
        kModel: mk.k,
        yModel: mk.y,
        nModel: mk.n,
        kModelRail: mkRail.k,
        yModelRail: mkRail.y,
        nModelRail: mkRail.n,
        tilt,
        rollAccTilt: rollTilt * DEG,
        bankAccTilt: bankTilt * DEG,
        relTilt: relOf(rollTilt * DEG, rollGame),
        relBankTilt: relOf(bankTilt * DEG, bankGame),
        rollSignTilt: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? (Math.sign(rollTilt) === Math.sign(rollGame) ? 1 : 0) : Number.NaN,
        bankSignTilt: Number.isFinite(bankGame) && Math.abs(bankGame) > 1e-9 ? (Math.sign(bankTilt) === Math.sign(bankGame) ? 1 : 0) : Number.NaN,
        ratioRollRateTilt,
        ratioBankRateTilt,
        rollAccTiltRail: rollTiltRail * DEG,
        relTiltRail: relOf(rollTiltRail * DEG, rollGame),
        relBankTiltRail: relOf(bankTiltRail * DEG, bankGame),
        rollSignTiltRail: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? (Math.sign(rollTiltRail) === Math.sign(rollGame) ? 1 : 0) : Number.NaN,
        rollAccDerived: rollDerived,
        relDerived: relOf(rollDerived, rollGame),
        rollSignDerived: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 && Number.isFinite(rollDerived) ? (Math.sign(rollDerived) === Math.sign(rollGame) ? 1 : 0) : Number.NaN,
        rollAccDerivedTilt: rollDerivedTilt,
        relDerivedTilt: relOf(rollDerivedTilt, rollGame),
        rollSignDerivedTilt: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 && Number.isFinite(rollDerivedTilt) ? (Math.sign(rollDerivedTilt) === Math.sign(rollGame) ? 1 : 0) : Number.NaN,
        rollAccDerivedDiag: rollDerivedDiag,
        rollAccModelDiag: rollModelDiag,
        condModel: Math.abs(rollAll) > 1e-12 ? Math.max(Math.abs(gm.waterSide), Math.abs(gm.waterRoll), Math.abs(gm.ankle), Math.abs(mRest)) / Math.abs(rollAll) : Number.NaN,
        condGame: ledgerOn && Math.abs(rollGame) > 1e-9 ? Math.max(Math.abs(gWater + gBoard), Math.abs(gRider)) / Math.abs(rollGame) : Number.NaN,
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
  BoardBody.rollLedger = false;
  BoardBody.yawLedger = false;

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
    waterHeel: WHEEL ?? 'level',
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
    schedTiltMed: r(median(absCol(live, 'schedTilt')), 3),
    schedTiltPeak: r(peak(absCol(live, 'schedTilt')), 3),
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
    // --- step 3.3p: the game's own inertias against the model's
    swayMassGameMed: r(median(col(live, 'swayMassGame')), 3),
    swayMassGameSpanLo: r(sorted(col(live, 'swayMassGame'))[0] ?? Number.NaN, 3),
    swayMassGamePeak: r(peak(col(live, 'swayMassGame')), 3),
    swayMassModelMed: r(median(col(live, 'swayMassModel')), 3),
    swayMassRigidMed: r(median(col(live, 'swayMassRigid')), 3),
    swayRatioMed: r(median(live.map((xx) => xx.swayMassGame / xx.swayMassModel).filter(Number.isFinite)), 3),
    rollInertiaGameMed: r(median(col(live, 'rollInertiaGame')), 4),
    rollInertiaModelMed: r(median(col(live, 'rollInertiaModel')), 4),
    rollRatioMed: r(median(live.map((xx) => xx.rollInertiaGame / xx.rollInertiaModel).filter(Number.isFinite)), 3),
    yawInertiaGameMed: r(median(col(live, 'yawInertiaGame')), 4),
    yawInertiaModelMed: r(median(col(live, 'yawInertiaModel')), 4),
    yawRatioMed: r(median(live.map((xx) => xx.yawInertiaGame / xx.yawInertiaModel).filter(Number.isFinite)), 3),
    sideRollGameMed: r(median(col(live, 'sideRollGame')), 6),
    rollSwayGameMed: r(median(col(live, 'rollSwayGame')), 6),
    sideRelativeGameMed: r(median(col(live, 'sideRelativeGame')), 6),
    swayMassFrozenMed: r(median(col(live, 'swayMassFrozen')), 3),
    rigidSingular: bankLedger.rigidSingular,
    crossSym: r(peak(live.map((xx) => Math.abs(xx.sideRollGame - xx.rollSwayGame))), 15),
    // --- step 3.3p: force against force
    tiltMed: r(median(absCol(live, 'tilt')), 2),
    kGameMed: r(median(absCol(live, 'kGame')), 1),
    kModelMed: r(median(absCol(live, 'kModel')), 1),
    kModelRailMed: r(median(absCol(live, 'kModelRail')), 1),
    kRatioMed: r(median(live.map((xx) => (Math.abs(xx.kGame) > 1e-6 ? xx.kModel / xx.kGame : Number.NaN)).filter(Number.isFinite)), 3),
    kRatioRailMed: r(median(live.map((xx) => (Math.abs(xx.kGame) > 1e-6 ? xx.kModelRail / xx.kGame : Number.NaN)).filter(Number.isFinite)), 3),
    kAbsRatioMed: r(median(live.map((xx) => (Math.abs(xx.kGame) > 1e-6 ? Math.abs(xx.kModel / xx.kGame) : Number.NaN)).filter(Number.isFinite)), 3),
    kSignRight: r(share(live.filter((xx) => Math.abs(xx.kGame) > 1e-6 && Math.abs(xx.kModel) > 1e-6).map((xx) => Math.sign(xx.kModel) === Math.sign(xx.kGame))), 3),
    yGameMed: r(median(absCol(live, 'yGame')), 1),
    yModelMed: r(median(absCol(live, 'yModel')), 1),
    yModelRailMed: r(median(absCol(live, 'yModelRail')), 1),
    yAbsRatioMed: r(median(live.map((xx) => (Math.abs(xx.yGame) > 1e-6 ? Math.abs(xx.yModel / xx.yGame) : Number.NaN)).filter(Number.isFinite)), 3),
    ySignRight: r(share(live.filter((xx) => Math.abs(xx.yGame) > 1e-6 && Math.abs(xx.yModel) > 1e-6).map((xx) => Math.sign(xx.yModel) === Math.sign(xx.yGame))), 3),
    nGameMed: r(median(absCol(live, 'nGame')), 1),
    nModelMed: r(median(absCol(live, 'nModel')), 1),
    nAbsRatioMed: r(median(live.map((xx) => (Math.abs(xx.nGame) > 1e-6 ? Math.abs(xx.nModel / xx.nGame) : Number.NaN)).filter(Number.isFinite)), 3),
    nSignRight: r(share(live.filter((xx) => Math.abs(xx.nGame) > 1e-6 && Math.abs(xx.nModel) > 1e-6).map((xx) => Math.sign(xx.nModel) === Math.sign(xx.nGame))), 3),
    // --- step 3.3p: the tilt plant, scored on 3.3o's own rows
    relTiltMed: r(median(absCol(live, 'relTilt')), 3),
    relBankTiltMed: r(median(absCol(live, 'relBankTilt')), 3),
    rollSignTiltShare: r(shareOf(live, 'rollSignTilt'), 3),
    bankSignTiltShare: r(shareOf(live, 'bankSignTilt'), 3),
    ratioRollRateTiltMed: r(median(col(live, 'ratioRollRateTilt')), 3),
    ratioBankRateTiltMed: r(median(col(live, 'ratioBankRateTilt')), 3),
    aboveOneRollRateTilt: r(aboveOne(live, 'ratioRollRateTilt'), 3),
    aboveOneBankRateTilt: r(aboveOne(live, 'ratioBankRateTilt'), 3),
    relTiltRailMed: r(median(absCol(live, 'relTiltRail')), 3),
    relBankTiltRailMed: r(median(absCol(live, 'relBankTiltRail')), 3),
    rollSignTiltRailShare: r(shareOf(live, 'rollSignTiltRail'), 3),
    relDerivedMed: r(median(absCol(live, 'relDerived')), 3),
    rollSignDerivedShare: r(shareOf(live, 'rollSignDerived'), 3),
    relDerivedTiltMed: r(median(absCol(live, 'relDerivedTilt')), 3),
    rollSignDerivedTiltShare: r(shareOf(live, 'rollSignDerivedTilt'), 3),
    derivedDiagRatioMed: r(median(live.map((xx) => (Math.abs(xx.rollAccModelDiag) > 1e-9 ? xx.rollAccDerivedDiag / xx.rollAccModelDiag : Number.NaN)).filter(Number.isFinite)), 3),
    condModelMed: r(median(col(live, 'condModel')), 2),
    condGameMed: r(median(col(live, 'condGame')), 2),
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

// **`Number(null) === 0`** — this folder's own trap, and step 3.3o's summary lines walked into it: `r()` returns
// `null` for a run whose column has no live tick, `Number(null)` is 0, and 0 passes `Number.isFinite`, so every arm
// with a dead run had a spurious 0.000 at the bottom of every span. The `.jsonl` was always right; the printed spans
// were not. Null is dropped before the cast here, and `typeof` is the test rather than a falsy check, so a genuine 0
// still counts.
const num = (k: string) => rows.map((x) => x[k]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
const sh = (k: string) => span(num(k), 3);
process.stdout.write(`\n# step 3.3p — the internal plant against the game, ${rows.length} runs, ${RIDER} rider, ${FELT ?? 'world'} filter, ledger ${LEDGER}, heel ${WHEEL ?? 'level'}\n`);
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
process.stdout.write(`# P6 (3.3p) the game's own inertias off its own A⁻¹, per-run medians over the arm:\n`);
process.stdout.write(`#    sway mass GAME ${sh('swayMassGameMed')} kg (lo ${sh('swayMassGameSpanLo')}, peak ${sh('swayMassGamePeak')}) vs MODEL ${sh('swayMassModelMed')}; ratio ${sh('swayRatioMed')}\n`);
process.stdout.write(`#    the bank row welded ${sh('swayMassRigidMed')} kg | EVERYTHING but translation welded (P0c) ${sh('swayMassFrozenMed')} kg — must read the masses SUMMED; singular ${sh('rigidSingular')}\n`);
process.stdout.write(`#    A is symmetric: |side→roll − roll→sway| peak ${sh('crossSym')}\n`);
process.stdout.write(`#    roll inertia GAME ${sh('rollInertiaGameMed')} kg·m² vs MODEL ${sh('rollInertiaModelMed')}; ratio ${sh('rollRatioMed')}\n`);
process.stdout.write(`#    yaw inertia GAME ${sh('yawInertiaGameMed')} kg·m² vs MODEL ${sh('yawInertiaModelMed')}; ratio ${sh('yawRatioMed')}\n`);
process.stdout.write(`#    cross terms: side→roll ${sh('sideRollGameMed')} rad/s per N·s, roll→sway ${sh('rollSwayGameMed')} m/s per N·m·s, side→Δu̇/L ${sh('sideRelativeGameMed')}\n`);
process.stdout.write(`# P7 (3.3p) FORCE against FORCE, the twelve derivatives at the state vs the game's own water, no inertia between:\n`);
process.stdout.write(`#    roll moment K: model ${sh('kModelMed')} N·m vs game ${sh('kGameMed')}; |ratio| ${sh('kAbsRatioMed')}, signed ${sh('kRatioMed')}, sign right ${sh('kSignRight')}\n`);
process.stdout.write(`#    … with the heel against the WATER instead of the world's level: model ${sh('kModelRailMed')} N·m, signed ratio ${sh('kRatioRailMed')} (face tilt ${sh('tiltMed')}°)\n`);
process.stdout.write(`#    side force Y: model ${sh('yModelMed')} N vs game ${sh('yGameMed')}; |ratio| ${sh('yAbsRatioMed')}, sign right ${sh('ySignRight')} | at the water's heel ${sh('yModelRailMed')} N\n`);
process.stdout.write(`#    yaw moment N: model ${sh('nModelMed')} N·m vs game ${sh('nGameMed')}; |ratio| ${sh('nAbsRatioMed')}, sign right ${sh('nSignRight')}\n`);
process.stdout.write(`# P8 (3.3p) the TILT plant — the water's own terms at the heel against the WATER, the tilt a measured input:\n`);
process.stdout.write(`#    roll row rel err ${sh('relTiltMed')} against shipped ${sh('rollRelMed')}; sign right ${sh('rollSignTiltShare')} against ${sh('rollSignRight')}\n`);
process.stdout.write(`#    lean row rel err ${sh('relBankTiltMed')} against shipped ${sh('bankRelMed')}; sign right ${sh('bankSignTiltShare')} against ${sh('bankSignRight')}\n`);
process.stdout.write(`#    one-step ratios: roll rate ${sh('ratioRollRateTiltMed')} against ${sh('ratioRollRateMed')}; bank rate ${sh('ratioBankRateTiltMed')} against ${sh('ratioBankRateMed')}\n`);
process.stdout.write(`#    share above 1: roll ${sh('aboveOneRollRateTilt')} against ${sh('aboveOneRollRate')}; bank ${sh('aboveOneBankRateTilt')} against ${sh('aboveOneBankRate')}\n`);
process.stdout.write(`#    tilt AND the measured rail together: roll ${sh('relTiltRailMed')} lean ${sh('relBankTiltRailMed')}, roll sign ${sh('rollSignTiltRailShare')}\n`);
process.stdout.write(`# P9 (3.3p) the DERIVED plant's ceiling — the model's own forces through the GAME's own 4x4 compliance:\n`);
process.stdout.write(`#    roll row rel err ${sh('relDerivedMed')} against shipped ${sh('rollRelMed')}; sign right ${sh('rollSignDerivedShare')} against ${sh('rollSignRight')}\n`);
process.stdout.write(`#    with the water's heel at the water too: rel err ${sh('relDerivedTiltMed')}, sign right ${sh('rollSignDerivedTiltShare')}\n`);
process.stdout.write(`#    the mapping's own control, diagonal only / the model's K over its own I_roll: ${sh('derivedDiagRatioMed')} (must sit in 0.75-1.18, the two inertias' own ratio)\n`);
process.stdout.write(`# P10 (3.3p) the roll row's CONDITIONING — its largest single term over the net it produces:\n`);
process.stdout.write(`#    in the model ${sh('condModelMed')}x, in the GAME ${sh('condGameMed')}x\n`);
