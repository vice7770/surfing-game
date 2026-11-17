/**
 * **Step 3.4k: the 4 m/s floor under `PLANT_SPEEDS`, and what the clamp costs the design.**
 *
 * Model only. Nothing under `src/` or `server/` moves in this round, so there is no switch and no default to keep.
 *
 * ## The control, and why it is first
 *
 * The first block prints the shipped `design`'s ankle row at 1.16, 1.31 and 6.47 m/s in the three stances, which must
 * reproduce step 3.4j's own figures exactly (`K_ankle[θ]` 6.082 / 7.006 / 5.159 and `K_ankle[β]` 2.461 / 3.974 /
 * 3.280 at 1.31; 0.927 / 1.048 / 1.093 and 0.433 / 0.586 / 0.646 at 6.47). It does.
 *
 * ## The instrument
 *
 * `labAt` clamps with `Math.max(speeds[0], …)`, so every speed below 4 m/s is designed on the **row '4'** of
 * `PLANT_SPEEDS`. `plantAt`'s own `speed` is NOT clamped: V enters the kinematic rows (`v * slipAcc`, the feet
 * station's lever) at its true value, and only the twelve water derivatives, `boardInertiaAt` and `lab.drag` are
 * pinned. So the question "what does the clamp cost" is exactly "how much does the design move when the row the clamp
 * lands on moves", and the honest way to ask it is to swap row '4' for the **next measured rows** — 4.5, 5 and 6 m/s —
 * and re-read the gains at the same 1.16 and 1.31 m/s. Every row used here is one the table already measured; no row
 * is invented. The 6.47 m/s cells are the negative control: they interpolate 6/6.5 and must not move at all.
 *
 * Run from the repository's root (never `npx tsc` in a worktree; symlink `node_modules` first):
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.4/floor.ts -o <scratch>/fl.mjs --format esm --platform node
 *   node <scratch>/fl.mjs
 *
 * The companion read is the captive rig at low speed: `../roll-plant/plant.probe.ts` PART=captive with
 * SPEEDS=1.16,1.31,2,3,4, whose dump is `results/34k/plant-low-34k.jsonl`. Its finding is in README Part 11 §2.
 */
import { PLANT_SPEEDS, STANCE_TABLE, plantAt, design, labAt } from '../../../../src/physics/predictiveBalance';

const V = [1.16, 1.31, 6.47];
const names = ['tall', 'crouch', 'compress'];
function run(tag: string) {
  for (const v of V) {
    for (let i = 0; i < 3; i += 1) {
      const { y, t } = plantAt(v, STANCE_TABLE[i].depth);
      const K = (design(y, t) as unknown as { k: number[][] }).k;
      console.log(JSON.stringify({
        tag, v, stance: names[i],
        Kank_theta: +K[0][2].toFixed(3), Kank_beta: +K[0][5].toFixed(3), Kank_phi: +K[0][0].toFixed(3), Kank_r: +K[0][4].toFixed(3),
        Ktw_theta: +K[1][2].toFixed(3), Ktw_beta: +K[1][5].toFixed(3),
      }));
    }
  }
}
run('shipped(labAt clamps to row 4)');
const row4 = { ...PLANT_SPEEDS['4'] };
for (const src of ['4.5', '5', '6']) {
  Object.assign(PLANT_SPEEDS['4'], PLANT_SPEEDS[src]);
  run(`row4:=${src}`);
}
Object.assign(PLANT_SPEEDS['4'], row4);
// The restore is checked, so a reader can see the table left as it was found.
console.log(JSON.stringify({ restored: labAt(1.31) }));
