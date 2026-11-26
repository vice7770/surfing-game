/**
 * **3.6e's fit on the fitting set** (README §0.2, §0.3): 3.6d's raw twin runs (Big seeds 1–3), one stance per process.
 * Question 1's ledger regressions and their synthetic control; the speed bins; the nested grey-box fits (a)–(d) with
 * their conditioning and bootstrap; the per-(base, kick time) fits of (a); the black-box references; the in-sample
 * errors. Writes the frozen fit (`fit-<stance>.json`: the edges, σ, every fit, the FIR and the free rows) and its tables.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/board-fit/fit.ts --file <s>/fit.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) node <s>/fit.mjs <stance script> <out dir> <twins dir>
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { plantAt } from '../../../../src/physics/predictiveBalance';
import { modelOpen, median } from '../response/responseLib';
import {
  NESTED, OWN, RIDER_REG, ROLL_WATER, SPEED_FLOOR, WATER, WATER_REG, YAW_WATER, binOf, disc, firOf, fitOn, fitSets, freeResp, freeRows, ledgerSet,
  loadRuns, modelCoefs, openResp, predErr, regress, scalesOf, tercileEdges, uncertainty, type FitResult, type FitSet, type LedgerSet, type Mult,
} from './fitLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [script, outDir, dir] = process.argv.slice(2);
const LABEL: Record<string, string> = { 'compress:straight': 'Compress', 'none:straight': 'tall', 'crouch:straight': 'tuck' };
const label = LABEL[script] ?? script;
const log = (s: string) => console.error(`[${label} ${new Date().toISOString().slice(11, 19)}] ${s}`);
const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort().map((f) => join(dir, f));
const runs = loadRuns(files, true);
runs.kicks = runs.kicks.filter((k) => k.script === script);
runs.kbases = runs.kbases.filter((k) => k.script === script);
const { all } = fitSets(runs);
log(`${runs.kicks.length} kick rows, ${all.length} complete sets`);
const L: string[] = [];
const f = (x: number, n = 3) => (Number.isFinite(x) ? (Math.abs(x) >= 1e4 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(2) : x.toFixed(n)) : '—');

// ---- The sets (README §0.1).
const openAll = all.filter((s) => s.mode === 'open' && s.set.pass60);
const slow = openAll.filter((s) => s.v < SPEED_FLOOR);
const open = openAll.filter((s) => s.v >= SPEED_FLOOR);
const edges = tercileEdges(open.map((s) => s.v));
const bins = [0, 1, 2].map((b) => open.filter((s) => binOf(s.v, edges) === b));
const binName = (b: number) => (b === 0 ? `[4, ${edges[0]})` : b === 1 ? `[${edges[0]}, ${edges[1]})` : `[${edges[1]}, ∞)`);
L.push(`# 3.6e fit, ${label} (fitting set: ${files.map((x) => x.split('/').pop()).join(', ')})`, '');
L.push(`- open sets passing over 1.0 s: ${openAll.length} (${openAll.filter((s) => s.channel === 0).length} ankle, ${openAll.filter((s) => s.channel === 1).length} twist); below ${SPEED_FLOOR} m/s, excluded: ${slow.length}`);
L.push(`- the bins (terciles of the kick-tick speeds, m/s): ${[0, 1, 2].map((b) => `${binName(b)}: ${bins[b].length} sets (${bins[b].filter((s) => s.channel === 0).length} ankle), median ${f(median(bins[b].map((s) => s.v)), 2)} m/s, depth ${f(median(bins[b].map((s) => s.depth)), 3)} m`).join('; ')}`);
L.push(`- rails at the kick ticks: largest |rail| ${f(Math.max(...open.map((s) => Math.abs(s.rail))), 4)} rad`, '');

// ---- The frame alignment and the own inertias (README §0.1), on the per-unit differences.
{
  let dOm = 0, sOm = 0, n = 0;
  const iy: number[] = [], ir: number[] = [];
  for (const s of open) {
    const p = s.set.rows.p, mn = s.set.rows.m;
    if (!p?.e || !mn?.e || !p.d || !mn.d) continue;
    const kap = -p.delta;
    const u = (r: Any, k: string, i: number) => (r[k][i] as number);
    const per = (k: string, i: number, src: 'd' | 'e') => (u((p as Any)[src], k, i) - u((mn as Any)[src], k, i)) / (2 * kap);
    let num = 0, den = 0, numR = 0, denR = 0;
    for (let m = 1; m < 60; m += 1) {
      const a = per('OmE', m + 2, 'e'), b = per('Om', m + 3, 'd');
      dOm = Math.max(dOm, Math.abs(a - b)); sOm = Math.max(sOm, Math.abs(b)); n += 1;
      const acc = (per('OmE', m + 2, 'e') - per('OmE', m + 1, 'e')) * 60, tot = per('yTot', m + 2, 'e');
      num += acc * tot; den += acc * acc;
      const accR = (per('pE', m + 2, 'e') - per('pE', m + 1, 'e')) * 60, totR = per('qTot', m + 2, 'e');
      numR += accR * totR; denR += accR * accR;
    }
    if (den > 0) iy.push(num / den);
    if (denR > 0) ir.push(numR / denR);
  }
  L.push('## Controls of the frame alignment (README §0.1)', '');
  L.push(`- the frame-end yaw rate OmE[m] against the tick's Om[m + 1] (per unit, ${n} frames): largest difference ${f(dOm)} against the largest |Om| ${f(sOm)}`);
  L.push(`- the ledger's total against the change of the frame-end rate, slope per set (the own inertia): yaw median ${f(median(iy), 4)} kg·m² [${f(Math.min(...iy), 4)}, ${f(Math.max(...iy), 4)}], roll median ${f(median(ir), 4)} [${f(Math.min(...ir), 4)}, ${f(Math.max(...ir), 4)}] (the bookkeeping uses yaw ${OWN.yaw}, roll ${OWN.roll})`, '');
}

// ---- Question 1 (README §0.2).
const READ = (r: { cond: number; vif: number[] }, i: number) => r.cond <= 1e3 && r.vif[i] <= 30;
const q1: Any = {};
{
  L.push('## Question 1: the ledger regressions (per unit model-sign command; model signs N = −e_y, K = +e_q)', '');
  const groups: [string, FitSet[]][] = [...[0, 1, 2].map((b) => [binName(b), bins[b]] as [string, FitSet[]]), ['all ≥ 4 m/s', open]];
  for (const [gname, gs] of groups) {
    const lsY = gs.map((s) => ledgerSet(s, 'yaw')).filter(Boolean) as LedgerSet[];
    const lsR = gs.map((s) => ledgerSet(s, 'roll')).filter(Boolean) as LedgerSet[];
    if (lsY.length < 4) continue;
    const mc = gs.map((s) => modelCoefs(s));
    const mean = (k: 'waterYaw' | 'waterRoll' | 'riderYaw' | 'riderRoll') => mc[0][k].map((_, i) => mc.reduce((a, c) => a + c[k][i], 0) / mc.length);
    const sum = (keys: string[], sign: number) => (l: LedgerSet) => Float64Array.from({ length: 60 }, (_, m) => sign * keys.reduce((a, k) => a + l.e[k][m], 0));
    const one = (k: string, sign: number) => (l: LedgerSet) => Float64Array.from(l.e[k], (x) => sign * x);
    const ent: Any = { sets: lsY.length, speedMedian: median(gs.map((s) => s.v)) };
    const table = (title: string, rows: [string, ReturnType<typeof regress>][], regs: string[], model: number[] | null) => {
      L.push(`### ${label}, ${gname}: ${title} (${lsY.length} sets, ${rows[0][1].n} rows)`, '');
      L.push(`| term | R² | κ (scaled) | ${regs.join(' | ')} |`);
      L.push(`| --- | --- | --- | ${regs.map(() => '---').join(' | ')} |`);
      for (const [name, r] of rows) L.push(`| ${name} | ${f(r.r2, 3)} | ${f(r.cond, 1)} | ${r.coef.map((c, i) => `${f(c, 2)} ± ${f(r.se[i], 2)}${READ(r, i) ? '' : ' (unread)'}`).join(' | ')} |`);
      if (model) L.push(`| **the model's** | | | ${model.map((c) => f(c, 2)).join(' | ')} |`);
      L.push(`| VIF (${rows[rows.length - 1][0]}) | | | ${rows[rows.length - 1][1].vif.map((v) => f(v, 1)).join(' | ')} |`, '');
    };
    const yawRows: [string, ReturnType<typeof regress>][] = YAW_WATER.map((k) => [k, regress(lsY, one(k, -1), WATER_REG)]);
    const yawSum = regress(lsY, sum(YAW_WATER, -1), WATER_REG);
    yawRows.push(['**water sum**', yawSum]);
    table('yaw, the water\'s terms', yawRows, WATER_REG, mean('waterYaw'));
    const rollRows: [string, ReturnType<typeof regress>][] = ROLL_WATER.map((k) => [k, regress(lsR, one(k, 1), WATER_REG)]);
    const rollSum = regress(lsR, sum(ROLL_WATER, 1), WATER_REG);
    rollRows.push(['**water sum**', rollSum]);
    table('roll, the water\'s terms', rollRows, WATER_REG, mean('waterRoll'));
    const ry = regress(lsY, one('yRid', -1), RIDER_REG), rr = regress(lsR, one('qRid', 1), RIDER_REG);
    const gy = regress(lsY, one('yGy', -1), WATER_REG), gr = regress(lsR, one('qGy', 1), WATER_REG);
    table('yaw, the rider\'s term (residual)', [['rider', ry]], RIDER_REG, mean('riderYaw'));
    table('roll, the rider\'s term (residual)', [['rider', rr]], RIDER_REG, mean('riderRoll'));
    table('the gyro terms (yaw; roll)', [['gyro yaw', gy], ['gyro roll', gr]], WATER_REG, null);
    // The synthetic control (README §0.2): y = X b, b the model's own; noise-free, and with 10 % white noise.
    let st = 99 >>> 0;
    const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
    const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const synth = (ls: LedgerSet[], regs: string[], b: number[], noise: number) => {
      const ys = ls.map((l) => Float64Array.from({ length: 60 }, (_, m) => regs.reduce((a, k, i) => a + b[i] * l.reg[k][m], 0)));
      const rms = Math.sqrt(ys.reduce((a, y, i) => a + y.reduce((c, x) => c + (x * ls[i].w) ** 2, 0), 0) / (ys.length * 60));
      const noisy = ys.map((y, i) => Float64Array.from(y, (x) => x + (noise * rms * gauss()) / ls[i].w));
      const map = new Map(ls.map((l, i) => [l, noisy[i]]));
      const r = regress(ls, (l) => map.get(l)!, regs);
      const relErr = Math.max(...b.map((x, i) => Math.abs(r.coef[i] - x) / Math.max(Math.abs(x), 1e-9 * Math.max(...b.map(Math.abs)))));
      const within = b.map((x, i) => Math.abs(r.coef[i] - x) <= 3 * r.se[i]).filter(Boolean).length / b.length;
      return { relErr, within };
    };
    const sc = {
      waterYaw: [synth(lsY, WATER_REG, mean('waterYaw'), 0), synth(lsY, WATER_REG, mean('waterYaw'), 0.1)],
      waterRoll: [synth(lsR, WATER_REG, mean('waterRoll'), 0), synth(lsR, WATER_REG, mean('waterRoll'), 0.1)],
      riderYaw: [synth(lsY, RIDER_REG, mean('riderYaw'), 0), synth(lsY, RIDER_REG, mean('riderYaw'), 0.1)],
      riderRoll: [synth(lsR, RIDER_REG, mean('riderRoll'), 0), synth(lsR, RIDER_REG, mean('riderRoll'), 0.1)],
    };
    L.push(`- **the synthetic control** (${gname}): noise-free largest relative error ${Object.entries(sc).map(([k, v]) => `${k} ${f(v[0].relErr)}`).join(', ')}; with 10 % noise, the share of coefficients within 3 se ${Object.entries(sc).map(([k, v]) => `${k} ${f(v[1].within, 2)}`).join(', ')}`, '');
    ent.waterYaw = { coef: yawSum.coef, se: yawSum.se, cond: yawSum.cond, vif: yawSum.vif, model: mean('waterYaw') };
    ent.waterRoll = { coef: rollSum.coef, se: rollSum.se, cond: rollSum.cond, vif: rollSum.vif, model: mean('waterRoll') };
    ent.riderYaw = { coef: ry.coef, se: ry.se, cond: ry.cond, vif: ry.vif, model: mean('riderYaw') };
    ent.riderRoll = { coef: rr.coef, se: rr.se, cond: rr.cond, vif: rr.vif, model: mean('riderRoll') };
    ent.synthetic = sc;
    q1[gname] = ent;
  }
}

// ---- The Q1-informed start for (a) (README §0.3): the N and K water scales from the water sums where they are read.
function q1Start(b: number): Mult {
  const ent = q1[binName(b)];
  if (!ent) return {};
  const fields = { yaw: ['heelYaw', 'slipYaw', 'yawDamping', 'rollRateYaw'], roll: ['heelRoll', 'slipRoll', 'yawRoll', 'rollDamping'] };
  const use = { yaw: [0, 1, 2, 3].every((i) => READ(ent.waterYaw, i)), roll: [0, 1, 2, 3].every((i) => READ(ent.waterRoll, i)) };
  const free = [0, 2, 3, 5, 6, 8, 9, 11];
  const rows: number[][] = [], rhs: number[] = [];
  const gs = bins[b];
  const contrib = (i: number) => {
    const acc: Record<string, number> = {};
    for (const s of gs) {
      const sc = new Array<number>(12).fill(0); sc[i] = 1;
      const { y } = plantAt(s.v, s.depth, { rail: s.rail, body: true, plantFloor: 6, stanceDeep: true, scales: sc });
      for (const k of [...fields.yaw, ...fields.roll]) acc[k] = (acc[k] ?? 0) + (y as Any)[k] / gs.length;
    }
    return acc;
  };
  const D = Array.from({ length: 12 }, (_, i) => contrib(i));
  for (const which of ['yaw', 'roll'] as const) {
    if (!use[which]) continue;
    const coef = which === 'yaw' ? ent.waterYaw.coef : ent.waterRoll.coef;
    fields[which].forEach((k, j) => {
      rows.push(free.map((i) => D[i][k]));
      rhs.push(coef[j] - [1, 4, 7, 10].reduce((a, i) => a + D[i][k], 0));
    });
  }
  if (!rows.length) return {};
  // Least squares on the free N and K scales (the rows of a moment not read are left out; a scale no row reaches stays 1).
  const p = free.length;
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => rows.reduce((a, r) => a + r[i] * r[j], 0) + (i === j ? 1e-9 : 0)));
  const bb = Array.from({ length: p }, (_, i) => rows.reduce((a, r, k) => a + r[i] * rhs[k], 0) + 1e-9);
  const x = solveLS(A, bb);
  const m: Mult = {};
  free.forEach((i, j) => { m[WATER[i]] = Number.isFinite(x[j]) ? x[j] : 1; });
  return m;
}
function solveLS(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c];
    if (Math.abs(d) < 1e-300) continue;
    for (let r = 0; r < n; r += 1) { if (r === c) continue; const q = M[r][c] / d; for (let k = c; k <= n; k += 1) M[r][k] -= q * M[c][k]; }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// ---- Question 2: the fits (README §0.3).
const fits: Any = { script, edges, bins: [] as Any[] };
L.push('## Question 2: the grey-box fits (in-sample)', '');
for (let b = 0; b < 3; b += 1) {
  const gs = bins[b];
  const sig = scalesOf(gs);
  const entry: Any = { bin: b, name: binName(b), sets: gs.map((s) => s.id), sigma: sig, nested: {} };
  const prevOf: Record<string, string> = { b: 'a', c: 'b', d: 'c', e: 'c' };
  for (const which of ['a', 'b', 'c', 'd', 'e']) {
    const names = NESTED[which];
    const starts: Mult[] = which === 'a' ? [{}, q1Start(b)] : [entry.nested[prevOf[which]].mult, {}];
    log(`bin ${b} set ${which}: ${gs.length} sets, ${names.length} parameters, ${starts.length} starts`);
    const fit: FitResult = fitOn(gs, names, sig, starts, { maxIter: 200 });
    const un = uncertainty(gs, fit, sig, 30);
    let den = 0;
    for (const s of gs) for (let m = 1; m <= 60; m += 1) for (let o = 0; o < 8; o += 1) den += (s.x[m][o] / sig[s.channel][o]) ** 2;
    entry.nested[which] = { ...fit, relCost: Math.sqrt(fit.cost / den), relCost0: Math.sqrt(fit.cost0 / den), starts, un };
    log(`  cost ${fit.cost0.toExponential(3)} -> ${fit.cost.toExponential(3)} (rel ${Math.sqrt(fit.cost / den).toFixed(3)}), ${fit.iters} iters, cond ${un.cond.toExponential(2)}`);
  }
  // The black-box references.
  entry.fir = firOf(gs).map((ch) => ch.map((v) => Array.from(v)));
  entry.free = freeRows(gs, sig);
  // In-sample errors per set.
  const errs = gs.map((s) => {
    const r: Any = { id: s.id, v: s.v, channel: s.channel };
    r.ship = predErr(s, openResp(disc(s.v, s.depth, s.rail, {}), s.channel), sig);
    for (const which of ['a', 'b', 'c', 'd', 'e']) r[which] = predErr(s, openResp(disc(s.v, s.depth, s.rail, entry.nested[which].mult), s.channel), sig);
    if (s.kb.design) { const g = modelOpen(s.kb.design.phi, s.kb.design.gamma, s.kb.design.c, s.channel as 0 | 1); r.blend = predErr(s, (m) => [g[m][0] - g[m][5], g[m][1] - g[m][6], g[m][0], g[m][1], g[m][2] - g[m][4], g[m][8], g[m][3], g[m][2]], sig); }
    r.fir = predErr(s, (m) => entry.fir[s.channel][m], sig);
    r.free = predErr(s, freeResp(entry.free, s), sig);
    return r;
  });
  entry.inSample = errs;
  fits.bins.push(entry);
  L.push(`### ${label}, bin ${binName(b)} (${gs.length} sets; median ${f(median(gs.map((s) => s.v)), 2)} m/s)`, '');
  L.push('| set | parameters | relative residual, start → fit | iters | scaled κ (without parameters at a bound) | in-sample e, median (fit / shipped) | in-sample e_fit < e_shipped |');
  L.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const which of ['a', 'b', 'c', 'd', 'e']) {
    const n = entry.nested[which];
    L.push(`| (${which})${which >= 'd' ? ' exploratory' : ''} | ${n.names.length} | ${f(n.relCost0)} → ${f(n.relCost)} | ${n.iters} | ${f(n.un.cond, 1)} | ${f(median(errs.map((e) => e[which])))} / ${f(median(errs.map((e) => e.ship)))} | ${errs.filter((e) => e[which] < e.ship).length} of ${errs.length} |`);
  }
  L.push(`| FIR (bin mean) | — | | | | ${f(median(errs.map((e) => e.fir)))} | |`);
  L.push(`| free rows (one-step LS) | 80 | | | | ${f(median(errs.map((e) => e.free)))} | |`);
  L.push(`| blended design at the kick tick | — | | | | ${f(median(errs.map((e) => e.blend)))} | |`, '');
  for (const which of ['a', 'b', 'c', 'd', 'e']) {
    const n = entry.nested[which];
    L.push(`- (${which}) multipliers [5–95 % bootstrap]: ${n.names.map((k: string, i: number) => `${k} ${n.un.atBound.includes(k) ? 'at its bound (0)' : `${f(n.mult[k], 3)} [${f(n.un.boot.lo[i], 2)}, ${f(n.un.boot.hi[i], 2)}]`}`).join('; ')}`);
    L.push(`  - weakest directions: ${n.un.weakest.map((w: Any) => `σ ${f(w.value, 4)}: ${w.loads.map((x: [string, number]) => `${x[0]} ${f(x[1], 2)}`).join(', ')}`).join(' | ')}`);
  }
  L.push('');
}

// ---- Per (base, kick time) fits of (a) (README §0.3; descriptive).
{
  const pairs = new Map<string, FitSet[]>();
  for (const s of open) { const k = `${s.base}|${s.at}`; const a = pairs.get(k) ?? []; a.push(s); pairs.set(k, a); }
  const both = [...pairs.values()].filter((p) => p.length === 2);
  L.push(`## Per (base, kick time) fits of (a), ${label} (${both.length} pairs with both channels; descriptive)`, '');
  L.push(`| kick speed, m/s | ${WATER.join(' | ')} | relative residual |`);
  L.push(`| --- | ${WATER.map(() => '---').join(' | ')} | --- |`);
  const per: Any[] = [];
  for (const p of both.sort((x, y) => x[0].v - y[0].v)) {
    const sig = scalesOf(p);
    const fit = fitOn(p, NESTED.a, sig, [{}], { maxIter: 100 });
    let den = 0;
    for (const s of p) for (let m = 1; m <= 60; m += 1) for (let o = 0; o < 8; o += 1) den += (s.x[m][o] / sig[s.channel][o]) ** 2;
    per.push({ v: p[0].v, mult: fit.mult, rel: Math.sqrt(fit.cost / den) });
    L.push(`| ${f(p[0].v, 2)} | ${WATER.map((k) => f(fit.mult[k], 2)).join(' | ')} | ${f(Math.sqrt(fit.cost / den))} |`);
  }
  fits.perPair = per;
  L.push('');
}
fits.q1 = q1;
fits.slow = slow.length;
writeFileSync(join(outDir, `fit-${label}.json`), JSON.stringify(fits));
writeFileSync(join(outDir, `fit-${label}.md`), L.join('\n'));
log('done');
