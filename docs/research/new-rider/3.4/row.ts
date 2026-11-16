/**
 * Step 3.4c: **the roll row per source, and the matched-state decomposition of 3.4b's gain effect.**
 *
 * Read-only. It reads the per-tick `.jsonl` files `3.3/plant.ts` writes with `TICKS=<path>` and nothing else; it runs
 * no simulation and imports nothing from `src/`.
 *
 * ## What it is for
 *
 * 3.4b changed **only the controller's gains** — Φ and Γ byte-identical — and the roll row's relative error against
 * the bank ledger fell 10.050 → 2.622, the row six rounds had called immovable. Its own §7 item 1 asked for the
 * measurement that splits that: *"the roll row per source against the game at a **FIXED trajectory** — one recorded
 * ride, several sets of gains."*
 *
 * The probe's own `GAINS=1` block answers the fixed-trajectory half as an identity: with the recorded state **and**
 * the recorded command, the model's roll row is the same number in all four cost arms, because the cost weights enter
 * `design` only through `k` [R]. So the gains can reach the roll row **only** through the command `u` and through
 * which states the ride visits. This file separates those two, exactly.
 *
 * ## The decomposition, and why it is on a log mean rather than a median
 *
 * A median is not additive, so a shift–share on medians is not an identity. The roll row's relative error spans four
 * orders of magnitude, so its own natural centre is the **geometric** mean, and `log |rollRel|` **is** additive. With
 * ticks binned by the state they were taken at,
 *
 *     M_arm = Σ_b w_b^arm · m_b^arm ,   m_b = mean of log|rollRel| over bin b,  w_b = bin b's share of the arm's ticks
 *
 * and for two arms A and B
 *
 *     M_B − M_A  =  Σ_b (w_b^B − w_b^A) · m_b^A       ← COMPOSITION: which states the arm visits (the trajectory)
 *                +  Σ_b  w_b^B · (m_b^B − m_b^A)      ← WITHIN-BIN: the same state, a different command (the loop)
 *
 * which is exact, and the file prints the closure of it rather than asserting it. The median per bin is printed
 * beside every log mean so neither statistic carries the conclusion alone, and the population of every bin is
 * printed so none is read off a handful of ticks.
 *
 * **Bins.** Three binnings are run, never pooled and never netted:
 * - `game`: the game's own roll acceleration `|rollAccGame|`, log-spaced — the relative error's own denominator, and
 *   the first thing a gain set can change about the row without changing the model.
 * - `rail`: the board's own measured rail, which is the state the water's derivatives are read against.
 * - `cond`: the game's own near-cancellation `condGame`, which is 3.3p's own explanation of the row's size.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/row.ts -o <scratch>/row.mjs --format esm --platform node
 *   DIR=docs/research/new-rider/3.4/results/34c node <scratch>/row.mjs
 *
 * Env: `DIR` (where the `.ticks.jsonl` files are), `CELL` (the cell's name, default `unsteered-deck`), `MIN` (the
 * fewest ticks a bin must hold in BOTH arms to be used, default 20), `PLANT=point|two` (which arms' files to read),
 * `TWO=1` (read the two-body plant's own per-source columns instead of the shipped plant's, on the same ticks).
 *
 * **The committed tick files are gzipped** (`.ticks.jsonl.gz`), because the round's own raw record is 55 MB
 * uncompressed and this folder's earlier rounds committed about six. `gunzip -k` them before re-running this file.
 */
import { readFileSync, readdirSync } from 'node:fs';

const DIR = process.env.DIR ?? 'docs/research/new-rider/3.4/results/34c';
const CELL = process.env.CELL ?? 'unsteered-deck';
const MIN = Number(process.env.MIN ?? 20);
const PLANT = process.env.PLANT === 'two' ? 'two' : 'point';
const ARMS = ['off', 'point', 'fixed', 'plant'];

interface Row {
  cost: string; body: string; stance: string; steer: number; entryAsked: number | null; extra: number | null; t: number;
  speed: number; railMeas: number; roll: number; bank: number; through: number;
  rollAccGame: number; rollAccModel: number; rollAccFull: number;
  rollRel: number; relFull: number; rollSign: number;
  rollCmd: number; rollState: number; cmdShareModel: number; cmdShareGame: number;
  condGame: number; condModel: number;
  eWater: number; eAnkle: number; eTwist: number; eRest: number; eFeetFwd: number;
  gWaterBoard: number; gAnkleSrc: number; gTwistSrc: number; gRestSrc: number;
  eNet: number; eClose: number; gDeckClose: number;
  eWaterTwo: number; eAnkleTwo: number; eTwistTwo: number; eRestTwo: number; eFeetFwdTwo: number; eNetTwo: number;
  gainRollSwing: number; gainSwingShare: number; gainCmdSwing: number; cmdRebuild: number;
  gainRowOff: number; gainPlantOff: number;
  ankleRoomHere: number; gainClamped: number;
  rollAccTwo: number; relTwo: number;
  /** The brief's own measurement, per tick: the same row under each of the four gain sets' own commands. */
  subst_off: number; subst_point: number; subst_fixed: number; subst_plant: number;
  substBank_off: number; substBank_point: number; substBank_fixed: number; substBank_plant: number;
  substHelps_off: number; substHelps_point: number; substHelps_fixed: number; substHelps_plant: number;
}

const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const median = (v: number[]) => { const s = sorted(v); return s.length ? s[Math.floor(0.5 * s.length)] : Number.NaN; };
const mean = (v: number[]) => { const s = v.filter(Number.isFinite); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : Number.NaN; };
/** `Math.max(...list, NaN)` is NaN for every list — this folder's own trap, avoided by hand. */
const peak = (v: number[]) => { const s = sorted(v); return s.length ? s[s.length - 1] : Number.NaN; };
const span = (v: number[], d = 3) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };

function load(name: string): Row[] {
  const file = `${DIR}/34c-${name}.ticks.jsonl`;
  const out: Row[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    out.push(JSON.parse(line) as Row);
  }
  return out;
}

/** The ticks a comparison may use: the relative error must exist on BOTH sides and be finite and non-zero. */
const usable = (r: Row) => Number.isFinite(r.rollRel) && Math.abs(r.rollRel) > 0 && Number.isFinite(r.rollAccGame);
/**
 * The error the decomposition is of: **the row the arm actually ran**, which is `rollRel` on both plants, because a
 * `BODY=two` arm rides the two-body design and `rollRel` is that design's own row against the game. `relTwo` is the
 * two-body plant scored as a counterfactual and is NOT the ridden row on a two-body arm, so it is not used here.
 * `PLANT` selects which files are read, not which column.
 */
const err = (r: Row) => Math.abs(r.rollRel);

type Binner = { key: string; of: (r: Row) => number; edges: number[]; label: string };
const BINNERS: Binner[] = [
  { key: 'game', label: "the game's own |roll acceleration|, °/s²", of: (r) => Math.abs(r.rollAccGame), edges: [0, 20, 60, 150, 400, Infinity] },
  { key: 'rail', label: "the board's own measured |rail|, °", of: (r) => Math.abs(r.railMeas), edges: [0, 5, 12, 25, 45, Infinity] },
  { key: 'cond', label: "the GAME's own near-cancellation condGame, x", of: (r) => r.condGame, edges: [0, 1.5, 3, 7, 20, Infinity] },
  // **The control the other three need.** The arms do not live the same length — the shipped arm ends at 1.183 s and
  // the weighted one at 4.317 s — so matching the STATE does not match the TIME, and an error that is large early
  // would show up as a within-bin term that is really the ride's age. This binning matches the time.
  { key: 'time', label: 'the tick\'s own time in the ride, s', of: (r) => r.t, edges: [0.2, 0.4, 0.6, 0.8, 1.0, Infinity] },
  /** And the two together, coarsely: time × the game's own row, so neither can stand in for the other. */
  { key: 'timegame', label: "time x the game's own |roll acceleration| (4 x 3 cells)", of: (r) => {
    const ti = r.t < 0.5 ? 0 : r.t < 0.8 ? 1 : r.t < 1.2 ? 2 : 3;
    const gi = Math.abs(r.rollAccGame) < 50 ? 0 : Math.abs(r.rollAccGame) < 200 ? 1 : 2;
    return ti * 3 + gi + 0.5;
  }, edges: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
];

const binOf = (b: Binner, r: Row) => {
  const v = b.of(r);
  if (!Number.isFinite(v)) return -1;
  for (let i = 0; i < b.edges.length - 1; i += 1) if (v >= b.edges[i] && v < b.edges[i + 1]) return i;
  return -1;
};

const files = readdirSync(DIR).filter((n) => n.endsWith('.ticks.jsonl'));
process.stdout.write(`# step 3.4c — the roll row per source and the matched-state decomposition, cell ${CELL}, plant ${PLANT}\n`);
process.stdout.write(`# ${files.length} tick files in ${DIR}\n`);

const prefix = PLANT === 'two' ? 'two-' : '';
const data: Record<string, Row[]> = {};
for (const arm of ARMS) {
  const name = `${prefix}${arm}-${CELL}`;
  try { data[arm] = load(name).filter(usable); } catch { process.stdout.write(`# MISSING ${name}\n`); }
}
const present = ARMS.filter((a) => data[a]?.length);
process.stdout.write(`# arms present: ${present.map((a) => `${a} (${data[a].length} live ticks)`).join(', ')}\n`);

// ---------- 0. the controls, read off every arm's own ticks ----------
process.stdout.write('\n## 0. The controls, read off the ticks themselves\n');
for (const arm of present) {
  const d = data[arm];
  process.stdout.write(`#  ${arm.padEnd(6)} P1 |Δrow| across the four designs peak ${peak(d.map((r) => r.gainRowOff)).toExponential(2)}`
    + ` | |ΔΦ|,|ΔΓ| peak ${peak(d.map((r) => r.gainPlantOff)).toExponential(2)}`
    + ` | the ledger's 23-way partition ${peak(d.map((r) => r.gDeckClose)).toExponential(2)}`
    + ` | the five gaps' partition ${peak(d.map((r) => r.eClose)).toExponential(2)}\n`);
}

// ---------- 1. the roll row PER SOURCE, pooled over the arm's own ticks ----------
process.stdout.write('\n## 1. The roll row per source, at a fixed trajectory (each arm on its own ticks)\n');
process.stdout.write('#  |median| °/s²: the model\'s term minus the game\'s, per matched source; then each over |the net error|\n');
for (const arm of present) {
  const d = data[arm];
  // The per-source gaps of the SHIPPED plant and of the two-body one are both on every tick (the probe scores both
  // at the exact point on every ride), so `TWO=1` picks the column and not the file.
  const two = process.env.TWO === '1';
  const g = (k: 'Water' | 'Ankle' | 'Twist' | 'Rest' | 'FeetFwd') => d.map((r) => Math.abs(two ? (r as unknown as Record<string, number>)[`e${k}Two`] : (r as unknown as Record<string, number>)[`e${k}`]));
  const net = d.map((r) => Math.abs(two ? r.eNetTwo : r.eNet));
  const over = (k: 'Water' | 'Ankle' | 'Twist' | 'Rest' | 'FeetFwd') => d.map((r) => {
    const n = Math.abs(two ? r.eNetTwo : r.eNet);
    const v = Math.abs(two ? (r as unknown as Record<string, number>)[`e${k}Two`] : (r as unknown as Record<string, number>)[`e${k}`]);
    return n > 1e-9 ? v / n : Number.NaN;
  });
  process.stdout.write(`#  ${arm.padEnd(6)} water ${f(median(g('Water')), 1)} ankle ${f(median(g('Ankle')), 1)} twist ${f(median(g('Twist')), 1)}`
    + ` rest ${f(median(g('Rest')), 1)} feetFwd ${f(median(g('FeetFwd')), 1)} | NET ${f(median(net), 1)}`
    + ` | game's own: water+board ${f(median(d.map((r) => Math.abs(r.gWaterBoard))), 1)} ankle ${f(median(d.map((r) => Math.abs(r.gAnkleSrc))), 1)}`
    + ` twist ${f(median(d.map((r) => Math.abs(r.gTwistSrc))), 1)} rest ${f(median(d.map((r) => Math.abs(r.gRestSrc))), 1)}\n`);
  process.stdout.write(`#  ${' '.repeat(6)} over |net|: water ${f(median(over('Water')))} ankle ${f(median(over('Ankle')))} twist ${f(median(over('Twist')))}`
    + ` rest ${f(median(over('Rest')))} feetFwd ${f(median(over('FeetFwd')))}`
    + ` | the two biggest gaps' own SIGNS agree in ${f(d.filter((r) => Number.isFinite(r.eWater) && Number.isFinite(r.eRest)).length ? d.filter((r) => Math.sign(two ? r.eWaterTwo : r.eWater) === Math.sign(two ? r.eRestTwo : r.eRest)).length / d.length : Number.NaN)} of ticks\n`);
}

// ---------- 2. the loop's own reach, pooled ----------
process.stdout.write('\n## 2. The half of the roll row the gains can reach, and the swing another gain set makes\n');
for (const arm of present) {
  const d = data[arm];
  process.stdout.write(`#  ${arm.padEnd(6)} the command's own half ${f(median(d.map((r) => Math.abs(r.rollCmd))), 1)} °/s²`
    + ` = ${f(median(d.map((r) => r.cmdShareModel)))} of the model's row, ${f(median(d.map((r) => r.cmdShareGame)))} of the GAME's row\n`);
  process.stdout.write(`#  ${' '.repeat(6)} the swing ${f(median(d.map((r) => r.gainRollSwing)), 1)} °/s² = ${f(median(d.map((r) => (Math.abs(r.eNet) > 1e-9 ? r.gainRollSwing / Math.abs(r.eNet) : Number.NaN))))} of the roll row's own NET error`
    + ` (peak ${f(peak(d.map((r) => (Math.abs(r.eNet) > 1e-9 ? r.gainRollSwing / Math.abs(r.eNet) : Number.NaN))), 1)}); ankle command ${f(median(d.map((r) => r.gainCmdSwing)), 4)} rad of a ${f(median(d.map((r) => r.ankleRoomHere)), 3)} rad bound,`
    + ` on the bound in ${f(mean(d.map((r) => r.gainClamped)))} of ticks; the rebuild's own control ${f(median(d.map((r) => r.cmdRebuild)))} rel\n`);
}

// ---------- 3. the matched-state decomposition ----------
/**
 * **The common time support, and why the decomposition is run twice.** The arms do not live the same length: the
 * shipped arm ends at 1.183 s on this cell and the weighted one at 4.317 s. So a state bin that is open at the top
 * — or any bin at all — can hold the shipped arm's last 0.2 s against the weighted arm's next three seconds, and the
 * roll row's error is at its worst in a ride's last 0.2 s (3.3p's own `rollRelLate`). A within-bin term read off
 * that is the ride's AGE wearing a state bin's clothes.
 *
 * So every binning is decomposed twice: once over all the ticks, and once with **both arms cut to the time window
 * they share** — `min over arms of (that arm's own latest live tick)`. The second is the honest one, and the first is
 * printed beside it so the size of the contamination is read rather than assumed.
 */
const latest = (rows: Row[]) => peak(rows.map((r) => r.t));
const commonT = Math.min(...present.map((a) => latest(data[a])));
process.stdout.write(`\n## 3. The matched-state decomposition of the gain effect, exact on the log mean\n`);
process.stdout.write(`#  each arm's own latest live tick: ${present.map((a) => `${a} ${f(latest(data[a]), 3)} s`).join(', ')}`
  + `  → the arms' COMMON time support is t ≤ ${f(commonT, 3)} s\n`);
/**
 * **And the control the common time support still needs.** Cutting both arms to the same clock time does not cut
 * them to the same place in their own ride: on the nine-second cell the shipped arm's ticks at 1.0–1.9 s are its
 * LAST ticks and the weighted arm's at the same clock are mid-ride, and 3.3p measured the roll row's error at its
 * worst in a ride's last 0.2 s (`rollRelLate`). So a third window drops every tick within `TAIL` seconds of its own
 * run's last live tick, which is "neither arm is dying here". The run's own last tick is read off this file's rows
 * (its key is the cell's own four fields), not taken from the run summary.
 */
const TAIL = Number(process.env.TAIL ?? 0.3);
const runKey = (r: Row) => `${r.cost}|${r.body}|${r.stance}|${r.steer}|${r.entryAsked ?? ''}|${r.extra ?? ''}`;
const lastOf = new Map<string, number>();
for (const arm of present) for (const r of data[arm]) {
  const k = runKey(r);
  lastOf.set(k, Math.max(lastOf.get(k) ?? -Infinity, r.t));
}
const WINDOWS: { key: string; keep: (r: Row) => boolean }[] = [
  { key: 'all ticks', keep: () => true },
  { key: `the arms' common time support, t ≤ ${f(commonT, 3)} s`, keep: (r) => r.t <= commonT + 1e-9 },
  { key: `neither arm dying: every tick more than ${f(TAIL, 2)} s before its OWN run's last live tick`, keep: (r) => r.t <= (lastOf.get(runKey(r)) ?? Infinity) - TAIL + 1e-9 },
];
for (const b of BINNERS) {
  process.stdout.write(`\n### bin: ${b.label}  — edges ${b.edges.map((e) => (Number.isFinite(e) ? e : '∞')).join(' | ')}\n`);
  const nB = b.edges.length - 1;
  const base = data.off;
  if (!base) { process.stdout.write('#  no `off` arm; nothing to decompose against\n'); continue; }
  for (const win of WINDOWS) {
  process.stdout.write(`#  — over ${win.key}\n`);
  // the per-bin statistics of every arm
  const stats: Record<string, { n: number[]; m: number[]; med: number[]; denom: number[]; tm: number[] }> = {};
  for (const arm of present) {
    const n = new Array<number>(nB).fill(0);
    const acc: number[][] = Array.from({ length: nB }, () => []);
    const den: number[][] = Array.from({ length: nB }, () => []);
    const tt: number[][] = Array.from({ length: nB }, () => []);
    for (const r of data[arm]) {
      if (!win.keep(r)) continue;
      const i = binOf(b, r);
      if (i < 0) continue;
      const e = err(r);
      if (!(e > 0) || !Number.isFinite(e)) continue;
      n[i] += 1;
      acc[i].push(Math.log(e));
      den[i].push(Math.abs(r.rollAccGame));
      tt[i].push(r.t);
    }
    stats[arm] = { n, m: acc.map(mean), med: acc.map((v) => Math.exp(median(v))), denom: den.map(median), tm: tt.map(median) };
  }
  process.stdout.write(`#  bin populations, the geometric mean of |rollRel|, and each bin's own median TIME per arm:\n`);
  for (const arm of present) {
    const s = stats[arm];
    process.stdout.write(`#    ${arm.padEnd(6)} ${s.n.map((v, i) => `[${i}] n=${v} g=${f(Math.exp(s.m[i]), 2)} |game|=${f(s.denom[i], 1)} t=${f(s.tm[i], 2)}`).join('  ')}\n`);
  }
  for (const arm of present) {
    if (arm === 'off') continue;
    const A = stats.off;
    const B = stats[arm];
    // The bins both arms hold at least MIN ticks in. The rest are reported as dropped, with their weight.
    const use: number[] = [];
    let droppedA = 0;
    let droppedB = 0;
    for (let i = 0; i < nB; i += 1) {
      if (A.n[i] >= MIN && B.n[i] >= MIN) use.push(i);
      else { droppedA += A.n[i]; droppedB += B.n[i]; }
    }
    const totA = use.reduce((a, i) => a + A.n[i], 0);
    const totB = use.reduce((a, i) => a + B.n[i], 0);
    if (!totA || !totB) { process.stdout.write(`#  off → ${arm}: no bin holds ${MIN} ticks in both arms\n`); continue; }
    let comp = 0;
    let within = 0;
    for (const i of use) {
      const wA = A.n[i] / totA;
      const wB = B.n[i] / totB;
      comp += (wB - wA) * A.m[i];
      within += wB * (B.m[i] - A.m[i]);
    }
    const MA = use.reduce((a, i) => a + (A.n[i] / totA) * A.m[i], 0);
    const MB = use.reduce((a, i) => a + (B.n[i] / totB) * B.m[i], 0);
    const closure = Math.abs((MB - MA) - (comp + within));
    const gA = Math.exp(MA);
    const gB = Math.exp(MB);
    process.stdout.write(`#  off → ${arm.padEnd(6)}: geometric mean of |rollRel| ${f(gA, 3)} → ${f(gB, 3)} (x${f(gB / gA, 3)}) on ${totA}/${totB} ticks in ${use.length} of ${nB} bins`
      + ` (dropped ${droppedA}/${droppedB} ticks)\n`);
    process.stdout.write(`#    log move ${f(MB - MA, 4)} = COMPOSITION ${f(comp, 4)} (${f(100 * comp / (MB - MA), 1)} %) + WITHIN-BIN ${f(within, 4)} (${f(100 * within / (MB - MA), 1)} %), closure ${closure.toExponential(2)}\n`);
    process.stdout.write(`#    as factors: composition alone x${f(Math.exp(comp), 3)}, within-bin alone x${f(Math.exp(within), 3)}\n`);
  }
  }
}

// ---------- 3b. the SUBSTITUTION, the brief's own measurement, on one arm's own recorded ticks ----------
// The within-bin term above is "the same state, a different command" measured across two rides. This is the same
// thing measured WITHOUT a second ride: one recorded trajectory, four gain sets' commands substituted into it. The
// two instruments are independent and §5 compares them rather than netting them.
process.stdout.write("\n## 3b. The substitution — one recorded ride, four sets of gains, the same ticks\n");
for (const arm of present) {
  const d = data[arm];
  const col = (k: 'off' | 'point' | 'fixed' | 'plant') => d.map((r) => Math.abs(r[`subst_${k}`]));
  const bank = (k: 'off' | 'point' | 'fixed' | 'plant') => d.map((r) => Math.abs(r[`substBank_${k}`]));
  const help = (k: 'off' | 'point' | 'fixed' | 'plant') => mean(d.map((r) => r[`substHelps_${k}`]));
  const geo = (v: number[]) => Math.exp(mean(v.filter((x) => x > 0 && Number.isFinite(x)).map(Math.log)));
  const keys = ['off', 'point', 'fixed', 'plant'] as const;
  process.stdout.write(`#  ridden ${arm.padEnd(6)} roll row, median |rel err|: ${keys.map((k) => `${k} ${f(median(col(k)), 3)}`).join(' | ')}\n`);
  process.stdout.write(`#  ${' '.repeat(13)} the same, geometric mean:  ${keys.map((k) => `${k} ${f(geo(col(k)), 3)}`).join(' | ')}`
    + `  → off→point x${f(geo(col('point')) / geo(col('off')), 3)}, off→plant x${f(geo(col('plant')) / geo(col('off')), 3)}\n`);
  process.stdout.write(`#  ${' '.repeat(13)} lean row, median:          ${keys.map((k) => `${k} ${f(median(bank(k)), 3)}`).join(' | ')}\n`);
  process.stdout.write(`#  ${' '.repeat(13)} moves the roll row CLOSER in: ${keys.map((k) => `${k} ${f(help(k), 3)}`).join(' | ')} of ticks\n`);
}

// ---------- 3c. the error's own profile in time, because the arms do not live the same length ----------
// The decomposition above says the move is not in which STATES the arm visits. This says where it IS: the roll row's
// error against the ride's own age, per arm, with the population and the game's own row in every bin so a bin that
// is short or that sits on a different denominator is visible rather than averaged in.
process.stdout.write("\n## 3c. The roll row's error against the ride's own age, per arm\n");
{
  const edges = [0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, Infinity];
  for (const arm of present) {
    const d = data[arm];
    const cells: string[] = [];
    for (let i = 0; i < edges.length - 1; i += 1) {
      const got = d.filter((r) => r.t >= edges[i] && r.t < edges[i + 1]);
      const ls = got.map((r) => err(r)).filter((e) => e > 0 && Number.isFinite(e)).map(Math.log);
      if (!got.length) continue;
      cells.push(`${f(edges[i], 1)}–${Number.isFinite(edges[i + 1]) ? f(edges[i + 1], 1) : '∞'}s n=${got.length} g=${f(Math.exp(mean(ls)), 2)} |game|=${f(median(got.map((r) => Math.abs(r.rollAccGame))), 0)}`);
    }
    process.stdout.write(`#  ${arm.padEnd(6)} ${cells.join('  ')}\n`);
  }
  // **The diagnosis of the profile, per bin**: the command's own share of the row, the two big per-source gaps over
  // the net, the game's own near-cancellation, and the board's rail. If the first second's error is the command, the
  // command's share is where it shows; if it is the water, the water's gap over the net is.
  process.stdout.write('#  the same bins, diagnosed: cmd = |rollCmd| / |the GAME\'s row|; w,r = the water\'s and the remainder\'s gap over |net|; cond = the game\'s own near-cancellation; rail = |rail|°\n');
  for (const arm of present) {
    const d = data[arm];
    const cells: string[] = [];
    for (let i = 0; i < edges.length - 1; i += 1) {
      const got = d.filter((r) => r.t >= edges[i] && r.t < edges[i + 1]);
      if (!got.length) continue;
      const over = (k: 'eWater' | 'eRest') => median(got.map((r) => (Math.abs(r.eNet) > 1e-9 ? Math.abs(r[k] / r.eNet) : Number.NaN)));
      cells.push(`${f(edges[i], 1)}s cmd=${f(median(got.map((r) => r.cmdShareGame)), 2)} w=${f(over('eWater'), 1)} r=${f(over('eRest'), 1)} cond=${f(median(got.map((r) => r.condGame)), 1)} rail=${f(median(got.map((r) => Math.abs(r.railMeas))), 0)}`);
    }
    process.stdout.write(`#  ${arm.padEnd(6)} ${cells.join('  ')}\n`);
  }
  // **The confound, tested rather than argued.** The late bins hold only the runs that lived that long, so a profile
  // that falls with time could be survivorship: the runs with the smaller roll-row error could simply be the ones
  // that survive. The test is to take **only the runs that live past `SURV` seconds** and read their OWN profile from
  // 0.2 s. If those runs are also wrong by ten times in their own first second, the profile is the ride's age; if
  // they are wrong by two times throughout, it is survivorship.
  const SURV = Number(process.env.SURV ?? 3);
  process.stdout.write(`#  the confound: ONLY the runs whose own last live tick is past ${f(SURV, 1)} s, read from 0.2 s —\n`);
  for (const arm of present) {
    const keep = data[arm].filter((r) => (lastOf.get(runKey(r)) ?? 0) > SURV);
    const runs = new Set(keep.map(runKey)).size;
    if (!keep.length) { process.stdout.write(`#  ${arm.padEnd(6)} no run lives past ${f(SURV, 1)} s\n`); continue; }
    const cells: string[] = [];
    for (let i = 0; i < edges.length - 1; i += 1) {
      const got = keep.filter((r) => r.t >= edges[i] && r.t < edges[i + 1]);
      if (!got.length) continue;
      const ls = got.map((r) => err(r)).filter((e) => e > 0 && Number.isFinite(e)).map(Math.log);
      cells.push(`${f(edges[i], 1)}s n=${got.length} g=${f(Math.exp(mean(ls)), 2)}`);
    }
    process.stdout.write(`#  ${arm.padEnd(6)} ${runs} runs: ${cells.join('  ')}\n`);
  }
}

// ---------- 4. the denominator, because a smaller relative error can be a bigger denominator ----------
process.stdout.write("\n## 4. The relative error's own denominator, per arm — a row can improve by growing it\n");
for (const arm of present) {
  const d = data[arm];
  process.stdout.write(`#  ${arm.padEnd(6)} |the game's own roll acceleration| ${f(median(d.map((r) => Math.abs(r.rollAccGame))), 1)} °/s² median, span ${span(d.map((r) => Math.abs(r.rollAccGame)), 1)}`
    + ` | the model's ${f(median(d.map((r) => Math.abs(r.rollAccModel))), 1)}`
    + ` | the ERROR itself |model−game| ${f(median(d.map((r) => Math.abs(r.rollAccModel - r.rollAccGame))), 1)} °/s²`
    + ` | relative ${f(median(d.map((r) => err(r))), 3)}\n`);
}
