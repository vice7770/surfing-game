/**
 * **Step 3.5i: is the body's 0.100 s lag behind the deck reachable by a feed-forward on the player's own command —
 * and is it reachable at all?**
 *
 * `3.5/body-banks.md` (PR #421) found that the body already banks with the deck (slope 0.8748) and that what it is
 * instead is **late**: the follow gain reaches 1.000 at six frames = 0.100 s, and on the analytic face the mismatch is
 * the deck's roll rate times 73–104 ms. Its own named next step was `HUMAN_BANK_FORWARD`, *"already that term, at 0.1
 * rad of rest per rad asked"*. This probe measures that claim instead of trusting it.
 *
 * ## ⚠️ What the code says before anything is run, because it decides what a sweep can mean
 *
 * `HUMAN_BANK_FORWARD` is read in exactly one place [R, `AttachedRider.ts:2526`, `:3609`]:
 *
 *     this.bankForward = options.humanGains?.forward ?? HUMAN_BANK_FORWARD;              // :2526
 *     const wanted = this.bankForward * this.bankReference - this.bankGain * bank
 *                  - this.bankRateGain * human.sensedBankRate() - this.anklePlumb * roll; // :3609, humanBank
 *
 * and `humanBank`'s own first lines hand every frame to `predictiveBank` when `this.predictive` [R, `:3600`], with
 *
 *     this.predictive = this.newRider && options.humanGains === undefined;                // :2527
 *
 * **So on `?rider=new` with no `humanGains` — which is the owner's address, and there is no URL switch that sets
 * `humanGains` at all — the line that reads `bankForward` never runs.** `predictiveBank` does not mention it: its
 * feed-forward is `ref.u[0]`, the steady-turn command `steadyTurn` solves for the lean asked [R,
 * `predictiveBalance.ts:1592–1608`]. Passing `humanGains` to sweep the constant therefore **also flips the whole
 * controller** from the predictor to step 3.2's delayed reflex law. Both are measured here and neither is passed off
 * as the other.
 *
 * ## The arms
 *
 * One process, one sea, one spin-up; an arm is a constructor option on the rider and nothing else.
 * - `ships` — `rider: 'new'` with no `humanGains`: the predictive controller, the owner's own rider.
 * - `gX` — `humanGains: { bank: 0, bankRate: 0.1, forward: X }`: the reflex law of step 3.2 at that feed-forward.
 *   `g0.1` is that law at the shipped constant, so `ships` vs `g0.1` is the controller flip with the lever held, and
 *   `g0.1` vs `g2` is the lever with the controller held.
 * The constant itself is swept by rebuilding this bundle against an edited `humanBalance.ts`; the head row prints the
 * compiled `HUMAN_BANK_FORWARD`, `HUMAN_BANK_GAIN`, `HUMAN_BANK_RATE_GAIN`, `BALANCE_DELAY` and `PREDICT_DELAY`, so
 * every run states which constants it carries and a rebuild that did not take is visible rather than assumed.
 *
 * ## The bench
 *
 * `MODE=sea` — the Canyon as `?canyonWaves=true` builds it (`canyonBed: 'b'`, seed 1, medium, stage 2, CPU), 90
 * riders per arm = 10 entry speeds × 3 stances × 3 trials, placed `AHEAD` m seaward of the break point at `SIDE`°
 * off the fall line, **stick hard over**, each stance held. `MODE=face` — the Canyon-matched `FaceWater`
 * (1.4 m / 16° / 5.7 m/s by default), 3 slopes × 4 entries × 3 stances × 2 sticks = 72 riders per arm.
 *
 * ⚠️ **`SINK` is 0.06 m in every arm** (memory and `3.5/body-banks.md` §2): the flush placement this track uses
 * starts the hull dry and the leg unloaded, and the probe prints frame 1's own draft and leg load per arm so that is
 * a column rather than a claim.
 *
 * ⚠️ **Every run is cut at its first `attached == 0`**: `AttachedRider.separate` [R, `:5227–5232`] never clears
 * `phase` or `upright`, so every rider column freezes after separation. The cut frame is counted and printed.
 *
 * Read-only: nothing under `src/` is touched by this file, no ledger is turned on, and the private fields it reads
 * (`limit`, `limitTime`, `desiredCop`, `legLoad`, `rawMargin`, `ankleRest`, `swingTorque`, `bankReference`,
 * `leanAsked`, `support`) are read through one cast that only gets.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/forward.ts -o <scratch>/fw.mjs --format esm --platform node
 *   MODE=face ARMS=ships OUT=<scratch>/face-ships.jsonl node <scratch>/fw.mjs
 *   MODE=sea  ARMS=ships,g0.1,g2 OUT=<scratch>/sea.jsonl node -e "globalThis.location={search:'?canyonWaves=true'};await import('<scratch>/fw.mjs')"
 *
 * Env: `MODE=sea|face`, `ARMS`, `SINK`, `AHEAD`, `SIDE`, `SEED`, `SIZE`, `TRIALS`, `GAP`, `ENTRIES`, `STANCES`,
 * `STEERS`, `SECONDS`, `FACE`, `SLOPES`, `DEPTH`, `OUT`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { BALANCE_DELAY, HUMAN_BANK_FORWARD, HUMAN_BANK_GAIN, HUMAN_BANK_RATE_GAIN } from '../../../../src/physics/humanBalance';
import { PREDICT_DELAY, railPull } from '../../../../src/physics/predictiveBalance';
import { deckHeight } from '../../../../src/physics/riderPosture';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const MODE = (process.env.MODE ?? 'face') as 'sea' | 'face';
const SEED = Number(process.env.SEED ?? 1);
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const TRIALS = Number(process.env.TRIALS ?? 3);
const GAP = Number(process.env.GAP ?? 1.5);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
/** ⚠️ The placement's sink, m: the hull is put this far UNDER flush along the water's normal. Never 0 (see the header). */
const SINK = Number(process.env.SINK ?? 0.06);
const SECONDS = Number(process.env.SECONDS ?? 4);
const PERIODS = Number(process.env.PERIODS ?? 6);
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];
const ENTRIES = (process.env.ENTRIES ?? (MODE === 'sea' ? '3,4,5,6,7,8,9,10,11,12' : '4,6,8,10')).split(',').map(Number);
const STEERS = (process.env.STEERS ?? (MODE === 'sea' ? '1' : '0,1')).split(',').map(Number);
const ARMS = (process.env.ARMS ?? 'ships').split(',');
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const SLOPES = (process.env.SLOPES ?? (MODE === 'face' ? '12,16,20' : String(FACE[1]))).split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const OUT = process.env.OUT;
/**
 * `INERT=1`: **the probe's own inertness control.** Every extra read this file makes — the private columns, the
 * per-patch draft sweep, the second water sample — is skipped, and only the run's own outcome is emitted. If the
 * reads were changing the solve, the 72 face runs' `(frames, fellAt, cause)` would differ between the two.
 */
const INERT = process.env.INERT === '1';

type Stance = 'tall' | 'crouch' | 'compress';

const r = (v: number, n = 4): number | null => (Number.isFinite(v) ? Number(v.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};

/** The one cast that reads the rider's private columns, and only gets. */
interface Inner {
  limit: string;
  limitTime: Record<string, number>;
  desiredCop: { x: number; z: number };
  legLoad: number;
  rawMargin: number;
  ankleRest: number;
  /** The body's own pendulum length: the leg's height plus its extension, m, the datum the ankle spring acts on. */
  legLength: number;
  swingTorque: number;
  bankReference: number;
  leanAsked: number;
  freeBody: boolean;
  predictive: boolean;
  bankForward: number;
  support: { xMin: number; xMax: number; zMin: number; zMax: number };
  /** The schedule's own rail — the rail that holds the lean asked for (`predictiveBank`, step 3.2f). */
  schedRail: number;
  swing: { angle: number; rate: number };
  rollAxis: Vector3;
}

/** An arm: `ships` is the predictive controller, `gX` step 3.2's reflex law at feed-forward X. */
function optionsFor(arm: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    phase: 'standing', rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on',
  };
  if (arm === 'ships') return base;
  const forward = Number(arm.slice(1));
  if (!Number.isFinite(forward)) throw new Error(`arm ${arm}: expected 'ships' or 'g<number>'`);
  return { ...base, humanGains: { bank: HUMAN_BANK_GAIN, bankRate: HUMAN_BANK_RATE_GAIN, forward } };
}

interface Rider {
  arm: string; trial: number; stance: Stance; entry: number; steer: number; slope: number;
  board: BoardBody; rider: AttachedRider; inner: Inner; water: SurfWater;
  frame: number; done: boolean; fellAt: number | null; cause: string;
  lastTip: number; lastSlip: number; lastFlight: number; lastImpact: number;
  lastRoll: number | null;
}

const live: Rider[] = [];
const scratch = createWaterSample();
const fwd = new Vector3();
const sideV = new Vector3();
const boardUp = new Vector3();
const nW = new Vector3();
const localP = new Vector3();

function build(arm: string, trial: number, stance: Stance, entry: number, steer: number, slope: number,
  water: SurfWater, pos: Vector3, q: Quaternion, vel: Vector3): Rider {
  const board = new BoardBody();
  board.place(pos, q, vel);
  const rd = new AttachedRider(board.shape, optionsFor(arm) as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rd);
  rd.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rd.compress = stance === 'compress' ? 1 : 0;
  rd.steer = steer;
  return {
    arm, trial, stance, entry, steer, slope, board, rider: rd, inner: rd as unknown as Inner, water,
    frame: 0, done: false, fellAt: null, cause: '', lastTip: 0, lastSlip: 0, lastFlight: 0, lastImpact: 0, lastRoll: null,
  };
}

function stepRider(e: Rider): void {
  const { board, rider, water, inner } = e;
  e.frame += 1;
  board.step(STEP, water);
  if (INERT) {
    emit({
      kind: 'f', arm: e.arm, trial: e.trial, stance: e.stance, entry: e.entry, steer: e.steer, slope: e.slope,
      frame: e.frame, t: r(e.frame * STEP, 4),
      attached: rider.attached ? 1 : 0, upright: rider.upright ? 1 : 0, phase: rider.phase,
    });
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
      e.done = true;
      e.fellAt = e.frame * STEP;
      e.cause = !rider.attached ? 'detached' : !rider.upright ? 'down' : rider.phase;
    }
    if (e.frame >= Math.round(SECONDS / STEP)) e.done = true;
    return;
  }
  fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  sideV.set(fwd.z, 0, -fwd.x);
  boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
  // The deck's own roll from the world's level about the heading's side axis: `prepareBank`'s own `roll`.
  const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;
  const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, scratch);
  nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
  const tilt = Math.atan2(nW.dot(sideV), nW.y) * DEG;
  // The body's height over the deck, the datum the stance's own tolerance is an angle of.
  board.toLocal(rider.position, localP);
  const height = localP.y - deckHeight(board.shape, localP.z);
  const tip = inner.limitTime.tip;
  const slip = inner.limitTime.slip;
  const flight = inner.limitTime.flight;
  const impact = inner.limitTime.impact;
  let draft = -Infinity;
  for (const patch of board.shape.patches) {
    const pw = board.toWorld(patch.position, new Vector3());
    const s = water.sampleAt(pw.x, pw.y, pw.z, scratch);
    if (!s.wet || s.outsideDomain) continue;
    if (s.surfaceY - pw.y > draft) draft = s.surfaceY - pw.y;
  }
  emit({
    kind: 'f', arm: e.arm, trial: e.trial, stance: e.stance, entry: e.entry, steer: e.steer, slope: e.slope,
    frame: e.frame, t: r(e.frame * STEP, 4),
    bank: r(rider.bank.angle * DEG), roll: r(roll), tilt: r(tilt), rail: r(roll - tilt),
    // The deck's roll rate about the balance's own axis, °/s, and the frame-to-frame difference of `roll` itself.
    rollRate: r(inner.rollAxis.dot(board.angularVelocity) * DEG),
    rollDiff: e.lastRoll === null ? null : r((roll - e.lastRoll) / STEP),
    bankRate: r(rider.bank.rate * DEG),
    // The command: the player's own asked lean after the cap (`leanProbe.ask`), the reference the reflex law reads,
    // and the ankle's commanded rest. All three are what a feed-forward would act on.
    ask: r(rider.leanProbe.ask * DEG), cap: r(rider.leanProbe.cap * DEG), want: r(rider.leanProbe.want * DEG),
    ref: r(inner.bankReference * DEG), asked: r(inner.leanAsked * DEG), rest: r(inner.ankleRest * DEG),
    ankle: r(rider.bank.angle * DEG - roll),
    planing: rider.leanProbe.planing,
    // The contact: the bind read off `limitTime` and never off the last substep's `limit`.
    limit: inner.limit, tipNew: tip > e.lastTip ? 1 : 0, slipNew: slip > e.lastSlip ? 1 : 0,
    flightNew: flight > e.lastFlight ? 1 : 0, impactNew: impact > e.lastImpact ? 1 : 0,
    tipT: r(tip, 5), copX: r(inner.desiredCop.x, 5), margin: r(inner.rawMargin, 4),
    load: r(inner.legLoad, 2), height: r(height, 5), draft: Number.isFinite(draft) ? r(draft, 5) : null,
    // The plant's own two numbers, so §5's arithmetic is read off the ride and not assumed: the rider's mass and the
    // pendulum length the ankle spring acts through.
    mass: r(rider.mass, 3), legLen: r(inner.legLength, 5),
    /**
     * **The coordinated turn's own pull**, so §3c can ask whether the body–deck difference is the design's intended
     * deficit rather than a lag. `railPull(speed, rail)` is *"the turn's pull over what the rail's own lean would
     * balance"* [R, `predictiveBalance.ts:335–336`], and `predictiveBank` builds the schedule's rail from it as
     * `tan(lean) = pull × tan(rail)` [R, `:3721–3722`] — so a body leaning LESS than the deck's rail by that factor
     * is the schedule's own steady turn and not a mistake. `pull` is read at the rail the board is actually on,
     * `schedPull` at the rail the schedule asked for, and both at the speed the cap is built on.
     */
    pull: r(railPull(rider.leanProbe.speedThrough, Math.abs((roll - tilt) / DEG)), 5),
    schedRail: r(inner.schedRail * DEG, 4), schedPull: r(railPull(rider.leanProbe.speedThrough, Math.abs(inner.schedRail)), 5),
    xMin: r(inner.support.xMin, 4), xMax: r(inner.support.xMax, 4),
    swingNm: r(inner.swingTorque, 3), swingDeg: r(inner.swing.angle * DEG, 3),
    attached: rider.attached ? 1 : 0, upright: rider.upright ? 1 : 0, phase: rider.phase, subs: board.substepsTaken,
  });
  e.lastTip = tip; e.lastSlip = slip; e.lastFlight = flight; e.lastImpact = impact; e.lastRoll = roll;
  if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
    e.done = true;
    e.fellAt = e.frame * STEP;
    e.cause = !rider.attached ? 'detached' : !rider.upright ? 'down' : rider.phase;
  }
  if (e.frame >= Math.round(SECONDS / STEP)) e.done = true;
}

const wall = Date.now();
emit({
  kind: 'head', mode: MODE, arms: ARMS, sink: SINK, ahead: AHEAD, side: SIDE, seconds: SECONDS,
  stances: STANCES, entries: ENTRIES, steers: STEERS, slopes: SLOPES, face: FACE, depth: DEPTH, seed: SEED, size: SIZE,
  // The compiled constants, so a rebuild that did not take is visible.
  HUMAN_BANK_FORWARD, HUMAN_BANK_GAIN, HUMAN_BANK_RATE_GAIN, BALANCE_DELAY, PREDICT_DELAY,
});

if (MODE === 'face') {
  for (const slope of SLOPES) {
    for (const entry of ENTRIES) {
      for (const stance of STANCES) {
        for (const steer of STEERS) {
          for (const arm of ARMS) {
            const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope, speed: FACE[2] });
            const pz = water.crestZ() + AHEAD * water.front;
            const here = water.sampleAt(0, 50, pz, scratch);
            const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
            const fall = new Vector3(0, 0, 1);
            const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
            const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
            const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
            const left = new Vector3().crossVectors(normal, forward).normalize();
            const board0 = new BoardBody();
            const pos = new Vector3(0, here.surfaceY, pz).addScaledVector(normal, board0.shape.centerOfMass.y - SINK);
            const e = build(arm, 0, stance, entry, steer, slope, water,
              pos, new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
              forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)));
            // Each face rider has its own water, so each is stepped to the end on its own.
            for (let i = 0; i < Math.round(SECONDS / STEP) && !e.done; i += 1) {
              (e.water as FaceWater).advance(STEP);
              stepRider(e);
            }
            emit({
              kind: 'run', arm, trial: 0, stance, entry, steer, slope, frames: e.frame,
              fellAt: e.fellAt === null ? null : r(e.fellAt, 4), cause: e.cause || 'held',
            });
          }
        }
      }
    }
  }
} else {
  const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const base = surfZoneConfigFor(settings, SEED, true);
  const config: SurfZoneConfig = { ...base, compute: 'cpu', canyonBed: 'b' };
  const sim = new SurfZoneSimulation(config);
  const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
  const focus = sim.breakPoint();
  // ⚠️ The Canyon seatbelt, read off the solver rather than assumed: Canyon B is 400 × 451 = 180 400.
  const grid = sim.solver as unknown as { width?: number; height?: number; nx?: number; nz?: number };
  emit({
    kind: 'sea', search: typeof globalThis.location === 'object' ? String((globalThis.location as { search?: string }).search) : 'none',
    gridW: grid.width ?? grid.nx ?? null, gridH: grid.height ?? grid.nz ?? null,
    cells: (grid.width ?? grid.nx ?? 0) * (grid.height ?? grid.nz ?? 0),
    bed: config.canyonBed, compute: config.compute, spinUp: r(sim.solver.time, 2), wallSpinUp: r((Date.now() - wall) / 1000, 1),
    focus: { x: r(focus.x, 2), z: r(focus.z, 2) }, period: r(config.peakPeriod, 3),
  });
  const frames = Math.round((PERIODS * config.peakPeriod) / STEP);
  const water: SurfWater = {
    sampleAt: (x, y, z, out) => physical.sampleAt(x, y, z, out),
    surfaceAt: (x, z) => physical.surfaceAt(x, z),
    addReaction: () => {},
    setSampleTime: (offset: number) => physical.setSampleTime(offset),
  };
  let trials = 0;
  let lastPlace = -1e9;
  for (let i = 0; i < frames; i += 1) {
    sim.step(STEP);
    const t = sim.solver.time;
    if (trials < TRIALS && t - lastPlace > GAP) {
      const sy = physical.surfaceAt(focus.x, focus.z - AHEAD);
      const here = physical.sampleAt(focus.x, sy, focus.z - AHEAD, scratch);
      if (here.wet && !here.outsideDomain) {
        trials += 1;
        lastPlace = t;
        const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
        const fall = new Vector3(here.slopeX, 0, here.slopeZ);
        if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
        fall.normalize();
        const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
        const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
        const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
        const left = new Vector3().crossVectors(normal, forward).normalize();
        const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward));
        emit({
          kind: 'trial', trial: trials, t: r(t, 4), x: r(focus.x, 2), z: r(focus.z - AHEAD, 2),
          surfaceY: r(sy, 4), slope: r(Math.atan(Math.hypot(here.slopeX, here.slopeZ)) * DEG, 3),
          breaking: r(here.breaking, 4), riders: ARMS.length * STANCES.length * ENTRIES.length * STEERS.length,
        });
        for (const arm of ARMS) {
          for (const stance of STANCES) {
            for (const entry of ENTRIES) {
              for (const steer of STEERS) {
                const board0 = new BoardBody();
                const pos = new Vector3(focus.x, sy, focus.z - AHEAD).addScaledVector(normal, board0.shape.centerOfMass.y - SINK);
                live.push(build(arm, trials, stance, entry, steer, 0, water, pos, q.clone(),
                  forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ))));
              }
            }
          }
        }
      }
    }
    for (const e of live) if (!e.done) stepRider(e);
    if (trials >= TRIALS && live.every((e) => e.done)) break;
  }
  for (const e of live) {
    emit({
      kind: 'run', arm: e.arm, trial: e.trial, stance: e.stance, entry: e.entry, steer: e.steer, slope: 0,
      frames: e.frame, fellAt: e.fellAt === null ? null : r(e.fellAt, 4), cause: e.cause || 'held',
    });
  }
}

emit({ kind: 'done', wall: r((Date.now() - wall) / 1000, 1), riders: MODE === 'sea' ? live.length : undefined });
