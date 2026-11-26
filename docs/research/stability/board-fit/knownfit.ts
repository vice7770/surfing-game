/**
 * **3.6e's known-plant control** (README §0.3): `plantAt` at Compress with known perturbed multipliers p* as the true
 * plant, closed with the shipped `PredictiveController` at his weights (its model the shipped one), driven by 3.6d's
 * AR(1) disturbance, with A and the same 50 twins (3.6d's kick and replay rules) on four rides at speeds around a bin
 * centre; the rows made into 3.6d's `kick` and `kbase` rows and read through 3.6d's `group()` and **the same fit code**
 * (`fitLib.ts`) as the game. It recovers if every fitted multiplier is within 1 % of p* and the response matches to
 * 1e−6; on the unperturbed plant every multiplier must come back within 1 % of 1.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/board-fit/knownfit.ts --file <s>/knownfit.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) node <s>/knownfit.mjs <bin centre m/s> <out.json> [sets a,b,c,d] [hold k1,k2]
 */
import { writeFileSync } from 'node:fs';
import { DEFAULT_WEIGHTS, PredictiveController } from '../../../../src/physics/predictiveBalance';
import { ARGS_PRE, H, PRE, type KBaseRow, type KickRow } from '../response/responseLib';
import { C7, NESTED, buildPlant, disc, discreteOf, fitOn, fitSets, scalesOf, shippedPlant, type Mult } from './fitLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [centreArg, outPath, setsArg, holdArg] = process.argv.slice(2);
const CENTRE = Number(centreArg);
const SETS = (setsArg ?? 'a,b,c,d').split(',');
const HOLD = new Set((holdArg ?? '').split(',').filter(Boolean));
const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantFloor: 6 };
const DEPTH = 0.3;
const TICKS = 300;
const KICK_TIMES = [1.0, 1.5, 2.0, 2.5];
const DELTA = { ankle: 0.005, twist: 1 };
const SIZES = [1, -1, 2];
const limits = { ankle: 10, twist: 1e4 };
/** §0.3a: the known multipliers. */
export const P_STAR: Mult = {
  rollN: 1.6, rollY: 0.7, rollK: 2.2, slipN: 0.5, slipY: 1.4, slipK: 0.8, yawN: 1.9, yawY: 0.6, yawK: 1.3, rateN: 0.75, rateY: 1.5, rateK: 2.5,
  Ix: 2.0, Iz: 0.8, J: 1.3, kt: 0.7, ct: 1.5, lower: 0.9, upper: 1.2, h: 0.9, ka: 1.2, ca: 0.8, xf: 0.6, zd: 1.5,
};
type Spec = { mode: 'open' | 'closed'; channel: 'ankle' | 'twist' | 'none'; at: number; size: number };
const specs: Spec[] = [{ mode: 'open', channel: 'none', at: 0, size: 0 }, { mode: 'closed', channel: 'none', at: 0, size: 0 }];
for (const mode of ['open', 'closed'] as const) for (const channel of ['ankle', 'twist'] as const) for (const at of KICK_TIMES) for (const size of SIZES) specs.push({ mode, channel, at, size });

function disturbance(seed: number): number[][] {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const at = [1, 3, 4, 5, 7], sd = [0.02, 0.02, 0.01, 0.002, 0.02];
  const w = new Array<number>(10).fill(0);
  const out: number[][] = [];
  for (let k = 0; k < TICKS; k += 1) {
    for (let i = 0; i < at.length; i += 1) w[at[i]] = 0.9 * w[at[i]] + sd[i] * gauss();
    out.push(w.slice());
  }
  return out;
}
interface Rec { ch: Float64Array[]; raw0: number[]; sent1: number[]; mask: number[] }
const CH = ['y0', 'y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'beta', 'delta', 'tauA', 'hipT', 'swA', 'Om', 'p', 'turn', 'held0', 'held1'];
function ride(plant: { phi: number[][]; gamma: number[][] }, speed: number, w: number[][], spec: Spec | null, base: Rec | null): Rec {
  const ctrl = new PredictiveController(weights) as Any;
  const { phi, gamma } = plant;
  let x = new Array<number>(10).fill(0);
  const rec: Rec = { ch: [], raw0: [], sent1: [], mask: [] };
  const kf = spec && spec.channel !== 'none' ? Math.round(spec.at * 60) : -1;
  for (let k = 0; k < TICKS; k += 1) {
    const y = C7.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
    ctrl.tick([...y, 0, 0], speed, DEPTH, 0, 0, limits, 0);
    let mask = ctrl.raw[0] !== ctrl.sent[0] || ctrl.raw[1] !== ctrl.sent[1] ? 32 : 0;
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
    const nx = new Array<number>(10).fill(0);
    for (let i = 0; i < 10; i += 1) { let s = w[k][i]; for (let j = 0; j < 10; j += 1) s += phi[i][j] * x[j]; s += gamma[i][0] * u[0] + gamma[i][1] * u[1]; nx[i] = s; }
    x = nx;
  }
  return rec;
}
/** The rows of four rides at the bin's speeds on the plant with multipliers `pm`. */
function rowsFor(pm: Mult): { kicks: KickRow[]; kbases: KBaseRow[] } {
  const kicks: KickRow[] = [];
  const kbases: KBaseRow[] = [];
  [-0.75, -0.25, 0.25, 0.75].forEach((dv, i) => {
    const speed = CENTRE + dv;
    const plant = disc(speed, DEPTH, 0, pm);
    const wv = disturbance(36 + i);
    const A = ride(plant, speed, wv, null, null);
    const group = { seed: 0, wave: i + 1, script: 'compress:straight' };
    for (const kf of [60, 90, 120, 150]) {
      const args: Record<string, (number | null)[]> = {};
      for (const k of ['speed', 'depth', 'rail', 'bank', 'twist', 'limA', 'limT', 'vf']) args[k] = Array.from({ length: ARGS_PRE + H + 1 }, () => (k === 'speed' || k === 'vf' ? speed : k === 'depth' ? DEPTH : k === 'limA' ? limits.ankle : k === 'limT' ? limits.twist : 0));
      kbases.push({ kind: 'kbase', ...group, at: kf / 60, frame: kf, last: TICKS - 1, args, abs: {}, design: null });
    }
    for (const spec of specs) {
      const T = ride(plant, speed, wv, spec, A);
      const kf = spec.channel === 'none' ? -1 : Math.round(spec.at * 60);
      let all = 0, pre = 0;
      for (let k = 0; k < TICKS; k += 1) for (let c = 0; c < CH.length; c += 1) {
        const d = Math.abs(T.ch[k][c] - A.ch[k][c]);
        if (d !== 0) { all = Math.max(all, d); if (k < kf || (k === kf && c < 15)) pre = Math.max(pre, d); }
      }
      const row: KickRow = { kind: 'kick', ...group, mode: spec.mode, channel: spec.channel, at: spec.at, size: spec.size, frame: kf, delta: spec.channel === 'none' ? 0 : DELTA[spec.channel] * spec.size, kicked: spec.channel !== 'none', kickTick: kf, lost: false, ticksA: TICKS, ticksT: TICKS, frameMismatch: 0, maxDiff: all, preMax: pre, preTicks: Math.max(0, kf), lastA: TICKS - 1, lastT: TICKS - 1 };
      if (kf >= 0) {
        row.heldDiff = [T.ch[kf][15] - A.ch[kf][15], T.ch[kf][16] - A.ch[kf][16]];
        let mA = 0, mT = 0;
        for (let k = kf; k <= kf + H; k += 1) { mA |= A.mask[k]; mT |= T.mask[k]; }
        row.maskA = mA; row.maskT = mT;
        row.argMax = { speed: 0, depth: 0, rail: 0, bank: 0, twist: 0, limA: 0, limT: 0, vf: 0 };
        const d: Record<string, (number | null)[]> = {};
        for (let c = 0; c < CH.length; c += 1) { d[CH[c]] = []; for (let k = kf - PRE; k <= kf + H; k += 1) d[CH[c]].push(T.ch[k][c] - A.ch[k][c]); }
        row.d = d;
        row.e = {};
      }
      kicks.push(row);
    }
  });
  return { kicks, kbases };
}
// The identity: the multipliers at 1 build his plant bit for bit.
let identity = 0;
for (const v of [CENTRE - 0.75, CENTRE + 0.75]) {
  const a = discreteOf(buildPlant(v, DEPTH, 0, {})), b = discreteOf(shippedPlant(v, DEPTH, 0));
  for (let i = 0; i < 10; i += 1) for (let j = 0; j < 10; j += 1) identity = Math.max(identity, Math.abs(a.phi[i][j] - b.phi[i][j]));
}
const out: Record<string, unknown> = { centre: CENTRE, depth: DEPTH, identityLargestPhiDiff: identity, hold: [...HOLD], fits: {} };
const t0 = Date.now();
for (const which of ['unperturbed', ...SETS]) {
  const names = (which === 'unperturbed' ? NESTED.c : NESTED[which]).filter((k) => !HOLD.has(k));
  const truth: Mult = which === 'unperturbed' ? {} : Object.fromEntries(names.map((k) => [k, P_STAR[k]]));
  const runs = rowsFor(truth);
  const { all } = fitSets({ ...runs, weights });
  const open = all.filter((s) => s.mode === 'open' && s.set.pass60);
  const sig = scalesOf(open);
  const fit = fitOn(open, names, sig, [{}], { maxIter: 300 });
  let den = 0;
  for (const s of open) for (let m = 1; m <= 60; m += 1) for (let o = 0; o < 8; o += 1) den += (s.x[m][o] / sig[s.channel][o]) ** 2;
  const err = names.map((k) => { const want = truth[k] ?? 1; return [k, fit.mult[k], want, Math.abs(fit.mult[k] - want) / Math.abs(want)] as [string, number, number, number]; });
  const worst = err.reduce((a, b) => (b[3] > a[3] ? b : a));
  const respErr = Math.sqrt(fit.cost / den);
  const pass = worst[3] <= 0.01 && respErr <= 1e-6;
  (out.fits as Any)[which] = { names, sets: open.length, openSetsAll: all.filter((s) => s.mode === 'open').length, cost0: fit.cost0, cost: fit.cost, iters: fit.iters, converged: fit.converged, respErr, worst: { name: worst[0], fitted: worst[1], truth: worst[2], relErr: worst[3] }, pass, err };
  console.error(`${which}: ${open.length} sets, worst ${worst[0]} ${worst[1].toFixed(5)} vs ${worst[2]} (rel ${worst[3].toExponential(2)}), resp ${respErr.toExponential(2)}, iters ${fit.iters}, ${pass ? 'PASS' : 'FAIL'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
