/**
 * **Step 3.5a — the ask cap, on the model only.**
 *
 * The owner ruled on one change: *"cap the ask"* — bound the lean the rider requests by what its speed can hold,
 * `θ_max = atan(v² / (g R_min))`, on the advisor's `R_min = 2.0 m`
 * (`docs/research/water-physics/board-roll-stiffness.md` §7).
 *
 * This file is the arithmetic, and it exists because the arithmetic alone answers the first question the round has to
 * ask: **the game already does this.** `AttachedRider.prepareBank` has bounded both of its reference lines by exactly
 * that formula since 2026-10, at `TURN_RADIUS = 4.5 m`, and the bound is **0 whenever the board is not planing**. So
 * the table below is not a proposal against a game that has no cap; it is two caps side by side, and the shipped one
 * is the tighter of the two at every speed.
 *
 * Nothing here touches the game. It prints:
 *   1. `θ_max(v)` at the shipped radius and at the switch's three others, with the advisor's own four quoted cells;
 *   2. the planing gate's band — where the shipped cap is 0 and the formula is not;
 *   3. the two differences the switch makes, separated, so the doc's claim that `?askCap=4.5` isolates the gate is
 *      read off the numbers and not asserted.
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/cap.ts -o /tmp/cap.mjs --format esm --platform node
 *   node /tmp/cap.mjs
 */
import { WATER } from '../../../../src/physics/hullForces';

const DEG = 180 / Math.PI;
/** `AttachedRider`'s own two constants, re-stated here so this file is readable beside the class [R, `:474`, `:491`]. */
const MAX_BANK = (70 * Math.PI) / 180;
const TURN_RADIUS = 4.5;
/** `PLANING_SPEED` / `PLANING_DROP` [R, `:342–343`]: the latch enters the plane at 4 m/s and leaves it at 3. */
const PLANING_SPEED = 4;
const PLANING_DROP = 3;

/** The formula, exactly as `prepareBank` computes it before the planing gate. */
const held = (v: number, r: number) => Math.min(MAX_BANK, Math.atan((v * v) / (WATER.gravity * r))) * DEG;

const RADII = [TURN_RADIUS, 9, 4, 2, 1.5];
const SPEEDS = [0.5, 1, 1.3, 2, 2.5, 3, 4, 5, 6, 6.5, 8, 10];

const f = (v: number, d = 2) => v.toFixed(d);

process.stdout.write('# step 3.5a — the ask cap on the model only; gravity '
  + `${WATER.gravity} m/s², MAX_BANK ${f(MAX_BANK * DEG, 2)}°, TURN_RADIUS ${TURN_RADIUS} m (shipped)\n\n`);

process.stdout.write('## 1. θ_max = atan(v²/(g R)), degrees. The first column is the radius the game ships.\n\n');
process.stdout.write(`| v, m/s | R = ${RADII.map((r) => `${r} m`).join(' | R = ')} |\n`);
process.stdout.write(`|---|${RADII.map(() => '---').join('|')}|\n`);
for (const v of SPEEDS) {
  process.stdout.write(`| ${f(v, 2)} | ${RADII.map((r) => f(held(v, r), 2)).join(' | ')} |\n`);
}

process.stdout.write('\n## 2. The advisor\'s four quoted cells at R = 2.0 m, reproduced\n\n');
for (const [v, quoted] of [[1.3, 4.9], [3, 25], [5, 52], [6.5, 65]] as [number, number][]) {
  const got = held(v, 2);
  process.stdout.write(`${f(v, 1)} m/s: quoted ${f(quoted, 1)}°, computed ${f(got, 2)}° — `
    + `${Math.abs(got - quoted) <= 0.5 ? 'agrees to 0.5°' : `DISAGREES by ${f(Math.abs(got - quoted), 2)}°`}\n`);
}

process.stdout.write('\n## 3. The shipped cap against the advisor\'s, and the direction\n\n');
let tighterEverywhere = true;
for (const v of SPEEDS) {
  if (held(v, TURN_RADIUS) > held(v, 2) + 1e-12) tighterEverywhere = false;
}
process.stdout.write(`The shipped 4.5 m cap is no looser than the advisor's 2.0 m at any of the ${SPEEDS.length} speeds `
  + `above: ${tighterEverywhere ? 'TRUE' : 'FALSE'}.\n`);
process.stdout.write(`At 1.3 m/s: shipped ${f(held(1.3, TURN_RADIUS), 2)}° against ${f(held(1.3, 2), 2)}° — `
  + `the switch at R = 2 m is ×${f(held(1.3, 2) / held(1.3, TURN_RADIUS), 2)} as much lean, not less.\n`);
process.stdout.write(`At 5 m/s: shipped ${f(held(5, TURN_RADIUS), 2)}° against ${f(held(5, 2), 2)}° — ×`
  + `${f(held(5, 2) / held(5, TURN_RADIUS), 2)}.\n`);

process.stdout.write('\n## 4. The planing gate, which is the other half of what the switch changes\n\n');
process.stdout.write(`Shipped, the cap is \`planing ? held : 0\`, and the latch leaves the plane below `
  + `${PLANING_DROP} m/s and re-enters it at ${PLANING_SPEED} [R]. So off the plane the shipped ask cap is `
  + `**exactly 0** — the rider asks to stand plumb however hard the stick is held — where the formula would allow:\n\n`);
process.stdout.write('| v, m/s | shipped cap (off the plane) | formula at 4.5 m | formula at 2 m |\n|---|---|---|---|\n');
for (const v of [0.5, 1, 1.3, 2, 2.5, 2.99]) {
  process.stdout.write(`| ${f(v, 2)} | 0.00 | ${f(held(v, TURN_RADIUS), 2)} | ${f(held(v, 2), 2)} |\n`);
}
process.stdout.write('\nSo `?askCap=4.5` keeps the shipped radius and removes only the gate: above the plane it is the\n'
  + 'shipped cap to the bit, and below it the formula at 4.5 m. That is why it is the arm that isolates the gate.\n');

process.stdout.write('\n## 5. The tightening arm, `?askCap=9`\n\n');
process.stdout.write('Double the shipped radius. Wherever the board planes this is the only value of the switch that\n'
  + 'asks for LESS than the game does, and it is here because the loosening direction was measured worse:\n\n');
process.stdout.write('| v, m/s | shipped (4.5 m, planing) | 9 m | the 9 m arm is |\n|---|---|---|---|\n');
for (const v of [3, 4, 5, 6, 6.5, 8]) {
  const a = held(v, TURN_RADIUS);
  const b = held(v, 9);
  process.stdout.write(`| ${f(v, 2)} | ${f(a, 2)} | ${f(b, 2)} | ${b < a ? `tighter by ${f(a - b, 2)}°` : 'not tighter'} |\n`);
}
