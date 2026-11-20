import { readFileSync } from 'node:fs';
const ref = { seaward: 6.2, 'take-off': 6.7, inside: 8.9, inner: 8.7 };
for (const file of process.argv.slice(2)) {
  const lines = JSON.parse(readFileSync(file, 'utf8')).lines;
  const bandOf = (z) => (z < lines.bands.takeOffZ - 30 ? 'seaward' : z < lines.bands.takeOffZ ? 'take-off' : z < lines.bands.takeOffZ / 2 ? 'inside' : 'inner');
  const lean = (line, side) => { const v = lines.stations.flatMap((x, i) => (side * x > lines.outerThird ? [line.angles[i]] : [])).filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
  const meanZ = (line) => { const z = line.zs.filter(Number.isFinite); return z.reduce((a, b) => a + b, 0) / z.length; };
  const out = [];
  for (const band of Object.keys(ref)) {
    const spanning = lines.records.filter((l) => bandOf(meanZ(l)) === band && Number.isFinite(lean(l, -1)) && Number.isFinite(lean(l, 1)));
    const two = spanning.filter((l) => Math.sign(lean(l, -1)) !== Math.sign(lean(l, 1)) && Math.abs(lean(l, -1)) > ref[band] && Math.abs(lean(l, 1)) > ref[band]);
    out.push(`${band} ${two.length} of ${spanning.length}`);
  }
  console.log(file, out.join('; '));
}
