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
 * `WHEEL=tilt|predict|ref` (step 3.3p's switch with step 3.4e's fourth cell), `MOUNTA=deck|felt|both` (step 3.4e's
 * switch), `OUT`, `TRACE`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { bankLedger, BANK_SOURCES, type BankSource } from '../../../../src/physics/bankLedger';
import { CONTROL_STEP, DEFAULT_WEIGHTS, type DesignWeights, PredictiveController, bodyInertiaAt, captureOmega, continuousPlant, costWeights, design, discretise, heelColumn, plantAt, railLimit, steadyTurn } from '../../../../src/physics/predictiveBalance';
import { lateralCompliance, type RiderBody, type TwistPlant, type YawPlant } from '../../../../src/physics/rollModel';

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
/**
 * `WHEEL=tilt|predict|ref`: step 3.3p's shipped switch with step 3.4e's fourth cell added, so the arm that rides it is
 * the same probe on the same cells. `tilt` is the datum in BOTH places (the forward prediction and the reference's own
 * steady turn), `predict` the prediction alone, `ref` (step 3.4e) the reference alone.
 */
const WHEEL = process.env.WHEEL === 'tilt' ? 'tilt' : process.env.WHEEL === 'predict' ? 'predict'
  : process.env.WHEEL === 'ref' ? 'ref' : undefined;
/**
 * **Step 3.4e's switch**: `MOUNTA=deck|felt|both` rides `?mountAgree`, the mount made to agree with its own stated
 * argument — the standing body square to the deck at ANY entry speed (`deck`), the felt vertical's low pass seeded at
 * the face's own normal (`felt`), or both. Unset, the mount is the one that ships and every arm is step 3.4d's own
 * probe on step 3.4d's own cells.
 */
const MOUNTA = process.env.MOUNTA === 'deck' ? 'deck' : process.env.MOUNTA === 'felt' ? 'felt'
  : process.env.MOUNTA === 'both' ? 'both' : undefined;
/** `LEDGER=off`: the purity arm — the ride with the ledger not turned on, so "the ledger changes nothing" is read. */
const LEDGER = process.env.LEDGER === 'off' ? 'off' : 'on';
/**
 * **Step 3.4a's switch**: `BODY=two|control|symmetric` rides the two-body plant, so the ridden arm is the same probe
 * on the same cells. Unset, every arm is step 3.3p's own probe on step 3.3p's own cells, and the three counterfactual
 * body plants below are still scored on the SHIPPED ride, which is the apples-to-apples comparison.
 */
const BODY = process.env.BODY === 'two' ? 'two' : process.env.BODY === 'control' ? 'control'
  : process.env.BODY === 'symmetric' ? 'symmetric' : undefined;
/**
 * `BODYJ=<x>`: the `Two` plant's own inertia as a multiple of the sourced one, so the lean row's gain can be read as a
 * function of the body's inertia instead of at one value. Unset, the sourced inertia itself (`bodyInertiaAt`).
 */
const BODYJ = process.env.BODYJ ? Number(process.env.BODYJ) : undefined;
/**
 * **Step 3.4b's switch**: `COST=point|fixed|plant` rides the balance's two optional costs — the bank's cost as each
 * stance's own limit (`feetReach`, step 3.2n) and the capture point's rank-one cost (`captureScale`, step 3.2j),
 * **neither of which the shipped design has** — with the capture point's own ω₀ the point mass's `√(g/L)` (`point`,
 * which is 3.2j's and 3.2n's own design and the control that separates the weights from the constant), the body's own
 * with its feet held (`fixed`), or the plant's own solved rate (`plant`). Unset: the shipped cost function.
 */
const COST = process.env.COST === 'point' ? 'point' : process.env.COST === 'fixed' ? 'fixed'
  : process.env.COST === 'plant' ? 'plant' : undefined;
/**
 * **Step 3.3k's shipped switch, ridden for the first time with `WHEEL` on (step 3.4f)**: `ARANGE=load|wide` rides
 * `?ankleRange`, the bound on the rest the balance may command. Shipped it is `ANKLE_REST_RANGE = 0.25 rad = 14.32°`,
 * which is *"`bankAuthority`'s `restRange` at one body weight on a 0.13 m sole"* — the rest at which the feet's centre
 * of pressure reaches the sole's edge [R, `AttachedRider.ts:408–419`, `:3090–3108`]. `'wide'` doubles it to ±28.65°.
 * **Step 3.4f needs it because that bound is exactly where the datum's two halves land**: with both on, the command
 * the loop asks for at frame 1 is 0.353–0.579 rad, 1.4–2.3 × the bound, and the arm the owner would ride has the
 * ankle pinned on it for the mount's first seven frames. `ARANGE` is the one switch that separates "the correction is
 * too big" from "the correction does not fit through the ankle".
 */
const ARANGE = process.env.ARANGE === 'load' ? 'load' : process.env.ARANGE === 'wide' ? 'wide' : undefined;
/**
 * **Step 3.4i: `BANKC=off` lifts the 70° clamp on the MEASURED bank** (`AttachedRiderOptions.bankClamp`, the
 * `?bankClamp=off` dev switch). The clamp is on a *reading* — how far the body's centre of mass leans over its feet —
 * and that reading is the datum for the ankle's own spring and for the body's frame, so lifting it changes the ride.
 * Unset, the clamp ships. The counterpart column `bankRaw` is recorded with the clamp ON as well, by the rider itself,
 * and changes nothing: that is how §A reads the fall mix on a byte-identical rider.
 */
const BANKC = process.env.BANKC === 'off' ? 'off' : undefined;
/**
 * **Step 3.4c's two switches**, both off by default, so every arm with them unset is step 3.4b's own probe on
 * step 3.4b's own cells.
 *
 * `TICKS=<path>`: append one row per live control tick to a `.jsonl`, with the state the tick was taken at, the roll
 * row's own two halves and the roll row's matched per-source gaps — the file the stratified (matched-state) comparison
 * across gain arms is read from. Nothing about the ride changes; it is a dump of columns already computed.
 *
 * `GAINS=1`: the round's own block. At each tick it rebuilds the design at the controller's **exact** point with each
 * of the four cost arms' weights, and from each one's `k` reconstructs **the command that arm would have sent at this
 * very state** — `ref.u − b̂ − K (x̂ − ref.x)`, the controller's own line, with the ankle's own clamp. The gains enter
 * the roll row only through `Γ[1]·u`, so `Γ[1]·(u' − u)` is **exactly** how much another gain set could move the
 * model's roll row without moving the trajectory. It costs four `design()` calls a tick, so it is a switch.
 */
const TICKS = process.env.TICKS;
const GAINS = process.env.GAINS === '1';
/**
 * **Step 3.4d's two switches**, both off by default, so every arm with them unset is step 3.4c's own probe on
 * step 3.4c's own cells.
 *
 * `MOUNT=<path>`: append one row **per FRAME from frame 1** to a `.jsonl` — not per live control tick. Every window
 * in this folder since step 3.3k begins at `t > 0.2` ("the placement's contact transient", the filter below), so
 * **the mount's own first twelve frames have never been inside a published number**, and step 3.4c's step-four
 * item 1 asks for exactly them. The row carries what the mount sets and how long each of its settings takes to
 * settle: the predictor's own tick count, the length of its sense line and whether its filter has started
 * (`senses.length > steps`), its estimate of the two angles and its command bias, the reference it holds, the felt
 * vertical the capture point is read from (`pairFresh` sets it to the WORLD's gravity on the first loaded substep and
 * low-passes it over `SPECIFIC_FORCE_TIME` [R]), the ankle's lagged rest, the board's own heel against the water
 * beside the face's tilt under it, and the game's own roll row off the ledger. Nothing about the ride changes.
 *
 * `PLACE=level`: **the mount's own positive control.** The shipped placement builds the board's up axis from the
 * **water's normal** (`board.place` below, the basis `(left, normal, forward)`), so at frame 1 the board is flush
 * with the face: its heel against the water is ~0° while its roll from the WORLD's level — the angle the model's
 * water terms are read at [R] — is the face's whole tilt. `PLACE=level` builds the same basis from the **world's**
 * vertical, at the same position, the same heading and the same entry speed, so `roll = 0` and the real heel is
 * `−tilt`. It changes the probe's own placement and nothing under `src/`; it is the instrument for which half of the
 * first second's error is the mount's own geometry, and the rider is expected to fall sooner on it.
 */
const MOUNT = process.env.MOUNT;
const PLACE = process.env.PLACE === 'level' ? 'level' : 'flush';
/** The four cost arms' own weight sets, named, for `GAINS`. `off` is the shipped cost function. */
const COST_ARMS: { key: string; w: DesignWeights }[] = [
  { key: 'off', w: DEFAULT_WEIGHTS },
  { key: 'point', w: { ...DEFAULT_WEIGHTS, ...costWeights('point') } },
  { key: 'fixed', w: { ...DEFAULT_WEIGHTS, ...costWeights('fixed') } },
  { key: 'plant', w: { ...DEFAULT_WEIGHTS, ...costWeights('plant') } },
];
/** The three body plants scored as counterfactuals on every ride, whatever `BODY` is. */
const BODIES: { key: 'Ctl' | 'Sym' | 'Two'; body: RiderBody | true }[] = [
  { key: 'Ctl', body: { inertia: 0, feetRoll: false } },
  { key: 'Sym', body: { inertia: 0 } },
  { key: 'Two', body: true },
];

type Stance = 'tall' | 'crouch' | 'compress';
/** The three stances' own depths in `STANCE_TABLE`, so an ω₀ can be read at the stance the run held. */
const STANCE_DEPTH: Record<Stance, number> = { tall: 0, crouch: 0.195, compress: 0.3 };
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
  /** Step 3.4f: the arm's OWN design weights, so the cancellation's design is the arm's and not a guess at it. */
  weights?: DesignWeights;
}

/** `AttachedRider`'s own privates this probe reads, each named rather than reached for anonymously. */
interface RiderInner {
  ankleRest: number;
  ankleRoom: number;
  ankleBite: number;
  heldAnkleRaw: number;
  leanAsked: number;
  /** Step 3.4f: the twist asked for, rad — the second of the two angles `steadyTurn` is handed [R, `:3564`]. */
  twistAsked: number;
  /** Step 3.3p: the tilt the controller was handed, rad, in the model's own sign (0 unless `waterHeel`). */
  schedTilt: number;
  /** The rail the schedule was read at, rad — `min(SCHEDULE_RAIL_CAP, …)` of the lean ASKED for, not the board's rail. */
  schedRail: number;
  /**
   * Step 3.4d: the felt specific force the capture point and the body's rest are read from, m/s², low-passed over
   * `SPECIFIC_FORCE_TIME` and **set to the world's gravity on the first loaded substep** (`pairFresh`) [R]. On the
   * deck's own axes with `feltFrame: 'deck'`, which every arm of this round rides.
   */
  pairFelt: { x: number; y: number; z: number };
  /** Step 3.4i: the leg's own length, m — the lever every moment in the bank ledger's N·m view is taken at. */
  legLength: number;
  /** Step 3.4i: the ankle's own torque as the solve got it, N·m (bounded only with `ankleLimit: 'feet'`). */
  ankleTorque: number;
  /** Step 3.4i: the load through the legs along the body's own up, N — `soleBound`'s own first factor. */
  legLoad: number;
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
/**
 * Step 3.4c: the rider sources the model's own `ankle` and `twist` groups do NOT name, which are what its named
 * remainder (`mRest`) must answer for. A partition of `RIDER_SOURCES` with those two removed, built by filtering so
 * that a source added to `BANK_SOURCES` later lands here rather than being dropped silently.
 */
const REST_SOURCES: BankSource[] = RIDER_SOURCES.filter((s) => s !== 'ankle' && s !== 'twist');

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
  /** Step 3.3p: the tilt the controller was handed, °, in the model's own sign (0 unless `waterHeel` is on). */
  schedTilt: number;
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

  // --- step 3.4a: the two-body rider, as three counterfactual plants on the shipped ride.
  /** The control's own number: the largest entry of the control plant's own A against the shipped plant's, over its row's largest. */
  ctlOff: number;
  rollAccCtl: number; bankAccCtl: number; relCtl: number; relBankCtl: number;
  rollAccSym: number; bankAccSym: number; relSym: number; relBankSym: number; rollSignSym: number; bankSignSym: number;
  rollAccTwo: number; bankAccTwo: number; relTwo: number; relBankTwo: number; rollSignTwo: number; bankSignTwo: number;
  ratioRollRateCtl: number; ratioRollRateSym: number; ratioRollRateTwo: number;
  ratioBankRateCtl: number; ratioBankRateSym: number; ratioBankRateTwo: number;
  /** The force at the feet, N: the shipped plant's own `τ / h − m g θ`, the two-body plant's `m a_m` outcome, and the control's. */
  footShipped: number; footTwo: number; footCtl: number; footRatio: number; footCtlOff: number;
  /** The two-body plant's own four lateral reads, off `lateralCompliance` — the four the ledger publishes for the game. */
  jTwo: number; swayMassTwo: number; swayMassCtl: number; rollInertiaTwo: number; yawInertiaTwo: number;
  sideRollTwo: number; sideRollCtl: number; crossSymTwo: number;
  /** The shipped plant at the controller's own exact point, so the control is exact and the blend is separated out. */
  rollAccFull: number; bankAccFull: number; relFull: number; relBankFull: number; rollSignFull: number; bankSignFull: number;
  /** The groups on the two-body plant, °/s², its closure, its own pendulum term and its own conditioning. */
  mWaterSideTwo: number; mWaterRollTwo: number; mAnkleTwo: number; mRestTwo: number;
  mWaterAllTwo: number; mRiderAllTwo: number; bWaterSideTwo: number; bAnkleTwo: number; bRestTwo: number;
  mCloseTwo: number; bCloseTwo: number; mPendulumTwo: number; condTwo: number;
  /** The body's weight on its own lean, SOLVED, in both plants; the bank inertia each meets; the ankle's own authority. */
  pendSolvedCtl: number; gGravityOwn: number; bankInertiaTwo: number; bankInertiaCtl: number;
  ankleBankTwo: number; ankleBankCtl: number; ankleBankGame: number;

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

  // --- 12. step 3.4c: the roll row PER SOURCE, and the two halves of the model's own row ---
  /**
   * **The game's own roll row per source**, °/s², signed, in the model's own sign (`−deck[src] · DEG`): all
   * twenty-three of `BANK_SOURCES`, so "per source" is the ledger's own partition and not a grouping I chose. Their
   * sum is `rollAccGame` to the ledger's own closure (`gDeckClose` below is that read, not asserted).
   */
  gDeck: Record<BankSource, number>;
  /** `|Σ_src gDeck − rollAccGame| / |rollAccGame|`: the ledger's partition of the roll row, read. */
  gDeckClose: number;
  /**
   * **The model's own roll row split into the half the gains can reach and the half they cannot.** The row is
   * `(Φ[1]·x + Γ[1]·u − φ̇)/h`, so the command's own half is `(Γ[1]·u)/h` exactly and the state's is the rest.
   * **The cost weights enter `design` only through `k` [R], so `Γ` is the same matrix in every cost arm and
   * `rollCmd` is the WHOLE of the gains' reach into the roll row at a fixed state.**
   */
  rollCmd: number;
  rollState: number;
  /** `|rollCmd|` over the model's own row and over the game's own row: the loop's ceiling, both denominators printed. */
  cmdShareModel: number;
  cmdShareGame: number;
  /**
   * **The matched per-source gaps on the roll row**, °/s², signed, model minus game, each at the controller's own
   * exact point (so they sum to `rollAccFull − rollAccGame`, not to the blend's row):
   * - `eWater` — the model's twelve captive derivatives (`waterRoll + waterYaw + waterSide`) against the ledger's
   *   hull, foils, froth and added mass **plus** the board's own weight and gyro (`gWater + gBoard`), because the
   *   model has no separate term for either and its water terms are what must answer for them.
   * - `eAnkle` — the model's `ankle` group (the spring and the damper, both the state's part and the command's,
   *   since `without('ankle')` zeroes both) against the ledger's `ankle` source.
   * - `eTwist` — the model's `twist` group against the ledger's `twist`.
   * - `eRest` — the model's named remainder (gravity through the feet, the pendulum's `g/L`, the inertias, the pure
   *   kinematics) against every rider source the two above do not name: `gravity`, `carry`, `riderWater`, `assist`,
   *   `leg`, `swing`, `hand`, `pitch`, `drive`, `limbs`, `yawCouple`.
   * - `eFeetFwd` — the model's `feetForward` group, which has **no ledger source at all**, so it is its own gap and
   *   is reported as unmatched rather than folded into `eRest`.
   */
  eWater: number;
  eAnkle: number;
  eTwist: number;
  eRest: number;
  eFeetFwd: number;
  /** The game's side of the four, °/s² signed, so a ratio is never taken against a number that is not printed. */
  gWaterBoard: number;
  gAnkleSrc: number;
  gTwistSrc: number;
  gRestSrc: number;
  /** The net error the five are a partition of, °/s² signed, and the closure of that partition, relative. */
  eNet: number;
  eClose: number;
  /** Each gap's share of `|eNet|`: which source owns the ten times. */
  shWater: number;
  shAnkle: number;
  shTwist: number;
  shRest: number;
  shFeetFwd: number;
  /**
   * The same five gaps on the **two-body** plant, against the same game row on the same tick, so the per-source read
   * has both plants and neither is reported against the other's trajectory (Part 1 §9 reading 3's warning).
   */
  eWaterTwo: number;
  eAnkleTwo: number;
  eTwistTwo: number;
  eRestTwo: number;
  eFeetFwdTwo: number;
  eNetTwo: number;
  eCloseTwo2: number;

  // --- 13. step 3.4c: what another gain set could do to the roll row at THIS state (`GAINS=1`) ---
  /**
   * The reconstruction's own control: `|û₀ − u₀|` over `|u₀|` with the arm's OWN weights at the exact point. It is
   * not expected to be zero — the controller rides its eight-point blend and this is the exact point — and the size
   * of it is the blend's own error on the command, printed beside the counterfactual it bounds.
   */
  cmdRebuild: number;
  /** The peak difference of `Φ` and `Γ` across the four cost arms' designs at this point: P1, the identity, read. */
  gainPlantOff: number;
  /** The peak difference of the model's own roll row across the four arms with the RECORDED command: P1's own row. */
  gainRowOff: number;
  /**
   * `|Γ[1]·(u' − u_off)| / h`, °/s², the largest over the three cost arms: **the whole swing another gain set's
   * command can make in the model's roll row at this very state.** Its ratio to the game's own row is the loop's
   * own measured ceiling on the roll row's error.
   */
  gainRollSwing: number;
  gainSwingShare: number;
  /** The same for the ankle command itself, rad, so the swing is reported in the command as well as in the row. */
  gainCmdSwing: number;
  /**
   * The swing over the NET roll-row error `|eNet|`, which is the quantity the roll row's relative error is built
   * from: **the share of the roll row's own error that another gain set could move without moving the trajectory.**
   */
  gainSwingOverNet: number;
  /** The `point` arm's own swing against the ride's own arm, since that is the pair whose row moved in 3.4b. */
  gainRollSwingPoint: number;
  /** The ankle's own bound at this tick, rad, and whether either command sat on it: the clamp, read not assumed. */
  ankleRoomHere: number;
  gainClamped: number;

  // --- 13b. step 3.4f: the datum's two halves AS THEY ENTER THE COMMAND, at the exact point ---
  /**
   * **The two halves of `DesignWeights.waterHeel`, decomposed where the controller's own last line puts them.**
   * `tick` ends `u_q = ref.u_q − b̂_q − Σ_j K_q[j] (x̂_j − x_ref,j)` [R, `predictiveBalance.ts:1453–1459`], and the
   * tilt reaches it in exactly two places: the **prediction** half adds `Δx̂_i = Σ_{jj<N} predD[jj][i][0] · τ` to
   * the estimate [R, `:1438`], and the **reference** half hands `drive_i = gammaD[i][0] · τ` to `steadyTurn` on the
   * equilibrium's right-hand side [R, `:1442`, `:1261`], which moves `x_ref` and `u_ref` together.
   *
   * So at a **fixed state and a fixed operating point**, writing `u_off` for the shipped command there:
   *
   *     predict:  u_off − K·Δx̂
   *     ref:      u_off + Δu_ref + K·Δx_ref
   *     both:     u_off + Δu_ref + K·Δx_ref − K·Δx̂
   *
   * — `both = predict + ref − off` identically, and **the tilt's whole reach into `both`'s feedback is the
   * DIFFERENCE `K·(Δx_ref − Δx̂)` where each half alone gets one of the two terms undifferenced.** Both are the same
   * input `τ` through the same plant over two horizons (the 0.1 s sensing delay, and the equilibrium), so if they
   * share a sign they subtract.
   *
   * **This is a decomposition at a point, not a trajectory claim.** A moved trim sends different commands and the
   * commands enter the forward prediction, so the two halves are separable in the controller's line and **not**
   * along a trajectory — step 3.4e's own refuted first draft. These columns are read on each arm's own recorded
   * trajectory and are never pooled across arms as if they were one ride.
   *
   * The design is `design(y, t, {...weights, waterHeel: 'both'})` at the controller's own point, so it is the **same
   * function of the operating point on all four arms**; `heelDesignOff` is the measurement that the flag leaves Φ, Γ
   * and the LQR gain alone, rather than the shipped comment's word for it.
   */
  rowTiltPred: number;
  /** The reference half's two pieces, which do not have to agree: the feedforward it moves, and the error it moves. */
  rowTiltRefFF: number;
  rowTiltRefFB: number;
  rowTiltRef: number;
  /** `rowTiltPred + rowTiltRef` — the sum is an identity, so this column IS the cancellation's residue. */
  rowTiltBoth: number;
  /** `|rowTiltBoth| / max(|rowTiltPred|, |rowTiltRef|)`: 1 is no cancellation at all, 0 is exact. */
  cancelShare: number;
  /** The two halves' own shift of the roll state they disagree about, °: the delay's and the equilibrium's. */
  dxHatPhi: number;
  dxRefPhi: number;
  /** The two feedback terms in the ankle's own units, rad, and whether they share a sign (then they subtract). */
  kDxHatA: number;
  kDxRefA: number;
  tiltSameSign: number;
  /** Each half's own command against the ankle's bound at this tick: a half that saturates is a clamped one. */
  predOverRoom: number;
  refOverRoom: number;
  /** C2/C3/C4: the flag's reach into the design, the flat equilibrium's own origin, and `steadyTurn`'s superposition. */
  heelDesignOff: number;
  refFlatOff: number;
  superOff: number;
  /**
   * **The brief's own measurement, per tick: one recorded ride, four sets of gains.** The roll row's relative error
   * at THIS recorded state — the same `x`, the same plant, the same game row — with each cost arm's **own command**
   * substituted, keyed by the arm. The ride's own arm's entry is the row itself (`relFull`) by construction, since
   * every entry is `rollAccFull + Γ[1]·(u_arm − û)` and `û` is the ride's own arm's rebuilt command.
   *
   * **This is the only honest sense in which "the roll row per gain set at a fixed trajectory" exists**: the plant
   * cannot see the gains at all, so the gains reach the row only through `u`, and this substitutes exactly that.
   * The game's side is the recorded one and does **not** respond to the substituted command, so these are not four
   * rides — they are four readings of one tick, and §11 says so.
   */
  relSubst: Record<string, number>;
  /** The same for the body's own lean row, so the round does not report one row and leave the other unmeasured. */
  relSubstBank: Record<string, number>;
  /** Whether the substituted command brings the model's roll row CLOSER to the game's on this tick. */
  substHelps: Record<string, number>;
  /** The two matched sources the command reaches at all, per arm, °/s²: `Γ[1][0]` is the ankle's, `Γ[1][1]` the twist's. */
  eAnkleSubst: Record<string, number>;
  eTwistSubst: Record<string, number>;
  /**
   * **The control on the substitution, and it is the one that stops it being read as more than it is.** The
   * substituted command moves the MODEL's roll row and the game's recorded row stays where it was — but the game's
   * own roll row responds to the commanded ankle rest too, through the same 800 N·m/rad spring the model has
   * (`HUMAN_ANKLE_STIFFNESS` = `YawPlant.ankleStiffness` = 800 [R, two files, one number]). So:
   *
   * **The frame, because the first version of this read was in the wrong one.** `B` is zero in every entry but
   * `B[8][0] = B[9][1] = 1 / lag` [R, `continuousPlant`], so the model's two commands drive **only the two
   * muscle-lag states** and have no instantaneous authority over any row at all. `bZeroOff` below is that read, not
   * an assumption. And the game is the same shape: its own `ankleRest` follows the commanded lean through
   * `MOTOR_LAG = 0.05` s and the model's `PREDICT_LAG` is **0.05 s**, the same first-order lag [R, two files, one
   * number]. So the authority that is comparable on both sides is the one **per radian of the ankle's commanded
   * REST**, with the lag behind it on both sides:
   *
   * - `cmdAuthModelCont` — the model's own, `|A[1][8]|`, the roll-rate row's coefficient on the rest state δ.
   * - `cmdAuthGame` — the game's own, `|ankleDeck × 800|`, where `ankleDeck` is the bank ledger's deck-roll response
   *   to `b[7] = 1/L` (i.e. to τ_game = −1) and 800 N·m/rad is the stiffness the rest acts through —
   *   `HUMAN_ANKLE_STIFFNESS` = `YawPlant.ankleStiffness` = 800, two files, one number [R].
   * - `cmdAuthModel` — the **step-averaged** `|Γ[1][0]| / h`, which is what the substitution actually moves. It is a
   *   different quantity from the two above (`Γ = ∫₀ʰ e^{A s} ds · B` over a step that is short against a 32 rad/s
   *   mode — this folder's own `(Φ − I)/h ≠ A`, on the input side), so it is **printed and never divided by the
   *   game's**. `cmdAuthStep` is its ratio to the model's own instantaneous one, so the two frames are visible.
   *
   * **The two sign conventions do not agree** (3.3p §6 reading 5), so only magnitudes are divided.
   */
  cmdAuthModel: number;
  cmdAuthModelCont: number;
  cmdAuthGame: number;
  cmdAuthRatio: number;
  cmdAuthStep: number;
  /** `max |B[i][j]|` over every input entry but the two lag rows': the read that the commands enter only those. */
  bZeroOff: number;
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
  // Step 3.4d's `PLACE=level`: the mount's own positive control. The axis the board's basis is built from is the
  // water's normal as it ships (`flush`, the board flat on the face) or the WORLD's vertical (`level`, the board
  // level and so really heeled against the face by its whole tilt). Everything else — the position, the heading, the
  // entry speed, the rider — is the same expression it was.
  const up = PLACE === 'level' ? new Vector3(0, 1, 0) : normal;
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(up, -level.dot(up)).normalize();
  const left = new Vector3().crossVectors(up, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(0, here.surfaceY, pz).addScaledVector(up, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, up, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(FELT ? { feltFrame: FELT } : {}),
    ...(WHEEL ? { waterHeel: WHEEL } : {}),
    ...(MOUNTA ? { mountAgree: MOUNTA } : {}),
    ...(BODY ? { riderBody: BODY } : {}),
    ...(COST ? { riderCost: COST } : {}),
    ...(ARANGE ? { ankleRange: ARANGE } : {}),
    ...(BANKC ? { bankClamp: BANKC } : {}),
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
    /** Step 3.4a: the three body plants at the same point, for the one-step residual on each. */
    bPhi: Record<string, number[][]>; bGamma: Record<string, number[][]>;
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

    // **Step 3.4d: the mount's own record, one row a FRAME from frame 1**, outside the control-tick gate below and
    // outside the `t > 0.2` window every published figure in this folder is filtered to. Every column is a read.
    if (MOUNT) {
      const dM = ctl.blendedDesign;
      const eM = ctl.estimate;
      const nM = dM ? dM.phi.length : 0;
      const liveM = bankLedger.on && bankLedger.unitSteps > 0;
      appendFileSync(MOUNT, `${JSON.stringify({
        body: BODY ?? 'point', cost: COST ?? 'off', place: PLACE, stance: st, steer, entryAsked: entry0,
        extra: entry0 === null ? extra : null,
        // Step 3.4e: which datum cell and which mount this arm ran, on every row, so a pooled read cannot mix arms.
        wheel: WHEEL ?? 'off', mount: MOUNTA ?? 'ships', arange: ARANGE ?? 'ships',
        frame: i + 1, t: r(t, 4),
        // what the predictor has: its own ticks, its sense line against the delay it needs, and whether its filter runs
        predTicks: rider.predictor.ticks, senses: ctl.senses.length, steps: dM ? dM.steps : null,
        filterOn: dM ? (ctl.senses.length > dM.steps ? 1 : 0) : 0,
        // the estimate it holds — zeroed by `resetBalance` and not updated until the sense line is longer than the
        // delay [R] — against the state the game is actually in, both in the model's own sign (φ = −roll, θ = −bank)
        estPhi: eM.length ? r(eM[0] * DEG, 4) : null, estTheta: eM.length > 2 ? r(eM[2] * DEG, 4) : null,
        truePhi: r(-roll, 4), trueTheta: r(-bank, 4),
        bias0: eM.length > nM && nM ? r(eM[nM], 6) : null, bias1: eM.length > nM + 1 && nM ? r(eM[nM + 1], 6) : null,
        // the reference it is holding, in degrees, the same signs
        refPhi: r(rider.predictor.reference.x[0] * DEG, 4), refTheta: r(rider.predictor.reference.x[2] * DEG, 4),
        // the felt vertical the capture point and the body's rest are read from, on the deck's own axes with
        // `feltFrame: 'deck'`: its size, and its angle ACROSS the deck, which is the datum the body balances to
        feltMag: r(Math.hypot(inner.pairFelt.x, inner.pairFelt.y, inner.pairFelt.z), 4),
        feltAcross: r(Math.atan2(inner.pairFelt.x, inner.pairFelt.y) * DEG, 4),
        // the geometry: the board's roll from the world's level, the face's tilt under it, its own heel against the
        // water (the difference), the body's bank, and where on the face it is
        roll: r(roll, 4), tilt: r(tilt, 4), rail: r(rail, 4), bank: r(bank, 4),
        speed: r(board.velocity.length(), 4), through: r(through, 4),
        aheadFronts: r((board.position.z - water.crestZ()) / water.front, 4),
        faceFrac: r(water.faceFraction(board.position.z), 4),
        headOff: r(Math.atan2(fwd.x, fwd.z) * DEG, 3),
        // the ankle's lagged rest and the raw command behind it
        ankleRest: r(inner.ankleRest, 6), heldAnkleRaw: r(inner.heldAnkleRaw, 6),
        sent0: r(rider.predictor.sent[0], 6), raw0: r(rider.predictor.raw[0], 6), ankleRoom: r(inner.ankleRoom, 4),
        // the game's own roll row off the ledger, the same sign and scale as every other figure in this folder
        rollGame: liveM ? r(-bankLedger.deckTotal * DEG, 4) : null,
        // **Step 3.4i, Part A: the bank the geometry gives, BEFORE the 70° clamp.** `AttachedRider.bankRaw`, written
        // at the same three sites in `frame` that write `bank.angle`, on the same expression, read by nothing in the
        // game. With the clamp as it ships `|bankRaw| ≥ |bank|` and the two are equal wherever it is not biting.
        bankRaw: r(rider.bankRaw * DEG, 4), bankClamp: BANKC ?? 'ships',
        clampedBank: Math.abs(rider.bankRaw * DEG) > 70.0000001 ? 1 : 0,
        // **Step 3.4i, Part B: the roll budget about the contact, N·m, every term, off the ledger's own partition of
        // the solve's right-hand side** (`bankLedger.moment`, `b[7] · L / dt`; positive leans the body toward the
        // board's +x, the ledger's own datum). `mTotal` is the whole row; `mDiag` is `A[7][7] · x[7] · L / dt`, the
        // only term a single-body budget contains; `mCoup` is every other column of the same row — the stance point's
        // own acceleration under the feet, the budget's inertial term. `mDiag + mCoup = mTotal` identically and
        // `mResid` is the departure. `bd…` are the same sources' moments about `rollAxis` on the BOARD's rows.
        legLen: r(inner.legLength, 5), ankleTau: r(inner.ankleTorque, 4), legLoad: r(inner.legLoad, 2),
        mTotal: liveM ? r(bankLedger.momentTotal, 4) : null,
        mDiag: liveM ? r(bankLedger.diagonal, 4) : null,
        mCoup: liveM ? r(bankLedger.coupling, 4) : null,
        mSplit: liveM ? r(bankLedger.momentSplit, 12) : null,
        mResid: liveM ? r(bankLedger.momentResidual, 12) : null,
        mAnkle: liveM ? r(bankLedger.moment.ankle, 4) : null,
        mGrav: liveM ? r(bankLedger.moment.gravity, 4) : null,
        mRWater: liveM ? r(bankLedger.moment.riderWater, 4) : null,
        mCarry: liveM ? r(bankLedger.moment.carry, 4) : null,
        mSwing: liveM ? r(bankLedger.moment.swing, 4) : null,
        mAssist: liveM ? r(bankLedger.moment.assist, 4) : null,
        mLimbs: liveM ? r(bankLedger.moment.limbs, 4) : null,
        bdTotal: liveM ? r(bankLedger.boardMomentTotal, 4) : null,
        bdBuoy: liveM ? r(bankLedger.boardMoment.buoyancy, 4) : null,
        bdPress: liveM ? r(bankLedger.boardMoment.pressure, 4) : null,
        bdSuct: liveM ? r(bankLedger.boardMoment.suction, 4) : null,
        bdFric: liveM ? r(bankLedger.boardMoment.friction, 4) : null,
        bdFins: liveM ? r(bankLedger.boardMoment.fins, 4) : null,
        bdRails: liveM ? r(bankLedger.boardMoment.rails, 4) : null,
        bdAdded: liveM ? r(bankLedger.boardMoment.addedMass, 4) : null,
        bdGyro: liveM ? r(bankLedger.boardMoment.gyro, 4) : null,
        bdWeight: liveM ? r(bankLedger.boardMoment.weight, 4) : null,
        bdGrav: liveM ? r(bankLedger.boardMoment.gravity, 4) : null,
        bdCarry: liveM ? r(bankLedger.boardMoment.carry, 4) : null,
        bdRWater: liveM ? r(bankLedger.boardMoment.riderWater, 4) : null,
        bdSwing: liveM ? r(bankLedger.boardMoment.swing, 4) : null,
        bdAnkle: liveM ? r(bankLedger.boardMoment.ankle, 4) : null,
        bdYaw: liveM ? r(bankLedger.boardMoment.yawCouple, 4) : null,
        bdTwist: liveM ? r(bankLedger.boardMoment.twist, 4) : null,
        bdFroth: liveM ? r(bankLedger.boardMoment.froth, 4) : null,
        // the two sides of the lean, rad/s², and the plant's own inertias — so the budget's LHS can be built from
        // the measured acceleration and the ledger's attribution read against the moments on the same frame
        ownAcc: liveM ? r(bankLedger.ownTotal, 5) : null,
        relAcc: liveM ? r(bankLedger.relativeTotal, 5) : null,
        deckAcc: liveM ? r(bankLedger.deckTotal, 5) : null,
        bodyHeld: liveM ? r(bankLedger.bodyHeld, 5) : null,
        ankleOwn: liveM ? r(bankLedger.ankleOwn, 8) : null,
        ankleRel: liveM ? r(bankLedger.ankleRelative, 8) : null,
        ankleDeck: liveM ? r(bankLedger.ankleDeck, 8) : null,
        rollDeckPer: liveM ? r(bankLedger.rollDeckPer, 8) : null,
        attached: rider.attached ? 1 : 0, upright: rider.upright ? 1 : 0, phase: rider.phase,
      })}\n`);
    }

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

      // ===== Step 3.4a: the two-body rider, as three counterfactual plants on the SHIPPED ride =====
      // `Ctl` is the assembly with the body's inertia at zero AND the shipped asymmetric coupling, which must
      // reproduce the shipped plant's own rows exactly — the control, measured per tick rather than asserted once.
      // `Sym` is the same point-mass body with the coupling made consistent (the feet feel the board's own roll, the
      // one term the shipped `feet` row omits while its roll row carries the same lever). `Two` is the step: the
      // body's own frontal-plane inertia from de Leva, posed in the game's own stances, so the four lateral
      // accelerations are solved together and **the force at the feet is an outcome of the solve**.
      const bodyPlants: Record<string, { y: YawPlant; t: TwistPlant; a: number[][]; b: number[][]; phi: number[][]; gamma: number[][] }> = {};
      for (const { key, body } of BODIES) {
        // `BODYJ` scales the sourced inertia on the `Two` plant alone, so the sweep is the same arithmetic at another
        // value and the control and the symmetry-only plant are untouched by it.
        const use = key === 'Two' && BODYJ !== undefined
          ? { inertia: BODYJ * bodyInertiaAt(y.mass, depth, y.height) } : body;
        const pp = plantAt(speedUsed, depth, { rail: schedRail, body: use });
        const cc = continuousPlant(pp.y, pp.t);
        const dd = discretise(cc.a, cc.b, CONTROL_STEP);
        bodyPlants[key] = { y: pp.y, t: pp.t, a: cc.a, b: cc.b, phi: dd.phi, gamma: dd.gamma };
      }
      const bodyAcc = (key: string, rowI: number) => meanAcc(bodyPlants[key].phi, bodyPlants[key].gamma, rowI);
      // The control's own number, per tick: the largest difference between the control plant's continuous rows and the
      // shipped plant's, over the row's own largest entry. It is a read, not an assertion.
      let ctlOff = 0;
      for (let i2 = 0; i2 < full.a.length; i2 += 1) {
        let big = 1e-9;
        for (let j2 = 0; j2 < full.a.length; j2 += 1) big = Math.max(big, Math.abs(full.a[i2][j2]));
        for (let j2 = 0; j2 < full.a.length; j2 += 1) ctlOff = Math.max(ctlOff, Math.abs(full.a[i2][j2] - bodyPlants.Ctl.a[i2][j2]) / big);
      }
      // **The force at the feet, measured both ways.** The shipped plant writes it down: `push = τ / h − m g θ`
      // [R, `yawRows`]. The two-body plant does not write it down at all — it comes out as `m a_m`, the body's own
      // centre of mass's lateral acceleration times its mass, off the plant's own continuous rows at this state:
      //     a_m = z_d φ̈ + h θ̈ + x_f ṙ + V (β̇ + r)
      // So `footTwo / footShipped` says how much of the invented force the honest one agrees with, and the difference
      // is the part that only existed because the body could not resist being accelerated sideways.
      const contAcc = (key: string, rowI: number) => dot(bodyPlants[key].a[rowI], x) + bodyPlants[key].b[rowI][0] * u[0] + bodyPlants[key].b[rowI][1] * u[1];
      const footOf = (key: string) => {
        const yy = bodyPlants[key].y;
        const phiDD = contAcc(key, 1);
        const thetaDD = contAcc(key, 3);
        const rDD = contAcc(key, 4);
        const ay = yy.speed * (contAcc(key, 5) + x[4]);
        const zd = (bodyPlants[key].y.body?.feetRoll ?? true) ? yy.deckHeight : 0;
        return yy.mass * (zd * phiDD + yy.height * thetaDD + yy.feetStation * rDD + ay);
      };
      // The ankle's own torque at this state, as the plant's own line writes it [R, `yawRows`'s `torque`].
      const ankleTorqueHere = y.ankleStiffness * (x[2] - x[0] - x[8]) + y.ankleDamping * (x[3] - x[1]);
      const footShipped = -(ankleTorqueHere / y.height - y.mass * 9.81 * x[2]);
      const footTwo = footOf('Two');
      const footCtl = footOf('Ctl');
      // The four lateral reads of each body plant, off the code's own `lateralCompliance` — the same four the ledger
      // publishes for the game, so the three columns are comparable without a reimplementation beside them.
      const compTwo = lateralCompliance(bodyPlants.Two.y, bodyPlants.Two.y.body);
      const compCtl = lateralCompliance(bodyPlants.Ctl.y, bodyPlants.Ctl.y.body);
      const jTwo = bodyPlants.Two.y.body?.inertia ?? 0;
      // **The pendulum's own term, and the frame trap in comparing it.** 3.3o's `mPendulum` is the shipped plant's own
      // LINE, `bankAcc[2] += g / h` [R] — the coefficient as written, with none of the coupling the row then does.
      // The two-body plant has no such line: its answer to the body's weight is the SOLVED response, `c[1][1] m g h`.
      // Dividing one by the other would be this folder's twelfth frame error, so both plants' **solved** responses are
      // printed beside each other and the line read is left as what it is.
      const pendTwo = compTwo[1][1] * y.mass * 9.81 * y.height * x[2];
      const pendCtl = compCtl[1][1] * y.mass * 9.81 * y.height * x[2];
      // **The ankle's own authority over the body's absolute lean**, rad/s² per N·m: in the model the ankle's column of
      // the generalised force is exactly `(+1, −1, 0, 0)` (its torque on the board, its reaction on the body), so the
      // bank's response is `c[1][0] − c[1][1]`. The game's counterpart is the ledger's `ankleOwn`, the response to
      // `b[7] = 1 / L` as `coupleStanding` books it. Units agree (rad/s per N·m·s is rad/s² per N·m); the two sign
      // conventions do not, so only the **magnitudes** are compared and the signs are printed, never divided.
      const ankleBankTwo = compTwo[1][0] - compTwo[1][1];
      const ankleBankCtl = compCtl[1][0] - compCtl[1][1];
      // The six groups again, on the two-body plant: the assembly is linear in every one of the twelve derivatives,
      // the ankle's pair and the twist's, so differencing the code's own function still gives each group's exact row.
      const gmTwo: Record<Group, number> = { waterRoll: 0, waterYaw: 0, waterSide: 0, ankle: 0, twist: 0, feetForward: 0 };
      const gbTwo: Record<Group, number> = { waterRoll: 0, waterYaw: 0, waterSide: 0, ankle: 0, twist: 0, feetForward: 0 };
      const rollAllTwo = bodyAcc('Two', 1);
      const bankAllTwo = bodyAcc('Two', 3);
      for (const g of GROUPS) {
        const w2 = without(bodyPlants.Two.y, bodyPlants.Two.t, g);
        const c3 = continuousPlant(w2.y, w2.t);
        const d3 = discretise(c3.a, c3.b, CONTROL_STEP);
        gmTwo[g] = rollAllTwo - meanAcc(d3.phi, d3.gamma, 1);
        gbTwo[g] = bankAllTwo - meanAcc(d3.phi, d3.gamma, 3);
      }
      const mSumTwo = GROUPS.reduce((acc, g) => acc + gmTwo[g], 0);
      const bSumTwo = GROUPS.reduce((acc, g) => acc + gbTwo[g], 0);
      const mRestTwo = rollAllTwo - mSumTwo;
      const bRestTwo = bankAllTwo - bSumTwo;

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
      const bodyRateRatio: Record<string, number> = { Ctl: Number.NaN, Sym: Number.NaN, Two: Number.NaN };
      const bodyBankRateRatio: Record<string, number> = { Ctl: Number.NaN, Sym: Number.NaN, Two: Number.NaN };
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
        // Step 3.4a: the same one-step residual on each body plant, off the PREVIOUS tick's own plant, state and
        // command — the same shape as the shipped plant's above and nothing of this tick in it.
        for (const { key } of BODIES) {
          const pb2 = new Array<number>(n).fill(0);
          for (let q = 0; q < n; q += 1) {
            pb2[q] = dot(prev.bPhi[key][q], prev.x) + prev.bGamma[key][q][0] * prev.u[0] + prev.bGamma[key][q][1] * prev.u[1];
          }
          bodyRateRatio[key] = ratio(1, pb2);
          bodyBankRateRatio[key] = ratio(3, pb2);
        }
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
        bPhi: Object.fromEntries(BODIES.map(({ key }) => [key, bodyPlants[key].phi.map((row) => row.slice())])),
        bGamma: Object.fromEntries(BODIES.map(({ key }) => [key, bodyPlants[key].gamma.map((row) => row.slice())])),
      };

      // ===== Step 3.4c: the roll row PER SOURCE at a fixed trajectory, and the gains' own reach into it =====
      // **The game's side is the ledger's own twenty-three-way partition**, in the model's sign, and its closure is
      // read rather than assumed. The model's side is the six groups the code's own `without` separates plus the
      // named remainder, already computed above. The matching is stated in the `Tick` docstring and is a partition on
      // both sides: every ledger source is in exactly one bucket and every model group in exactly one.
      const relOfRaw = (m: number, g: number) => (Number.isFinite(g) && Math.abs(g) > 1e-9 ? (m - g) / Math.abs(g) : Number.NaN);
      const gDeck = {} as Record<BankSource, number>;
      let gDeckSum = 0;
      for (const src of BANK_SOURCES) {
        const v = ledgerOn ? -bankLedger.deck[src] * DEG : Number.NaN;
        gDeck[src] = v;
        if (Number.isFinite(v)) gDeckSum += v;
      }
      let gRestSrc = 0;
      for (const src of REST_SOURCES) gRestSrc += gDeck[src];
      const gWaterBoard = gWater + gBoard;
      const gAnkleSrc = gDeck.ankle;
      const gTwistSrc = gDeck.twist;
      // The five gaps, at the controller's own EXACT point, so they are a partition of `rollAccFull − rollAccGame`.
      const eWater = (gm.waterRoll + gm.waterYaw + gm.waterSide) * DEG - gWaterBoard;
      const eAnkle = gm.ankle * DEG - gAnkleSrc;
      const eTwist = gm.twist * DEG - gTwistSrc;
      const eRest = mRest * DEG - gRestSrc;
      const eFeetFwd = gm.feetForward * DEG;
      const eNet = rollAll * DEG - rollGame;
      const eSum = eWater + eAnkle + eTwist + eRest + eFeetFwd;
      // The same five on the two-body plant, against the same game row on the same tick.
      const eWaterTwo = (gmTwo.waterRoll + gmTwo.waterYaw + gmTwo.waterSide) * DEG - gWaterBoard;
      const eAnkleTwo = gmTwo.ankle * DEG - gAnkleSrc;
      const eTwistTwo = gmTwo.twist * DEG - gTwistSrc;
      const eRestTwo = mRestTwo * DEG - gRestSrc;
      const eFeetFwdTwo = gmTwo.feetForward * DEG;
      const eNetTwo = rollAllTwo * DEG - rollGame;
      const eSumTwo = eWaterTwo + eAnkleTwo + eTwistTwo + eRestTwo + eFeetFwdTwo;
      // **The model's row split into the half the gains reach and the half they do not.** `Γ` is the same matrix in
      // every cost arm [R, `design`: the weights enter only `q`], so `rollCmd` is the whole of the gains' reach into
      // this row at this state. The datum is the controller's OWN blended Γ, the same one `rollAccModel` is built
      // with, so the two halves sum to it exactly.
      const rollCmd = (d.gamma[1][0] * u[0] + d.gamma[1][1] * u[1]) / CONTROL_STEP * DEG;
      // The two authorities of the commanded ankle rest over the roll row, °/s² per rad — the model's own and the
      // game's own, magnitudes only, the two sign conventions never divided (3.3p §6 reading 5).
      const cmdAuthModel = Math.abs(fullD.gamma[1][0]) / CONTROL_STEP * DEG;
      const cmdAuthModelCont = Math.abs(full.a[1][8]) * DEG;
      // The read: the commands enter the plant only through the two muscle-lag rows.
      let bZeroOff = 0;
      for (let i2 = 0; i2 < full.b.length; i2 += 1) {
        for (let j2 = 0; j2 < full.b[i2].length; j2 += 1) {
          if ((i2 === 8 && j2 === 0) || (i2 === 9 && j2 === 1)) continue;
          bZeroOff = Math.max(bZeroOff, Math.abs(full.b[i2][j2]));
        }
      }
      const cmdAuthGame = ledgerLive ? Math.abs(bankLedger.ankleDeck * y.ankleStiffness) * DEG : Number.NaN;

      // ===== Step 3.4f: the datum's two halves AS THEY ENTER THE COMMAND, at the exact point =====
      // The algebra is in the `Tick` field comment above; this is the arithmetic of it. The design is the arm's own
      // weights with `waterHeel: 'both'` forced, so `gammaD` and `predD` exist on every arm and the instrument is the
      // SAME function of the operating point on all four — and `heelDesignOff` is the measurement that forcing it
      // moves no entry of Φ, Γ or K, rather than the shipped comment's word for it.
      const wArm: DesignWeights = ctl.weights ?? DEFAULT_WEIGHTS;
      const dPlain = design(y, tw, wArm);
      const dBoth = design(y, tw, { ...wArm, waterHeel: 'both' });
      const nB = dBoth.phi.length;
      let heelDesignOff = 0;
      for (let i2 = 0; i2 < nB; i2 += 1) {
        for (let j2 = 0; j2 < nB; j2 += 1) heelDesignOff = Math.max(heelDesignOff, Math.abs(dBoth.phi[i2][j2] - dPlain.phi[i2][j2]));
        for (let j2 = 0; j2 < 2; j2 += 1) heelDesignOff = Math.max(heelDesignOff, Math.abs(dBoth.gamma[i2][j2] - dPlain.gamma[i2][j2]));
      }
      for (let q = 0; q < 2; q += 1) {
        for (let j2 = 0; j2 < nB; j2 += 1) heelDesignOff = Math.max(heelDesignOff, Math.abs(dBoth.k[q][j2] - dPlain.k[q][j2]));
      }
      // The prediction's half: the tilt propagated over the sensing delay, the controller's own line [R, `:1438`].
      const dxHat = new Array<number>(nB).fill(0);
      for (let jj = 0; jj < dBoth.steps; jj += 1) {
        for (let i2 = 0; i2 < nB; i2 += 1) dxHat[i2] += (dBoth.predD?.[jj][i2][0] ?? Number.NaN) * tiltRad;
      }
      // The reference's half: the same tilt as a known input on the equilibrium's right-hand side [R, `:1442`].
      const driveCol = (dBoth.gammaD ?? []).map((rw) => rw[0] * tiltRad);
      const refDrive = steadyTurn(dBoth.phi, dBoth.gamma, 0, 0, driveCol);
      // C3's own datum at this point: with no lean asked and no drive the equilibrium is the origin, exactly.
      const refFlat = steadyTurn(dBoth.phi, dBoth.gamma, 0, 0);
      let refFlatOff = Math.max(Math.abs(refFlat.u[0]), Math.abs(refFlat.u[1]));
      for (let i2 = 0; i2 < nB; i2 += 1) refFlatOff = Math.max(refFlatOff, Math.abs(refFlat.x[i2]));
      // C4, `steadyTurn`'s superposition, measured and not assumed: the drive's own response must be the same
      // whatever lean and twist are asked, or `Δx_ref` is not a property of the tilt alone and the table above is
      // wrong. `solveSmall` is a pivoting solve, so this is a real read of it and not a tautology.
      const bankAsk = -inner.leanAsked;
      const twistAsk = -inner.twistAsked;
      const refAsk = steadyTurn(dBoth.phi, dBoth.gamma, bankAsk, twistAsk);
      const refAskDrive = steadyTurn(dBoth.phi, dBoth.gamma, bankAsk, twistAsk, driveCol);
      const refScaleX = Math.max(1e-12, ...refDrive.x.map(Math.abs));
      const refScaleU = Math.max(1e-12, Math.abs(refDrive.u[0]), Math.abs(refDrive.u[1]));
      let superOff = 0;
      for (let i2 = 0; i2 < nB; i2 += 1) {
        superOff = Math.max(superOff, Math.abs((refAskDrive.x[i2] - refAsk.x[i2]) - refDrive.x[i2]) / refScaleX);
      }
      for (let q = 0; q < 2; q += 1) {
        superOff = Math.max(superOff, Math.abs((refAskDrive.u[q] - refAsk.u[q]) - refDrive.u[q]) / refScaleU);
      }
      // The two feedback terms, `K·Δx̂` and `K·Δx_ref`, in the commands' own units.
      const kDxHat = [0, 0];
      const kDxRef = [0, 0];
      for (let q = 0; q < 2; q += 1) {
        let s1 = 0;
        let s2 = 0;
        for (let j2 = 0; j2 < nB; j2 += 1) {
          s1 += dBoth.k[q][j2] * dxHat[j2];
          s2 += dBoth.k[q][j2] * refDrive.x[j2];
        }
        kDxHat[q] = s1;
        kDxRef[q] = s2;
      }
      // And in the roll row's own units, which is the only frame in which the three terms are comparable with
      // `rollCmd` and with the rows this folder publishes. `Γ` is this point's own, as `rollCmd`'s is the blend's.
      const rowOfU = (u0: number, u1: number) => (dBoth.gamma[1][0] * u0 + dBoth.gamma[1][1] * u1) / CONTROL_STEP * DEG;
      const rowTiltPred = rowOfU(-kDxHat[0], -kDxHat[1]);
      const rowTiltRefFF = rowOfU(refDrive.u[0], refDrive.u[1]);
      const rowTiltRefFB = rowOfU(kDxRef[0], kDxRef[1]);
      const rowTiltRef = rowTiltRefFF + rowTiltRefFB;
      const rowTiltBoth = rowTiltPred + rowTiltRef;
      // ===== Step 3.4c: what ANOTHER gain set would command at this very state (`GAINS=1`) =====
      let cmdRebuild = Number.NaN;
      let gainPlantOff = Number.NaN;
      let gainRowOff = Number.NaN;
      let gainRollSwing = Number.NaN;
      let gainCmdSwing = Number.NaN;
      let gainRollSwingPoint = Number.NaN;
      let gainClamped = Number.NaN;
      const relSubst: Record<string, number> = {};
      const relSubstBank: Record<string, number> = {};
      const substHelps: Record<string, number> = {};
      const eAnkleSubst: Record<string, number> = {};
      const eTwistSubst: Record<string, number> = {};
      for (const arm of COST_ARMS) {
        relSubst[arm.key] = Number.NaN;
        relSubstBank[arm.key] = Number.NaN;
        substHelps[arm.key] = Number.NaN;
        eAnkleSubst[arm.key] = Number.NaN;
        eTwistSubst[arm.key] = Number.NaN;
      }
      if (GAINS) {
        const dsg = COST_ARMS.map((arm) => design(y, tw, arm.w));
        const nS = dsg[0].phi.length;
        // P1, read per tick: the four arms' Φ and Γ, and the exact-point plant the groups are built on, are one
        // matrix. A non-zero here would mean the cost reaches the plant.
        gainPlantOff = 0;
        for (let q = 0; q < nS; q += 1) {
          for (let j = 0; j < nS; j += 1) {
            for (const dd of dsg) gainPlantOff = Math.max(gainPlantOff, Math.abs(dd.phi[q][j] - dsg[0].phi[q][j]));
            gainPlantOff = Math.max(gainPlantOff, Math.abs(fullD.phi[q][j] - dsg[0].phi[q][j]));
          }
          for (let j = 0; j < 2; j += 1) {
            for (const dd of dsg) gainPlantOff = Math.max(gainPlantOff, Math.abs(dd.gamma[q][j] - dsg[0].gamma[q][j]));
            gainPlantOff = Math.max(gainPlantOff, Math.abs(fullD.gamma[q][j] - dsg[0].gamma[q][j]));
          }
        }
        // P1's own row: the model's roll row with the RECORDED state and the RECORDED command, under each arm's
        // design. The gains cannot enter it, and this is the number that says so.
        const rowOf = (dd: { phi: number[][]; gamma: number[][] }) =>
          (dot(dd.phi[1], x) + dd.gamma[1][0] * u[0] + dd.gamma[1][1] * u[1] - x[1]) / CONTROL_STEP * DEG;
        gainRowOff = 0;
        for (const dd of dsg) gainRowOff = Math.max(gainRowOff, Math.abs(rowOf(dd) - rowOf(dsg[0])));
        // The command the controller's own line gives, rebuilt at the exact point:
        //     u_q = ref.u_q − b̂_q − K[q] · (x̂ − ref.x)
        // clamped as `tick` clamps it [R, `PredictiveController.tick`]. The ankle's bound is the rider's own
        // `ankleRoom`, read; the twist's is `min(TWIST_BODY_TORQUE, grip)`, which the probe does not read, so it is
        // recovered when the recorded tick was clamped (`|raw| > |sent|` makes `|sent|` the bound) and left open
        // otherwise. `cmdRebuild` is the control on all of it.
        const ref = rider.predictor.reference;
        const xh = rider.predictor.predicted;
        const bh = rider.predictor.bias;
        const room = inner.ankleRoom;
        const twistLim = Math.abs(rider.predictor.raw[1]) > Math.abs(u[1]) + 1e-12 ? Math.abs(u[1]) : Number.POSITIVE_INFINITY;
        const cmdOf = (kk: number[][]) => {
          const out = [0, 0];
          for (let q = 0; q < 2; q += 1) {
            let s = ref.u[q] - bh[q];
            for (let j = 0; j < nS; j += 1) s -= kk[q][j] * (xh[j] - ref.x[j]);
            out[q] = s;
          }
          out[0] = Math.max(-room, Math.min(room, out[0]));
          out[1] = Math.max(-twistLim, Math.min(twistLim, out[1]));
          return out;
        };
        const own = COST_ARMS.findIndex((arm) => arm.key === (COST ?? 'off'));
        const uHat = cmdOf(dsg[own].k);
        cmdRebuild = Math.abs(u[0]) > 1e-9 ? Math.abs(uHat[0] - u[0]) / Math.abs(u[0]) : Number.NaN;
        // The swing: `Γ[1] · (u' − û)` over the step, °/s². `Γ` is the exact point's, which `gainPlantOff` has just
        // read to be the same matrix as the four designs' own.
        gainRollSwing = 0;
        gainCmdSwing = 0;
        gainClamped = Math.abs(Math.abs(uHat[0]) - room) < 1e-12 ? 1 : 0;
        for (let q = 0; q < dsg.length; q += 1) {
          const key = COST_ARMS[q].key;
          const up = q === own ? uHat : cmdOf(dsg[q].k);
          const dAnkle = fullD.gamma[1][0] * (up[0] - uHat[0]) / CONTROL_STEP * DEG;
          const dTwist = fullD.gamma[1][1] * (up[1] - uHat[1]) / CONTROL_STEP * DEG;
          const dRoll = dAnkle + dTwist;
          const dBank = (fullD.gamma[3][0] * (up[0] - uHat[0]) + fullD.gamma[3][1] * (up[1] - uHat[1])) / CONTROL_STEP * DEG;
          // **The brief's measurement**: the same tick's row with this arm's own command in it.
          relSubst[key] = relOfRaw(rollAll * DEG + dRoll, rollGame);
          relSubstBank[key] = relOfRaw(bankAll * DEG + dBank, bankGame);
          substHelps[key] = Number.isFinite(eNet) ? (Math.abs(eNet + dRoll) < Math.abs(eNet) ? 1 : 0) : Number.NaN;
          eAnkleSubst[key] = eAnkle + dAnkle;
          eTwistSubst[key] = eTwist + dTwist;
          if (q === own) continue;
          gainRollSwing = Math.max(gainRollSwing, Math.abs(dRoll));
          gainCmdSwing = Math.max(gainCmdSwing, Math.abs(up[0] - uHat[0]));
          if (Math.abs(Math.abs(up[0]) - room) < 1e-12) gainClamped = 1;
          if (key === 'point') gainRollSwingPoint = Math.abs(dRoll);
        }
      }

      const relOf = (m: number, g: number) => (Number.isFinite(g) && Math.abs(g) > 1e-9 ? (m - g) / Math.abs(g) : Number.NaN);
      const shareOfNet = (e: number) => (Math.abs(eNet) > 1e-9 ? Math.abs(e) / Math.abs(eNet) : Number.NaN);
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
        // --- step 3.4a: the two-body rider
        ctlOff,
        // The shipped plant rebuilt at the controller's own exact point, which is what the three body plants are built
        // at too — so `relCtl` against `relFull` is the control, and `rollRel` (the controller's own eight-point
        // blend) differs from `relFull` by the blend alone, which 3.3p measured at 0.001–0.056.
        rollAccFull: rollAll * DEG,
        bankAccFull: bankAll * DEG,
        relFull: relOf(rollAll * DEG, rollGame),
        relBankFull: relOf(bankAll * DEG, bankGame),
        rollSignFull: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? (Math.sign(rollAll) === Math.sign(rollGame) ? 1 : 0) : Number.NaN,
        bankSignFull: Number.isFinite(bankGame) && Math.abs(bankGame) > 1e-9 ? (Math.sign(bankAll) === Math.sign(bankGame) ? 1 : 0) : Number.NaN,
        rollAccCtl: bodyAcc('Ctl', 1) * DEG,
        bankAccCtl: bodyAcc('Ctl', 3) * DEG,
        relCtl: relOf(bodyAcc('Ctl', 1) * DEG, rollGame),
        relBankCtl: relOf(bodyAcc('Ctl', 3) * DEG, bankGame),
        rollAccSym: bodyAcc('Sym', 1) * DEG,
        bankAccSym: bodyAcc('Sym', 3) * DEG,
        relSym: relOf(bodyAcc('Sym', 1) * DEG, rollGame),
        relBankSym: relOf(bodyAcc('Sym', 3) * DEG, bankGame),
        rollSignSym: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? (Math.sign(bodyAcc('Sym', 1)) === Math.sign(rollGame) ? 1 : 0) : Number.NaN,
        bankSignSym: Number.isFinite(bankGame) && Math.abs(bankGame) > 1e-9 ? (Math.sign(bodyAcc('Sym', 3)) === Math.sign(bankGame) ? 1 : 0) : Number.NaN,
        rollAccTwo: rollAllTwo * DEG,
        bankAccTwo: bankAllTwo * DEG,
        relTwo: relOf(rollAllTwo * DEG, rollGame),
        relBankTwo: relOf(bankAllTwo * DEG, bankGame),
        rollSignTwo: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? (Math.sign(rollAllTwo) === Math.sign(rollGame) ? 1 : 0) : Number.NaN,
        bankSignTwo: Number.isFinite(bankGame) && Math.abs(bankGame) > 1e-9 ? (Math.sign(bankAllTwo) === Math.sign(bankGame) ? 1 : 0) : Number.NaN,
        ratioRollRateCtl: bodyRateRatio.Ctl,
        ratioRollRateSym: bodyRateRatio.Sym,
        ratioRollRateTwo: bodyRateRatio.Two,
        ratioBankRateCtl: bodyBankRateRatio.Ctl,
        ratioBankRateSym: bodyBankRateRatio.Sym,
        ratioBankRateTwo: bodyBankRateRatio.Two,
        // the force at the feet: the shipped plant's own closed form against the two-body plant's outcome, N
        footShipped,
        footTwo,
        footCtl,
        footRatio: Math.abs(footShipped) > 1e-9 ? footTwo / footShipped : Number.NaN,
        footCtlOff: Math.abs(footShipped) > 1e-9 ? Math.abs((footCtl - footShipped) / footShipped) : Number.NaN,
        // the four lateral reads of the two-body plant, against the game's own (already on this row)
        jTwo,
        swayMassTwo: compTwo[3][3] !== 0 ? 1 / compTwo[3][3] : Number.NaN,
        swayMassCtl: compCtl[3][3] !== 0 ? 1 / compCtl[3][3] : Number.NaN,
        rollInertiaTwo: compTwo[0][0] !== 0 ? 1 / compTwo[0][0] : Number.NaN,
        yawInertiaTwo: compTwo[2][2] !== 0 ? 1 / compTwo[2][2] : Number.NaN,
        sideRollTwo: compTwo[0][3],
        sideRollCtl: compCtl[0][3],
        crossSymTwo: Math.abs(compTwo[0][3] - compTwo[3][0]),
        // the groups on the two-body plant, °/s², and its own pendulum term
        mWaterSideTwo: gmTwo.waterSide * DEG,
        mWaterRollTwo: gmTwo.waterRoll * DEG,
        mAnkleTwo: gmTwo.ankle * DEG,
        mRestTwo: mRestTwo * DEG,
        mWaterAllTwo: (gmTwo.waterRoll + gmTwo.waterYaw + gmTwo.waterSide) * DEG,
        mRiderAllTwo: (gmTwo.ankle + gmTwo.twist + gmTwo.feetForward + mRestTwo) * DEG,
        bWaterSideTwo: gbTwo.waterSide * DEG,
        bAnkleTwo: gbTwo.ankle * DEG,
        bRestTwo: bRestTwo * DEG,
        mCloseTwo: Math.abs(mSumTwo + mRestTwo - rollAllTwo) / Math.max(1e-30, Math.abs(rollAllTwo)),
        bCloseTwo: Math.abs(bSumTwo + bRestTwo - bankAllTwo) / Math.max(1e-30, Math.abs(bankAllTwo)),
        mPendulumTwo: pendTwo * DEG,
        pendSolvedCtl: pendCtl * DEG,
        // The game's own counterpart to it, at last apples to apples: the ledger's `gravity` source on the BODY's own
        // lean row — the rider's own weight's share of its own lean acceleration, attributed to machine precision.
        // 3.3o's lean-row ledger control is 0.092–0.455, so this column is read to a factor of about 1.5 and no
        // further (3.3o §8), and it is the reason both model numbers are printed beside it rather than divided alone.
        gGravityOwn: ledgerOn ? -bankLedger.own.gravity * DEG : Number.NaN,
        bankInertiaTwo: compTwo[1][1] !== 0 ? 1 / compTwo[1][1] : Number.NaN,
        bankInertiaCtl: compCtl[1][1] !== 0 ? 1 / compCtl[1][1] : Number.NaN,
        ankleBankTwo,
        ankleBankCtl,
        ankleBankGame: ledgerOn ? bankLedger.ankleOwn : Number.NaN,
        condTwo: Math.abs(rollAllTwo) > 1e-12 ? Math.max(Math.abs(gmTwo.waterSide), Math.abs(gmTwo.waterRoll), Math.abs(gmTwo.ankle), Math.abs(mRestTwo)) / Math.abs(rollAllTwo) : Number.NaN,
        // --- step 3.4c: the roll row per source, the row's two halves, and the gains' own reach
        gDeck,
        gDeckClose: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? Math.abs(gDeckSum - rollGame) / Math.abs(rollGame) : Number.NaN,
        rollCmd,
        rollState: rollAccModel - rollCmd,
        cmdShareModel: Math.abs(rollAccModel) > 1e-9 ? Math.abs(rollCmd) / Math.abs(rollAccModel) : Number.NaN,
        cmdShareGame: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? Math.abs(rollCmd) / Math.abs(rollGame) : Number.NaN,
        eWater,
        eAnkle,
        eTwist,
        eRest,
        eFeetFwd,
        gWaterBoard,
        gAnkleSrc,
        gTwistSrc,
        gRestSrc,
        eNet,
        eClose: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? Math.abs(eSum - eNet) / Math.abs(rollGame) : Number.NaN,
        shWater: shareOfNet(eWater),
        shAnkle: shareOfNet(eAnkle),
        shTwist: shareOfNet(eTwist),
        shRest: shareOfNet(eRest),
        shFeetFwd: shareOfNet(eFeetFwd),
        eWaterTwo,
        eAnkleTwo,
        eTwistTwo,
        eRestTwo,
        eFeetFwdTwo,
        eNetTwo,
        eCloseTwo2: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? Math.abs(eSumTwo - eNetTwo) / Math.abs(rollGame) : Number.NaN,
        cmdRebuild,
        gainPlantOff,
        gainRowOff,
        gainRollSwing,
        gainSwingShare: Number.isFinite(rollGame) && Math.abs(rollGame) > 1e-9 ? gainRollSwing / Math.abs(rollGame) : Number.NaN,
        gainCmdSwing,
        gainSwingOverNet: Math.abs(eNet) > 1e-9 ? gainRollSwing / Math.abs(eNet) : Number.NaN,
        gainRollSwingPoint,
        ankleRoomHere: inner.ankleRoom,
        gainClamped,
        rowTiltPred,
        rowTiltRefFF,
        rowTiltRefFB,
        rowTiltRef,
        rowTiltBoth,
        cancelShare: Math.abs(rowTiltBoth) / Math.max(1e-30, Math.abs(rowTiltPred), Math.abs(rowTiltRef)),
        dxHatPhi: dxHat[0] * DEG,
        dxRefPhi: refDrive.x[0] * DEG,
        kDxHatA: kDxHat[0],
        kDxRefA: kDxRef[0],
        tiltSameSign: Math.abs(kDxHat[0]) > 0 && Math.abs(kDxRef[0]) > 0 && Math.sign(kDxHat[0]) === Math.sign(kDxRef[0]) ? 1 : 0,
        predOverRoom: inner.ankleRoom > 0 ? Math.abs(kDxHat[0]) / inner.ankleRoom : Number.NaN,
        refOverRoom: inner.ankleRoom > 0 ? Math.abs(refDrive.u[0] + kDxRef[0]) / inner.ankleRoom : Number.NaN,
        heelDesignOff,
        refFlatOff,
        superOff,
        relSubst,
        relSubstBank,
        substHelps,
        eAnkleSubst,
        eTwistSubst,
        cmdAuthModel,
        cmdAuthModelCont,
        cmdAuthGame,
        cmdAuthRatio: Number.isFinite(cmdAuthGame) && cmdAuthGame > 1e-12 ? cmdAuthModelCont / cmdAuthGame : Number.NaN,
        cmdAuthStep: cmdAuthModelCont > 1e-12 ? cmdAuthModel / cmdAuthModelCont : Number.NaN,
        bZeroOff,
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

  // **Step 3.4c: the per-tick dump.** One row per LIVE tick, with the state the tick was taken at and the roll row's
  // own columns, so the matched-state comparison across gain arms is made on ticks and not on run medians. Nothing
  // here is computed for the dump; every column is already on the row.
  // **Step 3.4d widens it to every tick with a `live` column**, because the window every figure in this folder is
  // filtered to begins at `t > 0.2` and the mount's own first twelve frames are what 3.4c's step-four item 1 asks
  // for. `live === 1` is exactly 3.4c's own population (`t > 0.2 && clamped === 0`), so filtering on it reproduces
  // 3.4c's dump row for row.
  if (TICKS) {
    for (const xx of ticks) {
      appendFileSync(TICKS, `${JSON.stringify({
        body: BODY ?? 'point', cost: COST ?? 'off', place: PLACE, stance: st, steer, entryAsked: entry0, extra: entry0 === null ? extra : null,
        wheel: WHEEL ?? 'off', mount: MOUNTA ?? 'ships', arange: ARANGE ?? 'ships',
        live: xx.t > 0.2 && xx.clamped === 0 ? 1 : 0, clamped: xx.clamped, ticks: xx.ticks,
        t: r(xx.t, 4),
        // the state the tick sits at, every one a read off the ride
        speed: r(xx.speed, 3), railMeas: r(xx.railMeas, 3), roll: r(xx.roll, 3), bank: r(xx.bank, 3),
        through: r(xx.through, 3), schedRail: r(xx.schedRail, 4), tilt: r(xx.tilt, 3),
        // the roll row, both sides and both halves
        rollAccGame: r(xx.rollAccGame, 4), rollAccModel: r(xx.rollAccModel, 4), rollAccFull: r(xx.rollAccFull, 4),
        rollRel: r(xx.rollRel, 6), relFull: r(xx.relFull, 6), rollSign: xx.rollSign,
        rollCmd: r(xx.rollCmd, 4), rollState: r(xx.rollState, 4),
        cmdShareModel: r(xx.cmdShareModel, 6), cmdShareGame: r(xx.cmdShareGame, 6),
        condGame: r(xx.condGame, 4), condModel: r(xx.condModel, 4),
        // the per-source gaps and the game's own side of each
        eWater: r(xx.eWater, 4), eAnkle: r(xx.eAnkle, 4), eTwist: r(xx.eTwist, 4), eRest: r(xx.eRest, 4), eFeetFwd: r(xx.eFeetFwd, 4),
        gWaterBoard: r(xx.gWaterBoard, 4), gAnkleSrc: r(xx.gAnkleSrc, 4), gTwistSrc: r(xx.gTwistSrc, 4), gRestSrc: r(xx.gRestSrc, 4),
        eNet: r(xx.eNet, 4), eClose: r(xx.eClose, 8), gDeckClose: r(xx.gDeckClose, 8),
        eWaterTwo: r(xx.eWaterTwo, 4), eAnkleTwo: r(xx.eAnkleTwo, 4), eTwistTwo: r(xx.eTwistTwo, 4),
        eRestTwo: r(xx.eRestTwo, 4), eFeetFwdTwo: r(xx.eFeetFwdTwo, 4), eNetTwo: r(xx.eNetTwo, 4),
        // the gains' own reach, when `GAINS=1`
        gainRollSwing: r(xx.gainRollSwing, 4), gainSwingShare: r(xx.gainSwingShare, 6),
        gainCmdSwing: r(xx.gainCmdSwing, 6), cmdRebuild: r(xx.cmdRebuild, 6),
        gainRowOff: r(xx.gainRowOff, 15), gainPlantOff: r(xx.gainPlantOff, 15),
        ankleRoomHere: r(xx.ankleRoomHere, 4), gainClamped: xx.gainClamped,
        cmdAuthModel: r(xx.cmdAuthModel, 2), cmdAuthModelCont: r(xx.cmdAuthModelCont, 2),
        cmdAuthGame: r(xx.cmdAuthGame, 2), cmdAuthRatio: r(xx.cmdAuthRatio, 4), cmdAuthStep: r(xx.cmdAuthStep, 4),
        // **Step 3.4f**: the datum's two halves where the controller's own last line puts them, at the exact point,
        // in the roll row's own units. `rowTiltBoth` is their SUM and the sum is an identity, so that column is the
        // cancellation's own residue and `cancelShare` is its size against the larger half.
        rowTiltPred: r(xx.rowTiltPred, 4), rowTiltRefFF: r(xx.rowTiltRefFF, 4), rowTiltRefFB: r(xx.rowTiltRefFB, 4),
        rowTiltRef: r(xx.rowTiltRef, 4), rowTiltBoth: r(xx.rowTiltBoth, 4), cancelShare: r(xx.cancelShare, 6),
        dxHatPhi: r(xx.dxHatPhi, 5), dxRefPhi: r(xx.dxRefPhi, 5),
        kDxHatA: r(xx.kDxHatA, 6), kDxRefA: r(xx.kDxRefA, 6), tiltSameSign: xx.tiltSameSign,
        predOverRoom: r(xx.predOverRoom, 4), refOverRoom: r(xx.refOverRoom, 4),
        heelDesignOff: r(xx.heelDesignOff, 18), refFlatOff: r(xx.refFlatOff, 18), superOff: r(xx.superOff, 18),
        // the brief's measurement: the same tick's roll row under each of the four gain sets
        ...Object.fromEntries(COST_ARMS.flatMap((arm) => [
          [`subst_${arm.key}`, r(xx.relSubst[arm.key], 6)],
          [`substBank_${arm.key}`, r(xx.relSubstBank[arm.key], 6)],
          [`substHelps_${arm.key}`, xx.substHelps[arm.key]],
        ])),
        // **Step 3.4d**: the same tick's roll row with the water's heel read against the WATER instead of the world's
        // level — step 3.3p's own tilt plant, `heelColumn` imported from `predictiveBalance`. The difference
        // `rollAccFull − rollAccTilt` is the phantom heel: exactly one column of the plant times the face's own tilt.
        rollAccTilt: r(xx.rollAccTilt, 4), relTilt: r(xx.relTilt, 6), rollSignTilt: xx.rollSignTilt,
        // the two-body plant's own roll row on the same tick, so the per-source read has both plants
        rollAccTwo: r(xx.rollAccTwo, 4), relTwo: r(xx.relTwo, 6),
        mWaterAllTwo: r(xx.mWaterAllTwo, 4), mAnkleTwo: r(xx.mAnkleTwo, 4), mRestTwo: r(xx.mRestTwo, 4),
      })}\n`);
    }
  }

  const out: Record<string, unknown> = {
    rider: RIDER,
    ledger: LEDGER,
    wheel: WHEEL ?? 'off',
    mount: MOUNTA ?? 'ships',
    arange: ARANGE ?? 'ships',
    bankClamp: BANKC ?? 'ships',
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
    // --- step 3.4a: the two-body rider
    ctlOffPeak: r(peak(col(live, 'ctlOff')), 15),
    relFullMed: r(median(absCol(live, 'relFull')), 3),
    relBankFullMed: r(median(absCol(live, 'relBankFull')), 3),
    rollSignFullShare: r(shareOf(live, 'rollSignFull'), 3),
    bankSignFullShare: r(shareOf(live, 'bankSignFull'), 3),
    relCtlOffPeak: r(peak(live.map((xx) => Math.abs(xx.relCtl - xx.relFull)).filter(Number.isFinite)), 15),
    relCtlMed: r(median(absCol(live, 'relCtl')), 3),
    relBankCtlMed: r(median(absCol(live, 'relBankCtl')), 3),
    relSymMed: r(median(absCol(live, 'relSym')), 3),
    relBankSymMed: r(median(absCol(live, 'relBankSym')), 3),
    rollSignSymShare: r(shareOf(live, 'rollSignSym'), 3),
    bankSignSymShare: r(shareOf(live, 'bankSignSym'), 3),
    relTwoMed: r(median(absCol(live, 'relTwo')), 3),
    relBankTwoMed: r(median(absCol(live, 'relBankTwo')), 3),
    relTwoPeak: r(peak(absCol(live, 'relTwo')), 3),
    relBankTwoPeak: r(peak(absCol(live, 'relBankTwo')), 3),
    rollSignTwoShare: r(shareOf(live, 'rollSignTwo'), 3),
    bankSignTwoShare: r(shareOf(live, 'bankSignTwo'), 3),
    rollAccTwoMed: r(median(absCol(live, 'rollAccTwo')), 1),
    bankAccTwoMed: r(median(absCol(live, 'bankAccTwo')), 1),
    relTwoLate: r(median(absCol(late, 'relTwo')), 3),
    relBankTwoLate: r(median(absCol(late, 'relBankTwo')), 3),
    ratioRollRateCtlMed: r(median(col(live, 'ratioRollRateCtl')), 3),
    ratioRollRateSymMed: r(median(col(live, 'ratioRollRateSym')), 3),
    ratioRollRateTwoMed: r(median(col(live, 'ratioRollRateTwo')), 3),
    ratioBankRateCtlMed: r(median(col(live, 'ratioBankRateCtl')), 3),
    ratioBankRateSymMed: r(median(col(live, 'ratioBankRateSym')), 3),
    ratioBankRateTwoMed: r(median(col(live, 'ratioBankRateTwo')), 3),
    aboveOneRollRateTwo: r(aboveOne(live, 'ratioRollRateTwo'), 3),
    aboveOneBankRateTwo: r(aboveOne(live, 'ratioBankRateTwo'), 3),
    // the force at the feet
    footShippedMed: r(median(absCol(live, 'footShipped')), 2),
    footTwoMed: r(median(absCol(live, 'footTwo')), 2),
    footRatioMed: r(median(col(live, 'footRatio')), 3),
    footRatioSpanLo: r(sorted(col(live, 'footRatio'))[0] ?? Number.NaN, 3),
    footRatioPeak: r(peak(col(live, 'footRatio')), 3),
    footCtlOffPeak: r(peak(col(live, 'footCtlOff')), 15),
    // the two-body plant's own four lateral reads against the game's
    jTwoMed: r(median(col(live, 'jTwo')), 3),
    swayMassTwoMed: r(median(col(live, 'swayMassTwo')), 3),
    swayMassCtlMed: r(median(col(live, 'swayMassCtl')), 3),
    swayRatioTwoMed: r(median(live.map((xx) => xx.swayMassGame / xx.swayMassTwo).filter(Number.isFinite)), 3),
    rollInertiaTwoMed: r(median(col(live, 'rollInertiaTwo')), 4),
    rollRatioTwoMed: r(median(live.map((xx) => xx.rollInertiaGame / xx.rollInertiaTwo).filter(Number.isFinite)), 3),
    yawInertiaTwoMed: r(median(col(live, 'yawInertiaTwo')), 4),
    yawRatioTwoMed: r(median(live.map((xx) => xx.yawInertiaGame / xx.yawInertiaTwo).filter(Number.isFinite)), 3),
    sideRollTwoMed: r(median(col(live, 'sideRollTwo')), 6),
    sideRollCtlPeak: r(peak(absCol(live, 'sideRollCtl')), 15),
    sideRollRatioTwoMed: r(median(live.map((xx) => (Math.abs(xx.sideRollTwo) > 1e-12 ? xx.sideRollGame / xx.sideRollTwo : Number.NaN)).filter(Number.isFinite)), 3),
    crossSymTwoPeak: r(peak(col(live, 'crossSymTwo')), 15),
    // the groups, the closure, the pendulum and the conditioning on the two-body plant
    mWaterSideTwoMed: r(median(absCol(live, 'mWaterSideTwo')), 1),
    mWaterRollTwoMed: r(median(absCol(live, 'mWaterRollTwo')), 1),
    mAnkleTwoMed: r(median(absCol(live, 'mAnkleTwo')), 1),
    mRestTwoMed: r(median(absCol(live, 'mRestTwo')), 1),
    mWaterAllTwoMed: r(median(absCol(live, 'mWaterAllTwo')), 1),
    mRiderAllTwoMed: r(median(absCol(live, 'mRiderAllTwo')), 1),
    bWaterSideTwoMed: r(median(absCol(live, 'bWaterSideTwo')), 1),
    bAnkleTwoMed: r(median(absCol(live, 'bAnkleTwo')), 1),
    bRestTwoMed: r(median(absCol(live, 'bRestTwo')), 1),
    closeRollTwo: r(peak(absCol(live, 'mCloseTwo')), 15),
    closeBankTwo: r(peak(absCol(live, 'bCloseTwo')), 15),
    mPendulumTwoMed: r(median(absCol(live, 'mPendulumTwo')), 1),
    pendRatioTwoMed: r(median(live.map((xx) => (Math.abs(xx.mPendulum) > 1e-9 ? xx.mPendulumTwo / xx.mPendulum : Number.NaN)).filter(Number.isFinite)), 4),
    condTwoMed: r(median(col(live, 'condTwo')), 2),
    pendSolvedCtlMed: r(median(absCol(live, 'pendSolvedCtl')), 1),
    pendSolvedRatioMed: r(median(live.map((xx) => (Math.abs(xx.pendSolvedCtl) > 1e-9 ? xx.mPendulumTwo / xx.pendSolvedCtl : Number.NaN)).filter(Number.isFinite)), 4),
    gGravityOwnMed: r(median(absCol(live, 'gGravityOwn')), 1),
    pendGameRatioCtlMed: r(median(live.map((xx) => (Math.abs(xx.gGravityOwn) > 1e-9 ? Math.abs(xx.pendSolvedCtl / xx.gGravityOwn) : Number.NaN)).filter(Number.isFinite)), 3),
    pendGameRatioTwoMed: r(median(live.map((xx) => (Math.abs(xx.gGravityOwn) > 1e-9 ? Math.abs(xx.mPendulumTwo / xx.gGravityOwn) : Number.NaN)).filter(Number.isFinite)), 3),
    pendLineRatioMed: r(median(live.map((xx) => (Math.abs(xx.gGravityOwn) > 1e-9 ? Math.abs(xx.mPendulum / xx.gGravityOwn) : Number.NaN)).filter(Number.isFinite)), 3),
    bankInertiaTwoMed: r(median(col(live, 'bankInertiaTwo')), 4),
    bankInertiaCtlMed: r(median(col(live, 'bankInertiaCtl')), 4),
    ankleBankTwoMed: r(median(absCol(live, 'ankleBankTwo')), 4),
    ankleBankCtlMed: r(median(absCol(live, 'ankleBankCtl')), 4),
    ankleBankGameMed: r(median(absCol(live, 'ankleBankGame')), 4),
    ankleBankRatioCtlMed: r(median(live.map((xx) => (Math.abs(xx.ankleBankGame) > 1e-12 ? Math.abs(xx.ankleBankCtl / xx.ankleBankGame) : Number.NaN)).filter(Number.isFinite)), 3),
    ankleBankRatioTwoMed: r(median(live.map((xx) => (Math.abs(xx.ankleBankGame) > 1e-12 ? Math.abs(xx.ankleBankTwo / xx.ankleBankGame) : Number.NaN)).filter(Number.isFinite)), 3),
    // --- step 3.4c: the roll row per source, the row's two halves, and the gains' own reach into it
    // The ledger's own twenty-three-way partition of the roll row, per-run medians of |·|, °/s². Printed for every
    // source so "per source" is the ledger's partition and not a grouping chosen after the fact; the sources that are
    // identically zero on this arm are printed as zero rather than dropped.
    ...Object.fromEntries(BANK_SOURCES.map((src) => [`gd_${src}`, r(median(live.map((xx) => Math.abs(xx.gDeck[src]))), 2)])),
    gDeckClosePeak: r(peak(absCol(live, 'gDeckClose')), 15),
    rollCmdMed: r(median(absCol(live, 'rollCmd')), 2),
    rollStateMed: r(median(absCol(live, 'rollState')), 2),
    cmdShareModelMed: r(median(col(live, 'cmdShareModel')), 4),
    cmdShareGameMed: r(median(col(live, 'cmdShareGame')), 4),
    cmdShareGamePeak: r(peak(col(live, 'cmdShareGame')), 4),
    cmdAuthModelMed: r(median(col(live, 'cmdAuthModel')), 1),
    cmdAuthModelContMed: r(median(col(live, 'cmdAuthModelCont')), 1),
    cmdAuthGameMed: r(median(col(live, 'cmdAuthGame')), 1),
    cmdAuthStepMed: r(median(col(live, 'cmdAuthStep')), 4),
    bZeroOffPeak: r(peak(col(live, 'bZeroOff')), 15),
    cmdAuthRatioMed: r(median(col(live, 'cmdAuthRatio')), 3),
    cmdAuthRatioLo: r(sorted(col(live, 'cmdAuthRatio'))[0] ?? Number.NaN, 3),
    cmdAuthRatioPeak: r(peak(col(live, 'cmdAuthRatio')), 3),
    // the five matched gaps: the model's term minus the game's, °/s², and the game's own side of each
    eWaterMed: r(median(absCol(live, 'eWater')), 2),
    eAnkleMed: r(median(absCol(live, 'eAnkle')), 2),
    eTwistMed: r(median(absCol(live, 'eTwist')), 2),
    eRestMed: r(median(absCol(live, 'eRest')), 2),
    eFeetFwdMed: r(median(absCol(live, 'eFeetFwd')), 2),
    gWaterBoardMed: r(median(absCol(live, 'gWaterBoard')), 2),
    gAnkleSrcMed: r(median(absCol(live, 'gAnkleSrc')), 2),
    gTwistSrcMed: r(median(absCol(live, 'gTwistSrc')), 2),
    gRestSrcMed: r(median(absCol(live, 'gRestSrc')), 2),
    eNetMed: r(median(absCol(live, 'eNet')), 2),
    eClosePeak: r(peak(absCol(live, 'eClose')), 15),
    shWaterMed: r(median(col(live, 'shWater')), 3),
    shAnkleMed: r(median(col(live, 'shAnkle')), 3),
    shTwistMed: r(median(col(live, 'shTwist')), 3),
    shRestMed: r(median(col(live, 'shRest')), 3),
    shFeetFwdMed: r(median(col(live, 'shFeetFwd')), 3),
    eWaterTwoMed: r(median(absCol(live, 'eWaterTwo')), 2),
    eAnkleTwoMed: r(median(absCol(live, 'eAnkleTwo')), 2),
    eTwistTwoMed: r(median(absCol(live, 'eTwistTwo')), 2),
    eRestTwoMed: r(median(absCol(live, 'eRestTwo')), 2),
    eFeetFwdTwoMed: r(median(absCol(live, 'eFeetFwdTwo')), 2),
    eNetTwoMed: r(median(absCol(live, 'eNetTwo')), 2),
    eCloseTwoPeak: r(peak(absCol(live, 'eCloseTwo2')), 15),
    shWaterTwoMed: r(median(live.map((xx) => (Math.abs(xx.eNetTwo) > 1e-9 ? Math.abs(xx.eWaterTwo / xx.eNetTwo) : Number.NaN)).filter(Number.isFinite)), 3),
    shRestTwoMed: r(median(live.map((xx) => (Math.abs(xx.eNetTwo) > 1e-9 ? Math.abs(xx.eRestTwo / xx.eNetTwo) : Number.NaN)).filter(Number.isFinite)), 3),
    ownWaterTwo: r(share(live.map((xx) => Math.abs(xx.eWaterTwo) >= Math.max(Math.abs(xx.eAnkleTwo), Math.abs(xx.eTwistTwo), Math.abs(xx.eRestTwo), Math.abs(xx.eFeetFwdTwo)))), 3),
    // which source's gap is the LARGEST on the tick, as a share of ticks: the per-source ownership, counted
    ownWater: r(share(live.map((xx) => Math.abs(xx.eWater) >= Math.max(Math.abs(xx.eAnkle), Math.abs(xx.eTwist), Math.abs(xx.eRest), Math.abs(xx.eFeetFwd)))), 3),
    ownAnkle: r(share(live.map((xx) => Math.abs(xx.eAnkle) > Math.max(Math.abs(xx.eWater), Math.abs(xx.eTwist), Math.abs(xx.eRest), Math.abs(xx.eFeetFwd)))), 3),
    ownRest: r(share(live.map((xx) => Math.abs(xx.eRest) > Math.max(Math.abs(xx.eWater), Math.abs(xx.eAnkle), Math.abs(xx.eTwist), Math.abs(xx.eFeetFwd)))), 3),
    // **Step 3.4f**: the datum's two halves in the command, and this round's own three closures. The three `Off`
    // columns are read as PEAKS over every tick of the run, because a closure is a worst case and not a median.
    heelDesignOffPeak: r(peak(absCol(ticks, 'heelDesignOff')), 18),
    refFlatOffPeak: r(peak(absCol(ticks, 'refFlatOff')), 18),
    superOffPeak: r(peak(absCol(ticks, 'superOff')), 18),
    cancelShareMed: r(median(absCol(live, 'cancelShare')), 4),
    tiltSameSignShare: r(share(ticks.map((xx) => xx.tiltSameSign === 1)), 3),
    // the gains' own reach (`GAINS=1`)
    cmdRebuildMed: r(median(col(live, 'cmdRebuild')), 4),
    cmdRebuildPeak: r(peak(col(live, 'cmdRebuild')), 4),
    gainPlantOffPeak: r(peak(col(live, 'gainPlantOff')), 15),
    gainRowOffPeak: r(peak(col(live, 'gainRowOff')), 15),
    gainRollSwingMed: r(median(col(live, 'gainRollSwing')), 3),
    gainSwingShareMed: r(median(col(live, 'gainSwingShare')), 4),
    gainSwingSharePeak: r(peak(col(live, 'gainSwingShare')), 4),
    gainCmdSwingMed: r(median(col(live, 'gainCmdSwing')), 5),
    gainSwingOverNetMed: r(median(col(live, 'gainSwingOverNet')), 4),
    gainSwingOverNetPeak: r(peak(col(live, 'gainSwingOverNet')), 4),
    gainRollSwingPointMed: r(median(absCol(live, 'gainRollSwingPoint')), 3),
    gainSwingPointOverNetMed: r(median(live.map((xx) => (Math.abs(xx.eNet) > 1e-9 ? Math.abs(xx.gainRollSwingPoint / xx.eNet) : Number.NaN)).filter(Number.isFinite)), 4),
    ankleRoomMed: r(median(col(live, 'ankleRoomHere')), 4),
    gainClampedShare: r(shareOf(live, 'gainClamped'), 3),
    // **The brief's measurement**: one recorded ride, four sets of gains. The same ticks, the same plant, the same
    // game row; only the command is each arm's own. `subst_<arm>` is the roll row's relative error, `substBank_<arm>`
    // the lean row's, and `substHelps_<arm>` the share of ticks the substituted command moves the row CLOSER.
    ...Object.fromEntries(COST_ARMS.flatMap((arm) => [
      [`subst_${arm.key}`, r(median(live.map((xx) => Math.abs(xx.relSubst[arm.key])).filter(Number.isFinite)), 3)],
      [`substBank_${arm.key}`, r(median(live.map((xx) => Math.abs(xx.relSubstBank[arm.key])).filter(Number.isFinite)), 3)],
      [`substHelps_${arm.key}`, r(share(live.filter((xx) => Number.isFinite(xx.substHelps[arm.key])).map((xx) => xx.substHelps[arm.key] === 1)), 3)],
      [`substAnkle_${arm.key}`, r(median(live.map((xx) => Math.abs(xx.eAnkleSubst[arm.key])).filter(Number.isFinite)), 2)],
      [`substTwist_${arm.key}`, r(median(live.map((xx) => Math.abs(xx.eTwistSubst[arm.key])).filter(Number.isFinite)), 2)],
      [`substSign_${arm.key}`, r(share(live.filter((xx) => Number.isFinite(xx.relSubst[arm.key]) && Math.abs(xx.rollAccGame) > 1e-9)
        .map((xx) => Math.sign(xx.relSubst[arm.key] * Math.abs(xx.rollAccGame) + xx.rollAccGame) === Math.sign(xx.rollAccGame))), 3)],
    ])),
    body: BODY ?? 'point',
    bodyJ: BODYJ ?? 1,
    cost: COST ?? 'off',
    // Step 3.4b: the ω₀ the arm's own cost function was built with, rad/s, read off the ridden plant at this run's own
    // stance and 7 m/s — the cost function's own constant, printed with the arm so no arm's number is reported
    // against another arm's constant.
    omegaLine: r(captureOmega(plantAt(7, STANCE_DEPTH[st], {}).y, 9.81, 'line'), 4),
    omegaFixed: r(captureOmega(plantAt(7, STANCE_DEPTH[st], { body: true }).y, 9.81, 'fixed'), 4),
    omegaSolved: r(captureOmega(plantAt(7, STANCE_DEPTH[st], { body: true }).y, 9.81, 'solved'), 4),
    omegaSolvedShipped: r(captureOmega(plantAt(7, STANCE_DEPTH[st], {}).y, 9.81, 'solved'), 4),
  };
  return out;
}

/**
 * **Step 3.4f, C4b: the additivity read off the GAME'S OWN `tick`, not off the probe's arithmetic.**
 *
 * `plant.ts`'s own 3.4f columns are built from `design`, `steadyTurn` and `predD` directly, so the additivity they
 * show is the probe's algebra. This check runs the shipped `PredictiveController.tick` itself — four controllers,
 * one tick each, the same sense line, the same speed, depth, limits and rail, and a tilt of 10° — and reads the four
 * commands it returns. At the first tick the estimate is zero and no command has been sent, so the four are exactly
 * the four cells of the table in the `Tick` comment, and
 *
 *     u_both + u_off  −  u_predict  −  u_ref  =  0
 *
 * must hold to the last bit if the two halves are additive **in the controller's own line**. Run once at startup,
 * printed as a `#` line beside the arm's own headline, and it rides nothing. With the tilt handed in as **zero** all
 * four must agree outright, which is C3's own read on the same four controllers.
 */
function additivity(tiltDeg: number): { resid: number; spread: number; raw: Record<string, number[]>; sent: Record<string, number[]> } {
  const sense = [0.02, 0.1, 0.01, 0, 0, -0.08, 0.05, 1, 0];
  const limits = { ankle: 0.25, twist: 40 };
  const flags: (DesignWeights['waterHeel'] | undefined)[] = [undefined, 'predict', 'ref', 'both'];
  const keys = ['off', 'predict', 'ref', 'both'];
  const raw: Record<string, number[]> = {};
  const sent: Record<string, number[]> = {};
  flags.forEach((wh, i) => {
    const c = new PredictiveController({ ...DEFAULT_WEIGHTS, ...(BODY ? { riderBody: BODY } : {}), ...(wh ? { waterHeel: wh } : {}) });
    const out2 = c.tick(sense, FACE[2], DEPTH, 0, 0, limits, 0, -tiltDeg / DEG);
    // **`raw` is the command BEFORE the clamp and `sent` after it** [R, `tick`: `this.raw[q] = u[q]` then the two
    // `Math.max/min`]. The additivity is a property of the control law, so it is read on `raw`; `sent` is printed
    // beside it because the clamp is exactly where the law stops being linear, and on these arms it bites.
    raw[keys[i]] = [c.raw[0], c.raw[1]];
    sent[keys[i]] = [out2[0], out2[1]];
  });
  let resid = 0;
  let spread = 0;
  for (let q = 0; q < 2; q += 1) {
    resid = Math.max(resid, Math.abs(raw.both[q] + raw.off[q] - raw.predict[q] - raw.ref[q]));
    for (const k of keys) spread = Math.max(spread, Math.abs(raw[k][q] - raw.off[q]));
  }
  return { resid, spread, raw, sent };
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
process.stdout.write(`\n# step 3.3p — the internal plant against the game, ${rows.length} runs, ${RIDER} rider, ${FELT ?? 'world'} filter, ledger ${LEDGER}, heel ${WHEEL ?? 'level'}, body ${BODY ?? 'point'}${BODYJ !== undefined ? ` x${BODYJ}` : ''}, cost ${COST ?? 'off'}\n`);
{
  const a10 = additivity(10);
  const a0 = additivity(0);
  process.stdout.write(`# step 3.4f C4b — the GAME'S OWN tick, four controllers, one tick each, ankle/twist:\n`);
  for (const k of ['off', 'predict', 'ref', 'both']) {
    process.stdout.write(`#    tilt 10°, ${k.padStart(7)}: raw ${a10.raw[k].map((v) => v.toFixed(9).padStart(14)).join(' ')}`
      + `  sent ${a10.sent[k].map((v) => v.toFixed(9).padStart(14)).join(' ')}\n`);
  }
  process.stdout.write(`#    |raw_both + raw_off − raw_predict − raw_ref| = ${a10.resid.toExponential(3)} — additive in the controller's`
    + ` own line, pre-clamp; the arms are not one tick (spread from off ${a10.spread.toExponential(3)})\n`);
  process.stdout.write(`#    tilt 0 (C3): spread from off ${a0.spread.toExponential(3)}, residual ${a0.resid.toExponential(3)}\n`);
}
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
process.stdout.write(`# P11 (3.4c) the roll row PER SOURCE at a fixed trajectory — the model's term minus the game's, °/s² median:\n`);
process.stdout.write(`#    water+board ${sh('eWaterMed')} (game ${sh('gWaterBoardMed')}) | ankle ${sh('eAnkleMed')} (game ${sh('gAnkleSrcMed')}) | twist ${sh('eTwistMed')} (game ${sh('gTwistSrcMed')}) | rest ${sh('eRestMed')} (game ${sh('gRestSrcMed')}) | feetFwd ${sh('eFeetFwdMed')} (no game source)\n`);
process.stdout.write(`#    the net error the five partition ${sh('eNetMed')} °/s²; shares of |net|: water ${sh('shWaterMed')} ankle ${sh('shAnkleMed')} twist ${sh('shTwistMed')} rest ${sh('shRestMed')} feetFwd ${sh('shFeetFwdMed')}\n`);
process.stdout.write(`#    LARGEST gap on the tick, share of ticks: water ${sh('ownWater')} ankle ${sh('ownAnkle')} rest ${sh('ownRest')}\n`);
process.stdout.write(`#    the TWO-BODY plant's own five on the same ticks: water ${sh('eWaterTwoMed')} ankle ${sh('eAnkleTwoMed')} twist ${sh('eTwistTwoMed')} rest ${sh('eRestTwoMed')} feetFwd ${sh('eFeetFwdTwoMed')}; net ${sh('eNetTwoMed')}; water's share ${sh('shWaterTwoMed')} rest's ${sh('shRestTwoMed')}, water largest in ${sh('ownWaterTwo')}; closure ${peak(num('eCloseTwoPeak')).toExponential(2)}\n`);
process.stdout.write(`#    controls: the ledger's own 23-way partition ${peak(num('gDeckClosePeak')).toExponential(2)} rel, the five gaps' partition of the net ${peak(num('eClosePeak')).toExponential(2)} rel\n`);
process.stdout.write(`#    the ledger's roll row per source, |median| °/s²: ${BANK_SOURCES.map((s2) => `${s2} ${sh(`gd_${s2}`)}`).join(' | ')}\n`);
process.stdout.write(`# P12 (3.4c) the half of the roll row the GAINS can reach — the command's own term, °/s²:\n`);
process.stdout.write(`#    command's half ${sh('rollCmdMed')} vs the state's half ${sh('rollStateMed')}; its share of the model's row ${sh('cmdShareModelMed')}, of the GAME's row ${sh('cmdShareGameMed')} (peak ${sh('cmdShareGamePeak')})\n`);
process.stdout.write(`#    the ankle rest's own AUTHORITY over the roll row, °/s² per rad, magnitudes only, NEVER across frames:\n`);
process.stdout.write(`#      INSTANTANEOUS: model ${sh('cmdAuthModelContMed')} vs GAME ${sh('cmdAuthGameMed')}; ratio ${sh('cmdAuthRatioMed')} (lo ${sh('cmdAuthRatioLo')}, peak ${sh('cmdAuthRatioPeak')})\n`);
process.stdout.write(`#      STEP-AVERAGED (what the substitution moves): model ${sh('cmdAuthModelMed')}; the ZOH's own attenuation on the model's side ${sh('cmdAuthStepMed')}\n`);
process.stdout.write(`#      the commands enter the plant ONLY through the two muscle-lag rows: max |B| elsewhere ${peak(num('bZeroOffPeak')).toExponential(2)}\n`);
if (GAINS) {
  process.stdout.write(`# P13 (3.4c) the GAINS at a fixed state — four designs rebuilt at the controller's own exact point every tick:\n`);
  process.stdout.write(`#    P1 the identity: |ΔΦ|,|ΔΓ| across the four cost arms peak ${peak(num('gainPlantOffPeak')).toExponential(2)}; the roll row's own difference peak ${peak(num('gainRowOffPeak')).toExponential(2)} °/s²\n`);
  process.stdout.write(`#    the command rebuild's own control (exact point vs the ridden blend) ${sh('cmdRebuildMed')} rel median, ${sh('cmdRebuildPeak')} peak\n`);
  process.stdout.write(`#    the SWING another gain set's command makes in the model's roll row: ${sh('gainRollSwingMed')} °/s² median, ${sh('gainSwingShareMed')} of the game's own row (peak ${sh('gainSwingSharePeak')}); ankle command ${sh('gainCmdSwingMed')} rad\n`);
process.stdout.write(`#    … over the roll row's own NET error: ${sh('gainSwingOverNetMed')} median (peak ${sh('gainSwingOverNetPeak')}); the \`point\` arm alone ${sh('gainRollSwingPointMed')} °/s², ${sh('gainSwingPointOverNetMed')} of the net\n`);
  process.stdout.write(`#    the clamp, read: the ankle's own bound ${sh('ankleRoomMed')} rad, a command sits ON it in ${sh('gainClampedShare')} of ticks\n`);
  process.stdout.write(`# P14 (3.4c) THE BRIEF'S MEASUREMENT — one recorded ride, four sets of gains, the SAME ticks:\n`);
  process.stdout.write(`#    the roll row's rel err per gain set: ${COST_ARMS.map((a2) => `${a2.key} ${sh(`subst_${a2.key}`)}`).join(' | ')}\n`);
  process.stdout.write(`#    the lean row's: ${COST_ARMS.map((a2) => `${a2.key} ${sh(`substBank_${a2.key}`)}`).join(' | ')}\n`);
  process.stdout.write(`#    the substituted command moves the roll row CLOSER in: ${COST_ARMS.map((a2) => `${a2.key} ${sh(`substHelps_${a2.key}`)}`).join(' | ')} of ticks\n`);
  process.stdout.write(`#    the roll row's SIGN right per gain set: ${COST_ARMS.map((a2) => `${a2.key} ${sh(`substSign_${a2.key}`)}`).join(' | ')}\n`);
  process.stdout.write(`#    the two sources the command reaches, |median| °/s²: ankle ${COST_ARMS.map((a2) => `${a2.key} ${sh(`substAnkle_${a2.key}`)}`).join(' / ')} ; twist ${COST_ARMS.map((a2) => `${a2.key} ${sh(`substTwist_${a2.key}`)}`).join(' / ')}\n`);
}
