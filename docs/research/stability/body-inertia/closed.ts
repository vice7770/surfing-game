/**
 * **3.6g question 2: the closed twins** (README §0.3). Each picture closed with the shipped design, unchanged (3.6d's
 * `perturbation`: the blended designs on P_two through his `riderBody=two` weights), speed-following (primary) and
 * frozen, on the closed sets passing over 1.5 s at ≥ 4 m/s of both seed groups; 3.6e's `closures.ts` read-outs.
 *
 *   node closed.mjs <fitting dir> <held-out dir> <out prefix>
 */
import { writeFileSync } from 'node:fs';
import { power, peakOf } from '../response/responseLib';
import { OI, SPEED_FLOOR, fitSets, loadRuns, type FitSet } from '../board-fit/fitLib';
import { P_0, P_CONTROL, P_TWO, STANCES, closeSet, fx, jsonl, med, sweep, twinRead, type Picture } from './inertiaLib';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const [fitRuns, heldRuns, outPrefix] = process.argv.slice(2);
const PICS: Picture[] = [P_TWO, P_0, P_CONTROL, sweep(0.25), sweep(0.5), sweep(2)];
const sets: { tag: string; s: FitSet; W: Any }[] = [];
for (const [tag, dir] of [['fitting', fitRuns], ['heldout', heldRuns]] as const) {
  const runs = loadRuns(jsonl(dir), false);
  for (const s of fitSets(runs).all) if (s.mode === 'closed' && s.set.pass90 && s.v >= SPEED_FLOOR) sets.push({ tag, s, W: runs.weights });
}
const out: Any = { stances: {} };
const L: string[] = ['# 3.6g question 2: the pictures closed with the shipped design', '',
  '*Closed sets passing over 1.5 s at ≥ 4 m/s, Canyon Big seeds 1–3 (fitting) and 4–5 (held-out); a unit kick at m = 0, 90 ticks (1.5 s); read-outs on Ω (the board\'s world-up yaw rate) over m = 1 … 90: Prony\'s dominant mode in 1.5–5 Hz, the damped sinusoid, the envelope ratio (3rd period over 1st), the waveform error on Ω and on the seven senses; the controller the shipped perturbation map (designs built on P_two). Speed-following = the picture at each tick\'s own speed, depth and rail; frozen = at the kick tick\'s.*', ''];
for (const [script, label] of STANCES) {
  const mine = sets.filter((x) => x.s.script === script);
  const res = mine.map(({ tag, s, W }) => {
    const r: Any = { tag, id: s.id, v: s.v, channel: s.channel, twin: twinRead(s) };
    for (const p of PICS) { r[`${p.key}SF`] = closeSet(p, s, W, false); r[`${p.key}Fr`] = closeSet(p, s, W, true); }
    return r;
  });
  const st: Any = {};
  L.push(`## ${label} (${res.length} closed sets: fitting ${res.filter((r) => r.tag === 'fitting').length}, held-out ${res.filter((r) => r.tag === 'heldout').length})`, '');
  L.push('| group: closure | sets | Prony f, median | f − f_twin, median paired | waveform error Ω, median | senses, median | Prony ζ, median | damped-sinusoid ζ, median | envelope ratio, median | reproduces | rings as the game |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const t of ['fitting', 'heldout', 'pooled']) {
    const rr = t === 'pooled' ? res : res.filter((r) => r.tag === t);
    L.push(`| **${t}: the closed twins** | ${rr.length} | ${fx(med(rr.map((r) => r.twin.f)), 2)} | | | | ${fx(med(rr.map((r) => r.twin.zeta)))} | ${fx(med(rr.map((r) => r.twin.fitZeta)))} | ${fx(med(rr.map((r) => r.twin.env)), 2)} | | |`);
    for (const p of PICS) for (const mode of ['SF', 'Fr']) {
      const k = `${p.key}${mode}`;
      const df = med(rr.map((r) => r[k].f - r.twin.f)), wv = med(rr.map((r) => r[k].waveOm));
      const z = med(rr.map((r) => r[k].zeta)), env = med(rr.map((r) => r[k].env));
      const rep = Math.abs(df) <= 0.15 && wv <= 0.6, rings = z <= 0.10 && env >= 0.5;
      (st[t] ??= {})[k] = { n: rr.length, f: med(rr.map((r) => r[k].f)), df, wave: wv, sense: med(rr.map((r) => r[k].waveSense)), zeta: z, fitZeta: med(rr.map((r) => r[k].fitZeta)), env, reproduces: rep, rings };
      const S = st[t][k];
      L.push(`| ${t}: ${p.name}, ${mode === 'SF' ? 'speed-following' : 'frozen'} | ${S.n} | ${fx(S.f, 2)} | ${fx(df, 2)} | ${fx(wv, 2)} | ${fx(S.sense, 2)} | ${fx(z)} | ${fx(S.fitZeta)} | ${fx(env, 2)} | ${mode === 'SF' && t === 'pooled' ? (rep ? '**yes**' : 'no') : (rep ? 'yes' : 'no')} | ${mode === 'SF' && t === 'pooled' ? (rings ? '**yes**' : 'no') : (rings ? 'yes' : 'no')} |`);
    }
  }
  // The pooled power peaks of Ω (3.6d's `power`), the twins' and each picture's speed-following.
  const pk: Any = {};
  const add = (acc: number[], p: number[]) => { if (!acc.length) for (const x of p) acc.push(x); else for (let i = 0; i < p.length; i += 1) acc[i] += p[i]; };
  const tw: number[] = [];
  for (const { s } of mine) add(tw, power(s.set.g.map((v) => v[OI.Om])));
  pk.twin = peakOf(tw);
  L.push('', `- pooled Ω power peak: the twins ${fx(pk.twin, 2)} Hz`, '');
  out.stances[label] = { st, peaks: pk, rows: res };
  console.error(`[closed ${new Date().toISOString().slice(11, 19)}] ${label}: ${res.length} sets`);
}
writeFileSync(`${outPrefix}.md`, L.join('\n'));
writeFileSync(`${outPrefix}.json`, JSON.stringify(out));
console.log(L.join('\n'));
