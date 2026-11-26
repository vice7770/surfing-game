/**
 * **3.6e's held-out reader, question 2** (README §0.3): the frozen fits (`fit-<stance>.json`) scored on the held-out
 * twins (Big seeds 4 and 5), read once. Per open set passing over 1.0 s at ≥ 4 m/s: the prediction error of each nested
 * fit, the shipped model, the blended design, the FIR and the free rows; the registered rule; the selected set.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/board-fit/heldout.ts --file <s>/heldout.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) node <s>/heldout.mjs <fit dir> <held-out runs dir> <out dir>
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { median, modelOpen, SENSE_ROWS, type Resp } from '../response/responseLib';
import { FIT_MODE, SPEED_FLOOR, binOf, disc, fitSets, freeResp, loadRuns, ltvResp, openResp, outOf, predErr, type FitSet } from './fitLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [fitDir, heldDir, outDir, ltvDir] = process.argv.slice(2);
// Amendment 3: the speed-following fits (`fit.ts --ltv`), scored in the same read, against the shipped model following
// the speed the same way.
void FIT_MODE;
const STANCES: [string, string][] = [['compress:straight', 'Compress'], ['crouch:straight', 'tuck'], ['none:straight', 'tall']];
const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const f = (x: number, n = 3) => (Number.isFinite(x) ? x.toFixed(n) : '—');
const files = readdirSync(heldDir).filter((x) => x.endsWith('.jsonl')).sort().map((x) => join(heldDir, x));
const opened = new Date().toISOString();
const runs = loadRuns(files, false);
const { all } = fitSets(runs);
const L: string[] = [`# 3.6e question 2: the held-out prediction (${files.map((x) => x.split('/').pop()).join(', ')}; first opened ${opened})`, ''];
const summary: Any = { opened, files: files.map((x) => x.split('/').pop()), stances: {} };
/** The senses of a full-state response (as the probe's rows), for 3.6d's waveform error. */
const sensesOf = (G: Float64Array[]): Resp => G.map((x) => outOf(x));
// Fix after the first opening crashed on its first set, before any output (README §0.11): 3.6d's `waveErr` runs to
// H = 90 ticks and these responses are 60 long; the senses' waveform error is taken over m = 1 … 60, as e is.
const waveErr = (a: Resp, b: Resp, rows: number[]): number => {
  let num = 0, den = 0;
  for (let m = 1; m <= 60; m += 1) for (const o of rows) { const d = a[m][o] - b[m][o]; num += d * d; den += b[m][o] * b[m][o]; }
  return den > 0 ? Math.sqrt(num / den) : Number.NaN;
};
const measured = (s: FitSet): Resp => s.set.g;
for (const [script, label] of STANCES) {
  const fit = JSON.parse(readFileSync(join(fitDir, `fit-${label}.json`), 'utf8'));
  const fitL = ltvDir ? JSON.parse(readFileSync(join(ltvDir, `fit-${label}.json`), 'utf8')) : undefined;
  if (fitL && JSON.stringify(fitL.edges) !== JSON.stringify(fit.edges)) throw new Error('the two fits disagree on the bins');
  const edges = fit.edges as [number, number];
  const openAll = all.filter((s) => s.script === script && s.mode === 'open' && s.set.pass60);
  const sets = openAll.filter((s) => s.v >= SPEED_FLOOR);
  const rows = sets.map((s) => {
    const b = binOf(s.v, edges);
    const bin = fit.bins[b];
    const sig = bin.sigma as number[][];
    const r: Any = { id: s.id, v: s.v, bin: b, channel: s.channel };
    const Gs = openResp(disc(s.v, s.depth, s.rail, {}), s.channel);
    r.ship = predErr(s, Gs, sig);
    r.shipSense = waveErr(sensesOf(Gs), measured(s), SENSE_ROWS);
    for (const k of LETTERS) {
      const G = openResp(disc(s.v, s.depth, s.rail, bin.nested[k].mult), s.channel);
      r[k] = predErr(s, G, sig);
      r[`${k}Sense`] = waveErr(sensesOf(G), measured(s), SENSE_ROWS);
    }
    if (s.kb.design) {
      const g = modelOpen(s.kb.design.phi, s.kb.design.gamma, s.kb.design.c, s.channel as 0 | 1);
      r.blend = predErr(s, (m) => [g[m][0] - g[m][5], g[m][1] - g[m][6], g[m][0], g[m][1], g[m][2] - g[m][4], g[m][8], g[m][3], g[m][2]], sig);
    }
    r.fir = predErr(s, (m) => bin.fir[s.channel][m], sig);
    if (fitL) {
      const GsL = ltvResp(s, {});
      r.shipL = predErr(s, GsL, sig);
      for (const k of LETTERS) { const G = ltvResp(s, fitL.bins[b].nested[k].mult); r[`L${k}`] = predErr(s, G, sig); r[`L${k}Sense`] = waveErr(sensesOf(G), measured(s), SENSE_ROWS); }
    }
    r.free = predErr(s, freeResp(bin.free, s), sig);
    return r;
  });
  const st: Any = { sets: rows.length, slow: openAll.length - sets.length, ankle: rows.filter((r) => r.channel === 0).length, rule: {} };
  L.push(`## ${label}: ${rows.length} held-out open sets (${st.ankle} ankle; ${st.slow} below ${SPEED_FLOOR} m/s excluded); bins ${JSON.stringify(edges)}`, '');
  L.push('| model | median e | median e / e_shipped [25–75 %] | e < e_shipped | predicts (≥ 75 % and median ratio ≤ 0.5) | senses waveform error, median |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  const qq = (xs: number[], p: number) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); const i = (s.length - 1) * p; const lo = Math.floor(i); return s[lo] + (s[Math.min(s.length - 1, lo + 1)] - s[lo]) * (i - lo); };
  L.push(`| shipped (plantAt, every multiplier 1) | ${f(median(rows.map((r) => r.ship)))} | 1 | — | — | ${f(median(rows.map((r) => r.shipSense)))} |`);
  for (const k of [...LETTERS, 'blend', 'fir', 'free']) {
    const ratio = rows.map((r) => r[k] / r.ship);
    const better = rows.filter((r) => r[k] < r.ship).length;
    const predicts = better >= 0.75 * rows.length && median(ratio) <= 0.5;
    st.rule[k] = { medianE: median(rows.map((r) => r[k])), medianRatio: median(ratio), better, of: rows.length, predicts };
    const name = { a: '(a) water', b: '(b) + inertias', c: '(c) + body', d: '(d) exploratory', e: '(e) exploratory (feet)', blend: 'blended design at the kick tick', fir: 'FIR (bin mean)', free: 'free rows' }[k as 'a'] ?? k;
    L.push(`| ${name} | ${f(median(rows.map((r) => r[k])))} | ${f(median(ratio))} [${f(qq(ratio, 0.25))}, ${f(qq(ratio, 0.75))}] | ${better} of ${rows.length} | ${['a', 'b', 'c'].includes(k) ? (predicts ? '**yes**' : 'no') : (predicts ? 'yes (reference)' : 'no (reference)')} | ${rows[0]?.[`${k}Sense`] !== undefined ? f(median(rows.map((r) => r[`${k}Sense`]))) : ''} |`);
  }
  L.push('');
  if (fitL) {
    L.push(`**The speed-following fits** (amendment 3), against the shipped model following the speed (median e ${f(median(rows.map((r) => r.shipL)))}):`, '');
    L.push('| model | median e | median e / e_shipped,speed-following [25–75 %] | better | predicts | median e / e_shipped (held at the kick tick) | senses waveform error, median |');
    L.push('| --- | --- | --- | --- | --- | --- | --- |');
    st.ruleL = {};
    for (const k of LETTERS) {
      const ratio = rows.map((r) => r[`L${k}`] / r.shipL);
      const better = rows.filter((r) => r[`L${k}`] < r.shipL).length;
      const predicts = better >= 0.75 * rows.length && median(ratio) <= 0.5;
      st.ruleL[k] = { medianE: median(rows.map((r) => r[`L${k}`])), medianRatio: median(ratio), better, of: rows.length, predicts, medianRatioVsHeld: median(rows.map((r) => r[`L${k}`] / r.ship)) };
      L.push(`| (${k}) speed-following${k >= 'd' ? ' (exploratory)' : ''} | ${f(median(rows.map((r) => r[`L${k}`])))} | ${f(median(ratio))} [${f(qq(ratio, 0.25))}, ${f(qq(ratio, 0.75))}] | ${better} of ${rows.length} | ${['a', 'b', 'c'].includes(k) ? (predicts ? '**yes**' : 'no') : (predicts ? 'yes (exploratory)' : 'no (exploratory)')} | ${f(st.ruleL[k].medianRatioVsHeld)} | ${f(median(rows.map((r) => r[`L${k}Sense`])))} |`);
    }
    L.push('');
  }
  // Per bin.
  L.push('| bin | sets | median e_shipped | median ratio (a) / (b) / (c) / (d) / (e) | FIR |', '| --- | --- | --- | --- | --- |');
  for (let b = 0; b < 3; b += 1) {
    const rb = rows.filter((r) => r.bin === b);
    L.push(`| ${fit.bins[b].name} | ${rb.length} | ${f(median(rb.map((r) => r.ship)))} | ${LETTERS.map((k) => f(median(rb.map((r) => r[k] / r.ship)))).join(' / ')} | ${f(median(rb.map((r) => r.fir / r.ship)))} |`);
  }
  L.push('');
  st.rows = rows;
  summary.stances[label] = st;
}
const comp = summary.stances.Compress.rule;
const selected = ['a', 'b', 'c'].find((k) => comp[k].predicts);
const fallback = ['a', 'b', 'c'].reduce((x, y) => (comp[y].medianRatio < comp[x].medianRatio ? y : x));
summary.selected = selected ?? null;
summary.carried = selected ?? fallback;
L.push(`**Question 2, the registered fit (Compress decides):** ${selected ? `set (${selected}) is the smallest that predicts` : `no nested set predicts; its set of the lowest held-out median ratio is (${fallback}), labelled as having failed question 2`}.`, '');
if (ltvDir) {
  const cl = summary.stances.Compress.ruleL;
  const selL = ['a', 'b', 'c'].find((k) => cl[k].predicts);
  const fbL = ['a', 'b', 'c'].reduce((x, y) => (cl[y].medianRatio < cl[x].medianRatio ? y : x));
  summary.selectedL = selL ?? null;
  summary.carriedL = selL ?? fbL;
  L.push(`**Question 2, the speed-following fit (amendment 3; Compress decides):** ${selL ? `set (${selL}) is the smallest that predicts` : `no nested set predicts; its set of the lowest held-out median ratio is (${fbL}), labelled as having failed question 2`}. Question 3's primary run uses the speed-following fit's set (${summary.carriedL}); the registered fit's set (${summary.carried}) is closed beside it.`, '');
}
writeFileSync(join(outDir, 'heldout-q2.md'), L.join('\n'));
writeFileSync(join(outDir, 'heldout-q2.json'), JSON.stringify(summary));
console.log(L.join('\n'));
