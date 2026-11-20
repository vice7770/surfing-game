/**
 * **Step 3.4i: the 70° clamp lifted off the fall mix, and the body's roll budget closed in one frame.**
 *
 * Two parts, and they are two different instruments on the same dumps.
 *
 * ## A — the fall mix, on a column that is not truncated
 *
 * Step 3.4h reported the published classifier's three kinds and then refused to call the result a finding, for a
 * reason that is a measurement and not a caution: *"`bankFall` is 70.00 exactly in 21 of 24 runs of the shipped arm
 * … so part of 'sudden 24 of 24 → 14 of 24' is how many runs reached `MAX_BANK`, not how the fall changed"*
 * [R, README Part 8 §4b]. The classifier's own first test is `|bank| > 45°` [R, `face-hold-2026-11-10/kinds.py.txt`],
 * so its threshold sits on a column `AttachedRider.frame` clamps at 70°.
 *
 * This part re-reads the same mix on **`bankRaw`** — the bank the geometry gives before the clamp, written by the
 * rider at the same three sites, on the same expression, and **read by nothing in the game**, so the arm it is read
 * on is the shipped rider byte for byte. Beside it, the counterfactual the switch buys: the same arms with
 * `?bankClamp=off` (`BANKC=off`), which lifts those three clamps and therefore changes the ankle's own spring datum
 * and the body's frame — so it is a different rider and is reported as one.
 *
 * **Two things this part is careful about.**
 * 1. **A clamped reading is not the same quantity as an unclamped one even where they agree.** The tables print the
 *    share of frames the clamp bit, per arm, so "the mix moved" can be read against "the clamp was there to move it".
 * 2. **The published classifier is used unchanged**, on both columns, and the published column's own mix is printed
 *    beside the new one in the same row. Nothing here re-defines a kind.
 *
 * ## B — the roll budget, about the contact, in newton-metres, with the residual printed
 *
 * The brief: *"for the body's roll about the contact, sum every moment acting on it and print the residual."*
 *
 * The conversion is exact and contains no derivative. `AttachedRider.coupleStanding` writes the bank's row of the
 * standing solve as a **generalized impulse across the leg**, N·s — `rhs[7] += t̂·f − h(τ_ankle + τ_swing)/L`
 * [R, `AttachedRider.ts`] — so `b[7] · L / dt` is the mean moment over the step that that source applies to the body
 * about the stance point, at the leg's own lever `L`, on the body's own across axis. The ankle's entry comes back as
 * exactly `−τ_ankle`; gravity's as `−m g L sin θ_body`, the inverted pendulum's own term. `bankLedger` already
 * partitions `b` by source with the partition read rather than assumed, so each moment is that same partition read
 * before `A⁻¹` instead of after it [R, `src/physics/bankLedger.ts`].
 *
 * The budget it closes is the one a force diagram of the body would write:
 *
 *     I_P · θ̈_body  =?=  τ_ankle + M_gravity + M_water-on-body + M_swing + …
 *
 * with `I_P = A[7][7] · L² = m L² + h(k h + c)` — the body's own roll inertia about the stance point as the matrix
 * holds it (`bodyHeld`), which step 3.3m measured at **22.22–52.82 kg·m²** and warned is a **diagonal** [R]. The
 * left-hand side is built from the ledger's own measured `ownTotal`, the body's absolute lean acceleration, so
 * nothing here is differenced.
 *
 * And the row's own exact split is printed with it, because it is where the residual goes:
 *
 *     A[7][7]·x[7]·L/dt   (`mDiag`, the body's inertia × its RELATIVE lean: the only term a single-body budget has)
 *   + Σ_{j≠7} A[7][j]·x[j]·L/dt   (`mCoup`, every other column of the same row: the stance point's own acceleration)
 *   = b[7]·L/dt           (`mTotal`, the sum of the moments)
 *
 * `mResid` is the departure from that identity and `mSplit` the departure of the per-source partition from the whole
 * row; both are positive controls and both must be machine zero or Part B may not be quoted.
 *
 * **The board's own roll row is printed beside it, by source, in N·m about `rollAxis`** — the hull's roll spring, the
 * water on the rail, the fins, and the rider's own share through the arm. The brief lists two of those among the
 * moments on the body; they are **not** on the body's row, because `bookBoard` writes rows 0–5 and nothing else
 * [R], and they reach the body only through `mCoup`. That is a read, and it is printed as `bdAnkle = 0` too.
 *
 * ## The windows, stated, because four different quantities could all be called "the moment"
 *
 * Every Part B row is a **median of per-run medians** over a named window, with the number of runs and the number of
 * frames printed. Two windows, both named on every table: **`ride`**, every frame past the folder's own `t > 0.2`
 * mount filter to the fall; and **`early`**, `t` 0.2–0.7 s, step 3.4h's own matched-age window, where step 3.3l put
 * the fall's start and where the rail has not yet passed 2°. An instantaneous value at the fall frame is a fifth
 * quantity and is printed only in Part A's own fall columns.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/clamp.ts -o <scratch>/cl.mjs --format esm --platform node
 *   DIR=docs/research/new-rider/3.4/results/34i ARMS=f73-g,f73-gc node <scratch>/cl.mjs --parts ABC
 *
 * Imports nothing from `src/` and writes nothing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const PARTS = option('parts') ?? 'ABC';
const part = (c: string) => PARTS.includes(c);
const DIR = process.env.DIR ?? 'docs/research/new-rider/3.4/results/34i';
const ARMS = (process.env.ARMS ?? '').split(',').filter((s) => s.length);
const PAIRS = (process.env.PAIRS ?? '').split(',').filter((s) => s.length);
const DEG = 180 / Math.PI;

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const e = (v: number) => (Number.isFinite(v) ? v.toExponential(1) : '–');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);
/** **The folder's own convention**: `q(v, 0.5)` is the UPPER element of the middle pair, not the pair's mean [R, `mount.ts`]. */
const q = (v: number[], p: number) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN;
};
const abs = (v: number[]) => v.map(Math.abs);

/** Every per-frame column this file reads, named, so no column is reached for anonymously. */
interface Frame {
  frame: number; t: number; stance: string; entryAsked: number | null; extra: number | null;
  bank: number; bankRaw: number; clampedBank: number; bankClamp: string;
  roll: number; tilt: number; rail: number; through: number; speed: number; faceFrac: number;
  attached: number; upright: number; phase: string;
  legLen: number; ankleTau: number; legLoad: number;
  mTotal: number | null; mDiag: number | null; mCoup: number | null; mSplit: number | null; mResid: number | null;
  mAnkle: number | null; mGrav: number | null; mRWater: number | null; mCarry: number | null; mSwing: number | null;
  mAssist: number | null; mLimbs: number | null;
  bdTotal: number | null; bdBuoy: number | null; bdPress: number | null; bdSuct: number | null; bdFric: number | null;
  bdFins: number | null; bdRails: number | null; bdAdded: number | null; bdGyro: number | null; bdWeight: number | null;
  bdGrav: number | null; bdCarry: number | null; bdRWater: number | null; bdSwing: number | null; bdAnkle: number | null;
  bdYaw: number | null; bdTwist: number | null; bdFroth: number | null;
  ownAcc: number | null; relAcc: number | null; deckAcc: number | null; bodyHeld: number | null;
  ankleOwn: number | null; ankleRel: number | null; ankleDeck: number | null; rollDeckPer: number | null;
}
/** The per-run summary row, as `3.3/plant.ts` writes it. */
interface Run {
  stance: string; extra: number | null; entryAsked: number | null; fell: string | false; fellAt: number;
  bankFall: number; throughFall: number; rollFall: number; railFall: number; bankClamp: string;
}

const read = (path: string): string => (existsSync(path) ? readFileSync(path, 'utf8')
  : existsSync(`${path}.gz`) ? gunzipSync(readFileSync(`${path}.gz`)).toString('utf8') : '');
const lines = <T, >(path: string): T[] => read(path).split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as T);

/** Split a per-frame dump into runs on `frame` returning to 1. */
function runsOf(rows: Frame[]): Frame[][] {
  const o: Frame[][] = [];
  let cur: Frame[] = [];
  for (const r of rows) {
    if (r.frame === 1 && cur.length) { o.push(cur); cur = []; }
    cur.push(r);
  }
  if (cur.length) o.push(cur);
  return o;
}
/**
 * **A run's own key**, as step 3.4h established: a crashed run writes per-frame rows and no summary row, so
 * `summary[i]` is not `runs[i]` and the two dumps are joined on `(stance, entryAsked ?? extra)` — unique inside an
 * arm because `STEERS` is a single value throughout [R, `place.ts`]. `joinMiss` is the count that says it closed.
 */
const keyOf = (r: { stance: string; entryAsked?: number | null; extra?: number | null }) => `${r.stance}|${r.entryAsked ?? r.extra ?? 0}`;
function arm(name: string): { summary: Run[]; runs: (Frame[] | undefined)[]; miss: number } {
  const summary = lines<Run>(`${DIR}/${name}.jsonl`);
  const by = new Map<string, Frame[]>();
  for (const run of runsOf(lines<Frame>(`${DIR}/${name}.mount.jsonl`))) if (run.length) by.set(keyOf(run[0]), run);
  const runs = summary.map((r) => by.get(keyOf(r)));
  return { summary, runs, miss: runs.filter((r) => !r).length };
}

/**
 * **The two kinds of fall, by the track's own published classifier, unchanged** [R, `docs/research/
 * face-hold-2026-11-10/kinds.py.txt:1–2`]: **sudden** — the body's bank past **45°** at the end; **stall** — cause
 * `balance` with the bank within **20°** of upright *and* the speed through the water under **2.5 m/s**; **other** —
 * anything else. `bank` is the column it is read on, and this file reads it twice: once as the published `bankFall`
 * and once as `bankRaw` at the fall frame.
 */
const fallKind = (fell: string | false, bank: number, through: number): 'sudden' | 'stall' | 'other' => {
  if (!fell) return 'other';
  if (Math.abs(bank) > 45) return 'sudden';
  if (fell === 'balance' && Math.abs(bank) <= 20 && through < 2.5) return 'stall';
  return 'other';
};
const mix = (ks: ('sudden' | 'stall' | 'other')[]) => `${ks.filter((k) => k === 'sudden').length}/${ks.filter((k) => k === 'stall').length}/${ks.filter((k) => k === 'other').length}`;

// ------------------------------------------------------------------ A. the fall mix on an unclamped column
if (part('A')) {
  out('\n## A. The fall mix on a column that is not truncated — the published classifier, read twice');
  out('  (`published` is `bankFall` off the tick rows, the column step 3.4h reported; `raw` is `bankRaw` at the FALL');
  out('   FRAME of the per-frame dump — the bank the geometry gave before `frame`\'s 70° clamp, written by the rider');
  out('   itself and read by nothing in the game. `clamp bit` is the share of a run\'s own frames with |bankRaw| > 70°.)');
  out(['arm', 'clamp', 'runs', 'fell', 'med s', 'published mix', '|bank| fall med', 'RAW mix', '|bankRaw| fall med', 'raw span', 'at clamp at fall', 'clamp bit, med run', 'through fall', 'join'].map((s, i) => pad(s, i ? 15 : 10)).join(''));
  for (const name of ARMS) {
    const { summary, runs, miss } = arm(name);
    if (!summary.length) { out(`  ${name}: no summary`); continue; }
    const end = (r: Run) => (r.fell ? r.fellAt : 9);
    const last = runs.map((r) => (r ? r[r.length - 1] : undefined));
    const rawFall = summary.map((_r, i) => (last[i] ? last[i]!.bankRaw : Number.NaN));
    const throughFall = summary.map((r, i) => (Number.isFinite(r.throughFall) ? r.throughFall : (last[i]?.through ?? Number.NaN)));
    const pubK = summary.map((r) => fallKind(r.fell, r.bankFall, r.throughFall));
    const rawK = summary.map((r, i) => fallKind(r.fell, rawFall[i], throughFall[i]));
    const bit = runs.map((r) => (r ? r.filter((x) => x.clampedBank === 1).length / r.length : Number.NaN));
    const atClamp = summary.filter((_r, i) => Math.abs(rawFall[i]) > 70.0000001).length;
    out([name, summary[0].bankClamp, `${summary.length}`, `${summary.filter((r) => r.fell).length}`,
      f(q(summary.map(end), 0.5), 3), mix(pubK), f(q(abs(summary.map((r) => r.bankFall)), 0.5), 1), mix(rawK),
      f(q(abs(rawFall), 0.5), 1),
      `${f(Math.min(...abs(rawFall).filter(Number.isFinite)), 0)}–${f(Math.max(...abs(rawFall).filter(Number.isFinite)), 0)}`,
      `${atClamp} of ${summary.length}`, `${f(100 * q(bit, 0.5), 1)} %`, f(q(throughFall, 0.5), 2), `${miss}`,
    ].map((s, i) => pad(s, i ? 15 : 10)).join(''));
  }

  // **What "other" IS.** Step 3.4h named a third population and could not say what it was. The classifier's three
  // tests are exhaustive, so "other" is exactly the complement, and it has four disjoint causes. Naming them is
  // arithmetic on the same two columns and the fall's own cause, not a new definition.
  out('\n  what `other` IS — the complement of the two published tests, split into its four disjoint causes,');
  out('  read on `bankRaw` (the unclamped column), so the third population has a name:');
  out(['arm', 'other', 'bank 20–45°', 'bank ≤ 20°,', 'bank ≤ 20°,', 'not a', 'did not'].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  out(['', '', '(too banked to stall,', 'through ≥ 2.5 m/s', 'through < 2.5 but', 'balance fall', 'fall'].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  out(['', '', 'not past 45°)', '(too fast to stall)', 'cause ≠ balance', '', ''].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  for (const name of ARMS) {
    const { summary, runs } = arm(name);
    if (!summary.length) continue;
    const raw = summary.map((_r, i) => { const r = runs[i]; return r ? r[r.length - 1].bankRaw : Number.NaN; });
    const ix = summary.map((r, i) => (fallKind(r.fell, raw[i], r.throughFall) === 'other' ? i : -1)).filter((i) => i >= 0);
    const band = ix.filter((i) => Math.abs(raw[i]) > 20 && Math.abs(raw[i]) <= 45);
    const fast = ix.filter((i) => Math.abs(raw[i]) <= 20 && summary[i].throughFall >= 2.5);
    const cause = ix.filter((i) => Math.abs(raw[i]) <= 20 && summary[i].throughFall < 2.5 && summary[i].fell !== 'balance');
    const notBal = ix.filter((i) => Math.abs(raw[i]) > 20 && Math.abs(raw[i]) <= 45 && summary[i].fell !== 'balance');
    const stood = ix.filter((i) => !summary[i].fell);
    out([name, `${ix.length} of ${summary.length}`, `${band.length}`, `${fast.length}`, `${cause.length}`,
      `${notBal.length}`, `${stood.length}`].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  }

  out('\n  per stance, because the owner\'s bar is about ONE stance and a pooled mix cannot carry it:');
  out(['arm', 'stance', 'runs', 'fell', 'med s', 'published mix', 'RAW mix', '|bankRaw| fall med', 'at clamp'].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  for (const name of ARMS) {
    const { summary, runs } = arm(name);
    if (!summary.length) continue;
    for (const st of ['tall', 'crouch', 'compress']) {
      const ix = summary.map((r, i) => (r.stance === st ? i : -1)).filter((i) => i >= 0);
      if (!ix.length) continue;
      const end = (i: number) => (summary[i].fell ? summary[i].fellAt : 9);
      const raw = ix.map((i) => { const r = runs[i]; return r ? r[r.length - 1].bankRaw : Number.NaN; });
      const thr = ix.map((i) => summary[i].throughFall);
      out([name, st, `${ix.length}`, `${ix.filter((i) => summary[i].fell).length}`, f(q(ix.map(end), 0.5), 3),
        mix(ix.map((i) => fallKind(summary[i].fell, summary[i].bankFall, summary[i].throughFall))),
        mix(ix.map((i, j) => fallKind(summary[i].fell, raw[j], thr[j]))),
        f(q(abs(raw), 0.5), 1), `${raw.filter((v) => Math.abs(v) > 70.0000001).length} of ${ix.length}`,
      ].map((s, i2) => pad(s, i2 ? 16 : 10)).join(''));
    }
  }

  // The A/B the switch buys, and the control on it: before the first clamped frame the two riders must be the same.
  if (PAIRS.length) {
    out('\n  the switch\'s own A/B — `bankClamp` shipped against `off`, same face, same entries, same stances —');
    out('  with the control that they are the SAME rider until the clamp first bites (every printed column, every run):');
    out(['pair', 'runs', 'fell on/off', 'med s on → off', 'ratio', 'runs with a clamped frame', 'identical prefix', 'first mismatch frame', 'cols checked'].map((s, i) => pad(s, i ? 17 : 12)).join(''));
    for (const p of PAIRS) {
      const [a, b] = p.split('+');
      const A = arm(a);
      const B = arm(b);
      if (!A.summary.length || !B.summary.length) { out(`  ${p}: missing`); continue; }
      const byKey = new Map(B.summary.map((r, i) => [keyOf(r), i]));
      const endA = (r: Run) => (r.fell ? r.fellAt : 9);
      let withClamp = 0;
      let identical = 0;
      let firstBad = Number.NaN;
      let cols = 0;
      const keys: (keyof Frame)[] = ['bank', 'roll', 'tilt', 'rail', 'through', 'speed', 'faceFrac', 'bankRaw', 'mTotal', 'mDiag', 'mCoup', 'mAnkle', 'mGrav', 'bdTotal', 'ownAcc', 'relAcc', 'deckAcc', 'ankleTau', 'legLen'];
      cols = keys.length;
      for (let i = 0; i < A.summary.length; i += 1) {
        const j = byKey.get(keyOf(A.summary[i]));
        const ra = A.runs[i];
        const rb = j === undefined ? undefined : B.runs[j];
        if (!ra || !rb) continue;
        const firstClamp = ra.findIndex((x) => x.clampedBank === 1);
        const upto = firstClamp < 0 ? ra.length : firstClamp;
        if (firstClamp >= 0) withClamp += 1;
        let ok = true;
        for (let k = 0; k < Math.min(upto, rb.length) && ok; k += 1) {
          for (const key of keys) {
            if (ra[k][key] !== rb[k][key]) { ok = false; if (!Number.isFinite(firstBad)) firstBad = ra[k].frame; break; }
          }
        }
        if (ok && upto <= rb.length) identical += 1;
      }
      out([p, `${A.summary.length}`, `${A.summary.filter((r) => r.fell).length}/${B.summary.filter((r) => r.fell).length}`,
        `${f(q(A.summary.map(endA), 0.5), 3)} → ${f(q(B.summary.map(endA), 0.5), 3)}`,
        f(q(B.summary.map(endA), 0.5) / q(A.summary.map(endA), 0.5), 3),
        `${withClamp} of ${A.summary.length}`, `${identical} of ${A.summary.length}`, Number.isFinite(firstBad) ? `${firstBad}` : 'none', `${cols}`,
      ].map((s, i) => pad(s, i ? 17 : 12)).join(''));
    }
  }
}

// ------------------------------------------------------------------ B. the roll budget
type Win = 'ride' | 'early';
const windowOf = (run: Frame[], w: Win) => run.filter((x) => x.t > 0.2 && (w === 'ride' || x.t < 0.7) && x.mTotal !== null && Number.isFinite(x.mTotal));
/** A per-run median of a column, then the median over runs: the folder's own two-stage read, with n printed both times. */
const perRun = (runs: Frame[][], w: Win, pick: (x: Frame) => number) => runs.map((r) => q(windowOf(r, w).map(pick), 0.5));

if (part('B')) {
  for (const w of ['ride', 'early'] as Win[]) {
    out(`\n## B. The roll budget about the contact, N·m — window \`${w}\` (${w === 'ride' ? 't > 0.2 s to the fall' : 't 0.2–0.7 s, step 3.4h\'s matched age'}), median of the per-run medians`);
    out('  (every term is a MEAN over its own frame, the ledger\'s own step mean; positive leans the body toward the board\'s +x.');
    out('   `single body` is `bodyHeld × ownAcc` — what a force diagram of the body alone would put on the left-hand side;');
    out('   `residual` is that minus `mTotal`, the sum of the moments. `split`/`resid` are the partition\'s own controls, maxima.)');
    out(['arm', 'runs', 'frames', '|mTotal|', '|mDiag|', '|mCoup|', 'opposed', 'single body', '|residual|', 'resid/|mTotal|', 'split max', 'resid max'].map((s, i) => pad(s, i ? 14 : 10)).join(''));
    for (const name of ARMS) {
      const { runs } = arm(name);
      const live = runs.filter((r): r is Frame[] => !!r && windowOf(r, w).length > 0);
      if (!live.length) { out(`  ${name}: no live frames in the window`); continue; }
      const frames = live.reduce((a, r) => a + windowOf(r, w).length, 0);
      const single = (x: Frame) => (x.bodyHeld as number) * (x.ownAcc as number);
      const resid = (x: Frame) => single(x) - (x.mTotal as number);
      const opposed = live.map((r) => {
        const fr = windowOf(r, w);
        return fr.filter((x) => (x.mDiag as number) * (x.mCoup as number) < 0).length / fr.length;
      });
      const mt = perRun(live, w, (x) => Math.abs(x.mTotal as number));
      const rs = perRun(live, w, (x) => Math.abs(resid(x)));
      out([name, `${live.length}`, `${frames}`,
        f(q(mt, 0.5), 1), f(q(perRun(live, w, (x) => Math.abs(x.mDiag as number)), 0.5), 1),
        f(q(perRun(live, w, (x) => Math.abs(x.mCoup as number)), 0.5), 1), `${f(100 * q(opposed, 0.5), 1)} %`,
        f(q(perRun(live, w, single), 0.5), 1), f(q(rs, 0.5), 1), f(q(rs, 0.5) / q(mt, 0.5), 2),
        e(Math.max(...live.flatMap((r) => windowOf(r, w).map((x) => x.mSplit as number)))),
        e(Math.max(...live.flatMap((r) => windowOf(r, w).map((x) => x.mResid as number)))),
      ].map((s, i) => pad(s, i ? 14 : 10)).join(''));
    }

    out(`\n  every moment on the BODY's own row, by source, N·m (signed median of the per-run medians), window \`${w}\`:`);
    out(['arm', 'stance', 'runs', 'ankle', 'gravity', 'water on body', 'carry', 'swing', 'assist', 'limbs', 'Σ = mTotal', 'ankle τ (N·m)', 'leg L (m)'].map((s, i) => pad(s, i ? 15 : 10)).join(''));
    for (const name of ARMS) {
      const { summary, runs } = arm(name);
      for (const st of ['tall', 'crouch', 'compress']) {
        const live = runs.filter((r, i): r is Frame[] => !!r && summary[i].stance === st && windowOf(r, w).length > 0);
        if (!live.length) continue;
        out([name, st, `${live.length}`,
          f(q(perRun(live, w, (x) => x.mAnkle as number), 0.5), 1), f(q(perRun(live, w, (x) => x.mGrav as number), 0.5), 1),
          f(q(perRun(live, w, (x) => x.mRWater as number), 0.5), 2), f(q(perRun(live, w, (x) => x.mCarry as number), 0.5), 2),
          f(q(perRun(live, w, (x) => x.mSwing as number), 0.5), 2), f(q(perRun(live, w, (x) => x.mAssist as number), 0.5), 2),
          f(q(perRun(live, w, (x) => x.mLimbs as number), 0.5), 2), f(q(perRun(live, w, (x) => x.mTotal as number), 0.5), 1),
          f(q(perRun(live, w, (x) => x.ankleTau), 0.5), 1), f(q(perRun(live, w, (x) => x.legLen), 0.5), 3),
        ].map((s, i) => pad(s, i ? 15 : 10)).join(''));
      }
    }

    out(`\n  and the BOARD's own roll row about \`rollAxis\`, by source, N·m — the hull's spring, the water on the rail,`);
    out(`  the fins, and the rider's own share through the arm. None of these has an entry on the body's row at all`);
    out(`  (\`bookBoard\` writes rows 0–5 [R]); they reach the body only through \`mCoup\`. Window \`${w}\`:`);
    out(['arm', 'runs', 'bdTotal', 'pressure', 'buoyancy', 'suction', 'friction', 'fins', 'rails', 'addedMass', 'gyro', 'weight', 'gravity', 'carry', 'swing', 'ankle(=0)'].map((s, i) => pad(s, i ? 12 : 10)).join(''));
    for (const name of ARMS) {
      const { runs } = arm(name);
      const live = runs.filter((r): r is Frame[] => !!r && windowOf(r, w).length > 0);
      if (!live.length) continue;
      const c = (pick: (x: Frame) => number) => f(q(perRun(live, w, pick), 0.5), 2);
      out([name, `${live.length}`, c((x) => x.bdTotal as number), c((x) => x.bdPress as number), c((x) => x.bdBuoy as number),
        c((x) => x.bdSuct as number), c((x) => x.bdFric as number), c((x) => x.bdFins as number), c((x) => x.bdRails as number),
        c((x) => x.bdAdded as number), c((x) => x.bdGyro as number), c((x) => x.bdWeight as number), c((x) => x.bdGrav as number),
        c((x) => x.bdCarry as number), c((x) => x.bdSwing as number), c((x) => x.bdAnkle as number),
      ].map((s, i) => pad(s, i ? 12 : 10)).join(''));
    }
  }
}

// ------------------------------------------------------------------ C. the reads Part C argues from
if (part('C')) {
  out('\n## C. The reads Part C argues from — the two ends of the roll, and the hull\'s own roll stiffness');
  out('  (`1/ankleOwn` is the inertia the ankle\'s torque meets at the BODY and `1/|ankleDeck|` the one it meets at the');
  out('   DECK, both off the matrix the integrator inverts [R, 3.3m]. `K_hull` is a least-squares slope of the hull\'s');
  out('   own roll moment against the board\'s heel against the water, per run, N·m/rad — a FIT and labelled as one.)');
  out(['arm', 'runs', 'bodyHeld kg·m²', '1/ankleOwn', '1/|ankleDeck|', 'their ratio', 'ankle authority', '1/rollDeckPer', 'K_hull N·m/rad', 'R² of that fit', 'rail ° med'].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  for (const name of ARMS) {
    const { runs } = arm(name);
    const live = runs.filter((r): r is Frame[] => !!r && windowOf(r, 'ride').length > 0);
    if (!live.length) continue;
    const hull = (x: Frame) => (x.bdPress as number) + (x.bdBuoy as number) + (x.bdSuct as number)
      + (x.bdFric as number) + (x.bdFins as number) + (x.bdRails as number);
    const fits = live.map((r) => {
      const fr = windowOf(r, 'ride');
      const xs = fr.map((x) => x.rail / DEG);
      const ys = fr.map(hull);
      const n = xs.length;
      const mx = xs.reduce((a, v) => a + v, 0) / n;
      const my = ys.reduce((a, v) => a + v, 0) / n;
      let sxy = 0;
      let sxx = 0;
      let syy = 0;
      for (let i = 0; i < n; i += 1) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
      return { slope: sxx > 0 ? sxy / sxx : Number.NaN, r2: sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : Number.NaN };
    });
    out([name, `${live.length}`, f(q(perRun(live, 'ride', (x) => x.bodyHeld as number), 0.5), 2),
      f(q(perRun(live, 'ride', (x) => 1 / Math.abs(x.ankleOwn as number)), 0.5), 2),
      f(q(perRun(live, 'ride', (x) => 1 / Math.abs(x.ankleDeck as number)), 0.5), 3),
      f(q(perRun(live, 'ride', (x) => Math.abs(x.ankleDeck as number) / Math.abs(x.ankleOwn as number)), 0.5), 3),
      f(q(perRun(live, 'ride', (x) => Math.abs((x.ankleOwn as number) / (x.ankleRel as number))), 0.5), 3),
      f(q(perRun(live, 'ride', (x) => 1 / Math.abs(x.rollDeckPer as number)), 0.5), 3),
      f(q(fits.map((x) => x.slope), 0.5), 0), f(q(fits.map((x) => x.r2), 0.5), 3),
      f(q(perRun(live, 'ride', (x) => Math.abs(x.rail)), 0.5), 2),
    ].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  }

  out('\n  the hull\'s own answer to the rider\'s own moment, on the BOARD\'s roll row — the quantity step 3.3h measured');
  out('  statically at +33.47 against −33.40 (net +0.04), read here dynamically over the ride. `CoP arm` is the hull\'s');
  out('  moment divided by one body weight (716 N), i.e. how far across the board the water\'s own centre of lift has');
  out('  had to travel to make it — against the board\'s own half-beam of 0.232 m (0.464 m beam [R, boardReference]).');
  out(['arm', 'runs', 'hull N·m', 'rider bdGrav', 'hull / rider', 'bdTotal N·m', 'CoP arm m', 'of the half-beam', 'rail ° med'].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  for (const name of ARMS) {
    const { runs } = arm(name);
    const live = runs.filter((r): r is Frame[] => !!r && windowOf(r, 'ride').length > 0);
    if (!live.length) continue;
    const hull = (x: Frame) => (x.bdPress as number) + (x.bdBuoy as number) + (x.bdSuct as number)
      + (x.bdFric as number) + (x.bdFins as number) + (x.bdRails as number);
    const h = q(perRun(live, 'ride', (x) => Math.abs(hull(x))), 0.5);
    const g = q(perRun(live, 'ride', (x) => Math.abs(x.bdGrav as number)), 0.5);
    out([name, `${live.length}`, f(h, 2), f(g, 2), f(h / g, 3),
      f(q(perRun(live, 'ride', (x) => x.bdTotal as number), 0.5), 2), f(h / 716, 4), f(h / 716 / 0.232, 3),
      f(q(perRun(live, 'ride', (x) => Math.abs(x.rail)), 0.5), 2),
    ].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  }

  out('\n  and the body\'s own lean, both halves, °/s² — so the budget\'s two sides can be read against the attribution:');
  out(['arm', 'runs', 'ownAcc', 'relAcc', 'deckAcc', 'deck share', '|bank| med °', '|bankRaw| med °', 'clamped frames'].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  for (const name of ARMS) {
    const { runs } = arm(name);
    const live = runs.filter((r): r is Frame[] => !!r && windowOf(r, 'ride').length > 0);
    if (!live.length) continue;
    const frames = live.flatMap((r) => windowOf(r, 'ride'));
    out([name, `${live.length}`,
      f(q(perRun(live, 'ride', (x) => (x.ownAcc as number) * DEG), 0.5), 0),
      f(q(perRun(live, 'ride', (x) => (x.relAcc as number) * DEG), 0.5), 0),
      f(q(perRun(live, 'ride', (x) => (x.deckAcc as number) * DEG), 0.5), 0),
      f(q(perRun(live, 'ride', (x) => Math.abs((x.deckAcc as number) / (x.ownAcc as number))), 0.5), 3),
      f(q(perRun(live, 'ride', (x) => Math.abs(x.bank)), 0.5), 2),
      f(q(perRun(live, 'ride', (x) => Math.abs(x.bankRaw)), 0.5), 2),
      `${frames.filter((x) => x.clampedBank === 1).length} of ${frames.length}`,
    ].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  }
}
