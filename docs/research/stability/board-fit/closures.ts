/**
 * **3.6e's closures, questions 3 and 4** (README §0.4, §0.6): the fitted model (one nested set, its bins' parameters)
 * closed with the shipped design, speed-following (primary) and frozen, on the closed twins of the given runs; the
 * shipped model and 3.6d's S0 beside; the three decay read-outs; the delay sweeps; and, if asked, question 4.
 *
 *   ./node_modules/.bin/rolldown docs/research/stability/board-fit/closures.ts --file <s>/closures.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`)
 *   node <s>/closures.mjs <fit dir> <letter> <out prefix> <tag>=<runs dir> [<tag>=<runs dir> …] [--q4]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { closedLoop, design, leastDamping, type DesignWeights } from '../../../../src/physics/predictiveBalance';
import { eigenvalues } from '../../../../src/physics/rollModel';
import { readout } from '../response/analyse';
import { closeOn, median, peakOf, perturbation, power, ring, SENSE_ROWS, stack, waveErr, type CtrlOpts } from '../response/responseLib';
import { ARGS_PRE, OI, SPEED_FLOOR, binOf, buildPlant, closeLTV, disc, discreteOf, envelope, fitSets, loadRuns, type Disc, type FitSet, type Mult } from './fitLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const args = process.argv.slice(2);
const [fitDir, letter, outPrefix] = args;
const Q4 = args.includes('--q4');
const sources = args.slice(3).filter((a) => a.includes('=')).map((a) => { const [tag, dir] = a.split('='); return { tag, dir }; });
const STANCES: [string, string][] = [['compress:straight', 'Compress'], ['crouch:straight', 'tuck'], ['none:straight', 'tall']];
const MEASURED: Record<string, Record<string, number>> = {
  Compress: { d4: 3.08, d6: 2.67, d8: 2.36, sm2: 3.72, sp2: 2.05 },
  tuck: { d4: 3.26, d6: 2.90, d8: 2.54, sm2: 3.73, sp2: 2.33 },
  tall: { d4: 2.90, d6: 2.31, d8: 2.11, sm2: 4.26, sp2: 1.93 },
};
const SWEEPS: { key: string; opts: CtrlOpts }[] = [
  { key: 'd4', opts: { designDelay: 4 } }, { key: 'd6', opts: {} }, { key: 'd8', opts: { designDelay: 8 } },
  { key: 'sm2', opts: { senseShift: -2 } }, { key: 'sp2', opts: { senseShift: 2 } },
];
const f = (x: number, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : '—');
const log = (s: string) => console.error(`[closures ${new Date().toISOString().slice(11, 19)}] ${s}`);
let weights: DesignWeights | undefined;
const sets: { tag: string; s: FitSet; open: { ankle?: FitSet; twist?: FitSet } }[] = [];
for (const { tag, dir } of sources) {
  const files = readdirSync(dir).filter((x) => x.endsWith('.jsonl')).sort().map((x) => join(dir, x));
  const runs = loadRuns(files, false);
  weights = weights ?? runs.weights;
  const { all } = fitSets(runs);
  const byKey = new Map<string, FitSet>();
  for (const s of all) if (s.mode === 'open' && s.set.pass90) byKey.set(`${s.base}|${s.at}|${s.channel}`, s);
  for (const s of all) if (s.mode === 'closed' && s.set.pass90 && s.v >= SPEED_FLOOR) sets.push({ tag, s, open: { ankle: byKey.get(`${s.base}|${s.at}|0`), twist: byKey.get(`${s.base}|${s.at}|1`) } });
  log(`${tag}: ${files.length} files, ${sets.filter((x) => x.tag === tag).length} closed sets at ≥ ${SPEED_FLOOR} m/s`);
}
const W = weights!;
const L: string[] = [`# 3.6e question 3: the fitted model (set (${letter})) closed with the shipped design (${sources.map((x) => x.tag).join(', ')})`, ''];
const out: Any = { letter, stances: {} };
const addPow = (acc: number[], p: number[]) => { if (!acc.length) for (const x of p) acc.push(x); else for (let i = 0; i < p.length; i += 1) acc[i] += p[i]; };
for (const [script, label] of STANCES) {
  const fit = JSON.parse(readFileSync(join(fitDir, `fit-${label}.json`), 'utf8'));
  const edges = fit.edges as [number, number];
  const mine = sets.filter((x) => x.s.script === script);
  const res: Any[] = [];
  const pow: Record<string, number[]> = {};
  for (const { tag, s, open } of mine) {
    const b = binOf(s.v, edges);
    const mult: Mult = fit.bins[b].nested[letter].mult;
    const kb = s.kb;
    const argAt = (m: number) => { const i = Math.max(0, Math.min(kb.args.speed.length - 1, ARGS_PRE + m)); return { speed: kb.args.speed[i] as number, depth: kb.args.depth[i] as number, rail: kb.args.rail[i] as number }; };
    const frozen = () => argAt(0);
    const cache = new Map<string, Disc>();
    const plantOf = (mm: Mult, at: (m: number) => { speed: number; depth: number; rail: number }) => (m: number) => {
      const a = at(m);
      const k = `${a.speed}|${a.depth}|${a.rail}|${mm === mult ? 'f' : 's'}`;
      let d = cache.get(k);
      if (!d) { d = disc(a.speed, a.depth, a.rail, mm); cache.set(k, d); }
      return d;
    };
    const ch = s.channel;
    const tw = s.set.g;
    const twOm = tw.map((v) => v[OI.Om]);
    const r: Any = { tag, id: s.id, v: s.v, bin: b, channel: ch };
    const rd = (y: Float64Array[] | ArrayLike<number>[], key: string, full = false) => {
      const om = (y as Float64Array[]).map((v) => v[OI.Om]);
      const md = ring(om);
      const fRead = full ? readout(om) : undefined;
      r[key] = { f: md?.f ?? Number.NaN, zeta: md?.zeta ?? Number.NaN, fitF: fRead?.fitF, fitZeta: fRead?.fitZeta, env: envelope(om, md?.f ?? Number.NaN), waveOm: waveErr(y as Any, tw, [OI.Om]), waveSense: waveErr(y as Any, tw, SENSE_ROWS) };
      addPow((pow[key] ??= []), power(om));
    };
    const twR = readout(twOm);
    r.twin = { f: twR.f, zeta: twR.zeta, fitF: twR.fitF, fitZeta: twR.fitZeta, env: envelope(twOm, twR.f) };
    addPow((pow.twin ??= []), power(twOm));
    rd(closeLTV(plantOf(mult, argAt), ch, perturbation(W, argAt)), 'fitSF', true);
    rd(closeLTV(plantOf(mult, frozen), ch, perturbation(W, frozen)), 'fitFr', true);
    rd(closeLTV(plantOf({}, argAt), ch, perturbation(W, argAt)), 'shipSF', true);
    rd(closeLTV(plantOf({}, frozen), ch, perturbation(W, frozen)), 'shipFr', true);
    if (open.ankle && open.twist) rd(closeOn(stack(open.ankle.set.g, open.twist.set.g), ch, perturbation(W, argAt)).y, 'S0');
    for (const sw of SWEEPS) {
      if (sw.key === 'd6') continue;
      rd(closeLTV(plantOf(mult, argAt), ch, perturbation(W, argAt, sw.opts)), `sw_${sw.key}_SF`);
      rd(closeLTV(plantOf(mult, frozen), ch, perturbation(W, frozen, sw.opts)), `sw_${sw.key}_Fr`);
    }
    res.push(r);
  }
  // ---- The table.
  const tags = [...new Set(res.map((r) => r.tag)), 'pooled'];
  L.push(`## ${label} (${res.length} closed sets: ${tags.filter((t) => t !== 'pooled').map((t) => `${t} ${res.filter((r) => r.tag === t).length}`).join(', ')})`, '');
  L.push('| closure | sets | Prony f, median | f − f_twin, median paired | waveform error Ω, median | senses, median | Prony ζ, median | damped-sinusoid ζ, median | envelope ratio, median | pooled peak, Hz |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  const st: Any = {};
  for (const t of tags) {
    const rr = t === 'pooled' ? res : res.filter((r) => r.tag === t);
    if (!rr.length) continue;
    L.push(`| **${t}: the closed twins** | ${rr.length} | ${f(median(rr.map((r) => r.twin.f)))} | | | | ${f(median(rr.map((r) => r.twin.zeta)), 3)} | ${f(median(rr.map((r) => r.twin.fitZeta)), 3)} | ${f(median(rr.map((r) => r.twin.env)))} | ${t === 'pooled' ? f(peakOf(pow.twin)) : ''} |`);
    for (const [key, name] of [['fitSF', `fitted (${letter}), speed-following (primary)`], ['fitFr', `fitted (${letter}), frozen`], ['shipSF', 'shipped, speed-following'], ['shipFr', 'shipped, frozen'], ['S0', '3.6d S0 (measured open, closed)']] as const) {
      const ok = rr.filter((r) => r[key]);
      if (!ok.length) continue;
      const df = median(ok.map((r) => r[key].f - r.twin.f));
      const wv = median(ok.map((r) => r[key].waveOm));
      L.push(`| ${t}: ${name} | ${ok.length} | ${f(median(ok.map((r) => r[key].f)))} | ${f(df)} | ${f(wv)} | ${f(median(ok.map((r) => r[key].waveSense)))} | ${f(median(ok.map((r) => r[key].zeta)), 3)} | ${ok[0][key].fitZeta !== undefined ? f(median(ok.map((r) => r[key].fitZeta)), 3) : ''} | ${f(median(ok.map((r) => r[key].env)))} | ${t === 'pooled' ? f(peakOf(pow[key])) : ''} |`);
      if (t === 'pooled') st[key] = { df, wave: wv, f: median(ok.map((r) => r[key].f)), reproduces: Math.abs(df) <= 0.15 && wv <= 0.6, n: ok.length };
    }
  }
  L.push('', `- **reproduces** (primary, pooled: |median paired Δf| ≤ 0.15 Hz and median waveform error on Ω ≤ 0.6): **${st.fitSF?.reproduces ? 'yes' : 'no'}** (Δf ${f(st.fitSF?.df)}, waveform ${f(st.fitSF?.wave)}); frozen: ${st.fitFr?.reproduces ? 'yes' : 'no'} (Δf ${f(st.fitFr?.df)}, ${f(st.fitFr?.wave)}); the shipped model, speed-following: ${st.shipSF?.reproduces ? 'yes' : 'no'} (Δf ${f(st.shipSF?.df)}, ${f(st.shipSF?.wave)})`, '');
  // ---- The sweeps.
  const meas = MEASURED[label];
  L.push(`### ${label}: the delay sweeps (fitted (${letter}); Prony f median over the ${res.length} sets; pooled peak beside)`, '');
  L.push('| closing | measured peak | speed-following: Prony f (pooled) | within ±0.25 | frozen: Prony f (pooled) | within ±0.25 |', '| --- | --- | --- | --- | --- | --- |');
  const sw: Any = {};
  for (const s2 of SWEEPS) {
    const kS = s2.key === 'd6' ? 'fitSF' : `sw_${s2.key}_SF`, kF = s2.key === 'd6' ? 'fitFr' : `sw_${s2.key}_Fr`;
    const pS = median(res.map((r) => r[kS].f)), pF = median(res.map((r) => r[kF].f));
    sw[s2.key] = { sf: pS, fr: pF, sfPooled: peakOf(pow[kS]), frPooled: peakOf(pow[kF]), measured: meas[s2.key] };
    L.push(`| ${s2.key} | ${f(meas[s2.key])} | ${f(pS)} (${f(peakOf(pow[kS]))}) | ${Math.abs(pS - meas[s2.key]) <= 0.25 ? 'yes' : '**no**'} | ${f(pF)} (${f(peakOf(pow[kF]))}) | ${Math.abs(pF - meas[s2.key]) <= 0.25 ? 'yes' : '**no**'} |`);
  }
  const orderOk = (k: 'sf' | 'fr') => sw.d4[k] > sw.d6[k] && sw.d6[k] > sw.d8[k] && sw.sm2[k] > sw.d6[k] && sw.d6[k] > sw.sp2[k];
  const within = (k: 'sf' | 'fr') => SWEEPS.every((x) => Math.abs(sw[x.key][k] - meas[x.key]) <= 0.25);
  L.push('', `- **predicts** (speed-following, every closing within ±0.25 Hz and the order right): **${within('sf') && orderOk('sf') ? 'yes' : 'no'}** (order ${orderOk('sf') ? 'right' : 'wrong'}); frozen: ${within('fr') && orderOk('fr') ? 'yes' : 'no'} (order ${orderOk('fr') ? 'right' : 'wrong'})`, '');
  out.stances[label] = { st, sweeps: sw, predicts: within('sf') && orderOk('sf'), rows: res };
  // ---- Question 4 (model-only).
  if (Q4) {
    L.push(`### ${label}: question 4 (model-only; rail 0; the least damping of the loop on the fitted plant)`, '');
    L.push('| bin | speed, depth | design on the fitted plant: ζ, f at 5 / 6 / 7 ticks | the shipped design on the fitted plant: ζ, f at 5 / 6 / 7 | the shipped design on the shipped plant, 6 ticks |', '| --- | --- | --- | --- | --- |');
    const q4: Any[] = [];
    for (let b = 0; b < 3; b += 1) {
      const rb = res.filter((r) => r.bin === b);
      const v = median(rb.map((r) => r.v));
      const depth = median(mine.filter((x) => binOf(x.s.v, edges) === b).map((x) => x.s.depth));
      if (!Number.isFinite(v)) continue;
      const mult: Mult = fit.bins[b].nested[letter].mult;
      const pf = buildPlant(v, depth, 0, mult), ps = buildPlant(v, depth, 0, {});
      const df = discreteOf(pf);
      const dFit = design(pf.y, pf.t, W), dShip = design(ps.y, ps.t, W);
      const ld = (d: Any, steps: number, plant = df) => leastDamping(eigenvalues(closedLoop(plant.phi, plant.gamma, steps, d), { balance: true, maxIterations: 600 }));
      const a = [5, 6, 7].map((n) => ld(dFit, n)), c = [5, 6, 7].map((n) => ld(dShip, n));
      const sOnS = ld(dShip, 6, discreteOf(ps));
      q4.push({ bin: b, v, depth, fitted: a, shipped: c, shippedOnShipped: sOnS });
      L.push(`| ${fit.bins[b].name} | ${f(v)} m/s, ${f(depth, 3)} m | ${a.map((x) => `${f(x.damping, 3)}, ${f(x.frequency)} Hz`).join(' / ')} | ${c.map((x) => `${f(x.damping, 3)}, ${f(x.frequency)} Hz`).join(' / ')} | ${f(sOnS.damping, 3)}, ${f(sOnS.frequency)} Hz |`);
    }
    out.stances[label].q4 = q4;
    L.push('');
  }
  log(`${label}: ${res.length} sets closed`);
}
writeFileSync(`${outPrefix}.md`, L.join('\n'));
writeFileSync(`${outPrefix}.json`, JSON.stringify(out));
console.log(L.join('\n'));
