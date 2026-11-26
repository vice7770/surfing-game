/**
 * **3.6e's fit library** (README §0.2–§0.6): the parametrised plant (`plantAt`'s own quantities as multipliers), the
 * open-loop responses, the output-error fit (Levenberg–Marquardt), its conditioning and set-block bootstrap, the speed
 * bins, the black-box references, question 1's ledger regressions, and the closures of question 3. One library, read by
 * the known-plant control (`knownfit.ts`), the fit on the fitting set (`fit.ts`) and the held-out reader (`heldout.ts`),
 * so the control tests the very code that fits the game.
 *
 * Model signs throughout (3.6d's): the full state x = [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a]; the eight mechanical
 * states are its first eight; a response is per unit model-sign command.
 */
import { readFileSync } from 'node:fs';
import {
  bodyInertiaAt, boardInertiaAt, continuousPlant, discretise, plantAt, senseMatrix, stanceAt, TWIST_DAMPING, TWIST_STIFFNESS, type Mat,
} from '../../../../src/physics/predictiveBalance';
import type { TwistPlant, YawPlant } from '../../../../src/physics/rollModel';
import { ARGS_PRE, H, OI, PRE, W_OPEN, group, type KBaseRow, type KickRow, type Resp, type TwinSet } from '../response/responseLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

// ---------------------------------------------------------------------------------------------------------------
// The parameters (README §0.3).
// ---------------------------------------------------------------------------------------------------------------
export const WATER = ['rollN', 'rollY', 'rollK', 'slipN', 'slipY', 'slipK', 'yawN', 'yawY', 'yawK', 'rateN', 'rateY', 'rateK'];
export const NESTED: Record<string, string[]> = {
  a: WATER,
  b: [...WATER, 'Ix', 'Iz'],
  c: [...WATER, 'Ix', 'Iz', 'J', 'kt', 'ct', 'lower', 'upper'],
  d: [...WATER, 'Ix', 'Iz', 'J', 'kt', 'ct', 'lower', 'upper', 'h', 'ka', 'ca'],
  // Amendment 1 (README §0.10): exploratory only, never selected: (c) plus the feet's station and the deck's height.
  e: [...WATER, 'Ix', 'Iz', 'J', 'kt', 'ct', 'lower', 'upper', 'xf', 'zd'],
};
const LINEAR = new Set([...WATER, 'xf', 'zd']);
export const isLog = (k: string): boolean => !LINEAR.has(k);
export type Mult = Record<string, number>;
export const multOf = (names: string[], th: ArrayLike<number>): Mult => Object.fromEntries(names.map((k, i) => [k, isLog(k) ? Math.exp(th[i]) : th[i]]));
export const thetaOf = (names: string[], m: Mult): number[] => names.map((k) => (isLog(k) ? Math.log(m[k] ?? 1) : (m[k] ?? 1)));

/** `plantAt` at his options with the multipliers applied (every multiplier 1: his plant, bit for bit). */
export function buildPlant(v: number, depth: number, rail: number, m: Mult): { y: YawPlant; t: TwistPlant } {
  const st = stanceAt(depth, true);
  const bi = boardInertiaAt(v);
  const scales = WATER.map((k) => m[k] ?? 1);
  const J = bodyInertiaAt(73, depth, st.height, true) * (m.J ?? 1);
  const { y, t } = plantAt(v, depth, {
    rail, body: J, plantFloor: 6, stanceDeep: true, scales, rollInertia: bi.roll * (m.Ix ?? 1), yawInertia: bi.yaw * (m.Iz ?? 1),
    twistStiffness: TWIST_STIFFNESS * (m.kt ?? 1), twistDamping: TWIST_DAMPING * (m.ct ?? 1),
  });
  if (m.lower !== undefined) y.riderYawInertia *= m.lower;
  if (m.upper !== undefined) t.inertia *= m.upper;
  if (m.h !== undefined) y.height *= m.h;
  if (m.ka !== undefined) y.ankleStiffness *= m.ka;
  if (m.ca !== undefined) y.ankleDamping *= m.ca;
  if (m.xf !== undefined) y.feetStation *= m.xf;
  if (m.zd !== undefined) y.deckHeight *= m.zd;
  return { y, t };
}
/** His plant as the shipped design builds it (`scheduledDesign`'s `plantAt` call), for the identity check. */
export function shippedPlant(v: number, depth: number, rail: number): { y: YawPlant; t: TwistPlant } {
  return plantAt(v, depth, { rail, body: true, plantFloor: 6, stanceDeep: true });
}
export interface Disc { phi: Mat; gamma: Mat }
export function discreteOf(p: { y: YawPlant; t: TwistPlant }): Disc {
  const { a, b } = continuousPlant(p.y, p.t);
  return discretise(a, b, 1 / 60);
}
export const disc = (v: number, depth: number, rail: number, m: Mult): Disc => discreteOf(buildPlant(v, depth, rail, m));
export const C7 = senseMatrix();

/** The open-loop response to a unit command on `ch`: the full state at m = 0 … n (m = 0 zero). */
export function openResp(d: Disc, ch: number, n = W_OPEN): Float64Array[] {
  const out: Float64Array[] = [new Float64Array(10)];
  let x = Float64Array.from(d.gamma.map((row) => row[ch]));
  for (let m = 1; m <= n; m += 1) {
    out.push(x);
    const nx = new Float64Array(10);
    for (let i = 0; i < 10; i += 1) { let s = 0; const r = d.phi[i]; for (let j = 0; j < 10; j += 1) s += r[j] * x[j]; nx[i] = s; }
    x = nx;
  }
  return out;
}
/** The eight mechanical states of a measured per-unit response (3.6d §0.5's map), m = 0 … H. */
export function statesOf(g: Resp): Float64Array[] {
  return g.map((v) => Float64Array.from([v[0] - v[5], v[1] - v[6], v[0], v[1], v[2] - v[4], v[OI.beta], v[3], v[2], v[OI.delta], v[OI.tauA]]));
}

// ---------------------------------------------------------------------------------------------------------------
// The data (3.6d's rows through 3.6d's `group`).
// ---------------------------------------------------------------------------------------------------------------
export interface Runs { kicks: KickRow[]; kbases: KBaseRow[]; weights: Any }
/** Reads `kick`, `kbase` and the first `weights` row of each file; `e` (the ledgers) is kept only on open kicked rows when `ledgers`. */
export function loadRuns(files: string[], ledgers = false): Runs {
  const kicks: KickRow[] = [];
  const kbases: KBaseRow[] = [];
  let weights: Any;
  for (const f of files) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (line.startsWith('{"kind":"kick"')) {
        const r = JSON.parse(line) as KickRow;
        if (!ledgers || r.mode !== 'open' || r.channel === 'none') delete r.e;
        kicks.push(r);
      } else if (line.startsWith('{"kind":"kbase"')) kbases.push(JSON.parse(line));
      else if (line.startsWith('{"kind":"weights"') && !weights) weights = JSON.parse(line).weights;
    }
  }
  return { kicks, kbases, weights };
}
export interface FitSet {
  id: string; base: string; script: string; mode: 'open' | 'closed'; channel: 0 | 1; at: number; v: number; depth: number; rail: number;
  x: Float64Array[]; set: TwinSet; kb: KBaseRow;
}
/** The sets of the runs with their kick-tick arguments (speed, depth, rail at ARGS_PRE), by mode and pass rule. */
export function fitSets(runs: Runs): { all: FitSet[]; grouped: ReturnType<typeof group> } {
  const grouped = group(runs.kicks, runs.kbases);
  const all: FitSet[] = [];
  for (const s of grouped.sets) {
    const kb = grouped.kbase.get(`${s.base}|${s.at}`);
    if (!kb || !s.checks.complete || !s.g.length) continue;
    const v = kb.args.speed[ARGS_PRE] as number, depth = kb.args.depth[ARGS_PRE] as number, rail = kb.args.rail[ARGS_PRE] as number;
    all.push({ id: `${s.base}|${s.mode}|${s.channel}|${s.at}`, base: s.base, script: s.script, mode: s.mode, channel: s.channel === 'ankle' ? 0 : 1, at: s.at, v, depth, rail, x: statesOf(s.g), set: s, kb });
  }
  return { all, grouped };
}
export const SPEED_FLOOR = 4;

/** Terciles of the speeds, rounded to 0.1 m/s (README §0.3): [4, e1), [e1, e2), [e2, ∞). */
export function tercileEdges(speeds: number[]): [number, number] {
  const s = speeds.slice().sort((a, b) => a - b);
  const q = (p: number) => { const i = (s.length - 1) * p; const lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); };
  return [Math.round(q(1 / 3) * 10) / 10, Math.round(q(2 / 3) * 10) / 10];
}
export const binOf = (v: number, e: [number, number]): number => (v < e[0] ? 0 : v < e[1] ? 1 : 2);

// ---------------------------------------------------------------------------------------------------------------
// The objective (README §0.3).
// ---------------------------------------------------------------------------------------------------------------
export const N8 = 8;
/** σ[ch][o]: the RMS of the measured responses of state o on channel ch over the sets and m = 1 … 60. */
export function scalesOf(sets: FitSet[]): number[][] {
  const out = [new Array<number>(N8).fill(0), new Array<number>(N8).fill(0)];
  const n = [0, 0];
  for (const s of sets) {
    for (let m = 1; m <= W_OPEN; m += 1) for (let o = 0; o < N8; o += 1) out[s.channel][o] += s.x[m][o] ** 2;
    n[s.channel] += W_OPEN;
  }
  return out.map((row, ch) => row.map((v) => (n[ch] > 0 ? Math.sqrt(v / n[ch]) : 1) || 1));
}
/** One set's residuals (model − measured) / σ over m = 1 … 60 and the eight states. */
export function setResid(s: FitSet, m: Mult, sig: number[][], out?: Float64Array, at = 0): Float64Array {
  const r = out ?? new Float64Array(W_OPEN * N8);
  const G = openResp(disc(s.v, s.depth, s.rail, m), s.channel);
  const sg = sig[s.channel];
  for (let k = 1; k <= W_OPEN; k += 1) for (let o = 0; o < N8; o += 1) r[at + (k - 1) * N8 + o] = (G[k][o] - s.x[k][o]) / sg[o];
  return r;
}
export function resid(sets: FitSet[], names: string[], th: ArrayLike<number>, sig: number[][]): Float64Array {
  const m = multOf(names, th);
  const r = new Float64Array(sets.length * W_OPEN * N8);
  sets.forEach((s, i) => setResid(s, m, sig, r, i * W_OPEN * N8));
  return r;
}
/** The prediction error of a set (README §0.3): ‖(G − g) / σ‖ / ‖g / σ‖ over the eight states and m = 1 … 60. */
export function predErr(s: FitSet, G: Float64Array[] | ((m: number) => ArrayLike<number>), sig: number[][]): number {
  let num = 0, den = 0;
  const sg = sig[s.channel];
  for (let k = 1; k <= W_OPEN; k += 1) {
    const gk = typeof G === 'function' ? G(k) : G[k];
    for (let o = 0; o < N8; o += 1) { num += ((gk[o] - s.x[k][o]) / sg[o]) ** 2; den += (s.x[k][o] / sg[o]) ** 2; }
  }
  return Math.sqrt(num / den);
}

// ---------------------------------------------------------------------------------------------------------------
// Small dense linear algebra.
// ---------------------------------------------------------------------------------------------------------------
export function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    if (d === 0 || !Number.isFinite(d)) continue;
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = m[r][c] / d;
      if (f === 0) continue;
      for (let k = c; k <= n; k += 1) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => (row[i] !== 0 ? row[n] / row[i] : 0));
}
export function invert(a: number[][]): number[][] {
  const n = a.length;
  const cols = Array.from({ length: n }, (_, j) => solve(a, Array.from({ length: n }, (_, i) => (i === j ? 1 : 0))));
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cols[j][i]));
}
/** Symmetric eigen-decomposition by cyclic Jacobi: eigenvalues (ascending) and eigenvectors (columns). */
export function symEig(s: number[][]): { values: number[]; vectors: number[][] } {
  const n = s.length;
  const a = s.map((r) => r.slice());
  const v = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep += 1) {
    let off = 0;
    for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) off += a[i][j] ** 2;
    if (off < 1e-30) break;
    for (let p = 0; p < n; p += 1) for (let q = p + 1; q < n; q += 1) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), sn = t * c;
      for (let k = 0; k < n; k += 1) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - sn * akq; a[k][q] = sn * akp + c * akq;
      }
      for (let k = 0; k < n; k += 1) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - sn * aqk; a[q][k] = sn * apk + c * aqk;
      }
      for (let k = 0; k < n; k += 1) {
        const vkp = v[k][p], vkq = v[k][q];
        v[k][p] = c * vkp - sn * vkq; v[k][q] = sn * vkp + c * vkq;
      }
    }
  }
  const idx = Array.from({ length: n }, (_, i) => i).sort((x, y) => a[x][x] - a[y][y]);
  return { values: idx.map((i) => a[i][i]), vectors: v.map((row) => idx.map((i) => row[i])) };
}

// ---------------------------------------------------------------------------------------------------------------
// The fit: Levenberg–Marquardt with a central-difference Jacobian (README §0.3).
// ---------------------------------------------------------------------------------------------------------------
export interface FitResult { names: string[]; theta: number[]; mult: Mult; cost: number; cost0: number; iters: number; lambda: number; converged: boolean }
export type ResidFn = (th: number[]) => Float64Array;
export function jacobian(f: ResidFn, th: number[], r0?: Float64Array): Float64Array[] {
  void r0;
  return th.map((x, j) => {
    const h = 1e-5 * Math.max(1, Math.abs(x));
    const tp = th.slice(); tp[j] += h;
    const tm = th.slice(); tm[j] -= h;
    const rp = f(tp), rm = f(tm);
    const col = new Float64Array(rp.length);
    for (let i = 0; i < rp.length; i += 1) col[i] = (rp[i] - rm[i]) / (2 * h);
    return col;
  });
}
const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number => { let s = 0; for (let i = 0; i < a.length; i += 1) s += a[i] * b[i]; return s; };
const sumsq = (a: ArrayLike<number>): number => dot(a, a);
export function lm(f: ResidFn, th0: number[], opts: { maxIter?: number; tol?: number; log?: (s: string) => void } = {}): { theta: number[]; cost: number; cost0: number; iters: number; lambda: number; converged: boolean } {
  const maxIter = opts.maxIter ?? 200, tol = opts.tol ?? 1e-10;
  let th = th0.slice();
  let r = f(th);
  let cost = sumsq(r);
  const cost0 = cost;
  let lambda = 1e-3;
  let it = 0, converged = false;
  for (; it < maxIter; it += 1) {
    const J = jacobian(f, th, r);
    const p = th.length;
    const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => dot(J[i], J[j])));
    const g = J.map((c) => dot(c, r));
    let accepted = false;
    while (lambda < 1e14) {
      const M = A.map((row, i) => row.map((x, j) => (i === j ? x + lambda * Math.max(x, 1e-12) : x)));
      const step = solve(M, g.map((x) => -x));
      const tn = th.map((x, i) => x + step[i]);
      const rn = f(tn);
      const cn = sumsq(rn);
      if (Number.isFinite(cn) && cn < cost) {
        const rel = (cost - cn) / cost;
        th = tn; r = rn; cost = cn; lambda = Math.max(1e-9, lambda / 3); accepted = true;
        if (rel < tol) converged = true;
        break;
      }
      lambda *= 4;
    }
    if (opts.log && it % 10 === 0) opts.log(`    lm it ${it} cost ${cost.toExponential(6)} lambda ${lambda.toExponential(1)}`);
    if (!accepted) { converged = true; break; }
    if (converged) break;
  }
  return { theta: th, cost, cost0, iters: it + 1, lambda, converged };
}
/** Fits `names` on the sets from the starts given, keeping the lowest cost (README §0.3). */
export function fitOn(sets: FitSet[], names: string[], sig: number[][], starts: Mult[], opts: { maxIter?: number; log?: (s: string) => void } = {}): FitResult {
  const f: ResidFn = (th) => resid(sets, names, th, sig);
  let best: FitResult | undefined;
  for (const st of starts) {
    const r = lm(f, thetaOf(names, st), opts);
    if (!best || r.cost < best.cost) best = { names, theta: r.theta, mult: multOf(names, r.theta), cost: r.cost, cost0: r.cost0, iters: r.iters, lambda: r.lambda, converged: r.converged };
  }
  return best!;
}
/** The scaled Jacobian's conditioning at the fit and the set-block bootstrap (one Gauss–Newton step per resample). */
export function uncertainty(sets: FitSet[], fit: FitResult, sig: number[][], resamples = 30, seed = 36): {
  cond: number; singular: number[]; atBound: string[]; weakest: { value: number; loads: [string, number][] }[]; boot: { lo: number[]; hi: number[]; median: number[] }; se: number[];
} {
  const names = fit.names;
  const f: ResidFn = (th) => resid(sets, names, th, sig);
  const r = f(fit.theta);
  const J = jacobian(f, fit.theta, r);
  const p = names.length;
  const norms = J.map((c) => Math.sqrt(sumsq(c)) || 1);
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => dot(J[i], J[j]) / (norms[i] * norms[j])));
  const eig = symEig(A);
  const singular = eig.values.map((x) => Math.sqrt(Math.max(0, x)));
  // Amendment 1: a log multiplier that ran to its bound (its column zero) is reported as at the bound, and κ is taken
  // over the rest.
  const atBound = names.filter((k, i) => isLog(k) && Math.sqrt(sumsq(J[i])) === 0);
  const tiny = 1e-12 * Math.max(...singular);
  const live = singular.filter((x) => x > tiny);
  const cond = live.length ? live[live.length - 1] / live[0] : Number.NaN;
  const off = singular.filter((x) => x <= tiny).length;
  const weakest = [off, off + 1].filter((k) => k < p).map((k) => ({ value: singular[k], loads: names.map((nm, i) => [nm, eig.vectors[i][k]] as [string, number]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 4) }));
  // Per-set blocks.
  const L = W_OPEN * N8;
  const blocks = sets.map((_, s) => ({ J: J.map((c) => c.subarray(s * L, (s + 1) * L)), r: r.subarray(s * L, (s + 1) * L) }));
  let st = seed >>> 0;
  const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  const draws: number[][] = [];
  for (let b = 0; b < resamples; b += 1) {
    const Ab = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    const gb = new Array<number>(p).fill(0);
    for (let k = 0; k < sets.length; k += 1) {
      const blk = blocks[Math.floor(rnd() * sets.length)];
      for (let i = 0; i < p; i += 1) { gb[i] += dot(blk.J[i], blk.r); for (let j = 0; j < p; j += 1) Ab[i][j] += dot(blk.J[i], blk.J[j]); }
    }
    const step = solve(Ab, gb.map((x) => -x));
    draws.push(fit.theta.map((x, i) => x + step[i]));
  }
  const toMult = (th: number[]) => names.map((k, i) => (isLog(k) ? Math.exp(th[i]) : th[i]));
  const md = draws.map(toMult);
  const qtl = (i: number, pr: number) => { const s = md.map((d) => d[i]).sort((x, y) => x - y); const ix = (s.length - 1) * pr; const lo = Math.floor(ix); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (ix - lo); };
  // The cluster-robust (by set) standard errors of θ, for reference.
  const Afull = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => dot(J[i], J[j])));
  const Ainv = invert(Afull);
  const meat = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (const blk of blocks) { const u = blk.J.map((c) => dot(c, blk.r)); for (let i = 0; i < p; i += 1) for (let j = 0; j < p; j += 1) meat[i][j] += u[i] * u[j]; }
  const se = Array.from({ length: p }, (_, i) => { let s = 0; for (let k = 0; k < p; k += 1) for (let l = 0; l < p; l += 1) s += Ainv[i][k] * meat[k][l] * Ainv[l][i]; return Math.sqrt(Math.max(0, s)); });
  return { cond, singular, atBound, weakest, boot: { lo: names.map((_, i) => qtl(i, 0.05)), hi: names.map((_, i) => qtl(i, 0.95)), median: names.map((_, i) => qtl(i, 0.5)) }, se };
}

// ---------------------------------------------------------------------------------------------------------------
// The black-box references (README §0.3).
// ---------------------------------------------------------------------------------------------------------------
/** The FIR: the mean measured response of the sets per channel, m = 0 … 60 (the eight states). */
export function firOf(sets: FitSet[]): Float64Array[][] {
  const out = [0, 1].map(() => Array.from({ length: W_OPEN + 1 }, () => new Float64Array(10)));
  const n = [0, 0];
  for (const s of sets) { n[s.channel] += 1; for (let m = 0; m <= W_OPEN; m += 1) for (let o = 0; o < 10; o += 1) out[s.channel][m][o] += s.x[m][o]; }
  for (const ch of [0, 1]) if (n[ch]) for (const row of out[ch]) for (let o = 0; o < 10; o += 1) row[o] /= n[ch];
  return out;
}
/** Free mechanical rows: Φ's eight rows by one-step least squares on the sets' responses (each set weighted by its own size). */
export function freeRows(sets: FitSet[], sig: number[][]): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < N8; i += 1) {
    const A = Array.from({ length: 10 }, () => new Array<number>(10).fill(0));
    const b = new Array<number>(10).fill(0);
    for (const s of sets) {
      let w = 0;
      for (let m = 1; m <= W_OPEN; m += 1) for (let o = 0; o < N8; o += 1) w += (s.x[m][o] / sig[s.channel][o]) ** 2;
      w = 1 / Math.max(w, 1e-300);
      for (let m = 1; m < W_OPEN; m += 1) {
        const x = s.x[m], y = s.x[m + 1][i];
        for (let p = 0; p < 10; p += 1) { b[p] += w * x[p] * y; for (let q = 0; q < 10; q += 1) A[p][q] += w * x[p] * x[q]; }
      }
    }
    let tr = 0;
    for (let p = 0; p < 10; p += 1) tr += A[p][p];
    for (let p = 0; p < 10; p += 1) A[p][p] += 1e-12 * tr;
    rows.push(solve(A, b));
  }
  return rows;
}
/** The free rows' response at a set: the model's Γ and lag rows with the fitted mechanical rows. */
export function freeResp(rows: number[][], s: FitSet): Float64Array[] {
  const d = disc(s.v, s.depth, s.rail, {});
  const phi = d.phi.map((r, i) => (i < N8 ? rows[i].slice() : r.slice()));
  return openResp({ phi, gamma: d.gamma }, s.channel);
}

// ---------------------------------------------------------------------------------------------------------------
// Question 1: the ledger regressions (README §0.2).
// ---------------------------------------------------------------------------------------------------------------
export const YAW_WATER = ['yB', 'yP', 'yAm', 'yRad', 'yFr', 'yBed', 'yFin', 'yRail', 'yFro', 'ySuc'];
export const ROLL_WATER = ['qB', 'qP', 'qAm', 'qRad', 'qFr', 'qBed', 'qFin', 'qRail', 'qFro', 'qSuc'];
export const WATER_REG = ['phi', 'beta', 'r', 'phidot', 'phiddot', 'rdot', 'betadot'];
export const RIDER_REG = ['phi', 'phidot', 'theta', 'thetadot', 'r', 'beta', 'theta_t', 'omega_u', 'delta', 'tauA', 'phiddot', 'thetaddot', 'rdot', 'betadot'];
export interface LedgerSet { s: FitSet; e: Record<string, Float64Array>; reg: Record<string, Float64Array>; w: number }
/** The per-unit ledger differences and the frame-mean regressors of an open set, frames m = 0 … 59 (README §0.2). */
export function ledgerSet(s: FitSet, which: 'yaw' | 'roll'): LedgerSet | null {
  const p = s.set.rows.p, mn = s.set.rows.m;
  if (!p?.e || !mn?.e) return null;
  const kappa = -p.delta;
  const e: Record<string, Float64Array> = {};
  for (const k of Object.keys(p.e)) {
    const a = p.e[k], b = mn.e[k];
    e[k] = Float64Array.from({ length: W_OPEN }, (_, m) => ((a[m + PRE] as number) - (b[m + PRE] as number)) / (2 * kappa));
  }
  const g = s.set.g;
  const at = (m: number, f: (v: Float64Array) => number) => f(g[m]);
  const st = {
    phi: (v: Float64Array) => v[0] - v[5], phidot: (v: Float64Array) => (which === 'roll' ? v[OI.p] : v[OI.p]), theta: (v: Float64Array) => v[0], thetadot: (v: Float64Array) => v[1],
    r: (v: Float64Array) => -v[OI.Om], beta: (v: Float64Array) => v[OI.beta], theta_t: (v: Float64Array) => v[3], omega_u: (v: Float64Array) => v[2],
    delta: (v: Float64Array) => v[OI.delta], tauA: (v: Float64Array) => v[OI.tauA],
  };
  const reg: Record<string, Float64Array> = {};
  for (const [k, f] of Object.entries(st)) reg[k] = Float64Array.from({ length: W_OPEN }, (_, m) => (at(m, f) + at(m + 1, f)) / 2);
  const rate = (f: (v: Float64Array) => number) => Float64Array.from({ length: W_OPEN }, (_, m) => (at(m + 1, f) - at(m, f)) * 60);
  reg.phiddot = rate(st.phidot); reg.thetaddot = rate(st.thetadot); reg.rdot = rate(st.r); reg.betadot = rate(st.beta);
  let w = 0;
  for (let m = 0; m < W_OPEN; m += 1) w += reg.phidot[m] ** 2;
  w = 1 / Math.sqrt(w / W_OPEN);
  return { s, e, reg, w };
}
export interface Regression { coef: number[]; se: number[]; cond: number; vif: number[]; n: number; r2: number }
/** Ordinary least squares of y on X (rows weighted), cluster-robust standard errors by set, the scaled conditioning. */
export function regress(ls: LedgerSet[], y: (l: LedgerSet) => Float64Array, regs: string[]): Regression {
  const p = regs.length;
  const X: number[][] = [], Y: number[] = [], G: number[] = [];
  ls.forEach((l, gi) => { const yy = y(l); for (let m = 0; m < W_OPEN; m += 1) { X.push(regs.map((k) => l.reg[k][m] * l.w)); Y.push(yy[m] * l.w); G.push(gi); } });
  const n = Y.length;
  // Amendment 1 (numerics only): the normal equations are solved on unit-RMS columns, then scaled back.
  const rms = Array.from({ length: p }, (_, i) => Math.sqrt(X.reduce((s, row) => s + row[i] * row[i], 0) / n) || 1);
  const Xs = X.map((row) => row.map((x, i) => x / rms[i]));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => Xs.reduce((s, row) => s + row[i] * row[j], 0)));
  const Sy = Array.from({ length: p }, (_, i) => Xs.reduce((s, row, k) => s + row[i] * Y[k], 0));
  const cs = solve(S, Sy);
  const coef = cs.map((c, i) => c / rms[i]);
  const res = Y.map((yv, k) => yv - Xs[k].reduce((s, x, i) => s + x * cs[i], 0));
  const inv = invert(S);
  const meat = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const byG = new Map<number, number[]>();
  res.forEach((rv, k) => { const u = byG.get(G[k]) ?? new Array<number>(p).fill(0); for (let i = 0; i < p; i += 1) u[i] += Xs[k][i] * rv; byG.set(G[k], u); });
  for (const u of byG.values()) for (let i = 0; i < p; i += 1) for (let j = 0; j < p; j += 1) meat[i][j] += u[i] * u[j];
  const se = Array.from({ length: p }, (_, i) => { let s = 0; for (let k = 0; k < p; k += 1) for (let l = 0; l < p; l += 1) s += inv[i][k] * meat[k][l] * inv[l][i]; return Math.sqrt(Math.max(0, s)) / rms[i]; });
  const Sn = S.map((row) => row.map((x) => x / n));
  const eig = symEig(Sn);
  const cond = Math.sqrt(Math.max(...eig.values) / Math.max(Math.min(...eig.values), 1e-300));
  const vif = invert(Sn).map((row, i) => row[i]);
  const yy = Y.reduce((s, x) => s + x * x, 0);
  const r2 = 1 - res.reduce((s, x) => s + x * x, 0) / yy;
  return { coef, se, cond, vif, n, r2 };
}
/** The model's own coefficients of the water sum (yaw, roll) and the rider's coupling (yaw, roll) at a set (README §0.2). */
export const OWN = { yaw: 0.449, roll: 0.026 };
export function modelCoefs(s: FitSet, own = OWN): { waterYaw: number[]; waterRoll: number[]; riderYaw: number[]; riderRoll: number[] } {
  const { y, t } = shippedPlant(s.v, s.depth, s.rail);
  const k = y.ankleStiffness, c = y.ankleDamping, m = y.mass, zd = y.deckHeight, xf = y.feetStation, h = y.height, V = y.speed;
  const fx = y.feetForward / (m * 9.81);
  const Ir = y.riderYawInertia, kt = t.stiffness, ct = t.damping;
  const waterYaw = [y.heelYaw, y.slipYaw, y.yawDamping, y.rollRateYaw, 0, -(y.boardYawInertia - own.yaw), 0];
  const waterRoll = [y.heelRoll, y.slipRoll, y.yawRoll, y.rollDamping, -(y.boardRollInertia - own.roll), 0, 0];
  // RIDER_REG: [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a, φ̈, θ̈, ṙ, β̇]
  const riderRoll = [-k, -c, k, c, -zd * m * V, 0, 0, 0, -k, 0, -zd * zd * m, -zd * m * h, -zd * m * xf, -zd * m * V];
  const riderYaw = [fx * k, fx * c, -fx * k, -fx * c, -xf * m * V - ct, 0, kt, ct, fx * k, 1, -xf * m * zd, -xf * m * h, -Ir - xf * xf * m, -xf * m * V];
  return { waterYaw, waterRoll, riderYaw, riderRoll };
}

// ---------------------------------------------------------------------------------------------------------------
// Question 3: the closures in state space (README §0.4).
// ---------------------------------------------------------------------------------------------------------------
export const N_OUT14 = 14;
export function outOf(x: ArrayLike<number>): Float64Array {
  const v = new Float64Array(N_OUT14);
  for (let i = 0; i < 7; i += 1) { let s = 0; const r = C7[i]; for (let j = 0; j < 10; j += 1) s += r[j] * x[j]; v[i] = s; }
  v[OI.Om] = -x[4]; v[OI.beta] = x[5]; v[OI.delta] = x[8]; v[OI.tauA] = x[9]; v[OI.p] = x[1]; v[OI.turn] = -x[4];
  return v;
}
/** The loop of a (possibly time-varying) plant with a controller, a unit kick on `ch` at m = 0, m = 0 … H. */
export function closeLTV(plant: (m: number) => Disc, ch: 0 | 1, ctrl: (m: number, y: ArrayLike<number>) => [number, number]): Resp {
  let x = new Float64Array(10);
  const out: Resp = [];
  for (let m = 0; m <= H; m += 1) {
    const v = outOf(x);
    out.push(v);
    const c = ctrl(m, v);
    const u = [c[0] + (m === 0 && ch === 0 ? 1 : 0), c[1] + (m === 0 && ch === 1 ? 1 : 0)];
    const d = plant(m);
    const nx = new Float64Array(10);
    for (let i = 0; i < 10; i += 1) { let s = d.gamma[i][0] * u[0] + d.gamma[i][1] * u[1]; const r = d.phi[i]; for (let j = 0; j < 10; j += 1) s += r[j] * x[j]; nx[i] = s; }
    x = nx;
  }
  return out;
}
/** The envelope ratio (README §0.4): max |x| over [t₀ + 2T, t₀ + 3T) over max |x| over [t₀, t₀ + T), t₀ = 2 ticks. */
export function envelope(x: ArrayLike<number>, f: number): number {
  const T = 60 / (Number.isFinite(f) && f > 0 ? f : 2.67);
  const mx = (a: number, b: number) => { let s = 0; for (let m = Math.ceil(a); m < b && m <= H; m += 1) s = Math.max(s, Math.abs(x[m])); return s; };
  const first = mx(2, 2 + T), third = mx(2 + 2 * T, 2 + 3 * T);
  return first > 0 ? third / first : Number.NaN;
}
export { ARGS_PRE, H, OI, PRE, W_OPEN };
