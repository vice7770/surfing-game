/**
 * The swept barrel's profile library (Padang Padang, Part B): turns the advisor's Basilisk runs
 * (tools/basilisk, analysed by its metrics.py and library.py) into barrel cases the game loads, and checks
 * each against the published fits. Every run is given each time; the index lists exactly those. Written:
 *
 *   public/barrels/<id>.bin                 each case, as profileFormat encodes it
 *   src/wave/barrel/barrelLibraryIndex.ts   the cases and their assets
 *   docs/research/barrel-cases.md           the validation table and the landmarks' cleanliness
 *
 *   npm run barrels -- --run pad19_a20_L12 --run pad19_a30_L12 --run pad19_a45_L12 --flat 0.1785714
 *
 * --runs names the directory holding the runs (tools/basilisk/runs by default); --flat is the reef flat's
 * depth beyond the slope, in h0 (Padang Padang: 1.25 m over 7 m). --a0 NAME=VALUE sets a run's H0/h0, the key cases
 * blend by, to its crest at the slope's foot over h0 where its own A0 is something else: a periodic train's is its
 * wave height (the advisor's plunge_measure.py runs; their metrics are read in that form too).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { caseFromLibrary, libraryJson } from '../src/wave/barrel/caseFromLibrary';
import { encodeCase } from '../src/wave/barrel/profileFormat';
import type { BarrelCaseEntry } from '../src/wave/barrel/barrelLibrary';

const options = (name: string): string[] =>
  process.argv.flatMap((arg, i) => (arg === `--${name}` && i + 1 < process.argv.length ? [process.argv[i + 1]] : []));
const runs = options('run');
const runsDir = options('runs')[0] ?? 'tools/basilisk/runs';
const flat = Number(options('flat')[0]);
const a0Overrides = new Map(options('a0').map((pair) => {
  const [name, value] = pair.split('=');
  return [name, Number(value)] as const;
}));
if (runs.length === 0 || !Number.isFinite(flat)) {
  console.error('usage: npm run barrels -- --run NAME [--run NAME …] --flat DEPTH_OVER_H0 [--runs DIR]');
  process.exit(1);
}

/** metrics.py's output: the times, and the void and jet at the last output before touchdown (null when none). */
interface Metrics {
  level: number;
  psi0: number;
  t_vertical: number | null;
  t_impact: number | null;
  impact?: { H_I: number; L_O: number | null; W_O: number | null; theta_O: number | null; 'A_O/H2': number | null; 'A_J/H2': number | null; 'W/L': number | null; 'L/W': number | null };
  fits: { 'A_O/H2': number; 'A_J/H2': number; 'W/L': number; theta_O: number };
}

/** plunge_measure.py's output (the advisor's periodic runs): the times, and the tube just before touchdown, in metres. */
interface PeriodicMetrics {
  t_vertical: number;
  t_impact: number;
  pre_touchdown: {
    H_m: number;
    tube_L_m: number;
    tube_W_m: number;
    'L/W': number;
    tilt_deg: number;
    'per H at touchdown': { jet: number; tube: number };
  };
}

/** Pick & Feddersen's fits in ψ0, as metrics.py writes them (round 2's record). */
function fitsFor(psi0: number): Metrics['fits'] {
  return { 'A_O/H2': 5.319 * psi0 - 0.043, 'A_J/H2': 37.072 * psi0 * psi0 - 0.587 * psi0 + 0.02, 'W/L': 1.661 * psi0 + 0.298, theta_O: -5746.4 * psi0 * psi0 + 225.2 * psi0 + 48.4 };
}

/** A run's metrics in metrics.py's form: as written, or from plunge_measure.py's (the height over the trough ahead as H_I). */
function asMetrics(raw: Metrics | PeriodicMetrics, level: number, slope: number, a0: number, h0: number): Metrics {
  if (!('pre_touchdown' in raw)) return raw;
  const pre = raw.pre_touchdown;
  const psi0 = slope / Math.pow(a0, 0.25);
  return {
    level, psi0, t_vertical: raw.t_vertical, t_impact: raw.t_impact,
    impact: {
      H_I: pre.H_m / h0, L_O: pre.tube_L_m / h0, W_O: pre.tube_W_m / h0, theta_O: pre.tilt_deg,
      'A_O/H2': pre['per H at touchdown'].tube, 'A_J/H2': pre['per H at touchdown'].jet, 'W/L': pre.tube_W_m / pre.tube_L_m, 'L/W': pre['L/W'],
    },
    fits: fitsFor(psi0),
  };
}

/** Round 2's tolerance on Pick & Feddersen's fits (round 6 §0): areas ±0.05, the aspect ±0.1, the angle ±5°. */
const TOLERANCE = { area: 0.05, aspect: 0.1, angle: 5 };
/** Mead & Black 2001, as round 2 recorded them: L/W across reefs, and Padang Padang's own (spec, Judging Part B 2). */
const MEAD_BLACK = { low: 1.42, high: 3.43, padangLow: 1.97, padangHigh: 2.14, padangTiltLow: 29, padangTiltHigh: 41 };
/** Mead & Black's L/W against X, the run per unit rise along the wave's path (round 6 §4.3; X's definition inferred in round 2). */
const meadBlackFit = (slope: number) => 0.065 / slope + 0.821;

const fixed = (v: number | null | undefined, digits: number) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits));
const vs = (sim: number | null | undefined, fit: number, tolerance: number, digits: number) =>
  sim === null || sim === undefined ? `— / ${fit.toFixed(digits)}` : `${sim.toFixed(digits)} / ${fit.toFixed(digits)} ${Math.abs(sim - fit) <= tolerance ? '✓' : '✗'}`;

/** The run's wall time, s: timing.log's last line, "# mgp mgu step t dt cells wall". */
function wallSeconds(run: string): number | undefined {
  const path = `${runsDir}/${run}/timing.log`;
  if (!existsSync(path)) return undefined;
  const last = readFileSync(path, 'utf8').trim().split('\n').at(-1)?.trim().split(/\s+/);
  return last && last.length >= 8 ? Number(last[7]) : undefined;
}

mkdirSync('public/barrels', { recursive: true });
const entries: BarrelCaseEntry[] = [];
const rows: string[] = [];
const cleanliness: string[] = [];
const tips: string[] = [];
for (const run of runs) {
  const library = libraryJson(JSON.parse(readFileSync(`${runsDir}/${run}_library.json`, 'utf8')) as Record<string, unknown>);
  const a0 = a0Overrides.get(run);
  if (a0 !== undefined) library.run.A0 = a0;
  const metrics = asMetrics(
    JSON.parse(readFileSync(`${runsDir}/${run}_metrics.json`, 'utf8')) as Metrics | PeriodicMetrics,
    library.run.level, library.run.slope, library.run.A0, library.run.h0_m,
  );
  const id = run.toLowerCase().replaceAll('_', '-');
  const { barrel, refilled } = caseFromLibrary(library, id, flat);
  const asset = `barrels/${id}.bin`;
  const bytes = encodeCase(barrel);
  writeFileSync(`public/${asset}`, bytes);
  entries.push({ id, slope: barrel.slope, nonlinearity: barrel.nonlinearity, flatDepth: barrel.flatDepth, asset });

  const h0 = library.run.h0_m;
  const impact = metrics.impact;
  const fits = metrics.fits;
  const lw = impact?.['L/W'] ?? null;
  const tilt = impact?.theta_O ?? null;
  const kept = barrel.frames.length / 256;
  const wall = wallSeconds(run);
  rows.push([
    id, metrics.level, `1:${(1 / barrel.slope).toFixed(1)}`, barrel.nonlinearity, fixed(metrics.psi0, 4),
    `${fixed(impact?.H_I, 3)} (${fixed(impact ? impact.H_I * h0 : null, 2)} m)`,
    vs(impact?.['A_O/H2'], fits['A_O/H2'], TOLERANCE.area, 3),
    vs(impact?.['A_J/H2'], fits['A_J/H2'], TOLERANCE.area, 3),
    vs(impact?.['W/L'], fits['W/L'], TOLERANCE.aspect, 3),
    vs(tilt, fits.theta_O, TOLERANCE.angle, 1),
    `${fixed(lw, 2)} (${meadBlackFit(barrel.slope).toFixed(2)}) ${lw === null ? '' : lw >= MEAD_BLACK.padangLow && lw <= MEAD_BLACK.padangHigh ? 'Padang ✓' : lw >= MEAD_BLACK.low && lw <= MEAD_BLACK.high ? 'reefs ✓' : '✗'}`,
    `${fixed(impact?.L_O != null ? impact.L_O * h0 : null, 2)} × ${fixed(impact?.W_O != null ? impact.W_O * h0 : null, 2)}`,
    `${fixed(metrics.t_vertical, 3)} / ${fixed(barrel.touchdown, 3)}`,
    `${kept} (${refilled} refilled)`,
    wall === undefined ? '—' : `${(wall / 60).toFixed(0)} min`,
    `${(bytes.length / 1024).toFixed(0)} KB`,
  ].join(' | '));
  // The lip tip over the open time (the contact's lip flow), √(g h0), and its fall, g: a line through its vertical velocity.
  const open = library.frames.slice(0, kept).map((frame, i) => ({ frame, i })).filter(({ frame }) => frame.phase === 'open');
  const velocity = barrel.tipVelocity!;
  const horizontal = open.map(({ i }) => velocity[2 * i]).sort((a, b) => a - b);
  const largest = Math.max(...open.map(({ i }) => Math.hypot(velocity[2 * i], velocity[2 * i + 1])));
  const meanTau = open.reduce((sum, { frame }) => sum + frame.tau, 0) / open.length;
  let stt = 0;
  let stv = 0;
  for (const { frame, i } of open) {
    stt += (frame.tau - meanTau) ** 2;
    stv += (frame.tau - meanTau) * velocity[2 * i + 1];
  }
  tips.push(`| ${id} | ${fixed(horizontal[Math.floor(horizontal.length / 2)], 2)} | ${fixed(largest, 2)} | ${fixed(stt > 0 ? -stv / stt : null, 2)} |`);
  for (const phase of ['pre', 'open', 'post'] as const) {
    const frames = library.frames.filter((frame) => frame.phase === phase);
    const flags = new Map<string, number>();
    for (const frame of frames) for (const flag of frame.flags) flags.set(flag, (flags.get(flag) ?? 0) + 1);
    const listed = [...flags].sort((a, b) => b[1] - a[1]).map(([flag, n]) => `${flag} ${n}`).join(', ');
    const clean = frames.filter((frame) => frame.flags.length === 0 && frame.profile !== null).length;
    cleanliness.push(`| ${id} | ${phase} | ${clean} / ${frames.length} | ${listed || '—'} |`);
  }
}

for (const file of readdirSync('public/barrels')) {
  if (!entries.some((entry) => entry.asset === `barrels/${file}`)) console.warn(`public/barrels/${file} is not in this run's index; delete it if it is stale.`);
}

writeFileSync('src/wave/barrel/barrelLibraryIndex.ts', `// Generated by \`npm run barrels\` — do not edit.
import type { BarrelCaseEntry } from './barrelLibrary';

export const BARREL_CASES: readonly BarrelCaseEntry[] = ${JSON.stringify(entries, null, 2)};
`);

writeFileSync('docs/research/barrel-cases.md', `# Barrel cases

Generated by \`npm run barrels\` (Padang Padang, Part B) from the advisor's Basilisk runs in \`${runsDir}\`: ${runs.join(', ')}; flat at ${flat} h0. What the cases are for and how to add one: [barrel-library.md](barrel-library.md).

## Validation

Each case at the last output before touchdown, simulated / fitted. The fits are Pick & Feddersen's in ψ0 = s/(H0/h0)^¼, as round 2 recorded them (round 6 §2.1) [modelled]; ✓ is inside round 2's tolerance (areas ±${TOLERANCE.area}, W/L ±${TOLERANCE.aspect}, θ ±${TOLERANCE.angle}°). L/W is against Mead & Black's fit at X = 1/s (in brackets), their reefs' ${MEAD_BLACK.low}–${MEAD_BLACK.high} and Padang Padang's own ${MEAD_BLACK.padangLow}–${MEAD_BLACK.padangHigh} [measured, field], with Padang's tilt at ${MEAD_BLACK.padangTiltLow}–${MEAD_BLACK.padangTiltHigh}°. The simulated values are [measured] in the model. Lengths in h0, and in metres at h0 = 7 m.

| Case | Level | Slope along the path | H0/h0 | ψ0 | H_I | A_O/H_I² | A_J/H_I² | W_O/L_O | θ_O (°) | L/W (fit) | Void L × W (m) | t vertical / τ touchdown | Frames kept | Wall | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((row) => `| ${row} |`).join('\n')}

## The lip tip

The tip landmark's velocity over the open time, a local line over ±4 frames (the contact's lip flow; the advisor's ruling 1, 2026-09-30), in √(g h0), and its fall in g (a line through its vertical velocity). The advisor measured padang19s's crest at C = 0.83 √(g h0), its tip at 0.87–0.98 C horizontally and falling at about 0.57 g; Erinin 2023's lips run at 1.1–1.3 C [measured, lab].

| Case | Median horizontal | Largest \\|v\\| | Fall (g) |
|---|---|---|---|
${tips.join('\n')}

## Landmarks

Frames whose landmark checks passed, by phase (round 6 §5.2). The case keeps every frame up to one past touchdown; flagged ones are refilled linearly from their clean neighbours.

| Case | Phase | Clean | Flags |
|---|---|---|---|
${cleanliness.join('\n')}
`);

console.log(`${entries.length} cases: ${entries.map((entry) => entry.id).join(', ')}`);
