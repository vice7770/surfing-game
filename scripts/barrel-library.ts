/**
 * The swept barrel's profile library (Padang Padang, Part B): turns the advisor's Basilisk runs
 * (tools/basilisk, analysed by its metrics.py and library.py) into barrel cases the game loads, and checks
 * each against the published fits. Every case is named each time; the index lists exactly those. Written:
 *
 *   public/barrels/<id>.bin                 each case, as profileFormat encodes it
 *   src/wave/barrel/barrelLibraryIndex.ts   the cases, their spots and their assets
 *   docs/research/barrel-cases.md           the validation table and the landmarks' cleanliness
 *
 *   npm run barrels -- --run pad19_a20_L12 --run pad19_a30_L12 --run pad19_a45_L12 --flat 0.1785714 --spot padang
 *
 * --runs names the directory holding the runs (tools/basilisk/runs by default). --run NAME converts a run; --keep ID
 * keeps a committed case as it is (its .bin untouched, its rows carried over from barrel-cases.md), for a case whose
 * run is not on this machine. Per case, NAME=VALUE (or one VALUE for every case):
 *   --spot: the spot whose transect it was run on (each spot loads only its own cases; PR 7);
 *   --flat: the flat's depth beyond the slope, in h0 (Padang Padang: 1.25 m over 7 m);
 *   --a0: its H0/h0, the key cases blend by, where its own A0 is something else: a periodic train's is its wave height,
 *     so give its crest at the slope's foot over h0 (the advisor's plunge_measure.py runs; their metrics are read in
 *     that form too).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { SpotName } from '../src/wave/Bathymetry';
import { caseFromLibrary, libraryJson, refitTip, sustainedOverturn } from '../src/wave/barrel/caseFromLibrary';
import type { BarrelCase } from '../src/wave/barrel/ProfileLibrary';
import { decodeCase, encodeCase } from '../src/wave/barrel/profileFormat';
import type { BarrelCaseEntry } from '../src/wave/barrel/barrelLibrary';

const options = (name: string): string[] =>
  process.argv.flatMap((arg, i) => (arg === `--${name}` && i + 1 < process.argv.length ? [process.argv[i + 1]] : []));
/** A per-case option: NAME=VALUE pairs, and one bare VALUE for every case without its own. */
const perCase = (name: string) => {
  const pairs = new Map<string, string>();
  let fallback: string | undefined;
  for (const option of options(name)) {
    const at = option.indexOf('=');
    if (at < 0) fallback = option;
    else pairs.set(option.slice(0, at), option.slice(at + 1));
  }
  return (key: string) => pairs.get(key) ?? fallback;
};
const runs = options('run');
const keeps = options('keep');
const runsDir = options('runs')[0] ?? 'tools/basilisk/runs';
const flatOf = perCase('flat');
const spotOf = perCase('spot');
const a0Of = perCase('a0');
const SPOTS: readonly SpotName[] = ['beach', 'point', 'reef', 'canyon', 'padang'];
const missing = [
  ...runs.filter((run) => !Number.isFinite(Number(flatOf(run)))).map((run) => `${run}: --flat`),
  ...[...runs, ...keeps].filter((name) => !SPOTS.includes(spotOf(name) as SpotName)).map((name) => `${name}: --spot`),
];
if (runs.length + keeps.length === 0 || missing.length > 0) {
  console.error(`usage: npm run barrels -- --run NAME … [--keep ID …] --flat [NAME=]DEPTH_OVER_H0 --spot [NAME=]SPOT [--a0 NAME=A0] [--runs DIR]${missing.length ? `\nmissing: ${missing.join(', ')}` : ''}`);
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
/** Pick & Feddersen's fitted ψ0 span (src/wave/Overturn.ts's PSI_RANGE): past it a fit is extrapolation, so none is shown. */
const PSI_FITTED = { min: 0.0156, max: 0.0889 };
const vs = (sim: number | null | undefined, fit: number | null, tolerance: number, digits: number) =>
  fit === null ? `${sim === null || sim === undefined ? '—' : sim.toFixed(digits)} / — (ψ0 past the fits)`
    : sim === null || sim === undefined ? `— / ${fit.toFixed(digits)}` : `${sim.toFixed(digits)} / ${fit.toFixed(digits)} ${Math.abs(sim - fit) <= tolerance ? '✓' : '✗'}`;

/** The run's wall time, s: timing.log's last line, "# mgp mgu step t dt cells wall". */
function wallSeconds(run: string): number | undefined {
  const path = `${runsDir}/${run}/timing.log`;
  if (!existsSync(path)) return undefined;
  const last = readFileSync(path, 'utf8').trim().split('\n').at(-1)?.trim().split(/\s+/);
  return last && last.length >= 8 ? Number(last[7]) : undefined;
}

/**
 * The tip table's row for a case, over its sustained overturn (the frames its tip velocity is defined on): the median
 * horizontal speed, the largest speed, and its fall, g (a line through its vertical velocity), all in sqrt(g h0).
 */
function tipRow(c: BarrelCase): string {
  const { from, to } = sustainedOverturn(c.frames, c.tauStart, c.tauStep, c.touchdown);
  const velocity = c.tipVelocity!;
  const frames: number[] = [];
  for (let f = from; f <= to; f += 1) frames.push(f);
  if (frames.length === 0) return `| ${c.id} | — | — | — |`;
  const horizontal = frames.map((f) => velocity[2 * f]).sort((a, b) => a - b);
  const largest = Math.max(...frames.map((f) => Math.hypot(velocity[2 * f], velocity[2 * f + 1])));
  const meanFrame = frames.reduce((sum, f) => sum + f, 0) / frames.length;
  let stt = 0;
  let stv = 0;
  for (const f of frames) {
    stt += (f - meanFrame) ** 2;
    stv += (f - meanFrame) * velocity[2 * f + 1];
  }
  const fall = stt > 0 ? -stv / stt / c.tauStep : null;
  return `| ${c.id} | ${fixed(horizontal[Math.floor(horizontal.length / 2)], 2)} | ${fixed(largest, 2)} | ${fixed(fall, 2)} | ${fixed(c.tauStart + from * c.tauStep, 3)} |`;
}

/** The rows barrel-cases.md holds for a case, by section, so a kept case's are carried over unchanged. */
function rowsOf(id: string): { validation?: string; tip?: string; landmarks: string[] } {
  const path = 'docs/research/barrel-cases.md';
  const found: { validation?: string; tip?: string; landmarks: string[] } = { landmarks: [] };
  if (!existsSync(path)) return found;
  let section = '';
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.startsWith('## ')) section = line.slice(3).trim();
    if (!line.startsWith(`| ${id} |`)) continue;
    if (section === 'Validation') found.validation = line.slice(2, -2);
    else if (section === 'The lip tip') found.tip = line;
    else if (section === 'Landmarks') found.landmarks.push(line);
  }
  return found;
}

mkdirSync('public/barrels', { recursive: true });
const entries: BarrelCaseEntry[] = [];
const rows: string[] = [];
const cleanliness: string[] = [];
const tips: string[] = [];
const sources: string[] = [];
for (const name of [...keeps, ...runs]) {
  const spot = spotOf(name) as SpotName;
  if (keeps.includes(name)) {
    // A committed case kept as it is: its index entry from its own header, its rows as barrel-cases.md has them.
    // Its frames as they are; its tip fitted again by the regime rule (the advisor's ruling, PR 7).
    const asset = `barrels/${name}.bin`;
    const barrel = refitTip(decodeCase(new Uint8Array(readFileSync(`public/${asset}`))));
    writeFileSync(`public/${asset}`, encodeCase(barrel));
    entries.push({ id: name, spot, slope: barrel.slope, nonlinearity: barrel.nonlinearity, flatDepth: barrel.flatDepth, asset });
    const carried = rowsOf(name);
    if (!carried.validation) throw new Error(`${name}: kept, but barrel-cases.md has no row for it`);
    rows.push(carried.validation);
    tips.push(tipRow(barrel));
    cleanliness.push(...carried.landmarks);
    sources.push(`${name} (${spot}, kept)`);
    continue;
  }
  const run = name;
  const flat = Number(flatOf(run));
  const library = libraryJson(JSON.parse(readFileSync(`${runsDir}/${run}_library.json`, 'utf8')) as Record<string, unknown>);
  const a0 = a0Of(run);
  if (a0 !== undefined) library.run.A0 = Number(a0);
  const metrics = asMetrics(
    JSON.parse(readFileSync(`${runsDir}/${run}_metrics.json`, 'utf8')) as Metrics | PeriodicMetrics,
    library.run.level, library.run.slope, library.run.A0, library.run.h0_m,
  );
  const id = run.toLowerCase().replaceAll('_', '-');
  const { barrel, refilled } = caseFromLibrary(library, id, flat);
  const asset = `barrels/${id}.bin`;
  const bytes = encodeCase(barrel);
  writeFileSync(`public/${asset}`, bytes);
  entries.push({ id, spot, slope: barrel.slope, nonlinearity: barrel.nonlinearity, flatDepth: barrel.flatDepth, asset });
  sources.push(`${run} (${spot}, flat ${flat} h0)`);

  const h0 = library.run.h0_m;
  const impact = metrics.impact;
  const fitted = metrics.psi0 >= PSI_FITTED.min && metrics.psi0 <= PSI_FITTED.max;
  const fit = (name: keyof Metrics['fits']) => (fitted ? metrics.fits[name] : null);
  const lw = impact?.['L/W'] ?? null;
  const tilt = impact?.theta_O ?? null;
  const kept = barrel.frames.length / 256;
  const wall = wallSeconds(run);
  rows.push([
    id, metrics.level, `1:${(1 / barrel.slope).toFixed(1)}`, barrel.nonlinearity, fixed(metrics.psi0, 4),
    `${fixed(impact?.H_I, 3)} (${fixed(impact ? impact.H_I * h0 : null, 2)} m)`,
    vs(impact?.['A_O/H2'], fit('A_O/H2'), TOLERANCE.area, 3),
    vs(impact?.['A_J/H2'], fit('A_J/H2'), TOLERANCE.area, 3),
    vs(impact?.['W/L'], fit('W/L'), TOLERANCE.aspect, 3),
    vs(tilt, fit('theta_O'), TOLERANCE.angle, 1),
    `${fixed(lw, 2)} (${meadBlackFit(barrel.slope).toFixed(2)}) ${lw === null ? '' : lw >= MEAD_BLACK.padangLow && lw <= MEAD_BLACK.padangHigh ? 'Padang ✓' : lw >= MEAD_BLACK.low && lw <= MEAD_BLACK.high ? 'reefs ✓' : '✗'}`,
    `${fixed(impact?.L_O != null ? impact.L_O * h0 : null, 2)} × ${fixed(impact?.W_O != null ? impact.W_O * h0 : null, 2)}`,
    `${fixed(metrics.t_vertical, 3)} / ${fixed(barrel.touchdown, 3)}`,
    `${kept} (${refilled} refilled)`,
    wall === undefined ? '—' : `${(wall / 60).toFixed(0)} min`,
    `${(bytes.length / 1024).toFixed(0)} KB`,
  ].join(' | '));
  tips.push(tipRow(barrel));
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

const bySpot = SPOTS.map((spot) => [spot, entries.filter((entry) => entry.spot === spot).map((entry) => `\`${entry.id}\``)] as const)
  .filter(([, ids]) => ids.length > 0).map(([spot, ids]) => `- ${spot}: ${ids.join(', ')}`).join('\n');

writeFileSync('docs/research/barrel-cases.md', `# Barrel cases

Generated by \`npm run barrels\` (Padang Padang, Part B) from the advisor's Basilisk runs in \`${runsDir}\`: ${sources.join('; ')}. A kept case's rows are carried over from this file as they were. What the cases are for and how to add one: [barrel-library.md](barrel-library.md).

Each spot loads only its own transect's cases (PR 7):
${bySpot}

## Validation

Each case at the last output before touchdown, simulated / fitted. The fits are Pick & Feddersen's in ψ0 = s/(H0/h0)^¼, as round 2 recorded them (round 6 §2.1) [modelled]; ✓ is inside round 2's tolerance (areas ±${TOLERANCE.area}, W/L ±${TOLERANCE.aspect}, θ ±${TOLERANCE.angle}°); past their fitted ψ0 (${PSI_FITTED.min}–${PSI_FITTED.max}, the Reef's ledge) no fit is shown. L/W is against Mead & Black's fit at X = 1/s (in brackets), their reefs' ${MEAD_BLACK.low}–${MEAD_BLACK.high} and Padang Padang's own ${MEAD_BLACK.padangLow}–${MEAD_BLACK.padangHigh} [measured, field], with Padang's tilt at ${MEAD_BLACK.padangTiltLow}–${MEAD_BLACK.padangTiltHigh}°. The simulated values are [measured] in the model. Lengths in h0, and in metres at the run's own h0 (7 m at Padang Padang, 10 m at the Reef).

| Case | Level | Slope along the path | H0/h0 | ψ0 | H_I | A_O/H_I² | A_J/H_I² | W_O/L_O | θ_O (°) | L/W (fit) | Void L × W (m) | t vertical / τ touchdown | Frames kept | Wall | Size |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((row) => `| ${row} |`).join('\n')}

## The lip tip

The tip landmark's velocity over the sustained overturn, a local line over ±4 frames (the contact's lip flow; the advisor's ruling 1, 2026-09-30), in √(g h0), and its fall in g (a line through its vertical velocity). Only the overturn's clean frames feed a fit, one-sided at its ends, and the velocity is zero before it: the landmark is the face's steepest point until the face overturns for good, so a line across the switch is meaningless (the advisor's ruling, PR 7). The advisor measured padang19s's crest at C = 0.83 √(g h0), its tip at 0.87–0.98 C horizontally and falling at about 0.57 g; Erinin 2023's lips run at 1.1–1.3 C [measured, lab].

| Case | Median horizontal | Largest \\|v\\| | Fall (g) | Overturned from τ |
|---|---|---|---|---|
${tips.join('\n')}

## Landmarks

Frames whose landmark checks passed, by phase (round 6 §5.2). The case keeps every frame up to one past touchdown; flagged ones are refilled linearly from their clean neighbours.

| Case | Phase | Clean | Flags |
|---|---|---|---|
${cleanliness.join('\n')}
`);

console.log(`${entries.length} cases: ${entries.map((entry) => `${entry.id} (${entry.spot})`).join(', ')}`);
