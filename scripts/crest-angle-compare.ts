/**
 * Crest-angle comparison: reads crest-angle-report runs (`--json`) and sets each against a reference run, the Beach
 * on the square, narrow swell (its spread alone: no ledge, canyon or reef turns its crests). For each watched line it
 * prints the runs' tables and, against the reference's crests on the same line:
 *
 * - tilt: the run's mean angle (a bed that turns every crest the same way tilts them all alike);
 * - spread: the share of a run's crests whose angle lies further from the run's mean than the reference's 90th
 *   percentile of |angle − its mean| (10 % if they are as parallel to each other as the reference's);
 * - swing: each 100 s's mean angle less the run's mean, the largest, against the reference's largest;
 * - bend: the share whose halves differ (|right − left|) by more than the reference's 90th percentile;
 * - two ways at once: crests whose halves lean opposite ways, each half further from 0 than the reference's 90th
 *   percentile of |half|.
 *
 * Every watched line both runs have (the report's `in-25`, `in-50` and `in-75` too, canyon-layout 2026-10-22), then the
 * crest lines (the report's `lines`), band by band against the reference's crest lines in the same band:
 * - p50 / p90 of |angle| at each run's station groups (the open water either side of the Canyon's arm, over it), and the
 *   share past the reference's 90th percentile of |angle| (the reference has 10 % past it);
 * - the edge chevron, 2 |angle| at the edge stations (the edge band's mirror), p50 / p90, against twice the reference's;
 * - two-sided: crests whose mean angles over the window's outer thirds lean opposite ways, each past the reference's
 *   90th percentile of |angle| in that band.
 *
 *   rolldown scripts/crest-angle-compare.ts -o dist/scripts/crest-angle-compare.mjs --format esm --platform node \
 *     && node dist/scripts/crest-angle-compare.mjs --reference beach-after.json beach-before.json beach-after.json ...
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

interface Crest { line: string; t: number; angle: number; residual: number; left?: number; right?: number }
interface Bin { from: number; meanAbs: number; mean?: number; crests: number }
interface Summary { line: string; crests: number; short: number; meanAngle: number; meanAbs: number; maxAbs: number; std: number; firstAbs: number; laterAbs: number; straightness: number; bins: Bin[] }
interface CrestLine { t: number; angles: number[]; zs: number[] }
interface Lines { stations: number[]; groups: string[]; outerThird: number; bands: { takeOffZ: number }; records: CrestLine[] }
interface Run {
  spot: string; seconds: number; config: { directionDegrees: number; spreading: number }; summaries: Summary[]; crests: Crest[]; lines?: Lines;
  health?: { fastest: number; caps: number; capsInWater: number; volumeDrift: number; finite: boolean };
}

const args = process.argv.slice(2);
const referenceIndex = args.indexOf('--reference');
if (referenceIndex < 0) throw new Error('--reference <run.json> is required');
const referenceFile = args[referenceIndex + 1];
const files = args.filter((_, i) => i !== referenceIndex && i !== referenceIndex + 1);
const read = (file: string): Run => JSON.parse(readFileSync(file, 'utf8')) as Run;
const reference = read(referenceFile);

const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : Number.NaN);
const std = (values: number[]) => Math.sqrt(mean(values.map((v) => (v - mean(values)) ** 2)));
const f = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const percent = (part: number, whole: number) => (whole ? `${((100 * part) / whole).toFixed(0)} % (${part}/${whole})` : '—');
const halvesOf = (crests: Crest[]) => crests.filter((c) => Number.isFinite(c.left) && Number.isFinite(c.right));
/** Each 100 s's mean angle (NaN for a run from before the probe kept it: its JSON has no session start to bin by). */
const binMeans = (run: Run, line: string) => run.summaries.find((s) => s.line === line)!.bins.map((b) => b.mean ?? Number.NaN);

const watched = reference.summaries.map((summary) => summary.line).filter((line) => files.every((file) => read(file).summaries.some((s) => s.line === line)));
for (const line of watched) {
  const mine = reference.crests.filter((c) => c.line === line);
  const halved = halvesOf(mine);
  const referenceMean = mean(mine.map((c) => c.angle));
  const spreadBand = quantile(mine.map((c) => Math.abs(c.angle - referenceMean)), 0.9);
  const bendBand = quantile(halved.map((c) => Math.abs(c.right! - c.left!)), 0.9);
  const halfBand = quantile(halved.flatMap((c) => [Math.abs(c.left!), Math.abs(c.right!)]), 0.9);
  const swingOf = (run: Run, runMean: number) => Math.max(...binMeans(run, line).filter(Number.isFinite).map((m) => Math.abs(m - runMean)));
  const swingBand = swingOf(reference, referenceMean);
  console.log(`\n### ${line}\n\nReference ${basename(referenceFile, '.json')}: mean ${f(referenceMean)}°; 90th percentiles |angle − mean| ${f(spreadBand)}°, `
    + `|right − left| ${f(bendBand)}°, |half| ${f(halfBand)}°; largest |100 s mean − mean| ${f(swingBand)}°.\n`);
  console.log('| Run | Swell | Crests (short) | Mean ° | Mean \\|angle\\| ° | Max \\|angle\\| ° | Std ° | First 3 \\|angle\\| ° | Later \\|angle\\| ° '
    + '| \\|angle\\| per 100 s ° | Mean per 100 s ° | Straightness m | Bend mean / max ° |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  const verdicts: string[] = [];
  for (const file of files) {
    const run = read(file);
    const summary = run.summaries.find((s) => s.line === line)!;
    const crests = run.crests.filter((c) => c.line === line);
    const halves = halvesOf(crests);
    const bends = halves.map((c) => Math.abs(c.right! - c.left!));
    const means = binMeans(run, line);
    const runMean = mean(crests.map((c) => c.angle));
    console.log(`| ${basename(file, '.json')} | ${run.config.directionDegrees}°, s ${run.config.spreading.toFixed(0)} | ${summary.crests} (${summary.short}) `
      + `| ${f(summary.meanAngle)} | ${f(summary.meanAbs)} | ${f(summary.maxAbs)} | ${f(summary.std)} | ${f(summary.firstAbs)} | ${f(summary.laterAbs)} `
      + `| ${summary.bins.map((b) => f(b.meanAbs)).join(' · ')} | ${means.map((m) => f(m)).join(' · ')} | ${f(summary.straightness, 2)} `
      + `| ${halves.length ? `${f(mean(bends))} / ${f(Math.max(...bends))}` : '—'} |`);
    const twoWays = halves.filter((c) => Math.sign(c.left!) !== Math.sign(c.right!) && Math.abs(c.left!) > halfBand && Math.abs(c.right!) > halfBand);
    verdicts.push(`| ${basename(file, '.json')} | ${f(runMean)} | ${f(summary.std)} `
      + `| ${percent(crests.filter((c) => Math.abs(c.angle - runMean) > spreadBand).length, crests.length)} | ${f(swingOf(run, runMean))} `
      + `| ${halves.length ? percent(bends.filter((b) => b > bendBand).length, halves.length) : '—'} `
      + `| ${halves.length ? `${twoWays.length}${twoWays.length ? ` (${twoWays.map((c) => `${f(c.t, 0)} s: ${f(c.left!)}° / ${f(c.right!)}°`).join('; ')})` : ''}` : '—'} |`);
  }
  console.log('\nAgainst the reference:\n');
  console.log(`| Run | Tilt (mean) ° | Std ° (reference ${f(std(mine.map((c) => c.angle)))}) | Further from its mean than ${f(spreadBand)}° `
    + `| Largest swing, \\|100 s mean − mean\\| ° (reference ${f(swingBand)}) | Bend past ${f(bendBand)}° | Two ways at once (halves past ±${f(halfBand)}°) |`);
  console.log('|---|---|---|---|---|---|---|');
  for (const verdict of verdicts) console.log(verdict);
}

// The crest lines, band by band (the report's `lines`; see the header).
const BANDS = ['seaward', 'take-off', 'inside', 'inner'] as const;
const bandOf = (lines: Lines, z: number) => (z < lines.bands.takeOffZ - 30 ? 'seaward' : z < lines.bands.takeOffZ ? 'take-off' : z < lines.bands.takeOffZ / 2 ? 'inside' : 'inner');
/** Every |angle| (signed when `signed`) at the stations a filter keeps, each in the band of the crest's z there. */
const stationAngles = (lines: Lines, band: string, keep: (i: number) => boolean, signed = false) => lines.records.flatMap((line) => lines.stations
  .map((_, i) => (keep(i) && Number.isFinite(line.zs[i]) && bandOf(lines, line.zs[i]) === band ? (signed ? line.angles[i] : Math.abs(line.angles[i])) : Number.NaN))
  .filter(Number.isFinite));
const pq = (values: number[]) => `${f(quantile(values, 0.5))} / ${f(quantile(values, 0.9))}`;
if (reference.lines) {
  const ref = reference.lines;
  console.log(`\n### Crest lines by band (|angle| p50 / p90 °; against ${basename(referenceFile, '.json')}'s crest lines in the same band)\n`);
  console.log('| Run | Band | Reference p90 \\|angle\\| ° | Groups: p50 / p90 (past the reference p90) | Edge chevron −x / +x: p50 / p90 (reference 2 × p90) | Outer thirds, signed median −x / +x ° | Two-sided (past the reference p90 both sides) |');
  console.log('|---|---|---|---|---|---|---|');
  for (const file of files) {
    const run = read(file);
    const lines = run.lines;
    if (!lines) continue;
    const groups = [...new Set(lines.groups)];
    const last = lines.stations.length - 1;
    for (const band of BANDS) {
      const band90 = quantile(stationAngles(ref, band, () => true), 0.9);
      const cells = groups.map((g) => {
        const values = stationAngles(lines, band, (i) => lines.groups[i] === g);
        return values.length ? `${g} ${pq(values)} (${percent(values.filter((v) => v > band90).length, values.length)})` : `${g} —`;
      }).join('; ');
      const edge = (i: number) => stationAngles(lines, band, (k) => k === i).map((v) => 2 * v);
      const refEdge = [0, ref.stations.length - 1].flatMap((i) => stationAngles(ref, band, (k) => k === i)).map((v) => 2 * v);
      const signed = (side: -1 | 1) => quantile(stationAngles(lines, band, (i) => side * lines.stations[i] > lines.outerThird, true), 0.5);
      const lean = (line: CrestLine, side: -1 | 1) => {
        const values = lines.stations.flatMap((x, i) => (side * x > lines.outerThird ? [line.angles[i]] : [])).filter(Number.isFinite);
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : Number.NaN;
      };
      const meanZ = (line: CrestLine) => mean(line.zs.filter(Number.isFinite));
      const spanning = lines.records.filter((line) => bandOf(lines, meanZ(line)) === band && Number.isFinite(lean(line, -1)) && Number.isFinite(lean(line, 1)));
      const twoSided = spanning.filter((line) => Math.sign(lean(line, -1)) !== Math.sign(lean(line, 1)) && Math.abs(lean(line, -1)) > band90 && Math.abs(lean(line, 1)) > band90);
      console.log(`| ${basename(file, '.json')} | ${band} | ${f(band90)} | ${cells} | ${pq(edge(0))} · ${pq(edge(last))} (${f(quantile(refEdge, 0.5))} / ${f(quantile(refEdge, 0.9))}) `
        + `| ${f(signed(-1))} / ${f(signed(1))} | ${twoSided.length} of ${spanning.length} |`);
    }
  }
  const healthy = files.map((file) => ({ name: basename(file, '.json'), health: read(file).health })).filter((r) => r.health);
  if (healthy.length) {
    console.log('\n| Run | Fastest water m/s | Froude caps (in water) | Volume % | Finite |');
    console.log('|---|---|---|---|---|');
    for (const { name, health } of healthy) {
      console.log(`| ${name} | ${health!.fastest.toFixed(2)} | ${health!.caps} (${health!.capsInWater}) | ${(100 * health!.volumeDrift).toFixed(2)} | ${health!.finite} |`);
    }
  }
}
