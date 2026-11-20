// The catch probe's runs pooled over seeds, read for the pop-up (popup-moving-face, 2026-10-29):
//   node caught-pool.mjs <run.json>[,<run.json>…] [--scripts good,early,late] [--waves n] [--sets-from <run.json>]
// Per script, the set waves (each run's top third by face at the start) and all waves: rode (standing RIDE_TIME, 3 s, on
// the face ahead of the crest), caught (standing at least 1 s there), fell popping up (popped, fell before standing),
// fell after standing (stood, fell before the 3 s), no cue. `--waves n` keeps each run's first n waves (to compare runs of
// different lengths over the same waves); `--sets-from` takes which waves are sets from another run of the same sea.
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
const option = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const files = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')).flatMap((a) => a.split(','));
const waves = option('waves') === undefined ? Infinity : Number(option('waves'));
const rows = files.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')).starts[0].rows.slice(0, waves));
const setsFrom = option('sets-from');
if (setsFrom) {
  const sets = JSON.parse(readFileSync(setsFrom, 'utf8')).starts[0].rows;
  rows.forEach((row, i) => { row.set = sets[i]?.set ?? false; });
}
const scripts = option('scripts')?.split(',') ?? [...new Set(rows.flatMap((row) => row.riders.map((r) => r.script)))];
console.log('| script | sets: rode / caught (1 s) of n; fell popping up; fell after standing; no cue | all waves: the same |');
console.log('|---|---|---|');
for (const script of scripts) {
  const cells = ['sets', 'all'].map((group) => {
    const list = rows.filter((row) => group === 'all' || row.set).map((row) => row.riders.find((r) => r.script === script)).filter(Boolean);
    const rode = list.filter((r) => r.outcome === 'rode').length;
    const caught = list.filter((r) => (r.riding ?? 0) >= 1).length;
    const popFall = list.filter((r) => r.pop !== undefined && r.stand === undefined && r.fell !== undefined).length;
    const standFall = list.filter((r) => r.stand !== undefined && r.fell !== undefined && r.outcome !== 'rode').length;
    const noCue = list.filter((r) => r.outcome === 'no cue').length;
    return `${rode} / ${caught} of ${list.length}; ${popFall}; ${standFall}; ${noCue}`;
  });
  console.log(`| ${script} | ${cells[0]} | ${cells[1]} |`);
}
