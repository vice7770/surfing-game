/**
 * Crest-angle comparison: reads crest-angle-report runs (`--json`) and sets each against a reference run, the Beach
 * on the square, narrow swell (its spread alone: no ledge, canyon or reef turns its crests). For each watched line it
 * prints the runs' tables and, against the reference's crests on the same line:
 *
 * - spread: the share of a run's crests whose |angle| passes the reference's 90th percentile (10 % if it is as straight);
 * - swing: each 100 s's mean angle, against the reference's largest such mean;
 * - bend: the share whose halves differ (|right − left|) by more than the reference's 90th percentile;
 * - two ways at once: crests whose halves lean opposite ways, each half past the reference's 90th percentile of |half|.
 *
 *   rolldown scripts/crest-angle-compare.ts -o dist/scripts/crest-angle-compare.mjs --format esm --platform node \
 *     && node dist/scripts/crest-angle-compare.mjs --reference beach-after.json beach-before.json beach-after.json ...
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

interface Crest { line: string; t: number; angle: number; residual: number; left?: number; right?: number }
interface Bin { from: number; meanAbs: number; mean?: number; crests: number }
interface Summary { line: string; crests: number; short: number; meanAngle: number; meanAbs: number; maxAbs: number; std: number; firstAbs: number; laterAbs: number; straightness: number; bins: Bin[] }
interface Run { spot: string; seconds: number; config: { directionDegrees: number; spreading: number }; summaries: Summary[]; crests: Crest[] }

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
const f = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const percent = (part: number, whole: number) => (whole ? `${((100 * part) / whole).toFixed(0)} % (${part}/${whole})` : '—');
const halvesOf = (crests: Crest[]) => crests.filter((c) => Number.isFinite(c.left) && Number.isFinite(c.right));
/** Each 100 s's mean angle, from the summary or (older runs) from the crests. */
const binMeans = (run: Run, line: string) => {
  const summary = run.summaries.find((s) => s.line === line)!;
  if (summary.bins.every((b) => b.mean !== undefined)) return summary.bins.map((b) => b.mean!);
  const start = Math.min(...run.crests.map((c) => c.t));
  return summary.bins.map((b) => mean(run.crests.filter((c) => c.line === line && c.t - start >= b.from && c.t - start < b.from + 100).map((c) => c.angle)));
};

for (const line of ['edge', 'take-off']) {
  const mine = reference.crests.filter((c) => c.line === line);
  const halved = halvesOf(mine);
  const angleBand = quantile(mine.map((c) => Math.abs(c.angle)), 0.9);
  const bendBand = quantile(halved.map((c) => Math.abs(c.right! - c.left!)), 0.9);
  const halfBand = quantile(halved.flatMap((c) => [Math.abs(c.left!), Math.abs(c.right!)]), 0.9);
  const swingBand = Math.max(...binMeans(reference, line).filter(Number.isFinite).map(Math.abs));
  console.log(`\n### ${line}\n\nReference ${basename(referenceFile)}: 90th percentiles |angle| ${f(angleBand)}°, |right − left| ${f(bendBand)}°, `
    + `|half| ${f(halfBand)}°; largest |mean angle| in a 100 s ${f(swingBand)}°.\n`);
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
    console.log(`| ${basename(file, '.json')} | ${run.config.directionDegrees}°, s ${run.config.spreading.toFixed(0)} | ${summary.crests} (${summary.short}) `
      + `| ${f(summary.meanAngle)} | ${f(summary.meanAbs)} | ${f(summary.maxAbs)} | ${f(summary.std)} | ${f(summary.firstAbs)} | ${f(summary.laterAbs)} `
      + `| ${summary.bins.map((b) => f(b.meanAbs)).join(' · ')} | ${means.map((m) => f(m)).join(' · ')} | ${f(summary.straightness, 2)} `
      + `| ${halves.length ? `${f(mean(bends))} / ${f(Math.max(...bends))}` : '—'} |`);
    const twoWays = halves.filter((c) => Math.sign(c.left!) !== Math.sign(c.right!) && Math.abs(c.left!) > halfBand && Math.abs(c.right!) > halfBand);
    verdicts.push(`| ${basename(file, '.json')} | ${percent(crests.filter((c) => Math.abs(c.angle) > angleBand).length, crests.length)} `
      + `| ${f(Math.max(...means.filter(Number.isFinite).map(Math.abs)))} | ${halves.length ? percent(bends.filter((b) => b > bendBand).length, halves.length) : '—'} `
      + `| ${halves.length ? `${twoWays.length}${twoWays.length ? ` (at ${twoWays.map((c) => `${f(c.t, 0)} s: ${f(c.left!)}° / ${f(c.right!)}°`).join('; ')})` : ''}` : '—'} |`);
  }
  console.log('\nAgainst the reference:\n');
  console.log('| Run | Past its \\|angle\\| p90 | Largest \\|mean\\| in a 100 s ° | Bend past its p90 | Two ways at once (halves) |');
  console.log('|---|---|---|---|---|');
  for (const verdict of verdicts) console.log(verdict);
}
