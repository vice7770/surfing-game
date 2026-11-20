/**
 * **Step 3.5k — `?twistGrip=feet` RIDDEN: does the switch REACH the physics, how much torque does the clamp take
 * away, and does it move the fall?**
 *
 * The defect, in one line: the rider's torso twisting against the board is **one degree of freedom with two torques
 * on it, both crossing the same two soles, under different rules**. `AttachedRider.controlStep` holds the active
 * torque to `Math.min(TWIST_BODY_TORQUE, FOOT_FRICTION × legLoad × TWIST_GRIP_SPAN)` and then slews it through
 * MOTOR_LAG; `coupleYaw`'s end stop past TWIST_BODY_RANGE is `TWIST_STOP × over` with a TWIST_STOP_DAMPING damper
 * beside it, **bounded by nothing and lagged by nothing**, and it reaches the board's angular rows through the same
 * `kick`. It is the only unbounded one of the six foot-borne forces in that file.
 *
 * ## The first job is not a result, it is a CHECK
 *
 * Three switches in this project have turned out not to reach the physics at all: `?bodyBank=hip` parsed **0 times**
 * in a real session while its tests passed, `?physical` gates nothing, and a `swing` option was dropped in a
 * **`RideSession` forwarding hop** — 5.4 cm of mass in a fixture, **0 m** in a real session. So the chain is walked
 * **hop by hop and printed**, and the thing printed at the far end is **the host's own object**: the
 * `SurfZoneConfig` that `surfZoneConfigFor` built from a search string, and the live
 * `AttachedRider.twistStopLedger` of the rider a `RideSession` built for itself — never the URL that was passed in.
 *
 * ## The quantity, and why it is this one
 *
 * `AttachedRider.twistStopLedger`, written on **every coupled substep of BOTH arms**, so an unmoved number is
 * evidence. All N·m about the board's own up axis, magnitudes:
 *
 * | field | what it is | off the switch |
 * |---|---|---|
 * | `bound` | `FOOT_FRICTION × max(0, legLoad) × TWIST_GRIP_SPAN` — the grip the ACTIVE torque already obeys | written, binds nothing |
 * | `ask` | the stop's **REQUESTED** torque: `TWIST_STOP × over + (TWIST_STOP h + TWIST_STOP_DAMPING) × tb.rate` | written |
 * | `got` | the stop's **DELIVERED** torque | **always `ask`** |
 * | `slips` | coupled substeps the feet slipped | **always 0** |
 *
 * ⛔ **A run that never gets the rider past 0.87 rad of twist proves nothing about the stop**, so every summary
 * prints the ticks past the stop and a run with none is reported as inconclusive rather than as a pass.
 *
 * ## The modes
 *
 * | `MODE` | what it is | what it is for |
 * |---|---|---|
 * | `parse` | a search string through `twistGripSwitch`, `surfZoneConfigFor` and `SurfZoneRunner`'s own forwarding expression | the parse and config hops, printed |
 * | `fixture` | `AttachedRider` + `BoardBody` on `FaceWater`, placed as `3.5/bank.ts` places them | the physics, the way this folder measures it |
 * | `session` | the same water through **`RideSession`**, built from the owner's own search string | the forwarding hop that has eaten an option before |
 * | `sea` | the **real Canyon B solver** (`?canyonWaves=true`), riders placed through `RideSession`, SEEDS × TRIALS | his own spot: the torque removed and the fall |
 * | `bytes` | the default arm's whole per-frame trace, for a diff against the base branch | the byte-identity claim |
 *
 * ## The face the non-sea modes ride, and why this one
 *
 * `FaceWater` at **1.4 m, 16°, depth 6 m, entry 5.7 m/s** — Canyon B's own calibration (`#223`). ⚠️ It is a
 * calibrated analytic face and **not the Canyon**: no peel, no crest line, no lip. No figure from it is a Canyon ride.
 *
 * ## Signs, units, frames
 *
 * * `twist` is `tb.angle`, the **upper body's yaw relative to the board about the board's own up axis**, degrees, in
 *   the game's own sign. Not a roll angle.
 * * `drawn` is `AttachedRider.drawnTwist`, degrees — the rig's **own** quantity, the one the torso is posed from.
 * * `ask`/`got`/`removed` are the stop's torque, N·m, magnitudes, about the board's up axis. They are NOT the
 *   joint's whole torque: the active torque and the base spring and damper are beside them and bounded separately.
 * * `fell` is the first tick `rider.attached` went false, seconds since that rider was placed.
 *
 * ## Running it
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/twist-grip-ride.ts -o <s>/raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '?canyonWaves=true' };\n" > <s>/tgr.mjs && cat <s>/raw.mjs >> <s>/tgr.mjs
 *   MODE=sea SEEDS=1,2,3 TRIALS=3 node <s>/tgr.mjs
 *
 * ⚠️ The wrapper must prepend an **object**, never a bare string: a bare string silently benches the default Canyon
 * through `devTools.ts:9`, and the seatbelt line below prints the grid so that substitution cannot pass unnoticed.
 *
 * Env: `MODE`, `SECONDS`, `STEERS`, `SPEEDS`, `STANCES`, `TRIALS`, `SEEDS`, `SIDE`, `SINK`, `GAP`, `AHEAD`, `SIZE`.
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor, twistGripSwitch } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { RideSession } from '../../../../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** `AttachedRider`'s own stop, restated so the probe checks the clamp against the formula and not against itself. */
const TWIST_BODY_RANGE = 0.87;

const MODE = (process.env.MODE ?? 'fixture') as 'parse' | 'fixture' | 'session' | 'bytes' | 'sea';
const SECONDS = Number(process.env.SECONDS ?? 6);
const SIDE = Number(process.env.SIDE ?? -45);
/** `3.5/bank.ts`'s own flush-placement fix: without it the hull starts dry and the leg unloaded for ~0.5 s. */
const SINK = Number(process.env.SINK ?? 0.06);
const nums = (v: string | undefined, d: string): number[] => (v ?? d).split(',').map(Number);
const STEERS = nums(process.env.STEERS, '0,1,-1');
const SPEEDS = nums(process.env.SPEEDS, '5.7');
const SEEDS = nums(process.env.SEEDS, '1');
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];
/** Canyon B's own calibration (#223), and the face every non-sea mode rides. */
const FACE = { depth: 6, height: 1.4, slope: 16, crestZ: 0, vertical: 'surface' as const };

type Stance = 'tall' | 'crouch' | 'compress';
type Arm = 'off' | 'feet';
const ARMS: Arm[] = ['off', 'feet'];

const f = (x: number, n = 3): string => (Number.isFinite(x) ? x.toFixed(n) : 'n/a');
const pad = (s: string, n: number): string => s.padStart(n);
const row = (cells: (string | number)[], widths: number[] = []): string =>
  cells.map((c, i) => pad(typeof c === 'number' ? f(c) : c, widths[i] ?? 10)).join('  ');
/** The owner's own address, as options rather than as a search string, for the fixture. */
const RIDER_OPTS = { rider: 'new' as const, feltFrame: 'deck' as const, riderBody: 'two' as const, stanceReach: 'keep' as const, deepen: 'on' as const };
/** The owner's own address as he types it (`?canyonWaves=true&rider=new&...`), for the session and sea paths. */
const OWNER_SEARCH = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';

const out: string[] = [];
const say = (s = ''): void => { out.push(s); };

/** Quantiles of a population, reported with its own size so no single trace can become a headline. */
function stats(xs: number[]): { n: number; min: number; med: number; max: number; mean: number } {
  if (xs.length === 0) return { n: 0, min: NaN, med: NaN, max: NaN, mean: NaN };
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return {
    n: s.length, min: s[0], max: s[s.length - 1],
    med: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2,
    mean: s.reduce((a, b) => a + b, 0) / s.length,
  };
}

interface Tick {
  t: number;
  twist: number;
  drawn: number;
  ask: number;
  got: number;
  bound: number;
  slips: number;
  substeps: number;
  active: number;
  bank: number;
  roll: number;
  speed: number;
  yaw: number;
  height: number;
}
interface Result { ticks: Tick[]; fellAt: number | null; cause: string }

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

/** One frame's read, shared by every path so the two cannot be reading different columns. */
function readTick(t: number, rider: AttachedRider, board: BoardBody, water: SurfWater): Tick {
  const tb = rider.twistBody;
  const l = rider.twistStopLedger;
  const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  const side = new Vector3(fwd.z, 0, -fwd.x);
  const boardUp = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
  return {
    t,
    twist: tb.angle * DEG,
    drawn: rider.drawnTwist * DEG,
    ask: l.ask,
    got: l.got,
    bound: l.bound,
    slips: l.slips,
    substeps: l.substeps,
    active: tb.active,
    bank: rider.bank.angle * DEG,
    roll: Math.atan2(boardUp.dot(side), boardUp.y) * DEG,
    speed: board.velocity.length(),
    yaw: Math.atan2(fwd.x, fwd.z) * DEG,
    height: water.surfaceAt(board.position.x, board.position.z),
  };
}

/** The fixture path: `AttachedRider` and `BoardBody` built here, as every probe in this folder builds them. */
function runFixture(arm: Arm, stance: Stance, steer: number, speed: number): Result {
  const water = new FaceWater(FACE);
  const place = placement(water, 0, water.front * 0.5);
  if (!place) throw new Error('dry placement');
  const board = new BoardBody();
  board.place(
    place.at.clone().addScaledVector(place.up, board.shape.centerOfMass.y - SINK),
    place.orientation,
    place.forward.clone().multiplyScalar(speed).add(place.flow),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing', ...RIDER_OPTS, ...(arm === 'off' ? {} : { twistGrip: arm }),
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

/** The forwarding expression `SurfZoneRunner` applies to the config, written out so the hop itself is in the probe. */
function forwarded(config: SurfZoneConfig): Record<string, unknown> {
  return {
    ...(config.rider ? { rider: config.rider } : {}), ...(config.feltFrame ? { feltFrame: config.feltFrame } : {}),
    ...(config.riderBody ? { riderBody: config.riderBody } : {}), ...(config.stanceReach ? { stanceReach: config.stanceReach } : {}),
    ...(config.deepen ? { deepen: config.deepen } : {}), ...(config.twistGrip ? { twistGrip: config.twistGrip } : {}),
  };
}

/**
 * The real session path: **the owner's own search string** parsed by the game's own switch, carried through a
 * `SurfZoneConfig`, the forwarding expression `SurfZoneRunner` uses, and `RideSession`'s own options — the four hops
 * an option can be dropped in — and then the rider `RideSession` builds for itself.
 */
function runSession(arm: Arm, stance: Stance, steer: number, speed: number): Result & { config: unknown; built: unknown } {
  const search = `${OWNER_SEARCH}${arm === 'off' ? '' : `&twistGrip=${arm}`}`;
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'offshore', time: 'midday' }, { stage: 2, compute: 'cpu' });
  const config = surfZoneConfigFor(settings, 5, false);
  const options = forwarded(config);
  const water = new FaceWater(FACE);
  const place = placement(water, 0, water.front * 0.5);
  if (!place) throw new Error('dry placement');
  const session = new RideSession(options as ConstructorParameters<typeof RideSession>[0]);
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
  return { ticks, fellAt, cause: rider.separation ?? '', config: { twistGrip: config.twistGrip ?? null }, built: { twistGrip: (options as { twistGrip?: string }).twistGrip ?? null } };
}

/** A run's own summary. `removed` is `ask − got`, the torque the clamp TOOK AWAY, per substep and at its peak. */
function summary(r: Result): {
  n: number; past: number; maxTwist: number; endTwist: number; maxDrawn: number; work: number;
  askPeak: number; gotPeak: number; removedPeak: number; boundMed: number; slipFrac: number; substeps: number;
  maxBank: number; swing: number; climb: number;
} {
  const { ticks } = r;
  let work = 0;
  let maxTwist = 0;
  let maxDrawn = 0;
  let past = 0;
  let maxBank = 0;
  let askPeak = 0;
  let gotPeak = 0;
  let removedPeak = 0;
  const bounds: number[] = [];
  for (let i = 1; i < ticks.length; i += 1) {
    work += 0.5 * (ticks[i - 1].active + ticks[i].active) * ((ticks[i].twist - ticks[i - 1].twist) / DEG);
  }
  for (const k of ticks) {
    if (Math.abs(k.twist) > Math.abs(maxTwist)) maxTwist = k.twist;
    if (Math.abs(k.drawn) > Math.abs(maxDrawn)) maxDrawn = k.drawn;
    if (Math.abs(k.twist) > TWIST_BODY_RANGE * DEG) past += 1;
    if (Math.abs(k.bank) > Math.abs(maxBank)) maxBank = k.bank;
    askPeak = Math.max(askPeak, k.ask);
    gotPeak = Math.max(gotPeak, k.got);
    removedPeak = Math.max(removedPeak, k.ask - k.got);
    if (k.bound > 0) bounds.push(k.bound);
  }
  const last = ticks[ticks.length - 1];
  return {
    n: ticks.length, past, maxTwist, maxDrawn, work,
    endTwist: ticks.length ? last.twist : NaN,
    askPeak, gotPeak, removedPeak, boundMed: stats(bounds).med,
    slipFrac: ticks.length && last.substeps > 0 ? last.slips / last.substeps : 0,
    substeps: ticks.length ? last.substeps : 0,
    maxBank,
    swing: ticks.length > 1 ? ((last.yaw - ticks[0].yaw + 540) % 360) - 180 : NaN,
    climb: ticks.length > 1 ? last.height - ticks[0].height : NaN,
  };
}

interface Live { arm: Arm; stance: Stance; steer: number; trial: number; seed: number; session: RideSession; ticks: Tick[]; done: boolean; fellAt: number | null; t0: number }

/**
 * **`MODE=sea`: the REAL Canyon, as `?canyonWaves=true` builds it — the owner's own spot for the rider work** — with
 * every rider placed through `RideSession`, so the session hop is exercised on real water. Riders are run in matched
 * pairs: for each (seed, trial, stance, steer) cell the `off` and `feet` riders are placed on the SAME frame at the
 * SAME point of the SAME sea, so the two arms differ in the switch and in nothing else.
 */
function sea(): Live[] {
  const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
  const TRIALS = Number(process.env.TRIALS ?? 2);
  const GAP = Number(process.env.GAP ?? 1.5);
  const AHEAD = Number(process.env.AHEAD ?? 0.75);
  const live: Live[] = [];
  for (const seed of SEEDS) {
    (globalThis as { location?: { search: string } }).location = { search: OWNER_SEARCH };
    const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
    const base = surfZoneConfigFor(settings, seed, true);
    const config: SurfZoneConfig = { ...base, compute: 'cpu', canyonBed: 'b' };
    const wall = Date.now();
    const sim = new SurfZoneSimulation(config);
    const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
    const focus = sim.breakPoint();
    const { nx, nz } = sim.solver as unknown as { nx: number; nz: number };
    say(`  SEATBELT seed ${seed}: search ${globalThis.location?.search ?? '(none)'}, grid ${nx}x${nz} = ${nx * nz} cells,`
      + ` spun up on the CPU in ${f((Date.now() - wall) / 1000, 1)} s, focus ${f(focus.x, 2)} / ${f(focus.z, 2)}.`);
    say(`  (Canyon B is 400x451 = 180400; the default Canyon is 400x507 = 202800. THE CONFIG THE HOST BUILT FROM THE`
      + ` OWNER'S OWN SEARCH STRING: twistGrip = ${JSON.stringify(config.twistGrip ?? null)} — null, as the owner's`
      + ` address has no \`&twistGrip=\`, and each arm below sets it explicitly on its own session.)`);
    const water: SurfWater = {
      sampleAt: (x, y, z, o) => physical.sampleAt(x, y, z, o),
      surfaceAt: (x, z) => physical.surfaceAt(x, z),
      addReaction: () => {},
      setSampleTime: (o: number) => physical.setSampleTime(o),
    };
    let placed = 0;
    let t = 0;
    const mine: Live[] = [];
    const horizon = SECONDS + GAP * TRIALS + 2;
    while (t < horizon) {
      sim.step(STEP);
      t += STEP;
      if (placed < TRIALS && t >= GAP * (placed + 1)) {
        placed += 1;
        const place = placement(water, focus.x, focus.z - AHEAD);
        if (place) {
          for (const arm of ARMS) for (const stance of STANCES) for (const steer of STEERS) {
            const session = new RideSession({ ...RIDER_OPTS, ...(arm === 'off' ? {} : { twistGrip: arm }) } as ConstructorParameters<typeof RideSession>[0]);
            session.place({ x: place.at.x, z: place.at.z, heading: place.heading, speed: SPEEDS[0], phase: 'standing' }, water);
            mine.push({ arm, stance, steer, trial: placed, seed, session, ticks: [], done: false, fellAt: null, t0: t });
          }
        }
      }
      for (const e of mine) {
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
    live.push(...mine);
  }
  return live;
}

if (MODE === 'parse') {
  say('################ Step 3.5k — the switch chain, hop by hop, from a search string to a rider\'s own field');
  say();
  const w = [36, 12, 16, 16, 16];
  say(row(['search', 'switch', 'SurfZoneConfig', 'runner hop', 'RideSession'], w));
  for (const value of ['', 'feet', 'FEET', ' feet ', 'on', 'yes', '1', 'off', 'true']) {
    const search = value ? `?twistGrip=${value}` : '';
    (globalThis as { location?: { search: string } }).location = { search };
    const parsed = twistGripSwitch(search).twistGrip ?? '—';
    const settings = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'offshore', time: 'midday' }, { stage: 2, compute: 'cpu' });
    const config = surfZoneConfigFor(settings, 5, false);
    const hop = forwarded(config) as { twistGrip?: string };
    const session = new RideSession(hop as ConstructorParameters<typeof RideSession>[0]);
    // ⭐ Read off the OBJECT the host built, not off the string that was passed in: `twistStopBounded` is the live
    // `AttachedRider`'s own report of the field the switch sets, on the rider a `RideSession` built for itself.
    say(row([search || '(none)', parsed, config.twistGrip ?? '—', hop.twistGrip ?? '—',
      session.rider.twistStopBounded ? 'BOUNDED' : 'unbounded'], w));
  }
  say();
  say('  ⚠️ `FEET` and ` feet ` are lower-cased and trimmed by the switch; `on`, `yes`, `1`, `true` and `off` are');
  say('  NOT values and must all read `—`. Only `feet` reaches the config. The `runner hop` column is');
  say('  `SurfZoneRunner`\'s own forwarding expression applied to that config — the hop a `swing` option was once');
  say('  dropped in — and `RideSession` is that expression actually handed to a constructor.');
} else if (MODE === 'sea') {
  say('################ Step 3.5k ridden — THE REAL CANYON (`?canyonWaves=true`, bed B), through RideSession');
  say();
  const live = sea();
  const cells = live.length / ARMS.length;
  say();
  // ---- the clamp, on real water ------------------------------------------------------------------------------
  say('  ⭐ WHAT THE CLAMP TAKES AWAY, ON HIS OWN SPOT. `ask` is the stop\'s REQUESTED peak torque, N·m; `got` is');
  say('  what it DELIVERED; `removed` is `ask − got` at its peak. `slip %` is the share of coupled substeps the');
  say('  feet slipped. Off the switch `got` must equal `ask` and `slip %` must be 0 on every row.');
  say();
  const w = [6, 6, 9, 7, 7, 7, 8, 9, 9, 9, 9, 8];
  say(row(['seed', 'trial', 'stance', 'steer', 'arm', 'ticks', 'past R', 'ask N·m', 'got N·m', 'removed', 'bound', 'slip %'], w));
  let offGotDiffers = 0;
  let offSlips = 0;
  let hadPast = 0;
  let overBound = 0;
  for (const e of live) {
    const s = summary(e);
    if (s.past > 0) hadPast += 1;
    if (e.arm === 'off') {
      for (const k of e.ticks) { if (k.got !== k.ask) offGotDiffers += 1; }
      if (s.slipFrac > 0) offSlips += 1;
    } else {
      for (const k of e.ticks) { if (k.got > k.bound + 1e-9) overBound += 1; }
    }
    say(row([String(e.seed), String(e.trial), e.stance, String(e.steer), e.arm, String(s.n), String(s.past),
      s.askPeak, s.gotPeak, s.removedPeak, s.boundMed, 100 * s.slipFrac], w));
  }
  say();
  say(`  CONTROL, the switch off is inert: ticks where \`got\` differs from \`ask\` off the switch = ${offGotDiffers}`
    + `${offGotDiffers === 0 ? ' — none.' : ' — THE GATE LEAKS.'}`);
  say(`  CONTROL, the switch off never slips: runs with a non-zero slip share off the switch = ${offSlips}`
    + `${offSlips === 0 ? ' — none.' : ' — THE GATE LEAKS.'}`);
  say(`  CONTROL, on the switch nothing is delivered past the bound: ticks with \`got\` > \`bound\` = ${overBound}`
    + `${overBound === 0 ? ' — none.' : ' — THE CLAMP DOES NOT HOLD.'}`);
  say(`  ⛔ RUNS THAT REACHED THE STOP AT ALL: ${hadPast} of ${live.length}.`
    + `${hadPast === 0 ? '  NONE — this mode is INCONCLUSIVE about the stop.' : ''}`);
  say();
  // ---- the population, both arms --------------------------------------------------------------------------
  say(`  ⭐ THE POPULATION, ${cells} matched cells per arm (${SEEDS.length} seed${SEEDS.length === 1 ? '' : 's'}`
    + ` x ${process.env.TRIALS ?? 2} trials x ${STANCES.length} stances x ${STEERS.length} steers). Every number`);
  say('  below is a quantile over that population, never one trace.');
  say();
  const w3 = [26, 7, 7, 10, 10, 10, 10];
  say(row(['quantity', 'arm', 'n', 'min', 'median', 'mean', 'max'], w3));
  const byArm = (arm: Arm): Live[] => live.filter((e) => e.arm === arm);
  const col = (arm: Arm, pick: (s: ReturnType<typeof summary>, e: Live) => number): number[] =>
    byArm(arm).map((e) => pick(summary(e), e)).filter((x) => Number.isFinite(x));
  const line = (label: string, pick: (s: ReturnType<typeof summary>, e: Live) => number): void => {
    for (const arm of ARMS) {
      const t = stats(col(arm, pick));
      say(row([arm === ARMS[0] ? label : '', arm, String(t.n), t.min, t.med, t.mean, t.max], w3));
    }
  };
  line('stop REQUESTED peak N·m', (s) => s.askPeak);
  line('stop DELIVERED peak N·m', (s) => s.gotPeak);
  line('REMOVED peak N·m', (s) => s.removedPeak);
  line('grip bound N·m (median)', (s) => s.boundMed);
  line('slip share of substeps %', (s) => 100 * s.slipFrac);
  line('fall s', (s, e) => (e.fellAt === null ? NaN : e.fellAt));
  line('ticks past the stop', (s) => s.past);
  line('peak twist deg', (s) => Math.abs(s.maxTwist));
  line('peak DRAWN twist deg', (s) => Math.abs(s.maxDrawn));
  line('peak bank deg', (s) => Math.abs(s.maxBank));
  line('net heading swing deg', (s) => s.swing);
  line('net climb m', (s) => s.climb);
  say();
  const stood = (arm: Arm): number => byArm(arm).filter((e) => e.fellAt === null).length;
  say(`  ⛔ RIDERS STILL ON AT THE HORIZON: off ${stood('off')} of ${cells}, feet ${stood('feet')} of ${cells}.`);
  say('  ⚠️ `fall s` above is over the riders that FELL only, so its n is not the cell count; the line above is the');
  say('  censoring. A median taken over fallers alone moves when a rider crosses between the two groups.');
  say();
  // ---- the matched pairs ------------------------------------------------------------------------------------
  say('  ⭐ MATCHED PAIRS, the same cell with the switch off and on. `Δfall` is on − off, s.');
  say();
  const w2 = [6, 6, 9, 7, 10, 10, 9, 9, 9, 9, 9];
  say(row(['seed', 'trial', 'stance', 'steer', 'fell off', 'fell on', 'Δfall', 'tw off', 'tw on', 'drawn off', 'drawn on'], w2));
  const deltas: number[] = [];
  let moved = 0;
  for (const seed of SEEDS) for (let trial = 1; trial <= Number(process.env.TRIALS ?? 2); trial += 1) {
    for (const stance of STANCES) for (const steer of STEERS) {
      const a = live.find((x) => x.arm === 'off' && x.seed === seed && x.trial === trial && x.stance === stance && x.steer === steer);
      const b = live.find((x) => x.arm === 'feet' && x.seed === seed && x.trial === trial && x.stance === stance && x.steer === steer);
      if (!a || !b) continue;
      const sa = summary(a);
      const sb = summary(b);
      const d = a.fellAt !== null && b.fellAt !== null ? b.fellAt - a.fellAt : NaN;
      if (Number.isFinite(d)) deltas.push(d);
      if (Number.isFinite(d) && Math.abs(d) > 1e-9) moved += 1;
      say(row([String(seed), String(trial), stance, String(steer),
        a.fellAt === null ? 'live' : f(a.fellAt, 3), b.fellAt === null ? 'live' : f(b.fellAt, 3),
        Number.isFinite(d) ? f(d, 3) : 'n/a', sa.maxTwist, sb.maxTwist, sa.maxDrawn, sb.maxDrawn], w2));
    }
  }
  const d = stats(deltas);
  say();
  say(`  Δfall over ${d.n} pairs where BOTH arms fell: min ${f(d.min)}, median ${f(d.med)}, mean ${f(d.mean)},`
    + ` max ${f(d.max)} s.  Pairs whose fall MOVED AT ALL: ${moved} of ${d.n}.`);
  say();
  say('  ⚠️ `tw` is `tb.angle`\'s peak and `drawn` is `AttachedRider.drawnTwist`\'s — the rig\'s OWN quantity, the');
  say('  one the torso is posed from. A pair whose `drawn` columns differ is a pair whose rider LOOKS different.');
  say('  ⚠️ `bank`, `swing` and `climb` are this run\'s own peak body lean, net heading change and net surface rise.');
  say('  They are NOT the ride analyzer\'s bottom-turn columns, which are read off a wave frame on a turn the');
  say('  analyzer itself named, and a placed rider on a crest is not a named bottom turn.');
} else if (MODE === 'bytes') {
  for (const stance of STANCES) for (const steer of STEERS) for (const speed of SPEEDS) {
    for (const [name, r] of [['fixture', runFixture('off', stance, steer, speed)], ['session', runSession('off', stance, steer, speed)]] as const) {
      for (const k of r.ticks) {
        say([name, stance, steer, speed, k.t.toFixed(6), k.twist.toFixed(12), k.drawn.toFixed(12), k.active.toFixed(12),
          k.bank.toFixed(12), k.roll.toFixed(12), k.speed.toFixed(12), k.yaw.toFixed(12)].join(' '));
      }
      say([name, stance, steer, speed, 'END', r.fellAt === null ? 'live' : r.fellAt.toFixed(6), r.cause].join(' '));
    }
  }
} else {
  const label = MODE === 'session' ? 'THE REAL SESSION PATH (the owner\'s own search string -> surfZoneConfigFor -> SurfZoneConfig -> the runner\'s hop -> RideSession -> its own rider)'
    : 'THE FIXTURE PATH (AttachedRider and BoardBody built directly, as every probe in this folder builds them)';
  say(`################ Step 3.5k ridden — ${label}`);
  say();
  say(`  FaceWater ${FACE.height} m / ${FACE.slope}° / depth ${FACE.depth} m, entry ${SPEEDS.join(',')} m/s, ${SIDE}° off the fall line, SINK ${SINK} m,`);
  say(`  ${SECONDS} s, stances ${STANCES.join(',')}, steers ${STEERS.join(',')}. Canyon B's own calibration (#223), NOT the Canyon.`);
  say();
  const run = MODE === 'session' ? runSession : runFixture;
  if (MODE === 'session') {
    const off = runSession('off', 'tall', 0, SPEEDS[0]);
    const on = runSession('feet', 'tall', 0, SPEEDS[0]);
    say('  ⭐ WHAT THE HOST ACTUALLY BUILT, printed off its own objects and not off the strings passed in:');
    say(`     off the switch: SurfZoneConfig ${JSON.stringify(off.config)}  ->  RideSession options ${JSON.stringify(off.built)}`);
    say(`     on  the switch: SurfZoneConfig ${JSON.stringify(on.config)}  ->  RideSession options ${JSON.stringify(on.built)}`);
    say();
  }
  say('  ⭐ THE CLAMP, every live tick of every cell. `ask` is the stop\'s REQUESTED peak torque, `got` what it');
  say('  DELIVERED, `removed` the peak of `ask − got`. Off the switch `got` must equal `ask` on EVERY tick.');
  say();
  const w = [8, 10, 8, 7, 9, 9, 9, 9, 9, 8, 9];
  say(row(['arm', 'stance', 'steer', 'ticks', 'past R', 'ask N·m', 'got N·m', 'removed', 'bound', 'slip %', 'max tw °'], w));
  let hadPast = 0;
  let leaks = 0;
  let overBound = 0;
  for (const arm of ARMS) for (const stance of STANCES) for (const steer of STEERS) for (const speed of SPEEDS) {
    const r = run(arm, stance, steer, speed);
    const s = summary(r);
    for (const k of r.ticks) {
      if (arm === 'off' && k.got !== k.ask) leaks += 1;
      if (arm !== 'off' && k.got > k.bound + 1e-9) overBound += 1;
    }
    if (s.past > 0) hadPast += 1;
    say(row([arm, stance, String(steer), String(s.n), String(s.past), s.askPeak, s.gotPeak, s.removedPeak,
      s.boundMed, 100 * s.slipFrac, s.maxTwist], w));
  }
  say();
  say(`  CONTROL, the switch off is inert: ticks where \`got\` differs from \`ask\` off the switch = ${leaks}`
    + `${leaks === 0 ? ' — none, as the gate requires.' : ' — THE GATE LEAKS.'}`);
  say(`  CONTROL, nothing is delivered past the bound on the switch: ticks with \`got\` > \`bound\` = ${overBound}`
    + `${overBound === 0 ? ' — none.' : ' — THE CLAMP DOES NOT HOLD.'}`);
  say(`  ⛔ CELLS THAT REACHED THE STOP AT ALL: ${hadPast} of ${ARMS.length * STANCES.length * STEERS.length * SPEEDS.length}.`
    + `${hadPast === 0 ? '  NONE — so this mode says NOTHING about the stop and is INCONCLUSIVE.' : ''}`);
  say();
  say('  ⭐ WHAT IT DOES, AT NEUTRAL AND THROUGH A STEER. `drawn` is `AttachedRider.drawnTwist`, the rig\'s own');
  say('  quantity — the one the torso is posed from, so a moved `drawn` is a rider that LOOKS different.');
  say();
  const w2 = [8, 10, 7, 9, 10, 10, 9, 10, 9, 9, 9];
  say(row(['stance', 'steer', 'arm', 'fell s', 'work J', 'max tw °', 'end tw °', 'max drawn °', 'bank °', 'swing °', 'climb m'], w2));
  for (const stance of STANCES) for (const steer of STEERS) for (const speed of SPEEDS) {
    for (const arm of ARMS) {
      const r = run(arm, stance, steer, speed);
      const s = summary(r);
      say(row([arm === ARMS[0] ? stance : '', arm === ARMS[0] ? String(steer) : '', arm,
        r.fellAt === null ? 'live' : f(r.fellAt, 3), s.work, s.maxTwist, s.endTwist, s.maxDrawn, s.maxBank, s.swing, s.climb], w2));
    }
  }
  say();
  say('  ⚠️ `bank`, `swing` and `climb` here are this run\'s own peak body lean, net heading change and net surface');
  say('  rise — NOT the ride analyzer\'s bottom-turn columns, which need a wave frame this analytic face has not got.');
}

process.stdout.write(`${out.join('\n')}\n`);
