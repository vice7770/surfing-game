/**
 * **Step 3.5o: the sharp steer's sideways collapse, at the solver step.**
 *
 * The work order (`docs/superpowers/handoffs/2026-11-20-work-order-sharp-steer-collapse.md` on `claude/ride-everything`)
 * asks one question: why does a held full steer collapse the rider sideways at ~0.700 s on Canyon seed 2's wave 1, when
 * the same sea with no command keeps him standing past 3.017 s and the same command on wave 2 survives? This file answers
 * it with the matched take-off drive of `take-off/four-numbers.ts` (`claude/the-record`), copied VERBATIM so its frame
 * rows reproduce `results/overnight-canyon-review/seed2-controls.jsonl.gz` (`claude/the-record`), plus **per-substep
 * reads at the solver step** taken through prototype wrappers that only get:
 *
 *  * `AttachedRider.prepare` — the board and the body BEFORE the substep's solve, and the commands the substep sends:
 *    `ankleTorque` (the passive spring/damper on the commanded rest, pre-solve), `swingTorque` (the hip rotor), the rest,
 *    the predictor's raw command and, on a controller tick, its decomposition `raw = ref.u − bias − Σ K·(x̂ − x_ref)`.
 *  * `AttachedRider.settleStanding` — the coupled solve's answer (`x[0..8]`), the contact impulse it needs, and whether
 *    the feet can give it (`feasible`, `limit`, the demanded centre of pressure `freeX`).
 *  * `AttachedRider.finish` — the board and the body AFTER the substep, and the capture point the fall test reads.
 *
 * ⭐ **The decomposition, on the capture point's own axes** (board-local, +x the board's left rail, the frame
 * `humanBalance.capture` is called in). The engine's own capture point is `cp = px + vx/ω` with `px = off.x − H·n.x`,
 * `vx = vel.x − (vel·n̂)·n.x`, `off` the CoM from the feet's middle and `vel` the CoM's velocity relative to the deck at
 * the feet, both rotated into the board's frame, `n̂` the felt vertical in the board's frame and `H = off·n̂`. Over one
 * substep the change of `vel.x` is split EXACTLY into
 *
 *     Δvel.x = x̂₁·(v_r₁ − v_r₀)                     [rider]  the body's own momentum change (contact + gravity + water on him)
 *            − x̂₁·(v_b₁ − v_b₀)                     [boardT] the board's centre-of-mass acceleration
 *            − x̂₁·(ω₁×r_f₁ − ω₀×r_f₀)               [boardR] the deck's rotational velocity at the feet
 *            + (x̂₁ − x̂₀)·(v_r₀ − v_f₀)              [frame]  the deck's axes turning under a relative velocity
 *
 * and the change of the capture point into `Δoff.x` (position), `Δvel.x/ω` (the four above, scaled), the felt
 * vertical's own projection `−Δ(H·n.x)` and `−Δ((vel·n̂)·n.x)/ω` [felt], and the `1/ω` change [omega]. The sum is
 * checked against the engine's own `human.state.across` every substep (`cpOk`).
 *
 * **MEASUREMENT ONLY.** Nothing under `src/`. No behaviour, no constant, no switch. A `PROBE=off` run builds no row and
 * installs no wrapper, and must reproduce every fall time of a `PROBE=on` run (the inertness proof).
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/sharp-steer.ts -o <s>/raw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '' };\n" > <s>/sharp-steer.mjs   # an OBJECT, never a string
 *     cat <s>/raw.mjs >> <s>/sharp-steer.mjs
 *     cd <s> && env SEED=2 PERIODS=2 TURN_STEER=1 TURN_COMPRESS=0 STAND_HOLD=5 OUT=<s>/s2.jsonl node --max-old-space-size=3200 sharp-steer.mjs
 *
 * Env: as `four-numbers.ts` MODE=takeoff (`ADDRESS`, `SCRIPTS`, `SEED`, `PERIODS`, `STAND_HOLD`, `TRIAL`, `SPRINT`,
 * `TURN_AT`, `TURN_FOR`, `TURN_STEER`, `TURN_COMPRESS`, `PROBE`, `OUT`), plus `SUB_FROM`/`SUB_TO` (s since the stand, the
 * substep window, default 0.25–1.30) and `WAVES` (which trials to keep, default all).
 */
import { appendFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { PredictiveController } from '../../../../src/physics/predictiveBalance';
import { RideSession } from '../../../../src/physics/RideSession';
import { deckHeight } from '../../../../src/physics/riderPosture';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { inTakeOffWindow } from '../../../../src/physics/takeOffCue';
import { WaveFrameGauge, type WaveFrame } from '../../../../src/physics/waveFrame';
import { SurfZoneSimulation, rideLineupAlong, rideLineupOffset, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;

const ADDRESS = process.env.ADDRESS ?? '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const SCRIPTS = (process.env.SCRIPTS ?? 'cue,cueL,cueR').split(',').filter(Boolean);
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const SEED = Number(process.env.SEED ?? 2);
const PERIODS = Number(process.env.PERIODS ?? 2);
const STAND_HOLD = Number(process.env.STAND_HOLD ?? 3);
const TRIAL = Number(process.env.TRIAL ?? 20);
const CREST_PROBE = 36;
const SPRINT = Number(process.env.SPRINT ?? 2);
const TURN_AT = Number(process.env.TURN_AT ?? 0.3);
const TURN_FOR = Number(process.env.TURN_FOR ?? 0.9);
const TURN_STEER = Number(process.env.TURN_STEER ?? 1);
const TURN_COMPRESS = Number(process.env.TURN_COMPRESS ?? 0);
const PROBE_ON = process.env.PROBE !== 'off';
const OUT = process.env.OUT;
const SUB_FROM = Number(process.env.SUB_FROM ?? 0.25);
const SUB_TO = Number(process.env.SUB_TO ?? 1.3);
const WAVES = process.env.WAVES ? process.env.WAVES.split(',').map(Number) : null;
/** Extra rider options, JSON, merged over the address's own (an arm under test). Empty by default. */
const EXTRA = process.env.EXTRA ? (JSON.parse(process.env.EXTRA) as Record<string, unknown>) : {};
/**
 * ⚠️ **DIAGNOSTIC ARMS — they change the ride and are never a fix.** Each is a prototype wrapper this file installs
 * only when its variable is set, so the default run is the shipped rider:
 *  * `SCHED_FLOOR=<v>` — the controller's gain schedule is read at `max(speed, v)` (`PredictiveController.tick`'s
 *    `speed` is used by `blend` alone, so this moves the design and its reference and nothing else);
 *  * `HIP_OFF=1` — the hip rotor is handed no demand (`humanSwingStep`'s `demand` held at 0), so the ankle's overflow
 *    reaches nothing: the transmission path's own test.
 */
const SCHED_FLOOR = process.env.SCHED_FLOOR ? Number(process.env.SCHED_FLOOR) : undefined;
const HIP_OFF = process.env.HIP_OFF === '1';

const r = (x: number | undefined | null, n: number): number | null => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// ---------------------------------------------------------------------------------------------------------------
// The address, through the game's own switch parsing (`four-numbers.ts`, verbatim).
// ---------------------------------------------------------------------------------------------------------------
const RIDER_KEYS = [
  'stroke', 'swim', 'extension', 'duckBody', 'snap', 'snapQuick', 'snapPivot', 'snapRecentre', 'snapDepth', 'snapStamp',
  'agile', 'legDrive', 'hull', 'railSuction', 'compressPull', 'carveFlex', 'snapLegs', 'snapCross', 'legPower', 'rider',
  'feltFrame', 'kneeRoom', 'stanceReach', 'ankleLimit', 'ankleRange', 'bankClamp', 'bodyBank', 'askCap', 'stanceDeep',
  'deepen', 'armCarry', 'trunk', 'buoyFrame', 'waterHeel', 'mountAgree', 'riderBody', 'riderCost', 'plantFloor',
  'deckHollow', 'snapUpturn', 'swing',
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
  return { ...out, ...EXTRA };
}
const config = configFor(ADDRESS);

// ---------------------------------------------------------------------------------------------------------------
// The sea (verbatim).
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
const { nx: gridX, nz: gridZ } = sim.solver as unknown as { nx: number; nz: number };
emit({
  control: true, address: ADDRESS, scripts: SCRIPTS, seed: SEED, periods: PERIODS, standHold: STAND_HOLD,
  turnSteer: TURN_STEER, turnCompress: TURN_COMPRESS, probe: PROBE_ON ? 'on' : 'off', subFrom: SUB_FROM, subTo: SUB_TO,
  search: (globalThis as { location?: { search?: string } }).location?.search ?? '(none)',
  grid: `${gridX}x${gridZ}`, cells: gridX * gridZ, spunUp: (Date.now() - wall) / 1000, seaTime: sim.solver.time,
  startX, startZ, riderOptions: riderOptions(config), extra: EXTRA,
  diagnostic: { schedFloor: SCHED_FLOOR ?? null, hipOff: HIP_OFF ? 1 : 0 },
});
if (config.canyonBed !== 'b' || config.rider !== 'new') {
  emit({ fatal: 'the address did not arrive', canyonBed: config.canyonBed ?? null, rider: config.rider ?? null });
  process.exit(2);
}

// ---------------------------------------------------------------------------------------------------------------
// The per-substep instrument. Every read is a get; the only writes are into this file's own objects.
// ---------------------------------------------------------------------------------------------------------------
interface Snap {
  // board
  bv: Vector3; bw: Vector3; bq: Quaternion; bc: Vector3; bp: Vector3;
  // rider
  rp: Vector3; rv: Vector3;
  // forces snapshot (running impulse sums inside a step)
  f: Record<string, Vector3>;
}
interface Watch {
  rider: AttachedRider;
  board: BoardBody;
  label: { script: string; wave: number };
  standAt: number;
  /** Seconds since the stand at the END of the substep being taken (the frame row's own `tStand` on its last substep). */
  clock: number;
  sub: number;
  pre?: Snap;
  prep?: Record<string, unknown>;
  settle?: Record<string, unknown>;
  lastFelt?: Vector3;
}
const watching = new Map<AttachedRider, Watch>();
const FORCE_KEYS = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth', 'suction'] as const;

function snap(board: BoardBody, rider: AttachedRider): Snap {
  const f: Record<string, Vector3> = {};
  for (const k of FORCE_KEYS) f[k] = (board.forces as Any)[k].clone();
  return {
    bv: board.velocity.clone(), bw: board.angularVelocity.clone(), bq: board.orientation.clone(), bc: board.centerOfMass.clone(),
    bp: board.position.clone(), rp: rider.position.clone(), rv: rider.velocity.clone(), f,
  };
}

/** Board-local axes from an orientation (world vectors). */
function axes(q: Quaternion): { x: Vector3; y: Vector3; z: Vector3; inv: Quaternion } {
  return {
    x: new Vector3(1, 0, 0).applyQuaternion(q), y: new Vector3(0, 1, 0).applyQuaternion(q), z: new Vector3(0, 0, 1).applyQuaternion(q),
    inv: q.clone().invert(),
  };
}
/** A board-frame point in the world, from a snapshot (`BoardBody.toWorld`'s own arithmetic, on this file's copies). */
function toWorld(board: BoardBody, s: Snap, local: Vector3): Vector3 {
  const c = board.shape.centerOfMass;
  return new Vector3(local.x - c.x, local.y - c.y, local.z - c.z).applyQuaternion(s.bq).add(s.bp);
}
/** The feet's middle on the deck, world (`captureStep`'s own point). */
function feetOf(rider: AttachedRider, board: BoardBody, s: Snap): Vector3 {
  const sup = (rider as Any).support as { xMin: number; xMax: number; zMin: number; zMax: number };
  const midX = (sup.xMin + sup.xMax) / 2;
  const midZ = (sup.zMin + sup.zMax) / 2;
  return toWorld(board, s, new Vector3(midX, deckHeight(board.shape, midZ), midZ));
}
const velAt = (s: Snap, p: Vector3): Vector3 => new Vector3().crossVectors(s.bw, new Vector3().subVectors(p, s.bc)).add(s.bv);

/** The capture point's own inputs, rebuilt from a snapshot and the felt vertical (board frame), `capture`'s arithmetic. */
function captureOf(off: Vector3, vel: Vector3, felt: Vector3): { cp: number; px: number; vx: number; H: number; omega: number; nx: number; along: number } {
  const g = felt.length();
  const nx = g > 1e-6 ? felt.x / g : 0;
  const ny = g > 1e-6 ? felt.y / g : 1;
  const nz = g > 1e-6 ? felt.z / g : 0;
  const H = Math.max(0.2, off.x * nx + off.y * ny + off.z * nz);
  const omega = Math.sqrt(Math.max(0.5, g) / H);
  const along = vel.x * nx + vel.y * ny + vel.z * nz;
  const px = off.x - H * nx;
  const vx = vel.x - along * nx;
  return { cp: px + vx / omega, px, vx, H, omega, nx, along };
}

function installProbe(): void {
  const AR = AttachedRider.prototype as Any;
  const prepare = AR.prepare;
  const settleStanding = AR.settleStanding;
  const finish = AR.finish;

  AR.prepare = function (this: AttachedRider, h: number, board: BoardBody, w: SurfWater): void {
    const watch = watching.get(this);
    if (watch) watch.clock += h;
    const t = watch?.clock;
    const on = watch !== undefined && t !== undefined && t >= SUB_FROM - 1e-9 && t <= SUB_TO + 1e-9 && this.attached;
    const before = on ? snap(board, this) : undefined;
    const pred = (this as Any).predictor;
    const ticks = pred?.ticks ?? 0;
    prepare.call(this, h, board, w);
    if (watch) {
      watch.pre = undefined;
      watch.prep = undefined;
      watch.settle = undefined;
    }
    if (!on || !watch) return;
    watch.pre = before;
    watch.sub += 1;
    const self = this as Any;
    const ticked = (pred?.ticks ?? 0) !== ticks;
    const prep: Record<string, unknown> = {
      h, ticked: ticked ? 1 : 0,
      ankleT: r(self.ankleTorque, 4), swingT: r(self.swingTorque, 4), twistT: r(self.twistTorque, 4),
      rest: r(self.ankleRest * DEG, 4), heldRaw: r(self.heldAnkleRaw * DEG, 4), lean: r(self.leanAsked * DEG, 4),
      bank: r(self.bank.angle * DEG, 4), bankRate: r(self.bank.rate * DEG, 3), bankSpeed: r(self.bankSpeed, 5), legL: r(self.legLength, 5),
      swingA: r(self.swing.angle * DEG, 4), swingR: r(self.swing.rate * DEG, 3), swingLag: r(self.swingLagged, 4),
      sched: r(self.schedRail * DEG, 4), legLoad: r(self.legLoad, 3), bite: r(self.ankleBite * DEG, 3), room: r(self.ankleRoom * DEG, 3),
      speedThrough: r(self.leanProbe.speedThrough, 4), cap: r(self.leanProbe.cap * DEG, 3), planing: self.leanProbe.planing,
      twA: r(self.twistBody.angle * DEG, 3), twR: r(self.twistBody.rate * DEG, 3), twActive: r(self.twistBody.active, 3), heldTwist: r(self.heldTwist, 3),
      captureLoad: r(self.captureLoad, 4),
    };
    if (ticked && pred) {
      // The command's own decomposition: raw = ref.u − bias − Σ_j K[0][j] (x̂_j − ref.x_j), this file's (the model's) signs.
      const d = pred.blendedDesign;
      const n = d?.phi?.length ?? 0;
      const terms: number[] = [];
      for (let j = 0; j < n; j += 1) terms.push(-d.k[0][j] * (pred.predicted[j] - pred.reference.x[j]));
      prep.ctl = {
        raw: r(pred.raw[0] * DEG, 4), refU: r(pred.reference.u[0] * DEG, 4), bias: r(pred.bias[0] * DEG, 4),
        terms: terms.map((x) => r(x * DEG, 4)),
        xh: Array.from(pred.predicted.slice(0, n) as number[]).map((x) => r(x, 5)),
        xr: Array.from(pred.reference.x.slice(0, n) as number[]).map((x) => r(x, 5)),
        k0: Array.from(d.k[0] as number[]).map((x) => r(x, 4)),
        rawTwist: r(pred.raw[1], 3),
      };
    }
    watch.prep = prep;
  };

  AR.settleStanding = function (this: AttachedRider, x: Float64Array, h: number, board: BoardBody): boolean {
    const ok = settleStanding.call(this, x, h, board) as boolean;
    const watch = watching.get(this);
    if (watch?.prep) {
      const self = this as Any;
      const ax = axes(board.orientation);
      const j = self.impulse as Vector3;
      const p = self.projected as Vector3;
      const t = self.across as Vector3;
      const n = self.up as Vector3;
      const fwd = self.forward as Vector3;
      watch.settle = {
        feasible: ok ? 1 : 0, limit: self.limit, freeX: r(self.desiredCop.x, 5), loaded: self.loaded ? 1 : 0,
        rawMargin: r(self.rawMargin, 5), friction: r(self.frictionUsed, 4),
        // The needed contact impulse, N·s, on the board's axes and on the body's own (across t, up n, forward f).
        jx: r(j.dot(ax.x), 6), jy: r(j.dot(ax.y), 6), jz: r(j.dot(ax.z), 6),
        jt: r(j.dot(t), 6), jn: r(j.dot(n), 6), jf: r(j.dot(fwd), 6),
        px: r(p.dot(ax.x), 6), py: r(p.dot(ax.y), 6),
        // The body's own axes against the deck's: n·x̂ is the tilt of the leg line across the deck.
        nDotX: r(n.dot(ax.x), 6), tDotX: r(t.dot(ax.x), 6),
        // The coupled solve's answer: the board's Δv, Δω (world) and the body's three relative rates.
        x: Array.from(x.slice(0, 9)).map((v) => r(v, 7)),
        // The implicit part of the ankle spring/damper over this substep, N·m (`coupleStanding`'s row 7 diagonal).
        ankleImpl: r((h * 800 + 80) * x[7] / self.legLength, 4),
      };
    }
    return ok;
  };

  AR.finish = function (this: AttachedRider, h: number, board: BoardBody): void {
    const watch = watching.get(this);
    const pre = watch?.pre;
    const prep = watch?.prep;
    const mid = pre && prep ? snap(board, this) : undefined; // the board after its move, the body before its own
    const state = this.human.state;
    const cpBefore = state.across;
    const extX = pre && prep ? (this as Any).external.dot(new Vector3(1, 0, 0).applyQuaternion(board.orientation)) as number : Number.NaN;
    finish.call(this, h, board);
    if (watch) {
      watch.pre = undefined;
      watch.prep = undefined;
    }
    if (!watch || !pre || !prep || !mid) return;
    const self = this as Any;
    const after: Snap = { ...mid, rp: this.position.clone(), rv: this.velocity.clone() };
    const ax0 = axes(pre.bq);
    const ax1 = axes(after.bq);
    const f0 = feetOf(this, board, pre);
    const f1 = feetOf(this, board, after);
    const vf0 = velAt(pre, f0);
    const vf1 = velAt(after, f1);
    // The relative velocity on the board's x, before and after, and its exact four-way split.
    const rel0 = new Vector3().subVectors(pre.rv, vf0);
    const rel1 = new Vector3().subVectors(after.rv, vf1);
    const dRider = ax1.x.dot(new Vector3().subVectors(after.rv, pre.rv));
    const dBoardT = -ax1.x.dot(new Vector3().subVectors(after.bv, pre.bv));
    const rotF0 = new Vector3().crossVectors(pre.bw, new Vector3().subVectors(f0, pre.bc));
    const rotF1 = new Vector3().crossVectors(after.bw, new Vector3().subVectors(f1, after.bc));
    const dBoardR = -ax1.x.dot(new Vector3().subVectors(rotF1, rotF0));
    const dFrame = new Vector3().subVectors(ax1.x, ax0.x).dot(rel0);
    const relX0 = ax0.x.dot(rel0);
    const relX1 = ax1.x.dot(rel1);
    // The capture point's own inputs (board frame) before and after, on the engine's own felt vertical.
    const felt1 = (self.captureFelt as Vector3).clone();
    const off0 = new Vector3().subVectors(pre.rp, f0).applyQuaternion(ax0.inv);
    const off1 = new Vector3().subVectors(after.rp, f1).applyQuaternion(ax1.inv);
    const vel0 = rel0.clone().applyQuaternion(ax0.inv);
    const vel1 = rel1.clone().applyQuaternion(ax1.inv);
    const feltPrev = watch.lastFelt ?? felt1;
    const c0 = captureOf(off0, vel0, feltPrev);
    const c1 = captureOf(off1, vel1, felt1);
    // Δcp split: position, the four velocity channels over ω₁, the felt vertical, and the 1/ω change.
    const w1 = c1.omega;
    const dPos = off1.x - off0.x;
    const feltPos = -(c1.H * c1.nx - c0.H * c0.nx);
    const feltVel = -(c1.along * c1.nx - c0.along * c0.nx) / w1;
    const omegaTerm = c0.vx * (1 / w1 - 1 / c0.omega);
    const sum = dPos + (dRider + dBoardT + dBoardR + dFrame) / w1 + feltPos + feltVel + omegaTerm;
    // The water's impulses on the board this substep, N·s, on the board's x (after) and its world-level across.
    const water: Record<string, number | null> = {};
    let waterX = 0;
    for (const k of FORCE_KEYS) {
      const d = new Vector3().subVectors((board.forces as Any)[k], pre.f[k]);
      const v = d.dot(ax1.x);
      waterX += v;
      water[k] = r(v / h, 3);
    }
    const s = watch.settle ?? {};
    watch.settle = undefined;
    const st = this.human.state;
    const row = {
      kind: 'sub', script: watch.label.script, wave: watch.label.wave, t: r(watch.clock, 6), sub: watch.sub, extX: r(extX, 3),
      cp0Mine: r(c0.cp, 6), cp0Ok: Math.abs(c0.cp - cpBefore) < 1e-7 ? 1 : 0,
      ...prep, ...s,
      // The body's across velocity relative to the deck at the feet (board x), m/s, and its exact split, m/s per substep.
      relX0: r(relX0, 6), relX1: r(relX1, 6), dRider: r(dRider, 7), dBoardT: r(dBoardT, 7), dBoardR: r(dBoardR, 7), dFrame: r(dFrame, 7),
      relOk: Math.abs(relX1 - relX0 - (dRider + dBoardT + dBoardR + dFrame)) < 1e-9 ? 1 : 0,
      // The capture point: the engine's, the rebuild, and the split.
      cpEngine0: r(cpBefore, 6), cpEngine: r(st.across, 6), cpMine: r(c1.cp, 6), cpOk: Math.abs(c1.cp - st.across) < 1e-7 ? 1 : 0,
      dcp: r(c1.cp - c0.cp, 7), dPos: r(dPos, 7), dVrider: r(dRider / w1, 7), dVboardT: r(dBoardT / w1, 7), dVboardR: r(dBoardR / w1, 7),
      dVframe: r(dFrame / w1, 7), dFeltPos: r(feltPos, 7), dFeltVel: r(feltVel, 7), dOmega: r(omegaTerm, 7), splitOk: Math.abs(sum - (c1.cp - c0.cp)) < 1e-9 ? 1 : 0,
      px: r(c1.px, 6), vx: r(c1.vx, 5), H: r(c1.H, 4), omega: r(c1.omega, 4), nx: r(c1.nx, 6), offX: r(off1.x, 6), velX: r(vel1.x, 5),
      fallen: this.human.fallen ? 1 : 0, beyond: st.beyond ? 1 : 0, weightPast: st.weightPast ? 1 : 0, frozen: this.human.frozen ? 1 : 0,
      // The board itself: its sideslip on its own x, its accelerations, and the water's lateral impulses (as forces, N).
      bvx: r(after.bv.dot(ax1.x), 5), bvz: r(after.bv.dot(ax1.z), 5), bax: r(ax1.x.dot(new Vector3().subVectors(after.bv, pre.bv)) / h, 4),
      bwRoll: r(after.bw.dot(ax1.z) * DEG, 3), bwYaw: r(after.bw.dot(ax1.y) * DEG, 3), bwPitch: r(after.bw.dot(ax1.x) * DEG, 3),
      waterX: r(waterX / h, 3), water,
      gravX: r(board.mass * -9.81 * ax1.x.y, 3),
      contactX: r(-(((s.feasible as number) === 1 ? (s.jx as number) : (s.px as number)) ?? Number.NaN) / h, 3),
      rax: r(ax1.x.dot(new Vector3().subVectors(after.rv, pre.rv)) / h, 4),
      roll: r(Math.atan2(ax1.y.dot(new Vector3(ax1.z.z, 0, -ax1.z.x).normalize()), ax1.y.y) * DEG, 4),
      course: r(Math.atan2(after.bv.x, after.bv.z) * DEG, 4), heading: r(Math.atan2(ax1.z.x, ax1.z.z) * DEG, 4),
    };
    watch.lastFelt = felt1;
    emit(row);
  };
}
if (PROBE_ON) installProbe();
if (SCHED_FLOOR !== undefined) {
  const PC = PredictiveController.prototype as Any;
  const tick = PC.tick;
  PC.tick = function (this: unknown, sense: readonly number[], speed: number, ...rest: unknown[]) {
    return tick.call(this, sense, Math.max(speed, SCHED_FLOOR), ...rest);
  };
}
if (HIP_OFF) {
  const AR = AttachedRider.prototype as Any;
  const swing = AR.humanSwingStep;
  AR.humanSwingStep = function (this: unknown, h: number, _demand: number, range: number, inertia: number) {
    return swing.call(this, h, 0, range, inertia);
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The drive: `four-numbers.ts` MODE=takeoff, verbatim except for the row it emits.
// ---------------------------------------------------------------------------------------------------------------
const sample = createWaterSample();
interface Script { name: string; pop: 'cue' | 'lift' | 'early'; turn: 0 | 1 | -1 }
const scriptOf = (name: string): Script => ({
  name,
  pop: name.startsWith('cue') ? 'cue' : name.startsWith('early') ? 'early' : 'lift',
  turn: name.endsWith('L') ? 1 : name.endsWith('R') ? -1 : 0,
});
interface Rider {
  script: Script; session: RideSession; gauge: WaveFrameGauge; sprinting: boolean; seenBehind: boolean;
  cueAt?: number; popAt?: number; standAt?: number; fellAt?: number; cause?: string; arrival?: number; passedAt?: number;
  frames: number; done: boolean; tNow: number;
}
interface Trial { placed: number; riders: Rider[]; last: number[]; arrival?: number; index: number }
const trials: Trial[] = [];
const active: Trial[] = [];

function makeRider(script: Script): Rider {
  const session = new RideSession(riderOptions(config) as ConstructorParameters<typeof RideSession>[0]);
  const direction = (config.directionDegrees * Math.PI) / 180;
  return {
    script, session, gauge: new WaveFrameGauge({ directionX: Math.sin(direction), directionZ: Math.cos(direction) }),
    sprinting: false, seenBehind: false, frames: 0, done: false, tNow: 0,
  };
}
function place(index: number): Trial {
  const trial: Trial = { placed: sim.solver.time, index, last: [], riders: [] };
  for (const name of SCRIPTS) trial.riders.push(makeRider(scriptOf(name)));
  for (const rider of trial.riders) rider.session.place({ x: startX, z: startZ, heading: 0, speed: 0, phase: 'prone' }, water);
  return trial;
}

function stepRider(rider: Rider, t: number, trial: Trial): void {
  const { session, script } = rider;
  const board = session.board;
  rider.tNow = t;
  const frame: WaveFrame = rider.gauge.update(water, board.centerOfMass, board.velocity, STEP, 55);
  if (frame.valid && frame.aheadOfCrest > 3 && frame.crestSpeed > 2) rider.seenBehind = true;
  const closing = frame.crestSpeed - frame.speedShoreward;
  const toCrest = rider.seenBehind && frame.valid && frame.aheadOfCrest > 0 && closing > 0.5 ? frame.aheadOfCrest / closing : Number.POSITIVE_INFINITY;
  const prone = session.phase === 'prone';
  if (rider.arrival === undefined && rider.seenBehind && frame.valid && frame.aheadOfCrest <= 0.5 && frame.crestSpeed > 2) rider.arrival = t;
  const cue = prone && (session.rider.popUpCue || inTakeOffWindow(frame));
  if (cue && rider.cueAt === undefined) rider.cueAt = t;
  let pop = false;
  if (prone && rider.popAt === undefined && rider.seenBehind) {
    if (!rider.sprinting && toCrest <= SPRINT) rider.sprinting = true;
    if (cue) pop = true;
  }
  if (pop) rider.popAt = t;
  const sinceStand = rider.standAt === undefined ? -1 : t - rider.standAt;
  const turning = script.turn !== 0 && session.phase === 'standing' && sinceStand >= TURN_AT && sinceStand < TURN_AT + TURN_FOR;
  const input = {
    paddle: prone && !pop && rider.popAt === undefined,
    sprint: prone && rider.sprinting && !pop,
    popUp: pop,
    steer: turning ? script.turn * TURN_STEER : 0,
    ...(turning && TURN_COMPRESS > 0 ? { compress: TURN_COMPRESS } : {}),
  };
  // The instrument's clock for this rider: seconds since the stand at the START of the frame being stepped, so that its
  // last substep ends on the frame row's own `tStand` (`t − standAt`).
  const watch = watching.get(session.rider);
  if (watch) {
    watch.sub = 0;
    watch.clock = t - watch.standAt - STEP;
  }
  session.step(STEP, water, input);
  rider.frames += 1;
  const attached = session.rider.attached;
  const standsNow = session.phase === 'standing' && rider.standAt === undefined;
  if (standsNow) {
    rider.standAt = t;
    // Print back what the host actually built (the switch's own read, never the URL): the predictor's weights.
    const built = (session.rider as Any).predictor?.weights;
    emit({
      kind: 'built', script: script.name, wave: trial.index, plantFloor: built?.plantFloor ?? null, riderBody: built?.riderBody ?? null,
      weightsKeys: built ? Object.keys(built).length : 0, schedFloor: SCHED_FLOOR ?? null, hipOff: HIP_OFF ? 1 : 0,
    });
    if (PROBE_ON && (WAVES === null || WAVES.includes(trial.index))) {
      // Watch from the next frame on: the stand's own frame has already been stepped.
      watching.set(session.rider, {
        rider: session.rider, board, label: { script: script.name, wave: trial.index }, standAt: t, clock: 0, sub: 0,
      });
    }
  }
  const since = rider.standAt === undefined ? -1 : t - rider.standAt;
  // The frame row, in `seed2-controls`' own columns, for the reproduction check.
  if (PROBE_ON && session.phase === 'standing' && rider.standAt !== undefined && (WAVES === null || WAVES.includes(trial.index))) {
    const rd = session.rider as Any;
    const fwd = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const sideV = new Vector3(fwd.z, 0, -fwd.x);
    const boardUp = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
    const st = rd.human.state;
    emit({
      kind: 'row', script: script.name, wave: trial.index, frame: rider.frames, t: r(t, 5), tStand: r(since, 5), attached: attached ? 1 : 0,
      sep: session.separation ?? null, steer: r(rd.steer, 4), planing: rd.leanProbe.planing, askDeg: r(rd.leanProbe.ask * DEG, 4),
      roll: r(Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG, 4), bank: r(rd.bank.angle * DEG, 4),
      course: r(Math.atan2(board.velocity.x, board.velocity.z) * DEG, 3), speed: r(Math.hypot(board.velocity.x, board.velocity.z), 4),
      speedThrough: r(rd.leanProbe.speedThrough, 4), wantX: r(rd.desiredCop.x, 5), capAcross: r(st.across, 5), capPoint: r(st.pointAcross, 5),
      capBeyond: st.beyond ? 1 : 0, capFallen: rd.human.fallen ? 1 : 0, lvHeldAnkleDeg: r(rd.heldAnkleRaw * DEG, 4), legLoad: rd.legLoad,
      // The climb, as the peer's row table defines it: the wave frame's face height times its face fraction, above the
      // moving trough (`WaveFrameGauge`, read before this frame's step as `four-numbers.ts` reads it).
      faceH: r(frame.faceHeight, 4), faceFrac: r(frame.faceFraction, 4), climb: frame.valid ? r(frame.faceHeight * frame.faceFraction, 4) : null,
      heading: r(Math.atan2(fwd.x, fwd.z) * DEG, 3), schedRail: r(rd.schedRail * DEG, 3), depth: r(Math.max(0, -rd.leg.rest), 4),
    });
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
  if (rider.done) watching.delete(session.rider);
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
        kind: 'summary', script: rider.script.name, wave: trial.index, frames: rider.frames,
        pop: r(rider.popAt, 5), stand: r(rider.standAt, 5), fell: r(rider.fellAt, 5), cause: rider.cause ?? null,
        fellAfterStand: rider.fellAt !== undefined && rider.standAt !== undefined ? r(rider.fellAt - rider.standAt, 5) : null,
        stood: rider.standAt !== undefined ? 1 : 0,
        standExposure: rider.standAt === undefined ? null : r(Math.min(STAND_HOLD, TRIAL - rider.standAt), 5),
        censored: rider.standAt !== undefined && rider.fellAt === undefined ? 1 : 0,
      });
    }
  }
  emit({ kind: 'done', waves, runs: trials.reduce((a, trial) => a + trial.riders.length, 0), seconds: (Date.now() - wall) / 1000 });
}

takeoff();
void sample;
