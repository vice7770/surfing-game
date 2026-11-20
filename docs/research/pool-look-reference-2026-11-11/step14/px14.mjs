// Step 14 reader. Usage: node px14.mjs <maskdir> <view> <png>...
// Regions come from mask stills of the same frame (mask1-/mask0-/maskU-<view>.png): the tube's own pixels (blue 255 vs 0),
// the streak cover (red) and the inner face's weight (green); maskU red = fract(u / 4 m). "White" = every channel >= 200.
import { png } from '../step12/px.mjs';
const [dir, view, ...files] = process.argv.slice(2);
const m1 = png(`${dir}/mask1-${view}.png`), m0 = png(`${dir}/mask0-${view}.png`), mu = png(`${dir}/maskU-${view}.png`);
const W = m1.w, H = m1.h;
const tube = (x, y) => m1.at(x, y)[2] - m0.at(x, y)[2] > 200;
const cover = (x, y) => m1.at(x, y)[0] / 255, inner = (x, y) => m1.at(x, y)[1] / 255;
const region = { outer: [], crest: [], tip: [], roof: [], rim: [], mid: [] };
import { existsSync } from 'node:fs';
const ms = existsSync(`${dir}/maskS-${view}.png`) ? png(`${dir}/maskS-${view}.png`) : null;
const streakAt = (x, y) => ms ? ms.at(x, y)[0] / 255 : -1;
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  if (!tube(x, y)) continue; const c = cover(x, y), i = inner(x, y);
  if (c <= 0.004) continue;
  if (i < 0.5) { region.outer.push([x, y]); if (c < 0.2) region.crest.push([x, y]); if (c > 0.467) region.tip.push([x, y]); }
  else { region.roof.push([x, y]); if (c > 0.6) region.rim.push([x, y]); }
}
const white = (p) => Math.min(p[0], p[1], p[2]) >= 200;
for (const f of files) {
  const im = png(f); console.log(f.split('/').pop());
  for (const [k, px] of Object.entries(region)) { if (k === 'mid' || !px.length) continue;
    let w = 0, over60 = 0; const s = [0, 0, 0];
    const L = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; let ls = 0, ns = 0, lc = 0, nc = 0, cover = 0, st = [0, 0, 0];
    for (const [x, y] of px) { const p = im.at(x, y); w += white(p) ? 1 : 0; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; over60 += 0;
      const t = streakAt(x, y); if (t > 0.5) { ls += L(p); ns += 1; st = st.map((v, i) => v + p[i]); } else if (t >= 0 && t < 0.05) { lc += L(p); nc += 1; } if (t > 0.5) cover += 1; }
    const extra = ms ? `  | streak>0.5 on ${(100 * cover / px.length).toFixed(1)} %: streak rgb ${ns ? st.map((v) => Math.round(v / ns)).join(',') : '-'} luma ${ns ? (ls / ns).toFixed(0) : '-'} vs clean ${nc ? (lc / nc).toFixed(0) : '-'}` : '';
    console.log(`  ${k.padEnd(5)} ${String(px.length).padStart(6)} px  white ${(100 * w / px.length).toFixed(1)} %  mean rgb ${s.map((v) => Math.round(v / px.length)).join(',')}${extra}`); }
  // F2: along mid-lip (cover nearest 0.3 per column on the outer face), the white runs over the crest's metres.
  const line = [];
  for (let x = 0; x < W; x += 1) { let best, bd = 0.04;
    for (let y = 0; y < H; y += 1) { if (!tube(x, y) || inner(x, y) >= 0.5) continue; const d = Math.abs(cover(x, y) - 0.3); if (d < bd) { bd = d; best = y; } }
    if (best !== undefined) line.push([x, best]); }
  if (line.length < 10) { console.log('  mid-lip line: too few columns', line.length); continue; }
  let u = [], prev; for (const [x, y] of line) { let v = 4 * mu.at(x, y)[0] / 255; if (prev !== undefined) { while (v - prev > 2) v -= 4; while (prev - v > 2) v += 4; } u.push(v); prev = v; }
  const span = Math.abs(u[u.length - 1] - u[0]);
  const runs = []; let on = false, start = 0;
  line.forEach(([x, y], k) => { const w = white(im.at(x, y)); if (w && !on) { start = u[k]; on = true; } if (!w && on) { runs.push([start, u[k]]); on = false; } });
  if (on) runs.push([start, u[u.length - 1]]);
  const centres = runs.map(([a, b]) => (a + b) / 2), gaps = centres.slice(1).map((c, k) => Math.abs(c - centres[k]));
  const mean = gaps.reduce((a, b) => a + b, 0) / Math.max(1, gaps.length), sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, gaps.length));
  if (ms) { const r2 = []; let o2 = false, st2 = 0; line.forEach(([x, y], k) => { const w = streakAt(x, y) > 0.5; if (w && !o2) { st2 = u[k]; o2 = true; } if (!w && o2) { r2.push([st2, u[k]]); o2 = false; } }); if (o2) r2.push([st2, u[u.length - 1]]);
    const c2 = r2.map(([a, b]) => (a + b) / 2), g2 = c2.slice(1).map((c, k) => Math.abs(c - c2[k])); const m2 = g2.reduce((a, b) => a + b, 0) / Math.max(1, g2.length), sd2 = Math.sqrt(g2.reduce((a, b) => a + (b - m2) ** 2, 0) / Math.max(1, g2.length));
    console.log(`  mid-lip pattern (streak>0.5): ${r2.length} runs = ${(r2.length / Math.max(span, 1e-3)).toFixed(2)} /m; gaps mean ${m2.toFixed(2)} m, spread/mean ${(sd2 / Math.max(m2, 1e-6)).toFixed(2)}; widths ${r2.map(([a, b]) => Math.abs(b - a).toFixed(2)).join(' ')}`); }
  console.log(`  mid-lip line: ${line.length} columns over ${span.toFixed(2)} m of crest (${(line.length / Math.max(span, 1e-3)).toFixed(0)} px/m): ${runs.length} white runs = ${(runs.length / Math.max(span, 1e-3)).toFixed(2)} /m; gaps mean ${mean.toFixed(2)} m, spread/mean ${(sd / Math.max(mean, 1e-6)).toFixed(2)}`);
}
