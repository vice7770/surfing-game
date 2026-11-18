/**
 * **The take-off bench: paddle → catch → pop up → stand → turn, as the player does it.**
 *
 * Every bench this track has published places a rider on moving water in a riding stance. The owner does not: he
 * paddles, the wave catches him, he presses the pop-up key, the HUD says *"Getting up…"* for the pop-up's own 1.20 s
 * (`PUSH_TIME` 0.72 + `LANDING_TIME` 0.48), and **his falls come in the first second after that prompt clears**. This
 * bench drives that sequence with the game's own machinery and measures the fall **against the stand**, not against an
 * arbitrary t = 0.
 *
 * Nothing here is new physics. The rig is `canyon-catch-2026-10-29/catch-probe.ts` (the one probe in the repo that
 * paddles and pops up) carrying `new-rider/3.5/merge-bench.ts`'s column set and its Canyon seatbelt.
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/take-off/bench.ts -o <s>/raw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '' };\n" > <s>/bench.mjs   # an OBJECT, never a string
 *     cat <s>/raw.mjs >> <s>/bench.mjs
 *     cd <s> && env PERIODS=12 SEED=1 OUT=<s>/out.jsonl node --max-old-space-size=3200 bench.mjs
 *     python3 -I docs/research/new-rider/take-off/read.py <s>/out.jsonl
 *
 * ## What it does
 *
 *  * Builds **the owner's own address** — `ADDRESS` defaults to
 *    `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on` — and lets **the game's own
 *    switch parsing** (`surfZoneConfigFor` → `switchedConfigFor`, reading `globalThis.location.search`) turn it into a
 *    `SurfZoneConfig`. An arm is then just a suffix on that address, exactly as the owner types it.
 *  * One Canyon sea for every arm: the riders read the water and never push it (`addReaction` is a no-op), so they
 *    share it, as `catch-probe` established. **This is the bench's one deliberate difference from the game**, where a
 *    board's reaction does reach the solver (`PhysicalSurfWater.addReaction`).
 *  * Every wave that crosses a point `PROBE` m seaward of the game's own start gets one rider per arm × script,
 *    **placed prone at rest at `rideLineup`** — `focus.x + rideLineupAlong`, `focus.z − rideLineupOffset`, nose to the
 *    beach — which is what `SurfZoneRunner.launchRide` does when the game starts a ride.
 *  * Each rider paddles in, sprints when the crest is `sprint` s away, and **pops up at the game's own cue** (the
 *    HUD's: `rider.popUpCue || inTakeOffWindow(frame)`). After standing it holds, or takes a bottom turn.
 *
 * ## ☠️ The traps this file is built around
 *
 *  1. **In zsh, `SECONDS=0.5 node bench.mjs` passes through zsh's special INTEGER variable and arrives as `"0"`** —
 *     every run ends at frame 1 and the summary still looks tidy. Every invocation above uses `env`. This bench has no
 *     `SECONDS`; its horizon is `STAND_HOLD` (s after the stand) and `PERIODS` (of sea).
 *  2. **The Canyon seatbelt**: the wrapper prelude must set `globalThis.location` as an **OBJECT**. A bare string has no
 *     `.search` (`devTools.ts:9` reads `globalThis.location?.search ?? ''`), every switch silently goes missing, and the
 *     bench quietly measures the default Canyon with the default rider. The `control` line prints the grid off the
 *     solver (Canyon B is **400 × 451 = 180 400**) and the parsed switches per arm, and the bench **exits non-zero**
 *     when the address did not arrive.
 *  3. **"CoP-pinned" is `limitTime.tip > 0`**, the step's decaying memory, not `limit === 'tip'` (one substep of 32).
 *     Both are emitted: `tTip` and `limit`. Say which you read.
 *  4. **`AttachedRider.separate` never clears `phase` or `upright`**, so every rider column freezes after separation.
 *     A run stops at its first `attached === 0`; the frame of the fall is kept and nothing past it is.
 *
 * Env: `ADDRESS`, `ARMS` (`ships,trunk,bank,all3,all3cap,arm,cap`), `SCRIPTS`, `SIZE`, `SEED`, `PERIODS`,
 * `STAND_HOLD`, `TRIAL`, `SPRINT`, `EARLY`, `LIFT_AHEAD`, `LIFT_FRACTION`, `TURN_AT`, `TURN_FOR`,
 * `LOG` (`all|window|none`), `PROBE` (`off`: the inertness control), `PLACE` (`1`: also run the flush placement for
 * the first-second comparison), `SINKS`, `ENTRIES`, `SIDE`, `OUT`.
 *
 * A script's name says **when it pops** and **what it does standing**: the prefix `cue` (the HUD's own cue), `lift`
 * (the crest about to pass under a sprinting rider) or `early` (2 s before the crest arrives); the suffix `L` or `R`
 * takes a bottom turn TURN_AT s after the stand, and anything else holds. Default: `cue,lift,liftL,liftR,early,
 * earlyL,earlyR`. **A name with no known prefix pops on the `lift` rule**, so `hold`/`turnL`/`turnR` are `lift`
 * scripts; seed 1's published run was made with an earlier build in which those three names popped at the **cue**,
 * which is what `cue,cueL,cueR` does here.
 *
 * `docs/` is outside `tsconfig.json`'s `include` and `vitest.config.ts`'s globs, so this file is neither type-checked
 * nor run by the suites — as `3.5/bank.ts`, `3.5/trunk.ts` and `3.5/merge-bench.ts` beside it. Rider options are passed
 * through one `as` cast, so the same file bundles at a commit where a given option does not exist yet.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { RideSession } from '../../../../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { inTakeOffWindow } from '../../../../src/physics/takeOffCue';
import { WaveFrameGauge, type WaveFrame } from '../../../../src/physics/waveFrame';
import { SurfZoneSimulation, rideLineupAlong, rideLineupOffset, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;

/** The owner's own address (2026-11-18), minus the arm under test. */
const ADDRESS = process.env.ADDRESS ?? '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
/** An arm is a suffix on his address. `ships` is the address as it stands: no new switches. */
const ARM_SUFFIX: Record<string, string> = {
  ships: '',
  trunk: '&trunk=mass',
  bank: '&bodyBank=hip',
  arm: '&armCarry=on',
  all3: '&armCarry=on&trunk=mass&bodyBank=hip',
  all3cap: '&armCarry=on&trunk=mass&bodyBank=hip&askCap=4.5',
  cap: '&askCap=4.5',
};
const ARMS = (process.env.ARMS ?? 'ships,trunk,bank,all3,all3cap').split(',').filter(Boolean);
const SCRIPTS = (process.env.SCRIPTS ?? 'cue,lift,liftL,liftR,early,earlyL,earlyR').split(',').filter(Boolean);
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const SEED = Number(process.env.SEED ?? 1);
const PERIODS = Number(process.env.PERIODS ?? 12);
/** How long a standing rider is followed after the stand, s: the owner's window is the first second. */
const STAND_HOLD = Number(process.env.STAND_HOLD ?? 3);
/** A trial's riders live this long at most, s (`catch-probe`'s). */
const TRIAL = Number(process.env.TRIAL ?? 16);
/** Where an incoming crest is first noticed, m seaward of the start: inside the gauge's 40 m look behind the rider. */
const PROBE = 36;
/** When the sprint starts: the crest this many s away (`catch-probe`'s `good`). */
const SPRINT = Number(process.env.SPRINT ?? 2);
/** The bottom turn's delay after the stand and its length, s (`catch-probe`'s `turnL`/`turnR`). */
const TURN_AT = Number(process.env.TURN_AT ?? 0.3);
const TURN_FOR = Number(process.env.TURN_FOR ?? 0.9);
const LOG = (process.env.LOG ?? 'window') as 'all' | 'window' | 'none';
/**
 * `PROBE=off`: the per-frame row is not built at all, which also skips the probe's own two reads — the drawn feet
 * (`renderPoint` twice, taken into the board's frame) and the second `sampleAt` under the board (`slopeUnder`). The
 * drive, the outcomes and the first-second columns are computed without it, so **a `PROBE=off` run and a `PROBE=on`
 * run must agree value for value**; that is this bench's inertness proof, and the number of values compared is its
 * size. A difference means the probe is not a probe.
 */
const PROBE_ON = process.env.PROBE !== 'off';
const OUT = process.env.OUT;
const PLACE = process.env.PLACE === '1';
const SINKS = (process.env.SINKS ?? '0.06,0').split(',').map(Number);

const v = (x: number | undefined): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};
/** Reads of fields TypeScript calls private, or of fields a commit may not have. They only get. */
const peek = (o: unknown, k: string): number | undefined => (o as Record<string, number | undefined>)[k];
const peekS = (o: unknown, k: string): string | undefined => (o as Record<string, string | undefined>)[k];
const peekO = (o: unknown, k: string): Record<string, number> | undefined => (o as Record<string, Record<string, number> | undefined>)[k];
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
// The sea must be the same for every arm: the switches under test are the rider's alone. Compared key by key, with the
// rider keys removed from both sides; a difference here means an arm's suffix moved the water and the bench is void.
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
  control: true, address: ADDRESS, arms: ARMS, scripts: SCRIPTS, size: SIZE, seed: SEED, periods: PERIODS,
  search: (globalThis as { location?: { search?: string } }).location?.search ?? '(none)',
  grid: `${nx}x${nz}`, cells: nx * nz, spunUp: (Date.now() - wall) / 1000, seaTime: sim.solver.time,
  focusX: focus.x, focusZ: focus.z, startX, startZ, lineupOut: rideLineupOffset(config),
  significantHeight: config.significantHeight, peakPeriod: config.peakPeriod,
  switches: Object.fromEntries(ARMS.map((arm) => [arm, switchesOf(armConfig.get(arm)!)])),
  seaDiffs, standHold: STAND_HOLD, log: LOG,
});
// The address did not arrive: `?canyonWaves=true` must give Canyon B and the address must give the new rider.
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
/**
 * A script is **when it pops** and **what it does once up**.
 *
 * `pop: 'early'` presses EARLY s before the crest reaches the rider, so the wave meets a standing rider.
 * `pop: 'cue'` presses at the game's own cue — the HUD's: `rider.popUpCue || inTakeOffWindow(frame)`. `pop: 'lift'`
 * also presses when the crest is about to pass under a sprinting rider with no cue (`catch-probe`'s `lift`: within
 * LIFT_AHEAD m, higher than LIFT_FRACTION up the face), **which is what a player does** — the key is his, not the
 * HUD's. That distinction is not cosmetic here: `inTakeOffWindow` wants the board shoreward at 0.8 of the crest's
 * speed, and a paddler at this spot does not get there (see the README's Part 3).
 */
interface Script { name: string; pop: 'cue' | 'lift' | 'early'; turn: 0 | 1 | -1 }
/** `lift`: the crest within this many m of a sprinting rider, high on the face, and no cue yet (`catch-probe`'s). */
const LIFT_AHEAD = Number(process.env.LIFT_AHEAD ?? 1.5);
const LIFT_FRACTION = Number(process.env.LIFT_FRACTION ?? 0.6);
/** `early`: the key pressed this many s before the crest reaches the rider, so the 1.20 s pop-up finishes as it does. */
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
  popSlope?: number;
  popFace?: number;
  popFraction?: number;
  popAhead?: number;
  popSpeed?: number;
  popCrest?: number;
  popReport?: Record<string, unknown>;
  face: number;
  riding: number;
  frames: number;
  liveFrames: number;
  done: boolean;
  /** The first second after the stand, frame by frame: what the owner's window is made of. */
  firstSecond: { load: number[]; legLoad: number[]; wetted: number[]; roll: number[]; stretch: number[]; bank: number[]; planing: number[]; cap: number[]; contactOff: number; pinned: number; pinNow: number; n: number };
  lastFoot: [number, number, number, number, number, number] | null;
  /** The last frame on which the rider was still attached: the fall is read off this, never off the frozen columns. */
  lastLive?: Record<string, unknown>;
}

interface Trial { placed: number; riders: Rider[]; last: number[]; arrival?: number; index: number }
const trials: Trial[] = [];
const active: Trial[] = [];
const sample = createWaterSample();
const footWorld = new Vector3();
const footLocal = new Vector3();
const fwd = new Vector3();
const sideV = new Vector3();
const boardUp = new Vector3();

function makeRider(arm: string, script: Script): Rider {
  const session = new RideSession(riderOptions(armConfig.get(arm)!) as ConstructorParameters<typeof RideSession>[0]);
  const direction = (config.directionDegrees * Math.PI) / 180;
  return {
    arm, script, session, gauge: new WaveFrameGauge({ directionX: Math.sin(direction), directionZ: Math.cos(direction) }),
    sprinting: false, seenBehind: false, face: 0, riding: 0, frames: 0, liveFrames: 0, done: false,
    firstSecond: { load: [], legLoad: [], wetted: [], roll: [], stretch: [], bank: [], planing: [], cap: [], contactOff: 0, pinned: 0, pinNow: 0, n: 0 },
    lastFoot: null,
  };
}

function place(index: number): Trial {
  const trial: Trial = { placed: sim.solver.time, index, last: [], riders: [] };
  for (const arm of ARMS) for (const name of SCRIPTS) trial.riders.push(makeRider(arm, scriptOf(name)));
  for (const rider of trial.riders) rider.session.place({ x: startX, z: startZ, heading: 0, speed: 0, phase: 'prone' }, water);
  return trial;
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
  // The game's own cue, as the HUD shows it (`SurfZoneRunner.cue`).
  const cue = prone && (session.rider.popUpCue || inTakeOffWindow(frame));
  if (cue && rider.cueAt === undefined) rider.cueAt = t;
  let pop = false;
  let lifted = false;
  if (prone && rider.popAt === undefined && rider.seenBehind) {
    if (!rider.sprinting && toCrest <= SPRINT) rider.sprinting = true;
    if (cue) pop = true;
    lifted = rider.sprinting && frame.valid && frame.aheadOfCrest < LIFT_AHEAD && frame.aheadOfCrest > 0 && frame.faceFraction > LIFT_FRACTION;
    if (script.pop === 'lift' && lifted) pop = true;
    // `early`: up before the wave arrives, so the wave meets a rider already standing. A player may do this, and it is
    // the only script here that stands on water the wave has not reached yet.
    if (script.pop === 'early' && rider.sprinting && toCrest <= EARLY) pop = true;
  }
  if (pop) {
    rider.popAt = t;
    rider.popBy = cue ? 'cue' : script.pop;
    rider.popSlope = slopeUnder(rider);
    rider.popFace = frame.faceHeight;
    rider.popFraction = frame.faceFraction;
    rider.popAhead = frame.aheadOfCrest;
    rider.popSpeed = frame.speedShoreward;
    rider.popCrest = frame.crestSpeed;
  }
  const sinceStand = rider.standAt === undefined ? -1 : t - rider.standAt;
  const turning = script.turn !== 0 && session.phase === 'standing' && sinceStand >= TURN_AT && sinceStand < TURN_AT + TURN_FOR;
  const input = {
    paddle: prone && !pop && rider.popAt === undefined,
    sprint: prone && rider.sprinting && !pop,
    popUp: pop,
    steer: turning ? script.turn : 0,
    ...(turning ? { compress: 1 } : {}),
  };
  session.step(STEP, water, input);
  rider.frames += 1;
  const attached = session.rider.attached;
  if (attached) rider.liveFrames += 1;
  if (session.phase === 'standing' && rider.standAt === undefined) rider.standAt = t;
  if (session.phase === 'standing' && frame.valid && frame.aheadOfCrest >= 0 && frame.speedShoreward >= 0.6 * frame.crestSpeed) rider.riding += STEP;

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

  if (sinceStand >= 0 && sinceStand <= 1 && attached) {
    const f = rider.firstSecond;
    f.n += 1;
    f.load.push(r.contact.load);
    f.legLoad.push((peek(r, 'legLoad') ?? Number.NaN) / (r.mass * 9.81));
    f.wetted.push(board.wettedArea);
    f.roll.push(Math.abs(roll));
    f.stretch.push(r.leg.extension);
    f.bank.push(Math.abs(r.bank.angle) * DEG);
    f.planing.push(r.leanProbe?.planing ?? Number.NaN);
    f.cap.push(r.leanProbe?.cap ?? Number.NaN);
    if (!r.inContact) f.contactOff += 1;
    if ((lt?.tip ?? 0) > 0) f.pinned += 1;
    if (limit === 'tip') f.pinNow += 1;
  }

  if (PROBE_ON) {
  // Deck-relative foot velocity: each foot's drawn world point taken into the board's own frame and differenced.
  const foot: number[] = [];
  for (const index of [5, 6]) {
    r.renderPoint(index, board, footWorld);
    board.toLocal(footWorld, footLocal);
    foot.push(footLocal.x, footLocal.y, footLocal.z);
  }
  const footRate: (number | null)[] = rider.lastFoot === null ? [null, null] : [0, 1].map((k) => {
    const last = rider.lastFoot!;
    return Math.hypot(foot[k * 3] - last[k * 3], foot[k * 3 + 1] - last[k * 3 + 1], foot[k * 3 + 2] - last[k * 3 + 2]) / STEP;
  });
  rider.lastFoot = foot as [number, number, number, number, number, number];
  const row: Record<string, unknown> = {
      arm: rider.arm, script: script.name, wave: trial.index, frame: rider.frames, t,
      tCrest: trial.arrival === undefined || rider.arrival === undefined ? null : t - rider.arrival,
      tPop: rider.popAt === undefined ? null : t - rider.popAt,
      tStand: rider.standAt === undefined ? null : t - rider.standAt,
      phase: session.phase, attached: attached ? 1 : 0, upright: r.upright ? 1 : 0, inContact: r.inContact ? 1 : 0,
      feasible: r.contact.feasible ? 1 : 0, sep: session.separation ?? null,
      // --- the stick the script holds
      steer: input.steer, compress: input.compress ?? 0, paddle: input.paddle ? 1 : 0, sprint: input.sprint ? 1 : 0, popUp: pop ? 1 : 0,
      cueNow: cue ? 1 : 0, liftNow: lifted ? 1 : 0,
      // --- the board
      px: v(board.position.x), py: v(board.position.y), pz: v(board.position.z),
      vx: v(board.velocity.x), vy: v(board.velocity.y), vz: v(board.velocity.z), speed: v(speed),
      wx: v(board.angularVelocity.x), wy: v(board.angularVelocity.y), wz: v(board.angularVelocity.z),
      roll: v(roll), heading: v(heading), course: v(course), drift: v(course - heading),
      wetted: v(board.wettedArea), volume: v(board.submergedVolume), substeps: board.substepsTaken,
      // --- the wave under and behind it
      wValid: frame.valid ? 1 : 0, ahead: v(frame.aheadOfCrest), faceH: v(frame.faceHeight), faceFrac: v(frame.faceFraction),
      crestV: v(frame.crestSpeed), shoreV: v(frame.speedShoreward), breaking: v(frame.crestBreaking), slope: v(slopeUnder(rider)),
      // --- the rider
      rx: v(r.position.x), ry: v(r.position.y), rz: v(r.position.z),
      bankA: v(r.bank.angle), bankR: v(r.bank.rate), bankRaw: soft(r, 'bankRaw'),
      swingA: v(r.swing.angle), swingR: v(r.swing.rate), swingT: soft(r, 'swingTorque'),
      fx: v(r.contact.force.x), fy: v(r.contact.force.y), fz: v(r.contact.force.z),
      copX: v(r.contact.centreOfPressure.x), copZ: v(r.contact.centreOfPressure.z),
      front: v(r.contact.frontShare), weight: v(r.contact.weight), load: v(r.contact.load),
      supXMin: v(r.support.xMin), supXMax: v(r.support.xMax), supZMin: v(r.support.zMin), supZMax: v(r.support.zMax),
      margin: v(r.balanceMargin), rawMargin: soft(r, 'rawMargin'), capture: v(r.captureLoad),
      legLoad: soft(r, 'legLoad'), legExt: v(r.leg.extension), legRest: v(r.leg.rest), legRate: v(r.leg.rate), legForce: v(r.leg.force),
      leanCap: v(r.leanProbe?.cap), leanAsk: v(r.leanProbe?.ask), leanPlaning: r.leanProbe?.planing ?? null,
      leanWant: v(r.leanProbe?.want), leanHeld: v(r.leanProbe?.held), leanRadius: v(r.leanProbe?.radius), leanSpeed: v(r.leanProbe?.speedThrough),
      limit, tTip: v(lt?.tip), tSlip: v(lt?.slip), tFlight: v(lt?.flight), tImpact: v(lt?.impact),
      flight: v(r.flightTime), hipPast: v(r.human?.state?.hipPast),
      foot5: footRate[0], foot6: footRate[1],
      f5x: v(foot[0]), f5y: v(foot[1]), f5z: v(foot[2]), f6x: v(foot[3]), f6y: v(foot[4]), f6z: v(foot[5]),
      // --- `?trunk=mass`'s own channel
      trunkFold: soft(r, 'trunkFold'), hipAngle: v((r as unknown as { standingBody?: { hip: { angle: number } } }).standingBody?.hip.angle),
      // --- `?bodyBank=hip`'s own channel
      relief: soft(r, 'copRelief'), copNm: soft(r, 'copMoment'),
  };
    const fine = rider.popAt !== undefined && t >= rider.popAt - 0.5;
    if (LOG !== 'none' && (LOG === 'all' || fine || rider.frames % 10 === 0)) emit(row);
    // `AttachedRider.separate` never clears `phase` or `upright`, so every rider column freezes at separation: the
    // fall is read off the last frame on which the rider was still attached, and nothing past it is kept.
    if (attached) rider.lastLive = row;
  }

  if (!attached && rider.fellAt === undefined) {
    rider.fellAt = t;
    rider.cause = session.separation ?? '?';
    rider.done = true;
  }
  if (rider.passedAt === undefined && rider.arrival !== undefined && frame.valid && frame.aheadOfCrest < -1.5 && session.phase !== 'standing') rider.passedAt = t;
  // Done: down, followed STAND_HOLD s past the stand, or the wave a second gone with no ride.
  if (rider.standAt !== undefined && sinceStand >= STAND_HOLD) rider.done = true;
  if (rider.passedAt !== undefined && t > rider.passedAt + 1) rider.done = true;
  if (rider.popAt === undefined && rider.standAt === undefined && t > TRIAL - 1) rider.done = true;
  if (rider.popAt !== undefined && rider.standAt === undefined && session.phase === 'prone' && t > rider.popAt + 3) rider.done = true;
}

// Incoming crests at the probe (`catch-probe`'s detector): a local top of the surface, prominent over the last half
// period's lowest, debounced by 0.4 of a period.
const probeZ = startZ - PROBE;
/** The trial's crest reaches the start no sooner than half its shallow-water travel time from the probe (`catch-probe`). */
const depthAt = (z: number): number => -sim.bedAt(focus.x, z) + sim.solver.restLevel;
const earliest = (0.5 * PROBE) / Math.sqrt(9.81 * depthAt(startZ - PROBE / 2));
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

/** A PLAIN median: the mean of the two middle elements at even length. */
function median(x: number[]): number {
  const s = x.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const peakOf = (x: number[]): number => (x.length ? Math.max(...x) : Number.NaN);

for (const trial of trials) {
  for (const rider of trial.riders) {
    const f = rider.firstSecond;
    emit({
      summary: true, arm: rider.arm, script: rider.script.name, wave: trial.index,
      frames: rider.frames, liveFrames: rider.liveFrames,
      cue: v(rider.cueAt), popBy: rider.popBy ?? null, pop: v(rider.popAt), stand: v(rider.standAt), fell: v(rider.fellAt), cause: rider.cause ?? null,
      // The owner's own question: how long after the stand does he go?
      fellAfterStand: rider.fellAt !== undefined && rider.standAt !== undefined ? rider.fellAt - rider.standAt : null,
      fellAfterPop: rider.fellAt !== undefined && rider.popAt !== undefined ? rider.fellAt - rider.popAt : null,
      standAfterPop: rider.standAt !== undefined && rider.popAt !== undefined ? rider.standAt - rider.popAt : null,
      stood: rider.standAt !== undefined ? 1 : 0, popped: rider.popAt !== undefined ? 1 : 0,
      riding: rider.riding, face: v(rider.face),
      popSlope: v(rider.popSlope), popFace: v(rider.popFace), popFraction: v(rider.popFraction), popAhead: v(rider.popAhead),
      popSpeed: v(rider.popSpeed), popCrest: v(rider.popCrest),
      popOutcome: rider.session.rider.popUpReport.outcome, popRefusal: rider.session.rider.popUpReport.refusal ?? null,
      popDuration: v(rider.session.rider.popUpReport.duration), landingPeak: v(rider.session.rider.popUpReport.landingPeak),
      landingFront: v(rider.session.rider.popUpReport.frontShare),
      // The first second after the stand, which is the owner's window.
      fsN: f.n, fsLoadMed: v(median(f.load)), fsLoadPeak: v(peakOf(f.load)),
      fsLegLoadMed: v(median(f.legLoad)), fsLegLoadMin: v(f.legLoad.length ? Math.min(...f.legLoad) : Number.NaN),
      fsWetMed: v(median(f.wetted)), fsWetMin: v(f.wetted.length ? Math.min(...f.wetted) : Number.NaN),
      fsRollMed: v(median(f.roll)), fsRollPeak: v(peakOf(f.roll)),
      fsStretchMed: v(median(f.stretch)), fsBankPeak: v(peakOf(f.bank)),
      fsContactOff: f.contactOff, fsPinned: f.pinned, fsPinNow: f.pinNow,
      fsPlaningMed: v(median(f.planing)), fsPlaningFirst: v(f.planing[0]), fsCapMed: v(median(f.cap)),
      // The last frame the rider was still on the board: every paired signal at the fall, in one place.
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
// `PLACE=1` — the flush placement, for the first second's comparison. `merge-bench.ts`'s own rig, on this same sea.
// ---------------------------------------------------------------------------------------------------------------
if (PLACE) {
  const SIDE = Number(process.env.SIDE ?? -45);
  const ENTRIES = (process.env.ENTRIES ?? '2,4,6,8,10,12').split(',').map(Number);
  const scratch = createWaterSample();
  interface Placed { arm: string; sink: number; entry: number; board: BoardBody; rider: AttachedRider; frame: number; done: boolean; fellAt: number | null; cause: string; load: number[]; legLoad: number[]; wetted: number[]; roll: number[]; planing: number[]; cap: number[]; dryFirst: number }
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
    return { arm, sink, entry, board, rider: rd, frame: 0, done: false, fellAt: null, cause: '', load: [], legLoad: [], wetted: [], roll: [], planing: [], cap: [], dryFirst: 0 };
  };
  for (const arm of ARMS) for (const sink of SINKS) for (const entry of ENTRIES) {
    const made = makePlaced(arm, sink, entry);
    if (made) placed.push(made);
  }
  const frames = Math.round(1 / STEP);
  for (let i = 0; i < frames; i += 1) {
    sim.step(STEP);
    for (const e of placed) {
      if (e.done) continue;
      e.frame += 1;
      e.board.step(STEP, water);
      const r = e.rider;
      fwd.set(0, 0, 1).applyQuaternion(e.board.orientation).setY(0).normalize();
      sideV.set(fwd.z, 0, -fwd.x);
      boardUp.set(0, 1, 0).applyQuaternion(e.board.orientation);
      e.roll.push(Math.abs(Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG));
      e.load.push(r.contact.load);
      e.legLoad.push((peek(r, 'legLoad') ?? Number.NaN) / (r.mass * 9.81));
      e.wetted.push(e.board.wettedArea);
      e.planing.push(r.leanProbe?.planing ?? Number.NaN);
      e.cap.push(r.leanProbe?.cap ?? Number.NaN);
      if (e.frame === 1 && e.board.wettedArea === 0) e.dryFirst = 1;
      if (!r.attached) {
        e.done = true;
        e.fellAt = e.frame;
        e.cause = r.separation ?? '?';
      }
    }
  }
  for (const e of placed) {
    emit({
      placement: true, arm: e.arm, sink: e.sink, entry: e.entry, frames: e.frame, fellAt: e.fellAt, cause: e.cause || null,
      dryFirst: e.dryFirst,
      fsLoadMed: v(median(e.load)), fsLoadPeak: v(peakOf(e.load)), fsLegLoadMed: v(median(e.legLoad)),
      fsLegLoadMin: v(e.legLoad.length ? Math.min(...e.legLoad) : Number.NaN),
      fsWetMed: v(median(e.wetted)), fsWetMin: v(e.wetted.length ? Math.min(...e.wetted) : Number.NaN),
      fsRollMed: v(median(e.roll)), fsRollPeak: v(peakOf(e.roll)),
      fsPlaningMed: v(median(e.planing)), fsPlaningFirst: v(e.planing[0]), fsCapMed: v(median(e.cap)),
    });
  }
  emit({ placedDone: true, runs: placed.length, sinks: SINKS, seconds: (Date.now() - wall) / 1000 });
}
