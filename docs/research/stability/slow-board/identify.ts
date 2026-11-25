/**
 * **3.6a part 2: the identification, the validation, the recovery control and the check** (`README.md` §0).
 *
 * MODEL AND READING ONLY. Nothing under `src/` changes. One bundle, one `MODE` per run:
 *
 *  * `MODE=fit IN=<dir>[,<dir>…] OUT=<fit.json>` — the cells' plants by direct least squares (§0.2–§0.3) on every `k` row
 *    of the probe's files in the directories, with the conditioning, the ride-block bootstrap and the IV cross-check.
 *  * `MODE=validate FIT=<fit.json> IN=<dirs> OUT=<val.json>` — the n-step prediction errors of the identified plant, the
 *    `table` and `game` truths and persistence, per cell, state and horizon (§0.6).
 *  * `MODE=simulate FIT=<fit.json> IN=<dirs> KNOWN=K1|K2 OUT=<dir>` — the recovery control's closed-loop rides (§0.8),
 *    written as the probe's `k` rows, one file per input file.
 *  * `MODE=check FIT=<fit.json> OUT=<check.json> [KNOWN=K1|K2]` — A and R closed on each cell's plant at 5, 6, 7 ticks
 *    (§0.9); with `KNOWN`, also on the known plant at the cell's median speed and depth.
 *  * `MODE=replay IN=<dirs>` — the controller replay control: a fresh `PredictiveController` fed each ride's logged
 *    arguments reproduces its logged raw commands.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/slow-board/identify.ts -o <s>/id.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`), then `env MODE=… node --max-old-space-size=6000 <s>/id.mjs`
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  CONTROL_STEP, DEFAULT_WEIGHTS, PLANT_SPEEDS, PredictiveController, closedLoop, continuousPlant, discretise, inverse, leastDamping, plantAt,
  type Design, type DesignWeights, type LabPlant, type Mat,
} from '../../../../src/physics/predictiveBalance';
import { eigenvalues } from '../../../../src/physics/rollModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const MODE = process.env.MODE ?? 'fit';
const H = CONTROL_STEP;
const LAG = 0.05;
const A_LAG = Math.exp(-H / LAG);
/** The step-mean of a lagged command over the tick, as a share of the new command: f = 1 − (τ/h)(1 − a). */
const F_MEAN = 1 - (LAG / H) * (1 - A_LAG);
const DEG = Math.PI / 180;
const LEAN_MAX = 8 * DEG;
const FIRST_TICK = 9;
const SEG_MIN = 12;
const MIN_PAIRS = 600;
const MIN_RIDES = 8;
const MIN_STARTS = 300;
const MIN_START_RIDES = 5;
const HORIZONS = [6, 15, 30];
const BINS: [number, number][] = [[1.5, 2], [2, 2.5], [2.5, 3], [3, 3.5], [3.5, 4], [4, 4.5], [4.5, 5], [5, 5.5], [5.5, 6], [6, 7]];
const GROUPS: { name: string; lo: number; hi: number; knot: number }[] = [
  { name: 'tall', lo: -1, hi: 0.1, knot: 0 }, { name: 'crouch', lo: 0.1, hi: 0.25, knot: 0.195 },
  { name: 'compress', lo: 0.25, hi: 0.375, knot: 0.3 }, { name: 'tuck', lo: 0.375, hi: 9, knot: 0.45 },
];
export const WEIGHTS_A: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two', plantFloor: 6 };
export const WEIGHTS_R: DesignWeights = { ...DEFAULT_WEIGHTS, riderBody: 'two' };
const STATES = ['phi', 'phiDot', 'bank', 'bankDot', 'yaw', 'slip', 'twist', 'upper', 'rest', 'twistT'];
const DECIDING = [0, 2, 4, 5];
const emit = (o: unknown): void => { process.stdout.write(`${JSON.stringify(o)}\n`); };
const f4 = (x: number): number | null => (Number.isFinite(x) ? Number(x.toFixed(4)) : null);

// ---------------------------------------------------------------------------------------------------------------
// Reading the probe's tick rows.
// ---------------------------------------------------------------------------------------------------------------
export interface Tick {
  n: number; x: number[]; u: number[]; v: number; dep: number; ba: number; ta: number; lim: [number, number]; rail: number; tilt: number; face: number;
  s: number[]; ftilt: number; hip: number; inf: number; st: number; ph: string; raw: number[]; sent: number[]; tS: number | null; t: number; vf: number;
}
export interface Ride { key: string; file: string; script: string; wave: number | null; ticks: Tick[] }
/** The design's state from a `k` row (§0.2): the senses' own rows, the slip, the two lagged commands. */
export function stateOf(row: Any): number[] {
  const s = row.s as number[];
  const theta = s[0], thetaDot = s[1], upper = s[2], twist = s[3], twistRate = s[4];
  return [theta - s[5], thetaDot - s[6], theta, thetaDot, upper - twistRate, row.beta, twist, upper, row.dlt, row.tau];
}
export function readRides(dirs: string[]): Ride[] {
  const rides = new Map<string, Ride>();
  for (const dir of dirs) {
    const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
    for (const file of files) {
      const path = join(dir, file);
      const text = readFileSync(path, 'utf8');
      for (const line of text.split('\n')) {
        if (!line.startsWith('{"kind":"k"')) continue;
        const row = JSON.parse(line);
        const key = `${basename(dir)}/${file}|${row.script}|${row.wave ?? ''}`;
        let ride = rides.get(key);
        if (!ride) { ride = { key, file: `${basename(dir)}/${file}`, script: row.script, wave: row.wave ?? null, ticks: [] }; rides.set(key, ride); }
        ride.ticks.push({
          n: row.n, x: stateOf(row), u: [row.ua ?? row.sent[0], row.sent[1]], v: row.v, dep: row.dep, ba: row.ba, ta: row.ta, lim: row.lim, rail: row.rail,
          tilt: row.tilt, face: row.face, s: row.s, ftilt: row.ftilt, hip: row.hip, inf: row.inf, st: row.st ?? 0, ph: row.ph, raw: row.raw, sent: row.sent,
          tS: row.tS, t: row.t, vf: row.vf,
        });
      }
    }
  }
  return [...rides.values()];
}
export const binOf = (v: number): number => BINS.findIndex(([lo, hi]) => v >= lo && v < hi);
export const groupOf = (d: number): number => GROUPS.findIndex((g) => d >= g.lo && d < g.hi);
const cellName = (b: number, g: number): string => `${BINS[b][0]}-${BINS[b][1]}|${GROUPS[g].name}`;
const selectedAt = (t: Tick): boolean => t.ph === 'standing' && t.n >= FIRST_TICK && Math.abs(t.ba) <= LEAN_MAX;
/** The pairs (k, k+1) of §0.2, by cell: each pair is the ride's tick index k. */
function pairsOf(ride: Ride): { k: number; cell: string }[] {
  const out: { k: number; cell: string }[] = [];
  const t = ride.ticks;
  for (let k = 0; k + 1 < t.length; k += 1) {
    const a = t[k], b = t[k + 1];
    if (b.n !== a.n + 1 || !selectedAt(a) || b.ph !== 'standing' || b.inf !== 0) continue;
    // Amendment (§0.2, before any fit was read): the ankle's lag row must hold on the pair, i.e. the command the lag
    // followed did not change inside the tick (it does when the rail's bite passes 48° and the room shrinks substep by
    // substep).
    if (Math.abs(b.x[8] - (A_LAG * a.x[8] + (1 - A_LAG) * a.u[0])) > 1e-9) continue;
    const bi = binOf(a.v), gi = groupOf(a.dep);
    if (bi < 0 || gi < 0) continue;
    out.push({ k, cell: cellName(bi, gi) });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The fit: twelve regressors per mechanical row, the segments' intercepts by demeaning.
// ---------------------------------------------------------------------------------------------------------------
const NR = 12;
function regressors(a: Tick, b: Tick): number[] {
  const x = a.x;
  const dbar = (1 - F_MEAN) * x[8] + F_MEAN * a.u[0];
  const tbar = (1 - F_MEAN) * x[9] + F_MEAN * a.u[1];
  return [x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], dbar, tbar, a.ftilt, b.hip];
}
interface Stats { xtx: number[][]; xty: number[][]; yty: number[]; n: number; ztx?: number[][]; ztz?: number[][]; zty?: number[][] }
const NZ = 10 + 31;
function newStats(iv: boolean): Stats {
  const z = (r: number, c: number) => Array.from({ length: r }, () => new Array<number>(c).fill(0));
  return { xtx: z(NR, NR), xty: z(NR, 8), yty: new Array<number>(8).fill(0), n: 0, ...(iv ? { ztx: z(NZ, NR), ztz: z(NZ, NZ), zty: z(NZ, 8) } : {}) };
}
function addStats(into: Stats, from: Stats): void {
  const acc = (a: number[][], b: number[][]) => { for (let i = 0; i < a.length; i += 1) for (let j = 0; j < a[i].length; j += 1) a[i][j] += b[i][j]; };
  acc(into.xtx, from.xtx); acc(into.xty, from.xty);
  for (let i = 0; i < 8; i += 1) into.yty[i] += from.yty[i];
  into.n += from.n;
  if (into.ztx && from.ztx) { acc(into.ztx, from.ztx); acc(into.ztz!, from.ztz!); acc(into.zty!, from.zty!); }
}
/** The instruments of the IV cross-check: the states, the two exogenous inputs, the steer's lags 0–30. */
function instruments(ride: Ride, k: number, reg: number[]): number[] {
  const z = reg.slice(0, 8).concat([reg[10], reg[11]]);
  for (let j = 0; j <= 30; j += 1) z.push(k - j >= 0 ? ride.ticks[k - j].st : 0);
  return z;
}
/** One ride's demeaned sufficient statistics per cell. */
function rideStats(ride: Ride, iv: boolean): Map<string, Stats> {
  const pairs = pairsOf(ride);
  const out = new Map<string, Stats>();
  let i = 0;
  while (i < pairs.length) {
    let j = i + 1;
    while (j < pairs.length && pairs[j].k === pairs[j - 1].k + 1 && pairs[j].cell === pairs[i].cell) j += 1;
    if (j - i >= SEG_MIN) {
      const seg = pairs.slice(i, j);
      const X = seg.map((p) => regressors(ride.ticks[p.k], ride.ticks[p.k + 1]));
      const Y = seg.map((p) => ride.ticks[p.k + 1].x.slice(0, 8));
      const Z = iv ? seg.map((p, q) => instruments(ride, p.k, X[q])) : [];
      const mean = (m: number[][]) => m[0].map((_, c) => m.reduce((s, r) => s + r[c], 0) / m.length);
      const mx = mean(X), my = mean(Y), mz = iv ? mean(Z) : [];
      let st = out.get(seg[0].cell);
      if (!st) { st = newStats(iv); out.set(seg[0].cell, st); }
      for (let q = 0; q < seg.length; q += 1) {
        const xr = X[q].map((v, c) => v - mx[c]);
        const yr = Y[q].map((v, c) => v - my[c]);
        for (let a = 0; a < NR; a += 1) {
          for (let b = 0; b < NR; b += 1) st.xtx[a][b] += xr[a] * xr[b];
          for (let b = 0; b < 8; b += 1) st.xty[a][b] += xr[a] * yr[b];
        }
        for (let b = 0; b < 8; b += 1) st.yty[b] += yr[b] * yr[b];
        if (iv) {
          const zr = Z[q].map((v, c) => v - mz[c]);
          for (let a = 0; a < NZ; a += 1) {
            for (let b = 0; b < NR; b += 1) st.ztx![a][b] += zr[a] * xr[b];
            for (let b = 0; b < NZ; b += 1) st.ztz![a][b] += zr[a] * zr[b];
            for (let b = 0; b < 8; b += 1) st.zty![a][b] += zr[a] * yr[b];
          }
        }
        st.n += 1;
      }
    }
    i = j;
  }
  return out;
}
/** Solves the scaled normal equations: coefficients (NR × 8), and the scaled matrix's κ and the VIFs. */
function solve(st: Stats): { c: number[][]; kappa: number; vif: number[]; r2: number[] } {
  const sc = st.xtx.map((row, i) => Math.sqrt(Math.max(row[i], 1e-300)));
  const live = sc.map((s) => s > 1e-12);
  const idx = sc.map((_, i) => i).filter((i) => live[i]);
  const A = idx.map((i) => idx.map((j) => st.xtx[i][j] / (sc[i] * sc[j])));
  const inv = inverse(A);
  const c = Array.from({ length: NR }, () => new Array<number>(8).fill(0));
  for (let col = 0; col < 8; col += 1) {
    const b = idx.map((i) => st.xty[i][col] / sc[i]);
    const z = inv.map((row) => row.reduce((s, v, q) => s + v * b[q], 0));
    idx.forEach((i, q) => { c[i][col] = z[q] / sc[i]; });
  }
  const ev = eigenvalues(A, { balance: true, maxIterations: 400 }).map((e) => Math.abs(e.re));
  const kappa = Math.sqrt(Math.max(...ev) / Math.max(1e-300, Math.min(...ev)));
  const vif = new Array<number>(NR).fill(Number.NaN);
  idx.forEach((i, q) => { vif[i] = inv[q][q]; });
  const r2 = new Array<number>(8).fill(0).map((_, col) => {
    let sse = st.yty[col];
    for (let a = 0; a < NR; a += 1) sse -= c[a][col] * st.xty[a][col];
    return 1 - sse / Math.max(1e-300, st.yty[col]);
  });
  return { c, kappa, vif, r2 };
}
/** Two-stage least squares with the instruments (§0.3 item 3). */
function solveIV(st: Stats): number[][] {
  const zz = st.ztz!;
  const sc = zz.map((row, i) => Math.sqrt(Math.max(row[i], 1e-300)));
  const idx = sc.map((_, i) => i).filter((i) => sc[i] > 1e-12);
  const izz = inverse(idx.map((i) => idx.map((j) => zz[i][j] / (sc[i] * sc[j]))));
  // X̂ᵀX̂ = Xᵀ Z (ZᵀZ)⁻¹ Zᵀ X and X̂ᵀ y likewise.
  const zx = idx.map((i) => st.ztx![i].map((v) => v / sc[i]));
  const zy = idx.map((i) => st.zty![i].map((v) => v / sc[i]));
  const t1 = izz.map((row) => new Array<number>(NR).fill(0).map((_, b) => row.reduce((s, v, q) => s + v * zx[q][b], 0)));
  const xhx = Array.from({ length: NR }, (_, a) => new Array<number>(NR).fill(0).map((_, b) => zx.reduce((s, row, q) => s + row[a] * t1[q][b], 0)));
  const t2 = izz.map((row) => new Array<number>(8).fill(0).map((_, b) => row.reduce((s, v, q) => s + v * zy[q][b], 0)));
  const xhy = Array.from({ length: NR }, (_, a) => new Array<number>(8).fill(0).map((_, b) => zx.reduce((s, row, q) => s + row[a] * t2[q][b], 0)));
  return solve({ xtx: xhx, xty: xhy, yty: new Array<number>(8).fill(1), n: st.n }).c;
}
/** The plant (Φ 10 × 10, Γ 10 × 2) from a cell's coefficients (§0.2). */
export function plantOf(c: number[][]): { phi: Mat; gamma: Mat } {
  const phi = Array.from({ length: 10 }, () => new Array<number>(10).fill(0));
  const gamma = Array.from({ length: 10 }, () => [0, 0]);
  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) phi[i][j] = c[j][i];
    phi[i][8] = c[8][i] * (1 - F_MEAN); gamma[i][0] = c[8][i] * F_MEAN;
    phi[i][9] = c[9][i] * (1 - F_MEAN); gamma[i][1] = c[9][i] * F_MEAN;
  }
  phi[8][8] = A_LAG; gamma[8][0] = 1 - A_LAG;
  phi[9][9] = A_LAG; gamma[9][1] = 1 - A_LAG;
  return { phi, gamma };
}

// ---------------------------------------------------------------------------------------------------------------
// The designs and the check.
// ---------------------------------------------------------------------------------------------------------------
const controllers = { A: new PredictiveController(WEIGHTS_A, 'tan'), R: new PredictiveController(WEIGHTS_R, 'tan') };
function designOf(arm: 'A' | 'R', v: number, depth: number): Design {
  const d = (controllers[arm] as Any).blend(v, depth, 0) as Design;
  const copy = (m: Mat) => m.map((r) => r.slice());
  return { ...d, phi: copy(d.phi), gamma: copy(d.gamma), k: copy(d.k), phiE: copy(d.phiE), gammaE: copy(d.gammaE), l: copy(d.l), phiN: copy(d.phiN), pred: d.pred.map(copy), c: copy(d.c), cE: copy(d.cE) };
}
export function damping(phi: Mat, gamma: Mat, ts: number, d: Design): { damping: number; frequency: number; radius: number } {
  try {
    return leastDamping(eigenvalues(closedLoop(phi, gamma, ts, d), { balance: true, maxIterations: 400 }));
  } catch { return { damping: Number.NaN, frequency: Number.NaN, radius: Number.NaN }; }
}
/** The open loop's eigenvalues of Φ, as s = ln z / h (rad/s), sorted by real part, largest first. */
function openLoop(phi: Mat): { re: number; im: number }[] {
  return eigenvalues(phi, { balance: true, maxIterations: 400 }).map((z) => ({ re: Math.log(Math.hypot(z.re, z.im)) / H, im: Math.atan2(z.im, z.re) / H }))
    .sort((a, b) => b.re - a.re);
}

// ---------------------------------------------------------------------------------------------------------------
// The truths: `table` and `game` (3.5w's four ride rows patched in, as 3.5x's model script), cached by speed and depth.
// ---------------------------------------------------------------------------------------------------------------
const ORIGINAL: Record<string, LabPlant> = JSON.parse(JSON.stringify(PLANT_SPEEDS));
let gameRows: Record<string, LabPlant> | undefined;
function setTruth(which: 'table' | 'game'): void {
  for (const k of Object.keys(PLANT_SPEEDS)) delete PLANT_SPEEDS[k];
  Object.assign(PLANT_SPEEDS, JSON.parse(JSON.stringify(ORIGINAL)));
  if (which === 'game') {
    if (!gameRows) {
      gameRows = {};
      for (const line of readFileSync('docs/research/new-rider/3.5/results/35w/rows.jsonl', 'utf8').trim().split('\n')) {
        const d = JSON.parse(line);
        if (d.tag !== 'ride') continue;
        gameRows[String(d.v)] = { roll: d.row.roll, slip: d.row.slip, yaw: d.row.yaw, rate: d.row.rate, drag: 0.2312 };
      }
    }
    Object.assign(PLANT_SPEEDS, gameRows);
  }
}
const truthCache = new Map<string, { phi: Mat; gamma: Mat }>();
export function truthAt(which: 'table' | 'game' | 'K2', v: number, depth: number): { phi: Mat; gamma: Mat } {
  const vr = Math.round(v * 100) / 100;
  const dr = Math.round(depth * 1000) / 1000;
  const key = `${which}|${vr}|${dr}`;
  let t = truthCache.get(key);
  if (!t) {
    setTruth(which === 'game' ? 'game' : 'table');
    const { y, t: tw } = plantAt(vr, dr, { rail: 0, body: true, stanceDeep: true, ...(which === 'K2' ? { plantFloor: 6 } : {}) });
    const { a, b } = continuousPlant(y, tw);
    t = discretise(a, b, H);
    setTruth('table');
    truthCache.set(key, t);
  }
  return t;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=fit
// ---------------------------------------------------------------------------------------------------------------
interface CellFit {
  cell: string; bin: [number, number]; group: string; knot: number; pairs: number; rides: number; segments?: number; medV: number; medDep: number; medVW?: number;
  bigRoll: number; c: number[][]; civ?: number[][]; kappa: number; vif: number[]; r2: number[]; enough: boolean;
  boot?: { A6: number[]; q05: number; q50: number; q95: number };
}
function median(a: number[]): number { const s = a.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : Number.NaN; }
function quantile(a: number[], q: number): number { const s = a.filter(Number.isFinite).sort((x, y) => x - y); if (!s.length) return Number.NaN; const i = q * (s.length - 1); const lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); }
function fit(rides: Ride[], iv: boolean, boot: number): CellFit[] {
  const per = rides.map((r) => ({ ride: r, stats: rideStats(r, iv) }));
  const out: CellFit[] = [];
  for (let b = 0; b < BINS.length; b += 1) for (let g = 0; g < GROUPS.length; g += 1) {
    const cell = cellName(b, g);
    const mine = per.filter((p) => p.stats.has(cell));
    if (mine.length === 0) continue;
    const st = newStats(iv);
    for (const p of mine) addStats(st, p.stats.get(cell)!);
    const vs: number[] = [], ds: number[] = [];
    let big = 0;
    for (const p of mine) for (const pr of pairsOf(p.ride)) if (pr.cell === cell) { const t = p.ride.ticks[pr.k]; vs.push(t.v); ds.push(t.dep); if (Math.abs(t.x[0]) > 20 * DEG) big += 1; }
    const s = solve(st);
    const enough = st.n >= MIN_PAIRS && mine.length >= MIN_RIDES;
    const cf: CellFit = {
      cell, bin: BINS[b], group: GROUPS[g].name, knot: GROUPS[g].knot, pairs: st.n, rides: mine.length, medV: median(vs), medDep: median(ds), bigRoll: big / Math.max(1, vs.length),
      c: s.c, kappa: s.kappa, vif: s.vif, r2: s.r2, enough,
    };
    if (iv && st.ztz && enough) { try { cf.civ = solveIV(st); } catch { /* singular instruments */ } }
    if (boot > 0 && enough) {
      // The ride-block bootstrap: whole rides resampled with replacement (a fixed generator, so the run repeats).
      let seed = 12345 + b * 97 + g;
      const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      const d6: number[] = [];
      const design = designOf('A', (BINS[b][0] + BINS[b][1]) / 2, GROUPS[g].knot);
      for (let it = 0; it < boot; it += 1) {
        const bs = newStats(false);
        for (let q = 0; q < mine.length; q += 1) { const p = mine[Math.floor(rand() * mine.length)]; const x = p.stats.get(cell)!; addStats(bs, { xtx: x.xtx, xty: x.xty, yty: x.yty, n: x.n }); }
        try { const pl = plantOf(solve(bs).c); d6.push(damping(pl.phi, pl.gamma, 6, design).damping); } catch { d6.push(Number.NaN); }
      }
      cf.boot = { A6: [], q05: quantile(d6, 0.05), q50: quantile(d6, 0.5), q95: quantile(d6, 0.95) };
    }
    out.push(cf);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=validate: n-step prediction with the measured commands.
// ---------------------------------------------------------------------------------------------------------------
function step(phi: Mat, gamma: Mat, x: number[], u: number[]): number[] {
  const out = new Array<number>(10);
  for (let i = 0; i < 10; i += 1) { let s = gamma[i][0] * u[0] + gamma[i][1] * u[1]; const row = phi[i]; for (let j = 0; j < 10; j += 1) s += row[j] * x[j]; out[i] = s; }
  return out;
}
function validate(fits: CellFit[], rides: Ride[]): Any[] {
  const byCell = new Map(fits.filter((f) => f.enough).map((f) => [f.cell, { f, p: plantOf(f.c), piv: f.civ ? plantOf(f.civ) : undefined }]));
  const acc = new Map<string, Any>();
  const models = ['id', 'iv', 'table', 'game', 'persist'];
  for (const ride of rides) {
    const t = ride.ticks;
    for (let k = 0; k < t.length; k += 1) {
      const a = t[k];
      if (!selectedAt(a)) continue;
      const bi = binOf(a.v), gi = groupOf(a.dep);
      if (bi < 0 || gi < 0) continue;
      const cell = cellName(bi, gi);
      const fit = byCell.get(cell);
      if (!fit) continue;
      const nMax = HORIZONS[HORIZONS.length - 1];
      let ok = k + nMax < t.length;
      if (ok) for (let j = 1; j <= nMax; j += 1) if (t[k + j].n !== a.n + j || t[k + j].inf !== 0 || t[k + j].ph !== 'standing') { ok = false; break; }
      // Horizons shorter than the longest are kept even when the longest is cut, each counted on its own.
      let reach = 0;
      for (let j = 1; j <= nMax && k + j < t.length; j += 1) { if (t[k + j].n !== a.n + j || t[k + j].inf !== 0 || t[k + j].ph !== 'standing') break; reach = j; }
      if (reach < HORIZONS[0]) continue;
      void ok;
      let e = acc.get(cell);
      if (!e) { e = { cell, rides: new Set<string>(), n: {}, se: {} }; for (const m of models) { e.se[m] = {}; for (const hz of HORIZONS) e.se[m][hz] = new Array<number>(10).fill(0); } for (const hz of HORIZONS) e.n[hz] = 0; acc.set(cell, e); }
      e.rides.add(ride.key);
      const pl: Record<string, { phi: Mat; gamma: Mat }> = { id: fit.p, table: truthAt('table', a.v, a.dep), game: truthAt('game', a.v, a.dep) };
      if (fit.piv) pl.iv = fit.piv;
      const xs: Record<string, number[]> = {};
      for (const m of Object.keys(pl)) xs[m] = a.x.slice();
      for (let j = 1; j <= reach; j += 1) {
        for (const m of Object.keys(pl)) xs[m] = step(pl[m].phi, pl[m].gamma, xs[m], t[k + j - 1].u);
        if (HORIZONS.includes(j)) {
          const truth = t[k + j].x;
          e.n[j] += 1;
          for (const m of Object.keys(pl)) for (let i = 0; i < 10; i += 1) e.se[m][j][i] += (xs[m][i] - truth[i]) ** 2;
          for (let i = 0; i < 10; i += 1) e.se.persist[j][i] += (a.x[i] - truth[i]) ** 2;
        }
      }
    }
  }
  const out: Any[] = [];
  for (const e of acc.values()) {
    const rms: Any = {};
    for (const m of models) { rms[m] = {}; for (const hz of HORIZONS) rms[m][hz] = e.n[hz] > 0 && (m !== 'iv' || e.se.iv[hz].some((v: number) => v > 0)) ? e.se[m][hz].map((v: number) => Math.sqrt(v / e.n[hz])) : null; }
    const starts = e.n[HORIZONS[0]];
    const enough = starts >= MIN_STARTS && e.rides.size >= MIN_START_RIDES;
    // The pass line (§0.6): lower than both truths on φ, θ, r, β at every horizon.
    const fails: string[] = [];
    for (const hz of HORIZONS) {
      if (!rms.id[hz]) { fails.push(`no ${hz}`); continue; }
      for (const i of DECIDING) if (!(rms.id[hz][i] < Math.min(rms.table[hz][i], rms.game[hz][i]))) fails.push(`${STATES[i]}@${hz}`);
    }
    const skill = [0, 2, 4].every((i) => rms.id[15] && rms.id[15][i] < rms.persist[15][i]);
    out.push({ cell: e.cell, starts, startsByHorizon: e.n, rides: e.rides.size, enough, pass: enough && fails.length === 0, fails, skill, rms });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=simulate: the recovery control's closed-loop rides (§0.8).
// ---------------------------------------------------------------------------------------------------------------
function simulate(fits: CellFit[], rides: Ride[], known: 'K1' | 'K2'): Map<string, Any[]> {
  const byCell = new Map(fits.filter((f) => f.enough).map((f) => [f.cell, plantOf(f.c)]));
  const files = new Map<string, Any[]>();
  const weights = known === 'K1' ? WEIGHTS_R : WEIGHTS_A;
  const truth = known === 'K1' ? 'table' : 'K2';
  for (const ride of rides) {
    const t = ride.ticks;
    if (t.length < 2 || t[0].n !== 0) continue;
    const ctl = new PredictiveController(weights, 'tan');
    let x = t[0].x.slice();
    const rows: Any[] = [];
    for (let k = 0; k < t.length; k += 1) {
      const g = t[k];
      if (!x.every(Number.isFinite) || Math.abs(x[0]) > 60 * DEG || Math.abs(x[2]) > 60 * DEG) break;
      const sense = [x[2], x[3], x[7], x[6], x[7] - x[4], x[2] - x[0], x[3] - x[1], 0, 0];
      const u = ctl.tick(sense, g.v, g.dep, g.ba, g.ta, { ankle: g.lim[0], twist: g.lim[1] }, g.rail, 0, 0, undefined);
      const sent = [u[0], u[1]];
      rows.push({
        kind: 'k', script: ride.script, wave: ride.wave, n: g.n, s: sense, v: g.v, dep: g.dep, ba: g.ba, ta: g.ta, lim: g.lim, rail: g.rail, tilt: 0, face: 0,
        beta: x[5], vf: g.v, vl: 0, dlt: x[8], tau: x[9], ftilt: g.ftilt, hip: g.hip, inf: g.inf, raw: [ctl.raw[0], ctl.raw[1]], sent, ua: sent[0], t: g.t, tS: g.tS, ph: g.ph, st: g.st,
      });
      if (k + 1 >= t.length) break;
      // The game's own disturbance on this tick: what the game fit's plant leaves unexplained (zero outside every cell).
      const nx = t[k + 1];
      const bi = binOf(g.v), gi = groupOf(g.dep);
      const p = bi >= 0 && gi >= 0 ? byCell.get(cellName(bi, gi)) : undefined;
      const d = p && nx.n === g.n + 1 ? step(p.phi, p.gamma, g.x, g.u).map((v, i) => nx.x[i] - v) : new Array<number>(10).fill(0);
      const kp = truthAt(truth, g.v, g.dep);
      x = step(kp.phi, kp.gamma, x, sent).map((v, i) => v + d[i]);
      if (nx.n !== g.n + 1) break;
    }
    const list = files.get(ride.file) ?? [];
    list.push(...rows);
    files.set(ride.file, list);
  }
  return files;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=check
// ---------------------------------------------------------------------------------------------------------------
function check(fits: CellFit[], known?: 'K1' | 'K2'): Any[] {
  const out: Any[] = [];
  for (const f of fits) {
    if (!f.enough) continue;
    const vc = (f.bin[0] + f.bin[1]) / 2;
    const p = plantOf(f.c);
    const row: Any = { cell: f.cell, vc, knot: f.knot, medV: f4(f.medV), medDep: f4(f.medDep) };
    const dm = (pl: { phi: Mat; gamma: Mat }, arm: 'A' | 'R', v: number, dep: number) => {
      const d = designOf(arm, v, dep);
      const r: Any = {};
      for (const ts of [5, 6, 7]) { const m = damping(pl.phi, pl.gamma, ts, d); r[ts] = [f4(m.damping), f4(m.frequency), f4(m.radius)]; }
      return r;
    };
    row.A = dm(p, 'A', vc, f.knot);
    row.R = dm(p, 'R', vc, f.knot);
    row.Amed = dm(p, 'A', f.medV, f.medDep);
    if (f.civ) row.Aiv = dm(plantOf(f.civ), 'A', vc, f.knot);
    row.open = openLoop(p.phi).slice(0, 4).map((e) => [f4(e.re), f4(e.im)]);
    row.boot = f.boot ? [f4(f.boot.q05), f4(f.boot.q50), f4(f.boot.q95)] : null;
    if (known) {
      const kp = truthAt(known === 'K1' ? 'table' : 'K2', f.medV, f.medDep);
      row.knownA = dm(kp, 'A', vc, f.knot);
      row.knownR = dm(kp, 'R', vc, f.knot);
      row.knownOpen = openLoop(kp.phi).slice(0, 4).map((e) => [f4(e.re), f4(e.im)]);
    }
    for (const truth of ['table', 'game'] as const) {
      const tp = truthAt(truth, vc, f.knot);
      row[`${truth}A`] = dm(tp, 'A', vc, f.knot);
      row[`${truth}Open`] = openLoop(tp.phi).slice(0, 4).map((e) => [f4(e.re), f4(e.im)]);
    }
    out.push(row);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=replay: the controller replay control.
// ---------------------------------------------------------------------------------------------------------------
function replay(rides: Ride[]): Any {
  let worstA = 0, worstT = 0, ticks = 0, skipped = 0;
  for (const ride of rides) {
    const t = ride.ticks;
    if (!t.length || t[0].n !== 0) { skipped += 1; continue; }
    const ctl = new PredictiveController(WEIGHTS_A, 'tan');
    for (let k = 0; k < t.length; k += 1) {
      const g = t[k];
      if (g.n !== k) { skipped += 1; break; }
      ctl.tick(g.s, g.v, g.dep, g.ba, g.ta, { ankle: g.lim[0], twist: g.lim[1] }, g.rail, g.tilt, g.face, undefined);
      worstA = Math.max(worstA, Math.abs(ctl.raw[0] - g.raw[0]));
      worstT = Math.max(worstT, Math.abs(ctl.raw[1] - g.raw[1]));
      ticks += 1;
    }
  }
  return { rides: rides.length, ticks, skipped, worstAnkle: worstA, worstTwist: worstT };
}
/** The lag rows and the speed check (§0.7). */
function lagCheck(rides: Ride[]): Any {
  let lag0 = 0, lag1 = 0, vf = 0, n = 0;
  for (const ride of rides) {
    const t = ride.ticks;
    for (let k = 1; k + 1 < t.length; k += 1) {
      const a = t[k], b = t[k + 1], p = t[k - 1];
      if (b.n !== a.n + 1 || p.n !== a.n - 1) continue;
      for (const i of [0, 1]) {
        lag0 = Math.max(lag0, Math.abs(b.x[8 + i] - (A_LAG * a.x[8 + i] + (1 - A_LAG) * a.u[i])) / (i === 0 ? 1 : 100));
        lag1 = Math.max(lag1, Math.abs(b.x[8 + i] - (A_LAG * a.x[8 + i] + (1 - A_LAG) * p.u[i])) / (i === 0 ? 1 : 100));
      }
      vf = Math.max(vf, Math.abs(a.vf - a.v));
      n += 1;
    }
  }
  return { pairs: n, lagRowWorst: lag0, lagRowOneTickLateWorst: lag1, vFwdMinusSpeedWorst: vf, note: 'twist torque errors are divided by 100 N·m' };
}

// ---------------------------------------------------------------------------------------------------------------
const dirs = (process.env.IN ?? '').split(',').filter(Boolean);
const OUT = process.env.OUT ?? '';
if (MODE === 'fit') {
  const rides = readRides(dirs);
  const fits = fit(rides, true, Number(process.env.BOOT ?? 200));
  const text = JSON.stringify({ F_MEAN, A_LAG, bins: BINS, groups: GROUPS, inputs: dirs, fits });
  writeFileSync(OUT, text);
  emit({ fit: OUT, sha256: createHash('sha256').update(text).digest('hex'), cells: fits.length, enough: fits.filter((f) => f.enough).length, rides: rides.length, lag: lagCheck(rides) });
} else if (MODE === 'validate') {
  const fits = (JSON.parse(readFileSync(process.env.FIT!, 'utf8')) as { fits: CellFit[] }).fits;
  const res = validate(fits, readRides(dirs));
  writeFileSync(OUT, JSON.stringify(res));
  emit({ validate: OUT, cells: res.length, pass: res.filter((r) => r.pass).length, enough: res.filter((r) => r.enough).length });
} else if (MODE === 'simulate') {
  const fits = (JSON.parse(readFileSync(process.env.FIT!, 'utf8')) as { fits: CellFit[] }).fits;
  const files = simulate(fits, readRides(dirs), process.env.KNOWN === 'K1' ? 'K1' : 'K2');
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  for (const [file, rows] of files) {
    const dir = join(OUT, file.split('/')[0]);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(join(OUT, file), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  }
  emit({ simulate: OUT, files: files.size, rows: [...files.values()].reduce((s, r) => s + r.length, 0) });
} else if (MODE === 'check') {
  const fits = (JSON.parse(readFileSync(process.env.FIT!, 'utf8')) as { fits: CellFit[] }).fits;
  const known = process.env.KNOWN === 'K1' || process.env.KNOWN === 'K2' ? (process.env.KNOWN as 'K1' | 'K2') : undefined;
  const res = check(fits, known);
  writeFileSync(OUT, JSON.stringify(res));
  emit({ check: OUT, cells: res.length });
} else if (MODE === 'replay') {
  emit({ replay: replay(readRides(dirs)) });
} else throw new Error(`unknown MODE ${MODE}`);
