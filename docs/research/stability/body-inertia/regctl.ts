/**
 * **3.6g question 3: the method's like-for-like control** (README §0.4). The picture's own open twins (its open impulse
 * response at each fitting-seed open set's kick point, frozen), integrated in 64 substeps per tick; its own rider yaw
 * term R_N = I_z,b ṙ − (N_φ φ + N_β β + N_r r + N_p φ̇) as the frame mean a ledger books; put through 3.6e's question-1
 * regression unchanged (`ledgerSet`, `regress`, the 14 rider regressors and the φ̇-RMS weights). Beside it: the
 * synthetic control, and the two exact representations of R_N (kinematic `modelCoefs`, the ankle's form) with their
 * residuals against the frame means.
 *
 *   node regctl.mjs <fitting dir> <3.6e results/fit dir> <out prefix>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { continuousPlant, discretise } from '../../../../src/physics/predictiveBalance';
import { SPEED_FLOOR, RIDER_REG, binOf, fitSets, ledgerSet, loadRuns, modelCoefs, outOf, regress, type FitSet, type LedgerSet } from '../board-fit/fitLib';
import { P_0, P_TWO, STANCES, fx, jsonl, med, openFrozen, type Picture } from './inertiaLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [fitRuns, fitDir, outPrefix] = process.argv.slice(2);
const NSUB = 64;
const G = 9.81;
/** The picture's own twin at a set: tick samples x[0 … 61] and the frame means of R_N over frames 0 … 60. */
function twin(p: Picture, s: FitSet): { x: Float64Array[]; rn: Float64Array; y: Any; consistency: number } {
  const { y, t } = p.build(s.v, s.depth, s.rail);
  const { a, b } = continuousPlant(y, t);
  const d = discretise(a, b, 1 / (60 * NSUB));
  const n = 10;
  const rowR = new Float64Array(n);
  for (let j = 0; j < n; j += 1) rowR[j] = y.boardYawInertia * a[4][j];
  rowR[0] -= y.heelYaw; rowR[5] -= y.slipYaw; rowR[4] -= y.yawDamping; rowR[1] -= y.rollRateYaw;
  const bR = y.boardYawInertia * b[4][s.channel]; // zero: the commands enter only the lags
  let x = new Float64Array(n);
  const xs: Float64Array[] = [x];
  const rn = new Float64Array(61);
  const R = (v: Float64Array, u: number) => { let sum = u * bR; for (let j = 0; j < n; j += 1) sum += rowR[j] * v[j]; return sum; };
  for (let m = 0; m <= 60; m += 1) {
    const u = m === 0 ? 1 : 0;
    let acc = 0.5 * R(x, u);
    for (let k = 1; k <= NSUB; k += 1) {
      const nx = new Float64Array(n);
      for (let i = 0; i < n; i += 1) { let sum = d.gamma[i][s.channel] * u; const r = d.phi[i]; for (let j = 0; j < n; j += 1) sum += r[j] * x[j]; nx[i] = sum; }
      x = nx;
      acc += (k === NSUB ? 0.5 : 1) * R(x, u);
    }
    rn[m] = acc / NSUB;
    xs.push(x);
  }
  // Consistency: the substep-integrated tick samples against the 1/60 s discretisation (openFrozen).
  const G1 = openFrozen(p, s, 61);
  let num = 0, den = 0;
  for (let m = 1; m <= 61; m += 1) for (let i = 0; i < 8; i += 1) { num = Math.max(num, Math.abs(xs[m][i] - G1[m][i])); den = Math.max(den, Math.abs(G1[m][i])); }
  return { x: xs, rn, y, consistency: num / den };
}
/** A FitSet carrying the picture's own twin as its measured response, R_N as the ledger's `rider` entry (κ = 1/2). */
function asLedger(s: FitSet, tw: { x: Float64Array[]; rn: Float64Array }): LedgerSet {
  const g = tw.x.map((v) => outOf(v));
  const pe = new Array<number>(70).fill(0), me = new Array<number>(70).fill(0);
  for (let m = 0; m < 60; m += 1) pe[m + 2] = tw.rn[m];
  const set = { ...s.set, g, rows: { ...s.set.rows, p: { ...s.set.rows.p, delta: -0.5, e: { rider: pe } }, m: { ...s.set.rows.m, e: { rider: me } } } } as Any;
  return ledgerSet({ ...s, set } as FitSet, 'yaw')!;
}
/** The ankle form of R_N (README §0.4): H = (−τ + m g h θ − J θ̈) / h from the bank row. RIDER_REG order. */
function ankleForm(y: Any, t: Any): number[] {
  const k = y.ankleStiffness, c = y.ankleDamping, m = y.mass, h = y.height, xf = y.feetStation;
  const fxr = y.feetForward / (m * G);
  const J = y.body?.inertia ?? 0;
  const kt = t.stiffness, ct = t.damping, Ir = y.riderYawInertia;
  // [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a, φ̈, θ̈, ṙ, β̇]
  return [-xf * k / h + fxr * k, -xf * c / h + fxr * c, -xf * (-k + m * G * h) / h - fxr * k, xf * c / h - fxr * c, -ct, 0, kt, ct, -xf * k / h + fxr * k, 1, 0, xf * J / h, -Ir, 0];
}
/** The two forms against R_N in continuous time at the twin's own states (exact derivatives from A): largest relative |Δ|. */
function exactCheck(p: Picture, s: FitSet, xs: Float64Array[], kin: number[], ank: number[]): { kin: number; ank: number } {
  const { y, t } = p.build(s.v, s.depth, s.rail);
  const { a } = continuousPlant(y, t);
  let wk = 0, wa = 0, big = 0;
  for (let m = 2; m <= 60; m += 1) {
    const x = xs[m];
    const xd = a.map((row) => row.reduce((acc, v, j) => acc + v * x[j], 0));
    const rn = y.boardYawInertia * xd[4] - (y.heelYaw * x[0] + y.slipYaw * x[5] + y.yawDamping * x[4] + y.rollRateYaw * x[1]);
    // [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a, φ̈, θ̈, ṙ, β̇]
    const z = [x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], x[9], xd[1], xd[3], xd[4], xd[5]];
    const dot = (b: number[]) => b.reduce((acc, v, i) => acc + v * z[i], 0);
    big = Math.max(big, Math.abs(rn));
    wk = Math.max(wk, Math.abs(rn - dot(kin))); wa = Math.max(wa, Math.abs(rn - dot(ank)));
  }
  return { kin: wk / big, ank: wa / big };
}
const relResid = (ls: LedgerSet[], b: number[]): number => {
  let num = 0, den = 0;
  for (const l of ls) for (let m = 0; m < 60; m += 1) {
    const pred = RIDER_REG.reduce((a, k, i) => a + b[i] * l.reg[k][m], 0);
    num += ((l.e.rider[m] - pred) * l.w) ** 2; den += (l.e.rider[m] * l.w) ** 2;
  }
  return Math.sqrt(num / den);
};
const runs = loadRuns(jsonl(fitRuns), false);
const { all } = fitSets(runs);
const out: Any = { nsub: NSUB, stances: {} };
const L: string[] = ['# 3.6g question 3: 3.6e\'s question-1 regression on the picture\'s own twins', '',
  `*The fitting seeds' open sets passing over 1.0 s at ≥ 4 m/s (Canyon Big seeds 1–3), the picture's open impulse response at each kick point (frozen), ${NSUB} substeps per tick; R_N the board's yaw row less its water, as frame means; 3.6e's 14 rider regressors and weights, OLS, cluster-robust errors by set. Model signs, N·m per unit command; per r in N·m per rad/s, per ṙ in kg·m². κ is the scaled condition number (3.6e reads a coefficient only where κ ≤ 1e3 and its VIF ≤ 30). Kinematic b_kin = 3.6e's "model's coefficients" (modelCoefs); ankle form b_ank (H from the bank row).*`, ''];
const SHOW = ['phi', 'theta', 'r', 'beta', 'delta', 'rdot', 'betadot', 'thetaddot'];
const at = (k: string) => RIDER_REG.indexOf(k);
for (const [script, label] of STANCES) {
  const fit = JSON.parse(readFileSync(join(fitDir, `fit-${label}.json`), 'utf8'));
  const sets = all.filter((s) => s.script === script && s.mode === 'open' && s.set.pass60 && s.v >= SPEED_FLOOR);
  out.stances[label] = {};
  for (const p of [P_TWO, P_0]) {
    let cons = 0, exK = 0, exA = 0;
    const items = sets.map((s) => {
      const tw = twin(p, s);
      cons = Math.max(cons, tw.consistency);
      const pl = p.build(s.v, s.depth, s.rail);
      const kin = modelCoefs(s).riderYaw, ank = ankleForm(pl.y, pl.t);
      const ex = exactCheck(p, s, tw.x, kin, ank);
      exK = Math.max(exK, ex.kin); exA = Math.max(exA, ex.ank);
      return { s, l: asLedger(s, tw), kin: modelCoefs(s).riderYaw, ank: ankleForm(pl.y, pl.t), V: pl.y.speed, m: pl.y.mass, xf: pl.y.feetStation };
    });
    const groups: [string, typeof items][] = [...[0, 1, 2].map((b) => [`bin ${['[4, ' + fit.edges[0] + ')', '[' + fit.edges[0] + ', ' + fit.edges[1] + ')', '[' + fit.edges[1] + ', ∞)'][b]}`, items.filter((it) => binOf(it.s.v, fit.edges) === b)] as [string, typeof items]), ['all ≥ 4 m/s', items]];
    const res: Any = { consistency: cons, exactKin: exK, exactAnk: exA, groups: {} };
    L.push(`## ${label}, ${p.name} (${items.length} sets; substep-integrated samples against the 1/60 s plant: largest relative difference ${cons.toExponential(1)}; in continuous time both forms equal R_N to ${exK.toExponential(1)} (kinematic) and ${exA.toExponential(1)} (ankle), relative to the largest |R_N|)`, '');
    L.push(`| group (sets, median speed) | R² | κ | ${SHOW.map((k) => k).join(' | ')} | line |`);
    L.push(`| --- | --- | --- | ${SHOW.map(() => '---').join(' | ')} | --- |`);
    for (const [gname, it] of groups) {
      if (it.length < 4) continue;
      const ls = it.map((x) => x.l);
      const r = regress(ls, (l) => l.e.rider, RIDER_REG);
      const mean = (f: (x: (typeof it)[number]) => number[]) => RIDER_REG.map((_, i) => it.reduce((a, x) => a + f(x)[i], 0) / it.length);
      const kin = mean((x) => x.kin), ank = mean((x) => x.ank);
      const mVx = it.reduce((a, x) => a + Math.abs(x.m * x.V * x.xf), 0) / it.length;
      // The synthetic control (3.6e §0.2): y = X b̄_kin with one b̄ (the group's mean), noise-free (amendment 1).
      const ys = new Map(ls.map((l) => [l, Float64Array.from({ length: 60 }, (_, m) => RIDER_REG.reduce((a, k, j) => a + kin[j] * l.reg[k][m], 0))]));
      const sc = regress(ls, (l) => ys.get(l)!, RIDER_REG);
      const scErr = Math.sqrt(kin.reduce((a, x, i) => a + (sc.coef[i] - x) ** 2, 0) / kin.reduce((a, x) => a + x * x, 0));
      // Amendment 1, exploratory: y = X_i b_kin,i, each set's own kinematic coefficients (its own speed), noise-free.
      const ysi = new Map(ls.map((l, i) => [l, Float64Array.from({ length: 60 }, (_, m) => RIDER_REG.reduce((a, k, j) => a + it[i].kin[j] * l.reg[k][m], 0))]));
      const sci = regress(ls, (l) => ysi.get(l)!, RIDER_REG);
      const sciErr = Math.sqrt(kin.reduce((a, x, i) => a + (sci.coef[i] - x) ** 2, 0) / kin.reduce((a, x) => a + x * x, 0));
      const ci = (k: string) => sci.coef[at(k)];
      const sciLine = Math.abs(ci('r') - kin[at('r')]) <= 0.3 * Math.abs(kin[at('r')]) && Math.abs(ci('rdot') - kin[at('rdot')]) <= 0.3 * Math.abs(kin[at('rdot')]) ? 'kinematic'
        : Math.abs(ci('r') - ank[at('r')]) <= 0.3 * mVx && Math.abs(ci('phi') - ank[at('phi')]) <= 0.3 * Math.abs(ank[at('phi')]) && Math.abs(ci('delta') - ank[at('delta')]) <= 0.3 * Math.abs(ank[at('delta')]) ? 'ankle form' : 'neither';
      // Residuals of the two exact representations against the frame-mean R_N (each set's own coefficients).
      const resid = (f: (x: (typeof it)[number]) => number[]) => { let num = 0, den = 0; for (const x of it) { const l = x.l; const b = f(x); for (let m = 0; m < 60; m += 1) { const pred = RIDER_REG.reduce((a, k, i) => a + b[i] * l.reg[k][m], 0); num += ((l.e.rider[m] - pred) * l.w) ** 2; den += (l.e.rider[m] * l.w) ** 2; } } return Math.sqrt(num / den); };
      const rKin = resid((x) => x.kin), rAnk = resid((x) => x.ank), rOls = relResid(ls, r.coef);
      const c = (k: string) => r.coef[at(k)];
      const kinLine = Math.abs(c('r') - kin[at('r')]) <= 0.3 * Math.abs(kin[at('r')]) && Math.abs(c('rdot') - kin[at('rdot')]) <= 0.3 * Math.abs(kin[at('rdot')]);
      const ankLine = Math.abs(c('r') - ank[at('r')]) <= 0.3 * mVx && Math.abs(c('phi') - ank[at('phi')]) <= 0.3 * Math.abs(ank[at('phi')]) && Math.abs(c('delta') - ank[at('delta')]) <= 0.3 * Math.abs(ank[at('delta')]);
      const line = kinLine ? 'kinematic' : ankLine ? 'ankle form' : 'neither';
      res.groups[gname] = { sets: it.length, speed: med(it.map((x) => x.s.v)), coef: r.coef, se: r.se, cond: r.cond, vif: r.vif, r2: r.r2, kin, ank, mVx, synthErr: scErr, synthPerSet: { relErr: sciErr, coef: sci.coef, line: sciLine, r2: sci.r2 }, residKin: rKin, residAnk: rAnk, residOls: rOls, line, perR: { ols: c('r'), kin: kin[at('r')], ank: ank[at('r')], ratioToKin: c('r') / kin[at('r')] }, perRdot: { ols: c('rdot'), kin: kin[at('rdot')], ank: ank[at('rdot')], ratioToKin: c('rdot') / kin[at('rdot')] } };
      L.push(`| **${gname}** (${it.length}, ${fx(res.groups[gname].speed, 1)} m/s): regression | ${fx(r.r2, 4)} | ${r.cond.toExponential(1)} | ${SHOW.map((k) => `${fx(c(k), 2)} ± ${fx(r.se[at(k)], 2)}`).join(' | ')} | **${line}** |`);
      L.push(`| kinematic b_kin (residual ${fx(rKin, 4)}) | | | ${SHOW.map((k) => fx(kin[at(k)], 2)).join(' | ')} | |`);
      L.push(`| ankle form b_ank (residual ${fx(rAnk, 4)}) | | | ${SHOW.map((k) => fx(ank[at(k)], 2)).join(' | ')} | |`);
      L.push(`| exploratory (amendment 1): y = X_i b_kin,i (each set's own speed), noise-free, regressed (R² ${fx(sci.r2, 4)}; ‖b̂ − b̄‖ / ‖b̄‖ ${fx(sciErr, 2)}) | | | ${SHOW.map((k) => fx(ci(k), 2)).join(' | ')} | ${sciLine} |`);
      L.push(`| synthetic control (y = X b̄_kin, one b̄): ‖b̂ − b̄‖ / ‖b̄‖ ${scErr.toExponential(1)} (${scErr <= 1e-8 ? 'PASS' : 'FAIL'}); OLS residual ${fx(rOls, 4)}; VIF max ${fx(Math.max(...r.vif), 0)} | | | | | | | | | | | |`);
    }
    L.push('');
    out.stances[label][p.key] = res;
    console.error(`[regctl ${new Date().toISOString().slice(11, 19)}] ${label} ${p.key}: ${items.length} sets`);
  }
}
writeFileSync(`${outPrefix}.md`, L.join('\n'));
writeFileSync(`${outPrefix}.json`, JSON.stringify(out));
console.log(L.join('\n'));
