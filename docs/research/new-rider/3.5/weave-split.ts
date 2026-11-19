/**
 * **Step 3.5g: what sets the lean cap, and which term of the ankle's demand supplies the collapse.**
 *
 * `take-off/four-numbers.ts` at `claude/the-record`, copied **verbatim** and extended with **peek-only columns**.
 * Not one line of the drive, the scripts, the sea, the cut rules or the existing row schema is changed, so every
 * column the parent emits is still emitted with the same name and the same value, and a run of this file on the same
 * env reproduces the parent's own numbers. What is added:
 *
 * ## 1. The cap's own arithmetic, rebuilt on the probe's side (`cap*`)
 *
 * The reading under test was that the cap is `min(MAX_BANK, atan(v²/(g·R)))` with `R = TURN_RADIUS = 4.5 m` — which
 * at the **measured over-ground speeds of 7.04–8.85 m/s** gives **48.3–60.6°**, against a measured cap of
 * **18.34–41.42°**. ⚠️ **The `speed` in the cap expression and the `speed` in this file's row are two different
 * quantities under one name.** `AttachedRider.prepareBank` (`:3523–3524`) builds its own:
 *
 *     const forward = (0,0,1).applyQuaternion(this.heading);                       // the RIDER's heading, 3-D, NOT flattened
 *     const speed = this.boardVelocity.dot(forward)                                // ALONG the heading, not |v|
 *                 - this.waterFlow.x * forward.x - this.waterFlow.z * forward.z;   // and THROUGH the water
 *
 * while this file's `speed` column is `hypot(board.velocity.x, board.velocity.z)` — the over-ground magnitude.
 * So the columns below rebuild the engine's expression term by term off its own private fields and **check the result
 * against `leanProbe.held`, which is the engine's own value of the formula** (`capOk`). A recomputation that does not
 * reproduce `leanProbe.held` to 1e-12 is not the engine's arithmetic, so the identity is the proof and the
 * decomposition is then readable:
 *
 *  * `capFwd` — `boardVelocity · forward`, m/s (the along-heading part of the board's own velocity, y included);
 *  * `capFlow` — `waterFlow.x·forward.x + waterFlow.z·forward.z`, m/s (the water's own along-heading drift);
 *  * `capSpeed` — `capFwd − capFlow`: **the v the cap is actually built on**;
 *  * `capHeld`/`capOk` — the formula on `capSpeed` and whether it equals `leanProbe.held`;
 *  * `capR` — `leanProbe.radius`, the R the engine used (TURN_RADIUS, or `askRadius`/SNAP_RADIUS blended);
 *  * `fwdY`, `bvY`, `flowX`, `flowZ`, `headDeg` — the parts, so **why `capSpeed` falls** is a decomposition and not
 *    an inference: the over-ground magnitude, the sideslip between `headDeg` and `course`, and the flow term are
 *    each their own column.
 *
 * ## 2. The ankle's own ledger, switched on (`ak*`, `lv*`)
 *
 * ⭐ **No source change.** `AttachedRider.ankleLedger` (step 3.3i, `:2357`) is a static the game never reads and
 * `bookAnkle` (`:3206`) is documented as *"a pure observer: it reads `ankleTorque`, `ankleRest`, `legLoad` and the
 * live support region and writes only into `ankle`"*. This file sets it and reads `AttachedRider.ankle`. Beside it
 * the live fields the ledger means over substeps are peeked at frame end (`lv*`), and the demand is split into the
 * three terms `predictiveBank`'s own `setAnkle` call is built from (`:3736`):
 *
 *     τ = HUMAN_ANKLE_STIFFNESS·(θ − φ − rest) + (HUMAN_ANKLE_STIFFNESS·h + HUMAN_ANKLE_DAMPING)·relative
 *       = [K·(θ−φ)]            + [−K·rest]     + [(K·h + C)·relative]
 *         termJoint              termRest         termRate
 *
 * with K = 800 N·m/rad, C = 80 N·m·s/rad, h = (1/60)/NEW_STANDING_SUBSTEPS = 1/960 s, and `relative` the BODY's own
 * across rate on the leg (`bankSpeed / legLength`), not the board's roll rate. The three are emitted as
 * `termJoint`/`termRest`/`termRate` from the ledger's own step means, so their sum is checkable against `akDemand`
 * (`termOk`). ⚠️ The ledger's means are over **the substeps of one step**, so a term built from the frame-end live
 * field is NOT the same number as the term built from the mean; both are emitted and named apart (`lv*` vs `ak*`).
 *
 * ## 3. The pre-registered prediction this round can fail
 *
 * **The REST term leads at the break and the DAMPER term overtakes as the roll rate builds.** If `termRate` already
 * exceeds `termRest` on the breaking frame, the demand is tracking the board's roll rather than the stick and the
 * attribution is wrong.
 *
 * ## The run
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/cap-terms.ts -o <s>/raw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '' };\n" > <s>/cap-terms.mjs   # an OBJECT, never a string
 *     cat <s>/raw.mjs >> <s>/cap-terms.mjs
 *     cd <s> && env MODE=takeoff SEED=2 PERIODS=1 TURN_STEER=1 TURN_COMPRESS=0 LOG=all \
 *       OUT=<s>/s2.jsonl node --max-old-space-size=3200 cap-terms.mjs
 *
 * ⚠️ `PERIODS=1` keeps only wave 1. The riders never push the water and never see each other (the parent's own note
 * on `TRIAL`), so wave 1's frames are the same frames a `PERIODS=12` run gives it; the reproduction check against
 * the published `across` 0.9418 → −0.0408 and the falls at 0.683 s and 0.700 s is what says so.
 *
 * ---
 * The parent's own header follows, unchanged.
 * ---
 *
 * **The four headline numbers, re-measured through a stand — and on a placement, by the same instrument.**
 *
 * PR #429 found why every bench on this track disagrees with the owner: **the mount seeds the planing latch from the
 * magnitude of the board's world velocity**, so a rider *constructed* standing at 4 m/s or more is on the plane from
 * frame 1 with a 17–69° lean cap, while a pop-up mounts prone and the latch's own test is speed **through the water**,
 * which a caught board does not sustain. It therefore marked four published numbers conditional:
 *
 * | number | from | what it needs |
 * | --- | --- | --- |
 * | `tip` 90 of 90 | #419 | does the CoM line still leave the support on every ride, and at what fraction of the first second? |
 * | the stance tolerates 10.9° | #419 | recomputed from the **measured** CoM height and support at the stand |
 * | the body follows the deck at 0.87, 0.1 s late | #421 | does it hold **off the plane**, where the ask cap is 0? |
 * | the demand is 0.327 m outside the feet | #425 | what is it at the stand and through the first second? |
 *
 * **This file measures all four on both populations with one row schema**, so the comparison is the same instrument
 * twice and not two papers:
 *
 *  * `MODE=takeoff` — #429's own drive, carried over unchanged: the owner's address through the game's own switch
 *    parsing, one Canyon B sea, riders placed **prone at rest** at the game's own lineup, paddling in, sprinting 2 s
 *    before the crest, popping at **the game's own cue**, then standing with the stick at zero or taking a bottom turn.
 *  * `MODE=placed` — `3.5/bank.ts`'s own `MODE=sea` rig, carried over unchanged: 3 trials × `ENTRIES` × `STANCES`
 *    placed flush at the break point 45° off the fall line, `phase: 'standing'`, **stick hard over**, `SINK=0.06`.
 *    That is the rig behind #419's `tip` 90/90 and its 10.9°, behind #421's 0.8748 and its 0.100 s, and behind #425's
 *    0.327 m, so **it is this round's positive control**: the placed column has to reproduce them.
 *
 * ⭐ **MEASUREMENT ONLY.** Nothing under `src/`. No behaviour, no constant, no switch. Every read of a private field
 * goes through one accessor that only gets.
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/take-off/four-numbers.ts -o <s>/raw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '' };\n" > <s>/four-numbers.mjs   # an OBJECT, never a string
 *     cat <s>/raw.mjs >> <s>/four-numbers.mjs
 *     cd <s> && env MODE=takeoff SEED=1 PERIODS=12 OUT=<s>/t1.jsonl node --max-old-space-size=3200 four-numbers.mjs
 *     cd <s> && env MODE=placed  SEED=1            OUT=<s>/p1.jsonl node --max-old-space-size=3200 four-numbers.mjs
 *     python3 -I docs/research/new-rider/take-off/four-numbers-read.py <s>/t1.jsonl --label takeoff
 *
 * ## ☠️ The traps this file is built around
 *
 *  1. **`SECONDS=<x> node` in zsh goes through zsh's special INTEGER variable**: `0.5` arrives as `"0"`, every run
 *     ends at frame 1, and the summary still prints tidily. **This file has no `SECONDS`** (its horizons are
 *     `STAND_HOLD`, `PERIODS` and `PLACED_FOR`), and every invocation above uses `env`.
 *  2. **The Canyon seatbelt.** The wrapper prelude must set `globalThis.location` as an **OBJECT**: a bare string has
 *     no `.search` (`devTools.ts:9`), every switch goes missing, and the bench quietly measures the default Canyon.
 *     The `control` line prints the grid **off the solver** (Canyon B is 400 × 451 = 180 400) and the parsed switches,
 *     and the process **exits non-zero** unless `canyonBed === 'b'` and `rider === 'new'`.
 *  3. **"CoP-pinned" is `limitTime.tip > 0`** — the step's decaying memory — **not `limit === 'tip'`**, which is one
 *     substep of 32 and reads about a third. Both are emitted (`tTip`, `limit`), and a **third**, `outAny`, is the
 *     geometric statement itself (the demand outside the support box), because `limit` is set to `'impact'` *before*
 *     `'tip'` is tested and can mask it. The reader says which it uses on every line.
 *  4. **`AttachedRider.separate` (`:5227–5232`) never clears `phase` or `upright`**, so every rider column freezes at
 *     the separation. Every run is cut at its **first `attached === 0`**; that frame is emitted and nothing after it
 *     is, and the kept count rides in every summary.
 *  5. **`balanceMargin` cannot name the first failing constraint.** `:5050` low-passes `rawMargin`, which is itself
 *     `max(0, min(1, across, along, 1 − tangential/friction))` — a **filtered minimum of three headrooms**. So this
 *     file emits the three **separately** (`hAcross`, `hAlong`, `hGrip`), recomputed from the engine's own exposed
 *     fields, **and checks them against `rawMargin` frame by frame** (`rawOk`): a recomputation that does not
 *     reproduce the engine's own scalar is not the engine's arithmetic. It also emits the capture test's own three
 *     (`balanceLimits`: `bMargin`/`bGrip`/`bKnee` and which bound), since `human.fallen` — the capture point alone —
 *     is what actually ends a free-body ride.
 *  6. **`contact.frontShare` is a LOAD SHARE, not a position.** Nothing about it says a foot moved. The deck-relative
 *     foot speed is the column that would (`foot5`/`foot6`, `PROBE=on`).
 *  7. **A metric that cannot fail.** `tStand` does not exist for a rider that never stands, so every table carries
 *     `stood` and `popped`; the headroom recomputation carries `rawOk`; the planing columns carry their own frame
 *     counts; and `PROBE=off` reruns the drive with the per-frame row never built — **a `PROBE=off` run and a
 *     `PROBE=on` run must agree value for value**, which is this file's inertness proof.
 *
 * Env: `MODE` (`takeoff|placed`), `ADDRESS`, `ARMS`, `SCRIPTS`, `SIZE`, `SEED`, `PERIODS`, `STAND_HOLD`, `TRIAL`,
 * `SPRINT`, `EARLY`, `LIFT_AHEAD`, `LIFT_FRACTION`, `TURN_AT`, `TURN_FOR`, `LOG` (`all|window|none`),
 * `PROBE` (`off`: the inertness control), `SINK`, `ENTRIES`, `STANCES`, `STICK`, `TRIALS`, `GAP`, `AHEAD`,
 * `PLACED_FOR`, `SIDE`, `OUT`.
 *
 * `docs/` is outside `tsconfig.json`'s `include` and `vitest.config.ts`'s globs, so this file is neither type-checked
 * nor run by the suites, as its siblings are not. Rider options pass through one `as` cast so the file bundles at a
 * commit where a given option does not exist.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { bankLedger, BANK_SOURCES } from '../../../../src/physics/bankLedger';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { RideSession } from '../../../../src/physics/RideSession';
import { deckHeight } from '../../../../src/physics/riderPosture';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { inTakeOffWindow } from '../../../../src/physics/takeOffCue';
import { WaveFrameGauge, type WaveFrame } from '../../../../src/physics/waveFrame';
import { SurfZoneSimulation, rideLineupAlong, rideLineupOffset, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;

// ---------------------------------------------------------------------------------------------------------------
// Step 3.5g's own additions. Peek-only: one static observer switched on, and constants copied from `src/` by VALUE so
// the probe's arithmetic can be checked against the engine's own emitted number rather than trusted.
// ---------------------------------------------------------------------------------------------------------------
/** Step 3.3i's pure observer (`AttachedRider.bookAnkle`), read by nothing in the game. Switched on here, not in `src/`. */
AttachedRider.ankleLedger = true;
/**
 * **Step 3.5h's own two observers, both already in `src/` and both read by nothing in the game.**
 *
 * `BoardBody.rollLedger` (step 3.3h, `BoardBody.ts:375`) and `bankLedger.on` (step 3.3l, `bankLedger.ts:178`). Both
 * are documented in their own source as *"a measurement tool and not part of the sim"*, both cost one branch per
 * substep when off, and `bankLedger.test.ts` asserts the rider is byte-identical with it on and off. `LEDGERS=off`
 * is this round's own inertness control: it runs the same drive with both statics false, and every column the
 * ledgers do not feed has to come out bit-identical.
 */
const LEDGERS = process.env.LEDGERS !== 'off';
/**
 * ⚠️ **`BANK=off` is a COST switch, not a correctness one.** The bank ledger factors the standing solve's matrix and
 * back-substitutes once per source per substep — 23 sources × 16 substeps per frame — and measured here it is what
 * makes the drive roughly three times slower. The roll ledger is projections only and is cheap. They are separable
 * because they answer different questions: the roll ledger says which forces add energy to the BOARD's roll (the
 * round's own question), and the bank ledger NAMES which of the rider's channels does it.
 */
BoardBody.rollLedger = LEDGERS;
bankLedger.on = LEDGERS && process.env.BANK !== 'off';
/** `AttachedRider.ts:474` — the hard ceiling on the cap, rad. 70°. */
const MAX_BANK_RAD = (70 * Math.PI) / 180;
/** `hullForces.ts:7` — `WATER.gravity`. */
const G = 9.81;
/** `humanBalance.ts:50–51`. */
const K_ANKLE = 800;
const C_ANKLE = 80;
/** `AttachedRider.ts:48` — NEW_STANDING_SUBSTEPS, and the substep the backward-Euler ankle term is built on, s. */
const SUBSTEP = STEP / 16;
const engFwd = new Vector3();
const engHead = new Quaternion();

const MODE = (process.env.MODE ?? 'takeoff') as 'takeoff' | 'placed';
/** The owner's own address (2026-11-18), minus the arm under test. */
const ADDRESS = process.env.ADDRESS ?? '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
/** An arm is a suffix on his address. `ships` is the address as it stands: no new switches. */
const ARM_SUFFIX: Record<string, string> = {
  ships: '',
  cap: '&askCap=4.5',
};
const ARMS = (process.env.ARMS ?? 'ships').split(',').filter(Boolean);
const SCRIPTS = (process.env.SCRIPTS ?? 'cue,cueL,cueR').split(',').filter(Boolean);
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const SEED = Number(process.env.SEED ?? 1);
const PERIODS = Number(process.env.PERIODS ?? 12);
/** How long a standing rider is followed after the stand, s: the owner's window is the first second. */
const STAND_HOLD = Number(process.env.STAND_HOLD ?? 3);
/**
 * A trial's riders live this long at most, s. ⚠️ **`catch-probe`'s and #429's own value was 16, and on seed 1 it
 * CENSORS three stands an arm**: wave 6 stands at 16.0167 s and the trial is retired on that very frame, so the
 * rider is dropped with `fsN = 0` and no cause and #429's "wave 6 rode the 3 s out" was a censoring, not a ride.
 * **20 here**, which only ever *adds* frames after t = 16 s — the riders never push the water and never see each
 * other, so every frame before that is bit-identical to a `TRIAL=16` run. Every summary carries `standExposure`
 * (how much of `STAND_HOLD` the trial's own clock actually allowed) and `firstFull`, so a censored window can
 * never be read as a carried one.
 */
const TRIAL = Number(process.env.TRIAL ?? 20);
/** Where an incoming crest is first noticed, m seaward of the start: inside the gauge's 40 m look behind the rider. */
const CREST_PROBE = 36;
/** When the sprint starts: the crest this many s away (`catch-probe`'s `good`). */
const SPRINT = Number(process.env.SPRINT ?? 2);
/** The bottom turn's delay after the stand and its length, s (`catch-probe`'s `turnL`/`turnR`). */
const TURN_AT = Number(process.env.TURN_AT ?? 0.3);
const TURN_FOR = Number(process.env.TURN_FOR ?? 0.9);
/**
 * ⭐ **The two halves of "asking for a turn", separable at last.** `bench.ts` and this file's first run both sent
 * `steer: ±1` AND `compress: 1` together on every turn script, while the neutral script sent neither — so the
 * reviewer was right that neutral-versus-turn could isolate NOTHING. These two knobs scale each half independently,
 * and both default to 1, so every run already taken is reproduced exactly.
 *   `TURN_STEER=0 TURN_COMPRESS=1` — the Compress alone.
 *   `TURN_STEER=1 TURN_COMPRESS=0` — the steer alone.
 */
const TURN_STEER = Number(process.env.TURN_STEER ?? 1);
const TURN_COMPRESS = Number(process.env.TURN_COMPRESS ?? 1);
const LOG = (process.env.LOG ?? 'window') as 'all' | 'window' | 'none';
/**
 * `PROBE=off`: the per-frame row is not built at all, which also removes the only reads the probe makes of its own
 * accord — the drawn feet (`renderPoint`, twice) and a second `sampleAt` under the board. The drive, the outcomes and
 * the first-second columns are computed without it, so a `PROBE=off` run and a `PROBE=on` run must agree value for
 * value. A difference means the probe is not a probe.
 */
const PROBE_ON = process.env.PROBE !== 'off';
const OUT = process.env.OUT;
/** Step 3.5h: where the recorded controller ticks go. Unset: they are recorded and not written. */
const TICKOUT = process.env.TICKOUT;
/** `WAVES=1,2,6,11`: place riders only on those crests. Unset: every crest, as the parent does. */
const WAVE_PICK = process.env.WAVES ? process.env.WAVES.split(',').map(Number) : null;
/** The placement's own knobs (`3.5/bank.ts MODE=sea`'s, with its published `SINK`). */
const SINK = Number(process.env.SINK ?? 0.06);
const ENTRIES = (process.env.ENTRIES ?? '2,3,4,5,6,7,8,9,10,12').split(',').map(Number);
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];
const STICK = Number(process.env.STICK ?? 1);
const TRIALS = Number(process.env.TRIALS ?? 3);
const GAP = Number(process.env.GAP ?? 1.5);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
/** How long a placed rider is followed, s (`3.5/bank.ts`'s `SECONDS`, renamed away from zsh's integer trap). */
const PLACED_FOR = Number(process.env.PLACED_FOR ?? 4);
const SIDE = Number(process.env.SIDE ?? -45);

type Stance = 'tall' | 'crouch' | 'compress';

const v = (x: number | undefined): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const r = (x: number | undefined, n: number): number | null => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};
/** Reads of fields TypeScript calls private, or of fields a commit may not have. They only get. */
const peek = (o: unknown, k: string): number | undefined => (o as Record<string, number | undefined>)[k];
const peekS = (o: unknown, k: string): string | undefined => (o as Record<string, string | undefined>)[k];
const peekO = (o: unknown, k: string): Record<string, number> | undefined => (o as Record<string, Record<string, number> | undefined>)[k];
const peekB = (o: unknown, k: string): boolean | undefined => (o as Record<string, boolean | undefined>)[k];
const soft = (o: unknown, k: string): number | null => v(peek(o, k));

// ---------------------------------------------------------------------------------------------------------------
// The address, through the game's own switch parsing.
// ---------------------------------------------------------------------------------------------------------------
/** Every `SurfZoneConfig` key `SurfZoneRunner` hands to `RideSession` (its own list, copied verbatim). */
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

/** The rider options for one arm, built from its own config exactly as `SurfZoneRunner` builds the game's. */
function riderOptions(config: Config): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of RIDER_KEYS) if (config[key] !== undefined) out[key] = config[key];
  return out;
}

const armConfig = new Map<string, Config>();
for (const arm of ARMS) {
  const suffix = ARM_SUFFIX[arm];
  if (suffix === undefined) throw new Error(`unknown arm ${arm}`);
  armConfig.set(arm, configFor(ADDRESS + suffix));
}
const config = armConfig.get(ARMS[0])!;
// The sea must be the same for every arm: the switches under test are the rider's alone.
const seaOnly = (c: Config): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, value] of Object.entries(c)) if (!(RIDER_KEYS as readonly string[]).includes(k)) out[k] = value;
  return out;
};
const seaDiffs: string[] = [];
for (const arm of ARMS.slice(1)) {
  const a = seaOnly(config);
  const b = seaOnly(armConfig.get(arm)!);
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) seaDiffs.push(`${arm}.${k}`);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The sea.
// ---------------------------------------------------------------------------------------------------------------
const wall = Date.now();
const sim = new SurfZoneSimulation(config);
const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
const water: SurfWater = {
  sampleAt: (x, y, z, out) => physical.sampleAt(x, y, z, out),
  surfaceAt: (x, z) => physical.surfaceAt(x, z),
  addReaction: () => {},
  setSampleTime: (offset: number) => physical.setSampleTime(offset),
};
const focus = sim.breakPoint();
/** The game's own start (`SurfZoneRunner.rideLineup`). */
const startX = focus.x + rideLineupAlong(config);
const startZ = focus.z - rideLineupOffset(config);
const { nx, nz } = sim.solver as unknown as { nx: number; nz: number };
const switchesOf = (c: Config): Record<string, unknown> => {
  const out: Record<string, unknown> = { canyonBed: c.canyonBed };
  for (const key of RIDER_KEYS) if (c[key] !== undefined) out[key] = c[key];
  return out;
};
emit({
  control: true, mode: MODE, address: ADDRESS, arms: ARMS, scripts: SCRIPTS, size: SIZE, seed: SEED, periods: PERIODS,
  search: (globalThis as { location?: { search?: string } }).location?.search ?? '(none)',
  grid: `${nx}x${nz}`, cells: nx * nz, spunUp: (Date.now() - wall) / 1000, seaTime: sim.solver.time,
  focusX: focus.x, focusZ: focus.z, startX, startZ, lineupOut: rideLineupOffset(config),
  significantHeight: config.significantHeight, peakPeriod: config.peakPeriod,
  switches: Object.fromEntries(ARMS.map((arm) => [arm, switchesOf(armConfig.get(arm)!)])),
  seaDiffs, standHold: STAND_HOLD, log: LOG, probe: PROBE_ON ? 'on' : 'off',
  sink: SINK, entries: ENTRIES, stances: STANCES, stick: STICK, trials: TRIALS, placedFor: PLACED_FOR,
});
if (config.canyonBed !== 'b' || config.rider !== 'new') {
  emit({ fatal: 'the address did not arrive', canyonBed: config.canyonBed ?? null, rider: config.rider ?? null });
  process.exit(2);
}
if (seaDiffs.length > 0) {
  emit({ fatal: 'an arm moved the sea', seaDiffs });
  process.exit(3);
}

// ---------------------------------------------------------------------------------------------------------------
// The row: the same columns for a take-off and for a placement.
// ---------------------------------------------------------------------------------------------------------------
const sample = createWaterSample();
const footWorld = new Vector3();
const footLocal = new Vector3();
const fwd = new Vector3();
const sideV = new Vector3();
const boardUp = new Vector3();
/** Step 3.5h: the roll ledger's own datum, board +z in the world. Module level, as every other scratch here is. */
const rollAxisScratch = new Vector3();
const engSide = new Vector3();
const engUp = new Vector3();
const offL = new Vector3();

interface Series {
  /** Every live frame of the window, for the medians and the regressions. */
  n: number;
  load: number[];
  legLoad: number[];
  wetted: number[];
  roll: number[];
  bank: number[];
  mismatch: number[];
  comH: number[];
  comY: number[];
  tol: number[];
  outX: number[];
  outZ: number[];
  planing: number[];
  cap: number[];
  ask: number[];
  hAcross: number[];
  hAlong: number[];
  hGrip: number[];
  pinned: number;
  pinNow: number;
  outAny: number;
  contactOff: number;
  rawOk: number;
  rawSeen: number;
}
const series = (): Series => ({
  n: 0, load: [], legLoad: [], wetted: [], roll: [], bank: [], mismatch: [], comH: [], comY: [], tol: [],
  outX: [], outZ: [], planing: [], cap: [], ask: [], hAcross: [], hAlong: [], hGrip: [],
  pinned: 0, pinNow: 0, outAny: 0, contactOff: 0, rawOk: 0, rawSeen: 0,
});

/**
 * One frame's full read of a (board, rider) pair. Everything the four numbers need, each named for what it is:
 *
 *  * `roll` — the deck's own bank from the world's level about its nose-to-tail line, `atan2(up·s, up.y)`, the game's
 *    own `prepareBank` expression (`:5518`) rebuilt on the probe's side;
 *  * `bank` — `AttachedRider.bank.angle`: how far the body's centre of mass leans over its feet from the WORLD's
 *    vertical toward the heading's +x, less the posture's own offset. **The two are independent reads**, and their
 *    difference `mismatch` is the ankle's own working angle, the datum of `HUMAN_ANKLE_STIFFNESS × (bank − roll − rest)`;
 *  * `comH` — the centre of mass above the **deck**, `local.y − deckHeight(shape, local.z)`: the engine's own `height`
 *    in `project` (`:5345`), the one that scales the demand `freeX = local.x − height·j.x/j.y`. `comY` is the raw
 *    local `y` instead, which is what `3.5/bank.ts` used for its tolerance, so both tolerances can be read;
 *  * `tolH`/`tolY` — `atan(halfAcross / comH)` and `atan(halfAcross / comY)`, degrees: **the mismatch the stance
 *    tolerates**, #419's 10.9°, as a geometric identity on live numbers;
 *  * `outX`/`outZ` — how far the **raw demand** (`desiredCop`, the free line of action's meeting point) lies outside
 *    the support box, #425's own expression;
 *  * `hAcross`/`hAlong`/`hGrip` — `project`'s three headrooms **separately**, recomputed from the engine's exposed
 *    fields, with `rawOk` saying whether their clamped minimum reproduces the engine's own `rawMargin` this frame.
 */
function readRow(board: BoardBody, rider: AttachedRider, into: Series | null, probeReads: boolean): Record<string, unknown> {
  fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  sideV.set(fwd.z, 0, -fwd.x);
  boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
  const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;
  const bank = rider.bank.angle * DEG;
  const mismatch = bank - roll;
  board.toLocal(rider.position, offL);
  const deckY = deckHeight(board.shape, offL.z);
  const comH = offL.y - deckY;
  const comY = offL.y;
  const support = rider.support;
  const half = (support.xMax - support.xMin) / 2;
  const midX = (support.xMin + support.xMax) / 2;
  const midZ = (support.zMin + support.zMax) / 2;
  const tolH = Math.atan(half / Math.max(1e-6, comH)) * DEG;
  const tolY = Math.atan(half / Math.max(1e-6, comY)) * DEG;
  const want = peekO(rider, 'desiredCop') as unknown as { x: number; z: number } | undefined;
  const wantX = want?.x ?? Number.NaN;
  const wantZ = want?.z ?? Number.NaN;
  const outX = Math.max(0, Math.max(support.xMin - wantX, wantX - support.xMax));
  const outZ = Math.max(0, Math.max(support.zMin - wantZ, wantZ - support.zMax));
  const feetO = peekO(rider, 'feet') as unknown as { rear: number; front: number } | undefined;
  const feetHalf = feetO === undefined ? Number.NaN : (feetO.front - feetO.rear) / 2;
  // `project`'s own three, each on its own line (`:5386–5390`).
  const hAcross = 1 - Math.abs(wantX - midX) / half;
  const beyond = Math.max(0, Math.abs(wantZ - midZ) - feetHalf);
  const hAlong = 1 - beyond / Math.max(1e-6, (support.zMax - support.zMin) / 2 - feetHalf);
  const frictionUsed = peek(rider, 'frictionUsed') ?? Number.NaN;
  const hGrip = 1 - frictionUsed;
  const mine = Math.max(0, Math.min(1, hAcross, hAlong, hGrip));
  const rawMargin = peek(rider, 'rawMargin') ?? Number.NaN;
  const loadedNow = peekB(rider, 'loaded') === true ? 1 : 0;
  const rawOk = Number.isFinite(rawMargin) && Number.isFinite(mine) && Math.abs(mine - rawMargin) < 1e-9 ? 1 : 0;
  const lt = peekO(rider, 'limitTime');
  const limit = peekS(rider, 'limit') ?? null;
  const bl = rider.balanceLimits;
  const lean = rider.leanProbe;
  const speed = Math.hypot(board.velocity.x, board.velocity.z);
  const course = Math.atan2(board.velocity.x, board.velocity.z) * DEG;
  const heading = Math.atan2(fwd.x, fwd.z) * DEG;
  // ⭐ The probe's own read, and the only one in this function: `PROBE=off` removes it, so every measured column
  // above is computed identically on both arms of the inertness control.
  let slope = Number.NaN;
  if (probeReads) {
    water.sampleAt(board.centerOfMass.x, board.centerOfMass.y, board.centerOfMass.z, sample);
    slope = Math.atan(-sample.slopeZ) * DEG;
  }
  const st = rider.human.state as unknown as Record<string, number>;

  // ---------------------------------------------------------------------------------------------------------------
  // Step 3.5g (1): the cap's own expression, rebuilt from the engine's own private fields. Reads only.
  // ---------------------------------------------------------------------------------------------------------------
  const bv = peekO(rider, 'boardVelocity') as unknown as { x: number; y: number; z: number } | undefined;
  const hq = peekO(rider, 'heading') as unknown as { x: number; y: number; z: number; w: number } | undefined;
  const wf = peekO(rider, 'waterFlow') as unknown as { x: number; z: number } | undefined;
  let capFwd = Number.NaN;
  let capFlow = Number.NaN;
  let capSpeed = Number.NaN;
  let capHeld = Number.NaN;
  let capOk = 0;
  let fieldsOk = 0;
  let fwdY = Number.NaN;
  let headDeg = Number.NaN;
  let bvGround = Number.NaN;
  /**
   * ⭐ **The exact identity, on the engine's own speed.** `leanProbe.speedThrough` IS the `speed` local of the cap
   * expression, written beside `held` in the same substep, so `min(MAX_BANK, atan(speedThrough²/(g·radius)))` must
   * equal `held` to the last bit. This is the column that says **which formula and which R**, with no dependence on
   * whether the probe's frame-end peek of the fields lands on the same substep.
   */
  const capExact = Math.min(MAX_BANK_RAD, Math.atan((lean.speedThrough * lean.speedThrough) / (G * Math.max(1e-9, lean.radius))));
  const capExactOk = lean.radius > 0 && Math.abs(capExact - lean.held) < 1e-12 ? 1 : 0;
  if (bv !== undefined && hq !== undefined && wf !== undefined) {
    engHead.set(hq.x, hq.y, hq.z, hq.w);
    engFwd.set(0, 0, 1).applyQuaternion(engHead);
    capFwd = bv.x * engFwd.x + bv.y * engFwd.y + bv.z * engFwd.z;
    capFlow = wf.x * engFwd.x + wf.z * engFwd.z;
    capSpeed = capFwd - capFlow;
    capHeld = Math.min(MAX_BANK_RAD, Math.atan((capSpeed * capSpeed) / (G * lean.radius)));
    capOk = Math.abs(capHeld - lean.held) < 1e-12 ? 1 : 0;
    fieldsOk = Math.abs(capSpeed - lean.speedThrough) < 1e-12 ? 1 : 0;
    fwdY = engFwd.y;
    headDeg = Math.atan2(engFwd.x, engFwd.z) * DEG;
    bvGround = Math.hypot(bv.x, bv.z);
  }
  // ---------------------------------------------------------------------------------------------------------------
  // Step 3.5g (2): the ankle's ledger (step means over this step's substeps) and the three terms of its demand.
  // ---------------------------------------------------------------------------------------------------------------
  const a = rider.ankle;
  const lvRest = peek(rider, 'ankleRest') ?? Number.NaN;
  const lvBankSpeed = peek(rider, 'bankSpeed') ?? Number.NaN;
  const lvLegLength = peek(rider, 'legLength') ?? Number.NaN;
  const lvRelative = lvBankSpeed / lvLegLength;
  const termJoint = K_ANKLE * a.angle;
  const termRest = -K_ANKLE * a.rest;
  /**
   * ⚠️ **`termRate` is a RESIDUAL, not an independent read, and it is exact arithmetic rather than a check.** The
   * ledger means `angle`, `rest` and `demand` over the *same* substeps, and the demand is linear in all three
   * inputs, so `mean(demand) = K·mean(θ−φ) − K·mean(rest) + (K·h + C)·mean(relative)` and the residual IS the step's
   * mean rate term. `relative` itself is not booked, so there is no second reading of it to check this against;
   * the honest cross-read is `termRateLive`, the term rebuilt from the **frame-end live** `bankSpeed / legLength`,
   * which is one substep of 16 and so agrees in sign and order and not to the digit. `rateImplied` turns the
   * residual back into the joint rate it implies, °/s, which is the quantity the three-candidate round priced at
   * **51 °/s**.
   */
  const termRate = a.demand - termJoint - termRest;
  const rateImplied = (termRate / (K_ANKLE * SUBSTEP + C_ANKLE)) * DEG;
  const termRateLive = (K_ANKLE * SUBSTEP + C_ANKLE) * lvRelative;
  /** The real check on the ledger: with no bound switched on, the delivered torque is the demand (`absorbed` = 0). */
  const akFree = Math.abs(a.absorbed) < 1e-9 ? 1 : 0;

  if (into) {
    into.n += 1;
    into.load.push(rider.contact.load);
    into.legLoad.push((peek(rider, 'legLoad') ?? Number.NaN) / (rider.mass * 9.81));
    into.wetted.push(board.wettedArea);
    into.roll.push(roll);
    into.bank.push(bank);
    into.mismatch.push(mismatch);
    into.comH.push(comH);
    into.comY.push(comY);
    into.tol.push(tolH);
    into.outX.push(outX);
    into.outZ.push(outZ);
    into.planing.push(lean.planing);
    into.cap.push(lean.cap);
    into.ask.push(lean.ask);
    into.hAcross.push(hAcross);
    into.hAlong.push(hAlong);
    into.hGrip.push(hGrip);
    if ((lt?.tip ?? 0) > 0) into.pinned += 1;
    if (limit === 'tip') into.pinNow += 1;
    if (outX > 0 || outZ > 0) into.outAny += 1;
    if (!rider.inContact) into.contactOff += 1;
    if (Number.isFinite(rawMargin)) {
      into.rawSeen += 1;
      into.rawOk += rawOk;
    }
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Step 3.5h: the two ledgers, read as `3.5/roll.ts` reads them, and the roll AXIS and RATE they must be read on.
  //
  // ⚠️ **The two ledgers are in OPPOSITE senses and this round must not pool them** [R, `3.5/roll.ts` § "The two
  // signs, stated once"]:
  //   * `rl*` — `BoardBody.roll`, N·m about the board's own long axis (board frame **+z** in the world,
  //     `(rotation[2], rotation[5], rotation[8])`), **+ in the right-hand sense, which LIFTS the board's +x rail.**
  //   * `dk*` — `bankLedger.deck`, rad/s² about `AttachedRider.rollAxis` (world `(0,0,−1)` turned by the heading),
  //     **+ rolling the board's +x rail DOWN.**
  //   So a positive `rl*` and a negative `dk*` are the same physical direction.
  //
  // `rlOmega` is the board's own roll rate **on the `rl*` datum** — `ω · ẑ_board`, rad/s — so that `rl_s · rlOmega`
  // is a POWER in watts in the ledger's own sign convention (+ adds energy to the roll, − removes it). The axis is
  // rebuilt two ways and their dot product emitted (`rlAxisOk`), because the private `rotation` array and
  // `(0,0,1).applyQuaternion(orientation)` are the same vector only if the probe has the array's layout right.
  //
  // ⚠️ **The honest resolution of the power, stated here and not buried**: each `rl_s` is a **step mean of
  // per-substep bookings** (every entry is `+= h · rollOf(...)` on each of 16 substeps, then `× 1/dt` at the step's
  // close), while `rlOmega` is read ONCE at the frame's end. So `rl_s · rlOmega · dt` is the step's work only up to
  // the within-step covariance of that source's moment with the roll rate, which this instrument does not separate.
  // The reader therefore takes the rate three ways — the step's START (the previous frame's `rlOmega`), its MIDDLE
  // and its END — and prints all three side by side, so a group whose SIGN moves between them is an artefact of the
  // sampling and not a finding. What the round reads is the sign summed over an oscillation (33 frames at 1.82 Hz).
  // ⭐ **The reviewer's own precondition, and it is a column and not an inference**: *"compare measured cross-face
  // tilt, deck-relative roll and the board-versus-rider response before touching stability"*. A wobble in the WORLD
  // frame on a tilting face is not the same quantity as a wobble relative to the water's own surface, so all three
  // are emitted, every one rebuilt on the ENGINE's own expressions [R, `AttachedRider.prepareBank:3516–3519`]:
  //
  //     const side    = (1,0,0).applyQuaternion(this.heading);          // the RIDER's heading, yaw only
  //     const boardUp = (0,1,0).applyQuaternion(board.orientation);
  //     const roll    = atan2(boardUp · side, boardUp.y);               // from the WORLD's level
  //     const rail    = roll − atan2(waterUp · side, waterUp.y);        // from the WATER's surface under the board
  //
  // `waterUp` is the water's own normal under the board, set per substep by `planingStep` (`:3488`) and read here at
  // the frame's end. ⚠️ `rollEng` is NOT the same number as this file's own `roll` column, which is built on the
  // board's flattened forward and not on the heading: both are emitted, `rollEng − roll` is `rollHeadGap`, and the
  // engine's own three are the ones the reviewer's condition is scored on. All in DEGREES, + with the +x rail DOWN,
  // which is the OPPOSITE sense from `rl*` and the SAME sense as `dk*`.
  const wu = peekO(rider, 'waterUp') as unknown as { x: number; y: number; z: number } | undefined;
  const hq2 = peekO(rider, 'heading') as unknown as { x: number; y: number; z: number; w: number } | undefined;
  let rollEng = Number.NaN;
  let tiltEng = Number.NaN;
  if (hq2) {
    engHead.set(hq2.x, hq2.y, hq2.z, hq2.w);
    const sideE = engSide.set(1, 0, 0).applyQuaternion(engHead);
    const upE = engUp.set(0, 1, 0).applyQuaternion(board.orientation);
    rollEng = Math.atan2(upE.dot(sideE), upE.y) * DEG;
    if (wu) tiltEng = Math.atan2(wu.x * sideE.x + wu.y * sideE.y + wu.z * sideE.z, wu.y) * DEG;
  }
  const railEng = rollEng - tiltEng;

  const rlAxis = rollAxisScratch.set(0, 0, 1).applyQuaternion(board.orientation);
  const rot = (peek(board, 'rotation') as unknown as number[] | undefined);
  const rlAxisOk = rot === undefined ? null
    : r(rlAxis.x * rot[2] + rlAxis.y * rot[5] + rlAxis.z * rot[8], 9);
  const rlOmega = board.angularVelocity.dot(rlAxis);
  const q = board.roll as unknown as Record<string, number>;
  const rl: Record<string, number | null> = {};
  for (const key of Object.keys(board.roll)) rl[`rl_${key}`] = r(q[key], 5);
  const bk: Record<string, number | null> = {};
  if (LEDGERS) for (const key of BANK_SOURCES) {
    bk[`dk_${key}`] = r(bankLedger.deck[key], 6);
    bk[`dw_${key}`] = r(bankLedger.own[key], 6);
  }

  return {
    // --- Step 3.5h (0): the three roll angles, DEGREES, + with the board's +x rail DOWN (the engine's own sense).
    rollEng: r(rollEng, 4), tiltEng: r(tiltEng, 4), railEng: r(railEng, 4), rollHeadGap: r(rollEng - roll, 5),
    // --- Step 3.5h (1): the roll ledger, N·m, + lifting the board's +x rail. `rl_rider` is a RESIDUAL.
    ...rl,
    rlOmega: r(rlOmega, 6), rlOmegaDeg: r(rlOmega * DEG, 4), rlAxisOk,
    // --- Step 3.5h (2): the bank ledger's deck and own columns, rad/s², + rolling the +x rail DOWN, and its controls.
    ...bk,
    bkSteps: LEDGERS ? bankLedger.steps : null, bkApart: LEDGERS ? bankLedger.apart : null,
    bkSplit: LEDGERS ? r(bankLedger.split, 9) : null, bkClosure: LEDGERS ? r(bankLedger.closure, 9) : null,
    bkResidual: LEDGERS ? r(bankLedger.residual, 9) : null, bkSingular: LEDGERS ? bankLedger.singular : null,
    bkDeckTotal: LEDGERS ? r(bankLedger.deckTotal, 6) : null, bkOwnTotal: LEDGERS ? r(bankLedger.ownTotal, 6) : null,
    bkRollDeckPer: LEDGERS ? r(bankLedger.rollDeckPer, 9) : null,
    // ⚠️ No `wetted` here: the parent already emits it at the identical expression and must keep the column. Only
    // `submerged` is new.
    bkSubsteps: board.substepsTaken, submerged: r(board.submergedVolume, 6),
    upright: rider.upright ? 1 : 0, inContact: rider.inContact ? 1 : 0, feasible: rider.contact.feasible ? 1 : 0,
    speed: r(speed, 4), roll: r(roll, 4), bank: r(bank, 4), bankRaw: r((peek(rider, 'bankRaw') ?? Number.NaN) * DEG, 4),
    mismatch: r(mismatch, 4), heading: r(heading, 3), course: r(course, 3), drift: r(course - heading, 3),
    comH: r(comH, 5), comY: r(comY, 5), deckY: r(deckY, 5), tolH: r(tolH, 4), tolY: r(tolY, 4),
    supXMin: r(support.xMin, 4), supXMax: r(support.xMax, 4), supZMin: r(support.zMin, 4), supZMax: r(support.zMax, 4),
    feetRear: r(feetO?.rear, 4), feetFront: r(feetO?.front, 4),
    wantX: r(wantX, 5), wantZ: r(wantZ, 5), outX: r(outX, 5), outZ: r(outZ, 5), loadedNow,
    hAcross: r(hAcross, 5), hAlong: r(hAlong, 5), hGrip: r(hGrip, 5), mine: r(mine, 5),
    rawMargin: r(rawMargin, 5), rawOk, margin: r(rider.balanceMargin, 5),
    bLimit: bl.limit, bMargin: r(bl.margin, 5), bGrip: r(bl.grip, 5), bKnee: r(bl.knee, 5),
    bAcross: bl.across ? 1 : 0, bPast: r(bl.past, 5),
    capAcross: r(st.across, 5), capPoint: r(st.pointAcross, 5), capBeyond: st.beyond ? 1 : 0, capFallen: rider.human.fallen ? 1 : 0,
    hipPast: r(st.hipPast, 5),
    limit, tTip: r(lt?.tip, 5), tSlip: r(lt?.slip, 5), tFlight: r(lt?.flight, 5), tImpact: r(lt?.impact, 5),
    /**
     * ☠️ **`tipPos` is the published pinned test itself — `limitTime.tip > 0` on the UNROUNDED field** (`3.5/bank.ts:317`
     * and #429's `bench.ts:398` both write exactly that). It is here as its own column because `tTip` above is
     * **rounded to 5 decimals for reading** and therefore prints 0 long before the engine's own number does.
     * `tTipRaw` carries the field at full width so the decay can be read: `limitTime.tip` only ever *adds* `h` when
     * tip binds and otherwise multiplies by `exp(−h/CAUSE_MEMORY)`, so under a strict `> 0` test it can only come
     * back to zero by underflowing a double.
     */
    tipPos: (lt?.tip ?? 0) > 0 ? 1 : 0, tTipRaw: lt?.tip ?? null,
    planing: lean.planing, cap: r(lean.cap, 5), ask: r(lean.ask, 5), capDeg: r(lean.cap * DEG, 3),
    speedThrough: r(lean.speedThrough, 4), leanHeld: r(lean.held, 5),
    load: r(rider.contact.load, 5), front: r(rider.contact.frontShare, 5), weight: r(rider.contact.weight, 3),
    legLoad: soft(rider, 'legLoad'), legExt: r(rider.leg.extension, 5), copX: r(rider.contact.centreOfPressure.x, 5),
    copZ: r(rider.contact.centreOfPressure.z, 5), wetted: r(board.wettedArea, 5),
    swingT: soft(rider, 'swingTorque'), swingA: r(rider.swing.angle * DEG, 4),
    slope: r(slope, 3), steer: r(rider.steer, 4),
    // --- Step 3.5g (1): the cap's own expression, rebuilt. `capOk` is the identity that licenses the rest.
    capFwd: r(capFwd, 5), capFlow: r(capFlow, 5), capSpeed: r(capSpeed, 5),
    capHeld: r(capHeld, 7), capHeldDeg: r(capHeld * DEG, 4), capOk, fieldsOk,
    /**
     * ⚠️ `capOk`/`fieldsOk` are the PROBE's own reconstruction from frame-end private fields, and the bank step runs
     * once per substep (16 of them), so they go to 0 on any frame where the last substep moved the board between the
     * cap's own read and the frame's end. `capExactOk` is the identity that carries the claim: the formula and its R,
     * on the engine's own `speedThrough`.
     */
    capExact: r(capExact, 7), capExactDeg: r(capExact * DEG, 4), capExactOk,
    speedThroughRaw: lean.speedThrough, leanHeldRaw: lean.held,
    capR: r(lean.radius, 4), capWant: r(lean.want, 5), capWantDeg: r(lean.want * DEG, 4),
    leanHeldDeg: r(lean.held * DEG, 4), askDeg: r(lean.ask * DEG, 4),
    fwdY: r(fwdY, 5), bvY: r(bv?.y, 5), bvGround: r(bvGround, 5), headDeg: r(headDeg, 4),
    flowX: r(wf?.x, 5), flowZ: r(wf?.z, 5),
    // --- Step 3.5g (2): the ankle ledger's step means, the three terms, and the live fields beside them.
    akN: a.substeps, akTorque: r(a.torque, 4), akPeak: r(a.peak, 4),
    akDemand: r(a.demand, 4), akDemandPeak: r(a.demandPeak, 4), akAbsorbed: r(a.absorbed, 4), akFree,
    akAngleDeg: r(a.angle * DEG, 4), akAnglePeakDeg: r(a.anglePeak * DEG, 4), akRestDeg: r(a.rest * DEG, 4),
    akBound: r(a.bound, 4), akLoad: r(a.load, 4), akRoomDeg: r(a.room * DEG, 4), akBiteDeg: r(a.bite * DEG, 4),
    akOver: a.over,
    termJoint: r(termJoint, 4), termRest: r(termRest, 4), termRate: r(termRate, 4),
    rateImplied: r(rateImplied, 4), termRateLive: r(termRateLive, 4),
    lvRestDeg: r(lvRest * DEG, 4), lvTorque: soft(rider, 'ankleTorque'), lvSwing: soft(rider, 'swingTorque'),
    lvBankDeg: r(rider.bank.angle * DEG, 4), lvBankRate: r((peek(rider, 'bankRate') ?? rider.bank.rate) * DEG, 4),
    lvBankSpeed: r(lvBankSpeed, 5), lvLegLength: r(lvLegLength, 5), lvRelativeDeg: r(lvRelative * DEG, 4),
    lvLegLoad: soft(rider, 'legLoad'), lvHeldAnkleDeg: r((peek(rider, 'heldAnkleRaw') ?? Number.NaN) * DEG, 4),
    lvRoomDeg: r((peek(rider, 'ankleRoom') ?? Number.NaN) * DEG, 4),
    lvBiteDeg: r((peek(rider, 'ankleBite') ?? Number.NaN) * DEG, 4),
    lvRailAhead: r((peek(rider, 'railAhead') ?? Number.NaN) * DEG, 4),
    lvSchedRailDeg: r((peek(rider, 'schedRail') ?? Number.NaN) * DEG, 4),
    /** `soleBound()` rebuilt on the probe's side: the sole-moment denominator `across` is a headroom against. */
    soleBound: r(Math.max(0, peek(rider, 'legLoad') ?? 0) * half, 4),
  };
}

/** A PLAIN median: the mean of the two middle elements at even length. */
function median(x: number[]): number {
  const s = x.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const peakOf = (x: number[]): number => (x.length ? Math.max(...x.map(Math.abs)) : Number.NaN);
const minOf = (x: number[]): number => (x.length ? Math.min(...x) : Number.NaN);

/** The window's own summary columns, named the same for both modes. */
function windowOf(f: Series): Record<string, unknown> {
  return {
    n: f.n,
    loadMed: r(median(f.load), 4), loadPeak: r(peakOf(f.load), 4),
    legLoadMed: r(median(f.legLoad), 4), legLoadMin: r(minOf(f.legLoad), 4),
    wetMed: r(median(f.wetted), 5), wetMin: r(minOf(f.wetted), 5),
    rollMed: r(median(f.roll.map(Math.abs)), 4), rollPeak: r(peakOf(f.roll), 4),
    bankMed: r(median(f.bank.map(Math.abs)), 4), bankPeak: r(peakOf(f.bank), 4),
    misMed: r(median(f.mismatch.map(Math.abs)), 4), misPeak: r(peakOf(f.mismatch), 4),
    comHMed: r(median(f.comH), 5), comYMed: r(median(f.comY), 5), tolMed: r(median(f.tol), 4),
    outXMed: r(median(f.outX), 5), outXPeak: r(peakOf(f.outX), 5),
    outZMed: r(median(f.outZ), 5), outZPeak: r(peakOf(f.outZ), 5),
    planingMed: r(median(f.planing), 4), planingFirst: r(f.planing[0], 4), planingOn: f.planing.filter((p) => p > 0).length,
    capMed: r(median(f.cap), 5), capOn: f.cap.filter((c) => c > 0).length,
    askOn: f.ask.filter((a) => a !== 0).length,
    hAcrossMed: r(median(f.hAcross), 5), hAlongMed: r(median(f.hAlong), 5), hGripMed: r(median(f.hGrip), 5),
    pinned: f.pinned, pinNow: f.pinNow, outAny: f.outAny, contactOff: f.contactOff,
    rawOk: f.rawOk, rawSeen: f.rawSeen,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=takeoff — #429's drive, unchanged.
// ---------------------------------------------------------------------------------------------------------------
interface Script { name: string; pop: 'cue' | 'lift' | 'early'; turn: 0 | 1 | -1 }
const LIFT_AHEAD = Number(process.env.LIFT_AHEAD ?? 1.5);
const LIFT_FRACTION = Number(process.env.LIFT_FRACTION ?? 0.6);
const EARLY = Number(process.env.EARLY ?? 2);
const scriptOf = (name: string): Script => ({
  name,
  pop: name.startsWith('cue') ? 'cue' : name.startsWith('early') ? 'early' : 'lift',
  turn: name.endsWith('L') ? 1 : name.endsWith('R') ? -1 : 0,
});

interface Rider {
  arm: string;
  script: Script;
  session: RideSession;
  gauge: WaveFrameGauge;
  sprinting: boolean;
  seenBehind: boolean;
  cueAt?: number;
  popBy?: 'cue' | 'lift' | 'early';
  popAt?: number;
  standAt?: number;
  fellAt?: number;
  cause?: string;
  arrival?: number;
  passedAt?: number;
  /** When `limitTime.tip` first went positive, and in which phase: the latch's own origin. */
  tipLatchAt?: number;
  tipLatchPhase?: string;
  face: number;
  riding: number;
  frames: number;
  liveFrames: number;
  done: boolean;
  /** The owner's own window: the first second after the stand. */
  firstSecond: Series;
  /** The whole stand, however long it lasted: the population the regressions want. */
  wholeStand: Series;
  /** The first frame each named condition held, measured from the stand (frames). */
  firstAt: Record<string, number>;
  atStand?: Record<string, unknown>;
  lastFoot: [number, number, number, number, number, number] | null;
  /** The last frame on which the rider was still attached: the fall is read off this, never off the frozen columns. */
  lastLive?: Record<string, unknown>;
  /** Every controller tick this rider ran, in order (`TICKS=off`: empty). */
  ticks: TickRec[];
}

interface Trial { placed: number; riders: Rider[]; last: number[]; arrival?: number; index: number }
const trials: Trial[] = [];
const active: Trial[] = [];

/**
 * **The controller's own tick inputs, recorded on the PROBE's side and nowhere else.**
 *
 * `AttachedRider` calls `this.predictor.tick(sense, speed, yawDepth, −leanAsked, −twistAsked, limits, rail, tilt)`
 * once per control step (`:3724`), and every one of those eight is a LOCAL at that call site: none of them is a field
 * a probe can read afterwards. So this wraps the method **on the instance**, which shadows the prototype's own, and
 * the wrapper's only statement before and after the call through is a record. ⭐ **It calls the original with the same
 * arguments and returns exactly what the original returned**, so the ride it observes is the ride that would have
 * run without it. `sense` is `AttachedRider.senseScratch` and is reused every tick, so it is copied here.
 *
 * `TICKS=off` removes the wrapper entirely: with `LEDGERS=off` as well, that is the round's full inertness control.
 */
const TICKS = process.env.TICKS !== 'off';
interface TickRec {
  /** The probe frame this tick fell in, the rider's own clock at it (s since the trial was placed), and the
   * controller's own tick counter before it ran. ⚠️ `tAt` is recorded rather than rebuilt from `frame`, because the
   * rider's first frame is not at t = 0: it is stepped with `t − trial.placed` and the trial is placed mid-step. */
  frame: number; tAt: number; n: number;
  sense: number[]; speed: number; depth: number; bank: number; twist: number;
  ankleLo: number; ankleHi: number; twistLim: number; rail: number; tilt: number;
  /** What came back out: the clamped command, and `raw` before the clamps. */
  u0: number; u1: number; raw0: number; raw1: number;
}
/** The frame being stepped, so a tick can be stamped with it. The drive is single-threaded and one rider at a time. */
let tickFrame = 0;
let tickT = 0;
function recordTicks(rider: AttachedRider, into: TickRec[]): void {
  const holder = rider as unknown as { predictor: { tick: (...a: never[]) => readonly number[]; ticks: number; raw: number[] } };
  const ctrl = holder.predictor;
  const original = ctrl.tick.bind(ctrl);
  (ctrl as unknown as { tick: unknown }).tick = (
    sense: readonly number[], speed: number, depth: number, bankAsked: number, twistAsked: number,
    limits: { ankle: number | readonly [number, number]; twist: number }, rail = 0, tilt = 0,
  ): readonly number[] => {
    const n = ctrl.ticks;
    const out = original(sense as never, speed as never, depth as never, bankAsked as never, twistAsked as never,
      limits as never, rail as never, tilt as never);
    const [lo, hi] = typeof limits.ankle === 'number' ? [-limits.ankle, limits.ankle] : limits.ankle;
    into.push({
      frame: tickFrame, tAt: tickT, n, sense: Array.from(sense), speed, depth, bank: bankAsked, twist: twistAsked,
      ankleLo: lo, ankleHi: hi, twistLim: limits.twist, rail, tilt,
      u0: out[0], u1: out[1], raw0: ctrl.raw[0], raw1: ctrl.raw[1],
    });
    return out;
  };
}

function makeRider(arm: string, script: Script): Rider {
  const session = new RideSession(riderOptions(armConfig.get(arm)!) as ConstructorParameters<typeof RideSession>[0]);
  const direction = (config.directionDegrees * Math.PI) / 180;
  const ticks: TickRec[] = [];
  if (TICKS) recordTicks(session.rider, ticks);
  return {
    arm, script, session, gauge: new WaveFrameGauge({ directionX: Math.sin(direction), directionZ: Math.cos(direction) }),
    sprinting: false, seenBehind: false, face: 0, riding: 0, frames: 0, liveFrames: 0, done: false,
    firstSecond: series(), wholeStand: series(), firstAt: {}, lastFoot: null, ticks,
  };
}

function place(index: number): Trial {
  const trial: Trial = { placed: sim.solver.time, index, last: [], riders: [] };
  for (const arm of ARMS) for (const name of SCRIPTS) trial.riders.push(makeRider(arm, scriptOf(name)));
  for (const rider of trial.riders) rider.session.place({ x: startX, z: startZ, heading: 0, speed: 0, phase: 'prone' }, water);
  return trial;
}

const markAt = (rider: Rider, key: string, held: boolean, sinceStand: number): void => {
  if (held && rider.firstAt[key] === undefined) rider.firstAt[key] = Math.round(sinceStand / STEP);
};

function stepRider(rider: Rider, t: number, trial: Trial): void {
  const { session, script } = rider;
  // Step 3.5h: the frame and the clock a control tick is stamped with. Set before `session.step`, which runs it.
  tickFrame = rider.frames + 1;
  tickT = t;
  const board = session.board;
  const frame: WaveFrame = rider.gauge.update(water, board.centerOfMass, board.velocity, STEP, 55);
  if (frame.valid && frame.aheadOfCrest > 3 && frame.crestSpeed > 2) rider.seenBehind = true;
  const closing = frame.crestSpeed - frame.speedShoreward;
  const toCrest = rider.seenBehind && frame.valid && frame.aheadOfCrest > 0 && closing > 0.5 ? frame.aheadOfCrest / closing : Number.POSITIVE_INFINITY;
  const prone = session.phase === 'prone';
  if (frame.valid && frame.aheadOfCrest >= 0 && frame.aheadOfCrest <= 10) rider.face = Math.max(rider.face, frame.faceHeight);
  if (rider.arrival === undefined && rider.seenBehind && frame.valid && frame.aheadOfCrest <= 0.5 && frame.crestSpeed > 2) rider.arrival = t;
  const cue = prone && (session.rider.popUpCue || inTakeOffWindow(frame));
  if (cue && rider.cueAt === undefined) rider.cueAt = t;
  let pop = false;
  let lifted = false;
  if (prone && rider.popAt === undefined && rider.seenBehind) {
    if (!rider.sprinting && toCrest <= SPRINT) rider.sprinting = true;
    if (cue) pop = true;
    lifted = rider.sprinting && frame.valid && frame.aheadOfCrest < LIFT_AHEAD && frame.aheadOfCrest > 0 && frame.faceFraction > LIFT_FRACTION;
    if (script.pop === 'lift' && lifted) pop = true;
    if (script.pop === 'early' && rider.sprinting && toCrest <= EARLY) pop = true;
  }
  if (pop) {
    rider.popAt = t;
    rider.popBy = cue ? 'cue' : script.pop;
  }
  const sinceStand = rider.standAt === undefined ? -1 : t - rider.standAt;
  const turning = script.turn !== 0 && session.phase === 'standing' && sinceStand >= TURN_AT && sinceStand < TURN_AT + TURN_FOR;
  const input = {
    paddle: prone && !pop && rider.popAt === undefined,
    sprint: prone && rider.sprinting && !pop,
    popUp: pop,
    steer: turning ? script.turn * TURN_STEER : 0,
    ...(turning && TURN_COMPRESS > 0 ? { compress: TURN_COMPRESS } : {}),
  };
  session.step(STEP, water, input);
  rider.frames += 1;
  const attached = session.rider.attached;
  if (attached) rider.liveFrames += 1;
  const standsNow = session.phase === 'standing' && rider.standAt === undefined;
  if (standsNow) rider.standAt = t;
  const since = rider.standAt === undefined ? -1 : t - rider.standAt;
  if (session.phase === 'standing' && frame.valid && frame.aheadOfCrest >= 0 && frame.speedShoreward >= 0.6 * frame.crestSpeed) rider.riding += STEP;

  // ☠️ Where the published pinned LATCH comes from. `limitTime.tip` is read here on every frame, standing or not and
  // probe or not (a pure read of a number), because the share `limitTime.tip > 0` reports is the share of frames at
  // or after the FIRST tip substep — and on a take-off that substep can fall inside the pop-up, before the stand the
  // share is attributed to.
  if (attached && rider.tipLatchAt === undefined && (peekO(session.rider, 'limitTime')?.tip ?? 0) > 0) {
    rider.tipLatchAt = t;
    rider.tipLatchPhase = session.phase;
  }
  const standing = session.phase === 'standing' && attached;
  const into = !standing ? null : since <= 1 ? rider.firstSecond : null;
  const row = PROBE_ON || standing ? readRow(board, session.rider, into, PROBE_ON) : null;
  // The whole stand feeds the regressions; the first second feeds the owner's own window, so a frame in the first
  // second is pushed to both.
  if (standing) {
    const f = rider.wholeStand;
    const r0 = row!;
    f.n += 1;
    f.roll.push(Number(r0.roll));
    f.bank.push(Number(r0.bank));
    f.mismatch.push(Number(r0.mismatch));
    f.planing.push(Number(r0.planing));
    f.cap.push(Number(r0.cap));
    if (since > 1) {
      f.load.push(Number(r0.load));
      f.outX.push(Number(r0.outX));
      f.outZ.push(Number(r0.outZ));
    }
    f.rawSeen += Number.isFinite(Number(r0.rawMargin)) ? 1 : 0;
    f.rawOk += Number(r0.rawOk);
    f.pinned += Number(r0.tipPos);
    f.pinNow += r0.limit === 'tip' ? 1 : 0;
    f.outAny += Number(r0.outX) > 0 || Number(r0.outZ) > 0 ? 1 : 0;
    markAt(rider, 'tipNow', r0.limit === 'tip', since);
    markAt(rider, 'tipMem', Number(r0.tipPos) === 1, since);
    markAt(rider, 'outAny', Number(r0.outX) > 0 || Number(r0.outZ) > 0, since);
    markAt(rider, 'planing', Number(r0.planing) > 0, since);
    markAt(rider, 'askNonZero', Number(r0.ask) !== 0, since);
    markAt(rider, 'misPastTol', Math.abs(Number(r0.mismatch)) > Number(r0.tolH), since);
    if (standsNow) rider.atStand = { ...r0, frame: rider.frames, t };
  }

  if (PROBE_ON) {
    const foot: number[] = [];
    for (const index of [5, 6]) {
      session.rider.renderPoint(index, board, footWorld);
      board.toLocal(footWorld, footLocal);
      foot.push(footLocal.x, footLocal.y, footLocal.z);
    }
    const footRate: (number | null)[] = rider.lastFoot === null ? [null, null] : [0, 1].map((k) => {
      const last = rider.lastFoot!;
      return Math.hypot(foot[k * 3] - last[k * 3], foot[k * 3 + 1] - last[k * 3 + 1], foot[k * 3 + 2] - last[k * 3 + 2]) / STEP;
    });
    rider.lastFoot = foot as [number, number, number, number, number, number];
    const full: Record<string, unknown> = {
      kind: 'row', mode: 'takeoff', arm: rider.arm, script: script.name, wave: trial.index, frame: rider.frames, t: r(t, 5),
      tPop: rider.popAt === undefined ? null : r(t - rider.popAt, 5),
      tStand: rider.standAt === undefined ? null : r(since, 5),
      phase: session.phase, attached: attached ? 1 : 0, sep: session.separation ?? null,
      popUp: pop ? 1 : 0, cueNow: cue ? 1 : 0, liftNow: lifted ? 1 : 0,
      ahead: r(frame.aheadOfCrest, 4), faceH: r(frame.faceHeight, 4), faceFrac: r(frame.faceFraction, 4),
      crestV: r(frame.crestSpeed, 4), shoreV: r(frame.speedShoreward, 4),
      foot5: footRate[0] === null ? null : r(footRate[0], 5), foot6: footRate[1] === null ? null : r(footRate[1], 5),
      ...(row ?? {}),
    };
    const fine = rider.popAt !== undefined && t >= rider.popAt - 0.5;
    if (LOG !== 'none' && (LOG === 'all' || fine || rider.frames % 10 === 0)) emit(full);
    if (attached) rider.lastLive = full;
  }

  if (!attached && rider.fellAt === undefined) {
    rider.fellAt = t;
    rider.cause = session.separation ?? '?';
    rider.done = true;
  }
  if (rider.passedAt === undefined && rider.arrival !== undefined && frame.valid && frame.aheadOfCrest < -1.5 && session.phase !== 'standing') rider.passedAt = t;
  if (rider.standAt !== undefined && since >= STAND_HOLD) rider.done = true;
  if (rider.passedAt !== undefined && t > rider.passedAt + 1) rider.done = true;
  if (rider.popAt === undefined && rider.standAt === undefined && t > TRIAL - 1) rider.done = true;
  if (rider.popAt !== undefined && rider.standAt === undefined && session.phase === 'prone' && t > rider.popAt + 3) rider.done = true;
}

function takeoff(): void {
  const probeZ = startZ - CREST_PROBE;
  const depthAt = (z: number): number => -sim.bedAt(focus.x, z) + sim.solver.restLevel;
  const earliest = (0.5 * CREST_PROBE) / Math.sqrt(9.81 * depthAt(startZ - CREST_PROBE / 2));
  const span = Math.round((0.5 * config.peakPeriod) / STEP);
  const minRise = 0.3 * config.significantHeight;
  const history: number[] = [];
  let lastTrigger = Number.NEGATIVE_INFINITY;
  const end = sim.solver.time + PERIODS * config.peakPeriod;
  let waves = 0;
  while (sim.solver.time < end || active.length > 0) {
    sim.step(STEP);
    const t = sim.solver.time;
    if (t < end) {
      history.push(water.surfaceAt(startX, probeZ));
      if (history.length > span) history.shift();
      const n = history.length;
      if (n >= 3 && history[n - 2] > history[n - 3] && history[n - 2] >= history[n - 1] && history[n - 2] - Math.min(...history) >= minRise
        && t - lastTrigger > 0.4 * config.peakPeriod) {
        lastTrigger = t;
        waves += 1;
        // ⭐ **`WAVES=1,2,6,11` places riders on those crests only, and the sea runs on untouched.** The parent's own
        // note carries this: the riders never push the water and never see each other, so a crest with no rider on
        // it cannot change the sea, the crest numbering (which comes from the sea's own detector above) or any other
        // wave's frames. It is the same argument that lets `PERIODS=1` reproduce wave 1's own numbers, and the
        // reproduction of the published `cue` wave-1 ride is what says so.
        // ☠️ **NOT `continue`.** This block sits inside the `while` that also steps every active rider further down,
        // so a `continue` here would drop ONE frame of rider stepping on every frame a skipped crest is detected —
        // and crests arrive 0.4 x peakPeriod apart while a rider stays active for up to `TRIAL` seconds, so a rider
        // on a KEPT wave would silently lose frames to the skipped ones. The placement is skipped; the loop is not.
        if (WAVE_PICK === null || WAVE_PICK.includes(waves)) {
          const trial = place(waves);
          trials.push(trial);
          active.push(trial);
        }
      }
    }
    for (let k = active.length - 1; k >= 0; k -= 1) {
      const trial = active[k];
      if (trial.arrival === undefined) {
        const last = trial.last;
        last.push(water.surfaceAt(startX, startZ));
        if (last.length > 3) last.shift();
        if (last.length === 3 && last[1] > last[0] && last[1] >= last[2] && t - STEP - trial.placed >= earliest) trial.arrival = t - STEP - trial.placed;
      }
      for (const rider of trial.riders) if (!rider.done) stepRider(rider, t - trial.placed, trial);
      if (t - trial.placed >= TRIAL || trial.riders.every((rider) => rider.done)) active.splice(k, 1);
    }
  }
  for (const trial of trials) {
    for (const rider of trial.riders) {
      // Step 3.5h: the recorded tick inputs, to their OWN file (`TICKOUT`), so the row schema above is untouched and
      // a reader of this round's rows cannot accidentally pool a controller tick with a frame.
      if (TICKOUT && rider.ticks.length) {
        appendFileSync(TICKOUT, `${JSON.stringify({
          kind: 'ticks', arm: rider.arm, script: rider.script.name, wave: trial.index,
          stand: r(rider.standAt, 5), fell: r(rider.fellAt, 5), pop: r(rider.popAt, 5), n: rider.ticks.length,
          // ⚠️ FULL WIDTH, not rounded: the replay has to reproduce the engine's own command bit for bit, and a
          // rounded input cannot do that.
          ticks: rider.ticks,
        })}\n`);
      }
      emit({
        kind: 'summary', mode: 'takeoff', arm: rider.arm, script: rider.script.name, wave: trial.index,
        frames: rider.frames, liveFrames: rider.liveFrames,
        cue: r(rider.cueAt, 5), popBy: rider.popBy ?? null, pop: r(rider.popAt, 5), stand: r(rider.standAt, 5),
        fell: r(rider.fellAt, 5), cause: rider.cause ?? null,
        fellAfterStand: rider.fellAt !== undefined && rider.standAt !== undefined ? r(rider.fellAt - rider.standAt, 5) : null,
        standAfterPop: rider.standAt !== undefined && rider.popAt !== undefined ? r(rider.standAt - rider.popAt, 5) : null,
        stood: rider.standAt !== undefined ? 1 : 0, popped: rider.popAt !== undefined ? 1 : 0,
        // ⚠️ CENSORING, named: how much of STAND_HOLD the trial's own clock allowed after this stand, and whether the
        // owner's own first second was available at all. A no-fall row is a survivor only if `standExposure` covers it.
        standExposure: rider.standAt === undefined ? null : r(Math.min(STAND_HOLD, TRIAL - rider.standAt), 5),
        firstFull: rider.standAt === undefined ? null : (rider.fellAt !== undefined && rider.fellAt - rider.standAt <= 1) || TRIAL - rider.standAt >= 1 ? 1 : 0,
        censored: rider.standAt !== undefined && rider.fellAt === undefined && TRIAL - rider.standAt < STAND_HOLD ? 1 : 0,
        // ⚠️ `riding` is NOT a survival clock (`bench.ts:373` only ticks it while the rider is ahead of the crest AND
        // at 0.6 of its speed): it is kept for continuity with #429 and nothing here reads it. Use `fellAfterStand`
        // against `standExposure`.
        riding: r(rider.riding, 4), face: r(rider.face, 4),
        tipLatchAt: r(rider.tipLatchAt, 5), tipLatchPhase: rider.tipLatchPhase ?? null,
        tipLatchBeforeStand: rider.tipLatchAt !== undefined && rider.standAt !== undefined ? (rider.tipLatchAt < rider.standAt ? 1 : 0) : null,
        tipLatchAfterStand: rider.tipLatchAt !== undefined && rider.standAt !== undefined ? r(rider.tipLatchAt - rider.standAt, 5) : null,
        popOutcome: rider.session.rider.popUpReport.outcome, popRefusal: rider.session.rider.popUpReport.refusal ?? null,
        landingPeak: r(rider.session.rider.popUpReport.landingPeak, 4), landingFront: r(rider.session.rider.popUpReport.frontShare, 4),
        first: windowOf(rider.firstSecond), whole: windowOf(rider.wholeStand), firstAt: rider.firstAt,
        atStand: rider.atStand ?? null, atFall: rider.fellAt === undefined ? null : rider.lastLive ?? null,
      });
    }
  }
  emit({
    kind: 'done', mode: 'takeoff', address: ADDRESS, arms: ARMS, scripts: SCRIPTS, seed: SEED, size: SIZE, waves,
    runs: trials.reduce((a, trial) => a + trial.riders.length, 0), seaTime: sim.solver.time, seconds: (Date.now() - wall) / 1000,
  });
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=placed — `3.5/bank.ts`'s own `MODE=sea` rig, which is the rig behind all four published numbers.
// ---------------------------------------------------------------------------------------------------------------
interface Placed {
  arm: string; trial: number; entry: number; stance: Stance; board: BoardBody; rider: AttachedRider;
  frame: number; done: boolean; fellAt: number | null; cause: string;
  firstSecond: Series; whole: Series; firstAt: Record<string, number>; atStand?: Record<string, unknown>; lastLive?: Record<string, unknown>;
}
const scratch = createWaterSample();

function placePair(arm: string, x: number, z: number, speed: number, stance: Stance, stick: number): { board: BoardBody; rider: AttachedRider } | null {
  const sy = water.surfaceAt(x, z);
  const here = water.sampleAt(x, sy, z, scratch);
  if (!here.wet || here.outsideDomain) return null;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const fall = new Vector3(here.slopeX, 0, here.slopeZ);
  if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
  fall.normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(x, sy, z).addScaledVector(normal, board.shape.centerOfMass.y - SINK),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(speed).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rd = new AttachedRider(board.shape, { phase: 'standing', ...riderOptions(armConfig.get(arm)!) } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rd);
  rd.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rd.compress = stance === 'compress' ? 1 : 0;
  rd.steer = stick;
  return { board, rider: rd };
}

function placedMode(): void {
  const runs: Placed[] = [];
  let placedTrials = 0;
  let t = 0;
  const horizon = PLACED_FOR + GAP * TRIALS + 2;
  while (t < horizon) {
    sim.step(STEP);
    t += STEP;
    if (placedTrials < TRIALS && t >= GAP * (placedTrials + 1)) {
      placedTrials += 1;
      for (const arm of ARMS) for (const entry of ENTRIES) for (const stance of STANCES) {
        const made = placePair(arm, focus.x, focus.z - AHEAD, entry, stance, STICK);
        if (made) {
          runs.push({
            arm, trial: placedTrials, entry, stance, board: made.board, rider: made.rider,
            frame: 0, done: false, fellAt: null, cause: '', firstSecond: series(), whole: series(), firstAt: {},
          });
        }
      }
    }
    for (const e of runs) {
      if (e.done) continue;
      e.frame += 1;
      e.board.step(STEP, water);
      const attached = e.rider.attached;
      const since = (e.frame - 1) * STEP;
      const into = attached ? (since <= 1 ? e.firstSecond : null) : null;
      const row = attached || PROBE_ON ? readRow(e.board, e.rider, into, PROBE_ON) : null;
      if (attached && row) {
        const f = e.whole;
        f.n += 1;
        f.roll.push(Number(row.roll));
        f.bank.push(Number(row.bank));
        f.mismatch.push(Number(row.mismatch));
        f.planing.push(Number(row.planing));
        f.cap.push(Number(row.cap));
        if (since > 1) {
          f.load.push(Number(row.load));
          f.outX.push(Number(row.outX));
          f.outZ.push(Number(row.outZ));
        }
        f.rawSeen += Number.isFinite(Number(row.rawMargin)) ? 1 : 0;
        f.rawOk += Number(row.rawOk);
        f.pinned += Number(row.tipPos);
        f.pinNow += row.limit === 'tip' ? 1 : 0;
        f.outAny += Number(row.outX) > 0 || Number(row.outZ) > 0 ? 1 : 0;
        const mark = (key: string, held: boolean): void => { if (held && e.firstAt[key] === undefined) e.firstAt[key] = e.frame - 1; };
        mark('tipNow', row.limit === 'tip');
        mark('tipMem', Number(row.tipPos) === 1);
        mark('outAny', Number(row.outX) > 0 || Number(row.outZ) > 0);
        mark('planing', Number(row.planing) > 0);
        mark('askNonZero', Number(row.ask) !== 0);
        mark('misPastTol', Math.abs(Number(row.mismatch)) > Number(row.tolH));
        if (e.frame === 1) e.atStand = { ...row, frame: 1, t: 0 };
      }
      if (PROBE_ON && row) {
        const full = {
          kind: 'row', mode: 'placed', arm: e.arm, trial: e.trial, entry: e.entry, stance: e.stance,
          frame: e.frame, t: r(since, 5), tStand: r(since, 5), phase: 'standing',
          attached: attached ? 1 : 0, sep: e.rider.separation ?? null, ...row,
        };
        if (LOG !== 'none') emit(full);
        if (attached) e.lastLive = full;
      }
      if (!attached) {
        e.done = true;
        e.fellAt = e.frame;
        e.cause = e.rider.separation ?? '?';
      }
      if (since >= PLACED_FOR) e.done = true;
    }
  }
  for (const e of runs) {
    emit({
      kind: 'summary', mode: 'placed', arm: e.arm, trial: e.trial, entry: e.entry, stance: e.stance, stick: STICK, sink: SINK,
      frames: e.frame, liveFrames: e.whole.n, fellAt: e.fellAt, fellT: e.fellAt === null ? null : r(e.fellAt * STEP, 5),
      cause: e.cause || null, stood: 1, popped: 1,
      // A placement is followed PLACED_FOR s from its own frame 1, so the owner's first second is always available
      // and nothing here is censored. Said as a column so the two modes read the same way.
      standExposure: r(PLACED_FOR, 5), firstFull: 1, censored: 0,
      fellAfterStand: e.fellAt === null ? null : r((e.fellAt - 1) * STEP, 5),
      first: windowOf(e.firstSecond), whole: windowOf(e.whole), firstAt: e.firstAt,
      atStand: e.atStand ?? null, atFall: e.fellAt === null ? null : e.lastLive ?? null,
    });
  }
  emit({
    kind: 'done', mode: 'placed', address: ADDRESS, arms: ARMS, seed: SEED, size: SIZE, sink: SINK, stick: STICK,
    runs: runs.length, fell: runs.filter((e) => e.fellAt !== null).length, seaTime: sim.solver.time, seconds: (Date.now() - wall) / 1000,
  });
}

if (MODE === 'placed') placedMode();
else takeoff();
