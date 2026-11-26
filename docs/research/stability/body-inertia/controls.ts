/**
 * **3.6g's controls** (README §0.6, items 1–3), before any P_0 number counts:
 * 1. P_two's Φ, Γ against `shippedPlant`'s at every set's kick point, and its held-out e against 3.6e's per-set `ship`;
 * 2. P_control's continuous A, B against the pre-3.4a plant at every set's kick point (row-relative);
 * 3. P_two closed with the shipped design against 3.6e's per-set `shipSF` and `shipFr` rows.
 * Prints nothing of P_0, P_control's scores or the sweep.
 *
 *   node controls.mjs <fitting dir> <held-out dir> <3.6e results/fit dir> <3.6e results/final dir> <out.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { continuousPlant } from '../../../../src/physics/predictiveBalance';
import { median } from '../response/responseLib';
import { SPEED_FLOOR, binOf, discreteOf, fitSets, loadRuns, predErr, shippedPlant, type FitSet } from '../board-fit/fitLib';
import { P_CONTROL, P_TWO, STANCES, closeSet, discOf, fx, jsonl, maxDiff, openFrozen, openSF, prePlant, rowRel } from './inertiaLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [fitDirRuns, heldDirRuns, fitDir, finalDir, outPath] = process.argv.slice(2);
const log = (s: string) => console.log(`[controls ${new Date().toISOString().slice(11, 19)}] ${s}`);
const groups: { tag: string; all: FitSet[]; weights: Any }[] = [];
for (const [tag, dir] of [['fitting', fitDirRuns], ['heldout', heldDirRuns]] as const) {
  const runs = loadRuns(jsonl(dir), false);
  groups.push({ tag, all: fitSets(runs).all, weights: runs.weights });
  log(`${tag}: ${groups[groups.length - 1].all.length} sets`);
}
const out: Any = {};
// ---- 1 and 2: the plants at every set's kick point (open and closed sets, both groups).
let idWorst = 0, ctlA = 0, ctlB = 0, points = 0;
const seen = new Set<string>();
for (const g of groups) for (const s of g.all) {
  const k = `${s.v}|${s.depth}|${s.rail}`;
  if (seen.has(k)) continue;
  seen.add(k); points += 1;
  idWorst = Math.max(idWorst, maxDiff(discOf(P_TWO, s.v, s.depth, s.rail), discreteOf(shippedPlant(s.v, s.depth, s.rail))));
  const a = P_CONTROL.build(s.v, s.depth, s.rail), b = prePlant(s.v, s.depth, s.rail);
  const ca = continuousPlant(a.y, a.t), cb = continuousPlant(b.y, b.t);
  ctlA = Math.max(ctlA, rowRel(ca.a, cb.a)); ctlB = Math.max(ctlB, rowRel(ca.b, cb.b));
}
out.identity = { points, largestPhiGammaDiff: idWorst, pass: idWorst === 0 };
out.control = { points, largestRowRelA: ctlA, largestRowRelB: ctlB, pass: ctlA <= 1e-12 && ctlB <= 1e-12 };
log(`1. P_two vs shippedPlant at ${points} kick points: largest |ΔΦ|, |ΔΓ| = ${idWorst} (${out.identity.pass ? 'PASS' : 'FAIL'})`);
log(`2. P_control vs pre-3.4a at ${points} kick points: A ${ctlA.toExponential(2)}, B ${ctlB.toExponential(2)} row-relative (${out.control.pass ? 'PASS' : 'FAIL'})`);
// ---- 1b: P_two's held-out e against 3.6e's.
const ref = JSON.parse(readFileSync(join(finalDir, 'heldout-q2.json'), 'utf8'));
out.heldout = {};
const held = groups[1];
for (const [script, label] of STANCES) {
  const fit = JSON.parse(readFileSync(join(fitDir, `fit-${label}.json`), 'utf8'));
  const sets = held.all.filter((s) => s.script === script && s.mode === 'open' && s.set.pass60 && s.v >= SPEED_FLOOR);
  const refRows = new Map<string, Any>(ref.stances[label].rows.map((r: Any) => [r.id, r]));
  let worst = 0, worstL = 0, missing = 0;
  const e: number[] = [], eL: number[] = [];
  for (const s of sets) {
    const sig = fit.bins[binOf(s.v, fit.edges)].sigma;
    const a = predErr(s, openFrozen(P_TWO, s), sig), b = predErr(s, openSF(P_TWO, s), sig);
    e.push(a); eL.push(b);
    const r = refRows.get(s.id);
    if (!r) { missing += 1; continue; }
    worst = Math.max(worst, Math.abs(a - r.ship)); worstL = Math.max(worstL, Math.abs(b - r.shipL));
  }
  out.heldout[label] = { sets: sets.length, refSets: refRows.size, missing, medianE: median(e), medianESF: median(eL), worstPerSet: worst, worstPerSetSF: worstL, pass: missing === 0 && sets.length === refRows.size && worst <= 1e-12 && worstL <= 1e-12 };
  log(`1b. ${label} held-out: ${sets.length} sets (3.6e ${refRows.size}), median e ${fx(median(e))} (SF ${fx(median(eL))}), largest per-set |Δ| ${worst.toExponential(2)} (SF ${worstL.toExponential(2)}) (${out.heldout[label].pass ? 'PASS' : 'FAIL'})`);
}
// ---- 3: P_two's closures against 3.6e's shipped rows.
const q3 = JSON.parse(readFileSync(join(finalDir, 'q3-lti-c.json'), 'utf8'));
out.closure = {};
for (const [script, label] of STANCES) {
  const refRows = new Map<string, Any>(q3.stances[label].rows.map((r: Any) => [`${r.tag}|${r.id}`, r]));
  let worst = 0, n = 0, missing = 0;
  const fr: Any[] = [], sf: Any[] = [];
  for (const g of groups) for (const s of g.all) {
    if (s.script !== script || s.mode !== 'closed' || !s.set.pass90 || s.v < SPEED_FLOOR) continue;
    n += 1;
    const a = closeSet(P_TWO, s, g.weights, false), b = closeSet(P_TWO, s, g.weights, true);
    sf.push(a); fr.push(b);
    const r = refRows.get(`${g.tag}|${s.id}`);
    if (!r) { missing += 1; continue; }
    for (const k of ['f', 'zeta', 'env', 'waveOm', 'waveSense', 'fitF', 'fitZeta'] as const) {
      for (const [mine, theirs] of [[a, r.shipSF], [b, r.shipFr]] as const) {
        const x = mine[k] as number, y = theirs[k] as number;
        if (Number.isNaN(x) && (y === null || Number.isNaN(y))) continue;
        worst = Math.max(worst, Math.abs(x - y));
      }
    }
  }
  out.closure[label] = { sets: n, refSets: refRows.size, missing, worst, frozen: { f: median(fr.map((x) => x.f)), zeta: median(fr.map((x) => x.zeta)) }, sf: { f: median(sf.map((x) => x.f)), zeta: median(sf.map((x) => x.zeta)) }, pass: missing === 0 && n === refRows.size && worst <= 1e-9 };
  log(`3. ${label} closures: ${n} sets (3.6e ${refRows.size}), largest per-set |Δ| ${worst.toExponential(2)}; pooled frozen f ${fx(out.closure[label].frozen.f, 2)} ζ ${fx(out.closure[label].frozen.zeta)}, SF f ${fx(out.closure[label].sf.f, 2)} ζ ${fx(out.closure[label].sf.zeta)} (${out.closure[label].pass ? 'PASS' : 'FAIL'})`);
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
