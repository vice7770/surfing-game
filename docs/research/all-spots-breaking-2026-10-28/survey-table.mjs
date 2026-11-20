// The survey's tables from spot-probe.ts's JSONs (all-spots-breaking, 2026-10-28):
//   node survey-table.mjs <dir>   (reads <dir>/<spot>-<size>.json for every spot and size there)
import { readFileSync, existsSync } from 'node:fs';
const dir = process.argv[2];
const spots = ['pool', 'beach', 'point', 'reef', 'padang'];
const sizes = ['small', 'medium', 'big'];
const f = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const q = (values, p) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : NaN; };
console.log('| spot | size | field | waves | typical (90th) | longest (90th) | patches | line 2 s in (≥ 40 m) | −x arm ≥ 40 m · end · peel | +x arm ≥ 40 m · end · peel |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
const breaks = [];
for (const spot of spots) for (const size of sizes) {
  const file = `${dir}/${spot}-${size}.json`;
  if (!existsSync(file)) continue;
  const j = JSON.parse(readFileSync(file, 'utf8'));
  for (const [key, v] of Object.entries(j)) {
    if (!v || typeof v !== 'object' || !('typical' in v)) continue;
    const [field, ...rest] = key.split(' ');
    const region = rest.join(' ');
    // The drawn white is the solver's wherever no front or crash gates it (every spot but the Canyon and Padang Padang).
    const solver = j[`solver ${region}`];
    if (field === 'drawn' && JSON.stringify({ ...v, perWave: 0 }) === JSON.stringify({ ...solver, perWave: 0 })) continue;
    const arm = (side) => { const e = v.ends.find((x) => x.side === side); return e ? `${e.reach40}/${v.waves} · ${f(e.reach)} m · ${f(e.peel)}°` : '—'; };
    console.log(`| ${region} | ${size} | ${field} | ${v.waves} | ${f(v.typical)} (${f(v.typical90)}) | ${f(v.longest)} (${f(v.longest90)}) | ${f(100 * v.patches)} % | ${f(v.section)} (${v.sectionClose}) | ${arm(-1)} | ${arm(1)} |`);
  }
  const b = j.firstBreaks;
  const s = (pick, d = 1) => `${f(q(b.map(pick), 0.5), d)} (${f(q(b.map(pick), 0.1), d)}–${f(q(b.map(pick), 0.9), d)})`;
  breaks.push(`| ${spot} | ${size} | ${j.hs.toFixed(2)} m, ${j.tp} s | ${b.length} | ${s((x) => x.depth)} | ${s((x) => x.face, 2)} | ${s((x) => x.steepest, 0)}° | ${s((x) => x.asymmetry, 2)} | ${s((x) => x.xi, 2)} | ${s((x) => x.xiFull, 2)} |`);
}
console.log('\n| spot | size | swell | first breaks | depth, m | face H, m | steepest metre | front / back | ξb along +z | ξb, whole gradient |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const line of breaks) console.log(line);
