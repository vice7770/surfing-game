/**
 * **One ride process of the stability benchmark** (`docs/research/stability/README.md`; `npm run report:stability` runs it).
 *
 * READ ONLY. Nothing here writes into the game's state: the drives send the game's own inputs, and the rows read the
 * session after each step. The drives are 3.5z's probe's (`docs/research/new-rider/3.5/take-off-stall.ts`) verbatim, its
 * instruments dropped:
 *
 *  * `MODE=tw` — the test wave (`TW=catch|ride`) on the game's own `SurfZoneRunner`, as the probe's catch mode drives it:
 *    the recorded sea restored, the rider placed on the first step (`TEST_WAVE_STARTS`), the cue read from the runner's
 *    status, the pop on its first frame. One ride per process.
 *  * `MODE=organic` — 3.5o–3.5z's organic take-off drive on Canyon B (`SWELL=medium|big`, the Surf screen's sizes through
 *    `physicalSettingsFor`), `SEED`, `PERIODS`: a rider placed prone at the lineup for every wave the probe detects, per
 *    script in `SCRIPTS`. Riders read the water and never push it.
 *
 * Scripts: `<stance>:<steer>` with stance `none|crouch|compress|snap` (held at 1 from `C_AT` = 0.2 s after the stand) and
 * steer `straight|left|right` (±1, +1 the board's left, from `TURN_AT` = 1.0 s for `TURN_FOR` = 1.0 s); `hisway` (3.5z's
 * `cueCTv`: Compress from `C_AT`, the trim at +1 from the stand, released from the step after the first standing frame
 * with vW ≥ `TRIM_SPEED` = 4.4 m/s); `twin` (never pops: the probe's `paddle` on the test wave and `never` on the Canyon).
 *
 * One change to the organic drive: a rider that has stood is not dropped at the trial's `TRIAL` s; it rides to its hold.
 *
 * Rows (JSON lines to `OUT`): `control`, `built` (the requested switches as the config built them, the predictor's
 * weights), `stand`, `f` (each frame from the stand while attached, and the first frame off), `tw` (the twin's speed through
 * the water each frame), `summary`, `done`.
 *
 *   ./node_modules/.bin/rolldown scripts/stability-ride.ts -o dist/scripts/stability-ride.mjs --format esm --platform node
 *   env MODE=tw TW=catch SCRIPT=compress:left EXTRA='&cueLater=on&plantFloor=6' OUT=<f> node --max-old-space-size=3200 dist/scripts/stability-ride.mjs
 *   env MODE=organic SWELL=medium SEED=1 PERIODS=12 SCRIPTS=hisway EXTRA=… OUT=<f> node --max-old-space-size=3200 dist/scripts/stability-ride.mjs
 */
import './stability-location';
import { appendFileSync, writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { surfZoneConfigFor } from '../src/game/PhysicalMode';
import { physicalSettingsFor } from '../src/game/SurfConditions';
import { TEST_WAVE_STARTS, testWaveOverrides } from '../src/game/testWave';
import { AttachedRider } from '../src/physics/AttachedRider';
import type { BoardBody } from '../src/physics/BoardBody';
import { PhysicalSurfWater } from '../src/physics/PhysicalSurfWater';
import { RideSession, type RiderPlacement } from '../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../src/physics/SurfWater';
import { inTakeOffWindow, playerCue, speedThroughWater } from '../src/physics/takeOffCue';
import { WaveFrameGauge, type WaveFrame } from '../src/physics/waveFrame';
import { SURF_ZONE_STEP, SurfZoneRunner, type RideRequest } from '../src/wave/SurfZoneRunner';
import { SurfZoneSimulation, rideLineupAlong, rideLineupOffset, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { TEST_WAVE, type TestWaveMode } from '../src/wave/testWave';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const G = 9.81;
const OWNER = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const MODE = process.env.MODE ?? 'tw';
const EXTRA = process.env.EXTRA ?? '&cueLater=on&plantFloor=6';
const C_AT = Number(process.env.C_AT ?? 0.2);
const TURN_AT = Number(process.env.TURN_AT ?? 1.0);
const TURN_FOR = Number(process.env.TURN_FOR ?? 1.0);
const HOLD = Number(process.env.HOLD ?? 5);
const TRIM_SPEED = Number(process.env.TRIM_SPEED ?? 4.4);
const OUT = process.env.OUT;
if (OUT) writeFileSync(OUT, '');
const r = (x: number | undefined | null, n = 4): number | null => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};

// ---------------------------------------------------------------------------------------------------------------
// The scripts.
// ---------------------------------------------------------------------------------------------------------------
type Stance = 'none' | 'crouch' | 'compress' | 'snap';
interface Script { name: string; stance: Stance; steer: number; trim: 'none' | 'release'; twin: boolean }
function parseScript(name: string): Script {
  if (name === 'twin') return { name, stance: 'none', steer: 0, trim: 'none', twin: true };
  if (name === 'hisway') return { name, stance: 'compress', steer: 0, trim: 'release', twin: false };
  const [stance, way] = name.split(':');
  if (!['none', 'crouch', 'compress', 'snap'].includes(stance)) throw new Error(`unknown stance in ${name}`);
  const steer = way === 'straight' ? 0 : way === 'left' ? 1 : way === 'right' ? -1 : Number.NaN;
  if (!Number.isFinite(steer)) throw new Error(`unknown steer in ${name}`);
  return { name, stance: stance as Stance, steer, trim: 'none', twin: false };
}
/** The stance and steer fields a script sends now (only nonzero ones, as the probes send them). */
function stanceInput(script: Script, standing: boolean, since: number, held = standing): Record<string, number> {
  const out: Record<string, number> = {};
  if (script.stance !== 'none' && held && since >= C_AT) out[script.stance] = 1;
  if (script.steer !== 0 && standing && since >= TURN_AT && since < TURN_AT + TURN_FOR) out.steer = script.steer;
  return out;
}
/** 3.5z's `cueCTv` trim (`take-off-stall.ts` `trimOf`), verbatim for that script. */
const vSample = createWaterSample();
const released = new WeakSet<object>();
function trimOf(script: Script, standing: boolean, since: number, session: RideSession, water: SurfWater): number {
  if (!standing || since < 0 || script.trim !== 'release') return 0;
  if (released.has(session)) return 0;
  if (speedThroughWater(session.board, water, vSample) >= TRIM_SPEED) { released.add(session); return 0; }
  return 1;
}

// ---------------------------------------------------------------------------------------------------------------
// The read-only rows.
// ---------------------------------------------------------------------------------------------------------------
/** M2: substeps whose coupled contact was infeasible (`settleStanding` false), per rider, read through a wrapper. */
const infeasible = new Map<AttachedRider, number>();
{
  const AR = AttachedRider.prototype as Any;
  const settleStanding = AR.settleStanding;
  AR.settleStanding = function (this: AttachedRider, ...a: unknown[]): boolean {
    const ok = settleStanding.apply(this, a) as boolean;
    if (!ok) infeasible.set(this, (infeasible.get(this) ?? 0) + 1);
    return ok;
  };
}
const sample = createWaterSample();
function vThrough(board: BoardBody, water: SurfWater): { vW: number; ux: number; uz: number } {
  const under = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
  const flowX = under.outsideDomain ? 0 : under.flowX;
  const flowZ = under.outsideDomain ? 0 : under.flowZ;
  const ux = board.velocity.x - flowX;
  const uz = board.velocity.z - flowZ;
  return { vW: Math.hypot(ux, uz), ux, uz };
}
function frameRow(session: RideSession, water: SurfWater, input: Record<string, unknown>): Record<string, unknown> {
  const board = session.board;
  const rd = session.rider as Any;
  const { vW, ux, uz } = vThrough(board, water);
  const W = (board.mass + rd.mass) * G;
  const u = Math.hypot(ux, uz);
  const froth = u > 1e-6 ? ((board.forces as Any).froth.x * ux + (board.forces as Any).froth.z * uz) / u / W : 0;
  const out: Record<string, unknown> = {
    ph: session.phase, at: rd.attached ? 1 : 0, vW: r(vW, 3), vG: r(Math.hypot(board.velocity.x, board.velocity.z), 3),
    crs: r(Math.atan2(board.velocity.x, board.velocity.z) * DEG, 3), yaw: r(board.angularVelocity.y * DEG, 3), fr: r(froth, 4),
    st: input.steer ?? 0, tr: input.trim ?? 0, sc: input.crouch ?? input.compress ?? input.snap ?? 0,
  };
  if (rd.attached && session.phase === 'standing') {
    const lim = rd.balanceLimits;
    const sup = rd.support as { xMin: number; xMax: number; zMin: number; zMax: number };
    const s = rd.human.state;
    const midX = (sup.xMin + sup.xMax) / 2;
    const midZ = (sup.zMin + sup.zMax) / 2;
    const headX = 1 - Math.abs(rd.desiredCop.x - midX) / ((sup.xMax - sup.xMin) / 2);
    const pastZ = Math.max(0, s.along - (sup.zMax - midZ), -s.along - (midZ - sup.zMin));
    const m2 = infeasible.get(session.rider) ?? 0;
    Object.assign(out, {
      res: r(rd.balanceReserve, 5), mg: r(lim.margin, 4), gr: r(lim.grip, 4), kn: r(lim.knee, 4), lim: lim.limit,
      m1: headX <= 0 ? 1 : 0, m2: m2 > 0 ? 1 : 0, m3: s.beyond ? 1 : 0, mf: pastZ > 0 ? 1 : 0,
    });
  }
  infeasible.set(session.rider, 0);
  return out;
}
/** The switches the address asks for, as the config built them (`canyonWaves=true` is `canyonBed: 'b'`). */
function printedSwitches(search: string, config: Record<string, unknown>): Record<string, { asked: string; built: string | null }> {
  const out: Record<string, { asked: string; built: string | null }> = {};
  for (const [k, v] of new URLSearchParams(search)) {
    const built = k === 'canyonWaves' ? (config.canyonBed === 'b' ? 'true' : String(config.canyonBed ?? null)) : config[k] === undefined || config[k] === null ? null : String(config[k]);
    out[k] = { asked: v, built };
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=tw: the test wave, one ride per process (3.5z's catch mode).
// ---------------------------------------------------------------------------------------------------------------
function testWaveMode(): void {
  const TW = (process.env.TW ?? 'catch') as TestWaveMode;
  const script = parseScript(process.env.SCRIPT ?? 'none:straight');
  const SECONDS = Number(process.env.SECONDS ?? (TW === 'catch' ? 12 : 8));
  const search = `${OWNER}&testWave=${TW}${EXTRA}`;
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = { ...physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' }), tide: 0, windSpeed: 0 };
  const config = surfZoneConfigFor(settings, TEST_WAVE.seed, false, testWaveOverrides(TW, undefined)) as SurfZoneConfig & Record<string, unknown>;
  const wall = Date.now();
  const runner = new SurfZoneRunner(config, { rider: true });
  const { simulation } = runner;
  const start = simulation.exportState();
  const session = runner.session!;
  emit({ kind: 'control', mode: 'tw', tw: TW, script: script.name, search, seaTime: simulation.seaTime, spinUp: (Date.now() - wall) / 1000, cAt: C_AT, turnAt: TURN_AT, turnFor: TURN_FOR, hold: HOLD, trimSpeed: TRIM_SPEED });
  emit({ kind: 'built', switches: printedSwitches(search, config) });
  simulation.importState(start);
  runner.invalidateTubeApproach();
  const placement: RiderPlacement = TEST_WAVE_STARTS[TW].placement;
  const seaAt0 = simulation.seaTime;
  let cueAt = Number.NaN, standAt = Number.NaN, fellAt = Number.NaN, passedAt = Number.NaN;
  let popped = false;
  let weights = false;
  const total = Math.round(SECONDS / SURF_ZONE_STEP);
  for (let step = 0; step < total; step += 1) {
    const t = (step + 1) * SURF_ZONE_STEP;
    const st0 = runner.status().ride;
    const lying = st0 ? st0.phase === 'prone' : true;
    const cue = st0?.cue ?? false;
    if (TW === 'catch' && lying && cue && Number.isNaN(cueAt) && step > 0) cueAt = t - SURF_ZONE_STEP;
    const popUp = TW === 'catch' && !script.twin && !popped && !Number.isNaN(cueAt);
    if (popUp) popped = true;
    const since = Number.isNaN(standAt) ? -1 : t - standAt;
    const standing = session.phase === 'standing';
    // The probe's catch mode holds the stance from C_AT after the stand whatever the phase; the steer needs 'standing'.
    const stance = stanceInput(script, standing, since, !Number.isNaN(standAt));
    const trim = trimOf(script, standing, since, session, runner.water);
    const steer = stance.steer ?? 0;
    delete stance.steer;
    const request: RideRequest = {
      paddle: TW === 'catch' && lying && !popped, popUp, steer, retry: false, ...stance, ...(trim ? { trim } : {}),
      ...(step === 0 ? { place: placement } : {}),
    };
    runner.advance(1, request);
    const st = runner.status().ride!;
    if (st.phase === 'standing' && Number.isNaN(standAt)) {
      standAt = t;
      emit({ kind: 'stand', t: r(t), sea: r(seaAt0 + t), refusal: (session.rider as Any).popUpReport.refusal ?? null });
    }
    if (!weights && st.phase === 'standing') {
      weights = true;
      const w = (session.rider as Any).predictor?.weights;
      emit({ kind: 'weights', plantFloor: w?.plantFloor ?? null, plantSpeed: w?.plantSpeed ?? null, weights: w ?? null });
    }
    if (st.phase === 'fallen' && Number.isNaN(fellAt)) fellAt = t;
    const wf = st.wave;
    if (script.twin) {
      if (Number.isNaN(passedAt) && !Number.isNaN(cueAt) && wf.valid && wf.aheadOfCrest < -1.5) passedAt = t;
      if (session.rider.attached) emit({ kind: 'tw', t: r(t), ph: session.phase, vW: r(vThrough(session.board, runner.water).vW, 3) });
      if (!Number.isNaN(passedAt) && t > passedAt + 1) break;
      continue;
    }
    if (!Number.isNaN(standAt) && (session.rider.attached || !Number.isNaN(fellAt))) {
      emit({ kind: 'f', t: r(t), tS: r(t - standAt), ...frameRow(session, runner.water, request as unknown as Record<string, unknown>) });
    }
    if (!Number.isNaN(fellAt)) break;
    if (!Number.isNaN(standAt) && t - standAt >= HOLD) break;
  }
  emit({
    kind: 'summary', mode: 'tw', tw: TW, script: script.name, cue: r(cueAt), stand: r(standAt), standSea: Number.isNaN(standAt) ? null : r(seaAt0 + standAt), fell: r(fellAt),
    fellAfterStand: !Number.isNaN(fellAt) && !Number.isNaN(standAt) ? r(fellAt - standAt) : null, cause: runner.status().ride?.separation ?? null,
  });
  emit({ kind: 'done', seconds: (Date.now() - wall) / 1000 });
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=organic: 3.5z's organic drive (`take-off-stall.ts` `organicMode`), its instruments dropped.
// ---------------------------------------------------------------------------------------------------------------
const RIDER_KEYS = [
  'stroke', 'swim', 'extension', 'duckBody', 'snap', 'snapQuick', 'snapPivot', 'snapRecentre', 'snapDepth', 'snapStamp',
  'agile', 'legDrive', 'hull', 'railSuction', 'compressPull', 'carveFlex', 'snapLegs', 'snapCross', 'legPower', 'rider',
  'feltFrame', 'kneeRoom', 'stanceReach', 'ankleLimit', 'ankleRange', 'bankClamp', 'bodyBank', 'askCap', 'stanceDeep',
  'deepen', 'armCarry', 'trunk', 'buoyFrame', 'waterHeel', 'mountAgree', 'riderBody', 'riderCost', 'plantFloor', 'plantSpeed',
  'deckHollow', 'snapUpturn', 'swing', 'faceTrim', 'holdLine', 'slowStand', 'leanPace', 'turnGains',
] as const;
function organicMode(): void {
  const SEED = Number(process.env.SEED ?? 1);
  const PERIODS = Number(process.env.PERIODS ?? 12);
  const SWELL = (process.env.SWELL ?? 'medium') as 'medium' | 'big';
  const TRIAL = Number(process.env.TRIAL ?? 20);
  const SPRINT = 2;
  const CREST_PROBE = 36;
  const SCRIPTS = (process.env.SCRIPTS ?? 'hisway').split(',').filter(Boolean).map(parseScript);
  const search = `${OWNER}${EXTRA}`;
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = physicalSettingsFor('canyon', { swell: SWELL, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const config = { ...surfZoneConfigFor(settings, SEED, true), compute: 'cpu' } as SurfZoneConfig & Record<string, unknown>;
  const opts: Record<string, unknown> = {};
  for (const key of RIDER_KEYS) if (config[key] !== undefined) opts[key] = config[key];
  const wall = Date.now();
  const sim = new SurfZoneSimulation(config);
  const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
  const water: SurfWater = {
    sampleAt: (x, y, z, o) => physical.sampleAt(x, y, z, o), surfaceAt: (x, z) => physical.surfaceAt(x, z),
    addReaction: () => {}, setSampleTime: (offset: number) => physical.setSampleTime(offset),
  };
  const focus = sim.breakPoint();
  const startX = focus.x + rideLineupAlong(config);
  const startZ = focus.z - rideLineupOffset(config);
  const CUE_LATER = config.cueLater === 'on';
  const cueSample = createWaterSample();
  emit({ kind: 'control', mode: 'organic', swell: SWELL, hs: config.significantHeight, tp: config.peakPeriod, seed: SEED, periods: PERIODS, scripts: SCRIPTS.map((s) => s.name), search, riderOptions: opts, cAt: C_AT, turnAt: TURN_AT, turnFor: TURN_FOR, hold: HOLD, trimSpeed: TRIM_SPEED, spinUp: (Date.now() - wall) / 1000 });
  emit({ kind: 'built', switches: printedSwitches(search, config) });
  interface Rider {
    script: Script; session: RideSession; gauge: WaveFrameGauge; sprinting: boolean; seenBehind: boolean;
    cueAt?: number; todayAt?: number; popAt?: number; standAt?: number; fellAt?: number; cause?: string; passedAt?: number; arrival?: number; done: boolean;
  }
  interface Trial { placed: number; riders: Rider[]; index: number }
  const trials: Trial[] = [];
  const active: Trial[] = [];
  const direction = (config.directionDegrees * Math.PI) / 180;
  const place = (index: number): Trial => {
    const trial: Trial = { placed: sim.solver.time, index, riders: [] };
    for (const script of SCRIPTS) {
      const session = new RideSession(opts as ConstructorParameters<typeof RideSession>[0]);
      session.place({ x: startX, z: startZ, heading: 0, speed: 0, phase: 'prone' }, water);
      trial.riders.push({ script, session, gauge: new WaveFrameGauge({ directionX: Math.sin(direction), directionZ: Math.cos(direction) }), sprinting: false, seenBehind: false, done: false });
    }
    return trial;
  };
  let weights = false;
  const stepRider = (rider: Rider, t: number, trial: Trial): void => {
    const { session } = rider;
    const board = session.board;
    const frame: WaveFrame = rider.gauge.update(water, board.centerOfMass, board.velocity, STEP, 55);
    if (frame.valid && frame.aheadOfCrest > 3 && frame.crestSpeed > 2) rider.seenBehind = true;
    const closing = frame.crestSpeed - frame.speedShoreward;
    const toCrest = rider.seenBehind && frame.valid && frame.aheadOfCrest > 0 && closing > 0.5 ? frame.aheadOfCrest / closing : Number.POSITIVE_INFINITY;
    const prone = session.phase === 'prone';
    if (rider.arrival === undefined && rider.seenBehind && frame.valid && frame.aheadOfCrest <= 0.5 && frame.crestSpeed > 2) rider.arrival = t;
    const today = prone && (session.rider.popUpCue || inTakeOffWindow(frame));
    const cue = prone && playerCue(today, today && CUE_LATER ? speedThroughWater(board, water, cueSample) : 0, CUE_LATER);
    if (cue && rider.cueAt === undefined) rider.cueAt = t;
    if (today && rider.todayAt === undefined) rider.todayAt = t;
    let pop = false;
    if (prone && rider.popAt === undefined && rider.seenBehind) {
      if (!rider.sprinting && toCrest <= SPRINT) rider.sprinting = true;
      if (cue && !rider.script.twin) pop = true;
    }
    if (pop) rider.popAt = t;
    const since = rider.standAt === undefined ? -1 : t - rider.standAt;
    const standing = session.phase === 'standing';
    const stance = stanceInput(rider.script, standing, since);
    const steer = stance.steer ?? 0;
    delete stance.steer;
    const trim = trimOf(rider.script, standing, since, session, water);
    const input = { paddle: prone && !pop && rider.popAt === undefined, sprint: prone && rider.sprinting && !pop, popUp: pop, steer, ...stance, ...(trim ? { trim } : {}) };
    session.step(STEP, water, input);
    if (session.phase === 'standing' && rider.standAt === undefined) {
      rider.standAt = t;
      emit({ kind: 'stand', script: rider.script.name, wave: trial.index, t: r(t), sea: r(trial.placed + t), refusal: (session.rider as Any).popUpReport.refusal ?? null });
      if (!weights) {
        weights = true;
        const w = (session.rider as Any).predictor?.weights;
        emit({ kind: 'weights', plantFloor: w?.plantFloor ?? null, plantSpeed: w?.plantSpeed ?? null, weights: w ?? null });
      }
    }
    const attached = session.rider.attached;
    if (rider.script.twin) {
      if (attached && rider.todayAt !== undefined && t >= rider.todayAt - 0.5) emit({ kind: 'tw', wave: trial.index, t: r(t), ph: session.phase, vW: r(vThrough(board, water).vW, 3) });
    } else if (rider.standAt !== undefined && (attached || rider.fellAt === undefined)) {
      emit({ kind: 'f', script: rider.script.name, wave: trial.index, t: r(t), tS: r(t - rider.standAt), ...frameRow(session, water, input as unknown as Record<string, unknown>) });
    }
    if (!attached && rider.fellAt === undefined) { rider.fellAt = t; rider.cause = session.separation ?? '?'; rider.done = true; }
    if (rider.passedAt === undefined && rider.arrival !== undefined && frame.valid && frame.aheadOfCrest < -1.5 && session.phase !== 'standing') rider.passedAt = t;
    if (rider.standAt !== undefined && t - rider.standAt >= HOLD) rider.done = true;
    if (rider.passedAt !== undefined && t > rider.passedAt + 1) rider.done = true;
    if (rider.popAt === undefined && rider.standAt === undefined && t > TRIAL - 1) rider.done = true;
    if (rider.popAt !== undefined && rider.standAt === undefined && session.phase === 'prone' && t > rider.popAt + 3) rider.done = true;
  };
  const probeZ = startZ - CREST_PROBE;
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
      for (const rider of trial.riders) if (!rider.done) stepRider(rider, t - trial.placed, trial);
      // The probes drop the whole trial at TRIAL s after placing it, which cut a late stand short of its hold. Here a
      // rider that has not stood is dropped then exactly as before (so no rider stands that did not stand in the probes),
      // and a rider that stood rides on to its hold or its fall.
      if (t - trial.placed >= TRIAL) for (const rider of trial.riders) if (rider.standAt === undefined) rider.done = true;
      if (trial.riders.every((rider) => rider.done)) active.splice(k, 1);
    }
  }
  for (const trial of trials) for (const rider of trial.riders) {
    emit({
      kind: 'summary', mode: 'organic', swell: SWELL, seed: SEED, script: rider.script.name, wave: trial.index, placed: r(trial.placed), cue: r(rider.cueAt), pop: r(rider.popAt), stand: r(rider.standAt),
      standSea: rider.standAt === undefined ? null : r(trial.placed + rider.standAt), fell: r(rider.fellAt),
      fellAfterStand: rider.fellAt !== undefined && rider.standAt !== undefined ? r(rider.fellAt - rider.standAt) : null, cause: rider.cause ?? null,
    });
  }
  emit({ kind: 'done', waves, seconds: (Date.now() - wall) / 1000 });
}

void Vector3;
if (MODE === 'tw') testWaveMode();
else if (MODE === 'organic') organicMode();
else throw new Error(`unknown MODE ${MODE}`);
