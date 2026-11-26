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
import { median, modelOpen, waveErr, SENSE_ROWS, type Resp } from '../response/responseLib';
import { SPEED_FLOOR, binOf, disc, fitSets, freeResp, loadRuns, openResp, outOf, predErr, type FitSet } from './fitLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [fitDir, heldDir, outDir] = process.argv.slice(2);
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
const measured = (s: FitSet): Resp => s.set.g;
for (const [script, label] of STANCES) {
  const fit = JSON.parse(readFileSync(join(fitDir, `fit-${label}.json`), 'utf8'));
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
L.push(`**Question 2 (Compress decides):** ${selected ? `set (${selected}) is the smallest that predicts` : `no nested set predicts; question 3 proceeds with (${fallback}), the lowest held-out median ratio, labelled as having failed question 2`}.`, '');
writeFileSync(join(outDir, 'heldout-q2.md'), L.join('\n'));
writeFileSync(join(outDir, 'heldout-q2.json'), JSON.stringify(summary));
console.log(L.join('\n'));
