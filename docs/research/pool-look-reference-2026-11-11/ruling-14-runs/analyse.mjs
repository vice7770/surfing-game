import { readFileSync } from 'node:fs';
const d = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const T = Number(process.argv[3] ?? 10.5);
const q = (v, p) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN; };
// the meter: group band onsets into waves as SurfMeter does
const mw = d.meterWaves.sort((a, b) => a.t - b.t);
const waves = [];
for (const w of mw) { const last = waves.at(-1); if (last && w.t - last.t0 < 0.5 * T) { last.all.push(w); if (w.face > last.best.face) last.best = w; } else waves.push({ t0: w.t, best: w, all: [w] }); }
console.log('take-off', d.takeOffAt, 'band onsets', mw.length, 'waves', waves.length);
for (const w of waves) console.log(`t ${w.t0.toFixed(1)} n ${w.all.length} best face ${w.best.face.toFixed(2)} at depth ${w.best.depth.toFixed(2)} crest ${w.best.crest.toFixed(2)} x ${w.best.x.toFixed(0)} z ${w.best.z.toFixed(0)} | median face ${q(w.all.map(v => v.face), 0.5).toFixed(2)} median depth ${q(w.all.map(v => v.depth), 0.5).toFixed(2)} faces>2.2: ${w.all.filter(v => v.face > 2.2).length} deep(>2.6): ${w.all.filter(v => v.depth > 2.6).length}`);
const best = waves.map(w => w.best.face).sort((a, b) => b - a); const n3 = Math.max(1, Math.ceil(best.length / 3));
console.log('H1/3 of best', (best.slice(0, n3).reduce((a, b) => a + b, 0) / n3).toFixed(2), 'median of best', q(best, 0.5).toFixed(2), 'median of all band onsets', q(mw.map(v => v.face), 0.5).toFixed(2), 'median crest', q(mw.map(v => v.crest), 0.5).toFixed(2), 'so trough', (q(mw.map(v => v.crest), 0.5) - q(mw.map(v => v.face), 0.5)).toFixed(2));
// the probe's onsets: repeats per column within a wave
const byCol = new Map();
for (const o of d.onsets) { if (o.u < 40 || o.u >= 110) continue; const k = Math.round(o.x); if (!byCol.has(k)) byCol.set(k, []); byCol.get(k).push(o); }
let first = 0, repeat = 0; const gaps = []; const repDepth = []; const firstDepth = []; const dz = [];
for (const list of byCol.values()) { list.sort((a, b) => a.t - b.t); let last; for (const o of list) { if (last && o.t - last.t < 0.6 * T) { repeat += 1; gaps.push(o.t - last.t); repDepth.push(o.depth); dz.push(o.z - last.z); } else { first += 1; firstDepth.push(o.depth); last = o; } } }
console.log(`probe onsets u 40-110: firsts ${first}, repeats ${repeat}; gap median ${q(gaps, 0.5).toFixed(2)} s (10th ${q(gaps, 0.1).toFixed(2)}, 90th ${q(gaps, 0.9).toFixed(2)}); first depth ${q(firstDepth, 0.5).toFixed(2)}, repeat depth ${q(repDepth, 0.5).toFixed(2)} (10th ${q(repDepth, 0.1).toFixed(2)}, 90th ${q(repDepth, 0.9).toFixed(2)}); repeat z minus first z median ${q(dz, 0.5).toFixed(1)} m (10th ${q(dz, 0.1).toFixed(1)}, 90th ${q(dz, 0.9).toFixed(1)})`);
const j = d.jets.filter(v => v.u >= 40 && v.u < 90); console.log('jets u 40-90', j.length, 'firsts u 40-90', [...byCol.entries()].filter(([k]) => true).length);
