/**
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
 *     ./node_modules/.bin/rolldown docs/research/new-rider/take-off/stand.ts -o <s>/raw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '' };\n" > <s>/stand.mjs   # an OBJECT, never a string
 *     cat <s>/raw.mjs >> <s>/stand.mjs
 *     cd <s> && env MODE=takeoff SEED=1 PERIODS=12 OUT=<s>/t1.jsonl node --max-old-space-size=3200 stand.mjs
 *     cd <s> && env MODE=placed  SEED=1            OUT=<s>/p1.jsonl node --max-old-space-size=3200 stand.mjs
 *     python3 -I docs/research/new-rider/take-off/stand-read.py <s>/t1.jsonl --label takeoff
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

  return {
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
}

interface Trial { placed: number; riders: Rider[]; last: number[]; arrival?: number; index: number }
const trials: Trial[] = [];
const active: Trial[] = [];

function makeRider(arm: string, script: Script): Rider {
  const session = new RideSession(riderOptions(armConfig.get(arm)!) as ConstructorParameters<typeof RideSession>[0]);
  const direction = (config.directionDegrees * Math.PI) / 180;
  return {
    arm, script, session, gauge: new WaveFrameGauge({ directionX: Math.sin(direction), directionZ: Math.cos(direction) }),
    sprinting: false, seenBehind: false, face: 0, riding: 0, frames: 0, liveFrames: 0, done: false,
    firstSecond: series(), wholeStand: series(), firstAt: {}, lastFoot: null,
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
        const trial = place(waves);
        trials.push(trial);
        active.push(trial);
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
