// Distributions of the analyser's own manoeuvre columns over a population of rides.
// node stats.mjs file1.json [file2.json ...]
import { readFileSync } from 'node:fs';

const DEG = 180 / Math.PI;
const files = process.argv.slice(2);
const rides = [];
for (const f of files) {
  const run = JSON.parse(readFileSync(f, 'utf8'));
  for (const r of run.rides ?? []) rides.push(r);
}

const q = (xs, p) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const show = (label, xs, dp = 2, unit = '') => {
  const ok = xs.filter(Number.isFinite);
  if (!ok.length) return console.log(`  ${label.padEnd(30)} no values`);
  console.log(`  ${label.padEnd(30)} n=${String(ok.length).padStart(3)}  median ${q(ok, 0.5).toFixed(dp)}${unit}`
    + `  range ${Math.min(...ok).toFixed(dp)} … ${Math.max(...ok).toFixed(dp)}${unit}`
    + `  (q1 ${q(ok, 0.25).toFixed(dp)}, q3 ${q(ok, 0.75).toFixed(dp)})`);
};

const all = rides.flatMap((r) => r.report.maneuvers);
const kinds = new Map();
for (const m of all) kinds.set(m.kind, (kinds.get(m.kind) ?? 0) + 1);
const ends = new Map();
for (const r of rides) ends.set(r.report.end, (ends.get(r.report.end) ?? 0) + 1);
const reasons = new Map();
for (const m of all) if (m.unjudged) reasons.set(m.unjudged, (reasons.get(m.unjudged) ?? 0) + 1);

console.log(`POPULATION: ${rides.length} rides from ${files.length} run file(s), ${all.length} runs measured by the analyser`);
console.log(`  ride ends: ${[...ends].map(([k, v]) => `${k} x${v}`).join(', ')}`);
console.log(`  manoeuvre names: ${[...kinds].map(([k, v]) => `${k} x${v}`).join(', ')}`);
if (reasons.size) console.log(`  unjudged reasons: ${[...reasons].map(([k, v]) => `${k} x${v}`).join(', ')}`);
console.log(`  rides with >=1 named bottom turn: ${rides.filter((r) => r.report.maneuvers.some((m) => m.kind === 'bottom turn')).length} of ${rides.length}`);
show('ride duration', rides.map((r) => r.report.duration), 2, ' s');

for (const kind of ['bottom turn', 'top turn', 'snap', 'cutback', 'unjudged']) {
  const of = all.filter((m) => m.kind === kind);
  if (!of.length) continue;
  console.log(`\n${kind.toUpperCase()} — ${of.length} of ${all.length} runs`);
  show('bank (analyser roll)', of.map((m) => Math.abs(m.roll) * DEG), 1, ' deg');
  show('course change (pathYaw)', of.map((m) => Math.abs(m.pathYaw) * DEG), 1, ' deg');
  show('nose yaw (turn.yaw)', of.map((m) => Math.abs(m.yaw) * DEG), 1, ' deg');
  show('climb (carry, mean rise)', of.map((m) => m.carry), 3, ' m');
  show('speed in (ground)', of.map((m) => m.speedIn), 2, ' m/s');
  show('speed out (ground)', of.map((m) => m.speedOut), 2, ' m/s');
  show('speed spent (1-out/in)', of.filter((m) => m.speedIn > 0).map((m) => 100 * (1 - m.speedOut / m.speedIn)), 1, ' %');
  show('throughWater at release', of.map((m) => m.throughWater), 2, ' m/s');
  show('duration', of.map((m) => m.end - m.start), 2, ' s');
  show('face fraction at peak', of.map((m) => m.faceFraction), 2, '');
  show('radius', of.filter((m) => Number.isFinite(m.radius)).map((m) => m.radius), 2, ' m');
  show('lateral g', of.map((m) => m.lateralG), 2, ' g');
  console.log(`  in the pocket: ${of.filter((m) => m.pocket).length} of ${of.length}`);
}
