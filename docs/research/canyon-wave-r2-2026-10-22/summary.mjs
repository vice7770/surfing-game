// One line per screen (canyon-wave-r2): the bars, pulled from screen.sh's text. node summary.mjs <file.txt>...
import { readFileSync } from 'node:fs';
const pick = (text, re, k = 1) => (text.match(re) ?? [])[k] ?? '—';
for (const file of process.argv.slice(2)) {
  const t = readFileSync(file, 'utf8');
  const name = file.split('/').pop().replace(/\.txt$/, '');
  const out = [
    `trk ${pick(t, /median angle (\d+)°, median peel/)}°`,
    `fits ${pick(t, /own fits[^;]*; toward \+x \d+; median (\d+)°/)}°`,
    `CO ${pick(t, /\d+ reads; closes out \d+ \((\d+) %\)/)}%`,
    `right ${pick(t, /right \(−x\) (\d+) \(\d+ %\), mixed/)}`,
    `crests ${pick(t, /^crests: (\d+);/m)}`,
    `closeouts(arm) ${pick(t, /off the beach face \(the flanks' shore break left out\): close-outs (\d+)/)}`,
    `upcoast(arm) ${pick(t, /left out\): close-outs \d+; spans[^;]*; upcoast (\d+)/)}`,
    `ride ${pick(t, /duration median ([\d.]+) s, 75th/)} s, ≥10s ${pick(t, /≥ 10 s (\d+ of \d+); peel/)}`,
    `along ${pick(t, /along its breaks median (\d+) m/)} m`,
    `peel ${pick(t, /peel over the ride median (\d+)°/)}°`,
    `faces/peak crest ${pick(t, /at 30 m ([\d.—]+) /)},${pick(t, /60 m ([\d.—]+) \(25/)},${pick(t, /90 m ([\d.—]+) \(25/)}`,
    `sets ${pick(t, /the sets' faces \(top third of the breaks in each bin\): peak ([\d.]+) m/)}: ${pick(t, /30 m ([\d.]+) \(([\d.]+)\), 60/, 2)},${pick(t, /60 m ([\d.]+) \(([\d.]+)\), 90/, 2)},${pick(t, /90 m ([\d.]+) \(([\d.]+)\); breaks/, 2)}`,
    `ξb ${pick(t, /whole arm: ξb median ([\d.]+)/)}`,
    `beach ${pick(t, /by bed part: beach face (\d+)/)}/${pick(t, /^onsets: (\d+);/m)}`,
    `toff90 ${pick(t, /start depth 10 \/ 50 \/ 90 % [\d.]+ \/ [\d.]+ \/ ([\d.]+) m/)}`,
    `fast ${pick(t, /fastest ([\d.]+) m\/s/)}`,
  ];
  console.log(`${name.padEnd(18)} ${out.join(' | ')}`);
}
