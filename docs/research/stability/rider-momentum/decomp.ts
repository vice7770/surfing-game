/**
 * **3.6f amendment 3 (exploratory)**: the lever's twin difference split into the force's change at the base's arm and the
 * arm's change against the base's force, each through 3.6e's `ledgerSet` and `regress` with its 14 rider regressors.
 *
 *   node <s>/decomp.mjs <stance script> <twins .jsonl> <out .md>     (bundled as `regress.ts`)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { RIDER_REG, SPEED_FLOOR, fitSets, ledgerSet, loadRuns, regress, type LedgerSet } from '../board-fit/fitLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [script, file, outMd] = process.argv.slice(2);
const PRE = 2;
// The base ride's own per-frame arm and contact force (its `m` rows), by wave and frame.
const base = new Map<string, Any>();
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line.startsWith('{"kind":"m"')) continue;
  const r = JSON.parse(line);
  if (r.script !== script) continue;
  base.set(`${r.wave}|${Math.round(r.tS * 60)}`, r);
}
const runs = loadRuns([file], true);
runs.kicks = runs.kicks.filter((k) => k.script === script);
runs.kbases = runs.kbases.filter((k) => k.script === script);
let missing = 0;
for (const k of runs.kicks as Any[]) {
  if (!k.e) continue;
  const n = k.e.jS.length;
  const get = (i: number, f: string) => { const b = base.get(`${k.wave}|${k.frame - PRE + i}`); if (!b) { missing += 1; return 0; } return b[f] as number; };
  k.e.armFixL = Array.from({ length: n }, (_, i) => -get(i, 'aF') * (k.e.jS[i] ?? 0));
  k.e.armMoveL = Array.from({ length: n }, (_, i) => -get(i, 'jS') * (k.e.aF[i] ?? 0));
  k.e.armFixF = Array.from({ length: n }, (_, i) => get(i, 'aS') * (k.e.jF[i] ?? 0));
  k.e.armMoveF = Array.from({ length: n }, (_, i) => get(i, 'jF') * (k.e.aS[i] ?? 0));
}
const { all } = fitSets(runs);
const open = all.filter((s) => s.mode === 'open' && s.set.pass60 && s.v >= SPEED_FLOOR);
const ls = open.map((s) => ledgerSet(s, 'yaw')).filter(Boolean) as LedgerSet[];
const f = (x: number) => (Math.abs(x) < 1e-3 && x !== 0 ? x.toExponential(2) : x.toFixed(2));
const one = (k: string) => (l: LedgerSet) => Float64Array.from(l.e[k], (x) => -x);
const L = [`# 3.6f amendment 3, ${script}: ${ls.length} open sets at ≥ ${SPEED_FLOOR} m/s, pooled (model signs; base frames missing: ${missing})`, '',
  `| y | R² | ${RIDER_REG.join(' | ')} |`, `| --- | --- | ${RIDER_REG.map(() => '---').join(' | ')} |`];
for (const [name, k] of [['−levL', 'levL'], ['−(−a_fwd,0 δJ_side): the force at the base arm', 'armFixL'], ['−(−J_side,0 δa_fwd): the arm moving', 'armMoveL'], ['−levF', 'levF'], ['−(a_side,0 δJ_fwd)', 'armFixF'], ['−(J_fwd,0 δa_side)', 'armMoveF']] as const) {
  const r = regress(ls, one(k), RIDER_REG);
  L.push(`| ${name} | ${f(r.r2)} | ${r.coef.map((c, i) => `${f(c)} ± ${f(r.se[i])}`).join(' | ')} |`);
}
writeFileSync(outMd, `${L.join('\n')}\n`);
console.log(L.join('\n'));
