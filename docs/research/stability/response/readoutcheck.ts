/** 3.6d amendment 2: the Prony read-out checked on synthetic rings and on the model's closed loop against closedLoop's eigenvalues (results/readout-check.txt). */
import { DEFAULT_WEIGHTS, closedLoop, scheduledDesign } from '../../../../src/physics/predictiveBalance';
import { eigenvalues } from '../../../../src/physics/rollModel';
import { modelClosed, prony, ring, OI, H } from './responseLib';
const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, plantFloor: 6 };
// synthetic
for (const [f, z] of [[2.67, 0.05], [2.67, 0.15], [3.5, 0.3]]) {
  const w = 2 * Math.PI * f, sg = z * w / Math.sqrt(1 - z * z);
  const x = Array.from({ length: H + 1 }, (_, m) => (m === 0 ? 0 : Math.exp(-sg * m / 60) * Math.cos(w * m / 60 + 0.4) + 2 * Math.exp(-1.5 * m / 60) - 1.5 * Math.exp(-6 * m / 60) + 1e-10 * Math.sin(m * 7.3)));
  const rg = ring(x);
  console.log('synthetic', f, z, '->', rg && [rg.f.toFixed(3), rg.zeta.toFixed(3), rg.share.toFixed(3)]);
}
for (const [v, dep] of [[7, 0.3], [7, 0], [6, 0.3], [8, 0.3], [7, 0.45]]) {
  const d = scheduledDesign(v, dep, 0, weights);
  const M = closedLoop(d.phi, d.gamma, d.steps, d);
  const ev = eigenvalues(M, { balance: true, maxIterations: 400 });
  const band = ev.map((q) => { const r = Math.hypot(q.re, q.im); const re = Math.log(r) * 60, im = Math.atan2(q.im, q.re) * 60; return { f: im / (2 * Math.PI), zeta: -re / Math.hypot(re, im) }; }).filter((m) => m.f >= 1.5 && m.f <= 5);
  const out = [0, 1].map((ch) => { const resp = modelClosed(d, ch as 0 | 1); const om = resp.map((q) => q[OI.Om]); const rg = ring(om); const y0 = ring(resp.map((q) => q[0])); return { om: rg && [+rg.f.toFixed(2), +rg.zeta.toFixed(3), +rg.share.toFixed(3)], bank: y0 && [+y0.f.toFixed(2), +y0.zeta.toFixed(3), +y0.share.toFixed(3)] }; });
  console.log(JSON.stringify({ v, dep, eigInBand: band.map((m) => [+m.f.toFixed(2), +m.zeta.toFixed(3)]), out }));
}
