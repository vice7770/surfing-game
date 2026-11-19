/**
 * **Step 3.5i: does the automatic twist actuator add mechanical work to the torso/board twist joint, and WHY?**
 *
 * The owner rode `claude/ride-everything` and reported, in tall, crouch and Compress alike: *"the board starts going
 * left and right and the surfer cannot stabilize it and falls. Like a skate board going down the lane"*, clarified
 * since as *"weaving start starts on its own, no turn needed"*. Two earlier rounds measured the chain backwards to
 * the ankle (step 3.5g/3.5h) and ended at the question this file answers: **what winds the torso up**, given that
 * the ankle's reversal is 91 % the feedback coefficients being re-weighted by a torso wound to 46° with nothing
 * asked of it.
 *
 * ⚠️ **This file re-measures a claim, it does not originate it.** The reviewer reported ≈ +10 J of active twist work
 * on `cue` wave 1 over `+1.000 → +1.533 s` after standing, positive in all 32 intervals, and ≈ +0.007 J on wave 6.
 * Everything here is a second instrument on the same saved motion.
 *
 * ## What it reads, and what it does not
 *
 * The **saved control-tick record** of step 3.5h's `cue` probe — the eight arguments `AttachedRider` hands
 * `PredictiveController.tick` [R, `AttachedRider.ts:3724`] plus the two commands it returned, recorded by a wrapper
 * on the probe's side. **Nothing re-simulates.** The controller is replayed on the saved senses in the saved order,
 * which is an *attribution of the command* and **not** a prediction about a ride: a changed command changes the next
 * sense, and no arm here closes that loop.
 *
 * ## Signs, units, frames and the AXIS, stated once
 *
 * The joint is the **upper body's yaw relative to the board, about the board's own up axis** (`AttachedRider.up`).
 * It is **not** the board's roll axis and **not** the shipped yaw ledger's axis, and nothing here may be added to
 * either (the roll partition of step 3.5h is a different axis and a different ledger; the yaw ledger books
 * `y.addedMass += waterTy` [R, `BoardBody.ts:1483`] and its own source says that is why its `rider` residual cannot
 * close [R, `:1496–1503`]).
 *
 * * **`tb.angle`, rad** — the physical relative twist, the game's own sign. `sense[3] = −tb.angle` and
 *   `sense[4] = −tb.rate` [R, `AttachedRider.ts:3706–3707`], so the physical angle is `−sense[3]` and the physical
 *   relative rate is `−sense[4]`, both read off the recorded sense vector.
 * * **`u[1]`, N·m** — the twist command in `predictiveBalance.ts`'s own signs. `heldTwist = −u[1]`
 *   [R, `AttachedRider.ts:3728`] is the torque the feet put on the **board**; `tb.active` chases it through
 *   `MOTOR_LAG` [R, `:3742`]; and `tb.spring = tb.active + …` enters the upper body's update as
 *   `(I·upper − h·spring + α·turned)/(I + α)` [R, `:5004`], so **a positive `spring` pushes the upper body's yaw
 *   DOWN and the moment on the upper body is `−spring`.** The active part of it is therefore `−tb.active`, which
 *   chases **`+u[1]`**: the twist command, read as a moment on the upper body, is `+u1` **in `tb.angle`'s own sign**.
 * * **The actuator's generalised work**, J: the actuator puts `+M` on the upper body and `−M` on the board through
 *   the planted feet (*"a limb's force with its reaction"* [R, `:553`]), so its work is
 *   `M·ω_upper + (−M)·ω_board = M·(ω_upper − ω_board) = M·ω_rel`, i.e.
 *
 *       W = Σ  u1 · Δ(tb.angle)        [J]
 *
 *   over the saved 60 Hz tick intervals. `u1` raw is the command; `u1` lagged is the first-order filter
 *   `tb.active += (heldTwist − tb.active)(1 − e^(−h/MOTOR_LAG))` carried from the ride's first tick. The filter runs
 *   on the **substep** in `src/`, but `heldTwist` is held constant across a frame, so 16 substeps compose to one
 *   frame step of `1 − e^(−CONTROL_STEP/MOTOR_LAG)` exactly.
 * * **`speed`** is the **through-water along-heading** speed on the rider's 3-D heading [R, `:3714`], not an
 *   over-ground magnitude. **`depth`** is `yawDepth`, m. Degrees appear in `*Deg` columns only, converted once.
 *
 * ## The positive control, without which nothing below is readable
 *
 * The replay calls **the shipped `PredictiveController.tick`** — not a rewrite of it — on the saved arguments, and
 * the run is void unless the returned `u0`, `u1`, `raw0`, `raw1` reproduce the recorded ones **bit for bit**. The
 * weights are read off a **live** rider built on the owner's own address through the game's own switch parsing, so
 * the design table is the table the ride ran on; they are never retyped.
 *
 * ## The decomposition, and the trap in it
 *
 * With zero bank and zero twist asked, `steadyTurn` returns the zero equilibrium, so
 * `u1 = −b1 − Σ_j k[1][j]·x̂[j]` [R, `predictiveBalance.ts:1602–1607`] — pure state feedback on the **predicted**
 * state plus the estimated bias. Each state's share of the work is `Σ_i (−k[1][j]·x̂[j])_i · Δθ_i`.
 *
 * ⚠️ **The shares largely cancel and must be reported with the cancellation beside them.** They are a decomposition
 * of **one controller output on saved motion** — not independent energy sources — and attributing the net to any one
 * of them is reading a difference of large numbers as a cause.
 *
 * Reads only. Imports nothing it writes to; changes no constant, no switch and no pose.
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/twist-work.ts -o <s>/raw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '' };\n" > <s>/twist-work.mjs && cat <s>/raw.mjs >> <s>/twist-work.mjs
 *     cd <s> && env TICKS=<s>/cue-ticks.jsonl node twist-work.mjs
 */
import { readFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { RideSession } from '../../../../src/physics/RideSession';
import { CONTROL_STEP, PredictiveController, SCHEDULE_SPEEDS, TWIST_DAMPING, TWIST_STIFFNESS, type Design, type DesignWeights } from '../../../../src/physics/predictiveBalance';
import { MOTOR_LAG } from '../../../../src/physics/humanBalance';
import { eigenvalues } from '../../../../src/physics/rollModel';
import { type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const TICKS = process.env.TICKS ?? '';
const WAVES = (process.env.WAVES ?? '1,2,6,11').split(',').map(Number);
const ADDRESS = process.env.ADDRESS ?? '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const SEED = Number(process.env.SEED ?? 2);
/** The window measured, in seconds after the stand. Edges snap to the nearest tick. */
const FROM = Number(process.env.FROM ?? 1.0);
const TO = Number(process.env.TO ?? 1.533);
/** A second, wider window, so the result is never a single window's artefact. */
const FROM2 = Number(process.env.FROM2 ?? 0.9);
const TO2 = Number(process.env.TO2 ?? 1.533);
/** Print the tick-by-tick series for this wave over the wider window; `0` prints none. */
const SERIES = Number(process.env.SERIES ?? 1);

const out = (s: string): void => { process.stdout.write(`${s}\n`); };
const f = (v: number, d = 4): string => (Number.isFinite(v) ? v.toFixed(d) : '–');
const pad = (s: string, w: number): string => s.padStart(w);

interface TickRec {
  frame: number; tAt: number; n: number;
  sense: number[]; speed: number; depth: number; bank: number; twist: number;
  ankleLo: number; ankleHi: number; twistLim: number; rail: number; tilt: number;
  u0: number; u1: number; raw0: number; raw1: number;
}
interface Block { kind: string; arm: string; script: string; wave: number; stand: number | null; fell: number | null; ticks: TickRec[] }

// ---------------------------------------------------------------------------------------------------------------
// The shipped weights, off a live rider on the owner's own address (step 3.5h's recipe, which this file reuses so
// the two rounds read the same design table).
// ---------------------------------------------------------------------------------------------------------------
const RIDER_KEYS = [
  'stroke', 'swim', 'extension', 'duckBody', 'snap', 'snapQuick', 'snapPivot', 'snapRecentre', 'snapDepth', 'snapStamp',
  'agile', 'legDrive', 'hull', 'railSuction', 'compressPull', 'carveFlex', 'snapLegs', 'snapCross', 'legPower', 'rider',
  'feltFrame', 'kneeRoom', 'stanceReach', 'ankleLimit', 'ankleRange', 'bankClamp', 'bodyBank', 'askCap', 'stanceDeep',
  'deepen', 'armCarry', 'trunk', 'buoyFrame', 'waterHeel', 'mountAgree', 'riderBody', 'riderCost', 'plantFloor',
  'deckHollow', 'snapUpturn',
] as const;
type Config = SurfZoneConfig & Record<string, unknown>;
function configFor(search: string): Config {
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  return { ...surfZoneConfigFor(settings, SEED, true), compute: 'cpu' } as Config;
}
const config = configFor(ADDRESS);
const options: Record<string, unknown> = {};
for (const key of RIDER_KEYS) if (config[key] !== undefined) options[key] = config[key];
const live = new RideSession(options as ConstructorParameters<typeof RideSession>[0]);
const liveCtrl = live.rider.predictor as unknown as { weights?: DesignWeights; turn: 'linear' | 'tan' };
const WEIGHTS = liveCtrl.weights;
const TURN = liveCtrl.turn;
out(`# address: ${ADDRESS}`);
out(`# weights: ${WEIGHTS ? JSON.stringify(WEIGHTS) : 'undefined (DEFAULT_WEIGHTS)'}`);
out(`# turn: ${TURN}`);
out(`# MOTOR_LAG ${MOTOR_LAG} s, CONTROL_STEP ${f(CONTROL_STEP, 6)} s, lag per frame ${f(1 - Math.exp(-CONTROL_STEP / MOTOR_LAG), 6)}`);

/** The plant's state names, in `predictiveBalance.ts`'s own order and signs [R, `:18`]. */
const STATE = ['phi roll', 'phi rate', 'theta bank', 'bank rate', 'r boardYaw', 'beta slip', 'theta_t twist', 'omega_u upper', 'delta ankleLag', 'tau_a twistLag', 'heave', 'heaveRate', 'pitch', 'pitchRate'];
/** Which state index carries the twist joint's own angle and its relative rate's two parts. */
const I_TWIST = 6;
const I_UPPER = 7;
const I_BOARDYAW = 4;

const blendOn = (ctrl: PredictiveController, speed: number, depth: number, rail: number): Design =>
  (ctrl as unknown as { blend: (s: number, d: number, r: number) => Design }).blend(speed, depth, rail);

interface Row {
  rel: number; dt: number;
  /** Physical relative twist, rad, and its change over this interval. */
  angle: number; dAngle: number; rate: number;
  /** The command, N·m, as a moment on the upper body in `tb.angle`'s own sign: raw, and through MOTOR_LAG. */
  u1: number; lagBefore: number; lagAfter: number;
  /** `u1`'s own terms: `−k[1][j]·(x̂[j] − ref.x[j])` for each state, plus the reference and the bias. */
  terms: number[]; refU: number; bias: number;
  /** The gain row's twist entries, for the sign audit. */
  kTwist: number; kUpper: number; kBoardYaw: number;
  /** The predicted state the gain multiplies, and the error `x̂ − ref.x` it actually multiplies. */
  xh: number[]; err: number[];
  speed: number;
  /** The twist and bank the PLAYER asked for on this tick, rad, in the controller's own signs. */
  asked: number; bankAsked: number;
}

interface Replay { wave: number; stand: number; fell: number | null; rows: Row[]; worst: number; nStates: number; clipped: number }

function replay(block: Block): Replay {
  const ctrl = new PredictiveController(WEIGHTS, TURN);
  const scratch = new PredictiveController(WEIGHTS, TURN);
  const rows: Row[] = [];
  let worst = 0;
  let clipped = 0;
  let nStates = 0;
  let lag = 0;
  const lam = 1 - Math.exp(-CONTROL_STEP / MOTOR_LAG);
  for (const t of block.ticks) {
    const u = ctrl.tick(t.sense, t.speed, t.depth, t.bank, t.twist, { ankle: [t.ankleLo, t.ankleHi], twist: t.twistLim }, t.rail, t.tilt);
    // ⭐ The positive control: the shipped `tick` on the saved arguments must return the recorded command exactly.
    worst = Math.max(worst, Math.abs(u[0] - t.u0), Math.abs(u[1] - t.u1), Math.abs(ctrl.raw[0] - t.raw0), Math.abs(ctrl.raw[1] - t.raw1));
    if (Math.abs(ctrl.raw[1] - u[1]) > 1e-12) clipped += 1;
    const d = blendOn(scratch, t.speed, t.depth, t.rail);
    const n = d.phi.length;
    nStates = n;
    const k = d.k[1];
    const terms = new Array<number>(n);
    for (let j = 0; j < n; j += 1) terms[j] = -k[j] * (ctrl.predicted[j] - ctrl.reference.x[j]);
    const before = lag;
    lag += (u[1] - lag) * lam;
    rows.push({
      rel: t.tAt - block.ticks[0].tAt, dt: CONTROL_STEP,
      angle: -t.sense[3], dAngle: 0, rate: -t.sense[4],
      u1: u[1], lagBefore: before, lagAfter: lag,
      terms, refU: ctrl.reference.u[1], bias: -ctrl.bias[1],
      kTwist: k[I_TWIST], kUpper: k[I_UPPER], kBoardYaw: k[I_BOARDYAW],
      xh: ctrl.predicted.slice(0, n), err: Array.from({ length: n }, (_, j) => ctrl.predicted[j] - ctrl.reference.x[j]), speed: t.speed,
      asked: t.twist, bankAsked: t.bank,
    });
  }
  for (let i = 0; i + 1 < rows.length; i += 1) rows[i].dAngle = rows[i + 1].angle - rows[i].angle;
  rows[rows.length - 1].dAngle = NaN;
  return { wave: block.wave, stand: block.stand ?? 0, fell: block.fell, rows, worst, nStates, clipped };
}

/**
 * A row with its time after the stand. ⚠️ The record's `stand` is written rounded, so a window edge can miss its own
 * tick by ~3e−6 s; every edge below snaps to the nearest tick (half a control step) rather than to the literal time.
 */
interface RowWithStand extends Row { relToStand: number }

/**
 * ⭐ **The index and sign anchor, which the whole decomposition rests on.** `predictiveBalance.ts`'s docstring states
 * the state order [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a] [R, `:18`], but a decomposition that trusted a comment would
 * be worthless, so this prints the design's own `c` (which state each sense reads) and `gamma`'s twist column (which
 * state the twist command drives). The expected anchors:
 *
 *   * `c[3]` — the twist-angle sense, `sense[3] = −tb.angle` — must pick out exactly one state, and that state is
 *     the joint's own angle in the model's (negated) sign.
 *   * `gamma[·][1]` — the twist command's column — must enter the lagged-torque state and nothing else directly.
 *   * `twistRows` books the legs' torque on the **board** as `+stiffness·θ_t + damping·θ̇_t + τ`
 *     [R, `rollModel.ts:842–850`] and the upper body's row as the same over `−inertia`, which is the game's
 *     `tb.spring` on the board's `kick` [R, `AttachedRider.ts:4618, 4621`] with the upper body taking `−spring`
 *     [R, `:5004`] — the same split, with the model's whole yaw axis negated against the engine's.
 */
function anchors(): void {
  const scratch = new PredictiveController(WEIGHTS, TURN);
  const d = blendOn(scratch, 5, 0, 0);
  const n = d.phi.length;
  out('');
  out('## The anchor: which state each sense reads, and which state the twist command drives (design at 5.0 m/s, depth 0, rail 0)');
  out(`${pad('sense', 7)} ${Array.from({ length: n }, (_, j) => pad(String(j), 8)).join(' ')}`);
  for (let i = 0; i < d.c.length; i += 1) out(`${pad(`c[${i}]`, 7)} ${d.c[i].slice(0, n).map((v) => pad(f(v, 3), 8)).join(' ')}`);
  out(`${pad('gamma u_t', 9)} ${d.gamma.map((row) => pad(f(row[1], 5), 8)).join(' ')}`);
  out(`${pad('k[1]', 9)} ${d.k[1].slice(0, n).map((v) => pad(f(v, 3), 8)).join(' ')}`);
  out(`${pad('k[0]', 9)} ${d.k[0].slice(0, n).map((v) => pad(f(v, 3), 8)).join(' ')}`);
}

/**
 * ⭐ **The twist gain row across the schedule, on the design table alone — no ride, no saved tick.** The command's
 * own twist term is `−k[1][θ_t]·θ̂_t`, and the model's `θ_t` is `−tb.angle`, so that term is `+k[1][θ_t]·tb.angle`:
 * **a POSITIVE `k[1][θ_t]` puts the actuator's moment on the SAME side as the angle the reference wants nulled.**
 */
function schedule(): void {
  const scratch = new PredictiveController(WEIGHTS, TURN);
  out('');
  out('## The twist gain row across the schedule (depth 0, rail 0). Sign, not size, is the finding.');
  out('   `net own-angle` is `k[1][theta_t] - TWIST_STIFFNESS`, N.m/rad: the joint\'s whole moment per rad of its own');
  out('   twist, active plus passive. **POSITIVE means the moment winds the joint FURTHER - a negative spring.**');
  out(`${pad('speed m/s', 10)} ${pad('k[1][theta_t]', 14)} ${pad('net own-angle', 14)} ${pad('k[1][omega_u]', 14)} ${pad('k[1][r]', 10)} ${pad('k[1][phi]', 10)} ${pad('k[1][theta]', 12)} ${pad('k[1][beta]', 12)}`);
  for (const v of SCHEDULE_SPEEDS) {
    const d = blendOn(scratch, v, 0, 0);
    const k = d.k[1];
    out(`${pad(f(v, 1), 10)} ${pad(f(k[I_TWIST], 4), 14)} ${pad(f(k[I_TWIST] - TWIST_STIFFNESS, 4), 14)} ${pad(f(k[I_UPPER], 4), 14)} ${pad(f(k[I_BOARDYAW], 4), 10)} ${pad(f(k[0], 4), 10)} ${pad(f(k[2], 4), 12)} ${pad(f(k[5], 4), 12)}`);
  }
  out(`   TWIST_STIFFNESS ${TWIST_STIFFNESS} N.m/rad, TWIST_DAMPING ${TWIST_DAMPING} N.m.s/rad [R, predictiveBalance.ts:587]; the table's knots are ${SCHEDULE_SPEEDS[0]}-${SCHEDULE_SPEEDS[SCHEDULE_SPEEDS.length - 1]} m/s and anything slower is CLAMPED onto the first.`);
}

/**
 * ⛔ **The other half of the question, and the FIRST version of this section was WRONG TWICE.** It first read a
 * 20 deg DIRECT twist ask and reported that the ask "still reaches the joint". That is plumbing and nothing more,
 * because in ordinary play nobody asks for twist:
 *
 *   * `Controls.ts:147` leaves `rotate` undefined (the camera swing took that stick, the owner, 2026-10-22) and
 *     `RideSession.ts:449` defaults it to **NaN**;
 *   * `twistStep` then asks **ZERO** unless Snap is held [R, `AttachedRider.ts:3825`];
 *   * an ordinary steer asks for **BANK** (`leanAsked`), which `tick` receives as `bankAsked`, not as a twist; and
 *   * `steadyTurn` assigns `x[6] = twist` **outright** [R, `predictiveBalance.ts:1413`], so a 20 deg ask appearing as
 *     20 deg of reference twist is an assignment echoed back, not a loop shown to track.
 *
 * ⛔ **And the SECOND version was wrong too**: it printed `ref.u[1]`, the reference's own feed-forward, which is
 * ~0 for a bank ask, and concluded the twist actuator is idle in a turn. **It is not.** The command issued is
 * `raw[1] = ref.u[1] - b1 - sum k[1][j]*(xhat[j] - ref.x[j])`, and **a bank ask puts a non-zero REFERENCE STATE**
 * (the bank, the board's yaw rate, the ankle's rest), so the gain row acting on `-ref.x` commands a real twist
 * torque with the direct twist ask at zero. ⭐ **The bank and the twist share one active torque channel.** `raw[1]`
 * is therefore printed beside `ref.u[1]`, and the per-degree slope with it.
 *
 * ⚠️ These are first ticks with ZERO senses, so `xhat` is zero and the number isolates the reference's own
 * contribution. They are not a ride. `rail` is the SCHEDULE rail, which `AttachedRider` derives from the lean asked
 * [R, `AttachedRider.ts:3719-3722`]; the rows state the rail they used rather than pretending to model it.
 */
function askPath(): void {
  out('');
  out('## ⭐⭐ What an ordinary BANK ask does to the TWIST actuator (zero senses, zero direct twist ask)');
  out('   (`ref.u[1]` is the reference\'s own feed-forward; `raw[1]` is the command actually issued, which is what the');
  out('    joint feels. The difference is the gain row acting on the REFERENCE\'S OWN non-zero state, `-k[1].ref.x`.)');
  for (const [v, railDeg] of [[5, 0], [6.7, 0.192], [8, 0]] as const) {
    out('');
    out(`   design at ${f(v, 2)} m/s, depth 0, rail ${f(railDeg, 3)} deg`);
    out(`   ${pad('bank asked deg', 15)} ${pad('ref twist deg', 14)} ${pad('ref bank deg', 13)} ${pad('ref yaw deg/s', 14)} ${pad('ref.u[1] Nm', 12)} ${pad('raw[1] Nm', 11)} ${pad('N.m per deg', 12)}`);
    for (const bankDeg of [0, 1.3369, -1.3369, 10, 20, 30, 40]) {
      const probe = new PredictiveController(WEIGHTS, TURN);
      probe.tick(new Array<number>(9).fill(0), v, 0, -(bankDeg / DEG), 0, { ankle: [-0.25, 0.25], twist: 100 }, (railDeg / DEG), 0);
      const slope = bankDeg === 0 ? NaN : probe.raw[1] / bankDeg;
      out(`   ${pad(f(bankDeg, 4), 15)} ${pad(f(-probe.reference.x[I_TWIST] * DEG, 4), 14)} ${pad(f(-probe.reference.x[2] * DEG, 3), 13)} ${pad(f(-probe.reference.x[I_BOARDYAW] * DEG, 3), 14)} ${pad(f(probe.reference.u[1], 3), 12)} ${pad(f(probe.raw[1], 3), 11)} ${pad(f(slope, 3), 12)}`);
    }
  }
  out('');
  out('## ⛔ Plumbing only: a DIRECT twist ask, which nothing in ordinary play ever sends');
  out('   (`steadyTurn` assigns `x[6] = twist` outright, so the reference echoing the ask is not a tracking result)');
  out(`   ${pad('stateScale[6]', 24)} ${pad('q[6][6]', 9)} ${pad('ask deg', 9)} ${pad('ref twist deg', 15)} ${pad('ref.u[1] Nm', 12)} ${pad('raw[1] Nm', 11)} ${pad('k[1][theta_t]', 14)}`);
  const ship = (WEIGHTS as DesignWeights).stateScale[6];
  for (const s6 of [ship, 0.15, 0.05]) {
    const w: DesignWeights = { ...(WEIGHTS as DesignWeights), stateScale: (WEIGHTS as DesignWeights).stateScale.map((v, i) => (i === 6 ? s6 : v)) };
    const d = blendOn(new PredictiveController(w, TURN), 5, 0, 0);
    for (const askDeg of [0, 20]) {
      const probe = new PredictiveController(w, TURN);
      probe.tick(new Array<number>(9).fill(0), 5, 0, 0, -(askDeg / DEG), { ankle: [-0.25, 0.25], twist: 100 }, 0, 0);
      const tag = s6 === ship ? 'SHIPPED' : 'counterfactual only';
      out(`   ${pad(`${f(s6, 3)} ${tag}`, 24)} ${pad(f(1 / (s6 * s6), 1), 9)} ${pad(f(askDeg, 1), 9)} ${pad(f(-probe.reference.x[I_TWIST] * DEG, 3), 15)} ${pad(f(probe.reference.u[1], 3), 12)} ${pad(f(probe.raw[1], 3), 11)} ${pad(f(d.k[1][I_TWIST], 3), 14)}`);
    }
  }
}

/**
 * ⛔ **Counterfactual design reads, for the owner's ruling. NOT a change and NOT a recommendation.** Nothing under
 * `src/` moves: a design is built offline at a different `stateScale` and asked two questions — does the release
 * that pumps the joint still pump, and does a deliberate 20 deg ask still reach the reference? An open-loop design
 * read cannot say how a ride would feel, and every "fix" proposed from a single trace on this track has failed.
 *
 * The two weights on trial are the ones the mechanism points at: `stateScale[6]`, the torso twist the cost calls
 * acceptable (0.5 rad = 28.65 deg), and `stateScale[7]`, the upper body's yaw rate it calls acceptable (1 rad/s =
 * 57.3 deg/s, the LOOSEST weight in the whole cost at `q = 1`, against 2500 on the slip). The ride reached 51.10 deg
 * and 218.33 deg/s.
 */
function levers(): void {
  const scales = (WEIGHTS as DesignWeights).stateScale;
  out('');
  out('## ⛔ Counterfactual design reads (NOT a change): which weight moves the pump, and does the ask survive?');
  out('   (design at 5.0 m/s, depth 0, rail 0; `omega_u work` is the 1 rad/s upper-body-rate release of `releases`)');
  out(`   ${pad('stateScale[6],[7]', 18)} ${pad('k[1][theta_t]', 14)} ${pad('k[1][omega_u]', 14)} ${pad('omega_u work mJ', 16)} ${pad('peak twist deg', 15)} ${pad('pure-twist work mJ', 19)} ${pad('ref twist for 20 deg ask', 25)}`);
  const arms: [number, number, string][] = [
    [scales[6], scales[7], 'SHIPPED'],
    [0.15, scales[7], 'torso tighter'],
    [scales[6], 0.35, 'upper rate tighter'],
    [scales[6], 0.2, 'upper rate tighter'],
  ];
  for (const [s6, s7, tag] of arms) {
    const w: DesignWeights = { ...(WEIGHTS as DesignWeights), stateScale: scales.map((v, i) => (i === 6 ? s6 : i === 7 ? s7 : v)) };
    const d = blendOn(new PredictiveController(w, TURN), 5, 0, 0);
    const n = d.phi.length;
    const k = d.k;
    const release = (st: number, size: number): { work: number; peak: number } => {
      let x = new Array<number>(n).fill(0);
      x[st] = size;
      let work = 0;
      let peak = 0;
      for (let i = 0; i * CONTROL_STEP < 2; i += 1) {
        const u1 = -k[1].reduce((acc, kk, j) => acc + kk * x[j], 0);
        const u0 = -k[0].reduce((acc, kk, j) => acc + kk * x[j], 0);
        const before = -x[I_TWIST];
        x = d.phi.map((row, a) => row.reduce((acc, val, j) => acc + val * x[j], 0) + d.gamma[a][0] * u0 + d.gamma[a][1] * u1);
        work += u1 * (-x[I_TWIST] - before);
        if (Math.abs(x[I_TWIST]) > Math.abs(peak)) peak = x[I_TWIST];
      }
      return { work, peak };
    };
    const ru = release(I_UPPER, 1);
    const rt = release(I_TWIST, 0.5);
    const probe = new PredictiveController(w, TURN);
    probe.tick(new Array<number>(9).fill(0), 5, 0, 0, -(20 / DEG), { ankle: [-0.25, 0.25], twist: 100 }, 0, 0);
    out(`   ${pad(`${f(s6, 2)}, ${f(s7, 2)} ${tag}`, 18)} ${pad(f(k[1][I_TWIST], 3), 14)} ${pad(f(k[1][I_UPPER], 3), 14)} ${pad(f(1000 * ru.work, 1), 16)} ${pad(f(-ru.peak * DEG, 3), 15)} ${pad(f(1000 * rt.work, 1), 19)} ${pad(`${f(-probe.reference.x[I_TWIST] * DEG, 3)} deg`, 25)}`);
  }
}

/**
 * ⭐⭐ **The decisive separation: is the positive own-angle gain an INSTABILITY, or a designed trade inside a stable
 * loop?** A single entry's sign cannot answer that - an optimal law may push one state the "wrong" way while the
 * loop as a whole converges through the others. So this runs the **designed loop itself**, with no water, no
 * disturbance and no game: the design's own discrete plant `x <- phi x + gamma u` driven by its own law `u = -k x`,
 * released from a pure twist of 10 deg and nothing else.
 *
 * It reports the closed loop's spectral radius (|lambda| < 1 is a loop that converges), how the joint's own angle
 * moves, and **the actuator's work on the joint over the same decay, by the same formula the saved-ride columns
 * use** (`sum u1 * d(tb.angle)`, with `tb.angle = -theta_t`). ⚠️ It is the DESIGN's own linear model, which has no
 * water disturbance, no sensing delay, no estimator, no soft stop (the game's `TWIST_STOP` is 2000 N.m/rad past
 * 0.87 rad and the design carries only `TWIST_STIFFNESS` 20) and no actuator bound. It says what the controller was
 * asked to do, not what a ride does.
 */
function designedLoop(): void {
  const scratch = new PredictiveController(WEIGHTS, TURN);
  out('');
  out('## ⭐ The DESIGNED loop, released from a pure 10 deg torso twist. No water, no disturbance, no game.');
  out('   (its own discrete plant under its own `u = -k x`; work by the same formula as the saved-ride columns)');
  out(`${pad('speed m/s', 10)} ${pad('spectral radius', 16)} ${pad('peak twist deg', 15)} ${pad('at s', 7)} ${pad('twist at 1.0 s', 15)} ${pad('actuator work mJ', 17)} ${pad('intervals +', 12)}`);
  for (const v of SCHEDULE_SPEEDS) {
    const d = blendOn(scratch, v, 0, 0);
    const n = d.phi.length;
    const k = d.k;
    const m = d.phi.map((row, i) => row.map((val, j) => val - (d.gamma[i][0] * k[0][j] + d.gamma[i][1] * k[1][j])));
    // The spectral radius from the loop's own eigenvalues (`rollModel.eigenvalues`), NOT a power iteration: the
    // dominant pair here is complex and a power method does not converge on one.
    const rad = Math.max(...eigenvalues(m).map((z) => Math.hypot(z.re, z.im)));
    let x = new Array<number>(n).fill(0);
    x[I_TWIST] = 10 / DEG;
    let peak = x[I_TWIST];
    let peakAt = 0;
    let work = 0;
    let plus = 0;
    let steps = 0;
    let at1 = 0;
    for (let i = 0; i * CONTROL_STEP < 2; i += 1) {
      const u1 = -k[1].reduce((acc, kk, j) => acc + kk * x[j], 0);
      const u0 = -k[0].reduce((acc, kk, j) => acc + kk * x[j], 0);
      const before = -x[I_TWIST];
      x = d.phi.map((row, a) => row.reduce((acc, val, j) => acc + val * x[j], 0) + d.gamma[a][0] * u0 + d.gamma[a][1] * u1);
      const dAngle = -x[I_TWIST] - before;
      work += u1 * dAngle;
      if (u1 * dAngle > 0) plus += 1;
      steps += 1;
      if (Math.abs(x[I_TWIST]) > Math.abs(peak)) { peak = x[I_TWIST]; peakAt = (i + 1) * CONTROL_STEP; }
      if (i === Math.round(1 / CONTROL_STEP) - 1) at1 = x[I_TWIST];
    }
    out(`${pad(f(v, 1), 10)} ${pad(f(rad, 6), 16)} ${pad(f(peak * DEG, 3), 15)} ${pad(f(peakAt, 3), 7)} ${pad(f(at1 * DEG, 4), 15)} ${pad(f(1000 * work, 2), 17)} ${pad(`${plus}/${steps}`, 12)}`);
  }
}

/**
 * ⭐⭐⭐ **The mechanism test, and the one that decides the round.** The designed loop RESTORES a pure torso twist and
 * takes energy out of it (`designedLoop`). So if the same law pumps the joint on a ride, what it is answering is not
 * a twist. This releases the designed loop from **each costed state in turn**, sized at that state's own
 * `stateScale` (the "largest acceptable" value the cost was written in), and asks two things of each release:
 *
 *   * how far the torso is wound by a disturbance that was not a torso disturbance, and
 *   * the actuator's work on the joint over the same two seconds, by the same formula as every other table here.
 *
 * ⚠️ Still the DESIGN's own linear model: no water, no soft stop, no bound, no estimator and no delay. It says what
 * the control law does with a state, not what a ride does, and the magnitudes are sized by an arbitrary release.
 */
function releases(): void {
  const scratch = new PredictiveController(WEIGHTS, TURN);
  const scales = (WEIGHTS as DesignWeights).stateScale;
  out('');
  out('## ⭐ The designed loop released from EACH costed state in turn, at that state\'s own `stateScale`');
  out('   (the torso starts at ZERO on every row but the twist\'s own; work by the same formula as the ride columns)');
  for (const v of [4.5, 5.0, 8.5]) {
    const d = blendOn(scratch, v, 0, 0);
    const n = d.phi.length;
    const k = d.k;
    out('');
    out(`   design at ${f(v, 1)} m/s, depth 0, rail 0`);
    out(`   ${pad('released state', 16)} ${pad('start', 10)} ${pad('peak twist deg', 15)} ${pad('at s', 6)} ${pad('twist at 1 s deg', 17)} ${pad('actuator work mJ', 17)} ${pad('intervals +', 12)}`);
    for (let st = 0; st < Math.min(8, scales.length); st += 1) {
      let x = new Array<number>(n).fill(0);
      x[st] = scales[st];
      let peak = 0;
      let peakAt = 0;
      let work = 0;
      let plus = 0;
      let steps = 0;
      let at1 = 0;
      for (let i = 0; i * CONTROL_STEP < 2; i += 1) {
        const u1 = -k[1].reduce((acc, kk, j) => acc + kk * x[j], 0);
        const u0 = -k[0].reduce((acc, kk, j) => acc + kk * x[j], 0);
        const before = -x[I_TWIST];
        x = d.phi.map((row, a) => row.reduce((acc, val, j) => acc + val * x[j], 0) + d.gamma[a][0] * u0 + d.gamma[a][1] * u1);
        const dAngle = -x[I_TWIST] - before;
        work += u1 * dAngle;
        if (u1 * dAngle > 0) plus += 1;
        steps += 1;
        if (Math.abs(x[I_TWIST]) > Math.abs(peak)) { peak = x[I_TWIST]; peakAt = (i + 1) * CONTROL_STEP; }
        if (i === Math.round(1 / CONTROL_STEP) - 1) at1 = x[I_TWIST];
      }
      out(`   ${pad(STATE[st], 16)} ${pad(f(scales[st], 3), 10)} ${pad(f(-peak * DEG, 3), 15)} ${pad(f(peakAt, 3), 6)} ${pad(f(-at1 * DEG, 4), 17)} ${pad(f(1000 * work, 2), 17)} ${pad(`${plus}/${steps}`, 12)}`);
    }
  }
}

function run(): void {
  anchors();
  schedule();
  designedLoop();
  releases();
  askPath();
  levers();
  if (!TICKS) { out('# TICKS= not set'); return; }
  const blocks: Block[] = readFileSync(TICKS, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as Block);
  const picked = blocks.filter((b) => WAVES.includes(b.wave));
  const reps = picked.map((b) => {
    const r = replay(b);
    for (const row of r.rows) (row as RowWithStand).relToStand = row.rel + (b.ticks[0].tAt - (b.stand ?? 0));
    return r;
  });

  out('');
  out('## Positive control: the shipped `tick` on the saved arguments, against the recorded command');
  out(`${pad('wave', 5)} ${pad('ticks', 6)} ${pad('states', 7)} ${pad('max |replay − recorded|', 24)} ${pad('raw1 clipped on', 16)}`);
  for (const r of reps) out(`${pad(String(r.wave), 5)} ${pad(String(r.rows.length), 6)} ${pad(String(r.nStates), 7)} ${pad(r.worst.toExponential(1), 24)} ${pad(`${r.clipped} ticks`, 16)}`);

  for (const [lo, hi] of [[FROM, TO], [FROM2, TO2]] as const) {
    out('');
    out(`## The actuator's work on the twist joint, +${f(lo, 3)} → +${f(hi, 3)} s after the stand  [J, about the board's up axis]`);
    out(`${pad('wave', 5)} ${pad('ints', 5)} ${pad('twist deg', 17)} ${pad('raw J', 9)} ${pad('+raw', 7)} ${pad('lag@beg', 9)} ${pad('lag@mean', 9)} ${pad('lag@end', 9)} ${pad('+lag', 7)} ${pad('rate signs', 11)}`);
    for (const r of reps) {
      const w = (r.rows as RowWithStand[]).filter((row) => row.relToStand >= lo - CONTROL_STEP / 2 && row.relToStand <= hi - CONTROL_STEP / 2 - 1e-9 && Number.isFinite(row.dAngle));
      if (w.length < 2) { out(`${pad(String(r.wave), 5)}  (no interval in window)`); continue; }
      const raw = w.reduce((s, row) => s + row.u1 * row.dAngle, 0);
      const lb = w.reduce((s, row) => s + row.lagBefore * row.dAngle, 0);
      const lm = w.reduce((s, row) => s + 0.5 * (row.lagBefore + row.lagAfter) * row.dAngle, 0);
      const la = w.reduce((s, row) => s + row.lagAfter * row.dAngle, 0);
      const pr = w.filter((row) => row.u1 * row.dAngle > 0).length;
      const pl = w.filter((row) => 0.5 * (row.lagBefore + row.lagAfter) * row.dAngle > 0).length;
      const up = w.filter((row) => row.dAngle > 0).length;
      out(`${pad(String(r.wave), 5)} ${pad(String(w.length), 5)} ${pad(`${f(w[0].angle * DEG, 2)}→${f(w[w.length - 1].angle * DEG + w[w.length - 1].dAngle * DEG, 2)}`, 17)} `
        + `${pad(f(raw, 3), 9)} ${pad(`${pr}/${w.length}`, 7)} ${pad(f(lb, 3), 9)} ${pad(f(lm, 3), 9)} ${pad(f(la, 3), 9)} ${pad(`${pl}/${w.length}`, 7)} ${pad(`${up}+ ${w.length - up}−`, 11)}`);
    }

    out('');
    out('### `u1`\'s own terms and each one\'s share of the RAW work, J. ⚠️ They largely cancel: read the net, not a term.');
    const head = reps[0];
    out(`${pad('wave', 5)} ${['ref u', 'bias', ...STATE.slice(0, head.nStates)].map((s) => pad(s, 12)).join(' ')} ${pad('Σ terms', 12)} ${pad('raw J', 10)}`);
    for (const r of reps) {
      const w = (r.rows as RowWithStand[]).filter((row) => row.relToStand >= lo - CONTROL_STEP / 2 && row.relToStand <= hi - CONTROL_STEP / 2 - 1e-9 && Number.isFinite(row.dAngle));
      if (w.length < 2) continue;
      const share = (get: (row: Row) => number): number => w.reduce((s, row) => s + get(row) * row.dAngle, 0);
      const cols = [share((row) => row.refU), share((row) => row.bias), ...Array.from({ length: r.nStates }, (_, j) => share((row) => row.terms[j]))];
      const sum = cols.reduce((s, v) => s + v, 0);
      out(`${pad(String(r.wave), 5)} ${cols.map((v) => pad(f(v, 3), 12)).join(' ')} ${pad(f(sum, 3), 12)} ${pad(f(share((row) => row.u1), 3), 10)}`);
    }
  }

  out('');
  out('## The gain row the twist command is built from, at the window\'s own operating points');
  out(`${pad('wave', 5)} ${pad('k[1][theta_t]', 14)} ${pad('k[1][omega_u]', 14)} ${pad('k[1][r]', 12)} ${pad('speed m/s', 11)}  (median over the wider window)`);
  const med = (v: number[]): number => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  for (const r of reps) {
    const w = (r.rows as RowWithStand[]).filter((row) => row.relToStand >= FROM2 - CONTROL_STEP / 2 && row.relToStand <= TO2 + CONTROL_STEP / 2);
    if (!w.length) continue;
    out(`${pad(String(r.wave), 5)} ${pad(f(med(w.map((q) => q.kTwist)), 4), 14)} ${pad(f(med(w.map((q) => q.kUpper)), 4), 14)} ${pad(f(med(w.map((q) => q.kBoardYaw)), 4), 12)} ${pad(f(med(w.map((q) => q.speed)), 3), 11)}`);
  }

  out('');
  out('## Is the command SERVOING its own joint? The sign of `u1` against the angle it is meant to null.');
  out('   (zero twist asked on every tick, so the reference is the zero equilibrium: a servo would sit OPPOSITE the angle)');
  out(`${pad('wave', 5)} ${pad('window', 16)} ${pad('ticks', 6)} ${pad('u1 opposes angle', 17)} ${pad('u1 opposes rate', 16)} ${pad('max |twist asked| deg', 22)}`);
  for (const r of reps) {
    for (const [lo, hi] of [[FROM, TO], [FROM2, TO2]] as const) {
      const w = (r.rows as RowWithStand[]).filter((row) => row.relToStand >= lo - CONTROL_STEP / 2 && row.relToStand <= hi + CONTROL_STEP / 2);
      if (w.length < 2) continue;
      const opp = w.filter((row) => row.u1 * row.angle < 0).length;
      const oppRate = w.filter((row) => row.u1 * row.rate < 0).length;
      out(`${pad(String(r.wave), 5)} ${pad(`+${f(lo, 3)}→+${f(hi, 3)}`, 16)} ${pad(String(w.length), 6)} ${pad(`${opp}/${w.length}`, 17)} ${pad(`${oppRate}/${w.length}`, 16)} ${pad(f(Math.max(...w.map((row) => Math.abs(row.asked))) * DEG, 4), 22)}`);
    }
  }

  out('');
  out('## The LQR cost the command is optimal against: `q[i][i] = 1 / stateScale[i]^2` [R, `predictiveBalance.ts:1124`]');
  out(`${pad('state', 16)} ${pad('stateScale', 11)} ${pad('as an angle/rate', 18)} ${pad('q[i][i]', 10)}`);
  const scales = WEIGHTS?.stateScale ?? [];
  for (let i = 0; i < Math.min(8, scales.length); i += 1) {
    const unit = [0, 2, 6, 8].includes(i) ? `${f(scales[i] * DEG, 2)} deg` : i === 5 ? `${f(scales[i] * DEG, 2)} deg (slip)` : `${f(scales[i] * DEG, 1)} deg/s`;
    out(`${pad(STATE[i], 16)} ${pad(f(scales[i], 3), 11)} ${pad(unit, 18)} ${pad(f(1 / (scales[i] * scales[i]), 1), 10)}`);
  }

  out('');
  out('## ⭐ The gain row FROZEN at one speed, on each wave\'s own saved state, reference, bias and motion — raw work, J');
  out('   (one factor moves: `k`. ⚠️ Open-loop — it changes the command and nothing else, and does NOT predict a ride.)');
  {
    const scratch = new PredictiveController(WEIGHTS, TURN);
    const speeds: number[] = [];
    for (let v = 2; v <= 10.001; v += 0.5) speeds.push(v);
    const ks = speeds.map((v) => blendOn(scratch, v, 0, 0).k[1].slice());
    out(`${pad('wave', 5)} ${pad('shipped', 9)} ${speeds.map((v) => pad(f(v, 1), 8)).join(' ')}`);
    for (const r of reps) {
      const w = (r.rows as RowWithStand[]).filter((row) => row.relToStand >= FROM2 - CONTROL_STEP / 2 && row.relToStand <= TO2 - CONTROL_STEP / 2 && Number.isFinite(row.dAngle));
      if (w.length < 2) continue;
      const cols = ks.map((k) => w.reduce((s, row) => {
        let u = row.refU + row.bias;
        for (let j = 0; j < r.nStates; j += 1) u -= k[j] * row.err[j];
        return s + u * row.dAngle;
      }, 0));
      const shipped = w.reduce((s, row) => s + row.u1 * row.dAngle, 0);
      out(`${pad(String(r.wave), 5)} ${pad(f(shipped, 3), 9)} ${cols.map((v) => pad(f(v, 3), 8)).join(' ')}`);
    }
  }

  if (SERIES) {
    const r = reps.find((q) => q.wave === SERIES);
    if (r) {
      out('');
      out(`## Wave ${SERIES}, tick by tick over +${f(FROM2, 3)} → +${f(TO2, 3)} s. The RATE's sign is the phase question.`);
      out(`${pad('rel s', 8)} ${pad('twist deg', 10)} ${pad('rate deg/s', 11)} ${pad('u1 Nm', 9)} ${pad('lag Nm', 9)} ${pad('dtwist deg', 11)} ${pad('dW raw mJ', 10)} ${pad('dW lag mJ', 10)}`);
      for (const row of (r.rows as RowWithStand[]).filter((q) => q.relToStand >= FROM2 - CONTROL_STEP / 2 && q.relToStand <= TO2 - CONTROL_STEP / 2 - 1e-9 && Number.isFinite(q.dAngle))) {
        out(`${pad(f(row.relToStand, 4), 8)} ${pad(f(row.angle * DEG, 3), 10)} ${pad(f(row.rate * DEG, 2), 11)} ${pad(f(row.u1, 3), 9)} ${pad(f(0.5 * (row.lagBefore + row.lagAfter), 3), 9)} `
          + `${pad(f(row.dAngle * DEG, 3), 11)} ${pad(f(1000 * row.u1 * row.dAngle, 2), 10)} ${pad(f(1000 * 0.5 * (row.lagBefore + row.lagAfter) * row.dAngle, 2), 10)}`);
      }
    }
  }
}

run();
