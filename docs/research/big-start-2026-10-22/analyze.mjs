// Pools transect-probe runs of one size: per point along the take-off column, the waves passing (zero up-crossings of η
// about its mean), each one's steepest front slope (1 m baseline) as its front passes, at the point and within ±3 m;
// the top third by height; where the waves start breaking in the column (each wave's most seaward onset, x ± 4 m).
// Run: node analyze.mjs <threshold deg> <run.json>...
import { readFileSync } from 'node:fs';

const [thresholdText, ...files] = process.argv.slice(2);
const threshold = Number(thresholdText);
const runs = files.map((file) => JSON.parse(readFileSync(file, 'utf8')));
const deg = (s) => (Math.atan(s) * 180) / Math.PI;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : Number.NaN; };
const quantile = (xs, q) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : Number.NaN; };

function wavesAt(run, k) {
  const { rows, tp, times } = run;
  const dt = times[1] - times[0];
  const e = rows.map((r) => r[k]);
  const mean = e.reduce((a, b) => a + b, 0) / e.length;
  const up = [];
  for (let i = 1; i < e.length; i += 1) if (e[i - 1] < mean && e[i] >= mean) up.push(i);
  const slopeAt = (i, j) => (j >= 1 && j + 1 < rows[i].length ? rows[i][j - 1] - rows[i][j + 1] : 0);
  const out = [];
  for (let w = 0; w + 1 < up.length; w += 1) {
    const a = up[w];
    const b = up[w + 1];
    let hi = -Infinity; let lo = Infinity; let iHi = a;
    for (let i = a; i < b; i += 1) { if (e[i] > hi) { hi = e[i]; iHi = i; } lo = Math.min(lo, e[i]); }
    let slope = 0; let near = 0;
    for (let i = Math.max(0, a - Math.round(tp / (2 * dt))); i <= iHi; i += 1) {
      slope = Math.max(slope, slopeAt(i, k));
      for (let j = k - 6; j <= k + 6; j += 1) near = Math.max(near, slopeAt(i, j));
    }
    out.push({ seed: run.seed, t: times[iHi], H: hi - lo, slope, near });
  }
  return out;
}

function topThird(list) {
  const sorted = [...list].sort((a, b) => b.H - a.H);
  return sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
}

function breaks(run) {
  const onsets = [...run.onsets].sort((a, b) => a.t - b.t);
  const groups = [];
  for (const o of onsets) {
    const last = groups[groups.length - 1];
    if (last && o.t - last.t1 < 0.35 * run.tp) { last.t1 = o.t; if (o.z < last.z) { last.z = o.z; last.depth = o.depth; } } else groups.push({ t0: o.t, t1: o.t, z: o.z, depth: o.depth });
  }
  return groups.map((g) => ({ ...g, dz: g.z - run.focus.z }));
}

const run0 = runs[0];
const ks = run0.zs.map((dz, k) => ({ dz, k })).filter(({ dz }) => Number.isInteger(dz) && dz >= -30 && dz <= 40);
console.log(`Canyon Hs ${run0.hs} Tp ${run0.tp}, seeds ${runs.map((r) => r.seed).join(', ')}; ${runs.map((r) => r.periods).join('/')} periods; take-off (${run0.focus.x}, ${run0.focus.z.toFixed(1)})`);
console.log('dz  depth | pooled: n  medH  top3H  top3 slope  top3 ±3m  steepest ±3m | per seed top3 slope (±3 m)');
const rows = [];
for (const { dz, k } of ks) {
  const per = runs.map((run) => wavesAt(run, k));
  const pooled = per.flat();
  const third = topThird(pooled);
  const r = {
    dz, depth: run0.depths[k], n: pooled.length, medH: median(pooled.map((w) => w.H)), top3H: median(third.map((w) => w.H)),
    top3: deg(median(third.map((w) => w.slope))), top3near: deg(median(third.map((w) => w.near))), steepest: deg(Math.max(...pooled.map((w) => w.near))),
    seeds: per.map((list) => { const t = topThird(list); return `${deg(median(t.map((w) => w.slope))).toFixed(0)} (${deg(median(t.map((w) => w.near))).toFixed(0)})`; }),
  };
  rows.push(r);
  if (dz % 2 === 0 || dz === -11) {
    console.log(`${String(dz).padStart(3)} ${r.depth.toFixed(2)} | ${String(r.n).padStart(3)} ${r.medH.toFixed(2)} ${r.top3H.toFixed(2)}  ${r.top3.toFixed(1).padStart(5)}°  ${r.top3near.toFixed(1).padStart(5)}°  ${r.steepest.toFixed(0).padStart(3)}° | ${r.seeds.join('  ')}`);
  }
}
const first = rows.find((r) => r.top3 >= threshold);
const firstNear = rows.find((r) => r.top3near >= threshold);
console.log(`top-third slope first reaches ${threshold}° at dz ${first ? first.dz : 'never'} (point), ${firstNear ? firstNear.dz : 'never'} (±3 m)`);
for (const run of runs) {
  const per = rows.map((r) => ({ dz: r.dz, s: deg(median(topThird(wavesAt(run, run.zs.indexOf(r.dz))).map((w) => w.slope))) }));
  const f = per.find((p) => p.s >= threshold);
  console.log(`  seed ${run.seed}: first ${threshold}° at dz ${f ? f.dz : 'never'}`);
}
const groups = runs.flatMap((run) => breaks(run).map((g) => ({ ...g, seed: run.seed })));
const dzs = groups.map((g) => g.dz);
console.log(`breaking in the column: ${groups.length} waves; onset dz median ${median(dzs).toFixed(1)} (depth ${median(groups.map((g) => g.depth)).toFixed(2)} m), `
  + `10th pct ${quantile(dzs, 0.1).toFixed(1)} (depth ${quantile(groups.map((g) => g.depth), 0.9).toFixed(2)} m), most seaward ${Math.min(...dzs).toFixed(1)}`);
for (const start of [-11, -9, -6, -3, 0, 3]) {
  const seaward = groups.filter((g) => g.dz < start).length;
  const within10 = groups.filter((g) => g.dz >= start && g.dz < start + 10).length;
  console.log(`  start dz ${start}: ${seaward} of ${groups.length} waves start breaking seaward of it, ${within10} within 10 m inside it`);
}
console.log(`onsets (seed: dz): ${groups.map((g) => `${g.seed}:${g.dz.toFixed(0)}`).join(' ')}`);
