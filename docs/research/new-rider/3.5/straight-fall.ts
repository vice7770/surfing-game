/**
 * **Step 3.5p: the straight-line fall on the test wave's ride start, at the frame and at the solver step.**
 *
 * The owner (2026-11-20): "The surfer cannot stand up." On `?testWave=ride` the new rider is placed standing and plumb on
 * a clean, breaking face, mid-height, 7.7 m/s through the water at 54° across it, no foam force, no input, and falls in
 * 27 of 27 cells of `scripts/test-wave-probe.ts ridegrid`. This file follows that ride on the game's own config path
 * (`surfZoneConfigFor` under the page's address and `testWaveOverrides`, `SurfZoneRunner` as the game runs it), and
 * emits, per frame, the board, the body, the balance's controller (its prediction, reference, gains and the command's
 * per-state terms), the capture point and the contact; and, per substep inside a window, 3.5o's exact split of the
 * capture point's change (`sharp-steer.ts` on `claude/sharp-steer-collapse`, the same arithmetic) on BOTH the deck's
 * axes: across (x, the board's left) and along (z, the nose).
 *
 * **MEASUREMENT ONLY** unless a diagnostic arm is set. Every read is a get; the wrappers write only into this file's own
 * objects. `PROBE=off` installs no wrapper and must give the same fall times (the inertness check).
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/straight-fall.ts -o <s>/sf.mjs --format esm --platform node
 *     node <s>/sf.mjs                       # the base cell, the owner's address, frames to stdout
 *     env RIDER=old GRID=1 OUT=<s>/old.jsonl node <s>/sf.mjs
 *
 * Env: `RIDER` new|old; `EXTRA` more switches on the address ('&plantFloor=4.5'); `GRID=1` the 27-cell grid of
 * `test-wave-probe.ts ridegrid` (dh −5,0,5 × dx −1,0,1 × dv −0.5,0,0.5), else the cell `DH`,`DX`,`DV`; `SECONDS` (6);
 * `FRAMES` 1|0 (emit frame rows); `SUB_FROM`/`SUB_TO` the substep window, s since the placement (none by default);
 * `OUT` a JSONL path (stdout otherwise).
 * Diagnostic arms (they change the ride; never a fix): `SCHED_FLOOR=<v>` (the gain schedule read at max(speed, v), as
 * 3.5o); `HIP_OFF=1`.
 */
import { appendFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { TEST_WAVE_STARTS, testWaveOverrides } from '../../../../src/game/testWave';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PredictiveController } from '../../../../src/physics/predictiveBalance';
import { deckHeight } from '../../../../src/physics/riderPosture';
import type { RiderPlacement } from '../../../../src/physics/RideSession';
import type { SurfWater } from '../../../../src/physics/SurfWater';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../../../../src/wave/SurfZoneRunner';
import { TEST_WAVE } from '../../../../src/wave/testWave';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const DEG = 180 / Math.PI;
const env = process.env;
const OWNER = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const OLD = '?canyonWaves=true';
const RIDER = env.RIDER ?? 'new';
const search = `${RIDER === 'new' ? OWNER : OLD}&testWave=ride${env.EXTRA ?? ''}`;
const SECONDS = Number(env.SECONDS ?? 6);
const FRAMES = env.FRAMES !== '0';
const PROBE_ON = env.PROBE !== 'off';
const SUB_FROM = env.SUB_FROM !== undefined ? Number(env.SUB_FROM) : Number.POSITIVE_INFINITY;
const SUB_TO = env.SUB_TO !== undefined ? Number(env.SUB_TO) : Number.NEGATIVE_INFINITY;
const OUT = env.OUT;
const SCHED_FLOOR = env.SCHED_FLOOR ? Number(env.SCHED_FLOOR) : undefined;
const HIP_OFF = env.HIP_OFF === '1';
/** `LEDGER=1`: the board's own roll and yaw ledgers (`BoardBody.rollLedger`, `yawLedger`: measurement tools, read-only), per frame. */
const LEDGER = env.LEDGER === '1';
if (LEDGER) { (BoardBody as Any).rollLedger = true; (BoardBody as Any).yawLedger = true; }
/**
 * ⚠️ More DIAGNOSTIC ARMS (prototype wrappers in this file only; they change the ride and are never a fix):
 *  * `SCHED_RAIL=actual` — the gain schedule's rail is the board's own rail against the water under it (`roll − tilt`,
 *    the `rail` `predictiveBank` is handed), not the rail the lean asked makes (`schedRail`);
 *  * `PLACE_LEVEL=1` — after the game's placement the board is turned about its own forward axis until its deck is
 *    level across (its uphill rail into the face by the face's tilt) and the rider mounted again, plumb: the old
 *    rider's own trim, with the ankle at nothing, so the placement loads no ankle spring.
 */
const SCHED_RAIL = env.SCHED_RAIL;
const PLACE_LEVEL = env.PLACE_LEVEL === '1';
/** `STEER=<s>`: a constant stick held from the placement on (−1 right to 1 left; the game's own input), a diagnostic of the lean reference. */
const STEER = Number(env.STEER ?? 0);

const r = (x: number | undefined | null, n = 4): number | null => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};

// ---------------------------------------------------------------------------------------------------------------
// The game's config for the address (`test-wave-probe.ts` `gameConfig`, verbatim).
// ---------------------------------------------------------------------------------------------------------------
(globalThis as { location?: { search: string } }).location = { search };
const settings = { ...physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' }), tide: 0, windSpeed: 0 };
const config = surfZoneConfigFor(settings, TEST_WAVE.seed, false, testWaveOverrides('ride', undefined));
const runner = new SurfZoneRunner(config, { rider: true });
const { simulation } = runner;
const start = simulation.exportState();
const session = runner.session!;
const rider = session.rider as AttachedRider;
const board = session.board as BoardBody;
const base = TEST_WAVE_STARTS.ride.placement;

// ---------------------------------------------------------------------------------------------------------------
// The per-substep instrument (3.5o's, `sharp-steer.ts`; extended to the along axis).
// ---------------------------------------------------------------------------------------------------------------
interface Snap { bv: Vector3; bw: Vector3; bq: Quaternion; bc: Vector3; bp: Vector3; rp: Vector3; rv: Vector3; f: Record<string, Vector3> }
const FORCE_KEYS = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth', 'suction'] as const;
const watch = { on: false, clock: 0, sub: 0, cell: '', pre: undefined as Snap | undefined, prep: undefined as Record<string, unknown> | undefined, settle: undefined as Record<string, unknown> | undefined, lastFelt: undefined as Vector3 | undefined };
function snap(b: BoardBody, rd: AttachedRider): Snap {
  const f: Record<string, Vector3> = {};
  for (const k of FORCE_KEYS) f[k] = (b.forces as Any)[k].clone();
  return { bv: b.velocity.clone(), bw: b.angularVelocity.clone(), bq: b.orientation.clone(), bc: b.centerOfMass.clone(), bp: b.position.clone(), rp: rd.position.clone(), rv: rd.velocity.clone(), f };
}
function axes(q: Quaternion) {
  return { x: new Vector3(1, 0, 0).applyQuaternion(q), y: new Vector3(0, 1, 0).applyQuaternion(q), z: new Vector3(0, 0, 1).applyQuaternion(q), inv: q.clone().invert() };
}
function toWorld(b: BoardBody, s: Snap, local: Vector3): Vector3 {
  const c = b.shape.centerOfMass;
  return new Vector3(local.x - c.x, local.y - c.y, local.z - c.z).applyQuaternion(s.bq).add(s.bp);
}
function feetOf(rd: AttachedRider, b: BoardBody, s: Snap): Vector3 {
  const sup = (rd as Any).support as { xMin: number; xMax: number; zMin: number; zMax: number };
  const midX = (sup.xMin + sup.xMax) / 2;
  const midZ = (sup.zMin + sup.zMax) / 2;
  return toWorld(b, s, new Vector3(midX, deckHeight(b.shape, midZ), midZ));
}
const velAt = (s: Snap, p: Vector3): Vector3 => new Vector3().crossVectors(s.bw, new Vector3().subVectors(p, s.bc)).add(s.bv);
/** `humanBalance.capture`'s arithmetic on one axis ('x' across, 'z' along). */
function captureOf(off: Vector3, vel: Vector3, felt: Vector3, axis: 'x' | 'z') {
  const g = felt.length();
  const nx = g > 1e-6 ? felt.x / g : 0;
  const ny = g > 1e-6 ? felt.y / g : 1;
  const nz = g > 1e-6 ? felt.z / g : 0;
  const H = Math.max(0.2, off.x * nx + off.y * ny + off.z * nz);
  const omega = Math.sqrt(Math.max(0.5, g) / H);
  const along = vel.x * nx + vel.y * ny + vel.z * nz;
  const n = axis === 'x' ? nx : nz;
  const p = off[axis] - H * n;
  const v = vel[axis] - along * n;
  return { cp: p + v / omega, p, v, H, omega, n, along };
}
function controllerRow(pred: Any): Record<string, unknown> | undefined {
  const d = pred?.blendedDesign;
  if (!d) return undefined;
  const n = d.phi.length as number;
  const terms0: number[] = [];
  const terms1: number[] = [];
  for (let j = 0; j < n; j += 1) {
    terms0.push(-d.k[0][j] * (pred.predicted[j] - pred.reference.x[j]));
    terms1.push(-d.k[1][j] * (pred.predicted[j] - pred.reference.x[j]));
  }
  return {
    raw: r(pred.raw[0] * DEG), sent: r(pred.sent[0] * DEG), refU: r(pred.reference.u[0] * DEG), bias: r(pred.bias[0] * DEG),
    terms: terms0.map((x) => r(x * DEG)), xh: Array.from(pred.predicted.slice(0, n) as number[]).map((x) => r(x, 5)),
    xr: Array.from(pred.reference.x.slice(0, n) as number[]).map((x) => r(x, 5)), k0: Array.from(d.k[0] as number[]).map((x) => r(x, 4)),
    k1: Array.from(d.k[1] as number[]).map((x) => r(x, 3)), rawTwist: r(pred.raw[1], 3), sentTwist: r(pred.sent[1], 3), refUTwist: r(pred.reference.u[1], 3),
    biasTwist: r(pred.bias[1], 3), terms1: terms1.map((x) => r(x, 3)), ticks: pred.ticks,
  };
}

function installProbe(): void {
  const AR = AttachedRider.prototype as Any;
  const prepare = AR.prepare;
  const settleStanding = AR.settleStanding;
  const finish = AR.finish;
  AR.prepare = function (this: AttachedRider, h: number, b: BoardBody, w: SurfWater): void {
    if (this !== rider) return prepare.call(this, h, b, w);
    watch.clock += h;
    const on = watch.on && watch.clock >= SUB_FROM - 1e-9 && watch.clock <= SUB_TO + 1e-9 && this.attached;
    const before = on ? snap(b, this) : undefined;
    const pred = (this as Any).predictor;
    const ticks = pred?.ticks ?? 0;
    prepare.call(this, h, b, w);
    watch.pre = undefined; watch.prep = undefined; watch.settle = undefined;
    if (!on) return;
    watch.pre = before;
    watch.sub += 1;
    const self = this as Any;
    const ticked = (pred?.ticks ?? 0) !== ticks;
    const prep: Record<string, unknown> = {
      h, ticked: ticked ? 1 : 0, ankleT: r(self.ankleTorque), swingT: r(self.swingTorque), twistT: r(self.twistTorque),
      rest: r(self.ankleRest * DEG), heldRaw: r(self.heldAnkleRaw * DEG), bank: r(self.bank.angle * DEG), bankRate: r(self.bank.rate * DEG, 3),
      swingA: r(self.swing.angle * DEG), swingLag: r(self.swingLagged), legLoad: r(self.legLoad, 3), speedThrough: r(self.leanProbe.speedThrough),
      pitchRest: r(self.standingBody.rest * DEG), pitchTorque: r(self.standingBody.torque), hipPitchT: r(self.standingBody.hip.torque), hipPitchA: r(self.standingBody.hip.angle * DEG),
      bodySpeedAlong: r(self.standingBody.speed, 5),
    };
    if (ticked && pred) prep.ctl = controllerRow(pred);
    watch.prep = prep;
  };
  AR.settleStanding = function (this: AttachedRider, x: Float64Array, h: number, b: BoardBody): boolean {
    const ok = settleStanding.call(this, x, h, b) as boolean;
    if (this === rider && watch.prep) {
      const self = this as Any;
      const ax = axes(b.orientation);
      const j = self.impulse as Vector3;
      const p = self.projected as Vector3;
      watch.settle = {
        feasible: ok ? 1 : 0, limit: self.limit, freeX: r(self.desiredCop.x, 5), freeZ: r(self.desiredCop.z, 5),
        jx: r(j.dot(ax.x), 6), jy: r(j.dot(ax.y), 6), jz: r(j.dot(ax.z), 6), px: r(p.dot(ax.x), 6), py: r(p.dot(ax.y), 6), pz: r(p.dot(ax.z), 6),
        x: Array.from(x.slice(0, 9)).map((v) => r(v, 7)), ankleImpl: r(((h * 800 + 80) * x[7]) / self.legLength),
      };
    }
    return ok;
  };
  AR.finish = function (this: AttachedRider, h: number, b: BoardBody): void {
    if (this !== rider) return finish.call(this, h, b);
    const pre = watch.pre;
    const prep = watch.prep;
    const mid = pre && prep ? snap(b, this) : undefined;
    const st = this.human.state;
    const cpBefore = { x: st.across, z: st.along };
    finish.call(this, h, b);
    watch.pre = undefined; watch.prep = undefined;
    if (!pre || !prep || !mid) return;
    const self = this as Any;
    const after: Snap = { ...mid, rp: this.position.clone(), rv: this.velocity.clone() };
    const ax0 = axes(pre.bq);
    const ax1 = axes(after.bq);
    const f0 = feetOf(this, b, pre);
    const f1 = feetOf(this, b, after);
    const vf0 = velAt(pre, f0);
    const vf1 = velAt(after, f1);
    const rel0 = new Vector3().subVectors(pre.rv, vf0);
    const rel1 = new Vector3().subVectors(after.rv, vf1);
    const felt1 = (self.captureFelt as Vector3).clone();
    const feltPrev = watch.lastFelt ?? felt1;
    const off0 = new Vector3().subVectors(pre.rp, f0).applyQuaternion(ax0.inv);
    const off1 = new Vector3().subVectors(after.rp, f1).applyQuaternion(ax1.inv);
    const vel0 = rel0.clone().applyQuaternion(ax0.inv);
    const vel1 = rel1.clone().applyQuaternion(ax1.inv);
    const split: Record<string, unknown> = {};
    for (const axis of ['x', 'z'] as const) {
      const e0 = axis === 'x' ? ax0.x : ax0.z;
      const e1 = axis === 'x' ? ax1.x : ax1.z;
      const dRider = e1.dot(new Vector3().subVectors(after.rv, pre.rv));
      const dBoardT = -e1.dot(new Vector3().subVectors(after.bv, pre.bv));
      const rotF0 = new Vector3().crossVectors(pre.bw, new Vector3().subVectors(f0, pre.bc));
      const rotF1 = new Vector3().crossVectors(after.bw, new Vector3().subVectors(f1, after.bc));
      const dBoardR = -e1.dot(new Vector3().subVectors(rotF1, rotF0));
      const dFrame = new Vector3().subVectors(e1, e0).dot(rel0);
      const c0 = captureOf(off0, vel0, feltPrev, axis);
      const c1 = captureOf(off1, vel1, felt1, axis);
      const w1 = c1.omega;
      const dPos = off1[axis] - off0[axis];
      const feltPos = -(c1.H * c1.n - c0.H * c0.n);
      const feltVel = -(c1.along * c1.n - c0.along * c0.n) / w1;
      const omegaTerm = c0.v * (1 / w1 - 1 / c0.omega);
      const sum = dPos + (dRider + dBoardT + dBoardR + dFrame) / w1 + feltPos + feltVel + omegaTerm;
      const engine = axis === 'x' ? st.across : st.along;
      split[axis] = {
        cp: r(c1.cp, 6), cpOk: Math.abs(c1.cp - engine) < 1e-7 || this.human.frozen ? 1 : 0, cp0Ok: Math.abs(c0.cp - cpBefore[axis]) < 1e-7 || this.human.frozen ? 1 : 0,
        dcp: r(c1.cp - c0.cp, 7), dPos: r(dPos, 7), dVrider: r(dRider / w1, 7), dVboardT: r(dBoardT / w1, 7), dVboardR: r(dBoardR / w1, 7), dVframe: r(dFrame / w1, 7),
        dFeltPos: r(feltPos, 7), dFeltVel: r(feltVel, 7), dOmega: r(omegaTerm, 7), splitOk: Math.abs(sum - (c1.cp - c0.cp)) < 1e-9 ? 1 : 0,
        p: r(c1.p, 6), v: r(c1.v, 5), n: r(c1.n, 6), off: r(off1[axis], 6), vel: r(vel1[axis], 5),
        bAcc: r(e1.dot(new Vector3().subVectors(after.bv, pre.bv)) / h, 4), rAcc: r(e1.dot(new Vector3().subVectors(after.rv, pre.rv)) / h, 4),
      };
    }
    const water: Record<string, number | null> = {};
    let waterX = 0;
    let waterZ = 0;
    for (const k of FORCE_KEYS) {
      const d = new Vector3().subVectors((b.forces as Any)[k], pre.f[k]);
      waterX += d.dot(ax1.x);
      waterZ += d.dot(ax1.z);
      water[k] = r(d.dot(ax1.x) / h, 3);
    }
    const s = watch.settle ?? {};
    watch.settle = undefined;
    watch.lastFelt = felt1;
    emit({
      kind: 'sub', cell: watch.cell, t: r(watch.clock, 6), sub: watch.sub, ...prep, ...s, ...split,
      H: r(st.height, 4), omega: r(st.omega, 4), frozen: this.human.frozen ? 1 : 0, fallen: this.human.fallen ? 1 : 0, beyond: st.beyond ? 1 : 0, weightPast: st.weightPast ? 1 : 0,
      past: r(st.past, 5), waterX: r(waterX / h, 3), waterZ: r(waterZ / h, 3), water,
      contactX: r(-(((s.feasible as number) === 1 ? (s.jx as number) : (s.px as number)) ?? Number.NaN) / h, 3),
      contactZ: r(-(((s.feasible as number) === 1 ? (s.jz as number) : (s.pz as number)) ?? Number.NaN) / h, 3),
      bwRoll: r(after.bw.dot(ax1.z) * DEG, 3), bwYaw: r(after.bw.dot(ax1.y) * DEG, 3), bwPitch: r(after.bw.dot(ax1.x) * DEG, 3),
    });
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
const actualRail = { value: 0 };
/**
 * `GAIN_SCALE=<j>:<s>` (diagnostic only, never a fix): the blended design's ankle gain on state j scaled by s each tick
 * (j 0 the board's roll, 2 the body's bank), to test whether the common-mode "steer into the lean" drives the spiral.
 */
if (env.GAIN_SCALE) {
  const [j, s] = env.GAIN_SCALE.split(':').map(Number);
  const PC = PredictiveController.prototype as Any;
  const blend = PC.blend;
  PC.blend = function (this: unknown, ...args: unknown[]) {
    const d = blend.apply(this, args);
    d.k[0][j] *= s;
    return d;
  };
}
/**
 * `WARM=1` (diagnostic only): the balance starts from the posture it is placed in instead of from nothing. After the
 * mount, the ankle's lagged rest is the mounted ankle angle (`bank − roll`, so the passive spring starts unloaded), and
 * the predictor's estimate and its line of commands already sent hold that posture (model signs: φ = −roll, θ = −bank,
 * δ = −rest), so its first command acts on the state the body is in rather than on zero.
 */
if (env.WARM === '1') {
  const AR = AttachedRider.prototype as Any;
  const mount = AR.mount;
  AR.mount = function (this: Any, b: BoardBody): void {
    mount.call(this, b);
    if (!this.newRider || !this.freeBody) return;
    const up = new Vector3(0, 1, 0).applyQuaternion(b.orientation);
    const side = new Vector3(1, 0, 0).applyQuaternion(this.heading);
    const roll = Math.atan2(up.dot(side), up.y);
    const rest = this.bank.angle - roll;
    this.human.rollRest = rest;
    this.ankleRest = rest;
    this.heldAnkleRaw = rest;
    const pred = this.predictor;
    const e = new Array<number>(12).fill(0);
    e[0] = -roll; e[2] = -this.bank.angle; e[8] = -rest;
    pred.estimate = e;
    pred.commands.length = 0;
    for (let i = 0; i < 7; i += 1) pred.commands.push([-rest, 0]);
    emit({ kind: 'warm', roll: r(roll * DEG), bank: r(this.bank.angle * DEG), rest: r(rest * DEG) });
  };
}
const faceTiltNow = { value: 0 };
if (SCHED_RAIL === 'actual' || SCHED_RAIL === 'face') {
  // 'actual': the board's own rail against the water; 'face': the rail a LEVEL board holds on this face (the face's
  // own tilt across the heading, `roll − rail`), or the lean asked's rail when that is larger.
  const AR = AttachedRider.prototype as Any;
  const bank = AR.predictiveBank;
  AR.predictiveBank = function (this: unknown, h: number, roll: number, rail: number, rollRate: number) {
    actualRail.value = rail;
    faceTiltNow.value = roll - rail;
    return bank.call(this, h, roll, rail, rollRate);
  };
  const PC = PredictiveController.prototype as Any;
  const tick = PC.tick;
  PC.tick = function (this: unknown, sense: readonly number[], speed: number, depth: number, bankAsked: number, twistAsked: number, limits: unknown, rail: number, tilt: number) {
    const sched = SCHED_RAIL === 'actual' ? Math.abs(actualRail.value) : Math.max(rail, Math.abs(faceTiltNow.value));
    return tick.call(this, sense, speed, depth, bankAsked, twistAsked, limits, sched, tilt);
  };
}
if (PLACE_LEVEL) {
  const RS = (session.constructor as Any).prototype;
  const place = RS.place;
  RS.place = function (this: Any, placement: RiderPlacement, w: SurfWater): void {
    place.call(this, placement, w);
    const b = this.board as BoardBody;
    const fwd = new Vector3(0, 0, 1).applyQuaternion(b.orientation);
    const left = new Vector3(1, 0, 0).applyQuaternion(b.orientation);
    // The deck's tilt across: its left axis's rise. Turn about the forward axis until it is level (whichever sign of
    // the turn levels it; checked by the left axis's rise after it).
    const across = Math.asin(Math.max(-1, Math.min(1, left.y)));
    fwd.normalize();
    const turned = (angle: number) => new Quaternion().setFromAxisAngle(fwd, angle).multiply(b.orientation);
    const rise = (q: Quaternion) => Math.abs(new Vector3(1, 0, 0).applyQuaternion(q).y);
    const q = rise(turned(across)) < rise(turned(-across)) ? turned(across) : turned(-across);
    b.place(b.position.clone(), q, b.velocity.clone(), b.angularVelocity.clone());
    emit({ kind: 'placeLevel', across: r(across * DEG, 3), after: r(Math.asin(new Vector3(1, 0, 0).applyQuaternion(b.orientation).y) * DEG, 4) });
    this.rider.mountPosture = placement.posture;
    b.attach(this.rider);
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The frame row.
// ---------------------------------------------------------------------------------------------------------------
const sample = { flowX: 0, flowZ: 0 };
function frameRow(t: number, cell: string): Record<string, unknown> {
  const self = rider as Any;
  const ax = axes(board.orientation);
  const heading = self.heading as Quaternion;
  const side = new Vector3(1, 0, 0).applyQuaternion(heading);
  const fwdH = new Vector3(0, 0, 1).applyQuaternion(heading);
  const boardUp = ax.y;
  const roll = Math.atan2(boardUp.dot(side), boardUp.y);
  const waterUp = self.waterUp as Vector3;
  const faceTilt = Math.atan2(waterUp.dot(side), waterUp.y);
  const pitch = Math.asin(Math.max(-1, Math.min(1, ax.z.y)));
  const facePitch = Math.atan2(-waterUp.dot(fwdH), waterUp.y);
  const st = rider.human.state;
  const status = runner.status().ride;
  const pred = self.predictor;
  const sup = self.support as { xMin: number; xMax: number; zMin: number; zMax: number };
  void sample;
  return {
    kind: 'frame', cell, t: r(t, 5), phase: session.phase, attached: rider.attached ? 1 : 0, sep: session.separation ?? null,
    speedThrough: r(self.leanProbe.speedThrough), planing: self.planing ? 1 : 0, ground: r(Math.hypot(board.velocity.x, board.velocity.z)),
    heading: r(Math.atan2(ax.z.x, ax.z.z) * DEG, 3), course: r(Math.atan2(board.velocity.x, board.velocity.z) * DEG, 3),
    roll: r(roll * DEG), faceTilt: r(faceTilt * DEG), rail: r((roll - faceTilt) * DEG), pitch: r(pitch * DEG), facePitch: r(facePitch * DEG),
    yawRate: r(board.angularVelocity.dot(ax.y) * DEG, 3), rollRate: r(board.angularVelocity.dot(ax.z) * DEG, 3), pitchRate: r(board.angularVelocity.dot(ax.x) * DEG, 3),
    slip: r(Math.atan2(board.velocity.dot(ax.x), board.velocity.dot(ax.z)) * DEG, 3),
    bank: r(self.bank.angle * DEG), bankRate: r(self.bank.rate * DEG, 3), ankle: r((self.bank.angle - roll) * DEG),
    rest: r(self.ankleRest * DEG), heldRaw: r(self.heldAnkleRaw * DEG), room: r(self.ankleRoom * DEG, 3), bite: r(self.ankleBite * DEG, 3),
    ankleT: r(self.ankleTorque, 3), swingT: r(self.swingTorque, 3), swingA: r(self.swing.angle * DEG, 3), swingLag: r(self.swingLagged, 3),
    twA: r(self.twistBody?.angle * DEG, 3), twR: r(self.twistBody?.rate * DEG, 3), twActive: r(self.twistBody?.active, 3), heldTwist: r(self.heldTwist, 3), twistT: r(self.twistTorque, 3),
    legRest: r(self.leg?.rest, 4), legExt: r(self.leg?.extension, 4), legLoad: r(self.legLoad, 3), captureLoad: r(self.captureLoad, 3), knees: r(rider.human.knees, 3), arms: r(rider.human.arms, 3),
    leanAsked: r(self.leanAsked * DEG, 3), schedRail: r(self.schedRail * DEG, 3), cap: r(self.leanProbe.cap * DEG, 3),
    // Step 3.5s: the line `holdLine` latched (world heading, deg), the heading from it (game sign), and the hold's last tick.
    line: self.standingLine === undefined ? null : r(self.standingLine * DEG, 3), lineErr: r(self.standingLineError * DEG, 3),
    holdPsi: r(pred?.holdHeading * DEG, 3), holdBank: r(pred?.holdBank * DEG, 3),
    cpX: r(st.across, 5), cpZ: r(st.along, 5), past: r(st.past, 5), pastX: r(st.pastAcross, 5), beyond: st.beyond ? 1 : 0, weightPast: st.weightPast ? 1 : 0, margin: r(st.margin, 4),
    pX: r(st.pointAcross, 5), vX: r(st.speedAcross, 5), offX: r(st.offsetAcross, 5), feltX: r(st.feltAcross, 5), H: r(st.height, 4), omega: r(st.omega, 3), frozen: rider.human.frozen ? 1 : 0,
    sup: [r(sup.xMin, 3), r(sup.xMax, 3), r(sup.zMin, 3), r(sup.zMax, 3)], limit: self.limit, feasible: self.feasible ? 1 : 0, wantX: r(self.desiredCop?.x, 5), wantZ: r(self.desiredCop?.z, 5),
    pitchRest: r(self.standingBody?.rest * DEG), pitchRef: r(self.standingBody?.reference * DEG), pitchAngle: r(self.standingBody?.pitch?.angle * DEG), pitchTorque: r(self.standingBody?.torque, 3),
    hipPitchA: r(self.standingBody?.hip?.angle * DEG, 3), hipPitchT: r(self.standingBody?.hip?.torque, 3), bodySpeedAlong: r(self.standingBody?.speed, 4),
    faceH: r(status?.wave.faceHeight, 3), faceFrac: r(status?.wave.faceFraction, 3), ahead: r(status?.wave.aheadOfCrest, 3), curl: r(status?.wave.curlDistance, 3), balance: r(status?.balance, 3),
    ctl: self.predictive ? controllerRow(pred) : undefined,
    ...(LEDGER ? { rollLedger: Object.fromEntries(Object.entries(board.roll).map(([k, v]) => [k, r(v as number, 3)])), yawLedger: Object.fromEntries(Object.entries(board.yaw).map(([k, v]) => [k, r(v as number, 3)])) } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The runs.
// ---------------------------------------------------------------------------------------------------------------
const cells: { dh: number; dx: number; dv: number }[] = [];
if (env.GRID === '1') {
  for (const dh of [-5, 0, 5]) for (const dx of [-1, 0, 1]) for (const dv of [-0.5, 0, 0.5]) cells.push({ dh, dx, dv });
} else cells.push({ dh: Number(env.DH ?? 0), dx: Number(env.DX ?? 0), dv: Number(env.DV ?? 0) });
const baseHeading = (base.heading * 180) / Math.PI;
emit({ kind: 'control', search, rider: RIDER, seconds: SECONDS, probe: PROBE_ON ? 'on' : 'off', subFrom: SUB_FROM, subTo: SUB_TO, schedFloor: SCHED_FLOOR ?? null, hipOff: HIP_OFF ? 1 : 0, schedRail: SCHED_RAIL ?? null, placeLevel: PLACE_LEVEL ? 1 : 0, steer: STEER, warm: env.WARM === '1' ? 1 : 0, gainScale: env.GAIN_SCALE ?? null, ledger: LEDGER ? 1 : 0, base, cells: cells.length });
for (const c of cells) {
  const cell = `${c.dh}|${c.dx}|${c.dv}`;
  simulation.importState(start);
  runner.invalidateTubeApproach();
  const placement: RiderPlacement = { ...base, x: base.x + c.dx, heading: ((baseHeading + c.dh) * Math.PI) / 180, speed: base.speed + c.dv };
  watch.on = false; watch.clock = 0; watch.sub = 0; watch.cell = cell; watch.lastFelt = undefined;
  let fell = Number.NaN;
  let built: Record<string, unknown> | undefined;
  for (let step = 0; step < Math.round(SECONDS / SURF_ZONE_STEP); step += 1) {
    const t = (step + 1) * SURF_ZONE_STEP;
    // The instrument's clock: seconds since the placement at the START of this frame (the placing frame is step 0).
    watch.clock = step * SURF_ZONE_STEP;
    watch.on = step > 0;
    runner.advance(1, { paddle: false, popUp: false, steer: STEER, retry: false, ...(step === 0 ? { place: placement } : {}) });
    if (step === 0) {
      // Print back what the host actually built (the switch's own read, never the URL).
      const w = (rider as Any).predictor?.weights;
      built = { kind: 'built', cell, plantFloor: w?.plantFloor ?? null, waterHeel: w?.waterHeel ?? null, configWaterHeel: (config as Any).waterHeel ?? null, faceTrim: w?.faceTrim ?? null, configFaceTrim: (config as Any).faceTrim ?? null, holdLine: w?.holdLine ?? null, configHoldLine: (config as Any).holdLine ?? null, riderBody: w?.riderBody ?? null, stanceDeep: w?.stanceDeep ?? null, deckFelt: (rider as Any).deckFelt ?? null, newRider: (rider as Any).newRider, predictive: (rider as Any).predictive, substeps: rider.standingSubsteps ?? null, configPlantFloor: (config as Any).plantFloor ?? null, plantSpeed: w?.plantSpeed ?? null, configPlantSpeed: (config as Any).plantSpeed ?? null };
      emit(built);
    }
    if (FRAMES) emit(frameRow(t, cell));
    if (runner.status().ride?.phase === 'fallen' || !rider.attached) { fell = t; break; }
  }
  emit({ kind: 'summary', cell, ...c, fell: r(fell, 5), censored: Number.isNaN(fell) ? 1 : 0, seconds: SECONDS, sep: session.separation ?? null });
}
