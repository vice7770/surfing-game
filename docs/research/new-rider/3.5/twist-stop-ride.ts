/**
 * **Step 3.5j — `?twistStop=model|design` RIDDEN: does the switch REACH the physics, and what does it do at neutral
 * and through a steer?**
 *
 * `3.5/twist-stop.ts` is the design read. This file is the ride, and its first job is not a result but a **check**,
 * because three switches in this project have turned out not to reach the physics at all:
 *
 * - `?bodyBank=hip` was parsed **0 times** on `main` while a ride was being attributed to it;
 * - `?physical` gates nothing;
 * - and a `swing` option was dropped in a **`RideSession` forwarding hop** — it moved 5.4 cm of mass in a fixture and
 *   **0 m** in a real session.
 *
 * ⭐ **So the same quantity is measured TWO WAYS and shown to agree**: through the fixture (`AttachedRider` built
 * directly, which is what every probe in this folder does) and through the **real session path** — a search string,
 * `surfZoneConfigFor`, a `SurfZoneConfig`, a `RideSession` and the rider it builds — with **the switch off as the
 * negative control** in both.
 *
 * ## The quantity, and why it is this one
 *
 * Two read-only fields, written on **every** control tick of **both** arms, so that an unmoved number is evidence:
 *
 * | field | whose side it is | off the switch |
 * |---|---|---|
 * | `AttachedRider.twistModelK` | the **body's**: the stiffness it handed the controller, N·m/rad | **0 on every tick** |
 * | `PredictiveController.schedTwistK` | the **schedule's**: the axis coordinate the design was read at | **`TWIST_STIFFNESS` = 20 on every tick** |
 *
 * They are computed in different files from different inputs and must agree wherever the first is non-zero. And both
 * are checked against the joint the probe reads for itself: `twistModelK` must equal
 * `TWIST_STIFFNESS + TWIST_STOP (|tb.angle| − TWIST_BODY_RANGE)/|tb.angle|` to the digit on every tick past the stop,
 * and 0 on every tick inside it.
 *
 * ⛔ **A mode that never gets the rider past 0.87 rad of twist proves nothing about the handover**, so every summary
 * prints the ticks past the stop and a run with none is reported as inconclusive rather than as a pass.
 *
 * ## The modes
 *
 * | `MODE` | what it is | what it is for |
 * |---|---|---|
 * | `parse` | the search string through `surfZoneConfigFor` and `SurfZoneRunner`'s own forwarding expression | the parse hop and the config hop, printed |
 * | `fixture` | `AttachedRider` + `BoardBody` on `FaceWater`, placed as `3.5/bank.ts` places them | the physics, the way this folder measures it |
 * | `session` | the same water and placement through **`RideSession`** | the forwarding hop that has eaten an option before |
 * | `sea` | the **real Canyon B solver** (`?canyonWaves=true`), riders placed through `RideSession` | his own spot |
 * | `bytes` | the default arm's whole per-frame trace, printed for a diff against the base branch | the byte-identity claim |
 *
 * ## The face, and why this one
 *
 * `FaceWater` at **1.4 m, 16°, depth 6 m, entry 5.7 m/s** — which is **Canyon B's own calibration** (`#223`: arm
 * 1.4 m, 16°, 5.7 m/s), the spot the owner rides the rider work on (`?canyonWaves=true`). ⚠️ It is a calibrated
 * analytic face and **not the Canyon**: it has no peel, no crest line and no lip, so no figure here is a Canyon ride.
 *
 * ## Signs, units, frames
 *
 * * `twist` is `tb.angle`, **the upper body's yaw relative to the board about the board's own up axis**, degrees, in
 *   the game's own sign. It is not a roll angle.
 * * `u1` is `−predictor.sent[1]` = `heldTwist`, N·m, the torque the feet put on the board: **DELIVERED to the joint
 *   only after `MOTOR_LAG`**, which is why `tb.active` is printed beside it.
 * * `work` is `Σ tb.active · Δ(tb.angle)`, J, about the board's up axis — the **delivered** generalised work on the
 *   joint, 3.5i §2.2's own recipe with its own sign, and it must not be added to any roll ledger.
 * * `bank` is `AttachedRider.bank.angle` (the body's lean over its feet from the world's vertical); `roll` is the
 *   board's own from the world's level. Different quantities, both printed.
 *
 * ## Running it
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/twist-stop-ride.ts -o <s>/raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '?canyonWaves=true' };\n" > <s>/tsr.mjs && cat <s>/raw.mjs >> <s>/tsr.mjs
 *   MODE=fixture node <s>/tsr.mjs
 *
 * Env: `MODE=parse|fixture|session|bytes`, `SECONDS`, `STEERS`, `SPEEDS`, `STANCES`, `TRIALS`, `SIDE`, `SINK`.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor, twistStopSwitch } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { RideSession } from '../../../../src/physics/RideSession';
import { TWIST_STIFFNESS } from '../../../../src/physics/predictiveBalance';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** `AttachedRider`'s own stop, restated so the probe checks the handover against the formula and not against itself. */
const TWIST_BODY_RANGE = 0.87;
const TWIST_STOP = 2000;

const MODE = (process.env.MODE ?? 'fixture') as 'parse' | 'fixture' | 'session' | 'bytes' | 'sea';
const SECONDS = Number(process.env.SECONDS ?? 6);
const SIDE = Number(process.env.SIDE ?? -45);
/** `3.5/bank.ts`'s own flush-placement fix: without it the hull starts dry and the leg unloaded for ~0.5 s. */
const SINK = Number(process.env.SINK ?? 0.06);
const nums = (v: string | undefined, d: string): number[] => (v ?? d).split(',').map(Number);
const STEERS = nums(process.env.STEERS, '0,1,-1');
const SPEEDS = nums(process.env.SPEEDS, '5.7');
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];
/** Canyon B's own calibration (#223), and the face every mode rides. */
const FACE = { depth: 6, height: 1.4, slope: 16, crestZ: 0, vertical: 'surface' as const };

type Stance = 'tall' | 'crouch' | 'compress';
type Arm = 'off' | 'model' | 'design';

const f = (x: number, n = 3): string => (Number.isFinite(x) ? x.toFixed(n) : 'n/a');
const pad = (s: string, n: number): string => s.padStart(n);
const row = (cells: (string | number)[], widths: number[] = []): string =>
  cells.map((c, i) => pad(typeof c === 'number' ? f(c) : c, widths[i] ?? 10)).join('  ');
/** The secant the body should be handing over at an angle, computed HERE from the formula, never read off the class. */
const expectK = (angle: number): number => {
  const over = Math.abs(angle) - TWIST_BODY_RANGE;
  return over > 0 ? TWIST_STIFFNESS + (TWIST_STOP * over) / Math.abs(angle) : 0;
};
/** The owner's own address, as options rather than as a search string, for the fixture. */
const RIDER_OPTS = { rider: 'new' as const, feltFrame: 'deck' as const, riderBody: 'two' as const, stanceReach: 'keep' as const, deepen: 'on' as const };

const out: string[] = [];
const say = (s = ''): void => { out.push(s); };

interface Tick {
  t: number;
  twist: number;
  modelK: number;
  schedK: number;
  want: number;
  active: number;
  u1: number;
  bank: number;
  roll: number;
  speed: number;
  yaw: number;
  height: number;
}
interface Result {
  ticks: Tick[];
  fellAt: number | null;
  cause: string;
}

const scratch = createWaterSample();

/** Place a board flush on the face at `x,z`, heading `SIDE`° off the fall line, at `speed` through the water. */
function placement(water: SurfWater, x: number, z: number): { at: Vector3; orientation: Quaternion; heading: number; up: Vector3; forward: Vector3; flow: Vector3 } | null {
  const sy = water.surfaceAt(x, z);
  const here = water.sampleAt(x, sy, z, scratch);
  if (!here.wet || here.outsideDomain) return null;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const fall = new Vector3(here.slopeX, 0, here.slopeZ);
  if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
  fall.normalize();
  const heading = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(heading), 0, Math.cos(heading));
  const forward = level.clone().addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  return {
    at: new Vector3(x, sy, z), orientation: new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    heading, up: normal, forward, flow: new Vector3(here.flowX, here.flowY, here.flowZ),
  };
}

/** One frame's read, shared by both paths so the two cannot be reading different columns. */
function readTick(t: number, rider: AttachedRider, board: BoardBody, water: SurfWater): Tick {
  const tb = rider.twistBody;
  const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  const side = new Vector3(fwd.z, 0, -fwd.x);
  const boardUp = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
  const surface = water.surfaceAt(board.position.x, board.position.z);
  return {
    t,
    twist: tb.angle * DEG,
    modelK: rider.twistModelK,
    schedK: rider.predictor.schedTwistK,
    want: expectK(tb.angle),
    active: tb.active,
    u1: -rider.predictor.sent[1],
    bank: rider.bank.angle * DEG,
    roll: Math.atan2(boardUp.dot(side), boardUp.y) * DEG,
    speed: board.velocity.length(),
    yaw: Math.atan2(fwd.x, fwd.z) * DEG,
    height: surface,
  };
}

/** The fixture path: `AttachedRider` and `BoardBody` built here, as every probe in this folder builds them. */
function runFixture(arm: Arm, stance: Stance, steer: number, speed: number): Result {
  const water = new FaceWater(FACE);
  // `3.5/bank.ts`'s own cell, down to the sign: half a face length UP from the trough, the entry speed THROUGH the
  // water (so the surface flow is added), and the face advanced each step so the wave moves under the board.
  const place = placement(water, 0, water.front * 0.5);
  if (!place) throw new Error('dry placement');
  const board = new BoardBody();
  board.place(
    place.at.clone().addScaledVector(place.up, board.shape.centerOfMass.y - SINK),
    place.orientation,
    place.forward.clone().multiplyScalar(speed).add(place.flow),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing', ...RIDER_OPTS, ...(arm === 'off' ? {} : { twistStop: arm }),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  rider.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rider.compress = stance === 'compress' ? 1 : 0;
  rider.steer = steer;
  const ticks: Tick[] = [];
  let fellAt: number | null = null;
  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    board.step(STEP, water);
    water.advance(STEP);
    const t = (i + 1) * STEP;
    if (!rider.attached) { fellAt = t; break; }
    ticks.push(readTick(t, rider, board, water));
  }
  return { ticks, fellAt, cause: rider.separation ?? '' };
}

/**
 * The real session path: the search string parsed by the game's own switch, carried through a `SurfZoneConfig`, the
 * forwarding expression `SurfZoneRunner` uses, and `RideSession`'s own options — the four hops an option can be
 * dropped in — and then the rider `RideSession` builds for itself.
 */
function runSession(arm: Arm, stance: Stance, steer: number, speed: number): Result & { config: unknown } {
  const search = `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on${arm === 'off' ? '' : `&twistStop=${arm}`}`;
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'light-offshore' }, { stage: 2, compute: 'cpu' });
  const config = surfZoneConfigFor(settings, 5, false);
  // The forwarding expression `SurfZoneRunner` applies to the config, written out so the hop itself is in the probe.
  const options = {
    ...(config.rider ? { rider: config.rider } : {}), ...(config.feltFrame ? { feltFrame: config.feltFrame } : {}),
    ...(config.riderBody ? { riderBody: config.riderBody } : {}), ...(config.stanceReach ? { stanceReach: config.stanceReach } : {}),
    ...(config.deepen ? { deepen: config.deepen } : {}), ...(config.twistStop ? { twistStop: config.twistStop } : {}),
  };
  const water = new FaceWater(FACE);
  const place = placement(water, 0, water.front * 0.5);
  if (!place) throw new Error('dry placement');
  const session = new RideSession(options as ConstructorParameters<typeof RideSession>[0]);
  // `RideSession.place` adds the surface flow itself and sinks the board 0.05 m, so the cell matches the fixture's.
  session.place({ x: place.at.x, z: place.at.z, heading: place.heading, speed, phase: 'standing' }, water);
  const { rider, board } = session;
  const ticks: Tick[] = [];
  let fellAt: number | null = null;
  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    session.step(STEP, water, {
      paddle: false, popUp: false, steer,
      crouch: stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0,
      compress: stance === 'compress' ? 1 : 0,
    });
    water.advance(STEP);
    const t = (i + 1) * STEP;
    if (!rider.attached) { fellAt = t; break; }
    ticks.push(readTick(t, rider, board, water));
  }
  return { ticks, fellAt, cause: rider.separation ?? '', config: { twistStop: config.twistStop } };
}

/** The joint's delivered work over the whole live run, J, and the excursion it was done on. */
function summary(r: Result): { work: number; maxTwist: number; past: number; n: number; endTwist: number; maxBank: number; swing: number; climb: number } {
  let work = 0;
  let maxTwist = 0;
  let past = 0;
  let maxBank = 0;
  const { ticks } = r;
  for (let i = 1; i < ticks.length; i += 1) {
    work += 0.5 * (ticks[i - 1].active + ticks[i].active) * ((ticks[i].twist - ticks[i - 1].twist) / DEG);
  }
  for (const k of ticks) {
    if (Math.abs(k.twist) > Math.abs(maxTwist)) maxTwist = k.twist;
    if (Math.abs(k.twist) > TWIST_BODY_RANGE * DEG) past += 1;
    if (Math.abs(k.bank) > Math.abs(maxBank)) maxBank = k.bank;
  }
  // The course swung, degrees, and the height climbed, m: the board's own heading and the surface under it, first to
  // last live tick. ⚠️ On an analytic face these are NOT the ride analyzer's bottom-turn columns and are not
  // comparable with them — they are the same three quantities read off this run, named so they cannot be confused.
  const swing = ticks.length > 1 ? ((ticks[ticks.length - 1].yaw - ticks[0].yaw + 540) % 360) - 180 : NaN;
  const climb = ticks.length > 1 ? ticks[ticks.length - 1].height - ticks[0].height : NaN;
  return { work, maxTwist, past, n: ticks.length, endTwist: ticks.length ? ticks[ticks.length - 1].twist : NaN, maxBank, swing, climb };
}

/**
 * **`MODE=sea`: the REAL Canyon, as `?canyonWaves=true` builds it — the owner's own spot for the rider work** — with
 * the rider placed through `RideSession`, so the session hop is exercised on real water rather than on an analytic
 * face. The seatbelt is printed and read: Canyon B is **400 x 451 = 180 400** cells and the default Canyon
 * 400 x 507 = 202 800, and the bundle must be run under a wrapper that prepends an OBJECT, never a bare string
 * (a bare string silently benches the default Canyon through `devTools.ts:9`).
 */
function sea(): void {
  const SEED = Number(process.env.SEED ?? 1);
  const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
  const TRIALS = Number(process.env.TRIALS ?? 2);
  const GAP = Number(process.env.GAP ?? 1.5);
  const AHEAD = Number(process.env.AHEAD ?? 0.75);
  const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const base = surfZoneConfigFor(settings, SEED, true);
  const config: SurfZoneConfig = { ...base, compute: 'cpu', canyonBed: 'b' };
  const wall = Date.now();
  const sim = new SurfZoneSimulation(config);
  const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
  const focus = sim.breakPoint();
  const { nx, nz } = sim.solver as unknown as { nx: number; nz: number };
  say(`  SEATBELT: search ${globalThis.location?.search ?? '(none)'}, grid ${nx}x${nz} = ${nx * nz} cells,`
    + ` spun up on the CPU in ${f((Date.now() - wall) / 1000, 1)} s, focus ${f(focus.x, 2)} / ${f(focus.z, 2)}.`);
  say(`  (Canyon B is 400x451 = 180400; the default Canyon is 400x507 = 202800. The config's own twistStop is`
    + ` ${JSON.stringify(config.twistStop ?? null)} and every arm below sets it explicitly on the session.)`);
  say();
  const water: SurfWater = {
    sampleAt: (x, y, z, o) => physical.sampleAt(x, y, z, o),
    surfaceAt: (x, z) => physical.surfaceAt(x, z),
    addReaction: () => {},
    setSampleTime: (o: number) => physical.setSampleTime(o),
  };
  interface Live { arm: Arm; stance: Stance; steer: number; trial: number; session: RideSession; ticks: Tick[]; done: boolean; fellAt: number | null; t0: number }
  const live: Live[] = [];
  let placed = 0;
  let t = 0;
  const horizon = SECONDS + GAP * TRIALS + 2;
  while (t < horizon) {
    sim.step(STEP);
    t += STEP;
    if (placed < TRIALS && t >= GAP * (placed + 1)) {
      placed += 1;
      const place = placement(water, focus.x, focus.z - AHEAD);
      if (place) {
        for (const arm of ARMS) for (const stance of STANCES) for (const steer of STEERS) {
          const session = new RideSession({ ...RIDER_OPTS, ...(arm === 'off' ? {} : { twistStop: arm }) } as ConstructorParameters<typeof RideSession>[0]);
          session.place({ x: place.at.x, z: place.at.z, heading: place.heading, speed: SPEEDS[0], phase: 'standing' }, water);
          live.push({ arm, stance, steer, trial: placed, session, ticks: [], done: false, fellAt: null, t0: t });
        }
      }
    }
    for (const e of live) {
      if (e.done) continue;
      e.session.step(STEP, water, {
        paddle: false, popUp: false, steer: e.steer,
        crouch: e.stance === 'crouch' ? 1 : e.stance === 'compress' ? 0.6 : 0,
        compress: e.stance === 'compress' ? 1 : 0,
      });
      if (!e.session.rider.attached) { e.done = true; e.fellAt = t - e.t0; continue; }
      e.ticks.push(readTick(t - e.t0, e.session.rider, e.session.board, water));
    }
  }
  // ---- the handover, on real water ---------------------------------------------------------------------------
  say('  ⭐ THE HANDOVER ON THE REAL CANYON, through RideSession. `want` is the secant this probe computes from');
  say('  `tb.angle` and the stop\'s own constants; off the switch `body` must be 0 and `sched` exactly 20.');
  say();
  const w = [8, 10, 8, 7, 7, 9, 8, 11, 11, 13];
  say(row(['arm', 'stance', 'steer', 'trial', 'ticks', 'past R', 'max °', 'body!=want', 'sched!=body', 'body max'], w));
  let mismatches = 0;
  let offNonZero = 0;
  let hadPast = 0;
  for (const e of live) {
    const s = summary(e);
    let badWant = 0;
    let badSched = 0;
    let bodyMax = 0;
    for (let i = 1; i < e.ticks.length; i += 1) {
      const want = e.arm === 'off' ? 0 : expectK(e.ticks[i - 1].twist / DEG);
      if (Math.abs(e.ticks[i].modelK - want) > 1e-9) badWant += 1;
      const wantSched = want <= TWIST_STIFFNESS ? TWIST_STIFFNESS : Math.min(2020, want);
      if (Math.abs(e.ticks[i].schedK - wantSched) > 1e-9) badSched += 1;
      bodyMax = Math.max(bodyMax, e.ticks[i].modelK);
      if (e.arm === 'off' && e.ticks[i].modelK !== 0) offNonZero += 1;
    }
    mismatches += badWant + badSched;
    if (s.past > 0) hadPast += 1;
    say(row([e.arm, e.stance, String(e.steer), String(e.trial), String(s.n), String(s.past), s.maxTwist, String(badWant), String(badSched), bodyMax], w));
  }
  say();
  say(`  CONTROL, the switch off is inert: non-zero \`twistModelK\` ticks off the switch = ${offNonZero}`
    + `${offNonZero === 0 ? ' — none.' : ' — THE GATE LEAKS.'}`);
  say(`  CONTROL, both sides agree with the formula: mismatching ticks over every run = ${mismatches}`
    + `${mismatches === 0 ? ' — none.' : ' — THE HANDOVER IS WRONG.'}`);
  say(`  ⛔ RUNS THAT REACHED THE STOP AT ALL: ${hadPast} of ${live.length}.`
    + `${hadPast === 0 ? '  NONE — this mode is INCONCLUSIVE about the handover.' : ''}`);
  say();
  say('  ⭐ WHAT IT DOES ON HIS OWN SPOT. `work` is the joint\'s DELIVERED work over the whole live run, J.');
  say();
  const w2 = [8, 10, 7, 7, 9, 10, 10, 9, 9, 9, 9];
  say(row(['stance', 'steer', 'trial', 'arm', 'fell s', 'work J', 'max tw °', 'end tw °', 'bank °', 'swing °', 'climb m'], w2));
  for (const stance of STANCES) for (const steer of STEERS) for (let trial = 1; trial <= TRIALS; trial += 1) {
    for (const arm of ARMS) {
      const e = live.find((x) => x.arm === arm && x.stance === stance && x.steer === steer && x.trial === trial);
      if (!e) continue;
      const s = summary(e);
      say(row([arm === 'off' ? stance : '', arm === 'off' ? String(steer) : '', arm === 'off' ? String(trial) : '', arm,
        e.fellAt === null ? 'live' : f(e.fellAt, 3), s.work, s.maxTwist, s.endTwist, s.maxBank, s.swing, s.climb], w2));
    }
  }
  say();
  say('  ⚠️ `bank`, `swing` and `climb` are this run\'s own peak body lean, net heading change and net surface rise.');
  say('  They are the same three quantities the owner\'s 42° / 40° / 0.296 -> 0.995 m target is about, read on HIS');
  say('  OWN WATER — but they are NOT the ride analyzer\'s bottom-turn columns (`Maneuver.roll`, `pathYaw`, the');
  say('  `Carrying` heights), which are measured off a wave frame on a turn the analyzer itself named. A placed');
  say('  rider on a crest is not a named bottom turn, so the two must not be set side by side.');
}

const ARMS: Arm[] = ['off', 'model', 'design'];

if (MODE === 'parse') {
  say('################ Step 3.5j — the switch chain, hop by hop, from a search string to a rider\'s weights');
  say();
  const w = [34, 12, 14, 14];
  say(row(['search', 'switch', 'SurfZoneConfig', 'RideSession'], w));
  for (const value of ['', 'model', 'design', 'on', 'ON', 'Model', 'yes', '1', 'off']) {
    const search = value ? `?twistStop=${value}` : '';
    (globalThis as { location?: { search: string } }).location = { search };
    const parsed = twistStopSwitch(search).twistStop ?? '—';
    const settings = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'light-offshore' }, { stage: 2, compute: 'cpu' });
    const config = surfZoneConfigFor(settings, 5, false);
    const forwarded = config.twistStop ? { twistStop: config.twistStop } : {};
    say(row([search || '(none)', parsed, config.twistStop ?? '—', (forwarded as { twistStop?: string }).twistStop ?? '—'], w));
  }
  say();
  say('  ⚠️ `Model` and `ON` are lower-cased by the switch; `on`, `yes`, `1` and `off` are NOT values and must all');
  say('  read `—`. Only `model` and `design` reach the config, and the `RideSession` column is the runner\'s own');
  say('  forwarding expression applied to that config — the hop a `swing` option was once dropped in.');
} else if (MODE === 'sea') {
  say('################ Step 3.5j ridden — THE REAL CANYON (`?canyonWaves=true`, bed B), through RideSession');
  say();
  sea();
} else if (MODE === 'bytes') {
  // Every live column of the default arm, printed in full, so the same run on the base branch can be diffed.
  for (const stance of STANCES) for (const steer of STEERS) for (const speed of SPEEDS) {
    for (const [name, r] of [['fixture', runFixture('off', stance, steer, speed)], ['session', runSession('off', stance, steer, speed)]] as const) {
      for (const k of r.ticks) {
        say([name, stance, steer, speed, k.t.toFixed(6), k.twist.toFixed(12), k.modelK.toFixed(12), k.schedK.toFixed(12),
          k.active.toFixed(12), k.u1.toFixed(12), k.bank.toFixed(12), k.roll.toFixed(12), k.speed.toFixed(12), k.yaw.toFixed(12)].join(' '));
      }
      say([name, stance, steer, speed, 'END', r.fellAt === null ? 'live' : r.fellAt.toFixed(6), r.cause].join(' '));
    }
  }
} else {
  const label = MODE === 'session' ? 'THE REAL SESSION PATH (search string -> surfZoneConfigFor -> SurfZoneConfig -> RideSession -> its own rider)'
    : 'THE FIXTURE PATH (AttachedRider and BoardBody built directly, as every probe in this folder builds them)';
  say(`################ Step 3.5j ridden — ${label}`);
  say();
  say(`  FaceWater ${FACE.height} m / ${FACE.slope}° / depth ${FACE.depth} m, entry ${SPEEDS.join(',')} m/s, ${SIDE}° off the fall line, SINK ${SINK} m,`);
  say(`  ${SECONDS} s, stances ${STANCES.join(',')}, steers ${STEERS.join(',')}. Canyon B's own calibration (#223), NOT the Canyon.`);
  say();
  const run = MODE === 'session' ? runSession : runFixture;
  if (MODE === 'session') {
    const probe = runSession('model', 'tall', 0, SPEEDS[0]);
    say(`  THE CONFIG THE SESSION WAS BUILT FROM: ${JSON.stringify(probe.config)}   (the parse and config hops, live)`);
    say();
  }
  // ---- the handover check -------------------------------------------------------------------------------------
  say('  ⭐ THE HANDOVER, every live tick of every cell. `body` is `AttachedRider.twistModelK`, `sched` is');
  say('  `PredictiveController.schedTwistK`, `want` is the secant this probe computes from `tb.angle` and the stop\'s');
  say('  own constants. Off the switch `body` must be 0 and `sched` exactly 20 on EVERY tick.');
  say();
  const w = [8, 10, 8, 7, 9, 8, 11, 11, 13, 13];
  say(row(['arm', 'stance', 'steer', 'ticks', 'past R', 'max °', 'body!=want', 'sched!=body', 'body max', 'sched max'], w));
  let hadPast = 0;
  let mismatches = 0;
  let offNonZero = 0;
  for (const arm of ARMS) for (const stance of STANCES) for (const steer of STEERS) for (const speed of SPEEDS) {
    const r = run(arm, stance, steer, speed);
    const s = summary(r);
    let badWant = 0;
    let badSched = 0;
    let bodyMax = 0;
    let schedMax = 0;
    for (let i = 0; i < r.ticks.length; i += 1) {
      const k = r.ticks[i];
      // ⭐ The angle the CONTROL TICK read, which is the angle at the START of this frame — i.e. the END of the
      // previous one. `controlDue` fires on the frame's first substep, and `tb.angle` then moves on through the
      // other fifteen, so comparing `twistModelK` with the angle at the END of its own frame measures the substep
      // lag and not the handover. The first frame's control tick saw the placed joint, θ_t = 0, so it is skipped.
      if (i === 0) continue;
      const want = arm === 'off' ? 0 : expectK(r.ticks[i - 1].twist / DEG);
      if (Math.abs(k.modelK - want) > 1e-9) badWant += 1;
      // `schedTwistK` is the axis coordinate: 20 below the first knot, else the clamped secant.
      const wantSched = want <= TWIST_STIFFNESS ? TWIST_STIFFNESS : Math.min(2020, want);
      if (Math.abs(k.schedK - wantSched) > 1e-9) badSched += 1;
      bodyMax = Math.max(bodyMax, k.modelK);
      schedMax = Math.max(schedMax, k.schedK);
      if (arm === 'off' && k.modelK !== 0) offNonZero += 1;
    }
    mismatches += badWant + badSched;
    if (s.past > 0) hadPast += 1;
    say(row([arm, stance, String(steer), String(s.n), String(s.past), s.maxTwist, String(badWant), String(badSched), bodyMax, schedMax], w));
  }
  say();
  say(`  CONTROL, the switch off is inert: ticks with a non-zero \`twistModelK\` off the switch = ${offNonZero}`
    + `${offNonZero === 0 ? ' — none, as the gate requires.' : ' — THE GATE LEAKS.'}`);
  say(`  CONTROL, the two sides agree with the formula: mismatching ticks over every cell = ${mismatches}`
    + `${mismatches === 0 ? ' — none.' : ' — THE HANDOVER IS WRONG.'}`);
  say(`  ⛔ CELLS THAT REACHED THE STOP AT ALL: ${hadPast} of ${ARMS.length * STANCES.length * STEERS.length * SPEEDS.length}.`
    + `${hadPast === 0 ? '  NONE — so this mode says NOTHING about the handover past the stop and is INCONCLUSIVE.' : ''}`);
  say();
  // ---- neutral and steered ------------------------------------------------------------------------------------
  say('  ⭐ WHAT IT DOES, AT NEUTRAL AND THROUGH A STEER. `work` is the joint\'s DELIVERED generalised work over the');
  say('  whole live run, J (Σ tb.active · Δtb.angle); `fell` is the first tick the rider came off, s.');
  say();
  const w2 = [8, 10, 7, 9, 10, 10, 9, 9, 9, 9];
  say(row(['stance', 'steer', 'arm', 'fell s', 'work J', 'max tw °', 'end tw °', 'bank °', 'swing °', 'climb m'], w2));
  for (const stance of STANCES) for (const steer of STEERS) for (const speed of SPEEDS) {
    for (const arm of ARMS) {
      const r = run(arm, stance, steer, speed);
      const s = summary(r);
      say(row([arm === 'off' ? stance : '', arm === 'off' ? String(steer) : '', arm,
        r.fellAt === null ? 'live' : f(r.fellAt, 3), s.work, s.maxTwist, s.endTwist, s.maxBank, s.swing, s.climb], w2));
    }
  }
  say();
  say('  ⚠️ `bank`, `swing` and `climb` here are this run\'s own peak body lean, net heading change and net surface');
  say('  rise — NOT the ride analyzer\'s bottom-turn columns, which need a wave frame this analytic face has not got.');
  say('  They are printed so the two arms can be compared on the same three quantities, not to be set beside the');
  say('  owner\'s 42° / 40° / 0.296 -> 0.995 m target, which is a Canyon measurement and belongs to a Canyon run.');
}

process.stdout.write(`${out.join('\n')}\n`);
