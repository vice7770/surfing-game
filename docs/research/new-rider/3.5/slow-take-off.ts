/**
 * **Step 3.5t: the slow take-off falls (the owner's Group A, with the work order's lead B).**
 *
 * MEASUREMENT ONLY. Nothing under `src/` is changed by this file. Two drives, one row format:
 *
 *  * `MODE=catch` — the test wave's catch start (`?testWave=catch`, `TEST_WAVE_STARTS.catch`), on the game's own
 *    `SurfZoneRunner` exactly as `scripts/test-wave-probe.ts runs` drives it: the recorded sea restored, the rider placed
 *    prone, paddling from `RUN × 0.1 s`, popping at the HUD's cue. ONE RUN PER PROCESS (`RUN`, `SCRIPT`).
 *  * `MODE=organic` — 3.5o's take-off drive (`sharp-steer.ts`, itself `take-off/four-numbers.ts` verbatim) on the
 *    owner's Canyon address: riders placed prone at rest at the game's lineup, paddling, sprinting, popping at the cue.
 *    One seed per process (`SEED`, `PERIODS`); the riders read the water and never push it, as in every organic bench.
 *
 * Scripts (`SCRIPT` for catch, `SCRIPTS` for organic):
 *  * `cue`  — pop at the cue, then the stick at zero and nothing pressed.
 *  * `cueC` — pop at the cue, then Compress held (1) from `C_AT` s after the stand (default 0.2: the owner's 0.1–0.3 s).
 *  * `paddle` (catch only) — never pop: keep paddling (and sprinting) past the cue, and log the board until the crest
 *    has passed. Question 5.
 *
 * Per frame (`kind: 'f'`): the board's speed over the ground and through the water (the latch's own measure), the latch,
 * the lean cap and ask, the leg's load, both feet's depth, the wetted hull and its submerged volume, the hull's four
 * vertical forces as a share of the pair's weight, the deck's pitch and the bottom's immersion at nose and tail, the
 * fore/aft balance (the demanded centre of pressure, its along headroom, the capture point along and its pasts, the
 * pitch ankle's angle/reference/rest/torque, the pitch hip, the leg's rest and the Compress asked).
 *
 * ⭐ **The fore/aft ledger** (`LEDGER=on`, the default): `bankLedger` is switched on (it is asserted byte-identical
 * on/off by `bankLedger.test.ts`) only so its `book*` calls run; this file mirrors every booking into its own copy of `b`
 * and, at each standing solve, solves `A x = b_source` for every source on its own LU of the game's `A`. Booked per frame:
 * the body's along-speed change `x[8]` (m/s; + toward the nose, along the body's own forward axis), the board's pitch-rate
 * change `x[3..5]·x̂_board` (rad/s; + noses DOWN, the right-hand sense about the board's +x) and its heave `x[1]` (m/s),
 * per source. They sum to the solve's own answer (`closeAlong`, `closePitch` are the worst gaps over the frame).
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/slow-take-off.ts -o <s>/raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '' };\n" > <s>/sto.mjs && cat <s>/raw.mjs >> <s>/sto.mjs
 *   env MODE=catch RUN=0 SCRIPT=cueC OUT=<s>/c-cueC-0.jsonl node --max-old-space-size=3200 <s>/sto.mjs
 *   env MODE=organic SEED=1 PERIODS=12 SCRIPTS=cue,cueC OUT=<s>/o-s1.jsonl node --max-old-space-size=3200 <s>/sto.mjs
 *
 * `EXTRA='&switch=value'` appends switches to the address (an arm), parsed by the game's own config path and printed
 * back from the host that was built (`kind: 'built'`).
 */
import { appendFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import { TEST_WAVE_STARTS, testWaveOverrides } from '../../../../src/game/testWave';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { bankLedger, BANK_SOURCES } from '../../../../src/physics/bankLedger';
import type { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { RideSession, type RiderPlacement } from '../../../../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { inTakeOffWindow } from '../../../../src/physics/takeOffCue';
import { WaveFrameGauge, type WaveFrame } from '../../../../src/physics/waveFrame';
import { SURF_ZONE_STEP, SurfZoneRunner, type RideRequest } from '../../../../src/wave/SurfZoneRunner';
import { SurfZoneSimulation, rideLineupAlong, rideLineupOffset, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';
import { TEST_WAVE } from '../../../../src/wave/testWave';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const G = 9.81;
const MODE = process.env.MODE ?? 'catch';
const OWNER = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const EXTRA = process.env.EXTRA ?? '';
const C_AT = Number(process.env.C_AT ?? 0.2);
const STAND_HOLD = Number(process.env.STAND_HOLD ?? 3);
const LEDGER = process.env.LEDGER !== 'off';
const OUT = process.env.OUT;
const r = (x: number | undefined | null, n = 3): number | null => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};

// ---------------------------------------------------------------------------------------------------------------
// The fore/aft ledger: a mirror of `bankLedger`'s partition of `b`, solved per source on the game's own `A`.
// ---------------------------------------------------------------------------------------------------------------
const NS = BANK_SOURCES.length;
const mirror = new Float64Array(NS * 9);
const luA = new Float64Array(81);
const piv = new Int32Array(9);
const xs = new Float64Array(9);
interface Acc { along: Float64Array; pitch: Float64Array; heave: Float64Array; closeAlong: number; closePitch: number; solves: number }
const newAcc = (): Acc => ({ along: new Float64Array(NS), pitch: new Float64Array(NS), heave: new Float64Array(NS), closeAlong: 0, closePitch: 0, solves: 0 });
let current: { rider: AttachedRider; board: BoardBody } | undefined;
const accs = new Map<AttachedRider, Acc>();

function factor(a: Float64Array, n: number): boolean {
  for (let i = 0; i < n; i += 1) piv[i] = i;
  for (let k = 0; k < n; k += 1) {
    let p = k;
    let best = Math.abs(a[k * n + k]);
    for (let i = k + 1; i < n; i += 1) if (Math.abs(a[i * n + k]) > best) { best = Math.abs(a[i * n + k]); p = i; }
    if (!(best > 0)) return false;
    if (p !== k) {
      for (let j = 0; j < n; j += 1) { const t = a[k * n + j]; a[k * n + j] = a[p * n + j]; a[p * n + j] = t; }
      const t = piv[k]; piv[k] = piv[p]; piv[p] = t;
    }
    for (let i = k + 1; i < n; i += 1) {
      const f = a[i * n + k] / a[k * n + k];
      a[i * n + k] = f;
      for (let j = k + 1; j < n; j += 1) a[i * n + j] -= f * a[k * n + j];
    }
  }
  return true;
}
function substitute(a: Float64Array, n: number, b: ArrayLike<number>, off: number, out: Float64Array): void {
  for (let i = 0; i < n; i += 1) {
    let s = b[off + piv[i]];
    for (let j = 0; j < i; j += 1) s -= a[i * n + j] * out[j];
    out[i] = s;
  }
  for (let i = n - 1; i >= 0; i -= 1) {
    let s = out[i];
    for (let j = i + 1; j < n; j += 1) s -= a[i * n + j] * out[j];
    out[i] = s / a[i * n + i];
  }
}

function installLedger(): void {
  bankLedger.on = true;
  const L = bankLedger as Any;
  const idx = (s: string) => BANK_SOURCES.indexOf(s as Any) * 9;
  const beginSubstep = L.beginSubstep;
  L.beginSubstep = function (...a: unknown[]) { mirror.fill(0); return beginSubstep.apply(this, a); };
  const bookBoard = L.bookBoard;
  L.bookBoard = function (s: string, fx: number, fy: number, fz: number, tx: number, ty: number, tz: number) {
    const at = idx(s);
    mirror[at] += fx; mirror[at + 1] += fy; mirror[at + 2] += fz; mirror[at + 3] += tx; mirror[at + 4] += ty; mirror[at + 5] += tz;
    return bookBoard.call(this, s, fx, fy, fz, tx, ty, tz);
  };
  const bookRow = L.bookRow;
  L.bookRow = function (s: string, row: number, v: number) { mirror[idx(s) + row] += v; return bookRow.call(this, s, row, v); };
  const bookTorque = L.bookTorque;
  L.bookTorque = function (s: string, tx: number, ty: number, tz: number) {
    const at = idx(s);
    mirror[at + 3] += tx; mirror[at + 4] += ty; mirror[at + 5] += tz;
    return bookTorque.call(this, s, tx, ty, tz);
  };
  const bookBody = L.bookBody;
  L.bookBody = function (s: string, fx: number, fy: number, fz: number, ax: number, ay: number, az: number, nx: number, ny: number, nz: number,
    tx: number, ty: number, tz: number, wx: number, wy: number, wz: number, banking: boolean, free: boolean) {
    const at = idx(s);
    mirror[at] += fx; mirror[at + 1] += fy; mirror[at + 2] += fz;
    mirror[at + 3] += ay * fz - az * fy; mirror[at + 4] += az * fx - ax * fz; mirror[at + 5] += ax * fy - ay * fx;
    mirror[at + 6] += nx * fx + ny * fy + nz * fz;
    if (banking) mirror[at + 7] += tx * fx + ty * fy + tz * fz;
    if (free) mirror[at + 8] += wx * fx + wy * fy + wz * fz;
    return bookBody.call(this, s, fx, fy, fz, ax, ay, az, nx, ny, nz, tx, ty, tz, wx, wy, wz, banking, free);
  };
  const solve = L.solve;
  L.solve = function (system: Float64Array, rhs: Float64Array, n: number, ...rest: unknown[]) {
    const c = current;
    const acc = c ? accs.get(c.rider) : undefined;
    if (c && acc && n === 9) {
      for (let i = 0; i < 81; i += 1) luA[i] = system[i];
      if (factor(luA, 9)) {
        const e = c.board.orientation;
        const bx = new Vector3(1, 0, 0).applyQuaternion(e);
        let sa = 0, sp = 0;
        for (let s = 0; s < NS; s += 1) {
          substitute(luA, 9, mirror, s * 9, xs);
          const p = xs[3] * bx.x + xs[4] * bx.y + xs[5] * bx.z;
          acc.along[s] += xs[8]; acc.pitch[s] += p; acc.heave[s] += xs[1];
          sa += xs[8]; sp += p;
        }
        substitute(luA, 9, rhs, 0, xs);
        acc.closeAlong = Math.max(acc.closeAlong, Math.abs(sa - xs[8]));
        acc.closePitch = Math.max(acc.closePitch, Math.abs(sp - (xs[3] * bx.x + xs[4] * bx.y + xs[5] * bx.z)));
        acc.solves += 1;
      }
    }
    return solve.call(this, system, rhs, n, ...rest);
  };
  const AR = AttachedRider.prototype as Any;
  const prepare = AR.prepare;
  AR.prepare = function (this: AttachedRider, h: number, board: BoardBody, w: SurfWater) {
    current = { rider: this, board };
    return prepare.call(this, h, board, w);
  };
}
if (LEDGER) installLedger();
function drainLedger(rider: AttachedRider): Record<string, unknown> | undefined {
  const acc = accs.get(rider);
  if (!acc) return undefined;
  const pick = (a: Float64Array, n: number) => {
    const o: Record<string, number> = {};
    for (let s = 0; s < NS; s += 1) if (Math.abs(a[s]) > 10 ** -n) o[BANK_SOURCES[s]] = Number(a[s].toFixed(n));
    return o;
  };
  const out = { along: pick(acc.along, 5), pitchDn: pick(acc.pitch, 5), heave: pick(acc.heave, 5), closeAlong: r(acc.closeAlong, 9), closePitch: r(acc.closePitch, 9), solves: acc.solves };
  accs.set(rider, newAcc());
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The row.
// ---------------------------------------------------------------------------------------------------------------
const sample = createWaterSample();
const tmp = new Vector3();
interface Wave { faceH: number; faceFrac: number; ahead: number; crest: number; valid: boolean; shoreward: number }
function row(session: RideSession, water: SurfWater, wave: Wave): Record<string, unknown> {
  const board = session.board;
  const rd = session.rider as Any;
  const q = board.orientation;
  const fwd = new Vector3(0, 0, 1).applyQuaternion(q);
  const left = new Vector3(1, 0, 0).applyQuaternion(q);
  const under = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
  const flowX = under.outsideDomain ? 0 : under.flowX;
  const flowZ = under.outsideDomain ? 0 : under.flowZ;
  const vW = Math.hypot(board.velocity.x - flowX, board.velocity.z - flowZ);
  const fl = Math.hypot(fwd.x, fwd.z) || 1;
  const vAlong = ((board.velocity.x - flowX) * fwd.x + (board.velocity.z - flowZ) * fwd.z) / fl;
  const slopeFall = -(under.slopeX * fwd.x + under.slopeZ * fwd.z) / fl; // surface falling ahead of the nose, tan
  const W = (board.mass + rd.mass) * G;
  const F = board.forces;
  // Nose and tail of the bottom (board frame y 0 is the lowest bottom point), 5 cm in from each end.
  const L = board.shape.length;
  const imm = (z: number): number => {
    const p = board.toWorld(tmp.set(0, board.shape.curves.rocker(z / L + 0.5), z), new Vector3());
    return water.surfaceAt(p.x, p.z) - p.y;
  };
  const nose = imm(L / 2 - 0.05);
  const tail = imm(-L / 2 + 0.05);
  const feet: number[] = [];
  for (const i of [5, 6]) {
    const p = session.renderPoint(i, new Vector3());
    feet.push(water.surfaceAt(p.x, p.z) - p.y);
  }
  const out: Record<string, unknown> = {
    ph: session.phase, vG: r(Math.hypot(board.velocity.x, board.velocity.z)), vW: r(vW), vA: r(vAlong), plan: rd.planing ? 1 : 0,
    cap: r(rd.leanProbe.cap * DEG, 2), ask: r(rd.leanProbe.ask * DEG, 2), cueRider: rd.popUpCue ? 1 : 0,
    legBw: r(rd.legLoad / (rd.mass * G)), wet: r(board.wettedArea), subL: r(board.submergedVolume * 1000, 2),
    Fb: r(F.buoyancy.y / W), Fp: r(F.pressure.y / W), Fs: r(F.suction.y / W), Fam: r(F.addedMass.y / W), Ffr: r(F.friction.y / W),
    dragA: r(-(F.pressure.dot(fwd) + F.friction.dot(fwd) + F.addedMass.dot(fwd) + F.buoyancy.dot(fwd))),
    pitch: r(Math.asin(fwd.y) * DEG, 2), roll: r(Math.asin(left.y) * DEG, 2), nose: r(nose), tail: r(tail),
    footF: r(feet[0]), footR: r(feet[1]), fall: r(Math.atan(slopeFall) * DEG, 2),
    faceH: r(wave.faceH), faceFrac: r(wave.faceFrac), ahead: r(wave.ahead), crest: r(wave.crest), shore: r(wave.shoreward),
  };
  if (session.phase === 'standing' || session.phase === 'landing') {
    const sup = rd.support as { xMin: number; xMax: number; zMin: number; zMax: number };
    const midZ = (sup.zMin + sup.zMax) / 2;
    const midX = (sup.xMin + sup.xMax) / 2;
    const half = (sup.zMax - sup.zMin) / 2;
    const feetHalf = (rd.feet.front - rd.feet.rear) / 2;
    const copZ = rd.desiredCop.z - midZ;
    const s = rd.human.state;
    const sb = rd.standingBody;
    Object.assign(out, {
      copZ: r(copZ, 4), copX: r(rd.desiredCop.x - midX, 4), halfZ: r(half, 3), feetHalf: r(feetHalf, 3),
      headZ: r(1 - Math.max(0, Math.abs(copZ) - feetHalf) / Math.max(1e-6, half - feetHalf), 4),
      headX: r(1 - Math.abs(rd.desiredCop.x - midX) / ((sup.xMax - sup.xMin) / 2), 4),
      rawMargin: r(rd.rawMargin, 4), limit: rd.limit, tipMem: r(rd.limitTime.tip, 4), loaded: rd.loaded ? 1 : 0,
      capZ: r(s.along, 4), capX: r(s.across, 4), front: r(sup.zMax - midZ, 3), back: r(midZ - sup.zMin, 3),
      pastZ: r(Math.max(0, s.along - (sup.zMax - midZ), -s.along - (midZ - sup.zMin)), 4), pastX: r(Math.max(0, Math.abs(s.across) - (sup.xMax - sup.xMin) / 2), 4),
      beyond: s.beyond ? 1 : 0, wPast: s.weightPast ? 1 : 0, margin: r(s.margin, 4), capH: r(s.height, 3),
      ank: r(sb.pitch.angle * DEG, 2), ref: r(sb.reference * DEG, 2), rest: r(sb.rest * DEG, 2), deckP: r(sb.deckPitch * DEG, 2),
      ankT: r(sb.torque, 1), hip: r(sb.hip.angle * DEG, 2), hipT: r(sb.hip.torque, 1), feltDev: r(sb.felt * DEG, 2), active: r(sb.active * DEG, 2),
      legRest: r(rd.leg.rest, 3), legExt: r(rd.leg.extension, 3), compress: r(rd.compress, 2), trim: r(rd.trim, 2), copT: r(rd.copTarget.z, 4),
      bank: r(rd.bank.angle * DEG, 2),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=catch: the test wave, one run per process.
// ---------------------------------------------------------------------------------------------------------------
function catchMode(): void {
  const RUN = Number(process.env.RUN ?? 0);
  const SCRIPT = process.env.SCRIPT ?? 'cue';
  const SECONDS = Number(process.env.SECONDS ?? 12);
  const search = `${OWNER}&testWave=catch${EXTRA}`;
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = { ...physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' }), tide: 0, windSpeed: 0 };
  const config = surfZoneConfigFor(settings, TEST_WAVE.seed, false, testWaveOverrides('catch', undefined)) as SurfZoneConfig & Record<string, unknown>;
  const wall = Date.now();
  const runner = new SurfZoneRunner(config, { rider: true });
  const { simulation } = runner;
  const start = simulation.exportState();
  const session = runner.session!;
  emit({ kind: 'control', mode: 'catch', run: RUN, script: SCRIPT, search, rider: config.rider, canyonBed: config.canyonBed, testWave: (config as Any).testWave, seaTime: simulation.seaTime, spinUp: (Date.now() - wall) / 1000, cAt: C_AT, ledger: LEDGER });
  if (config.rider !== 'new') { emit({ fatal: 'address' }); process.exit(2); }
  simulation.importState(start);
  runner.invalidateTubeApproach();
  const placement: RiderPlacement = TEST_WAVE_STARTS.catch.placement;
  const delay = Math.round((0.1 * RUN) / SURF_ZONE_STEP);
  let cueAt = Number.NaN, popAt = Number.NaN, standAt = Number.NaN, fellAt = Number.NaN, passedAt = Number.NaN;
  let popped = false;
  let built = false;
  const total = Math.round(SECONDS / SURF_ZONE_STEP);
  for (let step = 0; step < total; step += 1) {
    const t = (step + 1) * SURF_ZONE_STEP;
    const st0 = runner.status().ride;
    const lying = st0 ? st0.phase === 'prone' : true;
    const cue = st0?.cue ?? false;
    if (lying && cue && Number.isNaN(cueAt) && step > 0) cueAt = t - SURF_ZONE_STEP;
    const popUp = SCRIPT !== 'paddle' && !popped && !Number.isNaN(cueAt);
    if (popUp) { popped = true; popAt = t; }
    const since = Number.isNaN(standAt) ? -1 : t - standAt;
    const compress = SCRIPT === 'cueC' && since >= C_AT ? 1 : 0;
    const request: RideRequest = {
      paddle: lying && step >= delay && !popped, popUp, steer: 0, retry: false, ...(compress ? { compress } : {}),
      ...(step === 0 ? { place: placement } : {}),
    };
    if (!accs.has(session.rider)) accs.set(session.rider, newAcc());
    runner.advance(1, request);
    const st = runner.status().ride!;
    if (st.phase === 'standing' && Number.isNaN(standAt)) {
      standAt = t;
      emit({ kind: 'stand', t: r(t, 4), refusal: (session.rider as Any).popUpReport.refusal ?? null, report: { ...(session.rider as Any).popUpReport } });
    }
    if (!built && st.phase === 'standing') {
      built = true;
      const w = (session.rider as Any).predictor?.weights;
      emit({ kind: 'built', faceTrim: w?.faceTrim ?? null, holdLine: w?.holdLine ?? null, plantFloor: w?.plantFloor ?? null, riderBody: w?.riderBody ?? null, extra: EXTRA });
    }
    if (st.phase === 'fallen' && Number.isNaN(fellAt)) fellAt = t;
    const wf = st.wave;
    const wave: Wave = { faceH: wf.faceHeight, faceFrac: wf.faceFraction, ahead: wf.aheadOfCrest, crest: wf.crestSpeed, valid: wf.valid, shoreward: wf.speedShoreward };
    if (SCRIPT === 'paddle' && Number.isNaN(passedAt) && !Number.isNaN(cueAt) && wf.valid && wf.aheadOfCrest < -1.5) passedAt = t;
    const near = !Number.isNaN(cueAt) && t >= cueAt - 0.5;
    const log = SCRIPT === 'paddle' ? (step % 3 === 0 || near) : (near || step % 30 === 0);
    const ledger = drainLedger(session.rider);
    if (log && Number.isNaN(fellAt)) {
      emit({ kind: 'f', t: r(t, 4), tS: Number.isNaN(standAt) ? null : r(t - standAt, 4), cue: cue ? 1 : 0, ...row(session, runner.water, wave), ...(ledger && ledger.solves ? { led: ledger } : {}) });
    }
    if (!Number.isNaN(fellAt)) break;
    if (!Number.isNaN(standAt) && t - standAt >= STAND_HOLD) break;
    if (!Number.isNaN(passedAt) && t > passedAt + 1) break;
  }
  emit({
    kind: 'summary', mode: 'catch', run: RUN, script: SCRIPT, cue: r(cueAt, 4), pop: r(popAt, 4), stand: r(standAt, 4), fell: r(fellAt, 4),
    fellAfterStand: !Number.isNaN(fellAt) && !Number.isNaN(standAt) ? r(fellAt - standAt, 4) : null, censored: !Number.isNaN(standAt) && Number.isNaN(fellAt) ? 1 : 0,
    cause: runner.status().ride?.separation ?? null, passed: r(passedAt, 4), seconds: (Date.now() - wall) / 1000,
  });
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=organic: 3.5o's take-off drive on the owner's Canyon address (`sharp-steer.ts`'s drive, the turn replaced by
// the Compress hold).
// ---------------------------------------------------------------------------------------------------------------
const RIDER_KEYS = [
  'stroke', 'swim', 'extension', 'duckBody', 'snap', 'snapQuick', 'snapPivot', 'snapRecentre', 'snapDepth', 'snapStamp',
  'agile', 'legDrive', 'hull', 'railSuction', 'compressPull', 'carveFlex', 'snapLegs', 'snapCross', 'legPower', 'rider',
  'feltFrame', 'kneeRoom', 'stanceReach', 'ankleLimit', 'ankleRange', 'bankClamp', 'bodyBank', 'askCap', 'stanceDeep',
  'deepen', 'armCarry', 'trunk', 'buoyFrame', 'waterHeel', 'mountAgree', 'riderBody', 'riderCost', 'plantFloor',
  'deckHollow', 'snapUpturn', 'swing', 'faceTrim', 'holdLine', 'slowStand',
] as const;
function organicMode(): void {
  const SEED = Number(process.env.SEED ?? 1);
  const PERIODS = Number(process.env.PERIODS ?? 12);
  const TRIAL = Number(process.env.TRIAL ?? 20);
  const SPRINT = 2;
  const CREST_PROBE = 36;
  const SCRIPTS = (process.env.SCRIPTS ?? 'cue,cueC').split(',').filter(Boolean);
  const ONLY = process.env.ONLY_WAVE ? Number(process.env.ONLY_WAVE) : undefined;
  const search = `${OWNER}${EXTRA}`;
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
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
  emit({ kind: 'control', mode: 'organic', seed: SEED, periods: PERIODS, scripts: SCRIPTS, search, riderOptions: opts, cAt: C_AT, ledger: LEDGER, only: ONLY ?? null, spinUp: (Date.now() - wall) / 1000 });
  if (config.canyonBed !== 'b' || config.rider !== 'new') { emit({ fatal: 'address' }); process.exit(2); }
  interface Rider {
    script: string; session: RideSession; gauge: WaveFrameGauge; sprinting: boolean; seenBehind: boolean;
    cueAt?: number; popAt?: number; standAt?: number; fellAt?: number; cause?: string; passedAt?: number; arrival?: number; done: boolean; frames: number;
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
      accs.set(session.rider, newAcc());
      trial.riders.push({ script, session, gauge: new WaveFrameGauge({ directionX: Math.sin(direction), directionZ: Math.cos(direction) }), sprinting: false, seenBehind: false, done: false, frames: 0 });
    }
    return trial;
  };
  const stepRider = (rider: Rider, t: number, trial: Trial): void => {
    const { session } = rider;
    const board = session.board;
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
    const since = rider.standAt === undefined ? -1 : t - rider.standAt;
    const compress = rider.script === 'cueC' && session.phase === 'standing' && since >= C_AT ? 1 : 0;
    const input = { paddle: prone && !pop && rider.popAt === undefined, sprint: prone && rider.sprinting && !pop, popUp: pop, steer: 0, ...(compress ? { compress } : {}) };
    session.step(STEP, water, input);
    rider.frames += 1;
    if (session.phase === 'standing' && rider.standAt === undefined) {
      rider.standAt = t;
      const w = (session.rider as Any).predictor?.weights;
      emit({ kind: 'stand', script: rider.script, wave: trial.index, t: r(t, 4), refusal: (session.rider as Any).popUpReport.refusal ?? null, report: { ...(session.rider as Any).popUpReport }, faceTrim: w?.faceTrim ?? null, holdLine: w?.holdLine ?? null, plantFloor: w?.plantFloor ?? null, slowStand: w?.slowStand ?? (session.rider as Any).slowStand ?? null });
    }
    const attached = session.rider.attached;
    const ledger = drainLedger(session.rider);
    const near = rider.cueAt !== undefined && t >= rider.cueAt - 0.5;
    if (attached && near) {
      const wave: Wave = { faceH: frame.faceHeight, faceFrac: frame.faceFraction, ahead: frame.aheadOfCrest, crest: frame.crestSpeed, valid: frame.valid, shoreward: frame.speedShoreward };
      emit({ kind: 'f', script: rider.script, wave: trial.index, t: r(t, 4), tS: rider.standAt === undefined ? null : r(t - rider.standAt, 4), cue: cue ? 1 : 0, ...row(session, water, wave), ...(ledger && ledger.solves ? { led: ledger } : {}) });
    }
    if (!attached && rider.fellAt === undefined) { rider.fellAt = t; rider.cause = session.separation ?? '?'; rider.done = true; }
    if (rider.passedAt === undefined && rider.arrival !== undefined && frame.valid && frame.aheadOfCrest < -1.5 && session.phase !== 'standing') rider.passedAt = t;
    if (rider.standAt !== undefined && t - rider.standAt >= STAND_HOLD) rider.done = true;
    if (rider.passedAt !== undefined && t > rider.passedAt + 1) rider.done = true;
    if (rider.popAt === undefined && rider.standAt === undefined && t > TRIAL - 1) rider.done = true;
    if (rider.popAt !== undefined && rider.standAt === undefined && session.phase === 'prone' && t > rider.popAt + 3) rider.done = true;
  };
  const probeZ = startZ - CREST_PROBE;
  const depthAt = (z: number): number => -sim.bedAt(focus.x, z) + sim.solver.restLevel;
  const earliest = (0.5 * CREST_PROBE) / Math.sqrt(9.81 * depthAt(startZ - CREST_PROBE / 2));
  void earliest;
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
        if (ONLY === undefined || ONLY === waves) {
          const trial = place(waves);
          trials.push(trial);
          active.push(trial);
        }
      }
    }
    for (let k = active.length - 1; k >= 0; k -= 1) {
      const trial = active[k];
      for (const rider of trial.riders) if (!rider.done) stepRider(rider, t - trial.placed, trial);
      if (t - trial.placed >= TRIAL || trial.riders.every((rider) => rider.done)) active.splice(k, 1);
    }
  }
  for (const trial of trials) for (const rider of trial.riders) {
    emit({
      kind: 'summary', mode: 'organic', seed: SEED, script: rider.script, wave: trial.index, cue: r(rider.cueAt, 4), pop: r(rider.popAt, 4), stand: r(rider.standAt, 4), fell: r(rider.fellAt, 4),
      fellAfterStand: rider.fellAt !== undefined && rider.standAt !== undefined ? r(rider.fellAt - rider.standAt, 4) : null,
      censored: rider.standAt !== undefined && rider.fellAt === undefined ? 1 : 0, exposure: rider.standAt === undefined ? null : r(Math.min(STAND_HOLD, TRIAL - rider.standAt), 4), cause: rider.cause ?? null,
    });
  }
  emit({ kind: 'done', waves, seconds: (Date.now() - wall) / 1000 });
}

if (MODE === 'catch') catchMode();
else organicMode();
