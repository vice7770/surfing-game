/**
 * **Step 3.4f: the interaction.** Step 3.4e's own step-six item 1 — *"The interaction, not another datum. Two halves
 * that each help and together hurt is the round's one new fact and it is the shape of a cancellation. The instrument
 * exists — Part 4 §5's own term table, run on the four datum arms instead of the shipped one. A measurement, one
 * round."*
 *
 * The fact to explain, glide medians over 24 runs an arm on the two-body plant the owner rides: the datum
 * **off 1.450 s**, the **prediction alone 4.033**, the **reference alone 3.683**, **both 0.683**.
 *
 * Read-only. It reads the three `.jsonl` dumps `3.3/plant.ts` writes (per run, `TICKS=` per control tick, `MOUNT=`
 * per FRAME from frame 1) and imports **nothing** from `src/`, so no number here can move the game.
 *
 * ## The instruments, and what each one is
 *
 * **1. The brief's own named instrument: Part 4 §5's term table on the four datum arms.** The model's water, ankle
 * and rest terms against the game's own three, the model's whole row, the game's whole row and the **phantom heel**
 * (`rollAccFull − rollAccTilt`, exactly one column of the plant times the face's tilt), per age bin, per arm,
 * **filtered and unfiltered**, on the shipped plant **and** on the two-body plant the owner rides. Part 4 ran it on
 * one arm; this runs it on four and on both cells, which is the brief.
 *
 * **2. The datum's two halves where the controller's own last line puts them** (`plant.ts`'s own 3.4f columns, whose
 * algebra is in that file's `Tick` comment). `rowTiltPred` is the prediction half's whole reach into the command in
 * the roll row's units, `rowTiltRef` the reference half's (split into the feedforward it moves and the error it
 * moves), and `rowTiltBoth` their **sum**, which is an identity at a fixed state. So `cancelShare`,
 * `|rowTiltBoth| / max(|rowTiltPred|, |rowTiltRef|)`, is **1 when the two halves neither help nor hurt each other,
 * under 1 when they cancel and over 1 when they reinforce.** The brief says cancellation; this column is the
 * measurement of which it is.
 *
 * **3. What the loop then does with it — the error signal and the overshoot.** The `MOUNT` dump carries `refPhi`
 * (the trim the loop holds), `estPhi` (the estimate it acts on), `truePhi` (the state it is in) and `sent0` (the
 * command it sent) per frame from frame 1, so the loop's own error `estPhi − refPhi`, the true tracking error
 * `truePhi − refPhi` and the **ankle's own bound** are read where the arms differ. The overshoot is read **per run**
 * and not per median: whether, and when, the board's roll crosses zero — the board going through level and onto the
 * other rail.
 *
 * **4. The face sweep, which is the mechanism's own positive control.** Both reaches are proportional to the face's
 * own tilt by construction (`Δx̂ ∝ τ` and `drive ∝ τ`, both linear [R]), so the face is the one parameter the
 * mechanism lives on. The same four arms on `FACE=1.4,8,5.7` and `FACE=1.4,24,5.7`, predicted in
 * `results/34f/34f-predictions.md` before they ran.
 *
 * **5. The falls, on the folder's own median convention.** `qt(v, 0.5)`, the upper element of the middle pair.
 *
 * **6. The controls.** This round's shipped-datum arms against step 3.4e's own, column by column; the three closures
 * the new columns carry (the flag's reach into the design, the flat equilibrium's origin, `steadyTurn`'s
 * superposition); and the folder's own five.
 *
 * Run from the repository's root, after the arms:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/cancel.ts -o <scratch>/cn.mjs --format esm --platform node
 *   DIR=<scratch>/arms node <scratch>/cn.mjs > .../34f-summary.txt
 *
 * Env: `DIR` (this round's arms), `OLD` (step 3.4e's results, for the controls), `ARMS`, `FACES`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const DIR = process.env.DIR ?? 'docs/research/new-rider/3.4/results/34f/arms';
const OLD = process.env.OLD ?? 'docs/research/new-rider/3.4/results/34e';
const ARMS = (process.env.ARMS ?? 'g-off,g-predict,g-ref,g-tilt,l-off,l-predict,l-ref,l-tilt').split(',');
const FACES = (process.env.FACES ?? 's8-off,s8-predict,s8-ref,s8-tilt,s24-off,s24-predict,s24-ref,s24-tilt').split(',');
/** The `?ankleRange=wide` arms: the one switch that separates "too big a correction" from "it does not fit". */
const WIDE = (process.env.WIDE ?? 'g-off-wide,g-predict-wide,g-ref-wide,g-tilt-wide,l-off-wide,l-tilt-wide').split(',');
/** The two `GAINS`-off control arms, which are C1's honest comparison (see §7). */
const CTRL = (process.env.CTRL ?? 'g-off-nog,l-off-nog').split(',');
const EVERY = [...ARMS, ...FACES, ...WIDE, ...CTRL];

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
/** The geometric mean of `|x|` over the finite non-zero entries — 3.4d's and 3.4e's own helper, same line. */
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
const share = (v: boolean[]) => (v.length ? v.filter(Boolean).length / v.length : Number.NaN);
const f = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : 'nan');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);
const row = (cells: string[], w = 11) => out(cells.map((s, i) => pad(s, i ? w : 11)).join(''));

const AGE: [number, number][] = [[0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 1.0], [1.0, 1.5], [1.5, 3.0], [3.0, 99]];

/** Split a dump into runs on the time resetting — 3.4d's and 3.4e's own helper. */
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

// ============ 1. the brief's named instrument: Part 4 §5's term table, on the four datum arms ============
out('\n\n========== 1. PART 4 §5\'s OWN TERM TABLE, on the four datum arms (the brief\'s named instrument) ==========');
out('The model\'s three terms are the gap plus the game\'s own source, which is how the dump carries them, so');
out('"M water" is `eWater + gWaterBoard` exactly. "phantom" is `rollAccFull - rollAccTilt`: one column of the plant');
out('times the face\'s own tilt, `heelColumn` imported and not reimplemented. gm |°/s²| throughout.');
function terms(a: string, two: boolean, liveOnly: boolean): void {
  const t = arm(a, 'ticks');
  const rs = liveOnly ? t.filter((r) => num(r, 'live') === 1) : t;
  if (!rs.length) return;
  out(`\n--- ${a}, ${two ? 'the TWO-BODY plant (the one the owner rides)' : 'the SHIPPED plant rebuilt at the controller\'s point'}`
    + `, ${liveOnly ? 'LIVE ONLY (t>0.2 && clamped==0)' : 'UNFILTERED from frame 1'} — ${rs.length} ticks`);
  row(['age s', 'n', 'M water', 'M ankle', 'M rest', 'M row', 'G water', 'G ankle', 'G rest', 'G row', 'phantom', 'ph/Mwater', 'gm|tilt|']);
  const mRow = two ? 'rollAccTwo' : 'rollAccFull';
  for (const [lo, hi] of AGE) {
    const w = rs.filter((r) => num(r, 't') >= lo && num(r, 't') < hi);
    if (w.length < 20) continue;
    const mw = w.map((r) => (two ? num(r, 'mWaterAllTwo') : num(r, 'eWater') + num(r, 'gWaterBoard')));
    const ph = w.map((r) => num(r, 'rollAccFull') - num(r, 'rollAccTilt'));
    row([`${f(lo, 1)}-${f(hi, 1)}`, `${w.length}`, f(gm(mw), 0),
      f(gm(w.map((r) => (two ? num(r, 'mAnkleTwo') : num(r, 'eAnkle') + num(r, 'gAnkleSrc')))), 0),
      f(gm(w.map((r) => (two ? num(r, 'mRestTwo') : num(r, 'eRest') + num(r, 'gRestSrc')))), 0),
      f(gm(w.map((r) => num(r, mRow))), 0),
      f(gm(w.map((r) => num(r, 'gWaterBoard'))), 0), f(gm(w.map((r) => num(r, 'gAnkleSrc'))), 0),
      f(gm(w.map((r) => num(r, 'gRestSrc'))), 0), f(gm(w.map((r) => num(r, 'rollAccGame'))), 0),
      f(gm(ph), 0), f(gm(ph.map((p, i) => p / mw[i])), 2), f(gm(w.map((r) => num(r, 'tilt'))), 2)]);
  }
}
for (const a of ARMS) { terms(a, false, false); terms(a, true, false); }
out('\n--- the same four arms on the folder\'s own `live` filter, so the window is labelled and never pooled');
for (const a of ARMS) terms(a, false, true);

out('\n\n--- 1b. THE MOUNT\'S OWN WINDOW ON ONE PAGE: the terms, and the SIGNED medians, which is what a');
out('--- cancellation or a reinforcement in the ROW would have to show. Unfiltered, from frame 1.');
row(['arm', 'n', 'M water', 'G water', 'phantom', 'M row', 'G row', 'gm|err|', 'sgnMwater', 'sgnGwater', 'sgnPhant', 'ph/Grow']);
for (const a of ARMS) {
  const t = arm(a, 'ticks').filter((r) => num(r, 't') <= 0.2);
  if (!t.length) continue;
  const mw = t.map((r) => num(r, 'eWater') + num(r, 'gWaterBoard'));
  const ph = t.map((r) => num(r, 'rollAccFull') - num(r, 'rollAccTilt'));
  row([a, `${t.length}`, f(gm(mw), 0), f(gm(t.map((r) => num(r, 'gWaterBoard'))), 0), f(gm(ph), 0),
    f(gm(t.map((r) => num(r, 'rollAccFull'))), 0), f(gm(t.map((r) => num(r, 'rollAccGame'))), 0),
    f(gm(t.map((r) => num(r, 'rollAccFull') - num(r, 'rollAccGame'))), 0),
    f(median(mw), 0), f(median(t.map((r) => num(r, 'gWaterBoard'))), 0), f(median(ph), 0),
    f(gm(ph.map((p, i) => p / num(t[i], 'rollAccGame'))), 1)]);
}

// ============ 2. the two halves where the command's own line puts them ============
out('\n\n========== 2. THE DATUM\'S TWO HALVES IN THE COMMAND, at the exact point, in the roll row\'s units ==========');
out('`rowTiltPred` is the prediction half\'s whole reach into the command (-K dxHat), `rowTiltRef` the reference');
out('half\'s (its feedforward `FF` plus the error it moves `FB`), and `rowTiltBoth` their SUM, which is an identity');
out('at a fixed state [R, plant.ts\'s own Tick comment]. So `cancelShare = |both| / max(|pred|,|ref|)` is 1 for no');
out('interaction, UNDER 1 for a cancellation and OVER 1 for a reinforcement. `sameSign` is the share of ticks on');
out('which K dxHat and K dxRef share a sign — on which the two CONTRIBUTIONS would subtract.');
out('These columns are a decomposition AT A POINT on each arm\'s own trajectory. They are not a trajectory claim:');
out('a moved trim sends different commands and the commands enter the forward prediction (3.4e\'s own refutation).');
function halves(a: string, win: 'mount' | 'live' | 'all'): void {
  const t0 = arm(a, 'ticks');
  const t = win === 'mount' ? t0.filter((r) => num(r, 't') <= 0.2) : win === 'live' ? t0.filter((r) => num(r, 'live') === 1) : t0;
  if (!t.length) return;
  row([a, win, `${t.length}`, f(gm(t.map((r) => num(r, 'rowTiltPred'))), 0), f(gm(t.map((r) => num(r, 'rowTiltRefFF'))), 0),
    f(gm(t.map((r) => num(r, 'rowTiltRefFB'))), 0), f(gm(t.map((r) => num(r, 'rowTiltRef'))), 0),
    f(gm(t.map((r) => num(r, 'rowTiltBoth'))), 0), f(gm(t.map((r) => num(r, 'cancelShare'))), 3),
    f(share(t.map((r) => num(r, 'tiltSameSign') === 1)), 3),
    f(gm(t.map((r) => num(r, 'dxHatPhi'))), 3), f(gm(t.map((r) => num(r, 'dxRefPhi'))), 3),
    f(gm(t.map((r) => num(r, 'dxRefPhi') / num(r, 'dxHatPhi'))), 3),
    f(gm(t.map((r) => num(r, 'kDxRefA') / num(r, 'kDxHatA'))), 3),
    f(gm(t.map((r) => num(r, 'predOverRoom'))), 3), f(gm(t.map((r) => num(r, 'refOverRoom'))), 3)], 11);
}
row(['arm', 'window', 'n', 'pred', 'refFF', 'refFB', 'ref', 'BOTH', 'cancelSh', 'sameSign', '|dxHatPhi|', '|dxRefPhi|', 'dxRef/dxH', 'kRef/kHat', 'pred/room', 'ref/room'], 11);
for (const a of ARMS) { halves(a, 'mount'); halves(a, 'live'); halves(a, 'all'); }

// ============ 3. what the loop does with it: the error signal, the bound, the overshoot ============
out('\n\n========== 3. WHAT THE LOOP DOES WITH IT — the error it acts on, the bound, and the overshoot ==========');
out('Per FRAME from frame 1, medians over the arm\'s runs. The model\'s sign is phi = -roll, so a refPhi of -9.105');
out('is "the board rolled +9.105 into the face", which is the face\'s own tilt: the board flush with the face.');
for (const a of ARMS) {
  const m = arm(a, 'mount');
  if (!m.length) continue;
  const rs = runsOf(m);
  out(`\n--- ${a}: ${rs.length} runs, ${m.length} frames`);
  row(['fr', 't', 'truePhi', 'estPhi', 'refPhi', 'est-ref', 'true-ref', 'sent0', 'raw0', 'onBound', 'roll', 'tilt', 'rail'], 10);
  for (const fr of [1, 2, 4, 6, 7, 8, 10, 12, 18, 24, 36, 60]) {
    const w = rs.filter((r) => r.length >= fr).map((r) => r[fr - 1]);
    if (!w.length) continue;
    row([`${fr}`, f(median(w.map((r) => num(r, 't'))), 3), f(median(w.map((r) => num(r, 'truePhi'))), 3),
      f(median(w.map((r) => num(r, 'estPhi'))), 3), f(median(w.map((r) => num(r, 'refPhi'))), 3),
      f(median(w.map((r) => num(r, 'estPhi') - num(r, 'refPhi'))), 3),
      f(median(w.map((r) => num(r, 'truePhi') - num(r, 'refPhi'))), 3),
      f(median(w.map((r) => num(r, 'sent0'))), 5), f(median(w.map((r) => num(r, 'raw0'))), 5),
      f(share(w.map((r) => Math.abs(num(r, 'raw0')) > Math.abs(num(r, 'sent0')) + 1e-12)), 3),
      f(median(w.map((r) => num(r, 'roll'))), 3), f(median(w.map((r) => num(r, 'tilt'))), 3),
      f(median(w.map((r) => num(r, 'rail'))), 3), `n=${w.length}`], 10);
  }
}

out('\n\n--- 3b. THE OVERSHOOT, PER RUN AND NOT PER MEDIAN: the board\'s roll crossing zero is the board going');
out('--- THROUGH level and onto the other rail. "to -20" / "to -40" are per-run peaks of the roll past level.');
row(['arm', 'runs', 'crossed 0', 'at s (med)', 'to -20 in', 'to -40 in', 'peak -roll', 'gm|rollCmd| mt', 'gm|rail| all', 'median ride'], 13);
for (const a of ARMS) {
  const m = arm(a, 'mount');
  const t = arm(a, 'ticks');
  const rr = arm(a, '');
  if (!m.length) continue;
  const rs = runsOf(m);
  const crossAt = rs.map((run) => { const hit = run.find((r) => num(r, 'roll') < 0); return hit ? num(hit, 't') : Number.NaN; });
  const worst = rs.map((run) => Math.min(...run.map((r) => num(r, 'roll'))));
  row([a, `${rs.length}`, `${crossAt.filter(Number.isFinite).length} of ${rs.length}`, f(median(crossAt), 3),
    `${worst.filter((v) => v < -20).length} of ${rs.length}`, `${worst.filter((v) => v < -40).length} of ${rs.length}`,
    f(median(worst), 2), f(gm(t.filter((r) => num(r, 't') <= 0.2).map((r) => num(r, 'rollCmd'))), 1),
    f(gm(t.map((r) => num(r, 'roll') - num(r, 'tilt'))), 2), f(median(rr.map((r) => num(r, 'fellAt'))), 3)], 13);
}

// ============ 4. the falls ============
out('\n\n========== 4. THE FALLS, the owner\'s bar, on the folder\'s own median convention ==========');
function falls(list: string[]): void {
  row(['arm', 'runs', 'fell', 'median', 'min', 'max', 'Comp fell', 'Comp med', 'low1-3 med'], 12);
  for (const a of list) {
    const r = arm(a, '');
    if (!r.length) continue;
    const end = (x: Row) => num(x, 'fellAt');
    const all = r.map(end);
    const comp = r.filter((x) => x.stance === 'compress');
    const slow = r.filter((x) => num(x, 'entryAsked') <= 3);
    row([a, `${r.length}`, `${r.filter((x) => Number.isFinite(end(x))).length}`, f(median(all), 3),
      f(Math.min(...all.filter(Number.isFinite)), 3), f(Math.max(...all.filter(Number.isFinite)), 3),
      `${comp.filter((x) => Number.isFinite(end(x))).length} of ${comp.length}`, f(median(comp.map(end)), 3),
      slow.length ? f(median(slow.map(end)), 3) : '-'], 12);
  }
}
falls(ARMS);

// ============ 5. the face sweep, the mechanism's own positive control ============
out('\n\n========== 5. THE FACE SWEEP — the mechanism\'s own positive control, predicted before it ran ==========');
out('Both reaches are proportional to the face\'s own tilt by construction (dxHat and drive are both linear in tau');
out('[R]), so the face is the ONE parameter the mechanism lives on. The same four arms, the same glide cell, the');
out('same rider, on an 8-degree and a 24-degree face against the 16-degree one above.');
falls(FACES);
out('\n--- 5b-ii. the falls with the ankle\'s bound DOUBLED, against their own shipped-bound pairs in §4');
falls(WIDE);
out('\n--- the two halves and the reach, per face');
row(['arm', 'window', 'n', 'pred', 'refFF', 'refFB', 'ref', 'BOTH', 'cancelSh', 'sameSign', '|dxHatPhi|', '|dxRefPhi|', 'dxRef/dxH', 'kRef/kHat', 'pred/room', 'ref/room'], 11);
for (const a of [...FACES, ...WIDE]) halves(a, 'mount');
out('\n--- and the reach against the tilt it is proportional to: P13\'s own column');
row(['arm', 'n mount', 'gm|tilt| mt', 'gm|BOTH| mt', 'BOTH/tilt', 'gm|pred|', 'gm|ref|'], 14);
for (const a of [...FACES, ...ARMS, ...WIDE]) {
  const t = arm(a, 'ticks').filter((r) => num(r, 't') <= 0.2);
  if (!t.length) continue;
  const tl = gm(t.map((r) => num(r, 'tilt')));
  row([a, `${t.length}`, f(tl, 3), f(gm(t.map((r) => num(r, 'rowTiltBoth'))), 1),
    f(gm(t.map((r) => num(r, 'rowTiltBoth'))) / tl, 2), f(gm(t.map((r) => num(r, 'rowTiltPred'))), 1),
    f(gm(t.map((r) => num(r, 'rowTiltRef'))), 1)], 14);
}
out('\n--- the overshoot per face, per run');
row(['arm', 'runs', 'crossed 0', 'at s (med)', 'to -20 in', 'to -40 in', 'peak -roll', 'gm|rollCmd| mt', 'gm|rail| all', 'median ride'], 13);
for (const a of FACES) {
  const m = arm(a, 'mount');
  const t = arm(a, 'ticks');
  const rr = arm(a, '');
  if (!m.length) continue;
  const rs = runsOf(m);
  const crossAt = rs.map((run) => { const hit = run.find((r) => num(r, 'roll') < 0); return hit ? num(hit, 't') : Number.NaN; });
  const worst = rs.map((run) => Math.min(...run.map((r) => num(r, 'roll'))));
  row([a, `${rs.length}`, `${crossAt.filter(Number.isFinite).length} of ${rs.length}`, f(median(crossAt), 3),
    `${worst.filter((v) => v < -20).length} of ${rs.length}`, `${worst.filter((v) => v < -40).length} of ${rs.length}`,
    f(median(worst), 2), f(gm(t.filter((r) => num(r, 't') <= 0.2).map((r) => num(r, 'rollCmd'))), 1),
    f(gm(t.map((r) => num(r, 'roll') - num(r, 'tilt'))), 2), f(median(rr.map((r) => num(r, 'fellAt'))), 3)], 13);
}

// ============ 5b. the ankle's own bound, and the one switch that separates the two explanations ============
out('\n\n========== 5b. THE ANKLE\'S OWN BOUND — where the reinforcement lands, and `?ankleRange=wide` ==========');
out('The shipped bound is `ANKLE_REST_RANGE = 0.25 rad = 14.32°`, which is the rest at which the feet\'s centre of');
out('pressure reaches the sole\'s edge [R]. `raw0` is the command the loop ASKED for at frame 1 and `sent0` what the');
out('clamp let through, both in the MOUNT dump, so "ask / bound" is a read and not an inference. `?ankleRange=wide`');
out('doubles the bound to 0.5 rad (step 3.3k\'s own shipped switch, `ANKLE_RANGE_WIDE = 2`).');
row(['arm', 'runs', 'bound rad', 'raw0 fr1 lo', 'raw0 fr1 hi', 'ask/bound', 'onBound fr1', 'onBound fr1-12', 'median ride'], 14);
for (const a of [...ARMS, ...WIDE, ...FACES]) {
  const m = arm(a, 'mount');
  const t = arm(a, 'ticks');
  const rr = arm(a, '');
  if (!m.length) continue;
  const rs = runsOf(m);
  const one = rs.map((r) => r[0]);
  const bound = median(t.filter((r) => num(r, 't') <= 0.05).map((r) => num(r, 'ankleRoomHere')));
  const raws = one.map((r) => Math.abs(num(r, 'raw0')));
  const f12 = rs.flatMap((r) => r.slice(0, 12));
  const onB = (w: Row[]) => share(w.map((r) => Math.abs(num(r, 'raw0')) > Math.abs(num(r, 'sent0')) + 1e-12));
  row([a, `${rs.length}`, f(bound, 4), f(Math.min(...raws), 6), f(Math.max(...raws), 6),
    f(median(raws) / bound, 3), `${Math.round(onB(one) * rs.length)} of ${rs.length}`, f(onB(f12), 3),
    f(median(rr.map((r) => num(r, 'fellAt'))), 3)], 14);
}

// ============ 6. P9, read per run inside each arm and never across arms ============
out('\n\n========== 6. P9: the command against the ride, PER RUN INSIDE EACH ARM ==========');
out('Spearman of (a run\'s gm |rollCmd| over its first 0.5 s) against (its own fall time), within the arm. Four arm');
out('medians are four points and are NOT reported as a correlation anywhere in this round.');
row(['arm', 'runs', 'rho', 'gm|cmd| lo', 'gm|cmd| hi'], 14);
for (const a of EVERY) {
  const t = arm(a, 'ticks');
  const rr = arm(a, '');
  if (!t.length || !rr.length) continue;
  const runs = runsOf(t);
  if (runs.length !== rr.length) { out(`  ${a}: run counts differ (${runs.length} tick-runs vs ${rr.length} summaries) — skipped`); continue; }
  const xs = runs.map((run) => gm(run.filter((r) => num(r, 't') <= 0.5).map((r) => num(r, 'rollCmd'))));
  const ys = rr.map((r) => num(r, 'fellAt'));
  const ok = xs.map((_, i) => i).filter((i) => Number.isFinite(xs[i]) && Number.isFinite(ys[i]));
  const rank = (v: number[]) => { const s = v.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]); const o = new Array<number>(v.length); s.forEach(([, i], j) => { o[i] = j; }); return o; };
  const rx = rank(ok.map((i) => xs[i]));
  const ry = rank(ok.map((i) => ys[i]));
  const n = ok.length;
  const mx = rx.reduce((s, x) => s + x, 0) / n;
  const my = ry.reduce((s, x) => s + x, 0) / n;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i += 1) { sxy += (rx[i] - mx) * (ry[i] - my); sxx += (rx[i] - mx) ** 2; syy += (ry[i] - my) ** 2; }
  row([a, `${n}`, f(sxy / Math.sqrt(Math.max(1e-30, sxx * syy)), 3), f(Math.min(...ok.map((i) => xs[i])), 1), f(Math.max(...ok.map((i) => xs[i])), 1)], 14);
}

// ============ 7. the controls ============
out('\n\n========== 7. THE CONTROLS ==========');
out('C1. This round\'s shipped-datum arms against step 3.4e\'s own `g-off` and `l-off`, column by column over every');
out('shared column of the per-run summary. This round\'s five new summary columns are excluded BY NAME, stated');
out('rather than hidden.');
out('**And the comparison arms are the `-nog` ones, for a reason that is a measurement and not a convenience.**');
out('Step 3.4e ran its arms WITHOUT `GAINS=1`, so 37 of its summary columns are `null` by construction (the 13');
out('`gain*`/`cmdRebuild*` ones and the 24 `subst*` ones, 6 per cost arm). Comparing a `GAINS=1` arm against them');
out('prints 888 and 666 differences that are all `null` against a number, which is a flag and not a ride: the ride');
out('is identical, as the tick and frame counts and the fall medians below say. `g-off-nog` and `l-off-nog` are the');
out('same arms with the flag off, and they are the honest control. Both pairs are printed.');
const NEW_COLS = new Set(['heelDesignOffPeak', 'refFlatOffPeak', 'superOffPeak', 'cancelShareMed', 'tiltSameSignShare']);
for (const [mine, theirs] of [['g-off-nog', 'g-off'], ['l-off-nog', 'l-off'], ['g-off', 'g-off'], ['l-off', 'l-off']] as const) {
  const a = arm(mine, '');
  const b = load(`${OLD}/${theirs}.jsonl`);
  if (!a.length || !b.length) { out(`  ${mine}: missing a dump (${a.length} vs ${b.length})`); continue; }
  if (a.length !== b.length) { out(`  ${mine} vs 34e/${theirs}: DIFFERENT RUN COUNTS ${a.length} vs ${b.length}`); continue; }
  let cols = 0; let diff = 0; const names: string[] = [];
  for (let i = 0; i < a.length; i += 1) {
    for (const k of Object.keys(b[i])) {
      if (NEW_COLS.has(k)) continue;
      cols += 1;
      if (JSON.stringify(a[i][k]) !== JSON.stringify(b[i][k])) { diff += 1; if (names.length < 8) names.push(`${k}@run${i}`); }
    }
  }
  out(`  ${mine} vs 34e/${theirs}: ${a.length} runs, ${cols} column reads, ${diff} differing${diff ? ` — ${names.join(', ')}` : ''}`);
}
out('\nC1b. And the ride itself, read three ways on every arm of this round against step 3.4e\'s own: the tick count,');
out('the frame count and the fall median. These are the numbers a changed ride would move.');
row(['arm', 'ticks 34f', 'ticks 34e', 'frames 34f', 'frames 34e', 'median 34f', 'median 34e'], 13);
for (const a of ARMS) {
  const t = arm(a, 'ticks');
  const m = arm(a, 'mount');
  const rr = arm(a, '');
  const t0 = load(`${OLD}/${a}.ticks.jsonl`);
  const m0 = load(`${OLD}/${a}.mount.jsonl`);
  const r0 = load(`${OLD}/${a}.jsonl`);
  if (!t.length || !t0.length) continue;
  row([a, `${t.length}`, `${t0.length}`, `${m.length}`, `${m0.length}`,
    f(median(rr.map((r) => num(r, 'fellAt'))), 3), f(median(r0.map((r) => num(r, 'fellAt'))), 3)], 13);
}
out('\nC2/C3/C4, this round\'s own three closures, as PEAKS over every tick of every run of every arm:');
out('  C2 `heelDesignOff` — forcing `waterHeel` on moves no entry of Phi, Gamma or the LQR gain. The shipped');
out('     comment says so; this is the measurement of it.');
out('  C3 `refFlatOff` — with no lean asked and no drive, `steadyTurn`\'s equilibrium is the origin, exactly.');
out('  C4 `superOff` — the drive\'s own response is the same whatever lean and twist are asked, so `dx_ref` is a');
out('     property of the tilt alone. `solveSmall` pivots, so this is a real read of it and not a tautology.');
for (const k of ['heelDesignOffPeak', 'refFlatOffPeak', 'superOffPeak'] as const) {
  let w = 0;
  for (const a of EVERY) for (const r of arm(a, '')) w = Math.max(w, Math.abs(num(r, k)) || 0);
  out(`  ${k}: ${w.toExponential(2)}`);
}
out('\nC5, the folder\'s own five closures on every arm of this round (peaks over all arms). `ledgerApart` is NOT one');
out('of them and is printed apart as a COUNT of substeps the standing solve did not decide.');
const keys = ['senseOff', 'spacingOff', 'ledgerSplit', 'ledgerClosure', 'ledgerResidual'] as const;
const worst: Record<string, number> = {};
let apart = 0;
for (const a of EVERY) for (const r of arm(a, '')) {
  for (const k of keys) worst[k] = Math.max(worst[k] ?? 0, Math.abs(num(r, k)) || 0);
  apart = Math.max(apart, num(r, 'ledgerApart') || 0);
}
for (const k of keys) out(`  ${k}: ${(worst[k] ?? 0).toExponential(2)}`);
out(`  ledgerApart (a COUNT of substeps, peak over all arms): ${apart}`);
out('\nC6, every arm\'s own population, which every number above is drawn from.');
for (const a of EVERY) {
  const r = arm(a, '');
  const t = arm(a, 'ticks');
  const m = arm(a, 'mount');
  if (!r.length) continue;
  out(`  ${pad(a, 11)}: ${r.length} runs, ${t.length} ticks (${t.filter((x) => num(x, 'live') === 1).length} live), ${m.length} frames`);
}
