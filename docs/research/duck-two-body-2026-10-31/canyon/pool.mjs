import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
const pooled = new Map();
let episodes = 0, abandoned = 0;
for (const f of files) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  episodes += j.episodes; abandoned += j.abandoned;
  for (const [name, list] of Object.entries(j.results)) pooled.set(name, [...(pooled.get(name) ?? []), ...list]);
}
const median = (v) => { if (!v.length) return NaN; const s = [...v].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const fx = (v, d = 1) => Number.isFinite(v) ? v.toFixed(d) : '—';
console.log(`episodes ${episodes}, abandoned ${abandoned}`);
console.log('| Way of meeting it | n | Median setback | Range | Still on the board | Median depth diving | Came off |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const [name, list] of pooled) {
  const s = list.map((r) => r.setback); const d = list.map((r) => r.depth).filter((x) => x > 0);
  const causes = new Map(); for (const r of list) if (r.fell) causes.set(r.fell.cause, (causes.get(r.fell.cause) ?? 0) + 1);
  const at = list.filter((r) => r.fell).map((r) => r.fell.at);
  console.log(`| ${name} | ${list.length} | ${fx(median(s))} m | ${fx(Math.min(...s))} to ${fx(Math.max(...s))} m | ${list.length ? Math.round(100 * list.filter((r) => r.stayedOn).length / list.length) : 0} % | ${d.length ? fx(median(d), 2) + ' m' : '—'} | ${causes.size ? [...causes].map(([c, n]) => `${n} × ${c}`).join(', ') + `; median ${fx(median(at))} s after it reached them` : 'none'} |`);
}
