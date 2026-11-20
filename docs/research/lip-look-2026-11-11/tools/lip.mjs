import { readFileSync } from 'node:fs';
const ROOT = '/Users/vicentealmeida/Documents/ChatGPT/surfing-game/public/barrels/';
const P = 128, F = 256, G = 9.81;
const L = { crest: 32, lip: 64, throat: 88, toe: 112 };
function decode(id) {
  const bytes = new Uint8Array(readFileSync(ROOT + id + '.bin'));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = view.getUint32(4, true);
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + len)));
  const start = 8 + Math.ceil(len / 4) * 4;
  const floats = new Float32Array(bytes.slice(start).buffer);
  const count = floats.length / (F + 2);
  return { ...meta, frames: floats.slice(0, count * F), count };
}
function frameAt(c, tau) {
  const pos = Math.min(c.count - 1, Math.max(0, (tau - c.tauStart) / c.tauStep));
  const f = Math.floor(pos), n = Math.min(c.count - 1, f + 1), s = pos - f;
  const out = new Float64Array(F);
  for (let i = 0; i < F; i++) out[i] = c.frames[f * F + i] + s * (c.frames[n * F + i] - c.frames[f * F + i]);
  return out;
}
function distToRun(p, i, from, to) {
  const px = p[2 * i], py = p[2 * i + 1]; let best = Infinity;
  for (let k = from; k < to; k++) {
    const ax = p[2 * k], ay = p[2 * k + 1], dx = p[2 * k + 2] - ax, dy = p[2 * k + 3] - ay, l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - ax - t * dx, py - ay - t * dy); if (d < best) best = d;
  }
  return best;
}
function arc(p, a, b) { let s = 0; for (let k = a; k < b; k++) s += Math.hypot(p[2 * k + 2] - p[2 * k], p[2 * k + 3] - p[2 * k + 1]); return s; }
function measure(p) {
  // thickness along the underside (tip->throat): distance from underside point to outer run. Position by share of underside arc from tip.
  const under = arc(p, L.lip, L.throat);
  const outer = arc(p, L.crest, L.lip);
  const th = [];
  let s = 0;
  for (let i = L.lip + 1; i < L.throat; i++) { s += Math.hypot(p[2 * i] - p[2 * i - 2], p[2 * i + 1] - p[2 * i - 1]); th.push([s / (under || 1), distToRun(p, i, L.crest, L.lip)]); }
  const at = (u) => { if (!th.length || under <= 0) return 0; let b = th[0]; for (const e of th) if (Math.abs(e[0] - u) < Math.abs(b[0] - u)) b = e; return b[1]; };
  // jet polygon area: crest..tip..throat closed
  let area = 0;
  for (let i = L.crest; i <= L.throat; i++) { const j = i === L.throat ? L.crest : i + 1; area += p[2 * i] * p[2 * j + 1] - p[2 * j] * p[2 * i + 1]; }
  area = Math.abs(area) / 2;
  // overhang-only area: polygon of the part ahead of the throat's x (water with air under it), approximate: outer pts with x>throatX + underside
  const tx = p[2 * L.throat];
  const poly = [];
  for (let i = L.crest; i <= L.throat; i++) if (p[2 * i] >= tx) poly.push([p[2 * i], p[2 * i + 1]]);
  let over = 0; for (let i = 0; i < poly.length; i++) { const j = (i + 1) % poly.length; over += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1]; }
  over = Math.abs(over) / 2;
  let trough = Infinity; for (let i = L.crest; i < P; i++) trough = Math.min(trough, p[2 * i + 1]);
  let top = -Infinity; for (let i = 0; i < P; i++) top = Math.max(top, p[2 * i + 1]);
  // mean thickness over outer points 40..60 as THROAT does (outer run distance to underside)
  let m = 0; for (let i = 40; i <= 60; i++) m += distToRun(p, i, L.lip, L.throat); m /= 21;
  const root = Math.hypot(p[2 * L.crest] - p[2 * L.throat], p[2 * L.crest + 1] - p[2 * L.throat + 1]);
  return { under, outer, root, tRoot: at(0.9), tMid: at(0.5), tTip: at(0.15), mean4060: m, area, over, H: top - trough, top, trough,
    reach: p[2 * L.lip] - tx, tipY: p[2 * L.lip + 1], tipDrop: top - p[2 * L.lip + 1] };
}
const runs = [
  ['periodic-canyon23-a38-l13', 0.84, 'POOL DEFAULT a38, 1.5 m (foot 0.84)'],
  ['periodic-canyon23-a38-l13', 1.08, 'POOL DEFAULT a38, 1.8 m (foot 1.08)'],
  ['periodic-pool-straight-small-l13', 0.84, 'pool own small, 1.5 m'],
  ['periodic-pool-straight-small-l13', 1.08, 'pool own small (clamped), 1.8 m'],
  ['periodic-pool-straight-big-l13', 1.08, 'pool own big, scaled to foot 1.08 (not what game draws; reference)'],
  ['periodic-reef42-l12', 2.127, 'Reef reef42 at its own size'],
  ['periodic-padang19s-l12', 0.99, 'Padang small'],
  ['pad19-a30-l12', 2.1, 'Padang a30'],
];
const f = (x, d = 3) => x.toFixed(d);
for (const [id, foot, label] of runs) {
  const c = decode(id);
  const h0 = foot / c.nonlinearity, unit = Math.sqrt(h0 / G);
  const td = c.touchdown * unit;
  const H0 = measure(frameAt(c, 0)).H * h0;
  console.log(`\n## ${label}  [${id}] A0 ${c.nonlinearity} h0 ${f(h0,2)} m unit ${f(unit,3)} s; frames ${c.count} step ${f(c.tauStep*unit,3)} s start ${f(c.tauStart*unit,2)} s; touchdown ${f(td,3)} s; H(tau0) ${f(H0,2)} m; breakerHeight ${f(c.breakerHeight*h0,2)} m`);
  console.log('tau_s  under_m formed  root_m  t_root  t_mid   t_tip  mean40-60  (mid/H) (mean/H)  jetArea_m2 (/H^2)  overhang_m2 reach_m tipDrop_m');
  const taus = [-0.2, -0.1, 0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, td - 0.001].filter((t, i, a) => t <= td || i === a.length - 1).sort((a, b) => a - b);
  for (const t of taus) {
    const p = frameAt(c, t / unit); const m = measure(p);
    const formed = Math.min(1, m.under / 0.035);
    console.log(`${f(t,2).padStart(5)}  ${f(m.under*h0)}  ${f(formed,2)}   ${f(m.root*h0)}  ${f(m.tRoot*h0)}  ${f(m.tMid*h0)}  ${f(m.tTip*h0)}  ${f(m.mean4060*h0)}     ${f(m.tMid*h0/H0)}  ${f(m.mean4060*h0/H0)}    ${f(m.area*h0*h0,4)}  ${f(m.area*h0*h0/H0/H0,4)}   ${f(m.over*h0*h0,4)}   ${f(m.reach*h0)}  ${f(m.tipDrop*h0)}`);
  }
}
