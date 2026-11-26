/**
 * **3.6d's reader** (README §0.4–§0.6): one set of functions read by both the game's twins (`response.ts`) and the known
 * plant's (`known.ts`), so the known-plant control tests the very code that reads the game.
 *
 * Everything is in the model's signs: a kick of δ on `heldAnkleRaw` or `heldTwist` is κ = −δ on u_a or u_t, and every
 * response is per unit model-sign command. Lag m = 0 is the kick's tick (the senses read before the kick acts); the
 * tick channels at frame kick + m are the state at tick k₀ + m. The outputs (`OUT`) are the seven senses, then Ω
 * (world up, the game's sign), then β, δ, τ_a, the hip's torque, p and `turn`.
 */
import { closedLoop, PredictiveController, type Design, type DesignWeights } from '../../../../src/physics/predictiveBalance';
import { eigenvalues } from '../../../../src/physics/rollModel';
import { WOBBLE } from '../../../../src/physics/wobbleKnobs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
export const OUT = ['y0', 'y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'Om', 'beta', 'delta', 'tauA', 'hipT', 'p', 'turn'] as const;
export type OutName = (typeof OUT)[number];
export const OI = Object.fromEntries(OUT.map((k, i) => [k, i])) as Record<OutName, number>;
export const N_OUT = OUT.length;
/** The rows the loop closes on (the senses) and the stacked rows the linearity line reads (the senses and Ω). */
export const SENSE_ROWS = [0, 1, 2, 3, 4, 5, 6];
export const LIN_ROWS = [0, 1, 2, 3, 4, 5, 6, 7];
export const PRE = 2;
export const ARGS_PRE = 8;
export const H = 90;
export const W_OPEN = 60;
export const LAG = Math.exp(-(1 / 60) / 0.05);
export const SWING: Record<string, number> = { 'compress:straight': 2.67, 'none:straight': 2.31, 'crouch:straight': 2.90 };

export interface KickRow {
  kind: 'kick'; seed: number; wave: number; script: string; mode: 'open' | 'closed'; channel: 'ankle' | 'twist' | 'none'; at: number; size: number;
  frame: number; delta: number; kicked: boolean; kickTick: number; lost: boolean; ticksA: number; ticksT: number; frameMismatch: number;
  maxDiff: number; preMax: number; preTicks: number; lastA: number; lastT: number; heldDiff?: number[]; maskA?: number; maskT?: number;
  argMax?: Record<string, number>; d?: Record<string, (number | null)[]>; e?: Record<string, (number | null)[]>;
}
export interface KBaseRow {
  kind: 'kbase'; seed: number; wave: number; script: string; at: number; frame: number; last: number;
  args: Record<string, (number | null)[]>; abs: Record<string, (number | null)[]>; design: Design | null;
}
/** A response: R[m][o] for m = 0 … H, per unit model-sign command. */
export type Resp = Float64Array[];

export const baseId = (r: { seed: number; wave: number; script: string }): string => `s${r.seed}:w${r.wave}:${r.script}`;
const sizeKey = (s: number): string => (s === 1 ? 'p' : s === -1 ? 'm' : s === 2 ? 'p2' : 'z');

/** The response of one kicked twin's differences (tick channels), m = 0 … H; NaN where missing. */
function diffResp(row: KickRow): Resp {
  const out: Resp = [];
  for (let m = 0; m <= H; m += 1) {
    const v = new Float64Array(N_OUT).fill(Number.NaN);
    for (let o = 0; o < N_OUT; o += 1) {
      const a = row.d?.[OUT[o]]?.[m + PRE];
      if (a !== null && a !== undefined) v[o] = a;
    }
    out.push(v);
  }
  return out;
}
const norm = (xs: number[]): number => Math.sqrt(xs.reduce((s, x) => s + x * x, 0));

export interface TwinSet {
  base: string; script: string; mode: 'open' | 'closed'; channel: 'ankle' | 'twist'; at: number; frame: number;
  rows: Partial<Record<'p' | 'm' | 'p2', KickRow>>;
  checks: { pre: boolean; held: boolean; mask: boolean; stand60: boolean; stand90: boolean; lin60: { sym: number; two: number }; lin90: { sym: number; two: number }; complete: boolean; argMax: Record<string, number> };
  /** ℓ / κ: the response per unit model-sign command, m = 0 … H. */
  g: Resp;
  pass60: boolean; pass90: boolean;
}

/** Linearity over m = 1 … w on the stacked rows (README §0.4): e_sym and e₂. */
function linearity(p: Resp, m: Resp, p2: Resp, w: number): { sym: number; two: number } {
  const s: number[] = [], d: number[] = [], t: number[] = [];
  for (let k = 1; k <= w; k += 1) for (const o of LIN_ROWS) {
    const a = p[k][o], b = m[k][o], c = p2[k][o];
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return { sym: Infinity, two: Infinity };
    s.push(a + b); d.push(a - b); t.push(c - (a - b));
  }
  const nd = norm(d);
  return { sym: nd > 0 ? norm(s) / nd : Infinity, two: nd > 0 ? norm(t) / nd : Infinity };
}

export interface Grouped {
  zero: Map<string, { open?: KickRow; closed?: KickRow }>;
  sets: TwinSet[];
  kbase: Map<string, KBaseRow>;
}
export function group(kicks: KickRow[], kbases: KBaseRow[]): Grouped {
  const zero = new Map<string, { open?: KickRow; closed?: KickRow }>();
  const bySet = new Map<string, TwinSet>();
  for (const r of kicks) {
    const b = baseId(r);
    if (r.ticksA <= 0) continue;
    if (r.channel === 'none') { const z = zero.get(b) ?? {}; z[r.mode] = r; zero.set(b, z); continue; }
    const key = `${b}|${r.mode}|${r.channel}|${r.at}`;
    let s = bySet.get(key);
    if (!s) {
      s = { base: b, script: r.script, mode: r.mode, channel: r.channel, at: r.at, frame: r.frame, rows: {}, checks: undefined as Any, g: [], pass60: false, pass90: false };
      bySet.set(key, s);
    }
    s.rows[sizeKey(r.size) as 'p' | 'm' | 'p2'] = r;
  }
  const kbase = new Map<string, KBaseRow>();
  for (const k of kbases) kbase.set(`${baseId(k)}|${k.at}`, k);
  const sets = [...bySet.values()];
  for (const s of sets) {
    const { p, m, p2 } = s.rows;
    const complete = !!(p && m && p2 && p.d && m.d && p2.d);
    const rows = [p, m, p2].filter(Boolean) as KickRow[];
    const pre = complete && rows.every((r) => r.preMax === 0 && r.frameMismatch === 0 && r.kicked);
    const held = complete && rows.every((r) => {
      const want = s.channel === 'ankle' ? [r.delta, 0] : [0, r.delta];
      return r.heldDiff !== undefined && Math.abs(r.heldDiff[0] - want[0]) <= 1e-12 && Math.abs(r.heldDiff[1] - want[1]) <= 1e-12;
    });
    const mask = complete && rows.every((r) => r.maskA === 0 && r.maskT === 0);
    const lastOk = (w: number) => complete && rows.every((r) => r.lastA >= r.frame + w && r.lastT >= r.frame + w);
    const argMax: Record<string, number> = {};
    for (const r of rows) for (const [k, v] of Object.entries(r.argMax ?? {})) argMax[k] = Math.max(argMax[k] ?? 0, v / Math.abs(r.size));
    let lin60 = { sym: Infinity, two: Infinity }, lin90 = { sym: Infinity, two: Infinity };
    if (complete) {
      const rp = diffResp(p!), rm = diffResp(m!), r2 = diffResp(p2!);
      lin60 = linearity(rp, rm, r2, W_OPEN);
      lin90 = linearity(rp, rm, r2, H);
      const kappa = -p!.delta;
      s.g = rp.map((v, k) => v.map((x, o) => (x - rm[k][o]) / (2 * kappa)));
    }
    s.checks = { pre, held, mask, stand60: lastOk(W_OPEN), stand90: lastOk(H), lin60, lin90, complete, argMax };
    const linOk = (l: { sym: number; two: number }) => l.sym <= 0.05 && l.two <= 0.10;
    const base = complete && pre && held && mask;
    s.pass60 = base && s.checks.stand60 && linOk(lin60);
    s.pass90 = base && s.checks.stand90 && linOk(lin60) && linOk(lin90);
  }
  return { zero, sets, kbase };
}

// ---------------------------------------------------------------------------------------------------------------
// The model's responses (README §0.5).
// ---------------------------------------------------------------------------------------------------------------
const matVec = (a: number[][], x: ArrayLike<number>): number[] => a.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
/** The model's outputs from its state (OUT's order; the hip has no state). */
export function modelOut(c: number[][], x: ArrayLike<number>): Float64Array {
  const v = new Float64Array(N_OUT);
  const y = matVec(c, x);
  for (let i = 0; i < 7; i += 1) v[i] = y[i];
  v[OI.Om] = -x[4];
  v[OI.beta] = x[5];
  v[OI.delta] = x[8];
  v[OI.tauA] = x[9];
  v[OI.hipT] = 0;
  v[OI.p] = x[1];
  v[OI.turn] = -x[4];
  return v;
}
/** The model's open loop to a unit command on `ch`: m = 0 … H (m = 0 zero). */
export function modelOpen(phi: number[][], gamma: number[][], c: number[][], ch: 0 | 1): Resp {
  const out: Resp = [new Float64Array(N_OUT)];
  let x = gamma.map((row) => row[ch]);
  for (let m = 1; m <= H; m += 1) {
    out.push(modelOut(c, x));
    x = matVec(phi, x);
  }
  return out;
}
/** The model's closed loop (`closedLoop`, the kick on the true plant's input alone) to a unit command on `ch`. */
export function modelClosed(d: Design, ch: 0 | 1): Resp {
  const M = closedLoop(d.phi, d.gamma, d.steps, d);
  const n = d.phi.length;
  let z = new Array<number>(M.length).fill(0);
  for (let i = 0; i < n; i += 1) z[i] = d.gamma[i][ch];
  const out: Resp = [new Float64Array(N_OUT)];
  for (let m = 1; m <= H; m += 1) {
    out.push(modelOut(d.c, z.slice(0, n)));
    z = matVec(M, z);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The loop on a response (README §0.6): G[m][o][ch], the perturbation controller, the kick at m = 0.
// ---------------------------------------------------------------------------------------------------------------
/** G[m] as an N_OUT × 2 matrix from the two channels' responses. */
export function stack(ga: Resp, gt: Resp): Float64Array[][] {
  const out: Float64Array[][] = [];
  for (let m = 0; m <= H; m += 1) out.push([ga[m], gt[m]]);
  return out;
}
export interface CtrlOpts { designDelay?: number; senseShift?: number }
/** The controller's exact perturbation map: a fresh controller, zero asks, limits it never meets, after zero ticks. */
export function perturbation(weights: DesignWeights, args: (m: number) => { speed: number; depth: number; rail: number }, opts: CtrlOpts = {}): (m: number, y: ArrayLike<number>) => [number, number] {
  const with_ = <T>(f: () => T): T => {
    const d0 = WOBBLE.designDelay, s0 = WOBBLE.senseShift;
    WOBBLE.designDelay = opts.designDelay ?? -1;
    WOBBLE.senseShift = opts.senseShift ?? 0;
    try { return f(); } finally { WOBBLE.designDelay = d0; WOBBLE.senseShift = s0; }
  };
  const c = with_(() => new PredictiveController(weights));
  const limits = { ankle: 10, twist: 1e4 };
  const zero = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = -12; k < 0; k += 1) { const a = args(k); with_(() => c.tick(zero, a.speed, a.depth, 0, 0, limits, a.rail)); }
  return (m, y) => {
    const a = args(m);
    const s = [y[0], y[1], y[2], y[3], y[4], y[5], y[6], 0, 0];
    const u = with_(() => c.tick(s, a.speed, a.depth, 0, 0, limits, a.rail));
    return [u[0], u[1]];
  };
}
/** The closed loop on G with the controller `ctrl`, a unit kick on `ch` at m = 0: the outputs and the commands. */
export function closeOn(G: Float64Array[][], ch: 0 | 1, ctrl: (m: number, y: ArrayLike<number>) => [number, number]): { y: Resp; u: number[][] } {
  const y: Resp = [];
  const u: number[][] = [];
  for (let m = 0; m <= H; m += 1) {
    const v = new Float64Array(N_OUT);
    for (let j = 1; j <= m; j += 1) {
      const gj = G[j], uj = u[m - j];
      for (let o = 0; o < N_OUT; o += 1) v[o] += gj[0][o] * uj[0] + gj[1][o] * uj[1];
    }
    y.push(v);
    const c = ctrl(m, v);
    u.push([c[0] + (m === 0 && ch === 0 ? 1 : 0), c[1] + (m === 0 && ch === 1 ? 1 : 0)]);
  }
  return { y, u };
}

// ---------------------------------------------------------------------------------------------------------------
// The read-outs: the spectrum's peak and the damped sinusoid (README §0.6).
// ---------------------------------------------------------------------------------------------------------------
const PAD = 0.05;
export const FREQS = Array.from({ length: Math.round((5.5 - 1.0) / PAD) + 1 }, (_, i) => 1.0 + i * PAD);
export function power(x: ArrayLike<number>, from = 1, to = H): number[] {
  return FREQS.map((f) => {
    let re = 0, im = 0;
    for (let m = from; m <= to; m += 1) { const a = 2 * Math.PI * f * m / 60; re += x[m] * Math.cos(a); im -= x[m] * Math.sin(a); }
    return re * re + im * im;
  });
}
/** The peak in 1.5–5 Hz of a (pooled) power spectrum on FREQS, refined by a parabola. */
export function peakOf(p: number[]): number {
  let best = -1;
  for (let i = 0; i < FREQS.length; i += 1) if (FREQS[i] >= 1.5 - 1e-9 && FREQS[i] <= 5 + 1e-9 && (best < 0 || p[i] > p[best])) best = i;
  const a = p[best - 1] ?? 0, b = p[best], c = p[best + 1] ?? 0;
  const den = a - 2 * b + c;
  const off = den !== 0 ? 0.5 * (a - c) / den : 0;
  return FREQS[best] + off * PAD;
}
/** A e^{−σt} cos(2πft + ϕ) + c by least squares over m = 2 … 48 (t = m / 60), on the grid f 1.5–5 Hz by 0.01 and σ −10 to 40 /s by 0.1. */
const FIT_M = Array.from({ length: 47 }, (_, i) => i + 2);
const FIT_F = Array.from({ length: 351 }, (_, i) => 1.5 + i * 0.01);
const FIT_S = Array.from({ length: 501 }, (_, i) => -10 + i * 0.1);
const COSF = FIT_F.map((f) => Float64Array.from(FIT_M, (m) => Math.cos(2 * Math.PI * f * m / 60)));
const SINF = FIT_F.map((f) => Float64Array.from(FIT_M, (m) => Math.sin(2 * Math.PI * f * m / 60)));
const EXPS = FIT_S.map((sg) => Float64Array.from(FIT_M, (m) => Math.exp(-sg * m / 60)));
export function fitDamped(x: ArrayLike<number>): { f: number; sigma: number; q2: number; zeta: number; rel: number } {
  const n = FIT_M.length;
  const ys = Float64Array.from(FIT_M, (m) => x[m]);
  let yy = 0, y1 = 0;
  for (let i = 0; i < n; i += 1) { yy += ys[i] * ys[i]; y1 += ys[i]; }
  let best = { fi: -1, si: -1, res: Infinity };
  const ec = new Float64Array(n), es = new Float64Array(n);
  for (let fi = 0; fi < FIT_F.length; fi += 1) {
    const c = COSF[fi], sn = SINF[fi];
    for (let si = 0; si < FIT_S.length; si += 1) {
      const e = EXPS[si];
      let acc = 0, acs = 0, ass = 0, ac = 0, as = 0, bc = 0, bs = 0;
      for (let i = 0; i < n; i += 1) {
        const u = e[i] * c[i], v = e[i] * sn[i];
        ec[i] = u; es[i] = v;
        acc += u * u; acs += u * v; ass += v * v; ac += u; as += v; bc += u * ys[i]; bs += v * ys[i];
      }
      // [acc acs ac; acs ass as; ac as n] sol = [bc bs y1]
      const a00 = acc, a01 = acs, a02 = ac, a11 = ass, a12 = as, a22 = n;
      const c00 = a11 * a22 - a12 * a12, c01 = a02 * a12 - a01 * a22, c02 = a01 * a12 - a02 * a11;
      const det = a00 * c00 + a01 * c01 + a02 * c02;
      if (!(Math.abs(det) > 1e-300)) continue;
      const c11 = a00 * a22 - a02 * a02, c12 = a01 * a02 - a00 * a12, c22 = a00 * a11 - a01 * a01;
      const s0 = (c00 * bc + c01 * bs + c02 * y1) / det;
      const s1 = (c01 * bc + c11 * bs + c12 * y1) / det;
      const s2 = (c02 * bc + c12 * bs + c22 * y1) / det;
      const res = yy - (s0 * bc + s1 * bs + s2 * y1);
      if (res < best.res) best = { fi, si, res };
    }
  }
  const f = FIT_F[best.fi], sigma = FIT_S[best.si];
  const q2 = Math.exp((-2 * sigma) / f);
  const zeta = sigma / Math.hypot(sigma, 2 * Math.PI * f);
  return { f, sigma, q2, zeta, rel: yy > 0 ? Math.sqrt(Math.max(0, best.res) / yy) : Number.NaN };
}
/** Solve A x = b (small, dense) by Gaussian elimination with partial pivoting. */
function solveDense(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let piv = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    [m[c], m[piv]] = [m[piv], m[c]];
    const d = m[c][c];
    if (d === 0) continue;
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = m[r][c] / d;
      if (f === 0) continue;
      for (let k = c; k <= n; k += 1) m[r][k] -= f * m[c][k];
    }
  }
  return m.map((row, i) => (row[i] !== 0 ? row[n] / row[i] : 0));
}
export interface Mode { f: number; zeta: number; sigma: number; energy: number; share: number }
/**
 * **Amendment 2's read-out (README §0.11 item 2): Prony's modes of a response**, x[m] for m = 1 … H: a least-squares
 * linear prediction of order p, its poles (the companion matrix's eigenvalues), each pole's (or pair's) part of x by
 * least squares, and its energy Σ_m part². Returns every oscillating mode (f > 0) and real pole, by energy.
 */
export function prony(x: ArrayLike<number>, p = 16, from = 1, to = H): Mode[] {
  const R = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const r = new Array<number>(p).fill(0);
  for (let m = from + p; m <= to; m += 1) {
    for (let i = 0; i < p; i += 1) {
      r[i] += x[m] * x[m - 1 - i];
      for (let j = 0; j < p; j += 1) R[i][j] += x[m - 1 - i] * x[m - 1 - j];
    }
  }
  let tr = 0;
  for (let i = 0; i < p; i += 1) tr += R[i][i];
  if (!(tr > 0)) return [];
  for (let i = 0; i < p; i += 1) R[i][i] += 1e-13 * tr / p;
  const a = solveDense(R, r);
  const C = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === 0 ? a[j] : i - 1 === j ? 1 : 0)));
  const z = eigenvalues(C, { balance: true, maxIterations: 400 });
  // One representative per pair (im > 0) and every real pole; the basis Re z^m, Im z^m (or z^m).
  const reps = z.filter((q) => q.im > 1e-12 || Math.abs(q.im) <= 1e-12);
  const cols: { k: number; f: (m: number) => number }[] = [];
  reps.forEach((q, k) => {
    const rad = Math.hypot(q.re, q.im), th = Math.atan2(q.im, q.re);
    if (Math.abs(q.im) <= 1e-12) cols.push({ k, f: (m) => Math.sign(q.re) ** m * Math.abs(q.re) ** m });
    else { cols.push({ k, f: (m) => rad ** m * Math.cos(th * m) }); cols.push({ k, f: (m) => rad ** m * Math.sin(th * m) }); }
  });
  const nb = cols.length;
  const B = Array.from({ length: nb }, () => new Array<number>(nb).fill(0));
  const bb = new Array<number>(nb).fill(0);
  const vals = cols.map((c) => Float64Array.from({ length: to - from + 1 }, (_, i) => c.f(from + i)));
  for (let i = 0; i < nb; i += 1) {
    for (let m = 0; m <= to - from; m += 1) bb[i] += vals[i][m] * x[from + m];
    for (let j = 0; j < nb; j += 1) { let sum = 0; for (let m = 0; m <= to - from; m += 1) sum += vals[i][m] * vals[j][m]; B[i][j] = sum; }
  }
  let trB = 0;
  for (let i = 0; i < nb; i += 1) trB += B[i][i];
  for (let i = 0; i < nb; i += 1) B[i][i] += 1e-13 * trB / Math.max(1, nb);
  const coef = solveDense(B, bb);
  const energy = new Array<number>(reps.length).fill(0);
  for (let m = 0; m <= to - from; m += 1) {
    const part = new Array<number>(reps.length).fill(0);
    cols.forEach((c, i) => { part[c.k] += coef[i] * vals[i][m]; });
    for (let k = 0; k < reps.length; k += 1) energy[k] += part[k] * part[k];
  }
  const total = energy.reduce((s2, e) => s2 + e, 0);
  return reps.map((q, k) => {
    const rad = Math.hypot(q.re, q.im);
    const re = Math.log(Math.max(rad, 1e-300)) * 60, im = Math.atan2(q.im, q.re) * 60;
    return { f: im / (2 * Math.PI), sigma: -re, zeta: -re / Math.hypot(re, im), energy: energy[k], share: total > 0 ? energy[k] / total : 0 };
  }).sort((u, v) => v.energy - u.energy);
}
/** The dominant mode in 1.5–5 Hz (largest energy), or undefined. */
export function ring(x: ArrayLike<number>): Mode | undefined {
  return prony(x).find((m) => m.f >= 1.5 && m.f <= 5);
}
/** The relative waveform error over m = 1 … H on the rows given. */
export function waveErr(a: Resp, b: Resp, rows: number[]): number {
  let num = 0, den = 0;
  for (let m = 1; m <= H; m += 1) for (const o of rows) { const d = a[m][o] - b[m][o]; num += d * d; den += b[m][o] * b[m][o]; }
  return den > 0 ? Math.sqrt(num / den) : Number.NaN;
}
/** The largest |a − b| over the largest |b|, m = 1 … H, on the rows given. */
export function maxRel(a: Resp, b: Resp, rows: number[]): number {
  let num = 0, den = 0;
  for (let m = 1; m <= H; m += 1) for (const o of rows) { num = Math.max(num, Math.abs(a[m][o] - b[m][o])); den = Math.max(den, Math.abs(b[m][o])); }
  return den > 0 ? num / den : Number.NaN;
}

// ---------------------------------------------------------------------------------------------------------------
// The stage table's DFT (README §0.6): H(f) = Σ_{m=1}^{60} g[m] e^{−i2πfm/60}.
// ---------------------------------------------------------------------------------------------------------------
export function dft(g: Resp, o: number | ((v: Float64Array) => number), f: number, w = W_OPEN): { re: number; im: number } {
  let re = 0, im = 0;
  for (let m = 1; m <= w; m += 1) {
    const x = typeof o === 'number' ? g[m][o] : o(g[m]);
    const a = 2 * Math.PI * f * m / 60;
    re += x * Math.cos(a); im -= x * Math.sin(a);
  }
  return { re, im };
}
export const cdiv = (a: { re: number; im: number }, b: { re: number; im: number }): { re: number; im: number } => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};

// ---------------------------------------------------------------------------------------------------------------
// The swaps (README §0.6).
// ---------------------------------------------------------------------------------------------------------------
/** A hybrid: rows in `rows` of column `ch` (or both) taken from the model. */
export function mix(Gg: Float64Array[][], Gm: Float64Array[][], pick: (o: number, ch: 0 | 1) => boolean): Float64Array[][] {
  return Gg.map((col, m) => [0, 1].map((ch) => Float64Array.from(col[ch], (v, o) => (pick(o, ch as 0 | 1) ? Gm[m][ch][o] : v)))) as Float64Array[][];
}
/** Stage (i): G_meas ∗ A_meas⁻¹ ∗ A_model on the two actuators (δ, τ_a), block-Toeplitz deconvolution. */
export function swapActuators(Gg: Float64Array[][]): Float64Array[][] {
  // A[m] (2 × 2): actuators (rows δ, τ_a) per unit command (columns); m ≥ 1.
  const A = (m: number) => [[Gg[m][0][OI.delta], Gg[m][1][OI.delta]], [Gg[m][0][OI.tauA], Gg[m][1][OI.tauA]]];
  const Am = (m: number) => { const v = m >= 1 ? (1 - LAG) * LAG ** (m - 1) : 0; return [[v, 0], [0, v]]; };
  const a1 = A(1);
  const det = a1[0][0] * a1[1][1] - a1[0][1] * a1[1][0];
  const inv = [[a1[1][1] / det, -a1[0][1] / det], [-a1[1][0] / det, a1[0][0] / det]];
  // X[j] (N_OUT × 2): G[m] = Σ_{j=0}^{m−1} X[j] A[m − j].
  const X: number[][][] = [];
  for (let m = 1; m <= H; m += 1) {
    const r = Array.from({ length: N_OUT }, (_, o) => [Gg[m][0][o], Gg[m][1][o]]);
    for (let j = 0; j <= m - 2; j += 1) { const am = A(m - j); for (let o = 0; o < N_OUT; o += 1) for (let c = 0; c < 2; c += 1) r[o][c] -= X[j][o][0] * am[0][c] + X[j][o][1] * am[1][c]; }
    X.push(r.map((row) => [row[0] * inv[0][0] + row[1] * inv[1][0], row[0] * inv[0][1] + row[1] * inv[1][1]]));
  }
  const out: Float64Array[][] = [[new Float64Array(N_OUT), new Float64Array(N_OUT)]];
  for (let m = 1; m <= H; m += 1) {
    const col = [new Float64Array(N_OUT), new Float64Array(N_OUT)];
    for (let j = 0; j <= m - 1; j += 1) { const am = Am(m - j); for (let o = 0; o < N_OUT; o += 1) for (let c = 0; c < 2; c += 1) col[c][o] += X[j][o][0] * am[0][c] + X[j][o][1] * am[1][c]; }
    out.push(col);
  }
  return out;
}
/** Stage (ii): the model's mechanics driven by the measured actuators (their equivalent commands through the model's lag). */
export function swapMechanics(Gg: Float64Array[][], Gm: Float64Array[][]): Float64Array[][] {
  // u_eq[j][q][ch], j = 0 … H − 1: the command that takes the model's lag through the measured δ (q 0) and τ_a (q 1).
  const act = (m: number, q: number, ch: number) => (m <= 0 ? 0 : Gg[m][ch][q === 0 ? OI.delta : OI.tauA]);
  const out: Float64Array[][] = [[new Float64Array(N_OUT), new Float64Array(N_OUT)]];
  for (let m = 1; m <= H; m += 1) {
    const col = [new Float64Array(N_OUT), new Float64Array(N_OUT)];
    for (let j = 0; j <= m - 1; j += 1) for (let ch = 0; ch < 2; ch += 1) for (let q = 0; q < 2; q += 1) {
      const ueq = (act(j + 1, q, ch) - LAG * act(j, q, ch)) / (1 - LAG);
      if (ueq === 0) continue;
      const gm = Gm[m - j][q];
      for (let o = 0; o < N_OUT; o += 1) col[ch][o] += gm[o] * ueq;
    }
    out.push(col);
  }
  return out;
}
/** Stage (iii): the senses of the measured states with the board's own rates: y4 = y2 + Ω, y6 = y1 − p. */
export function swapSenses(Gg: Float64Array[][]): Float64Array[][] {
  return Gg.map((col) => col.map((v) => { const w = Float64Array.from(v); w[4] = v[2] + v[OI.Om]; w[6] = v[1] - v[OI.p]; return w; }));
}

export const median = (xs: number[]): number => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return Number.NaN;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
