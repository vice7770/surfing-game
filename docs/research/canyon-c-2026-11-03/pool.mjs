// canyon-c (2026-11-03): the frame probe's runs (`--json`) of one size pooled over seeds, against the ruling's bars 1–5.
// Run: node pool.mjs <run.json>[,<run.json>…] [--field solver|drawn]
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const field = args.includes('--field') ? args[args.indexOf('--field') + 1] : 'solver';
const runs = args[0].split(',').map((file) => JSON.parse(readFileSync(file, 'utf8')));
const quantile = (values, q) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(q * v.length))] : Number.NaN; };
const median = (values) => quantile(values, 0.5);
const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const pct = (n, d) => `${n} of ${d} (${d ? Math.round((100 * n) / d) : 0} %)`;
function spearman(a, b) {
  const rank = (v) => { const order = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]); const r = new Array(v.length); order.forEach(([, i], k) => { r[i] = k; }); return r; };
  const ra = rank(a); const rb = rank(b); const n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n; const mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i += 1) { num += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
}
const BOWL_END = -55;
const JOIN = -22;
const TIP = 140;
const LINK = 4;
const line = runs.flatMap((r) => r[`${field} line`].map((w) => ({ ...w, seed: r.seed })));
const bowl = runs.flatMap((r) => r[`${field} bowl`].map((w) => ({ ...w, seed: r.seed })));
// Sets: each seed's top third of its waves by their height at the first break.
const sets = runs.flatMap((r) => {
  const list = r[`${field} line`];
  const cut = quantile(list.map((w) => w.firstH), 2 / 3);
  return list.filter((w) => w.firstH >= cut).map((w) => ({ ...w, seed: r.seed }));
});
const minusEnd = (w) => w.reached.find(([side]) => side === -1)[1];
const toBowlEnd = (w) => minusEnd(w) - BOWL_END <= LINK;
const toJoin = (w) => minusEnd(w) - JOIN <= LINK;
console.log(`${runs[0].size}, seeds ${runs.map((r) => r.seed).join(', ')} × ${runs[0].periods} periods; the ${field}'s white; ${line.length} waves on the line (${sets.length} sets), ${bowl.length} in the bowl`);
const up = line.map((w) => w.up);
// The line's own +x end (one travelling line, as canyon-b's probe follows it), against any white on its crest.
const lineUp = (w) => w.reached.find(([side]) => side === 1)[1] - w.lines[0][2];
console.log(`1. One direction: any white on its crest ≤ 10 m up the line (+x) of the first break on ${pct(line.filter((w) => w.up <= 10).length, line.length)} `
  + `(sets ${pct(sets.filter((w) => w.up <= 10).length, sets.length)}); up the line p50 ${fmt(median(up))} m, p90 ${fmt(quantile(up, 0.9))} m. `
  + `The line's own +x end ≤ 10 m on ${pct(line.filter((w) => lineUp(w) <= 10).length, line.length)} (sets ${pct(sets.filter((w) => lineUp(w) <= 10).length, sets.length)}), p90 ${fmt(quantile(line.map(lineUp), 0.9))} m; `
  + `its −x end travelled p50 ${fmt(median(line.map((w) => w.lines[0][1] - minusEnd(w))))} m (90th ${fmt(quantile(line.map((w) => w.lines[0][1] - minusEnd(w)), 0.9))})`);
const xs = sets.map((w) => w.firstX);
console.log(`2. First break: sets x p10/p50/p90 ${fmt(quantile(xs, 0.1))}/${fmt(median(xs))}/${fmt(quantile(xs, 0.9))} (p10–p90 ${fmt(quantile(xs, 0.9) - quantile(xs, 0.1))} m), `
  + `${fmt(-median(sets.map((w) => w.firstZ)))} m out (p10–p90 ${fmt(-quantile(sets.map((w) => w.firstZ), 0.9))}–${fmt(-quantile(sets.map((w) => w.firstZ), 0.1))}); all waves x p10/p50/p90 `
  + `${fmt(quantile(line.map((w) => w.firstX), 0.1))}/${fmt(median(line.map((w) => w.firstX)))}/${fmt(quantile(line.map((w) => w.firstX), 0.9))}; `
  + `Spearman(x*, H) ${fmt(spearman(line.map((w) => w.firstX), line.map((w) => w.firstH)), 2)} (all ${line.length}), per seed ${runs.map((r) => fmt(spearman(r[`${field} line`].map((w) => w.firstX), r[`${field} line`].map((w) => w.firstH)), 2)).join(' / ')}; `
  + `within 10 m of the tip ${pct(line.filter((w) => w.firstX >= TIP - 10).length, line.length)}`);
console.log(`3. Continuity: one line from the first break to the bowl's end (x ${BOWL_END}) on ${pct(sets.filter(toBowlEnd).length, sets.length)} of the sets, ${pct(line.filter(toBowlEnd).length, line.length)} of all; `
  + `to the join (x ${JOIN}) ${pct(sets.filter(toJoin).length, sets.length)} of the sets; frames with a patch, median per wave ${fmt(100 * median(line.map((w) => w.patchy)))} % (sets ${fmt(100 * median(sets.map((w) => w.patchy)))} %); `
  + `longest line p50 ${fmt(median(line.map((w) => w.longest)))} m, typical ${fmt(median(line.map((w) => w.typical)))} m`);
const peels = line.flatMap((w) => w.peels);
const wall = peels.filter(([edge]) => edge > JOIN && edge - 20 < TIP);
const stretches = [...new Set(peels.map(([edge]) => edge))].sort((a, b) => b - a).map((edge) => {
  const here = peels.filter(([e]) => e === edge);
  return { edge, n: here.length, alpha: median(here.map((p) => p[1])), v: median(here.map((p) => p[2])), c: median(here.map((p) => p[3])) };
});
console.log(`4. Peel (Hutt, sin α = c / V): median ${fmt(median(wall.map((p) => p[1])))}° on the bank over ${wall.length} stretches; by 20 m stretch: `
  + stretches.map((s) => `${s.edge - 20}…${s.edge} ${fmt(s.alpha)}° (${s.n}; V ${fmt(s.v, 1)}, c ${fmt(s.c, 1)})`).join('; ')
  + `; stretches below 30°: ${stretches.filter((s) => s.n >= 3 && s.alpha < 30).map((s) => `${s.edge - 20}…${s.edge}`).join(', ') || 'none'} (of those with 3 or more)`);
// The bowl's own breaking: its waves whose white starts inside it (its first run's +x end 5 m or more inside its +x end), not
// arriving from the bank; and how far each one's +x end ran up toward the bank (a head-on meeting if it met a bank line).
const own = bowl.filter((w) => w.lines[0][2] <= JOIN - 5);
const upward = own.filter((w) => (w.reached.find(([side]) => side === 1)[1] - w.lines[0][2]) >= 10);
console.log(`5. The bowl: ${bowl.length} waves breaking on it, ${own.length} starting inside it rather than arriving from the bank's line; of those, ${upward.length} ran 10 m or more toward +x (up toward the bank); `
  + `its waves' −x end travelled p50 ${fmt(median(bowl.map((w) => w.lines[0][1] - w.reached.find(([side]) => side === -1)[1])))} m, the +x end p50 ${fmt(median(bowl.map((w) => w.reached.find(([side]) => side === 1)[1] - w.lines[0][2])))} m`);
const take = line.filter((w) => w.takeOffDepth !== null);
const depths = take.map((w) => w.takeOffDepth);
console.log(`Take-off column (x 75 ± 4): ${take.length} of ${line.length} waves break there; start depth p50 ${fmt(median(depths), 2)}, p90 ${fmt(quantile(depths, 0.9), 2)} m; `
  + `most seaward break z p10 ${fmt(quantile(take.map((w) => w.takeOffZ), 0.1), 1)}, p50 ${fmt(median(take.map((w) => w.takeOffZ)), 1)}`);
const faces = runs.flatMap((r) => r.faces ?? []);
const top = (q) => { const v = [...faces].sort((a, b) => b - a); const n = Math.max(1, Math.ceil(v.length * q)); return v.slice(0, n).reduce((a, b) => a + b, 0) / n; };
console.log(`Surf at the start's band (x 75 ± 10): typical ${fmt(top(1 / 3), 2)} m, sets ${fmt(top(1 / 10), 2)} m (${faces.length} waves)`);
