/**
 * **The stand itself: what the refusal costs, why the feet are under water, and which of the survivors' properties is the cause.**
 *
 * The drive is PR #429's `bench.ts` (the one bench on this track that paddles, is caught, pops up and stands), carried
 * over verbatim in every respect that touches the water or the rider: the owner's own address through the game's own
 * switch parsing, one Canyon B sea shared by every rider, the game's own start, the game's own cue, the Canyon
 * seatbelt read off the solver. Nothing here changes any behaviour, tunes any constant or adds any switch.
 *
 * **What it adds, and why each one was needed.**
 *
 *  1. **`standRefusal`'s own three tests, recomputed read-only every frame** (`AttachedRider.standRefusal`:
 *     `strained` / `no water` / `sinking` / `feet under water`, with its own STAND_STRAIN 0.05, SINK_RATE 0.3 and
 *     FEET_DEPTH 0.1 restated here as `MIRROR`). #429 could say *that* 12 of 18 stands were refused for
 *     `feet under water`; it could not say when the feet went under, or by how much. The mirror's **positive control**
 *     is the game's own verdict: at the stand it must return exactly `popUpReport.refusal`.
 *  2. **The fall test's own two channels.** The new rider's fall standing is `human.fallen` =
 *     `state.beyond && state.weightPast` (`AttachedRider.endStep`), and `beyond` is
 *     `pastAcross > reachAcross || pastAlong > reachAlong` (`humanBalance.capture`) — **two channels, named**. The
 *     whole `human.state` is logged, with the support's own extents, so `pastX` and `pastZ` can be recomputed and the
 *     binding channel named frame by frame.
 *  3. **The three reserves separately** (`balanceLimits`: the capture margin, the grip left, the knees' strength left,
 *     and which was least), plus `frictionUsed` and `kneeUsed` raw.
 *  4. **The contact's own three headrooms separately.** `rawMargin` (which #429's trace read, smoothed, as `margin`)
 *     is `min(across, along, 1 − tangential/friction)` inside `project` — a minimum, so **a falling `rawMargin`
 *     cannot name which of the three fell**. `desiredCop` (the free centre of pressure while the feet are loaded),
 *     the support and `frictionUsed` are logged so all three can be reconstructed.
 *  5. **The planing latch's own quantity**: `hypot(v.x − flow.x, v.z − flow.z)` against PLANING_SPEED 4 (what
 *     `planingStep` tests), beside `leanProbe.speedThrough` (the along-heading speed the lean cap is built on). They
 *     are different numbers and only the first latches.
 *  6. **The board's draft at the feet**: the water's surface over each foot's deck point, which is the refusal's own
 *     quantity, and over the board's own position.
 *  7. ☠️ **`heldFull`, `truncated` and `observedAfterStand`, and a fix to the trial clock that makes them mean
 *     something.** `bench.ts:512` retires a trial at `TRIAL` s **whatever its riders are doing**, so seed 1's wave 6
 *     — which stands at 16.0167 s — was stepped for ONE frame, fell on none of them, and read as the one ride in
 *     #429's study that carried its window. Here a trial is retired only when every rider is done, or when the clock
 *     is past `TRIAL` **and no rider is still inside its own stand window**; and `truncated` flags any rider that
 *     neither fell nor was followed the full `STAND_HOLD` regardless. **A survivor count without `truncated` beside it
 *     is not a count.** (Re-run this way, wave 6 really does hold 3.02 s: the artefact was in the evidence, not the
 *     outcome.)
 *
 * ## Scripts
 *
 * A script's name says **when it pops**; every script here holds the stick at zero, because the owner cannot judge a
 * turn while the ride ends in under a second. `cue` is the game's own cue; `lift` and `early` are #429's two player
 * rules; `d<ms>` pops that many ms **after the cue first lit** (`cued15` = 0.25 s late), which moves where on the face
 * the stand happens on the same wave, with the same paddling, in the same water — the only way this drive has of
 * varying the stand's own place.
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/take-off/stand.ts -o <s>/raw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '' };\n" > <s>/stand.mjs   # an OBJECT, never a string
 *     cat <s>/raw.mjs >> <s>/stand.mjs
 *     cd <s> && env SCRIPTS=cue SEED=1 PERIODS=12 OUT=<s>/s1.jsonl node --max-old-space-size=3200 stand.mjs
 *     python3 -I docs/research/new-rider/take-off/stand.py <s>/s1.jsonl
 *
 * ## ☠️ The traps
 *
 *  1. **In zsh, `SECONDS=0.5 node …` passes through zsh's special INTEGER variable and arrives as `"0"`.** Every
 *     invocation above uses `env`; this file has no `SECONDS`.
 *  2. **`globalThis.location` must be an OBJECT.** A bare string has no `.search`, every switch goes missing and the
 *     bench quietly measures the default Canyon with the default rider. The `control` line prints the grid off the
 *     solver (Canyon B is 400 × 451 = 180 400) and the parsed switches, and the run **exits non-zero** if the address
 *     did not arrive.
 *  3. **"CoP-pinned" is `limitTime.tip > 0`**, not `limit === 'tip'`. Both are emitted (`tTip`, `limit`).
 *  4. **`AttachedRider.separate` never clears `phase` or `upright`.** A run stops at its first `attached === 0`; every
 *     at-the-fall value is read off `atFall`, the last frame on which the rider was still attached.
 *  5. **`desiredCop` only moves while the feet are loaded** (BALANCE_LOAD), so `loaded` is logged beside it; a
 *     headroom reconstructed from a stale `desiredCop` is not a reading.
 *  6. **`human.state` is frozen while the feet are light** (CAPTURE_LOAD, `capture` returns early), so `capFrozen`
 *     and `capLight` are logged beside it, for the same reason.
 *
 * Env: `ADDRESS`, `ARMS`, `SCRIPTS`, `SIZE`, `SEED`, `PERIODS`, `STAND_HOLD`, `TRIAL`, `SPRINT`, `EARLY`,
 * `LIFT_AHEAD`, `LIFT_FRACTION`, `LOG` (`all|window|none`), `PROBE` (`off`: the inertness control), `PLACE` (`1`),
 * `ENTRIES`, `SINKS`, `SIDE`, `OUT`.
 *
 * `docs/` is outside `tsconfig.json`'s `include` and `vitest.config.ts`'s globs, so this file is neither type-checked
 * nor run by the suites, as `bench.ts` beside it. Rider options pass through one `as` cast.
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
/**
 * The three constants `standRefusal` tests against, restated here because they are module-private in
 * `AttachedRider.ts`. If they ever diverge, the mirror's own control fails loudly: `refusalAgree` below compares this
 * mirror's verdict at the stand with the game's own `popUpReport.refusal`, run for run.
 */
const MIRROR = { STAND_STRAIN: 0.05, SINK_RATE: 0.3, FEET_DEPTH: 0.1, PLANING_SPEED: 4 };

const ADDRESS = process.env.ADDRESS ?? '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const ARM_SUFFIX: Record<string, string> = {
  ships: '',
  trunk: '&trunk=mass',
  bank: '&bodyBank=hip',
  cap: '&askCap=4.5',
};
const ARMS = (process.env.ARMS ?? 'ships').split(',').filter(Boolean);
const SCRIPTS = (process.env.SCRIPTS ?? 'cue').split(',').filter(Boolean);
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const SEED = Number(process.env.SEED ?? 1);
const PERIODS = Number(process.env.PERIODS ?? 12);
const STAND_HOLD = Number(process.env.STAND_HOLD ?? 3);
const TRIAL = Number(process.env.TRIAL ?? 16);
/** Where an incoming crest is first noticed, m seaward of the start (#429's, inside the gauge's 40 m look behind). */
const PROBE_AT = 36;
const SPRINT = Number(process.env.SPRINT ?? 2);
const LOG = (process.env.LOG ?? 'window') as 'all' | 'window' | 'none';
/** `PROBE=off`: the per-frame row — and so every read this probe makes of its own accord — is never built. */
const PROBE_ON = process.env.PROBE !== 'off';
const OUT = process.env.OUT;
const PLACE = process.env.PLACE === '1';
const SINKS = (process.env.SINKS ?? '0.06').split(',').map(Number);

const v = (x: number | undefined): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
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
// The address, through the game's own switch parsing (#429's, verbatim).
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
const startX = focus.x + rideLineupAlong(config);
const startZ = focus.z - rideLineupOffset(config);
const { nx, nz } = sim.solver as unknown as { nx: number; nz: number };
const switchesOf = (c: Config): Record<string, unknown> => {
  const out: Record<string, unknown> = { canyonBed: c.canyonBed };
  for (const key of RIDER_KEYS) if (c[key] !== undefined) out[key] = c[key];
  return out;
};
emit({
  control: true, address: ADDRESS, arms: ARMS, scripts: SCRIPTS, size: SIZE, seed: SEED, periods: PERIODS,
  search: (globalThis as { location?: { search?: string } }).location?.search ?? '(none)',
  grid: `${nx}x${nz}`, cells: nx * nz, spunUp: (Date.now() - wall) / 1000, seaTime: sim.solver.time,
  focusX: focus.x, focusZ: focus.z, startX, startZ, lineupOut: rideLineupOffset(config),
  significantHeight: config.significantHeight, peakPeriod: config.peakPeriod,
  switches: Object.fromEntries(ARMS.map((arm) => [arm, switchesOf(armConfig.get(arm)!)])),
  seaDiffs, standHold: STAND_HOLD, log: LOG, probe: PROBE_ON ? 'on' : 'off', mirror: MIRROR,
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
// The riders.
// ---------------------------------------------------------------------------------------------------------------
/** `delay` is in ms after the cue first lit; 0 means "at the cue", which is the game's own press. */
interface Script { name: string; pop: 'cue' | 'lift' | 'early'; delay: number }
const LIFT_AHEAD = Number(process.env.LIFT_AHEAD ?? 1.5);
const LIFT_FRACTION = Number(process.env.LIFT_FRACTION ?? 0.6);
const EARLY = Number(process.env.EARLY ?? 2);
/** `cue`, `lift`, `early` as #429's; a trailing `d<ms>` delays the press that many ms past the rule's own moment. */
const scriptOf = (name: string): Script => {
  const match = /d(\d+)$/.exec(name);
  const base = match ? name.slice(0, name.length - match[0].length) : name;
  return {
    name,
    pop: base.startsWith('cue') ? 'cue' : base.startsWith('early') ? 'early' : 'lift',
    delay: match ? Number(match[1]) / 1000 : 0,
  };
};

/** Everything the probe reads off one frame, named once so a row, a summary instant and a median all agree. */
type Row = Record<string, unknown>;

interface Rider {
  arm: string;
  script: Script;
  session: RideSession;
  gauge: WaveFrameGauge;
  sprinting: boolean;
  seenBehind: boolean;
  cueAt?: number;
  ruleAt?: number;
  popBy?: 'cue' | 'lift' | 'early';
  popAt?: number;
  standAt?: number;
  fellAt?: number;
  cause?: string;
  arrival?: number;
  passedAt?: number;
  popReport?: Row;
  /** The named instants of the sequence: the cue, the press, the push→landing boundary, the stand. */
  atCue?: Row;
  atPop?: Row;
  atLanding?: Row;
  atStand?: Row;
  atLastLanding?: Row;
  /** The 0.5 s of paddling before the press: where the paddle leaves him. */
  prePress: Row[];
  face: number;
  riding: number;
  frames: number;
  liveFrames: number;
  done: boolean;
  firstSecond: { load: number[]; legLoad: number[]; wetted: number[]; roll: number[]; planing: number[]; cap: number[]; latchSpeed: number[]; capMargin: number[]; grip: number[]; knee: number[]; rearDepth: number[]; frontDepth: number[]; pastX: number[]; pastZ: number[]; limits: Record<string, number>; contactOff: number; pinned: number; pinNow: number; n: number };
  lastLive?: Row;
  /** The last time the rider was still attached, s on the trial's clock: kept with the probe off too. */
  lastLiveT?: number;
  /** The first frame on which the fall test's own two terms came true, and which channel was past. */
  beyondAt?: number;
  weightPastAt?: number;
  firstPastX?: number;
  firstPastZ?: number;
}

interface Trial { placed: number; riders: Rider[]; last: number[]; arrival?: number; index: number }
const trials: Trial[] = [];
const active: Trial[] = [];
const sample = createWaterSample();
const footWorld = new Vector3();
const fwd = new Vector3();
const sideV = new Vector3();
const boardUp = new Vector3();
const local = new Vector3();

function makeRider(arm: string, script: Script): Rider {
  const session = new RideSession(riderOptions(armConfig.get(arm)!) as ConstructorParameters<typeof RideSession>[0]);
  const direction = (config.directionDegrees * Math.PI) / 180;
  return {
    arm, script, session, gauge: new WaveFrameGauge({ directionX: Math.sin(direction), directionZ: Math.cos(direction) }),
    sprinting: false, seenBehind: false, face: 0, riding: 0, frames: 0, liveFrames: 0, done: false, prePress: [],
    firstSecond: { load: [], legLoad: [], wetted: [], roll: [], planing: [], cap: [], latchSpeed: [], capMargin: [], grip: [], knee: [], rearDepth: [], frontDepth: [], pastX: [], pastZ: [], limits: {}, contactOff: 0, pinned: 0, pinNow: 0, n: 0 },
  };
}

function place(index: number): Trial {
  const trial: Trial = { placed: sim.solver.time, index, last: [], riders: [] };
  for (const arm of ARMS) for (const name of SCRIPTS) trial.riders.push(makeRider(arm, scriptOf(name)));
  for (const rider of trial.riders) rider.session.place({ x: startX, z: startZ, heading: 0, speed: 0, phase: 'prone' }, water);
  return trial;
}

/**
 * **`AttachedRider.standRefusal`, mirrored read-only.** Same order, same tests, same constants (`MIRROR`). It returns
 * the verdict and the numbers each test turned on, so "the feet are under water" becomes a depth in metres and a time.
 */
interface Refusal {
  verdict: 'strained' | 'no water' | 'sinking' | 'feet under water' | 'none';
  strain: number;
  into: number;
  rearDepth: number;
  frontDepth: number;
  rearFloor: number;
  frontFloor: number;
  boardDraft: number;
}

function mirrorRefusal(rider: Rider): Refusal {
  const r = rider.session.rider;
  const board = rider.session.board;
  const lt = peekO(r, 'limitTime') ?? { flight: 0, tip: 0, slip: 0, impact: 0 };
  const strain = lt.flight + lt.tip + lt.slip + lt.impact;
  const feet = peekO(r, 'feet') ?? { rear: 0, front: 0 };
  const centre = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
  const boardDraft = centre.surfaceY - board.position.y;
  const norm = Math.hypot(centre.slopeX, 1, centre.slopeZ);
  const into = -((board.velocity.x - centre.flowX) * -centre.slopeX + (board.velocity.y - centre.flowY) + (board.velocity.z - centre.flowZ) * -centre.slopeZ) / norm;
  const depth: number[] = [];
  const floor: number[] = [];
  let outside = centre.outsideDomain || !centre.wet;
  for (const z of [feet.rear, feet.front]) {
    board.toWorld(local.set(0, deckHeight(board.shape, z), z), footWorld);
    const s = water.sampleAt(footWorld.x, footWorld.y, footWorld.z, sample);
    if (s.outsideDomain) outside = true;
    depth.push(s.surfaceY - footWorld.y);
    floor.push(s.waterFloorY === undefined ? 0 : 1);
  }
  const out: Refusal = {
    verdict: 'none', strain, into, rearDepth: depth[0], frontDepth: depth[1], rearFloor: floor[0], frontFloor: floor[1], boardDraft,
  };
  // The game's own order, exactly.
  if (!r.inContact || strain > MIRROR.STAND_STRAIN) out.verdict = 'strained';
  else if (outside) out.verdict = 'no water';
  else if (into > MIRROR.SINK_RATE) out.verdict = 'sinking';
  else if ((floor[0] === 0 && depth[0] > MIRROR.FEET_DEPTH) || (floor[1] === 0 && depth[1] > MIRROR.FEET_DEPTH)) out.verdict = 'feet under water';
  return out;
}

function slopeUnder(rider: Rider): number {
  const b = rider.session.board.centerOfMass;
  water.sampleAt(b.x, b.y, b.z, sample);
  return Math.atan(-sample.slopeZ) * DEG;
}

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
    lifted = rider.sprinting && frame.valid && frame.aheadOfCrest < LIFT_AHEAD && frame.aheadOfCrest > 0 && frame.faceFraction > LIFT_FRACTION;
    // The rule's own moment, then the script's delay past it.
    let ruleNow = false;
    if (cue) ruleNow = true;
    if (script.pop === 'lift' && lifted) ruleNow = true;
    if (script.pop === 'early' && rider.sprinting && toCrest <= EARLY) ruleNow = true;
    if (ruleNow && rider.ruleAt === undefined) rider.ruleAt = t;
    if (rider.ruleAt !== undefined && t >= rider.ruleAt + script.delay) pop = true;
  }
  if (pop) {
    rider.popAt = t;
    rider.popBy = cue ? 'cue' : script.pop;
  }
  const sinceStand = rider.standAt === undefined ? -1 : t - rider.standAt;
  const input = { paddle: prone && !pop && rider.popAt === undefined, sprint: prone && rider.sprinting && !pop, popUp: pop, steer: 0 };
  session.step(STEP, water, input);
  rider.frames += 1;
  const attached = session.rider.attached;
  if (attached) {
    rider.liveFrames += 1;
    rider.lastLiveT = t;
  }
  const stoodNow = session.phase === 'standing' && rider.standAt === undefined;
  if (stoodNow) rider.standAt = t;
  if (session.phase === 'standing' && frame.valid && frame.aheadOfCrest >= 0 && frame.speedShoreward >= 0.6 * frame.crestSpeed) rider.riding += STEP;

  if (!PROBE_ON) {
    // The outcomes and the clock are kept; nothing is read of the probe's own accord.
    if (!attached && rider.fellAt === undefined) {
      rider.fellAt = t;
      rider.cause = session.separation ?? '?';
      rider.done = true;
    }
    if (rider.passedAt === undefined && rider.arrival !== undefined && frame.valid && frame.aheadOfCrest < -1.5 && session.phase !== 'standing') rider.passedAt = t;
    if (rider.standAt !== undefined && sinceStand >= STAND_HOLD) rider.done = true;
    if (rider.passedAt !== undefined && t > rider.passedAt + 1) rider.done = true;
    if (rider.popAt === undefined && rider.standAt === undefined && t > TRIAL - 1) rider.done = true;
    if (rider.popAt !== undefined && rider.standAt === undefined && session.phase === 'prone' && t > rider.popAt + 3) rider.done = true;
    return;
  }

  const r = session.rider;
  fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  sideV.set(fwd.z, 0, -fwd.x);
  boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
  const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;
  const lt = peekO(r, 'limitTime');
  const limit = peekS(r, 'limit') ?? null;
  const speed = Math.hypot(board.velocity.x, board.velocity.z);
  const course = Math.atan2(board.velocity.x, board.velocity.z) * DEG;
  const heading = Math.atan2(fwd.x, fwd.z) * DEG;
  const refusal = mirrorRefusal(rider);
  // The planing latch's own quantity (`planingStep`), and the lean cap's (`prepareBank`): different numbers.
  const flow = peekO(r, 'waterFlow') ?? { x: 0, z: 0 };
  const latchSpeed = Math.hypot(board.velocity.x - flow.x, board.velocity.z - flow.z);
  // The fall test's own two channels (`humanBalance.capture`), recomputed from the state and the support.
  const st = r.human.state;
  const support = r.support;
  const halfAcross = (support.xMax - support.xMin) / 2;
  const midZ = (support.zMin + support.zMax) / 2;
  const alongFront = support.zMax - midZ;
  const alongBack = midZ - support.zMin;
  const pastX = Math.max(0, Math.abs(st.across) - halfAcross);
  const pastZ = Math.max(0, st.along - alongFront, -st.along - alongBack);
  const limits = r.balanceLimits;
  const feet = peekO(r, 'feet') ?? { rear: 0, front: 0 };
  const cop = peekO(r, 'desiredCop') ?? { x: 0, z: 0 };
  // The contact's three headrooms, which `rawMargin` takes the minimum of (`project`): a minimum cannot name them.
  const halfX = (support.xMax - support.xMin) / 2;
  const feetHalf = (feet.front - feet.rear) / 2;
  const cAcross = halfX > 0 ? 1 - Math.abs(cop.x - (support.xMin + support.xMax) / 2) / halfX : 0;
  const cBeyond = Math.max(0, Math.abs(cop.z - midZ) - feetHalf);
  const cAlong = 1 - cBeyond / Math.max(1e-6, (support.zMax - support.zMin) / 2 - feetHalf);
  const cGrip = 1 - (peek(r, 'frictionUsed') ?? 0);

  if (st.beyond && rider.beyondAt === undefined && r.phase === 'standing') {
    rider.beyondAt = t;
    rider.firstPastX = pastX;
    rider.firstPastZ = pastZ;
  }
  if (st.weightPast && rider.weightPastAt === undefined && r.phase === 'standing') rider.weightPastAt = t;

  const row: Row = {
    arm: rider.arm, script: script.name, wave: trial.index, frame: rider.frames, t,
    tCrest: trial.arrival === undefined || rider.arrival === undefined ? null : t - rider.arrival,
    tPop: rider.popAt === undefined ? null : t - rider.popAt,
    tStand: rider.standAt === undefined ? null : t - rider.standAt,
    phase: session.phase, attached: attached ? 1 : 0, upright: r.upright ? 1 : 0, inContact: r.inContact ? 1 : 0,
    feasible: r.contact.feasible ? 1 : 0, sep: session.separation ?? null,
    paddle: input.paddle ? 1 : 0, sprint: input.sprint ? 1 : 0, popUp: pop ? 1 : 0, cueNow: cue ? 1 : 0, liftNow: lifted ? 1 : 0,
    // --- the board
    px: v(board.position.x), py: v(board.position.y), pz: v(board.position.z),
    vx: v(board.velocity.x), vy: v(board.velocity.y), vz: v(board.velocity.z), speed: v(speed),
    roll: v(roll), heading: v(heading), course: v(course), drift: v(course - heading),
    wetted: v(board.wettedArea), volume: v(board.submergedVolume), substeps: board.substepsTaken,
    // --- the wave under and behind it
    wValid: frame.valid ? 1 : 0, ahead: v(frame.aheadOfCrest), faceH: v(frame.faceHeight), faceFrac: v(frame.faceFraction),
    crestV: v(frame.crestSpeed), shoreV: v(frame.speedShoreward), breaking: v(frame.crestBreaking), slope: v(slopeUnder(rider)),
    // --- ⭐ the refusal's own three tests, every frame
    refuse: refusal.verdict, strain: v(refusal.strain), into: v(refusal.into),
    rearDepth: v(refusal.rearDepth), frontDepth: v(refusal.frontDepth),
    rearFloor: refusal.rearFloor, frontFloor: refusal.frontFloor, draft: v(refusal.boardDraft),
    // --- ⭐ the fall test's own two channels
    capAcross: v(st.across), capAlong: v(st.along), capPast: v(st.past), capPastAcross: v(st.pastAcross),
    capReach: v(st.reach), capBeyond: st.beyond ? 1 : 0, capWeightPast: st.weightPast ? 1 : 0,
    capMargin: v(st.margin), capHeight: v(st.height), capOmega: v(st.omega), capPointAcross: v(st.pointAcross),
    capTiltAcross: v(st.tiltAcross), capOffsetAcross: v(st.offsetAcross), capFeltAcross: v(st.feltAcross),
    hipPast: v(st.hipPast), pastX: v(pastX), pastZ: v(pastZ),
    capFrozen: r.human.frozen ? 1 : 0, capLight: v(r.human.lightFor), capLoad: v(r.captureLoad),
    halfAcross: v(halfAcross), alongFront: v(alongFront), alongBack: v(alongBack),
    // --- ⭐ the three reserves, separately
    bLimit: limits.limit, bMargin: v(limits.margin), bGrip: v(limits.grip), bKnee: v(limits.knee),
    bAcross: limits.across ? 1 : 0, bPast: v(limits.past), reserve: v(r.balanceReserve),
    friction: soft(r, 'frictionUsed'), kneeUsed: soft(r, 'kneeUsed'),
    // --- ⭐ the contact's three headrooms, separately (what `rawMargin` is the minimum of)
    cAcross: v(cAcross), cAlong: v(cAlong), cGrip: v(cGrip), loaded: peekB(r, 'loaded') ? 1 : 0,
    copFreeX: v(cop.x), copFreeZ: v(cop.z),
    margin: v(r.balanceMargin), rawMargin: soft(r, 'rawMargin'),
    // --- the plane, and the two speeds through the water
    planing: r.leanProbe?.planing ?? null, latchSpeed: v(latchSpeed), fwdThrough: v(r.leanProbe?.speedThrough),
    flowX: v(flow.x), flowZ: v(flow.z), leanCap: v(r.leanProbe?.cap), leanAsk: v(r.leanProbe?.ask),
    leanWant: v(r.leanProbe?.want), leanHeld: v(r.leanProbe?.held),
    // --- the load
    load: v(r.contact.load), weight: v(r.contact.weight), front: v(r.contact.frontShare),
    copX: v(r.contact.centreOfPressure.x), copZ: v(r.contact.centreOfPressure.z),
    legLoad: soft(r, 'legLoad'), legExt: v(r.leg.extension), legRest: v(r.leg.rest), legForce: v(r.leg.force),
    supXMin: v(support.xMin), supXMax: v(support.xMax), supZMin: v(support.zMin), supZMax: v(support.zMax),
    feetRear: v(feet.rear), feetFront: v(feet.front),
    limit, tTip: v(lt?.tip), tSlip: v(lt?.slip), tFlight: v(lt?.flight), tImpact: v(lt?.impact), flight: v(r.flightTime),
  };

  // The named instants of the sequence, so the three candidates for "why the feet are under water" can be separated.
  if (cue && rider.atCue === undefined) rider.atCue = row;
  if (pop) rider.atPop = row;
  if (session.phase === 'landing' && rider.atLanding === undefined) rider.atLanding = row;
  if (session.phase === 'landing') rider.atLastLanding = row;
  if (stoodNow) rider.atStand = row;
  if (input.paddle) {
    rider.prePress.push(row);
    if (rider.prePress.length > 30) rider.prePress.shift();
  }

  if (sinceStand >= 0 && sinceStand <= 1 && attached) {
    const f = rider.firstSecond;
    f.n += 1;
    f.load.push(r.contact.load);
    f.legLoad.push((peek(r, 'legLoad') ?? Number.NaN) / (r.mass * 9.81));
    f.wetted.push(board.wettedArea);
    f.roll.push(Math.abs(roll));
    f.planing.push(r.leanProbe?.planing ?? Number.NaN);
    f.cap.push(r.leanProbe?.cap ?? Number.NaN);
    f.latchSpeed.push(latchSpeed);
    f.capMargin.push(limits.margin);
    f.grip.push(limits.grip);
    f.knee.push(limits.knee);
    f.rearDepth.push(refusal.rearDepth);
    f.frontDepth.push(refusal.frontDepth);
    f.pastX.push(pastX);
    f.pastZ.push(pastZ);
    f.limits[limits.limit] = (f.limits[limits.limit] ?? 0) + 1;
    if (!r.inContact) f.contactOff += 1;
    if ((lt?.tip ?? 0) > 0) f.pinned += 1;
    if (limit === 'tip') f.pinNow += 1;
  }

  const fine = rider.popAt !== undefined && t >= rider.popAt - 0.5;
  if (LOG !== 'none' && (LOG === 'all' || fine || rider.frames % 10 === 0)) emit(row);
  if (attached) rider.lastLive = row;

  if (!attached && rider.fellAt === undefined) {
    rider.fellAt = t;
    rider.cause = session.separation ?? '?';
    rider.done = true;
  }
  if (rider.passedAt === undefined && rider.arrival !== undefined && frame.valid && frame.aheadOfCrest < -1.5 && session.phase !== 'standing') rider.passedAt = t;
  if (rider.standAt !== undefined && sinceStand >= STAND_HOLD) rider.done = true;
  if (rider.passedAt !== undefined && t > rider.passedAt + 1) rider.done = true;
  if (rider.popAt === undefined && rider.standAt === undefined && t > TRIAL - 1) rider.done = true;
  if (rider.popAt !== undefined && rider.standAt === undefined && session.phase === 'prone' && t > rider.popAt + 3) rider.done = true;
}

// Incoming crests at the probe (#429's detector, which is `catch-probe`'s).
const probeZ = startZ - PROBE_AT;
const depthAt = (z: number): number => -sim.bedAt(focus.x, z) + sim.solver.restLevel;
const earliest = (0.5 * PROBE_AT) / Math.sqrt(9.81 * depthAt(startZ - PROBE_AT / 2));
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
    // ☠️ **The harness trap that manufactured a survivor.** `bench.ts` retired a trial at TRIAL s whatever its riders
    // were doing, so a rider who stood at 16.0167 s on a 16 s trial was observed for ONE frame, fell on none of them,
    // and read as the study's only ride that carried the window. A trial is retired here only when every rider is
    // done, or when the clock is past TRIAL **and no rider is still inside its own stand window**; `truncated` below
    // flags any rider whose window was cut short regardless, so the artefact cannot come back silently.
    const holding = trial.riders.some((rider) => !rider.done && rider.standAt !== undefined && t - trial.placed < rider.standAt + STAND_HOLD);
    if ((t - trial.placed >= TRIAL && !holding) || trial.riders.every((rider) => rider.done)) active.splice(k, 1);
  }
}

/** A PLAIN median: the mean of the two middle elements at even length. */
function median(x: number[]): number {
  const s = x.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const peakOf = (x: number[]): number => (x.length ? Math.max(...x) : Number.NaN);
const minOf = (x: number[]): number => (x.length ? Math.min(...x) : Number.NaN);
const col = (rows: Row[], key: string): number[] => rows.map((row) => row[key]).filter((x): x is number => typeof x === 'number');

for (const trial of trials) {
  for (const rider of trial.riders) {
    const f = rider.firstSecond;
    const report = rider.session.rider.popUpReport;
    emit({
      summary: true, arm: rider.arm, script: rider.script.name, wave: trial.index, delay: rider.script.delay,
      frames: rider.frames, liveFrames: rider.liveFrames,
      cue: v(rider.cueAt), rule: v(rider.ruleAt), popBy: rider.popBy ?? null, pop: v(rider.popAt),
      stand: v(rider.standAt), fell: v(rider.fellAt), cause: rider.cause ?? null,
      fellAfterStand: rider.fellAt !== undefined && rider.standAt !== undefined ? rider.fellAt - rider.standAt : null,
      standAfterPop: rider.standAt !== undefined && rider.popAt !== undefined ? rider.standAt - rider.popAt : null,
      stood: rider.standAt !== undefined ? 1 : 0, popped: rider.popAt !== undefined ? 1 : 0,
      riding: rider.riding, face: v(rider.face),
      // The game's own verdict, and the probe's mirror at the two frames the transition could be read on.
      popOutcome: report.outcome, popRefusal: report.refusal ?? null,
      popDuration: v(report.duration), landingPeak: v(report.landingPeak), landingFront: v(report.frontShare),
      mirrorAtStand: rider.atStand?.refuse ?? null, mirrorAtLastLanding: rider.atLastLanding?.refuse ?? null,
      // ⭐ **The refusal's four tests at the stand, every one of them, unconditioned by the game's short-circuit.**
      // `standRefusal` returns on the FIRST test that fires: a `sinking` verdict returns at :2789 before a single foot
      // is sampled, so a `sinking` stand says nothing at all about the feet. These columns are each test's own number
      // at the stand whatever the verdict was, which is the only way to ask whether the two are the same stand.
      standStrain: v(rider.atStand?.strain as number | undefined), standInto: v(rider.atStand?.into as number | undefined),
      standRearDepth: v(rider.atStand?.rearDepth as number | undefined), standFrontDepth: v(rider.atStand?.frontDepth as number | undefined),
      standFeetWet: rider.atStand === undefined ? null
        : ((rider.atStand.rearFloor === 0 && (rider.atStand.rearDepth as number) > MIRROR.FEET_DEPTH)
          || (rider.atStand.frontFloor === 0 && (rider.atStand.frontDepth as number) > MIRROR.FEET_DEPTH)) ? 1 : 0,
      standSinking: rider.atStand === undefined ? null : (rider.atStand.into as number) > MIRROR.SINK_RATE ? 1 : 0,
      standStrained: rider.atStand === undefined ? null
        : (rider.atStand.inContact === 0 || (rider.atStand.strain as number) > MIRROR.STAND_STRAIN) ? 1 : 0,
      // ⭐ **Was the window actually observed?** `heldFull` is a ride that carried STAND_HOLD s still attached;
      // `truncated` is a rider that neither fell nor was followed that long — the artefact that made wave 6 look
      // like the study's one survivor. A survivor count that does not carry these two beside it is not a count.
      observedAfterStand: rider.standAt !== undefined && rider.lastLiveT !== undefined ? rider.lastLiveT - rider.standAt : null,
      heldFull: rider.standAt !== undefined && rider.fellAt === undefined && rider.lastLiveT !== undefined
        && rider.lastLiveT - rider.standAt >= STAND_HOLD - 1e-9 ? 1 : 0,
      truncated: rider.standAt !== undefined && rider.fellAt === undefined && (rider.lastLiveT === undefined
        || rider.lastLiveT - rider.standAt < STAND_HOLD - 1e-9) ? 1 : 0,
      // ⭐ the named instants, so the refusal's cause can be placed in the sequence
      atCue: rider.atCue ?? null, atPop: rider.atPop ?? null, atLanding: rider.atLanding ?? null, atStand: rider.atStand ?? null,
      prePressRearDepth: v(median(col(rider.prePress, 'rearDepth'))), prePressFrontDepth: v(median(col(rider.prePress, 'frontDepth'))),
      prePressDraft: v(median(col(rider.prePress, 'draft'))), prePressWet: v(median(col(rider.prePress, 'wetted'))),
      // the fall test's own two terms, timed
      beyondAfterStand: rider.beyondAt !== undefined && rider.standAt !== undefined ? rider.beyondAt - rider.standAt : null,
      weightPastAfterStand: rider.weightPastAt !== undefined && rider.standAt !== undefined ? rider.weightPastAt - rider.standAt : null,
      firstPastX: v(rider.firstPastX), firstPastZ: v(rider.firstPastZ),
      // the first second after the stand
      fsN: f.n, fsLoadMed: v(median(f.load)), fsLoadPeak: v(peakOf(f.load)),
      fsLegLoadMed: v(median(f.legLoad)), fsWetMed: v(median(f.wetted)), fsWetMin: v(minOf(f.wetted)),
      fsRollMed: v(median(f.roll)), fsRollPeak: v(peakOf(f.roll)),
      fsPlaningMed: v(median(f.planing)), fsPlaningFirst: v(f.planing[0]), fsPlaningShare: f.n ? f.planing.filter((x) => x === 1).length / f.n : null,
      fsCapMed: v(median(f.cap)), fsLatchMed: v(median(f.latchSpeed)), fsLatchPeak: v(peakOf(f.latchSpeed)),
      fsCapMarginMed: v(median(f.capMargin)), fsCapMarginMin: v(minOf(f.capMargin)),
      fsGripMed: v(median(f.grip)), fsGripMin: v(minOf(f.grip)), fsKneeMed: v(median(f.knee)), fsKneeMin: v(minOf(f.knee)),
      fsRearDepthMed: v(median(f.rearDepth)), fsFrontDepthMed: v(median(f.frontDepth)),
      fsPastXMed: v(median(f.pastX)), fsPastXPeak: v(peakOf(f.pastX)), fsPastZMed: v(median(f.pastZ)), fsPastZPeak: v(peakOf(f.pastZ)),
      fsLimits: f.limits, fsContactOff: f.contactOff, fsPinned: f.pinned, fsPinNow: f.pinNow,
      atFall: rider.fellAt === undefined ? null : rider.lastLive ?? null,
    });
  }
}
emit({
  done: true, address: ADDRESS, arms: ARMS, scripts: SCRIPTS, seed: SEED, size: SIZE, waves,
  runs: trials.reduce((a, trial) => a + trial.riders.length, 0),
  seaTime: sim.solver.time, seconds: (Date.now() - wall) / 1000,
});

// ---------------------------------------------------------------------------------------------------------------
// `PLACE=1` — ⭐ the near-threshold entry sweep: the one lever test this bench can run.
//
// `AttachedRider`'s mount seeds the planing latch from the magnitude of the board's WORLD velocity
// (`> PLANING_SPEED`), and a placement is given `forward × entry + flow`, so its speed THROUGH the water at frame 1
// is the entry exactly. Two entries either side of 4 m/s are therefore a pair that differ in the latch and in
// almost nothing else — which is the only way to ask whether "planing" is the survivors' cause or their companion.
// ---------------------------------------------------------------------------------------------------------------
if (PLACE) {
  const SIDE = Number(process.env.SIDE ?? -45);
  const ENTRIES = (process.env.ENTRIES ?? '3.0,3.6,3.8,3.9,3.95,4.05,4.1,4.2,4.4,5.0,6.0').split(',').map(Number);
  const scratch = createWaterSample();
  interface Placed {
    arm: string; sink: number; entry: number; board: BoardBody; rider: AttachedRider; frame: number; done: boolean;
    fellAt: number | null; cause: string; firstPlaning: number | null;
    load: number[]; wetted: number[]; roll: number[]; planing: number[]; cap: number[]; latch: number[];
    capMargin: number[]; grip: number[]; knee: number[]; pastX: number[]; pastZ: number[]; depth: number[]; slope: number[]; speed: number[];
  }
  const placed: Placed[] = [];
  const makePlaced = (arm: string, sink: number, entry: number): Placed | null => {
    const sy = water.surfaceAt(focus.x, focus.z - 0.75);
    const here = water.sampleAt(focus.x, sy, focus.z - 0.75, scratch);
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
      new Vector3(focus.x, sy, focus.z - 0.75).addScaledVector(normal, board.shape.centerOfMass.y - sink),
      new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
      forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
    );
    const rd = new AttachedRider(board.shape, { phase: 'standing', ...riderOptions(armConfig.get(arm)!) } as ConstructorParameters<typeof AttachedRider>[1]);
    board.attach(rd);
    rd.steer = 0;
    return {
      arm, sink, entry, board, rider: rd, frame: 0, done: false, fellAt: null, cause: '', firstPlaning: null,
      load: [], wetted: [], roll: [], planing: [], cap: [], latch: [], capMargin: [], grip: [], knee: [], pastX: [], pastZ: [], depth: [], slope: [], speed: [],
    };
  };
  for (const arm of ARMS) for (const sink of SINKS) for (const entry of ENTRIES) {
    const made = makePlaced(arm, sink, entry);
    if (made) placed.push(made);
  }
  const frames = Math.round(STAND_HOLD / STEP);
  for (let i = 0; i < frames; i += 1) {
    sim.step(STEP);
    for (const e of placed) {
      if (e.done) continue;
      e.frame += 1;
      e.board.step(STEP, water);
      const r = e.rider;
      const board = e.board;
      fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
      sideV.set(fwd.z, 0, -fwd.x);
      boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
      e.roll.push(Math.abs(Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG));
      e.load.push(r.contact.load);
      e.wetted.push(board.wettedArea);
      const planingNow = r.leanProbe?.planing ?? Number.NaN;
      e.planing.push(planingNow);
      if (e.firstPlaning === null) e.firstPlaning = planingNow;
      e.cap.push(r.leanProbe?.cap ?? Number.NaN);
      const flow = peekO(r, 'waterFlow') ?? { x: 0, z: 0 };
      e.latch.push(Math.hypot(board.velocity.x - flow.x, board.velocity.z - flow.z));
      e.speed.push(Math.hypot(board.velocity.x, board.velocity.z));
      const limits = r.balanceLimits;
      e.capMargin.push(limits.margin);
      e.grip.push(limits.grip);
      e.knee.push(limits.knee);
      const st = r.human.state;
      const support = r.support;
      const midZ = (support.zMin + support.zMax) / 2;
      e.pastX.push(Math.max(0, Math.abs(st.across) - (support.xMax - support.xMin) / 2));
      e.pastZ.push(Math.max(0, st.along - (support.zMax - midZ), -st.along - (midZ - support.zMin)));
      // The refusal's own quantity on a placed rider: the deck under the feet against the surface.
      const feet = peekO(r, 'feet') ?? { rear: 0, front: 0 };
      let worst = Number.NEGATIVE_INFINITY;
      for (const z of [feet.rear, feet.front]) {
        board.toWorld(local.set(0, deckHeight(board.shape, z), z), footWorld);
        const s = water.sampleAt(footWorld.x, footWorld.y, footWorld.z, scratch);
        worst = Math.max(worst, s.surfaceY - footWorld.y);
      }
      e.depth.push(worst);
      water.sampleAt(board.centerOfMass.x, board.centerOfMass.y, board.centerOfMass.z, scratch);
      e.slope.push(Math.atan(-scratch.slopeZ) * DEG);
      if (!r.attached) {
        e.done = true;
        e.fellAt = e.frame;
        e.cause = r.separation ?? '?';
      }
    }
  }
  for (const e of placed) {
    emit({
      placement: true, arm: e.arm, sink: e.sink, entry: e.entry, frames: e.frame, fellAt: e.fellAt,
      fellAtS: e.fellAt === null ? null : e.fellAt * STEP, cause: e.cause || null, firstPlaning: e.firstPlaning,
      planingFirst: v(e.planing[0]), planingMed: v(median(e.planing)), planingShare: e.planing.length ? e.planing.filter((x) => x === 1).length / e.planing.length : null,
      latchFirst: v(e.latch[0]), latchMed: v(median(e.latch)), speedMed: v(median(e.speed)),
      capFirst: v(e.cap[0]), capMed: v(median(e.cap)),
      loadMed: v(median(e.load)), wetMed: v(median(e.wetted)), rollMed: v(median(e.roll)), rollPeak: v(peakOf(e.roll)),
      capMarginMed: v(median(e.capMargin)), capMarginMin: v(minOf(e.capMargin)),
      gripMin: v(minOf(e.grip)), kneeMin: v(minOf(e.knee)),
      pastXPeak: v(peakOf(e.pastX)), pastZPeak: v(peakOf(e.pastZ)),
      depthMed: v(median(e.depth)), depthPeak: v(peakOf(e.depth)), slopeMed: v(median(e.slope)),
    });
  }
  emit({ placedDone: true, runs: placed.length, sinks: SINKS, entries: ENTRIES, holdS: STAND_HOLD, seconds: (Date.now() - wall) / 1000 });
}
