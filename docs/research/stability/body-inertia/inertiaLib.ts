/**
 * **3.6g's library** (README §0.1): the pictures of the board the round compares, each through `plantAt`'s own options
 * (3.6e's `buildPlant` for P_two, P_0 and the J sweep; the same `plantAt` call with `riderBody=control`'s object for
 * P_control), their discretisations, open responses (frozen and speed-following, 3.6e's interpolation) and closures.
 * No `src` change.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { plantAt, type Mat } from '../../../../src/physics/predictiveBalance';
import type { TwistPlant, YawPlant } from '../../../../src/physics/rollModel';
import { ARGS_PRE, W_OPEN, buildPlant, discreteOf, type Disc, type FitSet } from '../board-fit/fitLib';

export interface Picture { key: string; name: string; build: (v: number, depth: number, rail: number) => { y: YawPlant; t: TwistPlant } }
/** P_two, his picture: every multiplier 1 (3.6e's identity: `shippedPlant` bit for bit). */
export const P_TWO: Picture = { key: 'two', name: 'P_two (J sourced, feet roll on)', build: (v, d, r) => buildPlant(v, d, r, {}) };
/** The sweep: J × s, the feet's roll coupling on (`body: <number>`). s = 0 is P_0, s = 1 is P_two. */
export const sweep = (s: number): Picture => ({ key: `J${s}`, name: `J × ${s}`, build: (v, d, r) => buildPlant(v, d, r, { J: s }) });
export const P_0: Picture = { key: 'zero', name: 'P_0 (J = 0, feet roll on)', build: (v, d, r) => buildPlant(v, d, r, { J: 0 }) };
/** P_control: `riderBody=control`'s `{ inertia: 0, feetRoll: false }` (predictiveBalance.ts:1501), his other options. */
export const P_CONTROL: Picture = {
  key: 'control', name: 'P_control (pre-3.4a)',
  build: (v, d, r) => plantAt(v, d, { rail: r, body: { inertia: 0, feetRoll: false }, plantFloor: 6, stanceDeep: true }),
};
/** The pre-3.4a plant itself (no `body`), his other options: P_control's control. */
export const prePlant = (v: number, d: number, r: number) => plantAt(v, d, { rail: r, plantFloor: 6, stanceDeep: true });
export const SWEEP = [0, 0.25, 0.5, 1, 2];
export const PICTURES: Picture[] = [P_TWO, P_0, P_CONTROL, ...SWEEP.filter((s) => s !== 0 && s !== 1).map(sweep)];

const caches = new Map<string, Map<string, Disc>>();
export function discOf(p: Picture, v: number, depth: number, rail: number): Disc {
  let c = caches.get(p.key);
  if (!c) { c = new Map(); caches.set(p.key, c); }
  const k = `${v}|${depth}|${rail}`;
  let d = c.get(k);
  if (!d) { d = discreteOf(p.build(v, depth, rail)); c.set(k, d); }
  return d;
}
/** The open response G[m], m = 0 … n (full state), to a unit command on `ch` at the kick tick's point (frozen). */
export function openFrozen(p: Picture, s: FitSet, n = W_OPEN): Float64Array[] {
  const d = discOf(p, s.v, s.depth, s.rail);
  return iterate((_m) => d, s.channel, n);
}
function iterate(at: (m: number) => Disc, ch: number, n: number): Float64Array[] {
  const out: Float64Array[] = [new Float64Array(10)];
  let x = Float64Array.from(at(0).gamma.map((row) => row[ch]));
  for (let m = 1; m <= n; m += 1) {
    out.push(x);
    const d = at(m);
    const nx = new Float64Array(10);
    for (let i = 0; i < 10; i += 1) { let sum = 0; const r = d.phi[i]; for (let j = 0; j < 10; j += 1) sum += r[j] * x[j]; nx[i] = sum; }
    x = nx;
  }
  return out;
}
/** 3.6e's speed-following response (`ltvResp`): the schedule speed tick by tick, depth and rail held; 0.25 m/s nodes. */
const NODE = 0.25;
export function openSF(p: Picture, s: FitSet, n = W_OPEN): Float64Array[] {
  const node = (v: number) => discOf(p, v, s.depth, s.rail);
  const at = (v: number): Disc => {
    const lo = Math.floor(v / NODE) * NODE, hi = lo + NODE;
    const f = (v - lo) / NODE;
    if (f < 1e-12) return node(lo);
    const a = node(lo), b = node(hi);
    return { phi: a.phi.map((row, i) => row.map((x, j) => x + f * (b.phi[i][j] - x))), gamma: a.gamma.map((row, i) => row.map((x, j) => x + f * (b.gamma[i][j] - x))) };
  };
  const speed = (k: number) => s.kb.args.speed[Math.max(0, Math.min(s.kb.args.speed.length - 1, ARGS_PRE + k))] as number;
  return iterate((m) => at(speed(m)), s.channel, n);
}
/** The largest |Δ| between two discretisations. */
export function maxDiff(a: Disc, b: Disc): number {
  let w = 0;
  for (let i = 0; i < a.phi.length; i += 1) {
    for (let j = 0; j < a.phi[i].length; j += 1) w = Math.max(w, Math.abs(a.phi[i][j] - b.phi[i][j]));
    for (let j = 0; j < a.gamma[i].length; j += 1) w = Math.max(w, Math.abs(a.gamma[i][j] - b.gamma[i][j]));
  }
  return w;
}
/** Largest per-row relative |Δ| between two continuous matrices (3.4a's test's measure). */
export function rowRel(a: Mat, b: Mat): number {
  let worst = 0;
  for (let i = 0; i < a.length; i += 1) {
    let big = 1e-9;
    for (let j = 0; j < a[i].length; j += 1) big = Math.max(big, Math.abs(a[i][j]));
    for (let j = 0; j < a[i].length; j += 1) worst = Math.max(worst, Math.abs(a[i][j] - b[i][j]) / big);
  }
  return worst;
}
export const jsonl = (dir: string): string[] => readdirSync(dir).filter((x) => x.endsWith('.jsonl')).sort().map((x) => join(dir, x));
export const STANCES: [string, string][] = [['compress:straight', 'Compress'], ['crouch:straight', 'tuck'], ['none:straight', 'tall']];
export const q = (xs: number[], p: number): number => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return Number.NaN;
  const i = (s.length - 1) * p; const lo = Math.floor(i);
  return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo);
};
export const med = (xs: number[]): number => q(xs, 0.5);
export const fx = (x: number, n = 3): string => (Number.isFinite(x) ? x.toFixed(n) : '—');

// ---------------------------------------------------------------------------------------------------------------
// The closures (README §0.3): 3.6e's `closures.ts` read-outs, the plant a picture, the controller the shipped design.
// ---------------------------------------------------------------------------------------------------------------
import type { DesignWeights } from '../../../../src/physics/predictiveBalance';
import { readout } from '../response/analyse';
import { OI, SENSE_ROWS, perturbation, ring, waveErr } from '../response/responseLib';
import { closeLTV, envelope } from '../board-fit/fitLib';

export interface Read { f: number; zeta: number; fitF?: number; fitZeta?: number; env: number; waveOm: number; waveSense: number }
export function closeSet(p: Picture, s: FitSet, W: DesignWeights, frozen: boolean): Read {
  const kb = s.kb;
  const argAt = (m: number) => { const i = Math.max(0, Math.min(kb.args.speed.length - 1, ARGS_PRE + m)); return { speed: kb.args.speed[i] as number, depth: kb.args.depth[i] as number, rail: kb.args.rail[i] as number }; };
  const at = frozen ? () => argAt(0) : argAt;
  const y = closeLTV((m) => { const a = at(m); return discOf(p, a.speed, a.depth, a.rail); }, s.channel as 0 | 1, perturbation(W, at));
  const tw = s.set.g;
  const om = y.map((v) => v[OI.Om]);
  const md = ring(om);
  const fr = readout(om);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { f: md?.f ?? Number.NaN, zeta: md?.zeta ?? Number.NaN, fitF: fr.fitF, fitZeta: fr.fitZeta, env: envelope(om, md?.f ?? Number.NaN), waveOm: waveErr(y as any, tw, [OI.Om]), waveSense: waveErr(y as any, tw, SENSE_ROWS) };
}
export function twinRead(s: FitSet): { f: number; zeta: number; fitF: number; fitZeta: number; env: number } {
  const om = s.set.g.map((v) => v[OI.Om]);
  const r = readout(om);
  return { f: r.f, zeta: r.zeta, fitF: r.fitF, fitZeta: r.fitZeta, env: envelope(om, r.f) };
}
