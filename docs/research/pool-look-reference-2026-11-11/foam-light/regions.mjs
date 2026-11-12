// The six regions of ruling 25d on one held frame: display value, linear light before the tone map, and the light terms.
// node regions.mjs <out dir> <tag e.g. lip-midday> [prefix of a variant's display still, e.g. p1-] [--json]
// Inputs (from jobs/01-base.js and jobs/02-terms.js): disp-, lin- (LinearToneMapping at exposure 0.25), mask1-/mask0-
// (tube R 255, water R 128, cover in G, blue 1/0 marks the two meshes), t-<term>- (debug terms, linear / 4).
import { png } from '../step12/px.mjs';
import { existsSync } from 'node:fs';
const [dir, tag, variant = '', flag] = process.argv.slice(2);
const L = (n) => png(`${dir}/${n}.png`);
const dec = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const m1 = L(`mask1-${tag}`), m0 = L(`mask0-${tag}`), disp = L(`${variant || 'disp-'}${tag}`), lin = L(`lin-${tag}`);
const T = {}; for (const k of ['out', 'alb', 'dd', 'id', 'sp', 'em', 'geo', 'body', 'dep', 'e1s', 'e1w', 'e2', 'e3', 'e4', 'e4b', 'wall', 'misc', 'thr']) if (existsSync(`${dir}/t-${k}-${tag}.png`)) T[k] = L(`t-${k}-${tag}`);
const { w, h } = m1;
const luma = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
const px = [];
for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
  const a = m1.at(x, y), b = m0.at(x, y); const ours = a[2] - b[2] > 200;
  const kind = !ours ? 'other' : a[0] > 200 ? 'tube' : 'water';
  const g = T.geo.at(x, y).map((v) => v / 255), mi = T.misc.at(x, y).map((v) => v / 255), th = T.thr.at(x, y).map((v) => v / 255);
  px.push({ x, y, kind, ndl: g[0], view: g[1], cover: kind === 'other' ? 0 : a[1] / 255, weight: kind === 'tube' ? mi[1] : 0, sheet: kind === 'tube' ? mi[2] : 0, inner: kind === 'tube' ? th[0] : 0, d: disp.at(x, y) });
}
const sky = px.filter((p) => p.kind === 'other' && p.y < 0.4 * h).sort((p, q) => luma(q.d) - luma(p.d));
const R = {
  cloud: sky.slice(0, Math.max(1, Math.floor(sky.length * 0.05))),
  pile: px.filter((p) => p.kind === 'water' && p.cover > 0.9),
  foamShade: px.filter((p) => p.kind === 'water' && p.cover > 0.9 && p.ndl < 0.45),
  frayTip: px.filter((p) => p.kind === 'tube' && p.cover > 0.9 && p.weight > 0.9),
  lipMid: px.filter((p) => p.kind === 'tube' && p.weight > 0.9 && p.inner < 0.1 && p.cover < 0.05),
  flat: px.filter((p) => p.kind === 'tube' && p.weight < 0.02 && p.inner < 0.02 && p.cover < 0.02 && p.y > 0.8 * h),
  backWall: px.filter((p) => p.kind === 'tube' && p.weight < 0.02 && p.inner > 0.95 && p.cover < 0.02),
};
const mean = (list, f) => { const s = [0, 0, 0]; for (const p of list) { const v = f(p); for (let j = 0; j < 3; j += 1) s[j] += v[j]; } return s.map((v) => v / Math.max(1, list.length)); };
const lin4 = (im) => (p) => im.at(p.x, p.y).map((v) => 4 * dec(v));
const raw4 = (im, k = 4) => (p) => im.at(p.x, p.y).map((v) => (k * v) / 255);
const f2 = (a) => a.map((v) => v.toFixed(2)).join(', ');
// The sky photo is drawn as shot (toneMapped false): its 'linear' is the decoded display value, and the scene light the
// Neutral tone map would need to draw it (inverse of three's NeutralToneMapping at the exposure).
const exposure = 1.05;
function neutralInverse(c) { // c: decoded display (linear sRGB) -> scene light before the exposure
  const peak = Math.max(...c); const d = 0.24; const start = 0.76;
  if (peak < start) return c.map((v) => (v + 0.04) / exposure);
  const p = d * d / (1 - peak) - d + start; // the peak before compression
  return c.map((v) => ((v / peak) * p + 0.04) / exposure); // desaturation ignored (small near white)
}
const res = {};
for (const [name, list] of Object.entries(R)) {
  const r = { n: list.length, display: mean(list, (p) => p.d).map(Math.round), linear: name === 'cloud' ? neutralInverse(mean(list, (p) => p.d.map(dec))) : mean(list, lin4(lin)) };
  if (name !== 'cloud' && list.length) {
    for (const k of ['out', 'alb', 'dd', 'id', 'sp', 'em']) r[k] = mean(list, raw4(T[k]));
    r.body = mean(list, raw4(T.body, 1)); r.geo = mean(list, (p) => [p.ndl, p.view, p.cover]); r.misc = mean(list, (p) => [p.weight, p.sheet, p.inner]);
    if (list[0].kind === 'tube' || name === 'foamShade') { for (const k of ['e1s', 'e1w', 'e2', 'e3', 'e4', 'e4b']) r[k] = mean(list, raw4(T[k])); r.wall = mean(list, raw4(T.wall, 16)); }
    r.kinds = Object.fromEntries(['tube', 'water'].map((k) => [k, list.filter((p) => p.kind === k).length]));
  }
  res[name] = r;
}
if (flag === '--json') console.log(JSON.stringify(res));
else for (const [name, r] of Object.entries(res)) {
  console.log(`${tag} ${name.padEnd(9)} n ${r.n}  display ${r.display.join(', ')}  luma ${luma(r.display).toFixed(0)}  linear ${f2(r.linear)}`);
  if (!r.out) continue;
  console.log(`   out ${f2(r.out)} | alb ${f2(r.alb)} | dirDiff ${f2(r.dd)} | indDiff ${f2(r.id)} | spec ${f2(r.sp)} | emit ${f2(r.em)} | body ${f2(r.body)}`);
  console.log(`   N·L ${r.geo[0].toFixed(2)} view cos ${r.geo[1].toFixed(2)} cover ${r.geo[2].toFixed(2)} | weight ${r.misc[0].toFixed(2)} sheet ${r.misc[1].toFixed(2)} m inner ${r.misc[2].toFixed(2)} | kinds ${JSON.stringify(r.kinds)}`);
  if (r.e1s) console.log(`   back-sky ${f2(r.e1s)} | back-wall ${f2(r.e1w)} | crest-sun ${f2(r.e2)} | sun-through ${f2(r.e3)} | fray-sun ${f2(r.e4)} | fray-back ${f2(r.e4b)} | wall E ${f2(r.wall)}`);
}
