/**
 * **Step 3.4e: the datum in both places, and the mount agreeing with itself.** Step 3.4d's own step-five items 1 and
 * 2 — *"the datum, in both places at once … both switches already exist"* and *"the body is placed square to the deck
 * on the argument that the felt vertical is the face's normal … below 4 m/s the rule flips. Make the mount agree with
 * itself."*
 *
 * Read-only. It reads the three `.jsonl` dumps `3.3/plant.ts` writes (per run, `TICKS=` per control tick, `MOUNT=`
 * per FRAME from frame 1) and imports **nothing** from `src/`, so no number here can move the game.
 *
 * ## The instruments, and what each one is
 *
 * **1. The trim the loop holds, as a column rather than an inference.** Step 3.4d measured `|φ_ref|` at **exactly
 * 0.0000°** at every one of 18 182 frames of eight arms and read it as the datum defect in the reference. The
 * `MOUNT` dump already carries `refPhi`, so this round reads the same column on the arms that move the reference and
 * prints it beside the face's own tilt under the board. **This is the read that settles whether "both places at
 * once" is a thing that already exists**: if the trim moves to the face on `WHEEL=tilt`, it does.
 *
 * **2. The rows, FILTERED AND UNFILTERED, on two different quantities that must not be confused.**
 * - `rollRel` — the roll row of **the model that arm actually ran**, which on a `WHEEL` arm includes its own tilt
 *   input (`plant.ts` adds `Γ_d · tilt` to the one-step prediction, by the controller's own line). This is the
 *   quantity "what does the datum correction do to the rows" is about, and it is a **different model on a different
 *   trajectory** in each arm.
 * - `relFull` — the **shipped** plant rebuilt at the controller's own exact point on that arm's trajectory. The same
 *   model everywhere, so it isolates "where on the wave did this arm's ride go" from "what model did it run".
 * Both are printed, both labelled, for every arm, over `t ≤ 0.2 s` (the mount, which the folder's `live` filter has
 * excluded since 3.3k) and over every later age bin, and **both under each filter**.
 *
 * **3. The mount's own frame 1, per entry speed.** The owner's own low cell is six entries set absolutely, and
 * step 3.4d measured the placement rule flipping at `PLANING_SPEED = 4`: nine runs mounted with the body plumb to the
 * world and nine square to the deck, 8.37° apart. The `MOUNT` dump's frame-1 row carries the body's bank, the
 * board's roll, the face's tilt, the board's own heel and the felt vertical's size and angle across the deck, so the
 * two halves of `?mountAgree` are read where they act.
 *
 * **4. The falls, as a separate fact, on the folder's own median convention.** `qt(v, 0.5)`, the upper element of
 * the middle pair — not the pair's mean, which would print 0.950 where the folder prints 1.033 for the same
 * eighteen numbers (3.4d §10's last bullet).
 *
 * **5. The controls.** The two shipped-datum, shipped-mount arms of this round against step 3.4d's own `two-off-`
 * arms, column by column over every shared column, which is the read that says this round's switches change no ride
 * with them off.
 *
 * Run from the repository's root, after the arms:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/datum.ts -o <scratch>/dt.mjs --format esm --platform node
 *   DIR=docs/research/new-rider/3.4/results/34e node <scratch>/dt.mjs > .../34e-summary.txt
 *
 * Env: `DIR` (this round's results folder), `OLD` (step 3.4d's, for the controls), `ARMS` (comma-separated).
 */
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const DIR = process.env.DIR ?? 'docs/research/new-rider/3.4/results/34e';
const OLD = process.env.OLD ?? 'docs/research/new-rider/3.4/results/34d';
const ARMS = (process.env.ARMS ?? 'g-off,g-predict,g-ref,g-tilt,g-mdeck,g-mfelt,g-mboth,g-all,l-off,l-predict,l-ref,l-tilt,l-mdeck,l-mfelt,l-mboth,l-all').split(',');

type Row = Record<string, number | string | null>;

function load(path: string): Row[] {
  const text = existsSync(path) ? readFileSync(path, 'utf8')
    : existsSync(`${path}.gz`) ? gunzipSync(readFileSync(`${path}.gz`)).toString('utf8') : '';
  return text.split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as Row);
}
const arm = (a: string, kind: 'ticks' | 'mount' | '') => load(kind ? `${DIR}/${a}.${kind}.jsonl` : `${DIR}/${a}.jsonl`);
const num = (r: Row, k: string): number => {
  const v = r[k];
  return typeof v === 'number' ? v : Number.NaN;
};
/** The geometric mean of `|x|` over the finite non-zero entries — 3.4d's own helper, same line. */
function gm(v: number[]): number {
  const w = v.filter((x) => Number.isFinite(x) && Math.abs(x) > 0).map(Math.abs);
  if (!w.length) return Number.NaN;
  return Math.exp(w.reduce((a, x) => a + Math.log(x), 0) / w.length);
}
/**
 * **`3.3/plant.ts`'s own convention, deliberately**: `qt(v, 0.5)` is `s[floor(0.5 n)]`, the UPPER element of the
 * middle pair on an even list. The whole folder's published medians are that quantile (3.4d §10's last bullet).
 */
function median(v: number[]): number {
  const w = v.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!w.length) return Number.NaN;
  return w[Math.min(w.length - 1, Math.floor(0.5 * w.length))];
}
function peak(v: number[]): number {
  const w = v.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return w.length ? w[w.length - 1] : Number.NaN;
}
const share = (v: boolean[]) => (v.length ? v.filter(Boolean).length / v.length : Number.NaN);
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : 'nan');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);
const row = (cells: string[], w = 11) => out(cells.map((s, i) => pad(s, i ? w : 10)).join(''));

const AGE: [number, number][] = [[0, 0.2], [0.2, 0.6], [0.6, 1.0], [1.0, 1.5], [1.5, 3.0], [3.0, 99]];

/** Split a dump into runs on the time resetting — 3.4d's own helper. */
function runsOf(rows: Row[]): Row[][] {
  const o: Row[][] = [];
  let cur: Row[] = [];
  let prev = Number.NaN;
  for (const r of rows) {
    const t = num(r, 't');
    if (Number.isFinite(prev) && t < prev - 1e-9) { o.push(cur); cur = []; }
    cur.push(r); prev = t;
  }
  if (cur.length) o.push(cur);
  return o;
}

// ===================== 1. the trim the loop holds =====================
out('\n\n========== 1. THE TRIM THE LOOP HOLDS, as a column — |phi_ref| beside the face\'s own tilt ==========');
out('Every frame of every run of the arm, from frame 1. The model\'s sign is phi = -roll, so the trim that would be');
out('"the board flush with the face" is -tilt. 3.4d measured |phi_ref| EXACTLY 0.0000 at 18 182 frames with the');
out('datum off; these are the same column on the arms that move the reference.');
row(['arm', 'frames', '|ref| med', '|ref| peak', '|ref| fr1', 'tilt fr1', 'ref/-tilt', 'exactly 0']);
for (const a of ARMS) {
  const m = arm(a, 'mount');
  if (!m.length) continue;
  const rs = runsOf(m);
  const one = rs.map((r) => r[0]);
  const refs = m.map((r) => Math.abs(num(r, 'refPhi')));
  row([a, `${m.length}`, f(median(refs), 4), f(peak(refs), 3), f(median(one.map((r) => Math.abs(num(r, 'refPhi')))), 4),
    f(median(one.map((r) => num(r, 'tilt'))), 4),
    f(median(one.map((r) => num(r, 'refPhi') / -num(r, 'tilt'))), 4), f(share(m.map((r) => num(r, 'refPhi') === 0)), 3)]);
}

// ===================== 2. the rows, filtered and unfiltered =====================
function rows(a: string, key: 'rollRel' | 'relFull', liveOnly: boolean): void {
  const t = arm(a, 'ticks');
  const rs = liveOnly ? t.filter((r) => num(r, 'live') === 1) : t;
  if (!rs.length) return;
  out(`\n--- ${a}, ${key === 'rollRel' ? 'THE MODEL THIS ARM RAN (rollRel)' : 'the SHIPPED plant on this arm\'s ride (relFull)'}, ${liveOnly ? 'LIVE ONLY (the folder\'s own filter, t>0.2 && clamped==0)' : 'UNFILTERED, from frame 1'} — ${rs.length} ticks`);
  row(['age s', 'n', 'gm rel', 'gm|err|', 'gm|game|', 'gm|model|', 'm over g', 'gm|tilt|', 'gm|roll|']);
  const acc = key === 'rollRel' ? 'rollAccModel' : 'rollAccFull';
  for (const [lo, hi] of AGE) {
    const w = rs.filter((r) => num(r, 't') >= lo && num(r, 't') < hi);
    if (!w.length) continue;
    row([`${f(lo, 1)}-${f(hi, 1)}`, `${w.length}`, f(gm(w.map((r) => num(r, key))), 3),
      f(gm(w.map((r) => num(r, acc) - num(r, 'rollAccGame')))), f(gm(w.map((r) => num(r, 'rollAccGame')))),
      f(gm(w.map((r) => num(r, acc)))),
      f(share(w.map((r) => Math.abs(num(r, acc)) > Math.abs(num(r, 'rollAccGame')))), 3),
      f(gm(w.map((r) => num(r, 'tilt'))), 2), f(gm(w.map((r) => num(r, 'roll'))), 2)]);
  }
}
out('\n\n========== 2. THE ROWS, PER ARM, FILTERED AND UNFILTERED, ON BOTH QUANTITIES ==========');
for (const a of ARMS) { rows(a, 'rollRel', false); rows(a, 'rollRel', true); }
out('\n\n----- the same arms on the SHIPPED plant rebuilt at the controller\'s point (relFull): the same model on each');
out('----- arm\'s own trajectory, so this column separates "which model" from "where on the wave the ride went".');
for (const a of ARMS) { rows(a, 'relFull', false); rows(a, 'relFull', true); }

// ===================== 2b. the mount's window, every arm on one page =====================
out('\n\n========== 2b. THE MOUNT\'S OWN WINDOW (t <= 0.2 s) ON ONE PAGE, unfiltered against the folder\'s filter =====');
out('The folder\'s `live` filter is `t > 0.2 && clamped === 0`, so its own column here is EMPTY by construction for');
out('the mount; the comparison the filter hides is the mount against the arm\'s first live bin (0.2-0.6 s).');
row(['arm', 'n mount', 'rel mount', 'rel .2-.6', 'ratio', 'gm|err| mt', 'gm|game| mt', 'm over g', 'ph/game mt']);
for (const a of ARMS) {
  const t = arm(a, 'ticks');
  if (!t.length) continue;
  const mt = t.filter((r) => num(r, 't') <= 0.2);
  const nx = t.filter((r) => num(r, 't') > 0.2 && num(r, 't') < 0.6 && num(r, 'live') === 1);
  const relM = gm(mt.map((r) => num(r, 'rollRel')));
  const relN = gm(nx.map((r) => num(r, 'rollRel')));
  row([a, `${mt.length}`, f(relM, 3), f(relN, 3), f(relM / relN, 2),
    f(gm(mt.map((r) => num(r, 'rollAccModel') - num(r, 'rollAccGame')))), f(gm(mt.map((r) => num(r, 'rollAccGame')))),
    f(share(mt.map((r) => Math.abs(num(r, 'rollAccModel')) > Math.abs(num(r, 'rollAccGame')))), 3),
    f(gm(mt.map((r) => (num(r, 'rollAccFull') - num(r, 'rollAccTilt')) / num(r, 'rollAccGame'))), 1)]);
}

// ===================== 3. the falls =====================
out('\n\n========== 3. THE FALLS, the owner\'s bar, on the folder\'s own median convention ==========');
row(['arm', 'runs', 'fell', 'median', 'min', 'max', 'Comp fell', 'Comp med', 'low1-3 med'], 12);
for (const a of ARMS) {
  const r = arm(a, '');
  if (!r.length) continue;
  const end = (x: Row) => num(x, 'fellAt');
  const all = r.map(end);
  const comp = r.filter((x) => x.stance === 'compress');
  const slow = r.filter((x) => num(x, 'entryAsked') <= 3);
  row([a, `${r.length}`, `${r.filter((x) => Number.isFinite(end(x))).length}`, f(median(all), 3),
    f(Math.min(...all.filter(Number.isFinite)), 3), f(peak(all), 3),
    `${comp.filter((x) => Number.isFinite(end(x))).length} of ${comp.length}`, f(median(comp.map(end)), 3),
    slow.length ? f(median(slow.map(end)), 3) : '-'], 12);
}

// ===================== 4. the mount's frame 1 =====================
out('\n\n========== 4. THE MOUNT\'S OWN FRAME 1 — the body\'s placement and the felt vertical ==========');
out('Per arm, and on the low cell per entry speed, because PLANING_SPEED = 4 and the entries are set absolutely.');
row(['arm', 'entry', 'runs', 'roll', 'tilt', 'heel', 'BANK', 'bank/roll', 'feltAcross', 'feltMag'], 11);
for (const a of ARMS) {
  const m = arm(a, 'mount');
  if (!m.length) continue;
  const one = runsOf(m).map((r) => r[0]);
  const byEntry = new Map<string, Row[]>();
  for (const r of one) {
    const k = Number.isFinite(num(r, 'entryAsked')) ? f(num(r, 'entryAsked'), 0) : 'all';
    byEntry.set(k, [...(byEntry.get(k) ?? []), r]);
  }
  for (const [k, w] of [...byEntry].sort((p, q) => p[0].localeCompare(q[0]))) {
    row([a, k, `${w.length}`, f(median(w.map((r) => num(r, 'roll'))), 3), f(median(w.map((r) => num(r, 'tilt'))), 3),
      f(median(w.map((r) => num(r, 'rail'))), 3), f(median(w.map((r) => num(r, 'bank'))), 3),
      f(median(w.map((r) => num(r, 'bank') / num(r, 'roll'))), 3),
      f(median(w.map((r) => num(r, 'feltAcross'))), 3), f(median(w.map((r) => num(r, 'feltMag'))), 3)], 11);
  }
}

// ===================== 5. the mount's settling reads =====================
out('\n\n========== 5. THE MOUNT\'S SETTLING READS — when each of its disagreements is over ==========');
out('"felt within 1 deg of the face\'s normal": the first frame at which |feltAcross - (-rail)| < 1 deg, i.e. the felt');
out('vertical read on the deck agrees with the face\'s normal read on the deck. "heel > tilt": 3.4d\'s own crossover.');
row(['arm', 'runs', 'felt<1deg', 'of runs', 'heel>tilt', 'of runs', 'first send', 'of runs'], 12);
for (const a of ARMS) {
  const m = arm(a, 'mount');
  if (!m.length) continue;
  const rs = runsOf(m);
  const firstAt = (pred: (r: Row) => boolean) => {
    const ts = rs.map((run) => { const hit = run.find(pred); return hit ? num(hit, 't') : Number.NaN; });
    return [median(ts), share(ts.map(Number.isFinite))] as const;
  };
  const [fe, feN] = firstAt((r) => Math.abs(num(r, 'feltAcross') + num(r, 'rail')) < 1);
  const [he, heN] = firstAt((r) => Math.abs(num(r, 'rail')) > Math.abs(num(r, 'tilt')));
  const [se, seN] = firstAt((r) => num(r, 'sent0') !== 0);
  row([a, `${rs.length}`, f(fe, 3), f(feN, 3), f(he, 3), f(heN, 3), f(se, 3), f(seN, 3)], 12);
}

// ===================== 6. the controls =====================
out('\n\n========== 6. THE CONTROLS ==========');
out('C1. This round\'s two shipped-datum, shipped-mount arms against step 3.4d\'s own `two-off-` arms, column by');
out('column over every shared column of the per-run summary. `wheel` and `mount` are this round\'s own two new');
out('columns and are excluded by name, which is stated rather than hidden.');
for (const [mine, theirs] of [['g-off', 'two-off-unsteered'], ['l-off', 'two-off-low']] as const) {
  const a = arm(mine, '');
  const b = load(`${OLD}/34d-${theirs}.jsonl`);
  const skip = new Set(['wheel', 'mount']);
  let cols = 0; let diff = 0; const names: string[] = [];
  if (a.length !== b.length) { out(`  ${mine} vs 34d-${theirs}: DIFFERENT RUN COUNTS ${a.length} vs ${b.length}`); continue; }
  for (let i = 0; i < a.length; i += 1) {
    for (const k of Object.keys(b[i])) {
      if (skip.has(k)) continue;
      cols += 1;
      if (JSON.stringify(a[i][k]) !== JSON.stringify(b[i][k])) { diff += 1; if (names.length < 8) names.push(`${k}@run${i}`); }
    }
  }
  out(`  ${mine} vs 34d-${theirs}: ${a.length} runs, ${cols} column reads, ${diff} differing${diff ? ` — ${names.join(', ')}` : ''}`);
}
out('\nC2. The folder\'s own closures on every arm of this round (peaks over all arms): the sense reconstruction, the');
out('tick spacing and the ledger\'s split, closure and residual. **`ledgerApart` is NOT one of them** and is printed');
out('apart with its meaning: it is a COUNT of substeps the standing solve did not decide, not a residual, so a 16');
out('there is sixteen substeps and not a closure of 16.');
const keys = ['senseOff', 'spacingOff', 'ledgerSplit', 'ledgerClosure', 'ledgerResidual'] as const;
const worst: Record<string, number> = {};
for (const a of ARMS) for (const r of arm(a, '')) for (const k of keys) worst[k] = Math.max(worst[k] ?? 0, Math.abs(num(r, k)) || 0);
for (const k of keys) out(`  ${k}: ${(worst[k] ?? 0).toExponential(2)}`);
let apartMax = 0;
for (const a of ARMS) for (const r of arm(a, '')) apartMax = Math.max(apartMax, num(r, 'ledgerApart') || 0);
out(`  ledgerApart (a COUNT of substeps, peak over all arms): ${apartMax}`);

// ===================== 7. the predictions, read PER RUN rather than per median =====================
out('\n\n========== 7. THE PREDICTIONS THAT ARE PER-RUN CLAIMS, read per run ==========');
out('P6: `mountAgree=deck` puts the 1-3 m/s entries within 0.5 deg of the 8.70-8.72 deg the 4-6 m/s entries start at.');
for (const [a, b] of [['l-off', 'l-mdeck'], ['l-off', 'l-mboth']] as const) {
  const fast = runsOf(arm(a, 'mount')).map((r) => r[0]).filter((r) => num(r, 'entryAsked') >= 4).map((r) => num(r, 'bank'));
  const lo = Math.min(...fast); const hi = Math.max(...fast);
  const slowOff = runsOf(arm(a, 'mount')).map((r) => r[0]).filter((r) => num(r, 'entryAsked') <= 3).map((r) => num(r, 'bank'));
  const slowOn = runsOf(arm(b, 'mount')).map((r) => r[0]).filter((r) => num(r, 'entryAsked') <= 3).map((r) => num(r, 'bank'));
  const within = slowOn.filter((v) => v >= lo - 0.5 && v <= hi + 0.5).length;
  out(`  ${b}: the 4-6 m/s band is ${f(lo, 3)}-${f(hi, 3)} deg; the nine 1-3 m/s runs go from [${f(Math.min(...slowOff), 3)}, ${f(Math.max(...slowOff), 3)}] to [${f(Math.min(...slowOn), 3)}, ${f(Math.max(...slowOn), 3)}] — within 0.5 deg of the band in ${within} of ${slowOn.length}`);
}
out('P7: `mountAgree=felt` puts the felt vertical across the deck inside 1.5 deg at frame 1, and its magnitude ...');
for (const a of ['g-mfelt', 'g-mboth', 'l-mfelt', 'l-mboth', 'g-off', 'l-off'] as const) {
  const one = runsOf(arm(a, 'mount')).map((r) => r[0]);
  const ac = one.map((r) => Math.abs(num(r, 'feltAcross')));
  const mg = one.map((r) => num(r, 'feltMag'));
  out(`  ${pad(a, 9)}: |feltAcross| at frame 1 ${f(Math.min(...ac), 3)}-${f(Math.max(...ac), 3)} deg, inside 1.5 in ${ac.filter((v) => v < 1.5).length} of ${ac.length}; feltMag ${f(Math.min(...mg), 3)}-${f(Math.max(...mg), 3)} m/s^2 (the SEED is g cos tilt = 9.694, and this column is frame 1, which is already low-passed)`);
}
out('P5: the mount\'s window against the WHOLE live population of the same arm, which is what the prediction said.');
row(['arm', 'rel mount', 'rel all live', 'ratio'], 14);
for (const a of ARMS) {
  const t = arm(a, 'ticks');
  if (!t.length) continue;
  const mt = gm(t.filter((r) => num(r, 't') <= 0.2).map((r) => num(r, 'rollRel')));
  const lv = gm(t.filter((r) => num(r, 'live') === 1).map((r) => num(r, 'rollRel')));
  row([a, f(mt, 3), f(lv, 3), f(mt / lv, 2)], 14);
}
out('\nC3. Every arm\'s run count and the population every number above is drawn from.');
for (const a of ARMS) {
  const r = arm(a, '');
  const t = arm(a, 'ticks');
  const m = arm(a, 'mount');
  out(`  ${pad(a, 10)}: ${r.length} runs, ${t.length} ticks (${t.filter((x) => num(x, 'live') === 1).length} live), ${m.length} frames`);
}
