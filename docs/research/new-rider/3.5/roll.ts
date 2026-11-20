/**
 * **Step 3.5d: what rolls the board to 56–84° when the rider asks for 0.00° of lean.**
 *
 * Step 3.5a measured, on the owner's own address (`?rider=new&feltFrame=deck&riderBody=two`, which is
 * `RIDER=new FELT=deck BODY=two`), with the stick hard over at 1–3 m/s: *"the ask is `0.00°` — the shipped cap is
 * exactly 0 below `PLANING_DROP = 3 m/s` — and the board still rails over to 56–84° and swings 21–36° of heading
 * before it falls."* Everything else has been eliminated with a number on it: the wave and the placement (3.4h), the
 * 70° clamp (3.4i), the hull's roll stiffness (step ten's advisor: ≈100 N·m/rad is right within 1.5×), the ankle's own
 * range (nine null rounds), the 4 m/s plant floor (3.4m), and "the rider is blind to the across acceleration" (3.4j).
 *
 * This file is the reader for that question. It computes nothing about the physics itself: every column it reads is
 * written per FRAME by `3.3/plant.ts`'s own `MOUNT=` dump, and the three instruments it reads are the game's own
 * ledgers.
 *
 * ## The three instruments, and the one thing that separates them
 *
 * **1. `rl…` — `BoardBody.roll`, the roll ledger (step 3.3h).** The board's own angular impulse about **its own long
 * axis**, N·m, booked on **every** substep, with `rlTotal` the `(I·Δω)·ẑ` it actually took and `rlRider` the
 * residual — everything the rider's coupling carries. This is the complete budget, and it is the one that may be read
 * on any frame.
 *
 * **2. `dk…` — `bankLedger.deck`, the deck's own roll acceleration per source, rad/s².** The exact `A⁻¹` partition of
 * the standing solve's right-hand side, 23 sources, summing to `deckAcc` identically (`dkSum`, `dkClose`, `dkSplit`
 * are its own controls and are printed). This is the instrument that **names** the drive — but it describes only the
 * substeps the standing 8×8/9×9 decided. Where the contact is infeasible the board takes the projected push and
 * `solve6` decides instead, and the ledger counts those as `apart` [R, `BoardBody.ts:1535–1538`]. So every per-source
 * figure below is read on the **`drive` window**: the run's own leading frames with `apartSub == 0`, where the
 * attribution describes every substep of every frame in it. Its end time and the roll reached by it are printed on
 * every row, because that window is the finding's own scope.
 *
 * **3. the plant** — `rollInerBoard` (`bodyInertia[8]`, the board's own roll inertia about the ledger's datum, which
 * is exactly `ẑᵀ R I Rᵀ ẑ`), `1/rollDeckPer` (the coupled one the integrator meets, with the rider and the water's
 * implicit added mass in it) and `ankleDeck` (the deck's roll per unit of ankle torque-impulse, off the same `A⁻¹`).
 *
 * **The two signs, stated once.** `rl…` is + in the right-hand sense about the board's **+z** (its long axis), which
 * lifts the +x rail. `dk…`/`bd…`/`deckAcc` are + toward the board's **+x** (rolling that rail down) about `rollAxis`,
 * the world `(0,0,−1)` turned by the heading. **They are opposite senses**, so a positive `rlRider` and a negative
 * `dk_*` are the same direction. `roll` (the board from the world's level), `rail` (its heel against the water under
 * it, `roll − tilt`) and `bank` (the body's lean over its feet) are three different quantities and all three are
 * printed; § A says which of them the 56–84° is.
 *
 * ## The windows, named on every table, because "before the fall" and "during it" are the question
 *
 * - **`drive`** — the leading frames with `apartSub == 0` (above). The per-source attribution's own scope.
 * - **`in25`** — the frames with `|roll| ≤ 25°`, step 3.4l's own cut, which that round found holds only 19–34 % of a
 *   crawl's live ticks: **before the fall.**
 * - **`out25`** — the rest, to the frame the rider comes off: **the capsize itself.**
 * - The whole run is live by construction: `3.3/plant.ts` breaks on `!rider.attached || !rider.upright ||
 *   phase !== 'standing'`, so there are no frozen frames in a `MOUNT` dump and no `dead*` column is needed.
 *
 * Per stance, never pooled, with `n` printed twice (runs, then frames).
 *
 * Run from the repository's root, after the dumps exist:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/roll.ts -o <scratch>/rl.mjs --format esm --platform node
 *   DIR=<scratch>/35d ARMS=f73-ls,s16-ls,f73-l,s16-l,f73-g node <scratch>/rl.mjs
 *
 * Imports nothing from `src/` and writes nothing.
 */
import { existsSync, readFileSync } from 'node:fs';

const DIR = process.env.DIR ?? '.';
const ARMS = (process.env.ARMS ?? '').split(',').filter((s) => s.length);
const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** 3.4l's own roll cut, °: inside it the board is still under the rider; outside it the run is the capsize. */
const CUT = 25;
/**
 * **`CELL=low|high|all`: which entry speeds, because the question is about ONE cell and a pooled read cannot carry
 * it.** The arms are run with `ENTRIES=1,2,3,4,5,6`, and the ask's own cap is exactly 0 only below
 * `PLANING_DROP = 3 m/s` — so entries 1–3 are the owner's own crawl, where step 3.5a measured the 0.00° ask, and
 * 4–6 are the same water and placement with the board planing and the ask nonzero. `low` is the bar; `high` is the
 * control that separates "the crawl" from "the game". A relative-entry arm (`f73-g`) has no `entryAsked` at all and
 * is read whole, which `cells` below says on the row.
 */
const CELL = process.env.CELL === 'high' ? 'high' : process.env.CELL === 'all' ? 'all' : 'low';
const inCell = (run: Frame[]) => {
  const entry = run[0].entryAsked;
  if (typeof entry !== 'number' || CELL === 'all') return true;
  return CELL === 'low' ? entry <= 3 : entry > 3;
};

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const e = (v: number) => (Number.isFinite(v) ? v.toExponential(1) : '–');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);
/** **The folder's own convention** [R, `3.4/mount.ts`]: `q(v, 0.5)` is the UPPER element of the middle pair. */
const q = (v: number[], p: number) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN;
};
const med = (v: number[]) => q(v, 0.5);
const span = (v: number[], d = 1) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–';
};

type Frame = Record<string, number | string | null>;
const num = (r: Frame, k: string) => {
  const v = r[k];
  return typeof v === 'number' ? v : Number.NaN;
};

function runsOf(path: string): Frame[][] {
  if (!existsSync(path)) return [];
  const rows = readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as Frame);
  const o: Frame[][] = [];
  let cur: Frame[] = [];
  for (const r of rows) {
    if (num(r, 'frame') === 1 && cur.length) { o.push(cur); cur = []; }
    cur.push(r);
  }
  if (cur.length) o.push(cur);
  return o;
}

/** The sources the dump books the deck's roll per — read off the first row, so the file names none of them itself. */
const sourcesOf = (run: Frame[]) => Object.keys(run[0]).filter((k) => k.startsWith('dk_'));

/** The leading frames with no `apart` substep: the window the per-source attribution describes in full. */
function driveWindow(run: Frame[]): Frame[] {
  const o: Frame[] = [];
  for (const r of run) {
    if (num(r, 'apartSub') !== 0) break;
    o.push(r);
  }
  return o;
}
const inside = (run: Frame[]) => run.filter((r) => Math.abs(num(r, 'roll')) <= CUT);
const outside = (run: Frame[]) => run.filter((r) => Math.abs(num(r, 'roll')) > CUT);

/** The hull's own four patch totals plus the two foils, N·m on the roll ledger's datum: the restoring side. */
const rlHull = (r: Frame) => num(r, 'rlPress') + num(r, 'rlBuoy') + num(r, 'rlSuct') + num(r, 'rlFric')
  + num(r, 'rlFins') + num(r, 'rlRails') + num(r, 'rlFroth');
/** The water's own INERTIAL answer on the same datum: added mass and radiation damping. */
const rlInertial = (r: Frame) => num(r, 'rlAdded') + num(r, 'rlRad');

const stances = ['tall', 'crouch', 'compress'];
const byStance = (runs: Frame[][], st: string) => runs.filter((r) => r[0].stance === st);

for (const name of ARMS) {
  const all = runsOf(`${DIR}/${name}.mount.jsonl`);
  const runs = all.filter(inCell);
  if (!runs.length) { out(`\n## ${name}: no dump, or no run in cell \`${CELL}\``); continue; }
  const entries = [...new Set(runs.map((r) => `${r[0].entryAsked ?? 'rel'}`))].join(',');

  out(`\n# ${name}, cell \`${CELL}\` (entries ${entries}) — ${runs.length} of ${all.length} runs, ${runs.reduce((a, r) => a + r.length, 0)} frames, every frame live`);

  // ---------------------------------------------------------------- A. which angle the 56–84° is
  out('\n## A. Which quantity reaches 56–84° — the three angles and the ask, per stance');
  out('  (`roll` the board from the world\'s level, `rail` its heel against the water under it, `bank` the body\'s');
  out('   lean over its feet. `ask`/`cap` are `leanProbe`\'s own two: the eased lean the balance holds and the bound');
  out('   its speed allows. `plan` is the share of frames the board planes.)');
  out(['stance', 'runs', 'fell at s', '|roll| peak', '|rail| peak', '|bank| peak', 'ask med', 'ask peak', 'cap med', 'plan', 'through med'].map((s, i) => pad(s, i ? 14 : 10)).join(''));
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    const peak = (k: string) => rs.map((r) => Math.max(...r.map((x) => Math.abs(num(x, k)))));
    out([st, `${rs.length}`, span(rs.map((r) => num(r[r.length - 1], 't')), 3),
      span(peak('roll')), span(peak('rail')), span(peak('bank')),
      f(med(rs.map((r) => med(r.map((x) => Math.abs(num(x, 'askDeg')))))), 2),
      f(Math.max(...peak('askDeg')), 2),
      f(med(rs.map((r) => med(r.map((x) => num(x, 'capDeg'))))), 2),
      `${f(100 * med(rs.map((r) => r.filter((x) => num(x, 'planingNow') === 1).length / r.length)), 0)} %`,
      f(med(rs.map((r) => med(r.map((x) => num(x, 'through'))))), 2),
    ].map((s, i) => pad(s, i ? 14 : 10)).join(''));
  }

  // ---------------------------------------------------------------- B. is it a drive or a coast
  out('\n## B. Drive or coast — when the roll RATE is established, and how much of the angle comes after it');
  out('  (`rate peak` is max |rollAxis·ω|, °/s. `t90` is the first frame at 90 % of that peak, and `roll@t90` the');
  out('   roll there. `after t90` is the share of the whole |roll| swing accumulated after t90 — a coast if it is');
  out('   most of it. `|net| med` is the roll ledger\'s own `rlTotal`, the mean moment the board\'s inertia took.)');
  out(['stance', 'runs', 'rate peak °/s', 't90 s', 'roll@t90 °', 'roll at fall', 'after t90', 't90 inside 25°', '|net| med N·m', 'net in25', 'net out25'].map((s, i) => pad(s, i ? 15 : 10)).join(''));
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    const rows = rs.map((run) => {
      const rate = run.map((x) => Math.abs(num(x, 'rollRateAxis')));
      const peak = Math.max(...rate);
      const i90 = rate.findIndex((v) => v >= 0.9 * peak);
      const roll0 = num(run[0], 'roll');
      const rollEnd = num(run[run.length - 1], 'roll');
      const at90 = num(run[i90], 'roll');
      const swing = Math.abs(rollEnd - roll0);
      return {
        peak, t90: num(run[i90], 't'), at90, rollEnd,
        after: swing > 0 ? Math.abs(rollEnd - at90) / swing : Number.NaN,
      };
    });
    out([st, `${rs.length}`, span(rows.map((r) => r.peak), 0), span(rows.map((r) => r.t90), 3),
      span(rows.map((r) => Math.abs(r.at90)), 1), span(rows.map((r) => Math.abs(r.rollEnd)), 1),
      `${f(100 * med(rows.map((r) => r.after)), 0)} %`, `${rows.filter((r) => Math.abs(r.at90) <= CUT).length} of ${rows.length}`,
      f(med(rs.map((r) => med(r.map((x) => Math.abs(num(x, 'rlTotal')))))), 3),
      f(med(rs.map((r) => med(inside(r).map((x) => num(x, 'rlTotal'))))), 3),
      f(med(rs.map((r) => med(outside(r).map((x) => num(x, 'rlTotal'))))), 3),
    ].map((s, i) => pad(s, i ? 15 : 10)).join(''));
  }

  out('\n  and where the rate comes from in TIME — the mount\'s own first frame against the peak. `f1` is frame 1');
  out('  alone (t = 0.0167 s), `7f` the mount\'s first seven frames (t ≤ 0.117 s, the window step 3.4f found the');
  out('  ankle pinned on its own bound for), both as `rollAxis·ω` in °/s, and `ankle τ f1` the torque at frame 1.');
  out(['stance', 'runs', 'rate f1 °/s', 'rate 7f °/s', 'rate peak', 'f1 / peak', '7f / peak', 'ankle τ f1 N·m', 'dk_ankle f1 °/s²', 'net f1 °/s²'].map((s, i) => pad(s, i ? 17 : 10)).join(''));
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    const r1 = rs.map((r) => num(r[0], 'rollRateAxis'));
    const r7 = rs.map((r) => num(r[Math.min(6, r.length - 1)], 'rollRateAxis'));
    const pk = rs.map((r) => Math.max(...r.map((x) => Math.abs(num(x, 'rollRateAxis')))));
    out([st, `${rs.length}`, span(r1, 1), span(r7, 1), span(pk, 0),
      `${f(100 * med(r1.map((v, i) => Math.abs(v) / pk[i])), 0)} %`,
      `${f(100 * med(r7.map((v, i) => Math.abs(v) / pk[i])), 0)} %`,
      span(rs.map((r) => num(r[0], 'ankleTau')), 1),
      span(rs.map((r) => num(r[0], 'dk_ankle') * DEG), 0),
      span(rs.map((r) => num(r[0], 'deckAcc') * DEG), 0),
    ].map((s, i) => pad(s, i ? 17 : 10)).join(''));
  }

  // ---------------------------------------------------------------- C. the roll ledger's own three sides
  out('\n## C. The board\'s own roll budget, N·m on the roll ledger\'s datum — medians of per-run medians, per window');
  out('  (`rider` is the ledger\'s RESIDUAL — everything the rider\'s coupling carries, feet and the pair\'s own');
  out('   inertia together, and it is reported as a residual. `inertial` is added mass + radiation. `hull` is the');
  out('   four patch totals plus the fins and rails. `net` is `rlTotal`, what the board\'s own inertia took, and');
  out('   `net/|largest|` is how much of the largest term survives the cancellation.)');
  for (const [w, pick] of [['whole', (r: Frame[]) => r], ['in25', inside], ['out25', outside]] as [string, (r: Frame[]) => Frame[]][]) {
    out(`\n  window \`${w}\`:`);
    out(['stance', 'runs', 'frames', 'rider', 'inertial', 'hull', 'gyro', 'net', '|net|/|largest|', 'rider+inertial'].map((s, i) => pad(s, i ? 15 : 10)).join(''));
    for (const st of stances) {
      const rs = byStance(runs, st).filter((r) => pick(r).length > 0);
      if (!rs.length) continue;
      const per = (g: (r: Frame) => number) => med(rs.map((run) => med(pick(run).map(g))));
      const rider = per((r) => num(r, 'rlRider'));
      const inert = per(rlInertial);
      const hull = per(rlHull);
      const net = per((r) => num(r, 'rlTotal'));
      out([st, `${rs.length}`, `${rs.reduce((a, r) => a + pick(r).length, 0)}`,
        f(rider, 2), f(inert, 2), f(hull, 2), f(per((r) => num(r, 'rlGyro')), 3), f(net, 3),
        f(Math.abs(net) / Math.max(Math.abs(rider), Math.abs(inert), Math.abs(hull)), 4), f(rider + inert, 2),
      ].map((s, i) => pad(s, i ? 15 : 10)).join(''));
    }
  }

  // ---------------------------------------------------------------- D. who drives it, by name
  out('\n## D. WHO ROLLS THE DECK, by name — `bankLedger.deck` over the `drive` window');
  out('  (the window is each run\'s own leading frames with NO `apart` substep, so the partition describes every');
  out('   substep of every frame in it. `mean °/s²` is that source\'s own mean deck-roll acceleration over the window,');
  out('   a median of the per-run means, and `Σ|terms|` share is its magnitude over the sum of all twenty-three');
  out('   magnitudes — a share in [0, 1], unlike a share of a net that is itself a cancellation residual. `same sign`');
  out('   counts the runs whose own mean has the median\'s sign. `× net` is the source over the window\'s own net.)');
  const srcs = sourcesOf(runs[0]);
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    const perRun = rs.map((run) => {
      const w = driveWindow(run);
      const mean: Record<string, number> = {};
      for (const k of srcs) mean[k] = w.length ? w.reduce((a, x) => a + num(x, k) * DEG, 0) / w.length : Number.NaN;
      const net = w.length ? w.reduce((a, x) => a + num(x, 'deckAcc') * DEG, 0) / w.length : Number.NaN;
      return {
        mean, net, n: w.length, end: w.length ? num(w[w.length - 1], 't') : Number.NaN,
        roll: w.length ? num(w[w.length - 1], 'roll') : Number.NaN,
        rate: w.length ? num(w[w.length - 1], 'rollRateAxis') : Number.NaN,
        gained: w.reduce((a, x) => a + num(x, 'deckAcc') * DEG * STEP, 0),
      };
    }).filter((r) => r.n > 0);
    if (!perRun.length) continue;
    const net = med(perRun.map((r) => r.net));
    const bulk = med(perRun.map((r) => srcs.reduce((a, k) => a + Math.abs(r.mean[k]), 0)));
    const order = srcs.map((k) => ({ k, v: med(perRun.map((r) => r.mean[k])) }))
      .filter((x) => Number.isFinite(x.v) && Math.abs(x.v) > 0.5).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
    out(`\n  ${st} — ${perRun.length} runs; drive window ${span(perRun.map((r) => r.n), 0)} frames, to t ${span(perRun.map((r) => r.end), 3)} s`);
    out(`    and |roll| ${span(perRun.map((r) => Math.abs(r.roll)), 1)}°; the rate the window ends on ${span(perRun.map((r) => r.rate), 0)} °/s,`);
    out(`    the rate the booked net itself gives over it ${span(perRun.map((r) => r.gained), 0)} °/s (the instrument against the trajectory);`);
    out(`    net ${f(net, 0)} °/s² against Σ|terms| ${f(bulk, 0)} °/s² — the net is ${f(100 * Math.abs(net) / bulk, 2)} % of the traffic.`);
    out(['  source', 'mean °/s²', 'Σ|terms| share', 'same sign', '× net', 'span over runs'].map((s, i) => pad(s, i ? 16 : 18)).join(''));
    for (const { k, v } of order) {
      const same = perRun.filter((r) => Math.sign(r.mean[k]) === Math.sign(v)).length;
      out([`  ${k.slice(3)}`, f(v, 0), `${f(100 * Math.abs(v) / bulk, 1)} %`, `${same} of ${perRun.length}`,
        f(v / net, 1), span(perRun.map((r) => r.mean[k]), 0)].map((s, i) => pad(s, i ? 16 : 18)).join(''));
    }
  }

  out('\n  the same partition split BEFORE the fall and DURING it, which is the round\'s own question: the `drive`');
  out('  window intersected with `in25` and with `out25`. Each row is a stance; `top three` names the three largest');
  out('  sources by |mean| with their Σ|terms| shares, so "the largest term" can be read per window rather than');
  out('  pooled over a run that is partly a capsize.');
  out('  `base` is which frames the partition is read on: `drive`, the contiguous leading window above — whose');
  out('  cumulative figures are a trajectory — or `booked`, EVERY frame of the run with no `apart` substep, which is');
  out('  not contiguous (so it is read as a mean and never integrated) but is the only window a face whose very first');
  out('  frame is already `apart` has at all.');
  out(['stance', 'base', 'window', 'runs', 'frames', 'net °/s²', 'Σ|terms| °/s²', 'net share', 'top three sources by |mean °/s²|'].map((s, i) => pad(s, i ? 13 : 10)).join(''));
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    for (const [base, win] of [['drive', driveWindow], ['booked', (r: Frame[]) => r.filter((x) => num(x, 'apartSub') === 0)]] as [string, (r: Frame[]) => Frame[]][]) {
    for (const [w, pick] of [['in25', inside], ['out25', outside]] as [string, (r: Frame[]) => Frame[]][]) {
      const per = rs.map((run) => pick(win(run))).filter((w2) => w2.length > 0);
      if (!per.length) { out([st, base, w, '0', '0', '–', '–', '–', 'no frame in the window'].map((x, i) => pad(x, i ? 13 : 10)).join('')); continue; }
      const meanOf = (k: string) => med(per.map((w2) => w2.reduce((a, x) => a + num(x, k) * DEG, 0) / w2.length));
      const net = meanOf('deckAcc');
      const bulk = med(per.map((w2) => srcs.reduce((a, k) => a + Math.abs(w2.reduce((b, x) => b + num(x, k) * DEG, 0) / w2.length), 0)));
      const top = srcs.map((k) => ({ k: k.slice(3), v: meanOf(k) })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 3);
      out([st, base, w, `${per.length}`, `${per.reduce((a, w2) => a + w2.length, 0)}`, f(net, 0), f(bulk, 0),
        `${f(100 * Math.abs(net) / bulk, 1)} %`,
        top.map((x) => `${x.k} ${f(x.v, 0)} (${f(100 * Math.abs(x.v) / bulk, 0)} %)`).join('  '),
      ].map((x, i) => pad(x, i ? 13 : 10)).join(''));
    }
    }
  }

  out('\n  and the one test that says whether the largest term is a CORRECTION or a DRIVE. `bank` is the body\'s own');
  out('  lean over its stance point in the HEADING\'s frame, not against the deck [R, `AttachedRider.frame`], and');
  out('  `mAnkle` is the ankle\'s own moment on the body (the ledger\'s row 7, which is `−τ_ankle`). So: is the ankle');
  out('  correcting (its moment opposes the lean) — and does the SAME torque\'s deck roll carry the body further the');
  out('  way it is already leaning, and the way the deck is already rolling? Shares of the window\'s own frames,');
  out('  frames with |bank| ≤ 1e-6° dropped (no lean to have a sign). Read on the `booked` window (every frame with');
  out('  no `apart` substep), so a face whose first frame is already `apart` is still readable.');
  out(['stance', 'frames', 'ankle corrects', 'its deck roll leans', 'with the deck\'s own', '|dk_ankle| > |net|'].map((s, i) => pad(s, i ? 24 : 10)).join(''));
  out(['', '', 'the lean', 'the body further', 'roll rate', ''].map((s, i) => pad(s, i ? 24 : 10)).join(''));
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    const fr = rs.flatMap((r) => r.filter((x) => num(x, 'apartSub') === 0)).filter((x) => Math.abs(num(x, 'bank')) > 1e-6);
    if (!fr.length) continue;
    const share = (g: (x: Frame) => boolean) => `${f(100 * fr.filter(g).length / fr.length, 1)} %`;
    out([st, `${fr.length}`,
      share((x) => Math.sign(num(x, 'mAnkle')) !== Math.sign(num(x, 'bank'))),
      share((x) => Math.sign(num(x, 'dk_ankle')) === Math.sign(num(x, 'bank'))),
      share((x) => Math.sign(num(x, 'dk_ankle')) === Math.sign(num(x, 'rollRateAxis'))),
      share((x) => Math.abs(num(x, 'dk_ankle')) > Math.abs(num(x, 'deckAcc'))),
    ].map((s, i) => pad(s, i ? 24 : 10)).join(''));
  }

  // ---------------------------------------------------------------- E. the plant, and the controls
  out('\n## E. The plant the moments are divided by, and the round\'s own controls');
  out('  (`I_board` is the board ALONE about the roll ledger\'s datum; `1/rollDeckPer` the coupled one the integrator');
  out('   meets. `°/s² per N·m` is 1/I_board in degrees — the hair-trigger, if it is one. `ankleDeck` is the deck\'s');
  out('   roll per unit ankle torque-impulse off the same `A⁻¹`, and `authority` is `|ankleOwn/ankleRel|`.)');
  out(['stance', 'I_board kg·m²', '1/rollDeckPer', '°/s² per N·m', '|ankleDeck|', 'authority', 'ankle τ N·m', 'dkClose max', 'dkSplit max', 'apart/subs'].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    const i0 = num(rs[0][0], 'rollInerBoard');
    out([st, f(i0, 5), f(med(rs.map((r) => med(r.map((x) => 1 / num(x, 'rollDeckPer'))))), 3),
      f(DEG / i0, 0), f(med(rs.map((r) => med(r.map((x) => Math.abs(num(x, 'ankleDeck')))))), 3),
      f(med(rs.map((r) => med(r.map((x) => Math.abs(num(x, 'ankleOwn') / num(x, 'ankleRel')))))), 3),
      f(med(rs.map((r) => med(r.map((x) => num(x, 'ankleTau'))))), 2),
      e(Math.max(...rs.flatMap((r) => r.map((x) => num(x, 'dkClose'))))),
      e(Math.max(...rs.flatMap((r) => r.map((x) => num(x, 'dkSplit'))))),
      `${f(med(rs.map((r) => med(r.map((x) => num(x, 'apartSub'))))), 1)}/${f(med(rs.map((r) => med(r.map((x) => num(x, 'subs'))))), 0)}`,
    ].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  }

  out('\n  and the roll ledger\'s own control, which has no model in it: the board\'s own net moment divided by the');
  out('  board\'s own roll inertia is a rate change, so `−rlTotal/I_board·dt` summed over a run must reproduce the');
  out('  rate the board is actually spinning at. `sign` is the share of frames where the predicted and the measured');
  out('  frame-to-frame change agree in sign. A tensor\'s off-diagonal terms and the step\'s own averaging are the');
  out('  gap, and both are printed rather than corrected for.');
  out(['stance', 'runs', 'frames', 'predicted °/s', 'measured °/s', 'ratio', 'sign agrees'].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    const pred = rs.map((r) => r.reduce((a, x) => a - (num(x, 'rlTotal') / num(x, 'rollInerBoard')) * DEG * STEP, 0));
    const meas = rs.map((r) => num(r[r.length - 1], 'rollRateAxis'));
    let same = 0;
    let n = 0;
    for (const r of rs) {
      for (let i = 1; i < r.length; i += 1) {
        const dp = -(num(r[i], 'rlTotal') / num(r[i], 'rollInerBoard')) * DEG * STEP;
        const dm = num(r[i], 'rollRateAxis') - num(r[i - 1], 'rollRateAxis');
        if (Math.abs(dm) < 1e-9) continue;
        n += 1;
        if (Math.sign(dp) === Math.sign(dm)) same += 1;
      }
    }
    out([st, `${rs.length}`, `${rs.reduce((a, r) => a + r.length, 0)}`, span(pred, 0), span(meas, 0),
      f(med(pred) / med(meas), 3), `${f(100 * same / n, 1)} % of ${n}`].map((s, i) => pad(s, i ? 16 : 10)).join(''));
  }

  out('\n  the ankle\'s own identity, as an independent control on § D: the ledger\'s `dk_ankle` against');
  out('  `ankleDeck × (−ankleTau)` — the same quantity built from the unit compliance and the torque instead of');
  out('  from the partition. Both are reads off the same `A⁻¹`; a gap means one of them is not what it says.');
  out(['stance', 'frames', 'dk_ankle med °/s²', 'from unit read', 'ratio', 'max |gap| °/s²'].map((s, i) => pad(s, i ? 18 : 10)).join(''));
  for (const st of stances) {
    const rs = byStance(runs, st);
    if (!rs.length) continue;
    const fr = rs.flatMap((r) => r.filter((x) => num(x, 'apartSub') === 0));
    if (!fr.length) continue;
    const a = fr.map((x) => num(x, 'dk_ankle') * DEG);
    const b = fr.map((x) => num(x, 'ankleDeck') * -num(x, 'ankleTau') * DEG);
    out([st, `${fr.length}`, f(med(a), 0), f(med(b), 0), f(med(a) / med(b), 3),
      f(Math.max(...a.map((v, i) => Math.abs(v - b[i]))), 0)].map((s, i) => pad(s, i ? 18 : 10)).join(''));
  }
}
