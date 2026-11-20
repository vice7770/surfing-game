// spot-probe.ts's runs pooled over seeds (point-onset, 2026-10-28): node spot-pool.mjs <run.json>[,…]
// Per region and field: waves; per wave its typical and longest line, its share of frames with a patch, its line 2 s in
// (≥ 40 m: closing out at its peak; ≥ 100 m: the whole window at once), each arm's one-line reach from its peak (≥ 40 m)
// and visible peel; and the first breaks' depth, face, steepest metre, front/back and ξb.
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2).flatMap((a) => a.split(',')).filter(Boolean);
const q = (values, p) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : NaN; };
const f = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const pooled = {};
const breaks = [];
for (const file of files) {
  const j = JSON.parse(readFileSync(file, 'utf8'));
  breaks.push(...j.firstBreaks);
  for (const [key, v] of Object.entries(j)) {
    if (!v || typeof v !== 'object' || !('perWave' in v)) continue;
    const entry = (pooled[key] ??= { waves: [], peel: {} });
    entry.waves.push(...v.perWave.filter((w) => w.lines.length >= 4));
    for (const e of v.ends) (entry.peel[e.side] ??= []).push(e.peel);
  }
}
for (const [key, { waves }] of Object.entries(pooled)) {
  const along = (l) => l[1] - l[0];
  const typical = waves.map((w) => q(w.lines.map(along), 0.5));
  const longest = waves.map((w) => Math.max(...w.lines.map(along)));
  const patchy = waves.map((w) => w.lines.filter((l) => l[3] > 0).length / w.lines.length);
  const section = waves.map((w) => (w.lines.length > 8 ? along(w.lines[8]) : NaN)).filter(Number.isFinite);
  const arms = [-1, 1].map((side) => {
    const reach = waves.map((w) => { const r = w.reached.find(([s]) => s === side); return r ? side * (r[1].x - w.peak) : NaN; }).filter(Number.isFinite);
    return reach.length ? `${side > 0 ? '+x' : '−x'} ${reach.filter((v) => v >= 40).length}/${waves.length} past 40 m (end ${f(q(reach, 0.5))} m)` : '';
  }).filter(Boolean);
  console.log(`${key}: ${waves.length} waves; typical ${f(q(typical, 0.5))} m (90th ${f(q(typical, 0.9))}), longest ${f(q(longest, 0.5))} m (90th ${f(q(longest, 0.9))}); patches ${f(100 * q(patchy, 0.5))} % (mean ${f(100 * patchy.reduce((a, b) => a + b, 0) / Math.max(1, patchy.length))} %); `
    + `2 s in ${f(q(section, 0.5))} m, ≥ 40 m ${section.filter((v) => v >= 40).length}/${section.length}, ≥ 100 m ${section.filter((v) => v >= 100).length}; ${arms.join('; ')}`);
}
const s = (pick, d = 1) => `${f(q(breaks.map(pick), 0.5), d)} (${f(q(breaks.map(pick), 0.1), d)}–${f(q(breaks.map(pick), 0.9), d)})`;
console.log(`first breaks ${breaks.length}: depth ${s((b) => b.depth)} m, face ${s((b) => b.face, 2)} m, steepest metre ${s((b) => b.steepest, 0)}°, front/back ${s((b) => b.asymmetry, 2)}, ξb ${s((b) => b.xi, 2)}`);
