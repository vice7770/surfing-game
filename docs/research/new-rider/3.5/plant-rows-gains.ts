/**
 * **Step 3.5w, offline: the gains and the reference the balance would apply with the measured rows** (`plant-rows.md`).
 *
 * MODEL ONLY; nothing under `src/` changes. One variant per process (the design cache is keyed by the weights, not by
 * the table, so two tables in one process would collide):
 *   VARIANT=shipped   the shipped table and schedule (4–12 m/s; the controller clamps below 4)
 *   VARIANT=pf6       `plantFloor: 6`, as `?plantFloor=6`
 *   VARIANT=game      rows '3', '3.5', '4', '4.5' replaced/added from `results/35w/rows.jsonl` (tag `ride`), the
 *                     schedule given knots at 3 and 3.5 (phase 2's proposal, `plant-rows.md` §4); rows ≥ 5 unchanged
 *   VARIANT=lasting   the same with the `lasting` rows
 *   VARIANT=load      `game` with every derivative scaled by the game's hull support over the lab's (§7.3), a sensitivity
 * The table and the schedule are patched in memory in this process only.
 *
 * Prints, for the owner's weights (`DEFAULT_WEIGHTS` + `riderBody: 'two'`), rail 0: the ankle row of the BLENDED design
 * the controller applies (`PredictiveController.blend`) at each schedule speed and depth, the nominal least damping of
 * the design's own closed loop at the schedule's knots, and the steady-turn reference (`steadyTurn`, 'tan', as `tick`
 * builds it; `sharp-steer-ref.ts`'s code) over 3–6 m/s × leans 0–25°.
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/plant-rows-gains.ts -o <s>/g.mjs --format esm --platform node
 *   (prepend `globalThis.location = { search: '' };`) ; env VARIANT=game ROWS=<rows.jsonl> node <s>/g.mjs
 */
import { readFileSync } from 'node:fs';
import { DEFAULT_WEIGHTS, PLANT_SPEEDS, RAIL_PLANT, PredictiveController, SCHEDULE_SPEEDS, closedLoop, leastDamping, railPull, scheduledDesign, steadyTurn } from '../../../../src/physics/predictiveBalance';
import { eigenvalues } from '../../../../src/physics/rollModel';

const DEG = 180 / Math.PI;
const VARIANT = process.env.VARIANT ?? 'shipped';
const ROWS = process.env.ROWS ?? 'docs/research/new-rider/3.5/results/35w/rows.jsonl';
/** The game's hull support (Fp + Fb, share of the pair's weight; `results/35w/attitude.md`, `before` cut) per row speed. */
const GAME_SUPPORT: Record<string, number> = { '3': 0.78, '3.5': 0.77, '4': 0.71, '4.5': 0.74 };

if (VARIANT === 'game' || VARIANT === 'lasting' || VARIANT === 'load') {
  const tag = VARIANT === 'lasting' ? 'lasting' : 'ride';
  for (const line of readFileSync(ROWS, 'utf8').trim().split('\n')) {
    const d = JSON.parse(line);
    if (d.tag !== tag) continue;
    const s = VARIANT === 'load' ? GAME_SUPPORT[String(d.v)] / d.attitude.zOverW : 1;
    const m = (a: number[]) => a.map((x) => x * s);
    // `drag` is held at the shipped below-5 value (0.2312), as `plant-rows.md` §4 keeps it.
    PLANT_SPEEDS[String(d.v)] = { roll: m(d.row.roll), slip: m(d.row.slip), yaw: m(d.row.yaw), rate: m(d.row.rate), drag: 0.2312 };
  }
  // The schedule's two new knots (the exported array, mutated in this process only).
  SCHEDULE_SPEEDS.unshift(3, 3.5);
}
// RAILZERO=1 (a diagnostic added after the first read, `plant-rows.md` §7.4): the 5 m/s rail correction set to zero
// (rows '5|10', '5|15', '5|20' made equal to '5|0'), which is what every speed below 5 reads; it also changes 5–7 m/s.
if (process.env.RAILZERO === '1') for (const a of [10, 15, 20]) Object.assign(RAIL_PLANT[`5|${a}`], { roll: RAIL_PLANT['5|0'].roll, slip: RAIL_PLANT['5|0'].slip, yaw: RAIL_PLANT['5|0'].yaw, rate: RAIL_PLANT['5|0'].rate });
// VARIANT=face (phase 2, §8.4): the shipped table read at the equivalent speed, `plantSpeed: 'face'` as the game builds it.
// VARIANT=pf45: `plantFloor: 4.5`, for the steering comparison.
// VARIANT=taper (phase 3, §9.3): `plantSpeed: 'taper'`, max(v, min(1.68 v, 7.8)).
const weights = { ...DEFAULT_WEIGHTS, riderBody: 'two' as const, ...(VARIANT === 'pf6' ? { plantFloor: 6 } : {}), ...(VARIANT === 'pf45' ? { plantFloor: 4.5 } : {}), ...(VARIANT === 'face' ? { plantSpeed: 'face' as const } : {}), ...(VARIANT === 'taper' ? { plantSpeed: 'taper' as const } : {}) };
const TOP = Number(process.env.TOP ?? 6);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctl = new PredictiveController(weights, 'tan') as any;
const out = (x: unknown) => process.stdout.write(`${JSON.stringify(x)}\n`);
out({ variant: VARIANT, rows: Object.keys(PLANT_SPEEDS).map(Number).sort((a, b) => a - b).slice(0, 6), schedule: SCHEDULE_SPEEDS.slice(0, 5) });

const r3 = (x: number) => Number(x.toFixed(3));
// The ankle row and the twist row's bank entry the controller applies.
for (const depth of [0, 0.3]) {
  for (const v of [3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9].filter((x) => x <= TOP)) {
    const d = ctl.blend(v, depth, 0);
    const k = d.k[0];
    out({ part: 'gains', depth, v, phi: r3(k[0]), phiDot: r3(k[1]), bank: r3(k[2]), bankDot: r3(k[3]), yawRate: r3(k[4]), slip: r3(k[5]), twist: r3(k[6]), twistRate: r3(k[7]), twistBank: r3(d.k[1][2]) });
  }
  // The design's own nominal closed loop (the model as the truth, no timing error) at the schedule's knots.
  for (const v of [...(VARIANT === 'face' || VARIANT === 'taper' ? [3, 3.5] : []), ...SCHEDULE_SPEEDS].filter((s) => s <= TOP)) {
    const d = scheduledDesign(v, depth, 0, weights);
    try {
      const ld = leastDamping(eigenvalues(closedLoop(d.phi, d.gamma, d.steps, d)));
      out({ part: 'damping', depth, v, damping: r3(ld.damping), hz: r3(ld.frequency) });
    } catch (e) {
      out({ part: 'damping', depth, v, error: String(e) });
    }
  }
}
// The steady-turn reference over 3–6 m/s × leans 0–25° (the schedule rail as `AttachedRider` builds it, cap 12°).
const RAIL_CAP = (12 * Math.PI) / 180;
const MAX_BANK = (70 * Math.PI) / 180;
const schedRail = (lean: number, speed: number) => {
  let rail = Math.abs(lean);
  for (let k = 0; k < 2; k += 1) rail = Math.atan(Math.tan(Math.min(MAX_BANK, Math.abs(lean))) / railPull(speed, rail));
  return Math.min(RAIL_CAP, rail);
};
for (const depth of [0, 0.3]) {
  let worst = { beta: 0, v: 0, lean: 0, refU: 0 };
  const over: number[][] = [];
  const at21: Record<string, number> = {};
  for (let v = 3; v <= TOP + 0.0001; v += 0.05) {
    for (let leanDeg = 1; leanDeg <= 25; leanDeg += 1) {
      const lean = leanDeg / DEG;
      const d = ctl.blend(v, depth, schedRail(lean, v));
      const bank = -lean;
      const t = steadyTurn(d.phi, d.gamma, Math.tan(bank), 0);
      const f = bank / Math.tan(bank);
      const beta = t.x[5] * DEG;
      if (Math.abs(beta) > 10) over.push([r3(v), leanDeg, r3(beta)]);
      if (Math.abs(beta) > Math.abs(worst.beta)) worst = { beta: r3(beta), v: r3(v), lean: leanDeg, refU: r3(t.u[0] * f * DEG) };
      if (leanDeg === 21 && Math.abs((v * 4) - Math.round(v * 4)) < 1e-6) at21[v.toFixed(2)] = r3(beta);
    }
  }
  out({ part: 'reference', depth, worstBetaDeg: worst, betaAt21Deg: at21, over10: over });
}
