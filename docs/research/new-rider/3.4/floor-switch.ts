/**
 * **Step 3.4m: the `?plantFloor=4.5|5|6` switch, measured on the model.**
 *
 * Model only — the ride's own arms are `../3.3/plant.ts` with `FLOOR=4.5`. This file is the four reads that have to
 * come first, and the first two are controls:
 *
 * **1. The default is byte-identical, measured and not asserted.** `labAt(v)` and `plantAt(v, d)` with no floor are
 * compared bit for bit against the same calls with `plantFloor: 4` (the table's own first speed, which is what the
 * shipped clamp lands on) over every table speed and a fine sweep below and across the floor, and the whole gain
 * schedule — 17 speeds × 3 depths × every rail — is compared with the floor unset against the floor at 4.
 *
 * **2. The switch IS step 3.4k's own swap.** `plantFloor: 4.5` must reproduce `floor.ts`'s `row4:=4.5` arm exactly,
 * which is the measurement README Part 11 §2 published. Same for 5 and 6. If the numbers differ the switch is doing
 * something other than the thing that was measured.
 *
 * **3. The gain the game actually runs below 4 m/s, which is NOT the one 3.4k printed.** `PredictiveController.blend`
 * clamps the schedule's speed to `SCHEDULE_SPEEDS[0] = 4` and reads `scheduledDesign` at the GRID speeds only, so the
 * design every sub-4 m/s tick runs on is `scheduledDesign(4, depth, rail)` — the plant at **V = 4 m/s** with row
 * `'4'`'s derivatives, not `plantAt(1.31, …)`. `floor.ts`'s 2.461 / 3.974 / 3.280 is the model read at the tick's own
 * V (which is what `3.3/plant.ts`'s `yModel` columns are built from, so it is the right quantity for the sign share);
 * it is not the shipped controller's gain. Both are printed here, side by side, so nobody confuses them again.
 *
 * **4. The negative control: nothing at or above the floor moves, and the schedule stays continuous.** Every schedule
 * cell from 4.5 m/s up must be identical under the switch, and the blend across 4 → 4.5 is printed so the reader can
 * see there is no step in the gains (the only cell the switch moves is the 4.0 m/s column, and above it the two
 * designs the blend mixes are the same ones it always mixed).
 *
 * Run from the repository's root (never `npx tsc` in a worktree; symlink `node_modules` first):
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/floor-switch.ts -o <scratch>/fs.mjs --format esm --platform node
 *   node <scratch>/fs.mjs
 */
import {
  DEFAULT_WEIGHTS, PLANT_SPEEDS, SCHEDULE_DEPTHS, SCHEDULE_RAILS, SCHEDULE_SPEEDS, STANCE_TABLE,
  design, labAt, plantAt, scheduledDesign, type DesignWeights,
} from '../../../../src/physics/predictiveBalance';

const names = ['tall', 'crouch', 'compress'];
const out: string[] = [];
const say = (s: string) => { out.push(s); console.log(s); };

/** Every number in a plant or a design, flattened, so "identical" is a count and not an impression. */
function flat(x: unknown): number[] {
  const acc: number[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'number') { acc.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') { Object.keys(v).sort().forEach((k) => walk((v as Record<string, unknown>)[k])); }
  };
  walk(x);
  return acc;
}
/** The largest absolute difference between two flattenings, and whether every number matched bit for bit. */
function gap(a: unknown, b: unknown): { n: number; same: boolean; max: number } {
  const fa = flat(a);
  const fb = flat(b);
  if (fa.length !== fb.length) return { n: -1, same: false, max: Number.NaN };
  let max = 0;
  let same = true;
  for (let i = 0; i < fa.length; i += 1) {
    if (!Object.is(fa[i], fb[i])) same = false;
    const d = Math.abs(fa[i] - fb[i]);
    if (Number.isFinite(d)) max = Math.max(max, d);
  }
  return { n: fa.length, same, max };
}

// ---------------------------------------------------------------- 1. the default is byte-identical
say('## 1. the default, measured: `labAt`/`plantAt`/`scheduledDesign` with no floor against the floor at the table\'s own first speed (4)');
{
  const speeds = [0, 0.5, 1.16, 1.31, 1.6, 2, 3, 3.9, 3.999, 4, 4.0001, 4.25, 4.5, 5, 6.47, 7, 9, 11.9, 12, 13, 99];
  let cells = 0;
  let same = true;
  let max = 0;
  for (const v of speeds) {
    const g1 = gap(labAt(v), labAt(v, 4));
    const g2 = gap(labAt(v), labAt(v, undefined));
    cells += 2;
    same = same && g1.same && g2.same;
    max = Math.max(max, g1.max, g2.max);
    for (let i = 0; i < 3; i += 1) {
      const d = STANCE_TABLE[i].depth;
      for (const rail of [0, SCHEDULE_RAILS[2]]) {
        const g3 = gap(plantAt(v, d, { rail }), plantAt(v, d, { rail, plantFloor: 4 }));
        cells += 1;
        same = same && g3.same;
        max = Math.max(max, g3.max);
      }
    }
  }
  say(`- \`labAt\`/\`plantAt\`: **${cells} comparisons, identical bit for bit: ${same}**, largest difference ${max}`);
}
{
  // The whole gain schedule, which is what the game reads: 17 speeds x 3 depths x every rail.
  const w0: DesignWeights = { ...DEFAULT_WEIGHTS };
  const w4: DesignWeights = { ...DEFAULT_WEIGHTS, plantFloor: 4 };
  let cells = 0;
  let same = true;
  let max = 0;
  let numbers = 0;
  for (const v of SCHEDULE_SPEEDS) for (const d of SCHEDULE_DEPTHS) for (const rail of SCHEDULE_RAILS) {
    const g = gap(scheduledDesign(v, d, rail, w0), scheduledDesign(v, d, rail, w4));
    cells += 1;
    numbers = g.n;
    same = same && g.same;
    max = Math.max(max, g.max);
  }
  say(`- the whole gain schedule: **${cells} cells x ${numbers} numbers a cell, identical bit for bit: ${same}**, largest difference ${max}`);
}

// ---------------------------------------------------------------- 2. the switch is step 3.4k's own swap
say('');
say('## 2. the switch against step 3.4k\'s own row swap (`floor.ts`), the arm README Part 11 §2 published');
{
  const V = [1.16, 1.31, 6.47];
  const row4 = { ...PLANT_SPEEDS['4'] };
  for (const src of ['4.5', '5', '6']) {
    // the switch's arm
    const bySwitch = V.flatMap((v) => [0, 1, 2].map((i) => flat(plantAt(v, STANCE_TABLE[i].depth, { plantFloor: Number(src) }))));
    // 3.4k's arm: row '4' overwritten in place, the shipped lookup, then restored
    Object.assign(PLANT_SPEEDS['4'], PLANT_SPEEDS[src]);
    const bySwap = V.flatMap((v) => [0, 1, 2].map((i) => flat(plantAt(v, STANCE_TABLE[i].depth))));
    Object.assign(PLANT_SPEEDS['4'], row4);
    let same = true;
    let max = 0;
    for (let q = 0; q < bySwitch.length; q += 1) {
      for (let i = 0; i < bySwitch[q].length; i += 1) {
        if (!Object.is(bySwitch[q][i], bySwap[q][i])) same = false;
        max = Math.max(max, Math.abs(bySwitch[q][i] - bySwap[q][i]));
      }
    }
    say(`- \`plantFloor: ${src}\` against \`row4:=${src}\`: **identical bit for bit: ${same}**, largest difference ${max} (9 cells, ${bySwitch[0].length} numbers a cell)`);
  }
  say(`- the table is left as it was found: row '4' roll[0] ${PLANT_SPEEDS['4'].roll[0]}, slip[0] ${PLANT_SPEEDS['4'].slip[0]} (shipped −37.2 and +143.8)`);
}

// ---------------------------------------------------------------- 3. the gains, both quantities, named
say('');
say('## 3. the gains: the model at the tick\'s own V (3.4j/3.4k\'s quantity) and the design the game actually runs');
say('');
say('### (a) `plantAt(V, depth)` — the model read at the tick\'s own speed, which is what `3.3/plant.ts`\'s `yModel` is built from');
say('');
say('| V m/s | floor | stance | K_ankle[β] | K_ankle[θ] | K_twist[θ] |');
say('| --- | --- | --- | --- | --- | --- |');
for (const v of [1.16, 1.31, 6.47]) {
  for (const floor of [undefined, 4.5, 5, 6] as (number | undefined)[]) {
    const cells = [0, 1, 2].map((i) => {
      const { y, t } = plantAt(v, STANCE_TABLE[i].depth, ...(floor === undefined ? [{}] : [{ plantFloor: floor }]));
      const K = design(y, t).k;
      return { b: K[0][5], th: K[0][2], tw: K[1][2] };
    });
    say(`| ${v} | ${floor === undefined ? '**4 (ships)**' : floor} | ${names.join(' / ')} | ${cells.map((c) => c.b.toFixed(3)).join(' / ')} | ${cells.map((c) => c.th.toFixed(3)).join(' / ')} | ${cells.map((c) => c.tw.toFixed(1)).join(' / ')} |`);
  }
}
say('');
say('### (b) `scheduledDesign(4, depth, 0)` — the schedule\'s 4.0 m/s column, the design EVERY sub-4 m/s tick runs on');
say('');
say('| floor | stance | K_ankle[β] | K_ankle[θ] | K_twist[θ] |');
say('| --- | --- | --- | --- | --- |');
for (const floor of [undefined, 4.5, 5, 6] as (number | undefined)[]) {
  const w: DesignWeights = floor === undefined ? { ...DEFAULT_WEIGHTS } : { ...DEFAULT_WEIGHTS, plantFloor: floor };
  const cells = SCHEDULE_DEPTHS.map((d) => {
    const K = scheduledDesign(4, d, 0, w).k;
    return { b: K[0][5], th: K[0][2], tw: K[1][2] };
  });
  say(`| ${floor === undefined ? '**4 (ships)**' : floor} | ${names.join(' / ')} | ${cells.map((c) => c.b.toFixed(3)).join(' / ')} | ${cells.map((c) => c.th.toFixed(3)).join(' / ')} | ${cells.map((c) => c.tw.toFixed(1)).join(' / ')} |`);
}

// ---------------------------------------------------------------- 4. the negative control and the continuity
say('');
say('## 4. the negative control: every schedule cell at or above the floor is untouched');
for (const floor of [4.5, 5, 6]) {
  const w0: DesignWeights = { ...DEFAULT_WEIGHTS };
  const w: DesignWeights = { ...DEFAULT_WEIGHTS, plantFloor: floor };
  let moved = 0;
  let still = 0;
  let maxAbove = 0;
  for (const v of SCHEDULE_SPEEDS) for (const d of SCHEDULE_DEPTHS) for (const rail of SCHEDULE_RAILS) {
    const g = gap(scheduledDesign(v, d, rail, w0), scheduledDesign(v, d, rail, w));
    if (g.same) still += 1; else moved += 1;
    if (v >= floor) maxAbove = Math.max(maxAbove, g.max);
  }
  const below = SCHEDULE_SPEEDS.filter((v) => v < floor).length * SCHEDULE_DEPTHS.length * SCHEDULE_RAILS.length;
  say(`- floor ${floor}: **${moved} of ${moved + still} schedule cells move, and the ${below} cells below the floor are exactly those** (largest difference among the cells AT or ABOVE the floor: ${maxAbove})`);
}
say('');
say('## 5. the schedule across the floor, so the reader can see there is no step in the gains');
say('');
say('`K_ankle[θ]` at the crouch\'s depth and no rail, read off the schedule exactly as `blend` mixes it (f = (v − v0)/0.5):');
say('');
say('| v m/s | shipped | floor 4.5 |');
say('| --- | --- | --- |');
for (const v of [3.0, 3.5, 4.0, 4.1, 4.25, 4.4, 4.5, 4.75, 5.0, 5.5]) {
  const line = (w: DesignWeights) => {
    const vc = Math.max(SCHEDULE_SPEEDS[0], Math.min(12, v));
    const v0 = Math.min(11.5, Math.floor(vc * 2) / 2);
    const f = (vc - v0) / 0.5;
    const a = scheduledDesign(v0, SCHEDULE_DEPTHS[1], 0, w).k[0][2];
    const b = scheduledDesign(v0 + 0.5, SCHEDULE_DEPTHS[1], 0, w).k[0][2];
    return (1 - f) * a + f * b;
  };
  say(`| ${v.toFixed(2)} | ${line({ ...DEFAULT_WEIGHTS }).toFixed(4)} | ${line({ ...DEFAULT_WEIGHTS, plantFloor: 4.5 }).toFixed(4)} |`);
}

// ------------------------------------- 6. WHICH derivatives turn over, read off the table's own [N, Y, K] ordering
say('');
say('## 6. which of the twelve derivatives turns over, read off the table\'s own `[N, Y, K]` ordering and not off a comment');
say('');
say('`LabPlant`\'s own header: each array is **[N, Y, K]** — yaw moment, side force, roll moment — per rad of roll,');
say('per rad of slip, per rad/s of yaw rate and per rad/s of roll rate. So `roll[0]` is the YAW moment per radian of');
say('roll and `roll[2]` the roll moment per radian of roll; `slip[1]` is the SIDE FORCE per radian of slip.');
say('');
const speeds = Object.keys(PLANT_SPEEDS).map(Number).sort((a, b) => a - b);
const col = (block: 'roll' | 'slip' | 'yaw' | 'rate', k: number) => speeds.map((v) => PLANT_SPEEDS[String(v)][block][k]);
const signs = (xs: number[]) => new Set(xs.map((x) => Math.sign(x))).size === 1;
const CH = ['N (yaw moment)', 'Y (side force)', 'K (roll moment)'];
say('| per | channel | 4 | 4.5 | 5 | 6 | 12 | one sign over all 17 rows? |');
say('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const block of ['roll', 'slip', 'yaw', 'rate'] as const) {
  for (let k = 0; k < 3; k += 1) {
    const xs = col(block, k);
    const at = (v: number) => xs[speeds.indexOf(v)];
    say(`| ${block} | ${CH[k]} | ${at(4)} | ${at(4.5)} | ${at(5)} | ${at(6)} | ${at(12)} | ${signs(xs) ? 'yes' : '**NO — it turns over**'} |`);
  }
}
say('');
say('And the side force the controller actually assembles (`boardDerivatives`, which flips N and Y and carries the');
say('yaw sweep over the feet station at the tick\'s own V), at V = 1.31 m/s:');
say('');
say('| row | heelSide | slipSide | yawSide | rollRateSide | slipSide/heelSide |');
say('| --- | --- | --- | --- | --- | --- |');
for (const row of ['4', '4.5', '5', '6']) {
  const { y } = plantAt(1.31, STANCE_TABLE[1].depth, { plantFloor: Number(row) === 4 ? undefined : Number(row) });
  say(`| '${row}' | ${y.heelSide.toFixed(1)} | ${y.slipSide.toFixed(1)} | ${y.yawSide.toFixed(1)} | ${y.rollRateSide.toFixed(2)} | ${(y.slipSide / y.heelSide).toFixed(3)} |`);
}
