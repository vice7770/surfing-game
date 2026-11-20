// canyon-c (2026-11-03; revised 2026-11-04 for the advisor's second ruling): the frame probe's runs (`--json`) of one size
// pooled over seeds, against the ruling's bars 1–7. Continuity with both jump limits (the second ruling's §7.3): 6 m a frame,
// the probe's own tracker, and 15 m, the advisor's relaxed rule (offprobe.mjs), recomputed here from each wave's frames, so
// runs from before the revision (the head at ca567450, `?canyonJoin=zone`'s) pool the same way.
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
const SECTION = 1.5;
const JUMP_SECTION = 15;
// Sets: each seed's top third of its waves by their height at the first break.
const line = runs.flatMap((r) => {
  const list = r[`${field} line`];
  const cut = quantile(list.map((w) => w.firstH), 2 / 3);
  return list.map((w) => ({ ...w, seed: r.seed, set: w.firstH >= cut }));
});
const bowl = runs.flatMap((r) => r[`${field} bowl`].map((w) => ({ ...w, seed: r.seed })));
const sets = line.filter((w) => w.set);
// The −x end: the probe's (6 m a frame, stopping when the wave's white is not seen) and the relaxed 15 m rule, from its
// frames ([t, from, to, z, patches]): it holds through unseen frames and stops at the first jump of more than 15 m.
const minusEnd = (w) => w.reached.find(([side]) => side === -1)[1];
const relaxedEnd = (w) => {
  let end = w.lines[0][1];
  for (const [t, from] of w.lines.slice(1)) {
    if (from < end) { if (end - from > JUMP_SECTION && t - w.start > SECTION) break; end = from; }
  }
  return end;
};
const ends = (w) => ({ six: minusEnd(w), fifteen: relaxedEnd(w) });
const travel = (w, key) => w.lines[0][1] - ends(w)[key];
const reaches = (w, key, x) => ends(w)[key] - x <= LINK;
// A cross-check: the revised probe's own 15 m end, where it recorded one.
const recorded = line.filter((w) => w.reached15);
const mismatched = recorded.filter((w) => Math.abs(w.reached15.find(([side]) => side === -1)[1] - relaxedEnd(w)) > 0.05);
const label = runs.map((r) => `${r.bed ?? 'reef'}${r.join && r.join !== 'bed' ? ` join ${r.join}` : ''}`)[0];
console.log(`${runs[0].size} (${label}), seeds ${runs.map((r) => r.seed).join(', ')} × ${runs[0].periods} periods; the ${field}'s white; ${line.length} waves on the line (${sets.length} sets), ${bowl.length} in the bowl`
  + (recorded.length ? `; the probe's own 15 m ends agree with the frames' on ${recorded.length - mismatched.length} of ${recorded.length}` : ''));
const up = line.map((w) => w.up);
// The line's own +x end (one travelling line, as canyon-b's probe follows it), against any white on its crest.
const lineUp = (w) => w.reached.find(([side]) => side === 1)[1] - w.lines[0][2];
console.log(`1. One direction: any white on its crest ≤ 10 m up the line (+x) of the first break on ${pct(line.filter((w) => w.up <= 10).length, line.length)} `
  + `(sets ${pct(sets.filter((w) => w.up <= 10).length, sets.length)}); up the line p50 ${fmt(median(up))} m, p90 ${fmt(quantile(up, 0.9))} m. `
  + `The line's own +x end ≤ 10 m on ${pct(line.filter((w) => lineUp(w) <= 10).length, line.length)} (sets ${pct(sets.filter((w) => lineUp(w) <= 10).length, sets.length)}), p90 ${fmt(quantile(line.map(lineUp), 0.9))} m`);
const xs = sets.map((w) => w.firstX);
console.log(`2. First break: sets x p10/p50/p90 ${fmt(quantile(xs, 0.1))}/${fmt(median(xs))}/${fmt(quantile(xs, 0.9))} (p10–p90 ${fmt(quantile(xs, 0.9) - quantile(xs, 0.1))} m), `
  + `${fmt(-median(sets.map((w) => w.firstZ)))} m out (p10–p90 ${fmt(-quantile(sets.map((w) => w.firstZ), 0.9))}–${fmt(-quantile(sets.map((w) => w.firstZ), 0.1))}); all waves x p10/p50/p90 `
  + `${fmt(quantile(line.map((w) => w.firstX), 0.1))}/${fmt(median(line.map((w) => w.firstX)))}/${fmt(quantile(line.map((w) => w.firstX), 0.9))}; `
  + `Spearman(x*, H) ${fmt(spearman(line.map((w) => w.firstX), line.map((w) => w.firstH)), 2)} (all ${line.length}), per seed ${runs.map((r) => fmt(spearman(r[`${field} line`].map((w) => w.firstX), r[`${field} line`].map((w) => w.firstH)), 2)).join(' / ')}; `
  + `within 10 m of the tip ${pct(line.filter((w) => w.firstX >= TIP - 10).length, line.length)} (sets ${pct(sets.filter((w) => w.firstX >= TIP - 10).length, sets.length)})`);
const both = (list, f) => `${list.filter((w) => f(w, 'six')).length} / ${list.filter((w) => f(w, 'fifteen')).length} of ${list.length} (${list.length ? Math.round((100 * list.filter((w) => f(w, 'six')).length) / list.length) : 0} / ${list.length ? Math.round((100 * list.filter((w) => f(w, 'fifteen')).length) / list.length) : 0} %)`;
console.log(`3. Continuity (6 m / 15 m jump limits): the −x end travelled p50 ${fmt(median(line.map((w) => travel(w, 'six'))))} / ${fmt(median(line.map((w) => travel(w, 'fifteen'))))} m `
  + `(90th ${fmt(quantile(line.map((w) => travel(w, 'six')), 0.9))} / ${fmt(quantile(line.map((w) => travel(w, 'fifteen')), 0.9))}; sets p50 ${fmt(median(sets.map((w) => travel(w, 'six'))))} / ${fmt(median(sets.map((w) => travel(w, 'fifteen'))))}); `
  + `to the join (x ${JOIN}) ${both(line, (w, k) => reaches(w, k, JOIN))}, sets ${both(sets, (w, k) => reaches(w, k, JOIN))}; `
  + `to the bowl's end (x ${BOWL_END}) ${both(line, (w, k) => reaches(w, k, BOWL_END))}, sets ${both(sets, (w, k) => reaches(w, k, BOWL_END))}; `
  + `frames with a patch, median per wave ${fmt(100 * median(line.map((w) => w.patchy)))} % (sets ${fmt(100 * median(sets.map((w) => w.patchy)))} %); `
  + `white per wave: typical p50 ${fmt(median(line.map((w) => w.typical)))} m, longest p50 ${fmt(median(line.map((w) => w.longest)))} m (90th ${fmt(quantile(line.map((w) => w.longest), 0.9))}); sets typical ${fmt(median(sets.map((w) => w.typical)))}, longest ${fmt(median(sets.map((w) => w.longest)))} m`);
function stretchTable(key) {
  const peels = line.flatMap((w) => w[key] ?? []);
  if (!peels.length) return undefined;
  const wall = peels.filter(([edge]) => edge > JOIN && edge - 20 < TIP);
  const stretches = [...new Set(peels.map(([edge]) => edge))].sort((a, b) => b - a).map((edge) => {
    const here = peels.filter(([e]) => e === edge);
    return { edge, n: here.length, alpha: median(here.map((p) => p[1])), v: median(here.map((p) => p[2])), c: median(here.map((p) => p[3])) };
  });
  return `median ${fmt(median(wall.map((p) => p[1])))}° on the bank over ${wall.length} stretches; by 20 m stretch: `
    + stretches.map((s) => `${s.edge - 20}…${s.edge} ${fmt(s.alpha)}° (${s.n}; V ${fmt(s.v, 1)}, c ${fmt(s.c, 1)})`).join('; ')
    + `; stretches below 30°: ${stretches.filter((s) => s.n >= 3 && s.alpha < 30).map((s) => `${s.edge - 20}…${s.edge}`).join(', ') || 'none'} (of those with 3 or more)`;
}
console.log(`4. Peel (Hutt, sin α = c / V), on the 6 m end's path: ${stretchTable('peels')}`);
const fifteen = stretchTable('peels15');
if (fifteen) console.log(`   …on the 15 m end's path: ${fifteen}`);
// The bowl's own breaking: its waves whose white starts inside it (its first run's +x end 5 m or more inside its +x end), not
// arriving from the bank; and how far each one's +x end ran up toward the bank (a head-on meeting if it met a bank line).
const own = bowl.filter((w) => w.lines[0][2] <= JOIN - 5);
const upward = own.filter((w) => (w.reached.find(([side]) => side === 1)[1] - w.lines[0][2]) >= 10);
console.log(`5. The bowl: ${bowl.length} waves breaking on it, ${own.length} starting inside it rather than arriving from the bank's line; of those, ${upward.length} ran 10 m or more toward +x (up toward the bank); `
  + `its waves' −x end travelled p50 ${fmt(median(bowl.map((w) => w.lines[0][1] - w.reached.find(([side]) => side === -1)[1])))} m, the +x end p50 ${fmt(median(bowl.map((w) => w.reached.find(([side]) => side === 1)[1] - w.lines[0][2])))} m`);
// Bar 6: the onsets on the bank's face (seaward of its edge line) and the bowl's, one by one where the probe kept them.
const raw = runs.flatMap((r) => r.onsets ?? []);
const insideCount = runs.reduce((sum, r) => sum + Object.entries(r.inside ?? {}).filter(([bin]) => Number(bin) >= JOIN - 10).reduce((s, [, n]) => s + n, 0), 0);
const shapeOf = (list, name) => `${name}: ${list.length} onsets, face p50 ${fmt(median(list.map((o) => o[3])))}° (p10 ${fmt(quantile(list.map((o) => o[3]), 0.1))}, p90 ${fmt(quantile(list.map((o) => o[3]), 0.9))}), `
  + `ξb p50 ${fmt(median(list.map((o) => o[4])), 2)} (p10–p90 ${fmt(quantile(list.map((o) => o[4]), 0.1), 2)}–${fmt(quantile(list.map((o) => o[4]), 0.9), 2)}), depth p50 ${fmt(median(list.map((o) => o[1])), 2)} m, H p50 ${fmt(median(list.map((o) => o[2])), 2)} m`;
if (raw.length) {
  const face = raw.filter((o) => o[0] > JOIN && o[0] <= TIP);
  const byStretch = [];
  for (let edge = TIP; edge > JOIN; edge -= 20) {
    const here = face.filter((o) => o[0] <= edge && o[0] > edge - 20);
    if (here.length) byStretch.push(`${edge - 20}…${edge} ${fmt(median(here.map((o) => o[3])))}° / ${fmt(median(here.map((o) => o[4])), 2)} (${here.length})`);
  }
  console.log(`6. Onsets (the solver's, each column's new wave): ${shapeOf(face, 'the bank\'s face (x −22…140)')}; ${insideCount} more inside its edge (counted, not shaped); `
    + `${shapeOf(raw.filter((o) => o[0] > BOWL_END && o[0] <= JOIN), 'the bowl (x −55…−22)')}; face° / ξb by 20 m stretch: ${byStretch.join('; ')}`);
} else {
  // Runs from before the revision kept only each 10 m bin's medians: their count-weighted mean, an approximation.
  const bins = runs.flatMap((r) => Object.entries(r.bins ?? {}).map(([bin, b]) => ({ x: Number(bin), ...b })));
  const face = bins.filter((b) => b.x >= JOIN && b.x < TIP);
  const weighted = (list, key) => list.reduce((s, b) => s + b.n * b[key], 0) / Math.max(1, list.reduce((s, b) => s + b.n, 0));
  console.log(`6. Onsets (≈, the 10 m bins' medians weighted by count): the bank's face (x −20…140) ${face.reduce((s, b) => s + b.n, 0)} onsets, face ≈ ${fmt(weighted(face, 'face'))}°, ξb ≈ ${fmt(weighted(face, 'xi'), 2)}; `
    + `the bowl (x −60…−20) face ≈ ${fmt(weighted(bins.filter((b) => b.x >= -60 && b.x < JOIN), 'face'))}°, ξb ≈ ${fmt(weighted(bins.filter((b) => b.x >= -60 && b.x < JOIN), 'xi'), 2)}`);
}
const take = line.filter((w) => w.takeOffDepth !== null);
const depths = take.map((w) => w.takeOffDepth);
const setTake = take.filter((w) => w.set);
console.log(`7. Take-off column (x 75 ± 4): ${take.length} of ${line.length} waves break there (sets ${setTake.length} of ${sets.length}); start depth p10/p50/p90 ${fmt(quantile(depths, 0.1), 2)}/${fmt(median(depths), 2)}/${fmt(quantile(depths, 0.9), 2)} m `
  + `(sets ${fmt(quantile(setTake.map((w) => w.takeOffDepth), 0.1), 2)}/${fmt(median(setTake.map((w) => w.takeOffDepth)), 2)}/${fmt(quantile(setTake.map((w) => w.takeOffDepth), 0.9), 2)}); `
  + `most seaward break z p10 ${fmt(quantile(take.map((w) => w.takeOffZ), 0.1), 1)}, p50 ${fmt(median(take.map((w) => w.takeOffZ)), 1)} (sets p10 ${fmt(quantile(setTake.map((w) => w.takeOffZ), 0.1), 1)}, p50 ${fmt(median(setTake.map((w) => w.takeOffZ)), 1)})`);
const faces = runs.flatMap((r) => r.faces ?? []);
const top = (q) => { const v = [...faces].sort((a, b) => b - a); const n = Math.max(1, Math.ceil(v.length * q)); return v.slice(0, n).reduce((a, b) => a + b, 0) / n; };
console.log(`Surf at the start's band (x 75 ± 10): typical ${fmt(top(1 / 3), 2)} m, sets ${fmt(top(1 / 10), 2)} m (${faces.length} waves)`);
