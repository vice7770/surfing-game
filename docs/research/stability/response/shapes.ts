/**
 * **3.6d, a descriptive addition made after the stage table was read (README §3, labelled there):** the open-loop
 * responses' shapes, measured against the model's, per stance and channel: the median over the passing open sets of
 * each per-unit response at a few lags, and the time of its largest magnitude in the first second.
 *
 *   (bundle as response.ts) node <s>/shapes.mjs <out.md> <twins run dir>
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OI, group, median, modelOpen, type KBaseRow, type KickRow, type Resp } from './responseLib';

const [out, dir] = process.argv.slice(2);
const kicks: KickRow[] = [];
const kbases: KBaseRow[] = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.jsonl')).sort()) {
  for (const line of readFileSync(join(dir, f), 'utf8').split('\n')) {
    if (line.startsWith('{"kind":"kick"')) kicks.push(JSON.parse(line));
    else if (line.startsWith('{"kind":"kbase"')) kbases.push(JSON.parse(line));
  }
}
const g = group(kicks, kbases);
const LAGS = [1, 3, 6, 9, 12, 18, 24, 36, 48, 60];
const Q: [string, (v: Float64Array) => number][] = [
  ['theta (bank, y0)', (v) => v[0]], ['phi (board roll, y0 - y5)', (v) => v[0] - v[5]], ['r (y2 - y4)', (v) => v[2] - v[4]], ['beta', (v) => v[OI.beta]],
  ['theta_t (y3)', (v) => v[3]], ['omega_u (y2)', (v) => v[2]],
];
const L: string[] = ['# 3.6d open-loop shapes (descriptive): median per-unit response, measured / model, at lags (ticks of 1/60 s)', ''];
for (const sc of ['compress:straight', 'none:straight', 'crouch:straight']) {
  for (const ch of ['ankle', 'twist'] as const) {
    const sets = g.sets.filter((s) => s.script === sc && s.mode === 'open' && s.channel === ch && s.pass60);
    if (!sets.length) continue;
    const pairs: { gm: Resp; gg: Resp }[] = [];
    for (const s of sets) {
      const kb = g.kbase.get(`${s.base}|${s.at}`);
      if (!kb?.design) continue;
      pairs.push({ gg: s.g, gm: modelOpen(kb.design.phi, kb.design.gamma, kb.design.c, ch === 'ankle' ? 0 : 1) });
    }
    L.push(`## ${sc}, ${ch} command (${pairs.length} sets; per unit model-sign command: rad or N·m)`, '');
    L.push(`| quantity | ${LAGS.map((m) => `m = ${m}`).join(' | ')} | peak lag, measured / model |`);
    L.push(`| --- | ${LAGS.map(() => '---').join(' | ')} | --- |`);
    for (const [name, q] of Q) {
      const cells = LAGS.map((m) => `${median(pairs.map((p) => q(p.gg[m]))).toPrecision(3)} / ${median(pairs.map((p) => q(p.gm[m]))).toPrecision(3)}`);
      const pk = (r: Resp) => { let b = 1; for (let m = 1; m <= 60; m += 1) if (Math.abs(q(r[m])) > Math.abs(q(r[b]))) b = m; return b; };
      L.push(`| ${name} | ${cells.join(' | ')} | ${median(pairs.map((p) => pk(p.gg)))} / ${median(pairs.map((p) => pk(p.gm)))} |`);
    }
    L.push('');
  }
}
// The plant's time variation along a ride: per base and channel, the open responses at two kick times (both passing),
// ‖G_a − G_b‖ / ‖G_a‖ over the senses and 60 ticks; beside it, the same between the model's responses at those ticks.
L.push('## The response\'s change along a ride (descriptive)', '', '| stance | channel | pairs of kick times | measured: ‖G(t1) − G(t2)‖ / ‖G(t1)‖, median [range] | model: the same |', '| --- | --- | --- | --- | --- |');
const rel = (a: Resp, b: Resp) => { let n = 0, d = 0; for (let m = 1; m <= 60; m += 1) for (let o = 0; o < 7; o += 1) { n += (a[m][o] - b[m][o]) ** 2; d += a[m][o] ** 2; } return Math.sqrt(n / d); };
for (const sc of ['compress:straight', 'none:straight', 'crouch:straight']) for (const ch of ['ankle', 'twist'] as const) {
  const byBase = new Map<string, typeof g.sets>();
  for (const s of g.sets) if (s.script === sc && s.mode === 'open' && s.channel === ch && s.pass60) byBase.set(s.base, [...(byBase.get(s.base) ?? []), s]);
  const meas: number[] = [], mod: number[] = [];
  for (const [b, ss] of byBase) for (let i = 0; i < ss.length; i += 1) for (let j = i + 1; j < ss.length; j += 1) {
    meas.push(rel(ss[i].g, ss[j].g));
    const ka = g.kbase.get(`${b}|${ss[i].at}`)?.design, kb2 = g.kbase.get(`${b}|${ss[j].at}`)?.design;
    if (ka && kb2) mod.push(rel(modelOpen(ka.phi, ka.gamma, ka.c, ch === 'ankle' ? 0 : 1), modelOpen(kb2.phi, kb2.gamma, kb2.c, ch === 'ankle' ? 0 : 1)));
  }
  if (meas.length) L.push(`| ${sc} | ${ch} | ${meas.length} | ${median(meas).toFixed(2)} [${Math.min(...meas).toFixed(2)}, ${Math.max(...meas).toFixed(2)}] | ${mod.length ? median(mod).toFixed(2) : '—'} |`);
}
L.push('');
writeFileSync(out, L.join('\n') + '\n');
console.log(L.join('\n'));
