/**
 * **Step 3.5i's reader: the follow lag, the mismatch-against-rate constant, and what a feed-forward on the player's
 * own command could possibly reach.**
 *
 * Reads the JSONL `3.5/forward.ts` writes. Imports nothing from `src/` and writes nothing.
 *
 * ## What each section is, and what a broken result would look like
 *
 * - **§0 the instrument.** Runs, frames all and live, the frames dropped by cutting each run at its first
 *   `attached == 0`, and **frame 1's own draft and leg load** — the `SINK=0.06` control. A break: frame 1 dry
 *   (`draft <= 0`) or `load == 0`, which is the flush placement this track's rigs used and which costs 0.53 s of
 *   settling. The compiled constants are echoed off each file's head row, so a rebuild that did not take is visible.
 * - **§1 the headline.** `tip` fired of N riders (read off `limitTime.tip` rising, never off the last substep's
 *   `limit`), the share of live frames it binds, the median ride, the board's roll peak and rate. A break: `tip`
 *   reading 0 of N, which would mean the detector is broken rather than that nothing pinned.
 * - **§2 the follow.** `d(body bank)/d(deck bank at t − lag)` through the origin, per lag, and the median mismatch at
 *   that lag. A break: a slope of 0 at every lag (the two columns unrelated) or exactly 1 at lag 0 (the two columns
 *   being one read). Neither is computed from the other: `bank` is `AttachedRider.bank.angle`, the body's own lean
 *   over its feet from the world's vertical; `roll` is the deck's own orientation about the heading's side axis.
 * - **§3 the constant.** `|mismatch| / |deck roll rate|` in ms, per rate band. A break: a ratio that is flat at the
 *   frame time (0.0167 s) — that would be differencing noise, not a lag.
 * - **§4 ⭐ the feed-forward's own headroom.** The player's command (`ask`, the lean asked after the cap) against the
 *   deck's roll rate, on the same frames. **A feed-forward on the command can only anticipate what the command
 *   itself moves**: if the command's own rate is small where the deck's rate is large, no gain on it can cancel
 *   `lag × roll rate`. A break: the command's rate reading identically 0 on every frame, which would mean the column
 *   is dead rather than quiet — so the count of frames with a non-zero command rate is printed beside it.
 * - **§5 the plant's own lag.** From the ankle's **commanded** rest to the ankle angle the body actually holds, within
 *   one run. This is the half of the loop that no feed-forward can shorten, because it is the body's own pendulum on
 *   the ankle spring. A break: a lag of 0 with a gain of 1, which would mean the rest is being read as achieved.
 *
 * **Every median here is a PLAIN median** — the mean of the two middle elements at even length — and never this
 * folder's `qt(v, 0.5)` upper middle. Every share is printed beside its own count, so an empty filter reads as
 * `0 of N` and not as a clean zero.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/forward-read.ts -o <scratch>/fr.mjs --format esm --platform node
 *   FILES=<scratch>/sea-base.jsonl LABELS=base node <scratch>/fr.mjs
 *   IDENT=<scratch>/a.jsonl,<scratch>/b.jsonl node <scratch>/fr.mjs
 */
import { existsSync, readFileSync } from 'node:fs';

const FILES = (process.env.FILES ?? '').split(',').filter((s) => s.length);
const LABELS = (process.env.LABELS ?? '').split(',').filter((s) => s.length);
const IDENT = (process.env.IDENT ?? '').split(',').filter((s) => s.length);
/** The lags, in frames at 60 Hz, the follow is read at. */
const LAGS = (process.env.LAGS ?? '0,1,2,3,4,5,6,7,8,9,10,12,16,24').split(',').map(Number);
const BANDS = [0, 20, 50, 100, 200, 1e9];
/**
 * `CAP=n`: truncate every run to its first n live frames. **This is how two arms whose rides have different lengths
 * are compared on the same window** — without it a shorter-riding arm contributes fewer and later frames and the
 * populations are not matched. Printed in §0's frame counts, so the truncation is visible.
 */
const CAP = Number(process.env.CAP ?? 0);

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);
const fin = (v: number[]) => v.filter(Number.isFinite);
/** ⚠️ A PLAIN median: the mean of the two middle elements at even length. Not `qt(v, 0.5)`. */
const med = (v: number[]) => {
  const s = fin(v).sort((a, b) => a - b);
  if (!s.length) return Number.NaN;
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const peak = (v: number[]) => { const s = fin(v); return s.length ? s.reduce((a, b) => Math.max(a, b), -Infinity) : Number.NaN; };
const span = (v: number[], d = 2) => { const s = fin(v).sort((a, b) => a - b); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };

type Row = Record<string, number | string | null>;
const num = (r: Row, k: string) => { const v = r[k]; return typeof v === 'number' ? v : Number.NaN; };
const str = (r: Row, k: string) => { const v = r[k]; return typeof v === 'string' ? v : String(v); };

interface Run { key: string; arm: string; live: Row[]; all: Row[]; fellAt: number; cause: string }
interface File { label: string; head: Row; arms: Map<string, Run[]> }

function load(path: string, label: string): File | null {
  if (!existsSync(path)) { out(`  (missing: ${path})`); return null; }
  const rows = readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as Row);
  const head = rows.find((r) => str(r, 'kind') === 'head') ?? {};
  const sea = rows.find((r) => str(r, 'kind') === 'sea');
  if (sea) head.search = sea.search, head.cells = sea.cells, head.gridW = sea.gridW, head.gridH = sea.gridH, head.wallSpinUp = sea.wallSpinUp;
  const byKey = new Map<string, Row[]>();
  for (const r of rows) {
    if (str(r, 'kind') !== 'f') continue;
    const k = `${str(r, 'arm')}|${num(r, 'trial')}|${str(r, 'stance')}|${num(r, 'entry')}|${num(r, 'steer')}|${num(r, 'slope')}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }
  const summaries = new Map<string, Row>();
  for (const r of rows) {
    if (str(r, 'kind') !== 'run') continue;
    summaries.set(`${str(r, 'arm')}|${num(r, 'trial')}|${str(r, 'stance')}|${num(r, 'entry')}|${num(r, 'steer')}|${num(r, 'slope')}`, r);
  }
  const arms = new Map<string, Run[]>();
  for (const [k, all] of byKey) {
    all.sort((a, b) => num(a, 'frame') - num(b, 'frame'));
    let live: Row[] = [];
    for (const r of all) { if (num(r, 'attached') !== 1) break; live.push(r); }
    if (CAP > 0) live = live.slice(0, CAP);
    const arm = str(all[0], 'arm');
    const s = summaries.get(k);
    if (!arms.has(arm)) arms.set(arm, []);
    arms.get(arm)!.push({ key: k, arm, live, all, fellAt: s ? num(s, 'fellAt') : Number.NaN, cause: s ? str(s, 'cause') : '?' });
  }
  return { label, head, arms };
}

// ------------------------------------------------------------------------------------------------------------------
// IDENT — two dumps compared column by column over matched (arm, trial, stance, entry, steer, slope, frame).
// ------------------------------------------------------------------------------------------------------------------
if (IDENT.length === 2) {
  const read = (p: string) => readFileSync(p, 'utf8').split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as Row);
  const keyOf = (r: Row) => `${str(r, 'arm')}|${num(r, 'trial')}|${str(r, 'stance')}|${num(r, 'entry')}|${num(r, 'steer')}|${num(r, 'slope')}|${num(r, 'frame')}`;
  const A = new Map<string, Row>();
  for (const r of read(IDENT[0])) if (str(r, 'kind') === 'f') A.set(keyOf(r), r);
  const B = new Map<string, Row>();
  for (const r of read(IDENT[1])) if (str(r, 'kind') === 'f') B.set(keyOf(r), r);
  let shared = 0;
  let values = 0;
  let diff = 0;
  const worst: { key: string; col: string; a: number; b: number; d: number }[] = [];
  const cols = new Set<string>();
  for (const [k, a] of A) {
    const b = B.get(k);
    if (!b) continue;
    shared += 1;
    for (const c of Object.keys(a)) {
      const va = a[c];
      const vb = b[c];
      if (typeof va === 'number' && typeof vb === 'number') {
        cols.add(c);
        values += 1;
        const d = Math.abs(va - vb);
        if (d > 0) { diff += 1; worst.push({ key: k, col: c, a: va, b: vb, d }); }
      } else if (va !== vb) { cols.add(c); values += 1; diff += 1; }
    }
  }
  // The run summaries too: the outcome of each rider, which is what a reader of the tables would compare.
  const runsOf = (p: string) => {
    const m = new Map<string, string>();
    for (const r of read(p)) if (str(r, 'kind') === 'run') m.set(`${str(r, 'arm')}|${num(r, 'trial')}|${str(r, 'stance')}|${num(r, 'entry')}|${num(r, 'steer')}|${num(r, 'slope')}`, `${num(r, 'frames')}|${num(r, 'fellAt')}|${str(r, 'cause')}`);
    return m;
  };
  const ra = runsOf(IDENT[0]);
  const rb = runsOf(IDENT[1]);
  let sameRuns = 0;
  let bothRuns = 0;
  for (const [k, v] of ra) { const w = rb.get(k); if (w === undefined) continue; bothRuns += 1; if (v === w) sameRuns += 1; }
  out('# IDENT — two dumps compared column by column');
  out(`  A = ${IDENT[0]}`);
  out(`  B = ${IDENT[1]}`);
  out(`  frames in A ${A.size}, in B ${B.size}, SHARED ${shared}; numeric+string columns compared ${cols.size}`);
  out(`  values compared ${values}, DIFFERENCES ${diff}`);
  out(`  run summaries identical in (frames, fellAt, cause): ${sameRuns} of ${bothRuns}`);
  worst.sort((x, y) => y.d - x.d);
  for (const w of worst.slice(0, 10)) out(`    ${w.col} @ ${w.key}: ${w.a} vs ${w.b} (Δ ${w.d})`);
  out('# end');
  process.exit(0);
}

const files = FILES.map((p, i) => load(p, LABELS[i] ?? `f${i}`)).filter((x): x is File => x !== null);

out('# Step 3.5i — the feed-forward and the lag');
out('');
out('## §0 The instrument, and the SINK control');
out('');
out('  file/arm        runs  frames(all) frames(live)  cut   f1 draft med   f1 draft span   f1 load med   f1 dry   constants (FWD/GAIN/RATE/BAL_DELAY/PRED_DELAY)');
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const all = runs.reduce((s, r) => s + r.all.length, 0);
    const live = runs.reduce((s, r) => s + r.live.length, 0);
    const d1 = runs.map((r) => (r.all.length ? num(r.all[0], 'draft') : Number.NaN));
    const l1 = runs.map((r) => (r.all.length ? num(r.all[0], 'load') : Number.NaN));
    const dry = runs.filter((r) => r.all.length && !(num(r.all[0], 'draft') > 0)).length;
    const h = file.head;
    out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(String(runs.length), 4)}  ${pad(String(all), 11)} ${pad(String(live), 12)}  ${pad(String(all - live), 3)}  ${pad(f(med(d1), 5), 13)}  ${pad(span(d1, 4), 14)}  ${pad(f(med(l1), 1), 12)}  ${pad(`${dry}/${runs.length}`, 7)}${num(h, 'HUMAN_BANK_FORWARD')}/${num(h, 'HUMAN_BANK_GAIN')}/${num(h, 'HUMAN_BANK_RATE_GAIN')}/${num(h, 'BALANCE_DELAY')}/${num(h, 'PREDICT_DELAY')}`);
  }
}
for (const file of files) {
  const h = file.head;
  if (h.cells !== undefined) out(`  ${file.label}: seatbelt search ${String(h.search)}, grid ${num(h, 'gridW')} × ${num(h, 'gridH')} = ${num(h, 'cells')}, CPU spin-up ${f(num(h, 'wallSpinUp'), 1)} s wall`);
}

out('');
out('## §1 The headline columns');
out('');
out('  file/arm        riders  live   tip fired  first tip frame  frames tip binds   share    median ride  roll peak(med of per-rider max)  |rollRate| med  per-rider rate peak med  causes');
interface Head { label: string; arm: string; riders: number; live: number; tip: number; firstTip: number; bind: number; bindShare: number; ride: number; rollPeak: number; rate: number; ratePeak: number }
const heads: Head[] = [];
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const live = runs.reduce((s, r) => s + r.live.length, 0);
    const tipRuns = runs.filter((r) => r.live.some((x) => num(x, 'tipNew') === 1));
    const firsts = tipRuns.map((r) => num(r.live.find((x) => num(x, 'tipNew') === 1)!, 'frame'));
    const binds = runs.reduce((s, r) => s + r.live.filter((x) => num(x, 'tipNew') === 1).length, 0);
    const rolls = runs.map((r) => peak(r.live.map((x) => Math.abs(num(x, 'roll')))));
    const rates = runs.flatMap((r) => r.live.map((x) => Math.abs(num(x, 'rollRate'))));
    const ratePeaks = runs.map((r) => peak(r.live.map((x) => Math.abs(num(x, 'rollRate')))));
    const causes = new Map<string, number>();
    for (const r of runs) causes.set(r.cause, (causes.get(r.cause) ?? 0) + 1);
    const ride = med(runs.map((r) => r.fellAt));
    out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(String(runs.length), 6)}  ${pad(String(live), 5)}  ${pad(`${tipRuns.length}/${runs.length}`, 9)}  ${pad(f(med(firsts), 1), 15)}  ${pad(String(binds), 17)}  ${pad(`${f((100 * binds) / live, 1)} %`, 7)}  ${pad(f(ride, 3), 11)}  ${pad(f(med(rolls), 3), 31)}  ${pad(f(med(rates), 3), 14)}  ${pad(f(med(ratePeaks), 3), 23)}  ${[...causes].map(([k, v]) => `${k} ${v}`).join(', ')}`);
    heads.push({ label: file.label, arm, riders: runs.length, live, tip: tipRuns.length, firstTip: med(firsts), bind: binds, bindShare: (100 * binds) / live, ride, rollPeak: med(rolls), rate: med(rates), ratePeak: med(ratePeaks) });
  }
}

out('');
out('## §2 The follow: d(body bank)/d(deck bank at t − lag) through the origin, per lag');
out('');
out('  file/arm        lag(frames)  lag(s)   frames   slope     median |mismatch at that lag|, °');
interface Follow { label: string; arm: string; cross: number }
const follows: Follow[] = [];
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const slopes: { lag: number; slope: number; n: number; mis: number }[] = [];
    for (const lag of LAGS) {
      let sxy = 0;
      let sxx = 0;
      let n = 0;
      const mis: number[] = [];
      for (const r of runs) {
        for (let i = lag; i < r.live.length; i += 1) {
          const x = num(r.live[i - lag], 'roll');
          const y = num(r.live[i], 'bank');
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          sxy += x * y; sxx += x * x; n += 1;
          mis.push(Math.abs(y - x));
        }
      }
      const slope = sxx > 0 ? sxy / sxx : Number.NaN;
      slopes.push({ lag, slope, n, mis: med(mis) });
      out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(String(lag), 11)}  ${pad(f(lag / 60, 4), 6)}   ${pad(String(n), 6)}   ${pad(f(slope, 4), 7)}   ${f(med(mis), 3)}`);
    }
    // The lag at which the gain crosses 1, linearly interpolated between the bracketing lags.
    let cross = Number.NaN;
    for (let i = 1; i < slopes.length; i += 1) {
      const a = slopes[i - 1];
      const b = slopes[i];
      if (Number.isFinite(a.slope) && Number.isFinite(b.slope) && ((a.slope - 1) * (b.slope - 1) <= 0) && a.slope !== b.slope) {
        cross = a.lag + ((1 - a.slope) * (b.lag - a.lag)) / (b.slope - a.slope);
        break;
      }
    }
    follows.push({ label: file.label, arm, cross });
    out(`  → ${file.label}/${arm}: the follow gain crosses 1.000 at a lag of ${f(cross, 2)} frames = ${f(cross / 60, 4)} s`);
    out('');
  }
}

out('');
out('## §3 The constant: |mismatch| against the deck\'s roll rate, per rate band');
out('');
out('  file/arm        band °/s      frames   median rate  median |mismatch|  ratio, ms');
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const all: { rate: number; mis: number }[] = [];
    for (const r of runs) for (const x of r.live) {
      const rate = Math.abs(num(x, 'rollRate'));
      const mis = Math.abs(num(x, 'bank') - num(x, 'roll'));
      if (Number.isFinite(rate) && Number.isFinite(mis)) all.push({ rate, mis });
    }
    for (let b = 0; b < BANDS.length - 1; b += 1) {
      const rows = all.filter((x) => x.rate >= BANDS[b] && x.rate < BANDS[b + 1]);
      if (!rows.length) continue;
      const mr = med(rows.map((x) => x.rate));
      const mm = med(rows.map((x) => x.mis));
      out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(`${BANDS[b]}–${BANDS[b + 1] > 1e8 ? '∞' : BANDS[b + 1]}`, 11)}  ${pad(String(rows.length), 7)}  ${pad(f(mr, 2), 11)}  ${pad(f(mm, 3), 17)}  ${f((1000 * mm) / mr, 1)}`);
    }
    const mr = med(all.map((x) => x.rate));
    const mm = med(all.map((x) => x.mis));
    out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad('all', 11)}  ${pad(String(all.length), 7)}  ${pad(f(mr, 2), 11)}  ${pad(f(mm, 3), 17)}  ${f((1000 * mm) / mr, 1)}`);
  }
}

out('');
out('## §3b ⭐ Is it a LAG at all? The same mismatch against the deck\'s ANGLE and against its RATE');
out('');
out('  `3.5/body-banks.md` reads the mismatch as `lag × roll rate`. The same frames fit a second law just as well:');
out('  the body banks a fixed SHARE of the deck, so the mismatch is `(1 − gain) × deck bank` — a static shortfall,');
out('  not a delay. Both are fitted here through the origin on the same frames, and both R² are printed. A break:');
out('  R² near 0 for both, which would mean neither law describes the column.');
out('');
out('  file/arm        frames  A (° per °)  R²(angle)  B (ms)   R²(rate)  both: A, B      R²(both)');
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const rows: { y: number; a: number; b: number }[] = [];
    for (const r of runs) for (const x of r.live) {
      const y = Math.abs(num(x, 'bank') - num(x, 'roll'));
      const a = Math.abs(num(x, 'roll'));
      const b = Math.abs(num(x, 'rollRate'));
      if ([y, a, b].every(Number.isFinite)) rows.push({ y, a, b });
    }
    if (!rows.length) continue;
    const r2of = (pred: (r: { a: number; b: number }) => number) => {
      let ss = 0;
      let sy = 0;
      let syy = 0;
      for (const r of rows) { ss += (r.y - pred(r)) ** 2; sy += r.y; syy += r.y * r.y; }
      const tot = syy - (sy * sy) / rows.length;
      return tot > 0 ? 1 - ss / tot : Number.NaN;
    };
    const one = (key: 'a' | 'b') => {
      let sxy = 0;
      let sxx = 0;
      for (const r of rows) { sxy += r[key] * r.y; sxx += r[key] * r[key]; }
      return sxx > 0 ? sxy / sxx : Number.NaN;
    };
    const A = one('a');
    const B = one('b');
    // Both terms at once: a 2×2 normal equation.
    let saa = 0;
    let sab = 0;
    let sbb = 0;
    let say = 0;
    let sby = 0;
    for (const r of rows) { saa += r.a * r.a; sab += r.a * r.b; sbb += r.b * r.b; say += r.a * r.y; sby += r.b * r.y; }
    const det = saa * sbb - sab * sab;
    const A2 = det !== 0 ? (say * sbb - sby * sab) / det : Number.NaN;
    const B2 = det !== 0 ? (sby * saa - say * sab) / det : Number.NaN;
    out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(String(rows.length), 6)}  ${pad(f(A, 4), 11)}  ${pad(f(r2of((r) => A * r.a), 3), 9)}  ${pad(f(1000 * B, 1), 7)}  ${pad(f(r2of((r) => B * r.b), 3), 8)}  ${pad(`${f(A2, 4)}, ${f(1000 * B2, 1)}`, 14)}  ${f(r2of((r) => A2 * r.a + B2 * r.b), 3)}`);
  }
}

out('');
out('## §3c ⭐⭐ Is the body-against-deck difference the DESIGN\'s own, rather than a lag?');
out('');
out('  The schedule builds the rail that holds a lean from `tan(lean) = pull × tan(rail)` with');
out('  `pull = railPull(speed, rail)` — *"the turn\'s pull over what the rail\'s own lean would balance"* — so a');
out('  coordinated turn is SUPPOSED to put the body\'s lean under the deck\'s rail by that factor. Measured here:');
out('  `tan|bank| / tan|rail|` on the same frames, against the game\'s own `pull` at that frame\'s speed and rail.');
out('  A break: `pull` reading 1 on every frame (the table not being reached), which is why its own span is printed.');
out('');
out('  ⚠️ **The frame matters and the first version of this read got it wrong.** `bank` is the body\'s lean from the');
out('  WORLD\'s vertical while `rail` is the deck\'s heel relative to the WATER, so the two are comparable only once');
out('  the water\'s own tilt is taken out of both: `bankRel = bank − tilt` against `rail = roll − tilt`. On the sea the');
out('  face under the board is nearly level and the two readings agree; on the analytic face they do not, and the');
out('  uncorrected column reads a ratio of 10 at small rail. Both are printed.');
out('');
out('  file/arm        |rail| band  frames  med |rail|  med |bankRel|  tan ratio (water)  tan ratio (world)  med pull  pull span      ratio/pull');
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const rows: { rail: number; rel: number; bank: number; pull: number }[] = [];
    for (const r of runs) for (const x of r.live) {
      const rail = Math.abs(num(x, 'rail'));
      const rel = Math.abs(num(x, 'bank') - num(x, 'tilt'));
      const bank = Math.abs(num(x, 'bank'));
      const pull = num(x, 'pull');
      if ([rail, rel, bank, pull].every(Number.isFinite) && rail > 1e-6) rows.push({ rail, rel, bank, pull });
    }
    if (!rows.length) continue;
    const tanOf = (v: number) => Math.tan((v * Math.PI) / 180);
    for (const [lo, hi] of [[0, 5], [5, 10], [10, 20], [20, 40], [40, 180]] as [number, number][]) {
      const band = rows.filter((x) => x.rail >= lo && x.rail < hi);
      if (!band.length) continue;
      const tr = med(band.map((x) => tanOf(x.rel) / tanOf(x.rail)));
      const tw = med(band.map((x) => tanOf(x.bank) / tanOf(x.rail)));
      const pl = med(band.map((x) => x.pull));
      out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(`${lo}–${hi}°`, 11)}  ${pad(String(band.length), 6)}  ${pad(f(med(band.map((x) => x.rail)), 3), 10)}  ${pad(f(med(band.map((x) => x.rel)), 3), 13)}  ${pad(f(tr, 4), 17)}  ${pad(f(tw, 4), 17)}  ${pad(f(pl, 4), 8)}  ${pad(span(band.map((x) => x.pull), 3), 13)}  ${f(tr / pl, 3)}`);
    }
  }
}

out('');
out('## §4 ⭐ The feed-forward\'s own headroom: the player\'s command against the deck\'s roll rate');
out('');
out('  `askRate` is d(the lean asked after the cap)/dt, °/s, differenced at 60 Hz off the game\'s own `leanProbe.ask`.');
out('  `refRate` is the same for `bankReference`, which is the column the reflex law\'s feed-forward multiplies.');
out('  A feed-forward on the command cannot anticipate roll the command does not itself cause.');
out('');
out('  file/arm        frames  |askRate| med/peak   |refRate| med/peak   |rollRate| med/peak   askRate ≠ 0   |askRate| < 10 % of |rollRate|   corr(askRate, rollRate)   ask settled by t');
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const ask: number[] = [];
    const ref: number[] = [];
    const rate: number[] = [];
    let nz = 0;
    let small = 0;
    let n = 0;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    let sx = 0;
    let sy = 0;
    const settle: number[] = [];
    for (const r of runs) {
      let settled = Number.NaN;
      for (let i = 1; i < r.live.length; i += 1) {
        const a = (num(r.live[i], 'ask') - num(r.live[i - 1], 'ask')) * 60;
        const rf = (num(r.live[i], 'ref') - num(r.live[i - 1], 'ref')) * 60;
        const rr = num(r.live[i], 'rollRate');
        if (!Number.isFinite(a) || !Number.isFinite(rr)) continue;
        ask.push(Math.abs(a)); ref.push(Math.abs(rf)); rate.push(Math.abs(rr));
        if (Math.abs(a) > 1e-9) nz += 1;
        if (Math.abs(a) < 0.1 * Math.abs(rr)) small += 1;
        n += 1; sxy += a * rr; sxx += a * a; syy += rr * rr; sx += a; sy += rr;
        if (!Number.isFinite(settled) && Math.abs(a) < 1) settled = num(r.live[i], 't');
      }
      settle.push(settled);
    }
    const cov = sxy / n - (sx / n) * (sy / n);
    const sdx = Math.sqrt(sxx / n - (sx / n) ** 2);
    const sdy = Math.sqrt(syy / n - (sy / n) ** 2);
    out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(String(n), 6)}  ${pad(`${f(med(ask), 2)} / ${f(peak(ask), 1)}`, 19)}  ${pad(`${f(med(ref), 2)} / ${f(peak(ref), 1)}`, 19)}  ${pad(`${f(med(rate), 2)} / ${f(peak(rate), 1)}`, 20)}  ${pad(`${nz}/${n}`, 11)}  ${pad(`${small}/${n} = ${f((100 * small) / n, 1)} %`, 31)}  ${pad(f(cov / (sdx * sdy), 4), 23)}  ${f(med(settle), 3)} s`);
  }
}

out('');
out('## §4b The same question at every lag: can the command LEAD the deck\'s roll?');
out('');
out('  corr(askRate at t − lag, rollRate at t), so a command that leads the roll by any time up to 0.5 s would show');
out('  as a peak at a positive lag. A break: a correlation of exactly 1 somewhere, which would mean the two columns');
out('  are one read. The positive control is in the same table — the command against the DECK BANK it is asking for');
out('  (corr(ask, roll)), which must be strongly positive, since the rider does steer the board.');
out('');
out('  file/arm        best lag(s)  best corr  corr at lag 0  corr(ask, roll) [positive control]  corr(ask, roll) best lag(s)');
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const corrAt = (lag: number, xKey: 'askRate' | 'ask', yKey: 'rollRate' | 'roll') => {
      let sxy = 0;
      let sxx = 0;
      let syy = 0;
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const r of runs) {
        for (let i = Math.max(1, lag); i < r.live.length; i += 1) {
          const x = xKey === 'ask' ? num(r.live[i - lag], 'ask')
            : (num(r.live[i - lag], 'ask') - num(r.live[i - lag - 1 < 0 ? 0 : i - lag - 1], 'ask')) * 60;
          const y = yKey === 'roll' ? num(r.live[i], 'roll') : num(r.live[i], 'rollRate');
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          sxy += x * y; sxx += x * x; syy += y * y; sx += x; sy += y; n += 1;
        }
      }
      if (n < 10) return Number.NaN;
      const cov = sxy / n - (sx / n) * (sy / n);
      return cov / (Math.sqrt(sxx / n - (sx / n) ** 2) * Math.sqrt(syy / n - (sy / n) ** 2));
    };
    const lags = Array.from({ length: 31 }, (_, i) => i);
    let bestLag = 0;
    let best = 0;
    for (const l of lags) { const c = corrAt(l, 'askRate', 'rollRate'); if (Number.isFinite(c) && Math.abs(c) > Math.abs(best)) { best = c; bestLag = l; } }
    let bestLagA = 0;
    let bestA = 0;
    for (const l of lags) { const c = corrAt(l, 'ask', 'roll'); if (Number.isFinite(c) && Math.abs(c) > Math.abs(bestA)) { bestA = c; bestLagA = l; } }
    out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(f(bestLag / 60, 4), 11)}  ${pad(f(best, 4), 9)}  ${pad(f(corrAt(0, 'askRate', 'rollRate'), 4), 13)}  ${pad(f(corrAt(0, 'ask', 'roll'), 4), 34)}  ${f(bestA, 4)} at ${f(bestLagA / 60, 4)}`);
  }
}

out('');
out('## §4c ⭐ The lever\'s own positive control: rad of commanded rest per rad of lean asked, measured');
out('');
out('  `d(rest)/d(ask)` through the origin, which is the units `HUMAN_BANK_FORWARD` is quoted in. In the `gX` arms');
out('  this must come out near X — that is the measurement that proves the lever is LIVE there, and so that the');
out('  `ships` arm\'s indifference to the constant is the code path and not a dead probe. `restPeak` is the largest');
out('  commanded rest seen, °, against the feet\'s own reach (ANKLE_REST_RANGE = 0.25 rad = 14.32°).');
out('');
out('  file/arm        frames  d(rest)/d(ask)  corr    |rest| median   restPeak °   askPeak °');
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    let sx = 0;
    let sy = 0;
    let n = 0;
    const rests: number[] = [];
    const asks: number[] = [];
    for (const r of runs) for (const x of r.live) {
      const a = num(x, 'ask');
      const d = num(x, 'rest');
      if (!Number.isFinite(a) || !Number.isFinite(d)) continue;
      sxy += a * d; sxx += a * a; syy += d * d; sx += a; sy += d; n += 1;
      rests.push(Math.abs(d));
      asks.push(Math.abs(a));
    }
    if (!n) continue;
    const cov = sxy / n - (sx / n) * (sy / n);
    const corr = cov / (Math.sqrt(sxx / n - (sx / n) ** 2) * Math.sqrt(syy / n - (sy / n) ** 2));
    out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(String(n), 6)}  ${pad(f(sxx > 0 ? sxy / sxx : Number.NaN, 4), 14)}  ${pad(f(corr, 4), 6)}  ${pad(f(med(rests), 3), 14)}   ${pad(f(peak(rests), 3), 10)}   ${f(peak(asks), 3)}`);
  }
}

out('');
out('## §5 The plant\'s own lag: from the ankle\'s COMMANDED rest to the ankle angle the body holds');
out('');
out('  `rest` is `AttachedRider.ankleRest`, °, the command after the motor lag; `ankle` is `bank − roll`, the joint\'s');
out('  own angle. The gain is d(ankle at t)/d(rest at t − lag) through the origin, and `corr` its correlation. This is');
out('  the half of the loop a feed-forward cannot shorten: it is the body on the ankle spring.');
out('');
out('  file/arm        lag(frames)  lag(s)   frames   gain      corr');
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    for (const lag of LAGS.filter((l) => l <= 24)) {
      let sxy = 0;
      let sxx = 0;
      let syy = 0;
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const r of runs) for (let i = lag; i < r.live.length; i += 1) {
        const x = num(r.live[i - lag], 'rest');
        const y = num(r.live[i], 'ankle');
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        sxy += x * y; sxx += x * x; syy += y * y; sx += x; sy += y; n += 1;
      }
      if (!n) continue;
      const cov = sxy / n - (sx / n) * (sy / n);
      const sdx = Math.sqrt(sxx / n - (sx / n) ** 2);
      const sdy = Math.sqrt(syy / n - (sy / n) ** 2);
      out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(String(lag), 11)}  ${pad(f(lag / 60, 4), 6)}   ${pad(String(n), 6)}   ${pad(f(sxx > 0 ? sxy / sxx : Number.NaN, 4), 7)}   ${f(cov / (sdx * sdy), 4)}`);
    }
    out('');
  }
}

out('');
out('## §5b The plant recovered FROM THE RIDE, and what a perfectly anticipating command could deliver');
out('');
out('  Least squares on the body\'s own bank acceleration, differenced at 60 Hz off the game\'s `bank.rate` column:');
out('');
out('      θ̈ = a1 (θ − φ − δ) + a2 (θ̇ − φ̇) + a3 θ          [θ = bank, φ = deck roll, δ = the ankle\'s commanded rest]');
out('');
out('  so `a1` should recover −k/I (the ankle spring over the body\'s inertia), `a2` −c/I and `a3` +mgL/I. `R²` is');
out('  the share of the acceleration\'s variance the three terms carry; `ω` is √(|a1| − a3) and `T` its period.');
out('  **A broken result is `R²` near 0, or an `a1` of either sign with no relation to 800/I.** The estimator\'s own');
out('  positive control is the last row: a synthetic second-order series with k/I, c/I and mgL/I KNOWN, sampled at the');
out('  same 60 Hz and driven by a random rest, put through the same three-term fit.');
out('');
out('  file/arm        frames   a1 (−k/I)   a2 (−c/I)   a3 (mgL/I)  R²      ω rad/s  T s     median height m   median legLen m   mass kg');
/** A 3×3 normal-equation solve by Gauss elimination (the matrices here are tiny). */
function fit3(rows: { y: number; x: [number, number, number] }[]): { a: [number, number, number]; r2: number; n: number } {
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const b = [0, 0, 0];
  let sy = 0;
  let syy = 0;
  for (const row of rows) {
    for (let i = 0; i < 3; i += 1) {
      b[i] += row.x[i] * row.y;
      for (let j = 0; j < 3; j += 1) A[i][j] += row.x[i] * row.x[j];
    }
    sy += row.y; syy += row.y * row.y;
  }
  const m = A.map((r2, i) => [...r2, b[i]]);
  for (let c = 0; c < 3; c += 1) {
    let p = c;
    for (let r2 = c + 1; r2 < 3; r2 += 1) if (Math.abs(m[r2][c]) > Math.abs(m[p][c])) p = r2;
    if (Math.abs(m[p][c]) < 1e-12) return { a: [Number.NaN, Number.NaN, Number.NaN], r2: Number.NaN, n: rows.length };
    [m[c], m[p]] = [m[p], m[c]];
    // ⚠️ The pivot is saved BEFORE the row is divided: dividing in place sets `m[c][c]` to 1 on the first j and the
    // rest of the row is then divided by 1. The first version of this did exactly that and the estimator returned
    // 1e44 — caught by the synthetic control below, which is why that control is here.
    const piv = m[c][c];
    for (let j = c; j < 4; j += 1) m[c][j] /= piv;
    for (let r2 = 0; r2 < 3; r2 += 1) {
      if (r2 === c) continue;
      const g = m[r2][c];
      for (let j = c; j < 4; j += 1) m[r2][j] -= g * m[c][j];
    }
  }
  const a: [number, number, number] = [m[0][3], m[1][3], m[2][3]];
  let ss = 0;
  const mean = sy / rows.length;
  for (const row of rows) {
    const pred = a[0] * row.x[0] + a[1] * row.x[1] + a[2] * row.x[2];
    ss += (row.y - pred) ** 2;
  }
  const tot = syy - rows.length * mean * mean;
  return { a, r2: tot > 0 ? 1 - ss / tot : Number.NaN, n: rows.length };
}
/** The second-order step response of a plant with natural ω and damping ζ, at time t. */
function stepAt(w: number, z: number, t: number): number {
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t));
}
for (const file of files) {
  for (const [arm, runs] of file.arms) {
    const rows: { y: number; x: [number, number, number] }[] = [];
    const hs: number[] = [];
    const ls: number[] = [];
    const ms: number[] = [];
    for (const r of runs) {
      for (let i = 1; i < r.live.length; i += 1) {
        const acc = (num(r.live[i], 'bankRate') - num(r.live[i - 1], 'bankRate')) * 60;
        const th = num(r.live[i], 'bank');
        const ph = num(r.live[i], 'roll');
        const de = num(r.live[i], 'rest');
        const rel = num(r.live[i], 'bankRate') - num(r.live[i], 'rollRate');
        if (![acc, th, ph, de, rel].every(Number.isFinite)) continue;
        rows.push({ y: acc, x: [th - ph - de, rel, th] });
        hs.push(num(r.live[i], 'height'));
        ls.push(num(r.live[i], 'legLen'));
        ms.push(num(r.live[i], 'mass'));
      }
    }
    if (!rows.length) continue;
    const fitted = fit3(rows);
    const w2 = Math.abs(fitted.a[0]) - fitted.a[2];
    const w = w2 > 0 ? Math.sqrt(w2) : Number.NaN;
    out(`  ${pad(`${file.label}/${arm}`, 14)}  ${pad(String(fitted.n), 6)}   ${pad(f(fitted.a[0], 3), 9)}   ${pad(f(fitted.a[1], 3), 9)}   ${pad(f(fitted.a[2], 3), 10)}  ${pad(f(fitted.r2, 3), 6)}  ${pad(f(w, 3), 7)}  ${pad(f((2 * Math.PI) / w, 3), 6)}  ${pad(f(med(hs), 4), 15)}   ${pad(f(med(ls), 4), 15)}   ${f(med(ms), 2)}`);
  }
}
{
  // The estimator's own positive control: a known plant, the same sampling, the same fit.
  const k = 23.81;
  const c = 2.381;
  const g = 14.4;
  let th = 0;
  let dth = 0;
  const h = 1 / 60;
  const rows: { y: number; x: [number, number, number] }[] = [];
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; };
  let de = 0;
  /**
   * ⚠️ **The control has to be as unkind as the game is.** The game differences `bank.rate` between FRAMES while the
   * plant runs on 16–32 substeps inside each, so the fit sees a frame-averaged acceleration against an
   * end-of-frame state. Integrating this control at the frame step instead would make `y` equal `a·x` by
   * construction and the recovery exact — a control that cannot fail. So it is integrated on 16 substeps a frame and
   * sampled only at the frame boundary, exactly as the probe's dump is.
   */
  const SUBS = 16;
  for (let i = 0; i < 20000; i += 1) {
    if (i % 30 === 0) de = 10 * rnd();
    const dth0 = dth;
    for (let s = 0; s < SUBS; s += 1) {
      const acc = -k * (th - de) - c * dth + g * th;
      dth += (h / SUBS) * acc;
      th += (h / SUBS) * dth;
    }
    rows.push({ y: (dth - dth0) / h, x: [th - de, dth, th] });
  }
  const fitted = fit3(rows);
  out(`  ${pad('CONTROL/known', 14)}  ${pad(String(fitted.n), 6)}   ${pad(f(fitted.a[0], 3), 9)}   ${pad(f(fitted.a[1], 3), 9)}   ${pad(f(fitted.a[2], 3), 10)}  ${pad(f(fitted.r2, 3), 6)}  ${pad(f(Math.sqrt(Math.abs(fitted.a[0]) - fitted.a[2]), 3), 7)}  ${pad(f((2 * Math.PI) / Math.sqrt(Math.abs(fitted.a[0]) - fitted.a[2]), 3), 6)}  known a1 −${k}, a2 −${c}, a3 ${g}`);
}
out('');
out('  And the arithmetic off the code\'s own three constants at the bench\'s own measured pendulum length — what share');
out('  of a STEP in the ankle\'s commanded rest the body has delivered by each time, with k = HUMAN_ANKLE_STIFFNESS 800');
out('  N·m/rad, c = HUMAN_ANKLE_DAMPING 80 N·m·s/rad, I = m L² and the toppling stiffness m g L subtracted:');
out('');
out('  L, m    m, kg   k−mgL   I       ω rad/s  T s     ζ      at 0.050 s  at 0.100 s  at 0.200 s  at 0.400 s  at 0.680 s');
for (const L of [0.676, 0.7, 0.8, 0.849]) {
  const m = 73;
  const I = m * L * L;
  const kk = 800 - m * 9.81 * L;
  const w = Math.sqrt(Math.max(1e-9, kk) / I);
  const z = 80 / (2 * Math.sqrt(Math.max(1e-9, kk) * I));
  out(`  ${pad(f(L, 3), 6)}  ${pad(f(m, 1), 6)}  ${pad(f(kk, 1), 6)}  ${pad(f(I, 2), 6)}  ${pad(f(w, 3), 7)}  ${pad(f((2 * Math.PI) / w, 3), 6)}  ${pad(f(z, 3), 5)}  ${pad(f(100 * stepAt(w, z, 0.05), 1), 10)}  ${pad(f(100 * stepAt(w, z, 0.1), 1), 10)}  ${pad(f(100 * stepAt(w, z, 0.2), 1), 10)}  ${pad(f(100 * stepAt(w, z, 0.4), 1), 10)}  ${f(100 * stepAt(w, z, 0.68), 1)} %`);
}

out('');
out('## §6 The collected headline, one row an arm');
out('');
out('  file/arm        tip fired  bind share  median ride  roll peak  rate med  follow-gain-1 lag (s)');
for (const h of heads) {
  const fo = follows.find((x) => x.label === h.label && x.arm === h.arm);
  out(`  ${pad(`${h.label}/${h.arm}`, 14)}  ${pad(`${h.tip}/${h.riders}`, 9)}  ${pad(`${f(h.bindShare, 1)} %`, 10)}  ${pad(f(h.ride, 3), 11)}  ${pad(f(h.rollPeak, 2), 9)}  ${pad(f(h.rate, 2), 8)}  ${f((fo?.cross ?? Number.NaN) / 60, 4)}`);
}
out('');
out('# end');
