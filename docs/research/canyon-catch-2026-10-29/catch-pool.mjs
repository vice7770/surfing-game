// The catch probe's runs pooled over seeds (canyon-catch, 2026-10-29): node catch-pool.mjs <run.json>[,<run.json>…] [--start <m>]
// Per script, the set waves (each run's top third by face at the start) and all waves: rode; the cue never lit (left
// lying down); fell in the pop-up, before standing; stood but left on the crest (the wave went on); the white water.
// Then, over the rides: the pop's time after the crest passed the start, the face under the board and how far up it.
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--start').flatMap((a) => a.split(','));
const startOption = args.includes('--start') ? Number(args[args.indexOf('--start') + 1]) : undefined;
const rows = [];
for (const file of files) {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  const start = startOption === undefined ? json.starts[0] : json.starts.find((s) => s.out === startOption);
  if (start) rows.push(...start.rows);
}
const scripts = [...new Set(rows.flatMap((row) => row.riders.map((r) => r.script)))];
const med = (values) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : NaN; };
const kind = (r) => (r.outcome === 'rode' ? 'rode' : r.outcome === 'white water' ? 'white' : r.pop === undefined ? 'nocue' : r.stand === undefined ? 'popfall' : 'behind');
console.log('| script | sets: rode / no cue / fell popping up / left on the crest / white water | all waves: the same | rides: pop after the crest passed the start, s; face under the board; up the face |');
console.log('|---|---|---|---|');
for (const script of scripts) {
  const cells = ['sets', 'all'].map((group) => {
    const list = rows.filter((row) => group === 'all' || row.set).map((row) => row.riders.find((r) => r.script === script)).filter(Boolean);
    const c = { rode: 0, nocue: 0, popfall: 0, behind: 0, white: 0 };
    for (const r of list) c[kind(r)] += 1;
    return `${c.rode} of ${list.length} (${Math.round((100 * c.rode) / Math.max(1, list.length))} %) / ${c.nocue} / ${c.popfall} / ${c.behind} / ${c.white}`;
  });
  const rides = rows.map((row) => row.riders.find((r) => r.script === script)).filter((r) => r && r.outcome === 'rode');
  console.log(`| ${script} | ${cells[0]} | ${cells[1]} | ${med(rides.map((r) => r.pop)).toFixed(1)}; ${med(rides.map((r) => r.popSlope)).toFixed(0)}°; ${med(rides.map((r) => r.popFraction)).toFixed(2)} |`);
}
