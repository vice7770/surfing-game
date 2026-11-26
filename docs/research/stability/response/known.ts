/**
 * **3.6d's known-plant control** (README §0.6): the design's own model as the plant, closed with the same
 * `PredictiveController` code at his weights, with A and the same 50 twins (the probe's kick and replay rules), turned
 * into the probe's own rows and read by the same `analyse`. It must recover, to rounding, the model's open loop from the
 * open twins, `closedLoop` from the closed twins, and the closed twins from the reproduction.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/response/known.ts --file <s>/known.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) node <s>/known.mjs [out.md]
 */
import { writeFileSync } from 'node:fs';
import { DEFAULT_WEIGHTS, PredictiveController, scheduledDesign, type Design } from '../../../../src/physics/predictiveBalance';
import { analyse, report } from './analyse';
import { ARGS_PRE, H, OI, OUT, PRE, type KBaseRow, type KickRow } from './responseLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantFloor: 6 };
const SPEED = 7.0, DEPTH = 0.3, RAIL = 0;
const plant = scheduledDesign(SPEED, DEPTH, RAIL, weights);
const { phi, gamma, c } = plant;
const n = phi.length;
const TICKS = 300;
const KICK_TIMES = [1.0, 1.5, 2.0, 2.5];
const DELTA = { ankle: 0.005, twist: 1 };
const SIZES = [1, -1, 2];
const limits = { ankle: 0.25, twist: 100 };
type Spec = { mode: 'open' | 'closed'; channel: 'ankle' | 'twist' | 'none'; at: number; size: number };
const specs: Spec[] = [{ mode: 'open', channel: 'none', at: 0, size: 0 }, { mode: 'closed', channel: 'none', at: 0, size: 0 }];
for (const mode of ['open', 'closed'] as const) for (const channel of ['ankle', 'twist'] as const) for (const at of KICK_TIMES) for (const size of SIZES) specs.push({ mode, channel, at, size });

/** A seeded AR(1) disturbance on the five rates (φ̇, θ̇, r, β, ω_u), per tick. */
function disturbance(seed: number): number[][] {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const at = [1, 3, 4, 5, 7], sd = [0.02, 0.02, 0.01, 0.002, 0.02];
  const w = new Array<number>(n).fill(0);
  const out: number[][] = [];
  for (let k = 0; k < TICKS; k += 1) {
    for (let i = 0; i < at.length; i += 1) w[at[i]] = 0.9 * w[at[i]] + sd[i] * gauss();
    out.push(w.slice());
  }
  return out;
}
interface Rec { ch: Float64Array[]; raw0: number[]; sent1: number[]; mask: number[]; design?: Map<number, Any> }
const CH = ['y0', 'y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'beta', 'delta', 'tauA', 'hipT', 'swA', 'Om', 'p', 'turn', 'held0', 'held1'];
function ride(w: number[][], spec: Spec | null, base: Rec | null): Rec {
  const ctrl = new PredictiveController(weights) as Any;
  let x = new Array<number>(n).fill(0);
  const rec: Rec = { ch: [], raw0: [], sent1: [], mask: [], design: new Map() };
  const kf = spec && spec.channel !== 'none' ? Math.round(spec.at * 60) : -1;
  for (let k = 0; k < TICKS; k += 1) {
    const y = c.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
    ctrl.tick([...y, 0, 0], SPEED, DEPTH, 0, 0, limits, RAIL);
    let mask = ctrl.raw[0] !== ctrl.sent[0] || ctrl.raw[1] !== ctrl.sent[1] ? 32 : 0;
    if (!spec && [60, 90, 120, 150].includes(k)) {
      const d = ctrl.blendedDesign;
      const cp = (m: number[][]) => m.map((r) => r.slice());
      rec.design!.set(k, { phi: cp(d.phi), gamma: cp(d.gamma), c: cp(d.c), k: cp(d.k), phiE: cp(d.phiE), gammaE: cp(d.gammaE), cE: cp(d.cE), l: cp(d.l), phiN: cp(d.phiN), pred: d.pred.map(cp), steps: d.steps, bias: d.bias });
    }
    if (spec && spec.mode === 'open') { ctrl.raw[0] = base!.raw0[k]; ctrl.sent[1] = base!.sent1[k]; }
    if (spec && k === kf) {
      if (spec.channel === 'ankle') ctrl.raw[0] -= DELTA.ankle * spec.size; else ctrl.sent[1] -= DELTA.twist * spec.size;
      if (Math.abs(ctrl.sent[1]) > limits.twist) mask |= 64;
    }
    const u = [ctrl.raw[0], ctrl.sent[1]];
    const v = new Float64Array(CH.length);
    for (let i = 0; i < 7; i += 1) v[i] = y[i];
    v[7] = x[5]; v[8] = x[8]; v[9] = x[9]; v[10] = 0; v[11] = 0; v[12] = -x[4]; v[13] = x[1]; v[14] = -x[4]; v[15] = -u[0]; v[16] = -u[1];
    rec.ch.push(v); rec.raw0.push(ctrl.raw[0]); rec.sent1.push(ctrl.sent[1]); rec.mask.push(mask);
    const nx = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i += 1) { let s = w[k][i]; for (let j = 0; j < n; j += 1) s += phi[i][j] * x[j]; s += gamma[i][0] * u[0] + gamma[i][1] * u[1]; nx[i] = s; }
    x = nx;
  }
  return rec;
}
const kicks: KickRow[] = [];
const kbases: KBaseRow[] = [];
for (let wave = 1; wave <= 4; wave += 1) {
  const w = disturbance(36 + wave);
  const A = ride(w, null, null);
  const group = { seed: 0, wave, script: 'compress:straight' };
  for (const kf of [60, 90, 120, 150]) {
    const args: Record<string, (number | null)[]> = {};
    for (const k of ['speed', 'depth', 'rail', 'bank', 'twist', 'limA', 'limT', 'vf']) args[k] = Array.from({ length: ARGS_PRE + H + 1 }, () => (k === 'speed' || k === 'vf' ? SPEED : k === 'depth' ? DEPTH : k === 'limA' ? limits.ankle : k === 'limT' ? limits.twist : 0));
    kbases.push({ kind: 'kbase', ...group, at: kf / 60, frame: kf, last: TICKS - 1, args, abs: {}, design: A.design!.get(kf) as Design });
  }
  for (const spec of specs) {
    const T = ride(w, spec, A);
    const kf = spec.channel === 'none' ? -1 : Math.round(spec.at * 60);
    let all = 0, pre = 0;
    for (let k = 0; k < TICKS; k += 1) for (let i = 0; i < CH.length; i += 1) {
      const d = Math.abs(T.ch[k][i] - A.ch[k][i]);
      if (d !== 0) { all = Math.max(all, d); if (k < kf || (k === kf && i < 15)) pre = Math.max(pre, d); }
    }
    const row: KickRow = { kind: 'kick', ...group, mode: spec.mode, channel: spec.channel, at: spec.at, size: spec.size, frame: kf, delta: spec.channel === 'none' ? 0 : DELTA[spec.channel] * spec.size, kicked: spec.channel !== 'none', kickTick: kf, lost: false, ticksA: TICKS, ticksT: TICKS, frameMismatch: 0, maxDiff: all, preMax: pre, preTicks: Math.max(0, kf), lastA: TICKS - 1, lastT: TICKS - 1 };
    if (kf >= 0) {
      row.heldDiff = [T.ch[kf][15] - A.ch[kf][15], T.ch[kf][16] - A.ch[kf][16]];
      let mA = 0, mT = 0;
      for (let k = kf; k <= kf + H; k += 1) { mA |= A.mask[k]; mT |= T.mask[k]; }
      row.maskA = mA; row.maskT = mT;
      row.argMax = { speed: 0, depth: 0, rail: 0, bank: 0, twist: 0, limA: 0, limT: 0, vf: 0 };
      const d: Record<string, (number | null)[]> = {};
      for (let i = 0; i < CH.length; i += 1) { d[CH[i]] = []; for (let k = kf - PRE; k <= kf + H; k += 1) d[CH[i]].push(T.ch[k][i] - A.ch[k][i]); }
      row.d = d;
      row.e = {};
    }
    kicks.push(row);
  }
}
void OI; void OUT;
const res = analyse(kicks, kbases, weights, { log: (s) => console.error(s) });
const mm = res.model.get('compress:straight')!;
const rp = res.repro.get('compress:straight')!;
const zeroMax = Math.max(...kicks.filter((k) => k.channel === 'none').map((k) => k.maxDiff));
res.known = {
  zeroTwinsLargestDiff: zeroMax,
  openRecoveryLargestRelError: Math.max(...mm.openErr),
  closedRecoveryLargestRelError: Math.max(...mm.closedTwinVsModel),
  s1AgainstClosedLoopLargest: Math.max(...mm.s1VsClosed),
  reproductionLargestWaveErrorOmega: Math.max(...rp.waveOm),
  reproductionLargestWaveErrorSenses: Math.max(...rp.waveSense),
  setsOpenPass90: (res.controls['compress:straight'] as Any).open.lin90Pass, setsClosedPass90: (res.controls['compress:straight'] as Any).closed.lin90Pass,
};
const md = `# 3.6d known-plant control (the design at ${SPEED} m/s, ${DEPTH} m, rail ${RAIL}, his weights; 4 disturbed rides × 50 twins)\n\n` + report(res);
console.log(md);
if (process.argv[2]) writeFileSync(process.argv[2], md);
