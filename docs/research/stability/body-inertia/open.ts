/**
 * **3.6g question 1: the open twins** (README §0.2). Every picture scored by 3.6e's `predErr` (frozen at the kick tick;
 * speed-following secondary) against the open sets passing over 1.0 s at ≥ 4 m/s, per stance and seed group, with
 * 3.6e's frozen bins and scales; per row (each state alone), the senses' waveform error, per speed bin and kick channel.
 *
 *   node open.mjs <fitting dir> <held-out dir> <3.6e results/fit dir> <out prefix>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SENSE_ROWS, type Resp } from '../response/responseLib';
import { SPEED_FLOOR, binOf, fitSets, loadRuns, outOf, predErr, type FitSet } from '../board-fit/fitLib';
import { P_0, P_CONTROL, P_TWO, STANCES, fx, jsonl, med, openFrozen, openSF, q, sweep, type Picture } from './inertiaLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [fitRuns, heldRuns, fitDir, outPrefix] = process.argv.slice(2);
const PICS: Picture[] = [P_TWO, P_0, P_CONTROL, sweep(0.25), sweep(0.5), sweep(2)];
/** The rows (state index in the eight mechanical states, model order) reported one by one. */
const ROWS: [string, number][] = [['φ', 0], ['φ̇', 1], ['θ', 2], ['θ̇', 3], ['Ω (r)', 4], ['β', 5], ['θ_t', 6], ['ω_u', 7]];
const SHOWN = ['φ', 'θ', 'Ω (r)', 'β', 'θ_t'];
const rowErr = (s: FitSet, G: Float64Array[], o: number): number => {
  let num = 0, den = 0;
  for (let m = 1; m <= 60; m += 1) { num += (G[m][o] - s.x[m][o]) ** 2; den += s.x[m][o] ** 2; }
  return den > 0 ? Math.sqrt(num / den) : Number.NaN;
};
const waveErr60 = (a: Resp, b: Resp, rows: number[]): number => {
  let num = 0, den = 0;
  for (let m = 1; m <= 60; m += 1) for (const o of rows) { const d = a[m][o] - b[m][o]; num += d * d; den += b[m][o] * b[m][o]; }
  return den > 0 ? Math.sqrt(num / den) : Number.NaN;
};
const out: Any = { pictures: PICS.map((p) => ({ key: p.key, name: p.name })), groups: {} };
const L: string[] = ['# 3.6g question 1: the open twins, every picture by 3.6e\'s predErr', '',
  '*Open sets passing over 1.0 s at ≥ 4 m/s (kick-tick schedule speed), 3.6e\'s frozen bins and σ (`board-fit/results/fit/`), the eight mechanical states over m = 1 … 60 (1.0 s at 60 Hz), per unit model-sign command; frozen = the picture held at the kick tick\'s speed, depth and rail; speed-following = the schedule speed tick by tick, depth and rail held. Ratios are per set, against P_two on the same set; medians [25–75 %]. Rows: ‖G_o − g_o‖ / ‖g_o‖ per state.*', ''];
for (const [tag, dir] of [['fitting', fitRuns], ['heldout', heldRuns]] as const) {
  const runs = loadRuns(jsonl(dir), false);
  const { all } = fitSets(runs);
  out.groups[tag] = {};
  for (const [script, label] of STANCES) {
    const fit = JSON.parse(readFileSync(join(fitDir, `fit-${label}.json`), 'utf8'));
    const openAll = all.filter((s) => s.script === script && s.mode === 'open' && s.set.pass60);
    const sets = openAll.filter((s) => s.v >= SPEED_FLOOR);
    const rows = sets.map((s) => {
      const b = binOf(s.v, fit.edges);
      const sig = fit.bins[b].sigma;
      const r: Any = { id: s.id, v: s.v, depth: s.depth, rail: s.rail, bin: b, channel: s.channel, pic: {} };
      for (const p of PICS) {
        const G = openFrozen(p, s), GL = openSF(p, s);
        r.pic[p.key] = {
          e: predErr(s, G, sig), eSF: predErr(s, GL, sig),
          rows: Object.fromEntries(ROWS.map(([nm, o]) => [nm, rowErr(s, G, o)])),
          rowsSF: Object.fromEntries(ROWS.map(([nm, o]) => [nm, rowErr(s, GL, o)])),
          sense: waveErr60(G.map((x) => outOf(x)), s.set.g, SENSE_ROWS), senseSF: waveErr60(GL.map((x) => outOf(x)), s.set.g, SENSE_ROWS),
        };
      }
      return r;
    });
    const st: Any = { sets: rows.length, slow: openAll.length - sets.length, ankle: rows.filter((r) => r.channel === 0).length, edges: fit.edges, pics: {} };
    L.push(`## ${label}, ${tag} seeds: ${rows.length} open sets (${st.ankle} ankle, ${rows.length - st.ankle} twist; ${st.slow} below ${SPEED_FLOOR} m/s excluded); bins ${JSON.stringify(fit.edges)}`, '');
    L.push(`| picture | median e | e / e_two [25–75 %] | e < e_two | speed-following: median e | e / e_two (SF) [25–75 %] | better (SF) | senses, median | ${SHOWN.map((k) => `${k} err (ratio)`).join(' | ')} |`);
    L.push(`| --- | --- | --- | --- | --- | --- | --- | --- | ${SHOWN.map(() => '---').join(' | ')} |`);
    for (const p of PICS) {
      const e = rows.map((r) => r.pic[p.key].e), eL = rows.map((r) => r.pic[p.key].eSF);
      const ratio = rows.map((r) => r.pic[p.key].e / r.pic.two.e), ratioL = rows.map((r) => r.pic[p.key].eSF / r.pic.two.eSF);
      const better = rows.filter((r) => r.pic[p.key].e < r.pic.two.e).length, betterL = rows.filter((r) => r.pic[p.key].eSF < r.pic.two.eSF).length;
      const rowMed: Any = {}, rowRatio: Any = {}, rowRatioSF: Any = {}, rowMedSF: Any = {};
      for (const [nm] of ROWS) {
        rowMed[nm] = med(rows.map((r) => r.pic[p.key].rows[nm])); rowRatio[nm] = med(rows.map((r) => r.pic[p.key].rows[nm] / r.pic.two.rows[nm]));
        rowMedSF[nm] = med(rows.map((r) => r.pic[p.key].rowsSF[nm])); rowRatioSF[nm] = med(rows.map((r) => r.pic[p.key].rowsSF[nm] / r.pic.two.rowsSF[nm]));
      }
      const byBin = [0, 1, 2].map((b) => { const rb = rows.filter((r) => r.bin === b); return { sets: rb.length, medianE: med(rb.map((r) => r.pic[p.key].e)), medianRatio: med(rb.map((r) => r.pic[p.key].e / r.pic.two.e)), medianRatioSF: med(rb.map((r) => r.pic[p.key].eSF / r.pic.two.eSF)), speed: med(rb.map((r) => r.v)) }; });
      const byCh = [0, 1].map((c) => { const rc = rows.filter((r) => r.channel === c); return { sets: rc.length, medianE: med(rc.map((r) => r.pic[p.key].e)), medianRatio: med(rc.map((r) => r.pic[p.key].e / r.pic.two.e)) }; });
      st.pics[p.key] = {
        medianE: med(e), ratio: { median: med(ratio), q25: q(ratio, 0.25), q75: q(ratio, 0.75) }, better, of: rows.length,
        medianESF: med(eL), ratioSF: { median: med(ratioL), q25: q(ratioL, 0.25), q75: q(ratioL, 0.75) }, betterSF: betterL,
        sense: med(rows.map((r) => r.pic[p.key].sense)), senseSF: med(rows.map((r) => r.pic[p.key].senseSF)),
        senseRatio: med(rows.map((r) => r.pic[p.key].sense / r.pic.two.sense)),
        rowMed, rowRatio, rowMedSF, rowRatioSF, byBin, byCh,
        predicts: better >= 0.75 * rows.length && med(ratio) <= 0.5,
      };
      const P = st.pics[p.key];
      L.push(`| ${p.name} | ${fx(P.medianE)} | ${p === P_TWO ? '1' : `${fx(P.ratio.median)} [${fx(P.ratio.q25)}, ${fx(P.ratio.q75)}]`} | ${p === P_TWO ? '—' : `${better} of ${rows.length}`} | ${fx(P.medianESF)} | ${p === P_TWO ? '1' : `${fx(P.ratioSF.median)} [${fx(P.ratioSF.q25)}, ${fx(P.ratioSF.q75)}]`} | ${p === P_TWO ? '—' : `${betterL} of ${rows.length}`} | ${fx(P.sense)}${p === P_TWO ? '' : ` (${fx(P.senseRatio)})`} | ${SHOWN.map((k) => `${fx(rowMed[k])}${p === P_TWO ? '' : ` (${fx(rowRatio[k])})`}`).join(' | ')} |`);
    }
    L.push('');
    L.push('| picture | bin: sets, median speed, median e, e / e_two (frozen; SF) | | | ankle kicks: e / e_two | twist kicks: e / e_two | φ̇, θ̇, ω_u err (ratio) |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const p of PICS) {
      const P = st.pics[p.key];
      L.push(`| ${p.name} | ${P.byBin.map((b: Any, i: number) => `${['[4, ' + fit.edges[0] + ')', '[' + fit.edges[0] + ', ' + fit.edges[1] + ')', '[' + fit.edges[1] + ', ∞)'][i]}: ${b.sets}, ${fx(b.speed, 1)} m/s, ${fx(b.medianE)}, ${fx(b.medianRatio)}; ${fx(b.medianRatioSF)}`).join(' | ')} | ${fx(P.byCh[0].medianRatio)} (${P.byCh[0].sets}) | ${fx(P.byCh[1].medianRatio)} (${P.byCh[1].sets}) | ${['φ̇', 'θ̇', 'ω_u'].map((k) => `${fx(P.rowMed[k])} (${fx(P.rowRatio[k])})`).join(', ')} |`);
    }
    L.push('');
    st.rows = rows;
    out.groups[tag][label] = st;
    console.error(`[open ${new Date().toISOString().slice(11, 19)}] ${tag} ${label}: ${rows.length} sets`);
  }
}
writeFileSync(`${outPrefix}.md`, L.join('\n'));
writeFileSync(`${outPrefix}.json`, JSON.stringify(out));
console.log(L.join('\n'));
