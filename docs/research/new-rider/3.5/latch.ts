/**
 * **Step 3.5f: the planing LATCH's own band, 3–4 m/s — does the same stick produce a different ride on either side
 * of it?**
 *
 * The latch is three lines of `AttachedRider` [R, `:342–343`, `:3495`]:
 *
 *     const PLANING_SPEED = 4;
 *     const PLANING_DROP  = 3;
 *     if (this.planing ? speed < PLANING_DROP : speed > PLANING_SPEED) this.planing = !this.planing;
 *
 * so not planing needs `speed > 4` to start and planing holds until `speed < 3`, and between 3 and 4 the state is
 * **history**. Below the plane the lean the rider may ask for is capped at exactly 0 [R, `:3531`], so the stick asks
 * for no lean at all. The project's headline flat-control result (stick hard over against never touched, 0 mismatches
 * over 67 767 column-values) was measured over 1–3 m/s, **entirely inside the always-off region**; the band itself has
 * never been measured.
 *
 * **This file computes nothing about the physics.** Every column it reads is written per FRAME by `3.3/plant.ts`'s own
 * `MOUNT=` dump, and the three the question rests on are the game's own read-only `leanProbe` record: `planingNow`
 * (`leanProbe.planing`), `capDeg` (`leanProbe.cap`), `askDeg` (`leanProbe.ask`) and `throughProbe`
 * (`leanProbe.speedThrough`). Nothing under `src/` or `server/` is touched and no `planing` is ever set by hand — the
 * two histories are built out of the entry speed alone, which is a thing a player causes.
 *
 * ## THREE speeds, and only one of them is the latch's
 *
 * The round's first finding, and it is in the source:
 *
 * | quantity | where | what it is | the dump's column |
 * | --- | --- | --- | --- |
 * | the LATCH's | `planingStep` [R, `:3493`] | `hypot(v.x − flowX, v.z − flowZ)` — the **level magnitude** of the board's velocity through the water | `through` |
 * | the CAP's | `prepareBank` [R, `:3524`] | `v·f̂ − flow·f̂` — the component **along the heading** | `throughProbe` |
 * | the MOUNT's | `reset` [R, `:2857`] | `board.velocity.length()` — the full 3-D speed **with the water's flow still in it** | `speed` |
 *
 * `PLANING_SPEED = 4`, `PLANING_DROP = 3` and `PLANT_SPEEDS`' own floor of 4 are three more different things, two of
 * them 4; the floor is not read here at all.
 *
 * ## The two histories, and how each one was produced
 *
 * **H1 — the mount's own step.** The mount's test is on the 3-D speed **with the flow in it**, the latch's own is on
 * the speed **through** the water, so there is an entry speed at which standing up a hair faster latches the board on
 * at a speed through the water that is otherwise in the always-off region. The reader finds that entry from the data:
 * the adjacent pair of the ladder whose frame-1 `planingNow` differs. On this placement the two runs' speed through
 * the water differs by ~0.01 m/s (0.3 %) and their cap by ~17°. **Its own null controls are the adjacent pairs on
 * either side of it — same spacing, same everything, no latch step** — so "the divergence is the latch" is measured
 * against "the divergence is the 0.3 % of speed".
 *
 * **H2 — within a ride.** A run entered below 3 that accelerates past 4 keeps planing all the way back down to 3; a
 * run that never reaches 4 never planes. Both halves occur on the same ladder, so the band holds frames of both
 * states at matched speed, which §3 reads in 0.1 m/s bins.
 *
 * ## The live window
 *
 * `AttachedRider.separate` sets `attached`/`climbing`/`inContact`/`separation` and **never `phase` or `upright`**
 * [R, `:4586`], so every rider column freezes after separation. `3.3/plant.ts` breaks the run on the first frame with
 * `!attached || !upright || phase !== 'standing'` and emits that frame, so **this reader cuts each run at its first
 * frame with `attached == 0` and keeps the rest**: the cut frame is counted and printed, and so is any frame that is
 * attached while not upright or not standing, which would mean plant.ts's two extra conditions bit first.
 *
 * Per stance and per stick, never pooled, with the population printed beside every number.
 *
 * Run from the repository's root, after the dumps exist:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/latch.ts -o <scratch>/lt.mjs --format esm --platform node
 *   DIR=<scratch> ARMS=s16-s0,s16-s1,f73-s0,f73-s1 node <scratch>/lt.mjs
 *
 * Imports nothing from `src/` and writes nothing.
 */
import { existsSync, readFileSync } from 'node:fs';

const DIR = process.env.DIR ?? '.';
const ARMS = (process.env.ARMS ?? '').split(',').filter((s) => s.length);
const LO = Number(process.env.LO ?? 3);
const HI = Number(process.env.HI ?? 4);
/** The bin width the matched read inside the band is taken in, m/s. */
const BIN = Number(process.env.BIN ?? 0.1);

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const pad = (s: string, w: number) => s.padStart(w);
const out = (s: string) => process.stdout.write(`${s}\n`);
/** **The folder's own convention** [R, `3.4/mount.ts`]: `q(v, 0.5)` is the UPPER element of the middle pair. */
const q = (v: number[], p: number) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN;
};
const med = (v: number[]) => q(v, 0.5);
const span = (v: number[], d = 2) => {
  const s = v.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–';
};
/** `Math.max(...list)` on an empty list is −Infinity and on a list with a NaN is NaN: both avoided by hand. */
const peak = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length - 1] : Number.NaN; };

type Frame = Record<string, number | string | null>;
const num = (r: Frame, k: string) => { const v = r[k]; return typeof v === 'number' ? v : Number.NaN; };
const str = (r: Frame, k: string) => { const v = r[k]; return typeof v === 'string' ? v : String(v); };

interface Run {
  stance: string;
  steer: number;
  entry: number;
  /** The frames with `attached == 1`, in order. */
  live: Frame[];
  /** The whole run as dumped, including the frame the rider came off on. */
  all: Frame[];
  /** The first frame that is attached but not upright or not standing, if any: plant.ts's other two conditions. */
  oddAt: number;
}

function runsOf(path: string): Run[] {
  if (!existsSync(path)) return [];
  const rows = readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as Frame);
  const groups: Frame[][] = [];
  let cur: Frame[] = [];
  for (const r of rows) {
    if (num(r, 'frame') === 1 && cur.length) { groups.push(cur); cur = []; }
    cur.push(r);
  }
  if (cur.length) groups.push(cur);
  return groups.map((all) => {
    const live: Frame[] = [];
    let odd = Number.NaN;
    for (const r of all) {
      if (num(r, 'attached') !== 1) break;
      if (!Number.isFinite(odd) && (num(r, 'upright') !== 1 || str(r, 'phase') !== 'standing')) odd = num(r, 'frame');
      live.push(r);
    }
    return { stance: str(all[0], 'stance'), steer: num(all[0], 'steer'), entry: num(all[0], 'entryAsked'), live, all, oddAt: odd };
  });
}

/** The board's own heading, °, unwrapped so a turn through ±180° does not read as a 360°/frame yaw rate. */
function headings(run: Frame[]): number[] {
  const h: number[] = [];
  let off = 0;
  for (let i = 0; i < run.length; i += 1) {
    const raw = num(run[i], 'headOff');
    if (i > 0) {
      const prev = num(run[i - 1], 'headOff');
      if (raw - prev > 180) off -= 360;
      else if (raw - prev < -180) off += 360;
    }
    h.push(raw + off);
  }
  return h;
}

/** The board's own yaw rate per frame, °/s, differenced off the unwrapped heading at 60 Hz. Frame 1 has none. */
function yawRates(run: Frame[]): number[] {
  const h = headings(run);
  return h.map((v, i) => (i === 0 ? Number.NaN : (v - h[i - 1]) * 60));
}

const STANCES = ['tall', 'crouch', 'compress'];

out('# Step 3.5f — the planing latch\'s own band, 3–4 m/s');
out('#');
out(`# Every arm is RIDER=new FELT=deck BODY=two — the owner's own ?rider=new&feltFrame=deck&riderBody=two — at the`);
out("# folder's own placement (AHEAD 0.75, SIDE −45, 9 s a run, the stance held). `s16` is FACE=1.4,16,5.7, the");
out('# Canyon-matched arm (PR #223); `f73` is FACE=1.4,7.32,5.7, step 3.4h\'s closest fit to the owner\'s own water.');
out(`# -s0 is the stick NEVER TOUCHED, -s1 the stick HARD OVER. Band = [${LO}, ${HI}) m/s.`);

interface Arm { name: string; runs: Run[] }
const arms: Arm[] = ARMS.map((name) => ({ name, runs: runsOf(`${DIR}/${name}.mount.jsonl`) })).filter((a) => a.runs.length);

// ------------------------------------------------------------------------------------------------------------------
// §0 — the live window, and the three speeds.
// ------------------------------------------------------------------------------------------------------------------
out('');
out('## §0 The live window, and the three speeds the question has to keep apart');
out('');
out('  arm      runs  frames(all)  frames(live)  cut   odd   |through−probe| med/max   |speed3D−through| med/max');
for (const a of arms) {
  const all = a.runs.reduce((s, r) => s + r.all.length, 0);
  const live = a.runs.reduce((s, r) => s + r.live.length, 0);
  const odd = a.runs.filter((r) => Number.isFinite(r.oddAt)).length;
  const d1: number[] = [];
  const d2: number[] = [];
  for (const r of a.runs) for (const fr of r.live) {
    d1.push(Math.abs(num(fr, 'through') - num(fr, 'throughProbe')));
    d2.push(Math.abs(num(fr, 'speed') - num(fr, 'through')));
  }
  out(`  ${pad(a.name, 7)}  ${pad(String(a.runs.length), 4)}  ${pad(String(all), 11)}  ${pad(String(live), 12)}  ${pad(String(all - live), 3)}  ${pad(String(odd), 4)}   ${pad(f(med(d1), 3), 9)} / ${f(peak(d1), 3)}        ${pad(f(med(d2), 3), 9)} / ${f(peak(d2), 3)}`);
}
out('');
out('  `cut` is the frames dropped by cutting each run at its first `attached == 0` (one a run, the frame the rider');
out('  came off on). `odd` is the runs with a frame that is attached while not upright or not standing — plant.ts\'s');
out('  other two break conditions. The two speed columns are the SAME frames read three ways (m/s).');

// ------------------------------------------------------------------------------------------------------------------
// §1 — the latch's own behaviour on a ride: is the rule the source states the rule the ride shows?
// ------------------------------------------------------------------------------------------------------------------
out('');
out('## §1 The latch on a ride: every state change, against the rule in the source');
out('');
out('  Each row is one change of `planingNow` inside one run. `through` is the latch\'s own speed on the frame BEFORE');
out('  the change and on the frame OF it (the dump reads `through` after the step and `planingNow` from the last');
out('  `prepare` inside it, so the crossing is expected one frame early).');
out('');
out('  arm      stance    steer  entry   frame    t      0→1/1→0   through(prev→now)        probe(now)  cap(now)');
let changes = 0;
let consistent = 0;
for (const a of arms) {
  for (const r of a.runs) {
    for (let i = 1; i < r.live.length; i += 1) {
      const p = num(r.live[i - 1], 'planingNow');
      const n = num(r.live[i], 'planingNow');
      if (p === n) continue;
      changes += 1;
      const t0 = num(r.live[i - 1], 'through');
      const t1 = num(r.live[i], 'through');
      // On: the latch's speed must have been over PLANING_SPEED. Off: under PLANING_DROP. Either frame may carry it.
      const ok = n === 1 ? Math.max(t0, t1) > HI : Math.min(t0, t1) < LO;
      if (ok) consistent += 1;
      out(`  ${pad(a.name, 7)}  ${pad(r.stance, 8)}  ${pad(String(r.steer), 5)}  ${pad(f(r.entry, 2), 5)}  ${pad(String(num(r.live[i], 'frame')), 5)}  ${pad(f(num(r.live[i], 't'), 3), 5)}   ${p === 0 ? '0→1 (on) ' : '1→0 (off)'}  ${pad(f(t0, 3), 6)} → ${pad(f(t1, 3), 6)}  ${ok ? ' ' : '!'}      ${pad(f(num(r.live[i], 'throughProbe'), 3), 6)}    ${pad(f(num(r.live[i], 'capDeg'), 2), 6)}`);
    }
  }
}
out('');
out(`  ${consistent} of ${changes} changes are consistent with the rule on \`through\` within one frame ('!' marks any that are not).`);

// ------------------------------------------------------------------------------------------------------------------
// §2 — how much of a ride is in the band, and in which state.
// ------------------------------------------------------------------------------------------------------------------
out('');
out('## §2 How much of a ride sits in the band, and in which latch state');
out('');
out('  Live frames only. `band(through)` is the band on the LATCH\'s own speed; `band(probe)` the same window on the');
out('  speed the cap is built from. `on`/`off` split the band\'s frames by `planingNow`, and `runs` counts the runs');
out('  that have at least one frame of that kind.');
out('');
out('  arm      stance    steer  live    band(through)      on            off           band(probe)    runs on/off');
for (const a of arms) {
  for (const st of STANCES) {
    for (const steer of [0, 1]) {
      const rs = a.runs.filter((r) => r.stance === st && r.steer === steer);
      if (!rs.length) continue;
      let live = 0;
      let band = 0;
      let on = 0;
      let off = 0;
      let bandP = 0;
      let runsOn = 0;
      let runsOff = 0;
      for (const r of rs) {
        let hasOn = false;
        let hasOff = false;
        for (const fr of r.live) {
          live += 1;
          const th = num(fr, 'through');
          if (num(fr, 'throughProbe') >= LO && num(fr, 'throughProbe') < HI) bandP += 1;
          if (th < LO || th >= HI) continue;
          band += 1;
          if (num(fr, 'planingNow') === 1) { on += 1; hasOn = true; } else { off += 1; hasOff = true; }
        }
        if (hasOn) runsOn += 1;
        if (hasOff) runsOff += 1;
      }
      const pc = (x: number) => `${f((100 * x) / live, 1)} %`;
      out(`  ${pad(a.name, 7)}  ${pad(st, 8)}  ${pad(String(steer), 5)}  ${pad(String(live), 5)}   ${pad(String(band), 5)} ${pad(pc(band), 7)}    ${pad(String(on), 4)} ${pad(pc(on), 7)}  ${pad(String(off), 4)} ${pad(pc(off), 7)}  ${pad(String(bandP), 5)} ${pad(pc(bandP), 7)}  ${runsOn}/${runsOff} of ${rs.length}`);
    }
  }
}

// ------------------------------------------------------------------------------------------------------------------
// §2b — how long a run can sit in the band with the latch off: the dwell, per run.
// ------------------------------------------------------------------------------------------------------------------
out('');
out('## §2b The dwell: the longest unbroken stretch one run spends in the band OFF the plane');
out('');
out('  One number a run: the longest run of consecutive live frames with `through` in the band and `planingNow == 0`,');
out('  in seconds. Runs with no such frame are not counted and the count is printed, because that is the population.');
out('');
out('  arm      stance    runs with any   of    dwell span (s)   median (s)');
for (const a of arms) {
  for (const st of STANCES) {
    const rs = a.runs.filter((r) => r.stance === st);
    if (!rs.length) continue;
    const dwells: number[] = [];
    for (const r of rs) {
      let best = 0;
      let cur = 0;
      for (const fr of r.live) {
        const th = num(fr, 'through');
        cur = th >= LO && th < HI && num(fr, 'planingNow') === 0 ? cur + 1 : 0;
        if (cur > best) best = cur;
      }
      if (best) dwells.push(best / 60);
    }
    out(`  ${pad(a.name, 7)}  ${pad(st, 8)}  ${pad(String(dwells.length), 13)}   ${pad(String(rs.length), 3)}   ${pad(span(dwells, 3), 14)}   ${f(med(dwells), 3)}`);
  }
}

// ------------------------------------------------------------------------------------------------------------------
// §3 — the owner's own question: how much does the STICK change, in each latch state, at the same speed?
// ------------------------------------------------------------------------------------------------------------------
out('');
out('## §3 The stick\'s own authority, per latch state — the stick never touched against the stick hard over');
out('');
out('  The measured form of "unresponsive". For every face, stance and entry the reader pairs the `-s0` run (the stick');
out('  NEVER TOUCHED) with the `-s1` run (the stick HARD OVER): the same water, the same placement, the same stance,');
out('  the same entry — one input changed. It then counts **column-values**, as step 3.5a\'s flat-control result did:');
out('  every numeric column of the dump that is not a label, on every frame both runs are live for, compared pair to');
out('  pair, split by the latch state the frame is in. `mism(1e-9)` is how many of those values differ at all.');
out('');
out('  `virgin` = off the plane and NEITHER run has planed yet (the honest off-plane population); `after` = off the');
out('  plane but one of them has already planed, so the pair had already parted; `on` = planing.');
out('');
out('  arm   stance    entry  frames  cols  state   values      mism(1e-9)   mism(1e-6)  firstΔ t   |Δroll| max  |Δrail| max  |Δhead| last');
/** The dump's own labels: not columns, so not counted. `steer` is the input that is changed by construction. */
const LABELS = new Set(['body', 'cost', 'place', 'stance', 'steer', 'entryAsked', 'extra', 'wheel', 'mount', 'arange',
  'floor', 'frame', 't', 'bankClamp', 'phase']);
interface Auth { arm: string; stance: string; entry: number; state: string; values: number; mism: number; mism6: number; dRoll: number; dHead: number; frames: number }
const auths: Auth[] = [];
for (const a of arms) {
  if (!a.name.endsWith('-s0')) continue;
  const other = arms.find((x) => x.name === `${a.name.slice(0, -3)}-s1`);
  if (!other) continue;
  for (const st of STANCES) {
    const zeros = a.runs.filter((r) => r.stance === st).sort((x, y) => x.entry - y.entry);
    for (const A of zeros) {
      const B = other.runs.find((r) => r.stance === st && r.entry === A.entry);
      if (!B) continue;
      const n = Math.min(A.live.length, B.live.length);
      if (!n) continue;
      const keys = Object.keys(A.live[0]).filter((k) => !LABELS.has(k) && typeof A.live[0][k] === 'number');
      const hA = headings(A.live);
      const hB = headings(B.live);
      // Split the frames by the latch state they are in. Until the two runs part they are the same state by
      // construction; after they part the s0 run's own state names the row, which is said on the table.
      const blank = () => ({ values: 0, mism: 0, mism6: 0, dRoll: [] as number[], frames: 0, firstT: Number.NaN, lastI: -1 });
      const buckets: Record<string, ReturnType<typeof blank>> = { virgin: blank(), after: blank(), on: blank() };
      /**
       * **The partition, and the one thing it has to keep apart.** A frame off the plane whose run has ALREADY
       * planed is not a test of the stick off the plane: by then the two runs have parted, and what the columns
       * carry is the divergence they took while planing. `virgin` is the frames where NEITHER run has had
       * `planingNow == 1` on any frame up to and including this one; `after` is every other off-plane frame.
       */
      let planedEver = false;
      for (let i = 0; i < n; i += 1) {
        if (num(A.live[i], 'planingNow') === 1 || num(B.live[i], 'planingNow') === 1) planedEver = true;
        const which = num(A.live[i], 'planingNow') === 1 ? 'on' : planedEver ? 'after' : 'virgin';
        const bk = buckets[which];
        bk.frames += 1;
        bk.lastI = i;
        bk.dRoll.push(Math.abs(num(A.live[i], 'roll') - num(B.live[i], 'roll')));
        for (const k of keys) {
          const va = A.live[i][k];
          const vb = B.live[i][k];
          if (typeof va !== 'number' || typeof vb !== 'number') continue;
          bk.values += 1;
          const d = Math.abs(va - vb);
          if (d > 1e-9) { bk.mism += 1; if (!Number.isFinite(bk.firstT)) bk.firstT = num(A.live[i], 't'); }
          if (d > 1e-6) bk.mism6 += 1;
        }
      }
      let planedEver2 = false;
      const stateAt: string[] = [];
      for (let i = 0; i < n; i += 1) {
        if (num(A.live[i], 'planingNow') === 1 || num(B.live[i], 'planingNow') === 1) planedEver2 = true;
        stateAt.push(num(A.live[i], 'planingNow') === 1 ? 'on' : planedEver2 ? 'after' : 'virgin');
      }
      for (const which of ['virgin', 'after', 'on'] as const) {
        const bk = buckets[which];
        if (!bk.frames) continue;
        const dRailMax = peak(Array.from({ length: n }, (_, i) => (stateAt[i] === which ? Math.abs(num(A.live[i], 'rail') - num(B.live[i], 'rail')) : Number.NaN)));
        const dHead = bk.lastI >= 0 ? Math.abs(hA[bk.lastI] - hB[bk.lastI]) : Number.NaN;
        out(`  ${pad(a.name.slice(0, -3), 4)}  ${pad(st, 8)}  ${pad(f(A.entry, 2), 5)}  ${pad(String(bk.frames), 6)}  ${pad(String(keys.length), 4)}  ${pad(which, 6)}  ${pad(String(bk.values), 7)}  ${pad(String(bk.mism), 10)}   ${pad(String(bk.mism6), 10)}  ${pad(Number.isFinite(bk.firstT) ? f(bk.firstT, 3) : '–', 9)}  ${pad(f(peak(bk.dRoll), 3), 11)}  ${pad(f(dRailMax, 3), 11)}  ${pad(f(dHead, 3), 11)}`);
        auths.push({ arm: a.name.slice(0, -3), stance: st, entry: A.entry, state: which, values: bk.values, mism: bk.mism, mism6: bk.mism6, dRoll: peak(bk.dRoll), dHead, frames: bk.frames });
      }
    }
  }
}
out('');
out('  Collected over every entry of the ladder, per face and per latch state — the headline of the round:');
out('');
out('  arm   state   run-pairs  frames  column-values  mismatches(1e-9)  share        |Δroll| max span   |Δhead| last span');
for (const arm of [...new Set(auths.map((x) => x.arm))]) {
  for (const state of ['virgin', 'after', 'on']) {
    const rows = auths.filter((x) => x.arm === arm && x.state === state);
    if (!rows.length) continue;
    const values = rows.reduce((s, x) => s + x.values, 0);
    const mism = rows.reduce((s, x) => s + x.mism, 0);
    const frames = rows.reduce((s, x) => s + x.frames, 0);
    out(`  ${pad(arm, 4)}  ${pad(state, 6)}  ${pad(String(rows.length), 9)}  ${pad(String(frames), 6)}  ${pad(String(values), 13)}  ${pad(String(mism), 16)}  ${pad(`${f((100 * mism) / values, 2)} %`, 11)}  ${pad(span(rows.map((x) => x.dRoll), 2), 17)}  ${span(rows.map((x) => x.dHead), 2)}`);
  }
}
out('');
out('  And the same two states restricted to the BAND itself (`through` in the band on the s0 run\'s own frame), so');
out('  the comparison is at the speeds the question is about and not at every speed the ladder passes through:');
out('');
out('  arm   state   frames  column-values  mismatches(1e-9)  share        |Δroll| max   |Δrail| max   |Δbank| max');
for (const a of arms) {
  if (!a.name.endsWith('-s0')) continue;
  const other = arms.find((x) => x.name === `${a.name.slice(0, -3)}-s1`);
  if (!other) continue;
  const blank2 = () => ({ values: 0, mism: 0, frames: 0, dRoll: [] as number[], dRail: [] as number[], dBank: [] as number[] });
  const tot: Record<string, ReturnType<typeof blank2>> = { virgin: blank2(), after: blank2(), on: blank2() };
  for (const st of STANCES) {
    for (const A of a.runs.filter((r) => r.stance === st)) {
      const B = other.runs.find((r) => r.stance === st && r.entry === A.entry);
      if (!B) continue;
      const n = Math.min(A.live.length, B.live.length);
      const keys = n ? Object.keys(A.live[0]).filter((k) => !LABELS.has(k) && typeof A.live[0][k] === 'number') : [];
      let planedEver3 = false;
      for (let i = 0; i < n; i += 1) {
        if (num(A.live[i], 'planingNow') === 1 || num(B.live[i], 'planingNow') === 1) planedEver3 = true;
        const th = num(A.live[i], 'through');
        if (th < LO || th >= HI) continue;
        const bk = tot[num(A.live[i], 'planingNow') === 1 ? 'on' : planedEver3 ? 'after' : 'virgin'];
        bk.frames += 1;
        bk.dRoll.push(Math.abs(num(A.live[i], 'roll') - num(B.live[i], 'roll')));
        bk.dRail.push(Math.abs(num(A.live[i], 'rail') - num(B.live[i], 'rail')));
        bk.dBank.push(Math.abs(num(A.live[i], 'bank') - num(B.live[i], 'bank')));
        for (const k of keys) {
          const va = A.live[i][k];
          const vb = B.live[i][k];
          if (typeof va !== 'number' || typeof vb !== 'number') continue;
          bk.values += 1;
          if (Math.abs(va - vb) > 1e-9) bk.mism += 1;
        }
      }
    }
  }
  for (const state of ['virgin', 'after', 'on'] as const) {
    const bk = tot[state];
    if (!bk.frames) continue;
    out(`  ${pad(a.name.slice(0, -3), 4)}  ${pad(state, 6)}  ${pad(String(bk.frames), 6)}  ${pad(String(bk.values), 13)}  ${pad(String(bk.mism), 16)}  ${pad(`${f((100 * bk.mism) / bk.values, 2)} %`, 11)}  ${pad(f(peak(bk.dRoll), 2), 11)}   ${pad(f(peak(bk.dRail), 2), 11)}   ${pad(f(peak(bk.dBank), 2), 11)}`);
  }
}

// ------------------------------------------------------------------------------------------------------------------
// §4 — H1: the mount's own step, with its null controls.
// ------------------------------------------------------------------------------------------------------------------
out('');
out('## §4 H1 — the pair of runs the latch separates at the MOUNT, and the null pairs beside it');
out('');
out('  For each arm and stance the reader finds the adjacent pair of the entry ladder whose frame-1 `planingNow`');
out('  differs (`LATCH`), and the adjacent pairs immediately below and above it, which do not (`null−`, `null+`).');
out('  **The mount flips TWO things at that step, not one**: `reset` sets `planing` (and so the ask cap) AND `banked`');
out('  — the body\'s placement, plumb or square to the deck — off the same test [R, `AttachedRider.ts:2857–2860`],');
out('  so this pair is the latch at the mount and not the cap alone. The `-s0` rows, where the ask is identically 0');
out('  on both sides, are the `banked` channel with the cap taken out of it.');
out('  Every pair is the same water, the same placement, the same stance and the same stick; the pair\'s own');
out('  Δthrough(f1) is printed, so the confound is a number on the row. Δ columns are |A − B| over the frames both');
out('  runs are live for, and the time is each pair\'s own.');
out('');
out('  arm      stance    steer  kind    entries        n   Δthrough(f1)  Δcap med/max   Δask med/max   Δroll med/max   Δrail med/max   Δbank med/max   Δyaw° /s med/max   Δhead(last)');
interface PairRow { arm: string; stance: string; steer: number; kind: string; dRoll: number; dRail: number; dYaw: number; dHead: number; n: number }
const pairRows: PairRow[] = [];
for (const a of arms) {
  for (const st of STANCES) {
    for (const steer of [0, 1]) {
      const rs = a.runs.filter((r) => r.stance === st && r.steer === steer).sort((x, y) => x.entry - y.entry);
      if (rs.length < 3) continue;
      const planing1 = (r: Run) => (r.live.length ? num(r.live[0], 'planingNow') : Number.NaN);
      let k = -1;
      for (let i = 1; i < rs.length; i += 1) if (planing1(rs[i - 1]) === 0 && planing1(rs[i]) === 1) { k = i; break; }
      if (k < 1) continue;
      const pairs: { kind: string; a: Run; b: Run }[] = [];
      if (k >= 2) pairs.push({ kind: 'null−', a: rs[k - 2], b: rs[k - 1] });
      pairs.push({ kind: 'LATCH', a: rs[k - 1], b: rs[k] });
      if (k + 1 < rs.length) pairs.push({ kind: 'null+', a: rs[k], b: rs[k + 1] });
      for (const p of pairs) {
        const n = Math.min(p.a.live.length, p.b.live.length);
        const yA = yawRates(p.a.live);
        const yB = yawRates(p.b.live);
        const hA = headings(p.a.live);
        const hB = headings(p.b.live);
        const d: Record<string, number[]> = { cap: [], ask: [], roll: [], rail: [], bank: [], yaw: [] };
        for (let i = 0; i < n; i += 1) {
          d.cap.push(Math.abs(num(p.a.live[i], 'capDeg') - num(p.b.live[i], 'capDeg')));
          d.ask.push(Math.abs(num(p.a.live[i], 'askDeg') - num(p.b.live[i], 'askDeg')));
          d.roll.push(Math.abs(num(p.a.live[i], 'roll') - num(p.b.live[i], 'roll')));
          d.rail.push(Math.abs(num(p.a.live[i], 'rail') - num(p.b.live[i], 'rail')));
          d.bank.push(Math.abs(num(p.a.live[i], 'bank') - num(p.b.live[i], 'bank')));
          if (i > 0) d.yaw.push(Math.abs(yA[i] - yB[i]));
        }
        const dHead = n > 0 ? Math.abs(hA[n - 1] - hB[n - 1]) : Number.NaN;
        const dTh = Math.abs(num(p.a.live[0], 'through') - num(p.b.live[0], 'through'));
        out(`  ${pad(a.name, 7)}  ${pad(st, 8)}  ${pad(String(steer), 5)}  ${pad(p.kind, 6)}  ${pad(`${f(p.a.entry, 2)}/${f(p.b.entry, 2)}`, 11)}  ${pad(String(n), 4)}  ${pad(f(dTh, 4), 10)}    ${pad(f(med(d.cap), 2), 5)} / ${pad(f(peak(d.cap), 2), 5)}  ${pad(f(med(d.ask), 2), 5)} / ${pad(f(peak(d.ask), 2), 5)}  ${pad(f(med(d.roll), 2), 5)} / ${pad(f(peak(d.roll), 2), 5)}  ${pad(f(med(d.rail), 2), 5)} / ${pad(f(peak(d.rail), 2), 5)}  ${pad(f(med(d.bank), 2), 5)} / ${pad(f(peak(d.bank), 2), 5)}  ${pad(f(med(d.yaw), 2), 6)} / ${pad(f(peak(d.yaw), 2), 6)}  ${pad(f(dHead, 2), 7)}`);
        pairRows.push({ arm: a.name, stance: st, steer, kind: p.kind, dRoll: peak(d.roll), dRail: peak(d.rail), dYaw: peak(d.yaw), dHead, n });
      }
    }
  }
}
out('');
out('  And the same three kinds collected, so the latch pair is read against its own nulls and not against nothing:');
out('');
out('  kind    pairs   Δroll(max) span      Δrail(max) span      Δyaw(max) span       Δhead(last) span     n span');
for (const kind of ['null−', 'LATCH', 'null+']) {
  const rows = pairRows.filter((r) => r.kind === kind);
  if (!rows.length) continue;
  out(`  ${pad(kind, 6)}  ${pad(String(rows.length), 5)}   ${pad(span(rows.map((r) => r.dRoll)), 18)}   ${pad(span(rows.map((r) => r.dRail)), 18)}   ${pad(span(rows.map((r) => r.dYaw)), 18)}   ${pad(span(rows.map((r) => r.dHead)), 18)}   ${span(rows.map((r) => r.n), 0)}`);
}

// ------------------------------------------------------------------------------------------------------------------
// §4b — the latch pair frame by frame, because a median hides when the two rides part.
// ------------------------------------------------------------------------------------------------------------------
out('');
out('## §4b The latch pair frame by frame (the first 0.5 s, every third frame)');
out('');
for (const a of arms) {
  for (const st of STANCES) {
    for (const steer of [0, 1]) {
      const rs = a.runs.filter((r) => r.stance === st && r.steer === steer).sort((x, y) => x.entry - y.entry);
      const planing1 = (r: Run) => (r.live.length ? num(r.live[0], 'planingNow') : Number.NaN);
      let k = -1;
      for (let i = 1; i < rs.length; i += 1) if (planing1(rs[i - 1]) === 0 && planing1(rs[i]) === 1) { k = i; break; }
      if (k < 1) continue;
      const A = rs[k - 1];
      const B = rs[k];
      const n = Math.min(A.live.length, B.live.length);
      out(`  ${a.name} ${st} steer=${steer}: OFF entry ${f(A.entry, 2)} (${A.live.length} live frames) vs ON entry ${f(B.entry, 2)} (${B.live.length})`);
      out('    t       through off/on   planing   cap off/on      ask off/on      roll off/on       rail off/on       bank off/on       yaw°/s off/on');
      const yA = yawRates(A.live);
      const yB = yawRates(B.live);
      for (let i = 0; i < Math.min(n, 31); i += 3) {
        const g = (k2: string) => `${pad(f(num(A.live[i], k2), 2), 6)}/${pad(f(num(B.live[i], k2), 2), 6)}`;
        out(`    ${pad(f(num(A.live[i], 't'), 3), 5)}   ${g('through')}   ${num(A.live[i], 'planingNow')}/${num(B.live[i], 'planingNow')}       ${g('capDeg')}   ${g('askDeg')}   ${g('roll')}    ${g('rail')}    ${g('bank')}    ${pad(f(yA[i], 1), 6)}/${pad(f(yB[i], 1), 6)}`);
      }
      out('');
    }
  }
}

// ------------------------------------------------------------------------------------------------------------------
// §5 — H2: matched speed inside the band, both states, in bins.
// ------------------------------------------------------------------------------------------------------------------
out('');
out('## §5 H2 — matched speed inside the band: the two states\' frames in the same 0.1 m/s bin');
out('');
out('  Live frames with `through` in the band, binned on the LATCH\'s own speed, per stance and stick. `runs` is how');
out('  many distinct runs the bin\'s frames come from, so a bin carried by one trajectory is visible. Only bins that');
out('  hold BOTH states are printed, because a bin with one state in it cannot answer the question.');
out('');
out('  arm      stance    steer  bin        state  n    runs  cap med   |ask| med  |rail| med  |bank| med  |yaw| med  |rollRate| med  radius med');
for (const a of arms) {
  for (const st of STANCES) {
    for (const steer of [0, 1]) {
      const rs = a.runs.filter((r) => r.stance === st && r.steer === steer);
      if (!rs.length) continue;
      const bins = new Map<number, { on: Frame[]; off: Frame[]; onRuns: Set<number>; offRuns: Set<number>; onYaw: number[]; offYaw: number[] }>();
      for (const r of rs) {
        const y = yawRates(r.live);
        for (let i = 0; i < r.live.length; i += 1) {
          const fr = r.live[i];
          const th = num(fr, 'through');
          if (th < LO || th >= HI) continue;
          const b = Math.floor((th - LO) / BIN);
          if (!bins.has(b)) bins.set(b, { on: [], off: [], onRuns: new Set(), offRuns: new Set(), onYaw: [], offYaw: [] });
          const e = bins.get(b)!;
          if (num(fr, 'planingNow') === 1) { e.on.push(fr); e.onRuns.add(r.entry); e.onYaw.push(Math.abs(y[i])); }
          else { e.off.push(fr); e.offRuns.add(r.entry); e.offYaw.push(Math.abs(y[i])); }
        }
      }
      for (const b of [...bins.keys()].sort((x, y2) => x - y2)) {
        const e = bins.get(b)!;
        if (!e.on.length || !e.off.length) continue;
        const lo = LO + b * BIN;
        for (const which of ['off', 'on'] as const) {
          const fs = which === 'on' ? e.on : e.off;
          const runs = which === 'on' ? e.onRuns : e.offRuns;
          const yy = (which === 'on' ? e.onYaw : e.offYaw).filter(Number.isFinite);
          const col = (k: string, abs = true) => med(fs.map((x) => (abs ? Math.abs(num(x, k)) : num(x, k))));
          const yawMed = med(yy);
          const vMed = med(fs.map((x) => num(x, 'throughProbe')));
          const radius = yawMed > 1e-6 ? vMed / (yawMed / (180 / Math.PI)) : Number.NaN;
          out(`  ${pad(a.name, 7)}  ${pad(st, 8)}  ${pad(String(steer), 5)}  ${pad(`${f(lo, 1)}–${f(lo + BIN, 1)}`, 9)}  ${pad(which, 5)}  ${pad(String(fs.length), 3)}  ${pad(String(runs.size), 4)}  ${pad(f(col('capDeg', false), 2), 7)}  ${pad(f(col('askDeg'), 2), 9)}  ${pad(f(col('rail'), 2), 10)}  ${pad(f(col('bank'), 2), 10)}  ${pad(f(yawMed, 1), 9)}  ${pad(f(col('rollRateAxis'), 1), 14)}  ${pad(f(radius, 1), 9)}`);
        }
      }
    }
  }
}
out('');
out('  `cap med` is signed (it is 0 by construction off the plane); every other angle column is the median of its own');
out('  magnitude, °, °/s for the rates; `radius` is the bin\'s median speed through the water over its median yaw');
out('  rate, m — the turn the board is actually carving, not the one the cap was built on.');
// ------------------------------------------------------------------------------------------------------------------
// §6 — the real Canyon sea: how much of an actual ride on the owner's own spot sits in the band, and in which state.
// ------------------------------------------------------------------------------------------------------------------
const CANYON = process.env.CANYON;
if (CANYON && existsSync(CANYON)) {
  out('');
  out('## §6 The real Canyon sea — how much of an actual ride sits in the band, and in which state');
  out('');
  out("  `3.5/foam.ts`'s `MODE=ride` rig on the owner's own spot: the real Canyon sea as `?canyonWaves=true` builds");
  out('  it (`canyonBed: \'b\'`, stage 2, CPU, 1/60 s), each rider placed where the corridor\'s foam toe crosses the');
  out('  ride line, `?rider=new&feltFrame=deck&riderBody=two`. **The rig\'s stick is never touched** (`rd.steer = 0`),');
  out('  so this section is the OCCUPANCY of the band and not a steering test. Live frames only, cut at the first');
  out('  `attached == 0`, and the five columns it reads are step 3.5f\'s own read-only addition to that file.');
  out('');
  const rows = readFileSync(CANYON, 'utf8').split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as Frame)
    .filter((r) => str(r, 'kind') === 'ride');
  const byRider = new Map<string, Frame[]>();
  for (const r of rows) {
    const k = `${num(r, 'trial')}|${str(r, 'arm')}|${str(r, 'stance')}|${num(r, 'entry')}|${num(r, 'ahead')}`;
    if (!byRider.has(k)) byRider.set(k, []);
    byRider.get(k)!.push(r);
  }
  const cells = new Map<string, { riders: number; live: number; band: number; bandOn: number; bandOff: number; below: number; above: number; onAny: number; lostIt: number }>();
  for (const [k, all] of byRider) {
    all.sort((x, y) => num(x, 'frame') - num(y, 'frame'));
    const live: Frame[] = [];
    for (const r of all) { if (num(r, 'attached') !== 1) break; live.push(r); }
    if (!live.length) continue;
    const key = `${str(live[0], 'stance')}|${num(live[0], 'entry')}`;
    if (!cells.has(key)) cells.set(key, { riders: 0, live: 0, band: 0, bandOn: 0, bandOff: 0, below: 0, above: 0, onAny: 0, lostIt: 0 });
    const c = cells.get(key)!;
    c.riders += 1;
    let planed = false;
    let lost = false;
    for (const fr of live) {
      c.live += 1;
      const th = num(fr, 'through');
      const on = num(fr, 'planingNow') === 1;
      if (on) planed = true;
      else if (planed) lost = true;
      if (th < LO) c.below += 1;
      else if (th >= HI) c.above += 1;
      else { c.band += 1; if (on) c.bandOn += 1; else c.bandOff += 1; }
    }
    if (planed) c.onAny += 1;
    if (lost) c.lostIt += 1;
    void k;
  }
  out('  stance    entry  riders  live   through<3     3–4 band      on      off     through≥4     planed  lost the plane');
  for (const key of [...cells.keys()].sort()) {
    const c = cells.get(key)!;
    const [st, ent] = key.split('|');
    const pc = (x: number) => `${f((100 * x) / c.live, 1)} %`;
    out(`  ${pad(st, 8)}  ${pad(ent, 5)}  ${pad(String(c.riders), 6)}  ${pad(String(c.live), 5)}  ${pad(String(c.below), 5)} ${pad(pc(c.below), 7)}  ${pad(String(c.band), 4)} ${pad(pc(c.band), 7)}  ${pad(String(c.bandOn), 5)}  ${pad(String(c.bandOff), 5)}  ${pad(String(c.above), 5)} ${pad(pc(c.above), 7)}  ${pad(`${c.onAny}/${c.riders}`, 6)}  ${c.lostIt}/${c.riders}`);
  }
  out('');
  out('  `planed` is the riders that ever had `planingNow == 1`; `lost the plane` the riders that had it and then did');
  out('  not, while still attached. `through<3` is the always-off region — the ask cap is exactly 0 on every one of');
  out('  those frames, whatever the history is.');
}

out('');
out('# end');
