// Step 15 bar reader (ruling 25b). Usage: node bars15.mjs <dir> <view> <after.png> <off.png> [maskS.png]
// Masks of the same frame, drawn by the shader: mask1-/mask0-<view>.png (blue: the tube's own pixels; red: cover;
// green: inner-face weight), maskU-<view>.png (red fract(u / 4 m), green fract((s - 3 tau) / 4 m)), maskS-<view>.png
// (red: streak foam / 0.85, green: the sheet's thin share), maskP-<view>.png (red: profile point / 128, from 03's
// temporary cover table; regions: outer face 32-64, underside 64-88, back wall 88-112). The change mask: luma by >= 6 levels or saturation by >= 0.06.
import { png } from '../step12/px.mjs';
const [dir, view, afterF, offF, sMask] = process.argv.slice(2);
const m1 = png(`${dir}/mask1-${view}.png`), m0 = png(`${dir}/mask0-${view}.png`), mu = png(`${dir}/maskU-${view}.png`), ms = png(sMask ?? `${dir}/maskS-${view}.png`);
const A = png(afterF), B = png(offF); const W = A.w, H = A.h;
const L = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
const sat = (p) => { const mx = Math.max(...p), mn = Math.min(...p); return mx > 0 ? (mx - mn) / mx : 0; };
const tube = (x, y) => m1.at(x, y)[2] - m0.at(x, y)[2] > 200;
const mp = png(`${dir}/maskP-${view}.png`);
// The profile point from the point mask (red = point / 128), 0 where the slice has not thrown.
const point = (x, y) => 128 * mp.at(x, y)[0] / 255;
const cover = (x, y) => m1.at(x, y)[0] / 255, inner = (x, y) => m1.at(x, y)[1] / 255;
const changed = (x, y) => { const a = A.at(x, y), b = B.at(x, y); return Math.abs(L(a) - L(b)) >= 6 || Math.abs(sat(a) - sat(b)) >= 0.06; };
const reg = { outer: [], crest: [], tip: [], under: [], back: [], thin: [], other: 0, otherDiff: 0 };
for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
  if (!tube(x, y)) { reg.other += 1; const a = A.at(x, y), b = B.at(x, y); if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) reg.otherDiff += 1; continue; }
  const q = point(x, y);
  if (ms.at(x, y)[1] > 0) reg.thin.push([x, y]);
  if (q < 31.9) continue;
  if (q <= 64) { reg.outer.push([x, y]); if (q < 42.67) reg.crest.push([x, y]); if (q > 53.33) reg.tip.push([x, y]); }
  else if (q <= 88) reg.under.push([x, y]); else if (q <= 112) reg.back.push([x, y]);
}
const share = (px) => px.length ? px.filter(([x, y]) => changed(x, y)).length / px.length : NaN;
const pc = (v) => (100 * v).toFixed(1) + ' %';
console.log(`${view}: tube regions px: outer ${reg.outer.length}, crest third ${reg.crest.length}, tip third ${reg.tip.length}, underside ${reg.under.length}, back wall ${reg.back.length}, thin ${reg.thin.length}`);
console.log(`  non-tube pixels differing after vs off: ${reg.otherDiff} of ${reg.other}`);
console.log(`  F1 changed share, outer face: ${pc(share(reg.outer))}`);
const ch = reg.outer.filter(([x, y]) => changed(x, y));
if (ch.length) {
  let sa = 0, sb = 0, la = 0, lb = 0, dark = 0;
  for (const [x, y] of ch) { const a = A.at(x, y), b = B.at(x, y); sa += sat(a); sb += sat(b); la += L(a); lb += L(b); if (L(b) - L(a) > 8) dark += 1; }
  console.log(`  F1n on ${ch.length} changed px: saturation ${(sa / ch.length).toFixed(3)} vs off ${(sb / ch.length).toFixed(3)} (ratio ${(sa / sb).toFixed(2)}); luma ${(la / ch.length).toFixed(1)} vs off ${(lb / ch.length).toFixed(1)}; darker by > 8: ${pc(dark / ch.length)}`);
  const ma = [0, 0, 0], mb = [0, 0, 0]; for (const [x, y] of ch) { const a = A.at(x, y), b = B.at(x, y); for (let k = 0; k < 3; k += 1) { ma[k] += a[k]; mb[k] += b[k]; } }
  console.log(`  changed px mean rgb ${ma.map((v) => Math.round(v / ch.length))} vs off ${mb.map((v) => Math.round(v / ch.length))}`);
}
console.log(`  F3 crest third ${pc(share(reg.crest))}, tip third ${pc(share(reg.tip))}`);
console.log(`  F4 underside (64-88) ${pc(share(reg.under))}, back wall (88+) ${pc(share(reg.back))}`);
{ let d2 = 0, worst = 0; for (const [x, y] of reg.thin) { const d = L(B.at(x, y)) - L(A.at(x, y)); if (d > 2) d2 += 1; worst = Math.max(worst, d); }
  console.log(`  F7 thin sheet: ${d2} of ${reg.thin.length} px darker by > 2 levels (worst ${worst.toFixed(1)})`); }
// F2 pieces: connected pieces of the change mask on the outer face, extents in u and s (circular, 4 m period).
const inOuter = new Uint8Array(W * H); for (const [x, y] of reg.outer) if (changed(x, y)) inOuter[y * W + x] = 1;
const seen = new Uint8Array(W * H); const ratios = [], lens = [], wids = [];
const ext = (vals) => { vals.sort((a, b) => a - b); let gap = vals[0] + 4 - vals[vals.length - 1]; for (let k = 1; k < vals.length; k += 1) gap = Math.max(gap, vals[k] - vals[k - 1]); return 4 - gap; };
for (let k = 0; k < W * H; k += 1) {
  if (!inOuter[k] || seen[k]) continue; const st = [k]; seen[k] = 1; const us = [], ss = [];
  while (st.length) { const q = st.pop(); const x = q % W, y = (q - x) / W; const p = mu.at(x, y); us.push(4 * p[0] / 255); ss.push(4 * p[1] / 255);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (inOuter[n] && !seen[n]) { seen[n] = 1; st.push(n); } } }
  if (us.length < 30) continue;
  const lu = Math.max(ext(us), 0.016), ls = Math.max(ext(ss), 0.016); ratios.push(ls / lu); lens.push(ls); wids.push(lu);
}
const med = (a) => { const b = [...a].sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
console.log(`  F2 pieces (>= 30 px): ${ratios.length}; median length round the curl ${med(lens).toFixed(2)} m, width along the crest ${med(wids).toFixed(2)} m, median ratio ${med(ratios).toFixed(2)}`);
// Mid-lip line: per column the outer-face pixel with cover nearest 0.3; runs of change along it in u.
const line = [];
for (let x = 0; x < W; x += 1) { let best, bd = 0.04; for (let y = 0; y < H; y += 1) { if (!tube(x, y)) continue; const d = Math.abs(point(x, y) - 48) / 16; if (point(x, y) > 31.9 && d < bd) { bd = d; best = y; } } if (best !== undefined) line.push([x, best]); }
if (line.length > 10) {
  const u = []; let prev; for (const [x, y] of line) { let v = 4 * mu.at(x, y)[0] / 255; if (prev !== undefined) { while (v - prev > 2) v -= 4; while (prev - v > 2) v += 4; } u.push(v); prev = v; }
  const span = Math.abs(u[u.length - 1] - u[0]); const runs = []; let on = false, s0 = 0;
  line.forEach(([x, y], k) => { const c = changed(x, y); if (c && !on) { s0 = u[k]; on = true; } if (!c && on) { runs.push([s0, u[k]]); on = false; } }); if (on) runs.push([s0, u[u.length - 1]]);
  const c = runs.map(([a, b]) => (a + b) / 2), g = c.slice(1).map((v, k) => Math.abs(v - c[k])); const mean = g.reduce((a, b) => a + b, 0) / Math.max(1, g.length);
  const sd = Math.sqrt(g.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, g.length));
  console.log(`  F2 mid-lip line: ${line.length} columns over ${span.toFixed(2)} m of crest: ${runs.length} crossings = ${(runs.length / span).toFixed(2)} /m; gaps mean ${mean.toFixed(2)} m, spread/mean ${(sd / Math.max(mean, 1e-6)).toFixed(2)}`);
}
