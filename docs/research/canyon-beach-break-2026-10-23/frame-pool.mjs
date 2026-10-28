// The frame probe's waves pooled over seeds (canyon-beach-break; the foam field and the reef's distance down its line since
// canyon-reef-sequence): node frame-pool.mjs <frame.json>[,…] [--tips reef=-17,up=-112,down=121]
// Per region and field: waves; per wave its typical (median) and longest line, its share of frames with a patch, its line
// 2 s after it starts (40 m or more: closing out at the peak), and each end's reach from the peak while it travelled as one
// line (40 m or more: the owner's arm). Frames are every 0.25 s while a wave is seen.
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--tips').flatMap((a) => a.split(','));
const tipsArg = args.includes('--tips') ? args[args.indexOf('--tips') + 1] : 'reef=-17,up=-112,down=121';
const tips = Object.fromEntries(tipsArg.split(',').map((p) => p.split('=')).map(([k, v]) => [k, Number(v)]));
const tipOf = (region) => (region === 'reef' ? tips.reef : region === 'peak −x' ? tips.up : tips.down);
const q = (values, f) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(f * v.length))] : NaN; };
const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const pooled = {};
for (const file of files) {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(json)) (pooled[key] ??= []).push(...value.waves.filter((w) => w.frames.length >= 4));
}
for (const [key, waves] of Object.entries(pooled)) {
  const region = key.replace(/^(solver|drawn|foam) /, '');
  const tip = tipOf(region);
  const along = (f) => f[1] - f[0];
  const typical = waves.map((w) => q(w.frames.map(along), 0.5));
  const longest = waves.map((w) => Math.max(...w.frames.map(along)));
  const patchy = waves.map((w) => w.frames.filter((f) => f[3] > 0).length / w.frames.length);
  const section = waves.map((w) => (w.frames.length > 8 ? along(w.frames[8]) : NaN)).filter(Number.isFinite);
  const sides = (region === 'reef' ? [1] : [-1, 1]).map((side) => {
    const reach = waves.map((w) => { const r = w.reached.find(([s]) => s === side); return r ? Math.abs(r[1].x - tip) : NaN; });
    // The reef's line runs at 70° to the shore: its end's distance down the reef, along that line (canyon-reef-sequence).
    const down = region === 'reef' ? reach.map((v) => v / Math.cos((70 * Math.PI) / 180)) : undefined;
    return `${side > 0 ? '+x' : '−x'}: one travelling line ≥ 40 m from the peak in ${reach.filter((v) => v >= 40).length} of ${waves.length}, its end median ${fmt(q(reach, 0.5))} m (90th ${fmt(q(reach, 0.9))})`
      + (down ? `; down the reef's line its end median ${fmt(q(down, 0.5))} m (90th ${fmt(q(down, 0.9))}), ≥ 40 m in ${down.filter((v) => v >= 40).length} of ${waves.length}` : '');
  });
  console.log(`${key}: ${waves.length} waves; typical line p50 ${fmt(q(typical, 0.5))} m (90th ${fmt(q(typical, 0.9))}); longest p50 ${fmt(q(longest, 0.5))} m (90th ${fmt(q(longest, 0.9))}); `
    + `frames with a patch p50 ${fmt(100 * q(patchy, 0.5))} %; line 2 s in p50 ${fmt(q(section, 0.5))} m, ≥ 40 m ${section.filter((v) => v >= 40).length} of ${section.length}; ${sides.join('; ')}`);
}
