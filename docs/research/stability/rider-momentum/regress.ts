/**
 * **3.6f's twin regressions** (README §0.4 C4, C4b; §0.5 Q2, Q4): 3.6e's own `ledgerSet` and `regress`, imported
 * unchanged, on this round's open twins (Big seed 1), with 3.6e's 14 rider regressors and its frozen speed bins.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/rider-momentum/regress.ts --file <s>/regress.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) node <s>/regress.mjs <stance script> <twins .jsonl> <out .md> <out .json> [lower]
 *
 * Model signs throughout (3.6e §0.2): a yaw term N = −(the game's yaw, + nose left); the lateral force on the body
 * H = −J_side / dt (J_side along the heading's +x, the board's left; the model's lateral + is the board's right).
 */
import { writeFileSync } from 'node:fs';
import { median } from '../response/responseLib';
import { RIDER_REG, SPEED_FLOOR, WATER_REG, YAW_WATER, fitSets, ledgerSet, loadRuns, modelCoefs, regress, type FitSet, type LedgerSet } from '../board-fit/fitLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [script, file, outMd, outJson, lowerArg] = process.argv.slice(2);
const LABEL: Record<string, string> = { 'compress:straight': 'Compress', 'none:straight': 'tall', 'crouch:straight': 'tuck' };
/** 3.6e's frozen bins (its README §3: the fitting set's terciles). */
const EDGES: Record<string, [number, number]> = { 'compress:straight': [8.7, 10.1], 'crouch:straight': [8.5, 10], 'none:straight': [9.2, 10.4] };
const label = LABEL[script] ?? script;
const edges = EDGES[script];
const XF = -0.244;
const runs = loadRuns([file], true);
runs.kicks = runs.kicks.filter((k) => k.script === script);
runs.kbases = runs.kbases.filter((k) => k.script === script);
const { all } = fitSets(runs);
const open = all.filter((s) => s.mode === 'open' && s.set.pass60 && s.v >= SPEED_FLOOR);
const binOf = (v: number) => (v < edges[0] ? 0 : v < edges[1] ? 1 : 2);
const groups: [string, FitSet[]][] = [
  [`[4, ${edges[0]})`, open.filter((s) => binOf(s.v) === 0)],
  [`[${edges[0]}, ${edges[1]})`, open.filter((s) => binOf(s.v) === 1)],
  [`[${edges[1]}, ∞)`, open.filter((s) => binOf(s.v) === 2)],
  ['all ≥ 4 m/s', open],
];
const f = (x: number, n = 2) => (Number.isFinite(x) ? (Math.abs(x) >= 1e4 || (Math.abs(x) < 1e-3 && x !== 0) ? x.toExponential(2) : x.toFixed(n)) : '—');
const one = (k: string, sign: number) => (l: LedgerSet) => Float64Array.from(l.e[k], (x) => sign * x);
const L: string[] = [];
const J: Any = { script, file, sets: open.length, groups: {} };
L.push(`# 3.6f twin regressions, ${label} (${file.split('/').pop()})`, '');
L.push(`- open sets passing over 1.0 s at ≥ ${SPEED_FLOOR} m/s: ${open.length}; 3.6e's frozen bins ${JSON.stringify(edges)} m/s`, '');
const KIN = ['betadot', 'r', 'rdot', 'thetaddot', 'phiddot'];
for (const [gname, gs] of groups) {
  const ls = gs.map((s) => ledgerSet(s, 'yaw')).filter(Boolean) as LedgerSet[];
  if (ls.length < 4) { L.push(`## ${gname}: ${ls.length} sets, not regressed`, ''); continue; }
  const V = gs.reduce((a, s) => a + s.v, 0) / gs.length;
  const mc = gs.map((s) => modelCoefs(s));
  const model = mc[0].riderYaw.map((_, i) => mc.reduce((a, c) => a + c.riderYaw[i], 0) / mc.length);
  const lower = Number(lowerArg ?? 1.24);
  const m = 73;
  const hMean = gs.reduce((a, s) => a + (s.kb as Any).args?.depth?.[8] * 0 + 0, 0); void hMean;
  // The model's H-part of its rider yaw row (what y_syn should return if the regression sees the lever).
  const hIdx = (k: string) => RIDER_REG.indexOf(k);
  const synModel = RIDER_REG.map(() => 0);
  synModel[hIdx('r')] = -XF * m * V; synModel[hIdx('betadot')] = -XF * m * V; synModel[hIdx('rdot')] = -lower - XF * XF * m;
  synModel[hIdx('thetaddot')] = model[hIdx('thetaddot')]; synModel[hIdx('phiddot')] = model[hIdx('phiddot')];
  const H = (l: LedgerSet) => Float64Array.from(l.e.jS, (x) => -x);
  const ySyn = (l: LedgerSet) => Float64Array.from(l.e.jS, (x, i) => -XF * -x - lower * l.reg.rdot[i]);
  const rows: [string, ReturnType<typeof regress>, number[] | null][] = [
    ['ledger rider (−yRid): 3.6e\'s term', regress(ls, one('yRid', -1), RIDER_REG), model],
    ['predicted: −(lev + rot)', regress(ls, (l) => Float64Array.from(l.e.lev, (x, i) => -(x + l.e.rot[i])), RIDER_REG), null],
    ['the lever −lev', regress(ls, one('lev', -1), RIDER_REG), null],
    ['its lateral part −levL', regress(ls, one('levL', -1), RIDER_REG), null],
    ['its forward part −levF', regress(ls, one('levF', -1), RIDER_REG), null],
    ['the rotors and hand −rot', regress(ls, one('rot', -1), RIDER_REG), null],
    ['**C4: y_syn = −x_f H − I_r ṙ**', regress(ls, ySyn, RIDER_REG), synModel],
    ['Q2: the residual −res', regress(ls, one('res', -1), RIDER_REG), null],
    ['Q2: the about-O residual −resO', regress(ls, one('resO', -1), RIDER_REG), null],
  ];
  // The closure of the ledger's rider term against the prediction on these sets (README §0.5 Q4).
  let num = 0, den = 0;
  for (const l of ls) for (let i = 0; i < 60; i += 1) { const a = -l.e.yRid[i], b = -(l.e.lev[i] + l.e.rot[i]); num += ((a - b) * l.w) ** 2; den += (a * l.w) ** 2; }
  L.push(`## ${label}, ${gname}: ${ls.length} sets, mean kick speed ${f(V, 2)} m/s; ‖yRid − (lev + rot)‖ / ‖yRid‖ = ${f(Math.sqrt(num / den), 6)}`, '');
  L.push(`| y (model signs, N·m per unit command) | R² | κ | ${RIDER_REG.join(' | ')} |`);
  L.push(`| --- | --- | --- | ${RIDER_REG.map(() => '---').join(' | ')} |`);
  const gj: Any = { sets: ls.length, V, model, synModel, rows: {} };
  for (const [name, r, mod] of rows) {
    L.push(`| ${name} | ${f(r.r2, 3)} | ${f(r.cond, 1)} | ${r.coef.map((c, i) => `${f(c)} ± ${f(r.se[i])}${r.vif[i] > 30 ? '*' : ''}`).join(' | ')} |`);
    if (mod) L.push(`| … its expected (the model's) | | | ${mod.map((c) => f(c)).join(' | ')} |`);
    gj.rows[name] = { coef: r.coef, se: r.se, r2: r.r2, cond: r.cond, vif: r.vif };
  }
  L.push(`| VIF | | | ${rows[0][1].vif.map((v) => f(v, 1)).join(' | ')} |`, '');
  // C4's line: per r and per β̇ within 30 % of m V x_f (−x_f m V in model signs), per ṙ within 30 % of −(I_r + m x_f²).
  const syn = rows[6][1].coef;
  const ok = (got: number, want: number) => Math.abs(got - want) <= 0.3 * Math.abs(want);
  const c4 = { r: syn[hIdx('r')] / synModel[hIdx('r')], betadot: syn[hIdx('betadot')] / synModel[hIdx('betadot')], rdot: syn[hIdx('rdot')] / synModel[hIdx('rdot')] };
  const sees = ok(syn[hIdx('r')], synModel[hIdx('r')]) && ok(syn[hIdx('betadot')], synModel[hIdx('betadot')]) && ok(syn[hIdx('rdot')], synModel[hIdx('rdot')]);
  L.push(`- **C4** (y_syn's coefficient over the model's): per r ${f(c4.r, 3)}, per β̇ ${f(c4.betadot, 3)}, per ṙ ${f(c4.rdot, 3)}: the regression ${sees ? '**sees**' : '**does not see**'} the lever (line: all three within 30 %)`);
  gj.c4 = { ...c4, sees };
  // C4b: the kinematic identity, H on [β̇, r, ṙ, θ̈, φ̈] alone; and H on all 14.
  const kin = regress(ls, H, KIN);
  const kinWant = [m * V, m * V, m * XF, Number.NaN, m * 0.031];
  L.push(`- **C4b** H on [${KIN.join(', ')}]: ${kin.coef.map((c, i) => `${f(c)} ± ${f(kin.se[i])}`).join(', ')}; R² ${f(kin.r2, 3)} (expected m V = ${f(m * V)}, m V, m x_f = ${f(m * XF)}, m L, m z_d = ${f(m * 0.031)})`);
  const all14 = regress(ls, H, RIDER_REG);
  L.push(`- H on all 14: R² ${f(all14.r2, 3)}; ${RIDER_REG.map((k, i) => `${k} ${f(all14.coef[i])}`).join(', ')}`);
  gj.kin = { coef: kin.coef, se: kin.se, r2: kin.r2, want: kinWant }; gj.all14 = { coef: all14.coef, se: all14.se, r2: all14.r2 };
  // Q4: the water's yaw sum on the water's regressors plus the lever (its coefficient: the water's yaw per unit of the rider's reaction).
  const wsum = (l: LedgerSet) => Float64Array.from({ length: 60 }, (_, i) => -YAW_WATER.reduce((a, k) => a + l.e[k][i], 0));
  for (const l of ls) (l.reg as Any).lev = Float64Array.from(l.e.lev, (x) => -x);
  const wq = regress(ls, wsum, [...WATER_REG, 'lev']);
  const w0 = regress(ls, wsum, WATER_REG);
  L.push(`- **Q4** the water's yaw sum on [${WATER_REG.join(', ')}, −lev]: ${wq.coef.map((c, i) => `${f(c, 3)} ± ${f(wq.se[i], 3)}`).join(', ')}; R² ${f(wq.r2, 4)} (without lev ${f(w0.r2, 4)}; per ṙ ${f(w0.coef[WATER_REG.indexOf('rdot')], 3)} without, ${f(wq.coef[WATER_REG.indexOf('rdot')], 3)} with)`, '');
  gj.q4 = { coef: wq.coef, se: wq.se, r2: wq.r2, r2without: w0.r2, without: w0.coef };
  J.groups[gname] = gj;
}
writeFileSync(outMd, `${L.join('\n')}\n`);
writeFileSync(outJson, JSON.stringify(J, null, 1));
console.log(L.join('\n'));
