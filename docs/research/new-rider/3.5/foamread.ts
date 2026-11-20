/**
 * **Step 3.5e's reader**: the tables in `README.md` Part 2, off `foam.ts`'s own `.jsonl`.
 *
 * Every table names its population and its window. The **live window** is `attached && upright && phase ===
 * 'standing'`, read per frame off the dump's own three columns — `AttachedRider.separate` never sets `phase` or
 * `upright`, so a run's rows after the fall would freeze, and they are dropped here rather than filtered later. The
 * per-source `bankLedger.deck` partition is read only on frames with `apartSub === 0` (the substeps the standing
 * solve decided), as step 3.5d read it; `BoardBody.roll`'s N·m budget books every substep and is read anywhere.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/foamread.ts -o <scratch>/fr.mjs --format esm --platform node
 *   node <scratch>/fr.mjs <ride.jsonl> [field.jsonl]
 */
import { readFileSync } from 'node:fs';

const DEG = 180 / Math.PI;
type Row = Record<string, number | string | null>;

const median = (v: number[]): number => {
  if (v.length === 0) return Number.NaN;
  const s = [...v].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const pct = (v: number[], p: number): number => {
  if (v.length === 0) return Number.NaN;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const num = (row: Row, key: string): number => {
  const v = row[key];
  return typeof v === 'number' ? v : Number.NaN;
};
const f = (v: number, n = 2): string => (Number.isFinite(v) ? v.toFixed(n) : '—');

const load = (path: string): Row[] => readFileSync(path, 'utf8').split('\n').filter((l) => l.length > 1).map((l) => JSON.parse(l) as Row);

const ridePath = process.argv[2];
const fieldPath = process.argv[3];
if (!ridePath) {
  process.stdout.write('usage: node fr.mjs <ride.jsonl> [field.jsonl]\n');
  process.exit(1);
}
const all = load(ridePath);
const head = all.find((d) => d.kind === 'head')!;
const trials = all.filter((d) => d.kind === 'trial');
const rides = all.filter((d) => d.kind === 'ride');
const runs = all.filter((d) => d.kind === 'run');
const arms = (head.arms as unknown as string[]) ?? [];
const sources = Object.keys(rides[0] ?? {}).filter((k) => k.startsWith('dk_')).map((k) => k.slice(3));
const aheads = [...new Set(rides.map((d) => num(d, 'ahead')))].sort((a, b) => a - b);
const stances = ['tall', 'crouch', 'compress'];
const isLive = (d: Row): boolean => d.attached === 1 && d.upright === 1 && d.phase === 'standing';
const live = rides.filter(isLive);
const cell = (d: Row): string => `${d.trial}|${d.stance}|${d.entry}|${d.ahead}`;

process.stdout.write(`rider ${head.rider} felt ${head.felt} body ${head.body} — the owner's own address; spot canyon bed b (?canyonWaves=true), ${head.size} swell, seed ${head.seed}\n`);
process.stdout.write(`arms ${arms.join(', ')}; placements ${aheads.join(', ')} m seaward of the foam toe; side ${head.side}°; ${head.seconds} s of sea after a ${head.spinUp} s spin-up\n`);
process.stdout.write(`trials ${trials.length}, riders ${runs.length}, rows ${rides.length}, LIVE rows ${live.length}\n`);
for (const t of trials) {
  process.stdout.write(`  trial ${t.trial} at t ${t.t} s, x ${t.x}, foam toe z ${t.toeZ}, its own air ${t.toeAir}, the face there ${t.toeSlope}°, the lens ${t.toeThickness} m thick\n`);
}

// ------------------------------------------------------------------ 1. the foam under the board
process.stdout.write('\n=== 1. the foam the board is actually in — arm `all`, LIVE frames, by placement ===\n');
process.stdout.write('ahead   n  inLens  airMax    airL    airR  |dAir|med  |dAir|p90  wet/48    draft  lensRise  |surfRate|\n');
for (const a of aheads) {
  const v = live.filter((d) => d.arm === 'all' && num(d, 'ahead') === a);
  if (v.length === 0) continue;
  const across = v.map((d) => Math.abs(num(d, 'airAcross'))).filter(Number.isFinite);
  const draft = v.map((d) => num(d, 'draftFace')).filter(Number.isFinite);
  const rate = v.map((d) => Math.abs(num(d, 'surfRate'))).filter(Number.isFinite);
  process.stdout.write(`${String(a).padStart(5)} ${String(v.length).padStart(4)}  ${f(v.filter((d) => num(d, 'lensPatches') > 0).length / v.length)}  `
    + `${f(median(v.map((d) => num(d, 'airMax'))), 4)}  ${f(median(v.map((d) => num(d, 'airLeft'))), 4)}  ${f(median(v.map((d) => num(d, 'airRight'))), 4)}  `
    + `${f(median(across), 4).padStart(9)}  ${f(pct(across, 0.9), 4).padStart(9)}  ${f(median(v.map((d) => num(d, 'wetPatches'))), 1).padStart(6)}  `
    + `${f(median(draft), 4).padStart(7)}  ${f(median(v.map((d) => num(d, 'lensRise'))), 4).padStart(8)}  ${f(median(rate), 3).padStart(10)}\n`);
}

// ------------------------------------------------------------------ 2. frame 1, the exact A/B
process.stdout.write('\n=== 2. frame 1 — the exact A/B: the arms are placed from one state and differ only in the water ===\n');
const firsts = new Map<string, Map<string, Row>>();
for (const d of rides) {
  if (num(d, 'frame') !== 1) continue;
  const k = cell(d);
  if (!firsts.has(k)) firsts.set(k, new Map());
  firsts.get(k)!.set(String(d.arm), d);
}
process.stdout.write('ahead      arm   n  rate(all)    d rate   d/rate%  d rlTotal   d/net%  d deckAcc\n');
for (const a of aheads) {
  const keys = [...firsts.keys()].filter((k) => k.endsWith(`|${a}`) && firsts.get(k)!.has('all'));
  if (keys.length === 0) continue;
  const rate0 = median(keys.map((k) => Math.abs(num(firsts.get(k)!.get('all')!, 'rollRateAxis'))));
  const net0 = median(keys.map((k) => Math.abs(num(firsts.get(k)!.get('all')!, 'rlTotal'))));
  for (const armName of arms) {
    if (armName === 'all') continue;
    const pairs = keys.filter((k) => firsts.get(k)!.has(armName)).map((k) => [firsts.get(k)!.get('all')!, firsts.get(k)!.get(armName)!] as const);
    if (pairs.length === 0) continue;
    const dRate = median(pairs.map(([x, y]) => Math.abs(num(x, 'rollRateAxis') - num(y, 'rollRateAxis'))));
    const dNet = median(pairs.map(([x, y]) => Math.abs(num(x, 'rlTotal') - num(y, 'rlTotal'))));
    const dDeck = median(pairs.map(([x, y]) => Math.abs((num(x, 'deckAcc') || 0) - (num(y, 'deckAcc') || 0))));
    process.stdout.write(`${String(a).padStart(5)} ${armName.padStart(8)} ${String(pairs.length).padStart(3)}  ${f(rate0, 4).padStart(9)}  `
      + `${f(dRate, 4).padStart(8)}  ${f((100 * dRate) / rate0, 2).padStart(8)}  ${f(dNet, 5).padStart(9)}  ${f((100 * dNet) / net0, 2).padStart(7)}  ${f(dDeck, 4).padStart(9)}\n`);
  }
}

/**
 * **The same A/B read only where the board is ACTUALLY in the foam**, which is the number the round rests on: a
 * median over all six placements is a median over mostly-clean cells and reads 0 for that reason alone. A cell counts
 * as foamed when the `all` arm's own frame 1 has at least one hull patch inside a roller lens.
 */
process.stdout.write('\n=== 2b. frame 1, FOAMED cells only (the `all` arm has a lens under the hull), per stance ===\n');
process.stdout.write('stance        arm   n  rate(all)  d rate med  d rate max  d/rate%med  d/rate%max  dDeck/Σ|terms| med  max\n');
for (const stance of stances) {
  const keys = [...firsts.keys()].filter((k) => k.split('|')[1] === stance && firsts.get(k)!.has('all')
    && num(firsts.get(k)!.get('all')!, 'lensPatches') > 0);
  if (keys.length === 0) continue;
  const rate0 = median(keys.map((k) => Math.abs(num(firsts.get(k)!.get('all')!, 'rollRateAxis'))));
  for (const armName of arms) {
    if (armName === 'all') continue;
    const pairs = keys.filter((k) => firsts.get(k)!.has(armName)).map((k) => [firsts.get(k)!.get('all')!, firsts.get(k)!.get(armName)!] as const);
    if (pairs.length === 0) continue;
    const dRate = pairs.map(([x, y]) => Math.abs(num(x, 'rollRateAxis') - num(y, 'rollRateAxis')));
    const share = pairs.map(([x, y]) => {
      const mag = sources.reduce((t, s) => t + Math.abs(num(x, `dk_${s}`) || 0), 0);
      return mag > 0 ? Math.abs((num(x, 'deckAcc') || 0) - (num(y, 'deckAcc') || 0)) / mag : Number.NaN;
    }).filter(Number.isFinite);
    const rel = pairs.map(([x, y]) => (100 * Math.abs(num(x, 'rollRateAxis') - num(y, 'rollRateAxis'))) / Math.max(Math.abs(num(x, 'rollRateAxis')), 1e-9));
    process.stdout.write(`${stance.padEnd(9)} ${armName.padStart(8)} ${String(pairs.length).padStart(3)}  ${f(rate0, 3).padStart(9)}  `
      + `${f(median(dRate), 4).padStart(10)}  ${f(Math.max(...dRate), 4).padStart(10)}  ${f(median(rel), 2).padStart(10)}  ${f(Math.max(...rel), 2).padStart(10)}  `
      + `${f(100 * median(share), 3).padStart(18)}%  ${f(100 * Math.max(...share), 2)}%\n`);
  }
}

process.stdout.write('\n--- frame 1: which sources each channel moves, FOAMED cells, median |Δ dk_s| over the cells, °/s² ---\n');
for (const armName of arms) {
  if (armName === 'all') continue;
  const keys = [...firsts.keys()].filter((k) => firsts.get(k)!.has('all') && firsts.get(k)!.has(armName)
    && num(firsts.get(k)!.get('all')!, 'lensPatches') > 0);
  if (keys.length === 0) continue;
  const d: [string, number][] = sources.map((s) => [s, median(keys.map((k) => Math.abs(((num(firsts.get(k)!.get('all')!, `dk_${s}`)) || 0) - ((num(firsts.get(k)!.get(armName)!, `dk_${s}`)) || 0)) * DEG))]);
  const tot = d.reduce((x, [, v]) => x + v, 0);
  d.sort((x, y) => y[1] - x[1]);
  process.stdout.write(`${armName.padStart(8)} n ${String(keys.length).padStart(3)} Σ|Δ| ${f(tot)}  `
    + d.slice(0, 5).map(([s, v]) => `${s} ${f(v)} (${f((100 * v) / tot, 0)}%)`).join(' | ') + '\n');
}

// ------------------------------------------------------------------ 3. the ride
process.stdout.write('\n=== 3. the ride — fall times, s, per placement × arm (stances and entries pooled inside the cell) ===\n');
process.stdout.write('ahead      arm  runs  fell   median     min     max  held\n');
for (const a of aheads) {
  for (const armName of arms) {
    const v = runs.filter((d) => num(d, 'ahead') === a && d.arm === armName);
    if (v.length === 0) continue;
    const fell = v.map((d) => num(d, 'fellAt')).filter(Number.isFinite);
    process.stdout.write(`${String(a).padStart(5)} ${armName.padStart(8)} ${String(v.length).padStart(5)} ${String(fell.length).padStart(5)} `
      + `${f(median(fell), 3).padStart(8)} ${f(Math.min(...fell), 3).padStart(7)} ${f(Math.max(...fell), 3).padStart(7)} ${String(v.length - fell.length).padStart(5)}\n`);
  }
}

process.stdout.write('\n--- fall times per stance, arm by arm, by placement ---\n');
for (const a of aheads) {
  for (const stance of stances) {
    let line = `ahead ${String(a).padStart(2)} ${stance.padEnd(9)}`;
    for (const armName of arms) {
      const v = runs.filter((d) => num(d, 'ahead') === a && d.stance === stance && d.arm === armName);
      const fell = v.map((d) => num(d, 'fellAt')).filter(Number.isFinite);
      line += `  ${armName} ${fell.length}/${v.length} med ${f(median(fell), 3)}`;
    }
    process.stdout.write(`${line}\n`);
  }
}

// ------------------------------------------------------------------ 4. the deck partition
process.stdout.write('\n=== 4. bankLedger.deck, °/s² — arm `all`, LIVE frames with apartSub == 0, FOAMED vs CLEAN ticks, split at 25° of roll ===\n');
process.stdout.write('   foamed: at least one hull patch inside a roller lens. clean: none. in25 = before the fall, out25 = the capsize.\n');
for (const foamed of [true, false]) {
 for (const inside of [true, false]) {
  for (const stance of stances) {
    const v = live.filter((d) => d.arm === 'all' && d.stance === stance && num(d, 'apartSub') === 0 && d.dkSum !== undefined && d.dkSum !== null
      && (num(d, 'lensPatches') > 0) === foamed && (Math.abs(num(d, 'roll')) <= 25) === inside);
    const label = `${foamed ? 'foamed' : 'clean '} ${inside ? 'in25 ' : 'out25'}`;
    if (v.length < 10) {
      process.stdout.write(`${label} ${stance.padEnd(9)} n ${v.length} — too thin to rank, and this reader does not\n`);
      continue;
    }
    const cells = new Set(v.map((d) => `${d.trial}|${d.entry}|${d.ahead}`)).size;
    const terms: [string, number][] = sources.map((s) => [s, median(v.map((d) => num(d, `dk_${s}`))) * DEG]);
    const mag = terms.reduce((x, [, t]) => x + Math.abs(t), 0);
    const net = median(v.map((d) => num(d, 'dkSum'))) * DEG;
    terms.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
    process.stdout.write(`${label} ${stance.padEnd(9)} runs ${String(cells).padStart(2)} n ${String(v.length).padStart(4)} net ${f(net, 1).padStart(8)} Σ|terms| ${f(mag, 1).padStart(8)}  `
      + terms.slice(0, 4).map(([s, t]) => `${s} ${t > 0 ? '+' : ''}${f(t, 1)} (${f((100 * Math.abs(t)) / mag, 0)}%)`).join(' | ') + '\n');
  }
 }
}

process.stdout.write('\n--- the froth row itself, arm `all`, LIVE frames with a lens under the board ---\n');
{
  const v = live.filter((d) => d.arm === 'all' && num(d, 'lensPatches') > 0);
  for (const [col, name, scale] of [['dk_froth', 'dk_froth °/s²', DEG], ['bdFroth', 'bdFroth N·m', 1], ['rlFroth', 'rlFroth N·m', 1]] as const) {
    const vals = v.map((d) => Math.abs(num(d, col)) * scale).filter(Number.isFinite);
    process.stdout.write(`  ${name.padEnd(16)} n ${String(vals.length).padStart(4)} median ${f(median(vals), 5)}  p90 ${f(pct(vals, 0.9), 5)}  max ${f(Math.max(...vals), 5)}\n`);
  }
}

/**
 * **The board's own N·m roll budget, which is the one ledger that describes an `apart` substep.** `BoardBody.roll`
 * books an angular impulse on **every** substep [R, `BoardBody.ts:353–372`], so unlike `bankLedger.deck` it may be
 * read on the frames the standing solve did not decide — the figures step 3.5d said no published number of this
 * track had ever been read on. `rlRider` is a residual, not a measured contact torque. Its datum is the board's own
 * long axis, the OPPOSITE sense to `rollAxis`, so these signs are the other way round from §4's.
 */
process.stdout.write('\n=== 4b. BoardBody.roll, N·m — arm `all`, LIVE frames, with and WITHOUT an `apart` substep in them ===\n');
process.stdout.write('apart  window stance      runs     n     rider   inertial      hull     froth        net   net/largest\n');
for (const hasApart of [false, true]) {
  for (const inside of [true, false]) {
    for (const stance of stances) {
      const v = live.filter((d) => d.arm === 'all' && d.stance === stance && (num(d, 'apartSub') > 0) === hasApart
        && (Math.abs(num(d, 'roll')) <= 25) === inside);
      const label = `${hasApart ? ' yes ' : ' no  '} ${inside ? 'in25 ' : 'out25'}`;
      if (v.length < 10) {
        process.stdout.write(`${label} ${stance.padEnd(9)} n ${v.length} — too thin\n`);
        continue;
      }
      const per = new Map<string, Row[]>();
      for (const d of v) {
        const k = `${d.trial}|${d.entry}|${d.ahead}`;
        if (!per.has(k)) per.set(k, []);
        per.get(k)!.push(d);
      }
      const med = (col: string): number => median([...per.values()].map((vv) => median(vv.map((x) => num(x, col)).filter(Number.isFinite))).filter(Number.isFinite));
      const rider = med('rlRider');
      const inertial = med('rlAdded') + med('rlRad');
      const hull = med('rlBuoy') + med('rlPress') + med('rlFric') + med('rlSuct') + med('rlFins') + med('rlRails');
      const froth = med('rlFroth');
      const net = med('rlTotal');
      const largest = Math.max(Math.abs(rider), Math.abs(inertial), Math.abs(hull), Math.abs(froth));
      process.stdout.write(`${label} ${stance.padEnd(9)} ${String(per.size).padStart(5)} ${String(v.length).padStart(5)} `
        + `${f(rider, 3).padStart(9)} ${f(inertial, 3).padStart(10)} ${f(hull, 3).padStart(9)} ${f(froth, 3).padStart(9)} `
        + `${f(net, 4).padStart(10)} ${f(Math.abs(net) / Math.max(largest, 1e-12), 4).padStart(13)}\n`);
    }
  }
}

/**
 * **The face the board is on at each placement, so the fall-time gradient is not read as the foam when it is the
 * water's own shape.** `tilt` is the surface's heel across the board's heading and `facePitch` is not in this dump,
 * so the slope reported is the across-heading one the roll datum is taken against.
 */
process.stdout.write('\n=== 7. the water each placement is on — arm `all`, LIVE frames ===\n');
process.stdout.write('ahead     n  |tilt| med  |tilt| p90  speed med  breaking med  bore %\n');
for (const a of aheads) {
  const v = live.filter((d) => d.arm === 'all' && num(d, 'ahead') === a);
  if (v.length === 0) continue;
  const tilt = v.map((d) => Math.abs(num(d, 'tilt')));
  process.stdout.write(`${String(a).padStart(5)} ${String(v.length).padStart(5)}  ${f(median(tilt), 2).padStart(10)}  ${f(pct(tilt, 0.9), 2).padStart(10)}  `
    + `${f(median(v.map((d) => num(d, 'speed'))), 2).padStart(9)}  ${f(median(v.map((d) => num(d, 'breaking'))), 3).padStart(12)}  `
    + `${f((100 * v.filter((d) => d.regime === 'bore').length) / v.length, 1).padStart(6)}\n`);
}

// ------------------------------------------------------------------ 5. contact
process.stdout.write('\n=== 5. contact — the hull in the water, arm `all`, LIVE frames, by placement ===\n');
process.stdout.write('ahead     n  wet med  wet=0 %  apart med  booked %  draft med  draft<0 %\n');
for (const a of aheads) {
  const v = live.filter((d) => d.arm === 'all' && num(d, 'ahead') === a);
  if (v.length === 0) continue;
  const draft = v.map((d) => num(d, 'draftFace')).filter(Number.isFinite);
  process.stdout.write(`${String(a).padStart(5)} ${String(v.length).padStart(5)}  ${f(median(v.map((d) => num(d, 'wetPatches'))), 1).padStart(7)}  `
    + `${f((100 * v.filter((d) => num(d, 'wetPatches') === 0).length) / v.length, 1).padStart(7)}  ${f(median(v.map((d) => num(d, 'apartSub'))), 1).padStart(9)}  `
    + `${f((100 * v.filter((d) => num(d, 'apartSub') === 0).length) / v.length, 1).padStart(8)}  ${f(median(draft), 4).padStart(9)}  `
    + `${f((100 * draft.filter((x) => x < 0).length) / draft.length, 1).padStart(9)}\n`);
}

// ------------------------------------------------------------------ 6. the roll itself
process.stdout.write('\n=== 6. the roll — peak |rail| and peak roll rate per run, LIVE frames, by placement × arm ===\n');
for (const a of aheads) {
  let line = `ahead ${String(a).padStart(2)}`;
  for (const armName of arms) {
    const v = live.filter((d) => d.arm === armName && num(d, 'ahead') === a);
    if (v.length === 0) continue;
    const per = new Map<string, Row[]>();
    for (const d of v) {
      const k = `${d.trial}|${d.stance}|${d.entry}`;
      if (!per.has(k)) per.set(k, []);
      per.get(k)!.push(d);
    }
    const rails = [...per.values()].map((vv) => Math.max(...vv.map((x) => Math.abs(num(x, 'rail')))));
    const rates = [...per.values()].map((vv) => Math.max(...vv.map((x) => Math.abs(num(x, 'rollRateAxis')))));
    line += `  ${armName}: rail ${f(median(rails), 1)}° rate ${f(median(rates), 0)}°/s`;
  }
  process.stdout.write(`${line}\n`);
}

// ------------------------------------------------------------------ the field, if it was handed over
if (fieldPath) {
  const field = load(fieldPath).filter((d) => d.kind === 'fsum');
  const fhead = load(fieldPath).find((d) => d.kind === 'head');
  process.stdout.write(`\n=== the FIELD (no rider): ${field.length} frames of the corridor, ${fhead?.size} swell, seed ${fhead?.seed} ===\n`);
  const best = field.map((d) => d.best as unknown as Record<string, number | number[]>).filter(Boolean);
  const airAt = (i: number): number[] => best.map((b) => (b.air as number[])[i]).filter((x) => x !== null && Number.isFinite(x));
  const drafts = [0.02, 0.05, 0.1, 0.2];
  process.stdout.write(`frames with any foamed corridor point: ${field.filter((d) => num(d, 'foamed') > 0).length} of ${field.length}\n`);
  process.stdout.write(`foamed corridor points a frame: median ${f(median(field.map((d) => num(d, 'foamed'))), 0)} of ${f(median(field.map((d) => num(d, 'points'))), 0)} wet ones; inside a lens median ${f(median(field.map((d) => num(d, 'lensed'))), 0)}\n`);
  for (let i = 0; i < drafts.length; i += 1) {
    const v = airAt(i);
    process.stdout.write(`α at ${drafts[i].toFixed(2)} m under the surface (the frame's own deepest-foam point): median ${f(median(v), 4)} p90 ${f(pct(v, 0.9), 4)} max ${f(Math.max(...v), 4)}\n`);
  }
  const th = best.map((b) => b.thickness as number).filter(Number.isFinite);
  const gr = best.map((b) => b.grip as number).filter(Number.isFinite);
  const grad = best.map((b) => (((b.air as number[])[0] - (b.air as number[])[2]) / 0.08)).filter(Number.isFinite);
  const ac = field.map((d) => Math.abs(num(d, 'acrossMax'))).filter(Number.isFinite);
  process.stdout.write(`the lens there: thickness median ${f(median(th), 4)} m p90 ${f(pct(th, 0.9), 4)} max ${f(Math.max(...th), 4)}; grip median ${f(median(gr))} Pa max ${f(Math.max(...gr))} Pa\n`);
  process.stdout.write(`dα/dy between 0.02 and 0.10 m: median ${f(median(grad))} p90 ${f(pct(grad, 0.9))} max ${f(Math.max(...grad))} per m\n`);
  process.stdout.write(`largest across-beam Δα anywhere in the corridor (two points 0.5 m apart, same draft): median ${f(median(ac), 4)} p90 ${f(pct(ac, 0.9), 4)} max ${f(Math.max(...ac), 4)}\n`);
}
