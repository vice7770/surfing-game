/**
 * **Step 3.4d: the mount.** Step 3.4c's step-four item 1 — *"the glide's first second — 6–11× there, 1.0–2.4× after,
 * same runs, nothing explains it; it sits exactly where the owner says 'gets on the board'. Instrument the placement,
 * not the plant."*
 *
 * Read-only. It reads the two `.jsonl` dumps `3.3/plant.ts` writes (`TICKS=` per control tick, `MOUNT=` per FRAME
 * from frame 1) and imports **nothing** from `src/`, so no number here can move the game.
 *
 * ## The instruments, and what each one is an identity of
 *
 * **1. The age profile split EXACTLY into its two halves.** The profile six rounds have quoted is
 * `gm_i |rollRel|`, and `rollRel = (m − g)/|g|`. A geometric mean is multiplicative, so
 *
 *     gm_i(|m − g| / |g|)  ≡  gm_i(|m − g|) / gm_i(|g|)
 *
 * **identically** — the profile IS the product of a numerator profile (how wrong the model is, °/s²) and a
 * denominator profile (how loud the game's own roll row is). §1 prints both and the closure of the identity, so
 * "the model is wrong early" and "the game is quiet early" are never again one number. This is the read that says
 * which of the two the first second is.
 *
 * **2. The window every published figure in this folder excludes.** `3.3/plant.ts`'s own `live` filter is
 * `t > 0.2 && clamped === 0` — *"the placement's contact transient"* — so **no number in 3.3k…3.4c contains the
 * mount's first twelve frames.** 3.4d's dump carries every tick with a `live` column, so the 0–0.2 s window is
 * reported beside 3.4c's own population, and filtering on `live === 1` reproduces 3.4c's dump row for row.
 *
 * **3. The phantom heel, as one exact column of the plant.** Every one of the twelve captive derivatives was
 * measured per radian of the board's heel **against a flat free surface** [R], and the model is fed `φ`, the roll
 * from the **world's** level [R]. So on a face the model reads the face's own tilt as heel. The size of that is
 * exactly `rollAccFull − rollAccTilt`, the difference between the plant and step 3.3p's tilt plant, whose extra
 * input column is `heelColumn` imported from `predictiveBalance` — the probe's own columns, not a reimplementation.
 * Printed per age beside the model's own water term, the net error and the game's whole row, and with the share of
 * ticks on which **removing** it brings the row closer (it mostly does not: the row is a cancellation).
 *
 * **4. The two-way reads, which are how a mechanism is tested rather than asserted.** The relative error, the
 * model's row and the game's row over (the ride's age) × (the phantom's share of the heel the model reads,
 * `|tilt|/|roll|`) and × (the board's own roll). If the first second were the phantom's share, conditioning on it
 * would flatten the age profile. **It does not** — §4 is the read that refutes this round's own first hypothesis,
 * and it is printed in full rather than described.
 *
 * **5. The mount's own frames.** Per frame from frame 1, pooled over the arm's runs: when the predictor's filter
 * starts (it cannot run until its sense line is longer than the delay), whether the command is **exactly** zero,
 * the estimate it holds against the state the game is in, the reference it is holding, the felt vertical the body's
 * balance is read from (`pairFresh` sets it to the WORLD's gravity on the first loaded substep and low-passes it
 * over `SPECIFIC_FORCE_TIME = 0.1 s` [R]), and the geometry. With three settling reads: the time the felt vertical
 * first comes within a degree of the face's normal, the time the board's own heel first exceeds the face's tilt,
 * and the first frame at which the loop sends anything at all.
 *
 * **6. The mount's own positive control.** `PLACE=level` against `PLACE=flush` (the shipped placement): the same
 * water, heading, entry speed and rider, with the board's up axis the world's vertical instead of the water's
 * normal. Every column of §1–§3 on both, side by side.
 *
 * Run from the repository's root, after the arms:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/mount.ts -o <scratch>/mt.mjs --format esm --platform node
 *   DIR=docs/research/new-rider/3.4/results/34d node <scratch>/mt.mjs > .../34d-summary.txt
 *
 * Env: `DIR` (the results folder), `ARMS` (comma-separated arm names, default all ten).
 */
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const DIR = process.env.DIR ?? 'docs/research/new-rider/3.4/results/34d';
const ARMS = (process.env.ARMS ?? 'off-unsteered,point-unsteered,two-off-unsteered,off-low,two-off-low,off-steered,two-off-steered,level-unsteered,two-level-unsteered,level-low').split(',');

type Row = Record<string, number | string | null>;

/** The dump at `<path>` or, as the two large ones are kept in the folder, at `<path>.gz`. */
function load(arm: string, kind: 'ticks' | 'mount' | ''): Row[] {
  const path = kind ? `${DIR}/34d-${arm}.${kind}.jsonl` : `${DIR}/34d-${arm}.jsonl`;
  const text = existsSync(path) ? readFileSync(path, 'utf8')
    : existsSync(`${path}.gz`) ? gunzipSync(readFileSync(`${path}.gz`)).toString('utf8') : '';
  return text.split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as Row);
}
const num = (r: Row, k: string): number => {
  const v = r[k];
  return typeof v === 'number' ? v : Number.NaN;
};
/** The geometric mean of `|x|` over the finite non-zero entries. */
function gm(v: number[]): number {
  const w = v.filter((x) => Number.isFinite(x) && Math.abs(x) > 0).map(Math.abs);
  if (!w.length) return Number.NaN;
  return Math.exp(w.reduce((a, x) => a + Math.log(x), 0) / w.length);
}
function median(v: number[]): number {
  const w = v.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!w.length) return Number.NaN;
  // **`3.3/plant.ts`'s own convention, deliberately**: `qt(v, 0.5)` is `s[floor(0.5 n)]`, the UPPER element of the
  // middle pair on an even list, not the pair's mean. The whole folder's published medians are that quantile, so an
  // independent symmetric median here would print 0.950 where every other document prints 1.033 for the same
  // eighteen numbers — a difference of convention that would read as a difference of ride.
  return w[Math.min(w.length - 1, Math.floor(0.5 * w.length))];
}
function share(v: boolean[]): number {
  return v.length ? v.filter(Boolean).length / v.length : Number.NaN;
}
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : 'nan');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);

const AGE: [number, number][] = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.0], [1.0, 1.5], [1.5, 2.0], [2.0, 3.0], [3.0, 5.0], [5.0, 99]];

/** Split a dump into runs on the time resetting. */
function runsOf(rows: Row[]): Row[][] {
  const out: Row[][] = [];
  let cur: Row[] = [];
  let prev = Number.NaN;
  for (const r of rows) {
    const t = num(r, 't');
    if (Number.isFinite(prev) && t < prev - 1e-9) { out.push(cur); cur = []; }
    cur.push(r); prev = t;
  }
  if (cur.length) out.push(cur);
  return out;
}

// ===== 1. the age profile, split exactly, with the identity's own closure =====
function profile(arm: string, rows: Row[], liveOnly: boolean): void {
  const rs = liveOnly ? rows.filter((r) => num(r, 'live') === 1) : rows;
  out(`\n### ${arm} — the age profile split exactly (${liveOnly ? 'live only, 3.4c\'s own population' : 'EVERY tick, the mount included'}), ${rs.length} ticks`);
  out(['age s', 'n', 'gm rel', 'gm|err|', 'gm|game|', 'gm|model|', 'closure', 'gm|phantom|', 'ph/err', 'ph/game', 'noPh helps', 'm>g', 'gm|tilt|', 'gm|rail|'].map((s, i) => pad(s, i ? 11 : 10)).join(''));
  for (const [a, b] of AGE) {
    const w = rs.filter((r) => num(r, 't') >= a && num(r, 't') < b);
    if (!w.length) continue;
    const err = gm(w.map((r) => num(r, 'rollAccFull') - num(r, 'rollAccGame')));
    const den = gm(w.map((r) => num(r, 'rollAccGame')));
    const rel = gm(w.map((r) => num(r, 'relFull')));
    const ph = w.map((r) => num(r, 'rollAccFull') - num(r, 'rollAccTilt'));
    const close = Math.abs(rel - err / den) / Math.max(1e-30, rel);
    out([`${f(a, 1)}-${f(b, 1)}`, `${w.length}`, f(rel, 3), f(err), f(den), f(gm(w.map((r) => num(r, 'rollAccFull')))),
      close.toExponential(1), f(gm(ph)),
      f(gm(w.map((r, i) => ph[i] / (num(r, 'rollAccFull') - num(r, 'rollAccGame')))), 2),
      f(gm(w.map((r, i) => ph[i] / num(r, 'rollAccGame'))), 1),
      f(share(w.map((r) => Math.abs(num(r, 'rollAccTilt') - num(r, 'rollAccGame')) < Math.abs(num(r, 'rollAccFull') - num(r, 'rollAccGame')))), 3),
      f(share(w.map((r) => Math.abs(num(r, 'rollAccFull')) > Math.abs(num(r, 'rollAccGame')))), 3),
      f(gm(w.map((r) => num(r, 'tilt'))), 2), f(gm(w.map((r) => num(r, 'roll') - num(r, 'tilt'))), 2),
    ].map((s, i) => pad(s, i ? 11 : 10)).join(''));
  }
}

// ===== 2. the two rows' own terms =====
const TERM_AGE: [number, number][] = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 1.0], [1.0, 1.5], [1.5, 3.0], [3.0, 99]];
function terms(arm: string, rows: Row[]): void {
  out(`\n### ${arm} — the two rows' own TERMS, gm |°/s²| (the model's four from the gap plus the game's own source, which is how the dump carries them)`);
  out(['age s', 'n', 'M water', 'M ankle', 'M rest', 'M row', 'G water', 'G ankle', 'G rest', 'G row', 'phantom', 'ph/Mwater'].map((s, i) => pad(s, i ? 11 : 10)).join(''));
  for (const [a, b] of TERM_AGE) {
    const w = rows.filter((r) => num(r, 't') >= a && num(r, 't') < b);
    if (w.length < 20) continue;
    const mw = w.map((r) => num(r, 'eWater') + num(r, 'gWaterBoard'));
    const ph = w.map((r) => num(r, 'rollAccFull') - num(r, 'rollAccTilt'));
    out([`${f(a, 1)}-${f(b, 1)}`, `${w.length}`,
      f(gm(mw), 0), f(gm(w.map((r) => num(r, 'eAnkle') + num(r, 'gAnkleSrc'))), 0), f(gm(w.map((r) => num(r, 'eRest') + num(r, 'gRestSrc'))), 0),
      f(gm(w.map((r) => num(r, 'rollAccFull'))), 0),
      f(gm(w.map((r) => num(r, 'gWaterBoard'))), 0), f(gm(w.map((r) => num(r, 'gAnkleSrc'))), 0), f(gm(w.map((r) => num(r, 'gRestSrc'))), 0),
      f(gm(w.map((r) => num(r, 'rollAccGame'))), 0), f(gm(ph), 0), f(gm(ph.map((p, i) => p / mw[i])), 2),
    ].map((s, i) => pad(s, i ? 11 : 10)).join(''));
  }
}

// ===== 3. the two-way reads =====
const WIDE_AGE: [number, number][] = [[0, 0.2], [0.2, 0.6], [0.6, 1.0], [1.0, 1.5], [1.5, 3.0], [3.0, 99]];
function twoWay(arm: string, rows: Row[], label: string, bins: [number, number][], key: (r: Row) => number,
  cell: (w: Row[]) => number, cellLabel: string): void {
  out(`\n### ${arm} — ${cellLabel} over (${label}) × (the ride's own age, s)`);
  out(pad(`${label} \\ age`, 18) + WIDE_AGE.map(([a, b]) => pad(`${f(a, 1)}-${f(b, 1)}`, 14)).join('') + pad('ALL', 10));
  for (const [lo, hi] of bins) {
    const band = rows.filter((r) => key(r) >= lo && key(r) < hi);
    if (band.length < 15) continue;
    let line = pad(`${f(lo, 2)}-${f(hi, 2)}`, 18);
    for (const [a, b] of WIDE_AGE) {
      const w = band.filter((r) => num(r, 't') >= a && num(r, 't') < b);
      line += pad(w.length >= 15 ? `${f(cell(w), 1)}(${w.length})` : '', 14);
    }
    out(line + pad(f(cell(band), 1), 10));
  }
  let line = pad('ALL', 18);
  for (const [a, b] of WIDE_AGE) {
    const w = rows.filter((r) => num(r, 't') >= a && num(r, 't') < b);
    line += pad(w.length >= 15 ? `${f(cell(w), 1)}(${w.length})` : '', 14);
  }
  out(line + pad(f(cell(rows), 1), 10));
}

// ===== 5. the mount's own frames =====
function mount(arm: string, rows: Row[]): void {
  const runs = runsOf(rows);
  out(`\n### ${arm} — the mount, per FRAME from frame 1, medians over ${runs.length} runs`);
  out(['fr', 't', 'filterOn', 'cmd==0', 'est==0', 'estPhi', 'truePhi', 'bias0', 'refPhi', 'feltAcross', 'feltMag', 'roll', 'tilt', 'rail', 'bank', 'ankleRest', 'rollGame'].map((s, i) => pad(s, i ? 11 : 5)).join(''));
  for (const fr of [1, 2, 3, 4, 5, 6, 7, 8, 12, 18, 24, 36, 60]) {
    const w = runs.filter((r) => r.length >= fr).map((r) => r[fr - 1]);
    if (!w.length) continue;
    out([`${fr}`, f(median(w.map((r) => num(r, 't'))), 4), f(share(w.map((r) => num(r, 'filterOn') === 1)), 2),
      f(share(w.map((r) => num(r, 'sent0') === 0)), 2), f(share(w.map((r) => num(r, 'estPhi') === 0 && num(r, 'estTheta') === 0)), 2),
      f(median(w.map((r) => num(r, 'estPhi'))), 3), f(median(w.map((r) => num(r, 'truePhi'))), 3), f(median(w.map((r) => num(r, 'bias0'))), 4),
      f(median(w.map((r) => num(r, 'refPhi'))), 3), f(median(w.map((r) => num(r, 'feltAcross'))), 3), f(median(w.map((r) => num(r, 'feltMag'))), 3),
      f(median(w.map((r) => num(r, 'roll'))), 3), f(median(w.map((r) => num(r, 'tilt'))), 3), f(median(w.map((r) => num(r, 'rail'))), 3),
      f(median(w.map((r) => num(r, 'bank'))), 3), f(median(w.map((r) => num(r, 'ankleRest'))), 4), f(median(w.map((r) => num(r, 'rollGame'))), 1),
    ].map((s, i) => pad(s, i ? 11 : 5)).join(''));
  }
  const all = rows;
  const first6 = all.filter((r) => num(r, 't') <= 0.1 + 1e-9);
  out(`  frames 1-6 pooled (${first6.length} of ${all.length}): the command is EXACTLY zero in ${f(share(first6.map((r) => num(r, 'sent0') === 0)), 3)}, `
    + `the lagged rest exactly zero in ${f(share(first6.map((r) => num(r, 'ankleRest') === 0)), 3)}, the filter on in ${f(share(first6.map((r) => num(r, 'filterOn') === 1)), 3)}`);
  out(`  |refPhi| over EVERY frame of every run: median ${f(median(all.map((r) => Math.abs(num(r, 'refPhi')))), 4)}°, peak ${f(Math.max(...all.map((r) => Math.abs(num(r, 'refPhi')))), 4)}°`
    + ` | |tilt| median ${f(median(all.map((r) => Math.abs(num(r, 'tilt')))), 3)}°, peak ${f(Math.max(...all.map((r) => Math.abs(num(r, 'tilt')))), 2)}°`);
  const firstWhen = (test: (r: Row) => boolean) => {
    const hits = runs.map((run) => run.find(test)).filter((r): r is Row => !!r).map((r) => num(r, 't'));
    return { med: median(hits), n: hits.length };
  };
  const felt = firstWhen((r) => Math.abs(num(r, 'feltAcross')) < 1);
  const cross = firstWhen((r) => Math.abs(num(r, 'rail')) > Math.abs(num(r, 'tilt')));
  const sent = firstWhen((r) => num(r, 'sent0') !== 0);
  out(`  the felt vertical first within 1° of the face's normal: ${f(felt.med, 3)} s (${felt.n} of ${runs.length} runs)`
    + ` | the board's own heel first exceeds the face's tilt: ${f(cross.med, 3)} s (${cross.n} of ${runs.length})`
    + ` | the loop first sends anything: ${f(sent.med, 3)} s (${sent.n} of ${runs.length})`);
}

// ===== 6. the falls =====
function falls(): void {
  out('\n### the owner\'s bar — every arm, the deck filter');
  out(['arm', 'runs', 'fell', 'median s', 'lo', 'hi', 'Compress fell', 'Compress med'].map((s, i) => pad(s, i ? 14 : 24)).join(''));
  for (const arm of ARMS) {
    const rr = load(arm, '');
    if (!rr.length) continue;
    const end = (r: Row) => (r['fell'] ? num(r, 'fellAt') : 9);
    const cm = rr.filter((r) => r['stance'] === 'compress');
    out([arm, `${rr.length}`, `${rr.filter((r) => r['fell']).length}`, f(median(rr.map(end)), 3),
      f(Math.min(...rr.map(end)), 3), f(Math.max(...rr.map(end)), 3),
      `${cm.filter((r) => r['fell']).length} of ${cm.length}`, f(median(cm.map(end)), 3),
    ].map((s, i) => pad(s, i ? 14 : 24)).join(''));
  }
}

// ===== 7. the controls =====
function controls(): void {
  out('\n### the controls, read off every arm\'s own per-run summary (peaks over the arm\'s runs)');
  const keys = ['senseOff', 'spacingOff', 'ledgerSplit', 'ledgerClosure', 'ledgerResidual', 'closeRoll', 'gDeckClosePeak', 'eClosePeak', 'ctlOffPeak', 'relCtlOffPeak', 'footCtlOffPeak', 'sideRollCtlPeak'];
  out(pad('arm', 24) + keys.map((k) => pad(k, 16)).join(''));
  for (const arm of ARMS) {
    const rr = load(arm, '');
    if (!rr.length) continue;
    out(pad(arm, 24) + keys.map((k) => {
      const v = rr.map((r) => num(r, k)).filter(Number.isFinite);
      return pad(v.length ? Math.max(...v).toExponential(2) : '-', 16);
    }).join(''));
  }
}

const PH_BINS: [number, number][] = [[0, 0.25], [0.25, 0.5], [0.5, 0.8], [0.8, 1.0], [1.0, 99]];
const ROLL_BINS: [number, number][] = [[0, 5], [5, 10], [10, 15], [15, 25], [25, 999]];

out('# Step 3.4d — the mount, generated by `docs/research/new-rider/3.4/mount.ts` from the arms\' own dumps');
out(`# arms: ${ARMS.join(' ')}`);
for (const arm of ARMS) {
  const tk = load(arm, 'ticks');
  const mt = load(arm, 'mount');
  if (tk.length) {
    profile(arm, tk, false);
    profile(arm, tk, true);
    terms(arm, tk);
    twoWay(arm, tk.filter((r) => num(r, 'roll') !== 0), '|tilt|/|roll|, the phantom\'s share of the model\'s own heel', PH_BINS,
      (r) => Math.abs(num(r, 'tilt')) / Math.max(1e-9, Math.abs(num(r, 'roll'))),
      (w) => gm(w.map((r) => num(r, 'relFull'))), 'the gm relative error');
    twoWay(arm, tk.filter((r) => num(r, 'roll') !== 0), '|tilt|/|roll|, the phantom\'s share of the model\'s own heel', PH_BINS,
      (r) => Math.abs(num(r, 'tilt')) / Math.max(1e-9, Math.abs(num(r, 'roll'))),
      (w) => gm(w.map((r) => num(r, 'rollAccGame'))), 'gm |the GAME\'s own roll row|, °/s²');
    twoWay(arm, tk, 'the board\'s roll from the world\'s level, °', ROLL_BINS, (r) => Math.abs(num(r, 'roll')),
      (w) => gm(w.map((r) => num(r, 'relFull'))), 'the gm relative error');
    twoWay(arm, tk, 'the board\'s roll from the world\'s level, °', ROLL_BINS, (r) => Math.abs(num(r, 'roll')),
      (w) => gm(w.map((r) => num(r, 'rollAccGame'))), 'gm |the GAME\'s own roll row|, °/s²');
  }
  if (mt.length) mount(arm, mt);
}
falls();
controls();
