// Pools the waves' starts in the take-off's column: the size report's (x0 ± 4 m, each wave's most seaward onset, onsets
// under 0.35 Tp apart one wave) and the transect probes' (the same grouping). node pool.mjs <x0> <takeOffZ> <size.json> <probe.json>...
import { readFileSync } from 'node:fs';
const [x0s, zs, sizeFile, ...probes] = process.argv.slice(2);
const x0 = Number(x0s), takeOffZ = Number(zs);
const group = (onsets, tp) => {
  const out = []; let w;
  for (const o of [...onsets].sort((a, b) => a.t - b.t)) {
    if (w && o.t - w.t1 < 0.35 * tp) { w.t1 = o.t; if (o.z < w.z) w.z = o.z; continue; }
    if (w) out.push(w); w = { t1: o.t, z: o.z };
  }
  if (w) out.push(w); return out;
};
const run = JSON.parse(readFileSync(sizeFile, 'utf8'));
const dz = [];
for (const r of run.records) dz.push(...group(run.onsets.filter((o) => o.seed === r.seed && o.t > r.start && Math.abs(o.x - x0) <= 4), run.tp).map((w) => w.z - takeOffZ));
const nSize = dz.length;
for (const f of probes) { const p = JSON.parse(readFileSync(f, 'utf8')); dz.push(...group(p.onsets, p.tp).map((w) => w.z - p.focus.z)); }
dz.sort((a, b) => a - b);
const q = (p) => dz[Math.min(dz.length - 1, Math.floor(p * dz.length))];
console.log(`pooled ${dz.length} waves (${nSize} size report, ${dz.length - nSize} probe): 10th pct dz ${q(0.1).toFixed(1)} (negative = seaward of the take-off), median ${q(0.5).toFixed(1)}, most seaward ${dz[0].toFixed(1)}`);
for (const s of [0, 3, 4, 5, 6, 8, 11]) console.log(`  start ${s} m out: ${dz.filter((d) => d < -s).length} of ${dz.length} start breaking seaward of it`);
