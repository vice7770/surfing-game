/**
 * **3.6g amendment 2 (exploratory, model-only): J once the water is fitted.** 3.6e's frozen fit (a) (its bin's twelve
 * water scales, nothing refitted) with J × 1 (W_two) and J × 0 (W_0), the feet's roll coupling on; scored as question
 * 1 (frozen and speed-following) and closed as question 2 (the shipped design). The fitting group is in-sample for the
 * water, the held-out group out of sample.
 *
 *   node amend2.mjs <fitting dir> <held-out dir> <3.6e results/fit dir> <out prefix>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPEED_FLOOR, binOf, buildPlant, fitSets, loadRuns, predErr, type FitSet, type Mult } from '../board-fit/fitLib';
import { P_TWO, STANCES, closeSet, fx, jsonl, med, openFrozen, openSF, q, twinRead, type Picture } from './inertiaLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [fitRuns, heldRuns, fitDir, outPrefix] = process.argv.slice(2);
const ROWS: [string, number][] = [['φ', 0], ['θ', 2], ['Ω (r)', 4], ['β', 5], ['θ_t', 6]];
const rowErr = (s: FitSet, G: Float64Array[], o: number): number => {
  let num = 0, den = 0;
  for (let m = 1; m <= 60; m += 1) { num += (G[m][o] - s.x[m][o]) ** 2; den += s.x[m][o] ** 2; }
  return den > 0 ? Math.sqrt(num / den) : Number.NaN;
};
const pics = new Map<string, Picture>();
const water = (label: string, b: number, mult: Mult, j: number): Picture => {
  const key = `W${j}|${label}|${b}`;
  let p = pics.get(key);
  if (!p) { p = { key, name: j === 1 ? 'W_two ((a) water, J sourced)' : 'W_0 ((a) water, J = 0)', build: (v, d, r) => buildPlant(v, d, r, { ...mult, J: j }) }; pics.set(key, p); }
  return p;
};
const out: Any = { groups: {}, closed: {} };
const L: string[] = ['# 3.6g amendment 2 (exploratory): J with 3.6e\'s fitted water (a)', '',
  '*As question 1 and question 2; each set\'s water the twelve scales of 3.6e\'s frozen fit (a) for its stance and speed bin (fitted on Big seeds 1–3: the fitting group is in-sample for the water). Ratios per set; medians [25–75 %].*', ''];
const closedSets: { tag: string; s: FitSet; W: Any }[] = [];
for (const [tag, dir] of [['fitting', fitRuns], ['heldout', heldRuns]] as const) {
  const runs = loadRuns(jsonl(dir), false);
  const { all } = fitSets(runs);
  for (const s of all) if (s.mode === 'closed' && s.set.pass90 && s.v >= SPEED_FLOOR) closedSets.push({ tag, s, W: runs.weights });
  out.groups[tag] = {};
  for (const [script, label] of STANCES) {
    const fit = JSON.parse(readFileSync(join(fitDir, `fit-${label}.json`), 'utf8'));
    const sets = all.filter((s) => s.script === script && s.mode === 'open' && s.set.pass60 && s.v >= SPEED_FLOOR);
    const rows = sets.map((s) => {
      const b = binOf(s.v, fit.edges);
      const sig = fit.bins[b].sigma, mult = fit.bins[b].nested.a.mult;
      const r: Any = { id: s.id, v: s.v, bin: b };
      for (const [k, p] of [['two', P_TWO], ['W1', water(label, b, mult, 1)], ['W0', water(label, b, mult, 0)]] as const) {
        const G = openFrozen(p, s);
        r[k] = { e: predErr(s, G, sig), eSF: predErr(s, openSF(p, s), sig), rows: Object.fromEntries(ROWS.map(([nm, o]) => [nm, rowErr(s, G, o)])) };
      }
      return r;
    });
    const ratio = rows.map((r) => r.W0.e / r.W1.e), ratioSF = rows.map((r) => r.W0.eSF / r.W1.eSF);
    const st: Any = {
      sets: rows.length, medE: { two: med(rows.map((r) => r.two.e)), W1: med(rows.map((r) => r.W1.e)), W0: med(rows.map((r) => r.W0.e)) },
      medESF: { two: med(rows.map((r) => r.two.eSF)), W1: med(rows.map((r) => r.W1.eSF)), W0: med(rows.map((r) => r.W0.eSF)) },
      ratio: { median: med(ratio), q25: q(ratio, 0.25), q75: q(ratio, 0.75), better: rows.filter((r) => r.W0.e < r.W1.e).length },
      ratioSF: { median: med(ratioSF), q25: q(ratioSF, 0.25), q75: q(ratioSF, 0.75), better: rows.filter((r) => r.W0.eSF < r.W1.eSF).length },
      rowRatio: Object.fromEntries(ROWS.map(([nm]) => [nm, med(rows.map((r) => r.W0.rows[nm] / r.W1.rows[nm]))])),
      rowW1: Object.fromEntries(ROWS.map(([nm]) => [nm, med(rows.map((r) => r.W1.rows[nm]))])),
      byBin: [0, 1, 2].map((b) => { const rb = rows.filter((r) => r.bin === b); return { sets: rb.length, ratio: med(rb.map((r) => r.W0.e / r.W1.e)) }; }),
      rows,
    };
    out.groups[tag][label] = st;
  }
}
L.push('## Open twins', '', '| stance, group (sets) | median e: P_two / W_two / W_0 | e_W0 / e_Wtwo [25–75 %], better | speed-following: median e P_two / W_two / W_0 | e_W0 / e_Wtwo (SF), better | rows φ / θ / Ω / β / θ_t: W_0 / W_two | by bin (frozen) |');
L.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const [, label] of STANCES) for (const tag of ['fitting', 'heldout']) {
  const st = out.groups[tag][label];
  L.push(`| ${label}, ${tag} (${st.sets}) | ${fx(st.medE.two)} / ${fx(st.medE.W1)} / ${fx(st.medE.W0)} | ${fx(st.ratio.median)} [${fx(st.ratio.q25)}, ${fx(st.ratio.q75)}], ${st.ratio.better} of ${st.sets} | ${fx(st.medESF.two)} / ${fx(st.medESF.W1)} / ${fx(st.medESF.W0)} | ${fx(st.ratioSF.median)} [${fx(st.ratioSF.q25)}, ${fx(st.ratioSF.q75)}], ${st.ratioSF.better} | ${ROWS.map(([nm]) => fx(st.rowRatio[nm])).join(' / ')} | ${st.byBin.map((b: Any) => `${b.sets}: ${fx(b.ratio)}`).join('; ')} |`);
}
L.push('', '## Closed twins (the shipped design; pooled over both groups)', '', '| stance (sets) | closure | Prony f | Δf paired | waveform Ω | Prony ζ | envelope | reproduces | rings as the game |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const [script, label] of STANCES) {
  const fit = JSON.parse(readFileSync(join(fitDir, `fit-${label}.json`), 'utf8'));
  const mine = closedSets.filter((x) => x.s.script === script);
  const res = mine.map(({ tag, s, W }) => {
    const b = binOf(s.v, fit.edges), mult = fit.bins[b].nested.a.mult;
    const r: Any = { tag, id: s.id, twin: twinRead(s) };
    for (const [k, p] of [['W1', water(label, b, mult, 1)], ['W0', water(label, b, mult, 0)]] as const) { r[`${k}SF`] = closeSet(p, s, W, false); r[`${k}Fr`] = closeSet(p, s, W, true); }
    return r;
  });
  const st: Any = {};
  L.push(`| ${label} (${res.length}) | the closed twins | ${fx(med(res.map((r) => r.twin.f)), 2)} | | | ${fx(med(res.map((r) => r.twin.zeta)))} | ${fx(med(res.map((r) => r.twin.env)), 2)} | | |`);
  for (const k of ['W1SF', 'W1Fr', 'W0SF', 'W0Fr']) {
    const df = med(res.map((r) => r[k].f - r.twin.f)), wv = med(res.map((r) => r[k].waveOm)), z = med(res.map((r) => r[k].zeta)), env = med(res.map((r) => r[k].env));
    st[k] = { f: med(res.map((r) => r[k].f)), df, wave: wv, zeta: z, env, reproduces: Math.abs(df) <= 0.15 && wv <= 0.6, rings: z <= 0.1 && env >= 0.5 };
    L.push(`| | ${k.startsWith('W1') ? 'W_two' : 'W_0'}, ${k.endsWith('SF') ? 'speed-following' : 'frozen'} | ${fx(st[k].f, 2)} | ${fx(df, 2)} | ${fx(wv, 2)} | ${fx(z)} | ${fx(env, 2)} | ${st[k].reproduces ? 'yes' : 'no'} | ${st[k].rings ? 'yes' : 'no'} |`);
  }
  out.closed[label] = { st, rows: res };
  console.error(`[amend2 ${new Date().toISOString().slice(11, 19)}] ${label} closed: ${res.length}`);
}
writeFileSync(`${outPrefix}.md`, L.join('\n'));
writeFileSync(`${outPrefix}.json`, JSON.stringify(out));
console.log(L.join('\n'));
