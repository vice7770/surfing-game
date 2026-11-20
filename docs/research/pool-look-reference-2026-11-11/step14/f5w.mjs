// F5 in the world: along cover-level lines on the outer face, the streak value against the pixel's own world x (the
// crest runs along x here) in two stills 0.1 s apart, one camera; the x shift that best matches. Also against u.
import { png } from '../step12/px.mjs';
const dir = process.argv[2];
const load = (t) => ({ s: png(`${dir}/f5w-maskS-${t}.png`), m1: png(`${dir}/f5w-mask1-${t}.png`), m0: png(`${dir}/f5w-mask0-${t}.png`) });
const A = load('a'), B = load('b');
const line = (S, level, ch) => { const pts = [];
  for (let x = 0; x < S.s.w; x += 1) { let best, bd = 0.03;
    for (let y = 0; y < S.s.h; y += 1) { if (S.m1.at(x, y)[2] - S.m0.at(x, y)[2] <= 200 || S.m1.at(x, y)[1] >= 128) continue; const d = Math.abs(S.m1.at(x, y)[0] / 255 - level); if (d < bd) { bd = d; best = y; } }
    if (best !== undefined) { const p = S.s.at(x, best); pts.push({ x, w: 4 * p[ch] / 255, v: p[0] / 255 }); } }
  let prev; for (const p of pts) { if (prev !== undefined) { while (p.w - prev > 2) p.w -= 4; while (prev - p.w > 2) p.w += 4; } prev = p.w; }
  return pts; };
for (const [name, ch] of [['world x', 1], ['u', 2]]) for (const level of [0.5, 0.7]) {
  const a = line(A, level, ch), b = line(B, level, ch);
  const ax = new Map(a.map((p) => [p.x, p.w])); const ref = b.find((p) => ax.has(p.x)); if (ref) { const k = Math.round((ax.get(ref.x) - ref.w) / 4); for (const p of b) p.w += 4 * k; }
  const grid = (pts) => { const m = new Map(); for (const p of pts) m.set(Math.round(p.w * 100), p.v); return m; };
  const ga = grid(a), gb = grid(b); const res = [];
  for (let sh = -120; sh <= 120; sh += 1) { let n = 0, d = 0; for (const [k, v] of ga) { const w = gb.get(k + sh); if (w === undefined) continue; n += 1; d += Math.abs(v - w); } if (n > 30) res.push([sh, d / n, n]); }
  res.sort((p, q) => p[1] - q[1]); const zero = res.find((r) => r[0] === 0);
  console.log(`${name}, cover ${level}: best shift ${res[0][0]} cm (|diff| ${res[0][1].toFixed(3)}; at 0 cm ${zero ? zero[1].toFixed(3) : '-'})`);
}
